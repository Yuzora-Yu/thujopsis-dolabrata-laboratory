import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acceptsCaseLink,hostingOrigins,providerRoute} from '../src/hosting.mjs';

test('only actual agency entry and receipt routes accept linked cases',()=>{
 const origins=hostingOrigins('https://facility.example');
 for(const kind of ['hozen','audit'])for(const path of ['/','/receive/','/received/']){
  const route=providerRoute(new URL(origins[kind]+path+'?case=other'),origins);
  assert.equal(acceptsCaseLink(route),true,kind+path);
 }
 for(const kind of ['main','archive','hozen','audit']){
  for(const path of ['/player-record/api/','/player-record/','/members/','/room/console/api/'])
   assert.equal(acceptsCaseLink({kind,path}),false,kind+path);
 }
});
