const fs=require('node:fs'),assert=require('node:assert/strict');
const index=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('app.js','utf8');
const filingScript=fs.readFileSync('filing.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
// Release policy: missing or unexpected script/package references must fail CI.
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.deepEqual(pkg.dependencies||{}, {}, 'Packet Lily browser runtime must remain dependency-free unless explicitly reviewed');
assert.deepEqual(Object.keys(pkg.devDependencies||{}), ['@playwright/test'], 'New npm packages require a deliberate review of the allowlist');
assert.match(pkg.devDependencies['@playwright/test'], /^\d+\.\d+\.\d+$/, 'Pin Playwright to a reviewed exact version');
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
assert.equal(lock.lockfileVersion,3,'Lockfile format is required to be version 3');
assert.deepEqual(lock.packages[''].devDependencies,pkg.devDependencies,'Locked root dependencies must exactly match package.json');
for(const [name,entry] of Object.entries(lock.packages)){
 if(!name)continue;
 assert(/^sha512-/.test(entry.integrity||''),'Missing package integrity hash: '+name);
 assert(/^https:\/\/registry\.npmjs\.org\//.test(entry.resolved||''),'Unexpected package source: '+name);
 assert(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(entry.version||''),'Non-exact locked version: '+name);
}
let scriptRefs=0;
for(const match of index.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)){
 const src=match[1],uri=new URL(src,'https://packet.invalid/Closeout-Pocket/');
 assert.equal(uri.origin,'https://packet.invalid','No unreviewed CDN/third-party script: '+src);
 assert(uri.pathname.startsWith('/Closeout-Pocket/'),'Script must remain inside this application: '+src);
 const local=decodeURIComponent(uri.pathname.slice('/Closeout-Pocket/'.length));
 assert(fs.statSync(local,{throwIfNoEntry:false})?.isFile(),'Referenced script is missing: '+src);
 scriptRefs++;
}
assert(scriptRefs>=2,'Dependency check did not inspect the app scripts');
// The test server must serve every public asset installed by the offline worker.
const offlineWorker=fs.readFileSync('sw.js','utf8');
const browserServer=fs.readFileSync('tests/serve.cjs','utf8');
for(const match of offlineWorker.matchAll(/ROOT\+'([^']+)'/g)){
 assert(browserServer.includes("'"+match[1]+"'"),'Browser-test server omits an offline shell asset: '+match[1]);
}
assert(index.includes("script-src 'self'"),'CSP must keep executable scripts first-party only');
assert(index.includes('Content-Security-Policy'));
assert(index.includes('Packet Lily'));
assert(index.includes('href="brand.css"'));
assert(fs.readFileSync('brand.css','utf8').includes('.payment-center'));
assert(manifest.name==='Packet Lily');
assert(script.includes("['Closeout Pocket','Packet Lily']"),'old archives remain importable');
assert(script.includes('closeout-pocket-draft-v1'),'old browser drafts remain available');
for(const id of ['screen-home','ownerViewBtn','customerViewBtn','customerPreviewNotice','returnToDeskBtn','recordPaymentForm','closeInvoiceBtn','reopenInvoiceBtn','receiptDocument','paymentLog','sharePaymentBtn','confirmPaymentAmount'])assert(index.includes('id="'+id+'"'),id+' is missing');
assert(index.includes('src="filing.js" defer'));assert(index.includes('src="app.js" defer'));assert(index.indexOf('src="filing.js"')<index.indexOf('src="app.js"'),'filing engine must load before app');
assert(manifest.start_url==='/Closeout-Pocket/');
assert(fs.readFileSync('apple-touch-icon.png').subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));
assert(!/document\.cookie\s*=|https?:\/\/(google-analytics|www\.googletagmanager)/.test(script));
new Function(script);new Function(filingScript);
const seam='loadForm();nav();renderStorageChoice();';
assert(script.includes(seam));
const source=script.replace(seam,'return {getState:()=>state,getSaved:()=>saved,getSaving:()=>deviceSaving,chooseDeviceSaving,generatePacket,paymentRequestState,renderReport,renderPaymentCenter,recordPayment,closeInvoice,reopenInvoice,voidPayment,currentReceipt,normalize,reportMarkup,reportFile,setAudienceMode,setDeskSection,makeReceiptPdf,receiptPdfFilename,receiptText,invoiceStage,receiptsUnlocked,renderSaved,printCustomerInvoice,printReceipt,customerInvoicePdf,customerInvoicePdfName,offerPrintPdf};');
const events={},els=new Map();
function element(key){if(!els.has(key))els.set(key,{value:'',hidden:false,checked:false,disabled:false,style:{},innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},scrollIntoView(){},focus(){},checkValidity(){return true},setSelectionRange(){},setAttribute(name,value){this[name]=value}});return els.get(key)}
const screens=['home','build','preview','saved','business'].map(name=>({id:'screen-'+name,active:name==='home',classList:{toggle(flag,on){if(flag==='active')this.owner.active=on},owner:null}}));
for(const screen of screens)screen.classList.owner=screen;
const canvasContext={
 scale(){},fillRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}}},
 measureText(v){return {width:String(v).length*6}}
};
const fakeCanvas={width:0,height:0,getContext:()=>canvasContext,toDataURL:()=> 'data:image/jpeg;base64,/9j/2Q=='};
const doc={querySelector:element,querySelectorAll:selector=>selector==='.screen'?screens:[],addEventListener:(event,handler)=>events[event]=handler,createElement:tag=>tag==='canvas'?fakeCanvas:{click(){},remove(){}},body:{appendChild(){},classList:{add(){},remove(){}}}};
const data=new Map(),localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
let desktopPrintCount=0;const win={scrollTo(){},location:{href:''},isSecureContext:false,addEventListener(){},print(){desktopPrintCount++}};
const navigator={userAgent:'Desktop Test',share:async()=>{},clipboard:{writeText:async()=>{}}};
new Function('window','document','Blob','TextEncoder','atob',filingScript)(win,doc,Blob,TextEncoder,atob);
assert(win.PacketLilyArchive,'filing module must expose local archive builder');
const app=new Function('document','window','localStorage','navigator','URL','Blob','confirm','alert','console','setTimeout','clearTimeout','return '+source)(doc,win,localStorage,navigator,URL,Blob,()=>true,()=>{},console,()=>0,()=>{});
// Test delegated tab navigation, not just isolated render methods.
function tapTab(tab){events.click({target:{closest(selector){return selector==='[data-switch]'?{dataset:{switch:tab}}:null}}})}
tapTab('business');
assert.equal(element('#crumb').textContent,'My Business','My Business must open when selected');
assert(index.includes('<section id="screen-home" class="screen active"'),'Home must be the initial landing screen');
assert(index.indexOf('<section class="hero">')>index.indexOf('id="screen-home"'),'marketing banner belongs to Home');
assert(index.indexOf('<section class="hero">')<index.indexOf('id="screen-build"'),'marketing banner cannot be part of New invoice');
assert(index.includes('class="home-return" data-switch="home"'),'Home shortcut exists');
assert(screens.find(v=>v.id==='screen-home').active===false,'Home hides when another workspace opens');
assert(screens.find(v=>v.id==='screen-business').active,'business screen must become active');
assert(!screens.find(v=>v.id==='screen-build').active,'previous screen must be hidden');
tapTab('preview');
assert(screens.find(v=>v.id==='screen-build').active,'unprepared invoice must be redirected to creation');
app.setDeskSection('payments');
assert(screens.find(v=>v.id==='screen-build').active,'direct Payments bypass blocked for drafts');
assert.equal(app.invoiceStage(),'draft');
assert(!app.receiptsUnlocked());
assert(!screens.find(v=>v.id==='screen-preview').active,'unprepared invoice desk stays locked');
tapTab('saved');
assert(screens.find(v=>v.id==='screen-saved').active,'invoice archive must remain navigable');
tapTab('build');
assert(screens.find(v=>v.id==='screen-build').active,'quick invoice must remain navigable');
tapTab('home');
assert(screens.find(v=>v.id==='screen-home').active,'Home must be reachable from every workspace');
assert(!screens.find(v=>v.id==='screen-build').active,'Invoice form hides on Home');
assert.equal(element('#crumb').textContent,'Home');
tapTab('build');
assert(screens.find(v=>v.id==='screen-build').active,'Home must return to existing in-progress invoice form');

