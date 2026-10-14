import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('app initializes its JavaScript navigation on both mobile engines',async({page},testInfo)=>{
 const errors=[],failedRequests=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('requestfailed',req=>failedRequests.push(req.url()+' '+(req.failure()?.errorText||'')));
 await page.goto('./');
 await page.waitForTimeout(1200);
 const snapshot=await page.evaluate(()=>({url:location.href,navButtons:document.querySelectorAll('#bottomNav [data-switch]').length,scriptTags:[...document.scripts].map(s=>({src:s.src,ready:s.readyState})),appJsResources:performance.getEntriesByType('resource').filter(r=>/app\.js|filing\.js/.test(r.name)).map(r=>({name:r.name,transferSize:r.transferSize})),screen:document.querySelector('#screen-home')?.className}));
 console.log('Packet Lily initialization',testInfo.project.name,JSON.stringify({snapshot,errors,failedRequests}));
 expect(snapshot.navButtons,'App did not populate the mobile navigation. See script/network/page errors above.').toBeGreaterThan(0);
});

test('Cash App profile explains manual amount and exact request checkbox only appears for actual request links',async({page})=>{
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#invoiceExtras > summary').click();
 await page.locator('#total').fill('50.00');
 await page.locator('#paymentLink').fill('https://cash.app/$Example');
 await expect(page.locator('#paymentLinkStatus')).toContainText('customer must enter');
 await expect(page.locator('#confirmRequestRow')).toBeHidden();
 await page.locator('#paymentLink').fill('https://cash.app/pay/ExampleRequest');
 await expect(page.locator('#confirmRequestRow')).toBeVisible();
 await expect(page.locator('#confirmPaymentAmount')).toBeEnabled();
 await page.locator('#confirmPaymentAmount').check();
 await expect(page.locator('#confirmPaymentAmount')).toBeChecked();
});
test('Save Report generates a real multipage PDF without HTML',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='chromium-mobile','PDF file inspection runs in Chromium');
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#demoBtn').click();
 await page.locator('#previewBtn').click();
 await expect(page.locator('#screen-preview')).toHaveClass(/active/);
 const [download]=await Promise.all([
  page.waitForEvent('download'),
  page.locator('#savePacketFileBtn').click()
 ]);
 expect(download.suggestedFilename().toLowerCase().endsWith('.pdf')).toBe(true);
 const pdf=await readFile(await download.path());
 const content=pdf.toString('latin1');
 expect(content.startsWith('%PDF-1.4')).toBe(true);
 expect(content.includes('/Type /Pages /Count 2')).toBe(true);
 expect(content).not.toContain('<!doctype html>');
});

test('Sample business is labeled before a test invoice can accidentally be sent',async({page})=>{
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#demoBtn').click();
 await expect(page.locator('#sampleInvoiceNotice')).toBeVisible();
 await expect(page.locator('#sampleInvoiceNotice')).toContainText('Sample data is loaded');
});


test('guided invoice, payment deduplication, closeout and PDF receipt',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('./');
 await expect(page.locator('#screen-home')).toHaveClass(/active/);
 // The bottom navigation must not bypass required invoice details.
 await page.locator('#bottomNav [data-switch="preview"]').click();
 await expect(page.locator('#screen-build')).toHaveClass(/active/);
 await page.locator('#bottomNav [data-switch="business"]').click();
 await page.locator('#businessName').fill('Example QA Contractor');
 await page.locator('#saveBusinessBtn').click();
 await page.locator('#applyBusinessBtn').click();
 await page.locator('#bottomNav [data-switch="build"]').click();
 const notice=page.locator('#deviceSaveNotice');
 if(await notice.isVisible())await page.locator('#enableDeviceSaveBtn').click();
 await page.locator('#customer').fill('Test Customer (not real)');
 await page.locator('#total').fill('75.00');
 await page.locator('#previewBtn').click();
 await expect(page.locator('#screen-preview')).toHaveClass(/active/);
 await expect(page.locator('#receiptsViewBtn')).toBeDisabled();
 await expect(page.locator('#customerViewBtn')).toBeEnabled();
 await page.locator('#paymentsViewBtn').click();
 await page.locator('#payEntryAmount').fill('25.00');
 await page.locator('#payEntryMethod').selectOption('Cash App');
 await page.locator('#payEntryReference').fill('TEST-NO-FUNDS-001');
 await page.locator('#payOwnerConfirmed').check();
 await page.locator('#recordPaymentBtn').click();
 await expect(page.locator('#deskPaidTotal')).toHaveText('$25.00');
 await expect(page.locator('#paymentLog .payment-line')).toHaveCount(1);
 await expect(page.locator('#receiptsViewBtn')).toBeDisabled();
 // Same transaction reference must not create a second bookkeeping payment.
 await page.locator('#payEntryAmount').fill('25.00');
 await page.locator('#payEntryReference').fill('TEST-NO-FUNDS-001');
 await page.locator('#payOwnerConfirmed').check();
 await page.locator('#recordPaymentBtn').click();
 await expect(page.locator('#paymentLog .payment-line')).toHaveCount(1);
 await expect(page.locator('#toast')).toContainText('already recorded');
 // A separate actual transaction can still be logged for a different amount/ref.
 await page.locator('#payEntryAmount').fill('50.00');
 await page.locator('#payEntryReference').fill('TEST-NO-FUNDS-002');
 await page.locator('#payOwnerConfirmed').check();
 await page.locator('#recordPaymentBtn').click();
 await expect(page.locator('#deskPaidTotal')).toHaveText('$75.00');
 await expect(page.locator('#receiptsViewBtn')).toBeDisabled();
 await page.locator('#closeInvoiceBtn').click();
 await expect(page.locator('#receiptsViewBtn')).toBeEnabled();
 await expect(page.locator('#receiptPanel')).toBeVisible();
 const [receipt]=await Promise.all([page.waitForEvent('download'),page.locator('#downloadReceiptBtn').click()]);
 expect(receipt.suggestedFilename()).toMatch(/\.pdf$/i);
 await page.locator('#bottomNav [data-switch="saved"]').click();
 await expect(page.locator('#paidCount')).toHaveText('1');
 await expect(page.locator('#unpaidCount')).toHaveText('0');
 // Reload must not erase or silently migrate the existing invoice ledger.
 await page.reload();
 await page.locator('#bottomNav [data-switch="saved"]').click();
 await expect(page.locator('#paidCount')).toHaveText('1');
});

