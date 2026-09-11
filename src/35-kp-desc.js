/* ---------- ✍️ KP正在瞎编！（🧰 更多小玩意儿 ③）：本地素材 + 标签解析 + 规则组合 ----------
   纯本地、离线可用，不联网、不调用 AI。三种入口（快捷标签 / 一句话 / 更多设置）最后全部进同一套
   内部条件（kpResolve），再走：冲突覆盖 → 否定处理 → 素材匹配（四层降级）→ 组段 → 结果操作。
   素材与同义词词典在 34-kp-desc-data.js，这个文件只放逻辑；加素材不用改这里。 */
'use strict';

/* 维度中文名 / 单值维度 / 长度 */
var KP_DIM_CN={scene:'场景',creature:'怪物',time:'时间',weather:'天气',mood:'氛围',light:'光线',
  emotion:'情绪',anomaly:'异常',supernatural:'超自然',event:'事件',object:'物体',focus:'描写重点'};
var KP_SINGLE_DIM={scene:1,time:1,weather:1,anomaly:1,supernatural:1,creature:1};
var KP_LEN_TXT={short:'短',mid:'中',long:'长'};
var KP_LEN_N={short:3,mid:6,long:10};
/* 禁止项的中文说法（自然语言否定与「更多设置」里的禁止开关共用） */
var KP_NEGN={creature:'不出现怪物',blood:'不写血腥',gore:'不写肢解/内脏',supernatural:'不出现超自然',
  sound:'不写声音',attack:'不出现攻击',death:'不出现死亡',body:'不出现尸体',npc:'不出现其他人',
  insanity:'不出现发疯',child:'不出现小孩',light:'不写灯光'};
var KP_NEGN_KEYS=['creature','blood','gore','supernatural','sound','attack','death','body','npc','insanity','child','light'];

/* ================= 状态（存在 state.ui.kp，刷新后还在） ================= */
var kpState={
  tab:'scene', text:'', quick:{}, adv:{}, forbidden:{}, delay:{}, restriction:'',
  length:'mid', showAdv:false, creature:'', cdim:{}, mine:[], draft:null, mute:{}, recent:null,
  lines:[], hint:'', notes:[], ctx:null, seq:0, loaded:false
};
function kpEnsure(){
  if(kpState.loaded) return;
  kpState.loaded=true;
  if(!state) return;
  if(!state.ui) state.ui={};
  var s=state.ui.kp;
  if(!s || typeof s!=='object') return;
  if(typeof s.text==='string') kpState.text=s.text;
  if(s.quick && typeof s.quick==='object') kpState.quick=s.quick;
  if(s.adv && typeof s.adv==='object') kpState.adv=s.adv;
  if(s.forbidden && typeof s.forbidden==='object') kpState.forbidden=s.forbidden;
  if(s.delay && typeof s.delay==='object') kpState.delay=s.delay;
  if(typeof s.restriction==='string') kpState.restriction=s.restriction;
  if(KP_LEN_TXT[s.length]) kpState.length=s.length;
  if(s.tab==='scene'||s.tab==='creature'||s.tab==='mine') kpState.tab=s.tab;
  if(typeof s.creature==='string') kpState.creature=s.creature;
  if(s.cdim && typeof s.cdim==='object') kpState.cdim=s.cdim;
  if(s.mine && s.mine.length) kpState.mine=s.mine;
  if(s.mute && typeof s.mute==='object') kpState.mute=s.mute;
  if(s.recent && typeof s.recent==='object') kpState.recent=s.recent;
  if(s.lines && s.lines.length){
    kpState.lines=s.lines; kpState.hint=s.hint||''; kpState.notes=s.notes||[];
    kpState.ctx=s.ctx||null; kpState.seq=s.seq||s.lines.length;
  }
}
function kpSave(){
  if(!state) return;
  if(!state.ui) state.ui={};
  state.ui.kp={text:kpState.text, quick:kpState.quick, adv:kpState.adv, forbidden:kpState.forbidden,
    delay:kpState.delay, restriction:kpState.restriction, length:kpState.length, tab:kpState.tab,
    creature:kpState.creature, cdim:kpState.cdim, mine:kpState.mine, lines:kpState.lines,
    mute:kpState.mute, hint:kpState.hint, notes:kpState.notes, ctx:kpState.ctx, seq:kpState.seq,
    recent:kpState.recent};
  saveStateQuiet();
}
function kpNextId(){ kpState.seq=(kpState.seq||0)+1; return 'kp'+kpState.seq; }
/* 页面上的输入框 → 状态（点任何按钮前先同步一次，免得刚打的字丢掉）。
   只有「框里的值跟我们上次渲染进去的不一样」时才算用户改过 —— 不然程序自己改的 kpState 会被旧框覆盖。 */
var kpRendered={text:null,restr:null};
function kpSync(){
  var t=$('kpText');
  if(t && typeof t.value==='string' && t.value!==kpRendered.text) kpState.text=t.value;
  var r=$('kpRestr');
  if(r && typeof r.value==='string' && r.value!==kpRendered.restr) kpState.restriction=r.value;
}

