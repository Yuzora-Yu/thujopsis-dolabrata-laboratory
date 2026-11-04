// Independent ASUNARO protocol, adapted from PROJECT_SIXTH's card/particle concepts.
// No accounts, APIs, rewards or saved data are shared with the source game.
export const labRules=Object.freeze({version:1,cardCount:5,cardRounds:5,durationMs:30000,particleCount:100,width:960,height:540,cooldownMs:500,hitRadius:62});
export const labSenses=[['awareness','察知'],['foresight','予見'],['insight','洞察'],['intuition','感応'],['resonance','共鳴']];
const randomWord=()=>crypto.getRandomValues(new Uint32Array(1))[0];
export function normalizeHandle(value){
 const name=String(value||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f]/g,'').replace(/\s+/g,' ').trim();
 if(!name||Array.from(name).length>24)throw new Error('呼称を1〜24文字でご記入ください。');
 return name;
}
export function seededRandom(seed){
 let a=seed>>>0;return ()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function registerTrial(previous,handle,{now=Date.now(),random=randomWord}={}){
 const name=normalizeHandle(handle);
 if(previous?.version===labRules.version)return {...previous,handle:name};
 if(previous)throw new Error('保存済みの測定版を確認できません。記録は変更していません。');
 const rng=seededRandom(random());
 return {version:labRules.version,handle:name,registeredAt:now,answers:Array.from({length:labRules.cardRounds},()=>Math.floor(rng()*labRules.cardCount)),cards:[],particleAttempt:null,particle:null,completedAt:null};
}
export function chooseCard(trial,index,selected,{now=Date.now()}={}){
 if(!trial)throw new Error('協力者登録をお済ませください。');
 if(!Number.isInteger(index)||!Number.isInteger(selected)||selected<0||selected>=labRules.cardCount)throw new Error('カード番号をご確認ください。');
 if(index<trial.cards.length){if(trial.cards[index]?.selected===selected)return trial;throw new Error('この試行の選択は記録済みです。');}
 if(index!==trial.cards.length||index>=labRules.cardRounds)throw new Error('現在の試行番号をご確認ください。');
 const answer=trial.answers[index];
 return {...trial,cards:[...trial.cards,{index,selected,answer,correct:selected===answer,recordedAt:now}]};
}
export function beginParticle(trial,{now=Date.now(),random=randomWord,restart=false}={}){
 if(!trial||trial.cards.length!==labRules.cardRounds)throw new Error('カード試行を先に完了してください。');
 if(trial.particle)return trial;
 if(trial.particleAttempt&&!restart)return trial;
 return {...trial,particleAttempt:{id:random().toString(16).padStart(8,'0')+random().toString(16).padStart(8,'0'),seed:random(),startedAt:now}};
}
export function cancelParticle(trial,attemptId){
 if(!trial||trial.particle)return trial;
 if(trial.particleAttempt?.id!==attemptId)throw new Error('観測番号をご確認ください。');
 return {...trial,particleAttempt:null};
}
export function particleScene(seed){
 const rng=seededRandom(seed),heading=rng()*Math.PI*2;
 const particles=Array.from({length:labRules.particleCount},(_,id)=>({id,x:30+rng()*900,y:30+rng()*480,phase:rng()*Math.PI*2,speed:18+rng()*20,heading:heading+(rng()-.5)*Math.PI/2}));
 const types=[...Array(4).fill('deviation'),...Array(4).fill('precursor'),...Array(3).fill('emergence'),...Array(3).fill('desync'),...Array(2).fill('hidden-rule')];
 const ids=Array.from({length:labRules.particleCount},(_,i)=>i);
 for(const list of [types,ids])for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
 const events=types.map((type,i)=>({id:'E'+i,type,particleId:ids[i],startMs:1500+i*1500,revealMs:3000+i*1500,endMs:5500+i*1500}));
 return {particles,events};
}
const bounce=(v,max)=>{const n=((v%(max*2))+max*2)%(max*2);return n>max?2*max-n:n;};
export function particlePosition(p,ms,event){
 const t=ms/1000;let x=p.x+t*p.speed,y=p.y+Math.sin(t*.6+p.phase)*20,radius=3.4+Math.sin(t*2)*.7;
 const visible=!(event?.type==='emergence'&&ms<event.startMs);
 if(event&&ms>=event.startMs&&ms<=event.endMs){const e=(ms-event.startMs)/1000;
  if(event.type==='deviation'){x-=e*60;y+=Math.sin(e)*65;}
  if(event.type==='precursor'){x+=e*e*5;y-=e*e*3;}
  if(event.type==='desync')radius=3.4+Math.sin(t*2+Math.PI)*2;
  if(event.type==='hidden-rule')y+=Math.sin((ms-event.startMs)/(event.endMs-event.startMs)*Math.PI)*75;
 }
 const dx=x-p.x,dy=y-p.y;
 return {x:10+bounce(p.x+dx*Math.cos(p.heading)-dy*Math.sin(p.heading),940),y:10+bounce(p.y+dx*Math.sin(p.heading)+dy*Math.cos(p.heading),520),radius,visible};
}
export function judgeTap(scene,tap,found=new Set()){
 const candidates=scene.particles.map(p=>{const event=scene.events.find(e=>e.particleId===p.id),position=particlePosition(p,tap.ms,event);return {event,particleId:p.id,...position,distance:position.visible?Math.hypot(position.x-tap.x,position.y-tap.y):Infinity};}).sort((a,b)=>a.distance-b.distance);
 const active=candidates.filter(c=>c.event&&c.distance<=labRules.hitRadius&&tap.ms>=c.event.startMs&&tap.ms<=c.event.endMs);
 const hit=active.find(c=>!found.has(c.event.id))||active[0];
 if(!hit)return {kind:'miss'};
 return {...hit,kind:found.has(hit.event.id)?'duplicate':'hit'};
}
export function scoreObservation(seed,taps){
 if(!Array.isArray(taps)||taps.length>120)throw new Error('観測ログをご確認ください。');
 const scene=particleScene(seed),found=new Set(),hits=[];let last=-labRules.cooldownMs,misses=0;
 for(const tap of taps){
  if(!tap||![tap.ms,tap.x,tap.y].every(Number.isFinite)||tap.ms<0||tap.ms>labRules.durationMs||tap.ms-last<labRules.cooldownMs||tap.x<0||tap.x>labRules.width||tap.y<0||tap.y>labRules.height)throw new Error('観測時刻と座標をご確認ください。');
  last=tap.ms;const decision=judgeTap(scene,tap,found);
  if(decision.kind==='miss'){misses++;continue;}
  if(decision.kind==='duplicate')continue;
  found.add(decision.event.id);hits.push({eventId:decision.event.id,type:decision.event.type,ms:tap.ms,reactionMs:tap.ms-decision.event.startMs,leadMs:decision.event.type==='precursor'?Math.max(0,decision.event.revealMs-tap.ms):0});
 }
 const count=type=>hits.filter(h=>h.type===type).length;
 return {seed,found:found.size,total:16,misses,hits,meanReactionMs:hits.length?Math.round(hits.reduce((n,h)=>n+h.reactionMs,0)/hits.length):null,senses:{awareness:Math.round((count('deviation')+count('emergence'))/7*100),foresight:Math.round(hits.filter(h=>h.leadMs>0).length/4*100),insight:count('hidden-rule')*50,resonance:Math.round(count('desync')/3*100)}};
}
export function finishParticle(trial,attemptId,taps,{now=Date.now()}={}){
 if(!trial)throw new Error('協力者登録をお済ませください。');
 if(trial.particle)return trial;
 const run=trial.particleAttempt;
 if(!run||run.id!==attemptId)throw new Error('観測番号をご確認ください。');
 if(now-run.startedAt<labRules.durationMs-200)throw new Error('観測時間を確認できませんでした。再度観測を開始してください。');
 const particle=scoreObservation(run.seed,taps);
 return {...trial,particle,particleAttempt:null,completedAt:now};
}
export function trialView(trial){
 if(!trial)return null;
 const correct=trial.cards.filter(card=>card.correct).length;
 return {version:trial.version,handle:trial.handle,registeredAt:trial.registeredAt,cards:trial.cards,cardCorrect:correct,particleAttempt:trial.particleAttempt,particle:trial.particle,completedAt:trial.completedAt,complete:!!trial.completedAt,senses:{awareness:0,foresight:0,insight:0,resonance:0,...trial.particle?.senses,intuition:trial.cards.length===5?correct*20:0}};
}
export function advanceTrial(trial,action,input={},options={}){
 if(action==='register')return registerTrial(trial,input.handle,options);
 if(action==='card')return chooseCard(trial,Number(input.index),Number(input.selected),options);
 if(action==='particle_start')return beginParticle(trial,{...options,restart:input.restart===true||input.restart==='1'});
 if(action==='particle_cancel')return cancelParticle(trial,input.attemptId);
 if(action==='particle_finish'){
  let taps;try{taps=Array.isArray(input.taps)?input.taps:JSON.parse(String(input.taps||''));}catch{throw new Error('観測ログをご確認ください。');}
  return finishParticle(trial,input.attemptId,taps,options);
 }
 throw new Error('測定の操作区分をご確認ください。');
}
