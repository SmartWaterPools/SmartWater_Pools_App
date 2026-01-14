import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { storage } from "./storage";
import authRoutes from "./routes/auth-routes";
import registerUserOrgRoutes from "./routes/user-org-routes";
import documentRoutes from "./routes/document-routes";
import bazzaRoutes from "./routes/bazza-routes";
import communicationRoutes from "./routes/communication-routes";
import emailRoutes from "./routes/email-routes";
import smsRoutes from "./routes/sms-routes";
import vendorRoutes from "./routes/vendor-routes";
import workOrderRoutes from "./routes/work-order-routes";
import serviceTemplateRoutes from "./routes/service-template-routes";
import { isAuthenticated } from "./auth";
import { type User, insertProjectPhaseSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount authentication routes
  app.use('/api/auth', authRoutes);
  
  // Mount document routes
  app.use('/api', documentRoutes);

  // Mount bazza routes (service routes)
  app.use('/api/bazza', bazzaRoutes);

  // Mount communication routes
  app.use('/api', communicationRoutes);

  // Mount email routes
  app.use(emailRoutes);

  // Mount SMS routes
  app.use('/api/sms', smsRoutes);

  // Mount vendor routes
  app.use('/api/vendors', vendorRoutes);

  // Mount work order routes
  app.use('/api/work-orders', workOrderRoutes);

  // Mount service template routes
  app.use('/api/service-templates', serviceTemplateRoutes);

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

  // Export clients as CSV
  app.get('/api/clients/export', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const clients = await storage.getUsersByRole('client');
      const orgClients = clients.filter(c => c.organizationId === user?.organizationId);
      
      // Create CSV header and rows
      const csvHeader = 'name,email,phone,address\n';
      const csvRows = orgClients.map(client => {
        const escapeCsv = (val: string | null) => {
          if (!val) return '';
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };
        return `${escapeCsv(client.name)},${escapeCsv(client.email)},${escapeCsv(client.phone)},${escapeCsv(client.address)}`;
      }).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
      res.send(csv);
    } catch (error) {
      console.error('Export clients error:', error);
      res.status(500).json({ error: 'Failed to export clients' });
    }
  });

  // Import clients from CSV
  app.post('/api/clients/import', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization not found' });
      }
      
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ error: 'No CSV data provided' });
      }
      
      // Parse CSV
      const lines = csvData.split('\n').filter((line: string) => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV must have a header row and at least one data row' });
      }
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (let lineIndex = 0; lineIndex < dataLines.length; lineIndex++) {
        const line = dataLines[lineIndex];
        const rowNum = lineIndex + 2; // +2 for 1-indexed and header row
        
        try {
          // Parse CSV line (handle quoted values)
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          
          const [name, email, phone, address] = values;
          
          if (!name || !email) {
            results.failed++;
            results.errors.push(`Row ${rowNum}: Missing required field (name or email)`);
            continue;
          }
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            results.failed++;
            results.errors.push(`Row ${rowNum}: Invalid email format "${email}"`);
            continue;
          }
          
          // Check if email already exists
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
            results.failed++;
            results.errors.push(`Row ${rowNum}: Email already exists "${email}"`);
            continue;
          }
          
          // Generate unique username
          let username = email.split('@')[0];
          let suffix = 0;
          let uniqueUsername = username;
          
          while (await storage.getUserByUsername(uniqueUsername)) {
            suffix++;
            uniqueUsername = `${username}${suffix}`;
          }
          
          // Create the client
          await storage.createUser({
            username: uniqueUsername,
            name,
            email,
            phone: phone || null,
            address: address || null,
            role: 'client',
            organizationId: user.organizationId,
            active: true,
            authProvider: 'local'
          });
          
          results.success++;
        } catch (lineError: any) {
          results.failed++;
          const errorMessage = lineError?.message || 'Unknown error';
          results.errors.push(`Row ${rowNum}: ${errorMessage}`);
        }
      }
      
      res.json({
        success: true,
        message: `Imported ${results.success} clients, ${results.failed} failed`,
        imported: results.success,
        failed: results.failed,
        errors: results.errors
      });
    } catch (error) {
      console.error('Import clients error:', error);
      res.status(500).json({ error: 'Failed to import clients' });
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

  // PATCH single client - update client data including address coordinates
  app.patch('/api/clients/:id', isAuthenticated, async (req, res) => {
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
      
      const { name, email, phone, address, addressLat, addressLng, companyName, contractType } = req.body;
      
      // Build update object with only provided fields
      const updateData: Partial<User> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (addressLat !== undefined) updateData.addressLat = addressLat;
      if (addressLng !== undefined) updateData.addressLng = addressLng;
      
      console.log('Updating client', clientId, 'with data:', updateData);
      
      // Update the user
      const updatedClient = await storage.updateUser(clientId, updateData);
      
      if (!updatedClient) {
        return res.status(500).json({ error: 'Failed to update client' });
      }
      
      // Return updated client data in the expected format
      res.json({
        client: {
          id: updatedClient.id,
          companyName: companyName || null,
          contractType: contractType || 'residential',
          latitude: updatedClient.addressLat ? parseFloat(updatedClient.addressLat) : null,
          longitude: updatedClient.addressLng ? parseFloat(updatedClient.addressLng) : null
        },
        user: {
          id: updatedClient.id,
          username: updatedClient.username,
          name: updatedClient.name,
          email: updatedClient.email,
          role: updatedClient.role,
          phone: updatedClient.phone,
          address: updatedClient.address,
          addressLat: updatedClient.addressLat,
          addressLng: updatedClient.addressLng,
          active: updatedClient.active,
          organizationId: updatedClient.organizationId,
          authProvider: updatedClient.authProvider
        },
        address: updatedClient.address,
        phone: updatedClient.phone
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ error: 'Failed to update client' });
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
          isArchived: project.isArchived || false
        };
      }));
      
      res.json(formattedProjects);
    } catch (error) {
      console.error('Projects error:', error);
      res.status(500).json({ error: 'Failed to load projects' });
    }
  });

  // Get single project endpoint
  app.get('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      // Check if project exists
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get the client and verify organization access
      const client = await storage.getUser(project.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found for project' });
      }
      
      // Verify the client belongs to the user's organization (security check)
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
      
      // Format project with client details
      const formattedProject = {
        ...project,
        client: {
          id: client.id,
          user: sanitizedClient,
          companyName: null, // Will need to add this field later
          contractType: 'residential' // Default value for now
        },
        // Add calculated fields the frontend expects
        completion: project.percentComplete || 0,
        deadline: project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : new Date(),
        assignments: [],
        isArchived: project.isArchived || false
      };
      
      res.json(formattedProject);
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Failed to get project' });
    }
  });

  // Get project phases endpoint
  app.get('/api/projects/:id/phases', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get the project first to verify it exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get the client and verify organization access
      const client = await storage.getUser(project.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found for project' });
      }
      
      // Verify the client belongs to the user's organization (security check)
      const authUser = req.user as User;
      if (client.organizationId !== authUser?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get phases for this project
      const phases = await storage.getProjectPhases(projectId);
      
      // Return phases as JSON array
      res.json(phases);
    } catch (error) {
      console.error('Get project phases error:', error);
      res.status(500).json({ error: 'Failed to get project phases' });
    }
  });

  // Get project work orders endpoint
  app.get('/api/projects/:id/work-orders', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const client = await storage.getUser(project.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found for project' });
      }
      
      const authUser = req.user as User;
      if (client.organizationId !== authUser?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const workOrders = await storage.getWorkOrdersByProject(projectId);
      res.json(workOrders);
    } catch (error) {
      console.error('Get project work orders error:', error);
      res.status(500).json({ error: 'Failed to get project work orders' });
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
      console.log(`PATCH /api/projects/${projectId} - Starting update`, { body: req.body });
      
      // Get the project and verify access
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log(`PATCH /api/projects/${projectId} - Project not found`);
        return res.status(404).json({ error: 'Project not found' });
      }
      console.log(`PATCH /api/projects/${projectId} - Found project:`, { clientId: project.clientId, name: project.name });

      // Verify the project belongs to a client in the user's organization
      const client = await storage.getUser(project.clientId);
      const authUser = req.user as User;
      console.log(`PATCH /api/projects/${projectId} - Auth check:`, { 
        clientId: project.clientId, 
        clientOrgId: client?.organizationId, 
        userOrgId: authUser?.organizationId,
        clientFound: !!client
      });
      
      // @ts-ignore - TypeScript issue with organizationId
      if (!client || client.organizationId !== authUser?.organizationId) {
        console.log(`PATCH /api/projects/${projectId} - Access denied`);
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the project
      const updatedProject = await storage.updateProject(projectId, req.body);
      
      if (!updatedProject) {
        console.log(`PATCH /api/projects/${projectId} - Update returned null`);
        return res.status(500).json({ error: 'Failed to update project' });
      }

      console.log(`PATCH /api/projects/${projectId} - Update successful`);
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

  // Get project deletion preview - shows what will be deleted
  app.get('/api/projects/:id/deletion-preview', isAuthenticated, async (req, res) => {
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

      // Get counts of all related records
      const preview = await storage.getProjectDeletionPreview(projectId);
      
      res.json(preview);
    } catch (error) {
      console.error('Get project deletion preview error:', error);
      res.status(500).json({ error: 'Failed to get deletion preview' });
    }
  });

  // Delete project endpoint
  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log(`DELETE /api/projects/${projectId} - Starting delete`);
      
      // Get the project and verify access
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log(`DELETE /api/projects/${projectId} - Project not found`);
        return res.status(404).json({ error: 'Project not found' });
      }
      console.log(`DELETE /api/projects/${projectId} - Found project:`, { clientId: project.clientId, name: project.name });

      // Verify the project belongs to a client in the user's organization
      const client = await storage.getUser(project.clientId);
      const authUser = req.user as User;
      console.log(`DELETE /api/projects/${projectId} - Auth check:`, { 
        clientId: project.clientId, 
        clientOrgId: client?.organizationId, 
        userOrgId: authUser?.organizationId,
        clientFound: !!client
      });
      
      // @ts-ignore - TypeScript issue with organizationId
      if (!client || client.organizationId !== authUser?.organizationId) {
        console.log(`DELETE /api/projects/${projectId} - Access denied`);
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete the project with cascade
      console.log(`DELETE /api/projects/${projectId} - Starting cascade delete`);
      const deleted = await storage.deleteProjectWithCascade(projectId);
      
      if (!deleted) {
        console.log(`DELETE /api/projects/${projectId} - Cascade delete returned false`);
        return res.status(500).json({ error: 'Failed to delete project' });
      }

      console.log(`DELETE /api/projects/${projectId} - Delete successful`);
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // PROJECT PHASES ENDPOINTS
  
  // Create project phase endpoint
  app.post('/api/project-phases', isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const validation = insertProjectPhaseSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validation.error.issues 
        });
      }
      
      const phaseData = validation.data;
      
      // Verify the project exists and user has access
      const project = await storage.getProject(phaseData.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get the client to verify organization access
      const client = await storage.getUser(project.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found for project' });
      }
      
      // Verify the user has access to this organization
      const authUser = req.user as User;
      if (client.organizationId !== authUser?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Create the project phase
      const newPhase = await storage.createProjectPhase({
        projectId: phaseData.projectId,
        name: phaseData.name,
        description: phaseData.description || null,
        status: phaseData.status || 'pending',
        order: phaseData.order || 0,
        percentComplete: phaseData.percentComplete || 0,
        startDate: phaseData.startDate || null,
        endDate: phaseData.endDate || null,
        notes: phaseData.notes || null,
        estimatedDuration: phaseData.estimatedDuration || null,
        actualDuration: phaseData.actualDuration || null,
        cost: phaseData.cost || null,
        permitRequired: phaseData.permitRequired || false,
        inspectionRequired: phaseData.inspectionRequired || false,
        inspectionDate: phaseData.inspectionDate || null,
        inspectionPassed: phaseData.inspectionPassed || null,
        inspectionNotes: phaseData.inspectionNotes || null
      });
      
      // Return the created phase as JSON
      res.status(201).json(newPhase);
    } catch (error) {
      console.error('Create project phase error:', error);
      res.status(500).json({ error: 'Failed to create project phase' });
    }
  });
  
  // Update project phase endpoint
  app.put('/api/project-phases/:id', isAuthenticated, async (req, res) => {
    try {
      const phaseId = parseInt(req.params.id);
      
      // Get the existing phase
      const existingPhase = await storage.getProjectPhase(phaseId);
      if (!existingPhase) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      
      // Verify the project exists and user has access
      const project = await storage.getProject(existingPhase.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get the client to verify organization access
      const client = await storage.getUser(project.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found for project' });
      }
      
      // Verify the user has access to this organization
      const authUser = req.user as User;
      if (client.organizationId !== authUser?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Update the phase with provided data
      const updateData = req.body;
      const updatedPhase = await storage.updateProjectPhase(phaseId, updateData);
      
      if (!updatedPhase) {
        return res.status(500).json({ error: 'Failed to update phase' });
      }
      
      // Return the updated phase as JSON
      res.json(updatedPhase);
    } catch (error) {
      console.error('Update project phase error:', error);
      res.status(500).json({ error: 'Failed to update project phase' });
    }
  });
  
  // Also support PATCH for partial updates
  app.patch('/api/project-phases/:id', isAuthenticated, async (req, res) => {
    try {
      const phaseId = parseInt(req.params.id);
      
      // Get the existing phase
      const existingPhase = await storage.getProjectPhase(phaseId);
      if (!existingPhase) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      
      // Verify the project exists and user has access
      const project = await storage.getProject(existingPhase.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get the client to verify organization access
      const client = await storage.getUser(project.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found for project' });
      }
      
      // Verify the user has access to this organization
      const authUser = req.user as User;
      if (client.organizationId !== authUser?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Update the phase with provided data (partial update)
      const updateData = req.body;
      const updatedPhase = await storage.updateProjectPhase(phaseId, updateData);
      
      if (!updatedPhase) {
        return res.status(500).json({ error: 'Failed to update phase' });
      }
      
      // Return the updated phase as JSON
      res.json(updatedPhase);
    } catch (error) {
      console.error('Update project phase error:', error);
      res.status(500).json({ error: 'Failed to update project phase' });
    }
  });
  
  // Delete project phase endpoint
  app.delete('/api/project-phases/:id', isAuthenticated, async (req, res) => {
    try {
      const phaseId = parseInt(req.params.id);
      
      // Get the phase to verify it exists
      const phase = await storage.getProjectPhase(phaseId);
      if (!phase) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      
      // Verify the project exists and user has access
      const project = await storage.getProject(phase.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get the client to verify organization access
      const client = await storage.getUser(project.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found for project' });
      }
      
      // Verify the user has access to this organization
      const authUser = req.user as User;
      if (client.organizationId !== authUser?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Delete the phase
      const deleted = await storage.deleteProjectPhase(phaseId);
      
      if (!deleted) {
        return res.status(500).json({ error: 'Failed to delete phase' });
      }
      
      // Return success response
      res.json({
        success: true,
        message: 'Phase deleted successfully'
      });
    } catch (error) {
      console.error('Delete project phase error:', error);
      res.status(500).json({ error: 'Failed to delete project phase' });
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

  // Update technician assignment for maintenance
  app.patch('/api/maintenances/:id/technician', isAuthenticated, async (req, res) => {
    try {
      const maintenanceId = parseInt(req.params.id);
      const { technicianId } = req.body;
      
      // Get the maintenance/repair record
      const repair = await storage.getRepair(maintenanceId);
      if (!repair) {
        return res.status(404).json({ error: 'Maintenance not found' });
      }
      
      // Verify the user has access (check client belongs to user's organization)
      const user = req.user as User;
      const client = await storage.getUser(repair.clientId);
      if (!client || client.organizationId !== user?.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Update the technician assignment
      const updatedRepair = await storage.updateRepair(maintenanceId, {
        technicianId: technicianId || null
      });
      
      if (!updatedRepair) {
        return res.status(500).json({ error: 'Failed to update technician' });
      }
      
      res.json(updatedRepair);
    } catch (error) {
      console.error('Update maintenance technician error:', error);
      res.status(500).json({ error: 'Failed to update technician' });
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
      
      // Format repairs with proper client and technician details matching ClientWithUser structure
      const formattedRepairs = await Promise.all(organizationRepairs.map(async (repair) => {
        const clientUser = await storage.getUser(repair.clientId);
        const technicianUser = repair.technicianId ? await storage.getUser(repair.technicianId) : null;
        
        return {
          ...repair,
          // Add client details in ClientWithUser format (matching /api/clients pattern)
          client: clientUser ? {
            client: {
              id: clientUser.id,
              userId: clientUser.id,
              organizationId: clientUser.organizationId,
              companyName: null,
              contractType: 'residential'
            },
            user: {
              id: clientUser.id,
              name: clientUser.name,
              email: clientUser.email,
              role: clientUser.role,
              organizationId: clientUser.organizationId,
              phone: clientUser.phone,
              address: clientUser.address
            }
          } : null,
          // Add technician details in nested format with user sub-object
          technician: technicianUser ? {
            id: technicianUser.id,
            userId: technicianUser.id,
            user: {
              id: technicianUser.id,
              name: technicianUser.name,
              email: technicianUser.email
            }
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
      
      // Get all technicians from the technicians table with their user details
      const allTechnicians = await storage.getTechnicians();
      
      // Filter by organization through the user relationship
      const organizationTechnicians = await Promise.all(
        allTechnicians.map(async (tech) => {
          const techUser = await storage.getUser(tech.userId);
          return { ...tech, user: techUser };
        })
      );
      
      const filteredTechnicians = organizationTechnicians.filter(
        t => t.user && t.user.organizationId === user?.organizationId
      );
      
      // Return technician records with user data
      const sanitizedTechnicians = filteredTechnicians.map(tech => ({
        id: tech.id, // This is the technician table ID
        username: tech.user?.username,
        name: tech.user?.name,
        email: tech.user?.email,
        role: tech.user?.role,
        phone: tech.user?.phone,
        address: tech.user?.address,
        addressLat: tech.user?.addressLat,
        addressLng: tech.user?.addressLng,
        active: tech.user?.active,
        organizationId: tech.user?.organizationId,
        authProvider: tech.user?.authProvider
      }));
      
      res.json(sanitizedTechnicians);
    } catch (error) {
      console.error('Technicians error:', error);
      res.status(500).json({ error: 'Failed to load technicians' });
    }
  });

  // Technicians with user details endpoint - required by frontend
  app.get('/api/technicians-with-users', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Get all technicians from the technicians table
      const allTechnicians = await storage.getTechnicians();
      
      // Get user details for each technician and filter by organization
      const techniciansWithUsers = await Promise.all(
        allTechnicians.map(async (tech) => {
          const techUser = await storage.getUser(tech.userId);
          if (!techUser || techUser.organizationId !== user?.organizationId) {
            return null;
          }
          
          return {
            id: tech.id, // This is the technician table ID
            userId: tech.userId, // This is the user table ID
            organizationId: techUser.organizationId || 0,
            specialization: tech.specialization || '',
            certifications: tech.certifications ? [tech.certifications] : [],
            status: techUser.active ? 'active' : 'inactive',
            notes: null,
            user: {
              id: techUser.id,
              name: techUser.name,
              email: techUser.email,
              role: techUser.role,
              organizationId: techUser.organizationId,
              phone: techUser.phone || undefined,
              address: techUser.address || undefined,
              photoUrl: techUser.photoUrl || undefined
            }
          };
        })
      );
      
      // Filter out nulls (technicians not in the user's organization)
      const filteredTechnicians = techniciansWithUsers.filter(t => t !== null);
      
      res.json(filteredTechnicians);
    } catch (error) {
      console.error('Technicians with users error:', error);
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
