// Run after render-facility-pv.cjs. Encoding is a local production step, not a build dependency.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=path.join(root,'.work','qa','pv','asunaro-facility-pv.mp4');
const target=path.join(root,'public','assets','video','asunaro-facility-pv.mp4');
const temporary=target+'.tmp.mp4';
if(!fs.existsSync(source))throw new Error('Render the source film first: node scripts/render-facility-pv.cjs');
fs.mkdirSync(path.dirname(target),{recursive:true});
try{
 const result=spawnSync(process.env.ASUNARO_FFMPEG||'ffmpeg',[
 '-hide_banner','-loglevel','error','-y','-i',source,'-map','0:v:0','-map','0:a:0',
 '-vf','setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709',
 '-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p',
 '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',
 '-r','30','-fps_mode','cfr','-c:a','copy','-movflags','+faststart',temporary,
],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error('FFmpeg exited with status '+result.status);
 fs.renameSync(temporary,target);
 console.log(target+' ('+fs.statSync(target).size+' bytes)');
}finally{
 if(fs.existsSync(temporary))fs.unlinkSync(temporary);
}
