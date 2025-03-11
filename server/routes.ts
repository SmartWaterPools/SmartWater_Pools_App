import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fs, path, rootDir } from "./utils";
import { 
  insertUserSchema, 
  insertClientSchema, 
  updateClientSchema,
  insertTechnicianSchema,
  insertProjectSchema,
  insertMaintenanceSchema,
  insertRepairSchema,
  insertInvoiceSchema,
  insertPoolEquipmentSchema,
  insertPoolImageSchema,
  insertServiceTemplateSchema,
  insertProjectPhaseSchema,
  insertProjectDocumentationSchema,
  insertCommunicationProviderSchema,
  insertChemicalUsageSchema,
  insertWaterReadingsSchema,
  insertRouteSchema,
  insertRouteAssignmentSchema,
  validateContractType,
  CONTRACT_TYPES,
  CHEMICAL_TYPES,
  COMMUNICATION_PROVIDER_TYPES,
  CommunicationProviderType,
  ChemicalType,
  ROUTE_TYPES,
  // Business Module schemas
  insertExpenseSchema,
  // insertPayrollEntrySchema removed
  insertTimeEntrySchema,
  insertFinancialReportSchema,
  insertVendorSchema,
  insertPurchaseOrderSchema,
  insertInventoryItemSchema,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  REPORT_TYPES
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper function to handle validation and respond with appropriate error
const validateRequest = (schema: z.ZodType<any, any>, data: any): { success: boolean; data?: any; error?: string } => {
  try {
    console.log("[VALIDATION] Input data:", JSON.stringify(data));
    
    // Pre-process data to handle null values that should be undefined
    // This improves compatibility with zod validation
    const processedData = Object.entries(data).reduce((result, [key, value]) => {
      // For numeric fields, convert null to undefined to avoid validation errors
      if (value === null && 
          ['estimatedDuration', 'actualDuration', 'cost', 'percentComplete'].includes(key)) {
        console.log(`[VALIDATION] Converting null to undefined for field: ${key}`);
        return result;
      }
      result[key] = value;
      return result;
    }, {} as Record<string, any>);
    
    console.log("[VALIDATION] Processed data:", JSON.stringify(processedData));
    
    const validatedData = schema.parse(processedData);
    console.log("[VALIDATION] Validated data:", JSON.stringify(validatedData));
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("[VALIDATION] Zod error:", error.errors);
      const validationError = fromZodError(error);
      return { success: false, error: validationError.message };
    }
    console.error("[VALIDATION] Unexpected error:", error);
    return { success: false, error: "Invalid request data" };
  }
};

// We import CONTRACT_TYPES and validateContractType from shared/schema.ts


