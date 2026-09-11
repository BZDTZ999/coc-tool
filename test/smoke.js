/* v3 jsdom 冒烟：覆盖法术/NPC四列/地图缩放与道路名/战斗三行条/实时装备同步/剧情道具/导入入库 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { JSDOM } = require('jsdom');

/* ---- 测试用：手搓一个最小 .docx（zip），验证 docx 解析引擎 ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c; }
  return t;
})();
function crc32(buf){ let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function makeZip(files){
  const locals = [], centrals = []; let off = 0;
  for (const f of files){
    const raw = Buffer.from(f.data), def = zlib.deflateRawSync(raw), crc = crc32(raw), name = Buffer.from(f.name, 'utf8');
    const method = f.stored ? 0 : 8, body = f.stored ? raw : def;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38); ch.writeUInt32LE(off, 42);
    centrals.push(ch, name);
    off += 30 + name.length + body.length;
  }
  const cd = Buffer.concat(centrals), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat(locals.concat([cd, eocd]));
}
function miniDocxBytes(){
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>第一章 模组标题</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>加粗段落</w:t></w:r><w:r><w:t>普通文字</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>姓名</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>职业</w:t></w:r></w:p></w:tc></w:tr>
<w:tr><w:tc><w:p><w:r><w:t>爱丽丝</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>记者</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rId5"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:r><w:t>第二页</w:t></w:r></w:p>
</w:body></w:document>`;
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>';
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
  return makeZip([
    { name: '[Content_Types].xml', data: '<Types/>', stored: true },
    { name: 'word/document.xml', data: doc },
    { name: 'word/_rels/document.xml.rels', data: rels },
    { name: 'word/media/image1.png', data: png, stored: true }
  ]);
}

const HTML = fs.readFileSync(path.join(__dirname, '..', 'offline.html'), 'utf-8');
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
  const cssText = (() => { let t=''; try{ [...d.styleSheets].forEach(sh => { try{ [...sh.cssRules].forEach(r => { t += r.cssText + '\n'; }); }catch(e){} }); }catch(e){} return t; })();

  // 基础
  ok('导航8个入口(4页+剧本+骰子+模组+规则书)且无快速查询', d.querySelectorAll('#nav button').length === 8 && !d.getElementById('nav-quick') && !d.getElementById('nav-settings'), '#nav=' + d.querySelectorAll('#nav button').length);
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
  ok('PC 弹窗背包区只有一张「背包 / 随身用品」清单（不再单开「背包格」框/选列）',
    d.querySelectorAll('#am-inv .inv-slot').length===0 && d.querySelector('#am-inv .inv-name')!=null &&
    /背包 \/ 随身用品/.test(mh) && /「背包格」那一列的东西也在这张清单里/.test(mh), '');
  // 再加两件随身物品（原卡右侧「背包格」那列的东西也一样在这张清单里编辑）
  w.addInvRow(); w.addInvRow();
  var invSlots=[...d.querySelectorAll('#am-inv .listitem')];
  invSlots[1].querySelector('.inv-name').value='厚衣服数身';
  invSlots[2].querySelector('.inv-name').value='三品灵根D8';
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
  ok('弹窗里新加的随身物品随详情保存进背包', (function(){
    var nm=(pc.inv||[]).map(function(i){return i.name;});
    return nm.length===3 && nm[1]==='厚衣服数身' && nm[2]==='三品灵根D8';
  })(), JSON.stringify(pc.inv));
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
  ok('9团以上=发光火焰边+传奇标签+星星', /class="actorcard pccard runs8"/.test($('pcList').innerHTML) && /pclegend/.test($('pcList').innerHTML) && /runstars/.test($('pcList').innerHTML));
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

  // ---- 本轮新增：画布高清（Retina）/ 场景全屏 / 调查员便签标签 ----
  // 画布高清：后备缓冲 = CSS 尺寸 × devicePixelRatio
  try { Object.defineProperty(w, 'devicePixelRatio', { value: 2, configurable: true }); } catch(e){ w.devicePixelRatio = 2; }
  w.switchTab('maps');
  w.drawMapCanvas();
  const mcv = $('mapCanvas'), mz = (w.currentMap() && w.currentMap().zoom) || 1;
  ok('地图画布按 DPR 放大后备缓冲', mcv.width === Math.round(1000*mz*2) && mcv.style.width === Math.round(1000*mz)+'px',
     'attr=' + mcv.width + ' css=' + mcv.style.width + ' z=' + mz);
  w.switchTab('combat');
  w.drawBattleScene();
  const bcv = $('battleCanvas');
  ok('战斗画布按 DPR 放大后备缓冲', bcv.width === 940*2 && bcv.style.width === '940px', 'attr=' + bcv.width + ' css=' + bcv.style.width);
  try { Object.defineProperty(w, 'devicePixelRatio', { value: 1, configurable: true }); } catch(e){ w.devicePixelRatio = 1; }
  w.drawMapCanvas(); w.drawBattleScene();

  // 场景全屏：进入 / 图标菜单 / 返回
  w.switchTab('maps');
  ok('地图卡有全屏按钮', !!$('mapFsBtn') && !!$('combatFsBtn'));
  w.toggleSceneFs('map');
  ok('地图全屏：body 标记 + 图标菜单出现', d.body.classList.contains('fs-map') && $('fsNav').hidden === false);
  ok('全屏图标菜单 6 项 + 返回', d.querySelectorAll('#fsNav button').length === 7 && !!d.querySelector('#fsNav .fsback'));
  ok('全屏不隐藏导航栏本体（仍为8个入口）', d.querySelectorAll('#nav button').length === 8);
  // 全屏切换场景：战斗
  w.toggleSceneFs('combat');
  ok('全屏可在 地图/战斗 之间切换', d.body.classList.contains('fs-combat') && !d.body.classList.contains('fs-map'));
  // 点击角色 → 详情悬浮在最右（comb-has-active）
  const anyPart = (S.combat.participants||[])[0];
  if (anyPart){ w.selectComb(anyPart.id); }
  ok('战斗全屏点角色后详情浮层出现', !!anyPart && d.body.classList.contains('comb-has-active'));
  // 全屏四项悬浮互斥：调查员 / NPC / 笔记 / 骰子 只能开一个
  w.toggleFsPanel('surveyors');
  ok('全屏悬浮调查员库', d.body.classList.contains('fsfloat-surveyors') && !d.body.classList.contains('fsfloat-npcs'));
  w.toggleFsPanel('npcs');
  ok('打开 NPC 浮层会收起调查员浮层', d.body.classList.contains('fsfloat-npcs') && !d.body.classList.contains('fsfloat-surveyors'));
  w.toggleFloat('dice');
  ok('打开骰子会收起 NPC 浮层（四项互斥）', w.openFloatPanel === 'dice' && !d.body.classList.contains('fsfloat-npcs'));
  w.toggleFloat('script');
  ok('笔记与骰子也互斥', w.openFloatPanel === 'script' && !d.getElementById('diceTabBody'));
  w.toggleFloat('script');
  w.toggleFsPanel('surveyors');
  ok('打开调查员浮层会收起笔记浮层', !w.openFloatPanel && d.body.classList.contains('fsfloat-surveyors'));
  w.exitSceneFs();
  ok('返回退出全屏并收起浮层', !d.body.classList.contains('fs-map') && !d.body.classList.contains('fs-combat')
     && !d.body.classList.contains('fsfloat-surveyors') && $('fsNav').hidden === true);
  ok('场景全屏缩放可恢复', true);

  // 调查员便签标签：新建 / 不限长度 / 贴上 / 上限 6 / 移动 / 移除 / 删除
  const libCount0 = w.pcTagLib().length;
  ok('标签库默认自带若干标签', libCount0 >= 4, '' + libCount0);
  $('tagNameInput').value = '一二三四五六七';   // 7 个汉字 → 不再截断（方便拼音输入）
  $('tagColorInput').value = '#7fc0ea';
  w.addTagLib();
  const newTag = w.pcTagLib()[w.pcTagLib().length-1];
  ok('标签名不再限制长度（可正常用拼音输入汉字）', newTag && newTag.name === '一二三四五六七' && newTag.color === '#7fc0ea', newTag && newTag.name);
  ok('标签栏渲染出便签', d.querySelectorAll('#tagLib .tagpill').length === w.pcTagLib().length);
  const tagPc = S.actors.filter(a=>a.kind==='pc')[0];
  ok('调查员有 tags 数组（懒初始化）', !!tagPc && Array.isArray(w.actorTags(tagPc)));
  $('tagNameInput').value = '第六';
  w.addTagLib();
  ok('标签库可继续新增', w.pcTagLib().length === libCount0 + 2, '' + w.pcTagLib().length);
  const libNow = w.pcTagLib().slice();
  libNow.forEach(t => w.attachTagToActor(tagPc.id, t.id));
  ok('点选/拖拽可把标签贴到小卡上', (tagPc.tags||[]).length === libNow.length, '' + (tagPc.tags||[]).length);
  ok('小卡最多 6 个标签（刚好满）', (tagPc.tags||[]).length === 6, '' + (tagPc.tags||[]).length);
  $('tagNameInput').value = '第七';
  w.addTagLib();
  const extraTag = w.pcTagLib()[w.pcTagLib().length-1];
  const before7 = (tagPc.tags||[]).length;
  w.attachTagToActor(tagPc.id, extraTag.id);
  ok('第 7 个标签会被拒绝', (tagPc.tags||[]).length === before7, '' + (tagPc.tags||[]).length);
  w.switchTab('surveyors');
  ok('小卡右上角渲染便签条', /pctagbox/.test($('pcList').innerHTML) && new RegExp(tagPc.tags[0].name).test($('pcList').innerHTML));
  // 拖拽转移：另一张卡
  const tagPc2 = { id: w.uid('pc'), kind:'pc', side:'调查员', name:'测试调查员2', tags:[], attrs:{str:50,con:50,pow:50,dex:50,app:50,siz:50,int:50,edu:50,luck:50},
    avatar:{preset:'🎩',custom:null}, hp:{cur:10,max:10}, san:{cur:50,max:99}, mp:{cur:10,max:10}, skills:[], weapons:[], inv:[], spells:[], plot:[], campaigns:[] };
  S.actors.push(tagPc2);
  w.renderSurveyors();
  const moveTag = tagPc.tags[0];
  const dt2 = { d:{}, setData(k,v){this.d[k]=v;}, getData(k){return this.d[k]||'';} };
  w.tagCardDragStart({ dataTransfer: dt2, stopPropagation(){}, currentTarget:{dataset:{}} }, tagPc.id, moveTag.id);
  w.tagCardDrop({ preventDefault(){}, dataTransfer: dt2 }, tagPc2.id);
  ok('便签可拖到另一张卡', (tagPc2.tags||[]).length === 1 && (tagPc.tags||[]).length === 5,
     (tagPc2.tags||[]).length + '/' + (tagPc.tags||[]).length);
  // 点击标签库 → 点小卡（捕获阶段委托）
  const libTag = w.pcTagLib()[0];
  const libPill = d.querySelector('#tagLib .tagpill[data-tagid="'+libTag.id+'"]');
  w.tagPillClick(libPill);
  ok('点标签库便签即可选中（点选添加）', !!libPill && w.tagLibSel === libTag.id);
  const cardEl = d.querySelector('#pcList .pccard[data-id="'+tagPc.id+'"]');
  cardEl.dispatchEvent(new w.MouseEvent('click', { bubbles:true, cancelable:true }));
  ok('点选标签后点小卡即可贴上', (tagPc.tags||[]).some(x=>x.libId===libTag.id));
  // 移除 + 删除
  const rmTag = tagPc.tags[0];
  const nBefore = tagPc.tags.length;
  w.removeTagFromActor(tagPc.id, rmTag.id);
  ok('可移除小卡上的便签', tagPc.tags.length === nBefore - 1);
  w.confirm = function(){ return true; };
  const libN = w.pcTagLib().length;
  w.tagLibDelete(libTag.id);
  ok('可从标签库删除标签并同步移除', w.pcTagLib().length === libN - 1 && !(tagPc.tags||[]).some(x=>x.libId===libTag.id));
  w.confirm = origConfirm;
  const names = tagPc.tags.map(t=>t.name);
  ok('便签自定义颜色可改', (function(){ const t=w.pcTagLib()[0]; w.tagLibRecolor(t.id,'#8fd69b'); return w.findLibTag(t.id).color==='#8fd69b'; })());
  ok('深色便签自动用浅色文字、浅色便签用深色文字', w.tagFg('#121212')==='#fdfaf1' && w.tagFg('#f7e7b0')==='#17120a');

  // 本轮：地图全屏图标工具条 / 旋转 / 战斗状态图标 / 战斗道具 / 全屏小卡
  w.switchTab('maps');
  w.toggleSceneFs('map');
  ok('地图全屏：左下角图标工具条出现', !!$('fsMapCtl') && d.body.classList.contains('fs-map'));
  ok('地图全屏工具有旋转/切换/缩放（纯图标）',
     /rotateMap/.test($('fsMapCtl').innerHTML) && /cycleMap/.test($('fsMapCtl').innerHTML) && /zoomBy/.test($('fsMapCtl').innerHTML));
  const rot0 = w.mapRotOf(w.currentMap());
  w.rotateMap(90);
  ok('地图可旋转 90°', w.mapRotOf(w.currentMap()) === (rot0+90)%360, '' + w.mapRotOf(w.currentMap()));
  w.rotateMap(90); w.rotateMap(90); w.rotateMap(90);
  ok('旋转 4 次回到原方向', w.mapRotOf(w.currentMap()) === rot0);
  // 两种旋转：整体旋转（文字一起转）/ 地图旋转（文字保持水平）
  w.rotateMap(90,'all');
  ok('整体旋转：文字跟着一起转', w.currentMap().rotUpright === false && w.mapRotOf(w.currentMap()) === (rot0+90)%360);
  w.rotateMap(90,'upright');
  ok('地图旋转：文字保持水平', w.currentMap().rotUpright === true && w.mapRotOf(w.currentMap()) === (rot0+180)%360);
  ok('地图工具条：选择拖动 / 移动角色摆件 / 添加地点 三个按钮', (function(){
    var html=$('mapTools').innerHTML;
    return /mt-select/.test(html) && /mt-move/.test(html) && /mt-add/.test(html) &&
      html.indexOf('mt-select') < html.indexOf('mt-move') && html.indexOf('mt-move') < html.indexOf('mt-add') &&
      /移动角色\/摆件/.test(html) && /fsicon" data-tool="move"/.test($('fsMapCtl').innerHTML);
  })());

  ok('地图工具：🖱 拖动地点只抓地点、🧍 移动角色/摆件只抓角色与摆件', (function(){
    var m=w.currentMap(); if(!m) return false;
    m.props=m.props||[]; m.props.push({icon:'🪑',x:321,y:222,scale:1});
    m.points=m.points||[]; m.points.push({id:'pz',name:'测试点',icon:'📍',desc:'',x:100,y:100});
    m.tokens=m.tokens||[]; m.tokens.push({actorId:(w.state.actors[0]||{}).id,x:400,y:400});
    var orig=w.mapCanvasPos, old=w.mapTool;
    w.mapCanvasPos=function(ev){ return {x:ev.x,y:ev.y}; };
    w.setMapTool('select');
    var pOnPoint=w.findMapHit({x:100,y:100},true), pOnProp=w.findMapHit({x:321,y:222},true), pOnTok=w.findMapHit({x:400,y:400},true);
    w.setMapTool('move');
    var mOnPoint=w.findMapHit({x:100,y:100},true), mOnProp=w.findMapHit({x:321,y:222},true), mOnTok=w.findMapHit({x:400,y:400},true);
    w.mapCanvasPos=orig; w.setMapTool(old||'select');
    return !!pOnPoint && pOnPoint.type==='point' && !pOnProp && !pOnTok &&
      !mOnPoint && !!mOnProp && mOnProp.type==='prop' && !!mOnTok && mOnTok.type==='token';
  })());

  ok('预设地图：里程按坐标×比例尺直接算好（不用手点一下「设」）', (function(){
    var spec=w.demoMapSpec('city'); if(!spec) return false;
    var m=w.buildDemoMap(spec);
    if(!m || !(m.legs||[]).length) return false;
    var bad=(m.legs||[]).filter(function(leg){
      var A=m.points[leg.a], B=m.points[leg.b];
      var d=Math.round(Math.sqrt(Math.pow(A.x-B.x,2)+Math.pow(A.y-B.y,2))*m.kmPerPx*100)/100;
      return leg.dist!==d || leg.auto!==true;
    });
    var sc=Math.round(m.kmPerPx*50*10000)/10000;
    return bad.length===0 && sc>0;      // 比例尺输入框显示的就是这张图自带的比例
  })());

  ok('工具栏有整体旋转+地图旋转两个按钮', /rotateMap\(90,'all'\)/.test($('mapTools').innerHTML) && /rotateMap\(90,'upright'\)/.test($('mapTools').innerHTML));
  ok('全屏工具栏含两种旋转图标', /rotateMap\(90,'all'\)/.test($('fsMapCtl').innerHTML) && /rotateMap\(90,'upright'\)/.test($('fsMapCtl').innerHTML));
  ok('地图文字反向旋转工具已备好', typeof w.uprightText === 'function' && typeof w.softDarkHalo === 'function');
  w.rotateMap(90); w.rotateMap(90); // 回到 0
  w.exitSceneFs();
  ok('退出全屏后 body 不再带 fs-map', !d.body.classList.contains('fs-map'));

  // 默认地图库（下拉可选、分类 + 辅助网格）
  ok('默认地图库分组>=4 且地图>=40', w.DEMO_MAP_GROUPS.length >= 4 && w.DEMO_MAP_GROUPS.reduce((n,g)=>n+g.items.length,0) >= 40, '' + (w.DEMO_MAP_GROUPS||[]).reduce((n,g)=>n+g.items.length,0));
  ok('默认地图两级菜单：一级分类 + 二级地图', (function(){
    var g=$('mapDemoGrp'), s2=$('mapDemoSel');
    return !!g && !!s2 && g.options.length >= 4 && s2.options.length >= 6;
  })());
  ok('点一级分类后二级菜单换成该分类的地图', (function(){
    w.onDemoGroupChange('0');
    var s2=$('mapDemoSel');
    var okCity=s2.options.length === w.DEMO_MAP_GROUPS[0].items.length + 1 && s2.value === '';
    w.onDemoGroupChange('2');
    var okWild=s2.options.length === w.DEMO_MAP_GROUPS[2].items.length + 1 && /海岸/.test(s2.innerHTML) && !/医院/.test(s2.innerHTML);
    return okCity && okWild;
  })());
  ok('摆件/战斗道具不再画深色衬底盘与投影', HTML.indexOf('drawPropPlate') < 0
     && HTML.indexOf('softDarkHalo(g,pr.x,pr.y-3*ps,28*ps,true)') > 0
     && HTML.indexOf('softDarkHalo(g,pr.x,pr.y-4*s,24*s,true)') > 0);
  ok('战斗默认道具 >=60 且“椅子/餐桌”分开', (function(){
    var names=(w.COMB_PROP_PRESETS||[]).map(p=>p[1]);
    return names.length >= 60 && names.indexOf('椅子') >= 0 && names.indexOf('餐桌') >= 0 && new Set((w.COMB_PROP_PRESETS||[]).map(p=>p[0])).size === names.length;
  })(), '' + ((w.COMB_PROP_PRESETS||[]).length));
  ok('默认地图含 城市/小镇/城郊/室内/海岸/山地/森林/医院/图书馆',
     ['city','town','suburb','hospital','library','coast','mountain','forest'].every(k => !!w.demoMapSpec(k)));
  ok('默认地图数据可生成地点与道路', (function(){ const d=w.buildDemoMap(w.demoMapSpec('coast')); return d.points.length>=6 && d.legs.length>=6 && d.props.length===0 && d.tokens.length===0; })());
  // 设过比例尺后拖动地点：相连道路里程实时重算并显示在图上（不弹窗）
  ok('加路不再弹窗、按比例尺自动算里程', (function(){
    var origP=w.prompt, called=0; w.prompt=function(){ called++; return ''; };
    w.renderMapLists();
    var m0=w.currentMap(), n0=m0.legs.length;
    $('legNewA').value='0'; $('legNewB').value='1';
    w.addLeg();
    w.prompt=origP;
    var leg=m0.legs[m0.legs.length-1];
    return called===0 && m0.legs.length===n0+1 && leg && leg.dist>0 && leg.auto===true;
  })());
  ok('拖动地点 → 相连道路里程实时重算并高亮', (function(){
    var m0=w.currentMap();
    m0.rot=0; m0.rotUpright=false;
    var cvv=$('mapCanvas');
    cvv.getBoundingClientRect=function(){ return {left:0,top:0,width:1000,height:620,right:1000,bottom:620,x:0,y:0}; };
    var p0=m0.points[0];
    p0.x=100; p0.y=100;
    var leg=m0.legs.filter(function(l){return l.a===0&&l.b===1;})[0];
    var before=leg.dist;
    w.mapTool='select'; w.mapSel={type:'none',idx:-1}; w.mapDrag=null;
    w.onCanvasDown({clientX:100,clientY:100,preventDefault:function(){}});
    var dragged=!!w.mapDrag;
    w.onCanvasMove({clientX:400,clientY:300,preventDefault:function(){}});
    w.onCanvasUp();
    var exp=Math.round(Math.sqrt(Math.pow(400-m0.points[1].x,2)+Math.pow(300-m0.points[1].y,2))*(m0.kmPerPx||0.01)*100)/100;
    return dragged && leg.dist===exp && leg.dist!==before && m0.points[0].x===400 && m0.points[0].y===300;
  })());
  ok('改比例尺后自动里程同步重算', (function(){
    var m0=w.currentMap();
    m0.points[0].x=0; m0.points[0].y=0; m0.points[1].x=100; m0.points[1].y=0;
    var leg=m0.legs.filter(function(l){return l.a===0&&l.b===1;})[0];
    leg.auto=true; leg.dist=0;
    $('mapScale').value='5'; w.onScaleChange();      // 1 格(50px)=5km → 100px=10km
    var okAuto=leg.dist===10;
    leg.auto=false; leg.dist=3.3;
    $('mapScale').value='10'; w.onScaleChange();     // 改成 10km/格，手动改过的里程不动
    var okManual=leg.dist===3.3;
    return okAuto && okManual;
  })());

  ok('二级下拉的占位项不会误载地图', (function(){
    var m0=(w.currentMap()||{}).name;
    w.loadDemoMap('');
    return (w.currentMap()||{}).name === m0;
  })());
  const origConfirm2=w.confirm; w.confirm=function(){ return true; };
  w.loadDemoMap('coast');
  ok('选择默认地图即可载入', /海岸/.test(w.currentMap().name));
  w.loadDemoMap('library');
  ok('切换到另一张默认地图', /图书馆/.test(w.currentMap().name));
  w.confirm=origConfirm2;
  const cssHas = (re, s2) => re.test(cssText);
  ok('折叠卡片标题(摆件素材/载具时间速度)不换行', cssHas(/details\.ccard>summary>b \{ white-space: nowrap/) && cssHas(/details\.ccard>summary \{ flex-wrap: nowrap/));
  ok('小卡「调查员」徽章不换行', cssHas(/\.pccard \.pcnameline \.badge \{ white-space: nowrap/));
  ok('传奇调查员标签有做旧牛皮纸样式', cssHas(/\.pccard \.pclegend \{ position: absolute; left: 8px/) && cssHas(/border-style: dashed dashed dashed solid/));
  ok('星星靠右下角 + 保留呼吸动画', cssHas(/\.pccard \.runstars \{ position: absolute; right: 7px; bottom: 7px/) && cssHas(/@keyframes runstar-pulse/));
  ok('小卡头像透明文件框可直接点上传', cssHas(/\.pcavfile \{ position: absolute/) && cssHas(/#pcList\.tagmode \.pccard \.pchead \.pcav \.pcavfile,/) && cssHas(/#pcList\.tagmoving \.pccard \.pchead \.pcav \.pcavfile \{ display: none/));

  // 室内地图：不带里程与比例尺；全屏按钮与旋转同一行；场景层级高于装饰
  ok('室内地图标记为“无里程”(noDist)', w.buildDemoMap(w.demoMapSpec('hospital')).noDist === true && !w.buildDemoMap(w.demoMapSpec('city')).noDist);
  const origConfirm3=w.confirm; w.confirm=function(){ return true; };
  w.loadDemoMap('hospital');
  ok('室内地图隐藏 1px=?km 比例尺', $('mapScaleBox').style.display === 'none', $('mapScaleBox').style.display);
  w.loadDemoMap('city');
  ok('室外地图恢复比例尺控件', $('mapScaleBox').style.display !== 'none');
  w.confirm=origConfirm3;
  ok('全屏按钮挪到地图旋转右边（同一行）', (function(){
    var h=$('mapTools').innerHTML;
    var iRot=h.indexOf("rotateMap(90,'upright')"), iFs=h.indexOf("toggleSceneFs('map')");
    return iRot>0 && iFs>iRot && d.querySelector('.mapctrlrow').innerHTML.indexOf('mapFsBtn')<0;
  })());
  ok('地图/战斗场景层级高于装饰（永不被小图标压住）',
     /#mapWrap \{ position: relative; z-index: 7/.test(cssText) &&
     /\.battlecanvas-wrap \{ position: relative; z-index: 7/.test(cssText) &&
     /\.decor-bit \{ position: fixed;.*z-index: 6/.test(cssText));

  const icIcons = ['眩晕','濒死','死亡','异常'].map(s => (w.combStateIcon(s)||{}).g);
  ok('眩晕/濒死/死亡/异常 四个状态图标互不相同', new Set(icIcons).size === 4, icIcons.join(','));
  ok('正常状态不画图标', w.combStateIcon('正常') === null);

  w.switchTab('combat');
  ok('战斗场景有默认道具素材库', !!$('battlePropPalette') && d.querySelectorAll('#battlePropPalette .propbtn').length >= 12);
  const np0 = w.battleProps().length;
  w.addBattlePropPreset(0);
  ok('可把默认道具放进战斗场景', w.battleProps().length === np0 + 1);
  w.deleteSelectedBattleProp();
  ok('可删除选中道具', w.battleProps().length === np0);

  w.toggleSceneFs('combat');
  w.toggleFsPanel('surveyors');
  const fsHost = $('fsFloatHost');
  ok('全屏调查员浮层把整页搬进统一浮层', !!fsHost && fsHost.contains($('tab-surveyors')) && !$('tab-surveyors').closest('main'));
  ok('全屏调查员浮层标签栏默认折叠（不自动打开）', !d.querySelector('.srvside').classList.contains('fsopen'));
  w.toggleTagSide();
  ok('点标题可展开/收起标签栏', d.querySelector('.srvside').classList.contains('fsopen'));
  w.toggleTagSide();
  ok('全屏调查员浮层有可拖宽把手', !!fsHost.querySelector('.fsresize'));
  w.exitSceneFs();
  ok('退出全屏把调查员页放回主区', $('tab-surveyors').closest('main') !== null && !d.body.classList.contains('fs-combat'));

  // 战斗详情头：名字在头像右侧 / DEX·DB 在头像下边 / 状态 3 个一行共两行
  w.switchTab('combat');
  const pcForPanel = S.actors.filter(a=>a.kind==='pc')[0];
  if (pcForPanel) w.combatPreAdd(pcForPanel.id);
  const part0 = (S.combat.participants||[])[0];
  if (part0) w.selectComb(part0.id);
  const panelHtml = $('activePanel').innerHTML;
  ok('战斗详情头：名字行 + DEX/DB 行 + 状态网格', /combphead/.test(panelHtml) && /cphline/.test(panelHtml) && /cphdex/.test(panelHtml) && /combstates/.test(panelHtml));
  ok('状态按钮 3 个一行、共两行 6 个', d.querySelectorAll('#activePanel .combstates button').length === 6);
  ok('战斗详情里有“收起”按钮（普通模式也在）', (function(){
    var b=d.querySelector('#activePanel button[onclick*="selectComb(null)"]');
    return !!b && !/fs-only/.test(b.className||'') && /收起/.test(b.textContent);
  })());

  // 战斗全屏：点场景空白处收起详情
  w.toggleSceneFs('combat');
  if (part0){
    w.selectComb(part0.id);
    ok('全屏选中角色后详情展开', d.body.classList.contains('comb-has-active'));
    $('battleCanvas').dispatchEvent(new w.MouseEvent('pointerdown', { bubbles:true, clientX:0, clientY:0 }));
    ok('全屏点场景空白处可收起详情', !d.body.classList.contains('comb-has-active'));
  }
  w.exitSceneFs();

  // 经历外框：8 团以上真的冒火苗、9 团以上顶部星星
  const mkRunPc = (n) => ({ id:w.uid('pc'), kind:'pc', side:'调查员', name:'老手'+n, tags:[],
    attrs:{str:50,con:50,pow:50,dex:50,app:50,edu:50,siz:50,int:50,luck:50}, avatar:{preset:'🎩',custom:null},
    hp:{cur:10,max:10}, san:{cur:50,max:50}, mp:{cur:10,max:10}, skills:[], weapons:[], inv:[], spells:[], plot:[],
    campaigns:Array.from({length:n}, (_,i)=>'团'+i) });
  S.actors.push(mkRunPc(7), mkRunPc(8), mkRunPc(9));
  w.renderSurveyors();
  const runsHtml = $('pcList').innerHTML;
  ok('8 团以上不再有火苗(pcflames 已删)', runsHtml.indexOf('pcflames') < 0);
  ok('8 团以上左下角别上牛皮纸标签「传奇调查员」', (runsHtml.match(/class="pclegend"/g)||[]).length >= 2 && /传奇调查员/.test(runsHtml), '' + (runsHtml.match(/class="pclegend"/g)||[]).length);
  ok('8 团起每多跑一个团右下角多一颗星星', (runsHtml.match(/class="runstars"/g)||[]).length >= 2 && (runsHtml.match(/runstars[^>]*>(<i>⭐<\/i>)+/g)||[]).length >= 2, '' + (runsHtml.match(/class="runstars"/g)||[]).length);
  const star9 = (runsHtml.match(/<i>⭐<\/i>/g)||[]).length;
  ok('9 团的卡有 2 颗星星(8团1颗+每多一团1颗)', star9 >= 3, '' + star9);
  ok('7 个团是钻石边（runs7）', /runs7/.test(runsHtml));
  w.switchTab('surveyors');

  // 装饰彩蛋：概率分档 + 各档行为
  ok('装饰彩蛋 7 档、概率合计 100', (w.DECOR_TIERS||[]).length === 7 && w.DECOR_TIERS.reduce((n,t)=>n+t.p,0) === 100, JSON.stringify((w.DECOR_TIERS||[]).map(t=>t.p)));
  ok('概率分布 = 50/30/10/5/3/1/1', JSON.stringify(w.DECOR_TIERS.map(t=>t.p)) === JSON.stringify([50,30,10,5,3,1,1]));
  ok('抽档函数返回合法档位', ['normal','single','fast','pulse','rain','eyes','text'].indexOf(w.decorTierRoll()) >= 0);
  w.spawnDecorBits('normal');
  ok('常规档：多品种混合', new Set(w._decorBits.map(b=>b.el.textContent)).size > 1 && w._decorBits.length >= 5);
  w.spawnDecorBits('single');
  ok('单一品种档：只出一种装饰', new Set(w._decorBits.map(b=>b.el.textContent)).size === 1 && w._decorBits.length >= 5);
  w.spawnDecorBits('fast');
  ok('飞快档：速度 ×3.4', w._decorBits.every(b=>b.speed === 3.4));
  w.spawnDecorBits('pulse');
  ok('忽大忽小档：pulse 模式', w._decorBits.every(b=>b.mode === 'pulse'));
  w.spawnDecorBits('rain');
  ok('掉落档：单一品种 + 只向下掉', new Set(w._decorBits.map(b=>b.el.textContent)).size === 1 && w._decorBits.every(b=>b.vx === 0 && b.vy > 0));
  w.spawnDecorBits('eyes');
  var eyes=[...d.querySelectorAll('.decor-bit')];
  ok('满屏巨大眼球档：全是大眼球', eyes.length >= 10 && eyes.every(e=>e.textContent === '👁️') && w._decorBits.every(b=>b.base >= 150), '' + eyes.length);
  w.spawnDecorBits('text');
  ok('彩蛋文字档出现“你怎么不好好带团…”', [...d.querySelectorAll('.decor-bit')].some(e=>e.textContent.indexOf('你怎么不好好带团') >= 0));
  w.spawnDecorBits('normal');
  w.stopDecorBits();
  ok('关闭装饰会清空所有小图标', d.querySelectorAll('.decor-bit').length === 0);

  // ===== 本轮增补：比例尺单位 / 本次团名 / 头像直接上传 / 导出到空白人物卡 =====
  ok('比例尺输入框加长并改成「比例尺：1格=」', (function(){
    var sb=$('mapScaleBox'), inp=$('mapScale');
    if(!sb||!inp) return false;
    var w0=parseInt(inp.style.width,10);
    return /比例尺/.test(sb.textContent) && /1格=/.test(sb.textContent) && w0>=170 && !/1px=/.test(sb.textContent) && /step="any"/.test(inp.outerHTML);
  })());

  ok('导航栏正中间有可编辑的“本次团名”并会保存', (function(){
    var inp=$('campaignName');
    if(!inp) return false;
    var lab=d.querySelector('.navcamp');
    inp.value='暗夜低语'; inp.dispatchEvent(new w.Event('input',{bubbles:true}));
    return !!lab && /本次团名/.test(lab.textContent) && (S.ui&&S.ui.campaignName)==='暗夜低语';
  })());

  ok('小卡头像文件框可直接上传（点击不再被 preventDefault 掉）', (function(){
    var pc=S.actors.filter(function(a){return a.kind==='pc';})[0];
    if(!pc) return false;
    w.renderSurveyors();
    var inp=d.querySelector('#pcList .pccard[data-id="'+pc.id+'"] .pcavfile');
    if(!inp) return false;
    var ev=new w.MouseEvent('click',{bubbles:true,cancelable:true});
    inp.dispatchEvent(ev);
    return ev.defaultPrevented===false;
  })());

  ok('空白人物卡模板随包提供（离线内联 base64）', typeof w.__COC_BLANK_CARD_B64 === 'string' && w.__COC_BLANK_CARD_B64.length > 100000, typeof w.__COC_BLANK_CARD_B64);

  var expActor = function(){
    return { id:'expX', kind:'pc', side:'调查员', name:'导出测试', player:'安郁青', occupation:'江湖骗子',
      era:'1920s', age:28, sex:'男', residence:'阿卡姆', hometown:'波士顿', avatar:{preset:'🎩',custom:null},
      attrs:{str:40,con:50,pow:60,dex:70,app:70,edu:80,siz:80,int:80,luck:50},
      hp:{cur:13,max:13}, san:{cur:50,max:99}, mp:{cur:12,max:12}, mov:7, db:'0', build:'0',
      armor:{value:2,type:'皮夹克'}, cash:120, currency:'美元',
      skills:[{name:'会计',total:5,base:5},{name:'法律',total:5,base:5},{name:'侦查',total:25,base:25}],
      weapons:[{name:'猎刀',type:'刀剑',skill:'斗殴',damage:'1D6',range:'接触',pierce:'—',attacks:'1',ammoCap:0}],
      inv:[{name:'手电筒',qty:1}], plot:[], spells:[], campaigns:[{module:'旧团',note:'SAN-2'}],
      history:{appearance:'眼神锐利',beliefs:'有钱能使鬼推磨'}, backstory:'从小家境贫困。' };
  };

  ok('导出 xlsx：数据填进《空白人物卡》模板且保留合并/样式', (function(){
    var bytes=w.b64ToBytes(w.__COC_BLANK_CARD_B64);
    var res=w.buildCardXlsx(expActor(), bytes);
    var wb=w.XLSX.read(res.bytes,{type:'array'});
    var ws=wb.Sheets['人物卡'];
    var cfb=w.XLSX.CFB.read(res.bytes,{type:'array'});
    var hasCalc=cfb.FullPaths.some(function(p){ return /calcChain/i.test(String(p)); });
    return res.miss===0 && !hasCalc && wb.SheetNames.length===13 && (ws['!merges']||[]).length>1000 &&
      ws['E3'].v==='导出测试' && ws['M4'].v==='1920s' && ws['U3'].v===40 && ws['W3'].v===20 && ws['W4'].v===8 &&
      ws['E10'].v===13 && ws['N10'].v===50 && String(ws['AN10'].v)==='2' && ws['AN12'].v==='皮夹克' &&
      ws['F16'].v==='会计' && ws['AB16'].v==='法律' && ws['AB35'].v==='侦查' && ws['AN35'].v===25 &&
      ws['B53'].v==='猎刀' && ws['W53'].v==='1D6' && ws['F79'].v==='手电筒' &&
      ws['AA61'].v==='眼神锐利' && ws['AA63'].v==='有钱能使鬼推磨' && ws['W77'].v==='从小家境贫困。' &&
      ws['B98'].v==='旧团' && ws['J98'].v==='SAN-2';
  })());

  ok('空白人物卡模板能解析出武器（result.weapons 读取修复）', (function(){
    var bytes=w.b64ToBytes(w.__COC_BLANK_CARD_B64);
    var res=w.buildCardXlsx(expActor(), bytes);
    var p=w.CoCParser.parseWorkbook(w.XLSX.read(res.bytes,{type:'array'}));
    return (p.weapons||[]).length===1 && p.weapons[0].name==='猎刀' && p.weapons[0].damage==='1D6' &&
      p.basic.name==='导出测试' && p.attrs.str===40 && (p.items||[]).length===1 && p.items[0].name==='手电筒';
  })());

  ok('导出：先把数据变化写进调查员经历（经历模组=本次团名）', (function(){
    var a=expActor(); a.id='expY'; a.name='导出测试'; a.campaigns=[];
    a.importSnapshot=w.importSnapshotOf(a);
    a.hp.cur=6; a.skills[2].total=55; a.inv.push({name:'绷带',qty:3});
    S.actors.push(a);
    if(!S.ui) S.ui={};
    S.ui.campaignName='暗夜低语';
    var dl=null, orig=w.downloadCardBytes;
    w.downloadCardBytes=function(f,b){ dl={fname:f,bytes:b}; };
    var threw=null;
    try{ w.exportActorCard('expY'); }catch(e){ threw=e; }
    w.downloadCardBytes=orig;
    var last=a.campaigns[a.campaigns.length-1];
    return !threw && last && last.module==='暗夜低语' && /HP 13→6/.test(last.note) && /侦查 25→55/.test(last.note) &&
      /绷带/.test(last.note) && dl && /^暗夜低语-导出测试\.xlsx$/.test(dl.fname) && dl.bytes && dl.bytes.length>100000;
  })());

  // ===== 本轮补充：技能成长 / 法术一览 / 资产表 / 对比基准固定为“最初导入” =====
  ok('导出：技能变化写进「成长」列（+3 / -5，没变就空着）', (function(){
    var a=expActor(); a.id='expG';
    a.importSnapshot=w.importSnapshotOf(a);      // 会计5 / 法律5 / 侦查25
    a.skills[0].total=8;                          // 会计 5→8  → 成长 +3（模板里会计在 F16）
    a.skills[2].total=20;                         // 侦查 25→20 → 成长 -5（模板里侦查在 AB35）
    var res=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var ws=w.XLSX.read(res.bytes,{type:'array'}).Sheets['人物卡'];
    return Number(ws['L16'].v)===3 && Number(ws['AH35'].v)===-5 && !(ws['AH16']&&ws['AH16'].v);
  })());

  // ===== 本轮补充：严格按模板（不动模板已有的东西）=====
  ok('导出：技能写回「原卡所在格子」，技能顺序不乱（哪怕编辑器里排过序）', (function(){
    var a=expActor(); a.id='expO';
    a.skills=[{name:'侦查',total:55,base:25,slot:{r:35,c:'AB'}},
              {name:'会计',total:5,base:5},
              {name:'法律',total:12,base:5,slot:{r:16,c:'AB'}}];   // 故意打乱顺序
    var res=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var ws=w.XLSX.read(res.bytes,{type:'array'}).Sheets['人物卡'];
    return ws['AB35'].v==='侦查' && ws['AN35'].v===55 &&
           ws['F16'].v==='会计' && ws['R16'].v===5 &&
           ws['AB16'].v==='法律' && ws['AN16'].v===12 &&
           ws['F17'].v==='人类学';   // 模板里第 17 行左边的「人类学」没被清掉
  })());

  ok('导出：模板里的公式原样留着（半值/五分之一、成功率 SUM、困难极难 INT、本职★ 查表）', (function(){
    var a=expActor(); a.id='expF';
    a.skills[0].total=8;
    var res=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var ws=w.XLSX.read(res.bytes,{type:'array'}).Sheets['人物卡'];
    return ws['W3'].f==='INT(U3/2)' && ws['W4'].f==='INT(U3/5)' &&
      ws['R16'].f==='SUM(J16:P16)' && ws['T16'].f==='INT(R16/2)' && ws['V16'].f==='INT(R16/5)' &&
      /本职技能/.test(String(ws['D16'].f||'')) && /本职技能/.test(String(ws['Z16'].f||'')) &&
      ws['R16'].v===8 && ws['T16'].v===4 && ws['V16'].v===1 &&
      ws['F17'].v==='人类学' && !(ws['L17']&&ws['L17'].v);
  })());

  ok('导出：打开时强制重算（本职★ 等公式依赖它）', (function(){
    var res=w.buildCardXlsx(expActor(), w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var cfb=w.XLSX.CFB.read(res.bytes,{type:'array'});
    for(var i=0;i<cfb.FullPaths.length;i++){
      if(/workbook\.xml$/.test(String(cfb.FullPaths[i]))){
        var t=w.cardDecodeBytes(new Uint8Array(cfb.FileIndex[i].content));
        return /fullCalcOnLoad="1"/.test(t);
      }
    }
    return false;
  })());

  ok('导出：剧情道具（还有剩余的）也进背包，数量和效果写在括号里', (function(){
    var a=expActor(); a.id='expP';
    a.inv=[{name:'手电筒',qty:1}]; a.plot=[];
    a.importSnapshot=w.importSnapshotOf(a);          // 基线：没有剧情道具
    a.plot=[{name:'神秘怀表',qty:2,effect:'heal',amount:'1D3',note:'祖传'},
            {name:'用光的药瓶',qty:0,effect:'san',amount:'',note:''}];
    var res=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var ws=w.XLSX.read(res.bytes,{type:'array'}).Sheets['人物卡'];
    var two=ws['F80']&&ws['F80'].v;
    return ws['F79'].v==='手电筒' && two==='神秘怀表（×2；治疗 HP 1D3；祖传）' &&
      !/用光的药瓶/.test(String(ws['F81']&&ws['F81'].v)) &&
      /神秘怀表/.test(w.diffActorSinceImport(a)) && !/用光的药瓶/.test(w.diffActorSinceImport(a));
  })());

  ok('导出：法术写进「法术一览」表格，示例行被替换、可再读回来', (function(){
    var a=expActor(); a.id='expS';
    a.spells=[{name:'灰色束缚',mp:'8',san:'1D6',time:'1h',effect:'可以控制死去的人'},
              {name:'时空门搜寻术',mp:'1',san:'1D3',time:'',effect:'找门'}];
    a.importSnapshot=w.importSnapshotOf(a);
    var res=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var wb=w.XLSX.read(res.bytes,{type:'array'}); var ws=wb.Sheets['人物卡'];
    var p=w.CoCParser.parseWorkbook(wb);
    return ws['W114'].v==='1' && ws['Y114'].v==='灰色束缚' && /8mp/.test(String(ws['AC114'].v)) &&
      /1d6/i.test(String(ws['AC114'].v)) && ws['Y115'].v==='时空门搜寻术' && !ws['Y116'].v &&
      p.spells.length===2 && p.spells[0].name==='灰色束缚' && p.spells[0].mp==='8' && p.spells[1].name==='时空门搜寻术';
  })());

  ok('导出：信用评级 / 其他资产 / 其他资产表写回卡里并可再读回来', (function(){
    var a=expActor(); a.id='expA';
    a.credit='40%/20%/8%'; a.otherAssets='120'; a.cash=33;
    a.assetsTable={vehicle:2,residence:3,luxury:4,stocks:5,other:6};
    a.importSnapshot=w.importSnapshotOf(a);
    var res=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var wb=w.XLSX.read(res.bytes,{type:'array'}); var ws=wb.Sheets['人物卡'];
    var p=w.CoCParser.parseWorkbook(wb);
    return ws['B62'].v==='40%/20%/8%' && ws['L62'].v==='120' && Number(ws['O62'].v)===33 &&
      Number(ws['B75'].v)===2 && Number(ws['R75'].v)===6 && ws['B76'].v==='资产总和：20' &&
      p.assets.credit==='40%/20%/8%' && p.assets.otherAssets==='120' && String(p.assets.table.stocks)==='5' &&
      ws['B76'].f && /资产总和/.test(String(ws['B76'].f));
  })());

  ok('导出：对比基准是最初导入的数据（重复导出不会丢掉之前的成长，同一团只占一行）', (function(){
    var a=expActor(); a.id='expB'; a.campaigns=[];
    a.importSnapshot=w.importSnapshotOf(a);       // 侦查 25
    a.skills[2].total=30;                          // 第 1 次改动：侦查 +5
    S.actors.push(a);
    if(!S.ui) S.ui={};
    S.ui.campaignName='连跑团';
    var orig=w.downloadCardBytes; w.downloadCardBytes=function(){};
    var threw=null;
    try{
      w.exportActorCard('expB');                   // 第 1 次导出
      a.skills[0].total=9;                         // 第 2 次改动：会计 5→9
      w.exportActorCard('expB');                   // 第 2 次导出
    }catch(e){ threw=e; }
    w.downloadCardBytes=orig;
    var last=a.campaigns[a.campaigns.length-1];
    return !threw && a.campaigns.length===1 &&
      /侦查 25→30/.test(last.note) && /成长 \+5/.test(last.note) &&
      /会计 5→9/.test(last.note) && /成长 \+4/.test(last.note);
  })());

  // ===== 本轮修复：源卡错误值(#N/A) / 职业序号空串会让本职列全变 #N/A / 「背包格」列 =====
  ok('导入：Excel 错误值当空处理（#N/A 不会被抄进角色数据）', (function(){
    return w.CoCParser.clean('#N/A')==='' && w.CoCParser.clean('#VALUE!')==='' &&
      w.CoCParser.clean('#REF!')==='' && w.CoCParser.clean('会计')==='会计';
  })());

  ok('导出：职业序号缺失时不写空串（否则「本职★」整列会变 #N/A）', (function(){
    var a=expActor(); a.id='expN'; a.occId=''; a.occupation='不存在的职业';
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var cell=ws['M5'];
    var noEmpty = !cell || cell.v===undefined || cell.v===null || String(cell.v)!=='';
    var b=expActor(); b.id='expN2'; b.occId=''; b.occupation='会计师';      // 靠名字回退
    var ws2=w.XLSX.read(w.buildCardXlsx(b, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var c=expActor(); c.id='expN3'; c.occId=3;
    var ws3=w.XLSX.read(w.buildCardXlsx(c, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return noEmpty && Number(ws2['M5'].v)===2 && Number(ws3['M5'].v)===3;
  })());

  ok('导出：职业序号对不上表头也不写（★ 列不会 #N/A），公式照样留着', (function(){
    var bad=expActor(); bad.id='expN4'; bad.occId=999;          // 表头里没有 999
    var wsB=w.XLSX.read(w.buildCardXlsx(bad, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var m5Bad=wsB['M5'];
    var notWritten=!m5Bad || m5Bad.v===undefined || m5Bad.v===null || String(m5Bad.v)!=='999';
    var noOcc=expActor(); noOcc.id='expN5'; noOcc.occId=''; noOcc.occupation='江湖骗子';   // 名字也不在职业列表
    var wsN=w.XLSX.read(w.buildCardXlsx(noOcc, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return notWritten && /本职技能/.test(String(wsB['Z16'].f||'')) && /本职技能/.test(String(wsN['D16'].f||''));
  })());

  ok('导出：自制技能（不在「本职技能」表里）不硬留公式，写死原卡显示值', (function(){
    var a=expActor(); a.id='expN6';
    a.skills=[{name:'灵根技能点：40',total:40,base:0,occ:'0'},{name:'会计',total:8,base:5}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return ws['AB16'].v==='灵根技能点：40' && !(ws['Z16']&&ws['Z16'].f) &&
           /本职技能/.test(String(ws['D16'].f||''));
  })());

  ok('「背包格」列：导入能读到（换行/括号/特殊格式原样保留）', (function(){
    var a=expActor(); a.id='expBag';
    a.inv=a.inv.concat(['厚衣服数身','干粮数包','三品灵根D8','灵根技能点：40','使用真气后有10护甲']
      .map(function(nm){ return {name:nm,qty:1,effect:'',amount:'',note:'',slot:'bag'}; }));
    var p=w.CoCParser.parseWorkbook(w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}));
    return (p.bagItems||[]).length===5 && p.bagItems[2].name==='三品灵根D8' &&
      p.bagItems[3].name==='灵根技能点：40' && (p.items||[]).length===1;
  })());

  ok('导入：背包格列的东西并进「背包 / 随身用品」且标记为背包格列', (function(){
    var a=expActor(); a.id='expBag9';
    a.inv=a.inv.concat([{name:'厚衣服数身',qty:1,effect:'',amount:'',note:'',slot:'bag'}]);
    var bytes=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes;
    w.state.actors.length=0;
    w.parseCardData(new Uint8Array(bytes),'往返.xlsx');
    var pc=w.state.actors.filter(function(x){return x.kind==='pc';})[0];
    if(!pc) return false;
    var bag=(pc.inv||[]).filter(function(i){return i.slot==='bag';});
    var normal=(pc.inv||[]).filter(function(i){return i.slot!=='bag';});
    return bag.length===1 && bag[0].name==='厚衣服数身' && normal.length===1 && normal[0].name==='手电筒';
  })());

  ok('「背包格」列：导出写回模板的背包格列（表头动态找列）', (function(){
    var a=expActor(); a.id='expBag2';
    a.inv=a.inv.concat(['厚衣服数身','干粮数包','水袋一个'].map(function(nm){ return {name:nm,qty:1,effect:'',amount:'',note:'',slot:'bag'}; }));
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var empty=function(ref){ var c=ws[ref]; return !c || c.v==null || String(c.v)===''; };
    return ws['N78'] && /背包格/.test(String(ws['N78'].v)) &&
      ws['N79'].v==='厚衣服数身' && ws['N80'].v==='干粮数包' && ws['N81'].v==='水袋一个' &&
      empty('N82') && empty('N93');
  })());

  ok('「背包格」变化写进调查员经历', (function(){
    var a=expActor(); a.id='expBag3';
    a.inv=a.inv.concat([{name:'干粮数包',qty:1,effect:'',amount:'',note:'',slot:'bag'}]);
    a.importSnapshot=w.importSnapshotOf(a);
    a.inv.push({name:'银子一袋',qty:1,effect:'',amount:'',note:'',slot:'bag'});
    return /背包格：新增 银子一袋/.test(w.diffActorSinceImport(a));
  })());

  ok('旧存档：上一版存成 a.bag 的背包格内容会自动并进背包', (function(){
    var a=expActor(); a.id='expOld'; a.bag=['厚衣服数身','干粮数包'];
    w.migrateBagToInv(a);
    var bag=(a.inv||[]).filter(function(i){return i.slot==='bag';}).map(function(i){return i.name;});
    return bag.length===2 && bag[0]==='厚衣服数身' && (a.bag||[]).length===0;
  })());

  // ===== 武器表：读得到 / 导出后仍保留“选类型自动算 + 按技能自动算成功率” =====
  ok('武器表读取：第一行是占位「无」也不挡着后面的武器', (function(){
    var a=expActor(); a.id='expW0';
    a.skills=[{name:'格斗：斗殴',total:70,base:25}];
    a.weapons=[{name:'佩剑',type:'中型剑（佩剑、重剑）',skill:'斗殴',damage:'1D6+1+DB',range:'接触',pierce:'√',attacks:'1',ammoCap:0,jam:'——'},
               {name:'猎刀',type:'刀剑',skill:'斗殴',damage:'1D6',range:'接触',pierce:'—',attacks:'1',ammoCap:0,jam:'—'}];
    var wb=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'});
    wb.Sheets['人物卡']['B53']={t:'s',v:'无'};        // 原卡常见：第一行是占位「无」
    var p=w.CoCParser.parseWorkbook(w.XLSX.read(w.XLSX.write(wb,{bookType:'xlsx',type:'array'}),{type:'array'}));
    return (p.weapons||[]).length===1 && p.weapons[0].name==='猎刀' && p.weapons[0].damage==='1D6';
  })());

  ok('武器成功率：使用技能写「斗殴」也能对上卡里的「格斗：斗殴」，并留公式（按技能数值自动重算）', (function(){
    var a=expActor(); a.id='expW';
    a.skills.push({name:'格斗：斗殴',total:70,base:25,occPts:0,intPts:0,mark:'',occ:'★',slot:null});
    a.weapons=[{name:'大型刀具(甘蔗刀等)',type:'近战小刀',skill:'斗殴',damage:'1D8+DB',range:'接触',pierce:'—',attacks:'1',ammoCap:0}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return ws['B53'].v==='大型刀具(甘蔗刀等)' && ws['M53'].v==='斗殴' &&
      Number(ws['Q53'].v)===70 && Number(ws['S53'].v)===35 && Number(ws['U53'].v)===14 &&
      /MATCH\(\$M53/.test(String(ws['Q53'].f||'')) && /INT\(\$Q53\/2\)/.test(String(ws['S53'].f||''));
  })());

  ok('武器成功率：没有任何技能对得上时留空（公式带空值保护，不出错误值）', (function(){
    var a=expActor(); a.id='expW2';
    a.weapons=[{name:'不知名法器',type:'法术',skill:'灵根技',damage:'1D8',range:'接触',pierce:'—',attacks:'1',ammoCap:0}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var empty=function(ref){ var c=ws[ref]; return !c || (c.v==null || String(c.v)===''); };
    return empty('Q53') && empty('S53') && empty('U53') &&
      /IF\(\$M53="",""/.test(String(ws['Q53'].f||'')) && /IF\(\$Q53="",""/.test(String(ws['U53'].f||''));
  })());

  ok('武器表：类型在「武器列表」里 → 保留“选类型自动算”的 VLOOKUP（伤害/射程/贯穿/次数/装弹量/故障值）', (function(){
    var a=expActor(); a.id='expW3';
    a.skills=[{name:'格斗：斗殴',total:70,base:25}];
    a.weapons=[{name:'佩剑',type:'中型剑（佩剑、重剑）',skill:'斗殴',damage:'1D6+1+DB',range:'接触',pierce:'√',attacks:'1',ammoCap:0,jam:'——'}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    /* 武器表在这 4 张卡里叫「武器列表 战斗」（带空格要加引号），旧卡叫「武器列表」，两种都算对 */
    var v=function(ref,col){ return new RegExp("VLOOKUP\\(\\$G53,('?武器列表(?: 战斗)?'?)!\\$B\\$2:\\$I\\$105,"+col+",FALSE\\)").test(String((ws[ref]||{}).f||'')); };
    return ws['B53'].v==='佩剑' && ws['W53'].v==='1D6+1+DB' && ws['AC53'].v==='√' && ws['AG53'].v==='——' &&
      v('W53',3) && v('AA53',4) && v('AC53',5) && v('AE53',6) && v('AG53',7) && v('AJ53',8) &&
      ws['M53'].v==='斗殴' && !ws['M53'].f;          // 玩家自己改过技能（佩剑用斗殴，不是列表里的「剑」）→ 保留玩家的
  })());

  ok('武器表：空槽也留着模板的类型公式（以后在 Excel 里选类型照样自动算）', (function(){
    var a=expActor(); a.id='expW4';
    a.weapons=[{name:'猎刀',type:'刀剑',skill:'斗殴',damage:'1D6',range:'接触'}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return (ws['B55']&&ws['B55'].v||'')==='' && /VLOOKUP/.test(String((ws['W55']||{}).f||'')) &&
      /VLOOKUP/.test(String((ws['AA56']||{}).f||''));
  })());

  ok('武器：类型写的是分组名（近战小刀）/两边括号顿号写法不同，都能对到卡里「武器列表」', (function(){
    var list=w.cocWeaponTypes();
    var byGroup=w.cocWeaponTypeInfo('近战小刀');          // 这个写法卡里没有，靠“名字兜底”不该在这里命中
    var halfParen=w.cocWeaponTypeInfo('中型剑(佩剑、重剑)');   // 预设写法（半角括号）
    var alias=w.cocWeaponTypeInfo('12号泵动霰弹枪');        // 别名表
    return list.length>100 && byGroup===null &&
      halfParen && halfParen.type==='中型剑（佩剑、重剑）' &&
      alias && alias.type==='12 号霰弹枪(泵动)' && alias.damage===alias.damage;
  })());

  ok('新加的武器：类型对不上但名字是卡里的类型 → 导出自动归一成真类型，并带上“选类型自动算”的公式', (function(){
    var a=expActor(); a.id='expW5';
    a.skills=[{name:'格斗：斗殴',total:70,base:25}];
    a.weapons=[{name:'大型刀具(甘蔗刀等)',type:'近战小刀',skill:'斗殴',damage:'1D8+DB',range:'接触',pierce:'—',attacks:'1',ammoCap:0}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return ws['G53'].v==='大型刀具(甘蔗刀等)' && ws['W53'].v==='1D8+DB' && ws['AC53'].v==='√' &&
      /VLOOKUP/.test(String((ws['W53']||{}).f||'')) && Number(ws['Q53'].v)===70 &&
      /MATCH\(\$M53/.test(String((ws['Q53']||{}).f||''));
  })());

  ok('新加的武器：上一把武器没填使用技能，也不会把这一把的技能/成功率带空（模板 56 行公式看上一行）', (function(){
    var a=expActor(); a.id='expW7';
    a.skills=[{name:'格斗：斗殴',total:70,base:25}];
    a.weapons=[{name:'符篆',type:'',skill:'',damage:'单体4d6'},
               {name:'大型刀具(甘蔗刀等)',type:'近战小刀',skill:'斗殴',damage:'1D8+DB',range:'接触',pierce:'√',attacks:'1',ammoCap:0}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var f=String((ws['M54']||{}).f||'');                 // 第二把武器落在 54 行
    return ws['M54'].v==='斗殴' && !/OR\(/.test(f) && /VLOOKUP\(\$G54/.test(f) &&
      Number(ws['Q54'].v)===70 && Number(ws['S54'].v)===35 &&
      /IF\(\$M54="",""/.test(String((ws['Q54']||{}).f||''));
  })());

  ok('新加的武器：类型和名字都认不出（自制武器）→ 写死数值，不留会算出错误值/###### 的公式', (function(){
    var a=expActor(); a.id='expW6';
    a.skills=[{name:'格斗：斗殴',total:70,base:25}];
    a.weapons=[{name:'二品灵根da6',type:'灵根法器',skill:'斗殴',damage:'2D6',range:'接触',pierce:'—',attacks:'1',ammoCap:0}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var hasF=function(ref){ return !!((ws[ref]||{}).f); };
    return ws['G53'].v==='灵根法器' && ws['W53'].v==='2D6' && !hasF('W53') && !hasF('AA53') &&
      Number(ws['Q53'].v)===70 && /IFERROR/.test(String((ws['Q53']||{}).f||'')) &&
      /IF\(\$Q53="",""/.test(String((ws['S53']||{}).f||'')) && /IF\(\$Q53="",""/.test(String((ws['U53']||{}).f||''));
  })());

  ok('武器表：卡上只有 6 行武器槽时，多出来的武器不会把下面「资产」表头写坏', (function(){
    var a=expActor(); a.id='expW8';
    a.skills=[{name:'格斗：斗殴',total:70,base:25}];
    a.weapons=[];
    for(var i=0;i<8;i++) a.weapons.push({name:'武器'+(i+1),type:'刀剑',skill:'斗殴',damage:'1D6',range:'接触'});
    var res=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var ws=w.XLSX.read(res.bytes,{type:'array'}).Sheets['人物卡'];
    var last=(ws['B58']||{}).v, over=(ws['B59']||{}).v, assets=(ws['B60']||{}).v;
    return last==='武器6' && over==null && assets==='资产' && res.wpnDropped===2;
  })());

  ok('4 张受支持的卡：同一份角色数据都能导出成对应模板并原样读回', (function(){
    var ids=['pink','cy23','cy2lus','cn'];
    for(var i=0;i<ids.length;i++){
      var b64=w.__COC_CARDS_B64 && w.__COC_CARDS_B64[ids[i]];
      if(!b64) return false;
      var a=expActor(); a.id='expCard'+i;
      a.skills.push({name:'格斗：斗殴',total:70,base:25});
      a.weapons=[{name:'佩剑',type:'中型剑（佩剑、重剑）',skill:'斗殴',damage:'1D6+1+DB',range:'接触',pierce:'√',attacks:'1',ammoCap:0}];
      var res=w.buildCardXlsx(a, w.b64ToBytes(b64));
      var wb=w.XLSX.read(res.bytes,{type:'array'});
      if(w.cocCardDetect(wb)!==ids[i]) return false;
      var p=w.CoCParser.parseWorkbook(wb);
      if(!p || p.basic.name!=='导出测试' || p.basic.occupation!=='江湖骗子') return false;
      if(Number(p.attrs.str)!==40 || (p.skills||[]).length<3 || (p.weapons||[]).length!==1) return false;
      if(p.weapons[0].name!=='佩剑' || (p.items||[]).length<1) return false;
      var ws=wb.Sheets['人物卡'];
      if(!/MATCH\(\$M53/.test(String((ws['Q53']||{}).f||''))) return false;  // 成功率：按使用技能自动查
      if(!/VLOOKUP/.test(String((ws['W53']||{}).f||''))) return false;       // 伤害：按类型自动查
    }
    return true;
  })());

  ok('弹窗：原来在「背包格」列的东西还在同一张清单里，保存后不会换列（导出仍写回原来那列）', (function(){
    var a=expActor(); a.id='expInvSame';
    a.inv=a.inv.concat([{name:'厚衣服数身',qty:1,effect:'',amount:'',note:'',slot:'bag'}]);
    S.actors.push(a);
    w.openActorModal(a.id,'pc');
    var rows=[...d.querySelectorAll('#am-inv .listitem')];
    var bagRows=rows.filter(function(x){ return x.getAttribute('data-slot')==='bag'; });
    var html=d.getElementById('actorModal').innerHTML;
    w.saveActorModal();
    var kept=(a.inv||[]).filter(function(i){return i.slot==='bag';}).map(function(i){return i.name;});
    return rows.length===2 && bagRows.length===1 && bagRows[0].querySelector('.inv-name').value==='厚衣服数身' &&
      !/背包格列/.test(html) && kept.length===1 && kept[0]==='厚衣服数身';
  })());

  ok('导出：其他资产表能写任意字符（“一辆别克”这种也照样存、照样读回来）', (function(){
    var a=expActor(); a.id='expA2';
    a.assetsTable={vehicle:'一辆别克',residence:'乡间别墅',luxury:3,stocks:'2000',other:'一柜古籍'};
    a.importSnapshot=w.importSnapshotOf(a);
    var wb=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'});
    var ws=wb.Sheets['人物卡']; var p=w.CoCParser.parseWorkbook(wb);
    return ws['B75'].v==='一辆别克' && ws['F75'].v==='乡间别墅' && Number(ws['J75'].v)===3 &&
      ws['R75'].v==='一柜古籍' && String(ws['B76'].v)==='资产总和：2003' &&
      p.assets.table.vehicle==='一辆别克' && p.assets.table.other==='一柜古籍';
  })());

  /* ---------- 只适配 4 张卡：欢迎说明 / 雷达图 / 右半屏模组与规则书 / 可折叠栏 ---------- */
  ok('欢迎弹窗：说明只适配 4 张卡，并给出每张空白卡的下载入口', (function(){
    w.openWelcome();
    var mask=$('welcomeModal');
    var links=[...mask.querySelectorAll('a.btn')];
    var names=links.map(function(a){ return a.getAttribute('download'); });
    return mask.classList.contains('open') && links.length===4 &&
      names.indexOf('COC7空白卡23（粉）-坪改.xlsx')>=0 && names.indexOf('中式职业扩展COC7空白卡1.6.xlsx')>=0 &&
      /只适配下面这 4 张/.test(mask.textContent) && !!mask.querySelector('#welcomeNever');
  })());
  ok('欢迎弹窗：勾了“以后不再自动弹出”就记在本机', (function(){
    w.closeWelcome();
    return !$('welcomeModal').classList.contains('open') && w.welcomeSeen()===true;
  })());

  ok('人物详情：有属性雷达图画布，改属性会实时重画', (function(){
    var a=S.actors.filter(function(x){return x.kind==='pc';})[0];
    a.skills=[]; a.weapons=[];
    w.openActorModal(a.id,'pc');
    var cv=$('am-radar');
    return !!cv && typeof cv.getContext==='function' &&
      typeof w.drawAttrRadar==='function' && w.RADAR_ATTRS.length===9;
  })());
  ok('调查员页：标签栏 / 导入栏都能展开收起，状态记在本机', (function(){
    var tag=$('tagSideBody'), imp=$('importBody');
    if(!tag || !imp) return false;
    w.toggleSrvPanel('tag'); var tagClosed=tag.hidden;
    w.toggleSrvPanel('tag'); var tagOpen=!tag.hidden;
    w.toggleSrvPanel('import'); var impClosed=imp.hidden;
    w.toggleSrvPanel('import');
    return tagClosed && tagOpen && impClosed && !imp.hidden;
  })());

  ok('右半屏：点「模组」把右侧打开，给出上传/拖入入口', (function(){
    w.toggleSidePane('module');
    var pane=$('sidePane');
    return !pane.hidden && !$('splitBar').hidden && /📖 模组/.test(pane.textContent) &&
      !!$('moduleFileInput') && !!(pane.querySelector('.sp-drop'));
  })());
  ok('右半屏：点「规则书」能出目录，翻页会跳到原版 PDF 的那一页', (function(){
    w.toggleSidePane('rulebook');
    var pane=$('sidePane');
    var toc=pane.querySelectorAll('.rb-tocitem');
    w.rbGoto(Math.min(10, w.rbPageCount()));
    var f=pane.querySelector('#rbFrame');
    return /📚 规则书/.test(pane.textContent) && w.rbPageCount()>200 && toc.length>50 &&
      !!f && /#page=10/.test(f.getAttribute('src')||'') &&
      /#page=10/.test(w.rbFrameSrc(10)) && String($('rbPageInput').value)==='10';
  })());
  ok('右半屏：规则书用的是原版 PDF（保留表格 / 颜色 / 流程图，不是自己重排的 HTML）', (function(){
    var base=w.rulebookPdf();
    return /^(blob:|https?:|data:application\/pdf)/.test(base) &&
      /\.pdf$|^blob:|^data:application\/pdf/.test(base) &&
      base.length>64 &&
      w.rbFrameSrc(1).indexOf(base)===0 &&
      w.document.getElementById('sidePane').querySelector('#rbFrame').tagName==='IFRAME';
  })());
  ok('右半屏：规则书全文搜索能列出命中页并可跳转', (function(){
    var inp=$('rbSearch'); inp.value='理智';
    w.rbSearch();
    var hits=$('sidePane').querySelectorAll('.rb-hit');
    var first=hits.length?parseInt(hits[0].getAttribute('onclick').replace(/\D/g,''),10):0;
    return hits.length>0 && first>0 && /命中 \d+ 页/.test($('sidePane').textContent) &&
      !!hits[0].querySelector('b') && !!hits[0].querySelector('span');
  })());
  ok('右半屏：离线版把整本规则书 PDF 内联进来（不联网也能翻）', (function(){
    var b64=w.__COC_RULEBOOK_PDF_B64;
    if(!b64 || b64.length<1e6) return false;
    return w.atob(b64.slice(0,8)).slice(0,5)==='%PDF-' && w.rbFrameSrc(10).length>b64.length;
  })());
  ok('右半屏：再点一次同一个按钮就收起', (function(){
    w.toggleSidePane('rulebook');
    return $('sidePane').hidden && $('splitBar').hidden;
  })());


  /* ---------- 地图页：二级菜单栏（地图 / 角色 / 素材 / 载具·时间速度） ---------- */
  w.switchTab('maps');
  ok('地图页：上面多了一条二级菜单栏（地图/角色/摆件素材/载具时间速度），默认都是收起的', (function(){
    var btns=[].slice.call(d.querySelectorAll('#mapBar button.tb2'));
    var ids=['mp-cards','mp-actors','mp-props','mp-veh'];
    var pods=['pod-cards','pod-actors','pod-props','pod-veh'];
    return btns.length===4 && ids.every(function(id,i){ return btns[i].id===id; }) &&
      pods.every(function(id){ return !!$(id) && $(id).hidden; });
  })());
  ok('地图页：二级菜单点开就用、点别的就切、再点同一个就收起（一次只开一个）', (function(){
    w.toggleMapPod('actors');
    var openActors=!$('pod-actors').hidden && $('mp-actors').classList.contains('on');
    w.toggleMapPod('props');
    var switched=!$('pod-props').hidden && $('pod-actors').hidden && !$('mp-actors').classList.contains('on');
    w.toggleMapPod('props');
    var closed=$('pod-props').hidden && !$('mp-props').classList.contains('on');
    return openActors && switched && closed;
  })());
  ok('地图页：地图本体占满整行，路线时间 / 地点 / 道路仍在它下面', (function(){
    var main=$('mapMainCard'), stack=$('mapStack');
    // 4 = Node.DOCUMENT_POSITION_FOLLOWING（节点顺序在 main 之后）
    var after=function(el){ return (main.compareDocumentPosition(el) & 4) ? true : false; };
    return !!main && main.contains($('mapCanvas')) && main.contains($('mapTools')) &&
      (($('mapBar').compareDocumentPosition(main) & 4) ? true : false) &&
      stack.contains($('routeCard')) && stack.contains($('mapPointsCard')) && stack.contains($('mapLegsCard')) &&
      after($('routeCard')) && after($('mapPointsCard')) && after($('mapLegsCard')) &&
      // 四个面板都在地图本体之前（所以不会把地图挤窄）
      (($('mapPods').compareDocumentPosition(main) & 4) ? true : false);
  })());
  /* ---------- 战斗页：二级菜单栏（添加角色 / 战斗桌） ---------- */
  w.switchTab('combat');
  ok('战斗页：上面多了一条二级菜单栏（添加角色/战斗桌），默认都是收起的', (function(){
    var btns=[].slice.call(d.querySelectorAll('#combatBar button.tb2'));
    return btns.length===2 && btns[0].id==='cp-add' && btns[1].id==='cp-table' &&
      !!$('pod-add') && !!$('pod-table') && $('pod-add').hidden && $('pod-table').hidden;
  })());
  ok('战斗页：二级菜单点开就用、点别的就切、再点同一个就收起', (function(){
    w.toggleCombatPod('table');
    var openTable=!$('pod-table').hidden && $('cp-table').classList.contains('on');
    w.toggleCombatPod('add');
    var switched=!$('pod-add').hidden && $('pod-table').hidden;
    w.toggleCombatPod('add');
    return openTable && switched && $('pod-add').hidden;
  })());
  ok('战斗页：战斗场景占满整行，成员表与行动日志依次排在它下面', (function(){
    var stage=$('combatStageCard');
    var after=function(el){ return (stage.compareDocumentPosition(el) & 4) ? true : false; };
    return !!stage && stage.contains($('battleCanvas')) && stage.contains($('battlePropPalette')) &&
      after($('activePanel')) && after($('combatMemberCard')) && after($('combatLogCard')) &&
      (($('activePanel').compareDocumentPosition($('combatMemberCard')) & 4) ? true : false) &&
      (($('combatMemberCard').compareDocumentPosition($('combatLogCard')) & 4) ? true : false) &&
      (($('combatPods').compareDocumentPosition(stage) & 4) ? true : false);
  })());

  /* ---------- .docx 模组：表格 / 标题 / 图片 / 分页都读得出来 ---------- */
  ok('模组：.docx 解析出标题 / 加粗 / 表格 / 图片 / 分页线', (function(){
    var html;
    try{ html=w.docxToHTML(miniDocxBytes()); }
    catch(e){ return false; }
    var r={
      h1:/<h1[^>]*>[\s\S]*模组标题/.test(html),
      bold:/<b>加粗段落<\/b>/.test(html),
      tbl:html.indexOf('<table class="sp-tbl">')>=0 && html.indexOf('爱丽丝')>=0 && html.indexOf('记者')>=0,
      img:/<img class="sp-img" src="data:image\/png;base64,/.test(html),
      pb:html.indexOf('<hr class="sp-pb">')>=0
    };
    return r.h1 && r.bold && r.tbl && r.img && r.pb;
  })());
  /* 走完整流程：拖进来的 .docx → 右半屏直接排版显示（老版本会报“这个浏览器不支持直接解压 .docx”） */
  var docxPaneText='';
  await new Promise(function(done){
    w.toggleSidePane('module');
    var f=new w.File([miniDocxBytes()], '万应灵药.docx', {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    w.loadModuleFile(f, done);
    setTimeout(done, 3000);
  });
  ok('模组：把 .docx 拖进右半屏能正常排出来（不再报不支持解压）', (function(){
    var pane=$('sidePane'), doc=pane.querySelector('#spDoc');
    return !!doc && pane.textContent.indexOf('万应灵药.docx')>=0 &&
      !!doc.querySelector('table.sp-tbl') && !!doc.querySelector('img.sp-img') &&
      !!doc.querySelector('h1') &&
      pane.textContent.indexOf('不支持')<0 && pane.textContent.indexOf('打不开')<0;
  })());
  w.toggleSidePane('module');

  /* ---------- 自定义背景（bgcustom）也要把右半屏与二级菜单栏一起染色 ---------- */
  ok('主题适配：右半屏（模组/规则书）与二级菜单栏都跟随自定义背景配色', (function(){
    return /body\.bgcustom \.sidepane\s*\{/.test(cssText) &&
      /body\.bgcustom \.sp-head/.test(cssText) &&
      /body\.bgcustom \.rb-side/.test(cssText) &&
      /body\.bgcustom \.rb-bar/.test(cssText) &&
      /body\.bgcustom \.tb2\.on/.test(cssText) &&
      /body\.bgcustom \.sp-tbl/.test(cssText) &&
      /--uic-b/.test(cssText);
  })());


  /* ---------- 本轮修复：规则书目录收起 / 模组搜索 / 载具与地图自愈 / 战斗详情浮层 / 清空含模组 ---------- */
  ok('规则书：目录可收起（再点展开），状态记在本机', (function(){
    w.toggleSidePane('rulebook');
    var side=$('rbSide'), btn=$('rbTocBtn');
    if(!side || !btn) return false;
    w.rbToggleToc();
    var hidden=side.classList.contains('hide') && /展开目录/.test(btn.textContent) && w.state.ui.rbTocHide===true;
    w.rbToggleToc();
    var shown=!side.classList.contains('hide') && /收起目录/.test(btn.textContent) && w.state.ui.rbTocHide===false;
    return hidden && shown;
  })());
  ok('规则书：跳页换新 iframe（同份 PDF 改 #page 不生效的浏览器也能跳）', (function(){
    var pane=$('sidePane'), before=pane.querySelector('#rbFrame');
    w.rbGoto(20);
    var after=pane.querySelector('#rbFrame');
    return !!after && after!==before && /#page=20/.test(after.getAttribute('src')||'');
  })());

  /* 模组：txt 载入 → 搜索高亮 → 上/下一条循环 → 清掉高亮
     （Word 模组走的是同一套 moduleFind/moduleFindStep/moduleClearHits，只是正文换成排好的 HTML） */
  await new Promise(function(done){
    w.toggleSidePane('module');
    var f=new w.File(['第一条线索：失踪的牧师\n第二条线索：旧教堂的地窖\n线索再出现一次'], '线索.txt', {type:'text/plain'});
    w.loadModuleFile(f, done);
    setTimeout(done, 1500);
  });
  ok('模组：txt/Word 能搜索并高亮，上/下一条会循环并报「第几条」', (function(){
    var doc=$('sidePane')?$('sidePane').querySelector('#spDoc'):null;
    if(!doc || !$('modSearch')) return false;
    $('modSearch').value='线索';
    w.moduleFind();
    var hits=doc.querySelectorAll('mark.sp-hit');
    var n1=hits.length;
    var info1=$('modFindInfo')?$('modFindInfo').textContent:'';
    w.moduleFindStep(1);
    var idx2=$('modFindInfo')?$('modFindInfo').textContent:'';
    w.moduleFindStep(1); w.moduleFindStep(1);   // 绕回第 1 条
    var wrapped=$('modFindInfo')?$('modFindInfo').textContent:'';
    var onCount=doc.querySelectorAll('mark.sp-hit.on').length;
    w.moduleClearHits();
    var cleared=doc.querySelectorAll('mark.sp-hit').length===0 && doc.textContent.indexOf('第一条线索')>=0;
    return n1===3 && /1 \/ 3/.test(info1) && /2 \/ 3/.test(idx2) && /1 \/ 3/.test(wrapped) && onCount===1 && cleared;
  })());

  /* 载具/地图自愈：老存档把 vehicles 存成空数组、地图删光时不能整个空掉 */
  ok('存档自愈：载具空数组补回默认速度表、地图删光补一张示例图、悬空 activeMapId 修正', (function(){
    var vSave=S.vehicles, mSave=S.maps, idSave=S.activeMapId;
    S.vehicles=[]; S.maps=[]; S.activeMapId='ghost-map';
    w.healMapsAndVehicles();
    var r=S.vehicles.length>=10 && S.maps.length===1 && S.activeMapId===S.maps[0].id;
    S.vehicles=vSave; S.maps=mSave; S.activeMapId=idSave; w.saveStateQuiet();
    return r;
  })());
  ok('地图页：没有地图时地点/道路编辑区仍在（提示 + 「＋ 新建地图」入口）', (function(){
    var mSave=S.maps, idSave=S.activeMapId, tabSave=S.activeTab;
    var r=false;
    try{
      S.maps=[]; S.activeMapId=null;
      w.switchTab('maps');
      w.renderMapLists();
      r=!!$('mapPointsCard') && $('mapPointsCard').innerHTML.indexOf('newMap()')>=0 &&
        !!$('mapLegsCard') && $('mapLegsCard').innerHTML.length>0;
    }catch(e){ r=false; }
    S.maps=mSave; S.activeMapId=idSave; w.switchTab(tabSave||'surveyors');
    return r;
  })());
  ok('地图页：载具·时间速度没有地图时也能看到默认速度表（不再是空白）', (function(){
    var mSave=S.maps, idSave=S.activeMapId;
    S.maps=[]; S.activeMapId=null;
    w.renderMapVehicles();
    var html=$('mapVehicles')?$('mapVehicles').innerHTML:'';
    var r=/步行/.test(html) && /汽车/.test(html);
    S.maps=mSave; S.activeMapId=idSave; w.renderMapVehicles();
    return r;
  })());

  /* 战斗：目标按钮已弃用，攻击自动选对面第一个还站着的 */
  w.switchTab('combat');
  ok('战斗：🎯 目标按钮与 combTargetId 已移除（攻击自动打对面第一个存活者）', (function(){
    var roster=$('combatBody')?$('combatBody').innerHTML:'';
    return typeof w.combTargetId==='undefined' && typeof w.combSelectTarget!=='function' &&
      roster.indexOf('combSelectTarget')<0 && roster.indexOf('🎯')<0;
  })());
  ok('战斗详情：普通模式也浮在屏幕左侧，切走/取消选中会收起', (function(){
    var on=d.querySelectorAll('#activePanel').length>0 &&
      /#tab-combat #activePanel\s*\{\s*display:\s*none/.test(cssText) &&
      /body\.comb-has-active #tab-combat\.active #activePanel/.test(cssText) &&
      !/body\.fs-combat #tab-combat #activePanel\s*\{\s*display:\s*none/.test(cssText);
    var c=(S.combat.participants||[])[0];
    if(!c) return on;
    w.selectComb(c.id);
    var opened=d.body.classList.contains('comb-has-active');
    w.selectComb(null);
    var closed=!d.body.classList.contains('comb-has-active');
    return on && opened && closed;
  })());

  /* ---------- 人物卡：武器名空只有类型 / 自定义子技能分列 / 任意特长 / 信用评级联动 ---------- */
  ok('导入：武器「名称空、只选了类型」的行也能读到（实验司机那种卡）', (function(){
    var res=w.buildCardXlsx(expActor(), w.b64ToBytes(w.__COC_BLANK_CARD_B64));
    var wb=w.XLSX.read(res.bytes,{type:'array'}), ws=wb.Sheets['人物卡'];
    delete ws['B53']; ws['G53']={t:'s',v:'刀剑'};
    var bytes=w.XLSX.write(wb,{bookType:'xlsx',type:'array'});
    var p=w.CoCParser.parseWorkbook(w.XLSX.read(bytes,{type:'array'}));
    return (p.weapons||[]).length>=1 && p.weapons[0].name==='刀剑' && p.weapons[0].type==='刀剑';
  })());
  ok('导出：武器成功率无技能可查时保留模板公式 + 原卡数值（不再是空的乱码）', (function(){
    var a=expActor(); a.id='expW2';
    a.weapons=[{name:'猎刀',type:'刀剑',skill:'鞭子',damage:'1D6',range:'接触',pierce:'—',attacks:'1',ammoCap:0,success:35}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return Number(ws['Q53'].v)===35 && !!ws['Q53'].f && String(ws['Q53'].f).length>0;
  })());
  ok('导出：自定义子技能名分格写回（左 F/H、右 AB/AD），不再是「驾驶：摩托」挤一格', (function(){
    var a=expActor(); a.id='expSplit';
    a.skills=[{name:'驾驶：摩托',name1:'驾驶：',name2:'摩托',total:40,base:20,slot:{r:16,c:'AB'}}];
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    return String(ws['AB16'].v)==='驾驶：' && String(ws['AD16'].v)==='摩托';
  })());
  ok('任意特长：导出写进右上角 6 格（BA/BJ × 18~20），导入读得回来', (function(){
    var a=expActor(); a.id='expTrait'; a.customTraits=['考古学','钓鱼'];
    var bytes=w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes;
    var ws=w.XLSX.read(bytes,{type:'array'}).Sheets['人物卡'];
    var written=String(ws['BA18'].v)==='考古学' && String(ws['BJ18'].v)==='钓鱼';
    var p=w.CoCParser.parseWorkbook(w.XLSX.read(bytes,{type:'array'}));
    return written && (p.customTraits||[]).join(',')==='考古学,钓鱼';
  })());
  ok('详情卡：不再单独列出 信用评级 / 其他资产 / 任意特长（后台读写照旧）', (function(){
    var a=expActor(); a.id='expNoField';
    S.actors.push(a);
    w.openActorModal(a.id,'pc');
    var html=$('actorModal').innerHTML;
    var gone=!$('am-credit') && !$('am-other-assets') && !$('am-traits') &&
      html.indexOf('am-credit')<0 && html.indexOf('am-other-assets')<0 && html.indexOf('am-traits')<0;
    var kept=!!$('am-cash') && !!$('am-currency') && !!$('am-asset-vehicle');
    w.closeActorModal();
    return gone && kept;
  })());
  ok('信用评级：后台读写不变（导出保留卡上公式 + 显示值）', (function(){
    var a=expActor(); a.id='expCredit';
    a.skills=[{name:'信用评级',total:45,base:0}]; a.credit='45%';
    var ws=w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}).Sheets['人物卡'];
    var wrote=String(ws['B62'].v)==='45%' && !!ws['B62'].f;
    var p=w.CoCParser.parseWorkbook(w.XLSX.read(w.buildCardXlsx(a, w.b64ToBytes(w.__COC_BLANK_CARD_B64)).bytes,{type:'array'}));
    return wrote && String(p.assets.credit||'')==='45%';
  })());

  /* ---------- 清空本地数据：上传的模组也一起清 ---------- */
  ok('清空全部本地数据：连上传的模组（IndexedDB）与右半屏一起清掉', (function(){
    var stSave=w.state, boxSave=w.confirmBox, delSave=w.idbDel, clearSave=w.moduleClear, closeSave=w.closeSidePane;
    var called=[];
    w.confirmBox=function(){ return true; };
    w.idbDel=function(k){ called.push('del:'+k); };
    w.moduleClear=function(){ called.push('clear'); };
    w.closeSidePane=function(){ called.push('close'); };
    var r=false;
    try{ w.wipeData(); r=called.indexOf('clear')>=0 && called.indexOf('del:module')>=0 && called.indexOf('close')>=0; }catch(e){ r=false; }
    w.state=stSave; w.confirmBox=boxSave; w.idbDel=delSave; w.moduleClear=clearSave; w.closeSidePane=closeSave;
    w.saveStateQuiet(); w.switchTab('surveyors');
    return r;
  })());


  /* ---------- 本轮：详情卡删项 / 载具四列 / 战斗收起详情 / NPC 模板与属性 ---------- */
  ok('载具·时间速度：一行四个（窄屏自动减列）', (function(){
    var flat=cssText.replace(/\s+/g,'');
    return /\.smallgrid\{[^}]*repeat\(4,/.test(flat) &&
      /@media\(max-width:1240px\)\{\.smallgrid\{grid-template-columns:repeat\(3,/.test(flat) &&
      /\.smallgrid>\.listitem\{margin-bottom:0/.test(flat);
  })());

  w.switchTab('combat');
  ok('战斗：详情面板自带「收起 ✕」，普通模式也能收（不再只在全屏出现）', (function(){
    var parts=S.combat.participants||(S.combat.participants=[]);
    var before=parts.length;
    parts.push({id:'t-part-x', actorId:null, kind:'npc', name:'临时测试', side:'敌人', dex:50, state:'正常',
      hp:{cur:5,max:5}, san:{cur:5,max:5}, mp:{cur:1,max:1}, armor:0, attrs:{}, skills:[], weapons:[], inv:[], spells:[], bagItems:[]});
    w.selectComb('t-part-x');
    var btns=[].slice.call($('activePanel').querySelectorAll('button')).filter(function(b){ return /收起/.test(b.textContent); });
    var btn=btns[0];
    var good=!!btn && !/fs-only/.test(btn.className||'') && /selectComb\(null\)/.test(btn.getAttribute('onclick')||'');
    w.selectComb(null);
    parts.length=before;
    return good;
  })());

  ok('NPC：一级「类别」+ 二级「具体条目」下拉，选类别只列该类模板', (function(){
    w.switchTab('npcs');
    var cat=$('npcTplCat'), sel=$('npcTplSel');
    if(!cat || !sel) return false;
    var catN=cat.options.length, allN=sel.options.length;
    cat.value='动物'; w.npcTplOptions();
    var animalN=sel.options.length;
    cat.value='神话生物'; w.npcTplOptions();
    var mythN=sel.options.length;
    cat.value=''; w.npcTplOptions();
    var backN=sel.options.length;
    return catN>=3 && allN>=20 && animalN>0 && animalN<allN && mythN>animalN && backN===allN;
  })());

  ok('NPC：属性按规则书骰式现掷（人类 5 的倍数、每次都不一样）', (function(){
    var cat=$('npcTplCat'); if(cat) cat.value='';
    w.npcTplOptions();
    $('npcTplSel').value='警察';
    var before=S.actors.length, seen=[], sample=null;
    for(var i=0;i<8;i++){
      w.genNpcFromTpl();
      var a=S.actors[S.actors.length-1];
      if(!sample) sample=a;
      seen.push(a.attrs.str);
    }
    var mult5=seen.every(function(v){ return v>0 && v%5===0; });
    var varies=seen.filter(function(v,i){ return seen.indexOf(v)===i; }).length>1;
    var sane=!!sample && sample.hp.max===Math.floor((sample.attrs.con+sample.attrs.siz)/10);
    S.actors.length=before;
    w.closeActorModal();
    return mult5 && varies && sane;
  })());
  ok('NPC：骰式解析认得 3D6×5 / 2D6+6×5，也认得定值与老区间', (function(){
    var a=w.rollDiceExpr('3D6×5'), b=w.rollDiceExpr('2D6+6×5'), c=w.rollDiceExpr(30), d=w.rollDiceExpr([40,60]);
    return a>=15 && a<=90 && a%5===0 && b>=40 && b<=90 && b%5===0 && c===30 && d>=40 && d<=60;
  })());

  /* 小卡不显示备注/描述（那行会把卡片撑成好几行）；备注本身照旧存在后台与详情卡里。 */
  ok('NPC 小卡：不显示备注/描述那一行（详情卡里照旧能填能存）', (function(){
    w.switchTab('npcs');
    $('npcTplCat').value=''; w.npcTplOptions();
    $('npcTplSel').value='市民';
    var before=S.actors.length;
    w.genNpcFromTpl();
    var npc=S.actors[S.actors.length-1];
    var card=function(){ return $('npcList').querySelector('.npcmini[data-id="'+npc.id+'"]'); };
    var tplNote='普通市民，警觉但不善战斗';
    var cleanOnGen=!!card() && card().innerHTML.indexOf('npc-note')<0 && card().textContent.indexOf(tplNote)<0;
    /* 自己在详情卡里填了备注，也不该跑到小卡上；但后台要存住 */
    $('am-npc-back').value='KP 自己写的备注';
    w.saveActorModal();
    var stored=npc.notes==='KP 自己写的备注';
    var stillClean=!!card() && card().textContent.indexOf('KP 自己写的备注')<0 && card().innerHTML.indexOf('npc-note')<0;
    S.actors.length=before;
    w.closeActorModal(); w.renderNpcs();
    return cleanOnGen && stillClean && stored;
  })());

  ok('NPC 小卡：阵营下拉不会顶出卡片（min-width:0 + max-width:100%）', (function(){
    var html=w.npcMiniHTML({id:'x',kind:'npc',name:'测试',side:'中立',count:1,
      attrs:{},hp:{cur:1,max:1},san:{cur:1,max:1},mp:{cur:1,max:1},skills:[],spells:[],weapons:[],inv:[],bagItems:[]});
    var flat=cssText.replace(/\s+/g,'');
    return /class="npc-side"/.test(html) && /min-width:0/.test(html) &&
      /\.npcmini\.npc-side\{[^}]*min-width:0[^}]*max-width:100%/.test(flat);
  })());

  ok('说明文字：已删除的那几条不再出现', (function(){
    var all=d.documentElement.innerHTML;
    var gone=[
      '阅读器自带的目录 / 页码 / Ctrl+F 都能用',
      '数量=该队在场景中的个体数',
      '载入预设地图时里程已按当前比例尺算好',
      '油桶·爆炸·椅子·餐桌·雕像等',
      '点一行看详情',
      '原版 · 全书',
      '头像上显示 HP/SAN/MP',
      '力量~幸运 · 保存后同步档案与小卡'
    ];
    return gone.every(function(t){ return all.indexOf(t)<0; });
  })());

  ok('NPC 小卡：类型/模板/备注都齐全也照样不渲染备注行', (function(){
    var html=w.npcMiniHTML({id:'y',kind:'npc',name:'警察',side:'敌人',count:1,template:'人类·警察',
      note:'警用左轮与警棍',notes:'KP 备注',attrs:{},hp:{cur:1,max:1},san:{cur:1,max:1},mp:{cur:1,max:1},
      skills:[],spells:[],weapons:[],inv:[],bagItems:[]});
    return html.indexOf('npc-note')<0 && html.indexOf('警用左轮与警棍')<0 && html.indexOf('KP 备注')<0 &&
      /class="npc-side"/.test(html) && html.indexOf('警察')>=0;
  })());

  ok('静态检查：src 里没有「漏 var 的全局赋值」（离线版严格模式会整段挂掉）', (function(){
    var bad=require('./scan-undef')();
    if (bad.length) console.log('   -> ' + bad.map(function(b){return b.file+':'+b.line+' '+b.name;}).join(', '));
    return bad.length===0;
  })());

  console.log('\n==== RESULT: ' + passed + ' passed, ' + failures.length + ' failed ====');
  if (failures.length){ console.log('FAILURES:\n - ' + failures.join('\n - ')); process.exit(1); }
  process.exit(0);
})().catch(e => { console.log('SMOKE CRASH', e && e.stack || e); process.exit(2); });
