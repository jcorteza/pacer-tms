# Pacer TMS: build the Plan-page APIs (excluding 3rd-party integrations)

## Context
The Plan page (Notion: Pacer TMS Revamp → Plan) lists the REST APIs for the backend. The Drizzle schema, migration and DB tests already exist. Approved tests are already written (unit: `src/common/pagination.spec.ts`, `src/users/password.spec.ts`; e2e: `test/resources.e2e-spec.ts`, `sessions`, `users`). This plan covers the implementation that turns them green.

Decisions made with the user:
- ORS / Open-Meteo / FMCSA / Shippo: later pass.
- Page size 20 for clients and carriers, 50 for everything else.
- Soft delete (`deleted_at`) everywhere; sessions are a hard delete.
- `status_change_log` has its own CRUD, plus automatic writes from a service layer.
- Users API yes, company API no.
- Acting user from `x-session-id` header; reads AND writes on the 13 resources are protected. `/users` and `/sessions` stay open.
- Soft-deleted rows keep unique codes and emails reserved (no index changes).
- Roles: the seven from the Plan page, without the parenthesized short names, **standardized to Title Case** and defined once (see "Roles constant" below).

## Roles constant
New `src/users/roles.ts`, the single source of truth:
```ts
export const ROLES = [
  'Operations Management',
  'Warehouse Management',
  'Warehouse',
  'Dispatcher',
  'Customer Service',
  'Accounting Operations',
  'Accounting Management',
] as const;
export type Role = (typeof ROLES)[number];
```
- Used by the users Zod schemas (`z.enum(ROLES)`), the roles endpoints, and `users.roles` in `src/db/schema/users.ts` (`.$type<Role[]>()`, type-only, so no migration change).
- Existing tests only use `Warehouse` and `Dispatcher`, which are unchanged. I'll import `ROLES` in the new tests where they need a valid or second role instead of repeating string literals.
- Casing changes from the Plan page (`customer service`, `accounting operations`) are deliberate; no DB check constraint on role values is added now.

## Build order (stop and check at each step)
1. **Helpers, unit tests green.**
   - `src/common/pagination.ts`: `pageWindow(page, pageSize)`, `buildPage(rows, {total, page, pageSize})`.
   - `src/users/password.ts`: scrypt with a random salt and `timingSafeEqual` (`node:crypto`, nothing to install).
2. **Schema and migration.**
   - Add a shared `deletedAt` column to `src/db/schema/columns.ts` and use it on all 13 tables (`status_change_log` included; not `sessions`, `shipment_handoffs`).
   - `drizzle-kit generate` only. Do not push or migrate the dev DB; `src/db/test/global-setup.ts` applies migrations to `pacer_test`.
   - Run `pnpm test:db` right away: the existing 50 tests must still pass.
3. **Dependencies and app wiring.**
   - `pnpm add zod` (not installed; drizzle-orm/zod needs `^3.25 || ^4`).
   - `src/configure-app.ts`, called from both `main.ts` and `test/support/app.ts`: global `StandardSchemaValidationPipe`, and an exception filter that maps Postgres errors (`e.cause?.code ?? e.code`) to HTTP (`23505` → 409, `23503` → 400).
4. **Auth guard** (`src/auth/session.guard.ts`), applied per controller, not `APP_GUARD`.
   - Header must be a UUID (otherwise 401, not a Postgres 500), the session must have `expires_at > now()` and a non-null `user_id`.
   - Exposes the acting user to handlers through a `CurrentUser` param decorator.
5. **Generic CRUD**, proved with clients only first (`pnpm test:e2e -t '/clients'`).
   - `src/common/crud/`: a service base and a controller factory taking `{ path, entityType, table, idType, pageSize, insertSchema, updateSchema }`.
   - Reads filter `deleted_at IS NULL` in both the row query and the count query, `ORDER BY id`.
   - Writes run in one transaction with the log write through `src/status-change-log/status-change-log.service.ts`. `status-change-log` is configured not to log itself.
   - `ParseIntPipe` or `ParseUUIDPipe` per resource; `page` query validated (`>= 1`, default 1).
   - Validation schemas from `drizzle-orm/zod` (`createInsertSchema`/`createUpdateSchema`): coerce dates only (read the `coerce` option shape in `schema.types.d.ts` first), omit `id`, `deletedAt`, `createdAt` and the log's `at`, and handle an empty PATCH explicitly (Drizzle throws on an empty `set`).
6. **Other 12 resources** by adding one config each (orders, shipments, carriers, carrier-invoices, invoices, documents, items, shipping-addresses, warehouse-codes, building-codes, item-locations, status-change-log). Ids: integer except clients and shipping-addresses (uuid). Each module is registered in `AppModule`.
7. **Users and sessions.**
   - Roles come from `src/users/roles.ts` (create the file at step 1 alongside the other helpers).
   - Users: create (hash only, 409 on duplicate email), `PATCH` as `z.strictObject` (`password` → 400), `POST :id/password` (403 on wrong current), `PATCH :id/settings` (shallow merge), `POST :id/roles` (idempotent), `DELETE :id/roles/:role` (409 on the last role). `passwordHash` is stripped from every response. Roles enum in one shared constant.
   - Sessions: `POST` verifies email and password (401 for either failure) and returns `{ id, userId, expiresAt }`; `DELETE :id` is a hard delete (404 if unknown).
8. **Finish:** `pnpm build` and `pnpm lint` (Vitest does not type-check), then the full `pnpm test`.

## Critical files
- New: `src/users/roles.ts`, `src/common/{pagination,crud/*}`, `src/auth/*`, `src/users/*`, `src/sessions/*`, `src/status-change-log/*`, one folder per resource, `src/configure-app.ts`
- Edited: `src/db/schema/*.ts` (+ generated migration under `drizzle/`), `src/app.module.ts`, `src/main.ts`, `package.json` (zod)

## Verification
`pnpm test` (unit → DB → e2e) fully green; `pnpm build` and `pnpm lint` clean; report the exact role strings and the 409/403 choices back to the user.
