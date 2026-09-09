/* ---------- 路线计算 ---------- */
function routeAllowedLegs(vehId){
  var m=currentMap(); if(!m) return [];
  return m.legs.filter(function(l){ return legAllowed(l,vehId); });
}
function computePath(start,end,vehId){
  var m=currentMap(); if(!m) return null;
  if(start===end || start<0 || end<0) return null;
  var veh=state.vehicles.filter(function(v){return v.id===vehId;})[0];
  if(!veh) return null;
  var graph={};
  m.legs.forEach(function(l){ if(!legAllowed(l,vehId)) return;
    if(!graph[l.a]) graph[l.a]=[]; if(!graph[l.b]) graph[l.b]=[];
    graph[l.a].push({to:l.b,leg:l,time:l.dist/veh.kmh,dist:l.dist});
    graph[l.b].push({to:l.a,leg:l,time:l.dist/veh.kmh,dist:l.dist});
  });
  var dist={}, prevLeg={}, prevNode={}, done={}, pq=[[0,start]];
  dist[start]=0;
  while(pq.length){
    pq.sort(function(a,b){return a[0]-b[0];});
    var cur=pq.shift(); var d=cur[0], u=cur[1];
    if(done[u]) continue; done[u]=true;
    if(u===end) break;
    (graph[u]||[]).forEach(function(e){
      var nd=d+e.time;
      if(dist[e.to]===undefined || nd<dist[e.to]-1e-9){
        dist[e.to]=nd; prevLeg[e.to]=e.leg.id; prevNode[e.to]=u;
        pq.push([nd,e.to]);
      }
    });
  }
  if(dist[end]===undefined) return null;
  var path=[], node=end, totalKm=0;
  while(node!==start){
    var legId=prevLeg[node];
    var leg=m.legs.filter(function(l){return l.id===legId;})[0];
    if(!leg){ break; }
    path.unshift(leg);
    totalKm+=leg.dist;
    node=prevNode[node];
  }
  return { path:path, hours:dist[end], km:totalKm };
}
function renderRoutePanel(){
  var m=currentMap(); var el=$('routeCard'); if(!el||!m) return;
  var opts=m.points.map(function(p,i){return '<option value="'+i+'">'+esc(p.name)+'</option>';}).join('');
  el.innerHTML=`<div class="card"><h3>🧭 路线时间计算</h3>
    <div class="row" style="gap:6px">
      <label>起点<select id="rtStart" onchange="onRouteSel()"><option value="-1">—</option>${opts}</select></label>
      <label>终点<select id="rtEnd" onchange="onRouteSel()"><option value="-1">—</option>${opts}</select></label>
      <label>载具<select id="rtVeh" onchange="onRouteSel()">${state.vehicles.map(function(v){return '<option value="'+v.id+'">'+esc(v.name)+' ('+v.kmh+'km/h)</option>';}).join('')}</select></label>
      <label>出发时刻<input type="time" id="rtClock" onchange="onClock()"></label>
    </div>
    <div id="routeOut" style="margin-top:10px"></div></div>`;
  if(m.points.length<2){ $('routeOut').innerHTML='<div class="hint">地图上至少要有 2 个地点才能规划路线。</div>'; return; }
  var selV=$('rtVeh'); if(routeSel.vehicle && state.vehicles.some(function(v){return v.id===routeSel.vehicle;})) selV.value=routeSel.vehicle;
  var s=$('rtStart'), e=$('rtEnd');
  if(routeSel.start>=0&&routeSel.start<m.points.length) s.value=routeSel.start;
  if(routeSel.end>=0&&routeSel.end<m.points.length) e.value=routeSel.end;
  if($('rtClock')) $('rtClock').value=clockInputVal();
  drawRouteOutput();
}
function clockInputVal(){
  var d=new Date(state.clockStart||Date.now());
  return pad2(d.getHours())+':'+pad2(d.getMinutes());
}
function onClock(){ var el=$('rtClock'); if(!el)return; var t=el.value||'09:00'; var hm=t.split(':'); var d=new Date(); d.setHours(num(hm[0]),num(hm[1]),0,0); state.clockStart=d.getTime(); saveStateQuiet(); drawRouteOutput(); }
function onRouteSel(){
  var m=currentMap(); if(!m)return;
  var s=$('rtStart'), e=$('rtEnd'), v=$('rtVeh');
  routeSel.start=num(s.value); routeSel.end=num(e.value); routeSel.vehicle=v.value; routeSel.overrides={};
  drawRouteOutput();
}
function vehicleById(id){ return state.vehicles.filter(function(v){return v.id===id;})[0]||null; }
function drawRouteOutput(){
  var out=$('routeOut'); if(!out) return;
  var m=currentMap(); if(!m){ out.innerHTML=''; return; }
  var s=num($('rtStart').value), e=num($('rtEnd').value), vId=$('rtVeh').value;
  routeSel.start=s; routeSel.end=e; routeSel.vehicle=vId;
  var base=computePath(s,e,vId);
  if(!base){ out.innerHTML='<div class="notice">⚠ 找不到通路：请确认起点终点之间有连通的“允许该载具”的道路。</div>'; routeSel.pathLegs=null; return; }
  routeSel.pathLegs=base.path.map(function(l){return l.id;});
  // 每段可选载具（道路允许范围内的）
  var rows=base.path.map(function(leg,i){
    var allowed=state.vehicles.filter(function(v){return legAllowed(leg,v.id);});
    var selV = routeSel.overrides[leg.id] || vId;
    if(!allowed.some(function(v){return v.id===selV;})) selV=allowed.length?allowed[0].id:vId;
    var veh=vehicleById(selV);
    var h=veh?leg.dist/veh.kmh:0;
    return {leg:leg,i:i,veh:veh,h:h,allowed:allowed,selV:selV};
  });
  var total=0; rows.forEach(function(r){total+=r.h;});
  var totalKm=0; rows.forEach(function(r){totalKm+=r.leg.dist;});
  var veh0=vehicleById(vId);
  var head = veh0? '以 '+esc(veh0.name)+'（'+veh0.kmh+'km/h）优先规划 · 全程 '+base.km.toFixed(1)+'km' : '';
  out.innerHTML=`<div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:4px">
      <div><b class="muted">路线：</b> ${rows.length?rows.map(function(r,i){return (i? ' → ':'')+'<b>'+esc(m.points[r.leg.a].name)+'</b>';}).join('')+(rows.length?' → <b>'+esc(m.points[rows[rows.length-1].leg.b].name)+'</b>':'') : ''}</div>
      <div><span class="badge good">总 ${totalKm.toFixed(1)} km · 约 ${fmtDur(total)}</span></div></div>
      ${head?'<div class="hint" style="margin-bottom:6px">'+head+'</div>':''}
      <div class="tblwrap"><table><thead><tr><th>路段</th><th>距离</th><th>载具(可换乘)</th><th>该段耗时</th><th>累计</th></tr></thead><tbody>`+
    rows.map(function(r,i){
      var acc=0; for(var k=0;k<=i;k++) acc+=rows[k].h;
      var opts=r.allowed.map(function(v){return '<option value="'+v.id+'"'+(r.selV===v.id?' selected':'')+'>'+esc(v.name)+'('+v.kmh+')</option>';}).join('');
      var cum=acc;
      return `<tr>
        <td>${i+1}. ${esc(m.points[r.leg.a].name)} → ${esc(m.points[r.leg.b].name)}${r.leg.note?' <span class=muted>('+esc(r.leg.note)+')</span>':''}</td>
        <td class="num">${Number(r.leg.dist).toFixed(1)} km</td>
        <td><select data-leg="${esc(r.leg.id)}" onchange="onLegOverride(this)">${opts}</select></td>
        <td class="num">${fmtDur(r.h)}</td>
        <td class="num">${fmtDur(cum)}${' · '+fmtClock(cum)}</td>
      </tr>`;
    }).join('')+`</tbody></table></div>
    <div class="row" style="margin-top:8px"><button class="small ghost" onclick="copyRouteText()">📋 复制路线文字</button></div>`;
  drawMapCanvas();
}
function onLegOverride(sel){
  routeSel.overrides[sel.dataset.leg]=sel.value;
  drawRouteOutput();
}
function routeTextLines(){
  var m=currentMap(); if(!m) return [];
  var out=$('routeOut'); if(!out) return [];
  var s=num($('rtStart').value), e=num($('rtEnd').value), vId=$('rtVeh').value;
  var base=computePath(s,e,vId); if(!base) return [];
  var lines=[];
  var acc=0;
  var vehName='';
  base.path.forEach(function(leg,i){
    var selV=routeSel.overrides[leg.id]||vId; var veh=vehicleById(selV);
    var h=veh?leg.dist/veh.kmh:0; acc+=h;
    lines.push((i+1)+'. '+m.points[leg.a].name+' → '+m.points[leg.b].name+' ｜'+(veh?veh.name:'')+' '+leg.dist+'km '+fmtDur(h)+' ｜'+' 累计 '+fmtDur(acc)+'（'+fmtClock(acc)+'到）');
    vehName=veh?veh.name:'';
  });
  return lines;
}
function copyRouteText(){
  var lines=routeTextLines();
  if(!lines.length){ toast('暂无可复制的路线'); return; }
  var txt=lines.join('\n');
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){toast('已复制');},function(){toast('复制失败，请手动复制');}); }
  else toast(txt, 6000);
}
function openHelp(){ $('helpModal').classList.add('open'); }

