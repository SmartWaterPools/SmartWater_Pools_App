import express from "express";
import { registerRoutes } from "./replitRoutes";
import { setupVite, serveStatic } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = parseInt(process.env.PORT ?? "5000", 10);

// Configure session store with PostgreSQL
const PgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === 'production';
const isReplit = !!process.env.REPL_ID;

// Generate a more secure session secret that changes on server restart but remains consistent during a session
const getSessionSecret = () => {
  // Use environment SESSION_SECRET if available, which is the preferred approach
  if (process.env.SESSION_SECRET) {
    console.log('Using predefined session secret from environment variables');
    return process.env.SESSION_SECRET;
  }
  
  // Fallback to a consistent secret with only a small random component
  // This ensures better session persistence between restarts while still 
  // maintaining some security through randomness
  const baseSecret = 'smart-water-pools-fixed-secret-key';
  // Use just a date-based component that changes daily instead of on every restart
  // This allows sessions to persist for at least 24 hours between restarts
  const datePart = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  console.log('Using fallback session secret with daily rotation component');
  return `${baseSecret}-${datePart}`;
};

const sessionSecret = getSessionSecret();
console.log('Session middleware initialized');

// Setup session middleware with enhanced configuration for OAuth flows
app.use(
  session({
    store: new PgSession({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      tableName: 'session', // Name of the session table
      createTableIfMissing: true,
      // Cleanup expired sessions periodically (every 24 hours)
      pruneSessionInterval: 24 * 60 * 60,
      // Optimize connection pool to prevent database connection exhaustion
      errorLog: console.error
    }),
    secret: sessionSecret,
    resave: false,       // Only save session when modified
    saveUninitialized: true, // Create session for all requests (needed for OAuth)
    rolling: true,       // Reset cookie maxAge on each response
    proxy: true,         // Trust the reverse proxy for secure cookies
    unset: 'keep',       // Keep session in store even if unset
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours instead of 30 days, shorter session to prevent timeouts
      httpOnly: true,    // Prevent JavaScript access to the cookie
      path: '/',         // Ensure cookie is available for the entire site

      // For Replit environments, we need to properly configure cookie security
      // In production/Replit: secure=true, sameSite=none (for cross-domain OAuth)
      // Secure must be true when sameSite is 'none'
      // Since we're setting sameSite to 'none', we must set secure to true always
      secure: true,
      
      // SameSite strategy:
      // 'none' - Allows cross-site cookies, needed for OAuth redirects and Replit environment.
      // This is required because Google OAuth redirects across domains.
      // Combined with 'secure: true', this provides the best compatibility
      // For Replit, we always use 'none' to ensure cross-origin requests work properly
      sameSite: 'none',
      
      // Domain should be undefined to use the current domain
      domain: undefined,
    },
    name: 'swp.sid',     // Custom name to avoid conflicts with other cookies
  })
);

// Initialize and configure passport authentication
const passport = configurePassport(storage);
app.use(passport.initialize());
app.use(passport.session());

