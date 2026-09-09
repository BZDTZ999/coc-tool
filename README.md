# 🪄 带团妙妙小工具（COC7th）

本地单文件网页：`index.html` 双击即用（无需联网/安装）。从《空白人物卡》系列 `.xlsx` 读卡，
内置调查员库、NPC/敌人（含神话生物与自定义阵营）、地图·路线·载具时间、战斗桌、剧本/笔记、骰子台与 SAN 检定。

## 怎么维护（VSCode 工作流）
1. 用 VSCode 打开本文件夹（`/Users/krisaneich/Documents/跑团/coc-tool`）。
2. 改 `src/` 里的源码，终端执行：
   - `npm install`      （第一次）
   - `npm run check`    → 语法检查 + “无重复顶层函数”审计 + 确认 `index.html` 与 `src` 同步
   - `npm run build`    → 重新生成单文件 `index.html`
   - `npm test`         → 105 项 jsdom 回归，必须全绿再提交
   - `npm run build:slim` → 出瘦身版（约 0.55MB，仅支持 `.xlsx`）
3. 浏览器直接打开 `index.html` 预览；确认没问题后在 VSCode 提交推送 GitHub。

## 目录结构
```
coc-tool/
├─ index.html              ← 构建成品（提交到 GitHub 供直接打开，双击即用）
├─ build.js                ← 按文件名顺序把 src/*.js 拼成单文件
├─ package.json            ← npm 脚本：build / build:slim / test / check
├─ src/                    ← 真正的源码（用 VSCode 改这里，文件按 01~23 编号）
│  ├─ skeleton.html        ← 页面骨架（顶栏/页签/弹窗壳/页脚）
│  ├─ style.css            ← 全部样式 + “自定义背景/换色”主题适配
│  ├─ parse-card.js        ← .xlsx 人物卡解析器（两种表格排布）
│  ├─ 01-utils.js          ← 基础工具、骰子引擎、派生计算（DB/HP/MP…）
│  ├─ 02-data-store.js     ← 默认数据、本地保存/读取、示例 NPC 与地图
│  ├─ 03-nav-templates.js  ← 页签常量、NPC 模板数据、旧卡 HTML
│  ├─ 04-editor-legacy.js  ← 初版地图/道路编辑与仍复用的旧入口
│  ├─ 05-route-vehicle.js  ← 路线·时间·载具计算、备份导出、战斗 v1 辅助
│  ├─ 06-boot-events.js    ← v1 启动事件绑定
│  ├─ 07-ui-presets.js     ← 头像/武器/护甲/阵营常量与 3×3 属性、血条等组件
│  ├─ 08-panel-shell.js    ← 页面骨架生成 scaffoldSections
│  ├─ 09-import-surveyors.js ← 拖拽读卡、导入预览、调查员库列表
│  ├─ 10-npc-gen.js        ← NPC 模板随机生成
│  ├─ 11-actor-form.js     ← 角色编辑弹窗表单（头像/技能/武器/背包/护甲）
│  ├─ 12-map-canvas.js     ← 地图画布绘制与指针交互
│  ├─ 13-combat-shell.js   ← 战斗成员栏与加入/移除
│  ├─ 14-boot-v2.js        ← v2 初始化（initApp）
│  ├─ 15-spells-mythos.js  ← 法术库 + 神话生物补充（数据与行组件）
│  ├─ 16-cards-groups.js   ← 调查员/NPC 小卡、阵营分组与拖拽排序
│  ├─ 17-actor-modal-v3.js ← 角色详情弹窗 v3 + 读卡直接入库
│  ├─ 18-maps-v3.js        ← 多地图/缩放/素材库/自定义素材上传
│  ├─ 19-combat-v3.js      ← 战斗场景、施法、数据兜底、spawnCombatant
│  ├─ 20-skills-split.js   ← 技能“已加点/默认值”自动分区
│  ├─ 21-theme-bg.js       ← 页面背景：颜色 / 自定义图片
│  ├─ 22-scenario-dice.js  ← 剧本摘要/笔记 + 骰子台 + SAN 检定
│  └─ 23-decor.js          ← 背景漂浮小图标装饰
├─ test/
│  ├─ smoke.js             ← 105 项回归（读两张真实人物卡/战斗/骰子/SAN/地图…）
│  └─ audit.js             ← 语法 + 重复定义审计（npm run check）
├─ tools/refactor/
│  └─ dedupe-split.js      ← 记录“三层覆盖 → 模块化”迁移脚本（旧结构下可重跑）
└─ README.md
```

## 这次做了什么：去重 + 按功能拆分
GitHub 首版是一个巨型 `index.html`，拆源码后仍保留了“app.js → overrides.js → v3.js 三层覆盖”的旧结构：
同一个函数在多层里重复定义、后层整体覆盖前层，累计 **54 个函数名、65 个冗余定义**，且互相叠加难以维护。

已做两步重构（行为零变化，105 项回归守护）：
1. **真·去重**：用 AST（acorn）只保留每个函数的最后一次定义，物理删除更早的同名旧实现。
   383 个顶层声明 → **318 个唯一实现**，主程序源码 308.7KB → 238.5KB（约 −23%）。
2. **按功能拆分**：把去重后的代码切成 23 个按功能组织的模块文件（见上表），
   每块对应一个页面/表单/子系统，不再“为了覆盖而重复”。

体积大头仍是内嵌的 xlsx 解析引擎（约占 70%），去重省的主要是源码维护负担与重复字节。

| 构建 | 产物 | 体积 | 支持 |
|---|---|---|---|
| `npm run build`（默认） | index.html | ≈1.18 MB | `.xlsx` + `.xls` |
| `npm run build:slim` | index.html | ≈0.55 MB | `.xlsx`（两张真实卡与 105 项回归均通过） |

## 模块化约定（重要）
- 所有模块仍拼在**同一个 `<script>`、同一个全局作用域**里；`onclick="…"` 等字符串调用的是全局函数。
- 因此不要改成 ES Module / 引入打包器：那会让大量内联 `onclick` 失效。改函数名时同步搜一下页面字符串里的调用。
- 新增功能：按编号加一个 `src/NN-xxx.js`，`build.js` 会自动按文件名顺序拼入；`npm run check` 会拦住“重复顶层函数”这类回归。
- 不要重排模块文件名编号（顺序即运行顺序）。想拆更细时，在 `tools/refactor/dedupe-split.js` 的 `MODULES` 表里把一段代码单独成文件即可，但通常直接手改模块内容更简单。

## 测试与真实卡
- `npm test` 用 jsdom 无头跑 105 项回归，覆盖导入真实卡、NPC 模板、地图多场景、战斗同步、SAN 检定、骰子台、经历外框等。
- 卡解析同时兼容：
  `/Users/krisaneich/Documents/跑团/卡/模板/空白人物卡.xlsx`
  `/Users/krisaneich/Documents/跑团/卡/苹狗卡/符苏 神仙索.xlsx`
- 解析坐标在 `src/parse-card.js`（含合并单元格与 W..Z 标签列）；改它之前先跑测试。
