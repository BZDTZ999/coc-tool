/* ---------- 右半屏：📖 模组 与 📚 规则书 ----------
   点菜单栏的「📖 模组 / 📚 规则书」，页面按左右分栏：左边还是当前功能，右边是面板。
   中间的细条可拖动调整比例（双击回到一半一半），比例记在本机。
   · 模组：上传 word(.docx) / pdf / txt / md 查看；文件存在浏览器 IndexedDB 里，刷新后还在。
   · 规则书：整套 COC7 核心规则书的正文 + 书签目录 + 全文搜索跳转（数据按需加载）。 */
var SIDE_PANE_MIN=0.25, SIDE_PANE_MAX=0.8;

function sidePaneCfg(){
  if(!state) return {open:false,kind:'module',ratio:0.5};
  if(!state.ui) state.ui={};
  if(!state.ui.sidePane || typeof state.ui.sidePane!=='object') state.ui.sidePane={open:false,kind:'module',ratio:0.5};
  var c=state.ui.sidePane;
  if(c.ratio==null || !isFinite(c.ratio)) c.ratio=0.5;
  if(c.kind!=='module' && c.kind!=='rulebook' && c.kind!=='extras') c.kind='module';
  return c;
}
function sidePaneIsOpen(kind){
  var c=sidePaneCfg();
  return !!c.open && (!kind || c.kind===kind);
}
/* 菜单栏按钮：打开 / 收起 */
function toggleSidePane(kind){
  var c=sidePaneCfg();
  if(c.open && c.kind===kind){ c.open=false; }
  else { c.open=true; c.kind=kind; }
  saveStateQuiet();
  applySidePane();
  renderNav();
  renderSidePane();
}
function closeSidePane(){ sidePaneCfg().open=false; saveStateQuiet(); applySidePane(); renderNav(); }
function applySidePane(){
  var c=sidePaneCfg(), pane=$('sidePane'), bar=$('splitBar'), left=$('splitLeft');
  if(!pane || !bar) return;
  var open=!!c.open;
  pane.hidden=!open; bar.hidden=!open;
  document.body.classList.toggle('sideopen', open);
  if(open){
    pane.style.flexBasis=(Math.round(c.ratio*1000)/10)+'%';
    if(left) left.style.flexBasis=(Math.round((1-c.ratio)*1000)/10)+'%';
  } else {
    pane.style.flexBasis=''; if(left) left.style.flexBasis='';
  }
  try{ moduleFitTabs(); }catch(e){}          /* 左右拖宽窄后，标签名字跟着重新分配宽度 */
  sidePaneResizeScenes();
}
/* 左半边变窄/变宽后，地图与战斗场景要按新宽度重新量一次尺寸，
   否则画布还留着旧宽度，会顶出左半边（用户反馈过：开着模组拖分栏，战斗场景跑到屏幕外）。 */
var _sideSceneRaf=0;
function sidePaneResizeScenes(){
  if(_sideSceneRaf) return;
  var run=function(){
    _sideSceneRaf=0;
    try{ if(typeof drawBattleScene==='function') drawBattleScene(); }catch(e){}
    try{ if(typeof drawMapCanvas==='function' && typeof currentMap==='function' && currentMap()) drawMapCanvas(); }catch(e){}
  };
  if(typeof requestAnimationFrame==='function') _sideSceneRaf=requestAnimationFrame(run);
  else run();
}
function initSidePane(){
  var pane=$('sidePane'), bar=$('splitBar');
  if(!pane) return;
  if(!pane.dataset.bound){
    pane.dataset.bound='1';
    if(bar){
      var dragging=false;
      var onMove=function(ev){
        if(!dragging) return;
        var wrap=$('splitWrap'); if(!wrap) return;
        var r=wrap.getBoundingClientRect();
        var x=(ev.touches&&ev.touches[0]?ev.touches[0].clientX:ev.clientX);
        var ratio=1-(x-r.left)/r.width;
        ratio=Math.max(SIDE_PANE_MIN, Math.min(SIDE_PANE_MAX, ratio));
        sidePaneCfg().ratio=ratio;
        applySidePane();
      };
      var onUp=function(){
        if(!dragging) return;
        dragging=false;
        document.body.classList.remove('spdragging');
        saveStateQuiet();
      };
      bar.addEventListener('pointerdown', function(ev){ dragging=true; document.body.classList.add('spdragging'); ev.preventDefault(); });
      bar.addEventListener('dblclick', function(){ sidePaneCfg().ratio=0.5; applySidePane(); saveStateQuiet(); });
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    }
  }
  applySidePane();
  renderSidePane();
  /* 开机就把「窗口任意位置拖入文件 / 文件夹」挂上：先拖文件再打开右半屏也照样能收 */
  moduleBindWindowDrop();
}
/* 需要「窗口够宽」才分栏：窄屏时右半屏改为整块显示在下方 */
function sidePaneNarrow(){ return window.innerWidth < 900; }

function renderSidePane(){
  var pane=$('sidePane'); if(!pane) return;
  var c=sidePaneCfg();
  if(!c.open){ pane.innerHTML=''; return; }
  if(c.kind==='rulebook') renderRulebookPane(pane);
  else if(c.kind==='extras') renderExtrasPane(pane);
  else renderModulePane(pane);
}

