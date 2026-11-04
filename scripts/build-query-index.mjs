import {writeFile} from 'node:fs/promises';
import {documents} from '../src/content.mjs';
import {recordText} from '../src/world/records.mjs';
import {publicPaths,renderPublic} from '../src/render.mjs';
import {archiveItems,archiveNotes} from '../src/world/archive-data.mjs';
import {projects} from '../src/world/projects.mjs';
import {siteQueries,catalogQueries,directInputs} from '../docs/critical-queries.mjs';
const escape=text=>String(text).replaceAll('|','\\|').replaceAll('\n',' ');
const publicText=publicPaths.map(path=>({path,text:(renderPublic(path)||'').replace(/<[^>]*>/g,' ')}));
const contains=(text,id)=>new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Z0-9-])').test(text);
const roles={minamo:'ミナモ',ordis:'オルディス',ashita:'アシタ',institution:'機関',asakura:'朝倉個人'};
const lines=['# クリティカルな検索語・入力一覧（作者用）','','ゲーム内・公開アセットへ含めない。氏名の空白や全角・半角は検索側で正規化する。研究資料照会は文書IDの完全一致で、閲覧権限により結果が変わる。','','## サイト内検索','','| 検索語 | 入手元 | 到達先 | 役割 |','| --- | --- | --- | --- |',...siteQueries.map(q=>`| ${q.word} | ${q.source} | ${q.destination} | ${q.purpose} |`),'','## 保存資料室の目録検索','','保存サイト全体のURLは中盤のAH-2017-009から知る。序盤の新聞切抜はPDFへ直接つなぎ、保存画面の一覧へは誘導しない。','','| 検索語 | 入手元 | 到達先 | 役割 |','| --- | --- | --- | --- |',...catalogQueries.map(q=>`| ${q.word} | ${q.source} | ${q.destination} | ${q.purpose} |`),'','## 研究資料照会（文書ID）','','| 文書ID | 資料 | 閲覧者 | 番号を得る主な場所 |','| --- | --- | --- | --- |'];
for(const d of documents){
 const sources=[];
 for(const p of publicText)if(contains(p.text,d.id))sources.push(p.path);
 for(const other of documents)if(other.id!==d.id&&contains(recordText(other),d.id))sources.push(other.id);
 for(const p of projects)if(contains(p.posts.flat().join(' '),d.id))sources.push('/members/projects/'+p.slug+'/');
 for(const item of archiveItems)if(contains(item.text+' '+item.next,d.id))sources.push('/collections/items/'+item.id+'/');
 for(const note of archiveNotes)if(contains(note.body,d.id))sources.push('/room/records/'+note.id+'/');
 if(!sources.length)throw new Error('No incoming clue for '+d.id);
 lines.push(`| ${d.id} | ${escape(d.title)} | ${d.roles.map(r=>roles[r]).join('・')} | ${[...new Set(sources)].slice(0,5).join('、')} |`);
}
lines.push('','## URL直入力・閲覧票・会員認証','','| 入力欄 | 入力 | 得る場所 | 役割 |','| --- | --- | --- | --- |',...directInputs.map(q=>`| ${q.kind} | ${q.input} | ${q.source} | ${q.purpose} |`),'','## 確認時の注意','','- 本表は入力漏れを管理する資料。全項目を同じ順に入力することを、プレイヤーへ要求しない。','- 公開目録から外れた0004・0009は、目録検索では出ない。連番の欠落からURLを直接指定する。','- 「行方不明」の報道は施設のお知らせへ転載せず、新聞切抜と保存室側へ置く。','- 施設のIDは、設立日を見つけただけで確定するものにしない。加入日と台帳番号は受領簿0006を根拠にする。','- 各文書の番号の入手元と、入力時点の権限は別に点検する。','- End2後は朝倉の登録が終了する。個人領域へ進めないことは結末の結果である。','');
await writeFile(new URL('../docs/critical-search-words.md',import.meta.url),lines.join('\n'));
console.log(`Updated critical inputs: ${siteQueries.length} site words, ${catalogQueries.length} catalog words, ${documents.length} document IDs, ${directInputs.length} direct inputs.`);
