import {
  User, InsertUser,
  Client, InsertClient, 
  Technician, InsertTechnician,
  Project, InsertProject,
  ProjectPhase, InsertProjectPhase,
  ProjectAssignment, InsertProjectAssignment,
  Maintenance, InsertMaintenance,
  Repair, InsertRepair,
  Invoice, InsertInvoice,
  PoolEquipment, InsertPoolEquipment,
  PoolImage, InsertPoolImage,
  ServiceTemplate, InsertServiceTemplate,
  ProjectDocumentation, InsertProjectDocumentation,
  CommunicationProvider, InsertCommunicationProvider, CommunicationProviderType,
  ChemicalUsage, InsertChemicalUsage, ChemicalType,
  WaterReading, InsertWaterReading,
  Route, InsertRoute,
  RouteAssignment, InsertRouteAssignment,
  users, clients, technicians, projects, projectPhases, projectAssignments, maintenances, 
  repairs, invoices, poolEquipment, poolImages, serviceTemplates, projectDocumentation, 
  communicationProviders, chemicalUsage, waterReadings, routes, routeAssignments
} from "@shared/schema";
import { and, eq, desc, gte, lte, sql, asc } from "drizzle-orm";
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
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
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
  deleteProject(id: number): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  getProjectsByType(projectType: string): Promise<Project[]>;
  getProjectsByStatus(status: string): Promise<Project[]>;
  getArchivedProjects(): Promise<Project[]>;
  
  // Project Phases operations
  getProjectPhase(id: number): Promise<ProjectPhase | undefined>;
  createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase>;
  updateProjectPhase(id: number, phase: Partial<ProjectPhase>): Promise<ProjectPhase | undefined>;
  deleteProjectPhase(id: number): Promise<boolean>;
  getProjectPhasesByProjectId(projectId: number): Promise<ProjectPhase[]>;
  
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
  getIncompleteMaintenances(date: Date): Promise<Maintenance[]>;
  rescheduleIncompleteMaintenances(): Promise<Maintenance[]>;
  
  // Route operations
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, route: Partial<Route>): Promise<Route | undefined>;
  deleteRoute(id: number): Promise<boolean>;
  getAllRoutes(): Promise<Route[]>;
  getRoutesByTechnicianId(technicianId: number): Promise<Route[]>;
  getRoutesByDayOfWeek(dayOfWeek: string): Promise<Route[]>;
  getRoutesByType(type: string): Promise<Route[]>;
  
  // Route Assignment operations
  getRouteAssignment(id: number): Promise<RouteAssignment | undefined>;
  createRouteAssignment(assignment: InsertRouteAssignment): Promise<RouteAssignment>;
  updateRouteAssignment(id: number, assignment: Partial<RouteAssignment>): Promise<RouteAssignment | undefined>;
  deleteRouteAssignment(id: number): Promise<boolean>;
  getRouteAssignmentsByRouteId(routeId: number): Promise<RouteAssignment[]>;
  getRouteAssignmentsByMaintenanceId(maintenanceId: number): Promise<RouteAssignment[]>;
  reorderRouteAssignments(routeId: number, assignmentIds: number[]): Promise<RouteAssignment[]>;
  
  // Chemical Usage operations
  getChemicalUsage(id: number): Promise<ChemicalUsage | undefined>;
  createChemicalUsage(usage: InsertChemicalUsage): Promise<ChemicalUsage>;
  getChemicalUsageByMaintenanceId(maintenanceId: number): Promise<ChemicalUsage[]>;
  getChemicalUsageByType(type: ChemicalType): Promise<ChemicalUsage[]>;
  
  // Water Readings operations
  getWaterReading(id: number): Promise<WaterReading | undefined>;
  createWaterReading(reading: InsertWaterReading): Promise<WaterReading>;
  getWaterReadingsByMaintenanceId(maintenanceId: number): Promise<WaterReading[]>;
  getLatestWaterReadingByClientId(clientId: number): Promise<WaterReading | undefined>;
  
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
  
  // Pool Equipment operations
  getPoolEquipment(id: number): Promise<PoolEquipment | undefined>;
  createPoolEquipment(equipment: InsertPoolEquipment): Promise<PoolEquipment>;
  updatePoolEquipment(id: number, equipment: Partial<PoolEquipment>): Promise<PoolEquipment | undefined>;
  getPoolEquipmentByClientId(clientId: number): Promise<PoolEquipment[]>;
  
  // Pool Images operations
  getPoolImage(id: number): Promise<PoolImage | undefined>;
  createPoolImage(image: InsertPoolImage): Promise<PoolImage>;
  getPoolImagesByClientId(clientId: number): Promise<PoolImage[]>;
  
  // Service Template operations
  getServiceTemplate(id: number): Promise<ServiceTemplate | undefined>;
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  updateServiceTemplate(id: number, template: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined>;
  deleteServiceTemplate(id: number): Promise<boolean>;
  getAllServiceTemplates(): Promise<ServiceTemplate[]>;
  getDefaultServiceTemplate(type: string): Promise<ServiceTemplate | undefined>;
  
  // Project Documentation operations
  getProjectDocument(id: number): Promise<ProjectDocumentation | undefined>;
  createProjectDocument(document: InsertProjectDocumentation): Promise<ProjectDocumentation>;
  updateProjectDocument(id: number, document: Partial<ProjectDocumentation>): Promise<ProjectDocumentation | undefined>;
  deleteProjectDocument(id: number): Promise<boolean>;
  getProjectDocumentsByProjectId(projectId: number): Promise<ProjectDocumentation[]>;
  getProjectDocumentsByPhaseId(phaseId: number): Promise<ProjectDocumentation[]>;
  getProjectDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocumentation[]>;
  
  // Communication Provider operations
  getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined>;
  getCommunicationProviderByType(type: CommunicationProviderType): Promise<CommunicationProvider | undefined>;
  createCommunicationProvider(provider: InsertCommunicationProvider): Promise<CommunicationProvider>;
  updateCommunicationProvider(id: number, provider: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined>;
  deleteCommunicationProvider(id: number): Promise<boolean>;
  getAllCommunicationProviders(): Promise<CommunicationProvider[]>;
  getDefaultCommunicationProvider(type: CommunicationProviderType): Promise<CommunicationProvider | undefined>;
  
  // Business Module Operations
  
  // Expense operations
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  
  // Payroll operations removed
  
  // Time Entry operations
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, entry: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  getAllTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntriesByUserId(userId: number): Promise<TimeEntry[]>;
  getTimeEntriesByDateRange(startDate: Date, endDate: Date): Promise<TimeEntry[]>;
  getTimeEntriesByStatus(status: string): Promise<TimeEntry[]>;
  getTimeEntriesByProjectId(projectId: number): Promise<TimeEntry[]>;
  
  // Financial Report operations
  getFinancialReport(id: number): Promise<FinancialReport | undefined>;
  createFinancialReport(report: InsertFinancialReport): Promise<FinancialReport>;
  updateFinancialReport(id: number, report: Partial<FinancialReport>): Promise<FinancialReport | undefined>;
  deleteFinancialReport(id: number): Promise<boolean>;
  getAllFinancialReports(): Promise<FinancialReport[]>;
  getFinancialReportsByType(type: ReportType): Promise<FinancialReport[]>;
  
  // Vendor operations
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;
  getAllVendors(): Promise<Vendor[]>;
  getVendorsByCategory(category: string): Promise<Vendor[]>;
  
  // Purchase Order operations
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, order: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: number): Promise<boolean>;
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByVendorId(vendorId: number): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByStatus(status: string): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByDateRange(startDate: Date, endDate: Date): Promise<PurchaseOrder[]>;
  
  // Inventory Item operations
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemsByCategory(category: string): Promise<InventoryItem[]>;
  getLowStockItems(): Promise<InventoryItem[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private technicians: Map<number, Technician>;
  private projects: Map<number, Project>;
  private projectPhases: Map<number, ProjectPhase>;
  private projectAssignments: Map<number, ProjectAssignment>;
  private maintenances: Map<number, Maintenance>;
  private repairs: Map<number, Repair>;
  private invoices: Map<number, Invoice>;
  private poolEquipment: Map<number, PoolEquipment>;
  private poolImages: Map<number, PoolImage>;
  private communicationProviders: Map<number, CommunicationProvider>;
  private chemicalUsage: Map<number, ChemicalUsage>;
  private waterReadings: Map<number, WaterReading>;
  private routes: Map<number, Route>;
  private routeAssignments: Map<number, RouteAssignment>;
  
  private userId: number;
  private clientId: number;
  private technicianId: number;
  private projectId: number;
  private projectPhaseId: number;
  private projectAssignmentId: number;
  private maintenanceId: number;
  private repairId: number;
  private invoiceId: number;
  private poolEquipmentId: number;
  private poolImageId: number;
  private serviceTemplates: Map<number, ServiceTemplate>;
  private serviceTemplateId: number;
  private projectDocuments: Map<number, ProjectDocumentation>;
  private projectDocumentId: number;
  private communicationProviderId: number;
  private chemicalUsageId: number;
  private waterReadingId: number;
  private routeId: number;
  private routeAssignmentId: number;
  
  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.technicians = new Map();
    this.projects = new Map();
    this.projectPhases = new Map();
    this.projectAssignments = new Map();
    this.maintenances = new Map();
    this.repairs = new Map();
    this.invoices = new Map();
    this.poolEquipment = new Map();
    this.poolImages = new Map();
    this.serviceTemplates = new Map();
    this.projectDocuments = new Map();
    this.communicationProviders = new Map();
    this.chemicalUsage = new Map();
    this.waterReadings = new Map();
    this.routes = new Map();
    this.routeAssignments = new Map();
    
    this.userId = 1;
    this.clientId = 1;
    this.technicianId = 1;
    this.projectId = 1;
    this.projectPhaseId = 1;
    this.projectAssignmentId = 1;
    this.maintenanceId = 1;
    this.repairId = 1;
    this.invoiceId = 1;
    this.poolEquipmentId = 1;
    this.poolImageId = 1;
    this.serviceTemplateId = 1;
    this.projectDocumentId = 1;
    this.communicationProviderId = 1;
    this.chemicalUsageId = 1;
    this.waterReadingId = 1;
    this.routeId = 1;
    this.routeAssignmentId = 1;
    
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
      address: insertUser.address ?? null,
      active: insertUser.active !== undefined ? insertUser.active : true
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
      contractType: insertClient.contractType ?? null,
      poolType: insertClient.poolType ?? null,
      poolSize: insertClient.poolSize ?? null,
      filterType: insertClient.filterType ?? null,
      heaterType: insertClient.heaterType ?? null,
      chemicalSystem: insertClient.chemicalSystem ?? null,
      specialNotes: insertClient.specialNotes ?? null,
      serviceDay: insertClient.serviceDay ?? null,
      serviceLevel: insertClient.serviceLevel ?? null,
      customServiceInstructions: insertClient.customServiceInstructions ?? null
    };
    this.clients.set(id, client);
    return client;
  }
  
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async updateClient(id: number, data: Partial<Client>): Promise<Client | undefined> {
    console.log(`[MEM STORAGE] Updating client ${id} with data:`, JSON.stringify(data));
    
    const client = await this.getClient(id);
    if (!client) {
      console.log(`[MEM STORAGE] Client with ID ${id} not found`);
      return undefined;
    }
    
    // Make sure contractType is properly handled
    const updatedData: Partial<Client> = { ...data };
    if (updatedData.contractType !== undefined) {
      // Handle null/empty string values and convert to lowercase
      if (updatedData.contractType === null || updatedData.contractType === '') {
        console.log(`[MEM STORAGE] Setting null contract type`);
        updatedData.contractType = null;
      } else {
        updatedData.contractType = String(updatedData.contractType).toLowerCase();
        console.log(`[MEM STORAGE] Normalized contract type: '${updatedData.contractType}'`);
      }
    }
    
    const updatedClient = { ...client, ...updatedData };
    this.clients.set(id, updatedClient);
    console.log(`[MEM STORAGE] Client updated successfully:`, JSON.stringify(updatedClient));
    return updatedClient;
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
      projectType: insertProject.projectType ?? "construction",
      status: insertProject.status ?? "planning",
      description: insertProject.description ?? null,
      notes: insertProject.notes ?? null,
      estimatedCompletionDate: insertProject.estimatedCompletionDate ?? null,
      actualCompletionDate: insertProject.actualCompletionDate ?? null,
      budget: insertProject.budget ?? null,
      currentPhase: insertProject.currentPhase ?? null,
      percentComplete: insertProject.percentComplete ?? 0,
      permitDetails: insertProject.permitDetails ?? null
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
  
  async deleteProject(id: number): Promise<boolean> {
    const project = await this.getProject(id);
    if (!project) return false;
    
    // Delete all phases associated with this project
    const phases = await this.getProjectPhasesByProjectId(id);
    for (const phase of phases) {
      await this.deleteProjectPhase(phase.id);
    }
    
    // Delete all project documents associated with this project
    const documents = await this.getProjectDocumentsByProjectId(id);
    for (const document of documents) {
      await this.deleteProjectDocument(document.id);
    }
    
    // Remove the project
    return this.projects.delete(id);
  }
  
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.clientId === clientId,
    );
  }
  
  async getProjectsByType(projectType: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.projectType === projectType,
    );
  }
  
  // Project Phases operations
  async getProjectPhase(id: number): Promise<ProjectPhase | undefined> {
    return this.projectPhases.get(id);
  }
  
  async createProjectPhase(insertPhase: InsertProjectPhase): Promise<ProjectPhase> {
    const id = this.projectPhaseId++;
    const phase: ProjectPhase = { 
      ...insertPhase, 
      id,
      status: insertPhase.status ?? "pending",
      description: insertPhase.description ?? null,
      notes: insertPhase.notes ?? null,
      startDate: insertPhase.startDate ?? null,
      endDate: insertPhase.endDate ?? null,
      percentComplete: insertPhase.percentComplete ?? null
    };
    this.projectPhases.set(id, phase);
    return phase;
  }
  
  async updateProjectPhase(id: number, data: Partial<ProjectPhase>): Promise<ProjectPhase | undefined> {
    const phase = await this.getProjectPhase(id);
    if (!phase) return undefined;
    
    const updatedPhase = { ...phase, ...data };
    this.projectPhases.set(id, updatedPhase);
    return updatedPhase;
  }
  
  async deleteProjectPhase(id: number): Promise<boolean> {
    const phase = await this.getProjectPhase(id);
    if (!phase) return false;
    
    return this.projectPhases.delete(id);
  }
  
  async getProjectPhasesByProjectId(projectId: number): Promise<ProjectPhase[]> {
    return Array.from(this.projectPhases.values()).filter(
      (phase) => phase.projectId === projectId,
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
      completionDate: insertMaintenance.completionDate ?? null,
      startTime: null,
      endTime: null,
      customerFeedback: null,
      customerNotes: null,
      invoiceAmount: null,
      laborCost: null,
      totalChemicalCost: null,
      profitAmount: null,
      profitPercentage: null
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
  
  async getIncompleteMaintenances(date: Date): Promise<Maintenance[]> {
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    return Array.from(this.maintenances.values()).filter((maintenance) => {
      const maintenanceDate = new Date(maintenance.scheduleDate).toISOString().split('T')[0];
      return maintenanceDate === dateStr && 
             (maintenance.status === "scheduled" || maintenance.status === "in_progress") &&
             !maintenance.completionDate;
    });
  }
  
  async rescheduleIncompleteMaintenances(): Promise<Maintenance[]> {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get incomplete maintenances from yesterday
    const incompleteMaintenances = await this.getIncompleteMaintenances(yesterday);
    
    // Reschedule each maintenance to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const rescheduledMaintenances: Maintenance[] = [];
    
    for (const maintenance of incompleteMaintenances) {
      const updatedMaintenance = await this.updateMaintenance(maintenance.id, {
        scheduleDate: todayStr,
        notes: maintenance.notes 
          ? `${maintenance.notes}\nAutomatically rescheduled from ${maintenance.scheduleDate}` 
          : `Automatically rescheduled from ${maintenance.scheduleDate}`
      });
      
      if (updatedMaintenance) {
        rescheduledMaintenances.push(updatedMaintenance);
      }
    }
    
    return rescheduledMaintenances;
  }
  
  // Chemical Usage operations
  async getChemicalUsage(id: number): Promise<ChemicalUsage | undefined> {
    return this.chemicalUsage.get(id);
  }
  
  async createChemicalUsage(insertUsage: InsertChemicalUsage): Promise<ChemicalUsage> {
    const id = this.chemicalUsageId++;
    const usage: ChemicalUsage = {
      ...insertUsage,
      id,
      notes: insertUsage.notes ?? null,
      reason: insertUsage.reason ?? null,
      createdAt: new Date()
    };
    this.chemicalUsage.set(id, usage);
    return usage;
  }
  
  async getChemicalUsageByMaintenanceId(maintenanceId: number): Promise<ChemicalUsage[]> {
    return Array.from(this.chemicalUsage.values()).filter(
      (usage) => usage.maintenanceId === maintenanceId
    );
  }
  
  async getChemicalUsageByType(type: ChemicalType): Promise<ChemicalUsage[]> {
    return Array.from(this.chemicalUsage.values()).filter(
      (usage) => usage.chemicalType === type
    );
  }
  
  // Water Readings operations
  async getWaterReading(id: number): Promise<WaterReading | undefined> {
    return this.waterReadings.get(id);
  }
  
  async createWaterReading(insertReading: InsertWaterReading): Promise<WaterReading> {
    const id = this.waterReadingId++;
    const reading: WaterReading = {
      ...insertReading,
      id,
      phLevel: insertReading.phLevel ?? null,
      chlorineLevel: insertReading.chlorineLevel ?? null,
      alkalinity: insertReading.alkalinity ?? null,
      cyanuricAcid: insertReading.cyanuricAcid ?? null,
      calciumHardness: insertReading.calciumHardness ?? null,
      totalDissolvedSolids: insertReading.totalDissolvedSolids ?? null,
      saltLevel: insertReading.saltLevel ?? null,
      phosphates: insertReading.phosphates ?? null,
      createdAt: new Date()
    };
    this.waterReadings.set(id, reading);
    return reading;
  }
  
  async getWaterReadingsByMaintenanceId(maintenanceId: number): Promise<WaterReading[]> {
    return Array.from(this.waterReadings.values()).filter(
      (reading) => reading.maintenanceId === maintenanceId
    );
  }
  
  async getLatestWaterReadingByClientId(clientId: number): Promise<WaterReading | undefined> {
    // Find all maintenance records for the client
    const clientMaintenances = Array.from(this.maintenances.values()).filter(
      (maintenance) => maintenance.clientId === clientId
    );
    
    // Get all maintenance IDs
    const maintenanceIds = clientMaintenances.map(maintenance => maintenance.id);
    
    // Find all water readings for these maintenances
    const clientWaterReadings = Array.from(this.waterReadings.values()).filter(
      (reading) => maintenanceIds.includes(reading.maintenanceId)
    );
    
    // Sort by creation date (newest first) and return the first one
    return clientWaterReadings.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
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
      description: insertRepair.description || null,
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
  
  // Pool Equipment operations
  async getPoolEquipment(id: number): Promise<PoolEquipment | undefined> {
    return this.poolEquipment.get(id);
  }
  
  async createPoolEquipment(insertEquipment: InsertPoolEquipment): Promise<PoolEquipment> {
    const id = this.poolEquipmentId++;
    // Ensure required fields have proper default values
    const equipment: PoolEquipment = { 
      id,
      name: insertEquipment.name,
      type: insertEquipment.type,
      clientId: insertEquipment.clientId,
      status: insertEquipment.status ?? null,
      brand: insertEquipment.brand ?? null,
      model: insertEquipment.model ?? null,
      serialNumber: insertEquipment.serialNumber ?? null,
      installDate: insertEquipment.installDate ?? null,
      lastServiceDate: insertEquipment.lastServiceDate ?? null,
      notes: insertEquipment.notes ?? null
    };
    this.poolEquipment.set(id, equipment);
    return equipment;
  }
  
  async updatePoolEquipment(id: number, data: Partial<PoolEquipment>): Promise<PoolEquipment | undefined> {
    const equipment = await this.getPoolEquipment(id);
    if (!equipment) return undefined;
    
    const updatedEquipment = { ...equipment, ...data };
    this.poolEquipment.set(id, updatedEquipment);
    return updatedEquipment;
  }
  
  async getPoolEquipmentByClientId(clientId: number): Promise<PoolEquipment[]> {
    return Array.from(this.poolEquipment.values()).filter(
      (equipment) => equipment.clientId === clientId,
    );
  }
  
  // Pool Images operations
  async getPoolImage(id: number): Promise<PoolImage | undefined> {
    return this.poolImages.get(id);
  }
  
  async createPoolImage(insertImage: InsertPoolImage): Promise<PoolImage> {
    const id = this.poolImageId++;
    // Ensure all required fields are explicitly set to handle undefined values
    let technicianId: number | null = null;
    if (insertImage.technician_id !== undefined) {
      technicianId = insertImage.technician_id;
    }
    
    const image: PoolImage = { 
      id,
      clientId: insertImage.clientId,
      imageUrl: insertImage.imageUrl,
      technician_id: technicianId,
      caption: insertImage.caption ?? null,
      category: insertImage.category ?? null,
      uploadDate: new Date()
    };
    this.poolImages.set(id, image);
    return image;
  }
  
  async getPoolImagesByClientId(clientId: number): Promise<PoolImage[]> {
    return Array.from(this.poolImages.values()).filter(
      (image) => image.clientId === clientId,
    );
  }
  
  // Route operations
  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.get(id);
  }
  
  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = this.routeId++;
    const route: Route = {
      ...insertRoute,
      id,
      description: insertRoute.description ?? null,
      startTime: insertRoute.startTime ?? null,
      endTime: insertRoute.endTime ?? null,
      technicianId: insertRoute.technicianId ?? null,
      color: insertRoute.color ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.routes.set(id, route);
    return route;
  }
  
  async updateRoute(id: number, data: Partial<Route>): Promise<Route | undefined> {
    const route = await this.getRoute(id);
    if (!route) return undefined;
    
    const updatedRoute = { ...route, ...data, updatedAt: new Date() };
    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }
  
  async deleteRoute(id: number): Promise<boolean> {
    const route = await this.getRoute(id);
    if (!route) return false;
    
    // Remove all assignments for this route first
    const assignments = await this.getRouteAssignmentsByRouteId(id);
    for (const assignment of assignments) {
      await this.deleteRouteAssignment(assignment.id);
    }
    
    return this.routes.delete(id);
  }
  
  async getAllRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }
  
  async getRoutesByTechnicianId(technicianId: number): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.technicianId === technicianId,
    );
  }
  
  async getRoutesByDayOfWeek(dayOfWeek: string): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase(),
    );
  }
  
  async getRoutesByType(type: string): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.type.toLowerCase() === type.toLowerCase(),
    );
  }
  
  // Route Assignment operations
  async getRouteAssignment(id: number): Promise<RouteAssignment | undefined> {
    return this.routeAssignments.get(id);
  }
  
  async createRouteAssignment(insertAssignment: InsertRouteAssignment): Promise<RouteAssignment> {
    const id = this.routeAssignmentId++;
    const assignment: RouteAssignment = {
      ...insertAssignment,
      id,
      estimatedDuration: insertAssignment.estimatedDuration ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.routeAssignments.set(id, assignment);
    return assignment;
  }
  
  async updateRouteAssignment(id: number, data: Partial<RouteAssignment>): Promise<RouteAssignment | undefined> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return undefined;
    
    const updatedAssignment = { ...assignment, ...data, updatedAt: new Date() };
    this.routeAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }
  
  async deleteRouteAssignment(id: number): Promise<boolean> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return false;
    
    return this.routeAssignments.delete(id);
  }
  
  async getRouteAssignmentsByRouteId(routeId: number): Promise<RouteAssignment[]> {
    return Array.from(this.routeAssignments.values())
      .filter(assignment => assignment.routeId === routeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }
  
  async getRouteAssignmentsByMaintenanceId(maintenanceId: number): Promise<RouteAssignment[]> {
    return Array.from(this.routeAssignments.values())
      .filter(assignment => assignment.maintenanceId === maintenanceId);
  }
  
  async reorderRouteAssignments(routeId: number, assignmentIds: number[]): Promise<RouteAssignment[]> {
    // Validate all assignments exist and belong to this route
    const assignments = await Promise.all(
      assignmentIds.map(async (id) => {
        const assignment = await this.getRouteAssignment(id);
        if (!assignment) throw new Error(`Assignment with ID ${id} not found`);
        if (assignment.routeId !== routeId) throw new Error(`Assignment with ID ${id} does not belong to route ${routeId}`);
        return assignment;
      })
    );
    
    // Update the order index for each assignment
    const updatedAssignments = await Promise.all(
      assignments.map(async (assignment, index) => {
        return this.updateRouteAssignment(assignment.id, { orderIndex: index });
      })
    );
    
    return updatedAssignments.filter((assignment): assignment is RouteAssignment => assignment !== undefined);
  }
  
  // Service Template operations
  async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
    return this.serviceTemplates.get(id);
  }
  
  async createServiceTemplate(insertTemplate: InsertServiceTemplate): Promise<ServiceTemplate> {
    const id = this.serviceTemplateId++;
    const template: ServiceTemplate = {
      ...insertTemplate,
      id,
      name: insertTemplate.name,
      type: insertTemplate.type,
      description: insertTemplate.description ?? null,
      isDefault: insertTemplate.isDefault ?? false,
      checklistItems: insertTemplate.checklistItems ?? [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.serviceTemplates.set(id, template);
    return template;
  }
  
  async updateServiceTemplate(id: number, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined> {
    const template = await this.getServiceTemplate(id);
    if (!template) return undefined;
    
    const updatedTemplate = { ...template, ...data };
    this.serviceTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteServiceTemplate(id: number): Promise<boolean> {
    const exists = this.serviceTemplates.has(id);
    if (exists) {
      this.serviceTemplates.delete(id);
    }
    return exists;
  }
  
  async getAllServiceTemplates(): Promise<ServiceTemplate[]> {
    return Array.from(this.serviceTemplates.values());
  }
  
  async getDefaultServiceTemplate(type: string): Promise<ServiceTemplate | undefined> {
    return Array.from(this.serviceTemplates.values()).find(
      (template) => template.type === type && template.isDefault
    );
  }

  // Project Documentation operations
  async getProjectDocument(id: number): Promise<ProjectDocumentation | undefined> {
    return this.projectDocuments.get(id);
  }

  async createProjectDocument(document: InsertProjectDocumentation): Promise<ProjectDocumentation> {
    const id = this.projectDocumentId++;
    const projectDocument: ProjectDocumentation = {
      ...document,
      id,
      description: document.description ?? null,
      tags: document.tags ?? [],
      isPublic: document.isPublic ?? false,
      uploadDate: document.uploadDate ?? new Date().toISOString()
    };
    this.projectDocuments.set(id, projectDocument);
    return projectDocument;
  }

  async updateProjectDocument(id: number, data: Partial<ProjectDocumentation>): Promise<ProjectDocumentation | undefined> {
    const document = await this.getProjectDocument(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...data };
    this.projectDocuments.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteProjectDocument(id: number): Promise<boolean> {
    return this.projectDocuments.delete(id);
  }

  async getProjectDocumentsByProjectId(projectId: number): Promise<ProjectDocumentation[]> {
    return Array.from(this.projectDocuments.values())
      .filter(doc => doc.projectId === projectId)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  async getProjectDocumentsByPhaseId(phaseId: number): Promise<ProjectDocumentation[]> {
    return Array.from(this.projectDocuments.values())
      .filter(doc => doc.phaseId === phaseId)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  async getProjectDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocumentation[]> {
    return Array.from(this.projectDocuments.values())
      .filter(doc => doc.projectId === projectId && doc.documentType === documentType)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }
  
  // Communication Provider operations
  async getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined> {
    return this.communicationProviders.get(id);
  }

  async getCommunicationProviderByType(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    return Array.from(this.communicationProviders.values()).find(
      (provider) => provider.type === type
    );
  }

  async createCommunicationProvider(insertProvider: InsertCommunicationProvider): Promise<CommunicationProvider> {
    const id = this.communicationProviderId++;
    
    const provider: CommunicationProvider = {
      ...insertProvider,
      id,
      isDefault: insertProvider.isDefault ?? false,
      isActive: insertProvider.isActive ?? true,
      clientId: insertProvider.clientId ?? null,
      clientSecret: insertProvider.clientSecret ?? null,
      apiKey: insertProvider.apiKey ?? null,
      accountSid: insertProvider.accountSid ?? null,
      authToken: insertProvider.authToken ?? null,
      refreshToken: insertProvider.refreshToken ?? null,
      accessToken: insertProvider.accessToken ?? null,
      tokenExpiresAt: insertProvider.tokenExpiresAt ?? null,
      email: insertProvider.email ?? null,
      phoneNumber: insertProvider.phoneNumber ?? null,
      settings: insertProvider.settings ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null
    };
    
    // If this provider is marked as default, make sure no other provider of the same type is default
    if (provider.isDefault) {
      const providers = Array.from(this.communicationProviders.values());
      
      providers
        .filter(p => p.type === provider.type && p.id !== provider.id)
        .forEach(p => {
          p.isDefault = false;
          this.communicationProviders.set(p.id, p);
        });
    }
    
    this.communicationProviders.set(id, provider);
    return provider;
  }

  async updateCommunicationProvider(id: number, data: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined> {
    const provider = await this.getCommunicationProvider(id);
    if (!provider) return undefined;
    
    const updatedProvider = { ...provider, ...data, updatedAt: new Date() };
    
    // If this provider is being set as default, make sure no other provider of the same type is default
    if (data.isDefault) {
      const providers = Array.from(this.communicationProviders.values());
      
      providers
        .filter(p => p.type === provider.type && p.id !== provider.id)
        .forEach(p => {
          p.isDefault = false;
          this.communicationProviders.set(p.id, p);
        });
    }
    
    this.communicationProviders.set(id, updatedProvider);
    return updatedProvider;
  }

  async deleteCommunicationProvider(id: number): Promise<boolean> {
    const provider = await this.getCommunicationProvider(id);
    if (!provider) return false;
    
    return this.communicationProviders.delete(id);
  }

  async getAllCommunicationProviders(): Promise<CommunicationProvider[]> {
    return Array.from(this.communicationProviders.values());
  }

  async getDefaultCommunicationProvider(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    return Array.from(this.communicationProviders.values()).find(
      (provider) => provider.type === type && provider.isDefault
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
      startDate: "2023-09-01",
      estimatedCompletionDate: "2023-11-15",
      status: "in_progress",
      budget: 75000,
      notes: "Client requested blue tile accent and extended patio area"
    });
    
    const project2 = await this.createProject({
      name: "Infinity Edge Resort Pool",
      description: "Commercial infinity edge pool with beach entry and lighting system",
      clientId: client2.id,
      startDate: "2023-08-15",
      estimatedCompletionDate: "2023-10-30",
      status: "review",
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
  
  async updateClient(id: number, data: Partial<Client>): Promise<Client | undefined> {
    console.log(`[DB STORAGE] Updating client ${id} with data:`, JSON.stringify(data));
    
    // Before retrieving current data, log exactly what contractType was sent
    if ('contractType' in data) {
      console.log(`[DB STORAGE] CONTRACT TYPE UPDATE RECEIVED: Value=${
        data.contractType === null ? 'null' : 
        data.contractType === undefined ? 'undefined' : 
        `"${data.contractType}"`}, Type=${typeof data.contractType}`);
    }
    
    // Get the current client to compare before/after
    try {
      const [currentClient] = await db.select().from(clients).where(eq(clients.id, id));
      if (currentClient) {
        console.log(`[DB STORAGE] Current client before update:`, JSON.stringify(currentClient));
      }
    } catch (err) {
      console.log(`[DB STORAGE] Error reading current client:`, err);
    }
    
    // Make sure contractType is properly handled
    const updatedData: Partial<Client> = { ...data };
    if (updatedData.contractType !== undefined) {
      // Handle null/empty string values and convert to lowercase
      if (updatedData.contractType === null || updatedData.contractType === '') {
        console.log(`[DB STORAGE] Setting null contract type`);
        updatedData.contractType = null;
      } else {
        // Normalize and validate the contract type
        const normalizedType = String(updatedData.contractType).toLowerCase();
        
        // Validate against allowed contract types
        if (!['residential', 'commercial', 'service', 'maintenance'].includes(normalizedType)) {
          console.error(`[DB STORAGE] Invalid contract type "${normalizedType}" - must be one of: residential, commercial, service, maintenance`);
          throw new Error(`Invalid contract type: ${normalizedType}`);
        }
        
        updatedData.contractType = normalizedType;
        console.log(`[DB STORAGE] Validated and normalized contract type: '${updatedData.contractType}'`);
      }
    }

    try {
      console.log(`[DB STORAGE] Executing update query with data:`, JSON.stringify(updatedData));
      const [updatedClient] = await db
        .update(clients)
        .set(updatedData)
        .where(eq(clients.id, id))
        .returning();
      
      if (updatedClient) {
        console.log(`[DB STORAGE] Client updated successfully:`, JSON.stringify(updatedClient));
        return updatedClient;
      } else {
        console.error(`[DB STORAGE] Update query returned no client`);
        return undefined;
      }
    } catch (error) {
      console.error(`[DB STORAGE] Error updating client:`, error);
      throw error;
    }
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
    try {
      // Use explicit SQL to select only columns that exist in the database
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE id = ${id}
      `);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const project = result.rows[0];
      
      // Add virtual isArchived field based on status
      return {
        ...project,
        isArchived: project.status === "archived"
      };
    } catch (error) {
      console.error(`Error retrieving project ${id}:`, error);
      throw error;
    }
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    try {
      // Check if isArchived is in the data and remove it (virtual field)
      const { isArchived, ...safeData } = insertProject as any;
      
      // Use explicit column inserts to avoid issues with schema mismatches
      // This also ensures we're only inserting fields that actually exist in the database
      const result = await db.execute(sql`
        INSERT INTO projects (
          name, 
          description, 
          client_id, 
          project_type, 
          start_date, 
          estimated_completion_date,
          status,
          budget,
          current_phase,
          percent_complete,
          permit_details,
          notes
        )
        VALUES (
          ${safeData.name},
          ${safeData.description || null},
          ${safeData.clientId},
          ${safeData.projectType || 'construction'},
          ${safeData.startDate},
          ${safeData.estimatedCompletionDate || null},
          ${safeData.status || 'planning'},
          ${safeData.budget || null},
          ${safeData.currentPhase || null},
          ${safeData.percentComplete || 0},
          ${safeData.permitDetails || null},
          ${safeData.notes || null}
        )
        RETURNING 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes
      `);
      
      // Get the inserted project
      const project = result.rows[0];
      
      // Add virtual isArchived field based on status
      return {
        ...project,
        isArchived: project.status === "archived"
      };
    } catch (error) {
      console.error("[PROJECT CREATION] Error:", error);
      throw error;
    }
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    try {
      // Get the current project to know its current status
      const currentProject = await this.getProject(id);
      if (!currentProject) {
        return undefined;
      }
      
      const finalData: Partial<Project> = {...data};
      
      // Handle virtual isArchived field
      if ('isArchived' in data) {
        // Remove isArchived from the data to be saved (it's a virtual field)
        const { isArchived, ...restData } = finalData as any;
        
        // If isArchived is changing, update the status field accordingly
        if (isArchived !== currentProject.isArchived) {
          // Set status to "archived" if isArchived is true, otherwise keep current status or set to active
          restData.status = isArchived === true ? "archived" : (restData.status || currentProject.status === "archived" ? "active" : currentProject.status);
          console.log(`Project ${id} archive status changing to ${isArchived}. Setting status to: ${restData.status}`);
        }
        
        // Use the object without the virtual field
        Object.assign(finalData, restData);
        delete (finalData as any).isArchived;
      }
      
      // Only proceed if there's something to update
      if (Object.keys(finalData).length === 0) {
        return currentProject;
      }
      
      // Use SQL template literals to avoid parameterization issues
      const updates = Object.entries(finalData).map(([key, value]) => {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return sql`${sql.identifier([snakeKey])} = ${value}`;
      });
      
      // Build and execute the query
      const result = await db.execute(sql`
        UPDATE projects
        SET ${sql.join(updates, sql`, `)}
        WHERE id = ${id}
        RETURNING 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes
      `);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const updatedProject = result.rows[0];
      
      // Add virtual isArchived field based on status
      return {
        ...updatedProject,
        isArchived: updatedProject.status === "archived"
      };
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteProject(id: number): Promise<boolean> {
    try {
      // Delete all phases associated with this project
      const projectPhases = await this.getProjectPhasesByProjectId(id);
      for (const phase of projectPhases) {
        await this.deleteProjectPhase(phase.id);
      }
      
      // Delete all project documents associated with this project
      const projectDocuments = await this.getProjectDocumentsByProjectId(id);
      for (const document of projectDocuments) {
        await this.deleteProjectDocument(document.id);
      }
      
      // Delete the project itself
      const result = await db.delete(projects).where(eq(projects.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      return false;
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      console.log(`Retrieved ${processedResults.length} projects`);
      
      return processedResults;
    } catch (error) {
      console.error("Error fetching all projects:", error);
      // Return empty array as fallback
      return [];
    }
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE client_id = ${clientId}
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects for client ${clientId}:`, error);
      return [];
    }
  }
  
  async getProjectsByType(projectType: string): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE project_type = ${projectType}
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects for type ${projectType}:`, error);
      return [];
    }
  }
  
  async getProjectsByStatus(status: string): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE status = ${status}
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      console.log(`Retrieved ${processedResults.length} projects with status: ${status}`);
      
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects with status ${status}:`, error);
      return [];
    }
  }
  
  async getArchivedProjects(): Promise<Project[]> {
    return this.getProjectsByStatus("archived");
  }
  
  async getProjectPhase(id: number): Promise<ProjectPhase | undefined> {
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
    return phase || undefined;
  }
  
  async createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase> {
    const [result] = await db.insert(projectPhases).values({
      ...phase,
      status: phase.status ?? "pending",
      description: phase.description ?? null,
      notes: phase.notes ?? null,
      startDate: phase.startDate ?? null,
      endDate: phase.endDate ?? null,
      percentComplete: phase.percentComplete ?? null
    }).returning();
    return result;
  }
  
  async updateProjectPhase(id: number, data: Partial<ProjectPhase>): Promise<ProjectPhase | undefined> {
    const [result] = await db.update(projectPhases)
      .set(data)
      .where(eq(projectPhases.id, id))
      .returning();
    return result || undefined;
  }
  
  async deleteProjectPhase(id: number): Promise<boolean> {
    try {
      // First check if the phase exists
      const phase = await this.getProjectPhase(id);
      if (!phase) return false;
      
      // Delete the phase
      const result = await db.delete(projectPhases)
        .where(eq(projectPhases.id, id));
      
      // Return true if deletion was successful
      return true;
    } catch (error) {
      console.error("Error deleting project phase:", error);
      return false;
    }
  }
  
  async getProjectPhasesByProjectId(projectId: number): Promise<ProjectPhase[]> {
    return await db.select()
      .from(projectPhases)
      .where(eq(projectPhases.projectId, projectId))
      .orderBy(projectPhases.order);
  }

  // Project assignment operations
  async createProjectAssignment(insertAssignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [assignment] = await db.insert(projectAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    try {
      // Use SQL with COALESCE for backward compatibility with older database schemas
      const results = await db.execute(sql`
        SELECT 
          id, 
          role, 
          project_id as "projectId", 
          technician_id as "technicianId", 
          COALESCE(start_date, null) as "startDate", 
          COALESCE(end_date, null) as "endDate", 
          COALESCE(notes, null) as "notes", 
          COALESCE(phase_id, null) as "phaseId", 
          COALESCE(is_lead, false) as "isLead", 
          COALESCE(hours_allocated, null) as "hoursAllocated", 
          COALESCE(hours_logged, 0) as "hoursLogged"
        FROM project_assignments
        WHERE project_id = ${projectId}
      `);
      
      return results.rows as ProjectAssignment[];
    } catch (error) {
      console.error("Error fetching project assignments:", error);
      return [];
    }
  }

  // Maintenance operations
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    const [maintenance] = await db.select().from(maintenances).where(eq(maintenances.id, id));
    return maintenance || undefined;
  }

  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    // Ensure all required fields have proper default values for SmartWater style reporting
    const maintenanceWithDefaults = {
      ...insertMaintenance,
      status: insertMaintenance.status ?? "scheduled",
      notes: insertMaintenance.notes ?? null,
      completionDate: insertMaintenance.completionDate ?? null,
      startTime: insertMaintenance.startTime ?? null,
      endTime: insertMaintenance.endTime ?? null,
      customerFeedback: insertMaintenance.customerFeedback ?? null,
      customerNotes: insertMaintenance.customerNotes ?? null,
      invoiceAmount: insertMaintenance.invoiceAmount ?? null,
      laborCost: insertMaintenance.laborCost ?? null,
      totalChemicalCost: insertMaintenance.totalChemicalCost ?? null,
      profitAmount: insertMaintenance.profitAmount ?? null,
      profitPercentage: insertMaintenance.profitPercentage ?? null
    };
    
    const [maintenance] = await db.insert(maintenances).values(maintenanceWithDefaults).returning();
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
  
  async getIncompleteMaintenances(date: Date): Promise<Maintenance[]> {
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    return await db
      .select()
      .from(maintenances)
      .where(
        and(
          eq(maintenances.scheduleDate, dateStr),
          sql`(${maintenances.status} = 'scheduled' OR ${maintenances.status} = 'in_progress')`,
          sql`${maintenances.completionDate} IS NULL`
        )
      );
  }
  
  async rescheduleIncompleteMaintenances(): Promise<Maintenance[]> {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get incomplete maintenances from yesterday
    const incompleteMaintenances = await this.getIncompleteMaintenances(yesterday);
    
    // Reschedule each maintenance to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const rescheduledMaintenances: Maintenance[] = [];
    
    for (const maintenance of incompleteMaintenances) {
      // Add a note about the rescheduling
      const notes = maintenance.notes 
        ? `${maintenance.notes}\nAutomatically rescheduled from ${maintenance.scheduleDate}` 
        : `Automatically rescheduled from ${maintenance.scheduleDate}`;
      
      const updatedMaintenance = await this.updateMaintenance(maintenance.id, {
        scheduleDate: todayStr,
        notes: notes
      });
      
      if (updatedMaintenance) {
        rescheduledMaintenances.push(updatedMaintenance);
      }
    }
    
    return rescheduledMaintenances;
  }
  
  // Chemical Usage operations
  async getChemicalUsage(id: number): Promise<ChemicalUsage | undefined> {
    const [usage] = await db.select().from(chemicalUsage).where(eq(chemicalUsage.id, id));
    return usage || undefined;
  }
  
  async createChemicalUsage(insertUsage: InsertChemicalUsage): Promise<ChemicalUsage> {
    // Ensure all chemical usage fields have proper default values
    const usageWithDefaults = {
      ...insertUsage,
      notes: insertUsage.notes ?? null,
      reason: insertUsage.reason ?? null
    };
    
    const [usage] = await db.insert(chemicalUsage).values(usageWithDefaults).returning();
    return usage;
  }
  
  async getChemicalUsageByMaintenanceId(maintenanceId: number): Promise<ChemicalUsage[]> {
    return await db
      .select()
      .from(chemicalUsage)
      .where(eq(chemicalUsage.maintenanceId, maintenanceId))
      .orderBy(chemicalUsage.createdAt);
  }
  
  async getChemicalUsageByType(type: ChemicalType): Promise<ChemicalUsage[]> {
    return await db
      .select()
      .from(chemicalUsage)
      .where(eq(chemicalUsage.chemicalType, type))
      .orderBy(chemicalUsage.createdAt);
  }
  
  // Water Readings operations
  async getWaterReading(id: number): Promise<WaterReading | undefined> {
    const [reading] = await db.select().from(waterReadings).where(eq(waterReadings.id, id));
    return reading || undefined;
  }
  
  async createWaterReading(insertReading: InsertWaterReading): Promise<WaterReading> {
    // Ensure all water reading fields have proper default values
    const readingWithDefaults = {
      ...insertReading,
      phLevel: insertReading.phLevel ?? null,
      chlorineLevel: insertReading.chlorineLevel ?? null,
      alkalinity: insertReading.alkalinity ?? null,
      cyanuricAcid: insertReading.cyanuricAcid ?? null,
      calciumHardness: insertReading.calciumHardness ?? null,
      totalDissolvedSolids: insertReading.totalDissolvedSolids ?? null,
      saltLevel: insertReading.saltLevel ?? null,
      phosphates: insertReading.phosphates ?? null
    };
    
    const [reading] = await db.insert(waterReadings).values(readingWithDefaults).returning();
    return reading;
  }
  
  async getWaterReadingsByMaintenanceId(maintenanceId: number): Promise<WaterReading[]> {
    return await db
      .select()
      .from(waterReadings)
      .where(eq(waterReadings.maintenanceId, maintenanceId))
      .orderBy(waterReadings.createdAt);
  }
  
  async getLatestWaterReadingByClientId(clientId: number): Promise<WaterReading | undefined> {
    // Get all maintenance IDs for the client
    const clientMaintenances = await db
      .select()
      .from(maintenances)
      .where(eq(maintenances.clientId, clientId));
    
    if (clientMaintenances.length === 0) {
      return undefined;
    }
    
    const maintenanceIds = clientMaintenances.map(m => m.id);
    
    // Find the latest water reading for any of these maintenances
    const [latestReading] = await db
      .select()
      .from(waterReadings)
      .where(sql`${waterReadings.maintenanceId} IN (${maintenanceIds.join(',')})`)
      .orderBy(desc(waterReadings.createdAt))
      .limit(1);
    
    return latestReading || undefined;
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
    // Generate current date
    const now = new Date();
    // Create the invoice with the current date
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    
    // If needed, update the issue date separately
    if (invoice) {
      await db
        .update(invoices)
        .set({ issueDate: now })
        .where(eq(invoices.id, invoice.id));
    }
    
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

  // Pool Equipment operations
  async getPoolEquipment(id: number): Promise<PoolEquipment | undefined> {
    const [equipment] = await db.select().from(poolEquipment).where(eq(poolEquipment.id, id));
    return equipment || undefined;
  }
  
  async createPoolEquipment(insertEquipment: InsertPoolEquipment): Promise<PoolEquipment> {
    const [equipment] = await db.insert(poolEquipment).values(insertEquipment).returning();
    return equipment;
  }
  
  async updatePoolEquipment(id: number, data: Partial<PoolEquipment>): Promise<PoolEquipment | undefined> {
    const [updatedEquipment] = await db
      .update(poolEquipment)
      .set(data)
      .where(eq(poolEquipment.id, id))
      .returning();
    return updatedEquipment || undefined;
  }
  
  async getPoolEquipmentByClientId(clientId: number): Promise<PoolEquipment[]> {
    return await db.select().from(poolEquipment).where(eq(poolEquipment.clientId, clientId));
  }
  
  // Pool Images operations
  async getPoolImage(id: number): Promise<PoolImage | undefined> {
    const [image] = await db.select().from(poolImages).where(eq(poolImages.id, id));
    return image || undefined;
  }
  
  async createPoolImage(insertImage: InsertPoolImage): Promise<PoolImage> {
    const imageWithDate = {
      ...insertImage,
      uploadDate: new Date()
    };
    const [image] = await db.insert(poolImages).values(imageWithDate).returning();
    return image;
  }
  
  async getPoolImagesByClientId(clientId: number): Promise<PoolImage[]> {
    return await db.select().from(poolImages).where(eq(poolImages.clientId, clientId));
  }
  
  // Service Template operations
  async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
    const [template] = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id));
    return template || undefined;
  }
  
  async createServiceTemplate(insertTemplate: InsertServiceTemplate): Promise<ServiceTemplate> {
    // If this is being set as a default template for a service type, unset any existing defaults
    if (insertTemplate.isDefault) {
      await db
        .update(serviceTemplates)
        .set({ isDefault: false })
        .where(eq(serviceTemplates.type, insertTemplate.type));
    }
    
    const [template] = await db.insert(serviceTemplates).values(insertTemplate).returning();
    return template;
  }
  
  async updateServiceTemplate(id: number, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined> {
    // If this is being set as a default template, unset any existing defaults
    if (data.isDefault && data.type) {
      await db
        .update(serviceTemplates)
        .set({ isDefault: false })
        .where(eq(serviceTemplates.type, data.type));
    } else if (data.isDefault) {
      // Get the existing template to find its service type
      const [existingTemplate] = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id));
      if (existingTemplate) {
        await db
          .update(serviceTemplates)
          .set({ isDefault: false })
          .where(and(
            eq(serviceTemplates.type, existingTemplate.type),
            eq(serviceTemplates.isDefault, true)
          ));
      }
    }
    
    const [updatedTemplate] = await db
      .update(serviceTemplates)
      .set(data)
      .where(eq(serviceTemplates.id, id))
      .returning();
      
    return updatedTemplate || undefined;
  }
  
  async deleteServiceTemplate(id: number): Promise<boolean> {
    const [deletedTemplate] = await db
      .delete(serviceTemplates)
      .where(eq(serviceTemplates.id, id))
      .returning();
      
    return !!deletedTemplate;
  }
  
  async getAllServiceTemplates(): Promise<ServiceTemplate[]> {
    return await db.select().from(serviceTemplates);
  }
  
  async getDefaultServiceTemplate(type: string): Promise<ServiceTemplate | undefined> {
    const [template] = await db
      .select()
      .from(serviceTemplates)
      .where(and(
        eq(serviceTemplates.type, type),
        eq(serviceTemplates.isDefault, true)
      ));
      
    return template || undefined;
  }
  
  // Project Documentation operations
  async getProjectDocument(id: number): Promise<ProjectDocumentation | undefined> {
    const [document] = await db.select()
      .from(projectDocumentation)
      .where(eq(projectDocumentation.id, id));
    return document;
  }

  async createProjectDocument(document: InsertProjectDocumentation): Promise<ProjectDocumentation> {
    try {
      // Create a clean object without the uploadDate field - we'll let the DB handle it with defaultNow()
      const { uploadDate, ...cleanDocument } = document;
      
      const [result] = await db.insert(projectDocumentation)
        .values({
          ...cleanDocument,
          description: document.description ?? null,
          tags: document.tags ?? [],
          isPublic: document.isPublic ?? false
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error in createProjectDocument:", error);
      throw error;
    }
  }

  async updateProjectDocument(id: number, data: Partial<ProjectDocumentation>): Promise<ProjectDocumentation | undefined> {
    const [result] = await db.update(projectDocumentation)
      .set(data)
      .where(eq(projectDocumentation.id, id))
      .returning();
    return result;
  }

  async deleteProjectDocument(id: number): Promise<boolean> {
    const result = await db.delete(projectDocumentation)
      .where(eq(projectDocumentation.id, id));
    return !!result.count;
  }

  async getProjectDocumentsByProjectId(projectId: number): Promise<ProjectDocumentation[]> {
    return await db.select()
      .from(projectDocumentation)
      .where(eq(projectDocumentation.projectId, projectId))
      .orderBy(desc(projectDocumentation.uploadDate));
  }

  async getProjectDocumentsByPhaseId(phaseId: number): Promise<ProjectDocumentation[]> {
    return await db.select()
      .from(projectDocumentation)
      .where(eq(projectDocumentation.phaseId, phaseId))
      .orderBy(desc(projectDocumentation.uploadDate));
  }

  async getProjectDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocumentation[]> {
    return await db.select()
      .from(projectDocumentation)
      .where(and(
        eq(projectDocumentation.projectId, projectId),
        eq(projectDocumentation.documentType, documentType)
      ))
      .orderBy(desc(projectDocumentation.uploadDate));
  }

  // Route operations
  async getRoute(id: number): Promise<Route | undefined> {
    const result = await db.query.routes.findFirst({
      where: eq(routes.id, id),
      with: { technician: true },
    });

    return result;
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const [route] = await db
      .insert(routes)
      .values({
        ...insertRoute,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return route;
  }

  async updateRoute(id: number, data: Partial<Route>): Promise<Route | undefined> {
    const route = await this.getRoute(id);
    if (!route) return undefined;

    const [updatedRoute] = await db
      .update(routes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(routes.id, id))
      .returning();

    return updatedRoute;
  }

  async deleteRoute(id: number): Promise<boolean> {
    const route = await this.getRoute(id);
    if (!route) return false;

    // First delete all assignments associated with this route
    const assignments = await this.getRouteAssignmentsByRouteId(id);
    for (const assignment of assignments) {
      await this.deleteRouteAssignment(assignment.id);
    }

    await db.delete(routes).where(eq(routes.id, id));
    return true;
  }

  async getAllRoutes(): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)],
    });

    return result;
  }

  async getRoutesByTechnicianId(technicianId: number): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      where: eq(routes.technicianId, technicianId),
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)],
    });

    return result;
  }

  async getRoutesByDayOfWeek(dayOfWeek: string): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      where: eq(routes.dayOfWeek, dayOfWeek),
      with: { technician: true },
      orderBy: asc(routes.startTime),
    });

    return result;
  }

  async getRoutesByType(type: string): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      where: eq(routes.type, type),
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)],
    });

    return result;
  }

  // Route Assignment operations
  async getRouteAssignment(id: number): Promise<RouteAssignment | undefined> {
    const result = await db.query.routeAssignments.findFirst({
      where: eq(routeAssignments.id, id),
      with: { route: true, maintenance: true },
    });

    return result;
  }

  async createRouteAssignment(insertAssignment: InsertRouteAssignment): Promise<RouteAssignment> {
    const [assignment] = await db
      .insert(routeAssignments)
      .values({
        ...insertAssignment,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return assignment;
  }

  async updateRouteAssignment(id: number, data: Partial<RouteAssignment>): Promise<RouteAssignment | undefined> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return undefined;

    const [updatedAssignment] = await db
      .update(routeAssignments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(routeAssignments.id, id))
      .returning();

    return updatedAssignment;
  }

  async deleteRouteAssignment(id: number): Promise<boolean> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return false;

    await db.delete(routeAssignments).where(eq(routeAssignments.id, id));
    return true;
  }

  async getRouteAssignmentsByRouteId(routeId: number): Promise<RouteAssignment[]> {
    const result = await db.query.routeAssignments.findMany({
      where: eq(routeAssignments.routeId, routeId),
      with: { maintenance: true },
      orderBy: asc(routeAssignments.orderIndex),
    });

    return result;
  }

  async getRouteAssignmentsByMaintenanceId(maintenanceId: number): Promise<RouteAssignment[]> {
    const result = await db.query.routeAssignments.findMany({
      where: eq(routeAssignments.maintenanceId, maintenanceId),
      with: { route: true },
      orderBy: asc(routeAssignments.orderIndex),
    });

    return result;
  }

  async reorderRouteAssignments(routeId: number, assignmentIds: number[]): Promise<RouteAssignment[]> {
    const updatedAssignments: RouteAssignment[] = [];

    // Update each assignment with its new order index
    for (let index = 0; index < assignmentIds.length; index++) {
      const id = assignmentIds[index];
      const assignment = await this.getRouteAssignment(id);
      
      if (assignment && assignment.routeId === routeId) {
        const updatedAssignment = await this.updateRouteAssignment(assignment.id, { orderIndex: index });
        if (updatedAssignment) {
          updatedAssignments.push(updatedAssignment);
        }
      }
    }

    return updatedAssignments;
  }

  // Communication Provider operations
  async getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined> {
    const [provider] = await db.select().from(communicationProviders).where(eq(communicationProviders.id, id));
    return provider || undefined;
  }

  async getCommunicationProviderByType(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    const [provider] = await db.select().from(communicationProviders)
      .where(eq(communicationProviders.type, type))
      .orderBy(desc(communicationProviders.isDefault));
    return provider || undefined;
  }

  async createCommunicationProvider(insertProvider: InsertCommunicationProvider): Promise<CommunicationProvider> {
    // If this provider is marked as default, make sure no other provider of the same type is default
    if (insertProvider.isDefault) {
      await db.update(communicationProviders)
        .set({ isDefault: false })
        .where(and(
          eq(communicationProviders.type, insertProvider.type),
          eq(communicationProviders.isDefault, true)
        ));
    }
    
    const [provider] = await db.insert(communicationProviders)
      .values({
        ...insertProvider,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
      
    return provider;
  }

  async updateCommunicationProvider(id: number, data: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined> {
    // If this provider is being set as default, make sure no other provider of the same type is default
    if (data.isDefault) {
      const [provider] = await db.select().from(communicationProviders).where(eq(communicationProviders.id, id));
      
      if (provider) {
        await db.update(communicationProviders)
          .set({ isDefault: false })
          .where(and(
            eq(communicationProviders.type, provider.type),
            eq(communicationProviders.isDefault, true),
            sql`${communicationProviders.id} != ${id}`
          ));
      }
    }
    
    const [updatedProvider] = await db.update(communicationProviders)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(communicationProviders.id, id))
      .returning();
      
    return updatedProvider || undefined;
  }

  async deleteCommunicationProvider(id: number): Promise<boolean> {
    const result = await db.delete(communicationProviders)
      .where(eq(communicationProviders.id, id));
      
    return result.rowCount > 0;
  }

  async getAllCommunicationProviders(): Promise<CommunicationProvider[]> {
    return await db.select().from(communicationProviders);
  }

  async getDefaultCommunicationProvider(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    const [provider] = await db.select().from(communicationProviders)
      .where(and(
        eq(communicationProviders.type, type),
        eq(communicationProviders.isDefault, true)
      ));
      
    return provider || undefined;
  }
}

// Uncomment to use in-memory storage for testing
// export const storage = new MemStorage();

// Use database storage
export const storage = new DatabaseStorage();
