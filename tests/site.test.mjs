import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {startServers} from '../server.mjs';
import {publicPaths,renderPublic} from '../src/render.mjs';
import {readFile,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {accounts,gallery,tenants,news} from '../src/content.mjs';

let app;const port=4317,base=`http://127.0.0.1:${port}`;
before(async()=>{app=await startServers({port});});after(async()=>{await app.close();});
function client(){let cookie='',csrf='';return {
 async get(path){const response=await fetch(base+path,{headers:{cookie},redirect:'manual'});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const text=await response.text();csrf=text.match(/name="csrf" value="([^"]+)"/)?.[1]||csrf;return {response,text};},
 async login(id,password){await this.get('/members/login/');const response=await fetch(base+'/members/login/',{method:'POST',headers:{cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf,id,password,next:'/members/'}),redirect:'manual'});if(response.status===303)await this.get('/members/');return response;},
 async post(path,fields){return fetch(base+path,{method:'POST',headers:{cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...fields,csrf}),redirect:'manual'});},
 async binary(path){return fetch(base+path,{headers:{cookie},redirect:'manual'});},
 async upload(path,fields,fileName,data){const fd=new FormData();for(const [k,v] of Object.entries({...fields,csrf}))fd.set(k,v);fd.set('attachment',new Blob([data]),fileName);return fetch(base+path,{method:'POST',headers:{cookie},body:fd,redirect:'manual'});},
 get csrf(){return csrf;}
 };}

test('public HTML is rendered without credentials, protected data or hidden links',async()=>{
 for(const p of ['/','/gallery/','/tenants/','/search/?q=パスワード']){
  const c=client();const {response,text}=await c.get(p);assert.equal(response.status,200);assert.doesNotMatch(text,/20080519|201204010017|19930618|AS-2024-002/);
  if(p==='/gallery/')assert.doesNotMatch(text,/href="\/gallery\/0015\//);
  if(p==='/tenants/')assert.doesNotMatch(text,/href="\/tenants\/0003\//);
 }
 const c=client();assert.equal((await c.get('/gallery/0015/')).response.status,200);assert.equal((await c.get('/tenants/0003/')).response.status,200);
 assert.match((await c.get('/guide/access/')).text,/href="\/tenants\/"/);assert.equal((await c.get('/guide/access/')).response.status,404);
});

test('public pages and their referenced local assets exist',async()=>{
 const c=client();for(const p of publicPaths){const {response,text}=await c.get(p);assert.equal(response.status,p==='/404/'?404:200,p);for(const match of text.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)/g)){const r=await fetch(base+match[1]);assert.equal(r.status,200,`${p}: ${match[1]}`);}}
});

test('document visibility is enforced by account, including direct document URLs',async()=>{
 const c=client();assert.equal((await c.get('/members/records/CH-2021-003/')).response.status,303);
 assert.equal((await c.login('201204010017','wrong')).status,401);assert.equal((await c.login('201204010017','20080519')).status,303);
 assert.match((await c.get('/members/records/?document_id=YH-2018-041')).text,/検索結果　1件/);
 const denied=(await c.get('/members/records/?document_id=YH-2018-041-A')).text;
 assert.match(denied,/該当する資料は閲覧できません。/);assert.doesNotMatch(denied,/稲葉 澪|class="document-result"/);
 const absent=(await c.get('/members/records/?document_id=ZZ-2099-999')).text;
 assert.match(absent,/該当する資料はありません。/);
 assert.equal((await c.get('/members/records/YH-2018-041-A/')).response.status,404);
 assert.equal((await c.login('201804010046','20151112')).status,303);
 assert.match((await c.get('/members/records/YH-2018-041-A/')).text,/稲葉 澪/);
 assert.equal((await c.get('/members/records/RM-2020-019/')).response.status,404);
 assert.equal((await c.login('201204010000','20100615')).status,303);
 assert.match((await c.get('/members/records/?document_id=RM-2020-019')).text,/検索結果　1件/);
 assert.match((await c.get('/members/records/CH-2021-003/')).text,/ここで私の事業を止めてもいい/);
 assert.equal((await c.get('/members/records/AS-2024-002/')).response.status,404);
 assert.equal((await c.get('/members/download/records.json')).response.status,404);
});

