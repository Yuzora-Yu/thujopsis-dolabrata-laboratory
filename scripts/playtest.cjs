const {chromium}=require(process.env.ASUNARO_NODE_MODULES?process.env.ASUNARO_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const mode=process.env.PLAYTEST_MODE||'node',base=(process.env.BASE_URL||'http://127.0.0.1:4417').replace(/\/$/,'');
const main=p=>base+p;
const provider=(kind,p)=>mode==='node'?new URL(base).origin.replace(/:\d+$/,':'+(Number(new URL(base).port)+(kind==='archive'?3:kind==='audit'?2:1)))+p:base+({archive:'/historical-records',audit:'/independent-review',hozen:'/records-center'}[kind])+p;
let browser;const errors=[];const ymd=text=>{const m=text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);assert.ok(m,text);return m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0');};
async function body(p){return p.locator('main').innerText();}
async function until(p,text){await p.getByRole('heading',{level:1}).filter({hasText:text}).waitFor();}
async function login(p,id,password){await p.goto(main('/members/login/'));await p.locator('#member-id').fill(id);await p.locator('#member-password').fill(password);await p.getByRole('button',{name:/ログイン/}).click();try{await until(p,'会員トップ');}catch(error){await p.screenshot({path:'.work/qa/'+mode+'-login-failure.png',fullPage:true});throw error;}}
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
async function traceNewspaper(page,archive){
 await archive.getByRole('link',{name:'収蔵目録',exact:true}).click();
 const catalog=archive.locator('.legacy-catalog');
 await catalog.getByRole('link',{name:/公式告知/}).click();
 assert.match(await body(archive),/病気のため逝去/);
 await archive.getByRole('link',{name:'収蔵目録へ',exact:true}).click();
 const correctionCode=await catalog.getByRole('link',{name:/訂正欄/}).locator('small').innerText();
 const search=async keyword=>{
  await archive.getByLabel('収蔵番号・資料名').fill(keyword);
  await archive.getByRole('button',{name:'検索',exact:true}).click();
  await archive.waitForURL(url=>url.searchParams.get('q')===keyword);
 };
 let releaseIndex;
 const indexHold=new Promise(resolve=>{releaseIndex=resolve;});
 const indexPattern='**/assets/site-index.json';
 await archive.route(indexPattern,async route=>{await indexHold;await route.continue();});
 try {
  await search(correctionCode);
  await archive.getByText('収蔵資料・公開対象 ／ 1件',{exact:true}).waitFor({timeout:8000});
 } finally {
  releaseIndex();
  await archive.unrouteAll({behavior:'wait'});
 }
 assert.equal(await catalog.locator('a:visible').count(),1);
 await catalog.getByRole('link',{name:/訂正欄/}).click();
 assert.match(await body(archive),/紙面抄録[\s\S]*当該記述を撤回/);
 const firstPrint=new URL(archive.url());
 firstPrint.pathname=firstPrint.pathname.replace(/\d{4}\/$/,'0009/');
 await archive.goto(firstPrint.href);
 assert.match(await body(archive),/服毒による自殺か/);
 const firstPrintCode=await archive.locator('.legacy-record-meta').innerText();
 await archive.getByRole('link',{name:'収蔵目録へ',exact:true}).click();
 await search(firstPrintCode.match(/NK-\d{4}-\d{4}/)[0]);
 await catalog.getByText('該当する資料はありません。',{exact:true}).waitFor();
 assert.equal(await catalog.locator('a:visible').count(),0);
 await archive.getByRole('link',{name:'資料照会室',exact:true}).click();
 await archive.getByRole('link',{name:/広報記録の保存/}).click();
 await until(archive,'広報記録の保存');
 const receiptNumber=(await body(archive)).match(/受領簿(\d{4})/)[1];
 await archive.goto(provider('archive','/room/records/'+receiptNumber+'/'));
 await until(archive,'健康管理記録・複写受領');
 const receipt=await body(archive);
 assert.doesNotMatch(receipt,/意思確認欄|署名画像|一時間以内/);
 const comparison=await document(page,receipt.match(/AH-2021-\d{3}/)[0]);
 const healthId=comparison.match(/HC-2021-\d{3}-R/)[0];
 await page.locator('#next-document-id').fill(healthId);
 await page.locator('.record-lookup button').click();
 await page.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
 return healthId;
}
async function verifyHealthRecord(page,id){
 await document(page,id);
 const chronology=page.getByRole('region',{name:'2021年11月3日'});
 const instruction=chronology.getByRole('row').filter({hasText:'08:05'});
 assert.match(await instruction.innerText(),/初稿作成指示/);
 assert.doesNotMatch(await instruction.innerText(),/本人による服用/);
 assert.match(await chronology.getByRole('row').filter({hasText:'時刻記載なし'}).innerText(),/本人による服用/);
 for(const extension of ['.pdf','-scan.jpg']){
  const filename=id+extension;
  const copy=await download(page,'a[href$="'+filename+'"]',filename);
  assert.deepEqual(copy.data,await fs.readFile('private/record-media/'+filename));
 }
}
function zipEntry(data,wanted='告発書.pdf'){let offset=0;while(data.readUInt32LE(offset)===0x04034b50){const size=data.readUInt32LE(offset+18),length=data.readUInt16LE(offset+26),extra=data.readUInt16LE(offset+28),name=data.subarray(offset+30,offset+30+length).toString('utf8'),start=offset+30+length+extra;if(name===wanted)return data.subarray(start,start+size);offset=start+size;}throw new Error('PDF missing');}
async function evidence(p,institution){await login(p,institution.id,institution.password);await document(p,'CH-2021-003');await p.getByRole('link',{name:'記録についての照会',exact:true}).click();await p.locator('#note').fill('原本との照合をお願いいたします。');await p.getByRole('button',{name:/照会を送信/}).click();await p.locator('a[href$="hozen.zip"]').waitFor();return download(p,'a[href$="hozen.zip"]','evidence.zip');}
async function submit(p,file){await p.locator('#title').fill('資料の保全について');await p.locator('#statement').fill('原本と移送の記録をご確認ください。');await p.locator('#archive').setInputFiles(file);await p.getByRole('button',{name:/資料を提出/}).click();await until(p,'資料を受領しました');}

async function recruitmentCopy(p,documentId,year){
 const text=await document(p,documentId);assert.match(text,/\/news\/\d{8}\//);
 const popup=p.waitForEvent('popup');await p.getByRole('link',{name:new RegExp('募集案内.*'+year+'年|当時の募集案内')}).click();const article=await popup;
 await article.locator('.notice-details').waitFor();assert.match(await body(article),/無償|負担/);assert.match(await body(article),/外出/);
 await article.screenshot({path:'.work/qa/'+mode+'-recruitment-'+year+'.png',fullPage:true});await article.close();return text;
}
async function newsInterface(p){
 await p.goto(main('/news/'));await p.locator('.news-result-count').filter({hasText:/件/}).waitFor();assert.equal(await p.locator('.news-rows>a:visible').count(),12);
 await p.locator('[name=year]').selectOption('2025');await p.locator('[name=kind]').selectOption('活動報告');await p.locator('.news-filters button').click();await p.locator('.news-result-count').filter({hasText:/件/}).waitFor();
 const rows=await p.locator('.news-rows>a:visible').evaluateAll(nodes=>nodes.map(n=>[n.dataset.newsYear,n.dataset.newsKind]));assert.ok(rows.length>0);assert.ok(rows.every(([year,kind])=>year==='2025'&&kind==='活動報告'));
 await p.locator('[name=kind]').selectOption('工房');await p.locator('.news-filters button').click();await p.getByText('該当するお知らせはありません。',{exact:true}).waitFor();
 await p.goto(main('/news/'));await p.locator('.news-pagination a').last().click();await p.locator('.news-result-count').filter({hasText:/件/}).waitFor();assert.ok(await p.locator('.news-rows a[href$="/news/20120401/"]:visible').count());
 for(const word of ['居住環境実証','生活環境継続試験','RE-2022-006']){await p.goto(main('/search/?q='+encodeURIComponent(word)));assert.equal(await p.locator('a[href$="/news/20160520/"],a[href$="/news/20220715/"]').count(),0);}
}

(async()=>{
 await fs.mkdir('.work/qa',{recursive:true});browser=await chromium.launch({headless:true,channel:'msedge'});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});let p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 if(mode==='pages'){
  let resume,requested;const gate=new Promise(resolve=>resume=resolve),started=new Promise(resolve=>requested=resolve);
  await p.route('**/assets/site-index.json',async route=>{requested();await gate;await route.continue();});
  const navigation=p.goto(main('/members/login/'),{waitUntil:'domcontentloaded'});await started;
  assert.equal(await p.locator('#member-id').isDisabled(),true);resume();await navigation;
  await p.locator('#member-id:enabled').waitFor();await p.unroute('**/assets/site-index.json');
 }
 await newsInterface(p);
 await p.goto(main('/news/20120401/'));assert.equal(await p.locator('a[href*="20120903"]').count(),0);await p.getByRole('link',{name:'施設名に込めた願い',exact:true}).click();assert.match(await body(p),/アスナロは、アスナロとして育つ/);await p.screenshot({path:'.work/qa/'+mode+'-identity.png',fullPage:true});
 await p.goto(main('/'));assert.equal(await p.locator('a[href*="floor-4f-2012"],img[src*="floor-4f-2012"]').count(),0);
 await p.locator('.index-growth').filter({hasText:'SEED'}).waitFor();const copyright=await p.locator('.fiction-footer-meta>small').boundingBox(),folio=await p.locator('.page-index').boundingBox();assert.ok(folio.x>copyright.x+copyright.width&&Math.abs(folio.y-copyright.y)<8);
 await p.goto(main('/gallery/0021/'));
 await p.getByRole('link',{name:'瀬尾灯さんに聞く、道具づくりの話',exact:true}).click();
 assert.match(await body(p),/来月/);
 await p.getByRole('link',{name:'春の製本相談の記録',exact:true}).click();
 assert.match(await body(p),/青井真澄さんが余った板/);
 await p.getByRole('link',{name:'吉野夏帆さんの制作の話',exact:true}).click();
 assert.match(await body(p),/青い布表紙の地図帳は、祖母のです/);
 assert.match(await body(p),/赤鉛筆/);
 assert.doesNotMatch(await body(p),/PN-2022-034|第3居住群|P-033/);
 const atlas=await p.getByRole('img',{name:/青い布表紙の地図帳/}).evaluate(async image=>{
  await image.decode();
  return image.naturalWidth;
 });
 assert.ok(atlas>=1100);
 await p.getByRole('link',{name:'青井真澄さんの修理と試作',exact:true}).click();
 assert.match(await body(p),/押さえ板/);
 await p.goBack();
 await p.goBack();
 await p.goBack();
 await p.getByRole('link',{name:'瀬尾灯さんの制作記録',exact:true}).click();
 let makerLoanId;
 assert.match(await body(p),/一般制作活動/);
 await p.goto(main('/gallery/0009/'));
 assert.match(await body(p),/部屋の並びを簡略化/);
 await p.getByRole('link',{name:'稲葉澪さんに聞く、案内図づくり',exact:true}).click();
 assert.match(await body(p),/曲がり角の幅を確かめる部分模型/);
 assert.match(await body(p),/2019年3月、当施設での利用登録を終了/);
 assert.doesNotMatch(await body(p),/B1・B-04|YH-2018-041-A/);
 await p.goto(main('/gallery/0005/'));assert.match(await body(p),/入居者紹介/);
 await p.goto(main('/search/?q='+encodeURIComponent('入居者紹介')));await p.locator('.search-results a[href$="/tenants/"]').waitFor();
 await p.goto(main('/visit/'));await p.locator('#main').getByRole('link',{name:'アクセス',exact:true}).click();await p.getByRole('heading',{name:'ページが見つかりません。'}).waitFor();
 const footer=await p.locator('.footer-links a').allTextContents();assert.ok(footer.indexOf('入居者紹介')<footer.indexOf('制作物ギャラリー'));
 await p.getByRole('navigation',{name:'メインナビゲーション'}).getByRole('link',{name:'入居者紹介',exact:true}).click();
 const visible=await p.locator('.tenant-id').allTextContents();const numbers=visible.map(t=>Number(t.match(/\d+/)[0]));const missing=Array.from({length:Math.max(...numbers)},(_,i)=>i+1).filter(n=>!numbers.includes(n));assert.equal(missing[0],3);
 const minamo=await company(p,String(missing[0]).padStart(4,'0'));const minamoId=ymd(minamo['入居日'])+minamo['登録番号'];assert.equal(minamoId,'201204010017');assert.equal(ymd(minamo['設立日']),'20080519');
 const activityPhoto=p.locator('[data-image-open$="minamo-desk.webp"]');
 await activityPhoto.getByText('写真を拡大',{exact:true}).waitFor();
 await activityPhoto.click();await p.getByRole('button',{name:'画像を拡大',exact:true}).click();await p.keyboard.press('Escape');
 const popup=p.waitForEvent('popup');await p.locator('.member-link').click();const member=await popup;member.on('pageerror',e=>errors.push(e.message));await p.close();p=member;
 await login(p,minamoId,ymd(minamo['設立日']));await p.getByRole('link',{name:'共同事業・連絡記録',exact:true}).click();await p.getByRole('link',{name:/生活道具・共同試作/}).click();await until(p,'生活道具・共同試作の連絡');makerLoanId=(await body(p)).match(/FAB-\d{4}-\d{3}/)[0];const loan=await document(p,makerLoanId),makerRecordId=loan.match(/YH-2022-\d{3}/)[0],friendRecordId=loan.match(/SA-2023-\d{3}/)[0];assert.match(loan,/同じ名前/);
 const evaluationManager=loan.match(/個票の取次：([^（]+)（評価担当）/)[1].trim();
 const clipping=await p.request.get(new URL(await p.getByRole('link',{name:/対外報道の切抜（2022年9月8日）/}).getAttribute('href'),p.url()).href);assert.equal(clipping.status(),200);const clippingPath='.work/qa/'+mode+'-missing-seo.pdf';await fs.writeFile(clippingPath,await clipping.body());const clippingText=execFileSync(process.env.ASUNARO_PYTHON||'python',['-c','from pypdf import PdfReader; import sys; print("".join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))',clippingPath],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}}).replace(/\s+/g,'');assert.match(clippingText,/瀬尾灯さん[（(]28[）)]/);assert.match(clippingText,/母の文乃/);
 await p.locator('#next-document-id').fill(makerRecordId);
 await p.locator('.record-lookup button').click();
 await p.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
