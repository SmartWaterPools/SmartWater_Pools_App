# Overview

SmartWater Pools Management System is a web-based application designed to manage and streamline pool service operations. It connects office staff, technicians, and clients, facilitating project management, maintenance scheduling, and repair services. The system includes a client portal for project status updates and communication, and aims to be a comprehensive solution for pool construction, renovation, recurring maintenance, and repair services.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Technology Stack**: React with TypeScript, TailwindCSS, shadcn/ui.
- **State Management**: TanStack Query for data fetching and caching.
- **Form Handling**: React Hook Form with Zod for validation.
- **Routing**: Wouter with protected routes.
- **Authentication**: Session-based with Google OAuth and role-based access control.
- **UI/UX**: Professional dashboard views with color-coded gauges for reports, mobile responsiveness with adaptive layouts.

## Backend
- **Technology Stack**: Node.js with Express.js and TypeScript.
- **Authentication**: Passport.js (local and Google OAuth strategies) with session-based and role-based authorization.
- **Data Storage**: Drizzle ORM for PostgreSQL.
- **API Design**: RESTful APIs organized by feature domains.
- **Security**: Role-based access control, secure session configuration, protected routes.

## Database
- **ORM**: Drizzle ORM with PostgreSQL and Drizzle Kit for migrations.
- **Schema**: Relational schema for users, organizations, projects, inventory, work orders, maintenance orders, vendor invoices, and service reports.
- **Architecture**: Multi-tenant, organization-based data isolation with role-based permissions. All monetary amounts are stored in cents.
- **Row-Level Security (RLS)**: Enabled on all 36 tables with `organization_id` column. Policies use `app.current_organization_id` session variable. Use `withTenantScope(orgId, fn)` from `server/db.ts` to activate RLS within a transaction.

## Multi-Tenancy (Feb 2026)
- All user/org routes enforce tenant scoping: non-system_admin users can only access their own organization's data.
- Storage methods (`getWorkOrders`, `getMaintenanceOrders`, `getServiceTemplates`, etc.) require `organizationId` as a mandatory parameter - no unscoped fallbacks.
- `getUsersByRoleAndOrganization(role, orgId)` replaces broad `getUsersByRole()` calls for tenant-scoped role queries.
- RLS policies on all tenant tables act as database-level defense-in-depth.
- `system_admin` role bypasses all tenant restrictions for cross-org administration.
- **SmartWater Admin bypass**: Users with admin-level roles (`admin`, `system_admin`, `org_admin`) AND `@smartwaterpools.com` email can manage all organizations and users cross-org. This is enforced in `server/routes/user-org-routes.ts` via `isSmartWaterAdmin` checks on all CRUD operations.
- **Centralized tenant middleware**: `injectTenantContext` in `server/auth.ts` runs on every request, setting `req.organizationId` and `req.isCrossOrgAdmin`. Applied in `server/index.ts` after passport session.
- **RLS enforcement**: `projects` and `repairs` tables now have `organization_id` columns (backfilled from client data) and `tenant_isolation_policy` RLS policies.
- **Unscoped storage methods to audit**: `getRepairs()`, `getTechnicians()`, `getProjects()` still load all records then filter in-app. Routes already filter by org but should be refactored to use org-scoped DB queries for efficiency and safety. RLS policies serve as defense-in-depth.

## Admin Dashboard (Feb 2026)
- **Access Control**: Admin dashboard at `/admin` restricted to users with admin roles AND `@smartwaterpools.com` email domain.
- **Tabs**: Users, Organizations, Permissions.
- **Roles**: `system_admin`, `org_admin`, `admin`, `manager`, `office_staff`, `technician`, `client`, `vendor`.
- **Permissions Management**: Database-backed permissions at `organization_permissions` table. Frontend at `client/src/components/settings/PermissionsManagement.tsx` loads/saves via `GET/PUT /api/organizations/:orgId/permissions`. Each org can customize role permissions; defaults defined in component. Backend permissions module at `server/permissions.ts` provides `hasPermission()`, `checkPermission()` middleware, and `requirePermission()` for route protection.

## Deployment
- **Build Process**: Vite for frontend, esbuild for server.
- **Environment**: Configured for Google Cloud Run deployment.

## Core Feature Specifications

### Business Management
- **Purpose**: Manage expenses, time tracking, inventory, licenses, and insurance.
- **Key Metrics**: Dashboard with revenue, expenses, profit, inventory value, low stock items, outstanding invoices.

