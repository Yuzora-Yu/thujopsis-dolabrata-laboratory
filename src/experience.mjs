import {programPath,programNotesPath} from './program.mjs';
import {seedNoteData,seedCollectionPath} from './seed-notes.mjs';
import {gallery,tenants,news,documents,tenantMaterialEntries} from './content.mjs';
import {editorialPages} from './world/editorial.mjs';
import {archiveItems,archiveNotes,noticeCapture} from './world/archive-data.mjs';
import {projects} from './world/projects.mjs';

export const experienceSettings={showPageIndex:true,showGrowthStage:true,showDisclaimer:true,copyright:'ⓒYU-ZORA',seedDrift:{enabled:true,threshold:15}};
export const growthStages=[
 {name:'SEED',label:'種子'},
 {name:'ROOT',label:'根'},
 {name:'SPROUT',label:'芽'},
 {name:'SAPLING',label:'若木'},
 {name:'BRANCH',label:'枝'},
 {name:'CANOPY',label:'樹冠'},
 {name:'HEARTWOOD',label:'木の芯'},
];
const roleLevels={minamo:2,ordis:3,ashita:4,institution:5,asakura:6};
const mainPages=['/','/about/',programPath,'/facilities/','/facilities/coworking/','/facilities/meeting/','/facilities/office/','/facilities/cafe/','/facilities/presentation/','/facilities/hall/','/workshop/','/gallery/','/floor-map/','/membership/','/price/','/visit/','/news/','/privacy/','/search/','/404/',...Object.keys(editorialPages),'/tenants/','/people/asakura-tsumugi/','/people/inaba-mio/'];
const memberPages=['/members/login/','/members/','/members/reservations/','/members/records/','/members/activity/','/members/messages/','/members/projects/','/members/organization/','/members/contact/','/members/contact/received/','/members/inquiry/','/members/personal/'];
const entries=[
 ...mainPages.map(path=>({kind:'main',path,level:0})),
 ...news.filter(n=>n.available).sort((a,b)=>a.id.localeCompare(b.id)).map(n=>({kind:'main',path:`/news/${n.id}/`,level:n.restored?1:0,noIndex:!n.listed})),
 ...tenants.map(t=>({kind:'main',path:`/tenants/${t.page}/`,level:t.listed?0:1,noIndex:!t.listed})),
 ...gallery.map(g=>({kind:'main',path:`/gallery/${g.id}/`,level:g.listed?0:1,noIndex:!g.listed})),
 ...memberPages.map(path=>({kind:'main',path,level:path.endsWith('/login/')?1:path.endsWith('/personal/')?6:2,accountScoped:true})),
 ...projects.map(p=>({kind:'main',path:`/members/projects/${p.slug}/`,level:Math.min(...p.roles.map(r=>roleLevels[r]))})),
 ...documents.map(d=>({kind:'main',path:`/members/records/${d.id}/`,level:Math.min(...d.roles.map(r=>roleLevels[r]))})),
 ...['/','/collections/','/snapshots/','/snapshots/2009/','/snapshots/2011/','/snapshots/2017/',...archiveItems.map(i=>`/collections/items/${i.id}/`),...noticeCapture.pages.map(notice=>notice.path)].map(path=>({kind:'archive',path,level:2})),
 ...['/room/','/room/console/','/room/console/subjects/',...archiveNotes.map(n=>`/room/records/${n.id}/`)].map(path=>({kind:'archive',path,level:4})),
 ...['hozen','audit'].flatMap(kind=>['/receive/','/received/'].map(path=>({kind,path,level:kind==='audit'?6:5}))),
 ...['/news/closure/','/news/staff-change/'].map(path=>({kind:'main',path,level:5})),
 {kind:'main',path:programNotesPath,level:1},
 ...tenantMaterialEntries.map(material=>({kind:'main',path:material.path,level:material.tenant.listed?0:1})),
 {kind:'main',path:'/facilities/staff/',level:0},
 {kind:'main',path:seedCollectionPath,level:0},
];
export const pageRegistry=entries.map((entry,index)=>({...entry,number:index+1}));
const byKey=new Map(pageRegistry.map(p=>[p.kind+':'+p.path,p]));
export function pagePosition(kind,path,role){
 const canonical=(kind==='hozen'||kind==='audit')&&path==='/'?'/receive/':path;
 const entry=byKey.get(kind+':'+canonical);if(!entry)return null;
 return {...entry,total:pageRegistry.length,level:entry.accountScoped&&canonical!=='/members/login/'?Math.max(entry.level,roleLevels[role]||0):entry.level};
}
export function fictionFooter(){return `<div class="fiction-footer">${experienceSettings.showDisclaimer?'<p>このWebサイトの内容は考察コンテンツのために作られたフィクションであり、実在の人物・団体とは一切関係がありません。</p>':''}<div class="fiction-footer-meta"><small>${experienceSettings.copyright}</small><!--PAGE_INDEX--></div></div>`;}
export function decoratePage(html,{kind='main',path='/',role}={}){
 if(!html)return html;const position=pagePosition(kind,path,role);
 const growth=growthStages[position?.level]||growthStages[0];
 const counter=experienceSettings.showPageIndex&&position?`<span class="page-index" data-page-number="${position.number}" data-page-total="${position.total}" data-growth-stage="${growth.name.toLowerCase()}" aria-label="ページ${position.number}、全${position.total}ページ${experienceSettings.showGrowthStage?'、探索段階 '+growth.name+'（'+growth.label+'）':''}">${experienceSettings.showGrowthStage?`<span class="index-growth">${growth.name}</span>`:''}<span class="index-number">${String(position.number).padStart(3,'0')} <span>/</span> ${position.total}</span></span>`:'';
 const note = kind==='main' && position?.level===0 ? seedNoteData(path) : '';
 const seedNotes = note ? `<script type="application/json" data-seed-notes>${note}</script>` : '';
 const noIndex=kind==='main'&&(position?.noIndex||path===programNotesPath||path===seedCollectionPath||/^\/tenants\/\d+\/materials\//.test(path))?'<meta name="robots" content="noindex,nofollow">':'';
 return html.replace('<!--PAGE_INDEX-->',counter)
  .replace(/<body\b([^>]*)>/,`<body$1 data-asunaro-stage="${growth.name.toLowerCase()}" data-seed-drift-enabled="${experienceSettings.seedDrift.enabled}" data-seed-drift-threshold="${experienceSettings.seedDrift.threshold}">`)
  .replace('</body>',seedNotes+'</body>')
  .replace('</head>',noIndex+'<script defer src="/seed-drift.js"></script></head>');
}
