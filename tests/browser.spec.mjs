import {test,expect} from '@playwright/test';

test('guided invoice, payment deduplication, closeout and PDF receipt',async({page})=>{
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/');
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
});

test('navigation retains unfinished invoice entry and shows useful empty archive',async({page})=>{
 await page.goto('/');
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
 await page.goto('/');
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
});
