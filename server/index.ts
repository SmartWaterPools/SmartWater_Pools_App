import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Scheduler } from "./scheduler";
import { storage, DatabaseStorage } from "./storage";
import { HealthMonitor } from "./health-monitor";

const app = express();
// Increase the payload size limit for JSON and URL-encoded data to handle larger images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  // Default to port 5000 or use environment variable PORT if available (required for Cloud Run)
  const isProduction = process.env.NODE_ENV === 'production';
  const isReplit = !!process.env.REPL_ID;
  // Default port hierarchy: PORT env var > 5000 (to match Replit workflow) > 8080 (Cloud Run) > 3000 (local dev)
  const defaultPort = isReplit ? 5000 : (isProduction ? 8080 : 3000);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;
  
  // Output the current environment details for easier debugging
  console.log('Current environment details:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`- REPL_ID: ${process.env.REPL_ID || 'not set'}`);
  console.log(`- REPL_SLUG: ${process.env.REPL_SLUG || 'not set'}`);
  console.log(`- REPL_OWNER: ${process.env.REPL_OWNER || 'not set'}`);
  console.log(`- PORT: ${process.env.PORT || 'not set'}`);
  console.log(`- Selected Port: ${port}`);
  console.log(`- Is Replit Environment: ${isReplit ? 'Yes' : 'No'}`);
  
  // Enhanced server setup with proper error handling for Cloud Run and Replit compatibility
  const startServer = (port: number) => {
    return server.listen({
      port,
      host: "0.0.0.0", // Bind to all network interfaces for both local and production
    }, () => {
      log(`Server running on port ${port} - Environment: ${isProduction ? 'production' : 'development'}`);
      log(`Local access URL: http://localhost:${port}`);
      log(`Network access URL: http://0.0.0.0:${port}`);
      
      // Display Replit-specific URLs when in Replit environment
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        log(`Replit access URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      }
      
      log(`Using port ${port} for server compatibility`);
      if (isReplit) {
        log(`Running in Replit environment - make sure to use relative URLs in frontend`);
      }
    }).on('error', (error: any) => {
      // If port is already in use, try alternative ports
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is already in use, trying alternative port...`);
        // Try a sequence of alternative ports
        let alternativePort: number;
        if (port === 3000) alternativePort = 5000;
        else if (port === 5000) alternativePort = 8080;
        else if (port === 8080) alternativePort = 3001;
        else alternativePort = port + 1; // Just increment if none of the standard ports
        
        return startServer(alternativePort);
      }
      
      log(`Error starting server: ${error.message}`);
      process.exit(1); // Exit with error code so workflow can restart properly
    });
  };

  const serverInstance = startServer(port);
  
  // Initialize the scheduler for automatic maintenance rescheduling
  const scheduler = new Scheduler(storage);
  scheduler.initialize();
  
  // Handle graceful shutdown for Cloud Run
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully');
    
    // Stop scheduler before shutting down
    scheduler.stop();
    
    serverInstance.close(() => {
      log('Server closed');
      process.exit(0);
    });
    
    // Force close after 10s if still not closed
    setTimeout(() => {
      log('Forcing server shutdown after timeout');
      process.exit(1);
    }, 10000);
  });
})();
