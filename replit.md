# Overview

SmartWater Pools Management System is a web-based application designed to manage and streamline pool service operations. It connects office staff, technicians, and clients, facilitating project management, maintenance scheduling, and repair services. The system includes a client portal for project status updates and communication. Its core capabilities span pool construction and renovation, recurring maintenance, and repair request handling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Technology Stack**: React with TypeScript, TailwindCSS, shadcn/ui.
- **State Management**: TanStack Query for data fetching and caching.
- **Form Handling**: React Hook Form with Zod for validation.
- **Routing**: Wouter with protected routes.
- **Authentication**: Session-based with Google OAuth and role-based access control.

## Backend
- **Technology Stack**: Node.js with Express.js and TypeScript.
- **Authentication**: Passport.js (local and Google OAuth strategies) with session-based and role-based authorization.
- **Data Storage**: Drizzle ORM for PostgreSQL (currently in-memory for development).
- **API Design**: RESTful APIs organized by feature domains.
- **Session Management**: Express sessions with security configuration.

## Database
- **ORM**: Drizzle ORM with PostgreSQL and Drizzle Kit for migrations.
- **Schema**: Relational schema covering users, organizations, projects, maintenance, technicians, clients, vendors, and communication.
- **Architecture**: Multi-tenant, organization-based data isolation with role-based permissions.

## Deployment
- **Build Process**: Vite for frontend, esbuild for server.
- **Environment**: Configured for Google Cloud Run deployment.
- **Environment Configuration**: Comprehensive environment variable handling.

## Security
- **Authentication**: Multi-strategy (username/password, Google OAuth).
- **Authorization**: Role-based access control with organization-level permissions.
- **Session Security**: Secure session configuration.
- **API Security**: Protected routes with authentication middleware.

## Business Management System
- **Purpose**: Manage expenses, time tracking, inventory, licenses, and insurance.
- **Features**: Dashboard with time-filtered metrics (Revenue, Expenses, Profit, Inventory Value, Low Stock Items, Outstanding Invoices).
- **Multi-tenant Security**: All queries and updates strictly filter by `organizationId`.

## Inventory Management
- **Purpose**: Track pool service parts, chemicals, equipment, and supplies with real-time stock levels.
- **Schema** (`inventory_items` table): id, organizationId, sku, name, description, category, quantity (numeric string), unitCost (cents), unitPrice (cents), minimumStock, reorderPoint, location, isActive, vendorId, lastRestockDate, notes, createdAt, updatedAt.
- **Features**:
  - CRUD operations via `/api/business/inventory` endpoints (GET, POST, PATCH, DELETE)
  - Search/filter by name/SKU, category, stock status (In Stock, Low Stock, Out of Stock)
  - Inline stock adjustment (+/- with custom amounts)
  - Summary cards: Total Items, Total Value, Low Stock count, Categories count
  - Edit/delete with confirmation dialogs
  - Mobile responsive (card layout on small screens, table on desktop)
- **Inventory-Work Order Integration**: When parts are added to work orders with `inventoryItemId`, stock is automatically deducted. When parts are removed or quantities changed, stock is adjusted (delta calculation). Handles inventory item swaps on updates.
- **Vendor Invoice Integration**: Process-to-Inventory creates new inventory items or updates existing ones (adds quantity, updates cost/restock date). Process-to-Expense creates expense records with amounts stored in cents.
- **Data Convention**: All monetary amounts stored in cents (integers); UI converts dollars to cents before POST, divides by 100 for display.
- **Multi-tenant Security**: All queries filter by `organizationId`.

## Standalone Inventory Page (`/inventory`)
- **Purpose**: Full-featured inventory management hub with 5 tabs at the `/inventory` route.
- **Summary Cards**: Total Items, Warehouses, Vehicles, Pending Transfers, Low Stock (via `/api/inventory/summary`).
- **Tabs**:
  - **Items Tab**: Full CRUD for inventory items via `/api/inventory/items`, search/filter, stock status badges, inline stock adjustment, uses shared `InventoryItemForm` with configurable `apiBasePath` prop.
  - **Warehouses Tab**: CRUD for warehouse locations via `/api/inventory/warehouses`. Fields: name, address, city, state, zip, phone, active status.
  - **Vehicles Tab**: CRUD for technician vehicles via `/api/inventory/technician-vehicles`. Fields: name, make, model, year, license plate, VIN, technician assignment.
  - **Transfers Tab**: Inventory transfer management via `/api/inventory/transfers`. Status workflow: pending → in_transit → completed/cancelled. Create transfers between warehouses/vehicles.
  - **Reports Tab**: Analytics dashboard with total value, category breakdown, low stock alerts, recent adjustments.
- **Database Tables**: `warehouses`, `technician_vehicles`, `inventory_transfers`, `inventory_transfer_items`, `warehouse_inventory`, `vehicle_inventory`, `inventory_adjustments` (Drizzle schemas in `shared/schema.ts`).
- **Storage Methods**: Full CRUD implementations in `server/storage.ts` for all 7 tables.
- **Routes**: All endpoints in `server/routes/inventory-routes.ts` mounted at `/api/inventory`.

## Invoicing Platform
- **Purpose**: Client invoicing with online payment processing.
- **Features**: Auto-generated invoice numbers, detailed invoices with line items, manual payment recording, Stripe integration for online payments, webhook handling.
- **Multi-tenant Security**: All queries filter by `organizationId`.

