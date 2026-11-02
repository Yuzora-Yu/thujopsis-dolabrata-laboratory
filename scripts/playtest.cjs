const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const mode=process.env.PLAYTEST_MODE||'node',base=(process.env.BASE_URL||'http://127.0.0.1:4417').replace(/\/$/,'');
const main=p=>base+p;
const provider=(kind,p)=>mode==='node'?new URL(base).origin.replace(/:\d+$/,':'+(Number(new URL(base).port)+(kind==='archive'?3:kind==='audit'?2:1)))+p:base+({archive:'/historical-records',audit:'/independent-review',hozen:'/records-center'}[kind])+p;
let browser;const errors=[];const ymd=text=>{const m=text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);assert.ok(m,text);return m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0');};
async function body(p){return p.locator('main').innerText();}
async function until(p,text){await p.getByRole('heading',{level:1}).filter({hasText:text}).waitFor();}
async function login(p,id,password){await p.goto(main('/members/login/'));await p.locator('#member-id').fill(id);await p.locator('#member-password').fill(password);await p.getByRole('button',{name:/ログイン/}).click();await until(p,'会員トップ');}
async function document(p,id){
 if(await p.locator('#next-document-id').count()){
  await p.locator('#next-document-id').fill(id);await p.locator('.record-lookup button').click();
 }else{await p.goto(main('/members/records/'));await p.locator('#document-id').fill(id);await p.locator('.record-form button').click();}
 await p.locator('.document-result').waitFor();await p.locator('.document-result').click();await p.locator('#next-document-id').waitFor();return body(p);
}
async function company(p,number){
 await p.goto(main('/tenants/'+number+'/'));await p.locator('#profile .detail-list').waitFor();
 return p.locator('#profile .detail-list>div').evaluateAll(rows=>Object.fromEntries(rows.map(r=>[r.querySelector('dt').textContent,r.querySelector('dd').textContent])));
}
async function download(p,selector,name){const waiting=p.waitForEvent('download');await p.locator(selector).click();const file=await waiting;const target='.work/qa/'+mode+'-'+name;await file.saveAs(target);return {file:target,data:await fs.readFile(target)};}
function pdfFromZip(data){let offset=0;while(data.readUInt32LE(offset)===0x04034b50){const size=data.readUInt32LE(offset+18),length=data.readUInt16LE(offset+26),extra=data.readUInt16LE(offset+28),name=data.subarray(offset+30,offset+30+length).toString('utf8'),start=offset+30+length+extra;if(name==='告発書.pdf')return data.subarray(start,start+size);offset=start+size;}throw new Error('PDF missing');}
async function evidence(p,institution){await login(p,institution.id,institution.password);await document(p,'CH-2021-003');await p.getByRole('link',{name:'記録についての照会',exact:true}).click();await p.locator('#note').fill('原本との照合をお願いいたします。');await p.getByRole('button',{name:/照会を送信/}).click();await p.locator('a[href$="hozen.zip"]').waitFor();return download(p,'a[href$="hozen.zip"]','evidence.zip');}
async function submit(p,file){await p.locator('#title').fill('資料の保全について');await p.locator('#statement').fill('原本と移送の記録をご確認ください。');await p.locator('#archive').setInputFiles(file);await p.getByRole('button',{name:/資料を提出/}).click();await until(p,'資料を受領しました');}
(async()=>{
 await fs.mkdir('.work/qa',{recursive:true});browser=await chromium.launch({headless:true,channel:'msedge'});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});let p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(main('/news/20120401/'));assert.equal(await p.locator('a[href*="20120903"]').count(),0);await p.getByRole('link',{name:'施設名に込めた願い',exact:true}).click();assert.match(await body(p),/アスナロは、アスナロとして育つ/);await p.screenshot({path:'.work/qa/'+mode+'-identity.png',fullPage:true});
 await p.goto(main('/'));assert.equal(await p.locator('a[href*="floor-4f-2012"],img[src*="floor-4f-2012"]').count(),0);
 await p.goto(main('/gallery/0005/'));assert.match(await body(p),/入居者紹介/);
 await p.goto(main('/search/?q='+encodeURIComponent('入居者紹介')));await p.locator('.search-results a[href$="/tenants/"]').waitFor();
 await p.goto(main('/visit/'));await p.getByRole('link',{name:'アクセス',exact:true}).click();await p.getByRole('heading',{name:'ページが見つかりません。'}).waitFor();
 const footer=await p.locator('.footer-links a').allTextContents();assert.ok(footer.indexOf('入居者紹介')<footer.indexOf('制作物ギャラリー'));
 await p.getByRole('link',{name:'入居者紹介',exact:true}).click();
 const visible=await p.locator('.tenant-id').allTextContents();const numbers=visible.map(t=>Number(t.match(/\d+/)[0]));const missing=Array.from({length:Math.max(...numbers)},(_,i)=>i+1).filter(n=>!numbers.includes(n));assert.equal(missing[0],3);
 const minamo=await company(p,String(missing[0]).padStart(4,'0'));const minamoId=ymd(minamo['入居'])+minamo['登録番号'];assert.equal(minamoId,'201204010017');assert.equal(ymd(minamo['設立']),'20080519');
 await p.locator('[data-image-open$="minamo-desk.svg"]').click();await p.getByRole('button',{name:'画像を拡大',exact:true}).click();await p.keyboard.press('Escape');
 const popup=p.waitForEvent('popup');await p.locator('.member-link').click();const member=await popup;member.on('pageerror',e=>errors.push(e.message));await p.close();p=member;
 await login(p,minamoId,ymd(minamo['設立']));await p.getByRole('link',{name:'共同事業・連絡記録',exact:true}).click();await p.getByRole('link',{name:/小規模循環設備/}).click();await until(p,'小規模循環設備・共同試作');assert.match(await body(p),/赤い水/);
 await document(p,'YH-2013-014');await document(p,'YH-2016-032');await document(p,'YH-2018-041');
 await p.locator('#next-document-id').fill('YH-2018-041-A');await p.locator('.record-lookup button').click();await p.getByText('該当する資料はありません。',{exact:true}).waitFor();
 let ordis,ashita;
 for(const number of missing){const data=await company(p,String(number).padStart(4,'0'));if(data['登録番号']==='0046')ordis=data;if(data['登録番号']==='0038')ashita=data;}
 assert.ok(ordis&&ashita);await login(p,ymd(ordis['入居'])+ordis['登録番号'],ymd(ordis['設立']));
 assert.match(await document(p,'YH-2018-041-A'),/稲葉 澪/);await document(p,'YH-2019-026');await document(p,'MX-2019-410');
 await p.goto(main('/search/?q=A4-01'));await p.getByRole('link',{name:/開設時の区画配置について/}).click();await p.locator('img[src*="floor-4f-2012.svg"]').waitFor();await p.screenshot({path:'.work/qa/'+mode+'-old-map.png',fullPage:true});
 await p.goto(main('/news/'));assert.equal(await p.locator('.news-rows a[href*="20120416"]').count(),0);assert.equal(await p.locator('.news-rows a[href*="20120903"]').count(),0);
 await document(p,'YH-2019-026');assert.match(await document(p,'FAB-2020-026'),/AH-2017-009/);
 await login(p,ymd(ashita['入居'])+ashita['登録番号'],ymd(ashita['設立']));const handover=await document(p,'AH-2017-009');
 const ticket=handover.match(/閲覧票番号\s+(\S+)/)[1],code=handover.match(/照会符号\s+(\S+)/)[1];
 const archivePopup=p.waitForEvent('popup');await p.getByRole('link',{name:/旧基盤・資料照会室/}).click();const archive=await archivePopup;archive.on('pageerror',e=>errors.push(e.message));
 await archive.locator('#ticket').fill(ticket);await archive.locator('#inquiry-code').fill(code);await archive.getByRole('button',{name:'照会室へ'}).click();await until(archive,'移管・保守受領簿');
 await archive.goto(provider('archive','/room/records/0005/'));await until(archive,'端末と資料更新の整理');assert.match(await body(archive),/0006/);await archive.goto(provider('archive','/room/records/0006/'));await until(archive,'機関台帳');const registry=await body(archive);
 const institution={id:ymd(registry.match(/加入日([^。]+)/)[1])+registry.match(/台帳番号は(\d{4})/)[1],password:ymd(registry.match(/法人設立日([^。]+)/)[1])};await archive.close();
 await login(p,institution.id,institution.password);await document(p,'RG-2007-011');assert.match(await document(p,'YH-2022-017'),/旧継舟/);await document(p,'HC-2021-031-R');await document(p,'CH-2021-003');await document(p,'OPS-2026-084');await document(p,'FAB-2026-018');
 await p.getByRole('link',{name:'記録についての照会',exact:true}).click();await p.getByRole('button',{name:/照会を送信/}).click();await p.locator('a[href$="hozen.zip"]').waitFor();
 const original=await download(p,'a[href$="hozen.zip"]','original.zip');const pdfPath='.work/qa/'+mode+'-statement.pdf';await fs.writeFile(pdfPath,pdfFromZip(original.data));
 const pdfText=execFileSync(process.env.ASUNARO_PYTHON||'python',['-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))',pdfPath],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 const personName=pdfText.match(/申出者\s+([^\n]+)/)[1].trim(),personId=pdfText.match(/会員ID\s+([A-Z0-9]+)/)[1];
 await p.goto(main('/search/?q='+encodeURIComponent(personName.replace(/\s+/g,''))));await p.getByRole('link',{name:/制作と活動の記録/}).click();const personalText=await body(p),birth=ymd(personalText);await login(p,personId,birth);await p.getByRole('link',{name:'個人保存資料',exact:true}).first().click();
 const complete=await download(p,'a[href$="complete.zip"]','complete.zip');await document(p,'AS-2026-021');await document(p,'EA-2026-009');await p.getByRole('link',{name:/東都研究監査室・記録保全受付/}).click();
 await submit(p,original.file);assert.match(await body(p),/追加資料/);await p.getByRole('link',{name:'追加資料を提出する',exact:true}).click();await submit(p,complete.file);assert.match(await body(p),/外部への資料移送/);await p.screenshot({path:'.work/qa/'+mode+'-end3.png',fullPage:true});
 for(const ending of ['end1','end2']){
  const branch=await browser.newContext({viewport:{width:1200,height:900},acceptDownloads:true});const q=await branch.newPage();q.on('pageerror',e=>errors.push(e.message));const received=await evidence(q,institution);
  if(ending==='end1'){await q.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).click();await submit(q,received.file);assert.match(await body(q),/新たな研究支援事業/);await q.goto(main('/members/reservations/'));await until(q,'利用申請・予約');await q.getByText('受付を休止しております。',{exact:true}).waitFor();}
  else{await q.goto(main('/members/contact/'));await q.locator('#subject').fill('資料の確認について');await q.locator('#message').fill('原本をご確認ください。');await q.locator('#attachment').setInputFiles(received.file);await q.getByRole('button',{name:/送信する/}).click();await until(q,'お問い合わせを受け付けました');await q.goto(main('/members/messages/'));await q.getByText('担当者の変更',{exact:true}).waitFor();await q.goto(main('/people/asakura-tsumugi/'));await until(q,'ページが見つかりません');}
  await q.screenshot({path:'.work/qa/'+mode+'-'+ending+'.png',fullPage:true});await branch.close();
 }
 const mobile=await browser.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));for(const route of ['/','/about/identity/','/about/emblem/','/visit/','/gallery/0005/','/news/20220218/','/news/20120416/']){await mobile.goto(main(route));assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route);}
 await mobile.goto(main('/about/emblem/'));await mobile.screenshot({path:'.work/qa/'+mode+'-emblem-mobile.png',fullPage:true});await mobile.close();assert.deepEqual(errors,[]);await context.close();
 console.log(`Playtest passed (${mode}): clue-led account derivation, legacy ticket, hidden map, PDF identity, incomplete-evidence check, 3 endings, desktop/mobile.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
