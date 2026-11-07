const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const base=(process.env.PAGES_BASE_PATH??'/thujopsis-dolabrata-laboratory').replace(/\/$/,''),root=path.resolve('dist/pages');
const out=path.resolve('.work/qa/frontend-cache-20261108',process.env.QA_LABEL||'pages');
const oldRef='2ed0b35^:src/evidence.mjs';
const oldEvidence=execFileSync('git',['show',oldRef]);
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};

(async()=>{
 await fs.mkdir(out,{recursive:true});let phase='prime',browser,context,page;const evidenceRequests=[],errors=[],scriptRequests=[];
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname===base+'/cache-prime/'){
    const body=`<!doctype html><html lang="ja"><meta charset="utf-8"><body><p>Cache test fixture</p><script type="module">import * as previous from '${base}/evidence.js';document.body.dataset.cachePrimed='true';</script></body></html>`;
    res.writeHead(200,{'Content-Type':mime['.html'],'Cache-Control':'no-store'});return res.end(body);
   }
   if(!url.pathname.startsWith(base+'/'))throw Error('outside project path');
   let file=path.resolve(root,'.'+decodeURIComponent(url.pathname.slice(base.length)));
   if(file!==root&&!file.startsWith(root+path.sep))throw Error('outside fixture');
   if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
   const evidence=url.pathname===base+'/evidence.js';
   const data=evidence&&phase==='prime'?oldEvidence:await fs.readFile(file);
   const html=path.extname(file)==='.html';
   if(evidence)evidenceRequests.push({phase,path:url.pathname+url.search,sha256:digest(data)});
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':html?'no-store':'public, max-age=600','ETag':'"'+digest(data)+'"'});
   res.end(data);
  }catch{res.writeHead(404,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const report={scope:'Actual Chromium HTTP cache, primed with a historical repository module. No request routing, service worker, direct case-state writes, or progress reset.',base,oldRef,oldEvidenceSha256:digest(oldEvidence)};
 try{
  browser=await chromium.launch({headless:true,channel:'msedge',args:['--asunaro-cached-module-qa']});context=await browser.newContext();page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/\.js(?:\?|$)/.test(request.url()))scriptRequests.push(request.url());});
  await page.goto(origin+base+'/cache-prime/');await page.waitForFunction(()=>document.body.dataset.cachePrimed==='true');
  assert.equal(evidenceRequests.length,1);assert.equal(evidenceRequests[0].phase,'prime');
  phase='current';await page.goto(origin+base+'/members/login/');
  let ready=true;try{await page.waitForFunction(()=>typeof window.asunaroPlayerBridge==='function'&&document.body.dataset.playerPending!=='true',{},{timeout:5000});}catch{ready=false;}
  report.ready=ready;report.errors=[...errors];report.evidenceRequests=evidenceRequests;report.scriptRequests=scriptRequests;
  report.pending=await page.locator('body').getAttribute('data-player-pending');
  report.loginEnabled=await page.locator('#member-id').isEnabled();
  if(process.env.EXPECT_CACHED_MODULE_FAILURE==='1'){
   assert.equal(ready,false);assert.ok(errors.some(message=>message.includes('does not provide an export')));
   assert.equal(evidenceRequests.filter(request=>request.phase==='current').length,0,'Old module must be reused from real cache.');
   assert.equal(report.loginEnabled,false);report.reproduced=true;
  }else{
   assert.equal(ready,true);assert.deepEqual(errors,[]);assert.equal(report.loginEnabled,true);
   const actual=evidenceRequests.filter(request=>request.phase==='current');assert.equal(actual.length,1);assert.match(actual[0].path,/\?v=[a-f0-9]{16}$/);assert.notEqual(actual[0].sha256,report.oldEvidenceSha256);
   await page.locator('#member-id').fill('201204010017');await page.locator('#member-password').fill('20080519');await page.getByRole('button',{name:/ログイン/}).click();await page.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();report.realLogin=true;
   assert.deepEqual(errors,[]);report.fixed=true;
  }
  await page.screenshot({path:path.join(out,'result.png'),fullPage:true});console.log(JSON.stringify({base,ready,reproduced:!!report.reproduced,fixed:!!report.fixed,realLogin:!!report.realLogin,evidenceRequests,errors}));
 }catch(error){report.failure=String(error);if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;
 }finally{
  report.errors=[...errors];report.evidenceRequests=evidenceRequests;report.scriptRequests=scriptRequests;
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  if(context)await context.close();if(browser){await browser.close();assert.equal(browser.isConnected(),false);}
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
