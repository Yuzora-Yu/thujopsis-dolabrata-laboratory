import {DurableObject} from 'cloudflare:workers';
import {Buffer} from 'node:buffer';
import {createApplication} from '../server.mjs';
import {buildEvidenceArchive,healthComparisonFile} from '../src/archive.mjs';
import {hostingOrigins,providerRoute,rewriteHostedHtml,acceptsCaseLink} from '../src/hosting.mjs';
import evidence from './evidence.generated.mjs';

const MAX_BODY=25*1024*1024;
const privateFiles:Record<string,Buffer>=Object.fromEntries(Object.entries(evidence).map(([key,value])=>[key,Buffer.from(value,'base64')]));
function originsFor(url:URL,env:Env){return hostingOrigins(env.ASUNARO_ORIGIN||url.origin,{hozen:env.HOZEN_ORIGIN,audit:env.AUDIT_ORIGIN,archive:env.ARCHIVE_ORIGIN});}
async function limitedBody(request:Request){
 const reader=request.body?.getReader();if(!reader)return new ArrayBuffer(0);
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new RangeError('body too large');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}return body.buffer;
}

export class CaseState extends DurableObject<Env>{
 private pending:Promise<void>=Promise.resolve();
 constructor(ctx:DurableObjectState,env:Env){
  super(ctx,env);this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS player_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)');
 }
 dispatch(requestUrl:string,method:string,headers:Record<string,string>,body:ArrayBuffer,caseId:string):Promise<Response>{
  const result=this.pending.then(()=>this.handle(requestUrl,method,headers,body,caseId));
  this.pending=result.then(()=>undefined,()=>undefined);return result;
 }
 private async handle(requestUrl:string,method:string,headers:Record<string,string>,body:ArrayBuffer,caseId:string):Promise<Response>{
  const url=new URL(requestUrl),origins=originsFor(url,this.env),route=providerRoute(url,origins);
  const app=createApplication({
   originOverrides:origins,
   caseIdFactory:()=>caseId,
   archiveFactory:(complete:boolean)=>buildEvidenceArchive({
    pdf:privateFiles['expose.pdf'],
    records:privateFiles['records.json'],
    continuity:privateFiles['continuity.json'],
    healthComparison:privateFiles[healthComparisonFile],
   },{complete}),
   privateFileLoader:(name:string)=>privateFiles[name],
  });
  const saved=this.ctx.storage.sql.exec<{payload:string}>('SELECT payload FROM player_state WHERE id=1').toArray()[0];
  if(saved){const state=JSON.parse(saved.payload);for(const [key,value] of state.sessions)app.sessions.set(key,value);for(const [key,value] of state.cases)app.cases.set(key,value);}
  headers.cookie=(headers.cookie||'').replace(/(asunaro_session=[a-f0-9]+)\.[a-f0-9]+/g,'$1');
  let status=200,finished=false;const responseHeaders=new Headers();let responseBody:BodyInit|null=null;
  const response={
   headersSent:false,
   setHeader(name:string,value:string){responseHeaders.set(name,value);},
   writeHead(code:number,values:Record<string,string>={}){status=code;for(const [key,value] of Object.entries(values))responseHeaders.set(key,value);this.headersSent=true;},
   end(value:BodyInit|null=null){responseBody=value;finished=true;},
  };
  const incoming={url:route.path+url.search,method,headers,async *[Symbol.asyncIterator](){if(body.byteLength)yield Buffer.from(body);}};
  await app.handler(incoming,response,route.kind);
  if(!finished)throw new Error('Incomplete response');
  const payload=JSON.stringify({sessions:[...app.sessions],cases:[...app.cases]});
  this.ctx.storage.sql.exec('INSERT INTO player_state (id,payload) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',payload);
  const cookie=responseHeaders.get('set-cookie');
  if(cookie)responseHeaders.set('set-cookie',cookie.replace(/(asunaro_session=[a-f0-9]+)/,'$1.'+caseId)+(url.protocol==='https:'&&!cookie.includes('; Secure')?'; Secure':''));
  const location=responseHeaders.get('location');if(location?.startsWith('/'))responseHeaders.set('location',(origins[route.kind]||origins.main)+location);
  if(responseHeaders.get('content-type')?.startsWith('text/html')&&typeof responseBody==='string')responseBody=rewriteHostedHtml(responseBody,{kind:route.kind,origins});
  return new Response(method==='HEAD'?null:responseBody,{status,headers:responseHeaders});
 }
}

export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  try{
   const url=new URL(request.url);
   if(/^\/(?:assets\/|styles\.css$|app\.js$|photo-pan\.js$|seed-drift\.js$|member-reading\.js$|reading-state\.js$|lab-core\.js$|lab-console\.js$|favicon\.ico$)/.test(url.pathname)){
    const assetUrl=new URL(request.url);if(url.pathname==='/favicon.ico')assetUrl.pathname='/assets/logo.png';
    return env.ASSETS.fetch(new Request(assetUrl,request));
   }
   const origins=originsFor(url,env),route=providerRoute(url,origins);
   if(!['GET','HEAD','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
   const fromCookie=request.headers.get('cookie')?.match(/(?:^|;\s*)asunaro_session=[a-f0-9]+\.([a-f0-9]{48})/)?.[1];
   const body=request.method==='POST'?await limitedBody(request):new ArrayBuffer(0);
   let fromForm='';
   const caseLink=acceptsCaseLink(route);
   if(caseLink){
    if(request.method==='POST'){const copy=new Request(request.url,{method:'POST',headers:request.headers,body});fromForm=String((await copy.formData()).get('case')||'');}
   }
   const linkedCase=caseLink?(fromForm||url.searchParams.get('case')||''):'';
   const caseId=/^[a-f0-9]{48}$/.test(linkedCase)?linkedCase:fromCookie||Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
   return await env.CASE_STATE.getByName(caseId).dispatch(request.url,request.method,Object.fromEntries(request.headers),body,caseId);
  }catch(error){
   const tooLarge=error instanceof RangeError;console.error(JSON.stringify({event:'request_failed',kind:tooLarge?'body_limit':'handler'}));
   return new Response(tooLarge?'添付資料の容量をご確認ください。':'お手続きを完了できませんでした。',{status:tooLarge?413:500,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
 },
} satisfies ExportedHandler<Env>;
