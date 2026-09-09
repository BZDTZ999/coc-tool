/* ---------- NPC 模板（含阵营/头像） ---------- */
NPC_TPL = [
  {name:'市民', race:'人类', side:'中立', avatar:'🧔', def:2,
   attrs:{str:[35,50],con:[35,55],pow:[40,60],dex:[35,55],app:[40,60],siz:[40,60],int:[40,60],edu:[40,60],luck:[20,50]},
   skills:{斗殴:[20,35],闪避:[20,30],潜行:[10,30]}, weapons:[{name:'拳头',type:'徒手',skill:'斗殴',damage:'1D3+DB',ammoCap:0}],
   armor:0, mov:8, note:'普通市民，警觉但不善战斗'},
  {name:'警察', race:'人类', side:'盟友', avatar:'👮', def:2,
   attrs:{str:[50,70],con:[50,70],pow:[40,60],dex:[45,65],app:[40,60],siz:[55,75],int:[45,65],edu:[50,70],luck:[30,60]},
   skills:{斗殴:[45,60],手枪:[45,60],闪避:[30,45],侦查:[40,60],聆听:[40,60]}, weapons:[{name:'.38 左轮',type:'枪械',skill:'手枪',damage:'1D10',ammoCap:6},{name:'警棍',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:1, mov:8, note:'警用左轮与警棍'},
  {name:'医生', race:'人类', side:'盟友', avatar:'🧑⚕️', def:2,
   attrs:{str:[35,55],con:[40,60],pow:[50,70],dex:[40,60],app:[45,65],siz:[45,65],int:[65,85],edu:[75,90],luck:[20,50]},
   skills:{急救:[60,80],医学:[50,75],斗殴:[20,35],闪避:[25,40],心理学:[40,60]}, weapons:[{name:'手术刀',type:'刀剑',skill:'斗殴',damage:'1D4',ammoCap:0}],
   armor:0, mov:8, note:'会急救但不太能打'},
  {name:'教授/研究员', race:'人类', side:'盟友', avatar:'🧑🎓', def:2,
   attrs:{str:[30,50],con:[30,55],pow:[50,75],dex:[35,55],app:[40,60],siz:[45,65],int:[70,90],edu:[75,95],luck:[20,50]},
   skills:{图书馆使用:[60,85],神秘学:[50,80],说服:[40,65],闪避:[20,35],斗殴:[20,30]}, weapons:[{name:'手杖',type:'钝器',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'学者，命比较脆'},
  {name:'暴徒', race:'人类', side:'敌人', avatar:'🕵️', def:2,
   attrs:{str:[60,85],con:[55,80],pow:[35,55],dex:[45,60],app:[35,55],siz:[60,80],int:[35,55],edu:[30,55],luck:[20,45]},
   skills:{斗殴:[50,70],手枪:[40,60],恐吓:[40,60],闪避:[30,45]}, weapons:[{name:'棒球棍',type:'钝器',skill:'斗殴',damage:'1D8+DB',ammoCap:0},{name:'.45 手枪',type:'枪械',skill:'手枪',damage:'1D10+2',ammoCap:7}],
   armor:1, mov:8, note:'街头打手，色厉内荏'},
  {name:'邪教徒', race:'人类', side:'敌人', avatar:'🧙', def:2,
   attrs:{str:[40,60],con:[40,60],pow:[60,80],dex:[40,60],app:[40,60],siz:[45,65],int:[50,70],edu:[40,60],luck:[10,30]},
   skills:{斗殴:[35,50],匕首:[40,60],克苏鲁神话:[5,25],闪避:[25,40]}, weapons:[{name:'仪式匕首',type:'刀剑',skill:'匕首',damage:'1D4+DB',ammoCap:0}],
   armor:0, mov:8, note:'疯狂但组织化'},
  {name:'雇佣兵', race:'人类', side:'中立', avatar:'🤠', def:3,
   attrs:{str:[65,85],con:[60,80],pow:[45,65],dex:[55,70],app:[40,60],siz:[60,80],int:[40,60],edu:[50,70],luck:[20,45]},
   skills:{斗殴:[55,75],步枪:[50,70],手枪:[55,70],闪避:[40,55],侦查:[40,60]}, weapons:[{name:'.45 手枪',type:'枪械',skill:'手枪',damage:'1D10+2',ammoCap:7},{name:'战斗步枪',type:'枪械',skill:'步枪',damage:'2D6+2',ammoCap:5}],
   armor:2, mov:8, note:'战场老手，给钱办事'},
  {name:'深潜者', race:'神话生物', side:'敌人', avatar:'🐸', def:3,
   attrs:{str:60,con:60,pow:60,dex:50,app:35,siz:60,int:50,edu:55,luck:0},
   skills:{斗殴:30,闪避:30,游泳:70,恐吓:40}, weapons:[{name:'利爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   spells:['深潜者联络术'], armor:1, mov:8, note:'两栖蛙状生物，可呼唤同伴'},
  {name:'食尸鬼', race:'神话生物', side:'敌人', avatar:'🧟', def:3,
   attrs:{str:60,con:60,pow:50,dex:60,app:25,siz:60,int:45,edu:30,luck:0},
   skills:{斗殴:30,闪避:35,潜行:50}, weapons:[{name:'牙与爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   spells:['食尸鬼联络术'], armor:0, mov:8, note:'以腐肉为食，地下钻行'},
  {name:'米-戈', race:'神话生物', side:'敌人', avatar:'🦟', def:3,
   attrs:{str:40,con:70,pow:60,dex:50,app:30,siz:60,int:75,edu:70,luck:0},
   skills:{斗殴:30,闪避:30,飞行:60}, weapons:[{name:'钳爪',type:'爪',skill:'斗殴',damage:'1D6',ammoCap:0}],
   spells:['米-戈联络术'], armor:0, mov:6, note:'飞行真菌生物'},
  {name:'夜魇', race:'神话生物', side:'敌人', avatar:'👾', def:3,
   attrs:{str:60,con:80,pow:50,dex:60,app:20,siz:70,int:35,edu:20,luck:0},
   skills:{斗殴:50,闪避:40,攫抓:50}, weapons:[{name:'攫抓与咬',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   armor:0, mov:8, note:'无面有角，常成群出现'},
  {name:'修格斯', race:'神话生物', side:'敌人', avatar:'🫧', def:5,
   attrs:{str:85,con:90,pow:75,dex:55,app:15,siz:95,int:50,edu:50,luck:0},
   skills:{斗殴:70,闪避:35}, weapons:[{name:'碾压',type:'钝击',skill:'斗殴',damage:'1D10+DB',ammoCap:0}],
   spells:['外神仆役召唤、束缚术'], armor:0, mov:6, note:'巨大原生质怪，拟态一切'},
  {name:'星之眷属', race:'神话生物', side:'敌人', avatar:'🌊', def:4,
   attrs:{str:100,con:100,pow:80,dex:60,app:50,siz:120,int:60,edu:60,luck:0},
   skills:{斗殴:60,闪避:35}, weapons:[{name:'巨爪',type:'爪',skill:'斗殴',damage:'1D6+DB',ammoCap:0}],
   spells:['克苏鲁的星之眷族联络术'], armor:5, mov:8, note:'恐怖外形'}
];
function npcTplOptions(){
  var sel=$('npcTplSel'); if(!sel) return;
  var groups={};
  NPC_TPL.forEach(function(t){ (groups[t.race]=groups[t.race]||[]).push(t); });
  sel.innerHTML=Object.keys(groups).map(function(g){
    return '<optgroup label="'+esc(g)+'">'+groups[g].map(function(t){ return '<option value="'+esc(t.name)+'">'+esc(t.name)+'</option>'; }).join('')+'</optgroup>';
  }).join('');
  var sideSel=$('npcTplSide');
  if(sideSel && !sideSel.options.length){
    sideSel.innerHTML='<option value="">跟随模板(推荐)</option>'+['盟友','中立','敌人'].map(function(s){return '<option value="'+s+'">'+s+'</option>';}).join('');
  }
  var selMain=$('npcTplSel');
  if(selMain && sideSel){ selMain.onchange=function(){ sideSel.value=''; }; }
}
function genNpcFromTpl(){
  var name=$('npcTplSel').value;
  var tpl=NPC_TPL.filter(function(t){return t.name===name;})[0];
  if(!tpl){ toast('请先选模板'); return; }
  var cnt=Math.max(1,Math.round(num($('npcTplCount').value))||1);
  var side=$('npcTplSide')&&$('npcTplSide').value?$('npcTplSide').value:(tpl.side||'敌人');
  if(side==='调查员') side='盟友';
  var attrs={};
  ['str','con','pow','dex','app','siz','int','edu','luck'].forEach(function(k){
    var v=tpl.attrs[k];
    attrs[k]=Array.isArray(v)?randBetween(v[0],v[1]):v;
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
    template:(tpl.race==='神话生物'?'神话生物·':'人类·')+tpl.name,
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
