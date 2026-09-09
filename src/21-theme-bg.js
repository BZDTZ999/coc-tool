/* ---------- 🎨 页面背景：颜色 / 自定义图片 ---------- */
var BG_SWATCHES=[
  ['','深空默认'],['#1c222f','石墨蓝'],['#262b38','石板灰'],['#2a2418','暖棕'],
  ['#141c26','深海军'],['#241420','暗紫红'],['#16281b','墨绿'],['#241f12','暗金']
];
function uiBgState(){
  if(!state.ui) state.ui={};
  if(!state.ui.bg) state.ui.bg={color:'',image:null};
  return state.ui.bg;
}
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
function applyUiBg(){
  if(!state) return;
  var bg=uiBgState(), b=document.body;
  var has=(bg.color||bg.image)?true:false;
  b.classList.toggle('bgcustom', has);
  if(!bg.color && !bg.image){
    clearThemeVars();
    b.style.removeProperty('background');
    b.style.removeProperty('background-color');
    b.style.removeProperty('background-image');
    b.style.removeProperty('background-size');
    b.style.removeProperty('background-position');
    b.style.removeProperty('background-attachment');
    return;
  }
  applyThemeVars(bg.color||'#14161c');
  b.style.backgroundColor = bg.color || 'rgba(20,22,28,.9)';
  if(bg.image){
    b.style.backgroundImage='linear-gradient(rgba(13,15,20,.82),rgba(13,15,20,.82)),url("'+bg.image+'")';
    b.style.backgroundSize='cover'; b.style.backgroundPosition='center'; b.style.backgroundAttachment='fixed';
  } else {
    // 纯色背景也压一层深色半透明，保证白字可读；卡片等面板再以半透明融入
    b.style.backgroundImage='linear-gradient(rgba(13,15,20,.66),rgba(13,15,20,.66))';
    b.style.backgroundSize=''; b.style.backgroundPosition=''; b.style.backgroundAttachment='';
  }
  /* 主题色一变，画布底色立即跟随（地图默认底 / 战斗场景默认底） */
  try{
    if(typeof drawMapCanvas==='function') drawMapCanvas();
    if(typeof drawBattleScene==='function') drawBattleScene();
  }catch(e){}
}
function refreshBgUI(){
  var bg=uiBgState();
  var cIn=$('bg-color-input'); if(cIn) cIn.value=bg.color||'#14161c';
  var hasImg=!!bg.image;
  var prev=$('bg-img-prev');
  if(prev) prev.style.display=hasImg?'block':'none';
  if(hasImg&&prev) prev.style.backgroundImage='url("'+bg.image+'")';
  document.querySelectorAll('#bgModal .bgsw').forEach(function(btn){
    btn.classList.toggle('on', (btn.dataset.color||'')===(bg.color||''));
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
        ${BG_SWATCHES.map(function(s){return '<button type="button" class="bgsw'+(s[0]===''?'':'')+'" data-color="'+s[0]+'" title="'+esc(s[1])+'" onclick="setBgColor(this.dataset.color)"><span class="bgsample" style="background:'+(s[0]||'radial-gradient(1200px 600px at 80% -10%, #2a2418 0%, #14161c 55%)')+'"></span></button>';}).join('')}
      </div>
      <div class="row" style="margin-top:8px;gap:8px">
        <label style="flex-direction:row;align-items:center;gap:6px">自定义
          <input type="color" id="bg-color-input" value="#14161c" onchange="setBgColor(this.value)" style="width:52px;height:32px;padding:2px">
        </label>
      </div>
      <h4 class="sectiontitle" style="margin-top:14px">背景图片（可选，自动加深保证文字可读）</h4>
      <div class="row" style="gap:8px">
        <label class="muted" style="flex-direction:row;align-items:center;gap:4px;flex:1">上传图片
          <input type="file" id="bg-img-file" accept="image/*" style="display:none" onchange="onBgImgFile(event)">
          <button class="small" onclick="document.getElementById('bg-img-file').click()">📁 选图</button>
        </label>
        ${(function(){ var bg=uiBgState(); return bg.image?'<button class="small danger" onclick="clearBgImage()">清除图片</button>':''; })()}
      </div>
      <div id="bg-img-prev" style="display:none;height:110px;background-size:cover;background-position:center;border-radius:10px;border:1px solid var(--line);margin-top:8px"></div>
      <div class="vdiv"></div>
      <div class="row" style="justify-content:space-between">
        <button class="small ghost" onclick="resetBgAll()">↺ 恢复默认背景</button>
        <span class="hint">设置保存在本机；开启后卡片/顶栏等会自动半透明适配</span>
      </div>
    </div></div>`;
  refreshBgUI();
  m.classList.add('open');
}
function setBgColor(hex){
  var bg=uiBgState();
  bg.color=(hex||'').trim();
  bg.image=bg.image||null;
  saveStateQuiet(); applyUiBg(); refreshBgUI();
  if(bg.color) toast('背景颜色已更新');
}
function onBgImgFile(e){
  var f=e.target.files&&e.target.files[0]; if(!f||!/^image\//.test(f.type)) return;
  var r=new FileReader();
  r.onload=function(){
    var bg=uiBgState(); bg.image=r.result; if(!bg.color) bg.color='';
    saveState(); applyUiBg(); refreshBgUI(); toast('背景图片已设置');
  };
  r.readAsDataURL(f); e.target.value='';
}
function clearBgImage(){ var bg=uiBgState(); bg.image=null; saveState(); applyUiBg(); refreshBgUI(); toast('已清除背景图片'); }
function resetBgAll(){ var bg=uiBgState(); bg.color=''; bg.image=null; saveState(); applyUiBg(); refreshBgUI(); toast('已恢复默认背景'); }
(function(){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', applyUiBg); else applyUiBg(); })();
