const unsavedSeedNotes = new Set();

function seedCollection(){
 const nav = document.querySelector('[data-seed-collection-nav]');
 if (!nav) return null;
 const base = document.querySelector('meta[name="asunaro-base"]')?.content || '';
 return {
  nav,
  total: Number(nav.dataset.seedCollectionNav),
  href: base + nav.dataset.seedCollectionPath,
  key: 'asunaro-seed-notes:' + base + ':',
 };
}

function hasSeedNote(key){
 if (unsavedSeedNotes.has(key)) return true;
 try { return localStorage.getItem(key)==='1'; } catch { return false; }
}

function refreshSeedCollection(){
 const collection = seedCollection();
 if (!collection) return;
 const {nav,total,href,key} = collection;
 let count = 0;
 for (let number=1; number<=total; number++) {
  if (hasSeedNote(key + number)) count++;
 }
 const complete = count===total;
 if (complete && !nav.firstElementChild) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = '中央受付の引継ぎ控え';
  nav.append(link);
 } else if (!complete && nav.firstElementChild) nav.replaceChildren();
 nav.hidden = !complete;
 const progress = document.querySelector('[data-seed-note-progress]');
 if (progress) progress.textContent = `記録済み ${count} / ${total}`;
 const reward = document.querySelector('[data-seed-note-reward]');
 if (reward) {
  if (complete) reward.href = href;
  else reward.removeAttribute('href');
  reward.parentElement.hidden = !complete;
 }
 const page = document.querySelector('[data-seed-collection-page]');
 if (!page) return;
 const locked = page.querySelector('[data-seed-collection-locked]');
 const copy = page.querySelector('[data-seed-collection-unlocked]');
 locked.hidden = complete;
 if (complete && !copy) page.append(page.querySelector('template').content.cloneNode(true));
 else if (!complete && copy) copy.remove();
 const visible = complete ? page.querySelector('[data-seed-collection-unlocked]') : locked;
 document.title = visible.querySelector('h1').textContent + ' | あすなろ産業支援交流施設';
}

function rememberSeedNote(number){
 const collection = seedCollection();
 if (!collection || !Number.isInteger(number) || number<1 || number>collection.total) return false;
 const key = collection.key + number;
 if (hasSeedNote(key)) return false;
 try { localStorage.setItem(key,'1'); } catch { unsavedSeedNotes.add(key); }
 refreshSeedCollection();
 return true;
}

window.addEventListener('pageshow',refreshSeedCollection);
window.addEventListener('storage',event=>{
 const collection = seedCollection();
 if (collection && (event.key===null || event.key.startsWith(collection.key))) refreshSeedCollection();
});

function installSeedNotes(){
 const source = document.querySelector('[data-seed-notes]');
 const button = document.querySelector('.seed-note');
 if (!source || !button || document.querySelector('.seed-note-dialog')) return;

 const note = JSON.parse(source.textContent);
 const dialog = document.createElement('dialog');
 dialog.className = note.beginsDrift ? 'seed-note-dialog seed-note-receipt-dialog' : 'seed-note-dialog';
 dialog.id = 'seed-note-dialog';
 dialog.setAttribute('aria-labelledby','seed-note-title');
 dialog.setAttribute('aria-describedby','seed-note-body seed-note-progress');
 dialog.innerHTML = '<div class="seed-note-meta"><p class="eyebrow"></p><span class="seed-note-number"></span></div><h2 id="seed-note-title"></h2><p id="seed-note-body"></p><a class="text-link seed-note-related" hidden></a><p class="seed-note-unlock" hidden><a class="text-link" data-seed-note-reward>中央受付の引継ぎ控えへ</a></p><div class="seed-note-actions"><a data-seed-note-source target="_blank" rel="noopener" hidden>参考資料（NASA・別タブ）</a><span id="seed-note-progress" data-seed-note-progress></span><button type="button" class="button dark">閉じる</button></div>';
 dialog.querySelector('.eyebrow').textContent = note.beginsDrift ? '受付控え ／ 複写' : 'あすなろの豆知識';
 const total = seedCollection()?.total;
 if (total && note.number) dialog.querySelector('.seed-note-number').textContent = `No.${note.number}/${total}`;
 dialog.querySelector('h2').textContent = note.title;
 dialog.querySelector('#seed-note-body').textContent = note.body;
 if (note.source) {
  const reference = dialog.querySelector('[data-seed-note-source]');
  reference.href = note.source;
  reference.hidden = false;
 }
 if (note.related) {
  const related = dialog.querySelector('.seed-note-related');
  const base = document.querySelector('meta[name="asunaro-base"]')?.content || '';
  related.href = base + note.related[0];
  related.textContent = note.related[1];
  related.hidden = false;
 }
 const close = dialog.querySelector('button');
 const reward = dialog.querySelector('[data-seed-note-reward]');
 close.addEventListener('click', () => dialog.close());
 dialog.addEventListener('close', () => button.focus({preventScroll:true}));
 button.setAttribute('aria-controls',dialog.id);
 button.addEventListener('click', () => {
  const discovered = rememberSeedNote(note.number);
  if (discovered && note.beginsDrift) window.asunaroDrift?.revealFromCopy();
  dialog.showModal();
  if (discovered && reward.hasAttribute('href')) reward.focus();
  else close.focus();
 });
 document.body.append(dialog);
}

