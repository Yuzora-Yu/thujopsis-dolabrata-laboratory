import {readFile,writeFile,mkdir,cp,unlink} from 'node:fs/promises';
import {createHash,createCipheriv,pbkdf2Sync,randomBytes} from 'node:crypto';
import path from 'node:path';
import {accounts,documents,searchEntries} from '../src/content.mjs';
import {publicPaths,renderPublic,notFound} from '../src/render.mjs';
import {renderMember,loginPage,memberLayout,agencyPage} from '../src/member.mjs';
import {archivePublicPaths,renderLegacy,legacyLogin} from '../src/legacy.mjs';
import {archiveTicket,archiveNotes} from '../src/world/archive-data.mjs';
import {projects} from '../src/world/projects.mjs';
import {makeArchive} from '../src/archive.mjs';
import {hostingOrigins,rewriteHostedHtml} from '../src/hosting.mjs';

const base=(process.env.PAGES_BASE_PATH||'/thujopsis-dolabrata-laboratory').replace(/\/$/,'');
if(base&&!/^\/[a-zA-Z0-9_-]+$/.test(base))throw new Error('Invalid Pages base path');
const out=path.resolve('dist/pages'),origins=hostingOrigins(base||''),stageValues={initial:{contact:false,ending:''},contact:{contact:true,ending:''},end1:{contact:true,ending:'end1'},end2:{contact:true,ending:'end2'},end3:{contact:true,ending:'end3'}};
await mkdir(path.join(out,'assets/portal'),{recursive:true});
await cp('public/assets',path.join(out,'assets'),{recursive:true});
for(const name of ['styles.css','app.js','seed-drift.js','member-reading.js','reading-state.js'])await cp('public/'+name,path.join(out,name));
await cp('src/search.mjs',path.join(out,'search-engine.js'));await cp('src/evidence.mjs',path.join(out,'evidence.js'));await cp('scripts/static-runtime.js',path.join(out,'static-runtime.js'));
function hosted(html,kind='main'){
 const result=rewriteHostedHtml(html,{kind,origins,basePath:base});
 return result.replace('</head>',`<meta name="asunaro-base" content="${base}"><script type="module" src="${base}/static-runtime.js"></script></head>`);
}
function initialShell(html){
 // The static login shell is replaced after its data has loaded. Keep it inert
 // until then so a slow connection cannot submit GitHub Pages' fallback form.
 return html.replace(/<form\b([^>]*\bmethod="post"[^>]*)>([\s\S]*?)<\/form>/gi,(_,attributes,body)=>
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
const portalPaths=['/members/','/members/login/','/members/records/','/members/activity/','/members/messages/','/members/projects/','/members/organization/','/members/reservations/','/members/inquiry/','/members/contact/','/members/contact/received/','/members/personal/',...documents.map(d=>`/members/records/${d.id}/`),...projects.map(p=>`/members/projects/${p.slug}/`)];
for(const route of portalPaths)await page(route,route==='/members/login/'?loginPage('@@CSRF@@',{next:route}):memberLayout('会員サイト','<section class="portal-loading" role="status"><p>ページを読み込んでいます。</p></section>'));
for(const route of archivePublicPaths)await page(route,renderLegacy(route,{...ctxBase,session:{}}),'archive');
await page('/room/',legacyLogin('@@CSRF@@'),'archive');
for(const n of archiveNotes)await page(`/room/records/${n.id}/`,legacyLogin('@@CSRF@@'),'archive');
for(const kind of ['hozen','audit'])for(const route of ['/','/receive/','/received/'])await page(route,agencyPage(kind,route,{caseId:'@@CASE@@',origins}),kind);
for(const route of ['/news/closure/','/news/staff-change/'])await page(route,notFound());

const baseZip=(await makeArchive(new URL('../src/archive.mjs',import.meta.url))).toString('base64');
const completeZip=(await makeArchive(new URL('../src/archive.mjs',import.meta.url),{complete:true})).toString('base64');
const ended=memberLayout('登録終了','<h1>この登録は終了しました。</h1><p>運営事務局にお問い合わせください。</p>');
function outcomeViews(ending){
 const state={...ctxBase,caseState:{contact:true,ending,truth:ending==='end3'}};const views={};
 for(const route of ['/','/news/','/news/closure/','/news/staff-change/']){const html=renderPublic(route,{ending,origins});if(html)views['main:'+route]=hosted(html);}
 if(ending==='end2')views['main:/people/asakura-tsumugi/']=hosted(notFound());
 const kind=ending==='end3'?'audit':'hozen';
 if(ending!=='end2')views[kind+':/received/']=hosted(agencyPage(kind,'/received/',{caseId:'@@CASE@@',origins,received:true,ending}),kind);
 return views;
}
async function encryptedBundle(namespace,id,password,payload){
 const identifier=createHash('sha256').update(namespace+':'+id).digest('hex'),salt=createHash('sha256').update('ASUNARO-PREVIEW-1:'+namespace+':'+id).digest().subarray(0,16);
 const iterations=120000,key=pbkdf2Sync(id+'\0'+password,salt,iterations,32,'sha256'),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final(),cipher.getAuthTag()]);
 await writeFile(path.join(out,'assets/portal',identifier+'.json'),JSON.stringify({format:1,iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),data:encrypted.toString('base64')}));
}
for(const [id,account] of Object.entries(accounts)){
 const baseContext={...ctxBase,account};const pages={};
 for(const route of portalPaths.filter(p=>!p.includes('/records/')||p==='/members/records/')){const html=renderMember(route,baseContext);if(html)pages[route]=hosted(html);}
 const docs=documents.filter(d=>d.roles.includes(account.role)).map(d=>({id:d.id,title:d.title,date:d.date,owner:d.owner,inquiry:!!d.inquiry,html:hosted(renderMember(`/members/records/${d.id}/`,baseContext))}));
 const stages={};
 for(const [key,value]of Object.entries(stageValues)){
  stages[key]={};const ctx={...baseContext,caseState:{...value,truth:account.role==='asakura'}};
  for(const route of ['/members/','/members/messages/','/members/activity/','/members/reservations/','/members/contact/received/'])stages[key][route]=hosted(renderMember(route,ctx));
 }
 const downloads={};
 if(account.role==='institution')downloads['hozen.zip']={name:'保全資料_20261102.zip',type:'application/zip',data:baseZip};
 if(account.role==='asakura'){
  downloads['complete.zip']={name:'原本および移送関係資料.zip',type:'application/zip',data:completeZip};
  for(const name of ['records.json','continuity.json'])downloads[name]={name,type:'application/json',data:(await readFile('private/'+name)).toString('base64')};
 }
 const outcomes=account.role==='institution'||account.role==='asakura'?{end1:outcomeViews('end1'),end2:outcomeViews('end2'),...(account.role==='asakura'?{end3:outcomeViews('end3')}:{})}:{};
 const pending=hosted(agencyPage('audit','/received/',{caseId:'@@CASE@@',origins,received:true,pending:true}),'audit');
 await encryptedBundle('member',id,account.password,{account:{...account,password:undefined,id},pages,docs,stages,downloads,outcomes,pending,ended:hosted(ended)});
}
const roomPages={};for(const route of ['/room/',...archiveNotes.map(n=>`/room/records/${n.id}/`)])roomPages[route]=hosted(renderLegacy(route,{...ctxBase,session:{archiveAccess:archiveTicket.id}}),'archive');
await encryptedBundle('archive',archiveTicket.id,archiveTicket.code,{pages:roomPages});
await writeFile(path.join(out,'assets/site-index.json'),JSON.stringify({entries:searchEntries,login:hosted(loginPage('@@CSRF@@')),loginError:hosted(loginPage('@@CSRF@@',{error:'会員IDまたはパスワードをご確認ください。'})),archiveLogin:hosted(legacyLogin('@@CSRF@@')),archiveError:hosted(legacyLogin('@@CSRF@@',{error:'閲覧票番号と照会符号をご確認ください。'})),notFound:hosted(notFound()),agency:{hozen:hosted(agencyPage('hozen','/receive/',{caseId:'@@CASE@@',origins}),'hozen'),audit:hosted(agencyPage('audit','/receive/',{caseId:'@@CASE@@',origins}),'audit')}}));
const manifest=path.join(out,'pages-manifest.json');let previous=[];try{previous=JSON.parse(await readFile(manifest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const old of previous.filter(f=>!generated.includes(f))){const target=path.resolve(out,old);if(!target.startsWith(out+path.sep))throw new Error('Invalid generated path');await unlink(target).catch(e=>{if(e.code!=='ENOENT')throw e;});}
await writeFile(manifest,JSON.stringify(generated));
console.log(`Built GitHub Pages preview: ${generated.length} pages, encrypted member bundles, base ${base||'/'}.`);
