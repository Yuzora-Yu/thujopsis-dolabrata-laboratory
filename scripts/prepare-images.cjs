const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require(process.env.ASUNARO_NODE_MODULES?path.join(process.env.ASUNARO_NODE_MODULES,'sharp'):'sharp');
(async()=>{
const root=path.join(__dirname,'..');
const sources=JSON.parse((await fs.readFile(path.join(root,'docs/generated-assets.json'),'utf8')).replace(/^\uFEFF/,''));
const out=path.join(root,'public/assets');await fs.mkdir(out,{recursive:true});
for(const [name,source] of Object.entries(sources)){
 const dest=name;
 const input=path.resolve(root,source);
 if(name==='minamo-desk'){
  const photograph=await sharp(input).jpeg({quality:90,chromaSubsampling:'4:4:4'}).toBuffer();
  await sharp(photograph).webp({quality:93}).toFile(path.join(out,dest+'.webp'));
 }else if(name==='logo')await sharp(input).trim().resize(220,220,{fit:'inside'}).png().toFile(path.join(out,'logo.png'));
 else await sharp(input).resize({width:1800,withoutEnlargement:true}).webp({quality:86}).toFile(path.join(out,dest+'.webp'));
}
console.log('Prepared',Object.keys(sources).length,'web assets');
})().catch(e=>{console.error(e);process.exit(1)});
