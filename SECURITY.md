# Closeout Pocket — Security and privacy status

Closeout Pocket is a **client-only field-test application**, not a protected production billing service.

## Implemented controls
- No bank-card capture, merchant API tokens, passwords, server-side customer database, advertising cookies or analytics.
- Browser-local saving is optional for new visitors. Returning browsers retain their existing invoices and may pause saving.
- Invoice archive supports export, import and device-data erasure. Preserve backups securely.
- Content Security Policy limits scripts to same-origin files, blocks app network connections, objects and frames; the app uses no remote JavaScript.
- Imports are validated for expected structure, bounded file size, text lengths, and JPEG photo data. The app escapes invoice text when constructing reports.
- Payment links must use HTTPS on Cash App's actual domain. Exact-amount requests require operator confirmation for the matching invoice balance and are invalidated after balance changes.
- The offline service worker caches **only public app shell files** (not customer records or reports).

## Important remaining risks — NOT production safe
1. **Shared GitHub Pages origin.** Any unrelated site running JavaScript under `pomegranatexlily.github.io` shares browser-origin privileges with this app. Different URL paths are NOT a customer-data security boundary.
2. **Unencrypted local data.** Local drafts, invoice archives, and JSON exports contain plaintext names, contact information, addresses, photos and balances. LocalStorage cannot provide user authentication, device sync, secure multi-user access, or guaranteed durable backups.
3. **No payment verification.** Cash App handles all payment processing. Opening a link or receiving a message does not prove that an invoice was paid. The operator must verify payment within Cash App and record it manually.
4. **No automated email service.** Email opens a draft that the operator sends. Sharing a request opens the system share menu. The app cannot guarantee delivery, message preview appearance or completion.
5. **Hosted source is public.** Never commit credentials, private customer invoices, secret tokens or backups to this repository.

**Before using with unrelated paying customers:** put the app on a **dedicated, isolated domain**, implement suitable authenticated/encrypted data storage and recovery, add server-side authorization if multi-user accounts are introduced, and perform a professional security/privacy review. Do not add a fake cookie-consent banner when no cookies are used.

## Reporting vulnerabilities
Open a private GitHub repository security advisory instead of a public issue when a problem could expose sensitive information. Avoid including real customer records or payment details in reports.
