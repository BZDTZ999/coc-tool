/* ---------- 调查员导出：把角色数据写回《空白人物卡》模板 ----------
   需求：导出不再给 .json，而是拿“空白人物卡”模板，把角色数据填进去，
        另存为「本次团名-角色名.xlsx」下载；导出前先与“导入时的数据”比对，
        把变化写进角色的「调查员经历」（经历模组=本次团名，描述=数据变化）。
   实现：模板以 xlsx（zip）形式随包提供，用 XLSX.CFB 精确改写 人物卡 工作表的
        单元格 XML，完整保留模板的样式、合并单元格与公式以外的排版。
   离线单文件版把模板内联为 base64（window.__COC_BLANK_CARD_B64）；
   在线多文件版首次导出时按需 fetch('assets/blank-card.xlsx')。 */

/* 背景故事各小节 → 模板标签关键词（与 parse-card.js 的识别规则保持一致） */
var CARD_SECTION_MATCH=[
  ['appearance',['形象描述','个人描述','角色外貌','外貌']],
  ['beliefs',['思想与信念','信念']],
  ['people',['重要之人']],
  ['places',['意义非凡之地','意义非凡']],
  ['belongings',['宝贵之物','珍爱之物']],
  ['traits',['特质','性格']],
  ['secrets',['难言之隐','秘密']],
  ['scars',['伤口和疤痕','伤口','伤疤']],
  ['phobias',['恐惧症和狂躁症','恐惧症','狂躁症']]
];

