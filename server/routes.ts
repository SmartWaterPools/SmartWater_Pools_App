import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fs, path, rootDir } from "./utils";
import emailRoutes from "./email-routes";
import fleetmaticsRoutes from "./routes/fleetmatics-routes";
import inventoryRoutes from "./routes/inventory-routes";
import invitationRoutes from "./routes/invitation-routes";
import { 
  insertUserSchema, 
  insertClientSchema, 
  updateClientSchema,
  insertTechnicianSchema,
  insertProjectSchema,
  insertMaintenanceSchema,
  insertRepairSchema,
  insertInvoiceSchema,
  insertPoolEquipmentSchema,
  insertPoolImageSchema,
  insertServiceTemplateSchema,
  insertProjectPhaseSchema,
  insertProjectDocumentationSchema,
  insertCommunicationProviderSchema,
  insertChemicalUsageSchema,
  insertWaterReadingsSchema,
  insertRouteSchema,
  insertRouteAssignmentSchema,
  validateContractType,
  CONTRACT_TYPES,
  CHEMICAL_TYPES,
  COMMUNICATION_PROVIDER_TYPES,
  CommunicationProviderType,
  ChemicalType,
  ROUTE_TYPES,
  // Business Module schemas
  insertExpenseSchema,
  // insertPayrollEntrySchema removed
  insertTimeEntrySchema,
  insertFinancialReportSchema,
  insertVendorSchema,
  insertPurchaseOrderSchema,
  insertInventoryItemSchema,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  REPORT_TYPES,
  // Inventory Management schemas
  insertWarehouseSchema,
  insertTechnicianVehicleSchema,
  insertWarehouseInventorySchema,
  insertVehicleInventorySchema,
  insertInventoryTransferSchema,
  insertInventoryTransferItemSchema,
  insertBarcodeSchema,
  insertBarcodeScanHistorySchema,
  insertInventoryAdjustmentSchema,
  INVENTORY_LOCATION_TYPES,
  TRANSFER_TYPES,
  TRANSFER_STATUS,
  BARCODE_TYPES,
  TransferStatus,
  TransferType,
  User
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import passport from "passport";
import { isAuthenticated, isAdmin, isSystemAdmin, hashPassword, checkOrganizationAccess } from "./auth";

// Helper function to handle validation and respond with appropriate error
const validateRequest = (schema: z.ZodType<any, any>, data: any): { success: boolean; data?: any; error?: string } => {
  try {
    console.log("[VALIDATION] Input data:", JSON.stringify(data));
    
    // Pre-process data to handle null values that should be undefined
    // This improves compatibility with zod validation
    const processedData = Object.entries(data).reduce((result, [key, value]) => {
      // For numeric fields, convert null to undefined to avoid validation errors
      if (value === null && 
          ['estimatedDuration', 'actualDuration', 'cost', 'percentComplete'].includes(key)) {
        console.log(`[VALIDATION] Converting null to undefined for field: ${key}`);
        return result;
      }
      result[key] = value;
      return result;
    }, {} as Record<string, any>);
    
    console.log("[VALIDATION] Processed data:", JSON.stringify(processedData));
    
    const validatedData = schema.parse(processedData);
    console.log("[VALIDATION] Validated data:", JSON.stringify(validatedData));
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("[VALIDATION] Zod error:", error.errors);
      const validationError = fromZodError(error);
      return { success: false, error: validationError.message };
    }
    console.error("[VALIDATION] Unexpected error:", error);
    return { success: false, error: "Invalid request data" };
  }
};

// We import CONTRACT_TYPES and validateContractType from shared/schema.ts


