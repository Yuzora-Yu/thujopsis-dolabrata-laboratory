const providerPaths={hozen:'/records-center',audit:'/independent-review',archive:'/historical-records'};
export function hostingOrigins(main,overrides={}){
 const root=main.replace(/\/$/,'');return {main:root,hozen:root+providerPaths.hozen,audit:root+providerPaths.audit,archive:root+providerPaths.archive,...Object.fromEntries(Object.entries(overrides).filter(([,v])=>v))};
}
/** @returns {{kind:'main'|'archive'|'hozen'|'audit',path:string}} */
export function providerRoute(url,origins){
 for(const kind of /** @type {Array<'archive'|'hozen'|'audit'>} */ (['archive','hozen','audit'])){
  const base=new URL(origins[kind],url.origin),prefix=base.pathname.replace(/\/$/,'');
  if(url.origin===base.origin&&(!prefix||url.pathname===prefix||url.pathname.startsWith(prefix+'/')))return {kind,path:url.pathname.slice(prefix.length)||'/'};
 }
 return {kind:'main',path:url.pathname};
}
export function rewriteHostedHtml(html,{kind='main',origins,basePath=''}){
 return html.replace(/\b(href|src|action|data-image-open)="([^"\n]*)"/g,(all,key,value)=>{
  if(!value.startsWith('/')||value.startsWith('//'))return all;
  if(basePath&&(value===basePath||value.startsWith(basePath+'/')))return all;
  const asset=/^\/(?:assets\/|styles\.css|app\.js|seed-drift\.js|member-reading\.js|reading-state\.js|static-runtime\.js|evidence\.js|search-engine\.js)/.test(value);
  const dest=asset?basePath+value:(value.startsWith('/members/')?origins.main:origins[kind]||origins.main)+value;
  return `${key}="${dest}"`;
 });
}
