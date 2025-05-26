import express from "express";
import { registerRoutes } from "./replitRoutes";
import { setupVite, serveStatic } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = parseInt(process.env.PORT ?? "5000", 10);

async function startServer() {
  try {
    // Set up Replit Auth routes
    const server = await registerRoutes(app);
    
    // Set up Vite for development or static files for production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    server.listen(PORT, "0.0.0.0", () => {
      const isReplit = !!process.env.REPL_ID;
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Local: http://localhost:${PORT}`);
      if (isReplit) {
        console.log(`🌐 Replit: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();