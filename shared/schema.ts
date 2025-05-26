import { pgTable, text, serial, integer, boolean, timestamp, date, time, uniqueIndex, doublePrecision, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Subscription plan types
export const SUBSCRIPTION_TIERS = ['basic', 'professional', 'enterprise'] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

// Subscription plan billing cycles
export const BILLING_CYCLES = ['monthly', 'yearly'] as const;
export type BillingCycle = typeof BILLING_CYCLES[number];

// Subscription plan status
export const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'past_due', 'canceled', 'trialing'] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organization schema first to avoid circular dependencies
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // For URL-friendly identifiers
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"), // URL to logo
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isSystemAdmin: boolean("is_system_admin").default(false), // If true, this is the SmartWater organization
  
  // Email configuration for organization-specific emails
  emailFromName: text("email_from_name"), // Company name for "From" field
  emailFromAddress: text("email_from_address"), // Reply-to email address
  emailSignature: text("email_signature"), // Company email signature
  
  // Custom email templates (JSON storage)
  customEmailTemplates: jsonb("custom_email_templates"), // Store custom templates as JSON
  
  // Email provider configuration (OAuth-based)
  emailConfig: jsonb("email_config"), // Store secure email provider config
  
  // Subscription related fields
  subscriptionId: integer("subscription_id"), // No foreign key reference to avoid circular dependency
  stripeCustomerId: text("stripe_customer_id"), // Stripe Customer ID
  trialEndsAt: timestamp("trial_ends_at"), // When trial period ends (null if not in trial)
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

// Client communications schema for CRM inbox
export const clientCommunications = pgTable("client_communications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Email details
  subject: text("subject").notNull(),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmails: text("to_emails").array().notNull(), // Array of recipient emails
  ccEmails: text("cc_emails").array(), // CC recipients
  bccEmails: text("bcc_emails").array(), // BCC recipients
  
  // Message content
  htmlContent: text("html_content"),
  textContent: text("text_content"),
  
  // Email metadata
  emailId: text("email_id"), // Original email ID from provider
  threadId: text("thread_id"), // Email thread ID
  messageId: text("message_id"), // Unique message ID
  inReplyTo: text("in_reply_to"), // Parent message ID
  
  // Communication status
  direction: text("direction").notNull(), // 'inbound', 'outbound', 'internal'
  status: text("status").notNull().default("unread"), // 'unread', 'read', 'replied', 'archived'
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  
  // Collaboration features
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  isSharedWithClient: boolean("is_shared_with_client").default(false),
  isInternal: boolean("is_internal").default(false),
  
  // Timestamps
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  
  // User who imported/created this communication
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
});

// Communication comments for internal collaboration
export const communicationComments = pgTable("communication_comments", {
  id: serial("id").primaryKey(),
  communicationId: integer("communication_id").notNull().references(() => clientCommunications.id),
  userId: integer("user_id").notNull().references(() => users.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(true), // Internal team comment vs client-visible
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Communication attachments
export const communicationAttachments = pgTable("communication_attachments", {
  id: serial("id").primaryKey(),
  communicationId: integer("communication_id").notNull().references(() => clientCommunications.id),
  
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  filePath: text("file_path"), // Path to stored file
  attachmentId: text("attachment_id"), // Original email attachment ID
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationCommentSchema = createInsertSchema(communicationComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationAttachmentSchema = createInsertSchema(communicationAttachments).omit({
  id: true,
  createdAt: true,
});

export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertClientCommunication = z.infer<typeof insertClientCommunicationSchema>;
export type CommunicationComment = typeof communicationComments.$inferSelect;
export type InsertCommunicationComment = z.infer<typeof insertCommunicationCommentSchema>;
export type CommunicationAttachment = typeof communicationAttachments.$inferSelect;
export type InsertCommunicationAttachment = z.infer<typeof insertCommunicationAttachmentSchema>;

// Subscription plans schema
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: text("tier", { enum: SUBSCRIPTION_TIERS }).notNull(),
  price: integer("price").notNull(), // Price in cents
  billingCycle: text("billing_cycle", { enum: BILLING_CYCLES }).notNull(),
  features: jsonb("features").notNull(), // JSON array of features
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  stripePriceId: text("stripe_price_id"), // Stripe Price ID
  stripeProductId: text("stripe_product_id"), // Stripe Product ID
  maxTechnicians: integer("max_technicians").notNull().default(1), // Max number of technicians allowed
  maxClients: integer("max_clients"), // Max number of clients allowed (null = unlimited)
  maxProjects: integer("max_projects"), // Max number of projects (null = unlimited)
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Subscriptions schema
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status", { enum: SUBSCRIPTION_STATUSES }).notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe Subscription ID
  trialEndsAt: timestamp("trial_ends_at"), // When trial period ends (null if not in trial)
  quantity: integer("quantity").notNull().default(1), // Number of seats/licenses
  metadataJson: jsonb("metadata_json"), // Additional metadata
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Payment records schema
export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(), // succeeded, pending, failed
  paymentMethod: text("payment_method"), // credit_card, bank_transfer, etc.
  paymentMethodDetails: jsonb("payment_method_details"), // Details about payment method
  createdAt: timestamp("created_at").notNull().defaultNow(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  receiptUrl: text("receipt_url"),
  description: text("description"),
  metadata: jsonb("metadata"),
});

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
  id: true,
  createdAt: true,
});

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Valid contract types
export const CONTRACT_TYPES = ['residential', 'commercial', 'service', 'maintenance'] as const;

// Helper function to validate contract type
export const validateContractType = (type: string | null): boolean => {
  if (!type) return true; // null is valid
  
  // Ensure we have a string and normalize to lowercase
  const normalizedType = String(type).toLowerCase();
  
  // Check if it's in our predefined array
  return CONTRACT_TYPES.includes(normalizedType as any);
};
export type ContractType = typeof CONTRACT_TYPES[number] | null;

// Client schema
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  companyName: text("company_name"),
  contractType: text("contract_type"), // Should always be one of CONTRACT_TYPES or null
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // Pool details
  poolType: text("pool_type"), // vinyl, gunite, concrete, fiberglass
  poolSize: text("pool_size"), // dimensions or gallons
  filterType: text("filter_type"), // sand, cartridge, DE
  heaterType: text("heater_type"), // gas, electric, solar, heat pump
  chemicalSystem: text("chemical_system"), // chlorine, salt, mineral
  specialNotes: text("special_notes"), // Any special instructions or notes
  serviceDay: text("service_day"), // Preferred service day
  serviceLevel: text("service_level"), // Basic, Premium, etc.
  customServiceInstructions: text("custom_service_instructions").array(), // Array of specific instructions for this client
});

export const insertClientSchema = createInsertSchema(clients)
  .omit({
    id: true,
  })
  .extend({
    // Add custom validation for contract type
    contractType: z.string()
      .nullable()
      .transform(val => {
        if (val === null || val === undefined || val === '') return null;
        return String(val).toLowerCase();
      })
      .refine((val) => val === null || CONTRACT_TYPES.includes(val as any), {
        message: `Contract type must be one of: ${CONTRACT_TYPES.join(', ')} or null`
      }),
    // Add validation for latitude and longitude
    latitude: z.number().nullable(),
    longitude: z.number().nullable()
  });

// Technician schema
export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  specialization: text("specialization"),
  certifications: text("certifications"),
});

