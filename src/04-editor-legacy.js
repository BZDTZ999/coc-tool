/* ---------- 编辑弹窗 ---------- */
var ATTR_NAMES={str:'力量 STR',con:'体质 CON',pow:'意志 POW',dex:'敏捷 DEX',app:'外貌 APP',siz:'体型 SIZ',int:'智力/灵感',edu:'教育 EDU',luck:'幸运 Luck'};


function skillRowHTML(name,total,i){
  return `<div class="listitem row" data-skill="${i}">
    <input type="text" class="sk-name" value="${esc(name)}" placeholder="技能名称" style="flex:1">
    <input type="number" class="sk-total" value="${num(total)||0}" style="width:90px" placeholder="当前值">
    <button class="small danger" onclick="this.closest('.listitem').remove()">✕</button></div>`;
}


function weaponRowHTML(w,i){
  return `<div class="listitem row" style="gap:6px;flex-wrap:wrap">
    <input type="text" class="w-name" value="${esc(w.name)}" placeholder="武器" style="width:130px">
    <input type="text" class="w-skill" value="${esc(w.skill||'')}" placeholder="技能" style="width:90px">
    <input type="text" class="w-dmg" value="${esc(w.damage||'')}" placeholder="伤害 如1D8+DB" style="width:120px">
    <input type="text" class="w-range" value="${esc(w.range||'')}" placeholder="射程" style="width:70px">
    <label style="flex-direction:row;align-items:center">弹匣<input type="number" class="w-cap" value="${num(w.ammoCap)||0}" style="width:60px"></label>
    <button class="small danger" onclick="this.closest('.listitem').remove()">✕</button></div>`;
}







function closeActorModal(){ var m=$('actorModal'); m.classList.remove('open'); m.innerHTML=''; currentActorModal=null; editingActorId=null; }
function deleteActor(id){
  var a=state.actors.filter(function(x){return x.id===id;})[0];
  if(!a) return;
  if(!confirmBox('确定删除「'+a.name+'」？')) return;
  state.actors=state.actors.filter(function(x){return x.id!==id;});
  saveState();
  if(a.kind==='pc') renderSurveyors(); else renderNpcs();
  closeActorModal();
  toast('已删除');
}
function duplicateActor(id){
  var a=state.actors.filter(function(x){return x.id===id;})[0];
  if(!a) return;
  var b=JSON.parse(JSON.stringify(a)); b.id=uid('npc'); b.name=a.name+' (副本)';
  state.actors.push(b); saveState(); renderNpcs(); toast('已复制');
}
function exportActorJson(id){
  var a=state.actors.filter(function(x){return x.id===id;})[0]; if(!a) return;
  download('调查员-'+a.name+'.json', JSON.stringify(a,null,2));
  toast('已导出角色 JSON');
}

/* ================= 场景地图 / 路线 ================= */
var mapTool='select';
var mapSel={type:null,idx:-1};
var mapDrag=null;
var routeSel={start:-1,end:-1,vehicle:null,overrides:{}};
var MAP_W=1000, MAP_H=620;

function currentMap(){ return state.maps.filter(function(m){return m.id===state.activeMapId;})[0]||null; }

function onMapSelect(){
  var sel=$('mapSel'); state.activeMapId=sel.value; routeSel={start:-1,end:-1,vehicle:null,overrides:{}};
  saveStateQuiet(); renderMapsShell();
}

function renameMap(){
  var m=currentMap(); if(!m) return;
  var name=prompt('重命名场景：',m.name); if(name===null) return;
  m.name=name||m.name; saveState(); renderMapsShell();
}
function deleteMap(){
  var m=currentMap(); if(!m) return;
  if(!confirmBox('删除场景「'+m.name+'」？（不会删除角色）')) return;
  state.maps=state.maps.filter(function(x){return x.id!==m.id;});
  if(state.activeMapId===m.id) state.activeMapId=state.maps.length?state.maps[0].id:null;
  routeSel={start:-1,end:-1,vehicle:null,overrides:{}};
  saveState(); renderMapsShell();
}
function loadDemoMap(){
  if(!confirmBox('载入示例地图会替换当前场景，继续？')) return;
  var d=makeDemoMap(); d.id=currentMap()?currentMap().id:uid('map');
  if(state.maps.length&&state.activeMapId){
    var i=state.maps.findIndex(function(x){return x.id===state.activeMapId;});
    state.maps[i]=d;
  } else { state.maps.push(d); state.activeMapId=d.id; }
  saveState(); renderMapsShell();
}

