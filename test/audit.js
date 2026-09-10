'use strict';
/* 结构与重复性审计（npm run check）：
   1) 每个 src/*.js 模块都语法正确；
   2) 顶层 function 名全局唯一（防止再出现“后定义覆盖前定义”的重复代码）；
   3) offline.html（离线单文件）内嵌的正是当前 src 模块拼接结果；
   4) index.html（在线多文件版）按序引用 src/*.js、样式与解析器，无占位符残留。 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const acorn = require('acorn');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function appFiles(){
  return fs.readdirSync(SRC).filter(f => f.endsWith('.js') && f !== 'parse-card.js').sort();
}
function merged(){
  return appFiles().map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
}
function main(){
  // 1) 语法
  const jsFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
  for (const f of jsFiles){
    cp.execFileSync(process.execPath, ['--check', path.join(SRC, f)], { stdio: 'pipe' });
  }
  console.log('syntax ok:', jsFiles.length, 'files');

  // 2) 无重复顶层函数
  const app = merged();
  const ast = acorn.parse(app, { ecmaVersion: 'latest' });
  const seen = new Set();
  for (const st of ast.body){
    if (st.type === 'FunctionDeclaration' && st.id){
      if (seen.has(st.id.name)){
        console.error('重复顶层函数定义: ' + st.id.name);
        process.exit(1);
      }
      seen.add(st.id.name);
    }
  }
  console.log('top-level functions:', seen.size, '(no duplicates)');

  // 3) 离线单文件同步
  const offline = fs.readFileSync(path.join(ROOT, 'offline.html'), 'utf8');
  if (offline.indexOf(app) < 0){
    console.error('offline.html 未包含当前 src 模块内容 —— 请先 npm run build:all');
    process.exit(1);
  }
  if (/__CSS__|__ICON__|__XLSX__|__PARSER__|__BLANKCARD__|__APP__/.test(offline)){
    console.error('offline.html 仍有占位符未替换');
    process.exit(1);
  }
  console.log('offline.html is in sync with src modules');

  // 4) 在线多文件版结构
  const web = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (/__CSS__|__ICON__|__XLSX__|__PARSER__|__BLANKCARD__|__RULEBOOK_PDF__|__APP__/.test(web)){
    console.error('index.html(在线版) 仍有占位符未替换');
    process.exit(1);
  }
  if (web.indexOf('<link rel="stylesheet" href="src/style.css">') < 0){
    console.error('index.html(在线版) 缺少样式链接');
    process.exit(1);
  }
  if (web.indexOf('<link rel="icon" type="image/png" href="assets/favicon.png">') < 0){
    console.error('index.html(在线版) 缺少标签图标链接');
    process.exit(1);
  }
  if (web.indexOf("window.__COC_RULEBOOK_PDF_URL='assets/rulebook/coc7.pdf'") < 0){
    console.error('index.html(在线版) 缺少规则书 PDF 路径');
    process.exit(1);
  }
  const order = ['parse-card.js'].concat(appFiles());
  let idx = -1;
  for (const f of order){
    const tag = '<script src="src/' + f + '"></script>';
    const i = web.indexOf(tag);
    if (i < 0){ console.error('index.html(在线版) 缺少脚本: ' + f); process.exit(1); }
    if (i < idx){ console.error('index.html(在线版) 脚本顺序错误: ' + f); process.exit(1); }
    idx = i;
  }
  console.log('index.html(web) references', order.length, 'scripts in order; size', Buffer.byteLength(web), 'bytes');
}
main();
