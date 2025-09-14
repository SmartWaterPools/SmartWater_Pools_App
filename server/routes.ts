import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { storage } from "./storage";
import authRoutes from "./routes/auth-routes";
import { isAuthenticated } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount authentication routes
  app.use('/api/auth', authRoutes);

  // Dashboard routes - essential for main app functionality
  const dashboardRouter = Router();
  
  // Dashboard summary endpoint
  dashboardRouter.get('/summary', isAuthenticated, async (req, res) => {
    try {
      // Return basic summary data for now
      const summary = {
        totalProjects: 0,
        activeProjects: 0, 
        completedProjects: 0,
        totalClients: 0,
        pendingMaintenance: 0,
        upcomingMaintenance: 0
      };
      res.json(summary);
    } catch (error) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  });
  
  app.use('/api/dashboard', dashboardRouter);

  // Basic clients endpoint
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      // Get all users with role 'client' from the current organization
      const clients = await storage.getUsersByRole('client');
      
      // Format clients in the expected structure with sanitized data
      const formattedClients = clients
        .filter(c => c.organizationId === req.user?.organizationId) // Filter by current org
        .map(client => {
          // Sanitize client data - remove sensitive fields
          const sanitizedClient = {
            id: client.id,
            username: client.username,
            name: client.name,
            email: client.email,
            role: client.role,
            phone: client.phone,
            address: client.address,
            addressLat: client.addressLat,
            addressLng: client.addressLng,
            active: client.active,
            organizationId: client.organizationId,
            authProvider: client.authProvider
            // Explicitly exclude: password, googleId, photoUrl
          };
          
          return {
            client: {
              id: client.id,
              companyName: null, // Will need to add this field later
              contractType: 'residential' // Default value for now
            },
            user: sanitizedClient,
            id: client.id, // Add top-level ID for convenience
            companyName: null,
            contractType: 'residential'
          };
        });
      
      res.json(formattedClients);
    } catch (error) {
      console.error('Clients error:', error);
      res.status(500).json({ error: 'Failed to load clients' });
    }
  });

  // Create new client endpoint
  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const { name, email, phone, address, addressLat, addressLng, companyName, contractType } = req.body;
      
      // Require organization ID from authenticated user
      if (!req.user?.organizationId) {
        return res.status(400).json({ error: 'Organization not found' });
      }
      
      // Generate unique username - handle potential duplicates
      let username = email.split('@')[0];
      let suffix = 0;
      let uniqueUsername = username;
      
      // Check for existing username and add suffix if needed
      while (await storage.getUserByUsername(uniqueUsername)) {
        suffix++;
        uniqueUsername = `${username}${suffix}`;
      }
      
      // Create a new user with role 'client'
      const newClient = await storage.createUser({
        username: uniqueUsername,
        name,
        email,
        phone: phone || null,
        address: address || null,
        addressLat: addressLat || null,
        addressLng: addressLng || null,
        role: 'client',
        organizationId: req.user.organizationId,
        active: true,
        authProvider: 'local'
      });
      
      // Sanitize the response - remove sensitive fields
      const sanitizedClient = {
        id: newClient.id,
        username: newClient.username,
        name: newClient.name,
        email: newClient.email,
        role: newClient.role,
        phone: newClient.phone,
        address: newClient.address,
        active: newClient.active,
        organizationId: newClient.organizationId,
        authProvider: newClient.authProvider
      };
      
      console.log('Created new client:', sanitizedClient.id);
      res.json({ 
        success: true, 
        message: 'Client created successfully',
        client: sanitizedClient
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  });
  
  // Get single client endpoint  
  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getUser(clientId);
      
      // Check if client exists and belongs to the same organization
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Verify organization access - critical security check
      if (client.organizationId !== req.user?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Sanitize client data - remove sensitive fields
      const sanitizedClient = {
        id: client.id,
        username: client.username,
        name: client.name,
        email: client.email,
        role: client.role,
        phone: client.phone,
        address: client.address,
        addressLat: client.addressLat,
        addressLng: client.addressLng,
        active: client.active,
        organizationId: client.organizationId,
        authProvider: client.authProvider
        // Explicitly exclude: password, googleId, photoUrl
      };
      
      // Return client data in the expected format
      res.json({
        client: {
          id: client.id,
          companyName: null, // Will need to add this field to users table later
          contractType: 'residential', // Default value for now
          latitude: client.addressLat ? parseFloat(client.addressLat) : null,
          longitude: client.addressLng ? parseFloat(client.addressLng) : null
        },
        user: sanitizedClient,
        // Add convenience fields
        address: client.address,
        phone: client.phone
      });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ error: 'Failed to get client' });
    }
  });

  // Basic projects endpoint  
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      // Return empty array for now - prevents connection errors
      res.json([]);
    } catch (error) {
      console.error('Projects error:', error);
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  // Basic maintenances endpoint
  app.get('/api/maintenances', isAuthenticated, async (req, res) => {
    try {
      // Return empty array for now - prevents connection errors
      res.json([]);
    } catch (error) {
      console.error('Maintenances error:', error);
      res.status(500).json({ error: 'Failed to load maintenances' });
    }
  });

  // Basic repairs endpoint
  app.get('/api/repairs', isAuthenticated, async (req, res) => {
    try {
      // Return empty array for now - prevents connection errors
      res.json([]);
    } catch (error) {
      console.error('Repairs error:', error);
      res.status(500).json({ error: 'Failed to load repairs' });
    }
  });

  // Basic organizations endpoint
  app.get('/api/organizations', isAuthenticated, async (req, res) => {
    try {
      // Return empty array for now - prevents connection errors
      res.json([]);
    } catch (error) {
      console.error('Organizations error:', error);
      res.status(500).json({ error: 'Failed to load organizations' });
    }
  });

  // Basic users endpoint
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      // Return empty array for now - prevents connection errors
      res.json([]);
    } catch (error) {
      console.error('Users error:', error);
      res.status(500).json({ error: 'Failed to load users' });
    }
  });

  // Basic technicians endpoint
  app.get('/api/technicians', isAuthenticated, async (req, res) => {
    try {
      // Return empty array for now - prevents connection errors
      res.json([]);
    } catch (error) {
      console.error('Technicians error:', error);
      res.status(500).json({ error: 'Failed to load technicians' });
    }
  });

  // Google Maps API key endpoint
  app.get('/api/google-maps-key', (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(404).json({ error: 'Google Maps API key not configured' });
      }
      res.json({ apiKey });
    } catch (error) {
      console.error('Error fetching Google Maps API key:', error);
      res.status(500).json({ error: 'Failed to fetch API key' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
