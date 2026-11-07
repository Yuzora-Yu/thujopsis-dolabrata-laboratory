// Shared by the local application and the static Pages preview.
// A byte range lets the browser seek without downloading the whole film again.
export function sendVideo(req,res,data,cacheControl='no-store'){
 const length=data.length;
 const headers={'Content-Type':'video/mp4','Content-Length':length,'Accept-Ranges':'bytes','Cache-Control':cacheControl,'X-Content-Type-Options':'nosniff'};
 let start=0,end=length-1,status=200;
 const range=req.method==='GET'&&req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
 if(range&&(range[1]||range[2])){
  start=range[1]?Number(range[1]):Math.max(0,length-Number(range[2]));
  end=range[1]&&range[2]?Math.min(length-1,Number(range[2])):length-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=length||end<start||(!range[1]&&Number(range[2])===0)){
   res.writeHead(416,{...headers,'Content-Length':0,'Content-Range':`bytes */${length}`});
   return res.end();
  }
  status=206;
  headers['Content-Range']=`bytes ${start}-${end}/${length}`;
  headers['Content-Length']=end-start+1;
 }
 res.writeHead(status,headers);
 return res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));
}
