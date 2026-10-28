# Astroworld 420

Dark smoothie storefront and authenticated admin dashboard, built with React, Next.js App Router APIs on Vinext, Tailwind, Framer Motion and Cloudflare D1.

## Customer and admin

The portal reveals on arrival and replays automatically when scrolled back into view; its video loops continuously. There is no replay button. The requested promotional clutter is removed. The supplied artwork remains in the 3D brand panel and social preview.

`/admin` provides customer/admin orders, manual order creation, search, stock and unit-cost editing, payment/status recording, restock actions, stock history and an ERPNext export queue. The requested initial login is `admin` / `admin`, bootstrapped from server runtime secrets. Passwords are salted/hashed in D1; sessions use HTTP-only SameSite cookies, Secure on HTTPS. The private ChatGPT access gate remains intact. Changing the bootstrap environment value does not rotate a password already stored in D1.

Stock starts at zero until entered by the admin. Banana = 100 makes 100 full portions available. Full orders reserve 1, half orders 0.5. Reservation and order writes are atomic. Database triggers prevent overselling; request IDs prevent duplicate deductions. Cancellation or a recorded refund with restock restores units exactly once. Closed orders cannot reopen. Historical preview orders are preserved and shown separately, without affecting current stock or sales metrics.

Order value and projected gross profit update on acceptance. Paid sales and paid gross profit update when payment is recorded. Gross profit is product revenue after discounts minus recorded product costs, excluding delivery, payment fees and overheads. Costs are snapshotted at acceptance; missing costs remain unknown. Customer confirmation/tracking reflect admin status changes.

No online gateway, email provider, automatic courier service or real ERPNext instance is connected. Payment/refund buttons record manual activity and do not move money. Verified recipes, allergens, portion volumes, business details and final fulfilment policies remain launch inputs.

## Local preview

Requires Node 22.13+. Run `npm ci` once. Copy `config/server.env.example` to ignored `.dev.vars`; set local admin credentials and omit ERP variables until an instance exists. For the requested test login set ADMIN_USERNAME and ADMIN_INITIAL_PASSWORD to admin.

```powershell
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_happy_steve_rogers.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_eminent_lionheart.sql
node scripts/preview-store.mjs
```

Apply migrations once, in order, per fresh local database. Open http://127.0.0.1:5180 and /admin. Stop the preview before rebuilding on Windows. The helper keeps local credentials in an ignored runtime configuration, outside deployable build files. Local data is not published. `npm run dev` is available for development.

## Edit source

- `lib/catalog.ts`: names, prices, artwork, delivery and discounts. Full prices are R30, R70, R70, R100, R130, R140, R150, R160 in product order. Half prices are exactly 50%.
- `app/storefront.tsx`, `app/globals.css`: customer interface and motion.
- `app/admin-ui.tsx`, `app/admin.css`: admin interface.
- `lib/commerce.ts`: authoritative prices, reservations, cost snapshots and order changes.
- `lib/admin-auth.ts`: credentials, sessions and login throttling.
- `db/schema.ts`, `drizzle/`: append-only schema migrations and reservation/restock/outbox triggers. Never rewrite applied migrations.
- `lib/erpnext-client.ts`, `lib/erpnext.ts`: REST adapter and persistent export queue.
- `public/astroworld-420-brand.jpg`: user artwork, used as supplied with CSS layout effects.

## ERPNext

ERPNext requires a separate Python/Frappe host; it cannot run in this Cloudflare Worker. No instance was supplied and Docker is unavailable in this environment. `scripts/setup-erpnext.ps1` prepares the pinned official Docker evaluation stack once Docker is available. That loopback-only disposable demo is not production hosting or reachable from the published store.

The connector exports customer/admin orders as Sales Order drafts and availability as Stock Reconciliation drafts. It supports fractional quantities, prices, discounts, delivery lines, retries and draft reuse. Admins test the connection and export queued changes explicitly. Drafts require review/submission in ERPNext; this is not two-way stock synchronization or automatic accounting/payment posting. No live ERPNext installation has been tested.

See [ERPNext integration setup](integrations/erpnext/README.md) for configuration, exact mapping, limitations and primary documentation. API credentials belong only in server runtime secrets.

## Verify

With the local preview running:

```powershell
npx tsc --noEmit
node --experimental-strip-types scripts/verify-store.mjs
```

The suite changes only a loopback preview database and creates synthetic example.invalid orders. It verifies admin authorization, full/half stock, paid/projected profit, concurrent last-unit purchases, duplicate submissions, cancellation/refund restoration, confirmation-token privacy, tracking, offline ERP behavior and routes. The ERP contract test uses an in-memory stub, not a live ERP installation. Do not target a real trading site.

Browser QA covers sign-in, editable stock, manual order creation, payment recording, metrics, responsive layouts and the automatic portal.

## Hosting and source

Preserve `.openai/hosting.json` and generated migrations. Native Sites publication applies migrations before the Worker upload. Runtime credentials, dependencies, build output and local test data remain outside GitHub. The private GitHub remote is `github`: https://github.com/ashleyscomputer/astroworld-420.
