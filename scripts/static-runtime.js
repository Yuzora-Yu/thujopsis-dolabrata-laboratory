import {matchesSearch,searchExcerpt,normalizeDocumentId,documentLookupMessages} from './search-engine.js';
import {isValidReservation,updateReservationHours} from './assets/reservation-policy.js';
import {agencyReceipt,classifyEvidence,generalUsePaused,hasOfficeReceipt,inquiryClosed,nextEnding,publicOperationLabel} from './evidence.js';
import {advanceTrial,trialView} from './lab-core.js';

const base=document.querySelector('meta[name="asunaro-base"]')?.content||'';
const storageKey='asunaro-preview-v1:'+base,authKey=storageKey+':auth',archiveKey=storageKey+':archive';
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64=data=>btoa(String.fromCharCode(...new Uint8Array(data)));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function stored(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
let state=stored(storageKey);if(!state){state={id:Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join(''),contact:false,ending:'',truth:false};localStorage.setItem(storageKey,JSON.stringify(state));}
function save(){localStorage.setItem(storageKey,JSON.stringify(state));}
let site,bundle,roomBundle,rendering=false,refreshOutcomeAfterBoot=false;
async function loadSiteIndex(){
 const response = await fetch(base+'/assets/site-index.json',{cache:'no-store'});
 if (!response.ok) throw new Error('Site index');
 return response.json();
}
const sitePromise=loadSiteIndex().then(value=>(site=value));
function route(){
 let logical=location.pathname.slice(base.length)||'/';if(logical.endsWith('/index.html'))logical=logical.slice(0,-10);
 for(const [kind,prefix]of Object.entries({archive:'/historical-records',hozen:'/records-center',audit:'/independent-review'}))if(logical===prefix||logical.startsWith(prefix+'/'))return {kind,path:logical.slice(prefix.length)||'/'};
 return {kind:'main',path:logical};
}
const urlFor=(path,kind='main')=>base+({archive:'/historical-records',hozen:'/records-center',audit:'/independent-review'}[kind]||'')+path;
function go(path,kind='main'){location.assign(urlFor(path,kind));}
function fillTokens(html){return html.replaceAll('@@CASE@@',state.id).replaceAll('@@CSRF@@','preview-session');}
function reflectPublicOperation(){
 const status=document.querySelector('.site-header .utility>span');
 if(!status)return;
 if(generalUsePaused(state.ending))status.dataset.siteOperation='paused';
 else delete status.dataset.siteOperation;
 status.textContent=publicOperationLabel(state.ending);
}
function display(html){
 const doc=new DOMParser().parseFromString(fillTokens(html),'text/html');document.title=doc.title;document.body.className=doc.body.className;document.body.innerHTML=doc.body.innerHTML;
 for(const key of ['asunaroStage','seedDriftEnabled','seedDriftThreshold','publicOutcome','memberRole','memberLabel','memberCase','memberRecord','memberRecordTitle'])document.body.dataset[key]=doc.body.dataset[key]||'';
 document.body.dataset.memberInquiry=state.inquiryRecord||'';
 reflectPublicOperation();
 window.asunaroInit?.();
 window.asunaroDrift?.refresh();
 window.asunaroReading?.refresh();
 if(document.querySelector('[data-lab-root], [data-lab-thanks], [data-lab-assessment]'))void import('./lab-console.js').then(module=>module.initConsole({bridge:window.asunaroLabBridge,trial:trialView(state.consoleTrial),ending:state.ending})).catch(()=>showError('測定端末を読み込めませんでした。再読み込みしてご確認ください。'));
}
async function packedBundle(namespace,id,edition=site.edition){
 const identifier=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(namespace+':'+id))),b=>b.toString(16).padStart(2,'0')).join('');
 const cacheKey=storageKey+':encrypted-bundle:'+namespace;
 try{const saved=JSON.parse(sessionStorage.getItem(cacheKey));if(saved?.identifier===identifier&&saved.edition===edition&&Date.now()-saved.created<28800000)return saved.packed;}catch{}
 const response=await fetch(base+'/assets/portal/'+identifier+'.json',{cache:'no-store'});if(!response.ok)throw new Error('Unknown account');const packed=await response.json();
 try{sessionStorage.setItem(cacheKey,JSON.stringify({identifier,edition,created:Date.now(),packed}));}catch{}
 return packed;
}
async function loadBundle(namespace,id,key,edition=site.edition){
 const packed=await packedBundle(namespace,id,edition);
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
function activeMemberCredential(){
 const credential = stored(authKey);
 return credential?.id && credential.key && Date.now()-credential.created<=28800000 ? credential : null;
}
function sameCredential(left,right){
 return !!left && !!right && left.id===right.id && left.key===right.key && left.created===right.created;
}
async function currentBundle(){
 const credential = activeMemberCredential();
 if (!credential) return null;
 const {edition} = site;
 if (bundle?.edition===edition && sameCredential(credential,bundle.credential)) return bundle.account;
 try {
  const account = await loadBundle('member',credential.id,credential.key,edition);
  if (!sameCredential(credential,activeMemberCredential())) return null;
  if (site.edition===edition) bundle = {edition,credential,account};
  return account;
 } catch { return null; }
}
async function outcomeBundle(ending='end1'){
 const current=await currentBundle();if(current?.outcomes?.[ending])return current;
 const saved=ending==='end3'?(state.auditCapability||state.capability):state.capability;
 if(!saved)return null;
 try{const account=await loadBundle('member',saved.id,saved.key);return account.outcomes?.[ending]?account:null;}catch{return null;}
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
function filterArchiveCatalogue(params){
 const field=document.querySelector('#collection-query');
 const summary=document.querySelector('[data-collection-count]');
 const empty=document.querySelector('[data-collection-empty]');
 if(!field||!summary||!empty)return;
 const keyword=(params.get('q')||'').trim();
 if(keyword&&field.value===field.defaultValue)field.value=keyword;
 let count=0;
 for(const row of document.querySelectorAll('[data-collection-key]')){
  row.hidden=!!keyword&&!matchesSearch({title:row.querySelector('strong').textContent,text:row.dataset.collectionKey},keyword);
  if(!row.hidden)count++;
 }
 summary.textContent='収蔵資料・公開対象'+(keyword?' ／ '+count+'件':'');
 empty.hidden=count>0;
}
async function boot({restoreFragment=false}={}){
 if(rendering)return;rendering=true;
 try{
  const current=route(),params=new URLSearchParams(location.search);
  const publicSearch=current.kind==='main'&&current.path==='/search/';
  const keyword=publicSearch?(params.get('q')||'').trim():'';
  if(publicSearch){
   const field=document.querySelector('main input[name=q]');
   if(field&&field.value===field.defaultValue)field.value=keyword;
  }
  if(current.kind==='archive'&&current.path==='/collections/')filterArchiveCatalogue(params);
  reflectPublicOperation();
  await sitePromise;state=stored(storageKey,state);
  reflectPublicOperation();
  if(current.kind==='main'&&current.path.startsWith('/members/')){
   if(current.path==='/members/login/'){display(site.login);const next=params.get('next');if(next)document.querySelector('input[name=next]').value=next;return;}
   const account=await currentBundle();if(!account){display(site.login);document.querySelector('input[name=next]').value=current.path+location.search;return;}
   if(state.ending==='end2'&&account.account.role==='asakura'){display(account.ended);return;}
   if(current.path==='/members/contact/received/'&&!hasOfficeReceipt(state)){go('/members/contact/');return;}
   const documentMatch=current.path.match(/^\/members\/records\/([A-Z0-9-]+)\/$/);
   if(documentMatch){display(account.docs.find(d=>d.id===documentMatch[1])?.html||site.notFound);return;}
   const html=account.stages[stage()]?.[current.path]||account.pages[current.path];display(html||site.notFound);
   if(current.path==='/members/messages/'&&!state.contact)document.querySelector('[data-inquiry-reply]')?.remove();
   if(current.path==='/members/records/')await documentResults(account,normalizeDocumentId(params.get('document_id')||''));
   if(current.path==='/members/inquiry/'&&!inquiryClosed(state.ending)){const id=normalizeDocumentId(params.get('record')||'');document.querySelector('#record').value=account.docs.some(d=>d.id===id&&d.inquiry)?id:'';}
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
   const activeCase=params.get('case')===state.id,receipt=activeCase?agencyReceipt(current.kind,state):'';
   if(activeCase&&current.path==='/received/'&&current.kind==='hozen'&&state.ending==='end3'){go('/received/?case='+state.id,'audit');return;}
   if(current.path==='/receive/'&&receipt==='transferred'){go('/received/?case='+state.id,'audit');return;}
   let html;
   if(current.path==='/received/'&&receipt==='received'){
    const capable=await outcomeBundle(state.ending);
    html=capable?.outcomes[state.ending]?.[current.kind+':/received/'];
    if(!html){
     document.querySelector('.agency-main [role=status]')?.remove();
     showError('受領控えを表示できませんでした。提出時の会員名義でログインしてから、もう一度ご確認ください。');return;
    }
   }else if(current.path==='/received/'&&receipt){
    html=(await outcomeBundle())?.auditForms?.[receipt];
   }else if(current.path==='/receive/'&&receipt==='pending'){
    html=(await outcomeBundle())?.auditForms?.additional;
   }
   display(html||site.agency[current.kind]);
   const caseField=document.querySelector('input[name=case]');if(caseField&&!activeCase)caseField.value='';
   const sender=document.querySelector('#sender');if(current.kind==='audit'&&sender&&trialView(state.consoleTrial)?.complete)sender.value=state.consoleTrial.handle;
   return;
  }
  if(state.ending){
   let ending=state.ending,capable=await outcomeBundle(ending);
   if(!capable&&ending==='end3'){ending='end1';capable=await outcomeBundle();}
   const html=capable?.outcomes[ending]?.['main:'+current.path]||(generalUsePaused(ending)?capable?.pausedPublic?.[current.path]:null);
   if(html){
    display(html);
    if(restoreFragment&&location.hash){
     const hash=location.hash;
     let id=hash.slice(1);
     try{id=decodeURIComponent(id);}catch{}
     const restore=()=>requestAnimationFrame(()=>{
      if(location.hash===hash)document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'});
     });
     // The original page may still have a fragment scroll queued while the closure view loads.
     if(document.readyState==='complete')restore();
     else window.addEventListener('load',restore,{once:true});
    }
   }
  }
  if(publicSearch){
   const results=site.entries.filter(x=>matchesSearch(x,keyword)&&(state.ending!=='end2'||x.url!=='/people/asakura-tsumugi/'));
   const summary=document.querySelector('.search-results');
   if(summary){
    summary.innerHTML=keyword?results.map(x=>`<a href="${urlFor(x.url)}">${x.published?`<time class="search-result-date" datetime="${esc(x.published)}">${esc(x.published.replaceAll('-','.'))}</time>`:''}<h2>${esc(x.title)}</h2><p>${esc(searchExcerpt(x))}</p></a>`).join('')||'<p>該当するページはありません。</p>':'';
    summary.previousElementSibling.textContent=keyword?'「'+keyword+'」の検索結果　'+results.length+'件':'';
   }
  }
 }catch{showError('ページを取得できませんでした。通信状況をご確認のうえ、再読み込みしてください。');}
 finally{
  rendering=false;
  if(refreshOutcomeAfterBoot){
   refreshOutcomeAfterBoot=false;
   refreshOutcomeViews();
  }
 }
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
    if(result.value.outcomes.end3){state.auditCapability=result.credential;state.truth=true;}
    else if(state.ending==='end3'&&!state.auditCapability)state.auditCapability=state.capability;
    if(result.value.outcomes.end1)state.capability=result.credential;
    save();
    let next=String(values.get('next')||'/members/');if(next.startsWith(base+'/'))next=next.slice(base.length);go(/^\/members\/(?!\/)/.test(next)?next:'/members/');
   }catch{display(site.loginError);}
   return;
  }
  if(current.kind==='archive'&&action.endsWith('/room/login/')){
   try{const result=await authenticate('archive',String(values.get('ticket')||'').trim(),String(values.get('code')||''));localStorage.setItem(archiveKey,JSON.stringify(result.credential));go('/room/','archive');}catch{display(site.archiveError);}return;
  }
  if(current.kind==='archive'&&action.endsWith('/room/logout/')){localStorage.removeItem(archiveKey);go('/room/','archive');return;}
  if(current.kind==='hozen'||current.kind==='audit'){
   state=stored(storageKey,state);
   if(values.get('case')!==state.id||new URLSearchParams(location.search).get('case')!==state.id||!await outcomeBundle()){showError('受付情報を確認できませんでした。資料を受領した際の照会画面からお手続きください。');return;}
   const file=values.get('archive'),kind=file instanceof File&&/\.zip$/i.test(file.name)?classifyEvidence(await file.arrayBuffer()):null;
   if(!String(values.get('title')||'').trim()||!String(values.get('statement')||'').trim()){showError('受付情報と提出内容をご確認ください。');return;}
   if(!kind){showError('添付資料を確認できませんでした。受領したZIPファイルをそのまま添付してください。');return;}
   state=stored(storageKey,state);
   if(state.ending==='end2'){showError('この照会に関する記録は、施設運営側の管理へ移管されています。');return;}
   if(current.kind==='audit'&&kind!=='complete')state.auditPending=true;else state.ending=nextEnding(state.ending,current.kind==='audit'?'end3':'end1');save();go('/received/?case='+state.id,state.ending==='end3'?'audit':current.kind);return;
  }
  const account=await currentBundle();if(!account){go('/members/login/');return;}
  state=stored(storageKey,state);
  if(action==='/members/logout/'){localStorage.removeItem(authKey);go('/members/login/');return;}
  if(current.path==='/members/inquiry/'){
   if(inquiryClosed(state.ending)){await boot();return;}
   const id=normalizeDocumentId(values.get('record')||'');if(!account.docs.some(d=>d.id===id&&d.inquiry)){showError('文書IDと照会先をご確認ください。');return;}
   state.contact=true;state.inquiryRecord=id;save();go('/members/messages/');return;
  }
  if(current.path==='/members/reservations/'){
   if(generalUsePaused(state.ending)){await boot();return;}
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
   if(!String(values.get('subject')||'').trim()||!String(values.get('message')||'').trim()){showError('件名と内容をご記入ください。');return;}
   const file=values.get('attachment'),valid=file instanceof File&&/\.zip$/i.test(file.name)&&classifyEvidence(await file.arrayBuffer());
   state=stored(storageKey,state);
   if(valid)state.ending=nextEnding(state.ending,'end2');
   state.officeReceipt=true;save();go('/members/contact/received/');return;
  }
 }catch{showError('お手続きを完了できませんでした。ページを再読み込みしてご確認ください。');}
 finally{if(submit)submit.disabled=false;}
});

