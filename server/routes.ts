import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertClientSchema, 
  insertTechnicianSchema,
  insertProjectSchema,
  insertMaintenanceSchema,
  insertRepairSchema,
  insertInvoiceSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper function to handle validation and respond with appropriate error
const validateRequest = (schema: z.ZodType<any, any>, data: any): { success: boolean; data?: any; error?: string } => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return { success: false, error: validationError.message };
    }
    return { success: false, error: "Invalid request data" };
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Get the existing client
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Update client data
      const updatedClient = await storage.updateClient(id, req.body);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client", error: String(error) });
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
      const upcomingMaintenances = await storage.getUpcomingMaintenances(days);
      
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

  return httpServer;
}
