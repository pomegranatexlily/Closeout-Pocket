(()=>{
'use strict';
const K_DRAFT='closeout-pocket-draft-v1',K_SAVED='closeout-pocket-saved-v1',K_PREFS='closeout-pocket-privacy-v1',K_PAYMENT_ACCOUNT='closeout-pocket-payment-account-v1',K_BUSINESS='closeout-pocket-business-v1';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const demo=()=>({company:'Northside Home Services',phone:'(555) 010-0188',companyEmail:'office@northside.example',customer:'Jordan Lee',customerEmail:'jordan@example.com',job:'Kitchen faucet repair & replacement',address:'218 Oak View Drive',city:'Dallas',stateCode:'TX',zip:'75201',date:today(),ref:'JP-1001',summary:'Customer reported a persistent leak under the kitchen faucet and requested replacement of the worn fixture.',work:'• Shut off the water supply and removed the existing faucet.\n• Installed a new customer-provided faucet and connected supply lines.\n• Checked all fittings for leaks and tested water pressure.\n• Cleaned the work area and walked the customer through the finished installation.',total:'250',paid:'50',due:'',notes:'Thank you for choosing Northside Home Services. Please reach out with any questions.',photos:{before:[],after:[]}});
const blank=()=>({company:'',phone:'',companyEmail:'',customer:'',customerEmail:'',job:'',address:'',city:'',stateCode:'',zip:'',date:today(),ref:'',summary:'',work:'',total:'',paid:'',due:'',paymentLink:'',paymentRequestConfirmed:false,paymentRequestAmount:'',paymentRequestConfirmedLink:'',paymentLinkNeedsRefresh:false,notes:'',photos:{before:[],after:[]}});
const fields=['company','phone','companyEmail','customer','customerEmail','job','address','city','stateCode','zip','date','ref','summary','work','total','paid','due','paymentLink','notes'];
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const safe=val=>String(val??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dash=(v)=>v? safe(v):'—';
const fmt=val=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(val)||0);
const num=v=>{const clean=String(v??'').replace(/[$,\s]/g,'');const n=Number(clean);return Math.max(0,Number.isFinite(n)?n:0)};
// Preserve the canonical raw amount in state; currency punctuation is display-only.
function cleanMoney(value){
  let text=String(value??'').replace(/[^0-9.]/g,'');
  const dot=text.indexOf('.');
  if(dot!==-1)text=text.slice(0,dot+1)+text.slice(dot+1).replace(/\./g,'').slice(0,2);
  const parts=text.split('.');
  parts[0]=parts[0].replace(/^0+(?=\d)/,'');
  if(!parts[0]&&dot!==-1)parts[0]='0';
  return parts.join('.');
}
function showMoney(value,settled=false){
  const clean=cleanMoney(value);
  if(!clean)return '';
  if(settled)return fmt(num(clean));
  const [whole,decimal]=clean.split('.');
  const groups=(whole||'0').replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return '$'+groups+(decimal===undefined?'':'.'+decimal);
}
function applyMoneyTyping(el){
  const raw=el.value;
  const caret=el.selectionStart??raw.length;
  const before=cleanMoney(raw.slice(0,caret)).length;
  const clean=cleanMoney(raw),display=showMoney(clean);
  el.value=display;
  let pos=display.startsWith('$')?1:0;
  if(before){let count=0;for(let i=0;i<display.length;i++){if(/[0-9.]/.test(display[i]))count++;if(count===before){pos=i+1;break}}}
  try{el.setSelectionRange(pos,pos)}catch(e){}
  return clean;
}

const niceDate=v=>{if(!v)return '—';const dt=new Date(v+'T12:00:00');return Number.isNaN(dt.getTime())?safe(v):dt.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})};
const retrieve=(k)=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const persist=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){toast('Browser storage is unavailable or full. Try a smaller photo or download your packet.');return false}};
const clone=v=>JSON.parse(JSON.stringify(v));
// Only a canonical $cashtag profile can be reused. Amount-specific Cash App Request links are invoice-specific.
function canonicalCashProfile(input){
 const raw=String(input||'').trim();
 if(/^\$[a-z0-9_]{1,30}$/i.test(raw))return 'https://cash.app/'+raw;
 try{
  const url=new URL(raw);
  const match=url.pathname.match(/^\/(\$[a-z0-9_]{1,30})\/?$/i);
  if(url.protocol!=='https:'||!['cash.app','www.cash.app'].includes(url.hostname.toLowerCase())||url.username||url.password||url.search||url.hash||!match)return '';
  return 'https://cash.app/'+match[1];
 }catch(e){return ''}
}
const previousDraft=retrieve(K_DRAFT),storedBusiness=retrieve(K_BUSINESS);
function businessFrom(v){const p=v&&typeof v==='object'?v:{};return {company:String(p.company||'').slice(0,300),phone:String(p.phone||'').slice(0,300),companyEmail:String(p.companyEmail||'').slice(0,300),paymentLink:canonicalCashProfile(p.paymentLink)}}
let businessProfile=businessFrom(storedBusiness||{company:previousDraft?.company,phone:previousDraft?.phone,companyEmail:previousDraft?.companyEmail,paymentLink:retrieve(K_PAYMENT_ACCOUNT)?.link||canonicalCashProfile(previousDraft?.paymentLink)});
let defaultCashAppLink=businessProfile.paymentLink;
function newInvoice(){return {...blank(),company:businessProfile.company,phone:businessProfile.phone,companyEmail:businessProfile.companyEmail,paymentLink:defaultCashAppLink,ref:'CP-'+today().replace(/-/g,'')+'-'+(globalThis.crypto?.randomUUID?.().slice(0,8).toUpperCase()||Math.random().toString(36).slice(2,10).toUpperCase())}}
let state=normalize(previousDraft||newInvoice());let saved=retrieve(K_SAVED);if(!Array.isArray(saved))saved=[];
const storedPreferences=retrieve(K_PREFS);
let deviceSaving=storedPreferences?.enabled===true||(storedPreferences===null&&!!(retrieve(K_DRAFT)||saved.length));
let privacyAcknowledged=storedPreferences?.acknowledged===true||storedPreferences===null&&deviceSaving;
let tab='build',toastTimer;
function normalize(v){
 const o={...blank(),...v};
 // Older drafts stored "street, city, ST" as one line: migrate when unambiguous.
 if(!o.city && !o.stateCode && typeof o.address==='string'){
   const parts=o.address.match(/^(.+),\s*([^,]+),\s*([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/);
   if(parts){o.address=parts[1];o.city=parts[2];o.stateCode=parts[3].toUpperCase();o.zip=parts[4]||''}
 }
 const photoList=items=>Array.isArray(items)?items.slice(0,4).filter(p=>p&&typeof p==='object'&&typeof p.data==='string'&&p.data.length<2000000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.data)).map(p=>({data:p.data,name:String(p.name||'photo').slice(0,120)})):[];
 o.photos={before:photoList(v?.photos?.before),after:photoList(v?.photos?.after)};
 for(const field of fields){
  if(field==='total'||field==='paid')continue;
  const limit=['work','summary','notes'].includes(field)?10000:300;
  o[field]=String(o[field]??'').slice(0,limit);
 }
 o.total=cleanMoney(o.total);o.paid=cleanMoney(o.paid);o.paymentRequestAmount=cleanMoney(o.paymentRequestAmount);
 return o;
}
function fullAddress(){const location=[state.city,state.stateCode].filter(Boolean).join(state.city&&state.stateCode?', ':' ');return [state.address,[location,state.zip].filter(Boolean).join(' ')].filter(Boolean).join('\n')}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3300)}
const icons={build:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h4"/></svg>',preview:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',saved:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h14v18l-7-4-7 4z"/></svg>'};
icons.business='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V5l8-3 8 3v16M3 21h18M9 9h6M9 13h6M10 21v-4h4v4"/></svg>';
const labels={build:'New invoice',preview:'Preview',saved:'Invoices',business:'My Business'};
function nav(){for(const target of ['#sideNav','#bottomNav']){const host=$(target);host.innerHTML=Object.keys(labels).map(k=>`<button type="button" data-switch="${k}" class="${tab===k?'active':''}" aria-current="${tab===k?'page':'false'}">${icons[k]}<span>${labels[k]}</span></button>`).join('')}}
function switchTo(which){if(!labels[which])return;tab=which;$$('.screen').forEach(el=>el.classList.toggle('active',el.id==='screen-'+which));nav();$('#crumb').textContent=labels[which];if(which==='preview')renderReport();if(which==='saved')renderSaved();if(which==='saved')renderStorageChoice();if(which==='business')renderBusinessSettings();window.scrollTo({top:0,behavior:'instant'})}
function loadForm(){for(const field of fields){const el=$(`[data-field="${field}"]`);if(el)el.value=(field==='total'||field==='paid')?showMoney(state[field],true):state[field]??''}renderBalance();renderThumbs();renderReport();renderPaymentStatus();const txt=$('#businessOnInvoice');if(txt)txt.textContent=state.company?'From '+state.company:'Set up your business details under My Business.'}
function renderStorageChoice(){
 const notice=$('#deviceSaveNotice');
 if(notice)notice.hidden=privacyAcknowledged;
 const status=$('#storageStateText');
 if(status)status.textContent=deviceSaving?'Local saving is ON. Invoices and photos stay in this browser until you delete them.':'Local saving is OFF. New invoices and drafts will not be archived on this device.';
 const btn=$('#toggleDeviceSaveBtn');
 if(btn)btn.textContent=deviceSaving?'Pause saving':'Enable saving';
}
function chooseDeviceSaving(enabled){
 deviceSaving=Boolean(enabled);privacyAcknowledged=true;
 persist(K_PREFS,{enabled:deviceSaving,acknowledged:true,changedAt:new Date().toISOString()});
 if(deviceSaving)autosave();
 renderStorageChoice();
 toast(deviceSaving?'Local invoice saving enabled.':'Local saving paused. Existing records remain until erased.');
}
function eraseDeviceData(){
 if(!confirm('Permanently delete all invoices, photos, and drafts saved in this browser? Download an archive backup first.'))return;
 try{
  localStorage.removeItem(K_DRAFT);localStorage.removeItem(K_SAVED);
  state=newInvoice();saved=[];loadForm();renderSaved();switchTo('build');
  toast('All local invoices and drafts erased from this browser.');
 }catch(e){toast('Could not erase website storage in this browser.')}
}
function autosave(){if(deviceSaving)persist(K_DRAFT,state)}
function renderBusinessSettings(){
 const fields={businessName:businessProfile.company,businessPhone:businessProfile.phone,businessEmail:businessProfile.companyEmail,defaultCashApp:businessProfile.paymentLink};
 for(const [id,value] of Object.entries(fields)){const field=$('#'+id);if(field&&document.activeElement!==field)field.value=value}
 $('#defaultCashStatus').textContent=businessProfile.paymentLink?'Saved Cash App account: '+businessProfile.paymentLink+' — profile link, amount entered by payer.':'No default Cash App account saved yet.';
}
function applyBusinessToInvoice(quiet=false){
 if(!businessProfile.company){toast('Save your business name first.');return false}
 if(!quiet&&state.archiveId&&!confirm('Change the business and payment details on this saved invoice?'))return false;
 const previousLink=state.paymentLink;
 state.company=businessProfile.company;state.phone=businessProfile.phone;state.companyEmail=businessProfile.companyEmail;
 // Don't overwrite a request-specific link during silent business autofill.
 state.paymentLink=quiet&&previousLink&&!canonicalCashProfile(previousLink)?previousLink:businessProfile.paymentLink;
 if(previousLink!==state.paymentLink){state.paymentRequestConfirmed=false;state.paymentRequestAmount='';state.paymentRequestConfirmedLink='';state.paymentLinkNeedsRefresh=false}
 loadForm();autosave();if(!quiet)toast('Business details applied to this invoice.');return true;
}
function saveBusinessSettings(){
 const company=$('#businessName').value.trim(),phone=$('#businessPhone').value.trim(),companyEmail=$('#businessEmail').value.trim(),cash=$('#defaultCashApp').value.trim(),link=canonicalCashProfile(cash);
 if(!company){toast('Enter your business name.');$('#businessName').focus();return}
 if(companyEmail&&!$('#businessEmail').checkValidity()){toast('Enter a valid business email.');$('#businessEmail').focus();return}
 if(cash&&!link){toast('Enter a valid $cashtag or profile link, not an amount-specific request.');$('#defaultCashApp').focus();return}
 const formerBusiness=businessProfile.company;
 const next=businessFrom({company,phone,companyEmail,paymentLink:link});
 if(!persist(K_BUSINESS,next))return;
 businessProfile=next;defaultCashAppLink=next.paymentLink;
 if(!state.archiveId&&(!state.company||state.company===formerBusiness))applyBusinessToInvoice(true);
 renderBusinessSettings();toast('Business details saved for future invoices.');
}
function renderBalance(){const total=num(state.total),paid=num(state.paid),bal=total-paid;$('#liveTotal').textContent=fmt(total);$('#livePaid').textContent=fmt(paid);$('#balanceLabel').textContent=bal>=0?'Balance due':'Customer credit';$('#liveBalance').textContent=fmt(Math.abs(bal))}
function renderThumbs(){for(const kind of ['before','after']){$('#'+kind+'Thumbs').innerHTML=state.photos[kind].map((item,i)=>`<div class="thumb"><img src="${safe(item.data)}" alt="${kind} photo ${i+1}"><button type="button" data-remove-photo="${kind}:${i}" aria-label="Remove ${kind} photo ${i+1}">×</button></div>`).join('')}}
function imgSection(){const n=state.photos.before.length+state.photos.after.length;if(!n)return '';const columns=['before','after'].map(kind=>state.photos[kind].map((p,i)=>`<div class="r-image-cell"><img src="${safe(p.data)}" alt="${kind} photo ${i+1}"><span>${kind==='before'?'BEFORE':'AFTER'} · Photo ${i+1}</span></div>`).join('')).join('');return `<section class="r-section"><h3>Photo documentation</h3><div class="r-image-grid">${columns}</div></section>`}
function cashAppUrl(){
 const raw=String(state.paymentLink||'').trim();if(!raw)return '';
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||!['cash.app','www.cash.app'].includes(url.hostname.toLowerCase())||url.username||url.password||url.pathname==='/')return '';
  return url.href;
 }catch(e){return ''}
}
function isCashtagProfile(){
 try{return /^\/\$[a-z0-9_]{1,30}\/?$/i.test(new URL(cashAppUrl()).pathname)}catch(e){return false}
}
function paymentRequestState(){
 const url=cashAppUrl(),due=Math.max(0,num(state.total)-num(state.paid));
 if(due<=0.005)return 'paid';
 if(!url)return 'missing';
 if(isCashtagProfile())return 'manual';
 if(state.paymentLinkNeedsRefresh)return 'stale';
 if(state.paymentRequestConfirmed&&state.paymentRequestConfirmedLink===url&&Math.round(num(state.paymentRequestAmount)*100)===Math.round(due*100))return 'exact';
 if(state.paymentRequestConfirmed)return 'stale';
 return 'unconfirmed';
}
function payableLink(){
 const status=paymentRequestState();
 return status==='exact'||status==='manual'?cashAppUrl():'';
}
function renderPaymentStatus(){
 const status=paymentRequestState(),due=fmt(Math.max(0,num(state.total)-num(state.paid)));
 const el=$('#paymentLinkStatus'),check=$('#confirmPaymentAmount');
 check.checked=status==='exact';
 check.disabled=['manual','missing','paid','stale'].includes(status);
 const msg={
  paid:'Paid in full. No payment request needed.',
  missing:'Paste a Cash App request link to enable payments.',
  manual:'This is a $cashtag profile link. The customer must enter '+due+' manually.',
  unconfirmed:'Confirm you requested exactly '+due+' inside Cash App.',
  stale:'Invoice balance changed or link mismatch. Create a new Cash App request for '+due+'.',
  exact:'Amount-specific request confirmed by you for '+due+'.'
 };
 el.textContent=msg[status];
}
function paymentRequestText(){
 const balance=num(state.total)-num(state.paid),link=payableLink(),type=paymentRequestState();
 if(balance<=0.005||!link)return '';
 return [
  (state.company||'Closeout Pocket')+' · PAYMENT REQUEST',
  'Invoice '+(state.ref||'—'),
  'For: '+(state.job||'Service'),
  'Amount due: '+fmt(balance),
  state.due?'Due: '+niceDate(state.due):'',
  type==='exact'?'Cash App request for this amount:':'Pay using this Cash App profile (enter '+fmt(balance)+'):',
  link,
  'Verify the recipient and amount before sending.'
 ].filter(Boolean).join('\n');
}
async function sharePaymentRequest(){
 const balance=num(state.total)-num(state.paid),link=payableLink();
 if(balance<=0.005){toast('No balance is due on this invoice.');return}
 if(!link){
  toast('Paste a valid Cash App request and confirm its amount, or use a $cashtag profile link.');
  switchTo('build');focusOptionalField('#paymentLink');return;
 }
 if(!savePacket(true))toast('Archive unavailable; remember to export a backup.');
 const message=paymentRequestText();
 if(navigator.share){
  try{
   await navigator.share({title:'Payment request '+(state.ref||''),text:message});
   return;
  }catch(e){if(e?.name==='AbortError')return;console.error('Share request failed',e)}
 }
 try{
  await navigator.clipboard.writeText(message);
  toast('Payment request copied. Paste it into Messages or email.');
 }catch(e){
  toast('Unable to share here. Open Safari and try again.');
 }
}
function reportMarkup(){const total=num(state.total),paid=num(state.paid),balance=total-paid,credits=balance<0,fullPacket=Boolean(state.job||state.work||state.summary||state.photos.before.length||state.photos.after.length);return `<div class="report-band"></div><div class="report-body"><div class="report-top"><div><div class="r-brand">${dash(state.company)}</div><div class="r-company">${safe(state.phone)}${state.phone&&state.companyEmail?' · ':''}${safe(state.companyEmail)}</div></div><div style="text-align:right"><div class="r-label">${fullPacket?"Completion report":"Customer invoice"}</div><div class="r-title">${fullPacket?"Job Packet":"Invoice"}</div><div class="r-badge">${fullPacket?"✓ WORK COMPLETED":balance>0.005?"BALANCE DUE":"✓ PAID"}</div></div></div><div class="r-details"><div><div class="r-label">Prepared for</div><div class="r-value">${dash(state.customer)}</div><div class="r-light">${dash(state.customerEmail)}<br>${safe(fullAddress()).replace(/\n/g,'<br>')||'—'}</div></div><div><div class="r-label">${fullPacket?'Job details':'Invoice details'}</div><div class="r-value">${dash(state.job||"Services")}</div><div class="r-light">${fullPacket?'Completed':'Issued'}: ${niceDate(state.date)}<br>Reference: ${dash(state.ref)}</div></div></div>${state.summary?`<section class="r-section"><h3>Job overview</h3><p>${safe(state.summary)}</p></section>`:''}${fullPacket?`<section class="r-section"><h3>Work completed</h3><p>${state.work?safe(state.work):"See job description."}</p></section>`:""}${imgSection()}<section class="r-finance"><div><span>Job total</span><strong>${fmt(total)}</strong></div><div><span>Payments received</span><strong>${fmt(paid)}</strong></div><div class="due"><span>${credits?'Customer credit':'Balance due'}</span><strong>${fmt(Math.abs(balance))}</strong></div>${state.due?`<div style="margin:11px 0 0"><span>Payment due by</span><strong>${niceDate(state.due)}</strong></div>`:''}</section>${balance>0.005&&payableLink()?`<section class="r-payment-link"><p class="pay-label">Pay through Cash App</p><a href="${safe(payableLink())}" target="_blank" rel="noopener noreferrer">${paymentRequestState()==='exact'?'Pay '+fmt(balance)+' with Cash App →':'Open Cash App — enter '+fmt(balance)+' →'}</a><p class="pay-explain">${paymentRequestState()==='manual'?'This is a profile link: enter the amount yourself. ':''}Payment is handled by Cash App, not Closeout Pocket. Confirm the amount and recipient before approving.</p></section>`:''}${state.notes?`<section class="r-section"><h3>Additional notes</h3><p>${safe(state.notes)}</p></section>`:''}<div class="r-footer"><span>Prepared by ${dash(state.company)}</span><span>${dash(state.ref)} · ${niceDate(state.date)}</span></div></div>`}
function renderReport(){$('#report').innerHTML=reportMarkup()}
function renderSaved(){
 const wrap=$('#savedList');
 const term=($('#archiveSearch').value||'').trim().toLowerCase();
 const records=saved.map((p,i)=>({p,i})).filter(({p})=>[p.customer,p.customerEmail,p.job,p.ref,p.company].some(v=>String(v||'').toLowerCase().includes(term)));
 const outstanding=saved.reduce((sum,p)=>sum+Math.max(0,num(p.total)-num(p.paid)),0);
 $('#archiveStats').textContent=saved.length+' invoices · '+fmt(outstanding)+' outstanding';
 if(!saved.length){wrap.innerHTML='<div class="empty"><strong>No invoices archived yet.</strong><p>Generate a Job Packet or select Save to archive to keep a copy here.</p><button class="btn primary" data-switch="build">Create your first invoice</button></div>';return}
 if(!records.length){wrap.innerHTML='<div class="empty"><strong>No matching invoices.</strong><p>Search by customer, job, or invoice number.</p></div>';return}
 wrap.innerHTML='<div class="saved-list">'+records.map(({p,i})=>{
  const balance=num(p.total)-num(p.paid);
  const label=balance>0.005?'Outstanding '+fmt(balance):balance<-.005?'Credit '+fmt(-balance):'Paid in full';
  return '<div class="saved-item"><div><h3>'+dash(p.ref||'No invoice #')+' · '+dash(p.job||'Invoice')+'</h3><p>'+dash(p.customer||'No customer')+' · '+dash(p.customerEmail||'No email')+' · '+niceDate(p.date)+'</p><p>Total '+fmt(num(p.total))+' · Paid '+fmt(num(p.paid))+'</p><span class="archive-pill">'+safe(label)+'</span></div><div class="actions"><button class="btn small" data-open="'+i+'">Open</button><button class="btn small danger" data-delete="'+i+'">Delete</button></div></div>';
 }).join('')+'</div>';
}
async function shrink(file){return new Promise((resolve,reject)=>{const img=new Image();let blobUrl=URL.createObjectURL(file);img.onload=()=>{try{const m=1150,scale=Math.min(1,m/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.76);URL.revokeObjectURL(blobUrl);resolve(data)}catch(e){URL.revokeObjectURL(blobUrl);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(blobUrl);reject(new Error('Image could not be read'))};img.src=blobUrl})}
async function photosFrom(kind,files){let remaining=Math.max(0,4-state.photos[kind].length);if(!remaining){toast('Maximum four '+kind+' photos.');return}let added=0;for(const f of Array.from(files).slice(0,remaining)){if(!f.type.startsWith('image/'))continue;try{const data=await shrink(f);state.photos[kind].push({data,name:f.name});added++}catch(e){toast('Could not read '+f.name)}}renderThumbs();renderReport();autosave();if(added)toast(`${added} ${kind} photo${added!==1?'s':''} added`)}
function snapshot(){
 const copy=clone(state);
 copy.id=state.archiveId||'packet-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
 copy.savedAt=new Date().toISOString();
 return copy;
}
function savePacket(quiet=false){
 if(!deviceSaving){if(!quiet)toast('Enable local saving to archive invoices.');return false}
 const item=snapshot(),old=saved.find(x=>x.id===item.id);
 if(old)item.savedAt=old.savedAt||item.savedAt;
 const next=[item,...saved.filter(x=>x.id!==item.id)];
 if(!persist(K_SAVED,next)){
  if(!quiet)toast('Could not archive. Export a report and free browser space.');
  return false;
 }
 saved=next;state.archiveId=item.id;autosave();
 if(!quiet)toast(old?'Invoice updated in archive':'Invoice saved to archive');
 return true;
}
function downloadBlob(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function exportArchive(){
 if(!saved.length){toast('No invoices to export yet.');return}
 const body={app:'Closeout Pocket',version:1,exportedAt:new Date().toISOString(),invoices:saved};
 downloadBlob(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}),'closeout-pocket-invoices-'+today()+'.json');
 toast('Backup downloaded. Save it in your Files app.');
}
async function importArchive(file){
 if(!file)return;
 if(file.size>25000000){toast('Backup file is too large.');return}
 try{
  const data=JSON.parse(await file.text());
  if(data?.app!=='Closeout Pocket'||!Array.isArray(data.invoices)||data.invoices.length>1000)throw Error('Invalid backup format');
  const records=data.invoices;
  if(!records.every(p=>p&&typeof p==='object'&&!Array.isArray(p)&&typeof p.id==='string'&&p.id.length<150&&typeof p.photos==='object'&&p.photos!==null))throw Error('Invalid invoice record');
  if(!confirm('Import '+records.length+' invoices? Matching IDs will be replaced.'))return;
  const merged=new Map(saved.map(p=>[p.id,p]));
  for(const p of records)merged.set(p.id,normalize(p));
  const next=[...merged.values()].sort((x,y)=>String(y.savedAt||'').localeCompare(String(x.savedAt||'')));
  if(persist(K_SAVED,next)){saved=next;renderSaved();toast('Imported '+records.length+' invoice records')}
 }catch(e){console.error('Cannot import archive',e);toast('Backup could not be imported.')}
}
function emailInvoice(){
 const recipient=String(state.customerEmail||'').trim();
 const field=$('#customerEmail');
 if(!recipient||!field.checkValidity()){
  toast('Enter a valid customer email address.');
  switchTo('build');focusOptionalField('#customerEmail');return;
 }
 const status=paymentRequestState();
 if(status==='stale'||status==='unconfirmed'){toast('Update and confirm the Cash App request before emailing.');switchTo('build');focusOptionalField('#paymentLink');return}
 const bal=num(state.total)-num(state.paid);
 const subject='Invoice '+(state.ref||state.job||'Service')+' — '+(state.company||'Closeout Pocket');
 const body=[
  'Hello '+(state.customer||'')+',','','Here are your invoice details:',
  'Invoice number: '+(state.ref||'—'),
  'Service: '+(state.job||'Services'),
  'Completed: '+niceDate(state.date),
  'Service address: '+fullAddress().replace(/\n/g,', '),
  'Work completed: '+(state.work||state.summary||'—').slice(0,1200),
  'Total: '+fmt(num(state.total)),
  'Paid: '+fmt(num(state.paid)),
  (bal<0?'Customer credit':'Balance due')+': '+fmt(Math.abs(bal)),
  state.due?'Due date: '+niceDate(state.due):'',
  state.notes||'',payableLink()&&bal>0.005?'\nPAY NOW — Cash App '+(paymentRequestState()==='exact'?'amount-specific request':'profile (enter amount)')+':\n'+payableLink()+'\nConfirm the payee and amount in Cash App.':'','','Prepared by '+(state.company||'Service provider')
 ].join('\n');
 savePacket(true);
 toast('Opening email draft. Review and tap Send.');
 window.location.href='mailto:'+recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
}
function reportFile(){
  // Creates the customer's complete report as an independent, portable HTML file.
  renderReport();
  const content=$('#report').innerHTML;
  if(!content || !$('#report .report-body'))throw new Error('The Job Packet could not be rendered.');
  const css=$('style').textContent;
  const title=(state.ref||state.job||'job-packet').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+$/,'').slice(0,60)||'job-packet';
  const doc=`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>${safe(title)} — Job Packet</title><style>${css}
body{background:#f4f7f6;padding:26px 12px}.report{margin:0 auto}@media print{body{padding:0}}
</style></head><body><article class="report">${content}</article>
<footer style="max-width:830px;margin:14px auto;text-align:center;font:12px/1.6 system-ui;color:#697785">
Customer copy · Prepared with Closeout Pocket. For PDF, use your browser’s Print / Save as PDF command.
</footer></body></html>`;
  return {name:title+'.html',blob:new Blob([doc],{type:'text/html;charset=utf-8'})};
}
function downloadHTML(){
  let url;
  try{
    const {name,blob}=reportFile();
    url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    toast('Report file prepared. Check your browser’s downloads or Files app.');
  }catch(e){
    if(url)URL.revokeObjectURL(url);
    console.error('Could not save Job Packet',e);
    toast('Could not save here. Try Share Job Packet or open in Safari.');
  }
}
async function shareReport(){
  try{
    const {name,blob}=reportFile();
    const file=typeof File==='function'?new File([blob],name,{type:'text/html'}):null;
    if(file && navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({title:(state.job||'Completed job')+' — Job Packet',files:[file]});
        return;
      }catch(e){if(e && e.name==='AbortError')return;}
    }
    downloadHTML();
  }catch(e){
    console.error('Could not share Job Packet',e);
    toast('Sharing isn’t available here. Use Save report file or Safari.');
  }
}
function generatePacket(){
  try{
    if(!state.company.trim()){switchTo('business');toast('Save your business details before generating an invoice.');return}
    if(!state.customer.trim()){switchTo('build');$('#customer').focus();toast('Enter the customer name.');return}
    if(num(state.total)<=0){switchTo('build');$('#total').focus();toast('Enter an invoice amount above zero.');return}
    renderReport();
    if(!$('#report .report-body'))throw new Error('Report unavailable');
    const archived=savePacket(true);
    switchTo('preview');
    const summary=state.ref||state.job||'this job';
    const balance=Math.max(0,num(state.total)-num(state.paid));
 $('#generationCaption').textContent='Invoice '+summary+' is ready. '+(archived?'Saved in your device archive. ':'Device archive off; download a report to keep it. ')+(balance>0.005?'Balance due: '+fmt(balance)+'. Share a matching Cash App request or email the invoice.':'Payment received in full.');
    $('#generationBanner').hidden=false;
    $('#generationBanner').scrollIntoView({behavior:'auto',block:'start'});
  }catch(e){
    console.error('Packet generation failed',e);
    toast('Could not generate the report. Please try again.');
    alert('Could not generate the Job Packet. Return to the form and try again.');
  }
}
async function copySummary(){const total=num(state.total),paid=num(state.paid),balance=total-paid;const content=[`${state.company||'Service completion'} — Job Packet`,`Customer: ${state.customer||'—'}`,`Service address: ${fullAddress()||'—'}`,`Job: ${state.job||'—'}`,`Completed: ${niceDate(state.date)}`,`Work completed:\n${state.work||'—'}`,`Job total: ${fmt(total)}`,`Paid: ${fmt(paid)}`,`${balance<0?'Customer credit':'Balance due'}: ${fmt(Math.abs(balance))}`,state.notes?`Notes: ${state.notes}`:''].filter(Boolean).join('\n\n');try{await navigator.clipboard.writeText(content);toast('Summary copied to clipboard')}catch(e){const t=document.createElement('textarea');t.value=content;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('Summary copied to clipboard')}catch(e){toast('Copy unavailable in this browser')}t.remove()}}
function startOver(next){state=next;$('#generationBanner').hidden=true;const extras=$('#invoiceExtras');if(extras)extras.open=false;loadForm();autosave();switchTo('build')}
function beginNewInvoice(){if((state.customer||num(state.total)>0||state.job||state.work||state.photos.before.length||state.photos.after.length)&&!confirm('Start a new invoice? Changes that are not archived will be replaced.'))return;startOver(newInvoice())}
function focusOptionalField(selector){const details=$('#invoiceExtras');if(details)details.open=true;const input=$(selector);if(input)input.focus();}
function updateFieldFromInput(e){
 const el=e.target;if(!el.dataset.field)return;
 const field=el.dataset.field;
 const oldBalance=Math.round((num(state.total)-num(state.paid))*100);
 const oldLink=String(state.paymentLink||'');
 state[field]=(field==='total'||field==='paid')?applyMoneyTyping(el):el.value;
 if((field==='total'||field==='paid')&&oldBalance!==Math.round((num(state.total)-num(state.paid))*100)&&state.paymentRequestConfirmed)state.paymentLinkNeedsRefresh=true;
 if(field==='paymentLink'&&oldLink!==state.paymentLink){state.paymentRequestConfirmed=false;state.paymentRequestAmount='';state.paymentRequestConfirmedLink='';state.paymentLinkNeedsRefresh=false}
 renderBalance();renderReport();renderPaymentStatus();autosave();
}
document.addEventListener('input',updateFieldFromInput);
document.addEventListener('change',updateFieldFromInput);
document.addEventListener('blur',e=>{
 const el=e.target;
 if(el.dataset.field==='total'||el.dataset.field==='paid'){
   el.value=showMoney(state[el.dataset.field],true);
 }
},true);