assert.equal(app.getSaving(),false,'new visitor saving must be opt-in');
const state=app.getState();
Object.assign(state,{company:'Test Contractor',customer:'Test Customer',job:'Fixture installed',ref:'TEST-001',total:'250',paid:'0',date:'2026-10-13',paymentLink:'https://cash.app/$Example'});
assert.equal(app.paymentRequestState(),'manual');
assert(index.includes('id="confirmRequestRow"'),'exact amount checkbox wrapper required');
const initialProfileStatus=app.paymentRequestState();
const caseScript=script.includes("row.hidden=!['exact','unconfirmed'].includes(status)");
assert(caseScript,'Cash App profile must hide the inapplicable exact-amount checkbox');
app.generatePacket();assert.equal(app.getSaved().length,0,'opt-in required to save');
app.chooseDeviceSaving(true);app.generatePacket();
assert.equal(app.getSaved().length,1);
assert.equal(app.invoiceStage(),'unpaid');
assert(index.includes('Share PDF job packet'),'share button must no longer promise an HTML file');
assert(index.includes('Save PDF job packet'),'save button must no longer promise HTML');
app.reportFile().then(async packet=>{
 assert.equal(packet.blob.type,'application/pdf','shared report must be a PDF blob');
 assert(packet.name.endsWith('.pdf'),'shared report filename must end .pdf');
 assert(!packet.name.endsWith('.html'));
 const data=Buffer.from(await packet.blob.arrayBuffer()).toString('latin1');
 assert(data.startsWith('%PDF-1.4'),'report must be a genuine PDF');
 assert(data.includes('/Count 2'),'job description should extend invoice to a detail page');
 console.log('Multipage customer job-packet PDF smoke test passed.');
}).catch(e=>{console.error(e);process.exitCode=1});

