# 🪄 带团妙妙小工具（COC7th）

克苏鲁跑团工具：从《空白人物卡》系列 `.xlsx` 读卡（拖入即录入调查员库），内置调查员库、
NPC/敌人（神话生物与自定义阵营）、地图·路线·载具时间、战斗桌、剧本/笔记、骰子台与 SAN 检定。

提供两种形态：
- **在线多文件版 `index.html`**：页面很小，按序加载 `src/*.js`；读卡用的 xlsx 引擎**不占首屏**，
  第一次导入人物卡时才从 CDN 懒加载。适合放到 GitHub Pages 上分享/手机访问（需联网）。
- **离线单文件版 `offline.html`**：xlsx 引擎内嵌，双击即用、无需联网；这是本地跑团与「小工具」目录使用的版本。

## 怎么维护（VSCode 工作流）
1. 用 VSCode 打开本文件夹（`/Users/krisaneich/Documents/跑团/coc-tool`）。
2. 改 `src/` 里的源码，终端执行：
   - `npm install`       （第一次）
   - `npm run check`     → 语法检查 + “无重复顶层函数”审计 + 两份成品与 `src` 同步校验
   - `npm run build:all` → 同时出 `offline.html`（离线）与 `index.html`（在线）
   - `npm test`          → 105 项 jsdom 回归（读真实卡/战斗/骰子/SAN/地图…），必须全绿再提交
   - `npm run test:web`  → 在线多文件版端到端回归（页面启动 + 懒加载 xlsx 读卡）
   - 单独构建：`npm run build`（离线全量）、`npm run build:slim`（离线瘦身，仅 .xlsx）、`npm run build:web`（在线）
3. 浏览器打开 `index.html`（在线）或 `offline.html`（离线）预览。
4. 确认后提交推送 GitHub。

## 目录结构
```
coc-tool/
├─ index.html              ← 在线多文件版成品（引用 src/*，xlsx 走 CDN 懒加载）
├─ offline.html            ← 离线单文件版成品（xlsx 内嵌，双击即用；与「小工具」目录同一份）
├─ build.js                ← 三种构建：offline / slim / web（scripts 见 package.json）
├─ package.json            ← npm 脚本：build / build:slim / build:web / build:all / test / check
├─ src/                    ← 真正的源码（用 VSCode 改这里，文件按 01~23 编号）
│  ├─ skeleton.html        ← 页面骨架（顶栏/页签/弹窗壳/页脚）
│  ├─ style.css            ← 全部样式 + “自定义背景/换色”主题适配
│  ├─ parse-card.js        ← .xlsx 人物卡解析器（两种表格排布；浏览器挂 window.CoCParser）
│  ├─ 01-utils.js          ← 基础工具、骰子引擎、派生计算、ensureXLSX（xlsx 懒加载）
│  ├─ 02-data-store.js     ← 默认数据、本地保存/读取、示例 NPC 与地图
│  ├─ 03-nav-templates.js  ← 页签常量、NPC 模板数据、旧卡 HTML
│  ├─ 04-editor-legacy.js  ← 初版地图/道路编辑与仍复用的旧入口
│  ├─ 05-route-vehicle.js  ← 路线·时间·载具计算、备份导出、战斗 v1 辅助
│  ├─ 06-boot-events.js    ← v1 启动事件绑定（DOMContentLoaded 里再取 initApp）
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
│  ├─ smoke.js             ← 105 项回归（对 offline.html 运行）
│  ├─ web.js               ← 在线多文件版端到端回归（npm run test:web）
│  └─ audit.js             ← 语法 + 重复定义 + 两份成品同步审计（npm run check）
├─ tools/refactor/
│  └─ dedupe-split.js      ← 记录“三层覆盖 → 模块化”迁移脚本（旧结构下可重跑）
└─ README.md
```

## 去重 + 按功能拆分（已完成的改造）
GitHub 首版是单文件，源码曾为“app.js → overrides.js → v3.js 三层覆盖”结构：
同一函数多层重复定义、后层覆盖前层，累计 **54 个函数名、65 个冗余定义**，极难维护。

已做两步重构（行为零变化，105 项回归守护）：
1. **真·去重**：用 AST（acorn）只保留每个函数的最后一次定义，物理删除更早的同名旧实现。
   383 个顶层声明 → **319 个唯一实现**，主程序源码 308.7KB → 240KB 左右。
2. **按功能拆分**：把去重后的代码切成 23 个模块文件（见上表），每块对应一个页面/表单/子系统；
   又补了 `ensureXLSX` 让在线版可以“用到的库才加载”。

| 构建命令 | 产物 | 体积 | 说明 |
|---|---|---|---|
| `npm run build` | offline.html | ≈1.18 MB | 离线全量（支持 .xlsx/.xls） |
| `npm run build:slim` | offline.html | ≈0.55 MB | 离线瘦身（仅 .xlsx） |
| `npm run build:web` | index.html | ≈3 KB | 在线多文件版（另加载 src/*，合计源码 ~240KB，xlsx 按需 CDN） |

## 发布到 GitHub Pages（在线版）
1. 推送本仓库后，在 GitHub 打开仓库 **Settings → Pages**；
2. Source 选分支 `main`，目录选 **`/`（root）**，保存后等 1 分钟；
3. 在线版地址即 `https://<你的用户名>.github.io/coc-tool/`（直接打开根 `index.html`）。

在线版第一次导入 `.xlsx` 人物卡时会从 CDN 加载 xlsx 引擎（jsdelivr → cdnjs → unpkg 自动重试），
需要联网；本地无网跑团请使用 `offline.html`。

## 模块化约定（重要）
- 离线版把所有模块拼进**同一个 `<script>`、同一个全局作用域**；在线版按序加载多个 `<script>`，
  两者对全局函数的要求一致：`onclick="…"` 等字符串调用的是全局函数。
- 因此不要改成 ES Module / 引入打包器：那会让大量内联 `onclick` 失效。改函数名时同步搜一下页面字符串里的调用。
- 模块**加载顺序即运行顺序**：`01~23` 编号即依赖顺序，别重排。模块顶层“立即执行”的语句
  不能引用更晚模块的函数（例：06 里用 `function(){ initApp(); }` 包了一层再挂 DOMContentLoaded）。
  新增功能：按编号加一个 `src/NN-xxx.js` 即可，`build.js` 会自动拼入；`npm run check` 会拦住重复顶层函数。
- `test/smoke.js` 对 `offline.html` 跑回归；在线版的加载与 xlsx 懒加载另有用 jsdom + 自定义资源加载器验证过。

## 测试与真实卡
- `npm test` 用 jsdom 无头跑 105 项回归，覆盖导入真实卡、NPC 模板、地图多场景、战斗同步、SAN 检定、骰子台、经历外框等。
- 卡解析同时兼容：
  `/Users/krisaneich/Documents/跑团/卡/模板/空白人物卡.xlsx`
  `/Users/krisaneich/Documents/跑团/卡/苹狗卡/符苏 神仙索.xlsx`
- 解析坐标在 `src/parse-card.js`（含合并单元格与 W..Z 标签列）；改它之前先跑测试。
