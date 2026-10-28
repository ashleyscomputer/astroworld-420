# Phase 1 — foundation and staff authorization

## Baseline and safety
- Based on main at `7ef39bdacd871ee60ed78ef9694622ed0c798c6f`.
- Do not modify applied Drizzle migrations, historical data, inventory triggers, or production credentials.
- No payment gateway, regulated-product commerce, public deployment, or production data migration is authorized.
- `.dev.vars` is untracked and generated locally with a random bootstrap password on new installs. Never put credentials in issues, CI logs, screenshots or PRs.
- Existing weak local `.dev.vars` files are **not** overwritten; rotate them as a separate controlled operation. Weak `ADMIN_INITIAL_PASSWORD` values must not be accepted for login.

## Foundation checks
- `npm ci --ignore-scripts`, `npx tsc --noEmit`, `npm run lint`.
- `node --experimental-strip-types --test tests/*.test.mjs`.
- CI does not connect to production D1, create deploys or modify main.
- Full stock-changing suites require a separately initialized local D1 fixture and `ADMIN_TEST_PASSWORD`; never run against production.

## Required security gates still pending
- Super Admin MFA, secure recovery and credential rotation; protected branch and required-review rules; production secret setup and rollback rehearsal.
- Enforce payment-derived membership entitlements before public checkout/QR is enabled. The existing active/pending status is not sufficient proof of payment.
- All real commerce, inventory and partner activities remain subject to legal and merchant approval.
