/* ================= 地图·战斗场景全屏 + 调查员便签标签 ================= */
'use strict';

/* ---------- 场景全屏（地图 / 战斗） ----------
   全屏后右下角只留图标菜单：📋 调查员 / 👤 NPC 与敌人 / 🗺️ 地图路线 / ⚔️ 战斗 /
   📜 剧本·笔记 / 🎲 骰子 / ↩ 返回。调查员·NPC·笔记·骰子 这四个是“悬浮半个屏幕”
   的浮层（互斥，只能开一个），地图·战斗 则是在全屏里切换场景。 */
var fsScene=null;          // 'map' | 'combat' | null
var fsPanelName=null;      // 全屏浮层：'surveyors' | 'npcs'
var fsMapPrevZoom=null;    // 退出全屏时恢复原缩放
var _fsResizeTimer=null;

function fsActive(){ return !!fsScene; }
function fsPanelActive(name){ return fsPanelName===name; }

function renderFsNav(){
  var el=$('fsNav'); if(!el) return;
  if(!fsScene){ el.hidden=true; el.innerHTML=''; return; }
  var items=[
    ['📋','调查员','pc'],['👤','NPC 与敌人','npc'],['🗺️','地图路线','map'],
    ['⚔️','战斗','combat'],['📜','剧本/笔记','script'],['🎲','骰子','dice']
  ];
  var html=items.map(function(it){
    var on=false;
    if(it[2]==='map') on=(fsScene==='map');
    else if(it[2]==='combat') on=(fsScene==='combat');
    else if(it[2]==='pc') on=(fsPanelName==='surveyors');
    else if(it[2]==='npc') on=(fsPanelName==='npcs');
    else on=(openFloatPanel===it[2]);
    return '<button class="fsnavbtn'+(on?' on':'')+'" title="'+esc(it[1])+'" aria-label="'+esc(it[1])+'" onclick="fsNavGo(\''+it[2]+'\')">'+it[0]+'</button>';
  }).join('');
  html+='<button class="fsnavbtn fsback" title="返回（退出全屏）" aria-label="返回" onclick="exitSceneFs()">↩</button>';
  el.innerHTML=html; el.hidden=false;
}
function fsNavGo(kind){
  if(!fsScene) return;
  if(kind==='map'){ if(!(state.maps||[]).length){ toast('还没有地图，先新建一张'); return; } switchSceneFs('map'); return; }
  if(kind==='combat'){ switchSceneFs('combat'); return; }
  if(kind==='script'||kind==='dice'){ toggleFloat(kind); return; }
  if(kind==='pc'){ toggleFsPanel('surveyors'); return; }
  if(kind==='npc'){ toggleFsPanel('npcs'); return; }
}
function switchSceneFs(kind){
  if(kind!=='map'&&kind!=='combat') return;
  fsScene=kind;
  document.body.classList.toggle('fs-map', kind==='map');
  document.body.classList.toggle('fs-combat', kind==='combat');
  try{ switchTab(kind==='map'?'maps':'combat'); }catch(e){}
  syncFsButtons();
  renderFsNav();
  scheduleFsResize();
}
function syncFsButtons(){
  var mb=$('mapFsBtn');
  if(mb) mb.textContent=(fsScene==='map')?'⇱ 退出全屏':'⛶ 全屏';
  var cb=$('combatFsBtn');
  if(cb) cb.textContent=(fsScene==='combat')?'⇱ 退出全屏':'⛶ 全屏';
}
function scheduleFsResize(){
  window.setTimeout(function(){ try{ fsResize(); }catch(e){} }, 30);
  window.setTimeout(function(){ try{ fsResize(); }catch(e){} }, 140);
}
function toggleSceneFs(kind){
  if(fsScene===kind){ exitSceneFs(); return; }
  if(kind==='map'){
    var m=currentMap(); if(!m){ toast('请先新建 / 选择一张地图'); return; }
    fsMapPrevZoom=(m.zoom!=null?m.zoom:mapZoom)||1;
  }
  switchSceneFs(kind);
  toast(kind==='map'?'已全屏显示地图：右下角图标菜单可操作，↩ 返回退出':'已全屏显示战斗场景：点角色右侧出现详情，↩ 返回退出');
}
function exitSceneFs(){
  fsScene=null;
  document.body.classList.remove('fs-map','fs-combat');
  fsClosePanel();
  if(fsMapPrevZoom!=null){
    var m=currentMap(); if(m){ m.zoom=fsMapPrevZoom; saveStateQuiet(); }
    fsMapPrevZoom=null;
  }
  renderFsNav();
  window.setTimeout(function(){
    try{ if(typeof drawMapCanvas==='function'){ drawMapCanvas(); applyZoomLabel(); } }catch(e){}
    try{ if(typeof drawBattleScene==='function') drawBattleScene(); }catch(e){}
    try{
      var fp=$('floatPanel'); if(fp){ fp.style.width=''; fp.style.maxWidth=''; }
      var fh=$('fsFloatHost'); if(fh){ fh.style.width=''; fh.style.maxWidth=''; }
      if(openFloatPanel && typeof positionFloatPanel==='function') positionFloatPanel();
    }catch(e){}
    syncFsButtons();
  }, 30);
}
function fsResize(){
  if(fsScene==='map'){
    var wr=$('mapWrap'), m=currentMap();
    if(wr && m){
      var boxW=Math.max(200, wr.clientWidth-4), boxH=Math.max(160, wr.clientHeight-4);
      var L=mapLogicalSize(m);
      var z=Math.min(boxW/L.w, boxH/L.h);
      z=Math.max(0.3, Math.min(3, z));
      mapZoom=z; m.zoom=z; saveStateQuiet();
      applyZoomLabel(); drawMapCanvas();
    }
  } else if(fsScene==='combat'){
    if(typeof drawBattleScene==='function') drawBattleScene();
  }
}
/* ---------- 全屏浮层：把「调查员 / NPC」整页内容搬进带统一头部的浮层 ---------- */
function fsPanelHost(){
  var h=$('fsFloatHost');
  if(!h){
    h=document.createElement('div');
    h.id='fsFloatHost'; h.className='floatpanel fsfloat';
    h.hidden=true;
    document.body.appendChild(h);
  }
  return h;
}
function fsPanelSection(name){
  return $(name==='surveyors'?'tab-surveyors':'tab-npcs');
}
/* 页签原本的“家”：现在它们在 main > .splitwrap > .splitLeft 里。
   全屏浮层会把整页搬来搬去，最后要放回这个容器，否则会破坏左右分栏。 */
