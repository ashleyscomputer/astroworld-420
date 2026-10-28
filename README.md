# Astroworld 420

A dark, responsive smoothie storefront with a floating-island portal reveal, scroll-driven 3D sculpture, procedural abstract artwork, product tilt and neon glow. Built with the Next.js App Router API on Vinext for Cloudflare Workers, React, Tailwind CSS and Framer Motion. No admin interface.

## Run locally

Requires Node 22.13+.

```powershell
npm ci
npm run dev
```

For the built preview and its local database:

```powershell
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_happy_steve_rogers.sql
npm start -- --port 5180
```

Apply the migration once per fresh local database. Stop the built preview before rebuilding on Windows, because Wrangler holds build files open. Local D1 records are stored in ignored `.wrangler/`; production D1 is provisioned by Sites. Local test data is not published.

## Edit the store

- `lib/catalog.ts`: the single product and settings source. API routes calculate authoritative prices from this file. All eight full prices are R30, R70, R70, R100, R130, R140, R150 and R160 in the supplied product order. A half portion costs 50% exactly.
- `app/globals.css`: colour, glow, spacing, type and responsive design tokens.
- `scripts/make-assets.mjs`: regenerates abstract SVG sculpture placeholders and downloads the user-supplied island clip/poster and self-hosted variable fonts. Product artwork is deliberately illustrative, not a representation of recipes.
- `app/storefront.tsx`: header, hero, collection, cards, product detail, cart, newsletter and footer.
- `app/checkout-ui.tsx`: guest checkout, confirmation and tracking.
- `app/content-ui.tsx`: about, FAQs, contact and preview policy pages.
- `app/reviews.tsx`: explicitly labelled sample carousel copy. Replace only with verified customer feedback.
- `db/schema.ts`: durable orders, contact messages and newsletter signups. Append migrations for future changes; do not rewrite applied migrations.

## Current capabilities

Product pages, quick view, full/half selection, quantity controls, search, price filter, sorting, persistent browser cart, drawer and full cart, discount entry, four-step checkout, all nine SA provinces, courier/collection estimates, server price/stock validation, duplicate-submit protection, saved test orders, private confirmation links, order-number/email tracking, contact and consented signup storage, printable confirmation, supporting pages, metadata, favicon, sitemap, reduced-motion styling and accessible native dialogs.

The preview courier rate is R45. Courier is free at R300 after discounts; collection is free. `ORBIT10` is a 10% preview discount. Product availability is a demonstration value, not inventory reservation. Cart data is browser-local; orders and form submissions use D1.

## Preview versus real trading

`settings.demoMode` is true. Orders are explicitly marked preview. No cards are collected, payments are processed, email is sent, inventory is reserved or fulfilment scheduled. Forms explain this. There are no fabricated contact details, bank accounts, social profiles, collection addresses, ingredients, volumes or customer reviews.

Payment, COD and EFT fields in settings are reserved integration switches, not completed payment adapters. Disabling demo mode deliberately refuses orders until a real payment adapter exists. Before accepting real orders, implement and test the selected gateway's server checkout and signed webhooks, inventory reservations, email delivery/outbox and operational fulfilment. Keep all gateway, webhook and email secrets in server environment variables only, never in `lib/catalog.ts` or client code. Then add verified business details, recipe/volume/allergen information, delivery areas and cold-chain procedures, collection location, final policies and privacy contact/retention process. No live trading is enabled by merely changing a boolean.

`ageGate` is false for the smoothie category; it can be enabled for a future appropriate category. WhatsApp appears only when a real number is configured, so there is no broken placeholder contact link. Payment and social icons are not presented as available services without an integration.

## Validation

```powershell
npx tsc --noEmit
node scripts/verify-store.mjs
```

The API check runs against `http://127.0.0.1:5180` by default, checks routes, every full/half price, discounts, delivery, invalid quantities, stock bounds, server total tampering, order persistence/idempotency, confirmation-token access, tracking, form validation and 404s. It writes synthetic records using `example.invalid` addresses to the selected preview database. Do not target a real trading site. Set `TEST_BASE_URL` only to another test deployment.

Desktop and mobile browser checks cover the portal, quick view, half portion, cart, native page navigation, guest checkout, confirmation and tracking. Navigation uses native document links, retaining the bag through localStorage.

## Hosting

`.openai/hosting.json` retains this site's project identity and D1 binding. The Sites workflow packages the exact pushed source and build for private publication. Preserve the hosting manifest and generated schema migrations; credentials and local runtime state remain ignored.

## Supplied brand artwork

`public/astroworld-420-brand.jpg` is the user-supplied Astroworld 420 image. It appears in the scrolling 3D brand panel on Home and Our world, and in Open Graph previews. Header, hero, footer and metadata use the Astroworld 420 name. The image is used as supplied, with layout effects applied in CSS.
