'use strict';
/* 结构与重复性审计（npm run check 的一部分）：
   1) 每个 src/*.js 模块都语法正确；
   2) 顶层 function 名全局唯一（防止再出现“后定义覆盖前定义”的重复代码）；
   3) index.html 内嵌的正是当前 src 模块拼接结果（防止改了 src 忘构建）。 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const acorn = require('acorn');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function syntaxCheck(){
  const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).sort();
  for (const f of files){
    cp.execFileSync(process.execPath, ['--check', path.join(SRC, f)], { stdio: 'pipe' });
  }
  console.log('syntax ok:', files.length, 'files');
  return files;
}

function merged(){
  return fs.readdirSync(SRC)
    .filter(f => f.endsWith('.js') && f !== 'parse-card.js')
    .sort()
    .map(f => fs.readFileSync(path.join(SRC, f), 'utf8'))
    .join('\n');
}

function main(){
  syntaxCheck();
  const app = merged();
  const ast = acorn.parse(app, { ecmaVersion: 'latest' });
  const seen = new Map();
  for (const st of ast.body){
    if (st.type === 'FunctionDeclaration' && st.id){
      if (seen.has(st.id.name)){
        console.error('重复顶层函数定义: ' + st.id.name + '（第一次见 @' + seen.get(st.id.name) + ' 行）');
        process.exit(1);
      }
      seen.set(st.id.name, st.loc ? st.loc.start.line : '?');
    }
  }
  console.log('top-level functions:', seen.size, '(no duplicates)');

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (html.indexOf(app) < 0){
    console.error('index.html 未包含当前 src 模块内容 —— 请先 npm run build');
    process.exit(1);
  }
  console.log('index.html is in sync with src modules');
}

main();
