const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require(process.env.ASUNARO_NODE_MODULES?path.join(process.env.ASUNARO_NODE_MODULES,'sharp'):'sharp');
(async()=>{
 const root=path.join(__dirname,'..');
 const manifest=JSON.parse(await fs.readFile(path.join(root,'docs/media-assets.json'),'utf8'));
 const out=path.join(root,'public/assets/media');await fs.mkdir(out,{recursive:true});
 for(const item of manifest){
  const width=item.publicationWidth||(item.year<=2013?900:item.year<=2016?1100:item.year<=2019?1280:1600);
  const quality=item.jpegQuality||(item.year<=2013?72:item.year<=2016?78:item.year<=2019?84:90);
  // Era-specific web publication size and compression, on top of generated camera characteristics.
  const image=await sharp(path.resolve(root,item.path)).resize({width,withoutEnlargement:true}).jpeg({quality,chromaSubsampling:'4:2:0'}).toBuffer();
  await sharp(image).webp({quality:88}).toFile(path.join(out,item.key+'.webp'));
 }
 console.log(`Prepared ${manifest.length} individual photographs.`);
})().catch(e=>{console.error(e);process.exit(1)});
