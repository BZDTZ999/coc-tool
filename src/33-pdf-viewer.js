/* ---------- 自带 PDF 阅读器（pdf.js）----------
   浏览器自带的 iframe PDF 阅读器在手机 / 平板上很不听话：iOS、安卓都不认 #page=（点「下一页」不动），
   也没有缩放按钮。所以规则书与模组里的 PDF 都改成自己画：用 Mozilla 的 pdf.js（Apache-2.0，见 assets/pdfjs/）
   把页面画到画布上，翻页 / 缩放 / 双指捏合全由我们自己控制，电脑与手机表现一致。
   · 整本连续排开（一页一张画布，滑到哪儿才画哪儿）：手机上上下滑动就是翻页，电脑上滚轮 / 拖动一样顺，
     工具条上的页码跟着「当前看到的那一页」走；目录 / 搜索 / 跳页都按「第几页」定位。
   · 「☰ 跳页」是快速翻页面板：PDF 自带书签就先列书签目录，没有书签就给整本页码方格（点一下就跳过去）。
   · 离线单文件版：pdf.js 与它的 worker 都内联进 html（worker 走主线程，file:// 下也能跑，不用建 Worker）。
   · 在线版：第一次打开 PDF 时才按需下载，首屏依旧很轻。
   两个面板（📚 规则书 / 📖 模组里的 PDF）同一时间只会开一个，所以共用这一份查看器状态。 */
var PDF_MIN_ZOOM=0.25, PDF_MAX_ZOOM=5;
var PDF_DOC_CACHE_MAX=2;      /* 最多同时缓存两份 PDF（规则书 + 当前模组），换标签来回切不用重开 */
var PDF_PAGE_GAP=10;          /* 页与页之间的缝（要和 CSS 里 .pdfv-pages 的 gap 对齐） */
var PDF_PAGE_PAD=10;          /* 第一页上面的留白（要和 .pdfv-pages 的 padding-top 对齐） */
var PDF_NEAR=1;               /* 视口上下各多画一页，滑起来看不到空白 */
var PDF_KEEP=3;               /* 离视口这么远的页就把画布放掉，省内存（318 页的规则书也扛得住） */
var PDF_JUMP_MAX=420;         /* 跳页面板最多画多少个页码按钮，超了就每 N 页一个 */
var PDF_VIEW_KEEP=24;         /* 最多记住 24 份文档的阅读状态，免得 localStorage 无限长大 */
var PDF_PARK_MAX=2;           /* 最多把两份「暂时摘下」的阅读器 DOM 留在内存里（模组 + 规则书各一份） */
var pdfState={
  host:null, wrap:null, canvas:null, doc:null, src:'', key:'', num:0, page:1, zoom:1, fit:true,
  baseW:612, baseH:792, task:null, token:0, onPage:null, onCount:null,
  pages:[], offsets:[], total:0, outline:null, navLock:0, pinch:0
};
var _pdfDocCache={};          /* src -> Promise<PDFDocumentProxy>：换页 / 切标签不用重开 */
var _pdfLibWaiters=null;      /* 在线版第一次加载 pdf.js 时排队等它 */
var _pdfOutlineStore=null, _pdfOutlineN=0;   /* 书签条目：面板里只放一个编号，点的时候再算它在第几页 */
var _pdfJumpTab='num';                       /* 跳页面板当前看「页码」还是「目录」（有书签的 PDF 才有得选） */
var _pdfScrollRaf=0, _pdfScrollTimer=0;
var _pdfParks={}, _pdfParkIds=[];            /* 被面板重画暂时摘下、等会儿原样挂回去的阅读器 DOM */
var _pdfViewSaveT=0;                         /* 阅读状态的落盘防抖：翻页时别每页都写一次 localStorage */

function pdfLibReady(){
  try{ return typeof pdfjsLib!=='undefined' && !!pdfjsLib && typeof pdfjsLib.getDocument==='function'; }
  catch(e){ return false; }
}
/* 惰性加载 pdf.js：在线版从 assets/pdfjs/ 取（离线版已经内联好了，直接就能用） */
function pdfEnsureLib(ok, fail){
  if(pdfLibReady()){ if(ok) ok(); return; }
  var base=window.__COC_PDFJS_BASE;
  if(!base){ if(fail) fail(new Error('PDF 组件没加载进来')); return; }
  if(_pdfLibWaiters){ _pdfLibWaiters.push({ok:ok, fail:fail}); return; }
  _pdfLibWaiters=[{ok:ok, fail:fail}];
  var list=[base+'pdf.min.js', base+'pdf.worker.min.js'], i=0;
  var done=function(err){
    var ws=_pdfLibWaiters; _pdfLibWaiters=null;
    (ws||[]).forEach(function(o){
      if(err){ if(o.fail) o.fail(err); return; }
      if(pdfLibReady()){ if(o.ok) o.ok(); }
      else if(o.fail) o.fail(new Error('PDF 组件加载失败'));
    });
  };
  var step=function(){
    if(i>=list.length){ done(null); return; }
    var s=document.createElement('script');
    s.src=list[i++];
    s.onload=step;
    s.onerror=function(){ done(new Error('PDF 组件下载失败（在线版需要能访问 '+base+'）')); };
    document.head.appendChild(s);
  };
  step();
}
function pdfDocCacheGet(src){
  if(_pdfDocCache[src]) return _pdfDocCache[src];
  var keys=Object.keys(_pdfDocCache);
  while(keys.length>=PDF_DOC_CACHE_MAX){         /* 只留最近两份，省内存 */
    var old=keys.shift();
    if(old===src) continue;
    var p=_pdfDocCache[old];
    delete _pdfDocCache[old];
    try{ p.then(function(d){ if(d && pdfState.doc!==d && d.destroy) d.destroy(); }, function(){}); }catch(e){}
  }
  var pr;
  try{ pr=pdfjsLib.getDocument({url:src, isEvalSupported:false}).promise; }
  catch(e){ pr=Promise.reject(e); }
  _pdfDocCache[src]=pr;
  pr['catch'](function(){ if(_pdfDocCache[src]===pr) delete _pdfDocCache[src]; });
  return pr;
}
/* ---------- 阅读状态（按文档）：看到第几页 / 放大到多少 / 滚到哪儿 ----------
   规则书传 key='rulebook'，模组传 key='mod:'+文件 id —— 都是跨刷新稳定的标识
   （规则书 / 模组的 PDF 都是运行时解出来的 blob: URL，每次刷新都会变，不能拿它当钥匙）。
   老存档没有这份文档的状态：就按第一页 + 适应宽度开始。 */
