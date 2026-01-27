import { type User, type InsertUser, type Organization, type InsertOrganization, type Project, type InsertProject, type Repair, type InsertRepair, type ProjectPhase, type InsertProjectPhase, type ProjectDocument, type InsertProjectDocument, type Technician, type CommunicationProvider, type InsertCommunicationProvider, type Email, type InsertEmail, type EmailLink, type InsertEmailLink, type EmailTemplate, type InsertEmailTemplate, type ScheduledEmail, type InsertScheduledEmail, type Vendor, type InsertVendor, type CommunicationLink, type InsertCommunicationLink, type WorkOrder, type InsertWorkOrder, type WorkOrderNote, type InsertWorkOrderNote, type ServiceTemplate, type InsertServiceTemplate, type WorkOrderAuditLog, type InsertWorkOrderAuditLog, type Invoice, type InsertInvoice, type InvoiceItem, type InsertInvoiceItem, type InvoicePayment, type InsertInvoicePayment, type WorkOrderRequest, type InsertWorkOrderRequest, type WorkOrderItem, type InsertWorkOrderItem, type WorkOrderTimeEntry, type InsertWorkOrderTimeEntry, type WorkOrderTeamMember, type InsertWorkOrderTeamMember, type BazzaMaintenanceAssignment, type Maintenance, type InsertMaintenance, type EmailAttachment, type InsertEmailAttachment, type VendorInvoice, type InsertVendorInvoice, type VendorInvoiceItem, type InsertVendorInvoiceItem, type Expense, type InsertExpense, type InventoryItem, type InsertInventoryItem, type VendorParsingTemplate, type InsertVendorParsingTemplate, users, organizations, projects, repairs, projectPhases, projectDocuments, technicians, communicationProviders, emails, emailLinks, emailTemplatesTable, scheduledEmails, vendors, communicationLinks, workOrders, workOrderNotes, serviceTemplates, workOrderAuditLogs, smsMessages, invoices, invoiceItems, invoicePayments, workOrderRequests, workOrderItems, workOrderTimeEntries, workOrderTeamMembers, bazzaMaintenanceAssignments, maintenances, emailAttachments, vendorInvoices, vendorInvoiceItems, expenses, inventoryItems, vendorParsingTemplates } from "@shared/schema";
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

  // Invoice operations
  getInvoices(organizationId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string, organizationId: number): Promise<Invoice | undefined>;
  getInvoicesByClient(clientId: number): Promise<Invoice[]>;
  getInvoicesByStatus(status: string, organizationId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getNextInvoiceNumber(organizationId: number): Promise<string>;

  // Invoice Item operations
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, data: Partial<InvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: number): Promise<boolean>;
  deleteInvoiceItemsByInvoice(invoiceId: number): Promise<boolean>;

  // Invoice Payment operations
  getInvoicePayments(invoiceId: number): Promise<InvoicePayment[]>;
  createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment>;
  deleteInvoicePayment(id: number): Promise<boolean>;

  // Work Order Request operations
  getWorkOrderRequests(organizationId?: number): Promise<WorkOrderRequest[]>;
  getWorkOrderRequest(id: number): Promise<WorkOrderRequest | undefined>;
  getWorkOrderRequestsByClient(clientId: number): Promise<WorkOrderRequest[]>;
  getWorkOrderRequestsByStatus(status: string, organizationId?: number): Promise<WorkOrderRequest[]>;
  createWorkOrderRequest(request: InsertWorkOrderRequest): Promise<WorkOrderRequest>;
  updateWorkOrderRequest(id: number, data: Partial<WorkOrderRequest>): Promise<WorkOrderRequest | undefined>;
  deleteWorkOrderRequest(id: number): Promise<boolean>;
  getWorkOrdersByRequest(requestId: number): Promise<WorkOrder[]>;

  // Work Order Item operations (parts/labor)
  getWorkOrderItems(workOrderId: number): Promise<WorkOrderItem[]>;
  createWorkOrderItem(item: InsertWorkOrderItem): Promise<WorkOrderItem>;
  updateWorkOrderItem(id: number, data: Partial<WorkOrderItem>): Promise<WorkOrderItem | undefined>;
  deleteWorkOrderItem(id: number): Promise<boolean>;
  deleteWorkOrderItemsByWorkOrder(workOrderId: number): Promise<boolean>;

  // Work Order Time Entry operations
  getWorkOrderTimeEntries(workOrderId: number): Promise<WorkOrderTimeEntry[]>;
  getWorkOrderTimeEntriesByUser(userId: number): Promise<WorkOrderTimeEntry[]>;
  createWorkOrderTimeEntry(entry: InsertWorkOrderTimeEntry): Promise<WorkOrderTimeEntry>;
  updateWorkOrderTimeEntry(id: number, data: Partial<WorkOrderTimeEntry>): Promise<WorkOrderTimeEntry | undefined>;
  deleteWorkOrderTimeEntry(id: number): Promise<boolean>;

  // Work Order Team Member operations
  getWorkOrderTeamMembers(workOrderId: number): Promise<WorkOrderTeamMember[]>;
  createWorkOrderTeamMember(member: InsertWorkOrderTeamMember): Promise<WorkOrderTeamMember>;
  updateWorkOrderTeamMember(id: number, data: Partial<WorkOrderTeamMember>): Promise<WorkOrderTeamMember | undefined>;
  deleteWorkOrderTeamMember(id: number): Promise<boolean>;

  // Bazza Maintenance Assignment operations
  getMaintenanceAssignment(id: number): Promise<BazzaMaintenanceAssignment | undefined>;

  // Email Attachment operations
  getEmailAttachments(emailId: number): Promise<EmailAttachment[]>;
  getEmailAttachment(id: number): Promise<EmailAttachment | undefined>;
  getEmailAttachmentsByOrganization(organizationId: number): Promise<EmailAttachment[]>;
  createEmailAttachment(attachment: InsertEmailAttachment): Promise<EmailAttachment>;
  updateEmailAttachment(id: number, data: Partial<EmailAttachment>): Promise<EmailAttachment | undefined>;
  deleteEmailAttachment(id: number): Promise<boolean>;

  // Vendor Invoice operations
  getVendorInvoices(organizationId: number): Promise<VendorInvoice[]>;
  getVendorInvoice(id: number): Promise<VendorInvoice | undefined>;
  getVendorInvoicesByVendor(vendorId: number): Promise<VendorInvoice[]>;
  getVendorInvoicesByStatus(status: string, organizationId: number): Promise<VendorInvoice[]>;
  createVendorInvoice(invoice: InsertVendorInvoice): Promise<VendorInvoice>;
  updateVendorInvoice(id: number, data: Partial<VendorInvoice>): Promise<VendorInvoice | undefined>;
  deleteVendorInvoice(id: number): Promise<boolean>;

  // Vendor Invoice Item operations
  getVendorInvoiceItems(vendorInvoiceId: number): Promise<VendorInvoiceItem[]>;
  createVendorInvoiceItem(item: InsertVendorInvoiceItem): Promise<VendorInvoiceItem>;
  updateVendorInvoiceItem(id: number, data: Partial<VendorInvoiceItem>): Promise<VendorInvoiceItem | undefined>;
  deleteVendorInvoiceItem(id: number): Promise<boolean>;
  deleteVendorInvoiceItemsByInvoice(vendorInvoiceId: number): Promise<boolean>;

  // Expense operations
  getExpenses(organizationId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;

  // Inventory Item operations (for vendor invoice integration)
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemsByOrganizationId(organizationId: number): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem | undefined>;

  // Vendor Parsing Template operations
  getVendorParsingTemplates(vendorId: number): Promise<VendorParsingTemplate[]>;
  getVendorParsingTemplate(id: number): Promise<VendorParsingTemplate | undefined>;
  getActiveVendorParsingTemplate(vendorId: number): Promise<VendorParsingTemplate | undefined>;
  createVendorParsingTemplate(template: InsertVendorParsingTemplate): Promise<VendorParsingTemplate>;
  updateVendorParsingTemplate(id: number, data: Partial<VendorParsingTemplate>): Promise<VendorParsingTemplate | undefined>;
  deleteVendorParsingTemplate(id: number): Promise<boolean>;
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

  // Invoice operations
  async getInvoices(organizationId: number): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const result = await db.select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async getInvoiceByNumber(invoiceNumber: string, organizationId: number): Promise<Invoice | undefined> {
    const result = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.invoiceNumber, invoiceNumber),
        eq(invoices.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || undefined;
  }

  async getInvoicesByClient(clientId: number): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(eq(invoices.clientId, clientId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByStatus(status: string, organizationId: number): Promise<Invoice[]> {
    return await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.status, status),
        eq(invoices.organizationId, organizationId)
      ))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(invoices)
      .where(eq(invoices.id, id))
      .returning();
    return result.length > 0;
  }

  async getNextInvoiceNumber(organizationId: number): Promise<string> {
    const result = await db.select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.invoiceNumber))
      .limit(1);
    
    if (result.length === 0 || !result[0].invoiceNumber) {
      return 'INV-00001';
    }
    
    const lastNumber = result[0].invoiceNumber;
    const match = lastNumber.match(/INV-(\d+)/);
    if (!match) {
      return 'INV-00001';
    }
    
    const nextNum = parseInt(match[1], 10) + 1;
    return `INV-${nextNum.toString().padStart(5, '0')}`;
  }

  // Invoice Item operations
  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .orderBy(invoiceItems.sortOrder);
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const result = await db.insert(invoiceItems).values(item).returning();
    return result[0];
  }

  async updateInvoiceItem(id: number, data: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const result = await db.update(invoiceItems)
      .set(data)
      .where(eq(invoiceItems.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(invoiceItems)
      .where(eq(invoiceItems.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteInvoiceItemsByInvoice(invoiceId: number): Promise<boolean> {
    await db.delete(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));
    return true;
  }

  // Invoice Payment operations
  async getInvoicePayments(invoiceId: number): Promise<InvoicePayment[]> {
    return await db.select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId))
      .orderBy(desc(invoicePayments.createdAt));
  }

  async createInvoicePayment(payment: InsertInvoicePayment): Promise<InvoicePayment> {
    const result = await db.insert(invoicePayments).values(payment).returning();
    return result[0];
  }

  async deleteInvoicePayment(id: number): Promise<boolean> {
    const result = await db.delete(invoicePayments)
      .where(eq(invoicePayments.id, id))
      .returning();
    return result.length > 0;
  }

  // Work Order Request operations
  async getWorkOrderRequests(organizationId?: number): Promise<WorkOrderRequest[]> {
    if (organizationId) {
      return await db.select()
        .from(workOrderRequests)
        .where(eq(workOrderRequests.organizationId, organizationId))
        .orderBy(desc(workOrderRequests.createdAt));
    }
    return await db.select()
      .from(workOrderRequests)
      .orderBy(desc(workOrderRequests.createdAt));
  }

  async getWorkOrderRequest(id: number): Promise<WorkOrderRequest | undefined> {
    const result = await db.select()
      .from(workOrderRequests)
      .where(eq(workOrderRequests.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async getWorkOrderRequestsByClient(clientId: number): Promise<WorkOrderRequest[]> {
    return await db.select()
      .from(workOrderRequests)
      .where(eq(workOrderRequests.clientId, clientId))
      .orderBy(desc(workOrderRequests.createdAt));
  }

  async getWorkOrderRequestsByStatus(status: string, organizationId?: number): Promise<WorkOrderRequest[]> {
    if (organizationId) {
      return await db.select()
        .from(workOrderRequests)
        .where(and(
          eq(workOrderRequests.status, status),
          eq(workOrderRequests.organizationId, organizationId)
        ))
        .orderBy(desc(workOrderRequests.createdAt));
    }
    return await db.select()
      .from(workOrderRequests)
      .where(eq(workOrderRequests.status, status))
      .orderBy(desc(workOrderRequests.createdAt));
  }

  async createWorkOrderRequest(request: InsertWorkOrderRequest): Promise<WorkOrderRequest> {
    const result = await db.insert(workOrderRequests).values(request).returning();
    return result[0];
  }

  async updateWorkOrderRequest(id: number, data: Partial<WorkOrderRequest>): Promise<WorkOrderRequest | undefined> {
    const result = await db.update(workOrderRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workOrderRequests.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteWorkOrderRequest(id: number): Promise<boolean> {
    const result = await db.delete(workOrderRequests)
      .where(eq(workOrderRequests.id, id))
      .returning();
    return result.length > 0;
  }

  async getWorkOrdersByRequest(requestId: number): Promise<WorkOrder[]> {
    return await db.select()
      .from(workOrders)
      .where(eq(workOrders.workOrderRequestId, requestId))
      .orderBy(desc(workOrders.createdAt));
  }

  // Work Order Item operations (parts/labor)
  async getWorkOrderItems(workOrderId: number): Promise<WorkOrderItem[]> {
    return await db.select()
      .from(workOrderItems)
      .where(eq(workOrderItems.workOrderId, workOrderId))
      .orderBy(workOrderItems.createdAt);
  }

  async createWorkOrderItem(item: InsertWorkOrderItem): Promise<WorkOrderItem> {
    const result = await db.insert(workOrderItems).values(item).returning();
    return result[0];
  }

  async updateWorkOrderItem(id: number, data: Partial<WorkOrderItem>): Promise<WorkOrderItem | undefined> {
    const result = await db.update(workOrderItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workOrderItems.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteWorkOrderItem(id: number): Promise<boolean> {
    const result = await db.delete(workOrderItems)
      .where(eq(workOrderItems.id, id))
      .returning();
    return result.length > 0;
  }

  async deleteWorkOrderItemsByWorkOrder(workOrderId: number): Promise<boolean> {
    await db.delete(workOrderItems)
      .where(eq(workOrderItems.workOrderId, workOrderId));
    return true;
  }

  // Work Order Time Entry operations
  async getWorkOrderTimeEntries(workOrderId: number): Promise<WorkOrderTimeEntry[]> {
    return await db.select()
      .from(workOrderTimeEntries)
      .where(eq(workOrderTimeEntries.workOrderId, workOrderId))
      .orderBy(desc(workOrderTimeEntries.clockIn));
  }

  async getWorkOrderTimeEntriesByUser(userId: number): Promise<WorkOrderTimeEntry[]> {
    return await db.select()
      .from(workOrderTimeEntries)
      .where(eq(workOrderTimeEntries.userId, userId))
      .orderBy(desc(workOrderTimeEntries.clockIn));
  }

  async createWorkOrderTimeEntry(entry: InsertWorkOrderTimeEntry): Promise<WorkOrderTimeEntry> {
    const result = await db.insert(workOrderTimeEntries).values(entry).returning();
    return result[0];
  }

  async updateWorkOrderTimeEntry(id: number, data: Partial<WorkOrderTimeEntry>): Promise<WorkOrderTimeEntry | undefined> {
    const result = await db.update(workOrderTimeEntries)
      .set(data)
      .where(eq(workOrderTimeEntries.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteWorkOrderTimeEntry(id: number): Promise<boolean> {
    const result = await db.delete(workOrderTimeEntries)
      .where(eq(workOrderTimeEntries.id, id))
      .returning();
    return result.length > 0;
  }

  // Work Order Team Member operations
  async getWorkOrderTeamMembers(workOrderId: number): Promise<WorkOrderTeamMember[]> {
    return await db.select()
      .from(workOrderTeamMembers)
      .where(eq(workOrderTeamMembers.workOrderId, workOrderId))
      .orderBy(workOrderTeamMembers.assignedAt);
  }

  async createWorkOrderTeamMember(member: InsertWorkOrderTeamMember): Promise<WorkOrderTeamMember> {
    const result = await db.insert(workOrderTeamMembers).values(member).returning();
    return result[0];
  }

  async updateWorkOrderTeamMember(id: number, data: Partial<WorkOrderTeamMember>): Promise<WorkOrderTeamMember | undefined> {
    const result = await db.update(workOrderTeamMembers)
      .set(data)
      .where(eq(workOrderTeamMembers.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteWorkOrderTeamMember(id: number): Promise<boolean> {
    const result = await db.delete(workOrderTeamMembers)
      .where(eq(workOrderTeamMembers.id, id))
      .returning();
    return result.length > 0;
  }

  // Bazza Maintenance Assignment operations
  async getMaintenanceAssignment(id: number): Promise<BazzaMaintenanceAssignment | undefined> {
    const result = await db.select()
      .from(bazzaMaintenanceAssignments)
      .where(eq(bazzaMaintenanceAssignments.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  // Maintenance operations (pool service maintenances)
  async getMaintenances(): Promise<Maintenance[]> {
    return db.select().from(maintenances).orderBy(desc(maintenances.scheduleDate));
  }

  async getMaintenancesByClientIds(clientIds: number[]): Promise<Maintenance[]> {
    if (clientIds.length === 0) return [];
    return db.select()
      .from(maintenances)
      .where(inArray(maintenances.clientId, clientIds))
      .orderBy(desc(maintenances.scheduleDate));
  }

  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    const result = await db.select()
      .from(maintenances)
      .where(eq(maintenances.id, id))
      .limit(1);
    return result[0] || undefined;
  }

  async getMaintenancesByClientId(clientId: number): Promise<Maintenance[]> {
    return db.select()
      .from(maintenances)
      .where(eq(maintenances.clientId, clientId))
      .orderBy(desc(maintenances.scheduleDate));
  }

  async createMaintenance(data: InsertMaintenance): Promise<Maintenance> {
    const result = await db.insert(maintenances).values(data).returning();
    return result[0];
  }

  async updateMaintenance(id: number, data: Partial<InsertMaintenance>): Promise<Maintenance | undefined> {
    const result = await db.update(maintenances)
      .set(data)
      .where(eq(maintenances.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteMaintenance(id: number): Promise<boolean> {
    const result = await db.delete(maintenances)
      .where(eq(maintenances.id, id))
      .returning();
    return result.length > 0;
  }

  // Email Attachment operations
  async getEmailAttachments(emailId: number): Promise<EmailAttachment[]> {
    return db.select().from(emailAttachments).where(eq(emailAttachments.emailId, emailId));
  }

  async getEmailAttachment(id: number): Promise<EmailAttachment | undefined> {
    const result = await db.select().from(emailAttachments).where(eq(emailAttachments.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getEmailAttachmentsByOrganization(organizationId: number): Promise<EmailAttachment[]> {
    return db.select().from(emailAttachments).where(eq(emailAttachments.organizationId, organizationId));
  }

  async createEmailAttachment(attachment: InsertEmailAttachment): Promise<EmailAttachment> {
    const result = await db.insert(emailAttachments).values(attachment).returning();
    return result[0];
  }

  async updateEmailAttachment(id: number, data: Partial<EmailAttachment>): Promise<EmailAttachment | undefined> {
    const result = await db.update(emailAttachments).set(data).where(eq(emailAttachments.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteEmailAttachment(id: number): Promise<boolean> {
    const result = await db.delete(emailAttachments).where(eq(emailAttachments.id, id)).returning();
    return result.length > 0;
  }

  // Vendor Invoice operations
  async getVendorInvoices(organizationId: number): Promise<VendorInvoice[]> {
    return db.select().from(vendorInvoices).where(eq(vendorInvoices.organizationId, organizationId)).orderBy(desc(vendorInvoices.invoiceDate));
  }

  async getVendorInvoice(id: number): Promise<VendorInvoice | undefined> {
    const result = await db.select().from(vendorInvoices).where(eq(vendorInvoices.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getVendorInvoicesByVendor(vendorId: number): Promise<VendorInvoice[]> {
    return db.select().from(vendorInvoices).where(eq(vendorInvoices.vendorId, vendorId)).orderBy(desc(vendorInvoices.invoiceDate));
  }

  async getVendorInvoicesByStatus(status: string, organizationId: number): Promise<VendorInvoice[]> {
    return db.select().from(vendorInvoices).where(
      and(
        eq(vendorInvoices.status, status),
        eq(vendorInvoices.organizationId, organizationId)
      )
    ).orderBy(desc(vendorInvoices.invoiceDate));
  }

  async createVendorInvoice(invoice: InsertVendorInvoice): Promise<VendorInvoice> {
    const result = await db.insert(vendorInvoices).values(invoice).returning();
    return result[0];
  }

  async updateVendorInvoice(id: number, data: Partial<VendorInvoice>): Promise<VendorInvoice | undefined> {
    const result = await db.update(vendorInvoices).set(data).where(eq(vendorInvoices.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteVendorInvoice(id: number): Promise<boolean> {
    const result = await db.delete(vendorInvoices).where(eq(vendorInvoices.id, id)).returning();
    return result.length > 0;
  }

  // Vendor Invoice Item operations
  async getVendorInvoiceItems(vendorInvoiceId: number): Promise<VendorInvoiceItem[]> {
    return db.select().from(vendorInvoiceItems).where(eq(vendorInvoiceItems.vendorInvoiceId, vendorInvoiceId));
  }

  async createVendorInvoiceItem(item: InsertVendorInvoiceItem): Promise<VendorInvoiceItem> {
    const result = await db.insert(vendorInvoiceItems).values(item).returning();
    return result[0];
  }

  async updateVendorInvoiceItem(id: number, data: Partial<VendorInvoiceItem>): Promise<VendorInvoiceItem | undefined> {
    const result = await db.update(vendorInvoiceItems).set(data).where(eq(vendorInvoiceItems.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteVendorInvoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(vendorInvoiceItems).where(eq(vendorInvoiceItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteVendorInvoiceItemsByInvoice(vendorInvoiceId: number): Promise<boolean> {
    const result = await db.delete(vendorInvoiceItems).where(eq(vendorInvoiceItems.vendorInvoiceId, vendorInvoiceId)).returning();
    return result.length >= 0;
  }

  // Expense operations
  async getExpenses(organizationId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.organizationId, organizationId)).orderBy(desc(expenses.date));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0] || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(expense).returning();
    return result[0];
  }

  async updateExpense(id: number, data: Partial<Expense>): Promise<Expense | undefined> {
    const result = await db.update(expenses).set(data).where(eq(expenses.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }

  // Inventory Item operations
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getInventoryItemsByOrganizationId(organizationId: number): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, organizationId));
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const result = await db.insert(inventoryItems).values(item).returning();
    return result[0];
  }

  async updateInventoryItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const result = await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id)).returning();
    return result[0] || undefined;
  }

  // Vendor Parsing Template operations
  async getVendorParsingTemplates(vendorId: number): Promise<VendorParsingTemplate[]> {
    return db.select().from(vendorParsingTemplates).where(eq(vendorParsingTemplates.vendorId, vendorId)).orderBy(desc(vendorParsingTemplates.createdAt));
  }

  async getVendorParsingTemplate(id: number): Promise<VendorParsingTemplate | undefined> {
    const result = await db.select().from(vendorParsingTemplates).where(eq(vendorParsingTemplates.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getActiveVendorParsingTemplate(vendorId: number): Promise<VendorParsingTemplate | undefined> {
    const result = await db.select().from(vendorParsingTemplates)
      .where(and(eq(vendorParsingTemplates.vendorId, vendorId), eq(vendorParsingTemplates.isActive, true)))
      .orderBy(desc(vendorParsingTemplates.timesUsed))
      .limit(1);
    return result[0] || undefined;
  }

  async createVendorParsingTemplate(template: InsertVendorParsingTemplate): Promise<VendorParsingTemplate> {
    const result = await db.insert(vendorParsingTemplates).values(template).returning();
    return result[0];
  }

  async updateVendorParsingTemplate(id: number, data: Partial<VendorParsingTemplate>): Promise<VendorParsingTemplate | undefined> {
    const result = await db.update(vendorParsingTemplates).set({ ...data, updatedAt: new Date() }).where(eq(vendorParsingTemplates.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteVendorParsingTemplate(id: number): Promise<boolean> {
    const result = await db.delete(vendorParsingTemplates).where(eq(vendorParsingTemplates.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();