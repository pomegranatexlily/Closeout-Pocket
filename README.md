# Closeout Pocket

**A Pomegranate × Lily prototype** — a phone-first invoice and job completion packet builder for small trades and service operators.

### Fast invoicing
Open **My Business** and save the business name, address, phone, email and optional reusable Cash App $cashtag profile once. Each new invoice then needs only the **customer name** and **invoice amount**; sender details, a new invoice reference, and the current date are filled in automatically. You can generate and share the invoice, print/save a PDF, or archive it locally if device saving is enabled. Existing invoice records are not silently rewritten when the saved business profile changes. The **Clear saved profile** control removes those defaults without deleting archived invoices.

For a more complete job packet, expand **More details** to add service location, photos, work performed, customer email, paid amount, due date, and notes. The balance is calculated from invoice total minus recorded payments, and currency formatting adds thousands separators. Mark incoming payments manually after verifying them outside the app.

A saved $cashtag creates a reusable Cash App *profile link*, which requires the customer to enter the invoice amount. The app cannot automatically generate a verified, amount-prefilled request from that profile. For an exact-amount request, create it in Cash App's Request flow, share the request-specific URL into the invoice, and confirm that the link matches the outstanding balance. If the balance changes, the confirmed link is marked stale until replaced. Closeout Pocket does not connect to Cash App or reconcile transactions.

Records and photos are saved in the current browser only when invoice archiving is enabled; the business profile is stored separately when you explicitly select **Save business details**. JSON export/import is provided for invoice archive backups. Email invoice opens a draft; it does not send automatically or attach the HTML report. Payment requests can be shared as message text. There is no backend or customer-login system.

**Live Pages URL once Pages is enabled:** https://pomegranatexlily.github.io/Closeout-Pocket/

**To enable:** Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**. The existing `.github/workflows/deploy-pages.yml` workflow publishes the root app on pushes to `main`. If Pages has not been enabled yet, this is a one-time repository setting. Check the Actions tab for the latest deployment run.

## Production status
- New visitors choose whether to save customer records on the device. Existing browser archives are preserved.
- No analytics, nonessential cookies or customer-data backend are installed.
- The app runs under a restrictive Content Security Policy and caches only public shell files for offline launch.
- **Customer data is not encrypted**. Other projects sharing the same `pomegranatexlily.github.io` origin are not isolated from it. Use fabricated customer data for testing until isolated hosting and secure storage are provided.
- Payment received is updated manually; Cash App payment status is not synchronized.

## Files
- `index.html` — mobile UI, styles, restrictive CSP and PWA metadata
- `app.js` — invoicing, archiving, amount-specific payment-link validation and sharing
- `manifest.webmanifest` — app installation metadata
- `sw.js` — offline static-shell cache, not customer-data caching
- `privacy.html` — browser-data and GitHub hosting disclosure
- `404.html` — branded invalid-link page
- `icon.svg` — first-party favicon
- `.nojekyll` — serve all static files directly
- `.github/workflows/deploy-pages.yml` — attempts deployment automatically on main branch

## Safety
This version saves drafts and generated invoices, including images, only in the **current browser's localStorage**. Export a JSON backup and keep it securely in Files; other devices do not synchronize automatically. GitHub Pages projects on the same `pomegranatexlily.github.io` hostname are not isolated from each other at a storage-security boundary. **Use only fabricated customer names, addresses, and photos while testing.** Do not treat this as a secure production record system. Browser storage can be lost; export reports you need to keep.

No license is granted by publishing this source. Pomegranate × Lily retains rights to its original branding and code.

## Focused field test (before adding features)
Give three independent solo contractors a 10-minute task: complete a real or fabricated job on an iPhone, add before/after photos, set the actual amount paid, generate a packet, share a Cash App payment request, reopen the same invoice, and find it in the archive. Do not submit real customer details on shared Pages hosting.

Record for each tester: trade, current invoicing method, total time, any confusing step, whether the payer could follow the request, and whether they would replace their current process or pay for this workflow. **Go/no-go:** At least two of three complete without coaching and say they would use it on the next job, and at least one agrees to a real paid pilot. Otherwise revise the workflow or stop expanding features.

The existing app/short Home Screen name remains unchanged pending distinct product naming and brand clearance.
