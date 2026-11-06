import {readFile} from 'node:fs/promises';
import {createHash,createCipheriv,randomBytes} from 'node:crypto';
import {researchRecords} from './world/records.mjs';
import {subjectViews} from './world/lab-data.mjs';

export function originalRecords(){
 const fields=['id','title','date','updated','owner','kindLabel','sections','tables','entries','addenda','signoff','quote'];
 return researchRecords.map(record=>Object.fromEntries(fields.filter(key=>record[key]!==undefined).map(key=>[key,record[key]])));
}

function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export function zipFiles(files){
 const local=[],central=[];let offset=0;
 for(const {name,data:input} of files){
  const data=Buffer.isBuffer(input)?input:Buffer.from(input);const file=Buffer.from(name,'utf8');const crc=crc32(data);
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
 const [pdf,records,continuity]=await Promise.all(['expose.pdf','records.json','continuity.json'].map(f=>readFile(new URL('../private/'+f,root))));
 return buildEvidenceArchive({pdf,records,continuity},{complete});
}

export function buildEvidenceArchive({pdf,records,continuity},{complete=false}={}){
 const measurementSheets=subjectViews({contact:true});
 const originals=JSON.stringify({exported:'2026-11-02',documents:originalRecords()},null,2);
 if(complete)return zipFiles([{name:'告発書.pdf',data:pdf},{name:'実験記録.json',data:records},{name:'継承計画.json',data:continuity},{name:'文書原本.json',data:originals},{name:'適性測定原票.json',data:JSON.stringify({exported:'2026-11-02',protocol:'AP-2022-028',sheets:measurementSheets},null,2)},{name:'資料移送記録.txt',data:'TR-2026-011\n受領先：災害技術記録保全センター 榎本航策\n原型継承資料を含む移管計画。原型から前理事長晩年の反対意見を除外。\n外部調査照会 EA-2026-009 は返信保留。\n文書原本.json：登録資料の原文・時刻別記録・追記の複写。実験記録.json：原本照合の要約。\n適性測定原票.json：過去の単回測定原票5件。外部照会者の呼称と測定結果は含まない。'}]);
 const protectedRecords=JSON.stringify({summary:JSON.parse(Buffer.from(records).toString('utf8')),documents:originalRecords(),measurementSheets});
 return zipFiles([{name:'告発書.pdf',data:pdf},{name:'実験記録.enc',data:encrypted(protectedRecords,'records')},{name:'継承資料.enc',data:encrypted(continuity,'continuity')}]);
}
