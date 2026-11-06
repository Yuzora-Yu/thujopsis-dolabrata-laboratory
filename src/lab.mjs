import {trialView,advanceTrial} from '../public/lab-core.js';
import {subjectViews} from './world/lab-data.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function labContext(caseState={},csrf=''){
 const trial=trialView(caseState.consoleTrial);
 return {trial,csrf,ending:caseState.ending||'',subjects:trial?.complete?subjectViews(caseState):null};
}
export function labAction(caseState,action,input,options){
 caseState.consoleTrial=advanceTrial(caseState.consoleTrial,action,input,options);
 return labContext(caseState);
}
export function consoleContent(path,ctx){
 if(!['/room/console/','/room/console/subjects/'].includes(path))return null;
 const mode=path.endsWith('/subjects/')?'subjects':'protocol';
 return {title:mode==='subjects'?'適性測定・原票照合':'適性反応測定端末',body:`<p class="legacy-record-meta">端末 AP-06 ／ 一次測定・原本照合 ／ 接続確認 2026.10.31</p><section data-lab-root data-lab-view="${mode}" data-lab-api="${esc(ctx.origins.archive+'/room/console/api/')}" data-lab-home="${esc(ctx.origins.archive+'/room/console/')}" data-lab-subjects="${esc(ctx.origins.archive+'/room/console/subjects/')}" data-lab-main="${esc(ctx.origins.main)}"><p class="lab-loading" role="status">測定端末を照合しています。</p></section><div data-lab-related></div><p class="lab-return"><a href="/room/">移管・保守受領簿へ</a></p>`};
}
export function labThanks(trial){
 const complete=trialView(trial)?.complete;
 return `<section class="lab-thanks" data-lab-thanks${complete?'':' hidden'}><h2><span data-lab-thanks-name>${complete?esc(trial.handle):''}</span>さんへ</h2><blockquote>私たちが自分の名前で施設を離れるために、資料を届けてくださってありがとうございました。数字だけの欄に戻らずに済みました。<br><br>瀬尾 灯</blockquote></section>`;
}

export function labAssessment(saved,ending=''){
 const trial=trialView(saved),complete=trial?.complete,closed=ending==='end3';
 return `<section class="lab-assessment" data-lab-assessment${complete?'':' hidden'}><p class="member-meta">2026.11.02／AP-06受領原票・併合控え</p><h2>外部協力者の一次測定</h2><dl class="detail-list"><div><dt>原票の呼称</dt><dd data-lab-assessment-handle>${complete?esc(trial.handle):''}</dd></div><div><dt>カード反応</dt><dd><span data-lab-assessment-cards>${trial?.cardCorrect||0}</span> / 5</dd></div><div><dt>粒子観測</dt><dd><span data-lab-assessment-particles>${trial?.particle?.found||0}</span> / 16</dd></div><div><dt>照合</dt><dd data-lab-assessment-status>${closed?'終了／原本保全':'一次測定受領／継続判定待ち'}</dd></div></dl><p data-lab-assessment-note>${closed?'外部協力者への継続照会は終了した。測定原票は保全資料へ分離。':'AP-06から回付された原票を、外部協力者の照合票に併合。測定完了を、本件の照会終了として扱わない。'}</p></section>`;
}
