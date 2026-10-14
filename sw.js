/* Packet Lily: cache only public app shell. Never cache customer data, exports or remote content. */
const CACHE='packet-lily-shell-v4.0';
const ROOT='/Closeout-Pocket/';
const ASSETS=[ROOT,ROOT+'index.html',ROOT+'app.js',ROOT+'filing.js',ROOT+'brand.css',ROOT+'icon.svg',ROOT+'apple-touch-icon.png',ROOT+'privacy.html',ROOT+'manifest.webmanifest'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('closeout-shell-')||k.startsWith('packet-lily-shell-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(!ASSETS.includes(url.pathname))return;
 event.respondWith(fetch(req).then(response=>{
  if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)))}
  return response;
 }).catch(()=>caches.match(req)));
});
