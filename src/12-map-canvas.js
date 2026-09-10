/* ---------- 地图画布：地点/道路/角色/摆件 ---------- */
var mapDrag=null;
var mapDragMoved=false;
var mapPanStart=null;
/* 当前工具能抓到什么：🖱 拖动地点只抓地点（免得想挪地点却抓到角色/摆件）；
   🧍 移动角色摆件只抓角色与摆件；添加地点时不抓任何东西。 */
function mapToolKinds(){
  if(mapTool==='move') return ['token','prop'];
  if(mapTool==='select') return ['point'];
  return [];
}
function findMapHit(ev, includeTokens){
  var m=currentMap(); if(!m) return null;
  var p=mapCanvasPos(ev);
  var kinds=mapToolKinds();
  var best=null,bd=1e9;
  function tryHit(d,type,idx){ if(d<18&&d<bd){bd=d;best={type:type,idx:idx};} }
  if(kinds.indexOf('point')>=0) (m.points||[]).forEach(function(pt,i){ tryHit(Math.hypot(pt.x-p.x,pt.y-p.y),'point',i); });
  if(includeTokens!==false && kinds.indexOf('token')>=0) (m.tokens||[]).forEach(function(t,i){ var a=actorById(t.actorId); if(a) tryHit(Math.hypot(t.x-p.x,t.y-p.y)-6,'token',i); });
  if(kinds.indexOf('prop')>=0) (m.props||[]).forEach(function(pr,i){ tryHit(Math.hypot(pr.x-p.x,pr.y-p.y),'prop',i); });
  return best;
}