test('source files, private data and traversal cannot be downloaded',async()=>{
 for(const route of ['/src/content.mjs','/server.mjs','/private/expose.pdf','/docs/image-prompts.json','/assets/%2e%2e%5c%2e%2e%5cprivate%5cexpose.pdf']){
  const response=await fetch(base+route);assert.ok([400,404].includes(response.status),route);assert.doesNotMatch(await response.text(),/20120901P0083|原型継承試験/);
 }
});

async function evidence(c){await c.login('201204010000','20100615');await c.post('/members/inquiry/',{record:'CH-2021-003',request:'原本確認',note:'原本の照合をお願いします。'});const message=(await c.get('/members/messages/')).text;assert.match(message,/保全資料_20261102.zip/);const caseId=message.match(/receive\/\?case=([a-f0-9]+)/)[1];const r=await c.binary('/members/download/hozen.zip');assert.equal(r.status,200);const zip=Buffer.from(await r.arrayBuffer());assert.equal(zip.readUInt32LE(0),0x04034b50);assert.ok(zip.includes(Buffer.from('告発書.pdf')));return {caseId,zip};}
async function submitAgency(kind,caseId,zip){const fd=new FormData();fd.set('case',caseId);fd.set('title','資料の保全について');fd.set('statement','関係資料を提出いたします。');fd.set('archive',new Blob([zip]),'保全資料.zip');return fetch(`http://127.0.0.1:${port+(kind==='audit'?2:1)}/receive/`,{method:'POST',body:fd,redirect:'manual'});}

test('anonymous reporting leads to closure and continuity notice',async()=>{
 const c=client();const {caseId,zip}=await evidence(c);const r=await submitAgency('hozen',caseId,zip);assert.equal(r.status,303);const receipt=await fetch(`http://127.0.0.1:${port+1}${r.headers.get('location')}`);assert.match(await receipt.text(),/新たな研究支援事業/);assert.match((await c.get('/')).text,/施設の利用休止/);
});
test('submission to facility office identifies the informant',async()=>{
 const c=client();const {zip}=await evidence(c);const r=await c.upload('/members/contact/',{subject:'資料の確認',message:'添付資料をご確認ください。'},'資料.zip',zip);assert.equal(r.status,303);assert.equal((await c.get('/people/asakura-tsumugi/')).response.status,404);assert.match((await c.get('/members/messages/')).text,/個人登録は終了/);
});
test('name search, personal account and independent submission reveal and stop succession',async()=>{
 const c=client();const {caseId}=await evidence(c);assert.match((await c.get('/search/?q='+encodeURIComponent('朝倉 紬乃'))).text,/asakura-tsumugi/);assert.match((await c.get('/people/asakura-tsumugi/')).text,/1993年6月18日/);
 await c.login('20120901P0083','19930618');assert.match((await c.get('/members/personal/')).text,/原型継承試験/);assert.match((await c.get('/members/records/AS-2024-002/')).text,/病気の時の言葉/);
 const doc=(await c.get('/members/records/EA-2026-009/')).text;assert.match(doc,/東都研究監査室/);assert.match(doc,/4319/);
 const r=await c.binary('/members/download/complete.zip');const zip=Buffer.from(await r.arrayBuffer());assert.ok(zip.includes(Buffer.from('継承計画.json')));assert.equal((await submitAgency('audit',caseId,zip)).status,303);assert.match((await c.get('/news/closure/')).text,/外部への資料移管/);
});
test('state changes require CSRF verification',async()=>{const r=await fetch(base+'/members/login/',{method:'POST',body:new URLSearchParams({id:'201204010017',password:'20080519'})});assert.equal(r.status,403);});

