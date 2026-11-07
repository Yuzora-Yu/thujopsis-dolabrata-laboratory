import {recordMedia,mayReadRecordMedia} from '../src/record-media.mjs';
import {readFile,writeFile,mkdir,cp,unlink} from 'node:fs/promises';
import {createHash,createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
import path from 'node:path';
import {accounts,documents,searchEntries} from '../src/content.mjs';
import {publicPaths,pausedFacilityPaths,endingNoticePaths,renderPublic,notFound,layout} from '../src/render.mjs';
import {decoratePage,withPlayerAssets} from '../src/experience.mjs';
import {renderMember,loginPage,memberLayout,agencyPage} from '../src/member.mjs';
import {archivePublicPaths,renderLegacy,legacyLayout,legacyLogin} from '../src/legacy.mjs';
import {archiveTicket,archiveNotes} from '../src/world/archive-data.mjs';
import {projects} from '../src/world/projects.mjs';
import {subjectViews} from '../src/world/lab-data.mjs';
import {labConsoleAsset} from '../src/lab.mjs';
import {makeArchive} from '../src/archive.mjs';
import {hostingOrigins,rewriteHostedHtml} from '../src/hosting.mjs';
import {prepareBrowserAssets,versionHtmlAssets} from './browser-assets.mjs';

const base=(process.env.PAGES_BASE_PATH||'/thujopsis-dolabrata-laboratory').replace(/\/$/,'');
if(base&&!/^\/[a-zA-Z0-9_-]+$/.test(base))throw new Error('Invalid Pages base path');
const out=path.resolve('dist/pages'),origins=hostingOrigins(base||''),stageValues={initial:{contact:false,ending:''},contact:{contact:true,ending:''},end1:{contact:true,ending:'end1'},end2:{contact:true,ending:'end2'},end3:{contact:true,ending:'end3'}};
await mkdir(path.join(out,'assets/portal'),{recursive:true});
await cp('public/assets',path.join(out,'assets'),{recursive:true});
const rootAssets=['styles.css','app.js','photo-pan.js','seed-drift.js','member-reading.js','reading-state.js','lab-core.js','lab-console.js'];
for(const name of rootAssets)await cp('public/'+name,path.join(out,name));
const sourceAssets={'search-engine.js':'src/search.mjs','evidence.js':'src/evidence.mjs','assets/player-state.js':'src/player-state.mjs','static-runtime.js':'scripts/static-runtime.js'};
for(const [name,source]of Object.entries(sourceAssets))await cp(source,path.join(out,name));
const labVersion=createHash('sha256').update((await readFile('public/lab-console.js','utf8')).replaceAll('\r\n','\n')).digest('hex').slice(0,16);
if(labConsoleAsset!==`/lab-console.js?v=${labVersion}`)throw new Error('Update labConsoleAsset to match public/lab-console.js');
const assetPaths=[...rootAssets,...Object.keys(sourceAssets),'assets/player-record.js','assets/player-record.css','assets/reservation-policy.js'];
const browserAssets=prepareBrowserAssets(Object.fromEntries(await Promise.all(assetPaths.map(async name=>[name,await readFile(path.join(out,name),'utf8')]))));
for(const [name,asset]of browserAssets)await writeFile(path.join(out,name),asset.content);
function hosted(html,kind='main'){
 // Portal and private-room loading shells intentionally carry no story marker,
 // but their head must load the player module before decrypted body views arrive.
 html=withPlayerAssets(html);
 const result=rewriteHostedHtml(html,{kind,origins,basePath:base}).replace('</head>',`<meta name="asunaro-base" content="${base}"><meta name="asunaro-static" content="true"><script type="module" src="${base}/static-runtime.js"></script></head>`);
 return versionHtmlAssets(result,{assets:browserAssets,basePath:base});
}
function initialShell(html){
 // The static login shell is replaced after its data has loaded. Keep it inert
 // until then so a slow connection cannot submit GitHub Pages' fallback form.
 return html.replace('<body ','<body data-player-pending="true" ').replace(/<form\b([^>]*\bmethod="post"[^>]*)>([\s\S]*?)<\/form>/gi,(_,attributes,body)=>
  `<form${attributes} aria-busy="true">${body.replace(/<(input|button|select|textarea)\b/gi,'<$1 disabled')}</form>`);
}
const generated=[];
async function page(route,html,kind='main'){
 const prefix=kind==='main'?'':new URL(origins[kind],'https://static.invalid').pathname.slice(base.length);
 const file=path.join(out,(prefix+route).replace(/^\//,''),'index.html');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,initialShell(hosted(html,kind)));generated.push(path.relative(out,file).replaceAll(path.sep,'/'));
}
for(const route of publicPaths)await page(route,route==='/404/'?notFound():renderPublic(route,{origins}));
await page('/search/',renderPublic('/search/',{origins}));
await writeFile(path.join(out,'404.html'),hosted(notFound()));generated.push('404.html');
await writeFile(path.join(out,'.nojekyll'),'');
const ctxBase={csrf:'@@CSRF@@',caseId:'@@CASE@@',query:new URLSearchParams(),origins,caseState:{contact:false,ending:'',truth:false}};
const recordPaths = new Set(documents.map(document => `/members/records/${document.id}/`));
const portalPaths=['/members/','/members/login/','/members/records/','/members/activity/','/members/messages/','/members/projects/','/members/organization/','/members/reservations/','/members/inquiry/','/members/contact/','/members/contact/received/','/members/personal/',...recordPaths,...projects.map(p=>`/members/projects/${p.slug}/`)];
for (const route of portalPaths) {
 const marker = recordPaths.has(route) ? ' data-record-shell="registered"' : '';
 const shell = `<section class="portal-loading" role="status"${marker}><p>ページを読み込んでいます。</p></section>`;
 const html = route === '/members/login/' ? loginPage('@@CSRF@@',{next:route}) : memberLayout('会員サイト',shell);
 await page(route,html);
}
for(const route of archivePublicPaths)await page(route,renderLegacy(route,{...ctxBase,session:{}}),'archive');
const archiveLoading=legacyLayout('資料照会室','<p data-archive-loading role="status">資料を読み込んでいます。</p>');
for(const route of ['/room/','/room/console/','/room/console/subjects/',...archiveNotes.map(n=>`/room/records/${n.id}/`)]){
 await page(route,archiveLoading,'archive');
}
for(const kind of ['hozen','audit'])for(const route of ['/','/receive/','/received/'])await page(route,agencyPage(kind,route,{caseId:'@@CASE@@',origins,receipt:route==='/'?'':'loading'}),kind);
// The notice is conditional, so its first paint must not assert that it is missing.
// Keep the ordinary unresolved-page index until the saved outcome is checked.
const noticeLoading=decoratePage(layout('お知らせ','<section class="wrap article narrow prose"><h1>お知らせ</h1><p data-public-notice-loading role="status">お知らせを確認しております。</p></section>'),{kind:'main',path:'/404/'}).replace('<body ','<body data-public-outcome="true" ');
for(const route of ['/news/closure/','/news/staff-change/'])await page(route,noticeLoading);

const baseZip=(await makeArchive(new URL('../src/archive.mjs',import.meta.url))).toString('base64');
const completeZip=(await makeArchive(new URL('../src/archive.mjs',import.meta.url),{complete:true})).toString('base64');
const ended=memberLayout('登録終了','<h1>この登録は終了しました。</h1><p>運営事務局にお問い合わせください。</p>');
const pausedPublicViews=Object.fromEntries(pausedFacilityPaths.map(route=>[route,hosted(renderPublic(route,{ending:'end1',origins}))]));
function outcomeViews(ending){
 const views={};
 for(const route of endingNoticePaths){const html=renderPublic(route,{ending,origins});if(html)views['main:'+route]=hosted(html);}
 if(ending==='end2')views['main:/people/asakura-tsumugi/']=hosted(notFound());
 const kind=ending==='end3'?'audit':'hozen';
 if(ending!=='end2')views[kind+':/received/']=hosted(agencyPage(kind,'/received/',{caseId:'@@CASE@@',origins,receipt:'received'}),kind);
 return views;
}
const auditForms={
 additional:hosted(agencyPage('audit','/receive/',{caseId:'@@CASE@@',origins,additional:true}),'audit'),
 pending:hosted(agencyPage('audit','/received/',{caseId:'@@CASE@@',origins,receipt:'pending'}),'audit'),
 transferred:hosted(agencyPage('audit','/received/',{caseId:'@@CASE@@',origins,receipt:'transferred'}),'audit'),
};
async function encryptedBundle(namespace,id,password,payload){
 const identifier=createHash('sha256').update(namespace+':'+id).digest('hex'),salt=createHash('sha256').update('ASUNARO-PREVIEW-1:'+namespace+':'+id).digest().subarray(0,16);
 const iterations=120000,key=pbkdf2Sync(id+'\0'+password,salt,iterations,32,'sha256'),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final(),cipher.getAuthTag()]);
 await writeFile(path.join(out,'assets/portal',identifier+'.json'),JSON.stringify({format:1,iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),data:encrypted.toString('base64')}));
}
// Large attachments have separate ciphertext; the credential bundle carries
// keys only for the editions accessible to that role. Fetch on explicit click.
const protectedMedia={};await mkdir(path.join(out,'assets/record-media'),{recursive:true});
for(const file of recordMedia){
 const key=randomBytes(32),iv=randomBytes(12),relative='assets/record-media/'+randomBytes(20).toString('hex')+'.json';
 const cipher=createCipheriv('aes-256-gcm',key,iv),clear=await readFile('private/record-media/'+file.filename);
 const encrypted=Buffer.concat([cipher.update(clear),cipher.final(),cipher.getAuthTag()]);
 await writeFile(path.join(out,relative),JSON.stringify({iv:iv.toString('base64'),data:encrypted.toString('base64')}));generated.push(relative);
 protectedMedia[file.filename]={name:file.filename,type:file.type,path:base+'/'+relative,key:key.toString('base64')};
}
for(const [id,account] of Object.entries(accounts)){
 const baseContext={...ctxBase,account};const pages={};
 for(const route of portalPaths.filter(p=>!p.includes('/records/')||p==='/members/records/')){const html=renderMember(route,baseContext);if(html)pages[route]=hosted(html);}
 const docs=documents.filter(d=>d.roles.includes(account.role)).map(d=>({id:d.id,title:d.title,date:d.date,owner:d.owner,inquiry:!!d.inquiry,html:hosted(renderMember(`/members/records/${d.id}/`,baseContext))}));
 const stages={};
 for(const [key,value]of Object.entries(stageValues)){
  stages[key]={};const ctx={...baseContext,caseState:{...value,truth:account.role==='asakura'}};
  for(const route of ['/members/','/members/messages/','/members/activity/','/members/reservations/','/members/contact/received/','/members/inquiry/'])stages[key][route]=hosted(renderMember(route,ctx));
 }
 const downloads=Object.fromEntries(recordMedia.filter(file=>mayReadRecordMedia(file.filename,account.role)).map(file=>[file.filename,protectedMedia[file.filename]]));
 if(account.role==='institution')downloads['hozen.zip']={name:'保全資料_20261102.zip',type:'application/zip',data:baseZip};
 if(account.role==='asakura'){
  downloads['complete.zip']={name:'原本および移送関係資料.zip',type:'application/zip',data:completeZip};
  for(const name of ['records.json','continuity.json'])downloads[name]={name,type:'application/json',data:(await readFile('private/'+name)).toString('base64')};
 }
 const outcomes=account.role==='institution'||account.role==='asakura'?{end1:outcomeViews('end1'),end2:outcomeViews('end2'),...(account.role==='asakura'?{end3:outcomeViews('end3')}:{})}:{};
 await encryptedBundle('member',id,account.password,{account:{...account,password:undefined,id},pages,docs,stages,downloads,outcomes,pausedPublic:outcomes.end1?pausedPublicViews:undefined,auditForms:outcomes.end1?auditForms:undefined,ended:hosted(ended)});
}
const roomPages={};for(const route of ['/room/','/room/console/','/room/console/subjects/',...archiveNotes.map(n=>`/room/records/${n.id}/`)])roomPages[route]=hosted(renderLegacy(route,{...ctxBase,session:{archiveAccess:archiveTicket.id}}),'archive');
await encryptedBundle('archive',archiveTicket.id,archiveTicket.code,{pages:roomPages,labSubjects:{initial:subjectViews({}),current:subjectViews({contact:true}),end3:subjectViews({ending:'end3'})}});
await writeFile(path.join(out,'assets/site-index.json'),JSON.stringify({edition:randomBytes(12).toString('hex'),entries:searchEntries,login:hosted(loginPage('@@CSRF@@')),loginError:hosted(loginPage('@@CSRF@@',{error:'会員IDまたはパスワードをご確認ください。'})),archiveLogin:hosted(legacyLogin('@@CSRF@@')),archiveError:hosted(legacyLogin('@@CSRF@@',{error:'閲覧票番号と照会符号をご確認ください。'})),notFound:hosted(notFound()),agency:{hozen:hosted(agencyPage('hozen','/receive/',{caseId:'@@CASE@@',origins}),'hozen'),audit:hosted(agencyPage('audit','/receive/',{caseId:'@@CASE@@',origins}),'audit')}}));
const manifest=path.join(out,'pages-manifest.json');let previous=[];try{previous=JSON.parse(await readFile(manifest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const old of previous.filter(f=>!generated.includes(f))){const target=path.resolve(out,old);if(!target.startsWith(out+path.sep))throw new Error('Invalid generated path');await unlink(target).catch(e=>{if(e.code!=='ENOENT')throw e;});}
await writeFile(manifest,JSON.stringify(generated));
console.log(`Built GitHub Pages preview: ${generated.filter(file=>file.endsWith('.html')).length} HTML pages, ${recordMedia.length} protected attachments, base ${base||'/'}.`);