assert.equal(win.PacketLilyArchive.availableMonths([{...state,preparedAt:'',workflowVersion:2}]).length,0,'PDF filing must not include draft-only invoices');
assert(win.PacketLilyArchive.availableMonths([{...state}]).length>0,'prepared invoices are eligible for filing');
assert(!app.receiptsUnlocked(),'creating an invoice must not unlock receipts');
assert(element('#receiptsViewBtn').disabled,'receipts tab must be disabled for unpaid invoices');
assert(screens.find(v=>v.id==='screen-preview').active,'generated invoice can access desk');
app.setDeskSection('payments');
assert(!element('#deskPayments').hidden,'payment tab unlocked for generated invoice');
app.setDeskSection('receipts');
assert(element('#deskReceipts').hidden,'attempting receipts must not bypass lock');
app.setDeskSection('overview');

state.paymentLink='https://cash.app/pay/unique-request';
state.paymentRequestConfirmed=true;state.paymentRequestAmount='250';state.paymentRequestConfirmedLink=state.paymentLink;state.paymentLinkNeedsRefresh=false;
assert.equal(app.paymentRequestState(),'exact');
app.renderReport();
assert(!element('#report').innerHTML.includes('r-payment-link'),'contractor desk never has customer payment button');
app.setAudienceMode('customer');
assert(element('#paymentCenter').hidden,'owner payment controls hidden in customer preview');
assert(element('#deskOverview').hidden,'overview hidden in customer preview');
assert(element('#deskReceipts').hidden,'receipt controls hidden in customer preview');
assert(!element('#customerPreviewNotice').hidden,'customer preview distinctly labeled');
const customerPreview=element('#report').innerHTML;
assert(customerPreview.includes('pay-preview'),'customer sees a non-clickable CTA demonstration');
assert(!customerPreview.includes('href="https://cash.app/'),'customer preview must not let contractor accidentally open Cash App');
const exportedCustomer=app.reportMarkup('customer-export');
assert(exportedCustomer.includes('href="https://cash.app/$Example')===false,'invoice-specific link should be used');
assert(exportedCustomer.includes('href="https://cash.app/pay/unique-request'),'shared customer copy retains valid payment link');
assert(!exportedCustomer.includes('payment-center')&&!exportedCustomer.includes('payment-log'),'no contractor controls in customer copy');
assert(!exportedCustomer.includes('data-void-payment'),'no payment records in customer copy');
app.setAudienceMode('owner');
assert(!element('#paymentCenter').hidden,'returning to desk restores owner tools');
assert(!element('#report').innerHTML.includes('r-payment-link'),'owner view still has no payment CTA');
const currentDate=new Date();const date=[currentDate.getFullYear(),String(currentDate.getMonth()+1).padStart(2,'0'),String(currentDate.getDate()).padStart(2,'0')].join('-');
function enterPayment(amount,ref){
 element('#payEntryAmount').value=amount;
 element('#payEntryDate').value=date;
 element('#payEntryMethod').value='Cash App';
 element('#payEntryReference').value=ref;
 element('#payOwnerConfirmed').checked=true;
 app.recordPayment();
}
enterPayment('100','TEST-PAID-1');
assert.equal(state.paid,'100.00','partial payment updates received sum');
assert.equal(app.invoiceStage(),'partial');
assert.equal(app.getSaved()[0].paid,'100.00','partial payment must be archived');
assert.equal(state.payments.length,1);
assert.equal(state.payments[0].verifiedByOwner,true);
enterPayment('100','TEST-PAID-1');
assert.equal(state.payments.length,1,'repeating an existing Cash App transaction reference cannot add a duplicate ledger entry');
assert.equal(state.paid,'100.00','duplicate payment entry must not inflate recorded revenue');
assert.equal(app.paymentRequestState(),'stale','exact payment link must become stale after balance change');
assert(!element('#report').innerHTML.includes('r-payment-link'),'hide stale amount-specific request');
assert(element('#receiptPanel').hidden,'receipt must stay hidden for partial payment');
assert(element('#deskReceipts').hidden,'partial payment cannot open final receipt tab');
assert.equal(element('#receiptEmpty').hidden,false,'locked receipt text remains visible as guidance');
assert.equal(app.currentReceipt(),null,'no final receipt before closeout');
assert(!app.receiptsUnlocked());
state.payments[0].note='PRIVATE NOT FOR CUSTOMER';
app.renderPaymentCenter();
assert(!element('#receiptDocument').innerHTML.includes('PRIVATE NOT FOR CUSTOMER'),'internal note must not appear in customer receipt');
assert(!app.receiptText(state.payments[0]).includes('PRIVATE NOT FOR CUSTOMER'),'shared text must omit private note');

