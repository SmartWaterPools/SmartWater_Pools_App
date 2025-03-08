import { pgTable, text, serial, integer, boolean, timestamp, date, time, uniqueIndex } from "drizzle-orm/pg-core";
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
      })
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
// Define project types based on Pentair Pool Builder categories
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
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
});

export const insertMaintenanceSchema = createInsertSchema(maintenances).omit({
  id: true,
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

export const maintenancesRelations = relations(maintenances, ({ one }) => ({
  client: one(clients, {
    fields: [maintenances.clientId],
    references: [clients.id],
  }),
  technician: one(technicians, {
    fields: [maintenances.technicianId],
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

// Project documentation relations
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

export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;
