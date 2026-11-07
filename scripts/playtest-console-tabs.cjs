const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--asunaro-console-tabs-qa']});
 try{
  const context=await browser.newContext({acceptDownloads:true});
  try{
   const main=await context.newPage(),archive=await context.newPage(),base=(process.env.BASE_URL||'http://127.0.0.1:4817/thujopsis-dolabrata-laboratory').replace(/\/$/,''),errors=[];
   context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
   for(const page of [main,archive])page.on('pageerror',e=>errors.push(e.message));
   await main.goto(base+'/members/login/');await main.locator('#member-id:enabled').waitFor();
   await archive.goto(base+'/historical-records/room/');await archive.locator('#ticket').fill('H17-0038');await archive.locator('#inquiry-code').fill('W416-12');await archive.getByRole('button',{name:'照会室へ',exact:true}).click();await archive.getByRole('heading',{name:'移管・保守受領簿',exact:true}).waitFor();
   await archive.goto(base+'/historical-records/room/console/');await archive.locator('#lab-handle').fill('タブ間の記録');await archive.getByRole('button',{name:'呼称を登録',exact:true}).click();await archive.getByRole('button',{name:'カード 1',exact:true}).click();await archive.getByRole('button',{name:'次の試行へ',exact:true}).click();
   await main.locator('#member-id').fill('201204010000');await main.locator('#member-password').fill('20100615');await main.getByRole('button',{name:/ログイン/}).click();await main.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
   const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('asunaro-preview-v1:'+document.querySelector('meta[name="asunaro-base"]').content)));
   let state=await read(main);assert.equal(state.consoleTrial.handle,'タブ間の記録');assert.equal(state.consoleTrial.cards.length,1);
   await main.goto(base+'/members/inquiry/?record=CH-2021-003');await main.locator('#record').waitFor();
   // Mutation uses the real bridge and actual observation duration. localStorage is a read-only mirror here.
   const attempt=await archive.evaluate(async()=>{
    for(let index=1;index<5;index++)await window.asunaroLabBridge('card',{index,selected:0});
    return (await window.asunaroLabBridge('particle_start')).trial.particleAttempt.id;
   });
   await archive.waitForTimeout(30200);
   await archive.evaluate(attemptId=>window.asunaroLabBridge('particle_finish',{attemptId,taps:[]}),attempt);
   await main.getByRole('button',{name:/照会を送信/}).click();await main.getByRole('heading',{name:'施設からの連絡',exact:true}).waitFor();
   state=await read(main);assert.ok(state.consoleTrial.completedAt);assert.equal(state.consoleTrial.cards.length,5);assert.equal(state.contact,true);assert.equal(state.consoleTrial.handle,'タブ間の記録');
   const completedAt=state.consoleTrial.completedAt;
   await main.goto(base+'/members/login/');await main.locator('#member-id').fill('20120901P0083');await main.locator('#member-password').fill('19930618');await main.getByRole('button',{name:/ログイン/}).click();await main.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
   await main.goto(base+'/members/records/AS-2026-019/');await main.locator('[data-lab-assessment]:visible').waitFor();assert.equal(await main.locator('[data-lab-assessment-handle]').innerText(),'タブ間の記録');
   await archive.evaluate(()=>window.asunaroLabBridge('register',{handle:'別タブで訂正'}));await main.locator('[data-lab-assessment-handle]').filter({hasText:'別タブで訂正'}).waitFor();
   const caseId=await main.locator('body').getAttribute('data-member-case'),snapshot=await main.evaluate(()=>window.asunaroPlayerBridge('context'));
   const submit=await context.newPage();await submit.goto(base+'/members/records/TR-2026-011/');
   const event=submit.waitForEvent('download');await submit.locator('a[href$="/members/download/complete.zip"]').click();const download=await event;
   await fs.mkdir('.work/qa/console-tabs-20261107',{recursive:true});const file=path.resolve('.work/qa/console-tabs-20261107/complete.zip');await download.saveAs(file);assert.equal(await download.failure(),null);
   await submit.goto(snapshot.origins.audit+'/receive/?case='+encodeURIComponent(caseId));await submit.locator('#title').fill('原本の照合');await submit.locator('#statement').fill('原本と移送先をご確認ください。');await submit.locator('#archive').setInputFiles(file);await submit.getByRole('button',{name:/資料を提出する/}).click();await submit.locator('#asunaro-ending-record[data-ending="end3"]').waitFor();
   await main.locator('[data-lab-assessment-status]').filter({hasText:'終了／原本保全'}).waitFor();assert.equal(await main.locator('[data-lab-assessment-handle]').innerText(),'別タブで訂正');assert.equal((await read(main)).consoleTrial.completedAt,completedAt);
   await submit.goto(base+'/player-record/');await submit.locator('[data-player-record-content]').waitFor({state:'visible'});await submit.locator('[data-player-restart-section]>summary').click();await submit.locator('[data-player-restart-open]').click();await submit.locator('[data-player-restart-confirm]').click();await submit.locator('[data-player-restart-dialog]').waitFor({state:'hidden'});
   const resumed=await archive.evaluate(()=>window.asunaroLabBridge('context'));assert.equal(resumed.ending,'');assert.equal(resumed.trial.completedAt,completedAt);assert.equal(resumed.trial.handle,'別タブで訂正');assert.equal(resumed.trial.cards.length,5);
   assert.deepEqual(errors,[]);await fs.writeFile('.work/qa/console-tabs-20261107/report.json',JSON.stringify({base,scope:'Author-aware actual mutation bridge, 30-second observation, real ZIP/End3 and voluntary restart; no direct state fixture writes.',cards:5,observationMs:30200,oldLoginAndInquiryPreserveTrial:true,aliasUpdatesAcrossTabs:true,actualEnd3:true,restartPreservesCompletedMeasurement:true,errors},null,2));
   console.log('Cross-tab console passed: actual five cards/30-second result, old login/inquiry preservation, live alias/End3, completed measurement retained after restart.');
  }finally{await context.close();}
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
