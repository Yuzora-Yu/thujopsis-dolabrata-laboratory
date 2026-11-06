import {writeFile} from 'node:fs/promises';
import {hintPlan} from '../docs/hint-plan.mjs';
import {experienceSettings,pagePosition,pageRegistry,growthStages} from '../src/experience.mjs';
import {seedNotes,seedNoteTotal,seedCollectionPath} from '../src/seed-notes.mjs';

const seedNoteLocations={
 '/':'トップの施設名の横',
 '/about/':'設立者の引用に添えた署名の横',
 '/facilities/':'フロアマップ案内の「4F FLOOR GUIDE」の横',
 '/workshop/':'設置機器の案内の「EQUIPMENT」の横',
 '/gallery/':'制作方法の絞り込みで「表示する」の横',
 '/news/':'お知らせ一覧の下にある「掲載順」の横',
 '/price/':'料金表の「施設利用料」の横',
 '/membership/':'既存会員向けの案内のボタン列',
 '/visit/':'見学案内の本文下にある改訂表記の時刻',
};
const prerequisites=({requires,requiresAny=[]},separator='、')=>[
 ...requires,
 ...(requiresAny.length?[`いずれか（${requiresAny.join('、')}）`]:[]),
].join(separator);
const lines=['# 攻略・ヒント設計（作者用）','','ゲーム内へ配信しない設計資料。段階別ヒントの公開用サイトは、この資料を基に後から構築できる。','','ページ番号・総数・成長段階はsrc/experience.mjsから取得する。総数は'+pageRegistry.length+'。','',
'| 段階 | 到達目標 | 事前に成立すべき段階 | |','| --- | --- | --- | --- |',...hintPlan.map((h,i)=>`| ${i+1} | ${h.goal} | ${prerequisites(h,', ')||'入口から確認可能'} | ${h.id} |`),''];
for(const [index,hint]of hintPlan.entries()){
 lines.push(`## ${index+1}. ${hint.goal}`,'',`前提：${prerequisites(hint)||'なし'}。`,'','根拠と、その時点で読めるページ：','');
 for(const e of hint.evidence){const page=pagePosition(e.kind==='member'?'main':e.kind,e.path,e.role);lines.push(`- ${e.path}${page?` — ${growthStages[page.level].name} · ${String(page.number).padStart(3,'0')} / ${page.total}`:''}${e.role?'／閲覧者 '+e.role:''}${e.state?.contact?'／原本照会後':''}。確認する記載：${e.words.join('、')}。`);}
 lines.push('','段階別ヒント案：','',...hint.hints.map((text,i)=>`${i+1}. ${text}`),'',`作者用の解答・解釈：${hint.answer}`,'',`次に接続する段階：${hint.leads.join('、')||'結末へ'}`,'');
 if(hint.visual)lines.push(`画像での確認先：${hint.visual}`,'');
}
const driftNote=Object.values(seedNotes).find(note=>note.beginsDrift);
lines.push('## 任意の探索 ／ SEEDの欄外記録','','本筋の資料照会や各エンディングに入るための条件には含めない。ヒントを出す場合は、まず普段は読み飛ばす小さな表記へ目を向けるよう促し、ページ名と位置は次の段階で開示する。','','| 番号 | ページ | 探す場所 | 表示される見出し |','| --- | --- | --- | --- |',
 ...Object.entries(seedNotes).sort(([,a],[,b])=>a.number-b.number).map(([path,note])=>{
  if(!seedNoteLocations[path])throw new Error('Missing SEED note location: '+path);
  return `| No.${note.number}/${seedNoteTotal} | ${path} | ${seedNoteLocations[path]} | ${note.title} |`;
 }), '',
 `- No.${driftNote.number}を初めて開いた時点で、SEEDの閲覧が${experienceSettings.seedDrift.threshold}回に達したときと同じ異変が起こる。SEEDを離れると閲覧回数はリセットされる。欄外記録の発見はブラウザに残る。`,
 `- 発見順は自由。${seedNoteTotal}件そろうと、最後に開いた記録とフッターに「中央受付の引継ぎ控え」（${seedCollectionPath}）へのリンクが出る。`,
 `- No.${driftNote.number}の控えと引継ぎで、見学証の返却時刻と名簿の扱いを照合できる。結論はヒント本文で先回りして説明しない。`,'');
lines.push('## 更新時の点検','','- ヒントを追加する前に、根拠となる文章・画像が、その時点の閲覧者に読めるか確認する。','- 段階1だけで答えを渡さず、観察箇所、比較対象、具体的な操作の順に開示する。','- 迂回路は別の入口を用意し、同じ前提を省略してしまわないか確認する。','- 誤認を誘う資料には、後から検証して解釈を更新できる資料を対応させる。','- ヒント設計の根拠と文書間の時系列はtests/editorial.test.mjsで検証する。','- 写真の付箋とPDFは、実物の拡大・抽出結果で確認する。','',
'## 参考にした構造','','[公式サイト](https://kagamino-jrep.net/)と[攻略チャート](https://yaoroz.hatenablog.com/entry/2024/05/20/000000)、[ページと検索語の対応表](https://yaoroz.hatenablog.com/entry/2024/04/20/000000)を確認。段階ごとの必要情報、任意の補足情報、複数資料の照合を分けて設計する考え方を参考にした。作品固有の人物・用語・文面は使用していない。','');
await writeFile(new URL('../docs/hint-plan.md',import.meta.url),lines.join('\n'));
console.log(`Updated author hint plan: ${hintPlan.length} stages, ${pageRegistry.length} registered pages.`);
await import('./build-query-index.mjs');
