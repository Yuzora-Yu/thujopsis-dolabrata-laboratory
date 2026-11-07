const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const base=(process.env.BASE_URL||'http://127.0.0.1:4877/thujopsis-dolabrata-laboratory').replace(/\/$/,''),out=path.resolve('.work/qa/player-record-20261107',process.env.QA_LABEL||'pages');
const at=route=>base+route;
async function snapshot(page){return page.evaluate(async()=>window.asunaroPlayerBridge?window.asunaroPlayerBridge('context'):fetch('/player-record/api/',{cache:'no-store'}).then(r=>r.json()));}
async function ready(page){await page.waitForFunction(()=>document.body.dataset.playerPending!=='true');}
async function go(page,route){await page.goto(at(route));await ready(page);}
async function login(page,id,password){
 await go(page,'/members/login/');await page.locator('#member-id:not([disabled])').fill(id);await page.locator('#member-password').fill(password);await page.getByRole('button',{name:/ログイン/}).click();await page.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();await ready(page);
}
async function download(page,href,name){
 const event=page.waitForEvent('download');await page.locator('a[href$="'+href+'"]').click();const item=await event;const target=path.join(out,name);await item.saveAs(target);assert.equal(await item.failure(),null);return target;
}
async function submit(page,file){await ready(page);await page.locator('#title').fill('原本と移送先の確認');await page.locator('#statement').fill('受領した原本を確認してください。');await page.locator('#archive').setInputFiles(file);await page.getByRole('button',{name:/資料を提出する/}).click();}
async function journal(page){await go(page,'/player-record/');await page.locator('[data-player-record-content]').waitFor({state:'visible'});}
async function restart(page){
 await journal(page);const before=await snapshot(page);assert.ok(before.ending);
 await page.locator('[data-player-restart-section]>summary').click();await page.locator('[data-player-restart-open]').click();const dialog=page.locator('[data-player-restart-dialog]');await dialog.waitFor({state:'visible'});await dialog.locator('[data-player-restart-confirm]').click();await dialog.waitFor({state:'hidden'});
 const after=await snapshot(page);assert.equal(after.ending,'');assert.equal(after.revision,before.revision+1);assert.deepEqual(after.endings,before.endings);assert.deepEqual(after.visits,before.visits);return after;
}
async function image(page,label){
 const details=page.locator('.pr-image-tools');if(await details.getAttribute('open')===null)await details.locator('summary').click();
 await page.locator('[data-player-image-create]').click();await page.locator('[data-player-image-preview]').waitFor({state:'visible'});
 const event=page.waitForEvent('download');await page.locator('[data-player-image-download]').click();const item=await event;const target=path.join(out,label+'.png');await item.saveAs(target);assert.equal(await item.failure(),null);
 const header=await fs.readFile(target);assert.equal(header.subarray(1,4).toString(),'PNG');assert.equal(header.readUInt32BE(16),1200);assert.equal(header.readUInt32BE(20),630);return target;
}
async function endingPanel(page,id){await page.locator('#asunaro-ending-record[data-ending="'+id+'"]').waitFor();assert.equal(await page.locator('#asunaro-ending-title').innerText(),'END '+id.slice(-1));}

