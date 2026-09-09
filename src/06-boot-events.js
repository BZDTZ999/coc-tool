/* ---------- 初始化 ---------- */
function bindEvents(){
  var cv=$('mapCanvas');
  if(cv){
    cv.addEventListener('mousedown',onCanvasDown);
    cv.addEventListener('mousemove',onCanvasMove);
    cv.addEventListener('mouseup',onCanvasUp);
    cv.addEventListener('mouseleave',onCanvasUp);
    cv.addEventListener('click',function(ev){ if(mapTool==='add') onCanvasClick(ev); });
  }
  var addKind=$('cbAddKind');
  if(addKind) addKind.addEventListener('change',onAddKindChange);
  var rest=document.querySelectorAll('#fileRestore,#fileRestore2');
  rest.forEach(function(el){ el.addEventListener('click',function(){ this.value=''; }); });
  var nav=$('nav'); if(nav){
    // 任何标签重新渲染
  }
}
window.addEventListener('DOMContentLoaded', initApp);

/* ================= v2 UI 覆盖层 ================= */
'use strict';
