import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { configurePassport } from "./auth";
import { storage } from "./storage";

const app = express();

// Trust proxy for Replit environment (important for OAuth callbacks)
if (process.env.REPL_ID) {
  app.set('trust proxy', true);
  console.log('Trust proxy enabled for Replit environment');
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Add cookie-parser middleware BEFORE session middleware
app.use(cookieParser());

// Require SESSION_SECRET for security
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required for secure sessions');
}

// Configure session middleware
// Special handling for Replit environment which uses HTTPS even in development
const isReplit = !!process.env.REPL_ID;
const isHttps = isReplit || process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isHttps, // Enable secure cookies on Replit (HTTPS) even in dev mode
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Important for OAuth callbacks
  },
  // Trust proxy for proper HTTPS detection in Replit
  proxy: isReplit
  // TODO: In production, use a persistent session store like Redis or PostgreSQL
  // instead of the default MemoryStore for better scalability and reliability
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport(storage);

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
      // Avoid logging full response bodies for auth endpoints to prevent PII leakage
      if (capturedJsonResponse && !path.includes('/auth/')) {
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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
