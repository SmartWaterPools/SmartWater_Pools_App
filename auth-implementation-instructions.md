# Authentication System Implementation Instructions

## Overview
These instructions will guide you through replacing the existing problematic authentication system with the new, simplified implementation.

## Prerequisites
- Ensure you have backed up the original files before proceeding
- Make sure the PostgreSQL database is running and accessible
- Verify that the Google OAuth credentials are properly configured in the environment variables

## Step-by-Step Implementation

### 1. Replace Client-Side Authentication Files

#### a. Replace AuthContext:
```bash
mv client/src/contexts/AuthContext.new.tsx client/src/contexts/AuthContext.tsx
```

#### b. Replace ProtectedRoute:
```bash
mv client/src/components/ProtectedRoute.new.tsx client/src/components/ProtectedRoute.tsx
```

#### c. Replace Login Page:
```bash
mv client/src/pages/Login.new.tsx client/src/pages/Login.tsx
```

### 2. Replace Server-Side Authentication Files

#### a. Add New Auth Routes File:
```bash
# Make sure the directory exists
mkdir -p server/routes
# Move the file
mv server/routes/auth-routes.ts server/routes/
```

#### b. Replace Passport Configuration:
```bash
mv server/auth.ts.new server/auth.ts
```

#### c. Replace Server Routes:
```bash
mv server/routes.ts.new server/routes.ts
```

#### d. Replace Server Configuration:
```bash
mv server/index.ts.new server/index.ts
```

### 3. Restart the Server

```bash
# Restart the workflow to apply changes
npm run dev
```

## Verification Steps

### 1. Verify Traditional Login
- Navigate to the login page
- Enter valid credentials
- Confirm you are redirected to the appropriate dashboard based on user role
- Verify session persistence by refreshing the page

### 2. Verify Google OAuth
- Navigate to the login page
- Click "Sign in with Google"
- Complete the Google authentication process
- Confirm you are redirected to the appropriate dashboard based on user role
- Verify session persistence by refreshing the page

### 3. Verify Subscription Checking
- Login with a user without an organization
- Confirm you are redirected to the pricing page
- Login with a user with an expired subscription
- Confirm you are redirected to the billing page with a warning

### 4. Verify Protected Routes
- Attempt to access routes requiring different roles
- Confirm that appropriate access controls are enforced
- Verify that unauthorized access results in proper redirection

## Troubleshooting

### Session Issues
- Check the server logs for session-related errors
- Verify that the session table exists in the database
- Ensure cookies are being properly set and not blocked by browser settings

### OAuth Issues
- Confirm that Google OAuth credentials are properly configured
- Check redirect URLs in the Google OAuth configuration
- Verify that the callback URL matches the one configured in Google OAuth settings

### Role-based Access Issues
- Verify that users have the correct roles assigned in the database
- Check the permissions configuration in the ProtectedRoute component
- Ensure that routes are properly protected with the correct middleware

## Additional Notes
- The system is designed to handle multiple user roles (system admins, organization admins, office admins, technicians, and clients)
- Subscription verification is integrated into the authentication flow
- The system maintains compatibility with the existing user database schema