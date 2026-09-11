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
    /* Excel 的错误值（#N/A / #VALUE! …）要当空处理：源卡里公式算错时，
       这些字会一路被抄进导出的卡，Excel 打开后满屏 #N/A。 */
    if (/^#(N\/A|VALUE!?|REF!?|DIV\/0!?|NAME\?|NUM!?|NULL!?|GETTING_DATA)/i.test(s)) return '';
    var SKIP = skipSet || ['0','0：00','——','×','刘小红','公元','无','请和kp商议','请看【防具表】','☐'];
    return SKIP.indexOf(s) >= 0 ? '' : s;
  }
  /* 和 clean 一样过滤 Excel 错误值/提示语，但**保留**「×」「——」「0」这类有含义的符号 ——
     武器表的贯穿/射程/装弹量/故障值用的就是这些（clean 会洗掉，导致读卡丢信息）。 */
  function raw(v, skipSet) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/\s+/g, ' ').trim();
    if (!s) return '';
    if (/^#(N\/A|VALUE!?|REF!?|DIV\/0!?|NAME\?|NUM!?|NULL!?|GETTING_DATA)/i.test(s)) return '';
    var SKIP = skipSet || ['刘小红','公元','请和kp商议','请看【防具表】','←请选择类型','→请选择类型'];
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
  /* 「法术一览」里的一行 → 内部法术对象（使用代价尽量拆成 MP / SAN / 用时，拆不出就原样留 cost） */
  function spellFromCard(name, cost, effect) {
    var c = String(cost == null ? '' : cost);
    var o = { name: name, cost: c, effect: String(effect == null ? '' : effect), mp: '', san: '', time: '' };
    var mp = c.match(/(-?\d+(?:[dD]\d+|[+-]\d+)?)\s*(?:点|个)?\s*(?:MP|mp|魔法值)/);
    if (mp) o.mp = mp[1];
    var san = c.match(/(-?\d+[dD]\d+|-?\d+)\s*(?:点|个)?\s*(?:SAN|san|理智值|理智)/);
    if (san) o.san = san[1];
    var tm = c.match(/(\d+(?:[dD]\d+)?\s*(?:分钟|小时|轮|天|min|mins|hour|hours|h|rounds?|day|days)|即时)/i);
    if (tm) o.time = tm[1].replace(/\s+/g, '');
    if (!o.mp && !o.san && !o.time) o.mp = '';   // 拆不出来时导出会回退用 cost 原文
    return o;
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
      items:[], bagItems:[], assets:{}, spells:[], customTraits:[], backstory:{ sections:{}, text:'' }, story:[], campaigns:[], warnings:[]
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
        /* 左半 F/R/J/N/P = 名称/成功率/初始/职业/兴趣；右半 AB/AN/AF/AJ/AL 同义。
           同时记下它所在的格子（slot），导出时按原格子写回，技能顺序就不会乱。 */
        /* 顺序：名称 / 成功率 / 初始 / 职业 / 兴趣 / 成功标 / 本职（★） / 名称后半格
           左半技能的「技能名称」是两格合并的（F:G 是「格斗：」「射击：」「技艺①」这类大类，
           H:I 才是「斗殴」「手枪」「符篆」），只读 F 会得到「格斗：」这种半截名字。 */
        /* 右半的自定义子技能名（如「驾驶：」后面的「摩托」）写在 AD 列，
           卡里 AF 列的成功率公式会去比 AD —— 不读 AD 就丢了自定义技能名。 */
        [['F','R','J','N','P','B','D','H'],['AB','AN','AF','AJ','AL','X','Z','AD']].forEach(function (g) {
          var nm1 = clean(row[colIdx(g[0])]);
          if (!nm1) return;
          var nm2 = g[7] ? clean(row[colIdx(g[7])]) : '';
          var nm = nm2 ? (/[：:·・\s]$/.test(nm1) ? nm1 + nm2 : nm1 + ' ' + nm2) : nm1;
          var tot = num(row[colIdx(g[1])]);
          skills.push({ name: nm, name1: nm1, name2: nm2, base: num(row[colIdx(g[2])]), total: tot,
            occPts: num(row[colIdx(g[3])]), intPts: num(row[colIdx(g[4])]),
            mark: clean(row[colIdx(g[5])]), occ: clean(row[colIdx(g[6])]),
            slot: { r: r + 1, c: g[0] } });
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

    /* —— 武器（行 53..60，0 基 52..59）——
       以前第一行名字是「无」（模板默认那行）就 break，于是**大部分卡一把武器都读不到**。
       现在：空行/占位名往后 continue，只有撞到下一个区块（资产/信用评级…）才收工。
       伤害/射程/贯穿/次数/装弹量/故障值原样保留（「×」「——」这些符号有意义，别被 clean 洗掉）。 */
    var weapons = [];
    if (rowsMain) {
      for (var w = 52; w <= 59; w++) {
        var row = rowsMain[w] || [];
        var rawName = row[colIdx('B')];
        var rawText = (rawName === null || rawName === undefined) ? '' : String(rawName).replace(/\s+/g, ' ').trim();
        if (/^(资产|信用评级|随身|装备|背景)/.test(rawText)) break;   // 武器表结束
        var nm = clean(rawName);
        var wType = raw(row[colIdx('G')]);
        /* 这两种卡里「武器名称」是自由填的，很多玩家（例如「实验司机」那张）只选了「类型」，
           名称那格空着 —— 以前直接 continue，于是整行武器读不到。名字空但类型有内容时照样读，
           用类型当显示名。名字是「无/——」这类占位符的（模板第一行「无 | 肉搏」）跳过。 */
        if (!nm) {
          if (!wType) continue;
          if (/^(无|——|—|×|-|\/|\.)$/.test(rawText)) continue;
          nm = wType;
        }
        var ammoTxt = raw(row[colIdx('AG')]);
        weapons.push({
          name: nm, type: wType,
          skill: raw(row[colIdx('M')]),
          success: num(row[colIdx('Q')]),
          damage: raw(row[colIdx('W')]),
          range: raw(row[colIdx('AA')]),
          pierce: raw(row[colIdx('AC')]),
          attacks: raw(row[colIdx('AE')]),
          ammo: ammoTxt, ammoCap: num(ammoTxt),
          jam: raw(row[colIdx('AJ')])
        });
      }
    }
    result.weapons = weapons;

    /* —— 任意特长（人物卡右上角「你现在有这么多 / 任意特长」下面的 6 个框：
       BA18/BJ18、BA19/BJ19、BA20/BJ20；BA 与 BJ 两列各 3 行，都是合并格）。
       这是玩家自己写的自由文本（比如「考古学」「钓鱼」），原卡用它记自由点数花在哪。
       以前工具完全没读，导出的卡里这段就空了。 */
    var customTraits = [];
    [['BA',18],['BJ',18],['BA',19],['BJ',19],['BA',20],['BJ',20]].forEach(function (t) {
      var v = clean(cellV(ws, t[1], t[0]));
      if (v) customTraits.push(v);
    });
    result.customTraits = customTraits;

    // —— 随身物品（「物品名称」列，表头 78 行，数据 79..95） ——
    var items = [];
    if (rowsMain) {
      for (var it = 78; it <= 94; it++) {
        var nm2 = clean(rowsMain[it] && rowsMain[it][colIdx('F')]);
        if (nm2) items.push({ name: nm2, qty: 1 });
      }
    }
    result.items = items;

    /* —— 「背包格」列（表头 78 行里的“背包格↓/背包格1…”，列位置各卡不同，常见是 N 列）。
       这列是自由文本：换行、符号、带括号的说明都有，原版只读「物品名称」列，整列会丢。
       每个非空格子算一件，顺序按列从左到右、再从上到下。 */
    var bagItems = [];
    if (rowsMain) {
      var bagCols = [];
      [77, 76, 78].forEach(function (hr) {           // 表头行：78 行为主，兼容上下挪一格
        if (bagCols.length) return;
        var hrow = rowsMain[hr] || [];
        for (var hc = 0; hc < hrow.length; hc++) {
          var hv = hrow[hc];
          if (hv !== null && hv !== undefined && String(hv).indexOf('背包格') >= 0) bagCols.push(hc);
        }
      });
      bagCols.forEach(function (c) {
        for (var br = 78; br <= 94; br++) {
          var bv = clean(rowsMain[br] && rowsMain[br][c]);
          if (bv) bagItems.push({ name: bv, qty: 1 });
        }
      });
    }
    result.bagItems = bagItems;

    // —— 法术一览（行 113 表头：编号 / 法术名称 / 使用代价 / 作用；数据行 114..118） ——
    var spells = [];
    if (rowsMain) {
      for (var spr = 113; spr <= 117; spr++) {
        var srow = rowsMain[spr] || [];
        var sid = srow[colIdx('W')];
        var snm = clean(srow[colIdx('Y')]);
        if (sid !== null && sid !== undefined && /例/.test(String(sid))) continue;   // 跳过模板示例行
        if (!snm) continue;
        spells.push(spellFromCard(snm, clean(srow[colIdx('AC')]), clean(srow[colIdx('AH')])));
      }
    }
    result.spells = spells;

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
      detail: clean(cellV(ws, 63, 'L')),
      /* 其他资产表：行 69 表头，内容在行 75（交通工具/住所/奢侈品/股票证券/其他）。
         这五格允许写任意字符（“一辆别克”“1200元”都行），所以原文读出来，不硬转数字。 */
      table: {
        vehicle: raw(cellV(ws, 75, 'B')), residence: raw(cellV(ws, 75, 'F')), luxury: raw(cellV(ws, 75, 'J')),
        stocks: raw(cellV(ws, 75, 'N')), other: raw(cellV(ws, 75, 'R'))
      }
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