### Inventory Management
- **Purpose**: Track pool service parts, chemicals, equipment, and supplies with real-time stock levels.
- **Features**: CRUD operations, search/filter, inline stock adjustment, integration with work orders for automatic deduction, integration with vendor invoices for stock updates.
- **Standalone Page**: Full-featured `/inventory` hub with tabs for Items, Warehouses, Vehicles, Transfers, and Reports. Includes comprehensive CRUD for all related entities.
- **Item Photos**: Inventory items support photo uploads (`imageUrl` column). The `InventoryItemForm` has "Take Photo" (camera capture) and "Choose File" buttons. Photos uploaded via `POST /api/inventory/upload-photo` (multer, stored in `/uploads/inventory-photos/`). Thumbnails displayed in ItemsTab (both desktop table and mobile card views).
- **Mobile Navigation**: Inventory link is present in the mobile sidebar navigation.
- **Barcode Scanner Fallback**: The `BarcodeScanner` component includes a "Take Photo of Item" button as a fallback when barcode scanning doesn't work. The photo is uploaded and optionally passed via `onPhotoCapture` callback.

### Billing Platform (Invoices & Estimates)
- **Purpose**: Client invoicing and estimates with online payment processing.
- **Navigation**: "Billing" section in sidebar with expandable sub-items for Invoices and Estimates.
- **Invoicing Features**: Auto-generated invoice numbers, detailed line items, manual payment recording, Stripe integration, webhook handling, inventory deduction on finalization.
- **Estimates Features**: Auto-generated estimate numbers, detailed line items, deposit support (fixed or percentage), accept/decline workflow, convert-to-invoice functionality, inventory deduction on acceptance.
- **Tax Templates**: Saveable tax templates in Settings (name, rate, state/region), auto-imported based on client billing address when creating invoices/estimates.
- **Inventory Integration**: When invoices are sent or estimates are accepted, inventory items referenced in line items are automatically deducted with full audit trail in inventory adjustments.
- **Client Billing Address**: Clients have billing address fields (address, city, state, zip) used for tax template auto-import.

### Work Order & Maintenance Order System
- **Purpose**: Comprehensive order management for one-time jobs (Work Orders) and recurring schedules (Maintenance Orders).
- **Features**: Work order requests, parts & labor tracking (with inventory integration), time tracking, team assignment, service templates, recurrence scheduling, route planning.
- **Integration**: Maintenance orders generate work orders, repair jobs and projects link to work orders, inventory deductions from global and vehicle stock.
- **Frontend Pages**: Maintenance hub (Calendar/Map/Routes views), Dispatch Board (daily technician route operations), Work Orders page, interactive Maintenance Map with multiple filter views, Projects, Repairs, Technicians, and Routes Tab for drag-and-drop route management. Maintenance Routes and Dispatch Board share the same underlying data (bazzaRoutes/bazzaRouteStops) with cross-navigation links. Route optimization available via "Optimize Route" button (nearest-neighbor algorithm using haversine distance).
- **Technician Guided Workflow** (Feb 2026): Step-by-step maintenance checklist wizard (`TechnicianWorkflow` component) activated from WorkOrderDetail. Features include:
  - Progress tracking with completion percentage and step dots navigation
  - Per-step notes persistence
  - Pre-start confirmation and completion flow with duration tracking
  - Quick-access buttons: Pool Wizard (client pool info), Barcode Scanner (inventory lookup), LSI Calculator (water chemistry)
  - Photo/video capture and gallery (`WorkOrderPhotos` component) - upload via multer to `/uploads/work-order-photos/`
  - Chemical usage recording (`WorkOrderChemicals` component) - pulls prices from Chemical Pricing table, persists to `chemicalsApplied` JSON field on work order, auto-updates `materialsCost`
- **Default Service Templates**: 8 seeded templates (Weekly Pool Service, Monthly Chemical Balance, Filter Clean, Pool Opening, Pool Closing, Equipment Inspection, Green Pool Recovery, Leak Detection) with detailed step-by-step checklist items.

### Chemical Pricing Management (Feb 2026)
- **Purpose**: Organization-level chemical pricing for cost tracking on service visits.
- **Schema**: `chemicalPrices` table (organizationId, chemicalType, name, unit, unitCostCents, inventoryItemId, isActive).
- **Frontend**: `/chemical-pricing` management page with CRUD operations, linked from sidebar.
- **API**: `GET/POST/PATCH/DELETE /api/chemical-prices` routes.
- **Chemical Types**: liquid_chlorine, tablets, muriatic_acid, soda_ash, sodium_bicarbonate, calcium_chloride, stabilizer, algaecide, salt, phosphate_remover, other.
- **Integration**: WorkOrderChemicals component auto-fills unit costs from pricing table when technicians record chemical usage.

