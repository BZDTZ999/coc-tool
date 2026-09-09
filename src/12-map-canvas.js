/* ---------- 地图画布：地点/道路/角色/摆件 ---------- */
var mapDrag=null;
var mapDragMoved=false;
var mapPanStart=null;
function findMapHit(ev, includeTokens){
  var m=currentMap(); if(!m) return null;
  var p=mapCanvasPos(ev);
  var best=null,bd=1e9;
  function tryHit(d,type,idx){ if(d<18&&d<bd){bd=d;best={type:type,idx:idx};} }
  (m.points||[]).forEach(function(pt,i){ tryHit(Math.hypot(pt.x-p.x,pt.y-p.y),'point',i); });
  if(includeTokens!==false) (m.tokens||[]).forEach(function(t,i){ var a=actorById(t.actorId); if(a) tryHit(Math.hypot(t.x-p.x,t.y-p.y)-6,'token',i); });
  (m.props||[]).forEach(function(pr,i){ tryHit(Math.hypot(pr.x-p.x,pr.y-p.y),'prop',i); });
  return best;
}

function overlayMap(g,m){
  // 伪3D地面
  if(m.iso){
    g.save();
    g.globalAlpha=0.5;
    g.strokeStyle='rgba(227,196,127,.30)';
    g.lineWidth=1;
    var step=52;
    for(var i=0;i<MAP_W/step+MAP_H/step;i++){
      g.beginPath();
      g.moveTo(0+(i%4)*0,i*step); g.lineTo(MAP_W,i*step/2+ (i%2?MAP_H/2:0));
      g.stroke();
    }
    // 简化的菱形网格
    g.globalAlpha=0.22;
    g.strokeStyle='#e3c47f';
    for(var dx=-MAP_W; dx<=MAP_W*2; dx+=step*2){
      for(var dy=0; dy<MAP_H*2; dy+=step*2){}
    }
    // 简单水平基线
    for(var yy=0; yy<=MAP_H; yy+=step*2){
      g.beginPath(); g.moveTo(0,yy); g.lineTo(MAP_W,yy); g.stroke();
    }
    g.restore();
  }
  // 道路
  m.legs.forEach(function(leg,i){
    var A=m.points[leg.a],B=m.points[leg.b];
    if(!A||!B) return;
    var hot=routeSel.pathLegs&&routeSel.pathLegs.indexOf(leg.id)>=0;
    g.beginPath(); g.moveTo(A.x,A.y); g.lineTo(B.x,B.y);
    g.strokeStyle=hot?'#e3c47f':'rgba(180,196,230,.35)';
    g.lineWidth=hot?4.5:2; g.stroke();
    var mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
    var nm=String(leg.name||'').trim();
    if(nm){ plateText(g,nm,mx,my-10,'bold 12px "PingFang SC",sans-serif',hot); }
    else if(leg.dist){ plateText(g,leg.dist+' km',mx,my-10,'11px Menlo,monospace'); }
  });
  // 摆件：阴影 + emoji 图标 或 自定义图片素材
  (m.props||[]).forEach(function(pr,i){
    g.beginPath(); g.ellipse(pr.x,pr.y+10,9*pr.scale,4,0,0,Math.PI*2); g.fillStyle='rgba(0,0,0,.35)'; g.fill();
    if(pr.img){
      var im=_propImgCache[pr.img];
      if(!im){ im=new Image(); im.onload=function(){ drawMapCanvas(); }; im.src=pr.img; _propImgCache[pr.img]=im; }
      if(im.complete){
        var pw=34*pr.scale;
        var ph=im.naturalHeight&&im.naturalWidth?(pw*im.naturalHeight/im.naturalWidth):pw;
        try{ g.drawImage(im,pr.x-pw/2,pr.y-ph+10,pw,ph); }catch(e){}
      } else { g.font=(22*pr.scale)+'px serif'; g.textAlign='center'; g.fillText('🖼',pr.x,pr.y+8*pr.scale); }
    } else {
      g.font=(22*pr.scale)+'px serif';
      g.textAlign='center';
      g.fillText(pr.icon,pr.x,pr.y+8*pr.scale);
    }
    if(mapSel&&mapSel.type==='prop'&&mapSel.idx===i){
      g.strokeStyle='#e3c47f'; g.lineWidth=2;
      g.beginPath(); g.arc(pr.x,pr.y-4,18,0,Math.PI*2); g.stroke();
    }
  });
  // 地点
  (m.points||[]).forEach(function(pt,i){
    var selected=mapSel&&mapSel.type==='point'&&mapSel.idx===i;
    g.beginPath(); g.arc(pt.x,pt.y,selected?10:8,0,Math.PI*2);
    g.fillStyle=selected?'#e3c47f':'#c9a25e'; g.fill();
    g.lineWidth=selected?3:1.5; g.strokeStyle='#1b1f2a'; g.stroke();
    if(pt.icon){ g.font='15px serif'; g.textAlign='center'; g.fillText(pt.icon,pt.x-8,pt.y-13); }
    plateText(g,String(pt.name||'').slice(0,16),pt.x,pt.y+28,'bold 14px "PingFang SC",sans-serif',selected);
  });
  // 地图角色
  (m.tokens||[]).forEach(function(t,i){
    var a=actorById(t.actorId); if(!a) return;
    var sel=mapSel&&mapSel.type==='token'&&mapSel.idx===i;
    drawAvatarOnCanvas(g,t.x,t.y,17,a);
    plateText(g,String(a.name||'').slice(0,10),t.x,t.y+34,'11px "PingFang SC",sans-serif',sel);
    var veh=(state.vehicles||[]).filter(function(v){return v.assign===a.id;})[0];
    if(veh){ g.fillStyle='rgba(143,214,155,.9)'; g.textAlign='center'; g.fillText('🚗',t.x+18,t.y-12); }
    if(sel){ g.strokeStyle='#e3c47f'; g.lineWidth=2; g.beginPath(); g.arc(t.x,t.y,22,0,Math.PI*2); g.stroke(); }
  });
  g.textAlign='left';
}
/* 地图元素名牌：黑底白字（可读性强，不再被底图吃掉） */
function roundRectPath(g,x,y,w,h,r){
  g.beginPath(); g.moveTo(x+r,y);
  g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
}
function plateText(g,text,cx,cy,fontStr,highlight){
  if(!text) return;
  g.font=fontStr||'bold 13px "PingFang SC",sans-serif';
  g.textAlign='center'; g.textBaseline='middle';
  var w=g.measureText(text).width+12;
  var fs=12; var mm=(fontStr||'').match(/([\d.]+)px/); if(mm) fs=parseFloat(mm[1]);
  var h=fs+8; var x=cx-w/2; var top=cy-h/2;
  g.fillStyle=highlight?'rgba(227,196,127,.85)':'rgba(0,0,0,.72)';
  roundRectPath(g,x,top,w,h,4); g.fill();
  g.fillStyle='#fff'; g.fillText(text,cx,cy);
  g.textBaseline='alphabetic';
}
var _avatarImgCache={};
function drawAvatarOnCanvas(g,x,y,r,a){
  g.save();
  g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.clip();
  var custom=a&&a.avatar&&a.avatar.custom;
  if(custom){
    var img=_avatarImgCache[custom];
    if(!img){ img=new Image(); img.onload=function(){ drawMapCanvas(); if(typeof drawBattleScene==='function') drawBattleScene(); }; img.src=custom; _avatarImgCache[custom]=img; }
    if(img.complete){ try{ g.drawImage(img,x-r,y-r,r*2,r*2); }catch(e){ fallbackAvatar(g,x,y,r,a); } }
    else fallbackAvatar(g,x,y,r,a);
  } else fallbackAvatar(g,x,y,r,a);
  g.restore();
  g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.lineWidth=1.5; g.strokeStyle='#c9a25e'; g.stroke();
  g.restore();
}
function cssVarOr(name,fb){ try{ var v=getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v||fb; }catch(e){ return fb; } }
function fallbackAvatar(g,x,y,r,a){
  g.fillStyle=cssVarOr('--uic-d','#2c3346'); g.fillRect(x-r,y-r,r*2,r*2);
  g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fillStyle=cssVarOr('--uic-a','#3a4256'); g.fill();
  var emoji=(a&&a.avatar&&a.avatar.preset)||(a&&a.kind==='npc'?'🧟':AVATAR_DEFAULT_PC);
  g.font=r*1.2+'px serif'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText(emoji,x,y+1);
  g.textBaseline='alphabetic';
}
/* 选中/拖拽（优先角色与摆件） */
function onCanvasDown(ev){
  mapDragMoved=false;
  if(mapTool!=='select') return;
  var hit=findMapHit(ev,true);
  if(hit){ mapSel=hit; mapDrag=hit; }
  else {
    mapSel={type:'none',idx:-1}; mapDrag=null;
    var wr=$('mapWrap');
    if(wr && (wr.scrollWidth>wr.clientWidth || wr.scrollHeight>wr.clientHeight)){
      mapPanStart={x:ev.clientX,y:ev.clientY,sl:wr.scrollLeft,st:wr.scrollTop,moved:false};
      var cv=$('mapCanvas'); if(cv) cv.style.cursor='grabbing';
      try{ ev.preventDefault(); }catch(e){}
    } else mapPanStart=null;
  }
  drawMapCanvas();
}
function onCanvasMove(ev){
  if(mapPanStart){
    var dx=ev.clientX-mapPanStart.x, dy=ev.clientY-mapPanStart.y;
    if(Math.abs(dx)+Math.abs(dy)>3){ mapPanStart.moved=true; mapDragMoved=true; }
    if(mapPanStart.moved){
      var wr=$('mapWrap'); if(wr){
        wr.scrollLeft=mapPanStart.sl-dx;
        wr.scrollTop=mapPanStart.st-dy;
      }
      try{ ev.preventDefault(); }catch(e){}
    }
    return;
  }
  if(!mapDrag) return;
  var m=currentMap(); if(!m) return;
  var p=mapCanvasPos(ev);
  var list = mapDrag.type==='point'?m.points:mapDrag.type==='token'?(m.tokens||[]):(m.props||[]);
  var o=list[mapDrag.idx]; if(!o) return;
  var nx=Math.max(10,Math.min(MAP_W-10,p.x)), ny=Math.max(10,Math.min(MAP_H-10,p.y));
  if(Math.abs(nx-o.x)+Math.abs(ny-o.y)>2) mapDragMoved=true;
  o.x=nx; o.y=ny;
  drawMapCanvas();
}
function onCanvasUp(){
  if(mapPanStart){
    mapPanStart=null;
    var cv=$('mapCanvas'); if(cv) cv.style.cursor=(mapTool==='add')?'crosshair':'grab';
    saveStateQuiet();
    return;
  }
  mapDrag=null; saveStateQuiet(); drawMapCanvas();
}
function onCanvasClick(ev){
  if(mapDragMoved){ mapDragMoved=false; return; }
  if(mapTool==='add'){
    var m=currentMap(); if(!m) return;
    var p=mapCanvasPos(ev);
    var nm=prompt('地点名称：','地点'+(m.points.length+1));
    if(nm===null) return;
    m.points.push({id:uid('p'),name:nm||'地点',icon:'📍',desc:'',x:p.x,y:p.y});
    saveState(); drawMapCanvas(); renderMapLists(); renderRoutePanel();
  } else {
    var hit=findMapHit(ev,true);
    if(hit) mapSel=hit; else mapSel={type:'none',idx:-1};
    drawMapCanvas();
  }
}
function clearSelection(){ mapSel={type:'none',idx:-1}; drawMapCanvas(); }
function setMapTool(t){
  mapTool=t; mapSel={type:'none',idx:-1};
  document.querySelectorAll('#mapTools button').forEach(function(b){ b.classList.toggle('active', b.id==='mt-'+t); });
  var cv=$('mapCanvas'); if(cv) cv.style.cursor=(t==='add')?'crosshair':'grab';
  drawMapCanvas();
}

