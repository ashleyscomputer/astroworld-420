# Astroworld 420 Inventory Admin

Private Android and iOS application for internal stock and staff operations. Built with Expo SDK 58, React Native, TypeScript, Supabase Auth/Postgres, SQLite and Expo SecureStore.

This app is deliberately **not** the customer-facing website or checkout system. It does not contain customer POS, sales, payments, memberships, customer accounts, or website UI. Those remain separate systems and are not imported into this app.

## Scope

- Private email/password sign-in, active profile check and Staff / Super Admin roles.
- Inventory dashboard with stock-on-hand and low-stock alerts.
- Search active products from the existing catalogue.
- Staff read-only stock visibility.
- Super Admin restock, stock adjustment with reason, and low-stock threshold updates.
- Append-only stock movement history.
- Offline inventory snapshot cache and idempotent pending restock/adjustment queue.
- Staff invitation and account activation/deactivation.
- QR workplace attendance: Super Admin displays a rotating 90-second QR; each employee signs into their own account and scans it to clock in or out.
- Personal/team shift history and tracked-hours summary.
- Dark, mobile-first interface with shared theme and reusable UI primitives.

Product catalogue identity and product/customer pricing remain controlled by the separate business system. This app reads active product names and IDs and manages only internal stock quantities and stock thresholds.

## Data rules

- Stock is always stored in PostgreSQL as an integer count of half-gram units: 0.5 g = 1 unit and 1 g = 2 units.
- The app accepts only whole-gram or half-gram values and converts them to integer units before making database calls.
- No floating-point stock calculation is used.
- Offline changes are labelled pending and are not presented as confirmed stock until the server accepts them.
- Restock and adjustment requests carry a stable UUID idempotency key. A retry uses the same request ID to avoid applying a stock movement twice.
- Adjustments use row revisions. A stale adjustment is rejected rather than overwriting a more recent stock level.

## Prerequisites

- Node.js 22.13.x for Expo SDK 58.
- An Expo account for EAS cloud builds.
- A Supabase project configured with the Step 1 schema and functions.
- Android device for APK preview and registered iOS devices plus Apple Developer account for ad-hoc iOS preview builds.

Expo SDK 58 targets React Native 0.88 and React 19.3. Expo's SDK reference lists Node 22.13.x for this SDK family. See the [SDK reference](https://docs.expo.dev/versions/v58.0.0/).

## Supabase setup

For a project that already has Step 1 migrations 0001-0003 and this branch's 0004 applied, apply these migrations in order:

1. `0005_mobile_sale_rpc_hardening.sql` is a no-op retained for migration-history compatibility.
2. `0006_inventory_idempotency.sql` adds role-gated, request-ID idempotent stock operations and the staff-safe movement feed.
3. `0007_staff_attendance.sql` adds short-lived QR attendance, clock-in/out records and role-filtered history.
4. `0008_restore_legacy_client_sales_rpcs.sql` preserves the original authenticated access to the separate customer system's legacy sales/payment functions.

Do not re-run a migration that has already been applied. Inspect the Supabase migration history first. The current mobile app does not call sales, checkout, payment, member, or financial RPCs.

Create the first Auth user, then bootstrap it as Super Admin using the original Step 1 setup instructions. Keep public sign-ups disabled. Deploy the existing staff invitation function:

~~~bash
supabase functions deploy invite-staff
~~~

The Edge Function receives its Supabase service-role key from server-side function secrets. The service-role key must never be put in the mobile app, the EAS client environment, or Git.

## Local development

~~~bash
cd apps/admin-mobile
cp .env.example .env
# Add only the Supabase project URL and anon/publishable key.
npm install
npx expo install --check
npm run typecheck
npm run test:inventory
npx expo start
~~~

For the browser preview:

~~~bash
npx expo start --web --port 8082 -c
~~~

The web preview is useful for layout and workflow testing, but it is not a replacement for native Android/iOS builds or camera testing.

## Offline behaviour

The app caches the last successfully loaded active product and stock snapshot in SQLite. If a Super Admin is already signed in and a stock operation encounters a network failure, it is stored locally with a request ID and the identity of the creating account. On reconnect, the app sends it to the role-gated idempotent RPC using the same request ID.

The server remains authoritative. Stock changes do not appear as confirmed until accepted by PostgreSQL. A stale adjustment or permission failure remains pending with an error rather than being silently discarded. A queued operation from another account is not sent under the currently signed-in account.

## Staff attendance

- Super Admin generates the workplace QR from the Attendance screen.
- The code rotates before its 90-second expiry and the backend stores only its SHA-256 hash.
- Each employee must sign in with their own active profile and scan the displayed code using their own phone.
- First valid scan starts a shift; the next scan of a fresh code ends it.
- Each code can be redeemed once per employee, and server timestamps are authoritative.
- Staff can see their own history. Super Admin can view the team's history and total hours for the last 31 days.

The attendance tracker does not currently apply break deductions, overtime, public-holiday rules, payroll approvals, biometric checks, geofencing, or manual correction of missed clock-outs. Agree those policies before treating attendance as payroll evidence.

## Native demo builds

See [DEMO_AND_RELEASE_RUNBOOK.md](./DEMO_AND_RELEASE_RUNBOOK.md) for complete setup. Quick commands after linking the EAS project and adding preview environment variables:

~~~bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
~~~

Android preview is an installable APK. iOS ad-hoc preview requires every tester device to be registered before the build. For broader client distribution, use TestFlight/App Store Connect instead.

## Security boundaries

- The mobile app uses only Supabase anon/publishable client keys.
- RLS and server-side role checks are the authorisation boundary. Hiding controls in the UI is not security.
- Inventory request payloads and attendance QR tokens are not directly readable from authenticated client tables.
- Movement history omits cost and financial fields.
- Staff attendance history is restricted to the employee's own profile; Super Admin can view the team.
- Website source, website deployments and Cloudflare D1 are outside this app's code path.

## Verification

GitHub Actions validates dependency compatibility, TypeScript, integer stock-unit tests, Android/iOS/web bundle exports and Expo Doctor. These checks validate build bundles, not real device installation or camera behaviour.

The pgTAP checks are in `supabase/tests/inventory_attendance_permissions.test.sql`. Run them against a test Supabase database after applying the migrations:

~~~bash
supabase test db
~~~

The SQL permission suite has not been executed against the client's live database as part of this code push. Complete the demo acceptance checklist in the runbook on physical Android and iOS devices before client handover.
