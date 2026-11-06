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
  await p.goto(base+'/');await p.getByRole('heading',{level:1,name:/ともに、/}).waitFor();
  await p.locator('.facility-hero img').evaluate(im=>im.decode());await p.screenshot({path:'.work/qa/nov06-home-desktop.png'});
  const publicHeader=await p.locator('.site-header').evaluate(header=>getComputedStyle(header).backgroundColor);
  await p.locator('.facility-hero-photo .seed-note').click();
  await p.getByRole('dialog').waitFor();
  await p.keyboard.press('Escape');
  await p.locator('.program-promo a').click();
  await p.getByRole('heading',{level:1,name:/月に、暮らしを/}).waitFor();
  assert.equal(await p.locator('[data-habitat-demo],a[href*="/field-notes/"]').count(),0);
  await p.goto(base+'/research/lunar-habitat/field-notes/');
  assert.equal(await p.locator('body').getAttribute('data-asunaro-stage'),'root');
  assert.equal(await p.locator('.seed-note').count(),0);
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
  await p.getByRole('link',{name:'展示のご案内',exact:true}).click();
  await p.getByRole('link',{name:'見学のご案内',exact:true}).click();
  const [accessResponse]=await Promise.all([
   p.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/guide/access/')&&response.request().isNavigationRequest()),
   p.getByRole('link',{name:'アクセス',exact:true}).click(),
  ]);
  assert.equal(accessResponse.status(),404);
  await p.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'入居者紹介',exact:true}).click();
  const cards=p.locator('.tenant-grid .tenant-card');
  assert.equal(await cards.count(),13);
  const logoSources=await cards.locator('img').evaluateAll(async images=>{
   await Promise.all(images.map(image=>{image.loading='eager';return image.decode();}));
   return images.map(image=>new URL(image.src).pathname);
  });
  assert.equal(new Set(logoSources).size,13);
  assert.ok(logoSources.every(src=>src.includes('/tenant-logos/')));
  assert.ok(!logoSources.some(src=>src.endsWith('/0003.svg')));
  await p.screenshot({path:'.work/qa/tenant-cards-desktop.png',fullPage:true});
  await cards.filter({hasText:'モクノワデザイン'}).click();
  await p.getByRole('link',{name:'資料の閲覧履歴',exact:true}).click();
  const history = p.locator('#reading-history');
  await history.getByRole('link',{name:/開設記念の模型を展示いたしました/}).click();
  await p.getByRole('heading',{name:'開設記念の模型を展示いたしました',exact:true}).waitFor();
  assert.match(await p.locator('.tenant-material-source').innerText(),/お知らせの控え.*2012\.09\.03/);
  await p.getByRole('link',{name:'モクノワデザインの閲覧履歴へ',exact:true}).click();
  assert.equal(new URL(p.url()).hash,'#reading-history');
  await p.locator('.tenant-reading').screenshot({path:'.work/qa/tenant-reading-desktop.png'});
  await p.goto(base+'/tenants/0008/');
  await history.getByRole('link',{name:/工房ギャラリー掲載のお知らせ/}).click();
  await p.getByRole('link',{name:'つまみを回しやすくするカバー',exact:true}).click();
  await p.getByRole('heading',{name:'つまみを回しやすくするカバー',exact:true}).waitFor();
  await p.goto(base+'/floor-map/');await p.locator('img[src$="/floor-4f.svg"]').waitFor();
  await p.locator('.floor-arrival img').evaluate(image=>image.decode());
  await p.screenshot({path:'.work/qa/nov06-floor.png',fullPage:true});
  await p.goto(base+'/tenants/0003/');await p.locator('.tenant-exhibit').waitFor();await p.locator('img.tenant-logo').evaluate(image=>image.decode());await p.screenshot({path:'.work/qa/nov06-tenant.png',fullPage:true});
  const publicUrl = p.url();
  const [member] = await Promise.all([p.waitForEvent('popup'),p.locator('.member-link').click()]);
  assert.equal(p.url(),publicUrl);
  member.on('pageerror',e=>errors.push(e.message));
  member.on('request',r=>{if(r.url().includes('/assets/record-media/'))media.push(r.url());});
  await member.locator('#member-id').fill('201204010017');await member.locator('#member-password').fill('20080519');
  assert.notEqual(await member.locator('.member-header').evaluate(header=>getComputedStyle(header).backgroundColor),publicHeader);
  await member.getByRole('button',{name:/ログイン/}).click();await member.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
  await member.screenshot({path:'.work/qa/member-palette-desktop.png'});
  await member.goto(base+'/members/records/YH-2018-041/');await member.locator('.record-media a').waitFor();assert.equal(media.length,0,'PDF loaded before a player asked for it');
  const waiting=member.waitForEvent('download');await member.locator('.record-media a').click();const file=await waiting;assert.equal(file.suggestedFilename(),'YH-2018-041.pdf');
  assert.equal((await fs.readFile(await file.path())).subarray(0,5).toString(),'%PDF-');assert.equal(media.length,1);
  await member.goto(base+'/members/records/YH-2018-041-A/');assert.equal(await member.locator('.record-media a').count(),0);
  for (const [id,message] of [
   ['ＹＨ－２０１８－０４１－Ａ','該当する資料は閲覧できません。'],
   ['ZZ-2099-999','該当する資料はありません。'],
  ]) {
   await member.goto(base+'/members/records/?document_id='+encodeURIComponent(id));
   await member.getByText(message,{exact:true}).waitFor();
   assert.equal(await member.locator('.document-result').count(),0);
  }
  const mobile=await b.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/research/lunar-habitat/','/news/20261027/','/news/20250509/','/tenants/','/tenants/0003/','/tenants/0004/materials/opening-exhibition/','/members/login/','/floor-map/']){
   await mobile.goto(base+route);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route);
   if(route==='/'){await mobile.locator('.facility-hero img').evaluate(im=>im.decode());await mobile.screenshot({path:'.work/qa/nov06-home-mobile.png'});}
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
  await mobile.goto(base+'/members/login/');
  await mobile.locator('#member-id').fill('201204010017');await mobile.locator('#member-password').fill('20080519');
  await mobile.getByRole('button',{name:/ログイン/}).click();await mobile.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
  const memberNav=mobile.getByRole('navigation',{name:'会員メニュー'});
  assert.equal(await memberNav.evaluate(nav=>nav.scrollWidth<=nav.clientWidth+1),true,'member navigation scrolls sideways');
  await memberNav.getByRole('link',{name:'研究資料照会',exact:true}).click();
  await mobile.getByRole('heading',{name:'研究資料照会',exact:true}).waitFor();
  await mobile.screenshot({path:'.work/qa/member-palette-mobile.png'});
  assert.deepEqual(errors,[]);console.log('Public program passed: tenant history and saved notice, gallery link, separate member tab, distinct lookup responses, maps, 390px layout, authorized PDF.');
 }finally{await b.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
