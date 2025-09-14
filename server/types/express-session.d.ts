// Type definitions for express-session
// Extends the original express-session to add our custom session properties

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    // OAuth specific properties
    oauthState?: string;
    oauthPending?: boolean;
    oauthInitiatedAt?: string;
    originPath?: string;
    isSignup?: boolean;
    redirectTo?: string;
    
    // Authentication state
    OAuthAuthenticated?: boolean;
    OAuthUser?: any; // User data from OAuth provider
    
    // Login timing
    loginTime?: string;
    
    // Custom session flags
    isNew?: boolean;
  }
}