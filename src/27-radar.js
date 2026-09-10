/* ---------- 人物数值雷达图（对齐卡里「附表」G13:O14 那张九维图） ----------
   卡里的雷达图读的是 附表!G13:O14：力量/体质/体型/敏捷/外貌/智力/意志/教育/幸运。
   详情卡里直接用角色属性画一张一样的，属性改动时会实时重画。 */
var RADAR_ATTRS=[['str','力量','STR'],['con','体质','CON'],['siz','体型','SIZ'],['dex','敏捷','DEX'],
                 ['app','外貌','APP'],['int','智力','INT'],['pow','意志','POW'],['edu','教育','EDU'],['luck','幸运','LUCK']];

function drawAttrRadar(cv, attrs){
  if(!cv || !cv.getContext) return;
  attrs = attrs || {};
  var W=320, H=286, cx=W/2, cy=H/2+4, R=96;
  var dpr=Math.max(1, Math.min(3, window.devicePixelRatio||1));
  cv.style.width='100%'; cv.style.maxWidth=W+'px'; cv.style.height='auto';
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  var g=cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,W,H);
  var n=RADAR_ATTRS.length;
  var vals=RADAR_ATTRS.map(function(kv){ return Math.max(0, parseFloat(attrs[kv[0]])||0); });
  var max=100;
  vals.forEach(function(v){ if(v>max) max=Math.ceil(v/10)*10; });
  function pt(i, r){
    var a=-Math.PI/2 + i*2*Math.PI/n;
    return [cx+Math.cos(a)*r, cy+Math.sin(a)*r];
  }
  /* 底网：四圈 + 十字轴 */
  for(var ring=1; ring<=4; ring++){
    g.beginPath();
    for(var i=0;i<n;i++){
      var p=pt(i, R*ring/4);
      if(i===0) g.moveTo(p[0],p[1]); else g.lineTo(p[0],p[1]);
    }
    g.closePath();
    g.strokeStyle = ring===4 ? 'rgba(227,196,127,.42)' : 'rgba(154,162,181,.22)';
    g.lineWidth = ring===4 ? 1.2 : 1;
    g.stroke();
  }
  g.strokeStyle='rgba(154,162,181,.18)';
  for(var i2=0;i2<n;i2++){
    var pe=pt(i2,R);
    g.beginPath(); g.moveTo(cx,cy); g.lineTo(pe[0],pe[1]); g.stroke();
  }
  /* 数据多边形 */
  g.beginPath();
  for(var i3=0;i3<n;i3++){
    var rr=R*Math.min(1, vals[i3]/max);
    var pp=pt(i3, rr);
    if(i3===0) g.moveTo(pp[0],pp[1]); else g.lineTo(pp[0],pp[1]);
  }
  g.closePath();
  g.fillStyle='rgba(227,196,127,.20)';
  g.fill();
  g.strokeStyle='#e3c47f'; g.lineWidth=2; g.stroke();
  /* 顶点 + 数值 + 轴标签 */
  g.font='11px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
  g.textBaseline='middle';
  for(var i4=0;i4<n;i4++){
    var r4=R*Math.min(1, vals[i4]/max), p4=pt(i4,r4);
    g.beginPath(); g.arc(p4[0],p4[1],2.6,0,Math.PI*2); g.fillStyle='#e3c47f'; g.fill();
    var lp=pt(i4, R+24);
    var right = lp[0] >= cx-2, mid = Math.abs(lp[0]-cx) < 14;
    g.textAlign = mid ? 'center' : (right ? 'left' : 'right');
    g.fillStyle='#9aa2b5';
    g.fillText(RADAR_ATTRS[i4][1], lp[0], lp[1]-6);
    g.fillStyle = vals[i4] ? '#e8e6df' : '#6d7488';
    g.fillText(String(vals[i4]||0), lp[0], lp[1]+7);
  }
}
/* 弹窗里的 9 个属性输入框（实时值，未保存也算） */
function radarAttrsFromModal(){
  var out={}, any=false;
  document.querySelectorAll('#actorModal input.am-attr').forEach(function(inp){
    var k=inp.getAttribute('data-k'); if(!k) return;
    var v=parseFloat(inp.value)||0;
    out[k]=v; if(v>0) any=true;
  });
  return any ? out : null;
}
function paintActorRadar(a){
  var cv=document.getElementById('am-radar');
  if(!cv) return;
  drawAttrRadar(cv, radarAttrsFromModal() || (a && a.attrs) || {});
}
