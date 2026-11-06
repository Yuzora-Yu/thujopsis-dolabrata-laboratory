// Eight marginal notes and a misplaced copy from reception.
export const seedNotes = {
 '/':{
  number:1,
  label:'窓辺の観察', mark:'sun', title:'太陽の光が届くまで',
  body:'窓辺に差す光は、太陽を出てからおよそ8分20秒かけて地球に着きます。',
  source:'https://science.nasa.gov/mission/voyager/voyager-1/what-is-a-light-day/',
  related:['/about/','あすなろについて'],
 },
 '/about/':{
  number:2,
  label:'名前の小話', mark:'sea', title:'月の「海」',
  body:'月の模様の暗い部分は、海と呼ばれています。大昔に流れ出た溶岩が固まり、広い平原になったところです。',
  source:'https://spaceplace.nasa.gov/all-about-the-moon/en/',
 },
 '/facilities/':{
  number:3,
  label:'一日の長さ', mark:'orbit', title:'一日に何度も来る朝',
  body:'国際宇宙ステーションは一日に地球を約16周します。地上で一日が過ぎる間に、船内からは何度も日の出が見えます。',
  source:'https://science.nasa.gov/biological-physical/the-challenges-of-growing-plants-in-space/',
  related:['/facilities/coworking/','コワーキング・ラウンジ'],
 },
 '/workshop/':{
  number:4,
  label:'道具の小話', mark:'tool', title:'地上から届いた工具',
  body:'国際宇宙ステーションで工具が必要になり、地上から設計データを送りました。乗組員は船内の3Dプリンターで、その工具を作りました。',
  source:'https://science.nasa.gov/3d-resources/wrench-2/',
  related:['/gallery/','工房制作物ギャラリー'],
 },
 '/gallery/':{
  number:5,
  label:'落ち方を比べる', mark:'feather', title:'羽根と金づち',
  body:'アポロ15号の宇宙飛行士が月で羽根と金づちを同時に落とすと、ほぼ同時に地面に着きました。羽根の落ち方をゆっくりにする空気が、ほとんどないためです。',
  source:'https://science.nasa.gov/resource/the-apollo-15-hammer-feather-drop/',
 },
 '/news/':{
  number:6,
  label:'昔の記録から', mark:'track', title:'帰ったあとも残る足跡',
  body:'月には足跡を消すような風や雨がほとんどありません。人が歩いてから何十年もたった場所で、探査機はそのときの足取りを写しています。',
  source:'https://spaceplace.nasa.gov/craters/en/',
  related:['/news/20120401/','あすなろの開設のお知らせ'],
 },
 '/price/':{
  number:7,
  label:'水の使い方', mark:'drop', title:'水をもう一度使う',
  body:'国際宇宙ステーションでは、空気に混じった水分も集めます。集めた水は処理して、船内でまた使えるようにしています。',
  source:'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/',
 },
 '/membership/':{
  number:8,
  label:'通信の小話', mark:'signal', title:'返事が来ない区間',
  body:'宇宙船が月の向こう側を通ると、月そのものが電波を遮り、地球との直接の交信が途切れます。中継を使わない場合は、また地球の見える側に出るまで待ちます。',
  source:'https://www.nasa.gov/missions/artemis/networks-keeping-nasas-artemis-ii-mission-connected/',
 },
 '/visit/':{
  number:9, label:'案内票の版番号', mark:'receipt', stamp:'見学案内 第4版', title:'会員証の返却控え',
  body:'会員証：受領済\n返却先：本人\n退館時刻：＿＿＿＿\n\n見学者名簿は閉じました。\n呼出表示はまだ消さないでください。',
  beginsDrift:true,
 },
};
export const seedNoteTotal=Object.keys(seedNotes).length;
export const seedCollectionPath='/visit/reception-copy/';

export function seedNoteData(path) {
 const note = seedNotes[path];
 return note ? JSON.stringify(note).replaceAll('<','\\u003c') : '';
}
