import {programPath,programTitle,programNotesPath,programBanner,programExhibit,programBody} from './program.mjs';
import {tenantExhibits} from './world/tenant-exhibits.mjs';
import {fictionFooter,decoratePage} from './experience.mjs';
import {editorialPages,facilityInfo} from './world/editorial.mjs';
import {facility, gallery, tenants, news, searchEntries, tenantMaterialEntries} from './content.mjs';
import {matchesSearch,searchExcerpt} from './search.mjs';
import {seedNotes,seedNoteTotal,seedCollectionPath} from './seed-notes.mjs';
import {workshopEquipment} from './world/workshop-equipment.mjs';
import {workshopHours} from '../public/assets/reservation-policy.js';
import {generalUsePaused,publicOperationLabel} from './evidence.mjs';

export const esc = (v='') => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const arrow = '';
const img = (name,alt,cls='',eager=false,dimensions=null) => `<img class="${cls}" src="/assets/${name}" alt="${esc(alt)}" ${eager?'fetchpriority="high"':'loading="lazy"'}${dimensions?` width="${dimensions[0]}" height="${dimensions[1]}"`:''} decoding="async">`;
const link = (url,text,cls='text-link')=>`<a class="${cls}" href="${url}"${url.startsWith('/members/')?' target="_blank" rel="noopener"':''}>${text}${url.startsWith('/members/')?'<span class="sr-only">（別タブで開きます）</span>':''}${arrow}</a>`;
function mapPreview(file,description,label,focusArrival=false){
 return `<button type="button" class="photo-button map-image" data-image-open="/assets/${file}"${focusArrival?' data-plan-arrival':''} aria-label="${esc(label)}">${img(file,description,'',false,[1200,710])}<span class="map-preview-label" aria-hidden="true">${esc(label)}</span></button>`;
}
function siteOperation(ending){
 return `<span${generalUsePaused(ending)?' data-site-operation="paused"':''}>${publicOperationLabel(ending)}</span>`;
}
function facilityUseNotice(){
 return `<aside class="wrap facility-use-pause" aria-label="施設の利用状況"><p>現在、施設の一般利用を休止しております。掲載内容は休止前の案内です。</p>${link('/news/closure/','休止のお知らせ')}</aside>`;
}
function facilityPhoto(file,description,caption,dimensions){
 return `<figure class="facility-photo">${img(file,description,'detail-hero',true,dimensions)}<figcaption>${esc(caption)}</figcaption></figure>`;
}
export function brand(){return `<a class="brand" href="/" aria-label="あすなろ産業支援交流施設 トップページ">${img('logo.png','', '',true)}<span><b>あすなろ</b><small>産業支援交流施設</small></span></a>`;}

