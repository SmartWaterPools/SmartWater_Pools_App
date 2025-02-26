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
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
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

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

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
