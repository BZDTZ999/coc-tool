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
function applyZoomLabel(){
  var txt=Math.round((mapZoom||1)*100)+'%';
  document.querySelectorAll('.zoomval').forEach(function(el){ el.textContent=txt; });
}
function mapZoomTo(z){
  var m=currentMap(); if(!m) return;
  var keep=mapViewCenterRatio();
  mapZoom=Math.max(0.35,Math.min(3,z));
  m.zoom=mapZoom;
  saveStateQuiet(); drawMapCanvas(); applyZoomLabel();
  restoreMapView(keep);                      /* 缩放后还看着原来那块地方，不会跳回左上角 */
}
function zoomBy(d){ mapZoomTo((mapZoom||1)+d); }
function zoomReset(){ mapZoomTo(1); }
function zoomFit(){
  var wr=$('mapWrap'), m=currentMap(); if(!wr||!m) return;
  var L=mapLogicalSize(m);
  var z=Math.max(0.35,Math.min(2.2,(wr.clientWidth-6)/L.w));
  mapZoomTo(z);
  centerMapView();
}
/* 地图视图居中：画布比框大就滚到正中间（比框小的话由 CSS 的 margin:auto 居中），
   打开 / 切换地图、缩放、旋转之后都调一次 —— 以前总停在左上角，右边一大片空白。 */
function mapViewCenterRatio(){
  var wr=$('mapWrap'); if(!wr) return null;
  var sw=wr.scrollWidth||1, sh=wr.scrollHeight||1;
  return {x:(wr.scrollLeft+wr.clientWidth/2)/sw, y:(wr.scrollTop+wr.clientHeight/2)/sh};
}
function restoreMapView(c){
  var wr=$('mapWrap'); if(!wr||!c) return;
  wr.scrollLeft=Math.max(0,Math.round(c.x*(wr.scrollWidth||1)-wr.clientWidth/2));
  wr.scrollTop=Math.max(0,Math.round(c.y*(wr.scrollHeight||1)-wr.clientHeight/2));
}
function centerMapView(){
  var wr=$('mapWrap'); if(!wr) return;
  wr.scrollLeft=Math.max(0,(wr.scrollWidth-wr.clientWidth)/2);
  wr.scrollTop=Math.max(0,(wr.scrollHeight-wr.clientHeight)/2);
}
/* 旋转 90°，两种模式：
   mode='all'     整体旋转 —— 底图、地点、摆件与文字一起转；
   mode='upright' 地图旋转 —— 只有地图转，文字保持水平（反向旋转抵消）。 */
