# Astroworld 420

Dark smoothie storefront and authenticated admin dashboard, built with React, Next.js App Router APIs on Vinext, Tailwind, Framer Motion and Cloudflare D1.

## Customer and admin

The portal reveals on arrival and replays automatically when scrolled back into view; its video loops continuously. There is no replay button. The requested promotional clutter is removed. The supplied artwork remains in the 3D brand panel and social preview.

`/admin` provides customer/admin orders, manual order creation, search, stock and unit-cost editing, payment/status recording, restock actions, stock history and an ERPNext export queue. The requested initial login is `admin` / `admin`, bootstrapped from server runtime secrets. Passwords are salted/hashed in D1; sessions use HTTP-only SameSite cookies, Secure on HTTPS. The private ChatGPT access gate remains intact. Changing the bootstrap environment value does not rotate a password already stored in D1.

Stock starts at zero until entered by the admin. Banana = 100 makes 100 full portions available. Full orders reserve 1, half orders 0.5. Reservation and order writes are atomic. Database triggers prevent overselling; request IDs prevent duplicate deductions. Cancellation or a recorded refund with restock restores units exactly once. Closed orders cannot reopen. Historical preview orders are preserved and shown separately, without affecting current stock or sales metrics.

Order value and projected gross profit update on acceptance. Paid sales and paid gross profit update when payment is recorded. Gross profit is product revenue after discounts minus recorded product costs, excluding delivery, payment fees and overheads. Costs are snapshotted at acceptance; missing costs remain unknown. Customer confirmation/tracking reflect admin status changes.

No online gateway, email provider, automatic courier service or real ERPNext instance is connected. Payment/refund buttons record manual activity and do not move money. Verified recipes, allergens, portion volumes, business details and final fulfilment policies remain launch inputs.

## Desktop and localhost

The working project is in the Desktop folder **Astroworld 420**. Double-click **Start Astroworld.cmd**, or run `npm run local` in this folder. Node 22.13+ is required. The launcher installs dependencies if missing, builds the current source, applies pending local migrations, and serves **http://localhost:3000**. Keep its window open while using the store. If another application occupies port 3000, the launcher reports this without stopping it.

The initial local admin login is **admin / admin** at **http://localhost:3000/admin**. Each new local product starts with **100 full portions and an illustrative R20 full-portion cost** so checkout can be tried immediately. Edit these under Inventory. Orders, stock, costs and admin sessions persist in ignored `.wrangler/state`; restarting never resets existing stock. The cancelled “Local checkout test” order is retained as an audit trail. Production stock is separate and starts at zero until entered by the admin.

Local credentials live in ignored `.dev.vars`, and the generated preview configuration stays in ignored `.sites-runtime`, outside deployable build files. Local databases and personal Desktop photos are excluded from publication and GitHub. Stop this server before rebuilding on Windows. `npm run dev` also defaults to port 3000 for source development; the launcher is the complete local store with a durable database.

The hero uses the supplied island video, revealing from a line through a circle into a pill; it replays on scrolling back into view. The separate scroll sequence after the collection uses Three.js for the globe, cloud layer, stars and seeded strawberry. It includes opt-in synthesized ambient sound, motion controls, reduced-motion support and an animated Canvas 2D fallback. All artwork is illustrative.

## Edit source

- `lib/catalog.ts`: names, prices, artwork, delivery and discounts. Full prices are R30, R70, R70, R100, R130, R140, R150, R160 in product order. Half prices are exactly 50%.
- `app/storefront.tsx`, `app/globals.css`: customer interface.
- `app/portal-hero.tsx`, `app/orbital-experience.tsx`, `app/experience.css`, `lib/cosmic-scene.ts`: hero and scrolling animation.
- `app/admin-ui.tsx`, `app/admin.css`: admin interface.
- `lib/commerce.ts`: authoritative prices, reservations, cost snapshots and order changes.
- `lib/admin-auth.ts`: credentials, sessions and login throttling.
- `db/schema.ts`, `drizzle/`: append-only schema migrations and reservation/restock/outbox triggers. Never rewrite applied migrations.
- `lib/erpnext-client.ts`, `lib/erpnext.ts`: REST adapter and persistent export queue.
- `public/astroworld-420-brand.jpg`: user artwork, used as supplied with CSS layout effects.

## Membership and QR collection

Customers register or sign in at /member. New accounts are pending until a signed-in staff member checks the customer's details and approves the request under Admin → Members & scan. Email verification and password recovery are not configured; staff must verify identity before approval. Disabled members cannot generate a valid pass.

An active member's page creates a new QR pass every minute; passes expire after two minutes and contain an opaque random token, not personal information. Staff open the camera scanner in the admin dashboard; it requires HTTPS or localhost and camera permission. Customers can expand the pass to show a short-lived code for manual entry. Scan results are available only to authenticated admins and display the profile, linked orders, and any order whose fulfilment method is collection and status is Ready. Staff can disable a membership immediately.

Orders placed while signed in are linked automatically. Staff can link a guest or store-created order using its order number after checking the customer's details. An order already linked to another member cannot be reassigned through this flow. The local and hosted databases are separate. The hosted site is currently owner-private; customers need an accessible deployment and HTTPS for real use.

Run `node scripts/verify-members.mjs` against the isolated local preview on port 3001 to test membership and order linking. It creates synthetic local test records. The scanner and QR generator use locally bundled dependencies.

## ERPNext

ERPNext requires a separate Python/Frappe host; it cannot run in this Cloudflare Worker. No instance was supplied and Docker is unavailable in this environment. `scripts/setup-erpnext.ps1` prepares the pinned official Docker evaluation stack once Docker is available. That loopback-only disposable demo is not production hosting or reachable from the published store.

The connector exports customer/admin orders as Sales Order drafts and availability as Stock Reconciliation drafts. It supports fractional quantities, prices, discounts, delivery lines, retries and draft reuse. Admins test the connection and export queued changes explicitly. Drafts require review/submission in ERPNext; this is not two-way stock synchronization or automatic accounting/payment posting. No live ERPNext installation has been tested.

See [ERPNext integration setup](integrations/erpnext/README.md) for configuration, exact mapping, limitations and primary documentation. API credentials belong only in server runtime secrets.

## Verify

Use a separate local database on port 3001 for the stock-changing test suite:

```powershell
$env:PORT="3001"
$env:ASTROWORLD_STATE=".wrangler/qa-state"
npm run local
# In a second terminal:
npx tsc --noEmit
npm run test:store
```

The suite changes only a loopback preview database and creates synthetic example.invalid orders. It verifies admin authorization, full/half stock, paid/projected profit, concurrent last-unit purchases, duplicate submissions, cancellation/refund restoration, confirmation-token privacy, tracking, offline ERP behavior and routes. The ERP contract test uses an in-memory stub, not a live ERP installation. Do not target a real trading site.

Browser QA covers sign-in, editable stock, manual order creation, payment recording, metrics, responsive layouts and the automatic portal.

## Hosting and source

Preserve `.openai/hosting.json` and generated migrations. Native Sites publication applies migrations before the Worker upload. Runtime credentials, dependencies, build output and local test data remain outside GitHub. The private GitHub remote is `github`: https://github.com/ashleyscomputer/astroworld-420.
