# SmartWater Pools – Pool Service Management Platform

A full-stack business management platform built for pool service and construction companies. It covers the entire operation from lead intake to recurring maintenance, routing, invoicing, and client communication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, TailwindCSS, shadcn/ui, TanStack Query, React Hook Form + Zod |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| Auth | Google OAuth 2.0 + session-based auth |
| Payments | Stripe |
| Mapping / Routing | Google Maps + Google Routes API |
| Email | Gmail OAuth2 / SMTP |
| SMS / Phone | RingCentral |
| AI | OpenAI via Replit AI Integrations |

---

## Features

### Maintenance & Service Routing
- Technician dispatch board with drag-and-drop stop management
- Route optimisation via Google Routes API (nearest-neighbour fallback)
- Auto-optimise toggle: routes re-optimise automatically when stops change
- Workload health indicators per technician (Balanced / Light / Heavy)
- Smart Assign: distributes unassigned jobs geographically across technicians with one-click undo
- Auto-Rebalance: detects and corrects workload imbalances across the day's routes
- Recurring maintenance orders with weekly / bi-weekly / monthly schedules
- Chemical usage and cost tracking per visit

### Project & Construction Management
- Pool construction project tracking with custom phases
- Gantt-style timeline views
- Document and photo management (blueprints, permits, field photos)

### Financial Tools
- Estimates and invoices with electronic signature and Stripe payment
- Expense and time tracking
- Inventory management across warehouses and technician vehicles (barcode scanning, low-stock alerts)
- Vendor and purchase order management

### Client Portal
- Customers can view service history, project progress, and pay invoices
- Self-contained branded portal

### Communications
- Gmail and SMTP email integration
- RingCentral SMS integration
- Centralised message inbox

---

## Local Setup

### Prerequisites
- Node 20 (matches Replit's pinned version)
- PostgreSQL database (local or hosted, e.g. Neon)

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd SmartWater_Pools_App

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in at minimum: DATABASE_URL, SESSION_SECRET, APP_URL

# 4. Push the database schema
npm run db:push

# 5. Start the dev server
npm run dev
```

The app runs at `http://localhost:5000`.

### Required env vars (minimum to run locally)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random string for session signing |
| `APP_URL` | `http://localhost:5000` |

See `.env.example` for the full list.

---

## Replit Setup

1. Open the `SmartWater_Pools_App` repo in Replit.
2. Add the required Secrets (Settings → Secrets). Use the same keys as `.env.example`. Set `APP_URL` to your Replit app URL (not localhost).
3. If the database is empty, open the Shell and run `npm run db:push`.
4. The project uses the workflow command `npm run dev` (defined in `.replit`).

> If Google OAuth is enabled, add your Replit callback URL to the allowed redirect URIs in Google Cloud Console:
> `https://your-replit-domain.replit.app/api/auth/google/callback`

---

## Verification

Both locally and in Replit, use this command to verify the build is clean before committing:

```bash
npm run build
```

---

## Handoff Between Tools

See `REPLIT_HANDOFF.md` for the standard context-setting prompt to paste when starting a new AI session (Replit Agent, Codex, etc.).

**Rule:** Always commit and push before switching between local and Replit. Never let two tools edit the same code simultaneously.
