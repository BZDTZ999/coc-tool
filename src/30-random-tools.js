/* ---------- 🧰 更多小玩意儿 · ① 跑团随机（名字 / NPC / 地点） ----------
   纯本地数据 + 纯随机组合，不联网、不生成大段文字，KP 临场点一下就有一份能直接念的素材。
   三块内容各自记状态（rtState），重绘时只换对应那一小块，输入/滚动位置不丢。 */
'use strict';
var rtState={
  nameKind:'cn', nameSex:'any', nameCount:6, names:[],
  npc:null,
  placeKind:'spot', placeCount:5, places:[]
};
function rtPick(a){ return a[Math.floor(Math.random()*a.length)]; }
function rtInt(min,max){ return min+Math.floor(Math.random()*(max-min+1)); }
function rtPickN(a,n){
  var pool=a.slice(), out=[];
  n=Math.min(n,pool.length);
  for(var i=0;i<n;i++) out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  return out;
}
function rtPad2(n){ return (n<10?'0':'')+n; }
/* 一批里尽量不出现重复（池子太小就算了，最多重试到差不多就收手） */
function rtUniqueRoll(n, make, key){
  var out=[], seen={}, guard=0;
  while(out.length<n && guard<n*12+12){
    guard++;
    var v=make(), k=String(key(v));
    if(seen[k]) continue;
    seen[k]=1; out.push(v);
  }
  while(out.length<n) out.push(make());
  return out;
}