function pdfReaderStore(){
  if(typeof state==='undefined' || !state) return {};
  if(!state.ui) state.ui={};
  if(!state.ui.pdfView || typeof state.ui.pdfView!=='object' || Array.isArray(state.ui.pdfView)) state.ui.pdfView={};
  return state.ui.pdfView;
}
function pdfDocKey(src){
  var s=String(src||''); if(!s) return '';
  return 'u:'+s.length+':'+s.slice(0,32)+':'+s.slice(-32);
}
function pdfReaderGet(key){ if(!key) return null; return pdfReaderStore()[key]||null; }
function pdfReaderSave(key, patch){
  if(!key) return;
  var store=pdfReaderStore(), v=store[key]||{}, k;
  for(k in patch) if(Object.prototype.hasOwnProperty.call(patch,k)) v[k]=patch[k];
  v.t=Date.now();
  store[key]=v;
  var keys=Object.keys(store);
  if(keys.length>PDF_VIEW_KEEP){
    keys.sort(function(a,b){ return (store[a].t||0)-(store[b].t||0); });
    for(var i=0;i<keys.length-PDF_VIEW_KEEP;i++) delete store[keys[i]];
  }
  pdfReaderFlush();
}
function pdfReaderFlush(){
  if(_pdfViewSaveT) return;
  _pdfViewSaveT=setTimeout(function(){ _pdfViewSaveT=0; try{ saveStateQuiet(); }catch(e){} }, 500);
}
/* 关页面 / 切到后台时把还没落盘的那一点状态补上（不然刚翻页就关掉会丢） */
function pdfReaderBindFlush(){
  if(document.__pdfViewFlush) return;
  document.__pdfViewFlush=1;
  window.addEventListener('pagehide', function(){ if(_pdfViewSaveT){ clearTimeout(_pdfViewSaveT); _pdfViewSaveT=0; try{ saveStateQuiet(); }catch(e){} } });
  document.addEventListener('visibilitychange', function(){
    if(document.hidden && _pdfViewSaveT){ clearTimeout(_pdfViewSaveT); _pdfViewSaveT=0; try{ saveStateQuiet(); }catch(e){} }
  });
}
/* 把「现在这一眼」记下来：第几页 + 页内位置（换算成 0~1，换过缩放 / 窗口大小也能对上） */
function pdfSaveView(){
  var st=pdfState;
  if(!st.key || !st.doc) return;
  var a=pdfViewAnchor(), patch={page:st.page||1, zoom:Math.round((st.zoom||1)*1000)/1000, fit:!!st.fit};
  if(a){ patch.pi=a.i; patch.pf=Math.round(a.frac*1000)/1000; }
  pdfReaderSave(st.key, patch);
}
function pdfSavedAnchor(v){
  if(!v || !(v.pi>0)) return null;
  var f=parseFloat(v.pf);
  return {i:v.pi|0, frac:(isFinite(f)&&f>0)?Math.min(1,f):0};
}
/* ---------- 「面板重画时别把阅读器扔了」 ----------
   右半屏换内容时整块 innerHTML 会被重写，正在看的 PDF 跟着被销毁、重画、跳回第一页 —— 看着就是「卡一下 + 闪一下」。
   这里在重画之前把整棵阅读器 DOM 摘下来（画布、页码、滚动位置都留着），下次还要看同一份就原样挂回去，等于没动过。 */
