import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {accounts,documents} from './src/content.mjs';
import {renderPublic,notFound} from './src/render.mjs';
import {loginPage,renderMember,memberLayout,agencyPage} from './src/member.mjs';
import {makeArchive} from './src/archive.mjs';
import {renderLegacy,legacyLogin,legacyLayout} from './src/legacy.mjs';
import {archiveTicket} from './src/world/archive-data.mjs';
import {classifyEvidence} from './src/evidence.mjs';
import {normalizeDocumentId} from './src/search.mjs';
import {reservationSpaces} from './src/world/editorial.mjs';
import {readFileSync} from 'node:fs';
import {writeFile,rename,mkdir} from 'node:fs/promises';

const root=path.dirname(fileURLToPath(import.meta.url));
const publicRoot=path.join(root,'public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.json':'application/json; charset=utf-8','.zip':'application/zip'};
const MAX_BODY=25*1024*1024;
const token=()=>randomBytes(24).toString('hex');

function splitMultipart(buffer,type){
 const marker=type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);if(!marker)throw new Error('invalid multipart');
 const boundary=Buffer.from('--'+(marker[1]||marker[2]));const fields={},files={};let start=buffer.indexOf(boundary);
 while(start>=0){start+=boundary.length;if(buffer.subarray(start,start+2).toString()==='--')break;if(buffer.subarray(start,start+2).toString()==='\r\n')start+=2;const next=buffer.indexOf(boundary,start);if(next<0)break;const headEnd=buffer.indexOf(Buffer.from('\r\n\r\n'),start);if(headEnd<0||headEnd>=next)break;const headers=buffer.subarray(start,headEnd).toString();const name=headers.match(/(?:^|;)\s*name="([^"]+)"/i)?.[1]||headers.match(/name="([^"]+)"/)?.[1];const filename=headers.match(/filename="([^"]*)"/)?.[1];const data=buffer.subarray(headEnd+4,next-2);if(name){if(filename)files[name]={name:filename,data};else fields[name]=data.toString('utf8');}start=next;}
 return {fields,files};
}
async function readBody(req){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>MAX_BODY)throw new Error('body too large');chunks.push(c);}const data=Buffer.concat(chunks),type=req.headers['content-type']||'';if(type.startsWith('multipart/form-data'))return splitMultipart(data,type);return {fields:Object.fromEntries(new URLSearchParams(data.toString())),files:{}};}
const looksZip=f=>f&&/\.zip$/i.test(f.name)&&f.data.length>100&&f.data.readUInt32LE(0)===0x04034b50;
const evidenceZip=f=>looksZip(f)&&classifyEvidence(f.data);
const safeEqual=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
const safeNext=n=>/^\/members\/(?!\/)/.test(n||'')?n:'/members/';

