// A local case ledger. Only metadata present on a rendered member document is recorded.
// Authentication, evidence uploads and endings remain owned by their existing runtimes.
export const ledgerVersion=1;
export function normalizeLedger(value){
 const rows=Array.isArray(value?.rows)?value.rows:[];
 return {version:ledgerVersion,rows:rows.filter(r=>r&&typeof r.id==='string'&&/^[A-Z0-9-]{3,60}$/.test(r.id)&&typeof r.role==='string'&&typeof r.title==='string').slice(-120).map(r=>({id:r.id,role:r.role.slice(0,30),label:String(r.label||'登録会員').slice(0,100),title:r.title.slice(0,160),views:Math.max(1,Math.min(999,Number(r.views)||1))}))};
}
export function recordReading(value,record){
 const ledger=normalizeLedger(value);
 if(!record?.id||!record.role||!record.title)return ledger;
 const existing=ledger.rows.find(row=>row.id===record.id&&row.role===record.role);
 if(existing)existing.views=Math.min(999,existing.views+1);
 else ledger.rows.push({id:record.id,role:record.role,label:record.label,title:record.title,views:1});
 return normalizeLedger(ledger);
}
export function ledgerRows(value,role,combined=false){return normalizeLedger(value).rows.filter(row=>combined||row.role===role);}
