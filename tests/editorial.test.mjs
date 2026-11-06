import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {accounts,documents,news,gallery,searchEntries} from '../src/content.mjs';
import {publicPaths,renderPublic,notFound} from '../src/render.mjs';
import {renderMember,agencyPage} from '../src/member.mjs';
import {renderLegacy} from '../src/legacy.mjs';
import {newsIsAvailable,newsIsListed} from '../src/world/editorial.mjs';
import {pageRegistry,pagePosition,experienceSettings,growthStages} from '../src/experience.mjs';
import {hintPlan} from '../docs/hint-plan.mjs';
import {seoFamily} from '../src/world/people.mjs';
import {recordText} from '../src/world/records.mjs';
import {siteQueries,catalogQueries} from '../docs/critical-queries.mjs';
import {archiveItems,archiveNotes,noticeCapture} from '../src/world/archive-data.mjs';
import {normalizeSearch,matchesSearch} from '../src/search.mjs';
import {hostingOrigins,providerRoute,rewriteHostedHtml} from '../src/hosting.mjs';
import {classifyEvidence} from '../src/evidence.mjs';
import {makeArchive,zipFiles} from '../src/archive.mjs';
import {startServers} from '../server.mjs';
const origins=hostingOrigins('https://asunaro.example');
const context=role=>({account:Object.values(accounts).find(a=>a.role===role),csrf:'test',caseId:'case',caseState:{contact:false,ending:''},query:new URLSearchParams(),origins});

test('retired recruitment articles are discoverable through records, not public lists or search',()=>{
 for(const id of ['20160520','20220715']){
  const n=news.find(n=>n.id===id);assert.ok(n.available&&!n.listed&&!n.searchable);
  assert.doesNotMatch(renderPublic('/news/'),new RegExp(`/news/${id}/`));assert.ok(!searchEntries.some(e=>e.url===`/news/${id}/`));
  assert.match(renderPublic(`/news/${id}/`),/外出|外泊/);assert.match(renderPublic(`/news/${id}/`),/無償|負担/);
 }
 const consent=documents.find(d=>d.id==='CONS-2016-005');assert.match(recordText(consent),/RE-2016-002/);
 assert.match(renderMember('/members/records/RE-2016-002/',context('ordis')),/news\/20160520/);
 assert.equal(renderMember('/members/records/GR-2022-009/',context('ordis')),null);
 assert.equal(renderMember('/members/records/QC-2026-015/',context('institution')),null);
 assert.ok(renderMember('/members/records/QC-2026-015/',context('asakura')));
 for(const id of ['ENV-2022-031','EV-2022-091','GR-2022-009'])assert.ok(renderMember(`/members/records/${id}/`,context('institution')));
 assert.match(renderMember('/members/records/GR-2022-009/',context('institution')),/自発的淘汰/);
 assert.match(renderMember('/members/records/PN-2022-034/',context('asakura')),/夏帆さんの本/);
});

test('current news has operational detail and later references do not appear in old recruitment copies',()=>{
 assert.ok(news.filter(n=>n.listed).length>=30);
 for(const n of news.filter(n=>n.listed)){assert.ok(n.sections?.length>=2,n.id);assert.ok(n.body.length+n.sections.flat().join('').length>180,n.id);}
 for(const id of ['20160520','20220715'])assert.doesNotMatch(renderPublic(`/news/${id}/`),/EV-2022|GR-2022|QC-2026|PN-2022/);
 const exposed=documents.find(d=>d.id==='PN-2022-034');assert.doesNotMatch(exposed.sections.flat().join(' '),/2026/);
});

test('the mother anchors the founding while her daughter qualifies and disappears at 28',()=>{
 const ageAt=(birth,date)=>{const b=new Date(birth),d=new Date(date);return d.getUTCFullYear()-b.getUTCFullYear()-(d.getUTCMonth()<b.getUTCMonth()||d.getUTCMonth()===b.getUTCMonth()&&d.getUTCDate()<b.getUTCDate()?1:0);};
 assert.equal(ageAt(seoFamily.akari.birthDate,'2022-07-08'),28);assert.equal(ageAt(seoFamily.akari.birthDate,'2020-04-01'),26);assert.equal(ageAt(seoFamily.akari.birthDate,seoFamily.akari.workshopStart),27);
 assert.equal(ageAt(seoFamily.fumino.birthDate,seoFamily.fumino.founderMeeting),43);
 assert.match(renderPublic('/people/seo-akari/'),/1994年生まれ/);assert.match(renderPublic('/people/seo-akari/'),/夜間3年制/);assert.match(renderPublic('/people/seo-fumino/'),/図書館/);
 const original=documents.find(d=>d.id==='OR-2006-004').sections.map(s=>s[1]).join(' ');assert.match(original,/瀬尾文乃/);assert.doesNotMatch(original,/瀬尾灯氏/);
 assert.match(recordText(documents.find(d=>d.id==='CO-2010-001'))+' '+documents.find(d=>d.id==='CO-2010-001').signoff,/FUM-2010-002/);
});

