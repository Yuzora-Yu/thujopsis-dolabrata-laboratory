import {readFile} from 'node:fs/promises';
import {createHash,createCipheriv,randomBytes} from 'node:crypto';
import {researchRecords} from './world/records.mjs';
import {subjectViews} from './world/lab-data.mjs';
import {zipCrc32} from './evidence.mjs';

const healthComparisonName='HC-2021-031-R.pdf';
export const healthComparisonFile='record-media/'+healthComparisonName;
const preservedRecordIds=[
 // Founding conditions and the later health-management records.
 'OR-2006-004','RG-2007-011','FUM-2010-002','CO-2010-001','BR-2012-001',
 'RM-2020-019','NET-2021-004','CH-2021-003','HC-2021-031','HC-2021-031-R','AH-2021-006',
 // Recruitment, implementation, rescue requests and results.
 'RE-2016-002','CONS-2016-005','YH-2018-041-A','FAB-2020-026','RE-2022-006','YH-2022-017',
 'ENV-2022-031','AP-2022-028','OBS-2022-044','PN-2022-034','EV-2022-091','GR-2022-009','QC-2026-015',
 // The people affected and the planned transfer.
 'FAB-2022-071','YH-2022-034','FAM-2022-009','SA-2023-012','AS-2023-008',
 'OPS-2026-084','P034-2026-102','FAB-2026-018','AS-2024-002','AS-2026-014','AS-2026-019','AS-2026-021','TR-2026-011','EA-2026-009',
];

export function originalRecords(){
 const fields=['id','title','date','updated','owner','kindLabel','sections','tables','entries','addenda','signoff','quote','signatureClips'];
 const byId=new Map(researchRecords.map(record=>[record.id,record]));
 return preservedRecordIds.map(id=>{
  const record=byId.get(id);
  if(!record)throw new Error('Missing preserved record: '+id);
  return Object.fromEntries(fields.filter(key=>record[key]!==undefined).map(key=>[key,record[key]]));
 });
}

export function zipFiles(files){
 const local=[],central=[];let offset=0;
 for(const {name,data:input} of files){
  const data=Buffer.isBuffer(input)?input:Buffer.from(input);const file=Buffer.from(name,'utf8');const crc=zipCrc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(0,8);h.writeUInt16LE(0x5d62,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(file.length,26);
  local.push(h,file,data);
  const d=Buffer.alloc(46);d.writeUInt32LE(0x02014b50,0);d.writeUInt16LE(20,4);d.writeUInt16LE(20,6);d.writeUInt16LE(0x800,8);d.writeUInt16LE(0x5d62,14);d.writeUInt32LE(crc,16);d.writeUInt32LE(data.length,20);d.writeUInt32LE(data.length,24);d.writeUInt16LE(file.length,28);d.writeUInt32LE(offset,42);central.push(d,file);offset+=h.length+file.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);
}

function encrypted(data,label){
 const key=createHash('sha256').update('ASUNARO/AS-2024-002/'+label).digest();const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const bytes=Buffer.concat([cipher.update(Buffer.from(data)),cipher.final()]);return Buffer.concat([Buffer.from('ASNR01'),iv,cipher.getAuthTag(),bytes]);
}

export async function makeArchive(root,{complete=false}={}){
 const sources=['expose.pdf','records.json','continuity.json'];
 if(complete)sources.push(healthComparisonFile);
 const [pdf,records,continuity,healthComparison]=await Promise.all(sources.map(f=>readFile(new URL('../private/'+f,root))));
 return buildEvidenceArchive({pdf,records,continuity,healthComparison},{complete});
}

export function buildEvidenceArchive({pdf,records,continuity,healthComparison},{complete=false}={}){
 const measurementSheets=subjectViews({contact:true});
 const documents=originalRecords();
 if(complete){
  const {receiver}=JSON.parse(Buffer.from(continuity).toString('utf8'));
  const transferRecord=documents.find(record=>record.id==='TR-2026-011');
  const [draft]=transferRecord.tables;
  const transferNote=[
   transferRecord.id,
   '受領先：'+receiver,
   draft.caption,
   ...draft.rows.slice(1).map(([field,value])=>field+'：'+(value||'未記入')),
   '原型継承資料を含む移管計画。原型から前理事長晩年の反対意見を除外。',
   '外部調査照会 EA-2026-009 は返信保留。',
   '',
   '文書原本.json　健康管理、居住実証、退出支援および受渡しに関する文書の複写',
   '実験記録.json　個票、交付簿および処理記録の照合結果',
   healthComparisonName+'　健康管理表と決裁書の署名欄を照合した控え',
   '適性測定原票.json　過去の単回測定原票5件。外部照会者の呼称と測定結果は含まない。',
  ].join('\n');
  return zipFiles([
   {name:'告発書.pdf',data:pdf},
   {name:'実験記録.json',data:records},
   {name:'継承計画.json',data:continuity},
   {name:'文書原本.json',data:JSON.stringify({exported:'2026-11-02',documents},null,2)},
   {name:healthComparisonName,data:healthComparison},
   {name:'適性測定原票.json',data:JSON.stringify({exported:'2026-11-02',protocol:'AP-2022-028',sheets:measurementSheets},null,2)},
   {name:'資料移送記録.txt',data:transferNote},
  ]);
 }
 const protectedRecords=JSON.stringify({summary:JSON.parse(Buffer.from(records).toString('utf8')),documents,measurementSheets});
 return zipFiles([{name:'告発書.pdf',data:pdf},{name:'実験記録.enc',data:encrypted(protectedRecords,'records')},{name:'継承資料.enc',data:encrypted(continuity,'continuity')}]);
}
