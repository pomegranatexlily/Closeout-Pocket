const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),prefix='/Closeout-Pocket/',port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const publicFiles=new Set(['index.html','app.js','filing.js','brand.css','sw.js','manifest.webmanifest','privacy.html','404.html','icon.svg','apple-touch-icon.png']);
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(!['GET','HEAD'].includes(req.method)||(!url.pathname.startsWith(prefix)&&url.pathname!=='/')){res.writeHead(404);return res.end()}
 const name=url.pathname==='/'||url.pathname===prefix?'index.html':url.pathname.slice(prefix.length);
 if(!publicFiles.has(name)){res.writeHead(404);return res.end()}
 const file=path.join(root,name);
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end()}
  res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD')return res.end();res.end(data)
 });
}).listen(port,'127.0.0.1',()=>console.log('Packet Lily browser-test site at http://127.0.0.1:'+port+prefix));
