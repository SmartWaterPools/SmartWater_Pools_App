import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import authRoutes from "./routes/auth-routes";
import registerUserOrgRoutes from "./routes/user-org-routes";
import documentRoutes from "./routes/document-routes";
import bazzaRoutes from "./routes/bazza-routes";
import communicationRoutes from "./routes/communication-routes";
import emailRoutes from "./routes/email-routes";
import smsRoutes from "./routes/sms-routes";
import twilioRoutes from "./routes/twilio-routes";
import vendorRoutes from "./routes/vendor-routes";
import workOrderRoutes from "./routes/work-order-routes";
import workOrderRequestRoutes from "./routes/work-order-request-routes";
import serviceTemplateRoutes from "./routes/service-template-routes";
import googleCalendarRoutes from "./routes/google-calendar-routes";
import businessRoutes from "./routes/business-routes";
import invoiceRoutes from "./routes/invoice-routes";
import vendorInvoiceRoutes from "./routes/vendor-invoice-routes";
import maintenanceOrderRoutes from "./routes/maintenance-order-routes";
import registerInventoryRoutes from "./routes/inventory-routes";
import dispatchRoutes from "./routes/dispatch-routes";
import serviceReportRoutes from "./routes/service-report-routes";
import estimateRoutes from "./routes/estimate-routes";
import taxTemplateRoutes from "./routes/tax-template-routes";
import invitationRoutes from "./routes/invitation-routes";
import { isAuthenticated, requirePermission } from "./auth";
import { type User, insertProjectPhaseSchema, bazzaMaintenanceAssignments, bazzaRoutes as bazzaRoutesTable, bazzaRouteStops, clients, users, poolEquipment, poolImages, poolWizardCustomQuestions, poolWizardCustomResponses } from "@shared/schema";

