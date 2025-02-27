import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  // Try port 5000 first for Replit workflow compatibility
  let port = 5000;
  
  // Function to start server and try alternate port if needed
  const tryPort = (portToTry: number) => {
    server.listen({
      port: portToTry,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${portToTry}`);
      
      // Create a PORT.txt file to tell Replit which port to use
      if (portToTry !== 5000) {
        const fs = require('fs');
        fs.writeFileSync('PORT.txt', portToTry.toString());
        log(`Created PORT.txt with port ${portToTry}`);
      }
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        // Try the next port
        const nextPort = portToTry + 1;
        log(`Port ${portToTry} in use, trying ${nextPort}...`);
        tryPort(nextPort);
      } else {
        log(`Error starting server: ${error.message}`);
      }
    });
  };

  // Start with port 5000
  tryPort(port);
})();
