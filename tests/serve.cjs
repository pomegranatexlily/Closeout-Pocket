const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),prefix='/Closeout-Pocket/',port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const publicFiles=new Set(['index.html','app.js','filing.js','brand.css','sw.js','manifest.webmanifest','privacy.html','404.html','icon.svg','favicon-32.png','icon-192.png','icon-512.png','apple-touch-icon.png']);
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(!['GET','HEAD'].includes(req.method)||(!url.pathname.startsWith(prefix)&&url.pathname!=='/')){res.writeHead(404);return res.end()}
 const name=url.pathname==='/'||url.pathname===prefix?'index.html':url.pathname.slice(prefix.length);
 if(!publicFiles.has(name)){res.writeHead(404);return res.end()}
 const file=path.join(root,name);
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);return res.end()}
  res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD')return res.end();
  // Production GitHub Pages uses HTTPS. WebKit upgrades local HTTP scripts to
  // HTTPS when the HTML's upgrade-insecure-requests meta directive is present.
  // This local-only response adjustment retains every other CSP restriction.
  // Never edit the production index.html to work around an HTTP test fixture.
  const body=name==='index.html'
    ?Buffer.from(data.toString('utf8').replace('; upgrade-insecure-requests',''))
    :data;
  res.end(body);
 });
}).listen(port,'127.0.0.1',()=>console.log('Packet Lily browser-test site at http://127.0.0.1:'+port+prefix));
