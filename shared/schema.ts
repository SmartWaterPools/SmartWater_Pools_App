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
  active: boolean("active").notNull().default(true),
  organizationId: integer("organization_id").notNull(),
  googleId: text("google_id"),
  photoUrl: text("photo_url"),
  authProvider: text("auth_provider").default("local"),
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

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

export const insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  reportedDate: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type Repair = typeof repairs.$inferSelect;

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