test('reservation requests respect the selected facility’s start time and keep the draft on error',async()=>{
 const c=client();
 assert.equal((await c.login('201204010017','20080519')).status,303);
 const route='/members/reservations/';
 const form=(await c.get(route+'?space=workshop')).text;
 assert.match(form,/<option value="workshop" selected>工房/);
 assert.match(form,/<input id="time"[^>]+max="16:00"[^>]+aria-describedby="reservation-hours"/);
 assert.match(form,/工房受付は17:00までです。/);
 const draft={space:'workshop',date:'2026-11-07',time:'16:00',purpose:'試作の相談'};
 const accepted=await c.post(route,draft);
 assert.equal(accepted.status,303);
 assert.equal(accepted.headers.get('location'),route+'?received=1');
 const late=await c.post(route,{...draft,time:'16:01'});
 assert.equal(late.status,400);
 const error=await late.text();
 assert.match(error,/<option value="workshop" selected>工房/);
 assert.match(error,/<input id="time"[^>]+value="16:01"/);
 assert.match(error,/>試作の相談<\/textarea>/);
 assert.equal((await c.post(route,{...draft,space:'meeting-a',time:'20:00'})).status,303);
 for(const change of [{space:'unlisted'}, {date:'2026-11-01'}, {date:'2026-11-31'}, {time:'12:65'}]){
  assert.equal((await c.post(route,{...draft,...change})).status,400);
 }
});

test('publication numbers form tight sequences independent of account registration',()=>{
 assert.deepEqual(gallery.map(g=>Number(g.id)),Array.from({length:34},(_,i)=>i+1));
 assert.deepEqual(tenants.map(t=>Number(t.page)),Array.from({length:18},(_,i)=>i+1));
 const keyPages={minamo:'0003',ashita:'0010',ordis:'0013'};
 const digits=date=>date.match(/\d+/g).map(part=>part.padStart(2,'0')).join('');
 for(const [role,page] of Object.entries(keyPages)){
  const tenant=tenants.find(t=>t.page===page);
  const [login,account]=Object.entries(accounts).find(([,item])=>item.role===role);
  assert.equal(tenant.id,account.member);
  assert.equal(login,digits(tenant.joined)+tenant.id);
  assert.equal(account.password,digits(tenant.established));
  assert.equal(tenant.listed,false);
 }
 assert.equal(new Set(gallery.map(g=>g.image)).size,gallery.length);
 assert.equal(new Set(news.map(n=>n.id)).size,news.length);
});

test('public search tolerates spacing and width, and member links open a separate tab',async()=>{
 const c=client();for(const q of ['朝倉紬乃','朝倉 紬乃','朝倉　紬乃','朝 倉  紬'])assert.match((await c.get('/search/?q='+encodeURIComponent(q))).text,/href="\/people\/asakura-tsumugi\//,q);
 assert.match((await c.get('/search/?q='+encodeURIComponent('３Ｄプリンター'))).text,/工房のご案内/);
 assert.match((await c.get('/search/?q='+encodeURIComponent('４１１ 号室'))).text,/href="\/tenants\/0008\//);
 assert.doesNotMatch((await c.get('/search/?q='+encodeURIComponent('４１２号室'))).text,/href="\/tenants\/0013\//);
 assert.match((await c.get('/membership/')).text,/href="\/members\/" target="_blank" rel="noopener"/);
 assert.doesNotMatch((await c.get('/')).text,/↗/);
});

test('document viewer can query another document from its footer and preserves permissions',async()=>{
 const c=client();await c.login('201204010017','20080519');
 const doc=(await c.get('/members/records/YH-2018-041/')).text;
 assert.match(doc,/<section class="record-lookup"[\s\S]*action="\/members\/records\/"[\s\S]*id="next-document-id"/);
 assert.match((await c.get('/members/records/?document_id=YH-2018-041-A')).text,/該当する資料は閲覧できません。/);
 assert.doesNotMatch((await c.get('/members/organization/')).text,/0000/);
 assert.doesNotMatch((await c.get('/members/records/YH-2013-014/')).text,/0000/);
});

test('archive traversal reveals handover evidence only after ticket authentication',async()=>{
 const c=client();await c.login('201704010038','20161204');
 const work=(await c.get('/members/records/AH-2017-009/')).text;assert.match(work,/H17-0038/);assert.match(work,/4320\/room\//);
 assert.equal((await c.get('/members/records/RG-2007-011/')).response.status,404);
 const archive=`http://127.0.0.1:${port+3}`;let cookie='';
 const r=await fetch(archive+'/room/records/0006/');cookie=r.headers.get('set-cookie').split(';')[0];const login=await r.text();assert.doesNotMatch(login,/台帳番号は0000/);const csrf=login.match(/name="csrf" value="([^"]+)"/)[1];
 assert.equal((await fetch(archive+'/room/login/',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf,ticket:'H17-0038',code:'bad'}),redirect:'manual'})).status,401);
 assert.equal((await fetch(archive+'/room/login/',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf,ticket:'H17-0038',code:'W416-12'}),redirect:'manual'})).status,303);
 const shelf=await (await fetch(archive+'/room/',{headers:{cookie}})).text();assert.doesNotMatch(shelf,/href="\/room\/records\/0006\//);
 assert.match(await (await fetch(archive+'/room/records/0006/',{headers:{cookie}})).text(),/台帳番号は0000/);
 const catalog=await (await fetch(archive+'/collections/')).text();assert.doesNotMatch(catalog,/href="\/collections\/items\/0009\//);
 assert.match(await (await fetch(archive+'/collections/items/0009/')).text(),/服毒による自殺か/);
 await c.login('201204010000','20100615');assert.match((await c.get('/members/records/RG-2007-011/')).text,/旧継舟計画を承継する事業案には同意しません/);
 assert.match((await c.get('/members/records/HC-2021-031-R/')).text,/本人意思確認欄/);
});