## Work Order System
- **Purpose**: Comprehensive work order management integrating with maintenance, repairs, and construction modules.
- **Core Features**:
  - Work Order Requests: Submitted by techs, office staff, or clients; can spawn multiple work orders for multi-visit jobs
  - Parts & Labor Tracking: Line items for parts (inventory integration) and labor entries with cost/price calculation
  - Time Tracking: Clock in/out with break time, automatic duration calculation
  - Team Assignment: Multiple technicians per work order with roles (Lead Tech, Technician, Helper)
  - Service Templates: Pre-configured job templates (Weekly Maintenance, Filter Clean, Leak Detection, etc.) with estimated duration, default priority, and labor rates

- **Integration Points**:
  - Maintenance: Create work orders from Bazza Routes maintenance assignments/stops, auto-populate from service templates
  - Repairs: Create work orders linked to repair jobs with issue details pre-filled
  - Projects: Create work orders linked to construction projects and phases
  - Related Entity Navigation: Work order detail shows clickable links to request, maintenance, repair, and project

- **Database Tables**:
  - `work_orders`: Core work order entity with status, priority, category
  - `work_order_requests`: Request tracking with requester type and status
  - `work_order_items`: Parts and labor line items
  - `work_order_time_entries`: Clock in/out records per technician
  - `work_order_team_members`: Team assignments with roles

- **API Endpoints**:
  - `/api/work-orders` - CRUD for work orders with filtering
  - `/api/work-orders/:id/items` - Parts/labor line items
  - `/api/work-orders/:id/time-entries` - Time tracking
  - `/api/work-orders/:id/team` - Team member management
  - `/api/work-orders/:id/clock-in|clock-out` - Convenience time tracking
  - `/api/work-order-requests` - Request management

- **Multi-tenant Security**: All queries filter by `organizationId`.

## Vendor Invoice Management System
- **Purpose**: Automated invoice processing from vendor emails with PDF parsing and routing to inventory/expenses.
- **Core Features**:
  - Email Import: Import PDF attachments from vendor emails, validates sender matches vendor email
  - PDF Parsing: Extract invoice number, PO number, dates, amounts, and line items using pdf-parse library
  - OCR Fallback: Automatic OCR using Tesseract.js for image-based PDFs when text extraction fails
    - Triggers when extracted text is minimal (< 50 chars)
    - Uses pdf-to-img for PDF-to-image conversion
    - Limits: max 5 pages, 60s timeout, 10MB file size
    - Slightly reduces confidence score for OCR results
  - Inventory Routing: Map parsed line items to inventory (match by SKU or create new items)
  - Expense Routing: Create expense records from invoice totals with vendor linkage
  - AI-Powered Extraction: OpenAI-based document field extraction with auto-population of mapped fields
  - Interactive Raw Text: Highlight/select text and tag as field types (Invoice #, PO #, Date, Total, etc.) to populate document data
  - Line Item Tagging: Select text in raw view and tag as Item Description, Quantity, Unit Price, or Item Total to build and save line items
  - Template Management: Save, browse, apply, and delete parsing templates per vendor for reusable field mapping
  - Status Tracking: Track parsing confidence, review status, and processing flags
    - "processed" status for high confidence (>= 50%)
    - "needs_review" status for low confidence (< 50%)

- **Database Tables**:
  - `email_attachments`: Store email attachment metadata and download status
  - `vendor_invoices`: Invoice records linked to vendors, emails, and attachments
  - `vendor_invoice_items`: Parsed line items with product/financial data

- **API Endpoints**:
  - `/api/vendor-invoices` - CRUD for vendor invoices
  - `/api/vendor-invoices/:id/parse-pdf` - Trigger PDF parsing
  - `/api/vendor-invoices/:id/process-to-expense` - Route to expense system
  - `/api/vendor-invoices/:id/process-to-inventory` - Route items to inventory
  - `/api/vendor-invoices/import-from-email` - Import from email attachment
  - `/api/vendor-invoices/from-vendor-emails/:vendorId` - Fetch vendor emails

- **Data Storage**: Monetary amounts stored in cents (integers) for precision; UI converts dollars to cents before POST and divides by 100 for display.
- **Multi-tenant Security**: All queries filter by `organizationId`.

# External Dependencies

## Authentication Services
- **Google OAuth 2.0**: For single sign-on.
- **Passport.js**: Authentication middleware.

## Database Services
- **PostgreSQL**: Primary database.
- **Neon Database**: Serverless PostgreSQL provider.

## Third-Party APIs
- **Google Maps API**: For location services.
- **Stripe**: Payment processing via `@stripe/stripe-js` and `@stripe/react-stripe-js`.
- **Scandit**: Barcode scanning for inventory.

## Communication Services
- **Gmail Integration**: Per-user OAuth-based Gmail integration for email sync, compose/send, and 6 types of automated notifications. Supports auto-linking to entities. Features include:
  - Dynamic OAuth callback URLs (not hardcoded)
  - Gmail scopes requested during login for seamless access
  - Token validation on connection status check (verifies actual API access, not just token existence)
  - Automatic detection and handling of "Insufficient Permission" errors (clears stale tokens, prompts reconnection)
  - "Switch Email" button allows users to connect a different Gmail account without logging out of the app
  - Separate connect-gmail flow with `prompt: consent` for fresh permissions; login flow uses `prompt: select_account` for convenience
- **RingCentral SMS Integration**: Multi-tenant OAuth-based SMS service for notifications, client messaging, and custom alerts. Includes SMS templates and auto-refresh for tokens.

## Deployment Platform
- **Google Cloud Run**: Target deployment.
- **Replit**: Development and hosting environment.