function actorById(id){ return state.actors.filter(function(a){return a.id===id;})[0]||null; }

/* ================= 战斗场景 ================= */
var B_W=940, B_H=500;
function battleCtx(){ var cv=$('battleCanvas'); return cv?cv.getContext('2d'):null; }
function combatScene(){ if(!state.combat.scene) state.combat.scene={bg:null,pos:{}}; return state.combat.scene; }
function placeCombatantsDefault(){
  var sc=combatScene();
  var pc=0, enemy=0;
  state.combat.participants.forEach(function(c){
    if(sc.pos && sc.pos[c.id]) return;
    var side=sideOf(c);
    if(side==='调查员'||side==='盟友'){ sc.pos[c.id]={x:95,y:70+pc*92}; pc++; }
    else { sc.pos[c.id]={x:B_W-95,y:70+enemy*92}; enemy++; }
  });
}
function drawBattleScene(){
  var ctx=battleCtx(); if(!ctx) return;
  var sc=combatScene();
  ctx.clearRect(0,0,B_W,B_H);
  if(sc.bg){ var im=new Image(); im.onload=function(){ try{ctx.drawImage(im,0,0,B_W,B_H);}catch(e){} drawOver(ctx,sc); }; im.src=sc.bg; }
  else { ctx.fillStyle=(typeof themeCanvasColor==='function')?themeCanvasColor():'#1a1e2b'; ctx.fillRect(0,0,B_W,B_H); drawOver(ctx,sc); }
}

