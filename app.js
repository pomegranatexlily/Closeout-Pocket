(()=>{
'use strict';
const K_DRAFT='closeout-pocket-draft-v1',K_SAVED='closeout-pocket-saved-v1',K_PREFS='closeout-pocket-privacy-v1',K_PAYMENT_ACCOUNT='closeout-pocket-payment-account-v1',K_BUSINESS='closeout-pocket-business-v1';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const demo=()=>({company:'Northside Home Services',phone:'(555) 010-0188',companyEmail:'office@northside.example',customer:'Jordan Lee',customerEmail:'jordan@example.com',job:'Kitchen faucet repair & replacement',address:'218 Oak View Drive',city:'Dallas',stateCode:'TX',zip:'75201',date:today(),ref:'JP-1001',summary:'Customer reported a persistent leak under the kitchen faucet and requested replacement of the worn fixture.',work:'• Shut off the water supply and removed the existing faucet.\n• Installed a new customer-provided faucet and connected supply lines.\n• Checked all fittings for leaks and tested water pressure.\n• Cleaned the work area and walked the customer through the finished installation.',total:'250',paid:'50',due:'',notes:'Thank you for choosing Northside Home Services. Please reach out with any questions.',photos:{before:[],after:[]}});
const blank=()=>({payments:[],closedAt:'',company:'',phone:'',companyEmail:'',businessAddress:'',businessCity:'',businessState:'',businessZip:'',customer:'',customerEmail:'',job:'',address:'',city:'',stateCode:'',zip:'',date:today(),ref:'',summary:'',work:'',total:'',paid:'',due:'',paymentLink:'',paymentRequestConfirmed:false,paymentRequestAmount:'',paymentRequestConfirmedLink:'',paymentLinkNeedsRefresh:false,notes:'',photos:{before:[],after:[]}});
const fields=['company','phone','companyEmail','businessAddress','businessCity','businessState','businessZip','customer','customerEmail','job','address','city','stateCode','zip','date','ref','summary','work','total','paid','due','paymentLink','notes'];
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

const cents=v=>Math.round(num(v)*100);
const paymentMethods=new Set(['Cash App','Cash','Bank transfer','Check','Card / other','Previously recorded']);
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
function businessFrom(v){const p=v&&typeof v==='object'?v:{};return {company:String(p.company||'').slice(0,300),phone:String(p.phone||'').slice(0,300),companyEmail:String(p.companyEmail||'').slice(0,300),businessAddress:String(p.businessAddress||'').slice(0,300),businessCity:String(p.businessCity||'').slice(0,300),businessState:String(p.businessState||'').slice(0,30),businessZip:String(p.businessZip||'').slice(0,20),paymentLink:canonicalCashProfile(p.paymentLink)}}
let businessProfile=businessFrom(storedBusiness||{company:previousDraft?.company,phone:previousDraft?.phone,companyEmail:previousDraft?.companyEmail,businessAddress:previousDraft?.businessAddress,businessCity:previousDraft?.businessCity,businessState:previousDraft?.businessState,businessZip:previousDraft?.businessZip,paymentLink:retrieve(K_PAYMENT_ACCOUNT)?.link||canonicalCashProfile(previousDraft?.paymentLink)});
let defaultCashAppLink=businessProfile.paymentLink;
function newInvoice(){return {...blank(),company:businessProfile.company,phone:businessProfile.phone,companyEmail:businessProfile.companyEmail,businessAddress:businessProfile.businessAddress,businessCity:businessProfile.businessCity,businessState:businessProfile.businessState,businessZip:businessProfile.businessZip,paymentLink:defaultCashAppLink,ref:'PL-'+today().replace(/-/g,'')+'-'+(globalThis.crypto?.randomUUID?.().slice(0,8).toUpperCase()||Math.random().toString(36).slice(2,10).toUpperCase())}}
let state=normalize(previousDraft||newInvoice());let saved=retrieve(K_SAVED);if(!Array.isArray(saved))saved=[];
const storedPreferences=retrieve(K_PREFS);
let deviceSaving=storedPreferences?.enabled===true||(storedPreferences===null&&!!(retrieve(K_DRAFT)||saved.length));
let privacyAcknowledged=storedPreferences?.acknowledged===true||storedPreferences===null&&deviceSaving;
let tab='build',toastTimer,receiptPaymentId='';
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
 const legacy=!Array.isArray(v?.payments)&&cents(o.paid)>0;
 const sourcePayments=legacy?[{id:'legacy-1',amount:o.paid,date:o.date||today(),method:'Previously recorded',reference:'',note:'Carried forward from an earlier amount-paid field.',recordedAt:'',source:'legacy',verifiedByOwner:false,voidedAt:''}]:v?.payments;
 o.payments=(Array.isArray(sourcePayments)?sourcePayments:[]).slice(0,200).filter(p=>p&&typeof p==='object'&&!Array.isArray(p)).map((p,i)=>({
  id:String(p.id||'payment-'+i).slice(0,120),
  amount:cleanMoney(p.amount),
  date:/^\d{4}-\d{2}-\d{2}$/.test(String(p.date||''))?String(p.date):today(),
  method:paymentMethods.has(p.method)?p.method:'Card / other',
  reference:String(p.reference||'').slice(0,120),
  note:String(p.note||'').slice(0,400),
  recordedAt:String(p.recordedAt||'').slice(0,50),
  source:p.source==='legacy'?'legacy':'owner',
  verifiedByOwner:p.source!=='legacy'&&p.verifiedByOwner===true,
  voidedAt:String(p.voidedAt||'').slice(0,50)
 })).filter(p=>cents(p.amount)>0&&cents(p.amount)<=100000000000);
 o.paid=(o.payments.reduce((sum,p)=>sum+(p.voidedAt?0:cents(p.amount)),0)/100).toFixed(2);
 o.closedAt=typeof o.closedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(o.closedAt)&&cents(o.paid)>=cents(o.total)&&cents(o.total)>0?o.closedAt.slice(0,50):'';
 return o;
}
function fullAddress(){const location=[state.city,state.stateCode].filter(Boolean).join(state.city&&state.stateCode?', ':' ');return [state.address,[location,state.zip].filter(Boolean).join(' ')].filter(Boolean).join('\n')}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3300)}
const icons={build:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h4"/></svg>',preview:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',saved:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h14v18l-7-4-7 4z"/></svg>'};
icons.business='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V5l8-3 8 3v16M3 21h18M9 9h6M9 13h6M10 21v-4h4v4"/></svg>';
const labels={build:'New invoice',preview:'Preview',saved:'Invoices',business:'My Business'};
function nav(){for(const target of ['#sideNav','#bottomNav']){const host=$(target);host.innerHTML=Object.keys(labels).map(k=>`<button type="button" data-switch="${k}" class="${tab===k?'active':''}" aria-current="${tab===k?'page':'false'}">${icons[k]}<span>${labels[k]}</span></button>`).join('')}}
function switchTo(which){if(!labels[which])return;tab=which;$('.screen').forEach(el=>el.classList.toggle('active',el.id==='screen-'+which));nav();$('#crumb').textContent=labels[which];if(which==='preview'){renderReport();renderPaymentCenter()}if(which==='saved')renderSaved();if(which==='saved')renderStorageChoice();if(which==='business')renderBusinessSettings();window.scrollTo({top:0,behavior:'instant'})}
function loadForm(){for(const field of fields){const el=$(`[data-field="${field}"]`);if(el)el.value=(field==='total'||field==='paid')?showMoney(state[field],true):state[field]??''}renderBalance();renderThumbs();renderReport();renderPaymentStatus();renderPaymentCenter();const txt=$('#businessOnInvoice');if(txt)txt.textContent=state.company?'From '+state.company:'Set up your business details under My Business.'}
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
 const fields={businessName:businessProfile.company,businessPhone:businessProfile.phone,businessEmail:businessProfile.companyEmail,businessStreet:businessProfile.businessAddress,businessCity:businessProfile.businessCity,businessState:businessProfile.businessState,businessZip:businessProfile.businessZip,defaultCashApp:businessProfile.paymentLink};
 for(const [id,value] of Object.entries(fields)){const field=$('#'+id);if(field&&document.activeElement!==field)field.value=value}
 $('#defaultCashStatus').textContent=businessProfile.paymentLink?'Saved Cash App account: '+businessProfile.paymentLink+' — profile link, amount entered by payer.':'No default Cash App account saved yet.';
}
function applyBusinessToInvoice(quiet=false){
 if(state.closedAt){toast('Reopen this invoice before editing its business information.');return false}
 if(!businessProfile.company){toast('Save your business name first.');return false}
 if(!quiet&&state.archiveId&&!confirm('Change the business and payment details on this saved invoice?'))return false;
 const previousLink=state.paymentLink;
 state.company=businessProfile.company;state.phone=businessProfile.phone;state.companyEmail=businessProfile.companyEmail;state.businessAddress=businessProfile.businessAddress;state.businessCity=businessProfile.businessCity;state.businessState=businessProfile.businessState;state.businessZip=businessProfile.businessZip;
 // Don't overwrite a request-specific link during silent business autofill.
 state.paymentLink=quiet&&previousLink&&!canonicalCashProfile(previousLink)?previousLink:businessProfile.paymentLink;
 if(previousLink!==state.paymentLink){state.paymentRequestConfirmed=false;state.paymentRequestAmount='';state.paymentRequestConfirmedLink='';state.paymentLinkNeedsRefresh=false}
 loadForm();autosave();if(!quiet)toast('Business details applied to this invoice.');return true;
}
function saveBusinessSettings(){
 const company=$('#businessName').value.trim(),phone=$('#businessPhone').value.trim(),companyEmail=$('#businessEmail').value.trim(),cash=$('#defaultCashApp').value.trim(),businessAddress=$('#businessStreet').value.trim(),businessCity=$('#businessCity').value.trim(),businessState=$('#businessState').value.trim(),businessZip=$('#businessZip').value.trim(),link=canonicalCashProfile(cash);
 if(!company){toast('Enter your business name.');$('#businessName').focus();return}
 if(companyEmail&&!$('#businessEmail').checkValidity()){toast('Enter a valid business email.');$('#businessEmail').focus();return}
 if(cash&&!link){toast('Enter a valid $cashtag or profile link, not an amount-specific request.');$('#defaultCashApp').focus();return}
 const formerBusiness=businessProfile.company;
 const next=businessFrom({company,phone,companyEmail,businessAddress,businessCity,businessState,businessZip,paymentLink:link});
 if(!persist(K_BUSINESS,next))return;
 businessProfile=next;defaultCashAppLink=next.paymentLink;
 if(!state.archiveId&&(!state.company||state.company===formerBusiness))applyBusinessToInvoice(true);
 renderBusinessSettings();toast('Business details saved for future invoices.');
}
function clearBusinessSettings(){
 if(!confirm('Clear the saved business profile and default Cash App account from this browser? Existing invoices will remain unchanged.'))return;
 try{localStorage.removeItem(K_BUSINESS);localStorage.removeItem(K_PAYMENT_ACCOUNT)}catch(e){toast('Could not remove the business profile.');return}
 businessProfile=businessFrom({});defaultCashAppLink='';renderBusinessSettings();toast('Saved business profile cleared. Existing invoices are unchanged.');
}
function renderBalance(){const total=num(state.total),paid=num(state.paid),bal=total-paid;$('#liveTotal').textContent=fmt(total);$('#livePaid').textContent=fmt(paid);$('#balanceLabel').textContent=bal>=0?'Balance due':'Customer credit';$('#liveBalance').textContent=fmt(Math.abs(bal));const prior=$('#paid');if(prior)prior.value=fmt(paid)}
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
  (state.company||'Packet Lily')+' · PAYMENT REQUEST',
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
function reportMarkup(){const total=num(state.total),paid=num(state.paid),balance=total-paid,credits=balance<0,fullPacket=Boolean(state.job||state.work||state.summary||state.photos.before.length||state.photos.after.length);const businessLocation=[state.businessCity,state.businessState].filter(Boolean).join(', '),businessAddress=[state.businessAddress,[businessLocation,state.businessZip].filter(Boolean).join(' ')].filter(Boolean).join(', ');return `<div class="report-band"></div><div class="report-body"><div class="report-top"><div><div class="r-brand">${dash(state.company)}</div><div class="r-company">${safe(state.phone)}${state.phone&&state.companyEmail?' · ':''}${safe(state.companyEmail)}${businessAddress?'<br>'+safe(businessAddress):''}</div></div><div style="text-align:right"><div class="r-label">${fullPacket?"Completion report":"Customer invoice"}</div><div class="r-title">${fullPacket?"Job Packet":"Invoice"}</div><div class="r-badge">${fullPacket?"✓ WORK COMPLETED":balance>0.005?"BALANCE DUE":"✓ PAID"}</div></div></div><div class="r-details"><div><div class="r-label">Prepared for</div><div class="r-value">${dash(state.customer)}</div><div class="r-light">${dash(state.customerEmail)}<br>${safe(fullAddress()).replace(/\n/g,'<br>')||'—'}</div></div><div><div class="r-label">${fullPacket?'Job details':'Invoice details'}</div><div class="r-value">${dash(state.job||"Services")}</div><div class="r-light">${fullPacket?'Completed':'Issued'}: ${niceDate(state.date)}<br>Reference: ${dash(state.ref)}</div></div></div>${state.summary?`<section class="r-section"><h3>Job overview</h3><p>${safe(state.summary)}</p></section>`:''}${fullPacket?`<section class="r-section"><h3>Work completed</h3><p>${state.work?safe(state.work):"See job description."}</p></section>`:""}${imgSection()}<section class="r-finance"><div><span>Job total</span><strong>${fmt(total)}</strong></div><div><span>Payments received</span><strong>${fmt(paid)}</strong></div><div class="due"><span>${credits?'Customer credit':'Balance due'}</span><strong>${fmt(Math.abs(balance))}</strong></div>${state.due?`<div style="margin:11px 0 0"><span>Payment due by</span><strong>${niceDate(state.due)}</strong></div>`:''}</section>${balance>0.005&&payableLink()?`<section class="r-payment-link"><p class="pay-label">Pay through Cash App</p><a href="${safe(payableLink())}" target="_blank" rel="noopener noreferrer">${paymentRequestState()==='exact'?'Pay '+fmt(balance)+' with Cash App →':'Open Cash App — enter '+fmt(balance)+' →'}</a><p class="pay-explain">${paymentRequestState()==='manual'?'This is a profile link: enter the amount yourself. ':''}Payment is handled by Cash App, not Packet Lily. Confirm the amount and recipient before approving.</p></section>`:''}${state.notes?`<section class="r-section"><h3>Additional notes</h3><p>${safe(state.notes)}</p></section>`:''}<div class="r-footer"><span>Prepared by ${dash(state.company)}</span><span>${dash(state.ref)} · ${niceDate(state.date)}</span></div></div>`}
function renderReport(){$('#report').innerHTML=reportMarkup()}

