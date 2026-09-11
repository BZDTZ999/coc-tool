/* ---------- 🎨 页面背景：颜色 / 自定义图片 ---------- */
/* 两组「默认皮肤」：第一次打开随机抽一个（金色 / 橄榄绿），抽到哪个会存进本机，刷新不会变。
   想要换一种：右上角「🎨 背景」里点另两个色块，或点「↺ 恢复默认背景」重新随机。 */
var BG_DEFAULT_THEMES=[{k:'gold',name:'暗金',hex:'#a3843f'},{k:'olive',name:'橄榄绿',hex:'#7f9450'}];
var BG_SWATCHES=[
  ['#a3843f','暗金（默认）'],['#7f9450','橄榄绿（默认）'],
  ['#1c222f','石墨蓝'],['#262b38','石板灰'],['#2a2418','暖棕'],
  ['#141c26','深海军'],['#241420','暗紫红'],['#16281b','墨绿']
];
function bgThemeOf(k){
  for(var i=0;i<BG_DEFAULT_THEMES.length;i++) if(BG_DEFAULT_THEMES[i].k===k) return BG_DEFAULT_THEMES[i];
  return BG_DEFAULT_THEMES[0];
}
function bgRandomTheme(){ return BG_DEFAULT_THEMES[Math.floor(Math.random()*BG_DEFAULT_THEMES.length)]; }
function uiBgState(){
  if(!state.ui) state.ui={};
  if(!state.ui.bg) state.ui.bg={color:'',image:null};
  var bg=state.ui.bg;
  /* 老存档没选过颜色（或颜色被清成空）：按默认主题随机挑一个并记下来，之后刷新都跟着它 */
  if(!bg.def || !BG_DEFAULT_THEMES.some(function(t){ return t.k===bg.def; })){
    var t=bgRandomTheme();
    bg.def=t.k;
    if(!bg.color) bg.color=t.hex;
    try{ saveStateQuiet(); }catch(e){}
  }
  return bg;
}
/* 当前实际用于推导整套 UI 配色的底色 */
function uiBgColor(){ var bg=uiBgState(); return bg.color || bgThemeOf(bg.def).hex; }
/* 主题引擎：把用户背景色推导成整套 UI 面板色（写入 CSS 变量，所有组件跟随适配） */
function hexToRgb(h){
  var s=String(h||'').replace('#','').trim();
  if(s.length===3) s=s.split('').map(function(c){return c+c;}).join('');
  var n=parseInt(s||'14161c',16);
  if(!isFinite(n)) return {r:20,g:22,b:28};
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function mixC(c1,c2,t){
  return { r:Math.round(c1.r+(c2.r-c1.r)*t), g:Math.round(c1.g+(c2.g-c1.g)*t), b:Math.round(c1.b+(c2.b-c1.b)*t) };
}
function rgbStr(c){ return 'rgb('+c.r+','+c.g+','+c.b+')'; }
function applyThemeVars(colorHex){
  var col=hexToRgb(colorHex);
  var work=mixC(col,{r:8,g:9,b:12},0.62);      // 压低明度保证白字可读
  var a=mixC(work,{r:255,g:255,b:255},0.10);    // 卡片上缘
  var b=mixC(work,{r:0,g:0,b:0},0.04);          // 卡片主体
  var d=mixC(work,{r:0,g:0,b:0},0.18);          // 输入框/日志
  var nav=mixC(work,{r:0,g:0,b:0},0.10);        // 顶栏
  var line=mixC(work,{r:255,g:255,b:255},0.20); // 边框
  var r=document.documentElement;
  ['--uic-a','--uic-b','--uic-d','--uic-nav','--uic-line'].forEach(function(k){ r.style.removeProperty(k); });
  r.style.setProperty('--uic-a',rgbStr(a));
  r.style.setProperty('--uic-b',rgbStr(b));
  r.style.setProperty('--uic-d',rgbStr(d));
  r.style.setProperty('--uic-nav',rgbStr(nav));
  r.style.setProperty('--uic-line',rgbStr(line));
  r.style.setProperty('--uic-bg',rgbStr(mixC(work,{r:0,g:0,b:0},0.10)));
}
function clearThemeVars(){
  var r=document.documentElement;
  ['--uic-a','--uic-b','--uic-d','--uic-nav','--uic-line','--uic-bg'].forEach(function(k){ r.style.removeProperty(k); });
}
function themeCanvasColor(){
  var v=String(document.documentElement.style.getPropertyValue('--uic-bg')||'').trim();
  return v||'#151922';
}
/* 背景图片单独存在 IndexedDB 里：localStorage 只有 5MB，图片塞进 state 很容易写不进去，
   那样表现就是「设了背景图，一刷新就没了」。state 里只留一个小缩略图（给设置面板预览）。 */
var BGIMG_KEY='bgImage';
var _bgImgUrl=null;                       /* 当前生效的背景图 dataURL（内存里） */
function applyBgImageToBody(){
  var b=document.body; if(!b) return;
  if(_bgImgUrl){
    b.style.backgroundImage='linear-gradient(rgba(12,12,14,.80),rgba(12,12,14,.80)),url("'+_bgImgUrl+'")';
    b.style.backgroundSize='cover'; b.style.backgroundPosition='center'; b.style.backgroundAttachment='fixed';
  } else {
    /* 纯色背景也压一层深色半透明，保证白字可读；卡片等面板再以半透明融入 */
    b.style.backgroundImage='linear-gradient(rgba(12,12,14,.55),rgba(12,12,14,.55))';
    b.style.backgroundSize=''; b.style.backgroundPosition=''; b.style.backgroundAttachment='';
  }
}
function bgImageLoad(cb){
  if(!window.indexedDB || typeof idbGet!=='function'){ if(cb) cb(null); return; }
  idbGet(BGIMG_KEY, function(v){ if(cb) cb(v||null); });
}
function bgImageSave(url, cb){
  if(!window.indexedDB || typeof idbPut!=='function'){ if(cb) cb(false); return; }
  idbPut(BGIMG_KEY, url, function(){ if(cb) cb(true); });
}
function bgImageClear(){
  _bgImgUrl=null;
  if(window.indexedDB && typeof idbDel==='function') idbDel(BGIMG_KEY);
}
/* 大图（手机拍的 4~8MB）先缩到 1800px、JPEG 0.82 再存，省空间也省内存 */
function bgShrinkImage(file, cb){
  var fr=new FileReader();
  fr.onload=function(){
    var raw=String(fr.result||'');
    var im=new Image();
    im.onload=function(){
      try{
        var MAXW=1800, w=im.naturalWidth||im.width, h=im.naturalHeight||im.height;
        if(!w || !h){ cb(raw); return; }
        var k=Math.min(1, MAXW/w);
        var cw=Math.max(1, Math.round(w*k)), ch=Math.max(1, Math.round(h*k));
        var cv=document.createElement('canvas'); cv.width=cw; cv.height=ch;
        var cx=cv.getContext('2d'); cx.drawImage(im,0,0,cw,ch);
        cb(cv.toDataURL('image/jpeg',0.82));
      }catch(e){ cb(raw); }
    };
    im.onerror=function(){ cb(raw); };
    im.src=raw;
  };
  fr.onerror=function(){ cb(null); };
  fr.readAsDataURL(file);
}
function applyUiBg(){
  if(!state) return;
  var bg=uiBgState(), b=document.body;
  var color=uiBgColor();
  b.classList.add('bgcustom');
  applyThemeVars(color);
  b.style.backgroundColor = color;
  /* state 里存的是 'idb' 标记（图片本体在 IndexedDB）；这里把真正生效的图取出来 */
  if(bg.image){
    if(String(bg.image).indexOf('data:')===0){
      /* 老存档：图片直接塞在 state 里，搬进 IndexedDB，别再拖累 localStorage */
      _bgImgUrl=bg.image;
      (function(){ var url=bg.image; bg.image='idb'; bg.imgThumb=bg.imgThumb||url; saveStateQuiet(); bgImageSave(url); })();
    } else if(_bgImgUrl){
      /* 已经加载好了 */
    } else {
      bgImageLoad(function(url){
        if(url){ _bgImgUrl=url; applyBgImageToBody(); }
        else { uiBgState().image=null; uiBgState().imgThumb=null; saveStateQuiet(); applyBgImageToBody(); }
      });
    }
  } else {
    _bgImgUrl=null;
  }
  applyBgImageToBody();
  /* 主题色一变，画布底色立即跟随（地图默认底 / 战斗场景默认底） */
  try{
    if(typeof drawMapCanvas==='function') drawMapCanvas();
    if(typeof drawBattleScene==='function') drawBattleScene();
  }catch(e){}
}
function refreshBgUI(){
  var bg=uiBgState();
  var cIn=$('bg-color-input'); if(cIn) cIn.value=uiBgColor();
  var prev=$('bg-img-prev');
  if(prev){
    prev.style.display=_bgImgUrl?'block':'none';
    if(_bgImgUrl) prev.style.backgroundImage='url("'+_bgImgUrl+'")';
  }
  document.querySelectorAll('#bgModal .bgsw').forEach(function(btn){
    btn.classList.toggle('on', (btn.dataset.color||'')===uiBgColor());
  });
}
function openBgModal(){
  var m=$('bgModal'); if(!m) return;
  if(!m.getAttribute('data-filled')) m.setAttribute('data-filled','1');
  m.innerHTML=`<div class="modal" style="max-width:480px">
    <div class="modal-head"><b>🎨 页面背景</b><button class="ghost" onclick="document.getElementById('bgModal').classList.remove('open')">✕</button></div>
    <div class="modal-body">
      <h4 class="sectiontitle">背景颜色</h4>
      <div class="row" style="gap:6px">
        ${BG_SWATCHES.map(function(s){return '<button type="button" class="bgsw" data-color="'+s[0]+'" title="'+esc(s[1])+'" onclick="setBgColor(this.dataset.color)"><span class="bgsample" style="background:'+s[0]+'"></span></button>';}).join('')}
      </div>
      <div class="row" style="margin-top:8px;gap:8px">
        <label style="flex-direction:row;align-items:center;gap:6px">自定义
          <input type="color" id="bg-color-input" value="#14161c" onchange="setBgColor(this.value)" style="width:52px;height:32px;padding:2px">
        </label>
      </div>
      <h4 class="sectiontitle" style="margin-top:14px">背景图片（可选，自动加深保证文字可读）</h4>
      <div class="row" style="gap:8px">
        <label class="muted" style="flex-direction:row;align-items:center;gap:4px;flex:1">上传图片
          <input type="file" id="bg-img-file" class="file-hidden" accept="image/*" onchange="onBgImgFile(event)">
          <span class="btn small btnfile">📁 选图</span>
        </label>
        ${(function(){ return uiBgState().image?'<button class="small danger" onclick="clearBgImage()">清除图片</button>':''; })()}
      </div>
      <div id="bg-img-prev" style="display:none;height:110px;background-size:cover;background-position:center;border-radius:10px;border:1px solid var(--line);margin-top:8px"></div>
      <div class="vdiv"></div>
      <div class="row" style="justify-content:space-between">
        <button class="small ghost" onclick="resetBgAll()">↺ 恢复默认背景</button>
        <span class="hint">设置保存在本机，刷新后还在；卡片/顶栏会跟着这套配色一起变</span>
      </div>
    </div></div>`;
  refreshBgUI();
  m.classList.add('open');
}
function setBgColor(hex){
  var bg=uiBgState();
  bg.color=(hex||'').trim();
  var hit=BG_DEFAULT_THEMES.filter(function(t){ return t.hex===bg.color; })[0];
  if(hit) bg.def=hit.k;                       /* 点的是默认皮肤，就把它记成默认，别让刷新换掉 */
  saveStateQuiet(); applyUiBg(); refreshBgUI();
  if(bg.color) toast('背景颜色已更新');
}
function onBgImgFile(e){
  var f=e.target.files&&e.target.files[0];
  e.target.value='';
  if(!f || !/^image\//.test(f.type||'')) return;
  bgShrinkImage(f, function(url){
    if(!url){ toast('这张图片读不出来'); return; }
    _bgImgUrl=url;
    var bg=uiBgState(); bg.image='idb'; bg.imgThumb=url;
    bgImageSave(url, function(ok){
      try{ saveState(); }catch(err){}
      applyUiBg(); refreshBgUI();
      toast(ok?'背景图片已设置（刷新后还在）':'背景图片已设置（本机存储不可用，刷新后可能要重设）');
    });
  });
}
function clearBgImage(){
  var bg=uiBgState(); bg.image=null; bg.imgThumb=null;
  bgImageClear(); saveState(); applyUiBg(); refreshBgUI(); toast('已清除背景图片');
}
function resetBgAll(){
  var bg=uiBgState(), t=bgRandomTheme();
  bg.color=t.hex; bg.def=t.k; bg.image=null; bg.imgThumb=null;
  bgImageClear(); saveState(); applyUiBg(); refreshBgUI();
  toast('已恢复默认背景（这次是'+t.name+'）');
}
/* 启动时应用一次背景。
   注意要用 window 上的 DOMContentLoaded：事件先派发到 document 再冒泡到 window，
   而 initApp 是挂在 window 上的 —— 以前这里挂在 document 上，等于在 state 加载完之前就跑，
   `if(!state) return;` 直接返回，于是「设好的自定义背景一刷新就没了」。 */
(function(){
  function go(){ try{ applyUiBg(); }catch(e){} }
  if(document.readyState==='loading') window.addEventListener('DOMContentLoaded', go);
  else go();
  setTimeout(go, 0);                     /* 兜底：不管谁先谁后，加载完再来一次 */
})();
