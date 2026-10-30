# Astroworld 420

Dark smoothie storefront and authenticated admin dashboard, built with React, Next.js App Router APIs on Vinext, Tailwind, Framer Motion and Cloudflare D1.

## Customer and admin

The portal reveals on arrival and replays automatically when scrolled back into view; its video loops continuously. There is no replay button. The requested promotional clutter is removed. The supplied artwork remains in the 3D brand panel and social preview.

`/admin` provides the staff point-of-sale register, orders, member management and (for the super admin) reports, stock/cost editing, staff accounts and product catalogue management. Under Products, the super admin can add or edit product/strain names, first/second/third-gram prices, descriptions, artwork, colours and storefront visibility. New catalogue entries create an inventory row with zero stock and no cost; staff can only sell products that are active and in stock. The requested initial login is `admin` / `admin`, bootstrapped from server runtime secrets. Passwords are salted/hashed in D1; sessions use HTTP-only SameSite cookies, Secure on HTTPS. The private ChatGPT access gate remains intact. Changing the bootstrap environment value does not rotate a password already stored in D1.

Stock starts at zero until entered by the admin. Banana = 100 g makes 100 g available. Orders reserve 1 g or 0.5 g. Reservation and order writes are atomic. Database triggers prevent overselling; request IDs prevent duplicate deductions. Cancellation or a recorded refund with restock restores units exactly once. Closed orders cannot reopen. Historical preview orders are preserved and shown separately, without affecting current stock or sales metrics.

Order value and projected gross profit update on acceptance. Paid sales and paid gross profit update when payment is recorded. Gross profit is product revenue after discounts minus recorded product costs, excluding delivery, payment fees and overheads. Costs are snapshotted at acceptance; missing costs remain unknown. Customer confirmation/tracking reflect admin status changes.

No online gateway, email provider, automatic courier service is connected. Payment/refund buttons record manual activity and do not move money. Verified recipes, allergens, business details and final fulfilment policies remain launch inputs.

## Desktop and localhost

The working project is in the Desktop folder **Astroworld 420**. Double-click **Start Astroworld.cmd**, or run `npm run local` in this folder. Node 22.13+ is required. The launcher installs dependencies if missing, builds the current source, applies pending local migrations, and serves **http://localhost:3000**. Keep its window open while using the store. If another application occupies port 3000, the launcher reports this without stopping it.

The initial local admin login is **admin / admin** at **http://localhost:3000/admin**. The eight original demo products are seeded with **100 g and an illustrative R20 per gram cost** in a fresh local database so checkout can be tried immediately. Products added later under Admin → Products start with **0 g and no unit cost**; enter those under Stock. Orders, stock, costs and admin sessions persist in ignored `.wrangler/state`; restarting never resets existing stock. The cancelled “Local checkout test” order is retained as an audit trail. Production stock is separate and starts at zero until entered by the admin.

Local credentials live in ignored `.dev.vars`, and the generated preview configuration stays in ignored `.sites-runtime`, outside deployable build files. Local databases and personal Desktop photos are excluded from publication and GitHub. Stop this server before rebuilding on Windows. `npm run dev` also defaults to port 3000 for source development; the launcher is the complete local store with a durable database.

The hero uses the supplied island video, revealing from a line through a circle into a pill; it replays on scrolling back into view. The separate scroll sequence after the collection uses Three.js for the globe, cloud layer, stars and seeded strawberry. It includes opt-in synthesized ambient sound, motion controls, reduced-motion support and an animated Canvas 2D fallback. All artwork is illustrative.

## Edit source

- `lib/catalog.ts`: the eight original products, their initial tier prices, artwork, delivery and discounts. Admin-managed catalogue records are stored in D1; prices per 1 g and the second/third-gram rates are editable under Admin → Products.
- `app/storefront.tsx`, `app/globals.css`: customer interface.
- `app/portal-hero.tsx`, `app/orbital-experience.tsx`, `app/experience.css`, `lib/cosmic-scene.ts`: hero and scrolling animation.
- `app/admin-ui.tsx`, `app/admin.css`: point-of-sale and admin interface, including Products (super admin only).
- `lib/commerce.ts`: D1-backed catalogue and inventory reads, authoritative prices, reservations, cost snapshots and order changes.
- `lib/admin-auth.ts`: credentials, sessions and login throttling.
- `db/schema.ts`, `drizzle/`: append-only schema migrations including the D1 `catalog_products` table and reservation/restock triggers. Never rewrite applied migrations.

- `public/astroworld-420-brand.jpg`: user artwork, used as supplied with CSS layout effects.

## Membership and QR collection

Customers register or sign in at /member. New accounts are pending until a signed-in staff member checks the customer's details and approves the request under Admin → Members & scan. Email verification and password recovery are not configured; staff must verify identity before approval. Disabled members cannot generate a valid pass.

Google sign-in uses Firebase Authentication when the web-app configuration is present. Set FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID and FIREBASE_APP_ID in the local .dev.vars and as runtime environment variables for the hosted Site. Set FIREBASE_GOOGLE_ENABLED=true only after the Google provider and authorized domains are configured. Enable Google sign-in in Firebase and add each site hostname to Firebase Authentication's authorized domains. These web-app configuration values are public identifiers, not service-account keys. The server verifies Google's signature and Firebase project, token expiry, recent authentication, Google provider and verified email before issuing an application session.

Existing password accounts continue to work during migration. To connect one to Google without changing its membership or order history, sign in to that existing account first, then choose Link Google account with the same verified email. Matching an email alone never transfers an existing membership. A new Google account requests membership with a name and phone number and remains pending until staff approval. Google sign-in and any Firebase-provided recovery are unavailable until a Firebase project is configured and tested. Firebase does not replace the store's order, inventory or QR database.

An active member's page creates a new QR pass every minute; passes expire after two minutes and contain an opaque random token, not personal information. Staff open the camera scanner in the admin dashboard; it requires HTTPS or localhost and camera permission. Customers can expand the pass to show a short-lived code for manual entry. Scan results are available only to authenticated admins and display the profile, linked orders, and any order whose fulfilment method is collection and status is Ready. Staff can disable a membership immediately.

Orders placed while signed in are linked automatically. Staff can link a guest or store-created order using its order number after checking the customer's details. An order already linked to another member cannot be reassigned through this flow. The local and hosted databases are separate. The hosted site is currently owner-private; customers need an accessible deployment and HTTPS for real use.

Run `node scripts/verify-members.mjs` against the isolated local preview on port 3001 to test membership and order linking. It creates synthetic local test records. The scanner and QR generator use locally bundled dependencies.

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

The suite changes only a loopback preview database and creates synthetic example.invalid orders. It verifies admin authorization, full/half stock, paid/projected profit, concurrent last-unit purchases, duplicate submissions, cancellation/refund restoration, confirmation-token privacy, tracking, and routes. Do not target a real trading site.

Browser QA covers sign-in, editable stock, manual order creation, payment recording, metrics, responsive layouts and the automatic portal.

## Hosting and source

Preserve `.openai/hosting.json` and generated migrations. Native Sites publication applies migrations before the Worker upload. Runtime credentials, dependencies, build output and local test data remain outside GitHub. The private GitHub remote is `github`: https://github.com/ashleyscomputer/astroworld-420.
