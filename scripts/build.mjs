import {mkdir,writeFile,readFile,unlink,rmdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {publicPaths,renderPublic,notFound} from '../src/render.mjs';
import {makeArchive} from '../src/archive.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicRoot=path.join(root,'public');
const manifest=path.join(root,'private','public-pages.json');
let previous=[];
try{previous=JSON.parse(await readFile(manifest,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const route of previous.filter(route=>!publicPaths.includes(route))){
 if(!/^\/[a-z0-9/-]+\/$/.test(route))throw new Error('Invalid generated page path');
 const target=path.resolve(publicRoot,route.slice(1),'index.html');
 if(!target.startsWith(publicRoot+path.sep))throw new Error('Generated page outside public directory');
 await unlink(target).catch(e=>{if(e.code!=='ENOENT')throw e;});
 await rmdir(path.dirname(target)).catch(e=>{if(!['ENOTEMPTY','ENOENT'].includes(e.code))throw e;});
}
for(const route of publicPaths){const target=path.join(root,'public',route==='/'?'index.html':route.slice(1)+'index.html');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,route==='/404/'?notFound():renderPublic(route),'utf8');}
await writeFile(path.join(root,'public','404.html'),notFound());
await writeFile(path.join(root,'public','robots.txt'),'User-agent: *\nDisallow: /members/\n');
await writeFile(manifest,JSON.stringify(publicPaths,null,2));
await writeFile(path.join(root,'private','保全資料_20261102.zip'),await makeArchive(new URL('../src/archive.mjs',import.meta.url)));
await writeFile(path.join(root,'private','原本および移送関係資料.zip'),await makeArchive(new URL('../src/archive.mjs',import.meta.url),{complete:true}));
console.log(`Built ${publicPaths.length} public HTML pages and private download archives.`);