document.addEventListener('click',e=>{const fresh=e.target.closest('[data-new-invoice]');if(fresh){beginNewInvoice();return}const sw=e.target.closest('[data-switch]');if(sw){switchTo(sw.dataset.switch);return}const rm=e.target.closest('[data-remove-photo]');if(rm){const [k,i]=rm.dataset.removePhoto.split(':');state.photos[k].splice(Number(i),1);renderThumbs();renderReport();autosave();return}const op=e.target.closest('[data-open]');if(op){const item=saved[Number(op.dataset.open)];if(item){startOver(normalize({...clone(item),archiveId:item.id}));toast('Archived invoice opened')}return}const del=e.target.closest('[data-delete]');if(del){const i=Number(del.dataset.delete);if(!confirm('Delete this saved packet from this browser?'))return;const next=saved.filter((_,j)=>j!==i);if(persist(K_SAVED,next)){saved=next;renderSaved();toast('Invoice deleted from archive')}return}});
$('#beforeFiles').addEventListener('change',e=>{photosFrom('before',e.target.files);e.target.value=''});
$('#afterFiles').addEventListener('change',e=>{photosFrom('after',e.target.files);e.target.value=''});
$('#enableDeviceSaveBtn').addEventListener('click',()=>chooseDeviceSaving(true));
$('#sessionOnlyBtn').addEventListener('click',()=>chooseDeviceSaving(false));
$('#toggleDeviceSaveBtn').addEventListener('click',()=>chooseDeviceSaving(!deviceSaving));
$('#eraseDeviceBtn').addEventListener('click',eraseDeviceData);
$('#previewBtn').addEventListener('click',generatePacket);
$('#sharePacketBtn').addEventListener('click',shareReport);
$('#emailInvoiceBtn').addEventListener('click',emailInvoice);
$('#saveBusinessBtn').addEventListener('click',saveBusinessSettings);
$('#applyBusinessBtn').addEventListener('click',()=>applyBusinessToInvoice());
$('#copyCashRequestBtn').addEventListener('click',async()=>{
 const amount=fmt(Math.max(0,num(state.total)-num(state.paid)));
 const note=(state.ref||'Invoice')+' · '+(state.job||'Service');
 const message='Request amount: '+amount+'\nCash App note: '+note;
 try{await navigator.clipboard.writeText(message);toast('Exact request amount and note copied. Open Cash App → Request.')}catch(e){toast('Copy unavailable. Request '+amount+' in Cash App.')}
});
$('#confirmPaymentAmount').addEventListener('change',e=>{
 if(!e.target.checked){state.paymentRequestConfirmed=false;state.paymentRequestAmount='';state.paymentRequestConfirmedLink=''}
 else if(paymentRequestState()==='unconfirmed'){
  state.paymentRequestConfirmed=true;
  state.paymentRequestAmount=cleanMoney(String(num(state.total)-num(state.paid)));
  state.paymentRequestConfirmedLink=cashAppUrl();
  state.paymentLinkNeedsRefresh=false;
 }
 renderPaymentStatus();renderReport();autosave();
});
$('#sharePaymentBtn').addEventListener('click',sharePaymentRequest);
$('#archiveSearch').addEventListener('input',renderSaved);
$('#exportArchiveBtn').addEventListener('click',exportArchive);
$('#importArchiveFile').addEventListener('change',async e=>{await importArchive(e.target.files[0]);e.target.value=''});
$('#savePacketFileBtn').addEventListener('click',downloadHTML);
$('#printBtn').addEventListener('click',()=>window.print());
$('#copyBtn').addEventListener('click',copySummary);
$('#saveBtn').addEventListener('click',()=>savePacket(false));
$('#blankBtn').addEventListener('click',beginNewInvoice);
$('#demoBtn').addEventListener('click',()=>startOver(demo()));
loadForm();nav();renderStorageChoice();renderBusinessSettings();
if('serviceWorker' in navigator && window.isSecureContext){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
})();
