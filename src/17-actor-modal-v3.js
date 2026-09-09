/* ---------- D. 角色编辑弹窗：新增法术区（PC 与 NPC 通用） + 可自定义阵营 ---------- */
function onSideEdit(sel){
  if(!currentActorModal) return;
  if(sel.value==='__custom__'){
    var nm=prompt('自定义阵营名称（如：教会 / 佣兵团 / 邪教）：', currentActorModal.side||'');
    if(nm===null || !String(nm).trim()){ sel.value=currentActorModal.side||'敌人'; return; }
    nm=String(nm).trim();
    var opt=document.createElement('option'); opt.value=nm; opt.text=nm;
    sel.appendChild(opt); sel.value=nm;
  }
  currentActorModal.side=sel.value;
}
function openActorModal(id, kind){
  var a=null;
  if(id){ a=state.actors.filter(function(x){return x.id===id;})[0]; }
  kind=kind||(a?a.kind:'pc');
  if(!a){
    var side = kind==='pc'?'调查员':'敌人';
    a={id:uid(kind==='pc'?'pc':'npc'),kind:kind,side:side,count:1,name:'',player:'',occupation:'',era:'',age:'',sex:'',
       residence:'',hometown:'',avatar:{preset:AVATAR_DEFAULT_PC,custom:null},
       attrs:{str:0,con:0,pow:0,dex:0,app:0,siz:0,int:0,edu:0,luck:0},
       hp:{cur:0,max:0},mp:{cur:0,max:0},san:{cur:0,max:99},mov:8,db:'-2',build:'0',
       armor:{value:0,type:''},skills:[],weapons:[],inv:[],spells:[],cash:0,currency:'美元',
       history:{appearance:'',beliefs:'',people:'',places:'',belongings:'',traits:'',secrets:'',scars:'',phobias:''},
       backstory:'',campaigns:[],notes:'',template:'',note:'',player:''};
  }
  if(!a.avatar) a.avatar={preset:a.kind==='npc'?defaultAvatarForActor('npc',sideOf(a)):AVATAR_DEFAULT_PC,custom:null};
  if(!a.history) a.history={};
  if(!a.spells) a.spells=[];
  if(!a.plot) a.plot=[];
  if(a.kind==='npc' && a.side==='调查员') a.side='盟友';
  currentActorModal=a; editingActorId=a.id;
  var mask=$('actorModal');
  var skillRows=(a.skills||[]).map(function(s){
    var p=skillChipParts(s.name,s.total,s.base);
    return {chip:chipSkillHTML(s.name,s.total,s.base), added:p.added};
  });
  var skillChips=skillRows.filter(function(r){return r.added;}).map(function(r){return r.chip;}).join('');
  var defaultSkillChips=skillRows.filter(function(r){return !r.added;}).map(function(r){return r.chip;}).join('');
  var defaultSkillCount=skillRows.length-skillRows.filter(function(r){return r.added;}).length;
  var weaponRows=(a.weapons||[]).map(function(w,i){return weaponPresetRowHTML(w);}).join('');
  var invRows=(a.inv||[]).map(function(it){return invRowHTML(it);}).join('');
  var plotRows=(a.plot||[]).map(function(it){return plotRowHTML(it);}).join('');
  var spellRows=(a.spells||[]).map(function(sp){return spellRowHTML(sp);}).join('');
  var s=sideOf(a);
  var choices = a.kind==='npc' ? SIDES.filter(function(x){return x!=='调查员';}) : SIDES.slice();
  var sideOptions=choices.map(function(x){return '<option value="'+x+'"'+(s===x?' selected':'')+'>'+x+'</option>';}).join('');
  if(SIDES.indexOf(s)<0){ sideOptions+='<option value="'+esc(s)+'" selected>'+esc(s)+'</option>'; }
  if(a.kind==='npc' && s==='调查员'){ sideOptions='<option value="盟友" selected>盟友</option>'+sideOptions; }
  sideOptions+='<option value="__custom__">✎ 自定义阵营…</option>';
  var histHTML=(a.kind==='pc'?HIST_LABELS.map(function(h){
    return '<div style="grid-column: span 1"><label>'+h[1]+'<textarea rows="2" id="am-hist-'+h[0]+'">'+esc(a.history[h[0]]||'')+'</textarea></label></div>';
  }).join(''):'');
  var campaignRows=(a.kind==='pc'?(Array.isArray(a.campaigns)?a.campaigns:[]).map(function(c){return campaignRowHTML(c);}).join(''):'');
  var avatarPresetButtons=AVATAR_PRESETS.map(function(e){
    return '<button type="button" class="'+(a.avatar.preset===e?'on':'')+'" onclick="setAvatarPreset(this,\''+e+'\')">'+e+'</button>';
  }).join('');
  mask.innerHTML=`<div class="modal">
    <div class="modal-head"><b>${a.kind==='npc'?'编辑 NPC / 敌人':'编辑调查员'}：${esc(a.name||'(未命名)')}</b>
      <div class="row"><button class="ghost small" onclick="saveActorModal()">💾 保存</button><button class="ghost" onclick="closeActorModal()">✕</button></div></div>
    <div class="modal-body">
      <div class="avatar-area">
        <div style="flex:1;min-width:280px">
          <div class="grid3">
            <label>名称 <input type="text" id="am-name" value="${esc(a.name)}"></label>
            ${a.kind==='pc'?'<label>玩家 <input type="text" id="am-player" value="'+esc(a.player)+'"></label>':''}
            ${a.kind==='npc'?'<label>分类标签 <input type="text" id="am-tpl" value="'+esc(a.template||'')+'" placeholder="如 邪教徒 / 神话生物"></label>':''}
            ${a.kind==='pc'?'<label>职业 <input type="text" id="am-occ" value="'+esc(a.occupation)+'"></label>':'<label>数量(个体) <input type="number" id="am-count" value="'+(a.count||1)+'" min="1"></label>'}
            ${a.kind==='pc'?'<label>年龄 <input type="text" id="am-age" value="'+esc(a.age)+'"></label>':''}
            ${a.kind==='npc'?'<label>备注/行为 <input type="text" id="am-note" value="'+esc(a.note||'')+'"></label>':'<label>性别 <input type="text" id="am-sex" value="'+esc(a.sex)+'"></label>'}
            ${a.kind==='pc'?'<label>时代 <input type="text" id="am-era" value="'+esc(a.era)+'"></label>':''}
            ${a.kind==='pc'?'<label>住地 <input type="text" id="am-res" value="'+esc(a.residence)+'"></label>':''}
            ${a.kind==='pc'?'<label>故乡 <input type="text" id="am-home" value="'+esc(a.hometown||'')+'"></label>':''}
          </div>
          <div class="row" style="margin-top:8px">
            <label>阵营<select id="am-side" onchange="onSideEdit(this)">${sideOptions}</select></label>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:none">
          <div id="am-avatar-prev">${avatarView(a,'lg')}</div>
          <label class="muted" style="flex-direction:row;align-items:center">上传头像
            <input type="file" id="am-avatar-file" accept="image/*" style="display:none" onchange="onAvatarFile(event)"></label>
          <div class="row" style="gap:4px">
            <button class="small ghost" onclick="pickAvatarFile()">📁 选图</button>
            ${a.avatar.custom?'<button class="small danger" onclick="clearAvatarCustom()">清除自定义</button>':''}
          </div>
        </div>
      </div>
      <div class="avatar-area" style="margin-top:6px;align-items:flex-start">
        <div class="hint" style="flex:1">默认头像（点击切换）：</div>
        <div class="preset-picker" style="flex:3">${avatarPresetButtons}</div>
      </div>
      <h4 class="sectiontitle">⚜ 属性（9项 · 3×3，中英对照）</h4>
      ${attrs3x3(a,true)}
      <div class="grid3" style="margin-top:10px">
        <label>移动 MOV<input type="number" id="am-mov" value="${a.mov||8}"></label>
        <label>护甲值<input type="number" id="am-armor" value="${(a.armor&&a.armor.value)||0}" min="0"></label>
        <label>护甲类型<input type="text" id="am-armtype" value="${esc(a.armor&&a.armor.type||'')}" placeholder="如 皮夹克"></label>
      </div>
      <div class="row" style="margin-top:6px;align-items:flex-end">
        <label>护甲预置<select id="am-armor-preset" onchange="applyArmorPreset(this)">
          <option value="">— 参考防具表预置 —</option>
          ${PRESET_ARMORS.map(function(x){return '<option value="'+x[1]+'">'+esc(x[0])+'（护甲'+x[1]+'）</option>';}).join('')}
        </select></label>
        <span class="hint">选择后会自动填值，仍可手改</span>
      </div>
      <h4 class="sectiontitle">🩸 生命 / 理智 / 魔力（上限与当前）</h4>
      <div class="grid3">
        <label>当前 HP<input type="number" id="am-hpcur" value="${a.hp.cur||0}" min="0"></label>
        <label>最大 HP<input type="number" id="am-hpmax" value="${a.hp.max||0}" min="0"></label>
        <label>当前 SAN<input type="number" id="am-sancur" value="${a.san?a.san.cur:0}" min="0"></label>
        <label>最大 SAN<input type="number" id="am-sanmax" value="${a.san?a.san.max:99}" min="1"></label>
        <label>当前 MP<input type="number" id="am-mpcur" value="${a.mp?a.mp.cur:0}" min="0"></label>
        <label>最大 MP<input type="number" id="am-mpmax" value="${a.mp?a.mp.max:0}" min="0"></label>
      </div>
      <h4 class="sectiontitle" id="am-skill-title">🎯 已加点 / 自定义技能（${skillRows.filter(function(r){return r.added;}).length}）</h4>
      <div class="skillchips" id="am-skills">${skillChips||'<span class="hint sk-empty-hint">（暂无——加点过的技能会高亮出现在这里）</span>'}</div>
      <div style="margin-top:6px"><button class="small" onclick="addSkillRow()">＋ 加一项技能</button>
        <span class="hint"> 只有高于基础值才算已加点；等于或低于基础值会自动收进下方默认区（可点开编辑）。</span></div>
      <details class="skilldef" id="am-default-wrap" ${defaultSkillCount?'':'style="display:none"'}>
        <summary id="am-skill-summary">更多默认值技能（${defaultSkillCount} 项 · 未加点 · 点开可编辑）</summary>
        <div class="skillchips" id="am-default-skills">${defaultSkillChips}</div>
      </details>
      <h4 class="sectiontitle">🗡 武器（可参考预置表自动填技能/伤害/射程，仍可修改）</h4>
      <div id="am-weapons">${weaponRows}</div>
      <div style="margin-top:6px"><button class="small" onclick="addWeaponRow()">＋ 加一件武器</button>
        <span class="hint">装弹量：0=不消耗；战斗里每发-1，空枪用背包“弹药”装填。</span></div>
      <h4 class="sectiontitle">🎒 背包 / 随身用品</h4>
      <div id="am-inv">${invRows}</div>
      <div style="margin-top:6px"><button class="small" onclick="addInvRow()">＋ 加一件物品</button>
        <span class="hint">效果：治疗/回SAN/回MP/弹药(装填用)/其他/无。</span></div>
      <h4 class="sectiontitle">🎬 剧情道具（项目与效果同随身用品，展示在小卡底部）</h4>
      <div id="am-plot">${plotRows||''}</div>
      <div style="margin-top:6px"><button class="small" onclick="addPlotRow()">＋ 加一件剧情道具</button>
        <span class="hint">可用效果：治疗/回SAN/回MP/弹药/其他(自定)/无。</span></div>
      <h4 class="sectiontitle">🔮 法术（可下拉选规则书法术，消耗可改，支持自定义）</h4>
      <div id="am-spells">${spellRows||''}</div>
      <div style="margin-top:6px"><button class="small" onclick="addSpellRow()">＋ 加一个法术</button>
        <span class="hint">MP 填数字或骰式（如 1D6），施法自动扣减并掷 SAN。</span></div>
      <h4 class="sectiontitle">💰 资产</h4>
      <div class="row">
        <label>现金<input type="number" id="am-cash" value="${a.cash||0}" style="width:120px"></label>
        <label>货币<input type="text" id="am-currency" value="${esc(a.currency||'美元')}" style="width:120px"></label>
      </div>
      ${a.kind==='pc'?'<h4 class="sectiontitle">📜 背景故事（拆条 + 正文小段）</h4>':''}
      ${a.kind==='pc'?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">'+histHTML+'</div>':'<div class="vdiv"></div><label>背景备注<textarea id="am-hist-appearance" rows="2" style="display:none"></textarea><textarea rows="2" id="am-npc-back">'+esc(a.notes||a.note||'')+'</textarea></label>'}
      ${a.kind==='pc'?'<label style="margin-top:8px">背景故事正文（小段文字）<textarea rows="4" id="am-backstory">'+esc(a.backstory||'')+'</textarea></label>':''}
      ${a.kind==='pc'?'<div style="margin-top:10px"><h4 class="sectiontitle">🗂 调查员经历（1 段 = 多跑过 1 个团）</h4>'
        +'<div id="am-campaigns">'+(campaignRows||'')+'</div>'
        +'<div style="margin-top:6px"><button class="small" type="button" onclick="addCampaignRow()">＋ 添加一段经历</button>'
        +'<span class="hint"> 每跑过一个团记一行（经历模组 ＋ 人物变化），小卡外框会随团数升级。</span></div></div>':''}
      <div class="row" style="justify-content:flex-end;margin-top:16px">
        ${editingActorId?'<button class="danger ghost small" onclick="deleteActor(\''+a.id+'\')">删除此角色</button>':''}
        <button class="primary" onclick="saveActorModal()">保存</button>
      </div>
    </div></div>`;
  mask.classList.add('open');
}
function campaignRowHTML(c){
  c=c||{};
  return `<div class="listitem camprow" style="margin-bottom:6px"><div class="row" style="gap:6px;flex-wrap:wrap">
    <input type="text" class="camp-mod" value="${esc(c.module||'')}" placeholder="经历模组 / 跑过的团名" style="flex:1;min-width:150px">
    <input type="text" class="camp-note" value="${esc(c.note||'')}" placeholder="人物变化描述，如 SAN-2 / HP-1 / 侦查+5" style="flex:1.5;min-width:170px">
    <button class="small danger" type="button" onclick="this.closest('.camprow').remove()">✕</button>
  </div></div>`;
}
function addCampaignRow(){
  var box=$('am-campaigns'); if(!box) return;
  var d=document.createElement('div'); d.innerHTML=campaignRowHTML({module:'',note:''});
  box.appendChild(d.firstChild);
}
function collectFromModal(){
  var m=$('actorModal'); if(!m) return null;
  var a=currentActorModal; if(!a) return null;
  a.name=$('am-name').value.trim()||'(未命名)';
  if($('am-player')) a.player=$('am-player').value.trim();
  if($('am-occ')) a.occupation=$('am-occ').value.trim();
  if($('am-era')) a.era=$('am-era').value.trim();
  if($('am-age')) a.age=$('am-age').value.trim();
  if($('am-sex')) a.sex=$('am-sex').value.trim();
  if($('am-res')) a.residence=$('am-res').value.trim();
  if($('am-home')) a.hometown=$('am-home').value.trim();
  if($('am-tpl')) a.template=$('am-tpl').value.trim();
  if($('am-note')) a.note=$('am-note').value.trim();
  if($('am-count')) a.count=Math.max(1,Math.round(num($('am-count').value))||1);
  a.side=$('am-side')?$('am-side').value:a.side;
  if(!a.avatar) a.avatar={preset:defaultAvatarForActor(a.kind,a.side),custom:null};
  ['str','con','pow','dex','app','siz','int','edu','luck'].forEach(function(k){
    var e=m.querySelector('.am-attr[data-k="'+k+'"]'); if(e) a.attrs[k]=Math.max(0,Math.round(num(e.value)));
  });
  a.mov=Math.max(0,Math.round(num($('am-mov').value))||8);
  a.armor={ value:Math.max(0,num($('am-armor').value)||0), type:$('am-armtype').value.trim() };
  a.db=dbTextOf(a.attrs);
  a.hp.cur=Math.max(0,num($('am-hpcur').value));
  a.hp.max=Math.max(0,num($('am-hpmax').value))||Math.floor((a.attrs.con+a.attrs.siz)/10)||1;
  a.san.cur=Math.max(0,num($('am-sancur').value));
  a.san.max=Math.max(1,num($('am-sanmax').value)||99);
  a.mp.cur=Math.max(0,num($('am-mpcur').value));
  a.mp.max=Math.max(0,num($('am-mpmax').value))||Math.floor(a.attrs.pow/5);
  a.skills=[];
  m.querySelectorAll('#am-skills .skillchip, #am-default-skills .skillchip').forEach(function(li){
    var nm=li.querySelector('.sk-name').value.trim(); var tot=num(li.querySelector('.sk-total').value);
    if(!nm) return;
    var db=(li.dataset && li.dataset.base!=='' && li.dataset.base!=null)?num(li.dataset.base):skillBaseOf(nm);
    var o={name:nm,total:Math.max(0,Math.round(tot))};
    if(db!=null) o.base=db;
    a.skills.push(o);
  });
  a.weapons=[];
  m.querySelectorAll('#am-weapons .wrow').forEach(function(li){
    var w={name:li.querySelector('.w-name').value.trim(),skill:li.querySelector('.w-skill').value.trim()||'斗殴',
      damage:li.querySelector('.w-dmg').value.trim()||'1D3+DB',range:li.querySelector('.w-range').value.trim()||'近战',
      type:li.querySelector('.w-type').value.trim()||'格斗',pierce:'—',attacks:'1',
      ammoCap:Math.max(0,Math.round(num(li.querySelector('.w-cap').value))),ammoCur:Math.max(0,Math.round(num(li.querySelector('.w-cap').value))),note:''};
    if(w.name) a.weapons.push(w);
  });
  a.inv=[];
  m.querySelectorAll('#am-inv .listitem').forEach(function(li){
    var it={name:li.querySelector('.inv-name').value.trim(),qty:Math.max(0,Math.round(num(li.querySelector('.inv-qty').value))),
      effect:li.querySelector('.inv-effect').value,amount:li.querySelector('.inv-amount').value.trim(),note:li.querySelector('.inv-note').value.trim()};
    if(it.name) a.inv.push(it);
  });
  a.plot=[];
  m.querySelectorAll('#am-plot .plotrow').forEach(function(li){
    var it={name:li.querySelector('.plot-name').value.trim(),qty:Math.max(0,Math.round(num(li.querySelector('.plot-qty').value))),
      effect:li.querySelector('.plot-effect').value,amount:li.querySelector('.plot-amount').value.trim(),note:li.querySelector('.plot-note').value.trim()};
    if(it.name) a.plot.push(it);
  });
  collectSpellsFromModal(m,a);
  if(a.kind==='npc' && a.side==='调查员') a.side='盟友';
  a.cash=num($('am-cash').value);
  a.currency=$('am-currency').value.trim()||'美元';
  a.history=a.history||{};
  HIST_LABELS.forEach(function(h){ var e=$('am-hist-'+h[0]); if(e) a.history[h[0]]=e.value; });
  if($('am-backstory')) a.backstory=$('am-backstory').value;
  if($('am-npc-back')) a.notes=$('am-npc-back').value;
  a.campaigns=[];
  m.querySelectorAll('#am-campaigns .camprow').forEach(function(li){
    var mod=(li.querySelector('.camp-mod')||{}).value||'';
    var note=(li.querySelector('.camp-note')||{}).value||'';
    mod=String(mod).trim(); note=String(note).trim();
    if(mod||note) a.campaigns.push({module:mod,note:note});
  });
  return a;
}
function saveActorModal(){
  var a=collectFromModal(); if(!a) return;
  if(!editingActorId){ a.id=uid(a.kind==='pc'?'pc':'npc'); state.actors.push(a); }
  else { var idx=state.actors.findIndex(function(x){return x.id===editingActorId;}); if(idx>=0) state.actors[idx]=a; else state.actors.push(a); }
  saveState(); closeActorModal();
  if(a.kind==='pc') renderSurveyors(); else renderNpcs();
  toast('已保存「'+a.name+'」');
}