await p.getByRole('link',{name:'共同事業・連絡記録',exact:true}).click();await p.getByRole('link',{name:/生活道具・共同試作/}).click();await until(p,'生活道具・共同試作の連絡');assert.match(await body(p),/焼き芋/);await p.getByRole('link',{name:'共同事業・連絡記録',exact:true}).click();await p.getByRole('link',{name:/小規模循環設備/}).click();await until(p,'小規模循環設備・共同試作');assert.match(await body(p),/赤い水/);
 await document(p,'YH-2013-014');await document(p,'YH-2016-032');
 const unlistedTenants=[];
 for(const number of missing)unlistedTenants.push(await company(p,String(number).padStart(4,'0')));
 const ordis=unlistedTenants.find(tenant=>tenant['代表者'].replace(/\s+/g,'')===evaluationManager);
 assert.ok(ordis);await login(p,ymd(ordis['入居日'])+ordis['登録番号'],ymd(ordis['設立日']));
 const originalConsent=await document(p,'CONS-2016-005');await recruitmentCopy(p,originalConsent.match(/RE-2016-\d{3}/)[0],2016);
 assert.match(await document(p,makerRecordId),/瀬尾\s*灯/);
 const inaba=await document(p,'YH-2018-041-A');
 assert.match(inaba,/稲葉 澪/);
 assert.match(inaba,/今は、出る道だけ教えてください/);
 const inabaPrint=await download(p,'a[href$="YH-2018-041-A.pdf"]','inaba-individual.pdf');
 const inabaScan=await download(p,'a[href$="YH-2018-041-A-scan.jpg"]','inaba-individual.jpg');
 assert.deepEqual(inabaPrint.data,await fs.readFile('private/record-media/YH-2018-041-A.pdf'));
 assert.deepEqual(inabaScan.data,await fs.readFile('private/record-media/YH-2018-041-A-scan.jpg'));
 const report=await document(p,'YH-2018-041');
 assert.equal(report.match(/管理責任者\s+([^\n]+)/)[1].trim(),evaluationManager);
 const observation=await document(p,inaba.match(/YH-2019-\d{3}/)[0]);
 assert.match(observation,/『現在地』から線を指でたどると、この扉です/);
 const westId=observation.match(/MX-\d{4}-\d{3}/)[0];
 const westLedger=await document(p,westId);
 assert.match(westLedger,/受付表示「410」/);
 assert.match(westLedger,/受付表示「412」/);
 const oldRoom=await p.locator('table tr').filter({hasText:'通路側の扉'}).locator('td').first().innerText();
 const westScan=await download(p,'a[href$="'+westId+'-scan.jpg"]','west-ledger.jpg');
 assert.deepEqual(westScan.data,await fs.readFile('private/record-media/'+westId+'-scan.jpg'));
 const originalPlan=westLedger.match(/図面(A4-\d{2})/)[1];
 await p.goto(main('/search/?q='+encodeURIComponent(originalPlan)));
 await p.getByRole('link',{name:/開設時の区画配置について/}).click();
 await p.locator('img[src*="floor-4f-2012.svg"]').waitFor();
 await p.screenshot({path:'.work/qa/'+mode+'-old-map.png',fullPage:true});
 await p.getByRole('button',{name:'サイト内検索を開く'}).click();
 const siteSearch=p.locator('.search-dialog');
 await siteSearch.getByRole('searchbox').fill(oldRoom+'号室');
 await siteSearch.getByRole('button',{name:'検索',exact:true}).click();
 await p.locator('.search-results').getByRole('link',{name:/トリム部品設計/}).click();
 assert.match(await p.locator('#activities').innerText(),/2019\.09\.20[\s\S]*名札を受付へ返しました/);
 await p.goto(main('/news/'));assert.equal(await p.locator('.news-rows a[href*="20120416"]').count(),0);assert.equal(await p.locator('.news-rows a[href*="20120903"]').count(),0);
 const fabrication=await document(p,observation.match(/FAB-2020-\d{3}/)[0]);
 assert.match(fabrication,/7月10日の指示[\s\S]*7月13日|7月13日[\s\S]*7月10日の指示/);
 assert.match(fabrication,/外すときは係員を呼ぶ/);
 const handoverId=fabrication.match(/AH-2017-\d{3}/)[0];
 const ashitaRegistration=fabrication.match(/登録(\d{4})/)[1];
 const ashita=unlistedTenants.find(tenant=>tenant['登録番号']===ashitaRegistration);
 assert.ok(ashita);
 await p.locator('#next-document-id').fill(handoverId);await p.locator('.record-lookup button').click();
 await p.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
 await login(p,ymd(ashita['入居日'])+ashitaRegistration,ymd(ashita['設立日']));
 const handover=await document(p,handoverId);
 assert.match(handover,/2020年7月15日[\s\S]*取付先欄は空欄/);
 const handoverPdf=await download(p,'a[href$="'+handoverId+'.pdf"]','handover.pdf');
 assert.deepEqual(handoverPdf.data,await fs.readFile('private/record-media/'+handoverId+'.pdf'));
 const ticket=handover.match(/閲覧票番号\s+(\S+)/)[1],code=handover.match(/照会符号\s+(\S+)/)[1];
 const archivePopup=p.waitForEvent('popup');await p.getByRole('link',{name:/旧基盤・資料照会室/}).click();const archive=await archivePopup;archive.on('pageerror',e=>errors.push(e.message));
 await archive.locator('#ticket').fill(ticket);await archive.locator('#inquiry-code').fill(code);await archive.getByRole('button',{name:'照会室へ'}).click();await until(archive,'移管・保守受領簿');
 if(process.env.PLAYTEST_LAB==='1')await require('./playtest-console.cjs').exerciseConsole(archive,{url:provider('archive','/room/console/'),mode,prefix:'.work/qa/'+mode+'-lab-full'});
 const healthId=await traceNewspaper(p,archive);
 await archive.goto(provider('archive','/room/records/0005/'));await until(archive,'端末と資料更新の整理');assert.match(await body(archive),/0006/);await archive.goto(provider('archive','/room/records/0006/'));await until(archive,'機関台帳');const registry=await body(archive);
 const institution={id:ymd(registry.match(/加入日([^。]+)/)[1])+registry.match(/台帳番号は(\d{4})/)[1],password:ymd(registry.match(/法人設立日([^。]+)/)[1])};await archive.close();
 await login(p,institution.id,institution.password);
 const refusal=await document(p,'RG-2007-011');
 const originId=refusal.match(/OR-2006-\d{3}/)[0];
 assert.match(await document(p,originId),/再開案に同意しない/);
 const founding=await document(p,'CO-2010-001');
 const motherId=founding.match(/FUM-\d{4}-\d{3}/)[0];
 assert.match(await document(p,motherId),/もう使わない/);
 const individual=await document(p,makerRecordId);
 const inquiryId=individual.match(/FAM-\d{4}-\d{3}/)[0];
 assert.match(await document(p,inquiryId),/本人の継続意思を裏付ける原本/);
 assert.match(await document(p,friendRecordId),/死亡/);
 assert.match(await document(p,'YH-2022-017'),/継舟/);
 const originalOffer=await recruitmentCopy(p,'RE-2022-006',2022);
 const examination=await document(p,originalOffer.match(/OBS-2022-\d{3}/)[0]);
 const equipment=await document(p,examination.match(/ENV-2022-\d{3}/)[0]);
 const incident=await document(p,equipment.match(/EV-2022-\d{3}/)[0]);
 assert.match(incident,/吉野夏帆/);
 assert.match(incident,/工房の修理受付は完了に変更/);
 const summary=await document(p,incident.match(/GR-2022-\d{3}/)[0]);
 assert.match(summary,/自発的淘汰/);
 const intakeId=incident.match(/PN-2022-\d{3}/)[0];
 const intake=await document(p,intakeId);
 assert.match(intake,/青い布表紙の地図帳（別包み）/);
 assert.match(intake,/料理帳の複写/);
 assert.match(intake,/夏帆さんの本を返却済みにしないでください/);
 assert.match(intake,/預かり票の返却欄は空欄/);
 for(const extension of ['.pdf','-scan.jpg']){
  const file=intakeId+extension;
  const copy=await download(p,'a[href$="'+file+'"]',file);
  assert.deepEqual(copy.data,await fs.readFile('private/record-media/'+file));
 }
 const personalReviewId=summary.match(/QC-2026-\d{3}/)[0];
 await p.locator('#next-document-id').fill(personalReviewId);
 await p.locator('.record-lookup button').click();
 await p.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
 await verifyHealthRecord(p,healthId);
 await document(p,'CH-2021-003');
 const operations=await document(p,'OPS-2026-084');
 const eastId=operations.match(/PUB-2023-\d{3}/)[0];
 const eastWork=await document(p,eastId);
 assert.match(eastWork,/東側・会議室Aへの通路/);
 const eastPdf=await download(p,'a[href$="'+eastId+'.pdf"]','east-work.pdf');
 assert.deepEqual(eastPdf.data,await fs.readFile('private/record-media/'+eastId+'.pdf'));
 await document(p,'FAB-2026-018');
 await p.getByRole('link',{name:'記録についての照会',exact:true}).click();await p.getByRole('button',{name:/照会を送信/}).click();await p.locator('a[href$="hozen.zip"]').waitFor();
 const original=await download(p,'a[href$="hozen.zip"]','original.zip');const pdfPath='.work/qa/'+mode+'-statement.pdf';await fs.writeFile(pdfPath,zipEntry(original.data));
 const pdfText=execFileSync(process.env.ASUNARO_PYTHON||'python',['-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))',pdfPath],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 const personName=pdfText.match(/申出者\s+([^\n]+)/)[1].trim(),personId=pdfText.match(/会員ID\s+([A-Z0-9]+)/)[1];
 await p.goto(main('/search/?q='+encodeURIComponent(personName.replace(/\s+/g,''))));await p.getByRole('link',{name:/制作と活動の記録/}).click();const personalText=await body(p),birth=ymd(personalText);await login(p,personId,birth);await p.getByRole('link',{name:'個人保存資料',exact:true}).first().click();
 await document(p,'AS-2024-002');await document(p,'AS-2026-014');await document(p,'TR-2026-011');const complete=await download(p,'a[href$="complete.zip"]','complete.zip');const groupRecords=JSON.parse(zipEntry(complete.data,'実験記録.json').toString());const originalDocuments=JSON.parse(zipEntry(complete.data,'文書原本.json').toString()).documents;assert.ok(originalDocuments.some(d=>d.id==='CH-2021-003'&&d.entries.length));assert.ok(originalDocuments.some(d=>d.id==='EV-2022-091'&&d.tables.length));assert.ok(originalDocuments.every(d=>!('roles' in d)&&!('audit' in d)));const measurementSheets=JSON.parse(zipEntry(complete.data,'適性測定原票.json').toString());assert.equal(measurementSheets.sheets.length,5);assert.ok(!JSON.stringify(measurementSheets).includes('星をみる灯'));assert.equal(groupRecords.closed_group.victim.id,'P-033');assert.ok(groupRecords.closed_group.sources.includes('GR-2022-009'));assert.ok(groupRecords.subjects.some(subject=>subject.id==='P-031'));assert.match(await document(p,personalReviewId),/本人の移送承諾なし/);await p.screenshot({path:'.work/qa/'+mode+'-group-crosscheck.png',fullPage:true});await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.screenshot({path:'.work/qa/'+mode+'-group-mobile.png',fullPage:true});await p.setViewportSize({width:1440,height:1000});const privateRecord=await document(p,'AS-2024-002'),friendPrivateId=privateRecord.match(/AS-2023-\d{3}/)[0];assert.match(await document(p,friendPrivateId),/誰が決めてもいい形/);assert.match(await document(p,'P034-2026-102'),/いま帰りたい/);await document(p,'AS-2026-021');await document(p,'AS-2026-019');if(process.env.PLAYTEST_LAB==='1'){await p.locator('[data-lab-assessment]:visible').waitFor();assert.equal(await p.locator('[data-lab-assessment-handle]').innerText(),'星をみる灯');}await p.locator('[data-reading-ledger="combined"] .reading-list li:visible').first().waitFor();const routeNames=await p.locator('[data-reading-ledger="combined"] .reading-source').allTextContents();assert.ok(routeNames.some(x=>x.includes('ミナモ')));assert.ok(routeNames.some(x=>x.includes('オルディス')));await p.screenshot({path:'.work/qa/'+mode+'-reader-path.png',fullPage:true});await document(p,'EA-2026-009');await p.getByRole('link',{name:/東都研究監査室・記録保全受付/}).click();
 const healthCopy=await fs.readFile('private/record-media/HC-2021-031-R.pdf');
 assert.deepEqual(zipEntry(complete.data,'HC-2021-031-R.pdf'),healthCopy);
 assert.ok(originalDocuments.some(record=>record.id==='HC-2021-031-R'&&record.signatureClips.length===2));
 assert.ok(!originalDocuments.some(record=>['AH-2017-009','PUB-2023-014','FLOW-2013-007'].includes(record.id)));
 assert.match(pdfText.replace(/\s/g,''),/確認欄についての照会は回答が保留/);
 await submit(p,original.file);
 const auditReceipt=p.url();
 assert.match(await body(p),/EA-2026-1102/);
 await p.getByRole('link',{name:'追加資料を提出する',exact:true}).click();
 await p.getByText('受付番号：EA-2026-1102',{exact:true}).waitFor();
 const damaged=Buffer.from(complete.data);
 damaged[damaged.indexOf('%PDF-')+12]^=1;
 await p.locator('#title').fill('移送関係資料');
 await p.locator('#statement').fill('追加の原本を提出します。');
 await p.locator('#archive').setInputFiles({name:'原本および移送関係資料.zip',mimeType:'application/zip',buffer:damaged});
 await p.getByRole('button',{name:/資料を提出/}).click();
 await p.getByText(/添付資料を確認できませんでした/).waitFor();
 await submit(p,complete.file);assert.match(await body(p),/外部への資料移送/);assert.match(await body(p),/本人の希望を個別に確認し、施設外へ移動/);assert.match(await body(p),/母と確かめながら続きを作ります/);if(process.env.PLAYTEST_LAB==='1'){await p.locator('[data-lab-thanks]:visible').waitFor();assert.equal(await p.locator('[data-lab-thanks-name]').innerText(),'星をみる灯');}else assert.equal(await p.locator('[data-lab-thanks]:visible').count(),0);await p.screenshot({path:'.work/qa/'+mode+'-end3.png',fullPage:true});
 await login(p,institution.id,institution.password);
 await p.goto(auditReceipt);await until(p,'資料を受領しました');
 assert.match(await body(p),/施設外へ移動/);
 assert.match(await body(p),/B1・B-04で所在を確認した方にも/);
 assert.match(await body(p),/吉野さんの地図帳については、ご家族に返却先を確認/);
 const wrongReceipt=new URL(auditReceipt);wrongReceipt.searchParams.set('case','wrong');
 await p.goto(wrongReceipt.href);await until(p,'記録保全受付');
 assert.doesNotMatch(await body(p),/施設外へ移動/);
 await p.goto(main('/'));await until(p,'施設の利用を');
 assert.match(await p.locator('.visit-band').innerText(),/見学の受付を休止/);
 await p.goto(main('/visit/'));await p.getByRole('heading',{name:'見学の受付を休止しております。'}).waitFor();
 assert.doesNotMatch(await body(p),/平日9時から17時まで/);
 for(const ending of ['end1','end2']){
  const branch=await browser.newContext({viewport:{width:1200,height:900},acceptDownloads:true});const q=await branch.newPage();q.on('pageerror',e=>errors.push(e.message));const received=await evidence(q,institution);
  if(ending==='end1'){await q.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).click();await submit(q,received.file);assert.match(await body(q),/新たな研究支援事業/);await q.goto(main('/members/reservations/'));await until(q,'利用申請・予約');await q.getByText('受付を休止しております。',{exact:true}).waitFor();}
  else{
   const entry=await q.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).getAttribute('href');
   const caseQuery=new URL(entry,q.url()).search;
   await q.goto(provider('audit','/receive/'+caseQuery));
   await submit(q,received.file);const pending=q.url();
   await q.goto(main('/members/contact/received/'));
   await until(q,'運営事務局へのお問い合わせ');await q.locator('#subject').fill('資料の確認について');await q.locator('#message').fill('原本をご確認ください。');await q.locator('#attachment').setInputFiles(received.file);await q.getByRole('button',{name:/送信する/}).click();await until(q,'お問い合わせを受け付けました');
   await q.goto(pending);await until(q,'資料を受領しました');
   assert.match(await body(q),/追加受付は終了しました/);
   assert.equal(await q.getByRole('link',{name:'追加資料を提出する',exact:true}).count(),0);
   await q.goto(main('/members/inquiry/?record=CH-2021-003'));
   await q.getByText(/この窓口での受付は終了しました/).waitFor();
   await q.goto(main('/members/messages/'));await q.getByText('担当者の変更',{exact:true}).waitFor();await q.goto(main('/people/asakura-tsumugi/'));await until(q,'ページが見つかりません');}
  await q.screenshot({path:'.work/qa/'+mode+'-'+ending+'.png',fullPage:true});await branch.close();
 }
 const mobile=await browser.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));for(const route of ['/','/about/identity/','/about/emblem/','/visit/','/workshop/stories/seo-akari/','/people/seo-akari/','/people/seo-fumino/','/people/saegusa-ritsu/','/gallery/0005/','/news/20220218/','/news/20261028/','/news/20220715/','/news/20160520/','/news/20120416/']){await mobile.goto(main(route));assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route);}
 await mobile.goto(main('/about/emblem/'));await mobile.screenshot({path:'.work/qa/'+mode+'-emblem-mobile.png',fullPage:true});await mobile.close();assert.deepEqual(errors,[]);await context.close();
 console.log(`Playtest passed (${mode}): clue-led account derivation, legacy ticket, hidden map, PDF identity, incomplete-evidence check, 3 endings, desktop/mobile.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