export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Serve static files from the root directory

  // Authentication Routes
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: info.message || "Invalid username or password" 
        });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Don't send password to the client
        const { password, ...userWithoutPassword } = user;
        
        return res.json({ 
          success: true, 
          message: "Login successful", 
          user: userWithoutPassword 
        });
      });
    })(req, res, next);
  });
  
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(function(err) {
      if (err) { 
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      res.json({ success: true, message: "Logout successful" });
    });
  });
  
  // Test route for OAuth callback URL
  app.get('/api/auth/google-test', (req, res) => {
    console.log('Google OAuth test route called with:', {
      headers: {
        host: req.headers.host,
        referer: req.headers.referer || 'none',
        userAgent: req.headers['user-agent'] || 'none'
      },
      query: req.query
    });
    
    // Get the callback URL from env variables or build it
    let callbackURL = '';
    if (process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // Use the exact case from environment variables for callback
      callbackURL = `https://workspace.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`;
      
      // For production deployment
      if (process.env.NODE_ENV === 'production') {
        callbackURL = `https://smartwaterpools.replit.app/api/auth/google/callback`;
      }
    } else {
      callbackURL = 'http://localhost:5000/api/auth/google/callback';
    }
    
    res.json({
      success: true,
      message: 'This is a test of the OAuth callback URL configuration',
      currentUrl: `https://${req.headers.host}/api/auth/google/callback`,
      expectedCallbackUrl: callbackURL,
      environmentDetails: {
        nodeEnv: process.env.NODE_ENV || 'development',
        replSlug: process.env.REPL_SLUG,
        replOwner: process.env.REPL_OWNER
      },
      isReplit: !!process.env.REPL_ID,
      recommendedCallbackURLs: [
        `https://workspace.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`, // Development with proper case
        `https://workspace.${process.env.REPL_OWNER?.toLowerCase()}.repl.co/api/auth/google/callback`, // Development with lowercase
        `https://smartwaterpools.replit.app/api/auth/google/callback` // Production
      ],
      userDetails: req.user ? {
        id: (req.user as any).id,
        username: (req.user as any).username,
        email: (req.user as any).email,
        role: (req.user as any).role,
        isAuthenticated: req.isAuthenticated()
      } : {
        isAuthenticated: req.isAuthenticated()
      }
    });
  });

  // Google OAuth login route
  app.get('/api/auth/google', (req, res, next) => {
    console.log('Google OAuth login route accessed');
    console.log('Session before Google auth:', req.sessionID);
    
    // Ensure session is saved before redirecting to Google
    if (req.session) {
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session before OAuth redirect:', err);
        }
        // Continue with Google authentication
        passport.authenticate('google', { 
          scope: ['profile', 'email'],
          // Force approval screen
          prompt: 'select_account',
          session: true
        })(req, res, next);
      });
    } else {
      console.error('No session object available before Google auth');
      passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'select_account',
        session: true
      })(req, res, next);
    }
  });
  
  // Google OAuth callback route with enhanced error handling and logging
  app.get('/api/auth/google/callback', 
    (req, res, next) => {
      console.log('Received Google OAuth callback request', {
        path: req.path,
        query: {
          code: req.query.code ? `${req.query.code.toString().substring(0, 10)}...` : undefined,
          state: req.query.state,
          error: req.query.error
        },
        headers: {
          host: req.headers.host,
          referer: req.headers.referer,
          origin: req.headers.origin
        },
        sessionID: req.sessionID
      });
      
      if (req.query.error) {
        console.error('Google OAuth error received:', req.query.error);
        return res.redirect(`/login?error=${encodeURIComponent(req.query.error as string)}`);
      }
      
      if (!req.query.code) {
        console.error('No auth code received in Google OAuth callback');
        return res.redirect('/login?error=missing-auth-code');
      }
      
      // Handle the authentication with a more robust error handler
      passport.authenticate('google', { 
        failureRedirect: '/login?error=oauth-failed',
        failureMessage: true,
        session: true
      }, (err, user, info) => {
        if (err) {
          console.error('Google OAuth authentication error:', err);
          return res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
        }
        
        if (!user) {
          console.error('Google OAuth authentication failed:', info);
          return res.redirect('/login?error=authentication-failed');
        }
        
        // Log in the user manually to ensure session is created
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Failed to create session after Google OAuth:', loginErr);
            return res.redirect('/login?error=session-creation-failed');
          }
          
          // Make sure session is saved before redirect
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Error saving session after Google OAuth login:', saveErr);
              return res.redirect('/login?error=session-save-failed');
            }
            
            // Successful authentication
            console.log(`Google OAuth login successful for user: ${user.email}`, {
              id: user.id,
              role: user.role,
              email: user.email,
              name: user.name,
              session: req.session ? 'exists' : 'missing',
              sessionID: req.sessionID,
              authenticated: req.isAuthenticated()
            });
            
            // Redirect based on user role
            if (user.role === 'system_admin' || user.role === 'admin' || user.role === 'org_admin') {
              // Admin users go to the admin dashboard
              console.log(`Redirecting admin user ${user.email} to /admin`);
              return res.redirect('/admin');
            } else if (user.role === 'technician') {
              // Technicians go to technician dashboard
              console.log(`Redirecting technician ${user.email} to /technician`);
              return res.redirect('/technician');
            } else if (user.role === 'client') {
              // Clients go to client portal
              console.log(`Redirecting client ${user.email} to /client-portal`);
              return res.redirect('/client-portal');
            } else {
              // Default dashboard for all other roles
              console.log(`Redirecting user ${user.email} with role ${user.role} to /dashboard`);
              return res.redirect('/dashboard');
            }
          });
        });
      })(req, res, next);
    }
  );
  
  app.get("/api/auth/session", (req: Request, res: Response) => {
    console.log("Session check request received");
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("Session ID:", req.sessionID);
    console.log("Session cookie:", req.session?.cookie);
    
    if (req.isAuthenticated()) {
      console.log("User is authenticated, user ID:", (req.user as any).id);
      
      // Don't send password to the client
      const { password, ...userWithoutPassword } = req.user as any;
      
      return res.json({ 
        isAuthenticated: true, 
        user: userWithoutPassword,
        sessionID: req.sessionID,
        sessionCreated: req.session?.cookie.originalMaxAge 
          ? new Date(Date.now() - req.session.cookie.maxAge + req.session.cookie.originalMaxAge) 
          : null,
        sessionExpires: req.session?.cookie.expires
      });
    }
    
    console.log("User is not authenticated");
    res.json({ 
      isAuthenticated: false,
      sessionID: req.sessionID,
      sessionExists: !!req.session,
      cookieMaxAge: req.session?.cookie?.maxAge
    });
  });
  
  app.get("/api/auth/google-test", async (req: Request, res: Response) => {
    try {
      // Get Replit environment variables for debugging
      const nodeEnv = process.env.NODE_ENV || 'development';
      const replId = process.env.REPL_ID || '';
      const replSlug = process.env.REPL_SLUG || '';
      const replOwner = process.env.REPL_OWNER || '';
      const isReplit = !!process.env.REPL_ID && !!process.env.REPL_SLUG;
      
      // Determine the base URL
      let baseUrl = '';
      if (isReplit) {
        baseUrl = `https://${replSlug}.${replOwner}.repl.co`;
      } else if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://smartwaterpools.replit.app';
      } else {
        baseUrl = 'http://localhost:5000';
      }
      
      // Determine callback URL
      const callbackUrl = `${baseUrl}/api/auth/google/callback`;
      
      // Generate recommended callback URLs
      const recommendedCallbackURLs = [
        `https://${replSlug}.${replOwner}.repl.co/api/auth/google/callback`,
        `https://${replSlug.toLowerCase()}.${replOwner.toLowerCase()}.repl.co/api/auth/google/callback`,
        'https://smartwaterpools.replit.app/api/auth/google/callback'
      ];
      
      // Get user information if logged in
      const userDetails = req.user ? {
        id: (req.user as User).id,
        username: (req.user as User).username,
        email: (req.user as User).email,
        role: (req.user as User).role,
        isAuthenticated: true
      } : undefined;
      
      // Build response object
      const responseData = {
        currentUrl: baseUrl,
        expectedCallbackUrl: callbackUrl,
        environmentDetails: {
          nodeEnv,
          replSlug,
          replOwner
        },
        isReplit,
        recommendedCallbackURLs,
        userDetails
      };
      
      res.json(responseData);
    } catch (error) {
      console.error('Error in Google OAuth test endpoint:', error);
      res.status(500).json({ error: 'Failed to generate OAuth test information' });
    }
  });
  
  // User registration endpoint (modified version of the existing user creation endpoint)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertUserSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Validate email domain for SmartWater Pools organization
      const email = validation.data.email.toLowerCase();
      // If not a SmartWater Pools email, set to default organization and client role
      if (!email.endsWith('@smartwaterpools.com')) {
        // Set to client role regardless of what was requested
        validation.data.role = 'client';
        
        // Get the default organization for clients
        const defaultOrg = await storage.getOrganizationBySlug('client-organization');
        if (defaultOrg) {
          validation.data.organizationId = defaultOrg.id;
        } else {
          console.warn("No default client organization found. User registration may fail.");
        }
      }
      
      // Hash the password before storing it
      const hashedPassword = await hashPassword(validation.data.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...validation.data,
        password: hashedPassword
      });
      
      // Auto-login after registration
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Auto-login failed after registration" });
        }
        
        // Don't send password to the client
        const { password, ...userWithoutPassword } = user;
        
        res.status(201).json({ 
          success: true, 
          message: "Registration successful", 
          user: userWithoutPassword 
        });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });
    
  // Handle registration via invitation token
  app.post("/api/auth/register-invitation", async (req: Request, res: Response) => {
    try {
      const { name, email, password, token, role, organizationId } = req.body;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Invitation token is required" 
        });
      }
      
      // Verify the token exists and is valid
      const invitation = await db.query.invitationTokens.findFirst({
        where: (invite, { eq }) => eq(invite.token, token)
      });
      
      if (!invitation) {
        return res.status(404).json({ 
          success: false, 
          message: "Invitation not found" 
        });
      }
      
      // Check if the token has expired
      if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
        return res.status(400).json({ 
          success: false, 
          message: "Invitation has expired" 
        });
      }
      
      // Check if the token has already been used
      if (invitation.status === 'accepted') {
        return res.status(400).json({ 
          success: false, 
          message: "Invitation has already been used" 
        });
      }
      
      // Verify the email matches
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ 
          success: false, 
          message: "Email does not match invitation" 
        });
      }
      
      // Check if a user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "A user with this email already exists" 
        });
      }
      
      // Validate email domain for SmartWater Pools organization permissions
      const emailLower = email.toLowerCase();
      let userRole = role;
      let userOrganizationId = organizationId;
      
      // If not a SmartWater Pools email and trying to get higher privileges, restrict to client role
      if (!emailLower.endsWith('@smartwaterpools.com') && 
          (role === 'system_admin' || role === 'org_admin' || role === 'admin')) {
        userRole = 'client';
        
        // Get default organization for clients if needed
        if (!organizationId) {
          const defaultOrg = await storage.getOrganizationBySlug('client-organization');
          if (defaultOrg) {
            userOrganizationId = defaultOrg.id;
          }
        }
      }
      
      // Create the user account
      const hashedPassword = await hashPassword(password);
      
      const newUser = await storage.createUser({
        username: email,
        password: hashedPassword,
        name,
        email,
        role: userRole,
        organizationId: userOrganizationId,
        active: true,
        phone: null,
        address: null,
        authProvider: 'local',
        photoUrl: null
      });
      
      // Mark the invitation as accepted
      await db.update(invitationTokens)
        .set({ 
          status: 'accepted', 
          updatedAt: new Date(),
          acceptedAt: new Date()
        })
        .where(eq(invitationTokens.id, invitation.id));
      
      // Auto-login after registration
      req.login(newUser, (loginErr) => {
        if (loginErr) {
          console.error('Failed to auto-login after invitation registration:', loginErr);
          // Still return success, but client will need to log in manually
          return res.status(201).json({ 
            success: true, 
            message: "Registration successful, but auto-login failed",
            loginRequired: true
          });
        }
        
        // Don't send password to the client
        const { password, ...userWithoutPassword } = newUser;
        
        res.status(201).json({ 
          success: true, 
          message: "Registration successful",
          user: userWithoutPassword
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Email-related routes for password reset, 2FA, etc.
  app.use("/api/email", emailRoutes);
  
  // Fleetmatics GPS integration routes
  const fleetmaticsRouter = express.Router();
  app.use("/api/fleetmatics", fleetmaticsRoutes(fleetmaticsRouter, storage));
  
  // Inventory management routes
  const inventoryRouter = express.Router();
  app.use("/api/inventory", inventoryRoutes(inventoryRouter, storage));
  
  // Invitation routes
  const invitationRouter = express.Router();
  app.use("/api/invitations", invitationRoutes);
  
  // OAuth routes
  // We removed the duplicate Google OAuth routes - they're defined higher up in the file
  
  // OAuth debug route
  app.get("/oauth-debug", (req: Request, res: Response) => {
    const debugInfo = {
      session: req.session,
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      cookies: req.headers.cookie,
      env: {
        REPL_SLUG: process.env.REPL_SLUG,
        REPL_OWNER: process.env.REPL_OWNER,
        NODE_ENV: process.env.NODE_ENV,
      }
    };
    
    res.send(`
      <html>
        <head>
          <title>OAuth Debug</title>
          <style>
            body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
            pre { background: #f5f5f5; padding: 1rem; overflow: auto; border-radius: 4px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
            h2 { margin-top: 0; color: #2563eb; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; }
            .info { color: #666; }
          </style>
        </head>
        <body>
          <h1>OAuth Debug Information</h1>
          
          <div class="card">
            <h2>Authentication Status</h2>
            <p>User is ${req.isAuthenticated() ? 'authenticated' : 'not authenticated'}</p>
            ${req.user ? `<p>Logged in as: ${(req.user as any).username || 'Unknown'}</p>` : ''}
          </div>
          
          <div class="card">
            <h2>Environment</h2>
            <pre>${JSON.stringify(debugInfo.env, null, 2)}</pre>
          </div>
          
          <div class="card">
            <h2>Session Data</h2>
            <pre>${JSON.stringify(debugInfo.session, null, 2)}</pre>
          </div>
          
          <div class="card">
            <h2>User Object</h2>
            <pre>${JSON.stringify(debugInfo.user, null, 2)}</pre>
          </div>
          
          <div class="card">
            <h2>Cookie Headers</h2>
            <pre>${debugInfo.cookies || 'No cookies found'}</pre>
          </div>
          
          <div class="card">
            <h2>Actions</h2>
            <p><a class="button" href="/api/auth/google">Sign in with Google</a></p>
            <p><a class="button" href="/api/auth/logout">Logout</a></p>
            <p><a class="button" href="/">Go to Home</a></p>
          </div>
          
          <p class="info">Page generated at: ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
  });

  // Enhanced health check endpoint with detailed diagnostics
  app.get("/api/health", (req: Request, res: Response) => {
    console.log(`Health check request received from: ${req.headers.host || 'unknown host'}`);
    console.log(`User agent: ${req.headers['user-agent'] || 'unknown'}`);
    
    // Get server metrics
    const serverInfo = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      service: "SmartWater Pools Management System",
      database: process.env.DATABASE_URL ? "configured" : "not configured",
      requestFrom: req.headers.host || 'unknown',
      requestPath: req.path,
      requestMethod: req.method,
      requestProtocol: req.protocol,
      nodeVersion: process.version,
      memory: {
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      },
      uptime: Math.round(process.uptime()) + ' seconds'
    };
    
    console.log('Health check response:', serverInfo);
    res.status(200).json(serverInfo);
  });

  // User routes
  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and get their role and organization ID
      const reqUser = req.user as any;
      let users = [];
      
      if (reqUser && reqUser.role) {
        // If user is system_admin or org_admin, they can see all users
        if (reqUser.role === 'system_admin') {
          users = await storage.getAllUsers();
          console.log(`System admin retrieved ${users.length} users`);
        } else if (reqUser.role === 'org_admin' && reqUser.organizationId) {
          // Org admins can see users in their organization
          users = await storage.getUsersByOrganizationId(reqUser.organizationId);
          console.log(`Org admin retrieved ${users.length} users for organization ${reqUser.organizationId}`);
        } else if (reqUser.role === 'admin' && reqUser.organizationId) {
          // Regular admins can see users in their organization
          users = await storage.getUsersByOrganizationId(reqUser.organizationId);
          console.log(`Admin retrieved ${users.length} users for organization ${reqUser.organizationId}`);
        } else {
          // Regular users should only see themselves
          users = [await storage.getUser(reqUser.id)].filter(Boolean);
          console.log(`Regular user (${reqUser.username}) retrieved only their own user info`);
        }
      } else {
        return res.status(403).json({ message: "Unauthorized access to user list" });
      }

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has permission to view this user
      const reqUser = req.user as any;
      if (reqUser) {
        // Users can see themselves
        if (reqUser.id === id) {
          return res.json(user);
        }
        
        // System admins can see all users
        if (reqUser.role === 'system_admin') {
          return res.json(user);
        }
        
        // Org admins and admins can see users in their organization
        if ((reqUser.role === 'org_admin' || reqUser.role === 'admin') && 
            reqUser.organizationId === user.organizationId) {
          return res.json(user);
        }
        
        // Otherwise, unauthorized
        return res.status(403).json({ message: "You don't have permission to view this user" });
      }
      
      return res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertUserSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Hash the password before storing it
      const hashedPassword = await hashPassword(validation.data.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...validation.data,
        password: hashedPassword
      });
      
      // Don't send the password back to the client
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Add a new delete user endpoint
  app.delete("/api/users/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const permanent = req.query.permanent === 'true'; // Check if permanent deletion is requested
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the user first to check if they exist
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting system_admin users
      if (user.role === 'system_admin') {
        return res.status(403).json({ message: "Cannot delete system administrator accounts" });
      }
      
      // Check if user has permission to delete this user
      const reqUser = req.user as any;
      if (!reqUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // System admins can delete any user (except other system admins)
      if (reqUser.role === 'system_admin') {
        // Allow the delete
      }
      // Org admins can delete users in their organization
      else if (reqUser.role === 'org_admin' && reqUser.organizationId === user.organizationId) {
        // Allow the delete
      }
      // Otherwise, unauthorized
      else {
        return res.status(403).json({ message: "You don't have permission to delete this user" });
      }
      
      // Check if this is the user's own account
      if (reqUser.id === id) {
        return res.status(403).json({ message: "Cannot delete your own account" });
      }
      
      let result;
      
      if (permanent) {
        // Perform permanent deletion of the user (but only if user is system_admin)
        if (reqUser.role !== 'system_admin') {
          return res.status(403).json({ 
            message: "Only system administrators can permanently delete users" 
          });
        }
        
        // Perform actual permanent deletion from the database
        result = await storage.deleteUser(id);
        
        if (!result) {
          return res.status(500).json({ message: "Failed to permanently delete user" });
        }
        
        return res.json({ 
          message: "User permanently deleted", 
          success: true,
          permanent: true
        });
      } else {
        // Set user inactive instead of hard deleting (default behavior)
        const updatedUser = await storage.updateUser(id, { active: false });
        
        if (!updatedUser) {
          return res.status(500).json({ message: "Failed to deactivate user" });
        }
        
        return res.json({ 
          message: "User deactivated successfully", 
          success: true,
          permanent: false
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  app.patch("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[API] Updating user ${id} with data:`, req.body);
      
      if (isNaN(id)) {
        console.log(`[API] Invalid user ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the existing user first
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        console.log(`[API] User ${id} not found for update`);
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user has permission to update this user
      const reqUser = req.user as any;
      if (reqUser) {
        // Users can update themselves
        if (reqUser.id === id) {
          // Continue with the update
        }
        // System admins can update any user
        else if (reqUser.role === 'system_admin') {
          // Continue with the update
        }
        // Org admins and admins can update users in their organization
        else if ((reqUser.role === 'org_admin' || reqUser.role === 'admin') && 
            reqUser.organizationId === existingUser.organizationId) {
          // Continue with the update
        }
        else {
          // Otherwise, unauthorized
          return res.status(403).json({ message: "You don't have permission to update this user" });
        }
      } else {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Proceed with the update
      const updatedUser = await storage.updateUser(id, req.body);
      
      if (!updatedUser) {
        console.log(`[API] User ${id} update failed`);
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      console.log(`[API] User ${id} updated successfully:`, updatedUser);
      return res.json(updatedUser);
    } catch (error) {
      console.error("[API] Error updating user:", error);
      return res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Client routes
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and get their organization ID
      const user = req.user as any;
      let clients;
      
      // If user is authenticated and has an organization ID
      if (user && user.organizationId) {
        // If user is system_admin, they can see all clients
        if (user.role === 'system_admin') {
          clients = await storage.getAllClients();
          console.log(`System admin retrieved ${clients.length} clients`);
        } else {
          // Otherwise, filter by organization ID
          clients = await storage.getClientsByOrganizationId(user.organizationId);
          console.log(`Retrieved ${clients.length} clients for organization ${user.organizationId}`);
        }
      } else {
        // If no user or no organization ID, return all clients (fallback for testing)
        clients = await storage.getAllClients();
        console.log(`Retrieved ${clients.length} clients (no organization filter applied)`);
      }

      // Fetch the associated user for each client
      const clientsWithUsers = await Promise.all(
        clients.map(async (client) => {
          const user = await storage.getUser(client.userId);
          return { ...client, user };
        })
      );

      res.json(clientsWithUsers);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Fetching client with ID: ${id}`);

      if (isNaN(id)) {
        console.log(`Invalid client ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const clientWithUser = await storage.getClientWithUser(id);
      console.log(`Result of getClientWithUser(${id}):`, clientWithUser);

      if (!clientWithUser) {
        console.log(`Client with ID ${id} not found or user data missing`);
        return res.status(404).json({ message: "Client not found" });
      }

      // Check if user is authenticated and has permission to view this client
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to access client from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this client" });
        }
      }

      // Combine the client and user into a single object with the user property
      // to match what the frontend expects
      const clientResponse = {
        ...clientWithUser.client,
        user: clientWithUser.user
      };

      console.log(`Successfully retrieved client ${id} with data:`, JSON.stringify(clientResponse));
      res.json(clientResponse);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client", error: String(error) });
    }
  });

  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.log(`[CLIENT UPDATE API] Invalid client ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid client ID", details: `Received: ${req.params.id}` });
      }

      console.log(`[CLIENT UPDATE API] Attempting to update client with ID: ${id}`);
      console.log(`[CLIENT UPDATE API] Original update data:`, JSON.stringify(req.body));
      
      // DEBUG - Explicitly log contract type if present
      if (req.body.contractType !== undefined) {
        console.log(`[CLIENT UPDATE API] CONTRACT TYPE UPDATE REQUESTED:`, 
          typeof req.body.contractType === 'string' ? `"${req.body.contractType}"` : req.body.contractType,
          `(type: ${typeof req.body.contractType})`);
      }

      // Get the existing client
      const client = await storage.getClient(id);
      if (!client) {
        console.log(`[CLIENT UPDATE API] Client with ID ${id} not found`);
        return res.status(404).json({ message: "Client not found", clientId: id });
      }

      // Check if the user can update this client based on organization
      const user = await storage.getUser(client.userId);
      if (!user) {
        console.log(`[CLIENT UPDATE API] Associated user not found for client ${id}`);
        return res.status(404).json({ message: "Client user information not found" });
      }

      // Check if user is authenticated and has permission to update this client
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If user is not a system_admin, check if client belongs to user's organization
        if (reqUser.role !== 'system_admin' && 
            user.organizationId !== reqUser.organizationId) {
          console.log(`[CLIENT UPDATE API] User from organization ${reqUser.organizationId} attempted to update client from organization ${user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this client" });
        }
      }

      console.log(`[CLIENT UPDATE API] Found existing client:`, JSON.stringify(client));
      console.log(`[CLIENT UPDATE API] Current contract type:`, 
        client.contractType ? `"${client.contractType}"` : client.contractType,
        `(type: ${typeof client.contractType})`);
      

      // Validate the request data using our schema
      const validationResult = validateRequest(updateClientSchema, req.body);
      if (!validationResult.success) {
        console.error(`[CLIENT UPDATE API] Validation error:`, validationResult.error);
        return res.status(400).json({ 
          message: validationResult.error || "Invalid client data",
          received: req.body
        });
      }

      const updateData = validationResult.data;
      console.log(`[CLIENT UPDATE API] Validated data:`, JSON.stringify(updateData));

      // Only perform update if there are actual changes
      const hasChanges = Object.keys(updateData).some(key => {
        // Special handling for contractType since this is the only field we might accidentally clear
        if (key === 'contractType') {
          // Only include contractType in the update if it was explicitly set in the request
          if (req.body.contractType !== undefined) {
            if (updateData.contractType !== null && client.contractType !== null) {
              return String(updateData.contractType).toLowerCase() !== String(client.contractType).toLowerCase();
            }
            return updateData.contractType !== client.contractType; // Handle null cases
          }
          // If contractType wasn't in the original request, remove it from updateData
          delete updateData.contractType;
          return false;
        }
        
        // Pool-related fields - compare exact values
        if ([
          'poolType', 
          'poolSize', 
          'filterType', 
          'heaterType', 
          'chemicalSystem', 
          'specialNotes', 
          'serviceDay'
        ].includes(key)) {
          // Safely handle null/undefined values
          const updateValue = updateData[key as keyof typeof updateData];
          const clientValue = client[key as keyof typeof client];
          
          // Different null/undefined handling
          if (updateValue === null || updateValue === undefined) {
            return clientValue !== null && clientValue !== undefined;
          }
          if (clientValue === null || clientValue === undefined) {
            return updateValue !== null && updateValue !== undefined;
          }
          
          // Otherwise compare string values
          return String(updateValue) !== String(clientValue);
        }
        
        // For other fields
        if (key === 'companyName') {
          return updateData.companyName !== client.companyName;
        }
        
        // Log unhandled fields for debugging
        console.log(`[CLIENT UPDATE API] Unhandled field in change detection: ${key}`);
        return false;
      });

      if (!hasChanges) {
        console.log(`[CLIENT UPDATE API] No actual changes detected, returning existing client`);
        return res.json(client);
      }

      // Update client data with detailed error handling
      try {
        console.log(`[CLIENT UPDATE API] Final update data being sent to database:`, JSON.stringify(updateData));
        const updatedClient = await storage.updateClient(id, updateData);

        if (!updatedClient) {
          console.error(`[CLIENT UPDATE API] Update operation did not return a client`);
          return res.status(500).json({ 
            message: "Client update operation did not return updated client data",
            clientId: id
          });
        }

        console.log(`[CLIENT UPDATE API] Client updated successfully:`, JSON.stringify(updatedClient));

        // Return the complete updated client data
        res.json(updatedClient);

      } catch (updateError) {
        console.error(`[CLIENT UPDATE API] Database error during client update:`, updateError);
        return res.status(500).json({ 
          message: "Database error during client update", 
          error: String(updateError),
          details: updateError instanceof Error ? updateError.stack : undefined
        });
      }
    } catch (error) {
      console.error("[CLIENT UPDATE API] Error updating client:", error);
      res.status(500).json({ 
        message: "Failed to update client", 
        error: String(error),
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      // Check if user has permission to create clients
      const reqUser = req.user as any;
      
      // First create the user with the same organization as the current user
      const userData = { ...req.body.user };
      
      // Set organization ID based on the authenticated user
      if (reqUser && reqUser.organizationId) {
        userData.organizationId = reqUser.organizationId;
      } else if (reqUser && reqUser.role === 'system_admin') {
        // If system admin, they can specify which organization to create the client in
        if (req.body.organizationId) {
          userData.organizationId = req.body.organizationId;
        } else {
          // Default to the first organization if none specified
          const organizations = await storage.getAllOrganizations();
          if (organizations.length > 0) {
            userData.organizationId = organizations[0].id;
          }
        }
      } else {
        return res.status(403).json({ message: "You don't have permission to create clients" });
      }

      // Validate user data
      const userValidation = validateRequest(insertUserSchema, userData);
      if (!userValidation.success) {
        return res.status(400).json({ message: userValidation.error });
      }

      console.log(`Creating new user with organization ID: ${userData.organizationId}`);
      const user = await storage.createUser(userValidation.data);

      // Then create the client with the user ID
      const clientData = { ...req.body.client, userId: user.id };
      const clientValidation = validateRequest(insertClientSchema, clientData);

      if (!clientValidation.success) {
        return res.status(400).json({ message: clientValidation.error });
      }

      const client = await storage.createClient(clientValidation.data);

      res.status(201).json({ client, user });
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Technician routes
  app.get("/api/technicians", async (req: Request, res: Response) => {
    try {
      // Get all technicians and then apply organization filter
      const technicians = await storage.getAllTechnicians();
      const reqUser = req.user as any;
      
      // Fetch the associated user for each technician
      let techniciansWithUsers = await Promise.all(
        technicians.map(async (technician) => {
          const user = await storage.getUser(technician.userId);
          return { ...technician, user };
        })
      );
      
      // Filter by organization if not a system admin
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        console.log(`Filtering technicians by organization ID: ${reqUser.organizationId}`);
        techniciansWithUsers = techniciansWithUsers.filter(
          tech => tech.user && tech.user.organizationId === reqUser.organizationId
        );
      }

      res.json(techniciansWithUsers);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  app.get("/api/technicians/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const technicianWithUser = await storage.getTechnicianWithUser(id);

      if (!technicianWithUser) {
        return res.status(404).json({ message: "Technician not found" });
      }

      // Check if user is authenticated and has permission to view this technician
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the technician belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            technicianWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to access technician from organization ${technicianWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this technician" });
        }
      }

      res.json(technicianWithUser);
    } catch (error) {
      console.error("Error fetching technician:", error);
      res.status(500).json({ message: "Failed to fetch technician" });
    }
  });

  app.post("/api/technicians", async (req: Request, res: Response) => {
    try {
      // Check if user has permission to create technicians
      const reqUser = req.user as any;
      
      // First create the user with the same organization as the current user
      const userData = { ...req.body.user };
      
      // Set organization ID based on the authenticated user
      if (reqUser && reqUser.organizationId) {
        userData.organizationId = reqUser.organizationId;
      } else if (reqUser && reqUser.role === 'system_admin') {
        // If system admin, they can specify which organization to create the technician in
        if (req.body.organizationId) {
          userData.organizationId = req.body.organizationId;
        } else {
          // Default to the first organization if none specified
          const organizations = await storage.getAllOrganizations();
          if (organizations.length > 0) {
            userData.organizationId = organizations[0].id;
          }
        }
      } else {
        return res.status(403).json({ message: "You don't have permission to create technicians" });
      }

      // Set default role to technician if not specified
      if (!userData.role) {
        userData.role = 'technician';
      }

      const userValidation = validateRequest(insertUserSchema, userData);
      if (!userValidation.success) {
        return res.status(400).json({ message: userValidation.error });
      }

      console.log(`Creating new technician user with organization ID: ${userData.organizationId}`);
      const user = await storage.createUser(userValidation.data);

      // Then create the technician with the user ID
      const technicianData = { ...req.body.technician, userId: user.id };
      const technicianValidation = validateRequest(insertTechnicianSchema, technicianData);

      if (!technicianValidation.success) {
        return res.status(400).json({ message: technicianValidation.error });
      }

      const technician = await storage.createTechnician(technicianValidation.data);

      res.status(201).json({ technician, user });
    } catch (error) {
      console.error("Error creating technician:", error);
      res.status(500).json({ message: "Failed to create technician" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      // Check if we should include archived projects (by default exclude them)
      const includeArchived = req.query.includeArchived === 'true';
      
      // Get all projects
      const projects = await storage.getAllProjects();
      
      // Filter out archived projects unless explicitly requested
      let filteredProjects = includeArchived 
        ? projects 
        : projects.filter(project => !project.isArchived);
      
      // Check if user is authenticated and limit projects to their organization
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Filter projects to only include those from the user's organization
        // We need to get client information to check the organization
        const projectsInOrg = [];
        
        for (const project of filteredProjects) {
          const clientWithUser = await storage.getClientWithUser(project.clientId);
          if (clientWithUser && clientWithUser.user.organizationId === reqUser.organizationId) {
            projectsInOrg.push(project);
          }
        }
        
        filteredProjects = projectsInOrg;
        console.log(`Filtered ${projects.length} projects to ${filteredProjects.length} projects for organization ${reqUser.organizationId}`);
      }
        
      console.log(`Retrieved ${projects.length} total projects, returning ${filteredProjects.length} ${includeArchived ? 'including' : 'excluding'} archived`);

      // Fetch additional data for each project
      const projectsWithDetails = await Promise.all(
        filteredProjects.map(async (project) => {
          const clientWithUser = await storage.getClientWithUser(project.clientId);
          const assignments = await storage.getProjectAssignments(project.id);

          // Get technician details for each assignment
          const assignmentsWithTechnicians = await Promise.all(
            assignments.map(async (assignment) => {
              const technicianWithUser = await storage.getTechnicianWithUser(assignment.technicianId);
              return { ...assignment, technician: technicianWithUser };
            })
          );

          return {
            ...project,
            client: clientWithUser,
            assignments: assignmentsWithTechnicians
          };
        })
      );

      res.json(projectsWithDetails);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  
  // Endpoint to get archived projects
  app.get("/api/projects/archived", async (_req: Request, res: Response) => {
    try {
      const archivedProjects = await storage.getArchivedProjects();
      
      // Fetch additional data for each archived project
      const projectsWithDetails = await Promise.all(
        archivedProjects.map(async (project) => {
          const clientWithUser = await storage.getClientWithUser(project.clientId);
          const assignments = await storage.getProjectAssignments(project.id);

          // Get technician details for each assignment
          const assignmentsWithTechnicians = await Promise.all(
            assignments.map(async (assignment) => {
              const technicianWithUser = await storage.getTechnicianWithUser(assignment.technicianId);
              return { ...assignment, technician: technicianWithUser };
            })
          );

          return {
            ...project,
            client: clientWithUser,
            assignments: assignmentsWithTechnicians
          };
        })
      );
      
      console.log(`Retrieved ${archivedProjects.length} archived projects`);
      res.json(projectsWithDetails);
    } catch (error) {
      console.error("Failed to fetch archived projects:", error);
      res.status(500).json({ message: "Failed to fetch archived projects" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[API] GET /api/projects/${id} - Fetching project...`);
      
      const project = await storage.getProject(id);
      console.log(`[API] Project fetch result:`, project ? `Found project: ${project.name}` : 'Project not found');

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      console.log(`[API] Fetching client details for client ID ${project.clientId}...`);
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      console.log(`[API] Client details:`, clientWithUser ? `Found client: ${clientWithUser.user.name}` : 'Client not found');
      
      // Check if user is authenticated and has permission to view this project
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser && clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access project from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this project" });
        }
      }
      
      console.log(`[API] Fetching project assignments...`);
      const assignments = await storage.getProjectAssignments(project.id);
      console.log(`[API] Found ${assignments.length} assignments`);

      // Get technician details for each assignment
      console.log(`[API] Processing technician details for assignments...`);
      const assignmentsWithTechnicians = await Promise.all(
        assignments.map(async (assignment) => {
          console.log(`[API] Fetching technician ${assignment.technicianId} details...`);
          const technicianWithUser = await storage.getTechnicianWithUser(assignment.technicianId);
          return { ...assignment, technician: technicianWithUser };
        })
      );

      console.log(`[API] Successfully prepared project response data`);
      res.json({
        ...project,
        client: clientWithUser,
        assignments: assignmentsWithTechnicians
      });
    } catch (error) {
      console.error(`[API] Error fetching project:`, error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      console.log("[VALIDATION] Input data:", JSON.stringify(req.body));
      const validation = validateRequest(insertProjectSchema, req.body);

      if (!validation.success) {
        console.error("[VALIDATION] Failed:", validation.error);
        return res.status(400).json({ message: validation.error });
      }

      console.log("[VALIDATION] Processed data:", JSON.stringify(validation.data));
      
      // Check if client exists before creating project
      const clientExists = await storage.getClient(validation.data.clientId);
      if (!clientExists) {
        console.error(`[PROJECT CREATION] Client with ID ${validation.data.clientId} not found`);
        return res.status(400).json({ 
          message: `Client with ID ${validation.data.clientId} not found`,
          field: "clientId" 
        });
      }

      console.log("[VALIDATION] Validated data:", JSON.stringify(validation.data));
      const project = await storage.createProject(validation.data);

      // If technicians are assigned, create the assignments
      if (req.body.technicianIds && Array.isArray(req.body.technicianIds)) {
        await Promise.all(
          req.body.technicianIds.map(async (techId: number) => {
            await storage.createProjectAssignment({
              projectId: project.id,
              technicianId: techId,
              role: "Member"
            });
          })
        );
      }

      res.status(201).json(project);
    } catch (error) {
      console.error("[PROJECT CREATION] Error:", error);
      res.status(500).json({ message: "Failed to create project", error: String(error) });
    }
  });

  app.patch("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Project client information not found" });
      }
      
      // Check if user is authenticated and has permission to update this project
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to update project from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this project" });
        }
      }

      const updatedProject = await storage.updateProject(id, req.body);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });
  
  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Project client information not found" });
      }
      
      // Check if user is authenticated and has permission to delete this project
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to delete project from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to delete this project" });
        }
      }

      const result = await storage.deleteProject(id);
      if (result) {
        res.status(200).json({ message: "Project deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete project" });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project Phases routes
  app.post("/api/project-phases", async (req: Request, res: Response) => {
    try {
      console.log("[PROJECT PHASE API] - Request body:", JSON.stringify(req.body));
      
      const validation = validateRequest(insertProjectPhaseSchema, req.body);

      if (!validation.success) {
        console.log("[PROJECT PHASE API] - Validation failed:", validation.error);
        return res.status(400).json({ message: validation.error });
      }
      
      // Get the project to check organization boundaries
      const project = await storage.getProject(validation.data.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Project client information not found" });
      }
      
      // Check if user is authenticated and has permission to create a phase for this project
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to create a project phase for project in organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to create a phase for this project" });
        }
      }
      
      console.log("[PROJECT PHASE API] - Validation passed, data:", JSON.stringify(validation.data));

      const phase = await storage.createProjectPhase(validation.data);
      console.log("[PROJECT PHASE API] - Phase created:", JSON.stringify(phase));
      res.status(201).json(phase);
    } catch (error) {
      console.error("[PROJECT PHASE API] - Error creating phase:", error);
      res.status(500).json({ message: "Failed to create project phase" });
    }
  });

  app.get("/api/project-phases/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const phase = await storage.getProjectPhase(id);

      if (!phase) {
        return res.status(404).json({ message: "Project phase not found" });
      }
      
      // Get the project to check organization boundaries
      const project = await storage.getProject(phase.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found for this phase" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Project client information not found" });
      }
      
      // Check if user is authenticated and has permission to view this phase
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to access project phase from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this project phase" });
        }
      }

      res.json(phase);
    } catch (error) {
      console.error("Error fetching project phase:", error);
      res.status(500).json({ message: "Failed to fetch project phase" });
    }
  });

  app.get("/api/projects/:id/phases", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Project client information not found" });
      }
      
      // Check if user is authenticated and has permission to view this project's phases
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to access phases for project from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access phases for this project" });
        }
      }

      const phases = await storage.getProjectPhasesByProjectId(projectId);
      res.json(phases);
    } catch (error) {
      console.error("Error fetching project phases:", error);
      res.status(500).json({ message: "Failed to fetch project phases" });
    }
  });

  app.patch("/api/project-phases/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const phase = await storage.getProjectPhase(id);

      if (!phase) {
        return res.status(404).json({ message: "Project phase not found" });
      }
      
      // Get the project to check organization boundaries
      const project = await storage.getProject(phase.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found for this phase" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Project client information not found" });
      }
      
      // Check if user is authenticated and has permission to update this phase
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to update project phase from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this project phase" });
        }
      }

      const updatedPhase = await storage.updateProjectPhase(id, req.body);
      res.json(updatedPhase);
    } catch (error) {
      console.error("Error updating project phase:", error);
      res.status(500).json({ message: "Failed to update project phase" });
    }
  });

  app.delete("/api/project-phases/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const phase = await storage.getProjectPhase(id);

      if (!phase) {
        return res.status(404).json({ message: "Project phase not found" });
      }
      
      // Get the project to check organization boundaries
      const project = await storage.getProject(phase.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found for this phase" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(project.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Project client information not found" });
      }
      
      // Check if user is authenticated and has permission to delete this phase
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to delete project phase from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to delete this project phase" });
        }
      }

      const result = await storage.deleteProjectPhase(id);
      
      if (result) {
        res.status(200).json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to delete project phase" });
      }
    } catch (error) {
      console.error("Error deleting project phase:", error);
      res.status(500).json({ message: "Failed to delete project phase" });
    }
  });

  // Maintenance routes
  app.get("/api/maintenances", async (req: Request, res: Response) => {
    try {
      // Check user's organization for filtering
      const reqUser = req.user as any;
      let maintenances = await storage.getAllMaintenances();
      
      // Filter by organization if user is not a system_admin
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        console.log(`[API] Filtering maintenances for organization ${reqUser.organizationId}`);
        
        // We need to find only maintenances for clients in this organization
        // First, gather all details and then filter
        const maintenancesWithClientInfo = await Promise.all(
          maintenances.map(async (maintenance) => {
            const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
            return { maintenance, clientWithUser };
          })
        );
        
        // Filter to only include maintenances for clients in the user's organization
        const filteredMaintItems = maintenancesWithClientInfo.filter(item => 
          item.clientWithUser && 
          item.clientWithUser.user && 
          item.clientWithUser.user.organizationId === reqUser.organizationId
        );
        
        // Extract just the maintenance objects from the filtered list
        maintenances = filteredMaintItems.map(item => item.maintenance);
        
        console.log(`[API] After organization filtering: ${maintenances.length} records`);
      } else {
        console.log(`[API] No organization filtering applied, returning all ${maintenances.length} records`);
      }
      
      // Debug logging to understand data discrepancy
      console.log(`[API] getAllMaintenances returned ${maintenances.length} records`);
      const march9Count = maintenances.filter(m => 
        m.scheduleDate === '2025-03-09' || 
        (typeof m.scheduleDate === 'object' && m.scheduleDate !== null && 
         'toISOString' in m.scheduleDate && 
         (m.scheduleDate as Date).toISOString().includes('2025-03-09'))
      ).length;
      console.log(`[API] Found ${march9Count} records for March 9, 2025`);

      // Fetch additional data for each maintenance
      const maintenancesWithDetails = await Promise.all(
        maintenances.map(async (maintenance) => {
          const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
          let technicianWithUser = null;

          if (maintenance.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
          }

          // Make sure schedule_date and scheduleDate are both present for maximum compatibility
          const maintenanceWithBothDateFormats = {
            ...maintenance,
            client: clientWithUser,
            technician: technicianWithUser,
            schedule_date: maintenance.scheduleDate, // Ensure snake_case is present
            scheduleDate: maintenance.scheduleDate   // Ensure camelCase is present
          };

          return maintenanceWithBothDateFormats;
        })
      );

      console.log(`[API] Returning ${maintenancesWithDetails.length} maintenances with details`);
      res.json(maintenancesWithDetails);
    } catch (error) {
      console.error("Error fetching maintenances:", error);
      res.status(500).json({ message: "Failed to fetch maintenances" });
    }
  });

  app.get("/api/maintenances/upcoming", async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      
      // Check user's organization for filtering
      const reqUser = req.user as any;
      
      // If clientId is provided, get maintenances for that client
      let upcomingMaintenances;
      if (clientId) {
        console.log(`[API] Getting upcoming maintenances for client ${clientId} within ${days} days`);
        
        // Check if client belongs to user's organization if not system_admin
        if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
          const clientWithUser = await storage.getClientWithUser(clientId);
          if (!clientWithUser || clientWithUser.user.organizationId !== reqUser.organizationId) {
            console.log(`User from organization ${reqUser.organizationId} attempted to access client from another organization`);
            return res.status(403).json({ message: "You don't have permission to access this client's maintenances" });
          }
        }
        
        upcomingMaintenances = await storage.getMaintenancesByClientId(clientId);
        
        // Filter to only include future maintenances
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        upcomingMaintenances = upcomingMaintenances.filter(maintenance => {
          const scheduleDate = new Date(maintenance.scheduleDate);
          scheduleDate.setHours(0, 0, 0, 0);
          
          // Calculate days difference
          const diffTime = scheduleDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return diffDays >= 0 && diffDays <= days;
        });
      } else {
        upcomingMaintenances = await storage.getUpcomingMaintenances(days);
        
        // If user is not a system_admin, we need to filter by organization
        if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
          console.log(`[API] Filtering upcoming maintenances for organization ${reqUser.organizationId}`);
          
          // We need to find only maintenances for clients in this organization
          // First, gather all details and then filter
          const maintenancesWithClientInfo = await Promise.all(
            upcomingMaintenances.map(async (maintenance) => {
              const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
              return { maintenance, clientWithUser };
            })
          );
          
          // Filter to only include maintenances for clients in the user's organization
          const filteredMaintItems = maintenancesWithClientInfo.filter(item => 
            item.clientWithUser && 
            item.clientWithUser.user && 
            item.clientWithUser.user.organizationId === reqUser.organizationId
          );
          
          // Extract just the maintenance objects from the filtered list
          upcomingMaintenances = filteredMaintItems.map(item => item.maintenance);
          
          console.log(`[API] After organization filtering: ${upcomingMaintenances.length} upcoming maintenances`);
        }
      }

      // Fetch additional data for each maintenance
      const maintenancesWithDetails = await Promise.all(
        upcomingMaintenances.map(async (maintenance) => {
          const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
          let technicianWithUser = null;

          if (maintenance.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
          }

          return {
            ...maintenance,
            client: clientWithUser,
            technician: technicianWithUser
          };
        })
      );

      res.json(maintenancesWithDetails);
    } catch (error) {
      console.error("[API] Error fetching upcoming maintenances:", error);
      res.status(500).json({ message: "Failed to fetch upcoming maintenances" });
    }
  });

  app.get("/api/maintenances/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const maintenance = await storage.getMaintenance(id);

      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance not found" });
      }

      const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Client information not found" });
      }
      
      // Check if user is authenticated and has permission to view this maintenance
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to access maintenance from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this maintenance" });
        }
      }
      
      let technicianWithUser = null;

      if (maintenance.technicianId) {
        technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
      }

      res.json({
        ...maintenance,
        client: clientWithUser,
        technician: technicianWithUser
      });
    } catch (error) {
      console.error("Error fetching maintenance:", error);
      res.status(500).json({ message: "Failed to fetch maintenance" });
    }
  });

  app.post("/api/maintenances", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertMaintenanceSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(validation.data.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Client information not found" });
      }
      
      // Check if user is authenticated and has permission to create maintenance for this client
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to create maintenance for client from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to create maintenance for this client" });
        }
      }

      const maintenance = await storage.createMaintenance(validation.data);
      res.status(201).json(maintenance);
    } catch (error) {
      console.error("Error creating maintenance:", error);
      res.status(500).json({ message: "Failed to create maintenance" });
    }
  });

  app.patch("/api/maintenances/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const maintenance = await storage.getMaintenance(id);

      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance not found" });
      }
      
      // Get client information to check organization
      const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Client information not found" });
      }
      
      // Check if user is authenticated and has permission to update this maintenance
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to update maintenance from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this maintenance" });
        }
      }

      const updatedMaintenance = await storage.updateMaintenance(id, req.body);
      res.json(updatedMaintenance);
    } catch (error) {
      console.error("Error updating maintenance:", error);
      res.status(500).json({ message: "Failed to update maintenance" });
    }
  });

  // Repair routes
  app.get("/api/repairs", async (req: Request, res: Response) => {
    try {
      // Check user's organization for filtering
      const reqUser = req.user as any;
      let repairs = await storage.getAllRepairs();
      
      // Filter by organization if user is not a system_admin
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        console.log(`[API] Filtering repairs for organization ${reqUser.organizationId}`);
        
        // We need to find only repairs for clients in this organization
        // First, gather all details and then filter
        const repairsWithClientInfo = await Promise.all(
          repairs.map(async (repair) => {
            const clientWithUser = await storage.getClientWithUser(repair.clientId);
            return { repair, clientWithUser };
          })
        );
        
        // Filter to only include repairs for clients in the user's organization
        const filteredRepairItems = repairsWithClientInfo.filter(item => 
          item.clientWithUser && 
          item.clientWithUser.user && 
          item.clientWithUser.user.organizationId === reqUser.organizationId
        );
        
        // Extract just the repair objects from the filtered list
        repairs = filteredRepairItems.map(item => item.repair);
        
        console.log(`[API] After organization filtering: ${repairs.length} records`);
      } else {
        console.log(`[API] No organization filtering applied, returning all ${repairs.length} repairs`);
      }

      // Fetch additional data for each repair
      const repairsWithDetails = await Promise.all(
        repairs.map(async (repair) => {
          const clientWithUser = await storage.getClientWithUser(repair.clientId);
          let technicianWithUser = null;

          if (repair.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
          }

          return {
            ...repair,
            client: clientWithUser,
            technician: technicianWithUser
          };
        })
      );

      res.json(repairsWithDetails);
    } catch (error) {
      console.error("Error fetching repairs:", error);
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });

  app.get("/api/repairs/recent", async (req: Request, res: Response) => {
    try {
      const count = parseInt(req.query.count as string) || 5;
      let recentRepairs = await storage.getRecentRepairs(count);
      
      // Check user's organization for filtering
      const reqUser = req.user as any;
      
      // Filter by organization if user is not a system_admin
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        console.log(`[API] Filtering recent repairs for organization ${reqUser.organizationId}`);
        
        // We need to find only repairs for clients in this organization
        // First, gather all details and then filter
        const repairsWithClientInfo = await Promise.all(
          recentRepairs.map(async (repair) => {
            const clientWithUser = await storage.getClientWithUser(repair.clientId);
            return { repair, clientWithUser };
          })
        );
        
        // Filter to only include repairs for clients in the user's organization
        const filteredRepairItems = repairsWithClientInfo.filter(item => 
          item.clientWithUser && 
          item.clientWithUser.user && 
          item.clientWithUser.user.organizationId === reqUser.organizationId
        );
        
        // Extract just the repair objects from the filtered list
        recentRepairs = filteredRepairItems.map(item => item.repair);
        
        console.log(`[API] After organization filtering: ${recentRepairs.length} recent repairs`);
      } else {
        console.log(`[API] No organization filtering applied, returning all ${recentRepairs.length} recent repairs`);
      }

      // Fetch additional data for each repair
      const repairsWithDetails = await Promise.all(
        recentRepairs.map(async (repair) => {
          const clientWithUser = await storage.getClientWithUser(repair.clientId);
          let technicianWithUser = null;

          if (repair.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
          }

          return {
            ...repair,
            client: clientWithUser,
            technician: technicianWithUser
          };
        })
      );

      res.json(repairsWithDetails);
    } catch (error) {
      console.error("Error fetching recent repairs:", error);
      res.status(500).json({ message: "Failed to fetch recent repairs" });
    }
  });

  app.get("/api/repairs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repair = await storage.getRepair(id);

      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      const clientWithUser = await storage.getClientWithUser(repair.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Client information not found" });
      }
      
      // Check if user is authenticated and has permission to view this repair
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to access repair from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this repair" });
        }
      }
      
      let technicianWithUser = null;

      if (repair.technicianId) {
        technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
      }

      res.json({
        ...repair,
        client: clientWithUser,
        technician: technicianWithUser
      });
    } catch (error) {
      console.error("Error fetching repair:", error);
      res.status(500).json({ message: "Failed to fetch repair" });
    }
  });

  app.post("/api/repairs", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertRepairSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Check if the user has permission to create a repair for this client
      const clientId = validation.data.clientId;
      const client = await storage.getClientWithUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Verify organization access
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If user is not a system_admin, check organization membership
        if (reqUser.role !== 'system_admin' && 
            client.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to create repair for client from organization ${client.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to create a repair for this client" });
        }
      }

      const repair = await storage.createRepair(validation.data);
      res.status(201).json(repair);
    } catch (error) {
      console.error("Error creating repair:", error);
      res.status(500).json({ message: "Failed to create repair" });
    }
  });

  app.patch("/api/repairs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repair = await storage.getRepair(id);

      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }
      
      // Check if user has permission to update this repair
      const clientWithUser = await storage.getClientWithUser(repair.clientId);
      if (!clientWithUser) {
        return res.status(404).json({ message: "Client information not found" });
      }
      
      // Check if user is authenticated and has permission to update this repair
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId) {
        // If the user is not a system_admin, check if the client belongs to their organization
        if (reqUser.role !== 'system_admin' && 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`User from organization ${reqUser.organizationId} attempted to update repair from organization ${clientWithUser.user.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this repair" });
        }
      }

      const updatedRepair = await storage.updateRepair(id, req.body);
      res.json(updatedRepair);
    } catch (error) {
      console.error("Error updating repair:", error);
      res.status(500).json({ message: "Failed to update repair" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req: Request, res: Response) => {
    try {
      const invoices = await storage.getAllInvoices();

      // Check user's organization for filtering
      const reqUser = req.user as any;
      
      // Fetch additional data for each invoice
      const invoicesWithDetails = await Promise.all(
        invoices.map(async (invoice) => {
          const clientWithUser = await storage.getClientWithUser(invoice.clientId);

          return {
            ...invoice,
            client: clientWithUser
          };
        })
      );
      
      // Filter by organization if user is not a system_admin
      let filteredInvoices = invoicesWithDetails;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        console.log(`[API] Filtering invoices for organization ${reqUser.organizationId}`);
        
        // Filter to only include invoices for clients in the user's organization
        filteredInvoices = invoicesWithDetails.filter(invoice => 
          invoice.client && 
          invoice.client.user && 
          invoice.client.user.organizationId === reqUser.organizationId
        );
        
        console.log(`[API] After organization filtering: ${filteredInvoices.length} of ${invoicesWithDetails.length} invoices`);
      } else {
        console.log(`[API] No organization filtering applied, returning all ${invoicesWithDetails.length} invoices`);
      }

      res.json(filteredInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const clientWithUser = await storage.getClientWithUser(invoice.clientId);
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the invoice belongs to a client in the user's organization
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access invoice from organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this invoice" });
        }
      }

      res.json({
        ...invoice,
        client: clientWithUser
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertInvoiceSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      
      // First, check if the client belongs to user's organization
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        const clientId = validation.data.clientId;
        const clientWithUser = await storage.getClientWithUser(clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to create invoice for client from organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to create an invoice for this client" });
        }
      }

      const invoice = await storage.createInvoice(validation.data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the invoice belongs to a client in the user's organization
        const clientWithUser = await storage.getClientWithUser(invoice.clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to update invoice from organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this invoice" });
        }
      }

      const updatedInvoice = await storage.updateInvoice(id, req.body);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Dashboard summary route
  // Special endpoint just for contract type updates
  app.post("/api/clients/:id/contract-type", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    const { contractType } = req.body;
    
    console.log(`[CONTRACT TYPE API] Received update request for client ${id} with type "${contractType}"`);
    
    // Normalize and validate
    let validatedType: string | null = null;
    
    if (contractType === null || contractType === undefined || contractType === '') {
      validatedType = null;
    } else {
      const normalizedType = String(contractType).toLowerCase();
      if (!['residential', 'commercial', 'service', 'maintenance'].includes(normalizedType)) {
        return res.status(400).json({ 
          message: `Invalid contract type: ${normalizedType}. Must be one of: residential, commercial, service, maintenance, or null.`
        });
      }
      validatedType = normalizedType;
    }
    
    try {
      // Get current client
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      console.log(`[CONTRACT TYPE API] Current type: "${client.contractType}" -> New type: "${validatedType}"`);
      
      // Direct update to just the contract type
      const updatedClient = await storage.updateClient(id, { contractType: validatedType });
      
      if (!updatedClient) {
        return res.status(500).json({ message: "Failed to update client" });
      }
      
      console.log(`[CONTRACT TYPE API] Update successful, new value: "${updatedClient.contractType}"`);
      res.json(updatedClient);
    } catch (error) {
      console.error("[CONTRACT TYPE API] Error:", error);
      res.status(500).json({ 
        message: "Error updating contract type",
        error: String(error)
      });
    }
  });

  // Pool Equipment endpoints
  app.get("/api/clients/:id/equipment", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the client belongs to user's organization
        const clientWithUser = await storage.getClientWithUser(clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access equipment from client in organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this client's equipment" });
        }
      }

      const equipment = await storage.getPoolEquipmentByClientId(clientId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching pool equipment:", error);
      res.status(500).json({ message: "Failed to fetch pool equipment" });
    }
  });

  app.post("/api/clients/:id/equipment", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the client belongs to user's organization
        const clientWithUser = await storage.getClientWithUser(clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to create equipment for client in organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to add equipment for this client" });
        }
      }

      const equipmentData = insertPoolEquipmentSchema.parse({
        ...req.body,
        clientId: clientId
      });

      const newEquipment = await storage.createPoolEquipment(equipmentData);
      res.status(201).json(newEquipment);
    } catch (error) {
      console.error("Error creating pool equipment:", error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          details: validationError.message 
        });
      }
      res.status(500).json({ message: "Failed to create pool equipment" });
    }
  });

  app.patch("/api/pool-equipment/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }
      
      // Get equipment to check existence and access
      const equipment = await storage.getPoolEquipment(id);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the equipment belongs to a client in the user's organization
        const clientWithUser = await storage.getClientWithUser(equipment.clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to update equipment for client in organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this equipment" });
        }
      }

      const updatedEquipment = await storage.updatePoolEquipment(id, req.body);
      res.json(updatedEquipment);
    } catch (error) {
      console.error("Error updating pool equipment:", error);
      res.status(500).json({ message: "Failed to update pool equipment" });
    }
  });

  // Pool Images endpoints
  app.get("/api/clients/:id/images", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the client belongs to user's organization
        const clientWithUser = await storage.getClientWithUser(clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access images from client in organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this client's images" });
        }
      }

      const images = await storage.getPoolImagesByClientId(clientId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching pool images:", error);
      res.status(500).json({ message: "Failed to fetch pool images" });
    }
  });

  app.post("/api/clients/:id/images", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the client belongs to user's organization
        const clientWithUser = await storage.getClientWithUser(clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to create an image for client in organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to add images for this client" });
        }
      }

      const imageData = insertPoolImageSchema.parse({
        ...req.body,
        clientId: clientId
      });

      const newImage = await storage.createPoolImage(imageData);
      res.status(201).json(newImage);
    } catch (error) {
      console.error("Error creating pool image:", error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          details: validationError.message 
        });
      }
      res.status(500).json({ message: "Failed to create pool image" });
    }
  });

  // Service Template routes
  app.get("/api/service-templates", async (_req: Request, res: Response) => {
    try {
      const templates = await storage.getAllServiceTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service templates" });
    }
  });
  
  app.get("/api/service-templates/default/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type;
      const template = await storage.getDefaultServiceTemplate(type);
      
      if (!template) {
        return res.status(404).json({ message: "Default template not found for this type" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch default service template" });
    }
  });

  app.get("/api/service-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getServiceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Service template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service template" });
    }
  });

  app.post("/api/service-templates", async (req: Request, res: Response) => {
    try {
      const result = validateRequest(insertServiceTemplateSchema, req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // If setting as default, make sure to include at least one checklist item
      if (req.body.isDefault && (!req.body.checklistItems || req.body.checklistItems.length === 0)) {
        return res.status(400).json({ 
          message: "Default templates must include at least one checklist item" 
        });
      }

      const template = await storage.createServiceTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating service template:", error);
      res.status(500).json({ message: "Failed to create service template" });
    }
  });

  app.patch("/api/service-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getServiceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Service template not found" });
      }
      
      const updatedTemplate = await storage.updateServiceTemplate(id, req.body);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating service template:", error);
      res.status(500).json({ message: "Failed to update service template" });
    }
  });

  app.delete("/api/service-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const success = await storage.deleteServiceTemplate(id);
      if (!success) {
        return res.status(404).json({ message: "Service template not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service template:", error);
      res.status(500).json({ message: "Failed to delete service template" });
    }
  });

  // Chemical Usage endpoints
  app.post("/api/chemical-usage", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertChemicalUsageSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const chemicalUsage = await storage.createChemicalUsage(validation.data);
      res.status(201).json(chemicalUsage);
    } catch (error) {
      console.error("Error creating chemical usage record:", error);
      res.status(500).json({ message: "Failed to create chemical usage record" });
    }
  });
  
  app.get("/api/chemical-usage/maintenance/:maintenanceId", async (req: Request, res: Response) => {
    try {
      const maintenanceId = parseInt(req.params.maintenanceId);
      
      if (isNaN(maintenanceId)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
      }
      
      const chemicalUsages = await storage.getChemicalUsageByMaintenanceId(maintenanceId);
      res.json(chemicalUsages);
    } catch (error) {
      console.error("Error fetching chemical usage records:", error);
      res.status(500).json({ message: "Failed to fetch chemical usage records" });
    }
  });
  
  app.get("/api/chemical-usage/type/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type;
      
      if (!CHEMICAL_TYPES.includes(type as ChemicalType)) {
        return res.status(400).json({ 
          message: "Invalid chemical type",
          validTypes: CHEMICAL_TYPES
        });
      }
      
      const chemicalUsages = await storage.getChemicalUsageByType(type as ChemicalType);
      res.json(chemicalUsages);
    } catch (error) {
      console.error("Error fetching chemical usage by type:", error);
      res.status(500).json({ message: "Failed to fetch chemical usage records" });
    }
  });
  
  // Water Readings endpoints
  app.post("/api/water-readings", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertWaterReadingsSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Check organization security for maintenance-related water readings
      if (validation.data.maintenanceId) {
        const reqUser = req.user as any;
        if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
          // Get the maintenance record to find the client
          const maintenance = await storage.getMaintenance(validation.data.maintenanceId);
          
          if (maintenance) {
            // Check if the client belongs to user's organization
            const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
            
            if (!clientWithUser || !clientWithUser.user || 
                clientWithUser.user.organizationId !== reqUser.organizationId) {
              console.log(`[API] User from organization ${reqUser.organizationId} attempted to add water readings for client in organization ${clientWithUser?.user?.organizationId}`);
              return res.status(403).json({ message: "You don't have permission to add water readings for this maintenance record" });
            }
          } else {
            return res.status(404).json({ message: "Maintenance record not found" });
          }
        }
      }
      
      const waterReading = await storage.createWaterReading(validation.data);
      res.status(201).json(waterReading);
    } catch (error) {
      console.error("Error creating water reading:", error);
      res.status(500).json({ message: "Failed to create water reading" });
    }
  });
  
  app.get("/api/water-readings/maintenance/:maintenanceId", async (req: Request, res: Response) => {
    try {
      const maintenanceId = parseInt(req.params.maintenanceId);
      
      if (isNaN(maintenanceId)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Get the maintenance record first to check organization boundaries
        const maintenance = await storage.getMaintenance(maintenanceId);
        
        if (!maintenance) {
          return res.status(404).json({ message: "Maintenance record not found" });
        }
        
        // Get the client to check organization
        const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access water readings for maintenance in organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access water readings for this maintenance" });
        }
      }
      
      const waterReadings = await storage.getWaterReadingsByMaintenanceId(maintenanceId);
      res.json(waterReadings);
    } catch (error) {
      console.error("Error fetching water readings:", error);
      res.status(500).json({ message: "Failed to fetch water readings" });
    }
  });
  
  app.get("/api/water-readings/latest/client/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the client belongs to user's organization
        const clientWithUser = await storage.getClientWithUser(clientId);
        
        if (!clientWithUser || !clientWithUser.user || 
            clientWithUser.user.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access water readings from client in organization ${clientWithUser?.user?.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this client's water readings" });
        }
      }
      
      const waterReading = await storage.getLatestWaterReadingByClientId(clientId);
      
      if (!waterReading) {
        return res.status(404).json({ message: "No water readings found for client" });
      }
      
      res.json(waterReading);
    } catch (error) {
      console.error("Error fetching latest water reading:", error);
      res.status(500).json({ message: "Failed to fetch latest water reading" });
    }
  });

  // Maintenance Report Routes
  app.get("/api/maintenance-reports/:id", async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // This would require joining reports to maintenances to clients to verify organization
        // For simplicity, we'll implement basic access check
        const report = await storage.getMaintenanceReport(reportId);
        if (report) {
          const maintenance = await storage.getMaintenance(report.maintenanceId);
          if (maintenance) {
            const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
            
            if (!clientWithUser || !clientWithUser.user || 
                clientWithUser.user.organizationId !== reqUser.organizationId) {
              console.log(`[API] User from organization ${reqUser.organizationId} attempted to access maintenance report from client in organization ${clientWithUser?.user?.organizationId}`);
              return res.status(403).json({ message: "You don't have permission to access this maintenance report" });
            }
          }
        }
      }
      
      const report = await storage.getMaintenanceReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Maintenance report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching maintenance report:", error);
      res.status(500).json({ message: "Failed to fetch maintenance report" });
    }
  });

  app.get("/api/maintenance-reports/maintenance/:maintenanceId", async (req: Request, res: Response) => {
    try {
      const maintenanceId = parseInt(req.params.maintenanceId);
      
      if (isNaN(maintenanceId)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the maintenance belongs to user's organization
        const maintenance = await storage.getMaintenance(maintenanceId);
        if (maintenance) {
          const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
          
          if (!clientWithUser || !clientWithUser.user || 
              clientWithUser.user.organizationId !== reqUser.organizationId) {
            console.log(`[API] User from organization ${reqUser.organizationId} attempted to access maintenance reports from client in organization ${clientWithUser?.user?.organizationId}`);
            return res.status(403).json({ message: "You don't have permission to access these maintenance reports" });
          }
        }
      }
      
      const reports = await storage.getMaintenanceReportsByMaintenanceId(maintenanceId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching maintenance reports:", error);
      res.status(500).json({ message: "Failed to fetch maintenance reports" });
    }
  });

  app.post("/api/maintenance-reports", async (req: Request, res: Response) => {
    try {
      const reportData = req.body;
      
      // Basic validation
      if (!reportData.maintenanceId) {
        return res.status(400).json({ message: "Maintenance ID is required" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the maintenance belongs to user's organization
        const maintenance = await storage.getMaintenance(reportData.maintenanceId);
        if (maintenance) {
          const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
          
          if (!clientWithUser || !clientWithUser.user || 
              clientWithUser.user.organizationId !== reqUser.organizationId) {
            console.log(`[API] User from organization ${reqUser.organizationId} attempted to create maintenance report for client in organization ${clientWithUser?.user?.organizationId}`);
            return res.status(403).json({ message: "You don't have permission to create a maintenance report for this client" });
          }
        }
      }
      
      const report = await storage.createMaintenanceReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating maintenance report:", error);
      res.status(500).json({ message: "Failed to create maintenance report" });
    }
  });

  app.patch("/api/maintenance-reports/:id", async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      const reportData = req.body;
      
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the report belongs to user's organization
        const existingReport = await storage.getMaintenanceReport(reportId);
        if (existingReport) {
          const maintenance = await storage.getMaintenance(existingReport.maintenanceId);
          if (maintenance) {
            const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
            
            if (!clientWithUser || !clientWithUser.user || 
                clientWithUser.user.organizationId !== reqUser.organizationId) {
              console.log(`[API] User from organization ${reqUser.organizationId} attempted to update maintenance report for client in organization ${clientWithUser?.user?.organizationId}`);
              return res.status(403).json({ message: "You don't have permission to update this maintenance report" });
            }
          }
        }
      }
      
      const updatedReport = await storage.updateMaintenanceReport(reportId, reportData);
      
      if (!updatedReport) {
        return res.status(404).json({ message: "Maintenance report not found" });
      }
      
      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating maintenance report:", error);
      res.status(500).json({ message: "Failed to update maintenance report" });
    }
  });

  app.delete("/api/maintenance-reports/:id", async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Check if the report belongs to user's organization
        const existingReport = await storage.getMaintenanceReport(reportId);
        if (existingReport) {
          const maintenance = await storage.getMaintenance(existingReport.maintenanceId);
          if (maintenance) {
            const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
            
            if (!clientWithUser || !clientWithUser.user || 
                clientWithUser.user.organizationId !== reqUser.organizationId) {
              console.log(`[API] User from organization ${reqUser.organizationId} attempted to delete maintenance report for client in organization ${clientWithUser?.user?.organizationId}`);
              return res.status(403).json({ message: "You don't have permission to delete this maintenance report" });
            }
          }
        }
      }
      
      const success = await storage.deleteMaintenanceReport(reportId);
      
      if (!success) {
        return res.status(404).json({ message: "Maintenance report not found or could not be deleted" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting maintenance report:", error);
      res.status(500).json({ message: "Failed to delete maintenance report" });
    }
  });

  // Communication Provider endpoints
  app.get("/api/communication-providers", async (req: Request, res: Response) => {
    try {
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Filter providers by organization
        const providers = await storage.getAllCommunicationProviders();
        // Only return providers associated with this organization
        const filteredProviders = providers.filter(provider => 
          provider.organizationId === reqUser.organizationId
        );
        res.status(200).json(filteredProviders);
      } else if (reqUser && reqUser.role === 'system_admin') {
        // System admins can see all providers
        const providers = await storage.getAllCommunicationProviders();
        res.status(200).json(providers);
      } else {
        // No user or invalid permissions
        res.status(403).json({ message: "Unauthorized access to communication providers" });
      }
    } catch (error) {
      console.error("Error fetching communication providers:", error);
      res.status(500).json({ message: "Failed to fetch communication providers" });
    }
  });

  app.get("/api/communication-providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const provider = await storage.getCommunicationProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Communication provider not found" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Only allow access to providers in the user's organization
        if (provider.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access provider from organization ${provider.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this communication provider" });
        }
      }
      
      res.status(200).json(provider);
    } catch (error) {
      console.error("Error fetching communication provider:", error);
      res.status(500).json({ message: "Failed to fetch communication provider" });
    }
  });

  app.get("/api/communication-providers/type/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type as CommunicationProviderType;
      if (!type || !COMMUNICATION_PROVIDER_TYPES.includes(type as any)) {
        return res.status(400).json({ 
          message: "Invalid provider type", 
          validTypes: COMMUNICATION_PROVIDER_TYPES 
        });
      }
      
      // Get provider and check organization boundaries
      const provider = await storage.getCommunicationProviderByType(type);
      if (!provider) {
        return res.status(404).json({ message: `No ${type} provider found` });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Only allow access to providers in the user's organization
        if (provider.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access provider from organization ${provider.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this communication provider" });
        }
      }
      
      res.status(200).json(provider);
    } catch (error) {
      console.error("Error fetching communication provider by type:", error);
      res.status(500).json({ message: "Failed to fetch communication provider" });
    }
  });

  app.get("/api/communication-providers/default/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type as CommunicationProviderType;
      if (!type || !COMMUNICATION_PROVIDER_TYPES.includes(type as any)) {
        return res.status(400).json({ 
          message: "Invalid provider type", 
          validTypes: COMMUNICATION_PROVIDER_TYPES 
        });
      }
      
      const provider = await storage.getDefaultCommunicationProvider(type);
      if (!provider) {
        return res.status(404).json({ message: `No default ${type} provider found` });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Only allow access to providers in the user's organization
        if (provider.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access provider from organization ${provider.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this communication provider" });
        }
      }
      
      res.status(200).json(provider);
    } catch (error) {
      console.error("Error fetching default communication provider:", error);
      res.status(500).json({ message: "Failed to fetch default communication provider" });
    }
  });

  app.post("/api/communication-providers", async (req: Request, res: Response) => {
    try {
      // Validate request body using our schema
      const validation = validateRequest(insertCommunicationProviderSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Assign the provider to the user's organization
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Add organization ID to the data
        validation.data.organizationId = reqUser.organizationId;
      } else if (reqUser && reqUser.role === 'system_admin' && req.body.organizationId) {
        // System admin can specify an organization ID
        validation.data.organizationId = req.body.organizationId;
      } else if (!validation.data.organizationId) {
        // Default to organization 1 if none provided and no user context
        validation.data.organizationId = 1;
        console.log('No organization context available, defaulting to organization ID 1');
      }
      
      const newProvider = await storage.createCommunicationProvider(validation.data);
      res.status(201).json(newProvider);
    } catch (error) {
      console.error("Error creating communication provider:", error);
      res.status(500).json({ message: "Failed to create communication provider" });
    }
  });

  app.patch("/api/communication-providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      // First get the existing provider
      const provider = await storage.getCommunicationProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Communication provider not found" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Only allow access to providers in the user's organization
        if (provider.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to update provider from organization ${provider.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this communication provider" });
        }
      }
      
      // No need to validate the full schema for a partial update
      // But we should ensure type is valid if included
      if (req.body.type && !COMMUNICATION_PROVIDER_TYPES.includes(req.body.type)) {
        return res.status(400).json({ 
          message: "Invalid provider type", 
          validTypes: COMMUNICATION_PROVIDER_TYPES 
        });
      }
      
      // Prevent changing organization unless the user is a system admin
      if (req.body.organizationId !== undefined) {
        if (reqUser && reqUser.role !== 'system_admin') {
          // Remove organizationId from the update data
          delete req.body.organizationId;
          console.log('[API] Non-system admin attempted to change provider organization ID - field removed from update');
        }
      }
      
      const updatedProvider = await storage.updateCommunicationProvider(id, req.body);
      
      res.status(200).json(updatedProvider);
    } catch (error) {
      console.error("Error updating communication provider:", error);
      res.status(500).json({ message: "Failed to update communication provider" });
    }
  });

  app.delete("/api/communication-providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      // First get the existing provider to check organization permissions
      const provider = await storage.getCommunicationProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Communication provider not found" });
      }
      
      // Check organization security
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Only allow access to providers in the user's organization
        if (provider.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to delete provider from organization ${provider.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to delete this communication provider" });
        }
      }
      
      const success = await storage.deleteCommunicationProvider(id);
      if (!success) {
        return res.status(404).json({ message: "Communication provider not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting communication provider:", error);
      res.status(500).json({ message: "Failed to delete communication provider" });
    }
  });

  /**
   * Pool Service Routes Operations
   * 
   * IMPORTANT: These endpoints manage "service routes" which represent the scheduled
   * paths that technicians follow to service multiple pool clients.
   * 
   * This is distinct from API routing/HTTP routes which define the server endpoints.
   */
  app.get("/api/service-routes", async (req: Request, res: Response) => {
    try {
      let routes = await storage.getAllRoutes();
      
      // Apply organization filtering
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Filter routes to only show the user's organization
        routes = routes.filter(route => route.organizationId === reqUser.organizationId);
        console.log(`[API] Filtered service routes to organization ${reqUser.organizationId}, found ${routes.length} routes`);
      } else if (reqUser && reqUser.role === 'system_admin') {
        // System admin can see all routes across organizations
        console.log(`[API] System admin retrieving all service routes, found ${routes.length} routes`);
      } else {
        // Not authenticated - return forbidden
        return res.status(403).json({ message: "Authentication required to access service routes" });
      }
      
      // Fetch assignments for each route
      const routesWithAssignments = await Promise.all(
        routes.map(async (route) => {
          const assignments = await storage.getRouteAssignmentsByRouteId(route.id);
          
          // For each assignment, fetch the maintenance details
          const assignmentsWithMaintenance = await Promise.all(
            assignments.map(async (assignment) => {
              const maintenance = await storage.getMaintenance(assignment.maintenanceId);
              
              if (maintenance) {
                // Get client details
                const client = await storage.getClientWithUser(maintenance.clientId);
                
                // Get technician details if assigned
                let technician = null;
                if (maintenance.technicianId) {
                  technician = await storage.getTechnicianWithUser(maintenance.technicianId);
                }
                
                return {
                  ...assignment,
                  maintenance: {
                    ...maintenance,
                    client,
                    technician
                  }
                };
              }
              
              return assignment;
            })
          );
          
          return {
            ...route,
            assignments: assignmentsWithMaintenance
          };
        })
      );
      
      res.json(routesWithAssignments);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  app.get("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      const route = await storage.getRoute(id);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Apply organization security check
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Only allow access to routes in the user's organization
        if (route.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access route from organization ${route.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this route" });
        }
      } else if (!reqUser) {
        // Not authenticated - return forbidden
        return res.status(403).json({ message: "Authentication required to access route details" });
      }
      
      res.json(route);
    } catch (error) {
      console.error("Error fetching route:", error);
      res.status(500).json({ message: "Failed to fetch route" });
    }
  });

  app.post("/api/routes", async (req: Request, res: Response) => {
    try {
      // Apply organization security check
      const reqUser = req.user as any;
      if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to create routes" });
      }
      
      const validation = validateRequest(insertRouteSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Add organization ID to route data for multi-tenant security
      let routeData = validation.data;
      if (reqUser.organizationId) {
        routeData = {
          ...routeData,
          organizationId: reqUser.organizationId
        };
        console.log(`[API] Creating new route for organization ${reqUser.organizationId}`);
      } else if (reqUser.role === 'system_admin') {
        // For system admins, allow the organization to be specified in the request
        // but only if it's explicitly provided
        if (!routeData.organizationId) {
          return res.status(400).json({ 
            message: "System administrators must specify an organization ID when creating routes" 
          });
        }
        console.log(`[API] System admin creating route for organization ${routeData.organizationId}`);
      }
      
      const route = await storage.createRoute(routeData);
      res.status(201).json(route);
    } catch (error) {
      console.error("Error creating route:", error);
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  app.patch("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      // Get existing route to check organization permissions
      const existingRoute = await storage.getRoute(id);
      if (!existingRoute) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Apply organization security check
      const reqUser = req.user as any;
      if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to update routes" });
      }
      
      // Check organization boundary for non-system admins
      if (reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (existingRoute.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to update route from organization ${existingRoute.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this route" });
        }
      }
      
      // Prevent organization ID changes for security reasons
      if (req.body.organizationId && existingRoute.organizationId !== req.body.organizationId) {
        // Only system admins can change organization assignments
        if (reqUser.role !== 'system_admin') {
          console.log(`[API] Attempt to change route organization from ${existingRoute.organizationId} to ${req.body.organizationId} blocked`);
          return res.status(403).json({ message: "You don't have permission to change a route's organization" });
        }
      }
      
      // Proceed with update
      const route = await storage.updateRoute(id, req.body);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  app.delete("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      // Get existing route to check organization permissions
      const existingRoute = await storage.getRoute(id);
      if (!existingRoute) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Apply organization security check
      const reqUser = req.user as any;
      if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to delete routes" });
      }
      
      // Check organization boundary for non-system admins
      if (reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (existingRoute.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to delete route from organization ${existingRoute.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to delete this route" });
        }
      }
      
      // Only after permission check, proceed with deletion
      const success = await storage.deleteRoute(id);
      if (!success) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  app.get("/api/technicians/:technicianId/routes", async (req: Request, res: Response) => {
    try {
      const technicianId = parseInt(req.params.technicianId);
      if (isNaN(technicianId)) {
        return res.status(400).json({ message: "Invalid technician ID" });
      }
      
      // Verify technician exists
      const technician = await storage.getTechnician(technicianId);
      if (!technician) {
        return res.status(404).json({ message: "Technician not found" });
      }
      
      const routes = await storage.getRoutesByTechnicianId(technicianId);
      res.json(routes);
    } catch (error) {
      console.error("Error fetching routes by technician:", error);
      res.status(500).json({ message: "Failed to fetch routes by technician" });
    }
  });

  app.get("/api/routes/day/:dayOfWeek", async (req: Request, res: Response) => {
    try {
      const { dayOfWeek } = req.params;
      const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      
      if (!validDays.includes(dayOfWeek.toLowerCase())) {
        return res.status(400).json({ message: "Invalid day of week" });
      }
      
      // Get all routes for the specified day
      const routes = await storage.getRoutesByDayOfWeek(dayOfWeek.toLowerCase());
      
      // Apply organization filtering
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Filter routes to only show those from user's organization
        const filteredRoutes = routes.filter(route => route.organizationId === reqUser.organizationId);
        res.json(filteredRoutes);
      } else if (reqUser && reqUser.role === 'system_admin') {
        // System admins can see all routes
        res.json(routes);
      } else {
        // Not authenticated or missing organization info
        return res.status(403).json({ message: "Authentication required to view routes" });
      }
    } catch (error) {
      console.error("Error fetching routes by day of week:", error);
      res.status(500).json({ message: "Failed to fetch routes by day of week" });
    }
  });

  app.get("/api/routes/type/:type", async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const validTypes = ["residential", "commercial", "mixed"];
      
      if (!validTypes.includes(type.toLowerCase())) {
        return res.status(400).json({ 
          message: "Invalid route type", 
          validTypes 
        });
      }
      
      // Get all routes for the specified type
      const routes = await storage.getRoutesByType(type.toLowerCase());
      
      // Apply organization filtering
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Filter routes to only show those from user's organization
        const filteredRoutes = routes.filter(route => route.organizationId === reqUser.organizationId);
        res.json(filteredRoutes);
      } else if (reqUser && reqUser.role === 'system_admin') {
        // System admins can see all routes
        res.json(routes);
      } else {
        // Not authenticated or missing organization info
        return res.status(403).json({ message: "Authentication required to view routes" });
      }
    } catch (error) {
      console.error("Error fetching routes by type:", error);
      res.status(500).json({ message: "Failed to fetch routes by type" });
    }
  });

  // Route Assignment operations
  app.get("/api/route-assignments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route assignment ID" });
      }
      
      const assignment = await storage.getRouteAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      // Get the route to check organization access
      const route = await storage.getRoute(assignment.routeId);
      if (!route) {
        return res.status(404).json({ message: "Associated route not found" });
      }
      
      // Check organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (route.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access route assignment from organization ${route.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this route assignment" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to view route assignments" });
      }
      
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching route assignment:", error);
      res.status(500).json({ message: "Failed to fetch route assignment" });
    }
  });

  app.post("/api/route-assignments", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertRouteAssignmentSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Check if route exists and verify organization permissions
      const routeId = validation.data.routeId;
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (route.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to create route assignment for route from organization ${route.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to create assignments for this route" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to create route assignments" });
      }
      
      const assignment = await storage.createRouteAssignment(validation.data);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating route assignment:", error);
      res.status(500).json({ message: "Failed to create route assignment" });
    }
  });

  app.patch("/api/route-assignments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route assignment ID" });
      }
      
      // Get the current assignment to check permissions
      const currentAssignment = await storage.getRouteAssignment(id);
      if (!currentAssignment) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      // Get the route to check organization permissions
      const route = await storage.getRoute(currentAssignment.routeId);
      if (!route) {
        return res.status(404).json({ message: "Associated route not found" });
      }
      
      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (route.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to update route assignment for route from organization ${route.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this route assignment" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to update route assignments" });
      }
      
      // If the routeId is being updated, check permissions for the new route too
      if (req.body.routeId && req.body.routeId !== currentAssignment.routeId) {
        const newRoute = await storage.getRoute(req.body.routeId);
        if (!newRoute) {
          return res.status(404).json({ message: "New route not found" });
        }
        
        // Verify organization permission for the new route
        if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
          if (newRoute.organizationId !== reqUser.organizationId) {
            console.log(`[API] User from organization ${reqUser.organizationId} attempted to update route assignment to a route from organization ${newRoute.organizationId}`);
            return res.status(403).json({ message: "You don't have permission to assign to this route" });
          }
        }
      }
      
      const assignment = await storage.updateRouteAssignment(id, req.body);
      if (!assignment) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      console.error("Error updating route assignment:", error);
      res.status(500).json({ message: "Failed to update route assignment" });
    }
  });

  app.delete("/api/route-assignments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route assignment ID" });
      }
      
      // Get the assignment to check permissions
      const assignment = await storage.getRouteAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      // Get the route to check organization permissions
      const route = await storage.getRoute(assignment.routeId);
      if (!route) {
        return res.status(404).json({ message: "Associated route not found" });
      }
      
      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (route.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to delete route assignment for route from organization ${route.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to delete this route assignment" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to delete route assignments" });
      }
      
      const success = await storage.deleteRouteAssignment(id);
      if (!success) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting route assignment:", error);
      res.status(500).json({ message: "Failed to delete route assignment" });
    }
  });

  app.get("/api/routes/:routeId/assignments", async (req: Request, res: Response) => {
    try {
      const routeId = parseInt(req.params.routeId);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      // Verify route exists
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (route.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access route assignments for route from organization ${route.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access assignments for this route" });
        }
      }
      
      const assignments = await storage.getRouteAssignmentsByRouteId(routeId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching route assignments by route ID:", error);
      res.status(500).json({ message: "Failed to fetch route assignments by route ID" });
    }
  });

  app.get("/api/maintenances/:maintenanceId/route-assignments", async (req: Request, res: Response) => {
    try {
      const maintenanceId = parseInt(req.params.maintenanceId);
      if (isNaN(maintenanceId)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
      }
      
      // Verify maintenance exists
      const maintenance = await storage.getMaintenance(maintenanceId);
      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance not found" });
      }
      
      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Get the client to check organization
        const client = await storage.getClient(maintenance.clientId);
        if (!client) {
          return res.status(404).json({ message: "Associated client not found" });
        }
        
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access route assignments for maintenance from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access assignments for this maintenance" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to access route assignments" });
      }
      
      const assignments = await storage.getRouteAssignmentsByMaintenanceId(maintenanceId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching route assignments by maintenance ID:", error);
      res.status(500).json({ message: "Failed to fetch route assignments by maintenance ID" });
    }
  });

  app.post("/api/routes/:routeId/reorder", async (req: Request, res: Response) => {
    try {
      const { assignmentIds } = req.body;
      if (!Array.isArray(assignmentIds)) {
        return res.status(400).json({ message: "Assignment IDs must be an array" });
      }
      
      const routeId = parseInt(req.params.routeId);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      // Verify route exists
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (route.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to reorder route assignments for route from organization ${route.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to reorder assignments for this route" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to reorder route assignments" });
      }
      
      const assignments = await storage.reorderRouteAssignments(routeId, assignmentIds);
      res.json(assignments);
    } catch (error) {
      console.error("Error reordering route assignments:", error);
      res.status(500).json({ message: "Failed to reorder route assignments" });
    }
  });

  app.get("/api/dashboard/summary", async (req: Request, res: Response) => {
    try {
      const reqUser = req.user as any;
      let projects, maintenances, repairs, clients;
      
      // Filter by organization if user is not system_admin
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        // Get organization-specific data
        projects = (await storage.getAllProjects()).filter(p => {
          // For each project, get the client and check their organization
          const client = storage.getClient(p.clientId);
          return client.then(c => c?.organizationId === reqUser.organizationId);
        });
        
        // Filter maintenances by organization through clients
        maintenances = (await storage.getUpcomingMaintenances(7)).filter(m => {
          const client = storage.getClient(m.clientId);
          return client.then(c => c?.organizationId === reqUser.organizationId);
        });
        
        // Filter repairs by organization through clients
        repairs = (await storage.getRecentRepairs(5)).filter(r => {
          const client = storage.getClient(r.clientId);
          return client.then(c => c?.organizationId === reqUser.organizationId);
        });
        
        // Filter clients by organization
        clients = (await storage.getAllClients()).filter(c => 
          c.organizationId === reqUser.organizationId
        );
      } else {
        // System admin or unauthenticated user gets all data
        projects = await storage.getAllProjects();
        maintenances = await storage.getUpcomingMaintenances(7);
        repairs = await storage.getRecentRepairs(5);
        clients = await storage.getAllClients();
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
              const clientWithUser = await storage.getClientWithUser(project.clientId);
              const assignments = await storage.getProjectAssignments(project.id);

              return {
                ...project,
                client: clientWithUser,
                assignmentCount: assignments.length
              };
            })
        ),
        upcomingMaintenances: await Promise.all(
          maintenances.slice(0, 5).map(async (maintenance) => {
            const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;

            if (maintenance.technicianId) {
              technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
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
            const clientWithUser = await storage.getClientWithUser(repair.clientId);
            let technicianWithUser = null;

            if (repair.technicianId) {
              technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
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

  // Project Documentation routes
  app.get("/api/projects/:projectId/documents", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get the project to verify organization permissions
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get the client to check organization
      const client = await storage.getClient(project.clientId);
      if (!client) {
        return res.status(404).json({ message: "Associated client not found" });
      }

      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access project documents from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access these project documents" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to access project documents" });
      }

      const documents = await storage.getProjectDocumentsByProjectId(projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching project documents:", error);
      res.status(500).json({ message: "Failed to fetch project documents" });
    }
  });

  app.get("/api/projects/:projectId/documents/type/:documentType", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get the project to verify organization permissions
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get the client to check organization
      const client = await storage.getClient(project.clientId);
      if (!client) {
        return res.status(404).json({ message: "Associated client not found" });
      }

      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access project documents by type from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access these project documents" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to access project documents" });
      }

      const { documentType } = req.params;
      const documents = await storage.getProjectDocumentsByType(projectId, documentType);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching project documents by type:", error);
      res.status(500).json({ message: "Failed to fetch project documents" });
    }
  });

  app.get("/api/phases/:phaseId/documents", async (req: Request, res: Response) => {
    try {
      const phaseId = parseInt(req.params.phaseId);
      if (isNaN(phaseId)) {
        return res.status(400).json({ message: "Invalid phase ID" });
      }

      // Get the phase to verify organization permissions
      const phase = await storage.getProjectPhase(phaseId);
      if (!phase) {
        return res.status(404).json({ message: "Phase not found" });
      }

      // Get the project
      const project = await storage.getProject(phase.projectId);
      if (!project) {
        return res.status(404).json({ message: "Associated project not found" });
      }

      // Get the client to check organization
      const client = await storage.getClient(project.clientId);
      if (!client) {
        return res.status(404).json({ message: "Associated client not found" });
      }

      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access phase documents from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access these phase documents" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to access phase documents" });
      }

      const documents = await storage.getProjectDocumentsByPhaseId(phaseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching phase documents:", error);
      res.status(500).json({ message: "Failed to fetch phase documents" });
    }
  });

  app.get("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Get the document
      const document = await storage.getProjectDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get the project
      const project = await storage.getProject(document.projectId);
      if (!project) {
        return res.status(404).json({ message: "Associated project not found" });
      }

      // Get the client to check organization
      const client = await storage.getClient(project.clientId);
      if (!client) {
        return res.status(404).json({ message: "Associated client not found" });
      }

      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to access document from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to access this document" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to access documents" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/projects/:projectId/documents", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Validate project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the client to check organization
      const client = await storage.getClient(project.clientId);
      if (!client) {
        return res.status(404).json({ message: "Associated client not found" });
      }

      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to create document for project from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to create documents for this project" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to create project documents" });
      }

      // Validate document data
      const documentData = { ...req.body, projectId };
      const validation = validateRequest(insertProjectDocumentationSchema, documentData);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      // Create document
      const document = await storage.createProjectDocument(validation.data);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating project document:", error);
      res.status(500).json({ message: "Failed to create project document" });
    }
  });

  app.patch("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Check document exists
      const document = await storage.getProjectDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Get the project
      const project = await storage.getProject(document.projectId);
      if (!project) {
        return res.status(404).json({ message: "Associated project not found" });
      }

      // Get the client to check organization
      const client = await storage.getClient(project.clientId);
      if (!client) {
        return res.status(404).json({ message: "Associated client not found" });
      }

      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to update document from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to update this document" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to update documents" });
      }

      // Update document
      const updatedDocument = await storage.updateProjectDocument(id, req.body);
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Check document exists
      const document = await storage.getProjectDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Get the project
      const project = await storage.getProject(document.projectId);
      if (!project) {
        return res.status(404).json({ message: "Associated project not found" });
      }

      // Get the client to check organization
      const client = await storage.getClient(project.clientId);
      if (!client) {
        return res.status(404).json({ message: "Associated client not found" });
      }

      // Verify organization permission
      const reqUser = req.user as any;
      if (reqUser && reqUser.organizationId && reqUser.role !== 'system_admin') {
        if (client.organizationId !== reqUser.organizationId) {
          console.log(`[API] User from organization ${reqUser.organizationId} attempted to delete document from organization ${client.organizationId}`);
          return res.status(403).json({ message: "You don't have permission to delete this document" });
        }
      } else if (!reqUser) {
        return res.status(403).json({ message: "Authentication required to delete documents" });
      }

      // Delete document
      const success = await storage.deleteProjectDocument(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete document" });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Business Module Routes
  
  // Business Dashboard
  app.get("/api/business/dashboard", async (_req: Request, res: Response) => {
    try {
      // Dashboard summary data with placeholder data
      const metrics = {
        totalRevenue: 45231.89,
        expenses: 12756.42,
        profit: 32475.47,
        profitMargin: 71.8,
        // pendingPayroll field removed
        inventoryValue: 32156.90,
        lowStockItems: 7,
        outstandingInvoices: 12
      };
      
      const recentExpenses = [
        { id: 1, date: "2025-02-25", amount: 235.50, category: "supplies", description: "Chlorine tablets", paymentMethod: "credit_card", receiptUrl: null, notes: "Monthly stock", createdAt: "2025-02-25T14:32:00Z" },
        { id: 2, date: "2025-02-22", amount: 890.00, category: "equipment", description: "Replacement pump", paymentMethod: "check", receiptUrl: "receipts/pump-28923.pdf", notes: "For Johnson project", createdAt: "2025-02-22T09:45:00Z" },
        { id: 3, date: "2025-02-20", amount: 125.75, category: "office", description: "Office supplies", paymentMethod: "credit_card", receiptUrl: null, notes: "Paper, ink, etc", createdAt: "2025-02-20T16:10:00Z" }
      ];
      
      // Payroll data has been removed
      
      const lowStockItems = [
        { id: 1, name: "Chlorine tablets", category: "chemicals", currentStock: 5, minimumStock: 10, unit: "bucket", unitPrice: 89.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-15", notes: "Need to reorder", createdAt: "2024-10-15T08:30:00Z" },
        { id: 2, name: "pH Plus", category: "chemicals", currentStock: 3, minimumStock: 8, unit: "gallon", unitPrice: 24.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-28", notes: "Order more next week", createdAt: "2024-10-15T08:35:00Z" }
      ];
      
      const recentTimeEntries = [
        { id: 1, userId: 3, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - framing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:00:00Z" },
        { id: 2, userId: 4, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - plumbing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:05:00Z" },
        { id: 3, userId: 2, projectId: 3, date: "2025-03-01", hoursWorked: 6, description: "Maintenance route - north", status: "approved", approvedBy: 1, notes: "Completed 8 service calls", createdAt: "2025-03-01T15:30:00Z" }
      ];
      
      res.json({
        metrics,
        recentExpenses,
        lowStockItems,
        recentTimeEntries
      });
    } catch (error) {
      console.error("Error fetching business dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch business dashboard data" });
    }
  });

  // Expenses routes
  app.get("/api/business/expenses", async (_req: Request, res: Response) => {
    try {
      // Return placeholder expenses data
      const expenses = [
        { id: 1, date: "2025-02-25", amount: 235.50, category: "supplies", description: "Chlorine tablets", paymentMethod: "credit_card", receiptUrl: null, notes: "Monthly stock", createdAt: "2025-02-25T14:32:00Z" },
        { id: 2, date: "2025-02-22", amount: 890.00, category: "equipment", description: "Replacement pump", paymentMethod: "check", receiptUrl: "receipts/pump-28923.pdf", notes: "For Johnson project", createdAt: "2025-02-22T09:45:00Z" },
        { id: 3, date: "2025-02-20", amount: 125.75, category: "office", description: "Office supplies", paymentMethod: "credit_card", receiptUrl: null, notes: "Paper, ink, etc", createdAt: "2025-02-20T16:10:00Z" },
        { id: 4, date: "2025-02-15", amount: 450.00, category: "vehicle", description: "Truck maintenance", paymentMethod: "credit_card", receiptUrl: "receipts/truck-service.pdf", notes: "Oil change and tune-up", createdAt: "2025-02-15T11:20:00Z" },
        { id: 5, date: "2025-02-10", amount: 1200.00, category: "insurance", description: "Liability insurance", paymentMethod: "bank_transfer", receiptUrl: "receipts/insurance-feb.pdf", notes: "Monthly premium", createdAt: "2025-02-10T09:00:00Z" }
      ];
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/business/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder expense data for the given ID
      const expenses = [
        { id: 1, date: "2025-02-25", amount: 235.50, category: "supplies", description: "Chlorine tablets", paymentMethod: "credit_card", receiptUrl: null, notes: "Monthly stock", createdAt: "2025-02-25T14:32:00Z" },
        { id: 2, date: "2025-02-22", amount: 890.00, category: "equipment", description: "Replacement pump", paymentMethod: "check", receiptUrl: "receipts/pump-28923.pdf", notes: "For Johnson project", createdAt: "2025-02-22T09:45:00Z" },
        { id: 3, date: "2025-02-20", amount: 125.75, category: "office", description: "Office supplies", paymentMethod: "credit_card", receiptUrl: null, notes: "Paper, ink, etc", createdAt: "2025-02-20T16:10:00Z" },
        { id: 4, date: "2025-02-15", amount: 450.00, category: "vehicle", description: "Truck maintenance", paymentMethod: "credit_card", receiptUrl: "receipts/truck-service.pdf", notes: "Oil change and tune-up", createdAt: "2025-02-15T11:20:00Z" },
        { id: 5, date: "2025-02-10", amount: 1200.00, category: "insurance", description: "Liability insurance", paymentMethod: "bank_transfer", receiptUrl: "receipts/insurance-feb.pdf", notes: "Monthly premium", createdAt: "2025-02-10T09:00:00Z" }
      ];
      
      const expense = expenses.find(e => e.id === id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/business/expenses", async (req: Request, res: Response) => {
    try {
      // Create a new expense with a generated ID and return it
      const newExpense = {
        id: 6, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(newExpense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/business/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated expense
      const updatedExpense = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedExpense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/business/expenses/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Payroll routes removed

  // Time Entry routes
  app.get("/api/business/time-entries", async (_req: Request, res: Response) => {
    try {
      // Return placeholder time entries
      const timeEntries = [
        { id: 1, userId: 3, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - framing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:00:00Z" },
        { id: 2, userId: 4, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - plumbing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:05:00Z" },
        { id: 3, userId: 2, projectId: 3, date: "2025-03-01", hoursWorked: 6, description: "Maintenance route - north", status: "approved", approvedBy: 1, notes: "Completed 8 service calls", createdAt: "2025-03-01T15:30:00Z" },
        { id: 4, userId: 3, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:00:00Z" },
        { id: 5, userId: 4, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:05:00Z" }
      ];
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get("/api/business/time-entries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder time entry for given ID
      const timeEntries = [
        { id: 1, userId: 3, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - framing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:00:00Z" },
        { id: 2, userId: 4, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - plumbing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:05:00Z" },
        { id: 3, userId: 2, projectId: 3, date: "2025-03-01", hoursWorked: 6, description: "Maintenance route - north", status: "approved", approvedBy: 1, notes: "Completed 8 service calls", createdAt: "2025-03-01T15:30:00Z" },
        { id: 4, userId: 3, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:00:00Z" },
        { id: 5, userId: 4, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:05:00Z" }
      ];
      
      const timeEntry = timeEntries.find(e => e.id === id);
      
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      res.json(timeEntry);
    } catch (error) {
      console.error("Error fetching time entry:", error);
      res.status(500).json({ message: "Failed to fetch time entry" });
    }
  });

  app.post("/api/business/time-entries", async (req: Request, res: Response) => {
    try {
      // Create a new time entry with a generated ID and return it
      const newTimeEntry = {
        id: 6, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(newTimeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.patch("/api/business/time-entries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated time entry
      const updatedTimeEntry = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedTimeEntry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.delete("/api/business/time-entries/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Financial Report routes
  app.get("/api/business/reports", async (_req: Request, res: Response) => {
    try {
      // Return placeholder financial reports
      const reports = [
        { id: 1, title: "Monthly P&L", type: "profit_loss", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({revenue: 45231.89, expenses: 12756.42, profit: 32475.47, profitMargin: 71.8}), status: "approved", createdBy: 1, createdAt: "2025-03-01T09:00:00Z", updatedAt: "2025-03-01T09:00:00Z" },
        { id: 2, title: "Q1 Cash Flow", type: "cash_flow", period: "2025-01-01 to 2025-03-31", data: JSON.stringify({startingBalance: 125000.00, endingBalance: 142750.89, inflows: 87500.00, outflows: 69749.11}), status: "draft", createdBy: 1, createdAt: "2025-03-01T10:30:00Z", updatedAt: "2025-03-01T10:30:00Z" },
        { id: 3, title: "Revenue by Service Type", type: "custom", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({categories: ["Maintenance", "Repairs", "Installations"], values: [22450.00, 8750.00, 14031.89]}), status: "approved", createdBy: 1, createdAt: "2025-03-01T11:15:00Z", updatedAt: "2025-03-01T11:15:00Z" }
      ];
      res.json(reports);
    } catch (error) {
      console.error("Error fetching financial reports:", error);
      res.status(500).json({ message: "Failed to fetch financial reports" });
    }
  });
  
  // Pool Reports endpoints
  app.get("/api/business/pool-reports", async (_req: Request, res: Response) => {
    try {
      // Return placeholder pool reports
      const reports = [
        { 
          id: 1, 
          name: "Monthly Water Chemistry Analysis", 
          type: "water_chemistry", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "monthly", 
          lastRun: "2025-03-01T08:00:00Z",
          isPublic: true 
        },
        { 
          id: 2, 
          name: "Quarterly Chemical Usage Trends", 
          type: "chemical_usage", 
          startDate: "2025-01-01T00:00:00Z", 
          endDate: "2025-03-31T23:59:59Z", 
          schedule: "quarterly",
          lastRun: null,
          isPublic: false 
        },
        { 
          id: 3, 
          name: "Pool Equipment Performance", 
          type: "equipment_performance", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "on_demand",
          lastRun: null,
          isPublic: false 
        }
      ];
      res.json(reports);
    } catch (error) {
      console.error("Error fetching pool reports:", error);
      res.status(500).json({ message: "Failed to fetch pool reports" });
    }
  });
  
  app.get("/api/business/pool-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder pool report for given ID
      const reports = [
        { 
          id: 1, 
          name: "Monthly Water Chemistry Analysis", 
          type: "water_chemistry", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "monthly", 
          description: "Comprehensive analysis of water chemistry trends for all clients",
          lastRun: "2025-03-01T08:00:00Z",
          isPublic: true 
        },
        { 
          id: 2, 
          name: "Quarterly Chemical Usage Trends", 
          type: "chemical_usage", 
          startDate: "2025-01-01T00:00:00Z", 
          endDate: "2025-03-31T23:59:59Z", 
          schedule: "quarterly",
          description: "Analysis of chemical usage by type across all clients",
          lastRun: null,
          isPublic: false 
        },
        { 
          id: 3, 
          name: "Pool Equipment Performance", 
          type: "equipment_performance", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "on_demand",
          description: "Equipment efficiency and maintenance needs report",
          lastRun: null,
          isPublic: false 
        }
      ];
      
      const report = reports.find(r => r.id === id);
      
      if (!report) {
        return res.status(404).json({ message: "Pool report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching pool report:", error);
      res.status(500).json({ message: "Failed to fetch pool report" });
    }
  });
  
  app.post("/api/business/pool-reports", async (req: Request, res: Response) => {
    try {
      // This would normally validate and create a new report
      const newReport = {
        id: 4, // This would normally be generated
        ...req.body,
        lastRun: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newReport);
    } catch (error) {
      console.error("Error creating pool report:", error);
      res.status(500).json({ message: "Failed to create pool report" });
    }
  });
  
  app.patch("/api/business/pool-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // This would normally validate, find and update the report
      const updatedReport = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating pool report:", error);
      res.status(500).json({ message: "Failed to update pool report" });
    }
  });
  
  app.delete("/api/business/pool-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // This would normally delete the report
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pool report:", error);
      res.status(500).json({ message: "Failed to delete pool report" });
    }
  });

  app.get("/api/business/reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder financial report for given ID
      const reports = [
        { id: 1, title: "Monthly P&L", type: "profit_loss", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({revenue: 45231.89, expenses: 12756.42, profit: 32475.47, profitMargin: 71.8}), status: "approved", createdBy: 1, createdAt: "2025-03-01T09:00:00Z", updatedAt: "2025-03-01T09:00:00Z" },
        { id: 2, title: "Q1 Cash Flow", type: "cash_flow", period: "2025-01-01 to 2025-03-31", data: JSON.stringify({startingBalance: 125000.00, endingBalance: 142750.89, inflows: 87500.00, outflows: 69749.11}), status: "draft", createdBy: 1, createdAt: "2025-03-01T10:30:00Z", updatedAt: "2025-03-01T10:30:00Z" },
        { id: 3, title: "Revenue by Service Type", type: "custom", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({categories: ["Maintenance", "Repairs", "Installations"], values: [22450.00, 8750.00, 14031.89]}), status: "approved", createdBy: 1, createdAt: "2025-03-01T11:15:00Z", updatedAt: "2025-03-01T11:15:00Z" }
      ];
      
      const report = reports.find(r => r.id === id);
      
      if (!report) {
        return res.status(404).json({ message: "Financial report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching financial report:", error);
      res.status(500).json({ message: "Failed to fetch financial report" });
    }
  });

  app.post("/api/business/reports", async (req: Request, res: Response) => {
    try {
      // Create a new financial report with a generated ID and return it
      const newReport = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newReport);
    } catch (error) {
      console.error("Error creating financial report:", error);
      res.status(500).json({ message: "Failed to create financial report" });
    }
  });

  app.patch("/api/business/reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated financial report
      const updatedReport = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating financial report:", error);
      res.status(500).json({ message: "Failed to update financial report" });
    }
  });

  app.delete("/api/business/reports/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting financial report:", error);
      res.status(500).json({ message: "Failed to delete financial report" });
    }
  });

  // Vendor routes
  app.get("/api/business/vendors", async (_req: Request, res: Response) => {
    try {
      // Return placeholder vendors
      const vendors = [
        { id: 1, name: "Pool Supply Co.", category: "chemicals", contactName: "John Smith", email: "john@poolsupply.com", phone: "555-123-4567", address: "123 Main St, Anytown, CA 90210", paymentTerms: "net_30", notes: "Preferred supplier for chemicals", createdAt: "2024-10-01T00:00:00Z", updatedAt: "2024-10-01T00:00:00Z" },
        { id: 2, name: "Premium Pumps Inc.", category: "equipment", contactName: "Sarah Johnson", email: "sarah@premiumpumps.com", phone: "555-987-6543", address: "456 Oak St, Somewhere, CA 90211", paymentTerms: "net_15", notes: "Quality pump equipment", createdAt: "2024-10-02T00:00:00Z", updatedAt: "2024-10-02T00:00:00Z" },
        { id: 3, name: "Poolside Accessories", category: "accessories", contactName: "Mike Wilson", email: "mike@poolsideacc.com", phone: "555-456-7890", address: "789 Pine St, Nowhere, CA 90212", paymentTerms: "net_30", notes: "Wide range of pool accessories", createdAt: "2024-10-03T00:00:00Z", updatedAt: "2024-10-03T00:00:00Z" }
      ];
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/business/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder vendor for given ID
      const vendors = [
        { id: 1, name: "Pool Supply Co.", category: "chemicals", contactName: "John Smith", email: "john@poolsupply.com", phone: "555-123-4567", address: "123 Main St, Anytown, CA 90210", paymentTerms: "net_30", notes: "Preferred supplier for chemicals", createdAt: "2024-10-01T00:00:00Z", updatedAt: "2024-10-01T00:00:00Z" },
        { id: 2, name: "Premium Pumps Inc.", category: "equipment", contactName: "Sarah Johnson", email: "sarah@premiumpumps.com", phone: "555-987-6543", address: "456 Oak St, Somewhere, CA 90211", paymentTerms: "net_15", notes: "Quality pump equipment", createdAt: "2024-10-02T00:00:00Z", updatedAt: "2024-10-02T00:00:00Z" },
        { id: 3, name: "Poolside Accessories", category: "accessories", contactName: "Mike Wilson", email: "mike@poolsideacc.com", phone: "555-456-7890", address: "789 Pine St, Nowhere, CA 90212", paymentTerms: "net_30", notes: "Wide range of pool accessories", createdAt: "2024-10-03T00:00:00Z", updatedAt: "2024-10-03T00:00:00Z" }
      ];
      
      const vendor = vendors.find(v => v.id === id);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/business/vendors", async (req: Request, res: Response) => {
    try {
      // Create a new vendor with a generated ID and return it
      const newVendor = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newVendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/business/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated vendor
      const updatedVendor = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedVendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/business/vendors/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Purchase Order routes
  app.get("/api/business/purchase-orders", async (_req: Request, res: Response) => {
    try {
      // Return placeholder purchase orders
      const purchaseOrders = [
        { id: 1, vendorId: 1, orderedBy: 1, orderDate: "2025-02-25", status: "completed", totalAmount: 1245.75, items: JSON.stringify([{name: "Chlorine tablets", quantity: 10, unitPrice: 89.99}, {name: "pH Plus", quantity: 8, unitPrice: 24.99}]), deliveryDate: "2025-03-01", notes: "Regular monthly order", createdAt: "2025-02-25T09:00:00Z", updatedAt: "2025-03-01T14:00:00Z" },
        { id: 2, vendorId: 2, orderedBy: 1, orderDate: "2025-02-28", status: "pending", totalAmount: 2150.00, items: JSON.stringify([{name: "SuperFlo VS Pump", quantity: 1, unitPrice: 1250.00}, {name: "Cartridge Filter", quantity: 1, unitPrice: 900.00}]), deliveryDate: null, notes: "For Johnson installation", createdAt: "2025-02-28T10:30:00Z", updatedAt: "2025-02-28T10:30:00Z" },
        { id: 3, vendorId: 3, orderedBy: 1, orderDate: "2025-02-20", status: "completed", totalAmount: 435.85, items: JSON.stringify([{name: "Leaf skimmer", quantity: 3, unitPrice: 45.95}, {name: "Pool brush", quantity: 4, unitPrice: 35.50}, {name: "Test kit", quantity: 2, unitPrice: 89.00}]), deliveryDate: "2025-02-23", notes: "Restocking supplies", createdAt: "2025-02-20T14:15:00Z", updatedAt: "2025-02-23T11:00:00Z" }
      ];
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/business/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder purchase order for given ID
      const purchaseOrders = [
        { id: 1, vendorId: 1, orderedBy: 1, orderDate: "2025-02-25", status: "completed", totalAmount: 1245.75, items: JSON.stringify([{name: "Chlorine tablets", quantity: 10, unitPrice: 89.99}, {name: "pH Plus", quantity: 8, unitPrice: 24.99}]), deliveryDate: "2025-03-01", notes: "Regular monthly order", createdAt: "2025-02-25T09:00:00Z", updatedAt: "2025-03-01T14:00:00Z" },
        { id: 2, vendorId: 2, orderedBy: 1, orderDate: "2025-02-28", status: "pending", totalAmount: 2150.00, items: JSON.stringify([{name: "SuperFlo VS Pump", quantity: 1, unitPrice: 1250.00}, {name: "Cartridge Filter", quantity: 1, unitPrice: 900.00}]), deliveryDate: null, notes: "For Johnson installation", createdAt: "2025-02-28T10:30:00Z", updatedAt: "2025-02-28T10:30:00Z" },
        { id: 3, vendorId: 3, orderedBy: 1, orderDate: "2025-02-20", status: "completed", totalAmount: 435.85, items: JSON.stringify([{name: "Leaf skimmer", quantity: 3, unitPrice: 45.95}, {name: "Pool brush", quantity: 4, unitPrice: 35.50}, {name: "Test kit", quantity: 2, unitPrice: 89.00}]), deliveryDate: "2025-02-23", notes: "Restocking supplies", createdAt: "2025-02-20T14:15:00Z", updatedAt: "2025-02-23T11:00:00Z" }
      ];
      
      const purchaseOrder = purchaseOrders.find(po => po.id === id);
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      res.json(purchaseOrder);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post("/api/business/purchase-orders", async (req: Request, res: Response) => {
    try {
      // Create a new purchase order with a generated ID and return it
      const newPurchaseOrder = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newPurchaseOrder);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.patch("/api/business/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated purchase order
      const updatedPurchaseOrder = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedPurchaseOrder);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete("/api/business/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Inventory routes
  app.get("/api/business/inventory", async (_req: Request, res: Response) => {
    try {
      // Return placeholder inventory items
      const inventoryItems = [
        { id: 1, name: "Chlorine tablets", category: "chemicals", currentStock: 5, minimumStock: 10, unit: "bucket", unitPrice: 89.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-15", notes: "Need to reorder", createdAt: "2024-10-15T08:30:00Z", updatedAt: "2025-02-25T14:32:00Z" },
        { id: 2, name: "pH Plus", category: "chemicals", currentStock: 3, minimumStock: 8, unit: "gallon", unitPrice: 24.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-28", notes: "Order more next week", createdAt: "2024-10-15T08:35:00Z", updatedAt: "2025-02-25T14:35:00Z" },
        { id: 3, name: "SuperFlo VS Pump", category: "equipment", currentStock: 2, minimumStock: 1, unit: "each", unitPrice: 1250.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:40:00Z", updatedAt: "2025-01-10T11:20:00Z" },
        { id: 4, name: "Cartridge Filter", category: "equipment", currentStock: 3, minimumStock: 2, unit: "each", unitPrice: 900.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:45:00Z", updatedAt: "2025-01-10T11:25:00Z" },
        { id: 5, name: "Leaf skimmer", category: "accessories", currentStock: 8, minimumStock: 5, unit: "each", unitPrice: 45.95, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:50:00Z", updatedAt: "2025-02-20T14:15:00Z" },
        { id: 6, name: "Pool brush", category: "accessories", currentStock: 12, minimumStock: 4, unit: "each", unitPrice: 35.50, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:55:00Z", updatedAt: "2025-02-20T14:20:00Z" },
        { id: 7, name: "Test kit", category: "accessories", currentStock: 7, minimumStock: 3, unit: "each", unitPrice: 89.00, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T09:00:00Z", updatedAt: "2025-02-20T14:25:00Z" }
      ];
      res.json(inventoryItems);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/business/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder inventory item for given ID
      const inventoryItems = [
        { id: 1, name: "Chlorine tablets", category: "chemicals", currentStock: 5, minimumStock: 10, unit: "bucket", unitPrice: 89.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-15", notes: "Need to reorder", createdAt: "2024-10-15T08:30:00Z", updatedAt: "2025-02-25T14:32:00Z" },
        { id: 2, name: "pH Plus", category: "chemicals", currentStock: 3, minimumStock: 8, unit: "gallon", unitPrice: 24.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-28", notes: "Order more next week", createdAt: "2024-10-15T08:35:00Z", updatedAt: "2025-02-25T14:35:00Z" },
        { id: 3, name: "SuperFlo VS Pump", category: "equipment", currentStock: 2, minimumStock: 1, unit: "each", unitPrice: 1250.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:40:00Z", updatedAt: "2025-01-10T11:20:00Z" },
        { id: 4, name: "Cartridge Filter", category: "equipment", currentStock: 3, minimumStock: 2, unit: "each", unitPrice: 900.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:45:00Z", updatedAt: "2025-01-10T11:25:00Z" },
        { id: 5, name: "Leaf skimmer", category: "accessories", currentStock: 8, minimumStock: 5, unit: "each", unitPrice: 45.95, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:50:00Z", updatedAt: "2025-02-20T14:15:00Z" },
        { id: 6, name: "Pool brush", category: "accessories", currentStock: 12, minimumStock: 4, unit: "each", unitPrice: 35.50, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:55:00Z", updatedAt: "2025-02-20T14:20:00Z" },
        { id: 7, name: "Test kit", category: "accessories", currentStock: 7, minimumStock: 3, unit: "each", unitPrice: 89.00, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T09:00:00Z", updatedAt: "2025-02-20T14:25:00Z" }
      ];
      
      const inventoryItem = inventoryItems.find(item => item.id === id);
      
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(inventoryItem);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/business/inventory", async (req: Request, res: Response) => {
    try {
      // Create a new inventory item with a generated ID and return it
      const newInventoryItem = {
        id: 8, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newInventoryItem);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/business/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated inventory item
      const updatedInventoryItem = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedInventoryItem);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/business/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const result = await storage.deleteInventoryItem(id);
      
      if (!result) {
        return res.status(404).json({ message: "Inventory item not found or could not be deleted" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // ==== INVENTORY MANAGEMENT SYSTEM ====
  
  // === Inventory Items ===
  app.get("/api/inventory/items", async (_req: Request, res: Response) => {
    try {
      const inventoryItems = await storage.getAllInventoryItems();
      res.json(inventoryItems);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/inventory/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const inventoryItem = await storage.getInventoryItem(id);
      
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(inventoryItem);
    } catch (error) {
      console.error(`Error fetching inventory item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.get("/api/inventory/items/category/:category", async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const inventoryItems = await storage.getInventoryItemsByCategory(category);
      res.json(inventoryItems);
    } catch (error) {
      console.error(`Error fetching inventory items with category ${req.params.category}:`, error);
      res.status(500).json({ message: "Failed to fetch inventory items by category" });
    }
  });

  app.get("/api/inventory/items/low-stock", async (_req: Request, res: Response) => {
    try {
      const inventoryItems = await storage.getLowStockItems();
      res.json(inventoryItems);
    } catch (error) {
      console.error("Error fetching low stock inventory items:", error);
      res.status(500).json({ message: "Failed to fetch low stock inventory items" });
    }
  });

  app.post("/api/inventory/items", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertInventoryItemSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newInventoryItem = await storage.createInventoryItem(validation.data);
      res.status(201).json(newInventoryItem);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check if item exists
      const existingItem = await storage.getInventoryItem(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      const updatedItem = await storage.updateInventoryItem(id, req.body);
      res.json(updatedItem);
    } catch (error) {
      console.error(`Error updating inventory item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const result = await storage.deleteInventoryItem(id);
      
      if (!result) {
        return res.status(404).json({ message: "Inventory item not found or could not be deleted" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting inventory item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // === Warehouses ===
  app.get("/api/inventory/warehouses", async (_req: Request, res: Response) => {
    try {
      const warehouses = await storage.getAllWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  app.get("/api/inventory/warehouses/active", async (_req: Request, res: Response) => {
    try {
      const warehouses = await storage.getActiveWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching active warehouses:", error);
      res.status(500).json({ message: "Failed to fetch active warehouses" });
    }
  });

  app.get("/api/inventory/warehouses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const warehouse = await storage.getWarehouse(id);
      
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      res.json(warehouse);
    } catch (error) {
      console.error(`Error fetching warehouse ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch warehouse" });
    }
  });

  app.post("/api/inventory/warehouses", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertWarehouseSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newWarehouse = await storage.createWarehouse(validation.data);
      res.status(201).json(newWarehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(500).json({ message: "Failed to create warehouse" });
    }
  });

  app.patch("/api/inventory/warehouses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check if warehouse exists
      const existingWarehouse = await storage.getWarehouse(id);
      if (!existingWarehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      const updatedWarehouse = await storage.updateWarehouse(id, req.body);
      res.json(updatedWarehouse);
    } catch (error) {
      console.error(`Error updating warehouse ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update warehouse" });
    }
  });

  app.delete("/api/inventory/warehouses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const result = await storage.deleteWarehouse(id);
      
      if (!result) {
        return res.status(404).json({ 
          message: "Warehouse not found or could not be deleted. Make sure it has no inventory."
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting warehouse ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete warehouse" });
    }
  });

  // === Technician Vehicles ===
  app.get("/api/inventory/vehicles", async (_req: Request, res: Response) => {
    try {
      const vehicles = await storage.getAllTechnicianVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching technician vehicles:", error);
      res.status(500).json({ message: "Failed to fetch technician vehicles" });
    }
  });

  app.get("/api/inventory/vehicles/active", async (_req: Request, res: Response) => {
    try {
      const vehicles = await storage.getActiveTechnicianVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching active technician vehicles:", error);
      res.status(500).json({ message: "Failed to fetch active technician vehicles" });
    }
  });

  app.get("/api/inventory/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const vehicle = await storage.getTechnicianVehicle(id);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Technician vehicle not found" });
      }
      
      res.json(vehicle);
    } catch (error) {
      console.error(`Error fetching technician vehicle ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch technician vehicle" });
    }
  });

  app.get("/api/inventory/technician/:technicianId/vehicles", async (req: Request, res: Response) => {
    try {
      const technicianId = parseInt(req.params.technicianId);
      if (isNaN(technicianId)) {
        return res.status(400).json({ message: "Invalid technician ID format" });
      }
      
      const vehicles = await storage.getTechnicianVehiclesByTechnicianId(technicianId);
      res.json(vehicles);
    } catch (error) {
      console.error(`Error fetching vehicles for technician ${req.params.technicianId}:`, error);
      res.status(500).json({ message: "Failed to fetch technician vehicles" });
    }
  });

  app.post("/api/inventory/vehicles", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertTechnicianVehicleSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newVehicle = await storage.createTechnicianVehicle(validation.data);
      res.status(201).json(newVehicle);
    } catch (error) {
      console.error("Error creating technician vehicle:", error);
      res.status(500).json({ message: "Failed to create technician vehicle" });
    }
  });

  app.patch("/api/inventory/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check if vehicle exists
      const existingVehicle = await storage.getTechnicianVehicle(id);
      if (!existingVehicle) {
        return res.status(404).json({ message: "Technician vehicle not found" });
      }
      
      const updatedVehicle = await storage.updateTechnicianVehicle(id, req.body);
      res.json(updatedVehicle);
    } catch (error) {
      console.error(`Error updating technician vehicle ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update technician vehicle" });
    }
  });

  app.delete("/api/inventory/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const result = await storage.deleteTechnicianVehicle(id);
      
      if (!result) {
        return res.status(404).json({ 
          message: "Technician vehicle not found or could not be deleted. Make sure it has no inventory."
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting technician vehicle ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete technician vehicle" });
    }
  });

  // === Warehouse Inventory ===
  app.get("/api/inventory/warehouse-inventory", async (_req: Request, res: Response) => {
    try {
      // Build a more complete response by joining with warehouse and item data
      const warehouseItems = [];
      
      // Get all warehouses
      const warehouses = await storage.getAllWarehouses();
      
      // For each warehouse, get its inventory
      for (const warehouse of warehouses) {
        const inventoryItems = await storage.getWarehouseInventoryByWarehouseId(warehouse.id);
        
        // For each inventory item, get the full item details
        for (const inventory of inventoryItems) {
          const item = await storage.getInventoryItem(inventory.inventoryItemId);
          if (item) {
            warehouseItems.push({
              ...inventory,
              warehouse: {
                id: warehouse.id,
                name: warehouse.name,
                address: warehouse.address,
                city: warehouse.city,
                state: warehouse.state
              },
              item: {
                id: item.id,
                name: item.name,
                category: item.category,
                unit: item.unit
              }
            });
          }
        }
      }
      
      res.json(warehouseItems);
    } catch (error) {
      console.error("Error fetching warehouse inventory:", error);
      res.status(500).json({ message: "Failed to fetch warehouse inventory" });
    }
  });

  app.get("/api/inventory/warehouse/:warehouseId/inventory", async (req: Request, res: Response) => {
    try {
      const warehouseId = parseInt(req.params.warehouseId);
      if (isNaN(warehouseId)) {
        return res.status(400).json({ message: "Invalid warehouse ID format" });
      }
      
      const inventory = await storage.getWarehouseInventoryByWarehouseId(warehouseId);
      
      // Get detailed item information for each inventory item
      const detailedInventory = await Promise.all(
        inventory.map(async (inv) => {
          const item = await storage.getInventoryItem(inv.inventoryItemId);
          return {
            ...inv,
            item: item || { name: "Unknown Item" }
          };
        })
      );
      
      res.json(detailedInventory);
    } catch (error) {
      console.error(`Error fetching inventory for warehouse ${req.params.warehouseId}:`, error);
      res.status(500).json({ message: "Failed to fetch warehouse inventory" });
    }
  });

  app.post("/api/inventory/warehouse-inventory", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertWarehouseInventorySchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newInventory = await storage.createWarehouseInventory(validation.data);
      res.status(201).json(newInventory);
    } catch (error) {
      console.error("Error creating warehouse inventory:", error);
      res.status(500).json({ message: "Failed to create warehouse inventory" });
    }
  });

  app.patch("/api/inventory/warehouse-inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const updatedInventory = await storage.updateWarehouseInventory(id, req.body);
      if (!updatedInventory) {
        return res.status(404).json({ message: "Warehouse inventory not found" });
      }
      
      res.json(updatedInventory);
    } catch (error) {
      console.error(`Error updating warehouse inventory ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update warehouse inventory" });
    }
  });

  // === Vehicle Inventory ===
  app.get("/api/inventory/vehicle-inventory", async (_req: Request, res: Response) => {
    try {
      // Build a more complete response by joining with vehicle and item data
      const vehicleItems = [];
      
      // Get all vehicles
      const vehicles = await storage.getAllTechnicianVehicles();
      
      // For each vehicle, get its inventory
      for (const vehicle of vehicles) {
        const inventoryItems = await storage.getVehicleInventoryByVehicleId(vehicle.id);
        
        // For each inventory item, get the full item details
        for (const inventory of inventoryItems) {
          const item = await storage.getInventoryItem(inventory.inventoryItemId);
          if (item) {
            vehicleItems.push({
              ...inventory,
              vehicle: {
                id: vehicle.id,
                name: vehicle.name,
                make: vehicle.make,
                model: vehicle.model,
                licensePlate: vehicle.licensePlate
              },
              item: {
                id: item.id,
                name: item.name,
                category: item.category,
                unit: item.unit
              }
            });
          }
        }
      }
      
      res.json(vehicleItems);
    } catch (error) {
      console.error("Error fetching vehicle inventory:", error);
      res.status(500).json({ message: "Failed to fetch vehicle inventory" });
    }
  });

  app.get("/api/inventory/vehicle/:vehicleId/inventory", async (req: Request, res: Response) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      if (isNaN(vehicleId)) {
        return res.status(400).json({ message: "Invalid vehicle ID format" });
      }
      
      const inventory = await storage.getVehicleInventoryByVehicleId(vehicleId);
      
      // Get detailed item information for each inventory item
      const detailedInventory = await Promise.all(
        inventory.map(async (inv) => {
          const item = await storage.getInventoryItem(inv.inventoryItemId);
          return {
            ...inv,
            item: item || { name: "Unknown Item" }
          };
        })
      );
      
      res.json(detailedInventory);
    } catch (error) {
      console.error(`Error fetching inventory for vehicle ${req.params.vehicleId}:`, error);
      res.status(500).json({ message: "Failed to fetch vehicle inventory" });
    }
  });

  app.post("/api/inventory/vehicle-inventory", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertVehicleInventorySchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newInventory = await storage.createVehicleInventory(validation.data);
      res.status(201).json(newInventory);
    } catch (error) {
      console.error("Error creating vehicle inventory:", error);
      res.status(500).json({ message: "Failed to create vehicle inventory" });
    }
  });

  app.patch("/api/inventory/vehicle-inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const updatedInventory = await storage.updateVehicleInventory(id, req.body);
      if (!updatedInventory) {
        return res.status(404).json({ message: "Vehicle inventory not found" });
      }
      
      res.json(updatedInventory);
    } catch (error) {
      console.error(`Error updating vehicle inventory ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update vehicle inventory" });
    }
  });

  // === Inventory Transfers ===
  app.get("/api/inventory/transfers", async (_req: Request, res: Response) => {
    try {
      const transfers = await storage.getAllInventoryTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching inventory transfers:", error);
      res.status(500).json({ message: "Failed to fetch inventory transfers" });
    }
  });

  app.get("/api/inventory/transfers/status/:status", async (req: Request, res: Response) => {
    try {
      const { status } = req.params;
      const validStatuses = ['pending', 'in_transit', 'completed', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: "Invalid transfer status",
          validStatuses
        });
      }
      
      const transfers = await storage.getInventoryTransfersByStatus(status as TransferStatus);
      res.json(transfers);
    } catch (error) {
      console.error(`Error fetching transfers with status ${req.params.status}:`, error);
      res.status(500).json({ message: "Failed to fetch transfers by status" });
    }
  });

  app.get("/api/inventory/transfers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const transfer = await storage.getInventoryTransfer(id);
      if (!transfer) {
        return res.status(404).json({ message: "Inventory transfer not found" });
      }
      
      // Get the transfer items
      const items = await storage.getInventoryTransferItemsByTransferId(id);
      
      // Build a detailed response with source and destination info
      let sourceInfo = null;
      let destinationInfo = null;
      
      if (transfer.sourceLocationType === 'warehouse') {
        const warehouse = await storage.getWarehouse(transfer.sourceLocationId);
        sourceInfo = {
          type: 'warehouse',
          ...warehouse
        };
      } else if (transfer.sourceLocationType === 'vehicle') {
        const vehicle = await storage.getTechnicianVehicle(transfer.sourceLocationId);
        sourceInfo = {
          type: 'vehicle',
          ...vehicle
        };
      }
      
      if (transfer.destinationLocationType === 'warehouse') {
        const warehouse = await storage.getWarehouse(transfer.destinationLocationId);
        destinationInfo = {
          type: 'warehouse',
          ...warehouse
        };
      } else if (transfer.destinationLocationType === 'vehicle') {
        const vehicle = await storage.getTechnicianVehicle(transfer.destinationLocationId);
        destinationInfo = {
          type: 'vehicle',
          ...vehicle
        };
      } else if (transfer.destinationLocationType === 'client_site') {
        const client = await storage.getClient(transfer.destinationLocationId);
        destinationInfo = {
          type: 'client_site',
          ...client
        };
      }
      
      // Get item details for each transfer item
      const detailedItems = await Promise.all(
        items.map(async (item) => {
          const inventoryItem = await storage.getInventoryItem(item.inventoryItemId);
          return {
            ...item,
            item: inventoryItem
          };
        })
      );
      
      res.json({
        ...transfer,
        source: sourceInfo,
        destination: destinationInfo,
        items: detailedItems
      });
    } catch (error) {
      console.error(`Error fetching inventory transfer ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch inventory transfer" });
    }
  });

  app.post("/api/inventory/transfers", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertInventoryTransferSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newTransfer = await storage.createInventoryTransfer(validation.data);
      res.status(201).json(newTransfer);
    } catch (error) {
      console.error("Error creating inventory transfer:", error);
      res.status(500).json({ message: "Failed to create inventory transfer" });
    }
  });

  app.post("/api/inventory/transfers/:transferId/items", async (req: Request, res: Response) => {
    try {
      const transferId = parseInt(req.params.transferId);
      if (isNaN(transferId)) {
        return res.status(400).json({ message: "Invalid transfer ID format" });
      }
      
      const transfer = await storage.getInventoryTransfer(transferId);
      if (!transfer) {
        return res.status(404).json({ message: "Inventory transfer not found" });
      }
      
      // Only allow adding items to pending transfers
      if (transfer.status !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot add items to a transfer with status '${transfer.status}'. Transfer must be in 'pending' status.`
        });
      }
      
      // Add the transfer ID to the item data
      const itemData = {
        ...req.body,
        transferId
      };
      
      const validation = validateRequest(insertInventoryTransferItemSchema, itemData);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newItem = await storage.createInventoryTransferItem(validation.data);
      res.status(201).json(newItem);
    } catch (error) {
      console.error(`Error adding item to transfer ${req.params.transferId}:`, error);
      res.status(500).json({ message: "Failed to add item to transfer" });
    }
  });

  app.patch("/api/inventory/transfers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const transfer = await storage.getInventoryTransfer(id);
      if (!transfer) {
        return res.status(404).json({ message: "Inventory transfer not found" });
      }
      
      // Special handling for status changes to 'completed'
      if (req.body.status === 'completed' && transfer.status !== 'completed') {
        console.log(`Processing inventory transfer ${id} to completed status`);
      }
      
      const updatedTransfer = await storage.updateInventoryTransfer(id, req.body);
      res.json(updatedTransfer);
    } catch (error) {
      console.error(`Error updating inventory transfer ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update inventory transfer" });
    }
  });

  app.patch("/api/inventory/transfer-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const item = await storage.getInventoryTransferItem(id);
      if (!item) {
        return res.status(404).json({ message: "Inventory transfer item not found" });
      }
      
      // Check that the parent transfer is in an editable state
      const transfer = await storage.getInventoryTransfer(item.transferId);
      if (!transfer) {
        return res.status(404).json({ message: "Parent inventory transfer not found" });
      }
      
      if (transfer.status === 'completed' || transfer.status === 'cancelled') {
        return res.status(400).json({ 
          message: `Cannot modify items in a transfer with status '${transfer.status}'`
        });
      }
      
      const updatedItem = await storage.updateInventoryTransferItem(id, req.body);
      res.json(updatedItem);
    } catch (error) {
      console.error(`Error updating inventory transfer item ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update inventory transfer item" });
    }
  });

  // === Barcodes ===
  app.get("/api/inventory/barcodes", async (_req: Request, res: Response) => {
    try {
      const barcodes = await storage.getAllBarcodes();
      res.json(barcodes);
    } catch (error) {
      console.error("Error fetching barcodes:", error);
      res.status(500).json({ message: "Failed to fetch barcodes" });
    }
  });

  app.get("/api/inventory/barcodes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const barcode = await storage.getBarcode(id);
      if (!barcode) {
        return res.status(404).json({ message: "Barcode not found" });
      }
      
      res.json(barcode);
    } catch (error) {
      console.error(`Error fetching barcode ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch barcode" });
    }
  });

  app.get("/api/inventory/barcodes/value/:value", async (req: Request, res: Response) => {
    try {
      const { value } = req.params;
      const barcode = await storage.getBarcodeByValue(value);
      
      if (!barcode) {
        return res.status(404).json({ message: "Barcode not found" });
      }
      
      res.json(barcode);
    } catch (error) {
      console.error(`Error fetching barcode with value ${req.params.value}:`, error);
      res.status(500).json({ message: "Failed to fetch barcode by value" });
    }
  });

  app.post("/api/inventory/barcodes", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertBarcodeSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newBarcode = await storage.createBarcode(validation.data);
      res.status(201).json(newBarcode);
    } catch (error) {
      console.error("Error creating barcode:", error);
      res.status(500).json({ message: "Failed to create barcode" });
    }
  });

  app.post("/api/inventory/barcode-scans", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertBarcodeScanHistorySchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newScan = await storage.createBarcodeScan(validation.data);
      res.status(201).json(newScan);
    } catch (error) {
      console.error("Error creating barcode scan:", error);
      res.status(500).json({ message: "Failed to create barcode scan" });
    }
  });

  app.get("/api/inventory/barcode-scans/barcode/:barcodeId", async (req: Request, res: Response) => {
    try {
      const barcodeId = parseInt(req.params.barcodeId);
      if (isNaN(barcodeId)) {
        return res.status(400).json({ message: "Invalid barcode ID format" });
      }
      
      const scans = await storage.getBarcodeScansByBarcodeId(barcodeId);
      res.json(scans);
    } catch (error) {
      console.error(`Error fetching barcode scans for barcode ${req.params.barcodeId}:`, error);
      res.status(500).json({ message: "Failed to fetch barcode scans" });
    }
  });

  // === Inventory Adjustments ===
  app.get("/api/inventory/adjustments", async (_req: Request, res: Response) => {
    try {
      const adjustments = await storage.getAllInventoryAdjustments();
      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching inventory adjustments:", error);
      res.status(500).json({ message: "Failed to fetch inventory adjustments" });
    }
  });

  app.post("/api/inventory/adjustments", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertInventoryAdjustmentSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newAdjustment = await storage.createInventoryAdjustment(validation.data);
      res.status(201).json(newAdjustment);
    } catch (error) {
      console.error("Error creating inventory adjustment:", error);
      res.status(500).json({ message: "Failed to create inventory adjustment" });
    }
  });

  app.get("/api/inventory/adjustments/item/:itemId", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID format" });
      }
      
      const adjustments = await storage.getInventoryAdjustmentsByItemId(itemId);
      res.json(adjustments);
    } catch (error) {
      console.error(`Error fetching adjustments for item ${req.params.itemId}:`, error);
      res.status(500).json({ message: "Failed to fetch inventory adjustments for item" });
    }
  });

  // Licenses routes
  app.get("/api/business/licenses", async (_req: Request, res: Response) => {
    try {
      // Return placeholder licenses data
      const licenses = [
        { 
          id: 1, 
          name: "Business Operation License", 
          licenseNumber: "BUS-12345-2025", 
          issueDate: "2025-01-15", 
          expiryDate: "2026-01-14", 
          issuingAuthority: "City of Sunnyvale", 
          status: "active", 
          documentUrl: "licenses/business-license-2025.pdf", 
          notes: "Main business license",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T10:30:00Z",
          updatedAt: "2025-01-15T10:30:00Z"
        },
        { 
          id: 2, 
          name: "Pool Contractor License", 
          licenseNumber: "PCL-78901-2025", 
          issueDate: "2025-02-01", 
          expiryDate: "2026-01-31", 
          issuingAuthority: "State Pool Contractors Board", 
          status: "active", 
          documentUrl: "licenses/contractor-license-2025.pdf", 
          notes: "State-level contractor license",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:45:00Z",
          updatedAt: "2025-02-01T11:45:00Z"
        },
        { 
          id: 3, 
          name: "Chemical Handling Certification", 
          licenseNumber: "CHC-56789-2025", 
          issueDate: "2025-03-10", 
          expiryDate: "2027-03-09", 
          issuingAuthority: "Chemical Safety Board", 
          status: "active", 
          documentUrl: "licenses/chemical-cert-2025.pdf", 
          notes: "Required for handling pool chemicals",
          reminderDate: "2027-02-10",
          createdAt: "2025-03-10T09:20:00Z",
          updatedAt: "2025-03-10T09:20:00Z"
        }
      ];
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.get("/api/business/licenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder license for given ID
      const licenses = [
        { 
          id: 1, 
          name: "Business Operation License", 
          licenseNumber: "BUS-12345-2025", 
          issueDate: "2025-01-15", 
          expiryDate: "2026-01-14", 
          issuingAuthority: "City of Sunnyvale", 
          status: "active", 
          documentUrl: "licenses/business-license-2025.pdf", 
          notes: "Main business license",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T10:30:00Z",
          updatedAt: "2025-01-15T10:30:00Z"
        },
        { 
          id: 2, 
          name: "Pool Contractor License", 
          licenseNumber: "PCL-78901-2025", 
          issueDate: "2025-02-01", 
          expiryDate: "2026-01-31", 
          issuingAuthority: "State Pool Contractors Board", 
          status: "active", 
          documentUrl: "licenses/contractor-license-2025.pdf", 
          notes: "State-level contractor license",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:45:00Z",
          updatedAt: "2025-02-01T11:45:00Z"
        },
        { 
          id: 3, 
          name: "Chemical Handling Certification", 
          licenseNumber: "CHC-56789-2025", 
          issueDate: "2025-03-10", 
          expiryDate: "2027-03-09", 
          issuingAuthority: "Chemical Safety Board", 
          status: "active", 
          documentUrl: "licenses/chemical-cert-2025.pdf", 
          notes: "Required for handling pool chemicals",
          reminderDate: "2027-02-10",
          createdAt: "2025-03-10T09:20:00Z",
          updatedAt: "2025-03-10T09:20:00Z"
        }
      ];
      
      const license = licenses.find(l => l.id === id);
      
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }
      
      res.json(license);
    } catch (error) {
      console.error("Error fetching license:", error);
      res.status(500).json({ message: "Failed to fetch license" });
    }
  });

  app.post("/api/business/licenses", async (req: Request, res: Response) => {
    try {
      // Create a new license with a generated ID and return it
      const newLicense = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newLicense);
    } catch (error) {
      console.error("Error creating license:", error);
      res.status(500).json({ message: "Failed to create license" });
    }
  });

  app.patch("/api/business/licenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated license
      const updatedLicense = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedLicense);
    } catch (error) {
      console.error("Error updating license:", error);
      res.status(500).json({ message: "Failed to update license" });
    }
  });

  app.delete("/api/business/licenses/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting license:", error);
      res.status(500).json({ message: "Failed to delete license" });
    }
  });

  // Insurance routes
  app.get("/api/business/insurance", async (_req: Request, res: Response) => {
    try {
      // Return placeholder insurance data
      const insurancePolicies = [
        { 
          id: 1, 
          name: "General Liability Insurance", 
          policyNumber: "GLI-98765-2025", 
          provider: "SafeGuard Insurance Co.", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 2000000.00, 
          premium: 4800.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/liability-policy-2025.pdf", 
          notes: "Covers general business liability",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T09:00:00Z",
          updatedAt: "2025-01-01T09:00:00Z"
        },
        { 
          id: 2, 
          name: "Workers' Compensation", 
          policyNumber: "WCI-54321-2025", 
          provider: "WorkSafe Insurance", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 1000000.00, 
          premium: 6200.00, 
          paymentFrequency: "quarterly",
          status: "active", 
          documentUrl: "insurance/workers-comp-2025.pdf", 
          notes: "Required workers' compensation coverage",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T10:15:00Z",
          updatedAt: "2025-01-01T10:15:00Z"
        },
        { 
          id: 3, 
          name: "Commercial Auto Insurance", 
          policyNumber: "CAI-12345-2025", 
          provider: "AutoProtect Insurance", 
          startDate: "2025-01-15", 
          endDate: "2026-01-14", 
          coverageAmount: 500000.00, 
          premium: 3200.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/auto-policy-2025.pdf", 
          notes: "Covers all company vehicles",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T14:30:00Z",
          updatedAt: "2025-01-15T14:30:00Z"
        },
        { 
          id: 4, 
          name: "Equipment Insurance", 
          policyNumber: "EQI-67890-2025", 
          provider: "ToolSafe Insurance", 
          startDate: "2025-02-01", 
          endDate: "2026-01-31", 
          coverageAmount: 250000.00, 
          premium: 1800.00, 
          paymentFrequency: "annually",
          status: "active", 
          documentUrl: "insurance/equipment-policy-2025.pdf", 
          notes: "Covers all pool service equipment",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:00:00Z",
          updatedAt: "2025-02-01T11:00:00Z"
        }
      ];
      res.json(insurancePolicies);
    } catch (error) {
      console.error("Error fetching insurance policies:", error);
      res.status(500).json({ message: "Failed to fetch insurance policies" });
    }
  });

  app.get("/api/business/insurance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder insurance policy for given ID
      const insurancePolicies = [
        { 
          id: 1, 
          name: "General Liability Insurance", 
          policyNumber: "GLI-98765-2025", 
          provider: "SafeGuard Insurance Co.", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 2000000.00, 
          premium: 4800.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/liability-policy-2025.pdf", 
          notes: "Covers general business liability",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T09:00:00Z",
          updatedAt: "2025-01-01T09:00:00Z"
        },
        { 
          id: 2, 
          name: "Workers' Compensation", 
          policyNumber: "WCI-54321-2025", 
          provider: "WorkSafe Insurance", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 1000000.00, 
          premium: 6200.00, 
          paymentFrequency: "quarterly",
          status: "active", 
          documentUrl: "insurance/workers-comp-2025.pdf", 
          notes: "Required workers' compensation coverage",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T10:15:00Z",
          updatedAt: "2025-01-01T10:15:00Z"
        },
        { 
          id: 3, 
          name: "Commercial Auto Insurance", 
          policyNumber: "CAI-12345-2025", 
          provider: "AutoProtect Insurance", 
          startDate: "2025-01-15", 
          endDate: "2026-01-14", 
          coverageAmount: 500000.00, 
          premium: 3200.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/auto-policy-2025.pdf", 
          notes: "Covers all company vehicles",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T14:30:00Z",
          updatedAt: "2025-01-15T14:30:00Z"
        },
        { 
          id: 4, 
          name: "Equipment Insurance", 
          policyNumber: "EQI-67890-2025", 
          provider: "ToolSafe Insurance", 
          startDate: "2025-02-01", 
          endDate: "2026-01-31", 
          coverageAmount: 250000.00, 
          premium: 1800.00, 
          paymentFrequency: "annually",
          status: "active", 
          documentUrl: "insurance/equipment-policy-2025.pdf", 
          notes: "Covers all pool service equipment",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:00:00Z",
          updatedAt: "2025-02-01T11:00:00Z"
        }
      ];
      
      const insurance = insurancePolicies.find(i => i.id === id);
      
      if (!insurance) {
        return res.status(404).json({ message: "Insurance policy not found" });
      }
      
      res.json(insurance);
    } catch (error) {
      console.error("Error fetching insurance policy:", error);
      res.status(500).json({ message: "Failed to fetch insurance policy" });
    }
  });

  app.post("/api/business/insurance", async (req: Request, res: Response) => {
    try {
      // Create a new insurance policy with a generated ID and return it
      const newInsurance = {
        id: 5, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newInsurance);
    } catch (error) {
      console.error("Error creating insurance policy:", error);
      res.status(500).json({ message: "Failed to create insurance policy" });
    }
  });

  app.patch("/api/business/insurance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated insurance policy
      const updatedInsurance = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedInsurance);
    } catch (error) {
      console.error("Error updating insurance policy:", error);
      res.status(500).json({ message: "Failed to update insurance policy" });
    }
  });

  app.delete("/api/business/insurance/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting insurance policy:", error);
      res.status(500).json({ message: "Failed to delete insurance policy" });
    }
  });

  // Endpoint to provide Google Maps API key to the client
  app.get("/api/google-maps-key", (_req: Request, res: Response) => {
    try {
      // Try to get the API key from different possible sources
      let apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
      
      // If no API key in environment, check if we're in deployed environment
      if (!apiKey) {
        console.warn("Google Maps API key not found in process.env.GOOGLE_MAPS_API_KEY");
        
        // Log environment variables for debugging
        console.log("Environment details:");
        console.log("- NODE_ENV:", process.env.NODE_ENV);
        console.log("- REPL_ID:", process.env.REPL_ID);
        console.log("- REPL_SLUG:", process.env.REPL_SLUG);
        console.log("- REPL_OWNER:", process.env.REPL_OWNER);
        
        // In a real production environment, handle the missing API key more gracefully
        console.error("No Google Maps API key available - map functionality will be limited");
      } else {
        console.log("Successfully retrieved Google Maps API key for client");
      }
      
      res.json({ apiKey });
    } catch (error) {
      console.error("Error providing Google Maps API key:", error);
      res.status(500).json({ message: "Failed to provide Google Maps API key" });
    }
  });
  
  // Enhanced API key debugging endpoint
  app.get("/api/debug/google-maps-key", (_req: Request, res: Response) => {
    try {
      // Log environment details to help with debugging
      console.log("--- Google Maps API Key Debug Info ---");
      console.log("NODE_ENV:", process.env.NODE_ENV);
      console.log("Is Replit environment:", process.env.REPL_ID ? "Yes" : "No");
      console.log("REPL_SLUG:", process.env.REPL_SLUG);
      console.log("REPL_OWNER:", process.env.REPL_OWNER);
      
      // Check for API key in environment
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
      console.log("API key exists:", apiKey ? "Yes" : "No");
      console.log("API key length:", apiKey.length);
      
      // Check for dotenv file
      const envFiles = ['.env', '.env.local', '.env.development'];
      const envFileExists = envFiles.map(file => {
        try {
          const exists = require('fs').existsSync(file);
          return { file, exists };
        } catch (e: any) {
          return { file, exists: false, error: e.message };
        }
      });
      console.log("Environment files:", envFileExists);
      
      // Return debugging info
      res.json({
        envInfo: {
          nodeEnv: process.env.NODE_ENV,
          isReplitEnv: !!process.env.REPL_ID,
          replSlug: process.env.REPL_SLUG,
          replOwner: process.env.REPL_OWNER
        },
        apiKeyInfo: {
          exists: !!apiKey,
          length: apiKey.length,
          maskedKey: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '',
        },
        envFiles: envFileExists
      });
    } catch (error) {
      console.error("Error in maps API key debug endpoint:", error);
      res.status(500).json({ 
        message: "Failed to debug Google Maps API key",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  /**
   * Endpoint to manually reschedule incomplete maintenance appointments
   * This is primarily for testing the rescheduling functionality
   */
  app.post("/api/maintenances/reschedule-incomplete", async (_req: Request, res: Response) => {
    try {
      const rescheduledMaintenances = await storage.rescheduleIncompleteMaintenances();
      
      res.json({
        success: true, 
        message: `Successfully rescheduled ${rescheduledMaintenances.length} incomplete maintenance appointments`,
        rescheduledMaintenances
      });
    } catch (error) {
      console.error("Error rescheduling incomplete maintenances:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reschedule incomplete maintenance appointments",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Inventory Management System API Routes
   */

  // Inventory Items API
  app.get("/api/inventory/items", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getAllInventoryItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ 
        message: "Failed to fetch inventory items",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error(`Error fetching inventory item ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch inventory item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/items", async (req: Request, res: Response) => {
    try {
      const newItem = await storage.createInventoryItem(req.body);
      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ 
        message: "Failed to create inventory item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/inventory/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedItem = await storage.updateInventoryItem(id, req.body);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error(`Error updating inventory item ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to update inventory item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/inventory/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInventoryItem(id);
      
      if (!success) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting inventory item ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to delete inventory item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/items/low-stock", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ 
        message: "Failed to fetch low stock items",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Warehouse API
  app.get("/api/inventory/warehouses", async (_req: Request, res: Response) => {
    try {
      const warehouses = await storage.getAllWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ 
        message: "Failed to fetch warehouses",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/warehouses/active", async (_req: Request, res: Response) => {
    try {
      const warehouses = await storage.getActiveWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching active warehouses:", error);
      res.status(500).json({ 
        message: "Failed to fetch active warehouses",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/warehouses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const warehouse = await storage.getWarehouse(id);
      
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      res.json(warehouse);
    } catch (error) {
      console.error(`Error fetching warehouse ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch warehouse",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/warehouses", async (req: Request, res: Response) => {
    try {
      const newWarehouse = await storage.createWarehouse(req.body);
      res.status(201).json(newWarehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(500).json({ 
        message: "Failed to create warehouse",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/inventory/warehouses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedWarehouse = await storage.updateWarehouse(id, req.body);
      
      if (!updatedWarehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      res.json(updatedWarehouse);
    } catch (error) {
      console.error(`Error updating warehouse ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to update warehouse",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/inventory/warehouses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWarehouse(id);
      
      if (!success) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting warehouse ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to delete warehouse",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Warehouse Inventory API
  app.get("/api/inventory/warehouse-inventory/:warehouseId", async (req: Request, res: Response) => {
    try {
      const warehouseId = parseInt(req.params.warehouseId);
      const inventory = await storage.getWarehouseInventoryByWarehouseId(warehouseId);
      res.json(inventory);
    } catch (error) {
      console.error(`Error fetching inventory for warehouse ${req.params.warehouseId}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch warehouse inventory",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/warehouse-inventory", async (req: Request, res: Response) => {
    try {
      const newInventory = await storage.createWarehouseInventory(req.body);
      res.status(201).json(newInventory);
    } catch (error) {
      console.error("Error creating warehouse inventory:", error);
      res.status(500).json({ 
        message: "Failed to create warehouse inventory",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/inventory/warehouse-inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedInventory = await storage.updateWarehouseInventory(id, req.body);
      
      if (!updatedInventory) {
        return res.status(404).json({ message: "Warehouse inventory not found" });
      }
      
      res.json(updatedInventory);
    } catch (error) {
      console.error(`Error updating warehouse inventory ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to update warehouse inventory",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Technician Vehicle API
  app.get("/api/inventory/vehicles", async (_req: Request, res: Response) => {
    try {
      const vehicles = await storage.getAllTechnicianVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching technician vehicles:", error);
      res.status(500).json({ 
        message: "Failed to fetch technician vehicles",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/vehicles/active", async (_req: Request, res: Response) => {
    try {
      const vehicles = await storage.getActiveTechnicianVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching active technician vehicles:", error);
      res.status(500).json({ 
        message: "Failed to fetch active technician vehicles",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const vehicle = await storage.getTechnicianVehicle(id);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Technician vehicle not found" });
      }
      
      res.json(vehicle);
    } catch (error) {
      console.error(`Error fetching technician vehicle ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch technician vehicle",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/technicians/:technicianId/vehicles", async (req: Request, res: Response) => {
    try {
      const technicianId = parseInt(req.params.technicianId);
      const vehicles = await storage.getTechnicianVehiclesByTechnicianId(technicianId);
      res.json(vehicles);
    } catch (error) {
      console.error(`Error fetching vehicles for technician ${req.params.technicianId}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch technician vehicles",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/vehicles", async (req: Request, res: Response) => {
    try {
      const newVehicle = await storage.createTechnicianVehicle(req.body);
      res.status(201).json(newVehicle);
    } catch (error) {
      console.error("Error creating technician vehicle:", error);
      res.status(500).json({ 
        message: "Failed to create technician vehicle",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/inventory/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedVehicle = await storage.updateTechnicianVehicle(id, req.body);
      
      if (!updatedVehicle) {
        return res.status(404).json({ message: "Technician vehicle not found" });
      }
      
      res.json(updatedVehicle);
    } catch (error) {
      console.error(`Error updating technician vehicle ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to update technician vehicle",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/inventory/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTechnicianVehicle(id);
      
      if (!success) {
        return res.status(404).json({ message: "Technician vehicle not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting technician vehicle ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to delete technician vehicle",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Vehicle Inventory API
  app.get("/api/inventory/vehicle-inventory/:vehicleId", async (req: Request, res: Response) => {
    try {
      const vehicleId = parseInt(req.params.vehicleId);
      const inventory = await storage.getVehicleInventoryByVehicleId(vehicleId);
      res.json(inventory);
    } catch (error) {
      console.error(`Error fetching inventory for vehicle ${req.params.vehicleId}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch vehicle inventory",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/vehicle-inventory", async (req: Request, res: Response) => {
    try {
      const newInventory = await storage.createVehicleInventory(req.body);
      res.status(201).json(newInventory);
    } catch (error) {
      console.error("Error creating vehicle inventory:", error);
      res.status(500).json({ 
        message: "Failed to create vehicle inventory",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/inventory/vehicle-inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedInventory = await storage.updateVehicleInventory(id, req.body);
      
      if (!updatedInventory) {
        return res.status(404).json({ message: "Vehicle inventory not found" });
      }
      
      res.json(updatedInventory);
    } catch (error) {
      console.error(`Error updating vehicle inventory ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to update vehicle inventory",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Inventory Transfer API
  app.get("/api/inventory/transfers", async (_req: Request, res: Response) => {
    try {
      const transfers = await storage.getAllInventoryTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching inventory transfers:", error);
      res.status(500).json({ 
        message: "Failed to fetch inventory transfers",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/transfers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const transfer = await storage.getInventoryTransfer(id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Inventory transfer not found" });
      }
      
      res.json(transfer);
    } catch (error) {
      console.error(`Error fetching inventory transfer ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch inventory transfer",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/transfers/:id/items", async (req: Request, res: Response) => {
    try {
      const transferId = parseInt(req.params.id);
      const items = await storage.getInventoryTransferItemsByTransferId(transferId);
      res.json(items);
    } catch (error) {
      console.error(`Error fetching items for transfer ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch transfer items",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/transfers", async (req: Request, res: Response) => {
    try {
      const newTransfer = await storage.createInventoryTransfer(req.body);
      res.status(201).json(newTransfer);
    } catch (error) {
      console.error("Error creating inventory transfer:", error);
      res.status(500).json({ 
        message: "Failed to create inventory transfer",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/transfers/:id/items", async (req: Request, res: Response) => {
    try {
      const transferId = parseInt(req.params.id);
      const itemData = { ...req.body, transferId };
      const newItem = await storage.createInventoryTransferItem(itemData);
      res.status(201).json(newItem);
    } catch (error) {
      console.error(`Error adding item to transfer ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to add transfer item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/inventory/transfers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTransfer = await storage.updateInventoryTransfer(id, req.body);
      
      if (!updatedTransfer) {
        return res.status(404).json({ message: "Inventory transfer not found" });
      }
      
      res.json(updatedTransfer);
    } catch (error) {
      console.error(`Error updating inventory transfer ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to update inventory transfer",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/transfers/:id/complete", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const completedTransfer = await storage.completeInventoryTransfer(id, userId);
      
      if (!completedTransfer) {
        return res.status(404).json({ message: "Inventory transfer not found" });
      }
      
      res.json(completedTransfer);
    } catch (error) {
      console.error(`Error completing inventory transfer ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Failed to complete inventory transfer",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Inventory Adjustment API
  app.post("/api/inventory/adjustments", async (req: Request, res: Response) => {
    try {
      const newAdjustment = await storage.createInventoryAdjustment(req.body);
      res.status(201).json(newAdjustment);
    } catch (error) {
      console.error("Error creating inventory adjustment:", error);
      res.status(500).json({ 
        message: "Failed to create inventory adjustment",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/adjustments", async (_req: Request, res: Response) => {
    try {
      const adjustments = await storage.getAllInventoryAdjustments();
      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching inventory adjustments:", error);
      res.status(500).json({ 
        message: "Failed to fetch inventory adjustments",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/adjustments/item/:itemId", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const adjustments = await storage.getInventoryAdjustmentsByItemId(itemId);
      res.json(adjustments);
    } catch (error) {
      console.error(`Error fetching adjustments for item ${req.params.itemId}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch item adjustments",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Barcode API
  app.post("/api/inventory/barcodes", async (req: Request, res: Response) => {
    try {
      const newBarcode = await storage.createBarcode(req.body);
      res.status(201).json(newBarcode);
    } catch (error) {
      console.error("Error creating barcode:", error);
      res.status(500).json({ 
        message: "Failed to create barcode",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/inventory/barcodes/value/:value", async (req: Request, res: Response) => {
    try {
      const barcode = await storage.getBarcodeByValue(req.params.value);
      
      if (!barcode) {
        return res.status(404).json({ message: "Barcode not found" });
      }
      
      res.json(barcode);
    } catch (error) {
      console.error(`Error fetching barcode ${req.params.value}:`, error);
      res.status(500).json({ 
        message: "Failed to fetch barcode",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/inventory/barcodes/scan", async (req: Request, res: Response) => {
    try {
      const scanHistory = await storage.createBarcodeScanHistory(req.body);
      res.status(201).json(scanHistory);
    } catch (error) {
      console.error("Error recording barcode scan:", error);
      res.status(500).json({ 
        message: "Failed to record barcode scan",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Organization Management Routes
  app.get("/api/organizations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated and get their role
      const reqUser = req.user as any;
      let organizations = [];
      
      // System admins can see all organizations
      if (reqUser && reqUser.role === 'system_admin') {
        organizations = await storage.getAllOrganizations();
      } 
      // Others can only see their own organization
      else if (reqUser && reqUser.organizationId) {
        const org = await storage.getOrganization(reqUser.organizationId);
        organizations = org ? [org] : [];
      }
      
      res.json(organizations);
    } catch (error) {
      console.error("[API] Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const organization = await storage.getOrganization(id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if the user has permission to view this organization
      const reqUser = req.user as any;
      if (reqUser) {
        // System admins can see any organization
        if (reqUser.role === 'system_admin') {
          return res.json(organization);
        }
        
        // Users can only see their own organization
        if (reqUser.organizationId === organization.id) {
          return res.json(organization);
        }
        
        // Otherwise, unauthorized
        return res.status(403).json({ message: "You don't have permission to view this organization" });
      }
      
      return res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      console.error("[API] Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post("/api/organizations", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const insertOrganizationSchema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        slug: z.string().min(2, "Slug must be at least 2 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email("Invalid email address").optional().or(z.literal("")),
        website: z.string().url("Invalid website URL").optional().or(z.literal("")),
        logo: z.string().optional(),
        active: z.boolean().default(true),
        isSystemAdmin: z.boolean().default(false)
      });

      const validation = validateRequest(insertOrganizationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      const organization = await storage.createOrganization(validation.data);
      res.status(201).json(organization);
    } catch (error) {
      console.error("[API] Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.patch("/api/organizations/:id", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const updateOrganizationSchema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        slug: z.string().min(2, "Slug must be at least 2 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
          .optional(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        zipCode: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().email("Invalid email address").optional().nullable(),
        website: z.string().url("Invalid website URL").optional().nullable(),
        logo: z.string().optional().nullable(),
        active: z.boolean().optional(),
        isSystemAdmin: z.boolean().optional()
      });

      const validation = validateRequest(updateOrganizationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      const updatedOrganization = await storage.updateOrganization(id, validation.data);
      if (!updatedOrganization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json(updatedOrganization);
    } catch (error) {
      console.error("[API] Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  app.get("/api/organizations/:id/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const users = await storage.getUsersByOrganizationId(id);
      res.json(users);
    } catch (error) {
      console.error("[API] Error fetching organization users:", error);
      res.status(500).json({ message: "Failed to fetch organization users" });
    }
  });

  return httpServer;
}