import {researchRecords} from './world/records.mjs';

// A PDF is a second presentation of the same canonical record. Access follows
// that record, not the URL, filename, or the player's progress counter.
const editions=[
 ['YH-2013-014','spec'],['FLOW-2013-007','bench'],['AH-2017-009','transfer'],
 ['YH-2018-041','evaluation'],['YH-2018-041-A','individual',true],['RM-2020-019','minutes'],
 ['MX-2019-410','ledger',true],['FAB-2020-026','shop-change'],['PUB-2023-014','maintenance'],
 ['OR-2006-004','memo',true],['RG-2007-011','letter',true],['AH-2021-006','ledger'],['HC-2021-031-R','ledger',true],
 ['CONS-2016-005','consent'],['OBS-2022-044','daily-check',true],
 ['ENV-2022-031','transfer'],['EV-2022-091','watch-log'],['GR-2022-009','group-review'],['YH-2022-017','decision'],['AP-2022-028','evaluation'],['OPS-2026-084','operations'],
 ['AS-2023-008','memo'],['FAB-2022-071','workshop-receipt'],['PN-2022-034','workshop-receipt',true],
];
const printLabels={
 ledger:'保存複写（PDF）',
 'workshop-receipt':'保存複写（PDF）',
 consent:'参加同意書の交付控え（PDF）',
 decision:'決裁控え（PDF）',
 'daily-check':'本人控えと別管理欄（PDF）',
 'watch-log':'当直連絡の複写（PDF）',
 'shop-change':'工房の製作票と追記（PDF）',
 'group-review':'評価総括の提出控え（PDF）',
};
export const recordMedia=editions.flatMap(([id,style,scan])=>[
 {id,style,filename:id+'.pdf',type:'application/pdf',label:printLabels[style]||'配布資料（PDF）'},
 ...(scan?[{id,style,filename:id+'-scan.jpg',type:'image/jpeg',label:style==='daily-check'?'本人控えの複写（画像）':'保存複写（画像）'}]:[]),
]);
const byFilename=new Map(recordMedia.map(item=>[item.filename,item]));
export const recordMediaPrefix='/members/download/records/';
export const mediaForRecord=id=>recordMedia.filter(item=>item.id===id);
export function mayReadRecordMedia(filename,role){
 const file=byFilename.get(filename);
 return file&&researchRecords.some(d=>d.id===file.id&&d.roles.includes(role))?file:null;
}
