/* ---------- 拖拽导入 ---------- */
function bindDropZone(){
  var dz=$('dropZone'); if(!dz) return;
  dz.addEventListener('click',function(){ $('fileImport').click(); });
  ['dragenter','dragover'].forEach(function(ev){ dz.addEventListener(ev,function(e){ e.preventDefault(); dz.style.background='rgba(227,196,127,.18)'; }); });
  ['dragleave','drop'].forEach(function(ev){ dz.addEventListener(ev,function(e){ e.preventDefault(); dz.style.background=''; }); });
  dz.addEventListener('drop',function(e){
    var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
    if(!f) return;
    if(!/\.(xlsx|xls)$/i.test(f.name)){ toast('请拖入 .xlsx / .xls 文件'); return; }
    var r=new FileReader();
    r.onload=function(){ parseCardData(new Uint8Array(r.result), f.name); };
    r.readAsArrayBuffer(f);
  });
}
function parseCardData(data, fname){
  try{
    var wb=XLSX.read(data,{type:'array',cellFormula:false});
    if(!window.CoCParser){ toast('解析模块未加载'); return; }
    var parsed=CoCParser.parseWorkbook(wb);
    if(!parsed || parsed.ok===false){ toast('未能识别这张卡的表格结构',5000); return; }
    pendingParse=parsed;
    pendingFile=fname||'人物卡.xlsx';
    renderImportPreview();
    doImport();                       // 读完直接入库（不强制弹窗）
  }catch(err){ toast('解析失败：'+err.message,5000); console.error(err); }
}
function onPickCardFile(e){
  var f=e.target.files&&e.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){ parseCardData(new Uint8Array(r.result), f.name); };
  r.readAsArrayBuffer(f);
}
function renderImportPreview(){
  var box=$('importPreview'); if(!pendingParse){ if(box)box.innerHTML=''; return; }
  var p=pendingParse;
  var warn=p.warnings&&p.warnings.length?('<div class="notice">⚠ '+p.warnings.map(esc).join('<br>')+'</div>'):'';
  var b=p.backstory||{sections:{},text:''};
  var secs=Object.keys(b.sections).filter(function(k){return b.sections[k];});
  box.innerHTML=`
    <div style="margin-top:8px" class="grid2">
      <div class="notice" style="margin:0">已读取「${esc(p.sheet)}」：${esc(p.basic.name||'（姓名空）')} · ${esc(p.basic.occupation||'职业空')} · 属性已读 · 技能 ${p.skills.length} 项 · 武器 ${p.weapons.length} 件 · 物品 ${p.items.length} 件${warn}</div>
      <div class="hint">背景拆条 ${secs.length} 条${p.backstory.text?' + 正文'+p.backstory.text.length+'字':''}</div>
    </div>`;
}


/* ---------- 调查员 / NPC 列表 ---------- */

function npcCardHTML(a){
  var s=sideOf(a);
  return `<div class="actorcard" data-id="${a.id}">
    <div class="hpanel" style="justify-content:space-between">
      <div style="min-width:0">
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <span class="badge ${a.template&&/神话/.test(a.template)?'bad':'warn'}">${esc(a.template||'自定义NPC')}</span>
          ${actorTag(a)}${a.count>1?'<span class="badge">数量×'+a.count+'</span>':''}
          <span class="nm">${esc(a.name)}</span>
        </div>
        <div class="sub">${esc(a.note||a.notes||'')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        ${avatarView(a,'md')}
        <div class="row" style="gap:3px">
          <button class="small primary" title="加入战斗" onclick="combatPreAdd('${a.id}')">⚔️</button>
          <button class="small" title="编辑" onclick="openActorModal('${a.id}','npc')">✏️</button>
          <button class="small danger" onclick="duplicateActor('${a.id}')">复制</button>
          <button class="small danger" onclick="deleteActor('${a.id}')">🗑</button>
        </div>
      </div>
    </div>
    <div style="margin-top:8px"><div class="grid2" style="grid-template-columns:1.2fr 1fr">
      <div style="min-width:0">
        <div style="margin-bottom:4px" class="hint">数量与阵营可改</div>
        <div class="row" style="gap:6px">
          <input type="number" id="npc-count-${a.id}" value="${a.count||1}" min="1" style="width:70px" title="数量">
          <select id="npc-side-${a.id}" onchange="quickSetNpcSide('${a.id}')">
            ${SIDES.map(function(x){return '<option value="'+x+'"'+(s===x?' selected':'')+'>'+x+'</option>';}).join('')}
          </select>
          <button class="small" onclick="quickSetNpcCount('${a.id}')">应用</button>
        </div>
        ${barsHTML(a)}
      </div>
      <div style="min-width:0">
        ${attrs3x3(a,false)}
      </div>
    </div></div>
  </div>`;
}
function quickSetNpcCount(id){
  var a=state.actors.filter(function(x){return x.id===id;})[0]; if(!a) return;
  var el=$('npc-count-'+id); if(el) a.count=Math.max(1,Math.round(num(el.value))||1);
  if(a.name&&/ ×\d+$/.test(a.name)) a.name=a.name.replace(/ ×\d+$/,' ×'+a.count); else if(a.count>1&&!/×/.test(a.name)) a.name=a.name+' ×'+a.count;
  saveState(); renderNpcs(); toast('数量已改为 '+a.count);
}

function renderSurveyors(){
  var list=state.actors.filter(function(x){return x.kind==='pc';});
  $('pcCountTitle').textContent='调查员库（'+list.length+'）';
  $('pcList').innerHTML=list.length?list.map(pcCardHTML).join(''):'<div class="hint">还没有调查员。把《空白人物卡》.xlsx 拖到上方导入，或手动新建。</div>';
  if(pendingParse) renderImportPreview();
}

