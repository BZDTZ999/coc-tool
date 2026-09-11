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
      <input type="text" class="w-type" list="cocWeaponTypes" value="${esc(w.type||'')}" placeholder="类型（可下拉）" style="width:118px"
             title="选卡里「武器列表」的类型：技能/伤害/射程/弹匣会照卡自动填好；导出后卡里也保留同款公式，改类型会自己重算"
             onchange="onWeaponTypePick(this)">
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
  /* 类型要写卡里「武器列表」的真名字（预设第一列只是分组名）——
     对上就用真类型，导出后 Excel 里选类型才会自动算伤害/射程/贯穿/次数/装弹量/故障值。 */
  var tp=row.querySelector('.w-type');
  if(tp){ var info=cocWeaponTypeInfo(preset[1]); tp.value=(info?info.type:preset[0]); }
}



/* ---------- 武器「类型」下拉 ----------
   《空白人物卡》里「武器列表」工作表就是“类型 → 技能/伤害/射程/贯穿/每轮/装弹量/故障值”，
   模板靠 VLOOKUP 用它自动填。工具这边读同一张表，选了类型就照卡把这几项填好；
   导出时卡里也会保留同款公式（见 25-card-export.js 的武器段），所以在 Excel 里改类型同样会重算。 */
var _cocWeaponTypes=null;
var _cocWeaponTypesCard='';
/* 4 张卡的武器表名不一样（武器列表 / 武器列表 战斗），统一在这里取。 */
function cocWeaponSheet(wb){
  if(!wb||!wb.Sheets) return null;
  var names=['武器列表','武器列表 战斗','武器列表战斗'];
  for(var i=0;i<names.length;i++) if(wb.Sheets[names[i]]) return {name:names[i], ws:wb.Sheets[names[i]]};
  for(var j=0;j<wb.SheetNames.length;j++) if(/武器列表/.test(wb.SheetNames[j])) return {name:wb.SheetNames[j], ws:wb.Sheets[wb.SheetNames[j]]};
  return null;
}
function cocWeaponTypes(cardId){
  cardId=cardId||(typeof COC_CARD_DEFAULT!=='undefined'?COC_CARD_DEFAULT:'');
  if(_cocWeaponTypes && _cocWeaponTypesCard===cardId) return _cocWeaponTypes;
  _cocWeaponTypes=[];
  try{
    if(typeof ensureBlankCard!=='function'||typeof XLSX==='undefined') return _cocWeaponTypes;
    ensureBlankCard(function(bytes){
      try{
        var wb=XLSX.read(bytes,{type:'array'});
        var hit=cocWeaponSheet(wb); if(!hit) return;
        var ws=hit.ws;
        var rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
        var out=[];
        rows.forEach(function(row,idx){
          if(idx<1||!row) return;
          var t=row[1]; if(t==null||String(t).trim()==='') return;
          function st(v){ return v==null?'':String(v).trim(); }
          out.push({type:String(t).trim(),skill:st(row[2]),damage:st(row[3]),range:st(row[4]),
                    pierce:st(row[5]),attacks:st(row[6]),ammo:st(row[7]),jam:st(row[8])});
        });
        _cocWeaponTypes=out; _cocWeaponTypesCard=cardId;
        try{ fillWeaponTypeDatalist(); }catch(e){}
        window.__cocWeaponSheetName=hit.name;
      }catch(e){}
    }, cardId);
  }catch(e){}
  return _cocWeaponTypes;
}
function cocWeaponTypeInfo(t){
  var list=cocWeaponTypes(), cands=weaponTypeCandidates(t);
  for(var i=0;i<cands.length;i++){
    var hit=weaponTypeFind(list, cands[i], function(x){ return x.type; });
    if(hit) return hit;
  }
  return null;
}
function fillWeaponTypeDatalist(){
  var dl=document.getElementById('cocWeaponTypes'); if(!dl) return;
  var list=cocWeaponTypes(); if(!list.length) return;
  dl.innerHTML=list.map(function(x){ return '<option value="'+esc(x.type)+'"></option>'; }).join('');
}
/* 选了类型：照「武器列表」把技能/伤害/射程/弹匣填好（跟卡里 VLOOKUP 的结果一致） */
function onWeaponTypePick(inp){
  var info=cocWeaponTypeInfo(inp&&inp.value); if(!info) return;
  var row=inp.closest('.wrow'); if(!row) return;
  [['.w-skill',info.skill],['.w-dmg',info.damage],['.w-range',info.range]].forEach(function(t){
    var el=row.querySelector(t[0]); if(el) el.value=t[1];
  });
  var cap=row.querySelector('.w-cap');
  if(cap && num(info.ammo)>0) cap.value=num(info.ammo);
}

