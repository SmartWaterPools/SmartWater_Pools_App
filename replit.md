# Overview

SmartWater Pools Management System is a comprehensive web-based application designed to manage and streamline all aspects of pool service operations. It provides tools for office staff, technicians, and clients, covering project management, maintenance scheduling, and repair services. The system aims to be a singular solution for pool construction, renovation, recurring maintenance, and repair, featuring a client portal for communication and project status updates.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Technology Stack**: React with TypeScript, TailwindCSS, shadcn/ui for UI components.
- **State Management**: TanStack Query for data fetching.
- **Form Handling**: React Hook Form with Zod validation.
- **Routing**: Wouter, supporting protected routes.
- **Authentication**: Session-based with Google OAuth and role-based access.
- **UI/UX**: Professional dashboard views with color-coded reporting, mobile-responsive adaptive layouts.

## Backend
- **Technology Stack**: Node.js with Express.js and TypeScript.
- **Authentication**: Passport.js for local and Google OAuth strategies, implementing session-based and role-based authorization.
- **Data Storage**: Drizzle ORM for PostgreSQL.
- **API Design**: RESTful APIs organized by feature domains.
- **Security**: Role-based access control and secure session configurations.

## Database
- **ORM**: Drizzle ORM with PostgreSQL and Drizzle Kit for migrations.
- **Schema**: Relational schema covering users, organizations, projects, inventory, work orders, maintenance orders, vendor invoices, and service reports. Monetary amounts are stored in cents.
- **Architecture**: Multi-tenant design with organization-based data isolation and role-based permissions, enforced by Row-Level Security (RLS) on all tenant tables using an `organization_id` column.

## Multi-Tenancy
- Enforces tenant scoping on all user and organization routes, restricting non-system_admin users to their own organization's data.
- Storage methods require `organizationId` as a mandatory parameter for all tenant-scoped data retrieval.
- `system_admin` role and SmartWater Admin users (with `@smartwaterpools.com` email) bypass tenant restrictions for cross-organization management.
- Centralized `injectTenantContext` middleware sets `req.organizationId` and `req.isCrossOrgAdmin` on every request.

## Admin Dashboard
- Accessible at `/admin` and restricted to admin roles with `@smartwaterpools.com` email domain.
- Features tabs for Users, Organizations, and Permissions.
- Supports roles such as `system_admin`, `org_admin`, `admin`, `manager`, `office_staff`, `technician`, `client`, `vendor`.
- Provides database-backed permissions management via the `organization_permissions` table, allowing per-organization customization of role permissions.

## Core Feature Specifications

### Business Management
- Dashboard for key metrics including revenue, expenses, profit, inventory value, and outstanding invoices.

### Inventory Management
- Real-time tracking of pool service parts, chemicals, equipment, and supplies.
- Features CRUD operations, search/filter, inline stock adjustment, and integration with work orders and vendor invoices for automated stock updates.
- Dedicated `/inventory` hub with tabs for Items, Warehouses, Vehicles, Transfers, and Reports.
- Supports item photo uploads and includes a barcode scanner with a photo capture fallback.

### Billing Platform (Invoices & Estimates)
- Client invoicing and estimates with online payment processing.
- Features auto-generated numbers, detailed line items, manual payment recording, Stripe integration, and inventory deduction on finalization/acceptance.
- Supports tax templates based on client billing addresses and deposit functionality for estimates.

### Work Order & Maintenance Order System
- Comprehensive management for one-time jobs (Work Orders) and recurring schedules (Maintenance Orders).
- Features work order requests, parts & labor tracking, time tracking, team assignment, service templates, recurrence scheduling, and route planning.
- Technician-guided workflow with step-by-step checklists, progress tracking, notes, photo/video capture, chemical usage recording, and quick-access tools like Pool Wizard, Barcode Scanner, and LSI Calculator.
- Includes default service templates for common pool services.

### Chemical Pricing Management
- Organization-level management of chemical pricing for cost tracking.
- Dedicated page for CRUD operations on chemical prices, supporting various chemical types.
- Integrates with work orders to auto-fill unit costs when technicians record chemical usage.

### Pool Information Wizard
- Multi-step wizard for collecting and managing detailed client pool information, including equipment, images, and custom questions.
- Customizable custom questions per organization, configurable in Settings.
- Displays pool specifications, equipment inventory, and image galleries on client details pages.

### LSI Calculator
- A standalone Langelier Saturation Index calculator for assessing pool water balance.
- Provides auto-calculation, CYA-adjusted alkalinity, color-coded results with a visual gauge, and recommendations.
- Integrated into the technician workflow.

### Vendor Invoice Management System
- Automated processing of vendor invoices from emails, including PDF parsing with OCR fallback.
- Features AI-powered extraction, interactive raw text tagging, and routing to inventory or expenses.

### Field Service Reports
- Comprehensive reporting for technicians to capture water chemistry, equipment status, chemicals applied, checklist items, photos, notes, and customer signatures.

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
- **Scandit**: Barcode scanning.
- **OpenAI**: AI-powered document field extraction.
- **Tesseract.js**: OCR for image-based PDFs.
- **pdf-parse**: PDF text extraction.
- **pdf-to-img**: PDF-to-image conversion.

## Communication Services
- **Gmail Integration**: Per-user OAuth-based email sync and automated notifications.
- **Twilio Integration**: Multi-tenant SMS and voice call service, including call logging and quick contact actions.

## Deployment Platform
- **Google Cloud Run**: Target deployment platform.
- **Replit**: Development and hosting environment.