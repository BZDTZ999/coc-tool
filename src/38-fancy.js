/* ---------- ✨ 隐藏彩蛋「花里胡哨」（只在桌面端） ----------
   入口不挂在菜单栏 / 工具栏上，藏在页面背景里：在空白背景上连点 5 下（1.5 秒内）才会蹦出来。
   手机 / 平板（触屏或窄屏）完全不挂这套逻辑：没入口、没面板、没有多余的鼠标样式资源。
   里面是几个纯本地的鼠标样式 —— 用 canvas 现画成 PNG 的 data URI（不联网、不引入图片文件、不加依赖），
   点一下立即生效并记在本机；另外还有一点点击小特效。
   原则：只改鼠标指针「看起来的样子」，不动任何功能 —— 输入框 / 拖拽 / 拖分栏 / PDF 选字都保留自己的 cursor。 */
'use strict';
var FANCY_CLICKS=5;              /* 连点几下背景才出来 */
var FANCY_CLICK_MS=1500;         /* 这几下必须在这个时间内点完 */
var FANCY_MIN_W=900;             /* 窄屏（手机 / 平板竖屏）不启用 */
var FANCY_STYLES=[
  {k:'',      n:'默认',     e:'➤', hot:[0,0]},
  {k:'pixel', n:'像素箭头', e:'➤', hot:[3,2]},
  {k:'star',  n:'星星',     e:'★', hot:[16,16]},
  {k:'hand',  n:'小手',     e:'☝', hot:[16,4]},
  {k:'wand',  n:'魔法棒',   e:'🪄', hot:[25,5]},
  {k:'glass', n:'放大镜',   e:'🔍', hot:[13,13]},
  {k:'cross', n:'十字准星', e:'✛', hot:[16,16]}
];
var FANCY_FX=[{k:'',n:'关闭'},{k:'star',n:'星星'},{k:'heart',n:'爱心'},{k:'bubble',n:'泡泡'}];
var _fancyHits=0, _fancyHitT=0, _fancyPanelOn=false, _fancyTab='cursor';
var _fancyCache={}, _fancyResizeT=0;

