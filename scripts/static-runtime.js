import {matchesSearch,normalizeDocumentId} from './search-engine.js';
import {classifyEvidence} from './evidence.js';

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
 window.asunaroInit?.();
}
async function loadBundle(namespace,id,key){
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(namespace+':'+id))),b=>b.toString(16).padStart(2,'0')).join('');
 const response=await fetch(base+'/assets/portal/'+hash+'.json',{cache:'no-store'});if(!response.ok)throw new Error('Unknown account');
 const packed=await response.json();
 const cryptoKey=await crypto.subtle.importKey('raw',bytes(key),{name:'AES-GCM'},false,['decrypt']);
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(packed.iv)},cryptoKey,bytes(packed.data))));
}
async function authenticate(namespace,id,password){
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(namespace+':'+id))),b=>b.toString(16).padStart(2,'0')).join('');
 const response=await fetch(base+'/assets/portal/'+hash+'.json',{cache:'no-store'});if(!response.ok)throw new Error('Unknown account');const packed=await response.json();
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
function documentResults(account,id){
 const form=document.querySelector('.record-form');if(!form)return;form.querySelector('input[name=document_id]').value=id;
 if(!id)return;const found=account.docs.find(d=>d.id===id);
 form.insertAdjacentHTML('afterend',found?`<p class="result-count">検索結果　1件</p><a class="document-result" href="${urlFor('/members/records/'+found.id+'/')}"><small>${esc(found.id)}　${esc(found.date)}</small><h2>${esc(found.title)}</h2><small>${esc(found.owner)}</small></a>`:'<p class="empty-state">該当する資料はありません。</p>');
}
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
   if(current.path==='/members/records/')documentResults(account,normalizeDocumentId(params.get('document_id')||''));
   if(current.path==='/members/inquiry/'){const id=normalizeDocumentId(params.get('record')||'');document.querySelector('#record').value=account.docs.some(d=>d.id===id&&d.inquiry)?id:'';}
   if(current.path==='/members/reservations/'){
    const select=document.querySelector('#space');if(select&&params.get('space'))select.value=params.get('space');
    if(params.get('received'))document.querySelector('h1').insertAdjacentHTML('afterend','<div class="form-success">利用申請を受け付けました。内容を確認のうえ、施設からの連絡にて回答いたします。</div>');
   }
   return;
  }
  if(current.kind==='archive'&&current.path.startsWith('/room/')){
   const saved=stored(archiveKey);if(saved){try{roomBundle=await loadBundle('archive',saved.id,saved.key);}catch{roomBundle=null;}}
   display(roomBundle?.pages[current.path]||site.archiveLogin);return;
  }
  if(current.kind==='audit'||current.kind==='hozen'){
   if(current.path==='/received/'){
    const capable=await outcomeBundle();const html=state.auditPending&&current.kind==='audit'&&state.ending!=='end3'?capable?.pending:capable?.outcomes[state.ending]?.[current.kind+':/received/'];
    display(html||site.agency[current.kind]);
   }else display(site.agency[current.kind]);
   return;
  }
  if(state.ending){const capable=await outcomeBundle();const html=capable?.outcomes[state.ending]?.['main:'+current.path];if(html)display(html);}
  if(current.kind==='main'&&current.path==='/search/'){
   const keyword=params.get('q')||'';const input=document.querySelector('main input[name=q]');if(input)input.value=keyword;
   const results=site.entries.filter(x=>matchesSearch(x,keyword)&&(state.ending!=='end2'||x.url!=='/people/asakura-tsumugi/'));
   const summary=document.querySelector('.search-results');if(summary){summary.innerHTML=keyword?results.map(x=>`<a href="${urlFor(x.url)}"><h2>${esc(x.title)}</h2><p>${esc(x.text.slice(0,100))}…</p></a>`).join('')||'<p>該当するページはありません。</p>':'';summary.previousElementSibling.textContent=keyword?'「'+keyword+'」の検索結果　'+results.length+'件':'';}
  }
  if(current.kind==='main'&&current.path==='/gallery/'&&params.get('method')){
   const method=params.get('method');document.querySelector('select[name=method]').value=method;
   document.querySelectorAll('.gallery-card').forEach(card=>{card.hidden=card.querySelector('.card-meta>span')?.textContent!==method;});
  }
  if(current.kind==='archive'&&current.path==='/collections/'&&params.get('q')){
   const keyword=params.get('q');document.querySelector('#collection-query').value=keyword;
   document.querySelectorAll('.legacy-row').forEach(row=>{row.hidden=!matchesSearch({title:row.querySelector('strong').textContent,text:row.textContent},keyword);});
  }
 }finally{rendering=false;}
}