### Pool Information Wizard (Feb 2026)
- **Purpose**: Multi-step wizard for collecting and managing detailed pool information per client.
- **Schema**: `pool_equipment` table (clientId, name, type, brand, model, serialNumber, installDate, lastServiceDate, notes, status, imageUrl), `pool_images` table (clientId, imageUrl, caption, category, uploadDate, technicianId).
- **Custom Questions**: `pool_wizard_custom_questions` table for org-level custom fields (label, fieldType, options, isRequired, displayOrder, isActive). `pool_wizard_custom_responses` table links client responses to custom questions.
- **Frontend**: Pool wizard at `/clients/:id/pool-wizard` with 4 tabs: Pool Information, Equipment (with photo upload), Images, Custom Questions. Redirect route from legacy `/pool-wizard/:id` path.
- **Settings**: "Pool Wizard" tab in Settings page (`PoolWizardEditor` component) for org admins to create/edit/delete custom question fields.
- **API Routes**: `GET/POST/PATCH/DELETE /api/clients/:clientId/equipment`, `GET/POST/DELETE /api/clients/:clientId/images`, `GET/POST/PATCH/DELETE /api/pool-wizard-questions`, `GET/PUT /api/clients/:clientId/wizard-responses`. All routes enforce org-scoping via client ownership verification.
- **Client Details Integration**: Pool tab shows pool specs, custom responses, equipment inventory (with photos), and image gallery.

### LSI Calculator (Feb 2026)
- **Purpose**: Langelier Saturation Index calculator for assessing pool water balance.
- **Component**: `client/src/components/pool/LSICalculator.tsx` - standalone calculator with compact/full modes.
- **Inputs**: pH, temperature (°F), calcium hardness, total alkalinity, TDS, cyanuric acid.
- **Features**: Auto-calculation, CYA-adjusted alkalinity, color-coded results with visual gauge, recommendations.
- **Integration**: Available in technician workflow via dialog button.

### Vendor Invoice Management System
- **Purpose**: Automated invoice processing from vendor emails with PDF parsing and routing to inventory/expenses.
- **Features**: Email import, PDF parsing (with OCR fallback), routing to inventory or expenses, AI-powered extraction, interactive raw text tagging for fields/line items, template management, status tracking (processed, needs_review).

### Field Service Reports
- **Purpose**: Comprehensive service reporting system for technicians.
- **Features**: Capture water chemistry, equipment status, chemicals applied, checklist items, photos, notes, and customer signatures. Linked to work orders and maintenance orders. Professional dashboard for viewing.

# External Dependencies

## Authentication Services
- **Google OAuth 2.0**: For single sign-on.
- **Passport.js**: Authentication middleware.

## Database Services
- **PostgreSQL**: Primary database.
- **Neon Database**: Serverless PostgreSQL provider.

## Third-Party APIs
- **Google Maps API**: For location services and geocoding.
- **Stripe**: Payment processing.
- **Scandit**: Barcode scanning for inventory.
- **OpenAI**: AI-powered document field extraction.
- **Tesseract.js**: OCR for image-based PDFs.
- **pdf-parse**: PDF text extraction.
- **pdf-to-img**: PDF-to-image conversion for OCR fallback.

## Communication Services
- **Gmail Integration**: Per-user OAuth-based email sync, compose/send, and automated notifications. Handles token management and permission issues.
- **RingCentral SMS Integration**: Multi-tenant OAuth-based SMS service for notifications and client messaging.
- **Twilio Integration**: Multi-tenant SMS and voice call service. NOTE: Does NOT use Replit's Twilio connector — credentials are managed per-organization in the database. Organizations connect their Twilio accounts (Account SID, Auth Token, phone number) via Settings > Communication Providers. Features include:
  - SMS sending to clients from Communications page and entity detail pages
  - Click-to-call (callout): rings the user's cell phone first, then connects to the customer via Twilio
  - Call logging with status, duration, and notes tracking
  - Quick contact action buttons (Call, Text, Email) on Client Details, Project Details, and Work Order pages
  - Backend service: `server/twilio-service.ts`, routes: `server/routes/twilio-routes.ts`
  - Schema: `callLogs` table for voice call history, existing `smsMessages` table for SMS

## Deployment Platform
- **Google Cloud Run**: Target deployment platform.
- **Replit**: Development and hosting environment.