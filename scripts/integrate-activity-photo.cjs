const fs=require('node:fs/promises'),path=require('node:path');
const sharp=require(process.env.ASUNARO_NODE_MODULES?path.join(process.env.ASUNARO_NODE_MODULES,'sharp'):'sharp');
const root=path.join(__dirname,'..');
function solve(matrix,values){
 const rows=matrix.map((r,i)=>[...r,values[i]]);
 for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;[rows[i],rows[pivot]]=[rows[pivot],rows[i]];const divisor=rows[i][i];if(Math.abs(divisor)<1e-10)throw new Error('Invalid paper plane');for(let k=i;k<9;k++)rows[i][k]/=divisor;for(let j=0;j<8;j++)if(j!==i){const factor=rows[j][i];for(let k=i;k<9;k++)rows[j][k]-=factor*rows[i][k];}}
 return rows.map(r=>r[8]);
}
function mapping(from,to){const matrix=[],values=[];for(let i=0;i<4;i++){const [x,y]=from[i],[u,v]=to[i];matrix.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);values.push(u,v);}return solve(matrix,values);}
async function inkRow(file,rectangle){
 const {data,info}=await sharp(file).extract(rectangle).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const light=.299*data[i]+.587*data[i+1]+.114*data[i+2];data[i]=55;data[i+1]=61;data[i+2]=69;data[i+3]=Math.round(185*Math.max(0,Math.min(1,(175-light)/100)));}
 const regular=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).trim().resize({height:110}).png().toBuffer();
 const geometry=await sharp(regular).metadata();
 return sharp(regular).resize(geometry.width,40,{fit:'fill'}).png().toBuffer();
}
(async()=>{
 const settings=JSON.parse(await fs.readFile(path.join(root,'docs/photo-integration.json'),'utf8'));
 const source=name=>path.resolve(root,settings.sources[name]);
 const first=await inkRow(source('handwriting'),{left:185,top:450,width:760,height:135});
 const second=await inkRow(source('handwriting'),{left:195,top:780,width:540,height:120});
 const owner=await sharp({create:{width:1100,height:480,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:first,left:70,top:95},{input:second,left:70,top:210}]).png().toBuffer();
 const {data:glyphs}=await sharp(owner).raw().toBuffer({resolveWithObject:true});
 const scale=2,blankMeta=await sharp(source('blank')).metadata(),width=blankMeta.width*scale,height=blankMeta.height*scale;
 const corners=settings.paperCornersUserOrder.map(([x,y])=>[x*scale,y*scale]);
 const transform=mapping(corners,[[0,0],[1100,0],[1100,480],[0,480]]),layer=Buffer.alloc(width*height*4);
 const minX=Math.floor(Math.min(...corners.map(p=>p[0]))),maxX=Math.ceil(Math.max(...corners.map(p=>p[0]))),minY=Math.floor(Math.min(...corners.map(p=>p[1]))),maxY=Math.ceil(Math.max(...corners.map(p=>p[1])));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const denominator=transform[6]*x+transform[7]*y+1,u=(transform[0]*x+transform[1]*y+transform[2])/denominator,v=(transform[3]*x+transform[4]*y+transform[5])/denominator;
  if(u<0||u>=1099||v<0||v>=479)continue;
  const ix=Math.floor(u),iy=Math.floor(v),dx=u-ix,dy=v-iy,alpha=(glyphs[(iy*1100+ix)*4+3]*(1-dx)+glyphs[(iy*1100+ix+1)*4+3]*dx)*(1-dy)+(glyphs[((iy+1)*1100+ix)*4+3]*(1-dx)+glyphs[((iy+1)*1100+ix+1)*4+3]*dx)*dy;
  const offset=(y*width+x)*4;layer[offset]=55;layer[offset+1]=61;layer[offset+2]=69;layer[offset+3]=Math.round(alpha);
 }
 const ink=await sharp(layer,{raw:{width,height,channels:4}}).blur(.3).png().toBuffer();
 const largeBlank=await sharp(source('blank')).resize(width,height).png().toBuffer();
 const largeCrop=await sharp(largeBlank).composite([{input:ink}]).png().toBuffer();
 const crop=await sharp(largeCrop).resize(1536,1102,{fit:'fill'}).png().toBuffer();
 const fullWidth=6144,fullHeight=4096,factor=fullWidth/1536,detailScale=1536/460;
 const area={left:785,top:805,width:425,height:225},patchWidth=Math.round(area.width/detailScale*factor),patchHeight=Math.round(area.height/detailScale*factor);
 const raw=await sharp(crop).extract(area).resize(patchWidth,patchHeight).ensureAlpha().raw().toBuffer();
 for(let y=0;y<patchHeight;y++)for(let x=0;x<patchWidth;x++){let alpha=Math.min(1,Math.min(x,y,patchWidth-1-x,patchHeight-1-y)/18);alpha=alpha*alpha*(3-2*alpha);raw[(y*patchWidth+x)*4+3]=Math.round(alpha*255);}
 const patch=await sharp(raw,{raw:{width:patchWidth,height:patchHeight,channels:4}}).png().toBuffer();
 const master=path.join(root,settings.master),left=Math.round((940+area.left/detailScale)*factor),top=Math.round((275+area.top/detailScale)*factor);
 await sharp(source('base')).resize(fullWidth,fullHeight).composite([{input:patch,left,top}]).png().toFile(master);
 const compressed=await sharp(master).jpeg({quality:90,chromaSubsampling:'4:4:4'}).toBuffer();await sharp(compressed).webp({quality:93}).toFile(path.join(root,settings.web_asset));
 await sharp(master).resize({width:1536}).png().toFile(path.join(root,'docs/previews/activity-photo.png'));
 await sharp(path.join(root,settings.web_asset)).extract({left:4580,top:2050,width:800,height:400}).png().toFile(path.join(root,'docs/previews/credential-detail.png'));
 console.log('Integrated one photograph; writing follows the laptop user plane.');
})().catch(error=>{console.error(error);process.exit(1)});
