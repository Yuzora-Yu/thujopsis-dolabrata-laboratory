// Offline author preview. The video is not an asset of the public website.
const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.work','qa','pv');
const source={moon:'media/lunar-habitat-concept.webp',exterior:'exterior.webp',shop:'workshop.webp',room:'media/f-presentation.webp',logo:'logo.png'};

(async()=>{
 await fs.mkdir(out,{recursive:true});
 const data=Object.fromEntries(await Promise.all(Object.entries(source).map(async([key,file])=>{
  const format=path.extname(file).slice(1);
  return [key,'data:image/'+format+';base64,'+(await fs.readFile(path.join(root,'public','assets',file))).toString('base64')];
 })));
 const {programBody}=await import('../src/program.mjs');
 const diagram=programBody().match(/<svg class="lunar-system-diagram"[\s\S]+?<\/svg>/)?.[0];
 if(!diagram)throw new Error('A72 exhibit diagram is missing');
 for(const [mode,colors] of Object.entries({
  normal:['#d9e8ad','#a9bf96','#465c52'],
  isolated:['#566b60','#768c71','#d9e8ad'],
 })){
  const svg=diagram.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="860" height="220" ')
   .replace(/class="lunar-feed-(?:external|core|backup)"/g,()=>`stroke="${colors.shift()}"`);
  data[mode]='data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64');
 }
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.setContent('<body style="margin:0;background:#101616"><canvas width="1280" height="720"></canvas></body>');
  const result=await page.evaluate(async data=>{
   const W=1280,H=720,canvas=document.querySelector('canvas'),g=canvas.getContext('2d',{alpha:false});
   const images=Object.fromEntries(await Promise.all(Object.entries(data).map(async([key,url])=>{const img=new Image();img.src=url;await img.decode();return [key,img];})));
   const type=['video/mp4;codecs=avc1.42001f','video/webm;codecs=vp9','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
   if(!type)throw new Error('No local video encoder available');
   function text(value,x,y,size,{color='#f4f5ee',weight=600}={}){
    g.font=weight+' '+size+'px "Yu Gothic",Meiryo,sans-serif';g.fillStyle=color;g.textBaseline='alphabetic';g.fillText(value,x,y);
   }
   function cover(key,t=0,x=.5,y=.5){
    const img=images[key],scale=Math.max(W/img.width,H/img.height)*(1+Math.min(t,5)*.005);
    g.drawImage(img,(W-img.width*scale)*x,(H-img.height*scale)*y,img.width*scale,img.height*scale);
   }
   function shade(direction='bottom'){
    const grad=direction==='left'?g.createLinearGradient(0,0,W*.72,0):g.createLinearGradient(0,H,0,H*.46);
    grad.addColorStop(0,'rgba(12,20,21,.94)');grad.addColorStop(1,'rgba(12,20,21,0)');g.fillStyle=grad;g.fillRect(0,0,W,H);
   }
   function lower(label,title){
    shade();text(label,72,565,18,{color:'#dbe5b8'});text(title,72,631,44);
   }
   function status(t){
    g.fillStyle='#152927';g.fillRect(0,0,W,H);
    g.strokeStyle='#536f62';g.lineWidth=1;g.strokeRect(78,82,1124,552);
    text('A72  /  地上統合実証',120,146,23,{color:'#c8dac5'});
    text(t<24.55?'系統復旧':'引き継ぎ確認',120,258,54);
    g.beginPath();g.moveTo(120,301);g.lineTo(1154,301);g.stroke();
    text('水循環',120,376,29);text('記録の控え',120,455,29);
    text('予備系統',456,376,29,{color:'#dce8be'});text('保存済',456,455,29,{color:'#dce8be'});
    g.strokeRect(830,335,324,184);text('受付確認',856,392,23,{color:'#bdd0bf'});
    if(t<24.55||t>=25.32)text(t<24.55?'照会中':'確認済',856,465,34);
    text('設備を、次の人へ。',120,584,20,{color:'#c8dac5'});
   }
   function frame(t){
    if(t<5){
     cover('moon',t,.63,.5);shade('left');text('ASUNARO / LUNAR HABITAT PROGRAM',72,226,19,{color:'#dbe5b8'});
     text('月に、暮らしを',72,324,64);text('持っていく。',72,407,64);
     text('月面居住区 構想図',1032,667,20,{color:'#e5e5da'});
    }else if(t<9){
     cover('exterior',t-5,.5,.6);lower('ASUNARO','あすなろ産業支援交流施設');
    }else if(t<14){
     const isolated=t>=11.25;
     g.fillStyle='#172d2a';g.fillRect(0,0,W,H);text('A72 / 地上統合実証',72,102,22,{color:'#dbe5b8'});
     text(isolated?'補給停止':'通常',72,182,43);
     g.drawImage(images[isolated?'isolated':'normal'],72,230,1136,1136*220/860);
     text(isolated?'予備系統で循環を継続':'通常の循環経路',72,570,24,{color:'#dbe5b8'});
     text('水を回す。',72,650,44);
    }else if(t<18){
     cover('shop',t-14,.64,.64);lower('4F / 工房2','必要なものは、そこで作る。');
    }else if(t<23){
     cover('room',t-18,.5,.5);lower('4F / 公開展示','記録を残し、次の人へ。');
    }else if(t<27){
     status(t);
    }else{
     cover('moon',0,.76,.5);shade('left');shade();
     g.fillStyle='#f4f5eb';g.fillRect(72,229,64,64);g.drawImage(images.logo,78,235,52,52);
     text('あすなろ産業支援交流施設',155,272,29);text('月面居住技術プログラム',72,364,42);
     text('地上統合実証 A72',72,421,25,{color:'#dbe5b8'});
     text('この映像は作品内の架空の施設を紹介するものです。',72,657,17);
    }
   }
   const samples=[2.4,7.2,11.6,15.6,20.5,25,28.8].map(t=>{frame(t);return {t,jpeg:canvas.toDataURL('image/jpeg',.91).split(',')[1]};});
   frame(0);
   const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000}),parts=[];
   const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};recorder.onerror=e=>reject(e.error);recorder.onstop=resolve;});
   recorder.start(1000);
   const start=performance.now();
   await new Promise(resolve=>{function tick(now){const t=(now-start)/1000;frame(Math.max(0,Math.min(29.999,t)));if(t>=30)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   recorder.stop();await done;stream.getTracks().forEach(track=>track.stop());
   const blob=new Blob(parts,{type}),encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(blob);});
   return {type,encoded,samples};
  },data);
  const ext=result.type.includes('mp4')?'mp4':'webm',target=path.join(out,'asunaro-facility-pv.'+ext);
  await fs.writeFile(target,Buffer.from(result.encoded,'base64'));
  for(const [i,frame]of result.samples.entries())await fs.writeFile(path.join(out,'shot-'+(i+1)+'.jpg'),Buffer.from(frame.jpeg,'base64'));
  console.log(target);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
