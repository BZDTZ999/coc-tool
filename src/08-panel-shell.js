/* ---------- 页面骨架（覆盖旧版，去掉“载具·骰子·数据”页） ---------- */
function scaffoldSections(){
  // 调查员
  $('tab-surveyors').innerHTML = `
  <div class="srvcols">
    <div class="srvside">
      <div class="card">
        <div class="panel-head srvside-head" onclick="toggleTagSide()" title="点这里展开/收起标签栏"><b>🏷 标签栏</b><span class="hint" style="font-size:11px">点选→点小卡</span></div>
        <div class="row" style="gap:5px;flex-wrap:nowrap;align-items:center">
          <input type="text" id="tagNameInput" placeholder="标签名（可 emoji）" style="flex:1;min-width:0" onkeydown="if(event.key==='Enter')addTagLib()">
          <input type="color" id="tagColorInput" value="#e3c47f" title="标签颜色">
          <button class="small primary" title="新建标签" onclick="addTagLib()">＋</button>
        </div>
        <div id="tagLib" class="taglib"></div>
        <div class="hint" style="margin-top:8px;line-height:1.7">点选一个标签再点调查员小卡即可贴上；也可直接把标签拖到小卡上。小卡右上角的便签条可以拖到另一张卡，或点 ✕ 移除。每张小卡最多 6 个标签。</div>
      </div>
    </div>
    <div class="srvmain">
      <div class="card">
        <h3>📥 从《空白人物卡》系列 .xlsx 导入调查员</h3>
        <div id="dropZone" class="notice" style="cursor:pointer;border:2px dashed var(--acc)">
          🖱 直接把人物卡 .xlsx 拖到这里，即可解析（也支持点击选择文件）
        </div>
        <input type="file" id="fileImport" accept=".xlsx,.xls" style="display:none" onchange="onPickCardFile(event)">
        <div id="importPreview"></div>
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
      <label>模板<select id="npcTplSel"></select></label>
      <label style="max-width:110px">数量<input type="number" id="npcTplCount" value="1" min="1" style="width:80px"></label>
      <label>默认阵营<select id="npcTplSide"></select></label>
      <button onclick="genNpcFromTpl()" class="primary">🎲 按模板生成</button>
      <button onclick="openActorModal(null,'npc')">✏️ 手动新建 NPC</button>
    </div>
    <div class="hint" style="margin-top:6px">数量=该队在场景中的个体数；阵营决定 NPC 在战斗场景里默认站左（调查员/盟友）还是站右（中立/敌人）。</div>
  </div>
  <div id="npcList"></div>`;
  // 地图
  $('tab-maps').innerHTML = `
  <div class="mapcols">
    <div>
      <div class="card">
        <div class="panel-head"><b>🗂 地图角色</b><span class="muted" style="font-size:11px">点一下加入地图</span></div>
        <div id="mapActorsBox"></div>
      </div>
      <details class="card ccard" data-coll="props">
        <summary><b>🧩 摆件素材</b><span class="muted" style="font-weight:400">（点击展开/收回）</span></summary>
        <div class="hint" style="line-height:1.8;margin-bottom:6px">点按放入画布<br>可拖动 / 删除</div>
        <div class="proplist" id="propPalette"></div>
        <input type="file" id="customPropFile" accept="image/*" multiple style="display:none" onchange="addCustomPropFiles(event)">
      </details>
    </div>
    <div>
      <div class="card">
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
        <div class="row tabs-mini" id="mapTools" style="margin-top:8px">
          <button id="mt-select" class="active" onclick="setMapTool('select')" title="只拖动地点；相连道路的 km 会实时重算">🖱 拖动地点</button>
          <button id="mt-move" onclick="setMapTool('move')" title="只拖动地图角色与摆件，不动地点和道路">🧍 移动角色/摆件</button>
          <button id="mt-add" onclick="setMapTool('add')">📍 添加地点</button>
          <button class="ghost small" onclick="deleteSelectedObj()">🗑 删除选中</button>
          <button class="ghost small" onclick="rotateMap(90,'all')" title="整体旋转 90°：底图、地点、摆件和文字一起转">🔄 整体旋转</button>
          <button class="ghost small" onclick="rotateMap(90,'upright')" title="地图旋转 90°：只有地图转，文字保持水平">↻ 地图旋转</button>
          <button class="ghost small" id="mapFsBtn" onclick="toggleSceneFs('map')" title="全屏查看地图（右下角 ↩ 返回退出）">⛶ 全屏</button>
          <span class="drag-hint" id="mapDragHint" style="margin-left:auto">🖱 拖动地点（相连道路 km 实时重算）· 🧍 移动角色/摆件 · 角色也可单击左栏再拖到位置</span>
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
        <div id="mapHint" class="hint" style="margin-top:4px">“📍 添加地点”后在图上落点；“🖱 拖动地点”只动地点并实时重算相连道路的 km；“🧍 移动角色/摆件”只挪角色和素材，不会碰到地点与道路。载入预设地图时里程已按当前比例尺算好。</div>
      </div>
      <div id="routeCard"></div>
      <div class="grid2">
        <div id="mapPointsCard"></div>
        <div id="mapLegsCard"></div>
      </div>
    </div>
    <div>
      <div class="card" style="position:sticky;top:64px">
        <details class="ccard" data-coll="veh" id="mapVehCard">
          <summary><b>🚗 载具 / 时间速度</b>
            <button class="small ghost" style="font-weight:400" onclick="event.preventDefault();event.stopPropagation();resetVehicles()">恢复默认</button>
            <span class="muted" style="font-weight:400">（点击展开/收回）</span>
          </summary>
          <div id="mapVehicles"></div>
        </details>
      </div>
    </div>
  </div>`;
  // 战斗
  $('tab-combat').innerHTML = `
  <div class="combcols">
    <div class="comb-side comb-side-left">
      <div class="card" id="activePanel"><div class="hint">点场景里的头像或成员行，这里出现 HP/攻击/道具面板。</div></div>
    </div>
    <div class="comb-mid">
      <div class="card">
        <h3>⚔️ 战斗桌</h3>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <label>加入类型<select id="cbAddKind" onchange="refreshCombatAddSel()">
            <option value="pc">调查员</option><option value="npc">NPC / 敌人</option><option value="ad">临时手动成员</option>
          </select></label>
          <label>角色<select id="cbAddSel"></select></label>
          <label>数量<input type="number" id="cbAddCount" value="1" min="1" style="width:70px"></label>
          <button class="primary" onclick="combatAdd()">加入战斗</button>
          <span style="flex:1"></span>
          <button onclick="combatNewRound()">⏭ 下一轮（按敏捷排序）</button>
          <button class="ghost" onclick="combatClear()">清空战斗</button>
        </div>
      </div>
      <div class="card">
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
          <span class="hint">通过下方成员栏加入/移出，头像上显示 HP/SAN/MP</span>
          <span class="scene-side side-敌人">→ 敌人阵营 右</span>
        </div>
        <details class="ccard" data-coll="bprops" id="battlePropsCard">
          <summary><b>🎨 场景道具</b><span class="muted" style="font-weight:400">（点击展开/收回；油桶·爆炸·椅子·餐桌·雕像等 60+）</span></summary>
          <div class="hint" style="margin-bottom:6px">点图标即放进战斗场景，之后可直接拖动到任意位置；选中后点「删除选中道具」可移除；也支持上传自己的图片当道具。</div>
          <div class="proplist" id="battlePropPalette"></div>
          <input type="file" id="battlePropFile" accept="image/*" multiple style="display:none" onchange="onBattlePropFile(event)">
          <div class="row" style="margin-top:6px;gap:6px">
            <button class="small ghost" onclick="document.getElementById('battlePropFile').click()">＋ 上传自定义道具</button>
            <button class="small danger" onclick="deleteSelectedBattleProp()">🗑 删除选中道具</button>
          </div>
        </details>
      </div>
      <div class="card">
        <div class="row" style="justify-content:space-between"><b id="combatTitle"></b><span id="combatRoundBadge" class="muted"></span></div>
        <div class="tblwrap"><table id="combatTable"><thead><tr>
          <th style="width:26px"></th><th>成员（下方增删）</th><th>阵营</th><th class="num">敏捷</th><th>生命</th>
          <th>SAN</th><th>MP</th><th>状态</th><th style="width:128px"></th>
        </tr></thead><tbody id="combatBody"></tbody></table></div>
        <div id="combatEmpty" class="hint" style="padding:10px">战斗场景为空：从上方加入调查员 / NPC。</div>
      </div>
    </div>
    <div class="comb-side comb-side-right">
      <div class="card"><h3>📜 行动日志</h3><div id="diceLog" class="log"></div></div>
    </div>
  </div>`;
  $('helpModal').innerHTML = `<div class="modal" style="max-width:760px"><div class="modal-head"><b>使用说明</b><button class="ghost" onclick="document.getElementById('helpModal').classList.remove('open')">✕</button></div>
  <div class="modal-body" style="font-size:13px">
    <h4>📥 导入调查员卡</h4><p>把《空白人物卡》系列的 .xlsx 拖进「调查员」页的虚线框（或点击选择），解析后直接入库。姓名 / 玩家 / 职业 / 属性 / 全部技能 / 武器表 / 随身物品（卡右侧「背包格」那一列也并进同一张清单）/ 法术 / 现金与资产表 / 背景 9 条 + 正文 / 调查员经历都会读进来。</p>
    <h4>✏️ 编辑调查员</h4><p>点小卡右下角 ✏️：属性、护甲（可挑参考防具预置）、HP/SAN/MP、技能（高于基础值的算「已加点」排上面，其余收进折叠区）、武器、背包 / 随身用品、剧情道具、法术、资产、背景、经历都在这里改。武器「类型」可从卡里「武器列表」下拉选，选完技能 / 伤害 / 射程 / 弹匣会自动填好。</p>
    <h4>⬇ 导出人物卡</h4><p>小卡右下角 ⬇ 导出卡：先按“最初导入那张卡”算出这次团的变化，写进卡里的「调查员经历」（模组名用顶部「🎪 本次团名」，技能变化写进「成长」列），再把整张卡填进《空白人物卡》模板下载，文件名是 团名-角色名.xlsx。卡里原本的公式都会保留：武器“选类型自动算”、成功率按使用技能取值、本职★ 查表。</p>
    <h4>🏷 便签标签</h4><p>调查员页最左侧可自定义标签（emoji、任意长度、可改色、可删）。点选标签再点小卡即可贴上，也能直接把标签拖到小卡上；便签可挪到别的卡，点 ✕ 移除，每张小卡最多 6 个。</p>
    <h4>👤 NPC 与敌人</h4><p>选模板（神话生物已按规则书预填标志性法术）→ 设数量 → 生成，之后还能改阵营与数值。四列小卡（盟友 / 中立 / 敌人 / 其他）可拖拽排序，列名点标题就能改。</p>
    <h4>🗺️ 地图与路线</h4><p>最多 3 张地图，可缩放、放大后按住空白处平移。三个工具：🖱 拖动地点（相连道路的 km 实时重算）· 🧍 移动角色/摆件（只挪角色和素材，不动地点与道路）· 📍 添加地点。比例尺「1格 = __ km」→ 设；切换预设地图时里程已按当前比例尺算好。右栏管载具与路线时间。</p>
    <h4>⚔️ 战斗</h4><p>左＝成员详情、中＝战斗桌、右＝行动日志。成员自动左右排布（可拖动）；改 HP/SAN/MP/护甲或实时增删武器 / 道具 / 法术都会同步回角色档案与小卡，也可点「↻ 同步档案」。状态徽标与 🎨 场景道具素材库都在这一页。</p>
    <h4>🎲 骰子与 SAN 检定</h4><p>顶部「📜 剧本/笔记」「🎲 骰子」是悬浮栏目，不切页面、一次只开一个。骰子可指定角色与技能（技能按数值从高到低排，已加点带 ☆），1D100 自动给出普通 / 困难 / 极难 / 大成功 / 大失败；SAN 页可做理智检定、损失掷骰、INT 判定与疯狂症状，损失会自动写回角色。</p>
    <h4>⛶ 场景全屏</h4><p>地图 / 战斗场景都有「⛶ 全屏」（Esc 或右下角 ↩ 返回退出）。全屏后右下角只剩图标菜单，其中 📋调查员 / 👤NPC与敌人 / 📜剧本笔记 / 🎲骰子 是压在场景上的半屏浮层，一次只开一个。战斗全屏时点角色，详情在屏幕最左侧；地图全屏时工具栏缩到左下角。</p>
    <h4>💾 数据</h4><p>数据只存本机浏览器。请常用右上角「⬇ 备份数据」导出 JSON 定期存档；本工具不上传任何数据。</p>
    <div class="vdiv"></div>
    <button class="danger" onclick="wipeData()">⚠️ 清空全部本地数据</button>
  </div></div>`
  loadState();
  ensureV2Data();
}
