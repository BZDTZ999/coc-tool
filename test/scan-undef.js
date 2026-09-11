'use strict';
/* 静态扫描：找出「没有声明就直接赋值」的全局变量（no-undef 的简化版，扫 src/*.js）。
   为什么必须要这一步：离线单文件版把 src/*.js 全部拼进同一个 <script>，整段处于严格模式，
   漏一个 var 就会抛 ReferenceError 让整段脚本当场停住 —— 后面所有模块的顶层代码都不再执行，
   表现就是「index.html 好好的，offline.html 一堆功能全炸」。jsdom 比较宽容（会自动建全局），
   所以只有静态扫描才拦得住这类事故。
   用法：require('./scan-undef')() → [{file,line,name}, ...]，空数组表示没问题。 */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const SRC = path.join(__dirname, '..', 'src');

/* 浏览器 / JS 自带的全局，正常引用不算「未声明」 */
const BUILTIN = new Set(('window document console localStorage sessionStorage indexedDB XLSX '
+ 'alert confirm prompt fetch URL URLSearchParams Blob File FileReader Image FormData Headers Request Response '
+ 'setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame queueMicrotask '
+ 'JSON Math Date Object Array String Number Boolean RegExp Error TypeError RangeError Promise Symbol BigInt Proxy Reflect '
+ 'Map Set WeakMap WeakSet Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array '
+ 'Float32Array Float64Array ArrayBuffer DataView parseInt parseFloat isNaN isFinite '
+ 'encodeURI encodeURIComponent decodeURI decodeURIComponent atob btoa escape unescape '
+ 'navigator location history screen performance crypto top self frames parent globalThis undefined NaN Infinity arguments '
+ 'getComputedStyle matchMedia addEventListener removeEventListener dispatchEvent CustomEvent Event MouseEvent KeyboardEvent '
+ 'TouchEvent DragEvent WheelEvent PointerEvent FocusEvent InputEvent Node Element HTMLElement HTMLCanvasElement '
+ 'HTMLInputElement CanvasRenderingContext2D MutationObserver ResizeObserver IntersectionObserver DOMParser XMLSerializer '
+ 'TextDecoder TextEncoder structuredClone reportError createImageBitmap OffscreenCanvas AudioContext').split(/\s+/).filter(Boolean));

function bindings(pat, out){
  if (!pat) return;
  switch (pat.type){
    case 'Identifier': out.add(pat.name); break;
    case 'ObjectPattern': pat.properties.forEach(p => bindings(p.value || p.argument, out)); break;
    case 'ArrayPattern': pat.elements.forEach(e => bindings(e, out)); break;
    case 'AssignmentPattern': bindings(pat.left, out); break;
    case 'RestElement': bindings(pat.argument, out); break;
  }
}
function walk(node, visit){
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const k of Object.keys(node)){
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(x => walk(x, visit));
    else if (v && typeof v.type === 'string') walk(v, visit);
  }
}

module.exports = function scanUndef(){
  const declared = new Set(), assigned = [];
  for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.js')).sort()){
    const ast = acorn.parse(fs.readFileSync(path.join(SRC, f), 'utf8'), { ecmaVersion: 2022, locations: true });
    walk(ast, n => {
      if (n.type === 'VariableDeclarator') bindings(n.id, declared);
      else if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'){
        if (n.id) declared.add(n.id.name);
        n.params.forEach(p => bindings(p, declared));
      }
      else if ((n.type === 'ClassDeclaration' || n.type === 'ClassExpression') && n.id) declared.add(n.id.name);
      else if (n.type === 'CatchClause') bindings(n.param, declared);
      else if (n.type === 'AssignmentExpression' && n.left && n.left.type === 'Identifier') assigned.push({ file: f, line: n.loc.start.line, name: n.left.name });
      else if (n.type === 'UpdateExpression' && n.argument && n.argument.type === 'Identifier') assigned.push({ file: f, line: n.loc.start.line, name: n.argument.name });
      else if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left && n.left.type === 'Identifier') assigned.push({ file: f, line: n.loc.start.line, name: n.left.name });
    });
  }
  return assigned.filter(a => !declared.has(a.name) && !BUILTIN.has(a.name));
};
