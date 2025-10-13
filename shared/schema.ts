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
  id: integer("id").primaryKey(),
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
  id: integer("id").primaryKey(),
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
  technicianId: integer("technician_id").notNull(),
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
