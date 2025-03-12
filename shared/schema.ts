import { pgTable, text, serial, integer, boolean, timestamp, date, time, uniqueIndex, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("client"), // admin, manager, technician, client
  phone: text("phone"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

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

// Service templates schema for global service checklists
export const serviceTemplates = pgTable("service_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // pool_service, hot_tub_service, etc.
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  checklistItems: text("checklist_items").array(), // Array of standard checklist items
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
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  technicians: many(technicians)
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

export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;

export type CommunicationProvider = typeof communicationProviders.$inferSelect;
export type InsertCommunicationProvider = z.infer<typeof insertCommunicationProviderSchema>;

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

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

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

// Export types
export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type RouteAssignment = typeof routeAssignments.$inferSelect;
export type InsertRouteAssignment = z.infer<typeof insertRouteAssignmentSchema>;