function tabHome(){ return $('splitLeft') || document.querySelector('main'); }
function buildFsHost(name){
  var h=fsPanelHost();
  /* 先把旧内容里的整页 section 放回 main，避免被 innerHTML 清掉 */
  var back=$('tab-surveyors'), back2=$('tab-npcs'), main=tabHome();
  if(main){ [back,back2].forEach(function(s){ if(s && s.parentElement!==main) main.appendChild(s); }); }
  h.innerHTML='';
  var head=document.createElement('div');
  head.className='floathead';
  head.innerHTML='<b>'+(name==='surveyors'?'📋 调查员库':'👤 NPC 与敌人')+'</b>'
    +'<span class="hint">悬浮在全屏场景上，功能与整页一致</span>'
    +'<button class="small ghost" style="margin-left:auto" onclick="fsClosePanel();renderFsNav()">收起 ✕</button>';
  var body=document.createElement('div');
  body.className='floatbody';
  h.appendChild(head); h.appendChild(body);
  h.hidden=false;
  return body;
}
function toggleFsPanel(name){
  if(fsPanelName===name){ fsClosePanel(); renderFsNav(); return; }
  if(openFloatPanel) closeFloatPanel();      // 与剧本/骰子互斥
  fsPanelName=name;
  var body=buildFsHost(name);
  var sec=fsPanelSection(name);
  if(sec) body.appendChild(sec);
  document.body.classList.remove('fsfloat-surveyors','fsfloat-npcs');
  document.body.classList.add(name==='surveyors'?'fsfloat-surveyors':'fsfloat-npcs');
  var side=document.querySelector('.srvside'); if(side) side.classList.remove('fsopen');
  try{ if(name==='surveyors') renderSurveyors(); else renderNpcs(); }catch(e){}
  attachFloatResize(fsPanelHost());
  renderFsNav();
}
function fsClosePanel(){
  var name=fsPanelName;
  fsPanelName=null;
  document.body.classList.remove('fsfloat-surveyors','fsfloat-npcs');
  var main=tabHome();
  if(main){
    ['tab-surveyors','tab-npcs'].forEach(function(id){
      var s=$(id);
      if(s && s.parentElement!==main) main.appendChild(s);
    });
  }
  var h=$('fsFloatHost');
  if(h){ h.hidden=true; h.style.width=''; h.style.maxWidth=''; h.innerHTML=''; }
}
/* 拖动浮层右边框调宽度（全屏下四个悬浮面板都能调） */
function attachFloatResize(panel){
  if(!panel || panel.querySelector('.fsresize')) return;
  var grip=document.createElement('span');
  grip.className='fsresize';
  grip.title='拖动调整宽度';
  panel.appendChild(grip);
}
function initFloatResizeDrag(){
  if(document.__cocResizeBound) return;
  document.__cocResizeBound=1;
  document.addEventListener('pointerdown', function(e){
    var grip=e.target && e.target.closest ? e.target.closest('.fsresize') : null;
    if(!grip) return;
    var panel=grip.closest('.floatpanel');
    if(!panel) return;
    e.preventDefault();
    try{ grip.setPointerCapture(e.pointerId); }catch(err){}
    var startX=e.clientX, startW=panel.getBoundingClientRect().width;
    function mv(ev){
      var w=Math.max(300, Math.min((window.innerWidth||1200)-20, startW+(ev.clientX-startX)));
      panel.style.width=w+'px'; panel.style.maxWidth='none';
    }
    function up(){ document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); }
    document.addEventListener('pointermove',mv);
    document.addEventListener('pointerup',up);
  });
}
/* 全屏调查员面板里的标签栏：折叠在最上面，点标题展开/收起 */
function toggleTagSide(){
  var el=document.querySelector('.srvside');
  var inFloat = el && el.closest && el.closest('#fsFloatHost');
  if(inFloat){ if(el) el.classList.toggle('fsopen'); return; }
  if(typeof toggleSrvPanel==='function') toggleSrvPanel('tag');
}

