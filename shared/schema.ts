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

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  startDate: date("start_date").notNull(),
  estimatedCompletionDate: date("estimated_completion_date"),
  actualCompletionDate: date("actual_completion_date"),
  status: text("status").notNull().default("pending"),
  budget: integer("budget"),
  notes: text("notes"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

// Project assignment
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  role: text("role").notNull(),
});

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
});

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

export type ServiceTemplate = typeof serviceTemplates.$inferSelect;
export type InsertServiceTemplate = z.infer<typeof insertServiceTemplateSchema>;
