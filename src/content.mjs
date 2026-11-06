import {programPath,programTitle} from './program.mjs';
import {galleryRecords} from './world/gallery.mjs';
import {additionalTenants,tenantDetails} from './world/tenants.mjs';
import {tenantMaterials} from './world/tenant-materials.mjs';
import {expandNews} from './world/news.mjs';
import {extraAccounts} from './world/accounts.mjs';
import {researchRecords} from './world/records.mjs';
import {enrichPublicPeople,humanSearchEntries} from './world/people.mjs';
export const floorGuideCode='A4-09';

export const facility = {
  name: 'あすなろ産業支援交流施設',
  en: 'ASUNARO INDUSTRY & EXCHANGE',
  foundation: '一般財団法人あすなろ産業振興機構',
  opening: '2012年4月1日', established: '2010年6月15日',
};

export const tenants = [
  {page:'0001',id:'0011',name:'株式会社ハルニレ生活設計',room:'402',business:'生活道具・福祉用具の企画開発',established:'2006年6月15日',joined:'2012年4月1日',period:'2012–2018',status:'過去入居',person:'水野 志帆',description:'日常の小さな使いにくさを、道具と環境の工夫で解決します。利用者との対話を重ね、一人ひとりに合わせた生活道具を開発しています。',listed:true},
  {page:'0002',id:'0016',name:'ナギサ編集室',room:'404',business:'編集・グラフィックデザイン',established:'2010年3月8日',joined:'2012年4月1日',period:'2012–2017',status:'過去入居',person:'木島 千秋',description:'地域の営みや技術を、冊子や展示を通じて伝える編集室です。調査、取材、デザインまで一貫してお引き受けしています。',listed:true},
  {page:'0003',id:'0017',name:'合同会社ミナモ循環技研',room:'406',business:'小規模浄水・水循環設備の開発',established:'2008年5月19日',joined:'2012年4月1日',period:'2012–2019',status:'過去入居',person:'川瀬 修邦',description:'必要な場所で、必要な量の水を。小規模な水循環設備の開発と、地域施設への導入支援を行っています。退去後も外部連携会員として共同事業に参加しています。',listed:false},
  {page:'0004',id:'0018',name:'モクノワデザイン',room:'405',business:'木製品・空間のデザイン',established:'2011年8月2日',joined:'2012年4月1日',period:'2012–2020',status:'過去入居',person:'野々村 悠臣',description:'木の性質を生かした家具や小物、店舗什器を制作しています。試作の積み重ねから、長く使えるかたちを探しています。',listed:true},
  {page:'0005',id:'0023',name:'株式会社ソノラ標識研究所',room:'410',business:'音・光・触覚による案内設計',established:'2009年9月7日',joined:'2012年10月1日',period:'2012–2017',status:'過去入居',person:'稲見 和彦',description:'文字だけに頼らない、わかりやすい案内の研究をしています。音と立体形状、光の変化を組み合わせた公共空間のサイン計画をご提案します。',listed:false},
  {page:'0009',id:'0032',name:'株式会社ケイロ計測',room:'408',business:'環境・生体・行動計測',established:'2012年2月20日',joined:'2015年4月1日',period:'2015–',status:'入居中',person:'片岡 亮規',description:'環境と人の関係を、計測技術で可視化します。センサーの開発からデータ処理、継続的な運用まで対応しています。',listed:true},
  {page:'0010',id:'0038',name:'株式会社アシタ記録技研',room:'416',business:'技術記録・データ保全',established:'2016年12月4日',joined:'2017年4月1日',period:'2017–2022',status:'過去入居',person:'榎本 航策',description:'災害時にも失われない技術記録を。研究資料の整理、長期保存、事業承継時のデータ移管を支援しています。',listed:false},
  {page:'0012',id:'0045',name:'ライテック材料評価株式会社',room:'409',business:'材料評価・環境適応試験',established:'2016年7月12日',joined:'2018年4月1日',period:'2018–',status:'入居中',person:'新井 達弦',description:'材料の経時変化と環境適応性を評価しています。少量試作から継続試験まで、開発段階に応じた測定に対応します。',listed:true},
  {page:'0013',id:'0046',name:'株式会社オルディス認知工学',room:'412',business:'認知負荷・意思決定の評価',established:'2015年11月12日',joined:'2018年4月1日',period:'2018–',status:'入居中',person:'久世 圭',description:'共同で使う設備の操作盤や警報表示を評価しています。初めて使う方でも操作を覚えられるか、保護具を着けたまま異常に気づけるかを確かめ、表示や手順の設計へ反映します。',listed:false},
  {page:'0014',id:'0047',name:'センシア動態解析株式会社',room:'413',business:'動態計測・統計解析',established:'2017年1月23日',joined:'2018年6月1日',period:'2018–',status:'入居中',person:'鴨下 梓',description:'継続的な行動計測から、生活環境の改善を支援します。機器の設置、データの取得、解析まで一貫した体制を整えています。',listed:true},
  {page:'0017',id:'0054',name:'合同会社オルト居住運用設計',room:'414',business:'居住設備・区画運用の設計支援',established:'2020年8月1日',joined:'2021年4月1日',period:'2021–',status:'入居中',person:'深町 玲司',description:'宿泊設備や研修施設で、利用を続けながら設備を更新する計画を作ります。館内の動線、清掃や補給、工事中に使える設備を、運用の担当者と一緒に整理します。',listed:true},
  ...additionalTenants,
].map(tenant=>({...tenant,...tenantDetails[tenant.id]}))
 .sort((a,b)=>a.page.localeCompare(b.page));

export const gallery = galleryRecords;

