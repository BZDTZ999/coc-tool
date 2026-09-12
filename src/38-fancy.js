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
/* hot 是「热点」：在 32×32 的画面坐标里指定「鼠标真正作用在哪一点」。
   箭头类落在笔尖 / 尖角上，装饰类落在图案正中 —— 这样点哪儿看得见、点在哪儿也说得通。
   （渲染时会按设备像素比把 hot 一起放大，见 fancyCursorCSS；不然 Retina 上热点会偏一半。） */
var FANCY_STYLES=[
  {k:'',      n:'默认',     e:'➤', hot:[0,0]},
  {k:'pixel', n:'像素箭头', e:'➤', hot:[3,2]},
  {k:'star',  n:'星星',     e:'★', hot:[16,4]},
  {k:'hand',  n:'小手',     e:'☝', hot:[19,3]},
  {k:'wand',  n:'魔法棒',   e:'🪄', hot:[25,6]},
  {k:'glass', n:'放大镜',   e:'🔍', hot:[13,13]},
  {k:'cross', n:'十字准星', e:'✛', hot:[16,16]},
  {k:'claw',  n:'爪痕',     e:'✖', hot:[11,5]},
  {k:'bolt',  n:'闪电',     e:'⚡', hot:[19,4]},
  {k:'tentacle', n:'触手',  e:'🐙', hot:[16,16]},
  {k:'eye',   n:'眼球',     e:'👁', hot:[16,16]},
  {k:'skull', n:'骷髅',     e:'💀', hot:[16,16]},
  {k:'dice',  n:'骰子',     e:'🎲', hot:[16,16]},
  {k:'book',  n:'古书',     e:'📖', hot:[16,16]},
  {k:'candle',n:'蜡烛',     e:'🕯', hot:[16,16]},
  {k:'sparkle',n:'闪光',    e:'✨', hot:[16,15]},
  {k:'key',     n:'旧钥匙',   e:'🗝', hot:[16,14]},
  {k:'torch',   n:'手电筒',   e:'🔦', hot:[16,16]},
  {k:'compass', n:'指南针',   e:'🧭', hot:[16,16]},
  {k:'map',     n:'旧地图',   e:'🗺', hot:[16,16]},
  {k:'watch',   n:'怀表',     e:'🕰', hot:[16,16]},
  {k:'hourglass',n:'沙漏',    e:'⌛', hot:[16,16]},
  {k:'bone',    n:'骨头',     e:'🦴', hot:[16,16]},
  {k:'potion',  n:'药瓶',     e:'🧪', hot:[16,16]},
  {k:'quill',   n:'羽毛笔',   e:'🪶', hot:[16,16]},
  {k:'mask',    n:'面具',     e:'🎭', hot:[16,16]},
  {k:'bat',     n:'蝙蝠',     e:'🦇', hot:[16,16]},
  {k:'spider',  n:'蜘蛛',     e:'🕷', hot:[16,16]},
  {k:'ghost',   n:'幽灵',     e:'👻', hot:[16,16]},
  {k:'camera',  n:'老相机',   e:'📷', hot:[16,16]}
];
/* 这几款是手工画的矢量（比 emoji 更利、更清楚）；其余的按 e 里的字符现画 emoji —— 不引图片文件、离线可用 */
var FANCY_DRAWN={pixel:1, star:1, claw:1, bolt:1, wand:1, glass:1, cross:1};
var FANCY_FX=[{k:'',n:'关闭'},{k:'star',n:'星星'},{k:'heart',n:'爱心'},{k:'bubble',n:'泡泡'},
  {k:'tentacle',n:'触手'},{k:'skull',n:'骷髅'},{k:'dice',n:'骰子'},{k:'snow',n:'雪花'},
  {k:'blood',n:'血滴'},{k:'fire',n:'火苗'},{k:'coin',n:'金币'},{k:'mist',n:'迷雾'},
  {k:'gaze',n:'凝视'},{k:'feather',n:'羽毛'},{k:'ghost',n:'幽灵'},{k:'note',n:'音符'}];
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
/* emoji 光标：只画一遍。以前为了在浅色背景上看得见「错开位置画两遍」，
   但彩色 emoji 不吃 fillStyle，两遍就是同一张图错位叠一次 —— 看着就是重影 / 毛边。
   现在改成一遍 + 一圈柔和的外发光（阴影），浅背景上一样看得清，还不会有第二张脸。 */
