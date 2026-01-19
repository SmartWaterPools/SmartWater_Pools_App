import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean, timestamp, time, serial, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  isSystemAdmin: boolean("is_system_admin").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  subscriptionId: integer("subscription_id"),
  type: varchar("type").default("company"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionTier: text("subscription_tier"),
  billingCycle: text("billing_cycle"),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("client"),
  phone: text("phone"),
  address: text("address"),
  addressLat: text("address_lat"),
  addressLng: text("address_lng"),
  active: boolean("active").notNull().default(true),
  organizationId: integer("organization_id").notNull(),
  googleId: text("google_id"),
  photoUrl: text("photo_url"),
  authProvider: text("auth_provider").default("local"),
  gmailAccessToken: text("gmail_access_token"),
  gmailRefreshToken: text("gmail_refresh_token"),
  gmailTokenExpiresAt: timestamp("gmail_token_expires_at"),
  gmailConnectedEmail: text("gmail_connected_email"),
  outlookAccessToken: text("outlook_access_token"),
  outlookRefreshToken: text("outlook_refresh_token"),
  outlookTokenExpiresAt: timestamp("outlook_token_expires_at"),
  outlookConnectedEmail: text("outlook_connected_email"),
});

export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  specialization: text("specialization"),
  certifications: text("certifications"),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  estimatedCompletionDate: date("estimated_completion_date"),
  actualCompletionDate: date("actual_completion_date"),
  status: text("status").notNull().default("pending"),
  budget: integer("budget"),
  notes: text("notes"),
  projectType: text("project_type").default("construction"),
  currentPhase: text("current_phase"),
  percentComplete: integer("percent_complete").default(0),
  permitDetails: text("permit_details"),
  isTemplate: boolean("is_template").default(false),
  templateName: text("template_name"),
  templateCategory: text("template_category"),
  isArchived: boolean("is_archived").default(false),
});

export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  technicianId: integer("technician_id"),
  issue: text("issue").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  reportedDate: timestamp("reported_date").notNull().default(sql`now()`),
  scheduledDate: date("scheduled_date"),
  completionDate: date("completion_date"),
  notes: text("notes"),
  description: text("description"),
  scheduledTime: time("scheduled_time"),
});

export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  order: integer("order").notNull().default(0),
  percentComplete: integer("percent_complete").notNull().default(0),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  estimatedDuration: integer("estimated_duration"),
  actualDuration: integer("actual_duration"),
  cost: integer("cost"),
  permitRequired: boolean("permit_required").default(false),
  inspectionRequired: boolean("inspection_required").default(false),
  inspectionDate: date("inspection_date"),
  inspectionPassed: boolean("inspection_passed"),
  inspectionNotes: text("inspection_notes"),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertTechnicianSchema = createInsertSchema(technicians).omit({
  id: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

export const insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  reportedDate: true,
});

export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
});

// Document schema for project documents
export const projectDocuments = pgTable("project_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  filename: text("filename").notNull(), // Unique generated filename
  originalName: text("original_name").notNull(), // Original filename from upload
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  uploadDate: timestamp("upload_date").notNull().default(sql`now()`),
  uploadedBy: integer("uploaded_by").notNull(), // User ID who uploaded
  url: text("url").notNull(), // Path to file or URL
  title: text("title"), // Display title
  description: text("description"), // Optional description
  documentType: text("document_type"), // Type of document (blueprint, permit, photo, contract, etc.)
  phaseId: integer("phase_id"), // Optional: associate with a project phase
  isPublic: boolean("is_public").default(false), // Whether document is publicly accessible
  tags: text("tags").array(), // Optional tags for categorization
});

export const insertProjectDocumentSchema = createInsertSchema(projectDocuments).omit({
  id: true,
  uploadDate: true,
});