export const insertTechnicianSchema = createInsertSchema(technicians).omit({
  id: true,
});

// Project Types
export const PROJECT_TYPES = ['construction', 'renovation', 'repair', 'maintenance'] as const;
export type ProjectType = typeof PROJECT_TYPES[number] | null;

// Project schema
// Define project types based on SmartWater Pool Builder categories
export const PROJECT_TYPE_OPTIONS = ['construction', 'renovation', 'repair', 'maintenance'] as const;
export type ProjectTypeOption = typeof PROJECT_TYPE_OPTIONS[number];

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  projectType: text("project_type").notNull().default("construction"),
  startDate: date("start_date").notNull(),
  estimatedCompletionDate: date("estimated_completion_date"),
  actualCompletionDate: date("actual_completion_date"),
  status: text("status").notNull().default("planning"),
  budget: integer("budget"),
  currentPhase: text("current_phase"), // foundation, framing, electrical, plumbing, finishing, etc.
  percentComplete: integer("percent_complete").default(0),
  permitDetails: text("permit_details"), // Permit information and dates
  notes: text("notes"),
  isTemplate: boolean("is_template").default(false), // Mark as a reusable template
  templateName: text("template_name"), // Name for the template if isTemplate is true
  templateCategory: text("template_category"), // For organizing templates
  isArchived: boolean("is_archived").default(false), // Flag for archived projects
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

// Project Phases
export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, delayed
  order: integer("order").notNull(), // Sequence order
  percentComplete: integer("percent_complete").default(0),
  notes: text("notes"),
  estimatedDuration: integer("estimated_duration"), // Estimated duration in days
  actualDuration: integer("actual_duration"), // Actual duration in days
  cost: integer("cost"), // Cost associated with this phase
  permitRequired: boolean("permit_required").default(false), // Does this phase require permits
  inspectionRequired: boolean("inspection_required").default(false), // Does this phase require inspection
  inspectionDate: date("inspection_date"), // Date of inspection if required
  inspectionPassed: boolean("inspection_passed"), // Did the inspection pass
  inspectionNotes: text("inspection_notes"), // Notes from the inspection
});

// Create a modified insert schema for project phases that properly handles optional numeric fields
export const insertProjectPhaseSchema = createInsertSchema(projectPhases)
  .omit({
    id: true,
  })
  .transform((data) => {
    // Convert null values to undefined for optional number fields to avoid validation errors
    const result = { ...data };
    
    // Explicitly handle optional numeric fields
    if (result.estimatedDuration === null) result.estimatedDuration = undefined;
    if (result.actualDuration === null) result.actualDuration = undefined;
    if (result.cost === null) result.cost = undefined;
    
    // Handle optional date fields
    if (result.startDate === null) result.startDate = undefined;
    if (result.endDate === null) result.endDate = undefined;
    if (result.inspectionDate === null) result.inspectionDate = undefined;
    
    return result;
  });

// Phase resources - equipment, materials needed for a phase
export const phaseResources = pgTable("phase_resources", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").references(() => projectPhases.id).notNull(),
  resourceType: text("resource_type").notNull(), // equipment, material, labor
  resourceName: text("resource_name").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit"), // e.g., hours, kg, pieces
  estimatedCost: integer("estimated_cost"),
  actualCost: integer("actual_cost"),
  notes: text("notes"),
});

export const insertPhaseResourceSchema = createInsertSchema(phaseResources);

// Project assignment - now with phase-specific assignments
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  phaseId: integer("phase_id").references(() => projectPhases.id), // Optional - if assigned to a specific phase
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  role: text("role").notNull(), // Project Manager, Construction Lead, Electrician, Plumber, etc.
  isLead: boolean("is_lead").default(false), // Is this person the lead for the project/phase
  startDate: date("start_date"), // When they are assigned to start
  endDate: date("end_date"), // When their assignment ends
  hoursAllocated: integer("hours_allocated"), // Hours allocated to this resource
  hoursLogged: integer("hours_logged").default(0), // Hours actually logged
  notes: text("notes"),
});

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments);

// Project documentation - photos, videos, documents
export const projectDocumentation = pgTable("project_documentation", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  phaseId: integer("phase_id").references(() => projectPhases.id), // Optional - if related to a specific phase
  documentType: text("document_type").notNull(), // photo, video, document, contract, permit
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  tags: text("tags").array(), // For categorizing
  isPublic: boolean("is_public").default(false), // Whether this can be shared with client
});

export const insertProjectDocumentationSchema = createInsertSchema(projectDocumentation);