test('Akari’s trial dates and the two sets of workshop property remain distinct',()=>{
 const record=id=>documents.find(document=>document.id===id);
 const trial=record('YH-2022-034');
 assert.match(recordText(trial),/試用票の期間は8月19日から22日まで/);
 assert.match(trial.entries.find(entry=>entry.at==='2022年8月22日').text,/継続群へ編入/);
 assert.match(trial.entries.find(entry=>entry.at==='2022年8月31日').text,/一般制作の利用登録を終了/);
 assert.match(recordText(record('FAM-2022-009')),/8月19日の外出後は本人と話せず、22日の帰宅予定/);
 assert.match(archiveItems.find(item=>item.code==='NK-2022-0908').text,/22日に帰宅する予定だったが戻らず/);
 const receipt=record('PN-2022-034');
 assert.match(recordText(receipt),/以前からの預かり分（FAB-2022-071）/);
 assert.doesNotMatch(receipt.tables[0].rows.flat().join(' '),/型紙|料理帳/);
});

test('public facility routes do not announce the old archive and the first clipping is a direct PDF',()=>{
 for(const route of publicPaths){const html=renderPublic(route)||'';assert.doesNotMatch(html,/href="[^"]*(?:historical-records|127\.0\.0\.1:4176|\/snapshots\/)/,route);}
 assert.doesNotMatch(renderPublic('/about/history/'),/準備期の公開記録/);
 const loan=documents.find(d=>d.id==='FAB-2022-071');assert.equal(loan.links[0].origin,undefined);assert.equal(loan.links[0].path,'/assets/archive/younagi-20220908.pdf');
 const loanPage=renderMember('/members/records/FAB-2022-071/',context('minamo'));
 assert.match(loanPage,/<details>\s*<summary>切抜の本文を読む<\/summary>/);
 assert.doesNotMatch(loanPage,/historical-records|\/collections\/|\/snapshots\//);
 assert.doesNotMatch(renderPublic('/workshop/stories/seo-akari/'),/自助具作る女性、所在分からず/);
 for(const d of documents.filter(d=>d.roles.includes('minamo')))assert.doesNotMatch(d.sections.map(s=>s[1]).join(' '),/0000\s*一般財団/);
});

test('author search inventory names real results in the appropriate search surface',()=>{
 for(const item of siteQueries)assert.ok(searchEntries.filter(entry=>matchesSearch(entry,item.word)).some(entry=>entry.url===item.destination),item.word);
 for(const item of catalogQueries)assert.ok(archiveItems.filter(entry=>entry.listed&&matchesSearch({title:entry.title,text:entry.code+' '+entry.year},item.word)).some(entry=>item.destination===`/collections/items/${entry.id}/`),item.word);
});

test('news retention applies to visibility, direct URLs and the public search index',()=>{
 assert.equal(!!newsIsAvailable({date:'2021.11.01'}),false);assert.equal(!!newsIsAvailable({date:'2021.11.02'}),true);
 assert.equal(!!newsIsListed({date:'2012.04.01',important:true}),true);
 assert.equal(news.find(n=>n.id==='20120903').available,false);assert.equal(renderPublic('/news/20120903/'),null);
 assert.ok(!publicPaths.includes('/news/20120903/'));assert.ok(!searchEntries.some(e=>e.url==='/news/20120903/'));
 assert.match(renderPublic('/news/20220218/'),/公開から5年で非公開/);
 assert.doesNotMatch(renderPublic('/news/'),/href="\/news\/20120416\/"/);
 assert.ok(searchEntries.filter(e=>matchesSearch(e,'A4-01')).some(e=>e.url==='/news/20120416/'));
 assert.ok(!searchEntries.filter(e=>matchesSearch(e,'フロアマップ')).some(e=>e.url==='/news/20120416/'));
 const archiveContext={origins,session:{}};
 const catalogue=renderLegacy('/snapshots/2017/',archiveContext);
 for(const notice of noticeCapture.pages){
  assert.ok(notice.published<=noticeCapture.capturedOn,notice.path);
  assert.ok(catalogue.includes(notice.path),notice.path);
  const page=renderLegacy(notice.path,archiveContext);
  assert.ok(page.includes(`datetime="${notice.published}"`),notice.path);
  assert.ok(page.includes(`datetime="${noticeCapture.capturedOn}"`),notice.path);
  assert.ok(page.includes(`採録範囲 ${notice.scope}`),notice.path);
  assert.doesNotMatch(page,/RE-2022-006|2026-10-30|5年で非公開/);
 }
 const secondPhase=renderLegacy('/snapshots/2017/news/20161003/',archiveContext);
 assert.match(secondPhase,/10月3日から17日まで[\s\S]*1階・2階[\s\S]*期間の途中でも参加を終了できます/);
 assert.equal(renderPublic('/news/20161003/'),null);
 assert.ok(!searchEntries.some(entry=>entry.url==='/news/20161003/'));
});

