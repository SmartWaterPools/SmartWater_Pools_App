# Overview

SmartWater Pools Management System is a comprehensive web-based application designed to streamline and manage pool service operations. The system connects office staff, technicians, and clients through a modern interface for project management, maintenance scheduling, repair services, and client portal functionality. The application handles pool construction and renovation projects, recurring maintenance visits, repair requests, and provides a client portal for viewing project status and communication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Technology Stack**: React with TypeScript, providing type safety and modern component architecture
- **UI Framework**: TailwindCSS for styling with shadcn/ui component library for consistent design patterns
- **State Management**: TanStack Query for server state management, data fetching, and caching
- **Form Handling**: React Hook Form integrated with Zod for validation and type-safe form processing
- **Routing**: Wouter for client-side routing with protected route functionality
- **Authentication Flow**: Session-based authentication with Google OAuth integration and role-based access control

## Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript
- **Authentication**: Passport.js with local and Google OAuth strategies, session-based authentication with role-based authorization
- **Data Storage**: Currently using in-memory storage with Drizzle ORM configured for future PostgreSQL integration
- **API Design**: RESTful API endpoints organized by feature domains (auth, dashboard, maintenance, projects, users)
- **Session Management**: Express sessions with proper security configuration for production deployment

## Database Design
- **ORM**: Drizzle ORM configured for PostgreSQL with schema-first approach
- **Schema Structure**: Comprehensive relational schema including users, organizations, projects, maintenance, technicians, clients, and communication providers
- **Migration System**: Drizzle Kit for database migrations and schema management
- **Multi-tenant Architecture**: Organization-based data isolation with role-based permissions

## Deployment Architecture
- **Build Process**: Vite for frontend bundling, esbuild for server bundling
- **Production Environment**: Configured for Google Cloud Run deployment with proper port binding and graceful shutdown
- **Static Assets**: Served from dist/public directory in production
- **Environment Configuration**: Comprehensive environment variable handling for different deployment stages

## Security Architecture
- **Authentication**: Multi-strategy authentication supporting username/password and Google OAuth
- **Authorization**: Role-based access control with organization-level permissions
- **Session Security**: Secure session configuration with proper cookie settings
- **API Security**: Protected routes with authentication middleware and subscription-based access control

# External Dependencies

## Authentication Services
- **Google OAuth 2.0**: Integrated for single sign-on functionality requiring GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables
- **Passport.js**: Authentication middleware supporting multiple strategies

## Database Services
- **PostgreSQL**: Primary database requiring DATABASE_URL environment variable
- **Neon Database**: Configured as the PostgreSQL provider for serverless deployment

## Third-Party APIs
- **Google Maps API**: Integrated for location services requiring GOOGLE_MAPS_API_KEY
- **Stripe**: Payment processing integration with @stripe/stripe-js and @stripe/react-stripe-js
- **Scandit**: Barcode scanning capabilities for inventory management

## Communication Services
- **Gmail Integration**: Per-user OAuth-based Gmail integration using Google OAuth 2.0 with Gmail API scopes. Supports:
  - Email sync with smart auto-linking to clients, projects, and repairs based on sender email matching
  - Compose and send emails directly from the app
  - 6 types of automated notification emails (appointment reminders, project updates, repair status, client portal, internal alerts, marketing)
  - Users connect their Gmail in Settings page using OAuth flow
  - Tokens stored per-user for tenant isolation (gmail_access_token, gmail_refresh_token, etc.)
- **Microsoft Outlook Integration**: NOT YET CONFIGURED - Requires Microsoft OAuth 2.0 credentials (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET). Schema ready for outlook_access_token, outlook_refresh_token, etc.
- **RingCentral SMS Integration**: Multi-tenant SMS service using RingCentral OAuth. Supports:
  - Organization-level RingCentral account connection via OAuth flow
  - On-the-way notifications, job complete texts, appointment reminders
  - Client portal messaging and custom alerts
  - Manual SMS sending from Communications tab and Client Details pages
  - SMS templates with variable substitution ({{client_name}}, {{tech_name}}, {{address}}, etc.)
  - Tokens stored per-organization in communication_providers table
  - Auto-refresh for tokens (access tokens expire in 2 hours, refresh tokens in 7 days)

## Email Integration Architecture
- **Core Services**: 
  - `server/services/gmail-client.ts` - Gmail API wrapper using per-user OAuth tokens (stored in users table)
  - `server/services/email-sync-service.ts` - Email syncing and auto-linking logic
  - `server/services/notification-email-service.ts` - Templates and sending for 6 notification types
- **API Routes**: 
  - `server/routes/email-routes.ts` - Email CRUD, sync, and notification endpoints
  - `server/routes/auth-routes.ts` - Gmail/Outlook connect/disconnect OAuth routes (/api/auth/connect-gmail, /api/auth/disconnect-gmail)
- **Frontend Components**:
  - `client/src/pages/Communications.tsx` - Central communications hub with email list, sync, and compose
  - `client/src/components/settings/CommunicationProviders.tsx` - Email connection management UI (Connect/Disconnect buttons)
  - `client/src/components/communications/EntityEmailList.tsx` - Reusable component for showing entity-linked emails
