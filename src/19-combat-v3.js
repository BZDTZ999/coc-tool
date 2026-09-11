/* ---------- G. 战斗：场景三行条 + 护甲 + MP 调整 + 施放法术 ---------- */
/* 战斗页二级菜单栏：👥 添加角色 / ⚔️ 战斗桌 两个面板，点开就用、再点收起。
   战斗场景占满菜单栏下面的整个宽度，战斗成员与行动日志依次排在场景下面。 */
var COMBAT_POD=null;
function toggleCombatPod(which){
  COMBAT_POD = (COMBAT_POD===which) ? null : which;
  applyCombatPod();
}
function applyCombatPod(){
  ['add','table'].forEach(function(k){
    var pod=$('pod-'+k), btn=$('cp-'+k);
    if(pod) pod.hidden = (COMBAT_POD!==k);
    if(btn) btn.classList.toggle('on', COMBAT_POD===k);
  });
  if(COMBAT_POD==='add'){ try{ refreshCombatAddSel(); }catch(e){} }
  try{ if(typeof fsResize==='function') fsResize(); }catch(e){}
}
function combatPodsInit(){ applyCombatPod(); }
function drawOver(ctx,sc){
  ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.setLineDash([6,8]);
  ctx.beginPath(); ctx.moveTo(B_W/2,0); ctx.lineTo(B_W/2,B_H); ctx.stroke(); ctx.setLineDash([]);
  // 更大的名牌与三行彩条：约为旧尺寸的 1.5~2 倍，标出 H/S/M 与 cur/max，方便 Keeper 看清
  function miniBar(cx,y,cur,max,hex,ch){
    var bw=58,h=11, pct=max>0?Math.max(0,Math.min(1,cur/max)):0;
    ctx.font='bold 15px Menlo,monospace';
    var lw=ctx.measureText(ch).width;
    var txt=(max>0)?(cur+'/'+max):'—';
    ctx.font='bold 11px Menlo,monospace';
    var tw=ctx.measureText(txt).width;
    var x0=cx-bw/2, px=x0-lw-7;
    var groupW=bw+lw+tw+14;
    ctx.fillStyle='rgba(0,0,0,.62)';
    ctx.fillRect(px-2,y-2,groupW,h+4);
    ctx.fillStyle=hex; ctx.fillRect(x0,y,bw*pct,h);
    if(pct<1){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(x0+bw*pct,y,bw*(1-pct),h); }
    ctx.font='bold 15px Menlo,monospace'; ctx.textAlign='left'; ctx.fillStyle='#fff';
    ctx.fillText(ch,px+3,y+10);
    ctx.font='bold 11px Menlo,monospace'; ctx.fillStyle='#fff';
    ctx.fillText(txt,x0+bw+5,y+10);
    ctx.textAlign='center';
  }
  state.combat.participants.forEach(function(c){
    var p=(sc.pos||{})[c.id]; if(!p) return;
    var active = combActiveId===c.id;
    drawAvatarOnCanvas(ctx,p.x,p.y,24,c);
    /* 名字：不截断，先缩字号再自动换行，多长都能显示完整 */
    var nm=String(c.name||'').trim();
    var cursor=p.y+36;
    if(nm){
      var fit=fitCanvasName(ctx,nm,190,[15,14,13,12,11,10,9,8]);
      var hgt=plateTextBlock(ctx,fit.lines,p.x,cursor,'bold '+fit.size+'px "PingFang SC",sans-serif',false);
      cursor+=hgt+2;
    }
    if(c.armor>0){
      plateText(ctx,'🛡'+c.armor, p.x, cursor+9, 'bold 13px "PingFang SC",sans-serif');
      cursor+=20;
    }
    var barsTop=cursor+3;
    miniBar(p.x,barsTop+6, (c.hp&&c.hp.cur)||0,(c.hp&&c.hp.max)||0,'#6fbf73','H');
    miniBar(p.x,barsTop+20, (c.san&&c.san.cur)||0,(c.san&&c.san.max)||0,'#a78fd1','S');
    miniBar(p.x,barsTop+34, (c.mp&&c.mp.cur)||0,(c.mp&&c.mp.max)||0,'#6fa7d6','M');
    /* 状态图标：眩晕/濒死/死亡/异常（昏迷另给一档），贴在头像右侧 */
    var st=combStateIcon(c.state);
    if(st){
      var bx=p.x+30, by=p.y-2;
      ctx.beginPath(); ctx.arc(bx,by,14,0,Math.PI*2);
      ctx.fillStyle=st.c; ctx.fill();
      ctx.lineWidth=2.5; ctx.strokeStyle='rgba(0,0,0,.65)'; ctx.stroke();
      ctx.font='16px "Apple Color Emoji","Segoe UI Emoji",serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(st.g,bx,by+1);
      ctx.textBaseline='alphabetic'; ctx.textAlign='left';
    }
    if(active){ ctx.strokeStyle='#e3c47f'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(p.x,p.y,32,0,Math.PI*2); ctx.stroke(); }
  });
  ctx.textAlign='left';
}

