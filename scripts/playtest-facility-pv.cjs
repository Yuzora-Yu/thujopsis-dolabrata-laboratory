const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=(process.env.BASE_URL||'http://127.0.0.1:4877/thujopsis-dolabrata-laboratory').replace(/\/$/,'');
const out=path.resolve('.work/qa/pv-delivery',process.env.PV_QA_LABEL||'pages');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const checks=[];
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:1000}});
   try{
    const page=await context.newPage(),requests=[],errors=[];
    page.on('request',r=>{if(r.url().endsWith('.mp4'))requests.push(r.url());});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/news/');
    await page.getByRole('link',{name:/施設紹介映像「ともに、明日をつくる。」を公開/}).click();
    const video=page.locator('video');
    await video.waitFor();
    const before=await video.evaluate(v=>({paused:v.paused,preload:v.preload,poster:v.poster,source:v.querySelector('source').src,overflow:document.documentElement.scrollWidth>innerWidth}));
    assert.equal(before.paused,true);assert.equal(before.preload,'none');assert.equal(requests.length,0);assert.equal(before.overflow,false);
    assert.equal((await page.request.get(before.poster)).status(),200);
    assert.ok(before.poster.startsWith(base+'/assets/'));
    const partial=await page.request.get(before.source,{headers:{Range:'bytes=0-63'}});
    assert.equal(partial.status(),206);assert.equal(partial.headers()['content-type'],'video/mp4');assert.equal((await partial.body()).length,64);
    await video.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,width+'-article.png')});
    // Muted playback is deliberate. This test cannot evaluate the sound by listening.
    await video.evaluate(v=>new Promise((resolve,reject)=>{
     v.addEventListener('loadedmetadata',resolve,{once:true});
     v.addEventListener('error',()=>reject(new Error('Video metadata failed')),{once:true});
     v.muted=true;v.playbackRate=1;v.load();
    }));
    const playback=await video.evaluate(async v=>{
     let waiting=0;const onWaiting=()=>waiting++;
     v.addEventListener('waiting',onWaiting);
     const began=performance.now();
     const done=new Promise((resolve,reject)=>{v.addEventListener('ended',resolve,{once:true});v.addEventListener('error',()=>reject(new Error('Video playback failed')),{once:true});setTimeout(()=>reject(new Error('Video did not end within 50 seconds')),50000);});
     await v.play();await done;v.removeEventListener('waiting',onWaiting);
     const q=v.getVideoPlaybackQuality();
     return {duration:v.duration,elapsed:(performance.now()-began)/1000,waiting,currentTime:v.currentTime,ended:v.ended,rate:v.playbackRate,width:v.videoWidth,height:v.videoHeight,totalFrames:q.totalVideoFrames,droppedFrames:q.droppedVideoFrames};
    });
    assert.equal(playback.ended,true);assert.equal(playback.rate,1);assert.ok(playback.elapsed>29&&playback.elapsed<40);assert.equal(playback.width,1280);assert.equal(playback.height,720);
    for(const second of [2.4,7.3,12.6,19.65,24.3,24.95,25.7,28.8]){
     await video.evaluate((v,time)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time;}),second);
     await video.screenshot({path:path.join(out,width+'-cue-'+second+'.png')});
    }
    assert.deepEqual(errors,[]);
    checks.push({width,before,playback,errors,partialStatus:partial.status()});
   }finally{await context.close();}
  }
  await fs.writeFile(path.join(out,'playback.json'),JSON.stringify({base,checks},null,2));
  console.log(JSON.stringify({base,checks},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
