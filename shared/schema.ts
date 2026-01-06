import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean, timestamp, time, serial } from "drizzle-orm/pg-core";
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
