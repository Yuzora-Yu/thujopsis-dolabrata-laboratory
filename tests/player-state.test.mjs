import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApplication} from '../server.mjs';
import {accounts} from '../src/content.mjs';
import {buildEvidenceArchive} from '../src/archive.mjs';
import {nextEnding} from '../src/evidence.mjs';
import {normalizePlayerState,playerSnapshot,addPlayerVisit,recordEnding,restartPlayerState,maxPlayerVisits} from '../src/player-state.mjs';

const at='2026-11-07T00:00:00.000Z';
const retained={contact:true,inquiryRecord:'CH-2021-003',downloaded:true,truth:true,
 consoleTrial:{handle:'検証者',cards:[{index:0,correct:true}],completedAt:100},seedNotes:[1,4,9],readingHistory:['YH-2016-032']};
const visit={kind:'main',path:'/about/?q=discard#part',title:'施設について',stage:'SEED'};

test('a legacy ending migrates once; every ending can explicitly restart toward any other ending without losing exploration',()=>{
 for(const previous of ['end1','end2','end3'])for(const target of ['end1','end2','end3']){
  const state={...structuredClone(retained),ending:previous,officeReceipt:true,auditPending:true};
  normalizePlayerState(state,at);addPlayerVisit(state,visit,at);
  normalizePlayerState(state,'2026-11-08T00:00:00.000Z');
  assert.deepEqual(state.endings,[{id:previous,reachedAt:at}]);
  restartPlayerState(state,0,'2026-11-09T00:00:00.000Z');
  assert.equal(state.ending,'');assert.equal(state.revision,1);
  assert.equal('officeReceipt'in state,false);assert.equal('auditPending'in state,false);
  for(const [key,value] of Object.entries(retained))assert.deepEqual(state[key],value,key);
  assert.equal(state.visits.length,1);
  recordEnding(state,nextEnding(state.ending,target),'2026-11-10T00:00:00.000Z');
  assert.equal(state.ending,target);assert.equal(state.endings.length,previous===target?1:2);
  assert.equal(state.endings.find(e=>e.id===previous).reachedAt,at);
 }
 const state={ending:'end1'};normalizePlayerState(state,at);
 assert.throws(()=>restartPlayerState(state,1),/別の画面/);
 restartPlayerState(state,0);assert.throws(()=>restartPlayerState(state,1),/戻せる結末/);
});

test('visits strip query data, merge by provider/path, retain first time, and validate untrusted entries and capacity',()=>{
 const state={ending:''};
 addPlayerVisit(state,visit,at);
 addPlayerVisit(state,{...visit,path:'/about/index.html?case=private',title:'あすなろについて',stage:'root'},'2026-11-08T00:00:00Z');
 addPlayerVisit(state,{...visit,kind:'archive',path:'/about/'},at);
 assert.equal(state.visits.length,2);
 assert.deepEqual(state.visits[0],{kind:'main',path:'/about/',title:'あすなろについて',stage:'root',firstVisitedAt:at,lastVisitedAt:'2026-11-08T00:00:00.000Z'});
 for(const invalid of [{path:'https://other.invalid/'},{path:'//other.invalid/'},{path:'/%5cother/'},{kind:'other'},{title:'<script>'},{stage:'unknown'}])
  assert.throws(()=>addPlayerVisit(state,{...visit,...invalid}));
 const snapshot=playerSnapshot(state);snapshot.visits[0].title='changed';assert.notEqual(state.visits[0].title,'changed');
 state.visits=Array.from({length:maxPlayerVisits},(_,i)=>({kind:'main',path:'/item/'+i+'/',title:'記事',stage:'seed',firstVisitedAt:at,lastVisitedAt:at}));
 assert.throws(()=>addPlayerVisit(state,{...visit,path:'/one-more/'}),/上限/);
 addPlayerVisit(state,{...visit,path:'/item/0/'});assert.equal(state.visits.length,maxPlayerVisits);
});

