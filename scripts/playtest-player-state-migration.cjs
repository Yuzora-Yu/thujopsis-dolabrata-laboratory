const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=(process.env.BASE_URL||'http://127.0.0.1:4877/thujopsis-dolabrata-laboratory').replace(/\/$/,''),out=path.resolve('.work/qa/player-state-migration-20261108',process.env.QA_LABEL||'pages');
const ready=page=>page.waitForFunction(()=>document.body.dataset.playerPending!=='true');
const snapshot=page=>page.evaluate(()=>window.asunaroPlayerBridge('context'));
async function go(page,route){await page.goto(base+route);await ready(page);}
async function restart(page){
 await go(page,'/player-record/');await page.locator('[data-player-record-content]').waitFor({state:'visible'});
 await page.locator('[data-player-restart-section]>summary').click();await page.locator('[data-player-restart-open]').click();
 const dialog=page.locator('[data-player-restart-dialog]');await dialog.waitFor({state:'visible'});await dialog.locator('[data-player-restart-confirm]').click();await dialog.waitFor({state:'hidden'});
 assert.equal((await snapshot(page)).ending,'');
}
async function submit(page,file){
 await page.locator('#title').fill('原本の保全');await page.locator('#statement').fill('添付原本をご確認ください。');await page.locator('#archive').setInputFiles(file);await page.getByRole('button',{name:/資料を提出する/}).click();
 await page.waitForURL(/\/received\//);await ready(page);
 await page.locator('#asunaro-ending-record[data-ending="end1"]').waitFor({timeout:8000});
}
async function storageSummary(page){
 return page.evaluate(async()=>{
  const key='asunaro-preview-v1:'+(document.querySelector('meta[name="asunaro-base"]')?.content||'');
  const select=s=>({ending:s?.ending,revision:s?.revision,commit:s?.playerStoreCommit});
  const mirror=select(JSON.parse(localStorage.getItem(key)));
  const canonical=await new Promise((resolve,reject)=>{const open=indexedDB.open('asunaro-player-state-v1',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const get=db.transaction('cases').objectStore('cases').get(key);get.onerror=()=>{db.close();reject(get.error);};get.onsuccess=()=>{const result=select(get.result?.state);db.close();resolve(result);};};});
  return {mirror,canonical};
 });
}
(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge',args:['--asunaro-state-migration-qa']});let context,page,phase='setup';
 const report={base,scope:'Author-aware real login, download, submission and optional restart. Normal browser state restore with and without IndexedDB. Final repair check reproduces only the older runtime counter defect in an isolated database; story fields come from the real flow.',phases:[]};
 try{
  context=await browser.newContext({acceptDownloads:true});page=await context.newPage();
  await go(page,'/members/login/');await page.locator('#member-id:not([disabled])').fill('201204010000');await page.locator('#member-password').fill('20100615');await page.getByRole('button',{name:/ログイン/}).click();await page.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
  await go(page,'/members/inquiry/?record=CH-2021-003');await page.getByRole('button',{name:/照会を送信/}).click();await page.getByRole('heading',{name:'施設からの連絡',exact:true}).waitFor();
  const entry=await page.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).getAttribute('href');
  const pending=page.waitForEvent('download');await page.locator('a[href$="/members/download/hozen.zip"]').click();const download=await pending;const file=path.join(out,'base.zip');await download.saveAs(file);
  phase='original ending';await page.goto(new URL(entry,page.url()).href);await ready(page);await submit(page,file);await restart(page);
  const before=await snapshot(page),saved=await context.storageState();assert.ok(!saved.origins.some(origin=>origin.indexedDB?.length),'This restore deliberately excludes IndexedDB.');
  const original=await storageSummary(page);assert.ok(original.mirror.commit>2);assert.deepEqual(original.mirror,original.canonical);report.phases.push({phase,storage:original});
  await context.close();context=await browser.newContext({storageState:saved,acceptDownloads:true});page=await context.newPage();
  phase='restore mirror without IndexedDB';await go(page,'/player-record/');await page.locator('[data-player-record-content]').waitFor({state:'visible'});const restored=await snapshot(page);
  assert.equal(restored.ending,before.ending);assert.equal(restored.revision,before.revision);assert.deepEqual(restored.endings,before.endings);
  const receipt=restored.origins.hozen+'/receive/?case='+restored.caseId;await page.goto(receipt);await ready(page);await submit(page,file);
  const migrated=await storageSummary(page);assert.deepEqual(migrated.mirror,migrated.canonical);assert.ok(migrated.mirror.commit>original.mirror.commit);report.phases.push({phase,storage:migrated});
  phase='restart after migration';await restart(page);await page.goto(receipt);await ready(page);await page.reload();await ready(page);await submit(page,file);report.phases.push({phase,receiptVisible:true});
  const complete=await snapshot(page),withDatabase=await context.storageState({indexedDB:true});await context.close();context=await browser.newContext({storageState:withDatabase});page=await context.newPage();
  phase='restore with IndexedDB';await page.goto(complete.origins.hozen+'/received/?case='+complete.caseId);await ready(page);await page.locator('#asunaro-ending-record[data-ending="end1"]').waitFor();
  assert.equal((await snapshot(page)).revision,complete.revision);assert.deepEqual((await snapshot(page)).endings,complete.endings);const included=await storageSummary(page);assert.deepEqual(included.mirror,included.canonical);report.phases.push({phase,storage:included});
  phase='repair already imported old database';
  const oldMirror=saved.origins.flatMap(origin=>origin.localStorage).find(item=>item.name==='asunaro-preview-v1:'+new URL(base).pathname.replace(/\/$/,'')).value;
  await page.evaluate(async raw=>{
   const key='asunaro-preview-v1:'+(document.querySelector('meta[name="asunaro-base"]')?.content||'');
   await new Promise((resolve,reject)=>{const open=indexedDB.open('asunaro-player-state-v1',1);open.onsuccess=()=>{const db=open.result,tx=db.transaction('cases','readwrite'),store=tx.objectStore('cases');store.get(key).onsuccess=event=>{const record=event.target.result;record.commit=1;record.state.playerStoreCommit=1;store.put(record,key);};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};};open.onerror=()=>reject(open.error);});
   localStorage.setItem(key,raw);
  },oldMirror);
  const broken=await storageSummary(page);assert.equal(broken.canonical.ending,'end1');assert.equal(broken.mirror.ending,'');assert.ok(broken.mirror.commit>broken.canonical.commit);
  await page.reload();await ready(page);await page.locator('#asunaro-ending-record[data-ending="end1"]').waitFor();
  const repaired=await snapshot(page),fixed=await storageSummary(page);assert.equal(repaired.revision,complete.revision);assert.deepEqual(repaired.endings,complete.endings);assert.deepEqual(fixed.mirror,fixed.canonical);assert.ok(fixed.canonical.commit>broken.mirror.commit);
  report.phases.push({phase,counterOnlyLegacyFixture:true,before:broken,after:fixed,canonicalEndingRetained:true,canonicalRevisionRetained:true});
  await restart(page);await page.goto(receipt);await ready(page);await submit(page,file);
  await page.screenshot({path:path.join(out,'restored-receipt.png'),fullPage:true});report.passed=true;console.log('Browser state migration passed:',base);
 }catch(error){report.passed=false;report.failedPhase=phase;report.error=String(error);if(page&&!page.isClosed()){report.url=page.url();report.body=await page.locator('body').innerText().catch(()=>null);report.storage=await storageSummary(page).catch(e=>String(e));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}throw error;
 }finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));if(context)await context.close();await browser.close();assert.equal(browser.isConnected(),false);}
})().catch(error=>{console.error(error);process.exitCode=1;});
