/* ---------- 收尾：初始化 v2 ---------- */
function deleteSelectedObj(){
  var m=currentMap();
  if(!mapSel || mapSel.type==='none' || mapSel.idx<0 || !m) return;
  if(mapSel.type==='point'){ delPoint(mapSel.idx); return; }
  if(mapSel.type==='prop' && m.props){ m.props.splice(mapSel.idx,1); }
  if(mapSel.type==='token' && m.tokens){ m.tokens.splice(mapSel.idx,1); }
  mapSel={type:'none',idx:-1};
  saveState(); renderMapActorsBox(); renderMapsShell();
}
function delVehicle(i){
  state.vehicles.splice(i,1); saveState(); renderMapVehicles();
  if($('routeCard')) renderRoutePanel();
}

function bindPointer(target){
  if(!target) return;
  ['pointerdown','pointermove','pointerup','pointercancel','pointerleave'].forEach(function(t){
    target.addEventListener(t,function(ev){
      if(t==='pointerdown') onCanvasDown(ev);
      else if(t==='pointermove') onCanvasMove(ev);
      else onCanvasUp();
    });
  });
}
function bindCanvasEvents(){
  var cv=$('mapCanvas'), wr=$('mapWrap');
  if(cv && wr){
    bindPointer(wr);
    cv.addEventListener('click',onCanvasClick);
  } else if(cv){
    bindPointer(cv);
    cv.addEventListener('click',onCanvasClick);
  }
  bindBattleCanvas();
}
function initApp(){
  scaffoldSections();
  ensureV2Data();
  bindDropZone();
  renderNav();
  bindCanvasEvents();
  initSidePane();
  restoreModuleFromStore();
  if(typeof mapPodsInit==='function') mapPodsInit();
  if(typeof combatPodsInit==='function') combatPodsInit();
  switchTab('surveyors');
  /* 背景色 / 装饰都依赖 state，统一在这里跟着初始化走一遍（挂在 document 上的启动钩子会早于这里） */
  if(typeof applyUiBg==='function'){ try{ applyUiBg(); }catch(e){} }
  if(typeof decorEnsureDefault==='function'){ try{ decorEnsureDefault(); }catch(e){} }
  if(typeof applyDecorState==='function'){ try{ applyDecorState(); }catch(e){} }
  maybeShowWelcome();
  window.setTimeout(function(){ logRoll('🔧 已就绪。首次使用已预置示例 NPC 与示例地图（可删）。','info'); },60);
}
/* 骰子日志补丁：类名渲染修正（v2 无独立骰子页，保留战斗日志） */
function quickDice(expr){ var r=rollExpr(expr); logRoll('🎲 '+expr+' = '+r.total, 'gold'); }

/* ================= v3 增量：法术库 / NPC 分组小卡 / 多地图缩放与素材 / 战斗场景 / 剧本·骰子 ================= */
'use strict';
