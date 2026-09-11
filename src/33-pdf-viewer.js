/* ---------- 自带 PDF 阅读器（pdf.js）----------
   浏览器自带的 iframe PDF 阅读器在手机 / 平板上很不听话：iOS、安卓都不认 #page=（点「下一页」不动），
   也没有缩放按钮。所以规则书与模组里的 PDF 都改成自己画：用 Mozilla 的 pdf.js（Apache-2.0，见 assets/pdfjs/）
   把页面画到画布上，翻页 / 缩放 / 双指捏合全由我们自己控制，电脑与手机表现一致。
   · 离线单文件版：pdf.js 与它的 worker 都内联进 html（worker 走主线程，file:// 下也能跑，不用建 Worker）。
   · 在线版：第一次打开 PDF 时才按需下载，首屏依旧很轻。
   两个面板（📚 规则书 / 📖 模组里的 PDF）同一时间只会开一个，所以共用这一份查看器状态。 */
var PDF_MIN_ZOOM=0.25, PDF_MAX_ZOOM=5;
var PDF_DOC_CACHE_MAX=2;      /* 最多同时缓存两份 PDF（规则书 + 当前模组），换标签来回切不用重开 */
var pdfState={
  host:null, canvas:null, doc:null, src:'', num:0, page:1, zoom:1, fit:true,
  baseW:612, baseH:792, task:null, token:0, onPage:null, onCount:null
};
var _pdfDocCache={};          /* src -> Promise<PDFDocumentProxy>：换页 / 切标签不用重开 */
var _pdfLibWaiters=null;      /* 在线版第一次加载 pdf.js 时排队等它 */

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
/* 把一份 PDF 挂进 host（host 是滚动容器，画布由我们建） */
/* 工具条（规则书 / 模组共用同一套 id —— 两个面板同时只开一个） */
function pdfControlsHTML(extra){
  return '<button class="small ghost" onclick="pdfPrev()" title="上一页">‹ 上一页</button>'+
    '<span class="rb-pageno"><input type="number" id="pdfPageInput" value="'+(pdfState.page||1)+'" min="1" '+
      'onchange="pdfGoPage(parseInt(this.value,10))"> / <span id="pdfPageMax">'+(pdfState.num||'-')+'</span></span>'+
    '<button class="small ghost" onclick="pdfNext()" title="下一页">下一页 ›</button>'+
    '<span class="pdfv-zoom">'+
      '<button class="small ghost" onclick="pdfZoomBy(-1)" title="缩小">A－</button>'+
      '<span class="pdfv-zoomval" id="pdfZoomVal">'+Math.round((pdfState.zoom||1)*100)+'%</span>'+
      '<button class="small ghost" onclick="pdfZoomBy(1)" title="放大">A＋</button>'+
      '<button class="small ghost" onclick="pdfFitWidth()" title="回到适应宽度（手机上看全页）">适宽</button>'+
    '</span>'+(extra||'');
}
function pdfMountPdf(host, src, opts){
  opts=opts||{};
  var st=pdfState;
  if(!host) return;
  if(st.task){ try{ st.task.cancel(); }catch(e){} st.task=null; }
  st.host=host; st.src=src||''; st.page=Math.max(1, opts.page||1); st.num=0;
  st.zoom=1; st.fit=(opts.fit!==false); st.canvas=null; st.doc=null;
  st.onPage=opts.onPage||null; st.onCount=opts.onCount||null;
  var token=++st.token;
  if(!src){ host.innerHTML=pdfNoteHTML('找不到这份 PDF'); return; }
  host.innerHTML='<div class="pdfv-load">正在打开 PDF…</div>';
  pdfSyncBar();                                  /* 工具条先显示这份文件的第几页，别留着上一份的页码 */
  pdfEnsureLib(function(){
    pdfDocCacheGet(src).then(function(doc){
      if(token!==st.token) return;
      st.doc=doc; st.num=doc.numPages||0;
      host.innerHTML='<canvas class="pdfv-canvas"></canvas>';
      st.canvas=host.querySelector('.pdfv-canvas');
      pdfBindPinch(host);
      pdfSyncBar();
      if(st.onCount) st.onCount(st.num);
      pdfRender();
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
/* 画当前页（同一时间只画一页；手机上滑到页内其他位置就靠 host 自己滚） */
function pdfRender(){
  var st=pdfState;
  if(!st.doc || !st.canvas) return;
  var token=st.token, no=st.page;
  st.doc.getPage(no).then(function(page){
    if(token!==st.token || !st.canvas) return;
    var base=page.getViewport({scale:1});
    st.baseW=base.width; st.baseH=base.height;
    if(st.fit || !st.zoom) st.zoom=pdfFitZoom();
    var cssW=base.width*st.zoom, cssH=base.height*st.zoom;
    var dpr=Math.min(2, dprOf());
    var cv=st.canvas;
    cv.width=Math.max(1, Math.round(cssW*dpr));
    cv.height=Math.max(1, Math.round(cssH*dpr));
    cv.style.width=Math.round(cssW)+'px';
    cv.style.height=Math.round(cssH)+'px';
    var g=cv.getContext('2d');
    g.setTransform(1,0,0,1,0,0);
    g.fillStyle='#fff'; g.fillRect(0,0,cv.width,cv.height);
    if(st.task){ try{ st.task.cancel(); }catch(e){} }
    var task;
    try{
      task=page.render({canvasContext:g, viewport:page.getViewport({scale:st.zoom}), transform:(dpr!==1?[dpr,0,0,dpr,0,0]:null)});
    }catch(e){ return; }
    st.task=task;
    return task.promise.then(function(){
      if(st.task===task) st.task=null;
      pdfSyncBar();
    }, function(err){
      if(st.task===task) st.task=null;
      if(err && err.name==='RenderingCancelledException') return;
    });
  }, function(){ /* 取页失败：忽略，留在原页 */ });
}
function pdfGoPage(p){
  var st=pdfState; if(!st.doc) return;
  var n=Math.max(1, Math.min(st.num||1, p|0||1));
  st.page=n;
  pdfRender();
  if(st.onPage) st.onPage(n);
  pdfSyncBar();
}
function pdfPrev(){ pdfGoPage(pdfState.page-1); }
function pdfNext(){ pdfGoPage(pdfState.page+1); }
function pdfZoomBy(d){ pdfZoomSet(pdfState.zoom*(d>0?1.2:1/1.2)); }
function pdfZoomSet(z){
  var st=pdfState; if(!st.doc) return;
  var keep=pdfViewRatio();
  st.zoom=Math.max(PDF_MIN_ZOOM, Math.min(PDF_MAX_ZOOM, z));
  st.fit=false;
  pdfRender();
  if(keep) pdfRestoreView(keep);
  pdfSyncBar();
}
function pdfFitWidth(){
  var st=pdfState; if(!st.doc) return;
  st.fit=true; st.zoom=pdfFitZoom();
  pdfRender();
  pdfSyncBar();
}
function pdfViewRatio(){
  var host=pdfState.host; if(!host) return null;
  var sw=host.scrollWidth||1, sh=host.scrollHeight||1;
  return {x:(host.scrollLeft+host.clientWidth/2)/sw, y:(host.scrollTop+host.clientHeight/2)/sh};
}
function pdfRestoreView(c){
  var host=pdfState.host; if(!host||!c) return;
  host.scrollLeft=Math.max(0, Math.round(c.x*(host.scrollWidth||1)-host.clientWidth/2));
  host.scrollTop=Math.max(0, Math.round(c.y*(host.scrollHeight||1)-host.clientHeight/2));
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
}
function pdfOpenInTab(src, page){
  src=src||pdfState.src; if(!src){ toast('PDF 还没加载好'); return; }
  var u=src+(src.indexOf('#')>=0?'':'#page='+(page||pdfState.page||1));
  try{ window.open(u, '_blank'); }catch(e){}
}
/* 双指捏合缩放：两指时先给画布加 CSS 缩放（跟手），松手再按新倍率重画一遍高清图 */
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
    if(count()===2){ startDist=dist(); startZoom=pdfState.zoom||1; pct=100; }
  }, true);
  host.addEventListener('pointermove', function(ev){
    if(!pts[ev.pointerId]) return;
    pts[ev.pointerId]={x:ev.clientX,y:ev.clientY};
    if(count()<2 || !startDist) return;
    var d=dist(); if(!d) return;
    pct=Math.max(PDF_MIN_ZOOM/startZoom, Math.min(PDF_MAX_ZOOM/startZoom, d/startDist));
    var cv=pdfState.canvas, c=center();
    if(cv && c){
      var r=host.getBoundingClientRect();
      cv.style.transformOrigin=Math.round(c.x-r.left+host.scrollLeft)+'px '+Math.round(c.y-r.top+host.scrollTop)+'px';
      cv.style.transform='scale('+pct.toFixed(3)+')';
    }
  }, true);
  function endPinch(ev){
    if(pts[ev.pointerId]) delete pts[ev.pointerId];
    if(!startDist) return;
    if(count()>=2) return;
    var z=startZoom*pct;
    startDist=0; pct=100;
    var cv=pdfState.canvas;
    if(cv){ cv.style.transform=''; cv.style.transformOrigin=''; }
    if(Math.abs(z-(pdfState.zoom||1))>0.01) pdfZoomSet(z);
  }
  host.addEventListener('pointerup', endPinch, true);
  host.addEventListener('pointercancel', endPinch, true);
}
