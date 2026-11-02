window.asunaroInit=function(){
const searchDialog=document.querySelector('.search-dialog');
document.querySelector('[data-search-open]')?.addEventListener('click',()=>{searchDialog.showModal();searchDialog.querySelector('input').focus();});
document.querySelectorAll('dialog .dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
const menu=document.querySelector('.menu-toggle');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.getElementById('main-navigation').classList.toggle('open',open);});
const photoDialog=document.querySelector('.image-dialog');let zoom=1,angle=0,fitWidth=0,fitHeight=0;
function paintPhoto(){if(!photoDialog||!fitWidth)return;const photo=photoDialog.querySelector('img'),stage=photoDialog.querySelector('.image-stage');const turn=angle%180!==0;stage.style.width=(turn?fitHeight:fitWidth)*zoom+'px';stage.style.height=(turn?fitWidth:fitHeight)*zoom+'px';photo.style.width=fitWidth*zoom+'px';photo.style.height=fitHeight*zoom+'px';photo.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;}
document.querySelectorAll('[data-image-open]').forEach(b=>b.addEventListener('click',()=>{const d=photoDialog,photo=d.querySelector('img'),source=b.dataset.imageOpen;zoom=1;angle=0;fitWidth=0;photo.onload=()=>{const scale=Math.min((d.clientWidth-32)/photo.naturalWidth,(innerHeight*.7)/photo.naturalHeight,1);fitWidth=photo.naturalWidth*scale;fitHeight=photo.naturalHeight*scale;paintPhoto();};photo.alt=b.querySelector('img')?.alt||'';d.querySelector('a').href=source;d.showModal();photo.src=source;}));
document.querySelectorAll('[data-photo-action]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.photoAction;if(action==='in')zoom=Math.min(12,zoom*1.6);if(action==='out')zoom=Math.max(1,zoom/1.6);if(action==='rotate')angle=(angle+90)%360;if(action==='reset'){zoom=1;angle=0;}paintPhoto();}));

};
window.asunaroInit();