function b64ToBytes(b64){
  var s=String(b64||'').replace(/[\s\r\n]+/g,'');
  var bin=atob(s), out=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
function cardXmlEscape(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c];
  });
}
function cardDecodeBytes(u8){
  if(window.TextDecoder) return new TextDecoder('utf-8').decode(u8);
  var s='';for(var i=0;i<u8.length;i++) s+=String.fromCharCode(u8[i]);
  try{ return decodeURIComponent(escape(s)); }catch(e){ return s; }
}
function cardEncodeText(str){
  if(window.TextEncoder) return new TextEncoder().encode(str);
  var u8=new Uint8Array(str.length);
  for(var i=0;i<str.length;i++) u8[i]=str.charCodeAt(i)&0xff;
  return u8;
}
/* 懒加载空白人物卡模板：内联 base64 优先，其次按需 fetch 在线资源。 */
function ensureBlankCard(cb, cardId){
  /* 现在有 4 张受支持的卡：能取到对应模板就取那一张（导出用导入时那张卡的模板），
     取不到（或没给 id）就退回默认的粉卡。旧调用方 ensureBlankCard(cb) 依旧可用。 */
  if(typeof cocCardBytes==='function'){ cocCardBytes(cardId||COC_CARD_DEFAULT, cb); return; }
  if(window.__cocBlankBytes){ cb(window.__cocBlankBytes); return; }
  if(window.__COC_BLANK_CARD_B64){
    try{ window.__cocBlankBytes=b64ToBytes(window.__COC_BLANK_CARD_B64); }
    catch(e){ toast('模板解码失败：'+e.message,5000); return; }
    cb(window.__cocBlankBytes); return;
  }
  if(window.__cocBlankLoading){ window.__cocBlankQueue.push(cb); return; }
  window.__cocBlankLoading=true; window.__cocBlankQueue=[cb];
  var url=(window.__COC_BLANK_CARD_URL||'assets/blank-card.xlsx');
  fetch(url).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); })
    .then(function(buf){
      window.__cocBlankBytes=new Uint8Array(buf);
      window.__cocBlankLoading=false;
      var q=window.__cocBlankQueue||[]; window.__cocBlankQueue=[];
      q.forEach(function(f){ try{ f(window.__cocBlankBytes); }catch(e){ toast('导出失败：'+e.message,6000); } });
    })
    .catch(function(e){
      window.__cocBlankLoading=false; window.__cocBlankQueue=[];
      toast('⚠ 读取《空白人物卡》模板失败：'+((e&&e.message)||e)+'（在线版需能访问 assets/blank-card.xlsx；本地请用 offline.html）',7000);
    });
}
function cardCfbIndex(cfb,path){
  for(var i=0;i<cfb.FullPaths.length;i++){
    var p=String(cfb.FullPaths[i]).replace(/^Root Entry\//,'').replace(/^\//,'');
    if(p===path) return i;
  }
  return -1;
}
function cardCfbText(cfb,path){
  var i=cardCfbIndex(cfb,path); if(i<0) return '';
  var c=cfb.FileIndex[i].content;
  return cardDecodeBytes(c instanceof Uint8Array?c:new Uint8Array(c));
}
function cardColNum(letters){ var n=0; for(var i=0;i<letters.length;i++) n=n*26+(letters.charCodeAt(i)-64); return n; }
/* 用与模板完全一致的位置写单元格：保留原样式 s="…"，值改为数字或行内字符串。
   若该单元格在模板里不存在，就按列序插进所在行（保持 Excel 要求的列升序）。 */
function cardSetCell(xml,ref,value,isNum,keepFormula,newFormula){
  var mm=ref.match(/^([A-Z]+)(\d+)$/);
  if(!mm) return {xml:xml,miss:true};
  var col=mm[1], row=+mm[2], colN=cardColNum(col);
  var re=new RegExp('<c r="'+ref+'"[^>]*?(?:/>|>[\\s\\S]*?<\\/c>)');
  var hit=xml.match(re);
  var sAttr=hit?(hit[0].match(/\ss="\d+"/)):null;
  var s=sAttr?sAttr[0]:'';
  /* keepFormula：模板这一格本来就是公式（半值/五分之一、成功率 SUM、困难极难 INT、本职★…）时，
     不把公式换成死值，而是“原公式 + 新的显示值”，既有正确数字又不动模板。 */
  var fEl=null;
  if(newFormula){
    /* 我们自己的公式（模板那一格没有、或原有公式会算错时用）：原样写 <f>，值当缓存显示。 */
    fEl='<f>'+String(newFormula).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</f>';
  } else if(keepFormula && hit){
    /* 模板里多是“共享公式”：主格是 <f t="shared" ref="T16:T49" si="6">INT(R16/2)</f>，
       其余格子是 <f t="shared" si="6"/>。这里整段原样抄回去（含 si/ref），
       只把 <v> 换成我们的显示值 —— 公式结构一点不动，Excel 也不会报修复。 */
    var fm=hit[0].match(/<f\b[^>]*\/>|<f\b[^>]*>[\s\S]*?<\/f>/);
    if(fm) fEl=fm[0];
  }
  var cell=isNum
    ? (fEl!=null
        ? '<c r="'+ref+'"'+s+'>'+fEl+'<v>'+(isFinite(num(value))?num(value):0)+'</v></c>'
        : '<c r="'+ref+'"'+s+'><v>'+(isFinite(num(value))?num(value):0)+'</v></c>')
    : (fEl!=null
        ? '<c r="'+ref+'"'+s+' t="str">'+fEl+'<v>'+cardXmlEscape(value)+'</v></c>'
        : '<c r="'+ref+'"'+s+' t="inlineStr"><is><t xml:space="preserve">'+cardXmlEscape(value)+'</t></is></c>');
  if(hit) return {xml:xml.replace(hit[0],cell),miss:false};
  var rowRe=new RegExp('<row r="'+row+'"[^>]*?(?:/>|>[\\s\\S]*?<\\/row>)');
  var rm=xml.match(rowRe);
  if(!rm) return {xml:xml,miss:true};
  var start=rm.index, rowStr=rm[0];
  if(/\/>$/.test(rowStr)){
    return {xml:xml.slice(0,start)+rowStr.replace(/\/>$/,'>')+cell+'</row>'+xml.slice(start+rowStr.length),miss:false};
  }
  var innerStart=rowStr.indexOf('>')+1, inner=rowStr.slice(innerStart,-6);
  var insertAt=-1, cre=/<c r="([A-Z]+)\d+"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g, cm;
  while((cm=cre.exec(inner))){ if(cardColNum(cm[1])>colN){ insertAt=cm.index; break; } }
  var newInner=(insertAt<0)?(inner+cell):(inner.slice(0,insertAt)+cell+inner.slice(insertAt));
  var newRow=rowStr.slice(0,innerStart)+newInner+'</row>';
  return {xml:xml.slice(0,start)+newRow+xml.slice(start+rowStr.length),miss:false};
}
/* 导入时的数据快照：用于对比“这次团里角色发生了什么变化”。 */
function importSnapshotOf(a){
  a=a||{};
  var snap={attrs:{},hp:{},san:{},mp:{},skills:{},weapons:[],inv:[],plot:[],spells:[],armor:0,mov:0,db:''};
  ['str','con','pow','dex','app','siz','int','edu','luck'].forEach(function(k){ snap.attrs[k]=num(a.attrs&&a.attrs[k]); });
  snap.hp={cur:num(a.hp&&a.hp.cur),max:num(a.hp&&a.hp.max)};
  snap.san={cur:num(a.san&&a.san.cur),max:num(a.san&&a.san.max)};
  snap.mp={cur:num(a.mp&&a.mp.cur),max:num(a.mp&&a.mp.max)};
  (a.skills||[]).forEach(function(s){ if(s&&String(s.name||'').trim()) snap.skills[String(s.name).trim()]=num(s.total); });
  snap.weapons=(a.weapons||[]).map(function(w){return String((w&&w.name)||'').trim();}).filter(Boolean);
  snap.inv=(a.inv||[]).filter(function(i){return i&&i.slot!=='bag';}).map(function(i){return String((i&&i.name)||'').trim();}).filter(Boolean);
  snap.plot=(a.plot||[]).filter(function(i){return i && num(i.qty)>0;}).map(function(i){return String(i.name||'').trim();}).filter(Boolean);
  snap.spells=(a.spells||[]).map(function(s){return String((s&&s.name)||'').trim();}).filter(Boolean);
  snap.bag=(a.inv||[]).filter(function(i){return i&&i.slot==='bag';}).map(function(i){return String((i&&i.name)||'').trim();}).filter(Boolean);
  snap.armor=num(a.armor&&a.armor.value);
  snap.armorType=String((a.armor&&a.armor.type)||'');
  snap.mov=num(a.mov); snap.db=String(a.db||'');
  snap.cash=num(a.cash); snap.currency=String(a.currency||'');
  snap.credit=String(a.credit==null?'':a.credit); snap.otherAssets=String(a.otherAssets==null?'':a.otherAssets);
  snap.assetsTable={};
  ['vehicle','residence','luxury','stocks','other'].forEach(function(k){ snap.assetsTable[k]=String((a.assetsTable&&a.assetsTable[k])==null?'':a.assetsTable[k]).trim(); });
  return snap;
}
function diffActorSinceImport(a){
  var snap=a&&a.importSnapshot;
  if(!snap) return '（首次导出：没有导入时的数据可对比）';
  var out=[];
  var ATTR_CN={str:'STR',con:'CON',pow:'POW',dex:'DEX',app:'APP',siz:'SIZ',int:'INT',edu:'EDU',luck:'LUCK'};
  var at=a.attrs||{}, attrChg=[];
  Object.keys(ATTR_CN).forEach(function(k){
    var o=num(snap.attrs&&snap.attrs[k]), n=num(at[k]);
    if(o!==n) attrChg.push(ATTR_CN[k]+' '+o+'→'+n);
  });
  if(attrChg.length) out.push('属性：'+attrChg.join('、'));
  function pair(label,o,n){ o=num(o); n=num(n); if(o!==n) out.push(label+' '+o+'→'+n); }
  pair('HP',snap.hp&&snap.hp.cur,num(a.hp&&a.hp.cur));
  pair('SAN',snap.san&&snap.san.cur,num(a.san&&a.san.cur));
  pair('MP',snap.mp&&snap.mp.cur,num(a.mp&&a.mp.cur));
  pair('护甲',snap.armor,num(a.armor&&a.armor.value));
  pair('MOV',snap.mov,num(a.mov));
  var cur={}; (a.skills||[]).forEach(function(s){ if(s&&String(s.name||'').trim()) cur[String(s.name).trim()]=num(s.total); });
  var sk=[], seen={};
  Object.keys(snap.skills||{}).forEach(function(k){
    seen[k]=1;
    if(cur[k]===undefined) sk.push('删除「'+k+'」');
    else if(cur[k]!==snap.skills[k]){
      var dl=cur[k]-snap.skills[k];
      sk.push(k+' '+snap.skills[k]+'→'+cur[k]+'（成长 '+(dl>0?'+':'')+dl+'）');
    }
  });
  Object.keys(cur).forEach(function(k){ if(!seen[k]) sk.push('新增「'+k+' '+cur[k]+'」'); });
  if(sk.length) out.push('技能：'+sk.join('、'));
  function listDiff(label,o,curList){
    o=o||[]; curList=curList||[];
    var add=curList.filter(function(x){return o.indexOf(x)<0;});
    var del=o.filter(function(x){return curList.indexOf(x)<0;});
    if(!add.length && !del.length) return;
    var p=[];
    if(add.length) p.push('新增 '+add.join('、'));
    if(del.length) p.push('移除 '+del.join('、'));
    out.push(label+'：'+p.join('；'));
  }
  listDiff('武器',snap.weapons,(a.weapons||[]).map(function(w){return String((w&&w.name)||'').trim();}).filter(Boolean));
  listDiff('背包',snap.inv,(a.inv||[]).filter(function(i){return i&&i.slot!=='bag';}).map(function(i){return String((i&&i.name)||'').trim();}).filter(Boolean));
  listDiff('背包格',snap.bag||[],(a.inv||[]).filter(function(i){return i&&i.slot==='bag';}).map(function(i){return String((i&&i.name)||'').trim();}).filter(Boolean));
  listDiff('法术',snap.spells,(a.spells||[]).map(function(s){return String((s&&s.name)||'').trim();}).filter(Boolean));
  listDiff('剧情道具',snap.plot,(a.plot||[]).filter(function(i){return i && num(i.qty)>0;}).map(function(i){return String(i.name||'').trim();}).filter(Boolean));
  /* 防具类型 / 信用评级 / 现金 / 其他资产 / 其他资产表：同样是“和最初上传时比” */
  function text(label,o,n){
    o=String(o==null?'':o); n=String(n==null?'':n);
    if(o!==n) out.push(label+' '+(o||'（空）')+'→'+(n||'（空）'));
  }
  text('防具',snap.armorType,(a.armor&&a.armor.type)||'');
  text('信用评级',snap.credit,a.credit);
  pair('现金',snap.cash,num(a.cash));
  text('货币',snap.currency,a.currency);
  text('其他资产',snap.otherAssets,a.otherAssets);
  var AT_CN={vehicle:'交通工具',residence:'住所',luxury:'奢侈品',stocks:'股票/证券',other:'其他资产项'};
  var aChg=[];
  Object.keys(AT_CN).forEach(function(k){
    var o=String((snap.assetsTable&&snap.assetsTable[k])==null?'':snap.assetsTable[k]).trim();
    var n=String((a.assetsTable&&a.assetsTable[k])==null?'':a.assetsTable[k]).trim();
    if(o!==n) aChg.push(AT_CN[k]+' '+(o||'（空）')+'→'+(n||'（空）'));
  });
  if(aChg.length) out.push('其他资产表：'+aChg.join('、'));
  return out.length?out.join('；'):'（本次无数据变化）';
}
/* 「成长」列：和“最初上传时的技能值”比，多了写 +N，少了写 -N；没变化留空。
   导入时没有这项技能（新加的）时，按“比它的初始值多多少”算。 */
function cardSkillGrowth(a,s,base){
  var snap=a&&a.importSnapshot;
  if(!snap||!snap.skills) return 0;
  var key=String((s&&s.name)||'').trim();
  if(!key) return 0;
  if(snap.skills[key]===undefined) return num(s&&s.total)-num(base);
  return num(s&&s.total)-num(snap.skills[key]);
}
/* 「法术一览」的使用代价：优先用 MP/SAN/用时拼，拼不出来就回退原卡上的原文 */
function cardSpellCost(sp){
  sp=sp||{};
  var parts=[];
  var mp=String(sp.mp==null?'':sp.mp).trim(), san=String(sp.san==null?'':sp.san).trim(), tm=String(sp.time==null?'':sp.time).trim();
  if(mp) parts.push(mp+'mp');
  if(san) parts.push(san+'san');
  if(tm) parts.push(tm);
  return parts.length?parts.join(' '):String(sp.cost==null?'':sp.cost).trim();
}
/* 剧情道具的“效果”写成一句人话：治疗 HP 1D3 / 回 SAN / 弹药 等等 */
function cardPlotEffectText(it){
  it=it||{};
  var LAB={heal:'治疗 HP',san:'回复 SAN',mp:'回复 MP',ammo:'弹药',other:'其他',none:''};
  var label=(it.effect!==undefined && it.effect!=='')?(LAB[it.effect]!==undefined?LAB[it.effect]:String(it.effect)):'无特殊效果';
  var amt=String(it.amount==null?'':it.amount).trim();
  return label+(amt?(' '+amt):'');
}
/* 卡上技能名的各种写法归一到可比形式：去掉“格斗：/射击：/技艺（/空格/标点”。 */
function cardSkillKey(name){
  return String(name==null?'':name).replace(/[\s　·・：:（）()\[\]【】、，,。.\/\\-—_]+/g,'').trim();
}
/* 武器「使用技能」→ 本卡技能总分。
   工具的武器行常写「斗殴」，而卡上那一格可能是「格斗：斗殴」「斗殴（格斗）」，
   所以先精确、再归一化相等、再互相包含，免得查不到就把成功率留空。 */
function cardSkillTotalFor(a,name){
  var key=String(name==null?'':name).trim(); if(!key) return '';
  var list=(a&&a.skills)||[];
  var kk=cardSkillKey(key);
  function find(fn){ for(var i=0;i<list.length;i++){ var s=list[i]||{}; if(fn(String(s.name==null?'':s.name).trim(), cardSkillKey(String(s.name==null?'':s.name)))) return s; } return null; }
  var hit=find(function(nm){ return nm===key; }) ||
          (kk?find(function(nm,nk){ return nk===kk; }):null) ||
          (kk?find(function(nm,nk){ return nk && (nk.slice(-kk.length)===kk || kk.slice(-nk.length)===nk); }):null);
  return hit?num(hit.total):'';
}
/* 生成要写入模板的“单元格 → 值”清单 */
/* 武器槽行数：这几张卡的武器表都是「B..F 合并」构成一行槽位，从第 53 行起连续排，
   下面的第 60 行就是「资产」表头。数出实际槽位（粉卡/CY 系列是 6 行），
   免得武器比卡上留的行多时把资产/背景表头写坏。识别不出就退回 8。 */
function cardWeaponSlotRows(ws){
  var merges=(ws && ws['!merges']) || [], has={};
  merges.forEach(function(m){ if(m.s && m.s.c===1 && m.e && m.e.c>=5) has[m.s.r+1]=true; });
  var n=0; while(has[53+n]) n++;
  return (n>=3 && n<=12) ? n : 8;
}
function cardWritesFor(a, tplRows){
  var W=[];
  function S(ref,v){ W.push({ref:ref,val:(v==null?'':String(v)),num:false}); }
  function N(ref,v){ W.push({ref:ref,val:(isFinite(num(v))?num(v):0),num:true}); }
  function tplCell(r,col){ var row=tplRows[r-1]||[]; var v=row[XLSX.utils.decode_col(col)]; return v==null?'':String(v).trim(); }
  /* 数字写入；keepFormula=true 时若模板该格是公式就保留公式只换显示值 */
  function W2(ref,v,keepFormula){ W.push({ref:ref,val:(isFinite(num(v))?num(v):0),num:true,keepF:!!keepFormula}); }
  /* 数值小工具：拿“当前单元格里的值” */
  function tplNum(r,col){ return num(tplCell(r,col)); }
  var at=a.attrs||{};

  /* 基本信息 */
  S('E3',a.name); S('E4',a.player); S('M4',a.era);
  S('E5',a.occupation);
  /* 职业序号 M5：「本职★」那一列靠它去「本职技能」表查列（INDEX/MATCH）。
     千万别写空字符串 —— MATCH 查不到，整列的 ★ 会全变成 #N/A（用户踩过这个坑）。
     序号缺失时先拿「职业」名字去模板的「职业列表」里找一遍；还找不到就干脆不写这一格。 */
  var occIdRaw=(a.occId==null||a.occId==='')?'':String(a.occId).trim();
  if(occIdRaw==='' && String(a.occupation||'').trim()){
    var olist=(tplRows&&tplRows.__occList)||[];
    for(var oi=1;oi<olist.length;oi++){
      var orow=olist[oi]||[];
      var onm=String(orow[1]==null?'':orow[1]).trim();
      if(onm && onm===String(a.occupation).trim()){ var onum=num(orow[0]); if(onum>0){ occIdRaw=String(onum); break; } }
    }
  }
  /* 序号必须是「本职技能」表头里真实存在的数字；对不上就不写（写错同样会整列 #N/A）。
     这一格“不写”是安全的：留空 MATCH 会命中第一个空列，只是显示技能名，不会报错。 */
  var occUsed='';
  if(occIdRaw!=='' && isFinite(num(occIdRaw))){
    var hd0=(tplRows&&tplRows.__occHead)||[];
    for(var hj=0;hj<hd0.length;hj++){ if(num(hd0[hj])===num(occIdRaw)){ occUsed=num(occIdRaw); break; } }
  }
  if(occUsed!=='') N('M5',occUsed);
  if(tplRows) tplRows.__occUsed=occUsed;
  S('E6',a.age); S('M6',a.sex);
  S('E7',a.residence); S('M7',a.hometown);

  /* 9 项属性：全值 / 半值 / 五分之一（模板里各占一格） */
  [['str','U3','W3','W4'],['dex','AA3','AC3','AC4'],['pow','AG3','AI3','AI4'],
   ['con','U5','W5','W6'],['app','AA5','AC5','AC6'],['edu','AG5','AI5','AI6'],
   ['siz','U7','W7','W8'],['int','AA7','AC7','AC8'],['luck','AG7','AI7','AI8']
  ].forEach(function(t){
    var v=Math.max(0,Math.round(num(at[t[0]])));
    N(t[1],v);
    W2(t[2],Math.floor(v/2),true);    /* 半值：模板是 INT(x/2) 公式，保留 */
    W2(t[3],Math.floor(v/5),true);    /* 五分之一：模板是 INT(x/5) 公式，保留 */
  });

  /* HP / SAN / MP / MOV / 护甲 / DB / 体格 */
  N('E10',a.hp?a.hp.cur:0); N('G10',a.hp?a.hp.max:0);
  N('N10',a.san?a.san.cur:0); N('P10',a.san?a.san.max:99);
  N('W10',a.mp?a.mp.cur:0); N('Y10',a.mp?a.mp.max:0);
  N('AF10',num(a.mov)||8);
  /* 护甲值：有护甲才写数字；没有护甲就别把模板上的「无」改成 0 */
  var armorV=num(a.armor&&a.armor.value);
  if(armorV>0) N('AN10',armorV);
  S('AN12',(a.armor&&a.armor.type)||tplCell(12,'AN'));
  S('AP52',a.db||'0'); S('AP55',a.build||'0');

  /* 资产：现金 / 货币 / 信用评级 / 其他资产 + 其他资产表（行 75、行 76 合计） */
  N('O62',num(a.cash)); S('S62',a.currency||'美元');
  /* 信用评级：卡上这格本来是公式（=附表!Z223 → “成功率%/困难%/极难%”）。如果玩家填的就是这种
     “x%/y%/z%”，就别用死文本把公式顶掉 —— 保留公式、只更新显示值，这样在 Excel 里改
     「信用评级」技能的熟练度，这格会跟着自动算。填了别的自由文本才原样写进去。 */
  var creditTxt=(a.credit==null||a.credit==='')?tplCell(62,'B'):String(a.credit);
  if(/^\s*\d+\s*%?\s*(\/|／)\s*\d+/.test(String(a.credit||'')) || /^\s*\d+\s*%?\s*$/.test(String(a.credit||''))){
    W.push({ref:'B62',val:creditTxt,num:false,keepF:true});
  } else S('B62',creditTxt);

  /* 任意特长：人物卡右上角那 6 个框（BA/BJ 两列 × 18~20 行），一格一条。 */
  var traits=(a.customTraits||[]).map(function(x){ return String(x==null?'':x).replace(/\s+/g,' ').trim(); }).filter(Boolean);
  if(!traits.length) traits=[];
  [['BA',18],['BJ',18],['BA',19],['BJ',19],['BA',20],['BJ',20]].forEach(function(t,i){
    var v=traits[i]||'';
    var cur=tplCell(t[1],t[0]);
    if(v!==cur) S(t[0]+t[1],v);
  });
  S('L62',(a.otherAssets==null||a.otherAssets==='')?tplCell(62,'L'):String(a.otherAssets));
  S('L63',(a.assetsDetail==null||a.assetsDetail==='')?tplCell(63,'L'):String(a.assetsDetail));
  /* 其他资产表（交通工具 / 住所 / 奢侈品 / 股票证券 / 其他）：现在允许填任意字符（“一辆别克”“1200 元”“祖宅”都行）。
     整格就是一个数字才写成数字（这样「资产总和」算得出来），其它原样写文本。
     合计给一条自己的公式：把五个格子加起来（文本会被 SUM 忽略），跟模板原来只有 SUM(B75:E75) 相比不会漏项。 */
  var tab=a.assetsTable||{};
  var assetSum=0;
  [['B75','vehicle'],['F75','residence'],['J75','luxury'],['N75','stocks'],['R75','other']].forEach(function(t){
    var raw=(tab[t[1]]==null?'':String(tab[t[1]])).trim();
    if(/^-?\d+(\.\d+)?$/.test(raw)){ assetSum+=parseFloat(raw); N(t[0],parseFloat(raw)); }
    else S(t[0],raw);
  });
  W.push({ref:'B76',val:'资产总和：'+assetSum,num:false,
    formula:'="资产总和："&(SUM(B75:E75)+SUM(F75:I75)+SUM(J75:M75)+SUM(N75:Q75)+SUM(R75:U75))'});

  /* 技能：**写到技能原本所在的格子**（parse 读卡时记下的 slot），
     所以模板里的技能顺序、本职★、初始/职业/兴趣 分栏都保持原样；
     成功率 / 困难 / 极难 只更新显示值，模板里的 SUM、INT 公式原样留着。
     左半：F 名称 R 成功率 T 困难 V 极难 J 初始 L 成长 N 职业 P 兴趣
     右半：AB 名称 AN 成功率 AP 困难 AR 极难 AF 初始 AH 成长 AJ 职业 AL 兴趣 */
  var sk=a.skills||[];
  var tplSkillAt={}, tplSkillByName={};
  for(var tr0=16;tr0<=49;tr0++){
    ['F','AB'].forEach(function(col){
      var nm0=tplCell(tr0,col);
      if(!nm0) return;
      tplSkillAt[tr0+'|'+col]=nm0;
      if(tplSkillByName[nm0]===undefined) tplSkillByName[nm0]={r:tr0,c:col};
    });
  }
  var usedSlot={}, placed=[];
  sk.forEach(function(s){
    var key=null;
    if(s.slot && s.slot.r>=16 && s.slot.r<=49 && (s.slot.c==='F'||s.slot.c==='AB')){
      var k1=s.slot.r+'|'+s.slot.c; if(!usedSlot[k1]) key=k1;
    }
    if(!key){
      var byName=tplSkillByName[String((s&&s.name)||'').trim()];
      if(byName){ var k2=byName.r+'|'+byName.c; if(!usedSlot[k2]) key=k2; }
    }
    if(key) usedSlot[key]=1;
    placed.push({s:s,key:key});
  });
  var freeSlots=[];
  for(var fr0=16;fr0<=49;fr0++) ['F','AB'].forEach(function(col){ var k=fr0+'|'+col; if(!usedSlot[k]) freeSlots.push(k); });
  placed.forEach(function(pp){ if(!pp.key) pp.key=freeSlots.shift(); });
  placed.forEach(function(pp){
    if(!pp.key) return;
    var parts=pp.key.split('|'), row=+parts[0], col=parts[1], s=pp.s||{};
    var G=(col==='F')?{n:'F',t:'R',b:'J',gr:'L',o:'N',i:'P',hard:'T',ex:'V',mk:'B',oc:'D'}
                      :{n:'AB',t:'AN',b:'AF',gr:'AH',o:'AJ',i:'AL',hard:'AP',ex:'AR',mk:'X',oc:'Z'};
    /* 技能名：卡上左半是 F:G + H:I 两段（「格斗：」+「斗殴」），导入时拼成整名，
       导出去要分段写回，不然会出现「格斗：斗殴 斗殴」这种重复。 */
    var nmFull=String(s.name==null?'':s.name);
    var tplName=String(tplSkillAt[pp.key]||'');
    /* 技能名在卡上是两格：左半「类别」F + 「具体名」H（格斗：/斗殴），
       右半「类别」AB + 「具体名」AD（驾驶：/摩托）。两半都要分段写回，
       不然自定义子技能（技艺①、驾驶：摩托…）会被整段塞进类别格里，卡里的公式就对不上了。 */
    var nm2Col=(col==='F')?'H':'AD';
    var tplName2=String(tplCell(row,nm2Col)||'');
    var nm1=nmFull, nm2='', nmSplit=false;
    if(tplName && nmFull!==tplName && nmFull.indexOf(tplName)===0){          // 模板那格是「格斗：」，我们叫「格斗：斗殴」
      nm1=tplName; nm2=nmFull.slice(tplName.length).replace(/^[\s：:]+/,'').trim(); nmSplit=true;
    } else if(s.name2 && String(s.name2)!==''){                              // 导入时就分好的两段
      nm2=String(s.name2); nm1=(s.name1!=null&&String(s.name1)!=='')?String(s.name1):nmFull; nmSplit=true;
    }
    if(tplName!==nm1) S(G.n+row, nm1);
    if(nmSplit && tplName2!==nm2) S(nm2Col+row, nm2);
    var total=num(s.total);
    var b=(s.base!=null && s.base!=='')?num(s.base):skillBaseOf(s.name);
    if(b!=null && num(tplCell(row,G.b))!==b) N(G.b+row, b);
    if(s.occPts!=null && num(tplCell(row,G.o))!==num(s.occPts)) N(G.o+row, num(s.occPts));
    if(s.intPts!=null && num(tplCell(row,G.i))!==num(s.intPts)) N(G.i+row, num(s.intPts));
    var gr=cardSkillGrowth(a,s,b);
    if(gr) N(G.gr+row, gr); else if(tplCell(row,G.gr)!=='') S(G.gr+row,'');
    /* 成功标（☐/☑）和本职（★/0）照抄原卡：公式（本职★查表）保留，只换显示值 */
    if(s.mark!=null && String(s.mark)!=='') { if(tplCell(row,G.mk)!==String(s.mark)) S(G.mk+row, String(s.mark)); }
    /* 本职★列：模板是 `IF(ISTEXT(VLOOKUP(...)),"★",INDEX(本职技能!…,MATCH(名称…),MATCH($M$5…)))`。
       名称不在「本职技能」表里、或职业序号在表头里找不到，重算就整格 #N/A（用户踩过）。
       两者都成立才保留公式（能自己更新），否则写死原卡的显示值。 */
    var occVal=(s.occ==null?'':String(s.occ));
    /* 公式 `MATCH(名称, 本职技能!A2:A74)` 只要名字在表里就算得出来；职业序号那半边已经保证不会写坏。
       名字不在表里（自制技能等）才会 #N/A —— 那种就写死原卡的显示值。 */
    var nameKnown=((tplRows&&tplRows.__skillList)||[]).indexOf(nm1)>=0;
    if(nameKnown) W.push({ref:G.oc+row,val:occVal,num:false,keepF:true});
    else W.push({ref:G.oc+row,val:occVal,num:false});
    W2(G.t+row, total, true);
    W2(G.hard+row, Math.floor(total/2), true);
    W2(G.ex+row, Math.floor(total/5), true);
  });

  /* 武器：行 53..60。
     模板里 54 行以后是“选类型自动算”的公式（VLOOKUP 武器列表），53 行是写死的默认行。
     用户要的是：导出后在 Excel 里跟原卡一样 —— 改类型会重算伤害/射程/贯穿/次数/装弹量/故障值，
     改技能数值会重算成功率。所以：
       · 类型能在「武器列表」里查到 → 保留（没有就补上）模板同款 VLOOKUP 公式，显示值用表格里那份；
       · 查不到类型（自制武器）→ 写死卡上的数据，绝不留会算成 #N/A / #### 的公式；
       · 成功率 Q 用“按 M 里的使用技能去本卡技能表查”的公式（查不到就空，不再出现乱码）；
       · 困难/极难用模板的 IF(Q="","",INT(Q/2|5))（53 行模板是裸 INT，我们补上空值保护）。 */
  /* 武器表的引用：4 张卡里叫「武器列表」或「武器列表 战斗」，带空格的名字要加单引号。 */
  var wlName=(tplRows&&tplRows.__weaponSheet)||'武器列表';
  var WLR=(/[^\w]/.test(wlName) ? "'"+wlName+"'" : wlName)+'!$B$2:$I$105';
  function tplF(r,c){ return (tplRows&&tplRows.__f&&tplRows.__f[c+r])||''; }
  function st(v){ return v==null?'':String(v).trim(); }
  var wlRows=((tplRows&&tplRows.__weaponList)||[]).slice(1);   // 第 1 行是表头
  function listOf(text){
    var cands=weaponTypeCandidates(text), hit=null;
    for(var ci=0;ci<cands.length && !hit;ci++) hit=weaponTypeFind(wlRows, cands[ci], function(row){ return (row||[])[1]; });
    if(!hit) return null;
    return {type:st(hit[1]),skill:st(hit[2]),damage:st(hit[3]),range:st(hit[4]),
            pierce:st(hit[5]),attacks:st(hit[6]),ammo:st(hit[7]),jam:st(hit[8])};
  }
  function wV(field){ return 'IF($G'+r+'=0,"",VLOOKUP($G'+r+','+WLR+','+field+',FALSE))'; }
  function wM(){ return 'IF($G'+r+'=0,"←请选择类型",VLOOKUP($G'+r+','+WLR+',2,FALSE))'; }
  function wQ(){
    return 'IF($M'+r+'="","",IFERROR(INDEX($R$16:$R$49,MATCH($M'+r+',$H$16:$H$49,0)),'
         +   'IFERROR(INDEX($R$16:$R$49,MATCH($M'+r+',$F$16:$F$49,0)),'
         +   'IFERROR(INDEX($AN$16:$AN$49,MATCH($M'+r+',$AB$16:$AB$49,0)),""))))';
  }
  /* 该格模板本来就有“带空值保护”的公式 → 原样抄回（共享公式组也一起，别拆散）；
     否则写我们自己的同款公式。 */
  function putF(ref,val,num,keep,formula){
    var rec={ref:ref,val:(val==null?'':val),num:!!num};
    if(keep && /^IF\(/i.test(tplF(+ref.replace(/\D/g,''),ref.replace(/\d/g,'')).trim())) rec.keepF=true;
    else if(formula) rec.formula=formula;
    W.push(rec);
  }
  var wa=a.weapons||[];
  var wSlots=(tplRows && tplRows.__weaponRows) || 8;   // 卡上实际留了几行武器（见 cardWeaponSlotRows）
  if(wa.length>wSlots) W.wpnDropped=wa.length-wSlots;  // 多出来的没法写（卡里就这么几行），导出时提醒一声
  for(var wi=0;wi<wSlots;wi++){
    var r=53+wi, w=wa[wi];
    var wtype=w?String(w.type==null?'':w.type).trim():'';
    var list=w?listOf(wtype):null;
    /* 类型对不上卡里的「武器列表」（预置武器的分组名如「近战小刀」、玩家自己起的名字）时，
       再拿**武器名称**碰一次：预置武器多半直接用了表里的名字（大型刀具(甘蔗刀等)），
       能对上就把类型归一成表里的真名字 —— 这样新加的武器在卡里照样“选类型自动算”。 */
    if(w && !list){
      var byName=listOf(w.name);
      if(byName){ list=byName; wtype=byName.type; }
    }
    if(w){
      var wsk=String(w.skill==null?'':w.skill).trim();
      var tot=wsk?cardSkillTotalFor(a,wsk):'';
      var totNum=(tot===''||tot==null)?null:Math.round(num(tot));
      S('B'+r,w.name);
      S('G'+r,wtype);
      /* 使用技能：模板公式算出来正好就是这把武器的技能（且逐字相同）时才留公式，
         这样在 Excel 里改类型 → 使用技能 → 成功率 会一起跟着变；
         不一致（玩家自己改过技能，比如佩剑用斗殴而不是「剑」）就写死玩家的，别把它改坏。 */
      /* keep 一定要给 false：模板第 56 行的公式是 IF(OR(M55="←请选择类型",M55=""),"",…)
         —— 它看**上一行**，上面那格空着（比如上一把武器没填使用技能）就整格算成 ""，
         接着 成功率 Q 也会跟着变空。这里一律换成我们自己的同行公式（行为跟 54/55 行模板一致）。 */
      if(wsk && list && list.skill===wsk) putF('M'+r, wsk, false, false, wM());
      else S('M'+r,wsk);
      /* 伤害 / 射程 / 贯穿 / 次数 / 装弹量 / 故障值（武器列表第 3..8 列） */
      [['W',3,'damage'],['AA',4,'range'],['AC',5,'pierce'],['AE',6,'attacks'],['AG',7,'ammo'],['AJ',8,'jam']].forEach(function(t){
        var col=t[0], idx=t[1], key=t[2];
        var own=(key==='ammo' && num(w.ammoCap)>0) ? String(num(w.ammoCap)) : (w[key]==null?'':String(w[key]));
        if(list){
          var shown=(list[key]!==''?(list[key]):own);          // 留公式时，显示值就用公式会算出来的那份
          putF(col+r, shown, false, true, wV(idx));
        } else S(col+r, own);
      });
      /* 成功率：按使用技能在本卡技能表里查（左半 H→F，右半 AB），改技能数值自动跟着变。
         使用技能不在本卡技能表里时（如「鞭子」这种武器表里的技能），保留卡上原有的查表公式、
         只把原卡的数值写进去当显示值 —— 这样在 Excel 里换「类型」它照样会重算，不留空、不报错。 */
      var succ=(totNum!==null) ? totNum : (num(w.success)>0 ? Math.round(num(w.success)) : null);
      if(totNum!==null){
        putF('Q'+r, succ, true, false, wQ());
      } else if(succ!==null){
        if(tplF(r,'Q')) W.push({ref:'Q'+r,val:succ,num:true,keepF:true});
        else N('Q'+r, succ);
      } else {
        putF('Q'+r, '', false, false, wQ());
      }
      putF('S'+r, succ===null?'':Math.floor(succ/2), succ!==null, true, 'IF($Q'+r+'="","",INT($Q'+r+'/2))');
      putF('U'+r, succ===null?'':Math.floor(succ/5), succ!==null, true, 'IF($Q'+r+'="","",INT($Q'+r+'/5))');
    } else {
      /* 空槽：名字/类型清掉，但**保留模板的公式**（只把显示值清空）——
         以后直接在 Excel 里选个类型，伤害那些还是会自动出来。 */
      S('B'+r,''); S('G'+r,'');
      ['M','W','AA','AC','AE','AG','AJ'].forEach(function(col){
        if(tplF(r,col)) W.push({ref:col+r,val:tplCell(r,col),num:false,keepF:true}); else S(col+r,'');
      });
      putF('Q'+r,'',false,false,wQ());
      putF('S'+r,'',false,true,'IF($Q'+r+'="","",INT($Q'+r+'/2))');
      putF('U'+r,'',false,true,'IF($Q'+r+'="","",INT($Q'+r+'/5))');
    }
  }

  /* 法术一览：行 113 表头，数据行 114..118（编号 / 法术名称 / 使用代价 / 作用） */
  var spl=a.spells||[];
  for(var pi2=0;pi2<5;pi2++){
    var pr=114+pi2, spy=spl[pi2];
    if(spy && String(spy.name||'').trim()){
      S('W'+pr, String(pi2+1));
      S('Y'+pr, spy.name);
      S('AC'+pr, cardSpellCost(spy));
      S('AH'+pr, spy.effect||'');
    } else { S('W'+pr,''); S('Y'+pr,''); S('AC'+pr,''); S('AH'+pr,''); }
  }

  /* 随身物品：行 79..95（模板只记录名称）。
     先写背包，再把**还有剩余的剧情道具**接在后面，数量和效果用括号标注。
     「背包格」列（原卡右侧那列）和左边「物品名称」列在工具里是同一条清单，
     导出时按“导入时它在哪一列”自动分回原处；左边放不下的自动溢到背包格列。 */
  var invAll=(a.inv||[]).filter(function(it){return it&&it.name;});
  var slotText=function(it){ return (it.qty>1? (it.name+' ×'+it.qty) : it.name); };
  var leftFromInv=invAll.filter(function(it){return it.slot!=='bag';}).map(slotText);  // 原本在「物品名称」列
  var bagFromInv=invAll.filter(function(it){return it.slot==='bag';}).map(slotText);   // 原本在「背包格」列
  var plotList=(a.plot||[]).filter(function(p){ return p && p.name && num(p.qty)>0; }).map(function(p){
    var parts=[];
    if(p.effect) parts.push(cardPlotEffectText(p));
    else if(p.note) parts.push(String(p.note));
    if(p.effect && p.note) parts.push(String(p.note));
    return String(p.name)+'（×'+num(p.qty)+(parts.length?('；'+parts.join('；')):'')+'）';
  });
  var INV_LEFT_ROWS=17;                                    // 模板：行 79..95
  var leftAll=leftFromInv.concat(plotList);
  var leftList=leftAll.slice(0,INV_LEFT_ROWS);
  var spilled=leftAll.slice(INV_LEFT_ROWS);                // 左边装不下的，改写到「背包格」列
  for(var ii=0;ii<INV_LEFT_ROWS;ii++){
    var ir=79+ii;
    if(leftList[ii]) S('F'+ir, leftList[ii]);
    else S('F'+ir,'');
  }
  /* 「背包格」列（模板表头 78 行写着“背包格↓”，合并 N:U）：整列自由文本，按行原样写回。
     表头位置按内容找，模板换列了也跟着走。 */
  var bagCol=null;
  for(var bh=0;bh<40;bh++){
    var bl=XLSX.utils.encode_col(bh);
    if(String(tplCell(78,bl)||'').indexOf('背包格')>=0){ bagCol=bl; break; }
  }
  if(bagCol){
    var bagLines=(bagFromInv||[]).concat(spilled).concat(a.bag||[]).map(function(x){return String(x==null?'':x).replace(/\s+/g,' ').trim();}).filter(Boolean);
    for(var bg=0;bg<15;bg++) S(bagCol+(79+bg), bagLines[bg]||'');
  }

  /* 背景故事小节：标签行通过模板动态定位（内容写在 AA 列） */
  var labelRow={}, lastLabel=0;
  for(var lr=58;lr<=84;lr++){
    var txt=tplCell(lr,'W'); if(!txt) continue;
    for(var qi=0;qi<CARD_SECTION_MATCH.length;qi++){
      var key=CARD_SECTION_MATCH[qi][0], keys=CARD_SECTION_MATCH[qi][1];
      if(labelRow[key]!==undefined) continue;
      for(var kj=0;kj<keys.length;kj++){
        if(txt.indexOf(keys[kj])>=0){ labelRow[key]=lr; if(lr>lastLabel) lastLabel=lr; break; }
      }
    }
  }
  var hist=a.history||{};
  ['appearance','beliefs','people','places','belongings','traits','secrets','scars','phobias'].forEach(function(k){
    var row=labelRow[k]; if(!row) return;
    S('AA'+row, hist[k]||'');
  });

  /* 背景故事正文：最后一个标签下方的大框 */
  var storyRef=null, wCol=XLSX.utils.decode_col('W');
  var merges=(tplRows&&tplRows.__merges)||[];
  merges.forEach(function(m){
    if(m.s.c!==wCol) return;
    if((m.s.r+1)<(lastLabel+2)) return;
    var span=m.e.r-m.s.r;
    if(!storyRef||span>storyRef.span) storyRef={span:span,ref:XLSX.utils.encode_cell(m.s)};
  });
  /* 这 4 张卡里没有「难言之隐」这一行（只有 8 条小节、背景大框从 W77 开始）：
     那种卡就把难言之隐并进背景故事正文，别让内容凭空消失。 */
  var storyText=String(a.backstory||'');
  if(hist.secrets && !labelRow.secrets) storyText=(storyText?storyText+'\n':'')+'【难言之隐】'+hist.secrets;
  if(storyRef) S(storyRef.ref, storyText);

  return W;
}
/* 用模板字节 + 角色数据生成导出用的 xlsx 字节 */
function buildCardXlsx(a, tplBytes){
  if(!window.XLSX || !XLSX.CFB) throw new Error('表格库不可用');
  if(typeof migrateBagToInv==='function') migrateBagToInv(a);
  var bytes=(tplBytes instanceof Uint8Array)?tplBytes:new Uint8Array(tplBytes);
  var cfb=XLSX.CFB.read(bytes,{type:'array'});

  var sheetPath='xl/worksheets/sheet1.xml';
  var wbXml=cardCfbText(cfb,'xl/workbook.xml');
  var mm=wbXml.match(/<sheet[^>]*name="人物卡"[^>]*r:id="([^"]+)"/);
  if(!mm) mm=wbXml.match(/<sheet[^>]*r:id="([^"]+)"[^>]*name="人物卡"/);
  if(mm){
    var rels=cardCfbText(cfb,'xl/_rels/workbook.xml.rels');
    var rm=rels.match(new RegExp('<Relationship[^>]*Id="'+mm[1]+'"[^>]*Target="([^"]+)"'));
    if(!rm) rm=rels.match(new RegExp('<Relationship[^>]*Target="([^"]+)"[^>]*Id="'+mm[1]+'"'));
    if(rm){ var t=rm[1].replace(/^\/?xl\//,'').replace(/^\.\//,''); sheetPath='xl/'+t; }
  }
  var si=cardCfbIndex(cfb,sheetPath);
  if(si<0) throw new Error('模板里找不到「人物卡」工作表');
  var xml=cardDecodeBytes(new Uint8Array(cfb.FileIndex[si].content));

  var tplWb=XLSX.read(bytes,{type:'array'});
  var tplWs=tplWb.Sheets['人物卡']||tplWb.Sheets[tplWb.SheetNames[0]];
  var tplRows=XLSX.utils.sheet_to_json(tplWs,{header:1,raw:true,defval:null});
  tplRows.__merges=tplWs['!merges']||[];
  tplRows.__weaponRows=cardWeaponSlotRows(tplWs);
  if(tplWb.Sheets['职业列表']){
    tplRows.__occList=XLSX.utils.sheet_to_json(tplWb.Sheets['职业列表'],{header:1,raw:true,defval:null});
  }
  var wlHit=(typeof cocWeaponSheet==='function') ? cocWeaponSheet(tplWb) : (tplWb.Sheets['武器列表']?{name:'武器列表',ws:tplWb.Sheets['武器列表']}:null);
  if(wlHit){                                           // 「选类型自动算」靠这张表（类型→技能/伤害/射程/贯穿/每轮/装弹量/故障值）
    tplRows.__weaponSheet=wlHit.name;
    tplRows.__weaponList=XLSX.utils.sheet_to_json(wlHit.ws,{header:1,raw:true,defval:null});
  }
  tplRows.__f={};                                      // 模板原有的公式（决定哪些格子能“保留公式只换显示值”）
  Object.keys(tplWs).forEach(function(k){ var c=tplWs[k]; if(c && c.f) tplRows.__f[k]=String(c.f); });
  if(tplWb.Sheets['本职技能']){                       // 本职★ 那列公式能不能算，取决于这两行
    var occRows=XLSX.utils.sheet_to_json(tplWb.Sheets['本职技能'],{header:1,raw:true,defval:null});
    tplRows.__occHead=occRows[0]||[];                 // 第 1 行：职业序号
    tplRows.__skillList=[];                           // A2:A74：技能名
    for(var sr=1;sr<occRows.length;sr++){ var sv=(occRows[sr]||[])[0]; if(sv!=null&&String(sv).trim()!=='') tplRows.__skillList.push(String(sv).trim()); }
  }

  var writes=cardWritesFor(a,tplRows);
  var wpnDropped=writes.wpnDropped||0;
  var miss=0;
  writes.forEach(function(w){
    var r=cardSetCell(xml,w.ref,w.val,w.num,w.keepF,w.formula);
    xml=r.xml; if(r.miss) miss++;
  });

  /* 调查员经历：从模板里第一个空行开始写（跳过“例：…”），其余清空 */
  var campStart=98;
  for(var cr=98;cr<=112;cr++){
    var nm=(tplRows[cr-1]||[])[XLSX.utils.decode_col('B')];
    nm=nm==null?'':String(nm).trim();
    if(!nm||/^例[:：]/.test(nm)){ campStart=cr; break; }
  }
  var camps=(a.campaigns||[]).slice(0,112-campStart+1);
  var truncated=((a.campaigns||[]).length>camps.length);
  for(var ci=0;ci<=(112-campStart);ci++){
    var rr=campStart+ci, c=camps[ci];
    var r1=cardSetCell(xml,'B'+rr,c?c.module:'',false); xml=r1.xml; if(r1.miss) miss++;
    var r2=cardSetCell(xml,'J'+rr,c?c.note:'',false); xml=r2.xml; if(r2.miss) miss++;
  }

  cfb.FileIndex[si].content=cardEncodeText(xml);

  /* 模板里不少格子是公式（本职★ 查表、成功率 SUM、困难/极难 INT…）。
     为了让这些公式在任何表格软件里都立刻显示正确结果，让它在打开时重算一次。 */
  try{
    var wi=cardCfbIndex(cfb,'xl/workbook.xml');
    if(wi>=0){
      var wx=cardDecodeBytes(new Uint8Array(cfb.FileIndex[wi].content));
      if(/<calcPr[^>]*\/>/.test(wx)) wx=wx.replace(/<calcPr[^>]*\/>/,function(t){ return t.replace(/\/>$/,' fullCalcOnLoad="1"/>'); });
      else if(!/fullCalcOnLoad/.test(wx)) wx=wx.replace('</workbook>','<calcPr fullCalcOnLoad="1"/></workbook>');
      cfb.FileIndex[wi].content=cardEncodeText(wx);
    }
  }catch(e){ /* 加不上也不影响导出 */ }

  /* 我们把手填/公式格换成了静态值，calcChain 里还记着旧公式，留着会让 Excel 提示“需要修复”；
     直接把 calcChain 删掉（它是可选的，Excel 打开后会自己重建），并从 rels 与 Content_Types 里去掉引用。 */
  try{
    if(XLSX.CFB.utils && typeof XLSX.CFB.utils.cfb_del==='function') XLSX.CFB.utils.cfb_del(cfb,'/xl/calcChain.xml');
    var relsPath='xl/_rels/workbook.xml.rels', ri=cardCfbIndex(cfb,relsPath);
    if(ri>=0){
      var rt=cardDecodeBytes(new Uint8Array(cfb.FileIndex[ri].content)).replace(/<Relationship[^>]*calcChain\.xml[^>]*\/>/g,'');
      cfb.FileIndex[ri].content=cardEncodeText(rt);
    }
    var ci=cardCfbIndex(cfb,'[Content_Types].xml');
    if(ci>=0){
      var ct=cardDecodeBytes(new Uint8Array(cfb.FileIndex[ci].content)).replace(/<Override[^>]*calcChain\.xml[^>]*\/>/g,'');
      cfb.FileIndex[ci].content=cardEncodeText(ct);
    }
  }catch(e){ /* 删不掉也不影响导出，最多是 Excel 提示一次修复 */ }

  var out=XLSX.CFB.write(cfb,{type:'array',fileType:'zip',compression:true});
  return {bytes:(out instanceof ArrayBuffer)?new Uint8Array(out):out, miss:miss, truncated:truncated, campStart:campStart, wpnDropped:wpnDropped};
}
function downloadCardBytes(fname,bytes){
  var blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },800);
}
function safeFileName(s){
  return String(s==null?'':s).replace(/[\\/:*?"<>|\r\n\t]+/g,'_').replace(/^[.\s]+|[.\s]+$/g,'').slice(0,80)||'未命名';
}
/* 导出入口：先写入“调查员经历”，再把整张卡填进空白模板下载 */
function exportActorCard(id){
  var a=actorById(id); if(!a){ toast('找不到该调查员'); return; }
  if(typeof migrateBagToInv==='function') migrateBagToInv(a);
  if(typeof XLSX==='undefined'){ ensureXLSX(function(){ exportActorCard(id); }); return; }
  if(!XLSX.CFB){ toast('表格库缺少 zip 支持，无法生成卡片'); return; }
  var camp=campaignName()||'未命名团';
  a.campaigns=Array.isArray(a.campaigns)?a.campaigns:[];
  var diff=diffActorSinceImport(a);
  var lastCamp=a.campaigns[a.campaigns.length-1];
  if(lastCamp && String(lastCamp.module||'')===camp) lastCamp.note=diff;   // 同一个团再导出：覆盖那行，不再累加
  else a.campaigns.push({module:camp,note:diff});
  /* 注意：对比基准始终是“最初导入/最初建立”的快照，导出后不重置，所以多次编辑都能一起算进去 */
  saveState();
  ensureBlankCard(function(bytes){
    try{
      var res=buildCardXlsx(a,bytes);
      downloadCardBytes(safeFileName(camp)+'-'+safeFileName(a.name||'调查员')+'.xlsx', res.bytes);
      try{ renderSurveyors(); }catch(e){}
      var tip='已导出「'+camp+'-'+(a.name||'调查员')+'」并把数据变化写进调查员经历';
      if(res.truncated) tip+='（经历超出卡片行数，较早的记录未写入）';
      if(res.wpnDropped) tip+='（武器比卡上的格子多，最后 '+res.wpnDropped+' 件没写进卡里）';
      toast(tip,5000);
    }catch(e){
      console.error(e);
      toast('导出失败：'+e.message,6000);
    }
  }, cocCardOf(a).id);
}