const workOrderPhotoStorage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    const uploadPath = path.join(process.cwd(), "uploads", "work-order-photos");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const workOrderPhotoUpload = multer({
  storage: workOrderPhotoStorage,
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not set, skipping geocoding');
      return null;
    }
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`);
    const data = await response.json();
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    console.warn(`Geocoding failed for "${address}": ${data.status}`);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount authentication routes
  app.use('/api/auth', authRoutes);
  
  // Mount document routes
  app.use('/api', documentRoutes);

  // Mount bazza routes (service routes)
  app.use('/api/bazza', bazzaRoutes);

  // Mount dispatch routes
  app.use('/api/dispatch', dispatchRoutes);

  // Mount communication routes
  app.use('/api', communicationRoutes);

  // Mount email routes
  app.use(emailRoutes);

  // Mount SMS routes
  app.use('/api/sms', smsRoutes);

  // Mount Twilio routes
  app.use('/api/twilio', twilioRoutes);

  // Mount vendor routes
  app.use('/api/vendors', vendorRoutes);

  // Mount vendor invoice routes
  app.use('/api/vendor-invoices', vendorInvoiceRoutes);

  // Mount work order routes
  app.use('/api/work-orders', workOrderRoutes);

  // Work Order Photo Upload
  app.post('/api/work-orders/:id/photos', isAuthenticated, workOrderPhotoUpload.array('photos', 10), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const workOrder = await storage.getWorkOrder(id);
      if (!workOrder) return res.status(404).json({ error: 'Work order not found' });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const newPhotoUrls = files.map(f => `/uploads/work-order-photos/${f.filename}`);
      const existingPhotos = workOrder.photos || [];
      const allPhotos = [...existingPhotos, ...newPhotoUrls];

      await storage.updateWorkOrder(id, { photos: allPhotos });
      res.json({ success: true, photos: allPhotos });
    } catch (error) {
      console.error('Error uploading work order photos:', error);
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  });

  app.delete('/api/work-orders/:id/photos', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { photoUrl } = req.body;
      
      const workOrder = await storage.getWorkOrder(id);
      if (!workOrder) return res.status(404).json({ error: 'Work order not found' });

      if (!(workOrder.photos || []).includes(photoUrl)) {
        return res.status(400).json({ error: 'Photo not found in work order' });
      }

      const updatedPhotos = (workOrder.photos || []).filter(p => p !== photoUrl);
      await storage.updateWorkOrder(id, { photos: updatedPhotos });

      const safeName = path.basename(photoUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'work-order-photos', safeName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ success: true, photos: updatedPhotos });
    } catch (error) {
      console.error('Error deleting work order photo:', error);
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  // Mount work order request routes
  app.use('/api/work-order-requests', workOrderRequestRoutes);

  // Mount service template routes
  app.use('/api/service-templates', serviceTemplateRoutes);

  // Mount maintenance order routes
  app.use('/api/maintenance-orders', maintenanceOrderRoutes);

  // Mount Google Calendar routes
  app.use('/api/google-calendar', googleCalendarRoutes);

  // Mount business routes
  app.use('/api/business', businessRoutes);

  // Mount service report routes
  app.use('/api/service-reports', serviceReportRoutes);

  // Mount standalone inventory routes
  const inventoryRouter = Router();
  registerInventoryRoutes(inventoryRouter, storage);
  app.use('/api/inventory', inventoryRouter);

  // Stripe webhook needs raw body for signature verification
  const { raw } = await import('express');
  app.use('/api/invoices/webhook', raw({ type: 'application/json' }));

  // Mount invoice routes
  app.use('/api/invoices', invoiceRoutes);

  // Mount estimate routes
  app.use('/api/estimates', estimateRoutes);

  // Mount tax template routes
  app.use('/api/tax-templates', taxTemplateRoutes);

  // Mount invitation routes
  app.use('/api/invitations', invitationRoutes);

  // Dashboard routes - essential for main app functionality
  const dashboardRouter = Router();
  
  // Dashboard summary endpoint
  dashboardRouter.get('/summary', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const organizationId = user?.organizationId || 0;
      
      let clientIds: number[];
      let organizationClients = await storage.getUsersByRoleAndOrganization('client', organizationId);
      
      if (user.role === 'client') {
        clientIds = [user.id];
      } else {
        clientIds = organizationClients.map(c => c.id);
      }
      
      // Get all projects for these clients
      const allProjects = await storage.getProjectsByOrganization(organizationId, clientIds);
      
      // Count projects by status
      const activeProjectsList = allProjects.filter(p => p.status === 'in_progress');
      const activeProjects = activeProjectsList.length;
      
      // Get recent active/in-progress projects for the "Construction Projects" section
      // Filter to show only active projects (in_progress, planning, on_hold) - not completed or cancelled
      const recentProjectsRaw = allProjects
        .filter(p => ['in_progress', 'planning', 'on_hold'].includes(p.status))
        .sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 5);
      
      // Include client info for projects
      const recentProjects = await Promise.all(
        recentProjectsRaw.map(async (project) => {
          const clientUser = project.clientId ? await storage.getUser(project.clientId) : null;
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            startDate: project.startDate,
            estimatedCompletionDate: project.estimatedCompletionDate,
            percentComplete: project.percentComplete || 0,
            projectType: project.projectType || 'construction',
            clientId: project.clientId,
            assignments: [],
            client: clientUser ? {
              user: {
                name: clientUser.name,
                address: clientUser.address
              }
            } : { user: { name: 'Unknown Client', address: '' } }
          };
        })
      );
      
      // Get all repairs and count by status
      const allRepairs = await storage.getRepairs();
      // Filter repairs by clients in the organization
      const orgRepairs = allRepairs.filter(r => clientIds.includes(r.clientId));
      
      // Calculate pending repairs
      const pendingRepairs = orgRepairs.filter(r => 
        r.status === 'reported' || r.status === 'scheduled' || r.status === 'pending'
      ).length;
      
      // Get recent repairs (up to 10, sorted by most recent)
      // Include client and technician info for display
      const recentRepairsRaw = orgRepairs
        .sort((a, b) => {
          const dateA = a.reportedDate ? new Date(a.reportedDate).getTime() : 0;
          const dateB = b.reportedDate ? new Date(b.reportedDate).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 10);
      
      // Fetch client and technician details for repairs
      const recentRepairs = await Promise.all(
        recentRepairsRaw.map(async (repair) => {
          const clientUser = repair.clientId ? await storage.getUser(repair.clientId) : null;
          const technicianUser = repair.technicianId ? await storage.getUser(repair.technicianId) : null;
          
          return {
            id: repair.id,
            clientId: repair.clientId,
            technicianId: repair.technicianId,
            issue: repair.issue,
            priority: repair.priority,
            description: repair.description,
            reportedDate: repair.reportedDate,
            scheduledDate: repair.scheduledDate,
            completionDate: repair.completionDate,
            status: repair.status,
            notes: repair.notes,
            client: clientUser ? {
              user: {
                name: clientUser.name,
                address: clientUser.address
              }
            } : null,
            technician: technicianUser ? {
              user: {
                name: technicianUser.name
              }
            } : null
          };
        })
      );
      
      // Get maintenance assignments from bazza system - scoped to organization clients
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7); // End of week
      
      // Format dates for SQL query (YYYY-MM-DD format) 
      const startDateStr = startOfWeek.toISOString().split('T')[0];
      const endDateStr = endOfWeek.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      
      // Single efficient query: join maintenance assignments with route stops and routes
      // Then filter by organization clients in JavaScript (since route_stops.clientId references users)
      const maintenanceWithDetails = await db.select({
        assignment: bazzaMaintenanceAssignments,
        routeStop: bazzaRouteStops,
        route: bazzaRoutesTable
      })
        .from(bazzaMaintenanceAssignments)
        .innerJoin(bazzaRouteStops, eq(bazzaMaintenanceAssignments.routeStopId, bazzaRouteStops.id))
        .innerJoin(bazzaRoutesTable, eq(bazzaMaintenanceAssignments.routeId, bazzaRoutesTable.id))
        .orderBy(desc(bazzaMaintenanceAssignments.date));
      
      // Filter to only include maintenance for clients in this organization
      const orgMaintenanceData = maintenanceWithDetails.filter(m => 
        clientIds.includes(m.routeStop.clientId)
      );
      
      // Count maintenance this week (scoped to org)
      const maintenanceThisWeek = orgMaintenanceData.filter(m => {
        const dateStr = String(m.assignment.date);
        return dateStr >= startDateStr && dateStr < endDateStr;
      }).length;
      
      // Get upcoming scheduled maintenances (scoped to org)
      const upcomingMaintenancesRaw = orgMaintenanceData
        .filter(m => m.assignment.status === 'scheduled' && String(m.assignment.date) >= todayStr)
        .sort((a, b) => {
          const dateA = String(a.assignment.date);
          const dateB = String(b.assignment.date);
          return dateA.localeCompare(dateB);
        })
        .slice(0, 10);
      
      // Include client and technician info for maintenance
      const upcomingMaintenances = await Promise.all(
        upcomingMaintenancesRaw.map(async (m) => {
          const clientUser = m.routeStop.clientId ? await storage.getUser(m.routeStop.clientId) : null;
          const technicianUser = m.route.technicianId ? await storage.getUser(m.route.technicianId) : null;
          
          return {
            id: m.assignment.id,
            title: 'Maintenance Visit',
            description: m.assignment.notes || 'Scheduled pool maintenance',
            status: m.assignment.status,
            priority: 'normal',
            scheduledDate: m.assignment.date,
            clientId: m.routeStop.clientId,
            technicianId: m.route.technicianId,
            category: 'maintenance',
            client: clientUser ? {
              user: {
                name: clientUser.name,
                address: clientUser.address
              }
            } : { user: { name: 'Unknown Client', address: '' } },
            technician: technicianUser ? {
              user: {
                name: technicianUser.name
              }
            } : { user: { name: 'Unassigned' } }
          };
        })
      );
      
      // Build the summary in the expected format
      const summary = {
        metrics: {
          activeProjects,
          maintenanceThisWeek,
          pendingRepairs,
          totalClients: organizationClients.length
        },
        recentProjects,
        upcomingMaintenances,
        recentRepairs
      };
      
      res.json(summary);
    } catch (error) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  });
  
  app.use('/api/dashboard', dashboardRouter);

  // Basic clients endpoint
  app.get('/api/clients', isAuthenticated, requirePermission('clients', 'view'), async (req, res) => {
    try {
      // Get all users with role 'client' from the current organization
      const user = req.user as User;
      const clients = await storage.getUsersByRoleAndOrganization('client', user.organizationId);
      
      // Format clients in the expected structure with sanitized data
      const formattedClients = clients
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
  app.post('/api/clients', isAuthenticated, requirePermission('clients', 'create'), async (req, res) => {
    try {
      // Support both flat and nested body formats
      const userData = req.body.user || req.body;
      const clientData = req.body.client || req.body;
      
      const { name, email, phone, address, username: providedUsername, password } = userData;
      const { addressLat, addressLng, companyName, contractType, billingAddress, billingCity, billingState, billingZip } = clientData;
      
      // Require organization ID from authenticated user
      const user = req.user as User;
      if (!user?.organizationId) {
        return res.status(400).json({ error: 'Organization not found' });
      }
      
      // Generate unique username - handle potential duplicates
      let username = providedUsername || email.split('@')[0];
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
        authProvider: 'local',
        ...(password ? { password } : {})
      });
      
      // Create client record with billing fields if any client-specific data provided
      if (companyName || contractType || billingAddress || billingCity || billingState || billingZip) {
        try {
          await db.insert(clients).values({
            userId: newClient.id,
            organizationId: user.organizationId,
            companyName: companyName || null,
            contractType: contractType || null,
            billingAddress: billingAddress || null,
            billingCity: billingCity || null,
            billingState: billingState || null,
            billingZip: billingZip || null,
            latitude: clientData.latitude || null,
            longitude: clientData.longitude || null,
          });
        } catch (clientErr) {
          console.error('Failed to create client record:', clientErr);
        }
      }
      
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

  app.get('/api/clients/client-records', isAuthenticated, requirePermission('clients', 'view'), async (req, res) => {
    try {
      const user = req.user as User;
      const records = await db.select({
        id: clients.id,
        userId: clients.userId,
        name: users.name,
        companyName: clients.companyName,
        address: users.address,
        latitude: clients.latitude,
        longitude: clients.longitude,
      }).from(clients)
        .innerJoin(users, eq(clients.userId, users.id))
        .where(eq(users.organizationId, user.organizationId));
      res.json(records);
    } catch (error) {
      console.error('Client records error:', error);
      res.status(500).json({ error: 'Failed to fetch client records' });
    }
  });

  // Export clients as CSV
  app.get('/api/clients/export', isAuthenticated, requirePermission('clients', 'view'), async (req, res) => {
    try {
      const user = req.user as User;
      const orgClients = await storage.getUsersByRoleAndOrganization('client', user.organizationId);
      
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
  app.post('/api/clients/import', isAuthenticated, requirePermission('clients', 'create'), async (req, res) => {
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
  app.get('/api/clients/:id', isAuthenticated, requirePermission('clients', 'view'), async (req, res) => {
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
      
      // Fetch the client record from the clients table for billing fields
      const clientRecords = await db.select().from(clients).where(eq(clients.userId, client.id));
      const clientRecord = clientRecords[0] || null;
      
      // Return client data in the expected format
      res.json({
        client: {
          id: clientRecord?.id || client.id,
          companyName: clientRecord?.companyName || null,
          contractType: clientRecord?.contractType || 'residential',
          latitude: clientRecord?.latitude || (client.addressLat ? parseFloat(client.addressLat) : null),
          longitude: clientRecord?.longitude || (client.addressLng ? parseFloat(client.addressLng) : null),
          billingAddress: clientRecord?.billingAddress || null,
          billingCity: clientRecord?.billingCity || null,
          billingState: clientRecord?.billingState || null,
          billingZip: clientRecord?.billingZip || null,
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
  app.patch('/api/clients/:id', isAuthenticated, requirePermission('clients', 'edit'), async (req, res) => {
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
      
      const { name, email, phone, address, addressLat, addressLng, companyName, contractType, billingAddress, billingCity, billingState, billingZip, poolType, poolSize, filterType, heaterType, chemicalSystem, specialNotes, serviceDay } = req.body;
      
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
      
      // Update billing and pool fields in the clients table
      const clientRecords = await db.select().from(clients).where(eq(clients.userId, clientId));
      let clientRecord = clientRecords[0] || null;
      
      const clientUpdateData: Record<string, any> = {};
      if (companyName !== undefined) clientUpdateData.companyName = companyName;
      if (contractType !== undefined) clientUpdateData.contractType = contractType;
      if (billingAddress !== undefined) clientUpdateData.billingAddress = billingAddress;
      if (billingCity !== undefined) clientUpdateData.billingCity = billingCity;
      if (billingState !== undefined) clientUpdateData.billingState = billingState;
      if (billingZip !== undefined) clientUpdateData.billingZip = billingZip;
      if (poolType !== undefined) clientUpdateData.poolType = poolType;
      if (poolSize !== undefined) clientUpdateData.poolSize = poolSize;
      if (filterType !== undefined) clientUpdateData.filterType = filterType;
      if (heaterType !== undefined) clientUpdateData.heaterType = heaterType;
      if (chemicalSystem !== undefined) clientUpdateData.chemicalSystem = chemicalSystem;
      if (specialNotes !== undefined) clientUpdateData.specialNotes = specialNotes;
      if (serviceDay !== undefined) clientUpdateData.serviceDay = serviceDay;
      
      if (clientRecord && Object.keys(clientUpdateData).length > 0) {
        await db.update(clients).set(clientUpdateData).where(eq(clients.id, clientRecord.id));
      } else if (!clientRecord && Object.keys(clientUpdateData).length > 0) {
        const insertData = { userId: clientId, ...clientUpdateData };
        const inserted = await db.insert(clients).values(insertData).returning();
        clientRecord = inserted[0] || null;
      }
      
      // Re-fetch client record for response
      const updatedClientRecords = await db.select().from(clients).where(eq(clients.userId, clientId));
      const updatedClientRecord = updatedClientRecords[0] || null;
      
      // Return updated client data in the expected format
      res.json({
        client: {
          id: updatedClientRecord?.id || updatedClient.id,
          companyName: updatedClientRecord?.companyName || companyName || null,
          contractType: updatedClientRecord?.contractType || contractType || 'residential',
          latitude: updatedClientRecord?.latitude || (updatedClient.addressLat ? parseFloat(updatedClient.addressLat) : null),
          longitude: updatedClientRecord?.longitude || (updatedClient.addressLng ? parseFloat(updatedClient.addressLng) : null),
          billingAddress: updatedClientRecord?.billingAddress || null,
          billingCity: updatedClientRecord?.billingCity || null,
          billingState: updatedClientRecord?.billingState || null,
          billingZip: updatedClientRecord?.billingZip || null,
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

  // Pool Equipment Routes
  app.get('/api/clients/:clientId/equipment', isAuthenticated, requirePermission('clients', 'view'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const equipment = await db.select().from(poolEquipment).where(eq(poolEquipment.clientId, clientId));
      res.json(equipment);
    } catch (error) {
      console.error('Error fetching pool equipment:', error);
      res.status(500).json({ error: 'Failed to fetch pool equipment' });
    }
  });

  app.post('/api/clients/:clientId/equipment', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const [equipment] = await db.insert(poolEquipment).values({ ...req.body, clientId }).returning();
      res.status(201).json(equipment);
    } catch (error) {
      console.error('Error creating pool equipment:', error);
      res.status(500).json({ error: 'Failed to create pool equipment' });
    }
  });

  app.patch('/api/clients/:clientId/equipment/:equipmentId', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const equipmentId = parseInt(req.params.equipmentId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const [updated] = await db.update(poolEquipment).set(req.body).where(and(eq(poolEquipment.id, equipmentId), eq(poolEquipment.clientId, clientId))).returning();
      if (!updated) return res.status(404).json({ error: 'Equipment not found' });
      res.json(updated);
    } catch (error) {
      console.error('Error updating pool equipment:', error);
      res.status(500).json({ error: 'Failed to update pool equipment' });
    }
  });

  app.delete('/api/clients/:clientId/equipment/:equipmentId', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const equipmentId = parseInt(req.params.equipmentId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      await db.delete(poolEquipment).where(and(eq(poolEquipment.id, equipmentId), eq(poolEquipment.clientId, clientId)));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting pool equipment:', error);
      res.status(500).json({ error: 'Failed to delete pool equipment' });
    }
  });

  // Pool Images Routes
  app.get('/api/clients/:clientId/images', isAuthenticated, requirePermission('clients', 'view'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const images = await db.select().from(poolImages).where(eq(poolImages.clientId, clientId));
      res.json(images);
    } catch (error) {
      console.error('Error fetching pool images:', error);
      res.status(500).json({ error: 'Failed to fetch pool images' });
    }
  });

  app.post('/api/clients/:clientId/images', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const [image] = await db.insert(poolImages).values({ ...req.body, clientId }).returning();
      res.status(201).json(image);
    } catch (error) {
      console.error('Error creating pool image:', error);
      res.status(500).json({ error: 'Failed to create pool image' });
    }
  });

  app.delete('/api/clients/:clientId/images/:imageId', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const imageId = parseInt(req.params.imageId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      await db.delete(poolImages).where(and(eq(poolImages.id, imageId), eq(poolImages.clientId, clientId)));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting pool image:', error);
      res.status(500).json({ error: 'Failed to delete pool image' });
    }
  });

  // Pool Wizard Custom Questions Routes
  app.get('/api/pool-wizard-questions', isAuthenticated, requirePermission('clients', 'view'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const questions = await db.select().from(poolWizardCustomQuestions).where(eq(poolWizardCustomQuestions.organizationId, user.organizationId));
      res.json(questions);
    } catch (error) {
      console.error('Error fetching pool wizard questions:', error);
      res.status(500).json({ error: 'Failed to fetch pool wizard questions' });
    }
  });

  app.post('/api/pool-wizard-questions', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const [question] = await db.insert(poolWizardCustomQuestions).values({ ...req.body, organizationId: user.organizationId }).returning();
      res.status(201).json(question);
    } catch (error) {
      console.error('Error creating pool wizard question:', error);
      res.status(500).json({ error: 'Failed to create pool wizard question' });
    }
  });

  app.patch('/api/pool-wizard-questions/:id', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      const [updated] = await db.update(poolWizardCustomQuestions).set(req.body).where(and(eq(poolWizardCustomQuestions.id, id), eq(poolWizardCustomQuestions.organizationId, user.organizationId))).returning();
      if (!updated) return res.status(404).json({ error: 'Question not found' });
      res.json(updated);
    } catch (error) {
      console.error('Error updating pool wizard question:', error);
      res.status(500).json({ error: 'Failed to update pool wizard question' });
    }
  });

  app.delete('/api/pool-wizard-questions/:id', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const id = parseInt(req.params.id);
      await db.delete(poolWizardCustomQuestions).where(and(eq(poolWizardCustomQuestions.id, id), eq(poolWizardCustomQuestions.organizationId, user.organizationId)));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting pool wizard question:', error);
      res.status(500).json({ error: 'Failed to delete pool wizard question' });
    }
  });

  // Pool Wizard Custom Responses Routes
  app.get('/api/clients/:clientId/wizard-responses', isAuthenticated, requirePermission('clients', 'view'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const responses = await db.select().from(poolWizardCustomResponses).where(eq(poolWizardCustomResponses.clientId, clientId));
      res.json(responses);
    } catch (error) {
      console.error('Error fetching wizard responses:', error);
      res.status(500).json({ error: 'Failed to fetch wizard responses' });
    }
  });

  app.put('/api/clients/:clientId/wizard-responses', isAuthenticated, requirePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const clientId = parseInt(req.params.clientId);
      const clientUser = await storage.getUser(clientId);
      if (!clientUser || clientUser.organizationId !== user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const responsesData: Array<{ questionId: number; response: string }> = req.body;

      const results = await Promise.all(
        responsesData.map(async ({ questionId, response }) => {
          const existing = await db.select().from(poolWizardCustomResponses)
            .where(and(eq(poolWizardCustomResponses.clientId, clientId), eq(poolWizardCustomResponses.questionId, questionId)));

          if (existing.length > 0) {
            const [updated] = await db.update(poolWizardCustomResponses)
              .set({ response, updatedAt: new Date() })
              .where(and(eq(poolWizardCustomResponses.clientId, clientId), eq(poolWizardCustomResponses.questionId, questionId)))
              .returning();
            return updated;
          } else {
            const [created] = await db.insert(poolWizardCustomResponses)
              .values({ clientId, questionId, response })
              .returning();
            return created;
          }
        })
      );

      res.json(results);
    } catch (error) {
      console.error('Error upserting wizard responses:', error);
      res.status(500).json({ error: 'Failed to upsert wizard responses' });
    }
  });

  // Basic projects endpoint  
  app.get('/api/projects', isAuthenticated, requirePermission('projects', 'view'), async (req, res) => {
    try {
      const user = req.user as User;
      
      let projectsList;
      if (user.role === 'client') {
        const allProjects = await storage.getProjects();
        projectsList = allProjects.filter(p => p.clientId === user.id);
      } else {
        const organizationClients = await storage.getUsersByRoleAndOrganization('client', user.organizationId);
        const orgClientIds = organizationClients.map(c => c.id);
        projectsList = await storage.getProjectsByOrganization(
          user.organizationId, 
          orgClientIds
        );
      }
      
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
  app.get('/api/projects/:id', isAuthenticated, requirePermission('projects', 'view'), async (req, res) => {
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
      
      // Client-role users can only view their own projects
      if (authUser.role === 'client' && project.clientId !== authUser.id) {
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
  app.get('/api/projects/:id/phases', isAuthenticated, requirePermission('projects', 'view'), async (req, res) => {
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
  app.get('/api/projects/:id/work-orders', isAuthenticated, requirePermission('projects', 'view'), async (req, res) => {
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
  app.post('/api/projects', isAuthenticated, requirePermission('projects', 'create'), async (req, res) => {
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
  app.patch('/api/projects/:id', isAuthenticated, requirePermission('projects', 'edit'), async (req, res) => {
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
  app.get('/api/projects/:id/deletion-preview', isAuthenticated, requirePermission('projects', 'delete'), async (req, res) => {
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
  app.delete('/api/projects/:id', isAuthenticated, requirePermission('projects', 'delete'), async (req, res) => {
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


  // Basic repairs endpoint
  app.get('/api/repairs', isAuthenticated, requirePermission('repairs', 'view'), async (req, res) => {
    try {
      const user = req.user as User;
      
      let organizationRepairs;
      if (user.role === 'client') {
        const allRepairs = await storage.getRepairs();
        organizationRepairs = allRepairs.filter(r => r.clientId === user.id);
      } else {
        const organizationClients = await storage.getUsersByRoleAndOrganization('client', user.organizationId);
        const clientIds = organizationClients.map(c => c.id);
        const allRepairs = await storage.getRepairs();
        organizationRepairs = allRepairs.filter(r => clientIds.includes(r.clientId));
      }
      
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

  // Organization Permissions API
  app.get('/api/organizations/:orgId/permissions', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const orgId = parseInt(req.params.orgId);
      if (isNaN(orgId)) return res.status(400).json({ error: "Invalid organization ID" });
      
      const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
        currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
      
      if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin && currentUser.organizationId !== orgId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const permissions = await storage.getOrganizationPermissions(orgId);
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching organization permissions:', error);
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  });

  app.put('/api/organizations/:orgId/permissions', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const orgId = parseInt(req.params.orgId);
      if (isNaN(orgId)) return res.status(400).json({ error: "Invalid organization ID" });
      
      const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
        currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
      const isOrgAdmin = ['org_admin', 'admin'].includes(currentUser.role) && currentUser.organizationId === orgId;
      
      if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin && !isOrgAdmin) {
        return res.status(403).json({ error: "Only organization admins can modify permissions" });
      }
      
      const { role, permissions } = req.body;
      if (!role || !permissions || typeof permissions !== 'object') {
        return res.status(400).json({ error: "Missing required fields: role, permissions" });
      }
      
      const validRoles = ['system_admin', 'org_admin', 'admin', 'manager', 'office_staff', 'technician', 'client', 'vendor'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      const result = await storage.upsertOrganizationPermission(orgId, role, permissions, currentUser.id);
      res.json(result);
    } catch (error) {
      console.error('Error saving organization permissions:', error);
      res.status(500).json({ error: 'Failed to save permissions' });
    }
  });

  // Mount Organization Management routes
  const orgRouter = Router();
  registerUserOrgRoutes(orgRouter, storage, false);
  app.use('/api/organizations', orgRouter);

  // Mount Admin User Management routes
  const adminUsersRouter = Router();
  registerUserOrgRoutes(adminUsersRouter, storage, true);
  app.use('/api/admin/users', adminUsersRouter);
  
  // Also mount at /api/users for backward compatibility
  const usersRouter = Router();
  registerUserOrgRoutes(usersRouter, storage, true);
  app.use('/api/users', usersRouter);

  // Basic technicians endpoint
  app.get('/api/technicians', isAuthenticated, requirePermission('technicians', 'view'), async (req, res) => {
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
  app.get('/api/technicians-with-users', isAuthenticated, requirePermission('technicians', 'view'), async (req, res) => {
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

  // Places Autocomplete API endpoint - PUBLIC (server-side proxy, uses new Places API)
  app.get('/api/places/autocomplete', async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.json({ suggestions: [] });
      }
      const input = req.query.input as string;
      if (!input || input.length < 2) {
        return res.json({ suggestions: [] });
      }

      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['street_address', 'subpremise', 'premise', 'route'],
          includedRegionCodes: ['us'],
        }),
      });
      const data = await response.json();

      if (data.error) {
        console.error('Places Autocomplete (New) error:', data.error.message);
        return res.json({ suggestions: [] });
      }

      const suggestions = (data.suggestions || []).map((s: any) => ({
        placeId: s.placePrediction?.placeId || '',
        mainText: s.placePrediction?.structuredFormat?.mainText?.text || '',
        secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text || '',
        fullText: s.placePrediction?.text?.text || '',
      }));

      return res.json({ suggestions });
    } catch (error) {
      console.error('Places Autocomplete fetch error:', error);
      return res.json({ suggestions: [] });
    }
  });

  // Places Details API endpoint - PUBLIC (server-side proxy, uses new Places API)
  app.get('/api/places/details', async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.json({ result: null });
      }
      const placeId = req.query.place_id as string;
      if (!placeId) {
        return res.json({ result: null });
      }

      const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'formattedAddress,location,addressComponents',
        },
      });
      const data = await response.json();

      if (data.error) {
        console.error('Places Details (New) error:', data.error.message);
        return res.json({ result: null });
      }

      return res.json({
        result: {
          formatted_address: data.formattedAddress || '',
          lat: data.location?.latitude,
          lng: data.location?.longitude,
          address_components: (data.addressComponents || []).map((c: any) => ({
            long_name: c.longText || '',
            short_name: c.shortText || '',
            types: c.types || [],
          })),
        },
      });
    } catch (error) {
      console.error('Places Details fetch error:', error);
      return res.json({ result: null });
    }
  });

  // Google Geocoding API endpoint - PUBLIC
  // Uses Geocoding API to get full address with zip code and coordinates
  app.get('/api/places/geocode', async (req, res) => {
    try {
      const { address } = req.query;
      
      if (!address || typeof address !== 'string' || address.length < 3) {
        return res.status(400).json({ error: 'Address required' });
      }
      
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key not configured');
        return res.status(500).json({ error: 'API key not configured' });
      }
      
      // Use Google Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Geocoding API error:', response.status, errorText);
        return res.status(response.status).json({ error: 'Failed to geocode address' });
      }
      
      const data = await response.json();
      console.log('Geocoding response status:', data.status);
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.warn('Geocoding returned no results for:', address);
        return res.json({ 
          formattedAddress: address,
          zipCode: '',
          latitude: null,
          longitude: null,
        });
      }
      
      const result = data.results[0];
      
      // Extract zip code from address components
      let zipCode = '';
      const addressComponents = result.address_components || [];
      for (const component of addressComponents) {
        if (component.types?.includes('postal_code')) {
          zipCode = component.short_name || component.long_name || '';
          break;
        }
      }
      
      // Get coordinates
      const latitude = result.geometry?.location?.lat || null;
      const longitude = result.geometry?.location?.lng || null;
      
      // Get formatted address (includes zip code)
      const formattedAddress = result.formatted_address || address;
      
      console.log('Geocode result:', { formattedAddress, zipCode, latitude, longitude });
      
      res.json({
        formattedAddress,
        zipCode,
        latitude,
        longitude,
        addressComponents: addressComponents.map((c: any) => ({
          types: c.types,
          longName: c.long_name,
          shortName: c.short_name,
        })),
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  });

  // Chemical Pricing Management
  app.get('/api/chemical-prices', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const organizationId = (req as any).organizationId || user.organizationId;
      if (!organizationId) return res.status(400).json({ error: 'Organization required' });
      const prices = await storage.getChemicalPricesByOrganization(organizationId);
      res.json(prices);
    } catch (error) {
      console.error('Error fetching chemical prices:', error);
      res.status(500).json({ error: 'Failed to fetch chemical prices' });
    }
  });

  app.post('/api/chemical-prices', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      const organizationId = (req as any).organizationId || user.organizationId;
      if (!organizationId) return res.status(400).json({ error: 'Organization required' });
      
      const priceData = { ...req.body, organizationId };
      const price = await storage.createChemicalPrice(priceData);
      res.status(201).json(price);
    } catch (error) {
      console.error('Error creating chemical price:', error);
      res.status(500).json({ error: 'Failed to create chemical price' });
    }
  });

  app.patch('/api/chemical-prices/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const price = await storage.updateChemicalPrice(id, req.body);
      res.json(price);
    } catch (error) {
      console.error('Error updating chemical price:', error);
      res.status(500).json({ error: 'Failed to update chemical price' });
    }
  });

  app.delete('/api/chemical-prices/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChemicalPrice(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting chemical price:', error);
      res.status(500).json({ error: 'Failed to delete chemical price' });
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
