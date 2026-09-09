/* ---------- F. 地图：缩放 / 无3D / 素材库 + 自定义素材上传 ---------- */
var mapZoom = 1;
var MAP_COLL={props:false,veh:false,pts:false,legs:false,legOpen:{}};
/* 折叠卡片展开状态记忆：点击 details 时写入 MAP_COLL，地图列表重绘后保持状态 */
(function bindMapCollapse(){
  if(document.__cocMapCollBound) return;
  document.__cocMapCollBound=1;
  document.addEventListener('toggle', function(ev){
    var d=ev.target; if(!d || !d.dataset) return;
    var k=d.dataset.coll;
    if(k){ MAP_COLL[k]=d.open; return; }
    var lid=d.dataset.legid;
    if(lid){ if(!MAP_COLL.legOpen) MAP_COLL.legOpen={}; MAP_COLL.legOpen[lid]=d.open; }
  }, true);
})();
function applyZoomLabel(){ var el=$('zoomVal'); if(el) el.textContent=Math.round((mapZoom||1)*100)+'%'; }
function mapZoomTo(z){
  var m=currentMap(); if(!m) return;
  mapZoom=Math.max(0.35,Math.min(3,z));
  m.zoom=mapZoom;
  saveStateQuiet(); drawMapCanvas(); applyZoomLabel();
}
function zoomBy(d){ mapZoomTo((mapZoom||1)+d); }
function zoomReset(){ mapZoomTo(1); }
function zoomFit(){
  var wr=$('mapWrap'), m=currentMap(); if(!wr||!m) return;
  var z=Math.max(0.35,Math.min(2.2,(wr.clientWidth-6)/MAP_W));
  mapZoomTo(z);
}
/* 多地图卡片：最多 3 张，卡片切换/改名/删除，隐藏的 #mapSel 仅作兼容 */
function mapCardBarHTML(){
  /* 像剧本/笔记的页签：固定 3 个位置，已有地图可直接点按钮切换；空格为「＋ 新建地图」 */
  var maps=state.maps||[];
  var html='';
  for(var i=0;i<3;i++){
    var m=maps[i];
    if(!m){ html+='<span class="mapcard empty" title="新建一张地图（最多 3 张）"><button class="mapgo add" onclick="newMap()">＋ 新建地图</button></span>'; continue; }
    var act=(m.id===state.activeMapId)?' on':'';
    html+='<span class="mapcard'+act+'" data-mapid="'+esc(m.id)+'" title="点击左侧按钮切换地图">'
      +'<button class="mapgo" onclick="setActiveMap(\''+m.id+'\')">🗺 '+esc(m.name)+'</button>'
      +'<button class="mapren" title="改地图名" onclick="renameMapId(\''+m.id+'\')">✎</button>'
      +'<button class="mcdel" title="删除这张地图" onclick="deleteMapId(\''+m.id+'\')">🗑</button></span>';
  }
  return '<span class="maplbl">地图</span>'+html;
}
function renderMapCards(){
  var bar=$('mapCardBar'); if(!bar) return;
  bar.innerHTML=mapCardBarHTML();
}
function setActiveMap(id){
  if((state.maps||[]).filter(function(x){return x.id===id;}).length===0) return;
  state.activeMapId=id;
  routeSel={start:-1,end:-1,vehicle:null,overrides:{}};
  saveStateQuiet(); renderMapsShell();
}
function renameMapIdFromInput(inp,id){
  if(!inp) return;
  var m=(state.maps||[]).filter(function(x){return x.id===id;})[0];
  if(!m) return;
  var nm=String(inp.value||'').trim()||m.name;
  if(m.name!==nm){ m.name=nm; saveStateQuiet(); }
  inp.value=m.name;
  var sel=$('mapSel'); if(sel) sel.value=m.id;
  renderMapsShell();
}
function renameMapId(id){
  var m=(state.maps||[]).filter(function(x){return x.id===id;})[0]; if(!m) return;
  var name=prompt('给地图重命名：', m.name);
  if(name===null) return;
  m.name=String(name).trim()||m.name;
  saveStateQuiet(); renderMapsShell();
}
function deleteMapId(id){
  var m=(state.maps||[]).filter(function(x){return x.id===id;})[0]; if(!m) return;
  if(!confirmBox('删除地图「'+m.name+'」？（地点/道路会被一并删除，角色不受影响）')) return;
  state.maps=state.maps.filter(function(x){return x.id!==id;});
  if(state.activeMapId===id) state.activeMapId=state.maps.length?state.maps[0].id:null;
  routeSel={start:-1,end:-1,vehicle:null,overrides:{}};
  saveState(); renderMapsShell();
  if(!state.maps.length) toast('没有地图了，点“新建地图”重建');
}
function newMap(){
  if((state.maps||[]).length>=3){ toast('最多同时保留 3 张地图'); return; }
  var name=prompt('新地图名称：','地图 '+(state.maps.length+1));
  if(name===null) return;
  var m={id:uid('map'),name:String(name||'').trim()||'未命名地图',kmPerPx:0.02,background:null,points:[],legs:[],props:[],tokens:[],zoom:1};
  state.maps.push(m); state.activeMapId=m.id; routeSel={start:-1,end:-1,vehicle:null,overrides:{}};
  saveState(); renderMapsShell();
  toast('已新建地图「'+m.name+'」');
}
function renderMapsShell(){

  renderMapCards();
  var sel=$('mapSel'); if(!sel) return;
  sel.innerHTML=state.maps.map(function(m){return '<option value="'+m.id+'"'+(m.id===state.activeMapId?' selected':'')+'>'+esc(m.name)+'</option>';}).join('')||'<option value="">(无场景)</option>';
  if(sel.value!==(state.activeMapId||'')) sel.value=state.activeMapId||'';
  if(!state.maps.length){ var mh=$('mapHint'); if(mh) mh.textContent='请先“新建场景”。'; return; }
  var m=currentMap(); if(!m) return;
  var sc=$('mapScale'); if(sc) sc.value=m.kmPerPx||0.01;
  var isTouch=isCoarseTouch()||(window.innerWidth||0)<=900;
  var wr0=$('mapWrap');
  if(m.zoom==null || (isTouch && wr0 && wr0.clientWidth>50 && MAP_W*(m.zoom||1)>wr0.clientWidth+8)){
    var fitz=1;
    if(wr0 && wr0.clientWidth>50) fitz=Math.max(0.32,Math.min(2,(wr0.clientWidth-6)/MAP_W));
    m.zoom=fitz; saveStateQuiet();
  }
  mapZoom=m.zoom||1;
  applyZoomLabel();
  renderMapActorsBox();
  renderMapVehicles();
  renderPropPalette();
  drawMapCanvas();
  renderMapLists();
  renderRoutePanel();
  var cvc=$('mapCanvas'); if(cvc) cvc.style.cursor=(mapTool==='add')?'crosshair':'grab';
}
function drawMapCanvas(){
  var cv=$('mapCanvas'); if(!cv) return;
  var m=currentMap(); if(!m) return;
  var z=(m&&m.zoom)||mapZoom||1;
  mapZoom=z;
  var W=Math.round(MAP_W*z), H=Math.round(MAP_H*z);
  if(cv.width!==W||cv.height!==H){ cv.width=W; cv.height=H; }
  var g=cv.getContext('2d');
  g.setTransform(z,0,0,z,0,0);
  g.clearRect(0,0,MAP_W,MAP_H);
  if(m.background){
    var img=new Image();
    img.onload=function(){
      var g2=cv.getContext('2d');
      g2.setTransform(z,0,0,z,0,0);
      try{ g2.drawImage(img,0,0,MAP_W,MAP_H); }catch(e){}
      overlayMap(g2,m);
    };
    img.src=m.background;
  } else { g.fillStyle=themeCanvasColor(); g.fillRect(0,0,MAP_W,MAP_H); overlayMap(g,m); }
}
var MAP_TOOLS_PALETTE=[
  ['🏠','房'],['🏢','楼'],['🏰','堡'],['🏭','厂'],['⛪','教堂'],['🏦','银行'],['🏥','医院'],['🎪','马戏'],
  ['🌳','树'],['🌲','松'],['🌴','椰'],['🌵','仙人掌'],['🌾','田'],['🪻','花'],
  ['🪨','石'],['🪵','柴'],['🪓','斧'],['🪣','桶'],['🕯','烛'],['🪑','椅'],['🛏','床'],['🚪','门'],['🪟','窗'],
  ['🧱','砖'],['🛢','油桶'],['📦','箱'],['⚰','棺'],['🪦','碑'],['🗿','像'],
  ['🚗','轿车'],['🚙','吉普'],['🚌','巴士'],['🚓','警车'],['🚑','救护'],['🚒','消防'],['🛻','皮卡'],['🏍','摩托'],
  ['🚲','单车'],['🚜','拖拉机'],['🚂','火车'],['⛵','帆船'],['🛥','汽艇'],['🚢','轮船'],
  ['💡','灯'],['🔥','火'],['🕳','坑'],['🌊','水'],['🌫','雾'],['☠','骸骨'],['🩸','血迹'],['🕸','蛛网'],
  ['📖','书堆'],['🗝','钥匙'],['💼','公文包'],['📻','收音机'],['🎻','提琴'],['🗡','剑'],['🔫','枪'],['🧨','炸药']
];
function renderPropPalette(){
  var pal=$('propPalette'); if(!pal) return;
  var custom=(state.customProps||[]);
  var html=MAP_TOOLS_PALETTE.map(function(p,i){
    return '<button class="propbtn small" onclick="addProp('+i+')">'+p[0]+'<span>'+p[1]+'</span></button>';
  }).join('');
  html+=custom.map(function(c,i){
    return '<button class="propbtn small custprop" title="自定义素材：'+esc(c.name)+'" onclick="addCustomPropToMap('+i+')"><img src="'+esc(c.img)+'" alt="">'+'<span>'+esc(c.name)+'</span><i class="delcust" onclick="event.stopPropagation();delCustomProp('+i+')">✕</i></button>';
  }).join('');
  html+='<button class="propbtn small addfile" onclick="document.getElementById(\'customPropFile\').click()">➕<span>上传素材</span></button>';
  pal.innerHTML=html;
}
function addProp(i){
  var m=currentMap(); if(!m) return;
  var p=MAP_TOOLS_PALETTE[i];
  m.props=m.props||[];
  m.props.push({icon:p[0],x:260+Math.random()*480,y:140+Math.random()*340,scale:1});
  saveState(); drawMapCanvas();
}
function addCustomPropToMap(i){
  var m=currentMap(); if(!m) return;
  var c=(state.customProps||[])[i]; if(!c) return;
  m.props=m.props||[];
  m.props.push({img:c.img,icon:'',label:c.name||'素材',x:260+Math.random()*480,y:140+Math.random()*340,scale:1.2});
  saveState(); drawMapCanvas();
}
function delCustomProp(i){
  if(!state.customProps) return;
  state.customProps.splice(i,1);
  saveStateQuiet(); renderPropPalette();
}
function addCustomPropFiles(e){
  var files=e.target&&e.target.files; if(!files||!files.length) return;
  if(!state.customProps) state.customProps=[];
  var done=0, total=Math.min(files.length,12);
  Array.prototype.slice.call(files,0,total).forEach(function(f){
    if(!/^image\//.test(f.type)){ done++; return; }
    var r=new FileReader();
    r.onload=function(){
      try{
        state.customProps.push({id:uid('cp'),name:(f.name||'素材').replace(/\.[a-z0-9]+$/i,'').slice(0,8),img:r.result});
        saveState(); renderPropPalette();
      }catch(err){ toast('素材过大或损坏：'+f.name,4000); }
      done++;
      if(done>=total) toast('已加入自定义素材库（存本地）');
    };
    r.readAsDataURL(f);
  });
  e.target.value='';
}
