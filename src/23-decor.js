/* ---------- 🐙 背景漂浮小装饰：小章鱼/手枪/笔记本等，永不停止；右上角开关 ---------- */
var DECOR_GLYPHS=['🐙','🦑','🔫','📓','📔','🧿','🕯️','📜','⌛','💊','🖋️','🗝️','🦇','🌙','⚗️','🗞️','☕','🕸️','🔦','🕵️'];
var _decorBits=[], _decorRAF=null, _decorLast=0;
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
  saveStateQuiet();
  applyDecorState();
  toast(state.ui.decor?'背景漂浮小图标已开启':'背景漂浮小图标已关闭');
}
function spawnDecorBits(){
  var body=document.body; if(!body) return;
  stopDecorBits();
  var vw=window.innerWidth||body.clientWidth||1200;
  var vh=window.innerHeight||body.clientHeight||800;
  var n=decorCountFor(vw), bg=body.classList.contains('bgcustom');
  _decorBits=[];
  for(var i=0;i<n;i++){
    var el=document.createElement('span');
    el.className='decor-bit';
    el.textContent=DECOR_GLYPHS[Math.floor(Math.random()*DECOR_GLYPHS.length)];
    body.appendChild(el);
    var sz=13+Math.random()*30;
    el.style.fontSize=Math.round(sz)+'px';
    /* 用户反馈太透明：提高不透明度，同时每次重开都随机取一套新的图标/姿态 */
    el.style.opacity=bg?(0.20+Math.random()*0.34):(0.14+Math.random()*0.28);
    var dir=Math.random()<0.5?-1:1;
    _decorBits.push({
      el:el, x:Math.random()*vw, y:Math.random()*vh,
      vx:dir*(5+Math.random()*17), vy:(Math.random()*7-3.5),
      ph:Math.random()*Math.PI*2, sw:(0.4+Math.random()*0.9), rot:Math.random()*360
    });
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
    b.x+=b.vx*dt+Math.sin(t*b.sw+b.ph)*10*dt;
    b.y+=b.vy*dt+Math.cos(t*b.sw*0.8+b.ph)*7*dt;
    if(b.x<-60) b.x=vw+50; else if(b.x>vw+60) b.x=-50;
    if(b.y<-60) b.y=vh+50; else if(b.y>vh+60) b.y=-50;
    b.rot+=dt*8;
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

