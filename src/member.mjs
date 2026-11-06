import {mediaForRecord,recordMediaPrefix} from './record-media.mjs';
import {fictionFooter,decoratePage} from './experience.mjs';
import {projects} from './world/projects.mjs';
import {labThanks,labAssessment} from './lab.mjs';
import {reservationSpaces} from './world/editorial.mjs';
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
   date:'2016.03.22', desk:'共同研究事務局', title:'循環設備・改訂寸法の確定について',
   body:'ミナモ循環技研 川瀬様\n\n浄水筐体の改訂図は、添付仕様で確定いたしました。次期の実施計画は確定後に別便でお送りいたします。納入時期につきましては、別途日程表をお送りいたします。',
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
function memberHome(account){
 const workshopNote = account.role==='minamo' ? `<section class="member-workshop-note" aria-labelledby="workshop-note-title">
  <p class="eyebrow"><time datetime="2022-07-08">2022.07.08</time> ／ 工房からの共有</p>
  <h2 id="workshop-note-title">瀬尾さんの、次の試作</h2>
  <p>鉛筆の持ち手を作った瀬尾灯さんが、今度は本を片手で開いておける道具を試すそうです。お母さまに家で一週間使ってもらい、来月、工房で見せていただくことになりました。</p>
  <a class="text-link" href="/members/projects/fabrication/">工房でのやり取りを読む</a>
 </section>` : '';
 const lastLink = account.role==='asakura'
  ? '<a href="/members/personal/">個人保存資料 <small>非共有の研究記録</small></a>'
  : '<a href="/members/organization/">運営団体情報 <small>事業主体・法人情報</small></a>';
 return `<h1>会員トップ</h1>${workshopNote}
  <div class="notice"><h2>施設からのお知らせ</h2><p>会議室・工房の利用申請は、利用日の前営業日までにお手続きをお願いいたします。</p></div>
  <div class="member-summary">
   <a href="/members/reservations/">利用申請・予約 <small>会議室・工房など</small></a>
   <a href="/members/messages/">施設からの連絡 <small>共同事業・事務連絡</small></a>
   <a href="/members/projects/">共同事業・連絡記録 <small>打ち合わせ・資料の受け渡し</small></a>
   <a href="/members/records/">研究資料照会 <small>共同事業に関する登録資料</small></a>
   ${lastLink}
  </div>`;
}
export function memberLayout(title,body,{account=null,csrf='',active='',caseId='',record=null,caseState={}}={}){
 const items=[['/members/','会員トップ','home'],['/members/reservations/','利用申請・予約','reservations'],['/members/records/','研究資料照会','records'],['/members/activity/','資料の閲覧履歴','activity'],['/members/messages/','施設からの連絡','messages'],['/members/projects/','共同事業・連絡記録','projects'],['/members/organization/','運営団体情報','organization'],['/members/contact/','運営事務局へのお問い合わせ','contact']];
 if(account?.role==='asakura')items.splice(4,0,['/members/personal/','個人保存資料','personal']);
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} | あすなろ会員サイト</title><link rel="icon" href="/assets/logo.png"><link rel="stylesheet" href="/styles.css"><script type="module" src="/member-reading.js"></script>${record?.id==='AS-2026-019'?'<script type="module" src="/lab-console.js"></script>':''}</head><body class="member-body"${account?` data-member-role="${esc(account.role)}" data-member-label="${esc(account.name)}" data-member-case="${esc(caseId)}" data-member-inquiry="${esc(caseState.inquiryRecord||'')}"`:""}${record?` data-member-record="${esc(record.id)}" data-member-record-title="${esc(record.title)}"`:""}><header class="member-header">${brand()}<span class="member-heading">会員サイト / MEMBER SERVICES</span></header>${account?`<div class="member-shell"><aside class="member-sidebar"><div class="account-box"><b>${esc(account.name)}</b><small>登録番号 ${esc(account.member)}</small></div><nav aria-label="会員メニュー">${items.map(([url,label,key])=>`<a href="${url}" class="${key===active?'active':''}">${label}</a>`).join('')}</nav><form method="post" action="/members/logout/" class="logout-form">${fieldToken(csrf)}<button type="submit">ログアウト</button></form></aside><main class="member-main"><p class="eyebrow">MEMBER SERVICES</p>${body}</main></div>`:`<main>${body}</main>`}<footer class="member-footer">© ASUNARO INDUSTRY & EXCHANGE　<a href="/">施設サイトへ</a></footer>${fictionFooter()}</body></html>`;
}

export function loginPage(csrf,{error='',next='/members/'}={}){return decoratePage(memberLayout('ログイン',`<section class="login-panel"><p class="eyebrow">MEMBER LOGIN</p><h1>会員サイト</h1>${error?`<p class="form-error" role="alert">${esc(error)}</p>`:''}<form method="post" action="/members/login/" class="form-stack">${fieldToken(csrf)}<input type="hidden" name="next" value="${esc(next)}"><label for="member-id">会員ID</label><input id="member-id" name="id" inputmode="text" autocomplete="username" required maxlength="40"><label for="member-password">パスワード</label><input id="member-password" name="password" type="password" autocomplete="current-password" required maxlength="100"><button type="submit" class="button dark">ログイン <span>→</span></button></form><p class="member-note">登録済みの会員の方にご利用いただけます。</p></section>`,{csrf}),{kind:'main',path:'/members/login/'});}

function renderDocument(d,ctx){
 const section=(items,prefix)=>items.map(([title,text],i)=>`<section class="document-section" id="${prefix}-${i+1}"><h2>${esc(title)}</h2><p>${esc(text).replace(/\n/g,'<br>')}</p></section>`).join('');
 const originals=section(d.sections||[],'document-section');
 const tables=(d.tables||[]).map((table,i)=>`<div class="record-table table-scroll" id="record-table-${i+1}" role="region" aria-label="${esc(table.caption)}" tabindex="0"><table><caption>${esc(table.caption)}${table.date?`<small>　${esc(table.date)}現在</small>`:""}</caption><thead><tr>${table.head.map(value=>`<th scope="col">${esc(value)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
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
 if(path==='/members/')return memberLayout('会員トップ',memberHome(account),{...ctx,active:'home'});
 if(path==='/members/activity/')return memberLayout('資料の閲覧履歴',`<h1>資料の閲覧履歴</h1><p>この照会端末で表示した資料です。登録名義ごとに表示しております。</p>${caseState.ending==='end3'?'<div class="notice"><h2>本件の確認は終了しております。</h2><p>移送先を含む事業の停止に伴い、外部協力者への継続照会も終了しました。照会資料の控えは引き続き参照いただけます。</p></div>':''}<div data-reading-ledger="current"></div>${account.role==='institution'&&caseState.ending!=='end3'?'<section class="reading-notification" data-after-reading="CH-2021-003 OPS-2026-084" hidden><p class="member-meta">2026.11.02／運営事務局</p><h2>照会名義の確認</h2><p>同一照会端末から、配布先の異なる資料への参照を確認しております。個々の登録における照会を、一件の確認として取りまとめます。</p><p>確認中のため、本件の終了処理は保留しております。原本の受領担当へ照会を引き継ぎます。</p><p class="member-meta" data-reading-reference></p></section>':''}`,{...ctx,active:'activity'});
 if(path==='/members/projects/')return memberLayout('共同事業・連絡記録',`<h1>共同事業・連絡記録</h1><p>参加事業の打ち合わせと、資料の受け渡しに関する記録です。</p><div class="project-list">${projects.filter(p=>p.roles.includes(account.role)).map(p=>`<a href="/members/projects/${p.slug}/"><small>${p.period}</small><h2>${esc(p.title)}</h2><p>${esc(p.members)}</p></a>`).join('')||'<p class="empty-state">参照できる共同事業はありません。</p>'}</div>`,{...ctx,active:'projects'});
 const project=projects.find(p=>path===`/members/projects/${p.slug}/`&&p.roles.includes(account.role));
 if(project)return memberLayout(project.title,`<h1>${esc(project.title)}</h1><p class="member-meta">${esc(project.members)}<br>保存期間：${project.period}</p><div class="project-thread">${project.posts.map(([date,by,text])=>`<article class="project-post"><header><b>${esc(by)}</b><time>${date}</time></header><p>${esc(text)}</p></article>`).join('')}</div>${(project.links||[]).map(l=>`<p><a class="text-link" href="${esc(origins[l.origin]+l.path)}" target="_blank" rel="noopener">${esc(l.text)}</a></p>`).join('')}<a class="text-link" href="/members/projects/">共同事業一覧へ</a>`,{...ctx,active:'projects'});
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
  return memberLayout('研究資料照会',`<h1>研究資料照会</h1>${documentLookup(id)}${result}`,{...ctx,active:'records'});
 }
 const docMatch=path.match(/^\/members\/records\/([A-Z0-9-]+)\/$/);
 if(docMatch){const d=documents.find(d=>d.id===docMatch[1]&&d.roles.includes(account.role));return d?renderDocument(d,ctx):null;}
 if(path==='/members/messages/'){
  const assigned=assignedNoticeList(account.role);
  const privateMessage=account.role==='institution'&&caseState.contact?`<article class="message"><time>2026.11.02 / 工房保全担当</time><h2>原本照会への回答</h2><div class="message-body">このアカウントを現在利用されている方へ。\n\n原本の照会を受け取りました。B-07に今も灯さんがいます。型紙を取りに行くたび、道具と一緒に帰るのだと書かれた紙を渡されます。\n\nこちらでは外部への通信が止められています。施設サイトと旧資料の更新だけが残っています。廃止前のページへ参照を戻したのは私です。今度の引渡しで、この更新権限も失います。\n\n保全した原本をまとめました。手を加えず、ZIP全体を資料保全受付へお渡しください。申出者の情報は同梱の書面にあります。終わったら、こちらの記録に受領を返してもらえます。</div><p data-inquiry-record="CH-2021-003" hidden>最後の手控えにあった、事業を止めてもいいという行も読みました。原文のまま残しています。</p><p data-inquiry-record="FAB-2026-018" hidden>B-07の交換票から照会されたのですね。部品を届ける時に受け取った本人の紙も、原本に含めました。</p><a class="download-card" href="/members/download/hozen.zip"><strong>保全資料_20261102.zip ↓</strong><small>申出書・実験記録・継承資料</small></a><div class="submission-links"><a class="text-link" href="${esc(origins.hozen)}/receive/?case=${caseId}">資料保全・匿名通報受付 </a></div></article>`:'';
  const changed=caseState.ending==='end2'?'<article class="message"><time>2026.11.06 / 運営事務局</time><h2>担当者の変更</h2><p>工房保全担当への照会は事務局へ移管いたしました。旧担当者の個人登録は終了しました。</p></article>':'';
  return memberLayout('施設からの連絡',`<h1>施設からの連絡</h1>${changed}${privateMessage}${assigned||'<article class="message"><time>2026.10.01 / 運営事務局</time><h2>秋季の共用設備点検について</h2><p>ご利用中の区画に点検作業が入る場合がございます。各担当からのご連絡をご確認ください。</p></article>'}`,{...ctx,active:'messages'});
 }
 if(path==='/members/inquiry/'){
  const id=query.get('record')||'';const d=documents.find(d=>d.id===id&&d.roles.includes(account.role));
  return memberLayout('記録についての照会',`<h1>記録についての照会</h1>${ctx.error?`<p class="form-error">${esc(ctx.error)}</p>`:''}<form class="form-stack" method="post">${fieldToken(csrf)}<label for="record">文書ID</label><input id="record" name="record" value="${esc(d?.id||'')}" required><label for="request">照会内容</label><select id="request" name="request"><option>原本確認</option><option>記載内容の確認</option><option>添付資料の確認</option></select><label for="note">備考</label><textarea id="note" name="note" maxlength="3000"></textarea><button class="button dark" type="submit">照会を送信 <span>→</span></button></form>`,{...ctx,active:'records'});
 }
 if(path==='/members/reservations/'){
 if(['end1','end3'].includes(caseState.ending))return memberLayout('利用申請・予約','<h1>利用申請・予約</h1><div class="notice"><h2>受付を休止しております。</h2><p>施設の一般利用休止に伴い、新規の利用申請を停止しております。</p></div>',{...ctx,active:'reservations'});
 return memberLayout('利用申請・予約',`<h1>利用申請・予約</h1>${query.get('received')?'<div class="form-success">利用申請を受け付けました。内容を確認のうえ、施設からの連絡にて回答いたします。</div>':''}${ctx.error?`<p class="form-error" role="alert">${esc(ctx.error)}</p>`:''}<form class="form-stack" method="post">${fieldToken(csrf)}<label for="space">施設</label><select id="space" name="space">${reservationSpaces.map(([id,name])=>`<option value="${id}"${query.get('space')===id?' selected':''}>${name}</option>`).join('')}</select><label for="date">利用日</label><input id="date" name="date" type="date" min="2026-11-02" required><label for="time">開始時刻</label><input id="time" name="time" type="time" min="09:00" max="20:00" required><label for="purpose">利用内容</label><textarea id="purpose" name="purpose" maxlength="2000" required></textarea><button class="button dark">申請する <span>→</span></button></form>`,{...ctx,active:'reservations'});
 }
 if(path==='/members/contact/')return memberLayout('運営事務局へのお問い合わせ',`<h1>運営事務局へのお問い合わせ</h1><p>施設利用や運営に関するご連絡を承ります。必要に応じて資料を添付してください。</p>${ctx.error?`<p class="form-error">${esc(ctx.error)}</p>`:''}<form class="form-stack" method="post" enctype="multipart/form-data">${fieldToken(csrf)}<label for="subject">件名</label><input id="subject" name="subject" maxlength="150" required><label for="message">内容</label><textarea id="message" name="message" maxlength="5000" required></textarea><label for="attachment">添付資料</label><input id="attachment" name="attachment" type="file" accept=".zip,.pdf"><button class="button dark">送信する <span>→</span></button></form>`,{...ctx,active:'contact'});
 if(path==='/members/contact/received/')return memberLayout('受付完了',`<h1>お問い合わせを受け付けました。</h1><p>担当部署にて確認いたします。</p><div class="member-meta">受付番号：AD-2026-1102</div><p><a class="text-link" href="/members/messages/">施設からの連絡 </a></p><p><a class="text-link" href="/">施設サイトへ </a></p>`,{...ctx,active:'contact'});
 if(path==='/members/personal/'&&account.role==='asakura')return memberLayout('個人保存資料',`<h1>個人保存資料</h1><p class="small muted">朝倉 紬乃 / 非共有</p><div class="archive-list">${['AS-2024-002','AS-2023-008'].map(id=>documents.find(d=>d.id===id)).map(d=>`<a href="/members/records/${d.id}/"><h2>${esc(d.title)}</h2><small>${d.id} / ${d.date}</small></a>`).join('')}</div>`,{...ctx,active:'personal'});
 return null;
}

function agencyPageContent(kind,path,{caseId='',error='',received=false,pending=false,ending='',consoleTrial=null,origins}){
 const audit=kind==='audit',name=audit?'東都研究監査室':'災害技術記録保全センター',base=audit?origins.audit:origins.hozen;
 let content='';
 if(received&&pending)return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>資料受領 | ${name}</title><link rel="stylesheet" href="/styles.css">${audit&&received?'<script type="module" src="/lab-console.js"></script>':''}</head><body class="agency-body"><header class="agency-header">${name}</header><main class="agency-main"><p class="eyebrow">RECEIPT</p><h1>資料を受領しました。</h1><p>対象者の所在と、施設内の事業について確認を進めます。外部への資料移送については、受領した資料だけでは範囲を確認できませんでした。</p><div class="agency-additional"><h2>追加資料の受け付け</h2><p>移送先、原本の採否、事業の承継に関する記録がございましたら、同じ受付番号へご提出ください。</p><a class="text-link" href="${esc(base)}/receive/?case=${esc(caseId)}">追加資料を提出する</a></div></main>${fictionFooter()}</body></html>`;
 if(received)content=`<p class="eyebrow">RECEIPT</p><h1>資料を受領しました。</h1><p>${audit?'関係する資料を保全し、対象者の所在確認と、施設内外の事業について調査を進めます。':'ご提出いただいた資料を保全し、関係先への照会と事実確認を進めます。'}</p><div class="receipt-number">受付番号：${audit?'EA':'DR'}-2026-1102</div><p>追加のご連絡は、本受付の記録にて承ります。</p><div class="agency-news"><h2>2026.11.06　関係施設の利用休止について</h2><p>あすなろ産業支援交流施設は、調査のため一般利用を休止しました。対象者の保護と記録の保全が進められています。</p>${audit?'<p>外部への資料移送と、別事業として計画されていた試験も調査対象に含まれています。</p><p>対象者P-034・瀬尾灯さんの所在をB1・B-07で確認しました。本人の希望を個別に確認し、施設外へ移動されました。研究への参加や基準回答への一致を、支援の条件にはしていません。未送信だった三枝律氏の申出も保全し、ご遺族への説明と調査を進めています。</p><p>無償滞在の募集条件、日次検査に伴う未告知の投薬、群内の殺傷と救護要請への対応についても原本を照合しております。青井真澄さんを含む生存者の保護と、吉野夏帆さんら亡くなられた方々の記録・私物の返却を進めています。</p><h2>2026.11.20　ご本人からの連絡</h2><p>ご本人のご了承を得て、返却資料の受領連絡を掲載します。</p><blockquote>道具と、母の料理の本を返していただきました。家に帰って最初に作ったのは、自助具ではなく、お昼ご飯でした。母は本より先に「まず一緒に食べよう」と言いました。<br><br>三枝さんの紙袋に、途中の型紙が入っていました。完成を見せることはできません。でも、いつも空けてくれていた机の場所を、覚えています。<br><br>本の道具は、まだ途中です。今度は、母と確かめながら続きを作ります。<br>瀬尾 灯</blockquote>':'<p>当センターは、受領した技術記録を将来に継承するため、新たな研究支援事業の準備を進めています。</p>'}</div>${audit?labThanks(consoleTrial):''}<p><a class="text-link" href="${esc(origins.main)}/">施設のお知らせ </a></p>`;
 else content=`<p class="eyebrow">${audit?'INDEPENDENT REVIEW':'RECORDS & CONTINUITY'}</p><h1>${audit?'記録保全受付':'資料保全・匿名通報受付'}</h1><p>${audit?'研究事業に関する記録の提供を受け付けています。現運営から独立した立場で、原本と資料の移送先を含めて確認します。':'研究や施設運営に関する資料の提供を受け付けています。氏名・連絡先の記入は任意です。'}</p>${error?`<p class="form-error">${esc(error)}</p>`:''}<form class="form-stack" method="post" action="/receive/" enctype="multipart/form-data"><input type="hidden" name="case" value="${esc(caseId)}"><label for="title">件名</label><input id="title" name="title" required maxlength="150"><label for="statement">内容</label><textarea id="statement" name="statement" required maxlength="5000"></textarea><label for="archive">資料</label><input type="file" id="archive" name="archive" accept=".zip" required><label for="sender">お名前（任意）</label><input id="sender" name="sender" maxlength="100" value="${audit&&consoleTrial?.completedAt?esc(consoleTrial.handle):''}"><button class="button" type="submit">資料を提出する <span>→</span></button></form>`;
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${name} | 記録保全受付</title><link rel="stylesheet" href="/styles.css">${audit&&received?'<script type="module" src="/lab-console.js"></script>':''}</head><body class="agency-body"><header class="agency-header"><a href="${base}/?case=${esc(caseId)}">${name}</a><span>${audit?'INDEPENDENT RESEARCH REVIEW':'DISASTER TECHNOLOGY RECORDS'}</span></header><main class="agency-main">${content}</main><footer class="agency-footer"><p>${audit?'調査担当：倉橋 真紀乃':'一般社団法人 災害技術記録保全センター／代表理事 榎本 航策'}</p><p>© ${audit?'TOTO RESEARCH REVIEW':'DISASTER TECHNOLOGY RECORDS CENTER'}</p></footer>${fictionFooter()}</body></html>`;
}

export function renderMember(path,ctx){return decoratePage(renderMemberPage(path,ctx),{kind:'main',path,role:ctx.account?.role});}
export function agencyPage(kind,path,ctx){return decoratePage(agencyPageContent(kind,path,ctx),{kind,path});}
