import {test} from 'node:test';
import assert from 'node:assert/strict';
import {labRules,normalizeHandle,registerTrial,chooseCard,beginParticle,cancelParticle,finishParticle,particleScene,particlePosition,scoreObservation,trialView} from '../public/lab-core.js';
const registered=()=>registerTrial(null,'試験協力者',{now:1000,random:()=>123456});
const cardsDone=()=>{let state=registered();for(let i=0;i<5;i++)state=chooseCard(state,i,i%5,{now:2000+i});return state;};

test('five sealed card choices persist across duplicates, renaming and invalid submissions',()=>{
 let state=registered();const answers=[...state.answers];assert.equal(answers.length,5);assert.ok(answers.every(n=>n>=0&&n<5));
 assert.equal('answers'in trialView(state),false);
 state=chooseCard(state,0,answers[0]);assert.equal(trialView(state).cardCorrect,1);
 assert.equal(chooseCard(state,0,answers[0]),state);
 assert.throws(()=>chooseCard(state,0,(answers[0]+1)%5),/記録済み/);
 assert.throws(()=>chooseCard(state,2,0),/試行番号/);
 const renamed=registerTrial(state,'新しい呼称');assert.deepEqual(renamed.cards,state.cards);assert.deepEqual(renamed.answers,answers);
 assert.equal(renamed.registeredAt,1000);assert.equal(renamed.handle,'新しい呼称');
 assert.throws(()=>beginParticle(state),/カード試行/);
 for(let i=1;i<5;i++)state=chooseCard(state,i,state.answers[i]);
 assert.equal(trialView(state).senses.intuition,100);assert.throws(()=>chooseCard(state,5,0),/試行番号/);
 assert.throws(()=>registerTrial({...state,version:99},'呼称'),/記録は変更していません/);
});

test('particle scene, observation and scoring use the same deterministic positions',()=>{
 const scene=particleScene(421);assert.equal(scene.particles.length,100);assert.equal(scene.events.length,16);
 assert.equal(new Set(scene.events.map(e=>e.particleId)).size,16);assert.deepEqual(particleScene(421),scene);
 const taps=scene.events.map(event=>{const ms=event.startMs+100,p=scene.particles.find(p=>p.id===event.particleId),position=particlePosition(p,ms,event);return {ms,x:position.x,y:position.y};});
 const result=scoreObservation(421,taps);assert.equal(result.found,16);assert.equal(result.misses,0);assert.equal(result.meanReactionMs,100);
 assert.deepEqual(result.senses,{awareness:100,foresight:100,insight:100,resonance:100});
 assert.equal(scoreObservation(421,[]).found,0);
 assert.throws(()=>scoreObservation(421,[{ms:0,x:Infinity,y:0}]),/座標/);
 assert.throws(()=>scoreObservation(421,[{ms:1000,x:0,y:0},{ms:1100,x:0,y:0}]),/座標/);
});

test('interruption preserves cards and completion is accepted once without a minimum score',()=>{
 const cards=cardsDone();let state=beginParticle(cards,{now:5000,random:()=>421});const run=state.particleAttempt;
 assert.throws(()=>finishParticle(state,run.id,[],{now:5100}),/観測時間/);
 assert.throws(()=>cancelParticle(state,'wrong'),/観測番号/);
 state=cancelParticle(state,run.id);assert.deepEqual(state.cards,cards.cards);assert.equal(state.particle,null);
 state=beginParticle(state,{now:10000,random:()=>422});
 state=finishParticle(state,state.particleAttempt.id,[],{now:10000+labRules.durationMs});
 assert.equal(trialView(state).complete,true);assert.equal(state.particle.found,0);assert.equal(state.cards.length,5);
 assert.equal(finishParticle(state,'duplicate',[]),state);assert.equal(beginParticle(state),state);
 assert.equal(registerTrial(state,'名前の訂正').completedAt,state.completedAt);
});

test('handle validation accepts aliases and does not introduce other personal fields',()=>{
 assert.equal(normalizeHandle('　ＡＢＣ\n 灯　'),'ABC 灯');
 assert.throws(()=>normalizeHandle('　'),/1〜24/);assert.throws(()=>normalizeHandle('あ'.repeat(25)),/1〜24/);
 assert.equal('birthDate'in registered(),false);assert.equal('email'in registered(),false);
});