/* ================= 小工具 ================= */
function kpList(s){ return (s==null?'':String(s)).trim(); }
function kpHasIn(arr,v){ return (arr||[]).indexOf(v)>=0; }
function kpRandOne(a){ return a[Math.floor(Math.random()*a.length)]; }
function kpShuffled(a){
  var x=(a||[]).slice(), i, j, t;
  for(i=x.length-1;i>0;i--){ j=Math.floor(Math.random()*(i+1)); t=x[i]; x[i]=x[j]; x[j]=t; }
  return x;
}
function kpTidy(t){
  t=kpList(t); if(!t) return '';
  if(!/[。！？…～」』")]$/.test(t)) t+='。';
  return t;
}
/* ================= 最近使用记录 / 叙述入口 / 段落结构（防重复用） =================
   连点「再来一段」不能老是同一批句子、同一种开头、同一批意象。所以每次生成都记一笔：
   开头类型 / 段落结构 / 句式签名 / 用过的整句 / 用过的意象，接下来几段里这些都会被降权。 */
var KP_RECENT_MAX={open:9,struct:10,imag:36,mat:150,sig:40};
function kpRec(){
  if(!kpState.recent || typeof kpState.recent!=='object') kpState.recent={};
  var r=kpState.recent;
  ['open','struct','imag','mat','sig'].forEach(function(k){ if(!Array.isArray(r[k])) r[k]=[]; });
  return r;
}
function kpRecHas(k,v){ return kpHasIn(kpRec()[k],v); }
function kpRecPush(k,v){
  if(v===undefined || v===null || v==='') return;
  var r=kpRec(), a=r[k], max=KP_RECENT_MAX[k]||12, i=a.indexOf(v);
  if(i>=0) a.splice(i,1);
  a.push(v);
  while(a.length>max) a.shift();
}
/* 句式签名：去掉标点、把数字归一，取前 6 个字 —— 同一句式的句子会撞在一起，用来防「连着几句一个结构」 */
function kpSig(t){
  var s=String(t||'').replace(/[，。！？、；：「」『』（）《》""'',.!?;:\-—…～\s]/g,'');
  return s.replace(/[0-9０-９]+/g,'#').slice(0,6);
}
/* 一句话命中了哪几组核心意象（走廊 / 灯光 / 空气 / 寒意 / 声音 / 脚步…） */
function kpImagKeys(t){
  var out=[], s=String(t||''), i, j;
  for(i=0;i<KP_IMAG.length;i++){
    var ws=KP_IMAG[i][1];
    for(j=0;j<ws.length;j++){ if(s.indexOf(ws[j])>=0){ out.push(KP_IMAG[i][0]); break; } }
  }
  return out;
}
/* 候选人「最近用过」的扣分：整句用过最重，句式其次，意象按命中数累加 */
function kpRecentScore(o,rec){
  var s=0, i, hit=0, mi=rec.mat.indexOf(o.t);
  /* 用过的整句记得越近扣得越多 —— 同一个条件句的几个说法就能轮流上，不会老用第一句 */
  if(mi>=0) s+=9+8*((mi+1)/(rec.mat.length||1));
  if(kpHasIn(rec.sig,o.sig)) s+=5;
  for(i=0;i<o.im.length;i++) if(kpHasIn(rec.imag,o.im[i])) hit++;
  s+=hit*3;
  if(hit>=2) s+=2;
  return s;
}
/* 没有具体场景 / 分区时，{sub} 的兜底说法 */
var KP_OPEN_SUB=['里面','那一头','边上','深处','后面','前面','拐角那边'];
/* 把素材里的占位符填成这一次生成的实际条件（{sc} 场景 · {sub} 分区 · {t} 时间 · {wn}/{w}/{wt} 天气 · {q} 台词） */
function kpFill(t,ctx){
  var s=String(t==null?'':t);
  if(s.indexOf('{')<0) return s;
  var c=ctx||{};
  s=s.split('{sc}').join(c.sc||'').split('{sub}').join(c.sub||'').split('{wt}').join(c.wt||'')
     .split('{wn}').join(c.wn||'').split('{w}').join(c.w||'').split('{t}').join(c.t||'')
     .split('{q}').join(c.q||'');
  return s.replace(/^[，。、；：]+/,'').replace(/「」/g,'').replace(/，\s*，/g,'，')
    .replace(/，\s*。/g,'。').replace(/\s{2,}/g,' ').replace(/[，、]\s*$/,'');
}
/* 这一次生成用到的实际条件（给占位符用） */
function kpSlots(cond){
  var sc=(cond.scene||[])[0]? kpFindScene(cond.scene[0]) : null;
  var to=(cond.time||[])[0]? kpOptOf('time',cond.time[0]) : null;
  var wo=(cond.weather||[])[0]? kpOptOf('weather',cond.weather[0]) : null;
  var sub=(sc&&sc.subs&&sc.subs.length)? kpRandOne(sc.subs) : kpRandOne(KP_OPEN_SUB);
  return {sc:sc? sc.n:'这里', sub:sub, t:to? to.n:'',
    wn:wo? wo.n:'', w:wo? (KP_W_TXT[wo.v]||wo.n):'', wt:wo? (wo.n+'天'):'',
    q:kpRandOne(KP_QUOTE)};
}
/* 换一个「叙述入口」：类型尽量不跟最近十几次重复，模板从这一类里随机抽一条 */
function kpOpenPool(cond,type){
  var list=KP_OPENERS[type]||[], out=[], i;
  var needSc=!!((cond.scene||[])[0]), needT=!!((cond.time||[])[0]), needW=!!((cond.weather||[])[0]);
  for(i=0;i<list.length;i++){
    var s=list[i];
    if(!needT && s.indexOf('{t}')>=0) continue;
    if(!needW && (s.indexOf('{w}')>=0 || s.indexOf('{wn}')>=0 || s.indexOf('{wt}')>=0)) continue;
    if(!needSc && s.indexOf('{sc}')>=0) continue;
    out.push(s);
  }
  if(needSc){
    out=out.filter(function(s){ return s.indexOf('{sc}')>=0; });
    /* 场景名尽量别顶在句首，不然连着十几段都从「XX医院……」开始 */
    var noLead=out.filter(function(s){ return s.indexOf('{sc}')!==0; });
    if(noLead.length) out=noLead;
  }
  return out;
}
function kpPickOpener(cond,ctx){
  var types=Object.keys(KP_OPENERS), rec=kpRec(), i;
  /* 一句话里说了场景，开场就得把这个场景带上（结果必须仍然符合原始条件） */
  if((cond.scene||[]).length)
    types=types.filter(function(t){ return (KP_OPENERS[t]||[]).some(function(s){ return s.indexOf('{sc}')>=0; }); });
  var pool=types.filter(function(t){ return !kpHasIn(rec.open,t) && kpOpenPool(cond,t).length; });
  if(!pool.length) pool=types.filter(function(t){ return kpOpenPool(cond,t).length; });
  if(!pool.length) return null;
  var ty=kpRandOne(pool), ops=kpOpenPool(cond,ty);
  if(!ops.length) return null;
  var t=kpTidy(kpFill(kpRandOne(ops),ctx));
  if(!t) return null;
  return {t:t,type:ty};
}
/* 偏「口述」的维度：一段话里至少要有一句这一类，别整段都在写景 */
var KP_SPOKEN_DIM=['fact','note','act','react','obs','talk','find'];
/* 选一套段落结构（同时避开最近用过的几套），保证用户明确要求的维度一定在里面 */
function kpFitPlan(seed,want){
  var p=seed.slice(), i=0;
  while(p.length>want) p.splice(1+Math.floor(Math.random()*(p.length-1)),1);
  while(p.length<want){ p.push(seed[i%seed.length]); i++; }
  return p;
}
function kpPickPlan(cands,want,cond){
  if(want<1) return [];
  var avail={}, i;
  for(i=0;i<cands.length;i++){ var d=cands[i]&&cands[i].d; if(d) avail[d]=1; }
  var force=[];
  if((cond.mood||[]).length) force.push('mood');
  if((cond.event||[]).length) force.push('event');
  if((cond.object||[]).length) force.push('object');
  (cond.focus||[]).forEach(function(f){ var d=KP_FOCUS2DIM[f]; if(d) force.push(d); });
  if(avail.mine) force.push('mine');
  /* 天气和时间各占一格：用户明确给了就得让它们出现 */
  if(avail.env && ((cond.weather||[]).length || (cond.time||[]).length)) force.push('env');
  var rec=kpRec();
  var fresh=KP_PARAS.filter(function(p){ return !kpHasIn(rec.struct,p.join('>')); });
  var pool=fresh.length? fresh : KP_PARAS;
  var plan=kpFitPlan(kpRandOne(pool),want);
  /* 明确要求的维度必须排进去：从第 2 句起的槽位里随机占（不占第一句，
     免得「发现尸体」这种永远出现在开头）。位置互不重复，所以不会被彼此挤掉。 */
  var need={};
  force.forEach(function(d){ if(avail[d]) need[d]=(need[d]||0)+1; });
  var pos=[], k, assigned={};
  for(k=1;k<plan.length;k++) pos.push(k);
  pos=kpShuffled(pos);
  Object.keys(need).forEach(function(d){
    for(var n=0;n<need[d] && pos.length;n++){ var at=pos.pop(); plan[at]=d; assigned[at]=1; }
  });
  /* 每一段至少留一句「口述句」（事实 / 动作 / 反应 / 观察…），别整段都在写景；
     只在没被明确要求占掉的槽位里安排，不会把「发现尸体」这种挤掉。 */
  var spoken=KP_SPOKEN_DIM.filter(function(d){ return avail[d]; });
  if(!spoken.length) spoken=['fact'];
  var free=[], hasSpoken=false;
  for(k=1;k<plan.length;k++){ if(assigned[k]) continue; free.push(k); if(KP_SPOKEN_DIM.indexOf(plan[k])>=0) hasSpoken=true; }
  if(!hasSpoken && free.length) plan[free[Math.floor(Math.random()*free.length)]]=kpRandOne(spoken);
  return plan;
}
function kpUVal(e){ return Array.isArray(e)? e[0] : e; }
function kpUDim(e,fb){ return Array.isArray(e)? (e[1]||fb) : fb; }
function kpFindScene(v){
  for(var i=0;i<KP_SCENES.length;i++) if(KP_SCENES[i].v===v) return KP_SCENES[i];
  return null;
}
function kpFindCreature(v){
  for(var i=0;i<KP_CREATURES.length;i++) if(KP_CREATURES[i].v===v) return KP_CREATURES[i];
  return null;
}
function kpOptArr(dim){ return KP_OPTS[dim]||[]; }
function kpOptOf(dim,v){
  var a=kpOptArr(dim);
  for(var i=0;i<a.length;i++) if(a[i].v===v) return a[i];
  return null;
}
function kpOptName(dim,v){
  if(dim==='scene'){ var s=kpFindScene(v); return s? s.n : v; }
  if(dim==='creature'){ var c=kpFindCreature(v); return c? c.n : v; }
  var o=kpOptOf(dim,v); return o? o.n : v;
}
function kpTrOf(dim,v){
  if(dim==='scene'){ var s=kpFindScene(v); if(!s) return []; return (s.w||[]).length? ['scene']:[]; }
  var o=kpOptOf(dim,v); return o? (o.tr||[]) : [];
}
/* 只按语义特征判互斥（KP_EXCL），不比字符串 —— 所以「白天 + 黑暗」「平静 + 紧张」不会被误判 */
function kpExcl(dim,a,b){
  if(a===b) return false;
  var A=kpTrOf(dim,a), B=kpTrOf(dim,b), i, j;
  for(i=0;i<KP_EXCL.length;i++){
    var p=KP_EXCL[i][0], q=KP_EXCL[i][1];
    if((kpHasIn(A,p)&&kpHasIn(B,q)) || (kpHasIn(A,q)&&kpHasIn(B,p))) return true;
  }
  return false;
}

/* ================= 自然语言 → 内部标签 ================= */
/* 否定词：从长到短试，取离目标词最近的一个 */
var KP_NEGW=['千万不要','尽量不要','暂时不要','暂时不','先不要','先不','绝对不','不希望','不想',
  '不需要','不用','不准','不许','不要','避免','拒绝','禁止','没有','别','不'];
KP_NEGW.sort(function(a,b){ return b.length-a.length; });
/* 否定词与目标词之间允许出现的字（「不要写声音」「不要出现怪物」「尽量不出现超自然现象」…） */
var KP_FILLCH='写要有出现生成加提及涉及包括包含做让使看到得很太特别怎么什么算再还会能可以之的了着过来去上下里中直接具体明确强调描写描述多少那么这么出发生存在上演放用给把被和与以及或者是就都也又更非常等吧啊呢啦哦它它们真事实上';
KP_FILLCH+=KP_DELAY_W.join('');
function kpGapOK(gap){
  if(gap.length>12) return false;
  for(var i=0;i<gap.length;i++) if(KP_FILLCH.indexOf(gap.charAt(i))<0) return false;
  return true;
}
/* 扫否定：命中的片段先挖掉（免得「不要出现怪物」又被当成要写怪物），再记成禁止 / 延迟 */
function kpScanNeg(text,res){
  var chars=text.split(''), i, j, k;
  for(i=0;i<KP_NEG.length;i++){
    var g=KP_NEG[i];
    for(j=0;j<g.w.length;j++){
      var w=g.w[j], from=0, at;
      while((at=text.indexOf(w,from))>=0){
        from=at+1;
        if(chars[at]==='□') continue;          /* 已经被更长的目标词盖掉了（「怪物」盖住「怪」） */
        var hit=null;
        for(k=0;k<KP_NEGW.length;k++){
          var nw=KP_NEGW[k], nx=text.lastIndexOf(nw, at-1);
          if(nx<0 || nx+nw.length>at) continue;
          var gap=text.slice(nx+nw.length, at);
          if(!kpGapOK(gap)) continue;
          if(!hit || nx+nw.length>hit.end) hit={nx:nx,end:nx+nw.length,nw:nw,gap:gap};
        }
        if(!hit) continue;
        var late=false;
        for(k=0;k<KP_DELAY_W.length;k++) if(hit.gap.indexOf(KP_DELAY_W[k])>=0){ late=true; break; }
        if(late){
          res.delay[g.k]=true;
          res.notes.push('「'+hit.nw+hit.gap+w+'」按「延迟」处理：'+KP_NEGN[g.k]+'（可以存在，但不能马上出现）');
        }else{
          res.forbidden[g.k]=true;
          res.notes.push('「'+hit.nw+hit.gap+w+'」按「禁止」处理：'+KP_NEGN[g.k]);
        }
        for(var q=hit.nx;q<at+w.length;q++) chars[q]='□';
      }
    }
  }
  return chars.join('');
}
/* 最长匹配：一串词里挑最长的那个命中（「废弃医院」优先于「医院」） */
function kpMatchList(text,list){
  var best=null, bl=0, i, j;
  for(i=0;i<list.length;i++){
    var it=list[i];
    for(j=0;j<it.w.length;j++){
      var w=it.w[j];
      if(w.length>bl && text.indexOf(w)>=0){ bl=w.length; best=it.v; }
    }
  }
  return best;
}
/* 某一维度的命中，按命中词长度排（单值维度取第一个） */
function kpMatchOpts(text,dim){
  var out=[], a=kpOptArr(dim), i, j;
  for(i=0;i<a.length;i++){
    var best='';
    for(j=0;j<a[i].w.length;j++){
      var w=a[i].w[j];
      if(w.length>best.length && text.indexOf(w)>=0) best=w;
    }
    if(best) out.push({v:a[i].v,n:a[i].n,w:best});
  }
  out.sort(function(p,q){ return q.w.length-p.w.length; });
  return out;
}
var KP_TEXT_DIMS=['time','weather','mood','light','emotion','anomaly','supernatural','event','object','focus'];
function kpParseText(raw){
  var res={cond:{},forbidden:{},delay:{},notes:[]};
  var text=String(raw==null?'':raw);
  if(!text.trim()) return res;
  var masked=kpScanNeg(text,res);
  var sc=kpMatchList(masked,KP_SCENES);
  if(sc) res.cond.scene=[sc];
  var cr=kpMatchList(masked,KP_CREATURES);
  if(cr) res.cond.creature=[cr];
  KP_TEXT_DIMS.forEach(function(dim){
    var hit=kpMatchOpts(masked,dim);
    if(hit.length) res.cond[dim]=hit.map(function(x){ return x.v; });
  });
  if(res.forbidden.creature) delete res.cond.creature;
  if(res.forbidden.supernatural) res.cond.supernatural=['none'];
  return res;
}

/* ================= 三入口合一：文本 → 快捷标签 → 更多设置 → 自定义要求 =================
   越靠后越优先（用户越明确）。单值维度后面的直接覆盖前面的；互斥的会记一条提示，不会静默共存。 */
function kpResolve(){
  var srcs=[
    kpParseText(kpState.text||''),
    {cond:kpState.quick||{}, forbidden:{}, delay:{}, notes:[]},
    {cond:kpState.adv||{}, forbidden:{}, delay:{}, notes:[]},
    kpParseText(kpState.restriction||'')
  ];
  var cond={}, fo={}, dly={}, notes=[], srcOf={};
  function asList(v){ return Array.isArray(v)? v : [v]; }
  srcs.forEach(function(src,si){
    var c=src.cond||{};
    Object.keys(c).forEach(function(dim){
      if(!c[dim] || dim==='forbidden' || dim==='delay') return;
      asList(c[dim]).forEach(function(v){
        if(!KP_DIM_CN[dim] || !v) return;
        var nm=kpOptName(dim,v);
        if(KP_SINGLE_DIM[dim]){
          var old=(cond[dim]||[])[0];
          if(old===undefined){ cond[dim]=[v]; srcOf[dim]=si; }
          else if(srcOf[dim]!==si && old!==v){
            if(kpExcl(dim,old,v)) notes.push(KP_DIM_CN[dim]+'条件冲突：'+kpOptName(dim,old)+' 与 '+nm+
              ' 不能同时作为主要'+KP_DIM_CN[dim]+'条件，已用「'+nm+'」替换「'+kpOptName(dim,old)+'」。');
            cond[dim]=[v]; srcOf[dim]=si;
          }
          /* 同一个入口里命中多条（例如「有一点超自然感」同时命中轻/中）：留最靠前的那条，不互相盖掉 */
        } else {
          var keep=[];
          (cond[dim]||[]).forEach(function(x){
            if(x===v) return;
            if(kpExcl(dim,x,v)){
              notes.push(KP_DIM_CN[dim]+'里 '+kpOptName(dim,x)+' 与 '+nm+' 互斥，已用「'+nm+'」替换。');
              return;
            }
            keep.push(x);
          });
          if(!kpHasIn(keep,v)) keep.push(v);
          cond[dim]=keep;
        }
      });
    });
    Object.keys(src.forbidden||{}).forEach(function(k){ if(src.forbidden[k]) fo[k]=true; });
    Object.keys(src.delay||{}).forEach(function(k){ if(src.delay[k]) dly[k]=true; });
  });
  /* 禁止项优先级最高：跟它冲突的正面条件直接拿掉 */
  if(fo.supernatural){ if((cond.supernatural||[])[0]!=='none') notes.push('禁止超自然：已按纯现实处理。'); cond.supernatural=['none']; }
  if(fo.creature){ cond.creature=[]; if(!dly.creature) notes.push('禁止怪物：不会出现任何具体怪物，改用异常、温度、灯光与痕迹。'); }
  if(fo.sound){ cond.focus=(cond.focus||[]).filter(function(x){ return x!=='sound'; }); }
  if(fo.light){ cond.light=[]; }
  if(fo.blood || fo.gore) cond.event=(cond.event||[]).filter(function(x){ return x!=='blood'; });
  if(fo.body || fo.death) cond.event=(cond.event||[]).filter(function(x){ return x!=='body'; });
  if(fo.attack) cond.event=(cond.event||[]).filter(function(x){ return x!=='chase'; });
  if(dly.creature) notes.push('怪物改为「延迟」：可以存在，但这一段不露面。');
  /* 交互里手动勾的禁止 / 延迟（更多设置） */
  KP_NEGN_KEYS.forEach(function(k){
    if(kpState.forbidden && kpState.forbidden[k]) fo[k]=true;
    if(kpState.delay && kpState.delay[k]) dly[k]=true;
  });
  /* 被 × 掉的条件：不管它是从文本认出来的还是点出来的，一律不再参与 */
  var mute=kpState.mute||{};
  Object.keys(cond).forEach(function(dim){
    cond[dim]=(cond[dim]||[]).filter(function(v){ return !mute[dim+':'+v]; });
  });
  if(kpState.forbidden && kpState.forbidden.creature) cond.creature=[];
  /* 怪物维度（怪物描写页签） */
  var cdim=[];
  KP_CDIM_KEYS.forEach(function(k){ if(kpState.cdim && kpState.cdim[k]) cdim.push(k); });
  return {cond:cond, forbidden:fo, delay:dly, notes:notes, cdim:cdim,
    restriction:kpList(kpState.restriction)};
}
/* 「当前条件」那一行显示什么 —— 也用来做删除 */
function kpCondItems(r){
  var items=[], dims=['scene','creature','time','weather','mood','light','emotion','event','object','focus','anomaly','supernatural'];
  dims.forEach(function(dim){
    (r.cond[dim]||[]).forEach(function(v){
      if(dim==='anomaly' && v==='none') return;
      if(dim==='supernatural' && v==='none') return;
      items.push({k:'c',dim:dim,v:v,txt:kpOptName(dim,v)});
    });
  });
  KP_NEGN_KEYS.forEach(function(k){
    if(r.forbidden[k]) items.push({k:'f',dim:k,v:'',txt:KP_NEGN[k]});
    else if(r.delay[k]) items.push({k:'d',dim:k,v:'',txt:KP_NEGN[k]+'（稍后）'});
  });
  if(r.restriction) items.push({k:'r',dim:'restriction',v:'',txt:'自定义：'+r.restriction});
  return items;
}
/* 点条件上的 × ：从三个入口里都删掉这一条 */
function kpDropItem(kind,dim,v){
  kpSync();
  if(kind==='r'){ kpState.restriction=''; kpSave(); xpRefresh(); return; }
  if(kind==='f'){ delete kpState.forbidden[dim]; kpSave(); xpRefresh(); return; }
  if(kind==='d'){ delete kpState.delay[dim]; kpSave(); xpRefresh(); return; }
  /* 从「一句话」里认出来的条件没法从文本里抹掉，就记一笔「别再认它」，这样 × 一定管用 */
  if(!kpState.mute) kpState.mute={};
  kpState.mute[dim+':'+v]=1;
  ['quick','adv'].forEach(function(bag){
    var b=kpState[bag]; if(!b||!b[dim]) return;
    var arr=Array.isArray(b[dim])? b[dim]:[b[dim]];
    arr=arr.filter(function(x){ return x!==v; });
    if(arr.length) b[dim]=(KP_SINGLE_DIM[dim]?arr[0]:arr); else delete b[dim];
  });
  /* 文本里的这一条：把命中的词挖掉就删不动（中文没法可靠回写），所以只清空整句输入 */
  kpSave(); xpRefresh();
}
/* 禁用 / 延迟开关（更多设置） */
function kpToggleBan(kind,k){
  kpSync();
  var bag=(kind==='delay')? kpState.delay : kpState.forbidden;
  var other=(kind==='delay')? kpState.forbidden : kpState.delay;
  if(bag[k]) delete bag[k]; else { delete other[k]; bag[k]=true; }
  kpSave(); xpRefresh();
}

/* ================= 素材匹配 ================= */
var KP_FOCUS2DIM={sight:'sight',sound:'sound',smell:'smell',temp:'temp',touch:'touch',light:'light',
  env:'air',react:'react',anomaly:'anomaly'};
var KP_SDIM_ORDER=['sight','sound','smell','temp','touch','light','air','react','anomaly'];
var KP_BANK_DIM={event:'air',move:'move',hook:'hook',end:'end',anomaly:'anomaly',react:'react',
  super:'super',creature:'creature',trace:'air',delay:'air'};

/* 禁止条件落到素材上：声音 / 血 / 死 / 小孩 / 发疯 / 攻击 都不许出现 */
function kpTextOK(t,dim,fo){
  if(!t) return false;
  if(fo.sound && dim==='sound') return false;
  if(fo.light && dim==='light') return false;
  if((fo.blood||fo.gore) && /血|内脏|断肢|肢解/.test(t)) return false;
  if((fo.death||fo.body) && /尸|遗骸|死人/.test(t)) return false;
  if(fo.child && /孩子|小孩|儿童|婴儿/.test(t)) return false;
  if(fo.insanity && /疯|崩溃/.test(t)) return false;
  if(fo.attack && /攻击|扑上来|袭击|咬住|抓上来/.test(t)) return false;
  return true;
}
function kpEvOK(v,fo){
  var tr=kpTrOf('event',v);
  if(fo.sound && kpHasIn(tr,'sound')) return false;
  if((fo.blood||fo.gore) && kpHasIn(tr,'bloody')) return false;
  if(fo.creature && kpHasIn(tr,'creature')) return false;
  if(fo.supernatural && kpHasIn(tr,'super')) return false;
  if((fo.death||fo.body) && v==='body') return false;
  if(fo.attack && v==='chase') return false;
  return true;
}
/* 用户自己存的素材：按标签匹配度排序（场景 3 分，怪物 2 分，时间/天气/氛围各 1 分） */
function kpMinePick(cond){
  var list=kpState.mine||[], out=[], all=list.length;
  if(!all) return out;
  var anyCond=false;
  ['scene','creature','time','weather'].forEach(function(d){ if((cond[d]||[]).length) anyCond=true; });
  if((cond.mood||[]).length) anyCond=true;
  list.forEach(function(m){
    var tg=m.tags||{}, s=0;
    if((cond.scene||[])[0] && tg.scene===cond.scene[0]) s+=3;
    if((cond.creature||[])[0] && tg.creature===cond.creature[0]) s+=2;
    if((cond.time||[])[0] && tg.time===cond.time[0]) s+=1;
    if((cond.weather||[])[0] && tg.weather===cond.weather[0]) s+=1;
    (cond.mood||[]).forEach(function(mv){ if(kpHasIn(tg.mood,mv)) s+=1; });
    if(!tg.scene && !tg.creature) s+=0.5;
    if(!anyCond) s+=1;
    if(s>0) out.push({m:m,s:s});
  });
  out.sort(function(a,b){ return b.s-a.s; });
  return out.map(function(x){ return x.m; });
}
/* 候选素材：按「用户明确要求 → 场景 → 通用 → 补充」排好序，系统补充永远排在最后 */
function kpCands(cond,fo,dly){
  var c=[], sc=(cond.scene||[])[0]? kpFindScene(cond.scene[0]) : null;
  var slots=kpSlots(cond);
  function add(t,d,must){ t=kpFill(t,slots); if(t && kpTextOK(t,d,fo)) c.push({t:t,d:d,must:must?1:0}); }
  /* ① 明确说了的氛围 / 事件 / 物体：先保证它们出现（标成 must，选句时一定排进去） */
  (cond.mood||[]).forEach(function(m){
    var arr=KP_MOOD_SAY[m]||(KP_MOOD_CLAUSE[m]? [KP_MOOD_CLAUSE[m]] : []);
    arr.forEach(function(x){ add(x,'mood',1); });
  });
  (cond.event||[]).forEach(function(v){
    if(!kpEvOK(v,fo)) return;
    var arr=KP_EVENT_SAY[v]||(KP_EVENT_CLAUSE[v]? [KP_EVENT_CLAUSE[v]] : []);
    arr.forEach(function(x){ add(x,'event',1); });
  });
  (cond.object||[]).forEach(function(v){
    var arr=KP_OBJECT_SAY[v]||(KP_OBJECT_CLAUSE[v]? [KP_OBJECT_CLAUSE[v]] : []);
    arr.forEach(function(x){ add(x,'object',1); });
  });
  /* ①.5 用户明确给了天气 / 时间：这一段里必须有，不然生成出来就不符合原始条件了 */
  var wv=(cond.weather||[])[0], tv=(cond.time||[])[0];
  if(wv && tv){
    /* 两样都给：一句里同时带上，占一个位置就够 */
    KP_WT_SAY.forEach(function(x){ add(x,'env',1); });
  } else if(wv){
    (KP_WEATHER_SAY[wv]||[]).forEach(function(x){ add(x,'env',1); });
    kpShuffled(KP_UNIV.weather[wv]||[]).forEach(function(e){ add(kpUVal(e),'env',1); });
  } else if(tv){
    (KP_TIME_SAY[tv]||[]).forEach(function(x){ add(x,'env',1); });
    kpShuffled(KP_UNIV.time[tv]||[]).forEach(function(e){ add(kpUVal(e),'env',1); });
  }
  /* ② 我的素材 */
  kpMinePick(cond).forEach(function(m){ add(m.t,'mine',1); });
  /* ③ 场景素材（场景自身 + 场景加料），永远优先于通用素材 */
  var order=[];
  (cond.focus||[]).forEach(function(f){ var d=KP_FOCUS2DIM[f]; if(d && order.indexOf(d)<0) order.push(d); });
  KP_SDIM_ORDER.forEach(function(d){ if(order.indexOf(d)<0) order.push(d); });
  if(sc){
    /* 场景开场句：L.open 和加料里的 open 合起来抽，不然每个场景只有一句，连点就会重复 */
    add(kpRandOne((sc.L.open||[]).concat((KP_SCENE_EXT[sc.v]||{}).open||[])),'open');
    var ext=KP_SCENE_EXT[sc.v]||null, extra=[];
    Object.keys(sc.L||{}).forEach(function(k2){ if(order.indexOf(k2)<0 && extra.indexOf(k2)<0) extra.push(k2); });
    if(ext) Object.keys(ext).forEach(function(k2){ if(order.indexOf(k2)<0 && extra.indexOf(k2)<0) extra.push(k2); });
    order=order.concat(extra);
    order.forEach(function(d){
      var arr=(sc.L[d]||[]).concat((ext&&ext[d])||[]);
      kpShuffled(arr).forEach(function(x){ add(x,d); });
    });
  }
  /* ③.5 口述句库：事实 / 动作 / 对话 / 观察 / 发现…任何场景都能铺，也是「像 KP 现场念的」那一批 */
  Object.keys(KP_UNIV2).forEach(function(d){
    kpShuffled(KP_UNIV2[d]||[]).forEach(function(x){ add(x,d); });
  });
  /* ④ 天气 / 时间 / 氛围 / 光线 / 情绪的通用写法 */
  var w=wv, t=tv;
  if(w && KP_UNIV.weather[w]) kpShuffled(KP_UNIV.weather[w]).forEach(function(e){ add(kpUVal(e),kpUDim(e,'air')); });
  if(t && KP_UNIV.time[t]) kpShuffled(KP_UNIV.time[t]).forEach(function(e){ add(kpUVal(e),kpUDim(e,'air')); });
  (cond.mood||[]).forEach(function(m){ if(KP_UNIV.mood[m]) kpShuffled(KP_UNIV.mood[m]).forEach(function(e){ add(kpUVal(e),kpUDim(e,'air')); }); });
  (cond.light||[]).forEach(function(l){ if(KP_UNIV.light[l]) kpShuffled(KP_UNIV.light[l]).forEach(function(e){ add(kpUVal(e),kpUDim(e,'light')); }); });
  (cond.emotion||[]).forEach(function(m){ if(KP_UNIV.emotion[m]) kpShuffled(KP_UNIV.emotion[m]).forEach(function(e){ add(kpUVal(e),kpUDim(e,'react')); }); });
  /* ⑤ 系统补充（事件 / 异常 / 超自然 / 反应 / 转场 / 悬念 / 收尾）—— 最低优先级 */
  var an=(cond.anomaly||[])[0], su=(cond.supernatural||[])[0], banks=[];
  if(fo.creature) banks.push('trace');
  if(dly.creature){ banks.push('delay'); banks.push('trace'); }
  if(an && an!=='none') banks.push('anomaly');
  else if(an!=='none' && kpState.length!=='short') banks.push('anomaly');
  if(su && su!=='none' && !fo.supernatural) banks.push('super');
  if(!fo.creature && (dly.creature || (an&&an!=='none') || (su&&su!=='none'))) banks.push('creature');
  banks.push('react');
  banks.push('event');
  if(kpState.length!=='short') banks.push('move');
  if(kpState.length==='long'){ banks.push('hook'); banks.push('end'); }
  banks.forEach(function(b){
    kpShuffled((KP_UNIV.bank&&KP_UNIV.bank[b])||[]).forEach(function(e){
      add(kpUVal(e),kpUDim(e,KP_BANK_DIM[b]||'air'));
    });
  });
  return c;
}
/* 组段：按「段落结构」排句子 —— 每个槽位取该维度里最近没用过的一句；用户明确要求的条件一定排进去。
   同时避开最近几段用过的整句 / 句式 / 意象，所以连点「再来一段」不会老是同一批句子。 */
function kpSelect(cands,want,keys,out,plan){
  var rec=kpRec(), i, c, tx, pool=[];
  for(i=0;i<cands.length;i++){
    c=cands[i]; if(!c || !c.t) continue;
    tx=kpTidy(c.t); if(!tx || keys[tx]) continue;
    if(!c.must && kpHasIn(rec.mat,tx)) continue;          /* 最近几段用过的整句不重复（用户明确要求的条件句除外，它必须出现） */
    pool.push({t:tx,d:c.d||'air',must:c.must?1:0,idx:i,sig:kpSig(tx),im:kpImagKeys(tx)});
  }
  var byDim={};
  for(i=0;i<pool.length;i++){ var o=pool[i]; (byDim[o.d]||(byDim[o.d]=[])).push(o); }
  var used={}, chosen=[];
  function score(o){ return kpRecentScore(o,rec); }
  function takeDim(d){
    var q=byDim[d]||[], k, best=null, bs=Infinity;
    for(k=0;k<q.length;k++){
      var x=q[k]; if(used[x.t]) continue;
      var sc=score(x);
      if(sc<bs){ bs=sc; best=x; if(sc===0) break; }
    }
    return best;
  }
  function accept(o){
    used[o.t]=1; keys[o.t]=1; chosen.push(o);
    kpRecPush('mat',o.t); kpRecPush('sig',o.sig);
    o.im.forEach(function(x){ kpRecPush('imag',x); });
  }
  /* ① 先按段落结构排槽位 */
  (plan||[]).forEach(function(d){
    if(chosen.length>=want) return;
    var o=takeDim(d); if(o) accept(o);
  });
  /* ② 用户明确要求的条件（氛围 / 事件 / 物体 / 我的素材）：同一维度至少出现一句，插在中间而不是堆到末尾 */
  var mustSeen={};
  chosen.forEach(function(o){ if(o.must) mustSeen[o.d]=1; });
  pool.filter(function(o){ return o.must && !used[o.t]; })
    .sort(function(a,b){ return (score(a)-score(b))||(a.idx-b.idx); })
    .forEach(function(o){
    if(chosen.length>=want) return;
    if(mustSeen[o.d]) return;
    mustSeen[o.d]=1; used[o.t]=1; keys[o.t]=1;
    var at=chosen.length? 1+Math.floor(Math.random()*chosen.length) : 0;
    chosen.splice(at,0,o);
    kpRecPush('mat',o.t); kpRecPush('sig',o.sig);
    o.im.forEach(function(x){ kpRecPush('imag',x); });
  });
  /* ③ 还没排满就从剩下的候选里按「最近没用过」的顺序补，避免相邻同维度 */
  var rest=pool.slice().sort(function(a,b){ return (b.must-a.must)||(score(a)-score(b))||(a.idx-b.idx); });
  var deferred=[];
  function spare(o){
    /* 明确要求的维度已经有一句了，就不再补第二句（免得同一段里出现两次「发现尸体」） */
    if(o.must && mustSeen[o.d]) return false;
    return true;
  }
  for(i=0;i<rest.length && chosen.length<want;i++){
    var o2=rest[i]; if(used[o2.t] || !spare(o2)) continue;
    if(chosen.length && chosen[chosen.length-1].d===o2.d){ deferred.push(o2); continue; }
    if(o2.must) mustSeen[o2.d]=1;
    accept(o2);
  }
  for(i=0;i<deferred.length && chosen.length<want;i++){
    var o3=deferred[i]; if(used[o3.t] || !spare(o3)) continue;
    if(o3.must) mustSeen[o3.d]=1;
    accept(o3);
  }
  chosen.forEach(function(o){ out.push({t:o.t,d:o.d}); });
  return out;
}
/* 一次生成：先选「叙述入口」，再选「段落结构」，再按结构铺素材（开头 / 结构 / 维度 / 素材每次都会重挑） */
function kpBuild(r,want,keys,cmode){
  var cond=r.cond, out=[], i, op, t1;
  if(cmode===undefined) cmode=kpCreatureMode(r);
  if(cmode) kpState.creature=cmode;
  if(cmode){
    /* 怪物：只在有场景 / 时间 / 天气时给一句开场，其余全是它自己的素材维度 */
    if(!r.delay.creature && kpFrameOf(cond)){
      for(t1=0;t1<3 && !op;t1++){
        var o1=kpPickOpener(cond,kpSlots(cond));
        if(o1 && !keys[o1.t]) op=o1;
      }
      if(op){ out.push({t:op.t,d:'open'}); kpRecPush('open',op.type); }
    }
    var dims=kpCreatureDims(), cands=[];
    if(r.delay.creature){
      dims=['env','observe'];
      kpShuffled((KP_UNIV.bank&&KP_UNIV.bank.delay)||[]).forEach(function(e){ cands.push({t:kpUVal(e),d:'delay'}); });
    }
    cands=cands.concat(kpCreatureCands(kpFindCreature(cmode),dims,r.forbidden));
    var want2=want-out.length;
    if(want2>0){
      var plan2=kpPickPlan(cands,want2,cond);
      kpRecPush('struct',plan2.join('>'));
      kpSelect(cands,want2,keys,out,plan2);
    }
    return out;
  }
  for(t1=0;t1<4 && !op;t1++){
    var o2=kpPickOpener(cond,kpSlots(cond));
    if(o2 && !keys[o2.t]) op=o2;
  }
  if(op){ out.push({t:op.t,d:'open'}); kpRecPush('open',op.type); }
  var cands2=kpCands(cond,r.forbidden,r.delay);
  var want3=want-out.length;
  if(want3>0){
    var plan3=kpPickPlan(cands2,want3,cond);
    kpRecPush('struct',plan3.join('>'));
    kpSelect(cands2,want3,keys,out,plan3);
  }
  return out;
}
function kpFrameOf(cond){
  var sc=(cond.scene||[])[0]? kpFindScene(cond.scene[0]) : null;
  var t=(cond.time||[])[0]? kpOptOf('time',cond.time[0]) : null;
  var w=(cond.weather||[])[0]? kpOptOf('weather',cond.weather[0]) : null;
  var key=(sc&&t&&w)?'tws':(sc&&t)?'ts':(sc&&w)?'ws':(t&&w)?'tw':sc?'s':w?'w':t?'t':'none';
  var s=KP_FRAME[key]||'';
  if(!s) return '';
  return kpTidy(s.replace('{t}',t?t.n:'').replace('{w}',w?w.n:'').replace('{sc}',sc?sc.n:''));
}
/* ================= 怪物描写 ================= */
function kpCreatureDims(){
  var sel=[];
  KP_CDIM_KEYS.forEach(function(k){ if(kpState.cdim && kpState.cdim[k]) sel.push(k); });
  if(sel.length) return sel;
  if(kpState.length==='short') return ['first','look','act'];
  if(kpState.length==='mid') return ['first','look','act','sound','smell','env'];
  return KP_CDIM_KEYS.slice(0,10);
}
function kpCreatureCands(cr,dims,fo){
  var c=[];
  if(!cr) return c;
  var ext=KP_CREATURE_EXT[cr.v]||null;
  dims.forEach(function(k){
    var arr=(cr.c&&cr.c[k]||[]).concat((ext&&ext[k])||[]);
    kpShuffled(arr).forEach(function(x){
      if(kpTextOK(x,k,fo)) c.push({t:x,d:'c-'+k});
    });
  });
  return c;
}
function kpCreaturePick(){
  var v=kpState.creature;
  if(v && kpFindCreature(v)) return v;
  var pick=kpRandOne(KP_CREATURES).v;
  kpState.creature=pick;
  return pick;
}
/* 什么时候按「怪物描写」走：① 条件里点了/说了怪物  ② 当前就在「怪物描写」页签（用选中的那只，没选就随机一只） */
function kpCreatureMode(r){
  if(r.forbidden.creature) return '';
  if((r.cond.creature||[]).length) return r.cond.creature[0];
  if(kpState.tab==='creature') return kpCreaturePick();
  return '';
}
/* ================= 生成 / 撤销 / 继续 / 扩写 / 长度 ================= */
function kpDegradeNote(r,got,want){
  var h=[];
  var anyCond=Object.keys(r.cond).some(function(k){ return (r.cond[k]||[]).length; });
  if(!anyCond) h.push('没给条件，先按通用素材出了一段；写一句话或点个标签会更贴合。');
  else if(!(r.cond.scene||[]).length && !(r.cond.creature||[]).length)
    h.push('没有具体场景，已按你的时间／天气／氛围用通用素材生成。');
  if(got<want) h.push('当前素材较少，已用通用素材补足，部分条件可能不够具体。');
  if(r.forbidden.creature && !r.delay.creature)
    h.push('已按「不要出现怪物」处理：只写异常、温度、灯光和痕迹，不会有具体怪物。');
  kpState.hint=h.join(' ');
}
function kpGen(){
  kpSync();
  var r=kpResolve();
  kpState.notes=r.notes||[];
  var want=KP_LEN_N[kpState.length]||6, keys={};
  var cmode=kpCreatureMode(r);
  var out=kpBuild(r,want,keys,cmode);
  kpState.ctx={cond:r.cond,forbidden:r.forbidden,delay:r.delay,used:keys,creature:cmode||''};
  kpState.lines=out.map(function(o){ return {i:kpNextId(),t:o.t,d:o.d,lock:false}; });
  if(cmode){
    var cr=kpFindCreature(cmode);
    kpState.hint='怪物描写：用「'+(cr?cr.n:cmode)+'」自己的素材，按 '+
      kpCreatureDims().map(function(k){ return KP_CDIM_N[k]; }).join(' / ')+' 铺开。'+
      (r.delay.creature? '按「延迟」处理：这一段它不露面。':'')+
      (out.length<want? ' 素材较少，已用通用素材补足。':'');
    if(r.notes&&r.notes.length) kpState.notes=r.notes;
  } else {
    kpDegradeNote(r,out.length,want);
  }
  kpSave(); xpRefresh();
  kpAfterGen();
}
function kpCandsOfCtx(ctx){
  if(ctx.creature && !ctx.forbidden.creature)
    return kpCreatureCands(kpFindCreature(ctx.creature),kpCreatureDims(),ctx.forbidden);
  return kpCands(ctx.cond,ctx.forbidden,ctx.delay);
}
function kpAppend(n,mode){
  var ctx=kpState.ctx;
  if(!ctx) return 0;
  var keys=ctx.used||(ctx.used={}), out=[];
  var cands=kpCandsOfCtx(ctx);
  if(mode==='expand'){
    var seen={};
    kpState.lines.forEach(function(l){ seen[l.d]=1; });
    var prefer=cands.filter(function(c){ return !seen[c.d]; });
    if(prefer.length) cands=prefer;
  }
  var plan=kpPickPlan(cands,n,ctx.cond);
  kpRecPush('struct',plan.join('>'));
  kpSelect(cands,n,keys,out,plan);
  if(out.length<n){
    var k2={}; out.forEach(function(o){ k2[o.t]=1; });
    kpSelect(cands,n-out.length,k2,out,plan);
  }
  out.forEach(function(o){ kpState.lines.push({i:kpNextId(),t:o.t,d:o.d,lock:false}); });
  return out.length;
}
function kpContinue(){
  kpSync();
  if(!kpState.ctx){ kpGen(); return; }
  var n=Math.max(2,Math.round((KP_LEN_N[kpState.length]||6)/2));
  kpAppend(n,'cont');
  kpSave(); xpRefresh(); kpAfterGen();
}
function kpExpand(){
  kpSync();
  if(!kpState.ctx){ kpGen(); return; }
  kpAppend(2,'expand');
  kpSave(); xpRefresh(); kpAfterGen();
}
function kpAgain(){
  kpSync();
  var ctx=kpState.ctx;
  if(!ctx || !kpState.lines.length){ kpGen(); return; }
  var want=KP_LEN_N[kpState.length]||6;
  var locked=kpState.lines.filter(function(l){ return l.lock; });
  if(locked.length>=want){
    toast('锁定的句子已经占满了当前长度，先解锁几句或把长度调长');
    return;
  }
  var keys={}, out=[];
  locked.forEach(function(l){ keys[l.t]=1; });
  out=kpBuild({cond:ctx.cond,forbidden:ctx.forbidden,delay:ctx.delay},want-locked.length,keys,ctx.creature||'');
  var it=0, res=[];
  kpState.lines.forEach(function(l){
    if(l.lock) res.push(l);
    else if(it<out.length){ res.push({i:kpNextId(),t:out[it].t,d:out[it].d,lock:false}); it++; }
  });
  while(it<out.length){ res.push({i:kpNextId(),t:out[it].t,d:out[it].d,lock:false}); it++; }
  ctx.used=keys;
  kpState.lines=res;
  kpSave(); xpRefresh(); kpAfterGen();
}
function kpSetLen(l){
  if(!KP_LEN_TXT[l]) return;
  kpSync();
  kpState.length=l;
  var want=KP_LEN_N[l]||6;
  if(kpState.lines.length>want){
    var i=kpState.lines.length-1;
    while(kpState.lines.length>want && i>=0){
      if(!kpState.lines[i].lock) kpState.lines.splice(i,1);
      i--;
    }
  } else if(kpState.lines.length && kpState.lines.length<want){
    kpAppend(want-kpState.lines.length,'expand');
  }
  kpSave(); xpRefresh();
}

/* ================= 结果操作：锁定 / 复制 ================= */
function kpLock(){
  kpSync();
  var sel='';
  try{ sel=kpList(window.getSelection? window.getSelection().toString():''); }catch(e){}
  if(!sel){ toast('先用鼠标选中要锁的那一句，再点「锁定句子」'); return; }
  var hit=0;
  kpState.lines.forEach(function(l){ if(l.t.indexOf(sel)>=0){ l.lock=true; hit++; } });
  if(!hit) toast('没找到这一句，试试一次选一整句');
  else toast('已锁定 '+hit+' 句：重新生成时它们不会变');
  kpSave(); xpRefresh();
}
function kpTapLock(i){
  var l=kpState.lines[i]; if(!l) return;
  l.lock=!l.lock; kpSave(); xpRefresh();
}
function kpUnlockAll(){
  kpState.lines.forEach(function(l){ l.lock=false; });
  kpSave(); xpRefresh();
}
function kpCopy(){ rtCopy((kpState.lines||[]).map(function(l){ return l.t; }).join(''),'描写'); }
/* 生成完把结果带进视野（手机上半屏全是标签，不然还得自己往下划）；已经看得见就不动 */
function kpFocusOut(){
  try{
    var el=$('kpOut');
    if(el && el.scrollIntoView) el.scrollIntoView({block:'nearest'});
  }catch(e){}
}
function kpAfterGen(){ setTimeout(kpFocusOut,0); }

/* ================= 我的素材 ================= */
function kpMineTags(text){
  var p=kpParseText(text), c=p.cond, tg={};
  if((c.scene||[])[0]) tg.scene=c.scene[0];
  if((c.creature||[])[0]) tg.creature=c.creature[0];
  if((c.time||[])[0]) tg.time=c.time[0];
  if((c.weather||[])[0]) tg.weather=c.weather[0];
  if((c.mood||[]).length) tg.mood=c.mood.slice(0,4);
  if((c.object||[]).length) tg.object=c.object.slice(0,3);
  return tg;
}
function kpMineDraft(){
  var el=$('kpMineText'), t=el? kpList(el.value):'';
  if(!t){ toast('先写一句或一段再点'); return; }
  kpState.draft={t:t,tags:kpMineTags(t)};
  xpRefresh();
}
function kpDraftDrop(k,v){
  if(!kpState.draft) return;
  if(k==='mood'||k==='object'){
    kpState.draft.tags[k]=(kpState.draft.tags[k]||[]).filter(function(x){ return x!==v; });
    if(!kpState.draft.tags[k].length) delete kpState.draft.tags[k];
  } else delete kpState.draft.tags[k];
  xpRefresh();
}
function kpDraftSet(k,v){
  if(!kpState.draft) return;
  if(v) kpState.draft.tags[k]=v; else delete kpState.draft.tags[k];
  xpRefresh();
}
function kpMineSave(){
  if(!kpState.draft) return;
  kpState.mine.unshift({id:'km'+Date.now()+Math.floor(Math.random()*1000), t:kpTidy(kpState.draft.t), tags:kpState.draft.tags||{}});
  kpState.draft=null;
  kpSave(); xpRefresh(); toast('已加入我的素材');
}
function kpMineCancel(){ kpState.draft=null; xpRefresh(); }
function kpMineDel(id){
  kpState.mine=(kpState.mine||[]).filter(function(m){ return m.id!==id; });
  kpSave(); xpRefresh();
}
function kpMineUse(id){
  var m=null;
  (kpState.mine||[]).forEach(function(x){ if(x.id===id) m=x; });
  if(!m) return;
  kpState.text=m.t; kpState.tab='scene';
  kpGen();
}
/* ================= 条件入口：快捷标签 / 更多设置 ================= */
function kpTag(dim,v,alsoGen){
  kpSync();
  if(kpState.mute) delete kpState.mute[dim+':'+v];
  var bag=kpState.quick;
  var cur=Array.isArray(bag[dim])? bag[dim].slice() : (bag[dim]? [bag[dim]] : []);
  var i=cur.indexOf(v);
  if(i>=0) cur.splice(i,1);
  else if(KP_SINGLE_DIM[dim]){
    var old=cur[0];
    if(old && old!==v && kpExcl(dim,old,v))
      toast(kpOptName(dim,old)+' 和 '+kpOptName(dim,v)+' 互斥，已用「'+kpOptName(dim,v)+'」替换');
    cur=[v];
  }
  else {
    cur=cur.filter(function(x){
      if(kpExcl(dim,x,v)){ toast(kpOptName(dim,x)+' 和 '+kpOptName(dim,v)+' 互斥，已用后者替换'); return false; }
      return true;
    });
    if(cur.indexOf(v)<0) cur.push(v);
  }
  if(cur.length) bag[dim]=(KP_SINGLE_DIM[dim]? cur[0] : cur); else delete bag[dim];
  kpSave();
    if(alsoGen) kpGen(); else xpRefresh();
}
/* 点场景标签：直接出结果（一键场景生成） */
function kpTagGen(dim,v){ kpTag(dim,v,true); }
function kpSetAdv(dim,v){
  kpSync();
  if(kpState.mute) delete kpState.mute[dim+':'+v];
  var bag=kpState.adv;
  var cur=Array.isArray(bag[dim])? bag[dim].slice() : (bag[dim]? [bag[dim]] : []);
  var i=cur.indexOf(v);
  if(i>=0) cur.splice(i,1);
  else if(KP_SINGLE_DIM[dim]) cur=[v];
  else {
    cur=cur.filter(function(x){ return !kpExcl(dim,x,v); });
    if(cur.indexOf(v)<0) cur.push(v);
  }
  if(cur.length) bag[dim]=(KP_SINGLE_DIM[dim]? cur[0] : cur); else delete bag[dim];
  kpSave(); xpRefresh();
}
function kpSetTab(t){ kpSync(); kpState.tab=t; kpSave(); xpRefresh(); }
function kpToggleAdv(){ kpSync(); kpState.showAdv=!kpState.showAdv; kpSave(); xpRefresh(); }
function kpSetCreature(v){ kpSync(); kpState.creature=v; kpSave(); xpRefresh(); }
function kpRandCreature(){ kpSync(); kpState.creature=kpRandOne(KP_CREATURES).v; kpSave(); xpRefresh(); }
function kpToggleCdim(k){
  kpSync();
  if(kpState.cdim[k]) delete kpState.cdim[k]; else kpState.cdim[k]=true;
  kpSave(); xpRefresh();
}
function kpSetRestr(v){ kpState.restriction=String(v==null?'':v); kpSave(); }
/* 清空全部数据时一起重置（不然内存里还留着「我的素材」，下一次保存又写回去了） */
function kpResetAll(){
  kpState.tab='scene'; kpState.text=''; kpState.quick={}; kpState.adv={}; kpState.forbidden={};
  kpState.delay={}; kpState.restriction=''; kpState.length='mid'; kpState.showAdv=false;
  kpState.creature=''; kpState.cdim={}; kpState.mine=[]; kpState.draft=null;
  kpState.mute={}; kpState.recent=null;
  kpState.lines=[]; kpState.hint=''; kpState.notes=[]; kpState.ctx=null; kpState.seq=0;
}
function kpClear(){
  kpSync();
  kpState.text=''; kpState.quick={}; kpState.adv={}; kpState.forbidden={}; kpState.delay={};
  kpState.restriction=''; kpState.lines=[]; kpState.notes=[]; kpState.hint=''; kpState.ctx=null;
  kpState.creature=''; kpState.cdim={}; kpState.mute={}; kpState.recent=null;
  kpSave(); xpRefresh();
}

/* ================= UI ================= */
function kpTabBarHTML(){
  var tabs=[['scene','🏚 场景描写'],['creature','🐙 怪物描写'],['mine','⭐ 我的素材']];
  return '<div class="xp-line kp-tabbar"><b>✍️ KP正在瞎编！</b>'+
    tabs.map(function(t){
      return '<button class="small xp-chip'+(kpState.tab===t[0]?' on':'')+'" onclick="kpSetTab(\''+t[0]+'\')">'+t[1]+'</button>';
    }).join('')+'<span class="hint">本地素材 · 不联网</span></div>';
}
function kpChipRow(label,items,sel,fn,dim){
  return '<div class="kp-qrow"><span class="kp-qlab">'+label+'</span><span class="xp-chips">'+
    items.map(function(it){
      return '<button class="small xp-chip'+(kpHasIn(sel,it[0])?' on':'')+'" onclick="'+fn+'(\''+dim+'\',\''+it[0]+'\')">'+esc(it[1])+'</button>';
    }).join('')+'</span></div>';
}
function kpCondsHTML(r){
  if(!r) r=kpResolve();
  var items=kpCondItems(r);
  var html=items.map(function(it){
    return '<span class="kp-c"><b>'+esc(it.txt)+'</b>'+
      '<em onclick="kpDropItem(\''+it.k+'\',\''+it.dim+'\',\''+esc(it.v)+'\')" title="删掉这个条件">×</em></span>';
  }).join('');
  return '<div class="kp-conds">当前条件：'+(html||'<span class="hint">还没有条件 —— 写一句话，或点上面的标签</span>')+'</div>';
}
function kpAdvHTML(){
  return '<div class="xp-box kp-advbox">'+
    '<div class="xp-line"><button class="small ghost" onclick="kpToggleAdv()">'+(kpState.showAdv?'▾':'▸')+' 更多设置</button>'+
      '<span class="hint">不点开也能用：一句话或几个标签就够了</span></div>'+
    (kpState.showAdv? kpAdvBodyHTML() : '')+'</div>';
}
function kpAdvBodyHTML(){
  function opts(dim){ return kpOptArr(dim).map(function(o){ return [o.v,o.n]; }); }
  var cur=(kpState.adv&&kpState.adv.focus)||[];
  kpRendered.restr=kpState.restriction;
  return '<div class="kp-qrow"><span class="kp-qlab">物体</span><span class="xp-chips">'+
      opts('object').map(function(o){ return kpChip1('object',o,(kpState.adv.object||[])); }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">事件</span><span class="xp-chips">'+
      opts('event').map(function(o){ return kpChip1('event',o,(kpState.adv.event||[])); }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">描写重点</span><span class="xp-chips">'+
      opts('focus').map(function(o){ return kpChip1('focus',o,cur); }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">光线</span><span class="xp-chips">'+
      opts('light').map(function(o){ return kpChip1('light',o,(kpState.adv.light||[])); }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">情绪</span><span class="xp-chips">'+
      opts('emotion').map(function(o){ return kpChip1('emotion',o,(kpState.adv.emotion||[])); }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">异常</span><span class="xp-chips">'+
      opts('anomaly').map(function(o){ return kpChip1('anomaly',o,(kpState.adv.anomaly||[])); }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">超自然</span><span class="xp-chips">'+
      opts('supernatural').map(function(o){ return kpChip1('supernatural',o,(kpState.adv.supernatural||[])); }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">不要出现</span><span class="xp-chips">'+
      KP_NEGN_KEYS.map(function(k){
        return '<button class="small xp-chip'+(kpState.forbidden[k]?' on':'')+'" onclick="kpToggleBan(\'ban\',\''+k+'\')">'+esc(KP_NEGN[k])+'</button>';
      }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">别马上来</span><span class="xp-chips">'+
      ['creature','attack'].map(function(k){
        return '<button class="small xp-chip'+(kpState.delay[k]?' on':'')+'" onclick="kpToggleBan(\'delay\',\''+k+'\')" title="'+
          esc(KP_NEGN[k])+'（可以存在，但这一段不露面）">'+esc(k==='creature'?'怪物':'攻击')+'（稍后）</button>';
      }).join('')+'</span></div>'+
    '<div class="kp-qrow"><span class="kp-qlab">自定义</span>'+
      '<input class="kp-in1" id="kpRestr" value="'+esc(kpState.restriction)+'" placeholder="例如：要有一点超自然感，但不要出现具体怪物" oninput="kpSetRestr(this.value)">'+
      '<button class="small ghost" onclick="kpSetRestr(document.getElementById(\'kpRestr\').value);xpRefresh()">应用</button></div>';
}
function kpChip1(dim,o,sel){
  return '<button class="small xp-chip'+(kpHasIn(sel,o[0])?' on':'')+'" onclick="kpSetAdv(\''+dim+'\',\''+o[0]+'\')">'+esc(o[1])+'</button>';
}
function kpResultHTML(){
  var L=kpState.lines||[], out;
  if(!L.length){
    out='<span class="hint">还没有结果。写一句话／点个标签，再点「✍️ 生成」。</span>';
  } else {
    out=L.map(function(l,i){
      return '<span class="kp-s'+(l.lock?' kp-locked':'')+'">'+
        (l.lock?'<em class="kp-lockb" onclick="kpTapLock('+i+')" title="点一下解锁">🔒</em>':'')+
        esc(l.t)+'</span>';
    }).join('');
  }
  var lens=[['short','短'],['mid','中'],['long','长']];
  return '<div class="xp-box kp-resbox">'+
    '<div class="xp-line">'+
      '<button class="small primary" onclick="kpAgain()">🎲 再来一段</button>'+
      '<button class="small" onclick="kpContinue()">➡ 继续</button>'+
      '<button class="small" onclick="kpExpand()">➕ 扩写</button>'+
      '<button class="small ghost" onmousedown="if(event.preventDefault)event.preventDefault()" onclick="kpLock()">🔒 锁定句子</button>'+
      '<button class="small ghost" onclick="kpUnlockAll()">解锁全部</button>'+
      '<button class="small ghost" onclick="kpCopy()">📋 复制</button>'+
    '</div>'+
    '<div class="xp-line"><b>长度</b><span class="xp-chips">'+lens.map(function(x){
      return '<button class="small xp-chip'+(kpState.length===x[0]?' on':'')+'" onclick="kpSetLen(\''+x[0]+'\')">'+x[1]+'</button>';
    }).join('')+'</span><span class="hint">选中哪一句再点「🔒 锁定句子」，重新生成时那句不会变</span></div>'+
    (kpState.hint? '<div class="kp-hint">⚠ '+esc(kpState.hint)+'</div>':'')+
    '<div class="kp-out" id="kpOut">'+out+'</div>'+
    (kpState.notes&&kpState.notes.length?
      '<details class="kp-note"><summary>解析提示（'+kpState.notes.length+'）</summary>'+
      kpState.notes.map(function(n){ return '<div class="kp-noteline">· '+esc(n)+'</div>'; }).join('')+'</details>':'')+
  '</div>';
}
function kpSceneHTML(){
  var r=kpResolve();
  var selScene=(r.cond.scene||[]), selTime=(r.cond.time||[]), selW=(r.cond.weather||[]), selMood=(r.cond.mood||[]);
  kpRendered.text=kpState.text;
  return kpTabBarHTML()+
    '<div class="xp-box">'+
      '<textarea class="kp-in" id="kpText" rows="2" oninput="kpOnText(this.value)" '+
        'placeholder="一句话描述你想写的，例如：凌晨三点，外面下着瓢泼大雨，废弃病院里特别阴冷。">'+esc(kpState.text)+'</textarea>'+
      '<div class="kp-line"><button class="small primary" onclick="kpGen()">✍️ 生成</button>'+
        '<button class="small ghost" onclick="kpClear()">清空条件</button>'+
        '<span class="hint">中文自然语言就行；说「不要…」会当成禁止条件</span></div>'+
    '</div>'+
    '<div class="xp-box kp-quick">'+
      kpChipRow('场景',KP_SCENES.map(function(s){ return [s.v,s.n]; }),selScene,'kpTagGen','scene')+
      kpChipRow('时间',KP_OPTS.time.map(function(o){ return [o.v,o.n]; }),selTime,'kpTag','time')+
      kpChipRow('天气',KP_OPTS.weather.map(function(o){ return [o.v,o.n]; }),selW,'kpTag','weather')+
      kpChipRow('氛围',KP_OPTS.mood.map(function(o){ return [o.v,o.n]; }),selMood,'kpTag','mood')+
      '<div class="hint">点「场景」直接出结果；其它标签点完再按「✍️ 生成」</div>'+
    '</div>'+
    kpCondsHTML(r)+
    kpAdvHTML()+
    kpResultHTML();
}
function kpCreatureHTML(){
  var r=kpResolve(), cur=kpState.creature||'';
  var chips=KP_CREATURES.map(function(c){
    return '<button class="small xp-chip'+(cur===c.v?' on':'')+'" onclick="kpSetCreature(\''+c.v+'\')">'+esc(c.n)+'</button>';
  }).join('');
  var dimChips=KP_CDIM_KEYS.map(function(k){
    return '<button class="small xp-chip'+((kpState.cdim&&kpState.cdim[k])?' on':'')+'" onclick="kpToggleCdim(\''+k+'\')">'+esc(KP_CDIM_N[k])+'</button>';
  }).join('');
  return kpTabBarHTML()+
    '<div class="xp-box">'+
      '<div class="xp-line"><b>怪物描写</b><span class="hint">只写它长什么样、怎么动、什么声音，不做人格模拟</span></div>'+
      '<div class="kp-qrow"><span class="kp-qlab">怪物</span><span class="xp-chips">'+chips+
        '<button class="small xp-chip" onclick="kpRandCreature()">🎲 随便一个</button></span></div>'+
      '<div class="kp-qrow"><span class="kp-qlab">写哪些</span><span class="xp-chips">'+dimChips+
        '<span class="hint">不选就按长度自动来</span></span></div>'+
      '<div class="kp-line"><button class="small primary" onclick="kpGen()">✍️ 生成</button></div>'+
    '</div>'+
    kpCondsHTML(r)+
    kpAdvHTML()+
    kpResultHTML();
}
function kpMineHTML(){
  var d=kpState.draft, tags=d? (d.tags||{}) : {};
  var tagHtml='';
  if(d){
    Object.keys(tags).forEach(function(k){
      var v=tags[k], list=Array.isArray(v)? v : [v];
      if(k==='mood'||k==='object'){
        list.forEach(function(x){ tagHtml+='<span class="kp-c"><b>'+esc(kpOptName(k,x))+'</b><em onclick="kpDraftDrop(\''+k+'\',\''+x+'\')">×</em></span>'; });
      } else {
        tagHtml+='<span class="kp-c"><b>'+esc(kpOptName(k,v))+'</b><em onclick="kpDraftDrop(\''+k+'\')">×</em></span>';
      }
    });
  }
  var selH='<select class="kp-sel" onchange="kpDraftSet(\'scene\',this.value)"><option value="">场景：自动</option>'+
    KP_SCENES.map(function(s){ return '<option value="'+s.v+'"'+(tags.scene===s.v?' selected':'')+'>'+esc(s.n)+'</option>'; }).join('')+'</select>';
  var selC='<select class="kp-sel" onchange="kpDraftSet(\'creature\',this.value)"><option value="">怪物：自动</option>'+
    KP_CREATURES.map(function(c){ return '<option value="'+c.v+'"'+(tags.creature===c.v?' selected':'')+'>'+esc(c.n)+'</option>'; }).join('')+'</select>';
  var list=(kpState.mine||[]).map(function(m){
    var tg=[], tt=m.tags||{};
    Object.keys(tt).forEach(function(k){
      var v=tt[k]; (Array.isArray(v)? v:[v]).forEach(function(x){ tg.push(kpOptName(k,x)); });
    });
    return '<div class="kp-mine"><div class="kp-minetxt">'+esc(m.t)+'</div>'+
      '<div class="kp-minetags">'+(tg.join(' · ')||'（没有标签，按通用素材用）')+'</div>'+
      '<div class="kp-mineline"><button class="small ghost" onclick="kpMineUse(\''+m.id+'\')">用这条生成</button>'+
      '<button class="small ghost" onclick="kpMineDel(\''+m.id+'\')">🗑 删除</button></div></div>';
  }).join('');
  return kpTabBarHTML()+
    '<div class="xp-box">'+
      '<div class="xp-line"><b>我的素材</b><span class="hint">自己写的句子，加进来以后会参与生成；只存在这台机器上</span></div>'+
      '<textarea class="kp-in" id="kpMineText" rows="3" placeholder="例：老旧病房的窗帘被风吹得轻轻摆动，玻璃外却没有任何风声。">'+esc(d?d.t:'')+'</textarea>'+
      '<div class="kp-line">'+
        (d? '<button class="small primary" onclick="kpMineSave()">⭐ 加入我的素材</button>'+
            '<button class="small ghost" onclick="kpMineCancel()">取消</button>'
          : '<button class="small" onclick="kpMineDraft()">🏷 自动认一下标签</button>')+
      '</div>'+
      (d? '<div class="kp-line"><span class="hint">认出这些标签，可以删掉不对的：</span>'+selH+selC+'</div>'+
          '<div class="kp-conds">'+(tagHtml||'<span class="hint">没认出标签，也可以直接保存</span>')+'</div>' : '')+
    '</div>'+
    '<div class="xp-box"><div class="xp-line"><b>已存的素材（'+(kpState.mine||[]).length+'）</b></div>'+
      (list||'<span class="hint">还没有自己的素材</span>')+'</div>';
}
/* 打字时不写 localStorage（每敲一个字都序列化整份存档会拖慢），点按钮时会 kpSync 一次 */
function kpOnText(v){ kpState.text=String(v==null?'':v); }
function kpPaneHTML(){
  kpEnsure();
  if(kpState.tab==='creature') return kpCreatureHTML();
  if(kpState.tab==='mine') return kpMineHTML();
  return kpSceneHTML();
}