/* Owner-confirmed payments: no gateway, bank feed, or provider verification. */
function activePayments(){return (state.payments||[]).filter(p=>!p.voidedAt)}
function currentReceipt(){return activePayments().find(p=>p.id===receiptPaymentId&&p.source==='owner'&&p.verifiedByOwner===true)||null}
function reconcilePaid(){
 const before=cents(state.paid);
 const after=activePayments().reduce((sum,p)=>sum+cents(p.amount),0);
 state.paid=(after/100).toFixed(2);
 if(before!==after&&state.paymentRequestConfirmed)state.paymentLinkNeedsRefresh=true;
 return after;
}
function renderPaymentCenter(){
 const total=cents(state.total),paid=cents(state.paid),balance=total-paid,closed=Boolean(state.closedAt);
 const complete=total>0&&balance<=0&&paid>0;
 const tag=$('#invoicePaymentStatus');
 tag.dataset.status=closed?'closed':complete?'paid':paid>0?'partial':'due';
 tag.textContent=closed?'Closed · Paid in full':complete?'Paid · Ready to close':paid>0?'Partially paid':'Awaiting payment';
 $('#deskInvoiceTotal').textContent=fmt(total/100);
 $('#deskPaidTotal').textContent=fmt(paid/100);
 $('#deskBalanceTotal').textContent=fmt(Math.max(0,balance)/100);
 const finish=$('#paymentFinish');
 finish.hidden=!complete;
 if(complete)finish.innerHTML=closed?
  '<strong>✓ Job closed. Payment recorded in full.</strong><p>Closed '+safe(new Date(state.closedAt).toLocaleDateString('en-US'))+'. Payment entries were recorded by the business owner; Packet Lily did not verify funds. You can reopen the invoice if a correction is needed.</p>':
  '<strong>✓ Paid in full — ready for closeout.</strong><p>Your recorded payments cover the invoice total. Review the records below, then select Complete &amp; close invoice.</p>';
 const log=$('#paymentLog');
 $('#paymentCount').textContent=(state.payments||[]).length+' record'+((state.payments||[]).length===1?'':'s');
 log.innerHTML=!(state.payments||[]).length?
  '<p class="help">No payments recorded yet. Confirm a deposit outside Packet Lily before recording it here.</p>':
  state.payments.slice().reverse().map(p=>{
   const invalid=Boolean(p.voidedAt),legacy=p.source==='legacy',canReceipt=!invalid&&!legacy&&p.verifiedByOwner;
   const meta=[p.method,niceDate(p.date),p.reference?'Reference: '+p.reference:'',legacy?'Legacy entry · confirmation unavailable':'Recorded by business owner',p.note||'',invalid?'VOIDED · '+p.voidedAt.slice(0,10):''].filter(Boolean).map(safe).join(' · ');
   return '<div class="payment-line'+(invalid?' is-voided':'')+'"><div><span class="payment-amount">'+fmt(cents(p.amount)/100)+(invalid?' · Voided':'')+'</span><div class="payment-meta">'+meta+'</div></div><div class="payment-line-actions">'+(canReceipt?'<button type="button" class="btn small" data-view-receipt="'+safe(p.id)+'">Receipt</button>':'')+(!invalid&&!closed?'<button type="button" class="btn danger small" data-void-payment="'+safe(p.id)+'">Void entry</button>':'')+'</div></div>';
  }).join('');
 const form=$('#recordPaymentForm');
 form.hidden=closed||balance<=0||total<=0;
 const amount=$('#payEntryAmount');
 if(!form.hidden&&!amount.value)amount.value=showMoney((balance/100).toFixed(2),true);
 if(!$('#payEntryDate').value)$('#payEntryDate').value=today();
 $('#closeInvoiceBtn').hidden=closed||!complete;
 $('#reopenInvoiceBtn').hidden=!closed;
 const receipt=currentReceipt();
 $('#receiptPanel').hidden=!receipt;
 $('#receiptDocument').innerHTML=receipt?receiptMarkup(receipt):'';
}
function recordPayment(){
 if(state.closedAt){toast('Reopen the invoice before making payment corrections.');return}
 if(!state.company.trim()||!state.customer.trim()||cents(state.total)<=0){toast('Enter the business, customer, and invoice amount first.');return}
 if((state.payments||[]).length>=200){toast('This invoice has reached its payment record limit.');return}
 const raw=cleanMoney($('#payEntryAmount').value),amount=cents(raw),due=cents(state.total)-cents(state.paid);
 if(amount<=0||amount>due){toast('Enter a positive payment no greater than the balance due ('+fmt(Math.max(0,due)/100)+').');$('#payEntryAmount').focus();return}
 const date=$('#payEntryDate').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today()||Number.isNaN(new Date(date+'T12:00:00').getTime())){toast('Select a valid payment date, not in the future.');return}
 if(!$('#payOwnerConfirmed').checked){toast('Confirm you independently checked that the money arrived.');return}
 const method=$('#payEntryMethod').value;
 if(!paymentMethods.has(method)||method==='Previously recorded'){toast('Choose a valid payment method.');return}
 const reference=$('#payEntryReference').value.trim().slice(0,120);
 const note=$('#payEntryNote').value.trim().slice(0,400);
 const payment={id:'PLR-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),amount:(amount/100).toFixed(2),date,method,reference,note,recordedAt:new Date().toISOString(),source:'owner',verifiedByOwner:true,voidedAt:''};
 state.payments.push(payment);
 reconcilePaid();
 receiptPaymentId=payment.id;
 $('#payEntryAmount').value='';
 $('#payEntryReference').value='';
 $('#payEntryNote').value='';
 $('#payOwnerConfirmed').checked=false;
 renderBalance();renderReport();renderPaymentStatus();renderPaymentCenter();
 const archived=savePacket(true);
 toast('Payment '+fmt(amount/100)+' recorded by you.'+(archived?' Invoice updated.':' Not archived; enable local saving or export your records.'));
}
function voidPayment(id){
 if(state.closedAt){toast('Reopen the invoice before voiding a payment.');return}
 const p=(state.payments||[]).find(x=>x.id===id&&!x.voidedAt);
 if(!p||!confirm('Void the '+fmt(cents(p.amount)/100)+' payment entry? The entry remains in the history, but it no longer counts toward the balance.'))return;
 p.voidedAt=new Date().toISOString();
 if(receiptPaymentId===id)receiptPaymentId=activePayments().filter(x=>x.source==='owner').slice(-1)[0]?.id||'';
 reconcilePaid();renderBalance();renderReport();renderPaymentStatus();renderPaymentCenter();
 const archived=savePacket(true);
 toast(archived?'Payment entry voided and invoice updated.':'Entry voided in session; save an updated backup.');
}
function closeInvoice(){
 if(state.closedAt)return;
 if(cents(state.total)<=0||cents(state.paid)<cents(state.total)||!activePayments().length){toast('Record the full payment before closing the invoice.');return}
 if(!confirm('Confirm you checked the actual payments outside Packet Lily. Close this invoice as paid in full? Packet Lily does not verify deposits.'))return;
 state.closedAt=new Date().toISOString();
 renderReport();renderPaymentCenter();
 const archived=savePacket(true);
 toast(archived?'Invoice closed and saved.':'Invoice closed in this session only. Enable saving or export a backup.');
}
function reopenInvoice(){
 if(!state.closedAt||!confirm('Reopen this completed invoice for corrections? Its closed status will be cleared.'))return;
 state.closedAt='';
 renderReport();renderPaymentCenter();
 const archived=savePacket(true);
 toast(archived?'Invoice reopened and archive updated.':'Invoice reopened in session; save a backup.');
}
function receiptMarkup(p){
 const total=cents(state.total),paid=cents(state.paid),balance=total-paid;
 const businessLoc=[state.businessCity,state.businessState].filter(Boolean).join(', ');
 const businessAddress=[state.businessAddress,[businessLoc,state.businessZip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
 const details=[
  ['Paid by',state.customer||'—'],
  ['Invoice',state.ref||'—'],
  ['Date received',niceDate(p.date)],
  ['Payment method',p.method],
  ['Receipt reference',p.id],
  ['Provider reference',p.reference||'Not supplied'],
  ['Recorded by',state.company||'Business owner'],
  ['Invoice status',state.closedAt?'Closed · paid in full':balance<=0?'Paid in full · not closed':'Partially paid']
 ].map(([label,value])=>'<div><span>'+safe(label)+'</span><strong>'+safe(value)+'</strong></div>').join('');
 return '<div class="receipt-top"><div class="receipt-tag">PAYMENT RECEIPT · BUSINESS RECORD</div><div class="receipt-brand">Packet Lily<small>BY POMEGRANATE × LILY</small></div><h3>Payment recorded.</h3><p>Prepared by '+safe(state.company||'the business owner')+'. '+safe([state.phone,state.companyEmail,businessAddress].filter(Boolean).join(' · '))+'</p></div><div class="receipt-main"><div class="receipt-amount">'+fmt(cents(p.amount)/100)+'</div><div class="receipt-grid">'+details+'</div><div class="receipt-totals"><div><span>Invoice total</span><strong>'+fmt(total/100)+'</strong></div><div><span>Total recorded payments</span><strong>'+fmt(paid/100)+'</strong></div><div><span>Current balance due</span><strong>'+fmt(Math.max(0,balance)/100)+'</strong></div></div></div><div class="receipt-note">'+(p.note?'<strong>Note:</strong> '+safe(p.note)+'<br>':'')+'This receipt is a record entered and confirmed by the business owner. Packet Lily did not independently verify the transaction or the arrival of funds. Current invoice totals may change if later corrections are made.</div>';
}
function receiptText(p){
 const paid=cents(state.paid),total=cents(state.total);
 return ['PACKET LILY · PAYMENT RECEIPT','Recorded by: '+(state.company||'Business owner'),'Customer: '+(state.customer||'—'),'Invoice: '+(state.ref||'—'),'Payment recorded: '+fmt(cents(p.amount)/100),'Date received: '+niceDate(p.date),'Method: '+p.method,'Receipt reference: '+p.id,p.reference?'Transaction reference: '+p.reference:'','Total recorded payments: '+fmt(paid/100),'Current balance: '+fmt(Math.max(0,total-paid)/100),p.note?'Note: '+p.note:'','Owner-confirmed record only. Packet Lily did not independently verify the transaction.'].filter(Boolean).join('\n');
}
function downloadReceipt(){
 const p=currentReceipt();if(!p){toast('Select an owner-confirmed payment to create a receipt.');return}
 const css='*{box-sizing:border-box}body{margin:0;padding:20px;background:#f8f6fb;font:14px/1.5 system-ui,-apple-system,sans-serif;color:#2d1e3e}.receipt-sheet{max-width:740px;margin:auto;border-radius:16px;background:#fff;overflow:hidden;border:1px solid #e0d6ea}.receipt-top{background:#30203f;color:#fff;padding:28px 30px}.receipt-tag{letter-spacing:2px;color:#e3c0fe;font-size:10px}.receipt-brand{font-size:20px;font-weight:900;margin-top:10px}.receipt-brand small{display:block;font-size:9px;letter-spacing:1.5px;color:#f6c985}.receipt-top h3{font-size:29px;color:white;margin:12px 0}.receipt-top p{font-size:11px;color:#e2d4ed}.receipt-main{padding:26px 30px}.receipt-amount{font-size:39px;color:#2d1e3e;font-weight:900;margin-bottom:18px}.receipt-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.receipt-grid span{display:block;font-size:10px;color:#84728e;text-transform:uppercase}.receipt-grid strong{display:block;font-size:13px;overflow-wrap:anywhere}.receipt-totals{border-top:1px solid #e4d9e9;margin-top:22px;padding-top:13px}.receipt-totals div{display:flex;justify-content:space-between;margin-bottom:10px}.receipt-note{padding:15px 30px;font-size:11px;line-height:1.65;color:#665674;border-top:1px solid #eadfee}@media print{body{padding:0;background:white}.receipt-sheet{border:0;border-radius:0}@page{margin:.35in}}';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Packet Lily receipt '+safe(p.id)+'</title><style>'+css+'</style></head><body><article class="receipt-sheet">'+receiptMarkup(p)+'</article></body></html>';
 downloadBlob(new Blob([html],{type:'text/html;charset=utf-8'}),'Packet-Lily-Receipt-'+p.id.replace(/[^a-z0-9-]/gi,'')+'.html');
 toast('Receipt downloaded. Open and Print / Save as PDF for a PDF copy.');
}
async function shareReceipt(){
 const p=currentReceipt();if(!p){toast('Select a recorded payment first.');return}
 const content=receiptText(p);
 if(navigator.share){try{await navigator.share({title:'Payment receipt '+(state.ref||''),text:content});return}catch(e){if(e?.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(content);toast('Receipt text copied for sharing.')}catch(e){toast('Could not share here. Download the receipt instead.')}
}

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
  const label=p.closedAt?'✓ Closed • paid in full':balance>0.005?'Outstanding '+fmt(balance):balance<-.005?'Credit '+fmt(-balance):'Paid in full • not closed';
  return '<div class="saved-item"><div><h3>'+dash(p.ref||'No invoice #')+' · '+dash(p.job||'Invoice')+'</h3><p>'+dash(p.customer||'No customer')+' · '+dash(p.customerEmail||'No email')+' · '+niceDate(p.date)+'</p><p>Total '+fmt(num(p.total))+' · Paid '+fmt(num(p.paid))+'</p><span class="archive-pill">'+safe(label)+'</span></div><div class="actions"><button class="btn small" data-open="'+i+'">Open</button><button class="btn primary small" data-pay-open="'+i+'">Payments &amp; receipts</button><button class="btn small danger" data-delete="'+i+'">Delete</button></div></div>';
 }).join('')+'</div>';
}
async function shrink(file){return new Promise((resolve,reject)=>{const img=new Image();let blobUrl=URL.createObjectURL(file);img.onload=()=>{try{const m=1150,scale=Math.min(1,m/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.76);URL.revokeObjectURL(blobUrl);resolve(data)}catch(e){URL.revokeObjectURL(blobUrl);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(blobUrl);reject(new Error('Image could not be read'))};img.src=blobUrl})}
async function photosFrom(kind,files){if(state.closedAt){toast('Reopen this invoice before changing its photos.');return}let remaining=Math.max(0,4-state.photos[kind].length);if(!remaining){toast('Maximum four '+kind+' photos.');return}let added=0;for(const f of Array.from(files).slice(0,remaining)){if(!f.type.startsWith('image/'))continue;try{const data=await shrink(f);state.photos[kind].push({data,name:f.name});added++}catch(e){toast('Could not read '+f.name)}}renderThumbs();renderReport();autosave();if(added)toast(`${added} ${kind} photo${added!==1?'s':''} added`)}
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
 const body={app:'Packet Lily',version:1,exportedAt:new Date().toISOString(),invoices:saved};
 downloadBlob(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}),'packet-lily-invoices-'+today()+'.json');
 toast('Backup downloaded. Save it in your Files app.');
}
async function importArchive(file){
 if(!file)return;
 if(file.size>25000000){toast('Backup file is too large.');return}
 try{
  const data=JSON.parse(await file.text());
  if(!['Closeout Pocket','Packet Lily'].includes(data?.app)||!Array.isArray(data.invoices)||data.invoices.length>1000)throw Error('Invalid backup format');
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
 const subject='Invoice '+(state.ref||state.job||'Service')+' — '+(state.company||'Packet Lily');
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
Customer copy · Prepared with Packet Lily. For PDF, use your browser’s Print / Save as PDF command.
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
     renderPaymentCenter();
    $('#generationBanner').scrollIntoView({behavior:'auto',block:'start'});
  }catch(e){
    console.error('Packet generation failed',e);
    toast('Could not generate the report. Please try again.');
    alert('Could not generate the Job Packet. Return to the form and try again.');
  }
}
async function copySummary(){const total=num(state.total),paid=num(state.paid),balance=total-paid;const content=[`${state.company||'Service completion'} — Job Packet`,`Customer: ${state.customer||'—'}`,`Service address: ${fullAddress()||'—'}`,`Job: ${state.job||'—'}`,`Completed: ${niceDate(state.date)}`,`Work completed:\n${state.work||'—'}`,`Job total: ${fmt(total)}`,`Paid: ${fmt(paid)}`,`${balance<0?'Customer credit':'Balance due'}: ${fmt(Math.abs(balance))}`,state.notes?`Notes: ${state.notes}`:''].filter(Boolean).join('\n\n');try{await navigator.clipboard.writeText(content);toast('Summary copied to clipboard')}catch(e){const t=document.createElement('textarea');t.value=content;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('Summary copied to clipboard')}catch(e){toast('Copy unavailable in this browser')}t.remove()}}
function startOver(next){state=normalize(next);$('#payEntryAmount').value='';$('#payEntryDate').value=today();$('#payEntryMethod').value='Cash App';$('#payEntryReference').value='';$('#payEntryNote').value='';$('#payOwnerConfirmed').checked=false;$('#generationBanner').hidden=true;receiptPaymentId=(state.payments||[]).filter(p=>p.source==='owner'&&!p.voidedAt).slice(-1)[0]?.id||'';const extras=$('#invoiceExtras');if(extras)extras.open=false;loadForm();autosave();switchTo('build')}
function beginNewInvoice(){if((state.customer||num(state.total)>0||state.job||state.work||state.photos.before.length||state.photos.after.length)&&!confirm('Start a new invoice? Changes that are not archived will be replaced.'))return;startOver(newInvoice())}
function focusOptionalField(selector){const details=$('#invoiceExtras');if(details)details.open=true;const input=$(selector);if(input)input.focus();}
function updateFieldFromInput(e){
 const el=e.target;if(!el.dataset.field)return;
 const field=el.dataset.field;
 const oldBalance=Math.round((num(state.total)-num(state.paid))*100);
 const oldLink=String(state.paymentLink||'');
 if(state.closedAt){el.value=(field==='total'||field==='paid')?showMoney(state[field],true):state[field]??'';toast('Reopen this invoice before editing its details.');return}
  state[field]=(field==='total'||field==='paid')?applyMoneyTyping(el):el.value;
 if((field==='total'||field==='paid')&&oldBalance!==Math.round((num(state.total)-num(state.paid))*100)&&state.paymentRequestConfirmed)state.paymentLinkNeedsRefresh=true;
 if(field==='paymentLink'&&oldLink!==state.paymentLink){state.paymentRequestConfirmed=false;state.paymentRequestAmount='';state.paymentRequestConfirmedLink='';state.paymentLinkNeedsRefresh=false}
 renderBalance();renderReport();renderPaymentStatus();if(tab==='preview')renderPaymentCenter();autosave();
}
document.addEventListener('input',updateFieldFromInput);
document.addEventListener('change',updateFieldFromInput);
document.addEventListener('blur',e=>{
 const el=e.target;
 if(el.dataset.field==='total'||el.dataset.field==='paid'){
   el.value=showMoney(state[el.dataset.field],true);
 }
},true);

