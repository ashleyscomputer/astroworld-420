# Astroworld Admin Mobile

Android-first internal admin app using Expo, React Native, TypeScript and Supabase. The iOS target is retained in Expo config. This is a separate codebase folder and does not import the website UI or use the website Cloudflare D1 database. Step 1's Admin data belongs in a separate Supabase Postgres project.

## Included in this foundation

- Private email/password sign-in. No public registration.
- Active profile and database role check after sign-in.
- Staff and Super Admin experiences. Database RLS and role-checked functions remain authoritative.
- Dashboard metrics from ops_summary() and Super Admin financial summaries from financial_summary().
- POS cart with tier-price estimate and server-authoritative checkout through record_sale_with_payment().
- Recent sales, payment recording, cancellation, and Super Admin refund/restock.
- Inventory views and Super Admin stock, price, threshold, cost, product-create and product-retire actions.
- Member creation, approval, disable, agreement capture, pass issue and manual pass-token verification.
- Super Admin staff invitations through a JWT-verified Supabase Edge Function.
- Persistent SQLite inventory cache and idempotent offline sale queue.
- Dark UI with emerald green and purple accents.

## Prerequisites

- Node.js 22.13 or newer for Expo SDK 58.
- A Supabase project dedicated to the Admin app.
- The Step 1 SQL files from astroworld-admin-step1.zip.

## Supabase setup

1. Create a Supabase project and keep public sign-ups disabled in Authentication.
2. Run Step 1 migrations in this order: 0001_schema.sql, 0002_functions.sql, 0003_security.sql.
3. Apply supabase/migrations/0004_mobile_admin.sql from this repository.
4. Create the first Auth user in Supabase Authentication, then run Step 1 bootstrap_super_admin.sql with that user's UUID.
5. Deploy the Edge Function with: supabase functions deploy invite-staff
6. Ensure the platform-provided SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY secrets are available to the function. The service-role key must never be put in the mobile app.

The mobile migration is additive. Never rewrite or casually rerun already-applied Step 1 migrations.

## Local app setup

~~~bash
cd apps/admin-mobile
cp .env.example .env
# Fill in the Supabase project URL and anon/publishable key.
npm install
npx expo install --fix
npm run typecheck
npx expo start
~~~

Scan the Expo Go QR code on Android or press a for an Android emulator. iOS can be used later. For a production build, configure the EAS project and use the preview or production build profile.

## Offline behaviour

The app caches the last successfully loaded product list locally. A sale that cannot reach the network is stored in SQLite with a stable UUID request ID. Retrying sync sends the same request ID to Postgres, where the Step 1 idempotency guard prevents duplicate stock deduction.

A queued sale is not a confirmed sale: it is not counted as revenue, is not marked paid on the server and does not reserve stock until Postgres accepts it. The database calculates the final total and validates stock. If stock changes before sync, the queue item remains with an error for staff to resolve rather than being silently discarded.

## Integration notes

- New paid sales record cash or card. Existing historical paid rows remain NULL because their payment type is not known.
- Sale creation and optional payment are performed in one database transaction.
- Product costs and profit remain Super Admin only.
- The Step 1 member-pass RPC returns the plaintext token at issuance and stores only its hash. Current mobile UI reveals the token once and supports manual token verification. Native camera scanning and QR rendering remain a follow-up.
- No real Supabase project or staff accounts have been configured from this repository.

## Security notes

The mobile client uses only the public anon/publishable key. RLS and Step 1's role-checked SQL functions enforce access. Hiding a button is not an authorisation control. invite-staff checks the caller JWT and active Super Admin profile before using SUPABASE_SERVICE_ROLE_KEY on the server.