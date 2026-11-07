import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accounts} from '../src/content.mjs';
import {renderPublic} from '../src/render.mjs';
import {renderMember,agencyPage,memberLayout} from '../src/member.mjs';
import {renderLegacy} from '../src/legacy.mjs';
import {pageRegistry,withPlayerAssets} from '../src/experience.mjs';

const origins={main:'https://facility.example',archive:'https://facility.example/historical-records',hozen:'https://facility.example/records-center',audit:'https://facility.example/independent-review'};
const account=role=>Object.values(accounts).find(value=>value.role===role);
const context=role=>({account:account(role),csrf:'test-token',caseId:'test-case',caseState:{},origins,query:new URLSearchParams()});

test('exploration markers describe displayed pages, never denied source documents',()=>{
 assert.match(renderPublic('/'),/data-exploration-kind="main" data-exploration-path="\/"/);
 assert.match(renderPublic('/gallery/0022/'),/data-exploration-path="\/gallery\/0022\/"/);
 assert.match(renderPublic('/'),/href="\/player-record\/">探索記録/);
 const denied=renderMember('/members/records/YH-2018-041-A/',context('minamo'));
 assert.equal(denied,null);
 const allowed=renderMember('/members/records/YH-2018-041/',context('minamo'));
 assert.match(allowed,/data-exploration-path="\/members\/records\/YH-2018-041\/"/);
 const locked=renderLegacy('/room/records/0006/',{session:{},csrf:'test-token',caseState:{},origins});
 assert.doesNotMatch(locked,/data-exploration-path=/);
 const opened=renderLegacy('/room/records/0006/',{session:{archiveAccess:true},csrf:'test-token',caseState:{},origins});
 assert.match(opened,/data-exploration-kind="archive" data-exploration-path="\/room\/records\/0006\/"/);
 assert.match(opened,/href="https:\/\/facility.example\/player-record\/"/);
});

test('ending markers require a real outcome, not an ordinary receipt or pending review',()=>{
 for(const [kind,id]of [['hozen','end1'],['audit','end3']]){
  const html=agencyPage(kind,'/received/',{caseId:'test-case',origins,receipt:'received'});
  assert.match(html,new RegExp('data-exploration-ending="'+id+'"'));
  assert.doesNotMatch(agencyPage(kind,'/received/',{caseId:'test-case',origins,receipt:'pending'}),/data-exploration-ending=/);
 }
 const ctx=context('institution');
 assert.doesNotMatch(renderMember('/members/contact/received/',ctx),/data-exploration-ending=/);
 assert.match(renderMember('/members/contact/received/',{...ctx,caseState:{ending:'end2'}}),/data-exploration-ending="end2"/);
 assert.match(renderPublic('/news/closure/',{ending:'end1'}),/data-exploration-ending="end1"/);
 assert.match(renderPublic('/news/closure/',{ending:'end3'}),/data-exploration-ending="end3"/);
 assert.doesNotMatch(renderPublic('/'),/data-exploration-ending=/);
});

test('the player utility is separate from numbered story pages and hidden search evidence',()=>{
 const html=renderPublic('/player-record/');
 assert.ok(html);
 assert.match(html,/探索記録/);
 assert.doesNotMatch(html,/data-exploration-path=|data-page-number=|data-asunaro-stage="seed"/);
 assert.doesNotMatch(html,/201204010017|20080519|AS-2024-002|TR-2026-011/);
 assert.equal(pageRegistry.some(page=>page.path==='/player-record/'),false);
});

test('loading shells load the player assets once without claiming an explored page',()=>{
 const shell=memberLayout('会員サイト','<p>ページを読み込んでいます。</p>');
 const html=withPlayerAssets(shell);
 assert.equal((html.match(/src="\/assets\/player-record\.js"/g)||[]).length,1);
 assert.equal((html.match(/href="\/assets\/player-record\.css"/g)||[]).length,1);
 assert.equal(withPlayerAssets(html),html);
 assert.doesNotMatch(html,/data-exploration-path=/);
});