/* ---------- 调查员便签标签（最多 6 个/卡，可自定义颜色、可跨卡移动） ---------- */
var TAG_COLORS=['#e3c47f','#8fd69b','#7fc0ea','#e08f8f','#cdb6ee','#f0a868','#6fdcd0','#d78fd1'];
var tagLibSel=null;     // 标签库里选中的标签 id：点小卡即可贴上
var tagMoving=null;     // 卡上便签的“待移动”状态：{aid,tagId}

function defaultPcTags(){
  return [
    {id:uid('tag'),name:'主线',color:'#e3c47f'},
    {id:uid('tag'),name:'支线',color:'#7fc0ea'},
    {id:uid('tag'),name:'已调查',color:'#8fd69b'},
    {id:uid('tag'),name:'需注意',color:'#e08f8f'}
  ];
}
function pcTagLib(){
  if(!state) return [];
  if(!state.ui) state.ui={};
  if(!Array.isArray(state.ui.pcTags)) state.ui.pcTags=defaultPcTags();
  return state.ui.pcTags;
}
function tagLimitStr(s){ return Array.prototype.slice.call(String(s==null?'':s)).slice(0,6).join(''); }
function tagLimitStrLoose(s){ return String(s==null?'':s); }
/* 便签底色深浅自动配文字色，保证任何颜色都看得清 */
function tagFg(hex){
  var c=(typeof hexToRgb==='function')?hexToRgb(hex):{r:227,g:196,b:127};
  var lum=(0.299*c.r+0.587*c.g+0.114*c.b)/255;
  return lum>0.6?'#17120a':'#fdfaf1';
}
function findLibTag(id){ return pcTagLib().filter(function(t){return t.id===id;})[0]||null; }
function actorTags(a){ if(!a) return []; if(!Array.isArray(a.tags)) a.tags=[]; return a.tags; }
function tagOnActor(a,libId){ return (a&&a.tags||[]).some(function(x){return x.libId===libId||x.id===libId;}); }

