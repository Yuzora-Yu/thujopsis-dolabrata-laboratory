import {archiveItems,archiveNotes} from './world/archive-data.mjs';
import {esc} from './render.mjs';
import {news} from './content.mjs';
import {matchesSearch} from './search.mjs';

const snapshotNewsIds=['20120401','20120903','20161003','20170714'];
archiveNotes.find(n=>n.id==='0002').updated='2017.09.11';
archiveNotes.find(n=>n.id==='0005').updated='2021.01.22';
export const archivePublicPaths=['/','/collections/','/snapshots/','/snapshots/2009/','/snapshots/2011/','/snapshots/2017/',...archiveItems.map(i=>`/collections/items/${i.id}/`),...snapshotNewsIds.map(id=>`/snapshots/2017/news/${id}/`)];

const linked=(url,text)=>`<a href="${esc(url)}">${esc(text)}</a>`;
export function legacyLayout(title,body,{privateRoom=false}={}){
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}｜産業継続研究資料 保存室</title><link rel="stylesheet" href="/styles.css"></head><body class="legacy-body"><a class="skip" href="#legacy-main">本文へ移動</a><header class="legacy-header"><p>INDUSTRIAL CONTINUITY RECORDS</p><a href="/">産業継続研究資料 保存室</a><small>旧産業継続研究準備室・部分保存資料</small></header><nav class="legacy-nav" aria-label="資料保存室"><a href="/collections/">収蔵目録</a><a href="/snapshots/">公開画面の保存</a><a href="/room/">資料照会室</a></nav><main id="legacy-main" class="legacy-main">${privateRoom?'<p class="legacy-classification">資料照会室 ／ 移管・保守</p>':''}<h1>${esc(title)}</h1>${body}</main><footer class="legacy-footer">資料管理：旧基盤保存担当 ／ 公開保存資料と継続照会の更新日は各資料に記載</footer></body></html>`;
}
const noteRow=n=>`<a class="legacy-row" href="/room/records/${n.id}/"><span>No.${n.id}</span><time>${n.date}</time><strong>${esc(n.title)}</strong></a>`;
export function legacyLogin(csrf,{error=''}={}){
 return legacyLayout('資料照会室',`<p>移管・保守契約に基づく資料の照会を受け付けております。</p>${error?`<p class="form-error" role="alert">${esc(error)}</p>`:''}<form method="post" action="/room/login/" class="form-stack legacy-login"><input type="hidden" name="csrf" value="${esc(csrf)}"><label for="ticket">閲覧票番号</label><input id="ticket" name="ticket" autocomplete="username" required maxlength="40"><label for="inquiry-code">照会符号</label><input id="inquiry-code" name="code" type="password" autocomplete="current-password" required maxlength="40"><button type="submit" class="button dark">照会室へ</button></form>`);
}
export function renderLegacy(path,ctx){
 const {origins,session,csrf}=ctx;
 if(path==='/')return legacyLayout('資料の保存について','<p>当保存室は、旧産業継続研究準備室が管理していた資料の一部を保存しております。収蔵目録は保存単位ごとに掲載しています。</p><dl class="legacy-info"><dt>公開画面の保存</dt><dd>取得時点の固定記録です。現在の事業案内とは異なる場合がございます。</dd><dt>資料照会室</dt><dd>移管・保守契約に基づく継続業務の窓口です。公開保存画面とは別に管理しております。</dd></dl><p><a href="/collections/">収蔵目録</a></p><p><a href="/snapshots/">公開画面の保存</a></p>');
 if(path==='/collections/'){
 const keyword=ctx.query?.get('q')||'';const items=archiveItems.filter(i=>i.listed&&(!keyword||matchesSearch({title:i.title,text:i.code+' '+i.year},keyword)));
 return legacyLayout('収蔵目録',`<form method="get" action="/collections/" class="record-form"><label for="collection-query">収蔵番号・資料名</label><div class="search-box"><input id="collection-query" name="q" value="${esc(keyword)}"><button type="submit">検索</button></div></form><p class="small">収蔵資料・公開対象${keyword?' ／ '+items.length+'件':''}</p><div class="legacy-catalog">${items.map(i=>`<a class="legacy-row" href="/collections/items/${i.id}/"><span>No.${i.id}</span><time>${i.year}</time><strong>${esc(i.title)}</strong><small>${i.code}</small></a>`).join('')||'<p>該当する資料はありません。</p>'}</div>`);
 }
 const item=archiveItems.find(i=>path===`/collections/items/${i.id}/`);
 if(item)return legacyLayout(item.title,`<div class="legacy-record-meta">収蔵番号 ${item.code} ／ ${item.year}年 ／ ${item.kind}</div><p>${esc(item.body)}</p><div class="legacy-transcription"><h2>収録内容</h2><p>${esc(item.text).replaceAll('\n','<br>')}</p></div><p class="small">${esc(item.next)}</p>${item.file?`<p><a href="/assets/archive/${item.file}" target="_blank" rel="noopener">${item.kind}の複写（PDF）<span class="sr-only">・別タブで開きます</span></a></p>`:''}<p><a href="/collections/">収蔵目録へ</a></p>`);
 if(path==='/snapshots/')return legacyLayout('公開画面の保存',`<ul class="snapshot-index"><li><a href="/snapshots/2009/">2009年11月20日取得 ／ 旧産業継続研究準備室</a></li><li><a href="/snapshots/2011/">2011年3月31日取得 ／ 設立準備記録</a></li><li><a href="/snapshots/2017/">2017年7月14日取得 ／ 保存事業案内</a></li></ul>`);
 const snapshot=path.match(/^\/snapshots\/(2009|2011|2017)\/$/);
 if(snapshot){
  const year=snapshot[1];const bodies={
   '2009':'<h2>産業継続研究準備室</h2><p>災害と資源途絶の後にも、生活基盤と技術を継続するための施設整備を検討しています。</p><h3>事業案の検討</h3><p>榊原恒一氏から、旧継舟計画の対象者区分を引き継がないことを条件とする回答がありました。既存案を凍結し、設備側の支援を中心とする新たな設立案を協議しています。</p><p>回答書：RG-2007-011</p>',
   '2011':'<h2>あすなろ施設・設立準備記録</h2><p>2010年6月15日、新法人を設立しました。旧事業の承継を行わず、支援を必要とする人に合わせた設備研究を進めます。</p><h3>公開終了について</h3><p>施設開設準備に伴い、本サイトの公開を終了します。旧計画の史料は外部保管し、研究は凍結を維持します。公開サイトへの再掲載は認められていません。</p>',
   '2017':`<h2>保存資料事業のご案内</h2><p>三田佳代が保存した旧基盤の部分複写を、アシタ記録技研が引き継ぎました。固定保存画面のほか、既存契約の資料照会業務を継続します。</p><p>管理資料 AH-2017-009</p><h3>併せて保存した施設の公開記録</h3><ul>${snapshotNewsIds.map(id=>`<li>${linked('/snapshots/2017/news/'+id+'/',news.find(n=>n.id===id).date+'　'+news.find(n=>n.id===id).title)}</li>`).join('')}</ul>`,
  };
  return legacyLayout(`${year}年の公開保存画面`,`<p class="snapshot-stamp">取得記録：${year}年 ／ 固定保存</p><article class="snapshot-page">${bodies[year]}</article><p><a href="/snapshots/">保存画面一覧</a></p>`);
 }
 const archivedNews=path.match(/^\/snapshots\/2017\/news\/(\d{8})\/$/);
 if(archivedNews&&snapshotNewsIds.includes(archivedNews[1])){
 const n=news.find(n=>n.id===archivedNews[1]);
 return legacyLayout(n.title,`<p class="snapshot-stamp">保存日：2017年7月14日 ／ 原掲載日：${n.date}</p><article class="snapshot-page"><p>${esc(n.body)}</p>${n.id==='20120903'?'<img src="/assets/media/g-boat.webp" alt="開設記念の木製ボート">':''}${n.id==='20170714'?'<p>保存担当：三田佳代 ／ 保守移管：アシタ記録技研</p>':''}</article><p><a href="/snapshots/2017/">保存事業案内へ</a></p>`);
 }
 if(path.startsWith('/room/')){
  if(!session.archiveAccess)return legacyLogin(csrf);
  if(path==='/room/')return legacyLayout('移管・保守受領簿',`<p>閲覧票 ${esc(session.archiveAccess)} ／ 継続照会</p><div class="legacy-catalog">${archiveNotes.filter(n=>n.listed).map(noteRow).join('')}</div><form action="/room/logout/" method="post"><input type="hidden" name="csrf" value="${esc(csrf)}"><button class="legacy-logout" type="submit">照会室を終了</button></form>`,{privateRoom:true});
  const note=archiveNotes.find(n=>path===`/room/records/${n.id}/`);
  if(note)return legacyLayout(note.title,`<div class="legacy-record-meta">受領簿 No.${note.id} ／ ${note.date} ／ ${esc(note.by)}${note.updated?'<br>最終更新：'+note.updated:''}</div><p class="legacy-memo">${esc(note.body)}</p><p><a href="/room/">受領簿へ</a></p>`,{privateRoom:true});
 }
 return null;
}