// Maintenance schema
export const maintenances = pgTable("maintenances", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  scheduleDate: date("schedule_date").notNull(),
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  completionDate: date("completion_date"),
  startTime: timestamp("start_time"), // When technician started the service
  endTime: timestamp("end_time"), // When technician finished the service
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  customerFeedback: integer("customer_feedback"), // Rating 1-5
  customerNotes: text("customer_notes"), // Customer feedback notes
  invoiceAmount: integer("invoice_amount"), // Amount invoiced for this service
  laborCost: integer("labor_cost"), // Cost of labor for this service
  totalChemicalCost: integer("total_chemical_cost"), // Total cost of chemicals used
  profitAmount: integer("profit_amount"), // Calculated profit
  profitPercentage: integer("profit_percentage"), // Profit as a percentage
  routeName: text("route_name"), // Name of the route (e.g., "Monday North")
  routeOrder: integer("route_order"), // Order in the route sequence
  serviceTimeMinutes: integer("service_time_minutes"), // Actual service time
  mileage: integer("mileage"), // Distance traveled for this service
  fuelCost: integer("fuel_cost"), // Fuel cost in cents
  isOnTime: boolean("is_on_time"), // Whether service was on time
  issues: text("issues"), // Issues encountered during service
  serviceEfficiency: integer("service_efficiency"), // Service efficiency score (0-100)
});

export const insertMaintenanceSchema = createInsertSchema(maintenances).omit({
  id: true,
  startTime: true,
  endTime: true,
  customerFeedback: true,
  customerNotes: true,
  invoiceAmount: true,
  laborCost: true,
  totalChemicalCost: true,
  profitAmount: true,
  profitPercentage: true,
});

// Repair request schema
export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  issue: text("issue").notNull(),
  description: text("description"),
  reportedDate: timestamp("reported_date").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // pending, assigned, scheduled, in_progress, completed
  priority: text("priority").notNull().default("medium"), // low, medium, high
  technicianId: integer("technician_id").references(() => technicians.id),
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  completionDate: timestamp("completion_date"),
  notes: text("notes"),
});

export const insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  reportedDate: true,
  completionDate: true,
});

// Invoice schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  amount: integer("amount").notNull(),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, paid, overdue
  description: text("description").notNull(),
  notes: text("notes"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  issueDate: true,
});

// Pool equipment schema
export const poolEquipment = pgTable("pool_equipment", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // pump, filter, heater, chlorinator, etc.
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  installDate: date("install_date"),
  lastServiceDate: date("last_service_date"),
  notes: text("notes"),
  status: text("status").default("operational"), // operational, needs_service, replaced
});

export const insertPoolEquipmentSchema = createInsertSchema(poolEquipment).omit({
  id: true,
});

// Pool images schema
export const poolImages = pgTable("pool_images", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  category: text("category"), // equipment, pool, landscape, issue, etc.
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  technician_id: integer("technician_id").references(() => technicians.id),
});

export const insertPoolImageSchema = createInsertSchema(poolImages).omit({
  id: true,
  uploadDate: true,
});

// Define chemical types
export const CHEMICAL_TYPES = ['liquid_chlorine', 'tablets', 'muriatic_acid', 'soda_ash', 'sodium_bicarbonate', 'calcium_chloride', 'stabilizer', 'algaecide', 'salt', 'phosphate_remover', 'other'] as const;
export type ChemicalType = typeof CHEMICAL_TYPES[number];

// Chemical usage schema for tracking each chemical addition
export const chemicalUsage = pgTable("chemical_usage", {
  id: serial("id").primaryKey(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  chemicalType: text("chemical_type").notNull(), // Type of chemical used
  amount: integer("amount").notNull(), // Amount used (in base units)
  unit: text("unit").notNull(), // Unit of measurement (oz, lbs, gallons, etc.)
  unitCost: integer("unit_cost").notNull(), // Cost per unit in cents
  totalCost: integer("total_cost").notNull(), // Total cost in cents
  reason: text("reason"), // Reason for chemical addition
  notes: text("notes"), // Additional notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChemicalUsageSchema = createInsertSchema(chemicalUsage).omit({
  id: true,
  createdAt: true,
});

// Water readings schema for detailed pool chemistry tracking
export const waterReadings = pgTable("water_readings", {
  id: serial("id").primaryKey(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  phLevel: integer("ph_level"), // pH level * 10 (e.g., 7.4 stored as 74)
  chlorineLevel: integer("chlorine_level"), // Chlorine level in ppm * 10
  alkalinity: integer("alkalinity"), // Alkalinity in ppm
  cyanuricAcid: integer("cyanuric_acid"), // Stabilizer level in ppm
  calciumHardness: integer("calcium_hardness"), // Calcium hardness in ppm
  totalDissolvedSolids: integer("total_dissolved_solids"), // TDS in ppm
  saltLevel: integer("salt_level"), // Salt level in ppm (for salt systems)
  phosphates: integer("phosphates"), // Phosphate level in ppb
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWaterReadingsSchema = createInsertSchema(waterReadings).omit({
  id: true,
  createdAt: true,
});

// Maintenance reports schema for comprehensive service logging
export const maintenanceReports = pgTable("maintenance_reports", {
  id: serial("id").primaryKey(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  completionDate: timestamp("completion_date").notNull(),
  waterReadingId: integer("water_reading_id").references(() => waterReadings.id),
  tasksCompleted: text("tasks_completed").array(), // Array of completed tasks
  taskPhotos: text("task_photos"), // JSON string mapping task ID to photo URLs
  beforePhotos: text("before_photos").array(), // Array of before service photo URLs
  afterPhotos: text("after_photos").array(), // Array of after service photo URLs
  condition: text("condition"), // Overall pool condition (excellent, good, fair, poor)
  notes: text("notes"), // Technician notes
  photos: text("photos").array(), // Array of general photo URLs
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  clientSignature: text("client_signature"), // URL to client signature image
  technicianSignature: text("technician_signature"), // URL to technician signature image
  laborTimeMinutes: integer("labor_time_minutes"), // Time spent on service
  chemicalCost: integer("chemical_cost"), // Cost of chemicals used in cents
  equipmentIssues: text("equipment_issues"), // Equipment issues identified
  recommendedServices: text("recommended_services"), // Recommended follow-up services
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMaintenanceReportSchema = createInsertSchema(maintenanceReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Service templates schema for global service checklists
export const serviceTemplates = pgTable("service_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // pool_service, hot_tub_service, etc.
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  checklistItems: text("checklist_items").array(), // Array of standard checklist items
  checklistConfig: text("checklist_config"), // Configuration for each checklist item (photo required, etc.)
  requireBeforePhotos: boolean("require_before_photos").default(false),
  requireAfterPhotos: boolean("require_after_photos").default(false),
  workflowSteps: text("workflow_steps"), // Ordered workflow steps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertServiceTemplateSchema = createInsertSchema(serviceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Communication providers types
export const COMMUNICATION_PROVIDER_TYPES = ['gmail', 'outlook', 'ringcentral', 'twilio'] as const;
export type CommunicationProviderType = typeof COMMUNICATION_PROVIDER_TYPES[number];

// User invitation token types
export const INVITATION_TOKEN_STATUS = ['pending', 'accepted', 'expired'] as const;
export type InvitationTokenStatus = typeof INVITATION_TOKEN_STATUS[number];

// User invitation tokens schema
export const invitationTokens = pgTable("invitation_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  status: text("status", { enum: INVITATION_TOKEN_STATUS }).notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const insertInvitationTokenSchema = createInsertSchema(invitationTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Communication providers schema
export const communicationProviders = pgTable("communication_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // gmail, outlook, ringcentral, twilio
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  apiKey: text("api_key"),
  accountSid: text("account_sid"), // For Twilio
  authToken: text("auth_token"), // For Twilio
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  email: text("email"), // Primary email for the account
  phoneNumber: text("phone_number"), // Primary phone number for SMS/calls
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
  settings: text("settings"), // JSON string with provider-specific settings
});

export const insertCommunicationProviderSchema = createInsertSchema(communicationProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
});

// Relations
// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  invitationTokens: many(invitationTokens)
}));

export const invitationTokensRelations = relations(invitationTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitationTokens.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [invitationTokens.createdBy],
    references: [users.id],
  })
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  clients: many(clients),
  technicians: many(technicians),
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id]
  })
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  projects: many(projects),
  maintenances: many(maintenances),
  repairs: many(repairs),
  invoices: many(invoices),
  poolEquipment: many(poolEquipment),
  poolImages: many(poolImages),
}));

