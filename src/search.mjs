export function normalizeSearch(value='') {
  return String(value).normalize('NFKC').toLocaleLowerCase('ja-JP')
    .replace(/[\s\u200b\ufeff・·]+/gu,'')
    .replace(/[ァ-ヶ]/g,char=>String.fromCharCode(char.charCodeAt(0)-0x60));
}

function publicationDate(term){
 const date=term.replace(/(?:掲載|公開)$/u,'')
  .replace(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/u,'$1-$2-$3')
  .replace(/[‐‑‒–—−]/gu,'-');
 const parts=date.match(/^(\d{4})([./-])(\d{1,2})\2(\d{1,2})$/u);
 if(parts)return `${parts[1]}-${parts[3].padStart(2,'0')}-${parts[4].padStart(2,'0')}`;
 return date.replace(/^(\d{4})(\d{2})(\d{2})$/u,'$1-$2-$3');
}

export function matchesSearch(entry,query) {
  const compact=normalizeSearch(query);
  if(!compact)return false;
  const content=normalizeSearch(`${entry.title} ${entry.text}`);
  const terms=String(query).normalize('NFKC').trim().split(/\s+/u).map(normalizeSearch).filter(Boolean);
  const includes=term=>content.includes(term)||Boolean(entry.published&&publicationDate(term)===entry.published);
  return includes(compact)||(terms.length>1&&terms.every(includes));
}

export function searchExcerpt({summary,text}){
 const copy=summary??text;
 return copy.length>100?copy.slice(0,100)+'…':copy;
}

export function normalizeDocumentId(value=''){
 return String(value).normalize('NFKC').toUpperCase().replace(/[‐‑‒–—−]/gu,'-').replace(/\s+/gu,'');
}

export const documentLookupMessages = {
 missing:'該当する資料はありません。',
 restricted:'該当する資料は閲覧できません。',
};