export function createApplication({port=4173,hozenPort=port+1,auditPort=port+2,archivePort=port+3,stateFile=null,originOverrides={},caseIdFactory=token,archiveFactory=null,privateFileLoader=null}={}){
 const sessions=new Map(),cases=new Map();let archive,complete;
 const origins={main:process.env.ASUNARO_ORIGIN||`http://127.0.0.1:${port}`,hozen:process.env.HOZEN_ORIGIN||`http://127.0.0.1:${hozenPort}`,audit:process.env.AUDIT_ORIGIN||`http://127.0.0.1:${auditPort}`,archive:process.env.ARCHIVE_ORIGIN||`http://127.0.0.1:${archivePort}`,...originOverrides};
 if(stateFile){try{const data=JSON.parse(readFileSync(stateFile,'utf8'));for(const [id,s] of data.sessions||[])if(Date.now()-s.created<28800000)sessions.set(id,s);for(const [id,c] of data.cases||[])if([...sessions.values()].some(s=>s.caseId===id))cases.set(id,c);}catch(e){if(e.code!=='ENOENT')throw e;}}
 let persistence=Promise.resolve();
 function persist(){if(stateFile){const data=JSON.stringify({sessions:[...sessions],cases:[...cases]});persistence=persistence.then(async()=>{await mkdir(path.dirname(stateFile),{recursive:true});await writeFile(stateFile+'.tmp',data);await rename(stateFile+'.tmp',stateFile);}).catch(e=>console.error('State persistence failed:',e.message));}}
 function send(res,status,body,type='text/html; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(body);}
 function redirect(res,url){res.writeHead(303,{'Location':url,'Cache-Control':'no-store'});res.end();}
 function sessionFor(req,res){
  const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('asunaro_session='))?.split('=')[1];let session=cookie&&sessions.get(cookie);
  if(!session){const id=token(),caseId=caseIdFactory();session={id,csrf:token(),caseId,accountId:null,created:Date.now()};sessions.set(id,session);if(!cases.has(caseId))cases.set(caseId,{contact:false,downloaded:false,ending:'',truth:false});res.setHeader('Set-Cookie',`asunaro_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.COOKIE_SECURE==='1'?'; Secure':''}`);}
  persist();return session;
 }
 async function handler(req,res,kind='main'){
  try{
   const url=new URL(req.url,'http://127.0.0.1');let pathname=decodeURIComponent(url.pathname);
   if(pathname.includes('\0')||pathname.includes('\\'))return send(res,400,'Bad request','text/plain; charset=utf-8');
   // Only this directory is a static root. Server sources and protected records are never served.
   if(req.method==='GET'&&(pathname.startsWith('/assets/')||pathname==='/styles.css'||pathname==='/app.js')){
    const target=path.resolve(publicRoot,'.'+pathname);if(!target.startsWith(publicRoot+path.sep))return send(res,404,notFound());
    try{const info=await stat(target);if(!info.isFile())throw new Error('not a file');const data=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});return res.end(data);}catch{return send(res,404,notFound());}
   }
   if(req.method==='GET'&&pathname==='/favicon.ico'){res.writeHead(302,{Location:'/assets/logo.png'});return res.end();}
   if(req.method==='GET'&&!path.extname(pathname)&&!pathname.endsWith('/')){res.writeHead(308,{Location:pathname+'/'+url.search});return res.end();}
   if(kind==='archive'){
    const session=sessionFor(req,res),ctx={session,csrf:session.csrf,origins,query:url.searchParams};
    if(req.method==='POST'){
     const {fields}=await readBody(req);if(!safeEqual(fields.csrf,session.csrf))return send(res,403,legacyLayout('受付できませんでした','<p>ページを開き直してお手続きください。</p>'));
     if(pathname==='/room/login/'){
      if(!safeEqual(fields.ticket,archiveTicket.id)||!safeEqual(fields.code,archiveTicket.code))return send(res,401,legacyLogin(session.csrf,{error:'閲覧票番号と照会符号をご確認ください。'}));
      session.archiveAccess=archiveTicket.id;persist();return redirect(res,'/room/');
     }
     if(pathname==='/room/logout/'){delete session.archiveAccess;persist();return redirect(res,'/room/');}
     return send(res,405,legacyLayout('受付できませんでした','<p>このページではお手続きいただけません。</p>'));
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed');
    const page=renderLegacy(pathname,ctx);return page?send(res,200,page):send(res,404,legacyLayout('資料が見つかりません','<p>該当する資料はありません。</p><p><a href="/collections/">収蔵目録へ</a></p>'));
   }
   if(kind!=='main'){
    if(!['GET','POST'].includes(req.method))return send(res,405,'Method not allowed');
    if(!['/','/receive/','/received/'].includes(pathname))return send(res,404,agencyPage(kind,'/',{origins,error:'ページが見つかりません。'}));
    if(req.method==='POST'){
     const {fields,files}=await readBody(req);const state=cases.get(fields.case);const valid=state&&evidenceZip(files.archive)&&String(fields.title||'').trim()&&String(fields.statement||'').trim();
     if(!valid)return send(res,400,agencyPage(kind,pathname,{caseId:fields.case||'',origins,error:'提出内容とZIP形式の添付資料をご確認ください。'}));
     if(state.ending==='end2')return send(res,409,agencyPage(kind,pathname,{caseId:fields.case,origins,error:'この照会に関する記録は、施設運営側の管理へ移管されています。受付担当へ別途ご確認ください。'}));
     if(kind==='audit'&&evidenceZip(files.archive)!=='complete'){state.auditPending=true;persist();return redirect(res,`/received/?case=${fields.case}`);}
     state.ending=kind==='audit'?'end3':'end1';persist();return redirect(res,`/received/?case=${fields.case}`);
    }
    const caseId=url.searchParams.get('case')||'';const state=cases.get(caseId);return send(res,200,agencyPage(kind,pathname,{caseId,origins,received:pathname==='/received/'&&!!(state?.ending||state?.auditPending),pending:!!state?.auditPending&&state?.ending!=='end3',ending:state?.ending||''}));
   }
   const session=sessionFor(req,res),caseState=cases.get(session.caseId),account=accounts[session.accountId];const ctx={account,csrf:session.csrf,caseState,caseId:session.caseId,query:url.searchParams,origins};
   if(req.method==='POST'){
    if(!pathname.startsWith('/members/'))return send(res,405,notFound());
    const {fields,files}=await readBody(req);if(!safeEqual(fields.csrf,session.csrf))return send(res,403,memberLayout('受付できませんでした','<h1>受付できませんでした。</h1><p>ページを開き直して再度お手続きください。</p>',ctx));
    if(pathname==='/members/login/'){
     const id=String(fields.id||'').trim(),candidate=accounts[id];
     if(!candidate||(candidate.role==='asakura'&&caseState.ending==='end2')||!safeEqual(candidate.password,String(fields.password||'')))return send(res,401,loginPage(session.csrf,{error:'会員IDまたはパスワードをご確認ください。',next:safeNext(fields.next)}));
     session.accountId=id;session.csrf=token();if(candidate.role==='asakura')caseState.truth=true;persist();return redirect(res,safeNext(fields.next));
    }
    if(!account)return redirect(res,'/members/login/');
    if(account.role==='asakura'&&caseState.ending==='end2')return send(res,403,memberLayout('登録終了','<h1>この登録は終了しました。</h1><p>運営事務局にお問い合わせください。</p>',ctx));
    if(pathname==='/members/logout/'){session.accountId=null;session.csrf=token();persist();return redirect(res,'/members/login/');}
    if(pathname==='/members/inquiry/'){
     const id=normalizeDocumentId(fields.record);const d=documents.find(d=>d.id===id&&d.roles.includes(account.role)&&d.inquiry);
     if(!d)return send(res,400,renderMember('/members/inquiry/',{...ctx,error:'文書IDと照会先をご確認ください。'}));
     caseState.contact=true;persist();return redirect(res,'/members/messages/');
    }
    if(pathname==='/members/reservations/'){
     if(['end1','end3'].includes(caseState.ending))return send(res,409,renderMember(pathname,ctx));
     const date=String(fields.date||''),time=String(fields.time||'');
     if(!reservationSpaces.some(([id])=>id===fields.space)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<'2026-11-02'||!/^\d{2}:\d{2}$/.test(time)||time<'09:00'||time>'20:00'||!String(fields.purpose||'').trim())return send(res,400,renderMember(pathname,{...ctx,error:'施設・利用日時・利用内容をご確認ください。'}));
     return redirect(res,'/members/reservations/?received=1');
    }
    if(pathname==='/members/contact/'){
     if(!String(fields.subject||'').trim()||!String(fields.message||'').trim())return send(res,400,renderMember(pathname,{...ctx,error:'件名と内容をご記入ください。'}));
     if(evidenceZip(files.attachment)){caseState.ending='end2';persist();}
     return redirect(res,'/members/contact/received/');
    }
    return send(res,404,notFound());
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed','text/plain; charset=utf-8');
   if(pathname.startsWith('/members/')){
    if(pathname==='/members/login/')return send(res,200,loginPage(session.csrf,{next:safeNext(url.searchParams.get('next'))}));
    if(!account)return redirect(res,'/members/login/?next='+encodeURIComponent(pathname+url.search));
    if(account.role==='asakura'&&caseState.ending==='end2')return send(res,403,memberLayout('登録終了','<h1>この登録は終了しました。</h1><p>運営事務局にお問い合わせください。</p>',ctx));
    if(account.role==='asakura'&&pathname==='/members/personal/')caseState.truth=true;
    if(pathname.startsWith('/members/download/')){
     if(pathname==='/members/download/hozen.zip'&&account.role==='institution'&&caseState.contact){archive??=archiveFactory?archiveFactory(false):makeArchive(new URL('./src/archive.mjs',import.meta.url));const data=await archive;caseState.downloaded=true;persist();res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent('保全資料_20261102.zip'));return send(res,200,data,'application/zip');}
     if(account.role==='asakura'){
      if(pathname==='/members/download/complete.zip'){complete??=archiveFactory?archiveFactory(true):makeArchive(new URL('./src/archive.mjs',import.meta.url),{complete:true});res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent('原本および移送関係資料.zip'));return send(res,200,await complete,'application/zip');}
      const name=path.basename(pathname);if(['records.json','continuity.json'].includes(name)){res.setHeader('Content-Disposition',`attachment; filename="${name}"`);return send(res,200,privateFileLoader?await privateFileLoader(name):await readFile(path.join(root,'private',name)),'application/json; charset=utf-8');}
     }
     return send(res,404,memberLayout('資料が見つかりません','<h1>該当する資料はありません。</h1>',ctx));
    }
    const page=renderMember(pathname,ctx);return page?send(res,200,page):send(res,404,memberLayout('資料が見つかりません','<h1>該当する資料はありません。</h1>',ctx));
   }
   if(pathname==='/people/asakura-tsumugi/'&&caseState.ending==='end2')return send(res,404,notFound());
   if(pathname==='/index.html')pathname='/';
   const page=renderPublic(pathname,{q:url.searchParams.get('q')||url.searchParams.get('method')||'',ending:caseState.ending,origins});return page?send(res,200,page):send(res,404,notFound());
  }catch(error){console.error('Request failed:',error.message);if(!res.headersSent)send(res,error.message==='body too large'?413:500,'お手続きを完了できませんでした。時間をおいて再度お試しください。','text/plain; charset=utf-8');else res.end();}
 }
 return {handler,sessions,cases,origins,flush:()=>persistence};
}

export async function startServers({port=Number(process.env.PORT||4173),hozenPort=Number(process.env.HOZEN_PORT||port+1),auditPort=Number(process.env.AUDIT_PORT||port+2),archivePort=Number(process.env.ARCHIVE_PORT||port+3),stateFile=null}={}){
 const app=createApplication({port,hozenPort,auditPort,archivePort,stateFile});const servers=[];
 for(const [kind,p] of [['main',port],['hozen',hozenPort],['audit',auditPort],['archive',archivePort]]){
  const server=http.createServer((req,res)=>app.handler(req,res,kind));await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(p,'127.0.0.1',resolve);});servers.push(server);
 }
 return {...app,servers,close:async()=>{await Promise.all(servers.map(s=>new Promise(resolve=>s.close(resolve))));await app.flush();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=await startServers({stateFile:process.env.STATE_FILE||path.join(root,'private','runtime-state.json')});console.log(`ASUNARO ${app.origins.main}\nRecords ${app.origins.hozen}\nReview  ${app.origins.audit}\nArchive ${app.origins.archive}`);
 const shutdown=()=>{app.close().finally(()=>process.exit(0));};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
