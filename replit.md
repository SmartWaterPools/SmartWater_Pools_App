# SmartWater Pools Management System

## Overview
A sophisticated pool service and project management platform that leverages intelligent workflows and data-driven insights to optimize professional pool maintenance and client interactions.

## Project Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local and Google OAuth strategies
- **Session Management**: PostgreSQL-backed sessions with express-session
- **Maps Integration**: Google Maps API for route planning and visualization
- **Payment Processing**: Stripe integration for subscriptions
- **Email Service**: Gmail API integration
- **Deployment**: Cloud Run compatible, optimized for Replit environment

### Key Features
- **Multi-tenant organization management** with complete data isolation
- **Comprehensive role-based access control (RBAC)** with 6 user types and granular permissions
- **Role-specific UI/UX interfaces** tailored for each user type's workflow
- **Pool maintenance scheduling and routing** with GPS integration
- **Inventory management** with barcode scanning and chemical tracking
- **Real-time vehicle tracking** (Fleetmatics integration)
- **Customer portal** with service history, billing, and self-service capabilities
- **Financial reporting and invoicing** with Stripe payment processing
- **Chemical usage tracking** and water quality management

## Recent Changes

### January 26, 2025 - Multi-Tenant Role-Based UI/UX System Implementation COMPLETE
- **Comprehensive Role-Based Layout System**: ✅ COMPLETE - Implemented 6 distinct user interfaces
  - AdminLayout: Full system access for system_admin, org_admin, admin roles
  - ManagerLayout: Operations oversight with team management and business intelligence  
  - OfficeStaffLayout: Administrative portal for client management and scheduling
  - TechnicianLayout: Field-focused interface with route planning and task tracking
  - ClientLayout: Customer portal with service history, billing, and self-service tools
  - DefaultLayout: Fallback for unauthenticated users with minimal branding

- **Role-Specific Dashboard Components**: ✅ COMPLETE - Tailored experiences per user type
  - AdminDashboard: System metrics, user management, multi-organization overview
  - TechnicianDashboard: Daily routes, task progress, field tools, completion tracking
  - ClientDashboard: Pool health status, service scheduling, payment portal, communications

- **Enhanced Multi-Tenant Security Middleware**: ✅ COMPLETE - Robust data isolation
  - Organization-based data filtering with automatic boundary enforcement
  - Permission-based route protection with granular resource access control
  - Role-based rate limiting (3x for system_admin, 2x for technician, 1x standard)
  - Comprehensive audit logging for compliance and security monitoring

- **Role-Based Navigation System**: ✅ COMPLETE - Dynamic UI adaptation
  - Contextual menu generation based on user permissions and role
  - Role-specific quick actions and workflow shortcuts
  - Permission-aware feature visibility and access control
  - Responsive navigation with mobile-optimized interfaces

### January 27, 2025 - Comprehensive Security Audit and Bug Fixes COMPLETED
- **OAuth State Management**: ✅ COMPLETE - Moved from in-memory to database-backed storage
  - Created `oauth_states` table with automatic expiration cleanup (30 min TTL)
  - Prevents state loss during server restarts
  - Enhanced CSRF protection for OAuth flows
  - Added proper indexing for performance
- **Request Validation Middleware**: ✅ COMPLETE - Added comprehensive request protection
  - Size validation (50MB limit) with proper error messages
  - JSON payload validation to prevent malformed requests and prototype pollution
  - Applied validation middleware globally with correct parameter handling
  - Fixed middleware configuration bug that was causing server timeouts
- **CSRF Protection**: ✅ COMPLETE - Full implementation with client integration
  - Implemented CSRF token generation and validation middleware
  - Added automatic token inclusion in client-side API requests via interceptors
  - Excluded OAuth callbacks and webhooks from CSRF validation
  - Created dedicated CSRF token endpoint for frontend integration
- **Rate Limiting**: ✅ COMPLETE - Optimized for security and usability
  - Auth endpoints: 20 attempts per 15 minutes for better user experience
  - OAuth endpoints: 10 attempts per 15 minutes
  - General API: 100 requests per 15 minutes
  - Added skip for session checks to prevent UI lockups
  - Enabled `skipSuccessfulRequests` for auth endpoints
- **Database Connection Optimization**: ✅ COMPLETE - Enhanced stability
  - Optimized session pool configuration (3 max connections, 10s timeout)
  - Added retry logic and better error handling for connection timeouts
  - Separated session store from main database pool to prevent exhaustion

### January 26, 2025 - Security and Stability Improvements
- **Removed Plain Text Password Support**: Enhanced security by blocking authentication for accounts with non-bcrypt passwords
- **Added Rate Limiting**: Implemented express-rate-limit for authentication endpoints (5 attempts/15 min)
- **Optimized Database Connection Pools**: 
  - Main pool: max 20 connections with proper timeouts
  - Session pool: max 5 connections to prevent exhaustion
- **Added React Error Boundaries**: Prevents entire app crashes from component errors
- **Fixed Session Store Configuration**: Reduced pruning interval to 6 hours

### Current Security Measures Active
1. **Authentication Rate Limiting**:
   - Auth endpoints: 20 requests per 15 minutes (improved usability)
   - OAuth endpoints: 10 requests per 15 minutes
   - General API: 100 requests per 15 minutes
   - Skip successful requests to prevent UI lockups

2. **Connection Pool Management**:
   - Main database pool: 20 connections max
   - Session pool: 3 connections max (optimized for stability)
   - Idle timeout: 30 seconds (both pools)
   - Connection timeout: 2 seconds (main), 10 seconds (session)
   - Added retry logic for connection reliability

3. **Request Protection**:
   - Size validation: 50MB limit with detailed error messages
   - JSON payload validation against prototype pollution
   - Malicious pattern detection (proto, constructor patterns)
   - Nesting depth limits to prevent stack overflow attacks

4. **CSRF Protection**:
   - Server-side token generation and validation
   - Automatic token injection in client API calls
   - Protected all state-changing operations
   - Excluded OAuth callbacks and webhooks appropriately

5. **OAuth Security**:
   - Database-backed state storage (replaces memory storage)
   - Automatic state cleanup after 30 minutes
   - State verification for all OAuth flows
   - Account switching protection

3. **Error Handling**:
   - Global error boundary for React app
   - Proper error logging for database pool errors
   - User-friendly error messages with recovery options

## User Preferences
- Focus on security-first approach
- Prioritize application stability and performance
- Maintain backward compatibility where possible
- Clear error messages for debugging

## Architecture Decisions

### Database Architecture
- Uses Drizzle ORM for type-safe database interactions
- Implements soft deletes for critical data (users, clients)
- Maintains audit trails for compliance

### Authentication Flow
- Session-based authentication with secure cookies
- OAuth integration with Google for SSO
- Role-based permissions system with granular controls
- Special handling for system administrators

### Frontend Architecture
- Component-based architecture with React
- Centralized state management for authentication
- Protected routes with role-based access
- Responsive design with mobile-first approach

## Known Issues & Limitations
- Large payload limit (50MB) needs additional validation middleware
- OAuth state cleanup mechanism needs persistent storage
- Session cookies use sameSite: 'none' for OAuth compatibility

## Development Guidelines
- Always use bcrypt for password hashing
- Implement proper error boundaries for new features
- Add rate limiting to new API endpoints
- Monitor database connection usage
- Test authentication flows across different browsers

## Deployment Considerations
- Environment: Replit with Cloud Run compatibility
- Port: 5000 (configurable via PORT env var)
- Database: PostgreSQL (connection string in DATABASE_URL)
- Session Secret: Use SESSION_SECRET env var in production
- Google OAuth: Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET