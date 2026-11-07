import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {accounts,documents,news,gallery,searchEntries} from '../src/content.mjs';
import {publicPaths,renderPublic,notFound} from '../src/render.mjs';
import {renderMember,agencyPage} from '../src/member.mjs';
import {renderLegacy} from '../src/legacy.mjs';
import {newsIsAvailable,newsIsListed,storyToday} from '../src/world/editorial.mjs';
import {pageRegistry,pagePosition,experienceSettings,growthStages} from '../src/experience.mjs';
import {hintPlan} from '../docs/hint-plan.mjs';
import {playerRecordPath} from '../src/player-record.mjs';
import {seoFamily} from '../src/world/people.mjs';
import {recordText} from '../src/world/records.mjs';
import {siteQueries,catalogQueries} from '../docs/critical-queries.mjs';
import {archiveItems,archiveNotes,noticeCapture,pressClippings} from '../src/world/archive-data.mjs';
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

test('newspaper editions preserve publication dates and agree with the receipt and transcript',async()=>{
 for(const clipping of Object.values(pressClippings)){
  assert.ok(clipping.received>=clipping.published&&clipping.received<=storyToday,clipping.file);
  const bytes=(await readFile(new URL('../public/assets/archive/'+clipping.file,import.meta.url))).toString('latin1');
  for(const field of ['CreationDate','ModDate'])assert.equal(bytes.match(new RegExp('/'+field+' \\(D:(\\d+)'))?.[1],clipping.received.replaceAll('-','')+'000000',clipping.file+' '+field);
 }
 const receipt=documents.find(record=>record.id==='FAM-2022-009').addenda.find(note=>note.sections.some(([,text])=>text.includes('NK-2022-0908、NK-2023-0622')));
 const date=receipt.date.match(/(\d{4})年(\d+)月(\d+)日/).slice(1).map((part,index)=>index?part.padStart(2,'0'):part).join('-');
 for(const id of ['NK-2022-0908','NK-2023-0622']){
  const clipping=pressClippings[id],item=archiveItems.find(item=>item.code===id);
  assert.equal(clipping.received,date,id);
  assert.equal(item.clipping,id);assert.ok(item.text.startsWith(clipping.headline+'\n'));
  const html=renderLegacy('/collections/items/'+item.id+'/',{origins});
  for(const text of clipping.paragraphs)assert.ok(html.includes(text),id);
 }
});

test('identity notices stay in the inbox and do not reach unrelated or closed accounts',()=>{
 const notice=renderMember('/members/messages/',context('institution'));
 assert.match(notice,/<h2>照会名義の確認<\/h2>/);
 assert.doesNotMatch(renderMember('/members/activity/',context('institution')),/照会名義の確認/);
 assert.match(renderMember('/members/records/CH-2021-003/',context('institution')),/href="\/members\/messages\/#reading-notification"/);
 assert.doesNotMatch(renderMember('/members/messages/',context('minamo')),/reading-notification/);
 const closed=context('institution');closed.caseState.ending='end3';
 assert.doesNotMatch(renderMember('/members/messages/',closed),/reading-notification/);
});