function fancyState(){
  if(typeof state==='undefined' || !state) return {cursor:'',fx:''};
  if(!state.ui) state.ui={};
  if(!state.ui.fancy || typeof state.ui.fancy!=='object') state.ui.fancy={cursor:'',fx:''};
  var f=state.ui.fancy;
  if(typeof f.cursor!=='string') f.cursor='';
  if(typeof f.fx!=='string') f.fx='';
  return f;
}
function fancyStyleOf(k){
  for(var i=0;i<FANCY_STYLES.length;i++) if(FANCY_STYLES[i].k===(k||'')) return FANCY_STYLES[i];
  return FANCY_STYLES[0];
}
function fancyFxOf(k){
  for(var i=0;i<FANCY_FX.length;i++) if(FANCY_FX[i].k===(k||'')) return FANCY_FX[i];
  return FANCY_FX[0];
}
/* 桌面端才启用：触屏（pointer:coarse）或窄屏一律当作「没有这个功能」 */
function fancyDesktop(){
  try{ if(typeof isCoarseTouch==='function' && isCoarseTouch()) return false; }catch(e){}
  var w=window.innerWidth||document.documentElement.clientWidth||0;
  return w>=FANCY_MIN_W;
}
/* ---------- 鼠标图案：canvas 现画成 PNG（浏览器对 PNG cursor 支持最好；SVG cursor 个别内核不认） ---------- */
function fancyDrawCursor(kind, g){
  g.clearRect(0,0,32,32);
  g.lineJoin='round'; g.lineCap='round';
  if(kind==='pixel'){
    g.lineWidth=2.2; g.strokeStyle='#101216'; g.fillStyle='#ffffff';
    g.beginPath();
    g.moveTo(3,2); g.lineTo(3,23); g.lineTo(8.6,17.8); g.lineTo(12,25.6); g.lineTo(16.2,23.8); g.lineTo(12.6,16.2); g.lineTo(19.4,16.2);
    g.closePath(); g.fill(); g.stroke();
    return;
  }
  if(kind==='star'){
    var cx=16, cy=16, i;
    g.beginPath();
    for(i=0;i<10;i++){
      var ang=-Math.PI/2+i*Math.PI/5, rad=(i%2?5.2:12);
      var x=cx+Math.cos(ang)*rad, y=cy+Math.sin(ang)*rad;
      if(i) g.lineTo(x,y); else g.moveTo(x,y);
    }
    g.closePath();
    g.fillStyle='#ffd75e'; g.fill();
    g.lineWidth=2.2; g.strokeStyle='#3a2a05'; g.stroke();
    return;
  }
  if(kind==='hand'){
    g.font='23px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle='#111';
    g.fillText('☝',17.4,18.4);                 /* 先描一层深色影子，浅色背景上也看得见 */
    g.fillText('☝',16,17);
    return;
  }
  if(kind==='wand'){
    g.lineWidth=3.6; g.strokeStyle='#3a2a05';
    g.beginPath(); g.moveTo(9,28); g.lineTo(24.5,6.5); g.stroke();
    g.lineWidth=2.4; g.strokeStyle='#c9a25e';
    g.beginPath(); g.moveTo(9,28); g.lineTo(24.5,6.5); g.stroke();
    g.beginPath();                                   /* 棒尖的小星星 */
    for(var s=0;s<8;s++){
      var a2=-Math.PI/2+s*Math.PI/4, r2=(s%2?1.6:4.4);
      var x2=25+Math.cos(a2)*r2, y2=5.5+Math.sin(a2)*r2;
      if(s) g.lineTo(x2,y2); else g.moveTo(x2,y2);
    }
    g.closePath(); g.fillStyle='#ffe9a8'; g.fill(); g.lineWidth=1.4; g.strokeStyle='#8a6b2a'; g.stroke();
    g.fillStyle='#ffe9a8';
    g.beginPath(); g.arc(19,12,1.3,0,Math.PI*2); g.fill();
    g.beginPath(); g.arc(14,20,1.1,0,Math.PI*2); g.fill();
    return;
  }
  if(kind==='glass'){
    g.beginPath(); g.arc(13,13,7.6,0,Math.PI*2);
    g.fillStyle='rgba(190,225,255,.35)'; g.fill();
    g.lineWidth=3.4; g.strokeStyle='#20242f'; g.stroke();
    g.lineWidth=2; g.strokeStyle='#dfe6f2'; g.stroke();
    g.lineWidth=5; g.strokeStyle='#20242f';
    g.beginPath(); g.moveTo(18.6,18.6); g.lineTo(28,28); g.stroke();
    g.lineWidth=3; g.strokeStyle='#9fb0c9';
    g.beginPath(); g.moveTo(18.6,18.6); g.lineTo(28,28); g.stroke();
    return;
  }
  if(kind==='cross'){
    function arms(color, w){
      g.lineWidth=w; g.strokeStyle=color;
      g.beginPath();
      g.moveTo(16,2.6); g.lineTo(16,11.4);
      g.moveTo(16,20.6); g.lineTo(16,29.4);
      g.moveTo(2.6,16); g.lineTo(11.4,16);
      g.moveTo(20.6,16); g.lineTo(29.4,16);
      g.stroke();
    }
    arms('#101216',4.6); arms('#ffcf6b',2.2);
    g.beginPath(); g.arc(16,16,1.7,0,Math.PI*2); g.fillStyle='#101216'; g.fill();
    g.beginPath(); g.arc(16,16,1,0,Math.PI*2); g.fillStyle='#ffcf6b'; g.fill();
    return;
  }
}
function fancyCursorURL(kind){
  if(!kind) return '';
  if(_fancyCache[kind]) return _fancyCache[kind];
  var url='';
  try{
    var c=document.createElement('canvas');
    var dpr=Math.min(2, (window.devicePixelRatio||1));
    c.width=Math.round(32*dpr); c.height=Math.round(32*dpr);
    var g=c.getContext('2d');
    if(g){
      g.scale(dpr,dpr);
      fancyDrawCursor(kind, g);
      url=c.toDataURL('image/png');
    }
  }catch(e){ url=''; }
  if(url) _fancyCache[kind]=url;
  return url;
}
function fancyCursorCSS(kind){
  var url=fancyCursorURL(kind);
  if(!url) return '';
  var st=fancyStyleOf(kind);
  return 'url("'+url+'") '+(st.hot[0]||0)+' '+(st.hot[1]||0)+', auto';
}
/* 生效 / 取消：只写一个 CSS 变量 + 一个 body 上的开关类，具体作用范围全在 style.css 里（排除交互元素） */
function applyFancy(){
  if(typeof document==='undefined' || !document.body) return;
  var f=fancyState(), css='';
  if(fancyDesktop() && f.cursor) css=fancyCursorCSS(f.cursor);
  try{
    if(css){
      document.body.style.setProperty('--fancy-cursor', css);
      document.body.classList.add('fancycursor');
    } else {
      document.body.style.removeProperty('--fancy-cursor');
      document.body.classList.remove('fancycursor');
    }
  }catch(e){}
}
/* ---------- 隐藏入口：在空白背景上连点 5 下 ---------- */
function fancyIsBackground(t){
  if(!t || t.nodeType!==1) return false;
  try{
    if(t.closest && t.closest('button,a,input,select,textarea,label,option,nav,header,canvas,table,.topbar,.card,'+
      '.floatpanel,.sidepane,.modal,.fancypanel,.decor-bit,[contenteditable="true"],[draggable="true"]')) return false;
  }catch(e){ return false; }
  if(t.onclick) return false;
  var tag=t.tagName||'';
  return tag==='HTML'||tag==='BODY'||tag==='MAIN'||tag==='FOOTER'||tag==='SECTION'||tag==='ASIDE'||tag==='DIV'||tag==='SPAN'||tag==='P';
}
function fancyEggClick(ev){
  if(_fancyPanelOn || !fancyDesktop() || !ev) return;
  if(!fancyIsBackground(ev.target)){ _fancyHits=0; return; }
  var now=Date.now();
  if(now-_fancyHitT>FANCY_CLICK_MS) _fancyHits=0;
  _fancyHitT=now;
  _fancyHits++;
  if(_fancyHits>=FANCY_CLICKS){ _fancyHits=0; fancyOpen(); }
}
function fancyOnDown(ev){
  if(!fancyDesktop() || !ev || ev.button>1) return;
  var fx=fancyState().fx;
  if(!fx) return;
  fancyBurst(ev.clientX, ev.clientY, fx);
}
function fancyOnResize(){
  if(_fancyResizeT) return;
  _fancyResizeT=setTimeout(function(){
    _fancyResizeT=0;
    if(!fancyDesktop()) fancyClose();
    fancyBindEgg();                     /* 窗口从窄变宽：这时才把彩蛋挂上 */
    applyFancy();
  }, 200);
}
function fancyBindEgg(){
  if(typeof document==='undefined') return;
  if(!document.__fancyEggResize){
    document.__fancyEggResize=1;
    window.addEventListener('resize', fancyOnResize);
  }
  /* 手机 / 平板压根不挂：没入口、没面板、没有多余的鼠标样式资源 */
  if(!fancyDesktop() || document.__fancyEggBound) return;
  document.__fancyEggBound=1;
  document.addEventListener('click', fancyEggClick, true);
  document.addEventListener('pointerdown', fancyOnDown, true);
  document.addEventListener('keydown', function(ev){ if(ev && ev.key==='Escape' && _fancyPanelOn) fancyClose(); });
}
/* ---------- 面板 ---------- */
function fancyOpen(){
  if(!fancyDesktop()) return;
  _fancyPanelOn=true;
  _fancyHits=0;
  var p=$('fancyPanel');
  if(!p){
    p=document.createElement('div');
    p.className='floatpanel fancypanel';
    p.id='fancyPanel';
    document.body.appendChild(p);
  }
  fancyBuildPanel();
  p.hidden=false;
}
function fancyClose(){
  _fancyPanelOn=false;
  var p=$('fancyPanel');
  if(p) p.hidden=true;
}
function fancySetTab(t){
  _fancyTab=(t==='fx')?'fx':'cursor';
  fancyBuildPanel();
}
function fancyBuildPanel(){
  var p=$('fancyPanel'); if(!p) return;
  var f=fancyState();
  p.innerHTML='<div class="floathead"><b>🎁 隐藏彩蛋</b>'+
    '<span class="hint">花里胡哨：只改鼠标指针的样子，功能一个不动</span>'+
    '<button class="small ghost" style="margin-left:auto" onclick="fancyClose()">收起 ✕</button></div>'+
    '<div class="floatbody">'+
      '<div class="xp-tabs" id="fancyTabs">'+
        '<button class="xp-tab'+(_fancyTab==='cursor'?' on':'')+'" onclick="fancySetTab(\'cursor\')">🖱 鼠标样式</button>'+
        '<button class="xp-tab'+(_fancyTab==='fx'?' on':'')+'" onclick="fancySetTab(\'fx\')">✨ 花里胡哨</button>'+
      '</div>'+
      '<div id="fancyBody">'+(_fancyTab==='fx'?fancyFxHTML():fancyCursorHTML())+'</div>'+
      '<p class="hint" style="margin:10px 0 0">只在本机生效（记在浏览器里，刷新后还在）；手机 / 平板上不启用。'+
      '输入框、拖拽、拖分栏、PDF 选字这些地方保留自己的鼠标样子。</p>'+
    '</div>';
}
function fancyCursorHTML(){
  var f=fancyState();
  var html='<div class="fancy-grid">';
  FANCY_STYLES.forEach(function(st){
    var on=(st.k===(f.cursor||''));
    var css=st.k?fancyCursorCSS(st.k):'';
    html+='<button class="fancy-card'+(on?' on':'')+'" onclick="fancyPick(\''+st.k+'\')">'+
      '<span class="fancy-pre" style="'+(css?('cursor:'+css):'')+'">'+esc(st.e)+'</span>'+
      '<span class="fancy-nm">'+esc(st.n)+(on?' ✓':'')+'</span></button>';
  });
  return html+'</div>';
}
function fancyFxHTML(){
  var f=fancyState();
  var html='<div class="row" style="gap:6px">';
  FANCY_FX.forEach(function(x){
    var on=(x.k===(f.fx||''));
    html+='<button class="xp-tab'+(on?' on':'')+'" onclick="fancyPickFx(\''+x.k+'\')">'+esc(x.n)+'</button>';
  });
  html+='</div><p class="hint" style="margin:10px 0 0">选了以后，在页面上点一下就会蹦出几个小东西（纯本地动画，不吃性能）。</p>'+
    '<p class="hint" style="margin:6px 0 0">偏好「少动」的话：系统开了「减弱动态效果」时下面的小东西不会显示。</p>';
  return html;
}
function fancyPick(k){
  var f=fancyState();
  f.cursor=(k||'');
  try{ saveStateQuiet(); }catch(e){}
  applyFancy();
  fancyBuildPanel();
  toast(k?('鼠标样式：'+fancyStyleOf(k).n):'鼠标样式：默认');
}
function fancyPickFx(k){
  var f=fancyState();
  f.fx=(k||'');
  try{ saveStateQuiet(); }catch(e){}
  fancyBuildPanel();
  if(f.fx) fancyBurst((window.innerWidth||600)/2, (window.innerHeight||400)/2, f.fx);
  toast(f.fx?('点击特效：'+fancyFxOf(f.fx).n):'点击特效：关闭');
}
/* 点击小特效：几个 emoji 从鼠标位置散开就消失（纯 CSS 动画，跑完自己把节点删掉） */
var FANCY_BITS={
  star:{g:['★','✦','✧'],c:['#ffd75e','#ffe9a8','#ffc94a']},
  heart:{g:['❤','♥','💗'],c:['#ff7a9c','#ffb3c7','#ff4d79']},
  bubble:{g:['○','◌','●'],c:['#8fd3ff','#bde6ff','#6fb7e8']}
};
function fancyBurst(x, y, kind){
  if(!fancyDesktop()) return;
  var set=FANCY_BITS[kind]; if(!set) return;
  var body=document.body; if(!body) return;
  var n=set.g.length*3;
  for(var i=0;i<n;i++){
    var el=document.createElement('span');
    el.className='fancy-bit';
    el.textContent=set.g[i%set.g.length];
    el.style.left=Math.round(x)+'px';
    el.style.top=Math.round(y)+'px';
    el.style.color=set.c[i%set.c.length];
    el.style.fontSize=(11+Math.random()*9).toFixed(1)+'px';
    var ang=(Math.PI*2*i)/n+Math.random()*0.5, dist=26+Math.random()*40;
    el.style.setProperty('--dx',(Math.cos(ang)*dist).toFixed(1)+'px');
    el.style.setProperty('--dy',(Math.sin(ang)*dist-14).toFixed(1)+'px');
    el.style.setProperty('--rot',((Math.random()*2-1)*220).toFixed(0)+'deg');
    body.appendChild(el);
    (function(node){
      var kill=function(){ if(node.parentNode) node.parentNode.removeChild(node); };
      node.addEventListener('animationend', kill, {once:true});
      setTimeout(kill, 900);
    })(el);
  }
}
(function bootFancy(){
  function start(){ applyFancy(); fancyBindEgg(); }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading') window.addEventListener('DOMContentLoaded', start);
    else start();
    setTimeout(start, 0);            /* 兜底：无论 DOMContentLoaded 与存档加载谁先跑，都按最终 state 同步一次 */
  }
})();
