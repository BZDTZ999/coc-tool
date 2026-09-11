/* ---------- 页面骨架（覆盖旧版，去掉“载具·骰子·数据”页） ---------- */
function scaffoldSections(){
  // 调查员
  $('tab-surveyors').innerHTML = `
  <div class="srvcols">
    <div class="srvside">
      <div class="card" id="tagSideCard">
        <div class="panel-head srvside-head" onclick="toggleTagSide()" title="点这里展开/收起标签栏"><b>🏷 标签栏</b><span class="hint" style="font-size:11px">点选→点小卡</span><span class="collapse-ico" id="tagSideIco">▾</span></div>
        <div class="collapse-body" id="tagSideBody">
        <div class="row" style="gap:5px;flex-wrap:nowrap;align-items:center">
          <input type="text" id="tagNameInput" placeholder="标签名（可 emoji）" style="flex:1;min-width:0" onkeydown="if(event.key==='Enter')addTagLib()">
          <input type="color" id="tagColorInput" value="#e3c47f" title="标签颜色">
          <button class="small primary" title="新建标签" onclick="addTagLib()">＋</button>
        </div>
        <div id="tagLib" class="taglib"></div>
        <div class="hint" style="margin-top:8px;line-height:1.7">点选一个标签再点调查员小卡即可贴上；也可直接把标签拖到小卡上。小卡右上角的便签条可以拖到另一张卡，或点 ✕ 移除。每张小卡最多 6 个标签。</div>
        </div>
      </div>
    </div>
    <div class="srvmain">
      <div class="card" id="importCard">
        <div class="panel-head card-toggle" onclick="toggleSrvPanel('import')" title="点这里展开/收起导入栏">
          <h3 style="margin:0">📥 从人物卡 .xlsx 导入调查员</h3>
          <span class="hint" style="font-size:11px">支持 4 种卡 · <a href="javascript:openWelcome()" onclick="event.stopPropagation()">看是哪些</a></span>
          <span class="collapse-ico" id="importIco">▾</span>
        </div>
        <div class="collapse-body" id="importBody">
        <div id="dropZone" class="notice" style="cursor:pointer;border:2px dashed var(--acc)">
          🖱 直接把人物卡 .xlsx 拖到这里，即可解析（也支持点击选择文件）
        </div>
        <input type="file" id="fileImport" accept=".xlsx,.xls" style="display:none" onchange="onPickCardFile(event)">
        <div id="importPreview"></div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between;margin:4px 2px 8px">
        <b id="pcCountTitle">调查员库</b>
        <button onclick="openActorModal(null,'pc')" class="small primary">＋ 手动新建调查员</button>
      </div>
      <div class="grid" id="pcList" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))"></div>
    </div>
  </div>`;
  // NPC
  $('tab-npcs').innerHTML = `
  <div class="card">
    <h3>👤 NPC 与敌人库（模板生成、数值/数量/阵营全可改）</h3>
    <div class="row">
      <label>类别<select id="npcTplCat" onchange="npcTplOptions()"></select></label>
      <label>模板<select id="npcTplSel"></select></label>
      <label style="max-width:110px">数量<input type="number" id="npcTplCount" value="1" min="1" style="width:80px"></label>
      <label>默认阵营<select id="npcTplSide"></select></label>
      <button onclick="genNpcFromTpl()" class="primary">🎲 按模板生成</button>
      <button onclick="openActorModal(null,'npc')">✏️ 手动新建 NPC</button>
    </div>
  </div>
  <div id="npcList"></div>`;
  // 地图：二级菜单栏（地图 / 角色 / 素材 / 载具）点开就用、再点收起；地图本体占满整个宽度
  $('tab-maps').innerHTML = `
  <div class="tabstack" id="mapStack">
    <div class="tabbar2" id="mapBar">
      <button class="tb2" id="mp-cards" onclick="toggleMapPod('cards')" title="切换地图 / 载入预设 / 缩放 / 比例尺 / 换底图">🗺 地图</button>
      <button class="tb2" id="mp-actors" onclick="toggleMapPod('actors')" title="把调查员 / NPC 放到地图上">🧍 地图角色</button>
      <button class="tb2" id="mp-props" onclick="toggleMapPod('props')" title="摆件素材（桌椅 / 树木 / 车辆…，也可上传自己的图）">🧩 摆件素材</button>
      <button class="tb2" id="mp-veh" onclick="toggleMapPod('veh')" title="载具与路线时间速度">🚗 载具 / 时间速度</button>
      <span class="tb2hint">点开就用，再点收起</span>
    </div>
    <div class="podrow" id="mapPods">
      <div class="pod card" id="pod-cards" hidden>
        <div class="mapcards" id="mapCardBar" style="margin-bottom:8px"></div>
        <div class="row mapctrlrow" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div style="flex:1;min-width:280px">
            <select id="mapSel" style="display:none" onchange="onMapSelect()"></select>
          </div>
          <div class="row" style="gap:6px;flex-wrap:wrap">
            <select id="mapDemoGrp" class="small" title="先选地图分类（城市街区 / 室内建筑 / 野外自然 / 特殊地下）" style="max-width:150px" onchange="onDemoGroupChange(this.value)"></select>
            <select id="mapDemoSel" class="small" title="再选这个分类里的具体地图载入（会替换当前场景）" style="max-width:180px" onchange="loadDemoMap(this.value)"></select>
            <span class="zoomrow">
              <button class="small ghost" title="缩小" onclick="zoomBy(-0.2)">－</button>
              <span id="zoomVal" class="zoomval">100%</span>
              <button class="small ghost" title="放大" onclick="zoomBy(0.2)">＋</button>
              <button class="small ghost" onclick="zoomFit()">适宽</button>
              <button class="small ghost" onclick="zoomReset()">重置</button>
            </span>
            <label class="muted" id="mapScaleBox" style="flex-direction:row;align-items:center;gap:4px">比例尺：1格=<input id="mapScale" type="number" step="any" inputmode="decimal" min="0" style="width:190px" value="1">km<button class="small ghost" onclick="onScaleChange()">设</button></label>
            <label class="muted" style="flex-direction:row;align-items:center;gap:4px">底图<input type="file" id="mapBg" accept="image/*" style="display:none" onchange="onBgPick(event)"><button class="small ghost" onclick="document.getElementById('mapBg').click()">上传</button></label>
          </div>
        </div>
      </div>
      <div class="pod card" id="pod-actors" hidden>
        <div class="panel-head"><b>🧍 地图角色</b><span class="muted" style="font-size:11px">点一下加入地图</span></div>
        <div id="mapActorsBox"></div>
      </div>
      <div class="pod card" id="pod-props" hidden>
        <div class="panel-head"><b>🧩 摆件素材</b><span class="muted" style="font-size:11px">点按放入画布 · 可拖动 / 删除 · 也能上传自己的图</span></div>
        <div class="proplist" id="propPalette"></div>
        <input type="file" id="customPropFile" accept="image/*" multiple style="display:none" onchange="addCustomPropFiles(event)">
      </div>
      <div class="pod card" id="pod-veh" hidden>
        <div class="panel-head"><b>🚗 载具 / 时间速度</b>
          <button class="small ghost" onclick="resetVehicles()">恢复默认</button></div>
        <div id="mapVehicles"></div>
      </div>
    </div>
    <div class="card stagecard" id="mapMainCard">
      <div class="row tabs-mini" id="mapTools" style="margin-top:0">
        <button id="mt-select" class="active" onclick="setMapTool('select')" title="只拖动地点；相连道路的 km 会实时重算">🖱 拖动地点</button>
        <button id="mt-move" onclick="setMapTool('move')" title="只拖动地图角色与摆件，不动地点和道路">🧍 移动角色/摆件</button>
        <button id="mt-add" onclick="setMapTool('add')">📍 添加地点</button>
        <button class="ghost small" onclick="deleteSelectedObj()">🗑 删除选中</button>
        <button class="ghost small" onclick="rotateMap(90,'all')" title="整体旋转 90°：底图、地点、摆件和文字一起转">🔄 整体旋转</button>
        <button class="ghost small" onclick="rotateMap(90,'upright')" title="地图旋转 90°：只有地图转，文字保持水平">↻ 地图旋转</button>
        <button class="ghost small" id="mapFsBtn" onclick="toggleSceneFs('map')" title="全屏查看地图（右下角 ↩ 返回退出）">⛶ 全屏</button>
        <span class="drag-hint" id="mapDragHint" style="margin-left:auto">🖱 拖动地点（相连道路 km 实时重算）· 🧍 移动角色/摆件 · 角色也可在「🧍 地图角色」里点选后拖到位置</span>
      </div>
      <div id="mapWrap"><canvas id="mapCanvas" width="1000" height="620"></canvas></div>
      <div id="fsMapCtl">
        <div class="fsmapctl-left">
          <button class="fsicon" data-tool="select" onclick="setMapTool('select')" title="拖动地点（相连道路 km 实时重算）">🖱</button>
          <button class="fsicon" data-tool="move" onclick="setMapTool('move')" title="只移动角色 / 摆件">🧍</button>
          <button class="fsicon" data-tool="add" onclick="setMapTool('add')" title="添加地点">📍</button>
          <button class="fsicon" onclick="deleteSelectedObj()" title="删除选中">🗑</button>
          <span class="fssep"></span>
          <button class="fsicon" onclick="cycleMap()" title="切换地图">🗺️</button>
          <button class="fsicon" onclick="rotateMap(90,'all')" title="整体旋转 90°（底图与文字一起转）">🔄</button>
          <button class="fsicon" onclick="rotateMap(90,'upright')" title="地图旋转 90°（只有地图转，文字保持水平）">↻</button>
        </div>
        <div class="fsmapctl-zoom">
          <button class="fsicon" onclick="zoomBy(0.2)" title="放大">➕</button>
          <span class="zoomval">100%</span>
          <button class="fsicon" onclick="zoomBy(-0.2)" title="缩小">➖</button>
          <button class="fsicon" onclick="zoomFit()" title="适宽">⤢</button>
          <button class="fsicon" onclick="zoomReset()" title="重置缩放">↺</button>
        </div>
      </div>
      <div id="mapHint" class="hint" style="margin-top:4px">“📍 添加地点”后在图上落点；“🖱 拖动地点”只动地点并实时重算相连道路的 km；“🧍 移动角色/摆件”只挪角色和素材，不会碰到地点与道路。</div>
    </div>
    <div id="routeCard"></div>
    <div class="grid2">
      <div id="mapPointsCard"></div>
      <div id="mapLegsCard"></div>
    </div>
  </div>`;
  // 战斗：二级菜单栏（添加角色 / 战斗桌）点开就用、再点收起；战斗场景占满整个宽度
  $('tab-combat').innerHTML = `
  <div class="tabstack" id="combatStack">
    <div class="tabbar2" id="combatBar">
      <button class="tb2" id="cp-add" onclick="toggleCombatPod('add')" title="把调查员 / NPC / 临时成员加入战斗">👥 添加角色</button>
      <button class="tb2" id="cp-table" onclick="toggleCombatPod('table')" title="本次战斗标题 / 回合 / 清空">⚔️ 战斗桌</button>
      <span class="tb2hint" id="combatRoundBadge"></span>
    </div>
    <div class="podrow" id="combatPods">
      <div class="pod card" id="pod-add" hidden>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <label>加入类型<select id="cbAddKind" onchange="refreshCombatAddSel()">
            <option value="pc">调查员</option><option value="npc">NPC / 敌人</option><option value="ad">临时手动成员</option>
          </select></label>
          <label>角色<select id="cbAddSel"></select></label>
          <label>数量<input type="number" id="cbAddCount" value="1" min="1" style="width:70px"></label>
          <button class="primary" onclick="combatAdd()">加入战斗</button>
        </div>
      </div>
      <div class="pod card" id="pod-table" hidden>
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <b id="combatTitle"></b>
          <span class="row" style="gap:6px">
            <button onclick="combatNewRound()">⏭ 下一轮（按敏捷排序）</button>
            <button class="ghost" onclick="combatClear()">清空战斗</button>
          </span>
        </div>
      </div>
    </div>
    <div class="card stagecard" id="combatStageCard">
      <div class="panel-head"><b>🏟 战斗场景</b>
        <div class="row">
          <label class="muted" style="flex-direction:row;gap:4px">上传底图<input type="file" id="battleBg" accept="image/*" style="display:none" onchange="onBattleBg(event)"></label>
          <button class="small ghost" onclick="clearBattleBg()">清除底图</button>
          <button class="small ghost" id="combatFsBtn" onclick="toggleSceneFs('combat')" title="全屏查看战斗场景（右下角 ↩ 返回退出）">⛶ 全屏</button>
          <span class="hint fs-hide">头像可拖动；点选可操作</span>
        </div>
      </div>
      <div class="battlecanvas-wrap"><canvas id="battleCanvas" width="940" height="500"></canvas></div>
      <div class="row" style="justify-content:space-between;margin-top:4px">
        <span class="scene-side side-调查员">调查员阵营 ← 左</span>
        <span class="hint">点上方「👥 添加角色」加入 / 移出</span>
        <span class="scene-side side-敌人">→ 敌人阵营 右</span>
      </div>
      <details class="ccard" data-coll="bprops" id="battlePropsCard">
        <summary><b>🎨 场景道具</b><span class="muted" style="font-weight:400">（点击展开/收回）</span></summary>
        <div class="hint" style="margin-bottom:6px">点图标即放进战斗场景，之后可直接拖动到任意位置；选中后点「删除选中道具」可移除；也支持上传自己的图片当道具。</div>
        <div class="proplist" id="battlePropPalette"></div>
        <input type="file" id="battlePropFile" accept="image/*" multiple style="display:none" onchange="onBattlePropFile(event)">
        <div class="row" style="margin-top:6px;gap:6px">
          <button class="small ghost" onclick="document.getElementById('battlePropFile').click()">＋ 上传自定义道具</button>
          <button class="small danger" onclick="deleteSelectedBattleProp()">🗑 删除选中道具</button>
        </div>
      </details>
    </div>
    <div class="card" id="activePanel"><div class="hint">点场景里的头像或成员行，这里出现 HP/攻击/道具面板。</div></div>
    <div class="card" id="combatMemberCard">
      <div class="panel-head"><b>🪖 战斗成员</b></div>
      <div class="tblwrap"><table id="combatTable"><thead><tr>
        <th style="width:26px"></th><th>成员</th><th>阵营</th><th class="num">敏捷</th><th>生命</th>
        <th>SAN</th><th>MP</th><th>状态</th><th style="width:128px"></th>
      </tr></thead><tbody id="combatBody"></tbody></table></div>
      <div id="combatEmpty" class="hint" style="padding:10px">战斗场景为空：点上方「👥 添加角色」加入调查员 / NPC。</div>
    </div>
    <div class="card" id="combatLogCard"><h3>📜 行动日志</h3><div id="diceLog" class="log"></div></div>
  </div>`;
  $('helpModal').innerHTML = `<div class="modal" style="max-width:760px"><div class="modal-head"><b>使用说明</b><button class="ghost" onclick="document.getElementById('helpModal').classList.remove('open')">✕</button></div>
  <div class="modal-body" style="font-size:13px">
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <button class="small primary" onclick="openWelcome()">📥 支持的人物卡（4 种）/ 下载空白卡</button>
      <span class="hint">第一次打开会自动弹这个说明，这里可以随时重看。</span>
    </div>
    <h4>📥 导入调查员卡</h4><p>把受支持的 4 种卡中任意一张填好的 .xlsx 拖进「调查员」页的虚线框（或点击选择），解析后直接入库。姓名 / 玩家 / 职业 / 属性 / 全部技能 / 武器表 / 随身物品（卡右侧「背包格」那一列也并进同一张清单）/ 法术 / 现金与资产表 / 背景 9 条 + 正文 / 卡右上角「任意特长」/ 调查员经历都会读进来。武器行「只选了类型、名字留空」也照样读（用类型当显示名）。</p>
    <h4>✏️ 编辑调查员</h4><p>点小卡右下角 ✏️：属性、护甲（可挑参考防具预置）、HP/SAN/MP、技能（高于基础值的算「已加点」排上面，其余收进折叠区）、武器、背包 / 随身用品、剧情道具、法术、资产、背景、经历都在这里改。武器「类型」可从卡里「武器列表」下拉选，选完技能 / 伤害 / 射程 / 弹匣会自动填好。</p>
    <h4>⬇ 导出人物卡</h4><p>小卡右下角 ⬇ 导出卡：先按“最初导入那张卡”算出这次团的变化，写进卡里的「调查员经历」（模组名用顶部「🎪 本次团名」，技能变化写进「成长」列），再把整张卡填进<b>你导入时用的那张模板</b>下载，文件名是 团名-角色名.xlsx。卡里原本的公式都会保留：武器“选类型自动算”、成功率按使用技能取值（查不到该技能时保留公式 + 原卡数值，不留空、不乱码）、信用评级、本职★ 查表、<b>属性雷达图</b>；自定义子技能名按卡里「类别 + 具体名」两格分段写回；卡右上角「任意特长」照原样读写（详情卡里不单独列出）；中式职业扩展那张卡的本职技能按它自己的职业表算。</p>
    <h4>📊 属性雷达图</h4><p>点小卡右下角 ✏️ 打开详情，属性 3×3 右边就是雷达图（力量 / 体质 / 体型 / 敏捷 / 外貌 / 智力 / 意志 / 教育 / 幸运），和卡里「附表」那张九维图同一套数，改属性会实时重画。</p>
    <h4>📖 模组（右半屏）</h4><p>菜单栏点「📖 模组」：左边照常带团，右半边用来放模组。支持 <b>PDF</b>、<b>Word（.docx）</b>、<b>图片</b>（png / jpg / gif / webp…）、<b>txt / md</b>。可以「⬆ 添加文件」一次选多个、点「📁 文件夹」整个文件夹加进来，或者直接把文件 / 文件夹拖到右半屏里；加进去的会在顶上排成一排<b>标签页</b>，点一下换一份，标签上的 ✕ 把那份移出去，多文件模组不用再来回换。Word 会连着表格 / 图片 / 标题一起排成网页看（还能调字号），上方搜索框回车可高亮命中、↑ ↓ 逐条跳转；PDF 用浏览器自带阅读器（可缩放、可搜）；图片点一下在「适应窗口 / 原始大小」之间切。文件存在本机浏览器里（刷新后还在），不会上传。中间的细条可拖动调整左右宽度，双击回一半一半。</p>
    <h4>📚 规则书（右半屏）</h4><p>菜单栏点「📚 规则书」：整套 COC7 核心规则书按<b>原版 PDF</b>放在右半屏，表格 / 颜色 / 流程图和纸书一模一样；左边有 <b>书签目录</b>（点条目直接跳页）和 <b>全文搜索</b>（输入关键词回车，命中页会列出来，点一下就跳过去），目录可以「☰ 收起目录 / 展开目录」。</p>
    <h4>🏷 便签标签</h4><p>调查员页最左侧可自定义标签（emoji、任意长度、可改色、可删）。点选标签再点小卡即可贴上，也能直接把标签拖到小卡上；便签可挪到别的卡，点 ✕ 移除，每张小卡最多 6 个。</p>
    <h4>👤 NPC 与敌人</h4><p>先选<b>类别</b>（人类 / 动物 / 神话生物，默认「全部」），再选<b>具体条目</b>，设数量后生成 —— 属性按规则书的骰式现掷（如 CON 2D6×5），所以每次生成都是新的随机值；神话生物已按规则书预填标志性法术。之后还能改阵营与数值。四列小卡（盟友 / 中立 / 敌人 / 其他）可拖拽排序，列名点标题就能改。</p>
    <h4>🗺️ 地图与路线</h4><p>上面一条二级菜单栏：🗺 地图（切地图 / 载入预设 / 缩放 / 比例尺 / 换底图）· 🧍 地图角色 · 🧩 摆件素材 · 🚗 载具·时间速度（点开就用，再点收起，一次只开一个），下面整幅地图占满宽度，再往下是路线时间计算 / 地点 / 道路路径（一张地图都没有时也还在，会提示你「＋ 新建地图」）。三个工具：🖱 拖动地点（相连道路的 km 实时重算）· 🧍 移动角色/摆件（只挪角色和素材，不动地点与道路）· 📍 添加地点。比例尺「1格 = __ km」→ 设。</p>
    <h4>⚔️ 战斗</h4><p>上面一条二级菜单栏：👥 添加角色（把调查员 / NPC / 临时成员加入战斗）· ⚔️ 战斗桌（本次战斗标题 / 下一轮 / 清空，点开就用、再点收起），下面战斗场景占满宽度，再往下依次是战斗成员表、行动日志；点角色后详情浮在屏幕最左侧。成员自动左右排布（可拖动）；攻击不用先选目标，直接打对面第一个还站着的成员；改 HP/SAN/MP/护甲或实时增删武器 / 道具 / 法术都会同步回角色档案与小卡，也可点「↻ 同步档案」。状态徽标与 🎨 场景道具素材库都在这一页。</p>
    <h4>🎲 骰子与 SAN 检定</h4><p>顶部「📜 剧本/笔记」「🎲 骰子」是悬浮栏目，不切页面、一次只开一个。骰子可指定角色与技能（技能按数值从高到低排，已加点带 ☆），1D100 自动给出普通 / 困难 / 极难 / 大成功 / 大失败；SAN 页可做理智检定、损失掷骰、INT 判定与疯狂症状，损失会自动写回角色。</p>
    <h4>⛶ 场景全屏</h4><p>地图 / 战斗场景都有「⛶ 全屏」（Esc 或右下角 ↩ 返回退出）。全屏后右下角只剩图标菜单，其中 📋调查员 / 👤NPC与敌人 / 📜剧本笔记 / 🎲骰子 是压在场景上的半屏浮层，一次只开一个。战斗里点角色，详情都浮在屏幕最左侧（普通模式也一样）；地图全屏时工具栏缩到左下角。</p>
    <h4>💾 数据</h4><p>数据只存本机浏览器。请常用右上角「⬇ 备份数据」导出 JSON 定期存档；本工具不上传任何数据。「⚠️ 清空全部本地数据」会连上传的模组一起清掉。</p>
    <div class="vdiv"></div>
    <button class="danger" onclick="wipeData()">⚠️ 清空全部本地数据</button>
  </div></div>`
  loadState();
  ensureV2Data();
  applySrvPanels();
}

/* 调查员页的两块可折叠区：标签栏 / 导入栏（状态记在本机） */
function srvPanelCfg(){
  if(!state) return {};
  if(!state.ui) state.ui={};
  if(!state.ui.srv) state.ui.srv={};
  return state.ui.srv;
}
function toggleSrvPanel(which){
  var c=srvPanelCfg();
  if(c[which]==null) c[which]=false;
  c[which]=!c[which];
  saveStateQuiet();
  applySrvPanels();
}
function applySrvPanels(){
  var c=srvPanelCfg();
  [['tagSideBody','tagSideIco','tag'],['importBody','importIco','import']].forEach(function(x){
    var body=$(x[0]), ico=$(x[1]);
    if(!body) return;
    var collapsed=!!c[x[2]];
    body.hidden=collapsed;
    if(ico) ico.textContent=collapsed?'▸':'▾';
    var card=body.closest?body.closest('.card'):null;
    if(card) card.classList.toggle('collapsed',collapsed);
  });
}
