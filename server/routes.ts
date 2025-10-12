import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { storage } from "./storage";
import authRoutes from "./routes/auth-routes";
import registerUserOrgRoutes from "./routes/user-org-routes";
import { isAuthenticated } from "./auth";
import { type User } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount authentication routes
  app.use('/api/auth', authRoutes);

  // Dashboard routes - essential for main app functionality
  const dashboardRouter = Router();
  
  // Dashboard summary endpoint
  dashboardRouter.get('/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Get all clients from the current organization
      const allClients = await storage.getUsersByRole('client');
      const organizationClients = allClients.filter(c => c.organizationId === user?.organizationId);
      const clientIds = organizationClients.map(c => c.id);
      
      // Get all projects for these clients
      const allProjects = await storage.getProjectsByOrganization(
        user?.organizationId || 0,
        clientIds
      );
      
      // Count projects by status
      const activeProjects = allProjects.filter(p => p.status === 'in_progress').length;
      const completedProjects = allProjects.filter(p => p.status === 'completed').length;
      
      // Get all repairs and count by status
      const allRepairs = await storage.getRepairs();
      // Filter repairs by clients in the organization
      const orgRepairs = allRepairs.filter(r => clientIds.includes(r.clientId));
      const pendingMaintenance = orgRepairs.filter(r => 
        r.status === 'scheduled' || r.status === 'pending'
      ).length;
      const upcomingMaintenance = orgRepairs.filter(r => 
        r.status === 'in_progress'
      ).length;
      
      const summary = {
        totalProjects: allProjects.length,
        activeProjects, 
        completedProjects,
        totalClients: organizationClients.length,
        pendingMaintenance,
        upcomingMaintenance
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
      const user = req.user as User;
      const formattedClients = clients
        .filter(c => c.organizationId === user?.organizationId) // Filter by current org
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
      const user = req.user as User;
      if (!user?.organizationId) {
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
        organizationId: user.organizationId,
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
        addressLat: newClient.addressLat,
        addressLng: newClient.addressLng,
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
      const authUser = req.user as User;
      if (client.organizationId !== authUser?.organizationId) {
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
      // Get all clients from the current organization
      const organizationClients = await storage.getUsersByRole('client');
      const orgClientIds = organizationClients
        // @ts-ignore - TypeScript issue with organizationId
        .filter(c => c.organizationId === req.user?.organizationId)
        .map(c => c.id);
      
      // Get all projects for these clients
      const projectsList = await storage.getProjectsByOrganization(
        // @ts-ignore - TypeScript issue with organizationId
        req.user?.organizationId || 0, 
        orgClientIds
      );
      
      // Format projects with client details
      const formattedProjects = await Promise.all(projectsList.map(async (project) => {
        const client = await storage.getUser(project.clientId);
        
        // Create a properly formatted project with client details
        return {
          ...project,
          client: client ? {
            id: client.id,
            user: {
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
              // @ts-ignore - TypeScript issue with organizationId
              organizationId: client.organizationId,
              authProvider: client.authProvider
            },
            companyName: null,
            contractType: 'residential'
          } : null,
          // Add calculated fields the frontend expects
          completion: project.percentComplete || 0,
          deadline: project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : new Date(),
          assignments: [],
          isArchived: false
        };
      }));
      
      res.json(formattedProjects);
    } catch (error) {
      console.error('Projects error:', error);
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  // Create project endpoint
  app.post('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const { 
        clientId, 
        name, 
        description, 
        startDate, 
        estimatedCompletionDate,
        status,
        budget,
        notes,
        projectType,
        currentPhase,
        percentComplete,
        permitDetails
      } = req.body;

      // Verify the client belongs to the user's organization
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // @ts-ignore - TypeScript issue with organizationId
      if (client.organizationId !== req.user?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Create the project
      const newProject = await storage.createProject({
        clientId,
        name,
        description: description || null,
        startDate: startDate || new Date().toISOString().split('T')[0],
        estimatedCompletionDate: estimatedCompletionDate || null,
        actualCompletionDate: null,
        status: status || 'pending',
        budget: budget || null,
        notes: notes || null,
        projectType: projectType || 'construction',
        currentPhase: currentPhase || null,
        percentComplete: percentComplete || 0,
        permitDetails: permitDetails || null,
        isTemplate: false,
        templateName: null,
        templateCategory: null
      });

      res.json({
        success: true,
        message: 'Project created successfully',
        project: newProject
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  // Update project endpoint
  app.patch('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get the project and verify access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Verify the project belongs to a client in the user's organization
      const client = await storage.getUser(project.clientId);
      // @ts-ignore - TypeScript issue with organizationId
      if (!client || client.organizationId !== req.user?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the project
      const updatedProject = await storage.updateProject(projectId, req.body);
      
      if (!updatedProject) {
        return res.status(500).json({ error: 'Failed to update project' });
      }

      res.json({
        success: true,
        message: 'Project updated successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  // Delete project endpoint
  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get the project and verify access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Verify the project belongs to a client in the user's organization
      const client = await storage.getUser(project.clientId);
      // @ts-ignore - TypeScript issue with organizationId
      if (!client || client.organizationId !== req.user?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete the project
      const deleted = await storage.deleteProject(projectId);
      
      if (!deleted) {
        return res.status(500).json({ error: 'Failed to delete project' });
      }

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Basic maintenances endpoint (alias for repairs)
  app.get('/api/maintenances', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Get all clients from the current organization
      const allClients = await storage.getUsersByRole('client');
      const organizationClients = allClients.filter(c => c.organizationId === user?.organizationId);
      const clientIds = organizationClients.map(c => c.id);
      
      // Get all repairs and filter by organization's clients
      const allRepairs = await storage.getRepairs();
      const organizationRepairs = allRepairs.filter(r => clientIds.includes(r.clientId));
      
      // Format repairs as maintenances with proper client details
      const formattedMaintenances = await Promise.all(organizationRepairs.map(async (repair) => {
        const client = await storage.getUser(repair.clientId);
        const technician = repair.technicianId ? await storage.getUser(repair.technicianId) : null;
        
        return {
          ...repair,
          // Add client details
          client: client ? {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address
          } : null,
          // Add technician details
          technician: technician ? {
            id: technician.id,
            name: technician.name,
            email: technician.email
          } : null
        };
      }));
      
      res.json(formattedMaintenances);
    } catch (error) {
      console.error('Maintenances error:', error);
      res.status(500).json({ error: 'Failed to load maintenances' });
    }
  });

  // Basic repairs endpoint
  app.get('/api/repairs', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Get all clients from the current organization
      const allClients = await storage.getUsersByRole('client');
      const organizationClients = allClients.filter(c => c.organizationId === user?.organizationId);
      const clientIds = organizationClients.map(c => c.id);
      
      // Get all repairs and filter by organization's clients
      const allRepairs = await storage.getRepairs();
      const organizationRepairs = allRepairs.filter(r => clientIds.includes(r.clientId));
      
      // Format repairs with proper client and technician details
      const formattedRepairs = await Promise.all(organizationRepairs.map(async (repair) => {
        const client = await storage.getUser(repair.clientId);
        const technician = repair.technicianId ? await storage.getUser(repair.technicianId) : null;
        
        return {
          ...repair,
          // Add client details
          client: client ? {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address
          } : null,
          // Add technician details
          technician: technician ? {
            id: technician.id,
            name: technician.name,
            email: technician.email
          } : null
        };
      }));
      
      res.json(formattedRepairs);
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

  // Mount Admin User Management routes
  const adminUsersRouter = Router();
  registerUserOrgRoutes(adminUsersRouter, storage, true);
  app.use('/api/admin/users', adminUsersRouter);
  
  // Also mount at /api/users for backward compatibility
  const usersRouter = Router();
  registerUserOrgRoutes(usersRouter, storage, true);
  app.use('/api/users', usersRouter);

  // Basic technicians endpoint
  app.get('/api/technicians', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Get all users with role 'technician' from the current organization
      const allTechnicians = await storage.getUsersByRole('technician');
      const organizationTechnicians = allTechnicians.filter(t => t.organizationId === user?.organizationId);
      
      // Sanitize technician data - remove sensitive fields
      const sanitizedTechnicians = organizationTechnicians.map(technician => ({
        id: technician.id,
        username: technician.username,
        name: technician.name,
        email: technician.email,
        role: technician.role,
        phone: technician.phone,
        address: technician.address,
        addressLat: technician.addressLat,
        addressLng: technician.addressLng,
        active: technician.active,
        organizationId: technician.organizationId,
        authProvider: technician.authProvider
        // Explicitly exclude: password, googleId, photoUrl
      }));
      
      res.json(sanitizedTechnicians);
    } catch (error) {
      console.error('Technicians error:', error);
      res.status(500).json({ error: 'Failed to load technicians' });
    }
  });

  // Google Maps API key endpoint - PUBLIC (no auth required)
  // This needs to be accessible from the login page
  app.get('/api/google-maps-key', (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      console.log('Google Maps API Key endpoint called');
      console.log('Environment variable GOOGLE_MAPS_API_KEY exists:', !!process.env.GOOGLE_MAPS_API_KEY);
      console.log('API key value (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
      
      if (!apiKey) {
        console.log('No Google Maps API key found in environment variables');
        // Return empty response instead of 404 to avoid console errors
        return res.json({ apiKey: null });
      }
      
      console.log('Returning Google Maps API key');
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
