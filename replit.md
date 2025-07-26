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
- Multi-tenant organization management
- Role-based access control (RBAC)
- Pool maintenance scheduling and routing
- Inventory management with barcode scanning
- Real-time vehicle tracking (Fleetmatics integration)
- Customer portal with service history
- Financial reporting and invoicing
- Chemical usage tracking and water quality management

## Recent Changes

### January 26, 2025 - Security and Stability Improvements
- **Removed Plain Text Password Support**: Enhanced security by blocking authentication for accounts with non-bcrypt passwords
- **Added Rate Limiting**: Implemented express-rate-limit for authentication endpoints (5 attempts/15 min)
- **Optimized Database Connection Pools**: 
  - Main pool: max 20 connections with proper timeouts
  - Session pool: max 5 connections to prevent exhaustion
- **Added React Error Boundaries**: Prevents entire app crashes from component errors
- **Fixed Session Store Configuration**: Reduced pruning interval to 6 hours

### Security Measures Implemented
1. **Authentication Rate Limiting**:
   - Auth endpoints: 5 requests per 15 minutes
   - OAuth endpoints: 10 requests per 15 minutes
   - General API: 100 requests per 15 minutes

2. **Connection Pool Management**:
   - Main database pool: 20 connections max
   - Session pool: 5 connections max
   - Idle timeout: 30 seconds (main), 10 seconds (session)
   - Connection timeout: 2 seconds (main), 5 seconds (session)

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