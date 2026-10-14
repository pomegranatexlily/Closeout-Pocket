/* Packet Lily's local filing engine. No network calls, no server, no external library. */
(()=>{
'use strict';
const encoder=new TextEncoder();
const bytes=s=>encoder.encode(String(s));
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthKey=v=>/^\d{4}-(0[1-9]|1[0-2])-\d{2}/.test(String(v||''))?String(v).slice(0,7):'';
const monthFolder=key=>key.slice(0,4)+'/'+key.slice(5)+'-'+monthNames[Number(key.slice(5,7))-1];
const safeName=v=>(String(v||'Record').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,56)||'Record');
const money=v=>'$'+((Math.round(Number(String(v||'0').replace(/[$,]/g,''))*100)||0)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const cents=v=>Math.max(0,Math.round((Number(String(v||0).replace(/[$,]/g,''))||0)*100));
const csvCell=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+\-@\t\r]/,"'$&")+'"';
const csv=rows=>'\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
const fileReady=r=>Boolean(r&&r.company&&r.customer&&cents(r.total)>0&&(r.preparedAt||(r.workflowVersion!==2&&(r.id||r.archiveId))));
const availableMonths=records=>[...new Set(records.filter(fileReady).flatMap(r=>[monthKey(r.date||r.savedAt),...(r.payments||[]).filter(p=>!p.voidedAt).map(p=>monthKey(p.date))]).filter(Boolean))].sort().reverse();
const makePdfFromCanvases=canvases=>{
 if(!canvases.length||canvases.length>40)throw Error('PDF page count is out of range.');
 const chunks=[],offsets=[0];let length=0;
 const add=b=>{chunks.push(b);length+=b.length};
 const write=t=>add(bytes(t));
 const obj=(n,t)=>{offsets[n]=length;write(n+' 0 obj\n'+t+'\nendobj\n')};
 write('%PDF-1.4\n');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 obj(2,'<< /Type /Pages /Count '+canvases.length+' /Kids ['+canvases.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
 for(let i=0;i<canvases.length;i++){
  const canvas=canvases[i],page=3+i*3,imgId=page+1,streamId=page+2,alias='Im'+(i+1);
  const jpg64=canvas.toDataURL('image/jpeg',.82);
  if(!jpg64.startsWith('data:image/jpeg;base64,'))throw new Error('PDF image encoding failed.');
  const raw=atob(jpg64.split(',')[1]),jpg=new Uint8Array(raw.length);
  for(let n=0;n<raw.length;n++)jpg[n]=raw.charCodeAt(n);
  if(jpg[0]!==255||jpg[1]!==216)throw Error('Invalid JPEG for PDF');
  obj(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /'+alias+' '+imgId+' 0 R >> >> /Contents '+streamId+' 0 R >>');
  offsets[imgId]=length;
  write(imgId+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');
  add(jpg);write('\nendstream\nendobj\n');
  const commands='q\n595 0 0 842 0 0 cm\n/'+alias+' Do\nQ\n';
  obj(streamId,'<< /Length '+bytes(commands).length+' >>\nstream\n'+commands+'endstream');
 }
 const last=2+canvases.length*3,xref=length;
 write('xref\n0 '+(last+1)+'\n0000000000 65535 f \n');
 for(let n=1;n<=last;n++)write(String(offsets[n]).padStart(10,'0')+' 00000 n \n');
 write('trailer\n<< /Size '+(last+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
 return new Blob(chunks,{type:'application/pdf'});
};
const makePdfFromCanvas=canvas=>makePdfFromCanvases([canvas]);

function invoiceCanvas(r){
 const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('PDF drawing is unavailable.');
 ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,595,842);
 const gradient=ctx.createLinearGradient(0,0,595,166);
 gradient.addColorStop(0,'#271633');gradient.addColorStop(1,'#684588');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,595,170);
 ctx.textBaseline='top';
 function line(t,x,y,size=12,color='#30203f',weight='normal',width=480){
  ctx.font=weight+' '+size+'px system-ui,-apple-system,sans-serif';
  ctx.fillStyle=color;let val=String(t||'—').replace(/\s+/g,' ').trim();
  while(val.length>1&&ctx.measureText(val).width>width)val=val.slice(0,-2)+'…';
  ctx.fillText(val,x,y);
 }
 function wrap(t,x,y,max=470,limit=3,size=12,color='#574869',gap=17){
  ctx.font='normal '+size+'px system-ui,-apple-system,sans-serif';
  const items=String(t||'—').split(/\s+/);let rows=[],row='';
  for(const word of items){const next=row?row+' '+word:word;if(ctx.measureText(next).width>max&&row){rows.push(row);row=word}else row=next}
  if(row)rows.push(row);
  rows.slice(0,limit).forEach((r,i)=>line(r,x,y+i*gap,size,color,'normal',max));
 }
 line('PACKET LILY',43,24,22,'#ffffff','bold');
 line('BY POMEGRANATE × LILY',43,55,10,'#efc693','bold');
 line('CUSTOMER INVOICE',43,98,30,'#fff','bold');
 line(r.company||'Service provider',43,182,18,'#2d1a40','bold');
 const businessPlace=[r.businessAddress,[r.businessCity,r.businessState,r.businessZip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
 wrap([businessPlace,r.phone,r.companyEmail].filter(Boolean).join(' · '),43,215,503,2,11,'#7a7181',16);
 ctx.fillStyle='#e8deed';ctx.fillRect(43,267,509,1);
 line('PREPARED FOR',43,289,10,'#8a7895','bold');
 wrap(r.customer||'—',43,310,235,2,16,'#2e1e3d',21);
 const servicePlace=[r.address,[r.city,r.stateCode,r.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
 wrap(servicePlace,43,355,235,2,11,'#685b72');
 line('INVOICE DETAILS',308,289,10,'#8a7895','bold');
 wrap(r.ref||'—',308,313,235,2,13,'#30203f');
 line('Issued: '+(r.date||'Not set'),308,354,11,'#766981');
 line('Due: '+(r.due||'Not specified'),308,376,11,'#766981');
 ctx.fillStyle='#f6f0fb';ctx.fillRect(43,424,509,212);
 line('SERVICE',58,443,10,'#866c9b','bold');
 wrap(r.job||'Services',58,468,470,2,15,'#2f1d40',22);
 line('WORK / JOB SUMMARY',58,521,10,'#866c9b','bold');
 wrap([r.summary,r.work].filter(Boolean).join(' — ')||'Invoice for completed services.',58,545,477,4,11,'#60536d',17);
 ctx.fillStyle='#e8deed';ctx.fillRect(43,653,509,1);
 line('Job total',57,671,13,'#685775');
 line(money(r.total),430,671,14,'#261838','bold',110);
 line('Recorded payments',57,704,13,'#685775');
 line(money(r.paid),430,704,14,'#261838','bold',110);
 const due=Math.max(0,cents(r.total)-cents(r.paid));
 line('Balance due',57,740,15,'#69409c','bold');
 line(money(due/100),430,738,19,'#69409c','bold',110);
 line('Payment details and amount should be confirmed with the sender.',43,799,10,'#83738e');
 return canvas;
}
function makeInvoicePdf(r){return makePdfFromCanvas(invoiceCanvas(r))}
async function makeReportPdf(r){
 if(!fileReady(r))throw Error('Generate a valid invoice before sharing a PDF packet.');
 const pages=[invoiceCanvas(r)];
 const newPage=title=>{
  if(pages.length>=40)throw Error('Packet too large for a mobile PDF. Remove some details or photos.');
  const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('PDF drawing is unavailable');
  ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,595,842);
  ctx.fillStyle='#301c43';ctx.fillRect(0,0,595,88);
  ctx.fillStyle='#fff';ctx.font='bold 19px system-ui,-apple-system,sans-serif';ctx.fillText('PACKET LILY',42,33);
  ctx.fillStyle='#e7c7f3';ctx.font='12px system-ui,-apple-system,sans-serif';ctx.fillText(String(title).slice(0,70),42,61);
  ctx.fillStyle='#ebe1f0';ctx.fillRect(42,790,511,1);
  ctx.fillStyle='#796b84';ctx.font='10px system-ui,-apple-system,sans-serif';
  ctx.fillText((r.ref||'Invoice').slice(0,72)+' · '+r.customer,42,806);
  ctx.textAlign='right';ctx.fillText('Page '+(pages.length+1),553,806);ctx.textAlign='left';
  pages.push(canvas);return ctx;
 };
 const sections=[['SERVICE / JOB DESCRIPTION',r.job],['JOB SUMMARY',r.summary],['WORK PERFORMED',r.work],['CUSTOMER NOTES',r.notes]];
 const hasInfo=sections.some(([,value])=>String(value||'').trim());
 let ctx=null,y=116;
 const ensure=(need)=>{
  if(!ctx||y+need>768){ctx=newPage('JOB DETAILS · CONTINUATION');y=116}
 };
 const wrap=(text,width=499)=>{
  const lines=[];
  for(const para of String(text).split(/\r?\n/)){
   if(!para.trim()){lines.push('');continue}
   let current='';
   for(const word of para.split(/\s+/)){
    const next=current?current+' '+word:word;
    if(ctx.measureText(next).width>width&&current){lines.push(current);current=word}
    else current=next;
    if(ctx.measureText(current).width>width&&current.length>1){
     let chunk='';
     for(const char of current){
      if(chunk&&ctx.measureText(chunk+char).width>width){lines.push(chunk);chunk=char}else chunk+=char;
     }
     current=chunk;
    }
   }
   if(current)lines.push(current);
  }
  return lines;
 };
 if(hasInfo){
  for(const [title,content] of sections){
   if(!String(content||'').trim())continue;
   ensure(65);
   ctx.font='bold 12px system-ui,-apple-system,sans-serif';ctx.fillStyle='#693f95';ctx.fillText(title,43,y);y+=26;
   ctx.font='12px system-ui,-apple-system,sans-serif';
   const rows=wrap(content);
   for(const row of rows){
    ensure(19);
    ctx.fillStyle='#3d3046';ctx.font='12px system-ui,-apple-system,sans-serif';
    if(row)ctx.fillText(row,43,y);
    y+=row?19:12;
   }
   y+=23;
  }
 }
 const evidence=[...(r.photos?.before||[]).map((p,i)=>({p,label:'BEFORE · PHOTO '+(i+1)})),...(r.photos?.after||[]).map((p,i)=>({p,label:'AFTER · PHOTO '+(i+1)}))];
 if(evidence.length){
  const loadImage=src=>new Promise((resolve,reject)=>{
   const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Image could not be decoded'));img.src=src;
  });
  let photoCtx=null;
  for(let i=0;i<evidence.length;i++){
   if(i%2===0)photoCtx=newPage('JOB PHOTO EVIDENCE');
   const {p,label}=evidence[i],top=i%2===0?113:455;
   photoCtx.font='bold 13px system-ui,-apple-system,sans-serif';photoCtx.fillStyle='#5a3884';photoCtx.fillText(label,43,top);
   photoCtx.font='10px system-ui,-apple-system,sans-serif';photoCtx.fillStyle='#71657d';
   photoCtx.fillText(String(p.name||'Job photograph').slice(0,78),43,top+17);
   photoCtx.strokeStyle='#dfd1e8';photoCtx.strokeRect(43,top+32,508,283);
   try{
    const img=await loadImage(p.data);
    const width=Math.max(1,img.naturalWidth||img.width),height=Math.max(1,img.naturalHeight||img.height);
    const ratio=Math.min(500/width,273/height);
    const w=width*ratio,h=height*ratio;
    photoCtx.drawImage(img,297-w/2,top+37+(273-h)/2,w,h);
   }catch(error){
    photoCtx.fillStyle='#6b5c76';photoCtx.fillText('This photo could not be included. Refer to the original local backup.',55,top+171);
   }
  }
 }
 if(pages.length===1)return makePdfFromCanvas(pages[0]);
 return makePdfFromCanvases(pages);
}
const CRC=(()=>{const tab=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;tab[i]=c>>>0}return tab})();
const crc32=data=>{let c=0xFFFFFFFF;for(const b of data)c=CRC[(c^b)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
const word=(d,offset,n)=>{d[offset]=n&255;d[offset+1]=(n>>>8)&255};
const dword=(d,offset,n)=>{word(d,offset,n);word(d,offset+2,n>>>16)};
const nowDos=()=>{const d=new Date();return {time:(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2),date:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}};
/* Stored ZIP, including central directory and CRC32. No compression dependency. */
async function zip(files){
 const {time,date}=nowDos();let offset=0;const output=[],central=[];
 for(const f of files){
  const name=bytes(f.name),data=f.data instanceof Uint8Array?f.data:new Uint8Array(await f.data.arrayBuffer());
  if(name.length>65535||data.length>0xffffffff)throw Error('Archive entry too large.');
  const crc=crc32(data),local=new Uint8Array(30+name.length);
  dword(local,0,0x04034b50);word(local,4,20);word(local,6,0x0800);word(local,8,0);
  word(local,10,time);word(local,12,date);dword(local,14,crc);dword(local,18,data.length);dword(local,22,data.length);word(local,26,name.length);word(local,28,0);local.set(name,30);
  output.push(local,data);
  const cd=new Uint8Array(46+name.length);
  dword(cd,0,0x02014b50);word(cd,4,20);word(cd,6,20);word(cd,8,0x0800);word(cd,10,0);
  word(cd,12,time);word(cd,14,date);dword(cd,16,crc);dword(cd,20,data.length);dword(cd,24,data.length);word(cd,28,name.length);word(cd,30,0);
  word(cd,32,0);word(cd,34,0);word(cd,36,0);dword(cd,38,0);dword(cd,42,offset);cd.set(name,46);
  central.push(cd);offset+=local.length+data.length;
  if(offset>0xE0000000)throw Error('Archive is too large. Export fewer months.');
 }
 if(files.length>65535)throw Error('Too many archive files.');
 const endOffset=offset;
 for(const entry of central){output.push(entry);offset+=entry.length}
 const end=new Uint8Array(22);dword(end,0,0x06054b50);word(end,4,0);word(end,6,0);word(end,8,files.length);word(end,10,files.length);dword(end,12,offset-endOffset);dword(end,16,endOffset);word(end,20,0);output.push(end);
 return new Blob(output,{type:'application/zip'});
}
async function buildPackage(records,scope,receiptPdf,progress=()=>{}){
 const copies=records.map(r=>typeof structuredClone==='function'?structuredClone(r):JSON.parse(JSON.stringify(r)));
 const months=availableMonths(copies);
 if(scope!=='all'&&!months.includes(scope))throw Error('That month has no saved records.');
 const selected=copies.filter(r=>fileReady(r)&&(scope==='all'||monthKey(r.date||r.savedAt)===scope||(r.payments||[]).some(p=>!p.voidedAt&&monthKey(p.date)===scope)));
 if(!selected.length)throw Error('No locally saved invoices are available.');
 if(selected.length>180)throw Error('Too many invoices for one export; select a month.');
 const root='Packet-Lily-Records/',files=[];
 const add=(name,source)=>files.push({name:root+name,data:source instanceof Blob?source:bytes(source)});
 const invoiceRows=[['Invoice date','Invoice reference','Customer','Business','Service','Invoice total USD','Recorded payments USD','Balance outstanding USD','Status','Local archive ID']];
 const paymentRows=[['Payment date','Invoice reference','Customer','Amount received USD','Method','Payment reference','Receipt ID','Record source','Status']];
 const group=(key)=>monthFolder(key);
 let n=0;
 for(const r of selected){
  const invoiceMonth=monthKey(r.date||r.savedAt);
  const id=safeName(r.ref||r.id||'Invoice-'+n);n++;
  if(invoiceMonth&&(scope==='all'||scope===invoiceMonth)){
   add(group(invoiceMonth)+'/Invoices/Invoice-'+id+'.pdf',makeInvoicePdf(r));
   invoiceRows.push([r.date,r.ref,r.customer,r.company,r.job,(cents(r.total)/100).toFixed(2),(cents(r.paid)/100).toFixed(2),(Math.max(0,cents(r.total)-cents(r.paid))/100).toFixed(2),r.closedAt?'Closed':cents(r.total)<=cents(r.paid)?'Recorded paid':'Outstanding',r.id||'']);
  }
  for(const p of r.payments||[]){
   if(p.voidedAt)continue;
   const paidMonth=monthKey(p.date);
   if(!paidMonth||(scope!=='all'&&paidMonth!==scope))continue;
   paymentRows.push([p.date,r.ref,r.customer,(cents(p.amount)/100).toFixed(2),p.method,p.reference||'',p.id,p.source==='legacy'?'Legacy, unverified':'Owner-entered','Recorded, not bank-verified']);
   if(r.closedAt&&cents(r.paid)>=cents(r.total)&&p.source==='owner'&&p.verifiedByOwner===true){
    const receiptName='Receipt-'+safeName(p.id)+'-'+id+'.pdf';
    add(group(paidMonth)+'/Receipts/'+receiptName,receiptPdf(p,r));
   }
  }
  progress(n,selected.length);
 }
 const folders=[...new Set([
  ...invoiceRows.slice(1).map(row=>monthKey(row[0])),
  ...paymentRows.slice(1).map(row=>monthKey(row[0]))
 ])].filter(Boolean).sort();
 for(const key of folders){
  const inv=invoiceRows.filter((row,i)=>i===0||monthKey(row[0])===key);
  const pay=paymentRows.filter((row,i)=>i===0||monthKey(row[0])===key);
  add(group(key)+'/Tracking/invoices.csv',csv(inv));
  add(group(key)+'/Tracking/payments.csv',csv(pay));
 }
 const selectedBackup={app:'Packet Lily',version:1,createdAt:new Date().toISOString(),scope,source:'local-device',invoices:selected};
 add('Backup/invoices.json',JSON.stringify(selectedBackup,null,2));
 add('README.txt',[
  'PACKET LILY - ORGANIZED LOCAL RECORDS','',
  'This ZIP is a folder bundle. Extract it in the iPhone Files app to reveal year/month folders.',
  'Invoices are grouped by invoice issue month; payment receipts by actual recorded payment month.',
  'Invoices and receipts are PDFs. Tracking CSV files open in Excel or other spreadsheet tools.',
  'CSV is a ledger extract, not a verified profit report or tax return.',
  'Payment amounts were entered by the owner. Packet Lily has NOT independently verified the funds.',
  'Voided entries are excluded from PDFs/CSV. Legacy payment entries may appear in CSV with no receipt.',
  'Invoices are one-page summaries and may truncate lengthy work descriptions; photo attachments',
  'are preserved in Backup/invoices.json but are not embedded into the PDF summaries.',
  'The JSON backup may include private customer information. Keep it secure.',
  'This ZIP is not an automatic device backup. Save/extract it yourself and keep separate backups.',
  ''
 ].join('\n'));
 const blob=await zip(files);
 return {blob,filename:'Packet-Lily-Records_'+(scope==='all'?'All-Months_'+new Date().toISOString().slice(0,10):scope)+'.zip',count:selected.length,files:files.length,months:folders};
}
window.PacketLilyArchive={availableMonths,makeInvoicePdf,makeReportPdf,buildPackage,zip};
})();
