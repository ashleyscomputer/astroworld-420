# ERPNext connector

ERPNext runs as its own Python/Frappe service with database and background services. It cannot run inside this storefront's Cloudflare Worker. No ERPNext instance was supplied, and Docker is unavailable in the current workspace, so the ERP service has not been launched or live-tested.

## Evaluate locally

With Docker Desktop's Linux engine, Git and Compose v2 installed:

```powershell
./scripts/setup-erpnext.ps1
```

The helper fetches the official `frappe/frappe_docker` repository at commit `2c2980af1d3dcd2962a3f562184db652f63643bb`, preserves its licensing in that checkout, and launches its disposable `pwd.yml` evaluation stack bound to `127.0.0.1:8080`. No ERPNext source is vendored into this project. The runtime checkout, container configuration and data stay outside tracked source. ERPNext's evaluation login is `Administrator` / `admin`; the storefront uses the requested `admin` / `admin` separately.

The evaluation stack is disposable, cannot install custom apps, and is not a production configuration. Use the official production/Frappe Cloud guidance for a hosted instance. A loopback instance on your PC cannot be reached by a published Cloudflare Worker.

## Connect a hosted instance

1. Set up an ERPNext site and a company whose accounting currency is ZAR. Create its warehouse, product item group, customer group and territory.
2. Create a dedicated ERP integration user. Generate an API key and secret in User → Settings → API Access. Grant only required permissions for UOM, Item, Customer, Sales Order and Stock Reconciliation.
3. Set `ERP_URL`, `ERP_API_KEY`, `ERP_API_SECRET`, `ERP_COMPANY`, `ERP_WAREHOUSE`, `ERP_ITEM_GROUP`, `ERP_CUSTOMER_GROUP` and `ERP_TERRITORY` as server runtime variables. Keep keys/secret marked secret. Use an HTTPS base URL. Redeploy the storefront after setting hosted values. Local values go in ignored `.dev.vars`; see `config/server.env.example`.
4. Sign in to `/admin`, open ERPNext, and Test connection. Export the next 3 changes. Repeat until the queue is clear. Failed jobs retain a reason and can be retried. Jobs are not discarded if the ERP service is unavailable.
5. Review and submit the generated drafts in ERPNext. This connector deliberately does not submit accounting, invoice, payment or stock-ledger transactions automatically.

## Mapping and behavior

| Store record | ERPNext document | Behavior |
| --- | --- | --- |
| Customer/admin order | Sales Order draft | Local order ID in `po_no`; state/payment/source/contact/address in remarks; retries update an existing draft |
| Customer identity | Customer | Name and email identify the integration customer |
| Product | Item | `AW-<product-id>`, with a fractional `Astroworld Portion` UOM |
| Half portion | Sales Order Item | Quantity 0.5 at the full-portion rate; full pricing and discounts remain consistent |
| Courier | Non-stock delivery Item | Delivery fee added as its own line |
| Available inventory | Stock Reconciliation draft | Current available quantity and entered positive unit cost; review before posting |
| Payment status | Sales Order remarks | Manual record only; no Payment Entry is created |
| Cancel/refund | Local status and restored local availability | Export updates draft remarks; already submitted ERP documents require manual review |

The storefront's D1 inventory is authoritative for customer availability and reservations. ERPNext draft reconciliation represents available stock, which includes local reservations; it is not a live stock-ledger integration or two-way ERPNext stock import. ERPNext changes do not silently overwrite stock in the store. Product cost is snapshotted when an order is accepted; historical profit does not change when a later cost is entered.

The outbox uses a per-instance lock, persistent job versions, sanitized failures and idempotent Sales Order lookups. The admin exports queued records explicitly; no scheduler or paid external service has been created.

## Validation and sources

`node --experimental-strip-types scripts/verify-erp-contract.mjs` verifies resource/authentication contracts against an in-memory test ERP, including fractional units, totals, repeated exports, valuation and failures. This is contract verification, not a test against a live ERPNext installation.

- [ERPNext repository and installation](https://github.com/frappe/erpnext)
- [Frappe REST authentication and resource API](https://docs.frappe.io/framework/user/en/api/rest)
- [Sales Order documentation](https://docs.frappe.io/erpnext/user/manual/en/sales-order)
- [Stock Reconciliation documentation](https://docs.frappe.io/erpnext/user/manual/en/stock-reconciliation)
- [Official Docker evaluation configuration](https://github.com/frappe/frappe_docker/blob/2c2980af1d3dcd2962a3f562184db652f63643bb/pwd.yml)
