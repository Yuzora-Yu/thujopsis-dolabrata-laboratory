function installSeedNotes(){
 const source=document.querySelector('[data-seed-notes]');
 const main=document.querySelector('#main');
 const footer=document.querySelector('.site-footer');
 if(!source||!main||!footer||document.querySelector('.seed-note-dialog'))return;

 const facts=JSON.parse(source.textContent);
 const dialog=document.createElement('dialog');
 dialog.className='seed-note-dialog';
 dialog.setAttribute('aria-labelledby','seed-note-title');
 dialog.setAttribute('aria-describedby','seed-note-body');
 dialog.innerHTML='<p class="eyebrow">あすなろの豆知識</p><h2 id="seed-note-title"></h2><p id="seed-note-body"></p><a class="text-link seed-note-related" hidden></a><div class="seed-note-actions"><a target="_blank" rel="noopener">参考資料（NASA・別タブ）</a><button type="button" class="button dark">閉じる</button></div>';
 const title=dialog.querySelector('h2');
 const copy=dialog.querySelector('#seed-note-body');
 const reference=dialog.querySelector('.seed-note-actions a');
 const related=dialog.querySelector('.seed-note-related');
 const base=document.querySelector('meta[name="asunaro-base"]')?.content||'';
 const close=dialog.querySelector('button');
 close.addEventListener('click',()=>dialog.close());
 document.body.append(dialog);

 const opening=main.firstElementChild;
 const intro=opening?.querySelector('.eyebrow,.hero-en,.error-code');
 const detail=main.querySelector('.facility-hero-photo figcaption,.article-meta,.map-toolbar>span,.page-lead,.news-rows')
   ||opening?.querySelector('p:not(.eyebrow,.hero-en,.error-code)');
 const margin=document.createElement('div');
 margin.className='seed-note-margin';
 main.lastElementChild?.after(margin);
 const spots=[
  intro||opening||main,
  detail?.matches('.news-rows')?null:detail,
  margin,
  footer.querySelector('.footer-top p'),
  footer.querySelector('.footer-bottom>span'),
 ];
 facts.forEach(([heading,body,url,nearby],index)=>{
  const button=document.createElement('button');
  button.type='button';
  button.className=index===4?'seed-note seed-note-quiet':'seed-note';
  button.setAttribute('aria-label','豆知識：'+heading);
  button.setAttribute('aria-haspopup','dialog');
  button.addEventListener('click',()=>{
   title.textContent=heading;
   copy.textContent=body;
   reference.href=url;
   related.hidden=!nearby;
   if(nearby){
    related.href=base+nearby[0];
    related.textContent=nearby[1];
   }
   dialog.showModal();
   close.focus();
  });
  if(index===1&&!spots[index]){
   const perch=document.createElement('div');
   perch.className='wrap seed-note-perch';
   opening?.after(perch);
   perch.append(button);
  }else{
   spots[index]?.append(button);
  }
 });
}

window.asunaroInit=function(){
installSeedNotes();
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