export const techniciansRelations = relations(technicians, ({ one, many }) => ({
  user: one(users, {
    fields: [technicians.userId],
    references: [users.id],
  }),
  projectAssignments: many(projectAssignments),
  maintenances: many(maintenances),
  repairs: many(repairs),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  assignments: many(projectAssignments),
  phases: many(projectPhases),
}));

export const projectPhasesRelations = relations(projectPhases, ({ one }) => ({
  project: one(projects, {
    fields: [projectPhases.projectId],
    references: [projects.id],
  }),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  technician: one(technicians, {
    fields: [projectAssignments.technicianId],
    references: [technicians.id],
  }),
}));

export const maintenancesRelations = relations(maintenances, ({ one, many }) => ({
  client: one(clients, {
    fields: [maintenances.clientId],
    references: [clients.id],
  }),
  technician: one(technicians, {
    fields: [maintenances.technicianId],
    references: [technicians.id],
  }),
  chemicalUsages: many(chemicalUsage),
  waterReadings: many(waterReadings),
  maintenanceReports: many(maintenanceReports),
}));

// Maintenance report relations
export const maintenanceReportsRelations = relations(maintenanceReports, ({ one }) => ({
  maintenance: one(maintenances, {
    fields: [maintenanceReports.maintenanceId],
    references: [maintenances.id],
  }),
  waterReading: one(waterReadings, {
    fields: [maintenanceReports.waterReadingId],
    references: [waterReadings.id],
  }),
  technician: one(technicians, {
    fields: [maintenanceReports.technicianId],
    references: [technicians.id],
  }),
}));

export const repairsRelations = relations(repairs, ({ one }) => ({
  client: one(clients, {
    fields: [repairs.clientId],
    references: [clients.id],
  }),
  technician: one(technicians, {
    fields: [repairs.technicianId],
    references: [technicians.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
}));

export const poolEquipmentRelations = relations(poolEquipment, ({ one }) => ({
  client: one(clients, {
    fields: [poolEquipment.clientId],
    references: [clients.id],
  }),
}));

export const poolImagesRelations = relations(poolImages, ({ one }) => ({
  client: one(clients, {
    fields: [poolImages.clientId],
    references: [clients.id],
  }),
  technician: one(technicians, {
    fields: [poolImages.technician_id],
    references: [technicians.id],
  }),
}));

// Create a separate client update schema for PATCH operations
export const updateClientSchema = z.object({
  companyName: z.string().nullable().optional(),
  contractType: z.string()
    .nullable()
    .optional()
    .transform(val => {
      if (val === null || val === undefined || val === '') return null;
      return String(val).toLowerCase();
    })
    .refine((val) => val === null || CONTRACT_TYPES.includes(val as any), {
      message: `Contract type must be one of: ${CONTRACT_TYPES.join(', ')} or null`
    }),
  // Pool details fields
  poolType: z.string().nullable().optional(),
  poolSize: z.string().nullable().optional(),
  filterType: z.string().nullable().optional(),
  heaterType: z.string().nullable().optional(),
  chemicalSystem: z.string().nullable().optional(),
  specialNotes: z.string().nullable().optional(),
  serviceDay: z.string().nullable().optional(),
  // Service-related fields
  serviceLevel: z.string().nullable().optional(),
  customServiceInstructions: z.array(z.string()).optional(),
});

// Chemical usage relations
export const chemicalUsageRelations = relations(chemicalUsage, ({ one }) => ({
  maintenance: one(maintenances, {
    fields: [chemicalUsage.maintenanceId],
    references: [maintenances.id],
  }),
}));

// Water readings relations
export const waterReadingsRelations = relations(waterReadings, ({ one }) => ({
  maintenance: one(maintenances, {
    fields: [waterReadings.maintenanceId],
    references: [maintenances.id],
  }),
}));

export const projectDocumentationRelations = relations(projectDocumentation, ({ one }) => ({
  project: one(projects, {
    fields: [projectDocumentation.projectId],
    references: [projects.id],
  }),
  phase: one(projectPhases, {
    fields: [projectDocumentation.phaseId],
    references: [projectPhases.id],
  }),
  uploader: one(users, {
    fields: [projectDocumentation.uploadedBy],
    references: [users.id],
  }),
}));

// Phase resources relations
export const phaseResourcesRelations = relations(phaseResources, ({ one }) => ({
  phase: one(projectPhases, {
    fields: [phaseResources.phaseId],
    references: [projectPhases.id],
  }),
}));

// Update project assignments relations to include phase
export const projectAssignmentsRelationsExtended = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  technician: one(technicians, {
    fields: [projectAssignments.technicianId],
    references: [technicians.id],
  }),
  phase: one(projectPhases, {
    fields: [projectAssignments.phaseId],
    references: [projectPhases.id],
  }),
}));

