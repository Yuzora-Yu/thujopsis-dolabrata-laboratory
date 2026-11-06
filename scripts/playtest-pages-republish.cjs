const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {readFile} = require('node:fs/promises');
const {chromium} = require(process.env.ASUNARO_NODE_MODULES
 ? process.env.ASUNARO_NODE_MODULES+'/playwright'
 : 'playwright');

const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:4817/thujopsis-dolabrata-laboratory/');
assert.equal(base.hostname,'127.0.0.1','This test rebuilds the local Pages preview while it is running.');
const root = base.href.replace(/\/$/,'');

async function login(page,role){
 const {accounts} = await import('../src/content.mjs');
 const [id, account] = Object.entries(accounts).find(([,account])=>account.role===role);
 await page.goto(root+'/members/login/');
 await page.locator('#member-id').fill(id);
 await page.locator('#member-password').fill(account.password);
 await page.getByRole('button',{name:/ログイン/}).click();
 await page.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
}

async function downloaded(page,filename){
 const link = page.locator(`.record-media a[href$="/${filename}"]`);
 const result = Promise.race([
  page.waitForEvent('download',{timeout:10000}),
  page.locator('[data-record-media-message]').filter({hasText:/資料を取得できませんでした|閲覧権限/}).waitFor({timeout:10000})
   .then(()=>{throw new Error(filename+' could not be obtained from the open tab');}),
 ]);
 await link.click();
 const download = await result;
 assert.equal(download.suggestedFilename(),filename);
 assert.deepEqual(await readFile(await download.path()),await readFile('private/record-media/'+filename));
}

(async()=>{
 const browser = await chromium.launch({headless:true,channel:'msedge'});
 try {
  const context = await browser.newContext({acceptDownloads:true});
  const pdf = await context.newPage();
  const scan = await context.newPage();
  await login(pdf,'ordis');
  await pdf.goto(root+'/members/records/YH-2018-041/');
  await scan.goto(root+'/members/records/MX-2019-410/');
  await pdf.locator('.record-media a').first().waitFor();
  await scan.locator('.record-media a[href$="-scan.jpg"]').waitFor();
  const pdfResponses = [];
  pdf.on('response',response=>{
   if (response.url().includes('/assets/record-media/')) pdfResponses.push(response.status());
  });
  const indexUrl = root+'/assets/site-index.json';
  const before = await (await context.request.get(indexUrl)).json();
  const caseBefore = await pdf.locator('body').getAttribute('data-member-case');

  execFileSync(process.execPath,['scripts/build-pages.mjs'],{stdio:'pipe'});
  const after = await (await context.request.get(indexUrl)).json();
  assert.notEqual(after.edition,before.edition);
  await downloaded(pdf,'YH-2018-041.pdf');
  await downloaded(scan,'MX-2019-410-scan.jpg');
  assert.deepEqual(pdfResponses,[404,200]);
  await downloaded(pdf,'YH-2018-041.pdf');
  assert.deepEqual(pdfResponses,[404,200,200]);
  assert.equal(await pdf.locator('body').getAttribute('data-member-case'),caseBefore);
  assert.equal(pdf.url(),root+'/members/records/YH-2018-041/');

  let sendResponse, requestStarted;
  const held = new Promise(resolve=>sendResponse=resolve);
  const started = new Promise(resolve=>requestStarted=resolve);
  await scan.route('**/assets/record-media/*.json',async route=>{
   requestStarted();
   await held;
   await route.continue();
  });
  let downloadedAfterSwitch = false;
  scan.on('download',()=>{downloadedAfterSwitch=true;});
  await scan.locator('.record-media a[href$="-scan.jpg"]').click();
  await started;
  try {
   const other = await context.newPage();
   await login(other,'minamo');
  } finally {
   sendResponse();
  }
  await scan.locator('[data-record-media-message]').filter({hasText:'閲覧権限を確認できませんでした。'}).waitFor();
  assert.equal(downloadedAfterSwitch,false);
  assert.equal(await scan.locator('.record-media a[aria-busy=true]').count(),0);
  console.log('Open tabs recovered PDF and scan after a real rebuild, reused the refreshed file link, and stopped an in-flight download after an account switch.');
 } finally {
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