test('opening links to naming and emblem essays while the old plan remains a later discovery',()=>{
 const opening=renderPublic('/news/20120401/');assert.match(opening,/href="\/about\/identity\/"/);assert.match(opening,/href="\/about\/emblem\/"/);assert.doesNotMatch(opening,/20120903|floor-4f-2012/);
 for(const p of ['/','/about/','/gallery/','/gallery/0002/','/news/','/about/identity/','/about/emblem/'])assert.doesNotMatch(renderPublic(p),/floor-4f-2012|asunaro-4f-2012/);
 const planCopy=renderPublic('/news/20120416/');
 assert.match(planCopy,/datetime="2012-04-16"[\s\S]*floor-4f-2012[\s\S]*配置図作成 <time datetime="2012-04-01"[\s\S]*PDF再収録 <time datetime="2026-10-30"/);
 assert.match(renderPublic('/about/identity/'),/原掲載[\s\S]*2012年9月の開設記念展示後に写真を追加/);
 const footer=notFound().match(/<div class="footer-links">([\s\S]*?)<\/div>/)[1];assert.ok(footer.indexOf('/tenants/')<footer.indexOf('/gallery/'));
 assert.match(renderPublic('/gallery/0005/'),/入居者紹介/);assert.ok(searchEntries.some(e=>e.url==='/tenants/'));
});

