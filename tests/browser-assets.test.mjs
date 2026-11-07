import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareBrowserAssets,versionHtmlAssets} from '../scripts/browser-assets.mjs';

test('browser modules use the delivered revision of each direct and transitive dependency',()=>{
 const sources={'runtime.js':"import {flag} from './reading.js';\nimport('./console.js?mode=one');",'reading.js':"import './rules.js';\nexport const flag=true;",'console.js':"import './rules.js';",'rules.js':'export const limit=1;\r\n'};
 const before=prepareBrowserAssets(sources),after=prepareBrowserAssets({...sources,'rules.js':'export const limit=2;\n'});
 for(const name of Object.keys(sources)){
  const asset=before.get(name);assert.equal(asset.version,createHash('sha256').update(asset.content).digest('hex').slice(0,16));
  assert.notEqual(asset.version,after.get(name).version,name+' must change when the dependency changes');
 }
 assert.match(before.get('reading.js').content,new RegExp('rules\\.js\\?v='+before.get('rules.js').version));
 assert.match(before.get('console.js').content,new RegExp('rules\\.js\\?v='+before.get('rules.js').version));
 assert.match(before.get('runtime.js').content,new RegExp('console\\.js\\?mode=one&v='+before.get('console.js').version));
 assert.equal(before.get('rules.js').content,'export const limit=1;\n');
});

test('HTML uses the same revisions at root and project paths without altering story or external URLs',()=>{
 const assets=prepareBrowserAssets({'app.js':'','assets/player.js':'','styles.css':'body{}'});
 for(const basePath of ['', '/project']){
  const input=`<script src="${basePath}/app.js"></script><script src="${basePath}/assets/player.js?v=old"></script><link href="${basePath}/styles.css?theme=light&amp;v=old"><a href="${basePath}/gallery/0001/">作品</a><script src="https://elsewhere.example/app.js"></script>`;
  const output=versionHtmlAssets(input,{assets,basePath});
  assert.ok(output.includes(`src="${basePath}/app.js?v=${assets.get('app.js').version}"`));
  assert.ok(output.includes(`src="${basePath}/assets/player.js?v=${assets.get('assets/player.js').version}"`));
  assert.ok(output.includes(`href="${basePath}/styles.css?theme=light&amp;v=${assets.get('styles.css').version}"`));
  assert.ok(output.includes(`href="${basePath}/gallery/0001/"`));assert.ok(output.includes('src="https://elsewhere.example/app.js"'));
  assert.equal(versionHtmlAssets(output,{assets,basePath}),output);
 }
});

test('unmanaged local dependencies and cycles fail the build instead of leaving unversioned imports',()=>{
 assert.throws(()=>prepareBrowserAssets({'app.js':"import './missing.js';"}),/Missing browser asset/);
 assert.throws(()=>prepareBrowserAssets({'a.js':"import './b.js';",'b.js':"import './a.js';"}),/Cyclic browser module/);
 const assets=prepareBrowserAssets({'app.js':"import 'https://example.test/external.js';"});
 assert.equal(assets.get('app.js').content,"import 'https://example.test/external.js';");
});
