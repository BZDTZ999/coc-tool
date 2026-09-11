/* ---------- 战斗成员与面板（无 MOV 列） ---------- */

function combatKindList(kind){
  return kind==='pc'?state.actors.filter(function(a){return a.kind==='pc';}):state.actors.filter(function(a){return a.kind==='npc';});
}
function refreshCombatAddSel(){
  var sel=$('cbAddSel'); if(!sel) return;
  var kind=$('cbAddKind')?$('cbAddKind').value:'pc';
  var list=combatKindList(kind);
  sel.innerHTML=list.length? list.map(function(a){
    return '<option value="'+a.id+'">'+esc(a.name)+(a.kind==='npc'&&a.count>1?' ×'+a.count:'')+' · '+esc(sideOf(a))+'</option>';
  }).join('') : '<option value="">（该类型暂无角色）</option>';
}
function renderCombatShell(){
  refreshCombatAddSel();
  renderCombatRoster();
  placeCombatantsDefault();
  drawBattleScene();
  if(typeof renderBattlePropPalette==='function') renderBattlePropPalette();
}
function combatPreAdd(actorId){
  var a=actorById(actorId); if(!a) return;
  if(typeof fsScene!=='undefined' && fsScene){ if(typeof switchSceneFs==='function') switchSceneFs('combat'); }
  else { switchTab('combat'); }
  var cnt=a.kind==='npc'?(a.count||1):1;
  for(var i=0;i<cnt;i++){
    var c=spawnCombatant(a,i>0?('#'+(i+1)):'');
    state.combat.participants.push(c);
  }
  saveState(); renderCombatShell();
  toast('已加入 '+cnt+' 个「'+a.name+'」');
}
function combatAdd(){
  var kind=$('cbAddKind').value, cnt=Math.max(1,Math.round(num($('cbAddCount').value))||1);
  if(kind==='ad'){
    var nm=prompt('临时成员名称：'); if(nm===null)return;
    var dex=prompt('敏捷 DEX：','50'); var hp=prompt('最大 HP：','10'); var sideSel=prompt('阵营（盟友/中立/敌人，默认敌人）：','敌人')||'敌人';
    var c={id:uid('c'),actorId:null,tag:'临时',name:nm,side:SIDES.indexOf(sideSel)>=0?sideSel:'敌人',
      avatar:{preset:defaultAvatarForActor('npc',sideSel),custom:null},dex:num(dex)||50,mov:8,
      hp:{cur:num(hp)||10,max:num(hp)||10},san:{cur:50,max:99},mp:{cur:0,max:0},db:'0',armor:0,
      skills:[],weapons:[],inv:[],note:'',state:'正常',done:false};
    state.combat.participants.push(c);
  } else {
    var a=actorById($('cbAddSel').value);
    if(!a){ toast('请先选择角色'); return; }
    for(var i=0;i<cnt;i++) state.combat.participants.push(spawnCombatant(a,i>0?('#'+(i+1)):''));
  }
  saveState(); renderCombatShell();
  toast('成员已加入战斗场景');
}
function combatRemove(cid){
  var rem=state.combat.participants.filter(function(c){return c.id===cid;})[0];
  if(rem && typeof combSyncParticipant==='function') combSyncParticipant(rem,{quiet:true});
  state.combat.participants=state.combat.participants.filter(function(c){return c.id!==cid;});
  if(combatScene().pos) delete combatScene().pos[cid];
  if(combActiveId===cid) combActiveId=null;
  saveState(); renderCombatShell(); renderActivePanel();
}
function combatClear(){
  if(!confirmBox('清空战斗场景与所有成员？')) return;
  (state.combat.participants||[]).slice().forEach(function(c){ if(typeof combSyncParticipant==='function') combSyncParticipant(c,{quiet:true}); });
  state.combat.participants=[]; state.combat.round=0;
  state.combat.scene={bg:(state.combat.scene&&state.combat.scene.bg)||null,pos:{},props:[]};
  combActiveId=null;
  saveState(); renderCombatShell(); renderActivePanel();
}
function renderCombatRoster(){
  var body=$('combatBody'); if(!body) return;
  var parts=state.combat.participants||[];
  $('combatTitle').textContent='战斗成员 '+parts.length+' 人 · 第 '+(state.combat.round||0)+' 轮';
  $('combatEmpty').style.display=parts.length?'none':'block';
  body.innerHTML=parts.map(function(c,i){
    var st=c.state||'正常';
    var cls=st==='死亡'?'bad':(st==='正常'?'good':(st==='昏迷'||st==='濒死'||st==='疯狂'?'warn':''));
    var hpPct=c.hp.max?Math.max(0,Math.min(100,c.hp.cur/c.hp.max*100)):0;
    var side=sideOf(c), sideClass='side-'+side;
    var note=(c.note||c.notes||'');
    return `<tr data-id="${c.id}" style="cursor:pointer" onclick="selectComb('${c.id}')">
      <td class="num">${i+1}</td>
      <td><div class="row" style="gap:8px;flex-wrap:nowrap;max-width:260px">${avatarView(c,'sm')}<div style="min-width:0">
        <div class="combmn"><b>${esc(c.name)}</b>${c.tag?' <span class="muted">'+esc(c.tag)+'</span>':''}</div>
        ${note?'<div class="combnm" title="'+esc(note)+'">'+esc(note.slice(0,22))+'</div>':''}</div></div></td>
      <td><span class="sidebadge ${esc(sideClass)}" title="${esc(side)}">${esc(sideShort(side))}</span></td>
      <td class="num">${c.dex||0}</td>
      <td><div style="display:flex;align-items:center;gap:6px;white-space:nowrap"><div class="bar hp" style="width:52px"><i style="width:${hpPct}%"></i></div><span class="num" style="font-size:11px">${c.hp.cur}/${c.hp.max}</span></div></td>
      <td class="num" style="font-size:11px">${c.san&&c.san.max?c.san.cur+'/'+c.san.max:'—'}</td>
      <td class="num" style="font-size:11px">${c.mp&&c.mp.max?c.mp.cur+'/'+c.mp.max:'—'}</td>
      <td><span class="badge ${cls}">${esc(st)}</span></td>
      <td class="combactns" style="text-align:right">
        <button class="small danger" title="移出战斗" onclick="event.stopPropagation();combatRemove('${c.id}')">移出</button></td>
    </tr>`;
  }).join('');
}
function selectComb(cid){ combActiveId=cid; renderCombatRoster(); renderActivePanel(); drawBattleScene(); }