function downloadAllowed(account,credential,filename){
 const caseState = stored(storageKey,state);
 return !!account && sameCredential(credential,activeMemberCredential())
  && account.account.id===credential.id
  && document.body.dataset.memberRole===account.account.role
  && !(caseState.ending==='end2' && account.account.role==='asakura')
  && (filename!=='hozen.zip' || caseState.contact);
}

async function readRecordMedia(file){
 const response = await fetch(file.path);
 if (response.status===404 || response.status===410) return null;
 if (!response.ok) throw new Error('Attachment unavailable');
 const packed = await response.json();
 const key = await crypto.subtle.importKey('raw',bytes(file.key),{name:'AES-GCM'},false,['decrypt']);
 return crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(packed.iv)},key,bytes(packed.data));
}

async function refreshRecordMedia(filename,credential,previousEdition){
 // A new deployment replaces the ciphertext URLs, but the member key stays valid.
 const nextSite = await loadSiteIndex();
 if (nextSite.edition===previousEdition) return null;
 const account = await loadBundle('member',credential.id,credential.key,nextSite.edition);
 const file = account.downloads[filename];
 if (!file?.path || !downloadAllowed(account,credential,filename)) return null;
 const data = await readRecordMedia(file);
 if (!data || !downloadAllowed(account,credential,filename)) return null;
 if (site.edition===previousEdition || site.edition===nextSite.edition) {
  site = nextSite;
  bundle = {edition:site.edition,credential,account};
 }
 return {data,file};
}

