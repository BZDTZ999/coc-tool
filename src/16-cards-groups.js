/* ---------- C. 调查员卡：紧凑信息+右上头像+HP/SAN/MP/法术+DB/武器+剧情道具 ---------- */
/* 调查员经历 → “跑过几个团” → 小卡外框等级：
   0 = 默认；1~5 = 每团叠一条 2px 金属边（铁/铜/银/金/白金）；
   6 = 4px 发光翡翠；7 = 发光钻石；8+ = 发光火焰（外圈呼吸不变）；
   8 团起每多跑一个团，右下角多一颗会呼吸的星星；
   8 团起左下角别一枚做旧牛皮纸小标签「传奇调查员」。 */
function runCount(a){ return Array.isArray(a&&a.campaigns)?a.campaigns.length:0; }
/* 便签条：斜插在小卡右上角，最多 6 个；可拖到别的卡移动、点 ✕ 移除 */
function pcTagChipsHTML(a){
  var tags=(a&&a.tags)||[];
  if(!tags.length) return '';
  return '<div class="pctagbox">'+tags.slice(0,6).map(function(t){
    var moving=(typeof tagMoving!=='undefined'&&tagMoving&&tagMoving.aid===a.id&&tagMoving.tagId===t.id)?' moving':'';
    return '<span class="pctag'+moving+'" draggable="true" data-aid="'+esc(a.id)+'" data-tagid="'+esc(t.id)+'"'
      +' ondragstart="tagCardDragStart(event,\''+a.id+'\',\''+t.id+'\')"'
      +' title="拖动到另一张卡可移动；点击可选中后点另一张卡移动；点 ✕ 移除"'
      +' style="--tagc:'+esc(t.color||'#e3c47f')+';color:'+esc((typeof tagFg==='function')?tagFg(t.color||'#e3c47f'):'#26210f')+'">'
      +'<span class="t">'+esc(t.name)+'</span><button class="pctagx" title="移除标签">✕</button></span>';
  }).join('')+'</div>';
}
function pcRunClass(a){
  var n=runCount(a);
  if(n<=0) return '';
  if(n<=5) return 'runs'+n;
  if(n===6) return 'runs6';
  if(n===7) return 'runs7';
  return 'runs8';
}
/* 透明文件框自身被点中时，绝不能让它冒泡到 .pcav 的 onclick：
   否则那里的 preventDefault() 会取消 <input type=file> 打开选图框的默认行为，导致“点头像没反应”。 */
