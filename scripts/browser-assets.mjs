import {createHash} from 'node:crypto';

const assetOrigin='https://browser-assets.invalid';
const digest=content=>createHash('sha256').update(content).digest('hex').slice(0,16);
const imports=/\b(from\s+|import\s*\(\s*|import\s+)(['"])([^'"\r\n]+)\2/g;

function versioned(reference,version){
 const url=new URL(reference,assetOrigin+'/');
 url.searchParams.set('v',version);
 return reference.split(/[?#]/,1)[0]+url.search+url.hash;
}

// Resolve children first: changing a child changes both its URL and the parent
// which imports it. Revisions describe the LF-normalized bytes we actually serve.
export function prepareBrowserAssets(sources){
 const input=new Map(Object.entries(sources).map(([name,text])=>[name,text.replaceAll('\r\n','\n')]));
 const assets=new Map(),pending=new Set();
 function prepare(name){
  if(assets.has(name))return assets.get(name);
  if(pending.has(name))throw new Error('Cyclic browser module dependency: '+name);
  if(!input.has(name))throw new Error('Missing browser asset: '+name);
  pending.add(name);const dependencies=new Set();
  let content=input.get(name);
  if(name.endsWith('.js'))content=content.replace(imports,(original,prefix,quote,reference)=>{
   if(!reference.startsWith('.')&&!reference.startsWith('/'))return original;
   const url=new URL(reference,assetOrigin+'/'+name);
   const target=url.pathname.slice(1);
   if(url.origin!==assetOrigin)return original;
   const child=prepare(target);dependencies.add(target);
   return prefix+quote+versioned(reference,child.version)+quote;
  });
  const asset={content,version:digest(content),dependencies:[...dependencies]};
  pending.delete(name);assets.set(name,asset);return asset;
 }
 for(const name of input.keys())prepare(name);
 return assets;
}

export function versionHtmlAssets(html,{assets,basePath=''}){
 const prefix=basePath.replace(/\/$/,'')+'/';
 return html.replace(/\b(href|src)=(['"])([^'"\r\n]+)\2/g,(original,attribute,quote,encoded)=>{
  const reference=encoded.replaceAll('&amp;','&');
  const url=new URL(reference,assetOrigin+'/');
  if(url.origin!==assetOrigin||!url.pathname.startsWith(prefix))return original;
  const asset=assets.get(url.pathname.slice(prefix.length));
  if(!asset)return original;
  return attribute+'='+quote+versioned(reference,asset.version).replaceAll('&','&amp;')+quote;
 });
}