function overlayMap(g,m){
  // 辅助网格：淡淡的定位线（每 5 格稍亮一点），方便按坐标摆位置、估距离
  (function(){
    var step=50;
    g.save(); g.lineWidth=1;
    g.strokeStyle='rgba(170,196,238,.15)';
    for(var x=step;x<MAP_W;x+=step){ g.beginPath(); g.moveTo(x+.5,0); g.lineTo(x+.5,MAP_H); g.stroke(); }
    for(var y=step;y<MAP_H;y+=step){ g.beginPath(); g.moveTo(0,y+.5); g.lineTo(MAP_W,y+.5); g.stroke(); }
    g.strokeStyle='rgba(190,214,255,.30)';
    for(var x2=step*5;x2<MAP_W;x2+=step*5){ g.beginPath(); g.moveTo(x2+.5,0); g.lineTo(x2+.5,MAP_H); g.stroke(); }
    for(var y2=step*5;y2<MAP_H;y2+=step*5){ g.beginPath(); g.moveTo(0,y2+.5); g.lineTo(MAP_W,y2+.5); g.stroke(); }
    g.restore();
  })();
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
    /* 正在拖动的地点：与它相连的道路用金色高亮，长度随拖动实时变 */
    var hotDrag=!!(mapDrag&&mapDrag.type==='point'&&(leg.a===mapDrag.idx||leg.b===mapDrag.idx));
    var hl=hot||hotDrag;
    /* 室内地图（m.noDist）只显示路名，不带里程 */
    var showD=(!m.noDist && Number(leg.dist)>0);
    var dTxt=showD?(Math.round(Number(leg.dist)*10)/10)+' km':'';
    if(nm){
      uprightText(g,mx,my-10,function(){ plateText(g,nm,mx,(showD?my-16:my-10),'bold 12px "PingFang SC",sans-serif',hl); });
      if(showD) uprightText(g,mx,my+8,function(){ plateText(g,dTxt,mx,my+8,'11px Menlo,monospace',hl); });
    } else if(showD){
      uprightText(g,mx,my-10,function(){ plateText(g,dTxt,mx,my-10,'11px Menlo,monospace',hl); });
    }
  });
  // 摆件：阴影 + emoji 图标 或 自定义图片素材
  (m.props||[]).forEach(function(pr,i){
    var ps=pr.scale||1;
    var psel=mapSel&&mapSel.type==='prop'&&mapSel.idx===i;
    /* 摆件保持干净：不加深色衬底、不加投影；只有选中时给一圈柔和暖光提示 */
    if(psel) softDarkHalo(g,pr.x,pr.y-3*ps,28*ps,true);
    g.save();
    g.globalAlpha=1;
    if(pr.img){
      var im=_propImgCache[pr.img];
      if(!im){ im=new Image(); im.onload=function(){ drawMapCanvas(); }; im.src=pr.img; _propImgCache[pr.img]=im; }
      if(im.complete){
        var pw=42*ps;
        var ph=im.naturalHeight&&im.naturalWidth?(pw*im.naturalHeight/im.naturalWidth):pw;
        if(ph>48*ps) ph=48*ps;
        try{ g.drawImage(im,pr.x-pw/2,pr.y-ph+10,pw,ph); }catch(e){}
      } else { g.font='bold '+(30*ps)+'px serif'; g.textAlign='center'; g.fillText('🖼',pr.x,pr.y+10*ps); }
    } else {
      g.font='bold '+(33*ps)+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
      g.textAlign='center'; g.textBaseline='alphabetic';
      g.fillText(pr.icon,pr.x,pr.y+12*ps);
    }
    g.restore();
  });
  // 地点
  (m.points||[]).forEach(function(pt,i){
    var selected=mapSel&&mapSel.type==='point'&&mapSel.idx===i;
    g.beginPath(); g.arc(pt.x,pt.y,selected?10:8,0,Math.PI*2);
    g.fillStyle=selected?'#e3c47f':'#c9a25e'; g.fill();
    g.lineWidth=selected?3:1.5; g.strokeStyle='#1b1f2a'; g.stroke();
    if(pt.icon){ g.font='15px serif'; g.textAlign='center'; g.fillText(pt.icon,pt.x-8,pt.y-13); }
    uprightText(g,pt.x,pt.y+28,function(){ plateText(g,String(pt.name||'').slice(0,16),pt.x,pt.y+28,'bold 14px "PingFang SC",sans-serif',selected); });
  });
  // 地图角色
  (m.tokens||[]).forEach(function(t,i){
    var a=actorById(t.actorId); if(!a) return;
    var sel=mapSel&&mapSel.type==='token'&&mapSel.idx===i;
    if(sel) softDarkHalo(g,t.x,t.y,22,true);
    drawAvatarOnCanvas(g,t.x,t.y,17,a);
    uprightText(g,t.x,t.y+34,function(){ plateText(g,String(a.name||'').slice(0,10),t.x,t.y+34,'11px "PingFang SC",sans-serif',sel); });
    var veh=(state.vehicles||[]).filter(function(v){return v.assign===a.id;})[0];
    if(veh){ g.fillStyle='rgba(143,214,155,.9)'; g.textAlign='center'; g.fillText('🚗',t.x+18,t.y-12); }
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
/* 柔和衬底：不再画硬边圆盘，改用模糊暗色光晕，让图标在任意底图上都清楚又不碍眼；
   glow=true 时用暖金色光晕表示“已选中”。 */
function softDarkHalo(g,x,y,r,glow){
  g.save();
  g.globalAlpha=1;
  if(glow){
    g.shadowColor='rgba(255,205,110,.95)'; g.shadowBlur=Math.max(14,r*0.85);
    g.fillStyle='rgba(255,205,110,.28)';
  } else {
    g.shadowColor='rgba(0,0,0,.96)'; g.shadowBlur=Math.max(10,r*0.6);
    g.fillStyle='rgba(9,11,17,.88)';
  }
  g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
  g.restore();
}
/* 文字是否跟着地图转：地图旋转模式（rotUpright）下把文字反向转回来，保持水平 */
function uprightText(g,x,y,fn){
  var m=currentMap();
  var rot=m?mapRotOf(m):0;
  if(!m||!m.rotUpright||!rot){ fn(); return; }
  g.save();
  g.translate(x,y); g.rotate(-rot*Math.PI/180); g.translate(-x,-y);
  fn();
  g.restore();
}
var _avatarImgCache={};
/* ---------- 画布文字：自动换行 / 自适应字号 / 多行名牌（长名字也能完整显示） ---------- */
function wrapCanvasLines(g, text, maxW){
  text=String(text==null?'':text);
  if(!text) return [''];
  var tokens=[];
  var re=/[\u2e80-\u9fff\u3000-\u303f\u3040-\u30ff\uff00-\uffef]|[^\s\u2e80-\u9fff\u3000-\u303f\u3040-\u30ff\uff00-\uffef]+/g;
  var mm;
  while((mm=re.exec(text))){ tokens.push(mm[0]); }
  if(!tokens.length) return [text];
  var lines=[], cur='';
  for(var i=0;i<tokens.length;i++){
    var t=tokens[i];
    var test=cur?(cur+t):t;
    if(!cur || g.measureText(test).width<=maxW) cur=test;
    else { lines.push(cur); cur=t; }
  }
  if(cur) lines.push(cur);
  return lines;
}
function fitCanvasName(g, text, maxW, sizes, family){
  text=String(text==null?'':text);
  sizes=sizes||[15,14,13,12,11,10,9,8];
  family=family||'"PingFang SC",sans-serif';
  for(var i=0;i<sizes.length;i++){
    g.font='bold '+sizes[i]+'px '+family;
    if(g.measureText(text).width<=maxW) return {size:sizes[i], lines:[text], family:family};
  }
  var f=sizes[sizes.length-1];
  g.font='bold '+f+'px '+family;
  return {size:f, lines:wrapCanvasLines(g,text,maxW), family:family};
}
function plateTextBlock(g, lines, cx, topY, fontStr, highlight){
  if(!lines||!lines.length) return 0;
  g.font=fontStr||'bold 13px "PingFang SC",sans-serif';
  var fs=12; var mm=(fontStr||'').match(/([\d.]+)px/); if(mm) fs=parseFloat(mm[1]);
  var lh=fs+5, w=0;
  lines.forEach(function(L){ w=Math.max(w, g.measureText(L).width); });
  w+=14;
  var h=lines.length*lh+6;
  g.textAlign='center'; g.textBaseline='middle';
  g.fillStyle=highlight?'rgba(227,196,127,.85)':'rgba(0,0,0,.78)';
  roundRectPath(g,cx-w/2,topY,w,h,5); g.fill();
  g.fillStyle='#fff';
  lines.forEach(function(L,i){ g.fillText(L, cx, topY+3+lh*i+lh/2); });
  g.textBaseline='alphabetic';
  return h;
}
/* 战斗成员状态图标：眩晕 / 濒死 / 死亡 / 异常（再带一个昏迷），画在头像右侧 */
function combStateIcon(state){
  var s=String(state||'').trim();
  if(!s||s==='正常') return null;
  if(/濒死/.test(s)) return {g:'🩸',c:'#c0453f'};
  if(/死亡|离场/.test(s)) return {g:'💀',c:'#4a4f5c'};
  if(/眩晕/.test(s)) return {g:'💫',c:'#7b52b8'};
  if(/昏迷/.test(s)) return {g:'💤',c:'#3d5f96'};
  if(/疯狂|异常/.test(s)) return {g:'⚠️',c:'#c08a1e'};
  return {g:'⚠️',c:'#c08a1e'};
}
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
  if(mapTool!=='select' && mapTool!=='move') return;
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
/* 拖动一个地点后：按比例尺实时重算与它相连的每一条道路的里程（不弹窗，画布上直接变） */
function refreshLegDist(m, pi){
  if(!m||!Array.isArray(m.legs)) return;
  m.legs.forEach(function(leg){
    if(leg.a!==pi&&leg.b!==pi) return;
    if(!m.points[leg.a]||!m.points[leg.b]) return;
    var d=Math.sqrt(Math.pow(m.points[leg.a].x-m.points[leg.b].x,2)+Math.pow(m.points[leg.a].y-m.points[leg.b].y,2))*(m.kmPerPx||0.01);
    leg.dist=Math.round(d*100)/100;
    leg.auto=true;
  });
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
  if(mapDrag.type==='point') refreshLegDist(m,mapDrag.idx);   /* 实时更新路线长度 */
  drawMapCanvas();
}
function onCanvasUp(){
  if(mapPanStart){
    mapPanStart=null;
    var cv=$('mapCanvas'); if(cv) cv.style.cursor=(mapTool==='add')?'crosshair':(mapTool==='move'?'move':'grab');
    saveStateQuiet();
    return;
  }
  var movedPoint=!!(mapDrag&&mapDrag.type==='point');
  mapDrag=null; saveStateQuiet(); drawMapCanvas();
  if(movedPoint){
    /* 同步右侧「道路/路径」里程与「路线时间计算」 */
    try{ if(typeof renderMapLists==='function') renderMapLists(); }catch(e){}
    try{ if(typeof renderRoutePanel==='function') renderRoutePanel(); }catch(e){}
  }
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
  document.querySelectorAll('#fsMapCtl [data-tool]').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tool')===t); });
  var cv=$('mapCanvas'); if(cv) cv.style.cursor=(t==='add')?'crosshair':(t==='move'?'move':'grab');
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
    if(side==='调查员'||side==='盟友'){ sc.pos[c.id]={x:95,y:64+pc*128}; pc++; }
    else { sc.pos[c.id]={x:B_W-95,y:64+enemy*128}; enemy++; }
  });
}
function sizeBattleCanvas(){
  var cv=$('battleCanvas'); if(!cv) return null;
  var wrap=cv.parentElement||cv;
  var availW=Math.round(wrap.clientWidth||0);
  if(!availW) availW=B_W;
  var cssW=Math.max(240, availW);
  var cssH=Math.round(cssW*B_H/B_W);
  if(document.body && document.body.classList.contains('fs-combat')){
    /* 全屏：按“可用盒子”等比缩放，整张场景都能看到 */
    var availH=Math.round(wrap.clientHeight||0)||Math.max(200,(window.innerHeight||800)-180);
    if(cssH>availH){ cssH=Math.max(200,availH); cssW=Math.round(cssH*B_W/B_H); }
  }
  return hidpiCanvas(cv, B_W, B_H, cssW, cssH);
}
/* ---------- 战斗场景道具（油桶/爆炸/桌子/雕像…，可拖动可删除，也支持自定义图片） ---------- */
var COMB_PROP_PRESETS=[
  ['🛢️','油桶'],['💥','爆炸'],['🪑','椅子'],['🍽️','餐桌'],['🗿','雕像'],['📦','木箱'],['🔥','火焰'],['💣','炸弹'],
  ['🚪','门'],['🪟','窗户'],['🪨','石块'],['🌳','树'],['🕯️','蜡烛'],['🩸','血迹'],['⚰️','棺材'],['🧱','砖墙'],
  ['🌫️','烟雾'],['🪜','梯子'],['🚗','汽车'],['🛏️','床'],['🛋️','沙发'],['🗄️','档案柜'],['📚','书堆'],['🔑','钥匙'],
  ['🔦','手电'],['🧪','试管'],['⚗️','烧瓶'],['🔬','显微镜'],['📻','收音机'],['☎️','电话'],['⛓️','锁链'],['🪝','钩子'],
  ['🪚','锯子'],['🔨','锤子'],['⚔️','刀剑'],['🔫','手枪'],['🧨','炸药'],['🕳️','坑洞'],['⛲','喷泉'],['🪦','墓碑'],
  ['🗼','高塔'],['🚧','路障'],['🪣','水桶'],['🧯','灭火器'],['🚲','自行车'],['🛻','卡车'],['⛵','小船'],['💡','灯泡'],
  ['🪞','镜子'],['🖼️','画框'],['🧸','玩偶'],['🕰️','座钟'],['🚽','马桶'],['🚿','淋浴'],['🧴','药瓶'],['🧰','工具箱'],
  ['📷','相机'],['🏺','陶罐'],['🎭','面具'],['🧟','尸体'],['🦴','白骨'],['🕸️','蛛网'],['🪤','捕兽夹'],['🌊','积水']
];
var battlePropSel=-1;
var battlePropDrag=null;
function battleProps(){ var sc=combatScene(); if(!Array.isArray(sc.props)) sc.props=[]; return sc.props; }
function battleCustomProps(){ if(!state.combat) state.combat={round:0,participants:[]}; if(!Array.isArray(state.combat.customProps)) state.combat.customProps=[]; return state.combat.customProps; }
function findBattleProp(x,y){
  var arr=battleProps(), best=-1, bd=1e9;
  arr.forEach(function(pr,i){ var d=Math.hypot((pr.x||0)-x,(pr.y||0)-y); if(d<40&&d<bd){ bd=d; best=i; } });
  return best;
}
/* 场景道具：不透明 + 柔和深色衬底 + 阴影，保证在任何底图上都非常清楚（不画圆盘/圆环） */
function drawBattleProps(g){
  battleProps().forEach(function(pr,i){
    var s=pr.scale||1;
    var sel=battlePropSel===i;
    /* 道具保持干净：不加深色衬底、不加投影；只有选中时给一圈柔和暖光提示 */
    if(sel) softDarkHalo(g,pr.x,pr.y-4*s,24*s,true);
    g.save();
    g.globalAlpha=1;
    if(pr.img){
      var im=_propImgCache[pr.img];
      if(!im){ im=new Image(); im.onload=function(){ drawBattleScene(); }; im.src=pr.img; _propImgCache[pr.img]=im; }
      if(im.complete){
        var pw=56*s, ph=im.naturalHeight&&im.naturalWidth?(pw*im.naturalHeight/im.naturalWidth):pw;
        if(ph>64*s) ph=64*s;
        try{ g.drawImage(im,pr.x-pw/2,pr.y-ph+10*s,pw,ph); }catch(e){}
      } else { g.font='bold '+(36*s)+'px serif'; g.textAlign='center'; g.fillText('🖼',pr.x,pr.y+13*s); }
    } else {
      g.font='bold '+(40*s)+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
      g.textAlign='center'; g.textBaseline='alphabetic';
      g.fillText(pr.icon||'📦',pr.x,pr.y+15*s);
    }
    g.restore();
  });
  g.textAlign='left';
}
function addBattleProp(icon,img,name){
  if(icon==null && !img) return;
  var props=battleProps();
  var idx=props.length;
  var x=B_W/2+((idx%4)-1.5)*84, y=B_H/2+Math.floor(idx/4)*84;
  props.push({id:uid('bp'),icon:icon||'',img:img||null,name:name||'',x:Math.max(40,Math.min(B_W-40,x)),y:Math.max(40,Math.min(B_H-40,y)),scale:1});
  battlePropSel=props.length-1;
  saveState(); drawBattleScene(); renderBattlePropPalette();
  toast('已把「'+(name||icon)+'」放进战斗场景，可拖动调整位置');
}
function addBattlePropPreset(i){
  var p=COMB_PROP_PRESETS[i]; if(!p){ toast('该道具不存在'); return; }
  addBattleProp(p[0],null,p[1]);
}
function onBattlePropFile(e){
  var fs=e.target.files; if(!fs||!fs.length) return;
  var list=Array.prototype.slice.call(fs,0,4);
  list.forEach(function(f){
    if(!/^image\//.test(f.type)) return;
    var r=new FileReader();
    r.onload=function(){
      var nm=f.name.replace(/\.[^.]+$/,'').slice(0,10)||'自定义道具';
      battleCustomProps().push({id:uid('cp'),img:r.result,name:nm});
      addBattleProp(null,r.result,nm);
    };
    r.readAsDataURL(f);
  });
  e.target.value='';
}
function deleteSelectedBattleProp(){
  var arr=battleProps();
  if(battlePropSel<0||!arr[battlePropSel]){ toast('先在场景里点选一个道具'); return; }
  var nm=arr[battlePropSel].name||arr[battlePropSel].icon||'道具';
  arr.splice(battlePropSel,1);
  battlePropSel=-1;
  saveState(); drawBattleScene();
  toast('已删除「'+nm+'」');
}
function renderBattlePropPalette(){
  var box=$('battlePropPalette'); if(!box) return;
  var btns=COMB_PROP_PRESETS.map(function(p,i){
    return '<button class="propbtn" title="加入场景：'+esc(p[1])+'" onclick="addBattlePropPreset('+i+')">'+p[0]+'<span>'+esc(p[1])+'</span></button>';
  });
  var custom=battleCustomProps().map(function(cp,i){
    return '<button class="propbtn custprop" title="加入场景：'+esc(cp.name||'自定义')+'" onclick="addBattlePropCustom('+i+')"><img src="'+esc(cp.img)+'" alt=""><span>'+esc(cp.name||'自定义')+'</span></button>';
  });
  box.innerHTML=btns.concat(custom).join('')||'<span class="hint">（无）</span>';
}
function addBattlePropCustom(i){
  var cp=battleCustomProps()[i]; if(!cp){ toast('该道具不存在'); return; }
  addBattleProp(null,cp.img,cp.name);
}
function drawBattleScene(){
  var ctx=sizeBattleCanvas(); if(!ctx) return;
  var cv=$('battleCanvas');
  var sc=combatScene();
  ctx.clearRect(0,0,B_W,B_H);
  if(sc.bg){
    var im=new Image();
    im.onload=function(){
      var g2=cv?hidpiCanvas(cv,B_W,B_H,cv.clientWidth||B_W,Math.round((cv.clientWidth||B_W)*B_H/B_W)):ctx;
      g2=g2||ctx;
      try{ g2.drawImage(im,0,0,B_W,B_H); }catch(e){}
      drawBattleProps(g2); drawOver(g2,sc);
    };
    im.src=sc.bg;
  } else {
    ctx.fillStyle=(typeof themeCanvasColor==='function')?themeCanvasColor():'#1a1e2b';
    ctx.fillRect(0,0,B_W,B_H);
    drawBattleProps(ctx); drawOver(ctx,sc);
  }
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
  return {x:x,y:y,best:best,prop:findBattleProp(x,y)};
}
var battleDrag=null;
function bindBattleCanvas(){
  var cv=$('battleCanvas'); if(!cv) return;
  function battleDown(ev){
    try{ if(cv.setPointerCapture) cv.setPointerCapture(ev.pointerId); }catch(e){}
    var h=battleHit(ev);
    if(h.best){ combActiveId=h.best; battleDrag=h.best; renderCombatRoster(); renderActivePanel(); }
    else if(h.prop!=null && h.prop>=0){ battlePropSel=h.prop; battlePropDrag=h.prop; drawBattleScene(); }
    else {
      battlePropSel=-1;
      /* 全屏时点场景空白处 = 收起角色详情 */
      if(document.body && document.body.classList.contains('fs-combat')){ selectComb(null); return; }
    }
    drawBattleScene();
  }
  function battleMove(ev){
    if(battlePropDrag!=null){
      var hp=battleHit(ev); var pr=battleProps()[battlePropDrag];
      if(pr){ pr.x=Math.max(20,Math.min(B_W-20,hp.x)); pr.y=Math.max(20,Math.min(B_H-20,hp.y)); }
      drawBattleScene(); return;
    }
    if(!battleDrag) return;
    var h=battleHit(ev);
    var sc=combatScene();
    if(sc.pos[battleDrag]){ sc.pos[battleDrag].x=Math.max(30,Math.min(B_W-30,h.x)); sc.pos[battleDrag].y=Math.max(30,Math.min(B_H-30,h.y)); }
    drawBattleScene();
  }
  function battleUp(){ battleDrag=null; battlePropDrag=null; saveStateQuiet(); }
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
