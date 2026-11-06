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
  await p.locator('.facility-hero-copy .seed-note').click();
  await p.getByRole('dialog').waitFor();
  await p.keyboard.press('Escape');
  await p.evaluate(()=>window.scrollTo({top:720,behavior:'instant'}));
  assert.equal(Math.round((await p.locator('.site-header').boundingBox()).y),0);
  await p.locator('#main-navigation').getByRole('link',{name:'施設・サービス',exact:true}).click();
  await p.getByRole('link',{name:'職員紹介を見る',exact:true}).click();
  await p.getByRole('heading',{level:1,name:'施設職員紹介',exact:true}).waitFor();
  for(const title of ['中央受付スタッフ','工房スタッフ']){
   await p.getByRole('heading',{level:2,name:title,exact:true}).waitFor();
  }
  await p.goto(base+'/');
  await p.locator('.program-promo a').click();
  await p.getByRole('heading',{level:1,name:/月に、暮らしを/}).waitFor();
  assert.equal(await p.locator('[data-habitat-demo],a[href*="/field-notes/"]').count(),0);
  await p.getByRole('link',{name:'3階ホールでの特別展示',exact:true}).click();
  await p.locator('#exhibition img').evaluate(image=>image.decode());
  assert.match(await p.locator('#exhibition figcaption').innerText(),/2026年10月31日/);
  await p.locator('#exhibition').getByRole('link',{name:'月の企画展示を見る',exact:true}).click();
  await p.locator('.lunar-exhibit-view img').evaluate(image=>image.decode());
  const exhibits=p.locator('.lunar-work-grid .lunar-work');
  assert.equal(await exhibits.count(),3);
  await exhibits.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await p.locator('.lunar-exhibition').screenshot({path:'.work/qa/lunar-exhibition-revised.png'});
  await exhibits.getByRole('heading',{name:'工具を使わず交換できる留め具'}).click();
  await p.getByRole('heading',{level:1,name:'工具を使わず交換できる留め具'}).waitFor();
  await p.getByRole('link',{name:'月の企画展示を見る',exact:true}).click();
  await p.getByRole('heading',{level:1,name:/月に、暮らしを/}).waitFor();
  await p.goto(base+'/workshop/');
  for(const name of ['UltiMaker S7','Speedy 300 CO₂','Metal X']){
   await p.getByRole('heading',{name,exact:true}).waitFor();
  }
  assert.match(await p.locator('.workshop-access').innerText(),/無料.*ご利用/);
  await p.getByRole('link',{name:'制作物ギャラリーを見る',exact:true}).click();
  await p.getByLabel('制作方法').selectOption('金属3Dプリンター');
  let releaseGalleryIndex;
  const pendingGalleryIndex=new Promise(resolve=>releaseGalleryIndex=resolve);
  const indexPattern='**/assets/site-index.json';
  await p.route(indexPattern,async route=>{await pendingGalleryIndex;await route.continue();});
  try {
   await p.getByRole('button',{name:'表示する',exact:true}).click();
   await p.locator('[data-gallery-scope]').filter({hasText:'金属3Dプリンター'}).waitFor();
   assert.equal(await p.locator('[data-gallery-count]').innerText(),'1件');
   assert.deepEqual(await p.locator('.gallery-card:visible').evaluateAll(cards=>cards.map(card=>card.dataset.galleryMethod)),['金属3Dプリンター']);
  } finally {
   releaseGalleryIndex();
   await p.unrouteAll({behavior:'wait'});
  }
  await p.locator('#work-0033').click();
  assert.equal(new URL(p.url()).search,'');
  const galleryReturn=p.getByRole('link',{name:'制作物ギャラリーへ戻る',exact:true});
  const galleryTarget=new URL(await galleryReturn.getAttribute('href'),p.url());
  assert.equal(galleryTarget.searchParams.get('method'),'金属3Dプリンター');
  assert.equal(galleryTarget.hash,'#work-0033');
  await galleryReturn.click();
  await p.waitForURL(url=>url.searchParams.get('method')==='金属3Dプリンター'&&url.hash==='#work-0033');
  await p.locator('#work-0033:target:visible').waitFor();
  assert.equal(await p.locator('.gallery-card:visible').count(),1);
  await p.getByLabel('制作方法').selectOption('');
  await p.getByRole('button',{name:'表示する',exact:true}).click();
  await p.waitForURL(url=>url.searchParams.get('method')===''&&url.hash==='');
  await p.locator('[data-gallery-scope]').filter({hasText:'すべての制作方法'}).waitFor();
  assert.ok(await p.locator('.gallery-card:visible').count()>1);
  await p.goto(base+'/gallery/0029/');
  const unlistedReturn=new URL(await galleryReturn.getAttribute('href'),p.url());
  assert.equal(unlistedReturn.search+unlistedReturn.hash,'');
  await galleryReturn.click();
  assert.equal(await p.locator('#work-0029').count(),0);

  await p.goto(base+'/tenants/');
  await p.locator('#tenant-0008').click();
  await p.getByRole('link',{name:'入居者紹介へ',exact:true}).click();
  await p.waitForURL(base+'/tenants/#tenant-0008');
  await p.locator('#tenant-0008:target:visible').waitFor();
  await p.goto(base+'/tenants/0003/');
  await p.getByRole('link',{name:'入居者紹介へ',exact:true}).click();
  await p.waitForURL(base+'/tenants/');
  assert.equal(await p.locator('#tenant-0003').count(),0);
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
  await p.getByRole('link',{name:'活動に関する資料',exact:true}).click();
  const materials = p.locator('#reading-history');
  const openingNotice = materials.getByRole('link',{name:/開設記念の模型を展示いたしました/});
  assert.equal(await openingNotice.locator('time').getAttribute('datetime'),'2012-09-03');
  await openingNotice.click();
  await p.getByRole('heading',{name:'開設記念の模型を展示いたしました',exact:true}).waitFor();
  const noticeSource=p.locator('.tenant-material-source');
  assert.match(await noticeSource.innerText(),/お知らせの控え/);
  assert.equal(await noticeSource.locator('time').getAttribute('datetime'),'2012-09-03');
  await p.getByRole('link',{name:'モクノワデザインの活動資料へ戻る',exact:true}).click();
  assert.equal(new URL(p.url()).hash,'#reading-history');
  await materials.screenshot({path:'.work/qa/tenant-materials-desktop.png'});
  await p.goto(base+'/tenants/0008/');
  await materials.getByRole('link',{name:/工房ギャラリー掲載のお知らせ/}).click();
  await p.getByRole('link',{name:'つまみを回しやすくするカバー',exact:true}).click();
  await p.getByRole('heading',{name:'つまみを回しやすくするカバー',exact:true}).waitFor();
  await p.goto(base+'/floor-map/');await p.locator('img[src$="/floor-4f.svg"]').waitFor();
  await p.locator('.floor-arrival img').evaluate(image=>image.decode());
  await p.screenshot({path:'.work/qa/nov06-floor.png',fullPage:true});
  await p.goto(base+'/tenants/0003/');
  await p.locator('.tenant-identity img.tenant-logo').evaluate(image=>image.decode());
  await p.locator('#profile img[src$="flow-test-diagram.svg"]').evaluate(image=>image.decode());
  await p.screenshot({path:'.work/qa/nov06-tenant.png',fullPage:true});
  const publicUrl = p.url();
  const [member] = await Promise.all([p.waitForEvent('popup'),p.locator('.member-link').click()]);
  assert.equal(p.url(),publicUrl);
  member.on('pageerror',e=>errors.push(e.message));
  member.on('request',r=>{if(r.url().includes('/assets/record-media/'))media.push(r.url());});
  await member.locator('#member-id').fill('201204010017');await member.locator('#member-password').fill('20080519');
  assert.notEqual(await member.locator('.member-header').evaluate(header=>getComputedStyle(header).backgroundColor),publicHeader);
  await member.getByRole('button',{name:/ログイン/}).click();await member.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
  await member.locator('.member-workshop-note').getByRole('link',{name:'工房でのやり取りを読む',exact:true}).click();
  await member.getByRole('heading',{level:1,name:'生活道具・共同試作の連絡',exact:true}).waitFor();
  assert.match(await member.locator('.project-thread').innerText(),/焼き芋/);
  const messages = member.getByRole('navigation',{name:'会員メニュー'}).getByRole('link',{name:'施設からの連絡',exact:true});
  await messages.click();
  assert.match(await member.locator('.message').filter({hasText:'循環設備の検収資料について'}).innerText(),/実機の寸法は、別途お渡しする検収表/);
  await member.locator('[data-assigned-record="YH-2013-014"]').click();
  await member.locator('.record-media a[href$="YH-2013-014.pdf"]').waitFor();
  await messages.click();
  await member.locator('[data-assigned-record="YH-2016-032"]').click();
  await member.getByRole('heading',{level:1,name:'第2期居住実証・実施計画',exact:true}).waitFor();
  const recordText = await member.locator('main').innerText();
  const [reportId,appendixId] = recordText.match(/YH-2018-041(?:-A)?/g);
  assert.equal(reportId,'YH-2018-041');
  assert.equal(appendixId,'YH-2018-041-A');
  await member.screenshot({path:'.work/qa/member-palette-desktop.png'});
  await member.locator('#next-document-id').fill(reportId);
  await member.locator('.record-lookup button').click();
  await member.locator('.document-result').click();
  await member.locator('.record-media a').waitFor();assert.equal(media.length,0,'PDF loaded before a player asked for it');
  const waiting=member.waitForEvent('download');await member.locator('.record-media a').click();const file=await waiting;assert.equal(file.suggestedFilename(),'YH-2018-041.pdf');
  assert.equal((await fs.readFile(await file.path())).subarray(0,5).toString(),'%PDF-');assert.equal(media.length,1);
  await member.locator('#next-document-id').fill(appendixId);
  await member.locator('.record-lookup button').click();
  await member.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
  await member.goto(base+'/members/records/'+appendixId+'/');assert.equal(await member.locator('.record-media a').count(),0);
  for (const [id,message] of [
   ['ＹＨ－２０１８－０４１－Ａ','該当する資料は閲覧できません。'],
   ['ZZ-2099-999','該当する資料はありません。'],
  ]) {
   await member.goto(base+'/members/records/?document_id='+encodeURIComponent(id));
   await member.getByText(message,{exact:true}).waitFor();
   assert.equal(await member.locator('.document-result').count(),0);
  }
  for (const [path,label] of [['/floor-map/','フロアマップを拡大'],['/news/20120416/','開設時の配置図を拡大']]) {
   await p.goto(base+path);
   const preview=p.getByRole('button',{name:label,exact:true});
   const inlineWidth=(await preview.locator('img').boundingBox()).width;
   await preview.click();
   const viewer=p.getByRole('dialog',{name:label,exact:true});
   const image=viewer.locator('img');
   await image.waitFor();
   const fittedWidth=(await image.boundingBox()).width;
   assert.ok(fittedWidth>=inlineWidth*.85,path+' opens at a readable size');
   await viewer.getByRole('button',{name:'画像を拡大',exact:true}).click();
   assert.ok((await image.boundingBox()).width>fittedWidth);
   await p.keyboard.press('Escape');
  }
  const mobile=await b.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/','/research/lunar-habitat/','/news/20261027/','/news/20250509/','/tenants/','/tenants/0003/','/tenants/0004/materials/opening-exhibition/','/members/login/','/floor-map/','/facilities/staff/','/gallery/0021/']){
   await mobile.goto(base+route);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route);
   if(route==='/'){await mobile.locator('.facility-hero img').evaluate(im=>im.decode());await mobile.screenshot({path:'.work/qa/nov06-home-mobile.png'});}
  }
  const galleryActions=mobile.locator('.gallery-detail-links');
  assert.equal(await galleryActions.getByRole('link').count(),2);
  assert.ok(await galleryActions.evaluate(row=>parseFloat(getComputedStyle(row).gap)>0));
  await galleryActions.screenshot({path:'.work/qa/gallery-detail-actions-mobile.png'});
  await mobile.evaluate(()=>window.scrollTo({top:760,behavior:'instant'}));
  assert.equal(Math.round((await mobile.locator('.site-header').boundingBox()).y),0);
  await mobile.getByRole('button',{name:/MENU/}).click();
  await mobile.locator('#main-navigation').getByRole('link',{name:'施設・サービス',exact:true}).click();
  await mobile.getByRole('heading',{level:1,name:'施設・サービス',exact:true}).waitFor();
  await mobile.goto(base+'/floor-map/');
  assert.match(await mobile.locator('.floor-arrival').innerText(),/右へ進み、左手の中央受付へ/);
  await mobile.getByRole('button',{name:'フロアマップを拡大',exact:true}).click();
  const currentPlan=mobile.getByRole('dialog',{name:'フロアマップを拡大'});
  await currentPlan.getByRole('img',{name:/A4-08.*408・409・413.*撮影位置/}).waitFor();
  const currentViewport=currentPlan.getByRole('region',{name:'拡大画像の表示範囲'});
  assert.ok(await currentViewport.evaluate(node=>node.scrollWidth>=node.clientWidth*3&&node.scrollLeft>0));
  await currentPlan.getByRole('button',{name:'全体',exact:true}).click();
  assert.ok(await currentViewport.evaluate(node=>node.scrollWidth<=node.clientWidth+1));
  await mobile.keyboard.press('Escape');
  await mobile.locator('#floor-cafe').getByRole('link',{name:'食堂・カフェ',exact:true}).click();
  await mobile.getByText('4階 食堂・カフェ ／ 客席からカウンターを望む',{exact:true}).waitFor();
  await mobile.getByRole('link',{name:'中央受付からの行き方',exact:true}).click();
  await mobile.waitForURL(base+'/floor-map/#floor-cafe');
  await mobile.locator('#floor-workshop').getByRole('link',{name:'工房1・2',exact:true}).click();
  await mobile.getByText('4階 工房2 ／ 入口側から撮影',{exact:true}).waitFor();
  await mobile.getByRole('link',{name:'中央受付からの行き方',exact:true}).click();
  await mobile.waitForURL(base+'/floor-map/#floor-workshop');
  await mobile.locator('#floor-meeting').getByRole('link',{name:'会議室 A・B・C・D',exact:true}).click();
  await mobile.getByText('4階 会議室A',{exact:true}).waitFor();
  await mobile.getByRole('link',{name:'中央受付からの行き方',exact:true}).click();
  await mobile.waitForURL(base+'/floor-map/#floor-meeting');
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await mobile.locator('.floor-arrival img').evaluate(image=>image.decode());
  await mobile.screenshot({path:'.work/qa/visitor-floor-mobile.png',fullPage:true});
  await mobile.goto(base+'/search/?q=A4-01');
  await mobile.getByRole('link',{name:/開設時の区画配置について/}).click();
  await mobile.getByRole('button',{name:'開設時の配置図を拡大',exact:true}).click();
  const originalPlan=mobile.getByRole('dialog',{name:'開設時の配置図を拡大'});
  await originalPlan.getByRole('img',{name:/A4-01.*408〜413/}).waitFor();
  const enlarge=originalPlan.getByRole('button',{name:'画像を拡大',exact:true});
  for(let step=0;step<3;step++)await enlarge.click();
  const viewport=originalPlan.getByRole('region',{name:'拡大画像の表示範囲'});
  assert.ok(await viewport.evaluate(node=>node.scrollWidth>node.clientWidth));
  await viewport.evaluate(node=>{node.scrollLeft=node.scrollWidth*.18;node.scrollTop=node.scrollHeight*.14;});
  const center=()=>viewport.evaluate(node=>[
   (node.scrollLeft+node.clientWidth/2)/node.scrollWidth,
   (node.scrollTop+node.clientHeight/2)/node.scrollHeight,
  ]);
  const beforeZoom=await center();
  await enlarge.click();
  const afterZoom=await center();
  for(let axis=0;axis<2;axis++)assert.ok(Math.abs(afterZoom[axis]-beforeZoom[axis])<.02);
  await originalPlan.getByRole('button',{name:'画像を回転',exact:true}).click();
  assert.match(await originalPlan.locator('img').getAttribute('style'),/rotate\(90deg\)/);
  await originalPlan.getByRole('button',{name:'全体',exact:true}).click();
  assert.ok(await viewport.evaluate(node=>node.scrollWidth<=node.clientWidth+1&&node.scrollHeight<=node.clientHeight+1));
  await viewport.focus();
  await mobile.keyboard.press('Escape');
  assert.equal(await mobile.locator('.image-dialog[open]').count(),0);
  assert.equal(await mobile.getByRole('button',{name:'開設時の配置図を拡大'}).evaluate(button=>document.activeElement===button),true);
  await mobile.goto(base+'/members/login/');
  await mobile.locator('#member-id').fill('201204010017');await mobile.locator('#member-password').fill('20080519');
  await mobile.getByRole('button',{name:/ログイン/}).click();await mobile.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
  const memberNav=mobile.getByRole('navigation',{name:'会員メニュー'});
  assert.equal(await memberNav.evaluate(nav=>nav.scrollWidth<=nav.clientWidth+1),true,'member navigation scrolls sideways');
  await memberNav.getByRole('link',{name:'研究資料照会',exact:true}).click();
  await mobile.getByRole('heading',{name:'研究資料照会',exact:true}).waitFor();
  await mobile.screenshot({path:'.work/qa/member-palette-mobile.png'});
  await mobile.goto(base+'/members/reservations/?space=workshop');
  await mobile.waitForFunction(()=>document.querySelector('#time')?.max==='16:00');
  await mobile.locator('#space').selectOption('meeting-a');
  await mobile.waitForFunction(()=>document.querySelector('#time')?.max==='20:00');
  assert.deepEqual(errors,[]);console.log('Public program passed: sticky menu, staff, hall exhibit, real equipment, metal gallery filter, tenant materials, linked member records, and workshop hours.');
 }finally{await b.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
