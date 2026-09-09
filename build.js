'use strict';
/* 一键构建：把 src/ 下按功能拆分的源码拼成可直接双击使用的单文件 index.html。
   npm run build        → 用 xlsx.full.min.js（支持 .xlsx / .xls，体积较大）
   npm run build:slim   → 用 xlsx.mini.min.js（支持 .xlsx，体积约省一半，不读 .xls）
   先 npm install 一次（拉取 xlsx 与测试用的 jsdom）。 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'index.html');
const MODE = (process.argv[2] || 'full') === 'slim' ? 'slim' : 'full';

/* 主程序模块：src 下所有 .js（parse-card.js 除外，它单独作为“解析器”注入）。
   文件名以 01/02/… 编号，排序即拼接顺序；新增功能文件时同样按顺序编号即可。 */
const APP_FILES = fs.readdirSync(SRC)
  .filter(f => f.endsWith('.js') && f !== 'parse-card.js')
  .sort();
if (APP_FILES.length < 20){
  console.error('src 下模块文件数量异常（' + APP_FILES.length + '），请检查是否缺少模块。');
  process.exit(1);
}

function read(f){ return fs.readFileSync(path.join(SRC, f), 'utf8'); }
const LIB_FILE = MODE === 'slim' ? 'xlsx.mini.min.js' : 'xlsx.full.min.js';
const libPath = path.join(ROOT, 'node_modules', 'xlsx', 'dist', LIB_FILE);
if (!fs.existsSync(libPath)){
  console.error('缺少 xlsx 库：请先执行  npm install');
  process.exit(1);
}
let html = read('skeleton.html');
html = html.replace('__CSS__', () => read('style.css'));
const parser = read('parse-card.js');
const app = APP_FILES.map(read).join('\n');
const lib = fs.readFileSync(libPath, 'utf8');
html = html
  .replace('<script>__XLSX__</script>', () => '<script>' + lib + '</script>')
  .replace('<script>__PARSER__</script>', () => '<script>' + parser + '</script>')
  .replace('<script>__APP__</script>', () => '<script>' + app + '</script>');
const leftover = ['__CSS__','__XLSX__','__PARSER__','__APP__'].filter(t => html.indexOf(t) >= 0);
if (leftover.length){ console.error('仍有未替换占位符：', leftover.join(', ')); process.exit(1); }
fs.writeFileSync(OUT, html);
console.log('built [' + MODE + ']', OUT, fs.statSync(OUT).size, 'bytes');
console.log('modules:', APP_FILES.join(', '));
