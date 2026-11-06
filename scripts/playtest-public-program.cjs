const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=(process.env.BASE_URL||'http://127.0.0.1:4817/thujopsis-dolabrata-laboratory').replace(/\/$/,'');

(async()=>{
 await fs.mkdir('.work/qa',{recursive:true});
 const b=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const c=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const p=await c.newPage(),errors=[],media=[];p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(r.url().includes('/assets/record-media/'))media.push(r.url());});
  await p.goto(base+'/');await p.getByRole('heading',{level:1,name:/月に、暮らしを/}).waitFor();
  await p.locator('.lunar-hero img').evaluate(im=>im.decode());await p.screenshot({path:'.work/qa/nov06-home-desktop.png'});
  await p.locator('.lunar-hero').getByRole('link',{name:'月面居住技術プログラム',exact:true}).click();
  await p.getByRole('button',{name:'補給停止',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'補給停止',exact:true}).getAttribute('aria-pressed'),'true');
  assert.match(await p.locator('[data-system-status=water]').innerText(),/予備経路/);
  await p.locator('.lunar-demonstrator').screenshot({path:'.work/qa/nov06-system-exhibit.png'});
  await p.getByRole('link',{name:'装置が直った時刻、暮らしが戻った時刻',exact:true}).click();
  await p.getByRole('heading',{name:/06:14.*設備側の記録/}).waitFor();
  await p.getByRole('heading',{name:/06:41.*次の班の記録/}).waitFor();
  await p.getByRole('link',{name:'地上統合実証A72の引き継ぎ',exact:true}).click();
  assert.equal(new URL(p.url()).hash,'#handover');
  await p.locator('#handover').waitFor();
  await p.getByRole('link',{name:'循環設備の切替試験',exact:true}).click();
  await p.locator('figure.technical-diagram img').evaluate(im=>im.decode());
  await p.locator('figure.technical-diagram').screenshot({path:'.work/qa/nov06-flow.png'});
  await p.goto(base+'/research/lunar-habitat/');
  await p.getByRole('link',{name:'公開展示のご案内',exact:true}).click();
  await p.getByRole('link',{name:'見学のご案内',exact:true}).click();
  const [accessResponse]=await Promise.all([
   p.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/guide/access/')&&response.request().isNavigationRequest()),
   p.getByRole('link',{name:'アクセス',exact:true}).click(),
  ]);
  assert.equal(accessResponse.status(),404);
  await p.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'入居者紹介',exact:true}).waitFor();
  await p.goto(base+'/floor-map/');await p.locator('img[src$="/floor-4f.svg"]').waitFor();
  await p.locator('.floor-arrival img').evaluate(image=>image.decode());
  await p.screenshot({path:'.work/qa/nov06-floor.png',fullPage:true});
  await p.goto(base+'/tenants/0003/');await p.locator('.tenant-exhibit').waitFor();await p.screenshot({path:'.work/qa/nov06-tenant.png',fullPage:true});
  await p.goto(base+'/members/login/');await p.locator('#member-id').fill('201204010017');await p.locator('#member-password').fill('20080519');
  await p.getByRole('button',{name:/ログイン/}).click();await p.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
  await p.goto(base+'/members/records/YH-2018-041/');await p.locator('.record-media a').waitFor();assert.equal(media.length,0,'PDF loaded before a player asked for it');
  const waiting=p.waitForEvent('download');await p.locator('.record-media a').click();const file=await waiting;assert.equal(file.suggestedFilename(),'YH-2018-041.pdf');
  assert.equal((await fs.readFile(await file.path())).subarray(0,5).toString(),'%PDF-');assert.equal(media.length,1);
  await p.goto(base+'/members/records/YH-2018-041-A/');assert.equal(await p.locator('.record-media a').count(),0);
  const mobile=await b.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/research/lunar-habitat/','/news/20261027/','/news/20250509/','/tenants/0003/','/floor-map/']){
   await mobile.goto(base+route);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route);
   if(route==='/'){await mobile.locator('.lunar-hero img').evaluate(im=>im.decode());await mobile.screenshot({path:'.work/qa/nov06-home-mobile.png'});}
  }
  await mobile.getByRole('button',{name:'フロアマップを拡大',exact:true}).click();
  await mobile.locator('.image-dialog[open] img[src$="/floor-4f.svg"]').evaluate(image=>image.decode());
  await mobile.keyboard.press('Escape');
  await mobile.goto(base+'/search/?q=A4-01');
  await mobile.getByRole('link',{name:/開設時の区画配置について/}).click();
  await mobile.getByRole('button',{name:'開設時の配置図を拡大',exact:true}).click();
  await mobile.waitForFunction(()=>parseFloat(document.querySelector('.image-dialog[open] .image-stage')?.style.width)>0);
  await mobile.getByRole('button',{name:'画像を拡大',exact:true}).click();
  const viewport=mobile.getByRole('region',{name:'拡大画像の表示範囲'});
  assert.ok(await viewport.evaluate(node=>node.scrollWidth>node.clientWidth));
  await viewport.focus();
  await mobile.keyboard.press('Escape');
  assert.equal(await mobile.locator('.image-dialog[open]').count(),0);
  assert.deepEqual(errors,[]);console.log('Public program passed: concept hero, interactive exhibit, handover report and return link, flow diagram, tenant profile, 390px layout, lazy authorized PDF download.');
 }finally{await b.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
