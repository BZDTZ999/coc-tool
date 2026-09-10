/* ================= 带团妙妙小工具 · COC ================= */
'use strict';
var LS_KEY = 'coc-tool-v1';
var XLSX_OK = typeof XLSX !== 'undefined';

/* 在线多文件版：表格解析库 xlsx 不在首屏内嵌，第一次读人物卡时才从 CDN 懒加载。
   离线单文件版里 XLSX 已内嵌，这里永远直接回调，不影响原行为。 */
var __XLSX_CDNS = [
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
];
function ensureXLSX(cb){
  if (typeof XLSX !== 'undefined'){ cb(); return; }
  if (window.__xlsxLoading){ (window.__xlsxQueue = window.__xlsxQueue || []).push(cb); return; }
  window.__xlsxLoading = true;
  window.__xlsxQueue = [cb];
  function load(i){
    if (i >= __XLSX_CDNS.length){
      window.__xlsxLoading = false;
      window.__xlsxQueue = [];
      toast('⚠ 在线表格解析库加载失败，请检查网络后重试（本地用请双击 offline.html）', 5000);
      return;
    }
    var s = document.createElement('script');
    s.src = __XLSX_CDNS[i];
    s.onload = function(){
      window.__xlsxLoading = false;
      var q = window.__xlsxQueue || [];
      window.__xlsxQueue = [];
      q.forEach(function(f){ try{ f(); }catch(e){ toast('解析失败：' + e.message, 5000); } });
    };
    s.onerror = function(){ s.parentNode && s.parentNode.removeChild(s); load(i + 1); };
    document.head.appendChild(s);
  }
  load(0);
}