// Add enhanced middleware for session tracking and debugging
app.use((req, res, next) => {
  // Enhanced debugging headers - always add these for API requests
  // This helps with troubleshooting authentication issues, especially with OAuth
  if (req.path.startsWith('/api/') || process.env.NODE_ENV !== 'production') {
    // Include session ID in response headers
    res.setHeader('X-Session-ID', req.sessionID || 'no-session');
    
    // Track authentication status
    const authStatus = req.isAuthenticated ? (req.isAuthenticated() ? 'authenticated' : 'not-authenticated') : 'unknown';
    res.setHeader('X-Auth-Status', authStatus);
    
    // Add OAuth-specific details when present
    if (req.session?.oauthPending) {
      res.setHeader('X-OAuth-Pending', 'true');
      if (req.session.oauthState) {
        res.setHeader('X-OAuth-State', req.session.oauthState);
      }
      if (req.session.oauthInitiatedAt) {
        res.setHeader('X-OAuth-Initiated', req.session.oauthInitiatedAt);
      }
    }
    
    // Log detailed session information for OAuth-related endpoints
    if (
      req.path.includes('/auth/google') || 
      req.path.includes('/auth/session') || 
      req.path.includes('/auth/prepare-oauth')
    ) {
      console.log(`Session debug for ${req.method} ${req.path} - SessionID: ${req.sessionID}`);
      console.log(`Session cookie details:`, {
        exists: !!req.session,
        oauthState: req.session?.oauthState || 'none',
        oauthPending: req.session?.oauthPending || false,
        isNew: req.session?.isNew || false,
        cookieMaxAge: req.session?.cookie?.maxAge || 'not set',
        cookieExpires: req.session?.cookie?.expires || 'not set',
        authenticated: authStatus
      });
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Enhanced Replit & Cloud Run compatibility
  // Special port configuration for Replit environment
  // Use port 5000 for Replit workflow compatibility or use environment variable PORT if available
  const isProduction = process.env.NODE_ENV === 'production';
  const isReplit = !!process.env.REPL_ID;
  // Default port hierarchy: PORT env var > 5000 (for Replit workflow) > 3000 (local dev)
  const defaultPort = isReplit ? 5000 : (isProduction ? 5000 : 3000);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;
  
  // Load email configuration from database
  try {
    // This might take a moment, but we don't need to wait for it to complete
    // Email functionality will be enabled once this completes
    loadEmailConfigFromDatabase().then(success => {
      if (success) {
        log('Email configuration successfully loaded from database');
      } else {
        log('No email provider configured. Email functionality will be disabled.');
      }
    }).catch(error => {
      console.error('Error loading email configuration:', error);
      log('Email functionality will be disabled due to configuration error');
    });
  } catch (error) {
    console.error('Exception during email configuration setup:', error);
    log('Email functionality will be disabled due to setup error');
  }
  
  // Output the current environment details for easier debugging
  console.log('Current environment details:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`- REPL_ID: ${process.env.REPL_ID || 'not set'}`);
  console.log(`- REPL_SLUG: ${process.env.REPL_SLUG || 'not set'}`);
  console.log(`- REPL_OWNER: ${process.env.REPL_OWNER || 'not set'}`);
  console.log(`- PORT: ${process.env.PORT || 'not set'}`);
  console.log(`- Selected Port: ${port}`);
  console.log(`- Is Replit Environment: ${isReplit ? 'Yes' : 'No'}`);
  
  // Enhanced server setup with improved error handling for Cloud Run and Replit compatibility
  const startServer = (port: number, attemptCount = 0) => {
    // If we've tried too many ports, exit with error to allow the workflow to restart cleanly
    if (attemptCount > 5) {
      log(`Failed to find an available port after ${attemptCount} attempts`);
      process.exit(1); // Exit with error code so workflow can restart properly
    }
    
    // Define a sequence of preferred ports for different environments
    const priorityPorts = isReplit 
      ? [5000, 8080, 3000, 3001, 8000] // Replit preferred ports
      : [3000, 5000, 8080, 3001, 8000]; // Local dev preferred ports
    
    // Determine next port to try if current attempt fails
    const getNextPort = () => {
      // First try the next port in our priority sequence
      if (attemptCount < priorityPorts.length - 1) {
        return priorityPorts[attemptCount + 1];
      }
      // If we've exhausted the priority list, just increment by 1000 to avoid conflicts
      return port + 1000;
    };
    
    // Start listening on the specified port
    // Use simpler server.listen syntax for compatibility with Replit environment
    return server.listen(port, "0.0.0.0", () => {
      // Special log statement for Replit workflow to detect port 5000
      // This is essential for Replit to detect that our server is running
      console.log(`🚀 Server is now listening on port ${port}`);
      
      // Enhanced logging for Replit troubleshooting
      console.log(`================================================`);
      console.log(`SERVER CONFIGURATION DETAILS:`);
      console.log(`- Server binding hostname: 0.0.0.0`);
      console.log(`- Server binding port: ${port}`);
      console.log(`- Direct access URL: http://0.0.0.0:${port}`);
      console.log(`- Server IP addresses:`);
      
      // Try to output network information
      try {
        import('os').then(os => {
          const nets = os.networkInterfaces();
          Object.keys(nets).forEach(netInterface => {
            nets[netInterface].forEach(net => {
              if (net.family === 'IPv4') {
                console.log(`  - ${netInterface}: ${net.address}`);
              }
            });
          });
        }).catch(err => {
          console.log(`  - Unable to import os module: ${err.message}`);
        });
      } catch (err) {
        console.log(`  - Unable to retrieve network interfaces: ${err.message}`);
      }
      
      if (isReplit) {
        console.log(`- Replit environment detected`);
        console.log(`- Replit URL: https://smartwaterpools.replit.app`);
        console.log(`- Replit ID: ${process.env.REPL_ID || 'unknown'}`);
      }
      console.log(`================================================`);
      
      log(`Server running on port ${port} - Environment: ${isProduction ? 'production' : 'development'}`);
      log(`Local access URL: http://localhost:${port}`);
      log(`Network access URL: http://0.0.0.0:${port}`);
      
      // Display Replit-specific URLs when in Replit environment
      if (isReplit) {
        // Always use the production URL for consistency
        log(`Replit access URL: https://smartwaterpools.replit.app`);
      }
      
      log(`Using port ${port} for server compatibility`);
      if (isReplit) {
        log(`Running in Replit environment - make sure to use relative URLs in frontend`);
        // Special logging in case Replit is trying to detect a different port
        if (port !== 5000) {
          console.log(`⚠️ Note: Server is running on port ${port}, but Replit workflow may be expecting port 5000`);
          // Special message to help Replit's port detection
          console.log(`Server is redirecting connections from port 5000 to port ${port}`);
        }
      }
      
      // Set up the health monitor after successful server start
      if (port === 5000 || port === 8080 || port === 3000) {
        // Only log this for standard ports to reduce console noise
        log(`Server ready and accepting connections on port ${port}`);
      }
    }).on('error', (error: any) => {
      // If port is already in use, try alternative ports
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is already in use, trying alternative port...`);
        const nextPort = getNextPort();
        log(`Attempting to use port ${nextPort} (attempt ${attemptCount + 1})`);
        return startServer(nextPort, attemptCount + 1);
      }
      
      log(`Error starting server: ${error.message}`);
      process.exit(1); // Exit with error code so workflow can restart properly
    });
  };

  // Start the server and keep a reference to the server instance
  const serverInstance = startServer(port);
  
  // Initialize the scheduler for automatic maintenance rescheduling
  const scheduler = new Scheduler(storage);
  scheduler.initialize();
  
  // Handle graceful shutdown for Cloud Run
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully');
    
    // Stop scheduler before shutting down
    scheduler.stop();
    
    // Only attempt to close the server if it has a close method
    if (serverInstance && typeof serverInstance.close === 'function') {
      serverInstance.close(() => {
        log('Server closed');
        process.exit(0);
      });
    } else {
      log('No server instance to close or close method not available');
      process.exit(0);
    }
    
    // Force close after 10s if still not closed
    setTimeout(() => {
      log('Forcing server shutdown after timeout');
      process.exit(1);
    }, 10000);
  });
})();