function client(app){
 let cookie='';
 return {
  async request(url,{method='GET',fields,form,kind='main'}={}){
   let body=Buffer.alloc(0),type='application/x-www-form-urlencoded';
   if(form){const packed=new Request('http://qa.invalid/',{method:'POST',body:form});type=packed.headers.get('content-type');body=Buffer.from(await packed.arrayBuffer());}
   else if(fields)body=Buffer.from(new URLSearchParams(fields).toString());
   const headers={cookie,'content-type':type};let status=200,text='',responseHeaders={};
   const req={url,method,headers,async *[Symbol.asyncIterator](){if(body.length)yield body;}};
   const res={headersSent:false,setHeader(name,value){responseHeaders[name.toLowerCase()]=value;},writeHead(code,values={}){status=code;for(const [key,value]of Object.entries(values))this.setHeader(key,value);this.headersSent=true;},end(value=''){text=Buffer.isBuffer(value)?value.toString('utf8'):String(value);}};
   await app.handler(req,res,kind);
   if(responseHeaders['set-cookie'])cookie=responseHeaders['set-cookie'].split(';')[0];
   return {status,text,headers:responseHeaders,json:()=>JSON.parse(text)};
  },
  async context(kind='main'){return (await this.request('/player-record/api/',{kind})).json();},
  async login(role){
   const [id,account]=Object.entries(accounts).find(([,a])=>a.role===role);
   const page=await this.request('/members/login/'),csrf=page.text.match(/name="csrf" value="([^"]+)"/)[1];
   assert.equal((await this.request('/members/login/',{method:'POST',fields:{id,password:account.password,csrf}})).status,303);
  },
  get session(){return app.sessions.get(cookie.split('=')[1]);},
 };
}
function evidence(complete=false){
 return buildEvidenceArchive({pdf:Buffer.from('%PDF-1.4\nAPI fixture'),records:Buffer.from(JSON.stringify({subjects:[{id:'P-034'}]})),
  continuity:Buffer.from(JSON.stringify({receiver:'検証用受領先',handover:['資料']})),healthComparison:Buffer.from('%PDF-1.4\nAPI fixture')},{complete});
}
async function formFor(c,kind,caseId,zip){
 const page=await c.request('/receive/?case='+caseId,{kind});assert.equal(page.status,200);
 const form=new FormData();
 for(const key of ['csrf','revision','case']){
  const value=page.text.match(new RegExp('name="'+key+'" value="([^"]*)"'))?.[1];assert.notEqual(value,undefined,key);form.set(key,value);
 }
 form.set('title','原本の保全');form.set('statement','関係資料を提出します。');form.set('archive',new Blob([zip]),'資料.zip');
 return form;
}

test('player API is available on every surface, rejects malformed writes, and never switches cases by query',async()=>{
 const app=createApplication(),c=client(app),initial=await c.context();
 assert.equal(initial.revision,0);assert.equal(initial.ending,'');assert.deepEqual(initial.endings,[]);assert.deepEqual(initial.origins,app.origins);
 for(const kind of ['archive','hozen','audit'])assert.equal((await c.context(kind)).csrf,initial.csrf);
 const request=fields=>c.request('/player-record/api/',{method:'POST',fields});
 assert.equal((await request({...visit,csrf:'wrong',action:'visit'})).status,403);
 assert.equal((await request({...visit,csrf:initial.csrf,action:'visit'})).status,200);
 assert.equal((await request({...visit,path:'//bad.invalid/',csrf:initial.csrf,action:'visit'})).status,400);
 assert.equal((await request({csrf:initial.csrf,action:'restart',revision:0})).status,409);
 const other=client(app);await other.context();assert.notEqual(c.session.caseId,other.session.caseId);
 const response=await c.request('/player-record/api/?case='+other.session.caseId);
 assert.equal(response.json().visits.length,1);assert.equal(app.cases.get(other.session.caseId).visits.length,0);
 await Promise.all(Array.from({length:20},(_,i)=>request({...visit,path:'/parallel/'+i+'/',csrf:initial.csrf,action:'visit'})));
 assert.equal((await c.context()).visits.length,21);
});

