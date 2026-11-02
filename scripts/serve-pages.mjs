import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist/pages'),port=Number(process.env.PREVIEW_PORT||4817),base=process.env.PAGES_BASE_PATH||'/thujopsis-dolabrata-laboratory';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(302,{Location:base+'/'});return res.end();}
  const suffix=decodeURIComponent(url.pathname.slice(base.length));if(!url.pathname.startsWith(base+'/')||suffix.includes('\\'))throw new Error('Invalid path');
  let file=path.resolve(root,'.'+suffix);if(!file.startsWith(root+path.sep)&&file!==root)throw new Error('Invalid path');
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(path.join(root,'404.html')));}
}).listen(port,'127.0.0.1',()=>console.log(`Pages preview http://127.0.0.1:${port}${base}/`));
