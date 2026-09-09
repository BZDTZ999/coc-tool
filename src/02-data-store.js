/* ---------- 默认数据 ---------- */
function defaultVehicles(){
  return [
    {id:'v-walk', name:'步行', kmh:5, note:'普通步行 5km/h，负重/伤病下调'},
    {id:'v-run', name:'奔跑', kmh:14, note:'持续奔跑（短途追逐）'},
    {id:'v-bike', name:'自行车', kmh:16, note:'乡村路况可 12~18'},
    {id:'v-horse', name:'骑马', kmh:16, note:'骑乘，1920s 常见'},
    {id:'v-carriage', name:'马车', kmh:9, note:'载货载人慢但稳妥'},
    {id:'v-car', name:'汽车', kmh:45, note:'1920s 城市/公路均速'},
    {id:'v-car-high', name:'汽车·高速', kmh:80, note:'开阔公路长途'},
    {id:'v-bus', name:'公共汽车', kmh:28, note:'含停站时间'},
    {id:'v-tram', name:'有轨电车', kmh:22, note:'城市轨道线路'},
    {id:'v-train', name:'火车', kmh:95, note:'长途客运，含进出站'},
    {id:'v-ship', name:'客船/渡轮', kmh:22, note:'沿海/内河，码头等候另计'},
    {id:'v-plane', name:'飞机', kmh:300, note:'实际含机场等待，点对点请加时间'}
  ];
}
function defaultState(){
  var d = new Date();
  d.setSeconds(0,0);
  return {
    version:1,
    clockStart: d.getTime(),
    actors: [],          // kind:'pc' 调查员 | kind:'npc' 敌人/NPC
    maps: [],            // 场景地图
    activeMapId: null,
    vehicles: defaultVehicles(),
    combat: { round:0, phase:'行动', participants:[], log:[] }
  };
}
var state = null;
function saveState(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); toast('已自动保存 ✔'); }
  catch(e){ toast('⚠ 浏览器禁止本地保存，请及时导出备份', 4000); }
}
function loadState(){
  try{
    var s = localStorage.getItem(LS_KEY);
    if (s){ state = JSON.parse(s); }
  }catch(e){}
  if (!state || !state.actors){
    var fresh = defaultState();
    state = fresh;
    // 首次使用放一个示例NPC/示例地图提示
    state.actors.push(makeNpcExample());
    state.maps.push(makeDemoMap());
    state.activeMapId = state.maps[0].id;
    saveStateQuiet();
  }
  if (!state.vehicles) state.vehicles = defaultVehicles();
  if (!state.combat) state.combat = {round:0,phase:'行动',participants:[],log:[]};
  if (!state.clockStart) state.clockStart = Date.now();
}
function saveStateQuiet(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){} }

/* ---------- 示例数据 ---------- */
function makeNpcExample(){
  return {
    id: uid('npc'), kind:'npc', count:3, template:'暴徒',
    name:'码头帮派打手', note:'阿卡姆码头收保护费的一伙人，色厉内荏。',
    attrs:{str:65,con:60,pow:40,dex:50,app:40,siz:65,int:45,edu:40,luck:30},
    hp:{cur:12,max:12}, mp:{cur:8,max:8}, san:{cur:40,max:40},
    mov:8, db:dbTextOf({str:65,siz:65}), build:'0', armor:{value:0,type:''},
    skills:[{name:'斗殴',total:40},{name:'手枪',total:35},{name:'闪避',total:28}],
    weapons:[{name:'棒球棍',type:'钝器',skill:'斗殴',damage:'1D8+DB',range:'近战',pierce:'—',attacks:'1',ammoCap:0,ammoCur:0},
             {name:'.38 左轮',type:'枪械',skill:'手枪',damage:'1D10',range:'15码',pierce:'—',attacks:'1',ammoCap:6,ammoCur:6}],
    inv:[{name:'铜板',qty:3,note:'小费/贿赂'},{name:'开锁工具',qty:1,note:'潜行任务'}],
    cash:0, currency:'美元', backstory:'', notes:''
  };
}
function makeDemoMap(){
  return {
    id: uid('map'),
    name:'示例：小镇之夜（阿卡姆）',
    kmPerPx: 0.05,
    background: null,
    points:[
      {id:uid('p'),name:'旅馆',icon:'🏨',desc:'你们落脚的旅馆',x:120,y:150},
      {id:uid('p'),name:'警察局',icon:'🚔',desc:'治安官办公室',x:420,y:90},
      {id:uid('p'),name:'图书馆',icon:'📚',desc:'米斯卡塔尼克图书馆',x:700,y:150},
      {id:uid('p'),name:'码头',icon:'⚓',desc:'旧码头仓库',x:860,y:430},
      {id:uid('p'),name:'墓园',icon:'🪦',desc:'山丘墓园',x:250,y:430}
    ],
    legs:[
      {id:uid('e'),a:0,b:1,dist:4,note:'沿主街',modes:null},
      {id:uid('e'),a:1,b:2,dist:6,note:'学院区大道',modes:null},
      {id:uid('e'),a:2,b:3,dist:9,note:'跨河大桥，夜间无公交',modes:['v-walk','v-run','v-bike','v-car','v-horse','v-carriage','v-car-high']},
      {id:uid('e'),a:0,b:4,dist:7,note:'郊野小路',modes:null},
      {id:uid('e'),a:4,b:3,dist:8,note:'河岸线（有渡船）',modes:null}
    ]
  };
}