export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Serve static files from the root diagnostic.html and app-test.html
  // Using rootDir imported from utils.ts
  
  // Register diagnostic HTML routes
  app.get('/diagnostic', (req: Request, res: Response) => {
    const diagPath = path.join(rootDir, 'diagnostic.html');
    if (fs.existsSync(diagPath)) {
      res.sendFile(diagPath);
    } else {
      res.status(404).send('Diagnostic page not found');
    }
  });
  
  app.get('/app-test', (req: Request, res: Response) => {
    const testPath = path.join(rootDir, 'app-test.html');
    if (fs.existsSync(testPath)) {
      res.sendFile(testPath);
    } else {
      res.status(404).send('App test page not found');
    }
  });

  // Enhanced health check endpoint with detailed diagnostics
  app.get("/api/health", (req: Request, res: Response) => {
    console.log(`Health check request received from: ${req.headers.host || 'unknown host'}`);
    console.log(`User agent: ${req.headers['user-agent'] || 'unknown'}`);
    
    // Get server metrics
    const serverInfo = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      service: "SmartWater Pools Management System",
      database: process.env.DATABASE_URL ? "configured" : "not configured",
      requestFrom: req.headers.host || 'unknown',
      requestPath: req.path,
      requestMethod: req.method,
      requestProtocol: req.protocol,
      nodeVersion: process.version,
      memory: {
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      },
      uptime: Math.round(process.uptime()) + ' seconds'
    };
    
    console.log('Health check response:', serverInfo);
    res.status(200).json(serverInfo);
  });

  // User routes
  app.get("/api/users", async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertUserSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      const user = await storage.createUser(validation.data);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[API] Updating user ${id} with data:`, req.body);
      
      if (isNaN(id)) {
        console.log(`[API] Invalid user ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const updatedUser = await storage.updateUser(id, req.body);
      
      if (!updatedUser) {
        console.log(`[API] User ${id} not found for update`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[API] User ${id} updated successfully:`, updatedUser);
      return res.json(updatedUser);
    } catch (error) {
      console.error("[API] Error updating user:", error);
      return res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Client routes
  app.get("/api/clients", async (_req: Request, res: Response) => {
    try {
      const clients = await storage.getAllClients();

      // Fetch the associated user for each client
      const clientsWithUsers = await Promise.all(
        clients.map(async (client) => {
          const user = await storage.getUser(client.userId);
          return { ...client, user };
        })
      );

      res.json(clientsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Fetching client with ID: ${id}`);

      if (isNaN(id)) {
        console.log(`Invalid client ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const clientWithUser = await storage.getClientWithUser(id);
      console.log(`Result of getClientWithUser(${id}):`, clientWithUser);

      if (!clientWithUser) {
        console.log(`Client with ID ${id} not found or user data missing`);
        return res.status(404).json({ message: "Client not found" });
      }

      // Combine the client and user into a single object with the user property
      // to match what the frontend expects
      const clientResponse = {
        ...clientWithUser.client,
        user: clientWithUser.user
      };

      console.log(`Successfully retrieved client ${id} with data:`, JSON.stringify(clientResponse));
      res.json(clientResponse);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client", error: String(error) });
    }
  });

  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.log(`[CLIENT UPDATE API] Invalid client ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid client ID", details: `Received: ${req.params.id}` });
      }

      console.log(`[CLIENT UPDATE API] Attempting to update client with ID: ${id}`);
      console.log(`[CLIENT UPDATE API] Original update data:`, JSON.stringify(req.body));
      
      // DEBUG - Explicitly log contract type if present
      if (req.body.contractType !== undefined) {
        console.log(`[CLIENT UPDATE API] CONTRACT TYPE UPDATE REQUESTED:`, 
          typeof req.body.contractType === 'string' ? `"${req.body.contractType}"` : req.body.contractType,
          `(type: ${typeof req.body.contractType})`);
      }

      // Get the existing client
      const client = await storage.getClient(id);
      if (!client) {
        console.log(`[CLIENT UPDATE API] Client with ID ${id} not found`);
        return res.status(404).json({ message: "Client not found", clientId: id });
      }

      console.log(`[CLIENT UPDATE API] Found existing client:`, JSON.stringify(client));
      console.log(`[CLIENT UPDATE API] Current contract type:`, 
        client.contractType ? `"${client.contractType}"` : client.contractType,
        `(type: ${typeof client.contractType})`);
      

      // Validate the request data using our schema
      const validationResult = validateRequest(updateClientSchema, req.body);
      if (!validationResult.success) {
        console.error(`[CLIENT UPDATE API] Validation error:`, validationResult.error);
        return res.status(400).json({ 
          message: validationResult.error || "Invalid client data",
          received: req.body
        });
      }

      const updateData = validationResult.data;
      console.log(`[CLIENT UPDATE API] Validated data:`, JSON.stringify(updateData));

      // Only perform update if there are actual changes
      const hasChanges = Object.keys(updateData).some(key => {
        // Special handling for contractType since this is the only field we might accidentally clear
        if (key === 'contractType') {
          // Only include contractType in the update if it was explicitly set in the request
          if (req.body.contractType !== undefined) {
            if (updateData.contractType !== null && client.contractType !== null) {
              return String(updateData.contractType).toLowerCase() !== String(client.contractType).toLowerCase();
            }
            return updateData.contractType !== client.contractType; // Handle null cases
          }
          // If contractType wasn't in the original request, remove it from updateData
          delete updateData.contractType;
          return false;
        }
        
        // Pool-related fields - compare exact values
        if ([
          'poolType', 
          'poolSize', 
          'filterType', 
          'heaterType', 
          'chemicalSystem', 
          'specialNotes', 
          'serviceDay'
        ].includes(key)) {
          // Safely handle null/undefined values
          const updateValue = updateData[key as keyof typeof updateData];
          const clientValue = client[key as keyof typeof client];
          
          // Different null/undefined handling
          if (updateValue === null || updateValue === undefined) {
            return clientValue !== null && clientValue !== undefined;
          }
          if (clientValue === null || clientValue === undefined) {
            return updateValue !== null && updateValue !== undefined;
          }
          
          // Otherwise compare string values
          return String(updateValue) !== String(clientValue);
        }
        
        // For other fields
        if (key === 'companyName') {
          return updateData.companyName !== client.companyName;
        }
        
        // Log unhandled fields for debugging
        console.log(`[CLIENT UPDATE API] Unhandled field in change detection: ${key}`);
        return false;
      });

      if (!hasChanges) {
        console.log(`[CLIENT UPDATE API] No actual changes detected, returning existing client`);
        return res.json(client);
      }

      // Update client data with detailed error handling
      try {
        console.log(`[CLIENT UPDATE API] Final update data being sent to database:`, JSON.stringify(updateData));
        const updatedClient = await storage.updateClient(id, updateData);

        if (!updatedClient) {
          console.error(`[CLIENT UPDATE API] Update operation did not return a client`);
          return res.status(500).json({ 
            message: "Client update operation did not return updated client data",
            clientId: id
          });
        }

        console.log(`[CLIENT UPDATE API] Client updated successfully:`, JSON.stringify(updatedClient));

        // Return the complete updated client data
        res.json(updatedClient);

      } catch (updateError) {
        console.error(`[CLIENT UPDATE API] Database error during client update:`, updateError);
        return res.status(500).json({ 
          message: "Database error during client update", 
          error: String(updateError),
          details: updateError instanceof Error ? updateError.stack : undefined
        });
      }
    } catch (error) {
      console.error("[CLIENT UPDATE API] Error updating client:", error);
      res.status(500).json({ 
        message: "Failed to update client", 
        error: String(error),
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      // First create the user
      const userValidation = validateRequest(insertUserSchema, req.body.user);

      if (!userValidation.success) {
        return res.status(400).json({ message: userValidation.error });
      }

      const user = await storage.createUser(userValidation.data);

      // Then create the client with the user ID
      const clientData = { ...req.body.client, userId: user.id };
      const clientValidation = validateRequest(insertClientSchema, clientData);

      if (!clientValidation.success) {
        return res.status(400).json({ message: clientValidation.error });
      }

      const client = await storage.createClient(clientValidation.data);

      res.status(201).json({ client, user });
    } catch (error) {
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Technician routes
  app.get("/api/technicians", async (_req: Request, res: Response) => {
    try {
      const technicians = await storage.getAllTechnicians();

      // Fetch the associated user for each technician
      const techniciansWithUsers = await Promise.all(
        technicians.map(async (technician) => {
          const user = await storage.getUser(technician.userId);
          return { ...technician, user };
        })
      );

      res.json(techniciansWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  app.get("/api/technicians/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const technicianWithUser = await storage.getTechnicianWithUser(id);

      if (!technicianWithUser) {
        return res.status(404).json({ message: "Technician not found" });
      }

      res.json(technicianWithUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch technician" });
    }
  });

  app.post("/api/technicians", async (req: Request, res: Response) => {
    try {
      // First create the user
      const userValidation = validateRequest(insertUserSchema, req.body.user);

      if (!userValidation.success) {
        return res.status(400).json({ message: userValidation.error });
      }

      const user = await storage.createUser(userValidation.data);

      // Then create the technician with the user ID
      const technicianData = { ...req.body.technician, userId: user.id };
      const technicianValidation = validateRequest(insertTechnicianSchema, technicianData);

      if (!technicianValidation.success) {
        return res.status(400).json({ message: technicianValidation.error });
      }

      const technician = await storage.createTechnician(technicianValidation.data);

      res.status(201).json({ technician, user });
    } catch (error) {
      res.status(500).json({ message: "Failed to create technician" });
    }
  });

  // Project routes
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjects();

      // Fetch additional data for each project
      const projectsWithDetails = await Promise.all(
        projects.map(async (project) => {
          const clientWithUser = await storage.getClientWithUser(project.clientId);
          const assignments = await storage.getProjectAssignments(project.id);

          // Get technician details for each assignment
          const assignmentsWithTechnicians = await Promise.all(
            assignments.map(async (assignment) => {
              const technicianWithUser = await storage.getTechnicianWithUser(assignment.technicianId);
              return { ...assignment, technician: technicianWithUser };
            })
          );

          return {
            ...project,
            client: clientWithUser,
            assignments: assignmentsWithTechnicians
          };
        })
      );

      res.json(projectsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const clientWithUser = await storage.getClientWithUser(project.clientId);
      const assignments = await storage.getProjectAssignments(project.id);

      // Get technician details for each assignment
      const assignmentsWithTechnicians = await Promise.all(
        assignments.map(async (assignment) => {
          const technicianWithUser = await storage.getTechnicianWithUser(assignment.technicianId);
          return { ...assignment, technician: technicianWithUser };
        })
      );

      res.json({
        ...project,
        client: clientWithUser,
        assignments: assignmentsWithTechnicians
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertProjectSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      const project = await storage.createProject(validation.data);

      // If technicians are assigned, create the assignments
      if (req.body.technicianIds && Array.isArray(req.body.technicianIds)) {
        await Promise.all(
          req.body.technicianIds.map(async (techId: number) => {
            await storage.createProjectAssignment({
              projectId: project.id,
              technicianId: techId,
              role: "Member"
            });
          })
        );
      }

      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const updatedProject = await storage.updateProject(id, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Project Phases routes
  app.post("/api/project-phases", async (req: Request, res: Response) => {
    try {
      console.log("[PROJECT PHASE API] - Request body:", JSON.stringify(req.body));
      
      const validation = validateRequest(insertProjectPhaseSchema, req.body);

      if (!validation.success) {
        console.log("[PROJECT PHASE API] - Validation failed:", validation.error);
        return res.status(400).json({ message: validation.error });
      }
      
      console.log("[PROJECT PHASE API] - Validation passed, data:", JSON.stringify(validation.data));

      const phase = await storage.createProjectPhase(validation.data);
      console.log("[PROJECT PHASE API] - Phase created:", JSON.stringify(phase));
      res.status(201).json(phase);
    } catch (error) {
      console.error("[PROJECT PHASE API] - Error creating phase:", error);
      res.status(500).json({ message: "Failed to create project phase" });
    }
  });

  app.get("/api/project-phases/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const phase = await storage.getProjectPhase(id);

      if (!phase) {
        return res.status(404).json({ message: "Project phase not found" });
      }

      res.json(phase);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project phase" });
    }
  });

  app.get("/api/projects/:id/phases", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const phases = await storage.getProjectPhasesByProjectId(projectId);
      res.json(phases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project phases" });
    }
  });

  app.patch("/api/project-phases/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const phase = await storage.getProjectPhase(id);

      if (!phase) {
        return res.status(404).json({ message: "Project phase not found" });
      }

      const updatedPhase = await storage.updateProjectPhase(id, req.body);
      res.json(updatedPhase);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project phase" });
    }
  });

  // Maintenance routes
  app.get("/api/maintenances", async (_req: Request, res: Response) => {
    try {
      const maintenances = await storage.getAllMaintenances();
      
      // Debug logging to understand data discrepancy
      console.log(`[API] getAllMaintenances returned ${maintenances.length} records`);
      const march9Count = maintenances.filter(m => 
        m.scheduleDate === '2025-03-09' || 
        (typeof m.scheduleDate === 'object' && m.scheduleDate !== null && 
         'toISOString' in m.scheduleDate && 
         (m.scheduleDate as Date).toISOString().includes('2025-03-09'))
      ).length;
      console.log(`[API] Found ${march9Count} records for March 9, 2025`);

      // Fetch additional data for each maintenance
      const maintenancesWithDetails = await Promise.all(
        maintenances.map(async (maintenance) => {
          const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
          let technicianWithUser = null;

          if (maintenance.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
          }

          // Make sure schedule_date and scheduleDate are both present for maximum compatibility
          const maintenanceWithBothDateFormats = {
            ...maintenance,
            client: clientWithUser,
            technician: technicianWithUser,
            schedule_date: maintenance.scheduleDate, // Ensure snake_case is present
            scheduleDate: maintenance.scheduleDate   // Ensure camelCase is present
          };

          return maintenanceWithBothDateFormats;
        })
      );

      console.log(`[API] Returning ${maintenancesWithDetails.length} maintenances with details`);
      res.json(maintenancesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenances" });
    }
  });

  app.get("/api/maintenances/upcoming", async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      
      // If clientId is provided, get maintenances for that client
      let upcomingMaintenances;
      if (clientId) {
        console.log(`[API] Getting upcoming maintenances for client ${clientId} within ${days} days`);
        upcomingMaintenances = await storage.getMaintenancesByClientId(clientId);
        
        // Filter to only include future maintenances
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        upcomingMaintenances = upcomingMaintenances.filter(maintenance => {
          const scheduleDate = new Date(maintenance.scheduleDate);
          scheduleDate.setHours(0, 0, 0, 0);
          
          // Calculate days difference
          const diffTime = scheduleDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return diffDays >= 0 && diffDays <= days;
        });
      } else {
        upcomingMaintenances = await storage.getUpcomingMaintenances(days);
      }

      // Fetch additional data for each maintenance
      const maintenancesWithDetails = await Promise.all(
        upcomingMaintenances.map(async (maintenance) => {
          const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
          let technicianWithUser = null;

          if (maintenance.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
          }

          return {
            ...maintenance,
            client: clientWithUser,
            technician: technicianWithUser
          };
        })
      );

      res.json(maintenancesWithDetails);
    } catch (error) {
      console.error("[API] Error fetching upcoming maintenances:", error);
      res.status(500).json({ message: "Failed to fetch upcoming maintenances" });
    }
  });

  app.get("/api/maintenances/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const maintenance = await storage.getMaintenance(id);

      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance not found" });
      }

      const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
      let technicianWithUser = null;

      if (maintenance.technicianId) {
        technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
      }

      res.json({
        ...maintenance,
        client: clientWithUser,
        technician: technicianWithUser
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance" });
    }
  });

  app.post("/api/maintenances", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertMaintenanceSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      const maintenance = await storage.createMaintenance(validation.data);
      res.status(201).json(maintenance);
    } catch (error) {
      res.status(500).json({ message: "Failed to create maintenance" });
    }
  });

  app.patch("/api/maintenances/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const maintenance = await storage.getMaintenance(id);

      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance not found" });
      }

      const updatedMaintenance = await storage.updateMaintenance(id, req.body);
      res.json(updatedMaintenance);
    } catch (error) {
      res.status(500).json({ message: "Failed to update maintenance" });
    }
  });

  // Repair routes
  app.get("/api/repairs", async (_req: Request, res: Response) => {
    try {
      const repairs = await storage.getAllRepairs();

      // Fetch additional data for each repair
      const repairsWithDetails = await Promise.all(
        repairs.map(async (repair) => {
          const clientWithUser = await storage.getClientWithUser(repair.clientId);
          let technicianWithUser = null;

          if (repair.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
          }

          return {
            ...repair,
            client: clientWithUser,
            technician: technicianWithUser
          };
        })
      );

      res.json(repairsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repairs" });
    }
  });

  app.get("/api/repairs/recent", async (req: Request, res: Response) => {
    try {
      const count = parseInt(req.query.count as string) || 5;
      const recentRepairs = await storage.getRecentRepairs(count);

      // Fetch additional data for each repair
      const repairsWithDetails = await Promise.all(
        recentRepairs.map(async (repair) => {
          const clientWithUser = await storage.getClientWithUser(repair.clientId);
          let technicianWithUser = null;

          if (repair.technicianId) {
            technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
          }

          return {
            ...repair,
            client: clientWithUser,
            technician: technicianWithUser
          };
        })
      );

      res.json(repairsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent repairs" });
    }
  });

  app.get("/api/repairs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repair = await storage.getRepair(id);

      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      const clientWithUser = await storage.getClientWithUser(repair.clientId);
      let technicianWithUser = null;

      if (repair.technicianId) {
        technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
      }

      res.json({
        ...repair,
        client: clientWithUser,
        technician: technicianWithUser
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repair" });
    }
  });

  app.post("/api/repairs", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertRepairSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      const repair = await storage.createRepair(validation.data);
      res.status(201).json(repair);
    } catch (error) {
      res.status(500).json({ message: "Failed to create repair" });
    }
  });

  app.patch("/api/repairs/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repair = await storage.getRepair(id);

      if (!repair) {
        return res.status(404).json({ message: "Repair not found" });
      }

      const updatedRepair = await storage.updateRepair(id, req.body);
      res.json(updatedRepair);
    } catch (error) {
      res.status(500).json({ message: "Failed to update repair" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (_req: Request, res: Response) => {
    try {
      const invoices = await storage.getAllInvoices();

      // Fetch additional data for each invoice
      const invoicesWithDetails = await Promise.all(
        invoices.map(async (invoice) => {
          const clientWithUser = await storage.getClientWithUser(invoice.clientId);

          return {
            ...invoice,
            client: clientWithUser
          };
        })
      );

      res.json(invoicesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const clientWithUser = await storage.getClientWithUser(invoice.clientId);

      res.json({
        ...invoice,
        client: clientWithUser
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertInvoiceSchema, req.body);

      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      const invoice = await storage.createInvoice(validation.data);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const updatedInvoice = await storage.updateInvoice(id, req.body);
      res.json(updatedInvoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Dashboard summary route
  // Special endpoint just for contract type updates
  app.post("/api/clients/:id/contract-type", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    const { contractType } = req.body;
    
    console.log(`[CONTRACT TYPE API] Received update request for client ${id} with type "${contractType}"`);
    
    // Normalize and validate
    let validatedType: string | null = null;
    
    if (contractType === null || contractType === undefined || contractType === '') {
      validatedType = null;
    } else {
      const normalizedType = String(contractType).toLowerCase();
      if (!['residential', 'commercial', 'service', 'maintenance'].includes(normalizedType)) {
        return res.status(400).json({ 
          message: `Invalid contract type: ${normalizedType}. Must be one of: residential, commercial, service, maintenance, or null.`
        });
      }
      validatedType = normalizedType;
    }
    
    try {
      // Get current client
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      console.log(`[CONTRACT TYPE API] Current type: "${client.contractType}" -> New type: "${validatedType}"`);
      
      // Direct update to just the contract type
      const updatedClient = await storage.updateClient(id, { contractType: validatedType });
      
      if (!updatedClient) {
        return res.status(500).json({ message: "Failed to update client" });
      }
      
      console.log(`[CONTRACT TYPE API] Update successful, new value: "${updatedClient.contractType}"`);
      res.json(updatedClient);
    } catch (error) {
      console.error("[CONTRACT TYPE API] Error:", error);
      res.status(500).json({ 
        message: "Error updating contract type",
        error: String(error)
      });
    }
  });

  // Pool Equipment endpoints
  app.get("/api/clients/:id/equipment", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const equipment = await storage.getPoolEquipmentByClientId(clientId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching pool equipment:", error);
      res.status(500).json({ message: "Failed to fetch pool equipment" });
    }
  });

  app.post("/api/clients/:id/equipment", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const equipmentData = insertPoolEquipmentSchema.parse({
        ...req.body,
        clientId: clientId
      });

      const newEquipment = await storage.createPoolEquipment(equipmentData);
      res.status(201).json(newEquipment);
    } catch (error) {
      console.error("Error creating pool equipment:", error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          details: validationError.message 
        });
      }
      res.status(500).json({ message: "Failed to create pool equipment" });
    }
  });

  app.patch("/api/pool-equipment/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }

      const updatedEquipment = await storage.updatePoolEquipment(id, req.body);
      if (!updatedEquipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }

      res.json(updatedEquipment);
    } catch (error) {
      console.error("Error updating pool equipment:", error);
      res.status(500).json({ message: "Failed to update pool equipment" });
    }
  });

  // Pool Images endpoints
  app.get("/api/clients/:id/images", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const images = await storage.getPoolImagesByClientId(clientId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching pool images:", error);
      res.status(500).json({ message: "Failed to fetch pool images" });
    }
  });

  app.post("/api/clients/:id/images", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      const imageData = insertPoolImageSchema.parse({
        ...req.body,
        clientId: clientId
      });

      const newImage = await storage.createPoolImage(imageData);
      res.status(201).json(newImage);
    } catch (error) {
      console.error("Error creating pool image:", error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          details: validationError.message 
        });
      }
      res.status(500).json({ message: "Failed to create pool image" });
    }
  });

  // Service Template routes
  app.get("/api/service-templates", async (_req: Request, res: Response) => {
    try {
      const templates = await storage.getAllServiceTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service templates" });
    }
  });
  
  app.get("/api/service-templates/default/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type;
      const template = await storage.getDefaultServiceTemplate(type);
      
      if (!template) {
        return res.status(404).json({ message: "Default template not found for this type" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch default service template" });
    }
  });

  app.get("/api/service-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getServiceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Service template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service template" });
    }
  });

  app.post("/api/service-templates", async (req: Request, res: Response) => {
    try {
      const result = validateRequest(insertServiceTemplateSchema, req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // If setting as default, make sure to include at least one checklist item
      if (req.body.isDefault && (!req.body.checklistItems || req.body.checklistItems.length === 0)) {
        return res.status(400).json({ 
          message: "Default templates must include at least one checklist item" 
        });
      }

      const template = await storage.createServiceTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating service template:", error);
      res.status(500).json({ message: "Failed to create service template" });
    }
  });

  app.patch("/api/service-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getServiceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Service template not found" });
      }
      
      const updatedTemplate = await storage.updateServiceTemplate(id, req.body);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating service template:", error);
      res.status(500).json({ message: "Failed to update service template" });
    }
  });

  app.delete("/api/service-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const success = await storage.deleteServiceTemplate(id);
      if (!success) {
        return res.status(404).json({ message: "Service template not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service template:", error);
      res.status(500).json({ message: "Failed to delete service template" });
    }
  });

  // Chemical Usage endpoints
  app.post("/api/chemical-usage", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertChemicalUsageSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const chemicalUsage = await storage.createChemicalUsage(validation.data);
      res.status(201).json(chemicalUsage);
    } catch (error) {
      console.error("Error creating chemical usage record:", error);
      res.status(500).json({ message: "Failed to create chemical usage record" });
    }
  });
  
  app.get("/api/chemical-usage/maintenance/:maintenanceId", async (req: Request, res: Response) => {
    try {
      const maintenanceId = parseInt(req.params.maintenanceId);
      
      if (isNaN(maintenanceId)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
      }
      
      const chemicalUsages = await storage.getChemicalUsageByMaintenanceId(maintenanceId);
      res.json(chemicalUsages);
    } catch (error) {
      console.error("Error fetching chemical usage records:", error);
      res.status(500).json({ message: "Failed to fetch chemical usage records" });
    }
  });
  
  app.get("/api/chemical-usage/type/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type;
      
      if (!CHEMICAL_TYPES.includes(type as ChemicalType)) {
        return res.status(400).json({ 
          message: "Invalid chemical type",
          validTypes: CHEMICAL_TYPES
        });
      }
      
      const chemicalUsages = await storage.getChemicalUsageByType(type as ChemicalType);
      res.json(chemicalUsages);
    } catch (error) {
      console.error("Error fetching chemical usage by type:", error);
      res.status(500).json({ message: "Failed to fetch chemical usage records" });
    }
  });
  
  // Water Readings endpoints
  app.post("/api/water-readings", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertWaterReadingsSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const waterReading = await storage.createWaterReading(validation.data);
      res.status(201).json(waterReading);
    } catch (error) {
      console.error("Error creating water reading:", error);
      res.status(500).json({ message: "Failed to create water reading" });
    }
  });
  
  app.get("/api/water-readings/maintenance/:maintenanceId", async (req: Request, res: Response) => {
    try {
      const maintenanceId = parseInt(req.params.maintenanceId);
      
      if (isNaN(maintenanceId)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
      }
      
      const waterReadings = await storage.getWaterReadingsByMaintenanceId(maintenanceId);
      res.json(waterReadings);
    } catch (error) {
      console.error("Error fetching water readings:", error);
      res.status(500).json({ message: "Failed to fetch water readings" });
    }
  });
  
  app.get("/api/water-readings/latest/client/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const waterReading = await storage.getLatestWaterReadingByClientId(clientId);
      
      if (!waterReading) {
        return res.status(404).json({ message: "No water readings found for client" });
      }
      
      res.json(waterReading);
    } catch (error) {
      console.error("Error fetching latest water reading:", error);
      res.status(500).json({ message: "Failed to fetch latest water reading" });
    }
  });

  // Communication Provider endpoints
  app.get("/api/communication-providers", async (_req: Request, res: Response) => {
    try {
      const providers = await storage.getAllCommunicationProviders();
      res.status(200).json(providers);
    } catch (error) {
      console.error("Error fetching communication providers:", error);
      res.status(500).json({ message: "Failed to fetch communication providers" });
    }
  });

  app.get("/api/communication-providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const provider = await storage.getCommunicationProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Communication provider not found" });
      }
      
      res.status(200).json(provider);
    } catch (error) {
      console.error("Error fetching communication provider:", error);
      res.status(500).json({ message: "Failed to fetch communication provider" });
    }
  });

  app.get("/api/communication-providers/type/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type as CommunicationProviderType;
      if (!type || !COMMUNICATION_PROVIDER_TYPES.includes(type as any)) {
        return res.status(400).json({ 
          message: "Invalid provider type", 
          validTypes: COMMUNICATION_PROVIDER_TYPES 
        });
      }
      
      const provider = await storage.getCommunicationProviderByType(type);
      if (!provider) {
        return res.status(404).json({ message: `No ${type} provider found` });
      }
      
      res.status(200).json(provider);
    } catch (error) {
      console.error("Error fetching communication provider by type:", error);
      res.status(500).json({ message: "Failed to fetch communication provider" });
    }
  });

  app.get("/api/communication-providers/default/:type", async (req: Request, res: Response) => {
    try {
      const type = req.params.type as CommunicationProviderType;
      if (!type || !COMMUNICATION_PROVIDER_TYPES.includes(type as any)) {
        return res.status(400).json({ 
          message: "Invalid provider type", 
          validTypes: COMMUNICATION_PROVIDER_TYPES 
        });
      }
      
      const provider = await storage.getDefaultCommunicationProvider(type);
      if (!provider) {
        return res.status(404).json({ message: `No default ${type} provider found` });
      }
      
      res.status(200).json(provider);
    } catch (error) {
      console.error("Error fetching default communication provider:", error);
      res.status(500).json({ message: "Failed to fetch default communication provider" });
    }
  });

  app.post("/api/communication-providers", async (req: Request, res: Response) => {
    try {
      // Validate request body using our schema
      const validation = validateRequest(insertCommunicationProviderSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const newProvider = await storage.createCommunicationProvider(validation.data);
      res.status(201).json(newProvider);
    } catch (error) {
      console.error("Error creating communication provider:", error);
      res.status(500).json({ message: "Failed to create communication provider" });
    }
  });

  app.patch("/api/communication-providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      // First get the existing provider
      const provider = await storage.getCommunicationProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Communication provider not found" });
      }
      
      // No need to validate the full schema for a partial update
      // But we should ensure type is valid if included
      if (req.body.type && !COMMUNICATION_PROVIDER_TYPES.includes(req.body.type)) {
        return res.status(400).json({ 
          message: "Invalid provider type", 
          validTypes: COMMUNICATION_PROVIDER_TYPES 
        });
      }
      
      const updatedProvider = await storage.updateCommunicationProvider(id, req.body);
      
      res.status(200).json(updatedProvider);
    } catch (error) {
      console.error("Error updating communication provider:", error);
      res.status(500).json({ message: "Failed to update communication provider" });
    }
  });

  app.delete("/api/communication-providers/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid provider ID" });
      }
      
      const success = await storage.deleteCommunicationProvider(id);
      if (!success) {
        return res.status(404).json({ message: "Communication provider not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting communication provider:", error);
      res.status(500).json({ message: "Failed to delete communication provider" });
    }
  });

  /**
   * Pool Service Routes Operations
   * 
   * IMPORTANT: These endpoints manage "service routes" which represent the scheduled
   * paths that technicians follow to service multiple pool clients.
   * 
   * This is distinct from API routing/HTTP routes which define the server endpoints.
   */
  app.get("/api/service-routes", async (_req: Request, res: Response) => {
    try {
      const routes = await storage.getAllRoutes();
      
      // Fetch assignments for each route
      const routesWithAssignments = await Promise.all(
        routes.map(async (route) => {
          const assignments = await storage.getRouteAssignmentsByRouteId(route.id);
          
          // For each assignment, fetch the maintenance details
          const assignmentsWithMaintenance = await Promise.all(
            assignments.map(async (assignment) => {
              const maintenance = await storage.getMaintenance(assignment.maintenanceId);
              
              if (maintenance) {
                // Get client details
                const client = await storage.getClientWithUser(maintenance.clientId);
                
                // Get technician details if assigned
                let technician = null;
                if (maintenance.technicianId) {
                  technician = await storage.getTechnicianWithUser(maintenance.technicianId);
                }
                
                return {
                  ...assignment,
                  maintenance: {
                    ...maintenance,
                    client,
                    technician
                  }
                };
              }
              
              return assignment;
            })
          );
          
          return {
            ...route,
            assignments: assignmentsWithMaintenance
          };
        })
      );
      
      res.json(routesWithAssignments);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  app.get("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      const route = await storage.getRoute(id);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      console.error("Error fetching route:", error);
      res.status(500).json({ message: "Failed to fetch route" });
    }
  });

  app.post("/api/routes", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertRouteSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const route = await storage.createRoute(validation.data);
      res.status(201).json(route);
    } catch (error) {
      console.error("Error creating route:", error);
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  app.patch("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      const route = await storage.updateRoute(id, req.body);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  app.delete("/api/routes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      const success = await storage.deleteRoute(id);
      if (!success) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  app.get("/api/technicians/:technicianId/routes", async (req: Request, res: Response) => {
    try {
      const technicianId = parseInt(req.params.technicianId);
      if (isNaN(technicianId)) {
        return res.status(400).json({ message: "Invalid technician ID" });
      }
      
      // Verify technician exists
      const technician = await storage.getTechnician(technicianId);
      if (!technician) {
        return res.status(404).json({ message: "Technician not found" });
      }
      
      const routes = await storage.getRoutesByTechnicianId(technicianId);
      res.json(routes);
    } catch (error) {
      console.error("Error fetching routes by technician:", error);
      res.status(500).json({ message: "Failed to fetch routes by technician" });
    }
  });

  app.get("/api/routes/day/:dayOfWeek", async (req: Request, res: Response) => {
    try {
      const { dayOfWeek } = req.params;
      const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      
      if (!validDays.includes(dayOfWeek.toLowerCase())) {
        return res.status(400).json({ message: "Invalid day of week" });
      }
      
      const routes = await storage.getRoutesByDayOfWeek(dayOfWeek.toLowerCase());
      res.json(routes);
    } catch (error) {
      console.error("Error fetching routes by day of week:", error);
      res.status(500).json({ message: "Failed to fetch routes by day of week" });
    }
  });

  app.get("/api/routes/type/:type", async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const validTypes = ["residential", "commercial", "mixed"];
      
      if (!validTypes.includes(type.toLowerCase())) {
        return res.status(400).json({ 
          message: "Invalid route type", 
          validTypes 
        });
      }
      
      const routes = await storage.getRoutesByType(type.toLowerCase());
      res.json(routes);
    } catch (error) {
      console.error("Error fetching routes by type:", error);
      res.status(500).json({ message: "Failed to fetch routes by type" });
    }
  });

  // Route Assignment operations
  app.get("/api/route-assignments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route assignment ID" });
      }
      
      const assignment = await storage.getRouteAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching route assignment:", error);
      res.status(500).json({ message: "Failed to fetch route assignment" });
    }
  });

  app.post("/api/route-assignments", async (req: Request, res: Response) => {
    try {
      const validation = validateRequest(insertRouteAssignmentSchema, req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      
      const assignment = await storage.createRouteAssignment(validation.data);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating route assignment:", error);
      res.status(500).json({ message: "Failed to create route assignment" });
    }
  });

  app.patch("/api/route-assignments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route assignment ID" });
      }
      
      const assignment = await storage.updateRouteAssignment(id, req.body);
      if (!assignment) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      res.json(assignment);
    } catch (error) {
      console.error("Error updating route assignment:", error);
      res.status(500).json({ message: "Failed to update route assignment" });
    }
  });

  app.delete("/api/route-assignments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid route assignment ID" });
      }
      
      const success = await storage.deleteRouteAssignment(id);
      if (!success) {
        return res.status(404).json({ message: "Route assignment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting route assignment:", error);
      res.status(500).json({ message: "Failed to delete route assignment" });
    }
  });

  app.get("/api/routes/:routeId/assignments", async (req: Request, res: Response) => {
    try {
      const routeId = parseInt(req.params.routeId);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      // Verify route exists
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      const assignments = await storage.getRouteAssignmentsByRouteId(routeId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching route assignments by route ID:", error);
      res.status(500).json({ message: "Failed to fetch route assignments by route ID" });
    }
  });

  app.get("/api/maintenances/:maintenanceId/route-assignments", async (req: Request, res: Response) => {
    try {
      const maintenanceId = parseInt(req.params.maintenanceId);
      if (isNaN(maintenanceId)) {
        return res.status(400).json({ message: "Invalid maintenance ID" });
      }
      
      // Verify maintenance exists
      const maintenance = await storage.getMaintenance(maintenanceId);
      if (!maintenance) {
        return res.status(404).json({ message: "Maintenance not found" });
      }
      
      const assignments = await storage.getRouteAssignmentsByMaintenanceId(maintenanceId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching route assignments by maintenance ID:", error);
      res.status(500).json({ message: "Failed to fetch route assignments by maintenance ID" });
    }
  });

  app.post("/api/routes/:routeId/reorder", async (req: Request, res: Response) => {
    try {
      const { assignmentIds } = req.body;
      if (!Array.isArray(assignmentIds)) {
        return res.status(400).json({ message: "Assignment IDs must be an array" });
      }
      
      const routeId = parseInt(req.params.routeId);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }
      
      // Verify route exists
      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      const assignments = await storage.reorderRouteAssignments(routeId, assignmentIds);
      res.json(assignments);
    } catch (error) {
      console.error("Error reordering route assignments:", error);
      res.status(500).json({ message: "Failed to reorder route assignments" });
    }
  });

  app.get("/api/dashboard/summary", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjects();
      const maintenances = await storage.getUpcomingMaintenances(7);
      const repairs = await storage.getRecentRepairs(5);
      const clients = await storage.getAllClients();

      const summary = {
        metrics: {
          activeProjects: projects.filter(p => p.status !== "completed").length,
          maintenanceThisWeek: maintenances.length,
          pendingRepairs: repairs.filter(r => r.status !== "completed").length,
          totalClients: clients.length
        },
        recentProjects: await Promise.all(
          projects
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
            .slice(0, 5)
            .map(async (project) => {
              const clientWithUser = await storage.getClientWithUser(project.clientId);
              const assignments = await storage.getProjectAssignments(project.id);

              return {
                ...project,
                client: clientWithUser,
                assignmentCount: assignments.length
              };
            })
        ),
        upcomingMaintenances: await Promise.all(
          maintenances.slice(0, 5).map(async (maintenance) => {
            const clientWithUser = await storage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;

            if (maintenance.technicianId) {
              technicianWithUser = await storage.getTechnicianWithUser(maintenance.technicianId);
            }

            return {
              ...maintenance,
              client: clientWithUser,
              technician: technicianWithUser
            };
          })
        ),
        recentRepairs: await Promise.all(
          repairs.map(async (repair) => {
            const clientWithUser = await storage.getClientWithUser(repair.clientId);
            let technicianWithUser = null;

            if (repair.technicianId) {
              technicianWithUser = await storage.getTechnicianWithUser(repair.technicianId);
            }

            return {
              ...repair,
              client: clientWithUser,
              technician: technicianWithUser
            };
          })
        )
      };

      res.json(summary);
    } catch (error) {
      console.error("Dashboard summary error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Project Documentation routes
  app.get("/api/projects/:projectId/documents", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const documents = await storage.getProjectDocumentsByProjectId(projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching project documents:", error);
      res.status(500).json({ message: "Failed to fetch project documents" });
    }
  });

  app.get("/api/projects/:projectId/documents/type/:documentType", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const { documentType } = req.params;
      const documents = await storage.getProjectDocumentsByType(projectId, documentType);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching project documents by type:", error);
      res.status(500).json({ message: "Failed to fetch project documents" });
    }
  });

  app.get("/api/phases/:phaseId/documents", async (req: Request, res: Response) => {
    try {
      const phaseId = parseInt(req.params.phaseId);
      if (isNaN(phaseId)) {
        return res.status(400).json({ message: "Invalid phase ID" });
      }

      const documents = await storage.getProjectDocumentsByPhaseId(phaseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching phase documents:", error);
      res.status(500).json({ message: "Failed to fetch phase documents" });
    }
  });

  app.get("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const document = await storage.getProjectDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/projects/:projectId/documents", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Validate project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate document data
      const documentData = { ...req.body, projectId };
      const validation = validateRequest(insertProjectDocumentationSchema, documentData);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }

      // Create document
      const document = await storage.createProjectDocument(validation.data);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating project document:", error);
      res.status(500).json({ message: "Failed to create project document" });
    }
  });

  app.patch("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Check document exists
      const document = await storage.getProjectDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Update document
      const updatedDocument = await storage.updateProjectDocument(id, req.body);
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Check document exists
      const document = await storage.getProjectDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete document
      const success = await storage.deleteProjectDocument(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete document" });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Business Module Routes
  
  // Business Dashboard
  app.get("/api/business/dashboard", async (_req: Request, res: Response) => {
    try {
      // Dashboard summary data with placeholder data
      const metrics = {
        totalRevenue: 45231.89,
        expenses: 12756.42,
        profit: 32475.47,
        profitMargin: 71.8,
        // pendingPayroll field removed
        inventoryValue: 32156.90,
        lowStockItems: 7,
        outstandingInvoices: 12
      };
      
      const recentExpenses = [
        { id: 1, date: "2025-02-25", amount: 235.50, category: "supplies", description: "Chlorine tablets", paymentMethod: "credit_card", receiptUrl: null, notes: "Monthly stock", createdAt: "2025-02-25T14:32:00Z" },
        { id: 2, date: "2025-02-22", amount: 890.00, category: "equipment", description: "Replacement pump", paymentMethod: "check", receiptUrl: "receipts/pump-28923.pdf", notes: "For Johnson project", createdAt: "2025-02-22T09:45:00Z" },
        { id: 3, date: "2025-02-20", amount: 125.75, category: "office", description: "Office supplies", paymentMethod: "credit_card", receiptUrl: null, notes: "Paper, ink, etc", createdAt: "2025-02-20T16:10:00Z" }
      ];
      
      // Payroll data has been removed
      
      const lowStockItems = [
        { id: 1, name: "Chlorine tablets", category: "chemicals", currentStock: 5, minimumStock: 10, unit: "bucket", unitPrice: 89.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-15", notes: "Need to reorder", createdAt: "2024-10-15T08:30:00Z" },
        { id: 2, name: "pH Plus", category: "chemicals", currentStock: 3, minimumStock: 8, unit: "gallon", unitPrice: 24.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-28", notes: "Order more next week", createdAt: "2024-10-15T08:35:00Z" }
      ];
      
      const recentTimeEntries = [
        { id: 1, userId: 3, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - framing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:00:00Z" },
        { id: 2, userId: 4, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - plumbing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:05:00Z" },
        { id: 3, userId: 2, projectId: 3, date: "2025-03-01", hoursWorked: 6, description: "Maintenance route - north", status: "approved", approvedBy: 1, notes: "Completed 8 service calls", createdAt: "2025-03-01T15:30:00Z" }
      ];
      
      res.json({
        metrics,
        recentExpenses,
        lowStockItems,
        recentTimeEntries
      });
    } catch (error) {
      console.error("Error fetching business dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch business dashboard data" });
    }
  });

  // Expenses routes
  app.get("/api/business/expenses", async (_req: Request, res: Response) => {
    try {
      // Return placeholder expenses data
      const expenses = [
        { id: 1, date: "2025-02-25", amount: 235.50, category: "supplies", description: "Chlorine tablets", paymentMethod: "credit_card", receiptUrl: null, notes: "Monthly stock", createdAt: "2025-02-25T14:32:00Z" },
        { id: 2, date: "2025-02-22", amount: 890.00, category: "equipment", description: "Replacement pump", paymentMethod: "check", receiptUrl: "receipts/pump-28923.pdf", notes: "For Johnson project", createdAt: "2025-02-22T09:45:00Z" },
        { id: 3, date: "2025-02-20", amount: 125.75, category: "office", description: "Office supplies", paymentMethod: "credit_card", receiptUrl: null, notes: "Paper, ink, etc", createdAt: "2025-02-20T16:10:00Z" },
        { id: 4, date: "2025-02-15", amount: 450.00, category: "vehicle", description: "Truck maintenance", paymentMethod: "credit_card", receiptUrl: "receipts/truck-service.pdf", notes: "Oil change and tune-up", createdAt: "2025-02-15T11:20:00Z" },
        { id: 5, date: "2025-02-10", amount: 1200.00, category: "insurance", description: "Liability insurance", paymentMethod: "bank_transfer", receiptUrl: "receipts/insurance-feb.pdf", notes: "Monthly premium", createdAt: "2025-02-10T09:00:00Z" }
      ];
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/business/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder expense data for the given ID
      const expenses = [
        { id: 1, date: "2025-02-25", amount: 235.50, category: "supplies", description: "Chlorine tablets", paymentMethod: "credit_card", receiptUrl: null, notes: "Monthly stock", createdAt: "2025-02-25T14:32:00Z" },
        { id: 2, date: "2025-02-22", amount: 890.00, category: "equipment", description: "Replacement pump", paymentMethod: "check", receiptUrl: "receipts/pump-28923.pdf", notes: "For Johnson project", createdAt: "2025-02-22T09:45:00Z" },
        { id: 3, date: "2025-02-20", amount: 125.75, category: "office", description: "Office supplies", paymentMethod: "credit_card", receiptUrl: null, notes: "Paper, ink, etc", createdAt: "2025-02-20T16:10:00Z" },
        { id: 4, date: "2025-02-15", amount: 450.00, category: "vehicle", description: "Truck maintenance", paymentMethod: "credit_card", receiptUrl: "receipts/truck-service.pdf", notes: "Oil change and tune-up", createdAt: "2025-02-15T11:20:00Z" },
        { id: 5, date: "2025-02-10", amount: 1200.00, category: "insurance", description: "Liability insurance", paymentMethod: "bank_transfer", receiptUrl: "receipts/insurance-feb.pdf", notes: "Monthly premium", createdAt: "2025-02-10T09:00:00Z" }
      ];
      
      const expense = expenses.find(e => e.id === id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/business/expenses", async (req: Request, res: Response) => {
    try {
      // Create a new expense with a generated ID and return it
      const newExpense = {
        id: 6, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(newExpense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/business/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated expense
      const updatedExpense = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedExpense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete("/api/business/expenses/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Payroll routes removed

  // Time Entry routes
  app.get("/api/business/time-entries", async (_req: Request, res: Response) => {
    try {
      // Return placeholder time entries
      const timeEntries = [
        { id: 1, userId: 3, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - framing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:00:00Z" },
        { id: 2, userId: 4, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - plumbing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:05:00Z" },
        { id: 3, userId: 2, projectId: 3, date: "2025-03-01", hoursWorked: 6, description: "Maintenance route - north", status: "approved", approvedBy: 1, notes: "Completed 8 service calls", createdAt: "2025-03-01T15:30:00Z" },
        { id: 4, userId: 3, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:00:00Z" },
        { id: 5, userId: 4, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:05:00Z" }
      ];
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get("/api/business/time-entries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder time entry for given ID
      const timeEntries = [
        { id: 1, userId: 3, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - framing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:00:00Z" },
        { id: 2, userId: 4, projectId: 1, date: "2025-03-01", hoursWorked: 8, description: "Pool installation - plumbing", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-03-01T17:05:00Z" },
        { id: 3, userId: 2, projectId: 3, date: "2025-03-01", hoursWorked: 6, description: "Maintenance route - north", status: "approved", approvedBy: 1, notes: "Completed 8 service calls", createdAt: "2025-03-01T15:30:00Z" },
        { id: 4, userId: 3, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:00:00Z" },
        { id: 5, userId: 4, projectId: 1, date: "2025-02-28", hoursWorked: 8, description: "Pool installation - excavation", status: "approved", approvedBy: 1, notes: null, createdAt: "2025-02-28T17:05:00Z" }
      ];
      
      const timeEntry = timeEntries.find(e => e.id === id);
      
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      res.json(timeEntry);
    } catch (error) {
      console.error("Error fetching time entry:", error);
      res.status(500).json({ message: "Failed to fetch time entry" });
    }
  });

  app.post("/api/business/time-entries", async (req: Request, res: Response) => {
    try {
      // Create a new time entry with a generated ID and return it
      const newTimeEntry = {
        id: 6, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(newTimeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.patch("/api/business/time-entries/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated time entry
      const updatedTimeEntry = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedTimeEntry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.delete("/api/business/time-entries/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Financial Report routes
  app.get("/api/business/reports", async (_req: Request, res: Response) => {
    try {
      // Return placeholder financial reports
      const reports = [
        { id: 1, title: "Monthly P&L", type: "profit_loss", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({revenue: 45231.89, expenses: 12756.42, profit: 32475.47, profitMargin: 71.8}), status: "approved", createdBy: 1, createdAt: "2025-03-01T09:00:00Z", updatedAt: "2025-03-01T09:00:00Z" },
        { id: 2, title: "Q1 Cash Flow", type: "cash_flow", period: "2025-01-01 to 2025-03-31", data: JSON.stringify({startingBalance: 125000.00, endingBalance: 142750.89, inflows: 87500.00, outflows: 69749.11}), status: "draft", createdBy: 1, createdAt: "2025-03-01T10:30:00Z", updatedAt: "2025-03-01T10:30:00Z" },
        { id: 3, title: "Revenue by Service Type", type: "custom", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({categories: ["Maintenance", "Repairs", "Installations"], values: [22450.00, 8750.00, 14031.89]}), status: "approved", createdBy: 1, createdAt: "2025-03-01T11:15:00Z", updatedAt: "2025-03-01T11:15:00Z" }
      ];
      res.json(reports);
    } catch (error) {
      console.error("Error fetching financial reports:", error);
      res.status(500).json({ message: "Failed to fetch financial reports" });
    }
  });
  
  // Pool Reports endpoints
  app.get("/api/business/pool-reports", async (_req: Request, res: Response) => {
    try {
      // Return placeholder pool reports
      const reports = [
        { 
          id: 1, 
          name: "Monthly Water Chemistry Analysis", 
          type: "water_chemistry", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "monthly", 
          lastRun: "2025-03-01T08:00:00Z",
          isPublic: true 
        },
        { 
          id: 2, 
          name: "Quarterly Chemical Usage Trends", 
          type: "chemical_usage", 
          startDate: "2025-01-01T00:00:00Z", 
          endDate: "2025-03-31T23:59:59Z", 
          schedule: "quarterly",
          lastRun: null,
          isPublic: false 
        },
        { 
          id: 3, 
          name: "Pool Equipment Performance", 
          type: "equipment_performance", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "on_demand",
          lastRun: null,
          isPublic: false 
        }
      ];
      res.json(reports);
    } catch (error) {
      console.error("Error fetching pool reports:", error);
      res.status(500).json({ message: "Failed to fetch pool reports" });
    }
  });
  
  app.get("/api/business/pool-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder pool report for given ID
      const reports = [
        { 
          id: 1, 
          name: "Monthly Water Chemistry Analysis", 
          type: "water_chemistry", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "monthly", 
          description: "Comprehensive analysis of water chemistry trends for all clients",
          lastRun: "2025-03-01T08:00:00Z",
          isPublic: true 
        },
        { 
          id: 2, 
          name: "Quarterly Chemical Usage Trends", 
          type: "chemical_usage", 
          startDate: "2025-01-01T00:00:00Z", 
          endDate: "2025-03-31T23:59:59Z", 
          schedule: "quarterly",
          description: "Analysis of chemical usage by type across all clients",
          lastRun: null,
          isPublic: false 
        },
        { 
          id: 3, 
          name: "Pool Equipment Performance", 
          type: "equipment_performance", 
          startDate: "2025-02-01T00:00:00Z", 
          endDate: "2025-02-28T23:59:59Z", 
          schedule: "on_demand",
          description: "Equipment efficiency and maintenance needs report",
          lastRun: null,
          isPublic: false 
        }
      ];
      
      const report = reports.find(r => r.id === id);
      
      if (!report) {
        return res.status(404).json({ message: "Pool report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching pool report:", error);
      res.status(500).json({ message: "Failed to fetch pool report" });
    }
  });
  
  app.post("/api/business/pool-reports", async (req: Request, res: Response) => {
    try {
      // This would normally validate and create a new report
      const newReport = {
        id: 4, // This would normally be generated
        ...req.body,
        lastRun: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newReport);
    } catch (error) {
      console.error("Error creating pool report:", error);
      res.status(500).json({ message: "Failed to create pool report" });
    }
  });
  
  app.patch("/api/business/pool-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // This would normally validate, find and update the report
      const updatedReport = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating pool report:", error);
      res.status(500).json({ message: "Failed to update pool report" });
    }
  });
  
  app.delete("/api/business/pool-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // This would normally delete the report
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pool report:", error);
      res.status(500).json({ message: "Failed to delete pool report" });
    }
  });

  app.get("/api/business/reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder financial report for given ID
      const reports = [
        { id: 1, title: "Monthly P&L", type: "profit_loss", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({revenue: 45231.89, expenses: 12756.42, profit: 32475.47, profitMargin: 71.8}), status: "approved", createdBy: 1, createdAt: "2025-03-01T09:00:00Z", updatedAt: "2025-03-01T09:00:00Z" },
        { id: 2, title: "Q1 Cash Flow", type: "cash_flow", period: "2025-01-01 to 2025-03-31", data: JSON.stringify({startingBalance: 125000.00, endingBalance: 142750.89, inflows: 87500.00, outflows: 69749.11}), status: "draft", createdBy: 1, createdAt: "2025-03-01T10:30:00Z", updatedAt: "2025-03-01T10:30:00Z" },
        { id: 3, title: "Revenue by Service Type", type: "custom", period: "2025-02-01 to 2025-02-28", data: JSON.stringify({categories: ["Maintenance", "Repairs", "Installations"], values: [22450.00, 8750.00, 14031.89]}), status: "approved", createdBy: 1, createdAt: "2025-03-01T11:15:00Z", updatedAt: "2025-03-01T11:15:00Z" }
      ];
      
      const report = reports.find(r => r.id === id);
      
      if (!report) {
        return res.status(404).json({ message: "Financial report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching financial report:", error);
      res.status(500).json({ message: "Failed to fetch financial report" });
    }
  });

  app.post("/api/business/reports", async (req: Request, res: Response) => {
    try {
      // Create a new financial report with a generated ID and return it
      const newReport = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newReport);
    } catch (error) {
      console.error("Error creating financial report:", error);
      res.status(500).json({ message: "Failed to create financial report" });
    }
  });

  app.patch("/api/business/reports/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated financial report
      const updatedReport = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating financial report:", error);
      res.status(500).json({ message: "Failed to update financial report" });
    }
  });

  app.delete("/api/business/reports/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting financial report:", error);
      res.status(500).json({ message: "Failed to delete financial report" });
    }
  });

  // Vendor routes
  app.get("/api/business/vendors", async (_req: Request, res: Response) => {
    try {
      // Return placeholder vendors
      const vendors = [
        { id: 1, name: "Pool Supply Co.", category: "chemicals", contactName: "John Smith", email: "john@poolsupply.com", phone: "555-123-4567", address: "123 Main St, Anytown, CA 90210", paymentTerms: "net_30", notes: "Preferred supplier for chemicals", createdAt: "2024-10-01T00:00:00Z", updatedAt: "2024-10-01T00:00:00Z" },
        { id: 2, name: "Premium Pumps Inc.", category: "equipment", contactName: "Sarah Johnson", email: "sarah@premiumpumps.com", phone: "555-987-6543", address: "456 Oak St, Somewhere, CA 90211", paymentTerms: "net_15", notes: "Quality pump equipment", createdAt: "2024-10-02T00:00:00Z", updatedAt: "2024-10-02T00:00:00Z" },
        { id: 3, name: "Poolside Accessories", category: "accessories", contactName: "Mike Wilson", email: "mike@poolsideacc.com", phone: "555-456-7890", address: "789 Pine St, Nowhere, CA 90212", paymentTerms: "net_30", notes: "Wide range of pool accessories", createdAt: "2024-10-03T00:00:00Z", updatedAt: "2024-10-03T00:00:00Z" }
      ];
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/business/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder vendor for given ID
      const vendors = [
        { id: 1, name: "Pool Supply Co.", category: "chemicals", contactName: "John Smith", email: "john@poolsupply.com", phone: "555-123-4567", address: "123 Main St, Anytown, CA 90210", paymentTerms: "net_30", notes: "Preferred supplier for chemicals", createdAt: "2024-10-01T00:00:00Z", updatedAt: "2024-10-01T00:00:00Z" },
        { id: 2, name: "Premium Pumps Inc.", category: "equipment", contactName: "Sarah Johnson", email: "sarah@premiumpumps.com", phone: "555-987-6543", address: "456 Oak St, Somewhere, CA 90211", paymentTerms: "net_15", notes: "Quality pump equipment", createdAt: "2024-10-02T00:00:00Z", updatedAt: "2024-10-02T00:00:00Z" },
        { id: 3, name: "Poolside Accessories", category: "accessories", contactName: "Mike Wilson", email: "mike@poolsideacc.com", phone: "555-456-7890", address: "789 Pine St, Nowhere, CA 90212", paymentTerms: "net_30", notes: "Wide range of pool accessories", createdAt: "2024-10-03T00:00:00Z", updatedAt: "2024-10-03T00:00:00Z" }
      ];
      
      const vendor = vendors.find(v => v.id === id);
      
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/business/vendors", async (req: Request, res: Response) => {
    try {
      // Create a new vendor with a generated ID and return it
      const newVendor = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newVendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/business/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated vendor
      const updatedVendor = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedVendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  app.delete("/api/business/vendors/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  });

  // Purchase Order routes
  app.get("/api/business/purchase-orders", async (_req: Request, res: Response) => {
    try {
      // Return placeholder purchase orders
      const purchaseOrders = [
        { id: 1, vendorId: 1, orderedBy: 1, orderDate: "2025-02-25", status: "completed", totalAmount: 1245.75, items: JSON.stringify([{name: "Chlorine tablets", quantity: 10, unitPrice: 89.99}, {name: "pH Plus", quantity: 8, unitPrice: 24.99}]), deliveryDate: "2025-03-01", notes: "Regular monthly order", createdAt: "2025-02-25T09:00:00Z", updatedAt: "2025-03-01T14:00:00Z" },
        { id: 2, vendorId: 2, orderedBy: 1, orderDate: "2025-02-28", status: "pending", totalAmount: 2150.00, items: JSON.stringify([{name: "SuperFlo VS Pump", quantity: 1, unitPrice: 1250.00}, {name: "Cartridge Filter", quantity: 1, unitPrice: 900.00}]), deliveryDate: null, notes: "For Johnson installation", createdAt: "2025-02-28T10:30:00Z", updatedAt: "2025-02-28T10:30:00Z" },
        { id: 3, vendorId: 3, orderedBy: 1, orderDate: "2025-02-20", status: "completed", totalAmount: 435.85, items: JSON.stringify([{name: "Leaf skimmer", quantity: 3, unitPrice: 45.95}, {name: "Pool brush", quantity: 4, unitPrice: 35.50}, {name: "Test kit", quantity: 2, unitPrice: 89.00}]), deliveryDate: "2025-02-23", notes: "Restocking supplies", createdAt: "2025-02-20T14:15:00Z", updatedAt: "2025-02-23T11:00:00Z" }
      ];
      res.json(purchaseOrders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.get("/api/business/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder purchase order for given ID
      const purchaseOrders = [
        { id: 1, vendorId: 1, orderedBy: 1, orderDate: "2025-02-25", status: "completed", totalAmount: 1245.75, items: JSON.stringify([{name: "Chlorine tablets", quantity: 10, unitPrice: 89.99}, {name: "pH Plus", quantity: 8, unitPrice: 24.99}]), deliveryDate: "2025-03-01", notes: "Regular monthly order", createdAt: "2025-02-25T09:00:00Z", updatedAt: "2025-03-01T14:00:00Z" },
        { id: 2, vendorId: 2, orderedBy: 1, orderDate: "2025-02-28", status: "pending", totalAmount: 2150.00, items: JSON.stringify([{name: "SuperFlo VS Pump", quantity: 1, unitPrice: 1250.00}, {name: "Cartridge Filter", quantity: 1, unitPrice: 900.00}]), deliveryDate: null, notes: "For Johnson installation", createdAt: "2025-02-28T10:30:00Z", updatedAt: "2025-02-28T10:30:00Z" },
        { id: 3, vendorId: 3, orderedBy: 1, orderDate: "2025-02-20", status: "completed", totalAmount: 435.85, items: JSON.stringify([{name: "Leaf skimmer", quantity: 3, unitPrice: 45.95}, {name: "Pool brush", quantity: 4, unitPrice: 35.50}, {name: "Test kit", quantity: 2, unitPrice: 89.00}]), deliveryDate: "2025-02-23", notes: "Restocking supplies", createdAt: "2025-02-20T14:15:00Z", updatedAt: "2025-02-23T11:00:00Z" }
      ];
      
      const purchaseOrder = purchaseOrders.find(po => po.id === id);
      
      if (!purchaseOrder) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      
      res.json(purchaseOrder);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.post("/api/business/purchase-orders", async (req: Request, res: Response) => {
    try {
      // Create a new purchase order with a generated ID and return it
      const newPurchaseOrder = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newPurchaseOrder);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.patch("/api/business/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated purchase order
      const updatedPurchaseOrder = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedPurchaseOrder);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  app.delete("/api/business/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase order:", error);
      res.status(500).json({ message: "Failed to delete purchase order" });
    }
  });

  // Inventory routes
  app.get("/api/business/inventory", async (_req: Request, res: Response) => {
    try {
      // Return placeholder inventory items
      const inventoryItems = [
        { id: 1, name: "Chlorine tablets", category: "chemicals", currentStock: 5, minimumStock: 10, unit: "bucket", unitPrice: 89.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-15", notes: "Need to reorder", createdAt: "2024-10-15T08:30:00Z", updatedAt: "2025-02-25T14:32:00Z" },
        { id: 2, name: "pH Plus", category: "chemicals", currentStock: 3, minimumStock: 8, unit: "gallon", unitPrice: 24.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-28", notes: "Order more next week", createdAt: "2024-10-15T08:35:00Z", updatedAt: "2025-02-25T14:35:00Z" },
        { id: 3, name: "SuperFlo VS Pump", category: "equipment", currentStock: 2, minimumStock: 1, unit: "each", unitPrice: 1250.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:40:00Z", updatedAt: "2025-01-10T11:20:00Z" },
        { id: 4, name: "Cartridge Filter", category: "equipment", currentStock: 3, minimumStock: 2, unit: "each", unitPrice: 900.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:45:00Z", updatedAt: "2025-01-10T11:25:00Z" },
        { id: 5, name: "Leaf skimmer", category: "accessories", currentStock: 8, minimumStock: 5, unit: "each", unitPrice: 45.95, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:50:00Z", updatedAt: "2025-02-20T14:15:00Z" },
        { id: 6, name: "Pool brush", category: "accessories", currentStock: 12, minimumStock: 4, unit: "each", unitPrice: 35.50, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:55:00Z", updatedAt: "2025-02-20T14:20:00Z" },
        { id: 7, name: "Test kit", category: "accessories", currentStock: 7, minimumStock: 3, unit: "each", unitPrice: 89.00, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T09:00:00Z", updatedAt: "2025-02-20T14:25:00Z" }
      ];
      res.json(inventoryItems);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/business/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder inventory item for given ID
      const inventoryItems = [
        { id: 1, name: "Chlorine tablets", category: "chemicals", currentStock: 5, minimumStock: 10, unit: "bucket", unitPrice: 89.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-15", notes: "Need to reorder", createdAt: "2024-10-15T08:30:00Z", updatedAt: "2025-02-25T14:32:00Z" },
        { id: 2, name: "pH Plus", category: "chemicals", currentStock: 3, minimumStock: 8, unit: "gallon", unitPrice: 24.99, supplierInfo: "Pool Supply Co.", lastOrderDate: "2025-01-28", notes: "Order more next week", createdAt: "2024-10-15T08:35:00Z", updatedAt: "2025-02-25T14:35:00Z" },
        { id: 3, name: "SuperFlo VS Pump", category: "equipment", currentStock: 2, minimumStock: 1, unit: "each", unitPrice: 1250.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:40:00Z", updatedAt: "2025-01-10T11:20:00Z" },
        { id: 4, name: "Cartridge Filter", category: "equipment", currentStock: 3, minimumStock: 2, unit: "each", unitPrice: 900.00, supplierInfo: "Premium Pumps Inc.", lastOrderDate: "2025-01-10", notes: null, createdAt: "2024-10-15T08:45:00Z", updatedAt: "2025-01-10T11:25:00Z" },
        { id: 5, name: "Leaf skimmer", category: "accessories", currentStock: 8, minimumStock: 5, unit: "each", unitPrice: 45.95, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:50:00Z", updatedAt: "2025-02-20T14:15:00Z" },
        { id: 6, name: "Pool brush", category: "accessories", currentStock: 12, minimumStock: 4, unit: "each", unitPrice: 35.50, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T08:55:00Z", updatedAt: "2025-02-20T14:20:00Z" },
        { id: 7, name: "Test kit", category: "accessories", currentStock: 7, minimumStock: 3, unit: "each", unitPrice: 89.00, supplierInfo: "Poolside Accessories", lastOrderDate: "2025-02-20", notes: null, createdAt: "2024-10-15T09:00:00Z", updatedAt: "2025-02-20T14:25:00Z" }
      ];
      
      const inventoryItem = inventoryItems.find(item => item.id === id);
      
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      
      res.json(inventoryItem);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/business/inventory", async (req: Request, res: Response) => {
    try {
      // Create a new inventory item with a generated ID and return it
      const newInventoryItem = {
        id: 8, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newInventoryItem);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/business/inventory/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated inventory item
      const updatedInventoryItem = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedInventoryItem);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/business/inventory/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Licenses routes
  app.get("/api/business/licenses", async (_req: Request, res: Response) => {
    try {
      // Return placeholder licenses data
      const licenses = [
        { 
          id: 1, 
          name: "Business Operation License", 
          licenseNumber: "BUS-12345-2025", 
          issueDate: "2025-01-15", 
          expiryDate: "2026-01-14", 
          issuingAuthority: "City of Sunnyvale", 
          status: "active", 
          documentUrl: "licenses/business-license-2025.pdf", 
          notes: "Main business license",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T10:30:00Z",
          updatedAt: "2025-01-15T10:30:00Z"
        },
        { 
          id: 2, 
          name: "Pool Contractor License", 
          licenseNumber: "PCL-78901-2025", 
          issueDate: "2025-02-01", 
          expiryDate: "2026-01-31", 
          issuingAuthority: "State Pool Contractors Board", 
          status: "active", 
          documentUrl: "licenses/contractor-license-2025.pdf", 
          notes: "State-level contractor license",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:45:00Z",
          updatedAt: "2025-02-01T11:45:00Z"
        },
        { 
          id: 3, 
          name: "Chemical Handling Certification", 
          licenseNumber: "CHC-56789-2025", 
          issueDate: "2025-03-10", 
          expiryDate: "2027-03-09", 
          issuingAuthority: "Chemical Safety Board", 
          status: "active", 
          documentUrl: "licenses/chemical-cert-2025.pdf", 
          notes: "Required for handling pool chemicals",
          reminderDate: "2027-02-10",
          createdAt: "2025-03-10T09:20:00Z",
          updatedAt: "2025-03-10T09:20:00Z"
        }
      ];
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.get("/api/business/licenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder license for given ID
      const licenses = [
        { 
          id: 1, 
          name: "Business Operation License", 
          licenseNumber: "BUS-12345-2025", 
          issueDate: "2025-01-15", 
          expiryDate: "2026-01-14", 
          issuingAuthority: "City of Sunnyvale", 
          status: "active", 
          documentUrl: "licenses/business-license-2025.pdf", 
          notes: "Main business license",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T10:30:00Z",
          updatedAt: "2025-01-15T10:30:00Z"
        },
        { 
          id: 2, 
          name: "Pool Contractor License", 
          licenseNumber: "PCL-78901-2025", 
          issueDate: "2025-02-01", 
          expiryDate: "2026-01-31", 
          issuingAuthority: "State Pool Contractors Board", 
          status: "active", 
          documentUrl: "licenses/contractor-license-2025.pdf", 
          notes: "State-level contractor license",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:45:00Z",
          updatedAt: "2025-02-01T11:45:00Z"
        },
        { 
          id: 3, 
          name: "Chemical Handling Certification", 
          licenseNumber: "CHC-56789-2025", 
          issueDate: "2025-03-10", 
          expiryDate: "2027-03-09", 
          issuingAuthority: "Chemical Safety Board", 
          status: "active", 
          documentUrl: "licenses/chemical-cert-2025.pdf", 
          notes: "Required for handling pool chemicals",
          reminderDate: "2027-02-10",
          createdAt: "2025-03-10T09:20:00Z",
          updatedAt: "2025-03-10T09:20:00Z"
        }
      ];
      
      const license = licenses.find(l => l.id === id);
      
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }
      
      res.json(license);
    } catch (error) {
      console.error("Error fetching license:", error);
      res.status(500).json({ message: "Failed to fetch license" });
    }
  });

  app.post("/api/business/licenses", async (req: Request, res: Response) => {
    try {
      // Create a new license with a generated ID and return it
      const newLicense = {
        id: 4, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newLicense);
    } catch (error) {
      console.error("Error creating license:", error);
      res.status(500).json({ message: "Failed to create license" });
    }
  });

  app.patch("/api/business/licenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated license
      const updatedLicense = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedLicense);
    } catch (error) {
      console.error("Error updating license:", error);
      res.status(500).json({ message: "Failed to update license" });
    }
  });

  app.delete("/api/business/licenses/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting license:", error);
      res.status(500).json({ message: "Failed to delete license" });
    }
  });

  // Insurance routes
  app.get("/api/business/insurance", async (_req: Request, res: Response) => {
    try {
      // Return placeholder insurance data
      const insurancePolicies = [
        { 
          id: 1, 
          name: "General Liability Insurance", 
          policyNumber: "GLI-98765-2025", 
          provider: "SafeGuard Insurance Co.", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 2000000.00, 
          premium: 4800.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/liability-policy-2025.pdf", 
          notes: "Covers general business liability",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T09:00:00Z",
          updatedAt: "2025-01-01T09:00:00Z"
        },
        { 
          id: 2, 
          name: "Workers' Compensation", 
          policyNumber: "WCI-54321-2025", 
          provider: "WorkSafe Insurance", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 1000000.00, 
          premium: 6200.00, 
          paymentFrequency: "quarterly",
          status: "active", 
          documentUrl: "insurance/workers-comp-2025.pdf", 
          notes: "Required workers' compensation coverage",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T10:15:00Z",
          updatedAt: "2025-01-01T10:15:00Z"
        },
        { 
          id: 3, 
          name: "Commercial Auto Insurance", 
          policyNumber: "CAI-12345-2025", 
          provider: "AutoProtect Insurance", 
          startDate: "2025-01-15", 
          endDate: "2026-01-14", 
          coverageAmount: 500000.00, 
          premium: 3200.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/auto-policy-2025.pdf", 
          notes: "Covers all company vehicles",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T14:30:00Z",
          updatedAt: "2025-01-15T14:30:00Z"
        },
        { 
          id: 4, 
          name: "Equipment Insurance", 
          policyNumber: "EQI-67890-2025", 
          provider: "ToolSafe Insurance", 
          startDate: "2025-02-01", 
          endDate: "2026-01-31", 
          coverageAmount: 250000.00, 
          premium: 1800.00, 
          paymentFrequency: "annually",
          status: "active", 
          documentUrl: "insurance/equipment-policy-2025.pdf", 
          notes: "Covers all pool service equipment",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:00:00Z",
          updatedAt: "2025-02-01T11:00:00Z"
        }
      ];
      res.json(insurancePolicies);
    } catch (error) {
      console.error("Error fetching insurance policies:", error);
      res.status(500).json({ message: "Failed to fetch insurance policies" });
    }
  });

  app.get("/api/business/insurance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return placeholder insurance policy for given ID
      const insurancePolicies = [
        { 
          id: 1, 
          name: "General Liability Insurance", 
          policyNumber: "GLI-98765-2025", 
          provider: "SafeGuard Insurance Co.", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 2000000.00, 
          premium: 4800.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/liability-policy-2025.pdf", 
          notes: "Covers general business liability",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T09:00:00Z",
          updatedAt: "2025-01-01T09:00:00Z"
        },
        { 
          id: 2, 
          name: "Workers' Compensation", 
          policyNumber: "WCI-54321-2025", 
          provider: "WorkSafe Insurance", 
          startDate: "2025-01-01", 
          endDate: "2025-12-31", 
          coverageAmount: 1000000.00, 
          premium: 6200.00, 
          paymentFrequency: "quarterly",
          status: "active", 
          documentUrl: "insurance/workers-comp-2025.pdf", 
          notes: "Required workers' compensation coverage",
          reminderDate: "2025-12-01",
          createdAt: "2025-01-01T10:15:00Z",
          updatedAt: "2025-01-01T10:15:00Z"
        },
        { 
          id: 3, 
          name: "Commercial Auto Insurance", 
          policyNumber: "CAI-12345-2025", 
          provider: "AutoProtect Insurance", 
          startDate: "2025-01-15", 
          endDate: "2026-01-14", 
          coverageAmount: 500000.00, 
          premium: 3200.00, 
          paymentFrequency: "monthly",
          status: "active", 
          documentUrl: "insurance/auto-policy-2025.pdf", 
          notes: "Covers all company vehicles",
          reminderDate: "2025-12-15",
          createdAt: "2025-01-15T14:30:00Z",
          updatedAt: "2025-01-15T14:30:00Z"
        },
        { 
          id: 4, 
          name: "Equipment Insurance", 
          policyNumber: "EQI-67890-2025", 
          provider: "ToolSafe Insurance", 
          startDate: "2025-02-01", 
          endDate: "2026-01-31", 
          coverageAmount: 250000.00, 
          premium: 1800.00, 
          paymentFrequency: "annually",
          status: "active", 
          documentUrl: "insurance/equipment-policy-2025.pdf", 
          notes: "Covers all pool service equipment",
          reminderDate: "2026-01-01",
          createdAt: "2025-02-01T11:00:00Z",
          updatedAt: "2025-02-01T11:00:00Z"
        }
      ];
      
      const insurance = insurancePolicies.find(i => i.id === id);
      
      if (!insurance) {
        return res.status(404).json({ message: "Insurance policy not found" });
      }
      
      res.json(insurance);
    } catch (error) {
      console.error("Error fetching insurance policy:", error);
      res.status(500).json({ message: "Failed to fetch insurance policy" });
    }
  });

  app.post("/api/business/insurance", async (req: Request, res: Response) => {
    try {
      // Create a new insurance policy with a generated ID and return it
      const newInsurance = {
        id: 5, // In a real app, this would be auto-generated
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newInsurance);
    } catch (error) {
      console.error("Error creating insurance policy:", error);
      res.status(500).json({ message: "Failed to create insurance policy" });
    }
  });

  app.patch("/api/business/insurance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Return the updated insurance policy
      const updatedInsurance = {
        id,
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      res.json(updatedInsurance);
    } catch (error) {
      console.error("Error updating insurance policy:", error);
      res.status(500).json({ message: "Failed to update insurance policy" });
    }
  });

  app.delete("/api/business/insurance/:id", async (req: Request, res: Response) => {
    try {
      // Just return success for now
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting insurance policy:", error);
      res.status(500).json({ message: "Failed to delete insurance policy" });
    }
  });

  // Endpoint to provide Google Maps API key to the client
  app.get("/api/google-maps-key", (_req: Request, res: Response) => {
    try {
      // Return the API key from environment variable
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) {
        console.warn("Google Maps API key not found in environment variables");
      } else {
        console.log("Successfully retrieved Google Maps API key for client");
      }
      res.json({ apiKey });
    } catch (error) {
      console.error("Error providing Google Maps API key:", error);
      res.status(500).json({ message: "Failed to provide Google Maps API key" });
    }
  });
  
  /**
   * Endpoint to manually reschedule incomplete maintenance appointments
   * This is primarily for testing the rescheduling functionality
   */
  app.post("/api/maintenances/reschedule-incomplete", async (_req: Request, res: Response) => {
    try {
      const rescheduledMaintenances = await storage.rescheduleIncompleteMaintenances();
      
      res.json({
        success: true, 
        message: `Successfully rescheduled ${rescheduledMaintenances.length} incomplete maintenance appointments`,
        rescheduledMaintenances
      });
    } catch (error) {
      console.error("Error rescheduling incomplete maintenances:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reschedule incomplete maintenance appointments",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}