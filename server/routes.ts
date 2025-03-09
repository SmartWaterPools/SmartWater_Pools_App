import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  validateContractType,
  CONTRACT_TYPES,
  COMMUNICATION_PROVIDER_TYPES,
  CommunicationProviderType
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

  // Health check endpoint for Cloud Run deployment verification
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      service: "SmartWater Pools Management System",
      database: process.env.DATABASE_URL ? "configured" : "not configured"
    });
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

      // Fetch additional data for each maintenance
      const maintenancesWithDetails = await Promise.all(
        maintenances.map(async (maintenance) => {
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

  return httpServer;
}