/* 剧情道具行（项目/效果结构同背包，供详情与小卡使用） */
var PLOT_EFFECTS=[['','无特殊效果'],['heal','治疗 HP'],['san','回复 SAN'],['mp','回复 MP'],['ammo','弹药(装填用)'],['other','其他(自定)']];
function plotRowHTML(it){
  var eff=it.effect||'';
  return `<div class="listitem plotrow" style="margin-bottom:6px"><div class="row" style="gap:6px;flex-wrap:wrap">
    <input type="text" class="plot-name" value="${esc(it.name)}" placeholder="剧情道具名称" style="flex:1;min-width:130px">
    <input type="number" class="plot-qty" value="${num(it.qty)||0}" style="width:64px" min="0" title="数量">
    <select class="plot-effect" style="width:130px">
      ${PLOT_EFFECTS.map(function(o){return '<option value="'+o[0]+'"'+(eff===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')}
    </select>
    <input type="text" class="plot-amount" value="${esc(it.amount||'')}" placeholder="量 如1D3" style="width:82px">
    <input type="text" class="plot-note" value="${esc(it.note||'')}" placeholder="备注/效果说明" style="flex:1.4;min-width:140px">
    <button class="small danger" onclick="this.closest('.plotrow').remove()">✕</button>
  </div></div>`;
}
function addPlotRow(){
  var box=$('am-plot'); if(!box) return;
  var d=document.createElement('div'); d.innerHTML=plotRowHTML({name:'',qty:1,effect:'',amount:'',note:''});
  box.appendChild(d.firstChild);
}

