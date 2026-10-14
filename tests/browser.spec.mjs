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
 expect(download.suggestedFilename()).toMatch(/\\.pdf$/i);
 const pdf=await readFile(await download.path());
 const content=pdf.toString('latin1');
 expect(content.startsWith('%PDF-1.4')).toBe(true);
 expect(content).toMatch(/\\/Type \\/Pages \\/Count [2-9]/);
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
