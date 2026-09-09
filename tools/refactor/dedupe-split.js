'use strict';
/* 一次性重构工具（可重复执行）：
   1) 读旧的 app.js / overrides.js / v3.js（三层覆盖式源码，GitHub 首版即这种结构）；
   2) 用 acorn 做“真·去重”：同名顶层 function 只保留最后一次定义（运行时本来就由它生效）；
   3) 按下方 MODULES 清单切成“按功能模块”的 src/ 文件（顺序即运行顺序，拼接后行为不变）。

   用法：node tools/refactor/dedupe-split.js
   前提：npm install（需要 acorn 做解析）。
   说明：本脚本从“当前目录的 app/overrides/v3”生成模块文件；迁移完成后这三个旧文件即被删除。 */
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const LEGACY = ['app.js', 'overrides.js', 'v3.js'];

/* 模块清单：文件名 -> 起始行（1 基，含）。到下一个文件起始行之前为止。 */
const MODULES = [
  ['01-utils.js',            1],      // 基础工具 / 骰子 / 派生计算
  ['02-data-store.js',      117],     // 默认数据、本地存取、示例数据
  ['03-nav-templates.js',   210],     // 页签常量、NPC 模板库(v1)、旧卡 HTML
  ['04-editor-legacy.js',   310],     // 初版地图/道路编辑与仍复用的旧弹窗入口
  ['05-route-vehicle.js',   518],     // 路线·时间·载具、备份导出、战斗 v1 辅助
  ['06-boot-events.js',     899],     // v1 启动事件绑定
  ['07-ui-presets.js',      922],     // 头像/武器/护甲/阵营常量与 3×3 属性、bars 组件
  ['08-panel-shell.js',    1041],     // 页面骨架 scaffoldSections
  ['09-import-surveyors.js',1197],    // 拖拽读卡、导入预览、调查员库列表
  ['10-npc-gen.js',        1301],     // NPC 模板生成
  ['11-actor-form.js',     1409],     // 角色编辑弹窗表单（头像/技能/武器/背包…）
  ['12-map-canvas.js',     1598],     // 地图画布绘制与指针交互
  ['13-combat-shell.js',   1872],     // 战斗成员栏与加入/移除
  ['14-boot-v2.js',        1966],     // v2 初始化（含 initApp）
  ['15-spells-mythos.js',  2017],     // 法术库 + 神话生物补充（数据与行组件）
  ['16-cards-groups.js',   2185],     // 调查员/NPC 小卡、阵营分组与拖拽排序
  ['17-actor-modal-v3.js', 2375],     // 角色详情弹窗 v3 + 直接入库 doImport
  ['18-maps-v3.js',        2691],     // 多地图/缩放/素材库/自定义素材
  ['19-combat-v3.js',      2889],     // 战斗场景、施法、数据兜底、spawnCombatant
  ['20-skills-split.js',   3315],     // 技能“已加点/默认值”自动分区
  ['21-theme-bg.js',       3391],     // 页面背景：颜色 / 自定义图片
  ['22-scenario-dice.js',  3533],     // 剧本笔记 + 骰子台 + SAN 检定
  ['23-decor.js',          4142],     // 背景漂浮装饰
];

function legacyExists(){ return LEGACY.every(f => fs.existsSync(path.join(SRC, f))); }

function dedupeToFlat(){
  const codeMap = {};
  let concat = '';
  for (const f of LEGACY){
    codeMap[f] = fs.readFileSync(path.join(SRC, f), 'utf8');
    concat += codeMap[f] + '\n';
  }
  const ast = acorn.parse(concat, { ecmaVersion: 'latest', ranges: true });
  const decls = [];
  for (const st of ast.body){
    if (st.type === 'FunctionDeclaration' && st.id) decls.push({ name: st.id.name, start: st.start, end: st.end });
  }
  // 保留每个名字最后一次出现；更早的同名函数声明整段移除。
  const keepEnd = {};
  for (const d of decls) keepEnd[d.name] = d.end;   // 最后写入的 end 即为最后一次
  const remove = decls.filter(d => d.end !== keepEnd[d.name]);
  let out = '', prev = 0;
  const sorted = remove.slice().sort((a, b) => a.start - b.start);
  for (const r of sorted){ out += concat.slice(prev, r.start); prev = r.end; }
  out += concat.slice(prev);
  // 确保去掉后仍为合法脚本且每个名字只剩一个定义。
  const ast2 = acorn.parse(out, { ecmaVersion: 'latest' });
  const seen = new Set();
  for (const st of ast2.body){
    if (st.type === 'FunctionDeclaration' && st.id){
      if (seen.has(st.id.name)) throw new Error('still duplicate: ' + st.id.name);
      seen.add(st.id.name);
    }
  }
  return { text: out, removed: remove.length, total: decls.length, unique: Object.keys(keepEnd).length };
}

function split(flatText){
  const lines = flatText.split('\n');
  // 解析到最后一行（可能以空串结尾）；保留每行结尾换行，保证拼接后逐字节等于 flatText。
  const contents = [];
  for (let i = 0; i < MODULES.length; i++){
    const [name, start1] = MODULES[i];
    const end1 = i + 1 < MODULES.length ? MODULES[i + 1][1] - 1 : lines.length;
    if (end1 < start1) throw new Error('bad range for ' + name);
    contents.push([name, lines.slice(start1 - 1, end1).join('\n')]);
  }
  // 校验：拼接后应与拍平文本完全一致（保证顺序/换行零改动）。
  const join = contents.map(c => c[1]).join('\n');
  if (join !== flatText) throw new Error('split does not reproduce flat text byte-for-byte');
  return contents;
}

function main(){
  if (!legacyExists()){
    console.log('未找到 app.js/overrides.js/v3.js —— 已迁移到模块化结构，无需再跑。');
    return;
  }
  const flat = dedupeToFlat();
  const modules = split(flat.text);
  for (const [name, text] of modules){
    fs.writeFileSync(path.join(SRC, name), text + (text.endsWith('\n') ? '' : '\n'));
  }
  for (const f of LEGACY) fs.unlinkSync(path.join(SRC, f));
  console.log('removed legacy dup defs:', flat.removed, '/', flat.total, 'decls; unique:', flat.unique);
  console.log('wrote', modules.length, 'modules into src/; deleted', LEGACY.join(','));
}

main();