assert(index.includes('Save / Print invoice PDF'),'invoice print button must explain PDF workflow');
assert(index.includes('id="printReceiptBtn">Print PDF'),'receipt print button must explain PDF workflow');
assert(app.customerInvoicePdfName().endsWith('.pdf'));
assert.equal(app.customerInvoicePdf().type,'application/pdf','iPhone print must produce actual invoice PDF');
navigator.userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)';
let mobileShareCount=0;
navigator.canShare=({files})=>Array.isArray(files)&&files.length===1&&files[0].type==='application/pdf';
navigator.share=async function({files}){
 assert.equal(files.length,1);
 assert.equal(files[0].type,'application/pdf');
 assert(files[0].name.endsWith('.pdf'));
 mobileShareCount++;
};
app.printCustomerInvoice().then(result=>{
 assert.equal(result,'shared','iPhone customer invoice print uses PDF share sheet');
 assert.equal(mobileShareCount>=1,true);
 assert.equal(desktopPrintCount,0,'iPhone must not call unsupported window.print');
 console.log('iPhone invoice PDF print fallback passed.');
}).catch(e=>{console.error(e);process.exitCode=1});

assert.equal(element('#invoicePaymentStatus').textContent,'Partially paid');
enterPayment('150','TEST-PAID-2');
assert.equal(state.paid,'250.00');
assert.equal(state.payments.length,2);
assert.equal(app.currentReceipt(),null,'payment fully recorded but receipt still locked until closeout');
assert.equal(app.invoiceStage(),'ready-close');
assert(element('#receiptsViewBtn').disabled,'paid in full is insufficient to unlock final receipt before closeout');
assert.equal(app.currentReceipt(),null,'no receipt until explicit closeout');
assert.equal(element('#invoicePaymentStatus').textContent,'Paid · Ready to close');
app.closeInvoice();
assert(state.closedAt,'explicit paid closeout recorded');
assert.equal(element('#invoicePaymentStatus').textContent,'Closed · Paid in full');
assert(app.getSaved()[0].closedAt,'closeout persisted');
assert(app.receiptsUnlocked(),'owner-confirmed closeout unlocks receipt');
assert.equal(app.invoiceStage(),'closed');
assert.equal(app.currentReceipt().reference,'TEST-PAID-2','closed invoice offers latest receipt');
assert(!element('#deskReceipts').hidden,'closeout automatically opens final receipts');
assert(!element('#receiptPanel').hidden,'closed invoice receipt is visible');
assert(element('#receiptDocument').innerHTML.includes('$150.00'),'final payment receipt shows recorded amount');
const completedArchive=JSON.parse(JSON.stringify(app.getSaved()[0]));

