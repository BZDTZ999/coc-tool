/* ---------- 🐙 背景漂浮小装饰：小章鱼/手枪/笔记本等，永不停止；右上角开关 ---------- */
var DECOR_GLYPHS=['🐙','🦑','🔫','📓','📔','🧿','🕯️','📜','⌛','💊','🖋️','🗝️','🦇','🌙','⚗️','🗞️','☕','🕸️','🔦','🕵️'];
var DECOR_EGG_TEXT='你怎么不好好带团把装饰品彩蛋都玩出来了？？？';
/* 每次“开装饰”按下列概率抽一档：
   50% 普通（多种混合 · 常规漂浮）｜30% 单一品种｜10% 多种混合 · 飞得很快
   5% 多种混合 · 忽大忽小｜3% 单一品种 · 一直向下掉落
   1% 满屏巨大眼球 · 疯狂乱转｜1% 彩蛋文字（你怎么不好好带团…） */
var DECOR_TIERS=[
  {k:'normal', p:50}, {k:'single', p:30}, {k:'fast', p:10}, {k:'pulse', p:5},
  {k:'rain', p:3}, {k:'eyes', p:1}, {k:'text', p:1}
];
var _decorBits=[], _decorRAF=null, _decorLast=0, _decorTier=null;
function decorTierRoll(){
  var r=Math.random()*100, acc=0;
  for(var i=0;i<DECOR_TIERS.length;i++){ acc+=DECOR_TIERS[i].p; if(r<acc) return DECOR_TIERS[i].k; }
  return 'normal';
}
function decorOn(){ return !!(state&&state.ui&&state.ui.decor!==false); }
function decorCountFor(vw){ return vw<420?8:(vw<860?11:(vw<1400?15:20)); }
function applyDecorState(){
  var body=document.body; if(!body) return;
  body.classList.toggle('decoroff', !decorOn());
  var btn=$('decorToggle');
  if(btn){
    btn.textContent=decorOn()?'🐙 装饰：开':'🐙 装饰：关';
    btn.classList.toggle('on', decorOn());
  }
  if(decorOn()) spawnDecorBits(); else stopDecorBits();
}
function toggleDecor(){
  if(!state) return;
  if(!state.ui) state.ui={};
  state.ui.decor=!decorOn();
  /* 每次开启都重抽一档“装饰彩蛋” */
  if(state.ui.decor) _decorTier=decorTierRoll();
  saveStateQuiet();
  applyDecorState();
  toast(state.ui.decor?'背景漂浮小图标已开启':'背景漂浮小图标已关闭');
}
function decorAddBit(body,text,size,opacity,o){
  var el=document.createElement('span');
  el.className='decor-bit';
  el.textContent=text;
  body.appendChild(el);
  el.style.fontSize=Math.round(size)+'px';
  el.style.opacity=opacity;
  o=o||{};
  var b={
    el:el, x:o.x!=null?o.x:0, y:o.y!=null?o.y:0,
    vx:o.vx||0, vy:o.vy||0, ph:o.ph||0, sw:o.sw||0.7, rot:o.rot||Math.random()*360,
    speed:o.speed||1, spin:o.spin!=null?o.spin:8, mode:o.mode||'', base:size
  };
  _decorBits.push(b);
  return b;
}
function spawnDecorBits(tier){
  var body=document.body; if(!body) return;
  stopDecorBits();
  var vw=window.innerWidth||body.clientWidth||1200;
  var vh=window.innerHeight||body.clientHeight||800;
  var bg=body.classList.contains('bgcustom');
  var n=decorCountFor(vw);
  var t=tier||_decorTier||decorTierRoll();
  _decorTier=t;
  _decorBits=[];
  var i;
  if(t==='eyes'){
    /* 1%：满屏巨大的眼球，疯狂乱转 */
    var ne=Math.max(10, Math.round(vw/125));
    for(i=0;i<ne;i++){
      decorAddBit(body,'👁️',150+Math.random()*180, bg?0.30:0.24, {
        x:Math.random()*vw, y:Math.random()*vh,
        vx:(Math.random()*2-1)*26, vy:(Math.random()*2-1)*26,
        ph:Math.random()*Math.PI*2, sw:0.5+Math.random(), rot:Math.random()*360,
        spin:140+Math.random()*260, speed:1
      });
    }
  } else if(t==='text'){
    /* 1%：彩蛋文字，满地打滚 */
    var nt=Math.max(3, Math.round(vw/420));
    for(i=0;i<nt;i++){
      decorAddBit(body,DECOR_EGG_TEXT,18+Math.random()*22, bg?0.72:0.6, {
        x:Math.random()*vw*0.8, y:Math.random()*vh*0.85,
        vx:(Math.random()<0.5?-1:1)*(6+Math.random()*10), vy:Math.random()*4-2,
        ph:Math.random()*Math.PI*2, sw:0.4+Math.random()*0.5, rot:(Math.random()*2-1)*18,
        spin:6+Math.random()*10, speed:1
      });
    }
  } else {
    var oneGlyph=t==='single'||t==='rain'?DECOR_GLYPHS[Math.floor(Math.random()*DECOR_GLYPHS.length)]:null;
    var spd=t==='fast'?3.4:1;
    for(i=0;i<n;i++){
      var sz=13+Math.random()*30;
      /* 用户反馈太透明：提高不透明度，同时每次重开都随机取一套新的图标/姿态 */
      var op=bg?(0.20+Math.random()*0.34):(0.14+Math.random()*0.28);
      var dir=Math.random()<0.5?-1:1;
      var o={
        x:Math.random()*vw, y:Math.random()*vh,
        ph:Math.random()*Math.PI*2, sw:(0.4+Math.random()*0.9), speed:spd,
        mode:t, base:sz
      };
      if(t==='rain'){ o.vx=0; o.vy=55+Math.random()*70; o.spin=2+Math.random()*4; }
      else { o.vx=dir*(5+Math.random()*17); o.vy=(Math.random()*7-3.5); }
      decorAddBit(body, oneGlyph||DECOR_GLYPHS[Math.floor(Math.random()*DECOR_GLYPHS.length)], sz, op, o);
    }
  }
  if(_decorRAF==null){
    _decorLast=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
    _decorRAF=requestAnimationFrame(decorTick);
  }
}
function decorTick(){
  _decorRAF=requestAnimationFrame(decorTick);
  if(document.hidden) return;
  var now=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
  var dt=Math.min(0.05,((now-_decorLast)/1000)||0.016);
  _decorLast=now;
  var vw=window.innerWidth||document.body.clientWidth||1200;
  var vh=window.innerHeight||document.body.clientHeight||800;
  var t=now/1000;
  for(var i=0;i<_decorBits.length;i++){
    var b=_decorBits[i]; if(!b||!b.el) continue;
    var spd=b.speed||1;
    var wob=(b.mode==='rain'||b.mode==='eyes')?0:1;   /* 掉落/眼球档不再左右飘摆 */
    b.x+=b.vx*spd*dt+wob*Math.sin(t*b.sw+b.ph)*10*dt;
    b.y+=b.vy*spd*dt+wob*Math.cos(t*b.sw*0.8+b.ph)*7*dt;
    if(b.x<-80) b.x=vw+60; else if(b.x>vw+80) b.x=-60;
    if(b.y<-90) b.y=vh+70; else if(b.y>vh+90) b.y=-70;
    if(b.mode==='pulse'){
      /* 忽大忽小 */
      var k=1+0.55*Math.sin(t*2.1+b.ph);
      b.el.style.fontSize=Math.round(Math.max(8,(b.base||18)*k))+'px';
    }
    b.rot+=dt*(b.spin||8);
    b.el.style.transform='translate3d('+Math.round(b.x)+'px,'+Math.round(b.y)+'px,0) rotate('+(b.rot%360).toFixed(1)+'deg)';
  }
}
function stopDecorBits(){
  if(_decorRAF!=null){ cancelAnimationFrame(_decorRAF); _decorRAF=null; }
  (_decorBits||[]).forEach(function(b){ if(b&&b.el&&b.el.parentNode) b.el.parentNode.removeChild(b.el); });
  _decorBits=[];
}
(function bootDecor(){
  function start(){ applyDecorState(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  /* 兜底：无论 DOMContentLoaded 与数据兜底谁先跑，都要按最终 state.ui.decor 同步一次 */
  setTimeout(start, 0);
})();