- **Database Tables**: emails, email_links, email_templates, scheduled_emails, communication_providers
- **User Token Fields**: gmail_access_token, gmail_refresh_token, gmail_token_expires_at, gmail_connected_email (and outlook equivalents)

## SMS Integration Architecture
- **Core Services**:
  - `server/ringcentral-service.ts` - RingCentral SDK wrapper with OAuth token management and auto-refresh
- **API Routes**:
  - `server/routes/sms-routes.ts` - SMS endpoints: send, history, templates, send-on-the-way, send-job-complete, send-reminder
  - `server/routes/auth-routes.ts` - RingCentral OAuth routes (/api/auth/connect-ringcentral, /api/auth/ringcentral/callback)
- **Frontend Components**:
  - `client/src/pages/Communications.tsx` - SMS tab with compose dialog and message history
  - `client/src/components/settings/CommunicationProviders.tsx` - RingCentral connect/disconnect UI
  - `client/src/components/communications/EntitySMSList.tsx` - Reusable component for client/vendor SMS history
  - `client/src/components/maintenance/MaintenanceListView.tsx` - SMS trigger buttons in job dropdown menus
- **Database Tables**: sms_messages, sms_templates, communication_providers
- **Environment Variables**: RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, RINGCENTRAL_SERVER (optional)

## Vendor Management
- **Purpose**: Track and manage subcontractors, suppliers, and service vendors
- **Database Table**: `vendors` - name, contactName, email, phone, category (chemical supplier/equipment/parts/service/tools/office), vendorType (subcontractor/supplier), website, address, notes, isActive, organizationId
- **API Routes**: `server/routes/vendor-routes.ts`
  - `GET /api/vendors` - List all vendors for organization
  - `GET /api/vendors/:id` - Get vendor details (with org scoping)
  - `POST /api/vendors` - Create new vendor
  - `PATCH /api/vendors/:id` - Update vendor
  - `DELETE /api/vendors/:id` - Delete vendor
  - `GET /api/vendors/:id/communications` - Get linked emails and SMS
- **Frontend Components**:
  - `client/src/pages/VendorDetail.tsx` - Vendor detail page with info and communications tabs
  - `client/src/components/business/VendorsTable.tsx` - Vendor list with CRUD actions
  - `client/src/components/business/VendorForm.tsx` - Create/edit vendor dialog

## Communication Linking System
- **Purpose**: Link emails and SMS messages to multiple entities (clients, vendors, projects, repairs, maintenance jobs)
- **Database Table**: `communication_links` - organizationId, communicationType (sms/email), communicationId, entityType (client/vendor/project/repair/maintenance), entityId, linkSource (manual/auto), confidence, linkedBy
- **Multi-Entity Linking**: Single communication can be linked to multiple entities simultaneously (e.g., email about a vendor's work on a client's project)
- **Link Dialog Features**:
  - Three optional dropdowns: Client, Vendor, Project/Job
  - Auto-match by phone number (SMS) or email address (Email)
  - "Create New Client" inline form for unrecognized contacts
  - At least one entity must be selected to enable Link button
- **Backward Compatibility**: Legacy `email_links` table and `sms_messages.clientId/projectId` fields maintained for existing functionality

## Deployment Platform
- **Google Cloud Run**: Target deployment platform with container-based architecture
- **Replit**: Development and deployment environment with specific configuration for their hosting platform

## Development Tools
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Type checking and compilation
- **Vite**: Frontend build tool and development server
- **esbuild**: Server-side bundling for production builds

## Business Management System
- **Purpose**: Comprehensive business operations management including expenses, time tracking, inventory, licenses, and insurance
- **Database Tables**: 
  - `expenses` - organizationId, date, amount, category, description, vendorName, vendorId, status, paymentMethod, receiptUrl, notes
  - `time_entries` - organizationId, userId, projectId, workOrderId, date, hoursWorked, description, status, approvedBy, notes
  - `pool_reports` - organizationId, clientId, technicianId, reportDate, poolCondition, chemicalReadings (JSONB), servicesPerformed, recommendations, photos, notes
  - `licenses` - organizationId, licenseName, licenseNumber, issuingAuthority, issueDate, expirationDate, status, documentUrl, notes
  - `insurance_policies` - organizationId, policyName, policyNumber, provider, policyType, coverageAmount, premium, startDate, endDate, status, documentUrl, notes
  - `purchase_orders` - organizationId, vendorId, vendorName, orderNumber, orderDate, expectedDeliveryDate, status, totalAmount, items (JSONB), notes, createdBy
  - `inventory_items` - organizationId, sku, name, description, category, unitCost, unitPrice, minimumStock, isActive, vendorId
- **API Routes**: `server/routes/business-routes.ts`
  - Dashboard with time-filtered metrics (day/week/month/year): `GET /api/business/dashboard?timeRange={day|week|month|year}`
  - All business CRUD endpoints filter by organizationId for multi-tenant security
- **Frontend Components**:
  - `client/src/pages/Business.tsx` - Business management page with dashboard, expenses, time tracking, vendors, inventory, licenses, insurance tabs
  - Time range filter buttons (1D, 1W, 1M, 1Y) for dashboard metrics
- **Multi-tenant Security**: All queries filter by organizationId from authenticated user session, never accepting organizationId from request body