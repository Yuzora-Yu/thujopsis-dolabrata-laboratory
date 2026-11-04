const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const assert=require('node:assert/strict');
async function exerciseConsole(p,{url,mode='worker',prefix='.work/qa/console-'+mode}={}){
 const endpoint=url+'api/';
 const read=()=>p.evaluate(async endpoint=>window.asunaroLabBridge?window.asunaroLabBridge('context'):fetch(endpoint).then(r=>r.json()),endpoint);
 await p.goto(url+'subjects/');
 await p.locator('#lab-handle').fill('観測者 <灯>');await p.getByRole('button',{name:'呼称を登録',exact:true}).click();
 await p.getByText('原票の交付',{exact:true}).waitFor();assert.equal(await p.getByText('瀬尾 灯',{exact:true}).count(),0);
 await p.getByRole('link',{name:'測定端末へ',exact:true}).click();
 for(let i=0;i<5;i++){
  await p.getByRole('button',{name:'カード '+(i%5+1),exact:true}).click();await p.getByRole('button',{name:i===4?'粒子観測へ':'次の試行へ',exact:true}).click();
  if(i===1){await p.reload();await p.getByRole('button',{name:'カード 3',exact:true}).waitFor();}
 }
 const cards=(await read()).trial.cards;assert.equal(cards.length,5);
 await p.getByText('呼称の訂正',{exact:true}).click();await p.locator('#lab-rename').fill('星をみる灯');await p.getByRole('button',{name:'訂正して保存',exact:true}).click();assert.deepEqual((await read()).trial.cards,cards);
 await p.getByRole('button',{name:'粒子観測を開始',exact:true}).click();await p.locator('canvas').waitFor();await p.getByRole('button',{name:'観測を中断',exact:true}).click();assert.deepEqual((await read()).trial.cards,cards);
 await p.reload();await p.getByRole('button',{name:'粒子観測を開始',exact:true}).click();await p.locator('canvas').waitFor();
 // Exercise the exact displayed coordinates against the shared deterministic model.
 await p.waitForTimeout(2200);
 const target=await p.evaluate(async endpoint=>{
  const c=window.asunaroLabBridge?await window.asunaroLabBridge('context'):await fetch(endpoint).then(r=>r.json());
  const path=document.querySelector('meta[name="asunaro-base"]')?.content||'';
  const {particleScene,particlePosition}=await import(path+'/lab-core.js');const run=c.trial.particleAttempt,scene=particleScene(run.seed),event=scene.events[0],ms=Date.now()-run.startedAt,position=particlePosition(scene.particles[event.particleId],ms,event);
  const canvas=document.querySelector('canvas'),rect=canvas.getBoundingClientRect(),style=getComputedStyle(canvas),left=parseFloat(style.borderLeftWidth),top=parseFloat(style.borderTopWidth);
  return {x:rect.left+left+position.x*(rect.width-left-parseFloat(style.borderRightWidth))/960,y:rect.top+top+position.y*(rect.height-top-parseFloat(style.borderBottomWidth))/540};
 },endpoint);
 await p.mouse.click(target.x,target.y);await p.getByText('異常を記録しました。',{exact:true}).waitFor();
 await p.mouse.click(target.x,target.y);await p.getByText('入力待ちです（0.5秒間隔）。',{exact:true}).waitFor();
 await p.locator('canvas').press('ArrowRight');await p.locator('canvas').press('ArrowDown');await p.waitForTimeout(600);await p.locator('canvas').press('Space');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'CANVAS');
 await p.screenshot({path:prefix+'-observing.png',fullPage:true});
 await p.getByRole('heading',{name:'星をみる灯さんの測定記録',exact:true}).waitFor({timeout:40000});
 const completed=(await read()).trial;assert.equal(completed.complete,true);assert.equal(completed.cards.length,5);assert.ok(completed.particle.found>=1);
 await p.reload();await p.getByRole('heading',{name:'星をみる灯さんの測定記録',exact:true}).waitFor();assert.equal((await read()).trial.completedAt,completed.completedAt);
 await p.screenshot({path:prefix+'-result.png',fullPage:true});await p.getByRole('link',{name:'被験者の測定原票',exact:true}).click();await p.locator('.lab-subject').first().waitFor();assert.equal(await p.locator('.lab-subject').count(),5);await p.locator('.lab-subject').last().locator('summary').click();assert.match(await p.locator('.lab-subject').last().innerText(),/瀬尾 灯|瀬尾\s+灯/);
 await p.screenshot({path:prefix+'-subjects.png',fullPage:true});await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.screenshot({path:prefix+'-mobile.png',fullPage:true});await p.setViewportSize({width:1440,height:1000});
 console.log('Console passed ('+mode+'): five cards, reload/rename preservation, interruption, 30-second canvas, pointer/keyboard, persisted result, five subjects.');return completed;
}
module.exports={exerciseConsole};
if(require.main===module)(async()=>{const base=(process.env.BASE_URL||'http://127.0.0.1:4617').replace(/\/$/,''),mode=process.env.PLAYTEST_MODE||'worker',url=mode==='node'?base.replace(/:\d+$/,':'+(Number(new URL(base).port)+3))+'/room/console/':base+'/historical-records/room/console/',errors=[];const b=await chromium.launch({headless:true,channel:'msedge'});try{const p=await b.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('#ticket').fill('H17-0038');await p.locator('#inquiry-code').fill('W416-12');await p.getByRole('button',{name:'照会室へ',exact:true}).click();await p.getByRole('heading',{name:'移管・保守受領簿',exact:true}).waitFor();await exerciseConsole(p,{url,mode});assert.deepEqual(errors,[]);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
