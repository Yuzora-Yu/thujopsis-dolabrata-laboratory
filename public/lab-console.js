import {labRules,labSenses,particleScene,particlePosition,judgeTap} from './lab-core.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,extra='')=>`<button type="button" class="lab-button" data-lab-action="${action}" ${extra}>${label}</button>`;
const senses=values=>`<table class="lab-senses"><caption>単回測定値／0–100</caption><tbody>${labSenses.map(([key,label])=>`<tr><th scope="row">${label}</th><td><meter min="0" max="100" value="${Number(values[key])||0}" aria-label="${label} ${Number(values[key])||0}">${Number(values[key])||0}</meter></td><td>${Number(values[key])||0}</td></tr>`).join('')}</tbody></table>`;
let disposeCurrent=()=>{};

export async function initConsole(options={}){
 const thanks=document.querySelector('[data-lab-thanks]');
 if(thanks&&options.trial!==undefined){thanks.hidden=!options.trial?.complete;const name=thanks.querySelector('[data-lab-thanks-name]');if(name)name.textContent=options.trial?.handle||'';}
 const assessment=document.querySelector('[data-lab-assessment]');
 if(assessment&&options.trial!==undefined){
  const t=options.trial,closed=options.ending==='end3';assessment.hidden=!t?.complete;
  for(const [field,value]of Object.entries({handle:t?.handle||'',cards:t?.cardCorrect||0,particles:t?.particle?.found||0,status:closed?'終了／原本保全':'一次測定受領／継続判定待ち',note:closed?'外部協力者への継続照会は終了した。測定原票は保全資料へ分離。':'AP-06から回付された原票を、外部協力者の照合票に併合。測定完了を、本件の照会終了として扱わない。'}))assessment.querySelector('[data-lab-assessment-'+field+']').textContent=value;
 }
 const root=document.querySelector('[data-lab-root]');if(!root)return;
 disposeCurrent();let context=null,busy=false,raf=0,active=false,abortObservation=()=>{},pending=null;
 const endpoint=root.dataset.labApi,bridge=options.bridge||window.asunaroLabBridge;
 async function request(action,input={},retry=true){
  if(bridge){context=await bridge(action,input);return context;}
  const values=new URLSearchParams({action,csrf:context?.csrf||''});for(const [key,value]of Object.entries(input))values.set(key,typeof value==='object'?JSON.stringify(value):String(value));
  const response=await fetch(endpoint,{method:action==='context'?'GET':'POST',credentials:'same-origin',...(action==='context'?{}:{body:values})});
  let result;try{result=await response.json();}catch{throw new Error('測定端末の応答を確認できませんでした。再度お試しください。');}
  if(response.status===403&&action!=='context'&&retry){await request('context');return request(action,input,false);}
  if(!response.ok)throw new Error(result.error||'測定記録を受け付けられませんでした。');context=result;return result;
 }
 function focusSurface(element){
  element.focus({preventScroll:true});
  const {top,bottom}=element.getBoundingClientRect();
  if(top<0||bottom>window.innerHeight)element.scrollIntoView({block:'center',behavior:'instant'});
 }
 function focusPanel(){
  const heading=root.querySelector('.lab-panel h2');
  if(!heading)return;
  heading.tabIndex=-1;
  focusSurface(heading);
 }
 function related(){const element=document.querySelector('[data-lab-related]');if(!element)return;element.hidden=!context?.trial?.complete;if(!element.hidden){element.innerHTML='<a href="https://yu-zora.com/games/Game06_project-sixth.html" target="_blank" rel="noopener">関連コンテンツ：PROJECT SIXTH<span class="sr-only">（別タブで開きます）</span></a>';document.querySelector('.fiction-footer')?.append(element);}}
 function identity(){const t=context.trial;return `<div class="lab-identity"><span>呼称　<strong>${esc(t.handle)}</strong></span><details><summary>呼称の訂正</summary><form data-lab-form><label for="lab-rename">呼称</label><input id="lab-rename" name="handle" maxlength="24" value="${esc(t.handle)}" required autocomplete="nickname"><button class="lab-button" type="submit">訂正して保存</button></form></details></div>`;}
 function error(message){let target=root.querySelector('.lab-error');if(!target){target=document.createElement('p');target.className='lab-error';target.setAttribute('role','alert');root.prepend(target);}target.textContent=message;}
 function cardHistory(t){return t.cards.length?`<details class="lab-card-history"><summary>カード原票　${t.cards.length}件</summary><table><thead><tr><th>試行</th><th>選択</th><th>★の位置</th><th>記録</th></tr></thead><tbody>${t.cards.map(c=>`<tr><td>${c.index+1}</td><td>${c.selected+1}</td><td>${c.answer+1}</td><td>${c.correct?'一致':'不一致'}</td></tr>`).join('')}</tbody></table></details>`:'';}
 function cardButtons(record=null){return `<div class="lab-cards">${Array.from({length:5},(_,i)=>`<button type="button" class="lab-card${record?.selected===i?' is-selected':''}${record?.answer===i?' has-star':''}" data-lab-action="card" data-index="${i}" aria-label="カード ${i+1}${record?.answer===i?'、★':''}${record?.selected===i?'、選択済み':''}"${record?' disabled':''}><span>${record?(record.answer===i?'★':'・'):'＋'}</span><small>${String(i+1).padStart(2,'0')}</small></button>`).join('')}</div>`;}
 function renderCardFeedback(){const t=context.trial,last=t.cards.at(-1);root.innerHTML=identity()+`<section class="lab-panel"><p class="lab-step">カード反応　${t.cards.length} / 5</p><h2>${last.correct?'一致を記録しました。':'選択を記録しました。'}</h2>${cardButtons(last)}<p>★は ${last.answer+1} 番でした。</p>${button('continue',t.cards.length===5?'粒子観測へ':'次の試行へ')}</section>`+cardHistory(t);}
 function render(){
  const t=context?.trial;
  if(!t){root.innerHTML=`<section class="lab-panel"><p class="lab-step">AP-06／協力者登録</p><h2>測定に使用する呼称</h2><p>カードの選択反応を5回、粒子の観測を1回記録します。呼称は各測定の原票に使用します。</p><form data-lab-form><label for="lab-handle">呼称（ハンドルネーム可）</label><input id="lab-handle" name="handle" maxlength="24" required autocomplete="nickname"><button type="submit" class="lab-button">呼称を登録</button></form></section>`;return;}
  related();
  if(root.dataset.labView==='subjects'){
   if(!t.complete){root.innerHTML=identity()+`<section class="lab-panel"><h2>原票の交付</h2><p>照合用の原票は、一次測定の受領後に交付します。</p><a class="lab-button" href="${esc(root.dataset.labHome)}">測定端末へ</a></section>`;return;}
   const subjects=context.subjects||[];
   root.innerHTML=identity()+`
    <p class="lab-method">原票保存分：${subjects.length}件。記録時点の値と測定日を併記しております。</p>
    <div class="lab-subject-list">${subjects.map(person=>`
     <details class="lab-subject">
      <summary><span>${esc(person.id)}</span><strong>${esc(person.name)}</strong><time>${esc(person.date)}</time></summary>
      <div class="lab-subject-body">
       <dl class="lab-slip"><div><dt>用途</dt><dd>${esc(person.use)}</dd></div><div><dt>回付欄</dt><dd>${esc(person.routing)}</dd></div></dl>
       <p class="lab-note">${esc(person.note)}</p>
       <p><a href="${esc(root.dataset.labMain+person.profile)}" target="_blank" rel="noopener">公開時の活動記録<span class="sr-only">（別タブで開きます）</span></a></p>
       <details class="lab-subject-values"><summary>測定値<span>カード ${person.cardHits} / 5　粒子 ${person.found} / 16</span></summary>${senses(person.senses)}</details>
       ${person.current?`<dl class="lab-current"><dt>管理照合　${esc(person.currentAsOf)}</dt><dd>${esc(person.current)}</dd><dt>参照原本</dt><dd>${esc(person.source)}</dd></dl>`:''}
      </div>
     </details>`).join('')}</div>
    <a class="lab-button" href="${esc(root.dataset.labHome)}">自分の測定記録へ</a>`;
   return;
  }
  if(t.cards.length<5){root.innerHTML=identity()+`<section class="lab-panel"><p class="lab-step">カード反応　${t.cards.length+1} / 5</p><h2>★が入ったカードを一枚選択</h2><p>五枚のうち一枚に★があります。位置は選択前に確定しています。</p>${cardButtons()}<p class="lab-method">一試行の一致確率：20%</p></section>`+cardHistory(t);return;}
  if(!t.particle){root.innerHTML=identity()+`<section class="lab-panel"><p class="lab-step">粒子観測　1回</p><h2>通常と異なる動きを記録</h2><p>30秒間、100個の粒子を観測します。向き、現れ方、明滅などが通常と異なる地点を選択してください。</p><p class="lab-method">入力間隔：0.5秒。キーボードでは矢印キーで照準を動かし、SpaceまたはEnterで記録できます。</p>${t.particleAttempt?'<p>前回の観測は未受領です。カードの原票を保持して、粒子観測を再開します。</p>':''}${context.ending==='end3'?'<p class="lab-method">事業停止後の保全用再現測定です。</p>':''}${button('start',t.particleAttempt?'粒子観測を再開':'粒子観測を開始')}</section>`+cardHistory(t);return;}
  root.innerHTML=identity()+`<section class="lab-panel lab-result"><p class="lab-step">一次測定／受領済み</p><h2>${esc(t.handle)}さんの測定記録</h2><dl class="lab-result-numbers"><div><dt>カード一致</dt><dd>${t.cardCorrect} / 5</dd></div><div><dt>検出した異常</dt><dd>${t.particle.found} / 16</dd></div><div><dt>該当なしの入力</dt><dd>${t.particle.misses}</dd></div><div><dt>平均反応</dt><dd>${t.particle.meanReactionMs===null?'—':(t.particle.meanReactionMs/1000).toFixed(2)+'秒'}</dd></div></dl>${senses(t.senses)}<p class="lab-method">本記録は単回測定値です。再現性の確認欄は未記入として保存しています。</p><dl class="lab-receipt lab-slip"><div><dt>受領区分</dt><dd>照会端末の原票</dd></div><div><dt>回付欄</dt><dd>${context.ending==='end3'?'保全用原本へ編入':'写しには記載なし'}</dd></div><div><dt>照会状況</dt><dd>${context.ending==='end3'?'照会終了／原本保全':'記録受領／継続照会'}</dd></div></dl><a class="lab-button" href="${esc(root.dataset.labSubjects)}">被験者の測定原票</a></section>`+cardHistory(t);
 }
 async function saveObservation(){
  if(!pending)return;busy=true;
  try{await request('particle_finish',pending);pending=null;render();focusPanel();}
  catch(err){root.innerHTML=`<section class="lab-panel"><h2>測定記録の受領待ち</h2><p class="lab-error" role="alert">${esc(err.message)}</p>${button('save','保存を再試行')}${button('cancel','観測を中断して戻る')}</section>`;}
  finally{busy=false;}
 }
 function observe(){
  const run=context.trial.particleAttempt,scene=particleScene(run.seed),eventMap=new Map(scene.events.map(e=>[e.particleId,e]));
  root.innerHTML=`<section class="lab-panel lab-observation"><div class="lab-observation-head"><h2>粒子観測</h2><p><span class="lab-time">30</span>秒　検出 <span class="lab-found">0</span> / 16</p></div><canvas class="lab-canvas" width="960" height="540" tabindex="0" aria-label="粒子観測面。矢印キーで照準移動、SpaceかEnterで記録"></canvas><p class="lab-feedback" role="status">通常と異なる地点を選択してください。</p>${button('cancel','観測を中断')}</section>`;
  const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),found=new Set(),discovered=new Set(),taps=[],effects=[];let renderedMs=0,lastTap=-500,lastSecond=30,keyboard=false,aim={x:480,y:270};focusSurface(canvas);
  const start=performance.now();active=true;pending=null;
  function cleanup(){active=false;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',hidden);}
  abortObservation=cleanup;
  function mark(x,y){if(!active)return;if(renderedMs-lastTap<500){root.querySelector('.lab-feedback').textContent='入力待ちです（0.5秒間隔）。';return;}lastTap=renderedMs;const tap={ms:renderedMs,x,y},decision=judgeTap(scene,tap,found);taps.push(tap);effects.push({x,y,at:renderedMs,kind:decision.kind});if(decision.kind==='hit'){found.add(decision.event.id);discovered.add(decision.particleId);root.querySelector('.lab-found').textContent=String(found.size);}const message=decision.kind==='hit'?'異常を記録しました。':decision.kind==='duplicate'?'同じ異常は記録済みです。':'この地点に該当する異常はありません。';root.querySelector('.lab-feedback').textContent=message+'（入力 '+taps.length+' 件）';}
  canvas.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();const rect=canvas.getBoundingClientRect(),style=getComputedStyle(canvas),left=parseFloat(style.borderLeftWidth)||0,right=parseFloat(style.borderRightWidth)||0,top=parseFloat(style.borderTopWidth)||0,bottom=parseFloat(style.borderBottomWidth)||0;const x=(event.clientX-rect.left-left)*960/(rect.width-left-right),y=(event.clientY-rect.top-top)*540/(rect.height-top-bottom);if(x>=0&&x<=960&&y>=0&&y<=540)mark(x,y);});
  canvas.addEventListener('keydown',event=>{const moves={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};if(moves[event.key]){event.preventDefault();keyboard=true;const [x,y]=moves[event.key];aim={x:Math.max(0,Math.min(960,aim.x+x)),y:Math.max(0,Math.min(540,aim.y+y))};}else if([' ','Enter'].includes(event.key)){event.preventDefault();keyboard=true;mark(aim.x,aim.y);}});
  async function hidden(){if(!document.hidden||!active)return;cleanup();busy=true;try{await request('particle_cancel',{attemptId:run.id});render();error('画面を離れたため観測を中断しました。カードの原票は保存されています。');}catch(err){render();error(err.message);}finally{busy=false;}}
  document.addEventListener('visibilitychange',hidden);
  function frame(now){if(!active||!root.isConnected)return;renderedMs=Math.min(30000,Math.max(0,Math.round(now-start)));ctx.fillStyle='#edf0e9';ctx.fillRect(0,0,960,540);ctx.strokeStyle='#d9dfd4';ctx.lineWidth=1;for(let x=0;x<=960;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,540);ctx.stroke();}for(let y=0;y<=540;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();}const dotScale=Math.max(1,480/Math.max(1,canvas.clientWidth));ctx.fillStyle='#314b43';for(const p of scene.particles){if(discovered.has(p.id))continue;const position=particlePosition(p,renderedMs,eventMap.get(p.id));if(!position.visible)continue;ctx.beginPath();ctx.arc(position.x,position.y,position.radius*dotScale,0,Math.PI*2);ctx.fill();}while(effects.length&&renderedMs-effects[0].at>700)effects.shift();for(const e of effects){ctx.strokeStyle=e.kind==='hit'?'#467c5e':'#9b7460';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,labRules.hitRadius,0,Math.PI*2);ctx.stroke();}if(keyboard){ctx.strokeStyle='#375744';ctx.beginPath();ctx.moveTo(aim.x-12,aim.y);ctx.lineTo(aim.x+12,aim.y);ctx.moveTo(aim.x,aim.y-12);ctx.lineTo(aim.x,aim.y+12);ctx.stroke();}const second=Math.ceil((30000-renderedMs)/1000);if(second!==lastSecond){root.querySelector('.lab-time').textContent=String(second);lastSecond=second;}if(renderedMs>=30000){cleanup();pending={attemptId:run.id,taps};void saveObservation();return;}raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
 }
 root.addEventListener('submit',async event=>{const form=event.target.closest('[data-lab-form]');if(!form)return;event.preventDefault();if(busy||!form.reportValidity())return;busy=true;try{await request('register',{handle:new FormData(form).get('handle')});render();focusPanel();}catch(err){error(err.message);}finally{busy=false;}});
 root.addEventListener('click',async event=>{const target=event.target.closest('[data-lab-action]');if(!target)return;const action=target.dataset.labAction;if(busy)return;if(action==='continue'){render();focusPanel();return;}if(action==='save'){await saveObservation();return;}busy=true;try{if(action==='card'){root.querySelectorAll('.lab-card').forEach(b=>b.disabled=true);await request('card',{index:context.trial.cards.length,selected:Number(target.dataset.index)});renderCardFeedback();focusPanel();}if(action==='start'){await request('particle_start',{restart:!!context.trial.particleAttempt});observe();}if(action==='cancel'){abortObservation();const attemptId=context.trial.particleAttempt?.id||pending?.attemptId;if(attemptId)await request('particle_cancel',{attemptId});pending=null;render();focusPanel();}if(action==='refresh'){await request('context');render();}}catch(err){if(!active)render();error(err.message);}finally{busy=false;}});
 disposeCurrent=()=>{abortObservation();};
 try{await request('context');render();}catch(err){root.innerHTML=`<section class="lab-panel"><h2>測定端末の照合</h2><p class="lab-error" role="alert">${esc(err.message)}</p>${button('refresh','照合を再試行')}</section>`;}
}
if(!document.querySelector('meta[name="asunaro-base"]'))void initConsole();