document.addEventListener('click',e=>{const fresh=e.target.closest('[data-new-invoice]');if(fresh){beginNewInvoice();return}const sw=e.target.closest('[data-switch]');if(sw){switchTo(sw.dataset.switch);return}const rm=e.target.closest('[data-remove-photo]');if(rm){if(state.closedAt){toast('Reopen this invoice before removing photos.');return}const [k,i]=rm.dataset.removePhoto.split(':');state.photos[k].splice(Number(i),1);renderThumbs();renderReport();autosave();return}const payOpen=e.target.closest('[data-pay-open]');if(payOpen){const item=saved[Number(payOpen.dataset.payOpen)];if(item){startOver(normalize({...clone(item),archiveId:item.id}));switchTo('preview');$('#paymentCenter').scrollIntoView({behavior:'smooth',block:'start'});}return}const op=e.target.closest('[data-open]');if(op){const item=saved[Number(op.dataset.open)];if(item){startOver(normalize({...clone(item),archiveId:item.id}));toast('Archived invoice opened')}return}const voidBtn=e.target.closest('[data-void-payment]');if(voidBtn){voidPayment(voidBtn.dataset.voidPayment);return}const receiptBtn=e.target.closest('[data-view-receipt]');if(receiptBtn){receiptPaymentId=receiptBtn.dataset.viewReceipt;renderPaymentCenter();$('#receiptPanel').scrollIntoView({behavior:'smooth',block:'start'});return}const del=e.target.closest('[data-delete]');if(del){const i=Number(del.dataset.delete);if(!confirm('Delete this saved packet from this browser?'))return;const next=saved.filter((_,j)=>j!==i);if(persist(K_SAVED,next)){saved=next;renderSaved();toast('Invoice deleted from archive')}return}});
$('#payEntryAmount').addEventListener('input',e=>applyMoneyTyping(e.target));
$('#recordPaymentForm').addEventListener('submit',e=>{e.preventDefault();recordPayment()});
$('#closeInvoiceBtn').addEventListener('click',closeInvoice);
$('#reopenInvoiceBtn').addEventListener('click',reopenInvoice);
$('#downloadReceiptBtn').addEventListener('click',downloadReceipt);
$('#printReceiptBtn').addEventListener('click',()=>{if(!currentReceipt())return;document.body.classList.add('print-receipt');window.print();setTimeout(()=>document.body.classList.remove('print-receipt'),2000)});
if(typeof window.addEventListener==='function')window.addEventListener('afterprint',()=>document.body.classList.remove('print-receipt'));
$('#shareReceiptBtn').addEventListener('click',shareReceipt);
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
$('#clearBusinessBtn').addEventListener('click',clearBusinessSettings);
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