document.addEventListener('submit',async event=>{
 const form=event.target;if(!(form instanceof HTMLFormElement)||form.method.toLowerCase()!=='post')return;
 event.preventDefault();if(!form.reportValidity())return;
 const current=route(),values=new FormData(form),submit=form.querySelector('button[type=submit],button:not([type])');if(submit)submit.disabled=true;
 try{
  await sitePromise;
  const action=new URL(form.action,location.href).pathname.slice(base.length);
  if(current.kind==='main'&&action==='/members/login/'){
   try{
    const result=await authenticate('member',String(values.get('id')||'').trim(),String(values.get('password')||''));
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
   if(state.ending==='end2'){showError('この照会に関する記録は、施設運営側の管理へ移管されています。');return;}
   if(!await outcomeBundle()){showError('受付情報を確認できませんでした。資料を受領した際の照会画面からお手続きください。');return;}
   if(current.kind==='audit'&&kind!=='complete')state.auditPending=true;else state.ending=current.kind==='audit'?'end3':'end1';save();go('/received/?case='+state.id,current.kind);return;
  }
  const account=await currentBundle();if(!account){go('/members/login/');return;}
  if(action==='/members/logout/'){localStorage.removeItem(authKey);go('/members/login/');return;}
  if(current.path==='/members/inquiry/'){
   const id=normalizeDocumentId(values.get('record')||'');if(!account.docs.some(d=>d.id===id&&d.inquiry)){showError('文書IDと照会先をご確認ください。');return;}
   state.contact=true;save();go('/members/messages/');return;
  }
  if(current.path==='/members/reservations/'){
   if(['end1','end3'].includes(state.ending)){await boot();return;}
   const date=String(values.get('date')||''),time=String(values.get('time')||'');if(date<'2026-11-02'||time<'09:00'||time>'20:00'){showError('施設・利用日時・利用内容をご確認ください。');return;}
   go('/members/reservations/?received=1');return;
  }
  if(current.path==='/members/contact/'){
   const file=values.get('attachment');if(file instanceof File&&/\.zip$/i.test(file.name)&&classifyEvidence(await file.arrayBuffer()))state.ending='end2';save();go('/members/contact/received/');return;
  }
 }catch{showError('お手続きを完了できませんでした。ページを再読み込みしてご確認ください。');}
 finally{if(submit)submit.disabled=false;}
});

document.addEventListener('click',async event=>{
 const anchor=event.target.closest?.('a[href]');if(!anchor)return;
 const url=new URL(anchor.href,location.href),path=url.pathname.slice(base.length);if(!path.startsWith('/members/download/'))return;
 event.preventDefault();const account=await currentBundle();if(!account||state.ending==='end2'&&account.account.role==='asakura')return;
 const file=account.downloads[path.split('/').filter(Boolean).at(-1)];if(!file||path.endsWith('hozen.zip')&&!state.contact)return;
 const href=URL.createObjectURL(new Blob([bytes(file.data)],{type:file.type})),download=document.createElement('a');download.href=href;download.download=file.name;download.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
});
window.addEventListener('pageshow',event=>{if(event.persisted&&!rendering&&site)void boot();});
await boot();
