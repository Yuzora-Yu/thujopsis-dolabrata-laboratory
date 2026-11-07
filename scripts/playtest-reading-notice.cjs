const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=(process.env.BASE_URL||'http://127.0.0.1:4877/thujopsis-dolabrata-laboratory').replace(/\/$/,'');
const out=path.resolve('.work/qa/reading-notice-20261107',process.env.QA_LABEL||'pages');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const checks=[];
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:1000}});
   try{
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/members/login/');
    await page.locator('#member-id').fill('201204010000');
    await page.locator('#member-password').fill('20100615');
    await page.getByRole('button',{name:/ログイン/}).click();
    await page.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
    const other=await context.newPage();
    await other.goto(base+'/members/messages/');
    await other.getByRole('heading',{name:'施設からの連絡',exact:true}).waitFor();
    assert.equal(await other.locator('#reading-notification').isVisible(),false);
    await page.goto(base+'/members/records/CH-2021-003/');
    const alert=page.locator('.reading-status');
    await page.locator('#next-document-id').waitFor();
    assert.equal(await alert.isVisible(),false);
    await page.goto(base+'/members/records/OPS-2026-084/');
    await page.locator('.reading-status').waitFor();
    await other.locator('#reading-notification').waitFor();
    assert.equal(await other.locator('#reading-notification h2').innerText(),'照会名義の確認');
    await page.locator('.reading-status a').click();
    await page.getByRole('heading',{name:'施設からの連絡',exact:true}).waitFor();
    const notice=page.locator('#reading-notification');
    await notice.waitFor();
    assert.equal(new URL(page.url()).hash,'#reading-notification');
    const box=await notice.boundingBox();
    assert.ok(box.y>=0&&box.y<page.viewportSize().height-80,'the notice must be in view after the alert link');
    assert.match(await notice.innerText(),/同一照会端末から、配布先の異なる資料への参照/);
    assert.match(await notice.innerText(),/照会端末 [A-F0-9]{8}/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(out,width+'-notice.png'),fullPage:true});
    await page.reload();await notice.waitFor();
    await page.getByRole('link',{name:'資料の閲覧履歴',exact:true}).click();
    await page.locator('[data-reading-ledger="current"]').waitFor();
    assert.equal(await page.locator('.reading-notification').count(),0);
    assert.deepEqual(errors,[]);
    checks.push({width,notificationInMessages:true,visibleAfterAlert:true,synchronizedToOpenTab:true,persistedAfterReload:true,historyOnlyHistory:true,errors});
   }finally{await context.close();}
  }
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({base,checks},null,2));
  console.log(JSON.stringify({base,checks},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