/* ================= 战斗桌 ================= */
var combActiveId=null;
function combatActors(kind){
  return state.actors.filter(function(a){return a.kind===kind;});
}

function onAddKindChange(){ renderCombatShell(); }





function combatNewRound(){
  var list=state.combat.participants.filter(function(c){return c.state!=='死亡'&&c.state!=='离场';});
  list.sort(function(x,y){return (y.dex||0)-(x.dex||0);});
  // 敏捷相同随机破平
  for(var i=1;i<list.length;i++){
    if(list[i].dex===list[i-1].dex && Math.random()<0.5){ var t=list[i]; list[i]=list[i-1]; list[i-1]=t; }
  }
  state.combat.participants=list.map(function(c){ c.done=false; return c; });
  state.combat.round=(state.combat.round||0)+1;
  combActiveId=null;
  saveState(); renderCombatRoster(); renderActivePanel();
  logRoll('── 第 '+state.combat.round+' 轮开始（按敏捷排序） ──','gold');
}
function combatantState(c){ return c.state||'正常'; }
function hpBar(c){
  var pct=Math.max(0,Math.min(100, c.hp.max? Math.round(c.hp.cur/c.hp.max*100):0));
  return `<div style="display:flex;align-items:center;gap:6px"><div class="bar hp" style="width:70px"><i style="width:${pct}%"></i></div><span class="num">${c.hp.cur}/${c.hp.max}</span></div>`;
}

