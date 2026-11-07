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
 }else{
  if (!await p.locator('#document-id').count()) await p.goto(main('/members/records/'));
  await p.locator('#document-id').fill(id);await p.locator('.record-form button').click();
 }
 await p.locator('.document-result').waitFor();await p.locator('.document-result').click();await p.locator('#next-document-id').waitFor();return body(p);
}
async function company(p,number){
 await p.goto(main('/tenants/'+number+'/'));await p.locator('#profile .detail-list').waitFor();
 return p.locator('#profile .detail-list>div').evaluateAll(rows=>Object.fromEntries(rows.map(r=>[r.querySelector('dt').textContent,r.querySelector('dd').textContent])));
}
async function download(p,selector,name){const waiting=p.waitForEvent('download');await p.locator(selector).click();const file=await waiting;const target='.work/qa/'+mode+'-'+name;await file.saveAs(target);return {file:target,data:await fs.readFile(target)};}
async function verifyPausedGuide(p,path,content){
 await p.goto(main(path));
 const status=p.locator('[data-site-operation="paused"]');
 await status.waitFor();
 assert.equal(await status.innerText(),'一般利用休止中');
 await p.locator('.facility-use-pause').getByRole('link',{name:'休止のお知らせ',exact:true}).waitFor();
 assert.match(await body(p),content);
 assert.equal(await p.locator('main a[href*="/members/reservations/"]').count(),0);
 if(path.includes('#')){
  const target=p.locator(new URL(main(path)).hash);
  const header=p.locator('.site-header');
  try{
   await p.waitForFunction(()=>{
    const top=document.getElementById(location.hash.slice(1))?.getBoundingClientRect().top;
    const bottom=document.querySelector('.site-header').getBoundingClientRect().bottom;
    return top>=bottom-1&&top<innerHeight/2;
   });
  }catch(error){
   console.error('Paused guide fragment:',path,await target.boundingBox(),await header.boundingBox());
   throw error;
  }
 }
 if(p.viewportSize().width<=390){
  const [label,member]=await Promise.all([status.boundingBox(),p.locator('.site-header .member-link').boundingBox()]);
  assert.ok(label.y>=member.y+member.height-1,'mobile status overlaps member navigation');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }
}
async function checkArchivePdf(archive,filename,label){
 const pdf=archive.getByRole('link',{name:label});
 assert.ok((await pdf.getAttribute('href')).endsWith('/'+filename));
 assert.equal(await pdf.getAttribute('target'),'_blank');
 const response=await archive.request.get(new URL(await pdf.getAttribute('href'),archive.url()).href);
 assert.ok(response.ok(),filename);
 assert.deepEqual(await response.body(),await fs.readFile('public/assets/archive/'+filename));
}

async function traceArchivedPublicNotices(archive){
 await archive.getByRole('link',{name:'公開画面の保存',exact:true}).click();
 await archive.getByRole('link',{name:/2017年7月14日取得/}).click();
 const snapshot=archive.locator('.snapshot-notice-stamp');
 await archive.getByRole('link',{name:'あすなろ産業支援交流施設を開設いたしました',exact:true}).click();
 assert.match(await snapshot.innerText(),/原掲載 2012\.04\.01[\s\S]*取得 2017\.07\.14[\s\S]*採録範囲 本文冒頭/);
 assert.equal(await archive.locator('.snapshot-notice a').count(),0);
 await archive.getByRole('link',{name:'保存事業案内へ',exact:true}).click();
 await archive.getByRole('link',{name:'開設記念の模型を展示いたしました',exact:true}).click();
 assert.match(await snapshot.innerText(),/原掲載 2012\.09\.03[\s\S]*採録範囲 本文と掲載写真/);
 await archive.getByRole('img',{name:'薄板を組み合わせた開設記念の木製ボート'}).evaluate(image=>image.decode());
 await archive.getByRole('link',{name:'保存事業案内へ',exact:true}).click();
 await archive.getByRole('link',{name:'居住環境実証の第2期を開始',exact:true}).click();
 assert.match(await snapshot.innerText(),/原掲載 2016\.10\.03[\s\S]*取得 2017\.07\.14/);
 assert.match(await archive.locator('.snapshot-notice').innerText(),/10月3日から17日まで[\s\S]*朝夕の聞き取り[\s\S]*期間の途中でも参加を終了できます/);
 await archive.screenshot({path:'.work/qa/'+mode+'-captured-notice.png',fullPage:true});
}
async function traceHistoricalRegisters(archive){
 await archive.getByRole('link',{name:'収蔵目録',exact:true}).click();
 const catalog=archive.locator('.legacy-catalog');
 assert.equal(await catalog.locator('a[href$="/0004/"]').count(),0);
 await catalog.getByRole('link',{name:/第二種国土継続研究・実施概要/}).click();
 const overview=await body(archive);
 const freezeCode=overview.match(/KS-1945-\d{2}/)[0];
 await archive.getByRole('link',{name:'収蔵目録へ',exact:true}).click();
 await catalog.getByRole('link',{name:new RegExp(freezeCode)}).click();
 const freeze=await body(archive);
 assert.match(freeze,/新規の観察と試験を停止[\s\S]*研究の継続を目的とする移管を禁じる/);
 await checkArchivePdf(archive,'ks-1945-02.pdf',/処理簿の複写（PDF）/);
 await archive.locator('.archival-scan img').evaluate(img=>img.decode());
 const accessionCode=freeze.match(/KS-1986-\d{2}/)[0];
 await archive.getByRole('link',{name:'収蔵目録へ',exact:true}).click();
 await catalog.getByRole('link',{name:new RegExp(accessionCode)}).click();
 assert.match(await body(archive),/実施概要1冊、研究凍結処理簿1綴を受領[\s\S]*今回の受入に含まれない/);
 await checkArchivePdf(archive,'ks-1986-04.pdf',/受領記録の複写（PDF）/);
}

