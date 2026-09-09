/* COC「空白人物卡」系列解析器 —— 适配『人物卡』工作表的两种常见排布（原版与苹狗版）。
   值框：标签 W..Z（两行）右侧 AA.. 同两行为填写区；下方大字框为背景故事正文。
   浏览器: window.CoCParser ; Node: require()。依赖 XLSX。 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.CoCParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var colIdx = function (letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
  };
  function cellV(ws, r, col) {
    var key = (typeof col === 'number' ? XLSX.utils.encode_col(col) : col) + r;
    var cell = ws[key];
    return cell && cell.v !== undefined && cell.v !== null ? cell.v : null;
  }
  function clean(v, skipSet) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var SKIP = skipSet || ['0','0：00','——','×','刘小红','公元','无','请和kp商议','请看【防具表】','☐'];
    return SKIP.indexOf(s) >= 0 ? '' : s;
  }
  function num(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var m = String(v).match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  }
  function mergeAt(ws, r, col) {
    var target = XLSX.utils.encode_cell({ r: r - 1, c: typeof col === 'number' ? col : colIdx(col) });
    var ms = ws['!merges'] || [];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      var tl = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
      if (tl === target) return m;
    }
    return null;
  }
  function probeOk(ws, r, colLetter, expect) {
    var v = cellV(ws, r, colLetter);
    return v !== null && String(v).indexOf(expect) >= 0;
  }

  var SECTION_KEYS = {
    appearance: ['形象描述','个人描述','角色外貌','外貌'],
    beliefs: ['思想与信念','信念'],
    people: ['重要之人'],
    places: ['意义非凡之地','意义非凡'],
    belongings: ['宝贵之物','珍爱之物'],
    traits: ['特质','性格'],
    secrets: ['难言之隐','秘密'],
    scars: ['伤口和疤痕','伤口','伤疤'],
    phobias: ['恐惧症和躁狂症','恐惧症','狂躁症']
  };
  function sectionKeyOf(text) {
    var t = String(text || '');
    for (var k in SECTION_KEYS) {
      for (var i = 0; i < SECTION_KEYS[k].length; i++) {
        if (t.indexOf(SECTION_KEYS[k][i]) >= 0) return k;
      }
    }
    return null;
  }

  function parseWorkbook(wb) {
    var result = {
      ok:false, sheet:null, basic:{}, attrs:{}, derived:{}, skills:[], weapons:[],
      items:[], assets:{}, backstory:{ sections:{}, text:'' }, story:[], campaigns:[], warnings:[]
    };
    if (!wb || !wb.Sheets || !wb.SheetNames || !wb.SheetNames.length) {
      result.warnings.push('无法读取该文件，请确认是有效的 .xlsx。');
      return result;
    }
    var sheetName = null;
    ['人物卡','角色卡'].forEach(function (n) { if (!sheetName && wb.Sheets[n]) sheetName = n; });
    if (!sheetName) sheetName = wb.SheetNames[0];
    var ws = wb.Sheets[sheetName];
    result.sheet = sheetName;
    if (!ws) { result.warnings.push('工作簿里没有可用的工作表。'); return result; }
    var warn = result.warnings;

    // 布局自检（两种排布共用坐标；发现标签错位会提示）
    if (!probeOk(ws, 3, 'B', '姓名')) warn.push('第3行B列未找到“姓名”，可能不是常见的人物卡布局。');
    if (!probeOk(ws, 3, 'S', '力量')) warn.push('属性区位置与预期不同（力量）。');
    if (!probeOk(ws, 14, 'B', '技能表')) warn.push('技能表位置与预期不同。');
    if (!probeOk(ws, 51, 'B', '武器表')) warn.push('武器表位置与预期不同。');

    // —— 基本信息 ——
    var basicMap = [
      ['name',3,'E'], ['player',4,'E'], ['era',4,'M'], ['occupation',5,'E'], ['occId',5,'M'],
      ['age',6,'E'], ['sex',6,'M'], ['residence',7,'E'], ['hometown',7,'M']
    ];
    var basic = {};
    basicMap.forEach(function (f) { basic[f[0]] = clean(cellV(ws, f[1], f[2])); });
    // 简化卡备选：若主卡缺姓名，去别的表找（例如有些变体把姓名放别处）
    if (!basic.name) {
      for (var si = 0; si < wb.SheetNames.length; si++) {
        var alt = wb.Sheets[wb.SheetNames[si]];
        if (!alt || alt === ws) continue;
        var rows = null;
        try { rows = XLSX.utils.sheet_to_json(alt, { header: 1, raw: true, defval: null }); } catch (e) { continue; }
        if (!rows) continue;
        for (var r2 = 0; r2 < rows.length && r2 < 60; r2++) {
          for (var c2 = 0; c2 < (rows[r2] || []).length && c2 < 30; c2++) {
            var v = rows[r2] && rows[r2][c2];
            if (v !== null && v !== undefined && /符苏|神仙索/.test(String(v))) {
              // 仅用于探测提示，不写死值
              basic.name = basic.name || '';
              warn.push('提示：在【'+wb.SheetNames[si]+'】发现文字“'+String(v).slice(0,12)+'”，如非姓名请忽略。');
              break;
            }
          }
        }
      }
    }
    result.basic = basic;

    // —— 属性 ——
    var attrCells = {
      str:{r:3,c:'U'}, dex:{r:3,c:'AA'}, pow:{r:3,c:'AG'},
      con:{r:5,c:'U'}, app:{r:5,c:'AA'}, edu:{r:5,c:'AG'},
      siz:{r:7,c:'U'}, int:{r:7,c:'AA'}, luck:{r:7,c:'AG'}
    };
    var order = ['str','con','pow','dex','app','siz','int','edu','luck'];
    var attrs = {}, attrSum = 0;
    order.forEach(function (k) {
      attrs[k] = num(cellV(ws, attrCells[k].r, attrCells[k].c));
      attrSum += attrs[k];
    });
    result.attrs = attrs;
    if (attrSum <= 0) warn.push('属性栏看起来还没有填写（力量~幸运全为 0/空）。');

    // —— 技能表 ——
    var mythos = 0;
    var skills = [];
    var rowsMain = null;
    try { rowsMain = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:null }); } catch (e) { warn.push('技能区读取失败：'+e.message); }
    if (rowsMain) {
      for (var r = 15; r <= 49; r++) {
        var row = rowsMain[r] || [];
        [['F','R','J'],['AB','AN','AF']].forEach(function (g) {
          var nm = clean(row[colIdx(g[0])]);
          if (!nm) return;
          var tot = num(row[colIdx(g[1])]);
          skills.push({ name: nm, base: num(row[colIdx(g[2])]), total: tot });
          if (/克苏鲁神话/.test(nm)) mythos = Math.max(mythos, tot);
        });
      }
    }
    result.skills = skills;
    if (!skills.length) warn.push('没有解析到任何技能。');

    // —— 派生数值 ——
    function dbOf(sum) { if (sum<=64) return '-2'; if (sum<=84) return '-1'; if (sum<=124) return '0'; if (sum<=164) return '+1D4'; return '+1D6'; }
    function buildOf(sum) { if (sum<=64) return '-2'; if (sum<=84) return '-1'; if (sum<=124) return '0'; if (sum<=164) return '1'; return '2'; }
    var hpMaxCard = num(cellV(ws, 10, 'G')), hpCurCard = num(cellV(ws, 10, 'E'));
    var sanCurCard = num(cellV(ws, 10, 'N')), sanMaxCard = num(cellV(ws, 10, 'P'));
    var mpCurCard = num(cellV(ws, 10, 'W')), mpMaxCard = num(cellV(ws, 10, 'Y'));
    var hpMax = Math.floor((attrs.con + attrs.siz) / 10) || 0;
    if (hpMaxCard > 0) hpMax = hpMaxCard;
    var hpCur = hpMaxCard > 0 ? hpMaxCard : hpMax;
    if (hpCurCard > 0) hpCur = hpCurCard;
    var mpMax = Math.floor(attrs.pow / 5) || 0;
    if (mpMaxCard > 0) mpMax = mpMaxCard;
    var mpCur = mpMaxCard > 0 ? mpMaxCard : mpMax;
    if (mpCurCard > 0) mpCur = mpCurCard;
    var sanMax = 99 - mythos;
    if (sanMaxCard > 0) sanMax = sanMaxCard;
    var sanCur = Math.min(attrs.pow || 0, sanMax);
    if (sanCurCard > 0) sanCur = Math.min(sanCurCard, sanMax || 99);
    result.derived = {
      hpMax: hpMax, hpCur: hpCur, mpMax: mpMax, mpCur: mpCur,
      sanMax: Math.max(0, sanMax), sanCur: sanCur,
      mov: num(cellV(ws, 10, 'AF')) || 8,
      db: clean(cellV(ws, 52, 'AP')) || dbOf(attrs.str + attrs.siz),
      build: clean(cellV(ws, 55, 'AP')) || buildOf(attrs.str + attrs.siz),
      armorValue: clean(cellV(ws, 10, 'AN')) || '',
      armorType: clean(cellV(ws, 12, 'AN')) || ''
    };

    // —— 武器 ——
    var weapons = [];
    if (rowsMain) {
      for (var w = 52; w <= 59; w++) {
        var row = rowsMain[w] || [];
        var nm = clean(row[colIdx('B')]);
        if (!nm || /^(资产|信用评级|随身|背景)/.test(nm)) break;
        weapons.push({
          name: nm, type: clean(row[colIdx('G')]) || '格斗',
          skill: clean(row[colIdx('M')]) || '斗殴',
          success: num(row[colIdx('Q')]),
          damage: clean(row[colIdx('W')]) || '1D3',
          range: clean(row[colIdx('AA')]) || '—',
          pierce: clean(row[colIdx('AC')]) || '—',
          attacks: clean(row[colIdx('AE')]) || '1',
          ammo: clean(row[colIdx('AG')]) || '—',
          jam: clean(row[colIdx('AJ')]) || '—'
        });
      }
    }

    // —— 随身物品 ——
    var items = [];
    if (rowsMain) {
      for (var it = 78; it <= 94; it++) {
        var nm2 = clean(rowsMain[it] && rowsMain[it][colIdx('F')]);
        if (nm2) items.push({ name: nm2, qty: 1 });
      }
    }
    result.items = items;

    // —— 调查员经历（每 1 行 = 多跑过 1 个团；位于例子的下方/上方区域 97..111 行） ——
    var campaigns = [];
    if (rowsMain) {
      for (var ca = 97; ca <= 111; ca++) {
        var crow = rowsMain[ca] || [];
        var mod = clean(crow[colIdx('B')]);
        var desc = clean(crow[colIdx('J')]);
        if (/^例[:：]/.test(mod) || /^例[:：]/.test(desc)) continue;   // 跳过示例行
        if (!mod && !desc) continue;
        if (/^(经历模组|调查员经历)$/.test(mod)) continue;             // 防呆：跳过表头
        campaigns.push({ module: mod || '', note: desc || '' });
      }
    }
    result.campaigns = campaigns;

    // —— 资产 ——
    result.assets = {
      credit: clean(cellV(ws, 62, 'B')),
      standard: clean(cellV(ws, 62, 'F')),
      cash: num(cellV(ws, 62, 'O')),
      currency: clean(cellV(ws, 62, 'S')) || '美元',
      otherAssets: clean(cellV(ws, 62, 'L')),
      detail: clean(cellV(ws, 63, 'L'))
    };

    // —— 背景故事：各小节 + 正文 ——
    var sections = {}, sectionOrder = [];
    // 1) 找标签：行 58..84，列 W..Z
    var ms = ws['!merges'] || [];
    var labelFound = [];
    ms.forEach(function (m) {
      if (m.s.r < 57 || m.s.r > 84) return;
      if (m.s.c !== colIdx('W')) return;
      var tl = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
      var txt = ws[tl] ? String(ws[tl].v) : '';
      var key = sectionKeyOf(txt);
      if (!key) return;
      labelFound.push({ row: m.s.r + 1, key: key, text: txt });
    });
    labelFound.sort(function (a, b) { return a.row - b.row; });
    labelFound.forEach(function (sec) {
      if (sections[sec.key] !== undefined) return; // 保留第一个
      var parts = [];
      for (var r = sec.row; r <= sec.row + 1; r++) {
        for (var c = colIdx('AA'); c <= colIdx('AS'); c++) {
          var t = clean(cellV(ws, r, c));
          if (t && t !== '☐' && t !== '/') parts.push(t);
        }
      }
      sections[sec.key] = parts.join(' | ');
      sectionOrder.push(sec.key);
    });
    // 2) 正文：最后一个小节标签下面的大框（W..AS）
    var lastRow = labelFound.length ? labelFound[labelFound.length - 1].row : 75;
    var storyParts = [];
    for (var rs = lastRow + 2; rs <= 93; rs++) {
      for (var cs = colIdx('W'); cs <= colIdx('AS'); cs++) {
        var ts = clean(cellV(ws, rs, cs));
        if (ts && ts !== '☐' && ts !== '/') storyParts.push(ts);
      }
    }
    result.backstory = { sections: sections, sectionOrder: sectionOrder, text: storyParts.join(' | ') };
    result.story = storyParts;

    result.ok = true;
    return result;
  }

  return { parseWorkbook: parseWorkbook, num: num, clean: clean, colIdx: colIdx };
});
