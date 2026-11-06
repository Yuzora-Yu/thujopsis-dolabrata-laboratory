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

function seedNoteCount(collection){
 let count = 0;
 for (let number=1; number<=collection.total; number++) {
  const key = collection.key + number;
  let found = unsavedSeedNotes.has(key);
  try { found ||= localStorage.getItem(key)==='1'; } catch {}
  if (found) count++;
 }
 return count;
}

function refreshSeedCollection(){
 const collection = seedCollection();
 if (!collection) return;
 const {nav,total,href} = collection;
 const count = seedNoteCount(collection);
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
  reward.hidden = !complete;
 }
 const page = document.querySelector('[data-seed-collection-page]');
 if (!page) return;
 const locked = page.querySelector('[data-seed-collection-locked]');
 const copy = page.querySelector('.reception-copy');
 locked.hidden = complete;
 if (complete && !copy) page.append(page.querySelector('template').content.cloneNode(true));
 else if (!complete && copy) copy.remove();
}

function rememberSeedNote(number){
 const collection = seedCollection();
 if (!collection || !Number.isInteger(number) || number<1 || number>collection.total) return;
 const key = collection.key + number;
 try { localStorage.setItem(key,'1'); } catch { unsavedSeedNotes.add(key); }
 refreshSeedCollection();
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
 dialog.setAttribute('aria-describedby','seed-note-body');
 dialog.innerHTML = '<div class="seed-note-meta"><p class="eyebrow"></p><span class="seed-note-number"></span></div><h2 id="seed-note-title"></h2><p id="seed-note-body"></p><a class="text-link seed-note-related" hidden></a><div class="seed-note-actions"><a data-seed-note-source target="_blank" rel="noopener" hidden>参考資料（NASA・別タブ）</a><span data-seed-note-progress></span><a class="text-link" data-seed-note-reward hidden>中央受付の引継ぎ控えへ</a><button type="button" class="button dark">閉じる</button></div>';
 dialog.querySelector('.eyebrow').textContent = note.beginsDrift ? '受付控え ／ 複写' : 'あすなろの豆知識';
 const total = seedCollection()?.total;
 if (total && note.number) dialog.querySelector('.seed-note-number').textContent = `No. ${note.number} / ${total}`;
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
 close.addEventListener('click', () => dialog.close());
 dialog.addEventListener('close', () => button.focus({preventScroll:true}));
 button.setAttribute('aria-controls',dialog.id);
 button.addEventListener('click', () => {
  rememberSeedNote(note.number);
  if (note.beginsDrift) window.asunaroDrift?.revealFromCopy();
  dialog.showModal();
  close.focus();
 });
 document.body.append(dialog);
}

window.asunaroInit=function(){
installSeedNotes();
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
const photoDialog=document.querySelector('.image-dialog');let zoom=1,angle=0,fitWidth=0,fitHeight=0;
const photoViewport=photoDialog?.querySelector('.image-viewport');
if(photoViewport&&document.querySelector('[data-image-open]')){
 photoViewport.tabIndex=0;
 photoViewport.setAttribute('role','region');
 photoViewport.setAttribute('aria-label','拡大画像の表示範囲');
}
function paintPhoto(){if(!photoDialog||!fitWidth)return;const photo=photoDialog.querySelector('img'),stage=photoDialog.querySelector('.image-stage');const turn=angle%180!==0;stage.style.width=(turn?fitHeight:fitWidth)*zoom+'px';stage.style.height=(turn?fitWidth:fitHeight)*zoom+'px';photo.style.width=fitWidth*zoom+'px';photo.style.height=fitHeight*zoom+'px';photo.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;}
document.querySelectorAll('[data-image-open]').forEach(b=>b.addEventListener('click',()=>{const d=photoDialog,photo=d.querySelector('img'),source=b.dataset.imageOpen;zoom=1;angle=0;fitWidth=0;photo.onload=()=>{const scale=Math.min((d.clientWidth-32)/photo.naturalWidth,(innerHeight*.7)/photo.naturalHeight,1);fitWidth=photo.naturalWidth*scale;fitHeight=photo.naturalHeight*scale;paintPhoto();};photo.alt=b.querySelector('img')?.alt||'';d.querySelector('a').href=source;d.showModal();photo.src=source;}));
document.querySelectorAll('[data-photo-action]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.photoAction;if(action==='in')zoom=Math.min(12,zoom*1.6);if(action==='out')zoom=Math.max(1,zoom/1.6);if(action==='rotate')angle=(angle+90)%360;if(action==='reset'){zoom=1;angle=0;}paintPhoto();}));

};
window.asunaroInit();