function rotateMap(deg, mode){
  var m=currentMap(); if(!m){ toast('先新建/选择一张地图'); return; }
  if(!mode) mode=m.rotUpright?'upright':'all';
  if(mode==='upright') m.rotUpright=true;
  else if(mode==='all') m.rotUpright=false;
  m.rot=(mapRotOf(m)+((deg||90)%360)+360)%360;
  saveStateQuiet();
  if(typeof fsResize==='function'){ try{ fsResize(); }catch(e){} }
  drawMapCanvas();
  centerMapView();
  toast('地图已旋转 '+m.rot+'°（'+(m.rotUpright?'只有地图转，文字保持水平':'整体旋转，文字一起转')+'）');
}
/* 全屏时用图标切换地图：循环到下一张 */
function cycleMap(){
  var list=state.maps||[];
  if(list.length<2){ toast('只有一张地图（最多 3 张，可在非全屏时新建）'); return; }
  var i=list.findIndex(function(x){return x.id===state.activeMapId;});
  var next=list[(i+1+list.length)%list.length];
  setActiveMap(next.id);
  toast('已切换到地图「'+next.name+'」');
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
/* 地图页二级菜单栏：四个功能面板（地图 / 角色 / 摆件素材 / 载具时间速度），
   点开一个会把别的收起；再点同一个就关掉。地图像布占满菜单栏下面的整个宽度。 */
var MAP_POD=null;
function toggleMapPod(which){
  MAP_POD = (MAP_POD===which) ? null : which;
  applyMapPod();
}
function applyMapPod(){
  ['cards','actors','props','veh'].forEach(function(k){
    var pod=$('pod-'+k), btn=$('mp-'+k);
    if(pod) pod.hidden = (MAP_POD!==k);
    if(btn) btn.classList.toggle('on', MAP_POD===k);
  });
  if(MAP_POD==='props'){ try{ renderPropPalette(); }catch(e){} }
  if(MAP_POD==='actors'){ try{ renderMapActorsBox(); }catch(e){} }
  if(MAP_POD==='veh'){ try{ renderMapVehicles(); }catch(e){} }
  try{ if(typeof fsResize==='function') fsResize(); }catch(e){}
}
function mapPodsInit(){ applyMapPod(); }
/* 默认地图下拉：按分类列出内置地图 */
var DEMO_GRP_SEL='';
/* 二级选择：把某一级分类下的地图填进 #mapDemoSel（第一项是占位） */
function fillDemoMapItems(gi){
  var sel=$('mapDemoSel'); if(!sel) return;
  var g=String(gi==null?'':gi);
  DEMO_GRP_SEL=g;
  sel.innerHTML=demoMapItemsHTML(Number(gi));
  sel.value='';
  sel.setAttribute('data-grp', g);
}
function onDemoGroupChange(v){
  fillDemoMapItems(v);
  var g=DEMO_MAP_GROUPS[Number(v)];
  toast(g?('选择「'+g.g+'」下的地图即可载入'):'请选择地图分类');
}
function renderDemoMapSelect(){
  var grp=$('mapDemoGrp'), sel=$('mapDemoSel'); if(!sel) return;
  if(grp && !grp.options.length) grp.innerHTML=demoMapGroupOptionsHTML();
  var m=currentMap();
  var key=(m&&m._demoKey)||'';
  var gi=demoGroupOfKey(key);
  var showGrp=gi>=0?gi:(DEMO_GRP_SEL!==''?Number(DEMO_GRP_SEL):0);
  if(!isFinite(showGrp)||showGrp<0) showGrp=0;
  DEMO_GRP_SEL=String(showGrp);
  if(grp && grp.value!==String(showGrp)) grp.value=String(showGrp);
  if(sel.getAttribute('data-grp')!==String(showGrp)) fillDemoMapItems(showGrp);
  sel.value=key; if(!key) sel.value='';
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
  renderDemoMapSelect();
  var sel=$('mapSel'); if(!sel) return;
  sel.innerHTML=state.maps.map(function(m){return '<option value="'+m.id+'"'+(m.id===state.activeMapId?' selected':'')+'>'+esc(m.name)+'</option>';}).join('')||'<option value="">(无场景)</option>';
  if(sel.value!==(state.activeMapId||'')) sel.value=state.activeMapId||'';
  if(!state.maps.length){
    var mh=$('mapHint');
    if(mh) mh.innerHTML='还没有地图：点上面「🗺 地图」新建或载入一张预设地图。';
    renderMapActorsBox(); renderMapVehicles(); renderPropPalette(); renderMapLists(); renderRoutePanel();
    return;
  }
  var m=currentMap(); if(!m) return;
  var sc=$('mapScale'); if(sc) sc.value=Math.round(((m.kmPerPx||0.02)*MAP_GRID_PX)*10000)/10000;
  /* 室内地图不显示比例尺 */
  var scBox=$('mapScaleBox'); if(scBox) scBox.style.display=m.noDist?'none':'';
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
  centerMapView();                            /* 打开 / 切换地图 → 居中显示（不再停在左上角） */
  renderMapLists();
  renderRoutePanel();
  var cvc=$('mapCanvas'); if(cvc) cvc.style.cursor=(mapTool==='add')?'crosshair':(mapTool==='move'?'move':'grab');
}
function drawMapCanvas(){
  var cv=$('mapCanvas'); if(!cv) return;
  var m=currentMap(); if(!m) return;
  var z=(m&&m.zoom)||mapZoom||1;
  mapZoom=z;
  /* 高清：CSS 尺寸 = 旋转后的逻辑尺寸×缩放，后备缓冲再乘设备像素比，避免 Retina 上发虚 */
  var rot=mapRotOf(m), L=mapLogicalSize(m);
  var g=hidpiCanvas(cv, L.w, L.h, L.w*z, L.h*z);
  if(!g) return;
  g.clearRect(0,0,L.w,L.h);
  g.fillStyle=(typeof themeCanvasColor==='function')?themeCanvasColor():'#151922';
  g.fillRect(0,0,L.w,L.h);
  function paint(){
    g.save();
    if(rot){ g.translate(L.w/2,L.h/2); g.rotate(rot*Math.PI/180); g.translate(-MAP_W/2,-MAP_H/2); }
    if(m.background){
      var img=(_mapBgCache[m.background]=_mapBgCache[m.background]||null);
      if(!img){ img=new Image(); img.onload=function(){ drawMapCanvas(); }; img.src=m.background; _mapBgCache[m.background]=img; }
      if(img.complete){ try{ g.drawImage(img,0,0,MAP_W,MAP_H); }catch(e){} }
    }
    overlayMap(g,m);
    g.restore();
  }
  paint();
}
var _mapBgCache={};
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
