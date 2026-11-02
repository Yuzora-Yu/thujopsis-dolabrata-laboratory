import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('worker',{recursive:true});
const data={};for(const name of ['expose.pdf','records.json','continuity.json'])data[name]=(await readFile(new URL('../private/'+name,import.meta.url))).toString('base64');
await writeFile(new URL('../worker/evidence.generated.mjs',import.meta.url),'export default '+JSON.stringify(data)+';\n');
console.log('Prepared protected Worker evidence bundle.');
