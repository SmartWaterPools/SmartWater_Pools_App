import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import authRoutes from "./routes/auth-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount authentication routes
  app.use('/api/auth', authRoutes);

  // Add other API routes here as needed
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