function referringListing(link){
 if(!link||!document.referrer)return null;
 const previous=new URL(document.referrer),destination=new URL(link.href);
 if(previous.origin!==destination.origin||previous.pathname.replace(/\/index\.html$/,'/')!==destination.pathname)return null;
 return {previous,destination};
}

function prepareGallery(){
 const form=document.querySelector('[data-gallery-filter]');
 if(form){
  const select=form.elements.method;
  const requested=new URLSearchParams(location.search).get('method')||'';
  const method=Array.from(select.options).some(option=>option.value===requested)?requested:'';
  select.value=method;
  let count=0;
  for(const card of document.querySelectorAll('[data-gallery-method]')){
   card.hidden=Boolean(method&&card.dataset.galleryMethod!==method);
   if(!card.hidden)count++;
  }
  document.querySelector('[data-gallery-scope]').textContent=method||'すべての制作方法';
  document.querySelector('[data-gallery-count]').textContent=count+'件';
  const clear=document.querySelector('[data-gallery-clear]');
  if(clear)clear.hidden=!method;
  const target=document.getElementById(location.hash.slice(1));
  if(target?.matches('.gallery-card:not([hidden])'))requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
 }
 const returnLink=document.querySelector('[data-gallery-return]');
 const listing=referringListing(returnLink);
 if(!listing)return;
 const {previous,destination}=listing;
 const previousMethod=previous.searchParams.get('method');
 if(previousMethod===returnLink.dataset.galleryReturn){
  destination.searchParams.set('method',previousMethod);
  returnLink.href=destination.href;
 }
}

function prepareNewsReturn(){
 const returnLink=document.querySelector('.article-return a[href$="/news/"]');
 const listing=referringListing(returnLink);
 if(!listing)return;
 const {previous,destination}=listing;
 for(const parameter of ['year','kind','page']){
  const value=previous.searchParams.get(parameter);
  if(value)destination.searchParams.set(parameter,value);
 }
 returnLink.href=destination.href;
}

