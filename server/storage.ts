import { type User, type InsertUser, type Organization, type InsertOrganization, type Project, type InsertProject, type Repair, type InsertRepair, type ProjectPhase, type InsertProjectPhase, users, organizations, projects, repairs, projectPhases } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  getUsersByOrganizationId(organizationId: number): Promise<User[]>; // Alias for getUsersByOrganization
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  getProjectsByClient(clientId: number): Promise<Project[]>;
  getProjectsByOrganization(organizationId: number, clients: number[]): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Repair operations
  getRepair(id: number): Promise<Repair | undefined>;
  getRepairs(): Promise<Repair[]>;
  getRepairsByClient(clientId: number): Promise<Repair[]>;
  getRepairsByTechnician(technicianId: number): Promise<Repair[]>;
  createRepair(repair: InsertRepair): Promise<Repair>;
  updateRepair(id: number, data: Partial<Repair>): Promise<Repair | undefined>;
  deleteRepair(id: number): Promise<boolean>;

  // Project Phase operations
  getProjectPhase(id: number): Promise<ProjectPhase | undefined>;
  getProjectPhases(projectId: number): Promise<ProjectPhase[]>;
  createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase>;
  updateProjectPhase(id: number, data: Partial<ProjectPhase>): Promise<ProjectPhase | undefined>;
  deleteProjectPhase(id: number): Promise<boolean>;

  // Additional methods needed by various routes
  getSubscriptionPlan?(planId: number): Promise<any>;
  getInventoryItemsByOrganizationId?(organizationId: number): Promise<any[]>;
  getAllInventoryItems?(): Promise<any[]>;
  getAllWarehouses?(): Promise<any[]>;
  getAllTechnicianVehicles?(): Promise<any[]>;
  getLowStockItems?(): Promise<any[]>;
  getInventoryTransfersByStatus?(status: string): Promise<any[]>;
  getInventoryItem?(id: number): Promise<any>;
  getBazzaRoutesByTechnicianId?(technicianId: number): Promise<any[]>;
  getAllBazzaRoutes?(): Promise<any[]>;
  getPaymentRecordsByOrganizationId?(organizationId: number): Promise<any[]>;
  getFleetmaticsConfigByOrganizationId?(organizationId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0] || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result[0] || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }
  
  // Alias for getUsersByOrganization (needed by user-org-routes)
  async getUsersByOrganizationId(organizationId: number): Promise<User[]> {
    return this.getUsersByOrganization(organizationId);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    return result[0] || undefined;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(org).returning();
    return result[0];
  }

  async updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined> {
    const result = await db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
    return result[0] || undefined;
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async getProjectsByOrganization(organizationId: number, clientIds: number[]): Promise<Project[]> {
    if (clientIds.length === 0) return [];
    const result = await db.select()
      .from(projects)
      .where(inArray(projects.clientId, clientIds));
    return result;
  }

  async createProject(project: InsertProject): Promise<Project> {
    // Generate a unique ID for the project
    const maxIdResult = await db.select({ maxId: projects.id }).from(projects).orderBy(projects.id).limit(1);
    const newId = (maxIdResult[0]?.maxId || 0) + 1;
    
    const projectWithId = { ...project, id: newId };
    const result = await db.insert(projects).values([projectWithId]).returning();
    return result[0];
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    const result = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  // Repair operations
  async getRepair(id: number): Promise<Repair | undefined> {
    const result = await db.select().from(repairs).where(eq(repairs.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getRepairs(): Promise<Repair[]> {
    return await db.select().from(repairs);
  }

  async getRepairsByClient(clientId: number): Promise<Repair[]> {
    return await db.select().from(repairs).where(eq(repairs.clientId, clientId));
  }

  async getRepairsByTechnician(technicianId: number): Promise<Repair[]> {
    if (!technicianId) return [];
    return await db.select().from(repairs).where(eq(repairs.technicianId, technicianId));
  }

  async createRepair(repair: InsertRepair): Promise<Repair> {
    // Generate a unique ID for the repair
    const maxIdResult = await db.select({ maxId: repairs.id }).from(repairs).orderBy(repairs.id).limit(1);
    const newId = (maxIdResult[0]?.maxId || 0) + 1;
    
    const repairWithId = { ...repair, id: newId };
    const result = await db.insert(repairs).values([repairWithId]).returning();
    return result[0];
  }

  async updateRepair(id: number, data: Partial<Repair>): Promise<Repair | undefined> {
    const result = await db.update(repairs).set(data).where(eq(repairs.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteRepair(id: number): Promise<boolean> {
    const result = await db.delete(repairs).where(eq(repairs.id, id)).returning();
    return result.length > 0;
  }

  // Project Phase operations
  async getProjectPhase(id: number): Promise<ProjectPhase | undefined> {
    const result = await db.select().from(projectPhases).where(eq(projectPhases.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getProjectPhases(projectId: number): Promise<ProjectPhase[]> {
    return await db.select()
      .from(projectPhases)
      .where(eq(projectPhases.projectId, projectId));
  }

  async createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase> {
    const result = await db.insert(projectPhases).values(phase).returning();
    return result[0];
  }

  async updateProjectPhase(id: number, data: Partial<ProjectPhase>): Promise<ProjectPhase | undefined> {
    const result = await db.update(projectPhases).set(data).where(eq(projectPhases.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteProjectPhase(id: number): Promise<boolean> {
    const result = await db.delete(projectPhases).where(eq(projectPhases.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();