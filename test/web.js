'use strict';
/* 在线多文件版回归：用 jsdom + 自定义资源加载器“真实打开” index.html
   —— 本地文件从仓库读，CDN 上的 xlsx 用 node_modules 里的库顶替。
   验证：页面能启动、导航渲染、示例数据初始化、读卡时 xlsx 懒加载并可导入真实人物卡。 */
const fs = require('fs');
const path = require('path');
const { JSDOM, requestInterceptor } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const BASE = 'http://coc.local/coc-tool/';
function ctx(){
  const t = function(){};
  return new Proxy(t, {
    get(o, p){
      if (p === 'measureText') return () => ({ width: 8 });
      if (p === 'canvas') return {};
      if (p === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(){ return true; }
  });
}
const interceptor = requestInterceptor(async (request) => {
  const url = String(request.url);
  if (url.startsWith(BASE)){
    const rel = url.slice(BASE.length);
    const buf = fs.readFileSync(path.join(ROOT, decodeURIComponent(rel)));
    const type = rel.endsWith('.css') ? 'text/css' : 'application/javascript';
    return new Response(buf, { status: 200, headers: { 'content-type': type } });
  }
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com/.test(url)){
    const buf = fs.readFileSync(path.join(ROOT, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'));
    return new Response(buf, { status: 200, headers: { 'content-type': 'application/javascript' } });
  }
  return new Response('', { status: 404 });
});

(async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    url: BASE + 'index.html',
    resources: { interceptors: [interceptor] },
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w){ w.HTMLCanvasElement.prototype.getContext = function(){ return ctx(); }; }
  });
  const w = dom.window, d = w.document;
  await new Promise(r => {
    if (d.readyState === 'complete' || d.readyState === 'interactive') r();
    else d.addEventListener('DOMContentLoaded', r);
  });
  await new Promise(r => setTimeout(r, 200));

  const fails = [];
  const ok = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) fails.push(name); };
  ok('导航9个入口(4页+剧本+骰子+模组+规则书+更多小玩意儿)', d.querySelectorAll('#nav button').length === 9);
  ok('示例数据已初始化', w.state && w.state.actors.length >= 1 && w.state.maps.length >= 1);
  ok('品牌为带团妙妙小工具', /带团妙妙小工具/.test((d.querySelector('.brand') || {}).textContent || ''));
  ok('首屏未加载 xlsx(懒加载)', typeof w.XLSX === 'undefined');

  const buf = fs.readFileSync('/Users/krisaneich/Documents/跑团/卡/苹狗卡/符苏 神仙索.xlsx');
  const before = w.state.actors.length;
  w.parseCardData(new Uint8Array(buf), '符苏 神仙索.xlsx');
  await new Promise(r => setTimeout(r, 800));
  ok('懒加载后 xlsx 可用', typeof w.XLSX !== 'undefined' && !!w.XLSX.read);
  ok('真实卡直接入库', w.state.actors.length === before + 1);
  const last = w.state.actors[w.state.actors.length - 1];
  ok('姓名为符苏', last && last.name === '符苏');
  ok('真实卡导入：背包读入', !!last && (last.inv || []).length >= 1, JSON.stringify(last && last.inv));
  ok('真实卡导入：技能表读入', !!last && (last.skills || []).length > 50);
  ok('真实卡导入：背景故事拆条进 history', !!last && last.history && last.history.beliefs === '有钱能使鬼推磨');
  ok('真实卡导入：信用评级 / 其他资产读入', !!last && last.credit === '5%/2%/1%' && last.otherAssets === '50',
    JSON.stringify({credit:last&&last.credit, other:last&&last.otherAssets}));
  ok('真实卡导入：其他资产表（5 格）读入', !!last && !!last.assetsTable && 'vehicle' in last.assetsTable && 'other' in last.assetsTable);
  ok('真实卡导入：导入即建立对比快照', !!last && !!last.importSnapshot && !!last.importSnapshot.skills);
  ok('在线版：模板走按需 URL 且未内联', w.__COC_BLANK_CARD_URL === 'assets/cards/pink.xlsx' && typeof w.__COC_BLANK_CARD_B64 === 'undefined');
  ok('在线版：天文计算库走按需 URL（不内联进 index.html）', (function(){
    var hasFile = fs.existsSync(path.join(ROOT, 'assets', 'sky', 'astronomy.js'));
    var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    return w.__COC_SKY_URL === 'assets/sky/astronomy.js' && hasFile &&
      html.length < 20000 && !/astronomy-engine/.test(html);
  })());
  const blankPath = path.join(ROOT, 'assets', 'cards', 'pink.xlsx');
  ok('在线版：PDF 阅读器（pdf.js）走按需 URL、首屏不下载（也不内联）', (function(){
    var hasLib = fs.existsSync(path.join(ROOT, 'assets', 'pdfjs', 'pdf.min.js'));
    var hasWorker = fs.existsSync(path.join(ROOT, 'assets', 'pdfjs', 'pdf.worker.min.js'));
    var html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    return w.__COC_PDFJS_BASE === 'assets/pdfjs/' && hasLib && hasWorker &&
      typeof w.pdfjsLib === 'undefined' && html.length < 20000 && !/pdfjsLib/.test(html);
  })());
  ok('在线版：空白人物卡模板随包提供', fs.existsSync(blankPath) && fs.statSync(blankPath).size > 100000);
  ok('在线版：能生成导出用的卡片字节', typeof w.buildCardXlsx === 'function' && !!w.importSnapshotOf && !!w.exportActorCard);
  w.close();

  if (fails.length){ console.error('WEB FAILS: ' + fails.join(', ')); process.exit(1); }
  console.log('==== WEB OK: online multi-file boots & lazy xlsx works ====');
})().catch(e => { console.error('ERR', e && e.stack || e); process.exit(1); });
