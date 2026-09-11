/* ---------- 🧰 更多小玩意儿：右半屏的第三个面板（模组 / 规则书 / 更多小玩意儿） ----------
   进去先选工具，三个工具各自记状态，来回切不丢：
   ① 跑团随机（名字 / NPC / 地点） ② 天文·天象 ③ KP正在瞎编！（本地描写素材）。 */
'use strict';
var XP_TOOLS=[['random','🎲 跑团随机','随机名字 / NPC / 地点，KP 临场取材'],
  ['sky','🌙 天文·天象','选日期和地点，看当天的月相与日月出没'],
  ['kp','✍️ KP正在瞎编！','一句话或几个标签，写出一段能直接念的描写（本地素材 · 口述体 · 不联网）']];
var xpTool='random';
function xpToolOf(c){
  var t=(c&&c.tool)||xpTool;
  return (t==='sky'||t==='kp')?t:'random';
}
function xpSetTool(t){
  xpTool=(t==='sky'||t==='kp')?t:'random';
  var c=sidePaneCfg(); c.tool=xpTool;
  saveStateQuiet();
  renderSidePane();
  if(xpTool==='sky' && !skyState.out && !skyState.err) skyRun();
}
/* 只重画面板正文（不动头部与工具切换行），点小按钮时用 */
function xpRefresh(){
  var body=$('xpBody'); if(!body) return;
  body.innerHTML=xpBodyHTML();
  if(xpTool==='sky' && !skyState.out && !skyState.err) skyRun();
}
function xpBodyHTML(){
  if(xpTool==='sky') return skyPaneHTML();
  if(xpTool==='kp') return kpPaneHTML();
  return rtPaneHTML();
}
function renderExtrasPane(pane){
  xpRestoreTool();
  pane.innerHTML='<div class="sp-head"><b>🧰 更多小玩意儿</b>'+
      '<span class="hint">左边照常带团，右边随手取用</span>'+
      '<div class="row sp-tools"><button class="ghost small" onclick="closeSidePane()" title="收起右半屏">✕</button></div>'+
    '</div>'+
    '<div class="xp-tabs" id="xpTabs">'+XP_TOOLS.map(function(t){
      return '<button class="xp-tab'+(xpTool===t[0]?' on':'')+'" data-v="'+t[0]+'" title="'+esc(t[2])+'" onclick="xpSetTool(\''+t[0]+'\')">'+t[1]+'</button>';
    }).join('')+'</div>'+
    '<div class="sp-body xp-body" id="xpBody">'+xpBodyHTML()+'</div>';
  if(xpTool==='sky' && !skyState.out && !skyState.err){
    skyEnsure(function(){ skyRun(); }, function(err){ skyState.err=err.message; skyPaint(); });
  }
}
/* 记住上次用的是哪个工具 */
function xpRestoreTool(){
  var c=sidePaneCfg();
  if(c.tool==='sky' || c.tool==='kp' || c.tool==='random') xpTool=c.tool;
}
