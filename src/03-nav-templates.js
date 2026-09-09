/* ---------- 导航与骨架 ---------- */
var TABS = [
  ['surveyors','📋 调查员'], ['npcs','👤 NPC 与敌人'], ['maps','🗺️ 地图·路线'],
  ['combat','⚔️ 战斗']
];





/* ================= 调查员 / NPC 库 ================= */
var pendingFile = null, pendingParse = null, currentActorModal = null, editingActorId = null;
var NPC_TPL = [
  {name:'市民', race:'人类', def:2, attrs:{str:[35,50],con:[35,55],pow:[40,60],dex:[35,55],app:[40,60],siz:[40,60],int:[40,60],edu:[40,60],luck:[20,50]},
   skills:{斗殴:[20,35],闪避:[20,30],潜行:[10,30]}, weapons:[{name:'拳头',type:'徒手',skill:'斗殴',damage:'1D3+DB',ammoCap:0}],
   hpNote:'普通市民', armor:0, mov:8},
  {name:'警察', race:'人类', def:2, attrs:{str:[50,70],con:[50,70],pow:[40,60],dex:[45,65],app:[40,60],siz:[55,75],int:[45,65],edu:[50,70],luck:[30,60]},
   skills:{斗殴:[45,60],手枪:[45,60],闪避:[30,45],侦查:[40,60],聆听:[40,60]}, weapons:[{name:'.38 左轮',type:'枪械',skill:'手枪',damage:'1D10',ammoCap:6},{name:'警棍',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   hpNote:'装备警用左轮与警棍', armor:1, mov:8},
  {name:'暴徒', race:'人类', def:2, attrs:{str:[60,85],con:[55,80],pow:[35,55],dex:[45,60],app:[35,55],siz:[60,80],int:[35,55],edu:[30,55],luck:[20,45]},
   skills:{斗殴:[50,70],手枪:[40,60],恐吓:[40,60],闪避:[30,45]}, weapons:[{name:'棒球棍',type:'钝器',skill:'斗殴',damage:'1D8+DB',ammoCap:0},{name:'.45 手枪',type:'枪械',skill:'手枪',damage:'1D10+2',ammoCap:7}],
   hpNote:'街头打手', armor:1, mov:8},
  {name:'邪教徒', race:'人类', def:2, attrs:{str:[40,60],con:[40,60],pow:[60,80],dex:[40,60],app:[40,60],siz:[45,65],int:[50,70],edu:[40,60],luck:[10,30]},
   skills:{斗殴:[35,50],匕首:[40,60],克苏鲁神话:[5,25],闪避:[25,40]}, weapons:[{name:'仪式匕首',type:'刀剑',skill:'匕首',damage:'1D4+DB',ammoCap:0}],
   hpNote:'疯狂但组织化', armor:0, mov:8},
  {name:'雇佣兵', race:'人类', def:3, attrs:{str:[65,85],con:[60,80],pow:[45,65],dex:[55,70],app:[40,60],siz:[60,80],int:[40,60],edu:[50,70],luck:[20,45]},
   skills:{斗殴:[55,75],步枪:[50,70],手枪:[55,70],闪避:[40,55],侦查:[40,60]}, weapons:[{name:'.45 手枪',type:'枪械',skill:'手枪',damage:'1D10+2',ammoCap:7},{name:'战斗步枪',type:'枪械',skill:'步枪',damage:'2D6+2',ammoCap:5}],
   hpNote:'战场老手', armor:2, mov:8},
  {name:'医生', race:'人类', def:2, attrs:{str:[35,55],con:[40,60],pow:[50,70],dex:[40,60],app:[45,65],siz:[45,65],int:[65,85],edu:[75,90],luck:[20,50]},
   skills:{急救:[60,80],医学:[50,75],斗殴:[20,35],闪避:[25,40],心理学:[40,60]}, weapons:[{name:'手术刀',type:'刀剑',skill:'斗殴',damage:'1D4',ammoCap:0}],
   hpNote:'会急救但不太能打', armor:0, mov:8},
  {name:'教授/研究员', race:'人类', def:2, attrs:{str:[30,50],con:[30,55],pow:[50,75],dex:[35,55],app:[40,60],siz:[45,65],int:[70,90],edu:[75,95],luck:[20,50]},
   skills:{图书馆使用:[60,85],神秘学:[50,80],说服:[40,65],闪避:[20,35],斗殴:[20,30]}, weapons:[{name:'手杖',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   hpNote:'学者，命比较脆', armor:0, mov:8},
  {name:'深潜者', race:'神话生物', def:3, attrs:{str:60,con:60,pow:60,dex:50,app:35,siz:60,int:50,edu:55,luck:0},
   skills:{斗殴:30,闪避:30,游泳:70,恐吓:40}, weapons:[{name:'利爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   hpNote:'蛙状两栖生物，水陆两栖', armor:1, mov:8, note:'可呼唤更多同伴，陆上行动迟缓'},
  {name:'食尸鬼', race:'神话生物', def:3, attrs:{str:60,con:60,pow:50,dex:60,app:25,siz:60,int:45,edu:30,luck:0},
   skills:{斗殴:30,闪避:35,潜行:50,撕咬:30}, weapons:[{name:'牙与爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   hpNote:'食尸鬼以腐肉为食', armor:0, mov:8, note:'地下钻行，嗅觉追踪'},
  {name:'米-戈', race:'神话生物', def:3, attrs:{str:40,con:70,pow:60,dex:50,app:30,siz:60,int:75,edu:70,luck:0},
   skills:{斗殴:30,闪避:30,飞行:60}, weapons:[{name:'钳爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   hpNote:'飞行真菌生物，可致脑损伤', armor:0, mov:6, note:'飞行速度 20 码/轮，携带飞行时更高'},
  {name:'夜魇', race:'神话生物', def:3, attrs:{str:60,con:80,pow:50,dex:60,app:20,siz:70,int:35,edu:20,luck:0},
   skills:{斗殴:50,闪避:40,攫抓:50}, weapons:[{name:'攫抓与咬',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   hpNote:'无面有角，喜攫人飞行', armor:0, mov:8, note:'常成群出现'},
  {name:'修格斯', race:'神话生物', def:5, attrs:{str:85,con:90,pow:75,dex:55,app:15,siz:95,int:50,edu:50,luck:0},
   skills:{斗殴:70,闪避:35}, weapons:[{name:'碾压',type:'钝击',skill:'斗殴',damage:'1D10+DB',ammoCap:0}],
   hpNote:'巨大原生质怪，拟态一切', armor:0, mov:6, note:'免疫常规武器劈砍'},
  {name:'星之眷属', race:'神话生物', def:4, attrs:{str:100,con:100,pow:80,dex:60,app:50,siz:120,int:60,edu:60,luck:0},
   skills:{斗殴:60,闪避:35}, weapons:[{name:'巨爪',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   hpNote:'与克苏鲁同形的巨型眷属', armor:5, mov:8, note:'恐怖外形每轮可能造成 SAN 损失'}
];


function randBetween(min,max){ return Math.round(min + Math.random()*(max-min)); }


/* ---------- 导入 ---------- */




/* ---------- 角色卡列表 ---------- */
function actorCardHTML(a){
  var kind=a.kind==='npc'?'NPC/敌人':'调查员';
  var hp=Math.min(a.hp.cur,a.hp.max||1), hpm=Math.max(a.hp.max||1,1);
  var hpPct=Math.max(0,Math.round(hp/hpm*100));
  var san=a.san?Math.max(0,Math.min(a.san.cur,a.san.max||99)):0;
  var db=a.db||dbTextOf(a.attrs);
  var at=a.attrs||{};
  return `<div class="actorcard">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><span class="badge ${a.kind==='pc'?'blue':'warn'}">${kind}</span>
        <div class="nm">${esc(a.name)}${a.kind==='npc'&&a.count>1?` <span class="badge">×${a.count}</span>`:''}</div>
        <div class="sub">${esc(a.kind==='pc'?(a.occupation||'职业未填')+(a.player?' · 玩家 '+esc(a.player):''):(a.template||'NPC')+' · '+esc(a.note||''))}</div></div>
      <div class="row" style="gap:4px">
        <button class="small" onclick="openActorModal('${a.id}','${a.kind}')">✏️</button>
        <button class="small danger" onclick="deleteActor('${a.id}')">🗑</button>
      </div>
    </div>
    <div class="attrmini">
      <span>STR ${at.str||0}</span><span>CON ${at.con||0}</span><span>POW ${at.pow||0}</span><span>DEX ${at.dex||0}</span>
      <span>APP ${at.app||0}</span><span>SIZ ${at.siz||0}</span><span>INT ${at.int||0}</span><span>EDU ${at.edu||0}</span><span>LUK ${at.luck||0}</span>
    </div>
    <div class="row" style="font-size:12px;gap:12px">
      <span class="num">HP <b>${hp}</b>/${hpm}</span><div class="bar hp" style="width:90px"><i style="width:${hpPct}%"></i></div>
      <span class="num">SAN ${san}/${a.san?a.san.max:0}</span>
      <span class="num">MP ${a.mp?a.mp.cur:0}/${a.mp?a.mp.max:0}</span>
      <span class="num">MOV ${a.mov||8} DB ${esc(db)}</span>
    </div>
    <div class="row" style="margin-top:6px;justify-content:flex-end">
      ${a.kind==='npc'?'<button class="small primary" onclick="combatPreAdd(\''+a.id+'\')">⚔️ 加入战斗</button>':''}
      <button class="small ghost" onclick="openActorModal('${a.id}','${a.kind}')">详情/编辑</button>
      ${a.kind==='pc'?'<button class="small ghost" onclick="exportActorJson(\''+a.id+'\')">导出</button>':''}
    </div></div>`;
}


