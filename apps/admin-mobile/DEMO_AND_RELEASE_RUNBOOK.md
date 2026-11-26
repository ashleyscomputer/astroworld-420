# Astroworld 420 Admin Mobile: Demo and Release Runbook

## Product boundary

This application is the private **inventory and staff-operations app**. It covers sign-in, product stock visibility, low-stock alerts, stock restocking/adjustments, stock movement history, staff access, offline inventory sync, and QR attendance.

The customer-facing website, customer account journeys, checkout, memberships, and online payments remain a separate system. Do not deploy this mobile app as the website and do not change the website repository as part of this work.

## 1. Apply database migrations

Apply migrations in numeric order in the Supabase SQL Editor or through the project's migration workflow.

For an existing project that has already applied Step 1 migrations 0001-0004, apply:

1. `0005_mobile_sale_rpc_hardening.sql` (numbered no-op; retained for history compatibility)
2. `0006_inventory_idempotency.sql`
3. `0007_staff_attendance.sql`
4. `0008_restore_legacy_client_sales_rpcs.sql`

The customer-facing system is separate. The current 0005 migration is intentionally a no-op. Migration 0008 idempotently re-grants the original authenticated sales RPC permissions in case an earlier draft of 0005 was already applied. The inventory app itself does not call sales, checkout, payment, member, or finance RPCs.

Do not re-run a migration that Supabase has already recorded as applied. Check the migration history first. Never put a service-role key in the mobile app.

## 2. Local preview in Codespaces or VS Code

Use Node.js 22.13 or newer within the Expo SDK 58 supported Node 22 line.

```bash
cd /workspaces/astroworld-420
git status --short
git pull origin admin-mobile-step2
cd apps/admin-mobile
npm install
npx expo install --check
npm run typecheck
npx expo start --web --port 8082 -c
```

Keep your existing private `.env` file. If it does not exist, copy `.env.example` to `.env` and provide only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or the publishable key)

The anon/publishable key is designed for client use and is protected by RLS. A Supabase service-role/secret key must never be put in `.env` for this app, committed to Git, or embedded in a mobile binary.

## 3. Configure EAS cloud builds

Cloud builds are the easiest way to create genuine Android and iOS binaries from Windows or Codespaces. A local Mac is not required for the cloud iOS build.

From `apps/admin-mobile`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

Link the project to the Expo account that will own the demo builds. EAS will add a project ID to the Expo app configuration. Commit that project ID change to the admin mobile branch.

Add the public Supabase client configuration to the EAS **preview** environment. Replace the placeholders with the values from your own Supabase project:

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR-PROJECT.supabase.co" --environment preview --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY" --environment preview --visibility plaintext
npx eas-cli@latest env:list --environment preview
```

These values are bundled into the client app and are not secrets. Do not add a service-role key.

### Android demo APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

The preview profile is configured to produce an installable APK. Open the completed build link on an Android device, download the APK, allow installation from that source when Android prompts, then install and launch it.

### iOS demo build

Register every iPhone/iPad that must install an ad-hoc demo build:

```bash
npx eas-cli@latest device:create
```

Complete the registration link on each iOS device. Then build:

```bash
npx eas-cli@latest build --platform ios --profile preview
```

An iOS ad-hoc build can only install on devices whose UDIDs are included in its provisioning profile. If you register another device after the build, register it and create a new build.

For a wider client pilot, use TestFlight instead. That requires an Apple Developer Program membership, an App Store Connect app record, a store-distribution build, and submission/processing through App Store Connect. Do not use the ad-hoc preview build as a TestFlight upload.

## 4. Demo device acceptance checklist

### Install and launch
- [ ] Install the latest Android APK on a real Android phone.
- [ ] Install the iOS ad-hoc build on every registered iPhone/iPad.
- [ ] Confirm the app launches without returning to the sign-in screen.
- [ ] Sign in as a Staff account and confirm the profile remains signed in after closing and reopening the app.
- [ ] Sign in as Super Admin and confirm the role-specific screens appear.
- [ ] Confirm the app has no customer checkout, membership, or client website screens.

### Inventory
- [ ] Confirm all active catalogue products load.
- [ ] Confirm stock displays only in 0.5 g increments.
- [ ] Confirm low-stock alerts match the configured threshold.
- [ ] As Staff, confirm products and stock are read-only.
- [ ] As Super Admin, restock a product by 0.5 g and confirm stock increases by exactly one half-unit.
- [ ] Repeat a restock after deliberately interrupting the response and confirm the idempotency key prevents a duplicate stock movement.
- [ ] Adjust stock with a reason and verify the movement history records the previous and new quantities.
- [ ] Confirm a stale adjustment is rejected with a conflict instead of overwriting a newer stock value.

### Attendance QR
- [ ] As Super Admin, generate a workplace QR.
- [ ] On a separate Staff phone, sign in and grant camera permission.
- [ ] Scan the displayed QR and confirm the server records clock-in.
- [ ] Generate a new workplace QR and scan again to clock out.
- [ ] Confirm the shift duration and timestamps appear in attendance history.
- [ ] Try scanning the same QR twice with the same employee and confirm the second scan is rejected.
- [ ] Wait for a QR to expire and confirm it is rejected.
- [ ] Confirm a Staff user cannot generate/revoke a workplace QR or view another employee's attendance.
- [ ] Confirm Super Admin can see the team attendance list.

### Offline and recovery
- [ ] Load inventory while online, then enable airplane mode.
- [ ] Confirm the last saved inventory snapshot remains visible with an explicit Offline indicator.
- [ ] Queue one restock while offline and confirm it is labelled pending, not confirmed stock.
- [ ] Restore connectivity and tap Sync now.
- [ ] Confirm the server accepts the operation once, the pending count returns to zero, and a refreshed stock snapshot shows the result.
- [ ] Test a conflicting queued adjustment and confirm it remains visible as needing attention rather than silently disappearing.

### Security and data boundaries
- [ ] Confirm Staff cannot access Super Admin restock/adjustment functions.
- [ ] Confirm Staff cannot read product cost, financial, or private audit records.
- [ ] Confirm Staff attendance history is limited to their own profile.
- [ ] Confirm raw attendance tables and QR token hashes are not directly readable from the client.
- [ ] Confirm the public website and its deployment have not been changed by this mobile-app work.
- [ ] Confirm no `.env`, service-role key, signing key, or provisioning file is committed.

## 5. Before a client demo

- [ ] Apply migrations 0005-0008 to the intended Supabase project.
- [ ] Create at least one Super Admin and two Staff profiles.
- [ ] Confirm all staff invitation emails work.
- [ ] Test Android and iOS builds on physical devices, not just the web preview.
- [ ] Complete the acceptance checklist above.
- [ ] Confirm demo data is clearly marked and no real employee hours are used as test data.
- [ ] Export a backup of the Supabase database before the first live attendance/stock trial.
- [ ] Keep one Super Admin account available for the demo in case a device needs access recovery.

## Attendance policy note

The tracker stores server timestamps and elapsed shift duration. It does not currently apply unpaid break deductions, overtime rules, public-holiday rules, payroll calculations, biometric checks, or location/geofence verification. Agree those policies with the client before treating these records as payroll evidence.