/* 原卡右侧「背包格」那一列的东西，跟左边「物品名称」列一样都算「背包 / 随身用品」，
   全部并进 a.inv 一条清单里编辑（不再单开一个框、也不再让玩家选列）。
   slot='bag' 只作为“导入时它原来在哪一列”的记号，导出时自动写回同一列；
   玩家新加的物品 slot 为空 → 写进左边的「物品名称」列，左边满了自动溢到背包格列。 */
function migrateBagToInv(a){
  if(!a) return a;
  if(!a.inv) a.inv=[];
  if(a.bag && a.bag.length){
    a.bag.forEach(function(line){
      var nm=String(line==null?'':line).replace(/\s+/g,' ').trim();
      if(!nm) return;
      for(var i=0;i<a.inv.length;i++){ var it=a.inv[i]; if(it && it.slot==='bag' && String(it.name||'').trim()===nm) return; }
      a.inv.push({name:nm,qty:1,effect:'',amount:'',note:'',slot:'bag'});
    });
  }
  a.bag=[];
  return a;
}
function invRowHTML(it){
  var eff=it.effect||'';
  var wasBag=(it.slot==='bag')?' data-slot="bag"':'';
  return `<div class="listitem"${wasBag} style="margin-bottom:6px"><div class="row" style="gap:6px;flex-wrap:wrap">
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
function addInvRow(){ var box=$('am-inv'); if(!box)return; var d=document.createElement('div'); d.innerHTML=invRowHTML({name:'',qty:1,effect:'',amount:'',note:'',slot:''}); box.appendChild(d.firstChild); }
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
  /* 输入框填的是“1 格 = 多少 km”，格子边长 MAP_GRID_PX 像素，换算成 km/px 存储 */
  var perGrid=Math.max(0,num($('mapScale').value));
  m.kmPerPx=perGrid>0?Math.max(0.000001,perGrid/MAP_GRID_PX):0.02;
  /* 自动里程的道路跟着新比例尺重算；手动改过里程的（auto=false）保持不动 */
  var n=0;
  (m.legs||[]).forEach(function(leg){
    if(leg.auto===false) return;
    if(!m.points[leg.a]||!m.points[leg.b]) return;
    var d=Math.sqrt(Math.pow(m.points[leg.a].x-m.points[leg.b].x,2)+Math.pow(m.points[leg.a].y-m.points[leg.b].y,2))*m.kmPerPx;
    leg.dist=Math.round(d*100)/100; n++;
  });
  saveState(); renderMapsShell();
  toast('比例尺：1格='+(Math.round(m.kmPerPx*MAP_GRID_PX*1000)/1000)+'km'+(n?('，已按新比例尺重算 '+n+' 条道路'):''));
}
function vehAssignName(id){
  var a=state.actors.filter(function(x){return x.id===id;})[0];
  return a?a.name:'';
}
function renderMapVehicles(){
  var box=$('mapVehicles'); if(!box) return;
  /* 载具速度表是全局的（不属于某张地图），没有地图也要能看/改 —— 以前这里要求 currentMap()，
     地图一旦被删光，整个列表就空白了。 */
  var m=currentMap();
  if(!Array.isArray(state.vehicles)) state.vehicles=defaultVehicles();
  var onMapActors=((m&&m.tokens)||[]).map(function(t){return t.actorId;});
  var actorsOnMap=state.actors.filter(function(a){return onMapActors.indexOf(a.id)>=0;});
  box.innerHTML=`<div class="smallgrid">`+state.vehicles.map(function(v,i){
    var opts='<option value="">— 不指定 —</option>'+actorsOnMap.map(function(a){
      return '<option value="'+a.id+'"'+(v.assign===a.id?' selected':'')+'>'+esc(a.name)+'</option>';
    }).join('');
    return `<div class="listitem vehcard">
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
