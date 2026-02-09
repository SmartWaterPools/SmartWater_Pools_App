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

### Invoicing Platform
- **Purpose**: Client invoicing with online payment processing.
- **Features**: Auto-generated invoice numbers, detailed line items, manual payment recording, Stripe integration, webhook handling.

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

## Deployment Platform
- **Google Cloud Run**: Target deployment platform.
- **Replit**: Development and hosting environment.