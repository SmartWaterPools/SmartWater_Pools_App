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
- **Gmail Integration**: Per-user OAuth-based Gmail integration for email sync, compose/send, and 6 types of automated notifications. Supports auto-linking to entities.
- **RingCentral SMS Integration**: Multi-tenant OAuth-based SMS service for notifications, client messaging, and custom alerts. Includes SMS templates and auto-refresh for tokens.

## Deployment Platform
- **Google Cloud Run**: Target deployment.
- **Replit**: Development and hosting environment.