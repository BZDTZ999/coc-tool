/* ---------- 页面骨架（覆盖旧版，去掉“载具·骰子·数据”页） ---------- */
function scaffoldSections(){
  // 调查员
  $('tab-surveyors').innerHTML = `
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
  <div class="grid" id="pcList" style="grid-template-columns:repeat(auto-fill,minmax(330px,1fr))"></div>`;
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
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div style="flex:1;min-width:280px">
            <select id="mapSel" style="display:none" onchange="onMapSelect()"></select>
          </div>
          <div class="row" style="gap:6px;flex-wrap:wrap">
            <button class="small ghost" onclick="loadDemoMap()">示例地图</button>
            <span class="zoomrow">
              <button class="small ghost" title="缩小" onclick="zoomBy(-0.2)">－</button>
              <span id="zoomVal" class="zoomval">100%</span>
              <button class="small ghost" title="放大" onclick="zoomBy(0.2)">＋</button>
              <button class="small ghost" onclick="zoomFit()">适宽</button>
              <button class="small ghost" onclick="zoomReset()">重置</button>
            </span>
            <label class="muted" style="flex-direction:row;align-items:center;gap:4px">1px=<input id="mapScale" type="number" step="0.001" style="width:62px" value="0.02">km<button class="small ghost" onclick="onScaleChange()">设</button></label>
            <label class="muted" style="flex-direction:row;align-items:center;gap:4px">底图<input type="file" id="mapBg" accept="image/*" style="display:none" onchange="onBgPick(event)"><button class="small ghost" onclick="document.getElementById('mapBg').click()">上传</button></label>
          </div>
        </div>
        <div class="row tabs-mini" id="mapTools" style="margin-top:8px">
          <button id="mt-select" class="active" onclick="setMapTool('select')">🖱 选择/拖动</button>
          <button id="mt-add" onclick="setMapTool('add')">📍 添加地点</button>
          <button class="ghost small" onclick="deleteSelectedObj()">🗑 删除选中</button>
          <span class="drag-hint" style="margin-left:auto">拖：地点 / 地图角色 / 摆件 · 角色可单击左栏再拖到位置</span>
        </div>
        <div id="mapWrap"><canvas id="mapCanvas" width="1000" height="620"></canvas></div>
        <div id="mapHint" class="hint" style="margin-top:4px">“添加地点”后在图上落点；角色/摆件都可以拖到任意位置。</div>
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
            <span class="hint">头像可拖动；点选可操作</span>
          </div>
        </div>
        <div class="battlecanvas-wrap"><canvas id="battleCanvas" width="940" height="500"></canvas></div>
        <div class="row" style="justify-content:space-between;margin-top:4px">
          <span class="scene-side side-调查员">调查员阵营 ← 左</span>
          <span class="hint">通过下方成员栏加入/移出，头像上显示 HP/SAN/MP</span>
          <span class="scene-side side-敌人">→ 敌人阵营 右</span>
        </div>
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
  $('helpModal').innerHTML = `<div class="modal" style="max-width:720px"><div class="modal-head"><b>使用说明</b><button class="ghost" onclick="document.getElementById('helpModal').classList.remove('open')">✕</button></div>
  <div class="modal-body" style="font-size:13px">
    <h4>📥 导入卡</h4><p>可直接把《空白人物卡》系列的 .xlsx 拖进“调查员”页的虚线框（或点击选择），解析后直接进入调查员库。思想与信念等 9 类背景会拆成独立条目，人物卡底部的小段文字作为“背景故事正文”录入。</p>
    <h4>👤 角色与头像</h4><p>调查员小卡：左上信息+右上头像，下方 HP/SAN/MP/法术、DB/武器，底部显示剧情道具，编辑/导出/删除在右下。详情卡可设置阵营、从默认头像里选或上传自定义头像，并在背包下方维护“剧情道具”。NPC 第一列为“盟友”，四列带分隔线、每行两张小卡，可拖拽排序。</p>
    <h4>🗺️ 地图与路线</h4><p>地图可缩放；放大后直接按住空白拖动平移。地点/道路/角色名均为黑底白字名牌；加路时可给道路命名并显示在地图上（列表里也能改名）。左栏角色点击上地图并拖动；中栏加摆件（含自定义上传素材）；右栏管理载具并可分配给角色。路线：选起终点与载具→自动最短时间路径，逐段可换乘，附到达时刻。</p>
    <h4>⚔️ 战斗</h4><p>成员自动左右排布：调查员/盟友在左、其余靠右（可拖动）；头像下 HP/SAN/MP 三行彩条显示。选中成员后可直接调整 HP/SAN/MP/护甲（各占一行），并能实时增删武器/道具/法术——改动会自动同步回该角色档案与小卡。神话生物模板已按规则书预填默认法术。攻击自动判定、伤害与弹匣/道具自动扣减。</p>
    <h4>💾 数据</h4><p>数据仅存本机浏览器。请在右上角“⬇ 备份数据”导出 JSON 定期存档；这里不提供任何网络上传。</p>
    <div class="vdiv"></div>
    <button class="danger" onclick="wipeData()">⚠️ 清空全部本地数据</button>
  </div></div>`;
  loadState();
  ensureV2Data();
}