test('current news has operational detail and later references do not appear in old recruitment copies',()=>{
 assert.ok(news.filter(n=>n.listed).length>=30);
 for(const n of news.filter(n=>n.listed)){assert.ok(n.sections?.length>=2,n.id);assert.ok(n.body.length+n.sections.flat().join('').length>180,n.id);}
 const announcement=renderPublic('/news/20261023/');
 const report=renderPublic('/news/20261101/');
 assert.match(announcement,/2026年10月31日（土）11時から16時まで.*最終入場15時30分/);
 assert.match(announcement,/10月31日追記.*特別展示は終了/);
 assert.doesNotMatch(announcement,/\/news\/20261101\/|\/gallery\/003[34]\//);
 assert.match(report,/\/gallery\/0033\/[\s\S]*\/gallery\/0034\/[\s\S]*\/floor-map\/#floor-exhibition/);
 assert.doesNotMatch(announcement+report,/field-notes|居住実証/);
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
 const slip=trial.tables.find(table=>table.participantCopy);
 const fields=Object.fromEntries(slip.rows);
 assert.match(fields['試用期間'],/8月19日.*8月22日/);
 assert.match(fields['お帰りの日'],/8月22日.*中央受付/);
 assert.match(trial.entries.find(entry=>entry.at==='2022年8月22日').text,/本日付で短期試用から継続群へ編入/);
 assert.match(trial.entries.find(entry=>entry.at==='2022年8月31日').text,/一般制作の利用登録を終了/);
 assert.match(trial.entries.find(entry=>entry.by==='本人からの申出').text,/工房に預けた型紙と、母の料理帳の写し/);
 assert.match(recordText(trial),/第3居住群の照合欄（OBS-2022-044）/);
 const group=record('OBS-2022-044').tables.find(table=>table.caption.startsWith('第3居住群'));
 assert.match(group.rows.find(row=>row[1].startsWith('P-034')).join(' '),/9月9日.*同じ説明/);
 assert.doesNotMatch(recordText(trial),/B-07|2026年|現所在/);
 assert.match(recordText(record('FAM-2022-009')),/8月19日の外出後は本人と話せず、22日の帰宅予定/);
 assert.match(archiveItems.find(item=>item.code==='NK-2022-0908').text,/22日に帰宅する予定だったが戻らず/);
 const receipt=record('PN-2022-034');
 assert.match(recordText(receipt),/以前からの預かり分（FAB-2022-071）/);
 assert.doesNotMatch(receipt.tables[0].rows.flat().join(' '),/型紙|料理帳/);
 assert.deepEqual(receipt.tables[0].head.slice(-2),['返却日','受取人']);
 for(const row of receipt.tables[0].rows)assert.deepEqual(row.slice(-2),['','']);
});

test('cohort records distinguish the participant copy, dispatch and night duty',()=>{
 const observation=documents.find(document=>document.id==='OBS-2022-044');
 const participant=Object.fromEntries(observation.tables.find(table=>table.participantCopy).rows);
 assert.match(participant['受付記入欄'],/9月10日 08:42.*受領/);
 assert.doesNotMatch(Object.values(participant).join(' '),/薬剤|未承認|拒否傾向/);
 const [ , administration]=observation.sections.find(([title])=>title.includes('9月2日 08:10'));
 assert.match(administration,/P-032.*投与済み.*本人確認は空欄/);
 const equipment=documents.find(document=>document.id==='ENV-2022-031');
 const sent=equipment.tables.find(table=>table.caption.startsWith('9月10日 11:20'));
 const fields=Object.fromEntries(sent.rows);
 assert.equal(fields['宛先'],'P-032の端末');
 assert.equal(fields['端末応答'],'受領');
 assert.equal(fields['閲覧時刻'],'');
 assert.match(fields['配信文'],/P-033の未承認/);
 assert.match(fields['運用室の注記'],/実際の申出や署名は参照していない/);
 assert.doesNotMatch(renderMember('/members/records/OBS-2022-044/',context('ordis')),/P-033の未承認|11:20/);
 assert.equal(renderMember('/members/records/ENV-2022-031/',context('ordis')),null);
 const incident=documents.find(document=>document.id==='EV-2022-091');
 assert.match(recordText(incident),/9月10日11:20の端末配信控え（ENV-2022-031）.*9月11日の当直連絡/);
 assert.equal(incident.tables[0].rows.at(-1)[1],'P-033の死亡を確認');
});

test('the evaluation summary can be traced to the joint request and the duty log',()=>{
 const byId=id=>documents.find(document=>document.id===id);
 const summary=byId('GR-2022-009').tables[0].rows;
 const cooperation=summary.find(([label])=>label.startsWith('食事を取り分け'));
 assert.match(cooperation[1],/PN-2022-034\n9月2日・9日/);
 const request=summary.find(([label])=>label==='全員の退出を求める');
 assert.deepEqual(request.slice(1),['PN-2022-034\n9月10日の控え','除外。条件変更の要求']);
 const receipt=byId('PN-2022-034');
 const joint=receipt.entries.find(entry=>entry.by.includes('共同申出の控え'));
 assert.equal(joint.at,'2022年9月10日');
 assert.match(joint.by,/瀬尾灯・青井真澄/);
 assert.match(joint.text,/一人ずつ聞いてください.*希望どおりに外へ/);
 assert.match(recordText(receipt),/夏帆さんが一人ずつ包んでいました/);
 assert.match(recordText(receipt),/申出の原本は受付の担当に渡しました/);
 const aid=summary.find(([label])=>label==='救護を要請');
 assert.deepEqual(aid.slice(1),['EV-2022-091\n21:12、21:14','除外。群外の資源要求']);
 const calls=byId('EV-2022-091').tables[0].rows;
 assert.match(calls.find(([time])=>time==='21:12')[1],/外の救急/);
 assert.match(calls.find(([time])=>time==='21:14')[1],/人を呼んで/);
});

test('the maintenance request, in-person check and paper custody have distinct dates',()=>{
 const byId=id=>documents.find(document=>document.id===id);
 const log=byId('FAB-2026-018');
 assert.match(log.tables[0].rows.find(([item])=>item==='支持部交換の依頼')[1],/B-07/);
 assert.doesNotMatch(log.tables[0].rows.flat().join(' '),/P-034|瀬尾灯/);
 const [work]=log.entries;
 assert.equal(work.at,'2026年10月28日 14:20');
 assert.match(work.text,/B1・B-07.*瀬尾灯（対象票P-034）.*対面.*便箋一枚.*P034-2026-102/);
 const letter=byId('P034-2026-102');
 assert.equal(letter.date,'2026年10月28日');
 assert.match(letter.sections[0][1],/便箋一枚.*FAB-2026-018/);
 assert.doesNotMatch(letter.sections[0][1],/型紙|料理帳/);
 assert.match(letter.sections[1][1],/紙袋.*AS-2023-008.*FAB-2022-071.*引渡し日は空欄/);
 assert.match(recordText(byId('AS-2023-008')),/律が紙袋の口を二回折って、私の机に置いた/);
 const [transcription]=letter.addenda;
 assert.equal(transcription.date,'2026年10月30日');
 assert.match(transcription.sections.flat().join(' '),/便箋の複写.*開封/);
 const family=byId('FAM-2022-009');
 assert.match(family.entries.find(entry=>entry.at==='2022年11月30日').text,/汐見分室の郵送先を文乃氏へ通知/);
 assert.match(family.entries.find(entry=>entry.at==='2022年12月6日').text,/書留が戻りました/);
 assert.match(recordText(family),/10月26日の当直引継ぎ.*10月28日の交換作業控えFAB-2026-018/);
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
 for(const item of catalogQueries){
  const catalogue=renderLegacy('/collections/',{origins,session:{},query:new URLSearchParams({q:item.word})});
  assert.ok(catalogue.includes(`href="${item.destination}"`),item.word);
 }
 const late=renderLegacy('/collections/',{origins,session:{},query:new URLSearchParams({q:'ＮＫ−２０２１–１１０４'})});
 assert.match(late,/同封　11月4日地域版 後刷（NK-2021-1104）/);
 assert.doesNotMatch(late,/href="\/collections\/items\/0009\/"/);
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

test('current overview and history can be found by visible copy without indexing discovery-only pages',()=>{
 for(const [path,query] of [['/about/','人と技術'],['/about/','沿革'],['/about/','設立者 榊原'],['/about/history/','共同事業'],['/about/history/','2016年 共同事業']]){
  const entries=searchEntries.filter(entry=>entry.url===path);assert.equal(entries.length,1,path);
  assert.ok(matchesSearch(entries[0],query),query);assert.match(renderPublic(path),/人と技術|共同事業/);
 }
 for(const path of ['/about/identity/','/about/emblem/','/tenants/0003/','/historical-records/snapshots/'])assert.ok(!searchEntries.some(entry=>entry.url===path),path);
 assert.ok(!searchEntries.some(entry=>entry.url.startsWith('/members/')));
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

test('story page numbering and growth stages share a registry and sit beside the copyright',()=>{
 assert.equal(new Set(pageRegistry.map(p=>p.kind+':'+p.path)).size,pageRegistry.length);
 assert.deepEqual(pageRegistry.map(p=>p.number),Array.from({length:pageRegistry.length},(_,i)=>i+1));
 assert.ok(pageRegistry.every(p=>Number.isInteger(p.level)&&p.level>=0));
 for(const p of publicPaths.filter(p=>p!==playerRecordPath))assert.ok(pagePosition('main',p),p);
 assert.equal(pagePosition('main',playerRecordPath),null);
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
 const earlierOriginals=['TR-2026-011','EV-2022-091'].map(id=>{
  const document=documents.find(item=>item.id===id);
  return id==='TR-2026-011'?{id,entries:document.entries}:{id,tables:document.tables};
 });
 const olderExport={name:'文書原本.json',data:JSON.stringify({documents:earlierOriginals})};
 assert.equal(classifyEvidence(zipFiles([...summary,olderExport])),'complete');
});

test('the draft separates transfer of records, closure and residents',async()=>{
 const transfer=documents.find(document=>document.id==='TR-2026-011');
 const fields=Object.fromEntries(transfer.tables[0].rows);
 const continuity=JSON.parse(await readFile(new URL('../private/continuity.json',import.meta.url)));
 assert.equal(fields['資料の受領担当'],continuity.receiver);
 assert.equal(fields['資料の内訳'],continuity.handover.join('、'));
 assert.equal(fields['現施設の運営停止'],'モデル受領後に手続きを開始予定');
 for(const field of ['資料の引渡し日','資料の受領印','居住者の受入場所','居住者の移動日','居住者本人の確認']){
  assert.equal(fields[field],'',field);
 }
 const center=agencyPage('hozen','/receive/',{origins});
 const independent=agencyPage('audit','/receive/',{origins});
 assert.match(center,/技術記録は、保全と引継ぎの可否を確認.*所在や支援に関する照会は、関係先へ取り次ぎ/);
 assert.match(independent,/現運営から独立した立場で、原本と資料の移送先/);
 assert.equal(renderMember('/members/records/TR-2026-011/',context('institution')),null);
 assert.equal(renderMember('/members/records/EA-2026-009/',context('institution')),null);
});

test('production domains and project-path previews preserve cross-site and asset links',()=>{
 const production=hostingOrigins('https://asunaro.yu-zora.com',{archive:'https://archive.asunaro.yu-zora.com'});
 assert.deepEqual(providerRoute(new URL('https://archive.asunaro.yu-zora.com/room/'),production),{kind:'archive',path:'/room/'});
 const preview=hostingOrigins('/thujopsis-dolabrata-laboratory');
 const html=rewriteHostedHtml('<a href="/room/">room</a><img src="/assets/logo.png"><script src="/photo-pan.js?v=revision"></script><video poster="/assets/media/f-home-east.webp"><source src="/assets/video/asunaro-facility-pv.mp4"></video><form action="/room/login/"></form>',{kind:'archive',origins:preview,basePath:'/thujopsis-dolabrata-laboratory'});
 assert.match(html,/href="\/thujopsis-dolabrata-laboratory\/historical-records\/room\/"/);assert.match(html,/src="\/thujopsis-dolabrata-laboratory\/assets\/logo.png"/);
 assert.match(html,/poster="\/thujopsis-dolabrata-laboratory\/assets\/media\/f-home-east.webp"/);
 assert.match(html,/src="\/thujopsis-dolabrata-laboratory\/assets\/video\/asunaro-facility-pv.mp4"/);
 assert.match(html,/src="\/thujopsis-dolabrata-laboratory\/photo-pan\.js\?v=revision"/);
 const separate=rewriteHostedHtml('<script src="/photo-pan.js"></script>',{kind:'archive',origins:production});
 assert.equal(separate,'<script src="/photo-pan.js"></script>');
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
