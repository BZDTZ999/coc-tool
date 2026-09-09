/* v3 jsdom 冒烟：覆盖法术/NPC四列/地图缩放与道路名/战斗三行条/实时装备同步/剧情道具/导入入库 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
const failures = [];
let passed = 0;
function ok(name, cond, extra){
  if (cond){ passed++; console.log('PASS ' + name); }
  else { failures.push(name + (extra!==undefined?(' :: '+extra):'')); console.log('FAIL ' + name + (extra!==undefined?(' :: '+extra):'')); }
}
function makeCtx(){
  const target = function(){};
  return new Proxy(target, {
    get(t, prop){
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'measureText') return function(){ return { width: 8 }; };
      if (prop === 'createLinearGradient') return function(){ return { addColorStop: function(){} }; };
      if (prop === 'canvas') return {};
      if (prop === 'getImageData') return function(){ return { data: new Uint8ClampedArray(4) }; };
      return function(){ return undefined; };
    },
    set(){ return true; },
    apply(){ return undefined; }
  });
}
const dom = new JSDOM(HTML, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(w){ w.HTMLCanvasElement.prototype.getContext = function(){ return makeCtx(); }; }
});
const w = dom.window, d = w.document;
const $ = (id) => d.getElementById(id);
const ready = new Promise((res) => {
  if (d.readyState === 'complete' || d.readyState === 'interactive') return res();
  d.addEventListener('DOMContentLoaded', res);
});
(async () => {
  await ready;
  await new Promise(r => setTimeout(r, 80));
  const S = w.state;

  // 基础
  ok('导航6个入口(4页+剧本+骰子)且无快速查询', d.querySelectorAll('#nav button').length === 6 && !d.getElementById('nav-quick') && !d.getElementById('nav-settings'), '#nav=' + d.querySelectorAll('#nav button').length);
  ok('剧本与骰子悬浮入口存在', !!d.getElementById('nav-script') && !!d.getElementById('nav-dice') && !!d.getElementById('floatPanel'));
  ok('品牌名称为带团妙妙小工具', /带团妙妙小工具/.test(d.querySelector('.brand').textContent));
  ok('初始示例数据存在', S.actors.length >= 1 && S.maps.length >= 1 && S.activeMapId);
  ok('快速查询页已删除', !d.getElementById('tab-quick'));

  // 切页无异常（含快速页与无PC进战斗）
  let err = null;
  try { ['surveyors','npcs','maps','combat','quick','settings','surveyors'].forEach(t => w.switchTab(t)); } catch(e){ err = e; }
  ok('各页面 switchTab 无异常', !err, err && (err.stack||err.message));

  // NPC 生成与四列小卡
  w.switchTab('npcs');
  const tplSel = $('npcTplSel');
  ok('NPC 模板下拉有选项', !!tplSel && tplSel.options.length > 0);
  ok('阵营下拉含“跟随模板(推荐)”且无调查员', !!$('npcTplSide') && $('npcTplSide').options.length === 4 && ![...$('npcTplSide').options].some(o=>o.value==='调查员'));
  const tplCount = S.actors.length;
  $('npcTplCount').value = 2;
  w.genNpcFromTpl();
  const newOnes = S.actors.slice(tplCount);
  ok('NPC 生成加入角色库', S.actors.length === tplCount + 1 && newOnes[0]);
  const npc = newOnes[0];
  ok('NPC 有默认头像与阵营', !!npc.avatar && ['盟友','中立','敌人'].indexOf(npc.side) >= 0, JSON.stringify({av:npc.avatar, side:npc.side}));
  const mEl = $('actorModal');
  ok('NPC 弹窗打开', mEl.classList.contains('open'));
  let mh = mEl.innerHTML;
  ok('NPC 弹窗含阵营与头像上传', mh.indexOf('am-side')>0 && mh.indexOf('am-avatar-file')>0 && mh.indexOf('am-avatar-prev')>0);
  ok('NPC 弹窗含法术区', mh.indexOf('am-spells')>0 && mh.indexOf('🔮 法术')>=0);
  ok('NPC 弹窗技能紧凑芯片', mh.indexOf('am-skills')>0 && /skillchips/.test(mh));
  w.closeActorModal();
  // NPC 库：4 列分组小卡
  ok('NPC 库为四列分组', !!$('npcList') && /npccols/.test($('npcList').innerHTML), $('npcList').innerHTML.slice(0,80));
  ok('NPC 库每行两张小卡', $('npcList').querySelectorAll('.npcmini').length >= 1 && /npcminigrid/.test($('npcList').innerHTML), $('npcList').querySelectorAll('.npcmini').length);
  ok('阵营列名可编辑', $('npcList').querySelectorAll('.npchead input').length === 4);
  ok('NPC 第一列默认名为盟友', $('npcList').querySelector('.npchead input').value === '盟友', $('npcList').querySelector('.npchead input').value);
  ok('小卡支持拖拽排序(draggable)', $('npcList').querySelector('.npcmini') && $('npcList').querySelector('.npcmini').getAttribute('draggable') === 'true');

  // 神话生物默认法术（参考规则书）随模板生成并显示
  const mythTpl = [...$('npcTplSel').options].find(o => o.text === '深潜者' || o.value === '深潜者');
  if (mythTpl){
    $('npcTplSel').value = '深潜者'; $('npcTplSide').value = '敌人'; $('npcTplCount').value = 1;
    const cnt0 = S.actors.length; w.genNpcFromTpl();
    const mth = S.actors[S.actors.length-1];
    ok('神话生物带默认法术', mth && Array.isArray(mth.spells) && mth.spells.length >= 1, mth && JSON.stringify(mth.spells));
    w.closeActorModal();
  }

  // PC 弹窗：属性/背景/法术（含库卡片法术展示）
  const pc = { id: w.uid('pc'), kind:'pc', side:'调查员', name:'测试调查员', player:'小明', occupation:'记者', era:'1920s', age:'30', sex:'男',
    residence:'上海', hometown:'宁波',
    avatar:{ preset:'🎩', custom:null },
    attrs:{str:50,con:50,pow:60,dex:55,app:45,siz:60,int:70,edu:75,luck:65},
    hp:{cur:11,max:11}, mp:{cur:12,max:12}, san:{cur:60,max:99}, mov:8, db:'0', build:'0',
    armor:{value:0,type:''},
    skills:[{name:'侦查',total:70},{name:'图书馆使用',total:60},{name:'斗殴',total:45}],
    weapons:[], inv:[{name:'手电筒',qty:1,effect:'other',amount:'',note:'电池'}],
    spells:[],
    cash:50, currency:'美元',
    history:{appearance:'戴圆框眼镜',beliefs:'求真相',people:'导师',places:'旧书店',belongings:'怀表',traits:'固执',secrets:'曾经撒谎',scars:'左手旧伤',phobias:'怕黑暗'},
    backstory:'我在小镇长大，父亲是水手……', notes:'', count:1, template:'', note:'' };
  S.actors.push(pc);
  w.switchTab('surveyors');
  w.openActorModal(pc.id, 'pc');
  mh = mEl.innerHTML;
  ok('PC 弹窗打开', /测试调查员/.test(mh));
  ok('属性 3x3=9 输入', d.querySelectorAll('#actorModal .am-attr').length === 9);
  ok('属性中英对照', mh.indexOf('STR 力量')>0 && mh.indexOf('LUCK 幸运')>0);
  ok('背景拆 9 条', (mh.match(/am-hist-/g)||[]).length === 9);
  ok('背景正文独立', mh.indexOf('am-backstory')>0);
  ok('PC 弹窗法术区', mh.indexOf('am-spells')>0);
  ok('PC 弹窗含剧情道具区', mh.indexOf('am-plot')>0 && mh.indexOf('剧情道具')>0);
  // 加一件剧情道具
  w.addPlotRow();
  const plr = d.querySelector('#am-plot .plotrow');
  ok('剧情道具行已加入', !!plr);
  if (plr){
    plr.querySelector('.plot-name').value='神秘怀表';
    plr.querySelector('.plot-qty').value='1';
    plr.querySelector('.plot-effect').value='other';
    plr.querySelector('.plot-note').value='指针倒走';
  }
  // 加一个法术并保存
  w.addSpellRow();
  const sr = d.querySelector('#am-spells .srow');
  ok('法术行已加入', !!sr);
  if (sr){
    sr.querySelector('.sp-name').value='支配术';
    sr.querySelector('.sp-mp').value='3';
    sr.querySelector('.sp-san').value='1';
    sr.querySelector('.sp-time').value='即时';
    sr.querySelector('.sp-effect').value='意志支配';
  }
  w.saveActorModal();
  ok('保存后弹窗关闭且法术入库', !mEl.classList.contains('open') && pc.spells.length === 1 && pc.spells[0].name === '支配术', JSON.stringify(pc.spells));
  ok('剧情道具随详情保存并在小卡展示', pc.plot && pc.plot.length === 1 && pc.plot[0].name === '神秘怀表' && /plotmini/.test($('pcList').innerHTML) && /神秘怀表/.test($('pcList').innerHTML), JSON.stringify(pc.plot));
  const listHtml = $('pcList').innerHTML;
  ok('调查员库卡片显示法术', /spelltag/.test(listHtml) && /支配术/.test(listHtml));
  ok('库卡片 HP/SAN/MP 三条彩条', (listHtml.match(/class="brow"/g)||[]).length === 3);
  const pcListHtml2=$('pcList').innerHTML;
  ok('小卡头像为可点击上传(隐藏文件框)', /pcAvatarClick/.test(pcListHtml2) && /onPcAvatarFile/.test(pcListHtml2) && $('pcList').querySelector('.pccard .pcav input[type=file]')!=null);

  // 导入真实卡 → 直接进库不弹窗
  const buf = fs.readFileSync('/Users/krisaneich/Documents/跑团/卡/苹狗卡/符苏 神仙索.xlsx');
  const before = S.actors.length;
  w.parseCardData(new Uint8Array(buf), '符苏 神仙索.xlsx');
  ok('解析预览生成', /已读取/.test($('importPreview').innerHTML));
  w.doImport();
  const fusu = S.actors[S.actors.length - 1];
  ok('导入直接进入调查员库', S.actors.length === before + 1 && fusu && fusu.name === '符苏');
  ok('导入后不弹编辑窗', !mEl.classList.contains('open'));
  ok('导入卡在库中高亮', !!d.querySelector('#pcList .actorcard.flash') || /符苏/.test($('pcList').innerHTML));
  ok('导入属性/背景正确', fusu.attrs.str===40 && fusu.history.beliefs==='有钱能使鬼推磨' && fusu.backstory.indexOf('从小我家里贫困')>=0);
  ok('导入角色法术字段为空列表', Array.isArray(fusu.spells) && fusu.spells.length === 0);
  ok('导入随身物品正确入库', Array.isArray(fusu.inv) && fusu.inv.length === 1 && fusu.inv[0].name === '算命大旗', JSON.stringify(fusu.inv));
  ok('导入调查员经历默认为空(该卡未填)', Array.isArray(fusu.campaigns) && fusu.campaigns.length === 0, JSON.stringify(fusu.campaigns));

  // 地图：缩放 / 去3D / 素材
  w.switchTab('maps');
  const mapHtml = $('tab-maps').innerHTML;
  ok('地图页有缩放控件', mapHtml.indexOf('zoomBy')>=0 && !!$('zoomVal'));
  ok('地图页已去掉伪3D按钮', mapHtml.indexOf('genIsoFloor') < 0 && mapHtml.indexOf('伪3D') < 0);
  ok('地图页支持上传自定义素材', mapHtml.indexOf('customPropFile')>=0);
  const cv = $('mapCanvas');
  const baseW = cv.width;
  w.zoomBy(0.2);
  ok('地图缩放放大画布', cv.width > baseW, baseW + ' -> ' + cv.width);
  w.zoomReset();
  ok('地图缩放可重置', cv.width === 1000);
  ok('地图载具栏/路线控件仍工作', !!$('mapVehicles') && !!$('rtStart'));
  const propBtns = $('propPalette').querySelectorAll('.propbtn');
  ok('摆件素材扩充(>=40)', propBtns.length >= 40, propBtns.length);
  ok('素材栏含上传按钮', /上传素材/.test($('propPalette').innerHTML));
  w.addProp(0);
  const curMap = w.currentMap();
  ok('可添加摆件', (curMap.props||[]).length >= 1);
  // 自定义素材
  S.customProps = S.customProps || [];
  S.customProps.push({id:'cp-test', name:'门牌', img:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='});
  w.renderPropPalette();
  ok('自定义素材出现在素材栏', $('propPalette').innerHTML.indexOf('cp-test')>=0 || /门牌/.test($('propPalette').innerHTML));
  w.addCustomPropToMap(0);
  const lastProp = curMap.props[curMap.props.length-1];
  ok('自定义素材可放到地图', !!lastProp && !!lastProp.img);
  ok('地图元素黑底白字名牌函数存在', /plateText/.test(w.overlayMap.toString()) && /fillStyle='#fff'|fillStyle=\"#fff\"/.test(w.plateText.toString()));
  ok('地图支持拖拽平移(非滑块)', /mapPanStart/.test(w.onCanvasDown.toString()) && /scrollLeft/.test(w.onCanvasMove.toString()));
  if (curMap.legs && curMap.legs.length){
    curMap.legs[0].name='海堤大道';
    w.renderMapLists();
    ok('道路名称可编辑并渲染到列表', /海堤大道/.test($('tab-maps').innerHTML) && /道路名称（显示在地图上）/.test($('mapLegsCard').innerHTML));
  }
  // token / 路线 / 载具分配回归
  const ptok = (curMap.tokens||[]).length;
  w.toggleMapToken(fusu.id);
  ok('地图角色token仍可加入', (curMap.tokens||[]).length === ptok+1);
  const rtStart=$('rtStart'), rtEnd=$('rtEnd'), rtVeh=$('rtVeh');
  rtStart.value=0; rtEnd.value=4; rtVeh.value='v-car'; w.onRouteSel();
  ok('路线时间仍可计算', /总 .* km/.test($('routeOut').innerHTML) || /约 /.test($('routeOut').innerHTML));
  const vIdx = S.vehicles.length; w.addVehicle();
  const lastSel = $('mapVehicles').querySelectorAll('select[data-k="assign"]');
  lastSel[lastSel.length-1].value = fusu.id;
  w.onVehInput(lastSel[lastSel.length-1]);
  ok('载具仍可分配角色', S.vehicles[vIdx].assign === fusu.id);
  w.delVehicle(vIdx);
  w.toggleMapToken(fusu.id);

  // 战斗：三行条 / 护甲 / MP / 法术
  w.switchTab('combat');
  ok('战斗页有场景画布与成员表', !!$('battleCanvas') && !!$('combatTable'));
  ok('成员表无速度列', d.querySelector('#combatTable thead').innerHTML.indexOf('MOV')<0 && d.querySelector('#combatTable thead').innerHTML.indexOf('速度')<0);
  const sceneDrawSrc = w.drawOver.toString();
  ok('场景头像下 HP/SAN/MP 三行彩条绘制', sceneDrawSrc.indexOf('miniBar')>=0 && sceneDrawSrc.indexOf("'H'")>=0 && sceneDrawSrc.indexOf("'S'")>=0 && sceneDrawSrc.indexOf("'M'")>=0);
  // 加入敌人NPC
  const enemy = S.actors.filter(a=>a.kind==='npc')[0];
  enemy.side='敌人';
  $('cbAddKind').value='npc'; w.refreshCombatAddSel();
  ok('切到NPC类型下拉可用', Array.from($('cbAddSel').options).some(o=>o.value===enemy.id));
  $('cbAddSel').value=enemy.id; $('cbAddCount').value=1; w.combatAdd();
  // 加入调查员（测试调查员改 → 有法术）
  const pcIn = pc;
  $('cbAddKind').value='pc'; w.refreshCombatAddSel();
  $('cbAddSel').value=pcIn.id; w.combatAdd();
  const parts = S.combat.participants;
  const myPart = parts.filter(c=>c.actorId===pcIn.id)[0];
  ok('战斗成员同步了法术', myPart && myPart.spells && myPart.spells.length===1);
  w.selectComb(myPart.id);
  ok('战斗面板 HP/SAN/MP/护甲 各占独立行', $('activePanel').querySelectorAll('.adjrow').length === 4, 'rows='+$('activePanel').querySelectorAll('.adjrow').length);
  const wpSel = $('ap-wpn-preset');
  if (wpSel){ wpSel.value = [...wpSel.options].find(o=>o.value!=='').value; w.combAddWeapon(); }
  ok('战斗内实时加武器并同步角色档案', (myPart.weapons||[]).length === 1 && (pcIn.weapons||[]).length === 1, JSON.stringify({c:myPart.weapons&&myPart.weapons.length,a:pcIn.weapons&&pcIn.weapons.length}));
  if ((myPart.weapons||[]).length){ w.combDelLoadout('weapons',0); }
  ok('战斗内删武器同步角色档案与小卡', (myPart.weapons||[]).length === 0 && (pcIn.weapons||[]).length === 0);
  ok('战斗场景敌右我左排布', (() => {
    let left=0,right=0;
    parts.forEach(c=>{ const p=(S.combat.scene.pos||{})[c.id]; if(!p)return; const side=w.sideOf(c); if((side==='调查员'||side==='盟友')&&p.x<500)left++; else if(p.x>500)right++; });
    return left>=1 && right>=1;
  })());
  w.selectComb(myPart.id);
  const ap = $('activePanel').innerHTML;
  ok('操作面板含护甲显示与调整', ap.indexOf('ap-armor')>=0 && ap.indexOf('combSetArmor')>=0 && /护甲/.test(ap));
  ok('操作面板含 MP 调整', ap.indexOf('扣MP')>=0 && ap.indexOf('回MP')>=0);
  ok('操作面板含施法按钮', ap.indexOf('combatCastSpell(0)')>=0 && /支配术/.test(ap));
  const mpBefore = myPart.mp.cur, sanBefore = myPart.san.cur;
  w.combatCastSpell(0);
  ok('施法扣 MP 与 SAN', myPart.mp.cur === Math.max(0,mpBefore-3) && myPart.san.cur <= sanBefore, JSON.stringify({a:myPart.mp.cur,b:mpBefore,s:myPart.san.cur,t:sanBefore}));
  // 护甲反馈在受击(攻击)路径上：设置目标护甲并直接攻击一次
  const enemyPart = parts.filter(c=>c.actorId===enemy.id)[0];
  enemyPart.armor = 4;
  w.selectComb(myPart.id);
  w.combTargetId = enemyPart.id;
  const hpBefore = enemyPart.hp.cur;
  try { w.combatAttackRoll(); ok('带护甲攻击检定不抛异常', true); } catch(e){ ok('带护甲攻击检定不抛异常', false, e.stack); }
  ok('护甲参与受击(HP 不回增)', enemyPart.hp.cur <= hpBefore);
  // MP 手动调整 & 护甲设置
  w.selectComb(myPart.id);
  $('ap-mp').value='2'; w.combAdjustVal('mp',-1);
  $('ap-armor').value='5'; w.combSetArmor();
  ok('手动扣MP生效', myPart.mp.cur === Math.max(0,mpBefore-3-2), myPart.mp.cur);
  ok('护甲可手动设置', myPart.armor === 5);

  // 快速查询页已删除：旧存档/误切换应回落调查员
  w.switchTab('quick');
  ok('快速查询不可达且回落到调查员页', !$('tab-quick') && !$('nav-quick') && S.activeTab === 'surveyors');


  // ===== 最后一批：无攻击UI / 战斗成员表拆列 / 3x3属性 / 骰子SAN / 多地图卡片 =====
  pc.skills.push({name:'聆听',total:15},{name:'游泳',total:20});
  pc.campaigns=[{module:'雾都疑云',note:'SAN-2'},{module:'食尸鬼之夜',note:'HP-3'},{module:'旧日来信',note:'侦查+5'}];
  w.openActorModal(pc.id,'pc');
  const pcModalHtml = $('actorModal').innerHTML;
  ok('PC详情卡不再含攻击自动判定区', pcModalHtml.indexOf('攻击（自动判定）')<0 && pcModalHtml.indexOf('ap-target')<0 && pcModalHtml.indexOf('combatAttackRoll')<0, pcModalHtml.indexOf('攻击')>=0?'仍含攻击字样':'');
  ok('详情含调查员经历编辑区', pcModalHtml.indexOf('am-campaigns')>0 && pcModalHtml.indexOf('addCampaignRow')>=0);
  ok('经历行按填入显示3段', (pcModalHtml.match(/class="camp-mod"/g)||[]).length===3, (pcModalHtml.match(/class="camp-mod"/g)||[]).length);
  ok('仅高于基础值的技能留在上方(3)', d.querySelectorAll('#actorModal #am-skills .skillchip').length===3, ''+d.querySelectorAll('#actorModal #am-skills .skillchip').length);
  ok('等于/低于基础值的技能收进默认区(2)', d.querySelectorAll('#actorModal #am-default-skills .skillchip').length===2, ''+d.querySelectorAll('#actorModal #am-default-skills .skillchip').length);
  w.closeActorModal();
  w.renderSurveyors();
  ok('跑过3团的调查员小卡带银层 runs3', /class="actorcard pccard runs3"/.test($('pcList').innerHTML));
  pc.campaigns=[];
  for(let ci=0;ci<9;ci++) pc.campaigns.push({module:'团'+(ci+1),note:''});
  w.renderSurveyors();
  ok('9团以上=火焰发光边+顶部星星', /class="actorcard pccard runs8"/.test($('pcList').innerHTML) && /runstar/.test($('pcList').innerHTML));
  w.switchTab('combat');
  const ths2=[...d.querySelectorAll('#combatTable thead th')].map(x=>x.textContent.trim());
  ok('战斗成员表 SAN/MP 分列', ths2.indexOf('SAN')>=0 && ths2.indexOf('MP')>=0 && ths2.indexOf('SAN/MP')<0, JSON.stringify(ths2));
  w.selectComb(myPart.id);
  const apHtml=$('activePanel').innerHTML;
  ok('战斗详情无攻击区', apHtml.indexOf('攻击（自动判定）')<0 && apHtml.indexOf('ap-wpn"')<0 && apHtml.indexOf('combatAttackRoll')<0);
  ok('战斗详情属性 3x3 共 9 项', d.querySelectorAll('#activePanel .combattrgrid .cat').length===9, ''+d.querySelectorAll('#activePanel .combattrgrid .cat').length);
  const myRow=d.querySelector('#combatBody tr[data-id="'+myPart.id+'"]');
  if (myRow){
    const cells=myRow.querySelectorAll('td');
    ok('战斗成员阵营缩略一字', cells[2] && cells[2].textContent.trim().length===1 && /调|盟|中|敌/.test(cells[2].textContent), cells[2]&&cells[2].textContent.trim());
    ok('战斗成员含移出操作', cells[8] && cells[8].textContent.indexOf('移出')>=0);
    ok('战斗成员名限制宽度不撑破', !!myRow.querySelector('.combmn') && !/SAN\/MP/.test(myRow.textContent));
  } else { ok('战斗成员行存在', false, '找不到行'); }

  // 骰子台两个子页签 + SAN 检定流程
  w.toggleFloat('dice');
  ok('骰子台有掷骰/SAN两个子页签', !!$('dtab-roll') && !!$('dtab-san'));
  w.switchDiceTab('roll');
  const rfchip=[...d.querySelectorAll('#diceActorChips .fchip')].find(c=>c.dataset.aid===pc.id);
  if(rfchip){ w.setDiceTarget(rfchip); }
  const dSkillSel=$('diceSkill');
  const dOpts=dSkillSel?[...dSkillSel.options].map(o=>o.textContent.trim()):[];
  ok('骰子技能下拉按角色数值高→低', dOpts.length===6 && /侦查.*70/.test(dOpts[1]) && /图书馆使用.*60/.test(dOpts[2]) && /斗殴.*45/.test(dOpts[3]) && /游泳.*20/.test(dOpts[4]) && /聆听.*15/.test(dOpts[5]), JSON.stringify(dOpts));
  const dChips=$('diceSkillChips');
  ok('骰子技能芯片高亮已加点', !!dChips && dChips.querySelectorAll('.skchip').length===5 && dChips.querySelectorAll('.skchip.added').length===3, dChips?('' + dChips.querySelectorAll('.skchip').length + '/' + dChips.querySelectorAll('.skchip.added').length):'无chips');
  w.diceTarget=null;
  w.switchDiceTab('san');
  ok('SAN 检定页控件齐全', !!$('sanCheckN') && !!$('sanLossN') && !!$('sanTrig') && !!$('sanSet'));
  $('sanSet').value='custom'; w.saveSanUI(); w.updateSanSetUI();
  ok('SAN 自定义症状列表可编辑', !!$('sanCustomList') && /每行一条/.test($('sanCustomList').placeholder));
  if ($('sanCustomList')){ $('sanCustomList').value='用指甲在墙上写字\n高歌一曲｜2D3 轮'; w.saveSanUI(); }
  const fchip=[...d.querySelectorAll('#diceActorChips .fchip')].find(c=>c.dataset.aid===pc.id);
  if (fchip){ w.setDiceTarget(fchip); }
  ok('骰子台已选中掷骰角色', !!w.diceTarget && w.diceTarget.id===pc.id, w.diceTarget&&w.diceTarget.id);
  const sanBeforeDice=pc.san.cur;
  const origRandom=w.Math.random;
  w.Math.random=function(){ return 0.9999; };  // 检定=100失败, 损失骰=6, INT=100(≤INT×5)会发作
  w.rollSanCheck();
  w.Math.random=origRandom;
  const sanAfterDice=pc.san.cur;
  ok('SAN失败损失写回角色档案', sanAfterDice===Math.max(0,sanBeforeDice-6), sanBeforeDice+' -> '+sanAfterDice);
  const syncedPart=(S.combat.participants||[]).filter(p=>p.actorId===pc.id)[0];
  ok('SAN损失同步战斗成员', syncedPart && syncedPart.san.cur===sanAfterDice, syncedPart&&syncedPart.san.cur);
  ok('疯狂症状/发作进入掷骰日志', w.diceHistory.some(function(x){return x.indexOf('疯狂症状')>=0;}), JSON.stringify(w.diceHistory.slice(0,2)));
  ok('自定义列表只定症状名、时长仍掷1D10', w.diceHistory.some(function(x){return x.indexOf('高歌一曲')>=0 && x.indexOf('1D10 轮')>=0 && x.indexOf('2D3')<0;}), JSON.stringify(w.diceHistory.slice(0,3)));
  w.toggleFloat('dice');

  // 多地图卡片：上限 3、切换、改名、删除
  const origPrompt=w.prompt, origConfirm=w.confirm;
  w.prompt=function(){ return '新地图'; }; w.confirm=function(){ return true; };
  const mapCountBefore=(S.maps||[]).length;
  w.switchTab('maps');
  while((S.maps||[]).length<3) w.newMap();
  w.newMap(); // 到上限
  ok('地图最多保留 3 张', (S.maps||[]).length===3, ''+(S.maps||[]).length);
  ok('地图固定 3 个页签位（含空格新建）', d.querySelectorAll('#mapCardBar .mapcard').length===3 && d.querySelectorAll('#mapCardBar .mapgo').length===3);
  const m1=(S.maps||[])[1]; if (m1){
    w.setActiveMap(m1.id);
    ok('点击地图按钮可切换', S.activeMapId===m1.id && w.currentMap().id===m1.id);
    w.prompt=function(){ return '夜访阿卡姆'; };
    w.renameMapId(m1.id);
    ok('地图卡名称可自定义', (S.maps||[]).filter(m=>m.id===m1.id)[0].name==='夜访阿卡姆');
    w.deleteMapId(m1.id);
    ok('地图卡可删除且自动切换', (S.maps||[]).length===2 && !!w.currentMap());
  }
  w.prompt=origPrompt; w.confirm=origConfirm;

  console.log('\n==== RESULT: ' + passed + ' passed, ' + failures.length + ' failed ====');
  if (failures.length){ console.log('FAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
  process.exit(0);
})().catch(e => { console.log('SMOKE CRASH', e && e.stack || e); process.exit(2); });
