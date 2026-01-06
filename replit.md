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
- **SMS Services**: Schema configured for SMS communication providers

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

## Deployment Platform
- **Google Cloud Run**: Target deployment platform with container-based architecture
- **Replit**: Development and deployment environment with specific configuration for their hosting platform

## Development Tools
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Type checking and compilation
- **Vite**: Frontend build tool and development server
- **esbuild**: Server-side bundling for production builds