/* ---------- NPC 模板（属性按规则书的骰式，每次生成现掷；阵营/头像/技能/武器按规则书整理） ----------
   属性一律写成骰式（如 '3D6×5'、'2D6+6×5'、'1D6×5'），生成时现掷一次 —— 所以每只怪都是新的随机值，
   人类与常见怪物掷出来通常是 5 的倍数（规则书的 ×5 就是这么来的）。数值是便于 KP 快速上手的近似值。 */
function npcAttrs(over){
  var o={str:'3D6×5',con:'3D6×5',pow:'3D6×5',dex:'3D6×5',app:'3D6×5',siz:'2D6+6×5',int:'2D6+6×5',edu:'2D6+6×5',luck:'3D6×5'};
  if(over) Object.keys(over).forEach(function(k){ o[k]=over[k]; });
  return o;
}
/* 掷一条属性骰：'3D6×5'、'2D6+6×5'、'1D6'、'2D6+2' 都认；也兼容老的 [最小,最大] 与定值 */
function rollDiceExpr(expr){
  if(expr==null) return null;
  if(typeof expr==='number') return expr;
  if(Array.isArray(expr)) return randBetween(expr[0],expr[1]);
  var s=String(expr).replace(/\s+/g,'').replace(/[xX✕*]/g,'×').replace(/[−–—]/g,'-');
  var m=s.match(/^(\d*)D(\d+)([+-]\d+)?(?:×(\d+))?$/i);
  if(!m) return num(expr)||0;
  var n=parseInt(m[1]||'1',10), faces=parseInt(m[2],10), mod=parseInt(m[3]||'0',10), mul=parseInt(m[4]||'1',10);
  var sum=0; for(var i=0;i<n;i++) sum+=Math.floor(Math.random()*faces)+1;
  return (sum+mod)*mul;
}
NPC_TPL = [
  /* ===== 人类：普通人与行当 ===== */
  {name:'市民', race:'人类', side:'中立', avatar:'🧔', def:2,
   attrs:npcAttrs({}),
   skills:{斗殴:[20,35],闪避:[20,30],潜行:[10,30]}, weapons:[{name:'拳头',type:'徒手',skill:'斗殴',damage:'1D3+DB',ammoCap:0}],
   armor:0, mov:8, note:'普通市民，警觉但不善战斗'},
  {name:'警察', race:'人类', side:'盟友', avatar:'👮', def:2,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',siz:'2D6+6×5',dex:'3D6×5'}),
   skills:{斗殴:[45,60],手枪:[45,60],闪避:[30,45],侦查:[40,60],聆听:[40,60]}, weapons:[{name:'.38 左轮',type:'枪械',skill:'手枪',damage:'1D10',ammoCap:6},{name:'警棍',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:1, mov:8, note:'警用左轮与警棍'},
  {name:'医生', race:'人类', side:'盟友', avatar:'🧑‍⚕️', def:2,
   attrs:npcAttrs({int:'2D6+6×5',edu:'2D6+6×5'}),
   skills:{急救:[60,80],医学:[50,75],斗殴:[20,35],闪避:[25,40],心理学:[40,60]}, weapons:[{name:'手术刀',type:'刀剑',skill:'斗殴',damage:'1D4',ammoCap:0}],
   armor:0, mov:8, note:'会急救但不太能打'},
  {name:'教授/研究员', race:'人类', side:'盟友', avatar:'🧑‍🎓', def:2,
   attrs:npcAttrs({str:'2D6×5',con:'2D6×5',int:'3D6×5',edu:'3D6×5'}),
   skills:{图书馆使用:[60,85],神秘学:[50,80],说服:[40,65],闪避:[20,35],斗殴:[20,30]}, weapons:[{name:'手杖',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'学者，命比较脆'},
  {name:'记者', race:'人类', side:'中立', avatar:'📰', def:2,
   attrs:npcAttrs({int:'3D6×5',edu:'3D6×5'}),
   skills:{侦查:[45,65],图书馆使用:[40,60],话术:[35,55],心理学:[30,50],闪避:[25,40]}, weapons:[{name:'相机（当钝器）',type:'钝器',skill:'斗殴',damage:'1D4+DB',ammoCap:0}],
   armor:0, mov:8, note:'鼻子灵、跑得快，随身带闪光灯'},
  {name:'侦探', race:'人类', side:'中立', avatar:'🕵️', def:2,
   attrs:npcAttrs({int:'3D6×5',edu:'3D6×5'}),
   skills:{侦查:[55,75],心理学:[45,65],聆听:[40,60],潜行:[35,55],手枪:[35,55]}, weapons:[{name:'.32 短管左轮',type:'枪械',skill:'手枪',damage:'1D8',ammoCap:6}],
   armor:0, mov:8, note:'私家侦探，善于跟人'},
  {name:'学生', race:'人类', side:'中立', avatar:'🎓', def:2,
   attrs:npcAttrs({str:'2D6×5',con:'2D6×5',siz:'2D6+6×5',int:'3D6×5',edu:'2D6×5'}),
   skills:{图书馆使用:[40,60],母语:[50,70],闪避:[25,40],聆听:[25,45]}, weapons:[{name:'拳头',type:'徒手',skill:'斗殴',damage:'1D3+DB',ammoCap:0}],
   armor:0, mov:8, note:'年轻、知道得多、容易上头'},
  {name:'流浪汉', race:'人类', side:'中立', avatar:'🧥', def:2,
   attrs:npcAttrs({app:'2D6×5',siz:'2D6+6×5',edu:'2D6×5'}),
   skills:{潜行:[35,55],聆听:[30,50],侦查:[25,45],话术:[20,40]}, weapons:[{name:'铁管',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'街头见得多，什么都不会说'},
  {name:'码头工人', race:'人类', side:'中立', avatar:'⚓', def:2,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',siz:'2D6+6×5',int:'2D6×5'}),
   skills:{斗殴:[35,55],攀爬:[40,60],游泳:[35,55],投掷:[30,50]}, weapons:[{name:'撬棍',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:1, mov:8, note:'膀大腰圆，讲义气'},
  {name:'出租车司机', race:'人类', side:'中立', avatar:'🚕', def:2,
   attrs:npcAttrs({int:'2D6×5',edu:'2D6×5'}),
   skills:{汽车驾驶:[50,70],侦查:[30,50],话术:[30,50],闪避:[25,40]}, weapons:[{name:'扳手',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'城市的耳朵，知道哪条路最短'},
  {name:'拳击手', race:'人类', side:'中立', avatar:'🥊', def:2,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',siz:'2D6+6×5',app:'2D6×5',int:'2D6×5',edu:'2D6×5'}),
   skills:{斗殴:[60,80],闪避:[50,70],恐吓:[35,55],投掷:[35,55]}, weapons:[{name:'拳套',type:'徒手',skill:'斗殴',damage:'1D3+DB',ammoCap:0}],
   armor:0, mov:9, note:'靠拳头吃饭，出手快'},
  {name:'士兵', race:'人类', side:'中立', avatar:'🪖', def:3,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',dex:'3D6×5',edu:'2D6+6×5'}),
   skills:{步枪:[45,70],手枪:[40,60],斗殴:[40,60],闪避:[35,55],潜行:[30,50]}, weapons:[{name:'军用步枪',type:'枪械',skill:'步枪',damage:'2D6+4',ammoCap:5},{name:'刺刀',type:'刀剑',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:2, mov:8, note:'受过训练，纪律性强'},
  {name:'牧师', race:'人类', side:'盟友', avatar:'⛪', def:2,
   attrs:npcAttrs({str:'2D6×5',edu:'2D6+6×5'}),
   skills:{说服:[45,65],心理学:[40,60],图书馆使用:[35,55],历史:[30,50]}, weapons:[{name:'手杖',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'信仰坚定，但别指望他懂神秘学'},
  {name:'暴徒', race:'人类', side:'敌人', avatar:'🔪', def:2,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',siz:'2D6+6×5',pow:'2D6×5',int:'2D6×5',edu:'2D6×5'}),
   skills:{斗殴:[50,70],手枪:[40,60],恐吓:[40,60],闪避:[30,45]}, weapons:[{name:'棒球棍',type:'钝器',skill:'斗殴',damage:'1D8+DB',ammoCap:0},{name:'.45 手枪',type:'枪械',skill:'手枪',damage:'1D10+2',ammoCap:7}],
   armor:1, mov:8, note:'街头打手，色厉内荏'},
  {name:'黑帮老大', race:'人类', side:'敌人', avatar:'🕴️', def:3,
   attrs:npcAttrs({str:'3D6×5',pow:'3D6×5',int:'3D6×5',edu:'2D6+6×5'}),
   skills:{斗殴:[50,70],手枪:[55,75],恐吓:[60,80],话术:[50,70],心理学:[40,60]}, weapons:[{name:'.38 左轮',type:'枪械',skill:'手枪',damage:'1D10',ammoCap:6}],
   armor:1, mov:8, note:'手下多，一般不自己动手'},
  {name:'邪教徒', race:'人类', side:'敌人', avatar:'🧙', def:2,
   attrs:npcAttrs({pow:'3D6×5',int:'2D6+6×5',edu:'2D6+6×5',luck:'1D6×5'}),
   skills:{斗殴:[35,50],匕首:[40,60],克苏鲁神话:[5,25],闪避:[25,40]}, weapons:[{name:'仪式匕首',type:'刀剑',skill:'匕首',damage:'1D4+DB',ammoCap:0}],
   armor:0, mov:8, note:'疯狂但组织化'},
  {name:'雇佣兵', race:'人类', side:'中立', avatar:'🤠', def:3,
   attrs:npcAttrs({str:'4D6×5',con:'3D6×5',dex:'3D6×5',int:'2D6+6×5',edu:'2D6+6×5'}),
   skills:{斗殴:[55,75],步枪:[50,70],手枪:[55,70],闪避:[40,55],侦查:[40,60]}, weapons:[{name:'.45 手枪',type:'枪械',skill:'手枪',damage:'1D10+2',ammoCap:7},{name:'战斗步枪',type:'枪械',skill:'步枪',damage:'2D6+2',ammoCap:5}],
   armor:2, mov:8, note:'战场老手，给钱办事'},
  /* ===== 动物（规则书附录「动物」） ===== */
  {name:'狗', race:'动物', side:'中立', avatar:'🐕', def:2,
   attrs:npcAttrs({str:'2D6×5',con:'2D6×5',pow:'2D6×5',dex:'2D6+6×5',app:'1D6×5',siz:'1D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{撕咬:[35,55],闪避:[30,50],聆听:[50,70],追踪:[40,65]}, weapons:[{name:'撕咬',type:'爪',skill:'撕咬',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:9, note:'看家护院，听主人指挥'},
  {name:'狼', race:'动物', side:'敌人', avatar:'🐺', def:2,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',pow:'3D6×5',dex:'2D6+6×5',app:'1D6×5',siz:'2D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{撕咬:[40,60],闪避:[35,55],潜行:[40,60],追踪:[45,65]}, weapons:[{name:'撕咬',type:'爪',skill:'撕咬',damage:'1D8+DB',ammoCap:0}],
   armor:0, mov:9, note:'成群出没，先扑最弱的'},
  {name:'熊', race:'动物', side:'敌人', avatar:'🐻', def:3,
   attrs:npcAttrs({str:'6D6×5',con:'4D6×5',pow:'3D6×5',dex:'2D6×5',app:'1D6×5',siz:'6D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{斗殴:[45,65],闪避:[25,40],攀爬:[35,55]}, weapons:[{name:'爪击/熊抱',type:'爪',skill:'斗殴',damage:'1D8+DB',ammoCap:0}],
   armor:2, mov:8, note:'一巴掌能拍碎车窗'},
  {name:'马', race:'动物', side:'中立', avatar:'🐎', def:2,
   attrs:npcAttrs({str:'5D6×5',con:'4D6×5',pow:'2D6×5',dex:'2D6×5',app:'2D6×5',siz:'6D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{踢踏:[35,55],闪避:[25,40],聆听:[35,55]}, weapons:[{name:'踢踏/踩踏',type:'钝击',skill:'踢踏',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:10, note:'受惊会狂奔，骑手要过「骑术」'},
  {name:'猫', race:'动物', side:'中立', avatar:'🐈', def:2,
   attrs:npcAttrs({str:'1D6×5',con:'1D6×5',pow:'2D6×5',dex:'2D6+6×5',app:'2D6×5',siz:'1D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{抓咬:[25,45],闪避:[55,75],潜行:[60,80],攀爬:[60,80]}, weapons:[{name:'抓咬',type:'爪',skill:'抓咬',damage:'1D3',ammoCap:0}],
   armor:0, mov:9, note:'无声无息，夜里最能作怪'},
  {name:'大猩猩', race:'动物', side:'敌人', avatar:'🦍', def:2,
   attrs:npcAttrs({str:'5D6×5',con:'3D6×5',pow:'2D6×5',dex:'2D6+6×5',app:'1D6×5',siz:'4D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{斗殴:[45,65],闪避:[30,45],攀爬:[50,70]}, weapons:[{name:'撕咬/捶打',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:1, mov:8, note:'力气惊人，真打起来很危险'},
  {name:'毒蛇', race:'动物', side:'敌人', avatar:'🐍', def:2,
   attrs:npcAttrs({str:'1D6×5',con:'1D6×5',pow:'2D6×5',dex:'3D6×5',app:'1D6×5',siz:'1D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{咬击:[40,60],闪避:[40,60],潜行:[50,70]}, weapons:[{name:'毒牙',type:'刺',skill:'咬击',damage:'1D3+毒',ammoCap:0}],
   armor:0, mov:8, note:'咬中要过 CON，失败按规则书吃毒伤'},
  {name:'鲨鱼', race:'动物', side:'敌人', avatar:'🦈', def:3,
   attrs:npcAttrs({str:'6D6×5',con:'5D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'6D6×5',int:'1D6×5',edu:0,luck:0}),
   skills:{撕咬:[55,75],闪避:[30,45]}, weapons:[{name:'撕咬',type:'爪',skill:'撕咬',damage:'2D6+DB',ammoCap:0}],
   armor:1, mov:9, note:'血腥味一起，甩不掉'},
  /* ===== 神话生物（规则书第十四章；数值是可以随手调的近似值） ===== */
  {name:'深潜者', race:'神话生物', side:'敌人', avatar:'🐸', def:3,
   attrs:npcAttrs({str:'4D6×5',con:'3D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'3D6×5',int:'3D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:30,闪避:30,游泳:70,恐吓:40}, weapons:[{name:'利爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   spells:['深潜者联络术'], armor:1, mov:8, note:'两栖蛙状生物，可呼唤同伴'},
  {name:'食尸鬼', race:'神话生物', side:'敌人', avatar:'🧟', def:3,
   attrs:npcAttrs({str:'4D6×5',con:'3D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'3D6×5',int:'3D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:30,闪避:35,潜行:50}, weapons:[{name:'牙与爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   spells:['食尸鬼联络术'], armor:0, mov:8, note:'以腐肉为食，地下钻行'},
  {name:'米-戈', race:'神话生物', side:'敌人', avatar:'🦟', def:3,
   attrs:npcAttrs({str:'2D6×5',con:'4D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'3D6×5',int:'4D6×5',edu:'4D6×5',luck:0}),
   skills:{斗殴:30,闪避:30,飞行:60}, weapons:[{name:'钳爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   spells:['米-戈联络术'], armor:0, mov:6, note:'飞行真菌生物'},
  {name:'夜魇', race:'神话生物', side:'敌人', avatar:'👾', def:3,
   attrs:npcAttrs({str:'4D6×5',con:'4D6×5',pow:'3D6×5',dex:'4D6×5',app:'1D6×5',siz:'4D6×5',int:'2D6×5',edu:'1D6×5',luck:0}),
   skills:{斗殴:50,闪避:40,攫抓:50}, weapons:[{name:'攫抓与咬',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'无面有角，常成群出现'},
  {name:'修格斯', race:'神话生物', side:'敌人', avatar:'🫧', def:5,
   attrs:npcAttrs({str:'8D6×5',con:'8D6×5',pow:'4D6×5',dex:'3D6×5',app:'1D6×5',siz:'10D6×5',int:'3D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:70,闪避:35}, weapons:[{name:'碾压',type:'钝击',skill:'斗殴',damage:'1D10+DB',ammoCap:0}],
   spells:['外神仆役召唤、束缚术'], armor:0, mov:6, note:'巨大原生质怪，拟态一切'},
  {name:'星之眷属', race:'神话生物', side:'敌人', avatar:'🌊', def:4,
   attrs:npcAttrs({str:'8D6×5',con:'8D6×5',pow:'4D6×5',dex:'4D6×5',app:'2D6×5',siz:'8D6×5',int:'3D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:60,闪避:35}, weapons:[{name:'巨爪',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   spells:['克苏鲁的星之眷族联络术'], armor:5, mov:8, note:'恐怖外形'},
  {name:'拜亚基', race:'神话生物', side:'敌人', avatar:'🦇', def:3,
   attrs:npcAttrs({str:'4D6×5',con:'4D6×5',pow:'3D6×5',dex:'4D6×5',app:'1D6×5',siz:'6D6×5',int:'2D6×5',edu:'1D6×5',luck:0}),
   skills:{斗殴:45,闪避:35,恐吓:40}, weapons:[{name:'爪与咬',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   spells:['拜亚基召唤、束缚术'], armor:0, mov:8, note:'可飞越星际的翼兽；陆上笨拙，飞行灵活。'},
  {name:'炎之精', race:'神话生物', side:'敌人', avatar:'🔥', def:3,
   attrs:npcAttrs({str:'1D6×5',con:'2D6×5',pow:'3D6×5',dex:'4D6×5',app:'1D6×5',siz:'1D6×5',int:'2D6×5',edu:'1D6×5',luck:0}),
   skills:{斗殴:30,闪避:60}, weapons:[{name:'烈焰之触',type:'火焰',skill:'斗殴',damage:'1D6+灼烧',ammoCap:0}],
   spells:['炎之精召唤、束缚术'], armor:0, mov:9, note:'火焰聚成的星间生物，免疫常规物理。'},
  {name:'星之精', race:'神话生物', side:'敌人', avatar:'🌌', def:4,
   attrs:npcAttrs({str:'4D6×5',con:'4D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'4D6×5',int:'3D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:45,闪避:35,潜行:60}, weapons:[{name:'无形触须吸血',type:'触须',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   spells:['星之精召唤、束缚术'], armor:0, mov:9, note:'肉眼几乎不可见，靠近才显出血肉。'},
  {name:'巨噬蠕虫', race:'神话生物', side:'敌人', avatar:'🐛', def:6,
   attrs:npcAttrs({str:'8D6×5',con:'6D6×5',pow:'4D6×5',dex:'1D6×5',app:'1D6×5',siz:'12D6×5',int:'2D6×5',edu:'1D6×5',luck:0}),
   skills:{斗殴:80,闪避:10}, weapons:[{name:'碾压',type:'钝击',skill:'斗殴',damage:'3D10+DB',ammoCap:0}],
   armor:0, mov:5, note:'地下巨虫，所到之处地陷如城。'},
  {name:'飞水螅', race:'神话生物', side:'敌人', avatar:'🌪️', def:5,
   attrs:npcAttrs({str:'6D6×5',con:'6D6×5',pow:'4D6×5',dex:'3D6×5',app:'1D6×5',siz:'8D6×5',int:'4D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:60,闪避:35}, weapons:[{name:'触手挥击',type:'触须',skill:'斗殴',damage:'2D8+DB',ammoCap:0}],
   spells:['飞水螅联络术'], armor:0, mov:10, note:'半物质性的古代掠食者，风与狂啸相伴。'},
  {name:'空鬼', race:'神话生物', side:'敌人', avatar:'🕳️', def:3,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'3D6×5',int:'3D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:40,闪避:35,潜行:55}, weapons:[{name:'钩爪',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'穿梭维度的灰色掠食者，能突然现身。'},
  {name:'恐怖猎手', race:'神话生物', side:'敌人', avatar:'🐉', def:4,
   attrs:npcAttrs({str:'4D6×5',con:'4D6×5',pow:'4D6×5',dex:'4D6×5',app:'1D6×5',siz:'5D6×5',int:'3D6×5',edu:'1D6×5',luck:0}),
   skills:{斗殴:55,闪避:35,恐吓:60}, weapons:[{name:'利爪与撕咬',type:'爪',skill:'斗殴',damage:'1D8+DB',ammoCap:0}],
   armor:0, mov:10, note:'被禁忌咒文引来的飞行猎犬状恐怖。'},
  {name:'蛇人', race:'神话生物', side:'敌人', avatar:'🐍', def:3,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',pow:'3D6×5',dex:'4D6×5',app:'3D6×5',siz:'3D6×5',int:'4D6×5',edu:'4D6×5',luck:0}),
   skills:{斗殴:50,闪避:50,潜行:60,神秘学:50}, weapons:[{name:'爪击/淬毒刃',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   armor:1, mov:8, note:'古老退化种族，常拟人形混入社会。'},
  {name:'夏盖虫族', race:'神话生物', side:'敌人', avatar:'🦗', def:3,
   attrs:npcAttrs({str:'1D6×5',con:'2D6×5',pow:'4D6×5',dex:'4D6×5',app:'1D6×5',siz:'1D6×5',int:'4D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:30,闪避:60,恐吓:40}, weapons:[{name:'针刺',type:'刺',skill:'斗殴',damage:'1D3+毒',ammoCap:0}],
   armor:0, mov:8, note:'夏盖星昆虫，成群出现并寄生宿主。'},
  {name:'月兽', race:'神话生物', side:'敌人', avatar:'🫧', def:4,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'3D6×5',int:'4D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:45,闪避:30,恐吓:50}, weapons:[{name:'触手抽打',type:'触须',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'夜之梦境的巨蛞蝓状骑手，乘坐夜魇。'},
  {name:'黑山羊幼崽', race:'神话生物', side:'敌人', avatar:'🌿', def:5,
   attrs:npcAttrs({str:'8D6×5',con:'8D6×5',pow:'6D6×5',dex:'4D6×5',app:'1D6×5',siz:'10D6×5',int:'4D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:70,闪避:25}, weapons:[{name:'巨蹄践踏/触手',type:'钝击',skill:'斗殴',damage:'1D10+DB',ammoCap:0}],
   armor:2, mov:8, note:'黑暗母神的后裔，多肢巨兽。'},
  {name:'沼泽人', race:'神话生物', side:'敌人', avatar:'🌫️', def:3,
   attrs:npcAttrs({str:'3D6×5',con:'3D6×5',pow:'3D6×5',dex:'3D6×5',app:'1D6×5',siz:'3D6×5',int:'3D6×5',edu:'1D6×5',luck:0}),
   skills:{斗殴:45,闪避:35,潜行:70,游泳:60}, weapons:[{name:'沼泽巨掌',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'湿地里拖人下水的烂泥状生物。'},
  {name:'廷达洛斯猎犬', race:'神话生物', side:'敌人', avatar:'📐', def:3,
   attrs:npcAttrs({str:'2D6×5',con:'3D6×5',pow:'3D6×5',dex:'4D6×5',app:'1D6×5',siz:'2D6×5',int:'3D6×5',edu:'1D6×5',luck:0}),
   skills:{斗殴:45,闪避:50,潜行:60}, weapons:[{name:'利齿与舌',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   armor:0, mov:9, note:'从任何角度都能扑来，只走直线抄近路。'},
  {name:'古老者', race:'神话生物', side:'敌人', avatar:'🦑', def:3,
   attrs:npcAttrs({str:'4D6×5',con:'4D6×5',pow:'4D6×5',dex:'3D6×5',app:'1D6×5',siz:'4D6×5',int:'4D6×5',edu:'4D6×5',luck:0}),
   skills:{斗殴:50,闪避:30,科学:60,历史:60}, weapons:[{name:'触手/爪',type:'触须',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:2, mov:8, note:'南极冰原下的桶状古族，会用奇异科技。'},
  {name:'钻地魔虫', race:'神话生物', side:'敌人', avatar:'🪱', def:5,
   attrs:npcAttrs({str:'8D6×5',con:'8D6×5',pow:'4D6×5',dex:'2D6×5',app:'1D6×5',siz:'10D6×5',int:'3D6×5',edu:'2D6×5',luck:0}),
   skills:{斗殴:70,闪避:20}, weapons:[{name:'碾压与吞噬',type:'钝击',skill:'斗殴',damage:'2D6+DB',ammoCap:0}],
   armor:3, mov:4, note:'地下的庞然巨物，靠近会引发地震。'}
];
/* 模板下拉：一级选「类别」，二级选具体条目（默认「全部」把所有条目列在一起） */
function npcTplOptions(){
  var sel=$('npcTplSel'); if(!sel) return;
  var cats=[], groups={};
  NPC_TPL.forEach(function(t){ if(cats.indexOf(t.race)<0) cats.push(t.race); (groups[t.race]=groups[t.race]||[]).push(t); });
  var catSel=$('npcTplCat');
  if(catSel){
    var keep=catSel.value||'';
    var want='<option value="">全部（'+NPC_TPL.length+'）</option>'+cats.map(function(c){
      return '<option value="'+esc(c)+'">'+esc(c)+'（'+groups[c].length+'）</option>';
    }).join('');
    if(catSel.innerHTML!==want){ catSel.innerHTML=want; catSel.value=(cats.indexOf(keep)>=0)?keep:''; }
  }
  var cur=(catSel&&catSel.value&&groups[catSel.value])?groups[catSel.value]:NPC_TPL;
  var list=cur.map(function(t){ return {name:t.name, race:t.race}; });
  var prev=sel.value;
  if(sel.options.length!==list.length || [].slice.call(sel.options).some(function(o,i){ return o.value!==list[i].name; })){
    sel.innerHTML=list.map(function(t){ return '<option value="'+esc(t.name)+'">'+esc(t.name)+'</option>'; }).join('');
  }
  if(list.some(function(t){ return t.name===prev; })) sel.value=prev;
  else if(list.length) sel.value=list[0].name;
  var sideSel=$('npcTplSide');
  if(sideSel && !sideSel.options.length){
    sideSel.innerHTML='<option value="">跟随模板(推荐)</option>'+['盟友','中立','敌人'].map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join('');
  }
  if(sel && sideSel){ sel.onchange=function(){ sideSel.value=''; }; }
}
function genNpcFromTpl(){
  var name=$('npcTplSel')?$('npcTplSel').value:'';
  var tpl=NPC_TPL.filter(function(t){return t.name===name;})[0];
  if(!tpl){ toast('请先选模板'); return; }
  var cnt=Math.max(1,Math.round(num($('npcTplCount').value))||1);
  var side=$('npcTplSide')&&$('npcTplSide').value?$('npcTplSide').value:(tpl.side||'敌人');
  if(side==='调查员') side='盟友';
  /* 属性按模板的骰式现掷一次：每只都是新的随机值（规则书里 CON 2D6×5 这类就掷 2D6×5） */
  var attrs={};
  ['str','con','pow','dex','app','siz','int','edu','luck'].forEach(function(k){
    var v=rollDiceExpr(tpl.attrs[k]);
    attrs[k]=Math.max(0,Math.round(v==null?0:v));
  });
  var hpMax=Math.max(1,Math.floor((attrs.con+attrs.siz)/10));
  var skills=[],weapons=[];
  Object.keys(tpl.skills||{}).forEach(function(sk){
    skills.push({name:sk,total:Array.isArray(tpl.skills[sk])?randBetween(tpl.skills[sk][0],tpl.skills[sk][1]):tpl.skills[sk]});
  });
  (tpl.weapons||[]).forEach(function(w){
    var cap=w.ammoCap||0;
    weapons.push({name:w.name,type:w.type||'',skill:w.skill||'斗殴',damage:w.damage||'1D3+DB',range:'近战',pierce:'—',attacks:'1',ammoCap:cap,ammoCur:cap,note:''});
  });
  var spells=(tpl.spells||[]).map(function(nm){ return spellFromName(nm); });
  var actor={
    id:uid('npc'), kind:'npc', count:cnt, side:side,
    template:(tpl.race==='神话生物'?'神话生物·':(tpl.race==='动物'?'动物·':'人类·'))+tpl.name,
    name:tpl.name+(cnt>1?' ×'+cnt:''), note:tpl.note||'',
    avatar:{preset:tpl.avatar||defaultAvatarForActor('npc',side), custom:null},
    attrs:attrs, hp:{cur:hpMax,max:hpMax}, mp:{cur:Math.floor(attrs.pow/5),max:Math.floor(attrs.pow/5)},
    san:{cur:Math.min(attrs.pow||0,99),max:99}, mov:tpl.mov||8,
    db:dbTextOf(attrs), build:'0', armor:{value:tpl.armor||0,type:''},
    skills:skills, weapons:weapons, inv:[], spells:spells, cash:0, currency:'美元',
    history:{}, backstory:'', notes:'', player:''
  };
  state.actors.push(actor);
  saveState(); renderNpcs();
  toast('已生成「'+actor.name+'」×'+cnt);
  openActorModal(actor.id,'npc');
}
