import {matchesSearch,normalizeDocumentId,documentLookupMessages} from './search-engine.js';
import {isValidReservation,updateReservationHours} from './assets/reservation-policy.js';
import {classifyEvidence,nextEnding} from './evidence.js';
import {advanceTrial,trialView} from './lab-core.js';

const base=document.querySelector('meta[name="asunaro-base"]')?.content||'';
const storageKey='asunaro-preview-v1:'+base,authKey=storageKey+':auth',archiveKey=storageKey+':archive';
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64=data=>btoa(String.fromCharCode(...new Uint8Array(data)));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stored(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
let state=stored(storageKey);if(!state){state={id:Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join(''),contact:false,ending:'',truth:false};localStorage.setItem(storageKey,JSON.stringify(state));}
function save(){localStorage.setItem(storageKey,JSON.stringify(state));}
let site,bundle,roomBundle,rendering=false;
const sitePromise=fetch(base+'/assets/site-index.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Site index');return r.json();}).then(value=>(site=value));
function route(){
 let logical=location.pathname.slice(base.length)||'/';if(logical.endsWith('/index.html'))logical=logical.slice(0,-10);
 for(const [kind,prefix]of Object.entries({archive:'/historical-records',hozen:'/records-center',audit:'/independent-review'}))if(logical===prefix||logical.startsWith(prefix+'/'))return {kind,path:logical.slice(prefix.length)||'/'};
 return {kind:'main',path:logical};
}
const urlFor=(path,kind='main')=>base+({archive:'/historical-records',hozen:'/records-center',audit:'/independent-review'}[kind]||'')+path;
function go(path,kind='main'){location.assign(urlFor(path,kind));}
function fillTokens(html){return html.replaceAll('@@CASE@@',state.id).replaceAll('@@CSRF@@','preview-session');}
function display(html){
 const doc=new DOMParser().parseFromString(fillTokens(html),'text/html');document.title=doc.title;document.body.className=doc.body.className;document.body.innerHTML=doc.body.innerHTML;
 for(const key of ['asunaroStage','seedDriftEnabled','seedDriftThreshold','memberRole','memberLabel','memberCase','memberRecord','memberRecordTitle'])document.body.dataset[key]=doc.body.dataset[key]||'';
 document.body.dataset.memberInquiry=state.inquiryRecord||'';
 window.asunaroInit?.();
 window.asunaroDrift?.refresh();
 window.asunaroReading?.refresh();
 if(document.querySelector('[data-lab-root], [data-lab-thanks], [data-lab-assessment]'))void import('./lab-console.js').then(module=>module.initConsole({bridge:window.asunaroLabBridge,trial:trialView(state.consoleTrial),ending:state.ending})).catch(()=>showError('測定端末を読み込めませんでした。再読み込みしてご確認ください。'));
}
async function packedBundle(namespace,id){
 const identifier=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(namespace+':'+id))),b=>b.toString(16).padStart(2,'0')).join('');
 const cacheKey=storageKey+':encrypted-bundle:'+namespace;
 try{const saved=JSON.parse(sessionStorage.getItem(cacheKey));if(saved?.identifier===identifier&&saved.edition===site.edition&&Date.now()-saved.created<28800000)return saved.packed;}catch{}
 const response=await fetch(base+'/assets/portal/'+identifier+'.json',{cache:'no-store'});if(!response.ok)throw new Error('Unknown account');const packed=await response.json();
 try{sessionStorage.setItem(cacheKey,JSON.stringify({identifier,edition:site.edition,created:Date.now(),packed}));}catch{}
 return packed;
}
async function loadBundle(namespace,id,key){
 const packed=await packedBundle(namespace,id);
 const cryptoKey=await crypto.subtle.importKey('raw',bytes(key),{name:'AES-GCM'},false,['decrypt']);
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(packed.iv)},cryptoKey,bytes(packed.data))));
}
async function authenticate(namespace,id,password){
 const packed=await packedBundle(namespace,id);
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(id+'\0'+password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:bytes(packed.salt),iterations:packed.iterations},material,{name:'AES-GCM',length:256},true,['decrypt']);
 const value=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(packed.iv)},key,bytes(packed.data))));
 return {value,credential:{id,key:b64(await crypto.subtle.exportKey('raw',key)),created:Date.now()}};
}
async function currentBundle(){
 if(bundle)return bundle;const saved=stored(authKey);if(!saved||Date.now()-saved.created>28800000)return null;
 try{bundle=await loadBundle('member',saved.id,saved.key);return bundle;}catch{return null;}
}
async function outcomeBundle(){
 const current=await currentBundle();if(current?.outcomes?.end1)return current;
 const saved=state.capability;if(!saved)return null;try{return await loadBundle('member',saved.id,saved.key);}catch{return null;}
}
function stage(){return state.ending|| (state.contact?'contact':'initial');}
function showError(message){
 let element=document.querySelector('.form-error');if(!element){element=document.createElement('p');element.className='form-error';element.setAttribute('role','alert');(document.querySelector('form')||document.querySelector('main')).prepend(element);}element.textContent=message;
}
async function documentResults(account,id){
 const form = document.querySelector('.record-form');
 if (!form) return;
 form.querySelector('input[name=document_id]').value = id;
 if (!id) return;
 const found = account.docs.find(document => document.id === id);
 const path = /^[A-Z0-9-]{1,60}$/.test(id) ? urlFor('/members/records/'+id+'/') : '';
 if (found) {
  form.insertAdjacentHTML('afterend',`<p class="result-count">検索結果　1件</p><a class="document-result" href="${path}"><small>${esc(found.id)}　${esc(found.date)}</small><h2>${esc(found.title)}</h2><small>${esc(found.owner)}</small></a>`);
  return;
 }
 // A Pages shell marks a registered ID without carrying any record metadata.
 let message = documentLookupMessages.missing;
 if (path) {
  try {
   const response = await fetch(path);
   if (!response.ok && response.status !== 404) throw new Error('Record lookup unavailable');
   if (response.ok && (await response.text()).includes('data-record-shell="registered"')) {
    message = documentLookupMessages.restricted;
   }
  } catch {
   message = '資料を照会できませんでした。時間をおいて再度お試しください。';
  }
 }
 const result = document.createElement('p');
 result.className = 'empty-state';
 result.setAttribute('role','status');
 result.textContent = message;
 form.after(result);
}
window.asunaroLabBridge=async(action,input={})=>{
 if(!roomBundle)throw new Error('資料照会室の閲覧票をご確認ください。');
 state=stored(storageKey,state);
 if(action!=='context'){state.consoleTrial=advanceTrial(state.consoleTrial,action,input);save();}
 const trial=trialView(state.consoleTrial);return {trial,csrf:'preview-session',ending:state.ending||'',subjects:trial?.complete?roomBundle.labSubjects[state.ending==='end3'?'end3':state.contact||state.truth||state.ending?'current':'initial']:null};
};
async function boot(){
 if(rendering)return;rendering=true;
 try{
  await sitePromise;state=stored(storageKey,state);const current=route(),params=new URLSearchParams(location.search);
  if(current.kind==='main'&&current.path.startsWith('/members/')){
   if(current.path==='/members/login/'){display(site.login);const next=params.get('next');if(next)document.querySelector('input[name=next]').value=next;return;}
   const account=await currentBundle();if(!account){display(site.login);document.querySelector('input[name=next]').value=current.path+location.search;return;}
   if(state.ending==='end2'&&account.account.role==='asakura'){display(account.ended);return;}
   const documentMatch=current.path.match(/^\/members\/records\/([A-Z0-9-]+)\/$/);
   if(documentMatch){display(account.docs.find(d=>d.id===documentMatch[1])?.html||site.notFound);return;}
   const html=account.stages[stage()]?.[current.path]||account.pages[current.path];display(html||site.notFound);
   if(current.path==='/members/records/')await documentResults(account,normalizeDocumentId(params.get('document_id')||''));
   if(current.path==='/members/inquiry/'){const id=normalizeDocumentId(params.get('record')||'');document.querySelector('#record').value=account.docs.some(d=>d.id===id&&d.inquiry)?id:'';}
   if(current.path==='/members/reservations/'){
    const form=document.querySelector('[data-reservation-form]');
    if(form){
     const select=form.elements.space,requested=params.get('space');
     if([...select.options].some(option=>option.value===requested))select.value=requested;
     updateReservationHours(form);
     if(params.get('received'))document.querySelector('h1').insertAdjacentHTML('afterend','<div class="form-success">利用申請を受け付けました。内容を確認のうえ、施設からの連絡にて回答いたします。</div>');
    }
   }
   return;
  }
  if(current.kind==='archive'&&current.path.startsWith('/room/')){
   const saved=stored(archiveKey);if(saved){try{roomBundle=await loadBundle('archive',saved.id,saved.key);}catch{roomBundle=null;}}
   display(roomBundle?.pages[current.path]||site.archiveLogin);return;
  }
  if(current.kind==='audit'||current.kind==='hozen'){
   if(current.path==='/received/'){
    if(state.ending==='end3'&&current.kind==='hozen'){go('/received/?case='+state.id,'audit');return;}
    const capable=await outcomeBundle();const html=state.auditPending&&current.kind==='audit'&&state.ending!=='end3'?capable?.pending:capable?.outcomes[state.ending]?.[current.kind+':/received/'];
    display(html||site.agency[current.kind]);
   }else display(site.agency[current.kind]);
   const sender=document.querySelector('#sender');if(current.kind==='audit'&&sender&&trialView(state.consoleTrial)?.complete)sender.value=state.consoleTrial.handle;
   return;
  }
  if(state.ending){const capable=await outcomeBundle();const html=capable?.outcomes[state.ending]?.['main:'+current.path];if(html)display(html);}
  if(current.kind==='main'&&current.path==='/search/'){
   const keyword=params.get('q')||'';const input=document.querySelector('main input[name=q]');if(input)input.value=keyword;
   const results=site.entries.filter(x=>matchesSearch(x,keyword)&&(state.ending!=='end2'||x.url!=='/people/asakura-tsumugi/'));
   const summary=document.querySelector('.search-results');if(summary){summary.innerHTML=keyword?results.map(x=>`<a href="${urlFor(x.url)}"><h2>${esc(x.title)}</h2><p>${esc(x.text.slice(0,100))}…</p></a>`).join('')||'<p>該当するページはありません。</p>':'';summary.previousElementSibling.textContent=keyword?'「'+keyword+'」の検索結果　'+results.length+'件':'';}
  }
  if(current.kind==='main'&&current.path==='/gallery/'&&params.get('method')){
   const select = document.querySelector('select[name=method]');
   const method = params.get('method');
   if (select && [...select.options].some(option=>option.value===method)) {
    select.value = method;
    document.querySelectorAll('[data-gallery-method]').forEach(card => {
     card.hidden = card.dataset.galleryMethod !== method;
    });
   }
  }
  if(current.kind==='archive'&&current.path==='/collections/'&&params.get('q')){
   const keyword=params.get('q');document.querySelector('#collection-query').value=keyword;
   document.querySelectorAll('.legacy-row').forEach(row=>{row.hidden=!matchesSearch({title:row.querySelector('strong').textContent,text:row.textContent},keyword);});
  }
 }catch{showError('ページを取得できませんでした。通信状況をご確認のうえ、再読み込みしてください。');}
 finally{rendering=false;}
}