app.printReceipt().then(result=>{
 assert.equal(result,'shared','iPhone receipt print uses PDF share sheet');
 assert.equal(mobileShareCount>=2,true);
 assert.equal(desktopPrintCount,0,'iPhone receipt print must not call window.print');
 console.log('iPhone receipt PDF print fallback passed.');
}).catch(e=>{console.error(e);process.exitCode=1});

const pdf=app.makeReceiptPdf(state.payments[0]);
assert.equal(pdf.type,'application/pdf','receipt download must be a genuine PDF Blob');
assert(app.receiptPdfFilename(state.payments[0]).endsWith('.pdf'),'receipt filename must end in PDF');
assert(!app.receiptPdfFilename(state.payments[0]).endsWith('.html'));
pdf.arrayBuffer().then(bytes=>{
 const docBytes=Buffer.from(bytes), body=docBytes.toString('latin1');
 assert(body.startsWith('%PDF-1.4\n'),'receipt must have a PDF signature');
 assert(body.includes('/Subtype /Image'),'PDF embeds branded receipt image');
 const ref=body.match(/startxref\n(\d+)\n/);
 assert(ref,'PDF cross-reference table missing');
 assert.equal(body.slice(Number(ref[1]),Number(ref[1])+4),'xref','PDF byte offsets must be valid');
 console.log('Genuine PDF receipt validation passed.');
}).catch(e=>{console.error(e);process.exitCode=1});