test('navigation retains unfinished invoice entry and shows useful empty archive',async({page})=>{
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#customer').fill('Draft customer test');
 await page.locator('#total').fill('125.00');
 await page.locator('#bottomNav [data-switch="business"]').click();
 await page.locator('#bottomNav [data-switch="build"]').click();
 await expect(page.locator('#customer')).toHaveValue('Draft customer test');
 await expect(page.locator('#total')).toHaveValue('$125.00');
 await page.locator('#bottomNav [data-switch="saved"]').click();
 await expect(page.locator('#savedList')).toContainText('No invoices archived yet');
});

test('static shell and a draft stay usable after going offline',async({page,context},testInfo)=>{
 test.skip(testInfo.project.name!=='chromium-mobile','Offline cache smoke check currently runs in Chromium');
 await page.goto('./');
 const ready=await page.evaluate(async()=>{
  if(!('serviceWorker'in navigator))return false;
  await navigator.serviceWorker.ready;return true;
 });
 expect(ready).toBe(true);
 await page.reload();
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded',timeout:20000});
 await expect(page.locator('#connectivityBadge')).toContainText('Offline');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#customer').fill('Offline local draft');
 await expect(page.locator('#customer')).toHaveValue('Offline local draft');
 if(await page.locator('#deviceSaveNotice').isVisible())await page.locator('#enableDeviceSaveBtn').click();
 await page.reload({waitUntil:'domcontentloaded',timeout:20000});
 await page.locator('#bottomNav [data-switch="build"]').click();
 await expect(page.locator('#customer')).toHaveValue('Offline local draft');
});


test('Cash App request never marks paid; real cash ledger entries reconcile all totals',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#demoBtn').click();
 await expect(page.locator('#liveTotal')).toHaveText('$250.00');
 await expect(page.locator('#livePaid')).toHaveText('$0.00');
 await expect(page.locator('#liveBalance')).toHaveText('$250.00');
 await expect(page.locator('#bottomNav [data-switch="build"]')).toContainText('Invoice');
 await page.locator('#invoiceExtras > summary').click();
 const paidDisplay=page.locator('#paid');
 expect(await paidDisplay.evaluate(el=>el.tagName)).toBe('OUTPUT');
 await expect(paidDisplay).toHaveText('$0.00');
 await page.locator('#paymentLink').fill('https://cash.app/pay/TestRequestNotPayment');
 await page.locator('#confirmPaymentAmount').check();
 await expect(page.locator('#paymentLinkStatus')).toContainText('does not prove the customer has paid');
 await expect(page.locator('#livePaid')).toHaveText('$0.00');
 await page.locator('#previewBtn').click();
 await page.locator('#paymentsViewBtn').click();
 await expect(page.locator('#payEntryAmount')).toBeEmpty();
 await expect(page.locator('#deskBalanceTotal')).toHaveText('$250.00');
 await page.locator('#payEntryAmount').fill('50.00');
 await page.locator('#payEntryMethod').selectOption('Cash');
 await page.locator('#payOwnerConfirmed').check();
 await page.locator('#recordPaymentBtn').click();
 await expect(page.locator('#deskPaidTotal')).toHaveText('$50.00');
 await expect(page.locator('#deskBalanceTotal')).toHaveText('$200.00');
 await expect(page.locator('#liveBalance')).toHaveText('$200.00');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await expect(page.locator('#paid')).toHaveText('$50.00');
 await expect(page.locator('#paymentLinkStatus')).toContainText('balance or payment link changed');
 await page.locator('#openPaymentsFromBuild').click();
 await expect(page.locator('#deskPayments')).toBeVisible();
 await page.locator('[data-void-payment]').click();
 await expect(page.locator('#deskPaidTotal')).toHaveText('$0.00');
 await expect(page.locator('#deskBalanceTotal')).toHaveText('$250.00');
});