function pcAvatarFileStop(ev){
  if(ev && ev.stopPropagation) ev.stopPropagation();
}
function pcAvatarClick(ev, aid){
  if(ev && ev.target && ev.target.classList && ev.target.classList.contains('pcavfile')) return; /* 交给原生文件框 */
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  var host=(ev&&ev.currentTarget&&ev.currentTarget.querySelector)?ev.currentTarget:null;
  var inp=host?host.querySelector('input[type=file]')
    :document.querySelector('#pcList .pccard[data-id="'+aid+'"] .pcav input[type=file]');
  if(inp) inp.click();
}
function onPcAvatarFile(ev, aid){
  var f=ev.target.files && ev.target.files[0];
  if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){
    var a=actorById(aid);
    if(!a) return;
    if(!a.avatar) a.avatar={preset:defaultAvatarForActor(a.kind,a.side),custom:null};
    a.avatar.custom=String(rd.result||'');
    saveState();
    try{ if(a.kind==='npc') renderNpcs(); else renderSurveyors(); }catch(e){}
    toast('头像已更新');
  };
  rd.readAsDataURL(f);
}
function pcCardHTML(a){
  var at=a.attrs||{};
  var runCls=pcRunClass(a);
  var runN=runCount(a);
  /* 8 团起步：每多跑一个团，右下角多一颗星星（最多铺 8 颗，再多用 +N 表示） */
  var starN=runN>=8?(runN-7):0;
  var starExtra=0;
  if(starN>8){ starExtra=starN-8; starN=8; }
  var stars='';
  for(var si=0; si<starN; si++) stars+='<i>⭐</i>';
  var runStars=starN?('<span class="runstars" aria-hidden="true">'+stars+(starExtra?'<b>+'+starExtra+'</b>':'')+'</span>'):'';
  var legendTag=runN>=8?'<span class="pclegend" aria-hidden="true">传奇调查员</span>':'';
  var line1=[a.occupation&&('职业 '+a.occupation),a.sex,a.age&&(a.age+'岁')]
    .filter(Boolean).join(' · ');
  var line2=[a.player&&('玩家 '+a.player),a.residence&&('住地 '+a.residence),a.hometown&&('故乡 '+a.hometown)]
    .filter(Boolean).join(' · ');
  var wpns=(a.weapons||[]).map(function(w){return w.name+(w.damage?'('+w.damage+')':'');}).join('、');
  var plot=(a.plot||[]).filter(function(p){return p&&String(p.name||'').trim();});
  var attrOrder=['str','dex','pow','con','app','edu','siz','int','luck'];
  var attrCells=attrOrder.map(function(k){
    var lb=ATTR_LABELS.filter(function(x){return x[0]===k;})[0];
    var en=lb?String(lb[1]).split(' ')[0]:String(k).toUpperCase();
    var cn=(lb&&lb[2])?String(lb[2]).split(' ')[0]:'';
    return '<span class="pctile" title="'+(lb?esc(lb[2]):'')+'"><b>'+esc(en)+'</b><i>'+esc(cn)+'</i><em>'+(at[k]||0)+'</em></span>';
  }).join('');
  return `<div class="actorcard pccard${runCls?' '+runCls:''}" data-id="${a.id}" ondragover="event.preventDefault()" ondrop="tagCardDrop(event,'${a.id}')">${runStars}${legendTag}
    ${pcTagChipsHTML(a)}
    <div class="pchead">
      <div class="pcinfo">
        <div class="pcnameline"><span class="badge blue">调查员</span><b class="nm">${esc(a.name||'未命名')}</b></div>
        <div class="pcmeta">${esc(line1||'基本信息未填')}</div>
        ${line2?'<div class="pcmeta muted">'+esc(line2)+'</div>':''}
        <div class="pcatts9">${attrCells}</div>
      </div>
      <div class="pcav" onclick="pcAvatarClick(event,'${a.id}')" title="">
        ${(a.avatar&&a.avatar.custom)?'<img src="'+esc(a.avatar.custom)+'" alt="">':'<span class="emoji">'+esc((a.avatar&&a.avatar.preset)||AVATAR_DEFAULT_PC)+'</span>'}
        <input class="pcavfile" type="file" accept="image/*" title="" aria-label="上传头像" onclick="pcAvatarFileStop(event)" onchange="onPcAvatarFile(event,'${a.id}')">
      </div>
    </div>
    ${barsHTML(a)}
    ${spellsLineHTML(a)}
    <div class="pcdbwpn"><span class="mono">DB ${esc(a.db||'-2')}</span><span class="wpnlbl">${esc(wpns||'无武器')}</span></div>
    <div class="plotmini" title="剧情道具">🎬 ${plot.length?esc(plot.map(function(p){return p.name+(p.qty>1?('×'+p.qty):'');}).join('、')):'（无剧情道具）'}</div>
    <div class="pcbtns">
      <button class="small" title="编辑" onclick="openActorModal('${a.id}','pc')">✏️ 编辑</button>
      <button class="small ghost" title="导出到《空白人物卡》模板（.xlsx）" onclick="exportActorCard('${a.id}')">⬇ 导出卡</button>
      <button class="small danger" title="删除" onclick="deleteActor('${a.id}')">🗑 删除</button>
    </div>
  </div>`;
}
function npcGroupIdx(a){
  var s=sideOf(a);
  if(s==='调查员'||s==='盟友') return 0;
  if(s==='中立') return 1;
  if(s==='敌人') return 2;
  return 3;
}
function npcGroupLabel(k){
  return (state.ui&&state.ui.npcGroups&&state.ui.npcGroups[k])||['盟友','中立','敌人','其他'][k];
}
function npcMiniHTML(a){
  var s=sideOf(a);
  var spellCount=(a.spells||[]).length;
  return `<div class="npcmini" data-id="${a.id}" draggable="true" ondragstart="npcDragStart(event)" ondragover="event.preventDefault()" ondrop="npcDrop(event)" title="可拖拽排序">
    <div class="row" style="gap:6px;align-items:flex-start">
      ${avatarView(a,'sm')}
      <div style="min-width:0;flex:1">
        <div class="row" style="gap:4px;flex-wrap:wrap">
          <b class="nm" style="font-size:12.5px">${esc(a.name)}</b>
          <span class="sidebadge side-${esc(s)}">${esc(s)}</span>
        </div>
      </div>
    </div>
    <div class="row" style="gap:4px;margin-top:5px;align-items:center">
      <select class="npc-side" style="flex:1 1 0;min-width:0;font-size:11px;padding:1px 4px" onchange="quickSetNpcSide('${a.id}',this)">
        <option value="">阵营…</option>
        ${SIDES.filter(function(x){return x!=='调查员';}).map(function(x){return '<option value="'+x+'"'+(s===x?' selected':'')+'>'+x+'</option>';}).join('')}
        <option value="__custom__">✎ 自定义阵营…</option>
      </select>
      <span class="badge">×${a.count||1}</span>
    </div>
    <div style="margin-top:4px">${barsHTML(a)}</div>
    ${spellCount?('<div class="spellline" style="font-size:10.5px;gap:3px;margin-top:3px">🔮 '+(a.spells||[]).slice(0,3).map(function(sp){return '<span class="spelltag">'+esc(sp.name||'未名法术')+'</span>';}).join('')+(spellCount>3?'<span class="muted">+'+spellCount+'</span>':'')+'</div>'):''}
    <div class="row" style="gap:3px;margin-top:5px">
      <button class="small primary" title="加入战斗" onclick="combatPreAdd('${a.id}')">⚔️</button>
      <button class="small" title="编辑" onclick="openActorModal('${a.id}','npc')">✏️</button>
      <button class="small ghost" title="复制" onclick="duplicateActor('${a.id}')">⧉</button>
      <button class="small danger" title="删除" onclick="deleteActor('${a.id}')">🗑</button>
      <span style="flex:1"></span>
      ${isCoarseTouch()?''+'<button class="small ghost" title="在阵营内前移" onclick="npcMoveInGroup(\'${a.id}\',-1)">◀</button><button class="small ghost" title="在阵营内后移" onclick="npcMoveInGroup(\'${a.id}\',1)">▶</button>':'<span class="muted" style="font-size:10px">☰拖</span>'}
    </div>
  </div>`;
}
function renderNpcs(){
  npcTplOptions();
  var list=state.actors.filter(function(x){return x.kind==='npc';});
  var el=$('npcList');
  if(!list.length){ el.innerHTML='<div class="hint">还没有 NPC。用上方模板生成一批，或手动新建。NPC 库按阵营四列显示，每行两张小卡，可拖拽排序。</div>'; return; }
  var groups=[[],[],[],[]];
  list.forEach(function(a){ groups[npcGroupIdx(a)].push(a); });
  var labels=(state.ui&&state.ui.npcGroups)||['盟友','中立','敌人','其他'];
  el.innerHTML='<div class="npccols">'+groups.map(function(g,gi){
    var body=g.length?g.map(npcMiniHTML).join(''):'<div class="hint" style="padding:6px">（空）</div>';
    return `<div class="npccol" data-group="${gi}">
      <div class="npchead"><span style="flex:1"></span>
        <input class="npclabel" value="${esc(labels[gi])}" data-group="${gi}" onchange="npcGroupRename(${gi},this.value)" title="点这里可改阵营列名称">
      </div>
      <div class="npcminigrid" ondragover="event.preventDefault()" ondrop="npcDrop(event)">${body}</div>
    </div>`;
  }).join('')+'</div>';
}
function npcGroupRename(gi,v){
  if(!state.ui) state.ui={}; if(!state.ui.npcGroups) state.ui.npcGroups=['盟友','中立','敌人','其他'];
  state.ui.npcGroups[gi]=(v||'').trim()||['盟友','中立','敌人','其他'][gi];
  saveStateQuiet();
}
function npcDragStart(ev){
  ev.dataTransfer.setData('text/plain', ev.currentTarget.dataset.id);
  ev.dataTransfer.effectAllowed='move';
}
function npcDrop(ev){
  ev.preventDefault();
  var dragId=ev.dataTransfer.getData('text/plain');
  var tgt=ev.target.closest('.npcmini');
  if(!dragId||!tgt||dragId===tgt.dataset.id) return;
  var list=state.actors;
  var di=list.findIndex(function(a){return a.id===dragId;});
  var ti=list.findIndex(function(a){return a.id===tgt.dataset.id;});
  if(di<0||ti<0) return;
  if(npcGroupIdx(list[di])!==npcGroupIdx(list[ti])) return;
  var it=list.splice(di,1)[0];
  var nti=list.findIndex(function(a){return a.id===tgt.dataset.id;});
  list.splice(nti+ (di<nti?1:0), 0, it); // drop 目标之后
  saveStateQuiet(); renderNpcs(); toast('已调整顺序');
}
function isCoarseTouch(){
  try{ return window.matchMedia && window.matchMedia('(pointer:coarse)').matches; }catch(e){ return false; }
}
function npcMoveInGroup(id, dir){
  var arr=state.actors.filter(function(a){return a.kind==='npc';});
  var i=arr.findIndex(function(a){return a.id===id;}); if(i<0) return;
  var gi=npcGroupIdx(arr[i]);
  var j=i+dir;
  while(j>=0&&j<arr.length&&npcGroupIdx(arr[j])!==gi) j+=dir;
  if(j<0||j>=arr.length) return;
  var tgtId=arr[j].id;
  var all=state.actors;
  var di=all.findIndex(function(a){return a.id===id;}); if(di<0) return;
  var it=all.splice(di,1)[0];
  var nti=all.findIndex(function(a){return a.id===tgtId;});
  all.splice(nti+(dir>0?1:0),0,it);
  saveStateQuiet(); renderNpcs();
}
function quickSetNpcSide(id, sel){
  var a=state.actors.filter(function(x){return x.id===id;})[0]; if(!a) return;
  var v=sel.value;
  if(v==='__custom__'){
    var nm=prompt('自定义阵营名称（如：教会 / 守卫 / 神话仆从）：', a.side||'');
    if(nm===null){ sel.value=a.side||''; return; }
    v=nm.trim()||'敌人';
  }
  if(!v){ sel.value=a.side||''; return; }
  a.side=v;
  if(!a.avatar) a.avatar={};
  saveState(); renderNpcs(); toast('阵营：'+a.side);
}