app.reopenInvoice();assert(!state.closedAt,'reopening clears closed status');
assert.equal(app.currentReceipt(),null,'reopening locks prior final receipt');
assert(element('#deskReceipts').hidden,'reopened invoice must leave receipts screen');
assert(!app.receiptsUnlocked());
assert.equal(app.invoiceStage(),'ready-close');
const lastId=state.payments[1].id;
app.voidPayment(lastId);
assert(state.payments[1].voidedAt,'void must retain history');
assert.equal(state.paid,'100.00','void adjusts balance');
assert.equal(app.invoiceStage(),'partial');
assert.equal(element('#invoicePaymentStatus').textContent,'Partially paid');
assert.equal(app.getSaved()[0].payments.length,2,'voided entry stays archived');
const old=app.normalize({customer:'Older customer',total:'100',paid:'30',ref:'OLD-001',date:'2026-10-13'});
assert.equal(old.paid,'30.00');
assert.equal(old.payments[0].source,'legacy','old paid amount becomes labeled legacy entry');
assert.equal(old.payments[0].verifiedByOwner,false,'old payments cannot be deemed verified');
assert.equal(app.normalize(old).payments.length,1,'migration must be idempotent');
console.log('Packet Lily payment ledger and closeout smoke tests passed.');
// Seeded property-based invariants: money never comes from a forged paid field,
// voided payments do not count, and reloading cannot change the balance.
let propertySeed=0x5eed2026;
const nextProperty=()=>{propertySeed=(Math.imul(propertySeed,1664525)+1013904223)>>>0;return propertySeed};
for(let trial=0;trial<250;trial++){
 const totalCents=1+(nextProperty()%500000),first=1+(nextProperty()%totalCents);
 const second=nextProperty()%(totalCents-first+1),voidSecond=(nextProperty()&1)===1;
 const expectedCents=first+(voidSecond?0:second);
 const amount=value=>(value/100).toFixed(2);
 const normalized=app.normalize({
  company:'Property test',customer:'Test',total:amount(totalCents),paid:'999999.99',
  closedAt:'2026-10-13T12:00:00.000Z',preparedAt:'2026-10-13T12:00:00.000Z',
  payments:[
   {id:'one',amount:amount(first),date:'2026-10-13',source:'owner',verifiedByOwner:true},
   {id:'two',amount:amount(second),date:'2026-10-13',source:'owner',verifiedByOwner:true,
    voidedAt:voidSecond?'2026-10-13T12:00:00.000Z':''},
   {id:'zero',amount:'0.00',date:'2026-10-13',source:'owner',verifiedByOwner:true}
  ]
 });
 assert.equal(normalized.paid,amount(expectedCents),'active ledger cents must determine the paid balance on trial '+trial);
 assert.equal(app.normalize(normalized).paid,normalized.paid,'reload must not change the balance on trial '+trial);
 assert.equal(Boolean(normalized.closedAt),expectedCents===totalCents,'closeout may remain only if fully funded on trial '+trial);
 assert(!normalized.payments.some(p=>p.id==='zero'),'zero-valued payments cannot become ledger entries');
}
console.log('250 seeded money-ledger invariants passed.');
assert(index.includes('Customer copy'));
assert(index.includes('id="filingMonth"'),'month picker must exist in invoice archive');
assert(index.includes('id="saveMonthZipBtn"'),'month folder download must exist');
assert(index.includes('id="saveAllZipBtn"'),'all-months archive action must exist');
assert(index.includes('id="saveMonthDeskBtn"'),'on-the-job file export shortcut must exist');
assert(win.PacketLilyArchive.availableMonths(app.getSaved()).length>0,'archive month picker must find saved invoices');
win.PacketLilyArchive.buildPackage([completedArchive],'all',app.makeReceiptPdf).then(async output=>{
 assert.equal(output.blob.type,'application/zip','filing package is a real ZIP');
 assert(output.filename.endsWith('.zip'),'filing archive must use ZIP extension');
 const buf=Buffer.from(await output.blob.arrayBuffer());
 assert.equal(buf.readUInt32LE(0),0x04034b50,'ZIP local header signature missing');
 const end=buf.lastIndexOf(Buffer.from('504b0506','hex'));
 assert(end>0&&buf.readUInt32LE(end)===0x06054b50,'ZIP end record missing');
 const count=buf.readUInt16LE(end+10);
 assert.equal(count,output.files,'ZIP central directory entry count must match');
 const centralStart=buf.readUInt32LE(end+16);
 let pos=0,entryCount=0;
 while(pos<centralStart){
  assert.equal(buf.readUInt32LE(pos),0x04034b50,'corrupt ZIP entry header');
  const storedLen=buf.readUInt32LE(pos+18),nameLen=buf.readUInt16LE(pos+26),extraLen=buf.readUInt16LE(pos+28);
  const first=pos+30+nameLen+extraLen,last=first+storedLen;
  assert(last<=centralStart,'ZIP entry escaped the local-file region');
  let crc=0xffffffff;
  for(const b of buf.subarray(first,last)){crc^=b;for(let k=0;k<8;k++)crc=(crc&1)?(crc>>>1)^0xedb88320:(crc>>>1)}
  assert.equal((crc^0xffffffff)>>>0,buf.readUInt32LE(pos+14),'ZIP entry CRC mismatch');
  pos=last;entryCount++;
 }
 assert.equal(entryCount,count,'ZIP archive entries must align with central directory');
 const contents=buf.toString('latin1');
 assert(contents.includes('Packet-Lily-Records/2026/10-October/Invoices/Invoice-'),'invoice PDFs are filed by year/month');
 assert(contents.includes('/Receipts/Receipt-'),'payment receipts are filed separately');
 assert(contents.includes('/Tracking/invoices.csv'),'monthly invoices CSV is included');
 assert(contents.includes('/Tracking/payments.csv'),'monthly payments CSV is included');
 assert(contents.includes('/Backup/invoices.json'),'backup is included');
 assert(contents.includes('Owner-entered'),'payment ledger differentiates user-recorded income');
 assert(contents.includes('PDF'),'ZIP has file manifest');
 console.log('Monthly ZIP folder organization and Excel CSV smoke tests passed.');
}).catch(e=>{console.error(e);process.exitCode=1});

assert(index.includes('id="deskPayments"'));
assert(index.includes('id="deskReceipts"'));
console.log('Contractor/customer view separation, dedicated Home and compact invoice sections passed.');