function renderTagLib(){
  var box=$('tagLib'); if(!box) return;
  var list=pcTagLib();
  if(!list.length){ box.innerHTML='<div class="hint">还没有标签，输入名字后点 ＋ 新建（支持 emoji，可自定义颜色）。</div>'; return; }
  box.innerHTML=list.map(function(t){
    var on=(tagLibSel===t.id)?' on':'';
    var n=state.actors.filter(function(a){return tagOnActor(a,t.id);}).length;
    return '<div class="tagpill'+on+'" draggable="true" data-tagid="'+esc(t.id)+'"'
      +' onclick="tagPillClick(this)" ondragstart="tagLibDragStart(event)"'
      +' title="点一下选中它，再点调查员小卡即可贴上；也可直接拖到小卡上">'
      +'<span class="tagdot" style="background:'+esc(t.color||'#e3c47f')+'"></span>'
      +'<span class="tagname">'+esc(t.name)+'</span>'
      +'<span class="tagcnt">'+n+'</span>'
      +'<input type="color" class="tagcolor" value="'+esc(t.color||'#e3c47f')+'" onclick="event.stopPropagation()" onchange="tagLibRecolor(\''+t.id+'\',this.value)" title="改这个标签的颜色">'
      +'<button class="tagx" title="从标签库删除（小卡上也会移除）" onclick="event.stopPropagation();tagLibDelete(\''+t.id+'\')">✕</button>'
      +'</div>';
  }).join('');
}
function addTagLib(){
  var inp=$('tagNameInput'); if(!inp) return;
  var name=tagLimitStrLoose(inp.value).trim();
  if(!name){ toast('先输入标签名'); return; }
  if(pcTagLib().length>=24){ toast('标签太多了（最多 24 个）'); return; }
  if(pcTagLib().some(function(t){return t.name===name;})){ toast('已经有同名标签了'); return; }
  var colorEl=$('tagColorInput');
  var color=(colorEl&&colorEl.value)||TAG_COLORS[pcTagLib().length%TAG_COLORS.length];
  pcTagLib().push({id:uid('tag'),name:name,color:color});
  inp.value='';
  saveStateQuiet(); renderTagLib();
  toast('已新建标签「'+name+'」');
}
function tagLibRecolor(id,val){
  var t=findLibTag(id); if(!t) return;
  t.color=val||'#e3c47f';
  state.actors.forEach(function(a){ (a.tags||[]).forEach(function(x){ if(x.libId===id||x.id===id) x.color=t.color; }); });
  saveStateQuiet(); renderTagLib();
  if(state.activeTab==='surveyors') renderSurveyors(); else if(typeof fsPanelActive==='function'&&fsPanelActive('surveyors')) renderSurveyors();
}
function tagLibDelete(id){
  var t=findLibTag(id); if(!t) return;
  if(!confirmBox('删除标签「'+t.name+'」？所有小卡上的该标签也会一并移除。')) return;
  state.ui.pcTags=pcTagLib().filter(function(x){return x.id!==id;});
  state.actors.forEach(function(a){ if(a.tags) a.tags=a.tags.filter(function(x){return !(x.libId===id||x.id===id);}); });
  if(tagLibSel===id) tagLibSel=null;
  saveStateQuiet();
  renderTagLib();
  if(typeof renderSurveyors==='function') renderSurveyors();
}
function setTagLibSel(id){
  tagLibSel=(tagLibSel===id)?null:id;
  tagMoving=null;
  renderTagLib();
  var box=$('pcList'); if(box) box.classList.toggle('tagmode', !!tagLibSel);
  if(tagLibSel) toast('已选中标签「'+(findLibTag(id)||{}).name+'」：点一张调查员小卡即可贴上');
}
/* 点一下标签库里的便签：选中它，之后点任意调查员小卡即可贴上 */
function tagPillClick(el){
  if(!el) return;
  var id=(el.dataset&&el.dataset.tagid)||el.getAttribute('data-tagid');
  if(id) setTagLibSel(id);
}
function attachTagToActor(aid,libId){
  var a=actorById(aid); if(!a) return false;
  var t=findLibTag(libId); if(!t){ toast('标签已不存在'); return false; }
  var tags=actorTags(a);
  if(tagOnActor(a,libId)){ toast('「'+t.name+'」已经在这张卡上了'); return false; }
  if(tags.length>=6){ toast('每张小卡最多 6 个标签'); return false; }
  tags.push({id:uid('ct'),libId:libId,name:t.name,color:t.color});
  saveState(); renderSurveyors();
  toast('已贴上「'+t.name+'」');
  return true;
}
function removeTagFromActor(aid,tagId){
  var a=actorById(aid); if(!a||!Array.isArray(a.tags)) return;
  a.tags=a.tags.filter(function(x){return x.id!==tagId;});
  if(tagMoving&&tagMoving.aid===aid&&tagMoving.tagId===tagId) tagMoving=null;
  saveState(); renderSurveyors();
}
function moveTagToActor(fromAid,tagId,toAid){
  if(fromAid===toAid) return;
  var from=actorById(fromAid), to=actorById(toAid);
  if(!from||!to) return;
  var tag=(from.tags||[]).filter(function(x){return x.id===tagId;})[0]; if(!tag) return;
  if(tagOnActor(to,tag.libId)){ toast('「'+to.name+'」已经有这个标签了'); return; }
  if((to.tags||[]).length>=6){ toast('「'+to.name+'」的标签已满（最多 6 个）'); return; }
  from.tags=(from.tags||[]).filter(function(x){return x.id!==tagId;});
  to.tags=to.tags||[]; to.tags.push(tag);
  saveState(); renderSurveyors();
  toast('便签「'+tag.name+'」已移到「'+to.name+'」');
}
function tagLibDragStart(ev){
  try{ ev.dataTransfer.setData('text/plain','taglib:'+ev.currentTarget.dataset.tagid); ev.dataTransfer.effectAllowed='copy'; }catch(e){}
}
function tagCardDragStart(ev,aid,tagId){
  try{ ev.dataTransfer.setData('text/plain','tagmove:'+aid+':'+tagId); ev.dataTransfer.effectAllowed='move'; }catch(e){}
  try{ ev.stopPropagation(); }catch(e){}
}
function tagCardDrop(ev,aid){
  ev.preventDefault();
  var data='';
  try{ data=ev.dataTransfer.getData('text/plain')||''; }catch(e){}
  if(data.indexOf('taglib:')===0){ attachTagToActor(aid,data.slice(7)); return; }
  if(data.indexOf('tagmove:')===0){
    var parts=data.slice(8).split(':');
    if(parts.length>=2) moveTagToActor(parts[0],parts[1],aid);
  }
}
function tagChipClick(aid,tagId){
  if(tagMoving){
    var mv=tagMoving; tagMoving=null;
    if(mv.aid===aid){ renderSurveyors(); return; }
    moveTagToActor(mv.aid,mv.tagId,aid);
    return;
  }
  tagMoving={aid:aid,tagId:tagId};
  renderSurveyors();
  toast('已拿起便签：再点另一张调查员小卡即可移过去');
}
/* 标签交互（一次性绑定，用捕获阶段优先于卡片上的按钮） */
(function initTagGlobal(){
  if(document.__cocTagBound) return;
  document.__cocTagBound=1;
  document.addEventListener('click', function(e){
    if(!e.target||!e.target.closest) return;
    var chip=e.target.closest('#pcList .pctag[data-tagid]');
    if(chip){
      e.preventDefault(); e.stopPropagation();
      if(e.target.closest('.pctagx')) removeTagFromActor(chip.dataset.aid, chip.dataset.tagid);
      else tagChipClick(chip.dataset.aid, chip.dataset.tagid);
      return;
    }
    var card=e.target.closest('#pcList .pccard');
    if(!card) return;
    if(e.target.closest('.pcav,.pcbtns,button,input,select,textarea,label,a')) return;
    if(tagMoving){
      var mv=tagMoving; tagMoving=null;
      if(mv.aid===card.dataset.id){ renderSurveyors(); return; }
      e.preventDefault(); e.stopPropagation();
      moveTagToActor(mv.aid,mv.tagId,card.dataset.id);
      return;
    }
    if(tagLibSel){
      e.preventDefault(); e.stopPropagation();
      attachTagToActor(card.dataset.id,tagLibSel);
    }
  }, true);
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape') return;
    if(tagMoving){ tagMoving=null; renderSurveyors(); return; }
    if(fsScene) exitSceneFs();
  });
  initFloatResizeDrag();
  window.addEventListener('resize', function(){
    if(_fsResizeTimer) window.clearTimeout(_fsResizeTimer);
    _fsResizeTimer=window.setTimeout(function(){
      if(fsScene) fsResize();
      else if(state && state.activeTab==='combat' && typeof drawBattleScene==='function'){ try{ drawBattleScene(); }catch(e){} }
    }, 160);
  });
})();
