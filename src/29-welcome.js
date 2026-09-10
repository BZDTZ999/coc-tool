/* ---------- 首次打开：说明「只适配这 4 张卡」+ 空白卡下载 ---------- */
var WELCOME_KEY='coc_welcome_v2';
function welcomeSeen(){
  try{ return localStorage.getItem(WELCOME_KEY)==='1'; }catch(e){ return true; }
}
function markWelcomeSeen(){
  try{ localStorage.setItem(WELCOME_KEY,'1'); }catch(e){}
}
function maybeShowWelcome(){
  if(!welcomeSeen()) openWelcome();
}
function openWelcome(){
  var mask=$('welcomeModal'); if(!mask) return;
  var cards=COC_CARDS.map(function(c){
    return '<div class="wcard">'+
      '<div class="wcard-t"><b>'+esc(c.name)+'</b>'+
      (c.id==='pink'?'<span class="badge">最常用</span>':'')+'</div>'+
      '<div class="wcard-d">'+esc(c.desc)+'</div>'+
      '<a class="btn small" href="'+cocCardDownloadHref(c.id)+'" download="'+esc(cocCardDownloadName(c.id))+'">⬇ 下载空白卡</a>'+
    '</div>';
  }).join('');
  mask.innerHTML=`<div class="modal" style="max-width:820px">
    <div class="modal-head"><b>🪄 欢迎来到「带团妙妙小工具」</b>
      <button class="ghost" onclick="closeWelcome()">✕</button></div>
    <div class="modal-body">
      <p style="font-size:15px;margin:4px 0 10px"><b>本工具只适配下面这 4 张人物卡。</b>
        拖入其中任意一张填好的卡（.xlsx）就能读档、导出；其它卡不再保证能正确读写。</p>
      <div class="wgrid">${cards}</div>
      <div class="hint" style="line-height:1.9;margin-top:12px">
        · <b>读卡</b>：把填好的卡拖进「📋 调查员」页的虚线框即可，属性 / 技能 / 武器 / 背包 / 法术 / 资产 / 背景 / 经历都会读进来。<br>
        · <b>导出</b>：点小卡的 ⬇ 导出卡，按你导入的那张卡的模板填回去，卡里的公式、<b>属性雷达图</b>、下拉表都保留（导出后再用 Excel 打开会自动重算）。<br>
        · <b>中式职业扩展</b>那套卡的职业列表不一样（更夫 / 镖师 / 教书先生 …），本职技能会照着它自己的职业表算。<br>
        · 上面没有你用的卡？把那张卡发我，我再加适配。
      </div>
      <div class="row" style="justify-content:space-between;margin-top:14px">
        <label class="muted" style="flex-direction:row;align-items:center;gap:6px;font-size:12px">
          <input type="checkbox" id="welcomeNever" checked style="width:auto"> 我知道了，以后不再自动弹出
        </label>
        <button class="primary" onclick="closeWelcome()">开始使用 →</button>
      </div>
      <div class="hint" style="margin-top:8px">以后想再看：右上角「❔ 说明」里点「📥 支持的人物卡」。</div>
    </div></div>`;
  mask.classList.add('open');
}
function closeWelcome(){
  var never=$('welcomeNever');
  if(!never || never.checked) markWelcomeSeen();
  var mask=$('welcomeModal');
  if(mask) mask.classList.remove('open');
}