function combAdjustVal(kind,sign){
  var c=activeComb(); if(!c) return;
  var key=kind==='hp'?'ap-dmg':(kind==='mp'?'ap-mp':'ap-san');
  var el=$(key); if(!el) return;
  var amt=Math.max(0,Math.round(num(el.value)))||1;
  var o=kind==='hp'?c.hp:(kind==='san'?c.san:c.mp); if(!o) return;
  if(sign<0){ o.cur=Math.max(0,(o.cur||0)-amt); logRoll(c.name+' 扣除 '+amt+' '+kind.toUpperCase()+' → '+o.cur+'/'+(o.max||o.cur),'bad'); }
  else { o.cur=Math.min(o.max||o.cur,(o.cur||0)+amt); logRoll(c.name+' 恢复 '+amt+' '+kind.toUpperCase()+' → '+o.cur+'/'+(o.max||o.cur),'good'); }
  combSyncToActor({quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel(); drawBattleScene();
}
function combSetArmor(){
  var c=activeComb(); if(!c) return;
  c.armor=Math.max(0,Math.round(num($('ap-armor').value))||0);
  combSyncToActor({quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel(); drawBattleScene(); toast('护甲已设为 '+c.armor);
}
function combatCastSpell(idx){
  var c=activeComb(); if(!c) return;
  var sp=(c.spells||[])[idx]; if(!sp){ toast('没有该法术'); return; }
  var mpText=String(sp.mp==null?'':sp.mp).trim();
  var sanText=String(sp.san==null?'':sp.san).trim();
  var mpCost=0;
  if(mpText && /^\d+$/.test(mpText)) mpCost=parseInt(mpText,10);
  else if(mpText && mpText.indexOf('D')>=0){ try{ mpCost=rollExpr(mpText).total; }catch(e2){ mpCost=0; } }
  var curMp=(c.mp&&c.mp.cur)||0;
  if(mpCost>0 && curMp<mpCost){ toast('MP 不足：需要 '+mpCost+'，现有 '+curMp); return; }
  var msg=c.name+' 施放「'+sp.name+'」';
  if(mpCost>0){ c.mp.cur=Math.max(0,curMp-mpCost); msg+=' · MP -'+mpCost; }
  var sanLoss=0;
  if(sanText){
    var re; try{ re=rollExpr(sanText); }catch(e3){ re={total:num(sanText)}; }
    sanLoss=re.total;
    if(c.san){ c.san.cur=Math.max(0,(c.san.cur||0)-sanLoss); }
    msg+=' · SAN '+sanText+' = '+sanLoss;
  }
  msg+=(sp.effect?('　'+sp.effect):'');
  logRoll(msg, sanLoss>0?'warn':'info');
  if(sanLoss>0 && c.san && c.san.cur===0){ logRoll('💀 '+c.name+' 的理智值归零！','bad'); }
  combSyncToActor({quiet:true});
  saveState(); renderCombatRoster(); renderActivePanel(); drawBattleScene();
}
function renderActivePanel(){
  var c=activeComb(); var el=$('activePanel'); if(!el) return;
  if(document.body) document.body.classList.toggle('comb-has-active', !!c);
  if(!c){ el.innerHTML='<div class="hint">点场景里的头像或成员行，这里出现 HP/SAN/MP/属性/法术/背包面板。</div>'; return; }
  var invOpts=(c.inv||[]).filter(function(it){return it.qty>0;}).map(function(it,i){return '<option value="'+i+'">'+esc(it.name)+' ×'+it.qty+(it.effect==='other'&&it.note?'（'+esc(it.note)+'）':'')+'</option>';}).join('');
  var spellBtns=(c.spells||[]).map(function(sp,i){
    var costDesc=[];
    if(sp.mp!==''&&sp.mp!=null) costDesc.push('MP '+sp.mp);
    if(sp.san!==''&&sp.san!=null) costDesc.push('SAN '+sp.san);
    return '<button class="small" title="'+(sp.time?esc('用时 '+sp.time+'　'):'')+esc(sp.effect||'')+'" onclick="combatCastSpell('+i+')">'+esc(sp.name)+'</button><span class="muted" style="font-size:10.5px">'+esc(costDesc.join(' / ')||'消耗见备注')+'</span>';
  }).join('');
  function pctOf(o){ return o&&o.max?Math.max(0,Math.min(100,Math.round(o.cur/o.max*100))):0; }
  function statRow(lbl,cls,o,inpId,signKind){
    return `<div class="adjrow"><span class="lbl">${lbl}</span>
      <div class="bar ${cls}"><i style="width:${pctOf(o)}%"></i></div>
      <span class="adjbtns"><span class="num" style="font-size:11px">${o?o.cur+'/'+o.max:'—'}</span>
        <input type="number" id="${inpId}" value="0" min="0" title="调整量"><button class="small" title="扣${lbl}" onclick="combAdjustVal('${signKind}',-1)">－</button><button class="small" title="回${lbl}" onclick="combAdjustVal('${signKind}',1)">＋</button></span></div>`;
  }
  var wpnChips=(c.weapons||[]).map(function(w,i){
    return '<span class="chip" title="'+esc(w.note||w.skill||'')+'">'+esc(w.name)+(w.damage?' <i class="muted">'+esc(w.damage)+'</i>':'')+(w.ammoCap>0?(' <i class="num">弹'+(w.ammoCur||0)+'/'+w.ammoCap+'</i>'):'')+'<button class="x" title="删除" onclick="combDelLoadout(\'weapons\','+i+')">✕</button></span>';
  }).join('');
  var spChips=(c.spells||[]).map(function(sp,i){
    return '<span class="chip" title="'+esc((sp.time?'用时 '+sp.time+'　':'')+sp.effect||'')+'">🔮 '+esc(sp.name||'未名')+(sp.mp!==''&&sp.mp!=null?'<i class="muted"> '+sp.mp+'MP</i>':'')+(sp.san!==''&&sp.san!=null?'<i class="muted"> '+sp.san+'SAN</i>':'')+'<button class="x" onclick="combDelLoadout(\'spells\','+i+')">✕</button></span>';
  }).join('');
  var invChips=(c.inv||[]).map(function(it,i){
    return '<span class="chip" title="'+esc(it.note||it.amount||'')+'">'+esc(it.name)+' ×'+(it.qty||0)+(it.effect==='other'&&it.note?'<i class="muted"> '+esc(it.note)+'</i>':'')+'<button class="x" onclick="combDelLoadout(\'inv\','+i+')">✕</button></span>';
  }).join('');
  var spellOpts=SPELLS.map(function(sp,i){return '<option value="'+i+'">'+esc(sp.n)+'</option>';}).join('');
  var effOpts=[['','无特殊效果'],['heal','治疗 HP'],['san','回复 SAN'],['mp','回复 MP'],['ammo','弹药(装填用)'],['other','其他(自定)']]
    .map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>';}).join('');
  el.innerHTML=`
  <div class="combphead">
    <div class="cphleft">
      <div class="cphline">${avatarView(c,'md')}<b class="nm">${esc(c.name)}</b><span class="badge ${'side-'+esc(sideOf(c))}">${esc(sideOf(c))}</span></div>
      <div class="cphmeta">
        <span class="num cphdex">DEX ${c.dex||0} · DB ${esc(c.db||'0')}</span>
        ${c.actorId?'<button class="small ghost" title="把当前装备/法术改动同步写回调查员或NPC档案（小卡同步显示）" onclick="combSyncToActor()">↻ 同步档案</button>':''}
        <button class="small ghost" title="收起角色详情（也可直接点场景空白处）" onclick="selectComb(null)">收起 ✕</button>
      </div>
    </div>
    <div class="combstates">
      <button class="small" title="头像右侧出现 💫" onclick="toggleState('眩晕')">💫 眩晕</button>
      <button class="small" title="头像右侧出现 🩸" onclick="toggleState('濒死')">🩸 濒死</button>
      <button class="small" title="头像右侧出现 💤" onclick="toggleState('昏迷')">💤 昏迷</button>
      <button class="small" title="头像右侧出现 💀" onclick="toggleState('死亡')">💀 死亡</button>
      <button class="small" title="头像右侧出现 ⚠️" onclick="toggleState('异常')">⚠️ 异常</button>
      <button class="small ghost" onclick="toggleState('正常')">✅ 复原</button>
    </div>
  </div>
  <div class="adjrows">
    ${statRow('HP','hp',c.hp,'ap-dmg','hp')}
    ${statRow('SAN','purple',c.san,'ap-san','san')}
    ${statRow('MP','blue',c.mp,'ap-mp','mp')}
    <div class="adjrow"><span class="lbl">护甲</span>
      <div style="display:flex;align-items:center;gap:6px;min-height:18px"><span class="badge blue">🛡 ${c.armor||0}</span></div>
      <span class="adjbtns"><input type="number" id="ap-armor" value="${c.armor||0}" min="0" title="护甲值"><button class="small" onclick="combSetArmor()">改护甲</button></span>
      <div class="armorfoot">受击时先扣护甲，其余伤害反馈到 HP 条</div>
    </div>
  </div>
  <h4 class="small-title">🧬 属性</h4>
  <div class="combattrgrid">
    ${ATTR_LABELS.map(function(l){return '<div class="cat" title="'+esc(l[2])+'"><em>'+esc(l[1].split(' ')[0])+'</em><input type="number" id="ca-'+l[0]+'" value="'+(((c.attrs||{})[l[0]])||0)+'" min="0"></div>';}).join('')}
  </div>
  <div class="row" style="gap:6px;justify-content:flex-end;margin-bottom:2px">
    <button class="small primary" onclick="combSetAttrs()">💾 保存属性并同步档案</button>
    <span class="hint">DB 自动按力量+体型重算；上限不覆盖手填值</span>
  </div>
  <h4 class="small-title">🔮 施放法术</h4>
  <div class="row" style="gap:6px;flex-wrap:wrap">${spellBtns||'<span class="hint">没有可施放的法术，可在下方“法术清单”即时添加。</span>'}</div>
  <div class="vdiv"></div>
  <h4 class="small-title">🗡 武器清单（增删会同步到角色档案与小卡）</h4>
  <div class="loadout-mini">${wpnChips||'<span class="chip note">徒手/无武器</span>'}</div>
  <div class="addbar">
    <select id="ap-wpn-preset" style="flex:1;min-width:220px">${weaponPresetOptions()}</select>
    <button class="small primary" onclick="combAddWeapon()">＋ 加武器</button>
  </div>
  <h4 class="small-title">🔮 法术清单（MP/SAN 可参考规则书消耗）</h4>
  <div class="loadout-mini">${spChips||'<span class="chip note">暂无法术</span>'}</div>
  <div class="addbar">
    <select id="ap-spell-preset" style="flex:1;min-width:220px">${spellOpts}</select>
    <button class="small primary" onclick="combAddSpell()">＋ 加法术</button>
  </div>
  <h4 class="small-title">🎒 背包道具（对自身使用）</h4>
  <div class="row" style="gap:6px;flex-wrap:wrap">
    <label>道具<select id="ap-item">${invOpts||'<option value="-1">（背包空）</option>'}</select></label>
    <button class="small" onclick="combUseItem()">使用</button>
  </div>
  <div class="loadout-mini">${invChips||'<span class="chip note">背包空</span>'}</div>
  <div class="addbar">
    <input id="ap-item-name" placeholder="物品名称" style="flex:1;min-width:120px">
    <input id="ap-item-qty" type="number" value="1" min="1" style="width:58px" title="数量">
    <select id="ap-item-effect" style="width:130px">${effOpts}</select>
    <input id="ap-item-note" placeholder="备注/效果说明" style="flex:1.2;min-width:120px">
    <button class="small primary" onclick="combAddItem()">＋ 加道具</button>
  </div>`;
}

/* 战斗内改动 → 回写角色档案与小卡。
   个体数值（HP/SAN/MP/属性/DB/技能）只有在“该档案在战斗里只有一个个体”时才回写，
   避免同一档案展开成多个体时互相覆盖；装备/物品/法术清单始终回写。 */
var COMB_ATTR_KEYS=['str','con','pow','dex','app','siz','int','edu','luck'];
function combSyncParticipant(cc, opts){
  if(!cc||!cc.actorId) return false;
  var quiet=opts&&opts.quiet;
  var a=state.actors.filter(function(x){return x.id===cc.actorId;})[0];
  if(!a){ if(!quiet) toast('找不到来源角色档案'); return false; }
  if(!a.hp) a.hp={cur:0,max:0};
  if(!a.san) a.san={cur:0,max:99};
  if(!a.mp) a.mp={cur:0,max:0};
  if(!a.attrs) a.attrs={};
  if(!a.weapons) a.weapons=[];
  if(!a.inv) a.inv=[];
  if(!a.spells) a.spells=[];
  if(!a.skills) a.skills=[];
  var shared=(state.combat.participants||[]).filter(function(p){return p.actorId===cc.actorId;}).length>1;
  if(!shared){
    var srcAt=cc.attrs||{};
    var attrsChanged=false, oldDerived=a.db||dbTextOf(a.attrs);
    COMB_ATTR_KEYS.forEach(function(k){
      if(srcAt[k]!=null && srcAt[k]!==''){
        var nv=Math.max(0,Math.round(num(srcAt[k])));
        if((a.attrs[k]||0)!==nv){ a.attrs[k]=nv; attrsChanged=true; }
        else if(a.attrs[k]==null){ a.attrs[k]=nv; }
      }
    });
    if(attrsChanged) a.db=dbTextOf(a.attrs);
    else if(cc.db && a.db===oldDerived) a.db=cc.db;
    if(cc.hp){
      if(cc.hp.cur!=null) a.hp.cur=Math.max(0,num(cc.hp.cur));
      if(cc.hp.max) a.hp.max=Math.max(1,Math.round(num(cc.hp.max)));
    }
    if(cc.san){
      if(cc.san.cur!=null) a.san.cur=Math.max(0,num(cc.san.cur));
      if(cc.san.max) a.san.max=Math.max(1,Math.round(num(cc.san.max)));
    }
    if(cc.mp){
      if(cc.mp.cur!=null) a.mp.cur=Math.max(0,num(cc.mp.cur));
      if(cc.mp.max) a.mp.max=Math.max(0,Math.round(num(cc.mp.max)));
    }
    a.skills=(cc.skills||[]).map(function(s){
      var b=(s.base!=null&&s.base!=='')?num(s.base):skillBaseOf(s.name);
      return {name:s.name,total:num(s.total),base:(b!=null?b:null)};
    });
  }
  a.weapons=(cc.weapons||[]).map(function(w){return JSON.parse(JSON.stringify(w));});
  a.inv=(cc.inv||[]).map(function(i){return JSON.parse(JSON.stringify(i));});
  a.spells=(cc.spells||[]).map(function(sp){return JSON.parse(JSON.stringify(sp));});
  if(!a.armor) a.armor={value:0,type:''};
  a.armor.value=Math.max(0,num(cc.armor)||0);
  a.armor.type=(a.armor&&a.armor.type)||'';
  if(cc.name) a.name=cc.name;
  saveState();
  if(a.kind==='pc' && state.activeTab==='surveyors') renderSurveyors();
  if(a.kind==='npc' && state.activeTab==='npcs') renderNpcs();
  return true;
}
function combSyncToActor(opts){
  var c=activeComb(); if(!c) return;
  var a=state.actors.filter(function(x){return x.id===c.actorId;})[0];
  var shared=!!c.actorId && (state.combat.participants||[]).filter(function(p){return p.actorId===c.actorId;}).length>1;
  var done=combSyncParticipant(c,{quiet:true});
  if(!done){ if(!(opts&&opts.quiet)) toast('找不到该成员的来源档案，无法同步'); return; }
  if(opts&&opts.quiet) return;
  if(!a) return;
  toast(shared
    ?('已同步「'+a.name+'」的装备/物品/法术清单（该档案在战斗中有多个个体，个体 HP/属性不覆盖档案）')
    :('已把 HP/SAN/MP/属性/装备同步回「'+a.name+'」档案与小卡'));
}
function combSetAttrs(){
  var c=activeComb(); if(!c) return;
  if(!c.attrs) c.attrs={};
  ATTR_LABELS.forEach(function(l){
    var e=$('ca-'+l[0]);
    if(e) c.attrs[l[0]]=Math.max(0,Math.round(num(e.value)));
  });
  c.dex=c.attrs.dex||0;
  c.db=dbTextOf(c.attrs);
  if(c.actorId) combSyncToActor();
  saveState(); renderActivePanel(); renderCombatRoster(); drawBattleScene();
  if(!c.actorId) toast('临时成员：属性只在本场生效');
}
function combDelLoadout(kind,i){
  var c=activeComb(); if(!c) return;
  var arr=kind==='weapons'?c.weapons:kind==='spells'?c.spells:c.inv;
  if(!arr||!arr[i]) return;
  arr.splice(i,1);
  combSyncToActor();
  saveState(); renderActivePanel(); renderCombatRoster(); drawBattleScene();
}
function combAddWeapon(){
  var c=activeComb(); if(!c) return;
  var sel=$('ap-wpn-preset'); if(!sel) return;
  var idx=num(sel.value);
  if(!sel.value || !PRESET_WEAPONS[idx]){ toast('请先选一件预置武器'); return; }
  var p=PRESET_WEAPONS[idx]; var cap=num(p[5])||0;
  c.weapons=c.weapons||[];
  c.weapons.push({name:p[1],type:p[0],skill:p[2],damage:p[3],range:p[4],pierce:'—',attacks:'1',ammoCap:cap,ammoCur:cap,note:''});
  combSyncToActor();
  saveState(); renderActivePanel(); renderCombatRoster(); drawBattleScene();
  toast('已加武器「'+p[1]+'」');
}
function combAddSpell(){
  var c=activeComb(); if(!c) return;
  var sel=$('ap-spell-preset'); if(!sel) return;
  var i=num(sel.value); var sp=SPELLS[i];
  if(!sp){ toast('请选择法术'); return; }
  var obj;
  if(sp.n==='自定义法术'){
    var nm=prompt('法术名称：'); if(!nm||!nm.trim()) return;
    obj={name:nm.trim(),mp:prompt('MP 消耗（可留空）：','')||'',san:prompt('SAN 损失（可留空）：','')||'',time:prompt('施放用时（可留空）：','')||'',effect:prompt('效果说明（可留空）：','')||''};
  } else obj=spellFromName(sp.n);
  c.spells=c.spells||[]; c.spells.push(obj);
  combSyncToActor();
  saveState(); renderActivePanel(); renderCombatRoster(); drawBattleScene();
  toast('已加法术「'+obj.name+'」');
}
function combAddItem(){
  var c=activeComb(); if(!c) return;
  var nm=$('ap-item-name').value.trim();
  if(!nm){ toast('填物品名称'); return; }
  c.inv=c.inv||[];
  c.inv.push({name:nm,qty:Math.max(1,Math.round(num($('ap-item-qty').value))||1),
    effect:$('ap-item-effect').value,amount:'',note:$('ap-item-note').value.trim()});
  $('ap-item-name').value=''; $('ap-item-note').value='';
  combSyncToActor();
  saveState(); renderActivePanel(); renderCombatRoster(); drawBattleScene();
  toast('已加道具「'+nm+'」');
}

/* ---------- H. 数据兜底：法术字段 / 分组名 / 自定义素材 / 无3D ---------- */
function ensureV2Data(){
  (state.actors||[]).forEach(function(a){
    if(!a.side) a.side = a.kind==='pc'?'调查员':(a.side||'敌人');
    if(a.kind==='npc' && a.side==='调查员') a.side='盟友';
    if(!a.avatar) a.avatar={preset: a.kind==='npc'?defaultAvatarForActor('npc',a.side):AVATAR_DEFAULT_PC, custom:null};
    if(!a.history) a.history={};
    if(!a.attrs) a.attrs={};
    if(!a.hp) a.hp={cur:0,max:0};
    if(!a.san) a.san={cur:0,max:99};
    if(!a.mp) a.mp={cur:0,max:0};
    if(!a.weapons) a.weapons=[];
    if(!a.inv) a.inv=[];
    if(!a.spells) a.spells=[];
    if(!a.skills) a.skills=[];
    if(!a.plot) a.plot=[];
    if(!a.campaigns) a.campaigns=[];
    if(!Array.isArray(a.tags)) a.tags=[];
  });
  if(typeof healMapsAndVehicles==='function') healMapsAndVehicles();   // 空地图/空载具自愈（见 02-data-store.js）
  if(!state.maps) state.maps=[];
  state.maps.forEach(function(m){ m.iso=false; if(m.zoom==null) m.zoom=1; });
  if(!state.vehicles) state.vehicles=defaultVehicles();
  if(!state.combat) state.combat={round:0,participants:[]};
  if(!state.combat.scene) state.combat.scene={bg:null,pos:{}};
  if(!Array.isArray(state.combat.scene.props)) state.combat.scene.props=[];
  if(!Array.isArray(state.combat.customProps)) state.combat.customProps=[];
  (state.combat.participants||[]).forEach(function(c){
    if(!c.attrs){
      var src=c.actorId?state.actors.filter(function(x){return x.id===c.actorId;})[0]:null;
      var sat=(src&&src.attrs)||{};
      c.attrs={str:0,dex:0,pow:0,con:0,app:0,edu:0,siz:0,int:0,luck:0};
      COMB_ATTR_KEYS.forEach(function(k){ if(sat[k]!=null) c.attrs[k]=Math.max(0,num(sat[k])); });
      if(!c.attrs.dex && c.dex) c.attrs.dex=Math.max(0,num(c.dex));
    }
    if(!c.hp) c.hp={cur:0,max:0};
    if(!c.san) c.san={cur:0,max:99};
    if(!c.mp) c.mp={cur:0,max:0};
    if(!c.skills) c.skills=[];
    if(!c.weapons) c.weapons=[];
    if(!c.inv) c.inv=[];
    if(!c.spells) c.spells=[];
    if(c.db==null) c.db=dbTextOf(c.attrs);
    if(c.dex==null) c.dex=c.attrs.dex||0;
  });
  if(!state.ui) state.ui={};
  if(!state.ui.npcGroups) state.ui.npcGroups=['盟友','中立','敌人','其他'];
  else if(state.ui.npcGroups[0]==='调查员') state.ui.npcGroups[0]='盟友';
  if(!state.ui.scenarioTabs || !state.ui.scenarioTabs.length){
    state.ui.scenarioTabs=[
      {name:'笔记 1',html:state.ui.scenario||''},
      {name:'笔记 2',html:''},
      {name:'笔记 3',html:''}
    ];
  }
  while(state.ui.scenarioTabs.length<3){
    state.ui.scenarioTabs.push({name:'笔记 '+(state.ui.scenarioTabs.length+1),html:''});
  }
  state.ui.scenarioTabs=state.ui.scenarioTabs.slice(0,3).map(function(t,i){
    return {name:(t&&t.name)||('笔记 '+(i+1)), html:(t&&t.html)||''};
  });
  if(!state.customProps) state.customProps=[];
  if(!Array.isArray(state.ui.pcTags)) state.ui.pcTags=defaultPcTags();   // 首次使用给一组默认便签
  /* 骰子台：大成功/大失败阈值 + 掷骰日志（关闭面板与刷新页面都不丢） */
  if(!state.ui.dice) state.ui.dice={bs:1,bf:96,hist:[]};
  diceThrSmall=Math.max(1,Math.min(100,Math.round(num(state.ui.dice.bs)||1)));
  diceThrBig=Math.max(1,Math.min(100,Math.round(num(state.ui.dice.bf)||100)));
  if(diceThrSmall>diceThrBig){ var _dt=diceThrSmall; diceThrSmall=diceThrBig; diceThrBig=_dt; }
  diceHistory=Array.isArray(state.ui.dice.hist)?state.ui.dice.hist.slice(0,120):[];
  diceTab=(state.ui.dice.tab==='san')?'san':'roll';
  var _san=sanCfg();
  if(state.ui.decor==null) state.ui.decor=true;
}
function switchTab(name){
  if(['surveyors','npcs','maps','combat'].indexOf(name)<0 || !$('tab-'+name)) name='surveyors';
  state.activeTab = name; saveStateQuiet();
  renderNav();
  document.querySelectorAll('section.tab').forEach(function(s){ s.classList.toggle('active', s.id==='tab-'+name); });
  if (name==='surveyors') renderSurveyors();
  if (name==='npcs') renderNpcs();
  if (name==='maps'){ renderMapsShell(); if(typeof applyMapPod==='function') applyMapPod(); }
  if (name==='combat'){ renderCombatShell(); if(typeof applyCombatPod==='function') applyCombatPod(); }
}

/* 快速查询页已按需求移除（详见带团妙妙小工具其它页面速查）。 */

/* 全局素材图片缓存（overlayMap 使用） */
var _propImgCache = {};

/* ---------- J. spawnCombatant：同步角色法术（战斗施法用） ---------- */
function spawnCombatant(actor, tag){
  var a=JSON.parse(JSON.stringify(actor));
  var at=a.attrs||{};
  var c={
    id:uid('c'), actorId:a.id, tag:tag||'',
    name:a.name, side:sideOf(a),
    avatar:a.avatar?JSON.parse(JSON.stringify(a.avatar)):{preset:defaultAvatarForActor(a.kind,sideOf(a)),custom:null},
    attrs:{str:0,dex:0,pow:0,con:0,app:0,edu:0,siz:0,int:0,luck:0},
    dex:at.dex||0, mov:a.mov||8,
    hp:{cur:0,max:0}, san:{cur:0,max:99}, mp:{cur:0,max:0},
    db:a.db||dbTextOf(at), armor:(a.armor&&a.armor.value)||0,
    skills:(a.skills||[]).map(function(s){return {name:s.name,total:num(s.total),base:(s.base!=null?s.base:skillBaseOf(s.name))};}),
    weapons:(a.weapons||[]).map(function(w){return JSON.parse(JSON.stringify(w));}),
    inv:(a.inv||[]).map(function(i){return JSON.parse(JSON.stringify(i));}),
    spells:(a.spells||[]).map(function(sp){return JSON.parse(JSON.stringify(sp));}),
    note:a.note||a.notes||'', state:'正常', done:false
  };
  COMB_ATTR_KEYS.forEach(function(k){ if(at[k]!=null) c.attrs[k]=Math.max(0,num(at[k])); });
  c.dex=c.attrs.dex||c.dex||0;
  c.hp.max=a.hp.max||Math.max(1,Math.floor(((at.con||0)+(at.siz||0))/10));
  c.hp.cur=a.hp.cur||c.hp.max;
  c.san.max=a.san&&a.san.max?a.san.max:99;
  c.san.cur=a.san&&a.san.cur!=null?Math.min(a.san.cur,c.san.max):Math.min(at.pow||0,c.san.max);
  c.mp.max=a.mp&&a.mp.max?a.mp.max:Math.floor(at.pow/5);
  c.mp.cur=a.mp&&a.mp.cur!=null?a.mp.cur:c.mp.max;
  return c;
}


/* 行添加修正：避免外包裹内再包裹（weapon/spell） */
function addSpellRow(){ var box=$('am-spells'); if(!box) return; box.insertAdjacentHTML('beforeend', spellRowHTML({})); }
function addWeaponRow(){ var box=$('am-weapons'); if(!box) return; box.insertAdjacentHTML('beforeend', weaponPresetRowHTML({name:'',skill:'',damage:'',range:'',type:'',ammoCap:0})); }