// Bazza Routes - Service routes for technicians
export const bazzaRoutes = pgTable("bazza_routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  technicianId: integer("technician_id"),
  dayOfWeek: text("day_of_week").notNull(),
  weekNumber: integer("week_number"),
  isRecurring: boolean("is_recurring").notNull().default(true),
  frequency: text("frequency").notNull().default("weekly"),
  color: text("color"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Bazza Route Stops - Individual stops on a route
export const bazzaRouteStops = pgTable("bazza_route_stops", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  clientId: integer("client_id").notNull(),
  orderIndex: integer("order_index").notNull(),
  estimatedDuration: integer("estimated_duration"),
  customInstructions: text("custom_instructions"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Bazza Maintenance Assignments - Links maintenances to routes
export const bazzaMaintenanceAssignments = pgTable("bazza_maintenance_assignments", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  routeStopId: integer("route_stop_id").notNull(),
  maintenanceId: integer("maintenance_id").notNull(),
  date: date("date").notNull(),
  estimatedStartTime: timestamp("estimated_start_time"),
  estimatedEndTime: timestamp("estimated_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertBazzaRouteSchema = createInsertSchema(bazzaRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBazzaRouteStopSchema = createInsertSchema(bazzaRouteStops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBazzaMaintenanceAssignmentSchema = createInsertSchema(bazzaMaintenanceAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairs.$inferSelect;
export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhases.$inferSelect;
export type InsertProjectDocument = z.infer<typeof insertProjectDocumentSchema>;
export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type InsertBazzaRoute = z.infer<typeof insertBazzaRouteSchema>;
export type BazzaRoute = typeof bazzaRoutes.$inferSelect;
export type InsertBazzaRouteStop = z.infer<typeof insertBazzaRouteStopSchema>;
export type BazzaRouteStop = typeof bazzaRouteStops.$inferSelect;
export type InsertBazzaMaintenanceAssignment = z.infer<typeof insertBazzaMaintenanceAssignmentSchema>;
export type BazzaMaintenanceAssignment = typeof bazzaMaintenanceAssignments.$inferSelect;

// Report type constants for business components
export const REPORT_TYPES = [
  'revenue',
  'expense',
  'profit-loss',
  'tax',
  'customer-analytics',
  'service-performance',
  'inventory-status',
  'maintenance-summary',
  'pool-health',
  'water-quality',
  'equipment-status',
  'service-history'
] as const;

// Expense categories for business management
export const EXPENSE_CATEGORIES = [
  'Equipment & Tools',
  'Chemicals & Supplies',
  'Vehicle & Fuel',
  'Marketing & Advertising',
  'Office & Admin',
  'Insurance',
  'Licenses & Permits',
  'Labor & Payroll',
  'Utilities',
  'Rent & Facilities',
  'Professional Services',
  'Training & Education',
  'Maintenance & Repairs',
  'Other'
] as const;

// Communication provider types
export const COMMUNICATION_PROVIDER_TYPES = ['gmail', 'outlook', 'ringcentral', 'twilio'] as const;
export type CommunicationProviderType = (typeof COMMUNICATION_PROVIDER_TYPES)[number];

// Communication providers table - stores Gmail, Outlook, Twilio, RingCentral connections
export const communicationProviders = pgTable("communication_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // gmail, outlook, ringcentral, twilio
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  apiKey: text("api_key"),
  accountSid: text("account_sid"),
  authToken: text("auth_token"),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  lastUsed: timestamp("last_used"),
  settings: text("settings"),
  organizationId: integer("organization_id"),
});

export const insertCommunicationProviderSchema = createInsertSchema(communicationProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommunicationProvider = z.infer<typeof insertCommunicationProviderSchema>;
export type CommunicationProvider = typeof communicationProviders.$inferSelect;

// Emails table - stores synced emails from Gmail/Outlook
export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(), // FK to communication_providers
  externalId: text("external_id").notNull(), // Gmail/Outlook message ID
  threadId: text("thread_id"), // Email thread ID for grouping
  subject: text("subject"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmails: text("to_emails").array(), // Array of recipient emails
  ccEmails: text("cc_emails").array(),
  bccEmails: text("bcc_emails").array(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  snippet: text("snippet"), // Short preview of email
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  isDraft: boolean("is_draft").default(false),
  isSent: boolean("is_sent").default(false),
  hasAttachments: boolean("has_attachments").default(false),
  labels: text("labels").array(), // Gmail labels or Outlook categories
  receivedAt: timestamp("received_at"),
  sentAt: timestamp("sent_at"),
  syncedAt: timestamp("synced_at").notNull().default(sql`now()`),
  organizationId: integer("organization_id"),
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  syncedAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

// Email links - links emails to projects, repairs, clients, maintenance
export const emailLinks = pgTable("email_links", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").notNull(), // FK to emails
  linkType: text("link_type").notNull(), // 'project', 'repair', 'client', 'maintenance'
  projectId: integer("project_id"), // FK to projects (if linkType is project)
  repairId: integer("repair_id"), // FK to repairs (if linkType is repair)
  clientId: integer("client_id"), // FK to users (if linkType is client)
  maintenanceId: integer("maintenance_id"), // FK to bazza_maintenance_assignments
  linkedBy: integer("linked_by"), // User who linked this email (null if auto-linked)
  linkedAt: timestamp("linked_at").notNull().default(sql`now()`),
  isAutoLinked: boolean("is_auto_linked").default(false), // True if system auto-linked
  confidence: integer("confidence"), // Auto-link confidence score (0-100)
});

export const insertEmailLinkSchema = createInsertSchema(emailLinks).omit({
  id: true,
  linkedAt: true,
});

export type InsertEmailLink = z.infer<typeof insertEmailLinkSchema>;
export type EmailLink = typeof emailLinks.$inferSelect;

// Email templates - reusable email templates for notifications
export const emailTemplatesTable = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'appointment', 'project', 'repair', 'client', 'internal', 'marketing'
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  variables: text("variables").array(), // List of template variables like {{client_name}}, {{project_name}}
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  organizationId: integer("organization_id"),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplatesTable.$inferSelect;

// Scheduled emails - for appointment reminders, project updates, marketing emails
export const scheduledEmails = pgTable("scheduled_emails", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id"), // FK to email_templates (optional)
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  status: text("status").notNull().default("pending"), // pending, sent, failed, cancelled
  errorMessage: text("error_message"),
  emailType: text("email_type").notNull(), // 'appointment_reminder', 'project_update', 'repair_status', etc.
  relatedProjectId: integer("related_project_id"),
  relatedRepairId: integer("related_repair_id"),
  relatedClientId: integer("related_client_id"),
  relatedMaintenanceId: integer("related_maintenance_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  organizationId: integer("organization_id"),
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({
  id: true,
  createdAt: true,
});

export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

// SMS Messages table - stores sent/received SMS messages
export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(), // FK to communication_providers (RingCentral)
  externalId: text("external_id"), // RingCentral message ID
  direction: text("direction").notNull().default("outbound"), // inbound, outbound
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  organizationId: integer("organization_id"),
  // Related entities for tracking
  clientId: integer("client_id"),
  maintenanceId: integer("maintenance_id"),
  repairId: integer("repair_id"),
  projectId: integer("project_id"),
  // Message type for categorization
  messageType: text("message_type"), // 'on_the_way', 'job_complete', 'reminder', 'verification', 'custom'
  sentBy: integer("sent_by"), // User who sent the message
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;

// SMS Templates table - reusable SMS templates for notifications
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'on_the_way', 'job_complete', 'reminder', 'verification', 'marketing', 'custom'
  body: text("body").notNull(),
  variables: text("variables").array(), // List of template variables like {{client_name}}, {{tech_name}}
  isActive: boolean("is_active").default(true),
  isSystemTemplate: boolean("is_system_template").default(false), // Built-in templates
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  organizationId: integer("organization_id"),
});

export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;
export type SmsTemplate = typeof smsTemplates.$inferSelect;

// Vendors table - subcontractors, suppliers, and other business partners
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  category: text("category").notNull(), // 'chemical_supplier', 'equipment', 'parts', 'service', 'office', 'other'
  vendorType: text("vendor_type").notNull().default("supplier"), // 'subcontractor', 'supplier'
  website: text("website"),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Communication Links - unified table for linking emails/SMS to multiple entities
export const communicationLinks = pgTable("communication_links", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  communicationType: text("communication_type").notNull(), // 'sms', 'email'
  communicationId: integer("communication_id").notNull(), // FK to sms_messages or emails
  entityType: text("entity_type").notNull(), // 'client', 'vendor', 'project', 'repair', 'maintenance'
  entityId: integer("entity_id").notNull(), // FK to the entity table
  linkSource: text("link_source").notNull().default("manual"), // 'manual', 'auto'
  confidence: integer("confidence"), // Auto-link confidence score (0-100), null for manual
  linkedBy: integer("linked_by"), // User who created the link (null if auto)
  linkedAt: timestamp("linked_at").notNull().default(sql`now()`),
});

export const insertCommunicationLinkSchema = createInsertSchema(communicationLinks).omit({
  id: true,
  linkedAt: true,
});

export type InsertCommunicationLink = z.infer<typeof insertCommunicationLinkSchema>;
export type CommunicationLink = typeof communicationLinks.$inferSelect;

// Service Templates - define work order types with customizable checklists
export const serviceTemplates = pgTable("service_templates", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'maintenance', 'repair', 'construction', 'cleaning'
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  checklistItems: text("checklist_items"), // JSON array of checklist items
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertServiceTemplateSchema = createInsertSchema(serviceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;
export type ServiceTemplate = typeof serviceTemplates.$inferSelect;

// Work Order categories
export const WORK_ORDER_CATEGORIES = ['construction', 'cleaning', 'maintenance', 'repair'] as const;
export type WorkOrderCategory = (typeof WORK_ORDER_CATEGORIES)[number];

// Work Order statuses
export const WORK_ORDER_STATUSES = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

// Work Order priorities
export const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

// Work Orders table - unified work orders for construction, cleaning, maintenance, repair
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'construction', 'cleaning', 'maintenance', 'repair'
  status: text("status").notNull().default("pending"), // 'pending', 'scheduled', 'in_progress', 'completed', 'cancelled'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  
  // Scheduling
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedDuration: integer("estimated_duration"), // in minutes
  actualDuration: integer("actual_duration"), // in minutes
  
  // Related entities - polymorphic linking
  technicianId: integer("technician_id"), // FK to technicians
  clientId: integer("client_id"), // FK to clients/users
  projectId: integer("project_id"), // FK to projects (for construction)
  projectPhaseId: integer("project_phase_id"), // FK to project_phases (link to specific phase/stage)
  repairId: integer("repair_id"), // FK to repairs
  maintenanceAssignmentId: integer("maintenance_assignment_id"), // FK to bazza_maintenance_assignments
  
  // Template reference
  serviceTemplateId: integer("service_template_id"), // FK to service_templates
  
  // Checklist - stored as JSON array
  checklist: text("checklist"), // JSON array of checklist items with completion status
  
  // Photos/attachments
  photos: text("photos").array(), // Array of photo URLs
  
  // Cost tracking
  laborCost: integer("labor_cost"),
  materialsCost: integer("materials_cost"),
  totalCost: integer("total_cost"),
  
  // Location
  address: text("address"),
  addressLat: text("address_lat"),
  addressLng: text("address_lng"),
  
  // Notes and signature
  notes: text("notes"),
  customerSignature: text("customer_signature"), // Base64 signature or URL
  
  // Metadata
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;

// Work Order Notes - threaded comments/updates on work orders
export const workOrderNotes = pgTable("work_order_notes", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull(), // FK to work_orders
  userId: integer("user_id").notNull(), // FK to users who created the note
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("comment"), // 'comment', 'status_update', 'checklist_update', 'photo_added'
  isInternal: boolean("is_internal").default(false), // Internal notes not visible to clients
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertWorkOrderNoteSchema = createInsertSchema(workOrderNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkOrderNote = z.infer<typeof insertWorkOrderNoteSchema>;
export type WorkOrderNote = typeof workOrderNotes.$inferSelect;

// Work Order Audit Log - tracks all changes made to work orders
export const workOrderAuditLogs = pgTable("work_order_audit_logs", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // 'created', 'updated', 'deleted', 'status_changed', 'assigned', 'checklist_updated'
  fieldName: text("field_name"), // Which field was changed (null for 'created')
  oldValue: text("old_value"), // Previous value (JSON stringified if complex)
  newValue: text("new_value"), // New value (JSON stringified if complex)
  description: text("description"), // Human-readable description of the change
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertWorkOrderAuditLogSchema = createInsertSchema(workOrderAuditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkOrderAuditLog = z.infer<typeof insertWorkOrderAuditLogSchema>;
export type WorkOrderAuditLog = typeof workOrderAuditLogs.$inferSelect;

// Expenses table - track business expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  category: text("category"),
  description: text("description"),
  vendorName: text("vendor_name"),
  vendorId: integer("vendor_id"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Time Entries table - track employee time
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  workOrderId: integer("work_order_id"),
  date: date("date").notNull(),
  hoursWorked: numeric("hours_worked").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  approvedBy: integer("approved_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

// Pool Reports table - pool service reports
export const poolReports = pgTable("pool_reports", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  clientId: integer("client_id").notNull(),
  technicianId: integer("technician_id"),
  reportDate: date("report_date").notNull(),
  poolCondition: text("pool_condition"),
  chemicalReadings: jsonb("chemical_readings"),
  servicesPerformed: text("services_performed").array(),
  recommendations: text("recommendations"),
  photos: text("photos").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertPoolReportSchema = createInsertSchema(poolReports).omit({
  id: true,
  createdAt: true,
});

export type InsertPoolReport = z.infer<typeof insertPoolReportSchema>;
export type PoolReport = typeof poolReports.$inferSelect;

// Licenses table - track business licenses
export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  licenseName: text("license_name").notNull(),
  licenseNumber: text("license_number"),
  issuingAuthority: text("issuing_authority"),
  issueDate: date("issue_date"),
  expirationDate: date("expiration_date"),
  status: text("status").notNull().default("active"),
  documentUrl: text("document_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({
  id: true,
  createdAt: true,
});

export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type License = typeof licenses.$inferSelect;

// Insurance Policies table - track insurance policies
export const insurancePolicies = pgTable("insurance_policies", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  policyName: text("policy_name").notNull(),
  policyNumber: text("policy_number"),
  provider: text("provider"),
  policyType: text("policy_type"),
  coverageAmount: numeric("coverage_amount"),
  premium: numeric("premium"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"),
  documentUrl: text("document_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertInsurancePolicySchema = createInsertSchema(insurancePolicies).omit({
  id: true,
  createdAt: true,
});

export type InsertInsurancePolicy = z.infer<typeof insertInsurancePolicySchema>;
export type InsurancePolicy = typeof insurancePolicies.$inferSelect;

// Purchase Orders table - track purchase orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  vendorId: integer("vendor_id"),
  vendorName: text("vendor_name"),
  orderNumber: text("order_number"),
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  status: text("status").notNull().default("draft"),
  totalAmount: numeric("total_amount"),
  items: jsonb("items"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// Inventory Items table - track inventory items
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  sku: text("sku"),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  unitCost: integer("unit_cost"),
  unitPrice: integer("unit_price"),
  minimumStock: integer("minimum_stock"),
  isActive: boolean("is_active").default(true),
  vendorId: integer("vendor_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
