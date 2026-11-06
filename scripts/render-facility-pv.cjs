// Offline author preview. The video is not an asset of the public website.
const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.work','qa','pv');
const source={
 east:'media/f-home-east.webp',
 exterior:'exterior.webp',
 shop:'workshop.webp',
 atlas:'media/p-yoshino-atlas.webp',
 exhibit:'media/g-metal-lattice.webp',
 moon:'media/lunar-habitat-concept.webp',
 reception:'media/f-central-reception.webp',
 logo:'logo.png',
};

(async()=>{
 await fs.mkdir(out,{recursive:true});
 const data=Object.fromEntries(await Promise.all(Object.entries(source).map(async([key,file])=>{
  const format=path.extname(file).slice(1);
  return [key,'data:image/'+format+';base64,'+(await fs.readFile(path.join(root,'public','assets',file))).toString('base64')];
 })));
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.setContent('<body style="margin:0;background:#101616"><canvas width="1280" height="720"></canvas></body>');
  const result=await page.evaluate(async data=>{
   const W=1280,H=720,canvas=document.querySelector('canvas'),g=canvas.getContext('2d',{alpha:false});
   const duration=30,cueStart=24.55,cueEnd=25.32;
   const cuts={exterior:4.6,shop:8.2,atlas:11.5,exhibit:14.5,moon:17,reception:19.5,board:23,end:27};
   const images=Object.fromEntries(await Promise.all(Object.entries(data).map(async([key,url])=>{const img=new Image();img.src=url;await img.decode();return [key,img];})));
   const type=['video/mp4;codecs=avc1.42001f,mp4a.40.2','video/webm;codecs=vp9,opus'].find(x=>MediaRecorder.isTypeSupported(x));
   if(!type)throw new Error('No local video encoder available');
   const container=type.split(';')[0];
   function windowGain(time,start,end,fade){
    return Math.max(0,Math.min(1,(time-start)/fade,(end-time)/fade));
   }
   function soundtrack(context){
    const sampleRate=context.sampleRate;
    const buffer=context.createBuffer(1,duration*sampleRate,sampleRate);
    const samples=buffer.getChannelData(0);
    const tau=2*Math.PI;
    let random=2711,fastAir=0,slowAir=0;
    for(let i=0;i<samples.length;i++){
     const time=i/sampleRate;
     random=(Math.imul(random,1664525)+1013904223)>>>0;
     const noise=random/2147483648-1;
     fastAir+=.12*(noise-fastAir);
     slowAir+=.014*(noise-slowAir);
     const air=fastAir-slowAir;
     const vent=.041*Math.sin(tau*118*time+.05*Math.sin(tau*.17*time))
       +.023*Math.sin(tau*237*time)+.011*Math.sin(tau*359*time);
     const outside=windowGain(time,cuts.exterior,cuts.shop,.36);
     const atmosphere=(1-outside)*(.09*air+vent)+outside*.17*air;
     const tone=(windowGain(time,.4,4.75,1.15)+windowGain(time,cuts.exhibit,cuts.reception-.4,.7)+windowGain(time,27.1,29.85,.85))
       *(.018*Math.sin(tau*261.63*time)+.011*Math.sin(tau*392*time));
     const handover=1-.72*windowGain(time,cueStart,cueEnd,.075);
     samples[i]=(atmosphere+tone)*handover*windowGain(time,0,duration,.42);
    }
    return buffer;
   }
   function text(value,x,y,size,{color='#f4f5ee',weight=600}={}){
    g.font=weight+' '+size+'px "Yu Gothic",Meiryo,sans-serif';g.fillStyle=color;g.textBaseline='alphabetic';g.fillText(value,x,y);
   }
   function cover(key,t=0,x=.5,y=.5){
    const img=images[key],scale=Math.max(W/img.width,H/img.height)*(1+Math.min(t,5)*.005);
    g.drawImage(img,(W-img.width*scale)*x,(H-img.height*scale)*y,img.width*scale,img.height*scale);
   }
   function shade(){
    const grad=g.createLinearGradient(0,H,0,H*.46);
    grad.addColorStop(0,'rgba(12,20,21,.94)');grad.addColorStop(1,'rgba(12,20,21,0)');g.fillStyle=grad;g.fillRect(0,0,W,H);
   }
   function lower(label,title){
    shade();text(label,72,558,30,{color:'#dbe5b8'});text(title,72,631,44);
   }
   function opening(t){
    cover('east',t,.55,.52);
    const grad=g.createLinearGradient(0,0,W*.72,0);
    grad.addColorStop(0,'#1b140fe8');grad.addColorStop(1,'#1b140f00');g.fillStyle=grad;g.fillRect(0,0,W,H);
    text('あすなろ産業支援交流施設',72,227,29,{color:'#f0e9d6'});
    text('ともに、',72,325,56);
    text('明日をつくる。',72,402,56);
    text('ものづくりと交流の拠点、あすなろ。',72,493,29,{color:'#f0e9d6'});
    g.fillStyle='#211711c9';g.fillRect(1004,619,222,47);
    text('4階 食堂・カフェ',1018,652,26,{color:'#f0e9d6'});
   }
   function visitorBoard(t){
    const ink='#263c34',muted='#4c6658';
    g.fillStyle='#f3f3ea';g.fillRect(0,0,W,H);
    g.fillStyle='#dce4d0';g.fillRect(846,76,340,458);
    g.drawImage(images.logo,92,83,48,48);
    text('あすなろ産業支援交流施設',158,116,25,{color:ink});
    text('見学のご案内',92,252,62,{color:ink});
    g.strokeStyle='#98aa98';g.lineWidth=1;
    g.beginPath();g.moveTo(92,286);g.lineTo(790,286);g.stroke();
    text('受付場所',94,374,26,{color:muted});
    text('4階 中央受付',284,374,36,{color:ink});
    text('受付時間',94,447,26,{color:muted});
    text('平日 9:00–17:00',284,447,36,{color:ink});
    text('ラウンジと共用エリアをご案内します。',94,531,25,{color:ink});
    text('4F',914,331,125,{color:'#3a5949'});
    text('中央受付',925,403,31,{color:ink});
    g.beginPath();g.moveTo(92,585);g.lineTo(1186,585);g.stroke();
    text('見学案内 第4版',94,627,22,{color:muted});
    text('2026年10月改訂',780,627,22,{color:muted});
    text(t>=cueStart&&t<cueEnd?'17:14 呼出継続':'17:06 差替',1015,627,22,{color:muted});
   }
   function frame(t){
    if(t<cuts.exterior){
     opening(t);
    }else if(t<cuts.shop){
     cover('exterior',t-cuts.exterior,.5,.6);
     lower('あすなろ産業支援交流施設','企業とつくり手が集う場所。');
    }else if(t<cuts.atlas){
     cover('shop',t-cuts.shop,.64,.64);
     lower('4F / 工房2','道具を、つくってみる。');
    }else if(t<cuts.exhibit){
     cover('atlas',t-cuts.atlas,.5,.53);
     lower('工房の製本相談','使い続けるために、直す。');
    }else if(t<cuts.moon){
     cover('exhibit',t-cuts.exhibit,.5,.46);
     lower('4階の企画展示','金属3Dプリンターの試験片');
    }else if(t<cuts.reception){
     cover('moon',t-cuts.moon,.68,.5);
     lower('企画展示 ／ 月面居住区の構想図','月に、暮らしを持っていく。');
    }else if(t<cuts.board){
     cover('reception',t-cuts.reception,.5,.64);
     lower('4F / 中央受付','見学は、中央受付へ。');
    }else if(t<cuts.end){
     visitorBoard(t);
    }else{
     g.fillStyle='#edf1e4';g.fillRect(0,0,W,H);
     g.drawImage(images.logo,100,227,104,104);
     text('あすなろ産業支援交流施設',228,296,49,{color:'#21382f'});
     text('ともに、明日をつくる。',229,362,29,{color:'#4f6858'});
     text('この映像は、架空の施設を紹介する作品です。',100,650,29,{color:'#354e40'});
     text('© YU-ZORA',1015,650,22,{color:'#4f6858'});
    }
   }
   const samples=[2.4,6.4,9.8,12.9,15.7,18.2,21.2,24.3,24.95,25.7,28.8].map(t=>{frame(t);return {t,jpeg:canvas.toDataURL('image/jpeg',.91).split(',')[1]};});
   frame(0);
   const audio=new AudioContext({sampleRate:48000});
   const audioCapture=audio.createMediaStreamDestination();
   const audioSource=audio.createBufferSource();
   audioSource.buffer=soundtrack(audio);
   audioSource.connect(audioCapture);
   await audio.resume();
   const stream=canvas.captureStream(30);
   for(const track of audioCapture.stream.getAudioTracks())stream.addTrack(track);
   const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000,audioBitsPerSecond:128000}),parts=[];
   const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};recorder.onerror=e=>reject(e.error);recorder.onstop=resolve;});
   recorder.start(1000);
   const start=audio.currentTime+.025;
   audioSource.start(start);
   await new Promise(resolve=>{
    function tick(){
     const elapsed=audio.currentTime-start;
     frame(Math.max(0,Math.min(duration-.001,elapsed)));
     if(elapsed>=duration)resolve();else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
   });
   recorder.stop();await done;stream.getTracks().forEach(track=>track.stop());
   await audio.close();
   // A codec list contains a comma; only the container belongs in this data URL.
   const blob=new Blob(parts,{type:container});
   const encoded=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=()=>resolve(String(reader.result).slice(String(reader.result).indexOf(',')+1));
    reader.readAsDataURL(blob);
   });
   return {container,encoded,samples};
  },data);
  const ext=result.container==='video/mp4'?'mp4':'webm';
  const target=path.join(out,'asunaro-facility-pv.'+ext);
  const movie=Buffer.from(result.encoded,'base64');
  const header=ext==='mp4'?movie.subarray(4,8).toString()==='ftyp':movie.subarray(0,4).toString('hex')==='1a45dfa3';
  if(movie.length<50000||!header)throw new Error('Invalid recording: '+movie.length+' bytes');
  await fs.writeFile(target,movie);
  for(const [i,frame]of result.samples.entries())await fs.writeFile(path.join(out,'shot-'+(i+1)+'.jpg'),Buffer.from(frame.jpeg,'base64'));
  console.log(target);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