test('ordinary restart preserves authentication and the received-evidence state',async()=>{
 const stateFile=path.resolve('.work/state-persistence-test.json');await mkdir(path.dirname(stateFile),{recursive:true});await unlink(stateFile).catch(e=>{if(e.code!=='ENOENT')throw e;});
 const restartBase='http://127.0.0.1:4517';let restarted=await startServers({port:4517,stateFile});
 try{
  const first=await fetch(restartBase+'/members/login/');const cookie=first.headers.get('set-cookie').split(';')[0];let csrf=(await first.text()).match(/name="csrf" value="([^"]+)"/)[1];
  await fetch(restartBase+'/members/login/',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf,id:'201204010000',password:'20100615'}),redirect:'manual'});
  const home=await (await fetch(restartBase+'/members/',{headers:{cookie}})).text();csrf=home.match(/name="csrf" value="([^"]+)"/)[1];
  await fetch(restartBase+'/members/inquiry/',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf,record:'CH-2021-003'}),redirect:'manual'});
  const archiveBase=restartBase.replace(':4517',':4520');
  await fetch(archiveBase+'/room/login/',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf,ticket:'H17-0038',code:'W416-12'}),redirect:'manual'});
  for(const values of [{action:'register',handle:'再起動後も残す呼称'},{action:'card',index:0,selected:2}]){
   const result=await fetch(archiveBase+'/room/console/api/',{method:'POST',headers:{cookie},body:new URLSearchParams({...values,csrf})});assert.equal(result.status,200);
  }
  await restarted.close();restarted=await startServers({port:4517,stateFile});
  const response=await fetch(restartBase+'/members/messages/',{headers:{cookie},redirect:'manual'});assert.equal(response.status,200);assert.match(await response.text(),/保全資料_20261102.zip/);
  const preserved=await fetch(archiveBase+'/room/console/api/',{headers:{cookie}}).then(r=>r.json());assert.equal(preserved.trial.handle,'再起動後も残す呼称');assert.equal(preserved.trial.cards.length,1);assert.equal(preserved.trial.cards[0].selected,2);
 }finally{await restarted.close();await unlink(stateFile).catch(e=>{if(e.code!=='ENOENT')throw e;});}
});


