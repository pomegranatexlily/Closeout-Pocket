# Packet Lily

**A Pomegranate × Lily product (field-test version)** — a phone-first invoice and job completion packet builder for small trades and service operators.

### Packet Lily design
Deep violet, soft lilac, ivory and gold form the premium design system. The stacked packet and lily seal appear on the app icon, the workspace, and the install screen. All existing invoice storage identifiers remain unchanged for backwards compatibility.

### Home screen and focused invoice form (v3.5)

Packet Lily now opens on a dedicated **Home** screen. The "Job done. Money next." marketing banner lives only on Home, alongside a short real getting-started guide and links to New invoice, My Business and Invoice desk. **New invoice** begins directly with its quick-invoice form, without a marketing banner above it. A persistent Home shortcut in the header lets the operator go home while retaining the current invoice draft. The desktop sidebar includes Home; the iPhone's four bottom workflow tabs remain unchanged so the navigation stays compact.

### Compact invoice desk and customer copy (v3.4)

The **Invoice desk** has four focused sections: **Overview** (invoice status and closeout), **Payments** (payment history and recording), **Receipts** (PDF customer receipts), and **Customer copy** (read-only invoice preview). The large marketing hero is hidden outside New invoice. The contractor desk no longer stacks all documents below the payment controls. Selecting a payment receipt automatically moves to Receipts. The Customer copy section disables the preview payment button so the contractor does not accidentally open their own Cash App session; it hides private controls.

**Share report file** and **Save report file** produce an independent customer-facing HTML invoice, with only the customer's invoice and a working Cash App link when one is configured. The HTML file does not contain the contractor payment desk, payment entries, invoice archive, or internal payment-entry notes. **Email invoice** opens a customer email draft with a payment link. **Print customer invoice / PDF** prints the customer-facing version even from the Contractor desk.

The customer must receive the shared invoice/request on **their own device** for the payment button to be actionable in their Cash App session. The business's Cash App account remains the payment destination; opening the business's own receiving link on their phone is not a meaningful checkout test. This static app does **not** host per-customer payment pages or provide authenticated customer portals.

Receipt exports likewise exclude the operator's internal payment notes.

### Payment desk and completion (v3.1)

Open **Invoice desk → Payments** to record each payment only after confirming the funds through Cash App, your bank, or in person. Each entry records its amount, received date, method, optional reference and note, confirmation that the owner checked it, and a locally generated receipt reference. The running paid total and balance are calculated from active entries, so partial payments work without entering the full paid total manually.

The **Receipt** button on each active owner-confirmed payment shows a branded customer receipt. **Save PDF receipt** now creates an actual local one-page `.pdf` (`application/pdf`, not an HTML file), and **Share PDF** uses the native share sheet when supported. **Print** remains available. The receipt states that it is business-owner-recorded and **not independently verified** by Packet Lily. A received payment is *never inferred* just because a Cash App link was opened or shared.

Once recorded receipts total at least the invoice amount, choose **Complete & close invoice**, explicitly confirming that you checked the funds outside Packet Lily. A closed invoice appears as such in the archive; you may **Reopen invoice for corrections** and void a mistaken payment. Voided entries stay visible in the local history but stop counting toward the balance. The app is not an immutable ledger or payment processor.

Past invoices from before the ledger are migrated on opening to **legacy payment entries**. They retain their previously recorded paid amount but are expressly marked unverified and do not receive newly fabricated payment receipts. The original archive format and localStorage keys remain readable; keep backups before editing real records.

### Fast invoicing
Open **My Business** and save the business name, address, phone, email and optional reusable Cash App $cashtag profile once. Each new invoice then needs only the **customer name** and **invoice amount**; sender details, a new invoice reference, and the current date are filled in automatically. You can generate and share the invoice, print/save a PDF, or archive it locally if device saving is enabled. Existing invoice records are not silently rewritten when the saved business profile changes. The **Clear saved profile** control removes those defaults without deleting archived invoices.

For a more complete job packet, expand **More details** to add service location, photos, work performed, customer email, paid amount, due date, and notes. The balance is calculated from invoice total minus recorded payments, and currency formatting adds thousands separators. Record incoming payments in the Payment Desk only after verifying them outside the app.

A saved $cashtag creates a reusable Cash App *profile link*, which requires the customer to enter the invoice amount. The app cannot automatically generate a verified, amount-prefilled request from that profile. For an exact-amount request, create it in Cash App's Request flow, share the request-specific URL into the invoice, and confirm that the link matches the outstanding balance. If the balance changes, the confirmed link is marked stale until replaced. Packet Lily does not connect to Cash App or reconcile transactions.

Records and photos are saved in the current browser only when invoice archiving is enabled; the business profile is stored separately when you explicitly select **Save business details**. JSON export/import is provided for invoice archive backups. Email invoice opens a draft; it does not send automatically or attach the HTML report. Payment requests can be shared as message text. There is no backend or customer-login system.

**Existing GitHub Pages URL (retained for continuity):** https://pomegranatexlily.github.io/Closeout-Pocket/

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

## Brand change and continuity
Packet Lily replaces the former Closeout Pocket product name. The public GitHub repository and Pages URL still contain `Closeout-Pocket` for compatibility with installed versions; do not move the site's path without planning storage, service-worker, manifest ID, and iPhone install migration. Old backups labeled `Closeout Pocket` are accepted by the current importer. This is a product rebrand, not a change to the legal terms, host or payment provider.
