const moonFacts='https://spaceplace.nasa.gov/all-about-the-moon/en/';
const lunarWeather='https://science.nasa.gov/moon/weather-on-the-moon/';
const plantResearch='https://science.nasa.gov/biological-physical/the-challenges-of-growing-plants-in-space/';
const travellingLight='https://science.nasa.gov/mission/voyager/voyager-1/what-is-a-light-day/';

const notes={
 sea:['月の「海」','月の模様の暗い部分は、海と呼ばれています。大昔に流れ出した溶岩が固まり、広い平原になったところです。',moonFacts],
 phase:['月が形を変えて見えるわけ','月の形はいつも同じです。太陽に照らされた半分のうち、地球から見える範囲が変わると、三日月や満月に見えます。',moonFacts],
 sunlight:['太陽の光が届くまで','朝の光は、太陽を出てからおよそ8分20秒で地球に着きます。窓辺に差す光も、そのぶん前に太陽を出た光です。',travellingLight],
 horizon:['月で見える地平線','同じ目の高さで平らな場所に立つと、月の地平線は地球より近くに見えます。月のほうが小さく、地面が手前で丸く曲がるためです。','https://science.nasa.gov/solar-system/moon/phenomena-nasa-astronauts-will-encounter-at-moons-south-pole/'],
 wrench:['地上から届いた工具','国際宇宙ステーションで工具が必要になり、地上から設計データを送りました。乗組員は船内の3Dプリンターで、その工具を作りました。','https://science.nasa.gov/3d-resources/wrench-2/'],
 feather:['羽根と金づち','アポロ15号の宇宙飛行士が月で羽根と金づちを同時に落とすと、ほぼ同時に地面に着きました。羽根の落ち方をゆっくりにする空気が、ほとんどないためです。','https://science.nasa.gov/resource/the-apollo-15-hammer-feather-drop/'],
 garden:['宇宙で育つ野菜','国際宇宙ステーションでは、光や水を管理しながら植物を育てています。地上と同じように、育てる種類ごとに合う条件を探します。',plantResearch],
 water:['水をもう一度使う','国際宇宙ステーションでは、空気に混じった水分も集めます。集めた水は処理して、船内でまた使えるようにしています。','https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/'],
 sunrises:['一日に何度も来る朝','国際宇宙ステーションは一日に地球を約16周します。地上で一日が過ぎる間に、船内からは何度も日の出が見えます。',plantResearch],
 moonlight:['1.3秒前の月','月から地球まで、光が届くのに約1.3秒かかります。夜空に見える月の姿も、少しだけ前のものです。','https://science.nasa.gov/mission/webb/science-overview/science-explainers/how-does-webb-see-back-in-time/'],
 tracks:['帰ったあとも残る足跡','月には足跡を消すような風や雨がほとんどありません。人が歩いてから何十年もたった場所で、探査機はそのときの足取りを写しています。','https://spaceplace.nasa.gov/craters/en/'],
 relay:['返事が来ない区間','宇宙船が月の向こう側を通ると、月そのものが電波を遮り、地球との直接の交信が途切れます。中継を使わない場合は、また地球の見える側に出るまで待ちます。','https://www.nasa.gov/missions/artemis/networks-keeping-nasas-artemis-ii-mission-connected/'],
 shadow:['朝が来ない場所','月の極にある深いクレーターには、太陽の光が届かない場所があります。周りに朝が来ても、底は暗いままです。',lunarWeather],
 waiting:['返事が届くまで','地球と火星が遠く離れていると、電波は片道で約22分かかります。すぐに返事を送ったとしても、こちらで聞けるのは約44分後です。',travellingLight],
};
const related={
 wrench:['/workshop/','工房のご案内'],
 feather:['/gallery/','工房制作物ギャラリー'],
 garden:['/facilities/cafe/','食堂・カフェのご案内'],
 sunrises:['/facilities/coworking/','オープンラウンジのご案内'],
 horizon:['/floor-map/','4階フロアマップ'],
};

export function seedNoteData(path,number){
 const rotation=['sea','phase','sunlight','horizon','wrench','feather','garden','water','sunrises','moonlight'];
 const varied=rotation.slice(number%rotation.length).concat(rotation.slice(0,number%rotation.length));
 const local=path.startsWith('/gallery/')||path==='/workshop/'?'wrench':path==='/facilities/cafe/'?'garden':path.startsWith('/tenants/')?'sunrises':varied[0];
 const ordinary=[local,...varied.filter(key=>key!==local).slice(0,3)];
 const quiet=['tracks','relay','shadow','waiting'][number%4];
 const selected=[...ordinary,quiet].map(key=>{
  const nearby=related[key];
  return nearby&&nearby[0]!==path?[...notes[key],nearby]:notes[key];
 });
 return JSON.stringify(selected).replaceAll('<','\\u003c');
}