test('new invoice starts unpaid and clears sample without altering existing records',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#demoBtn').click();
 await page.locator('#blankBtn').click();
 await expect(page.locator('#customer')).toHaveValue('');
 await expect(page.locator('#total')).toHaveValue('');
 await expect(page.locator('#livePaid')).toHaveText('$0.00');
 await expect(page.locator('#paid')).toHaveText('$0.00');
 await expect(page.locator('#sampleInvoiceNotice')).toBeHidden();
});

test('small fractional payments sum in integer cents, without rounding drift',async({page})=>{
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#demoBtn').click();
 await page.locator('#total').fill('0.30');
 await page.locator('#previewBtn').click();
 await page.locator('#paymentsViewBtn').click();
 for(const amount of ['0.10','0.20']){
  await page.locator('#payEntryAmount').fill(amount);
  await page.locator('#payEntryMethod').selectOption('Cash');
  await page.locator('#payOwnerConfirmed').check();
  await page.locator('#recordPaymentBtn').click();
  if(amount==='0.10')await page.locator('#paymentsViewBtn').click();
 }
 await expect(page.locator('#livePaid')).toHaveText('$0.30');
 await expect(page.locator('#liveBalance')).toHaveText('$0.00');
 await expect(page.locator('#deskBalanceTotal')).toHaveText('$0.00');
});


test('one next-action button advances from invoice draft through verified payment to receipt',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>Array.isArray(files)&&files.length===1});
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
   window.__packetSharedInvoice=(data.files||[]).map(file=>({name:file.name,type:file.type}));
  }});
 });
 await page.goto('./');
 await expect(page.locator('#homeNextActionBtn')).toHaveText('Open invoice →');
 await page.locator('#homeNextActionBtn').click();
 await expect(page.locator('#screen-build')).toHaveClass(/active/);
 await page.locator('#demoBtn').click();
 await expect(page.locator('#previewBtn')).toHaveText('Generate invoice →');
 await page.locator('#previewBtn').click();
 await expect(page.locator('#screen-preview')).toHaveClass(/active/);
 await expect(page.locator('#workflowNextBtn')).toHaveText('Send invoice →');
 await expect(page.locator('#deskPaidTotal')).toHaveText('$0.00');
 await page.locator('#workflowNextBtn').click();
 await expect(page.locator('#workflowNextBtn')).toHaveText('Record payment →');
 const files=await page.evaluate(()=>window.__packetSharedInvoice);
 expect(files).toHaveLength(1);
 expect(files[0].name).toMatch(/invoice.*\.pdf$/i);
 expect(files[0].type).toBe('application/pdf');
 await expect(page.locator('#deskPaidTotal')).toHaveText('$0.00');
 await expect(page.locator('#deskBalanceTotal')).toHaveText('$250.00');
 await page.locator('#workflowNextBtn').click();
 await expect(page.locator('#deskPayments')).toBeVisible();
 await expect(page.locator('#payEntryAmount')).toBeEmpty();
 await page.locator('#payEntryAmount').fill('50.00');
 await page.locator('#payEntryMethod').selectOption('Cash');
 await page.locator('#payOwnerConfirmed').check();
 await page.locator('#recordPaymentBtn').click();
 await expect(page.locator('#deskPaidTotal')).toHaveText('$50.00');
 await expect(page.locator('#workflowNextBtn')).toHaveText('Record payment →');
 await page.locator('#workflowNextBtn').click();
 await page.locator('#payEntryAmount').fill('200.00');
 await page.locator('#payEntryMethod').selectOption('Cash');
 await page.locator('#payOwnerConfirmed').check();
 await page.locator('#recordPaymentBtn').click();
 await expect(page.locator('#workflowNextBtn')).toHaveText('Close job & get receipt →');
 await expect(page.locator('#receiptsViewBtn')).toBeDisabled();
 await page.locator('#workflowNextBtn').click();
 await expect(page.locator('#workflowNextBtn')).toHaveText('View receipt →');
 await expect(page.locator('#receiptsViewBtn')).toBeEnabled();
 await expect(page.locator('#deskPaidTotal')).toHaveText('$250.00');
 await expect(page.locator('#deskBalanceTotal')).toHaveText('$0.00');
 await expect(page.locator('#receiptPanel')).toBeVisible();
});

test('cancelled sharing stays on Send invoice and does not record money',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>Array.isArray(files)&&files.length>0});
  Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError')}});
 });
 await page.goto('./');
 await page.locator('#bottomNav [data-switch="build"]').click();
 await page.locator('#demoBtn').click();
 await page.locator('#previewBtn').click();
 await page.locator('#workflowNextBtn').click();
 await expect(page.locator('#workflowNextBtn')).toHaveText('Send invoice →');
 await expect(page.locator('#deskPaidTotal')).toHaveText('$0.00');
 await expect(page.locator('#deskBalanceTotal')).toHaveText('$250.00');
});