/* ================= 随机名字 ================= */
var RT_CN_XING=['李','王','张','刘','陈','杨','黄','赵','吴','周','徐','孙','马','朱','胡','郭','何','高','林','罗','郑','梁','谢','宋','唐','许','韩','冯','邓','曹','彭','曾','肖','田','董','袁','潘','于','蒋','蔡','余','杜','叶','程','苏','魏','吕','丁','任','沈','姚','卢','姜','崔','钟','谭','陆','汪','范','金','石','廖','贾','夏','韦','方','白','邹','孟','熊','秦','邱','江','尹','薛','段','雷','侯','龙','史','陶','黎','贺','顾','毛','郝','龚','邵','万','严','武','戴','莫','孔','向','汤'];
var RT_CN_MING_F=['秀英','丽华','美玲','桂芳','淑珍','秀兰','玉梅','金凤','小凤','雅琴','静怡','婉如','月娥','春梅','秋菊','素芬','慧敏','文娟','雅静','雪梅','梦琪','雨欣','诗涵','佳怡','思媛','若彤','子萱','嘉怡','晓燕','海燕','凤英','秀珍','莲英','巧珍','紫薇'];
var RT_CN_MING_M=['建国','建华','志强','国强','伟民','俊杰','海涛','文斌','晓东','志远','家豪','博文','子轩','浩然','宇轩','泽楷','天佑','明辉','振华','立新','永强','建平','学军','卫东','大伟','小龙','志明','春生','金宝','铁柱','有德','长根','阿福','守义'];
var RT_CN_MING_N=['一鸣','文','毅','凡','澜','青','卓','迟','宁','彦','秋','岑','岚','默','彦之','云舟','知远','述白','未名','临溪','既明','文渊','书言','清和'];
var RT_EN_FIRST=[['James','詹姆斯'],['John','约翰'],['Robert','罗伯特'],['Michael','迈克尔'],['William','威廉'],['David','大卫'],['Richard','理查德'],['Joseph','约瑟夫'],['Thomas','托马斯'],['Charles','查尔斯'],['Christopher','克里斯托弗'],['Daniel','丹尼尔'],['Matthew','马修'],['Anthony','安东尼'],['Mark','马克'],['Donald','唐纳德'],['Steven','史蒂文'],['Paul','保罗'],['Andrew','安德鲁'],['Kenneth','肯尼思'],['George','乔治'],['Edward','爱德华'],['Ronald','罗纳德'],['Timothy','蒂莫西'],['Jason','杰森'],['Jeffrey','杰弗里'],['Ryan','瑞安'],['Jacob','雅各布'],['Gary','加里'],['Nicholas','尼古拉斯'],['Eric','埃里克'],['Jonathan','乔纳森'],['Stephen','斯蒂芬'],['Justin','贾斯廷'],['Scott','斯科特'],['Frank','弗兰克'],['Benjamin','本杰明'],['Gregory','格雷戈里'],['Samuel','塞缪尔'],['Raymond','雷蒙德'],['Patrick','帕特里克'],['Alexander','亚历山大'],['Jack','杰克'],['Dennis','丹尼斯'],['Jerry','杰里'],['Tyler','泰勒'],['Aaron','亚伦'],['Henry','亨利'],['Douglas','道格拉斯'],['Peter','彼得'],['Adam','亚当'],['Walter','沃尔特'],['Harold','哈罗德'],['Carl','卡尔'],['Jeremy','杰里米'],['Gerald','杰拉尔德'],['Keith','基思'],['Roger','罗杰'],['Arthur','阿瑟'],['Lawrence','劳伦斯'],['Sean','肖恩'],['Ethan','伊桑'],['Albert','阿尔伯特'],['Jesse','杰西'],['Bruce','布鲁斯'],['Ralph','拉尔夫'],['Roy','罗伊'],['Eugene','尤金'],['Russell','拉塞尔'],['Philip','菲利普'],['Louis','路易斯'],['Harry','哈里'],['Vincent','文森特'],['Alan','艾伦'],['Oliver','奥利弗'],['Hugo','雨果'],['Cecil','塞西尔'],['Edmund','埃德蒙'],['Percy','珀西'],['Nigel','奈杰尔'],['Rupert','鲁珀特'],['Howard','霍华德'],['Miles','迈尔斯'],['Simon','西蒙'],['Roland','罗兰'],['Desmond','德斯蒙德'],['Oswald','奥斯瓦尔德'],['Clive','克莱夫'],['Hugh','休'],['Maurice','莫里斯']];
var RT_EN_FIRST_F=[['Mary','玛丽'],['Patricia','帕特里夏'],['Jennifer','珍妮弗'],['Linda','琳达'],['Elizabeth','伊丽莎白'],['Barbara','芭芭拉'],['Susan','苏珊'],['Jessica','杰茜卡'],['Sarah','莎拉'],['Karen','卡伦'],['Nancy','南希'],['Lisa','莉萨'],['Margaret','玛格丽特'],['Betty','贝蒂'],['Sandra','桑德拉'],['Ashley','阿什莉'],['Dorothy','多萝西'],['Kimberly','金伯利'],['Emily','埃米莉'],['Donna','唐娜'],['Michelle','米歇尔'],['Carol','卡罗尔'],['Amanda','阿曼达'],['Melissa','梅利莎'],['Deborah','黛博拉'],['Stephanie','斯蒂芬妮'],['Rebecca','丽贝卡'],['Laura','劳拉'],['Sharon','莎伦'],['Cynthia','辛西娅'],['Kathleen','凯瑟琳'],['Amy','艾米'],['Angela','安杰拉'],['Shirley','雪莉'],['Anna','安娜'],['Brenda','布伦达'],['Pamela','帕梅拉'],['Emma','埃玛'],['Nicole','妮科尔'],['Helen','海伦'],['Samantha','萨曼莎'],['Katherine','凯瑟琳'],['Christine','克里斯蒂娜'],['Debra','黛布拉'],['Rachel','蕾切尔'],['Carolyn','卡罗琳'],['Janet','珍妮特'],['Catherine','凯瑟琳'],['Maria','玛丽亚'],['Heather','希瑟'],['Diane','黛安'],['Ruth','露丝'],['Julie','朱莉'],['Olivia','奥利维娅'],['Joyce','乔伊丝'],['Virginia','弗吉尼亚'],['Victoria','维多利亚'],['Kelly','凯莉'],['Lauren','劳伦'],['Christina','克里斯蒂娜'],['Joan','琼'],['Evelyn','伊夫琳'],['Judith','朱迪思'],['Megan','梅甘'],['Andrea','安德烈娅'],['Cheryl','谢丽尔'],['Hannah','汉娜'],['Jacqueline','杰奎琳'],['Martha','玛莎'],['Gloria','格洛丽亚'],['Teresa','特蕾莎'],['Ann','安'],['Frances','弗朗西丝'],['Janice','贾尼丝'],['Jean','琼'],['Abigail','阿比盖尔'],['Alice','艾丽斯'],['Julia','朱莉娅'],['Sophia','索菲娅'],['Grace','格蕾丝'],['Denise','丹妮丝'],['Doris','多丽丝'],['Marilyn','玛丽莲'],['Danielle','丹妮尔'],['Beverly','贝弗莉'],['Isabella','伊莎贝拉'],['Diana','黛安娜'],['Natalie','娜塔莉'],['Charlotte','夏洛特'],['Marie','玛丽'],['Vivian','薇薇安'],['Edith','伊迪丝'],['Agnes','阿格尼丝'],['Mabel','梅布尔'],['Bertha','伯莎'],['Clara','克拉拉'],['Irene','艾琳'],['Stella','斯特拉'],['Ivy','艾薇'],['Rose','罗斯'],['Daisy','黛西'],['Gwendolyn','格温多琳'],['Millicent','米利森特']];
var RT_EN_LAST=[['Smith','史密斯'],['Johnson','约翰逊'],['Williams','威廉姆斯'],['Brown','布朗'],['Jones','琼斯'],['Miller','米勒'],['Davis','戴维斯'],['Garcia','加西亚'],['Wilson','威尔逊'],['Anderson','安德森'],['Taylor','泰勒'],['Thomas','托马斯'],['Moore','摩尔'],['Martin','马丁'],['Jackson','杰克逊'],['Thompson','汤普森'],['White','怀特'],['Harris','哈里斯'],['Clark','克拉克'],['Lewis','刘易斯'],['Robinson','罗宾逊'],['Walker','沃克'],['Hall','霍尔'],['Young','扬'],['Allen','艾伦'],['Wright','赖特'],['King','金'],['Scott','斯科特'],['Green','格林'],['Baker','贝克'],['Adams','亚当斯'],['Nelson','纳尔逊'],['Hill','希尔'],['Campbell','坎贝尔'],['Mitchell','米切尔'],['Roberts','罗伯茨'],['Carter','卡特'],['Phillips','菲利普斯'],['Evans','埃文斯'],['Turner','特纳'],['Parker','帕克'],['Collins','柯林斯'],['Edwards','爱德华兹'],['Stewart','斯图尔特'],['Morris','莫里斯'],['Murphy','墨菲'],['Cook','库克'],['Rogers','罗杰斯'],['Morgan','摩根'],['Peterson','彼得森'],['Cooper','库珀'],['Reed','里德'],['Bailey','贝利'],['Bell','贝尔'],['Howard','霍华德'],['Ward','沃德'],['Cox','考克斯'],['Richardson','理查森'],['Wood','伍德'],['Watson','沃森'],['Brooks','布鲁克斯'],['Bennett','贝内特'],['Gray','格雷'],['Hughes','休斯'],['Price','普赖斯'],['Myers','迈尔斯'],['Foster','福斯特'],['Sanders','桑德斯'],['Ross','罗斯'],['Powell','鲍威尔'],['Sullivan','沙利文'],['Russell','拉塞尔'],['Jenkins','詹金斯'],['Perry','佩里'],['Butler','巴特勒'],['Barnes','巴恩斯'],['Fisher','费希尔'],['Blackwood','布莱克伍德'],['Ashcroft','阿什克罗夫特'],['Marsh','马什'],['Winslow','温斯洛'],['Hargrove','哈格罗夫'],['Thorne','索恩'],['Pickman','皮克曼'],['Whateley','惠特利'],['Armitage','阿米蒂奇'],['Danforth','丹福思'],['Dyer','戴尔'],['Gardner','加德纳'],['Freeborn','弗里伯恩'],['Ellsworth','埃尔斯沃思'],['Halloway','哈洛威'],['Stanton','斯坦顿']];
var RT_JP_XING=[['佐藤','さとう','佐藤'],['铃木','すずき','铃木'],['高桥','たかはし','高桥'],['田中','たなか','田中'],['伊藤','いとう','伊藤'],['渡边','わたなべ','渡边'],['山本','やまもと','山本'],['中村','なかむら','中村'],['小林','こばやし','小林'],['加藤','かとう','加藤'],['吉田','よしだ','吉田'],['山田','やまだ','山田'],['佐佐木','ささき','佐佐木'],['山口','やまぐち','山口'],['松本','まつもと','松本'],['井上','いのうえ','井上'],['木村','きむら','木村'],['林','はやし','林'],['清水','しみず','清水'],['山崎','やまざき','山崎'],['森','もり','森'],['池田','いけだ','池田'],['桥本','はしもと','桥本'],['阿部','あべ','阿部'],['石川','いしかわ','石川'],['山下','やました','山下'],['中岛','なかじま','中岛'],['石井','いしい','石井'],['小川','おがわ','小川'],['前田','まえだ','前田'],['冈田','おかだ','冈田'],['长谷川','はせがわ','长谷川'],['藤田','ふじた','藤田'],['后藤','ごとう','后藤'],['近藤','こんどう','近藤'],['村上','むらかみ','村上'],['远藤','えんどう','远藤'],['青木','あおき','青木'],['坂本','さかもと','坂本'],['福田','ふくだ','福田'],['太田','おおた','太田'],['西村','にしむら','西村'],['藤井','ふじい','藤井'],['冈本','おかもと','冈本'],['藤原','ふじわら','藤原'],['中野','なかの','中野'],['三浦','みうら','三浦'],['原田','はらだ','原田'],['松田','まつだ','松田'],['竹内','たけうち','竹内'],['中川','なかがわ','中川'],['上田','うえだ','上田'],['大野','おおの','大野'],['田村','たむら','田村'],['杉山','すぎやま','杉山'],['小野','おの','小野'],['樱井','さくらい','樱井'],['高木','たかぎ','高木'],['东野','ひがしの','东野'],['石田','いしだ','石田'],['宫崎','みやざき','宫崎'],['小泉','こいずみ','小泉'],['入江','いりえ','入江']];
var RT_JP_MING_M=[['健','けん','健'],['大辅','だいすけ','大辅'],['翔','しょう','翔'],['拓也','たくや','拓也'],['直树','なおき','直树'],['亮','りょう','亮'],['诚','まこと','诚'],['浩二','こうじ','浩二'],['隆','たかし','隆'],['修','おさむ','修'],['明','あきら','明'],['学','まなぶ','学'],['淳','じゅん','淳'],['悟','さとる','悟'],['彻','とおる','彻'],['博','ひろし','博'],['和也','かずや','和也'],['凉太','りょうた','凉太'],['悠斗','ゆうと','悠斗'],['阳介','ようすけ','阳介'],['雄一','ゆういち','雄一'],['正雄','まさお','正雄'],['智也','ともや','智也'],['秀树','ひでき','秀树'],['康平','こうへい','康平'],['亮介','りょうすけ','亮介'],['健太郎','けんたろう','健太郎'],['启介','けいすけ','启介'],['宗一郎','そういちろう','宗一郎'],['三郎','さぶろう','三郎']];
var RT_JP_MING_F=[['樱','さくら','樱'],['花子','はなこ','花子'],['阳子','ようこ','阳子'],['美咲','みさき','美咲'],['结衣','ゆい','结衣'],['爱','あい','爱'],['千夏','ちなつ','千夏'],['由美','ゆみ','由美'],['直美','なおみ','直美'],['香织','かおり','香织'],['真理','まり','真理'],['惠美','えみ','惠美'],['智子','ともこ','智子'],['幸子','さちこ','幸子'],['真理子','まりこ','真理子'],['美穗','みほ','美穗'],['优子','ゆうこ','优子'],['明日香','あすか','明日香'],['诗织','しおり','诗织'],['舞','まい','舞'],['遥','はるか','遥'],['玲奈','れな','玲奈'],['千鹤','ちづる','千鹤'],['凉子','りょうこ','凉子'],['静香','しずか','静香'],['绫','あや','绫'],['美和','みわ','美和'],['志乃','しの','志乃'],['佳奈','かな','佳奈'],['千代','ちよ','千代']];
/* 一个名字：{main:主显示, sub:翻译/读音, text:复制用的整串} */
function rtOneName(kind, sex){
  if(kind==='en'){
    var pool=(sex==='f')?RT_EN_FIRST_F:(sex==='m'?RT_EN_FIRST:RT_EN_FIRST.concat(RT_EN_FIRST_F));
    var g=rtPick(pool), s=rtPick(RT_EN_LAST);
    return {main:g[0]+' '+s[0], sub:g[1]+'·'+s[1], text:g[0]+' '+s[0]+'（'+g[1]+'·'+s[1]+'）'};
  }
  if(kind==='jp'){
    var x=rtPick(RT_JP_XING), m=rtPick(sex==='f'?RT_JP_MING_F:(sex==='m'?RT_JP_MING_M:RT_JP_MING_M.concat(RT_JP_MING_F)));
    return {main:x[2]+' '+m[2], sub:x[1]+' '+m[1], text:x[2]+' '+m[2]+'（'+x[1]+' '+m[1]+'）'};
  }
  var xing=rtPick(RT_CN_XING);
  var mings=(sex==='f')?RT_CN_MING_F:(sex==='m'?RT_CN_MING_M:RT_CN_MING_M.concat(RT_CN_MING_F,RT_CN_MING_N));
  var ming=rtPick(mings);
  return {main:xing+ming, sub:'', text:xing+ming};
}
function rtRollNames(){
  rtState.names=rtUniqueRoll(rtState.nameCount, function(){
    return rtOneName(rtState.nameKind, rtState.nameSex);
  }, function(v){ return v.text; });
  rtPaintNames();
}
function rtNamesHTML(){
  if(!rtState.names.length) return '<div class="hint">点「🎲 生成」来一份名字。</div>';
  return rtState.names.map(function(n){
    return '<span class="rt-name" title="点一下复制">'+esc(n.main)+(n.sub?'<em>'+esc(n.sub)+'</em>':'')+'</span>';
  }).join('');
}
function rtPaintNames(){
  var box=$('rtNames'); if(!box) return;
  box.innerHTML=rtNamesHTML();
  var spans=box.querySelectorAll('.rt-name');
  for(var i=0;i<spans.length;i++){
    (function(el,idx){
      el.onclick=function(){ rtCopy(rtState.names[idx].text,'名字'); };
    })(spans[i],i);
  }
}
function rtSetNameKind(k){ rtState.nameKind=k; rtRollNames(); xpRefresh(); }
function rtSetNameSex(s){ rtState.nameSex=s; rtRollNames(); xpRefresh(); }
function rtSetNameCount(n){ rtState.nameCount=n; rtRollNames(); xpRefresh(); }

