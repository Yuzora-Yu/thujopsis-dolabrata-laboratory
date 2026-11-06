import {fictionFooter,decoratePage} from './experience.mjs';
import {archiveItems,archiveNotes,noticeCapture,pressClippings} from './world/archive-data.mjs';
import {esc,renderPressClipping} from './render.mjs';
import {matchesSearch} from './search.mjs';
import {consoleContent} from './lab.mjs';

export const archivePublicPaths=['/','/collections/','/snapshots/','/snapshots/2009/','/snapshots/2011/','/snapshots/2017/',...archiveItems.map(i=>`/collections/items/${i.id}/`),...noticeCapture.pages.map(notice=>notice.path)];

const linked=(url,text)=>`<a href="${esc(url)}">${esc(text)}</a>`;
const snapshotDate=iso=>`<time datetime="${iso}">${iso.replaceAll('-','.')}</time>`;
function archivePdf(file,label,clippingKey){
 const link=`<p><a href="/assets/archive/${esc(file)}" target="_blank" rel="noopener">${esc(label)}（PDF）${clippingKey?' <span class="record-link-format">別タブ</span>':'<span class="sr-only">・別タブで開きます</span>'}</a></p>`;
 if(!clippingKey)return link;
 return `<section class="legacy-clipping" aria-label="${esc(label)}">${link}<details><summary>${esc(label)}の本文を読む</summary>${renderPressClipping(pressClippings[clippingKey],'clipping-'+clippingKey)}</details></section>`;
}
export function legacyLayout(title,body,{privateRoom=false,consolePage=false}={}){
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}｜産業継続研究資料 保存室</title><link rel="stylesheet" href="/styles.css">${consolePage?'<script type="module" src="/lab-console.js"></script>':''}</head><body class="legacy-body"><a class="skip" href="#legacy-main">本文へ移動</a><header class="legacy-header"><p>INDUSTRIAL CONTINUITY RECORDS</p><a href="/">産業継続研究資料 保存室</a><small>旧産業継続研究準備室・部分保存資料</small></header><nav class="legacy-nav" aria-label="資料保存室"><a href="/collections/">収蔵目録</a><a href="/snapshots/">公開画面の保存</a><a href="/room/">資料照会室</a></nav><main id="legacy-main" class="legacy-main">${privateRoom?'<p class="legacy-classification">資料照会室 ／ 移管・保守</p>':''}<h1>${esc(title)}</h1>${body}</main><footer class="legacy-footer">資料管理：旧基盤保存担当 ／ 公開保存資料と継続照会の更新日は各資料に記載</footer>${fictionFooter()}</body></html>`;
}
const noteRow=n=>`<a class="legacy-row" href="/room/records/${n.id}/"><span>No.${n.id}</span><time>${n.date}</time><strong>${esc(n.title)}</strong></a>`;
export function legacyLogin(csrf,{error=''}={}){
 return decoratePage(legacyLayout('資料照会室',`<p>移管・保守契約に基づく資料の照会を受け付けております。</p>${error?`<p class="form-error" role="alert">${esc(error)}</p>`:''}<form method="post" action="/room/login/" class="form-stack legacy-login"><input type="hidden" name="csrf" value="${esc(csrf)}"><label for="ticket">閲覧票番号</label><input id="ticket" name="ticket" autocomplete="username" required maxlength="40"><label for="inquiry-code">照会符号</label><input id="inquiry-code" name="code" type="password" autocomplete="current-password" required maxlength="40"><button type="submit" class="button dark">照会室へ</button></form>`),{kind:'archive',path:'/room/'});
}
function renderLegacyPage(path,ctx){
 const {origins,session,csrf}=ctx;
 if(path==='/')return legacyLayout('資料の保存について','<p>当保存室は、旧産業継続研究準備室が管理していた資料の一部を保存しております。収蔵目録は保存単位ごとに掲載しています。</p><dl class="legacy-info"><dt>公開画面の保存</dt><dd>取得時点の固定記録です。現在の事業案内とは異なる場合がございます。</dd><dt>資料照会室</dt><dd>移管・保守契約に基づく継続業務の窓口です。公開保存画面とは別に管理しております。</dd></dl><p><a href="/collections/">収蔵目録</a></p><p><a href="/snapshots/">公開画面の保存</a></p>');
 if(path==='/collections/'){
 const keyword=ctx.query?.get('q')?.trim()||'';
 const items=archiveItems.filter(i=>i.listed&&(!keyword||matchesSearch({title:i.title,text:i.code+' '+i.year},keyword)));
 return legacyLayout('収蔵目録',`<form method="get" action="/collections/" class="record-form"><label for="collection-query">収蔵番号・資料名</label><div class="search-box"><input id="collection-query" name="q" value="${esc(keyword)}"><button type="submit">検索</button></div></form><p class="small" data-collection-count>収蔵資料・公開対象${keyword?' ／ '+items.length+'件':''}</p><div class="legacy-catalog">${items.map(i=>`<a class="legacy-row" data-collection-key="${esc(i.code+' '+i.year)}" href="/collections/items/${i.id}/"><span>No.${i.id}</span><time>${i.year}</time><strong>${esc(i.title)}</strong><small>${i.code}</small></a>`).join('')}<p data-collection-empty${items.length?' hidden':''}>該当する資料はありません。</p></div>`);
 }
 const item=archiveItems.find(i=>path===`/collections/items/${i.id}/`);
 if(item){
  const original=item.sourcePath?`<p>${linked((origins.main||'../../../..')+item.sourcePath,'施設サイトのお知らせ（2021年11月3日）')}</p>`:'';
  const copy=item.file?archivePdf(item.file,item.fileLabel||item.kind+'の複写',item.clipping):'';
  const related=item.relatedEdition?archivePdf(item.relatedEdition.file,item.relatedEdition.label,item.relatedEdition.clipping):'';
  const correction=item.relatedItem?`<p>${linked(item.relatedItem.path,item.relatedItem.label)}</p>`:'';
  return legacyLayout(item.title,`<div class="legacy-record-meta">収蔵番号 ${item.code} ／ ${item.year}年 ／ ${item.kind}</div><p>${esc(item.body)}</p><div class="legacy-transcription"><h2>${item.kind==='新聞切抜'?'紙面抄録':item.scan?'資料抄録':'収録内容'}</h2><p>${esc(item.text).replaceAll('\n','<br>')}</p></div><p class="small">${esc(item.next)}</p>${original}${copy}${related}${correction}${item.scan?`<figure class="archival-scan"><a href="/assets/archive/${esc(item.scan)}" target="_blank" rel="noopener"><img src="/assets/archive/${esc(item.scan)}" loading="lazy" alt="${esc(item.title)}の保存複写。資料の抄録は上に掲載しています。"><span class="sr-only">画像を別タブで開く</span></a><figcaption>所蔵原本の保存複写</figcaption></figure>`:''}<p><a href="/collections/">収蔵目録へ</a></p>`);
 }
 if(path==='/snapshots/')return legacyLayout('公開画面の保存',`<ul class="snapshot-index"><li><a href="/snapshots/2009/">2009年11月20日取得 ／ 旧産業継続研究準備室</a></li><li><a href="/snapshots/2011/">2011年3月31日取得 ／ 設立準備記録</a></li><li><a href="/snapshots/2017/">2017年7月14日取得 ／ 保存事業案内</a></li></ul>`);
 const snapshot=path.match(/^\/snapshots\/(2009|2011|2017)\/$/);
 if(snapshot){
  const year=snapshot[1];const bodies={
   '2009':'<h2>産業継続研究準備室</h2><p>災害と資源途絶の後にも、生活基盤と技術を継続するための施設整備を検討しています。</p><h3>事業案の検討</h3><p>榊原惟臣氏から、旧継舟計画の対象者区分を引き継がないことを条件とする回答がありました。既存案を凍結し、設備側の支援を中心とする新たな設立案を協議しています。</p><p>回答書：RG-2007-011</p>',
   '2011':'<h2>あすなろ施設・設立準備記録</h2><p>2010年6月15日、新法人を設立しました。旧事業の承継を行わず、支援を必要とする人に合わせた設備研究を進めます。</p><h3>公開終了について</h3><p>施設開設準備に伴い、本サイトの公開を終了します。旧計画の史料は外部保管し、研究は凍結を維持します。公開サイトへの再掲載は認められていません。</p>',
   '2017':`<h2>保存資料事業のご案内</h2><p>三田佳代が保存した旧基盤の部分複写を、アシタ記録技研が引き継ぎました。固定保存画面のほか、既存契約の資料照会業務を継続します。</p><p>管理資料 AH-2017-009</p><h3>併せて保存した施設の公開記録</h3><ul>${noticeCapture.pages.map(notice=>`<li>${snapshotDate(notice.published)}　${linked(notice.path,notice.title)}</li>`).join('')}</ul>`,
  };
  return legacyLayout(`${year}年の公開保存画面`,`<p class="snapshot-stamp">取得記録：${year}年 ／ 固定保存</p><article class="snapshot-page">${bodies[year]}</article><p><a href="/snapshots/">保存画面一覧</a></p>`);
 }
 const notice=noticeCapture.pages.find(saved=>path===saved.path);
 if(notice){
  const photo=notice.image;
  return legacyLayout(notice.title,`<div class="snapshot-stamp snapshot-notice-stamp">
   <span>原掲載 ${snapshotDate(notice.published)}</span><span>取得 ${snapshotDate(noticeCapture.capturedOn)}</span>
   <span>採録範囲 ${esc(notice.scope)}</span>
  </div>
  <article class="snapshot-page snapshot-notice">
   <p class="snapshot-source">あすなろ産業支援交流施設　お知らせ</p>
   ${notice.paragraphs.map(paragraph=>`<p>${esc(paragraph)}</p>`).join('')}
   ${photo?`<figure><img src="/assets/media/${esc(photo.file)}" alt="${esc(photo.alt)}"><figcaption>${esc(photo.caption)}</figcaption></figure>`:''}
  </article>
  ${notice.custody?`<p class="snapshot-stamp">${esc(notice.custody)}</p>`:''}
  <p><a href="/snapshots/2017/">保存事業案内へ</a></p>`);
 }
 if(path.startsWith('/room/')){
  if(!session.archiveAccess)return legacyLogin(csrf);
  const consolePage=consoleContent(path,ctx);if(consolePage)return legacyLayout(consolePage.title,consolePage.body,{privateRoom:true,consolePage:true});
  if(path==='/room/')return legacyLayout('移管・保守受領簿',`<p>閲覧票 ${esc(session.archiveAccess)} ／ 継続照会</p><div class="legacy-catalog">${archiveNotes.filter(n=>n.listed).map(noteRow).join('')}</div><form action="/room/logout/" method="post"><input type="hidden" name="csrf" value="${esc(csrf)}"><button class="legacy-logout" type="submit">照会室を終了</button></form>`,{privateRoom:true});
  const note=archiveNotes.find(n=>path===`/room/records/${n.id}/`);
  if(note)return legacyLayout(note.title,`<div class="legacy-record-meta">受領簿 No.${note.id} ／ ${note.date} ／ ${esc(note.by)}${note.updated?'<br>最終更新：'+note.updated:''}</div><p class="legacy-memo">${esc(note.body)}</p>${(note.links||[]).map(link=>`<p><a href="${esc(link.path)}">${esc(link.text)}</a></p>`).join('')}<p><a href="/room/">受領簿へ</a></p>`,{privateRoom:true});
 }
 return null;
}

export function renderLegacy(path,ctx){return decoratePage(renderLegacyPage(path,ctx),{kind:'archive',path});}
