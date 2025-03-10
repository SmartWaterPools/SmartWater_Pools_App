import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Scheduler } from "./scheduler";
import { storage, DatabaseStorage } from "./storage";

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

  // Enhanced Cloud Run compatibility
  // Use environment variable PORT if available (required for Cloud Run)
  // Otherwise use 8080 for production and 5000 for development
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultPort = isProduction ? 8080 : 5000;
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;
  
  // Enhanced server setup with proper error handling for Cloud Run compatibility
  const startServer = (port: number) => {
    return server.listen({
      port,
      host: "0.0.0.0", // Bind to all network interfaces for both local and production
    }, () => {
      log(`Server running on port ${port} - Environment: ${isProduction ? 'production' : 'development'}`);
      log(`Local access URL: http://localhost:${port}`);
      log(`Network access URL: http://0.0.0.0:${port}`);
      log(`Cloud Run will use PORT env var: ${process.env.PORT || 'not set, will use default'}`);
    }).on('error', (error: any) => {
      // If port is already in use and we're in development, try alternative port
      if (error.code === 'EADDRINUSE' && !isProduction) {
        log(`Port ${port} is already in use, trying alternative port...`);
        // For development, try the other common port if main port is unavailable
        const alternativePort = port === 5000 ? 8080 : 5000;
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
