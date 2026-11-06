const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=(process.env.BASE_URL||'http://127.0.0.1:4417').replace(/\/$/,''),at=path=>base+path;
let browser;
const noteRoutes=['/','/about/','/facilities/','/workshop/','/gallery/','/news/','/price/','/membership/'];
async function checkMenuNotes(browser){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 try {
  const page=await context.newPage(),titles=new Set(),labels=new Set();
  for (const path of noteRoutes) {
   await page.goto(at(path));
   const marker=page.locator('main .seed-note');
   assert.equal(await marker.count(),1,path);
   assert.equal(await page.locator('.site-footer .seed-note').count(),0,path);
   labels.add(await marker.innerText());
   const before=(await context.cookies()).find(cookie=>cookie.name.startsWith('asunaro_seed_'));
   await marker.click();
   const dialog=page.getByRole('dialog');
   await dialog.waitFor();
   titles.add(await dialog.getByRole('heading').innerText());
   await page.keyboard.press('Escape');
   assert.equal(await marker.evaluate(button=>button===document.activeElement),true,path);
   assert.equal((await context.cookies()).find(cookie=>cookie.name===before.name).value,before.value);
  }
  assert.equal(titles.size,noteRoutes.length);
  assert.equal(labels.size,noteRoutes.length);
  for (const path of ['/gallery/0021/','/facilities/coworking/','/facilities/staff/','/floor-map/','/guide/access/']) {
   await page.goto(at(path));
   assert.equal(await page.locator('.seed-note').count(),0,path);
  }
 } finally {
  await context.close();
 }
}
async function followPublicLinks(browser){
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();
 const steps=[
  ['/',''],
  ['/about/','.facility-hero'],
  ['/about/history/','#main'],
  ['/news/20120401/','#main'],
  ['/about/identity/','#main'],
  ['/facilities/','#main-navigation'],
  ['/facilities/coworking/','#main'],
  ['/floor-map/','#main'],
  ['/workshop/','#main-navigation'],
  ['/gallery/','#main'],
  ['/gallery/0021/','#main'],
  ['/workshop/stories/seo-akari/','#main'],
  ['/people/seo-akari/','#main'],
  ['/people/seo-fumino/','#main'],
  ['/news/','#main-navigation'],
 ];
 try{
  for(const [index,[path,section]] of steps.entries()){
   if(index===0)await page.goto(at(path));
   else{
    const href=new URL(at(path)).pathname;
    await page.locator(section).locator('a[href="'+href+'"]').click();
    await page.waitForURL(at(path));
   }
   const count=index+1;
   await page.waitForFunction(expected=>document.cookie.split('; ').some(cookie=>cookie.startsWith('asunaro_seed_')&&cookie.endsWith('='+expected)),count);
   assert.equal(await page.locator('body').getAttribute('data-asunaro-stage'),'seed',path);
   if(count<15)assert.equal(await page.locator('.seed-drift-link,.seed-drift-news').count(),0,path);
  }
  await page.getByRole('link',{name:/第5次居住実証 参加者募集について/}).waitFor();
  await page.screenshot({path:'.work/qa/seed-drift-from-navigation.png',fullPage:true});
 }finally{await context.close();}
}
(async()=>{
 await fs.mkdir('.work/qa',{recursive:true});browser=await chromium.launch({headless:true,channel:'msedge'});
 await checkMenuNotes(browser);
 await followPublicLinks(browser);
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(at('/gallery/'));
 const firstCount=(await context.cookies()).find(cookie=>cookie.name.startsWith('asunaro_seed_'));
 await page.locator('#main-navigation').getByRole('link',{name:'工房のご案内',exact:true}).click();
 await page.waitForURL(at('/workshop/'));
 await page.getByRole('button',{name:'道具の小話',exact:true}).click();
 await page.getByRole('dialog').getByRole('link',{name:'工房制作物ギャラリー'}).click();
 await page.waitForURL(at('/gallery/'));
 await page.waitForFunction(name=>document.cookie.split('; ').includes(name+'=3'),firstCount.name);
 for(let visit=3;visit<14;visit++)await page.reload();
 let seed=(await context.cookies()).find(cookie=>cookie.name.startsWith('asunaro_seed_'));
 assert.equal(Number(seed.value),14);assert.equal(await page.locator('.seed-drift-link').count(),0);
 await page.reload();await page.locator('body.seed-drift-active').waitFor();
 assert.equal(Number((await context.cookies()).find(cookie=>cookie.name===seed.name).value),15);
 assert.equal(await page.locator('.seed-corrupted img[src*="/assets/effects/"]').count(),2);
 const access=page.locator('.seed-drift-link');
 assert.equal(await access.getAttribute('href'),new URL(at('/guide/access/')).pathname);
 await access.hover();
 const accessStyle=await access.evaluate(link=>{
  const css=getComputedStyle(link);
  return {color:css.color,underline:css.textDecorationLine,border:css.borderBottomWidth};
 });
 assert.deepEqual(accessStyle,{color:'rgb(255, 139, 128)',underline:'none',border:'0px'});
 await access.click();await page.getByRole('heading',{name:'ページが見つかりません。'}).waitFor();
 await page.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'入居者紹介',exact:true}).waitFor();
 await page.locator('.footer-links').getByRole('link',{name:'入居者紹介',exact:true}).waitFor();
 await page.goBack();await page.locator('body.seed-drift-active').waitFor();
 assert.equal(await page.locator('.seed-drift-link').innerText(),'アクセス');
 await page.goto(at('/news/'));const red=page.getByRole('link',{name:/第5次居住実証 参加者募集について/});await red.waitFor();
 assert.equal(await red.locator('time').getAttribute('datetime'),'2025-05-01');
 assert.equal(await red.getAttribute('href'),new URL(at('/news/20250501-residential/')).pathname);
 assert.equal(await red.locator('.news-title').evaluate(node=>getComputedStyle(node).color),'rgb(155, 32, 40)');
 const response=await Promise.all([page.waitForNavigation(),red.click()]);assert.equal(response[0].status(),404);
 await page.getByRole('heading',{name:'ページが見つかりません。'}).waitFor();await page.locator('#main-navigation a[href$="/tenants/"]').waitFor();
 for(const route of ['/floor-map/','/workshop/','/membership/','/facilities/cafe/']){await page.goto(at(route));await page.locator('.seed-fragment a').waitFor();assert.equal(await page.locator('.seed-fragment a').count(),1,route);assert.equal(await page.locator('.seed-note').count(),noteRoutes.includes(route)?1:0,route);}
 await page.goto(at('/gallery/0021/'));await page.locator('article.seed-corrupted').waitFor();
 await page.goto(at('/gallery/0022/'));assert.equal(await page.locator('body').getAttribute('data-asunaro-stage'),'root');
 assert.equal((await context.cookies()).some(cookie=>cookie.name===seed.name),false);
 await page.goto(at('/gallery/'));assert.equal(await page.locator('.seed-drift-link,.seed-corrupted').count(),0);
 assert.equal(Number((await context.cookies()).find(cookie=>cookie.name===seed.name).value),1);
 await page.goto(at('/members/login/'));await page.locator('#member-id').fill('201204010017');await page.locator('#member-password').fill('20080519');await page.getByRole('button',{name:/ログイン/}).click();await page.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
 await page.goto(at('/gallery/'));const progress=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([key])=>!key.includes('seed-signal'))));
 const auth=(await context.cookies()).find(cookie=>cookie.name==='asunaro_session')?.value;
 seed=(await context.cookies()).find(cookie=>cookie.name.startsWith('asunaro_seed_'));await context.addCookies([{...seed,value:'14'}]);await page.reload();await page.locator('body.seed-drift-active').waitFor();
 const other=await context.newPage();other.on('pageerror',error=>errors.push(error.message));await other.goto(at('/gallery/0022/'));
 await page.waitForFunction(()=>!document.body.classList.contains('seed-drift-active'));assert.equal(await page.locator('.seed-drift-link,.seed-corrupted').count(),0);
 assert.equal(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([key])=>!key.includes('seed-signal')))),progress);
 if(auth)assert.equal((await context.cookies()).find(cookie=>cookie.name==='asunaro_session').value,auth);
 await page.goto(at('/members/'));await page.getByRole('heading',{name:'会員トップ',exact:true}).waitFor();
 await context.close();
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.addCookies([{...seed,value:'14'}]);const mobile=await reduced.newPage();mobile.on('pageerror',error=>errors.push(error.message));await mobile.goto(at('/gallery/'));await mobile.locator('body.seed-drift-active').waitFor();
 assert.equal(await mobile.locator('.seed-noise').count(),0);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await mobile.locator('.seed-corrupted img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));await mobile.screenshot({path:'.work/qa/seed-drift-mobile.png',fullPage:true});await reduced.close();assert.deepEqual(errors,[]);
 console.log('SEED playtest passed: one unique discovery on each of eight menu pages, 15-page visit threshold, dated 404, back navigation, ROOT and cross-tab reset, preserved progress, mobile.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