/* ================= 📖 模组 ================= */
var moduleFiles=[];                  // 模组里的文件们：[{id,name,kind,size,url?,blob?,text?}]
var moduleActiveId=null;             // 当前在看的那一份（标签页只有 active 的那份会渲染大图/正文）
var moduleSeq=0;
var modulePdfPage={};                // 每份 PDF 看到第几页（换标签页回来还在原地）
var MODULE_MAX=300;                  // 一次最多收这么多，免得手滑把整个磁盘拖进来
function moduleKindOf(name, type){
  var s=String(name||'').toLowerCase();
  if(/\.pdf$/.test(s)) return 'pdf';
  if(/\.docx$/.test(s)) return 'docx';
  if(/\.(txt|md|markdown|csv|json|log)$/.test(s)) return 'text';
  if(/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(s)) return 'image';
  var t=String(type||'');
  if(t==='application/pdf') return 'pdf';
  if(/wordprocessingml/.test(t)) return 'docx';
  if(/^image\//.test(t)) return 'image';
  if(/^text\//.test(t)) return 'text';
  return 'other';
}
function moduleIcon(kind){ return kind==='pdf'?'📄':(kind==='docx'?'📝':(kind==='image'?'🖼':(kind==='text'?'📃':'📦'))); }
function moduleKindLabel(kind){ return kind==='pdf'?'PDF':(kind==='docx'?'Word':(kind==='image'?'图片':(kind==='text'?'文本':'其他'))); }
/* ---- IndexedDB：把上传的模组存在浏览器里，刷新后还在 ---- */
function idbOpen(cb, fail){
  if(!window.indexedDB){ if(fail) fail(new Error('浏览器不支持本地存储')); return; }
  var req=indexedDB.open('coc-tool-side', 1);
  req.onupgradeneeded=function(){ var db=req.result; if(!db.objectStoreNames.contains('files')) db.createObjectStore('files'); };
  req.onsuccess=function(){ cb(req.result); };
  req.onerror=function(){ if(fail) fail(req.error); };
}
function idbPut(key, val, cb){
  idbOpen(function(db){
    var tx=db.transaction('files','readwrite');
    tx.objectStore('files').put(val, key);
    tx.oncomplete=function(){ if(cb) cb(); };
  }, function(){ if(cb) cb(); });
}
function idbGet(key, cb){
  idbOpen(function(db){
    var tx=db.transaction('files','readonly');
    var rq=tx.objectStore('files').get(key);
    rq.onsuccess=function(){ cb(rq.result||null); };
    rq.onerror=function(){ cb(null); };
  }, function(){ cb(null); });
}
function idbDel(key, cb){
  idbOpen(function(db){
    var tx=db.transaction('files','readwrite');
    tx.objectStore('files').delete(key);
    tx.oncomplete=function(){ if(cb) cb(); };
  }, function(){ if(cb) cb(); });
}
/* ---- 整份文件列表存成一条记录（PDF / 图片存 blob，Word / 文本存排好的正文） ---- */
function moduleSaveStore(){
  var items=moduleFiles.map(function(f){
    if(f.kind==='pdf'||f.kind==='image') return {id:f.id, name:f.name, kind:f.kind, size:f.size, blob:f.blob||null};
    return {id:f.id, name:f.name, kind:f.kind, size:f.size, text:f.text||''};
  });
  idbPut('moduleList', {v:2, items:items});
}
function moduleRestoreStore(cb){
  idbGet('moduleList', function(rec){
    if(rec && rec.items && rec.items.length){
      moduleFiles=rec.items.map(function(it){
        var f={id:it.id||('m'+(++moduleSeq)), name:it.name||'模组', kind:it.kind||'text', size:it.size||0};
        if(it.kind==='pdf'||it.kind==='image'){
          f.blob=it.blob||null;
          f.url=(f.blob && window.URL && URL.createObjectURL)?URL.createObjectURL(f.blob):null;
          if(!f.url) f.missing=true;
        } else f.text=it.text||'';
        return f;
      });
      moduleActiveId=moduleFiles[0].id;
      if(cb) cb(true);
      return;
    }
    /* 老版本只存了一个文件（key='module'），搬过来别让用户白传一趟 */
    idbGet('module', function(old){
      if(old && old.name){
        var f={id:'m'+(++moduleSeq), name:old.name, kind:old.kind||'text', size:old.size||0};
        if(old.kind==='pdf' && old.blob){ f.blob=old.blob; f.url=(window.URL&&URL.createObjectURL)?URL.createObjectURL(old.blob):null; }
        else f.text=old.text||'';
        moduleFiles=[f]; moduleActiveId=f.id; idbDel('module'); moduleSaveStore();
      }
      if(cb) cb(false);
    });
  });
}
/* iPhone / iPad 的 Safari 不支持「选文件夹」，那就别显示这个按钮（点了也没反应，反而像坏了） */
function moduleCanPickFolder(){
  try{ return ('webkitdirectory' in document.createElement('input')); }catch(e){ return false; }
}
function modulePickFile(){ var f=$('moduleFileInput'); if(f) f.click(); }
function modulePickFolder(){ var f=$('moduleFolderInput'); if(f) f.click(); }
function onModulePick(ev){
  /* 先把 FileList 抄成数组再清空 input：Safari 上直接 input.value='' 会把 files 一起清掉，
     以前手机端就是这个原因读不到文件。 */
  var fs=[].slice.call((ev.target&&ev.target.files)||[]);
  if(ev.target) try{ ev.target.value=''; }catch(e){}
  if(!fs.length) return;
  moduleAddFiles(fs, function(n){ if(n) toast('已加入 '+n+' 个文件'); else toast('没读到文件（这个格式先拖到「文件」App 里再选）'); });
}
/* 读一个文件 → item（PDF / 图片走 object URL，Word 解析成 HTML，文本直接读） */
function moduleReadOne(file, cb){
  var kind=moduleKindOf(file.name, file.type);
  var item={id:'m'+(++moduleSeq), name:file.name, kind:kind, size:file.size||0};
  if(kind==='pdf'||kind==='image'){
    item.blob=file;
    item.url=(window.URL&&URL.createObjectURL)?URL.createObjectURL(file):null;
    if(!item.url) item.missing=true;
    cb(item); return;
  }
  if(kind==='other'){ cb(item); return; }        /* 认不出的格式别去读，读出来也是乱码；照旧给「另存为 PDF」的提示 */
  var rd=new FileReader();
  rd.onerror=function(){ cb(null); };
  if(kind==='docx'){
    rd.onload=function(){
      var html;
      try{ html=docxToHTML(rd.result); }
      catch(e){
        html='<div class="sp-empty"><p><b>这个 .docx 打不开</b></p><p class="hint">'+esc(e.message||e)+'</p>'+
             '<p class="hint">可以先用 Word 另存为 PDF 再拖进来（老的 .doc 格式也请先另存为 .docx）。</p></div>';
      }
      item.text=html; cb(item);
    };
    rd.readAsArrayBuffer(file);
    return;
  }
  rd.onload=function(){ item.text=String(rd.result||''); cb(item); };
  rd.readAsText(file, 'utf-8');
}
/* 一次加一批（拖进来的文件夹 / 多选）：按文件名自然排序，同名覆盖旧的 */
function moduleAddFiles(list, cb){
  var files=[].slice.call(list||[]).filter(function(f){
    return !!(f && f.name) && !/^\./.test(f.name) && !/^~\$/.test(f.name);
  });
  if(!files.length){ if(cb) cb(0); return; }
  if(files.length>MODULE_MAX) files=files.slice(0, MODULE_MAX);
  var left=files.length, added=0, addedIds=[];
  files.forEach(function(file){
    moduleReadOne(file, function(item){
      if(item){
        var same=null;
        moduleFiles.forEach(function(x){ if(x.name===item.name) same=x; });
        if(same){
          var si=moduleFiles.indexOf(same);
          if(same.url) try{ URL.revokeObjectURL(same.url); }catch(e){}
          item.id=same.id; moduleFiles[si]=item;
        } else moduleFiles.push(item);
        added++; addedIds.push(item.id);
      }
      if(--left<=0) moduleAddDone(added, cb, addedIds);
    });
  });
}
function moduleAddDone(added, cb, addedIds){
  moduleFiles.sort(function(a,b){ return String(a.name).localeCompare(String(b.name), 'zh', {numeric:true}); });
  /* 刚加进来的直接翻到第一份（拖一整个文件夹时最顺手）；按排好序的名次取，别受读取先后影响 */
  var fresh={}; (addedIds||[]).forEach(function(id){ fresh[id]=1; });
  var firstNew=null;
  moduleFiles.forEach(function(f){ if(!firstNew && fresh[f.id]) firstNew=f.id; });
  var has=moduleFiles.filter(function(f){ return f.id===moduleActiveId; })[0];
  if(firstNew) moduleActiveId=firstNew;
  else if(!has) moduleActiveId=moduleFiles.length?moduleFiles[0].id:null;
  moduleSaveStore(); renderSidePane();
  if(cb) cb(added);
}
/* 拖进来的可能是「整个文件夹」：用 webkitGetAsEntry 递归走一遍 */
function moduleWalkEntry(entry, out, done){
  if(!entry){ done(); return; }
  if(entry.isFile){
    entry.file(function(f){ if(f && f.name && !/^\./.test(f.name) && !/^~\$/.test(f.name)) out.push(f); done(); }, function(){ done(); });
    return;
  }
  if(entry.isDirectory){
    var reader=entry.createReader(), kids=[];
    (function readBatch(){
      reader.readEntries(function(batch){
        if(!batch.length){
          if(!kids.length){ done(); return; }
          var pending=kids.length;
          kids.forEach(function(k){ moduleWalkEntry(k, out, function(){ if(--pending<=0) done(); }); });
          return;
        }
        kids=kids.concat([].slice.call(batch));
        readBatch();
      }, function(){ done(); });
    })();
    return;
  }
  done();
}
function moduleDropLoad(dt, cb){
  var fs=(dt && dt.files)?[].slice.call(dt.files):[];
  /* 真实拖放里 dt.files 一定装着拖进来的文件（拖几个就是几个），直接用它最稳。
     以前先走 webkitGetAsEntry，只要 entry.file() 那一步在真实浏览器里没回调成，
     就会一条都读不到 —— 用户看到的就是「没读到文件（可能是空的文件夹或这个格式不支持）」。 */
  var entries=[], items=dt && dt.items;
  if(items && items.length){
    for(var i=0;i<items.length;i++){
      var it=items[i];
      if(it.kind!=='file') continue;
      var en=(it.webkitGetAsEntry && it.webkitGetAsEntry());
      if(en) entries.push(en);
    }
  }
  var hasDir=false;
  entries.forEach(function(en){ if(en && en.isDirectory) hasDir=true; });
  if(fs.length && !hasDir){ moduleAddFiles(fs, cb); return; }     /* 只有文件 → 绕开 entry，直接收 */
  if(!entries.length){                                             /* 没有 entry（老浏览器）→ 还是用 dt.files */
    if(!fs.length){ if(cb) cb(0); return; }
    moduleAddFiles(fs, cb); return;
  }
  var out=[], pending=entries.length;
  entries.forEach(function(en){
    moduleWalkEntry(en, out, function(){
      /* 目录里有文件就用目录里的；一条都没读出来（entry 回调失败等）就退回 dt.files，别白拖一趟 */
      if(--pending<=0) moduleAddFiles(out.length?out:fs, cb);
    });
  });
}
/* 兼容旧调用：一次只加一个文件（测试与老代码都用它） */
function loadModuleFile(file, cb){ moduleAddFiles([file], function(){ if(cb) cb(); }); }
function restoreModuleFromStore(){
  moduleRestoreStore(function(any){
    if(any && moduleFiles.length && sidePaneIsOpen('module')) renderSidePane();
  });
}
function moduleActive(){ return moduleFiles.filter(function(f){ return f.id===moduleActiveId; })[0]||null; }
function moduleSelect(id){ if(moduleActiveId===id) return; moduleActiveId=id; renderSidePane(); }
function moduleCloseOne(id){
  var i=-1;
  moduleFiles.forEach(function(f,k){ if(f.id===id) i=k; });
  if(i<0) return;
  var f=moduleFiles[i];
  if(f.url) try{ URL.revokeObjectURL(f.url); }catch(e){}
  moduleFiles.splice(i,1);
  if(moduleActiveId===id) moduleActiveId=moduleFiles.length?moduleFiles[Math.min(i, moduleFiles.length-1)].id:null;
  moduleSaveStore(); renderSidePane();
}
function moduleClear(){
  moduleFiles.forEach(function(f){ if(f.url) try{ URL.revokeObjectURL(f.url); }catch(e){} });
  moduleFiles=[]; moduleActiveId=null;
  idbDel('moduleList'); idbDel('module');
  renderSidePane();
}
function moduleSizeText(n){
  if(!n) return '';
  if(n<1024) return n+' B';
  if(n<1024*1024) return Math.round(n/1024)+' KB';
  return (n/1024/1024).toFixed(1)+' MB';
}
function renderModulePane(pane){
  var m=moduleActive();
  var many=moduleFiles.length>1;
  var head='<div class="sp-head"><b>📖 模组</b>'+
    '<span class="hint">'+(many?('共 '+moduleFiles.length+' 份，点标签页换着看'):'左边照常带团，右边看模组')+'</span>'+
    '<div class="row sp-tools">'+
      '<label class="btn small btnfile" for="moduleFileInput" title="可以一次选多个文件（PDF / Word / 图片 / txt）"><span>⬆ 添加文件</span></label>'+
      (moduleCanPickFolder()?'<label class="btn small btnfile" for="moduleFolderInput" title="选一整个文件夹，里面的 PDF / Word / 图片会全部加进来"><span>📁 文件夹</span></label>':'')+
      (moduleFiles.length?'<button class="small ghost" onclick="moduleClear()" title="从本机清除（不删你自己的文件）">🗑 全部清除</button>':'')+
      '<button class="ghost small" onclick="closeSidePane()" title="收起右半屏">✕</button>'+
    '</div></div>';
  var body=moduleBodyHTML(m);
  var drop='<div class="sp-drop" id="spDrop">⬇ 把模组文件或<b>整个文件夹</b>拖到这里（PDF · Word · 图片 · txt/md'+
    (moduleFiles.length?'，可以继续加':'')+'）——拖到窗口里任何地方都行</div>';
  pane.innerHTML=head+moduleTabsHTML()+'<div class="sp-body'+(m&&m.kind==='pdf'?' sp-body-fill':'')+'">'+body+drop+'</div>'+
    '<input type="file" id="moduleFileInput" class="file-hidden" accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,.log,image/*" multiple onchange="onModulePick(event)">'+
    '<input type="file" id="moduleFolderInput" class="file-hidden" webkitdirectory directory multiple onchange="onModulePick(event)">';
  /* PDF 交给自带阅读器（手机 / 平板上也能翻页、缩放）；每份文件记住自己看到第几页 */
  if(m && m.kind==='pdf' && m.url){
    pdfMountPdf($('spPdfHost'), m.url, {
      page: modulePdfPage[m.id]||1,
      onPage: function(n){ modulePdfPage[m.id]=n; }
    });
  }
  moduleBindDrop();
  moduleScrollActiveTab();
  moduleFitTabs();
}
/* 多文件时顶上这一排标签页：点一下换一份，✕ 把这份移出去 */
function moduleTabsHTML(){
  if(!moduleFiles.length) return '';
  var tabs=moduleFiles.map(function(f){
    var on=(f.id===moduleActiveId);
    return '<span class="sp-tab'+(on?' on':'')+'" data-id="'+esc(f.id)+'" draggable="true" title="'+esc(f.name)+'（拖动可以换顺序）"'+
      ' onclick="moduleSelect(\''+f.id+'\')"'+
      ' ondragstart="moduleTabDragStart(event,\''+f.id+'\')" ondragover="moduleTabDragOver(event)"'+
      ' ondrop="moduleTabDrop(event,\''+f.id+'\')" ondragend="moduleTabDragEnd()">'+
      moduleIcon(f.kind)+'<span class="sp-tabname">'+esc(f.name)+'</span>'+
      '<i class="sp-tabx" title="移出这一份" onclick="event.stopPropagation();moduleCloseOne(\''+f.id+'\')">✕</i></span>';
  }).join('');
  return '<div class="sp-tabs" id="spTabs">'+tabs+'</div>';
}
/* ---- 标签页：拖动换顺序 + 横向放不下时自动压缩名字（全称 → … → 两个字） ---- */
var moduleTabDragId=null;
function moduleTabDragStart(e, id){
  moduleTabDragId=id;
  if(e && e.dataTransfer){
    e.dataTransfer.effectAllowed='move';
    try{ e.dataTransfer.setData('text/plain', id); }catch(err){}
  }
  var el=e && e.currentTarget;
  if(el) try{ el.classList.add('dragging'); }catch(err){}
}
function moduleTabDragOver(e){
  if(!moduleTabDragId) return;
  if(e && e.preventDefault) e.preventDefault();
  var el=e && e.currentTarget; if(!el) return;
  var after=false;
  try{
    var r=el.getBoundingClientRect();
    after=(e.clientX - r.left) > r.width/2;
  }catch(err){}
  var all=$('spTabs') ? $('spTabs').querySelectorAll('.sp-tab') : [];
  for(var i=0;i<all.length;i++) all[i].classList.remove('dropbefore','dropafter');
  el.classList.add(after?'dropafter':'dropbefore');
}
function moduleTabDrop(e, targetId){
  if(e && e.preventDefault) e.preventDefault();
  var after=false;
  var el=e && e.currentTarget;
  if(el){
    try{ var r=el.getBoundingClientRect(); after=(e.clientX - r.left) > r.width/2; }catch(err){}
  }
  var dragId=moduleTabDragId;
  moduleTabDragEnd();
  if(!dragId || dragId===targetId) return;
  moduleReorder(dragId, targetId, after);
}
function moduleTabDragEnd(){
  moduleTabDragId=null;
  var tabs=$('spTabs'); if(!tabs) return;
  var all=tabs.querySelectorAll('.sp-tab');
  for(var i=0;i<all.length;i++) all[i].classList.remove('dragging','dropbefore','dropafter');
}
/* 把 id 这份挪到 targetId 前面（after=false）或后面（after=true），顺序存进浏览器 */
function moduleReorder(dragId, targetId, after){
  var from=-1;
  moduleFiles.forEach(function(f,i){ if(f.id===dragId) from=i; });
  if(from<0) return;
  var item=moduleFiles.splice(from,1)[0];
  var to=-1;
  moduleFiles.forEach(function(f,i){ if(f.id===targetId) to=i; });
  if(to<0) moduleFiles.push(item);
  else moduleFiles.splice(after?to+1:to, 0, item);
  moduleSaveStore(); renderSidePane();
}
/* 一行放不下时按「平分到的宽度」裁每个标签的名字；放得下就恢复全称 */
function moduleFitTabs(){
  var tabs=$('spTabs'); if(!tabs) return;
  var list=[].slice.call(tabs.querySelectorAll('.sp-tab'));
  if(!list.length) return;
  var avail=tabs.clientWidth;
  if(!avail) return;
  var names=list.map(function(t){ return t.querySelector('.sp-tabname'); });
  names.forEach(function(n){ if(n) n.style.maxWidth='none'; });          /* 先量自然宽度 */
  var need=0, chrome=[];
  list.forEach(function(t,i){
    need+=t.offsetWidth;
    chrome.push(t.offsetWidth-(names[i]?names[i].offsetWidth:0));
  });
  var pad=20, gap=4;
  if(need<=avail-pad){                                                   /* 放得下：显示全称 */
    names.forEach(function(n){ if(n) n.style.maxWidth=''; });
    return;
  }
  var budget=Math.floor((avail-pad-gap*(list.length-1))/list.length);
  var MIN=34;                                                            /* 最少也留两个字的位置 */
  list.forEach(function(t,i){
    if(!names[i]) return;
    names[i].style.maxWidth=Math.max(MIN, budget-chrome[i])+'px';
  });
}
function moduleBodyHTML(m){
  if(!m){
    var wide=(function(){ try{ return (window.innerWidth||1200)>900; }catch(e){ return true; } })();
    var tip=wide ? '把模组拖进来，或点「⬆ 添加文件 / 📁 文件夹」'
                 : '点上面「⬆ 添加文件」选模组（可以一次选好几个）';
    return '<div class="sp-empty">'+
      '<p><b>'+tip+'</b></p>'+
      '<p class="hint">支持 <b>PDF</b>、<b>Word（.docx）</b>、<b>图片</b>（png / jpg / gif / webp…）、<b>txt / md</b>；'+
      '多文件模组可以一次全加进来，上面会出一排标签页换着看，不用来回换。</p>'+
      '<p class="hint">PDF 用浏览器自带的阅读器（可缩放、可搜）；Word 直接排成网页看（有自己的搜索高亮）；'+
      '图片点一下可以切「适应窗口 / 原始大小」。</p>'+
      '<p class="hint">文件只存在你自己的浏览器里，刷新后还在，不上传任何服务器。'+
      (wide?'想左右调宽度：拖中间那条细线，双击回到一半一半。':'手机上这一栏会铺满整屏，看完点右上角 ✕ 收起。')+'</p></div>';
  }
  var bar='<div class="sp-filebar"><span class="sp-fname" title="'+esc(m.name)+'">'+moduleIcon(m.kind)+' '+esc(m.name)+'</span>';
  if(m.kind==='pdf'){
    if(!m.url) return moduleLostHTML(m);
    return bar+'<span class="hint">'+moduleSizeText(m.size)+'</span></div>'+
      '<div class="pdfv-bar">'+pdfControlsHTML('<button class="small ghost" style="margin-left:auto" onclick="pdfOpenInTab()" title="在新标签页用系统的阅读器打开">↗ 新窗口</button>')+'</div>'+
      '<div class="pdfv-host" id="spPdfHost" title="模组 PDF"></div>';
  }
  if(m.kind==='image'){
    if(!m.url) return moduleLostHTML(m);
    return bar+'<span class="hint">'+moduleSizeText(m.size)+' · 图片，点图切「适应窗口 / 原始大小」</span></div>'+
      '<div class="sp-doc sp-imgdoc" id="spImgDoc"><img class="sp-img" src="'+esc(m.url)+'" alt="'+esc(m.name)+'" onclick="moduleZoomImg()"></div>';
  }
  if(m.kind==='docx'||m.kind==='text'){
    var inner=(m.kind==='docx')?moduleDocxHTML(m.text):('<pre class="sp-pre">'+esc(m.text)+'</pre>');
    return bar+moduleFindBarHTML()+
      '<span class="row" style="gap:4px"><button class="small ghost" onclick="moduleFont(-1)">A－</button>'+
      '<button class="small ghost" onclick="moduleFont(1)">A＋</button></span></div>'+
      '<div class="sp-doc" id="spDoc">'+inner+'</div>';
  }
  return bar+'<span class="hint">'+moduleSizeText(m.size)+'</span></div>'+
    '<div class="sp-empty"><p><b>这份文件的格式现在看不了</b></p>'+
    '<p class="hint">只支持 PDF / Word（.docx）/ 图片 / txt·md。'+
    '老格式（.doc、.rtf、.pptx 等）请先用 Word / WPS 另存为 <b>PDF</b> 或 <b>docx</b>，再拖进来。</p></div>';
}
function moduleLostHTML(m){
  return '<div class="sp-filebar"><span class="sp-fname" title="'+esc(m.name)+'">'+moduleIcon(m.kind)+' '+esc(m.name)+'</span></div>'+
    '<div class="sp-empty"><p><b>这份文件读不到了</b></p>'+
    '<p class="hint">浏览器只把文件存在本机，可能被清掉了；重新拖一次同名文件就会补上。'+
    '（也可以点标签上的 ✕ 把它移出列表。）</p></div>';
}
function moduleZoomImg(){
  var box=$('spImgDoc'); if(!box) return;
  box.classList.toggle('zoom');
}
function moduleScrollActiveTab(){
  var tabs=$('spTabs'); if(!tabs) return;
  var on=tabs.querySelector('.sp-tab.on'); if(!on || !on.scrollIntoView) return;
  try{ on.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(e){}
}
/* ---- Word / 文本模组：搜索 + 高亮 + 上/下一条跳转 ---- */
function moduleFindBarHTML(){
  return '<span class="row sp-find"><input type="text" id="modSearch" placeholder="在模组里搜索（回车）"'+
    ' onkeydown="if(event.key===\'Enter\')moduleFind()">'+
    '<button class="small" onclick="moduleFind()" title="搜索并高亮">🔍</button>'+
    '<button class="small ghost" onclick="moduleFindStep(-1)" title="上一处">↑</button>'+
    '<button class="small ghost" onclick="moduleFindStep(1)" title="下一处">↓</button>'+
    '<span class="hint" id="modFindInfo"></span></span>';
}
var modHits=[], modHitIdx=-1;
function moduleSetFindInfo(t){ var el=$('modFindInfo'); if(el) el.textContent=t||''; }
function moduleClearHits(){
  var doc=$('spDoc'); if(!doc){ modHits=[]; modHitIdx=-1; return; }
  var marks=doc.querySelectorAll('mark.sp-hit');
  for(var i=0;i<marks.length;i++){
    var m=marks[i], p=m.parentNode;
    if(!p) continue;
    p.replaceChild(document.createTextNode(m.textContent), m);
    if(p.normalize) p.normalize();
  }
  modHits=[]; modHitIdx=-1;
  moduleSetFindInfo('');
}
function moduleFind(){
  var doc=$('spDoc'); if(!doc) return;
  var inp=$('modSearch'); var q=((inp&&inp.value)||'').trim();
  moduleClearHits();
  if(!q) return;
  var walker=document.createTreeWalker(doc, (window.NodeFilter&&window.NodeFilter.SHOW_TEXT)||4, null);
  var nodes=[], n;
  while((n=walker.nextNode())){ if(n.nodeValue && n.nodeValue.trim()) nodes.push(n); }
  var lower=q.toLowerCase();
  nodes.forEach(function(node){
    var txt=node.nodeValue||''; var low=txt.toLowerCase();
    if(low.indexOf(lower)<0) return;
    var frag=document.createDocumentFragment(), pos=0, idx;
    while((idx=low.indexOf(lower,pos))>=0){
      if(idx>pos) frag.appendChild(document.createTextNode(txt.slice(pos,idx)));
      var mk=document.createElement('mark');
      mk.className='sp-hit'; mk.textContent=txt.slice(idx, idx+q.length);
      frag.appendChild(mk); modHits.push(mk);
      pos=idx+q.length;
    }
    if(pos<txt.length) frag.appendChild(document.createTextNode(txt.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  });
  if(!modHits.length){ moduleSetFindInfo('没找到「'+q+'」'); return; }
  modHitIdx=-1; moduleFindStep(1);
}
function moduleFindStep(d){
  if(!modHits.length){ moduleFind(); return; }
  if(modHitIdx<0) modHitIdx=(d<0?0:0);
  else modHitIdx=(modHitIdx+d+modHits.length)%modHits.length;
  for(var i=0;i<modHits.length;i++) modHits[i].classList.toggle('on', i===modHitIdx);
  var m=modHits[modHitIdx];
  if(m && m.scrollIntoView){ try{ m.scrollIntoView({block:'center'}); }catch(e){ try{ m.scrollIntoView(); }catch(e2){} } }
  moduleSetFindInfo((modHitIdx+1)+' / '+modHits.length);
}
function moduleFont(d){
  var el=$('spDoc'); if(!el) return;
  var cur=parseFloat(el.dataset.fs||'14')+d;
  cur=Math.max(11, Math.min(24, cur));
  el.dataset.fs=cur; el.style.fontSize=cur+'px';
}
/* ---------- 拖放：文件 / 整个文件夹拖到窗口里任何地方都收（在模组栏里打开，不跳新标签页） ----------
   要点：dragover 与 drop 都必须 preventDefault，否则浏览器会按默认动作处理 ——
   PDF / 图片会跳到一个新标签页、docx 会静默下载（用户反馈过这个）。 */
var CARD_FILE_RE=/\.(xlsx|xls)$/i;
function moduleDragHasFiles(e){
  var dt=e.dataTransfer; if(!dt) return false;
  var types=dt.types;
  if(types && types.length){ for(var i=0;i<types.length;i++) if(types[i]==='Files') return true; }
  return !!(dt.files && dt.files.length);
}
function moduleDragNames(dt){
  var fs=(dt&&dt.files)?[].slice.call(dt.files):[];
  return fs.map(function(f){ return String((f&&f.name)||''); }).filter(Boolean);
}
/* 这串是不是「给模组栏的」：模组能看的格式算我们的；人物卡 .xlsx 不算（那是左边导入框的活） */
function moduleDragIsOurs(dt){
  var names=moduleDragNames(dt);
  if(!names.length) return true;                                   /* 读不到名字（多半是文件夹）→ 按我们的处理 */
  if(names.every(function(n){ return CARD_FILE_RE.test(n); })) return false;  /* 人物卡 .xlsx 归左边导入框 */
  /* 其余一律接住：认不出的格式也给出「另存为 PDF」的提示，好过浏览器跳新标签页 / 静默下载 */
  return true;
}
function moduleDragHint(on){
  /* 拖着的时候把右半屏里的 PDF / 图片的点击穿透关掉：
     不然「拖到窗口里任何地方」在正文正好是 PDF 时会落进阅读器里，我们收不到 drop。 */
  try{ document.body.classList[on?'add':'remove']('spfiledrag'); }catch(e){}
  var el=$('spDragHint');
  if(on){
    if(!el){
      el=document.createElement('div');
      el.id='spDragHint'; el.className='sp-draghint';
      el.textContent='松手就把这些文件放进「📖 模组」';
      document.body.appendChild(el);
    }
    el.classList.add('on');
  } else if(el) el.classList.remove('on');
}
function openModulePane(){
  var c=sidePaneCfg();
  if(c.open && c.kind==='module') return;
  c.open=true; c.kind='module';
  saveStateQuiet(); applySidePane(); renderNav();
}
/* 真正处理一次拖入：这里必须 preventDefault，不然浏览器会自己去开新标签页 / 下载 */
function moduleHandleFileDrop(e){
  var dt=e.dataTransfer;
  if(e.preventDefault) e.preventDefault();
  if(e.stopPropagation) e.stopPropagation();
  moduleDragHint(false);
  var z=$('spDrop'); if(z) z.classList.remove('on');
  if(!dt) return;
  openModulePane();
  moduleDropLoad(dt, function(n){
    if(n) toast(n>1?('已加入 '+n+' 个文件'):'模组已载入');
    else toast('没读到文件（可能是空的文件夹或这个格式不支持）');
  });
}
function moduleBindDrop(){
  var z=$('spDrop');
  if(z && !z.dataset.bound){
    z.dataset.bound='1';
    ['dragenter','dragover'].forEach(function(ev){
      z.addEventListener(ev, function(e){ if(moduleDragHasFiles(e)){ e.preventDefault(); z.classList.add('on'); moduleDragHint(true); } });
    });
    z.addEventListener('dragleave', function(){ z.classList.remove('on'); });
    z.addEventListener('drop', function(e){ moduleHandleFileDrop(e); });
  }
  moduleBindWindowDrop();
}
/* 整个窗口都是拖入区：拖到左半边 / 顶栏也算，免得浏览器跳走 */
function moduleBindWindowDrop(){
  if(document.__spWinDrop) return;
  document.__spWinDrop=1;
  var over=function(e){
    if(!moduleDragHasFiles(e) || !moduleDragIsOurs(e.dataTransfer)) return;
    e.preventDefault();
    if(e.dataTransfer) try{ e.dataTransfer.dropEffect='copy'; }catch(err){}
    moduleDragHint(true);
  };
  document.addEventListener('dragenter', over, true);
  document.addEventListener('dragover', over, true);
  document.addEventListener('dragleave', function(e){
    if(e.target===document.documentElement || e.target===document.body || !e.relatedTarget) moduleDragHint(false);
  }, true);
  /* drop 用冒泡：页面里别的拖入区（人物卡 .xlsx）先跑，它 preventDefault 过就不抢 */
  document.addEventListener('drop', function(e){
    moduleDragHint(false);
    if(!moduleDragHasFiles(e) || e.defaultPrevented) return;
    if(!moduleDragIsOurs(e.dataTransfer)) return;
    moduleHandleFileDrop(e);
  });
  document.addEventListener('dragend', function(){ moduleDragHint(false); }, true);
  window.addEventListener('blur', function(){ moduleDragHint(false); });
}

/* ---- .docx → HTML：docx 就是个 zip，自己解压 + 自己排版 ----
   不依赖浏览器的 DecompressionStream（老 Safari / 某些内核没有它，会直接打不开），
   内置一个纯 JS 的 raw-deflate 解码器，任何浏览器都能用。
   正文里的图片（word/media/*）也一起抽出来内联成 data: URL，模组里的地图 / 立绘不会丢。 */
var LBASE=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
var LEXT=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
var DBASE=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
var DEXT=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
var CLORDER=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
/* raw deflate（无 zlib 头）解压 */
function inflateRaw(input){
  var ip=0, bitbuf=0, bitcnt=0, op=0;
  var out=new Uint8Array(Math.max(1024, (input.length||1)*5));
  function room(n){ if(op+n<=out.length) return; var cap=out.length; while(cap<op+n) cap*=2; var t=new Uint8Array(cap); t.set(out.subarray(0,op)); out=t; }
  function bits(n){
    var v=0, i=0;
    while(i<n){
      if(bitcnt===0){ if(ip>=input.length) throw new Error('压缩数据不完整'); bitbuf=input[ip++]; bitcnt=8; }
      var take=Math.min(n-i,bitcnt);
      v |= (bitbuf & ((1<<take)-1)) << i;
      bitbuf >>>= take; bitcnt -= take; i += take;
    }
    return v;
  }
  function build(lengths,n){
    var counts=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], i;
    for(i=0;i<n;i++) counts[lengths[i]]++;
    counts[0]=0;
    var offs=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    for(i=1;i<16;i++) offs[i]=offs[i-1]+counts[i-1];
    var syms=new Array(n);
    for(i=0;i<n;i++) if(lengths[i]) syms[offs[lengths[i]]++]=i;
    return {counts:counts, syms:syms};
  }
  function decode(h){
    var code=0, first=0, index=0;
    for(var len=1; len<16; len++){
      code |= bits(1);
      var count=h.counts[len];
      if(code-first<count) return h.syms[index+(code-first)];
      index+=count; first=(first+count)<<1; code<<=1;
    }
    throw new Error('压缩数据里有坏码');
  }
  function copy(len,dist){
    if(dist>op) throw new Error('压缩数据越界');
    room(len);
    for(var i=0;i<len;i++){ out[op]=out[op-dist]; op++; }
  }
  var fixedL=null, fixedD=null;
  for(;;){
    var last=bits(1), type=bits(2);
    if(type===0){                                  // 不压缩块
      bitcnt=0;                                    // 丢掉当前字节里剩下的位（已读进 bitbuf，不能再前进 ip）
      var len0=input[ip]|(input[ip+1]<<8); ip+=4;
      room(len0); out.set(input.subarray(ip,ip+len0), op); op+=len0; ip+=len0;
    } else {
      var hlit, hdist, lh, dh;
      if(type===1){
        if(!fixedL){
          var fl=[], fd=[], k;
          for(k=0;k<144;k++) fl.push(8);
          for(;k<256;k++) fl.push(9);
          for(;k<280;k++) fl.push(7);
          for(;k<288;k++) fl.push(8);
          for(k=0;k<30;k++) fd.push(5);
          fixedL=build(fl,288); fixedD=build(fd,30);
        }
        lh=fixedL; dh=fixedD;
      } else if(type===2){
        hlit=bits(5)+257; hdist=bits(5)+1;
        var hclen=bits(4)+4, cl=new Array(19).fill(0);
        for(var ci=0;ci<hclen;ci++) cl[CLORDER[ci]]=bits(3);
        var clh=build(cl,19);
        var lens=[], n2=hlit+hdist;
        while(lens.length<n2){
          var sym=decode(clh), rep=0, val=0;
          if(sym<16) lens.push(sym);
          else if(sym===16){ rep=bits(2)+3; val=lens[lens.length-1]; }
          else if(sym===17){ rep=bits(3)+3; val=0; }
          else { rep=bits(7)+11; val=0; }
          while(rep--) lens.push(val);
        }
        var ll=lens.slice(0,hlit), dl=lens.slice(hlit);
        lh=build(ll,hlit); dh=build(dl,hdist);
      } else throw new Error('压缩数据格式不对');
      for(;;){
        var s=decode(lh);
        if(s<256){ room(1); out[op++]=s; }
        else if(s===256) break;
        else {
          var le=s-257; if(le>=LBASE.length) throw new Error('压缩数据里的长度码越界');
          var length=LBASE[le]+bits(LEXT[le]);
          var ds=decode(dh);
          copy(length, DBASE[ds]+bits(DEXT[ds]));
        }
      }
    }
    if(last) break;
  }
  return out.subarray(0,op);
}
/* ---- zip（docx）读取 ---- */
function zipCentral(buf){
  var dv=new DataView(buf), eocd=-1;
  for(var i=buf.byteLength-22; i>=0 && i>buf.byteLength-22-65557; i--){
    if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  }
  if(eocd<0) throw new Error('不是有效的 .docx（找不到 ZIP 结尾）');
  var count=dv.getUint16(eocd+10,true), p=dv.getUint32(eocd+16,true), entries={};
  for(var k=0;k<count;k++){
    if(p+46>buf.byteLength || dv.getUint32(p,true)!==0x02014b50) break;
    var nlen=dv.getUint16(p+28,true), elen=dv.getUint16(p+30,true), clen=dv.getUint16(p+32,true);
    var name=new TextDecoder('utf-8').decode(new Uint8Array(buf,p+46,nlen));
    entries[name]={method:dv.getUint16(p+10,true), csize:dv.getUint32(p+20,true), offset:dv.getUint32(p+42,true)};
    p+=46+nlen+elen+clen;
  }
  return entries;
}
function zipReadEntry(buf, e){
  var dv=new DataView(buf);
  var start=e.offset+30+dv.getUint16(e.offset+26,true)+dv.getUint16(e.offset+28,true);
  var raw=new Uint8Array(buf, start, e.csize);
  return e.method===0 ? raw : inflateRaw(raw);
}
/* 兼容旧调用：取单个条目 */
function zipEntryBytes(buf, want){
  var entries=zipCentral(buf), e=entries[want];
  if(!e) return null;
  try{ return {method:e.method, bytes:zipReadEntry(buf,e)}; }catch(err){ return null; }
}
/* 字节 → base64（图片内联用；分块避免超长参数） */
function bytesToB64(u8){
  var s='';
  for(var i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null, u8.subarray(i, i+0x8000));
  return btoa(s);
}
function docxPartPath(t){
  t=String(t||'');
  if(t.charAt(0)==='/') return t.slice(1);
  var parts=t.split('/');
  while(parts.length && parts[0]==='..') parts.shift();
  if(parts[0]==='word') return parts.join('/');
  return 'word/'+parts.join('/');
}
var DOCX_MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',
  webp:'image/webp',tif:'image/tiff',tiff:'image/tiff',emf:'image/emf',wmf:'image/wmf',svg:'image/svg+xml'};
function docxRelMap(xml){
  var map={}, re=/<Relationship\b[^>]*\/?>/g, m;
  while((m=re.exec(xml))){
    var id=/Id="([^"]*)"/.exec(m[0]), tgt=/Target="([^"]*)"/.exec(m[0]);
    if(id && tgt && !/\/$/.test(tgt[1])) map[id[1]]=docxPartPath(tgt[1]);
  }
  return map;
}
function docxToHTML(buf){
  /* 调用方通常给 ArrayBuffer；万一给的是 Uint8Array（测试 / 别的入口）也照样能用 */
  if(typeof ArrayBuffer!=='undefined' && ArrayBuffer.isView && ArrayBuffer.isView(buf))
    buf=buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength);
  var W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var A='http://schemas.openxmlformats.org/drawingml/2006/main';
  var R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  var entries;
  try{ entries=zipCentral(buf); }catch(e){ throw new Error(e.message||'不是有效的 .docx 文件'); }
  if(!entries['word/document.xml']) throw new Error('这个 .docx 里找不到正文（可能是 .doc 老格式或加密文件）');
  var xml=new TextDecoder('utf-8').decode(zipReadEntry(buf, entries['word/document.xml']));
  var rels={};
  if(entries['word/_rels/document.xml.rels']){
    try{ rels=docxRelMap(new TextDecoder('utf-8').decode(zipReadEntry(buf, entries['word/_rels/document.xml.rels']))); }catch(e){ rels={}; }
  }
  var imgCache={};
  function imgSrc(rid){
    if(!rid) return '';
    if(imgCache[rid]!==undefined) return imgCache[rid];
    var part=rels[rid];
    var url='';
    if(part && entries[part]){
      try{
        var ext=(part.split('.').pop()||'').toLowerCase();
        url='data:'+(DOCX_MIME[ext]||'application/octet-stream')+';base64,'+bytesToB64(zipReadEntry(buf, entries[part]));
      }catch(e){ url=''; }
    }
    imgCache[rid]=url;
    return url;
  }
  var doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('这个 .docx 的正文解析失败');
  var node=doc.documentElement;
  var problems=(node.getElementsByTagNameNS ? node.getElementsByTagNameNS('*','p') : null);

  function attr(el, ns, name){ return el.getAttributeNS(ns, name) || el.getAttribute('w:'+name) || ''; }
  function first(el, ns, name){
    var l=el.getElementsByTagNameNS(ns,name);
    return l && l.length ? l[0] : null;
  }
  function runHTML(r){
    var W2=W, t='';
    var kids=r.childNodes;
    for(var i=0;i<kids.length;i++){
      var n=kids[i];
      if(n.namespaceURI!==W2){ continue; }
      if(n.localName==='t') t+=(n.textContent||'');
      else if(n.localName==='tab') t+='\u00a0\u00a0\u00a0\u00a0';
      else if(n.localName==='br') t+= (attr(n,W2,'type')==='page' ? '\u0000' : '\n');
      else if(n.localName==='noBreakHyphen') t+='-';
      else if(n.localName==='drawing' || n.localName==='pict' || n.localName==='object'){
        var blip=first(n,A,'blip') || first(n,'urn:schemas-microsoft-com:vml','imagedata');
        var rid=blip ? (blip.getAttributeNS(R,'embed')||blip.getAttribute('r:embed')||blip.getAttributeNS(R,'id')||blip.getAttribute('r:id')) : '';
        var src=imgSrc(rid);
        if(!src) continue;
        var w=0, ext=first(n,'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','extent');
        if(ext){ w=Math.round((parseInt(ext.getAttribute('cx'),10)||0)/9525); }
        t+='\u0001'+src+'\u0001'+(w||'')+'\u0001';
      }
    }
    if(!t) return '';
    var html='';
    var chunks=t.replace(/\u0000/g,'\u0000').split(/(\u0001[^\u0001]*\u0001[^\u0001]*\u0001)/);
    for(var c=0;c<chunks.length;c++){
      var ck=chunks[c];
      if(ck.charAt(0)==='\u0001'){
        var p2=ck.split('\u0001');
        var wpx=parseInt(p2[2],10);
        html+='<img class="sp-img" src="'+p2[1]+'"'+(wpx?' style="width:'+Math.min(wpx,860)+'px"':'')+' alt="">';
        continue;
      }
      if(!ck) continue;
      var parts=ck.split('\u0000');
      for(var q=0;q<parts.length;q++){
        if(q>0) html+='<hr class="sp-pb">';
        html+=esc(parts[q]).replace(/\n/g,'<br>');
      }
    }
    if(!html) return '';
    var props=(r.getElementsByTagNameNS(W2,'rPr')[0])||null;
    var style='', open='', close='';
    if(props){
      if(first(props,W2,'b')) open+='<b>', close='</b>';
      if(first(props,W2,'i')) open+='<i>', close='</i>';
      if(first(props,W2,'u')) open+='<u>', close+='</u>';
      if(first(props,W2,'strike')||first(props,W2,'dstrike')) open+='<s>', close+='</s>';
      var col=first(props,W2,'color');
      if(col){ var cv=col.getAttributeNS(W2,'val')||col.getAttribute('w:val'); if(cv && cv!=='auto' && /^[0-9A-Fa-f]{6}$/.test(cv)) style+='color:#'+cv+';'; }
      var sz=first(props,W2,'sz');
      if(sz){ var sv=parseInt(sz.getAttributeNS(W2,'val')||sz.getAttribute('w:val'),10); if(sv) style+='font-size:'+(sv/2)+'pt;'; }
      var hl=first(props,W2,'highlight');
      if(hl){ var hv=hl.getAttributeNS(W2,'val')||hl.getAttribute('w:val'); if(hv && hv!=='none') style+='background:'+hv+';'; }
      var va=first(props,W2,'vertAlign');
      if(va){ var vv=va.getAttributeNS(W2,'val')||va.getAttribute('w:val'); if(vv==='superscript') open+='<sup>', close='</sup>'; if(vv==='subscript') open+='<sub>', close+='</sub>'; }
    }
    return '<span'+(style?' style="'+style+'"':'')+'>'+open+html+close+'</span>';
  }
  function paraHTML(p){
    var inner='';
    var runs=p.getElementsByTagNameNS(W,'r');
    for(var i=0;i<runs.length;i++) inner+=runHTML(runs[i]);
    var style='', jc='', ind='';
    var ps=first(p,W,'pStyle');
    if(ps) style=ps.getAttributeNS(W,'val')||ps.getAttribute('w:val')||'';
    var j=first(p,W,'jc'); if(j) jc=(j.getAttributeNS(W,'val')||j.getAttribute('w:val')||'');
    var ppr=first(p,W,'pPr');
    if(ppr){ var nu=first(ppr,W,'numPr'); if(nu) inner='<span class="sp-bullet">•</span>'+inner;
      var pInd=first(ppr,W,'ind');
      if(pInd){ var fl=pInd.getAttributeNS(W,'firstLine')||pInd.getAttribute('w:firstLine')||pInd.getAttributeNS(W,'left')||pInd.getAttribute('w:left')||'';
        var flv=parseInt(fl,10); if(flv) ind='padding-left:'+Math.min(Math.round(flv/15),120)+'px;'; }
    }
    var extra=(jc?'text-align:'+(jc==='both'?'justify':jc)+';':'')+ind;
    var hm=/^Heading\s*([1-6])$/i.exec(style) || /^([1-6])$/.exec(style);
    var tag = /^Title$/i.test(style) ? 'h1' : (hm ? 'h'+hm[1] : 'p');
    var cls = tag==='p' ? 'sp-p' : 'sp-h';
    if(!inner.replace(/<[^>]*>/g,'').trim() && !/<img|<hr/.test(inner)) return '<p class="sp-p sp-gap"></p>';
    return '<'+tag+' class="'+cls+'"'+(extra?' style="'+extra+'"':'')+'>'+inner+'</'+tag+'>';
  }
  function tableHTML(tbl){
    var html='<div class="sp-tblwrap"><table class="sp-tbl">';
    var rows=tbl.getElementsByTagNameNS(W,'tr');
    for(var r=0;r<rows.length;r++){
      var isHead = !!first(rows[r],W,'tblHeader');
      html+= isHead ? '<thead><tr>' : '<tr>';
      var cells=rows[r].getElementsByTagNameNS(W,'tc');
      for(var c=0;c<cells.length;c++){
        var span=first(cells[c],W,'gridSpan');
        var cs=span ? (parseInt(span.getAttributeNS(W,'val')||span.getAttribute('w:val'),10)||1) : 1;
        var inner='';
        var ps=cells[c].getElementsByTagNameNS(W,'p');
        for(var k=0;k<ps.length;k++) inner+=paraHTML(ps[k]);
        var vm=first(cells[c],W,'vMerge');
        var tag = isHead ? 'th' : 'td';
        var more = cs>1 ? ' colspan="'+cs+'"' : '';
        html+='<'+tag+more+' class="sp-td'+(vm?' sp-vm':'')+'">'+inner+'</'+tag+'>';
      }
      html+= isHead ? '</tr></thead>' : '</tr>';
    }
    return html+'</table></div>';
  }
  var out=[];
  function walk(node, inTable){
    var kids=node.childNodes;
    for(var i=0;i<kids.length;i++){
      var n=kids[i];
      if(n.nodeType!==1) continue;
      if(n.namespaceURI!==W) continue;
      if(n.localName==='p') out.push(paraHTML(n));
      else if(n.localName==='tbl') out.push(tableHTML(n));
      else if(n.localName==='sdt'){ var c2=n.getElementsByTagNameNS(W,'sdtContent')[0]; if(c2) walk(c2); }
      else if(n.localName==='sectPr'){ /* 节属性，不渲染 */ }
      else walk(n);
    }
  }
  var body=null;
  for(var i=0;i<node.childNodes.length;i++) if(node.childNodes[i].localName==='body'){ body=node.childNodes[i]; break; }
  walk(body||node);
  var html=out.join('\n');
  if(!html.trim()) html='<p class="hint">（这个文档没读到正文文字，可能内容都在文本框/图片里）</p>';
  return html;
}
function moduleDocxHTML(text){
  /* text 里存的是已经排好的 HTML（docx 解析在 loadModuleFile 里做），
     万一存的是解析失败提示，就直接显示。 */
  return text || '<p class="hint">（空文档）</p>';
}

/* ================= 📚 规则书 ================= */
var rulebookData=null, rulebookLoading=false, rulebookPage=1, rulebookHits=null, rulebookQuery='';
function ensureRulebook(cb, fail){
  if(window.__COC_RULEBOOK){ rulebookData=window.__COC_RULEBOOK; cb(rulebookData); return; }
  if(rulebookData){ cb(rulebookData); return; }
  if(rulebookLoading){ window.__cocRbQueue.push(cb); return; }
  rulebookLoading=true;
  window.__cocRbQueue=[cb];
  var url=window.__COC_RULEBOOK_URL;
  if(!url){ if(fail) fail(new Error('规则书数据缺失（请用 offline.html 或重新构建）')); return; }
  var done=function(){
    rulebookLoading=false;
    rulebookData=window.__COC_RULEBOOK||null;
    var q=window.__cocRbQueue||[]; window.__cocRbQueue=[];
    if(rulebookData) q.forEach(function(f){ f(rulebookData); });
    else if(fail) fail(new Error('规则书数据加载失败'));
  };
  var s=document.createElement('script');
  s.src=url; s.onload=done; s.onerror=function(){ rulebookLoading=false; if(fail) fail(new Error('规则书数据加载失败（在线版需能访问 '+url+'）')); };
  document.head.appendChild(s);
}
function rbPageCount(){ return rulebookData ? (rulebookData.pages||[]).length : 0; }
/* 规则书正文用原版 PDF 显示 —— 表格、颜色、流程图、排版全都跟纸书一致。
   我们自己的那套文本数据只用来做目录与全文检索（点一下命中页 → PDF 跳到那一页）。
   离线单文件版把 PDF 内联成 base64，打开时解成 Blob URL 再交给阅读器；
   解不了 Blob（个别环境没有 URL.createObjectURL）就退回 data: URL，照样能显示；
   在线版直接用仓库里的 assets/rulebook/coc7.pdf。
   至于「翻页 / 缩放」：浏览器自带的 iframe 阅读器在手机、平板上既不听 #page= 也没缩放按钮，
   所以正文交给 src/33-pdf-viewer.js 的自带阅读器画（电脑手机同一套操作）。 */
var rulebookPdfUrl=null;
function rulebookPdf(){
  if(rulebookPdfUrl!==null) return rulebookPdfUrl;
  var b64=window.__COC_RULEBOOK_PDF_B64;
  if(b64){
    var blobUrl='';
    try{
      if(typeof Blob==='function' && typeof URL!=='undefined' && URL.createObjectURL)
        blobUrl=URL.createObjectURL(new Blob([b64ToBytes(b64)],{type:'application/pdf'}));
    }catch(e){ blobUrl=''; }
    rulebookPdfUrl=blobUrl||('data:application/pdf;base64,'+b64);
  } else if(window.__COC_RULEBOOK_PDF_URL){
    rulebookPdfUrl=window.__COC_RULEBOOK_PDF_URL;
  } else rulebookPdfUrl='';
  return rulebookPdfUrl;
}
/* PDF 直链（#page= 只给「↗ 新窗口」用；面板里的翻页由自带阅读器负责） */
function rbFrameSrc(p){
  var base=rulebookPdf(); if(!base) return '';
  return base+'#page='+(p||rulebookPage||1);
}
function renderRulebookPane(pane){
  pane.innerHTML='<div class="sp-head"><b>📚 规则书</b>'+
    '<div class="row sp-tools">'+
      '<button class="small ghost" id="rbTocBtn" onclick="rbToggleToc()" title="展开/收起左侧目录与搜索">☰ 收起目录</button>'+
      '<button class="ghost small" onclick="closeSidePane()" title="收起右半屏">✕</button>'+
    '</div></div>'+
    '<div class="sp-body rb-wrap" id="rbWrap">'+
      '<div class="rb-side" id="rbSide">'+
        '<div class="rb-searchrow"><input type="text" id="rbSearch" placeholder="搜索全书（回车）" onkeydown="if(event.key===\'Enter\')rbSearch()">'+
        '<button class="small" onclick="rbSearch()">🔍</button></div>'+
        '<div class="rb-toc" id="rbToc"></div>'+
        '<div class="rb-hits" id="rbHits" hidden></div>'+
      '</div>'+
      '<div class="rb-main">'+
        '<div class="rb-bar">'+
          pdfControlsHTML('<button class="small ghost" style="margin-left:auto" onclick="rbOpenTab()" title="在新标签页打开原版 PDF">↗ 新窗口</button>')+
        '</div>'+
        '<div class="pdfv-host" id="rbFrame" title="COC7th 核心规则书"></div>'+
      '</div>'+
    '</div>';
  rbApplyToc();
  ensureRulebook(function(){
    rbRenderToc();
    rbMountPdf();
    pdfSyncBar();
  }, function(err){
    var f=$('rbFrame');
    if(f) f.outerHTML='<div class="sp-empty"><p><b>规则书没能加载</b></p><p class="hint">'+esc(err.message)+'</p></div>';
  });
}
/* 把原版 PDF 交给自带阅读器（翻页 / 缩放 / 双指捏合都在它身上） */
function rbMountPdf(){
  var host=$('rbFrame'); if(!host) return;
  var src=rulebookPdf();
  if(!src){
    host.innerHTML='<div class="sp-empty"><p><b>找不到规则书 PDF</b></p><p class="hint">离线版请用重新构建后的 offline.html；在线版需要能访问 assets/rulebook/coc7.pdf。</p></div>';
    return;
  }
  pdfMountPdf(host, src, {
    page: rulebookPage,
    onPage: function(n){
      rulebookPage=n;
      rbSyncToc();
      var mx=$('pdfPageMax'); if(mx) mx.textContent=rbPageCount();
    }
  });
}
function rbOpenTab(){
  var base=rulebookPdf(); if(!base){ toast('规则书 PDF 还没加载好'); return; }
  pdfOpenInTab(base, rulebookPage);
}
/* 目录/搜索面板可收起（记在本机），按钮文字跟着状态走，一眼能看出是开还是关。 */
function rbTocHidden(){
  if(!state) return false;
  if(!state.ui) state.ui={};
  return !!state.ui.rbTocHide;
}
function rbTocBtnLabel(){
  return rbTocHidden() ? '☰ 展开目录' : '☰ 收起目录';
}
function rbApplyToc(){
  var el=$('rbSide'); if(!el) return;
  el.classList.toggle('hide', rbTocHidden());
  var b=$('rbTocBtn'); if(b) b.textContent=rbTocBtnLabel();
}
function rbToggleToc(){
  if(!state) return;
  if(!state.ui) state.ui={};
  state.ui.rbTocHide=!rbTocHidden();
  saveStateQuiet();
  rbApplyToc();
}
function rbZoomBy(d){
  pdfZoomBy(d);                 /* 老按钮 / 老习惯还能用；真正干活的是自带阅读器 */
}
function rbRenderToc(){
  var box=$('rbToc'); if(!box) return;
  var toc=(rulebookData&&rulebookData.toc)||[];
  box.innerHTML=toc.map(function(t,i){
    return '<div class="rb-tocitem lv'+t[0]+'" data-i="'+i+'" onclick="rbGoto('+t[2]+')" title="第 '+t[2]+' 页">'+esc(t[1])+'</div>';
  }).join('') || '<div class="hint" style="padding:8px">这本书没有内置书签目录，用上面的搜索定位。</div>';
  box.hidden=false;
  var hits=$('rbHits'); if(hits) hits.hidden=true;
}
function rbTocIndexForPage(p){
  var toc=(rulebookData&&rulebookData.toc)||[], best=-1;
  for(var i=0;i<toc.length;i++) if(toc[i][2]<=p) best=i;
  return best;
}
/* 左侧目录里把「当前页所属的那一条」高亮 */
function rbSyncToc(){
  var side=$('rbSide'); if(!side) return;
  var items=side.querySelectorAll('.rb-tocitem');
  for(var i=0;i<items.length;i++) items[i].classList.toggle('on', +items[i].dataset.i===rbTocIndexForPage(rulebookPage));
}
/* 跳页：点目录 / 搜索命中 / 手工输页码都走这里（自带阅读器翻页，目录高亮由 onPage 回调同步） */
function rbGoto(p){
  var n=rbPageCount()||1;
  rulebookPage=Math.max(1,Math.min(n, p|0 || 1));
  if(pdfState.doc) pdfGoPage(rulebookPage);
  else rbSyncToc();
  var inp=$('pdfPageInput'); if(inp) inp.value=rulebookPage;
}
/* 全文搜索：命中页列在左侧，点一条 → PDF 跳到那一页（搜索词在左侧上下文里能直接看到） */
function rbSearch(){
  if(!rulebookData) return;
  var inp=$('rbSearch'); if(!inp) return;
  var q=(inp.value||'').trim();
  rulebookQuery=q;
  var toc=$('rbToc'), box=$('rbHits');
  if(!q){ if(toc) toc.hidden=false; if(box){ box.hidden=true; box.innerHTML=''; } rbGoto(rulebookPage); return; }
  var hits=[], pages=rulebookData.pages||[], lower=q.toLowerCase();
  for(var i=0;i<pages.length;i++){
    var txt=(pages[i]||[]).join('\n');
    var idx=txt.toLowerCase().indexOf(lower);
    if(idx>=0){
      var from=Math.max(0, idx-24);
      hits.push({p:i+1, ctx:(from>0?'…':'')+txt.slice(from, idx+q.length+40).replace(/\n/g,' ')+'…'});
    }
    if(hits.length>=400) break;
  }
  rulebookHits=hits;
  if(toc) toc.hidden=true;
  if(!box) return;
  box.hidden=false;
  box.innerHTML='<div class="rb-hithead"><button class="small ghost" onclick="rbRenderToc()">‹ 目录</button> 「'+esc(q)+'」命中 '+hits.length+' 页'+
    (hits.length>=400?'（只显示前 400 页）':'')+'</div>'+
    (hits.length ? hits.map(function(h){
      return '<div class="rb-hit" onclick="rbGoto('+h.p+')" title="跳到第 '+h.p+' 页">'+
        '<b>第 '+h.p+' 页</b><span>'+esc(h.ctx)+'</span></div>';
    }).join('') : '<div class="hint" style="padding:10px">没找到，换个词试试（比如「侦查」「理智」「战斗」）。</div>');
  box.scrollTop=0;
}
