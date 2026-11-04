import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLedger,recordReading,ledgerRows} from '../public/reading-state.js';
import {nextEnding} from '../src/evidence.mjs';

test('reading ledger keeps account histories separate until combined comparison',()=>{
 const old={contact:true,ending:'end1',truth:true};
 let value=recordReading(old,{id:'YH-2018-041',title:'集計報告',role:'minamo',label:'ミナモ'});
 value=recordReading(value,{id:'YH-2018-041',title:'集計報告',role:'minamo',label:'ミナモ'});
 value=recordReading(value,{id:'YH-2018-041-A',title:'個票',role:'ordis',label:'オルディス'});
 assert.equal(ledgerRows(value,'minamo').length,1);
 assert.equal(ledgerRows(value,'minamo')[0].views,2);
 assert.deepEqual(ledgerRows(value,'asakura',true).map(r=>r.role),['minamo','ordis']);
 assert.deepEqual(old,{contact:true,ending:'end1',truth:true});
 assert.equal(normalizeLedger({rows:[null,{id:'<script>'}]}).rows.length,0);
 assert.equal(recordReading(value,{id:'FORBIDDEN',role:'ordis'}).rows.length,2);
});

test('settled endings preserve consequences while independent evidence can stop succession',()=>{
 assert.equal(nextEnding('','end2'),'end2');
 assert.equal(nextEnding('end2','end3'),'end2');
 assert.equal(nextEnding('end1','end2'),'end1');
 assert.equal(nextEnding('end1','end3'),'end3');
 assert.equal(nextEnding('end3','end1'),'end3');
 assert.equal(nextEnding('end3','end2'),'end3');
});
