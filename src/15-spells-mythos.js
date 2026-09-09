/* ---------- A. 法术库（数据对应你提供的《COC 7th 核心规则书》第十二章 咒文；消耗以 KP 房规为准可改） ---------- */
var SPELLS = [
  {n:'支配术', c:'消耗：1 点魔法值；1 点理智值', mp:'1', san:'1', t:'', e:'意志压制目标，令其执行简单命令。'},
  {n:'剧痛术', c:'消耗：3 点魔法值；1 点理智值', mp:'3', san:'1', t:'1轮', e:'使目标陷入剧痛而无法行动。'},
  {n:'恐惧注入术', c:'消耗：12 点魔法值；1D6 点理智值', mp:'12', san:'1D6', t:'1轮', e:'将极度恐惧注入目标内心。'},
  {n:'深渊之息', c:'消耗：8 点魔法值；1D6 点理智值', mp:'8', san:'1D6', t:'', e:'令目标可在水下呼吸一段时间。'},
  {n:'阿撒托斯的恐怖诅咒', c:'消耗：4 点魔法值；1D6 点理智值', mp:'4', san:'1D6', t:'', e:'引来混沌盲目痴愚之神的恐怖力量。'},
  {n:'时空门搜寻术', c:'消耗：1 点魔法值；1D3 点理智值', mp:'1', san:'1D3', t:'', e:'寻找附近的时空门/次元裂缝。'},
  {n:'时空门观察术', c:'消耗：可变的魔法值和理智值', mp:'', san:'', t:'', e:'观察并辨认时空门通往何处。'},
  {n:'精神震爆术', c:'消耗：10 点魔法值；1D3 点理智值', mp:'10', san:'1D3', t:'即时', e:'精神冲击，目标受 5 点精神伤害。'},
  {n:'精神交换术', c:'消耗：10+1D6 点魔法值', mp:'', san:'', t:'', e:'与目标交换意识/灵魂。'},
  {n:'耶德·艾塔德放逐术', c:'消耗：每名施法者 1D4+3 点魔法值；1D4 点理智值', mp:'', san:'1D4', t:'≥1小时', e:'遣返穿越时空的类人智慧体（需≥3人）。'},
  {n:'葛哥洛斯形体扭曲术', c:'消耗：6+ 点魔法值；5 点 POW；2D6 点理智值', mp:'6', san:'2D6', t:'1D6+4分钟', e:'改变自身物理形态与外观。'},
  {n:'灵魂分配术', c:'消耗：10 点魔法值；5 点 POW/脏器；2D10 点理智值', mp:'10', san:'2D10', t:'每脏器1天', e:'把生命精华藏进体外脏器以求不死。'},
  {n:'祝福刀锋术', c:'消耗：5 点 POW；1D4 点理智值', mp:'', san:'1D4', t:'1小时', e:'让刀具能伤到平凡武器伤不了的存在。'},
  {n:'刀具附魔术', c:'消耗：可变的 POW；1D4 点理智值', mp:'', san:'1D4', t:'2小时', e:'附魔刀具，提升施法成功机会。'},
  {n:'祭刀附魔术', c:'消耗：30 点 POW', mp:'', san:'', t:'1星期', e:'造出火焰形状的仪式匕首。'},
  {n:'书册附魔术', c:'消耗：可变的 POW；1D4 点理智值', mp:'', san:'1D4', t:'', e:'附魔魔法书，施放其中法术更易。'},
  {n:'哨子附魔术', c:'消耗：可变的 POW；1D4 点理智值', mp:'', san:'1D4', t:'', e:'附魔哨子，助益拜亚基召唤束缚术。'},
  {n:'炭火盆附魔术', c:'消耗：2 点魔法值；1D6 点 SAN 值', mp:'2', san:'1D6', t:'', e:'附魔炭火盆（六版法术）。'},
  {n:'莫特兰玻璃幻术', c:'消耗：2 点魔法值；1D6 点 SAN 值', mp:'2', san:'1D6', t:'', e:'以玻璃制造幻觉（六版法术）。'},
  {n:'黄金蜂蜜酒酿造法', c:'消耗：每剂 20 点魔法值 + 旅程相关', mp:'', san:'', t:'许多天', e:'酿造能在宇宙真空中旅行的魔法酒。'},
  {n:'拉莱耶造雾术（创造瑞莱之雾）', c:'消耗：2 点魔法值', mp:'2', san:'', t:'', e:'制造遮蔽视线的深雾。'},
  {n:'致死术（死亡咒）', c:'消耗：24 点魔法值；3D10 点理智值', mp:'24', san:'3D10', t:'', e:'对目标施放死亡诅咒。'},
  {n:'绿腐术', c:'消耗：15 点魔法值；10 点 POW；2D8 点理智值', mp:'15', san:'2D8', t:'', e:'目标血肉快速腐坏。'},
  {n:'腐烂外皮之诅咒', c:'消耗：5 点魔法值；10 点理智值', mp:'5', san:'10', t:'', e:'令目标的皮肤开始腐烂。'},
  {n:'塔昆·阿提普之镜', c:'消耗：5 点魔法值；1 点理智值', mp:'5', san:'1', t:'', e:'制造或利用镜中映像。'},
  {n:'蒲林的埃及十字架', c:'消耗：25 点 POW；1D6 点理智值', mp:'', san:'1D6', t:'', e:'以埃及十字架进行守护/引导力量。'},
  {n:'修德·梅’尔之赤印', c:'消耗：3 点魔法值；1D8 点理智值；每轮1点耐久值', mp:'3', san:'1D8', t:'', e:'召唤灼热印记伤害目标。'},
  {n:'纽格塔紧握术', c:'消耗：1+ 点魔法值（该轮伤害两倍）；1D20 点理智值', mp:'', san:'1D20', t:'', e:'梦中巨手压迫目标胸口。'},
  {n:'维瑞之印', c:'消耗：8 点魔法值；1D6 点理智值', mp:'8', san:'1D6', t:'', e:'画下可以抵抗超自然的印记。'},
  {n:'犹格-索托斯之拳', c:'消耗：可变的魔法值；1D6 点理智值', mp:'', san:'1D6', t:'即时', e:'召唤巨型能量拳头轰击目标。'},
  {n:'真言术', c:'消耗：3+ 点魔法值；1D6 点理智值', mp:'3', san:'1D6', t:'', e:'以“真言”造成命令或冲击。'},
  {n:'迷身术（迷惑牺牲者）', c:'消耗：2 点魔法值；1D6 点 SAN 值', mp:'2', san:'1D6', t:'', e:'魅惑并迷惑单个目标。'},
  {n:'记忆模糊术（模糊记忆）', c:'消耗：1D6 点魔法值；1D2 点理智值', mp:'1D6', san:'1D2', t:'', e:'改写目标近期记忆。'},
  {n:'外貌滥用术（外貌摄取术）', c:'消耗：每6小时 10 点魔法值；5 点 POW；1D20 点理智值', mp:'10', san:'1D20', t:'', e:'窃取他人外貌以供伪装。'},
  {n:'致盲术 / 复明术', c:'消耗：8 点魔法值（复明额外 2D6 理智值）', mp:'8', san:'', t:'', e:'致盲或恢复视力。'},
  {n:'邪眼术', c:'消耗：10 点魔法值；1D4 点理智值', mp:'10', san:'1D4', t:'1轮', e:'给目标带来厄运，幸运检定困难。'},
  {n:'苏生术', c:'消耗：5 点魔法值；10 点理智值', mp:'5', san:'10', t:'', e:'使死者短暂复起（不一定受控）。'},
  {n:'复活术', c:'消耗：可变的魔法值；1D4 点理智值', mp:'', san:'1D4', t:'', e:'将死者完整复活。'},
  {n:'请神术（召唤神祇）', c:'消耗：每人 1+ 点魔法值；（仅施法者）1D10 点理智值', mp:'', san:'1D10', t:'1~100分钟', e:'将化身/外神/旧日支配者召至面前（极危险）。'},
  {n:'送神术（送离神祇）', c:'消耗：可变的魔法值/理智值', mp:'', san:'', t:'', e:'将不愿离开的神祇遣返（概率对应各神）。'},
  {n:'通神术（与神祇交流）', c:'消耗：4 点魔法值', mp:'4', san:'', t:'', e:'建立与神祇的交流通道。'},
  {n:'联络术（神话生物/神祇）', c:'消耗：视各法术而定', mp:'', san:'', t:'', e:'“传呼”目标：对方是否回应不受控。'},
  {n:'拜亚基召唤、束缚术', c:'消耗：可变（见规则书）', mp:'', san:'', t:'', e:'召唤/束缚拜亚基。'},
  {n:'深潜者召唤、束缚术', c:'消耗：可变（见规则书）', mp:'', san:'', t:'', e:'召唤/束缚深潜者。'},
  {n:'米-戈召唤、束缚术', c:'消耗：可变（见规则书）', mp:'', san:'', t:'', e:'召唤/束缚米-戈。'},
  {n:'星之精召唤、束缚术', c:'消耗：可变（见规则书）', mp:'', san:'', t:'', e:'召唤/束缚星之精。'},
  {n:'炎之精召唤、束缚术', c:'消耗：可变（见规则书）', mp:'', san:'', t:'', e:'召唤/束缚炎之精。'},
  {n:'外神仆役召唤、束缚术', c:'消耗：可变（见规则书）', mp:'', san:'', t:'', e:'召唤/束缚外神仆役。'},
  {n:'深潜者联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近深潜者建立联系（除非附近没有，否则自动成功）。'},
  {n:'食尸鬼联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的食尸鬼取得联系。'},
  {n:'米-戈联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的米-戈取得联系。'},
  {n:'飞水螅联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的飞水螅取得联系。'},
  {n:'古老者联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的古老者（远古种族）取得联系。'},
  {n:'无形之子联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的无形之子取得联系。'},
  {n:'诺弗-刻联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的诺弗-刻取得联系。'},
  {n:'钻地魔虫联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的钻地魔虫取得联系。'},
  {n:'廷达洛斯之猎犬联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'尝试与廷达洛斯猎犬建立联系（极度危险）。'},
  {n:'外神仆役联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的外神仆役（修格斯等）取得联系。'},
  {n:'克苏鲁的星之眷族联络术', c:'消耗：可变；理智损失见规则书', mp:'', san:'', t:'5~10轮', e:'与附近的星之眷族取得联系。'},
  {n:'自定义法术', c:'', mp:'', san:'', t:'', e:''}
];
function spellObjOf(i){ return SPELLS[i]||null; }
function spellByName(nm){
  for(var i=0;i<SPELLS.length;i++){ if(SPELLS[i].n===nm) return SPELLS[i]; }
  return null;
}
function spellFromName(nm){
  var o=spellByName(nm);
  if(o) return {name:o.n, mp:o.mp==null?'':String(o.mp), san:o.san==null?'':String(o.san), time:o.t||'', effect:o.e||''};
  return {name:nm, mp:'', san:'', time:'', effect:''};
}
function spellsLineHTML(a){
  var sps=(a&&a.spells)||[];
  if(!sps.length) return '';
  return '<div class="spellline" title="点击卡片可编辑法术"><b>🔮</b> '+sps.slice(0,4).map(function(s){
    return '<span class="spelltag">'+esc(s.name||'未名法术')+(s.mp!==''&&s.mp!=null?'<i>'+esc(String(s.mp))+'MP</i>':'')+'</span>';
  }).join('')+(sps.length>4?'<span class="muted">+'+sps.length+'</span>':'')+'</div>';
}
function spellRowHTML(s){
  s=s||{name:'',cost:'',mp:'',san:'',time:'',effect:''};
  var opts=SPELLS.map(function(sp,i){return '<option value="'+i+'"'+(sp.n===s.name?' selected':'')+'>'+esc(sp.n)+'</option>';}).join('');
  return `<div class="listitem srow" style="margin-bottom:6px">
    <div class="row" style="gap:6px;flex-wrap:wrap">
      <select class="sp-preset" style="max-width:300px;flex:1" onchange="fillPresetSpell(this)">
        <option value="">— 选一个法术（自动填消耗，可改）—</option>${opts}
      </select>
      <span class="hint">下拉含“自定义法术”自由填写</span>
      <button class="small danger" onclick="this.closest('.srow').remove()">✕</button>
    </div>
    <div class="row" style="gap:6px;margin-top:5px;flex-wrap:wrap">
      <input type="text" class="sp-name" value="${esc(s.name)}" placeholder="法术名称" style="flex:1.2;min-width:140px">
      <input type="text" class="sp-mp" value="${esc(s.mp!==undefined&&s.mp!==null?s.mp:'')}" placeholder="MP 如 8/1D6" style="width:96px" title="施法扣减：数字或掷骰表达式">
      <input type="text" class="sp-san" value="${esc(s.san!==undefined&&s.san!==null?s.san:'')}" placeholder="SAN 如 1D6" style="width:92px" title="施放时掷 SAN 损失">
      <input type="text" class="sp-time" value="${esc(s.time||'')}" placeholder="用时" style="width:100px">
      <input type="text" class="sp-effect" value="${esc(s.effect||'')}" placeholder="备注/效果（可选）" style="flex:1.6;min-width:150px">
    </div>
  </div>`;
}

function fillPresetSpell(sel){
  var i=num(sel.value); var sp=SPELLS[i]; if(!sp) return;
  var row=sel.closest('.srow'); if(!row) return;
  row.querySelector('.sp-name').value=sp.n;
  row.querySelector('.sp-mp').value=(sp.mp!==undefined?sp.mp:'');
  row.querySelector('.sp-san').value=(sp.san!==undefined?sp.san:'');
  row.querySelector('.sp-time').value=sp.t||'';
  row.querySelector('.sp-effect').value=sp.e||'';
}
function collectSpellsFromModal(m, a){
  a.spells=[];
  m.querySelectorAll('#am-spells .srow').forEach(function(li){
    var nm=li.querySelector('.sp-name').value.trim();
    if(!nm) return;
    a.spells.push({name:nm, mp:li.querySelector('.sp-mp').value.trim(), san:li.querySelector('.sp-san').value.trim(),
      time:li.querySelector('.sp-time').value.trim(), effect:li.querySelector('.sp-effect').value.trim()});
  });
}

/* ---------- B. 神话生物补充（按你规则书第十四章命名；数值为便于 KP 快速参考的可调近似值） ---------- */
NPC_TPL = NPC_TPL.concat([
  {name:'拜亚基', race:'神话生物', side:'敌人', avatar:'🦇', def:3,
   attrs:{str:[65,85],con:[50,70],pow:[45,65],dex:[55,75],app:[25,40],siz:[80,110],int:[30,50],edu:[20,40],luck:0},
   skills:{斗殴:45,闪避:35,恐吓:40}, weapons:[{name:'爪与咬',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   spells:['拜亚基召唤、束缚术'], armor:0, mov:8, note:'可飞越星际的翼兽；陆上笨拙，飞行灵活。'},
  {name:'炎之精', race:'神话生物', side:'敌人', avatar:'🔥', def:3,
   attrs:{str:[15,25],con:[25,40],pow:[50,70],dex:[70,85],app:[10,15],siz:[15,25],int:[35,55],edu:[10,20],luck:0},
   skills:{斗殴:30,闪避:60}, weapons:[{name:'烈焰之触',type:'火焰',skill:'斗殴',damage:'1D6+灼烧',ammoCap:0}],
   spells:['炎之精召唤、束缚术'], armor:0, mov:9, note:'火焰聚成的星间生物，免疫常规物理。'},
  {name:'星之精', race:'神话生物', side:'敌人', avatar:'🌌', def:4,
   attrs:{str:[70,95],con:[60,85],pow:[50,70],dex:[50,70],app:[5,10],siz:[70,95],int:[45,65],edu:[20,40],luck:0},
   skills:{斗殴:45,闪避:35,潜行:60}, weapons:[{name:'无形触须吸血',type:'触须',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   spells:['星之精召唤、束缚术'], armor:0, mov:9, note:'肉眼几乎不可见，靠近才显出血肉。'},
  {name:'巨噬蠕虫', race:'神话生物', side:'敌人', avatar:'🐛', def:6,
   attrs:{str:200,con:160,pow:80,dex:30,app:1,siz:300,int:10,edu:10,luck:0},
   skills:{斗殴:80,闪避:10}, weapons:[{name:'碾压',type:'钝击',skill:'斗殴',damage:'3D10+DB',ammoCap:0}],
   armor:0, mov:5, note:'地下巨虫，所到之处地陷如城。'},
  {name:'飞水螅', race:'神话生物', side:'敌人', avatar:'🌪️', def:5,
   attrs:{str:150,con:150,pow:80,dex:60,app:5,siz:200,int:70,edu:50,luck:0},
   skills:{斗殴:60,闪避:35}, weapons:[{name:'触手挥击',type:'触须',skill:'斗殴',damage:'2D8+DB',ammoCap:0}],
   spells:['飞水螅联络术'], armor:0, mov:10, note:'半物质性的古代掠食者，风与狂啸相伴。'},
  {name:'空鬼', race:'神话生物', side:'敌人', avatar:'🕳️', def:3,
   attrs:{str:60,con:55,pow:50,dex:50,app:5,siz:60,int:60,edu:40,luck:0},
   skills:{斗殴:40,闪避:35,潜行:55}, weapons:[{name:'钩爪',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'穿梭维度的灰色掠食者，能突然现身。'},
  {name:'恐怖猎手', race:'神话生物', side:'敌人', avatar:'🐉', def:4,
   attrs:{str:[80,120],con:[80,110],pow:[60,80],dex:[60,80],app:[5,15],siz:[90,130],int:[50,70],edu:[20,40],luck:0},
   skills:{斗殴:55,闪避:35,恐吓:60}, weapons:[{name:'利爪与撕咬',type:'爪',skill:'斗殴',damage:'1D8+DB',ammoCap:0}],
   armor:0, mov:10, note:'被禁忌咒文引来的飞行猎犬状恐怖。'},
  {name:'蛇人', race:'神话生物', side:'敌人', avatar:'🐍', def:3,
   attrs:{str:60,con:60,pow:55,dex:70,app:45,siz:60,int:65,edu:60,luck:0},
   skills:{斗殴:50,闪避:50,潜行:60,神秘学:50}, weapons:[{name:'爪击/淬毒刃',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   armor:1, mov:8, note:'古老退化种族，常拟人形混入社会。'},
  {name:'夏盖虫族', race:'神话生物', side:'敌人', avatar:'🦗', def:3,
   attrs:{str:[20,30],con:[35,45],pow:[55,75],dex:[60,80],app:[5,10],siz:[20,30],int:[65,85],edu:[30,50],luck:0},
   skills:{斗殴:30,闪避:60,恐吓:40}, weapons:[{name:'针刺',type:'刺',skill:'斗殴',damage:'1D3+毒',ammoCap:0}],
   armor:0, mov:8, note:'夏盖星昆虫，成群出现并寄生宿主。'},
  {name:'月兽', race:'神话生物', side:'敌人', avatar:'🫧', def:4,
   attrs:{str:[60,85],con:[60,85],pow:[50,70],dex:[50,70],app:[5,15],siz:[60,85],int:[60,80],edu:[40,60],luck:0},
   skills:{斗殴:45,闪避:30,恐吓:50}, weapons:[{name:'触手抽打',type:'触须',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'夜之梦境的巨蛞蝓状骑手，乘坐夜魇。'},
  {name:'黑山羊幼崽', race:'神话生物', side:'敌人', avatar:'🌿', def:5,
   attrs:{str:150,con:150,pow:110,dex:70,app:5,siz:200,int:80,edu:60,luck:0},
   skills:{斗殴:70,闪避:25}, weapons:[{name:'巨蹄践踏/触手',type:'钝击',skill:'斗殴',damage:'1D10+DB',ammoCap:0}],
   armor:2, mov:8, note:'黑暗母神的后裔，多肢巨兽。'}
]);
