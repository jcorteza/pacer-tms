# Plan: Implement the databases (Drizzle schema) from the Notion "Pacer TMS Revamp" Plan

## Context
Roadmap step 9.1 ("coding in phases → databases"). `backend/src/db/schema.ts` is currently an empty import line; Drizzle (`drizzle-orm@1.0.0-rc.5`, `drizzle-kit`) and `drizzle.config.ts` are already set up. Goal: define every table from the Notion Plan page, as revised by the Decision Log (#26 one item per shipment, #27 insurance fields, #28 carrier invoices separate, #29 nullable doc FKs, #30 location codes, #32 session→user), generate the migration, and prove the constraints with integration tests. Company is NOT implemented (modeling only); user is a **minimal stub** so FKs work. API endpoints, auth logic and seeding are out of scope (later phases).

## Decisions (agreed)
- User table: **fully implemented** (no stub). Columns: `id` uuid, `first_name`, `last_name`, `email` (unique), `password_hash`, `roles` text[] (Plan page's 7: OpsMan, WareMan, Warehouse, Dispatcher, customer service, accounting operations, AccMan; not null, **no default, check `cardinality(roles) >= 1`** so a user always has at least one role), `settings` jsonb (default `{}`), created_at. No `company_id` (single-company app; company not implemented). Password hashing/auth logic is the auth phase.
- Location codes (warehouse/building/location): `varchar(4)`, **2–4 chars** enforced by a check constraint, unique.
- Primary keys: integer identity by default; **uuid** for `session`, `client`, `shipping_address`, `user`. `shipment.tracking_code` is a uuid column (unique, default random).
- Status columns and `container`: plain `text` (validated in API layer later).
- Tests: Vitest integration tests against real Postgres.

## Schema (files under `backend/src/db/schema/`, re-exported from `schema.ts` so `drizzle.config.ts` is unchanged)
| File | Tables |
|---|---|
| `users.ts` | `user` (full, see Decisions), `session` (id uuid, `expires_at` timestamptz default now()+12h, `user_id` nullable FK) |
| `clients.ts` | `client` (billing address, billing/shipping contact as jsonb `{name,email,phone}`, notes), `shipping_address` (client FK, nickname?, address, city, state, zip) |
| `warehouses.ts` | `warehouse_code` (code varchar(4), 2–4 chars, unique, manager `user_id` FK, phone, address…), `building_code` (char(4) unique, warehouse FK, `building` char, description?), `item_location` (char(4) unique, building FK, `item_id` nullable **unique** = one location per item, description?) |
| `items.ts` | `item` (client FK, sku, stock int, name, description, weight_lbs, length/width/height in, cost) |
| `carriers.ts` | `carrier` (contact fields, `usdot_number?`, `mc_number?`, `service_levels` text[], notes), `carrier_invoice` (received_at, deadline, carrier FK, invoice_number, amount, status, url, notes), `carrier_invoice_shipment` (join: replaces "shipments list") |
| `orders.ts` | `order` (po, created_at, closed_at?, client FK, status, requested_delivery_at, estimated_delivery_at, notes), `shipment` (**adds `order_id` FK**, tracking_code, client FK, item FK, item_count, delivery shipping_address FK, container, weight, volume, status, contents text (#10), estimated_delivery_at, sent_at?, delivered_at?, `handoffs` jsonb list, carrier FK?, carrier_tracking_number?, service_level, payment_terms, declared_value, insurance_coverage?, notes) |
| `finance.ts` | `invoice` (created_at, sent_at?, paid_at?, client FK, order FK, amount, status, notes) |
| `documents.ts` | `document` (type, metadata jsonb, nullable client/order/shipment/carrier FKs, url, status, notes) |
| `audit.ts` | `status_change_log` (entity_type, entity_id, action, description, `user_id` FK, at) — append-only |

Notes: client's "orders/invoices/shipping addresses lists" and order's "shipments object" are derived via FKs (no duplicate columns). Money = `numeric(12,2)`; all timestamps `timestamptz`.

Also fix `backend/src/app.module.ts`: it stacks two `@Module` decorators, so the Drizzle import never reaches `AppController`. Merge into one `@Module` with `DrizzleModule.forRoot` plus controller/provider.

## Testing plan (written and approved first, per CLAUDE.md)
Location: everything test-related lives together in `backend/src/db/test/` beside the schema it covers (`vitest.config.ts`, `global-setup.ts`, `test-database-url.ts`, `helpers.ts`, `*.spec.ts`); nothing new at the `backend/` root. Run via a `test:db` script; the default `vitest.config.ts` excludes this folder and `tsconfig.build.json` excludes it from `nest build`. Global setup creates a throwaway DB (`pacer_test`) on the compose Postgres, applies generated migrations with drizzle's migrator, and drops it afterwards. Given/when/then cases:
- **Session**: default expiry ≈ 12h; `user_id` may be null; deleting a user is restricted/nulls per chosen FK action.
- **User**: email unique (duplicate rejected); empty or missing roles rejected; settings default `{}`; first/last name and password_hash required.
- **Codes**: warehouse/building/location `code` rejects duplicates, 1-char and 5-char values, accepts 2–4 chars; `item_location.item_id` unique (item can't have two locations); a location may have no item.
- **Shipment**: requires `order_id`, `item_id`, shipping address; `tracking_code` auto-generated and unique; carrier fields and `insurance_coverage` nullable; handoffs round-trip as jsonb.
- **Document**: client/order/shipment/carrier all nullable (carrier-insurance doc with only carrier set inserts OK).
- **Carrier invoice**: one invoice links to many shipments via the join table; duplicate (invoice, shipment) rejected.
- **Cascade/restrict**: cannot delete a client with orders; FK to missing rows rejected.
- **Status log**: accepts insert for any entity_type; requires user.
Tests are written and shown to you before any schema code.

## Implementation order
1. Share/approve this plan → write failing tests + test harness (approval gate).
2. Implement schema files and re-export in `schema.ts`.
3. `drizzle-kit generate` (drizzle skill, `--output json`) → review SQL in `backend/drizzle/`; commit migration.
4. Fix `app.module.ts`; confirm app boots.

## Verification
- `pnpm --filter backend test:db` green; `pnpm lint` and `nest build` pass.
- `drizzle-kit generate` produces no further diff afterwards.
- Apply migration to the compose dev DB and inspect tables with `\d`.
- Not yet verified: compose Postgres service name/credentials (read access to `compose.yaml` and `.env` was denied this session); confirm `DATABASE_URL` for a test DB before building the harness.