async function traceNewspaper(page,archive){
 await archive.getByRole('link',{name:'収蔵目録',exact:true}).click();
 const catalog=archive.locator('.legacy-catalog');
 await catalog.getByRole('link',{name:/公式告知/}).click();
 assert.match(await body(archive),/病気のため逝去/);
 await archive.getByRole('link',{name:/施設サイトのお知らせ/}).click();
 assert.equal(archive.url(),main('/news/20211103/'));
 assert.match(await body(archive),/病気のため/);
 await archive.goBack();
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
 assert.match(await body(archive),/紙面抄録[\s\S]*地域版初刷[\s\S]*当該記述を撤回[\s\S]*後刷では、当該記述を削除/);
 await checkArchivePdf(archive,'younagi-20211105.pdf',/11月5日地域版 訂正欄（PDF）/);
 await checkArchivePdf(archive,'younagi-20211104-late.pdf',/11月4日地域版 後刷（PDF）/);
 const correctionText=archive.getByRole('region',{name:'11月5日地域版 訂正欄',exact:true});
 const latePrint=archive.getByRole('region',{name:'11月4日地域版 後刷',exact:true});
 assert.equal(await correctionText.getByRole('article').count(),0);
 assert.equal(await latePrint.getByRole('article').count(),0);
 await correctionText.getByText('11月5日地域版 訂正欄の本文を読む',{exact:true}).click();
 assert.match(await correctionText.getByRole('article').innerText(),/区別が不十分[\s\S]*経緯を引き続き確認/);
 await latePrint.getByText('11月4日地域版 後刷の本文を読む',{exact:true}).click();
 const lateText=await latePrint.getByRole('article').innerText();
 assert.match(lateText,/施設が逝去を公表[\s\S]*共同事業の記録について運営側に説明を求めていた/);
 assert.doesNotMatch(lateText,/服毒による自殺か|本人の服用による可能性/);
 assert.equal(await archive.locator('a[href$="/0009/"], a[href$="/younagi-20211104.pdf"]').count(),0);
 const firstPrint=new URL(archive.url());
 firstPrint.pathname=firstPrint.pathname.replace(/\d{4}\/$/,'0009/');
 await archive.goto(firstPrint.href);
 assert.match(await body(archive),/服毒による自殺か/);
 await checkArchivePdf(archive,'younagi-20211104.pdf',/11月4日地域版 初刷（PDF）/);
 await archive.getByText('11月4日地域版 初刷の本文を読む',{exact:true}).click();
 assert.match(await archive.locator('.paper-transcript').innerText(),/服毒による自殺か[\s\S]*事務局は本紙取材に、本人の服用による可能性/);
 const correctionLink=archive.getByRole('link',{name:'翌11月5日地域版の訂正欄',exact:true});
 assert.match(await correctionLink.getAttribute('href'),/\/collections\/items\/0010\/$/);
 const firstPrintCode=await archive.locator('.legacy-record-meta').innerText();
 await archive.getByRole('link',{name:'収蔵目録へ',exact:true}).click();
 await search(firstPrintCode.match(/NK-\d{4}-\d{4}/)[0].replaceAll('-','−'));
 await archive.getByText('収蔵資料・公開対象 ／ 1件',{exact:true}).waitFor();
 const backPrintResult=catalog.locator('a:visible');
 assert.equal(await backPrintResult.count(),1);
 assert.match(await backPrintResult.getAttribute('href'),/\/collections\/items\/0010\/$/);
 assert.match(await backPrintResult.innerText(),/同封　11月4日地域版 後刷（NK-2021-1104）/);
 assert.equal(await catalog.locator('a[href$="/0009/"]').count(),0);
 await search('11月4日地域版 初刷');
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
 const comparisonId=receipt.match(/AH-2021-\d{3}/)[0];
 const comparison=await document(page,comparisonId);
 assert.match(comparison,/初刷・後刷（別台紙）/);
 assert.match(comparison,/後刷の発行時刻は紙面に記載なし/);
 const filename=comparisonId+'.pdf';
 const copy=await download(page,'a[href$="'+filename+'"]',filename);
 assert.deepEqual(copy.data,await fs.readFile('private/record-media/'+filename));
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
 const filtered=p.url();
 await p.locator('.news-rows>a:visible').first().click();
 await p.getByRole('link',{name:'お知らせ一覧へ',exact:true}).click();
 await p.waitForURL(filtered);
 assert.equal(await p.locator('[name=year]').inputValue(),'2025');
 assert.equal(await p.locator('[name=kind]').inputValue(),'活動報告');
 await p.locator('[name=kind]').selectOption('工房');await p.locator('.news-filters button').click();await p.getByText('該当するお知らせはありません。',{exact:true}).waitFor();
 await p.goto(main('/news/'));await p.locator('.news-pagination a').last().click();await p.locator('.news-result-count').filter({hasText:/件/}).waitFor();
 const lastPage=p.url();
 await p.locator('.news-rows a[href$="/news/20120401/"]:visible').click();
 await p.getByRole('link',{name:'お知らせ一覧へ',exact:true}).click();
 await p.waitForURL(lastPage);
 assert.ok(await p.locator('.news-rows a[href$="/news/20120401/"]:visible').count());
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
 assert.match(await body(p),/中央エレベーターから受付まで[\s\S]*左に曲がる/);
 await p.getByRole('link',{name:'稲葉澪さんに聞く、案内図づくり',exact:true}).click();
 assert.match(await body(p),/線の太さや点の間隔を比べた試し刷り/);
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
 await login(p,minamoId,ymd(minamo['設立日']));
 const workshopShare=p.locator('.member-workshop-note');
 assert.match(await workshopShare.innerText(),/2026\.10\.30[\s\S]*返却窓口の変更[\s\S]*ご本人に品物をお渡しした日/);
 assert.doesNotMatch(await workshopShare.innerText(),/FAB-2022-071|P-034|B-07/);
 await workshopShare.getByRole('link',{name:'当時の共同試作の連絡'}).click();
 await until(p,'生活道具・共同試作の連絡');
 const workshopConversation=await p.locator('.project-thread').innerText();
 assert.match(workshopConversation,/焼き芋[\s\S]*川瀬 修邦[\s\S]*金曜の点検[\s\S]*作ってほしいところに付箋[\s\S]*料理帳の写し[\s\S]*貸出・返却票（FAB-2022-071）[\s\S]*受取欄はまだ空けて/);
 const [interview] = await Promise.all([p.waitForEvent('popup'),p.getByRole('link',{name:/母の字で、また手紙を/}).click()]);
 await interview.getByRole('heading',{level:1,name:'母の字で、また手紙を。瀬尾灯さんの道具づくり'}).waitFor();
 assert.match(await body(interview),/来月、家で使ってもらった様子を載せたい/);
 await interview.close();
 assert.doesNotMatch(workshopConversation,/YH-2022-034|SA-2023-012|P-034|B-07/);
 makerLoanId=workshopConversation.match(/FAB-\d{4}-\d{3}/)[0];
 await p.getByRole('navigation',{name:'共同事業の関連ページ'}).getByRole('link',{name:'研究資料照会'}).click();
 assert.equal(await p.locator('#document-id').inputValue(),'');
 const loan=await document(p,makerLoanId);
 const makerRecordId=loan.match(/YH-2022-\d{3}/)[0],friendRecordId=loan.match(/SA-2023-\d{3}/)[0];
 assert.match(loan,/同じ名前/);
 assert.match(loan,/工房の貸出管理は完了として処理。本人への引渡し日は未記入/);
 assert.doesNotMatch(loan,/P-034|B-07|居住実証/);
 const loanItems=p.getByRole('region',{name:'貸出・預かり品'});
 assert.match(await loanItems.getByRole('row').filter({hasText:'読書補助具の試作'}).getByRole('cell').last().innerText(),/8月19日.*施設受付/);
 for (const item of ['型紙','料理帳']) assert.equal(await loanItems.getByRole('row').filter({hasText:item}).getByRole('cell').last().innerText(),'');
 const loanFilename=makerLoanId+'.pdf';
 const loanCopy=await download(p,'a[href$="'+loanFilename+'"]',loanFilename);
 assert.deepEqual(loanCopy.data,await fs.readFile('private/record-media/'+loanFilename));
 const evaluationManager=loan.match(/個票の取次：([^（]+)（評価担当）/)[1].trim();
 const clippingLink=p.getByRole('link',{name:/対外報道の切抜（2022年9月8日）/});
 assert.equal(await clippingLink.getAttribute('target'),'_blank');
 assert.match(await clippingLink.innerText(),/PDF・別タブ/);
 const clipping=await p.request.get(new URL(await clippingLink.getAttribute('href'),p.url()).href);
 assert.equal(clipping.status(),200);
 const clippingPath='.work/qa/'+mode+'-missing-seo.pdf';
 await fs.writeFile(clippingPath,await clipping.body());
 const clippingText=execFileSync(process.env.ASUNARO_PYTHON||'python',['-c','from pypdf import PdfReader; import sys; print("".join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))',clippingPath],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}}).replace(/\s+/g,'');
 const clippingDetails=p.locator('.record-clipping details');
 assert.equal(await clippingDetails.getAttribute('open'),null);
 const clippingToggle=clippingDetails.getByText('切抜の本文を読む',{exact:true});
 const originalPage=p.url();
 await clippingToggle.click();
 const transcript=clippingDetails.getByRole('article',{name:'自助具作る女性、所在分からず'});
 await transcript.waitFor();
 assert.equal(p.url(),originalPage);
 const paragraphs=await transcript.locator('p:not([class])').allTextContents();
 assert.equal(paragraphs.length,5);
 for(const paragraph of paragraphs)assert.ok(clippingText.includes(paragraph.replace(/\s+/g,'')),paragraph);
 await clippingToggle.click();
 assert.equal(await clippingDetails.getAttribute('open'),null);
 await p.locator('#next-document-id').fill(makerRecordId);
 await p.locator('.record-lookup button').click();
 await p.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