function battleHit(ev){
  var cv=$('battleCanvas'); var r=cv.getBoundingClientRect();
  var x=(ev.clientX-r.left)/r.width*B_W, y=(ev.clientY-r.top)/r.height*B_H;
  var best=null,bd=1e9;
  state.combat.participants.forEach(function(c){
    var p=(combatScene().pos||{})[c.id]; if(!p) return;
    var d=Math.hypot(p.x-x,p.y-y);
    if(d<26&&d<bd){bd=d;best=c.id;}
  });
  return {x:x,y:y,best:best};
}
var battleDrag=null;
function bindBattleCanvas(){
  var cv=$('battleCanvas'); if(!cv) return;
  function battleDown(ev){
    try{ if(cv.setPointerCapture) cv.setPointerCapture(ev.pointerId); }catch(e){}
    var h=battleHit(ev);
    if(h.best){ combActiveId=h.best; battleDrag=h.best; renderCombatRoster(); renderActivePanel(); }
    drawBattleScene();
  }
  function battleMove(ev){
    if(!battleDrag) return;
    var h=battleHit(ev);
    var sc=combatScene();
    if(sc.pos[battleDrag]){ sc.pos[battleDrag].x=Math.max(30,Math.min(B_W-30,h.x)); sc.pos[battleDrag].y=Math.max(30,Math.min(B_H-30,h.y)); }
    drawBattleScene();
  }
  function battleUp(){ battleDrag=null; saveStateQuiet(); }
  cv.addEventListener('pointerdown',battleDown);
  cv.addEventListener('pointermove',battleMove);
  cv.addEventListener('pointerup',battleUp);
  cv.addEventListener('pointercancel',battleUp);
}
function onBattleBg(e){
  var f=e.target.files&&e.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){ combatScene().bg=r.result; saveState(); drawBattleScene(); toast('战斗场景底图已载入'); };
  r.readAsDataURL(f); e.target.value='';
}
function clearBattleBg(){ combatScene().bg=null; saveState(); drawBattleScene(); }
