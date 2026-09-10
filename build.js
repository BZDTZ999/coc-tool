'use strict';
/* 一键构建（源码都在 src/，改完跑 npm run build 等即出成品）。
   三种产物：
     npm run build         → offline.html  离线单文件版（xlsx 内嵌，双击即用，支持 .xlsx/.xls）
     npm run build:slim    → offline.html  离线单文件瘦身版（xlsx 精简引擎，仅 .xlsx，约省一半体积）
     npm run build:web     → index.html    在线多文件版（引用 src/*.js + 样式，xlsx 首屏不加载、
                                             第一次读卡时才从 CDN 懒加载；适合放 GitHub Pages，首屏小）
   先 npm install 一次（拉取 xlsx 与测试用的 jsdom）。 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const MODE = process.argv[2] || 'offline';

/* 主程序模块：src 下所有 .js（parse-card.js 除外，它单独作为“解析器”）。
   文件名以 01/02/… 编号，排序即加载顺序；新增功能文件时同样按顺序编号即可。 */
const APP_FILES = fs.readdirSync(SRC)
  .filter(f => f.endsWith('.js') && f !== 'parse-card.js')
  .sort();
if (APP_FILES.length < 20){
  console.error('src 下模块文件数量异常（' + APP_FILES.length + '），请检查是否缺少模块。');
  process.exit(1);
}
function read(f){ return fs.readFileSync(path.join(SRC, f), 'utf8'); }

/* 随包资源（assets/ 下的静态文件）：离线版内联进单文件，在线版只写路径按需取。 */
const RULEBOOK_FILE = path.join('assets', 'rulebook', 'coc7.js');       // 目录 + 全文检索用的正文文本
const RULEBOOK_PDF  = path.join('assets', 'rulebook', 'coc7.pdf');      // 原版 PDF（保持原有排版：表格 / 颜色 / 流程图）
/* 受支持的 4 张人物卡模板，id 与 src/26-cards.js 的 COC_CARDS 一致 */
const CARD_FILES = ['pink', 'cy23', 'cy2lus', 'cn'];
const COC_CARD_DEFAULT = 'pink';
function cardPath(id){ return path.join(ROOT, 'assets', 'cards', id + '.xlsx'); }
function readAsset(rel){
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)){ console.error('缺少资源：' + rel); process.exit(1); }
  return fs.readFileSync(p, 'utf8');
}
function cardsB64Json(){
  const out = {};
  for (const id of CARD_FILES){
    if (!fs.existsSync(cardPath(id))){ console.error('缺少人物卡模板：assets/cards/' + id + '.xlsx'); process.exit(1); }
    out[id] = fs.readFileSync(cardPath(id)).toString('base64');
  }
  return JSON.stringify(out);
}
function cardsUrlJson(){
  const out = {};
  for (const id of CARD_FILES) out[id] = 'assets/cards/' + id + '.xlsx';
  return JSON.stringify(out);
}

/* 网页标签图标：assets/favicon.png（由 icon 原图缩小而来）。
   离线单文件版内联成 base64（依旧自包含），在线版引用文件路径。 */
function iconDataUri(){
  const p = path.join(ROOT, 'assets', 'favicon.png');
  if (!fs.existsSync(p)){ console.error('缺少标签图标：assets/favicon.png'); process.exit(1); }
  return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
}

