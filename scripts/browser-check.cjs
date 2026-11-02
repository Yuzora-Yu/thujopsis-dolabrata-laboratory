const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
let browser;
async function imagesReady(page){await page.locator('img[src]').evaluateAll(async imgs=>{for(const i of imgs)i.loading='eager';await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});}
(async()=>{
 browser=await chromium.launch({headless:true,channel:'msedge'});await fs.mkdir('.work/qa',{recursive:true});
 const errors=[];const desktop=await browser.newPage({viewport:{width:1440,height:1000}});desktop.on('pageerror',e=>errors.push(e.message));
 await desktop.goto(base+'/',{waitUntil:'networkidle'});await imagesReady(desktop);await desktop.screenshot({path:'.work/qa/home-desktop.png',fullPage:true});
 await desktop.getByRole('button',{name:'サイト内検索を開く'}).click();await desktop.locator('#site-query').fill('朝倉 紬');await desktop.locator('.search-dialog button[type=submit]').click();await desktop.getByRole('link',{name:/朝倉 紬｜制作と活動の記録/}).click();assert.match(await desktop.locator('main').innerText(),/1993年6月18日/);
 await desktop.goto(base+'/tenants/0003/');await desktop.locator('a[href="#activities"]').click();await desktop.locator('[data-image-open]').first().click();assert.equal(await desktop.locator('.image-dialog').evaluate(d=>d.open),true);await desktop.waitForFunction(()=>document.querySelector('.image-stage').style.width!=='');const beforeWidth=await desktop.locator('.image-stage img').evaluate(i=>i.width);await desktop.getByRole('button',{name:'画像を拡大',exact:true}).click();assert.ok(await desktop.locator('.image-stage img').evaluate(i=>i.width)>beforeWidth);await desktop.getByRole('button',{name:'画像を回転',exact:true}).click();assert.match(await desktop.locator('.image-stage img').getAttribute('style'),/rotate\(90deg\)/);await desktop.keyboard.press('Escape');
 await desktop.goto(base+'/members/login/');await desktop.locator('#member-id').fill('201204010017');await desktop.locator('#member-password').fill('20080519');await desktop.getByRole('button',{name:/ログイン/}).click();await desktop.getByRole('link',{name:'研究資料照会',exact:true}).click();await desktop.locator('#document-id').fill('YH-2018-041-A');await desktop.getByRole('button',{name:'照会',exact:true}).click();assert.match(await desktop.locator('main').innerText(),/該当する資料はありません/);
 await desktop.goto(base+'/members/records/YH-2018-041/');await desktop.locator('#next-document-id').fill('YH-2016-032');await desktop.locator('.record-lookup button').click();await desktop.locator('.document-result').click();assert.match(await desktop.locator('h1').innerText(),/第2期/);
 await desktop.goto(base+'/members/login/');await desktop.locator('#member-id').fill('201204010000');await desktop.locator('#member-password').fill('20100615');await desktop.getByRole('button',{name:/ログイン/}).click();await desktop.goto(base+'/members/records/CH-2021-003/');await desktop.screenshot({path:'.work/qa/member-record.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});mobile.on('pageerror',e=>errors.push(e.message));
 const mobileRoutes=['/','/gallery/','/floor-map/','/tenants/0003/','/membership/','/news/','/search/?q='+encodeURIComponent('朝倉')];
 for(const route of mobileRoutes){await mobile.goto('http://127.0.0.1:4173'+route,{waitUntil:'networkidle'});await imagesReady(mobile);const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,route);assert.equal(await mobile.locator('img[src]').evaluateAll(imgs=>imgs.some(i=>!i.complete||i.naturalWidth===0)),false,route);if(route==='/')await mobile.screenshot({path:'.work/qa/home-mobile.png',fullPage:true});if(route==='/floor-map/')await mobile.screenshot({path:'.work/qa/floor-mobile.png',fullPage:true});}
 await mobile.goto(base+'/');await mobile.locator('.menu-toggle').click();assert.equal(await mobile.locator('.menu-toggle').getAttribute('aria-expanded'),'true');await mobile.getByRole('navigation').getByRole('link',{name:'工房のご案内'}).click();assert.match(await mobile.locator('h1').innerText(),/考えを、かたちに/);

 await desktop.goto(base+'/membership/');const popupEvent=desktop.waitForEvent('popup');await desktop.locator('main a[href="/members/"]').click();const popup=await popupEvent;await popup.waitForLoadState();assert.match(popup.url(),/members/);await popup.close();
 const archive=new URL(base);archive.port=String(Number(archive.port)+3);
 await desktop.goto(archive.origin+'/collections/');await desktop.screenshot({path:'.work/qa/archive-catalog.png',fullPage:true});
 await desktop.goto(archive.origin+'/room/');await desktop.locator('#ticket').fill('H17-0038');await desktop.locator('#inquiry-code').fill('W416-12');await desktop.getByRole('button',{name:'照会室へ'}).click();await desktop.goto(archive.origin+'/room/records/0006/');assert.match(await desktop.locator('main').innerText(),/台帳番号は0000/);
 await mobile.goto(archive.origin+'/collections/');assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);await mobile.screenshot({path:'.work/qa/archive-mobile.png',fullPage:true});
 await desktop.goto(base+'/news/');await desktop.screenshot({path:'.work/qa/news-desktop.png',fullPage:true});
 await desktop.goto(base+'/tenants/0003/');await imagesReady(desktop);await desktop.screenshot({path:'.work/qa/tenant-desktop.png',fullPage:true});
 const photo=await browser.newPage({viewport:{width:1536,height:1024},deviceScaleFactor:1});await photo.goto(base+'/assets/minamo-desk.webp');await photo.screenshot({path:'.work/qa/activity-photo-browser.png'});await photo.close();
 const detail=await browser.newPage({viewport:{width:1536,height:1024},deviceScaleFactor:8});await detail.goto(base+'/assets/minamo-desk.webp');await detail.screenshot({path:'.work/qa/credential-detail-browser.png',clip:{x:1170,y:525,width:135,height:65}});await detail.close();

 assert.deepEqual(errors,[]);await browser.close();console.log('Browser checks passed: desktop, mobile, search, photo dialog, permissions, navigation, assets.');
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1)});
