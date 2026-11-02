import {gallery,tenants,news,documents} from './content.mjs';
import {editorialPages} from './world/editorial.mjs';
import {archiveItems,archiveNotes} from './world/archive-data.mjs';
import {projects} from './world/projects.mjs';

export const experienceSettings={showPageIndex:true,showSecrecyLevel:true,showDisclaimer:true,copyright:'ⓒYU-ZORA'};
const roleLevels={minamo:2,ordis:3,ashita:4,institution:5,asakura:6};
const mainPages=['/','/about/','/facilities/','/facilities/coworking/','/facilities/meeting/','/facilities/office/','/facilities/cafe/','/facilities/presentation/','/facilities/hall/','/workshop/','/gallery/','/floor-map/','/membership/','/price/','/visit/','/news/','/privacy/','/search/','/404/',...Object.keys(editorialPages),'/tenants/','/people/asakura-tsumugi/','/people/inaba-mio/'];
const memberPages=['/members/login/','/members/','/members/reservations/','/members/records/','/members/messages/','/members/projects/','/members/organization/','/members/contact/','/members/contact/received/','/members/inquiry/','/members/personal/'];
const entries=[
 ...mainPages.map(path=>({kind:'main',path,level:0})),
 ...news.filter(n=>n.available).sort((a,b)=>a.id.localeCompare(b.id)).map(n=>({kind:'main',path:`/news/${n.id}/`,level:n.restored?1:0})),
 ...tenants.map(t=>({kind:'main',path:`/tenants/${t.page}/`,level:t.listed?0:1})),
 ...gallery.map(g=>({kind:'main',path:`/gallery/${g.id}/`,level:g.listed?0:1})),
 ...memberPages.map(path=>({kind:'main',path,level:path.endsWith('/login/')?1:path.endsWith('/personal/')?6:2,accountScoped:true})),
 ...projects.map(p=>({kind:'main',path:`/members/projects/${p.slug}/`,level:Math.min(...p.roles.map(r=>roleLevels[r]))})),
 ...documents.map(d=>({kind:'main',path:`/members/records/${d.id}/`,level:Math.min(...d.roles.map(r=>roleLevels[r]))})),
 ...['/','/collections/','/snapshots/','/snapshots/2009/','/snapshots/2011/','/snapshots/2017/',...archiveItems.map(i=>`/collections/items/${i.id}/`),...['20120401','20120903','20161003','20170714'].map(id=>`/snapshots/2017/news/${id}/`)].map(path=>({kind:'archive',path,level:2})),
 ...['/room/',...archiveNotes.map(n=>`/room/records/${n.id}/`)].map(path=>({kind:'archive',path,level:4})),
 ...['hozen','audit'].flatMap(kind=>['/receive/','/received/'].map(path=>({kind,path,level:kind==='audit'?6:5}))),
 ...['/news/closure/','/news/staff-change/'].map(path=>({kind:'main',path,level:5})),
];
export const pageRegistry=entries.map((entry,index)=>({...entry,number:index+1}));
const byKey=new Map(pageRegistry.map(p=>[p.kind+':'+p.path,p]));
export function pagePosition(kind,path,role){
 const canonical=(kind==='hozen'||kind==='audit')&&path==='/'?'/receive/':path;
 const entry=byKey.get(kind+':'+canonical);if(!entry)return null;
 return {...entry,total:pageRegistry.length,level:entry.accountScoped&&canonical!=='/members/login/'?Math.max(entry.level,roleLevels[role]||0):entry.level};
}
export function fictionFooter(){return `<div class="fiction-footer">${experienceSettings.showDisclaimer?'<p>このWebサイトの内容は考察コンテンツのために作られたフィクションであり、実在の人物・団体とは一切関係がありません。</p>':''}<small>${experienceSettings.copyright}</small></div>`;}
export function decoratePage(html,{kind='main',path='/',role}={}){
 if(!html)return html;const position=pagePosition(kind,path,role);
 const counter=experienceSettings.showPageIndex&&position?`<div class="page-index" data-page-number="${position.number}" data-page-total="${position.total}" data-secrecy-level="${position.level}" aria-label="ページ${position.number}、全${position.total}ページ${experienceSettings.showSecrecyLevel?'、情報秘匿レベル'+position.level:''}">${position.number}/${position.total}${experienceSettings.showSecrecyLevel?' (LV'+position.level+')':''}</div>`:'';
 return html.replace('<!--PAGE_INDEX-->',counter);
}