function buildOffline(libName, outFile){
  const libPath = path.join(ROOT, 'node_modules', 'xlsx', 'dist', libName);
  if (!fs.existsSync(libPath)){
    console.error('缺少 xlsx 库：请先执行  npm install');
    process.exit(1);
  }
  if (!fs.existsSync(path.join(ROOT, RULEBOOK_PDF))){ console.error('缺少规则书 PDF：' + RULEBOOK_PDF); process.exit(1); }
  let html = read('skeleton.html');
  html = html.replace('__CSS__', () => read('style.css'));
  // 离线单文件版：同一张图内联一次就够，删掉 apple-touch 那行免得 base64 占两份体积
  html = html.replace(/\s*<link rel="apple-touch-icon" href="__ICON__">/, '');
  html = html.split('__ICON__').join(iconDataUri());
  const parser = read('parse-card.js');
  const app = APP_FILES.map(read).join('\n');
  const lib = fs.readFileSync(libPath, 'utf8');
  html = html
    .replace('<script>__XLSX__</script>', () => '<script>' + lib + '</script>')
    .replace('<script>__PARSER__</script>', () => '<script>' + parser + '</script>')
    .replace('<script>__CARDS__</script>', () => '<script>window.__COC_CARDS_B64=' + cardsB64Json() + ';</script>')
    .replace('<script>__RULEBOOK__</script>', () => '<script>' + readAsset(RULEBOOK_FILE) + '</script>')
    // 规则书原版 PDF 内联成 base64（离线单文件依旧自包含；打开时解成 Blob URL 给浏览器自带阅读器）
    .replace('<script>__RULEBOOK_PDF__</script>', () => '<script>window.__COC_RULEBOOK_PDF_B64="' + fs.readFileSync(path.join(ROOT, RULEBOOK_PDF)).toString('base64') + '";</script>')
    // 旧名兼容：__COC_BLANK_CARD_B64 指向默认模板（同一个字符串，不额外占体积）
    .replace('<script>__BLANKCARD__</script>', () => '<script>window.__COC_BLANK_CARD_B64=window.__COC_CARDS_B64.' + COC_CARD_DEFAULT + '||"";</script>')
    .replace('<script>__APP__</script>', () => '<script>' + app + '</script>');
  const leftover = ['__CSS__','__ICON__','__XLSX__','__PARSER__','__CARDS__','__RULEBOOK__','__RULEBOOK_PDF__','__BLANKCARD__','__APP__'].filter(t => html.indexOf(t) >= 0);
  if (leftover.length){ console.error('仍有未替换占位符：', leftover.join(', ')); process.exit(1); }
  fs.writeFileSync(path.join(ROOT, outFile), html);
  console.log('built [offline:' + (libName.indexOf('mini') >= 0 ? 'slim' : 'full') + ']', outFile, fs.statSync(path.join(ROOT, outFile)).size, 'bytes');
}

function buildWeb(){
  let html = read('skeleton.html');
  html = html.replace('<style>__CSS__</style>', () => '<link rel="stylesheet" href="src/style.css">');
  html = html.split('__ICON__').join('assets/favicon.png');
  const scripts = [
    '    <!-- 在线多文件版：脚本按序加载 src/*.js（与离线版同一份源码）。 -->',
    '    <!-- 读 .xlsx 人物卡时才从 CDN 懒加载 xlsx 引擎；完全离线请改用 offline.html。 -->',
    '    <script src="src/parse-card.js"></script>'
  ];
  for (const f of APP_FILES) scripts.push('    <script src="src/' + f + '"></script>');
  html = html
    .replace('<script>__XLSX__</script>', () => '')
    .replace('<script>__PARSER__</script>', () => scripts.slice(0, 2).join('\n') + '\n' + scripts[2])
    // 在线版：4 张卡模板与规则书都按需取（首屏只留路径，不内联内容）
    .replace('<script>__CARDS__</script>', () => '<script>window.__COC_CARDS_URL=' + cardsUrlJson() + ';</script>')
    .replace('<script>__RULEBOOK__</script>', () => '<script>window.__COC_RULEBOOK_URL=\'assets/rulebook/coc7.js\';</script>')
    .replace('<script>__RULEBOOK_PDF__</script>', () => '<script>window.__COC_RULEBOOK_PDF_URL=\'assets/rulebook/coc7.pdf\';</script>')
    // 在线版不内联模板，首次导出时按需 fetch assets/blank-card.xlsx，保持首屏轻量
    .replace('<script>__BLANKCARD__</script>', () => '<script>window.__COC_BLANK_CARD_URL=\'assets/cards/' + COC_CARD_DEFAULT + '.xlsx\';</script>')
    .replace('<script>__APP__</script>', () => scripts.slice(3).join('\n'));
  const leftover = ['__CSS__','__ICON__','__XLSX__','__PARSER__','__CARDS__','__RULEBOOK__','__RULEBOOK_PDF__','__BLANKCARD__','__APP__'].filter(t => html.indexOf(t) >= 0);
  if (leftover.length){ console.error('仍有未替换占位符：', leftover.join(', ')); process.exit(1); }
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
  console.log('built [web] index.html', fs.statSync(path.join(ROOT, 'index.html')).size, 'bytes');
}

if (MODE === 'slim') buildOffline('xlsx.mini.min.js', 'offline.html');
else if (MODE === 'web') buildWeb();
else if (MODE === 'all'){ buildOffline('xlsx.full.min.js', 'offline.html'); buildWeb(); }
else buildOffline('xlsx.full.min.js', 'offline.html');

console.log('modules:', APP_FILES.join(', '));