function fancyDrawEmoji(g, ch){
  g.font='23px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign='center'; g.textBaseline='middle';
  g.shadowColor='rgba(8,10,14,.85)';
  g.shadowBlur=2.6; g.shadowOffsetX=0; g.shadowOffsetY=1;
  g.fillText(ch,16,17);
  g.shadowColor='transparent'; g.shadowBlur=0; g.shadowOffsetY=0;
}
function fancyDrawCursor(kind, g){
  g.clearRect(0,0,32,32);
  g.lineJoin='round'; g.lineCap='round';
  var ch=FANCY_DRAWN[kind]?'':fancyStyleOf(kind).e;
  if(ch){ fancyDrawEmoji(g, ch); return; }
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
  if(kind==='claw'){                             /* 爪痕：三道带深色描边的抓痕 */
    var claws=[[5.5,27,4.5,14,11,4],[14,28.5,15,15,20.5,5],[22.5,27,25.5,17,29.5,11]];
    g.lineCap='round';
    g.lineWidth=5.2; g.strokeStyle='#3a0f12';
    for(var ci=0;ci<claws.length;ci++){
      var c=claws[ci];
      g.beginPath(); g.moveTo(c[0],c[1]); g.quadraticCurveTo(c[2],c[3],c[4],c[5]); g.stroke();
    }
    g.lineWidth=2.6; g.strokeStyle='#e0554d';
    for(var cj=0;cj<claws.length;cj++){
      var c2=claws[cj];
      g.beginPath(); g.moveTo(c2[0],c2[1]); g.quadraticCurveTo(c2[2],c2[3],c2[4],c2[5]); g.stroke();
    }
    return;
  }
  if(kind==='bolt'){                             /* 闪电：一笔画出来的折线，比 emoji 更利 */
    g.beginPath();
    g.moveTo(19.5,2.5); g.lineTo(8,18.5); g.lineTo(14.8,18.5); g.lineTo(11.5,29.5); g.lineTo(24,12.5); g.lineTo(17,12.5);
    g.closePath();
    g.fillStyle='#ffe066'; g.fill();
    g.lineWidth=2.2; g.strokeStyle='#5a4300'; g.stroke();
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
/* Retina / 高 DPI 屏上把图案画成 32×dpr 的位图，光标才不发虚；dpr 封顶 2（再大浏览器也会缩回去） */
function fancyDPR(){
  var d=1;
  try{ d=window.devicePixelRatio||1; }catch(e){}
  d=Math.round(d); if(!isFinite(d)||d<1) d=1;
  return Math.min(2,d);
}
/* 画好的光标缓存：url + 当时用的倍率（热点也要按同一个倍率放大） */
function fancyCursorURL(kind){
  if(!kind) return null;
  if(_fancyCache[kind]) return _fancyCache[kind];
  var url='', dpr=fancyDPR();
  try{
    var c=document.createElement('canvas');
    c.width=Math.round(32*dpr); c.height=Math.round(32*dpr);
    var g=c.getContext('2d');
    if(g){
      g.scale(dpr,dpr);
      fancyDrawCursor(kind, g);
      url=c.toDataURL('image/png');
    }
  }catch(e){ url=''; }
  if(!url) return null;
  _fancyCache[kind]={url:url, s:dpr};
  return _fancyCache[kind];
}
/* 热点坐标是「32 格」里的位置，图片是按 dpr 放大的，所以热点也要 ×dpr ——
   不然 Retina 上热点只有实际位置的一半，看着就是「点了半天点不准」。 */
function fancyCursorCSS(kind){
  var c=fancyCursorURL(kind);
  if(!c) return '';
  var st=fancyStyleOf(kind);
  var hx=Math.round((st.hot[0]||0)*c.s), hy=Math.round((st.hot[1]||0)*c.s);
  return 'url("'+c.url+'") '+hx+' '+hy+', auto';
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
  var html='<div class="row fancy-tools">'+
      '<button class="small ghost" onclick="fancyPickRandom()">🎲 随机换一个</button>'+
      '<button class="small ghost" onclick="fancyPickPrev()">↻ 上一个</button>'+
      '<span class="hint" style="margin-left:auto">共 '+FANCY_STYLES.length+' 款（含默认）</span></div>'+
    '<div class="fancy-grid">';
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
  var html='<div class="fancy-fxgrid">';
  FANCY_FX.forEach(function(x){
    var on=(x.k===(f.fx||''));
    html+='<button class="fancy-fxcard'+(on?' on':'')+'" onclick="fancyPickFx(\''+x.k+'\')">'+esc(x.n)+'</button>';
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
/* 随机 / 上一个：不想一格一格挑的时候用（随机也避开当前这款，免得「点了没变」） */
function fancyPickRandom(){
  var f=fancyState(), pool=[], i;
  for(i=1;i<FANCY_STYLES.length;i++) if(FANCY_STYLES[i].k!==f.cursor) pool.push(FANCY_STYLES[i]);
  if(!pool.length) return;
  fancyPick(pool[Math.floor(Math.random()*pool.length)].k);
}
function fancyPickPrev(){
  var f=fancyState(), idx=0, i;
  for(i=0;i<FANCY_STYLES.length;i++) if(FANCY_STYLES[i].k===(f.cursor||'')) idx=i;
  fancyPick(FANCY_STYLES[(idx+FANCY_STYLES.length-1)%FANCY_STYLES.length].k);
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
  bubble:{g:['○','◌','●'],c:['#8fd3ff','#bde6ff','#6fb7e8']},
  tentacle:{g:['🐙','◍','·'],c:['#7fd4c1','#a8e6d8','#4fa38f']},
  skull:{g:['💀','☠','·'],c:['#e8e6df','#bdb9ad','#8f8b80']},
  dice:{g:['🎲','◆','·'],c:['#e3c47f','#fff0c2','#b99a55']},
  snow:{g:['❄','❅','✻'],c:['#dff0ff','#bfe2ff','#9ccdf5']},
  blood:{g:['🩸','•','·'],c:['#c0392b','#e05a4a','#8e2a20']},
  fire:{g:['🔥','✦','·'],c:['#ff9a3c','#ffd166','#e0552b']},
  coin:{g:['🪙','●','·'],c:['#f4d06a','#fff0b3','#c9a227']},
  mist:{g:['☁','◌','·'],c:['#cfd8e3','#eef2f7','#9fb0c9']},
  gaze:{g:['👁','◉','·'],c:['#e8e6df','#9fd3e8','#6ea8c4']},
  feather:{g:['🪶','✧','·'],c:['#e6d9c2','#cbb894','#a38963']},
  ghost:{g:['👻','◌','·'],c:['#e8f0ff','#c9dcff','#9fb8e8']},
  note:{g:['♪','♫','·'],c:['#ffd75e','#ffe9a8','#e0b64a']}
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
