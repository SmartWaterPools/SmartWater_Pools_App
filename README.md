# SmartWater Pools - Pool Service Management Platform

A full-stack business management platform built for pool service and construction companies. It covers the operation from lead intake to recurring maintenance, routing, invoicing, and client communication.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, TailwindCSS, shadcn/ui, TanStack Query, React Hook Form + Zod |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL with Drizzle ORM and Neon serverless driver |
| Auth | Google OAuth 2.0 + session-based auth |
| Payments | Stripe |
| Mapping / Routing | Google Maps + Google Routes API |
| Email | Gmail OAuth2 / SMTP |
| SMS / Phone | RingCentral |
| AI | OpenAI via Replit AI Integrations |

## Features

### Maintenance and Service Routing
- Technician dispatch board with drag-and-drop stop management
- Route optimization via Google Routes API with fallback logic
- Workload balancing and smart assignment tools
- Recurring maintenance orders with weekly, bi-weekly, and monthly schedules
- Chemical usage and cost tracking per visit

### Project and Construction Management
- Pool construction project tracking with custom phases
- Timeline views
- Document and photo management

### Financial Tools
- Estimates and invoices with Stripe payment support
- Expense and time tracking
- Inventory management across warehouses and technician vehicles
- Vendor and purchase order management

### Client Portal and Communications
- Customer portal for service history, project progress, and invoice payment
- Gmail and SMTP email integration
- RingCentral SMS integration
- Centralized message inbox

## Local Setup

### Prerequisites
- Node 20 to match Replit's pinned runtime
- PostgreSQL database, local or hosted

### Steps

```bash
git clone <repo-url>
cd SmartWater_Pools_App
npm install
cp .env.example .env
# Fill in at minimum: DATABASE_URL, SESSION_SECRET, APP_URL
npm run db:push
npm run dev
```

The app runs at `http://localhost:5000`.

### Required env vars

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random string for session signing |
| `APP_URL` | Base app URL, `http://localhost:5000` locally |

See `.env.example` for the full list.

## Replit Setup

1. Open the `SmartWater_Pools_App` repo in Replit.
2. Add the required Secrets using the same keys as `.env.example`.
3. Set `APP_URL` to your Replit app URL, not localhost.
4. If the database is empty, run `npm run db:push`.
5. Use the workflow command `npm run dev` from `.replit`.

If Google OAuth is enabled, add both callback URLs in Google Cloud Console:
- `http://localhost:5000/api/auth/google/callback`
- `https://your-replit-domain.replit.app/api/auth/google/callback`

## Verification

Use this command as the handoff gate before committing:

```bash
npm run build
```

## Contributor Notes

- `npm run dev` and `npm run start` are configured to work on Windows and Unix-like shells.
- The app currently requires a PostgreSQL database and will not boot without `DATABASE_URL`.
- Google OAuth can use `GOOGLE_CALLBACK_URL` or derive the callback from `APP_URL`.
- `npm run build` currently succeeds.
- `npm run check` still reports broader TypeScript drift that should be cleaned up separately.

## Handoff Between Tools

See `REPLIT_HANDOFF.md` for the standard context-setting prompt to use when starting a new AI session.

Rule: always commit and push before switching between local Codex and Replit, and never let two tools edit the same code at the same time.
