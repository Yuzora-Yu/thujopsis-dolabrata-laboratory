import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {startServers} from '../server.mjs';
import {labAction,labContext} from '../src/lab.mjs';
import {registerTrial,chooseCard,beginParticle,finishParticle} from '../public/lab-core.js';
let app;const port=4557,base=`http://127.0.0.1:${port+3}`;
before(async()=>{app=await startServers({port});});after(async()=>{await app.close();});
function client(){let cookie='',csrf='';return {
 async get(path){const r=await fetch(base+path,{headers:{cookie},redirect:'manual'});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const text=await r.text();csrf=text.match(/name="csrf" value="([^"]+)"/)?.[1]||csrf;return {status:r.status,text};},
 async auth(){await this.get('/room/console/');const result=await fetch(base+'/room/login/',{method:'POST',headers:{cookie},body:new URLSearchParams({ticket:'H17-0038',code:'W416-12',csrf}),redirect:'manual'});assert.equal(result.status,303);await this.context();},
 async context(){const r=await fetch(base+'/room/console/api/',{headers:{cookie}});const value=await r.json();csrf=value.csrf||csrf;return value;},
 async act(action,input={},token){const r=await fetch(base+'/room/console/api/',{method:'POST',headers:{cookie},body:new URLSearchParams({action,csrf:token??csrf,...input})});return {status:r.status,value:await r.json()};},
 get state(){const id=cookie.split('=')[1],session=app.sessions.get(id);return app.cases.get(session.caseId);},
 get caseId(){return app.sessions.get(cookie.split('=')[1]).caseId;}
};}
test('archive console protects raw subjects and future cards; existing case fields survive measurement and renaming',async()=>{
 const c=client();assert.equal((await c.get('/room/console/api/')).status,403);await c.auth();c.state.contact=true;c.state.downloaded=true;
 assert.equal((await c.context()).subjects,null);assert.equal((await c.act('register',{handle:'観測者'},'wrong')).status,403);
 let r=await c.act('register',{handle:'観測者 <灯>'});assert.equal(r.status,200);assert.equal('answers'in r.value.trial,false);assert.equal(r.value.subjects,null);
 assert.equal((await c.act('particle_start')).status,400);
 for(let index=0;index<5;index++){r=await c.act('card',{index,selected:0});assert.equal(r.status,200);assert.equal(r.value.trial.cards.length,index+1);}
 assert.equal((await c.act('card',{index:5,selected:0})).status,400);const cards=structuredClone(c.state.consoleTrial.cards);
 await c.act('register',{handle:'訂正した灯'});assert.deepEqual(c.state.consoleTrial.cards,cards);assert.equal(c.state.contact,true);assert.equal(c.state.downloaded,true);
 r=await c.act('particle_start');const attempt=r.value.trial.particleAttempt.id;assert.equal((await c.act('particle_finish',{attemptId:attempt,taps:'[]'})).status,400);
 // Only this test case's clock is advanced; no saved user cases are involved.
 c.state.consoleTrial.particleAttempt.startedAt-=31000;r=await c.act('particle_finish',{attemptId:attempt,taps:'[]'});assert.equal(r.status,200);assert.equal(r.value.trial.particle.found,0);assert.equal(r.value.trial.complete,true);assert.equal(r.value.subjects.length,5);
 const endTime=r.value.trial.completedAt;await c.act('particle_start');assert.equal(c.state.consoleTrial.completedAt,endTime);assert.equal(c.state.consoleTrial.particleAttempt,null);
 const untouched=client();await untouched.auth();assert.equal((await untouched.context()).trial,null);assert.equal((await untouched.context()).subjects,null);
 c.state.ending='end3';const receipt=await fetch(`http://127.0.0.1:${port+2}/received/?case=${c.caseId}`).then(r=>r.text());assert.match(receipt,/訂正した灯/);assert.match(receipt,/私も一緒に帰りたい/);assert.doesNotMatch(receipt,/data-lab-thanks hidden/);
 untouched.state.ending='end3';const ordinary=await fetch(`http://127.0.0.1:${port+2}/received/?case=${untouched.caseId}`).then(r=>r.text());assert.match(ordinary,/data-lab-thanks hidden/);assert.doesNotMatch(ordinary,/訂正した灯/);
});
test('completion is independent of score and later case outcomes; names stay text rather than executable markup',()=>{
 let t=registerTrial(null,'<img onerror=alert(1)>',{random:()=>33,now:1000});for(let i=0;i<5;i++)t=chooseCard(t,i,(t.answers[i]+1)%5);t=beginParticle(t,{now:1000,random:()=>44});t=finishParticle(t,t.particleAttempt.id,[],{now:901000});
 const original={contact:true,truth:true,ending:'end2',consoleTrial:t};labAction(original,'register',{handle:'訂正'});assert.equal(original.ending,'end2');assert.equal(original.truth,true);assert.equal(labContext(original).trial.complete,true);assert.equal(labContext(original).trial.cardCorrect,0);assert.equal(labContext(original).trial.particle.found,0);
});