document.addEventListener('click',async event=>{
 const anchor = event.target.closest?.('a[href]');
 if (!anchor) return;
 const url = new URL(anchor.href,location.href);
 const path = url.pathname.slice(base.length);
 if (url.origin!==location.origin || !path.startsWith('/members/download/')) return;
 event.preventDefault();
 if (anchor.getAttribute('aria-busy')==='true') return;
 anchor.setAttribute('aria-busy','true');
 const message = anchor.closest('.record-media')?.querySelector('[data-record-media-message]');
 const filename = path.split('/').filter(Boolean).at(-1);
 const credential = activeMemberCredential();
 const previousEdition = site.edition;
 try {
  const account = await currentBundle();
  let file = account?.downloads[filename];
  if (!file || !downloadAllowed(account,credential,filename)) {
   if (message) message.textContent='閲覧権限を確認できませんでした。ページを開き直してご確認ください。';
   return;
  }
  if (message) message.textContent='資料を取得しています。';
  let data = file.path ? await readRecordMedia(file) : bytes(file.data);
  if (!data && downloadAllowed(account,credential,filename)) {
   const refreshed = await refreshRecordMedia(filename,credential,previousEdition);
   if (refreshed) ({data,file}=refreshed);
  }
  if (!downloadAllowed(account,credential,filename)) {
   if (message) message.textContent='閲覧権限を確認できませんでした。ページを開き直してご確認ください。';
   return;
  }
  if (!data) throw new Error('Attachment unavailable');
  const href = URL.createObjectURL(new Blob([data],{type:file.type}));
  const download = document.createElement('a');
  download.href = href;
  download.download = file.name;
  download.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
  if (message) message.textContent='';
 } catch {
  if (message) message.textContent='資料を取得できませんでした。ページを開き直してご確認ください。';
 } finally {
  anchor.removeAttribute('aria-busy');
 }
});
function refreshOutcomeViews(){
 const {kind,path}=route();
 const memberUpdates=kind==='main'&&['/members/','/members/messages/'].includes(path);
 if(document.body.dataset.publicOutcome!=='true'&&!memberUpdates)return;
 const dialog=document.querySelector('dialog[open]');
 if(dialog){
  dialog.addEventListener('close',refreshOutcomeViews,{once:true});
  return;
 }
 if(rendering)refreshOutcomeAfterBoot=true;
 else void boot();
}
window.addEventListener('storage',event=>{
 if(event.key!==storageKey)return;
 const previousEnding=state.ending;
 state=stored(storageKey,state);
 if(previousEnding!==state.ending){
  reflectPublicOperation();
  refreshOutcomeViews();
 }
 if(!document.querySelector('[data-lab-root]')&&document.querySelector('[data-lab-thanks], [data-lab-assessment]'))void import('./lab-console.js').then(module=>module.initConsole({trial:trialView(state.consoleTrial),ending:state.ending}));
});
window.addEventListener('pageshow',event=>{if(event.persisted&&!rendering&&site)void boot();});
await boot({restoreFragment:true});