/* ================= 随机 NPC ================= */
var RT_NPC_FIELDS=[['name','姓名'],['age','年龄'],['sex','性别'],['job','职业'],['trait','性格'],['look','外貌'],['dress','着装'],['habit','小习惯'],['family','家庭状况'],['hobby','爱好'],['fear','恐惧'],['secret','秘密'],['faith','信仰'],['catch','口头禅']];
var RT_JOBS=['记者','私家侦探','古董商','医生','护士','大学教授','大学生','刑警','巡警','律师','会计','银行职员','牧师','修女','小说家','画家','音乐家','演员','水手','船长','码头工人','矿工','农民','杂货店主','酒保','厨师','司机','邮差','图书管理员','博物馆研究员','考古学家','摄影师','钟表匠','裁缝','药剂师','殡仪业者','清洁工','门房','赌徒','走私贩','流浪汉','马戏团演员','驯兽师','飞行员','电报员','接线员','售货员','牙医','兽医','建筑师','工程师','化学家','生物学家','天文学家','报社编辑','小学教师','银行经理','消防员','推销员','工厂领班','女仆','管家','司机学徒','病理解剖助手'];
var RT_TRAITS=['谨慎','多疑','开朗','沉默','固执','善良','怯懦','贪婪','傲慢','乐观','悲观','急躁','温和','冷酷','热忱','散漫','有点洁癖','爱唠叨','慷慨','吝啬','勇敢','胆小','幽默','刻板','温柔','暴躁','天真','世故','神秘','忠诚','优柔寡断','我行我素','喜怒无常','彬彬有礼','愤世嫉俗','好奇心旺盛','沉默寡言','热心肠','神经质','满不在乎'];
var RT_LOOKS=['高瘦，肩膀有点塌','矮胖，走路时喘得厉害','中等身材但驼背','脸上有一道旧疤','戴着圆框眼镜','前额已经秃了','头发花白，梳得很整齐','留着浓密的胡须','肤色苍白，眼下发青','皮肤被晒得黝黑','指节粗大，掌心有老茧','左眼失明，覆着眼罩','眉骨突出，目光很沉','五官清秀但神情疲倦','目光锐利，看人时不太眨','嘴唇很薄，笑起来像条线','手上有洗不掉的墨渍','走路微跛','指甲修剪得异常干净','比实际年龄显老'];
var RT_DRESS=['褪色的粗花呢外套','浆过的白衬衫配旧领结','沾着油渍的工装','长风衣与窄檐帽','三件套西装，袖口磨破了','厚重的羊毛大衣','便宜但熨得很平的衣服','医生的白大褂','沾满颜料的围裙','军装式夹克，扣子换过','自家缝的粗布衣裳','胸前挂着银十字架','手上永远戴着半截手套','旧皮包，边角用线缠过','袖口别着一支钢笔'];
var RT_HABITS=['说话时摸耳垂','不停地看怀表','咬指甲','用指节敲桌面','习惯性清嗓子','抽烟斗，一次要划三根火柴','把袖口卷到肘部','无意识重复别人的话','随身带一小瓶酒','一定要坐在背对墙的位置','数数时会小声念出来','走路避开砖缝','用食指推眼镜','收集火柴盒','进门先抬头看天花板','写字前把纸对齐全桌子边'];
var RT_FAMILY=['未婚，与年迈的母亲同住','已婚，有三个孩子','丧偶，独居','离异，正和前妻争抚养权','家族在当地经营一间老铺子','和兄弟姊妹已经断绝往来','出身没落的望族，只剩一个空宅','被养父母带大','家中长子，要养活一大家人','独生子，父母双亡','妻子重病卧床','有个不成器的弟弟总来借钱','和妹妹相依为命','父亲在精神病院住了十年'];
var RT_HOBBY=['集邮','下棋','听留声机','钓鱼','养鸽子','读廉价的惊悚小说','拍照并自己冲洗','园艺','赌赛马','看拳击','拉小提琴','制作昆虫标本','看戏','爬山','木工','养猫','打牌','写日记','收集古董钟表','骑自行车','看无声电影'];
var RT_FEAR=['怕黑','怕水','怕血','怕高','怕密闭空间','怕教堂','怕老鼠','怕镜子','怕火','怕死人','怕被活埋','怕狗','怕打雷','怕密集的孔洞','怕别人碰自己','怕精神病院','怕空旷的地方'];
var RT_SECRET=['曾在战场上临阵脱逃','欠着一大笔赌债','偷过雇主的东西','在外面有个私生子','加入过某个不该去的教团','间接害死了自己的兄弟','用的是别人的身份','每天对着亡妻的遗物说话','在殖民地杀过人，没人知道','偷偷酗酒，藏了十几瓶','替帮派传过消息','写匿名信勒索过邻居','瞒着自己的传染病','把一只箱子埋在后院，从没打开过','见过不该见的东西，写在日记里又撕了'];
var RT_FAITH=['虔诚的国教徒','天主教徒','无神论者，只信科学','迷信各种预兆','信奉某个隐秘教派','泛神论者','信佛','信道','拜祖先','什么都信一点','表面虔诚，私下怀疑','信仰已经崩塌，只是不说'];
var RT_CATCH=['“见鬼。”','“老天爷。”','“我说，这事儿不对劲。”','“他妈的，我就知道。”','“别急，别急。”','“这不关我的事。”','“我看未必。”','“都是命。”','“你听我说。”','“啧，真糟糕。”','“我早说过了。”','“谢天谢地。”','“要命。”','“胡扯。”','“…该死的。”（低声）','“随它去吧。”','“见鬼去吧。”','“天杀的。”','“操，又来了。”'];
function rtNpcField(key){
  if(key==='name') return rtOneName('cn','any').main;
  if(key==='age') return String(rtInt(19,68));
  if(key==='sex') return rtPick(['男','女']);
  if(key==='job') return rtPick(RT_JOBS);
  if(key==='trait') return rtPick(RT_TRAITS);
  if(key==='look') return rtPick(RT_LOOKS);
  if(key==='dress') return rtPick(RT_DRESS);
  if(key==='habit') return rtPick(RT_HABITS);
  if(key==='family') return rtPick(RT_FAMILY);
  if(key==='hobby') return rtPick(RT_HOBBY);
  if(key==='fear') return rtPick(RT_FEAR);
  if(key==='secret') return rtPick(RT_SECRET);
  if(key==='faith') return rtPick(RT_FAITH);
  if(key==='catch') return rtPick(RT_CATCH);
  return '';
}
function rtRollNpc(){
  var o={};
  RT_NPC_FIELDS.forEach(function(f){ o[f[0]]=rtNpcField(f[0]); });
  rtState.npc=o;
  rtPaintNpc();
}
function rtRerollNpc(key){
  if(!rtState.npc) rtRollNpc();
  rtState.npc[key]=rtNpcField(key);
  rtPaintNpc();
}
function rtNpcHTML(){
  var n=rtState.npc;
  if(!n) return '<div class="hint">点「🎲 生成一个 NPC」。</div>';
  return RT_NPC_FIELDS.map(function(f){
    return '<div class="rt-row"><span class="rt-k">'+f[1]+'</span><span class="rt-v">'+esc(n[f[0]]||'')+'</span>'+
      '<button class="small ghost rt-re" title="只重掷这一项" onclick="rtRerollNpc(\''+f[0]+'\')">⟳</button></div>';
  }).join('');
}
function rtPaintNpc(){
  var box=$('rtNpc'); if(!box) return;
  box.innerHTML=rtNpcHTML();
}
function rtNpcText(){
  var n=rtState.npc; if(!n) return '';
  return RT_NPC_FIELDS.map(function(f){ return f[1]+'：'+(n[f[0]]||''); }).join('\n');
}