(async()=>{
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,channel:'msedge',args:['--asunaro-player-record-qa']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
  await context.addInitScript(()=>{window.__playerShares=[];Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__playerShares.push({title:payload.title,text:payload.text,url:payload.url,files:payload.files?.map(file=>({name:file.name,type:file.type,size:file.size}))});}});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});});
  try{
   const page=await context.newPage(),errors=[];context.on('page',tab=>tab.on('pageerror',error=>errors.push(error.message)));page.on('pageerror',error=>errors.push(error.message));
   await go(page,'/');await page.locator('.seed-note').click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
   await go(page,'/gallery/');await go(page,'/gallery/0022/');await journal(page);
   assert.equal((await snapshot(page)).endings.length,0);assert.equal(await page.locator('[name="pr-share-ending"]').count(),0);assert.equal(await page.locator('[data-player-restart-section]').isVisible(),false);await image(page,'unended-share');
   await login(page,'201204010017','20080519');await go(page,'/members/records/YH-2018-041-A/');assert.equal((await snapshot(page)).visits.some(row=>row.path==='/members/records/YH-2018-041-A/'),false);
   await login(page,'201204010000','20100615');await go(page,'/members/inquiry/?record=CH-2021-003');await page.getByRole('button',{name:/照会を送信/}).click();await page.getByRole('heading',{name:'施設からの連絡',exact:true}).waitFor();
   const entry=await page.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).getAttribute('href');const caseQuery=new URL(entry,page.url()).search;const origins=(await snapshot(page)).origins;
   const baseFile=await download(page,'/members/download/hozen.zip','base.zip');
   await login(page,'20120901P0083','19930618');await go(page,'/members/records/TR-2026-011/');const fullFile=await download(page,'/members/download/complete.zip','complete.zip');
   const stale=await context.newPage();await stale.goto(origins.audit+'/receive/'+caseQuery);await ready(stale);await stale.locator('#title').fill('古い画面からの提出');await stale.locator('#statement').fill('状態を戻す前に開いた画面です。');await stale.locator('#archive').setInputFiles(fullFile);
   await go(page,'/members/contact/');await page.locator('#subject').fill('資料の確認');await page.locator('#message').fill('添付の原本をご確認ください。');await page.locator('#attachment').setInputFiles(baseFile);await page.getByRole('button',{name:/送信する/}).click();await endingPanel(page,'end2');
   await journal(page);assert.deepEqual((await snapshot(page)).endings.map(row=>row.id),['end2']);await image(page,'end2-share');
   const recordsBefore=await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.includes('seed-notes:')||key.startsWith('asunaro-reading-v1:')).sort());
   await restart(page);assert.deepEqual(await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.includes('seed-notes:')||key.startsWith('asunaro-reading-v1:')).sort()),recordsBefore);
   const oldValuesRemain=await stale.locator('#title').inputValue();
   await stale.getByRole('button',{name:/資料を提出する/}).click();
   if(oldValuesRemain)await stale.locator('.form-error').waitFor();
   else assert.equal(await stale.locator('form').evaluate(form=>form.checkValidity()),false,'a refreshed old tab must require a new submission');
   assert.equal((await snapshot(stale)).ending,'');await stale.close();
   await go(page,'/members/personal/');await page.getByRole('heading',{name:'個人保存資料',exact:true}).waitFor();
   await page.goto(origins.hozen+'/receive/'+caseQuery);await submit(page,baseFile);await endingPanel(page,'end1');await restart(page);
   await page.goto(origins.audit+'/receive/'+caseQuery);await submit(page,fullFile);await endingPanel(page,'end3');await journal(page);
   const all=await snapshot(page);assert.deepEqual(all.endings.map(row=>row.id),['end2','end1','end3']);assert.equal(new Set(all.visits.map(row=>row.kind+':'+row.path)).size,all.visits.length);assert.equal(all.visits.some(row=>row.path==='/members/records/YH-2018-041-A/'),false);
   assert.ok(all.visits.some(row=>row.path==='/gallery/0022/'));assert.ok(all.visits.some(row=>row.path==='/members/records/TR-2026-011/'));assert.ok(all.visits.some(row=>row.path==='/members/contact/received/'));assert.equal(await page.locator('[data-player-visits] a').count(),all.visits.length);
   const chosen=page.locator('[name="pr-share-ending"][value="end1"]');await chosen.check();await image(page,'end1-share');await page.locator('[name="pr-share-ending"][value="end3"]').check();await image(page,'end3-share');
   const text=await page.locator('[data-player-share-text]').inputValue(),intent=new URL(await page.locator('[data-player-x]').getAttribute('href'));assert.equal(intent.origin,'https://twitter.com');assert.equal(intent.searchParams.get('url'),origins.main.replace(/\/$/,'')+'/');assert.doesNotMatch(text,/case=|20120401|19930618|P034|TR-2026|星を|観測者/);assert.match(text,/END 3/);
   await page.locator('[data-player-copy]').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n'),text.replaceAll('\r\n','\n'));
   await page.locator('[data-player-native-share]').click();await page.locator('[data-player-image-share]').click();const shares=await page.evaluate(()=>window.__playerShares);assert.equal(shares.length,2);assert.equal(shares[0].url,intent.searchParams.get('url'));assert.equal(shares[1].files[0].type,'image/png');
   const knownTitle=all.visits.find(row=>row.path==='/gallery/0022/').title;
   await page.locator('[data-player-visit-search]').fill([...knownTitle].join('　'));assert.equal(await page.locator('[data-player-visits] a').count(),1);assert.match(await page.locator('[data-player-visits] a').innerText(),new RegExp(knownTitle));await page.locator('[data-player-visit-search]').fill('');
   for(const width of [1440,390,320]){await page.setViewportSize({width,height:width<500?844:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,width+'-journal.png'),fullPage:true});await page.locator('[data-player-restart-section]>summary').click();await page.locator('[data-player-restart-open]').click();await page.locator('[data-player-restart-dialog]').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,width+'-confirmation.png')});await page.locator('[data-player-restart-cancel]').click();await page.locator('[data-player-restart-section]>summary').click();}
   await restart(page);assert.equal((await snapshot(page)).endings.length,3);await go(page,'/members/contact/');await page.locator('#subject').fill('再度の確認');await page.locator('#message').fill('別の選択を確認します。');await page.locator('#attachment').setInputFiles(baseFile);await page.getByRole('button',{name:/送信する/}).click();await endingPanel(page,'end2');assert.deepEqual((await snapshot(page)).endings,all.endings);
   assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({base,scope:'Author-aware actual login/download/submission and optional restart regression. No social post was sent; native share was stubbed.',chain:['end2','restart','end1','restart','end3','restart','end2'],endingsRetained:true,discoveryAndReadingRetained:true,staleSubmissionRejected:true,asakuraReceiptVisible:true,unreadDocumentAbsent:true,uniqueVisitedLinks:all.visits.length,sharePng:{width:1200,height:630,labels:['unended','end1','end2','end3']},shareNoPrivateFields:true,clipboard:true,nativeShareStub:true,layouts:[1440,390,320],errors},null,2));console.log('Player record passed:',base,'end2 → restart → end1 → restart → end3 → restart → end2; history, PNG, shares, stale form and 3 widths.');
  }catch(error){
   const failures=[];for(const [i,tab]of context.pages().entries()){
    if(tab.isClosed())continue;
    await tab.screenshot({path:path.join(out,'failure-'+i+'.png'),fullPage:true}).catch(()=>{});
    failures.push({url:tab.url(),body:await tab.locator('body').innerText().catch(()=>''),attributes:await tab.locator('body').evaluate(body=>({...body.dataset})).catch(()=>null),state:await snapshot(tab).catch(e=>({error:String(e)}))});
   }
   await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),failures},null,2));throw error;
  }finally{await context.close();}
 }finally{await browser.close();assert.equal(browser.isConnected(),false);}
})().catch(error=>{console.error(error);process.exitCode=1;});
