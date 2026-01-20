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