// Type definitions
// Export subscription-related types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;

export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;

export type Maintenance = typeof maintenances.$inferSelect;
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;

export type Repair = typeof repairs.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type PoolEquipment = typeof poolEquipment.$inferSelect;
export type InsertPoolEquipment = z.infer<typeof insertPoolEquipmentSchema>;

export type PoolImage = typeof poolImages.$inferSelect;
export type InsertPoolImage = z.infer<typeof insertPoolImageSchema>;

export type ProjectPhase = typeof projectPhases.$inferSelect;
export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;

export type PhaseResource = typeof phaseResources.$inferSelect;
export type InsertPhaseResource = z.infer<typeof insertPhaseResourceSchema>;

export type ProjectDocumentation = typeof projectDocumentation.$inferSelect;
export type InsertProjectDocumentation = z.infer<typeof insertProjectDocumentationSchema>;

export type ChemicalUsage = typeof chemicalUsage.$inferSelect;
export type InsertChemicalUsage = z.infer<typeof insertChemicalUsageSchema>;

export type WaterReading = typeof waterReadings.$inferSelect;
export type InsertWaterReading = z.infer<typeof insertWaterReadingsSchema>;

export type MaintenanceReport = typeof maintenanceReports.$inferSelect;
export type InsertMaintenanceReport = z.infer<typeof insertMaintenanceReportSchema>;

export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;

export type CommunicationProvider = typeof communicationProviders.$inferSelect;
export type InsertCommunicationProvider = z.infer<typeof insertCommunicationProviderSchema>;

export type InvitationToken = typeof invitationTokens.$inferSelect;
export type InsertInvitationToken = z.infer<typeof insertInvitationTokenSchema>;

// Business Module Schemas

// Expense Categories
export const EXPENSE_CATEGORIES = [
  'chemicals',
  'equipment',
  'vehicle',
  'office',
  'marketing',
  'insurance',
  'utilities',
  'rent',
  // 'payroll' category removed
  'taxes',
  'sales_tax',
  'training',
  'travel',
  'other'
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// Expense schema
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  category: text("category").notNull(), // one of EXPENSE_CATEGORIES
  amount: integer("amount").notNull(), // in cents
  description: text("description").notNull(),
  receipt: text("receipt"), // URL to receipt image
  vendor: text("vendor"),
  paymentMethod: text("payment_method"), // cash, credit card, check, etc.
  approved: boolean("approved").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  reimbursable: boolean("reimbursable").default(false),
  reimbursed: boolean("reimbursed").default(false),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  approvedDate: true,
  createdAt: true,
  updatedAt: true,
});

// Payroll schema removed as requested

// Time tracking schema
export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  breakDuration: integer("break_duration").default(0), // in minutes
  projectId: integer("project_id").references(() => projects.id),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id),
  repairId: integer("repair_id").references(() => repairs.id),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  approvedDate: true,
  createdAt: true,
  updatedAt: true,
});

// Financial Report Types
export const REPORT_TYPES = [
  'income_statement', 
  'balance_sheet', 
  'cash_flow',
  'profit_loss',
  'expense_summary',
  'revenue_by_service',
  'technician_productivity',
  'chemical_usage',
  'route_profitability',
  'custom'
] as const;
export type ReportType = typeof REPORT_TYPES[number];

// Financial Report Schema
export const financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // one of REPORT_TYPES
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  parameters: text("parameters"), // JSON string of parameters
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastRunDate: timestamp("last_run_date"),
  scheduleFrequency: text("schedule_frequency"), // daily, weekly, monthly, quarterly, yearly
  isPublic: boolean("is_public").default(false),
  notes: text("notes"),
});

export const insertFinancialReportSchema = createInsertSchema(financialReports).omit({
  id: true,
  createdAt: true,
  lastRunDate: true,
});

// Vendor Schema
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  accountNumber: text("account_number"),
  category: text("category").notNull(), // chemical supplier, equipment, service, etc.
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Purchase Order Schema
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  status: text("status").notNull().default("draft"), // draft, sent, received, cancelled
  totalAmount: integer("total_amount").notNull(), // in cents
  items: text("items").notNull(), // JSON string of items
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Inventory Item Schema
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // chemical, equipment, part, etc.
  sku: text("sku"),
  unit: text("unit").notNull(), // gallon, pound, each, etc.
  costPerUnit: integer("cost_per_unit").notNull(), // in cents
  minStockLevel: integer("min_stock_level").notNull().default(0),
  currentStock: integer("current_stock").notNull().default(0),
  location: text("location"), // where it's stored
  vendorId: integer("vendor_id").references(() => vendors.id),
  lastOrderDate: date("last_order_date"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Define relations for new business module entities
export const expensesRelations = relations(expenses, ({ one }) => ({
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [expenses.approvedBy],
    references: [users.id],
  }),
}));

// Payroll relations removed as requested

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  maintenance: one(maintenances, {
    fields: [timeEntries.maintenanceId],
    references: [maintenances.id],
  }),
  repair: one(repairs, {
    fields: [timeEntries.repairId],
    references: [repairs.id],
  }),
  approvedByUser: one(users, {
    fields: [timeEntries.approvedBy],
    references: [users.id],
  }),
}));