function pdfSnapshot(){
  var st=pdfState;
  return {doc:st.doc, src:st.src, key:st.key, num:st.num, page:st.page, zoom:st.zoom, fit:st.fit,
    baseW:st.baseW, baseH:st.baseH, pages:st.pages, offsets:st.offsets, total:st.total,
    outline:st.outline, token:st.token};
}
function pdfParkHost(){
  var st=pdfState, host=st.host;
  if(!host || !host.__pdfLive || !host.id) return null;
  if(host.parentNode) host.parentNode.removeChild(host);
  host.__pdfLive=0;
  var top=0; try{ top=host.scrollTop||0; }catch(e){}
  var old=_pdfParks[host.id];
  if(old && old.el!==host) old.el.__pdfLive=0;
  if(old){ var oi=_pdfParkIds.indexOf(host.id); if(oi>=0) _pdfParkIds.splice(oi,1); }
  _pdfParks[host.id]={el:host, top:top, st:pdfSnapshot()};
  _pdfParkIds.push(host.id);
  while(_pdfParkIds.length>PDF_PARK_MAX){
    var drop=_pdfParkIds.shift(), d=_pdfParks[drop];
    if(d && !d.el.__pdfLive && d.el.parentNode) d.el.parentNode.removeChild(d.el);
    delete _pdfParks[drop];
  }
  pdfJumpClose();
  st.host=null; st.wrap=null; st.canvas=null;
  return _pdfParks[host.id];
}
/* 这块 DOM 不要了（文件被移出 / 清空时调） */
function pdfParkForget(id){
  var rec=id?(_pdfParks[id]||null):null;
  if(!rec) return;
  delete _pdfParks[id];
  var i=_pdfParkIds.indexOf(id); if(i>=0) _pdfParkIds.splice(i,1);
  if(rec.el && !rec.el.__pdfLive && rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
}
/* 面板重画前调用：把正在看的阅读器摘下来留着 */
function pdfParkLive(){ try{ pdfParkHost(); }catch(e){} }
/* 同一份文档又要看了：把摘下来那棵原样挂回去（页码 / 缩放 / 画布 / 滚动位置全在） */
function pdfUnpark(host, key, opts){
  var rec=_pdfParks[host.id];
  if(!rec || !key || !rec.st || rec.st.key!==key) return false;
  delete _pdfParks[host.id];
  var i=_pdfParkIds.indexOf(host.id); if(i>=0) _pdfParkIds.splice(i,1);
  if(host.parentNode) host.parentNode.replaceChild(rec.el, host);
  var st=pdfState, ss=rec.st;
  st.host=rec.el; st.wrap=rec.el.querySelector('.pdfv-pages'); st.canvas=null;
  st.doc=ss.doc; st.src=ss.src; st.key=ss.key; st.num=ss.num; st.page=ss.page;
  st.zoom=ss.zoom; st.fit=ss.fit; st.baseW=ss.baseW; st.baseH=ss.baseH;
  st.pages=ss.pages; st.offsets=ss.offsets; st.total=ss.total; st.outline=ss.outline;
  st.token=ss.token; st.navLock=Date.now(); st.pinch=0; st.task=null;
  st.onPage=opts.onPage||null; st.onCount=opts.onCount||null;
  rec.el.__pdfLive=1;
  try{ rec.el.scrollTop=rec.top||0; }catch(e){}
  pdfBindScroll(rec.el);
  pdfBindPinch(rec.el);
  pdfSyncBar();
  if(st.onCount) st.onCount(st.num);
  if(st.onPage) st.onPage(st.page);
  if(typeof modRenderToc==='function') modRenderToc();
  return true;
}
/* 工具条（规则书 / 模组共用同一套 id —— 两个面板同时只开一个）
   手机上按钮里的说明文字会被藏起来只留图标（见 style.css 的 .pdfv-bar .lbl），免得把正文挤没。 */
function pdfControlsHTML(extra){
  return '<button class="small ghost" onclick="pdfPrev()" title="上一页">‹<span class="lbl"> 上一页</span></button>'+
    '<span class="rb-pageno"><input type="number" id="pdfPageInput" value="'+(pdfState.page||1)+'" min="1" '+
      'onchange="pdfGoPage(parseInt(this.value,10))"> / <span id="pdfPageMax">'+(pdfState.num||'-')+'</span></span>'+
    '<button class="small ghost" onclick="pdfNext()" title="下一页"><span class="lbl">下一页 </span>›</button>'+
    '<button class="small ghost" onclick="pdfToggleJump()" title="快速跳页：有书签就列目录，没有就列页码">☰<span class="lbl"> 跳页</span></button>'+
    '<span class="pdfv-zoom">'+
      '<button class="small ghost" onclick="pdfZoomBy(-1)" title="缩小">A－</button>'+
      '<span class="pdfv-zoomval" id="pdfZoomVal">'+Math.round((pdfState.zoom||1)*100)+'%</span>'+
      '<button class="small ghost" onclick="pdfZoomBy(1)" title="放大">A＋</button>'+
      '<button class="small ghost" onclick="pdfFitWidth()" title="回到适应宽度（手机上看全页）">适宽</button>'+
    '</span>'+(extra||'');
}
/* 把一份 PDF 挂进 host（host 是滚动容器；里面一整列页面画布，滑到哪儿画到哪儿）
   opts.key：这份文档的稳定标识（规则书 'rulebook'、模组 'mod:<文件 id>'），用来记住 / 恢复阅读状态。
   同一份文档刚被面板重画摘下来过的话，直接把那棵 DOM 挂回去 —— 不重建画布、不闪、不跳页。 */
function pdfMountPdf(host, src, opts){
  opts=opts||{};
  var st=pdfState;
  if(!host) return;
  var key=opts.key || pdfDocKey(src);
  if(pdfUnpark(host, key, opts)) return;
  if(st.task){ try{ st.task.cancel(); }catch(e){} st.task=null; }
  pdfJumpClose();
  pdfReaderBindFlush();
  var saved=pdfReaderGet(key)||{};
  var wantFit=(saved.fit==null)?(opts.fit!==false):!!saved.fit;
  var wantZoom=parseFloat(saved.zoom);
  if(!isFinite(wantZoom) || wantZoom<=0) wantZoom=0;
  st.host=host; st.wrap=null; st.canvas=null; st.src=src||''; st.key=key; st.num=0;
  st.doc=null; st.zoom=1; st.fit=true;         /* 读到存档前先按「适应宽度」 */
  st.page=Math.max(1, (saved.page|0) || (opts.page|0) || 1);
  st.pages=[]; st.offsets=[]; st.total=0; st.outline=null; st.navLock=0; st.pinch=0;
  st.onPage=opts.onPage||null; st.onCount=opts.onCount||null;
  var token=++st.token;
  if(!src){ host.innerHTML=pdfNoteHTML('找不到这份 PDF'); return; }
  /* 已经缓存过的文档（换标签回来）不要先闪一行「正在打开 PDF…」：等一个微任务就直接画了 */
  if(!_pdfDocCache[src]) host.innerHTML='<div class="pdfv-load">正在打开 PDF…</div>';
  pdfSyncBar();                                  /* 工具条先显示这份文件的页码，别留着上一份的 */
  pdfEnsureLib(function(){
    pdfDocCacheGet(src).then(function(doc){
      if(token!==st.token) return;
      st.doc=doc; st.num=doc.numPages||0;
      pdfBaseSize(1).then(function(bs){
        if(token!==st.token) return;
        if(bs && bs.width && bs.height){ st.baseW=bs.width; st.baseH=bs.height; }
        st.fit=wantFit;
        /* 存档里有缩放就接着用；没有 / 头一回打开才「一页占满宽度」 */
        st.zoom=(!wantFit && wantZoom>0) ? Math.max(PDF_MIN_ZOOM, Math.min(PDF_MAX_ZOOM, wantZoom)) : pdfFitZoom();
        host.innerHTML='<div class="pdfv-pages"></div>';
        st.wrap=host.querySelector('.pdfv-pages');
        pdfBuildPages();
        pdfLayout();
        pdfBindPinch(host);
        pdfBindScroll(host);
        if(st.onCount) st.onCount(st.num);
        st.navLock=Date.now();                   /* 停在上次看到的地方：先别让滚动事件改页码 */
        var anchor=pdfSavedAnchor(saved);
        if(anchor) pdfRestoreAnchor(anchor); else pdfScrollToPage(st.page);
        pdfSyncBar();
        pdfPaint();                              /* 先回到位置再画：不会先亮一下第一页再跳走 */
        pdfLoadOutline(doc);
        host.__pdfLive=1;
      });
    }, function(err){
      if(token!==st.token) return;
      host.innerHTML=pdfNoteHTML((err&&err.message)||'打不开这份 PDF');
    });
  }, function(err){
    if(token!==st.token) return;
    host.innerHTML=pdfNoteHTML((err&&err.message)||'PDF 组件没加载进来');
  });
}
function pdfNoteHTML(msg){
  return '<div class="sp-empty"><p><b>PDF 没能显示</b></p><p class="hint">'+esc(msg)+
    '</p><p class="hint">点右上角「↗ 新窗口」可以用系统自带的阅读器打开。</p></div>';
}
function pdfFitZoom(){
  var st=pdfState;
  var w=(st.host && st.host.clientWidth)?st.host.clientWidth:760;
  return Math.max(PDF_MIN_ZOOM, Math.min(PDF_MAX_ZOOM, (w-18)/Math.max(1, st.baseW)));
}
/* 取某一页的原始尺寸（用来给整本书定「一页多大」，取不到就用上一次的） */
function pdfBaseSize(n){
  var st=pdfState;
  if(!st.doc) return Promise.resolve(null);
  return st.doc.getPage(n||1).then(function(page){
    var v=page.getViewport({scale:1});
    return (v && v.width && v.height) ? {width:v.width, height:v.height} : null;
  }, function(){ return null; });
}
/* 先建出一整列占位画布：按第一页的尺寸撑出位置，真正画到哪一页才算哪一页（318 页也不会卡） */
function pdfBuildPages(){
  var st=pdfState, html='';
  st.pages=[]; st.offsets=[];
  if(!st.wrap) return;
  for(var i=0;i<st.num;i++) html+='<div class="pdfv-page"><canvas class="pdfv-canvas"></canvas><div class="pdfv-text"></div></div>';
  st.wrap.innerHTML=html;
  var cvs=st.wrap.querySelectorAll('canvas.pdfv-canvas'), tls=st.wrap.querySelectorAll('.pdfv-text');
  for(var k=0;k<cvs.length;k++)
    st.pages.push({cv:cvs[k], tl:tls[k]||null, tlZ:'', w:st.baseW, h:st.baseH, rw:st.baseW, rh:st.baseH, on:false, busy:false, z:0, task:null});
}
/* 按当前倍率排版（每页多大、每页从哪儿开始），起始位置记进 offsets —— 找当前页只看这张表 */
function pdfLayout(){
  var st=pdfState, z=st.zoom||1, y=PDF_PAGE_PAD;
  st.offsets=[];
  for(var i=0;i<st.pages.length;i++){
    var p=st.pages[i];
    p.w=Math.max(1, Math.round((p.rw||st.baseW)*z));
    p.h=Math.max(1, Math.round((p.rh||st.baseH)*z));
    if(p.cv){ p.cv.style.width=p.w+'px'; p.cv.style.height=p.h+'px'; }
    st.offsets[i]=y;
    y+=p.h+PDF_PAGE_GAP;
  }
  st.total=y;
}
/* 某个纵坐标落在第几页（0 起） */
function pdfPageIndexAt(y){
  var st=pdfState, i=0;
  for(var k=0;k<st.num;k++){
    if(st.offsets[k]<=y) i=k; else break;
  }
  return i;
}
/* 当前视线在哪一页：看视口中间偏上一点，滑起来页码不会来回跳 */
function pdfPageAtView(){
  var st=pdfState, host=st.host;
  var top=(host && host.scrollTop)?host.scrollTop:0;
  var h=(host && host.clientHeight)||0;
  var probe=top+Math.max(12, Math.min(h*0.4, 160));
  return pdfPageIndexAt(probe)+1;
}
function pdfViewAnchor(){
  var st=pdfState, host=st.host;
  if(!host || !st.offsets.length) return null;
  var h=(host && host.clientHeight)||0;
  var mid=((host && host.scrollTop)||0)+h/2;
  var i=pdfPageIndexAt(mid);
  var p=st.pages[i], ph=(p && p.h)||st.baseH;
  return {i:i, frac:ph ? ((mid-(st.offsets[i]||0))/ph) : 0};
}
function pdfRestoreAnchor(a){
  var st=pdfState, host=st.host;
  if(!a || !host || !st.offsets.length) return;
  var h=(host && host.clientHeight)||0;
  var p=st.pages[a.i], ph=(p && p.h)||st.baseH;
  var y=(st.offsets[a.i]||0)+a.frac*ph-h/2;
  try{ host.scrollTop=Math.max(0, Math.round(y)); }catch(e){}
}
/* 现在看得见 / 快看得见的是哪几页 */
function pdfVisibleRange(){
  var st=pdfState, host=st.host;
  var top=(host && host.scrollTop)?host.scrollTop:0;
  var h=(host && host.clientHeight)||0; if(!h) h=760;      /* 量不到高度（jsdom 之类）时按一屏算 */
  var bottom=top+h, first=st.num, last=1;
  for(var i=0;i<st.num;i++){
    var o=st.offsets[i]||0, p=st.pages[i];
    var e=o+((p && p.h)||st.baseH);
    if(e>top && o<bottom){ if(i+1<first) first=i+1; if(i+1>last) last=i+1; }
  }
  if(first>st.num) first=st.num;
  if(last<first) last=first;
  return {first:first, last:last};
}
/* 该画的画、该放的放：只留视口附近那几页的画布，翻远了再重画 */
function pdfPaint(){
  var st=pdfState;
  if(!st.doc || !st.pages.length) return;
  var r=pdfVisibleRange();
  var cur=Math.max(1, Math.min(st.num, st.page||1));
  var from=Math.max(1, Math.min(r.first-PDF_NEAR, cur-PDF_NEAR));
  var to=Math.min(st.num, Math.max(r.last+PDF_NEAR, cur+PDF_NEAR));
  for(var i=1;i<=st.num;i++){
    var p=st.pages[i-1];
    if(!p || !p.on) continue;
    var far=(i<from-PDF_KEEP || i>to+PDF_KEEP);
    var stale=Math.abs((p.z||0)-(st.zoom||1))>0.002;
    if(far || stale) pdfReleasePage(i);
  }
  for(var k=from;k<=to;k++) pdfRenderPage(k);
  var cp=st.pages[cur-1];
  if(cp) st.canvas=cp.cv;
}
function pdfReleasePage(n){
  var p=pdfState.pages[n-1];
  if(!p || !p.on) return;
  p.on=false; p.z=0;
  try{ p.cv.classList.remove('ready'); }catch(e){}
  try{ p.cv.width=1; p.cv.height=1; }catch(e){}
  pdfReleaseText(p);                              /* 文字层跟着放掉，别留着旧坐标 */
}
/* 文字层：画布是「图」，这层是盖在上面的透明文字 —— 鼠标能拖选、Cmd/Ctrl+C 能复制。 */
function pdfReleaseText(p){
  if(!p) return;
  p.tlZ='';
  if(p.tl){ try{ p.tl.innerHTML=''; }catch(e){} }
}
function pdfTextLayer(page, p, z){
  if(!p || !p.tl || !page) return;
  try{
    if(typeof pdfjsLib==='undefined' || typeof pdfjsLib.renderTextLayer!=='function') return;
    if(typeof page.getTextContent!=='function') return;
  }catch(e){ return; }
  var tag=String(z);
  if(p.tlZ===tag && p.tl.firstChild) return;     /* 这一页这个倍率的文字层已经铺好了 */
  p.tlZ=tag;
  var tl=p.tl, token=pdfState.token;
  try{ tl.innerHTML=''; }catch(e){}
  /* pdf.js 3.x 要求容器上有 --scale-factor，且值要和 viewport.scale 一致，位置才对得上画布 */
  tl.style.setProperty('--scale-factor', tag);
  var pr;
  try{ pr=page.getTextContent(); }catch(e){ return; }
  if(!pr || typeof pr.then!=='function') return;
  pr.then(function(tc){
    if(token!==pdfState.token || !tl.parentNode || p.tlZ!==tag) return;
    try{
      var task=pdfjsLib.renderTextLayer({textContentSource:tc, container:tl,
        viewport:page.getViewport({scale:z}), textDivs:[]});
      if(task && task.promise && task.promise['catch']) task.promise['catch'](function(){});
    }catch(e){}
  }, function(){});
}
/* 画第 n 页：画布按当前倍率，高清屏按 dpr 放大后备缓冲 */
function pdfRenderPage(n){
  var st=pdfState, p=st.pages[n-1];
  if(!p || p.on || p.busy) return;
  p.busy=true;
  var token=st.token, z0=st.zoom||1;
  st.doc.getPage(n).then(function(page){
    p.busy=false;
    if(token!==st.token) return;
    var base=page.getViewport({scale:1});
    if(base && base.width && base.height &&
       (Math.abs(base.width-(p.rw||0))>0.6 || Math.abs(base.height-(p.rh||0))>0.6)){
      p.rw=base.width; p.rh=base.height;         /* 这一页和别的页不一样大：重排一次，视线别乱跳 */
      var a=pdfViewAnchor();
      pdfLayout();
      pdfRestoreAnchor(a);
    }
    var z=z0, cv=p.cv;
    var w=p.w||Math.max(1, Math.round((p.rw||st.baseW)*z));
    var h=p.h||Math.max(1, Math.round((p.rh||st.baseH)*z));
    var dpr=Math.min(2, dprOf());
    cv.width=Math.max(1, Math.round(w*dpr));
    cv.height=Math.max(1, Math.round(h*dpr));
    cv.style.width=w+'px'; cv.style.height=h+'px';
    var g=cv.getContext('2d');
    if(g){ g.setTransform(1,0,0,1,0,0); g.fillStyle='#fff'; g.fillRect(0,0,cv.width,cv.height); }
    if(p.task){ try{ p.task.cancel(); }catch(e){} }
    var task;
    try{
      task=page.render({canvasContext:g, viewport:page.getViewport({scale:z}), transform:(dpr!==1?[dpr,0,0,dpr,0,0]:null)});
    }catch(e){ pdfMarkPageReady(p, z); return; }
    p.task=task; st.task=task;
    pdfTextLayer(page, p, z);                    /* 图与文字两层一起铺，缩放后仍然对得上 */
    return task.promise.then(function(){
      p.task=null; if(st.task===task) st.task=null;
      pdfMarkPageReady(p, z);
    }, function(err){
      p.task=null; if(st.task===task) st.task=null;
      if(!err || err.name!=='RenderingCancelledException') pdfMarkPageReady(p, z);
    });
  }, function(){ p.busy=false; });
}
function pdfMarkPageReady(p, z){
  p.on=true; p.z=z;
  try{ p.cv.classList.add('ready'); }catch(e){}
}
/* 重新排版 + 重画视口附近（缩放 / 改窗口大小后调） */
function pdfRender(){
  var st=pdfState;
  if(!st.doc || !st.pages.length) return;
  if(st.fit || !st.zoom) st.zoom=pdfFitZoom();
  var a=pdfViewAnchor();
  pdfLayout();
  pdfRestoreAnchor(a);
  pdfPaint();
}
function pdfScrollToPage(n){
  var st=pdfState, host=st.host;
  if(!host || !st.offsets.length) return;
  var i=Math.max(0, Math.min(st.offsets.length-1, (n|0||1)-1));
  try{ host.scrollTop=st.offsets[i]||0; }catch(e){}
}
function pdfGoPage(p){
  var st=pdfState; if(!st.doc) return;
  var n=Math.max(1, Math.min(st.num||1, p|0||1));
  st.page=n;
  st.navLock=Date.now();
  pdfScrollToPage(n);
  if(st.onPage) st.onPage(n);
  pdfSyncBar(); pdfPaint();
  pdfSaveView();
}
function pdfPrev(){ pdfGoPage(pdfState.page-1); }
function pdfNext(){ pdfGoPage(pdfState.page+1); }
/* 滚动 → 页码跟着走；滚到哪儿就画到哪儿。
   优先用 requestAnimationFrame 合并高频滚动事件；万一 rAF 被卡住（后台标签页 / 无头浏览器），
   加一个 150ms 的兜底定时器，保证「滑一下就翻页」不会失灵。 */
function pdfScrollTick(){
  if(_pdfScrollRaf || _pdfScrollTimer) return;
  var run=function(){
    if(_pdfScrollTimer){ clearTimeout(_pdfScrollTimer); _pdfScrollTimer=0; }
    if(_pdfScrollRaf){
      if(typeof cancelAnimationFrame==='function'){ try{ cancelAnimationFrame(_pdfScrollRaf); }catch(e){} }
      _pdfScrollRaf=0;
    }
    pdfOnScroll();
  };
  if(typeof requestAnimationFrame==='function') _pdfScrollRaf=requestAnimationFrame(run);
  _pdfScrollTimer=setTimeout(run, 150);
}
function pdfOnScroll(){
  var st=pdfState;
  if(!st.doc || !st.pages.length || st.pinch) return;
  var n=pdfPageAtView();
  if(st.navLock && (Date.now()-st.navLock)<900){
    if(n!==st.page) pdfScrollToPage(st.page);     /* 刚点过目录 / 跳页：以目标页为准，别被滚动事件带偏 */
  } else if(n && n!==st.page){
    st.page=n;
    if(st.onPage) st.onPage(n);
    pdfSyncBar();
  }
  pdfPaint();
  pdfSaveView();
}
function pdfBindScroll(host){
  if(!host || host.__pdfScrollBound) return;
  host.__pdfScrollBound=1;
  host.addEventListener('scroll', pdfScrollTick, {passive:true});
}
function pdfZoomBy(d){ pdfZoomSet(pdfState.zoom*(d>0?1.2:1/1.2)); }
function pdfZoomSet(z){
  var st=pdfState; if(!st.doc) return;
  st.zoom=Math.max(PDF_MIN_ZOOM, Math.min(PDF_MAX_ZOOM, z));
  st.fit=false;
  pdfRender();
  pdfSyncBar();
  pdfSaveView();
}
function pdfFitWidth(){
  var st=pdfState; if(!st.doc) return;
  st.fit=true; st.zoom=pdfFitZoom();
  pdfRender();
  pdfSyncBar();
  pdfSaveView();
}
/* 翻页 / 缩放后把工具条上的页码与百分比对齐（两个面板共用这套 id） */
function pdfSyncBar(){
  var st=pdfState;
  var inp=$('pdfPageInput');
  if(inp && String(st.page)!==inp.value && document.activeElement!==inp) inp.value=st.num?st.page:'';
  var mx=$('pdfPageMax'); if(mx) mx.textContent=st.num?String(st.num):'-';
  var zv=$('pdfZoomVal'); if(zv) zv.textContent=Math.round((st.zoom||1)*100)+'%';
  var pv=$('pdfPrevBtn'); if(pv) pv.disabled=!!(st.num && st.page<=1);
  var nx=$('pdfNextBtn'); if(nx) nx.disabled=!!(st.num && st.page>=st.num);
  if($('pdfJumpBody')) pdfJumpTick();             /* 跳页面板开着就把「第几页」一起刷新 */
}
function pdfOpenInTab(src, page){
  src=src||pdfState.src; if(!src){ toast('PDF 还没加载好'); return; }
  var u=src+(src.indexOf('#')>=0?'':'#page='+(page||pdfState.page||1));
  try{ window.open(u, '_blank'); }catch(e){}
}
/* ---------- 快速跳页：有书签先列书签，没书签就列页码 ---------- */
function pdfJumpStep(){
  var n=pdfState.num||0;
  return n ? Math.max(1, Math.ceil(n/PDF_JUMP_MAX)) : 1;
}
function pdfToggleJump(){ if($('pdfJump')) pdfJumpClose(); else pdfJumpOpen(); }
function pdfJumpOpen(){
  var old=$('pdfJumpMask'); if(old && old.parentNode) old.parentNode.removeChild(old);
  var mask=document.createElement('div');
  mask.className='pdfv-jumpmask';
  mask.id='pdfJumpMask';
  mask.setAttribute('onclick','pdfJumpClose()');
  mask.innerHTML='<div class="pdfv-jump" id="pdfJump" onclick="event.stopPropagation()">'+
    '<div class="pdfv-jumph"><b>快速跳页</b><span class="hint" id="pdfJumpInfo"></span>'+
      '<span class="row pdfv-jumpgo">'+
        '<input type="number" id="pdfJumpInput" min="1" placeholder="页码" onkeydown="if(event.key===\'Enter\')pdfJumpGo()">'+
        '<button class="small" onclick="pdfJumpGo()">跳</button>'+
        '<button class="ghost small" onclick="pdfJumpClose()" title="收起">✕</button>'+
      '</span></div>'+
    '<div class="pdfv-jumpbody" id="pdfJumpBody"></div></div>';
  document.body.appendChild(mask);
  pdfJumpRebuild();
}
function pdfJumpClose(){
  var el=$('pdfJumpMask');
  if(el && el.parentNode) el.parentNode.removeChild(el);
}
function pdfJumpRebuild(){
  var body=$('pdfJumpBody'); if(!body) return;
  var st=pdfState, html='';
  var n=st.num||0, step=pdfJumpStep();
  var hasToc=!!(st.outline && st.outline.length);
  var tab=hasToc ? _pdfJumpTab : 'num';
  if(hasToc)                                       /* 这份 PDF 自带书签：页码 / 目录 两个页签换着看 */
    html+='<div class="pdfv-jtabs">'+
      '<button class="pdfv-jtab'+(tab==='num'?' on':'')+'" onclick="pdfJumpTab(\'num\')">页码</button>'+
      '<button class="pdfv-jtab'+(tab==='toc'?' on':'')+'" onclick="pdfJumpTab(\'toc\')">目录</button></div>';
  if(tab==='toc'){ html+=pdfOutlineHTML(st.outline); }
  else if(!n){ html+='<p class="hint">PDF 还在打开中…</p>'; }
  else{
    html+='<div class="pdfv-jtitle">页码（共 '+n+' 页'+(step>1?('，每个按钮跨 '+step+' 页'):'')+'，点一下直接跳过去）</div><div class="pdfv-jnums">';
    for(var i=1;i<=n;i+=step){
      var on=(st.page>=i && st.page<i+step);
      html+='<button class="small ghost pdfv-jnum'+(on?' on':'')+'" onclick="pdfJumpTo('+i+')">'+i+'</button>';
    }
    html+='</div>';
  }
  body.innerHTML=html;
  pdfJumpTick();
}
function pdfJumpTab(t){
  _pdfJumpTab=(t==='toc')?'toc':'num';
  pdfJumpRebuild();
}
function pdfJumpTick(){
  var info=$('pdfJumpInfo'), st=pdfState;
  if(info) info.textContent=st.num?('第 '+st.page+' / '+st.num+' 页'):'';
}
function pdfJumpTo(p){
  var st=pdfState;
  if(!st.doc){ toast('PDF 还没打开'); return; }
  pdfGoPage(Math.max(1, Math.min(st.num||1, p|0||1)));
  var inp=$('pdfJumpInput'); if(inp) inp.value='';
  pdfJumpRebuild();                               /* 面板不关：连着翻好几页最顺手，点 ✕ / 旁边才收起 */
}
function pdfJumpGo(){
  var inp=$('pdfJumpInput'); if(!inp) return;
  pdfJumpTo(parseInt(inp.value,10));
}
/* PDF 自带书签（pdf.js 的 outline）：有就先把目录列出来，点书签直接跳过去 */
function pdfLoadOutline(doc){
  var st=pdfState, token=st.token;
  if(!doc || typeof doc.getOutline!=='function'){ if(typeof modRenderToc==='function') modRenderToc(true); return; }
  var pr;
  try{ pr=doc.getOutline(); }catch(e){ return; }
  if(!pr || typeof pr.then!=='function') return;
  pr.then(function(items){
    if(token!==st.token || st.doc!==doc) return;
    st.outline=(items && items.length)?items:null;
    if(st.outline && $('pdfJumpBody')) pdfJumpRebuild();
    if(typeof modRenderToc==='function') modRenderToc(true);   /* 模组面板左边的目录 */
  }, function(){ if(typeof modRenderToc==='function') modRenderToc(true); });
}
function pdfOutlineHTML(items){
  if(!items || !items.length) return '';
  if(!_pdfOutlineStore) _pdfOutlineStore={};
  var out='<ul class="pdfv-otoc">';
  for(var i=0;i<items.length;i++){
    var it=items[i]||{};
    var id='o'+(_pdfOutlineN++);
    _pdfOutlineStore[id]=it;
    out+='<li><a href="javascript:void(0)" class="pdfv-oitem" onclick="pdfOutlineGo(\''+id+'\')">'+esc(it.title||'（无标题）')+'</a>';
    if(it.items && it.items.length) out+=pdfOutlineHTML(it.items);
    out+='</li>';
  }
  return out+'</ul>';
}
function pdfOutlineGo(id){
  var it=_pdfOutlineStore && _pdfOutlineStore[id];
  var st=pdfState, doc=st.doc;
  if(!it || !doc) return;
  var dest=it.dest, pr=Promise.resolve(dest);
  if(typeof dest==='string' && typeof doc.getDestination==='function') pr=doc.getDestination(dest);
  pr.then(function(d){
    if(!d || !d.length || typeof doc.getPageIndex!=='function') return null;
    return doc.getPageIndex(d[0]).then(function(idx){ pdfGoPage(idx+1); });
  })['catch'](function(){});
}
/* 双指捏合缩放：两指时先给整列页面加 CSS 缩放（跟手），松手再按新倍率重画一遍高清图 */
function pdfBindPinch(host){
  if(!host || host.__pdfPinch) return;
  host.__pdfPinch=1;
  var pts={}, startDist=0, startZoom=1, pct=100;
  function count(){ var n=0, k; for(k in pts) if(pts[k]) n++; return n; }
  function dist(){
    var a=[], k; for(k in pts) if(pts[k]) a.push(pts[k]);
    if(a.length<2) return 0;
    return Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y);
  }
  function center(){
    var a=[], k; for(k in pts) if(pts[k]) a.push(pts[k]);
    if(a.length<2) return null;
    return {x:(a[0].x+a[1].x)/2, y:(a[0].y+a[1].y)/2};
  }
  host.addEventListener('pointerdown', function(ev){
    if(ev.pointerType!=='touch' && ev.pointerType!=='pen') return;
    pts[ev.pointerId]={x:ev.clientX,y:ev.clientY};
    if(count()===2){ startDist=dist(); startZoom=pdfState.zoom||1; pct=100; pdfState.pinch=1; }
  }, true);
  host.addEventListener('pointermove', function(ev){
    if(!pts[ev.pointerId]) return;
    pts[ev.pointerId]={x:ev.clientX,y:ev.clientY};
    if(count()<2 || !startDist) return;
    var d=dist(); if(!d) return;
    pct=Math.max(PDF_MIN_ZOOM/startZoom, Math.min(PDF_MAX_ZOOM/startZoom, d/startDist));
    var box=pdfState.wrap, c=center();
    if(box && c){
      var r=host.getBoundingClientRect();
      box.style.transformOrigin=Math.round(c.x-r.left+host.scrollLeft)+'px '+Math.round(c.y-r.top+host.scrollTop)+'px';
      box.style.transform='scale('+pct.toFixed(3)+')';
    }
  }, true);
  function endPinch(ev){
    if(pts[ev.pointerId]) delete pts[ev.pointerId];
    if(!startDist) return;
    if(count()>=2) return;
    var z=startZoom*pct;
    startDist=0; pct=100; pdfState.pinch=0;
    var box=pdfState.wrap;
    if(box){ box.style.transform=''; box.style.transformOrigin=''; }
    if(Math.abs(z-(pdfState.zoom||1))>0.01) pdfZoomSet(z);
  }
  host.addEventListener('pointerup', endPinch, true);
  host.addEventListener('pointercancel', endPinch, true);
}
