/* ---------- 角色编辑弹窗（v2） ---------- */
var HIST_LABELS = [
  ['appearance','形象 / 外貌'],['beliefs','思想与信念'],['people','重要之人'],['places','意义非凡之地'],
  ['belongings','宝贵之物'],['traits','特质'],['secrets','难言之隐'],['scars','伤口与疤痕'],['phobias','恐惧症与狂躁症']
];

function avatarPrevHTML(){ var el=$('am-avatar-prev'); if(el){ var cur=currentActorModal; var c=cur.avatar&&cur.avatar.custom; el.innerHTML=c? '<span class="avatar lg"><img src="'+esc(c)+'"></span>' : '<span class="avatar lg">'+(cur.avatar&&cur.avatar.preset||AVATAR_DEFAULT_PC)+'</span>'; } }
function setAvatarPreset(btn, emoji){
  if(!currentActorModal) return;
  if(!currentActorModal.avatar) currentActorModal.avatar={};
  currentActorModal.avatar.preset=emoji;
  currentActorModal.avatar.custom=null;
  document.querySelectorAll('#actorModal .preset-picker button').forEach(function(b){ b.classList.toggle('on', b.textContent===emoji); });
  avatarPrevHTML();
}
function pickAvatarFile(){ var f=$('am-avatar-file'); if(f) f.click(); }
function onAvatarFile(e){
  var f=e.target.files&&e.target.files[0]; if(!f) return;
  if(!/^image\//.test(f.type)){ toast('请选择图片文件'); return; }
  var r=new FileReader();
  r.onload=function(){
    if(!currentActorModal) return;
    if(!currentActorModal.avatar) currentActorModal.avatar={};
    currentActorModal.avatar.custom=r.result;
    avatarPrevHTML();
    toast('已上传自定义头像');
  };
  r.readAsDataURL(f);
  e.target.value='';
}
function clearAvatarCustom(){ if(currentActorModal&&currentActorModal.avatar){ currentActorModal.avatar.custom=null; avatarPrevHTML(); } }
function applyArmorPreset(sel){
  var v=sel.value; if(v==='') return;
  var arm=$('am-armor'), t=$('am-armtype');
  var label=sel.options[sel.selectedIndex].text;
  if(arm) arm.value=v;
  if(t) t.value=label.replace(/（护甲.*/,'');
}
function weaponPresetOptions(){
  var groups={};
  PRESET_WEAPONS.forEach(function(w){ (groups[w[0]]=groups[w[0]]||[]).push(w); });
  var gi=0;
  return '<option value="">— 预置武器（自动填技能/伤害/射程）—</option>'+Object.keys(groups).map(function(g){
    return '<optgroup label="'+esc(g)+'">'+groups[g].map(function(w){
      var cur=gi; gi++;
      return '<option value="'+cur+'">'+esc(w[1]+' ｜'+w[3]+' ｜'+w[2])+'</option>';
    }).join('')+'</optgroup>';
  }).join('');
}
function weaponPresetRowHTML(w){
  var cap=w.ammoCap||0;
  return `<div class="listitem wrow" style="margin-bottom:6px">
    <div class="row" style="gap:6px;flex-wrap:wrap">
      <select class="wp-preset" style="max-width:340px;flex:1" onchange="fillPresetWeapon(this)">
        ${weaponPresetOptions()}
      </select>
      <span class="hint">选后仍可逐项修改</span>
      <button class="small danger" onclick="this.closest('.wrow').remove()">✕</button>
    </div>
    <div class="row" style="gap:6px;margin-top:5px;flex-wrap:wrap">
      <input type="text" class="w-name" value="${esc(w.name||'')}" placeholder="武器名称" style="width:120px">
      <input type="text" class="w-skill" value="${esc(w.skill||'')}" placeholder="使用技能" style="width:90px">
      <input type="text" class="w-dmg" value="${esc(w.damage||'')}" placeholder="伤害 如 1D8+DB" style="width:120px">
      <input type="text" class="w-range" value="${esc(w.range||'')}" placeholder="射程" style="width:80px">
      <input type="text" class="w-type" value="${esc(w.type||'')}" placeholder="类型" style="width:70px" hidden>
      <label style="flex-direction:row;align-items:center">弹匣<input type="number" class="w-cap" value="${cap||0}" style="width:58px"></label>
    </div></div>`;
}
function fillPresetWeapon(sel){
  var i=num(sel.value);
  var preset=PRESET_WEAPONS[i]; if(!preset) return;
  var row=sel.closest('.wrow'); if(!row) return;
  row.querySelector('.w-name').value=preset[1];
  row.querySelector('.w-skill').value=preset[2];
  row.querySelector('.w-dmg').value=preset[3];
  row.querySelector('.w-range').value=preset[4];
  var cap=row.querySelector('.w-cap'); if(cap) cap.value=preset[5]||0;
  var tp=row.querySelector('.w-type'); if(tp) tp.value=preset[0];
}



function invRowHTML(it){
  var eff=it.effect||'';
  return `<div class="listitem" style="margin-bottom:6px"><div class="row" style="gap:6px;flex-wrap:wrap">
    <input type="text" class="inv-name" value="${esc(it.name)}" placeholder="物品名称" style="flex:1;min-width:130px">
    <input type="number" class="inv-qty" value="${num(it.qty)||0}" style="width:64px" min="0" title="数量">
    <select class="inv-effect" style="width:130px">
      ${[['','无特殊效果'],['heal','治疗 HP'],['san','回复 SAN'],['mp','回复 MP'],['ammo','弹药(装填用)'],['other','其他(自定)']].map(function(o){return '<option value="'+o[0]+'"'+(eff===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')}
    </select>
    <input type="text" class="inv-amount" value="${esc(it.amount||'')}" placeholder="量 如1D3" style="width:82px">
    <input type="text" class="inv-note" value="${esc(it.note||'')}" placeholder="备注/效果说明" style="flex:1.4;min-width:140px">
    <button class="small danger" onclick="this.closest('.listitem').remove()">✕</button>
  </div></div>`;
}
function addInvRow(){ var box=$('am-inv'); if(!box)return; var d=document.createElement('div'); d.innerHTML=invRowHTML({name:'',qty:1,effect:'',amount:'',note:''}); box.appendChild(d.firstChild); }
function bindSkillTable(){}
function bindWeaponTable(){}
function bindInvTable(){}


function recomputeDerived(){ /* v2 不再显示推算条 */ }

/* ================= 地图：角色 / 摆件 / 载具 ================= */
var MAP_TOOLS_PALETTE=[['🏠','房'],['🏢','楼'],['🏰','堡'],['🌳','树'],['🌲','松'],['🪨','石'],['🪵','柴'],['🚪','门'],['🪟','窗'],['🛏','床'],['🪑','椅'],['🛢','桶'],['🚗','车'],['⛵','船'],['🕯','烛'],['⚰','棺'],['🪦','碑'],['🗿','像']];

function actorSideOrder(side){ return SIDES.indexOf(side)>=0?SIDES.indexOf(side):1; }
function renderMapActorsBox(){
  var box=$('mapActorsBox'); if(!box) return;
  var m=currentMap(); if(!m){ box.innerHTML=''; return; }
  var groups={};
  state.actors.forEach(function(a){ var s=sideOf(a); (groups[s]=groups[s]||[]).push(a); });
  var html='';
  SIDES.forEach(function(s){
    var list=groups[s]||[];
    if(!list.length) return;
    html+='<div class="sectiontitle" style="margin:8px 0 4px">'+esc(s)+'（'+list.length+'）</div>';
    html+=list.map(function(a){
      var on=!!(m.tokens||[]).some(function(t){return t.actorId===a.id;});
      return '<div class="actorpill '+(on?'on':'')+'" onclick="toggleMapToken(\''+a.id+'\')" title="点击'+(on?'移出':'加入')+'地图">'
        +avatarView(a,'sm')+'<span class="nm">'+esc(a.name)+'</span>'+(on?'<span style="color:#8fd69b">✓</span>':'')+'</div>';
    }).join('');
  });
  box.innerHTML=html||'<div class="hint">还没有可放的角色：先到「调查员 / NPC」页创建。</div>';
}
function toggleMapToken(actorId){
  var m=currentMap(); if(!m) return;
  m.tokens=m.tokens||[];
  var i=m.tokens.findIndex(function(t){return t.actorId===actorId;});
  if(i>=0) m.tokens.splice(i,1);
  else {
    // 找一个不与其他重叠的位置
    var tried=0,x=500,y=320;
    do { x=120+Math.random()*760; y=70+Math.random()*480; tried++; } while(tried<40 && m.tokens.some(function(t){ return t.x&&t.y&&Math.hypot(t.x-x,t.y-y)<80; }));
    m.tokens.push({actorId:actorId,x:x,y:y});
  }
  saveState(); renderMapActorsBox(); drawMapCanvas();
}


function genIsoFloor(){
  var m=currentMap(); if(!m) return;
  m.iso=!m.iso;
  saveState(); drawMapCanvas();
  toast(m.iso?'已开启伪3D菱形地面（叠加在底图上）':'已关闭伪3D地面');
}
function onScaleChange(){
  var m=currentMap(); if(!m||!$('mapScale')) return;
  m.kmPerPx=Math.max(0.0001,num($('mapScale').value))||0.02;
  saveState(); toast('比例尺：1px='+m.kmPerPx+'km（影响自动距离预填）');
}
function vehAssignName(id){
  var a=state.actors.filter(function(x){return x.id===id;})[0];
  return a?a.name:'';
}
function renderMapVehicles(){
  var box=$('mapVehicles'); if(!box) return;
  var m=currentMap(); if(!m){ box.innerHTML=''; return; }
  var onMapActors=(m.tokens||[]).map(function(t){return t.actorId;});
  var actorsOnMap=state.actors.filter(function(a){return onMapActors.indexOf(a.id)>=0;});
  box.innerHTML=`<div class="smallgrid">`+state.vehicles.map(function(v,i){
    var opts='<option value="">— 不指定 —</option>'+actorsOnMap.map(function(a){
      return '<option value="'+a.id+'"'+(v.assign===a.id?' selected':'')+'>'+esc(a.name)+'</option>';
    }).join('');
    return `<div class="listitem" style="padding:6px 8px;margin-bottom:6px">
      <div class="vehrow">
        <input type="text" value="${esc(v.name)}" data-i="${i}" data-k="name" onchange="onVehInput(this)" title="名称">
        <input type="number" value="${v.kmh}" data-i="${i}" data-k="kmh" onchange="onVehInput(this)" min="0" title="km/h">
      </div>
      <div class="row" style="margin-top:4px;gap:4px">
        <select data-i="${i}" data-k="assign" onchange="onVehInput(this)" title="分配给谁" style="flex:1">${opts}</select>
        <button class="small danger" onclick="delVehicle(${i})">✕</button>
      </div>
      <input type="text" value="${esc(v.note||'')}" data-i="${i}" data-k="note" onchange="onVehInput(this)" placeholder="备注（含停站等）" style="width:100%;margin-top:3px">
    </div>`;
  }).join('')+`</div>
  <button class="small" style="width:100%" onclick="addVehicle()">＋ 添加载具/方式</button>
  <div class="hint" style="margin-top:6px">速度以 km/h 计，供路线与时间换算。绿色箭头小标=分配给角色。</div>`;
}
function onVehInput(e){
  var v=state.vehicles[num(e.dataset.i)]; if(!v) return;
  var k=e.dataset.k;
  v[k]= k==='kmh'?Math.max(0,num(e.value)): e.value;
  saveStateQuiet(); renderMapVehicles();
  if(k==='kmh'){ drawRouteOutput(); }
}
function addVehicle(){ state.vehicles.push({id:uid('v'),name:'新载具/方式',kmh:40,note:'',assign:''}); saveState(); renderMapVehicles(); }
function resetVehicles(){ state.vehicles=defaultVehicles(); saveState(); renderMapVehicles(); toast('已恢复默认速度'); }
