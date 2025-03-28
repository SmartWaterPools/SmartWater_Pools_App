import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { ParsedQs } from "qs"; // Import the ParsedQs type for query parameters
import { storage, IStorage } from "./storage";
import emailRoutes from "./email-routes";
import fleetmaticsRoutes from "./routes/fleetmatics-routes";
import inventoryRoutes from "./routes/inventory-routes";
import invitationRoutes from "./routes/invitation-routes";
import stripeRoutes from "./routes/stripe-routes";
import registerOAuthRoutes from "./routes/oauth-routes";
import passport from "passport";
import { isAuthenticated, isAdmin, isSystemAdmin } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Serve static files for debugging
  app.get("/debug", (req: Request, res: Response) => {
    res.sendFile("debug.html", { root: "./public" });
  });

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Google OAuth routes setup for login and signup
  // OAuth session preparation endpoint
  app.get('/api/auth/prepare-oauth', (req: Request, res: Response) => {
    try {
      console.log("Starting OAuth session preparation");
      
      // Log session and cookie details for debugging
      const sessionExists = !!req.session;
      const sessionID = req.sessionID || 'none';
      const hasExistingCookies = Object.keys(req.cookies || {}).length > 0;
      const cookies = Object.keys(req.cookies || {}).join(', ');
      
      console.log(`OAuth preparation details: sessionExists=${sessionExists}, sessionID=${sessionID}, hasExistingCookies=${hasExistingCookies}, cookies=[${cookies}]`);
      
      // Ensure a session exists and is saved
      if (!req.session) {
        console.error('No session object available for OAuth preparation');
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to prepare session for OAuth flow',
          details: {
            sessionExists,
            sessionID,
            hasExistingCookies,
            cookies
          }
        });
      }
      
      // Store session status before changes
      const initialSessionData = {
        id: req.sessionID,
        isNew: req.session.isNew,
        previousOAuthState: req.session.oauthState,
        hasPreviousOAuthFlag: !!req.session.oauthPending
      };
      
      // Generate a unique state parameter to verify the OAuth callback
      const state = `oauth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Store the state in the session to verify later
      req.session.oauthState = state;
      
      // Set flags to indicate this is an OAuth session
      req.session.oauthPending = true;
      req.session.oauthInitiatedAt = new Date().toISOString();
      
      // Store any origin path for potential redirection after authentication
      let originPath: string = '/dashboard'; // Default path
      
      if (req.query.redirectPath) {
        // Convert to string with explicit casting to fix TypeScript errors
        if (typeof req.query.redirectPath === 'string') {
          originPath = req.query.redirectPath;
        } else if (Array.isArray(req.query.redirectPath)) {
          // Force TypeScript to accept string or falsy value
          const firstPath = req.query.redirectPath[0] as unknown as string;
          originPath = firstPath || '/dashboard';
        } else {
          // Handle case when it's a ParsedQs object
          // Forces TypeScript to accept the conversion
          originPath = String(req.query.redirectPath as any);
        }
      }
      
      req.session.originPath = originPath;
      
      // Add multiple redundant cookies with different settings to help with OAuth flow persistence
      // This gives us multiple chances to recover the state if one cookie type fails
      
      // 1. Primary OAuth token cookie - with SameSite=None for cross-origin requests
      res.cookie('oauth_token', state, {
        maxAge: 15 * 60 * 1000, // 15 minutes
        httpOnly: false, // Allow JavaScript to read this cookie
        secure: true,
        sameSite: 'none', // Allow cross-site requests
        path: '/'
      });
      
      // 2. Secondary OAuth flow cookie - with SameSite=None
      res.cookie('oauth_flow', 'login', {
        maxAge: 15 * 60 * 1000, // 15 minutes
        httpOnly: false, // Allow JavaScript access
        secure: true,
        sameSite: 'none', // Allow cross-site requests
        path: '/'
      });
      
      // 3. Strict cookie with timestamp - for JavaScript detection
      res.cookie('oauth_timestamp', Date.now().toString(), {
        maxAge: 15 * 60 * 1000, // 15 minutes
        httpOnly: false, // Allow JavaScript access
        secure: true,
        sameSite: 'strict',
        path: '/'
      });
      
      // Set response headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log("Initiating Google OAuth login flow with enhanced session preparation");
      
      // Save the session with explicit callback
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session during OAuth preparation:', err);
          
          // Log additional error details
          const errorDetails = {
            message: err.message,
            name: err.name,
            stack: err.stack,
            initialSessionData
          };
          
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to save session for OAuth flow',
            error: err.message,
            details: errorDetails
          });
        }
        
        // Return success with the state parameter to be used in the OAuth redirect
        return res.status(200).json({
          success: true,
          message: 'Session prepared for OAuth',
          state: state,
          sessionID: req.sessionID,
          initialSessionData,
          cookies: {
            set: ['oauth_token', 'oauth_flow', 'oauth_timestamp'],
            values: {
              state,
              flow: 'login',
              timestamp: Date.now()
            }
          }
        });
      });
    } catch (error) {
      // Enhanced error logging
      const errorObj = error as Error;
      console.error('Error in OAuth session preparation:', {
        message: errorObj.message,
        name: errorObj.name,
        stack: errorObj.stack
      });
      
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error during OAuth preparation',
        error: errorObj.message || 'Unknown error',
        errorType: errorObj.name || 'Error'
      });
    }
  });

  // Session check endpoint - Restored from backup
  app.get("/api/auth/session", (req: Request, res: Response) => {
    // Set headers to prevent caching of session information
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Enhanced debugging information to trace authentication issues
    const authStatus = req.isAuthenticated() ? 'authenticated' : 'not-authenticated';
    res.setHeader('X-Auth-Status', authStatus);
    res.setHeader('X-Session-ID', req.sessionID || 'no-session');
    
    // Special diagnostic headers - removed in production
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('X-Session-Cookie', req.session ? 'exists' : 'missing');
      res.setHeader('X-Session-New', req.session?.isNew ? 'true' : 'false');
      
      // If we have OAuth info in the session, include it
      if (req.session?.OAuthAuthenticated) {
        res.setHeader('X-OAuth-Auth', 'true');
      }
      
      if (req.session?.OAuthUser) {
        res.setHeader('X-OAuth-User-Email', (req.session.OAuthUser as any).email || 'none');
      }
    }
    
    if (req.isAuthenticated()) {
      // Don't send password to the client
      const { password, ...userWithoutPassword } = req.user as any;
      
      // Log successful authentication
      console.log(`Session check: AUTHENTICATED USER: ${userWithoutPassword.email} (${userWithoutPassword.id})`);
      console.log(`Session details for ${userWithoutPassword.email}: ID=${req.sessionID}, role=${userWithoutPassword.role}`);
      
      // Add additional verification in logs for Travis account
      if (userWithoutPassword.email?.toLowerCase() === 'travis@smartwaterpools.com') {
        console.log(`*** TRAVIS AUTHENTICATION VERIFIED ***`);
        console.log(`User data: ID=${userWithoutPassword.id}, Name=${userWithoutPassword.name}`);
        console.log(`Auth provider: ${userWithoutPassword.authProvider}, Organization: ${userWithoutPassword.organizationId}`);
      }
      
      return res.json({ 
        isAuthenticated: true, 
        user: userWithoutPassword,
        sessionID: req.sessionID,
        sessionExists: true,
        cookieMaxAge: req.session?.cookie?.maxAge,
        cookieExpires: req.session?.cookie?.expires,
        sessionCreated: req.session?.cookie?.originalMaxAge 
          ? new Date(Date.now() - (req.session.cookie.maxAge || 0) + (req.session.cookie.originalMaxAge || 0)) 
          : null,
      });
    } else {
      // Not authenticated
      console.log(`Session check: NOT AUTHENTICATED (sessionID=${req.sessionID || 'none'})`);
      
      // Include more debug info about the session state
      return res.json({
        isAuthenticated: false,
        sessionID: req.sessionID || null,
        sessionExists: !!req.session,
        isNew: req.session?.isNew || false,
        cookieMaxAge: req.session?.cookie?.maxAge || 'not set',
        cookieExpires: req.session?.cookie?.expires || 'not set',
      });
    }
  });

  // Google OAuth endpoint with enhanced error handling
  app.get("/api/auth/google", (req, res, next) => {
    console.log("Google OAuth initiation request received");
    
    // Add better error handling for Google OAuth
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    // Check if Google credentials are configured
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Google OAuth credentials missing:", {
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET
      });
      return res.redirect('/login?error=google-credentials-missing');
    }
    
    // Make session information available to Passport
    if (req.query.state && req.session) {
      // Store the state parameter in the session if provided
      // Convert to string regardless of type
      let stateParam: string = '';
      
      if (typeof req.query.state === 'string') {
        stateParam = req.query.state;
      } else if (Array.isArray(req.query.state)) {
        // Force TypeScript to accept string or falsy value
        const firstState = req.query.state[0] as unknown as string;
        stateParam = firstState || '';
      } else {
        // Handle case when it's a ParsedQs object
        // Use explicit casting to avoid TypeScript errors
        stateParam = String(req.query.state as any);
      }
        
      req.session.oauthState = stateParam;
      req.session.oauthPending = true;
      
      // Explicitly save session before redirecting to Google
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session before Google redirect:", err);
          return res.redirect('/login?error=session-save-error');
        }
        
        // Continue with Google authentication
        passport.authenticate("google", { 
          scope: ["profile", "email"],
          state: stateParam
        })(req, res, next);
      });
    } else {
      // Continue without explicit session save
      passport.authenticate("google", { 
        scope: ["profile", "email"] 
      })(req, res, next);
    }
  });

  // Google OAuth callback endpoint with enhanced session handling
  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login?error=google-auth-failed" }),
    (req: Request, res: Response) => {
      try {
        console.log("OAuth callback received, user authenticated");
        
        // Log session and user details
        const userId = req.user ? (req.user as any).id : 'none';
        const sessionID = req.sessionID || 'none';
        const sessionExists = !!req.session;
        const hasOAuthState = req.session ? !!req.session.oauthState : false;
        const oauthPending = req.session ? !!req.session.oauthPending : false;
        
        console.log(`OAuth callback details: userId=${userId}, sessionID=${sessionID}, sessionExists=${sessionExists}, hasOAuthState=${hasOAuthState}, oauthPending=${oauthPending}`);
        
        // Clear OAuth flags from session to prevent reuse
        if (req.session) {
          req.session.oauthState = undefined;
          req.session.oauthPending = false;
          req.session.oauthInitiatedAt = undefined;
          
          // Get preferred redirect path from session
          const redirectPath = req.session.originPath || '/dashboard';
          
          // Explicitly save updated session with callback
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session in OAuth callback:", err);
              return res.redirect('/dashboard'); // Default redirect
            }
            
            console.log(`OAuth login successful for user ${userId}, redirecting to ${redirectPath}`);
            res.redirect(redirectPath);
          });
        } else {
          console.error("No session available in OAuth callback, using default redirect");
          res.redirect('/dashboard');
        }
      } catch (error) {
        console.error("Error in OAuth callback handler:", error);
        // Fallback to dashboard on any error
        res.redirect('/dashboard');
      }
    }
  );

  // OAuth routes
  const oauthRouter = express.Router();
  
  // TypeScript workaround: Tell TypeScript that this storage is compatible
  // This is a temporary fix for the type mismatch between DatabaseStorage and IStorage
  // In a real production environment, we should properly update the interfaces
  const typeSafeStorage = storage as unknown as IStorage;
  
  app.use("/api/oauth", registerOAuthRoutes(oauthRouter, typeSafeStorage));

  // Google Maps API key endpoint
  app.get("/api/google-maps-key", (req: Request, res: Response) => {
    try {
      // Set appropriate cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Get Google Maps API key from environment variable
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
      
      if (!apiKey) {
        console.warn('GoogleMapsContext: API key not found in environment variables');
      } else {
        console.log(`GoogleMapsContext: API key loaded: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
      }
      
      return res.json({ apiKey });
    } catch (error) {
      console.error('Error serving Google Maps API key:', error);
      return res.status(500).json({ error: 'Failed to retrieve Google Maps API key' });
    }
  });

  return httpServer;
}