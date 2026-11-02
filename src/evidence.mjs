export function classifyEvidence(bytes){
 try{
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  if(data.length<100||data.length>25*1024*1024||view.getUint32(0,true)!==0x04034b50)return null;
  let end=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)return null;const count=view.getUint16(end+10,true);let offset=view.getUint32(end+16,true);const names=new Set();
  if(count>100||offset>=end)return null;
  for(let i=0;i<count;i++){
   if(offset+46>end||view.getUint32(offset,true)!==0x02014b50)return null;
   const size=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true);
   if(offset+46+size+extra+comment>end)return null;
   names.add(new TextDecoder().decode(data.subarray(offset+46,offset+46+size)));offset+=46+size+extra+comment;
  }
  if(!names.has('告発書.pdf'))return null;
  if(names.has('実験記録.json')&&names.has('継承計画.json')&&names.has('資料移送記録.txt'))return 'complete';
  if(names.has('実験記録.enc')&&names.has('継承資料.enc'))return 'base';
  return null;
 }catch{return null;}
}