/* ================= 随机地点 ================= */
var RT_TOWN_A=['黑','冷','白','雾','鸦','铁','盐','老','灰','长','石','风','枯','青','铜','霜','暗','泥'];
var RT_TOWN_B=['溪','港','岭','镇','渡','堡','崖','湾','坡','桥','原','沼','口','窝','坳','滩'];
var RT_TOWN_NOTE=['渔村，全镇不到三百人','靠一座矿活着，矿井三年前塌过一次','铁路支线的终点，站台比镇子还新','每年秋天闹一次瘟疫','有一座没人去的教堂','镇上只有一家旅店，老板是个哑巴','地图上画错了位置，实际在河对岸','以产盐闻名，街面永远是白的','来此地的外乡人通常不会再待第二年','村口的树挂满了布条'];
var RT_STREET_A=['榆树','雾港','铁匠','教堂','磨坊','老橡树','铜炉','长堤','白鹿','盐仓','钟楼','玫瑰','黑猫','枯井','市集','码头','神学院','砖窑','喷泉','月桂','吊桥','红狮'];
var RT_STREET_B=['街','巷','道','路','弄','广场','胡同','坡','径'];
var RT_BUILD_A=['废弃的纺织厂','半塌的教堂','三层的红砖公寓','关了十年的剧院','潮湿的地下酒窖','私立疗养院','乡村邮局','旧消防站','当铺','公共图书馆','肉联厂','钟表铺','殡仪馆','马厩改建的车库','廉价旅馆','私人诊所','孤儿院','面粉厂','拍卖行','照相馆','律师楼','银行分行','药房','报社印刷间','火车站候车室','灯塔看守人的小屋','大学的解剖楼','植物园的温室'];
var RT_BUILD_B=['铁门锈住了，只推开一条缝','窗户全被钉死','里面还亮着一盏灯','地板上有一圈焦痕','墙上贴满了同一张寻人启事','空气里有股甜腥味','后门通向一条小巷','比外面看起来深得多','有人常年住在阁楼里','门口的牌子被人刮花了','地下室的台阶比登记的多两级','钥匙只有一把，在房东手里'];
var RT_ROOM=['二楼朝北的卧室','堆满箱子的储藏间','贴着旧报纸的书房','只有一张桌子的阁楼','摆满标本的地下室','挂着家族肖像的客厅','散发着霉味的客房','通向天井的厨房','锁了多年的阁楼小门','贴着瓷砖的盥洗室','摆着躺椅的诊室','挂满工具的工作间','摆着六张床的工人宿舍','窗帘永远拉着的起居室','祭坛被遮住的祈祷室','摆满空鸟笼的阳台'];
var RT_ROOM_B=['门把手是温的','有股淡淡的花香','窗户打不开','镜子上有雾气','地板上撒着盐','能看到对面楼的窗户','比相邻的房间冷','墙纸后面像是空的','只有一把椅子是干净的'];
var RT_SPOT=['老盐仓','雾港灯塔','铁桥下的旧仓库','榆树街 13 号','圣米迦勒教堂的钟楼','半山腰的疗养院','城南的乱葬岗','废船坞','马戏团的空帐篷','铁路旅馆 208 房','枯井底下','私人标本室','赌场后巷','关门的照相馆','河心的小岛','修道院的地窖','旧磨坊','市立博物馆的库房'];
var RT_SPOT_B=['地板上有一大片洗不掉的深色污渍','昨天夜里还有灯亮着','门口停着一辆没人认领的汽车','有人说听见里面有唱诗声','钥匙孔被塞了口香糖','墙上的日历停在三年前的某一天','气味让人想起医院','里面的人声称自己从没离开过','地上散落着同样的一页手稿','门口的脚印只有进去的，没有出来的','一切都被收拾得过于干净'];
function rtPlaceOne(kind){
  if(kind==='town') return {main:rtPick(RT_TOWN_A)+rtPick(RT_TOWN_B), sub:rtPick(RT_TOWN_NOTE)};
  if(kind==='street') return {main:rtPick(RT_STREET_A)+rtPick(RT_STREET_B), sub:rtPick(['一到夜里就没人走','两侧全是同一种门牌','路灯坏了一半','有一家通宵开着的小店','名字来自一棵早就砍掉的树','雨后积水没到脚踝'])};
  if(kind==='building') return {main:rtPick(RT_BUILD_A), sub:rtPick(RT_BUILD_B)};
  if(kind==='room') return {main:rtPick(RT_ROOM), sub:rtPick(RT_ROOM_B)};
  return {main:rtPick(RT_SPOT), sub:rtPick(RT_SPOT_B)};
}
function rtRollPlaces(){
  rtState.places=rtUniqueRoll(rtState.placeCount, function(){
    return rtPlaceOne(rtState.placeKind);
  }, function(v){ return v.main; });
  rtPaintPlaces();
}
function rtPlacesHTML(){
  if(!rtState.places.length) return '<div class="hint">点「🎲 生成」来几处地点。</div>';
  return rtState.places.map(function(p){
    return '<div class="rt-place" title="点一下复制"><b>'+esc(p.main)+'</b><span class="hint">'+esc(p.sub)+'</span></div>';
  }).join('');
}
function rtPaintPlaces(){
  var box=$('rtPlaces'); if(!box) return;
  box.innerHTML=rtPlacesHTML();
  var els=box.querySelectorAll('.rt-place');
  for(var i=0;i<els.length;i++){
    (function(el,idx){
      el.onclick=function(){ rtCopy(rtState.places[idx].main+'：'+rtState.places[idx].sub,'地点'); };
    })(els[i],i);
  }
}
function rtSetPlaceKind(k){ rtState.placeKind=k; rtRollPlaces(); xpRefresh(); }
function rtSetPlaceCount(n){ rtState.placeCount=n; rtRollPlaces(); xpRefresh(); }

