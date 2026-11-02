const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require(process.env.ASUNARO_NODE_MODULES?path.join(process.env.ASUNARO_NODE_MODULES,'sharp'):'sharp');
(async()=>{
const root=path.join(__dirname,'..');
const sources=JSON.parse((await fs.readFile(path.join(root,'docs/generated-assets.json'),'utf8')).replace(/^\uFEFF/,''));
const out=path.join(root,'public/assets');await fs.mkdir(out,{recursive:true});
for(const [name,source] of Object.entries(sources)){
 const dest=name;
 if(name==='minamo-desk'||name==='credential-note')continue;
 if(name==='logo')await sharp(source).trim().resize(220,220,{fit:'inside'}).png().toFile(path.join(out,'logo.png'));
 else await sharp(source).resize({width:name==='minamo-desk'?2400:1800,withoutEnlargement:true}).webp({quality:name==='minamo-desk'?94:86}).toFile(path.join(out,dest+'.webp'));
}
// Preserve the actual AI-generated handwriting at its native resolution inside
// the photo viewer. Both visual layers are generated raster assets; no text
// credentials are emitted into the document or its accessibility labels.
if(sources['credential-note']){
 const base=await sharp(sources['minamo-desk']).webp({quality:94}).toBuffer();
 const note=await sharp(sources['credential-note']).trim().png().toBuffer();
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><title>ミナモ循環技研 2012年4月の事務机</title><image width="1536" height="1024" href="data:image/webp;base64,${base.toString('base64')}"/><g transform="matrix(0.086 0.0088 -0.0195 0.0273 1200 535)"><g transform="translate(0 1024) rotate(-90)"><image width="1024" height="1024" href="data:image/png;base64,${note.toString('base64')}"/></g></g></svg>`;
 await fs.writeFile(path.join(out,'minamo-desk.svg'),svg);
}
console.log('Prepared',Object.keys(sources).length-1,'web assets');
})().catch(e=>{console.error(e);process.exit(1)});
