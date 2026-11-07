// Fictional historical measurements. Individual worth is not a measurement field.
const routingSlips={
 adjustment:{use:'表示と入力盤の調整',routing:'機器調整係へ。本人控え交付済。'},
 residential:{use:'居住実証・受付時測定',routing:'居住受付から評価統括へ回付。'},
};
export const subjectMeasurements=[
 {id:'P-026',slip:'adjustment',name:'稲葉 澪里',date:'2016.10.04',cardHits:2,counts:{deviation:3,emergence:2,precursor:3,early:2,hidden:2,desync:2},note:'案内図の線の間隔を、測定盤でも確かめた。',profile:'/people/inaba-mio/',current:'継続観察／B-04',source:'OPS-2026-084',protected:true},
 {id:'P-031',slip:'residential',name:'青井 真澄',date:'2022.08.19',cardHits:3,counts:{deviation:4,emergence:2,precursor:2,early:1,hidden:1,desync:2},note:'画面の前に、工具の修理へ戻る予定を記入。',profile:'/people/aoi-makoto/',current:'条件調整／B-06',source:'OPS-2026-084',protected:true},
 {id:'P-032',slip:'residential',name:'安積 透',date:'2022.08.19',cardHits:4,counts:{deviation:2,emergence:1,precursor:1,early:0,hidden:0,desync:2},note:'妹へ持っていくスタンドの形を、呼称欄の余白に描いた。',profile:'/people/azumi-toru/',current:'現所在の資料未受領',source:'EV-2022-091'},
 {id:'P-033',slip:'residential',name:'吉野 夏帆',date:'2022.08.19',cardHits:4,counts:{deviation:1,emergence:2,precursor:2,early:1,hidden:1,desync:3},note:'終わったら本を返すので、名前の札を残してほしいと申出。',profile:'/people/yoshino-kaho/',current:'記録終了／2022.09.11',source:'EV-2022-091'},
 {id:'P-034',slip:'residential',name:'瀬尾 灯',date:'2022.08.19',cardHits:1,counts:{deviation:3,emergence:2,precursor:2,early:2,hidden:2,desync:2},note:'表示を見ながら、母が読むなら文字を大きくしたいと記入。',profile:'/people/seo-akari/',current:'測定継続／B-07',source:'OPS-2026-084',protected:true},
];
export function subjectViews({contact=false,truth=false,ending=''}={}){
 const current=contact||truth||!!ending;
 return subjectMeasurements.map(({counts,slip,protected:protectedPerson,current:status,source,...person})=>({...person,...routingSlips[slip],found:counts.deviation+counts.emergence+counts.precursor+counts.hidden+counts.desync,senses:{awareness:Math.round((counts.deviation+counts.emergence)/7*100),foresight:Math.round(counts.early/4*100),insight:counts.hidden*50,intuition:person.cardHits*20,resonance:Math.round(counts.desync/3*100)},...(current?{current:ending==='end3'&&protectedPerson?'本人保護・記録照合中':status,source,sourceLabel:ending==='end3'&&protectedPerson?'保護前の所在原本':'参照原本',currentAsOf:ending==='end3'?'2026.11.06':'2026.10.26'}:{})}));
}