test('published navigation does not directly expose nonlisted gallery objects',()=>{
 const hidden=new Set(gallery.filter(g=>!g.listed).map(g=>g.id));
 for(const p of publicPaths.filter(p=>!/^\/gallery\/\d/.test(p)&&!/^\/tenants\/\d/.test(p))){const html=renderPublic(p)||'';for(const m of html.matchAll(/href="\/gallery\/(\d+)\//g))assert.ok(!hidden.has(m[1]),p+' -> '+m[1]);}
});

test('unlisted discoveries stay off external indexes while direct and internal discovery work',()=>{
 for(const url of ['/tenants/0003/','/gallery/0022/','/news/20120416/']){
  assert.match(renderPublic(url),/<meta name="robots" content="noindex,nofollow">/,url);
 }
 for(const url of ['/tenants/0002/','/gallery/0021/','/news/20120401/']){
  assert.doesNotMatch(renderPublic(url),/name="robots"/,url);
 }
 assert.ok(searchEntries.some(entry=>entry.url==='/news/20120416/'&&matchesSearch(entry,'A4-01')));
 assert.ok(!searchEntries.some(entry=>entry.url==='/tenants/0003/'));
});

test('page numbering and growth stages share a registry and sit beside the copyright',()=>{
 assert.equal(new Set(pageRegistry.map(p=>p.kind+':'+p.path)).size,pageRegistry.length);
 assert.deepEqual(pageRegistry.map(p=>p.number),Array.from({length:pageRegistry.length},(_,i)=>i+1));
 assert.ok(pageRegistry.every(p=>Number.isInteger(p.level)&&p.level>=0));
 for(const p of publicPaths)assert.ok(pagePosition('main',p),p);
 for(const html of [renderPublic('/'),renderMember('/members/',context('institution')),renderLegacy('/collections/',{origins,session:{}}),agencyPage('hozen','/receive/',{origins})]){
  assert.match(html,new RegExp('data-page-total="'+pageRegistry.length+'"'));assert.match(html,/このWebサイトの内容は考察コンテンツ/);assert.match(html,/ⓒYU-ZORA/);
  assert.match(html,/ⓒYU-ZORA<\/small><span class="page-index"/);assert.doesNotMatch(html,/\(LV\d|情報秘匿レベル/);
 }
 assert.deepEqual(growthStages.map(s=>s.name),['SEED','ROOT','SPROUT','SAPLING','BRANCH','CANOPY','HEARTWOOD']);
 assert.match(renderPublic('/'),/class="index-growth">SEED</);
 assert.match(renderMember('/members/personal/',context('asakura')),/class="index-growth">HEARTWOOD</);
 assert.equal(pagePosition('main','/members/records/AS-2024-002/').level,6);
 const previous=experienceSettings.showPageIndex;try{experienceSettings.showPageIndex=false;assert.doesNotMatch(renderPublic('/'),/class="page-index"/);}finally{experienceSettings.showPageIndex=previous;}
 const previousGrowth=experienceSettings.showGrowthStage;try{experienceSettings.showGrowthStage=false;const html=renderPublic('/');assert.doesNotMatch(html,/class="index-growth"/);assert.match(html,/class="index-number">001/);}finally{experienceSettings.showGrowthStage=previousGrowth;}
});

test('document references to later records have a sufficiently late update date',()=>{
 const numeric=date=>{const m=date.match(/(\d{4})年(\d+)月(\d+)日/);assert.ok(m,date);return Number(m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0'));};
 for(const d of documents){const latest=numeric(d.updated||d.date);assert.ok(latest>=numeric(d.date),d.id);
  const text=recordText(d);
  for(const related of documents)if(related.id!==d.id&&text.includes(related.id))assert.ok(latest>=numeric(related.date),d.id+' references '+related.id+' before creation');
 }
});

test('dated archive receipt notes do not cite documents or receipts before they exist',()=>{
 const dateValue=value=>Number(value.replace(/年|月/g,'.').replace('日','').split('.').map((part,i)=>i?part.padStart(2,'0'):part).join(''));
 for(const note of archiveNotes){
  const latest=dateValue(note.updated||note.date);assert.ok(latest>=dateValue(note.date),note.id);
  for(const d of documents)if(note.body.includes(d.id))assert.ok(latest>=dateValue(d.date),`receipt ${note.id} cites ${d.id} too early`);
  for(const match of note.body.matchAll(/受領簿(\d{4})/g)){
   const referenced=archiveNotes.find(n=>n.id===match[1]);assert.ok(referenced,match[0]);assert.ok(latest>=dateValue(referenced.date),`receipt ${note.id} cites ${referenced.id} too early`);
  }
 }
});

test('every planned hint has in-world evidence and the prerequisite graph reaches each ending',async()=>{
 const ids=new Set(hintPlan.map(h=>h.id));
 for(const h of hintPlan){assert.equal(h.hints.length,3,h.id);for(const id of [...h.requires,...(h.requiresAny||[]),...h.leads])assert.ok(ids.has(id),id);
  for(const witness of h.evidence){
   if(witness.kind==='private'){assert.equal((await readFile('private/expose.pdf')).subarray(0,5).toString(),'%PDF-');continue;}
   if(witness.kind==='asset'){assert.ok(witness.path.startsWith('/assets/'));assert.equal((await readFile('public'+witness.path)).subarray(0,5).toString(),'%PDF-');continue;}
   const ctx=context(witness.role);Object.assign(ctx.caseState,witness.state||{});
   const html=witness.kind==='main'?(witness.path==='/guide/access/'?notFound():renderPublic(witness.path)):witness.kind==='member'?renderMember(witness.path,ctx):renderLegacy(witness.path,{origins,session:{archiveAccess:witness.role==='ticket'?'H17-0038':null}});
   assert.ok(html,h.id+' missing '+witness.path);
   for(const word of witness.words)assert.ok(normalizeSearch(html).includes(normalizeSearch(word)),h.id+': '+witness.path+' lacks '+word);
  }
 }
 const reached=new Set();
 let changed=true;
 while(changed){
  changed=false;
  for(const h of hintPlan){
   if(reached.has(h.id)||!h.requires.every(id=>reached.has(id)))continue;
   if(h.requiresAny?.length&&!h.requiresAny.some(id=>reached.has(id)))continue;
   reached.add(h.id);changed=true;
  }
 }
 assert.equal(reached.size,hintPlan.length);assert.ok(reached.has('report')&&reached.has('independent'));
});

test('only intact evidence with matching source records qualifies as complete',async()=>{
 const archiveUrl=new URL('../src/archive.mjs',import.meta.url);
 const original=await makeArchive(archiveUrl),complete=await makeArchive(archiveUrl,{complete:true});
 assert.equal(classifyEvidence(original),'base');
 assert.equal(classifyEvidence(complete),'complete');
 assert.equal(classifyEvidence(Buffer.from('告発書.pdf 実験記録.enc')),null);
 assert.equal(classifyEvidence(original.subarray(0,original.length-30)),null);
 const altered=Buffer.from(complete);
 const pdfStart=altered.indexOf('%PDF-');
 assert.ok(pdfStart>0);
 altered[pdfStart+12]^=1;
 assert.equal(classifyEvidence(altered),null);

 const [pdf,records,continuity]=await Promise.all(['expose.pdf','records.json','continuity.json'].map(file=>readFile(new URL('../private/'+file,import.meta.url))));
 const recipient=JSON.parse(continuity).receiver;
 const summary=[
  {name:'告発書.pdf',data:pdf},
  {name:'実験記録.json',data:records},
  {name:'継承計画.json',data:continuity},
  {name:'資料移送記録.txt',data:`TR-2026-011\n受領先：${recipient}`},
 ];
 assert.equal(classifyEvidence(zipFiles(summary)),'base');
 assert.equal(classifyEvidence(zipFiles(summary.map(({name})=>({name,data:''})))),null);
 const unrelated={name:'文書原本.json',data:JSON.stringify({documents:[{id:'TR-2026-011',entries:[]}]})};
 assert.equal(classifyEvidence(zipFiles([...summary,unrelated])),null);
});

test('production domains and project-path previews preserve cross-site and asset links',()=>{
 const production=hostingOrigins('https://asunaro.yu-zora.com',{archive:'https://archive.asunaro.yu-zora.com'});
 assert.deepEqual(providerRoute(new URL('https://archive.asunaro.yu-zora.com/room/'),production),{kind:'archive',path:'/room/'});
 const preview=hostingOrigins('/thujopsis-dolabrata-laboratory');
 const html=rewriteHostedHtml('<a href="/room/">room</a><img src="/assets/logo.png"><form action="/room/login/"></form>',{kind:'archive',origins:preview,basePath:'/thujopsis-dolabrata-laboratory'});
 assert.match(html,/href="\/thujopsis-dolabrata-laboratory\/historical-records\/room\/"/);assert.match(html,/src="\/thujopsis-dolabrata-laboratory\/assets\/logo.png"/);
});

test('authentication expiry does not erase the case or its ending after restart',async()=>{
 const stateFile=path.resolve('.work/progress-expiry-test.json');await mkdir(path.dirname(stateFile),{recursive:true});await unlink(stateFile).catch(e=>{if(e.code!=='ENOENT')throw e;});let app=await startServers({port:4717,stateFile});
 try{
  const first=await fetch('http://127.0.0.1:4717/');const cookie=first.headers.get('set-cookie').split(';')[0];await first.text();const session=[...app.sessions.values()][0];session.created=Date.now()-48*3600000;session.accountId='201204010000';session.authenticatedAt=session.created;app.cases.get(session.caseId).ending='end1';
  await (await fetch('http://127.0.0.1:4717/',{headers:{cookie}})).text();await app.close();app=await startServers({port:4717,stateFile});
  assert.match(await (await fetch('http://127.0.0.1:4717/',{headers:{cookie}})).text(),/施設の利用休止/);
  assert.equal((await fetch('http://127.0.0.1:4717/members/',{headers:{cookie},redirect:'manual'})).status,303);
 }finally{await app.close();await unlink(stateFile).catch(e=>{if(e.code!=='ENOENT')throw e;});}
});

test('original sections and dated attachments do not know later documents',()=>{
 const value=text=>{const m=text?.match(/(\d{4})年(\d+)月(\d+)日/);return m?Number(m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0')):null;};
 const check=(d,text,date)=>{for(const other of documents)if(other.id!==d.id&&new RegExp(other.id+'(?![A-Z0-9-])').test(text))assert.ok(date>=value(other.date),d.id+' original at '+date+' cites '+other.id+' created '+other.date);};
 for(const d of documents){
  const created=value(d.date);check(d,(d.sections||[]).flat().join(' '),created);
  check(d,d.signoff||'',created);
  let entryDate=created;for(const entry of d.entries||[]){entryDate=/後日転記/.test(entry.at)?created:value(entry.at)||entryDate;check(d,entry.text,entryDate);}
  for(const note of d.addenda||[])check(d,note.sections.flat().join(' '),value(note.date));
  for(const table of d.tables||[])check(d,[...table.head,...table.rows.flat()].join(' '),value(table.date)||created);
 }
 for(const g of gallery.filter(g=>g.record)){const doc=documents.find(d=>d.id===g.record);assert.ok(doc,g.id);assert.ok(Number((g.recordUpdated||g.date).replaceAll('.',''))>=value(doc.date),'gallery '+g.id+' has a future record');}
});