function mapCanvasPos(ev){
  var cv=$('mapCanvas'); var r=cv.getBoundingClientRect();
  return { x: Math.round((ev.clientX-r.left)/r.width*MAP_W), y: Math.round((ev.clientY-r.top)/r.height*MAP_H) };
}






function onBgPick(e){
  var m=currentMap(); if(!m)return;
  var f=e.target.files&&e.target.files[0]; if(!f)return;
  var r=new FileReader();
  r.onload=function(){ m.background=r.result; saveState(); drawMapCanvas(); toast('背景图已载入'); };
  r.readAsDataURL(f);
  e.target.value='';
}
function legAllowed(leg, vehId){
  if(!leg.modes || !leg.modes.length) return true;
  return leg.modes.indexOf(vehId)>=0;
}

function distBetween(m,a,b){ return Math.sqrt(Math.pow(m.points[a].x-m.points[b].x,2)+Math.pow(m.points[a].y-m.points[b].y,2))*(m.kmPerPx||0.01); }
function renderMapLists(){
  var m=currentMap(); var pc=$('mapPointsCard'), lc=$('mapLegsCard');
  if(!pc||!lc||!m){ if(pc)pc.innerHTML=''; if(lc)lc.innerHTML=''; return; }
  pc.innerHTML='<details class="card ccard" data-coll="pts"'+(MAP_COLL&&MAP_COLL.pts?' open':'')+'><summary>📍 地点（'+m.points.length+'）</summary><div>'+
    (m.points.length?m.points.map(function(pt,i){
      return `<div class="listitem row" style="gap:6px">
        <input type="text" value="${esc(pt.icon||'')}" style="width:44px" title="图标 emoji" data-k="icon" data-p="${i}" oninput="onPointInput(this)">
        <input type="text" value="${esc(pt.name||'')}" placeholder="名称" style="flex:1;min-width:100px" data-k="name" data-p="${i}" oninput="onPointInput(this)">
        <input type="text" value="${esc(pt.desc||'')}" placeholder="备注" style="flex:1.4" data-k="desc" data-p="${i}" oninput="onPointInput(this)">
        <button class="small danger" onclick="delPoint(${i})">✕</button></div>`;
    }).join(''):'<div class="hint">还没有地点：选「添加地点」后在图上点按。</div>')+'</div></details>';
  lc.innerHTML='<details class="card ccard" data-coll="legs"'+(MAP_COLL&&MAP_COLL.legs?' open':'')+'><summary>🛤 道路 / 路径（'+m.legs.length+'）</summary><div>'+
    (m.legs.length?'':'<div class="hint">给两个地点加一条路：选起点终点、填距离 km。</div>')+
    `<div class="listitem row" style="background:#262b38">
      <select id="legNewA" style="flex:1">${m.points.map(function(pt,i){return '<option value="'+i+'">'+esc(pt.name)+'</option>';}).join('')}</select>
      <span>→</span>
      <select id="legNewB" style="flex:1">${m.points.map(function(pt,i){return '<option value="'+i+'">'+esc(pt.name)+'</option>';}).join('')}</select>
      <button class="small primary" onclick="addLeg()">＋ 加路</button></div>`+
    m.legs.map(function(leg,i){
      var A=m.points[leg.a], B=m.points[leg.b];
      if(!A||!B) return '';
      var lname=(leg.name&&String(leg.name).trim())||(A.name+' → '+B.name);
      var lnote=leg.note&&String(leg.note).trim()?(' · '+leg.note):'';
      var modesHtml=state.vehicles.map(function(v){
        var on = !leg.modes || leg.modes.length===0 || leg.modes.indexOf(v.id)>=0;
        return `<button class="small" style="${on?'color:#e3c47f':''}" data-i="${i}" data-v="${v.id}" onclick="toggleLegMode(${i},'${v.id}')" title="${esc(v.name)} ${v.kmh}km/h">${on?'✓':''}${esc(v.name)}</button>`;
      }).join('');
      return `<details class="legcard" data-legid="${esc(leg.id)}"${(MAP_COLL&&MAP_COLL.legOpen&&MAP_COLL.legOpen[leg.id])?' open':''}>
        <summary><span class="lname"><b>${esc(lname)}</b><span class="muted" style="font-weight:400">${esc(lnote)}</span></span>
          <span class="num" style="color:var(--muted)">${Number(leg.dist||0).toFixed(1)} km</span>
          <button class="small danger" style="padding:1px 7px" onclick="event.preventDefault();event.stopPropagation();delLeg(${i})">✕</button>
        </summary>
        <div class="legbody">
          <div class="row" style="gap:6px">
            <select data-k="a" data-l="${i}" onchange="onLegInput(this)" style="flex:1">${m.points.map(function(pt,j){return '<option value="'+j+'"'+(leg.a===j?' selected':'')+'>'+esc(pt.name)+'</option>';}).join('')}</select>
            <span>→</span>
            <select data-k="b" data-l="${i}" onchange="onLegInput(this)" style="flex:1">${m.points.map(function(pt,j){return '<option value="'+j+'"'+(leg.b===j?' selected':'')+'>'+esc(pt.name)+'</option>';}).join('')}</select>
            <input type="number" value="${leg.dist||''}" placeholder="km" style="width:76px" data-k="dist" data-l="${i}" oninput="onLegInput(this)">
          </div>
          <div class="row" style="gap:4px;margin-top:5px;flex-wrap:wrap">${modesHtml}</div>
          <div class="row" style="gap:6px;margin-top:5px;flex-wrap:wrap">
            <input type="text" value="${esc(leg.name||'')}" placeholder="道路名称（显示在地图上）" style="flex:1;min-width:150px" data-k="name" data-l="${i}" oninput="onLegInput(this)">
            <input type="text" value="${esc(leg.note||'')}" placeholder="路况/风险备注" style="flex:1.4;min-width:150px" data-k="note" data-l="${i}" oninput="onLegInput(this)">
          </div>
        </div></details>`;
    }).join('')+'</div></details>';
}
function onPointInput(e){
  var m=currentMap(); if(!m)return;
  var pt=m.points[num(e.dataset.p)]; if(!pt)return;
  pt[e.dataset.k]=e.value;
  saveStateQuiet(); drawMapCanvas();
}
function delPoint(i){ var m=currentMap(); if(!m)return; if(!confirmBox('删除地点与相关道路？'))return;
  m.points.splice(i,1);
  m.legs=m.legs.filter(function(l){return l.a!==i&&l.b!==i;}).map(function(l){ return {id:l.id,a:l.a>i?l.a-1:l.a,b:l.b>i?l.b-1:l.b,dist:l.dist,name:l.name||'',note:l.note,modes:l.modes}; });
  routeSel={start:-1,end:-1,vehicle:null,overrides:{}};
  saveState(); renderMapsShell();
}
function addLeg(){
  var m=currentMap(); if(!m)return;
  var a=num($('legNewA').value), b=num($('legNewB').value);
  if(a===b){ toast('起点和终点不能相同'); return; }
  var d=distBetween(m,a,b);
  var ask=prompt('两点直线距离约 '+d.toFixed(2)+' km（可按实际路况修改）：\n道路距离（km）', d.toFixed(2));
  if(ask===null) return;
  var dd=Math.max(0.01,num(ask)||d);
  var nm=prompt('道路名称（会显示在地图上，可留空）：','');
  if(nm===null) nm='';
  m.legs.push({id:uid('e'),a:a,b:b,dist:dd,name:nm.trim()||'',note:'',modes:null});
  saveState(); renderMapsShell();
  toast('已加路');
}
function delLeg(i){ var m=currentMap(); if(!m)return; if(!confirmBox('删除这条道路？'))return;
  m.legs.splice(i,1); routeSel.overrides={};
  saveState(); renderMapsShell();
}
function onLegInput(e){
  var m=currentMap(); if(!m)return;
  var leg=m.legs[num(e.dataset.l)]; if(!leg)return;
  var k=e.dataset.k;
  if(k==='a'||k==='b'){ var v=num(e.value); if(m.points[v]) leg[k]=v; }
  else if(k==='dist') leg.dist=Math.max(0,num(e.value)||0);
  else leg[k]=e.value;
  saveStateQuiet(); drawMapCanvas();
}
function toggleLegMode(i,vid){
  var m=currentMap(); if(!m)return;
  var leg=m.legs[i]; if(!leg)return;
  if(!leg.modes) leg.modes=state.vehicles.map(function(v){return v.id;});
  var j=leg.modes.indexOf(vid);
  if(j>=0) leg.modes.splice(j,1); else leg.modes.push(vid);
  if(leg.modes.length===state.vehicles.length) leg.modes=null; // 全部允许
  saveState(); renderMapsShell();
}
