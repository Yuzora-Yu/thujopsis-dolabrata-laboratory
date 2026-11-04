import {normalizeLedger,recordReading,ledgerRows} from './reading-state.js';
const base=document.querySelector('meta[name="asunaro-base"]')?.content||'';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentPage='';
function refresh(){
 const body=document.body,role=body.dataset.memberRole,caseId=body.dataset.memberCase;
 if(!role||!caseId||caseId.startsWith('@@'))return;
 const key='asunaro-reading-v1:'+base+':'+caseId;
 let ledger=normalizeLedger(null),available=true;
 try{ledger=normalizeLedger(JSON.parse(localStorage.getItem(key)));}catch{available=false;}
 const id=body.dataset.memberRecord,title=body.dataset.memberRecordTitle,pageKey=caseId+':'+role+':'+id;
 if(id&&title&&currentPage!==pageKey){ledger=recordReading(ledger,{id,role,title,label:body.dataset.memberLabel});try{localStorage.setItem(key,JSON.stringify(ledger));}catch{available=false;}}
 currentPage=pageKey;
 for(const element of document.querySelectorAll('[data-reading-ledger]')){
  const rows=ledgerRows(ledger,role,element.dataset.readingLedger==='combined');if(element.dataset.readingLedger!=='combined')rows.reverse();
  const rowMarkup=(items,offset=0)=>items.map((row,i)=>`<li><span class="reading-order">${String(i+offset+1).padStart(2,'0')}</span><div>${element.dataset.readingLedger==='combined'?`<small class="reading-source">${esc(row.label)}</small>`:''}<a href="${base}/members/records/${encodeURIComponent(row.id)}/">${esc(row.title)}</a><small>${esc(row.id)}${row.views>1?' ／ '+row.views+'回':''}</small></div></li>`).join('');
  if(!rows.length)element.innerHTML=`<p class="empty-state">${available?'この照会端末で表示した資料はありません。':'この照会端末では履歴を保存できません。'}</p>`;
  else if(rows.length>12){
   const preview=element.dataset.readingLedger==='combined'?rowMarkup(rows.slice(0,3))+'<li class="reading-omission">…</li>'+rowMarkup(rows.slice(-3),rows.length-3):rowMarkup(rows.slice(0,8));
   element.innerHTML=`<p class="member-meta">照会資料　${rows.length}件</p><details class="reading-expand"><summary>全${rows.length}件を表示</summary><ol class="reading-list">${rowMarkup(rows)}</ol></details><ol class="reading-list reading-preview">${preview}</ol>`;
  }else element.innerHTML=`<ol class="reading-list">${rowMarkup(rows)}</ol>`;
 }
 for(const element of document.querySelectorAll('[data-inquiry-record]'))element.hidden=element.dataset.inquiryRecord!==body.dataset.memberInquiry;
 const seen=new Set(ledger.rows.map(row=>row.id));
 for(const element of document.querySelectorAll('[data-after-reading]'))element.hidden=!element.dataset.afterReading.split(' ').every(id=>seen.has(id));
 for(const element of document.querySelectorAll('[data-before-reading]'))element.hidden=element.dataset.beforeReading.split(' ').every(id=>seen.has(id));
 for(const element of document.querySelectorAll('[data-reading-reference]'))element.textContent='照会端末 '+caseId.slice(0,8).toUpperCase();
}
window.asunaroReading={refresh};
refresh();
window.addEventListener('pageshow',()=>refresh());
window.addEventListener('storage',()=>refresh());