test('receipt URLs cannot claim an ending for the wrong recipient or undo protection',async()=>{
 const c=client(),{caseId,zip}=await evidence(c);
 assert.equal((await c.get('/members/contact/received/')).response.headers.get('location'),'/members/contact/');
 await submitAgency('hozen',caseId,zip);
 const premature=await fetch(`http://127.0.0.1:${port+2}/received/?case=${caseId}`);assert.doesNotMatch(await premature.text(),/B-07で確認|施設外へ移動されました/);
 assert.match((await c.get('/visit/')).text,/見学の受付を休止しております/);
 const pending=await submitAgency('audit',caseId,zip);
 const pendingText=await fetch(app.origins.audit+pending.headers.get('location')).then(r=>r.text());
 assert.match(pendingText,/EA-2026-1102/);
 const additional=await fetch(app.origins.audit+'/receive/?case='+caseId).then(r=>r.text());
 assert.match(additional,/EA-2026-1102[\s\S]*name="archive"/);
 await c.login('20120901P0083','19930618');const full=Buffer.from(await (await c.binary('/members/download/complete.zip')).arrayBuffer());
 await submitAgency('audit',caseId,full);const again=await submitAgency('hozen',caseId,zip);assert.equal(again.status,303);assert.ok(again.headers.get('location').startsWith(app.origins.audit));
 await c.upload('/members/contact/',{subject:'原本再提出',message:'重複した資料です。'},'原本.zip',zip);
 assert.equal(app.cases.get(caseId).ending,'end3');assert.equal((await c.get('/people/asakura-tsumugi/')).response.status,200);
 assert.match((await c.get('/members/activity/')).text,/本件の確認は終了しております/);
 const closedInquiry=await c.post('/members/inquiry/',{record:'FAB-2026-018'});
 assert.equal(closedInquiry.status,409);
 assert.match(await closedInquiry.text(),/受付は終了しました/);
 assert.equal(app.cases.get(caseId).inquiryRecord,'CH-2021-003');
});

test('office transfer preserves the audit receipt and ends additional submissions',async()=>{
 const c=client(),{caseId,zip}=await evidence(c);
 await submitAgency('audit',caseId,zip);
 await c.upload('/members/contact/',{subject:'資料の確認',message:'添付資料をご確認ください。'},'資料.zip',zip);
 const receipt=await fetch(app.origins.audit+'/receive/?case='+caseId).then(r=>r.text());
 assert.match(receipt,/EA-2026-1102[\s\S]*追加受付は終了しました/);
 assert.doesNotMatch(receipt,/追加資料を提出する|name="archive"/);
 assert.equal((await submitAgency('audit',caseId,zip)).status,409);
});


test('printed editions and archival copies follow the underlying record permissions',async()=>{
 const c=client(),pdf='/members/download/records/YH-2018-041.pdf',annex='/members/download/records/YH-2018-041-A.pdf',scan='/members/download/records/RG-2007-011-scan.jpg';
 const westCopy='/members/download/records/MX-2019-410-scan.jpg',eastWork='/members/download/records/PUB-2023-014.pdf';
 const individualCopy='/members/download/records/YH-2018-041-A-scan.jpg';
 assert.equal((await c.binary(pdf)).status,303);
 await c.login('201204010017','20080519');const aggregate=await c.binary(pdf);assert.equal(aggregate.status,200);assert.equal(aggregate.headers.get('content-type'),'application/pdf');assert.equal(Buffer.from(await aggregate.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
 assert.equal((await c.binary(annex)).status,404);assert.equal((await c.binary(scan)).status,404);
 assert.equal((await c.binary(individualCopy)).status,404);
 assert.equal((await c.binary(westCopy)).status,404);
 await c.login('201804010046','20151112');assert.equal((await c.binary(annex)).status,200);
 const individual=await c.binary(individualCopy);
 assert.equal(individual.status,200);assert.equal(individual.headers.get('content-type'),'image/jpeg');
 assert.equal(Buffer.from(await individual.arrayBuffer()).readUInt16BE(0),0xffd8);
 const west=await c.binary(westCopy);assert.equal(west.status,200);assert.equal(west.headers.get('content-type'),'image/jpeg');
 assert.equal((await c.binary(eastWork)).status,404);
 await c.login('201204010000','20100615');const copy=await c.binary(scan);assert.equal(copy.status,200);assert.equal(copy.headers.get('content-type'),'image/jpeg');assert.equal(Buffer.from(await copy.arrayBuffer()).readUInt16BE(0),0xffd8);
 const east=await c.binary(eastWork);assert.equal(east.status,200);assert.equal(east.headers.get('content-type'),'application/pdf');
 assert.equal((await c.binary('/assets/record-media/YH-2018-041-A.pdf')).status,404);
 assert.equal((await c.binary('/assets/record-media/YH-2018-041-A-scan.jpg')).status,404);
});
