import { type User, type InsertUser, type Organization, type InsertOrganization, type Project, type InsertProject, type Repair, type InsertRepair, type ProjectPhase, type InsertProjectPhase, type ProjectDocument, type InsertProjectDocument, type Technician, type CommunicationProvider, type InsertCommunicationProvider, type Email, type InsertEmail, type EmailLink, type InsertEmailLink, type EmailTemplate, type InsertEmailTemplate, type ScheduledEmail, type InsertScheduledEmail, type Vendor, type InsertVendor, type CommunicationLink, type InsertCommunicationLink, type WorkOrder, type InsertWorkOrder, type WorkOrderNote, type InsertWorkOrderNote, type ServiceTemplate, type InsertServiceTemplate, type WorkOrderAuditLog, type InsertWorkOrderAuditLog, users, organizations, projects, repairs, projectPhases, projectDocuments, technicians, communicationProviders, emails, emailLinks, emailTemplatesTable, scheduledEmails, vendors, communicationLinks, workOrders, workOrderNotes, serviceTemplates, workOrderAuditLogs, smsMessages } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, lte, sql } from "drizzle-orm";

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
  
  // Technician operations
  getTechnicians(): Promise<Technician[]>;
  getTechnicianByUserId(userId: number): Promise<Technician | undefined>;
  
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
  deleteProjectWithCascade(id: number): Promise<boolean>;
  getProjectDeletionPreview(id: number): Promise<{
    phases: number;
    documents: number;
    workOrders: number;
    emailLinks: number;
    scheduledEmails: number;
    communicationLinks: number;
    smsMessages: number;
    teamAssignments: number;
  }>;
  
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
  
  // Document operations
  getProjectDocuments(projectId: number): Promise<ProjectDocument[]>;
  getDocument(id: number): Promise<ProjectDocument | undefined>;
  createDocument(document: InsertProjectDocument): Promise<ProjectDocument>;
  updateDocument(id: number, data: Partial<ProjectDocument>): Promise<ProjectDocument | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  getDocumentsByPhase(phaseId: number): Promise<ProjectDocument[]>;
  getDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocument[]>;

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

  // Communication Provider operations
  getCommunicationProviders(organizationId: number): Promise<CommunicationProvider[]>;
  getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined>;
  getCommunicationProvidersByType(type: string, organizationId: number): Promise<CommunicationProvider[]>;
  getDefaultCommunicationProvider(type: string, organizationId: number): Promise<CommunicationProvider | undefined>;
  createCommunicationProvider(provider: InsertCommunicationProvider): Promise<CommunicationProvider>;
  updateCommunicationProvider(id: number, data: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined>;
  deleteCommunicationProvider(id: number): Promise<boolean>;

  // Email operations
  getEmails(organizationId: number, limit?: number, offset?: number): Promise<Email[]>;
  getEmailsByProvider(providerId: number): Promise<Email[]>;
  getEmail(id: number): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  getEmailByExternalId(providerId: number, externalId: string): Promise<Email | undefined>;

  // Email Link operations
  getEmailLinksByEmail(emailId: number): Promise<EmailLink[]>;
  getEmailLinksByProject(projectId: number): Promise<EmailLink[]>;
  getEmailLinksByRepair(repairId: number): Promise<EmailLink[]>;
  getEmailLinksByClient(clientId: number): Promise<EmailLink[]>;
  createEmailLink(link: InsertEmailLink): Promise<EmailLink>;
  deleteEmailLink(id: number): Promise<boolean>;

  // Scheduled Email operations
  createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail>;
  getPendingScheduledEmails(before: Date, organizationId?: number): Promise<ScheduledEmail[]>;
  updateScheduledEmailStatus(id: number, status: string, error?: string): Promise<ScheduledEmail | undefined>;

  // Vendor operations
  getVendors(organizationId: number): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendorByPhone(phone: string, organizationId: number): Promise<Vendor | undefined>;
  getVendorByEmail(email: string, organizationId: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, data: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;

  // Communication Link operations
  getCommunicationLinks(communicationType: string, communicationId: number): Promise<CommunicationLink[]>;
  getCommunicationLinksByEntity(entityType: string, entityId: number): Promise<CommunicationLink[]>;
  createCommunicationLink(link: InsertCommunicationLink): Promise<CommunicationLink>;
  deleteCommunicationLink(id: number): Promise<boolean>;
  deleteCommunicationLinksByCommunication(communicationType: string, communicationId: number): Promise<boolean>;

  // Work Order operations
  getWorkOrders(organizationId?: number): Promise<WorkOrder[]>;
  getWorkOrder(id: number): Promise<WorkOrder | undefined>;
  getWorkOrdersByProject(projectId: number): Promise<WorkOrder[]>;
  getWorkOrdersByPhase(phaseId: number): Promise<WorkOrder[]>;
  getWorkOrdersByRepair(repairId: number): Promise<WorkOrder[]>;
  getWorkOrdersByMaintenance(maintenanceId: number): Promise<WorkOrder[]>;
  getWorkOrdersByTechnician(technicianId: number): Promise<WorkOrder[]>;
  getWorkOrdersByClient(clientId: number): Promise<WorkOrder[]>;
  getWorkOrdersByCategory(category: string, organizationId?: number): Promise<WorkOrder[]>;
  getWorkOrdersByStatus(status: string, organizationId?: number): Promise<WorkOrder[]>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<WorkOrder | undefined>;
  deleteWorkOrder(id: number): Promise<boolean>;

  // Work Order Note operations
  getWorkOrderNotes(workOrderId: number): Promise<WorkOrderNote[]>;
  createWorkOrderNote(note: InsertWorkOrderNote): Promise<WorkOrderNote>;
  deleteWorkOrderNote(id: number): Promise<boolean>;

  // Work Order Audit Log operations
  getWorkOrderAuditLogs(workOrderId: number): Promise<WorkOrderAuditLog[]>;
  createWorkOrderAuditLog(log: InsertWorkOrderAuditLog): Promise<WorkOrderAuditLog>;

  // Service Template operations
  getServiceTemplates(organizationId?: number): Promise<ServiceTemplate[]>;
  getServiceTemplate(id: number): Promise<ServiceTemplate | undefined>;
  getServiceTemplatesByType(type: string, organizationId?: number): Promise<ServiceTemplate[]>;
  getDefaultServiceTemplate(type: string, organizationId?: number): Promise<ServiceTemplate | undefined>;
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  updateServiceTemplate(id: number, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined>;
  deleteServiceTemplate(id: number): Promise<boolean>;
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

  // Technician operations
  async getTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getTechnicianByUserId(userId: number): Promise<Technician | undefined> {
    const result = await db.select().from(technicians).where(eq(technicians.userId, userId)).limit(1);
    return result[0] || undefined;
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
    // Let PostgreSQL handle ID generation via the serial sequence
    const result = await db.insert(projects).values(project).returning();
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

  async getProjectDeletionPreview(id: number): Promise<{
    phases: number;
    documents: number;
    workOrders: number;
    emailLinks: number;
    scheduledEmails: number;
    communicationLinks: number;
    smsMessages: number;
    teamAssignments: number;
  }> {
    // Get counts of all related records
    const phasesResult = await db.select().from(projectPhases).where(eq(projectPhases.projectId, id));
    const documentsResult = await db.select().from(projectDocuments).where(eq(projectDocuments.projectId, id));
    const workOrdersResult = await db.select().from(workOrders).where(eq(workOrders.projectId, id));
    const emailLinksResult = await db.select().from(emailLinks).where(eq(emailLinks.projectId, id));
    const scheduledEmailsResult = await db.select().from(scheduledEmails).where(eq(scheduledEmails.relatedProjectId, id));
    const communicationLinksResult = await db.select().from(communicationLinks).where(
      and(
        eq(communicationLinks.entityType, 'project'),
        eq(communicationLinks.entityId, id)
      )
    );
    const smsMessagesResult = await db.select().from(smsMessages).where(eq(smsMessages.projectId, id));
    
    // Count from tables not in ORM schema (use raw SQL)
    const assignmentsResult = await db.execute(sql`SELECT COUNT(*) as count FROM project_assignments WHERE project_id = ${id}`);
    const docResult = await db.execute(sql`SELECT COUNT(*) as count FROM project_documentation WHERE project_id = ${id}`);
    const assignmentsCount = Number((assignmentsResult.rows[0] as any)?.count || 0);
    const legacyDocsCount = Number((docResult.rows[0] as any)?.count || 0);

    return {
      phases: phasesResult.length,
      documents: documentsResult.length + legacyDocsCount,
      workOrders: workOrdersResult.length,
      emailLinks: emailLinksResult.length,
      scheduledEmails: scheduledEmailsResult.length,
      communicationLinks: communicationLinksResult.length,
      smsMessages: smsMessagesResult.length,
      teamAssignments: assignmentsCount
    };
  }

  async deleteProjectWithCascade(id: number): Promise<boolean> {
    try {
      // Use a transaction to ensure atomicity - all deletes succeed or none do
      const result = await db.transaction(async (tx) => {
        // Get work orders for this project to delete their related notes and audit logs
        const projectWorkOrders = await tx.select().from(workOrders).where(eq(workOrders.projectId, id));
        const workOrderIds = projectWorkOrders.map(wo => wo.id);

        // Delete work order notes and audit logs for these work orders
        if (workOrderIds.length > 0) {
          await tx.delete(workOrderNotes).where(inArray(workOrderNotes.workOrderId, workOrderIds));
          await tx.delete(workOrderAuditLogs).where(inArray(workOrderAuditLogs.workOrderId, workOrderIds));
        }

        // Delete from tables with FK constraints that aren't in the ORM schema (use raw SQL)
        await tx.execute(sql`DELETE FROM project_assignments WHERE project_id = ${id}`);
        await tx.execute(sql`DELETE FROM project_documentation WHERE project_id = ${id}`);

        // Delete related records in order (child tables first)
        await tx.delete(workOrders).where(eq(workOrders.projectId, id));
        await tx.delete(projectDocuments).where(eq(projectDocuments.projectId, id));
        await tx.delete(projectPhases).where(eq(projectPhases.projectId, id));
        await tx.delete(emailLinks).where(eq(emailLinks.projectId, id));
        await tx.delete(scheduledEmails).where(eq(scheduledEmails.relatedProjectId, id));
        await tx.delete(smsMessages).where(eq(smsMessages.projectId, id));
        await tx.delete(communicationLinks).where(
          and(
            eq(communicationLinks.entityType, 'project'),
            eq(communicationLinks.entityId, id)
          )
        );

        // Finally delete the project itself
        const deleteResult = await tx.delete(projects).where(eq(projects.id, id)).returning();
        return deleteResult.length > 0;
      });
      
      return result;
    } catch (error) {
      console.error('Error in deleteProjectWithCascade:', error);
      throw error;
    }
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
    // Let PostgreSQL handle ID generation via the serial sequence
    const result = await db.insert(repairs).values(repair).returning();
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
  
  // Document operations
  async getProjectDocuments(projectId: number): Promise<ProjectDocument[]> {
    return await db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId));
  }
  
  async getDocument(id: number): Promise<ProjectDocument | undefined> {
    const result = await db.select().from(projectDocuments).where(eq(projectDocuments.id, id)).limit(1);
    return result[0] || undefined;
  }
  
  async createDocument(document: InsertProjectDocument): Promise<ProjectDocument> {
    const result = await db.insert(projectDocuments).values(document).returning();
    return result[0];
  }
  
  async updateDocument(id: number, data: Partial<ProjectDocument>): Promise<ProjectDocument | undefined> {
    const result = await db.update(projectDocuments).set(data).where(eq(projectDocuments.id, id)).returning();
    return result[0] || undefined;
  }
  
  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(projectDocuments).where(eq(projectDocuments.id, id)).returning();
    return result.length > 0;
  }
  
  async getDocumentsByPhase(phaseId: number): Promise<ProjectDocument[]> {
    return await db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.phaseId, phaseId));
  }
  
  async getDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocument[]> {
    return await db.select()
      .from(projectDocuments)
      .where(and(
        eq(projectDocuments.projectId, projectId),
        eq(projectDocuments.documentType, documentType)
      ));
  }

  // Communication Provider operations
  async getCommunicationProviders(organizationId: number): Promise<CommunicationProvider[]> {
    return await db.select()
      .from(communicationProviders)
      .where(eq(communicationProviders.organizationId, organizationId));
  }

  async getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined> {
    const result = await db.select()
      .from(communicationProviders)
      .where(eq(communicationProviders.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async getCommunicationProvidersByType(type: string, organizationId: number): Promise<CommunicationProvider[]> {
    return await db.select()
      .from(communicationProviders)
      .where(and(
        eq(communicationProviders.type, type),
        eq(communicationProviders.organizationId, organizationId)
      ));
  }

  async getDefaultCommunicationProvider(type: string, organizationId: number): Promise<CommunicationProvider | undefined> {
    const result = await db.select()
      .from(communicationProviders)
      .where(and(
        eq(communicationProviders.type, type),
        eq(communicationProviders.organizationId, organizationId),
        eq(communicationProviders.isDefault, true)
      ))
      .limit(1);
    return result[0] || undefined;
  }

  async createCommunicationProvider(provider: InsertCommunicationProvider): Promise<CommunicationProvider> {
    const result = await db.insert(communicationProviders).values(provider).returning();
    return result[0];
  }

  async updateCommunicationProvider(id: number, data: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined> {
    const result = await db.update(communicationProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(communicationProviders.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteCommunicationProvider(id: number): Promise<boolean> {
    const result = await db.delete(communicationProviders)
      .where(eq(communicationProviders.id, id))
      .returning();
    return result.length > 0;
  }

  // Email operations
  async getEmails(organizationId: number, limit: number = 50, offset: number = 0): Promise<Email[]> {
    return await db.select()
      .from(emails)
      .where(eq(emails.organizationId, organizationId))
      .orderBy(desc(emails.receivedAt))
      .limit(limit)
      .offset(offset);
  }

  async getEmailsByProvider(providerId: number): Promise<Email[]> {
    return await db.select()
      .from(emails)
      .where(eq(emails.providerId, providerId))
      .orderBy(desc(emails.receivedAt));
  }

  async getEmail(id: number): Promise<Email | undefined> {
    const result = await db.select()
      .from(emails)
      .where(eq(emails.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    const result = await db.insert(emails).values(email).returning();
    return result[0];
  }

  async getEmailByExternalId(providerId: number, externalId: string): Promise<Email | undefined> {
    const result = await db.select()
      .from(emails)
      .where(and(
        eq(emails.providerId, providerId),
        eq(emails.externalId, externalId)
      ))
      .limit(1);
    return result[0] || undefined;
  }

  // Email Link operations
  async getEmailLinksByEmail(emailId: number): Promise<EmailLink[]> {
    return await db.select()
      .from(emailLinks)
      .where(eq(emailLinks.emailId, emailId));
  }

  async getEmailLinksByProject(projectId: number): Promise<EmailLink[]> {
    return await db.select()
      .from(emailLinks)
      .where(eq(emailLinks.projectId, projectId));
  }

  async getEmailLinksByRepair(repairId: number): Promise<EmailLink[]> {
    return await db.select()
      .from(emailLinks)
      .where(eq(emailLinks.repairId, repairId));
  }

  async getEmailLinksByClient(clientId: number): Promise<EmailLink[]> {
    return await db.select()
      .from(emailLinks)
      .where(eq(emailLinks.clientId, clientId));
  }

  async createEmailLink(link: InsertEmailLink): Promise<EmailLink> {
    const result = await db.insert(emailLinks).values(link).returning();
    return result[0];
  }

  async deleteEmailLink(id: number): Promise<boolean> {
    const result = await db.delete(emailLinks)
      .where(eq(emailLinks.id, id))
      .returning();
    return result.length > 0;
  }

  // Scheduled Email operations
  async createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail> {
    const result = await db.insert(scheduledEmails).values(email).returning();
    return result[0];
  }

  async getPendingScheduledEmails(before: Date, organizationId?: number): Promise<ScheduledEmail[]> {
    const conditions = [
      eq(scheduledEmails.status, 'pending'),
      lte(scheduledEmails.scheduledFor, before)
    ];
    
    if (organizationId !== undefined) {
      conditions.push(eq(scheduledEmails.organizationId, organizationId));
    }
    
    return await db.select()
      .from(scheduledEmails)
      .where(and(...conditions))
      .orderBy(scheduledEmails.scheduledFor);
  }

  async updateScheduledEmailStatus(id: number, status: string, error?: string): Promise<ScheduledEmail | undefined> {
    const updateData: Partial<ScheduledEmail> = { 
      status,
      sentAt: status === 'sent' ? new Date() : null
    };
    if (error) {
      updateData.errorMessage = error;
    }
    const result = await db.update(scheduledEmails)
      .set(updateData)
      .where(eq(scheduledEmails.id, id))
      .returning();
    return result[0] || undefined;
  }

  // Vendor operations
  async getVendors(organizationId: number): Promise<Vendor[]> {
    return await db.select()
      .from(vendors)
      .where(eq(vendors.organizationId, organizationId))
      .orderBy(vendors.name);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const result = await db.select()
      .from(vendors)
      .where(eq(vendors.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async getVendorByPhone(phone: string, organizationId: number): Promise<Vendor | undefined> {
    const result = await db.select()
      .from(vendors)
      .where(and(
        eq(vendors.phone, phone),
        eq(vendors.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || undefined;
  }

  async getVendorByEmail(email: string, organizationId: number): Promise<Vendor | undefined> {
    const result = await db.select()
      .from(vendors)
      .where(and(
        eq(vendors.email, email),
        eq(vendors.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || undefined;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const result = await db.insert(vendors).values(vendor).returning();
    return result[0];
  }

  async updateVendor(id: number, data: Partial<Vendor>): Promise<Vendor | undefined> {
    const result = await db.update(vendors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteVendor(id: number): Promise<boolean> {
    const result = await db.delete(vendors)
      .where(eq(vendors.id, id))
      .returning();
    return result.length > 0;
  }

  // Communication Link operations
  async getCommunicationLinks(communicationType: string, communicationId: number): Promise<CommunicationLink[]> {
    return await db.select()
      .from(communicationLinks)
      .where(and(
        eq(communicationLinks.communicationType, communicationType),
        eq(communicationLinks.communicationId, communicationId)
      ));
  }

  async getCommunicationLinksByEntity(entityType: string, entityId: number): Promise<CommunicationLink[]> {
    return await db.select()
      .from(communicationLinks)
      .where(and(
        eq(communicationLinks.entityType, entityType),
        eq(communicationLinks.entityId, entityId)
      ))
      .orderBy(desc(communicationLinks.linkedAt));
  }

  async createCommunicationLink(link: InsertCommunicationLink): Promise<CommunicationLink> {
    const result = await db.insert(communicationLinks).values(link).returning();
    return result[0];
  }

  async deleteCommunicationLink(id: number): Promise<boolean> {
    const result = await db.delete(communicationLinks)
      .where(eq(communicationLinks.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteCommunicationLinksByCommunication(communicationType: string, communicationId: number): Promise<boolean> {
    const result = await db.delete(communicationLinks)
      .where(and(
        eq(communicationLinks.communicationType, communicationType),
        eq(communicationLinks.communicationId, communicationId)
      ))
      .returning();
    return result.length > 0;
  }

  // Work Order operations
  async getWorkOrders(organizationId?: number): Promise<WorkOrder[]> {
    if (organizationId) {
      return await db.select()
        .from(workOrders)
        .where(eq(workOrders.organizationId, organizationId))
        .orderBy(desc(workOrders.createdAt));
    }
    return await db.select()
      .from(workOrders)
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const result = await db.select()
      .from(workOrders)
      .where(eq(workOrders.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async getWorkOrdersByProject(projectId: number): Promise<WorkOrder[]> {
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.projectId, projectId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByPhase(phaseId: number): Promise<WorkOrder[]> {
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.projectPhaseId, phaseId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByRepair(repairId: number): Promise<WorkOrder[]> {
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.repairId, repairId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByMaintenance(maintenanceId: number): Promise<WorkOrder[]> {
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.maintenanceAssignmentId, maintenanceId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByTechnician(technicianId: number): Promise<WorkOrder[]> {
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.technicianId, technicianId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByClient(clientId: number): Promise<WorkOrder[]> {
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.clientId, clientId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByCategory(category: string, organizationId?: number): Promise<WorkOrder[]> {
    if (organizationId) {
      return await db.select()
        .from(workOrders)
        .where(and(
          eq(workOrders.category, category),
          eq(workOrders.organizationId, organizationId)
        ))
        .orderBy(desc(workOrders.createdAt));
    }
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.category, category))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByStatus(status: string, organizationId?: number): Promise<WorkOrder[]> {
    if (organizationId) {
      return await db.select()
        .from(workOrders)
        .where(and(
          eq(workOrders.status, status),
          eq(workOrders.organizationId, organizationId)
        ))
        .orderBy(desc(workOrders.createdAt));
    }
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.status, status))
      .orderBy(desc(workOrders.createdAt));
  }

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const result = await db.insert(workOrders).values(workOrder).returning();
    return result[0];
  }

  async updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<WorkOrder | undefined> {
    const result = await db.update(workOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workOrders.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteWorkOrder(id: number): Promise<boolean> {
    const result = await db.delete(workOrders)
      .where(eq(workOrders.id, id))
      .returning();
    return result.length > 0;
  }

  // Work Order Note operations
  async getWorkOrderNotes(workOrderId: number): Promise<WorkOrderNote[]> {
    return await db.select()
      .from(workOrderNotes)
      .where(eq(workOrderNotes.workOrderId, workOrderId))
      .orderBy(desc(workOrderNotes.createdAt));
  }

  async createWorkOrderNote(note: InsertWorkOrderNote): Promise<WorkOrderNote> {
    const result = await db.insert(workOrderNotes).values(note).returning();
    return result[0];
  }

  async deleteWorkOrderNote(id: number): Promise<boolean> {
    const result = await db.delete(workOrderNotes)
      .where(eq(workOrderNotes.id, id))
      .returning();
    return result.length > 0;
  }

  // Work Order Audit Log operations
  async getWorkOrderAuditLogs(workOrderId: number): Promise<WorkOrderAuditLog[]> {
    return await db.select()
      .from(workOrderAuditLogs)
      .where(eq(workOrderAuditLogs.workOrderId, workOrderId))
      .orderBy(desc(workOrderAuditLogs.createdAt));
  }

  async createWorkOrderAuditLog(log: InsertWorkOrderAuditLog): Promise<WorkOrderAuditLog> {
    const result = await db.insert(workOrderAuditLogs).values(log).returning();
    return result[0];
  }

  // Service Template operations
  async getServiceTemplates(organizationId?: number): Promise<ServiceTemplate[]> {
    if (organizationId) {
      return await db.select()
        .from(serviceTemplates)
        .where(eq(serviceTemplates.organizationId, organizationId))
        .orderBy(desc(serviceTemplates.createdAt));
    }
    return await db.select()
      .from(serviceTemplates)
      .orderBy(desc(serviceTemplates.createdAt));
  }

  async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
    const result = await db.select()
      .from(serviceTemplates)
      .where(eq(serviceTemplates.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async getServiceTemplatesByType(type: string, organizationId?: number): Promise<ServiceTemplate[]> {
    if (organizationId) {
      return await db.select()
        .from(serviceTemplates)
        .where(and(
          eq(serviceTemplates.type, type),
          eq(serviceTemplates.organizationId, organizationId)
        ))
        .orderBy(desc(serviceTemplates.createdAt));
    }
    return await db.select()
      .from(serviceTemplates)
      .where(eq(serviceTemplates.type, type))
      .orderBy(desc(serviceTemplates.createdAt));
  }

  async getDefaultServiceTemplate(type: string, organizationId?: number): Promise<ServiceTemplate | undefined> {
    if (organizationId) {
      const result = await db.select()
        .from(serviceTemplates)
        .where(and(
          eq(serviceTemplates.type, type),
          eq(serviceTemplates.organizationId, organizationId),
          eq(serviceTemplates.isDefault, true)
        ))
        .limit(1);
      return result[0] || undefined;
    }
    const result = await db.select()
      .from(serviceTemplates)
      .where(and(
        eq(serviceTemplates.type, type),
        eq(serviceTemplates.isDefault, true)
      ))
      .limit(1);
    return result[0] || undefined;
  }

  async createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate> {
    const result = await db.insert(serviceTemplates).values(template).returning();
    return result[0];
  }

  async updateServiceTemplate(id: number, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined> {
    const result = await db.update(serviceTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceTemplates.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteServiceTemplate(id: number): Promise<boolean> {
    const result = await db.delete(serviceTemplates)
      .where(eq(serviceTemplates.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();