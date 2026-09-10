/* ---------- 📜 剧本摘要/笔记 与 🎲 骰子：与页面平级的两个悬浮栏目 ---------- */
var openFloatPanel=null;
var noteTabIndex=0;
var diceTarget=null;            // {id,name,kind,skills[]}
var diceHistory=[];             // 本次会话保留，不再随面板关闭清空
var diceThrSmall=1;             // 大成功阈值：1D100 掷出 ≤ 此值
var diceThrBig=96;              // 大失败阈值：1D100 掷出 ≥ 此值
var diceTab='roll';            // 骰子台子页签：roll / san

function renderNav(){
  var nav=$('nav'); if(!nav) return;
  nav.innerHTML='';
  TABS.forEach(function(t){
    var b=document.createElement('button');
    b.id='nav-'+t[0]; b.textContent=t[1];
    b.className=t[0]===state.activeTab?'active':'';
    b.onclick=function(){ switchTab(t[0]); };
    nav.appendChild(b);
  });
  nav.appendChild(campaignNameField());
  [['nav-script','📜 剧本/笔记','script'],['nav-dice','🎲 骰子','dice']].forEach(function(x){
    var b=document.createElement('button');
    b.id=x[0]; b.textContent=x[1];
    if(openFloatPanel===x[2]) b.className='active';
    b.title=(x[2]==='script'?'悬浮剧本摘要/随团笔记（不切换页面）':'悬浮骰子台（可自定义几个几面骰）');
    b.onclick=function(){ toggleFloat(x[2]); };
    nav.appendChild(b);
  });
  /* 右半屏：模组 / 规则书（不切换左边页面，只把右半边打开） */
  [['nav-module','📖 模组','module','上传模组（word / pdf）在右半屏看，左边照常带团'],
   ['nav-rulebook','📚 规则书','rulebook','右半屏查规则书：目录 + 全文搜索跳转']].forEach(function(x){
    var b=document.createElement('button');
    b.id=x[0]; b.textContent=x[1];
    if(sidePaneIsOpen(x[2])) b.className='active';
    b.title=x[3];
    b.onclick=function(){ toggleSidePane(x[2]); };
    nav.appendChild(b);
  });
}
/* 本次团名：放在导航栏正中间，可随时改名；导出人物卡 / 写入调查员经历都会用到它。 */
function campaignName(){
  var v=state.ui&&state.ui.campaignName;
  return (v==null?'':String(v)).trim();
}
function campaignNameField(){
  var wrap=document.createElement('div');
  wrap.className='navcamp';
  wrap.title='给这次团起个名字：导出人物卡文件名、写入「调查员经历」的模组名都会用它。留空则用「未命名团」。';
  var lab=document.createElement('span'); lab.className='navcamp-lab'; lab.textContent='🎪 本次团名';
  var inp=document.createElement('input');
  inp.id='campaignName'; inp.type='text'; inp.maxLength=60;
  inp.placeholder='点击填写这次团的名字…（导出/经历会用到）';
  inp.value=campaignName();
  inp.addEventListener('input',function(){
    if(!state.ui) state.ui={};
    state.ui.campaignName=inp.value;
    saveStateQuiet();
  });
  wrap.appendChild(lab); wrap.appendChild(inp);
  return wrap;
}
function toggleFloat(kind){
  if(openFloatPanel===kind){ closeFloatPanel(); return; }
  if(typeof fsClosePanel==='function') fsClosePanel();   // 全屏时与调查员/NPC 悬浮互斥
  openFloatPanel=kind;
  renderNav();
  buildFloatPanel();
  positionFloatPanel();
  if(typeof renderFsNav==='function') renderFsNav();
}
function closeFloatPanel(){
  if(openFloatPanel==='script') saveNoteFromEditor();
  openFloatPanel=null;
  renderNav();
  var p=$('floatPanel'); if(p) p.hidden=true;
  if(typeof renderFsNav==='function') renderFsNav();
}
function positionFloatPanel(){
  var p=$('floatPanel'); if(!p) return;
  if(typeof attachFloatResize==='function') attachFloatResize(p);
  var vw=window.innerWidth||document.documentElement.clientWidth||1200;
  var vh=window.innerHeight||document.documentElement.clientHeight||800;
  var mobile=vw<=760;
  var tb=document.querySelector('.topbar');
  var top=mobile?6:(tb?tb.getBoundingClientRect().bottom+6:56);
  top=Math.max(6,Math.round(top));
  var isScript=openFloatPanel==='script';
  var headH=50, bd=p.querySelector('.floatbody');
  if(isScript){
    /* 占约 4/5 屏，同时保证不溢出视口底部 */
    var h=Math.min(Math.round(vh*0.84),920);
    var room=vh-top-10;
    if(h>room && room>200) h=Math.round(room);
    p.style.height=Math.round(h)+'px';
    if(bd) bd.style.height=Math.max(140,Math.round(h-headH))+'px';
  } else {
    p.style.height='';
    if(bd) bd.style.height='';
  }
  p.style.top=top+'px';
  p.hidden=false;
}
function floatActorsChips(action, only){
  var list=(state.actors||[]).filter(function(a){ return !only || a.kind===only; });
  if(!list.length) return '<span class="hint">还没有调查员/NPC</span>';
  return list.map(function(a){
    return `<span class="fchip" data-aid="${esc(a.id)}" data-kind="${esc(a.kind||'pc')}" data-action="${action}" title="点击：${action==='insert'?'插入到笔记':'设为掷骰目标'}">${avatarView(a,'sm')}<span>${esc(a.name)}</span><i class="muted" style="font-style:normal">${esc(sideOf(a))}</i></span>`;
  }).join('');
}
function scenarioTabs(){
  if(!state.ui) state.ui={};
  if(!state.ui.scenarioTabs || !state.ui.scenarioTabs.length) state.ui.scenarioTabs=[{name:'笔记 1',html:''},{name:'笔记 2',html:''},{name:'笔记 3',html:''}];
  while(state.ui.scenarioTabs.length<3) state.ui.scenarioTabs.push({name:'笔记 '+(state.ui.scenarioTabs.length+1),html:''});
  return state.ui.scenarioTabs.slice(0,3);
}
function noteTabsHTML(){
  return scenarioTabs().map(function(tb,i){
    return `<span class="ntab${i===noteTabIndex?' on':''}">
      <button class="ntabgo" onclick="switchNoteTab(${i})">${esc(tb.name||('笔记 '+(i+1)))}</button>
      <button class="ntabren" title="改这个笔记卡的名字" onclick="renameNoteTab(${i})">✎</button>
    </span>`;
  }).join('');
}
function loadNoteEditor(){
  var tabs=scenarioTabs();
  if(noteTabIndex>=tabs.length) noteTabIndex=0;
  var ed=$('noteEditor'); if(ed) ed.innerHTML=tabs[noteTabIndex].html||'';
  var tw=$('noteTabs'); if(tw) tw.innerHTML=noteTabsHTML();
}
function switchNoteTab(i){
  saveNoteFromEditor();
  var tabs=scenarioTabs();
  if(i>=0&&i<tabs.length) noteTabIndex=i;
  loadNoteEditor();
}
function renameNoteTab(i){
  var tabs=scenarioTabs();
  var nm=prompt('给这张笔记卡命名：', (tabs[i]&&tabs[i].name)||('笔记 '+(i+1)));
  if(nm===null) return;
  nm=String(nm).trim()||('笔记 '+(i+1));
  tabs[i].name=nm;
  saveStateQuiet();
  var tw=$('noteTabs'); if(tw) tw.innerHTML=noteTabsHTML();
  toast('笔记卡已改名：'+nm);
}
/* ---------- 骰子台：子页签（掷骰 / SAN 检定）+ 规则书 SAN 流程 ---------- */
var SAN_SYMPTOMS_BOOK=[
  {n:'失忆', d:'只记得最后身处的安全地点，却不知如何来到这里', dur:'1D10 轮'},
  {n:'假性残疾', d:'心理性的失明、失聪或躯体缺失感', dur:'1D10 轮'},
  {n:'暴力倾向', d:'对身边的敌人与友方进行无差别攻击', dur:'1D10 轮'},
  {n:'偏执', d:'以为有人窥视、同伴中有叛徒，万事皆虚', dur:'1D10 轮'},
  {n:'人际依赖', d:'把某人误认成背景中的“重要之人”并紧抓不放', dur:'1D10 轮'},
  {n:'昏厥', d:'当场昏倒', dur:'1D10 轮'},
  {n:'逃避行为', d:'用尽手段逃离当前所在（可能抛下同伴）', dur:'1D10 轮'},
  {n:'歇斯底里', d:'大笑、哭泣、嘶吼、恐惧等极端情绪', dur:'1D10 轮'},
  {n:'恐惧', d:'患上恐惧症：可再 D100 查恐惧症状表挑一个恐惧源', dur:'1D10 轮'},
  {n:'躁狂', d:'陷入某种躁狂诱因：可再 D100 查躁狂症状表', dur:'1D10 轮'}
];
var SAN_CUSTOM_DEFAULT='指着月亮尖叫，坚信自己已经死了\n抱着“珍贵之物”反复喃喃自语，不允许任何人碰';
function sanCfg(){
  if(!state.ui) state.ui={};
  if(!state.ui.san) state.ui.san={};
  var c=state.ui.san;
  if(!(c.checkN>0)) c.checkN=1;
  if(!(c.checkSides>=2)) c.checkSides=100;
  if(!(c.lossN>0)) c.lossN=1;
  if(!(c.lossSides>=2)) c.lossSides=6;
  if(!(c.trig>0)) c.trig=5;
  if(c.set!=='custom') c.set='book';
  if(c.custom==null) c.custom=SAN_CUSTOM_DEFAULT;
  return c;
}
function diceTabsBarHTML(){
  return `<div class="row tabs-mini dice-tabs">
    <button id="dtab-roll" class="${diceTab!=='san'?'active':''}" onclick="switchDiceTab('roll')">🎲 掷骰</button>
    <button id="dtab-san" class="${diceTab==='san'?'active':''}" onclick="switchDiceTab('san')">🧠 SAN 检定</button>
  </div>`;
}
function switchDiceTab(t){
  if(t!=='san') t='roll';
  diceTab=t;
  if(state&&state.ui){ if(!state.ui.dice) state.ui.dice={bs:1,bf:96,hist:[]}; state.ui.dice.tab=t; }
  storeDiceState();
  if(openFloatPanel==='dice'){ buildFloatPanel(); positionFloatPanel(); }
}
function diceActorBarHTML(useSkill){
  var skillHTML=useSkill?'<select id="diceSkill" style="min-width:170px" onchange="diceSkillChanged(this)"><option value="">（不使用技能）</option></select><span class="muted" id="diceSkillVal"></span>':'';
  return `<div class="note-tools" style="border-top:1px dashed var(--line);border-bottom:none;padding-top:6px;margin-bottom:6px">
      <span class="muted" style="font-size:12px">选择掷骰角色：</span>
      <span id="diceActorChips">${floatActorsChips('target')}</span>${skillHTML}
      ${useSkill?'<div id="diceSkillChips" class="dice-skills-box" style="flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:4px"></div>':''}
    </div>
    <div class="hint" id="diceTargetLbl" style="margin-bottom:6px"></div>`;
}
function diceRollBodyHTML(){
  return `
      <div class="dice-num row" style="gap:10px;align-items:flex-end">
        <label>骰子个数<input type="number" id="dieCount" value="1" min="1" max="100" step="1"></label>
        <label>骰子面数<input type="number" id="dieSides" value="100" min="2" max="1000000" step="1"></label>
        <button class="primary" style="height:34px" onclick="rollFloatDice()">🎲 掷骰</button>
      </div>
      <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap">
        <label style="flex-direction:row;align-items:center;gap:4px">大成功（掷出 ≤）<input type="number" id="diceBs" value="${diceThrSmall}" min="1" max="100" style="width:64px" onchange="saveDiceThrUI()"></label>
        <label style="flex-direction:row;align-items:center;gap:4px">大失败（掷出 ≥）<input type="number" id="diceBf" value="${diceThrBig}" min="1" max="100" style="width:64px" onchange="saveDiceThrUI()"></label>
        <span class="hint">仅 1D100 判定时生效</span>
      </div>
      <div class="dice-big" id="diceBig">—</div>
      <div class="dice-detail" id="diceDetail"></div>
      ${diceActorBarHTML(true)}
      <div class="row" style="justify-content:space-between;margin-bottom:4px">
        <span class="muted" style="font-size:12px">掷骰日志（关闭面板不丢失）</span>
        <button class="small ghost" onclick="clearDiceHistory()">清空日志</button>
      </div>
      <div class="log dicehist" id="diceHist"></div>`;
}
function diceSanBodyHTML(){
  var c=sanCfg();
  return `
      <div class="sanrows">
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <b class="sanstep">①</b><span class="muted">理智检定骰（成功 = 掷出 ≤ 当前 SAN）</span>
          <label style="flex-direction:row;align-items:center;gap:3px">个数<input type="number" id="sanCheckN" value="${c.checkN}" min="1" max="100" style="width:58px" onchange="saveSanUI()"></label>
          <label style="flex-direction:row;align-items:center;gap:3px">面数<input type="number" id="sanCheckSides" value="${c.checkSides}" min="2" max="1000000" style="width:70px" onchange="saveSanUI()"></label>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <b class="sanstep">②</b><span class="muted">失败后损失骰（如规则书写 “SAN 0/1D6” 的损失部分）</span>
          <label style="flex-direction:row;align-items:center;gap:3px">个数<input type="number" id="sanLossN" value="${c.lossN}" min="1" max="100" style="width:58px" onchange="saveSanUI()"></label>
          <label style="flex-direction:row;align-items:center;gap:3px">面数<input type="number" id="sanLossSides" value="${c.lossSides}" min="2" max="1000000" style="width:70px" onchange="saveSanUI()"></label>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <b class="sanstep">③</b><span class="muted">单次损失 ≥</span>
          <input type="number" id="sanTrig" value="${c.trig}" min="1" max="99" style="width:56px" onchange="saveSanUI()">
          <span class="muted">点 → 做 INT 检定（通过 = 陷入临时疯狂发作，见规则书理智摘要）</span>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">
          <b class="sanstep">④</b><span class="muted">疯狂症状来源</span>
          <select id="sanSet" onchange="saveSanUI()" style="width:220px">
            <option value="book"${c.set==='book'?' selected':''}>规则书·疯狂发作表（1D10）</option>
            <option value="custom"${c.set==='custom'?' selected':''}>完全自定义列表</option>
          </select>
        </div>
        <div id="sanCustomRow" style="margin:2px 0 6px;padding-left:20px"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin:2px 0 8px">
          <button class="primary" onclick="rollSanCheck()">🧠 进行理智检定</button>
          <button class="small ghost" title="只做一次 INT 检定（损失≥5 后是否发作）" onclick="rollSanIntOnly()">仅 INT 判定</button>
          <button class="small ghost" title="只掷一次疯狂症状（不扣 SAN）" onclick="rollSanSymptom()">只掷症状</button>
          <span class="hint">损失≥触发值时，本工具自动做 INT 判定与症状表掷骰</span>
        </div>
        ${diceActorBarHTML(false)}
        <div class="dice-big" id="sanResult">—</div>
        <div class="dice-detail" id="sanDetail"></div>
      </div>
      <div class="row" style="justify-content:space-between;margin-bottom:4px;margin-top:6px">
        <span class="muted" style="font-size:12px">掷骰日志（关闭面板不丢失）</span>
        <button class="small ghost" onclick="clearDiceHistory()">清空日志</button>
      </div>
      <div class="log dicehist" id="diceHist"></div>`;
}
function updateSanSetUI(){
  var c=sanCfg();
  var row=$('sanCustomRow'); if(!row) return;
  if(c.set==='custom'){
    row.innerHTML='<textarea id="sanCustomList" placeholder="每行一条疯狂症状（只写症状名），例：'+esc(SAN_CUSTOM_DEFAULT)+'" style="min-height:72px" onchange="saveSanUI()">'+esc(c.custom||'')+'</textarea>'
      +'<div class="hint" style="margin-top:2px">这里只自定义症状内容；持续时长仍按规则书掷 1D10 轮。</div>';
  } else row.innerHTML='';
}
function saveSanUI(){
  if(!state.ui) state.ui={};
  var c=sanCfg();
  var g=function(id,d){ var e=$(id); return e?Math.max(d==='n'?1:2,Math.round(num(e.value))) : c[id]; };
  c.checkN=Math.min(100,g('sanCheckN','n')); if(!(c.checkN>0)) c.checkN=1;
  c.checkSides=Math.min(1000000,g('sanCheckSides','s'));
  c.lossN=Math.min(100,g('sanLossN','n')); if(!(c.lossN>0)) c.lossN=1;
  c.lossSides=Math.min(1000000,g('sanLossSides','s'));
  c.trig=Math.max(1,Math.min(99,Math.round(num(($('sanTrig')||{}).value!=null?$('sanTrig').value:c.trig))||5));
  var se=$('sanSet'); if(se) c.set=se.value==='custom'?'custom':'book';
  var ta=$('sanCustomList'); if(ta) c.custom=ta.value;
  saveStateQuiet();
}
function multiRollDice(n,sides){
  var arr=[];
  n=Math.max(1,Math.min(100,Math.round(n)||1));
  sides=Math.max(2,Math.min(1000000,Math.round(sides)||100));
  for(var i=0;i<n;i++) arr.push(1+Math.floor(Math.random()*sides));
  return arr;
}
function sumRolls(arr){ var t=0; (arr||[]).forEach(function(v){ t+=v; }); return t; }
function applySanLossToActor(aid, loss){
  var a=actorById(aid); if(!a) return 0;
  if(!a.san) a.san={cur:0,max:99};
  var before=Math.max(0,num(a.san.cur)||0);
  var after=Math.max(0,before-loss);
  a.san.cur=after;
  (state.combat.participants||[]).forEach(function(cc){
    if(cc.actorId===aid){
      if(!cc.san) cc.san={cur:0,max:99};
      cc.san.cur=Math.max(0,(cc.san.cur||0)-loss);
    }
  });
  saveState();
  try{ if(a.kind==='pc'&&typeof renderSurveyors==='function') renderSurveyors(); else if(typeof renderNpcs==='function') renderNpcs(); }catch(e1){}
  renderCombatRoster();
  if(typeof drawBattleScene==='function') drawBattleScene();
  return after;
}
function logDiceLine(line){ diceHistory.unshift(line); if(diceHistory.length>120) diceHistory.pop(); storeDiceState(); renderDiceHist(); }
function rollSanIntOnly(){
  var a=diceTarget?actorById(diceTarget.id):null;
  if(!a){ toast('请先选择目标角色'); return; }
  var j=sanIntJudge(a);
  var msg=diceTarget.name+' INT 检定 D100='+j.roll+'（目标 INT×5='+j.target+'）→ '+(j.pass?'通过：陷入临时疯狂发作（规则书理智摘要）':'未通过：不发作，KP 可选一个不由自主动作');
  showSanDetail(msg,'',j.pass?'#f0c3c3':'#c9d6f0');
  logDiceLine('['+nowStamp()+'] 🧠 '+diceTarget.name+' INT 判定 '+j.roll+' / '+j.target+' → '+(j.pass?'发作':'未发作'));
}
function sanIntJudge(a){
  var intv=a&&a.attrs?Math.max(0,Math.round(num(a.attrs.int)||0)):50;
  var roll=rollDie(100);
  return {roll:roll,int:intv,target:intv*5,pass:roll<=intv*5};
}
function pickBookSymptom(){
  var i=Math.floor(Math.random()*SAN_SYMPTOMS_BOOK.length);
  var s=SAN_SYMPTOMS_BOOK[i];
  return {label:s.n,desc:s.d,dur:s.dur,idx:i+1};
}
function pickCustomSymptom(c){
  var lines=(c.custom||'').split(/\r?\n/).map(function(x){return String(x||'').trim().replace(/\s*｜.*$/, '').trim();}).filter(Boolean);
  if(!lines.length) return null;
  var line=lines[Math.floor(Math.random()*lines.length)];
  return {label:line,desc:'',dur:'1D10 轮',raw:line};
}
function showSanDetail(html,bigText,bg){
  var d=$('sanDetail'); if(d) d.innerHTML=html;
  var b=$('sanResult'); if(b) b.textContent=bigText||'—';
  if(b&&bg) b.style.color=bg;
}
function rollSanSymptom(){
  var c=sanCfg();
  var s=c.set==='custom'?pickCustomSymptom(c):pickBookSymptom();
  var who=diceTarget?diceTarget.name+'（'+(diceTarget.kind==='pc'?'调查员':'NPC')+'）':'';
  if(!s){ toast('自定义列表是空的，先写几行症状'); return; }
  var head='症状'+(c.set==='book'?('：掷出 '+(s.idx)+'（规则书·疯狂发作表）'):'（自定义）')+(who?' · '+who:'');
  showSanDetail(esc(head)+'<br><b style="color:#e3c47f">'+esc(s.label)+'</b>'+(s.desc?'<br>'+esc(s.desc):'')+'<br><span class="muted">持续 '+esc(s.dur)+'</span>'+(c.set==='book'?'<br><span class="muted" style="font-size:12px">发作期结束后按“潜在疯狂”处理：任何理智损失都会再次引发发作；从疯狂中恢复需 1D10 小时（参考规则书）。</span>':''),'💥 疯狂发作');
  logDiceLine('['+nowStamp()+'] 🧠 '+(who||'')+' 疯狂症状：'+s.label+'（持续 '+s.dur+'）');
}
function rollSanCheck(){
  saveSanUI();
  var c=sanCfg();
  var a=diceTarget?actorById(diceTarget.id):null;
  if(!a){ toast('请先在“选择掷骰角色”点一名调查员/NPC'); return; }
  var who=a.name+'（'+(a.kind==='pc'?'调查员':'NPC')+'）';
  var checkRolls=multiRollDice(c.checkN,c.checkSides);
  var checkTotal=sumRolls(checkRolls);
  var isPct=(c.checkN===1&&c.checkSides===100);
  var sanCur=a.san?Math.max(0,Math.round(num(a.san.cur)||0)):0;
  var ok=checkTotal<=sanCur;
  var expr=c.checkN+'D'+c.checkSides;
  var detail=who+'　理智检定 '+expr+' = '+checkTotal+(isPct?('（对照当前 SAN '+sanCur+'）'):'');
  var big='', txtColor='';
  var lines=['['+nowStamp()+'] 🧠 '+who+' SAN 检定 '+expr+'='+checkTotal+' vs SAN '+sanCur];
  if(ok){
    detail+=' → <b style="color:#bfe6c2">成功：本次理智稳住，不损失</b>';
    showSanDetail(detail, '✅ 成功');
    var b=$('sanResult'); if(b) b.style.color='#bfe6c2';
    lines[0]+=' → 成功（不损失）';
    logDiceLine(lines[0]);
    return;
  }
  var lossRolls=multiRollDice(c.lossN,c.lossSides);
  var loss=sumRolls(lossRolls);
  var lossExpr=c.lossN+'D'+c.lossSides;
  detail+=' → <b style="color:#f0c3c3">失败</b><br>损失骰 '+lossExpr+' = '+(lossRolls.join('+'))+' = '+loss+' 点 SAN';
  lines[0]+=' → 失败，损失 '+loss+' SAN';
  var after=applySanLossToActor(a.id,loss);
  detail+='<br>'+esc(who)+' SAN '+sanCur+' → <b>'+after+'</b>';
  if(after<=0){ detail+='<br><b style="color:#f0c3c3">SAN 归零：目标陷入永久疯狂/精神崩溃（按规则书处理）</b>'; lines.push('['+nowStamp()+'] 💀 '+who+' SAN 归零！'); }
  var mad='';
  if(loss>=c.trig){
    var j=sanIntJudge(a);
    detail+='<br>单次损失 '+loss+' ≥ '+c.trig+'：INT 检定 D100='+j.roll+'（INT×5='+j.target+'）→ '+(j.pass?'<b style="color:#f0c3c3">通过：陷入临时疯狂发作</b>':'<b style="color:#c9d6f0">未通过：不发作</b>');
    lines.push('['+nowStamp()+'] 🧠 '+who+' INT '+j.roll+' / '+j.target+' → '+(j.pass?'发作':'未发作'));
    if(j.pass){
      var s=c.set==='custom'?pickCustomSymptom(c):pickBookSymptom();
      if(s){
        mad=(c.set==='book'?('症状掷出 '+s.idx+' · 规则书疯狂发作表'):'自定义症状');
        detail+='<br><b style="color:#e3c47f">💥 '+mad+'：'+esc(s.label)+'</b>'+(s.desc?('<br>'+esc(s.desc)):'')+'<br><span class="muted">持续 '+esc(s.dur)+'；发作期结束后进入“潜在疯狂”（任何理智损失都会再次发作），从疯狂中恢复需 1D10 小时。</span>';
        lines.push('['+nowStamp()+'] 💥 '+who+' 疯狂症状：'+s.label+'（持续 '+s.dur+'）');
      }
    }
  }
  showSanDetail(detail,'SAN -'+loss,txtColor||'#f0c3c3');
  logDiceLine(lines[0]);
  lines.slice(1).forEach(logDiceLine);
}
function buildFloatPanel(){
  var p=$('floatPanel'); if(!p) return;
  p.classList.toggle('script-on', openFloatPanel==='script');
  p.classList.toggle('dice-on', openFloatPanel==='dice');
  if(openFloatPanel==='script'){
    var tabs=scenarioTabs();
    if(noteTabIndex>=tabs.length) noteTabIndex=0;
    p.innerHTML=`<div class="floathead"><b>📜 剧本摘要 / 随团笔记</b>
      <span class="hint">悬浮显示，可边看调查员/NPC 边记录</span>
      <button class="small ghost" style="margin-left:auto" onclick="closeFloatPanel()">收起 ✕</button></div>
      <div class="floatbody">
        <div class="note-tabs" id="noteTabs">${noteTabsHTML()}</div>
        <div class="note-tools">
          <span class="muted" style="font-size:12px">点角色 → 插入快捷链接：</span>
          <span id="noteActorChips">${floatActorsChips('insert')}</span>
        </div>
        <div class="note-editor" id="noteEditor" contenteditable="true" spellcheck="false">${tabs[noteTabIndex].html||''}</div>
        <div class="row" style="justify-content:space-between;margin-top:6px">
          <span class="hint">3 张笔记卡可切换、可改名；点笔记里的“角色标签”打开角色详情。自动保存在本机。</span>
          <button class="small ghost" onclick="clearScenarioNote()">清空当前笔记</button>
        </div>
      </div>`;
  } else {
    p.innerHTML=`<div class="floathead"><b>🎲 骰子台</b>
      <span class="hint">${diceTab==='san'?'理智检定 / SAN 损失 / 疯狂症状':'几个骰子 × 几面骰，自由填数字（例：1d100、3d6）'}</span>
      <button class="small ghost" style="margin-left:auto" onclick="closeFloatPanel()">收起 ✕</button></div>
      <div class="floatbody">
        ${diceTabsBarHTML()}
        <div id="diceTabBody">${diceTab==='san'?diceSanBodyHTML():diceRollBodyHTML()}</div>
      </div>`;
    if(diceTab==='san') updateSanSetUI();
    refreshDiceActorUI();
    renderDiceHist();
  }
}
function clearScenarioNote(){
  var tabs=scenarioTabs();
  if(!confirmBox('清空当前笔记卡的全部内容？')) return;
  tabs[noteTabIndex].html='';
  saveNoteFromEditor(); loadNoteEditor();
  toast('当前笔记已清空');
}
function insertNoteChip(aid){
  var a=actorById(aid); if(!a) return;
  var ed=$('noteEditor'); if(!ed) return;
  ed.focus();
  var chip=document.createElement('span');
  chip.className='fchip nchip'; chip.setAttribute('contenteditable','false');
  chip.dataset.aid=a.id; chip.dataset.kind=a.kind||'pc';
  chip.innerHTML=avatarView(a,'sm')+esc(a.name)+'·'+esc(sideOf(a));
  ed.appendChild(chip);
  ed.appendChild(document.createTextNode(' '));
  saveNoteFromEditor();
  toast('已插入「'+a.name+'」链接');
}
function saveNoteFromEditor(){
  var ed=$('noteEditor'); if(!ed) return;
  if(!state.ui) state.ui={};
  var tabs=scenarioTabs();
  if(noteTabIndex>=tabs.length) noteTabIndex=0;
  tabs[noteTabIndex].html=ed.innerHTML;
  state.ui.scenario=ed.innerHTML;   // 兼容旧字段
  saveStateQuiet();
}
function refreshDiceActorUI(){
  var lbl=$('diceTargetLbl');
  if(diceTarget){
    var curA=actorById(diceTarget.id);
    if(curA){
      diceTarget.name=curA.name||diceTarget.name;
      diceTarget.kind=curA.kind||diceTarget.kind;
      diceTarget.skills=(curA.skills||[]).slice();   // 每次刷新按当前档案重新读取技能
    }
  }
  if(lbl){
    if(diceTarget){
      var a=actorById(diceTarget.id);
      var sanTxt=(a&&a.san)?(a.san.cur+'/'+a.san.max):'—';
      var intV=(a&&a.attrs)?(Math.round(num(a.attrs.int)||0)):0;
      if(diceTab==='san'){
        lbl.textContent='🎯 掷骰目标：'+diceTarget.name+'（'+(diceTarget.kind==='pc'?'调查员':'NPC')+'） · SAN '+sanTxt+' · INT '+intV+'（INT×5='+(intV*5)+'）';
      } else {
        lbl.textContent='🎯 掷骰目标：'+diceTarget.name+'（'+(diceTarget.kind==='pc'?'调查员':'NPC')+'） · 技能自动读取人物卡';
      }
    } else {
      lbl.textContent=(diceTab==='san')?'（先在上方点选一名调查员/NPC 作理智检定目标）':'（未选择目标，直接掷骰也可以）';
    }
  }
  document.querySelectorAll('#diceActorChips .fchip').forEach(function(c){
    c.classList.toggle('on', !!(diceTarget&&c.dataset.aid===diceTarget.id));
  });
  if(diceTab!=='san') populateDiceSkills();
}
function setDiceTarget(chip){
  if(!chip) return;
  var aid=chip.dataset.aid; var a=actorById(aid); if(!a) return;
  if(diceTarget&&diceTarget.id===aid){ diceTarget=null; }
  else { diceTarget={id:a.id,name:a.name,kind:a.kind||'pc',skills:(a.skills||[]).slice()}; }
  refreshDiceActorUI();
}
function diceSkillAdded(s){
  if(!s) return false;
  return skillIsAdded(s.name,s.total,s.base);
}
function populateDiceSkills(){
  var sel=$('diceSkill'); if(!sel) return;
  var keep=sel.value;
  if(!diceTarget){
    sel.innerHTML='<option value="">（不使用技能）</option>';
    var sv=$('diceSkillVal'); if(sv) sv.textContent='';
    var cbox=$('diceSkillChips'); if(cbox) cbox.innerHTML='';
    return;
  }
  var arr=(diceTarget.skills||[]).map(function(s,i){
    return { i:i, name:String((s&&s.name)||'').trim(), total:Math.max(0,Math.round(num(s&&s.total)||0)), added:diceSkillAdded(s) };
  }).filter(function(x){ return x.name; });
  arr.sort(function(a,b){
    if(b.total!==a.total) return b.total-a.total;
    return a.name<b.name?-1:(a.name>b.name?1:0);
  });
  sel.innerHTML='<option value="">（不使用技能）</option>'+arr.map(function(x){
    return '<option value="'+x.i+'">'+esc(x.name)+' '+x.total+'%'+(x.added?' ☆加点':'')+'</option>';
  }).join('');
  if(!arr.length) sel.innerHTML='<option value="">（该角色没有技能数据）</option>';
  var cbox=$('diceSkillChips');
  if(cbox){
    cbox.innerHTML=arr.length
      ? '<span class="muted" style="font-size:11px">技能（按数值高→低 · ☆＝已加点，点选）：</span>'
        +'<div class="dice-skills">'+arr.map(function(x){
          return '<button type="button" class="skchip'+(x.added?' added':'')+'" data-i="'+x.i+'" onclick="diceSkillPick(this)">'+esc(x.name)+' '+x.total+'%'+(x.added?' ☆':'')+'</button>';
        }).join('')+'</div>'
      : '<span class="hint">（该角色没有技能数据）</span>';
  }
  if(keep && keep!=='' && sel.querySelector('option[value="'+keep+'"]')) sel.value=keep;
  diceSkillChanged(sel);
}
function diceSkillChanged(sel){
  if(!sel) return;
  var i=sel.value===''?-1:num(sel.value);
  var sk=(i>=0&&diceTarget&&diceTarget.skills&&diceTarget.skills[i])?diceTarget.skills[i]:null;
  var sv=$('diceSkillVal'); if(sv) sv.textContent=sk?('→ '+Math.round(sk.total||0)+'%'):'';
  markDiceSkillChips();
}
function markDiceSkillChips(){
  var sel=$('diceSkill'); if(!sel) return;
  var cur=sel.value;
  var chips=document.querySelectorAll('#diceSkillChips .skchip');
  for(var i=0;i<chips.length;i++){
    chips[i].classList.toggle('on', String(chips[i].getAttribute('data-i'))===String(cur));
  }
}
function diceSkillPick(btn){
  if(!btn) return;
  var sel=$('diceSkill'); if(!sel) return;
  sel.value=String(btn.getAttribute('data-i')||'');
  diceSkillChanged(sel);
}
function storeDiceState(){
  if(!state||!state.ui) return;
  if(!state.ui.dice) state.ui.dice={bs:1,bf:96,hist:[]};
  state.ui.dice.bs=diceThrSmall; state.ui.dice.bf=diceThrBig;
  state.ui.dice.hist=diceHistory.slice(0,120);
  state.ui.dice.tab=diceTab||'roll';
  saveStateQuiet();
}
function saveDiceThrUI(){
  var bsEl=$('diceBs'), bfEl=$('diceBf');
  var bs=Math.max(1,Math.min(100,Math.round(num(bsEl?bsEl.value:1))||1));
  var bf=Math.max(1,Math.min(100,Math.round(num(bfEl?bfEl.value:100))||100));
  if(bs>bf){ var t=bs; bs=bf; bf=t; }
  diceThrSmall=bs; diceThrBig=bf;
  if(bsEl) bsEl.value=bs; if(bfEl) bfEl.value=bf;
  storeDiceState();
}
function clearDiceHistory(){ diceHistory=[]; renderDiceHist(); storeDiceState(); }
function renderDiceHist(){
  var h=$('diceHist'); if(!h) return;
  h.innerHTML=diceHistory.length?diceHistory.map(function(x){return '<div class="l info">'+esc(x)+'</div>';}).join(''):'<div class="l muted">还没有掷骰记录。</div>';
}
function classifyD100(roll, skillVal, bs, bf){
  if(roll<=bs) return '💥 大成功';
  if(roll>=bf) return '💀 大失败';
  if(skillVal==null) return '（超过失败/成功阈值范围外的普通范围，未选技能不作检定）';
  var ex=Math.floor(skillVal/5), hd=Math.floor(skillVal/2);
  if(roll<=skillVal) return roll<=ex?'✨ 极难成功':(roll<=hd?'🌟 困难成功':'✅ 普通成功');
  return '❌ 失败';
}
function rollFloatDice(){
  var n=Math.max(1,Math.min(100,Math.round(num($('dieCount').value))))||1;
  var sides=Math.max(2,Math.min(1000000,Math.round(num($('dieSides').value))))||100;
  var bs=Math.max(1,Math.min(100,Math.round(num($('diceBs').value))||1));
  var bf=Math.max(1,Math.min(100,Math.round(num($('diceBf').value))||100));
  if(bs>bf){ var t=bs; bs=bf; bf=t; }
  diceThrSmall=bs; diceThrBig=bf;
  var rolls=[];
  for(var i=0;i<n;i++) rolls.push(1+Math.floor(Math.random()*sides));
  var total=rolls.reduce(function(a,b){return a+b;},0);
  var expr=n+'D'+sides;
  var roll1=rolls.length===1?rolls[0]:null;
  var d100= n===1 && sides===100;
  var cls='';
  if(d100){
    var si=$('diceSkill').value===''?-1:num($('diceSkill').value);
    var sk=(si>=0&&diceTarget&&diceTarget.skills&&diceTarget.skills[si])?diceTarget.skills[si]:null;
    cls=classifyD100(roll1, sk?(Math.round(sk.total)||0):null, bs, bf);
  }
  $('diceBig').textContent=total;
  $('diceDetail').textContent=(n>1?('骰面：'+rolls.join(' + ')+' = '):'')+total+(cls?('　'+cls):'')+(d100&&!cls?'':'');
  if(d100) $('diceDetail').textContent+='　'+cls;
  var who=diceTarget?diceTarget.name+' ('+(diceTarget.kind==='pc'?'调查员':'NPC')+') ':'';
  var skillTxt='';
  if(d100){
    var si2=$('diceSkill').value===''?-1:num($('diceSkill').value);
    var sk2=(si2>=0&&diceTarget&&diceTarget.skills&&diceTarget.skills[si2])?diceTarget.skills[si2]:null;
    skillTxt=sk2?('·'+esc(sk2.name)+' '+Math.round(sk2.total)+'%'):'·无技能';
  }
  var line='['+nowStamp()+'] '+(who||'')+'🎲 '+expr+' = '+total+(n>1?('（'+rolls.join(', ')+'）'):'')+skillTxt+(cls?(' → '+cls):'');
  diceHistory.unshift(line);
  if(diceHistory.length>120) diceHistory.pop();
  storeDiceState();
  renderDiceHist();
}
function openActorFromFloat(chip){
  var aid=chip&&chip.dataset.aid; if(!aid) return;
  var a=actorById(aid);
  if(!a){ toast('该角色已不存在（可能被删除）'); return; }
  openActorModal(aid, a.kind);
}
/* 悬浮全局事件：一次性绑定 */
(function initFloatGlobal(){
  if(document.__cocFloatBound) return;
  document.__cocFloatBound=1;
  document.addEventListener('click', function(e){
    if(!e.target||!e.target.closest) return;
    var chip=e.target.closest('.fchip');
    if(!chip) return;
    if(chip.closest('#noteEditor')){
      e.preventDefault();
      openActorFromFloat(chip);
      return;
    }
    var act=chip.dataset.action;
    if(act==='insert') insertNoteChip(chip.dataset.aid);
    else if(act==='target') setDiceTarget(chip);
  });
  document.addEventListener('input', function(e){
    if(e.target && e.target.id==='noteEditor') saveNoteFromEditor();
  });
  window.addEventListener('resize', function(){
    if(openFloatPanel) positionFloatPanel();
  });
})();
