(()=>{
 'use strict';
 const base=document.querySelector('meta[name="asunaro-base"]')?.content||'';
 const scope=Array.from(base).reduce((hash,c)=>Math.imul(hash^c.charCodeAt(0),16777619),2166136261)>>>0;
 const cookieName='asunaro_seed_'+scope.toString(16),signalKey='asunaro-seed-signal:'+base;
 let counted=false,lastStage='',noiseTimer;
 const cookieCount=()=>Math.max(0,Math.min(999,Number(document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1))||0));
 function setCount(value){
  document.cookie=cookieName+'='+value+'; Path='+(base||'')+'/; SameSite=Lax; Max-Age='+(value?31536000:0)+(location.protocol==='https:'?'; Secure':'');
  try{localStorage.setItem(signalKey,JSON.stringify({count:value,time:Date.now(),nonce:Math.random()}));}catch{}
 }
 const altered=new Set();
 function changePhoto(container,number){
  const photo=container.querySelector('img');if(!photo)return;
  if(!photo.dataset.seedOriginalSrc){photo.dataset.seedOriginalSrc=photo.getAttribute('src');photo.dataset.seedOriginalAlt=photo.alt;}
  photo.src=base+'/assets/effects/seed-'+number+'.webp';photo.alt=number==='0021'?'暗い廊下の奥に写る人影':'灯りのない待合室の記録写真';
  const button=photo.closest('[data-image-open]');if(button){if(!button.dataset.seedOriginalOpen)button.dataset.seedOriginalOpen=button.dataset.imageOpen;button.dataset.imageOpen=photo.src;}
  container.classList.add('seed-corrupted');altered.add(container);
 }
 function restore(){
  for(const container of altered){const photo=container.querySelector('img');if(photo?.dataset.seedOriginalSrc){photo.src=photo.dataset.seedOriginalSrc;photo.alt=photo.dataset.seedOriginalAlt;delete photo.dataset.seedOriginalSrc;delete photo.dataset.seedOriginalAlt;}
   const button=container.querySelector('[data-seed-original-open]')||container.closest('[data-seed-original-open]');if(button){button.dataset.imageOpen=button.dataset.seedOriginalOpen;delete button.dataset.seedOriginalOpen;}
   container.classList.remove('seed-corrupted');}
  altered.clear();document.querySelectorAll('.seed-drift-link,.seed-noise,.seed-fragment').forEach(node=>node.remove());clearTimeout(noiseTimer);
  const dialog=document.querySelector('.image-dialog');if(dialog?.open&&dialog.querySelector('img')?.src.includes('/assets/effects/seed-'))dialog.close();
 }
 function appearance(playNoise=false){
  const enabled=document.body?.dataset.seedDriftEnabled==='true',threshold=Number(document.body?.dataset.seedDriftThreshold)||15;
  const should=enabled&&document.body?.dataset.asunaroStage==='seed'&&cookieCount()>=threshold;
  document.body?.classList.toggle('seed-drift-active',should);
  if(!should){restore();return;}
  for(const number of ['0021','0024']){
   document.querySelectorAll('.gallery-card').forEach(card=>{if(new URL(card.href).pathname.endsWith('/gallery/'+number+'/'))changePhoto(card,number);});
   if(location.pathname.endsWith('/gallery/'+number+'/')){const article=document.querySelector('main article');if(article)changePhoto(article,number);}
  }
  const footer=document.querySelector('.site-footer');
  if(footer&&!footer.querySelector('.seed-drift-link')){const link=document.createElement('a');link.className='seed-drift-link';link.href=base+'/guide/access/';link.textContent='この施設が気になる方はこちら…';(footer.querySelector('.footer-links')||footer).append(link);}
  const path=location.pathname.slice(base.length),fragments={
   '/':{text:'来館経路の表示を確認できません。',href:'/guide/access/'},
   '/news/':{text:'次の作品を、まだ待っています。',href:'/people/seo-akari/'},
   '/workshop/':{text:'持ち主が戻っていないものを、返却済みにしないでください。',href:'/gallery/0021/'},
   '/floor-map/':{text:'個室オフィスの利用事業者',href:'/tenants/'},
   '/membership/':{text:'登録されている事業者の記録',href:'/tenants/'},
   '/facilities/cafe/':{text:'あの机は、三人分のままです。',href:'/workshop/stories/seo-akari/'},
   '/visit/':{text:'見学経路の確認',href:'/guide/access/'}
  },fragment=fragments[path];
  if(fragment&&!document.querySelector('.seed-fragment')){const aside=document.createElement('aside'),anchor=document.createElement('a');aside.className='seed-fragment';anchor.href=base+fragment.href;anchor.textContent=fragment.text;aside.append(anchor);const target=document.querySelector('main>.page-heading')||document.querySelector('main>.hero');target?.after(aside);}
  if(playNoise&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelector('.seed-noise')?.remove();const noise=document.createElement('div');noise.className='seed-noise';noise.setAttribute('aria-hidden','true');document.body.append(noise);noiseTimer=setTimeout(()=>noise.remove(),480);}
 }
 function refresh({visit=false}={}){
  if(!document.body)return;const stage=document.body.dataset.asunaroStage||'';
  if(visit)counted=false;
  if(stage!=='seed'){
   if(stage!==lastStage||!counted)setCount(0);counted=true;lastStage=stage;appearance();return;
  }
  const newVisit=!counted||lastStage!=='seed';if(newVisit){setCount(cookieCount()+1);counted=true;}lastStage=stage;appearance(newVisit);
 }
 window.asunaroDrift={refresh};
 addEventListener('pageshow',event=>{if(event.persisted)refresh({visit:true});});
 addEventListener('storage',event=>{if(event.key===signalKey)appearance();});
 addEventListener('focus',()=>appearance());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)appearance();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});else refresh();
})();
