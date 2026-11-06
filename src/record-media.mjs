import {researchRecords} from './world/records.mjs';

// A PDF is a second presentation of the same canonical record. Access follows
// that record, not the URL, filename, or the player's progress counter.
const editions=[
 ['YH-2013-014','spec'],['FLOW-2013-007','bench'],['AH-2017-009','transfer'],
 ['YH-2018-041','evaluation'],['YH-2018-041-A','individual',true],['RM-2020-019','minutes'],
 ['MX-2019-410','ledger',true],['PUB-2023-014','maintenance'],
 ['OR-2006-004','memo',true],['RG-2007-011','letter',true],['AH-2021-006','ledger'],['HC-2021-031-R','ledger',true],
 ['ENV-2022-031','transfer'],['AP-2022-028','evaluation'],['OPS-2026-084','operations'],
 ['AS-2023-008','memo'],['PN-2022-034','workshop-receipt',true],
];
export const recordMedia=editions.flatMap(([id,style,scan])=>[
 {id,style,filename:id+'.pdf',type:'application/pdf',label:style==='ledger'?'保存複写（PDF）':'配布資料（PDF）'},
 ...(scan?[{id,style,filename:id+'-scan.jpg',type:'image/jpeg',label:'保存複写（画像）'}]:[]),
]);
const byFilename=new Map(recordMedia.map(item=>[item.filename,item]));
export const recordMediaPrefix='/members/download/records/';
export const mediaForRecord=id=>recordMedia.filter(item=>item.id===id);
export function mayReadRecordMedia(filename,role){
 const file=byFilename.get(filename);
 return file&&researchRecords.some(d=>d.id===file.id&&d.roles.includes(role))?file:null;
}
