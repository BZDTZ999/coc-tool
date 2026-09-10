/* ---------- 人物卡模板：本工具只适配这 4 张（读卡 / 写卡 / 下载都用它们） ----------
   每张卡都是完整的 .xlsx：人物卡（值框 W..Z + AA.. 填写区）、简化卡、职业列表、本职技能、
   武器列表 战斗、防具表 载具表、附表（属性雷达数据）…读写都按原卡的真实工作表来查表，
   所以「职业不同、本职技能不同、武器表不同」的卡都能各自算对。
   数据来源：离线单文件版内联成 base64（window.__COC_CARDS_B64）；
             在线多文件版按需 fetch（window.__COC_CARDS_URL）。 */
var COC_CARDS = [
  { id:'pink', name:'COC7空白卡23（粉）-坪改', short:'粉卡（坪改）',
    file:'assets/cards/pink.xlsx', dl:'COC7空白卡23（粉）-坪改.xlsx',
    desc:'常用主卡：值框 + 武器/技能自动计算齐全，职业列表带原版与《日本秘史》扩展。' },
  { id:'cy23', name:'COC7空白卡CY23Final', short:'CY23',
    file:'assets/cards/cy23.xlsx', dl:'COC7空白卡CY23Final.xlsx',
    desc:'与粉卡同源（打印版面更清爽），职业列表相同，适合直接打印。' },
  { id:'cy2lus', name:'COC7空白卡CY2lusFinal', short:'CY2lus',
    file:'assets/cards/cy2lus.xlsx', dl:'COC7空白卡CY2lusFinal.xlsx',
    desc:'多一张「建卡」表：先在建卡表掷骰，人物卡自动带出属性；其余与上面一致。' },
  { id:'cn', name:'中式职业扩展COC7空白卡1.6', short:'中式职业扩展',
    file:'assets/cards/cn.xlsx', dl:'中式职业扩展COC7空白卡1.6.xlsx',
    desc:'职业列表换成中式职业（更夫 / 镖师 / 教书先生 / 说书人 …），本职技能按这张表算，' +
         '读卡、导出、本职★ 都会走中式职业表。' }
];
var COC_CARD_DEFAULT = 'pink';

function cocCard(id){
  for (var i=0;i<COC_CARDS.length;i++) if (COC_CARDS[i].id===id) return COC_CARDS[i];
  return null;
}
function cocCardOf(actor){
  return cocCard(actor && actor.cardTpl) || cocCard(COC_CARD_DEFAULT) || COC_CARDS[0];
}
/* 导入时判断这张卡来自哪张模板：先看表结构，再看职业列表内容，最后看署名格子。 */
function cocCardDetect(wb){
  if (!wb || !wb.SheetNames || !wb.SheetNames.length) return '';
  function occHas(kw){
    var ws = wb.Sheets['职业列表']; if (!ws) return false;
    var rows=null;
    try { rows = XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null}); } catch(e){ return false; }
    for (var i=0;i<rows.length;i++){
      var v = rows[i] && rows[i][1];
      if (v!=null && String(v).indexOf(kw)>=0) return true;
    }
    return false;
  }
  if (wb.SheetNames.indexOf('建卡')>=0) return occHas('更夫') ? 'cn' : 'cy2lus';
  if (occHas('更夫') || occHas('采诗官') || occHas('牙侩')) return 'cn';
  var ws = wb.Sheets['人物卡'];
  var byline = ws && ws['D149'] && ws['D149'].v != null ? String(ws['D149'].v) : '';
  if (byline.indexOf('L坪')>=0) return 'pink';
  return 'cy23';
}
/* 取模板字节：离线版是内联 base64，在线版按需 fetch 一次后缓存。 */
function cocCardBytes(id, cb, onErr){
  id = cocCard(id) ? id : COC_CARD_DEFAULT;
  window.__cocCardBytes = window.__cocCardBytes || {};
  if (window.__cocCardBytes[id]){ cb(window.__cocCardBytes[id]); return; }
  var b64 = window.__COC_CARDS_B64 && window.__COC_CARDS_B64[id];
  if (b64){
    try { window.__cocCardBytes[id] = b64ToBytes(b64); }
    catch(e){ if (onErr) onErr(e); return; }
    cb(window.__cocCardBytes[id]); return;
  }
  var url = (window.__COC_CARDS_URL && window.__COC_CARDS_URL[id]) || cocCard(id).file;
  window.__cocCardQueue = window.__cocCardQueue || {};
  window.__cocCardQueue[id] = window.__cocCardQueue[id] || [];
  window.__cocCardQueue[id].push(cb);
  if (window.__cocCardLoading && window.__cocCardLoading[id]) return;
  window.__cocCardLoading = window.__cocCardLoading || {};
  window.__cocCardLoading[id] = true;
  fetch(url).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); })
    .then(function(buf){
      window.__cocCardBytes[id] = new Uint8Array(buf);
      window.__cocCardLoading[id] = false;
      var q = window.__cocCardQueue[id] || []; window.__cocCardQueue[id] = [];
      q.forEach(function(f){ try{ f(window.__cocCardBytes[id]); }catch(e){ if(onErr) onErr(e); } });
    })
    .catch(function(e){
      window.__cocCardLoading[id] = false; window.__cocCardQueue[id] = [];
      if (onErr) onErr(e);
      else toast('⚠ 读取人物卡模板失败：'+((e&&e.message)||e)+'（在线版需能访问 ' + url + '）',7000);
    });
}
/* 空白卡下载：离线版用 data:（双击也能下），在线版直接给仓库里的文件路径。 */
function cocCardDownloadHref(id){
  var c = cocCard(id) || cocCard(COC_CARD_DEFAULT);
  var b64 = window.__COC_CARDS_B64 && window.__COC_CARDS_B64[c.id];
  if (b64) return 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,'+b64;
  var url = (window.__COC_CARDS_URL && window.__COC_CARDS_URL[c.id]) || c.file;
  return url;
}
function cocCardDownloadName(id){
  var c = cocCard(id) || cocCard(COC_CARD_DEFAULT);
  return c.dl;
}