export const financialReportsRelations = relations(financialReports, ({ one }) => ({
  createdByUser: one(users, {
    fields: [financialReports.createdBy],
    references: [users.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  inventoryItems: many(inventoryItems),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  createdByUser: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  vendor: one(vendors, {
    fields: [inventoryItems.vendorId],
    references: [vendors.id],
  }),
}));

// Export types for business module entities
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// Payroll types removed as requested

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type FinancialReport = typeof financialReports.$inferSelect;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

// Warehouse schema for inventory locations
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  phoneNumber: text("phone_number"),
  isActive: boolean("is_active").notNull().default(true),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Technician Vehicles (Mobile Warehouses)
export const technicianVehicles = pgTable("technician_vehicles", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  name: text("name").notNull(), // e.g., "Service Truck #1"
  type: text("type").notNull(), // truck, van, etc.
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  licensePlate: text("license_plate"),
  vin: text("vin"),
  status: text("status").notNull().default("active"), // active, maintenance, retired
  notes: text("notes"),
  fleetmaticsVehicleId: text("fleetmatics_vehicle_id"), // External ID from Fleetmatics
  gpsDeviceId: text("gps_device_id"), // ID of installed GPS device
  lastKnownLatitude: doublePrecision("last_known_latitude"), // Last reported GPS latitude
  lastKnownLongitude: doublePrecision("last_known_longitude"), // Last reported GPS longitude
  lastLocationUpdate: timestamp("last_location_update"), // When the location was last updated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTechnicianVehicleSchema = createInsertSchema(technicianVehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLocationUpdate: true,
});

// Inventory Location Types (Warehouse, Vehicle, etc.)
export const INVENTORY_LOCATION_TYPES = ['warehouse', 'vehicle', 'client_site'] as const;
export type InventoryLocationType = typeof INVENTORY_LOCATION_TYPES[number];

// Warehouse Inventory (Items in specific warehouses with quantities)
export const warehouseInventory = pgTable("warehouse_inventory", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"), // Specific location within warehouse (e.g., "Shelf A1", "Bin 3")
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  minimumStockLevel: integer("minimum_stock_level").default(0),
  maximumStockLevel: integer("maximum_stock_level"),
  notes: text("notes"),
});

export const insertWarehouseInventorySchema = createInsertSchema(warehouseInventory).omit({
  id: true,
  lastUpdated: true,
});

// Vehicle Inventory (Items in technician vehicles)
export const vehicleInventory = pgTable("vehicle_inventory", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => technicianVehicles.id).notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"), // Specific location in vehicle
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  targetStockLevel: integer("target_stock_level").default(0), // Desired quantity to maintain in vehicle
  notes: text("notes"),
});

export const insertVehicleInventorySchema = createInsertSchema(vehicleInventory).omit({
  id: true,
  lastUpdated: true,
});

// Inventory Transfer Types
export const TRANSFER_TYPES = ['warehouse_to_warehouse', 'warehouse_to_vehicle', 'vehicle_to_warehouse', 'vehicle_to_vehicle', 'warehouse_to_client', 'vehicle_to_client'] as const;
export type TransferType = typeof TRANSFER_TYPES[number];

// Transfer Status Types
export const TRANSFER_STATUS = ['pending', 'in_transit', 'completed', 'cancelled'] as const;
export type TransferStatus = typeof TRANSFER_STATUS[number];

// Inventory Transfers
export const inventoryTransfers = pgTable("inventory_transfers", {
  id: serial("id").primaryKey(),
  transferType: text("transfer_type").notNull(), // One of TRANSFER_TYPES
  sourceLocationType: text("source_location_type").notNull(), // warehouse, vehicle
  sourceLocationId: integer("source_location_id").notNull(), // FK to warehouses or technicianVehicles
  destinationLocationType: text("destination_location_type").notNull(), // warehouse, vehicle, client_site
  destinationLocationId: integer("destination_location_id").notNull(), // FK to warehouses, technicianVehicles, or clients
  requestedByUserId: integer("requested_by_user_id").references(() => users.id).notNull(),
  approvedByUserId: integer("approved_by_user_id").references(() => users.id),
  requestDate: timestamp("request_date").notNull().defaultNow(),
  approvalDate: timestamp("approval_date"),
  scheduledDate: date("scheduled_date"),
  status: text("status").notNull().default("pending"), // pending, in_transit, completed, cancelled
  notes: text("notes"),
  completedDate: timestamp("completed_date"),
  completedByUserId: integer("completed_by_user_id").references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const insertInventoryTransferSchema = createInsertSchema(inventoryTransfers).omit({
  id: true,
  requestDate: true,
  approvalDate: true,
  completedDate: true,
});

// Inventory Transfer Items
export const inventoryTransferItems = pgTable("inventory_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").references(() => inventoryTransfers.id).notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  requestedQuantity: integer("requested_quantity").notNull(),
  approvedQuantity: integer("approved_quantity"),
  actualQuantity: integer("actual_quantity"), // What was actually transferred
  notes: text("notes"),
});

export const insertInventoryTransferItemSchema = createInsertSchema(inventoryTransferItems).omit({
  id: true,
});

// Barcode Types
export const BARCODE_TYPES = ['qr', 'upc', 'ean', 'code128', 'code39', 'datamatrix'] as const;
export type BarcodeType = typeof BARCODE_TYPES[number];

// Barcodes for inventory items and locations
export const barcodes = pgTable("barcodes", {
  id: serial("id").primaryKey(),
  barcodeValue: text("barcode_value").notNull().unique(),
  barcodeType: text("barcode_type").notNull(), // One of BARCODE_TYPES
  itemType: text("item_type").notNull(), // inventory_item, warehouse, vehicle, etc.
  itemId: integer("item_id").notNull(), // References the ID of the corresponding item
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertBarcodeSchema = createInsertSchema(barcodes).omit({
  id: true,
  createdAt: true,
});

// Barcode Scan History
export const barcodeScanHistory = pgTable("barcode_scan_history", {
  id: serial("id").primaryKey(),
  barcodeId: integer("barcode_id").references(() => barcodes.id).notNull(),
  scannedByUserId: integer("scanned_by_user_id").references(() => users.id).notNull(),
  scanTime: timestamp("scan_time").notNull().defaultNow(),
  actionType: text("action_type").notNull(), // inventory_count, transfer, maintenance, etc.
  actionId: integer("action_id"), // Optional reference to another table (like transfer_id)
  location: text("location"), // Where the scan occurred
  notes: text("notes"),
});

export const insertBarcodeScanHistorySchema = createInsertSchema(barcodeScanHistory).omit({
  id: true,
  scanTime: true,
});

// Inventory Adjustments (for corrections, damages, etc.)
export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: serial("id").primaryKey(),
  locationType: text("location_type").notNull(), // warehouse, vehicle
  locationId: integer("location_id").notNull(), // FK to warehouses or vehicles
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantityChange: integer("quantity_change").notNull(), // Can be positive or negative
  reason: text("reason").notNull(), // damage, count correction, loss, expiration, etc.
  performedByUserId: integer("performed_by_user_id").references(() => users.id).notNull(),
  adjustmentDate: timestamp("adjustment_date").notNull().defaultNow(),
  notes: text("notes"),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id), // If used during a maintenance
  repairId: integer("repair_id").references(() => repairs.id), // If used during a repair
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
});

