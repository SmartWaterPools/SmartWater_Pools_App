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

  // Register authentication routes with /api/auth prefix
  app.use("/api/auth", authRoutes);

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