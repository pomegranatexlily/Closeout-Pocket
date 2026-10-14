# Closeout Pocket

**A Pomegranate × Lily prototype** — a mobile-first completion report and Job Packet builder for owner-operated trades and service businesses.

The prototype lets an operator record a customer's job, structured service address, before-and-after photos, work performed, job total, amount paid, and outstanding balance. It can produce a customer-facing packet and share/download a self-contained report. Generating a packet automatically saves or updates its record in a searchable browser-local Invoice archive; the archive supports outstanding balances and JSON backup export/import. Email invoice creates a pre-addressed email draft with invoice details and an optional Cash App payment-request link; it does **not** send directly or attach the HTML report. Share payment request shares the amount, invoice number, and Cash App link as text—no file attachment. The payment link must first be created in Cash App and pasted into the invoice. This is not a payment integration and the app does not detect payments automatically. There are no accounts, payment processing, or backend.

**Live Pages URL once Pages is enabled:** https://pomegranatexlily.github.io/Closeout-Pocket/

**To enable:** Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**. The existing `.github/workflows/deploy-pages.yml` workflow publishes the root app on pushes to `main`. If Pages has not been enabled yet, this is a one-time repository setting. Check the Actions tab for the latest deployment run.

## Files
- `index.html` — standalone web app, including photo attachment and report-generation functionality
- `privacy.html` — browser-data and GitHub hosting disclosure
- `404.html` — branded invalid-link page
- `icon.svg` — first-party favicon
- `.nojekyll` — serve all static files directly
- `.github/workflows/deploy-pages.yml` — attempts deployment automatically on main branch

## Safety
This version saves drafts and generated invoices, including images, only in the **current browser's localStorage**. Export a JSON backup and keep it securely in Files; other devices do not synchronize automatically. GitHub Pages projects on the same `pomegranatexlily.github.io` hostname are not isolated from each other at a storage-security boundary. **Use only fabricated customer names, addresses, and photos while testing.** Do not treat this as a secure production record system. Browser storage can be lost; export reports you need to keep.

No license is granted by publishing this source. Pomegranate × Lily retains rights to its original branding and code.
