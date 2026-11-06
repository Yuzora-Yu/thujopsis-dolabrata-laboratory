export function normalizeSearch(value='') {
  return String(value).normalize('NFKC').toLocaleLowerCase('ja-JP')
    .replace(/[\s\u200b\ufeff・·]+/gu,'')
    .replace(/[ァ-ヶ]/g,char=>String.fromCharCode(char.charCodeAt(0)-0x60));
}

export function matchesSearch(entry,query) {
  const compact=normalizeSearch(query);
  if(!compact)return false;
  const content=normalizeSearch(`${entry.title} ${entry.text}`);
  const terms=String(query).normalize('NFKC').trim().split(/\s+/u).map(normalizeSearch).filter(Boolean);
  return content.includes(compact)||(terms.length>1&&terms.every(term=>content.includes(term)));
}

export function normalizeDocumentId(value=''){
 return String(value).normalize('NFKC').toUpperCase().replace(/[‐‑‒–—−]/gu,'-').replace(/\s+/gu,'');
}

export const documentLookupMessages = {
 missing:'該当する資料はありません。',
 restricted:'該当する資料は閲覧できません。',
};