test('restart rotates only this case sessions, keeps authentication, and rejects a pre-restart evidence form',async()=>{
 const app=createApplication(),c=client(app);await c.login('institution');
 const state=app.cases.get(c.session.caseId);Object.assign(state,structuredClone(retained),{ending:'',officeReceipt:true,auditPending:true});
 const peer=client(app),stale=await formFor(peer,'audit',c.session.caseId,evidence(true));
 recordEnding(state,'end2');
 const snapshot=await c.context();
 assert.equal(peer.session.caseId,c.session.caseId,'a case-linked form in a fresh browser binds the same case');
 const peerCsrf=peer.session.csrf,account=c.session.accountId;
 const other=client(app);await other.context();const untouched=structuredClone(app.cases.get(other.session.caseId)),otherCsrf=other.session.csrf;
 const restart=await c.request('/player-record/api/',{method:'POST',fields:{action:'restart',csrf:snapshot.csrf,revision:snapshot.revision}});
 assert.equal(restart.status,200);assert.equal(restart.json().revision,1);assert.notEqual(restart.json().csrf,snapshot.csrf);
 assert.equal((await c.request('/player-record/api/',{method:'POST',fields:{action:'restart',csrf:restart.json().csrf,revision:0}})).status,409);
 assert.notEqual(peer.session.csrf,peerCsrf);assert.equal(c.session.accountId,account);assert.equal(other.session.csrf,otherCsrf);
 assert.deepEqual(app.cases.get(other.session.caseId),untouched);
 for(const [key,value]of Object.entries(retained))assert.deepEqual(state[key],value,key);
 assert.equal((await peer.request('/receive/',{kind:'audit',method:'POST',form:stale})).status,403);
 assert.equal(state.ending,'');assert.equal(state.auditPending,undefined);
 const fresh=await formFor(peer,'audit',c.session.caseId,evidence(true));
 assert.equal((await peer.request('/receive/',{kind:'audit',method:'POST',form:fresh})).status,303);
 assert.equal(state.ending,'end3');assert.deepEqual(state.endings.map(e=>e.id),['end2','end3']);
});

test('all three real submission routes retain first ending history; Asakura can see only her End2 receipt until restart',async()=>{
 const app=createApplication(),c=client(app);await c.login('institution');
 const state=app.cases.get(c.session.caseId);Object.assign(state,structuredClone(retained));
 let context=await c.context();
 let form=await formFor(c,'hozen',c.session.caseId,evidence());
 assert.equal((await c.request('/receive/',{kind:'hozen',method:'POST',form})).status,303);assert.equal(state.ending,'end1');
 context=await c.context();assert.equal((await c.request('/player-record/api/',{method:'POST',fields:{action:'restart',csrf:context.csrf,revision:context.revision}})).status,200);
 await c.login('asakura');
 const contact=await c.request('/members/contact/'),csrf=contact.text.match(/name="csrf" value="([^"]+)"/)[1];
 form=new FormData();for(const [key,value]of Object.entries({csrf,subject:'確認のお願い',message:'添付資料をご確認ください。'}))form.set(key,value);
 form.set('attachment',new Blob([evidence()]),'資料.zip');
 assert.equal((await c.request('/members/contact/',{method:'POST',form})).status,303);assert.equal(state.ending,'end2');
 assert.equal((await c.request('/members/contact/received/')).status,200);
 assert.equal((await c.request('/members/records/AS-2024-002/')).status,403);
 context=await c.context();assert.equal((await c.request('/player-record/api/',{method:'POST',fields:{action:'restart',csrf:context.csrf,revision:context.revision}})).status,200);
 assert.equal((await c.request('/members/contact/',{method:'POST',form})).status,403,'the old facility submission token cannot re-trigger End2');
 assert.equal(state.ending,'');assert.equal(state.officeReceipt,undefined);
 assert.equal((await c.request('/members/records/AS-2024-002/')).status,200,'authentication survives restart');
 form=await formFor(c,'audit',c.session.caseId,evidence(true));
 assert.equal((await c.request('/receive/',{kind:'audit',method:'POST',form})).status,303);assert.equal(state.ending,'end3');
 context=await c.context();assert.deepEqual(context.endings.map(e=>e.id),['end1','end2','end3']);
 assert.equal((await c.request('/player-record/api/',{method:'POST',fields:{action:'restart',csrf:context.csrf,revision:context.revision}})).status,200);
 assert.equal(state.ending,'');assert.equal(state.revision,3);assert.equal(state.endings.length,3);
 assert.deepEqual(state.consoleTrial,retained.consoleTrial);assert.equal(state.contact,true);assert.equal(state.downloaded,true);
});
