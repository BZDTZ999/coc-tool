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
/* 「9%/4%/1%」「9%」「9」这类写法里的第一个数字（信用评级成功率）；填别的文字返回 null。 */
var creditRawOnOpen='';   // 打开详情卡时「信用评级」原文：只有真的改过它，才去同步「信用评级」技能
/* 改信用评级时，把「信用评级」技能的成功率一起改成那个数（用户要的“自动计算”）。 */
function onCreditInput(inp){
  var n=creditNumber(inp&&inp.value); if(n==null) return;
  var chips=document.querySelectorAll('#am-skills .skillchip, #am-default-skills .skillchip');
  for(var i=0;i<chips.length;i++){
    var nm=chips[i].querySelector('.sk-name'), tot=chips[i].querySelector('.sk-total');
    if(nm && tot && /信用评级/.test(nm.value)){ tot.value=Math.max(0,Math.round(n)); return; }
  }
}
function creditNumber(text){
  var t=String(text==null?'':text).trim();
  if(!t) return null;
  var m=t.match(/-?\d+(?:\.\d+)?/);
  if(!m) return null;
  /* 只认“纯数字 / 百分数 / 百分数用斜杠连起来”这几种，避免把说明文字里的数字当评级 */
  if(!/^\s*-?\d+(?:\.\d+)?\s*%?\s*([\/／]\s*-?\d+(?:\.\d+)?\s*%?\s*)*$/.test(t)) return null;
  return parseFloat(m[0]);
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
       armor:{value:0,type:''},skills:[],weapons:[],inv:[],bag:[],spells:[],cash:0,currency:'美元',
       history:{appearance:'',beliefs:'',people:'',places:'',belongings:'',traits:'',secrets:'',scars:'',phobias:''},
       backstory:'',campaigns:[],notes:'',template:'',note:'',player:''};
  }
  if(!a.avatar) a.avatar={preset:a.kind==='npc'?defaultAvatarForActor('npc',sideOf(a)):AVATAR_DEFAULT_PC,custom:null};
  if(!a.history) a.history={};
  if(!a.spells) a.spells=[];
  if(!a.plot) a.plot=[];
  if(typeof migrateBagToInv==='function') migrateBagToInv(a);
  if(a.kind==='npc' && a.side==='调查员') a.side='盟友';
  currentActorModal=a; editingActorId=a.id;
  creditRawOnOpen=String(a.credit||'');
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
            ${a.kind==='pc'?'<label title="这张角色是从哪张卡读进来的：导出时会填回同一张模板（公式、雷达图都保留）">导出的卡<select id="am-cardtpl">'+
              (typeof COC_CARDS!=='undefined'?COC_CARDS:[]).map(function(c){
                return '<option value="'+c.id+'"'+((a.cardTpl||'')===c.id?' selected':'')+'>'+esc(c.short||c.name)+'</option>';
              }).join('')+'</select></label>':''}
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
      <div class="attrsplit">
        <div>${attrs3x3(a,true)}</div>
        <div class="radarbox" title="与卡里「附表」的九维雷达图同一套数值，改属性会实时重画">
          <canvas id="am-radar" width="320" height="286"></canvas>
          <div class="hint radarcap">📊 属性雷达（力量 / 体质 / 体型 / 敏捷 / 外貌 / 智力 / 意志 / 教育 / 幸运）</div>
        </div>
      </div>
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
      <datalist id="cocWeaponTypes"></datalist>
      <div style="margin-top:6px"><button class="small" onclick="addWeaponRow()">＋ 加一件武器</button>
        <span class="hint">装弹量：0=不消耗；战斗里每发-1，空枪用背包“弹药”装填。</span></div>
      <h4 class="sectiontitle">🎒 背包 / 随身用品</h4>
      <div id="am-inv">${invRows}</div>
      <div style="margin-top:6px"><button class="small" onclick="addInvRow()">＋ 加一件物品</button>
        <span class="hint">效果：治疗/回SAN/回MP/弹药(装填用)/其他/无。</span></div>
      <div class="hint">原卡右侧「背包格」那一列的东西也在这张清单里，都算随身物品；导出时自动写回卡里原来的位置，不用你管。</div>
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
        <label>信用评级<input type="text" id="am-credit" value="${esc(a.credit||'')}" placeholder="如 5%/2%/1%" style="width:150px" oninput="onCreditInput(this)" title="改这里 → 卡里「信用评级」技能的成功率会自动跟着改（导出时也写回卡里）"></label>
        <label>其他资产<input type="text" id="am-other-assets" value="${esc(a.otherAssets||'')}" placeholder="如 50" style="width:110px"></label>
      </div>
      <div class="row" style="margin-top:6px">
        <span class="hint" style="align-self:center">其他资产表：</span>
        <label>交通工具<input type="text" id="am-asset-vehicle" value="${esc(a.assetsTable&&a.assetsTable.vehicle)}" placeholder="数字或文字都行" style="width:120px"></label>
        <label>住所<input type="text" id="am-asset-home" value="${esc(a.assetsTable&&a.assetsTable.residence)}" placeholder="如 乡间别墅" style="width:120px"></label>
        <label>奢侈品<input type="text" id="am-asset-luxury" value="${esc(a.assetsTable&&a.assetsTable.luxury)}" placeholder="如 名表一只" style="width:120px"></label>
        <label>股票/证券<input type="text" id="am-asset-stocks" value="${esc(a.assetsTable&&a.assetsTable.stocks)}" placeholder="如 2000" style="width:120px"></label>
        <label>其他<input type="text" id="am-asset-other" value="${esc(a.assetsTable&&a.assetsTable.other)}" placeholder="如 一柜古籍" style="width:120px"></label>
      </div>
      <label style="margin-top:6px">资产详述<textarea rows="2" id="am-assets-detail">${esc(a.assetsDetail||'')}</textarea></label>
      ${a.kind==='pc'?'<h4 class="sectiontitle">📜 背景故事（拆条 + 正文小段）</h4>':''}
      ${a.kind==='pc'?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">'+histHTML+'</div>':'<div class="vdiv"></div><label>背景备注<textarea id="am-hist-appearance" rows="2" style="display:none"></textarea><textarea rows="2" id="am-npc-back">'+esc(a.notes||a.note||'')+'</textarea></label>'}
      <label style="margin-top:8px" title="人物卡右上角「任意特长」那几格（自由文本，一格一条）">任意特长（每行一条）<textarea rows="2" id="am-traits">${esc((a.customTraits||[]).join('\n'))}</textarea></label>
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
  paintActorRadar(a);
  if(!mask.dataset.radarbound){
    mask.dataset.radarbound='1';
    mask.addEventListener('input', function(ev){
      var t=ev.target;
      if(t && t.classList && t.classList.contains('am-attr')) paintActorRadar(currentActorModal);
    });
  }
  /* 武器「类型」下拉：预热一次卡里的「武器列表」（离线版直接读内联模板，在线版按需 fetch） */
  try{ if(typeof cocWeaponTypes==='function'){ cocWeaponTypes(a.cardTpl&&cocCard(a.cardTpl)?a.cardTpl:undefined); fillWeaponTypeDatalist(); } }catch(e){}
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
  if($('am-cardtpl')) a.cardTpl=$('am-cardtpl').value;
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
  var oldSkillOf={};
  (a.skills||[]).forEach(function(s){ var k=String((s&&s.name)||'').trim(); if(k && !oldSkillOf[k]) oldSkillOf[k]=s; });
  a.skills=[];
  m.querySelectorAll('#am-skills .skillchip, #am-default-skills .skillchip').forEach(function(li){
    var nm=li.querySelector('.sk-name').value.trim(); var tot=num(li.querySelector('.sk-total').value);
    if(!nm) return;
    var db=(li.dataset && li.dataset.base!=='' && li.dataset.base!=null)?num(li.dataset.base):skillBaseOf(nm);
    var o={name:nm,total:Math.max(0,Math.round(tot))};
    if(db!=null) o.base=db;
    /* 从原卡读来的信息（在卡里的格子、职业点、兴趣点）要跟着走，不然导出会串行 */
    var old=oldSkillOf[nm];
    if(old){
      if(old.slot) o.slot=old.slot;
      if(old.occPts!=null) o.occPts=old.occPts;
      if(old.intPts!=null) o.intPts=old.intPts;
      if(old.mark!=null) o.mark=old.mark;
      if(old.occ!=null) o.occ=old.occ;
      if(o.base==null && old.base!=null) o.base=old.base;
    }
    a.skills.push(o);
  });
  /* 「任意特长」：每行一条，写回卡右上角那几格 */
  if($('am-traits')) a.customTraits=String($('am-traits').value||'').split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
  /* 信用评级改了 → 卡里「信用评级」技能的成功率跟着走（卡上「x%/y%/z%」就是由它算出来的）。
     只认数字（如 9 / 9% / 9%/4%/1% 取 9），写的是别的文字就只存文本、不动技能。 */
  if($('am-credit') && String($('am-credit').value||'').trim()!==String(creditRawOnOpen||'').trim()){
    var cn=creditNumber($('am-credit').value);
    if(cn!=null){
      var hitSkill=null;
      a.skills.forEach(function(k){ if(!hitSkill && /信用评级/.test(String(k.name||''))) hitSkill=k; });
      if(hitSkill) hitSkill.total=Math.max(0,Math.round(cn));
      else a.skills.push({name:'信用评级',total:Math.max(0,Math.round(cn)),base:0});
    }
  }
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
      effect:li.querySelector('.inv-effect').value,amount:li.querySelector('.inv-amount').value.trim(),note:li.querySelector('.inv-note').value.trim(),
      slot:(li.getAttribute('data-slot')==='bag')?'bag':''};   // 原来在「背包格」列的，导出还写回那一列
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
  if($('am-credit')) a.credit=$('am-credit').value.trim();
  if($('am-other-assets')) a.otherAssets=$('am-other-assets').value.trim();
  if($('am-assets-detail')) a.assetsDetail=$('am-assets-detail').value.trim();
  /* 其他资产表：任意字符原样收（数字/文字都行） */
  if($('am-asset-vehicle')){
    a.assetsTable={ vehicle:$('am-asset-vehicle').value.trim(), residence:$('am-asset-home').value.trim(),
      luxury:$('am-asset-luxury').value.trim(), stocks:$('am-asset-stocks').value.trim(), other:$('am-asset-other').value.trim() };
  }
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
  /* 手动新建的角色没有“导入时”快照，就用第一次保存的状态当基线 */
  if(!a.importSnapshot && typeof importSnapshotOf==='function'){ try{ a.importSnapshot=importSnapshotOf(a); }catch(e){} }
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
    occId:p.basic.occId||'',
    skills:p.skills.map(function(s){return {name:s.name,name1:s.name1,name2:s.name2,total:s.total,base:s.base,
      occPts:s.occPts,intPts:s.intPts,mark:s.mark,occ:s.occ,slot:s.slot};}),
    weapons:p.weapons.map(function(w){ var cap=num(w.ammoCap); return {name:w.name,type:w.type||'',skill:w.skill||'',
      damage:w.damage||'',range:w.range||'',pierce:w.pierce||'',attacks:w.attacks||'',ammo:(w.ammo==null?'':String(w.ammo)),
      success:num(w.success)||0,
      ammoCap:cap,ammoCur:cap,jam:w.jam||'',note:''}; }),
    inv:p.items.map(function(it){return {name:it.name,qty:it.qty,effect:'',amount:'',note:'',slot:''};})
        .concat((p.bagItems||[]).map(function(it){return {name:it.name,qty:it.qty,effect:'',amount:'',note:'',slot:'bag'};})),
    spells:(p.spells||[]).map(function(sp){ return {name:sp.name, mp:sp.mp||'', san:sp.san||'', time:sp.time||'', effect:sp.effect||'', cost:sp.cost||''}; }),
    cash:p.assets.cash||0, currency:p.assets.currency||'美元',
    credit:p.assets.credit||'', otherAssets:p.assets.otherAssets||'',
    assetsDetail:(p.assets&&p.assets.detail)||'',
    assetsTable:{ vehicle:(p.assets&&p.assets.table&&p.assets.table.vehicle)||'', residence:(p.assets&&p.assets.table&&p.assets.table.residence)||'',
      luxury:(p.assets&&p.assets.table&&p.assets.table.luxury)||'', stocks:(p.assets&&p.assets.table&&p.assets.table.stocks)||'',
      other:(p.assets&&p.assets.table&&p.assets.table.other)||'' },
    customTraits:(p.customTraits||[]).slice(),   // 卡右上角「任意特长」那几格（自由文本）
    history:history, backstory:p.backstory.text||'',
    campaigns:(p.campaigns||[]).map(function(c){ return {module:(c&&c.module)||'',note:(c&&c.note)||''}; }),
    notes:'', count:1, template:'', note:'',
    cardTpl:p.cardTpl||(typeof COC_CARD_DEFAULT!=='undefined'?COC_CARD_DEFAULT:'')
  };
  if(typeof importSnapshotOf==='function') actor.importSnapshot=importSnapshotOf(actor);   // 记下“导入时”的样子，导出时用来算数据变化
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
