/* ---------- 🧰 更多小玩意儿 · ② 天文 / 天象 ----------
   「选日期 + 选地点 → 当天天空怎么样」：月相 / 月出月落 / 日出日落 / 什么时候完全黑 / 今晚能看到什么。
   天体位置不是自己编的：用 astronomy-engine（MIT，见 assets/sky/astronomy.js；离线版内联、在线版按需加载），
   太阳月亮行星与日月食都由它算，精度对跑团足够（1900~2100 年之内都很准）。
   时间一律按「该城市的标准时」（不换算夏令时），跑团查历史日期更方便。 */
'use strict';
/* [id, 名称, 纬度, 经度, 时区(小时, 标准时)] —— 常用团点，够用就好 */
var SKY_CITIES=[
  ['beijing','北京',39.90,116.41,8],['shanghai','上海',31.23,121.47,8],['guangzhou','广州',23.13,113.26,8],
  ['tianjin','天津',39.13,117.20,8],['chongqing','重庆',29.56,106.55,8],['nanjing','南京',32.06,118.80,8],
  ['hangzhou','杭州',30.27,120.16,8],['suzhou','苏州',31.30,120.58,8],['ningbo','宁波',29.87,121.55,8],
  ['wuhan','武汉',30.59,114.31,8],['chengdu','成都',30.57,104.07,8],['xian','西安',34.34,108.94,8],
  ['changsha','长沙',28.23,112.94,8],['shenyang','沈阳',41.80,123.43,8],['harbin','哈尔滨',45.80,126.53,8],
  ['jinan','济南',36.65,117.12,8],['qingdao','青岛',36.07,120.38,8],['kunming','昆明',25.04,102.72,8],
  ['fuzhou','福州',26.07,119.30,8],['xiamen','厦门',24.48,118.09,8],['shenzhen','深圳',22.54,114.06,8],
  ['ztaipei','台北',25.03,121.57,8],['hk','香港',22.32,114.17,8],['macau','澳门',22.20,113.54,8],
  ['lhasa','拉萨',29.65,91.14,8],['urumqi','乌鲁木齐',43.83,87.62,8],['lanzhou','兰州',36.06,103.83,8],
  ['haikou','海口',20.04,110.32,8],['taiyuan','太原',37.87,112.55,8],['zhengzhou','郑州',34.75,113.62,8],
  ['nanchang','南昌',28.68,115.86,8],['guiyang','贵阳',26.65,106.63,8],['nanning','南宁',22.82,108.32,8],
  ['shijiazhuang','石家庄',38.04,114.51,8],['huhehaote','呼和浩特',40.84,111.75,8],['yinchuan','银川',38.49,106.23,8],
  ['xining','西宁',36.62,101.78,8],['changchun','长春',43.82,125.32,8],
  ['london','伦敦',51.51,-0.13,0],['paris','巴黎',48.86,2.35,1],['berlin','柏林',52.52,13.40,1],
  ['rome','罗马',41.90,12.50,1],['madrid','马德里',40.42,-3.70,1],['amsterdam','阿姆斯特丹',52.37,4.90,1],
  ['brussels','布鲁塞尔',50.85,4.35,1],['vienna','维也纳',48.21,16.37,1],['zurich','苏黎世',47.38,8.54,1],
  ['stockholm','斯德哥尔摩',59.33,18.07,1],['oslo','奥斯陆',59.91,10.75,1],['copenhagen','哥本哈根',55.68,12.57,1],
  ['helsinki','赫尔辛基',60.17,24.94,2],['moscow','莫斯科',55.76,37.62,3],['stpetersburg','圣彼得堡',59.94,30.31,3],
  ['istanbul','伊斯坦布尔',41.01,28.98,3],['athens','雅典',37.98,23.73,2],['cairo','开罗',30.04,31.24,2],
  ['capetown','开普敦',-33.92,18.42,2],['nairobi','内罗毕',-1.29,36.82,3],['lagos','拉各斯',6.52,3.38,1],
  ['johannesburg','约翰内斯堡',-26.20,28.05,2],['jerusalem','耶路撒冷',31.78,35.22,2],['dubai','迪拜',25.20,55.27,4],
  ['tehran','德黑兰',35.69,51.39,3.5],['mumbai','孟买',19.08,72.88,5.5],['delhi','德里',28.61,77.21,5.5],
  ['kolkata','加尔各答',22.57,88.36,5.5],['bangkok','曼谷',13.76,100.50,7],['hanoi','河内',21.03,105.85,7],
  ['singapore','新加坡',1.35,103.82,8],['kualalumpur','吉隆坡',3.14,101.69,8],['jakarta','雅加达',-6.21,106.85,7],
  ['manila','马尼拉',14.60,120.98,8],['tokyo','东京',35.68,139.69,9],['osaka','大阪',34.69,135.50,9],
  ['kyoto','京都',35.01,135.77,9],['nagoya','名古屋',35.18,136.91,9],['sapporo','札幌',43.06,141.35,9],
  ['seoul','首尔',37.57,126.98,9],['pyongyang','平壤',39.03,125.75,9],['sydney','悉尼',-33.87,151.21,10],
  ['melbourne','墨尔本',-37.81,144.96,10],['brisbane','布里斯班',-27.47,153.03,10],['perth','珀斯',-31.95,115.86,8],
  ['adelaide','阿德莱德',-34.93,138.60,9.5],['auckland','奥克兰',-36.85,174.76,12],['honolulu','火奴鲁鲁',21.31,-157.86,-10],
  ['newyork','纽约',40.71,-74.01,-5],['boston','波士顿',42.36,-71.06,-5],['washington','华盛顿',38.91,-77.04,-5],
  ['chicago','芝加哥',41.88,-87.63,-6],['neworleans','新奥尔良',29.95,-90.07,-6],['stlouis','圣路易斯',38.63,-90.20,-6],
  ['denver','丹佛',39.74,-104.99,-7],['losangeles','洛杉矶',34.05,-118.24,-8],['sanfrancisco','旧金山',37.77,-122.42,-8],
  ['seattle','西雅图',47.61,-122.33,-8],['phoenix','凤凰城',33.45,-112.07,-7],['anchorage','安克雷奇',61.22,-149.90,-9],
  ['montreal','蒙特利尔',45.50,-73.57,-5],['toronto','多伦多',43.65,-79.38,-5],['vancouver','温哥华',49.28,-123.12,-8],
  ['mexicocity','墨西哥城',19.43,-99.13,-6],['havana','哈瓦那',23.11,-82.37,-5],['rio','里约热内卢',-22.91,-43.17,-3],
  ['buenosaires','布宜诺斯艾利斯',-34.60,-58.38,-3],['santiago','圣地亚哥',-33.45,-70.67,-4],['lima','利马',-12.05,-77.04,-5],
  ['reykjavik','雷克雅未克',64.15,-21.94,0],['longyearbyen','朗伊尔城',78.22,15.65,1],['nairobi2','乞力马扎罗',-3.07,37.35,3]
];
/* 亮星（J2000 赤经小时 / 赤纬度 / 星等）—— 只用来判断「今晚能不能看到」，不追求精密定位 */
var SKY_STARS=[
  ['天狼星','大犬座',6.7525,-16.716,-1.46],['老人星','船底座',6.3992,-52.696,-0.72],['大角星','牧夫座',14.2610,19.182,-0.05],
  ['织女星','天琴座',18.6156,38.784,0.03],['五车二','御夫座',5.2782,45.998,0.08],['参宿七','猎户座',5.2423,-8.202,0.13],
  ['南河三','小犬座',7.6551,5.225,0.34],['参宿四','猎户座',5.9195,7.407,0.50],['水委一','波江座',1.6286,-57.237,0.45],
  ['马腹一','半人马座',14.0637,-60.373,0.61],['牛郎星','天鹰座',19.8464,8.868,0.77],['十字架二','南十字座',12.4433,-63.099,0.77],
  ['毕宿五','金牛座',4.5987,16.509,0.85],['角宿一','处女座',13.4199,-11.161,0.98],['心宿二','天蝎座',16.4901,-26.432,1.09],
  ['北河三','双子座',7.7553,28.026,1.14],['北落师门','南鱼座',22.9608,-29.622,1.16],['天津四','天鹅座',20.6905,45.280,1.25],
  ['十字架三','南十字座',12.7953,-59.689,1.25],['轩辕十四','狮子座',10.1395,11.967,1.35],['弧矢七','大犬座',6.9770,-28.972,1.50],
  ['北河二','双子座',7.5766,31.888,1.58],['尾宿八','天蝎座',17.5601,-37.104,1.62],['参宿五','猎户座',5.4188,6.350,1.64],
  ['五车五','金牛座',5.4382,28.608,1.65],['南船五','船底座',9.2200,-69.717,1.67],['参宿二','猎户座',5.6036,-1.202,1.69],
  ['玉衡','大熊座',12.9005,55.960,1.77],['参宿一','猎户座',5.6793,-1.943,1.77],['天枢','大熊座',11.0621,61.751,1.79],
  ['天船三','英仙座',3.4054,49.861,1.79],['弧矢一','大犬座',7.1399,-26.393,1.83],['箕宿三','人马座',18.4029,-34.385,1.85],
  ['尾宿五','天蝎座',17.6220,-42.998,1.86],['海石一','船底座',8.3752,-59.510,1.86],['摇光','大熊座',13.7923,49.313,1.86],
  ['井宿三','双子座',6.6285,16.399,1.93],['北极星','小熊座',2.5303,89.264,1.98],['星宿一','长蛇座',9.4598,-8.659,1.98],
  ['娄宿三','白羊座',2.1195,23.462,2.00],['壁宿二','仙女座',0.1398,29.091,2.06],['奎宿九','仙女座',1.1622,35.621,2.06],
  ['参宿六','猎户座',5.7959,-9.670,2.07],['北极二','小熊座',14.8451,74.156,2.08],['轩辕十二','狮子座',10.3329,19.841,2.08],
  ['斗宿四','人马座',18.9211,-26.297,2.05],['天大将军一','仙女座',2.0650,42.330,2.10],['大陵五','英仙座',3.1361,40.956,2.12],
  ['五帝座一','狮子座',11.8177,14.572,2.14],['参宿三','猎户座',5.5334,-0.299,2.23],['王良四','仙后座',0.6751,56.537,2.24],
  ['开阳','大熊座',13.3988,54.925,2.27],['王良一','仙后座',0.1530,59.150,2.28],['天璇','大熊座',11.0307,56.382,2.37],
  ['室宿二','飞马座',23.0629,28.083,2.42],['天玑','大熊座',11.8972,53.695,2.44],['室宿一','飞马座',23.0794,15.205,2.49],
  ['天囷一','鲸鱼座',3.0380,4.090,2.54],['氐宿一','天秤座',14.8479,-16.042,2.75],['室宿一b','飞马座',0.2206,15.184,2.83],
  ['东次将','处女座',13.0363,10.959,2.85],['天权','大熊座',12.2570,57.033,3.31]
];
/* 主要流星雨：名称 / 峰值月 / 峰值日 / 辐射点所在星座 / 天顶流量 ZHR / 持续天数 */
var SKY_SHOWERS=[
  ['象限仪座流星雨',1,3,'牧夫座',110,3],['天琴座流星雨',4,22,'天琴座',18,4],['宝瓶座η流星雨',5,6,'宝瓶座',50,8],
  ['宝瓶座δ流星雨',7,30,'宝瓶座',25,6],['摩羯座α流星雨',7,30,'摩羯座',5,6],['英仙座流星雨',8,12,'英仙座',100,10],
  ['天龙座流星雨',10,8,'天龙座',10,3],['猎户座流星雨',10,21,'猎户座',20,8],['金牛座南流星雨',11,5,'金牛座',5,12],
  ['狮子座流星雨',11,17,'狮子座',15,6],['双子座流星雨',12,14,'双子座',150,8],['小熊座流星雨',12,22,'小熊座',10,4]
];
var SKY_MOONS=['新月','娥眉月','上弦月','盈凸月','满月','亏凸月','下弦月','残月'];
var skyState={date:'', cityId:'london', custom:false, lat:null, lon:null, tz:null, err:'', cal:false};
function skyPad(n){ return (n<10?'0':'')+n; }
function skyTodayStr(){
  var d=new Date();
  return d.getFullYear()+'-'+skyPad(d.getMonth()+1)+'-'+skyPad(d.getDate());
}
function skyDateStr(){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(skyState.date||''))) skyState.date=skyTodayStr();
  return skyState.date;
}
function skyDateParts(){
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(skyDateStr());
  if(!m) return null;
  return {y:parseInt(m[1],10), m:parseInt(m[2],10), d:parseInt(m[3],10)};
}
function skyCityList(){ return SKY_CITIES; }
function skyCityById(id){
  var hit=null;
  SKY_CITIES.forEach(function(c){ if(c[0]===id) hit=c; });
  return hit;
}
/* 当前地点：城市表里的，或「自定义」里手填的经纬度与时区 */
function skyCity(){
  if(skyState.cityId==='custom'){
    var lat=parseFloat(skyState.lat), lon=parseFloat(skyState.lon), tz=parseFloat(skyState.tz);
    if(!isFinite(lat)||!isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180) return null;
    return ['custom','自定义',lat,lon,isFinite(tz)?tz:8];
  }
  var c=skyCityById(skyState.cityId);
  if(!c && SKY_CITIES.length) c=SKY_CITIES[0];
  return c;
}
/* 天文数据：离线版内联（window.Astronomy 直接就在），在线版第一次用时才去取 assets/sky/astronomy.js */
function skyEnsure(cb, fail){
  if(window.Astronomy){ cb(window.Astronomy); return; }
  if(window.__skyLoading){ window.__skyQ.push(cb); return; }
  var url=window.__COC_SKY_URL;
  if(!url){ if(fail) fail(new Error('天文计算库没带上（请用重新构建后的 offline.html）')); return; }
  window.__skyLoading=true; window.__skyQ=[cb];
  var s=document.createElement('script');
  s.src=url;
  s.onload=function(){
    window.__skyLoading=false;
    var q=window.__skyQ||[]; window.__skyQ=[];
    if(!window.Astronomy){ if(fail) fail(new Error('天文计算库加载了但没生效')); return; }
    q.forEach(function(f){ f(window.Astronomy); });
  };
  s.onerror=function(){
    window.__skyLoading=false; window.__skyQ=[];
    if(fail) fail(new Error('天文计算库加载失败（在线版要能访问 '+url+'）'));
  };
  document.head.appendChild(s);
}
/* 当地「某天 00:00」的 UTC 毫秒（按城市标准时，不算夏令时） */
function skyDayStart(y,m,d,tz){ return Date.UTC(y,m-1,d,0,0,0)-Math.round(tz*3600e3); }
function skyT(tz){ return function(ms){ var dt=new Date(ms+Math.round(tz*3600e3)); return skyPad(dt.getUTCHours())+':'+skyPad(dt.getUTCMinutes()); }; }
function skyDT(tz){ return function(ms){ var dt=new Date(ms+Math.round(tz*3600e3)); return dt.getUTCFullYear()+'-'+skyPad(dt.getUTCMonth()+1)+'-'+skyPad(dt.getUTCDate())+' '+skyPad(dt.getUTCHours())+':'+skyPad(dt.getUTCMinutes()); }; }
function skyDurText(ms){
  var min=Math.round(ms/60000);
  var h=Math.floor(min/60), mm=min%60;
  return h+' 小时 '+(mm<10?'0':'')+mm+' 分';
}
function skyAzWord(az){
  var w=['北','东北','东','东南','南','西南','西','西北'];
  var i=Math.round(((az%360)+360)%360/45)%8;
  return w[i];
}
function skyTms(x){ return (x && x.date)?x.date.getTime():null; }
/* 天文库不同版本的时间对象长得不一样（Date / AstroTime{date} / EclipseEvent{time}），统一取毫秒 */
function skyTimeMs(x){
  if(!x) return null;
  if(typeof x==='number') return x;
  if(typeof x.getTime==='function') return x.getTime();
  if(x.date && typeof x.date.getTime==='function') return x.date.getTime();
  if(x.time) return skyTimeMs(x.time);
  if(x.peak) return skyTimeMs(x.peak);
  return null;
}
/* 节气：有的版本给数组 [{time,name}]，有的给对象 {mar_equinox:…}，两种都认 */
function skySeasonList(y){
  var A=window.Astronomy, r=null;
  try{ r=A.Seasons(y); }catch(e){ return []; }
  if(!r) return [];
  if(r.length) return [].slice.call(r);
  var zh={mar_equinox:'春分',jun_solstice:'夏至',sep_equinox:'秋分',dec_solstice:'冬至'};
  var out=[];
  Object.keys(zh).forEach(function(k){ if(r[k]) out.push({time:r[k], name:zh[k], zh:zh[k]}); });
  return out;
}
function skySeasonZh(s){
  if(s.zh) return s.zh;
  var n=String(s.name||'');
  if(/March/i.test(n)) return '春分';
  if(/June/i.test(n)) return '夏至';
  if(/September/i.test(n)) return '秋分';
  if(/December/i.test(n)) return '冬至';
  return n;
}
/* ================= 计算一天 ================= */
function skyCompute(){
  var A=window.Astronomy;
  if(!A) return {err:'天文计算库还没准备好'};
  var c=skyCity();
  if(!c) return {err:'地点没选好（自定义坐标要填合法经纬度）'};
  var dp=skyDateParts(); if(!dp) return {err:'日期没填对'};
  var lat=c[2], lon=c[3], tz=c[4];
  var obs=new A.Observer(lat, lon, 0);
  var day0=skyDayStart(dp.y,dp.m,dp.d,tz);
  var t0=new A.AstroTime(new Date(day0));
  var hm=skyT(tz), full=skyDT(tz);
  var out={city:c[1], lat:lat, lon:lon, tz:tz, y:dp.y, m:dp.m, d:dp.d, day0:day0, hm:hm};

  function rise(body,dir,from){
    try{ var ev=A.SearchRiseSet(body, obs, dir, from, 1); return ev?ev.date.getTime():null; }catch(e){ return null; }
  }
  function alt(body,from,dir,deg){
    try{ var ev=A.SearchAltitude(body, obs, dir, from, 1, deg); return ev?ev.date.getTime():null; }catch(e){ return null; }
  }
  /* 太阳 */
  out.sunrise=rise('Sun',1,t0);
  out.sunset =rise('Sun',-1,t0);
  if(out.sunrise && out.sunset) out.dayLen=out.sunset-out.sunrise;
  out.civilDusk=alt('Sun',t0,-1,-6);
  out.astroDusk=alt('Sun',t0,-1,-18);
  out.astroDawn=out.astroDusk?alt('Sun',new A.AstroTime(new Date(out.astroDusk)),1,-18):null;
  var noon=new A.AstroTime(new Date(day0+12*3600e3));
  var sunEq=A.Equator('Sun', noon, obs, true, true);
  var sunNoon=A.Horizon(noon, obs, sunEq.ra, sunEq.dec, 'normal');
  out.polar='';
  if(!out.sunrise || !out.sunset){
    out.polar=(sunNoon.altitude>0)?'极昼（整天太阳都在地平线上）':'极夜（整天太阳都在地平线下）';
  }
  /* 月亮 */
  out.moonrise=rise('Moon',1,t0);
  /* 月落取「月出之后的那一次」：这样「16:01 升起 → 次日 00:45 落下」读起来才对得上今晚 */
  out.moonset =out.moonrise?rise('Moon',-1,new A.AstroTime(new Date(out.moonrise))):rise('Moon',-1,t0);
  out.moonPhase=A.MoonPhase(noon);
  out.moonAge=out.moonPhase/360*29.530588853;
  try{ out.moonLight=A.Illumination('Moon',noon).phase_fraction*100; }catch(e){ out.moonLight=null; }
  /* 夜：从日落到次日日出（没有日落就用当地 18 点 / 次日 6 点兜底） */
  var nightA=out.sunset||(day0+18*3600e3);
  /* 「天亮」要取日落之后的那一次日出；直接用当天早上的日出会把夜算成半天 */
  var nightB=null;
  try{ var nb=A.SearchRiseSet('Sun', obs, 1, new A.AstroTime(new Date(nightA+60000)), 1); nightB=nb?nb.date.getTime():null; }catch(e){}
  if(nightB==null) nightB=(out.sunrise && out.sunrise>nightA)?out.sunrise:(nightA+12*3600e3);
  out.nightA=nightA; out.nightB=nightB;
  var darkA=out.astroDusk||nightA, darkB=out.astroDawn||nightB;
  out.whiteNight=(!out.polar && !out.astroDusk);        /* 太阳降不到 -18°：夏夜的「白夜」 */
  out.darkA=darkA; out.darkB=darkB;
  /* 采样：亮星 / 行星 在这段时间里的最高高度 */
  var step=20*60*1000, samples=[];
  for(var t=nightA;t<=nightB;t+=step) samples.push(t);
  if(samples.length<2) samples=[nightA,nightB];
  function skyAt(ms, ra, dec){
    try{ return A.Horizon(new A.AstroTime(new Date(ms)), obs, ra, dec, 'normal'); }catch(e){ return null; }
  }
  var cons={}, starSeen=[];
  SKY_STARS.forEach(function(s){
    var maxA=-99, minA=99;
    samples.forEach(function(ms){
      var h=skyAt(ms, s[2], s[3]); if(!h) return;
      if(h.altitude>maxA) maxA=h.altitude;
      if(h.altitude<minA) minA=h.altitude;
    });
    if(maxA>15){
      if(!cons[s[1]]) cons[s[1]]={max:maxA,min:minA,star:s[0]};
      else if(maxA>cons[s[1]].max) cons[s[1]]={max:maxA,min:minA,star:s[0]};
      if(s[4]<=1.6) starSeen.push(s[0]);
    }
  });
  out.cons=Object.keys(cons).sort(function(a,b){ return cons[b].max-cons[a].max; });
  out.consAll=out.cons.length;
  out.cons=out.cons.slice(0,12);
  out.stars=starSeen.slice(0,8);
  /* 行星：日落后到日出前，最高高度超过 8° 就算「今晚可见」 */
  out.planets=[];
  ['Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function(name){
    var zh={Mercury:'水星',Venus:'金星',Mars:'火星',Jupiter:'木星',Saturn:'土星'}[name];
    var maxA=-99, best=null, mag=null;
    samples.forEach(function(ms){
      try{
        var eq=A.Equator(name, new A.AstroTime(new Date(ms)), obs, true, true);
        var h=A.Horizon(new A.AstroTime(new Date(ms)), obs, eq.ra, eq.dec, 'normal');
        if(h.altitude>maxA){ maxA=h.altitude; best=h; }
      }catch(e){}
    });
    try{ mag=A.Illumination(name, noon).mag; }catch(e){ mag=null; }
    if(maxA>8) out.planets.push({name:zh, mag:mag, az:best?best.azimuth:0, alt:maxA});
  });
  /* 流星雨：峰值前后 6 天内提到；再看月光影响 */
  out.showers=[];
  var dayIndex=Date.UTC(dp.y,dp.m-1,dp.d)/86400e3;
  SKY_SHOWERS.forEach(function(sh){
    var idx=Date.UTC(dp.y,sh[1]-1,sh[2])/86400e3;
    var diff=idx-dayIndex;
    if(diff>180) diff-=365;
    if(diff<-180) diff+=365;
    if(diff<=6 && diff>=-6){
      var bright=(out.moonLight!=null && out.moonLight>=55 && out.moonPhase<180);
      out.showers.push({name:sh[0], zhr:sh[4], con:sh[3], diff:Math.round(diff), moon:bright});
    }
  });
  /* 日月食：交给天文库精确搜一次（就搜这一天附近） */
  out.eclipse=[];
  try{
    var se=new A.AstroTime(new Date(day0-8*3600e3));
    for(var k=0;k<4;k++){
      var le=A.SearchLunarEclipse(se);
      if(!le) break;
      var pt=skyTimeMs(le.peak);
      if(pt==null) break;
      se=le.peak;
      if(pt>=day0 && pt<day0+86400e3) out.eclipse.push('月食（'+skyLunarKind(le.kind)+'，'+hm(pt)+' 食甚）');
      if(pt>=day0+86400e3) break;
    }
  }catch(e){}
  try{
    var ss=new A.AstroTime(new Date(day0-8*3600e3));
    for(var q=0;q<6;q++){
      var sol=A.SearchLocalSolarEclipse(ss, obs);
      if(!sol) break;
      var pk=skyTimeMs(sol.peak);
      if(pk==null) break;
      ss=sol.peak;
      if(pk>=day0 && pk<day0+86400e3) out.eclipse.push('日食（'+skySolarKind(sol.kind)+'，'+hm(pk)+' 食甚）');
      if(pk>=day0+86400e3) break;
    }
  }catch(e){}
  return out;
}
function skyLunarKind(k){
  return k==='total'?'月全食':(k==='partial'?'月偏食':(k==='penumbral'?'半影月食':'月食'));
}
function skySolarKind(k){
  return k==='total'?'日全食':(k==='annular'?'日环食':(k==='partial'?'日偏食':'日食'));
}
/* ================= 天象日历（当月） ================= */
function skyMonthEvents(){
  var A=window.Astronomy;
  var c=skyCity(); var dp=skyDateParts();
  if(!A || !c || !dp) return null;
  var tz=c[4], obs=new A.Observer(c[2],c[3],0);
  var hm=skyT(tz);
  var start=skyDayStart(dp.y,dp.m,1,tz);
  var days=new Date(Date.UTC(dp.y,dp.m,0)).getUTCDate();          /* 当月天数 */
  var end=start+days*86400e3;
  var ev=[];
  /* 月相节点：必须用 NextMoonQuarter 往后推，直接拿时间重搜会原地打转、漏掉一次 */
  try{
    var names={0:'新月',1:'上弦月',2:'满月',3:'下弦月'};
    var mq=A.SearchMoonQuarter(new A.AstroTime(new Date(start-86400e3)));
    for(var i=0;i<8 && mq;i++){
      var ms=skyTimeMs(mq.time);
      if(ms==null || ms>=end) break;
      if(ms>=start) ev.push({ms:ms, k:'月相', t:names[mq.quarter]||'月相'});
      mq=A.NextMoonQuarter(mq);
    }
  }catch(e){}
  /* 流星雨峰值 */
  SKY_SHOWERS.forEach(function(sh){
    if(sh[1]!==dp.m) return;
    ev.push({ms:skyDayStart(dp.y,sh[1],sh[2],tz)+12*3600e3, k:'流星雨', t:sh[0]+'（峰值，ZHR '+sh[4]+'，辐射点 '+sh[3]+'）'});
  });
  /* 日月食 */
  try{
    var st=new A.AstroTime(new Date(start-20*86400e3));
    for(var a=0;a<6;a++){
      var le=A.SearchLunarEclipse(st); if(!le) break;
      var lp=skyTimeMs(le.peak); if(lp==null) break;
      st=le.peak;
      if(lp>=end) break;
      if(lp>=start) ev.push({ms:lp, k:'月食', t:skyLunarKind(le.kind)});
    }
  }catch(e){}
  try{
    var st2=new A.AstroTime(new Date(start-20*86400e3));
    for(var b=0;b<6;b++){
      var so=A.SearchLocalSolarEclipse(st2, obs); if(!so) break;
      var sp=skyTimeMs(so.peak); if(sp==null) break;
      st2=so.peak;
      if(sp>=end) break;
      if(sp>=start) ev.push({ms:sp, k:'日食', t:skySolarKind(so.kind)+'（当地可见）'});
    }
  }catch(e){}
  /* 节气 */
  try{
    var sea=skySeasonList(dp.y);
    sea.forEach(function(s){
      var ms=skyTimeMs(s.time);
      if(ms==null) return;
      if(ms>=start && ms<end){
        ev.push({ms:ms, k:'节气', t:skySeasonZh(s)});
      }
    });
  }catch(e){}
  ev.sort(function(x,y){ return x.ms-y.ms; });
  return ev;
}
/* ================= 界面 ================= */
function skyCityOptions(){
  return SKY_CITIES.map(function(c){
    return '<option value="'+esc(c[0])+'"'+(skyState.cityId===c[0]?' selected':'')+'>'+esc(c[1])+'</option>';
  }).join('')+'<option value="custom"'+(skyState.cityId==='custom'?' selected':'')+'>自定义坐标…</option>';
}
function skyPaneHTML(){
  var c=skyCity();
  var customRow='';
  if(skyState.cityId==='custom'){
    var lat=(skyState.lat==null?'':skyState.lat), lon=(skyState.lon==null?'':skyState.lon), tz=(skyState.tz==null?8:skyState.tz);
    customRow='<div class="xp-line sky-custom">纬度 <input type="number" step="0.01" id="skyLat" value="'+esc(lat)+'" onchange="skySetCoord(\'lat\',this.value)" style="width:80px">'+
      '经度 <input type="number" step="0.01" id="skyLon" value="'+esc(lon)+'" onchange="skySetCoord(\'lon\',this.value)" style="width:80px">'+
      '时区 UTC+ <input type="number" step="0.5" id="skyTz" value="'+esc(tz)+'" onchange="skySetCoord(\'tz\',this.value)" style="width:64px"></div>';
  }
  return '<div class="xp-box sky-ctrl">'+
      '<div class="xp-line"><b>📅 哪一天</b>'+
        '<input type="date" id="skyDate" value="'+esc(skyDateStr())+'" onchange="skySetDate(this.value)">'+
        '<button class="small ghost" onclick="skyToday()">今天</button>'+
        '<button class="small ghost" onclick="skyYear(-1)" title="上一年">‹</button>'+
        '<button class="small ghost" onclick="skyYear(1)" title="下一年">›</button>'+
      '</div>'+
      '<div class="xp-line"><b>📍 哪里</b>'+
        '<select id="skyCity" onchange="skySetCity(this.value)" style="max-width:170px">'+skyCityOptions()+'</select>'+
        (c&&skyState.cityId!=='custom'?'<span class="hint">UTC'+(c[4]>=0?'+':'')+c[4]+'（按标准时，不换算夏令时）</span>':'')+
        '<button class="small primary" onclick="skyRun()">🔭 看看当天天空</button>'+
      '</div>'+customRow+
    '</div>'+
    '<div class="xp-out" id="skyOut">'+skyOutHTML()+'</div>';
}
function skyOutHTML(){
  if(skyState.err) return '<div class="sp-empty"><p><b>算不出来</b></p><p class="hint">'+esc(skyState.err)+'</p></div>';
  var o=skyState.out;
  if(!o) return '<div class="sp-empty"><p><b>选好日期和地点，点「🔭 看看当天天空」</b></p>'+
    '<p class="hint">会给出当天的月相、月出月落、日出日落、什么时候完全黑、当晚能看到的星座与行星，还有流星雨和日月食。</p>'+
    '<p class="hint">库里没有你的城市就选「自定义坐标」，按经纬度和时区填（时区是标准时，比如中国填 8）。</p></div>';
  var hm=o.hm;
  var line=[];
  var ph=SKY_MOONS[Math.min(7,Math.floor(((o.moonPhase%360)+22.5)/45)%8)];
  line.push('<div class="sky-line">🌙 <b>月相</b>：'+ph+
    '<span class="hint">月龄 '+o.moonAge.toFixed(1)+' 天'+(o.moonLight!=null?' · 照明 '+Math.round(o.moonLight)+'%':'')+'</span></div>');
  if(o.polar){
    line.push('<div class="sky-line">☀️ <b>太阳</b>：'+esc(o.polar)+'</div>');
  } else {
    line.push('<div class="sky-line">☀️ <b>日出</b> '+(o.sunrise?hm(o.sunrise):'—')+' ／ <b>日落</b> '+(o.sunset?hm(o.sunset):'—')+
      (o.dayLen?'<span class="hint">白昼 '+skyDurText(o.dayLen)+' · 黑夜 '+skyDurText(86400e3-o.dayLen)+'</span>':'')+'</div>');
  }
  var ms=o.moonset, dayTag='';
  if(ms && o.day0!=null && ms>=o.day0+86400e3-30000) dayTag='（次日）';
  line.push('<div class="sky-line">🌘 <b>月出</b> '+(o.moonrise?hm(o.moonrise):'—')+' ／ <b>月落</b> '+(o.moonset?hm(o.moonset)+dayTag:'—')+'</div>');
  if(o.polar && o.polar.indexOf('极昼')===0){
    line.push('<div class="sky-line">🌑 <b>天黑</b>：太阳整天不落，没有真正的黑夜</div>');
  } else if(o.whiteNight){
    line.push('<div class="sky-line">🌑 <b>天黑</b> '+(o.civilDusk?hm(o.civilDusk):'—')+'<span class="hint">民用黄昏</span> · '+
      '<b>白夜</b>：整夜都有天光（太阳降不到 -18°，看不全黑）</div>');
  } else {
    line.push('<div class="sky-line">🌑 <b>天黑</b> '+(o.civilDusk?hm(o.civilDusk):'—')+'<span class="hint">民用黄昏</span> · <b>完全黑暗</b> '+
      (o.darkA?hm(o.darkA):'—')+' ～ '+(o.darkB?hm(o.darkB):'—')+'</div>');
  }
  var night=[];
  if(o.polar && o.polar.indexOf('极昼')===0) night.push('<div class="sky-line hint">极昼期间没有真正的夜晚，下面按 18:00～06:00 这段较暗的时间估计。</div>');
  if(o.cons.length) night.push('✨ <b>今晚可见</b>：'+o.cons.join('、')+(o.consAll>o.cons.length?('<span class="hint">等 '+(o.consAll-o.cons.length)+' 个</span>'):''));
  else night.push('✨ 今晚没有明显可见的亮星座（换个日期或地点再看看）');
  if(o.stars.length) night.push('<div class="sky-line"><span class="hint">亮星：'+o.stars.join('、')+'</span></div>');
  if(o.planets.length){
    night.push('<div class="sky-line">🪐 <b>行星</b>：'+o.planets.map(function(p){
      return p.name+'（'+skyAzWord(p.az)+(p.mag!=null?(' · '+p.mag.toFixed(1)+' 等'):'')+'）';
    }).join(' · ')+'</div>');
  } else {
    night.push('<div class="sky-line">🪐 <b>行星</b>：今晚没有肉眼容易看到的行星</div>');
  }
  if(o.showers.length){
    night.push('<div class="sky-line">☄️ <b>流星雨</b>：'+o.showers.map(function(s){
      var w=s.diff===0?'正值峰值':(s.diff>0?('还有 '+s.diff+' 天'):('刚过 '+(-s.diff)+' 天'));
      return s.name+'（'+w+' · ZHR '+s.zhr+' · 辐射点 '+s.con+'）'+(s.moon?'<span class="hint">月光较强</span>':'');
    }).join('；')+'</div>');
  }
  night.push('<div class="sky-line">🌒 <b>特殊天象</b>：'+(o.eclipse.length?o.eclipse.join('；'):'无')+'</div>');
  var ev=skyMonthEvents();
  var cal='';
  if(ev && ev.length){
    cal='<details class="sky-cal"'+(skyState.cal?' open':'')+' ontoggle="skyCalToggle(this.open)"><summary>📅 本月天象日历（'+o.y+' 年 '+o.m+' 月 · 共 '+ev.length+' 条）</summary>'+
      ev.map(function(e){
        var dt=new Date(e.ms+Math.round(o.tz*3600e3));
        return '<div class="sky-ev"><span class="sky-ev-d">'+skyPad(dt.getUTCMonth()+1)+'/'+skyPad(dt.getUTCDate())+' '+skyPad(dt.getUTCHours())+':'+skyPad(dt.getUTCMinutes())+'</span>'+
          '<span class="sky-ev-k">'+esc(e.k)+'</span>'+esc(e.t)+'</div>';
      }).join('')+'</details>';
  }
  return '<div class="sky-head">'+o.y+' 年 '+o.m+' 月 '+o.d+' 日 · '+esc(o.city)+'</div>'+
    '<div class="sky-card">'+line.join('')+'</div>'+
    '<div class="sky-card">'+night.join('')+'</div>'+cal+
    '<div class="hint" style="padding:4px 2px">按 '+esc(o.city)+' 的标准时（UTC'+(o.tz>=0?'+':'')+o.tz+'）算的；天文数据来自 astronomy-engine（MIT），精度对跑团足够。</div>';
}
function skyPaint(){
  var box=$('skyOut'); if(!box) return;
  box.innerHTML=skyOutHTML();
}
function skyRun(){
  skyState.err='';
  skyEnsure(function(){
    var r=null;
    try{ r=skyCompute(); }catch(e){ r={err:String((e&&e.message)||e)}; }
    if(r && r.err) skyState.err=r.err;
    skyState.out=r||null;
    skyPaint();
  }, function(err){
    skyState.err=err.message;
    skyPaint();
  });
}
function skySetDate(v){ skyState.date=v; skyRun(); }
function skySetCity(v){ skyState.cityId=v; if(v==='custom'&&skyState.lat==null){ skyState.lat=51.5; skyState.lon=-0.13; skyState.tz=0; } xpRefresh(); skyRun(); }
function skySetCoord(k,v){
  var n=parseFloat(v);
  if(k==='tz') skyState.tz=isFinite(n)?n:8;
  else skyState[k]=isFinite(n)?n:null;
  skyRun();
}
function skyToday(){ skyState.date=skyTodayStr(); xpRefresh(); skyRun(); }
function skyYear(d){
  var p=skyDateParts(); if(!p) return;
  skyState.date=(p.y+d)+'-'+skyPad(p.m)+'-'+skyPad(p.d);
  var inp=$('skyDate'); if(inp) inp.value=skyState.date;
  skyRun();
}
function skyCalToggle(on){ skyState.cal=!!on; }