export const news = expandNews([
 {id:'20261028',date:'2026.10.28',tag:'イベント',title:'11月のものづくり相談日について',body:'3Dプリンター・レーザーカッターを使った試作のご相談を承っております。初めてご利用になる方も、作りたいもののイメージや図面をお持ちください。11月の相談日は毎週水曜日、13時から17時までです。',link:'/workshop/',linkText:'工房のご利用について'},
 {id:'20261015',date:'2026.10.15',tag:'施設案内',title:'会議室の冬季利用受付について',body:'会議室の冬季利用受付を開始いたしました。少人数でのお打ち合わせから、セミナーや発表会まで、用途に合わせてご利用いただけます。',link:'/facilities/meeting/',linkText:'会議室のご案内'},
 {id:'20261001',date:'2026.10.01',tag:'会員案内',title:'月額会員と個室オフィスの新規受付について',body:'月額会員と個室オフィスは定員に達したため、新規のお申し込みを休止しております。'},
 {id:'20260918',date:'2026.09.18',tag:'活動報告',title:'小さな道具から考える、暮らしのものづくり',body:'利用者の皆様が製作された自助具や生活小物をご紹介しています。使う方の手に合わせた形状調整、少量の試作など、工房の設備をご活用いただいております。',link:'/gallery/',linkText:'工房制作物ギャラリー'},
 {id:'20211103',date:'2021.11.03',tag:'お知らせ',title:'前理事長 榊原惟臣の逝去について',body:'当施設の開設に尽力した前理事長・榊原惟臣が、2021年11月3日に逝去いたしました。生前賜りましたご厚情に深く感謝申し上げます。設立時から大切にしてまいりました理念を引き継ぎ、産業と地域の未来に貢献してまいります。'},
 {id:'20120903',date:'2012.09.03',tag:'活動報告',title:'開設記念の模型を展示いたしました',body:'アスナロ材で製作した木製ボートを交流スペースに展示いたしました。さまざまな形の部材が組み合わさり、一つの舟を支えています。開設時の4階配置図を併せて掲載いたします。',link:'/assets/asunaro-4f-2012.pdf',linkText:'4階配置図（2012年4月）',legacyAccess:true},
]);

export const accounts = {
 '201204010017':{password:'20080519',name:'合同会社ミナモ循環技研',role:'minamo',member:'0017'},
 '201804010046':{password:'20151112',name:'株式会社オルディス認知工学',role:'ordis',member:'0046'},
 '201204010000':{password:'20100615',name:'一般財団法人あすなろ産業振興機構',role:'institution',member:'0000'},
 '20120901P0083':{password:'19930618',name:'朝倉 紬乃',role:'asakura',member:'P0083'},
};

export const documents = researchRecords;

Object.assign(accounts,extraAccounts);

export const tenantMaterialEntries = tenants.flatMap(tenant =>
 (tenantMaterials[tenant.id] || []).map(material => {
  const article = material.articleId && news.find(n => n.id === material.articleId);
  const copy = article ? {
   title:article.title, date:article.date, desk:article.desk,
   paragraphs:[article.body,...(article.paragraphs || [])],
  } : {};
  return {...material,...copy,tenant,path:`/tenants/${tenant.page}/materials/${material.slug}/`};
 })
);

enrichPublicPeople({gallery,tenants});


export const searchEntries = [
 ...humanSearchEntries,
 {title:programTitle,url:programPath,text:'月面 宇宙 工房 道具 小物入れ 企画展示'},
 {title:'施設・サービス',url:'/facilities/',text:'会議室 オフィス コワーキング 食堂 プレゼンテーションホール フロアマップ'},
 {title:'施設職員紹介',url:'/facilities/staff/',text:'中央受付 工房スタッフ 施設職員 見学 製作相談'},
 {title:'工房のご案内',url:'/workshop/',text:'3Dプリンター レーザーカッター 試作 ものづくり'},
 {title:'料金のご案内',url:'/price/',text:'利用料金 月額 会議室 工房'},
 {title:'月額会員・入会のご案内',url:'/membership/',text:'入会 会員 新規受付'},
 {title:'4階フロアマップ',url:'/floor-map/',text:`${floorGuideCode} フロアマップ 案内図 中央受付 会議室 ラウンジ`,summary:`4階案内図 ${floorGuideCode}。中央受付や会議室、ラウンジへの行き方をご確認いただけます。`},
 {title:'入居者紹介',url:'/tenants/',text:'入居企業 過去入居 企業紹介 活動報告'},
 ...tenants.filter(t=>t.listed).map(t=>({
  title:t.name,url:`/tenants/${t.page}/`,text:[`${t.room}号室`,t.business,t.description,...t.activities.flatMap(({title,body})=>[title,body])].join(' '),
  summary:`${t.room}号室 ／ ${t.status}（${t.period}）　${t.business}`,
 })),
 ...news.filter(n=>n.listed||n.searchable).map(n=>({
  title:n.title,url:`/news/${n.id}/`,published:n.date.replaceAll('.','-'),summary:n.body,
  text:n.restored?(n.keywords??''):[n.body,...(n.sections||[]).flat(),...(n.facts||[]).flat()].join(' '),
 })),
 ...gallery.filter(g=>g.listed).map(g=>({title:g.title,url:`/gallery/${g.id}/`,text:g.body+' '+g.tag})),
 {title:'朝倉 紬乃｜制作と活動の記録',url:'/people/asakura-tsumugi/',text:'朝倉 紬乃 あさくら つむぎの 制作 プロフィール'},
 {title:'稲葉 澪｜利用者インタビュー',url:'/people/inaba-mio/',text:'稲葉 澪 いなば みお 案内 図解 制作者 触ってわかる案内図 立体模型'},
];
