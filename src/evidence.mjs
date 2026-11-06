const decoder=new TextDecoder('utf-8',{fatal:true});

export function zipCrc32(data){
 let crc=0xffffffff;
 for(const byte of data){
  crc^=byte;
  for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}

function readEvidenceEntries(data){
 if(data.length<100||data.length>25*1024*1024)return null;
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
 const short=offset=>view.getUint16(offset,true),word=offset=>view.getUint32(offset,true);
 let end=data.length-22;
 const earliest=Math.max(0,end-0xffff);
 while(end>=earliest&&(word(end)!==0x06054b50||end+22+short(end+20)!==data.length))end--;
 if(end<earliest)return null;
 const count=short(end+10),directory=word(end+16);
 if(short(end+4)||short(end+6)||short(end+8)!==count||!count||count>100||directory+word(end+12)!==end)return null;

 // Issued copies use stored entries in the same order in both headers.
 const entries=new Map();
 let central=directory,local=0;
 for(let index=0;index<count;index++){
  if(central+46>end||word(central)!==0x02014b50||local+30>directory||word(local)!==0x04034b50)return null;
  const nameSize=short(central+28),size=word(central+20),flags=short(central+8),checksum=word(central+16);
  const centralNext=central+46+nameSize+short(central+30)+short(central+32);
  const start=local+30+nameSize+short(local+28),finish=start+size;
  if(centralNext>end||finish>directory||word(central+42)!==local||short(central+34)!==0)return null;
  if(!nameSize||short(local+26)!==nameSize||!size||word(central+24)!==size||word(local+18)!==size||word(local+22)!==size)return null;
  if((flags&~0x800)||short(local+6)!==flags||short(central+10)||short(local+8)||word(local+14)!==checksum)return null;
  const name=decoder.decode(data.subarray(central+46,central+46+nameSize));
  const localName=decoder.decode(data.subarray(local+30,local+30+nameSize));
  const content=data.subarray(start,finish);
  if(localName!==name||entries.has(name)||zipCrc32(content)!==checksum)return null;
  entries.set(name,content);
  central=centralNext;
  local=finish;
 }
 return central===end&&local===directory?entries:null;
}

function startsWithAscii(data,header){
 return !!data&&data.length>=header.length&&Array.from(header).every((letter,index)=>data[index]===letter.charCodeAt(0));
}

export function classifyEvidence(bytes){
 try{
  const entries=readEvidenceEntries(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes));
  if(!entries||!startsWithAscii(entries.get('告発書.pdf'),'%PDF-'))return null;
  const encrypted=['実験記録.enc','継承資料.enc'].every(name=>{
   const entry=entries.get(name);
   return entry?.length>34&&startsWithAscii(entry,'ASNR01');
  });
  if(encrypted)return 'base';

  const records=JSON.parse(decoder.decode(entries.get('実験記録.json')));
  const continuity=JSON.parse(decoder.decode(entries.get('継承計画.json')));
  const [transferId,recipient]=decoder.decode(entries.get('資料移送記録.txt')).split(/\r?\n/,2);
  if(!records?.subjects?.length||!continuity?.handover?.length||!continuity.receiver)return null;
  if(!/^TR-\d{4}-\d{3}$/.test(transferId)||recipient!==`受領先：${continuity.receiver}`)return null;
  // Older exports had a transfer summary but omitted the source documents.
  if(!entries.has('文書原本.json'))return 'base';
  const originals=JSON.parse(decoder.decode(entries.get('文書原本.json'))).documents;
  if(!Array.isArray(originals)||!originals.some(record=>record?.id===transferId&&record.entries?.length))return null;
  const incident=records.closed_group?.victim?.record;
  if(incident&&!originals.some(record=>record?.id===incident&&record.tables?.length))return null;
  return 'complete';
 }catch{return null;}
}
// A protected person cannot be put back into the former operator's custody by
// submitting the same archive again. Independent evidence can extend a closure.
export function nextEnding(current,target){
 if(current==='end2'||current==='end3')return current;
 if(current==='end1'&&target!=='end3')return current;
 return target;
}

export function agencyReceipt(kind,state){
 if(kind==='hozen')return state?.ending==='end1'?'received':'';
 if(state?.ending==='end3')return 'received';
 if(!state?.auditPending)return '';
 return state.ending==='end2'?'transferred':'pending';
}

export const inquiryClosed=ending=>ending==='end2'||ending==='end3';
export const hasOfficeReceipt=state=>state.officeReceipt||state.ending==='end2';