export function layout(title,body,{home=false,legacy=false,kind='',description='人と技術が出会い、次の一歩が生まれる。あすなろ産業支援交流施設の施設・サービス、工房、イベントをご案内いたします。'}={}){
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#14282c"><title>${esc(title)}${home?'':' | あすなろ産業支援交流施設'}</title><link rel="icon" href="/assets/logo.png"><link rel="stylesheet" href="/styles.css"><script src="/app.js" defer></script></head><body class="${home?'home ':''}${kind}"><a class="skip" href="#main">本文へ移動</a>
 <header class="site-header"><div class="header-main">${brand()}<div class="header-right"><div class="utility">${siteOperation()}<a href="/price/">料金案内</a><a href="/membership/">会員のご案内</a><button type="button" class="search-toggle" aria-label="サイト内検索を開く" data-search-open><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button>${link('/members/','会員サイト','member-link')}</div><button class="menu-toggle" type="button" aria-controls="main-navigation" aria-expanded="false">MENU <span>☰</span></button><nav id="main-navigation" aria-label="メインナビゲーション"><a href="/about/">あすなろについて</a><a href="/facilities/">施設・サービス</a><a href="/workshop/">工房のご案内</a>${kind==='error-page'?'<a href="/tenants/">入居者紹介</a>':''}<a href="/gallery/">制作物ギャラリー</a><a href="/news/">お知らせ</a><a class="mobile-nav-link" href="/price/">料金案内</a><a class="mobile-nav-link" href="/membership/">会員のご案内</a></nav></div></div></header>
 <main id="main">${body}</main>
 <footer class="site-footer"><div class="footer-top">${brand()}<p>人と技術のあいだに、<br>あたらしい可能性を。</p></div><div class="footer-links"><a href="/about/">あすなろについて</a><a href="/facilities/">施設・サービス</a><a href="/floor-map/">フロアマップ</a><a href="/workshop/">工房のご案内</a>${kind==='error-page'?'<a href="/tenants/">入居者紹介</a>':''}<a href="/gallery/">制作物ギャラリー</a><a href="/membership/">会員のご案内</a><a href="/news/">お知らせ</a>${legacy?'<a href="/guide/access/">アクセス</a>':''}</div><div class="footer-bottom"><span>© ASUNARO INDUSTRY & EXCHANGE</span><a href="/privacy/">個人情報の取り扱いについて</a><span class="seed-collection-nav" data-seed-collection-nav="${seedNoteTotal}" data-seed-collection-path="${seedCollectionPath}" hidden></span><a href="#main">PAGE TOP ↑</a></div></footer>
 ${fictionFooter()}<dialog class="search-dialog"><div class="search-dialog-head"><span>SITE SEARCH</span><button type="button" class="dialog-close" aria-label="検索を閉じる">×</button></div><form action="/search/" method="get"><label for="site-query">サイト内検索</label><div class="search-box"><input id="site-query" name="q" type="search" placeholder="キーワード" autocomplete="off" required><button type="submit" aria-label="検索">→</button></div></form></dialog>
 <dialog class="image-dialog"><button type="button" class="dialog-close" aria-label="画像を閉じる">×</button><div class="image-controls"><button type="button" data-photo-action="out" aria-label="画像を縮小">−</button><button type="button" data-photo-action="in" aria-label="画像を拡大">＋</button><button type="button" data-photo-action="rotate" aria-label="画像を回転">↻</button><button type="button" data-photo-action="reset">全体</button></div><div class="image-viewport"><div class="image-stage"><img alt=""></div></div><a class="image-original" target="_blank" rel="noopener">画像を開く </a></dialog></body></html>`;
}

const noteMarks = {
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/>',
 sea:'<circle cx="12" cy="12" r="9"/><path d="M5 13c3-2 4 2 7 0s4-2 7 0M7 17c2-1 3 1 5 1s3-2 5-1"/>',
 orbit:'<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-34 12 12)"/>',
 tool:'<path d="m14 7 3-3a5 5 0 0 1-5.5 6.5L5 17a2 2 0 0 0 3 3l6.5-6.5A5 5 0 0 0 21 8l-3 3z"/>',
 feather:'<path d="M5 20 17 8M7 18c-2-5 4-12 12-14 1 8-6 15-12 14zm5-5v-3m2 1h3"/>',
 track:'<path d="M8 12c-2 0-3-2-3-4s1-3 2-3c2 0 3 2 3 4s-1 3-2 3zm8 7c-2 0-3-2-3-4s1-3 2-3c2 0 3 2 3 4s-1 3-2 3zM7 15v1m8 5v1"/>',
 drop:'<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12zM9 15c0 2 1 3 3 3"/>',
 signal:'<path d="M7 16a7 7 0 0 1 10 0m-13-4a11 11 0 0 1 16 0M2 8a15 15 0 0 1 20 0"/><circle cx="12" cy="20" r="1"/>',
};
function seedNoteButton(path){
 const note=seedNotes[path];
 if(!note)return '';
 const mark=noteMarks[note.mark];
 const content=mark?`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${mark}</svg>`:esc(note.stamp||note.label);
 return `<button type="button" class="seed-note seed-note-${note.mark}" aria-haspopup="dialog" aria-label="${esc(note.label)}">${content}</button>`;
}
const heading=(en,title,lead='',notePath='')=>`<div class="page-heading wrap"><div class="breadcrumb"><a href="/">HOME</a><span>/</span>${esc(title)}</div><p class="eyebrow${notePath?' seed-note-line':''}">${en}${seedNoteButton(notePath)}</p><h1>${title}</h1>${lead?`<p class="page-lead">${lead}</p>`:''}</div>`;
const rows = items=>`<div class="news-rows">${items.map(n=>`<a href="/news/${n.id}/" data-news-year="${n.date.slice(0,4)}" data-news-kind="${esc(n.tag)}"><time datetime="${n.date.replaceAll('.','-')}">${n.date}</time><span class="tag">${n.tag}</span><span class="news-title">${n.title}</span>${arrow}</a>`).join('')}</div>`;
function newsFilters(items){
 const years=[...new Set(items.map(n=>n.date.slice(0,4)))],kinds=[...new Set(items.map(n=>n.tag))];
 return `<form class="news-filters filter-form" method="get" data-news-filter><label>掲載年<select name="year"><option value="">すべての年</option>${years.map(y=>`<option value="${y}">${y}年</option>`).join('')}</select></label><label>種別<select name="kind"><option value="">すべての種別</option>${kinds.map(k=>`<option>${esc(k)}</option>`).join('')}</select></label><button type="submit">表示する</button><a class="news-filter-clear" href="/news/">条件を解除</a></form><p class="news-result-count small muted" role="status" aria-live="polite"></p>`;
}
function newsContent(n,origins){
 const map=n.oldMap;
 const mapCopy=map?`<figure class="archive-plan-copy">${mapPreview('floor-4f-2012.svg','開設時の4階配置原図 A4-01。西側の個室は、北から402〜407、408〜413、414〜416。南寄りに工房1・2。中央に受付、東側に会議室と交流スペース。','開設時の配置図を拡大')}<figcaption><span>配置図作成 <time datetime="${map.made}">${map.made.replaceAll('-','.')}</time></span><span>PDF再収録 <time datetime="${map.copied}">${map.copied.replaceAll('-','.')}</time></span></figcaption></figure>`:'';
 return `<p class="news-intro">${esc(n.body)}</p>${(n.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join('')}${n.facts?`<dl class="notice-details">${n.facts.map(([key,value])=>`<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:''}${n.sections?.length>2?`<nav class="article-contents" aria-label="記事内の項目"><span>この記事の内容</span>${n.sections.map(([title],i)=>`<a href="#news-section-${i+1}">${esc(title)}</a>`).join('')}</nav>`:''}${(n.sections||[]).map(([title,text],i)=>`<section class="news-copy-section" id="news-section-${i+1}"><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join('')}${mapCopy}${n.image?`<figure${n.technicalDiagram?' class="technical-diagram"':''}>${img(n.image,n.imageAlt||n.caption||n.title)}${n.caption?`<figcaption>${esc(n.caption)}</figcaption>`:''}</figure>`:''}<div class="news-related">${n.link?link(n.link,n.linkText,'text-link'):''}${(n.links||[]).map(l=>link(l.path,l.text,'text-link')).join('')}${n.archiveLink?link(origins.archive+n.archiveLink,'保存資料室・収蔵目録','text-link'):''}</div>${n.closing?`<p class="news-closed-note">${esc(n.closing)}</p>`:''}${n.desk?`<p class="news-desk">${esc(n.desk)}</p>`:''}`;
}
function tenantExhibit(id){
 const e=tenantExhibits[id];if(!e)return '';
 const fields=e.style==='method'?`<ol class="tenant-method">${e.facts.map(([label,value])=>`<li><b>${esc(label)}</b><span>${esc(value)}</span></li>`).join('')}</ol>`:`<dl class="tenant-exhibit-fields">${e.facts.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
 return `<section class="tenant-exhibit exhibit-${e.style}"><p class="exhibit-label">${esc(e.label)}</p><h3>${esc(e.title)}</h3><p>${esc(e.intro)}</p>${fields}${e.link?link(e.link[0],esc(e.link[1])):''}</section>`;
}
function galleryCards(items){return `<div class="gallery-grid">${items.map(g=>`<a class="gallery-card" id="work-${g.id}" href="/gallery/${g.id}/" data-gallery-method="${esc(g.tag)}"><div class="image-wrap">${img(g.image,'')}</div><div class="card-meta"><time datetime="${g.date.replaceAll('.','-')}">${g.date}</time><span class="card-number">No. ${g.id}</span></div><h3>${g.title}</h3><span class="gallery-method">${g.tag}</span></a>`).join('')}</div>`;}
function galleryPage(query){
 const listed = gallery.filter(work=>work.listed);
 const methods = [...new Set(listed.map(work=>work.tag))];
 const method = methods.includes(query) ? query : '';
 const shown = method ? listed.filter(work=>work.tag===method) : listed;
 return layout('工房制作物ギャラリー',heading('MADE AT ASUNARO','工房制作物ギャラリー','暮らしの道具から、事業のための試作品まで。工房から生まれた作品をご紹介いたします。','/gallery/')+`
  <section class="wrap section">
   <div class="gallery-tools">
    <form class="filter-form" method="get" action="/gallery/" data-gallery-filter><label>制作方法 <select name="method"><option value="">すべて</option>${methods.map(value=>`<option${method===value?' selected':''}>${esc(value)}</option>`).join('')}</select></label><button type="submit">表示する</button></form>
    <p class="gallery-results"><span data-gallery-scope>${esc(method||'すべての制作方法')}</span><span data-gallery-count>${shown.length}件</span><a href="/gallery/" data-gallery-clear${method?'':' hidden'}>絞り込みを解除</a></p>
   </div>
   ${galleryCards(shown.slice().reverse())}
  </section>`);
}
function tenantLogo(tenant,alt=''){
 return img(`tenant-logos/${tenant.page}.svg`,alt,'tenant-logo',false,[360,192]);
}
function materialDate({date,articleId}){
 const label=articleId?'掲載日':'発行日';
 return `<span class="tenant-material-date"><small>${label}</small><time datetime="${date.replaceAll('.','-')}">${esc(date)}</time></span>`;
}
function tenantRelatedMaterials(tenant){
 const entries = tenantMaterialEntries.filter(material => material.tenant === tenant);
 return `<section id="reading-history" class="prose tenant-related-materials">
  <h2>活動に関する資料</h2>
  <p>配布資料や当時のお知らせを掲載しております。</p>
  <ul class="tenant-material-list">${entries.map(material => `<li>
   <a href="${material.path}">
    ${materialDate(material)}
    <strong>${esc(material.title)}</strong><small>${esc(material.kind)}</small>
   </a>
  </li>`).join('')}</ul>
 </section>`;
}
function tenantMaterialPage(material){
 const {tenant, title, desk, paragraphs, kind, galleryId} = material;
 const work = galleryId && gallery.find(item => item.id === galleryId && item.listed);
 return layout(title,heading('TENANT MATERIALS',esc(title))+`<article class="wrap article narrow prose tenant-material">
  <p class="tenant-material-source">${esc(kind)} ／ ${materialDate(material)}<br>${esc(desk)}</p>
  ${paragraphs.map(text => `<p>${esc(text)}</p>`).join('')}${work ? `\n  <p>${link('/gallery/'+work.id+'/',esc(work.title))}</p>` : ''}
  <div class="tenant-material-return">${link('/tenants/'+tenant.page+'/#reading-history',esc(tenant.name)+'の活動資料へ戻る')}</div>
 </article>`);
}
function tenantHeading(tenant,directory){
 return `<div class="page-heading wrap tenant-heading">
  <div class="breadcrumb"><a href="/">HOME</a><span>/</span><a href="${directory}">入居者紹介</a><span>/</span>${esc(tenant.name)}</div>
  <div class="tenant-identity">
   ${tenantLogo(tenant,`${tenant.name}のロゴ`)}
   <div class="tenant-identity-copy"><p class="eyebrow">TENANT PROFILE</p><h1>${esc(tenant.name)}</h1><p class="profile-index">掲載No. ${tenant.page} ／ ${esc(tenant.period)}</p></div>
  </div>
 </div>`;
}
function tenantProfile(tenant){
 const directory=tenant.listed?'/tenants/#tenant-'+tenant.page:'/tenants/';
 const visualKind=tenant.image?.endsWith('.svg')?'図':'写真';
 const visualActivity=tenant.activities.find(activity=>activity.image===tenant.image);
 const companyVisual=tenant.logoOnly||!tenant.image?'':`<figure class="company-image">
  <button type="button" class="photo-button" data-image-open="/assets/${tenant.image}" aria-label="${esc(tenant.name)}の${visualKind}を拡大">${img(tenant.image,`${tenant.name}の研究・製品の記録`,'tenant-photo',true)}<span class="tenant-photo-action" aria-hidden="true">${visualKind}を拡大</span></button>
  <figcaption>${esc(tenant.photoDate||visualActivity?.date||'')}　${esc(visualActivity?.title||'研究・製品の記録')}</figcaption>
 </figure>`;
 const details=[['代表者',tenant.person],['設立日',tenant.established],['入居日',tenant.joined],['登録番号',tenant.id],['区画',tenant.room+'号室'],['入居期間',tenant.period]];
 return layout(tenant.name,tenantHeading(tenant,directory)+`<article class="wrap article tenant-profile">
  <nav class="profile-tabs tenant-profile-tabs" aria-label="企業情報"><a href="#profile">企業紹介</a><a href="#activities">活動報告</a><a href="#reading-history">活動に関する資料</a></nav>
  <section id="profile">${companyVisual}<div class="prose">
   <h2>${esc(tenant.tagline)}</h2><p>${esc(tenant.description)}</p>
   <ul class="company-services">${tenant.products.map(product=>`<li>${esc(product)}</li>`).join('')}</ul>${tenantExhibit(tenant.id)}
   <dl class="detail-list">${details.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
  </div></section>
  <section id="activities" class="prose"><h2>活動報告</h2>${tenant.activities.map(activity=>`<article class="company-activity">
   <time>${activity.date}</time><h3>${esc(activity.title)}</h3><p>${esc(activity.body)}</p>${activity.image&&activity.image!==tenant.image?`<button type="button" class="photo-button" data-image-open="/assets/${activity.image}" aria-label="${esc(activity.title)}の写真を拡大">${img(activity.image,`${tenant.name} ${activity.date}の活動記録`,'activity-photo',false,activity.credential?[6144,4096]:null)}<span class="tenant-photo-action" aria-hidden="true">写真を拡大</span></button>`:''}
  </article>`).join('')}</section>
  ${tenantRelatedMaterials(tenant)}${link(directory,'入居者紹介へ')}
 </article>`);
}
function tenantCards(items){
 return `<div class="tenant-grid">${items.map(tenant=>`
  <a class="tenant-card" id="tenant-${tenant.page}" href="/tenants/${tenant.page}/">
   ${tenantLogo(tenant)}
   <div class="tenant-card-copy">
    <div class="tenant-card-meta"><span class="tenant-id">掲載No. ${tenant.page}</span><span class="tag">${esc(tenant.status)}</span></div>
    <h2>${esc(tenant.name)}</h2><p>${esc(tenant.business)}</p>
    <small>${esc(tenant.period)} ／ ${esc(tenant.room)}号室</small>
   </div>
  </a>`).join('')}</div>`;
}

function equipmentDetails(machine,paused=false){
 const supporting = machine.supporting?.map(unit => `<div><dt>${esc(unit.name)}（${esc(unit.type)}）</dt><dd>${esc(unit.description)}</dd></div>`).join('') || '';
 return `<p>${esc(machine.description)}</p>
  <dl class="equipment-specs"><div><dt>${esc(machine.dimensionsLabel)}</dt><dd>${esc(machine.dimensions)}</dd></div><div><dt>主な材料</dt><dd>${machine.materials.map(esc).join('、')}</dd></div>${supporting}</dl>
  ${paused?'':`<p>${esc(machine.access)}</p>`}
  <a class="text-link" href="${esc(machine.source)}" target="_blank" rel="noopener">${esc(machine.manufacturer)}の機器仕様<span class="sr-only">（別タブで開きます）</span></a>`;
}
function equipmentHeading(machine){
 return `<p class="eyebrow">${esc(machine.room)}</p><h3>${esc(machine.name)}</h3><p class="equipment-type">${esc(machine.type)}</p>`;
}
function hallExhibition(paused){
 return `<section id="exhibition" class="hall-exhibition">
  <figure>${img('media/f-hall-exhibition.webp','3階ホールの壁と舞台を使った月面居住の企画展示。客席を外し、模型と試作品を展示台に並べている。','',false,[1536,1024])}
   <figcaption>2026年10月31日 ／ 3階ホール特別展示</figcaption></figure>
  <div><p class="eyebrow">EXHIBITION ARCHIVE</p><h2>企画展示の設営例</h2>
   <p>「月に、暮らしを持っていく。」の特別公開では、客席を外し、広い通路を挟んで模型と試作品を並べました。${paused?'4階での展示の様子も、企画展示の記録でご覧いただけます。':'現在の企画展示は4階のラウンジ前でご覧いただけます。'}</p>
   ${link('/research/lunar-habitat/','月の企画展示を見る')}</div>
 </section>`;
}
function workshopPage(paused){
 const metal = workshopEquipment.find(machine => machine.id==='metal');
 const lattice = gallery.find(work => work.key==='metal-lattice');
 const featured = ['latch','flexure-panel'].map(key => gallery.find(work => work.key===key));
 return layout('工房のご案内',heading('FABRICATION','工房のご案内',paused?'工房で行われた試作と、設置機器をご紹介いたします。':'考えを、かたちに。身近な道具から、事業に向けた試作まで。材料と作り方を工房スタッフと一緒に考えます。')+(paused?facilityUseNotice():'')+`
  <section class="wrap facility-detail workshop-overview">
   ${facilityPhoto('workshop.webp','木の作業台と右手の樹脂造形機器。','4階 工房2 ／ 入口側から撮影',[1536,1024])}
   <div class="workshop-access" aria-labelledby="workshop-access-title">
    ${paused?`<div><h2 id="workshop-access-title">休止前の工房利用</h2><p>入居企業と登録会員は、機器と施設指定の材料を使った少量の試作を無料で行うことができました。</p>${link('/floor-map/#floor-workshop','4階案内図で工房の位置を見る')}</div>`:`<div><p class="eyebrow">ご利用の流れ</p><h2 id="workshop-access-title">入居企業・登録会員は無料でご利用いただけます。</h2>
     <p>機器と施設指定の材料を使った少量の試作は、無料で承ります。初めてご利用になる方は、用途が分かる写真や現物をお持ちください。</p>
     <p>受付は${workshopHours.start}〜${workshopHours.close}です。工房のご利用は予約制で、${workshopHours.lastStart}までに作業を始められる枠をお申し込みください。</p>
     ${link('/floor-map/#floor-workshop','中央受付からの行き方')}</div>
    ${link('/members/reservations/?space=workshop','工房利用の申請','button dark')}`}
   </div>
  </section>
  <section class="wrap workshop-machines" aria-labelledby="equipment-title">
   <p class="eyebrow seed-note-line">EQUIPMENT${seedNoteButton('/workshop/')}</p><h2 id="equipment-title">${paused?'工房の設置機器':'工房で使える機器'}</h2>
   <div class="workshop-machine-grid">${workshopEquipment.filter(machine=>machine.id!=='metal').map(machine=>`<article class="equipment-card">${equipmentHeading(machine)}${equipmentDetails(machine,paused)}</article>`).join('')}</div>
   <article class="metal-workshop" aria-label="金属造形">
    <div class="equipment-card">${equipmentHeading(metal)}${equipmentDetails(metal,paused)}</div>
    <figure class="metal-workshop-example">${img(lattice.image,'金属の外殻を一部開き、内部の格子が見える試作片。','',false,[1536,1024])}<figcaption>${link('/gallery/'+lattice.id+'/',lattice.title)}</figcaption></figure>
   </article>
  </section>
  <section class="wrap workshop-machines" aria-labelledby="workshop-examples">
   <p class="eyebrow">MADE AT ASUNARO</p><h2 id="workshop-examples">工房の試作例</h2>
   ${galleryCards(featured)}
   <div class="button-row">${link('/gallery/','制作物ギャラリーを見る','button outline')}${link('/facilities/staff/','工房スタッフの紹介')}</div>
  </section>`);
}
function staffPage(paused){
 return layout('施設職員紹介',heading('OUR TEAM','施設職員紹介',paused?'休止前の受付と工房のご案内、職員への取材を掲載しております。':'見学や試作のご相談を、中央受付と工房で承っております。')+(paused?facilityUseNotice():'')+`
  <section class="wrap staff-profiles" aria-label="受付・工房の職員">
   <article class="staff-profile">
    <p class="eyebrow">4F / RECEPTION</p><h2>中央受付スタッフ</h2>
    <p>${paused?'見学のご案内や、会議室・工房の利用相談を担当しておりました。':'見学のご案内や、会議室・工房の利用に関するご相談を承っております。はじめての方は、4階の中央受付へお越しください。'}</p>
    <blockquote>「見学中に何を見たいか、最初に少しお聞きしています。お時間が短いときは、見たいところから回れるようご案内いたします。」</blockquote>
    ${link('/visit/','見学のご案内')}
   </article>
   <article class="staff-profile">
    <p class="eyebrow">4F / WORKSHOP</p><h2>工房スタッフ</h2>
    <p>${paused?'試作のご相談では、材料の厚さや、部品の取り付け方を利用者の方と一緒に確かめていました。':'3Dプリンターやレーザーカッターを使う前に、材料の厚さ、取り付ける場所、使い方を一緒に確かめます。図面をまだお持ちでない場合もご相談いただけます。'}</p>
    <blockquote>「寸法を測る前に、どこで使うものかを聞きます。壊れた部品なら、その隣に付いていたものも持ってきてください。取り付けたときの隙間が分かると、直し方が変わります。」<cite>高瀬 誠弥 ／ 元工房主任・製作相談の記録から</cite></blockquote>
    ${link('/workshop/','工房のご案内')}
   </article>
  </section>`);
}

function receptionCopyPage(){
 return layout('控えの照会',`
  <div data-seed-collection-page>
   <div data-seed-collection-locked>
    ${heading('RECEPTION','控えの照会')}
    <div class="wrap article narrow prose"><p>この控えは現在表示できません。</p></div>
   </div>
   <template>
    <div data-seed-collection-unlocked>
     ${heading('RECEPTION','中央受付の引継ぎ控え')}
     <div class="wrap article narrow prose">
      <article class="reception-copy" aria-label="中央受付の記録">
       <p class="eyebrow">複写 ／ 中央受付・遅番</p>
       <h2>10月1日　引継ぎ</h2>
       <dl>
        <div><dt>17:00</dt><dd>見学受付終了。</dd></div>
        <div><dt>17:06</dt><dd>案内板を翌日分へ差し替え。</dd></div>
        <div><dt>17:14</dt><dd>返却口から見学証を一枚回収。12番。</dd></div>
        <div><dt>17:26</dt><dd>見学者名簿と照合。12番の貸出欄は空欄。</dd></div>
        <div><dt>17:32</dt><dd>翌日分の見学証を確認。12番は棚にありました。</dd></div>
        <div><dt>17:41</dt><dd>呼出履歴を確認。17:14の放送は中央受付の操作記録にありません。</dd></div>
       </dl>
       <p class="reception-copy-note">回収した方は封筒に入れ、名簿の下に置きました。朝番の方へ。西側から内線が入ったら、どの部屋か聞いておいてください。</p>
      </article>
     </div>
    </div>
   </template>
  </div>`);
}

export function home(ending=''){
 const closing=generalUsePaused(ending);
 const hero=closing?`<section class="hero closure-hero" aria-label="施設の利用休止">${img('exterior.webp','あすなろの施設外観','hero-image',true)}<div class="hero-shade"></div><div class="hero-content"><p class="hero-en seed-note-line">ASUNARO${seedNoteButton('/')}</p><h1>施設の利用を<br>休止しております。</h1>${link('/news/closure/','施設のお知らせ','hero-link')}</div></section>`:`<section class="facility-hero" aria-labelledby="facility-hero-title">
 <div class="facility-hero-copy wrap"><p class="eyebrow seed-note-line">あすなろ産業支援交流施設${seedNoteButton('/')}</p><h1 id="facility-hero-title">ともに、<br>明日をつくる。</h1><p>人と技術が出会い、次の一歩が生まれる。<br>ものづくりと交流の拠点、あすなろ。</p>
 <div class="button-row">${link('/about/','あすなろについて','button dark')}${link('/visit/','見学のご案内')}</div></div>
 <figure class="facility-hero-photo">${img('media/f-home-east.webp','4階東側の食堂・カフェ。大きな窓から光が差す、木のベンチとテーブルのある内観。','',true,[1760,880])}<figcaption>4階 食堂・カフェ</figcaption></figure>
 </section>`;
 return layout('あすなろ産業支援交流施設',`${hero}
 <div class="status-bar"><span class="status-dot"></span><p>${closing?'現在、施設の一般利用を休止しております。':'4F ラウンジ・会議室・工房　｜　受付時間は施設ごとにご案内しております。'}</p><a href="${closing?'/news/closure/':'/facilities/'}">${closing?'お知らせ':'施設案内'} </a></div>
 <section class="section wrap news-section"><div class="section-title"><div><p class="eyebrow">INFORMATION</p><h2>あすなろからのお知らせ</h2></div>${link('/news/','すべてのお知らせ')}</div>${ending?`<a class="closure-notice" href="/news/${closing?'closure':'staff-change'}/">${closing?'施設の利用休止と記録の保全について':'工房技術相談の担当変更について'} </a>`:''}${rows(news.filter(n=>n.listed).slice(0,3))}</section>
 ${closing?'':programBanner()}
 <section class="about-band"><div class="wrap about-grid"><div><p class="eyebrow">ABOUT ASUNARO</p><h2>ひとりのアイデアが、<br>みんなの可能性になる。</h2></div><div><p>仕事をする。試してみる。誰かと話す。<br>日々の小さなきっかけが、新しい事業や技術につながっていきます。</p><p>あすなろは、企業や研究者、ものづくりに取り組む方々が集う産業支援交流施設です。それぞれの歩みに寄り添い、挑戦を支えてまいります。</p>${link('/about/','私たちについて')}</div></div></section>
 <section class="section wrap"><div class="section-title"><div><p class="eyebrow">SPACE & SERVICE</p><h2>アイデアが育つ場所。</h2></div>${link('/facilities/','施設・サービス一覧')}</div><div class="spaces-grid"><a class="space-card space-large" href="/facilities/coworking/">${img('lounge.webp','4階のコワーキング・ラウンジ')}<div><small>01 / COWORKING</small><h3>つながる、働く。</h3><p>オープンラウンジ・コワーキング</p></div></a><a class="space-card" href="/workshop/">${img('workshop.webp','工房2の造形機器と作業台')}<div><small>02 / FABRICATION</small><h3>考えを、かたちに。</h3><p>工房・試作サポート</p></div></a><a class="space-card" href="/facilities/meeting/">${img('media/f-meeting.webp','4階北側の会議室A')}<div><small>03 / MEETING</small><h3>次の一歩を、ここから。</h3><p>会議室</p></div></a></div></section>
 <section class="gallery-band"><div class="wrap"><div class="section-title"><div><p class="eyebrow">MADE AT ASUNARO</p><h2>工房から生まれたもの。</h2></div>${link('/gallery/','制作物ギャラリー')}</div>${galleryCards(['lizard','owl','pencil'].map(key=>gallery.find(g=>g.key===key)))}</div></section>
 <section class="visit-band wrap"><div><p class="eyebrow">COME & SEE</p>${closing?`<h2>見学の受付を休止しております。</h2>${link('/news/closure/','一般利用休止のお知らせ','button dark')}`:`<h2>まずは、あすなろを<br>見に来ませんか。</h2><p>見学は平日の9時から17時まで承っております。<br>施設の使い方や設備について、ご案内いたします。</p>${link('/visit/','見学のご案内','button dark')}`}</div>${img('exterior.webp','船首のようなかたちの施設外観')}</section>`,{home:true});
}

const facilityCards=[['coworking','lounge.webp','コワーキング・ラウンジ','日々の仕事から、新しい出会いまで。'],['meeting','media/f-meeting.webp','会議室','打ち合わせや勉強会に合わせた4つの会議室。'],['office','media/f-office.webp','個室オフィス','研究・開発に集中できる独立したワークスペース。'],['cafe','cafe.webp','食堂・カフェ','ひと息つきながら、会話が広がる場所。'],['presentation','media/f-presentation.webp','プレゼンテーションホール','発表会や交流のためのフラットなスペース。'],['hall','media/f-hall.webp','3階ホール','最大500名規模の講演会・展示会に。']];
const facilityDetails={
 coworking:['自由席を中心とした月額会員制のワークスペースです。集中したいときのデスク席、打ち合わせに使えるラウンジ席など、仕事のスタイルに合わせてご利用いただけます。','木の吸音壁と個人席。右のガラスの向こうは館内の通路。','4階 コワーキング・ラウンジ ／ 入口から入ったところ'],
 meeting:['少人数でのお打ち合わせから、セミナーまで。会議室A・B・C・Dの4室をご用意しております。','窓際に長机を並べた会議室Aの利用例。','4階 会議室A'],
 office:['西側に位置する独立した個室オフィスです。事業や研究の規模に合わせた区画をご用意しております。','机と収納を備えた個室オフィス。','4階 個室オフィス ／ 一室の例'],
 cafe:['食堂・カフェは東側の交流エリアにございます。お食事や休憩、利用者同士の交流にご利用いただけます。飲食物は所定のスペースでお召し上がりください。','木の曲面ベンチ、窓際のテーブル、奥の飲食カウンター。','4階 食堂・カフェ ／ 客席からカウンターを望む'],
 presentation:['4階東側のプレゼンテーションホールは、発表会や勉強会、交流会にご利用いただけます。レイアウトの変更については、利用申請時にご相談ください。','南西側入口から見た投影壁と客席。','4階 プレゼンテーションホール ／ 客席の設営例'],
 hall:['3階ホールは、最大500名規模の講演会、展示会、発表会に対応しております。音響、映像設備を備え、用途に合わせたレイアウトでご利用いただけます。','舞台と客席を備えた3階ホール。','3階 ホール ／ 講演会の設営例'],
};
const archivedFacilityDescriptions={
 coworking:'4階の月額会員用スペースです。自由席、個人デスク、打ち合わせに使うラウンジ席を備えています。',
 meeting:'4階にA・B・C・Dの4室があります。各室にモニター、ホワイトボード、無線LANを備えています。',
 office:'西側に設けた独立区画です。写真は机と収納を備えた一室の例です。',
 cafe:'東側の交流エリアにある食堂です。窓際の客席と木のベンチ、奥に飲食カウンターがあります。',
 presentation:'4階東側の平土間のホールです。発表会や交流会に合わせて机と椅子の配置を変えていました。定員は60名です。',
 hall:'講演会や展示会に使われた3階のホールです。講演会形式で客席を並べた場合の定員は最大500名です。',
};
const meetingApproach='受付カウンターの右脇を奥へ進み、会議室の手前で右に曲がってください。';
const meetingDEntrance='C室の角を左に曲がった先、左手に入口がございます。';
const meetingRooms=[
 ['meeting-a','A',24,'会議室前の通路を進み、左手の1番目の入口です。'],
 ['meeting-b','B',6,'会議室前の通路を進み、左手の2番目の入口です。'],
 ['meeting-c','C',6,'会議室前の通路を進み、左手の3番目の入口です。'],
 ['meeting-d','D',10,meetingDEntrance],
];
const floorDestinations=[
 ['workshop','工房1・2','受付に向かって左手に入口が並んでおります。受付に近い方が工房2、エレベーターに近い方が工房1です。','受付に近い方が工房2、中央エレベーターに近い方が工房1です。','/workshop/'],
 ['coworking','コワーキング・ラウンジ','受付に向かって右手前のガラス扉からお入りください。','受付に向かって右手前に、ラウンジのガラス扉があります。'],
 ['exhibition','企画展示（ラウンジ前）','中央受付で見学をお申し出ください。受付を正面に見て、ラウンジのガラス扉の手前を右に曲がると、通路の左手に展示ケースがございます。','展示ケースはラウンジの南側の通路にありました。',programPath],
 ['meeting','会議室 A・B・C・D',meetingApproach+'左手にA室・B室・C室の入口が順に並んでおります。D室は、'+meetingDEntrance,'会議室前の通路を東へ進むと、左手にA・B・C室が並びます。D室の入口はC室の角を左に曲がった先の左手です。'],
 ['cafe','食堂・カフェ',meetingApproach+'会議室Cを過ぎてそのまま進むと、左手に入口がございます。','会議室Cを過ぎて直進した先の左手に入口があります。'],
 ['presentation','プレゼンテーションホール','ラウンジの南側の通路を東へ進み、ラウンジを過ぎて左に曲がると、右手に入口がございます。','ラウンジの東隣に位置し、入口はホールの南西側です。'],
 ['office','個室オフィス','個室オフィスは西側にございます。ご来訪の際は、中央受付でお訪ねになる企業名か号室をお伝えください。','個室オフィスは4階の西側にあります。'],
];

function meetingRoomChoices(paused){
 return `<section class="wrap meeting-rooms" id="meeting-rooms" aria-labelledby="meeting-rooms-title">
  <h2 id="meeting-rooms-title">${paused?'会議室の定員と位置':'会議室を選ぶ'}</h2>
  <p>${paused?'受付カウンターの右脇の通路を奥へ進み、会議室の手前で右に曲がる経路です。':meetingApproach}</p>
  <dl>${meetingRooms.map(([space,letter,capacity,direction])=>`<div>
   <dt>会議室${letter}<small>定員 ${capacity}名</small></dt>
   <dd>${direction}</dd>
   ${paused?'':`<dd>${link('/members/reservations/?space='+space,'会議室'+letter+'の利用申請')}</dd>`}
  </div>`).join('')}</dl>
 </section>`;
}

function facilityPage([id,image,title,lead],paused){
 const info=facilityInfo[id], [description,imageAlt,caption]=facilityDetails[id];
 const location=id==='hall'?link('/floor-map/#arrival','4階中央受付の位置'):link('/floor-map/#floor-'+id,paused?'4階案内図で位置を見る':'中央受付からの行き方');
 const action=paused?'':id==='meeting'
  ?link('#meeting-rooms','会議室を選ぶ','button dark')
  :info.space?link('/members/reservations/?space='+info.space,'会員サイトで利用申請','button dark'):link('/membership/','会員のご案内','button dark');
 return layout(title,heading('FACILITY',title,lead)+(paused?facilityUseNotice():'')+`
  <section class="wrap facility-detail">
   ${facilityPhoto(image,imageAlt,caption)}
   <div class="prose"><h2>${paused?title+'について':title+'のご利用について'}</h2><p>${paused?archivedFacilityDescriptions[id]:description}</p>${paused?'':`<p>${info.notes}</p>`}
    <dl class="detail-list"><div><dt>${paused?'休止前のご利用時間':'ご利用時間'}</dt><dd>${info.hours}</dd></div>${paused?'':`<div><dt>ご利用方法</dt><dd>${info.method}</dd></div>`}</dl>
    <div class="button-row">${action}${link('/price/',paused?'休止前の料金':'料金のご案内','button outline')}${location}</div>
   </div>${id==='hall'?hallExhibition(paused):''}
  </section>${id==='meeting'?meetingRoomChoices(paused):''}`);
}

function floorGuide(paused){
 return layout('4階フロアマップ',heading('FLOOR GUIDE','4階フロアマップ',paused?'4階の施設と共用設備の配置をご確認いただけます。':'4階にお着きになりましたら、中央受付へお立ち寄りください。')+(paused?facilityUseNotice():'')+`
  <section class="wrap floor-section">
   <div class="map-toolbar" id="floor-plan"><span>4F　産業支援交流フロア</span><a href="/assets/asunaro-4f.pdf" target="_blank" rel="noopener">PDFを開く<span class="sr-only">（別タブで開きます）</span></a></div>
   ${mapPreview('floor-4f.svg','4階案内図 A4-09。西側の個室番号は、北から402〜407、408・409・413、414〜416。南寄りに工房1・2。中央受付は中央エレベーターから右へ進み、左折。受付手前の撮影位置から右手にラウンジ入口。企画展示はラウンジの南側の通路。','フロアマップを拡大',true)}
   <div class="map-legend"><span><i class="legend-office"></i>オフィス・工房</span><span><i class="legend-common"></i>交流・会議スペース</span><span><i class="legend-admin"></i>管理・共用設備</span></div>
   <section class="floor-arrival" id="arrival" aria-labelledby="floor-arrival-title">
    <div><p class="eyebrow">4F RECEPTION</p><h2 id="floor-arrival-title">${paused?'図面上の中央受付':'エレベーターから中央受付へ'}</h2>
     <p>${paused?'中央エレベーターから受付までの経路を、図面に緑色の線で示しています。撮影位置の正面に受付、右手前にラウンジのガラス扉が見えます。':'中央のエレベーターで4階にお着きになりましたら、右へ進んでください。通路を左に曲がると、正面に中央受付がございます。案内図の「撮影位置」からは、正面に受付、右手前にラウンジのガラス扉が見えます。会議室へは、受付カウンターの右脇の通路をお進みください。'}</p></div>
    <figure>${img('media/f-central-reception.webp','正面の緑のカウンターに「中央受付」の表示。手前右のガラス扉と、奥に続く受付右脇の通路。','',false,[1280,853])}<figcaption>案内図の撮影位置から中央受付を望む</figcaption></figure>
   </section>
   <section class="floor-destinations" aria-labelledby="floor-destinations-title">
    <h2 id="floor-destinations-title">${paused?'案内図上の位置':'中央受付から各施設へ'}</h2>
    <dl>${floorDestinations.map(([id,title,directions,position,href])=>`<div id="floor-${id}"><dt>${link(href??('/facilities/'+id+'/'),title)}</dt><dd>${paused?position:directions}</dd></div>`).join('')}</dl>
    <p>${link('#floor-plan','図面へ戻る')}</p>
   </section>
  </section>`);
}

function inabaInterview(){
 return layout('稲葉 澪｜利用者インタビュー',heading('PEOPLE','伝わる道具を、少しずつ。')+`
  <article class="wrap article narrow prose editorial-story">
   <p class="article-meta"><time datetime="2016-03-25">2016.03.25</time><span>利用者インタビュー</span></p>
   <p class="profile-kicker">稲葉 澪 ／ 図解・案内制作</p>
   <figure>${img('media/p-inaba.webp','紙の案内図に線を書き足す稲葉さんの手元。机の右奥に樹脂の部分模型。','',true,[1100,733])}
    <figcaption>図の原稿と、線の太さや点の間隔を比べた試し刷り。2016年3月、工房にて。</figcaption></figure>
   <p>道順や道具の使い方を図にする稲葉澪さん。工房で試作を続けている立体案内図について伺いました。</p>
   <h2>曲がる手前で、指を止める</h2>
   <p>通路の角を指でたどってもらったら、曲がるところを一つ通り過ぎました。線が細いと思って太くしたら、今度は壁との区別がつかなかったんです。それで、曲がる手前に、いったん指を止められる幅を取りました。</p>
   <blockquote>同じものを見ても、必要な案内は人それぞれ。ひとつの正解だけに揃えないで作っていきたいです。</blockquote>
   <h2>次は、朝の通路で</h2>
   <p>図ができたら、人の多い朝に受付から歩いてみたいです。机の上では、迷っても後ろから誰も来ませんから。どこで立ち止まれるかは、実際に歩くと気づくことがありそうです。</p>
   <div class="editorial-related">${link('/gallery/0009/','触ってわかる案内図')}${link('/floor-map/#arrival','中央受付までの案内')}</div>
   <aside class="news-closed-note"><small>掲載情報更新 <time datetime="2019-03-31">2019.03.31</time></small><p>2019年3月、当施設での利用登録を終了しました。</p></aside>
  </article>`);
}

export const pausedFacilityPaths=['/facilities/','/facilities/staff/','/workshop/','/floor-map/','/price/','/membership/',programPath,...facilityCards.map(f=>'/facilities/'+f[0]+'/')];
export const endingNoticePaths=['/','/visit/','/news/','/news/closure/','/news/staff-change/'];
const livePublicPaths=new Set([...endingNoticePaths,...pausedFacilityPaths,'/people/asakura-tsumugi/']);
export const publicPaths=[...Object.keys(editorialPages),'/','/about/',programPath,programNotesPath,'/facilities/','/facilities/staff/','/workshop/','/gallery/','/news/','/floor-map/','/price/','/membership/','/visit/',seedCollectionPath,'/privacy/','/tenants/','/people/asakura-tsumugi/','/people/inaba-mio/','/404/',...facilityCards.map(f=>`/facilities/${f[0]}/`),...news.filter(n=>n.available).map(n=>`/news/${n.id}/`),...tenants.map(t=>`/tenants/${t.page}/`),...gallery.map(g=>`/gallery/${g.id}/`),...tenantMaterialEntries.map(material=>material.path)];

function renderPublicPage(path,{q='',ending='',origins={archive:process.env.ARCHIVE_ORIGIN||'http://127.0.0.1:4176'}}={}){
 const paused=generalUsePaused(ending);
 if(path==='/') return home(ending);
 const editorial=editorialPages[path];
 if(editorial)return layout(editorial.title,heading(editorial.en,editorial.heading||editorial.title,editorial.lead)+`<article class="wrap article narrow prose editorial-story">${editorial.date?`<p class="article-meta">${editorial.dateLabel?`<span>${esc(editorial.dateLabel)}</span>`:''}<time>${editorial.date}</time></p>`:''}${editorial.emblem?`<figure class="emblem-figure">${img('logo.png','舟と、向きと大きさの異なるふたつの葉を組み合わせたあすなろのマーク')}<figcaption>あすなろ産業支援交流施設 シンボルマーク</figcaption></figure>`:''}${editorial.image?`<figure>${img(editorial.image,editorial.imageAlt||editorial.caption)}<figcaption>${esc(editorial.caption)}</figcaption></figure>`:''}${editorial.sections.map(([title,text])=>`<section><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join('')}${editorial.quote?`<blockquote>${esc(editorial.quote)}<cite>${esc(editorial.credit)}</cite></blockquote>`:''}<div class="editorial-related">${(editorial.links||[]).map(l=>link((l.origin?origins[l.origin]:'')+l.path,l.text)).join('')}</div></article>`);

 if(path===programPath)return layout(programTitle,programExhibit(paused?facilityUseNotice():''));
 if(path===programNotesPath)return layout('企画展示・作業控え',heading('A72','企画展示・作業控え')+programBody());
 if(path==='/about/')return layout('あすなろについて',heading('ABOUT','あすなろについて','人と技術の出会いから、暮らしと産業の明日を支えます。')+`<section class="wrap editorial"><div class="editorial-image">${img('exterior.webp','あすなろの建物')}</div><div class="editorial-copy"><h2>異なる歩みが、<br>同じ場所で出会う。</h2><p>企業、研究者、個人のつくり手。あすなろには、さまざまな分野に取り組む方々が集まっています。</p><p>私たちは、交流の場と試作の環境を整え、それぞれの可能性が広がるきっかけをつくってまいります。</p><blockquote>異なる木が、それぞれの役割で、同じ舟を支える。<cite class="seed-note-line">設立者 榊原惟臣${seedNoteButton('/about/')}</cite></blockquote></div></section><section class="wrap section narrow"><h2>沿革</h2><dl class="detail-list"><div><dt>2010年6月</dt><dd>施設開設に向けた準備事業を開始</dd></div><div><dt>2012年4月1日</dt><dd>あすなろ産業支援交流施設 開設</dd></div><div><dt>2016年</dt><dd>工房と入居企業による共同試作を拡充</dd></div><div><dt>2021年</dt><dd>事業運営体制を改編</dd></div><div><dt>2026年10月</dt><dd>工房の企画展示「月に、暮らしを持っていく。」を開始</dd></div></dl><div class="about-related">${link('/about/history/','施設開設の記録')}${link(programPath,programTitle)}</div></section>`);
 if(path==='/facilities/') return layout('施設・サービス',heading('SPACE & SERVICE','施設・サービス',paused?'休止前の施設と設備をご紹介いたします。':'働く、集う、試してみる。用途に合わせた空間をご用意しております。')+(paused?facilityUseNotice():'')+`<section class="wrap section facility-grid">${facilityCards.map(f=>`<a href="/facilities/${f[0]}/" class="facility-card">${img(f[1],f[2])}<div><h2>${f[2]} ${arrow}</h2><p>${f[3]}</p></div></a>`).join('')}</section><aside class="wrap facility-workshop-highlight"><div><p class="eyebrow">4F / WORKSHOP</p><h2>工房・試作サポート</h2><p>${paused?'試作に使われた機器と、工房で製作したものをご紹介いたします。':'材料や加工方法を、作りたいものに合わせてご相談いただけます。'}</p></div>${link('/workshop/','工房のご案内','button dark')}</aside><aside class="wrap staff-callout"><div><p class="eyebrow">OUR TEAM</p><h2>施設職員紹介</h2><p>${paused?'受付と工房の仕事を、職員への取材からご紹介いたします。':'見学や試作をご案内する、受付と工房の職員をご紹介いたします。'}</p></div>${link('/facilities/staff/','職員紹介を見る','button outline')}</aside><section class="wrap floor-callout"><p class="eyebrow seed-note-line seed-note-line-center">4F FLOOR GUIDE${seedNoteButton('/facilities/')}</p><h2>フロアマップ</h2><p>4階の各施設と共用設備をご確認いただけます。</p>${link('/floor-map/','フロアマップを見る','button dark')}</section>`);
 if(path==='/facilities/staff/')return staffPage(paused);
 const f=facilityCards.find(f=>path===`/facilities/${f[0]}/`);
 if(f)return facilityPage(f,paused);
 if(path==='/workshop/')return workshopPage(paused);
 if(path==='/gallery/')return galleryPage(q);
 const g=gallery.find(g=>path===`/gallery/${g.id}/`);
 if(g){
  const list=g.listed?'/gallery/#work-'+g.id:'/gallery/';
  const returnContext=g.listed?` data-gallery-return="${esc(g.tag)}"`:'';
  return layout(g.title,heading('FABRICATION GALLERY',g.title)+`<article class="wrap article"><div class="article-meta"><time datetime="${g.date.replaceAll('.','-')}">掲載 ${g.date}</time><span class="tag">${g.tag}</span><span>No. ${g.id}</span></div><button type="button" class="photo-button gallery-photo-button" data-image-open="/assets/${g.image}" aria-label="写真を拡大">${img(g.image,g.imageAlt||g.title,'article-photo',true)}<span class="gallery-zoom-label" aria-hidden="true">写真を拡大</span></button><div class="prose"><p>${g.body}</p><dl class="detail-list"><div><dt>製作方法</dt><dd>${g.tag}</dd></div><div><dt>製作場所</dt><dd>${g.key==='metal-lattice'?'専用加工室（職員管理）':'4階 工房'}</dd></div>${g.record?`<div><dt>照合資料番号</dt><dd>${g.record}${g.recordUpdated?`<small class="record-revision">参照欄の更新：${g.recordUpdated}</small>`:""}</dd></div>`:''}</dl></div><div class="button-row gallery-detail-links">${(g.links||[]).map(l=>link(l.path,l.text,'button dark')).join('')}<a class="button outline" href="${list}"${returnContext}>制作物ギャラリーへ戻る</a></div></article>`);
 }
 if(path==='/floor-map/')return floorGuide(paused);
 if(path==='/news/')return layout('お知らせ',heading('INFORMATION','お知らせ')+`<section class="wrap section news-archive">${ending?`<a class="closure-notice" href="/news/${ending==='end2'?'staff-change':'closure'}/">${ending==='end2'?'工房技術相談の担当変更について':'施設の利用休止について'} </a>`:''}${newsFilters(news.filter(n=>n.listed))}${rows(news.filter(n=>n.listed))}<nav class="news-pagination" aria-label="お知らせのページ"></nav><p class="seed-note-line news-index-note">掲載順${seedNoteButton('/news/')}</p></section>`);
 const n=news.find(n=>path===`/news/${n.id}/`);
 if(n&&n.available)return layout(n.title,heading('INFORMATION',n.title)+`<article class="wrap article narrow"><div class="article-meta"><time datetime="${n.date.replaceAll('.','-')}">${n.date}</time><span class="tag">${n.tag}</span></div><div class="prose">${newsContent(n,origins)}</div><div class="article-return">${link('/news/','お知らせ一覧へ')}</div></article>`,{legacy:n.legacyAccess});
 if(path==='/news/closure/'||path==='/news/staff-change/'){if(path==='/news/closure/'&&!paused||path==='/news/staff-change/'&&ending!=='end2')return null;const staff=path.includes('staff-change');return layout(staff?'工房技術相談の担当変更について':'施設の利用休止について',heading('INFORMATION',staff?'工房技術相談の担当変更について':'施設の利用休止について')+`<article class="wrap article narrow prose"><time>2026.11.06</time><p>${staff?'工房の技術相談担当を変更いたしました。これまでの担当者宛てのご連絡は、運営事務局にて承ります。設備の利用時間に変更はございません。':'施設運営に関する調査のため、当面の間、一般利用を休止いたします。利用者の皆様の所在確認と支援、記録の保全を優先して進めております。再開の予定は未定です。'}</p>${ending==='end3'?'<p>共同事業および外部への資料移管についても、独立した調査を実施しております。</p>':''}${link('/','トップページへ')}</article>`);}
 if(path==='/membership/'&&paused)return layout('会員のご案内',heading('MEMBERSHIP','会員のご案内','休止前の会員区分と、登録済みの方へのご案内です。')+facilityUseNotice()+`
  <section class="wrap article narrow prose">
   <h2>休止前の会員区分</h2><dl class="detail-list"><div><dt>月額会員</dt><dd>ラウンジ、会議室、工房を利用する区分です。</dd></div><div><dt>オフィス会員</dt><dd>法人・個人事業者が個室を事業や研究に利用する区分です。</dd></div></dl>
   <p>登録済みの方は、連絡や資料を会員サイトからご確認いただけます。</p><div class="button-row">${link('/members/','既存会員の方はこちら','button dark')}${seedNoteButton('/membership/')}</div>
  </section>`);
 if(path==='/membership/')return layout('会員のご案内',heading('MEMBERSHIP','会員のご案内','仕事や研究、ものづくりの拠点としてご利用いただけます。')+`<section class="wrap article narrow"><div class="notice"><span class="eyebrow">受付状況</span><h2>現在、新規受付を休止しております。</h2><p>月額会員および個室オフィスは定員に達しております。受付再開の際は、お知らせにてご案内いたします。</p></div><div class="prose"><h2>月額会員</h2><p>ラウンジ、会議室、工房などをご利用いただけます。日常の仕事や共同事業の拠点として、企業・個人の方にご利用いただいております。</p><h2>オフィス会員</h2><p>独立した個室を事業や研究の拠点としてご利用いただけます。法人・個人事業の方を対象として、事業内容と利用計画を確認のうえ、区画ごとに契約を承っております。</p><h2>ご入会までの流れ</h2><p>募集を行う際は、施設見学、利用計画のご相談、登録内容の確認、契約のお手続きの順にご案内いたします。現在は定員に達しているため、新規のお申し込みは受け付けておりません。</p><h2>よくあるご質問</h2><h3>工房の経験がなくても利用できますか。</h3><p>スタッフによる製作支援をご利用いただけます。材料と用途を確認し、加工方法をご提案いたします。入居企業・登録会員の工房利用は無料です。</p><h3>会議室の利用料は月額会費に含まれますか。</h3><p>会議室の利用料は別途申し受けます。予約前に${link('/price/','料金のご案内')}をご確認ください。</p><div class="button-row"> ${link('/members/','既存会員の方はこちら','button dark')}${link('/visit/','見学のご案内')}${seedNoteButton('/membership/')}</div></div></section>`);
 if(path==='/price/')return layout('料金のご案内',heading('PRICE','料金のご案内')+(paused?facilityUseNotice():'')+`<section class="wrap article narrow prose"><p>${paused?'休止前の利用料です。表示金額は税込です。':'表示金額は税込です。工房は入居企業・登録会員に無料でご利用いただけます。'}</p><div class="table-scroll"><table><caption class="seed-note-line price-note">施設利用料${seedNoteButton('/price/')}</caption><thead><tr><th>区分</th><th>料金</th><th>単位</th></tr></thead><tbody><tr><td>ラウンジ月額会員</td><td>11,000円</td><td>月額</td></tr><tr><td>会議室A（24名）</td><td>2,200円</td><td>1時間</td></tr><tr><td>会議室B・C（6名）</td><td>880円</td><td>1時間</td></tr><tr><td>会議室D（10名）</td><td>1,320円</td><td>1時間</td></tr><tr><td>工房設備・少量試作</td><td>無料</td><td>入居企業・登録会員</td></tr><tr><td>プレゼンテーションホール（60名）</td><td>3,300円</td><td>1時間</td></tr><tr><td>3階ホール（500名）</td><td>11,000円</td><td>1時間</td></tr><tr><td>個室オフィス</td><td>区画別に設定</td><td>月額</td></tr></tbody></table></div>${paused?'':`<p>会議室・工房のご利用は会員サイトからお申し込みください。</p>${link('/members/reservations/','利用申請','button dark')}`}</section>`);
 if(path===seedCollectionPath)return receptionCopyPage();
 if(path==='/visit/')return layout('見学のご案内',heading('VISIT','見学のご案内')+`<section class="wrap article narrow prose visit-guide">${paused?`<h2>見学の受付を休止しております。</h2><p>施設の一般利用休止に伴い、見学のご案内を休止しております。</p><div class="button-row">${link('/news/closure/','一般利用休止のお知らせ','button dark')} ${link('/floor-map/','4階フロアマップ','button outline')}</div>`:`<h2>施設の雰囲気を、実際に。</h2><p>平日9時から17時まで、ラウンジと共用エリアの見学を承っております。中央受付にお立ち寄りください。混雑時にはお待ちいただく場合がございます。</p><p>個室オフィスおよび製作中の工房内は、ご利用者の活動を優先してご案内しております。</p><div class="button-row">${link('/guide/access/','アクセス','button dark')} ${link('/floor-map/','4階フロアマップ','button outline')}</div>`}<p class="visit-form-edition seed-note-line"><span>見学案内 第4版</span><span>2026年10月改訂</span>${seedNoteButton('/visit/')}</p></section>`);
 if(path==='/privacy/')return layout('個人情報の取り扱いについて',heading('PRIVACY','個人情報の取り扱いについて')+`<section class="wrap article narrow prose"><p>施設の利用申請、資料照会においてお預かりした情報は、ご利用に関する確認と連絡のために使用いたします。</p><h2>会員情報</h2><p>会員情報は、本人および所属する事業者の登録内容に基づいて管理しております。変更のご連絡は会員サイトの運営事務局窓口にて承ります。</p><h2>記録資料</h2><p>共同事業の記録には、事業ごとの閲覧区分を設けております。取得した資料は、関係する利用条件に従ってお取り扱いください。</p></section>`);
 if(path==='/tenants/')return layout('入居者紹介',heading('TENANTS','入居者紹介','あすなろで活動する企業と、これまでの入居企業をご紹介いたします。')+`<section class="wrap article">${tenantCards(tenants.filter(t=>t.listed))}</section>`);
 const material=tenantMaterialEntries.find(entry=>entry.path===path);
 if(material)return tenantMaterialPage(material);
 const t=tenants.find(t=>path===`/tenants/${t.page}/`);
 if(t)return tenantProfile(t);
 if(path==='/people/asakura-tsumugi/')return layout('朝倉 紬乃｜制作と活動の記録',heading('PEOPLE','朝倉 紬乃')+`<article class="wrap article narrow prose"><p class="profile-kicker">TSUMUGINO ASAKURA / FABRICATION</p><p>1993年6月18日生まれ。2012年からあすなろの個人会員として制作を始め、2015年より工房の技術支援に従事。生活道具の製作と、過去の制作記録の保全に取り組んでいます。</p>${img('media/p-asakura.webp','2017年、工房の取材時に撮影した朝倉紬乃')}<h2>制作について</h2><p>最初の頃、治具を割ってしまって、もう来ない方がいいのかと聞いたことがあります。榊原先生は、工房の費用で交換できると説明してから、「失敗した人を追い出したら、誰も試せないでしょう」と笑いました。私も同じ説明をできる側になりたいと思いました。</p><p>使った人がいなくなった道具にも、直した跡が残っています。捨てる前に、誰がどこを変えたのか調べるのが好きです。先生の言葉を記録する仕事も、そこから続いています。</p><h2>工房で教わったこと</h2><p>2021年、初めて工房に来た瀬尾灯さんに、機械と材料の扱いをご案内しました。私と一つ違いの年齢で、設計の仕事を経て作業療法士になったと伺いました。困りごとを聞くとすぐ図面を描き始めるので、三枝律と一緒に、今日はどこまで作るかと相談したものです。</p></article>`);
 if(path==='/people/inaba-mio/')return inabaInterview();
 if(path==='/search/'){const keyword=q.trim();const hits=keyword?searchEntries.filter(x=>matchesSearch(x,keyword)&&(ending!=='end2'||x.url!=='/people/asakura-tsumugi/')):[];return layout('サイト内検索',heading('SITE SEARCH','サイト内検索')+`<section class="wrap article narrow"><p class="search-scope">施設サイトの公開ページを検索できます。</p><form method="get" class="search-box"><input type="search" name="q" value="${esc(keyword)}" aria-label="キーワード" placeholder="キーワード" required><button type="submit">検索</button></form><p class="small muted" role="status" aria-live="polite">${keyword?`「${esc(keyword)}」の検索結果　${hits.length}件`:''}</p><div class="search-results">${hits.map(h=>`<a href="${h.url}">${h.published?`<time class="search-result-date" datetime="${esc(h.published)}">${esc(h.published.replaceAll('-','.'))}</time>`:''}<h2>${esc(h.title)}</h2><p>${esc(searchExcerpt(h))}</p></a>`).join('')}${keyword&&!hits.length?'<p>該当するページはありません。</p>':''}</div></section>`);}
 return null;
}

function decoratePublicPage(html,path,ending){
 if(generalUsePaused(ending))html=html?.replace(siteOperation(),siteOperation(ending));
 if(livePublicPaths.has(path)||path==='/404/')html=html?.replace('<body ','<body data-public-outcome="true" ');
 return decoratePage(html,{kind:'main',path});
}

export function notFound(ending=''){return decoratePublicPage(layout('ページが見つかりません',`<section class="wrap error-content"><p class="error-code">404</p><h1>ページが見つかりません。</h1><p>お探しのページは移動、または削除された可能性があります。<br>URLをご確認のうえ、再度お試しください。</p>${link('/','トップページへ','button dark')}</section>`,{kind:'error-page'}),'/404/',ending);}

export function renderPublic(path,options={}){return decoratePublicPage(renderPublicPage(path,options),path,options.ending);}