/* ---------- 基础工具 ---------- */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function uid(p){ return (p||'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function num(s){ var n = parseFloat(s); return isFinite(n)?n:0; }
function pad2(n){ return (n<10?'0':'')+n; }
function fmtDur(h){ // h 小时 -> 易读
  if (h < 0.0166) return Math.max(1, Math.round(h*3600)) + '秒';
  if (h < 1) return Math.round(h*60) + '分钟';
  var hh = Math.floor(h), mm = Math.round((h-hh)*60);
  if (mm === 60){ hh++; mm = 0; }
  return (hh? hh+'小时':'') + (mm? mm+'分':'');
}
function fmtClock(h){ // 出发后偏移(小时)
  var t = state.clockStart + h*3600*1000;
  var d = new Date(t);
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function nowStamp(){ var d=new Date(); return pad2(d.getHours())+':'+pad2(d.getMinutes())+':'+pad2(d.getSeconds()); }

var toastTimer=null;
function toast(msg, ms){
  var el=$('status'); if(!el) return;
  el.textContent=msg; el.style.display='block';
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ el.style.display='none'; }, ms||2600);
}
function confirmBox(msg){ return window.confirm(msg); }

/* ---------- 骰子 ---------- */
function rollDie(sides){ return 1 + Math.floor(Math.random()*sides); }
// 支持 '1D6+2'、'1D3+DB'、'+1D4' 等（DB 已在调用方替换为数字或骰式）
function rollExpr(expr){
  expr = String(expr==null?'':expr).toUpperCase().replace(/[×Xx]/g,'');
  var dice=[], total=0, last=0, re=/([+-]?)(\d*)D(\d+)/g, m;
  var tail=[];
  while((m=re.exec(expr))!==null){
    var between=expr.slice(last, m.index).trim();
    if(between){ var s=parseFloat(between.replace(/\s/g,'')); if(isFinite(s)){total+=s; tail.push(between.replace(/\s/g,''));} }
    var sign=(m[1]==='-')?-1:1;
    var cnt=parseInt(m[2]||'1',10)||1, sides=parseInt(m[3],10)||6, t=0, vals=[];
    for(var i=0;i<cnt;i++){ var v=rollDie(sides); vals.push(v); t+=v; }
    total += sign*t;
    dice.push((sign<0?'-':'+')+cnt+'D'+sides+'['+vals.join(',')+']');
    last=re.lastIndex;
  }
  var rest=expr.slice(last).trim();
  if(rest){ var s2=parseFloat(rest.replace(/\+/g,'')); if(isFinite(s2)){ total+=s2; tail.push(rest.replace(/\s/g,'')); } }
  return { total: total, dice: dice, tail: tail };
}
function rollPct(){
  var r = rollDie(100);
  return { raw: r, luck: r<=5?1:(r>=96?2:0), pct:r }; // luck 1=大成功 2=大失败(近似: 96-100)
}
function judgePct(roll, skill){
  if (roll===1) return '大成功/极限成功';
  var extreme=Math.floor(skill/5), hard=Math.floor(skill/2);
  if (roll<=skill) return (roll<=extreme?'极难成功':(roll<=hard?'困难成功':'普通成功'));
  if (roll===100 || roll>=96) return '大失败';
  return '失败';
}
function logRoll(txt, cls){
  var log=$('diceLog'); if(!log) return;
  var d=document.createElement('div');
  d.className='l '+(cls||'info');
  d.textContent='['+nowStamp()+'] '+txt;
  log.prepend(d);
  while(log.children.length>220) log.removeChild(log.lastChild);
}

/* ---------- 派生计算 ---------- */
function attrSum(attrs){ return (attrs.str||0)+(attrs.con||0)+(attrs.pow||0)+(attrs.dex||0)+(attrs.app||0)+(attrs.siz||0)+(attrs.int||0)+(attrs.edu||0)+(attrs.luck||0); }
function hpMaxOf(a){ var m=a.hp&&a.hp.max; if(m) return m; return Math.max(0, Math.floor(((a.attrs.con||0)+(a.attrs.siz||0))/10)); }
function mpMaxOf(a){ var m=a.mp&&a.mp.max; if(m) return m; return Math.max(0, Math.floor((a.attrs.pow||0)/5)); }
function sanMaxOf(a){ var m=a.san&&a.san.max; if(m&&m>0) return m; return 99; }
function dbTextOf(attrs){ var s=(attrs.str||0)+(attrs.siz||0); if(s<=64)return '-2'; if(s<=84)return '-1'; if(s<=124)return '0'; if(s<=164)return '+1D4'; return '+1D6'; }
function dbNum(db){ // 数值化 DB（伤害乘区加减）
  var t=dbTextOf({str:40,siz:40});
  var m=String(db||'0').match(/[+-]?\d+(\.\d+)?/);
  return m?parseFloat(m[0]):0;
}
function dbDice(db){ var s=String(db||''); return /D/i.test(s) ? s.replace(/\+/,'') : ''; }
function halfDbText(db){ // DB 的半值文本：数值减半；骰子把面数减半（1D4->1D2 …）
  var t=String(db==null?'0':db).replace(/\s+/g,'');
  var neg=/^-/.test(t);
  t=t.replace(/^[+-]/,'');
  var m=t.match(/^(\d*)D(\d+)$/i);
  if(m){
    var cnt=parseInt(m[1]||'1',10)||1;
    var sides=Math.max(2,Math.round((parseInt(m[2],10)||4)/2));
    return (neg?'-':'+')+cnt+'D'+sides;
  }
  var n=Math.floor(Math.abs(parseFloat(t)||0)/2);
  if(n===0) return '+0';
  return (neg||parseFloat(t)<0?'-':'+')+n;
}
function applyDbToDamageExpr(expr, db){
  var s=String(expr||'1D3').toUpperCase().replace(/\s+/g,'');
  var dbt=String(db||'0').replace(/\s+/g,'');
  if (s.indexOf('DB')<0) return s;
  var rep = dbt.replace(/\+/g,'');       // '+1D4'->'1D4'  '-2'->'-2'
  if (/^[+-]/.test(rep)===false) rep='+'+rep;
  var full=rep==='+0'||rep==='0'?'+0':rep;
  if(s.indexOf('半DB')>=0){
    var half=halfDbText(dbt);
    return s.replace(/半DB/g, half).replace(/DB/g,'');
  }
  return s.replace(/DB/g, full);
}
function movOf(a){ return a.mov || a.speed || 8; }

/* 武器「类型 / 名称」归一化：全角括号、顿号、间隔号、空格都抹平再比。
   卡上写「中型剑（佩剑、重剑）」，预设里可能写成「中型剑(佩剑、重剑)」——同一个东西，得能对上。 */
function weaponTypeKey(s){
  return String(s==null?'':s)
    .replace(/[\s　]+/g,'')
    .replace(/（/g,'(').replace(/）/g,')')
    .replace(/[，、]/g,',')
    .replace(/[·・･]/g,'')
    .replace(/[—–－ー]/g,'-')
    .toLowerCase();
}
/* 在一张「类型 → 资料」清单里找类型：先逐字相等 → 再归一化相等 → 最后才靠互相包含兜底
   （包含式匹配只在唯一命中时才算，免得「小型刀具」撞上「大型刀具」）。 */
function weaponTypeFind(list, given, nameOf){
  list=list||[]; nameOf=nameOf||function(x){ return x; };
  var key=String(given==null?'':given).trim(); if(!key) return null;
  var i, name;
  for(i=0;i<list.length;i++){ if(String(nameOf(list[i])==null?'':nameOf(list[i])).trim()===key) return list[i]; }
  var kk=weaponTypeKey(key);
  for(i=0;i<list.length;i++){ if(weaponTypeKey(nameOf(list[i]))===kk) return list[i]; }
  var loose=null, hits=0;
  for(i=0;i<list.length;i++){
    name=weaponTypeKey(nameOf(list[i]));
    if(!name) continue;
    if(name.indexOf(kk)>=0 || kk.indexOf(name)>=0){ hits++; if(!loose || name.length>weaponTypeKey(nameOf(loose)).length) loose=list[i]; }
  }
  return hits===1?loose:null;
}
/* 找类型时按顺序尝试的写法：原样 → 预置别名表里的正式名。 */
function weaponTypeCandidates(given){
  var out=[given];
  try{
    if(typeof PRESET_WEAPON_TYPE_ALIAS!=='undefined' && PRESET_WEAPON_TYPE_ALIAS){
      var hit=PRESET_WEAPON_TYPE_ALIAS[String(given==null?'':given).trim()];
      if(hit) out.push(hit);
    }
  }catch(e){ /* 别名表没加载也不影响 */ }
  return out;
}

/* ---------- 高清画布（Retina / 高缩放屏） ----------
   画布按“CSS 尺寸 × 设备像素比”设置后备缓冲，逻辑坐标保持不变，
   这样地图/战斗场景里的图标与文字在 Retina 屏上不再被拉伸模糊。 */
function dprOf(){ return Math.max(1, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)); }
function hidpiCanvas(cv, logicalW, logicalH, cssW, cssH){
  if(!cv) return null;
  var dpr = dprOf();
  cssW = Math.max(1, Math.round(cssW || logicalW));
  cssH = Math.max(1, Math.round(cssH || logicalH));
  var cw = cssW + 'px', ch = cssH + 'px';
  if(cv.style.width !== cw) cv.style.width = cw;
  if(cv.style.height !== ch) cv.style.height = ch;
  var bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
  if(cv.width !== bw) cv.width = bw;
  if(cv.height !== bh) cv.height = bh;
  var g = cv.getContext('2d');
  g.setTransform(bw / logicalW, 0, 0, bh / logicalH, 0, 0);
  return g;
}