await p.getByRole('link',{name:'共同事業・連絡記録',exact:true}).click();await p.getByRole('link',{name:/生活道具・共同試作/}).click();await until(p,'生活道具・共同試作の連絡');assert.match(await body(p),/焼き芋/);await p.getByRole('link',{name:'共同事業・連絡記録',exact:true}).click();await p.getByRole('link',{name:/小規模循環設備/}).click();await until(p,'小規模循環設備・共同試作');assert.match(await body(p),/赤い水/);
 await document(p,'YH-2013-014');await document(p,'YH-2016-032');
 const tenantSearch=await context.newPage();
 tenantSearch.on('pageerror',e=>errors.push(e.message));
 await tenantSearch.setViewportSize({width:320,height:844});
 await tenantSearch.emulateMedia({reducedMotion:'reduce'});
 await tenantSearch.goto(main('/search/?q='+encodeURIComponent(evaluationManager)));
 const partner=tenantSearch.locator('.search-results').getByRole('link',{name:/ライテック材料評価/});
 await partner.click();
 const partnerPage=Number(tenantSearch.url().match(/\/tenants\/(\d+)\/$/)[1]);
 assert.match(await tenantSearch.locator('#activities').innerText(),new RegExp('同じ日に入居した'+evaluationManager.split('').join('\\s*')));
 const partnerJoin=await tenantSearch.locator('#profile .detail-list div').filter({hasText:'入居日'}).locator('dd').innerText();
 await tenantSearch.getByRole('link',{name:'入居者紹介へ',exact:true}).click();
 const preceding=tenantSearch.locator('.tenant-card').filter({hasText:'ライテック材料評価'});
 const following=preceding.locator('xpath=following-sibling::a[1]');
 await tenantSearch.waitForFunction(()=>{
  const current=document.querySelector('.tenant-card:target'),next=current?.nextElementSibling;
  return next && current.getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom
   && next.getBoundingClientRect().bottom<=innerHeight;
 });
 assert.ok((await following.locator('small').innerText()).startsWith(partnerJoin.slice(0,4)));
 const followingPage=Number((await following.locator('.tenant-id').innerText()).match(/\d+/)[0]);
 const possible=missing.filter(number=>number>partnerPage&&number<followingPage);
 assert.equal(possible.length,1);
 const ordis=await company(tenantSearch,String(possible[0]).padStart(4,'0'));
 assert.equal(ordis['代表者'].replace(/\s+/g,''),evaluationManager);
 assert.equal(ordis['入居日'],partnerJoin);
 assert.match(await tenantSearch.locator('#activities').innerText(),/小型操作盤の配置試験[\s\S]*音が聞こえにくい場所での警報表示/);
 await tenantSearch.close();
 await login(p,ymd(ordis['入居日'])+ordis['登録番号'],ymd(ordis['設立日']));
 const originalConsent=await document(p,'CONS-2016-005');
 assert.match(originalConsent,/その都度ご承諾/);
 const consentCopy=await download(p,'a[href$="CONS-2016-005.pdf"]','consent-copy.pdf');
 assert.deepEqual(consentCopy.data,await fs.readFile('private/record-media/CONS-2016-005.pdf'));
 await recruitmentCopy(p,originalConsent.match(/RE-2016-\d{3}/)[0],2016);
 await p.locator('.member-sidebar').getByRole('link',{name:'共同事業・連絡記録'}).click();
 await p.getByRole('link',{name:/居住環境実証・説明資料の確認/}).click();
 await until(p,'居住環境実証・説明資料の確認');
 assert.match(await body(p),/17時に受付を通ってお帰り[\s\S]*来週火曜の工房予約はそのまま/);
 await p.setViewportSize({width:390,height:844});
 const makerEvaluation=await document(p,makerRecordId);
 assert.match(makerEvaluation,/瀬尾\s*灯[\s\S]*帰宅希望として受領/);
 assert.doesNotMatch(makerEvaluation,/B-07|2026年|現所在/);
 const shortTrial=p.getByRole('region',{name:'8月19日の短期試用票・本人控え'});
 assert.match(await shortTrial.getByRole('row').filter({hasText:'お帰りの日'}).innerText(),/8月22日.*中央受付/);
 const trialPdf=await download(p,'a[href$="'+makerRecordId+'.pdf"]','akari-short-trial.pdf');
 const trialScan=await download(p,'a[href$="'+makerRecordId+'-scan.jpg"]','akari-short-trial.jpg');
 assert.deepEqual(trialPdf.data,await fs.readFile('private/record-media/'+makerRecordId+'.pdf'));
 assert.deepEqual(trialScan.data,await fs.readFile('private/record-media/'+makerRecordId+'-scan.jpg'));
 const dailyId=makerEvaluation.match(/第3居住群の照合欄（(OBS-\d{4}-\d{3})）/)[1];
 await document(p,dailyId);
 const outline=p.locator('.record-outline');
 await outline.getByText('文書内の項目',{exact:true}).click();
 await outline.getByRole('link',{name:'第3居住群／9月2日以降の照合'}).click();
 assert.equal(new URL(p.url()).hash,'#record-table-2');
 const group=p.getByRole('region',{name:/第3居住群／9月2日以降の照合/});
 assert.match(await group.getByRole('row').filter({hasText:'P-034'}).innerText(),/9月9日[\s\S]*同じ説明/);
 await p.setViewportSize({width:1440,height:1000});
 const inaba=await document(p,'YH-2018-041-A');
 assert.match(inaba,/稲葉 澪/);
 assert.match(inaba,/今は、出る道だけ教えてください/);
 const inabaPrint=await download(p,'a[href$="YH-2018-041-A.pdf"]','inaba-individual.pdf');
 const inabaScan=await download(p,'a[href$="YH-2018-041-A-scan.jpg"]','inaba-individual.jpg');
 assert.deepEqual(inabaPrint.data,await fs.readFile('private/record-media/YH-2018-041-A.pdf'));
 assert.deepEqual(inabaScan.data,await fs.readFile('private/record-media/YH-2018-041-A-scan.jpg'));
 const report=await document(p,'YH-2018-041');
 assert.equal(report.match(/管理責任者\s+([^\n]+)/)[1].trim(),evaluationManager);
 const observationId=inaba.match(/YH-2019-\d{3}/)[0];
 const observation=await document(p,observationId);
 assert.match(observation,/『現在地』から線を指でたどると、この扉です/);
 assert.doesNotMatch(observation,/410・411・412を一括表示|研究・隔離区画/);
 const requests=p.getByRole('region',{name:'退出申出の受付控え'});
 assert.deepEqual(await requests.locator('tbody td:last-child').allInnerTexts(),['','']);
 assert.match(await requests.innerText(),/2020年2月[\s\S]*18日 18:10[\s\S]*運用室へ回付[\s\S]*19日 09:12[\s\S]*同件で追送/);
 const watchCopy=await download(p,'a[href$="'+observationId+'.pdf"]','inaba-observation.pdf');
 assert.deepEqual(watchCopy.data,await fs.readFile('private/record-media/'+observationId+'.pdf'));
 const westId=observation.match(/MX-\d{4}-\d{3}/)[0];
 const westLedger=await document(p,westId);
 assert.match(westLedger,/受付表示「410」/);
 assert.match(westLedger,/受付表示「412」/);
 const oldRoom=await p.locator('table tr').filter({hasText:'通路側の扉'}).locator('td').first().innerText();
 const westScan=await download(p,'a[href$="'+westId+'-scan.jpg"]','west-ledger.jpg');
 assert.deepEqual(westScan.data,await fs.readFile('private/record-media/'+westId+'-scan.jpg'));
 const publishedNotice=westLedger.match(/\d{4}年\d{1,2}月\d{1,2}日掲載/)[0];
 const districtDecisionId=westLedger.match(/決裁通知を受領（参照議事録 (RM-\d{4}-\d{3})/)[1];
 await p.locator('#next-document-id').fill(districtDecisionId);
 await p.locator('.record-lookup button').click();
 await p.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
 await p.goto(main('/'));
 await p.getByRole('button',{name:'サイト内検索を開く'}).click();
 const publicSearch=p.locator('.search-dialog');
 await publicSearch.getByRole('searchbox').fill(publishedNotice);
 await publicSearch.getByRole('button',{name:'検索',exact:true}).click();
 const datedNotice=p.locator('.search-results').getByRole('link',{name:/開設時の区画配置について/});
 assert.equal(await datedNotice.locator('time').getAttribute('datetime'),'2012-04-16');
 assert.match(await datedNotice.innerText(),/開設準備の際に作成した4階配置図/);
 await datedNotice.click();
 await p.locator('img[src*="floor-4f-2012.svg"]').waitFor();
 const archivedPlanButton=p.getByRole('button',{name:'開設時の配置図を拡大',exact:true});
 assert.equal(await archivedPlanButton.innerText(),'開設時の配置図を拡大');
 assert.ok(await archivedPlanButton.evaluate(button=>button.clientWidth>=button.closest('article').clientWidth-2));
 assert.equal(await p.locator('.article-meta time').getAttribute('datetime'),'2012-04-16');
 assert.deepEqual(await p.locator('.archive-plan-copy time').evaluateAll(times=>times.map(time=>time.dateTime)),['2012-04-01','2026-10-30']);
 await p.screenshot({path:'.work/qa/'+mode+'-old-map.png',fullPage:true});
 await p.getByRole('button',{name:'サイト内検索を開く'}).click();
 const siteSearch=p.locator('.search-dialog');
 await siteSearch.getByRole('searchbox').fill(oldRoom+'号室');
 await siteSearch.getByRole('button',{name:'検索',exact:true}).click();
 const oldTenant=p.locator('.search-results').getByRole('link',{name:/トリム部品設計/});
 assert.match(await oldTenant.innerText(),/411号室 ／ 過去入居（2014–2019）/);
 await oldTenant.click();
 assert.match(await p.locator('#activities').innerText(),/2019\.09\.20[\s\S]*名札を受付へ返しました/);
 await p.goto(main('/news/'));assert.equal(await p.locator('.news-rows a[href*="20120416"]').count(),0);assert.equal(await p.locator('.news-rows a[href*="20120903"]').count(),0);
 const fabricationId=observation.match(/FAB-2020-\d{3}/)[0];
 await p.goto(main('/gallery/0015/'));
 assert.equal(await p.locator('article time').getAttribute('datetime'),'2019-06-03');
 assert.match(await body(p),/腕を置く位置を確かめるための試作[\s\S]*参照欄の更新：2020\.02\.21/);
 await p.goto(main('/gallery/0019/'));
 assert.equal(await p.locator('.article-meta time').innerText(),'掲載 2021.03.12');
 assert.match(await body(p),/2020年の製作時/);
 await p.getByRole('img',{name:/円弧状の長穴.*丸穴/}).evaluate(image=>image.decode());
 const fabrication=await document(p,fabricationId);
 assert.match(fabrication,/7月10日の指示[\s\S]*7月13日|7月13日[\s\S]*7月10日の指示/);
 assert.match(fabrication,/外すときは係員を呼ぶ/);
 assert.match(fabrication,/丸穴と円弧状の長穴[\s\S]*丸穴二か所/);
 assert.match(fabrication,/旧型図1枚と取付票の控え1枚/);
 const envelope=fabrication.match(/F\d{2}-\d{4}-\d{2}/)[0];
 const fabricationPdf=await download(p,'a[href$="'+fabricationId+'.pdf"]','fabrication-change.pdf');
 assert.deepEqual(fabricationPdf.data,await fs.readFile('private/record-media/'+fabricationId+'.pdf'));
 const handoverId=fabrication.match(/AH-2017-\d{3}/)[0];
 const ashitaRegistration=fabrication.match(/登録(\d{4})/)[1];
 const unlistedTenants=[];
 const registrationSearch=await context.newPage();
 for(const number of missing)unlistedTenants.push(await company(registrationSearch,String(number).padStart(4,'0')));
 await registrationSearch.close();
 const ashita=unlistedTenants.find(tenant=>tenant['登録番号']===ashitaRegistration);
 assert.ok(ashita);
 await p.locator('#next-document-id').fill(handoverId);await p.locator('.record-lookup button').click();
 await p.getByText('該当する資料は閲覧できません。',{exact:true}).waitFor();
 await login(p,ymd(ashita['入居日'])+ashitaRegistration,ymd(ashita['設立日']));
 const handover=await document(p,handoverId);
 assert.match(handover,/2020年7月15日[\s\S]*取付先欄は空欄/);
 assert.ok(handover.includes(envelope)&&handover.includes(fabricationId));
 assert.match(handover,/旧型図1枚と取付票の控え1枚/);
 assert.match(handover,/受領簿 No\.0006。照合票 AH-2021-006/);
 await p.setViewportSize({width:390,height:844});
 try{
  const rows=p.getByRole('region',{name:'移管作業用の閲覧票'}).locator('tbody td:first-child');
  const lines=await rows.evaluateAll(cells=>cells.map(cell=>{
   const text=document.createRange();text.selectNodeContents(cell);
   return text.getClientRects().length;
  }));
  assert.deepEqual(lines,[1,1,1,1]);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }finally{await p.setViewportSize({width:1440,height:1000});}
 const handoverPdf=await download(p,'a[href$="'+handoverId+'.pdf"]','handover.pdf');
 assert.deepEqual(handoverPdf.data,await fs.readFile('private/record-media/'+handoverId+'.pdf'));
 const ticket=handover.match(/閲覧票番号\s+(\S+)/)[1],code=handover.match(/照会符号\s+(\S+)/)[1];
 const archivePopup=p.waitForEvent('popup');await p.getByRole('link',{name:/旧基盤・資料照会室/}).click();const archive=await archivePopup;archive.on('pageerror',e=>errors.push(e.message));
 await archive.locator('#ticket').fill(ticket);await archive.locator('#inquiry-code').fill(code);await archive.getByRole('button',{name:'照会室へ'}).click();await until(archive,'移管・保守受領簿');
 if(process.env.PLAYTEST_LAB==='1'){
  await archive.getByRole('link',{name:/測定端末の原票照合/}).click();
  const terminal=archive.getByRole('link',{name:'適性反応測定端末AP-06',exact:true});
  const terminalUrl=new URL(await terminal.getAttribute('href'),archive.url()).href;
  await terminal.click();
  await archive.getByRole('heading',{name:'測定に使用する呼称',exact:true}).waitFor();
  await require('./playtest-console.cjs').exerciseConsole(archive,{url:terminalUrl,mode,prefix:'.work/qa/'+mode+'-lab-full'});
 }
 await traceArchivedPublicNotices(archive);
 await traceHistoricalRegisters(archive);
 const healthId=await traceNewspaper(p,archive);
 await archive.goto(provider('archive','/room/records/0005/'));await until(archive,'端末と資料更新の整理');assert.match(await body(archive),/0006/);await archive.goto(provider('archive','/room/records/0006/'));await until(archive,'機関台帳');const registry=await body(archive);
 const institution={id:ymd(registry.match(/加入日([^。]+)/)[1])+registry.match(/台帳番号は(\d{4})/)[1],password:ymd(registry.match(/法人設立日([^。]+)/)[1])};await archive.close();
 await login(p,institution.id,institution.password);
 const districtDecision=await document(p,districtDecisionId);
 assert.match(districtDecision,/410・411・412を一括表示[\s\S]*仕切り・扉・室内呼出は現状のまま/);
 assert.match(districtDecision,/事務局内配布[\s\S]*所管分を決裁通知で送付/);
 const districtPdf=await download(p,'a[href$="'+districtDecisionId+'.pdf"]','west-district-decision.pdf');
 assert.deepEqual(districtPdf.data,await fs.readFile('private/record-media/'+districtDecisionId+'.pdf'));
 const refusal=await document(p,'RG-2007-011');
 const originId=refusal.match(/OR-2006-\d{3}/)[0];
 assert.match(await document(p,originId),/再開案に同意しない/);
 const founding=await document(p,'CO-2010-001');
 const motherId=founding.match(/FUM-\d{4}-\d{3}/)[0];
 assert.match(await document(p,motherId),/もう使わない/);
 const individual=await document(p,makerRecordId);
 const inquiryId=individual.match(/FAM-\d{4}-\d{3}/)[0];
 const familyInquiry=await document(p,inquiryId);
 assert.match(familyInquiry,/本人の継続意思を裏付ける原本/);
 const operationsId=familyInquiry.match(/OPS-2026-\d{3}/)[0];
 const friendFile=await document(p,friendRecordId);
 assert.match(friendFile,/死亡確認[\s\S]*公開プロフィールに、当施設での業務を終了した旨を追記/);
 assert.match(friendFile,/型紙と料理帳の写しが入った紙袋は別に保管/);
 assert.match(friendFile,/灯さんの貸出票は返却欄を空けておいてください。夏帆さんの地図帳は別包みです。修理完了にはしないでください/);
 const reorganization=await document(p,'YH-2022-017');
 assert.match(reorganization,/継舟/);
 assert.match(reorganization,/KS-1986-04[\s\S]*今回の測定値[\s\S]*旧個人別区分票の照合は本件に含めない/);
 const decisionCopy=await download(p,'a[href$="YH-2022-017.pdf"]','reorganization-decision.pdf');
 assert.deepEqual(decisionCopy.data,await fs.readFile('private/record-media/YH-2022-017.pdf'));
 if(process.env.PLAYTEST_LAB==='1'){
  const protocolId=reorganization.match(/AP-2022-\d{3}/)[0];
  const protocol=await document(p,protocolId);
  assert.match(protocol,/平均反応時間は参考欄[\s\S]*機器調整係[\s\S]*8月19日の受付時測定分[\s\S]*評価統括へ回付/);
  const protocolPrint=await download(p,'a[href$="'+protocolId+'.pdf"]','aptitude-protocol.pdf');
  assert.deepEqual(protocolPrint.data,await fs.readFile('private/record-media/'+protocolId+'.pdf'));
 }
 const originalOffer=await recruitmentCopy(p,'RE-2022-006',2022);
 const checkId=originalOffer.match(/OBS-2022-\d{3}/)[0];
 const examination=await document(p,checkId);
 const recipientCopy=p.getByRole('region',{name:'9月10日の日次確認票・本人控え'});
 assert.match(await recipientCopy.innerText(),/日曜に妹に渡す[\s\S]*9月10日 08:42[\s\S]*9月11日 08:40/);
 assert.doesNotMatch(await recipientCopy.innerText(),/薬剤|拒否傾向/);
 assert.match(examination,/2022年9月2日 08:10[\s\S]*P-032。変更群の薬剤を投与済み[\s\S]*実施欄の本人確認は空欄/);
 assert.match(await p.getByRole('row').filter({hasText:'P-032：検査の中止と帰宅時期を確認したい'}).innerText(),/拒否傾向[\s\S]*条件維持/);
 await p.setViewportSize({width:390,height:844});
 try{
  const dates=p.locator('.record-table[data-date-column] tbody td:first-child');
  assert.deepEqual(await dates.evaluateAll(cells=>cells.map(cell=>{
   const textRange=document.createRange();textRange.selectNodeContents(cell);
   return textRange.getClientRects().length;
  })),[1,1,1,1]);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }finally{await p.setViewportSize({width:1440,height:1000});}
 for(const [suffix,name] of [['.pdf','本人控えと別管理欄（PDF）'],['-scan.jpg','本人控えの複写（画像）']]){
  const filename=checkId+suffix;
  await p.getByRole('link',{name}).waitFor();
  const copy=await download(p,'a[href$="'+filename+'"]',filename);
  assert.deepEqual(copy.data,await fs.readFile('private/record-media/'+filename));
 }
 const participant=examination.match(/P-032\s+([^。\s]+)。/)[1],profile=await p.context().newPage();
 try{
  await profile.goto(main('/search/?q='+encodeURIComponent(participant)));
  await profile.getByRole('link',{name:/仕事の合間の小さな製作/}).click();
  assert.match(await body(profile),/妹に渡したら[\s\S]*板の裏に組む向きを鉛筆で書いておきます/);
 }finally{await profile.close();}
 const equipmentId=examination.match(/ENV-2022-\d{3}/)[0];
 const equipment=await document(p,equipmentId);
 const dispatch=p.getByRole('region',{name:'9月10日 11:20の配信控え／個別通知'});
 assert.match(await dispatch.innerText(),/P-032の端末[\s\S]*P-033の未承認/);
 assert.equal(await dispatch.getByRole('row').filter({hasText:'端末応答'}).getByRole('cell').last().innerText(),'受領');
 assert.equal(await dispatch.getByRole('row').filter({hasText:'閲覧時刻'}).getByRole('cell').last().innerText(),'');
 await p.setViewportSize({width:320,height:844});
 try{
  const labels=dispatch.locator('tbody td:first-child');
  assert.deepEqual(await labels.evaluateAll(cells=>cells.map(cell=>{
   const range=document.createRange();
   range.selectNodeContents(cell);
   return new Set([...range.getClientRects()].map(rect=>rect.top)).size;
  })),[1,1,1,1,1]);
  assert.equal(await dispatch.evaluate(table=>table.scrollWidth>table.clientWidth+1),false);
 }finally{await p.setViewportSize({width:1440,height:1000});}
 const dispatchPrint=await download(p,'a[href$="'+equipmentId+'.pdf"]',equipmentId+'.pdf');
 assert.deepEqual(dispatchPrint.data,await fs.readFile('private/record-media/'+equipmentId+'.pdf'));
 const incidentId=equipment.match(/EV-2022-\d{3}/)[0];
 const incident=await document(p,incidentId);
 assert.match(incident,/吉野夏帆/);
 assert.match(incident,/9月10日11:20の端末配信控え[\s\S]*9月11日の当直連絡/);
 assert.match(incident,/僕がやった。人を呼んで[\s\S]*07:46、P-032を別室の担当に引き渡し/);
 assert.match(incident,/板二枚を回収。裏に鉛筆の矢印[\s\S]*家族連絡の許可欄は空欄/);
 assert.match(incident,/建物外への引渡しは、今回の保全分では確認できなかった/);
 assert.match(incident,/工房の修理受付は完了に変更/);
 await p.setViewportSize({width:390,height:844});
 try{
  const timeCells=p.getByRole('region',{name:'9月11日 夜間の連絡'}).locator('tbody td:first-child');
  assert.deepEqual(await timeCells.evaluateAll(cells=>cells.map(cell=>{
   const textRange=document.createRange();textRange.selectNodeContents(cell);
   return textRange.getClientRects().length;
  })),[1,1,1,1,1,1]);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }finally{await p.setViewportSize({width:1440,height:1000});}
 const incidentFile=incidentId+'.pdf';
 const incidentPrint=await download(p,'a[href$="'+incidentFile+'"]',incidentFile);
 assert.deepEqual(incidentPrint.data,await fs.readFile('private/record-media/'+incidentFile));
 const summaryId=incident.match(/GR-2022-\d{3}/)[0];
 const summary=await document(p,summaryId);
 assert.match(summary,/自発的淘汰/);
 const rescueRow=p.getByRole('row').filter({hasText:'救護を要請'});
 assert.match(await rescueRow.innerText(),/EV-2022-091\s+21:12、21:14[\s\S]*除外。群外の資源要求/);
 const excludedRequest=p.getByRole('row').filter({hasText:'全員の退出を求める'});
 const excludedText=await excludedRequest.innerText();
 assert.match(excludedText,/9月10日の控え[\s\S]*除外。条件変更の要求/);
 await p.setViewportSize({width:320,height:844});
 try{
  const sources=p.getByRole('region',{name:'第3居住群／採否'}).locator('tbody td:nth-child(2)');
  assert.deepEqual(await sources.evaluateAll(cells=>cells.map(cell=>{
   const range=document.createRange();range.selectNodeContents(cell);
   return new Set([...range.getClientRects()].map(rect=>rect.top)).size;
  })),[2,2,2,2,1]);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }finally{await p.setViewportSize({width:1440,height:1000});}
 const summaryFile=summaryId+'.pdf';
 const summaryPrint=await download(p,'a[href$="'+summaryFile+'"]',summaryFile);
 assert.deepEqual(summaryPrint.data,await fs.readFile('private/record-media/'+summaryFile));
 const intakeId=excludedText.match(/PN-2022-\d{3}/)[0];
 const intake=await document(p,intakeId);
 const petition=p.locator('.record-entries li').filter({hasText:'共同申出の控え'});
 assert.match(await petition.innerText(),/2022年9月10日[\s\S]*瀬尾灯・青井真澄[\s\S]*一人ずつ聞いてください[\s\S]*希望どおりに外へ/);
 await p.getByRole('link',{name:'受領票と後日の書面（PDF）'}).waitFor();
 await p.getByRole('link',{name:'9月2日の預かり控え（画像）'}).waitFor();
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
 const familyId=makerEvaluation.match(/FAM-2022-\d{3}/)[0];
 const family=await document(p,familyId);
 assert.match(family,/汐見分室の郵送先を文乃氏へ通知[\s\S]*書留が戻りました/);
 assert.match(family,/10月26日の当直引継ぎ[\s\S]*10月28日の交換作業控え/);
 const operations=await document(p,operationsId);
 const makerLocation=p.getByRole('row').filter({hasText:'P-034 瀬尾灯'});
 assert.equal(await makerLocation.getByRole('cell').nth(1).innerText(),'B1・B-07');
 const eastId=operations.match(/PUB-2023-\d{3}/)[0];
 const eastWork=await document(p,eastId);
 assert.match(eastWork,/東側・会議室Aへの通路/);
 const eastPdf=await download(p,'a[href$="'+eastId+'.pdf"]','east-work.pdf');
 assert.deepEqual(eastPdf.data,await fs.readFile('private/record-media/'+eastId+'.pdf'));
 const repairId=operations.match(/FAB-2026-\d{3}/)[0];
 const repair=await document(p,repairId);
 const requestTable=p.getByRole('region',{name:'10月27日 受領'});
 assert.match(await requestTable.innerText(),/支持部交換の依頼[\s\S]*B-07/);
 assert.doesNotMatch(await requestTable.innerText(),/P-034|瀬尾灯/);
 assert.match(repair,/2026年10月28日 14:20[\s\S]*B1・B-07[\s\S]*瀬尾灯（対象票P-034）[\s\S]*本人と対面/);
 const repairPdf=await download(p,'a[href$="'+repairId+'.pdf"]',repairId+'.pdf');
 assert.deepEqual(repairPdf.data,await fs.readFile('private/record-media/'+repairId+'.pdf'));
 const letterId=repair.match(/P034-2026-\d{3}/)[0];
 const letter=await document(p,letterId);
 assert.match(letter,/10月28日に受け取った書面[\s\S]*別保管の紙袋[\s\S]*本人への引渡し日は空欄[\s\S]*いま帰りたいです/);
 const letterPdf=await download(p,'a[href$="'+letterId+'.pdf"]',letterId+'.pdf');
 assert.deepEqual(letterPdf.data,await fs.readFile('private/record-media/'+letterId+'.pdf'));
 await document(p,repairId);
 await p.getByRole('link',{name:'記録についての照会',exact:true}).click();
 await p.getByRole('button',{name:/照会を送信/}).click();
 await p.getByText(/10月28日に部品を届けたとき/).waitFor();
 await p.locator('a[href$="hozen.zip"]').waitFor();
 const original=await download(p,'a[href$="hozen.zip"]','original.zip');const pdfPath='.work/qa/'+mode+'-statement.pdf';await fs.writeFile(pdfPath,zipEntry(original.data));
 const pdfText=execFileSync(process.env.ASUNARO_PYTHON||'python',['-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))',pdfPath],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 const personName=pdfText.match(/申出者\s+([^\n]+)/)[1].trim(),personId=pdfText.match(/会員ID\s+([A-Z0-9]+)/)[1];
 await p.goto(main('/search/?q='+encodeURIComponent(personName.replace(/\s+/g,''))));await p.getByRole('link',{name:/制作と活動の記録/}).click();const personalText=await body(p),birth=ymd(personalText);await login(p,personId,birth);await p.getByRole('link',{name:'個人保存資料',exact:true}).first().click();
 await document(p,'AS-2024-002');
 await document(p,'AS-2026-014');
 const transfer=await document(p,'TR-2026-011');
 assert.match(transfer,/人的支援の引継ぎとは別の契約/);
 const draft=p.getByRole('region',{name:'10月29日 受領案／確認欄'});
 const draftFields=Object.fromEntries(await draft.locator('tbody tr').evaluateAll(rows=>rows.map(row=>Array.from(row.cells,cell=>cell.innerText))));
 assert.match(draftFields['資料の受領担当'],/災害技術記録保全センター 榎本航策/);
 assert.equal(draftFields['現施設の運営停止'],'モデル受領後に手続きを開始予定');
 for(const field of ['資料の引渡し日','資料の受領印','居住者の受入場所','居住者の移動日','居住者本人の確認']){
  assert.equal(draftFields[field],'',field);
 }
 const transferPdf=await download(p,'a[href$="TR-2026-011.pdf"]','TR-2026-011.pdf');
 assert.deepEqual(transferPdf.data,await fs.readFile('private/record-media/TR-2026-011.pdf'));
 const complete=await download(p,'a[href$="complete.zip"]','complete.zip');
 const note=zipEntry(complete.data,'資料移送記録.txt').toString();
 assert.match(note,/^TR-2026-011\n受領先：災害技術記録保全センター 榎本航策\n/);
 assert.match(note,/資料の引渡し日：未記入[\s\S]*居住者の受入場所：未記入[\s\S]*居住者本人の確認：未記入/);
 const groupRecords=JSON.parse(zipEntry(complete.data,'実験記録.json').toString());const originalDocuments=JSON.parse(zipEntry(complete.data,'文書原本.json').toString()).documents;assert.ok(originalDocuments.some(d=>d.id==='CH-2021-003'&&d.entries.length));assert.ok(originalDocuments.some(d=>d.id==='EV-2022-091'&&d.tables.length));assert.ok(originalDocuments.every(d=>!('roles' in d)&&!('audit' in d)));const measurementSheets=JSON.parse(zipEntry(complete.data,'適性測定原票.json').toString());assert.equal(measurementSheets.sheets.length,5);assert.ok(!JSON.stringify(measurementSheets).includes('星をみる灯'));assert.equal(groupRecords.closed_group.victim.id,'P-033');assert.ok(groupRecords.closed_group.sources.includes('GR-2022-009'));assert.ok(groupRecords.subjects.some(subject=>subject.id==='P-031'));assert.match(await document(p,personalReviewId),/本人の移送承諾なし/);await p.screenshot({path:'.work/qa/'+mode+'-group-crosscheck.png',fullPage:true});await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.screenshot({path:'.work/qa/'+mode+'-group-mobile.png',fullPage:true});await p.setViewportSize({width:1440,height:1000});const privateRecord=await document(p,'AS-2024-002'),friendPrivateId=privateRecord.match(/AS-2023-\d{3}/)[0];assert.match(await document(p,friendPrivateId),/誰が決めてもいい形/);assert.match(await document(p,letterId),/いま帰りたい/);await document(p,'AS-2026-021');await document(p,'AS-2026-019');if(process.env.PLAYTEST_LAB==='1'){await p.locator('[data-lab-assessment]:visible').waitFor();assert.equal(await p.locator('[data-lab-assessment-handle]').innerText(),'星をみる灯');}await p.locator('[data-reading-ledger="combined"] .reading-list li:visible').first().waitFor();const routeNames=await p.locator('[data-reading-ledger="combined"] .reading-source').allTextContents();assert.ok(routeNames.some(x=>x.includes('ミナモ')));assert.ok(routeNames.some(x=>x.includes('オルディス')));await p.screenshot({path:'.work/qa/'+mode+'-reader-path.png',fullPage:true});
 await document(p,'EA-2026-009');
 const reviewPdf=await download(p,'a[href$="EA-2026-009.pdf"]','EA-2026-009.pdf');
 assert.deepEqual(reviewPdf.data,await fs.readFile('private/record-media/EA-2026-009.pdf'));
 await p.getByRole('link',{name:/東都研究監査室・記録保全受付/}).click();
 const preservedIntake=originalDocuments.find(record=>record.id===intakeId);
 const preservedPetition=preservedIntake.entries.find(entry=>entry.by.includes('共同申出の控え'));
 assert.match(preservedPetition.text,/いまいる人に一人ずつ聞いてください/);
 assert.match(groupRecords.closed_group.excluded,/全員に退出の意思を確かめる/);
 assert.match(groupRecords.family_inquiry.current_evidence,/10月26日の当直引継ぎ、28日のB-07の対面作業控え/);
 const preservedRepair=originalDocuments.find(record=>record.id===repairId);
 const preservedLetter=originalDocuments.find(record=>record.id===letterId);
 assert.equal(preservedRepair.entries[0].at,'2026年10月28日 14:20');
 assert.equal(preservedLetter.date,'2026年10月28日');
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
 await submit(p,complete.file);
 assert.deepEqual(await p.locator('.agency-news>section time').allTextContents(),['2026.11.06','2026.11.12','2026.11.20']);
 assert.match(await body(p),/B1・B-07で確認[\s\S]*ご本人からの連絡/);
 assert.match(await body(p),/原型継承試験の実施手続きを停止/);
 assert.match(await body(p),/母と確かめながら続きを作ります/);if(process.env.PLAYTEST_LAB==='1'){await p.locator('[data-lab-thanks]:visible').waitFor();assert.equal(await p.locator('[data-lab-thanks-name]').innerText(),'星をみる灯');}else assert.equal(await p.locator('[data-lab-thanks]:visible').count(),0);await p.screenshot({path:'.work/qa/'+mode+'-end3.png',fullPage:true});
 if(process.env.PLAYTEST_LAB==='1'){
  const savedTrial=await p.context().newPage();
  try{
   await savedTrial.goto(provider('archive','/room/console/'));
   await savedTrial.getByRole('heading',{name:'星をみる灯さんの測定記録',exact:true}).waitFor();
   assert.match(await savedTrial.locator('.lab-receipt').innerText(),/保全用原本へ編入[\s\S]*照会終了／原本保全/);
   await savedTrial.getByRole('link',{name:'被験者の測定原票',exact:true}).click();
   const lamp=savedTrial.locator('.lab-subject').filter({hasText:'瀬尾 灯'});
   await lamp.locator(':scope>summary').click();
   assert.match(await lamp.locator('.lab-current').innerText(),/本人保護・記録照合中/);
  }finally{await savedTrial.close();}
 }
 await login(p,institution.id,institution.password);
 await p.goto(auditReceipt);await until(p,'資料を受領しました');
 assert.match(await body(p),/自宅に戻ることを希望し、同日、施設を出ました/);
 assert.match(await body(p),/B1・B-04で所在を確認した方にも/);
 assert.match(await body(p),/吉野夏帆さんの青い布表紙の地図帳[\s\S]*ご家族に返却先を確認/);
 await p.setViewportSize({width:390,height:844});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 const references=await p.locator('.agency-news .case-ref').evaluateAll(nodes=>nodes.map(node=>{
  const range=document.createRange();range.selectNodeContents(node);return range.getClientRects().length;
 }));
 assert.deepEqual(references,[1,1,1,1,1]);
 await p.screenshot({path:'.work/qa/'+mode+'-audit-progress-mobile.png',fullPage:true});
 await p.setViewportSize({width:1440,height:1000});
 await p.goto(main('/members/messages/'));
 await p.getByRole('heading',{name:'一般利用の受付休止',exact:true}).waitFor();
 await p.getByRole('heading',{name:'原本照会への回答（保存分）',exact:true}).waitFor();
 assert.equal(await p.getByText(/B-07に今も灯さんがいます/).isVisible(),false);
 assert.equal(await p.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).count(),0);
 const wrongReceipt=new URL(auditReceipt);wrongReceipt.searchParams.set('case','wrong');
 await p.goto(wrongReceipt.href);await until(p,'記録保全受付');
 assert.doesNotMatch(await body(p),/B1・B-07|引渡しの停止と原本の保全/);
 await p.goto(main('/'));await until(p,'施設の利用を');
 assert.match(await p.locator('.visit-band').innerText(),/見学の受付を休止/);
 await p.goto(main('/visit/'));await p.getByRole('heading',{name:'見学の受付を休止しております。'}).waitFor();
 assert.doesNotMatch(await body(p),/平日9時から17時まで/);
 await verifyPausedGuide(p,'/facilities/meeting/#meeting-rooms',/会議室の定員と位置[\s\S]*会議室D[\s\S]*定員 10名/);
 await p.setViewportSize({width:320,height:760});
 await verifyPausedGuide(p,'/floor-map/#floor-meeting',/休止前[\s\S]*会議室/);
 await p.setViewportSize({width:1440,height:1000});
 await verifyPausedGuide(p,'/workshop/',/工房の設置機器[\s\S]*工房の試作例/);
 await verifyPausedGuide(p,'/price/',/会議室D（10名）[\s\S]*1,320円/);
 await verifyPausedGuide(p,'/research/lunar-habitat/',/展示の様子を写真でご覧いただけます/);
 await p.goto(main('/news/20120416/'));
 await p.getByRole('button',{name:'開設時の配置図を拡大'}).waitFor();
 await p.locator('[data-site-operation="paused"]').waitFor();
 assert.equal(await p.locator('.facility-use-pause').count(),0);
 for(const ending of ['end1','end2']){
  const branch=await browser.newContext({viewport:{width:1200,height:900},acceptDownloads:true});const q=await branch.newPage();q.on('pageerror',e=>errors.push(e.message));const received=await evidence(q,institution);
  if(ending==='end1'){
   let mapTab,zoom,inbox;
   if(mode==='pages'){
    inbox=await branch.newPage();
    await inbox.goto(main('/members/messages/'));
    await inbox.getByRole('heading',{name:'原本照会への回答',exact:true}).waitFor();
    mapTab=await branch.newPage();
    await mapTab.goto(main('/floor-map/'));
    await mapTab.getByRole('button',{name:'フロアマップを拡大',exact:true}).click();
    zoom=mapTab.getByRole('dialog',{name:'フロアマップを拡大'});
    await zoom.waitFor();
   }
   await q.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).click();
   await submit(q,received.file);
   const centerReceipt=q.url();
   assert.match(await body(q),/所在と支援の引継ぎ[\s\S]*新たな研究支援事業/);
   assert.doesNotMatch(await body(q),/B1・B-07|引渡しの停止と原本の保全/);
   if(inbox){
    await inbox.getByRole('heading',{name:'一般利用の受付休止',exact:true}).waitFor();
    await inbox.getByRole('heading',{name:'原本照会への回答（保存分）',exact:true}).waitFor();
    assert.equal(await inbox.getByText(/B-07に今も灯さんがいます/).isVisible(),false);
    await inbox.getByText('11月2日付の回答を表示',{exact:true}).click();
    await inbox.getByText(/B-07に今も灯さんがいます/).waitFor();
    assert.equal(await inbox.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).count(),0);
    await inbox.close();
   }
   await q.goto(main('/members/messages/'));
   await q.getByRole('link',{name:'資料保全センターの受付控え',exact:true}).click();
   await q.waitForURL(centerReceipt);
   await q.getByText(/受付番号：DR-2026-1102/).waitFor();
   if(mapTab){
    await mapTab.locator('[data-site-operation="paused"]').waitFor({state:'attached'});
    assert.equal(await zoom.isVisible(),true);
    assert.equal(await mapTab.locator('.facility-use-pause').count(),0);
    await zoom.getByRole('button',{name:'画像を閉じる'}).click();
    await mapTab.locator('.facility-use-pause').waitFor();
    await mapTab.getByRole('heading',{name:'案内図上の位置',exact:true}).waitFor();
    await mapTab.close();
   }
   await verifyPausedGuide(q,'/facilities/meeting/',/休止前のご利用時間/);
   await q.goto(main('/members/reservations/'));
   await until(q,'利用申請・予約');
   await q.getByText('受付を休止しております。',{exact:true}).waitFor();
  }
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
   await q.goto(main('/members/messages/'));await q.getByText('担当者の変更',{exact:true}).waitFor();
   await q.getByRole('heading',{name:'原本照会への回答（保存分）',exact:true}).waitFor();
   assert.equal(await q.getByRole('link',{name:'資料保全・匿名通報受付',exact:true}).count(),0);
   await q.goto(main('/people/asakura-tsumugi/'));await until(q,'ページが見つかりません');
   await q.goto(main('/facilities/meeting/'));
   await q.getByRole('link',{name:/会議室Dの利用申請/}).waitFor();
   assert.equal(await q.locator('[data-site-operation="paused"]').count(),0);
  }
  await q.screenshot({path:'.work/qa/'+mode+'-'+ending+'.png',fullPage:true});await branch.close();
 }
 const mobile=await browser.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));for(const route of ['/','/about/identity/','/about/emblem/','/visit/','/workshop/stories/seo-akari/','/people/seo-akari/','/people/seo-fumino/','/people/saegusa-ritsu/','/gallery/0005/','/news/20220218/','/news/20261028/','/news/20220715/','/news/20160520/','/news/20120416/']){await mobile.goto(main(route));assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route);}
 await mobile.goto(main('/about/emblem/'));await mobile.screenshot({path:'.work/qa/'+mode+'-emblem-mobile.png',fullPage:true});await mobile.close();assert.deepEqual(errors,[]);await context.close();
 console.log(`Playtest passed (${mode}): clue-led account derivation, legacy ticket, hidden map, PDF identity, incomplete-evidence check, 3 endings, desktop/mobile.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