document.addEventListener('submit',async event=>{
 const form=event.target;if(!(form instanceof HTMLFormElement)||(form.getAttribute('method')||'get').toLowerCase()!=='post')return;
 event.preventDefault();if(!form.reportValidity())return;
 const current=route(),values=new FormData(form),submit=form.querySelector('button[type=submit],button:not([type])');if(submit)submit.disabled=true;
 try{
  await sitePromise;
  const action=new URL(form.action,location.href).pathname.slice(base.length);
  if(current.kind==='main'&&action==='/members/login/'){
   try{
    const result=await authenticate('member',String(values.get('id')||'').trim(),String(values.get('password')||''));
    state=stored(storageKey,state);
    if(state.ending==='end2'&&result.value.account.role==='asakura')throw new Error('Ended account');
    localStorage.setItem(authKey,JSON.stringify(result.credential));
    if(result.value.outcomes.end1)state.capability=result.credential;if(result.value.account.role==='asakura')state.truth=true;save();
    let next=String(values.get('next')||'/members/');if(next.startsWith(base+'/'))next=next.slice(base.length);go(/^\/members\/(?!\/)/.test(next)?next:'/members/');
   }catch{display(site.loginError);}
   return;
  }
  if(current.kind==='archive'&&action.endsWith('/room/login/')){
   try{const result=await authenticate('archive',String(values.get('ticket')||'').trim(),String(values.get('code')||''));localStorage.setItem(archiveKey,JSON.stringify(result.credential));go('/room/','archive');}catch{display(site.archiveError);}return;
  }
  if(current.kind==='archive'&&action.endsWith('/room/logout/')){localStorage.removeItem(archiveKey);go('/room/','archive');return;}
  if(current.kind==='hozen'||current.kind==='audit'){
   const file=values.get('archive'),kind=file instanceof File&&/\.zip$/i.test(file.name)?classifyEvidence(await file.arrayBuffer()):null;
   if(!kind){showError('提出内容とZIP形式の添付資料をご確認ください。');return;}
   if(!await outcomeBundle()){showError('受付情報を確認できませんでした。資料を受領した際の照会画面からお手続きください。');return;}
   state=stored(storageKey,state);
   if(state.ending==='end2'){showError('この照会に関する記録は、施設運営側の管理へ移管されています。');return;}
   if(current.kind==='audit'&&kind!=='complete')state.auditPending=true;else state.ending=nextEnding(state.ending,current.kind==='audit'?'end3':'end1');save();go('/received/?case='+state.id,state.ending==='end3'?'audit':current.kind);return;
  }
  const account=await currentBundle();if(!account){go('/members/login/');return;}
  state=stored(storageKey,state);
  if(action==='/members/logout/'){localStorage.removeItem(authKey);go('/members/login/');return;}
  if(current.path==='/members/inquiry/'){
   const id=normalizeDocumentId(values.get('record')||'');if(!account.docs.some(d=>d.id===id&&d.inquiry)){showError('文書IDと照会先をご確認ください。');return;}
   state.contact=true;state.inquiryRecord=id;save();go('/members/messages/');return;
  }
  if(current.path==='/members/reservations/'){
   if(['end1','end3'].includes(state.ending)){await boot();return;}
   if(!isValidReservation(Object.fromEntries(values))){
    const error=form.querySelector('[data-reservation-error]');
    if(error){
     error.hidden=false;
     error.textContent='施設・利用日時・利用内容をご確認ください。';
    }else showError('施設・利用日時・利用内容をご確認ください。');
    return;
   }
   go('/members/reservations/?received=1');return;
  }
  if(current.path==='/members/contact/'){
   const file=values.get('attachment'),valid=file instanceof File&&/\.zip$/i.test(file.name)&&classifyEvidence(await file.arrayBuffer());state=stored(storageKey,state);if(valid)state.ending=nextEnding(state.ending,'end2');save();go('/members/contact/received/');return;
  }
 }catch{showError('お手続きを完了できませんでした。ページを再読み込みしてご確認ください。');}
 finally{if(submit)submit.disabled=false;}
});

