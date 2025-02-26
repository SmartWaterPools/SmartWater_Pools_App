import {
  User, InsertUser,
  Client, InsertClient, 
  Technician, InsertTechnician,
  Project, InsertProject,
  ProjectAssignment, InsertProjectAssignment,
  Maintenance, InsertMaintenance,
  Repair, InsertRepair,
  Invoice, InsertInvoice,
  users, clients, technicians, projects, projectAssignments, maintenances, repairs, invoices
} from "@shared/schema";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientByUserId(userId: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  getClientWithUser(id: number): Promise<{ client: Client; user: User } | undefined>;
  
  // Technician operations
  getTechnician(id: number): Promise<Technician | undefined>;
  getTechnicianByUserId(userId: number): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  getAllTechnicians(): Promise<Technician[]>;
  getTechnicianWithUser(id: number): Promise<{ technician: Technician; user: User } | undefined>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  
  // Project assignment operations
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  
  // Maintenance operations
  getMaintenance(id: number): Promise<Maintenance | undefined>;
  createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance>;
  updateMaintenance(id: number, maintenance: Partial<Maintenance>): Promise<Maintenance | undefined>;
  getAllMaintenances(): Promise<Maintenance[]>;
  getMaintenancesByClientId(clientId: number): Promise<Maintenance[]>;
  getMaintenancesByTechnicianId(technicianId: number): Promise<Maintenance[]>;
  getUpcomingMaintenances(days: number): Promise<Maintenance[]>;
  
  // Repair operations
  getRepair(id: number): Promise<Repair | undefined>;
  createRepair(repair: InsertRepair): Promise<Repair>;
  updateRepair(id: number, repair: Partial<Repair>): Promise<Repair | undefined>;
  getAllRepairs(): Promise<Repair[]>;
  getRepairsByClientId(clientId: number): Promise<Repair[]>;
  getRepairsByTechnicianId(technicianId: number): Promise<Repair[]>;
  getRecentRepairs(count: number): Promise<Repair[]>;
  
  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByClientId(clientId: number): Promise<Invoice[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private technicians: Map<number, Technician>;
  private projects: Map<number, Project>;
  private projectAssignments: Map<number, ProjectAssignment>;
  private maintenances: Map<number, Maintenance>;
  private repairs: Map<number, Repair>;
  private invoices: Map<number, Invoice>;
  
  private userId: number;
  private clientId: number;
  private technicianId: number;
  private projectId: number;
  private projectAssignmentId: number;
  private maintenanceId: number;
  private repairId: number;
  private invoiceId: number;
  
  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.technicians = new Map();
    this.projects = new Map();
    this.projectAssignments = new Map();
    this.maintenances = new Map();
    this.repairs = new Map();
    this.invoices = new Map();
    
    this.userId = 1;
    this.clientId = 1;
    this.technicianId = 1;
    this.projectId = 1;
    this.projectAssignmentId = 1;
    this.maintenanceId = 1;
    this.repairId = 1;
    this.invoiceId = 1;
    
    // Add sample data
    this.initSampleData();
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    // Ensure all required fields have default values if not provided
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role ?? "client",
      phone: insertUser.phone ?? null,
      address: insertUser.address ?? null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClientByUserId(userId: number): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.userId === userId,
    );
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientId++;
    // Ensure required nullable fields have proper default values
    const client: Client = { 
      ...insertClient, 
      id,
      companyName: insertClient.companyName ?? null,
      contractType: insertClient.contractType ?? null
    };
    this.clients.set(id, client);
    return client;
  }
  
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async getClientWithUser(id: number): Promise<{ client: Client; user: User } | undefined> {
    const client = await this.getClient(id);
    if (!client) return undefined;
    
    const user = await this.getUser(client.userId);
    if (!user) return undefined;
    
    return { client, user };
  }
  
  // Technician operations
  async getTechnician(id: number): Promise<Technician | undefined> {
    return this.technicians.get(id);
  }
  
  async getTechnicianByUserId(userId: number): Promise<Technician | undefined> {
    return Array.from(this.technicians.values()).find(
      (technician) => technician.userId === userId,
    );
  }
  
  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const id = this.technicianId++;
    // Ensure required nullable fields have proper default values
    const technician: Technician = { 
      ...insertTechnician, 
      id,
      specialization: insertTechnician.specialization ?? null,
      certifications: insertTechnician.certifications ?? null 
    };
    this.technicians.set(id, technician);
    return technician;
  }
  
  async getAllTechnicians(): Promise<Technician[]> {
    return Array.from(this.technicians.values());
  }
  
  async getTechnicianWithUser(id: number): Promise<{ technician: Technician; user: User } | undefined> {
    const technician = await this.getTechnician(id);
    if (!technician) return undefined;
    
    const user = await this.getUser(technician.userId);
    if (!user) return undefined;
    
    return { technician, user };
  }
  
  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectId++;
    // Ensure required fields have proper default values
    const project: Project = { 
      ...insertProject, 
      id,
      status: insertProject.status ?? "planning",
      description: insertProject.description ?? null,
      notes: insertProject.notes ?? null,
      estimatedCompletionDate: insertProject.estimatedCompletionDate ?? null,
      actualCompletionDate: insertProject.actualCompletionDate ?? null,
      budget: insertProject.budget ?? null
    };
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...data };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.clientId === clientId,
    );
  }
  
  // Project assignment operations
  async createProjectAssignment(insertAssignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const id = this.projectAssignmentId++;
    const assignment: ProjectAssignment = { ...insertAssignment, id };
    this.projectAssignments.set(id, assignment);
    return assignment;
  }
  
  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values()).filter(
      (assignment) => assignment.projectId === projectId,
    );
  }
  
  // Maintenance operations
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    return this.maintenances.get(id);
  }
  
  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    const id = this.maintenanceId++;
    // Ensure required fields have proper default values
    const maintenance: Maintenance = { 
      ...insertMaintenance, 
      id,
      status: insertMaintenance.status ?? "scheduled",
      notes: insertMaintenance.notes ?? null,
      completionDate: insertMaintenance.completionDate ?? null
    };
    this.maintenances.set(id, maintenance);
    return maintenance;
  }
  
  async updateMaintenance(id: number, data: Partial<Maintenance>): Promise<Maintenance | undefined> {
    const maintenance = await this.getMaintenance(id);
    if (!maintenance) return undefined;
    
    const updatedMaintenance = { ...maintenance, ...data };
    this.maintenances.set(id, updatedMaintenance);
    return updatedMaintenance;
  }
  
  async getAllMaintenances(): Promise<Maintenance[]> {
    return Array.from(this.maintenances.values());
  }
  
  async getMaintenancesByClientId(clientId: number): Promise<Maintenance[]> {
    return Array.from(this.maintenances.values()).filter(
      (maintenance) => maintenance.clientId === clientId,
    );
  }
  
  async getMaintenancesByTechnicianId(technicianId: number): Promise<Maintenance[]> {
    return Array.from(this.maintenances.values()).filter(
      (maintenance) => maintenance.technicianId === technicianId,
    );
  }
  
  async getUpcomingMaintenances(days: number): Promise<Maintenance[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    return Array.from(this.maintenances.values()).filter((maintenance) => {
      const maintenanceDate = new Date(maintenance.scheduleDate);
      return maintenanceDate >= today && maintenanceDate <= endDate;
    }).sort((a, b) => {
      return new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime();
    });
  }
  
  // Repair operations
  async getRepair(id: number): Promise<Repair | undefined> {
    return this.repairs.get(id);
  }
  
  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const id = this.repairId++;
    // Ensure required fields have proper default values
    const repair: Repair = { 
      ...insertRepair, 
      id, 
      reportedDate: new Date(),
      completionDate: null,
      status: insertRepair.status ?? "pending",
      notes: insertRepair.notes ?? null,
      technicianId: insertRepair.technicianId ?? null,
      priority: insertRepair.priority ?? "medium",
      scheduledDate: insertRepair.scheduledDate ?? null,
      scheduledTime: insertRepair.scheduledTime ?? null
    };
    this.repairs.set(id, repair);
    return repair;
  }
  
  async updateRepair(id: number, data: Partial<Repair>): Promise<Repair | undefined> {
    const repair = await this.getRepair(id);
    if (!repair) return undefined;
    
    const updatedRepair = { ...repair, ...data };
    this.repairs.set(id, updatedRepair);
    return updatedRepair;
  }
  
  async getAllRepairs(): Promise<Repair[]> {
    return Array.from(this.repairs.values());
  }
  
  async getRepairsByClientId(clientId: number): Promise<Repair[]> {
    return Array.from(this.repairs.values()).filter(
      (repair) => repair.clientId === clientId,
    );
  }
  
  async getRepairsByTechnicianId(technicianId: number): Promise<Repair[]> {
    return Array.from(this.repairs.values()).filter(
      (repair) => repair.technicianId === technicianId,
    );
  }
  
  async getRecentRepairs(count: number): Promise<Repair[]> {
    return Array.from(this.repairs.values())
      .sort((a, b) => {
        return new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime();
      })
      .slice(0, count);
  }
  
  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }
  
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceId++;
    // Ensure required fields have proper default values
    const invoice: Invoice = { 
      ...insertInvoice, 
      id, 
      issueDate: new Date(),
      status: insertInvoice.status ?? "pending",
      notes: insertInvoice.notes ?? null
    };
    this.invoices.set(id, invoice);
    return invoice;
  }
  
  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...data };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }
  
  async getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.clientId === clientId,
    );
  }
  
  // Initialize sample data for testing
  private async initSampleData() {
    // Create admin user
    const adminUser = await this.createUser({
      username: "admin",
      password: "admin123",
      name: "Alex Johnson",
      email: "alex@smartwater.com",
      role: "admin",
      phone: "555-123-4567",
      address: "123 Admin St"
    });
    
    // Create technicians
    const tech1User = await this.createUser({
      username: "tech1",
      password: "tech123",
      name: "Michael Torres",
      email: "michael@smartwater.com",
      role: "technician",
      phone: "555-234-5678",
      address: "456 Tech Ave"
    });
    
    const tech1 = await this.createTechnician({
      userId: tech1User.id,
      specialization: "Pool Maintenance",
      certifications: "CPO, Water Chemistry Specialist"
    });
    
    const tech2User = await this.createUser({
      username: "tech2",
      password: "tech123",
      name: "Sarah Kim",
      email: "sarah@smartwater.com",
      role: "technician",
      phone: "555-345-6789",
      address: "789 Tech Blvd"
    });
    
    const tech2 = await this.createTechnician({
      userId: tech2User.id,
      specialization: "Pool Construction",
      certifications: "Master Builder, Electrical Systems"
    });
    
    const tech3User = await this.createUser({
      username: "tech3",
      password: "tech123",
      name: "David Chen",
      email: "david@smartwater.com",
      role: "technician",
      phone: "555-456-7890",
      address: "101 Tech Rd"
    });
    
    const tech3 = await this.createTechnician({
      userId: tech3User.id,
      specialization: "Pool Equipment Repair",
      certifications: "Equipment Specialist, Pump Systems"
    });
    
    // Create clients
    const client1User = await this.createUser({
      username: "client1",
      password: "client123",
      name: "Morrison Family",
      email: "morrison@email.com",
      role: "client",
      phone: "555-567-8901",
      address: "123 Lake Dr"
    });
    
    const client1 = await this.createClient({
      userId: client1User.id,
      companyName: null,
      contractType: "Residential"
    });
    
    const client2User = await this.createUser({
      username: "client2",
      password: "client123",
      name: "Sunset Heights Resort",
      email: "info@sunsetheights.com",
      role: "client",
      phone: "555-678-9012",
      address: "456 Hillside Ave"
    });
    
    const client2 = await this.createClient({
      userId: client2User.id,
      companyName: "Sunset Heights Resort",
      contractType: "Commercial"
    });
    
    const client3User = await this.createUser({
      username: "client3",
      password: "client123",
      name: "Jensen Family",
      email: "jensen@email.com",
      role: "client",
      phone: "555-789-0123",
      address: "789 River Rd"
    });
    
    const client3 = await this.createClient({
      userId: client3User.id,
      companyName: null,
      contractType: "Residential"
    });
    
    const client4User = await this.createUser({
      username: "client4",
      password: "client123",
      name: "Thompson Residence",
      email: "thompson@email.com",
      role: "client",
      phone: "555-890-1234",
      address: "321 Oak St"
    });
    
    const client4 = await this.createClient({
      userId: client4User.id,
      companyName: null,
      contractType: "Residential"
    });
    
    const client5User = await this.createUser({
      username: "client5",
      password: "client123",
      name: "Lakeside Community",
      email: "info@lakeside.com",
      role: "client",
      phone: "555-901-2345",
      address: "654 Lake Ave"
    });
    
    const client5 = await this.createClient({
      userId: client5User.id,
      companyName: "Lakeside Community HOA",
      contractType: "Commercial"
    });
    
    // Create projects
    const project1 = await this.createProject({
      name: "Mediterranean Luxury Pool",
      description: "Custom Mediterranean-style pool with spa and waterfall features",
      clientId: client1.id,
      startDate: new Date("2023-09-01"),
      deadline: new Date("2023-11-15"),
      status: "in_progress",
      completion: 68,
      budget: 75000,
      notes: "Client requested blue tile accent and extended patio area"
    });
    
    const project2 = await this.createProject({
      name: "Infinity Edge Resort Pool",
      description: "Commercial infinity edge pool with beach entry and lighting system",
      clientId: client2.id,
      startDate: new Date("2023-08-15"),
      deadline: new Date("2023-10-30"),
      status: "review",
      completion: 92,
      budget: 250000,
      notes: "Final inspection scheduled for next week"
    });
    
    // Project assignments
    await this.createProjectAssignment({
      projectId: project1.id,
      technicianId: tech1.id,
      role: "Lead"
    });
    
    await this.createProjectAssignment({
      projectId: project1.id,
      technicianId: tech2.id,
      role: "Construction"
    });
    
    await this.createProjectAssignment({
      projectId: project2.id,
      technicianId: tech2.id,
      role: "Lead"
    });
    
    await this.createProjectAssignment({
      projectId: project2.id,
      technicianId: tech3.id,
      role: "Equipment"
    });
    
    // Maintenance schedules
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    await this.createMaintenance({
      clientId: client3.id,
      scheduleDate: tomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "weekly_cleaning",
      technicianId: tech1.id,
      notes: ""
    });
    
    await this.createMaintenance({
      clientId: client4.id,
      scheduleDate: tomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "filter_replacement",
      technicianId: tech2.id,
      notes: "Client requested explanation of maintenance process"
    });
    
    await this.createMaintenance({
      clientId: client5.id,
      scheduleDate: dayAfterTomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "chemical_balance",
      technicianId: tech3.id,
      notes: "Check chemical levels and adjust as needed"
    });
    
    await this.createMaintenance({
      clientId: client5.id,
      scheduleDate: dayAfterTomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "equipment_inspection",
      technicianId: tech3.id,
      notes: "Inspect all equipment and check for issues"
    });
    
    // Repair requests
    await this.createRepair({
      clientId: client3.id,
      issue: "Pump Failure",
      description: "Pool pump stopped working, making loud noise before shutting off",
      status: "assigned",
      priority: "high",
      technicianId: tech1.id,
      scheduledDate: tomorrow.toISOString().split('T')[0],
      scheduledTime: "13:00:00",
      notes: "Client is concerned about water stagnation"
    });
    
    await this.createRepair({
      clientId: client4.id,
      issue: "Leaking Pipe",
      description: "Water loss in equipment area, visible moisture around pipe connections",
      status: "scheduled",
      priority: "medium",
      technicianId: tech2.id,
      scheduledDate: dayAfterTomorrow.toISOString().split('T')[0],
      scheduledTime: "10:00:00",
      notes: ""
    });
    
    await this.createRepair({
      clientId: client5.id,
      issue: "Heater Issue",
      description: "Pool heater not maintaining temperature, inconsistent heating",
      status: "pending",
      priority: "medium",
      technicianId: null,
      scheduledDate: null,
      scheduledTime: null,
      notes: "Needs diagnostic assessment"
    });
    
    // Invoices
    await this.createInvoice({
      clientId: client1.id,
      amount: 25000,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15).toISOString().split('T')[0],
      status: "pending",
      description: "Progress payment for Mediterranean Luxury Pool (35%)",
      notes: ""
    });
    
    await this.createInvoice({
      clientId: client3.id,
      amount: 150,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toISOString().split('T')[0],
      status: "pending",
      description: "Monthly maintenance service - October",
      notes: ""
    });
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByUserId(userId: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClientWithUser(id: number): Promise<{ client: Client; user: User } | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      if (!client) {
        console.log(`Client with ID ${id} not found in database`);
        return undefined;
      }

      const [user] = await db.select().from(users).where(eq(users.id, client.userId));
      if (!user) {
        console.log(`User with ID ${client.userId} not found for client ${id}`);
        return undefined;
      }

      console.log(`Successfully retrieved client ${id} with user ${user.id}`);
      return { client, user };
    } catch (error) {
      console.error(`Error in getClientWithUser(${id}):`, error);
      return undefined;
    }
  }

  // Technician operations
  async getTechnician(id: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    return technician || undefined;
  }

  async getTechnicianByUserId(userId: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.userId, userId));
    return technician || undefined;
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const [technician] = await db.insert(technicians).values(insertTechnician).returning();
    return technician;
  }

  async getAllTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getTechnicianWithUser(id: number): Promise<{ technician: Technician; user: User } | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    if (!technician) return undefined;

    const [user] = await db.select().from(users).where(eq(users.id, technician.userId));
    if (!user) return undefined;

    return { technician, user };
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject || undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  // Project assignment operations
  async createProjectAssignment(insertAssignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [assignment] = await db.insert(projectAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return await db.select().from(projectAssignments).where(eq(projectAssignments.projectId, projectId));
  }

  // Maintenance operations
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    const [maintenance] = await db.select().from(maintenances).where(eq(maintenances.id, id));
    return maintenance || undefined;
  }

  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    const [maintenance] = await db.insert(maintenances).values(insertMaintenance).returning();
    return maintenance;
  }

  async updateMaintenance(id: number, data: Partial<Maintenance>): Promise<Maintenance | undefined> {
    const [updatedMaintenance] = await db
      .update(maintenances)
      .set(data)
      .where(eq(maintenances.id, id))
      .returning();
    return updatedMaintenance || undefined;
  }

  async getAllMaintenances(): Promise<Maintenance[]> {
    return await db.select().from(maintenances);
  }

  async getMaintenancesByClientId(clientId: number): Promise<Maintenance[]> {
    return await db.select().from(maintenances).where(eq(maintenances.clientId, clientId));
  }

  async getMaintenancesByTechnicianId(technicianId: number): Promise<Maintenance[]> {
    return await db
      .select()
      .from(maintenances)
      .where(eq(maintenances.technicianId, technicianId));
  }

  async getUpcomingMaintenances(days: number): Promise<Maintenance[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    return await db
      .select()
      .from(maintenances)
      .where(
        and(
          gte(maintenances.scheduleDate, today.toISOString().split('T')[0]),
          lte(maintenances.scheduleDate, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(maintenances.scheduleDate);
  }

  // Repair operations
  async getRepair(id: number): Promise<Repair | undefined> {
    const [repair] = await db.select().from(repairs).where(eq(repairs.id, id));
    return repair || undefined;
  }

  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const [repair] = await db
      .insert(repairs)
      .values({
        ...insertRepair,
        description: insertRepair.description || null,
        reportedDate: new Date(),
        completionDate: null
      })
      .returning();
    return repair;
  }

  async updateRepair(id: number, data: Partial<Repair>): Promise<Repair | undefined> {
    const [updatedRepair] = await db
      .update(repairs)
      .set(data)
      .where(eq(repairs.id, id))
      .returning();
    return updatedRepair || undefined;
  }

  async getAllRepairs(): Promise<Repair[]> {
    return await db.select().from(repairs);
  }

  async getRepairsByClientId(clientId: number): Promise<Repair[]> {
    return await db.select().from(repairs).where(eq(repairs.clientId, clientId));
  }

  async getRepairsByTechnicianId(technicianId: number): Promise<Repair[]> {
    return await db
      .select()
      .from(repairs)
      .where(eq(repairs.technicianId, technicianId));
  }

  async getRecentRepairs(count: number): Promise<Repair[]> {
    return await db
      .select()
      .from(repairs)
      .orderBy(desc(repairs.reportedDate))
      .limit(count);
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        ...insertInvoice,
        issueDate: new Date().toISOString()
      })
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.clientId, clientId));
  }
}

// Uncomment to use in-memory storage for testing
// export const storage = new MemStorage();

// Use database storage
export const storage = new DatabaseStorage();
