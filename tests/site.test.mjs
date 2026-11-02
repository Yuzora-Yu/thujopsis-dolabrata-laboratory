import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {startServers} from '../server.mjs';
import {publicPaths,renderPublic} from '../src/render.mjs';
import {readFile,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {gallery,tenants,news} from '../src/content.mjs';

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
 const absent=(await c.get('/members/records/?document_id=YH-2018-041-A')).text;assert.match(absent,/該当する資料はありません/);assert.doesNotMatch(absent,/稲葉 澪/);
 assert.equal((await c.get('/members/records/YH-2018-041-A/')).response.status,404);
 assert.equal((await c.login('201804010046','20151112')).status,303);
 assert.match((await c.get('/members/records/YH-2018-041-A/')).text,/稲葉 澪/);
 assert.equal((await c.get('/members/records/RM-2020-019/')).response.status,404);
 assert.equal((await c.login('201204010000','20100615')).status,303);
 assert.match((await c.get('/members/records/?document_id=RM-2020-019')).text,/検索結果　1件/);
 assert.match((await c.get('/members/records/CH-2021-003/')).text,/私と同じ答え/);
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
 const c=client();const {caseId}=await evidence(c);assert.match((await c.get('/search/?q='+encodeURIComponent('朝倉 紬'))).text,/asakura-tsumugi/);assert.match((await c.get('/people/asakura-tsumugi/')).text,/1993年6月18日/);
 await c.login('20120901P0083','19930618');assert.match((await c.get('/members/personal/')).text,/原型継承試験/);assert.match((await c.get('/members/records/AS-2024-002/')).text,/原型から除外/);
 const doc=(await c.get('/members/records/EA-2026-009/')).text;assert.match(doc,/東都研究監査室/);assert.match(doc,/4319/);
 const r=await c.binary('/members/download/complete.zip');const zip=Buffer.from(await r.arrayBuffer());assert.ok(zip.includes(Buffer.from('継承計画.json')));assert.equal((await submitAgency('audit',caseId,zip)).status,303);assert.match((await c.get('/news/closure/')).text,/外部への資料移管/);
});
test('state changes require CSRF verification',async()=>{const r=await fetch(base+'/members/login/',{method:'POST',body:new URLSearchParams({id:'201204010017',password:'20080519'})});assert.equal(r.status,403);});

test('publication numbers form tight sequences independent of account registration',()=>{
 assert.deepEqual(gallery.map(g=>Number(g.id)),Array.from({length:30},(_,i)=>i+1));
 assert.deepEqual(tenants.map(t=>Number(t.page)),Array.from({length:18},(_,i)=>i+1));
 assert.equal(tenants.find(t=>t.page==='0003').id,'0017');
 assert.equal(new Set(gallery.map(g=>g.image)).size,gallery.length);
 assert.ok(news.filter(n=>n.listed).length<=18);
});

test('public search tolerates spacing and width, and member links open a separate tab',async()=>{
 const c=client();for(const q of ['朝倉紬','朝倉 紬','朝倉　紬','朝 倉  紬'])assert.match((await c.get('/search/?q='+encodeURIComponent(q))).text,/href="\/people\/asakura-tsumugi\//,q);
 assert.match((await c.get('/search/?q='+encodeURIComponent('３Ｄプリンター'))).text,/工房のご案内/);
 assert.match((await c.get('/membership/')).text,/href="\/members\/" target="_blank" rel="noopener"/);
 assert.doesNotMatch((await c.get('/')).text,/↗/);
});

test('document viewer can query another document from its footer and preserves permissions',async()=>{
 const c=client();await c.login('201204010017','20080519');
 const doc=(await c.get('/members/records/YH-2018-041/')).text;
 assert.match(doc,/<section class="record-lookup"[\s\S]*action="\/members\/records\/"[\s\S]*id="next-document-id"/);
 assert.match((await c.get('/members/records/?document_id=YH-2018-041-A')).text,/該当する資料はありません/);
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
 await c.login('201204010000','20100615');assert.match((await c.get('/members/records/RG-2007-011/')).text,/承継した事業としての設立には同意しない/);
 assert.match((await c.get('/members/records/HC-2021-031-R/')).text,/自発的な服用という説明/);
});

test('ordinary restart preserves authentication and the received-evidence state',async()=>{
 const stateFile=path.resolve('.work/state-persistence-test.json');await mkdir(path.dirname(stateFile),{recursive:true});await unlink(stateFile).catch(e=>{if(e.code!=='ENOENT')throw e;});
 const restartBase='http://127.0.0.1:4517';let restarted=await startServers({port:4517,stateFile});
 try{
  const first=await fetch(restartBase+'/members/login/');const cookie=first.headers.get('set-cookie').split(';')[0];let csrf=(await first.text()).match(/name="csrf" value="([^"]+)"/)[1];
  await fetch(restartBase+'/members/login/',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf,id:'201204010000',password:'20100615'}),redirect:'manual'});
  const home=await (await fetch(restartBase+'/members/',{headers:{cookie}})).text();csrf=home.match(/name="csrf" value="([^"]+)"/)[1];
  await fetch(restartBase+'/members/inquiry/',{method:'POST',headers:{cookie},body:new URLSearchParams({csrf,record:'CH-2021-003'}),redirect:'manual'});
  await restarted.close();restarted=await startServers({port:4517,stateFile});
  const response=await fetch(restartBase+'/members/messages/',{headers:{cookie},redirect:'manual'});assert.equal(response.status,200);assert.match(await response.text(),/保全資料_20261102.zip/);
 }finally{await restarted.close();await unlink(stateFile).catch(e=>{if(e.code!=='ENOENT')throw e;});}
});