document.addEventListener('click',async event=>{
 const anchor=event.target.closest?.('a[href]');if(!anchor)return;
 const url=new URL(anchor.href,location.href),path=url.pathname.slice(base.length);if(!path.startsWith('/members/download/'))return;
 event.preventDefault();const account=await currentBundle();state=stored(storageKey,state);if(!account||state.ending==='end2'&&account.account.role==='asakura')return;
 const file=account.downloads[path.split('/').filter(Boolean).at(-1)];if(!file||path.endsWith('hozen.zip')&&!state.contact)return;
 const message=anchor.closest('.record-media')?.querySelector('[data-record-media-message]');
 if(anchor.getAttribute('aria-busy')==='true')return;
 anchor.setAttribute('aria-busy','true');
 if(message)message.textContent='資料を取得しています。';
 try{
  let data;
  if(file.path){
   const response=await fetch(file.path);if(!response.ok)throw new Error('Attachment unavailable');const packed=await response.json();
   const key=await crypto.subtle.importKey('raw',bytes(file.key),{name:'AES-GCM'},false,['decrypt']);
   data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(packed.iv)},key,bytes(packed.data));
   if(stored(authKey)?.id!==account.account.id||stored(storageKey,state).ending==='end2'&&account.account.role==='asakura')throw new Error('Access changed');
  }else data=bytes(file.data);
  const href=URL.createObjectURL(new Blob([data],{type:file.type})),download=document.createElement('a');download.href=href;download.download=file.name;download.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  if(message)message.textContent='';
 }catch{if(message)message.textContent='資料を取得できませんでした。ページを開き直してご確認ください。';}
 finally{anchor.removeAttribute('aria-busy');}
});
window.addEventListener('storage',event=>{if(event.key===storageKey){state=stored(storageKey,state);if(!document.querySelector('[data-lab-root]')&&document.querySelector('[data-lab-thanks], [data-lab-assessment]'))void import('./lab-console.js').then(module=>module.initConsole({trial:trialView(state.consoleTrial),ending:state.ending}));}});
window.addEventListener('pageshow',event=>{if(event.persisted&&!rendering&&site)void boot();});
await boot();
