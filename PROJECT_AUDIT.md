# SmartWater Pools App Audit

Audit date: 2026-03-08

## Verified status

- `npm install` succeeds on Windows.
- `npm run build` succeeds.
- `npm run dev` and `npm run start` no longer fail immediately on Windows shell syntax.
- Local runtime still requires `DATABASE_URL` and `SESSION_SECRET`.

## Current blockers

1. TypeScript drift is widespread.
   - `npm run check` reports a large number of type errors across client business components, inventory flows, maintenance views, Stripe code, Fleetmatics code, and storage interfaces.
2. The repo documentation was out of date.
   - The previous README still described in-memory storage even though the active server requires PostgreSQL.
3. Environment setup was undocumented in a usable way.
   - There was no `.env.example`, and `.env` files were not ignored by git.
4. Google OAuth callback handling was hard-coded to a Replit URL.
   - That blocks clean deployment on your own domain.

## Changes made in this pass

- Made `npm run dev` and `npm run start` cross-platform with `cross-env`.
- Removed the `typeRoots` override that was breaking `vite/client` resolution.
- Added `.env.example`.
- Updated `.gitignore` to keep local secrets out of git while preserving `.env.example`.
- Updated `README.md` so local setup matches the actual app.
- Made Google OAuth callback resolution configurable through `GOOGLE_CALLBACK_URL` or `APP_URL`.

## Recommended next engineering sprint

1. Stabilize the type layer around shared schema and storage interfaces.
2. Choose one source of truth for auth and deployment configuration.
3. Add a database bootstrap path for local development.
4. Reduce dead or duplicate files such as `.new`, `.clean`, `.bak`, and other alternate versions once the active implementation is confirmed.
5. Add smoke tests for login, organization selection, projects, maintenance, invoices, and inventory.

## Suggested order of attack

1. Auth and session flow
2. Shared schema and `IStorage` contract
3. Inventory and maintenance modules
4. Stripe and external integrations
5. Type-check cleanup and CI gate