/* ---------- E. 导入调查员：直接进入调查员库（不再强制弹窗） ---------- */
function doImport(){
  if(!pendingParse){ toast('还没有可导入的文件'); return; }
  var p=pendingParse;
  var a=p.attrs;
  var hpMax=p.derived.hpMax||Math.floor((a.con+a.siz)/10)||1;
  var secs=p.backstory.sections||{};
  var history={};
  ['appearance','beliefs','people','places','belongings','traits','secrets','scars','phobias'].forEach(function(k){ history[k]=(secs[k]||''); });
  var actor={
    id:uid('pc'), kind:'pc', side:'调查员',
    name:p.basic.name||'未命名调查员', player:p.basic.player||'', occupation:p.basic.occupation||'',
    era:p.basic.era||'', age:p.basic.age||'', sex:p.basic.sex||'',
    residence:p.basic.residence||'', hometown:p.basic.hometown||'',
    avatar:{ preset:AVATAR_DEFAULT_PC, custom:null },
    attrs:a, hp:{cur:Math.max(1,p.derived.hpCur||hpMax),max:hpMax||1},
    mp:{cur:p.derived.mpCur||Math.floor(a.pow/5),max:Math.floor(a.pow/5)},
    san:{cur:p.derived.sanCur!=null?Math.min(p.derived.sanCur,99):Math.min(a.pow||0,99),max:Math.max(1,p.derived.sanMax||99)},
    mov:p.derived.mov||8, db:p.derived.db||'0', build:p.derived.build||'0',
    armor:{value:num(p.derived.armorValue)||0,type:p.derived.armorType||''},
    skills:p.skills.map(function(s){return {name:s.name,total:s.total};}),
    weapons:p.weapons.map(function(w){ var cap=num(w.ammo); return {name:w.name,type:w.type,skill:w.skill||'斗殴',damage:w.damage,range:w.range,pierce:w.pierce,attacks:w.attacks||'1',ammoCap:cap,ammoCur:cap,note:''}; }),
    inv:p.items.map(function(it){return {name:it.name,qty:it.qty,effect:'',amount:'',note:''};}),
    spells:[],
    cash:p.assets.cash||0, currency:p.assets.currency||'美元',
    history:history, backstory:p.backstory.text||'',
    campaigns:(p.campaigns||[]).map(function(c){ return {module:(c&&c.module)||'',note:(c&&c.note)||''}; }),
    notes:'', count:1, template:'', note:''
  };
  state.actors.push(actor);
  saveState(); renderSurveyors();
  toast('✅ 已录入调查员库：'+actor.name);
  var card=document.querySelector('#pcList .actorcard[data-id="'+actor.id+'"]');
  if(card){
    if(typeof card.scrollIntoView==='function'){ try{ card.scrollIntoView({block:'nearest'}); }catch(e){} }
    card.classList.add('flash');
    setTimeout(function(){ if(card.classList) card.classList.remove('flash'); },2400);
  }
  pendingParse=null;                 // 已入库：清空待导入状态，避免重复录入
}