/* ================= 复制 / 小控件 ================= */
function rtCopyFallback(text, done){
  try{
    var ta=document.createElement('textarea');
    ta.value=text;
    ta.style.position='fixed'; ta.style.left='-9999px'; ta.style.top='0';
    document.body.appendChild(ta);
    ta.select();
    var ok=document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    if(ok) done(); else toast('复制不了，手动选一下吧');
  }catch(e){ toast('复制不了，手动选一下吧'); }
}
function rtCopy(text, label){
  text=String(text||'');
  if(!text){ return; }
  var done=function(){ toast('已复制'+(label?label:'')); };
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done, function(){ rtCopyFallback(text, done); });
      return;
    }
  }catch(e){}
  rtCopyFallback(text, done);
}
function rtCopyNames(){
  var t=rtState.names.map(function(n){ return n.text; }).join('\n');
  rtCopy(t,'名字');
}
function rtCopyNpc(){ rtCopy(rtNpcText(),'NPC'); }
function rtCopyPlaces(){
  rtCopy(rtState.places.map(function(p){ return p.main+'：'+p.sub; }).join('\n'),'地点');
}
/* ================= 面板 ================= */
function rtPaneHTML(){
  var kindChips=[['cn','中文'],['en','英文'],['jp','日文']];
  var sexChips=[['any','不限'],['m','男'],['f','女']];
  var cntChips=[[1,'1 个'],[6,'6 个'],[12,'12 个'],[20,'20 个']];
  var placeKinds=[['spot','场所'],['town','城镇'],['street','街道'],['building','建筑'],['room','房间']];
  var pcnt=[[1,'1 个'],[5,'5 个'],[10,'10 个']];
  function paint(id,sel,items,fn){
    return '<span class="xp-chips" id="'+id+'">'+items.map(function(it){
      return '<button class="small xp-chip'+(it[0]===sel?' on':'')+'" data-v="'+esc(it[0])+'" onclick="'+fn+'(\''+esc(it[0])+'\')">'+esc(it[1])+'</button>';
    }).join('')+'</span>';
  }
  var nm=paint('rtNameKind',rtState.nameKind,kindChips,'rtSetNameKind')+
         paint('rtNameSex',rtState.nameSex,sexChips,'rtSetNameSex')+
         paint('rtNameCount',rtState.nameCount,cntChips,'rtSetNameCount');
  var pl=paint('rtPlaceKind',rtState.placeKind,placeKinds,'rtSetPlaceKind')+
         paint('rtPlaceCount',rtState.placeCount,pcnt,'rtSetPlaceCount');
  return '<div class="xp-box">'+
      '<div class="xp-line"><b>随机名字</b>'+nm+
        '<button class="small primary" onclick="rtRollNames()">🎲 生成</button>'+
        '<button class="small ghost" onclick="rtCopyNames()">📋 复制</button></div>'+
      '<div class="xp-out rt-names" id="rtNames">'+rtNamesHTML()+'</div>'+
    '</div>'+
    '<div class="xp-box">'+
      '<div class="xp-line"><b>随机 NPC</b><span class="hint">一项一项掷，不满意就点那一行的 ⟳</span>'+
        '<button class="small primary" onclick="rtRollNpc()">🎲 生成一个 NPC</button>'+
        '<button class="small ghost" onclick="rtCopyNpc()">📋 复制</button></div>'+
      '<div class="xp-out" id="rtNpc">'+rtNpcHTML()+'</div>'+
    '</div>'+
    '<div class="xp-box">'+
      '<div class="xp-line"><b>随机地点</b>'+pl+
        '<button class="small primary" onclick="rtRollPlaces()">🎲 生成</button>'+
        '<button class="small ghost" onclick="rtCopyPlaces()">📋 复制</button></div>'+
      '<div class="xp-out" id="rtPlaces">'+rtPlacesHTML()+'</div>'+
    '</div>';
}