var combTargetId=null;

function combSelectTarget(cid){ combTargetId=cid; toast('已将目标设为 '+combActiveName(cid)); renderActivePanel(); renderCombatRoster(); }
function combActiveName(cid){ var c=combById(cid); return c?c.name:''; }
function combById(cid){ return state.combat.participants.filter(function(c){return c.id===cid;})[0]||null; }
function activeComb(){ return combById(combActiveId); }

function toggleState(st){
  var c=activeComb(); if(!c) return;
  if(c.state===st) c.state='正常'; else c.state=st;
  if(c.state==='正常'&&st==='死亡') c.hp.cur=0;
  combSyncToActor({quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel(); if(typeof drawBattleScene==='function') drawBattleScene();
}
function applyDirectDmg(){
  var c=activeComb(); if(!c) return;
  var d=Math.max(0,num($('ap-dmg').value));
  c.hp.cur=Math.max(0,c.hp.cur-d);
  logRoll(c.name+' 受到 '+d+' 点伤害 → HP '+c.hp.cur+'/'+c.hp.max, 'bad');
  checkMajorWound(c,d);
  afterHpChange(c); combSyncToActor({quiet:true}); saveState(); renderCombatRoster(); renderActivePanel();
}
function applyDirectHeal(){
  var c=activeComb(); if(!c) return;
  var h=Math.max(0,num($('ap-heal').value));
  c.hp.cur=Math.min(c.hp.max,c.hp.cur+h);
  logRoll(c.name+' 恢复 '+h+' HP → '+c.hp.cur+'/'+c.hp.max,'good');
  if(c.state==='濒死'&&c.hp.cur>0) c.state='昏迷';
  combSyncToActor({quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel(); if(typeof drawBattleScene==='function') drawBattleScene();
}
function applyDirectSan(){
  var c=activeComb(); if(!c) return;
  var s=Math.max(0,num($('ap-san').value));
  if(c.san){ c.san.cur=Math.max(0,c.san.cur-s); }
  logRoll(c.name+' 理智损失 '+s+' → SAN '+c.san.cur,'purple');
  if(c.san&&c.san.cur<=0){ c.state='疯狂'; }
  combSyncToActor({quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel(); if(typeof drawBattleScene==='function') drawBattleScene();
}
function checkMajorWound(c,d){ if(c.hp.max && d>=Math.ceil(c.hp.max/2)) logRoll('💥 重创！'+c.name+' 单次损失≥生命一半，可能留下大伤','warn'); }
function afterHpChange(c){
  if(c.hp.cur<=0){ if(c.state!=='死亡'){ c.state='濒死/昏迷'; logRoll(c.name+' HP归零，濒死昏迷（每轮需急救/医疗或 CON 检定），若不处理随时可能死亡','bad'); } }
  else if(c.state==='濒死/昏迷'&&c.hp.cur>0) c.state='昏迷';
}
function combatAttackRoll(){
  var c=activeComb(); if(!c) return;
  if(c.state==='死亡'||c.state==='离场'){ toast('该成员已退场'); return; }
  var wpnSel=$('ap-wpn');
  var wi=(wpnSel&&wpnSel.value!=='')?num(wpnSel.value):0;
  var weapon = wi>=0 && c.weapons[wi] ? c.weapons[wi] : (c.weapons&&c.weapons[0]?c.weapons[0]:{name:'徒手',skill:'斗殴',damage:'1D3+DB',ammoCap:0,ammoCur:0});
  if(wi>=0&&c.weapons[wi]&&c.weapons[wi].ammoCap>0){
    var w=c.weapons[wi];
    if((w.ammoCur||0)<=0){ toast('「'+w.name+'」没有弹药，先装填'); return; }
  }
  var tgtSel=$('ap-target');
  var tid=(tgtSel&&tgtSel.value)?tgtSel.value:combTargetId;
  var t=combById(tid);
  if(!t){
    t=state.combat.participants.filter(function(x){return x.id!==c.id && x.state!=='死亡'&&x.state!=='离场';})[0]||null;
    if(!t){ toast('没有可攻击的目标'); return; }
  }
  var skillName=weapon.skill||'斗殴';
  var skillVal=25;
  (c.skills||[]).forEach(function(s){ if(s.name===skillName) skillVal=s.total; });
  var roll=rollDie(100);
  var level=judgePct(roll,skillVal);
  logRoll(c.name+' 用「'+weapon.name+'」攻击 '+t.name+'：D100='+roll+' vs '+skillName+' '+skillVal+' → '+level, 'info');
  if(level==='大失败'){ logRoll('💥 '+c.name+' 大失败！', 'bad'); return; }
  if(level.indexOf('成功')<0){ logRoll('未命中。','muted'); return; }
  // 命中：掷伤害
  var isCrit=(roll===1||level.indexOf('极难')>=0);
  var expr=applyDbToDamageExpr(weapon.damage, c.db);
  var dmg=rollExpr(expr).total;
  if(isCrit){
    // 大成功/极难：伤害骰按满值计算
    dmg=maxRollExpr(expr).total;
    logRoll('💫 极难/大成功命中，伤害按满值 '+dmg, 'gold');
  }
  // 弹药消耗
  var wObj=wi>=0?c.weapons[wi]:null;
  if(wObj&&wObj.ammoCap>0){ wObj.ammoCur=Math.max(0,(wObj.ammoCur||1)-1); }
  // 护甲：除非武器标了穿刺值，否则直接扣除护甲
  var armor=t.armor||0;
  var pierceVal=(weapon.pierce&&String(weapon.pierce)!=='—'&&String(weapon.pierce)!=='×')?(parseInt(String(weapon.pierce),10)||1):0;
  var effectiveArmor=Math.max(0, armor-pierceVal);
  var applied=Math.max(0, dmg-effectiveArmor);
  logRoll('伤害骰 '+expr+' = '+dmg+' 点'+(effectiveArmor>0?('（护甲减'+effectiveArmor+'）'):'')+' → '+t.name+' 扣 '+applied+' HP','bad');
  t.hp.cur=Math.max(0,(t.hp.cur||0)-applied);
  checkMajorWound(t,applied);
  afterHpChange(t);
  combSyncParticipant(c,{quiet:true});
  combSyncParticipant(t,{quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel();
  // 目标濒死检查展示
}
function maxRollExpr(expr){
  // 把骰子按满值替换后求值
  var s=String(expr||'').toUpperCase();
  return rollExpr(s.replace(/(\d*)D(\d+)/g, function(m,c,d){ var n=parseInt(c||'1',10)||1; return n*(parseInt(d,10)||1); }));
}
function combReload(){
  var c=activeComb(); if(!c) return;
  var wpnSel=$('ap-wpn');
  var wi=(wpnSel&&wpnSel.value!=='')?num(wpnSel.value):0;
  var w=c.weapons&&c.weapons[wi]; if(!w||!w.ammoCap) return;
  var idx=(c.inv||[]).findIndex(function(it){return it.effect==='ammo'&&it.qty>0;});
  if(idx<0){ toast('背包里没有“弹药”类道具'); return; }
  c.inv[idx].qty--;
  w.ammoCur=w.ammoCap;
  logRoll(c.name+' 用「'+c.inv[idx].name+'」装填 '+w.name+' → 弹药 '+w.ammoCur+'/'+w.ammoCap,'gold');
  combSyncToActor({quiet:true});
  saveState(); renderActivePanel();
}
function combUseItem(){
  var c=activeComb(); if(!c) return;
  var ii=num($('ap-item').value); if(ii<0){ toast('没有可用道具'); return; }
  var it=c.inv[ii]; if(!it||it.qty<=0) return;
  var amount=it.amount||(it.effect==='heal'?'1':it.effect==='san'?'1':it.effect==='mp'?'1':'0');
  var r=rollExpr(amount);
  var dmgVal=r.total;
  if(it.effect==='heal'){ c.hp.cur=Math.min(c.hp.max,(c.hp.cur||0)+dmgVal); logRoll(c.name+' 使用「'+it.name+'」治疗 '+dmgVal+' HP → '+c.hp.cur+'/'+c.hp.max,'good'); }
  else if(it.effect==='san'){ if(c.san){ c.san.cur=Math.min(c.san.max,(c.san.cur||0)+dmgVal);} logRoll(c.name+' 使用「'+it.name+'」回复 '+dmgVal+' SAN','good'); }
  else if(it.effect==='mp'){ if(c.mp){ c.mp.cur=Math.min(c.mp.max,(c.mp.cur||0)+dmgVal);} logRoll(c.name+' 使用「'+it.name+'」回复 '+dmgVal+' MP','good'); }
  else if(it.effect==='ammo'){ logRoll('「'+it.name+'」已记入弹药（请在装填面板使用）','muted'); }
  else { logRoll(c.name+' 使用了「'+it.name+'」','info'); }
  it.qty--;
  combSyncToActor({quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel(); if(typeof drawBattleScene==='function') drawBattleScene();
}

/* ================= 载具设置 / 骰子 / 备份 ================= */
function renderVehicleTable(){
  var el=$('vehiclesTable'); if(!el) return;
  el.innerHTML=`<div class="tblwrap"><table><thead><tr><th>载具/方式</th><th class="num">时速 km/h</th><th>备注</th><th></th></tr></thead><tbody>`+
    state.vehicles.map(function(v,i){
      return `<tr>
        <td><input type="text" value="${esc(v.name)}" data-i="${i}" data-k="name" onchange="onVehInput(this)" style="width:150px"></td>
        <td><input type="number" value="${v.kmh}" data-i="${i}" data-k="kmh" onchange="onVehInput(this)" style="width:90px" min="0"></td>
        <td><input type="text" value="${esc(v.note||'')}" data-i="${i}" data-k="note" onchange="onVehInput(this)" style="width:100%"></td>
        <td><button class="small danger" onclick="delVehicle(${i})">✕</button></td>
      </tr>`;
    }).join('')+`</tbody></table></div>
    <div class="hint" style="margin-top:6px">每小时行进公里数 = 时间计算口径；也可把这里的数值改成你的团版规则（如 1920s 破车 35km/h）。</div>`;
}




function renderVehicleRelated(){ renderMapsShell(); renderRoutePanel(); }

function renderSettings(){
  renderVehicleTable();
  var el=$('storageStatus');
  if(el){
    var ok=true;
    try{ localStorage.setItem('__probe','1'); localStorage.removeItem('__probe'); }catch(e){ ok=false; }
    el.textContent='本地存储：'+(ok?'可用 ✔（数据将自动保存到本浏览器）':'不可用 ✖（浏览器限制 file:// 下的存储，请用右上角导出/导入 JSON 备份）');
  }
}


function quickDiceCustom(){
  var v=$('customDice').value; if(!v.trim()) return;
  quickDice(v);
}

function download(fname, text){
  var blob=new Blob([text],{type:'application/json'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
}
function exportBackup(){
  download('跑团助手备份-'+new Date().toISOString().slice(0,10)+'.json', JSON.stringify(state,null,2));
  toast('备份已导出');
}
function restoreBackup(ev){
  var f=ev.target.files&&ev.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){
    try{
      var d=JSON.parse(r.result);
      if(!d||!d.actors||!d.maps){ toast('备份文件格式不对'); return; }
      if(!confirmBox('用备份覆盖当前所有数据？')){ ev.target.value=''; return; }
      state=d;
      if(!state.vehicles) state.vehicles=defaultVehicles();
      if(!state.combat) state.combat={round:0,participants:[]};
      saveState();
      switchTab('surveyors');
      toast('备份已恢复');
    }catch(e){ toast('读取失败：'+e.message); }
    ev.target.value='';
  };
  r.readAsText(f);
}
function wipeData(){
  if(!confirmBox('真的要清空全部数据吗？建议先导出备份。')) return;
  if(!confirmBox('再次确认：所有调查员/NPC/地图/战斗记录将删除。')) return;
  try{ localStorage.removeItem(LS_KEY); }catch(e){}
  state=defaultState();
  saveStateQuiet();
  switchTab('surveyors');
  toast('已清空并重建空数据');
}