window.asunaroInit=function(){
installSeedNotes();
prepareGallery();
prepareNewsReturn();
refreshSeedCollection();
const searchDialog=document.querySelector('.search-dialog');
document.querySelector('[data-search-open]')?.addEventListener('click',()=>{searchDialog.showModal();searchDialog.querySelector('input').focus();});
document.querySelectorAll('dialog .dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
const menu=document.querySelector('.menu-toggle');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.getElementById('main-navigation').classList.toggle('open',open);});
const newsForm=document.querySelector('[data-news-filter]');
if(newsForm){
 const params=new URLSearchParams(location.search),year=params.get('year')||'',kind=params.get('kind')||'';
 newsForm.elements.year.value=year;newsForm.elements.kind.value=kind;
 const rows=[...document.querySelectorAll('.news-archive .news-rows>a')],matched=rows.filter(row=>(!year||row.dataset.newsYear===year)&&(!kind||row.dataset.newsKind===kind));
 const pageSize=12,totalPages=Math.max(1,Math.ceil(matched.length/pageSize)),current=Math.min(totalPages,Math.max(1,Math.trunc(Number(params.get('page')))||1));
 const visible=new Set(matched.slice((current-1)*pageSize,current*pageSize));rows.forEach(row=>row.hidden=!visible.has(row));
 document.querySelector('.news-result-count').textContent=matched.length?`${(current-1)*pageSize+1}–${Math.min(current*pageSize,matched.length)}件 ／ ${matched.length}件`:'該当するお知らせはありません。';
 const pagination=document.querySelector('.news-pagination');pagination.replaceChildren();
 for(let page=1;page<=totalPages;page++){if(totalPages===1)break;const anchor=document.createElement('a'),query=new URLSearchParams(location.search);query.set('page',String(page));anchor.href=location.pathname+'?'+query;anchor.textContent=String(page);anchor.setAttribute('aria-label',page+'ページ目');if(page===current)anchor.setAttribute('aria-current','page');pagination.append(anchor);}
}
const habitat=document.querySelector('[data-habitat-demo]');
if(habitat){const modes={
 normal:{water:'通常の循環経路',record:'地上側の控えと照合',workshop:'補用品を受領',note:'補給便から交換部品を受け取り、通常の系統で運用します。'},
 isolated:{water:'循環を予備経路へ切替',record:'居住区に残した控えで引き継ぐ',workshop:'手元の材料で部品を製作',note:'次の便が届くまで、居住区にある設備・材料・記録で作業を続けます。'}
 };const buttons=[...habitat.querySelectorAll('[data-habitat-mode]')];
 for(const button of buttons)button.addEventListener('click',()=>{const key=button.dataset.habitatMode,mode=modes[key];if(!mode)return;habitat.dataset.mode=key;for(const b of buttons)b.setAttribute('aria-pressed',String(b===button));for(const cell of habitat.querySelectorAll('[data-system-status]'))cell.textContent=mode[cell.dataset.systemStatus];habitat.querySelector('[data-habitat-note]').textContent=mode.note;});
}
const photoDialog=document.querySelector('.image-dialog');
const photoViewport=photoDialog?.querySelector('.image-viewport');
const photoButtons=document.querySelectorAll('[data-image-open]');
if(photoViewport&&photoButtons.length){
 const stage=photoViewport.querySelector('.image-stage');
 const photo=stage.querySelector('img');
 const middle={x:.5,y:.5};
 const mapFocusX={'#arrival':.475,'#floor-exhibition':.63};
 let zoom=1,angle=0,fitWidth=0,fitHeight=0,openingCenter=middle;

 photoViewport.tabIndex=0;
 photoViewport.setAttribute('role','region');
 photoViewport.setAttribute('aria-label','拡大画像の表示範囲');

 function viewCenter(){
  const {clientWidth,clientHeight,scrollLeft,scrollTop}=photoViewport;
  return {
   x:stage.clientWidth>clientWidth?(scrollLeft+clientWidth/2)/stage.clientWidth:middle.x,
   y:stage.clientHeight>clientHeight?(scrollTop+clientHeight/2)/stage.clientHeight:middle.y,
  };
 }
 function paintPhoto(center){
  const turn=angle%180!==0;
  const width=(turn?fitHeight:fitWidth)*zoom;
  const height=(turn?fitWidth:fitHeight)*zoom;
  stage.style.width=width+'px';
  stage.style.height=height+'px';
  photo.style.width=fitWidth*zoom+'px';
  photo.style.height=fitHeight*zoom+'px';
  photo.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;
  photoViewport.scrollLeft=width*center.x-photoViewport.clientWidth/2;
  photoViewport.scrollTop=height*center.y-photoViewport.clientHeight/2;
 }
 function fitPhoto(center){
  if(!photoDialog.open||!photo.naturalWidth)return;
  const turn=angle%180!==0;
  const availableWidth=photoViewport.offsetWidth;
  const availableHeight=innerHeight*.7;
  const scale=Math.min(
   availableWidth/(turn?photo.naturalHeight:photo.naturalWidth),
   availableHeight/(turn?photo.naturalWidth:photo.naturalHeight),
   1,
  );
  fitWidth=photo.naturalWidth*scale;
  fitHeight=photo.naturalHeight*scale;
  photo.hidden=false;
  paintPhoto(center);
 }
 function refitPhoto(){
  if(!photo.hidden)fitPhoto(viewCenter());
 }
 photo.addEventListener('load',()=>fitPhoto(openingCenter));
 photoDialog.addEventListener('close',()=>window.removeEventListener('resize',refitPhoto));
 for(const button of photoButtons){
  button.addEventListener('click',()=>{
   const source=button.dataset.imageOpen;
   const focusArrival=button.hasAttribute('data-plan-arrival')&&matchMedia('(max-width: 580px)').matches;
   zoom=focusArrival?4:1;
   openingCenter=focusArrival?{x:mapFocusX[location.hash]??.57,y:.57}:middle;
   angle=0;
   photo.hidden=true;
   stage.style.removeProperty('width');
   stage.style.removeProperty('height');
   photo.alt=button.querySelector('img')?.alt||'';
   photoDialog.setAttribute('aria-label',button.getAttribute('aria-label')||'画像');
   photoDialog.querySelector('a').href=source;
   photoDialog.showModal();
   window.addEventListener('resize',refitPhoto);
   photo.src=source;
   if(photo.complete)fitPhoto(openingCenter);
  });
 }
 for(const button of photoDialog.querySelectorAll('[data-photo-action]')){
  button.addEventListener('click',()=>{
   if(photo.hidden)return;
   const action=button.dataset.photoAction;
   const center=viewCenter();
   if(action==='in')zoom=Math.min(12,zoom*1.6);
   if(action==='out')zoom=Math.max(1,zoom/1.6);
   if(action==='rotate'){
    angle=(angle+90)%360;
    fitPhoto({x:1-center.y,y:center.x});
   }else if(action==='reset'){
    zoom=1;
    angle=0;
    fitPhoto(middle);
   }else{
    paintPhoto(center);
   }
  });
 }
}

};
window.asunaroInit();
