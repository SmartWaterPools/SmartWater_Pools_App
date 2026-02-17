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
- **Frontend Pages**: Scheduling Hub (List/Calendar/Board/Routes views), Maintenance Orders dashboard, interactive Maintenance Map with multiple filter views, Projects, Repairs, Technicians, and Routes Tab for drag-and-drop route management.

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
- **Twilio Integration**: Multi-tenant SMS and voice call service. Organizations connect their Twilio accounts (Account SID, Auth Token, phone number) via Settings > Communication Providers. Features include:
  - SMS sending to clients from Communications page and entity detail pages
  - Click-to-call (callout): rings the user's cell phone first, then connects to the customer via Twilio
  - Call logging with status, duration, and notes tracking
  - Quick contact action buttons (Call, Text, Email) on Client Details, Project Details, and Work Order pages
  - Backend service: `server/twilio-service.ts`, routes: `server/routes/twilio-routes.ts`
  - Schema: `callLogs` table for voice call history, existing `smsMessages` table for SMS

## Deployment Platform
- **Google Cloud Run**: Target deployment platform.
- **Replit**: Development and hosting environment.