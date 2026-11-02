import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {accounts,documents,news,gallery,searchEntries} from '../src/content.mjs';
import {publicPaths,renderPublic,notFound} from '../src/render.mjs';
import {renderMember,agencyPage} from '../src/member.mjs';
import {renderLegacy} from '../src/legacy.mjs';
import {newsIsAvailable,newsIsListed} from '../src/world/editorial.mjs';
import {pageRegistry,pagePosition,experienceSettings} from '../src/experience.mjs';
import {hintPlan} from '../docs/hint-plan.mjs';
import {normalizeSearch,matchesSearch} from '../src/search.mjs';
import {hostingOrigins,providerRoute,rewriteHostedHtml} from '../src/hosting.mjs';
import {classifyEvidence} from '../src/evidence.mjs';
import {makeArchive} from '../src/archive.mjs';
import {startServers} from '../server.mjs';
const origins=hostingOrigins('https://asunaro.example');
const context=role=>({account:Object.values(accounts).find(a=>a.role===role),csrf:'test',caseId:'case',caseState:{contact:false,ending:''},query:new URLSearchParams(),origins});

test('news retention applies to visibility, direct URLs and the public search index',()=>{
 assert.equal(!!newsIsAvailable({date:'2021.11.01'}),false);assert.equal(!!newsIsAvailable({date:'2021.11.02'}),true);
 assert.equal(!!newsIsListed({date:'2012.04.01',important:true}),true);
 assert.equal(news.find(n=>n.id==='20120903').available,false);assert.equal(renderPublic('/news/20120903/'),null);
 assert.ok(!publicPaths.includes('/news/20120903/'));assert.ok(!searchEntries.some(e=>e.url==='/news/20120903/'));
 assert.match(renderPublic('/news/20220218/'),/公開から5年で非公開/);
 assert.doesNotMatch(renderPublic('/news/'),/href="\/news\/20120416\/"/);
 assert.ok(searchEntries.filter(e=>matchesSearch(e,'A4-01')).some(e=>e.url==='/news/20120416/'));
 assert.ok(!searchEntries.filter(e=>matchesSearch(e,'フロアマップ')).some(e=>e.url==='/news/20120416/'));
});

test('opening links to naming and emblem essays while the old plan remains a later discovery',()=>{
 const opening=renderPublic('/news/20120401/');assert.match(opening,/href="\/about\/identity\/"/);assert.match(opening,/href="\/about\/emblem\/"/);assert.doesNotMatch(opening,/20120903|floor-4f-2012/);
 for(const p of ['/','/about/','/gallery/','/gallery/0002/','/news/','/about/identity/','/about/emblem/'])assert.doesNotMatch(renderPublic(p),/floor-4f-2012|asunaro-4f-2012/);
 assert.match(renderPublic('/news/20120416/'),/floor-4f-2012/);
 const footer=notFound().match(/<div class="footer-links">([\s\S]*?)<\/div>/)[1];assert.ok(footer.indexOf('/tenants/')<footer.indexOf('/gallery/'));
 assert.match(renderPublic('/gallery/0005/'),/入居者紹介/);assert.ok(searchEntries.some(e=>e.url==='/tenants/'));
});

test('published navigation does not directly expose nonlisted gallery objects',()=>{
 const hidden=new Set(gallery.filter(g=>!g.listed).map(g=>g.id));
 for(const p of publicPaths.filter(p=>!/^\/gallery\/\d/.test(p)&&!/^\/tenants\/\d/.test(p))){const html=renderPublic(p)||'';for(const m of html.matchAll(/href="\/gallery\/(\d+)\//g))assert.ok(!hidden.has(m[1]),p+' -> '+m[1]);}
});

test('page numbering, total and secrecy levels derive from one registry and can be toggled',()=>{
 assert.equal(new Set(pageRegistry.map(p=>p.kind+':'+p.path)).size,pageRegistry.length);
 assert.deepEqual(pageRegistry.map(p=>p.number),Array.from({length:pageRegistry.length},(_,i)=>i+1));
 assert.ok(pageRegistry.every(p=>Number.isInteger(p.level)&&p.level>=0));
 for(const p of publicPaths)assert.ok(pagePosition('main',p),p);
 for(const html of [renderPublic('/'),renderMember('/members/',context('institution')),renderLegacy('/collections/',{origins,session:{}}),agencyPage('hozen','/receive/',{origins})]){
  assert.match(html,new RegExp('data-page-total="'+pageRegistry.length+'"'));assert.match(html,/このWebサイトの内容は考察コンテンツ/);assert.match(html,/ⓒYU-ZORA/);
 }
 assert.equal(pagePosition('main','/members/records/AS-2024-002/').level,6);
 const previous=experienceSettings.showPageIndex;try{experienceSettings.showPageIndex=false;assert.doesNotMatch(renderPublic('/'),/class="page-index"/);}finally{experienceSettings.showPageIndex=previous;}
});

test('document references to later records have a sufficiently late update date',()=>{
 const numeric=date=>{const m=date.match(/(\d{4})年(\d+)月(\d+)日/);assert.ok(m,date);return Number(m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0'));};
 for(const d of documents){const latest=numeric(d.updated||d.date);assert.ok(latest>=numeric(d.date),d.id);
  const text=d.sections.map(s=>s.join(' ')).join(' ');
  for(const related of documents)if(related.id!==d.id&&text.includes(related.id))assert.ok(latest>=numeric(related.date),d.id+' references '+related.id+' before creation');
 }
});

test('every planned hint has in-world evidence and the prerequisite graph reaches each ending',async()=>{
 const ids=new Set(hintPlan.map(h=>h.id));
 for(const h of hintPlan){assert.equal(h.hints.length,3,h.id);for(const id of [...h.requires,...h.leads])assert.ok(ids.has(id),id);
  for(const witness of h.evidence){
   if(witness.kind==='private'){assert.equal((await readFile('private/expose.pdf')).subarray(0,5).toString(),'%PDF-');continue;}
   const ctx=context(witness.role);Object.assign(ctx.caseState,witness.state||{});
   const html=witness.kind==='main'?renderPublic(witness.path)||notFound():witness.kind==='member'?renderMember(witness.path,ctx):renderLegacy(witness.path,{origins,session:{archiveAccess:witness.role==='ticket'?'H17-0038':null}});
   assert.ok(html,h.id+' missing '+witness.path);
   for(const word of witness.words)assert.ok(normalizeSearch(html).includes(normalizeSearch(word)),h.id+': '+witness.path+' lacks '+word);
  }
 }
 const reached=new Set();let changed=true;while(changed){changed=false;for(const h of hintPlan)if(!reached.has(h.id)&&h.requires.every(id=>reached.has(id))){reached.add(h.id);changed=true;}}
 assert.equal(reached.size,hintPlan.length);assert.ok(reached.has('report')&&reached.has('independent'));
});

test('evidence types are distinguished by valid ZIP directory entries',async()=>{
 const original=await makeArchive(new URL('../src/archive.mjs',import.meta.url)),complete=await makeArchive(new URL('../src/archive.mjs',import.meta.url),{complete:true});
 assert.equal(classifyEvidence(original),'base');assert.equal(classifyEvidence(complete),'complete');assert.equal(classifyEvidence(Buffer.from('告発書.pdf 実験記録.enc')),null);assert.equal(classifyEvidence(original.subarray(0,original.length-30)),null);
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
