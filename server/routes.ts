import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { ParsedQs } from "qs"; // Import the ParsedQs type for query parameters
import { storage, IStorage } from "./storage";
import { User, Organization } from "@shared/schema";
import emailRoutes from "./email-routes";
import fleetmaticsRoutes from "./routes/fleetmatics-routes";
import inventoryRoutes from "./routes/inventory-routes";
import invitationRoutes from "./routes/invitation-routes";
import stripeRoutes from "./routes/stripe-routes";
import registerOAuthRoutes from "./routes/oauth-routes";
import registerUserOrgRoutes from "./routes/user-org-routes";
import authRoutes from "./routes/auth-routes";
import bazzaRoutes from "./routes/bazza-routes";
import passport from "passport";
import { isAuthenticated, isAdmin, isSystemAdmin } from "./auth";
import { authRateLimiter, apiRateLimiter, oauthRateLimiter } from "./middleware/rateLimiter";

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

  // Register authentication routes with /api/auth prefix and rate limiting
  app.use("/api/auth", authRateLimiter, authRoutes);
  
  // Register bazza routes with /api/bazza prefix
  app.use("/api/bazza", bazzaRoutes);
  
  // Get technicians endpoint
  app.get("/api/technicians", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("[TECHNICIANS API] Processing request for technicians list");
      const reqUser = req.user as any;
      
      // Log user details for debugging
      console.log(`[TECHNICIANS API] Request by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      
      // Fetch technicians based on user's permissions
      let technicians;
      
      if (reqUser.role === 'system_admin') {
        // System admins can see all technicians with user info
        technicians = await storage.getAllTechniciansWithUsers();
        console.log(`[TECHNICIANS API] System admin - fetching all technicians with users (${technicians.length})`);
      } else if (reqUser.organizationId) {
        // Regular users get technicians from their organization only with user info
        technicians = await storage.getTechniciansByOrganizationIdWithUsers(reqUser.organizationId);
        console.log(`[TECHNICIANS API] Regular user - fetching technicians with users for organization ${reqUser.organizationId} (${technicians.length})`);
      } else {
        console.error("[TECHNICIANS API] User has no organization ID:", reqUser);
        return res.status(400).json({ error: "Invalid user data - missing organization" });
      }
      
      // Return technicians with basic logging
      console.log(`[TECHNICIANS API] Returning ${technicians.length} technicians with user data`);
      res.json(technicians);
    } catch (error) {
      console.error("[TECHNICIANS API] Error processing technicians request:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });
  
  // Technicians with users endpoint (requiring authentication)
  app.get("/api/technicians-with-users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("[TECHNICIANS API] Processing request for technicians list");
      const reqUser = req.user as any;
      
      // Log user details for debugging
      console.log(`[TECHNICIANS API] Request by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      
      // Fetch technicians based on user's permissions
      let technicians;
      
      if (reqUser.role === 'system_admin') {
        // System admins can see all technicians with user info
        console.log(`[TECHNICIANS API] System admin detected - about to fetch all technicians`);
        technicians = await storage.getAllTechniciansWithUsers();
        console.log(`[TECHNICIANS API] System admin - fetching all technicians with users (${technicians?.length || 0})`);
        
        // Debug the first technician in detail 
        if (technicians && technicians.length > 0) {
          const techSample = technicians[0];
          console.log("[TECHNICIANS API] First technician detail:", {
            technicianId: techSample.id,
            userId: techSample.userId,
            hasUser: !!techSample.user,
            userName: techSample.user?.name,
            userEmail: techSample.user?.email,
            active: techSample.active
          });
        }
      } else if (reqUser.organizationId) {
        // Regular users get technicians from their organization only with user info
        technicians = await storage.getTechniciansByOrganizationIdWithUsers(reqUser.organizationId);
        console.log(`[TECHNICIANS API] Regular user - fetching technicians with users for organization ${reqUser.organizationId} (${technicians.length})`);
      } else {
        console.error("[TECHNICIANS API] User has no organization ID:", reqUser);
        return res.status(400).json({ error: "Invalid user data - missing organization" });
      }
      
      // Fix any technicians with missing user data to prevent frontend errors
      if (technicians && technicians.length > 0) {
        technicians = technicians.map(tech => {
          if (!tech.user) {
            return {
              ...tech,
              user: {
                id: tech.userId,
                name: `Technician #${tech.id}`,
                email: null
              }
            };
          }
          return tech;
        });
      }
      
      // Return technicians with basic logging
      console.log(`[TECHNICIANS API] Returning ${technicians.length} technicians with user data`);
      res.json(technicians);
    } catch (error) {
      console.error("[TECHNICIANS API] Error processing technicians request:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });
  
  // Create technician endpoint - this creates both a user and a technician record
  app.post("/api/technicians/create", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("[TECHNICIANS API] Processing request to create technician");
      const reqUser = req.user as any;
      
      // Log the authenticated user making the request
      console.log(`[TECHNICIANS API] Create request by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      
      // Validate that the request has all required data
      const { user, specialization, certifications, rate, notes } = req.body;
      
      if (!user || !user.name || !user.email) {
        return res.status(400).json({ error: "Missing required user data" });
      }
      
      if (!specialization) {
        return res.status(400).json({ error: "Specialization is required" });
      }
      
      // Check if a user with this email already exists
      const existingUser = await storage.getUserByEmail(user.email);
      if (existingUser) {
        return res.status(409).json({ error: "A user with this email already exists" });
      }
      
      // Generate a username from email if not provided
      const username = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
      
      try {
        // Create the user first
        const newUser = await storage.createUser({
          username,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          address: user.address || null,
          role: 'technician', // Set role to technician
          active: true,
          // Use the organization ID from the authenticated user
          organizationId: reqUser.organizationId,
          // Set temporary password (should be changed on first login)
          password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        });
        
        // Now create the technician with the newly created user ID
        const newTechnician = await storage.createTechnician({
          userId: newUser.id,
          specialization,
          certifications: certifications || null
        });
        
        console.log(`[TECHNICIANS API] Successfully created technician with ID: ${newTechnician.id} for user ID: ${newUser.id}`);
        
        // Return the combined user and technician data
        res.status(201).json({
          ...newTechnician,
          user: newUser,
          rate,
          notes
        });
      } catch (error) {
        console.error("[TECHNICIANS API] Error creating technician or user:", error);
        res.status(500).json({ error: "Failed to create technician" });
      }
    } catch (error) {
      console.error("[TECHNICIANS API] Error processing technician creation request:", error);
      res.status(500).json({ error: "Failed to process technician creation request" });
    }
  });

  // Google OAuth routes setup for login and signup
  
  // OAuth state clearing endpoint for switching accounts
  app.post('/api/auth/clear-oauth-state', (req: Request, res: Response) => {
    try {
      console.log("Clearing OAuth state for account switching");
      
      // Clear session OAuth-related data
      if (req.session) {
        delete req.session.oauthState;
        delete req.session.oauthPending;
        delete req.session.oauthInitiatedAt;
        delete req.session.originPath;
        
        // Save session explicitly to ensure changes are persisted
        req.session.save((err) => {
          if (err) {
            console.error("Error clearing OAuth session state:", err);
            return res.status(500).json({ 
              success: false, 
              message: 'Failed to clear OAuth state',
              error: err.message
            });
          }
          
          // Clear OAuth cookies too
          res.clearCookie('oauth_token');
          res.clearCookie('oauth_flow');
          res.clearCookie('oauth_timestamp');
          
          return res.json({ 
            success: true, 
            message: 'OAuth state cleared successfully'
          });
        });
      } else {
        // Even if there's no session, clear cookies
        res.clearCookie('oauth_token');
        res.clearCookie('oauth_flow');
        res.clearCookie('oauth_timestamp');
        
        res.json({ 
          success: true, 
          message: 'No active session, cookies cleared'
        });
      }
    } catch (error) {
      console.error("Error clearing OAuth state:", error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error during OAuth state clearing'
      });
    }
  });
  
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

  // Session check endpoint - Simplified version
  app.get("/api/auth/session", (req: Request, res: Response) => {
    // Set headers to prevent caching of session information
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (req.isAuthenticated()) {
      // Don't send password to the client
      const { password, ...userWithoutPassword } = req.user as any;
      
      // Log successful authentication
      console.log(`Session check: Authenticated user: ${userWithoutPassword.email} (${userWithoutPassword.id})`);
      
      return res.json({ 
        isAuthenticated: true, 
        user: userWithoutPassword,
      });
    } else {
      // Not authenticated
      console.log(`Session check: Not authenticated`);
      
      return res.json({
        isAuthenticated: false
      });
    }
  });

  // Google OAuth endpoint - enhanced version with improved state handling
  app.get("/api/auth/google", (req, res, next) => {
    console.log("Google OAuth initiation request received");
    
    // Basic error handling for Google OAuth
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    
    // Check if Google credentials are configured
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Google OAuth credentials missing");
      return res.redirect('/login?error=google-credentials-missing');
    }
    
    // Get state parameter from query string
    const state = req.query.state as string;
    const promptValue = req.query.prompt as string;
    
    // Create authentication options
    const authOptions: any = {
      scope: ["profile", "email"]
    };
    
    // Add state parameter if it exists
    if (state) {
      authOptions.state = state;
      console.log(`Using provided OAuth state: ${state}`);
      
      // Store state parameter in session if available
      if (req.session) {
        req.session.oauthState = state;
        req.session.oauthPending = true;
      }
    }
    
    // Add prompt parameter if it exists (for account selection)
    if (promptValue === 'select_account') {
      authOptions.prompt = 'select_account';
      console.log('Using select_account prompt for Google OAuth');
    }
    
    // Log request details for debugging
    console.log('Google OAuth request details:');
    console.log('- Headers:', JSON.stringify(req.headers, null, 2).substring(0, 500) + '...');
    console.log('- Query params:', JSON.stringify(req.query, null, 2));
    console.log('- Auth options:', JSON.stringify(authOptions, null, 2));
    
    // Continue with Google authentication, now using our enhanced options
    passport.authenticate("google", authOptions)(req, res, next);
  });

  // Google OAuth callback endpoint - enhanced version with improved token handling and timeout fixes
  app.get("/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        // Log information about the callback state
        console.log("OAuth callback received, processing authentication");
        console.log("- Session exists:", !!req.session);
        console.log("- Session ID:", req.sessionID || "none");
        console.log("- OAuth state from query:", req.query.state || "none");
        console.log("- OAuth state in session:", req.session?.oauthState || "none");
        console.log("- OAuth pending flag:", req.session?.oauthPending || false);
        console.log("- Headers present:", Object.keys(req.headers).join(", "));
        console.log("- Cookies from header:", req.headers.cookie?.substring(0, 100) || "none");
        
        // Check for the presence of error params from Google
        if (req.query.error) {
          console.error(`Google OAuth error: ${req.query.error}`);
          if (req.query.error === 'access_denied') {
            return res.redirect('/?error=access-denied');
          }
          return res.redirect('/?error=google-error');
        }
        
        // Attempt to recover state from various sources
        // 1. Try to get from query parameter
        const queryState = req.query.state as string;
        // 2. Try to get from session
        let sessionState = req.session?.oauthState;
        // 3. Try to get from cookies
        const cookieState = req.cookies?.oauth_token;
        
        // If we don't have state in session but have it elsewhere, restore it
        if (!sessionState) {
          if (cookieState) {
            console.log("Restoring OAuth state from cookie:", cookieState);
            if (req.session) req.session.oauthState = cookieState;
            sessionState = cookieState;
          } else if (queryState) {
            console.log("Using query state as fallback:", queryState);
            if (req.session) req.session.oauthState = queryState;
            sessionState = queryState;
          }
        }
        
        // Log state comparison for debugging
        console.log("State comparison:");
        console.log("- Query state:", queryState || "none");
        console.log("- Session state:", sessionState || "none");
        console.log("- Cookie state:", cookieState || "none");
        
        // Check if we have a code but no state (common edge case)
        if (req.query.code && !queryState) {
          console.log("OAuth callback has code but no state, proceeding anyway");
        }
        
        // Ensure session exists before proceeding
        if (!req.session) {
          console.error("No session object in callback request - creating new one");
          // We'll continue and let passport handle it, but log the error
        }
        
        // Set a short timeout for the auth process to avoid hanging
        res.setTimeout(10000, () => {
          console.error("Google OAuth callback timed out");
          res.redirect('/?error=authentication-timeout');
        });
        
        next();
      } catch (error) {
        console.error("Error in OAuth callback preprocessing:", error);
        return res.redirect('/?error=oauth-process-error');
      }
    },
    passport.authenticate("google", { 
      failureRedirect: "/?error=google-auth-failed",
      failureMessage: "Failed to authenticate with Google",
      // Add session: true to ensure we're using session-based auth
      session: true
    }),
    (req: Request, res: Response) => {
      try {
        console.log("OAuth authentication successful, processing user data");
        
        // Log authentication state in detail
        console.log("- Is Authenticated:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
        console.log("- User object present:", !!req.user);
        if (req.user) {
          const user = req.user as any;
          console.log("- User ID:", user.id);
          console.log("- User email:", user.email);
          console.log("- User role:", user.role);
        }
        
        // Clear OAuth state and related cookies
        if (req.session) {
          delete req.session.oauthState;
          delete req.session.oauthPending;
          delete req.session.oauthInitiatedAt;
        }
        
        // Clear all OAuth-related cookies
        res.clearCookie('oauth_token');
        res.clearCookie('oauth_flow');
        res.clearCookie('oauth_timestamp');
        res.clearCookie('oauth_source');
        
        // Verify user data is present
        if (!req.user) {
          console.error("No user object found after successful OAuth authentication");
          return res.redirect('/?error=missing-user-data');
        }
        
        // Get user details
        const user = req.user as any;
        console.log(`OAuth login successful for user ${user.email} (${user.id})`);
        
        // Check if user has required data
        if (!user.email) {
          console.error("User missing required email field");
          return res.redirect('/?error=incomplete-user-data');
        }
        
        // Now we need to verify the user exists in our database and has valid organization access
        // This is essential for proper authentication
        
        // First, verify the user exists with the provided ID
        console.log("Verifying user in database with ID:", user.id);
        storage.getUser(user.id)
          .then((dbUser: any) => {
            console.log("Database user lookup result:", dbUser ? "Found" : "Not Found");
            if (!dbUser) {
              console.error(`User ID ${user.id} not found in database after Google OAuth`);
              return res.redirect('/?error=user-not-found');
            }
            
            console.log("User verified in database:", dbUser.id);
            
            // Next, if the user has an organization ID, verify that organization exists
            if (dbUser.organizationId) {
              console.log("Verifying organization in database with ID:", dbUser.organizationId);
              return storage.getOrganization(dbUser.organizationId)
                .then((org: any) => {
                  console.log("Database organization lookup result:", org ? "Found" : "Not Found");
                  if (!org) {
                    console.error(`Organization ID ${dbUser.organizationId} not found for user ${dbUser.id}`);
                    return res.redirect('/?error=organization-not-found');
                  }
                  
                  console.log("Organization verified in database:", org.id, org.name);
                  
                  // Enhance the user object with organization details for the session
                  // Note: 'active' field is used instead of 'status' for organization state
                  const enhancedUser = {
                    ...dbUser,
                    organizationName: org.name,
                    organizationStatus: org.active ? 'active' : 'inactive'
                  };
                  
                  // Update the session user with the enhanced data
                  if (req.user) {
                    req.user = enhancedUser;
                  }
                  
                  // Now save session and redirect
                  return saveSessionAndRedirect(req, res, enhancedUser);
                });
            } else {
              // No organization ID, just save session and redirect
              return saveSessionAndRedirect(req, res, dbUser);
            }
          })
          .catch((error: unknown) => {
            console.error("Error verifying user in database:", error);
            return res.redirect('/?error=database-verification-failed');
          });
      } catch (error) {
        console.error("Error in OAuth callback handler:", error);
        // Log the full error stack
        if (error instanceof Error) {
          console.error("Error stack:", error.stack);
        }
        // Redirect to root path with error message
        res.redirect('/?error=oauth-callback-error');
      }
    }
  );
  
  // Helper function for saving session and redirecting after OAuth
  function saveSessionAndRedirect(req: Request, res: Response, user: any) {
    // Save session explicitly to ensure user data persistence
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session after OAuth login:", err);
        return res.redirect('/?error=session-save-failed');
      }
      
      console.log("Session saved successfully after OAuth login");
      console.log("- Session ID:", req.sessionID);
      console.log("- Cookie data sent:", !!res.getHeader('Set-Cookie'));
      
      // Add login success indicator to user object in session
      if (req.user) {
        (req.user as any).loginSuccess = true;
      }
      
      // Refresh the session data to ensure it's completely saved
      req.session.touch();
      
      // Assign the user to req.user if not already set
      if (!req.user) {
        req.user = user;
      }
      
      // Set proper authentication flag in session
      // Using type assertion to work around TypeScript limitations with session types
      (req.session as any).passport = (req.session as any).passport || {};
      (req.session as any).passport.user = user.id;
      
      // Redirect to appropriate page based on user role or organization status
      if (user.role === 'system_admin') {
        console.log("Redirecting system admin to admin dashboard");
        return res.redirect('/admin/dashboard');
      } else if (!user.organizationId) {
        console.log("User has no organization, redirecting to organization setup");
        return res.redirect('/subscription/setup');
      } else {
        console.log("Redirecting to main dashboard");
        return res.redirect('/dashboard');
      }
    });
  }

  // OAuth routes
  const oauthRouter = express.Router();
  
  // TypeScript workaround: Tell TypeScript that this storage is compatible
  // This is a temporary fix for the type mismatch between DatabaseStorage and IStorage
  // In a real production environment, we should properly update the interfaces
  const typeSafeStorage = storage as unknown as IStorage;
  
  app.use("/api/oauth", registerOAuthRoutes(oauthRouter, typeSafeStorage));

  // Clients API endpoints - for fetching clients with proper organization filtering
  
  // Get all clients endpoint
  app.get("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const reqUser = req.user as any;
      
      // Enhanced debugging information
      console.log("\n=================================================================");
      console.log("============== CLIENT API REQUEST DETAILED DEBUG ================");
      console.log("=================================================================");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Request Path:", req.path);
      console.log("Request Method:", req.method);
      console.log("Request User-Agent:", req.headers['user-agent']);
      
      console.log("\nAuthenticated User Details:");
      console.log({
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId,
        createdAt: reqUser.createdAt,
        updatedAt: reqUser.updatedAt
      });
      
      // Verify user's role specifically
      console.log(`\nRole check: "${reqUser.role}" (Type: ${typeof reqUser.role})`);
      console.log(`Is system_admin?: ${reqUser.role === 'system_admin'}`);
      console.log(`roleCheck1: ${reqUser.role == 'system_admin'}`);  // loose equality
      console.log(`roleCheck2: ${String(reqUser.role).trim() === 'system_admin'}`);  // trimmed string comparison
      
      // Verify that organizationId is a valid number
      if (reqUser.organizationId) {
        console.log(`\nOrganization ID type check: ${typeof reqUser.organizationId}`);
        console.log(`Organization ID value: ${reqUser.organizationId}`);
        
        if (typeof reqUser.organizationId !== 'number') {
          console.warn(`WARNING: organizationId is not a number, attempting to convert from: ${JSON.stringify(reqUser.organizationId)}`);
          reqUser.organizationId = parseInt(reqUser.organizationId as any, 10);
          console.log(`Converted organizationId to: ${reqUser.organizationId} (${typeof reqUser.organizationId})`);
        }
      }
      
      // Filter clients based on user's role and organization
      let clientsWithUsers = [];
      
      // Check the role with better handling for system admins
      const isSystemAdmin = String(reqUser.role).trim().toLowerCase() === 'system_admin';
      
      if (isSystemAdmin) {
        // System admin gets all clients with their user data
        console.log(`\n[CLIENTS API] System admin role detected (${reqUser.email}) - fetching ALL clients via getAllClientsWithUsers()`);
        
        // For Travis's specific account - add special debugging
        if (reqUser.email === 'travis@smartwaterpools.com') {
          console.log("[CLIENTS API] Special handling for Travis's account");
        }
        
        // Directly check if data exists in the database
        try {
          const allClients = await typeSafeStorage.getAllClients();
          console.log(`[CLIENTS API] Raw getAllClients() response: Found ${allClients.length} clients`);
          
          // Check organizations present in the data
          const organizationIds = [...new Set(allClients.map(c => c.organizationId))];
          console.log(`[CLIENTS API] Organizations present in clients data: ${JSON.stringify(organizationIds)}`);
          
          // Get just those with organization_id = 1 for debugging
          const org1Clients = allClients.filter(c => c.organizationId === 1);
          console.log(`[CLIENTS API] Found ${org1Clients.length} clients with organizationId=1 directly from getAllClients()`);
          
          if (org1Clients.length > 0) {
            console.log("[CLIENTS API] Sample clients with organizationId=1:", 
              org1Clients.slice(0, Math.min(3, org1Clients.length)).map(c => ({
                id: c.id, 
                userId: c.userId, 
                organizationId: c.organizationId,
                companyName: c.companyName
              }))
            );
          }
        } catch (err) {
          console.error("[CLIENTS API] Error during database verification:", err);
        }
        
        // Ensure we're using the right method for system admins
        try {
          clientsWithUsers = await typeSafeStorage.getAllClientsWithUsers();
          console.log(`[CLIENTS API] getAllClientsWithUsers() returned ${clientsWithUsers.length} clients`);
        } catch (err) {
          console.error("[CLIENTS API] Error during getAllClientsWithUsers:", err);
          
          // Fallback approach if the standard method fails
          console.log("[CLIENTS API] Trying fallback approach for system admin...");
          
          try {
            // Get all clients first
            const allClients = await typeSafeStorage.getAllClients();
            console.log(`[CLIENTS API] Fallback: Found ${allClients.length} raw clients`);
            
            // Manually construct the ClientWithUser objects
            clientsWithUsers = await Promise.all(
              allClients.map(async (client) => {
                try {
                  const user = await typeSafeStorage.getUserById(client.userId);
                  return { client, user };
                } catch (e) {
                  console.error(`[CLIENTS API] Error getting user for client ${client.id}:`, e);
                  // Return with minimal user data for error cases
                  return { 
                    client, 
                    user: { 
                      id: client.userId, 
                      name: "Unknown User", 
                      email: "unknown@example.com",
                      role: "client"
                    } 
                  };
                }
              })
            );
            
            console.log(`[CLIENTS API] Fallback method built ${clientsWithUsers.length} client records`);
          } catch (fallbackErr) {
            console.error("[CLIENTS API] Fallback approach also failed:", fallbackErr);
          }
        }
      } else if (reqUser.organizationId) {
        // Regular users get clients from their organization only
        console.log(`\n[CLIENTS API] Standard user with organization ${reqUser.organizationId} - fetching filtered clients`);
        
        // Direct database check for debugging
        try {
          const directOrgClients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          console.log(`[CLIENTS API] getClientsByOrganizationId(${reqUser.organizationId}) returned ${directOrgClients.length} clients directly`);
        } catch (err) {
          console.error(`[CLIENTS API] Error during direct organization check:`, err);
        }
        
        clientsWithUsers = await typeSafeStorage.getClientsWithUsersByOrganizationId(reqUser.organizationId);
      } else {
        console.error("\n[CLIENTS API] ERROR: User has no organization ID:", reqUser);
        return res.status(400).json({ 
          error: "Invalid user data - missing organization" 
        });
      }
      
      console.log(`\n[CLIENTS API] Retrieved ${clientsWithUsers.length} clients with user data`);
      
      // Log the response data for debugging
      if (clientsWithUsers.length > 0) {
        console.log("[CLIENTS API] Sample client data from final response:", 
          clientsWithUsers.slice(0, Math.min(3, clientsWithUsers.length))
            .map(c => ({
              clientId: c.client?.id,
              companyName: c.client?.companyName,
              clientUserId: c.client?.userId,
              clientOrgId: c.client?.organizationId,
              userName: c.user?.name,
              userEmail: c.user?.email,
              userRole: c.user?.role,
              userOrgId: c.user?.organizationId
            }))
        );
      } else {
        console.warn("[CLIENTS API] WARNING: No clients found to return");
      }
      
      console.log("=================================================================\n");
      
      // Return the data to the client
      res.json(clientsWithUsers);
    } catch (error) {
      console.error("[CLIENTS API] ERROR: Exception during client data processing:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get client by ID endpoint
  app.get("/api/clients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("\n=================================================================");
      console.log("============= CLIENT DETAIL API REQUEST DEBUG ===================");
      console.log("=================================================================");
      
      const reqUser = req.user as any;
      const clientId = parseInt(req.params.id, 10);
      
      console.log(`[CLIENT DETAIL API] Request for client ID: ${clientId} by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      
      // Get the client with user data
      const clientWithUser = await typeSafeStorage.getClientWithUser(clientId);
      
      if (!clientWithUser) {
        console.log(`[CLIENT DETAIL API] Client with ID ${clientId} not found`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Check if the user has permission to access this client's data
      const hasAccess = 
        reqUser.role === 'system_admin' || // System admins can see everything
        (reqUser.organizationId && reqUser.organizationId === clientWithUser.client.organizationId); // User's org matches client's org
      
      if (!hasAccess) {
        console.log(`[CLIENT DETAIL API] Access denied for user ${reqUser.id} to client ${clientId}`);
        console.log(`User org: ${reqUser.organizationId}, Client org: ${clientWithUser.client.organizationId}`);
        return res.status(403).json({ error: "Access denied" });
      }
      
      console.log(`[CLIENT DETAIL API] Access granted for user ${reqUser.id} to client ${clientId}`);
      
      // Add convenient top-level properties for the frontend
      const clientResponse = {
        ...clientWithUser,
        // Add properties that ClientDetails.tsx expects
        id: clientWithUser.client.id,
        companyName: clientWithUser.client.companyName,
        contractType: clientWithUser.client.contractType,
        // Add address fields if available
        address: clientWithUser.client.address,
        city: clientWithUser.client.city,
        state: clientWithUser.client.state,
        zipCode: clientWithUser.client.zip,
        phone: clientWithUser.client.phone,
        // Pool details will be added by other endpoints
        poolType: null,
        poolSize: null,
        filterType: null,
        chemicalSystem: null,
        heaterType: null,
        poolFeatures: "",
        serviceDay: null,
        specialNotes: clientWithUser.client.notes || null,
      };
      
      console.log(`[CLIENT DETAIL API] Returning client data with user info`);
      res.json(clientResponse);
    } catch (error) {
      console.error("[CLIENT DETAIL API] Error fetching client details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard summary data endpoint
  app.get("/api/dashboard/summary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const reqUser = req.user as any;
      let projects, maintenances, repairs, clients;
      
      // Filter by organization if user is not system_admin
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        console.log(`Fetching dashboard data for organization ${reqUser.organizationId}`);
        
        // Get organization-specific data using Promise.all for parallel execution
        const [allProjects, allMaintenances, allRepairs] = await Promise.all([
          typeSafeStorage.getAllProjects(),
          typeSafeStorage.getUpcomingMaintenances(7),
          typeSafeStorage.getRecentRepairs(5)
        ]);
        
        // Get relevant clients
        clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
        
        // Filter projects by matching clients from the same organization
        const clientIds = new Set(clients.map(client => client.id));
        projects = allProjects.filter(project => clientIds.has(project.clientId));
        
        // Filter maintenances by matching clients from the same organization
        maintenances = allMaintenances.filter(maintenance => clientIds.has(maintenance.clientId));
        
        // Filter repairs by matching clients from the same organization
        repairs = allRepairs.filter(repair => clientIds.has(repair.clientId));
        
        console.log(`Found ${projects.length} projects, ${maintenances.length} maintenances, ${repairs.length} repairs, ${clients.length} clients`);
      } else {
        // System admin gets all data
        console.log("Fetching all dashboard data (system admin)");
        [projects, maintenances, repairs, clients] = await Promise.all([
          typeSafeStorage.getAllProjects(),
          typeSafeStorage.getUpcomingMaintenances(7),
          typeSafeStorage.getRecentRepairs(5),
          typeSafeStorage.getAllClients()
        ]);
      }
      
      const summary = {
        metrics: {
          activeProjects: projects.filter(p => p.status !== "completed").length,
          maintenanceThisWeek: maintenances.length,
          pendingRepairs: repairs.filter(r => r.status !== "completed").length,
          totalClients: clients.length
        },
        recentProjects: await Promise.all(
          projects
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
            .slice(0, 5)
            .map(async (project) => {
              const clientWithUser = await typeSafeStorage.getClientWithUser(project.clientId);
              const assignments = await typeSafeStorage.getProjectAssignments(project.id);

              return {
                ...project,
                client: clientWithUser,
                assignmentCount: assignments.length
              };
            })
        ),
        upcomingMaintenances: await Promise.all(
          maintenances.slice(0, 5).map(async (maintenance) => {
            const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;

            if (maintenance.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
            }

            return {
              ...maintenance,
              client: clientWithUser,
              technician: technicianWithUser
            };
          })
        ),
        recentRepairs: await Promise.all(
          repairs.map(async (repair) => {
            const clientWithUser = await typeSafeStorage.getClientWithUser(repair.clientId);
            let technicianWithUser = null;

            if (repair.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(repair.technicianId);
            }

            return {
              ...repair,
              client: clientWithUser,
              technician: technicianWithUser
            };
          })
        )
      };

      res.json(summary);
    } catch (error) {
      console.error("Dashboard summary error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // User and Organization management routes
  const userRouter = express.Router();
  app.use("/api/users", registerUserOrgRoutes(userRouter, typeSafeStorage, true));

  // Organization management routes
  const organizationRouter = express.Router();
  app.use("/api/organizations", registerUserOrgRoutes(organizationRouter, typeSafeStorage, false));

  // Client equipment endpoint
  app.get("/api/clients/:id/equipment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      console.log(`[API] Request for equipment for client ID: ${clientId}`);
      
      // For now, return an empty array until we implement equipment functionality
      return res.json([]);
    } catch (error) {
      console.error("[API] Error fetching client equipment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Client pool images endpoint
  app.get("/api/clients/:id/images", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      console.log(`[API] Request for images for client ID: ${clientId}`);
      
      // For now, return an empty array until we implement images functionality
      return res.json([]);
    } catch (error) {
      console.error("[API] Error fetching client images:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Upcoming maintenances endpoint
  app.get("/api/maintenances/upcoming", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("\n[UPCOMING MAINTENANCES API] Processing request for upcoming maintenances");
      const reqUser = req.user as any;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string, 10) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      let upcomingMaintenances = [];
      
      if (!reqUser) {
        console.error("[UPCOMING MAINTENANCES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if user is system admin or has an organization ID
      console.log(`[UPCOMING MAINTENANCES API] User role: ${reqUser.role}, Organization ID: ${reqUser.organizationId}, ClientID filter: ${clientId}, Days: ${days}`);
      
      // First get all upcoming maintenances within the specified days
      const allUpcomingMaintenances = await typeSafeStorage.getUpcomingMaintenances(days);
      console.log(`[UPCOMING MAINTENANCES API] Retrieved ${allUpcomingMaintenances.length} total upcoming maintenances for next ${days} days`);
      
      if (reqUser.role === "system_admin") {
        console.log("[UPCOMING MAINTENANCES API] User is system admin");
        
        if (clientId) {
          // If clientId is specified, fetch maintenances for that client only
          console.log(`[UPCOMING MAINTENANCES API] Filtering by specific client ID: ${clientId}`);
          upcomingMaintenances = allUpcomingMaintenances.filter(maintenance => maintenance.clientId === clientId);
        } else {
          // System admin with no clientId filter gets all upcoming maintenances
          upcomingMaintenances = allUpcomingMaintenances;
        }
      } else if (reqUser.organizationId) {
        console.log(`[UPCOMING MAINTENANCES API] Regular user with organization ID: ${reqUser.organizationId}`);
        
        if (clientId) {
          // If clientId is specified, we need to verify that client belongs to user's organization
          const client = await typeSafeStorage.getClient(clientId);
          if (client && client.organizationId === reqUser.organizationId) {
            console.log(`[UPCOMING MAINTENANCES API] Filtering by client ID: ${clientId} (verified in organization ${reqUser.organizationId})`);
            upcomingMaintenances = allUpcomingMaintenances.filter(maintenance => maintenance.clientId === clientId);
          } else {
            console.error(`[UPCOMING MAINTENANCES API] Client ID ${clientId} is not in user's organization`);
            return res.status(403).json({ error: "Access denied to this client's data" });
          }
        } else {
          // Filter maintenances by organization's clients
          console.log(`[UPCOMING MAINTENANCES API] Filtering by all clients in organization ${reqUser.organizationId}`);
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          // Filter maintenances that belong to clients in the user's organization
          upcomingMaintenances = allUpcomingMaintenances.filter(maintenance => clientIds.has(maintenance.clientId));
        }
      } else {
        console.error("[UPCOMING MAINTENANCES API] User has no organization ID:", reqUser);
        return res.status(400).json({ 
          error: "Invalid user data - missing organization" 
        });
      }
      
      console.log(`[UPCOMING MAINTENANCES API] Retrieved ${upcomingMaintenances.length} filtered upcoming maintenances`);
      
      // Enhance maintenances with client and technician data
      const enhancedMaintenances = await Promise.all(
        upcomingMaintenances.map(async (maintenance) => {
          try {
            const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;
            
            if (maintenance.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
            }
            
            return {
              ...maintenance,
              client: clientWithUser || {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: technicianWithUser ? {
                id: technicianWithUser.technician.id,
                userId: technicianWithUser.technician.userId,
                user: {
                  id: technicianWithUser.user.id,
                  name: technicianWithUser.user.name,
                  email: technicianWithUser.user.email
                }
              } : null
            };
          } catch (error) {
            console.error(`[UPCOMING MAINTENANCES API] Error enhancing maintenance ${maintenance.id}:`, error);
            return {
              ...maintenance,
              client: {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: null
            };
          }
        })
      );
      
      console.log(`[UPCOMING MAINTENANCES API] Returning ${enhancedMaintenances.length} enhanced upcoming maintenances`);
      res.json(enhancedMaintenances);
    } catch (error) {
      console.error("[UPCOMING MAINTENANCES API] Error fetching upcoming maintenances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Projects list endpoint
  app.get("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("\n[PROJECTS API] Processing request for projects list");
      const reqUser = req.user as any;
      let projects = [];
      
      if (!reqUser) {
        console.error("[PROJECTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if user is system admin or has an organization ID
      console.log(`[PROJECTS API] User role: ${reqUser.role}, Organization ID: ${reqUser.organizationId}`);
      
      if (reqUser.role === "system_admin") {
        console.log("[PROJECTS API] User is system admin, fetching all projects");
        // System admin gets all projects
        projects = await typeSafeStorage.getAllProjects();
        console.log(`[PROJECTS API] Retrieved ${projects.length} projects for system admin`);
      } else if (reqUser.organizationId) {
        console.log(`[PROJECTS API] Fetching projects for organization ${reqUser.organizationId}`);
        // Regular users get projects for their organization
        const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
        const clientIds = new Set(clients.map(client => client.id));
        const allProjects = await typeSafeStorage.getAllProjects();
        
        // Filter projects that belong to clients in the user's organization
        projects = allProjects.filter(project => clientIds.has(project.clientId));
        console.log(`[PROJECTS API] Retrieved ${projects.length} projects for organization ${reqUser.organizationId}`);
      } else {
        console.error("[PROJECTS API] User has no organization ID:", reqUser);
        return res.status(400).json({ 
          error: "Invalid user data - missing organization" 
        });
      }
      
      // Enhance projects with client data
      const enhancedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            const clientWithUser = await typeSafeStorage.getClientWithUser(project.clientId);
            return {
              ...project,
              client: clientWithUser ? {
                id: clientWithUser.client.id,
                user: {
                  id: clientWithUser.user.id,
                  name: clientWithUser.user.name
                },
                companyName: clientWithUser.client.companyName
              } : { id: project.clientId, user: { id: 0, name: "Unknown" }, companyName: "" }
            };
          } catch (error) {
            console.error(`[PROJECTS API] Error enhancing project ${project.id}:`, error);
            return {
              ...project,
              client: { id: project.clientId, user: { id: 0, name: "Unknown" }, companyName: "" }
            };
          }
        })
      );
      
      console.log(`[PROJECTS API] Returning ${enhancedProjects.length} projects`);
      res.json(enhancedProjects);
    } catch (error) {
      console.error("[PROJECTS API] Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get project by ID endpoint
  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT DETAILS API] Processing request for project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      
      if (isNaN(projectId)) {
        console.error("[PROJECT DETAILS API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT DETAILS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the project
      const project = await typeSafeStorage.getProject(projectId);
      
      if (!project) {
        console.error(`[PROJECT DETAILS API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Check if user has access to this project
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DETAILS API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DETAILS API] User from organization ${reqUser.organizationId} not authorized to access project for client ${project.clientId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // For client users, check if the project belongs to them
          console.error(`[PROJECT DETAILS API] Client user ${reqUser.id} not authorized to access project for client ${project.clientId}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
        }
      }
      
      // Enhance project with client data
      const clientWithUser = await typeSafeStorage.getClientWithUser(project.clientId);
      const enhancedProject = {
        ...project,
        client: clientWithUser ? {
          id: clientWithUser.client.id,
          user: {
            id: clientWithUser.user.id,
            name: clientWithUser.user.name,
            email: clientWithUser.user.email,
            username: clientWithUser.user.username,
            role: clientWithUser.user.role
          },
          companyName: clientWithUser.client.companyName,
          phone: clientWithUser.client.phone,
          address: clientWithUser.client.address
        } : { 
          id: project.clientId, 
          user: { 
            id: 0, 
            name: "Unknown", 
            email: "", 
            username: "", 
            role: "" 
          }, 
          companyName: "" 
        }
      };
      
      console.log(`[PROJECT DETAILS API] Successfully retrieved project details for ID: ${projectId}`);
      res.json(enhancedProject);
    } catch (error) {
      console.error("[PROJECT DETAILS API] Error fetching project details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get project phases endpoint
  app.get("/api/projects/:id/phases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT PHASES API] Processing request for phases of project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      
      if (isNaN(projectId)) {
        console.error("[PROJECT PHASES API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(projectId);
      
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Check if user has access to this project's phases
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to access phases for project ${project.id}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this project's phases" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // For client users, check if the project belongs to them
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to access phases for project ${project.id}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this project's phases" });
        }
      }
      
      // Get project phases
      const phases = await typeSafeStorage.getProjectPhasesByProjectId(projectId);
      
      // Sort phases by order
      const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
      
      console.log(`[PROJECT PHASES API] Retrieved ${sortedPhases.length} phases for project ID: ${projectId}`);
      res.json(sortedPhases);
    } catch (error) {
      console.error("[PROJECT PHASES API] Error fetching project phases:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get project documents endpoint
  app.get("/api/projects/:id/documents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT DOCUMENTS API] Processing request for documents of project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      
      if (isNaN(projectId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(projectId);
      
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Check if user has access to this project's documents
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to access documents for project ${project.id}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this project's documents" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // For client users, check if the project belongs to them
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to access documents for project ${project.id}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this project's documents" });
        }
      }
      
      // Get project documents
      const documents = await typeSafeStorage.getProjectDocumentsByProjectId(projectId);
      
      // For client users, only return public documents
      if (reqUser.role === "client" && reqUser.clientId === project.clientId) {
        const publicDocuments = documents.filter(doc => doc.isPublic);
        console.log(`[PROJECT DOCUMENTS API] Client user: filtering ${documents.length} documents down to ${publicDocuments.length} public documents`);
        return res.json(publicDocuments);
      }
      
      console.log(`[PROJECT DOCUMENTS API] Retrieved ${documents.length} documents for project ID: ${projectId}`);
      res.json(documents);
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error fetching project documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get documents by phase ID endpoint
  app.get("/api/phases/:id/documents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PHASE DOCUMENTS API] Processing request for documents of phase with ID: ${req.params.id}`);
      const phaseId = parseInt(req.params.id, 10);
      
      if (isNaN(phaseId)) {
        console.error("[PHASE DOCUMENTS API] Invalid phase ID:", req.params.id);
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PHASE DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the phase to check authorization
      const phase = await typeSafeStorage.getProjectPhase(phaseId);
      
      if (!phase) {
        console.error(`[PHASE DOCUMENTS API] Phase not found with ID: ${phaseId}`);
        return res.status(404).json({ error: "Phase not found" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(phase.projectId);
      
      if (!project) {
        console.error(`[PHASE DOCUMENTS API] Project not found for phase ID: ${phaseId}`);
        return res.status(404).json({ error: "Project not found for this phase" });
      }
      
      // Check if user has access to this phase's documents
      if (reqUser.role !== "system_admin") {
        console.log(`[PHASE DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PHASE DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to access documents for phase ${phase.id}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this phase's documents" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // For client users, check if the project belongs to them
          console.error(`[PHASE DOCUMENTS API] Client user ${reqUser.id} not authorized to access documents for phase ${phase.id}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this phase's documents" });
        }
      }
      
      // Get phase documents
      const documents = await typeSafeStorage.getProjectDocumentsByPhaseId(phaseId);
      
      // For client users, only return public documents
      if (reqUser.role === "client" && reqUser.clientId === project.clientId) {
        const publicDocuments = documents.filter(doc => doc.isPublic);
        console.log(`[PHASE DOCUMENTS API] Client user: filtering ${documents.length} documents down to ${publicDocuments.length} public documents`);
        return res.json(publicDocuments);
      }
      
      console.log(`[PHASE DOCUMENTS API] Retrieved ${documents.length} documents for phase ID: ${phaseId}`);
      res.json(documents);
    } catch (error) {
      console.error("[PHASE DOCUMENTS API] Error fetching phase documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Maintenance history endpoint
  app.get("/api/maintenances", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("\n[MAINTENANCES API] Processing request for maintenances list");
      const reqUser = req.user as any;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string, 10) : undefined;
      let maintenances = [];
      
      if (!reqUser) {
        console.error("[MAINTENANCES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check if user is system admin or has an organization ID
      console.log(`[MAINTENANCES API] User role: ${reqUser.role}, Organization ID: ${reqUser.organizationId}, ClientID filter: ${clientId}`);
      
      if (reqUser.role === "system_admin") {
        console.log("[MAINTENANCES API] User is system admin");
        
        if (clientId) {
          // If clientId is specified, fetch maintenances for that client only
          console.log(`[MAINTENANCES API] Fetching maintenances for specific client ID: ${clientId}`);
          maintenances = await typeSafeStorage.getMaintenancesByClientId(clientId);
        } else {
          // System admin with no clientId filter gets all maintenances
          console.log("[MAINTENANCES API] Fetching all maintenances");
          maintenances = await typeSafeStorage.getAllMaintenances();
        }
      } else if (reqUser.organizationId) {
        console.log(`[MAINTENANCES API] Regular user with organization ID: ${reqUser.organizationId}`);
        
        if (clientId) {
          // If clientId is specified, we need to verify that client belongs to user's organization
          const client = await typeSafeStorage.getClient(clientId);
          if (client && client.organizationId === reqUser.organizationId) {
            console.log(`[MAINTENANCES API] Fetching maintenances for client ID: ${clientId} (verified in organization ${reqUser.organizationId})`);
            maintenances = await typeSafeStorage.getMaintenancesByClientId(clientId);
          } else {
            console.error(`[MAINTENANCES API] Client ID ${clientId} is not in user's organization`);
            return res.status(403).json({ error: "Access denied to this client's data" });
          }
        } else {
          // Filter maintenances by organization's clients
          console.log(`[MAINTENANCES API] Fetching maintenances for all clients in organization ${reqUser.organizationId}`);
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          const allMaintenances = await typeSafeStorage.getAllMaintenances();
          
          // Filter maintenances that belong to clients in the user's organization
          maintenances = allMaintenances.filter(maintenance => clientIds.has(maintenance.clientId));
        }
      } else {
        console.error("[MAINTENANCES API] User has no organization ID:", reqUser);
        return res.status(400).json({ 
          error: "Invalid user data - missing organization" 
        });
      }
      
      console.log(`[MAINTENANCES API] Retrieved ${maintenances.length} maintenances`);
      
      // Enhance maintenances with client and technician data
      const enhancedMaintenances = await Promise.all(
        maintenances.map(async (maintenance) => {
          try {
            const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;
            
            if (maintenance.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
            }
            
            return {
              ...maintenance,
              client: clientWithUser || {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: technicianWithUser ? {
                id: technicianWithUser.technician.id,
                userId: technicianWithUser.technician.userId,
                user: {
                  id: technicianWithUser.user.id,
                  name: technicianWithUser.user.name,
                  email: technicianWithUser.user.email
                }
              } : null
            };
          } catch (error) {
            console.error(`[MAINTENANCES API] Error enhancing maintenance ${maintenance.id}:`, error);
            return {
              ...maintenance,
              client: {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: null
            };
          }
        })
      );
      
      console.log(`[MAINTENANCES API] Returning ${enhancedMaintenances.length} enhanced maintenances`);
      res.json(enhancedMaintenances);
    } catch (error) {
      console.error("[MAINTENANCES API] Error fetching maintenances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get maintenance by ID endpoint
  app.get("/api/maintenances/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[MAINTENANCE DETAILS API] Processing request for maintenance with ID: ${req.params.id}`);
      const maintenanceId = parseInt(req.params.id, 10);
      
      if (isNaN(maintenanceId)) {
        console.error("[MAINTENANCE DETAILS API] Invalid maintenance ID:", req.params.id);
        return res.status(400).json({ error: "Invalid maintenance ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[MAINTENANCE DETAILS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the maintenance
      const maintenance = await typeSafeStorage.getMaintenance(maintenanceId);
      
      if (!maintenance) {
        console.error(`[MAINTENANCE DETAILS API] Maintenance not found with ID: ${maintenanceId}`);
        return res.status(404).json({ error: "Maintenance not found" });
      }
      
      // Check if user has access to this maintenance
      if (reqUser.role !== "system_admin") {
        console.log(`[MAINTENANCE DETAILS API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the maintenance belongs to a client in their organization
        if (reqUser.organizationId) {
          const client = await typeSafeStorage.getClient(maintenance.clientId);
          
          if (!client || client.organizationId !== reqUser.organizationId) {
            console.error(`[MAINTENANCE DETAILS API] Client ID ${maintenance.clientId} is not in user's organization`);
            return res.status(403).json({ error: "Access denied to this maintenance" });
          }
        } else {
          console.error("[MAINTENANCE DETAILS API] User has no organization ID:", reqUser);
          return res.status(400).json({ 
            error: "Invalid user data - missing organization" 
          });
        }
      }
      
      // Enhance maintenance with client and technician data
      try {
        const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
        let technicianWithUser = null;
        
        if (maintenance.technicianId) {
          technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
        }
        
        const enhancedMaintenance = {
          ...maintenance,
          client: clientWithUser || {
            client: { id: maintenance.clientId },
            user: { id: 0, name: "Unknown" }
          },
          technician: technicianWithUser ? {
            id: technicianWithUser.technician.id,
            userId: technicianWithUser.technician.userId,
            user: {
              id: technicianWithUser.user.id,
              name: technicianWithUser.user.name,
              email: technicianWithUser.user.email
            }
          } : null
        };
        
        console.log(`[MAINTENANCE DETAILS API] Returning enhanced maintenance data for ID: ${maintenanceId}`);
        res.json(enhancedMaintenance);
      } catch (error) {
        console.error(`[MAINTENANCE DETAILS API] Error enhancing maintenance ${maintenanceId}:`, error);
        
        // If there's an error enhancing the maintenance, return basic maintenance data
        res.json({
          ...maintenance,
          client: {
            client: { id: maintenance.clientId },
            user: { id: 0, name: "Unknown" }
          },
          technician: null
        });
      }
    } catch (error) {
      console.error("[MAINTENANCE DETAILS API] Error fetching maintenance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create maintenance endpoint
  app.post("/api/maintenances", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("\n[CREATE MAINTENANCE API] Processing request to create new maintenance");
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[CREATE MAINTENANCE API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { clientId } = req.body;
      if (!clientId) {
        console.error("[CREATE MAINTENANCE API] Missing required field: clientId");
        return res.status(400).json({ error: "Client ID is required" });
      }
      
      // Check if the client exists and user has access to it
      const client = await typeSafeStorage.getClient(clientId);
      if (!client) {
        console.error(`[CREATE MAINTENANCE API] Client not found with ID: ${clientId}`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Check permissions
      if (reqUser.role !== "system_admin" && 
          (!reqUser.organizationId || reqUser.organizationId !== client.organizationId)) {
        console.error(`[CREATE MAINTENANCE API] User does not have permission to create maintenance for client ${clientId}`);
        return res.status(403).json({ error: "You do not have permission to create maintenance for this client" });
      }
      
      console.log(`[CREATE MAINTENANCE API] Creating maintenance for client ID: ${clientId}`);
      const newMaintenance = await typeSafeStorage.createMaintenance(req.body);
      
      console.log(`[CREATE MAINTENANCE API] Successfully created maintenance with ID: ${newMaintenance.id}`);
      res.status(201).json(newMaintenance);
    } catch (error) {
      console.error("[CREATE MAINTENANCE API] Error creating maintenance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update maintenance technician endpoint
  app.patch("/api/maintenances/:id/technician", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[UPDATE MAINTENANCE TECHNICIAN API] Processing request to update technician for maintenance with ID: ${req.params.id}`);
      const maintenanceId = parseInt(req.params.id, 10);
      
      if (isNaN(maintenanceId)) {
        console.error("[UPDATE MAINTENANCE TECHNICIAN API] Invalid maintenance ID:", req.params.id);
        return res.status(400).json({ error: "Invalid maintenance ID" });
      }
      
      const { technicianId } = req.body;
      
      // Validate technician ID format (can be null)
      if (technicianId !== null && (typeof technicianId !== 'number' || isNaN(technicianId))) {
        console.error("[UPDATE MAINTENANCE TECHNICIAN API] Invalid technician ID format:", technicianId);
        return res.status(400).json({ error: "Invalid technician ID format" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[UPDATE MAINTENANCE TECHNICIAN API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the maintenance to check permissions
      const maintenance = await typeSafeStorage.getMaintenance(maintenanceId);
      
      if (!maintenance) {
        console.error(`[UPDATE MAINTENANCE TECHNICIAN API] Maintenance not found with ID: ${maintenanceId}`);
        return res.status(404).json({ error: "Maintenance not found" });
      }
      
      // Check if user has permission
      if (reqUser.role !== "system_admin") {
        const client = await typeSafeStorage.getClient(maintenance.clientId);
        
        if (!client || !reqUser.organizationId || client.organizationId !== reqUser.organizationId) {
          console.error(`[UPDATE MAINTENANCE TECHNICIAN API] User does not have permission to update maintenance ${maintenanceId}`);
          return res.status(403).json({ error: "You do not have permission to update this maintenance" });
        }
      }
      
      // Update only the technician ID field
      console.log(`[UPDATE MAINTENANCE TECHNICIAN API] Updating technician for maintenance ID: ${maintenanceId} to technician ID: ${technicianId}`);
      const updatedMaintenance = await typeSafeStorage.updateMaintenance(maintenanceId, { technicianId });
      
      if (!updatedMaintenance) {
        console.error(`[UPDATE MAINTENANCE TECHNICIAN API] Failed to update technician for maintenance with ID: ${maintenanceId}`);
        return res.status(500).json({ error: "Failed to update maintenance technician" });
      }
      
      console.log(`[UPDATE MAINTENANCE TECHNICIAN API] Successfully updated technician for maintenance with ID: ${maintenanceId}`);
      res.json(updatedMaintenance);
    } catch (error) {
      console.error("[UPDATE MAINTENANCE TECHNICIAN API] Error updating maintenance technician:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update maintenance endpoint
  app.patch("/api/maintenances/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[UPDATE MAINTENANCE API] Processing request to update maintenance with ID: ${req.params.id}`);
      const maintenanceId = parseInt(req.params.id, 10);
      
      if (isNaN(maintenanceId)) {
        console.error("[UPDATE MAINTENANCE API] Invalid maintenance ID:", req.params.id);
        return res.status(400).json({ error: "Invalid maintenance ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[UPDATE MAINTENANCE API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the maintenance to check permissions
      const maintenance = await typeSafeStorage.getMaintenance(maintenanceId);
      
      if (!maintenance) {
        console.error(`[UPDATE MAINTENANCE API] Maintenance not found with ID: ${maintenanceId}`);
        return res.status(404).json({ error: "Maintenance not found" });
      }
      
      // Check if user has permission to update this maintenance
      if (reqUser.role !== "system_admin") {
        const client = await typeSafeStorage.getClient(maintenance.clientId);
        
        if (!client || !reqUser.organizationId || client.organizationId !== reqUser.organizationId) {
          console.error(`[UPDATE MAINTENANCE API] User does not have permission to update maintenance ${maintenanceId}`);
          return res.status(403).json({ error: "You do not have permission to update this maintenance" });
        }
      }
      
      // Update the maintenance
      console.log(`[UPDATE MAINTENANCE API] Updating maintenance ID: ${maintenanceId}`);
      const updatedMaintenance = await typeSafeStorage.updateMaintenance(maintenanceId, req.body);
      
      if (!updatedMaintenance) {
        console.error(`[UPDATE MAINTENANCE API] Failed to update maintenance with ID: ${maintenanceId}`);
        return res.status(500).json({ error: "Failed to update maintenance" });
      }
      
      console.log(`[UPDATE MAINTENANCE API] Successfully updated maintenance with ID: ${maintenanceId}`);
      res.json(updatedMaintenance);
    } catch (error) {
      console.error("[UPDATE MAINTENANCE API] Error updating maintenance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create a project phase endpoint
  app.post("/api/projects/:id/phases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT PHASES API] Processing request to create phase for project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      
      if (isNaN(projectId)) {
        console.error("[PROJECT PHASES API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(projectId);
      
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Check if user has access to create phases for this project
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to create phases for project ${projectId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to create phases for this project" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // Clients should not be able to create phases
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to create phases for project ${projectId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot create project phases" });
        }
      }
      
      // Validate the phase data
      const phaseData = {
        ...req.body,
        projectId: projectId
      };
      
      // Create the phase
      console.log(`[PROJECT PHASES API] Creating new phase for project ${projectId}:`, phaseData);
      const newPhase = await typeSafeStorage.createProjectPhase(phaseData);
      
      console.log(`[PROJECT PHASES API] Phase created successfully with ID: ${newPhase.id}`);
      res.status(201).json(newPhase);
    } catch (error) {
      console.error("[PROJECT PHASES API] Error creating project phase:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update a project phase endpoint
  app.put("/api/projects/phases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT PHASES API] Processing request to update phase with ID: ${req.params.id}`);
      const phaseId = parseInt(req.params.id, 10);
      
      if (isNaN(phaseId)) {
        console.error("[PROJECT PHASES API] Invalid phase ID:", req.params.id);
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the phase to check authorization
      const phase = await typeSafeStorage.getProjectPhase(phaseId);
      
      if (!phase) {
        console.error(`[PROJECT PHASES API] Phase not found with ID: ${phaseId}`);
        return res.status(404).json({ error: "Phase not found" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(phase.projectId);
      
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found for phase ID: ${phaseId}`);
        return res.status(404).json({ error: "Project not found for this phase" });
      }
      
      // Check if user has access to update this phase
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to update phase ${phaseId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to update this phase" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // Clients should not be able to update phases
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to update phase ${phaseId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot update project phases" });
        }
      }
      
      // Validate and update the phase
      console.log(`[PROJECT PHASES API] Updating phase ${phaseId} with data:`, req.body);
      const updatedPhase = await typeSafeStorage.updateProjectPhase(phaseId, req.body);
      
      if (!updatedPhase) {
        console.error(`[PROJECT PHASES API] Failed to update phase ${phaseId}`);
        return res.status(500).json({ error: "Failed to update phase" });
      }
      
      console.log(`[PROJECT PHASES API] Phase ${phaseId} updated successfully`);
      res.json(updatedPhase);
    } catch (error) {
      console.error("[PROJECT PHASES API] Error updating project phase:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Delete a project phase endpoint
  app.delete("/api/projects/phases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT PHASES API] Processing request to delete phase with ID: ${req.params.id}`);
      const phaseId = parseInt(req.params.id, 10);
      
      if (isNaN(phaseId)) {
        console.error("[PROJECT PHASES API] Invalid phase ID:", req.params.id);
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the phase to check authorization
      const phase = await typeSafeStorage.getProjectPhase(phaseId);
      
      if (!phase) {
        console.error(`[PROJECT PHASES API] Phase not found with ID: ${phaseId}`);
        return res.status(404).json({ error: "Phase not found" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(phase.projectId);
      
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found for phase ID: ${phaseId}`);
        return res.status(404).json({ error: "Project not found for this phase" });
      }
      
      // Check if user has access to delete this phase
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to delete phase ${phaseId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to delete this phase" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // Clients should not be able to delete phases
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to delete phase ${phaseId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot delete project phases" });
        }
      }
      
      // Delete the phase
      console.log(`[PROJECT PHASES API] Deleting phase ${phaseId}`);
      const success = await typeSafeStorage.deleteProjectPhase(phaseId);
      
      if (!success) {
        console.error(`[PROJECT PHASES API] Failed to delete phase ${phaseId}`);
        return res.status(500).json({ error: "Failed to delete phase" });
      }
      
      console.log(`[PROJECT PHASES API] Phase ${phaseId} deleted successfully`);
      res.status(204).send();
    } catch (error) {
      console.error("[PROJECT PHASES API] Error deleting project phase:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create a project document endpoint
  app.post("/api/projects/:id/documents", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT DOCUMENTS API] Processing request to create document for project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      
      if (isNaN(projectId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(projectId);
      
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Check if user has access to create documents for this project
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to create documents for project ${projectId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to create documents for this project" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // Clients generally should not be able to create documents
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to create documents for project ${projectId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot create project documents" });
        }
      }
      
      // Validate the document data
      const documentData = {
        ...req.body,
        projectId: projectId,
        uploadedBy: reqUser.id,
        uploadDate: new Date()
      };
      
      // Create the document
      console.log(`[PROJECT DOCUMENTS API] Creating new document for project ${projectId}:`, documentData);
      const newDocument = await typeSafeStorage.createProjectDocument(documentData);
      
      console.log(`[PROJECT DOCUMENTS API] Document created successfully with ID: ${newDocument.id}`);
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error creating project document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update a project document endpoint
  app.put("/api/projects/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT DOCUMENTS API] Processing request to update document with ID: ${req.params.id}`);
      const documentId = parseInt(req.params.id, 10);
      
      if (isNaN(documentId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid document ID:", req.params.id);
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the document to check authorization
      const document = await typeSafeStorage.getProjectDocument(documentId);
      
      if (!document) {
        console.error(`[PROJECT DOCUMENTS API] Document not found with ID: ${documentId}`);
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(document.projectId);
      
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found for document ID: ${documentId}`);
        return res.status(404).json({ error: "Project not found for this document" });
      }
      
      // Check if user has access to update this document
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to update document ${documentId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to update this document" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // Clients should not be able to update documents
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to update document ${documentId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot update project documents" });
        }
      }
      
      // Don't allow updating certain fields
      const { uploadedBy, uploadDate, projectId, ...updateData } = req.body;
      
      // Validate and update the document
      console.log(`[PROJECT DOCUMENTS API] Updating document ${documentId} with data:`, updateData);
      const updatedDocument = await typeSafeStorage.updateProjectDocument(documentId, updateData);
      
      if (!updatedDocument) {
        console.error(`[PROJECT DOCUMENTS API] Failed to update document ${documentId}`);
        return res.status(500).json({ error: "Failed to update document" });
      }
      
      console.log(`[PROJECT DOCUMENTS API] Document ${documentId} updated successfully`);
      res.json(updatedDocument);
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error updating project document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Delete a project document endpoint
  app.delete("/api/projects/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log(`\n[PROJECT DOCUMENTS API] Processing request to delete document with ID: ${req.params.id}`);
      const documentId = parseInt(req.params.id, 10);
      
      if (isNaN(documentId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid document ID:", req.params.id);
        return res.status(400).json({ error: "Invalid document ID" });
      }
      
      const reqUser = req.user as any;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the document to check authorization
      const document = await typeSafeStorage.getProjectDocument(documentId);
      
      if (!document) {
        console.error(`[PROJECT DOCUMENTS API] Document not found with ID: ${documentId}`);
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Get the project to check authorization
      const project = await typeSafeStorage.getProject(document.projectId);
      
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found for document ID: ${documentId}`);
        return res.status(404).json({ error: "Project not found for this document" });
      }
      
      // Check if user has access to delete this document
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        
        // For organization users, check if the project belongs to a client in their organization
        if (reqUser.organizationId) {
          const clients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients.map(client => client.id));
          
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to delete document ${documentId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to delete this document" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          // Clients should not be able to delete documents
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to delete document ${documentId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot delete project documents" });
        }
      }
      
      // Delete the document
      console.log(`[PROJECT DOCUMENTS API] Deleting document ${documentId}`);
      const success = await typeSafeStorage.deleteProjectDocument(documentId);
      
      if (!success) {
        console.error(`[PROJECT DOCUMENTS API] Failed to delete document ${documentId}`);
        return res.status(500).json({ error: "Failed to delete document" });
      }
      
      console.log(`[PROJECT DOCUMENTS API] Document ${documentId} deleted successfully`);
      res.status(204).send();
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error deleting project document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Google Maps API key endpoint
  app.get("/api/google-maps-key", (req: Request, res: Response) => {
    try {
      // Set appropriate cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Set CORS headers to allow cross-origin requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
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