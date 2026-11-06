import {generalUsePaused,inquiryClosed} from './evidence.mjs';
import {mediaForRecord,recordMediaPrefix} from './record-media.mjs';
import {fictionFooter,decoratePage} from './experience.mjs';
import {projects} from './world/projects.mjs';
import {humanPages} from './world/people.mjs';
import {labThanks,labAssessment} from './lab.mjs';
import {firstReservationDate,lastReservationDate,reservationSpaces,reservationHours,reservationHoursHint} from '../public/assets/reservation-policy.js';
import {normalizeDocumentId,documentLookupMessages} from './search.mjs';
import {documents,facility,accounts} from './content.mjs';
import {esc,brand,arrow} from './render.mjs';

function fieldToken(csrf){return `<input type="hidden" name="csrf" value="${esc(csrf)}">`;}
function documentLookup(value='',id='document-id'){
 return `<form method="get" action="/members/records/" class="record-form"><label for="${id}">文書ID</label><div class="search-box"><input id="${id}" name="document_id" value="${esc(value)}" autocomplete="off" maxlength="60" required><button type="submit">照会</button></div></form>`;
}
const assignedNotices = {
 minamo:[
  {
   date:'2016.10.03', desk:'共同研究事務局', title:'第2期の実施計画をお送りします',
   body:'ミナモ循環技研 川瀬様\n\n本日開始の第2期実施計画を配布いたします。循環設備の現地確認に入られる際は、実施区画と受付の扱いをご確認ください。',
   record:'YH-2016-032',
  },
  {
   date:'2016.03.22', desk:'共同研究事務局', title:'循環設備の検収資料について',
   body:'ミナモ循環技研 川瀬様\n\n流路を確認した際の基礎仕様書をお送りします。実機の寸法は、別途お渡しする検収表でご確認ください。次期の実施計画と納入日程は、確定後に改めてご案内いたします。',
   record:'YH-2013-014',
  },
 ],
 ashita:[
  {
   date:'2017.07.14', desk:'資料保存担当', title:'移管作業票の受領について',
   body:'旧基盤の引継ぎに関する作業票を収録しました。閲覧票の控えと保存範囲を併せて確認いたします。',
   record:'AH-2017-009',
  },
 ],
};
function assignedNoticeList(role){
 return (assignedNotices[role] || []).map(notice => {
  const record = documents.find(document => document.id === notice.record && document.roles.includes(role));
  if (!record) throw new Error(`Assigned notice ${notice.record} is not readable by ${role}`);
  return `<article class="message">
   <time>${notice.date} / ${esc(notice.desk)}</time><h2>${esc(notice.title)}</h2>
   <div class="message-body">${esc(notice.body)}</div>
   <p><a class="text-link" data-assigned-record="${record.id}" href="/members/records/${record.id}/">${record.id}　${esc(record.title)}</a></p>
  </article>`;
 }).join('');
}
function memberHome(account,paused){
 const workshopNote = account.role==='minamo' ? `<section class="member-workshop-note" aria-labelledby="workshop-note-title">
  <p class="eyebrow"><time datetime="2022-07-08">2022.07.08</time> ／ 工房からの共有（保存分）</p>
  <h2 id="workshop-note-title">瀬尾さんの、次の試作</h2>
  <p>鉛筆のグリップを作った瀬尾灯さんの取材が掲載されました。次の試作は、本を開いたままにしておける道具です。机でずれないよう、底に使う材料を川瀬さんにご相談しています。</p>
  <a class="text-link" href="/members/projects/fabrication/">工房でのやり取りを読む</a>
 </section>` : '';
 const lastLink = account.role==='asakura'
  ? '<a href="/members/personal/">個人保存資料 <small>非共有の研究記録</small></a>'
  : '<a href="/members/organization/">運営団体情報 <small>事業主体・法人情報</small></a>';
 return `<h1>会員トップ</h1>${workshopNote}
  <div class="notice"><h2>施設からのお知らせ</h2><p>${paused?'施設の一般利用を休止しております。会議室・工房の新規利用申請はお受けしておりません。':'会議室・工房の利用申請は、利用日の前営業日までにお手続きをお願いいたします。'}</p>${paused?'<a class="text-link" href="/news/closure/">施設のお知らせ</a>':''}</div>
  <div class="member-summary">
   <a href="/members/reservations/">利用申請・予約 <small>${paused?'受付休止中':'会議室・工房など'}</small></a>
   <a href="/members/messages/">施設からの連絡 <small>配布文書・事務連絡</small></a>
   <a href="/members/projects/">共同事業・連絡記録 <small>事業ごとの打ち合わせ・資料の受け渡し</small></a>
   <a href="/members/records/">研究資料照会 <small>共同事業に関する登録資料</small></a>
   ${lastLink}
  </div>`;
}
function originalInquiryReply({caseId,origins,caseState}){
 const {ending}=caseState;
 const answer=`<div class="message-body">このアカウントを現在利用されている方へ。

原本の照会を受け取りました。B-07に今も灯さんがいます。型紙を取りに行くたび、道具と一緒に帰るのだと書かれた紙を渡されます。

こちらでは外部への通信が止められています。施設サイトと旧資料の更新だけが残っています。廃止前のページへ参照を戻したのは私です。今度の引渡しで、この更新権限も失います。

保全した原本をまとめました。手を加えず、ZIP全体を資料保全受付へお渡しください。申出者の情報は同梱の書面にあります。提出後に発行される受付番号は、お手元に控えておいてください。</div>
  <p data-inquiry-record="CH-2021-003" hidden>最後の手控えにあった、事業を止めてもいいという行も読みました。原文のまま残しています。</p>
  <p data-inquiry-record="FAB-2026-018" hidden>B-07の交換票から照会されたのですね。部品を届ける時に受け取った本人の紙も、原本に含めました。</p>
  <a class="download-card" href="/members/download/hozen.zip"><strong>保全資料_20261102.zip ↓</strong><small>申出書・実験記録・継承資料</small></a>`;
 const submitLink=`<div class="submission-links"><a class="text-link" href="${esc(origins.hozen)}/receive/?case=${esc(caseId)}">資料保全・匿名通報受付</a></div>`;
 const receivedLink=`<p><a class="text-link" href="${esc(origins.hozen)}/received/?case=${esc(caseId)}">資料保全センターの受付控え</a></p>`;
 return `<article class="message" data-inquiry-reply><time datetime="2026-11-02">2026.11.02</time> <span class="member-meta">／ 工房保全担当</span>
  <h2>原本照会への回答${ending?'（保存分）':''}</h2>
  ${ending?`<details class="message-copy"><summary>11月2日付の回答を表示</summary>${answer}</details>`:answer+submitLink}
  ${ending==='end1'?receivedLink:''}
 </article>`;
}
export function memberLayout(title,body,{account=null,csrf='',active='',caseId='',record=null,caseState={}}={}){
 const items=[['/members/','会員トップ','home'],['/members/reservations/','利用申請・予約','reservations'],['/members/records/','研究資料照会','records'],['/members/activity/','資料の閲覧履歴','activity'],['/members/messages/','施設からの連絡','messages','配布文書'],['/members/projects/','共同事業・連絡記録','projects','打ち合わせ'],['/members/organization/','運営団体情報','organization'],['/members/contact/','運営事務局へのお問い合わせ','contact']];
 if(account?.role==='asakura')items.splice(4,0,['/members/personal/','個人保存資料','personal']);
 const menuLinks=items.map(([url,label,key,description])=>{
  const a11y=description?` aria-label="${label}" aria-describedby="member-nav-${key}"`:'';
  const title=description?`<span>${label}</span><small class="member-nav-description" id="member-nav-${key}">${description}</small>`:label;
  return `<a href="${url}" class="${key===active?'active':''}"${a11y}>${title}</a>`;
 }).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} | あすなろ会員サイト</title><link rel="icon" href="/assets/logo.png"><link rel="stylesheet" href="/styles.css"><script type="module" src="/member-reading.js"></script>${record?.id==='AS-2026-019'?'<script type="module" src="/lab-console.js"></script>':''}</head><body class="member-body"${account?` data-member-role="${esc(account.role)}" data-member-label="${esc(account.name)}" data-member-case="${esc(caseId)}" data-member-inquiry="${esc(caseState.inquiryRecord||'')}"`:""}${record?` data-member-record="${esc(record.id)}" data-member-record-title="${esc(record.title)}"`:""}><header class="member-header">${brand()}<span class="member-heading">会員サイト / MEMBER SERVICES</span></header>${account?`<div class="member-shell"><aside class="member-sidebar"><div class="account-box"><b>${esc(account.name)}</b><small>登録番号 ${esc(account.member)}</small></div><nav aria-label="会員メニュー">${menuLinks}</nav><form method="post" action="/members/logout/" class="logout-form">${fieldToken(csrf)}<button type="submit">ログアウト</button></form></aside><main class="member-main"><p class="eyebrow">MEMBER SERVICES</p>${body}</main></div>`:`<main>${body}</main>`}<footer class="member-footer">© ASUNARO INDUSTRY & EXCHANGE　<a href="/">施設サイトへ</a></footer>${fictionFooter()}</body></html>`;
}

export function loginPage(csrf,{error='',next='/members/'}={}){return decoratePage(memberLayout('ログイン',`<section class="login-panel"><p class="eyebrow">MEMBER LOGIN</p><h1>会員サイト</h1>${error?`<p class="form-error" role="alert">${esc(error)}</p>`:''}<form method="post" action="/members/login/" class="form-stack">${fieldToken(csrf)}<input type="hidden" name="next" value="${esc(next)}"><label for="member-id">会員ID</label><input id="member-id" name="id" inputmode="text" autocomplete="username" required maxlength="40"><label for="member-password">パスワード</label><input id="member-password" name="password" type="password" autocomplete="current-password" required maxlength="100"><button type="submit" class="button dark">ログイン <span>→</span></button></form><p class="member-note">登録済みの会員の方にご利用いただけます。</p></section>`,{csrf}),{kind:'main',path:'/members/login/'});}

function renderDocument(d,ctx){
 const section=(items,prefix)=>items.map(([title,text],i)=>`<section class="document-section" id="${prefix}-${i+1}"><h2>${esc(title)}</h2><p>${esc(text).replace(/\n/g,'<br>')}</p></section>`).join('');
 const originals=section(d.sections||[],'document-section');
 const tables=(d.tables||[]).map((table,i)=>`<div class="record-table table-scroll" id="record-table-${i+1}" role="region" aria-label="${esc(table.caption)}" tabindex="0"${table.head[0]==='日付'?' data-date-column':''}><table><caption>${esc(table.caption)}${table.date?`<small>　${esc(table.date)}現在</small>`:""}</caption><thead><tr>${table.head.map(value=>`<th scope="col">${esc(value)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
 const entries=d.entries?.length?`<ol class="record-entries" id="record-entries">${d.entries.map(entry=>`<li><header><time>${esc(entry.at)}</time><span>${esc(entry.by||'')}</span></header><p>${esc(entry.text).replace(/\n/g,'<br>')}</p></li>`).join('')}</ol>`:'';
 const addenda=(d.addenda||[]).map((note,i)=>`<section class="record-addendum" id="record-addendum-${i+1}"><header><time>追記　${esc(note.date)}</time><span>${esc(note.by)}</span></header>${section(note.sections||[],`addendum-${i+1}`)}</section>`).join('');
 const outline=[...(d.sections||[]).map(([title],i)=>[title,'document-section-'+(i+1)]),...(d.tables||[]).map((table,i)=>[table.caption,'record-table-'+(i+1)]),...(d.entries?.length?[['日付順の記録','record-entries']]:[]),...(d.addenda||[]).map((note,i)=>[note.date+'／'+note.by,'record-addendum-'+(i+1)])];
 const contents=outline.length>=4?`<details class="record-outline"><summary>文書内の項目</summary><nav class="document-contents" aria-label="文書内の項目">${outline.map(([title,id])=>`<a href="#${id}">${esc(title)}</a>`).join('')}</nav></details>`:'';
 const editions=mediaForRecord(d.id);const recordFiles=editions.length?`<div class="record-media" aria-label="添付資料">${editions.map(file=>`<a href="${recordMediaPrefix}${file.filename}">${esc(file.label)} <span aria-hidden="true">↓</span></a>`).join('')}<p data-record-media-message role="status"></p></div>`:'';
 const links=(d.links||[]).map(l=>`<p><a class="text-link" href="${esc((l.origin?ctx.origins[l.origin]:'')+l.path)}" target="_blank" rel="noopener">${esc(l.text)}<span class="sr-only">（別タブで開きます）</span></a></p>`).join('');
 return memberLayout(d.title,`<article class="research-document"><p class="record-kind">${esc(d.kindLabel||'登録資料')}</p><h1 class="document-title">${esc(d.title)}</h1><div class="member-meta">文書ID：${d.id}<br>作成日：${d.date}${d.updated?`<br>最終更新：${esc(d.updated)}`:''}<br>管理：${esc(d.owner)}</div>${recordFiles}${ctx.account.role==='institution'&&ctx.caseState.ending!=='end3'?'<p class="reading-status" data-after-reading="CH-2021-003 OPS-2026-084" hidden><a href="/members/activity/">照会名義に関する確認が届いています。</a></p>':''}${contents}${originals}${tables}${entries}${d.signoff?`<p class="record-signoff">${esc(d.signoff)}</p>`:''}${addenda}${d.quote?`<blockquote class="document-citation">${esc(d.quote)}</blockquote>`:''}${(d.attachments||[]).map(file=>`<a class="download-card" href="${esc(file.path)}"><strong>${esc(file.name)} ↓</strong><small>${esc(file.description)}</small></a>`).join('')}${d.readingLedger?`<section class="reading-comparison"><h2>${esc(d.readingLedger.heading)}</h2><p>${esc(d.readingLedger.text)}</p><p class="member-meta" data-reading-reference></p><div data-reading-ledger="combined"></div></section>`:""}${d.id==='AS-2026-019'?labAssessment(ctx.caseState.consoleTrial,ctx.caseState.ending):''}${links?`<div class="document-links">${links}</div>`:''}${d.inquiry?`<p><a class="text-link" href="/members/inquiry/?record=${d.id}">記録についての照会</a></p>`:''}${d.audit?`<p><a class="text-link" href="${esc(ctx.origins.audit)}/receive/?case=${ctx.caseId}">東都研究監査室・記録保全受付</a></p>`:''}</article><section class="record-lookup" aria-labelledby="lookup-heading"><h2 id="lookup-heading">研究資料照会</h2>${documentLookup('','next-document-id')}</section>`,{...ctx,active:'records',record:d});
}

function renderMemberPage(path,ctx){
 const {account,csrf,caseState,query,origins,caseId}=ctx;
 if(path==='/members/')return memberLayout('会員トップ',memberHome(account,generalUsePaused(caseState.ending)),{...ctx,active:'home'});
 if(path==='/members/activity/')return memberLayout('資料の閲覧履歴',`<h1>資料の閲覧履歴</h1><p>この照会端末で表示した資料です。登録名義ごとに表示しております。</p>${caseState.ending==='end3'?'<div class="notice"><h2>本件の確認は終了しております。</h2><p>移送先を含む事業の停止に伴い、外部協力者への継続照会も終了しました。照会資料の控えは引き続き参照いただけます。</p></div>':''}<div data-reading-ledger="current"></div>${account.role==='institution'&&caseState.ending!=='end3'?'<section class="reading-notification" data-after-reading="CH-2021-003 OPS-2026-084" hidden><p class="member-meta">2026.11.02／運営事務局</p><h2>照会名義の確認</h2><p>同一照会端末から、配布先の異なる資料への参照を確認しております。個々の登録における照会を、一件の確認として取りまとめます。</p><p>確認中のため、本件の終了処理は保留しております。原本の受領担当へ照会を引き継ぎます。</p><p class="member-meta" data-reading-reference></p></section>':''}`,{...ctx,active:'activity'});
 if(path==='/members/projects/')return memberLayout('共同事業・連絡記録',`<h1>共同事業・連絡記録</h1><p>参加事業の打ち合わせと、資料の受け渡しに関する記録です。</p><div class="project-list">${projects.filter(p=>p.roles.includes(account.role)).map(p=>`<a href="/members/projects/${p.slug}/"><small>${p.period}</small><h2>${esc(p.title)}</h2><p>${esc(p.members)}</p></a>`).join('')||'<p class="empty-state">参照できる共同事業はありません。</p>'}</div>`,{...ctx,active:'projects'});
 const project=projects.find(p=>path===`/members/projects/${p.slug}/`&&p.roles.includes(account.role));
 if(project){
  const posts=project.posts.map(([date,by,text,interview])=>{
   const reference=interview?`<p class="project-reference"><a class="text-link" href="${esc(interview)}" target="_blank" rel="noopener">${esc(humanPages[interview].title)}<span class="sr-only">（別タブで開きます）</span></a></p>`:'';
   return `<article class="project-post"><header><b>${esc(by)}</b><time>${date}</time></header><p>${esc(text)}</p>${reference}</article>`;
  }).join('');
  return memberLayout(project.title,`<h1>${esc(project.title)}</h1><p class="member-meta">${esc(project.members)}<br>記録期間：${project.period}</p><div class="project-thread">${posts}</div>${(project.links||[]).map(l=>`<p><a class="text-link" href="${esc(origins[l.origin]+l.path)}" target="_blank" rel="noopener">${esc(l.text)}</a></p>`).join('')}<nav class="button-row" aria-label="共同事業の関連ページ"><a class="text-link" href="/members/projects/">共同事業一覧へ</a><a class="text-link" href="/members/records/">研究資料照会</a></nav>`,{...ctx,active:'projects'});
 }
 if(path==='/members/organization/')return memberLayout('運営団体情報',`<h1>運営団体情報</h1><dl class="detail-list"><div><dt>法人名</dt><dd>${facility.foundation}</dd></div><div><dt>法人設立</dt><dd>2010年6月15日</dd></div><div><dt>施設開設</dt><dd>2012年4月1日</dd></div><div><dt>代表者</dt><dd>深町 玲司</dd></div></dl><h2>事業</h2><p>産業支援、交流施設の運営、共同研究および実証事業の企画・管理。</p>`,{...ctx,active:'organization'});
 if(path==='/members/records/'){
  const id = normalizeDocumentId(query.get('document_id') || '');
  const found = documents.find(document => document.id === id);
  let result = '';
  if (found?.roles.includes(account.role)) {
   result = `<p class="result-count">検索結果　1件</p><a class="document-result" href="/members/records/${found.id}/"><small>${found.id}　${found.date}</small><h2>${esc(found.title)}</h2><small>${esc(found.owner)}</small></a>`;
  } else if (id) {
   result = `<p class="empty-state">${found ? documentLookupMessages.restricted : documentLookupMessages.missing}</p>`;
  }
  return memberLayout('研究資料照会',`<h1>研究資料照会</h1><p class="member-note">配布元から案内された文書IDで照会できます。</p>${documentLookup(id)}${result}`,{...ctx,active:'records'});
 }
 const docMatch=path.match(/^\/members\/records\/([A-Z0-9-]+)\/$/);
 if(docMatch){const d=documents.find(d=>d.id===docMatch[1]&&d.roles.includes(account.role));return d?renderDocument(d,ctx):null;}
 if(path==='/members/messages/'){
  const assigned=assignedNoticeList(account.role);
  const privateMessage=account.role==='institution'&&caseState.contact?originalInquiryReply(ctx):'';
  const pausedNotice=generalUsePaused(caseState.ending)?'<article class="message"><time datetime="2026-11-06">2026.11.06</time> <span class="member-meta">／ 運営事務局</span><h2>一般利用の受付休止</h2><p>会議室・工房の新規利用申請の受付を休止しております。</p><p><a class="text-link" href="/news/closure/">施設のお知らせ</a></p></article>':'';
  const changed=caseState.ending==='end2'?'<article class="message"><time>2026.11.06 / 運営事務局</time><h2>担当者の変更</h2><p>工房保全担当への照会は事務局へ移管いたしました。旧担当者の個人登録は終了しました。</p></article>':'';
  return memberLayout('施設からの連絡',`<h1>施設からの連絡</h1>${changed}${pausedNotice}${privateMessage}<article class="message"><time datetime="2026-10-01">2026.10.01 / 運営事務局</time><h2>4階共用部の自動扉点検について</h2><p>10月19日（月）の9時から11時まで、4階共用部の自動扉を順次点検いたします。作業中は職員が通行をご案内いたします。会議室とラウンジは通常どおりご利用いただけます。</p></article>${assigned}`,{...ctx,active:'messages'});
 }
 if(path==='/members/inquiry/'){
  if(inquiryClosed(caseState.ending)){
   const reason=caseState.ending==='end2'?'本件の記録は運営事務局へ移管されました。':'施設の一般利用休止に伴い、新規の照会を停止しております。';
   return memberLayout('記録についての照会',`<h1>記録についての照会</h1><p>この窓口での受付は終了しました。${reason}</p><p><a class="text-link" href="/members/messages/">施設からの連絡</a></p>`,{...ctx,active:'records'});
  }
  const id=query.get('record')||'';const d=documents.find(d=>d.id===id&&d.roles.includes(account.role));
  return memberLayout('記録についての照会',`<h1>記録についての照会</h1>${ctx.error?`<p class="form-error">${esc(ctx.error)}</p>`:''}<form class="form-stack" method="post">${fieldToken(csrf)}<label for="record">文書ID</label><input id="record" name="record" value="${esc(d?.id||'')}" required><label for="request">照会内容</label><select id="request" name="request"><option>原本確認</option><option>記載内容の確認</option><option>添付資料の確認</option></select><label for="note">備考</label><textarea id="note" name="note" maxlength="3000"></textarea><button class="button dark" type="submit">照会を送信 <span>→</span></button></form>`,{...ctx,active:'records'});
 }
 if(path==='/members/reservations/'){
  if(generalUsePaused(caseState.ending))return memberLayout('利用申請・予約','<h1>利用申請・予約</h1><div class="notice"><h2>受付を休止しております。</h2><p>施設の一般利用休止に伴い、新規の利用申請を停止しております。</p></div>',{...ctx,active:'reservations'});
  const draft = ctx.reservationDraft || {};
  const requested = draft.space || query.get('space');
  const space = reservationSpaces.some(([id])=>id===requested) ? requested : reservationSpaces[0][0];
  const {start,lastStart} = reservationHours(space,draft.date);
  const options = reservationSpaces.map(([id,name])=>`<option value="${id}"${space===id?' selected':''}>${name}</option>`).join('');
  return memberLayout('利用申請・予約',`<h1>利用申請・予約</h1>${query.get('received')?'<div class="form-success">利用申請を受け付けました。内容を確認のうえ、施設からの連絡にて回答いたします。</div>':''}
   <form class="form-stack" method="post" data-reservation-form>
    ${fieldToken(csrf)}
    <p class="form-error" role="alert" data-reservation-error${ctx.error?'':' hidden'}>${esc(ctx.error||'')}</p>
    <label for="space">施設</label><select id="space" name="space">${options}</select>
    <label for="date">利用日</label><input id="date" name="date" type="date" min="${firstReservationDate}" max="${lastReservationDate}" value="${esc(draft.date)}" aria-describedby="reservation-date-range" required>
    <p class="member-note" id="reservation-date-range">${lastReservationDate.slice(0,4)}年末までのご利用を受け付けております。</p>
    <label for="time">開始時刻</label><input id="time" name="time" type="time" min="${start}"${lastStart?` max="${lastStart}"`:''} value="${esc(draft.time)}" aria-describedby="reservation-hours" required>
    <p class="member-note" id="reservation-hours" data-reservation-hours aria-live="polite">${reservationHoursHint(space,draft.date)}</p>
    <label for="purpose">利用内容</label><textarea id="purpose" name="purpose" maxlength="2000" required>${esc(draft.purpose)}</textarea>
    <button class="button dark">申請する <span>→</span></button>
   </form>`,{...ctx,active:'reservations'});
 }
 if(path==='/members/contact/')return memberLayout('運営事務局へのお問い合わせ',`<h1>運営事務局へのお問い合わせ</h1><p>施設利用や運営に関するご連絡を承ります。必要に応じて資料を添付してください。</p>${ctx.error?`<p class="form-error">${esc(ctx.error)}</p>`:''}<form class="form-stack" method="post" enctype="multipart/form-data">${fieldToken(csrf)}<label for="subject">件名</label><input id="subject" name="subject" maxlength="150" required><label for="message">内容</label><textarea id="message" name="message" maxlength="5000" required></textarea><label for="attachment">添付資料</label><input id="attachment" name="attachment" type="file" accept=".zip,.pdf"><button class="button dark">送信する <span>→</span></button></form>`,{...ctx,active:'contact'});
 if(path==='/members/contact/received/')return memberLayout('受付完了',`<h1>お問い合わせを受け付けました。</h1><p>担当部署にて確認いたします。</p><div class="member-meta">受付番号：AD-2026-1102</div><p><a class="text-link" href="/members/messages/">施設からの連絡 </a></p><p><a class="text-link" href="/">施設サイトへ </a></p>`,{...ctx,active:'contact'});
 if(path==='/members/personal/'&&account.role==='asakura')return memberLayout('個人保存資料',`<h1>個人保存資料</h1><p class="small muted">朝倉 紬乃 / 非共有</p><div class="archive-list">${['AS-2024-002','AS-2023-008'].map(id=>documents.find(d=>d.id===id)).map(d=>`<a href="/members/records/${d.id}/"><h2>${esc(d.title)}</h2><small>${d.id} / ${d.date}</small></a>`).join('')}</div>`,{...ctx,active:'personal'});
 return null;
}

const continuityUpdates=`
 <section>
  <time datetime="2026-11-06">2026.11.06</time><h2>関係施設の利用休止について</h2>
  <p>あすなろ産業支援交流施設は、調査のため一般利用を休止しました。当センターは、対象者の所在と支援の引継ぎについて施設運営事務局へ照会しております。</p>
  <p>受領した技術記録を将来に継承するため、新たな研究支援事業の準備を進めています。</p>
 </section>`;

const independentUpdates=`
 <section>
  <time datetime="2026-11-06">2026.11.06</time><h2>一般利用の休止と所在確認</h2>
  <p>あすなろ産業支援交流施設は一般利用を休止しました。当室の担当者が地下1階に入り、当直引継ぎに記載された3区画でご本人を確認しました。</p>
  <p><span class="case-ref">P-034</span>・瀬尾灯さんを<span class="case-ref">B1・B-07</span>で確認しました。瀬尾さんは自宅に戻ることを希望し、同日、施設を出ました。<span class="case-ref">B1・B-06</span>の青井真澄さんと、<span class="case-ref">B1・B-04</span>で所在を確認した方にも、それぞれ今後の行き先を伺い、施設外で保護しました。</p>
 </section>
 <section>
  <time datetime="2026-11-12">2026.11.12</time><h2>引渡しの停止と原本の保全</h2>
  <p>災害技術記録保全センターへの引渡しと、原型継承試験の実施手続きを停止しました。引渡し一覧にあった装置図面と評価モデルは、当室で調査資料として保全しています。</p>
  <p>募集時の説明票と日次検査の薬剤記録、9月11日の死亡事案と救護要請を照合しています。三枝律氏が送れなかった申出についても原本を保全し、ご遺族への説明を進めています。当直記録にある<span class="case-ref">P-032</span>の所在は、引き続き照会しています。</p>
  <p>工房で預かっていた吉野夏帆さんの青い布表紙の地図帳は、別包みのまま受領しました。ご家族に返却先を確認しております。</p>
 </section>
 <section>
  <time datetime="2026-11-20">2026.11.20</time><h2>ご本人からの連絡</h2>
  <p>ご本人のご了承を得て、返却資料の受領連絡を掲載します。</p>
  <blockquote>
   <p>道具と、母の料理帳の写しを返していただきました。家に帰って最初にしたのは、母とお昼ご飯を作ることでした。料理帳を開く前に、母が「まず一緒に食べよう」と言いました。</p>
   <p>三枝さんの紙袋に、途中の型紙が入っていました。完成を見せることはできません。でも、いつも空けてくれていた机の場所を、覚えています。</p>
   <p>本の道具は、まだ途中です。今度は、母と確かめながら続きを作ります。</p>
   <footer>瀬尾 灯</footer>
  </blockquote>
 </section>`;

function agencyPageContent(kind,path,{caseId='',error='',receipt='',additional=false,consoleTrial=null,origins}){
 const audit=kind==='audit',name=audit?'東都研究監査室':'災害技術記録保全センター',base=audit?origins.audit:origins.hozen;
 let content='';
 const receiptNumber=`<div class="receipt-number">受付番号：${audit?'EA':'DR'}-2026-1102</div>`;
 if(receipt==='loading')content='<p role="status">受付情報を確認しています。</p>';
 else if(receipt==='pending'||receipt==='transferred'){
  content=`<p class="eyebrow">RECEIPT</p><h1>資料を受領しました。</h1>${receiptNumber}<p>${receipt==='transferred'?'当室でお預かりした資料の受付控えです。':'対象者の所在と、施設内の事業について確認を進めます。現時点では、外部への移送指示と、その対象となる原本を照合できていません。'}</p>
   <div class="agency-additional">${receipt==='transferred'
    ?'<h2>追加受付は終了しました</h2><p>この照会に関する記録は、施設運営側の管理へ移管されました。</p>'
    :`<h2>追加資料の受け付け</h2><p>移送先、原本の採否、事業の承継に関する記録がございましたら、同じ受付番号へご提出ください。</p><a class="text-link" href="${esc(base)}/receive/?case=${esc(caseId)}">追加資料を提出する</a>`}</div>`;
 }
 else if(receipt==='received')content=`<p class="eyebrow">RECEIPT</p><h1>資料を受領しました。</h1>
  <p>${audit?'ご提出いただいた原本を保全しました。受領後に確認できた事項を、日付順に掲載します。':'ご提出いただいた資料を保全し、関係先への照会と事実確認を進めます。'}</p>${receiptNumber}
  <div class="agency-news"><p class="eyebrow">受領後の経過</p>${audit?independentUpdates:continuityUpdates}</div>
  ${audit?labThanks(consoleTrial):''}<p><a class="text-link" href="${esc(origins.main)}/news/closure/">施設のお知らせ</a></p>`;
 else content=`<p class="eyebrow">${audit?'INDEPENDENT REVIEW':'RECORDS & CONTINUITY'}</p><h1>${audit?'記録保全受付':'資料保全・匿名通報受付'}</h1><p>${audit?'研究事業に関する記録の提供を受け付けています。現運営から独立した立場で、原本と資料の移送先を含めて確認します。':'研究や施設運営に関する資料の提供を受け付けています。お名前の記入は任意です。'}</p>${additional?receiptNumber+'<p>以下の資料をこの受付番号に追加します。</p>':''}${error?`<p class="form-error">${esc(error)}</p>`:''}<form class="form-stack" method="post" action="/receive/" enctype="multipart/form-data"><input type="hidden" name="case" value="${esc(caseId)}"><label for="title">件名</label><input id="title" name="title" required maxlength="150"><label for="statement">内容</label><textarea id="statement" name="statement" required maxlength="5000"></textarea><label for="archive">資料</label><input type="file" id="archive" name="archive" accept=".zip" required><label for="sender">お名前（任意）</label><input id="sender" name="sender" maxlength="100" value="${audit&&consoleTrial?.completedAt?esc(consoleTrial.handle):''}"><button class="button" type="submit">資料を提出する <span>→</span></button></form>`;
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${name} | 記録保全受付</title><link rel="stylesheet" href="/styles.css">${audit&&receipt==='received'?'<script type="module" src="/lab-console.js"></script>':''}</head><body class="agency-body"><header class="agency-header"><a href="${base}/?case=${esc(caseId)}">${name}</a><span>${audit?'INDEPENDENT RESEARCH REVIEW':'DISASTER TECHNOLOGY RECORDS'}</span></header><main class="agency-main">${content}</main><footer class="agency-footer"><p>${audit?'調査担当：倉橋 真紀乃':'一般社団法人 災害技術記録保全センター／代表理事 榎本 航策'}</p><p>© ${audit?'TOTO RESEARCH REVIEW':'DISASTER TECHNOLOGY RECORDS CENTER'}</p></footer>${fictionFooter()}</body></html>`;
}

export function renderMember(path,ctx){return decoratePage(renderMemberPage(path,ctx),{kind:'main',path,role:ctx.account?.role});}
export function agencyPage(kind,path,ctx){return decoratePage(agencyPageContent(kind,path,ctx),{kind,path});}
