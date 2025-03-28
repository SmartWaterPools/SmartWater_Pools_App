# Authentication System Rebuild

## Overview
We've rebuilt the authentication system for SmartWater Pools to address the existing issues with session persistence, cookie handling, race conditions, and flow interruptions in the original system.

## Key Components

### Client-Side Changes

1. **AuthContext (client/src/contexts/AuthContext.new.tsx)**
   - Simplified state management with clear login, logout, and registration functions
   - Added dedicated Google login function for OAuth flow
   - Improved error handling and user feedback
   - Reduced complexity and removed race conditions from session checking

2. **ProtectedRoute (client/src/components/ProtectedRoute.new.tsx)**
   - Streamlined route protection logic
   - Simplified role-based and permission-based access control
   - Removed complex OAuth flow detection that was causing issues
   - Improved loading states and user experience

3. **Login Page (client/src/pages/Login.new.tsx)**
   - Redesigned login form with both username/password and Google OAuth options
   - Added support for subscription checking based on the decision tree
   - Improved error handling for various subscription states
   - Better user feedback during authentication processes

### Server-Side Changes

1. **Authentication Routes (server/routes/auth-routes.ts)**
   - Centralized all authentication-related routes
   - Added proper error handling for various authentication scenarios
   - Implemented subscription status checking
   - Simplified session management and OAuth flow

2. **Passport Configuration (server/auth.ts.new)**
   - Streamlined Passport.js setup with both local and Google strategies
   - Improved user creation/update logic during OAuth
   - Better handling of environment variables for OAuth configuration
   - Added clear middleware for protected routes

3. **Server Routes (server/routes.ts.new)**
   - Reorganized route definitions for better clarity
   - Consolidated authentication middleware
   - Added proper error handling
   - Separated authentication concerns from business logic

4. **Main Server Configuration (server/index.ts.new)**
   - Enhanced session configuration for better security and reliability
   - Improved logging for authentication-related events
   - Better handling of environment variables

## Authentication Flow

1. **Traditional Login Flow**
   - User enters credentials on login page
   - Client sends credentials to /api/auth/login
   - Server authenticates and returns user data
   - Client updates authentication context and redirects to appropriate dashboard

2. **Google OAuth Flow**
   - User clicks "Sign in with Google" button
   - Client redirects to /api/auth/google endpoint
   - Server initiates OAuth flow with Google
   - After Google authentication, user is redirected to callback URL
   - Server processes OAuth data and creates/updates user
   - User is redirected to appropriate dashboard based on role

3. **Session Management**
   - Sessions are stored in PostgreSQL database
   - Clear session checking mechanism without multiple retries
   - Proper error handling for session-related issues

4. **Subscription Verification**
   - After authentication, the system checks if the user has an organization
   - Verifies if the organization has an active subscription
   - Redirects to appropriate page based on subscription status

## Implementation Steps

1. Replace the existing files with their new versions:
   - `client/src/contexts/AuthContext.tsx` → `client/src/contexts/AuthContext.new.tsx`
   - `client/src/components/ProtectedRoute.tsx` → `client/src/components/ProtectedRoute.new.tsx`
   - `client/src/pages/Login.tsx` → `client/src/pages/Login.new.tsx`
   - `server/auth.ts` → `server/auth.ts.new`
   - `server/routes.ts` → `server/routes.ts.new`
   - `server/index.ts` → `server/index.ts.new`

2. Add the new authentication routes file:
   - `server/routes/auth-routes.ts`

3. Restart the server to apply changes.

## Additional Considerations

- The system supports multiple user roles (system admins, organization admins, office admins, technicians, and clients)
- Subscription verification is integrated into the authentication flow
- All OAuth flows are properly handled with clear error states
- The system maintains compatibility with the existing user database schema