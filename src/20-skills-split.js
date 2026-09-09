/* ---------- 技能“已加点 / 默认值”自动分区 ----------
   以卡片自带的“基础值 base”判断：只有 total>base 才算“已加点”高亮前置；
   total==base 与 total<base 都收进下方默认区折叠（没有默认基础可对照的自定义技能仍放上方）。 */
var SKILL_DEFAULTS = {
  '会计':5,'法律':5,'人类学':1,'估价':5,'考古学':1,'锁匠':1,'技艺':5,'机械维修':10,'医学':1,
  '博物学':10,'取悦':15,'魅惑':15,'领航':10,'导航':10,'攀爬':20,'计算机使用':5,'操作重型机械':1,
  '克苏鲁神话':0,'乔装':5,'精神分析':1,'汽车驾驶':20,'骑术':5,'电气维修':10,'电子学':1,'话术':5,
  '信用评级':0,'说服':10,'心理学':10,'妙手':10,'侦查':25,'聆听':20,'图书馆使用':20,'神秘学':5,
  '母语':0,'闪避':0,'潜行':20,'生存':10,'游泳':20,'投掷':20,'追踪':10,'动物驯养':5,'驯兽':5,
  '急救':30,'潜水':1,'历史':5,'爆破':1,'恐吓':15,'读唇':1,'跳跃':20,'催眠':1,'外语':1,'炮术':1,
  '格斗':25,'斗殴':25,'射击':20,'驾驶':1,'科学':1,'学问':1,'自定义技能':0
};
function skillBaseOf(name){
  var nm=String(name==null?'':name).replace(/\s+/g,' ').trim();
  if(!nm) return null;
  if(Object.prototype.hasOwnProperty.call(SKILL_DEFAULTS,nm)) return SKILL_DEFAULTS[nm];
  var bare=nm.replace(/[①-⑩Ω×*•·]+$/,'').replace(/[：:\s]+$/,'').trim();
  if(bare!==nm && Object.prototype.hasOwnProperty.call(SKILL_DEFAULTS,bare)) return SKILL_DEFAULTS[bare];
  return null;
}
function skillIsAdded(name,total,base){
  var b=(base!=null&&base!=='')?num(base):skillBaseOf(name);
  if(b==null&&base!=null) b=num(base);
  return b==null || num(total)>b;
}
function skillChipParts(name,total,base){
  var b = (base!=null && base!=='') ? num(base) : skillBaseOf(name);
  if(b==null && base!=null) b=num(base);
  return { base:(b!=null?b:null), added:skillIsAdded(name,total,base) };
}
function chipSkillHTML(name,total,base){
  var p=skillChipParts(name,total,base);
  return `<span class="skillchip${p.added?' added':''}" data-base="${p.base!=null?p.base:''}">
    <input type="text" class="sk-name" value="${esc(name)}" placeholder="技能"
      title="技能名（改名后自动重新归类）" onchange="reclassSkillChip(this)">
    <input type="number" class="sk-total" value="${num(total)||0}" min="0" title="当前值"
      onchange="reclassSkillChip(this)">
    ${p.base!=null?'<span class="sk-base" title="该技能默认基础值">基'+num(p.base)+'</span>':''}
    <button type="button" class="del" title="删除" onclick="this.closest('.skillchip').remove();updateSkillSplitCounts()">×</button>
  </span>`;
}
function addSkillRow(){
  var box=$('am-skills'); if(!box) return;
  var ph=box.querySelector('.sk-empty-hint'); if(ph) ph.remove();
  var s=document.createElement('span'); s.className='skillchip added';
  s.innerHTML='<input type="text" class="sk-name" placeholder="技能" title="输入技能名后自动重新归类" onchange="reclassSkillChip(this)"><input type="number" class="sk-total" value="0" min="0" title="当前值" onchange="reclassSkillChip(this)"><button type="button" class="del" title="删除" onclick="this.closest(\'.skillchip\').remove();updateSkillSplitCounts()">×</button>';
  box.appendChild(s);
  updateSkillSplitCounts();
  var nm=s.querySelector('.sk-name'); if(nm) nm.focus();
}
function reclassSkillChip(el){
  if(!el) return;
  var chip=el.closest?el.closest('.skillchip'):null;
  if(!chip) return;
  var nameIn=chip.querySelector('.sk-name').value.trim();
  var total=Math.max(0,Math.round(num(chip.querySelector('.sk-total').value)));
  chip.querySelector('.sk-total').value=total;
  var dsb=(chip.dataset && chip.dataset.base!=='' && chip.dataset.base!=null)?num(chip.dataset.base):null;
  var p=skillChipParts(nameIn,total,dsb);
  if(p.base!=null && dsb==null){ chip.dataset.base=p.base; var old=chip.querySelector('.sk-base'); if(old) old.textContent='基'+p.base; else chip.insertAdjacentHTML('beforeend','<span class="sk-base">基'+p.base+'</span>'); }
  chip.classList.toggle('added', p.added);
  var target=p.added?$('am-skills'):$('am-default-skills');
  if(target && chip.parentNode!==target){ target.appendChild(chip); }
  updateSkillSplitCounts();
}
function updateSkillSplitCounts(){
  var up=$('am-skills'), def=$('am-default-skills');
  var upN=up?up.querySelectorAll('.skillchip').length:0;
  var defN=def?def.querySelectorAll('.skillchip').length:0;
  var sum=$('am-skill-summary'); if(sum) sum.textContent='更多默认值技能（'+defN+' 项 · 未加点 · 点开可编辑）';
  var tit=$('am-skill-title'); if(tit) tit.textContent='🎯 已加点 / 自定义技能（'+upN+'）';
  var wrap=$('am-default-wrap'); if(wrap) wrap.style.display=defN?'':'none';
  if(up && up.querySelector('.sk-empty-hint')) up.querySelector('.sk-empty-hint').remove();
  if(up && upN===0 && !up.querySelector('.skillchip') && !up.querySelector('.sk-empty-hint')) up.insertAdjacentHTML('beforeend','<span class="hint sk-empty-hint">（暂无——加点过的技能会高亮出现在这里）</span>');
}