export const insertInventoryAdjustmentSchema = createInsertSchema(inventoryAdjustments).omit({
  id: true,
  adjustmentDate: true,
});

// Relations
export const warehousesRelations = relations(warehouses, ({ many }) => ({
  inventory: many(warehouseInventory),
}));

export const technicianVehiclesRelations = relations(technicianVehicles, ({ one, many }) => ({
  technician: one(technicians, {
    fields: [technicianVehicles.technicianId],
    references: [technicians.id],
  }),
  inventory: many(vehicleInventory),
}));

export const warehouseInventoryRelations = relations(warehouseInventory, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseInventory.warehouseId],
    references: [warehouses.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [warehouseInventory.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const vehicleInventoryRelations = relations(vehicleInventory, ({ one }) => ({
  vehicle: one(technicianVehicles, {
    fields: [vehicleInventory.vehicleId],
    references: [technicianVehicles.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [vehicleInventory.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const inventoryTransfersRelations = relations(inventoryTransfers, ({ one, many }) => ({
  requestedBy: one(users, {
    fields: [inventoryTransfers.requestedByUserId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [inventoryTransfers.approvedByUserId],
    references: [users.id],
  }),
  completedBy: one(users, {
    fields: [inventoryTransfers.completedByUserId],
    references: [users.id],
  }),
  items: many(inventoryTransferItems),
}));

export const inventoryTransferItemsRelations = relations(inventoryTransferItems, ({ one }) => ({
  transfer: one(inventoryTransfers, {
    fields: [inventoryTransferItems.transferId],
    references: [inventoryTransfers.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [inventoryTransferItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const barcodesRelations = relations(barcodes, ({ many }) => ({
  scanHistory: many(barcodeScanHistory),
}));

export const barcodeScanHistoryRelations = relations(barcodeScanHistory, ({ one }) => ({
  barcode: one(barcodes, {
    fields: [barcodeScanHistory.barcodeId],
    references: [barcodes.id],
  }),
  scannedBy: one(users, {
    fields: [barcodeScanHistory.scannedByUserId],
    references: [users.id],
  }),
}));

export const inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryAdjustments.inventoryItemId],
    references: [inventoryItems.id],
  }),
  performedBy: one(users, {
    fields: [inventoryAdjustments.performedByUserId],
    references: [users.id],
  }),
  maintenance: one(maintenances, {
    fields: [inventoryAdjustments.maintenanceId],
    references: [maintenances.id],
  }),
  repair: one(repairs, {
    fields: [inventoryAdjustments.repairId],
    references: [repairs.id],
  }),
}));

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

export type TechnicianVehicle = typeof technicianVehicles.$inferSelect;
export type InsertTechnicianVehicle = z.infer<typeof insertTechnicianVehicleSchema>;

export type WarehouseInventory = typeof warehouseInventory.$inferSelect;
export type InsertWarehouseInventory = z.infer<typeof insertWarehouseInventorySchema>;

export type VehicleInventory = typeof vehicleInventory.$inferSelect;
export type InsertVehicleInventory = z.infer<typeof insertVehicleInventorySchema>;

export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type InsertInventoryTransfer = z.infer<typeof insertInventoryTransferSchema>;

export type InventoryTransferItem = typeof inventoryTransferItems.$inferSelect;
export type InsertInventoryTransferItem = z.infer<typeof insertInventoryTransferItemSchema>;

export type Barcode = typeof barcodes.$inferSelect;
export type InsertBarcode = z.infer<typeof insertBarcodeSchema>;

export type BarcodeScanHistory = typeof barcodeScanHistory.$inferSelect;
export type InsertBarcodeScanHistory = z.infer<typeof insertBarcodeScanHistorySchema>;

export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type InsertInventoryAdjustment = z.infer<typeof insertInventoryAdjustmentSchema>;

// Route Management Schema
export const ROUTE_TYPES = ['residential', 'commercial', 'mixed'] as const;
export type RouteType = typeof ROUTE_TYPES[number];

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // residential, commercial, mixed
  dayOfWeek: text("day_of_week").notNull(), // monday, tuesday, etc.
  startTime: time("start_time"),
  endTime: time("end_time"),
  technicianId: integer("technician_id").references(() => technicians.id),
  isActive: boolean("is_active").notNull().default(true),
  color: text("color"), // For display in the UI
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const routeAssignments = pgTable("route_assignments", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  orderIndex: integer("order_index").notNull(), // Order in the route
  estimatedDuration: integer("estimated_duration"), // In minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRouteAssignmentSchema = createInsertSchema(routeAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Relations
export const routesRelations = relations(routes, ({ one, many }) => ({
  technician: one(technicians, {
    fields: [routes.technicianId],
    references: [technicians.id],
  }),
  assignments: many(routeAssignments),
}));

export const routeAssignmentsRelations = relations(routeAssignments, ({ one }) => ({
  route: one(routes, {
    fields: [routeAssignments.routeId],
    references: [routes.id],
  }),
  maintenance: one(maintenances, {
    fields: [routeAssignments.maintenanceId],
    references: [maintenances.id],
  }),
}));

// Bazza Tables for Maintenance Routes

// Defines the bazza route types
export const BAZZA_ROUTE_TYPES = ['residential', 'commercial', 'mixed'] as const;
export type BazzaRouteType = typeof BAZZA_ROUTE_TYPES[number];

// Bazza Routes table for storing technician route information
export const bazzaRoutes = pgTable("bazza_routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // residential, commercial, mixed
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  dayOfWeek: text("day_of_week").notNull(), // monday, tuesday, etc.
  weekNumber: integer("week_number"), // For routes that repeat bi-weekly (1 or 2)
  isRecurring: boolean("is_recurring").notNull().default(true),
  frequency: text("frequency").notNull().default("weekly"), // weekly, bi-weekly, monthly
  color: text("color"), // For display in the UI
  startTime: time("start_time"),
  endTime: time("end_time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBazzaRouteSchema = createInsertSchema(bazzaRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Bazza Route Stops table for storing stops on a route
export const bazzaRouteStops = pgTable("bazza_route_stops", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => bazzaRoutes.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  orderIndex: integer("order_index").notNull(), // Order in the route
  estimatedDuration: integer("estimated_duration"), // In minutes
  customInstructions: text("custom_instructions"), // Any specific instructions for this stop
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBazzaRouteStopSchema = createInsertSchema(bazzaRouteStops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Bazza Maintenance Assignments table for linking maintenances to route stops
export const bazzaMaintenanceAssignments = pgTable("bazza_maintenance_assignments", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => bazzaRoutes.id).notNull(),
  routeStopId: integer("route_stop_id").references(() => bazzaRouteStops.id).notNull(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  date: date("date").notNull(), // The specific date this maintenance is scheduled
  estimatedStartTime: timestamp("estimated_start_time"), // Estimated start time
  estimatedEndTime: timestamp("estimated_end_time"), // Estimated end time
  actualStartTime: timestamp("actual_start_time"), // When technician actually started
  actualEndTime: timestamp("actual_end_time"), // When technician actually finished
  status: text("status").notNull().default("scheduled"), // scheduled, completed, etc.
  notes: text("notes"), // Any notes specific to this maintenance on this route
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBazzaMaintenanceAssignmentSchema = createInsertSchema(bazzaMaintenanceAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Relations
export const bazzaRoutesRelations = relations(bazzaRoutes, ({ one, many }) => ({
  technician: one(technicians, {
    fields: [bazzaRoutes.technicianId],
    references: [technicians.id],
  }),
  stops: many(bazzaRouteStops),
  assignments: many(bazzaMaintenanceAssignments),
}));

export const bazzaRouteStopsRelations = relations(bazzaRouteStops, ({ one, many }) => ({
  route: one(bazzaRoutes, {
    fields: [bazzaRouteStops.routeId],
    references: [bazzaRoutes.id],
  }),
  client: one(clients, {
    fields: [bazzaRouteStops.clientId],
    references: [clients.id],
  }),
  assignments: many(bazzaMaintenanceAssignments),
}));

export const bazzaMaintenanceAssignmentsRelations = relations(bazzaMaintenanceAssignments, ({ one }) => ({
  route: one(bazzaRoutes, {
    fields: [bazzaMaintenanceAssignments.routeId],
    references: [bazzaRoutes.id],
  }),
  routeStop: one(bazzaRouteStops, {
    fields: [bazzaMaintenanceAssignments.routeStopId],
    references: [bazzaRouteStops.id],
  }),
  maintenance: one(maintenances, {
    fields: [bazzaMaintenanceAssignments.maintenanceId],
    references: [maintenances.id],
  }),
}));

// Export types
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type RouteAssignment = typeof routeAssignments.$inferSelect;
export type InsertRouteAssignment = z.infer<typeof insertRouteAssignmentSchema>;

// Bazza route types
export type BazzaRoute = typeof bazzaRoutes.$inferSelect;
export type InsertBazzaRoute = z.infer<typeof insertBazzaRouteSchema>;

export type BazzaRouteStop = typeof bazzaRouteStops.$inferSelect;
export type InsertBazzaRouteStop = z.infer<typeof insertBazzaRouteStopSchema>;

export type BazzaMaintenanceAssignment = typeof bazzaMaintenanceAssignments.$inferSelect;
export type InsertBazzaMaintenanceAssignment = z.infer<typeof insertBazzaMaintenanceAssignmentSchema>;

// Fleetmatics Integration Schema
export const fleetmaticsConfig = pgTable("fleetmatics_config", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret"),
  baseUrl: text("base_url").notNull().default("https://fim.us.fleetmatics.com/api"),
  accountId: text("account_id"),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncTime: timestamp("last_sync_time"),
  syncFrequencyMinutes: integer("sync_frequency_minutes").default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFleetmaticsConfigSchema = createInsertSchema(fleetmaticsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tokenExpiresAt: true,
  lastSyncTime: true,
});

// Fleetmatics Tracking History
export const fleetmaticsLocationHistory = pgTable("fleetmatics_location_history", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => technicianVehicles.id).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  speed: doublePrecision("speed"), // Speed in mph
  heading: integer("heading"), // Direction in degrees
  eventTime: timestamp("event_time").notNull(),
  address: text("address"), // Reverse geocoded address if available
  ignitionStatus: text("ignition_status"), // on, off
  odometer: doublePrecision("odometer"), // Current odometer reading
  fleetmaticsEventId: text("fleetmatics_event_id"), // ID from Fleetmatics
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFleetmaticsLocationHistorySchema = createInsertSchema(fleetmaticsLocationHistory).omit({
  id: true,
  createdAt: true,
});

// Relations
export const fleetmaticsConfigRelations = relations(fleetmaticsConfig, ({ one }) => ({
  organization: one(organizations, {
    fields: [fleetmaticsConfig.organizationId],
    references: [organizations.id],
  }),
}));

export const fleetmaticsLocationHistoryRelations = relations(fleetmaticsLocationHistory, ({ one }) => ({
  vehicle: one(technicianVehicles, {
    fields: [fleetmaticsLocationHistory.vehicleId],
    references: [technicianVehicles.id],
  }),
}));

// Export types
export type FleetmaticsConfig = typeof fleetmaticsConfig.$inferSelect;
export type InsertFleetmaticsConfig = z.infer<typeof insertFleetmaticsConfigSchema>;

export type FleetmaticsLocationHistory = typeof fleetmaticsLocationHistory.$inferSelect;
export type InsertFleetmaticsLocationHistory = z.infer<typeof insertFleetmaticsLocationHistorySchema>;
