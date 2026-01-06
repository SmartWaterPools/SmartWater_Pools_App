var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/oauth-pending-users.ts
var oauth_pending_users_exports = {};
__export(oauth_pending_users_exports, {
  cleanupExpiredPendingUsers: () => cleanupExpiredPendingUsers,
  getAllPendingOAuthUsers: () => getAllPendingOAuthUsers,
  getPendingOAuthUser: () => getPendingOAuthUser,
  removePendingOAuthUser: () => removePendingOAuthUser,
  storePendingOAuthUser: () => storePendingOAuthUser
});
function storePendingOAuthUser(user, req) {
  const userWithDate = {
    ...user,
    createdAt: user.createdAt || /* @__PURE__ */ new Date()
  };
  pendingOAuthUsers.set(user.id, userWithDate);
  if (req?.session) {
    req.session["pendingOAuthUsers"] = req.session["pendingOAuthUsers"] || {};
    req.session["pendingOAuthUsers"][user.id] = {
      ...userWithDate,
      createdAt: userWithDate.createdAt.toISOString()
      // Convert Date to string for session storage
    };
    req.session.save((err) => {
      if (err) {
        console.error(`Failed to save session with pending OAuth user:`, err);
      }
    });
  }
  setTimeout(() => {
    if (pendingOAuthUsers.has(user.id)) {
      pendingOAuthUsers.delete(user.id);
    }
  }, PENDING_USER_TTL);
}
function getPendingOAuthUser(googleId, req) {
  const allUsers = Array.from(pendingOAuthUsers.entries());
  let user = pendingOAuthUsers.get(googleId);
  if (!user && req?.session && req.session["pendingOAuthUsers"] && req.session["pendingOAuthUsers"][googleId]) {
    const sessionUser = req.session["pendingOAuthUsers"][googleId];
    if (sessionUser) {
      user = {
        ...sessionUser,
        createdAt: sessionUser.createdAt instanceof Date ? sessionUser.createdAt : new Date(sessionUser.createdAt)
      };
      pendingOAuthUsers.set(googleId, user);
    }
  }
  if (!user) {
    if (process.env.NODE_ENV !== "production" && googleId === "test-googleid") {
      const testUser = {
        id: "test-googleid",
        email: "test@example.com",
        displayName: "Test User",
        photoUrl: null,
        profile: {},
        createdAt: /* @__PURE__ */ new Date()
      };
      pendingOAuthUsers.set(googleId, testUser);
      return testUser;
    }
    return null;
  }
  const now = /* @__PURE__ */ new Date();
  const expirationTime = new Date(user.createdAt.getTime() + PENDING_USER_TTL);
  if (now > expirationTime) {
    pendingOAuthUsers.delete(googleId);
    if (req?.session && req.session["pendingOAuthUsers"] && req.session["pendingOAuthUsers"][googleId]) {
      delete req.session["pendingOAuthUsers"][googleId];
      req.session.save();
    }
    return null;
  }
  return user;
}
function removePendingOAuthUser(googleId, req) {
  if (pendingOAuthUsers.has(googleId)) {
    pendingOAuthUsers.delete(googleId);
  }
  if (req?.session && req.session["pendingOAuthUsers"] && req.session["pendingOAuthUsers"][googleId]) {
    delete req.session["pendingOAuthUsers"][googleId];
    req.session.save((err) => {
      if (err) {
        console.error(`Failed to save session after removing pending OAuth user:`, err);
      }
    });
  }
}
function getAllPendingOAuthUsers() {
  return Array.from(pendingOAuthUsers.values());
}
function cleanupExpiredPendingUsers(req) {
  const now = /* @__PURE__ */ new Date();
  let memoryCleanupCount = 0;
  pendingOAuthUsers.forEach((user, id) => {
    const expirationTime = new Date(user.createdAt.getTime() + PENDING_USER_TTL);
    if (now > expirationTime) {
      pendingOAuthUsers.delete(id);
      memoryCleanupCount++;
    }
  });
  if (req?.session && req.session["pendingOAuthUsers"]) {
    let sessionCleanupCount = 0;
    const pendingUsers = req.session["pendingOAuthUsers"];
    Object.keys(pendingUsers).forEach((id) => {
      const user = pendingUsers[id];
      const createdAt = new Date(user.createdAt);
      const expirationTime = new Date(createdAt.getTime() + PENDING_USER_TTL);
      if (now > expirationTime) {
        delete pendingUsers[id];
        sessionCleanupCount++;
      }
    });
    if (sessionCleanupCount > 0) {
      req.session.save((err) => {
        if (err) {
          console.error(`Failed to save session after cleaning up pending OAuth users:`, err);
        }
      });
    }
  }
}
var pendingOAuthUsers, PENDING_USER_TTL;
var init_oauth_pending_users = __esm({
  "server/oauth-pending-users.ts"() {
    "use strict";
    pendingOAuthUsers = /* @__PURE__ */ new Map();
    PENDING_USER_TTL = 30 * 60 * 1e3;
  }
});

// server/index.ts
import express5 from "express";

// server/routes.ts
import express3 from "express";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  BARCODE_TYPES: () => BARCODE_TYPES,
  BAZZA_ROUTE_TYPES: () => BAZZA_ROUTE_TYPES,
  BILLING_CYCLES: () => BILLING_CYCLES,
  CHEMICAL_TYPES: () => CHEMICAL_TYPES,
  COMMUNICATION_PROVIDER_TYPES: () => COMMUNICATION_PROVIDER_TYPES,
  CONTRACT_TYPES: () => CONTRACT_TYPES,
  EXPENSE_CATEGORIES: () => EXPENSE_CATEGORIES,
  INVENTORY_LOCATION_TYPES: () => INVENTORY_LOCATION_TYPES,
  INVITATION_TOKEN_STATUS: () => INVITATION_TOKEN_STATUS,
  PROJECT_TYPES: () => PROJECT_TYPES,
  PROJECT_TYPE_OPTIONS: () => PROJECT_TYPE_OPTIONS,
  REPORT_TYPES: () => REPORT_TYPES,
  ROUTE_TYPES: () => ROUTE_TYPES,
  SUBSCRIPTION_STATUSES: () => SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_TIERS: () => SUBSCRIPTION_TIERS,
  TRANSFER_STATUS: () => TRANSFER_STATUS,
  TRANSFER_TYPES: () => TRANSFER_TYPES,
  barcodeScanHistory: () => barcodeScanHistory,
  barcodeScanHistoryRelations: () => barcodeScanHistoryRelations,
  barcodes: () => barcodes,
  barcodesRelations: () => barcodesRelations,
  bazzaMaintenanceAssignments: () => bazzaMaintenanceAssignments,
  bazzaMaintenanceAssignmentsRelations: () => bazzaMaintenanceAssignmentsRelations,
  bazzaRouteStops: () => bazzaRouteStops,
  bazzaRouteStopsRelations: () => bazzaRouteStopsRelations,
  bazzaRoutes: () => bazzaRoutes,
  bazzaRoutesRelations: () => bazzaRoutesRelations,
  chemicalUsage: () => chemicalUsage,
  chemicalUsageRelations: () => chemicalUsageRelations,
  clients: () => clients,
  clientsRelations: () => clientsRelations,
  communicationProviders: () => communicationProviders,
  expenses: () => expenses,
  expensesRelations: () => expensesRelations,
  financialReports: () => financialReports,
  financialReportsRelations: () => financialReportsRelations,
  fleetmaticsConfig: () => fleetmaticsConfig,
  fleetmaticsConfigRelations: () => fleetmaticsConfigRelations,
  fleetmaticsLocationHistory: () => fleetmaticsLocationHistory,
  fleetmaticsLocationHistoryRelations: () => fleetmaticsLocationHistoryRelations,
  insertBarcodeScanHistorySchema: () => insertBarcodeScanHistorySchema,
  insertBarcodeSchema: () => insertBarcodeSchema,
  insertBazzaMaintenanceAssignmentSchema: () => insertBazzaMaintenanceAssignmentSchema,
  insertBazzaRouteSchema: () => insertBazzaRouteSchema,
  insertBazzaRouteStopSchema: () => insertBazzaRouteStopSchema,
  insertChemicalUsageSchema: () => insertChemicalUsageSchema,
  insertClientSchema: () => insertClientSchema,
  insertCommunicationProviderSchema: () => insertCommunicationProviderSchema,
  insertExpenseSchema: () => insertExpenseSchema,
  insertFinancialReportSchema: () => insertFinancialReportSchema,
  insertFleetmaticsConfigSchema: () => insertFleetmaticsConfigSchema,
  insertFleetmaticsLocationHistorySchema: () => insertFleetmaticsLocationHistorySchema,
  insertInventoryAdjustmentSchema: () => insertInventoryAdjustmentSchema,
  insertInventoryItemSchema: () => insertInventoryItemSchema,
  insertInventoryTransferItemSchema: () => insertInventoryTransferItemSchema,
  insertInventoryTransferSchema: () => insertInventoryTransferSchema,
  insertInvitationTokenSchema: () => insertInvitationTokenSchema,
  insertInvoiceSchema: () => insertInvoiceSchema,
  insertMaintenanceReportSchema: () => insertMaintenanceReportSchema,
  insertMaintenanceSchema: () => insertMaintenanceSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertPaymentRecordSchema: () => insertPaymentRecordSchema,
  insertPhaseResourceSchema: () => insertPhaseResourceSchema,
  insertPoolEquipmentSchema: () => insertPoolEquipmentSchema,
  insertPoolImageSchema: () => insertPoolImageSchema,
  insertProjectAssignmentSchema: () => insertProjectAssignmentSchema,
  insertProjectDocumentationSchema: () => insertProjectDocumentationSchema,
  insertProjectPhaseSchema: () => insertProjectPhaseSchema,
  insertProjectSchema: () => insertProjectSchema,
  insertPurchaseOrderSchema: () => insertPurchaseOrderSchema,
  insertRepairSchema: () => insertRepairSchema,
  insertRouteAssignmentSchema: () => insertRouteAssignmentSchema,
  insertRouteSchema: () => insertRouteSchema,
  insertServiceTemplateSchema: () => insertServiceTemplateSchema,
  insertSubscriptionPlanSchema: () => insertSubscriptionPlanSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertTechnicianSchema: () => insertTechnicianSchema,
  insertTechnicianVehicleSchema: () => insertTechnicianVehicleSchema,
  insertTimeEntrySchema: () => insertTimeEntrySchema,
  insertUserSchema: () => insertUserSchema,
  insertVehicleInventorySchema: () => insertVehicleInventorySchema,
  insertVendorSchema: () => insertVendorSchema,
  insertWarehouseInventorySchema: () => insertWarehouseInventorySchema,
  insertWarehouseSchema: () => insertWarehouseSchema,
  insertWaterReadingsSchema: () => insertWaterReadingsSchema,
  inventoryAdjustments: () => inventoryAdjustments,
  inventoryAdjustmentsRelations: () => inventoryAdjustmentsRelations,
  inventoryItems: () => inventoryItems,
  inventoryItemsRelations: () => inventoryItemsRelations,
  inventoryTransferItems: () => inventoryTransferItems,
  inventoryTransferItemsRelations: () => inventoryTransferItemsRelations,
  inventoryTransfers: () => inventoryTransfers,
  inventoryTransfersRelations: () => inventoryTransfersRelations,
  invitationTokens: () => invitationTokens,
  invitationTokensRelations: () => invitationTokensRelations,
  invoices: () => invoices,
  invoicesRelations: () => invoicesRelations,
  maintenanceReports: () => maintenanceReports,
  maintenanceReportsRelations: () => maintenanceReportsRelations,
  maintenances: () => maintenances,
  maintenancesRelations: () => maintenancesRelations,
  organizations: () => organizations,
  organizationsRelations: () => organizationsRelations,
  paymentRecords: () => paymentRecords,
  phaseResources: () => phaseResources,
  phaseResourcesRelations: () => phaseResourcesRelations,
  poolEquipment: () => poolEquipment,
  poolEquipmentRelations: () => poolEquipmentRelations,
  poolImages: () => poolImages,
  poolImagesRelations: () => poolImagesRelations,
  projectAssignments: () => projectAssignments,
  projectAssignmentsRelations: () => projectAssignmentsRelations,
  projectAssignmentsRelationsExtended: () => projectAssignmentsRelationsExtended,
  projectDocumentation: () => projectDocumentation,
  projectDocumentationRelations: () => projectDocumentationRelations,
  projectPhases: () => projectPhases,
  projectPhasesRelations: () => projectPhasesRelations,
  projects: () => projects,
  projectsRelations: () => projectsRelations,
  purchaseOrders: () => purchaseOrders,
  purchaseOrdersRelations: () => purchaseOrdersRelations,
  repairs: () => repairs,
  repairsRelations: () => repairsRelations,
  routeAssignments: () => routeAssignments,
  routeAssignmentsRelations: () => routeAssignmentsRelations,
  routes: () => routes,
  routesRelations: () => routesRelations,
  serviceTemplates: () => serviceTemplates,
  subscriptionPlans: () => subscriptionPlans,
  subscriptions: () => subscriptions,
  technicianVehicles: () => technicianVehicles,
  technicianVehiclesRelations: () => technicianVehiclesRelations,
  technicians: () => technicians,
  techniciansRelations: () => techniciansRelations,
  timeEntries: () => timeEntries,
  timeEntriesRelations: () => timeEntriesRelations,
  updateClientSchema: () => updateClientSchema,
  users: () => users,
  usersRelations: () => usersRelations,
  validateContractType: () => validateContractType,
  vehicleInventory: () => vehicleInventory,
  vehicleInventoryRelations: () => vehicleInventoryRelations,
  vendors: () => vendors,
  vendorsRelations: () => vendorsRelations,
  warehouseInventory: () => warehouseInventory,
  warehouseInventoryRelations: () => warehouseInventoryRelations,
  warehouses: () => warehouses,
  warehousesRelations: () => warehousesRelations,
  waterReadings: () => waterReadings,
  waterReadingsRelations: () => waterReadingsRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, date, time, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var SUBSCRIPTION_TIERS = ["basic", "professional", "enterprise"];
var BILLING_CYCLES = ["monthly", "yearly"];
var SUBSCRIPTION_STATUSES = ["active", "inactive", "past_due", "canceled", "trialing"];
var organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // For URL-friendly identifiers
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  // URL to logo
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isSystemAdmin: boolean("is_system_admin").default(false),
  // If true, this is the SmartWater organization
  // Subscription related fields
  subscriptionId: integer("subscription_id"),
  // No foreign key reference to avoid circular dependency
  stripeCustomerId: text("stripe_customer_id"),
  // Stripe Customer ID
  trialEndsAt: timestamp("trial_ends_at")
  // When trial period ends (null if not in trial)
});
var insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true
});
var subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: text("tier", { enum: SUBSCRIPTION_TIERS }).notNull(),
  price: integer("price").notNull(),
  // Price in cents
  billingCycle: text("billing_cycle", { enum: BILLING_CYCLES }).notNull(),
  features: jsonb("features").notNull(),
  // JSON array of features
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  stripePriceId: text("stripe_price_id"),
  // Stripe Price ID
  stripeProductId: text("stripe_product_id"),
  // Stripe Product ID
  maxTechnicians: integer("max_technicians").notNull().default(1),
  // Max number of technicians allowed
  maxClients: integer("max_clients"),
  // Max number of clients allowed (null = unlimited)
  maxProjects: integer("max_projects")
  // Max number of projects (null = unlimited)
});
var insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var subscriptions = pgTable("subscriptions", {
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
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Stripe Subscription ID
  trialEndsAt: timestamp("trial_ends_at"),
  // When trial period ends (null if not in trial)
  quantity: integer("quantity").notNull().default(1),
  // Number of seats/licenses
  metadataJson: jsonb("metadata_json")
  // Additional metadata
});
var insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  amount: integer("amount").notNull(),
  // Amount in cents
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(),
  // succeeded, pending, failed
  paymentMethod: text("payment_method"),
  // credit_card, bank_transfer, etc.
  paymentMethodDetails: jsonb("payment_method_details"),
  // Details about payment method
  createdAt: timestamp("created_at").notNull().defaultNow(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  receiptUrl: text("receipt_url"),
  description: text("description"),
  metadata: jsonb("metadata")
});
var insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
  id: true,
  createdAt: true
});
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  // Can be null for OAuth users
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("client"),
  // system_admin, org_admin, manager, technician, client, office_staff
  phone: text("phone"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  googleId: text("google_id").unique(),
  // Google OAuth ID
  photoUrl: text("photo_url"),
  // User's profile photo from Google
  authProvider: text("auth_provider").default("local")
  // 'local', 'google', etc.
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true
});
var CONTRACT_TYPES = ["residential", "commercial", "service", "maintenance"];
var validateContractType = (type) => {
  if (!type) return true;
  const normalizedType = String(type).toLowerCase();
  return CONTRACT_TYPES.includes(normalizedType);
};
var clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  companyName: text("company_name"),
  contractType: text("contract_type"),
  // Should always be one of CONTRACT_TYPES or null
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // Pool details
  poolType: text("pool_type"),
  // vinyl, gunite, concrete, fiberglass
  poolSize: text("pool_size"),
  // dimensions or gallons
  filterType: text("filter_type"),
  // sand, cartridge, DE
  heaterType: text("heater_type"),
  // gas, electric, solar, heat pump
  chemicalSystem: text("chemical_system"),
  // chlorine, salt, mineral
  specialNotes: text("special_notes"),
  // Any special instructions or notes
  serviceDay: text("service_day"),
  // Preferred service day
  serviceLevel: text("service_level"),
  // Basic, Premium, etc.
  customServiceInstructions: text("custom_service_instructions").array()
  // Array of specific instructions for this client
});
var insertClientSchema = createInsertSchema(clients).omit({
  id: true
}).extend({
  // Add custom validation for contract type
  contractType: z.string().nullable().transform((val) => {
    if (val === null || val === void 0 || val === "") return null;
    return String(val).toLowerCase();
  }).refine((val) => val === null || CONTRACT_TYPES.includes(val), {
    message: `Contract type must be one of: ${CONTRACT_TYPES.join(", ")} or null`
  }),
  // Add validation for latitude and longitude
  latitude: z.number().nullable(),
  longitude: z.number().nullable()
});
var technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  specialization: text("specialization"),
  certifications: text("certifications")
});
var insertTechnicianSchema = createInsertSchema(technicians).omit({
  id: true
});
var PROJECT_TYPES = ["construction", "renovation", "repair", "maintenance"];
var PROJECT_TYPE_OPTIONS = ["construction", "renovation", "repair", "maintenance"];
var projects = pgTable("projects", {
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
  currentPhase: text("current_phase"),
  // foundation, framing, electrical, plumbing, finishing, etc.
  percentComplete: integer("percent_complete").default(0),
  permitDetails: text("permit_details"),
  // Permit information and dates
  notes: text("notes"),
  isTemplate: boolean("is_template").default(false),
  // Mark as a reusable template
  templateName: text("template_name"),
  // Name for the template if isTemplate is true
  templateCategory: text("template_category"),
  // For organizing templates
  isArchived: boolean("is_archived").default(false)
  // Flag for archived projects
});
var insertProjectSchema = createInsertSchema(projects).omit({
  id: true
});
var projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").notNull().default("pending"),
  // pending, in_progress, completed, delayed
  order: integer("order").notNull(),
  // Sequence order
  percentComplete: integer("percent_complete").default(0),
  notes: text("notes"),
  estimatedDuration: integer("estimated_duration"),
  // Estimated duration in days
  actualDuration: integer("actual_duration"),
  // Actual duration in days
  cost: integer("cost"),
  // Cost associated with this phase
  permitRequired: boolean("permit_required").default(false),
  // Does this phase require permits
  inspectionRequired: boolean("inspection_required").default(false),
  // Does this phase require inspection
  inspectionDate: date("inspection_date"),
  // Date of inspection if required
  inspectionPassed: boolean("inspection_passed"),
  // Did the inspection pass
  inspectionNotes: text("inspection_notes")
  // Notes from the inspection
});
var insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true
}).transform((data) => {
  const result = { ...data };
  if (result.estimatedDuration === null) result.estimatedDuration = void 0;
  if (result.actualDuration === null) result.actualDuration = void 0;
  if (result.cost === null) result.cost = void 0;
  if (result.startDate === null) result.startDate = void 0;
  if (result.endDate === null) result.endDate = void 0;
  if (result.inspectionDate === null) result.inspectionDate = void 0;
  return result;
});
var phaseResources = pgTable("phase_resources", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").references(() => projectPhases.id).notNull(),
  resourceType: text("resource_type").notNull(),
  // equipment, material, labor
  resourceName: text("resource_name").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit"),
  // e.g., hours, kg, pieces
  estimatedCost: integer("estimated_cost"),
  actualCost: integer("actual_cost"),
  notes: text("notes")
});
var insertPhaseResourceSchema = createInsertSchema(phaseResources);
var projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  phaseId: integer("phase_id").references(() => projectPhases.id),
  // Optional - if assigned to a specific phase
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  role: text("role").notNull(),
  // Project Manager, Construction Lead, Electrician, Plumber, etc.
  isLead: boolean("is_lead").default(false),
  // Is this person the lead for the project/phase
  startDate: date("start_date"),
  // When they are assigned to start
  endDate: date("end_date"),
  // When their assignment ends
  hoursAllocated: integer("hours_allocated"),
  // Hours allocated to this resource
  hoursLogged: integer("hours_logged").default(0),
  // Hours actually logged
  notes: text("notes")
});
var insertProjectAssignmentSchema = createInsertSchema(projectAssignments);
var projectDocumentation = pgTable("project_documentation", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  phaseId: integer("phase_id").references(() => projectPhases.id),
  // Optional - if related to a specific phase
  documentType: text("document_type").notNull(),
  // photo, video, document, contract, permit
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  tags: text("tags").array(),
  // For categorizing
  isPublic: boolean("is_public").default(false)
  // Whether this can be shared with client
});
var insertProjectDocumentationSchema = createInsertSchema(projectDocumentation);
var maintenances = pgTable("maintenances", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  scheduleDate: date("schedule_date").notNull(),
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  completionDate: date("completion_date"),
  startTime: timestamp("start_time"),
  // When technician started the service
  endTime: timestamp("end_time"),
  // When technician finished the service
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"),
  // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  customerFeedback: integer("customer_feedback"),
  // Rating 1-5
  customerNotes: text("customer_notes"),
  // Customer feedback notes
  invoiceAmount: integer("invoice_amount"),
  // Amount invoiced for this service
  laborCost: integer("labor_cost"),
  // Cost of labor for this service
  totalChemicalCost: integer("total_chemical_cost"),
  // Total cost of chemicals used
  profitAmount: integer("profit_amount"),
  // Calculated profit
  profitPercentage: integer("profit_percentage"),
  // Profit as a percentage
  routeName: text("route_name"),
  // Name of the route (e.g., "Monday North")
  routeOrder: integer("route_order"),
  // Order in the route sequence
  serviceTimeMinutes: integer("service_time_minutes"),
  // Actual service time
  mileage: integer("mileage"),
  // Distance traveled for this service
  fuelCost: integer("fuel_cost"),
  // Fuel cost in cents
  isOnTime: boolean("is_on_time"),
  // Whether service was on time
  issues: text("issues"),
  // Issues encountered during service
  serviceEfficiency: integer("service_efficiency")
  // Service efficiency score (0-100)
});
var insertMaintenanceSchema = createInsertSchema(maintenances).omit({
  id: true,
  startTime: true,
  endTime: true,
  customerFeedback: true,
  customerNotes: true,
  invoiceAmount: true,
  laborCost: true,
  totalChemicalCost: true,
  profitAmount: true,
  profitPercentage: true
});
var repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  issue: text("issue").notNull(),
  description: text("description"),
  reportedDate: timestamp("reported_date").notNull().defaultNow(),
  status: text("status").notNull().default("pending"),
  // pending, assigned, scheduled, in_progress, completed
  priority: text("priority").notNull().default("medium"),
  // low, medium, high
  technicianId: integer("technician_id").references(() => technicians.id),
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  completionDate: timestamp("completion_date"),
  notes: text("notes")
});
var insertRepairSchema = createInsertSchema(repairs).omit({
  id: true,
  reportedDate: true,
  completionDate: true
});
var invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  amount: integer("amount").notNull(),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: date("due_date").notNull(),
  status: text("status").notNull().default("pending"),
  // pending, paid, overdue
  description: text("description").notNull(),
  notes: text("notes")
});
var insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  issueDate: true
});
var poolEquipment = pgTable("pool_equipment", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // pump, filter, heater, chlorinator, etc.
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  installDate: date("install_date"),
  lastServiceDate: date("last_service_date"),
  notes: text("notes"),
  status: text("status").default("operational")
  // operational, needs_service, replaced
});
var insertPoolEquipmentSchema = createInsertSchema(poolEquipment).omit({
  id: true
});
var poolImages = pgTable("pool_images", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  category: text("category"),
  // equipment, pool, landscape, issue, etc.
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  technician_id: integer("technician_id").references(() => technicians.id)
});
var insertPoolImageSchema = createInsertSchema(poolImages).omit({
  id: true,
  uploadDate: true
});
var CHEMICAL_TYPES = ["liquid_chlorine", "tablets", "muriatic_acid", "soda_ash", "sodium_bicarbonate", "calcium_chloride", "stabilizer", "algaecide", "salt", "phosphate_remover", "other"];
var chemicalUsage = pgTable("chemical_usage", {
  id: serial("id").primaryKey(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  chemicalType: text("chemical_type").notNull(),
  // Type of chemical used
  amount: integer("amount").notNull(),
  // Amount used (in base units)
  unit: text("unit").notNull(),
  // Unit of measurement (oz, lbs, gallons, etc.)
  unitCost: integer("unit_cost").notNull(),
  // Cost per unit in cents
  totalCost: integer("total_cost").notNull(),
  // Total cost in cents
  reason: text("reason"),
  // Reason for chemical addition
  notes: text("notes"),
  // Additional notes
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertChemicalUsageSchema = createInsertSchema(chemicalUsage).omit({
  id: true,
  createdAt: true
});
var waterReadings = pgTable("water_readings", {
  id: serial("id").primaryKey(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  phLevel: integer("ph_level"),
  // pH level * 10 (e.g., 7.4 stored as 74)
  chlorineLevel: integer("chlorine_level"),
  // Chlorine level in ppm * 10
  alkalinity: integer("alkalinity"),
  // Alkalinity in ppm
  cyanuricAcid: integer("cyanuric_acid"),
  // Stabilizer level in ppm
  calciumHardness: integer("calcium_hardness"),
  // Calcium hardness in ppm
  totalDissolvedSolids: integer("total_dissolved_solids"),
  // TDS in ppm
  saltLevel: integer("salt_level"),
  // Salt level in ppm (for salt systems)
  phosphates: integer("phosphates"),
  // Phosphate level in ppb
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertWaterReadingsSchema = createInsertSchema(waterReadings).omit({
  id: true,
  createdAt: true
});
var maintenanceReports = pgTable("maintenance_reports", {
  id: serial("id").primaryKey(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  completionDate: timestamp("completion_date").notNull(),
  waterReadingId: integer("water_reading_id").references(() => waterReadings.id),
  tasksCompleted: text("tasks_completed").array(),
  // Array of completed tasks
  taskPhotos: text("task_photos"),
  // JSON string mapping task ID to photo URLs
  beforePhotos: text("before_photos").array(),
  // Array of before service photo URLs
  afterPhotos: text("after_photos").array(),
  // Array of after service photo URLs
  condition: text("condition"),
  // Overall pool condition (excellent, good, fair, poor)
  notes: text("notes"),
  // Technician notes
  photos: text("photos").array(),
  // Array of general photo URLs
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  clientSignature: text("client_signature"),
  // URL to client signature image
  technicianSignature: text("technician_signature"),
  // URL to technician signature image
  laborTimeMinutes: integer("labor_time_minutes"),
  // Time spent on service
  chemicalCost: integer("chemical_cost"),
  // Cost of chemicals used in cents
  equipmentIssues: text("equipment_issues"),
  // Equipment issues identified
  recommendedServices: text("recommended_services"),
  // Recommended follow-up services
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertMaintenanceReportSchema = createInsertSchema(maintenanceReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var serviceTemplates = pgTable("service_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // pool_service, hot_tub_service, etc.
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  checklistItems: text("checklist_items").array(),
  // Array of standard checklist items
  checklistConfig: text("checklist_config"),
  // Configuration for each checklist item (photo required, etc.)
  requireBeforePhotos: boolean("require_before_photos").default(false),
  requireAfterPhotos: boolean("require_after_photos").default(false),
  workflowSteps: text("workflow_steps"),
  // Ordered workflow steps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertServiceTemplateSchema = createInsertSchema(serviceTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var COMMUNICATION_PROVIDER_TYPES = ["gmail", "outlook", "ringcentral", "twilio"];
var INVITATION_TOKEN_STATUS = ["pending", "accepted", "expired"];
var invitationTokens = pgTable("invitation_tokens", {
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
  createdBy: integer("created_by").references(() => users.id)
});
var insertInvitationTokenSchema = createInsertSchema(invitationTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var communicationProviders = pgTable("communication_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // gmail, outlook, ringcentral, twilio
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  apiKey: text("api_key"),
  accountSid: text("account_sid"),
  // For Twilio
  authToken: text("auth_token"),
  // For Twilio
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  email: text("email"),
  // Primary email for the account
  phoneNumber: text("phone_number"),
  // Primary phone number for SMS/calls
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
  settings: text("settings")
  // JSON string with provider-specific settings
});
var insertCommunicationProviderSchema = createInsertSchema(communicationProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true
});
var organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  invitationTokens: many(invitationTokens)
}));
var invitationTokensRelations = relations(invitationTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitationTokens.organizationId],
    references: [organizations.id]
  }),
  createdBy: one(users, {
    fields: [invitationTokens.createdBy],
    references: [users.id]
  })
}));
var usersRelations = relations(users, ({ many, one }) => ({
  clients: many(clients),
  technicians: many(technicians),
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id]
  })
}));
var clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id]
  }),
  projects: many(projects),
  maintenances: many(maintenances),
  repairs: many(repairs),
  invoices: many(invoices),
  poolEquipment: many(poolEquipment),
  poolImages: many(poolImages)
}));
var techniciansRelations = relations(technicians, ({ one, many }) => ({
  user: one(users, {
    fields: [technicians.userId],
    references: [users.id]
  }),
  projectAssignments: many(projectAssignments),
  maintenances: many(maintenances),
  repairs: many(repairs)
}));
var projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id]
  }),
  assignments: many(projectAssignments),
  phases: many(projectPhases)
}));
var projectPhasesRelations = relations(projectPhases, ({ one }) => ({
  project: one(projects, {
    fields: [projectPhases.projectId],
    references: [projects.id]
  })
}));
var projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id]
  }),
  technician: one(technicians, {
    fields: [projectAssignments.technicianId],
    references: [technicians.id]
  })
}));
var maintenancesRelations = relations(maintenances, ({ one, many }) => ({
  client: one(clients, {
    fields: [maintenances.clientId],
    references: [clients.id]
  }),
  technician: one(technicians, {
    fields: [maintenances.technicianId],
    references: [technicians.id]
  }),
  chemicalUsages: many(chemicalUsage),
  waterReadings: many(waterReadings),
  maintenanceReports: many(maintenanceReports)
}));
var maintenanceReportsRelations = relations(maintenanceReports, ({ one }) => ({
  maintenance: one(maintenances, {
    fields: [maintenanceReports.maintenanceId],
    references: [maintenances.id]
  }),
  waterReading: one(waterReadings, {
    fields: [maintenanceReports.waterReadingId],
    references: [waterReadings.id]
  }),
  technician: one(technicians, {
    fields: [maintenanceReports.technicianId],
    references: [technicians.id]
  })
}));
var repairsRelations = relations(repairs, ({ one }) => ({
  client: one(clients, {
    fields: [repairs.clientId],
    references: [clients.id]
  }),
  technician: one(technicians, {
    fields: [repairs.technicianId],
    references: [technicians.id]
  })
}));
var invoicesRelations = relations(invoices, ({ one }) => ({
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id]
  })
}));
var poolEquipmentRelations = relations(poolEquipment, ({ one }) => ({
  client: one(clients, {
    fields: [poolEquipment.clientId],
    references: [clients.id]
  })
}));
var poolImagesRelations = relations(poolImages, ({ one }) => ({
  client: one(clients, {
    fields: [poolImages.clientId],
    references: [clients.id]
  }),
  technician: one(technicians, {
    fields: [poolImages.technician_id],
    references: [technicians.id]
  })
}));
var updateClientSchema = z.object({
  companyName: z.string().nullable().optional(),
  contractType: z.string().nullable().optional().transform((val) => {
    if (val === null || val === void 0 || val === "") return null;
    return String(val).toLowerCase();
  }).refine((val) => val === null || CONTRACT_TYPES.includes(val), {
    message: `Contract type must be one of: ${CONTRACT_TYPES.join(", ")} or null`
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
  customServiceInstructions: z.array(z.string()).optional()
});
var chemicalUsageRelations = relations(chemicalUsage, ({ one }) => ({
  maintenance: one(maintenances, {
    fields: [chemicalUsage.maintenanceId],
    references: [maintenances.id]
  })
}));
var waterReadingsRelations = relations(waterReadings, ({ one }) => ({
  maintenance: one(maintenances, {
    fields: [waterReadings.maintenanceId],
    references: [maintenances.id]
  })
}));
var projectDocumentationRelations = relations(projectDocumentation, ({ one }) => ({
  project: one(projects, {
    fields: [projectDocumentation.projectId],
    references: [projects.id]
  }),
  phase: one(projectPhases, {
    fields: [projectDocumentation.phaseId],
    references: [projectPhases.id]
  }),
  uploader: one(users, {
    fields: [projectDocumentation.uploadedBy],
    references: [users.id]
  })
}));
var phaseResourcesRelations = relations(phaseResources, ({ one }) => ({
  phase: one(projectPhases, {
    fields: [phaseResources.phaseId],
    references: [projectPhases.id]
  })
}));
var projectAssignmentsRelationsExtended = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id]
  }),
  technician: one(technicians, {
    fields: [projectAssignments.technicianId],
    references: [technicians.id]
  }),
  phase: one(projectPhases, {
    fields: [projectAssignments.phaseId],
    references: [projectPhases.id]
  })
}));
var EXPENSE_CATEGORIES = [
  "chemicals",
  "equipment",
  "vehicle",
  "office",
  "marketing",
  "insurance",
  "utilities",
  "rent",
  // 'payroll' category removed
  "taxes",
  "sales_tax",
  "training",
  "travel",
  "other"
];
var expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  category: text("category").notNull(),
  // one of EXPENSE_CATEGORIES
  amount: integer("amount").notNull(),
  // in cents
  description: text("description").notNull(),
  receipt: text("receipt"),
  // URL to receipt image
  vendor: text("vendor"),
  paymentMethod: text("payment_method"),
  // cash, credit card, check, etc.
  approved: boolean("approved").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  reimbursable: boolean("reimbursable").default(false),
  reimbursed: boolean("reimbursed").default(false),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  approvedDate: true,
  createdAt: true,
  updatedAt: true
});
var timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  breakDuration: integer("break_duration").default(0),
  // in minutes
  projectId: integer("project_id").references(() => projects.id),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id),
  repairId: integer("repair_id").references(() => repairs.id),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  // pending, approved, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  approvedDate: true,
  createdAt: true,
  updatedAt: true
});
var REPORT_TYPES = [
  "income_statement",
  "balance_sheet",
  "cash_flow",
  "profit_loss",
  "expense_summary",
  "revenue_by_service",
  "technician_productivity",
  "chemical_usage",
  "route_profitability",
  "custom"
];
var financialReports = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // one of REPORT_TYPES
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  parameters: text("parameters"),
  // JSON string of parameters
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastRunDate: timestamp("last_run_date"),
  scheduleFrequency: text("schedule_frequency"),
  // daily, weekly, monthly, quarterly, yearly
  isPublic: boolean("is_public").default(false),
  notes: text("notes")
});
var insertFinancialReportSchema = createInsertSchema(financialReports).omit({
  id: true,
  createdAt: true,
  lastRunDate: true
});
var vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  accountNumber: text("account_number"),
  category: text("category").notNull(),
  // chemical supplier, equipment, service, etc.
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  status: text("status").notNull().default("draft"),
  // draft, sent, received, cancelled
  totalAmount: integer("total_amount").notNull(),
  // in cents
  items: text("items").notNull(),
  // JSON string of items
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  // chemical, equipment, part, etc.
  sku: text("sku"),
  unit: text("unit").notNull(),
  // gallon, pound, each, etc.
  costPerUnit: integer("cost_per_unit").notNull(),
  // in cents
  minStockLevel: integer("min_stock_level").notNull().default(0),
  currentStock: integer("current_stock").notNull().default(0),
  location: text("location"),
  // where it's stored
  vendorId: integer("vendor_id").references(() => vendors.id),
  lastOrderDate: date("last_order_date"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var expensesRelations = relations(expenses, ({ one }) => ({
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id]
  }),
  approvedByUser: one(users, {
    fields: [expenses.approvedBy],
    references: [users.id]
  })
}));
var timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id]
  }),
  maintenance: one(maintenances, {
    fields: [timeEntries.maintenanceId],
    references: [maintenances.id]
  }),
  repair: one(repairs, {
    fields: [timeEntries.repairId],
    references: [repairs.id]
  }),
  approvedByUser: one(users, {
    fields: [timeEntries.approvedBy],
    references: [users.id]
  })
}));
var financialReportsRelations = relations(financialReports, ({ one }) => ({
  createdByUser: one(users, {
    fields: [financialReports.createdBy],
    references: [users.id]
  })
}));
var vendorsRelations = relations(vendors, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
  inventoryItems: many(inventoryItems)
}));
var purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id]
  }),
  createdByUser: one(users, {
    fields: [purchaseOrders.createdBy],
    references: [users.id]
  })
}));
var inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  vendor: one(vendors, {
    fields: [inventoryItems.vendorId],
    references: [vendors.id]
  })
}));
var warehouses = pgTable("warehouses", {
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
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var technicianVehicles = pgTable("technician_vehicles", {
  id: serial("id").primaryKey(),
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  name: text("name").notNull(),
  // e.g., "Service Truck #1"
  type: text("type").notNull(),
  // truck, van, etc.
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  licensePlate: text("license_plate"),
  vin: text("vin"),
  status: text("status").notNull().default("active"),
  // active, maintenance, retired
  notes: text("notes"),
  fleetmaticsVehicleId: text("fleetmatics_vehicle_id"),
  // External ID from Fleetmatics
  gpsDeviceId: text("gps_device_id"),
  // ID of installed GPS device
  lastKnownLatitude: doublePrecision("last_known_latitude"),
  // Last reported GPS latitude
  lastKnownLongitude: doublePrecision("last_known_longitude"),
  // Last reported GPS longitude
  lastLocationUpdate: timestamp("last_location_update"),
  // When the location was last updated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertTechnicianVehicleSchema = createInsertSchema(technicianVehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLocationUpdate: true
});
var INVENTORY_LOCATION_TYPES = ["warehouse", "vehicle", "client_site"];
var warehouseInventory = pgTable("warehouse_inventory", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"),
  // Specific location within warehouse (e.g., "Shelf A1", "Bin 3")
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  minimumStockLevel: integer("minimum_stock_level").default(0),
  maximumStockLevel: integer("maximum_stock_level"),
  notes: text("notes")
});
var insertWarehouseInventorySchema = createInsertSchema(warehouseInventory).omit({
  id: true,
  lastUpdated: true
});
var vehicleInventory = pgTable("vehicle_inventory", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => technicianVehicles.id).notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"),
  // Specific location in vehicle
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  targetStockLevel: integer("target_stock_level").default(0),
  // Desired quantity to maintain in vehicle
  notes: text("notes")
});
var insertVehicleInventorySchema = createInsertSchema(vehicleInventory).omit({
  id: true,
  lastUpdated: true
});
var TRANSFER_TYPES = ["warehouse_to_warehouse", "warehouse_to_vehicle", "vehicle_to_warehouse", "vehicle_to_vehicle", "warehouse_to_client", "vehicle_to_client"];
var TRANSFER_STATUS = ["pending", "in_transit", "completed", "cancelled"];
var inventoryTransfers = pgTable("inventory_transfers", {
  id: serial("id").primaryKey(),
  transferType: text("transfer_type").notNull(),
  // One of TRANSFER_TYPES
  sourceLocationType: text("source_location_type").notNull(),
  // warehouse, vehicle
  sourceLocationId: integer("source_location_id").notNull(),
  // FK to warehouses or technicianVehicles
  destinationLocationType: text("destination_location_type").notNull(),
  // warehouse, vehicle, client_site
  destinationLocationId: integer("destination_location_id").notNull(),
  // FK to warehouses, technicianVehicles, or clients
  requestedByUserId: integer("requested_by_user_id").references(() => users.id).notNull(),
  approvedByUserId: integer("approved_by_user_id").references(() => users.id),
  requestDate: timestamp("request_date").notNull().defaultNow(),
  approvalDate: timestamp("approval_date"),
  scheduledDate: date("scheduled_date"),
  status: text("status").notNull().default("pending"),
  // pending, in_transit, completed, cancelled
  notes: text("notes"),
  completedDate: timestamp("completed_date"),
  completedByUserId: integer("completed_by_user_id").references(() => users.id),
  organizationId: integer("organization_id").references(() => organizations.id).notNull()
});
var insertInventoryTransferSchema = createInsertSchema(inventoryTransfers).omit({
  id: true,
  requestDate: true,
  approvalDate: true,
  completedDate: true
});
var inventoryTransferItems = pgTable("inventory_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").references(() => inventoryTransfers.id).notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  requestedQuantity: integer("requested_quantity").notNull(),
  approvedQuantity: integer("approved_quantity"),
  actualQuantity: integer("actual_quantity"),
  // What was actually transferred
  notes: text("notes")
});
var insertInventoryTransferItemSchema = createInsertSchema(inventoryTransferItems).omit({
  id: true
});
var BARCODE_TYPES = ["qr", "upc", "ean", "code128", "code39", "datamatrix"];
var barcodes = pgTable("barcodes", {
  id: serial("id").primaryKey(),
  barcodeValue: text("barcode_value").notNull().unique(),
  barcodeType: text("barcode_type").notNull(),
  // One of BARCODE_TYPES
  itemType: text("item_type").notNull(),
  // inventory_item, warehouse, vehicle, etc.
  itemId: integer("item_id").notNull(),
  // References the ID of the corresponding item
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true)
});
var insertBarcodeSchema = createInsertSchema(barcodes).omit({
  id: true,
  createdAt: true
});
var barcodeScanHistory = pgTable("barcode_scan_history", {
  id: serial("id").primaryKey(),
  barcodeId: integer("barcode_id").references(() => barcodes.id).notNull(),
  scannedByUserId: integer("scanned_by_user_id").references(() => users.id).notNull(),
  scanTime: timestamp("scan_time").notNull().defaultNow(),
  actionType: text("action_type").notNull(),
  // inventory_count, transfer, maintenance, etc.
  actionId: integer("action_id"),
  // Optional reference to another table (like transfer_id)
  location: text("location"),
  // Where the scan occurred
  notes: text("notes")
});
var insertBarcodeScanHistorySchema = createInsertSchema(barcodeScanHistory).omit({
  id: true,
  scanTime: true
});
var inventoryAdjustments = pgTable("inventory_adjustments", {
  id: serial("id").primaryKey(),
  locationType: text("location_type").notNull(),
  // warehouse, vehicle
  locationId: integer("location_id").notNull(),
  // FK to warehouses or vehicles
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  quantityChange: integer("quantity_change").notNull(),
  // Can be positive or negative
  reason: text("reason").notNull(),
  // damage, count correction, loss, expiration, etc.
  performedByUserId: integer("performed_by_user_id").references(() => users.id).notNull(),
  adjustmentDate: timestamp("adjustment_date").notNull().defaultNow(),
  notes: text("notes"),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id),
  // If used during a maintenance
  repairId: integer("repair_id").references(() => repairs.id),
  // If used during a repair
  organizationId: integer("organization_id").references(() => organizations.id).notNull()
});
var insertInventoryAdjustmentSchema = createInsertSchema(inventoryAdjustments).omit({
  id: true,
  adjustmentDate: true
});
var warehousesRelations = relations(warehouses, ({ many }) => ({
  inventory: many(warehouseInventory)
}));
var technicianVehiclesRelations = relations(technicianVehicles, ({ one, many }) => ({
  technician: one(technicians, {
    fields: [technicianVehicles.technicianId],
    references: [technicians.id]
  }),
  inventory: many(vehicleInventory)
}));
var warehouseInventoryRelations = relations(warehouseInventory, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseInventory.warehouseId],
    references: [warehouses.id]
  }),
  inventoryItem: one(inventoryItems, {
    fields: [warehouseInventory.inventoryItemId],
    references: [inventoryItems.id]
  })
}));
var vehicleInventoryRelations = relations(vehicleInventory, ({ one }) => ({
  vehicle: one(technicianVehicles, {
    fields: [vehicleInventory.vehicleId],
    references: [technicianVehicles.id]
  }),
  inventoryItem: one(inventoryItems, {
    fields: [vehicleInventory.inventoryItemId],
    references: [inventoryItems.id]
  })
}));
var inventoryTransfersRelations = relations(inventoryTransfers, ({ one, many }) => ({
  requestedBy: one(users, {
    fields: [inventoryTransfers.requestedByUserId],
    references: [users.id]
  }),
  approvedBy: one(users, {
    fields: [inventoryTransfers.approvedByUserId],
    references: [users.id]
  }),
  completedBy: one(users, {
    fields: [inventoryTransfers.completedByUserId],
    references: [users.id]
  }),
  items: many(inventoryTransferItems)
}));
var inventoryTransferItemsRelations = relations(inventoryTransferItems, ({ one }) => ({
  transfer: one(inventoryTransfers, {
    fields: [inventoryTransferItems.transferId],
    references: [inventoryTransfers.id]
  }),
  inventoryItem: one(inventoryItems, {
    fields: [inventoryTransferItems.inventoryItemId],
    references: [inventoryItems.id]
  })
}));
var barcodesRelations = relations(barcodes, ({ many }) => ({
  scanHistory: many(barcodeScanHistory)
}));
var barcodeScanHistoryRelations = relations(barcodeScanHistory, ({ one }) => ({
  barcode: one(barcodes, {
    fields: [barcodeScanHistory.barcodeId],
    references: [barcodes.id]
  }),
  scannedBy: one(users, {
    fields: [barcodeScanHistory.scannedByUserId],
    references: [users.id]
  })
}));
var inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryAdjustments.inventoryItemId],
    references: [inventoryItems.id]
  }),
  performedBy: one(users, {
    fields: [inventoryAdjustments.performedByUserId],
    references: [users.id]
  }),
  maintenance: one(maintenances, {
    fields: [inventoryAdjustments.maintenanceId],
    references: [maintenances.id]
  }),
  repair: one(repairs, {
    fields: [inventoryAdjustments.repairId],
    references: [repairs.id]
  })
}));
var ROUTE_TYPES = ["residential", "commercial", "mixed"];
var routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  // residential, commercial, mixed
  dayOfWeek: text("day_of_week").notNull(),
  // monday, tuesday, etc.
  startTime: time("start_time"),
  endTime: time("end_time"),
  technicianId: integer("technician_id").references(() => technicians.id),
  isActive: boolean("is_active").notNull().default(true),
  color: text("color"),
  // For display in the UI
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var routeAssignments = pgTable("route_assignments", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  orderIndex: integer("order_index").notNull(),
  // Order in the route
  estimatedDuration: integer("estimated_duration"),
  // In minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertRouteAssignmentSchema = createInsertSchema(routeAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var routesRelations = relations(routes, ({ one, many }) => ({
  technician: one(technicians, {
    fields: [routes.technicianId],
    references: [technicians.id]
  }),
  assignments: many(routeAssignments)
}));
var routeAssignmentsRelations = relations(routeAssignments, ({ one }) => ({
  route: one(routes, {
    fields: [routeAssignments.routeId],
    references: [routes.id]
  }),
  maintenance: one(maintenances, {
    fields: [routeAssignments.maintenanceId],
    references: [maintenances.id]
  })
}));
var BAZZA_ROUTE_TYPES = ["residential", "commercial", "mixed"];
var bazzaRoutes = pgTable("bazza_routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  // residential, commercial, mixed
  technicianId: integer("technician_id").references(() => technicians.id).notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  // monday, tuesday, etc.
  weekNumber: integer("week_number"),
  // For routes that repeat bi-weekly (1 or 2)
  isRecurring: boolean("is_recurring").notNull().default(true),
  frequency: text("frequency").notNull().default("weekly"),
  // weekly, bi-weekly, monthly
  color: text("color"),
  // For display in the UI
  startTime: time("start_time"),
  endTime: time("end_time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertBazzaRouteSchema = createInsertSchema(bazzaRoutes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var bazzaRouteStops = pgTable("bazza_route_stops", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => bazzaRoutes.id).notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  orderIndex: integer("order_index").notNull(),
  // Order in the route
  estimatedDuration: integer("estimated_duration"),
  // In minutes
  customInstructions: text("custom_instructions"),
  // Any specific instructions for this stop
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertBazzaRouteStopSchema = createInsertSchema(bazzaRouteStops).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var bazzaMaintenanceAssignments = pgTable("bazza_maintenance_assignments", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => bazzaRoutes.id).notNull(),
  routeStopId: integer("route_stop_id").references(() => bazzaRouteStops.id).notNull(),
  maintenanceId: integer("maintenance_id").references(() => maintenances.id).notNull(),
  date: date("date").notNull(),
  // The specific date this maintenance is scheduled
  estimatedStartTime: timestamp("estimated_start_time"),
  // Estimated start time
  estimatedEndTime: timestamp("estimated_end_time"),
  // Estimated end time
  actualStartTime: timestamp("actual_start_time"),
  // When technician actually started
  actualEndTime: timestamp("actual_end_time"),
  // When technician actually finished
  status: text("status").notNull().default("scheduled"),
  // scheduled, completed, etc.
  notes: text("notes"),
  // Any notes specific to this maintenance on this route
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertBazzaMaintenanceAssignmentSchema = createInsertSchema(bazzaMaintenanceAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var bazzaRoutesRelations = relations(bazzaRoutes, ({ one, many }) => ({
  technician: one(technicians, {
    fields: [bazzaRoutes.technicianId],
    references: [technicians.id]
  }),
  stops: many(bazzaRouteStops),
  assignments: many(bazzaMaintenanceAssignments)
}));
var bazzaRouteStopsRelations = relations(bazzaRouteStops, ({ one, many }) => ({
  route: one(bazzaRoutes, {
    fields: [bazzaRouteStops.routeId],
    references: [bazzaRoutes.id]
  }),
  client: one(clients, {
    fields: [bazzaRouteStops.clientId],
    references: [clients.id]
  }),
  assignments: many(bazzaMaintenanceAssignments)
}));
var bazzaMaintenanceAssignmentsRelations = relations(bazzaMaintenanceAssignments, ({ one }) => ({
  route: one(bazzaRoutes, {
    fields: [bazzaMaintenanceAssignments.routeId],
    references: [bazzaRoutes.id]
  }),
  routeStop: one(bazzaRouteStops, {
    fields: [bazzaMaintenanceAssignments.routeStopId],
    references: [bazzaRouteStops.id]
  }),
  maintenance: one(maintenances, {
    fields: [bazzaMaintenanceAssignments.maintenanceId],
    references: [maintenances.id]
  })
}));
var fleetmaticsConfig = pgTable("fleetmatics_config", {
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
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertFleetmaticsConfigSchema = createInsertSchema(fleetmaticsConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  tokenExpiresAt: true,
  lastSyncTime: true
});
var fleetmaticsLocationHistory = pgTable("fleetmatics_location_history", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => technicianVehicles.id).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  speed: doublePrecision("speed"),
  // Speed in mph
  heading: integer("heading"),
  // Direction in degrees
  eventTime: timestamp("event_time").notNull(),
  address: text("address"),
  // Reverse geocoded address if available
  ignitionStatus: text("ignition_status"),
  // on, off
  odometer: doublePrecision("odometer"),
  // Current odometer reading
  fleetmaticsEventId: text("fleetmatics_event_id"),
  // ID from Fleetmatics
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertFleetmaticsLocationHistorySchema = createInsertSchema(fleetmaticsLocationHistory).omit({
  id: true,
  createdAt: true
});
var fleetmaticsConfigRelations = relations(fleetmaticsConfig, ({ one }) => ({
  organization: one(organizations, {
    fields: [fleetmaticsConfig.organizationId],
    references: [organizations.id]
  })
}));
var fleetmaticsLocationHistoryRelations = relations(fleetmaticsLocationHistory, ({ one }) => ({
  vehicle: one(technicianVehicles, {
    fields: [fleetmaticsLocationHistory.vehicleId],
    references: [technicianVehicles.id]
  })
}));

// server/storage.ts
import { and, eq, desc, gte, lte, sql, asc, isNotNull, lt, or, inArray } from "drizzle-orm";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool2 = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool2, schema: schema_exports });

// server/storage.ts
var DatabaseStorage = class {
  // Initialize ID counters for MemStorage compatibility
  inventoryItemId = 1;
  // Fleetmatics operations
  async getFleetmaticsConfig(id) {
    try {
      const result = await db.query.fleetmaticsConfig.findFirst({
        where: eq(fleetmaticsConfig.id, id)
      });
      return result;
    } catch (error) {
      console.error("Error getting Fleetmatics config:", error);
      return void 0;
    }
  }
  async getFleetmaticsConfigByOrganizationId(organizationId) {
    try {
      const result = await db.query.fleetmaticsConfig.findFirst({
        where: eq(fleetmaticsConfig.organizationId, organizationId)
      });
      return result;
    } catch (error) {
      console.error("Error getting Fleetmatics config by organization ID:", error);
      return void 0;
    }
  }
  async createFleetmaticsConfig(config) {
    try {
      const result = await db.insert(fleetmaticsConfig).values(config).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating Fleetmatics config:", error);
      throw error;
    }
  }
  async updateFleetmaticsConfig(id, config) {
    try {
      const result = await db.update(fleetmaticsConfig).set({
        ...config,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(fleetmaticsConfig.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error("Error updating Fleetmatics config:", error);
      return void 0;
    }
  }
  async getAllFleetmaticsConfigs() {
    try {
      return await db.query.fleetmaticsConfig.findMany();
    } catch (error) {
      console.error("Error getting all Fleetmatics configs:", error);
      return [];
    }
  }
  async createFleetmaticsLocationHistory(history) {
    try {
      const result = await db.insert(fleetmaticsLocationHistory).values(history).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating Fleetmatics location history:", error);
      throw error;
    }
  }
  async getFleetmaticsLocationHistory(id) {
    try {
      const result = await db.query.fleetmaticsLocationHistory.findFirst({
        where: eq(fleetmaticsLocationHistory.id, id)
      });
      return result;
    } catch (error) {
      console.error("Error getting Fleetmatics location history:", error);
      return void 0;
    }
  }
  async getFleetmaticsLocationHistoryByVehicleId(vehicleId) {
    try {
      return await db.query.fleetmaticsLocationHistory.findMany({
        where: eq(fleetmaticsLocationHistory.vehicleId, vehicleId),
        orderBy: [desc(fleetmaticsLocationHistory.eventTime)]
      });
    } catch (error) {
      console.error("Error getting Fleetmatics location history by vehicle ID:", error);
      return [];
    }
  }
  async getLatestFleetmaticsLocationByVehicleId(vehicleId) {
    try {
      const result = await db.query.fleetmaticsLocationHistory.findFirst({
        where: eq(fleetmaticsLocationHistory.vehicleId, vehicleId),
        orderBy: [desc(fleetmaticsLocationHistory.eventTime)]
      });
      return result;
    } catch (error) {
      console.error("Error getting latest Fleetmatics location by vehicle ID:", error);
      return void 0;
    }
  }
  async getFleetmaticsLocationHistoryByDateRange(vehicleId, startDate, endDate) {
    try {
      return await db.query.fleetmaticsLocationHistory.findMany({
        where: and(
          eq(fleetmaticsLocationHistory.vehicleId, vehicleId),
          gte(fleetmaticsLocationHistory.eventTime, startDate),
          lte(fleetmaticsLocationHistory.eventTime, endDate)
        ),
        orderBy: [asc(fleetmaticsLocationHistory.eventTime)]
      });
    } catch (error) {
      console.error("Error getting Fleetmatics location history by date range:", error);
      return [];
    }
  }
  warehouseId = 1;
  technicianVehicleId = 1;
  warehouseInventoryId = 1;
  vehicleInventoryId = 1;
  inventoryTransferId = 1;
  inventoryTransferItemId = 1;
  barcodeId = 1;
  barcodeScanHistoryId = 1;
  inventoryAdjustmentId = 1;
  // Organization operations
  async getOrganization(id) {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId"
        FROM organizations
        WHERE id = ${id}
      `);
      console.log(
        `[storage] getOrganization(${id}) result:`,
        result.rows.length > 0 ? JSON.stringify(result.rows[0]) : "No organization found"
      );
      if (result.rows.length === 0) {
        return void 0;
      }
      return result.rows[0];
    } catch (error) {
      console.error("Error getting organization:", error);
      return void 0;
    }
  }
  async getOrganizationBySlug(slug) {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId"
        FROM organizations
        WHERE slug = ${slug}
      `);
      console.log(
        `[storage] getOrganizationBySlug(${slug}) result:`,
        result.rows.length > 0 ? JSON.stringify(result.rows[0]) : "No organization found"
      );
      if (result.rows.length === 0) {
        return void 0;
      }
      return result.rows[0];
    } catch (error) {
      console.error("Error getting organization by slug:", error);
      return void 0;
    }
  }
  async createOrganization(organization) {
    try {
      console.log("Creating organization with data:", JSON.stringify(organization));
      const trialDurationDays = 14;
      const trialEndsAt = organization.trialEndsAt || new Date(Date.now() + trialDurationDays * 24 * 60 * 60 * 1e3);
      const organizationType = organization.type || "company";
      console.log(`Setting trial end date to: ${trialEndsAt}`);
      console.log(`Using organization type: ${organizationType}`);
      const result = await db.execute(sql`
        INSERT INTO organizations (
          name,
          slug,
          active,
          is_system_admin,
          type,
          email,
          created_at,
          trial_ends_at
        ) VALUES (
          ${organization.name || ""},
          ${organization.slug || ""},
          ${organization.active !== void 0 ? organization.active : true},
          ${organization.isSystemAdmin !== void 0 ? organization.isSystemAdmin : false},
          ${organizationType},
          ${organization.email || null},
          NOW(),
          ${trialEndsAt}
        )
        RETURNING 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          type,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId",
          trial_ends_at as "trialEndsAt"
      `);
      if (result.rows.length === 0) {
        throw new Error("Failed to create organization - no rows returned");
      }
      return result.rows[0];
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  }
  async updateOrganization(id, organization) {
    try {
      let updateSql = "UPDATE organizations SET ";
      const updateValues = [];
      const updateFields = [];
      if (organization.name !== void 0) {
        updateFields.push("name = $" + (updateValues.length + 1));
        updateValues.push(organization.name);
      }
      if (organization.slug !== void 0) {
        updateFields.push("slug = $" + (updateValues.length + 1));
        updateValues.push(organization.slug);
      }
      if (organization.address !== void 0) {
        updateFields.push("address = $" + (updateValues.length + 1));
        updateValues.push(organization.address);
      }
      if (organization.city !== void 0) {
        updateFields.push("city = $" + (updateValues.length + 1));
        updateValues.push(organization.city);
      }
      if (organization.state !== void 0) {
        updateFields.push("state = $" + (updateValues.length + 1));
        updateValues.push(organization.state);
      }
      if (organization.zipCode !== void 0) {
        updateFields.push("zip_code = $" + (updateValues.length + 1));
        updateValues.push(organization.zipCode);
      }
      if (organization.phone !== void 0) {
        updateFields.push("phone = $" + (updateValues.length + 1));
        updateValues.push(organization.phone);
      }
      if (organization.email !== void 0) {
        updateFields.push("email = $" + (updateValues.length + 1));
        updateValues.push(organization.email);
      }
      if (organization.website !== void 0) {
        updateFields.push("website = $" + (updateValues.length + 1));
        updateValues.push(organization.website);
      }
      if (organization.logo !== void 0) {
        updateFields.push("logo = $" + (updateValues.length + 1));
        updateValues.push(organization.logo);
      }
      if (organization.active !== void 0) {
        updateFields.push("active = $" + (updateValues.length + 1));
        updateValues.push(organization.active);
      }
      if (organization.isSystemAdmin !== void 0) {
        updateFields.push("is_system_admin = $" + (updateValues.length + 1));
        updateValues.push(organization.isSystemAdmin);
      }
      if (organization.subscriptionId !== void 0) {
        updateFields.push("subscription_id = $" + (updateValues.length + 1));
        updateValues.push(organization.subscriptionId);
      }
      if (organization.stripeCustomerId !== void 0) {
        updateFields.push("stripe_customer_id = $" + (updateValues.length + 1));
        updateValues.push(organization.stripeCustomerId);
      }
      updateFields.push("updated_at = $" + (updateValues.length + 1));
      updateValues.push(/* @__PURE__ */ new Date());
      if (updateFields.length === 1) {
        return await this.getOrganization(id);
      }
      updateSql += updateFields.join(", ");
      updateSql += " WHERE id = $" + (updateValues.length + 1);
      updateValues.push(id);
      updateSql += ` RETURNING 
        id, 
        name,
        slug,
        address,
        city,
        state,
        zip_code as "zipCode",
        phone,
        email,
        website,
        logo,
        active,
        created_at as "createdAt",
        is_system_admin as "isSystemAdmin",
        subscription_id as "subscriptionId",
        stripe_customer_id as "stripeCustomerId"`;
      console.log(`[storage] Executing update for organization ${id}:`, updateSql);
      const result = await pool.query(updateSql, updateValues);
      if (result.rows.length === 0) {
        return void 0;
      }
      console.log(`[storage] Organization ${id} updated successfully:`, JSON.stringify(result.rows[0]));
      return result.rows[0];
    } catch (error) {
      console.error("Error updating organization:", error);
      return void 0;
    }
  }
  async getAllOrganizations() {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId"
        FROM organizations
        ORDER BY name
      `);
      console.log("[storage] getAllOrganizations retrieved", result.rows.length, "organizations");
      if (result.rows.length > 0) {
        console.log("[storage] First organization:", JSON.stringify(result.rows[0]));
      }
      return result.rows;
    } catch (error) {
      console.error("Error getting all organizations:", error);
      return [];
    }
  }
  async getUsersByOrganizationId(organizationId) {
    try {
      return await db.select().from(users).where(eq(users.organizationId, organizationId)).orderBy(users.name);
    } catch (error) {
      console.error("Error getting users by organization ID:", error);
      return [];
    }
  }
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async getUserByGoogleId(googleId) {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, data) {
    const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updatedUser || void 0;
  }
  async deleteUser(id) {
    try {
      const user = await this.getUser(id);
      if (!user) {
        console.error(`Cannot delete user with ID ${id}: User not found`);
        return false;
      }
      if (user.role === "system_admin") {
        console.error(`Cannot delete user with ID ${id}: User is a system administrator`);
        return false;
      }
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  // Client operations
  async getClient(id) {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || void 0;
  }
  async getClientByUserId(userId) {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client || void 0;
  }
  async createClient(insertClient) {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }
  async getAllClients() {
    return await db.select().from(clients);
  }
  async getClientsByOrganizationId(organizationId) {
    console.log(`[DbStorage] getClientsByOrganizationId called for organizationId=${organizationId}`);
    try {
      console.log(`[DbStorage] Attempting direct organizationId lookup for organization ${organizationId}`);
      const directClients = await db.select().from(clients).where(eq(clients.organizationId, organizationId));
      console.log(`[DbStorage] Direct query found ${directClients.length} clients with organizationId=${organizationId}`);
      if (directClients.length > 0) {
        console.log(
          `[DbStorage] Sample clients from direct lookup:`,
          directClients.slice(0, Math.min(3, directClients.length)).map((c) => ({
            id: c.id,
            userId: c.userId,
            organizationId: c.organizationId,
            companyName: c.companyName || "undefined"
          }))
        );
        return directClients;
      }
      console.log(`[DbStorage] No clients found with direct relationship, falling back to user-based lookup for org ${organizationId}`);
      const orgUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
      console.log(`[DbStorage] Found ${orgUsers.length} users in organization ${organizationId}`);
      if (orgUsers.length > 0) {
        console.log(
          `[DbStorage] Sample users from organization ${organizationId}:`,
          orgUsers.slice(0, Math.min(3, orgUsers.length)).map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            organizationId: u.organizationId
          }))
        );
      }
      const userIds = orgUsers.map((user) => user.id);
      if (userIds.length === 0) {
        console.log(`[DbStorage] No users found in organization ${organizationId}, returning empty client list`);
        return [];
      }
      console.log(`[DbStorage] Looking up clients for ${userIds.length} users in organization ${organizationId}`);
      const userClients = await db.select().from(clients).where(inArray(clients.userId, userIds));
      console.log(`[DbStorage] Found ${userClients.length} clients using user relationship fallback`);
      if (userClients.length > 0) {
        console.log(
          `[DbStorage] Sample clients from user fallback:`,
          userClients.slice(0, Math.min(3, userClients.length)).map((c) => ({
            id: c.id,
            userId: c.userId,
            organizationId: c.organizationId,
            companyName: c.companyName || "undefined"
          }))
        );
      }
      return userClients;
    } catch (error) {
      console.error("[getClientsByOrganizationId] Error fetching clients:", error);
      try {
        console.log(`[DbStorage] Error occurred, attempting user-based fallback for organization ${organizationId}`);
        const orgUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
        console.log(`[DbStorage] Found ${orgUsers.length} users in error recovery for organization ${organizationId}`);
        const userIds = orgUsers.map((user) => user.id);
        if (userIds.length === 0) {
          console.log(`[DbStorage] No users found during error recovery for organization ${organizationId}`);
          return [];
        }
        const fallbackClients = await db.select().from(clients).where(inArray(clients.userId, userIds));
        console.log(`[DbStorage] Retrieved ${fallbackClients.length} clients in error recovery mode`);
        return fallbackClients;
      } catch (fallbackError) {
        console.error("[DbStorage] Fallback also failed:", fallbackError);
        return [];
      }
    }
  }
  async updateClient(id, data) {
    console.log(`[DB STORAGE] Updating client ${id} with data:`, JSON.stringify(data));
    if ("contractType" in data) {
      console.log(`[DB STORAGE] CONTRACT TYPE UPDATE RECEIVED: Value=${data.contractType === null ? "null" : data.contractType === void 0 ? "undefined" : `"${data.contractType}"`}, Type=${typeof data.contractType}`);
    }
    try {
      const [currentClient] = await db.select().from(clients).where(eq(clients.id, id));
      if (currentClient) {
        console.log(`[DB STORAGE] Current client before update:`, JSON.stringify(currentClient));
      }
    } catch (err) {
      console.log(`[DB STORAGE] Error reading current client:`, err);
    }
    const updatedData = { ...data };
    if (updatedData.contractType !== void 0) {
      if (updatedData.contractType === null || updatedData.contractType === "") {
        console.log(`[DB STORAGE] Setting null contract type`);
        updatedData.contractType = null;
      } else {
        const normalizedType = String(updatedData.contractType).toLowerCase();
        if (!["residential", "commercial", "service", "maintenance"].includes(normalizedType)) {
          console.error(`[DB STORAGE] Invalid contract type "${normalizedType}" - must be one of: residential, commercial, service, maintenance`);
          throw new Error(`Invalid contract type: ${normalizedType}`);
        }
        updatedData.contractType = normalizedType;
        console.log(`[DB STORAGE] Validated and normalized contract type: '${updatedData.contractType}'`);
      }
    }
    try {
      console.log(`[DB STORAGE] Executing update query with data:`, JSON.stringify(updatedData));
      const [updatedClient] = await db.update(clients).set(updatedData).where(eq(clients.id, id)).returning();
      if (updatedClient) {
        console.log(`[DB STORAGE] Client updated successfully:`, JSON.stringify(updatedClient));
        return updatedClient;
      } else {
        console.error(`[DB STORAGE] Update query returned no client`);
        return void 0;
      }
    } catch (error) {
      console.error(`[DB STORAGE] Error updating client:`, error);
      throw error;
    }
  }
  async getClientWithUser(id) {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      if (!client) {
        console.log(`Client with ID ${id} not found in database`);
        return void 0;
      }
      const [user] = await db.select().from(users).where(eq(users.id, client.userId));
      if (!user) {
        console.log(`User with ID ${client.userId} not found for client ${id}`);
        return void 0;
      }
      console.log(`Successfully retrieved client ${id} with user ${user.id}`);
      return { client, user };
    } catch (error) {
      console.error(`Error in getClientWithUser(${id}):`, error);
      return void 0;
    }
  }
  async getAllClientsWithUsers() {
    try {
      console.log("DbStorage: Fetching all clients");
      const allClients = await this.getAllClients();
      console.log(`DbStorage: Found ${allClients.length} clients, retrieving associated users`);
      if (allClients.length > 0) {
        console.log(
          "DbStorage: Sample client data:",
          allClients.slice(0, Math.min(3, allClients.length)).map((c) => ({
            id: c.id,
            userId: c.userId,
            organizationId: c.organizationId,
            companyName: c.companyName
          }))
        );
      }
      const results = [];
      for (const client of allClients) {
        try {
          const [user] = await db.select().from(users).where(eq(users.id, client.userId));
          if (user) {
            results.push({ client, user });
          } else {
            console.warn(`DbStorage: No user found for client ${client.id} with userId ${client.userId}`);
          }
        } catch (error) {
          console.error(`Error fetching user for client ${client.id}:`, error);
        }
      }
      console.log(`DbStorage: Successfully retrieved ${results.length} clients with users`);
      return results;
    } catch (error) {
      console.error("Error in getAllClientsWithUsers():", error);
      return [];
    }
  }
  async getClientsWithUsersByOrganizationId(organizationId) {
    try {
      console.log(`DbStorage: Fetching clients for organization ${organizationId}`);
      const orgClients = await this.getClientsByOrganizationId(organizationId);
      console.log(`DbStorage: Found ${orgClients.length} clients for organization ${organizationId}`);
      if (orgClients.length > 0) {
        console.log(
          `DbStorage: Sample client data for org ${organizationId}:`,
          orgClients.slice(0, Math.min(3, orgClients.length)).map((c) => ({
            id: c.id,
            userId: c.userId,
            organizationId: c.organizationId,
            companyName: c.companyName
          }))
        );
      }
      const results = [];
      for (const client of orgClients) {
        try {
          const [user] = await db.select().from(users).where(eq(users.id, client.userId));
          if (user) {
            results.push({ client, user });
          } else {
            console.warn(`DbStorage: No user found for client ${client.id} with userId ${client.userId}`);
          }
        } catch (error) {
          console.error(`Error fetching user for client ${client.id}:`, error);
        }
      }
      console.log(`DbStorage: Successfully retrieved ${results.length} clients with users for organization ${organizationId}`);
      return results;
    } catch (error) {
      console.error(`Error in getClientsWithUsersByOrganizationId(${organizationId}):`, error);
      return [];
    }
  }
  // Technician operations
  async getTechnician(id) {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    return technician || void 0;
  }
  async getTechnicianByUserId(userId) {
    const [technician] = await db.select().from(technicians).where(eq(technicians.userId, userId));
    return technician || void 0;
  }
  async createTechnician(insertTechnician) {
    const [technician] = await db.insert(technicians).values(insertTechnician).returning();
    return technician;
  }
  async getAllTechnicians() {
    return await db.select().from(technicians);
  }
  async getTechnicians() {
    return await this.getAllTechnicians();
  }
  async getTechniciansByOrganizationId(organizationId) {
    try {
      const orgUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
      if (!orgUsers || orgUsers.length === 0) {
        return [];
      }
      const userIds = orgUsers.map((user) => user.id);
      const techsList = await db.select().from(technicians).where(inArray(technicians.userId, userIds));
      return techsList;
    } catch (error) {
      console.error("Error in getTechniciansByOrganizationId:", error);
      return [];
    }
  }
  async getTechnicianWithUser(id) {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    if (!technician) return void 0;
    const [user] = await db.select().from(users).where(eq(users.id, technician.userId));
    if (!user) return void 0;
    return { technician, user };
  }
  async getAllTechniciansWithUsers() {
    try {
      const techsList = await this.getAllTechnicians();
      const result = [];
      for (const tech of techsList) {
        const [user] = await db.select().from(users).where(eq(users.id, tech.userId));
        if (user) {
          result.push({
            ...tech,
            user
          });
        }
      }
      return result;
    } catch (error) {
      console.error("Error in getAllTechniciansWithUsers:", error);
      return [];
    }
  }
  async getTechniciansByOrganizationIdWithUsers(organizationId) {
    try {
      const techsList = await this.getTechniciansByOrganizationId(organizationId);
      const result = [];
      for (const tech of techsList) {
        const [user] = await db.select().from(users).where(eq(users.id, tech.userId));
        if (user) {
          result.push({
            ...tech,
            user
          });
        }
      }
      return result;
    } catch (error) {
      console.error("Error in getTechniciansByOrganizationIdWithUsers:", error);
      return [];
    }
  }
  // Project operations
  async getProject(id) {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE id = ${id}
      `);
      if (result.rows.length === 0) {
        return void 0;
      }
      const project = result.rows[0];
      return {
        ...project,
        isArchived: project.status === "archived"
      };
    } catch (error) {
      console.error(`Error retrieving project ${id}:`, error);
      throw error;
    }
  }
  async createProject(insertProject) {
    try {
      const { isArchived, ...safeData } = insertProject;
      const result = await db.execute(sql`
        INSERT INTO projects (
          name, 
          description, 
          client_id, 
          project_type, 
          start_date, 
          estimated_completion_date,
          status,
          budget,
          current_phase,
          percent_complete,
          permit_details,
          notes
        )
        VALUES (
          ${safeData.name},
          ${safeData.description || null},
          ${safeData.clientId},
          ${safeData.projectType || "construction"},
          ${safeData.startDate},
          ${safeData.estimatedCompletionDate || null},
          ${safeData.status || "planning"},
          ${safeData.budget || null},
          ${safeData.currentPhase || null},
          ${safeData.percentComplete || 0},
          ${safeData.permitDetails || null},
          ${safeData.notes || null}
        )
        RETURNING 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes
      `);
      const project = result.rows[0];
      return {
        ...project,
        isArchived: project.status === "archived"
      };
    } catch (error) {
      console.error("[PROJECT CREATION] Error:", error);
      throw error;
    }
  }
  async updateProject(id, data) {
    try {
      const currentProject = await this.getProject(id);
      if (!currentProject) {
        return void 0;
      }
      const finalData = { ...data };
      if ("isArchived" in data) {
        const { isArchived, ...restData } = finalData;
        if (isArchived !== currentProject.isArchived) {
          restData.status = isArchived === true ? "archived" : restData.status || currentProject.status === "archived" ? "active" : currentProject.status;
          console.log(`Project ${id} archive status changing to ${isArchived}. Setting status to: ${restData.status}`);
        }
        Object.assign(finalData, restData);
        delete finalData.isArchived;
      }
      if (Object.keys(finalData).length === 0) {
        return currentProject;
      }
      const updates = Object.entries(finalData).map(([key, value]) => {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        return sql`${sql.identifier([snakeKey])} = ${value}`;
      });
      const result = await db.execute(sql`
        UPDATE projects
        SET ${sql.join(updates, sql`, `)}
        WHERE id = ${id}
        RETURNING 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes
      `);
      if (result.rows.length === 0) {
        return void 0;
      }
      const updatedProject = result.rows[0];
      return {
        ...updatedProject,
        isArchived: updatedProject.status === "archived"
      };
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      return void 0;
    }
  }
  async deleteProject(id) {
    try {
      const projectPhases2 = await this.getProjectPhasesByProjectId(id);
      for (const phase of projectPhases2) {
        await this.deleteProjectPhase(phase.id);
      }
      const projectDocuments = await this.getProjectDocumentsByProjectId(id);
      for (const document of projectDocuments) {
        await this.deleteProjectDocument(document.id);
      }
      const result = await db.delete(projects).where(eq(projects.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      return false;
    }
  }
  async getAllProjects() {
    try {
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
      `);
      const processedResults = results.rows.map((project) => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      console.log(`Retrieved ${processedResults.length} projects`);
      return processedResults;
    } catch (error) {
      console.error("Error fetching all projects:", error);
      return [];
    }
  }
  async getProjectsByClientId(clientId) {
    try {
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE client_id = ${clientId}
      `);
      const processedResults = results.rows.map((project) => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects for client ${clientId}:`, error);
      return [];
    }
  }
  async getProjectsByType(projectType) {
    try {
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE project_type = ${projectType}
      `);
      const processedResults = results.rows.map((project) => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects for type ${projectType}:`, error);
      return [];
    }
  }
  async getProjectsByStatus(status) {
    try {
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE status = ${status}
      `);
      const processedResults = results.rows.map((project) => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      console.log(`Retrieved ${processedResults.length} projects with status: ${status}`);
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects with status ${status}:`, error);
      return [];
    }
  }
  async getArchivedProjects() {
    return this.getProjectsByStatus("archived");
  }
  async getProjectPhase(id) {
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
    return phase || void 0;
  }
  async createProjectPhase(phase) {
    const [result] = await db.insert(projectPhases).values({
      ...phase,
      status: phase.status ?? "pending",
      description: phase.description ?? null,
      notes: phase.notes ?? null,
      startDate: phase.startDate ?? null,
      endDate: phase.endDate ?? null,
      percentComplete: phase.percentComplete ?? null
    }).returning();
    return result;
  }
  async updateProjectPhase(id, data) {
    const [result] = await db.update(projectPhases).set(data).where(eq(projectPhases.id, id)).returning();
    return result || void 0;
  }
  async deleteProjectPhase(id) {
    try {
      const phase = await this.getProjectPhase(id);
      if (!phase) return false;
      const result = await db.delete(projectPhases).where(eq(projectPhases.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting project phase:", error);
      return false;
    }
  }
  async getProjectPhasesByProjectId(projectId) {
    return await db.select().from(projectPhases).where(eq(projectPhases.projectId, projectId)).orderBy(projectPhases.order);
  }
  // Project assignment operations
  async createProjectAssignment(insertAssignment) {
    const [assignment] = await db.insert(projectAssignments).values(insertAssignment).returning();
    return assignment;
  }
  async getProjectAssignments(projectId) {
    try {
      const results = await db.execute(sql`
        SELECT 
          id, 
          role, 
          project_id as "projectId", 
          technician_id as "technicianId", 
          COALESCE(start_date, null) as "startDate", 
          COALESCE(end_date, null) as "endDate", 
          COALESCE(notes, null) as "notes", 
          COALESCE(phase_id, null) as "phaseId", 
          COALESCE(is_lead, false) as "isLead", 
          COALESCE(hours_allocated, null) as "hoursAllocated", 
          COALESCE(hours_logged, 0) as "hoursLogged"
        FROM project_assignments
        WHERE project_id = ${projectId}
      `);
      return results.rows;
    } catch (error) {
      console.error("Error fetching project assignments:", error);
      return [];
    }
  }
  // Maintenance operations
  async getMaintenance(id) {
    const [maintenance] = await db.select().from(maintenances).where(eq(maintenances.id, id));
    return maintenance || void 0;
  }
  async createMaintenance(insertMaintenance) {
    const maintenanceWithDefaults = {
      ...insertMaintenance,
      status: insertMaintenance.status ?? "scheduled",
      notes: insertMaintenance.notes ?? null,
      completionDate: insertMaintenance.completionDate ?? null,
      startTime: insertMaintenance.startTime ?? null,
      endTime: insertMaintenance.endTime ?? null,
      customerFeedback: insertMaintenance.customerFeedback ?? null,
      customerNotes: insertMaintenance.customerNotes ?? null,
      invoiceAmount: insertMaintenance.invoiceAmount ?? null,
      laborCost: insertMaintenance.laborCost ?? null,
      totalChemicalCost: insertMaintenance.totalChemicalCost ?? null,
      profitAmount: insertMaintenance.profitAmount ?? null,
      profitPercentage: insertMaintenance.profitPercentage ?? null
    };
    const [maintenance] = await db.insert(maintenances).values(maintenanceWithDefaults).returning();
    return maintenance;
  }
  async updateMaintenance(id, data) {
    const [updatedMaintenance] = await db.update(maintenances).set(data).where(eq(maintenances.id, id)).returning();
    return updatedMaintenance || void 0;
  }
  async getAllMaintenances() {
    return await db.select().from(maintenances);
  }
  async getMaintenancesByClientId(clientId) {
    return await db.select().from(maintenances).where(eq(maintenances.clientId, clientId));
  }
  async getMaintenancesByTechnicianId(technicianId) {
    return await db.select().from(maintenances).where(eq(maintenances.technicianId, technicianId));
  }
  async getUpcomingMaintenances(days) {
    const today = /* @__PURE__ */ new Date();
    const endDate = /* @__PURE__ */ new Date();
    endDate.setDate(today.getDate() + days);
    return await db.select().from(maintenances).where(
      and(
        gte(maintenances.scheduleDate, today.toISOString().split("T")[0]),
        lte(maintenances.scheduleDate, endDate.toISOString().split("T")[0])
      )
    ).orderBy(maintenances.scheduleDate);
  }
  async getIncompleteMaintenances(date2) {
    const dateStr = date2.toISOString().split("T")[0];
    return await db.select().from(maintenances).where(
      and(
        eq(maintenances.scheduleDate, dateStr),
        sql`(${maintenances.status} = 'scheduled' OR ${maintenances.status} = 'in_progress')`,
        sql`${maintenances.completionDate} IS NULL`
      )
    );
  }
  async rescheduleIncompleteMaintenances() {
    const today = /* @__PURE__ */ new Date();
    const todayStr = today.toISOString().split("T")[0];
    const pastIncompleteMaintenances = await db.select().from(maintenances).where(
      and(
        lt(maintenances.scheduleDate, todayStr),
        // All dates before today
        sql`(${maintenances.status} = 'scheduled' OR ${maintenances.status} = 'in_progress')`,
        sql`${maintenances.completionDate} IS NULL`
      )
    );
    const rescheduledMaintenances = [];
    for (const maintenance of pastIncompleteMaintenances) {
      const notes = maintenance.notes ? `${maintenance.notes}
Automatically rescheduled from ${maintenance.scheduleDate}` : `Automatically rescheduled from ${maintenance.scheduleDate}`;
      const updatedMaintenance = await this.updateMaintenance(maintenance.id, {
        scheduleDate: todayStr,
        notes
      });
      if (updatedMaintenance) {
        rescheduledMaintenances.push(updatedMaintenance);
      }
    }
    return rescheduledMaintenances;
  }
  // Chemical Usage operations
  async getChemicalUsage(id) {
    const [usage] = await db.select().from(chemicalUsage).where(eq(chemicalUsage.id, id));
    return usage || void 0;
  }
  async createChemicalUsage(insertUsage) {
    const usageWithDefaults = {
      ...insertUsage,
      notes: insertUsage.notes ?? null,
      reason: insertUsage.reason ?? null
    };
    const [usage] = await db.insert(chemicalUsage).values(usageWithDefaults).returning();
    return usage;
  }
  async getChemicalUsageByMaintenanceId(maintenanceId) {
    return await db.select().from(chemicalUsage).where(eq(chemicalUsage.maintenanceId, maintenanceId)).orderBy(chemicalUsage.createdAt);
  }
  async getChemicalUsageByType(type) {
    return await db.select().from(chemicalUsage).where(eq(chemicalUsage.chemicalType, type)).orderBy(chemicalUsage.createdAt);
  }
  // Water Readings operations
  async getWaterReading(id) {
    const [reading] = await db.select().from(waterReadings).where(eq(waterReadings.id, id));
    return reading || void 0;
  }
  async createWaterReading(insertReading) {
    const readingWithDefaults = {
      ...insertReading,
      phLevel: insertReading.phLevel ?? null,
      chlorineLevel: insertReading.chlorineLevel ?? null,
      alkalinity: insertReading.alkalinity ?? null,
      cyanuricAcid: insertReading.cyanuricAcid ?? null,
      calciumHardness: insertReading.calciumHardness ?? null,
      totalDissolvedSolids: insertReading.totalDissolvedSolids ?? null,
      saltLevel: insertReading.saltLevel ?? null,
      phosphates: insertReading.phosphates ?? null
    };
    const [reading] = await db.insert(waterReadings).values(readingWithDefaults).returning();
    return reading;
  }
  async getWaterReadingsByMaintenanceId(maintenanceId) {
    return await db.select().from(waterReadings).where(eq(waterReadings.maintenanceId, maintenanceId)).orderBy(waterReadings.createdAt);
  }
  async getLatestWaterReadingByClientId(clientId) {
    const clientMaintenances = await db.select().from(maintenances).where(eq(maintenances.clientId, clientId));
    if (clientMaintenances.length === 0) {
      return void 0;
    }
    const maintenanceIds = clientMaintenances.map((m) => m.id);
    const [latestReading] = await db.select().from(waterReadings).where(sql`${waterReadings.maintenanceId} IN (${maintenanceIds.join(",")})`).orderBy(desc(waterReadings.createdAt)).limit(1);
    return latestReading || void 0;
  }
  // Maintenance Report operations
  async getMaintenanceReport(id) {
    const [report] = await db.select().from(maintenanceReports).where(eq(maintenanceReports.id, id)).limit(1);
    return report;
  }
  async getMaintenanceReportsByMaintenanceId(maintenanceId) {
    return db.select().from(maintenanceReports).where(eq(maintenanceReports.maintenanceId, maintenanceId)).orderBy(desc(maintenanceReports.createdAt));
  }
  async createMaintenanceReport(report) {
    const [newReport] = await db.insert(maintenanceReports).values(report).returning();
    return newReport;
  }
  async updateMaintenanceReport(id, report) {
    const [updatedReport] = await db.update(maintenanceReports).set({
      ...report,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(maintenanceReports.id, id)).returning();
    return updatedReport;
  }
  async deleteMaintenanceReport(id) {
    try {
      await db.delete(maintenanceReports).where(eq(maintenanceReports.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete maintenance report:", error);
      return false;
    }
  }
  // Repair operations
  async getRepair(id) {
    const [repair] = await db.select().from(repairs).where(eq(repairs.id, id));
    return repair || void 0;
  }
  async createRepair(insertRepair) {
    const [repair] = await db.insert(repairs).values({
      ...insertRepair,
      description: insertRepair.description || null,
      reportedDate: /* @__PURE__ */ new Date(),
      completionDate: null
    }).returning();
    return repair;
  }
  async updateRepair(id, data) {
    const [updatedRepair] = await db.update(repairs).set(data).where(eq(repairs.id, id)).returning();
    return updatedRepair || void 0;
  }
  async getAllRepairs() {
    return await db.select().from(repairs);
  }
  async getRepairsByClientId(clientId) {
    return await db.select().from(repairs).where(eq(repairs.clientId, clientId));
  }
  async getRepairsByTechnicianId(technicianId) {
    return await db.select().from(repairs).where(eq(repairs.technicianId, technicianId));
  }
  async getRecentRepairs(count) {
    return await db.select().from(repairs).orderBy(desc(repairs.reportedDate)).limit(count);
  }
  // Invoice operations
  async getInvoice(id) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || void 0;
  }
  async createInvoice(insertInvoice) {
    const now = /* @__PURE__ */ new Date();
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    if (invoice) {
      await db.update(invoices).set({ issueDate: now }).where(eq(invoices.id, invoice.id));
    }
    return invoice;
  }
  async updateInvoice(id, data) {
    const [updatedInvoice] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updatedInvoice || void 0;
  }
  async getAllInvoices() {
    return await db.select().from(invoices);
  }
  async getInvoicesByClientId(clientId) {
    return await db.select().from(invoices).where(eq(invoices.clientId, clientId));
  }
  // Pool Equipment operations
  async getPoolEquipment(id) {
    const [equipment] = await db.select().from(poolEquipment).where(eq(poolEquipment.id, id));
    return equipment || void 0;
  }
  async createPoolEquipment(insertEquipment) {
    const [equipment] = await db.insert(poolEquipment).values(insertEquipment).returning();
    return equipment;
  }
  async updatePoolEquipment(id, data) {
    const [updatedEquipment] = await db.update(poolEquipment).set(data).where(eq(poolEquipment.id, id)).returning();
    return updatedEquipment || void 0;
  }
  async getPoolEquipmentByClientId(clientId) {
    return await db.select().from(poolEquipment).where(eq(poolEquipment.clientId, clientId));
  }
  // Pool Images operations
  async getPoolImage(id) {
    const [image] = await db.select().from(poolImages).where(eq(poolImages.id, id));
    return image || void 0;
  }
  async createPoolImage(insertImage) {
    const imageWithDate = {
      ...insertImage,
      uploadDate: /* @__PURE__ */ new Date()
    };
    const [image] = await db.insert(poolImages).values(imageWithDate).returning();
    return image;
  }
  async getPoolImagesByClientId(clientId) {
    return await db.select().from(poolImages).where(eq(poolImages.clientId, clientId));
  }
  // Service Template operations
  async getServiceTemplate(id) {
    const [template] = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id));
    return template || void 0;
  }
  async createServiceTemplate(insertTemplate) {
    if (insertTemplate.isDefault) {
      await db.update(serviceTemplates).set({ isDefault: false }).where(eq(serviceTemplates.type, insertTemplate.type));
    }
    const [template] = await db.insert(serviceTemplates).values(insertTemplate).returning();
    return template;
  }
  async updateServiceTemplate(id, data) {
    if (data.isDefault && data.type) {
      await db.update(serviceTemplates).set({ isDefault: false }).where(eq(serviceTemplates.type, data.type));
    } else if (data.isDefault) {
      const [existingTemplate] = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id));
      if (existingTemplate) {
        await db.update(serviceTemplates).set({ isDefault: false }).where(and(
          eq(serviceTemplates.type, existingTemplate.type),
          eq(serviceTemplates.isDefault, true)
        ));
      }
    }
    const [updatedTemplate] = await db.update(serviceTemplates).set(data).where(eq(serviceTemplates.id, id)).returning();
    return updatedTemplate || void 0;
  }
  async deleteServiceTemplate(id) {
    const [deletedTemplate] = await db.delete(serviceTemplates).where(eq(serviceTemplates.id, id)).returning();
    return !!deletedTemplate;
  }
  async getAllServiceTemplates() {
    return await db.select().from(serviceTemplates);
  }
  async getDefaultServiceTemplate(type) {
    const [template] = await db.select().from(serviceTemplates).where(and(
      eq(serviceTemplates.type, type),
      eq(serviceTemplates.isDefault, true)
    ));
    return template || void 0;
  }
  // Project Documentation operations
  async getProjectDocument(id) {
    const [document] = await db.select().from(projectDocumentation).where(eq(projectDocumentation.id, id));
    return document;
  }
  async createProjectDocument(document) {
    try {
      const { uploadDate, ...cleanDocument } = document;
      const [result] = await db.insert(projectDocumentation).values({
        ...cleanDocument,
        description: document.description ?? null,
        tags: document.tags ?? [],
        isPublic: document.isPublic ?? false
      }).returning();
      return result;
    } catch (error) {
      console.error("Error in createProjectDocument:", error);
      throw error;
    }
  }
  async updateProjectDocument(id, data) {
    const [result] = await db.update(projectDocumentation).set(data).where(eq(projectDocumentation.id, id)).returning();
    return result;
  }
  async deleteProjectDocument(id) {
    const result = await db.delete(projectDocumentation).where(eq(projectDocumentation.id, id));
    return !!result.count;
  }
  async getProjectDocumentsByProjectId(projectId) {
    return await db.select().from(projectDocumentation).where(eq(projectDocumentation.projectId, projectId)).orderBy(desc(projectDocumentation.uploadDate));
  }
  async getProjectDocumentsByPhaseId(phaseId) {
    return await db.select().from(projectDocumentation).where(eq(projectDocumentation.phaseId, phaseId)).orderBy(desc(projectDocumentation.uploadDate));
  }
  async getProjectDocumentsByType(projectId, documentType) {
    return await db.select().from(projectDocumentation).where(and(
      eq(projectDocumentation.projectId, projectId),
      eq(projectDocumentation.documentType, documentType)
    )).orderBy(desc(projectDocumentation.uploadDate));
  }
  // Route operations
  async getRoute(id) {
    const result = await db.query.routes.findFirst({
      where: eq(routes.id, id),
      with: { technician: true }
    });
    return result;
  }
  async createRoute(insertRoute) {
    const [route] = await db.insert(routes).values({
      ...insertRoute,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return route;
  }
  async updateRoute(id, data) {
    const route = await this.getRoute(id);
    if (!route) return void 0;
    const [updatedRoute] = await db.update(routes).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(routes.id, id)).returning();
    return updatedRoute;
  }
  async deleteRoute(id) {
    const route = await this.getRoute(id);
    if (!route) return false;
    const assignments = await this.getRouteAssignmentsByRouteId(id);
    for (const assignment of assignments) {
      await this.deleteRouteAssignment(assignment.id);
    }
    await db.delete(routes).where(eq(routes.id, id));
    return true;
  }
  async getAllRoutes() {
    const result = await db.query.routes.findMany({
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)]
    });
    return result;
  }
  async getRoutesByTechnicianId(technicianId) {
    const result = await db.query.routes.findMany({
      where: eq(routes.technicianId, technicianId),
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)]
    });
    return result;
  }
  async getRoutesByDayOfWeek(dayOfWeek) {
    const result = await db.query.routes.findMany({
      where: eq(routes.dayOfWeek, dayOfWeek),
      with: { technician: true },
      orderBy: asc(routes.startTime)
    });
    return result;
  }
  async getRoutesByType(type) {
    const result = await db.query.routes.findMany({
      where: eq(routes.type, type),
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)]
    });
    return result;
  }
  // Route Assignment operations
  async getRouteAssignment(id) {
    const result = await db.query.routeAssignments.findFirst({
      where: eq(routeAssignments.id, id),
      with: { route: true, maintenance: true }
    });
    return result;
  }
  async createRouteAssignment(insertAssignment) {
    const [assignment] = await db.insert(routeAssignments).values({
      ...insertAssignment,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return assignment;
  }
  async updateRouteAssignment(id, data) {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return void 0;
    const [updatedAssignment] = await db.update(routeAssignments).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(routeAssignments.id, id)).returning();
    return updatedAssignment;
  }
  async deleteRouteAssignment(id) {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return false;
    await db.delete(routeAssignments).where(eq(routeAssignments.id, id));
    return true;
  }
  async getRouteAssignmentsByRouteId(routeId) {
    const result = await db.query.routeAssignments.findMany({
      where: eq(routeAssignments.routeId, routeId),
      with: { maintenance: true },
      orderBy: asc(routeAssignments.orderIndex)
    });
    return result;
  }
  async getRouteAssignmentsByMaintenanceId(maintenanceId) {
    const result = await db.query.routeAssignments.findMany({
      where: eq(routeAssignments.maintenanceId, maintenanceId),
      with: { route: true },
      orderBy: asc(routeAssignments.orderIndex)
    });
    return result;
  }
  async reorderRouteAssignments(routeId, assignmentIds) {
    const updatedAssignments = [];
    for (let index = 0; index < assignmentIds.length; index++) {
      const id = assignmentIds[index];
      const assignment = await this.getRouteAssignment(id);
      if (assignment && assignment.routeId === routeId) {
        const updatedAssignment = await this.updateRouteAssignment(assignment.id, { orderIndex: index });
        if (updatedAssignment) {
          updatedAssignments.push(updatedAssignment);
        }
      }
    }
    return updatedAssignments;
  }
  // Bazza Route operations
  async getBazzaRoute(id) {
    const [route] = await db.select().from(bazzaRoutes).where(eq(bazzaRoutes.id, id));
    return route || void 0;
  }
  async createBazzaRoute(route) {
    try {
      console.log(`Creating new bazza route with name: "${route.name}"`);
      if (!route.name || !route.dayOfWeek || !route.type) {
        const missingFields = [];
        if (!route.name) missingFields.push("name");
        if (!route.dayOfWeek) missingFields.push("dayOfWeek");
        if (!route.type) missingFields.push("type");
        console.error(`Cannot create route: missing required fields: ${missingFields.join(", ")}`);
        throw new Error(`Missing required fields for route: ${missingFields.join(", ")}`);
      }
      const technicianId = route.technicianId === void 0 ? null : route.technicianId;
      const routeToInsert = {
        ...route,
        technicianId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      console.log(`Creating bazza route with data: ${JSON.stringify(routeToInsert)}`);
      const [newRoute] = await db.insert(bazzaRoutes).values(routeToInsert).returning();
      console.log(`Successfully created bazza route with ID: ${newRoute.id}`);
      return newRoute;
    } catch (error) {
      console.error(`Error in createBazzaRoute:`, error);
      throw error;
    }
  }
  async updateBazzaRoute(id, route) {
    const existingRoute = await this.getBazzaRoute(id);
    if (!existingRoute) return void 0;
    const [updatedRoute] = await db.update(bazzaRoutes).set({ ...route, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bazzaRoutes.id, id)).returning();
    return updatedRoute;
  }
  async deleteBazzaRoute(id) {
    try {
      const route = await this.getBazzaRoute(id);
      if (!route) {
        console.log(`Route with ID ${id} not found for deletion`);
        return false;
      }
      console.log(`Starting deletion process for route ID: ${id}, name: ${route.name}`);
      return await db.transaction(async (tx) => {
        try {
          const stops = await this.getBazzaRouteStopsByRouteId(id);
          console.log(`Found ${stops.length} stops to delete for route ID: ${id}`);
          if (stops.length > 0) {
            console.log(`Batch deleting ${stops.length} stops for route ID: ${id}`);
            await tx.delete(bazzaRouteStops).where(eq(bazzaRouteStops.routeId, id));
            console.log(`Successfully deleted all stops for route ID: ${id}`);
          }
        } catch (stopsError) {
          console.error(`Error deleting stops for route ID: ${id}:`, stopsError);
          throw stopsError;
        }
        try {
          const assignments = await this.getBazzaMaintenanceAssignmentsByRouteId(id);
          console.log(`Found ${assignments.length} assignments to delete for route ID: ${id}`);
          if (assignments.length > 0) {
            console.log(`Batch deleting ${assignments.length} assignments for route ID: ${id}`);
            await tx.delete(bazzaMaintenanceAssignments).where(eq(bazzaMaintenanceAssignments.routeId, id));
            console.log(`Successfully deleted all assignments for route ID: ${id}`);
          }
        } catch (assignmentsError) {
          console.error(`Error deleting assignments for route ID: ${id}:`, assignmentsError);
          throw assignmentsError;
        }
        console.log(`Executing final route deletion for ID: ${id}`);
        await tx.delete(bazzaRoutes).where(eq(bazzaRoutes.id, id));
        console.log(`Successfully deleted route ID: ${id}`);
        return true;
      });
    } catch (error) {
      console.error(`Error in deleteBazzaRoute for route ID: ${id}:`, error);
      if (error instanceof Error) {
        if (error.message.includes("foreign key constraint")) {
          console.error(`Foreign key constraint error when deleting route ID: ${id}. The route might be referenced by other records.`);
        } else if (error.message.includes("deadlock")) {
          console.error(`Deadlock detected when deleting route ID: ${id}. Database is busy with conflicting operations.`);
        }
      }
      throw error;
    }
  }
  // Enhanced Bazza Route retrieval with logging
  async getAllBazzaRoutes() {
    console.log(`[STORAGE] Fetching all Bazza routes`);
    try {
      const allRoutes = await db.select().from(bazzaRoutes).orderBy(bazzaRoutes.name);
      console.log(`[STORAGE] Successfully fetched ${allRoutes.length} Bazza routes`);
      return allRoutes;
    } catch (error) {
      console.error(`[STORAGE] Error fetching all Bazza routes: ${error}`);
      throw error;
    }
  }
  // Enhanced function with universal fallback mechanism and better logging
  async getBazzaRoutesByTechnicianId(technicianId) {
    const isKnownProblemTechnician = technicianId === 10;
    if (isKnownProblemTechnician) {
      console.log(`[STORAGE] Enhanced handling for known problem technician (ID: ${technicianId})`);
    } else {
      console.log(`[STORAGE] Fetching routes for technician ID: ${technicianId}`);
    }
    try {
      const routes2 = await db.select().from(bazzaRoutes).where(eq(bazzaRoutes.technicianId, technicianId)).orderBy(bazzaRoutes.dayOfWeek);
      console.log(`[STORAGE] Primary query found ${routes2.length} routes for technician ID: ${technicianId}`);
      if (isKnownProblemTechnician || routes2.length === 0) {
        if (routes2.length > 0) {
          console.log(`[STORAGE] Routes found: ${JSON.stringify(routes2.map((r) => ({ id: r.id, name: r.name })))}`);
        } else {
          console.log(`[STORAGE] No routes found in primary query - will attempt fallback`);
        }
      }
      if (routes2.length === 0) {
        console.log(`[STORAGE] Attempting fallback query approach for technician ID ${technicianId}`);
        const allRoutes = await db.select().from(bazzaRoutes);
        console.log(`[STORAGE] Fallback query retrieved ${allRoutes.length} total routes from database`);
        const technicianRoutes = allRoutes.filter((route) => route.technicianId === technicianId);
        console.log(`[STORAGE] Fallback filtering found ${technicianRoutes.length} routes for technician ID ${technicianId}`);
        if (technicianRoutes.length > 0) {
          console.log(`[STORAGE] Using fallback results for technician ID ${technicianId}`);
          return technicianRoutes.sort((a, b) => {
            return a.dayOfWeek.localeCompare(b.dayOfWeek);
          });
        }
      }
      return routes2;
    } catch (error) {
      console.error(`[STORAGE] Error in primary query for technician ID ${technicianId}: ${error}`);
      try {
        console.log(`[STORAGE] Attempting emergency fallback query after error`);
        const allRoutes = await db.select().from(bazzaRoutes);
        const filteredRoutes = allRoutes.filter((route) => route.technicianId === technicianId).sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek));
        console.log(`[STORAGE] Emergency fallback found ${filteredRoutes.length} routes`);
        return filteredRoutes;
      } catch (fallbackError) {
        console.error(`[STORAGE] Emergency fallback also failed: ${fallbackError}`);
        throw error;
      }
    }
  }
  async getBazzaRoutesByDayOfWeek(dayOfWeek) {
    return db.select().from(bazzaRoutes).where(eq(bazzaRoutes.dayOfWeek, dayOfWeek)).orderBy(bazzaRoutes.name);
  }
  async getBazzaRoutesByType(type) {
    return db.select().from(bazzaRoutes).where(eq(bazzaRoutes.type, type)).orderBy(bazzaRoutes.name);
  }
  // Bazza Route Stop operations
  async getBazzaRouteStop(id) {
    const [stop] = await db.select().from(bazzaRouteStops).where(eq(bazzaRouteStops.id, id));
    return stop || void 0;
  }
  async createBazzaRouteStop(stop) {
    try {
      console.log(`Creating new bazza route stop for route ID: ${stop.routeId}, client ID: ${stop.clientId}`);
      if (!stop.routeId || !stop.clientId) {
        const missingFields = [];
        if (!stop.routeId) missingFields.push("routeId");
        if (!stop.clientId) missingFields.push("clientId");
        console.error(`Cannot create route stop: missing required fields: ${missingFields.join(", ")}`);
        throw new Error(`Missing required fields for route stop: ${missingFields.join(", ")}`);
      }
      if (!stop.orderIndex) {
        console.log(`No orderIndex provided, calculating the next available index for route ID: ${stop.routeId}`);
        const existingStops = await this.getBazzaRouteStopsByRouteId(stop.routeId);
        if (existingStops.length === 0) {
          stop.orderIndex = 1;
          console.log(`No existing stops found, starting with orderIndex 1`);
        } else {
          const maxOrderIndex = existingStops.reduce((max, s) => s.orderIndex > max ? s.orderIndex : max, 0);
          stop.orderIndex = maxOrderIndex + 1;
          console.log(`Found ${existingStops.length} existing stops with max orderIndex: ${maxOrderIndex}`);
          console.log(`Calculated orderIndex for new stop: ${stop.orderIndex}`);
        }
      }
      const stopToInsert = {
        ...stop,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      console.log(`Creating bazza route stop with data: ${JSON.stringify(stopToInsert)}`);
      const [newStop] = await db.insert(bazzaRouteStops).values(stopToInsert).returning();
      console.log(`Successfully created bazza route stop with ID: ${newStop.id}`);
      return newStop;
    } catch (error) {
      console.error(`Error in createBazzaRouteStop:`, error);
      throw error;
    }
  }
  async updateBazzaRouteStop(id, stop) {
    const existingStop = await this.getBazzaRouteStop(id);
    if (!existingStop) return void 0;
    const [updatedStop] = await db.update(bazzaRouteStops).set({ ...stop, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bazzaRouteStops.id, id)).returning();
    return updatedStop;
  }
  async deleteBazzaRouteStop(id) {
    try {
      const stop = await this.getBazzaRouteStop(id);
      if (!stop) {
        console.log(`Route stop with ID ${id} not found for deletion`);
        return false;
      }
      console.log(`Starting deletion process for route stop ID: ${id}, for route ID: ${stop.routeId}`);
      return await db.transaction(async (tx) => {
        try {
          const assignments = await db.select().from(bazzaMaintenanceAssignments).where(eq(bazzaMaintenanceAssignments.routeStopId, id));
          console.log(`Found ${assignments.length} maintenance assignments to delete for route stop ID: ${id}`);
          if (assignments.length > 0) {
            await tx.delete(bazzaMaintenanceAssignments).where(eq(bazzaMaintenanceAssignments.routeStopId, id));
            console.log(`Successfully deleted all assignments for route stop ID: ${id}`);
          }
          console.log(`Executing route stop deletion for ID: ${id}`);
          await tx.delete(bazzaRouteStops).where(eq(bazzaRouteStops.id, id));
          console.log(`Successfully deleted route stop ID: ${id}`);
          return true;
        } catch (txError) {
          console.error(`Transaction error deleting route stop ID: ${id}:`, txError);
          throw txError;
        }
      });
    } catch (error) {
      console.error(`Error in deleteBazzaRouteStop for ID: ${id}:`, error);
      if (error instanceof Error) {
        if (error.message.includes("foreign key constraint")) {
          console.error(`Foreign key constraint error when deleting route stop ID: ${id}. The stop might be referenced by other records.`);
        } else if (error.message.includes("deadlock")) {
          console.error(`Deadlock detected when deleting route stop ID: ${id}. Database is busy with conflicting operations.`);
        }
      }
      throw error;
    }
  }
  async getBazzaRouteStopsByRouteId(routeId) {
    return db.select().from(bazzaRouteStops).where(eq(bazzaRouteStops.routeId, routeId)).orderBy(bazzaRouteStops.orderIndex);
  }
  async getBazzaRouteStopsByClientId(clientId) {
    return db.select().from(bazzaRouteStops).where(eq(bazzaRouteStops.clientId, clientId)).orderBy(bazzaRouteStops.routeId);
  }
  async reorderBazzaRouteStops(routeId, stopIds) {
    try {
      console.log(`Reordering stops for route ID: ${routeId}, stop IDs: ${stopIds.join(", ")}`);
      const updatedStops = [];
      const stopsToUpdate = [];
      for (const id of stopIds) {
        const stop = await this.getBazzaRouteStop(id);
        if (stop && stop.routeId === routeId) {
          stopsToUpdate.push({ id, stop });
        } else {
          console.warn(`Stop ID ${id} does not exist or doesn't belong to route ${routeId}`);
        }
      }
      console.log(`Found ${stopsToUpdate.length} valid stops to reorder`);
      for (let index = 0; index < stopsToUpdate.length; index++) {
        const { id, stop } = stopsToUpdate[index];
        const orderIndex = index + 1;
        console.log(`Setting stop ID ${id} to orderIndex ${orderIndex}`);
        const updatedStop = await this.updateBazzaRouteStop(id, { orderIndex });
        if (updatedStop) {
          updatedStops.push(updatedStop);
          console.log(`Successfully updated stop ID: ${id}`);
        } else {
          console.error(`Failed to update stop ID: ${id}`);
        }
      }
      return updatedStops;
    } catch (error) {
      console.error(`Error in reorderBazzaRouteStops for route ID: ${routeId}:`, error);
      throw error;
    }
  }
  // Bazza Maintenance Assignment operations
  async getBazzaMaintenanceAssignment(id) {
    const [assignment] = await db.select().from(bazzaMaintenanceAssignments).where(eq(bazzaMaintenanceAssignments.id, id));
    return assignment || void 0;
  }
  async createBazzaMaintenanceAssignment(assignment) {
    try {
      console.log(`Creating new bazza maintenance assignment for route ID: ${assignment.routeId}, maintenance ID: ${assignment.maintenanceId}`);
      if (!assignment.routeId || !assignment.maintenanceId) {
        const missingFields = [];
        if (!assignment.routeId) missingFields.push("routeId");
        if (!assignment.maintenanceId) missingFields.push("maintenanceId");
        console.error(`Cannot create maintenance assignment: missing required fields: ${missingFields.join(", ")}`);
        throw new Error(`Missing required fields for maintenance assignment: ${missingFields.join(", ")}`);
      }
      const assignmentToInsert = {
        ...assignment,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      console.log(`Creating bazza maintenance assignment with data: ${JSON.stringify(assignmentToInsert)}`);
      const [newAssignment] = await db.insert(bazzaMaintenanceAssignments).values(assignmentToInsert).returning();
      console.log(`Successfully created bazza maintenance assignment with ID: ${newAssignment.id}`);
      return newAssignment;
    } catch (error) {
      console.error(`Error in createBazzaMaintenanceAssignment:`, error);
      throw error;
    }
  }
  async updateBazzaMaintenanceAssignment(id, assignment) {
    const existingAssignment = await this.getBazzaMaintenanceAssignment(id);
    if (!existingAssignment) return void 0;
    const [updatedAssignment] = await db.update(bazzaMaintenanceAssignments).set({ ...assignment, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bazzaMaintenanceAssignments.id, id)).returning();
    return updatedAssignment;
  }
  async deleteBazzaMaintenanceAssignment(id) {
    try {
      const assignment = await this.getBazzaMaintenanceAssignment(id);
      if (!assignment) {
        console.log(`Maintenance assignment with ID ${id} not found for deletion`);
        return false;
      }
      console.log(`Deleting maintenance assignment ID: ${id}, for route ID: ${assignment.routeId}, maintenance ID: ${assignment.maintenanceId}`);
      return await db.transaction(async (tx) => {
        await tx.delete(bazzaMaintenanceAssignments).where(eq(bazzaMaintenanceAssignments.id, id));
        console.log(`Successfully deleted maintenance assignment ID: ${id}`);
        return true;
      });
    } catch (error) {
      console.error(`Error in deleteBazzaMaintenanceAssignment for ID: ${id}:`, error);
      if (error instanceof Error) {
        if (error.message.includes("foreign key constraint")) {
          console.error(`Foreign key constraint error when deleting assignment ID: ${id}. The assignment might be referenced by other records.`);
        } else if (error.message.includes("deadlock")) {
          console.error(`Deadlock detected when deleting assignment ID: ${id}. Database is busy with conflicting operations.`);
        }
      }
      throw error;
    }
  }
  async getBazzaMaintenanceAssignmentsByRouteId(routeId) {
    return db.select().from(bazzaMaintenanceAssignments).where(eq(bazzaMaintenanceAssignments.routeId, routeId)).orderBy(bazzaMaintenanceAssignments.date);
  }
  async getBazzaMaintenanceAssignmentsByMaintenanceId(maintenanceId) {
    return db.select().from(bazzaMaintenanceAssignments).where(eq(bazzaMaintenanceAssignments.maintenanceId, maintenanceId)).orderBy(bazzaMaintenanceAssignments.date);
  }
  async getBazzaMaintenanceAssignmentsByDate(date2) {
    const dateStr = date2.toISOString().split("T")[0];
    return db.select().from(bazzaMaintenanceAssignments).where(sql`${bazzaMaintenanceAssignments.date}::text = ${dateStr}`).orderBy(bazzaMaintenanceAssignments.estimatedStartTime);
  }
  async getBazzaMaintenanceAssignmentsByTechnicianIdAndDateRange(technicianId, startDate, endDate) {
    const routes2 = await this.getBazzaRoutesByTechnicianId(technicianId);
    const routeIds = routes2.map((route) => route.id);
    if (routeIds.length === 0) {
      return [];
    }
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    return db.select().from(bazzaMaintenanceAssignments).where(and(
      inArray(bazzaMaintenanceAssignments.routeId, routeIds),
      gte(bazzaMaintenanceAssignments.date, startDateStr),
      lte(bazzaMaintenanceAssignments.date, endDateStr)
    )).orderBy([
      bazzaMaintenanceAssignments.date,
      bazzaMaintenanceAssignments.estimatedStartTime
    ]);
  }
  // Communication Provider operations
  async getCommunicationProvider(id) {
    const [provider] = await db.select().from(communicationProviders).where(eq(communicationProviders.id, id));
    return provider || void 0;
  }
  async getCommunicationProviderByType(type) {
    const [provider] = await db.select().from(communicationProviders).where(eq(communicationProviders.type, type)).orderBy(desc(communicationProviders.isDefault));
    return provider || void 0;
  }
  async createCommunicationProvider(insertProvider) {
    if (insertProvider.isDefault) {
      await db.update(communicationProviders).set({ isDefault: false }).where(and(
        eq(communicationProviders.type, insertProvider.type),
        eq(communicationProviders.isDefault, true)
      ));
    }
    const [provider] = await db.insert(communicationProviders).values({
      ...insertProvider,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return provider;
  }
  async updateCommunicationProvider(id, data) {
    if (data.isDefault) {
      const [provider] = await db.select().from(communicationProviders).where(eq(communicationProviders.id, id));
      if (provider) {
        await db.update(communicationProviders).set({ isDefault: false }).where(and(
          eq(communicationProviders.type, provider.type),
          eq(communicationProviders.isDefault, true),
          sql`${communicationProviders.id} != ${id}`
        ));
      }
    }
    const [updatedProvider] = await db.update(communicationProviders).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(communicationProviders.id, id)).returning();
    return updatedProvider || void 0;
  }
  async deleteCommunicationProvider(id) {
    const result = await db.delete(communicationProviders).where(eq(communicationProviders.id, id));
    return result.rowCount > 0;
  }
  async getAllCommunicationProviders() {
    return await db.select().from(communicationProviders);
  }
  async getDefaultCommunicationProvider(type) {
    const [provider] = await db.select().from(communicationProviders).where(and(
      eq(communicationProviders.type, type),
      eq(communicationProviders.isDefault, true)
    ));
    return provider || void 0;
  }
  // Business Module Operations - Stub implementations
  // Will need to be implemented later as needed
  async getExpense(id) {
    throw new Error("Method not implemented.");
  }
  async createExpense(expense) {
    throw new Error("Method not implemented.");
  }
  async updateExpense(id, expense) {
    throw new Error("Method not implemented.");
  }
  async deleteExpense(id) {
    throw new Error("Method not implemented.");
  }
  async getAllExpenses() {
    throw new Error("Method not implemented.");
  }
  async getExpensesByCategory(category) {
    throw new Error("Method not implemented.");
  }
  async getExpensesByDateRange(startDate, endDate) {
    throw new Error("Method not implemented.");
  }
  async getTimeEntry(id) {
    throw new Error("Method not implemented.");
  }
  async createTimeEntry(entry) {
    throw new Error("Method not implemented.");
  }
  async updateTimeEntry(id, entry) {
    throw new Error("Method not implemented.");
  }
  async deleteTimeEntry(id) {
    throw new Error("Method not implemented.");
  }
  async getAllTimeEntries() {
    throw new Error("Method not implemented.");
  }
  async getTimeEntriesByUserId(userId) {
    throw new Error("Method not implemented.");
  }
  async getTimeEntriesByDateRange(startDate, endDate) {
    throw new Error("Method not implemented.");
  }
  async getTimeEntriesByStatus(status) {
    throw new Error("Method not implemented.");
  }
  async getTimeEntriesByProjectId(projectId) {
    throw new Error("Method not implemented.");
  }
  async getFinancialReport(id) {
    throw new Error("Method not implemented.");
  }
  async createFinancialReport(report) {
    throw new Error("Method not implemented.");
  }
  async updateFinancialReport(id, report) {
    throw new Error("Method not implemented.");
  }
  async deleteFinancialReport(id) {
    throw new Error("Method not implemented.");
  }
  async getAllFinancialReports() {
    throw new Error("Method not implemented.");
  }
  async getFinancialReportsByType(type) {
    throw new Error("Method not implemented.");
  }
  async getVendor(id) {
    throw new Error("Method not implemented.");
  }
  async createVendor(vendor) {
    throw new Error("Method not implemented.");
  }
  async updateVendor(id, vendor) {
    throw new Error("Method not implemented.");
  }
  async deleteVendor(id) {
    throw new Error("Method not implemented.");
  }
  async getAllVendors() {
    throw new Error("Method not implemented.");
  }
  async getVendorsByCategory(category) {
    throw new Error("Method not implemented.");
  }
  async getPurchaseOrder(id) {
    throw new Error("Method not implemented.");
  }
  async createPurchaseOrder(order) {
    throw new Error("Method not implemented.");
  }
  async updatePurchaseOrder(id, order) {
    throw new Error("Method not implemented.");
  }
  async deletePurchaseOrder(id) {
    throw new Error("Method not implemented.");
  }
  async getAllPurchaseOrders() {
    throw new Error("Method not implemented.");
  }
  async getPurchaseOrdersByVendorId(vendorId) {
    throw new Error("Method not implemented.");
  }
  async getPurchaseOrdersByStatus(status) {
    throw new Error("Method not implemented.");
  }
  async getPurchaseOrdersByDateRange(startDate, endDate) {
    throw new Error("Method not implemented.");
  }
  // Get projects by status
  async getProjectsByStatus(status) {
    try {
      const result = await db.select().from(projects).where(eq(projects.status, status));
      return result.map((project) => ({
        ...project,
        isArchived: project.status === "archived"
      }));
    } catch (error) {
      console.error(`Error retrieving projects by status '${status}':`, error);
      return [];
    }
  }
  // Get archived projects
  async getArchivedProjects() {
    try {
      const result = await db.select().from(projects).where(eq(projects.status, "archived"));
      return result.map((project) => ({
        ...project,
        isArchived: true
      }));
    } catch (error) {
      console.error("Error retrieving archived projects:", error);
      return [];
    }
  }
  // Inventory Management System Implementation
  // Inventory Item operations
  async getInventoryItem(id) {
    try {
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
      return item || void 0;
    } catch (error) {
      console.error(`Error retrieving inventory item ${id}:`, error);
      return void 0;
    }
  }
  async createInventoryItem(insertItem) {
    try {
      const [item] = await db.insert(inventoryItems).values(insertItem).returning();
      return item;
    } catch (error) {
      console.error("Error creating inventory item:", error);
      throw error;
    }
  }
  async updateInventoryItem(id, data) {
    try {
      const [updatedItem] = await db.update(inventoryItems).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(inventoryItems.id, id)).returning();
      return updatedItem || void 0;
    } catch (error) {
      console.error(`Error updating inventory item ${id}:`, error);
      return void 0;
    }
  }
  async deleteInventoryItem(id) {
    try {
      const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting inventory item ${id}:`, error);
      return false;
    }
  }
  async getAllInventoryItems() {
    try {
      return await db.select().from(inventoryItems);
    } catch (error) {
      console.error("Error retrieving all inventory items:", error);
      return [];
    }
  }
  async getInventoryItemsByCategory(category) {
    try {
      return await db.select().from(inventoryItems).where(eq(inventoryItems.category, category));
    } catch (error) {
      console.error(`Error retrieving inventory items with category ${category}:`, error);
      return [];
    }
  }
  async getLowStockItems() {
    try {
      const result = await db.execute(sql`
        SELECT i.*
        FROM inventory_items i
        WHERE i.current_stock < i.min_stock_level AND i.is_active = true
      `);
      if (!result.rows) {
        return [];
      }
      return result.rows;
    } catch (error) {
      console.error("Error retrieving low stock items:", error);
      return [];
    }
  }
  // Warehouse operations
  async getWarehouse(id) {
    try {
      const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
      return warehouse || void 0;
    } catch (error) {
      console.error(`Error retrieving warehouse ${id}:`, error);
      return void 0;
    }
  }
  async createWarehouse(insertWarehouse) {
    try {
      const [warehouse] = await db.insert(warehouses).values(insertWarehouse).returning();
      return warehouse;
    } catch (error) {
      console.error("Error creating warehouse:", error);
      throw error;
    }
  }
  async updateWarehouse(id, data) {
    try {
      const [updatedWarehouse] = await db.update(warehouses).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(warehouses.id, id)).returning();
      return updatedWarehouse || void 0;
    } catch (error) {
      console.error(`Error updating warehouse ${id}:`, error);
      return void 0;
    }
  }
  async deleteWarehouse(id) {
    try {
      const warehouseItems = await db.select().from(warehouseInventory).where(eq(warehouseInventory.warehouseId, id));
      if (warehouseItems.length > 0) {
        console.error(`Cannot delete warehouse ${id} because it contains inventory items`);
        return false;
      }
      const result = await db.delete(warehouses).where(eq(warehouses.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting warehouse ${id}:`, error);
      return false;
    }
  }
  async getAllWarehouses() {
    try {
      return await db.select().from(warehouses);
    } catch (error) {
      console.error("Error retrieving all warehouses:", error);
      return [];
    }
  }
  async getActiveWarehouses() {
    try {
      return await db.select().from(warehouses).where(eq(warehouses.isActive, true));
    } catch (error) {
      console.error("Error retrieving active warehouses:", error);
      return [];
    }
  }
  // Technician Vehicle operations
  async getTechnicianVehicle(id) {
    try {
      const [vehicle] = await db.select().from(technicianVehicles).where(eq(technicianVehicles.id, id));
      return vehicle || void 0;
    } catch (error) {
      console.error(`Error retrieving technician vehicle ${id}:`, error);
      return void 0;
    }
  }
  async createTechnicianVehicle(insertVehicle) {
    try {
      const [vehicle] = await db.insert(technicianVehicles).values(insertVehicle).returning();
      return vehicle;
    } catch (error) {
      console.error("Error creating technician vehicle:", error);
      throw error;
    }
  }
  async updateTechnicianVehicle(id, data) {
    try {
      const [updatedVehicle] = await db.update(technicianVehicles).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(technicianVehicles.id, id)).returning();
      return updatedVehicle || void 0;
    } catch (error) {
      console.error(`Error updating technician vehicle ${id}:`, error);
      return void 0;
    }
  }
  async deleteTechnicianVehicle(id) {
    try {
      const vehicleItems = await db.select().from(vehicleInventory).where(eq(vehicleInventory.vehicleId, id));
      if (vehicleItems.length > 0) {
        console.error(`Cannot delete vehicle ${id} because it contains inventory items`);
        return false;
      }
      const result = await db.delete(technicianVehicles).where(eq(technicianVehicles.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting technician vehicle ${id}:`, error);
      return false;
    }
  }
  /* Database implementation of getAllTechnicianVehicles is commented out to avoid duplication
  async getAllTechnicianVehicles(): Promise<TechnicianVehicle[]> {
    try {
      return await db.select().from(technicianVehicles);
    } catch (error) {
      console.error("Error retrieving all technician vehicles:", error);
      return [];
    }
  }
  */
  async getActiveTechnicianVehicles() {
    try {
      return await db.select().from(technicianVehicles).where(eq(technicianVehicles.status, "active"));
    } catch (error) {
      console.error("Error retrieving active technician vehicles:", error);
      return [];
    }
  }
  async getTechnicianVehiclesWithFleetmaticsId() {
    try {
      return await db.select().from(technicianVehicles).where(
        and(
          isNotNull(technicianVehicles.fleetmaticsVehicleId),
          ne(technicianVehicles.fleetmaticsVehicleId, "")
        )
      );
    } catch (error) {
      console.error("Error retrieving technician vehicles with Fleetmatics ID:", error);
      return [];
    }
  }
  async getTechnicianVehiclesByTechnicianId(technicianId) {
    try {
      return await db.select().from(technicianVehicles).where(eq(technicianVehicles.technicianId, technicianId));
    } catch (error) {
      console.error(`Error retrieving vehicles for technician ${technicianId}:`, error);
      return [];
    }
  }
  // Warehouse Inventory operations
  async getWarehouseInventory(id) {
    try {
      const [inventory] = await db.select().from(warehouseInventory).where(eq(warehouseInventory.id, id));
      return inventory || void 0;
    } catch (error) {
      console.error(`Error retrieving warehouse inventory ${id}:`, error);
      return void 0;
    }
  }
  async createWarehouseInventory(insertInventory) {
    try {
      const [inventory] = await db.insert(warehouseInventory).values({
        ...insertInventory,
        lastUpdated: /* @__PURE__ */ new Date()
      }).returning();
      return inventory;
    } catch (error) {
      console.error("Error creating warehouse inventory:", error);
      throw error;
    }
  }
  async updateWarehouseInventory(id, data) {
    try {
      const [updatedInventory] = await db.update(warehouseInventory).set({
        ...data,
        lastUpdated: /* @__PURE__ */ new Date()
      }).where(eq(warehouseInventory.id, id)).returning();
      return updatedInventory || void 0;
    } catch (error) {
      console.error(`Error updating warehouse inventory ${id}:`, error);
      return void 0;
    }
  }
  async getWarehouseInventoryByWarehouseId(warehouseId) {
    try {
      return await db.select().from(warehouseInventory).where(eq(warehouseInventory.warehouseId, warehouseId));
    } catch (error) {
      console.error(`Error retrieving inventory for warehouse ${warehouseId}:`, error);
      return [];
    }
  }
  async getWarehouseInventoryByItemId(itemId) {
    try {
      return await db.select().from(warehouseInventory).where(eq(warehouseInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error(`Error retrieving warehouse inventory for item ${itemId}:`, error);
      return [];
    }
  }
  async getLowStockWarehouseInventory() {
    try {
      const result = await db.execute(sql`
        SELECT wi.*
        FROM warehouse_inventory wi
        WHERE wi.quantity < wi.minimum_stock_level
      `);
      if (!result.rows) {
        return [];
      }
      return result.rows;
    } catch (error) {
      console.error("Error retrieving low stock warehouse inventory:", error);
      return [];
    }
  }
  // Vehicle Inventory operations
  async getVehicleInventory(id) {
    try {
      const [inventory] = await db.select().from(vehicleInventory).where(eq(vehicleInventory.id, id));
      return inventory || void 0;
    } catch (error) {
      console.error(`Error retrieving vehicle inventory ${id}:`, error);
      return void 0;
    }
  }
  async createVehicleInventory(insertInventory) {
    try {
      const [inventory] = await db.insert(vehicleInventory).values({
        ...insertInventory,
        lastUpdated: /* @__PURE__ */ new Date()
      }).returning();
      return inventory;
    } catch (error) {
      console.error("Error creating vehicle inventory:", error);
      throw error;
    }
  }
  async updateVehicleInventory(id, data) {
    try {
      const [updatedInventory] = await db.update(vehicleInventory).set({
        ...data,
        lastUpdated: /* @__PURE__ */ new Date()
      }).where(eq(vehicleInventory.id, id)).returning();
      return updatedInventory || void 0;
    } catch (error) {
      console.error(`Error updating vehicle inventory ${id}:`, error);
      return void 0;
    }
  }
  async getVehicleInventoryByVehicleId(vehicleId) {
    try {
      return await db.select().from(vehicleInventory).where(eq(vehicleInventory.vehicleId, vehicleId));
    } catch (error) {
      console.error(`Error retrieving inventory for vehicle ${vehicleId}:`, error);
      return [];
    }
  }
  async getVehicleInventoryByItemId(itemId) {
    try {
      return await db.select().from(vehicleInventory).where(eq(vehicleInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error(`Error retrieving vehicle inventory for item ${itemId}:`, error);
      return [];
    }
  }
  async getLowStockVehicleInventory() {
    try {
      const result = await db.execute(sql`
        SELECT vi.*
        FROM vehicle_inventory vi
        WHERE vi.quantity < vi.target_stock_level
      `);
      if (!result.rows) {
        return [];
      }
      return result.rows;
    } catch (error) {
      console.error("Error retrieving low stock vehicle inventory:", error);
      return [];
    }
  }
  // Inventory Transfer operations
  async getInventoryTransfer(id) {
    try {
      const [transfer] = await db.select().from(inventoryTransfers).where(eq(inventoryTransfers.id, id));
      return transfer || void 0;
    } catch (error) {
      console.error(`Error retrieving inventory transfer ${id}:`, error);
      return void 0;
    }
  }
  async createInventoryTransfer(insertTransfer) {
    try {
      const transferData = {
        ...insertTransfer,
        requestedByUserId: insertTransfer.requestedByUserId ?? insertTransfer.initiatedByUserId ?? 1
      };
      delete transferData.initiatedByUserId;
      const [transfer] = await db.insert(inventoryTransfers).values(transferData).returning();
      return transfer;
    } catch (error) {
      console.error("Error creating inventory transfer:", error);
      throw error;
    }
  }
  async updateInventoryTransfer(id, data) {
    try {
      if (data.status === "completed" && !data.completedDate) {
        data.completedDate = /* @__PURE__ */ new Date();
      }
      const [updatedTransfer] = await db.update(inventoryTransfers).set(data).where(eq(inventoryTransfers.id, id)).returning();
      if (updatedTransfer && updatedTransfer.status === "completed") {
        const transferItems = await this.getInventoryTransferItemsByTransferId(id);
        await this.processCompletedTransfer(updatedTransfer, transferItems);
      }
      return updatedTransfer || void 0;
    } catch (error) {
      console.error(`Error updating inventory transfer ${id}:`, error);
      return void 0;
    }
  }
  async processCompletedTransfer(transfer, transferItems) {
    for (const item of transferItems) {
      if (!item.actualQuantity) continue;
      const quantity = item.actualQuantity;
      const itemId = item.inventoryItemId;
      if (transfer.sourceLocationType === "warehouse") {
        const warehouseInventories = await this.getWarehouseInventoryByWarehouseIdAndItemId(
          transfer.sourceLocationId,
          itemId
        );
        if (warehouseInventories.length > 0) {
          const sourceInventory = warehouseInventories[0];
          const newQuantity = Math.max(0, sourceInventory.quantity - quantity);
          await this.updateWarehouseInventory(sourceInventory.id, { quantity: newQuantity });
        }
      } else if (transfer.sourceLocationType === "vehicle") {
        const vehicleInventories = await this.getVehicleInventoryByVehicleIdAndItemId(
          transfer.sourceLocationId,
          itemId
        );
        if (vehicleInventories.length > 0) {
          const sourceInventory = vehicleInventories[0];
          const newQuantity = Math.max(0, sourceInventory.quantity - quantity);
          await this.updateVehicleInventory(sourceInventory.id, { quantity: newQuantity });
        }
      }
      if (transfer.destinationLocationType === "warehouse") {
        let warehouseInventories = await this.getWarehouseInventoryByWarehouseIdAndItemId(
          transfer.destinationLocationId,
          itemId
        );
        if (warehouseInventories.length > 0) {
          const destInventory = warehouseInventories[0];
          const newQuantity = destInventory.quantity + quantity;
          await this.updateWarehouseInventory(destInventory.id, { quantity: newQuantity });
        } else {
          await this.createWarehouseInventory({
            warehouseId: transfer.destinationLocationId,
            inventoryItemId: itemId,
            quantity,
            location: "Transfer receiving area"
          });
        }
      } else if (transfer.destinationLocationType === "vehicle") {
        let vehicleInventories = await this.getVehicleInventoryByVehicleIdAndItemId(
          transfer.destinationLocationId,
          itemId
        );
        if (vehicleInventories.length > 0) {
          const destInventory = vehicleInventories[0];
          const newQuantity = destInventory.quantity + quantity;
          await this.updateVehicleInventory(destInventory.id, { quantity: newQuantity });
        } else {
          await this.createVehicleInventory({
            vehicleId: transfer.destinationLocationId,
            inventoryItemId: itemId,
            quantity,
            location: "Transfer receiving"
          });
        }
      }
    }
  }
  async getAllInventoryTransfers() {
    try {
      const transfers = await db.select().from(inventoryTransfers);
      return transfers;
    } catch (error) {
      console.error("Error retrieving all inventory transfers:", error);
      return [];
    }
  }
  async getInventoryTransfersByStatus(status) {
    try {
      const transfers = await db.select().from(inventoryTransfers).where(eq(inventoryTransfers.status, status));
      return transfers;
    } catch (error) {
      console.error(`Error retrieving inventory transfers with status ${status}:`, error);
      return [];
    }
  }
  async getInventoryTransfersByType(type) {
    try {
      const transfers = await db.select().from(inventoryTransfers).where(eq(inventoryTransfers.transferType, type));
      return transfers;
    } catch (error) {
      console.error(`Error retrieving inventory transfers with type ${type}:`, error);
      return [];
    }
  }
  async getInventoryTransfersByDate(startDate, endDate) {
    try {
      const transfers = await db.select().from(inventoryTransfers).where(
        and(
          gte(inventoryTransfers.requestDate, startDate),
          lte(inventoryTransfers.requestDate, endDate)
        )
      );
      return transfers;
    } catch (error) {
      console.error(`Error retrieving inventory transfers by date range:`, error);
      return [];
    }
  }
  // Inventory Transfer Item operations
  async getInventoryTransferItem(id) {
    try {
      const [item] = await db.select().from(inventoryTransferItems).where(eq(inventoryTransferItems.id, id));
      return item || void 0;
    } catch (error) {
      console.error(`Error retrieving inventory transfer item ${id}:`, error);
      return void 0;
    }
  }
  async createInventoryTransferItem(insertItem) {
    try {
      const [item] = await db.insert(inventoryTransferItems).values(insertItem).returning();
      return item;
    } catch (error) {
      console.error("Error creating inventory transfer item:", error);
      throw error;
    }
  }
  async updateInventoryTransferItem(id, data) {
    try {
      const [updatedItem] = await db.update(inventoryTransferItems).set(data).where(eq(inventoryTransferItems.id, id)).returning();
      return updatedItem || void 0;
    } catch (error) {
      console.error(`Error updating inventory transfer item ${id}:`, error);
      return void 0;
    }
  }
  async getInventoryTransferItemsByTransferId(transferId) {
    try {
      const items = await db.select().from(inventoryTransferItems).where(eq(inventoryTransferItems.transferId, transferId));
      return items;
    } catch (error) {
      console.error(`Error retrieving items for transfer ${transferId}:`, error);
      return [];
    }
  }
  // Helper methods for inventory operations
  async getWarehouseInventoryByWarehouseIdAndItemId(warehouseId, itemId) {
    try {
      const inventory = await db.select().from(warehouseInventory).where(
        and(
          eq(warehouseInventory.warehouseId, warehouseId),
          eq(warehouseInventory.inventoryItemId, itemId)
        )
      );
      return inventory;
    } catch (error) {
      console.error(`Error retrieving warehouse inventory for warehouse ${warehouseId} and item ${itemId}:`, error);
      return [];
    }
  }
  async getVehicleInventoryByVehicleIdAndItemId(vehicleId, itemId) {
    try {
      const inventory = await db.select().from(vehicleInventory).where(
        and(
          eq(vehicleInventory.vehicleId, vehicleId),
          eq(vehicleInventory.inventoryItemId, itemId)
        )
      );
      return inventory;
    } catch (error) {
      console.error(`Error retrieving vehicle inventory for vehicle ${vehicleId} and item ${itemId}:`, error);
      return [];
    }
  }
  // Barcode operations
  async getBarcode(id) {
    try {
      const [barcode] = await db.select().from(barcodes).where(eq(barcodes.id, id));
      return barcode || void 0;
    } catch (error) {
      console.error(`Error retrieving barcode ${id}:`, error);
      return void 0;
    }
  }
  async getBarcodeByValue(value) {
    try {
      const [barcode] = await db.select().from(barcodes).where(eq(barcodes.barcodeValue, value));
      return barcode || void 0;
    } catch (error) {
      console.error(`Error retrieving barcode with value ${value}:`, error);
      return void 0;
    }
  }
  async createBarcode(insertBarcode) {
    try {
      const [barcode] = await db.insert(barcodes).values(insertBarcode).returning();
      return barcode;
    } catch (error) {
      console.error("Error creating barcode:", error);
      throw error;
    }
  }
  async updateBarcode(id, data) {
    try {
      const [updatedBarcode] = await db.update(barcodes).set(data).where(eq(barcodes.id, id)).returning();
      return updatedBarcode || void 0;
    } catch (error) {
      console.error(`Error updating barcode ${id}:`, error);
      return void 0;
    }
  }
  async getAllBarcodes() {
    try {
      const allBarcodes = await db.select().from(barcodes);
      return allBarcodes;
    } catch (error) {
      console.error("Error retrieving all barcodes:", error);
      return [];
    }
  }
  async getBarcodesByType(type) {
    try {
      const typedBarcodes = await db.select().from(barcodes).where(eq(barcodes.barcodeType, type));
      return typedBarcodes;
    } catch (error) {
      console.error(`Error retrieving barcodes with type ${type}:`, error);
      return [];
    }
  }
  async getBarcodesByItemType(itemType) {
    try {
      const itemTypeBarcodes = await db.select().from(barcodes).where(eq(barcodes.itemType, itemType));
      return itemTypeBarcodes;
    } catch (error) {
      console.error(`Error retrieving barcodes with item type ${itemType}:`, error);
      return [];
    }
  }
  // Barcode Scan History operations
  async getBarcodeScan(id) {
    try {
      const [scan] = await db.select().from(barcodeScanHistory).where(eq(barcodeScanHistory.id, id));
      return scan || void 0;
    } catch (error) {
      console.error(`Error retrieving barcode scan ${id}:`, error);
      return void 0;
    }
  }
  async createBarcodeScan(insertScan) {
    try {
      const [scan] = await db.insert(barcodeScanHistory).values({
        ...insertScan,
        scanTime: /* @__PURE__ */ new Date()
      }).returning();
      return scan;
    } catch (error) {
      console.error("Error creating barcode scan:", error);
      throw error;
    }
  }
  async getBarcodeScansByBarcodeId(barcodeId) {
    try {
      const barcodeScans = await db.select().from(barcodeScanHistory).where(eq(barcodeScanHistory.barcodeId, barcodeId)).orderBy(desc(barcodeScanHistory.scanTime));
      return barcodeScans;
    } catch (error) {
      console.error(`Error retrieving scans for barcode ${barcodeId}:`, error);
      return [];
    }
  }
  async getBarcodeScansByUserId(userId) {
    try {
      const userScans = await db.select().from(barcodeScanHistory).where(eq(barcodeScanHistory.scannedByUserId, userId)).orderBy(desc(barcodeScanHistory.scanTime));
      return userScans;
    } catch (error) {
      console.error(`Error retrieving scans by user ${userId}:`, error);
      return [];
    }
  }
  async getBarcodeScansByDate(startDate, endDate) {
    try {
      const dateRangeScans = await db.select().from(barcodeScanHistory).where(
        and(
          gte(barcodeScanHistory.scanTime, startDate),
          lte(barcodeScanHistory.scanTime, endDate)
        )
      ).orderBy(desc(barcodeScanHistory.scanTime));
      return dateRangeScans;
    } catch (error) {
      console.error(`Error retrieving barcode scans by date range:`, error);
      return [];
    }
  }
  // Inventory Adjustment operations
  async getInventoryAdjustment(id) {
    try {
      const [adjustment] = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.id, id));
      return adjustment || void 0;
    } catch (error) {
      console.error(`Error retrieving inventory adjustment ${id}:`, error);
      return void 0;
    }
  }
  async createInventoryAdjustment(insertAdjustment) {
    try {
      await this.updateInventoryForAdjustment(
        insertAdjustment.inventoryItemId,
        insertAdjustment.locationType,
        insertAdjustment.locationId,
        insertAdjustment.quantityChange
      );
      const [adjustment] = await db.insert(inventoryAdjustments).values({
        ...insertAdjustment,
        adjustmentDate: /* @__PURE__ */ new Date()
      }).returning();
      return adjustment;
    } catch (error) {
      console.error("Error creating inventory adjustment:", error);
      throw error;
    }
  }
  async updateInventoryForAdjustment(itemId, locationType, locationId, quantityChange) {
    try {
      if (locationType === "warehouse") {
        const warehouseInventories = await this.getWarehouseInventoryByWarehouseIdAndItemId(locationId, itemId);
        if (warehouseInventories.length > 0) {
          const inventory = warehouseInventories[0];
          const newQuantity = Math.max(0, inventory.quantity + quantityChange);
          await this.updateWarehouseInventory(inventory.id, { quantity: newQuantity });
          return true;
        } else if (quantityChange > 0) {
          await this.createWarehouseInventory({
            warehouseId: locationId,
            inventoryItemId: itemId,
            quantity: quantityChange,
            location: "Adjustment addition"
          });
          return true;
        }
      } else if (locationType === "vehicle") {
        const vehicleInventories = await this.getVehicleInventoryByVehicleIdAndItemId(locationId, itemId);
        if (vehicleInventories.length > 0) {
          const inventory = vehicleInventories[0];
          const newQuantity = Math.max(0, inventory.quantity + quantityChange);
          await this.updateVehicleInventory(inventory.id, { quantity: newQuantity });
          return true;
        } else if (quantityChange > 0) {
          await this.createVehicleInventory({
            vehicleId: locationId,
            inventoryItemId: itemId,
            quantity: quantityChange,
            location: "Adjustment addition"
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(`Error updating inventory for adjustment:`, error);
      return false;
    }
  }
  async getAllInventoryAdjustments() {
    try {
      const allAdjustments = await db.select().from(inventoryAdjustments).orderBy(desc(inventoryAdjustments.adjustmentDate));
      return allAdjustments;
    } catch (error) {
      console.error("Error retrieving all inventory adjustments:", error);
      return [];
    }
  }
  async getInventoryAdjustmentsByItemId(itemId) {
    try {
      const itemAdjustments = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.inventoryItemId, itemId)).orderBy(desc(inventoryAdjustments.adjustmentDate));
      return itemAdjustments;
    } catch (error) {
      console.error(`Error retrieving adjustments for item ${itemId}:`, error);
      return [];
    }
  }
  async getInventoryAdjustmentsByLocation(locationType, locationId) {
    try {
      const locationAdjustments = await db.select().from(inventoryAdjustments).where(
        and(
          eq(inventoryAdjustments.locationType, locationType),
          eq(inventoryAdjustments.locationId, locationId)
        )
      ).orderBy(desc(inventoryAdjustments.adjustmentDate));
      return locationAdjustments;
    } catch (error) {
      console.error(`Error retrieving adjustments for location type ${locationType} id ${locationId}:`, error);
      return [];
    }
  }
  async getInventoryAdjustmentsByDate(startDate, endDate) {
    try {
      const dateRangeAdjustments = await db.select().from(inventoryAdjustments).where(
        and(
          gte(inventoryAdjustments.adjustmentDate, startDate),
          lte(inventoryAdjustments.adjustmentDate, endDate)
        )
      ).orderBy(desc(inventoryAdjustments.adjustmentDate));
      return dateRangeAdjustments;
    } catch (error) {
      console.error(`Error retrieving inventory adjustments by date range:`, error);
      return [];
    }
  }
  // Sample inventory data initialization
  async initSampleInventoryData() {
    await this.createWarehouse({
      name: "Main Warehouse",
      address: "123 Storage Blvd",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      latitude: 33.4484,
      longitude: -112.074,
      description: "Primary storage facility",
      phoneNumber: "602-555-7890"
    });
    await this.createWarehouse({
      name: "East Valley Warehouse",
      address: "456 Inventory Lane",
      city: "Scottsdale",
      state: "AZ",
      zipCode: "85251",
      latitude: 33.4942,
      longitude: -111.9261,
      description: "Secondary storage facility",
      phoneNumber: "480-555-1234"
    });
    await this.createTechnicianVehicle({
      name: "Service Truck #1",
      type: "truck",
      technicianId: 1,
      status: "active",
      make: "Ford",
      model: "F-150",
      year: 2021,
      licensePlate: "ABC123",
      vin: "1FTFW1ET2DFA52087"
    });
    await this.createTechnicianVehicle({
      name: "Service Truck #2",
      type: "truck",
      technicianId: 2,
      status: "active",
      make: "Chevrolet",
      model: "Silverado",
      year: 2022,
      licensePlate: "XYZ789",
      vin: "3GCUKREC8JG176439"
    });
    await this.createInventoryItem({
      name: "Liquid Chlorine",
      category: "chemicals",
      unit: "gallon",
      costPerUnit: 4.99,
      description: "Sodium hypochlorite solution for pool sanitation",
      minStockLevel: 20,
      maxStockLevel: 100,
      reorderPoint: 30,
      reorderQuantity: 50
    });
    await this.createInventoryItem({
      name: "Muriatic Acid",
      category: "chemicals",
      unit: "gallon",
      costPerUnit: 6.99,
      description: "pH decreaser for pool water",
      minStockLevel: 15,
      maxStockLevel: 60,
      reorderPoint: 20,
      reorderQuantity: 30
    });
    await this.createInventoryItem({
      name: "Cartridge Filter",
      category: "equipment",
      unit: "piece",
      costPerUnit: 69.99,
      description: "Standard size pool filter cartridge",
      minStockLevel: 5,
      maxStockLevel: 20,
      reorderPoint: 8,
      reorderQuantity: 12
    });
    await this.createInventoryItem({
      name: "Variable Speed Pump",
      category: "equipment",
      unit: "piece",
      costPerUnit: 799.99,
      description: "Energy efficient variable speed pool pump",
      minStockLevel: 2,
      maxStockLevel: 8,
      reorderPoint: 3,
      reorderQuantity: 5
    });
    await this.createInventoryItem({
      name: "Leaf Skimmer Net",
      category: "tools",
      unit: "piece",
      costPerUnit: 24.99,
      description: "Heavy duty leaf skimmer with telescoping pole",
      minStockLevel: 10,
      maxStockLevel: 30,
      reorderPoint: 12,
      reorderQuantity: 20
    });
    await this.createWarehouseInventory({
      warehouseId: 1,
      inventoryItemId: 1,
      // Chlorine
      quantity: 45,
      location: "Chemical storage area A1",
      minimumStockLevel: 20,
      maximumStockLevel: 100
    });
    await this.createWarehouseInventory({
      warehouseId: 1,
      inventoryItemId: 2,
      // Muriatic acid
      quantity: 30,
      location: "Chemical storage area A2",
      minimumStockLevel: 15,
      maximumStockLevel: 60
    });
    await this.createWarehouseInventory({
      warehouseId: 1,
      inventoryItemId: 3,
      // Filter
      quantity: 12,
      location: "Equipment shelf B3",
      minimumStockLevel: 5,
      maximumStockLevel: 20
    });
    await this.createWarehouseInventory({
      warehouseId: 2,
      inventoryItemId: 1,
      // Chlorine
      quantity: 25,
      location: "Chemical storage area C1",
      minimumStockLevel: 15,
      maximumStockLevel: 60
    });
    await this.createWarehouseInventory({
      warehouseId: 2,
      inventoryItemId: 4,
      // Pump
      quantity: 4,
      location: "Equipment area D2",
      minimumStockLevel: 2,
      maximumStockLevel: 8
    });
    await this.createVehicleInventory({
      vehicleId: 1,
      inventoryItemId: 1,
      // Chlorine
      quantity: 8,
      location: "Rear storage compartment",
      targetStockLevel: 10
    });
    await this.createVehicleInventory({
      vehicleId: 1,
      inventoryItemId: 2,
      // Muriatic acid
      quantity: 5,
      location: "Rear storage compartment",
      targetStockLevel: 6
    });
    await this.createVehicleInventory({
      vehicleId: 1,
      inventoryItemId: 5,
      // Leaf net
      quantity: 3,
      location: "Side compartment",
      targetStockLevel: 4
    });
    await this.createVehicleInventory({
      vehicleId: 2,
      inventoryItemId: 1,
      // Chlorine
      quantity: 10,
      location: "Rear storage compartment",
      targetStockLevel: 10
    });
    await this.createVehicleInventory({
      vehicleId: 2,
      inventoryItemId: 3,
      // Filter
      quantity: 2,
      location: "Side compartment",
      targetStockLevel: 3
    });
    await this.createBarcode({
      barcodeValue: "CHL-12345",
      barcodeType: "qr",
      itemType: "inventory",
      itemId: 1
      // Chlorine
    });
    await this.createBarcode({
      barcodeValue: "MUR-54321",
      barcodeType: "qr",
      itemType: "inventory",
      itemId: 2
      // Muriatic acid
    });
    await this.createBarcode({
      barcodeValue: "FLT-98765",
      barcodeType: "qr",
      itemType: "inventory",
      itemId: 3
      // Filter
    });
    const transfer = await this.createInventoryTransfer({
      transferType: "warehouse_to_vehicle",
      sourceLocationType: "warehouse",
      sourceLocationId: 1,
      destinationLocationType: "vehicle",
      destinationLocationId: 1,
      initiatedByUserId: 1,
      scheduledDate: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending"
    });
    await this.createInventoryTransferItem({
      transferId: 1,
      inventoryItemId: 1,
      // Chlorine
      requestedQuantity: 5,
      notes: "Weekly restock"
    });
    await this.createInventoryTransferItem({
      transferId: 1,
      inventoryItemId: 2,
      // Muriatic acid
      requestedQuantity: 3,
      notes: "Weekly restock"
    });
    const completedTransfer = await this.createInventoryTransfer({
      transferType: "warehouse_to_warehouse",
      sourceLocationType: "warehouse",
      sourceLocationId: 1,
      destinationLocationType: "warehouse",
      destinationLocationId: 2,
      initiatedByUserId: 1,
      status: "completed",
      scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString(),
      // 7 days ago
      completionDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3).toISOString(),
      // 6 days ago
      completedByUserId: 1
    });
    await this.createInventoryTransferItem({
      transferId: 2,
      inventoryItemId: 3,
      // Filter
      requestedQuantity: 5,
      approvedQuantity: 5,
      actualQuantity: 5
    });
    await this.createInventoryAdjustment({
      reason: "damaged",
      inventoryItemId: 1,
      // Chlorine
      locationType: "warehouse",
      locationId: 1,
      quantityChange: -2,
      performedByUserId: 1,
      notes: "Container damaged during handling"
    });
    await this.createInventoryAdjustment({
      reason: "count_correction",
      inventoryItemId: 3,
      // Filter
      locationType: "warehouse",
      locationId: 1,
      quantityChange: 1,
      performedByUserId: 1,
      notes: "Inventory count correction after audit"
    });
    await this.createBarcodeScan({
      barcodeId: 1,
      scannedByUserId: 1,
      actionType: "inventory_check",
      location: "Warehouse 1, Bay A"
    });
    await this.createBarcodeScan({
      barcodeId: 2,
      scannedByUserId: 2,
      actionType: "check_out",
      location: "Warehouse 1"
    });
  }
  // Inventory Item operations
  async getInventoryItem(id) {
    return this.inventoryItems.get(id);
  }
  async createInventoryItem(insertItem) {
    const id = this.inventoryItemId++;
    const item = {
      ...insertItem,
      id,
      description: insertItem.description ?? null,
      notes: insertItem.notes ?? null,
      imageUrl: insertItem.imageUrl ?? null,
      isActive: insertItem.isActive !== void 0 ? insertItem.isActive : true,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      minStockLevel: insertItem.minStockLevel ?? null,
      maxStockLevel: insertItem.maxStockLevel ?? null,
      reorderPoint: insertItem.reorderPoint ?? null,
      reorderQuantity: insertItem.reorderQuantity ?? null,
      lastOrderDate: insertItem.lastOrderDate ?? null
    };
    this.inventoryItems.set(id, item);
    return item;
  }
  async updateInventoryItem(id, data) {
    const item = await this.getInventoryItem(id);
    if (!item) return void 0;
    const updatedItem = { ...item, ...data, updatedAt: /* @__PURE__ */ new Date() };
    this.inventoryItems.set(id, updatedItem);
    return updatedItem;
  }
  async deleteInventoryItem(id) {
    const item = await this.getInventoryItem(id);
    if (!item) return false;
    return this.inventoryItems.delete(id);
  }
  async getAllInventoryItems() {
    try {
      return await db.select().from(inventoryItems);
    } catch (error) {
      console.error("Error retrieving all inventory items:", error);
      return [];
    }
  }
  async getInventoryItemsByCategory(category) {
    try {
      return await db.select().from(inventoryItems).where(eq(inventoryItems.category, category));
    } catch (error) {
      console.error(`Error retrieving inventory items for category ${category}:`, error);
      return [];
    }
  }
  async getLowStockItems() {
    const allItems = await this.getAllInventoryItems();
    const results = [];
    for (const item of allItems) {
      const warehouseInventories = await this.getWarehouseInventoryByItemId(item.id);
      const vehicleInventories = await this.getVehicleInventoryByItemId(item.id);
      const totalWarehouseQuantity = warehouseInventories.reduce((sum, inv) => sum + inv.quantity, 0);
      const totalVehicleQuantity = vehicleInventories.reduce((sum, inv) => sum + inv.quantity, 0);
      const totalQuantity = totalWarehouseQuantity + totalVehicleQuantity;
      if (item.reorderPoint !== null && totalQuantity <= item.reorderPoint) {
        results.push(item);
      }
    }
    return results;
  }
  // Warehouse operations
  async getWarehouse(id) {
    return this.warehouses.get(id);
  }
  async createWarehouse(insertWarehouse) {
    const id = this.warehouseId++;
    const warehouse = {
      ...insertWarehouse,
      id,
      latitude: insertWarehouse.latitude ?? null,
      longitude: insertWarehouse.longitude ?? null,
      description: insertWarehouse.description ?? null,
      isActive: insertWarehouse.isActive !== void 0 ? insertWarehouse.isActive : true,
      phoneNumber: insertWarehouse.phoneNumber ?? null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.warehouses.set(id, warehouse);
    return warehouse;
  }
  async updateWarehouse(id, data) {
    const warehouse = await this.getWarehouse(id);
    if (!warehouse) return void 0;
    const updatedWarehouse = { ...warehouse, ...data, updatedAt: /* @__PURE__ */ new Date() };
    this.warehouses.set(id, updatedWarehouse);
    return updatedWarehouse;
  }
  async deleteWarehouse(id) {
    const warehouse = await this.getWarehouse(id);
    if (!warehouse) return false;
    const inventories = await this.getWarehouseInventoryByWarehouseId(id);
    for (const inventory of inventories) {
      await this.deleteWarehouseInventory(inventory.id);
    }
    return this.warehouses.delete(id);
  }
  async getAllWarehouses() {
    try {
      return await db.select().from(warehouses);
    } catch (error) {
      console.error("Error retrieving all warehouses:", error);
      return [];
    }
  }
  async getActiveWarehouses() {
    try {
      return await db.select().from(warehouses).where(eq(warehouses.isActive, true));
    } catch (error) {
      console.error("Error retrieving active warehouses:", error);
      return [];
    }
  }
  // Technician Vehicle operations
  async getTechnicianVehicle(id) {
    return this.technicianVehicles.get(id);
  }
  async getTechnicianVehiclesByTechnicianId(technicianId) {
    return Array.from(this.technicianVehicles.values()).filter(
      (vehicle) => vehicle.technicianId === technicianId
    );
  }
  async createTechnicianVehicle(insertVehicle) {
    const id = this.technicianVehicleId++;
    const vehicle = {
      ...insertVehicle,
      id,
      status: insertVehicle.status ?? "active",
      notes: insertVehicle.notes ?? null,
      model: insertVehicle.model ?? null,
      make: insertVehicle.make ?? null,
      year: insertVehicle.year ?? null,
      licensePlate: insertVehicle.licensePlate ?? null,
      vin: insertVehicle.vin ?? null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.technicianVehicles.set(id, vehicle);
    return vehicle;
  }
  async updateTechnicianVehicle(id, data) {
    const vehicle = await this.getTechnicianVehicle(id);
    if (!vehicle) return void 0;
    const updatedVehicle = { ...vehicle, ...data, updatedAt: /* @__PURE__ */ new Date() };
    this.technicianVehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }
  async deleteTechnicianVehicle(id) {
    const vehicle = await this.getTechnicianVehicle(id);
    if (!vehicle) return false;
    const inventories = await this.getVehicleInventoryByVehicleId(id);
    for (const inventory of inventories) {
      await this.deleteVehicleInventory(inventory.id);
    }
    return this.technicianVehicles.delete(id);
  }
  async getAllTechnicianVehicles() {
    try {
      return await db.select().from(technicianVehicles);
    } catch (error) {
      console.error("Error retrieving all technician vehicles:", error);
      return [];
    }
  }
  async getActiveTechnicianVehicles() {
    try {
      return await db.select().from(technicianVehicles).where(eq(technicianVehicles.status, "active"));
    } catch (error) {
      console.error("Error retrieving active technician vehicles:", error);
      return [];
    }
  }
  // Warehouse Inventory operations
  async getWarehouseInventory(id) {
    return this.warehouseInventory.get(id);
  }
  async createWarehouseInventory(insertInventory) {
    const id = this.warehouseInventoryId++;
    const inventory = {
      ...insertInventory,
      id,
      notes: insertInventory.notes ?? null,
      location: insertInventory.location ?? null,
      quantity: insertInventory.quantity ?? 0,
      minimumStockLevel: insertInventory.minimumStockLevel ?? null,
      maximumStockLevel: insertInventory.maximumStockLevel ?? null,
      lastUpdated: /* @__PURE__ */ new Date()
    };
    this.warehouseInventory.set(id, inventory);
    const item = await this.getInventoryItem(insertInventory.inventoryItemId);
    if (item) {
      await this.updateInventoryItem(item.id, { updatedAt: /* @__PURE__ */ new Date() });
    }
    return inventory;
  }
  async updateWarehouseInventory(id, data) {
    const inventory = await this.getWarehouseInventory(id);
    if (!inventory) return void 0;
    const updatedInventory = { ...inventory, ...data, lastUpdated: /* @__PURE__ */ new Date() };
    this.warehouseInventory.set(id, updatedInventory);
    const item = await this.getInventoryItem(inventory.inventoryItemId);
    if (item) {
      await this.updateInventoryItem(item.id, { updatedAt: /* @__PURE__ */ new Date() });
    }
    return updatedInventory;
  }
  async deleteWarehouseInventory(id) {
    const inventory = await this.getWarehouseInventory(id);
    if (!inventory) return false;
    return this.warehouseInventory.delete(id);
  }
  async getWarehouseInventoryByWarehouseId(warehouseId) {
    try {
      return await db.select().from(warehouseInventory).where(eq(warehouseInventory.warehouseId, warehouseId));
    } catch (error) {
      console.error("Error retrieving warehouse inventory by warehouse ID:", error);
      return [];
    }
  }
  async getWarehouseInventoryByItemId(itemId) {
    try {
      return await db.select().from(warehouseInventory).where(eq(warehouseInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error("Error retrieving warehouse inventory by item ID:", error);
      return [];
    }
  }
  async getLowWarehouseInventory() {
    try {
      return await db.select().from(warehouseInventory).where(
        sql`${warehouseInventory.minimumStockLevel} IS NOT NULL AND ${warehouseInventory.quantity} <= ${warehouseInventory.minimumStockLevel}`
      );
    } catch (error) {
      console.error("Error retrieving low warehouse inventory:", error);
      return [];
    }
  }
  // Vehicle Inventory operations
  async getVehicleInventory(id) {
    try {
      const results = await db.select().from(vehicleInventory).where(eq(vehicleInventory.id, id));
      return results[0];
    } catch (error) {
      console.error("Error retrieving vehicle inventory:", error);
      return void 0;
    }
  }
  async createVehicleInventory(insertInventory) {
    try {
      const preparedInventory = {
        ...insertInventory,
        notes: insertInventory.notes ?? null,
        location: insertInventory.location ?? null,
        quantity: insertInventory.quantity ?? 0,
        targetStockLevel: insertInventory.targetStockLevel ?? null,
        lastUpdated: /* @__PURE__ */ new Date()
      };
      const result = await db.insert(vehicleInventory).values(preparedInventory).returning();
      const createdInventory = result[0];
      await db.update(inventoryItems).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(inventoryItems.id, insertInventory.inventoryItemId));
      return createdInventory;
    } catch (error) {
      console.error("Error creating vehicle inventory:", error);
      throw error;
    }
  }
  async updateVehicleInventory(id, data) {
    try {
      const inventory = await this.getVehicleInventory(id);
      if (!inventory) return void 0;
      const updateData = { ...data, lastUpdated: /* @__PURE__ */ new Date() };
      const result = await db.update(vehicleInventory).set(updateData).where(eq(vehicleInventory.id, id)).returning();
      if (result.length === 0) return void 0;
      await db.update(inventoryItems).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(inventoryItems.id, inventory.inventoryItemId));
      return result[0];
    } catch (error) {
      console.error("Error updating vehicle inventory:", error);
      return void 0;
    }
  }
  async deleteVehicleInventory(id) {
    try {
      const inventory = await this.getVehicleInventory(id);
      if (!inventory) return false;
      const result = await db.delete(vehicleInventory).where(eq(vehicleInventory.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting vehicle inventory:", error);
      return false;
    }
  }
  async getVehicleInventoryByVehicleId(vehicleId) {
    try {
      return await db.select().from(vehicleInventory).where(eq(vehicleInventory.vehicleId, vehicleId));
    } catch (error) {
      console.error("Error retrieving vehicle inventory by vehicle ID:", error);
      return [];
    }
  }
  async getVehicleInventoryByItemId(itemId) {
    try {
      return await db.select().from(vehicleInventory).where(eq(vehicleInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error("Error retrieving vehicle inventory by item ID:", error);
      return [];
    }
  }
  async getLowVehicleInventory() {
    try {
      return await db.select().from(vehicleInventory).where(
        and(
          isNotNull(vehicleInventory.targetStockLevel),
          lt(vehicleInventory.quantity, vehicleInventory.targetStockLevel)
        )
      );
    } catch (error) {
      console.error("Error retrieving low vehicle inventory:", error);
      return [];
    }
  }
  // Inventory Transfer operations
  async getInventoryTransfer(id) {
    return this.inventoryTransfers.get(id);
  }
  async createInventoryTransfer(insertTransfer) {
    const id = this.inventoryTransferId++;
    const transfer = {
      ...insertTransfer,
      id,
      status: insertTransfer.status ?? "pending",
      notes: insertTransfer.notes ?? null,
      scheduledDate: insertTransfer.scheduledDate ?? null,
      completionDate: null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      completedByUserId: null
    };
    this.inventoryTransfers.set(id, transfer);
    return transfer;
  }
  async updateInventoryTransfer(id, data) {
    const transfer = await this.getInventoryTransfer(id);
    if (!transfer) return void 0;
    const updatedTransfer = { ...transfer, ...data, updatedAt: /* @__PURE__ */ new Date() };
    this.inventoryTransfers.set(id, updatedTransfer);
    return updatedTransfer;
  }
  async getAllInventoryTransfers() {
    return Array.from(this.inventoryTransfers.values());
  }
  async getInventoryTransfersByStatus(status) {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.status === status
    );
  }
  async getInventoryTransfersByType(type) {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.transferType === type
    );
  }
  async getInventoryTransfersByUserId(userId) {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.initiatedByUserId === userId || transfer.completedByUserId === userId
    );
  }
  async getInventoryTransfersByDate(startDate, endDate) {
    return Array.from(this.inventoryTransfers.values()).filter((transfer) => {
      const transferDate = transfer.completionDate ? new Date(transfer.completionDate) : transfer.scheduledDate ? new Date(transfer.scheduledDate) : new Date(transfer.createdAt);
      return transferDate >= startDate && transferDate <= endDate;
    });
  }
  async completeInventoryTransfer(id, userId) {
    const transfer = await this.getInventoryTransfer(id);
    if (!transfer || transfer.status !== "in_transit") return void 0;
    const transferItems = await this.getInventoryTransferItemsByTransferId(id);
    for (const item of transferItems) {
      if (!item.actualQuantity) continue;
      const transferType = transfer.transferType;
      if (transferType === "warehouse_to_warehouse") {
        const sourceInventories = await this.getWarehouseInventoryByWarehouseId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (sourceInventory) {
          await this.updateWarehouseInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        const destInventories = await this.getWarehouseInventoryByWarehouseId(transfer.destinationLocationId);
        const destInventory = destInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (destInventory) {
          await this.updateWarehouseInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          await this.createWarehouseInventory({
            warehouseId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      } else if (transferType === "warehouse_to_vehicle") {
        const sourceInventories = await this.getWarehouseInventoryByWarehouseId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (sourceInventory) {
          await this.updateWarehouseInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        const destInventories = await this.getVehicleInventoryByVehicleId(transfer.destinationLocationId);
        const destInventory = destInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (destInventory) {
          await this.updateVehicleInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          await this.createVehicleInventory({
            vehicleId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      } else if (transferType === "vehicle_to_warehouse") {
        const sourceInventories = await this.getVehicleInventoryByVehicleId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (sourceInventory) {
          await this.updateVehicleInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        const destInventories = await this.getWarehouseInventoryByWarehouseId(transfer.destinationLocationId);
        const destInventory = destInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (destInventory) {
          await this.updateWarehouseInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          await this.createWarehouseInventory({
            warehouseId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      } else if (transferType === "vehicle_to_vehicle") {
        const sourceInventories = await this.getVehicleInventoryByVehicleId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (sourceInventory) {
          await this.updateVehicleInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        const destInventories = await this.getVehicleInventoryByVehicleId(transfer.destinationLocationId);
        const destInventory = destInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (destInventory) {
          await this.updateVehicleInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          await this.createVehicleInventory({
            vehicleId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      } else if (transferType === "warehouse_to_client") {
        const sourceInventories = await this.getWarehouseInventoryByWarehouseId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (sourceInventory) {
          await this.updateWarehouseInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
      } else if (transferType === "vehicle_to_client") {
        const sourceInventories = await this.getVehicleInventoryByVehicleId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find((inv) => inv.inventoryItemId === item.inventoryItemId);
        if (sourceInventory) {
          await this.updateVehicleInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
      }
    }
    const updatedTransfer = await this.updateInventoryTransfer(id, {
      status: "completed",
      completionDate: (/* @__PURE__ */ new Date()).toISOString(),
      completedByUserId: userId
    });
    return updatedTransfer;
  }
  async cancelInventoryTransfer(id) {
    const transfer = await this.getInventoryTransfer(id);
    if (!transfer || transfer.status === "completed") return void 0;
    const updatedTransfer = await this.updateInventoryTransfer(id, {
      status: "cancelled"
    });
    return updatedTransfer;
  }
  // Inventory Transfer Item operations
  async getInventoryTransferItem(id) {
    return this.inventoryTransferItems.get(id);
  }
  async createInventoryTransferItem(insertItem) {
    const id = this.inventoryTransferItemId++;
    const item = {
      ...insertItem,
      id,
      notes: insertItem.notes ?? null,
      approvedQuantity: insertItem.approvedQuantity ?? null,
      actualQuantity: insertItem.actualQuantity ?? null
    };
    this.inventoryTransferItems.set(id, item);
    return item;
  }
  async updateInventoryTransferItem(id, data) {
    const item = await this.getInventoryTransferItem(id);
    if (!item) return void 0;
    const updatedItem = { ...item, ...data };
    this.inventoryTransferItems.set(id, updatedItem);
    return updatedItem;
  }
  async getInventoryTransferItemsByTransferId(transferId) {
    return Array.from(this.inventoryTransferItems.values()).filter(
      (item) => item.transferId === transferId
    );
  }
  async getInventoryTransferItemsByItemId(itemId) {
    return Array.from(this.inventoryTransferItems.values()).filter(
      (item) => item.inventoryItemId === itemId
    );
  }
  // Barcode operations
  async getBarcode(id) {
    return this.barcodes.get(id);
  }
  async getBarcodeByValue(barcodeValue) {
    return Array.from(this.barcodes.values()).find(
      (barcode) => barcode.barcodeValue === barcodeValue
    );
  }
  async createBarcode(insertBarcode) {
    const id = this.barcodeId++;
    const barcode = {
      ...insertBarcode,
      id,
      isActive: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.barcodes.set(id, barcode);
    return barcode;
  }
  async updateBarcode(id, data) {
    const barcode = await this.getBarcode(id);
    if (!barcode) return void 0;
    const updatedBarcode = { ...barcode, ...data };
    this.barcodes.set(id, updatedBarcode);
    return updatedBarcode;
  }
  async deleteBarcode(id) {
    const barcode = await this.getBarcode(id);
    if (!barcode) return false;
    return this.barcodes.delete(id);
  }
  async getActiveBarcodesForItem(itemType, itemId) {
    return Array.from(this.barcodes.values()).filter(
      (barcode) => barcode.itemType === itemType && barcode.itemId === itemId && barcode.isActive
    );
  }
  // Barcode Scan History operations
  async createBarcodeScan(insertScan) {
    const id = this.barcodeScanHistoryId++;
    const scan = {
      ...insertScan,
      id,
      notes: insertScan.notes ?? null,
      location: insertScan.location ?? null,
      actionId: insertScan.actionId ?? null,
      scanTime: /* @__PURE__ */ new Date()
    };
    this.barcodeScanHistory.set(id, scan);
    return scan;
  }
  async getBarcodeScanHistory(id) {
    return this.barcodeScanHistory.get(id);
  }
  async getBarcodeScansByBarcodeId(barcodeId) {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.barcodeId === barcodeId
    );
  }
  async getBarcodeScansByUserId(userId) {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.scannedByUserId === userId
    );
  }
  async getBarcodeScansByActionType(actionType) {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.actionType === actionType
    );
  }
  async getBarcodeScansByDate(startDate, endDate) {
    return Array.from(this.barcodeScanHistory.values()).filter((scan) => {
      const scanTime = new Date(scan.scanTime);
      return scanTime >= startDate && scanTime <= endDate;
    });
  }
  // Inventory Adjustment operations
  async getInventoryAdjustment(id) {
    return this.inventoryAdjustments.get(id);
  }
  async createInventoryAdjustment(insertAdjustment) {
    const id = this.inventoryAdjustmentId++;
    const adjustment = {
      ...insertAdjustment,
      id,
      notes: insertAdjustment.notes ?? null,
      maintenanceId: insertAdjustment.maintenanceId ?? null,
      repairId: insertAdjustment.repairId ?? null,
      adjustmentDate: /* @__PURE__ */ new Date()
    };
    this.inventoryAdjustments.set(id, adjustment);
    const itemId = adjustment.inventoryItemId;
    const locationId = adjustment.locationId;
    const locationType = adjustment.locationType;
    const quantityChange = adjustment.quantityChange;
    if (locationType === "warehouse") {
      const warehouseInventories = await this.getWarehouseInventoryByWarehouseId(locationId);
      const warehouseInventory2 = warehouseInventories.find((inv) => inv.inventoryItemId === itemId);
      if (warehouseInventory2) {
        await this.updateWarehouseInventory(warehouseInventory2.id, {
          quantity: Math.max(0, warehouseInventory2.quantity + quantityChange)
        });
      } else if (quantityChange > 0) {
        await this.createWarehouseInventory({
          warehouseId: locationId,
          inventoryItemId: itemId,
          quantity: quantityChange
        });
      }
    } else if (locationType === "vehicle") {
      const vehicleInventories = await this.getVehicleInventoryByVehicleId(locationId);
      const vehicleInventory2 = vehicleInventories.find((inv) => inv.inventoryItemId === itemId);
      if (vehicleInventory2) {
        await this.updateVehicleInventory(vehicleInventory2.id, {
          quantity: Math.max(0, vehicleInventory2.quantity + quantityChange)
        });
      } else if (quantityChange > 0) {
        await this.createVehicleInventory({
          vehicleId: locationId,
          inventoryItemId: itemId,
          quantity: quantityChange
        });
      }
    }
    return adjustment;
  }
  async getInventoryAdjustmentsByItemId(itemId) {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.inventoryItemId === itemId
    );
  }
  async getInventoryAdjustmentsByLocationId(locationType, locationId) {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.locationType === locationType && adjustment.locationId === locationId
    );
  }
  async getInventoryAdjustmentsByUserId(userId) {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.performedByUserId === userId
    );
  }
  async getInventoryAdjustmentsByReason(reason) {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.reason === reason
    );
  }
  async getInventoryAdjustmentsByDate(startDate, endDate) {
    return Array.from(this.inventoryAdjustments.values()).filter((adjustment) => {
      const adjustmentDate = new Date(adjustment.adjustmentDate);
      return adjustmentDate >= startDate && adjustmentDate <= endDate;
    });
  }
  async getAllInventoryAdjustments() {
    return Array.from(this.inventoryAdjustments.values());
  }
  // Subscription Plan operations
  async getSubscriptionPlan(id) {
    try {
      const result = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, id)
      });
      return result;
    } catch (error) {
      console.error("Error getting subscription plan:", error);
      return void 0;
    }
  }
  async createSubscriptionPlan(plan) {
    try {
      const [result] = await db.insert(subscriptionPlans).values(plan).returning();
      return result;
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      throw error;
    }
  }
  async updateSubscriptionPlan(id, plan) {
    try {
      const [result] = await db.update(subscriptionPlans).set({ ...plan, updatedAt: /* @__PURE__ */ new Date() }).where(eq(subscriptionPlans.id, id)).returning();
      return result;
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      return void 0;
    }
  }
  async deleteSubscriptionPlan(id) {
    try {
      await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      return false;
    }
  }
  async getAllSubscriptionPlans() {
    try {
      return await db.query.subscriptionPlans.findMany();
    } catch (error) {
      console.error("Error getting all subscription plans:", error);
      return [];
    }
  }
  async getSubscriptionPlansByTier(tier) {
    try {
      return await db.query.subscriptionPlans.findMany({
        where: eq(subscriptionPlans.tier, tier)
      });
    } catch (error) {
      console.error("Error getting subscription plans by tier:", error);
      return [];
    }
  }
  async getSubscriptionPlansByBillingCycle(billingCycle) {
    try {
      return await db.query.subscriptionPlans.findMany({
        where: eq(subscriptionPlans.billingCycle, billingCycle)
      });
    } catch (error) {
      console.error("Error getting subscription plans by billing cycle:", error);
      return [];
    }
  }
  async getActiveSubscriptionPlans() {
    try {
      return await db.query.subscriptionPlans.findMany({
        where: eq(subscriptionPlans.isActive, true)
      });
    } catch (error) {
      console.error("Error getting active subscription plans:", error);
      return [];
    }
  }
  // Subscription operations
  async getSubscription(id) {
    try {
      const result = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, id)
      });
      return result;
    } catch (error) {
      console.error("Error getting subscription:", error);
      return void 0;
    }
  }
  async getSubscriptionByOrganizationId(organizationId) {
    try {
      const result = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.organizationId, organizationId)
      });
      return result;
    } catch (error) {
      console.error("Error getting subscription by organization ID:", error);
      return void 0;
    }
  }
  async getSubscriptionByStripeId(stripeSubscriptionId) {
    try {
      const result = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId)
      });
      return result;
    } catch (error) {
      console.error("Error getting subscription by Stripe ID:", error);
      return void 0;
    }
  }
  async createSubscription(subscription) {
    try {
      const [result] = await db.insert(subscriptions).values(subscription).returning();
      return result;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }
  async updateSubscription(id, subscription) {
    try {
      const [result] = await db.update(subscriptions).set({ ...subscription, updatedAt: /* @__PURE__ */ new Date() }).where(eq(subscriptions.id, id)).returning();
      return result;
    } catch (error) {
      console.error("Error updating subscription:", error);
      return void 0;
    }
  }
  async deleteSubscription(id) {
    try {
      await db.delete(subscriptions).where(eq(subscriptions.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting subscription:", error);
      return false;
    }
  }
  async getAllSubscriptions() {
    try {
      return await db.query.subscriptions.findMany();
    } catch (error) {
      console.error("Error getting all subscriptions:", error);
      return [];
    }
  }
  // Payment Record operations
  async getPaymentRecord(id) {
    try {
      const result = await db.query.paymentRecords.findFirst({
        where: eq(paymentRecords.id, id)
      });
      return result;
    } catch (error) {
      console.error("Error getting payment record:", error);
      return void 0;
    }
  }
  async getPaymentRecordsBySubscriptionId(subscriptionId) {
    try {
      return await db.query.paymentRecords.findMany({
        where: eq(paymentRecords.subscriptionId, subscriptionId)
      });
    } catch (error) {
      console.error("Error getting payment records by subscription ID:", error);
      return [];
    }
  }
  async createPaymentRecord(paymentRecord) {
    try {
      const [result] = await db.insert(paymentRecords).values(paymentRecord).returning();
      return result;
    } catch (error) {
      console.error("Error creating payment record:", error);
      throw error;
    }
  }
  async getAllPaymentRecords() {
    try {
      return await db.query.paymentRecords.findMany();
    } catch (error) {
      console.error("Error getting all payment records:", error);
      return [];
    }
  }
};
var storage = new DatabaseStorage();

// server/routes/oauth-routes.ts
init_oauth_pending_users();

// server/oauth-utils.ts
init_oauth_pending_users();
async function completeOAuthRegistration(googleId, organizationId, role = "client", storage2, req) {
  try {
    const pendingUser = getPendingOAuthUser(googleId, req);
    if (!pendingUser) {
      return null;
    }
    const username = pendingUser.email;
    const newUser = await storage2.createUser({
      username,
      password: null,
      // OAuth users don't have a password
      name: pendingUser.displayName,
      email: pendingUser.email,
      role,
      googleId: pendingUser.id,
      photoUrl: pendingUser.photoUrl,
      authProvider: "google",
      organizationId,
      active: true
    });
    if (newUser) {
      removePendingOAuthUser(googleId, req);
      return newUser;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}
async function verifyInvitationToken(invitationToken, storage2) {
  try {
    const invitation = await storage2.getInvitationByToken(invitationToken);
    if (!invitation) {
      return {
        valid: false,
        message: "Invitation not found"
      };
    }
    const now = /* @__PURE__ */ new Date();
    const expiryDate = new Date(invitation.expiresAt);
    if (now > expiryDate) {
      return {
        valid: false,
        message: "Invitation has expired"
      };
    }
    if (invitation.status === "accepted") {
      return {
        valid: false,
        message: "Invitation has already been used"
      };
    }
    const organization = await storage2.getOrganization(invitation.organizationId);
    if (!organization) {
      return {
        valid: false,
        message: "Organization not found"
      };
    }
    return {
      valid: true,
      organizationId: organization.id,
      organizationName: organization.name,
      role: invitation.role,
      invitationId: invitation.id
    };
  } catch (error) {
    return {
      valid: false,
      message: "Error verifying invitation"
    };
  }
}

// server/routes/oauth-routes.ts
function registerOAuthRoutes(router3, storage2) {
  router3.post("/complete-registration", async (req, res) => {
    try {
      const { googleId, action, organizationName, organizationType, invitationCode } = req.body;
      if (!googleId) {
        return res.status(400).json({
          success: false,
          message: "Missing Google ID"
        });
      }
      const pendingUser = getPendingOAuthUser(googleId, req);
      if (!pendingUser) {
        return res.status(404).json({
          success: false,
          message: "Pending user not found. Your session may have expired."
        });
      }
      if (action === "create") {
        if (!organizationName) {
          return res.status(400).json({
            success: false,
            message: "Organization name is required"
          });
        }
        let slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (!slug) {
          slug = "org-" + Date.now();
        }
        const organizationData = {
          name: organizationName,
          slug,
          active: true,
          email: pendingUser.email,
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          logo: null,
          // Explicitly set the trial end date (14 days from now)
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3)
        };
        try {
          const newOrganization = await storage2.createOrganization(organizationData);
          if (!newOrganization) {
            return res.status(500).json({
              success: false,
              message: "Failed to create organization"
            });
          }
          const newUser = await completeOAuthRegistration(
            googleId,
            newOrganization.id,
            "org_admin",
            // Make the creator an admin of the new organization
            storage2,
            req
            // Pass request object for session access
          );
          if (!newUser) {
            return res.status(500).json({
              success: false,
              message: "Failed to create user account"
            });
          }
          req.login(newUser, (err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: "Failed to log in"
              });
            }
            return res.json({
              success: true,
              message: "Organization created successfully",
              redirectTo: "/pricing",
              user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                organizationId: newUser.organizationId
              }
            });
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while creating the organization: " + (error instanceof Error ? error.message : String(error))
          });
        }
      } else if (action === "join") {
        if (!invitationCode) {
          return res.status(400).json({
            success: false,
            message: "Invitation code is required"
          });
        }
        try {
          const verificationResult = await verifyInvitationToken(invitationCode, storage2);
          if (!verificationResult.valid) {
            return res.status(400).json({
              success: false,
              message: verificationResult.message || "Invalid invitation code"
            });
          }
          const role = verificationResult.role || "client";
          const newUser = await completeOAuthRegistration(
            googleId,
            verificationResult.organizationId,
            role,
            storage2,
            req
            // Pass request object for session access
          );
          if (!newUser) {
            return res.status(500).json({
              success: false,
              message: "Failed to create user account"
            });
          }
          if (verificationResult.invitationId) {
            await storage2.updateInvitationToken(verificationResult.invitationId, {
              status: "accepted"
            });
          }
          req.login(newUser, (err) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: "Failed to log in"
              });
            }
            return res.json({
              success: true,
              message: "Successfully joined organization",
              redirectTo: "/dashboard",
              user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                organizationId: newUser.organizationId
              }
            });
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            message: "An unexpected error occurred while joining the organization: " + (error instanceof Error ? error.message : String(error))
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "create" or "join".'
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred"
      });
    }
  });
  router3.get("/pending/:googleId", (req, res) => {
    try {
      const { googleId } = req.params;
      if (!googleId) {
        return res.status(400).json({
          success: false,
          message: "Missing Google ID"
        });
      }
      const pendingUser = getPendingOAuthUser(googleId, req);
      if (!pendingUser) {
        return res.status(404).json({
          success: false,
          message: "Pending user not found. Your session may have expired."
        });
      }
      return res.json({
        success: true,
        user: {
          googleId: pendingUser.id,
          email: pendingUser.email,
          displayName: pendingUser.displayName,
          photoUrl: pendingUser.photoUrl
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred"
      });
    }
  });
  router3.get("/verify-invitation/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Missing invitation token"
        });
      }
      const verificationResult = await verifyInvitationToken(token, storage2);
      if (!verificationResult.valid) {
        return res.json({
          success: false,
          message: verificationResult.message || "Invalid invitation code"
        });
      }
      return res.json({
        success: true,
        organizationId: verificationResult.organizationId,
        organizationName: verificationResult.organizationName,
        role: verificationResult.role,
        invitationId: verificationResult.invitationId
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while verifying the invitation"
      });
    }
  });
  return router3;
}

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
function configurePassport(storage2) {
  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}, ${user.email}, role: ${user.role}`);
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage2.getUser(id);
      if (!user) {
        console.log(`Deserialization failed - no user found with ID: ${id}`);
        return done(null, false);
      }
      console.log(`Deserialized user successfully: ${user.id}, ${user.email}, role: ${user.role}`);
      done(null, user);
    } catch (error) {
      console.error(`Error in deserializeUser:`, error);
      done(error);
    }
  });
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password"
      },
      async (username, password, done) => {
        try {
          console.log(`LocalStrategy: Authenticating user with username '${username}'`);
          const user = await storage2.getUserByUsername(username);
          if (!user) {
            console.log(`LocalStrategy: User '${username}' not found in database`);
            return done(null, false, { message: "Invalid username or password" });
          }
          if (!user.active) {
            console.log(`LocalStrategy: User '${username}' found but is inactive`);
            return done(null, false, { message: "Account is inactive" });
          }
          console.log(`LocalStrategy: User '${username}' found with id=${user.id}, email=${user.email}, role=${user.role}`);
          let isValidPassword = false;
          if (!user.password) {
            console.log(`LocalStrategy: User '${username}' has no password set (OAuth user?)`);
            isValidPassword = false;
          } else if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
            console.log(`LocalStrategy: User '${username}' has bcrypt password hash, comparing...`);
            isValidPassword = await bcrypt.compare(password, user.password);
            console.log(`LocalStrategy: Password comparison result for '${username}': ${isValidPassword}`);
          } else {
            console.log(`LocalStrategy: User '${username}' has plain text password, comparing...`);
            isValidPassword = password === user.password;
            console.log(`LocalStrategy: Plain text password comparison result for '${username}': ${isValidPassword}`);
            if (isValidPassword) {
              console.log(`LocalStrategy: Upgrading plain text password to bcrypt hash for '${username}'`);
              const hashedPassword = await hashPassword(password);
              await storage2.updateUser(user.id, { password: hashedPassword });
              console.log(`LocalStrategy: Password hash upgrade completed for '${username}'`);
            }
          }
          if (!isValidPassword) {
            console.log(`LocalStrategy: Invalid password for user '${username}'`);
            return done(null, false, { message: "Invalid username or password" });
          }
          console.log(`LocalStrategy: Authentication successful for user '${username}'`);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const isReplit2 = !!process.env.REPL_ID;
  let callbackURL = "https://smartwaterpools.replit.app/api/auth/google/callback";
  console.log("Google OAuth Configuration:");
  if (!GOOGLE_CLIENT_ID) {
    console.error("- ERROR: GOOGLE_CLIENT_ID is missing or empty in environment variables!");
  } else {
    const idLength = GOOGLE_CLIENT_ID.length;
    const idStart = GOOGLE_CLIENT_ID.substring(0, 6);
    const idEnd = GOOGLE_CLIENT_ID.substring(idLength - 4);
    console.log(`- Client ID available: YES (length: ${idLength}, starts with: ${idStart}..., ends with: ...${idEnd})`);
  }
  if (!GOOGLE_CLIENT_SECRET) {
    console.error("- ERROR: GOOGLE_CLIENT_SECRET is missing or empty in environment variables!");
  } else {
    console.log(`- Client Secret available: YES (length: ${GOOGLE_CLIENT_SECRET.length})`);
  }
  console.log(`- Callback URL: ${callbackURL}`);
  console.log(`- Running in Replit: ${isReplit2}`);
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    console.log("Configuring Google OAuth strategy with available credentials");
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL,
          scope: ["profile", "email"],
          // Enable both proxy trust and pass request object for better session handling
          proxy: true,
          passReqToCallback: true,
          // State parameter for CSRF protection and session preservation
          state: true,
          // Handle user cancellation better
          userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
          // Note: We're not setting prompt or sessionMaxAge here because the
          // type definition doesn't include these properties.
          // Instead, we pass 'prompt=select_account' in the URL directly
          // on the client side.
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google OAuth callback received - Processing authentication");
            if (req.session) {
              console.log(`Google OAuth: Session exists (ID: ${req.sessionID})`);
              console.log(`Google OAuth: Session state: ${req.session.oauthState || "none"}`);
              console.log(`Google OAuth: Session pending flag: ${req.session.oauthPending || false}`);
            } else {
              console.error("Google OAuth: No session found in request!");
            }
            if (!profile) {
              console.error("Google OAuth: No profile data received from Google");
              return done(new Error("No profile data received from Google"), false);
            }
            if (!profile.id) {
              console.error("Google OAuth: Profile missing ID field", profile);
              return done(new Error("Invalid Google profile - missing ID"), false);
            }
            console.log(`Google OAuth: Received profile for Google ID: ${profile.id}`);
            const emails = profile.emails || [];
            const hasEmails = emails.length > 0;
            console.log(`Google OAuth: Profile has ${emails.length} email(s)`);
            const email = hasEmails ? emails[0].value.toLowerCase() : "";
            if (!email) {
              console.error("Google OAuth: No email address in profile", emails);
              return done(new Error("No email address provided by Google"), false);
            }
            console.log(`Google OAuth: Using email ${email} for authentication`);
            let existingUser = await storage2.getUserByGoogleId(profile.id);
            if (existingUser) {
              if (!existingUser.active) {
                return done(null, false, { message: "This account has been deactivated" });
              }
              if (profile.photos && profile.photos[0] && profile.photos[0].value !== existingUser.photoUrl) {
                existingUser = await storage2.updateUser(existingUser.id, {
                  photoUrl: profile.photos[0].value
                }) || existingUser;
              }
              return done(null, existingUser);
            }
            try {
              const userWithEmail = await storage2.getUserByEmail(email);
              if (userWithEmail) {
                if (!userWithEmail.active) {
                  const updatedUser = await storage2.updateUser(userWithEmail.id, {
                    googleId: profile.id,
                    photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    authProvider: "google",
                    active: true
                    // Note: createdAt cannot be updated through updateUser,
                    // would need a direct database query to modify this field
                  });
                  if (updatedUser) {
                    updatedUser.isReactivated = true;
                    return done(null, updatedUser);
                  } else {
                    return done(new Error("Failed to reactivate user in database"), false);
                  }
                }
                if (userWithEmail.email.toLowerCase() === email.toLowerCase()) {
                  const updatedUser = await storage2.updateUser(userWithEmail.id, {
                    googleId: profile.id,
                    photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    authProvider: "google"
                  });
                  if (updatedUser) {
                    return done(null, updatedUser);
                  } else {
                    return done(new Error("Failed to update user in database"), false);
                  }
                } else {
                  const updatedUser = await storage2.updateUser(userWithEmail.id, {
                    googleId: profile.id,
                    photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    authProvider: "google"
                  });
                  if (updatedUser) {
                    return done(null, updatedUser);
                  } else {
                    return done(new Error("Failed to update user in database"), false);
                  }
                }
              }
            } catch (error) {
            }
            const displayName = profile.displayName || (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : email.split("@")[0]);
            if (email.toLowerCase() === "travis@smartwaterpools.com") {
              try {
                const username = email;
                const organization = await storage2.getOrganizationBySlug("smartwater-pools");
                if (!organization) {
                  const organizations3 = await storage2.getAllOrganizations();
                  if (organizations3 && organizations3.length > 0) {
                    console.log(`Using first available organization for Travis: ${organizations3[0].name} (ID: ${organizations3[0].id})`);
                    const newAdmin2 = await storage2.createUser({
                      username,
                      password: null,
                      name: displayName,
                      email,
                      role: "system_admin",
                      googleId: profile.id,
                      photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                      authProvider: "google",
                      organizationId: organizations3[0].id,
                      active: true
                    });
                    return done(null, newAdmin2);
                  }
                  return done(new Error("Default organization not found and no fallback organization available"), false);
                }
                const newAdmin = await storage2.createUser({
                  username,
                  password: null,
                  name: displayName,
                  email,
                  role: "system_admin",
                  googleId: profile.id,
                  photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: "google",
                  organizationId: organization.id,
                  active: true
                });
                console.log(`Created Travis account with system_admin role. User ID: ${newAdmin.id}, Organization: ${organization.name} (${organization.id})`);
                return done(null, newAdmin);
              } catch (error) {
                console.error("Error creating Travis admin account:", error);
                return done(error, false);
              }
            }
            if (email.toLowerCase() === "010101thomasanderson@gmail.com") {
              try {
                const username = email;
                let organization = await storage2.getOrganizationBySlug("smartwater-pools");
                if (!organization) {
                  organization = await storage2.createOrganization({
                    name: "SmartWater Pools",
                    slug: "smartwater-pools"
                  });
                }
                const newUser = await storage2.createUser({
                  username,
                  password: null,
                  name: "Thomas Anderson",
                  email,
                  role: "org_admin",
                  // Admin role for this test account
                  googleId: profile.id,
                  photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                  authProvider: "google",
                  organizationId: organization.id,
                  active: true
                });
                return done(null, newUser);
              } catch (error) {
                return done(error, false);
              }
            }
            try {
              const { storePendingOAuthUser: storePendingOAuthUser2 } = (init_oauth_pending_users(), __toCommonJS(oauth_pending_users_exports));
              storePendingOAuthUser2({
                id: profile.id,
                email,
                displayName,
                photoUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                profile,
                createdAt: /* @__PURE__ */ new Date()
              }, req);
              const tempUser = {
                id: -1,
                // Temporary ID
                username: email,
                email,
                role: "client",
                googleId: profile.id,
                isNewOAuthUser: true,
                needsOrganization: true
              };
              return done(null, tempUser);
            } catch (error) {
              return done(error, false);
            }
          } catch (error) {
            return done(error, false);
          }
        }
      )
    );
  }
  return passport;
}
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}
function isAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = req.user;
  if (user.role === "admin" || user.role === "org_admin" || user.role === "system_admin") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: Admin access required" });
}
function isSystemAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = req.user;
  if (user.role === "system_admin") {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: System Admin access required" });
}
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// server/routes/user-org-routes.ts
function registerUserOrgRoutes(router3, storage2, isUserRouter = true) {
  if (isUserRouter) {
    router3.get("/", isAuthenticated, async (req, res) => {
      try {
        console.log("GET /api/users - Retrieving all users");
        const users2 = await storage2.getAllUsers();
        console.log(`Retrieved ${users2.length} users`);
        res.json(users2);
      } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ error: "Failed to retrieve users" });
      }
    });
    router3.get("/:id", isAuthenticated, async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        const user = await storage2.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
      } catch (error) {
        console.error(`Error retrieving user ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to retrieve user" });
      }
    });
    router3.post("/", isAdmin, async (req, res) => {
      try {
        console.log("POST /api/users - Creating new user");
        console.log("Request body:", req.body);
        if (!req.body.username || !req.body.email || !req.body.name) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const existingUserByName = await storage2.getUserByUsername(req.body.username);
        if (existingUserByName) {
          return res.status(409).json({ error: "Username already exists" });
        }
        const existingUserByEmail = await storage2.getUserByEmail(req.body.email);
        if (existingUserByEmail) {
          return res.status(409).json({ error: "Email already exists" });
        }
        const newUser = await storage2.createUser({
          ...req.body,
          active: req.body.active !== void 0 ? req.body.active : true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log("User created successfully:", newUser.id);
        res.status(201).json(newUser);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
      }
    });
    router3.patch("/:id", isAdmin, async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        console.log(`PATCH /api/users/${userId} - Updating user`);
        const existingUser = await storage2.getUser(userId);
        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }
        const updatedUser = await storage2.updateUser(userId, {
          ...req.body,
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log(`User ${userId} updated successfully`);
        res.json(updatedUser);
      } catch (error) {
        console.error(`Error updating user ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to update user" });
      }
    });
    router3.delete("/:id", isAdmin, async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        const permanent = req.query.permanent === "true";
        console.log(`DELETE /api/users/${userId} - ${permanent ? "Permanently deleting" : "Deactivating"} user`);
        const existingUser = await storage2.getUser(userId);
        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }
        if (req.user && req.user.id === userId) {
          return res.status(403).json({ error: "Cannot delete yourself" });
        }
        if (permanent) {
          await storage2.deleteUser(userId);
          console.log(`User ${userId} permanently deleted`);
          return res.json({
            success: true,
            message: "User permanently deleted",
            permanent: true
          });
        } else {
          await storage2.updateUser(userId, {
            active: false,
            updatedAt: /* @__PURE__ */ new Date()
          });
          console.log(`User ${userId} deactivated`);
          return res.json({
            success: true,
            message: "User deactivated",
            permanent: false
          });
        }
      } catch (error) {
        console.error(`Error deleting user ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to delete user" });
      }
    });
    router3.get("/organization/:organizationId", isAuthenticated, async (req, res) => {
      try {
        const organizationId = parseInt(req.params.organizationId);
        if (isNaN(organizationId)) {
          return res.status(400).json({ error: "Invalid organization ID" });
        }
        console.log(`GET /api/users/organization/${organizationId} - Retrieving users for organization`);
        const users2 = await storage2.getUsersByOrganizationId(organizationId);
        console.log(`Retrieved ${users2.length} users for organization ${organizationId}`);
        res.json(users2);
      } catch (error) {
        console.error(`Error retrieving users for organization ${req.params.organizationId}:`, error);
        res.status(500).json({ error: "Failed to retrieve users" });
      }
    });
  } else {
    router3.get("/", isAuthenticated, async (req, res) => {
      try {
        console.log("GET /api/organizations - Retrieving all organizations");
        const organizations3 = await storage2.getAllOrganizations();
        console.log(`Retrieved ${organizations3.length} organizations`);
        res.json(organizations3);
      } catch (error) {
        console.error("Error retrieving organizations:", error);
        res.status(500).json({ error: "Failed to retrieve organizations" });
      }
    });
    router3.get("/:id", isAuthenticated, async (req, res) => {
      try {
        const organizationId = parseInt(req.params.id);
        if (isNaN(organizationId)) {
          return res.status(400).json({ error: "Invalid organization ID" });
        }
        const organization = await storage2.getOrganization(organizationId);
        if (!organization) {
          return res.status(404).json({ error: "Organization not found" });
        }
        res.json(organization);
      } catch (error) {
        console.error(`Error retrieving organization ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to retrieve organization" });
      }
    });
    router3.post("/", isSystemAdmin, async (req, res) => {
      try {
        console.log("POST /api/organizations - Creating new organization");
        console.log("Request body:", req.body);
        if (!req.body.name || !req.body.slug) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const existingOrg = await storage2.getOrganizationBySlug(req.body.slug);
        if (existingOrg) {
          return res.status(409).json({ error: "Organization slug already exists" });
        }
        const newOrganization = await storage2.createOrganization({
          ...req.body,
          active: req.body.active !== void 0 ? req.body.active : true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log("Organization created successfully:", newOrganization.id);
        res.status(201).json(newOrganization);
      } catch (error) {
        console.error("Error creating organization:", error);
        res.status(500).json({ error: "Failed to create organization" });
      }
    });
    router3.patch("/:id", isSystemAdmin, async (req, res) => {
      try {
        const organizationId = parseInt(req.params.id);
        if (isNaN(organizationId)) {
          return res.status(400).json({ error: "Invalid organization ID" });
        }
        console.log(`PATCH /api/organizations/${organizationId} - Updating organization`);
        const existingOrg = await storage2.getOrganization(organizationId);
        if (!existingOrg) {
          return res.status(404).json({ error: "Organization not found" });
        }
        const updatedOrganization = await storage2.updateOrganization(organizationId, {
          ...req.body,
          updatedAt: /* @__PURE__ */ new Date()
        });
        console.log(`Organization ${organizationId} updated successfully`);
        res.json(updatedOrganization);
      } catch (error) {
        console.error(`Error updating organization ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to update organization" });
      }
    });
  }
  return router3;
}

// server/routes/auth-routes.ts
import express from "express";
import passport2 from "passport";
import bcrypt2 from "bcrypt";
import { z as z2 } from "zod";
var oauthTimeoutMiddleware = (req, res, next) => {
  const OAUTH_TIMEOUT_MS = 6e4;
  const timeoutId = setTimeout(() => {
    console.error(`OAuth request timed out after ${OAUTH_TIMEOUT_MS}ms: ${req.path}`);
    if (!res.headersSent) {
      res.status(504).json({
        error: "Google authentication request timed out",
        message: "Please try again or use username/password login"
      });
    }
  }, OAUTH_TIMEOUT_MS);
  res.on("finish", () => {
    clearTimeout(timeoutId);
  });
  req.oauthTimeout = timeoutId;
  next();
};
var router = express.Router();
router.get("/session", (req, res) => {
  try {
    const isAuthenticated2 = req.isAuthenticated() && req.user;
    if (isAuthenticated2) {
      const user = req.user;
      console.log(`Session check: Authenticated user: ${user.email} (id=${user.id})`);
      const { password, ...userWithoutPassword } = user;
      res.json({
        isAuthenticated: true,
        user: userWithoutPassword
      });
    } else {
      console.log(`Session check: Not authenticated`);
      res.json({
        isAuthenticated: false
      });
    }
  } catch (error) {
    console.error("Session check error:", error);
    res.status(500).json({
      error: "Internal server error",
      isAuthenticated: false
    });
  }
});
router.post("/login", async (req, res, next) => {
  try {
    passport2.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login authentication error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login session error:", loginErr);
          return res.status(500).json({ success: false, message: "Session error" });
        }
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        return res.json({
          success: true,
          message: "Login successful",
          user: userWithoutPassword
        });
      });
    })(req, res, next);
  } catch (error) {
    console.error("Login route error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/logout", (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.json({ success: true, message: "Already logged out" });
    }
    console.log(`Logout request received`);
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ success: false, message: "Error during logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true, message: "Successfully logged out" });
    });
  } catch (error) {
    console.error("Logout route error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/register", async (req, res) => {
  try {
    const userSchema = insertUserSchema.extend({
      // Add additional validation if needed
      confirmPassword: z2.string().optional(),
      organizationName: z2.string().optional()
    });
    try {
      userSchema.parse(req.body);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationError.errors
      });
    }
    const { username, password, email, name, organizationName } = req.body;
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt2.hash(password, saltRounds);
    const newUser = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      name,
      role: "client",
      // Default role for new registrations
      active: true
      // Other fields would be added here
    });
    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;
    req.login(userWithoutPassword, (loginErr) => {
      if (loginErr) {
        console.error("Registration login error:", loginErr);
        return res.status(500).json({ success: false, message: "Session error" });
      }
      return res.status(201).json({
        success: true,
        message: "Registration successful",
        user: userWithoutPassword
      });
    });
  } catch (error) {
    console.error("Registration route error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.get("/google", oauthTimeoutMiddleware, (req, res, next) => {
  if (req.query.redirectTo) {
    req.session.redirectTo = req.query.redirectTo;
  }
  req.session.oauthInitiatedAt = (/* @__PURE__ */ new Date()).toISOString();
  console.log("Starting Google OAuth authentication flow");
  passport2.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })(req, res, next);
});
router.get(
  "/google/callback",
  oauthTimeoutMiddleware,
  // Add timeout middleware
  (req, res, next) => {
    console.log("Google OAuth callback received, session details:");
    console.log("- Session ID:", req.sessionID || "none");
    console.log("- Is Authenticated:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
    console.log("- Has user object:", !!req.user);
    console.log("- Cookies:", req.headers.cookie || "none");
    if (req.session?.oauthInitiatedAt) {
      const startTime = new Date(req.session.oauthInitiatedAt).getTime();
      const elapsedMs = Date.now() - startTime;
      console.log(`- OAuth flow elapsed time: ${elapsedMs}ms`);
    }
    next();
  },
  passport2.authenticate("google", {
    failureRedirect: "/login?error=google-auth-failed",
    session: true
  }),
  (req, res) => {
    try {
      console.log("Google OAuth login completed, authentication result:");
      console.log("- Is authenticated after Google auth:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
      console.log("- User object present:", !!req.user);
      if (req.user) {
        const user = req.user;
        console.log("- User ID:", user.id);
        console.log("- User email:", user.email);
        console.log("- User role:", user.role);
      }
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session after Google auth:", err);
          return res.redirect("/login?error=session-error");
        }
        console.log("Session saved successfully, redirecting to dashboard");
        res.redirect("/dashboard");
      });
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/login?error=callback-error");
    }
  }
);
router.get("/prepare-oauth", oauthTimeoutMiddleware, (req, res) => {
  try {
    console.log("OAuth session preparation requested");
    res.json({
      success: true,
      message: "OAuth flow ready"
    });
  } catch (error) {
    console.error("Prepare OAuth error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
var auth_routes_default = router;

// server/routes/bazza-routes.ts
import { Router } from "express";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
var router2 = Router();
var insertBazzaRouteSchema2 = createInsertSchema2(bazzaRoutes).omit({ id: true });
var insertBazzaRouteStopSchema2 = createInsertSchema2(bazzaRouteStops).omit({ id: true });
var insertBazzaMaintenanceAssignmentSchema2 = createInsertSchema2(bazzaMaintenanceAssignments).omit({ id: true });
router2.get("/routes/technician/:technicianId", isAuthenticated, async (req, res) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    const isKnownProblemTechnician = technicianId === 10;
    if (isKnownProblemTechnician) {
      console.log(`[BAZZA ROUTES API] Enhanced handling for known problem technician (ID: ${technicianId})`);
    } else {
      console.log(`[BAZZA ROUTES API] Processing request for bazza routes for technician ID: ${technicianId}`);
    }
    const routes2 = await storage.getBazzaRoutesByTechnicianId(technicianId);
    if (routes2.length === 0 || isKnownProblemTechnician) {
      console.log(`[BAZZA ROUTES API] Found ${routes2.length} routes for technician ID: ${technicianId}`);
    }
    if (routes2.length === 0) {
      console.log(`[BAZZA ROUTES API] No routes found in direct query - attempting universal fallback`);
      try {
        const allRoutes = await storage.getAllBazzaRoutes();
        console.log(`[BAZZA ROUTES API] Found ${allRoutes.length} total routes in system`);
        const technicianRoutes = allRoutes.filter((route) => route.technicianId === technicianId);
        console.log(`[BAZZA ROUTES API] Found ${technicianRoutes.length} routes for technician ID ${technicianId} in all routes`);
        if (technicianRoutes.length > 0) {
          console.log(`[BAZZA ROUTES API] Using fallback routes for technician ID ${technicianId}`);
          res.json(technicianRoutes);
          return;
        }
      } catch (fallbackError) {
        console.error(`[BAZZA ROUTES API] Error in fallback for technician ID ${technicianId}:`, fallbackError);
      }
    }
    res.json(routes2);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching bazza routes for technician ${req.params.technicianId}:`, error);
    try {
      console.log(`[BAZZA ROUTES API] Attempting emergency fallback on error for technician ID ${req.params.technicianId}`);
      const allRoutes = await storage.getAllBazzaRoutes();
      const technicianId = parseInt(req.params.technicianId);
      if (!isNaN(technicianId)) {
        const technicianRoutes = allRoutes.filter((route) => route.technicianId === technicianId);
        if (technicianRoutes.length > 0) {
          console.log(`[BAZZA ROUTES API] Emergency fallback successful - found ${technicianRoutes.length} routes`);
          res.json(technicianRoutes);
          return;
        }
      }
    } catch (fallbackError) {
      console.error(`[BAZZA ROUTES API] Emergency fallback also failed:`, fallbackError);
    }
    res.status(500).json({ error: "Failed to fetch bazza routes for technician" });
  }
});
router2.get("/routes/day/:dayOfWeek", isAuthenticated, async (req, res) => {
  try {
    const dayOfWeek = req.params.dayOfWeek;
    console.log(`[BAZZA ROUTES API] Processing request for bazza routes for day: ${dayOfWeek}`);
    const routes2 = await storage.getBazzaRoutesByDayOfWeek(dayOfWeek);
    res.json(routes2);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching bazza routes for day ${req.params.dayOfWeek}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza routes for day" });
  }
});
router2.get("/routes/:routeId/stops", isAuthenticated, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    console.log(`[BAZZA ROUTES API] Processing request for stops for bazza route ID: ${routeId}`);
    const stops = await storage.getBazzaRouteStopsByRouteId(routeId);
    res.json(stops);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching stops for bazza route ${req.params.routeId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza route stops" });
  }
});
router2.get("/routes/:routeId/assignments", isAuthenticated, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    console.log(`[BAZZA ROUTES API] Processing request for assignments for bazza route ID: ${routeId}`);
    const assignments = await storage.getBazzaMaintenanceAssignmentsByRouteId(routeId);
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for bazza route ${req.params.routeId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments" });
  }
});
router2.get("/routes", isAuthenticated, async (req, res) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request for all bazza routes");
    const routes2 = await storage.getAllBazzaRoutes();
    res.json(routes2);
  } catch (error) {
    console.error("[BAZZA ROUTES API] Error fetching all bazza routes:", error);
    res.status(500).json({ error: "Failed to fetch bazza routes" });
  }
});
router2.post("/routes", isAuthenticated, async (req, res) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request to create new bazza route");
    console.log("[BAZZA ROUTES API] Request body:", JSON.stringify(req.body));
    if (!req.body.name || !req.body.dayOfWeek || !req.body.type || req.body.technicianId === void 0) {
      const missingFields = [];
      if (!req.body.name) missingFields.push("name");
      if (!req.body.dayOfWeek) missingFields.push("dayOfWeek");
      if (!req.body.type) missingFields.push("type");
      if (req.body.technicianId === void 0) missingFields.push("technicianId");
      console.error(`[BAZZA ROUTES API] Missing required fields: ${missingFields.join(", ")}`);
      return res.status(400).json({
        error: "Missing required fields",
        details: missingFields.join(", ")
      });
    }
    try {
      req.body.technicianId = parseInt(req.body.technicianId);
      if (isNaN(req.body.technicianId)) {
        throw new Error("Invalid technicianId: Not a number");
      }
    } catch (e) {
      console.error(`[BAZZA ROUTES API] Invalid technicianId: ${req.body.technicianId}`);
      return res.status(400).json({
        error: "Invalid technicianId",
        details: "technicianId must be a valid integer"
      });
    }
    const validationResult = insertBazzaRouteSchema2.safeParse(req.body);
    if (!validationResult.success) {
      console.error("[BAZZA ROUTES API] Validation error:", JSON.stringify(validationResult.error.errors));
      return res.status(400).json({
        error: "Invalid route data",
        details: validationResult.error.errors
      });
    }
    console.log("[BAZZA ROUTES API] Validated data:", JSON.stringify(validationResult.data));
    try {
      const routeData = {
        name: req.body.name,
        dayOfWeek: req.body.dayOfWeek,
        type: req.body.type,
        technicianId: req.body.technicianId,
        description: req.body.description || null,
        weekNumber: req.body.weekNumber || null,
        isRecurring: req.body.isRecurring !== void 0 ? req.body.isRecurring : true,
        frequency: req.body.frequency || "weekly",
        color: req.body.color || null,
        startTime: req.body.startTime || null,
        endTime: req.body.endTime || null,
        isActive: req.body.isActive !== void 0 ? req.body.isActive : true
      };
      console.log("[BAZZA ROUTES API] Prepared route data:", JSON.stringify(routeData));
      const newRoute = await storage.createBazzaRoute(routeData);
      console.log("[BAZZA ROUTES API] Successfully created route:", JSON.stringify(newRoute));
      res.status(201).json(newRoute);
    } catch (dbError) {
      console.error("[BAZZA ROUTES API] Database error creating route:", dbError);
      res.status(500).json({ error: "Failed to create bazza route in database", message: String(dbError) });
    }
  } catch (error) {
    console.error("[BAZZA ROUTES API] Unexpected error creating bazza route:", error);
    res.status(500).json({ error: "Failed to create bazza route" });
  }
});
router2.put("/routes/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to update bazza route ID: ${id}`);
    const existingRoute = await storage.getBazzaRoute(id);
    if (!existingRoute) {
      return res.status(404).json({ error: "Bazza route not found" });
    }
    const updatedRoute = await storage.updateBazzaRoute(id, req.body);
    res.json(updatedRoute);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error updating bazza route ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update bazza route" });
  }
});
router2.get("/routes/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request for bazza route ID: ${id}`);
    const route = await storage.getBazzaRoute(id);
    if (!route) {
      return res.status(404).json({ error: "Bazza route not found" });
    }
    res.json(route);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching bazza route ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza route" });
  }
});
router2.delete("/routes/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to delete bazza route ID: ${id}`);
    const existingRoute = await storage.getBazzaRoute(id);
    if (!existingRoute) {
      console.log(`[BAZZA ROUTES API] Route ID ${id} not found for deletion`);
      return res.status(404).json({ error: "Bazza route not found" });
    }
    console.log(`[BAZZA ROUTES API] Found route "${existingRoute.name}" (ID: ${id}), proceeding with deletion`);
    try {
      const result = await storage.deleteBazzaRoute(id);
      if (result) {
        console.log(`[BAZZA ROUTES API] Successfully deleted route ID: ${id}`);
        res.status(204).end();
      } else {
        console.error(`[BAZZA ROUTES API] Storage returned false for route deletion ID: ${id}`);
        res.status(500).json({ error: "Failed to delete bazza route" });
      }
    } catch (storageError) {
      console.error(`[BAZZA ROUTES API] Storage error while deleting route ID ${id}:`, storageError);
      const errorMessage = storageError instanceof Error ? storageError.message : "Unknown error";
      res.status(500).json({
        error: "Failed to delete bazza route due to a database error",
        details: errorMessage
      });
    }
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error in route deletion handler for ID ${req.params.id}:`, error);
    res.status(500).json({
      error: "Failed to process bazza route deletion request",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router2.post("/stops", isAuthenticated, async (req, res) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request to create new bazza route stop");
    const validationResult = insertBazzaRouteStopSchema2.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid route stop data",
        details: validationResult.error.errors
      });
    }
    const newStop = await storage.createBazzaRouteStop(validationResult.data);
    res.status(201).json(newStop);
  } catch (error) {
    console.error("[BAZZA ROUTES API] Error creating bazza route stop:", error);
    res.status(500).json({ error: "Failed to create bazza route stop" });
  }
});
router2.put("/stops/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to update bazza route stop ID: ${id}`);
    const existingStop = await storage.getBazzaRouteStop(id);
    if (!existingStop) {
      return res.status(404).json({ error: "Bazza route stop not found" });
    }
    const updatedStop = await storage.updateBazzaRouteStop(id, req.body);
    res.json(updatedStop);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error updating bazza route stop ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update bazza route stop" });
  }
});
router2.delete("/stops/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to delete bazza route stop ID: ${id}`);
    const existingStop = await storage.getBazzaRouteStop(id);
    if (!existingStop) {
      console.log(`[BAZZA ROUTES API] Route stop ID ${id} not found for deletion`);
      return res.status(404).json({ error: "Bazza route stop not found" });
    }
    console.log(`[BAZZA ROUTES API] Found route stop ID: ${id} for route ID: ${existingStop.routeId}, proceeding with deletion`);
    try {
      const result = await storage.deleteBazzaRouteStop(id);
      if (result) {
        console.log(`[BAZZA ROUTES API] Successfully deleted route stop ID: ${id}`);
        res.status(204).end();
      } else {
        console.error(`[BAZZA ROUTES API] Storage returned false for route stop deletion ID: ${id}`);
        res.status(500).json({ error: "Failed to delete bazza route stop" });
      }
    } catch (storageError) {
      console.error(`[BAZZA ROUTES API] Storage error while deleting route stop ID ${id}:`, storageError);
      const errorMessage = storageError instanceof Error ? storageError.message : "Unknown error";
      res.status(500).json({
        error: "Failed to delete bazza route stop due to a database error",
        details: errorMessage
      });
    }
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error in route stop deletion handler for ID ${req.params.id}:`, error);
    res.status(500).json({
      error: "Failed to process bazza route stop deletion request",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router2.get("/stops/client/:clientId", isAuthenticated, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    console.log(`[BAZZA ROUTES API] Processing request for stops for client ID: ${clientId}`);
    const stops = await storage.getBazzaRouteStopsByClientId(clientId);
    res.json(stops);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching stops for client ${req.params.clientId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza route stops for client" });
  }
});
router2.post("/routes/:routeId/reorder-stops", isAuthenticated, async (req, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    console.log(`[BAZZA ROUTES API] Processing request to reorder stops for bazza route ID: ${routeId}`);
    if (!req.body.stopIds || !Array.isArray(req.body.stopIds)) {
      return res.status(400).json({ error: "Invalid request, stopIds array required" });
    }
    const updatedStops = await storage.reorderBazzaRouteStops(routeId, req.body.stopIds);
    res.json(updatedStops);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error reordering stops for bazza route ${req.params.routeId}:`, error);
    res.status(500).json({ error: "Failed to reorder bazza route stops" });
  }
});
router2.get("/assignments/maintenance/:maintenanceId", isAuthenticated, async (req, res) => {
  try {
    const maintenanceId = parseInt(req.params.maintenanceId);
    console.log(`[BAZZA ROUTES API] Processing request for assignments for maintenance ID: ${maintenanceId}`);
    const assignments = await storage.getBazzaMaintenanceAssignmentsByMaintenanceId(maintenanceId);
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for maintenance ${req.params.maintenanceId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments for maintenance" });
  }
});
router2.get("/assignments/date/:date", isAuthenticated, async (req, res) => {
  try {
    const dateStr = req.params.date;
    console.log(`[BAZZA ROUTES API] Processing request for assignments for date: ${dateStr}`);
    const date2 = new Date(dateStr);
    if (isNaN(date2.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Please use YYYY-MM-DD format." });
    }
    const assignments = await storage.getBazzaMaintenanceAssignmentsByDate(date2);
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for date ${req.params.date}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments for date" });
  }
});
router2.get("/assignments/technician/:technicianId/date-range", isAuthenticated, async (req, res) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate || typeof startDate !== "string" || typeof endDate !== "string") {
      return res.status(400).json({
        error: "Both startDate and endDate query parameters are required (format: YYYY-MM-DD)"
      });
    }
    console.log(`[BAZZA ROUTES API] Processing request for assignments for technician ID: ${technicianId} from ${startDate} to ${endDate}`);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: "Invalid date format. Please use YYYY-MM-DD format."
      });
    }
    const assignments = await storage.getBazzaMaintenanceAssignmentsByTechnicianIdAndDateRange(
      technicianId,
      start,
      end
    );
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for technician ${req.params.technicianId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments for technician and date range" });
  }
});
router2.post("/assignments", isAuthenticated, async (req, res) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request to create new bazza maintenance assignment");
    const validationResult = insertBazzaMaintenanceAssignmentSchema2.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid maintenance assignment data",
        details: validationResult.error.errors
      });
    }
    const newAssignment = await storage.createBazzaMaintenanceAssignment(
      validationResult.data
    );
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error("[BAZZA ROUTES API] Error creating bazza maintenance assignment:", error);
    res.status(500).json({ error: "Failed to create bazza maintenance assignment" });
  }
});
router2.put("/assignments/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to update bazza maintenance assignment ID: ${id}`);
    const existingAssignment = await storage.getBazzaMaintenanceAssignment(id);
    if (!existingAssignment) {
      return res.status(404).json({ error: "Bazza maintenance assignment not found" });
    }
    const updatedAssignment = await storage.updateBazzaMaintenanceAssignment(id, req.body);
    res.json(updatedAssignment);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error updating bazza maintenance assignment ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update bazza maintenance assignment" });
  }
});
router2.delete("/assignments/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to delete bazza maintenance assignment ID: ${id}`);
    const existingAssignment = await storage.getBazzaMaintenanceAssignment(id);
    if (!existingAssignment) {
      console.log(`[BAZZA ROUTES API] Maintenance assignment ID ${id} not found for deletion`);
      return res.status(404).json({ error: "Bazza maintenance assignment not found" });
    }
    console.log(`[BAZZA ROUTES API] Found assignment for route ID: ${existingAssignment.routeId}, maintenance ID: ${existingAssignment.maintenanceId}, proceeding with deletion`);
    try {
      const result = await storage.deleteBazzaMaintenanceAssignment(id);
      if (result) {
        console.log(`[BAZZA ROUTES API] Successfully deleted maintenance assignment ID: ${id}`);
        res.status(204).end();
      } else {
        console.error(`[BAZZA ROUTES API] Storage returned false for maintenance assignment deletion ID: ${id}`);
        res.status(500).json({ error: "Failed to delete bazza maintenance assignment" });
      }
    } catch (storageError) {
      console.error(`[BAZZA ROUTES API] Storage error while deleting maintenance assignment ID ${id}:`, storageError);
      const errorMessage = storageError instanceof Error ? storageError.message : "Unknown error";
      res.status(500).json({
        error: "Failed to delete bazza maintenance assignment due to a database error",
        details: errorMessage
      });
    }
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error in maintenance assignment deletion handler for ID ${req.params.id}:`, error);
    res.status(500).json({
      error: "Failed to process bazza maintenance assignment deletion request",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
var bazza_routes_default = router2;

// server/routes.ts
import passport3 from "passport";
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  app2.get("/debug", (req, res) => {
    res.sendFile("debug.html", { root: "./public" });
  });
  app2.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app2.use("/api/auth", auth_routes_default);
  app2.use("/api/bazza", bazza_routes_default);
  app2.get("/api/technicians", isAuthenticated, async (req, res) => {
    try {
      console.log("[TECHNICIANS API] Processing request for technicians list");
      const reqUser = req.user;
      console.log(`[TECHNICIANS API] Request by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      let technicians2;
      if (reqUser.role === "system_admin") {
        technicians2 = await storage.getAllTechniciansWithUsers();
        console.log(`[TECHNICIANS API] System admin - fetching all technicians with users (${technicians2.length})`);
      } else if (reqUser.organizationId) {
        technicians2 = await storage.getTechniciansByOrganizationIdWithUsers(reqUser.organizationId);
        console.log(`[TECHNICIANS API] Regular user - fetching technicians with users for organization ${reqUser.organizationId} (${technicians2.length})`);
      } else {
        console.error("[TECHNICIANS API] User has no organization ID:", reqUser);
        return res.status(400).json({ error: "Invalid user data - missing organization" });
      }
      console.log(`[TECHNICIANS API] Returning ${technicians2.length} technicians with user data`);
      res.json(technicians2);
    } catch (error) {
      console.error("[TECHNICIANS API] Error processing technicians request:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });
  app2.get("/api/technicians-with-users", isAuthenticated, async (req, res) => {
    try {
      console.log("[TECHNICIANS API] Processing request for technicians list");
      const reqUser = req.user;
      console.log(`[TECHNICIANS API] Request by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      let technicians2;
      if (reqUser.role === "system_admin") {
        console.log(`[TECHNICIANS API] System admin detected - about to fetch all technicians`);
        technicians2 = await storage.getAllTechniciansWithUsers();
        console.log(`[TECHNICIANS API] System admin - fetching all technicians with users (${technicians2?.length || 0})`);
        if (technicians2 && technicians2.length > 0) {
          const techSample = technicians2[0];
          console.log("[TECHNICIANS API] First technician detail:", {
            technicianId: techSample.id,
            userId: techSample.userId,
            hasUser: !!techSample.user,
            userName: techSample.user?.name,
            userEmail: techSample.user?.email,
            active: techSample.active
          });
        }
      } else if (reqUser.organizationId) {
        technicians2 = await storage.getTechniciansByOrganizationIdWithUsers(reqUser.organizationId);
        console.log(`[TECHNICIANS API] Regular user - fetching technicians with users for organization ${reqUser.organizationId} (${technicians2.length})`);
      } else {
        console.error("[TECHNICIANS API] User has no organization ID:", reqUser);
        return res.status(400).json({ error: "Invalid user data - missing organization" });
      }
      if (technicians2 && technicians2.length > 0) {
        technicians2 = technicians2.map((tech) => {
          if (!tech.user) {
            return {
              ...tech,
              user: {
                id: tech.userId,
                name: `Technician #${tech.id}`,
                email: null
              }
            };
          }
          return tech;
        });
      }
      console.log(`[TECHNICIANS API] Returning ${technicians2.length} technicians with user data`);
      res.json(technicians2);
    } catch (error) {
      console.error("[TECHNICIANS API] Error processing technicians request:", error);
      res.status(500).json({ error: "Failed to fetch technicians" });
    }
  });
  app2.post("/api/technicians/create", isAuthenticated, async (req, res) => {
    try {
      console.log("[TECHNICIANS API] Processing request to create technician");
      const reqUser = req.user;
      console.log(`[TECHNICIANS API] Create request by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      const { user, specialization, certifications, rate, notes } = req.body;
      if (!user || !user.name || !user.email) {
        return res.status(400).json({ error: "Missing required user data" });
      }
      if (!specialization) {
        return res.status(400).json({ error: "Specialization is required" });
      }
      const existingUser = await storage.getUserByEmail(user.email);
      if (existingUser) {
        return res.status(409).json({ error: "A user with this email already exists" });
      }
      const username = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 1e3);
      try {
        const newUser = await storage.createUser({
          username,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          address: user.address || null,
          role: "technician",
          // Set role to technician
          active: true,
          // Use the organization ID from the authenticated user
          organizationId: reqUser.organizationId,
          // Set temporary password (should be changed on first login)
          password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        });
        const newTechnician = await storage.createTechnician({
          userId: newUser.id,
          specialization,
          certifications: certifications || null
        });
        console.log(`[TECHNICIANS API] Successfully created technician with ID: ${newTechnician.id} for user ID: ${newUser.id}`);
        res.status(201).json({
          ...newTechnician,
          user: newUser,
          rate,
          notes
        });
      } catch (error) {
        console.error("[TECHNICIANS API] Error creating technician or user:", error);
        res.status(500).json({ error: "Failed to create technician" });
      }
    } catch (error) {
      console.error("[TECHNICIANS API] Error processing technician creation request:", error);
      res.status(500).json({ error: "Failed to process technician creation request" });
    }
  });
  app2.post("/api/auth/clear-oauth-state", (req, res) => {
    try {
      console.log("Clearing OAuth state for account switching");
      if (req.session) {
        delete req.session.oauthState;
        delete req.session.oauthPending;
        delete req.session.oauthInitiatedAt;
        delete req.session.originPath;
        req.session.save((err) => {
          if (err) {
            console.error("Error clearing OAuth session state:", err);
            return res.status(500).json({
              success: false,
              message: "Failed to clear OAuth state",
              error: err.message
            });
          }
          res.clearCookie("oauth_token");
          res.clearCookie("oauth_flow");
          res.clearCookie("oauth_timestamp");
          return res.json({
            success: true,
            message: "OAuth state cleared successfully"
          });
        });
      } else {
        res.clearCookie("oauth_token");
        res.clearCookie("oauth_flow");
        res.clearCookie("oauth_timestamp");
        res.json({
          success: true,
          message: "No active session, cookies cleared"
        });
      }
    } catch (error) {
      console.error("Error clearing OAuth state:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during OAuth state clearing"
      });
    }
  });
  app2.get("/api/auth/prepare-oauth", (req, res) => {
    try {
      console.log("Starting OAuth session preparation");
      const sessionExists = !!req.session;
      const sessionID = req.sessionID || "none";
      const hasExistingCookies = Object.keys(req.cookies || {}).length > 0;
      const cookies = Object.keys(req.cookies || {}).join(", ");
      console.log(`OAuth preparation details: sessionExists=${sessionExists}, sessionID=${sessionID}, hasExistingCookies=${hasExistingCookies}, cookies=[${cookies}]`);
      if (!req.session) {
        console.error("No session object available for OAuth preparation");
        return res.status(500).json({
          success: false,
          message: "Failed to prepare session for OAuth flow",
          details: {
            sessionExists,
            sessionID,
            hasExistingCookies,
            cookies
          }
        });
      }
      const initialSessionData = {
        id: req.sessionID,
        isNew: req.session.isNew,
        previousOAuthState: req.session.oauthState,
        hasPreviousOAuthFlag: !!req.session.oauthPending
      };
      const state = `oauth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      req.session.oauthState = state;
      req.session.oauthPending = true;
      req.session.oauthInitiatedAt = (/* @__PURE__ */ new Date()).toISOString();
      let originPath = "/dashboard";
      if (req.query.redirectPath) {
        if (typeof req.query.redirectPath === "string") {
          originPath = req.query.redirectPath;
        } else if (Array.isArray(req.query.redirectPath)) {
          const firstPath = req.query.redirectPath[0];
          originPath = firstPath || "/dashboard";
        } else {
          originPath = String(req.query.redirectPath);
        }
      }
      req.session.originPath = originPath;
      res.cookie("oauth_token", state, {
        maxAge: 15 * 60 * 1e3,
        // 15 minutes
        httpOnly: false,
        // Allow JavaScript to read this cookie
        secure: true,
        sameSite: "none",
        // Allow cross-site requests
        path: "/"
      });
      res.cookie("oauth_flow", "login", {
        maxAge: 15 * 60 * 1e3,
        // 15 minutes
        httpOnly: false,
        // Allow JavaScript access
        secure: true,
        sameSite: "none",
        // Allow cross-site requests
        path: "/"
      });
      res.cookie("oauth_timestamp", Date.now().toString(), {
        maxAge: 15 * 60 * 1e3,
        // 15 minutes
        httpOnly: false,
        // Allow JavaScript access
        secure: true,
        sameSite: "strict",
        path: "/"
      });
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      console.log("Initiating Google OAuth login flow with enhanced session preparation");
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session during OAuth preparation:", err);
          const errorDetails = {
            message: err.message,
            name: err.name,
            stack: err.stack,
            initialSessionData
          };
          return res.status(500).json({
            success: false,
            message: "Failed to save session for OAuth flow",
            error: err.message,
            details: errorDetails
          });
        }
        return res.status(200).json({
          success: true,
          message: "Session prepared for OAuth",
          state,
          sessionID: req.sessionID,
          initialSessionData,
          cookies: {
            set: ["oauth_token", "oauth_flow", "oauth_timestamp"],
            values: {
              state,
              flow: "login",
              timestamp: Date.now()
            }
          }
        });
      });
    } catch (error) {
      const errorObj = error;
      console.error("Error in OAuth session preparation:", {
        message: errorObj.message,
        name: errorObj.name,
        stack: errorObj.stack
      });
      return res.status(500).json({
        success: false,
        message: "Internal server error during OAuth preparation",
        error: errorObj.message || "Unknown error",
        errorType: errorObj.name || "Error"
      });
    }
  });
  app2.get("/api/auth/session", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user;
      console.log(`Session check: Authenticated user: ${userWithoutPassword.email} (${userWithoutPassword.id})`);
      return res.json({
        isAuthenticated: true,
        user: userWithoutPassword
      });
    } else {
      console.log(`Session check: Not authenticated`);
      return res.json({
        isAuthenticated: false
      });
    }
  });
  app2.get("/api/auth/google", (req, res, next) => {
    console.log("Google OAuth initiation request received");
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Google OAuth credentials missing");
      return res.redirect("/login?error=google-credentials-missing");
    }
    const state = req.query.state;
    const promptValue = req.query.prompt;
    const authOptions = {
      scope: ["profile", "email"]
    };
    if (state) {
      authOptions.state = state;
      console.log(`Using provided OAuth state: ${state}`);
      if (req.session) {
        req.session.oauthState = state;
        req.session.oauthPending = true;
      }
    }
    if (promptValue === "select_account") {
      authOptions.prompt = "select_account";
      console.log("Using select_account prompt for Google OAuth");
    }
    console.log("Google OAuth request details:");
    console.log("- Headers:", JSON.stringify(req.headers, null, 2).substring(0, 500) + "...");
    console.log("- Query params:", JSON.stringify(req.query, null, 2));
    console.log("- Auth options:", JSON.stringify(authOptions, null, 2));
    passport3.authenticate("google", authOptions)(req, res, next);
  });
  app2.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      try {
        console.log("OAuth callback received, processing authentication");
        console.log("- Session exists:", !!req.session);
        console.log("- Session ID:", req.sessionID || "none");
        console.log("- OAuth state from query:", req.query.state || "none");
        console.log("- OAuth state in session:", req.session?.oauthState || "none");
        console.log("- OAuth pending flag:", req.session?.oauthPending || false);
        console.log("- Headers present:", Object.keys(req.headers).join(", "));
        console.log("- Cookies from header:", req.headers.cookie?.substring(0, 100) || "none");
        if (req.query.error) {
          console.error(`Google OAuth error: ${req.query.error}`);
          if (req.query.error === "access_denied") {
            return res.redirect("/?error=access-denied");
          }
          return res.redirect("/?error=google-error");
        }
        const queryState = req.query.state;
        let sessionState = req.session?.oauthState;
        const cookieState = req.cookies?.oauth_token;
        if (!sessionState) {
          if (cookieState) {
            console.log("Restoring OAuth state from cookie:", cookieState);
            if (req.session) req.session.oauthState = cookieState;
            sessionState = cookieState;
          } else if (queryState) {
            console.log("Using query state as fallback:", queryState);
            if (req.session) req.session.oauthState = queryState;
            sessionState = queryState;
          }
        }
        console.log("State comparison:");
        console.log("- Query state:", queryState || "none");
        console.log("- Session state:", sessionState || "none");
        console.log("- Cookie state:", cookieState || "none");
        if (req.query.code && !queryState) {
          console.log("OAuth callback has code but no state, proceeding anyway");
        }
        if (!req.session) {
          console.error("No session object in callback request - creating new one");
        }
        res.setTimeout(1e4, () => {
          console.error("Google OAuth callback timed out");
          res.redirect("/?error=authentication-timeout");
        });
        next();
      } catch (error) {
        console.error("Error in OAuth callback preprocessing:", error);
        return res.redirect("/?error=oauth-process-error");
      }
    },
    passport3.authenticate("google", {
      failureRedirect: "/?error=google-auth-failed",
      failureMessage: "Failed to authenticate with Google",
      // Add session: true to ensure we're using session-based auth
      session: true
    }),
    (req, res) => {
      try {
        console.log("OAuth authentication successful, processing user data");
        console.log("- Is Authenticated:", req.isAuthenticated ? req.isAuthenticated() : "function not available");
        console.log("- User object present:", !!req.user);
        if (req.user) {
          const user2 = req.user;
          console.log("- User ID:", user2.id);
          console.log("- User email:", user2.email);
          console.log("- User role:", user2.role);
        }
        if (req.session) {
          delete req.session.oauthState;
          delete req.session.oauthPending;
          delete req.session.oauthInitiatedAt;
        }
        res.clearCookie("oauth_token");
        res.clearCookie("oauth_flow");
        res.clearCookie("oauth_timestamp");
        res.clearCookie("oauth_source");
        if (!req.user) {
          console.error("No user object found after successful OAuth authentication");
          return res.redirect("/?error=missing-user-data");
        }
        const user = req.user;
        console.log(`OAuth login successful for user ${user.email} (${user.id})`);
        if (!user.email) {
          console.error("User missing required email field");
          return res.redirect("/?error=incomplete-user-data");
        }
        console.log("Verifying user in database with ID:", user.id);
        storage.getUser(user.id).then((dbUser) => {
          console.log("Database user lookup result:", dbUser ? "Found" : "Not Found");
          if (!dbUser) {
            console.error(`User ID ${user.id} not found in database after Google OAuth`);
            return res.redirect("/?error=user-not-found");
          }
          console.log("User verified in database:", dbUser.id);
          if (dbUser.organizationId) {
            console.log("Verifying organization in database with ID:", dbUser.organizationId);
            return storage.getOrganization(dbUser.organizationId).then((org) => {
              console.log("Database organization lookup result:", org ? "Found" : "Not Found");
              if (!org) {
                console.error(`Organization ID ${dbUser.organizationId} not found for user ${dbUser.id}`);
                return res.redirect("/?error=organization-not-found");
              }
              console.log("Organization verified in database:", org.id, org.name);
              const enhancedUser = {
                ...dbUser,
                organizationName: org.name,
                organizationStatus: org.active ? "active" : "inactive"
              };
              if (req.user) {
                req.user = enhancedUser;
              }
              return saveSessionAndRedirect(req, res, enhancedUser);
            });
          } else {
            return saveSessionAndRedirect(req, res, dbUser);
          }
        }).catch((error) => {
          console.error("Error verifying user in database:", error);
          return res.redirect("/?error=database-verification-failed");
        });
      } catch (error) {
        console.error("Error in OAuth callback handler:", error);
        if (error instanceof Error) {
          console.error("Error stack:", error.stack);
        }
        res.redirect("/?error=oauth-callback-error");
      }
    }
  );
  function saveSessionAndRedirect(req, res, user) {
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session after OAuth login:", err);
        return res.redirect("/?error=session-save-failed");
      }
      console.log("Session saved successfully after OAuth login");
      console.log("- Session ID:", req.sessionID);
      console.log("- Cookie data sent:", !!res.getHeader("Set-Cookie"));
      if (req.user) {
        req.user.loginSuccess = true;
      }
      req.session.touch();
      if (!req.user) {
        req.user = user;
      }
      req.session.passport = req.session.passport || {};
      req.session.passport.user = user.id;
      if (user.role === "system_admin") {
        console.log("Redirecting system admin to admin dashboard");
        return res.redirect("/admin/dashboard");
      } else if (!user.organizationId) {
        console.log("User has no organization, redirecting to organization setup");
        return res.redirect("/subscription/setup");
      } else {
        console.log("Redirecting to main dashboard");
        return res.redirect("/dashboard");
      }
    });
  }
  const oauthRouter = express3.Router();
  const typeSafeStorage = storage;
  app2.use("/api/oauth", registerOAuthRoutes(oauthRouter, typeSafeStorage));
  app2.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user;
      console.log("\n=================================================================");
      console.log("============== CLIENT API REQUEST DETAILED DEBUG ================");
      console.log("=================================================================");
      console.log("Timestamp:", (/* @__PURE__ */ new Date()).toISOString());
      console.log("Request Path:", req.path);
      console.log("Request Method:", req.method);
      console.log("Request User-Agent:", req.headers["user-agent"]);
      console.log("\nAuthenticated User Details:");
      console.log({
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId,
        createdAt: reqUser.createdAt,
        updatedAt: reqUser.updatedAt
      });
      console.log(`
Role check: "${reqUser.role}" (Type: ${typeof reqUser.role})`);
      console.log(`Is system_admin?: ${reqUser.role === "system_admin"}`);
      console.log(`roleCheck1: ${reqUser.role == "system_admin"}`);
      console.log(`roleCheck2: ${String(reqUser.role).trim() === "system_admin"}`);
      if (reqUser.organizationId) {
        console.log(`
Organization ID type check: ${typeof reqUser.organizationId}`);
        console.log(`Organization ID value: ${reqUser.organizationId}`);
        if (typeof reqUser.organizationId !== "number") {
          console.warn(`WARNING: organizationId is not a number, attempting to convert from: ${JSON.stringify(reqUser.organizationId)}`);
          reqUser.organizationId = parseInt(reqUser.organizationId, 10);
          console.log(`Converted organizationId to: ${reqUser.organizationId} (${typeof reqUser.organizationId})`);
        }
      }
      let clientsWithUsers = [];
      const isSystemAdmin3 = String(reqUser.role).trim().toLowerCase() === "system_admin";
      if (isSystemAdmin3) {
        console.log(`
[CLIENTS API] System admin role detected (${reqUser.email}) - fetching ALL clients via getAllClientsWithUsers()`);
        if (reqUser.email === "travis@smartwaterpools.com") {
          console.log("[CLIENTS API] Special handling for Travis's account");
        }
        try {
          const allClients = await typeSafeStorage.getAllClients();
          console.log(`[CLIENTS API] Raw getAllClients() response: Found ${allClients.length} clients`);
          const organizationIds = [...new Set(allClients.map((c) => c.organizationId))];
          console.log(`[CLIENTS API] Organizations present in clients data: ${JSON.stringify(organizationIds)}`);
          const org1Clients = allClients.filter((c) => c.organizationId === 1);
          console.log(`[CLIENTS API] Found ${org1Clients.length} clients with organizationId=1 directly from getAllClients()`);
          if (org1Clients.length > 0) {
            console.log(
              "[CLIENTS API] Sample clients with organizationId=1:",
              org1Clients.slice(0, Math.min(3, org1Clients.length)).map((c) => ({
                id: c.id,
                userId: c.userId,
                organizationId: c.organizationId,
                companyName: c.companyName
              }))
            );
          }
        } catch (err) {
          console.error("[CLIENTS API] Error during database verification:", err);
        }
        try {
          clientsWithUsers = await typeSafeStorage.getAllClientsWithUsers();
          console.log(`[CLIENTS API] getAllClientsWithUsers() returned ${clientsWithUsers.length} clients`);
        } catch (err) {
          console.error("[CLIENTS API] Error during getAllClientsWithUsers:", err);
          console.log("[CLIENTS API] Trying fallback approach for system admin...");
          try {
            const allClients = await typeSafeStorage.getAllClients();
            console.log(`[CLIENTS API] Fallback: Found ${allClients.length} raw clients`);
            clientsWithUsers = await Promise.all(
              allClients.map(async (client) => {
                try {
                  const user = await typeSafeStorage.getUserById(client.userId);
                  return { client, user };
                } catch (e) {
                  console.error(`[CLIENTS API] Error getting user for client ${client.id}:`, e);
                  return {
                    client,
                    user: {
                      id: client.userId,
                      name: "Unknown User",
                      email: "unknown@example.com",
                      role: "client"
                    }
                  };
                }
              })
            );
            console.log(`[CLIENTS API] Fallback method built ${clientsWithUsers.length} client records`);
          } catch (fallbackErr) {
            console.error("[CLIENTS API] Fallback approach also failed:", fallbackErr);
          }
        }
      } else if (reqUser.organizationId) {
        console.log(`
[CLIENTS API] Standard user with organization ${reqUser.organizationId} - fetching filtered clients`);
        try {
          const directOrgClients = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          console.log(`[CLIENTS API] getClientsByOrganizationId(${reqUser.organizationId}) returned ${directOrgClients.length} clients directly`);
        } catch (err) {
          console.error(`[CLIENTS API] Error during direct organization check:`, err);
        }
        clientsWithUsers = await typeSafeStorage.getClientsWithUsersByOrganizationId(reqUser.organizationId);
      } else {
        console.error("\n[CLIENTS API] ERROR: User has no organization ID:", reqUser);
        return res.status(400).json({
          error: "Invalid user data - missing organization"
        });
      }
      console.log(`
[CLIENTS API] Retrieved ${clientsWithUsers.length} clients with user data`);
      if (clientsWithUsers.length > 0) {
        console.log(
          "[CLIENTS API] Sample client data from final response:",
          clientsWithUsers.slice(0, Math.min(3, clientsWithUsers.length)).map((c) => ({
            clientId: c.client?.id,
            companyName: c.client?.companyName,
            clientUserId: c.client?.userId,
            clientOrgId: c.client?.organizationId,
            userName: c.user?.name,
            userEmail: c.user?.email,
            userRole: c.user?.role,
            userOrgId: c.user?.organizationId
          }))
        );
      } else {
        console.warn("[CLIENTS API] WARNING: No clients found to return");
      }
      console.log("=================================================================\n");
      res.json(clientsWithUsers);
    } catch (error) {
      console.error("[CLIENTS API] ERROR: Exception during client data processing:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("\n=================================================================");
      console.log("============= CLIENT DETAIL API REQUEST DEBUG ===================");
      console.log("=================================================================");
      const reqUser = req.user;
      const clientId = parseInt(req.params.id, 10);
      console.log(`[CLIENT DETAIL API] Request for client ID: ${clientId} by user:`, {
        id: reqUser.id,
        name: reqUser.name,
        email: reqUser.email,
        role: reqUser.role,
        organizationId: reqUser.organizationId
      });
      const clientWithUser = await typeSafeStorage.getClientWithUser(clientId);
      if (!clientWithUser) {
        console.log(`[CLIENT DETAIL API] Client with ID ${clientId} not found`);
        return res.status(404).json({ error: "Client not found" });
      }
      const hasAccess = reqUser.role === "system_admin" || // System admins can see everything
      reqUser.organizationId && reqUser.organizationId === clientWithUser.client.organizationId;
      if (!hasAccess) {
        console.log(`[CLIENT DETAIL API] Access denied for user ${reqUser.id} to client ${clientId}`);
        console.log(`User org: ${reqUser.organizationId}, Client org: ${clientWithUser.client.organizationId}`);
        return res.status(403).json({ error: "Access denied" });
      }
      console.log(`[CLIENT DETAIL API] Access granted for user ${reqUser.id} to client ${clientId}`);
      const clientResponse = {
        ...clientWithUser,
        // Add properties that ClientDetails.tsx expects
        id: clientWithUser.client.id,
        companyName: clientWithUser.client.companyName,
        contractType: clientWithUser.client.contractType,
        // Add address fields if available
        address: clientWithUser.client.address,
        city: clientWithUser.client.city,
        state: clientWithUser.client.state,
        zipCode: clientWithUser.client.zip,
        phone: clientWithUser.client.phone,
        // Pool details will be added by other endpoints
        poolType: null,
        poolSize: null,
        filterType: null,
        chemicalSystem: null,
        heaterType: null,
        poolFeatures: "",
        serviceDay: null,
        specialNotes: clientWithUser.client.notes || null
      };
      console.log(`[CLIENT DETAIL API] Returning client data with user info`);
      res.json(clientResponse);
    } catch (error) {
      console.error("[CLIENT DETAIL API] Error fetching client details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/dashboard/summary", isAuthenticated, async (req, res) => {
    try {
      const reqUser = req.user;
      let projects2, maintenances2, repairs2, clients2;
      if (reqUser && reqUser.organizationId && reqUser.role !== "system_admin") {
        console.log(`Fetching dashboard data for organization ${reqUser.organizationId}`);
        const [allProjects, allMaintenances, allRepairs] = await Promise.all([
          typeSafeStorage.getAllProjects(),
          typeSafeStorage.getUpcomingMaintenances(7),
          typeSafeStorage.getRecentRepairs(5)
        ]);
        clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
        const clientIds = new Set(clients2.map((client) => client.id));
        projects2 = allProjects.filter((project) => clientIds.has(project.clientId));
        maintenances2 = allMaintenances.filter((maintenance) => clientIds.has(maintenance.clientId));
        repairs2 = allRepairs.filter((repair) => clientIds.has(repair.clientId));
        console.log(`Found ${projects2.length} projects, ${maintenances2.length} maintenances, ${repairs2.length} repairs, ${clients2.length} clients`);
      } else {
        console.log("Fetching all dashboard data (system admin)");
        [projects2, maintenances2, repairs2, clients2] = await Promise.all([
          typeSafeStorage.getAllProjects(),
          typeSafeStorage.getUpcomingMaintenances(7),
          typeSafeStorage.getRecentRepairs(5),
          typeSafeStorage.getAllClients()
        ]);
      }
      const summary = {
        metrics: {
          activeProjects: projects2.filter((p) => p.status !== "completed").length,
          maintenanceThisWeek: maintenances2.length,
          pendingRepairs: repairs2.filter((r) => r.status !== "completed").length,
          totalClients: clients2.length
        },
        recentProjects: await Promise.all(
          projects2.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).slice(0, 5).map(async (project) => {
            const clientWithUser = await typeSafeStorage.getClientWithUser(project.clientId);
            const assignments = await typeSafeStorage.getProjectAssignments(project.id);
            return {
              ...project,
              client: clientWithUser,
              assignmentCount: assignments.length
            };
          })
        ),
        upcomingMaintenances: await Promise.all(
          maintenances2.slice(0, 5).map(async (maintenance) => {
            const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;
            if (maintenance.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
            }
            return {
              ...maintenance,
              client: clientWithUser,
              technician: technicianWithUser
            };
          })
        ),
        recentRepairs: await Promise.all(
          repairs2.map(async (repair) => {
            const clientWithUser = await typeSafeStorage.getClientWithUser(repair.clientId);
            let technicianWithUser = null;
            if (repair.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(repair.technicianId);
            }
            return {
              ...repair,
              client: clientWithUser,
              technician: technicianWithUser
            };
          })
        )
      };
      res.json(summary);
    } catch (error) {
      console.error("Dashboard summary error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary", error: error instanceof Error ? error.message : String(error) });
    }
  });
  const userRouter = express3.Router();
  app2.use("/api/users", registerUserOrgRoutes(userRouter, typeSafeStorage, true));
  const organizationRouter = express3.Router();
  app2.use("/api/organizations", registerUserOrgRoutes(organizationRouter, typeSafeStorage, false));
  app2.get("/api/clients/:id/equipment", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      console.log(`[API] Request for equipment for client ID: ${clientId}`);
      return res.json([]);
    } catch (error) {
      console.error("[API] Error fetching client equipment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/clients/:id/images", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      console.log(`[API] Request for images for client ID: ${clientId}`);
      return res.json([]);
    } catch (error) {
      console.error("[API] Error fetching client images:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/maintenances/upcoming", isAuthenticated, async (req, res) => {
    try {
      console.log("\n[UPCOMING MAINTENANCES API] Processing request for upcoming maintenances");
      const reqUser = req.user;
      const clientId = req.query.clientId ? parseInt(req.query.clientId, 10) : void 0;
      const days = req.query.days ? parseInt(req.query.days, 10) : 7;
      let upcomingMaintenances = [];
      if (!reqUser) {
        console.error("[UPCOMING MAINTENANCES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      console.log(`[UPCOMING MAINTENANCES API] User role: ${reqUser.role}, Organization ID: ${reqUser.organizationId}, ClientID filter: ${clientId}, Days: ${days}`);
      const allUpcomingMaintenances = await typeSafeStorage.getUpcomingMaintenances(days);
      console.log(`[UPCOMING MAINTENANCES API] Retrieved ${allUpcomingMaintenances.length} total upcoming maintenances for next ${days} days`);
      if (reqUser.role === "system_admin") {
        console.log("[UPCOMING MAINTENANCES API] User is system admin");
        if (clientId) {
          console.log(`[UPCOMING MAINTENANCES API] Filtering by specific client ID: ${clientId}`);
          upcomingMaintenances = allUpcomingMaintenances.filter((maintenance) => maintenance.clientId === clientId);
        } else {
          upcomingMaintenances = allUpcomingMaintenances;
        }
      } else if (reqUser.organizationId) {
        console.log(`[UPCOMING MAINTENANCES API] Regular user with organization ID: ${reqUser.organizationId}`);
        if (clientId) {
          const client = await typeSafeStorage.getClient(clientId);
          if (client && client.organizationId === reqUser.organizationId) {
            console.log(`[UPCOMING MAINTENANCES API] Filtering by client ID: ${clientId} (verified in organization ${reqUser.organizationId})`);
            upcomingMaintenances = allUpcomingMaintenances.filter((maintenance) => maintenance.clientId === clientId);
          } else {
            console.error(`[UPCOMING MAINTENANCES API] Client ID ${clientId} is not in user's organization`);
            return res.status(403).json({ error: "Access denied to this client's data" });
          }
        } else {
          console.log(`[UPCOMING MAINTENANCES API] Filtering by all clients in organization ${reqUser.organizationId}`);
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          upcomingMaintenances = allUpcomingMaintenances.filter((maintenance) => clientIds.has(maintenance.clientId));
        }
      } else {
        console.error("[UPCOMING MAINTENANCES API] User has no organization ID:", reqUser);
        return res.status(400).json({
          error: "Invalid user data - missing organization"
        });
      }
      console.log(`[UPCOMING MAINTENANCES API] Retrieved ${upcomingMaintenances.length} filtered upcoming maintenances`);
      const enhancedMaintenances = await Promise.all(
        upcomingMaintenances.map(async (maintenance) => {
          try {
            const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;
            if (maintenance.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
            }
            return {
              ...maintenance,
              client: clientWithUser || {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: technicianWithUser ? {
                id: technicianWithUser.technician.id,
                userId: technicianWithUser.technician.userId,
                user: {
                  id: technicianWithUser.user.id,
                  name: technicianWithUser.user.name,
                  email: technicianWithUser.user.email
                }
              } : null
            };
          } catch (error) {
            console.error(`[UPCOMING MAINTENANCES API] Error enhancing maintenance ${maintenance.id}:`, error);
            return {
              ...maintenance,
              client: {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: null
            };
          }
        })
      );
      console.log(`[UPCOMING MAINTENANCES API] Returning ${enhancedMaintenances.length} enhanced upcoming maintenances`);
      res.json(enhancedMaintenances);
    } catch (error) {
      console.error("[UPCOMING MAINTENANCES API] Error fetching upcoming maintenances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      console.log("\n[PROJECTS API] Processing request for projects list");
      const reqUser = req.user;
      let projects2 = [];
      if (!reqUser) {
        console.error("[PROJECTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      console.log(`[PROJECTS API] User role: ${reqUser.role}, Organization ID: ${reqUser.organizationId}`);
      if (reqUser.role === "system_admin") {
        console.log("[PROJECTS API] User is system admin, fetching all projects");
        projects2 = await typeSafeStorage.getAllProjects();
        console.log(`[PROJECTS API] Retrieved ${projects2.length} projects for system admin`);
      } else if (reqUser.organizationId) {
        console.log(`[PROJECTS API] Fetching projects for organization ${reqUser.organizationId}`);
        const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
        const clientIds = new Set(clients2.map((client) => client.id));
        const allProjects = await typeSafeStorage.getAllProjects();
        projects2 = allProjects.filter((project) => clientIds.has(project.clientId));
        console.log(`[PROJECTS API] Retrieved ${projects2.length} projects for organization ${reqUser.organizationId}`);
      } else {
        console.error("[PROJECTS API] User has no organization ID:", reqUser);
        return res.status(400).json({
          error: "Invalid user data - missing organization"
        });
      }
      const enhancedProjects = await Promise.all(
        projects2.map(async (project) => {
          try {
            const clientWithUser = await typeSafeStorage.getClientWithUser(project.clientId);
            return {
              ...project,
              client: clientWithUser ? {
                id: clientWithUser.client.id,
                user: {
                  id: clientWithUser.user.id,
                  name: clientWithUser.user.name
                },
                companyName: clientWithUser.client.companyName
              } : { id: project.clientId, user: { id: 0, name: "Unknown" }, companyName: "" }
            };
          } catch (error) {
            console.error(`[PROJECTS API] Error enhancing project ${project.id}:`, error);
            return {
              ...project,
              client: { id: project.clientId, user: { id: 0, name: "Unknown" }, companyName: "" }
            };
          }
        })
      );
      console.log(`[PROJECTS API] Returning ${enhancedProjects.length} projects`);
      res.json(enhancedProjects);
    } catch (error) {
      console.error("[PROJECTS API] Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT DETAILS API] Processing request for project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        console.error("[PROJECT DETAILS API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT DETAILS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const project = await typeSafeStorage.getProject(projectId);
      if (!project) {
        console.error(`[PROJECT DETAILS API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DETAILS API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DETAILS API] User from organization ${reqUser.organizationId} not authorized to access project for client ${project.clientId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT DETAILS API] Client user ${reqUser.id} not authorized to access project for client ${project.clientId}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this project" });
        }
      }
      const clientWithUser = await typeSafeStorage.getClientWithUser(project.clientId);
      const enhancedProject = {
        ...project,
        client: clientWithUser ? {
          id: clientWithUser.client.id,
          user: {
            id: clientWithUser.user.id,
            name: clientWithUser.user.name,
            email: clientWithUser.user.email,
            username: clientWithUser.user.username,
            role: clientWithUser.user.role
          },
          companyName: clientWithUser.client.companyName,
          phone: clientWithUser.client.phone,
          address: clientWithUser.client.address
        } : {
          id: project.clientId,
          user: {
            id: 0,
            name: "Unknown",
            email: "",
            username: "",
            role: ""
          },
          companyName: ""
        }
      };
      console.log(`[PROJECT DETAILS API] Successfully retrieved project details for ID: ${projectId}`);
      res.json(enhancedProject);
    } catch (error) {
      console.error("[PROJECT DETAILS API] Error fetching project details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/projects/:id/phases", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT PHASES API] Processing request for phases of project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        console.error("[PROJECT PHASES API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const project = await typeSafeStorage.getProject(projectId);
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to access phases for project ${project.id}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this project's phases" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to access phases for project ${project.id}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this project's phases" });
        }
      }
      const phases = await typeSafeStorage.getProjectPhasesByProjectId(projectId);
      const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
      console.log(`[PROJECT PHASES API] Retrieved ${sortedPhases.length} phases for project ID: ${projectId}`);
      res.json(sortedPhases);
    } catch (error) {
      console.error("[PROJECT PHASES API] Error fetching project phases:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/projects/:id/documents", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT DOCUMENTS API] Processing request for documents of project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const project = await typeSafeStorage.getProject(projectId);
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to access documents for project ${project.id}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this project's documents" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to access documents for project ${project.id}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this project's documents" });
        }
      }
      const documents = await typeSafeStorage.getProjectDocumentsByProjectId(projectId);
      if (reqUser.role === "client" && reqUser.clientId === project.clientId) {
        const publicDocuments = documents.filter((doc) => doc.isPublic);
        console.log(`[PROJECT DOCUMENTS API] Client user: filtering ${documents.length} documents down to ${publicDocuments.length} public documents`);
        return res.json(publicDocuments);
      }
      console.log(`[PROJECT DOCUMENTS API] Retrieved ${documents.length} documents for project ID: ${projectId}`);
      res.json(documents);
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error fetching project documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/phases/:id/documents", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PHASE DOCUMENTS API] Processing request for documents of phase with ID: ${req.params.id}`);
      const phaseId = parseInt(req.params.id, 10);
      if (isNaN(phaseId)) {
        console.error("[PHASE DOCUMENTS API] Invalid phase ID:", req.params.id);
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PHASE DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const phase = await typeSafeStorage.getProjectPhase(phaseId);
      if (!phase) {
        console.error(`[PHASE DOCUMENTS API] Phase not found with ID: ${phaseId}`);
        return res.status(404).json({ error: "Phase not found" });
      }
      const project = await typeSafeStorage.getProject(phase.projectId);
      if (!project) {
        console.error(`[PHASE DOCUMENTS API] Project not found for phase ID: ${phaseId}`);
        return res.status(404).json({ error: "Project not found for this phase" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PHASE DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PHASE DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to access documents for phase ${phase.id}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to this phase's documents" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PHASE DOCUMENTS API] Client user ${reqUser.id} not authorized to access documents for phase ${phase.id}`);
          return res.status(403).json({ error: "Forbidden: You do not have access to this phase's documents" });
        }
      }
      const documents = await typeSafeStorage.getProjectDocumentsByPhaseId(phaseId);
      if (reqUser.role === "client" && reqUser.clientId === project.clientId) {
        const publicDocuments = documents.filter((doc) => doc.isPublic);
        console.log(`[PHASE DOCUMENTS API] Client user: filtering ${documents.length} documents down to ${publicDocuments.length} public documents`);
        return res.json(publicDocuments);
      }
      console.log(`[PHASE DOCUMENTS API] Retrieved ${documents.length} documents for phase ID: ${phaseId}`);
      res.json(documents);
    } catch (error) {
      console.error("[PHASE DOCUMENTS API] Error fetching phase documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/maintenances", isAuthenticated, async (req, res) => {
    try {
      console.log("\n[MAINTENANCES API] Processing request for maintenances list");
      const reqUser = req.user;
      const clientId = req.query.clientId ? parseInt(req.query.clientId, 10) : void 0;
      let maintenances2 = [];
      if (!reqUser) {
        console.error("[MAINTENANCES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      console.log(`[MAINTENANCES API] User role: ${reqUser.role}, Organization ID: ${reqUser.organizationId}, ClientID filter: ${clientId}`);
      if (reqUser.role === "system_admin") {
        console.log("[MAINTENANCES API] User is system admin");
        if (clientId) {
          console.log(`[MAINTENANCES API] Fetching maintenances for specific client ID: ${clientId}`);
          maintenances2 = await typeSafeStorage.getMaintenancesByClientId(clientId);
        } else {
          console.log("[MAINTENANCES API] Fetching all maintenances");
          maintenances2 = await typeSafeStorage.getAllMaintenances();
        }
      } else if (reqUser.organizationId) {
        console.log(`[MAINTENANCES API] Regular user with organization ID: ${reqUser.organizationId}`);
        if (clientId) {
          const client = await typeSafeStorage.getClient(clientId);
          if (client && client.organizationId === reqUser.organizationId) {
            console.log(`[MAINTENANCES API] Fetching maintenances for client ID: ${clientId} (verified in organization ${reqUser.organizationId})`);
            maintenances2 = await typeSafeStorage.getMaintenancesByClientId(clientId);
          } else {
            console.error(`[MAINTENANCES API] Client ID ${clientId} is not in user's organization`);
            return res.status(403).json({ error: "Access denied to this client's data" });
          }
        } else {
          console.log(`[MAINTENANCES API] Fetching maintenances for all clients in organization ${reqUser.organizationId}`);
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          const allMaintenances = await typeSafeStorage.getAllMaintenances();
          maintenances2 = allMaintenances.filter((maintenance) => clientIds.has(maintenance.clientId));
        }
      } else {
        console.error("[MAINTENANCES API] User has no organization ID:", reqUser);
        return res.status(400).json({
          error: "Invalid user data - missing organization"
        });
      }
      console.log(`[MAINTENANCES API] Retrieved ${maintenances2.length} maintenances`);
      const enhancedMaintenances = await Promise.all(
        maintenances2.map(async (maintenance) => {
          try {
            const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
            let technicianWithUser = null;
            if (maintenance.technicianId) {
              technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
            }
            return {
              ...maintenance,
              client: clientWithUser || {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: technicianWithUser ? {
                id: technicianWithUser.technician.id,
                userId: technicianWithUser.technician.userId,
                user: {
                  id: technicianWithUser.user.id,
                  name: technicianWithUser.user.name,
                  email: technicianWithUser.user.email
                }
              } : null
            };
          } catch (error) {
            console.error(`[MAINTENANCES API] Error enhancing maintenance ${maintenance.id}:`, error);
            return {
              ...maintenance,
              client: {
                client: { id: maintenance.clientId },
                user: { id: 0, name: "Unknown" }
              },
              technician: null
            };
          }
        })
      );
      console.log(`[MAINTENANCES API] Returning ${enhancedMaintenances.length} enhanced maintenances`);
      res.json(enhancedMaintenances);
    } catch (error) {
      console.error("[MAINTENANCES API] Error fetching maintenances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/maintenances/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[MAINTENANCE DETAILS API] Processing request for maintenance with ID: ${req.params.id}`);
      const maintenanceId = parseInt(req.params.id, 10);
      if (isNaN(maintenanceId)) {
        console.error("[MAINTENANCE DETAILS API] Invalid maintenance ID:", req.params.id);
        return res.status(400).json({ error: "Invalid maintenance ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[MAINTENANCE DETAILS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const maintenance = await typeSafeStorage.getMaintenance(maintenanceId);
      if (!maintenance) {
        console.error(`[MAINTENANCE DETAILS API] Maintenance not found with ID: ${maintenanceId}`);
        return res.status(404).json({ error: "Maintenance not found" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[MAINTENANCE DETAILS API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const client = await typeSafeStorage.getClient(maintenance.clientId);
          if (!client || client.organizationId !== reqUser.organizationId) {
            console.error(`[MAINTENANCE DETAILS API] Client ID ${maintenance.clientId} is not in user's organization`);
            return res.status(403).json({ error: "Access denied to this maintenance" });
          }
        } else {
          console.error("[MAINTENANCE DETAILS API] User has no organization ID:", reqUser);
          return res.status(400).json({
            error: "Invalid user data - missing organization"
          });
        }
      }
      try {
        const clientWithUser = await typeSafeStorage.getClientWithUser(maintenance.clientId);
        let technicianWithUser = null;
        if (maintenance.technicianId) {
          technicianWithUser = await typeSafeStorage.getTechnicianWithUser(maintenance.technicianId);
        }
        const enhancedMaintenance = {
          ...maintenance,
          client: clientWithUser || {
            client: { id: maintenance.clientId },
            user: { id: 0, name: "Unknown" }
          },
          technician: technicianWithUser ? {
            id: technicianWithUser.technician.id,
            userId: technicianWithUser.technician.userId,
            user: {
              id: technicianWithUser.user.id,
              name: technicianWithUser.user.name,
              email: technicianWithUser.user.email
            }
          } : null
        };
        console.log(`[MAINTENANCE DETAILS API] Returning enhanced maintenance data for ID: ${maintenanceId}`);
        res.json(enhancedMaintenance);
      } catch (error) {
        console.error(`[MAINTENANCE DETAILS API] Error enhancing maintenance ${maintenanceId}:`, error);
        res.json({
          ...maintenance,
          client: {
            client: { id: maintenance.clientId },
            user: { id: 0, name: "Unknown" }
          },
          technician: null
        });
      }
    } catch (error) {
      console.error("[MAINTENANCE DETAILS API] Error fetching maintenance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/maintenances", isAuthenticated, async (req, res) => {
    try {
      console.log("\n[CREATE MAINTENANCE API] Processing request to create new maintenance");
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[CREATE MAINTENANCE API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { clientId } = req.body;
      if (!clientId) {
        console.error("[CREATE MAINTENANCE API] Missing required field: clientId");
        return res.status(400).json({ error: "Client ID is required" });
      }
      const client = await typeSafeStorage.getClient(clientId);
      if (!client) {
        console.error(`[CREATE MAINTENANCE API] Client not found with ID: ${clientId}`);
        return res.status(404).json({ error: "Client not found" });
      }
      if (reqUser.role !== "system_admin" && (!reqUser.organizationId || reqUser.organizationId !== client.organizationId)) {
        console.error(`[CREATE MAINTENANCE API] User does not have permission to create maintenance for client ${clientId}`);
        return res.status(403).json({ error: "You do not have permission to create maintenance for this client" });
      }
      console.log(`[CREATE MAINTENANCE API] Creating maintenance for client ID: ${clientId}`);
      const newMaintenance = await typeSafeStorage.createMaintenance(req.body);
      console.log(`[CREATE MAINTENANCE API] Successfully created maintenance with ID: ${newMaintenance.id}`);
      res.status(201).json(newMaintenance);
    } catch (error) {
      console.error("[CREATE MAINTENANCE API] Error creating maintenance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/maintenances/:id/technician", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[UPDATE MAINTENANCE TECHNICIAN API] Processing request to update technician for maintenance with ID: ${req.params.id}`);
      const maintenanceId = parseInt(req.params.id, 10);
      if (isNaN(maintenanceId)) {
        console.error("[UPDATE MAINTENANCE TECHNICIAN API] Invalid maintenance ID:", req.params.id);
        return res.status(400).json({ error: "Invalid maintenance ID" });
      }
      const { technicianId } = req.body;
      if (technicianId !== null && (typeof technicianId !== "number" || isNaN(technicianId))) {
        console.error("[UPDATE MAINTENANCE TECHNICIAN API] Invalid technician ID format:", technicianId);
        return res.status(400).json({ error: "Invalid technician ID format" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[UPDATE MAINTENANCE TECHNICIAN API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const maintenance = await typeSafeStorage.getMaintenance(maintenanceId);
      if (!maintenance) {
        console.error(`[UPDATE MAINTENANCE TECHNICIAN API] Maintenance not found with ID: ${maintenanceId}`);
        return res.status(404).json({ error: "Maintenance not found" });
      }
      if (reqUser.role !== "system_admin") {
        const client = await typeSafeStorage.getClient(maintenance.clientId);
        if (!client || !reqUser.organizationId || client.organizationId !== reqUser.organizationId) {
          console.error(`[UPDATE MAINTENANCE TECHNICIAN API] User does not have permission to update maintenance ${maintenanceId}`);
          return res.status(403).json({ error: "You do not have permission to update this maintenance" });
        }
      }
      console.log(`[UPDATE MAINTENANCE TECHNICIAN API] Updating technician for maintenance ID: ${maintenanceId} to technician ID: ${technicianId}`);
      const updatedMaintenance = await typeSafeStorage.updateMaintenance(maintenanceId, { technicianId });
      if (!updatedMaintenance) {
        console.error(`[UPDATE MAINTENANCE TECHNICIAN API] Failed to update technician for maintenance with ID: ${maintenanceId}`);
        return res.status(500).json({ error: "Failed to update maintenance technician" });
      }
      console.log(`[UPDATE MAINTENANCE TECHNICIAN API] Successfully updated technician for maintenance with ID: ${maintenanceId}`);
      res.json(updatedMaintenance);
    } catch (error) {
      console.error("[UPDATE MAINTENANCE TECHNICIAN API] Error updating maintenance technician:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.patch("/api/maintenances/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[UPDATE MAINTENANCE API] Processing request to update maintenance with ID: ${req.params.id}`);
      const maintenanceId = parseInt(req.params.id, 10);
      if (isNaN(maintenanceId)) {
        console.error("[UPDATE MAINTENANCE API] Invalid maintenance ID:", req.params.id);
        return res.status(400).json({ error: "Invalid maintenance ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[UPDATE MAINTENANCE API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const maintenance = await typeSafeStorage.getMaintenance(maintenanceId);
      if (!maintenance) {
        console.error(`[UPDATE MAINTENANCE API] Maintenance not found with ID: ${maintenanceId}`);
        return res.status(404).json({ error: "Maintenance not found" });
      }
      if (reqUser.role !== "system_admin") {
        const client = await typeSafeStorage.getClient(maintenance.clientId);
        if (!client || !reqUser.organizationId || client.organizationId !== reqUser.organizationId) {
          console.error(`[UPDATE MAINTENANCE API] User does not have permission to update maintenance ${maintenanceId}`);
          return res.status(403).json({ error: "You do not have permission to update this maintenance" });
        }
      }
      console.log(`[UPDATE MAINTENANCE API] Updating maintenance ID: ${maintenanceId}`);
      const updatedMaintenance = await typeSafeStorage.updateMaintenance(maintenanceId, req.body);
      if (!updatedMaintenance) {
        console.error(`[UPDATE MAINTENANCE API] Failed to update maintenance with ID: ${maintenanceId}`);
        return res.status(500).json({ error: "Failed to update maintenance" });
      }
      console.log(`[UPDATE MAINTENANCE API] Successfully updated maintenance with ID: ${maintenanceId}`);
      res.json(updatedMaintenance);
    } catch (error) {
      console.error("[UPDATE MAINTENANCE API] Error updating maintenance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/projects/:id/phases", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT PHASES API] Processing request to create phase for project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        console.error("[PROJECT PHASES API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const project = await typeSafeStorage.getProject(projectId);
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to create phases for project ${projectId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to create phases for this project" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to create phases for project ${projectId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot create project phases" });
        }
      }
      const phaseData = {
        ...req.body,
        projectId
      };
      console.log(`[PROJECT PHASES API] Creating new phase for project ${projectId}:`, phaseData);
      const newPhase = await typeSafeStorage.createProjectPhase(phaseData);
      console.log(`[PROJECT PHASES API] Phase created successfully with ID: ${newPhase.id}`);
      res.status(201).json(newPhase);
    } catch (error) {
      console.error("[PROJECT PHASES API] Error creating project phase:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/projects/phases/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT PHASES API] Processing request to update phase with ID: ${req.params.id}`);
      const phaseId = parseInt(req.params.id, 10);
      if (isNaN(phaseId)) {
        console.error("[PROJECT PHASES API] Invalid phase ID:", req.params.id);
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const phase = await typeSafeStorage.getProjectPhase(phaseId);
      if (!phase) {
        console.error(`[PROJECT PHASES API] Phase not found with ID: ${phaseId}`);
        return res.status(404).json({ error: "Phase not found" });
      }
      const project = await typeSafeStorage.getProject(phase.projectId);
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found for phase ID: ${phaseId}`);
        return res.status(404).json({ error: "Project not found for this phase" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to update phase ${phaseId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to update this phase" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to update phase ${phaseId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot update project phases" });
        }
      }
      console.log(`[PROJECT PHASES API] Updating phase ${phaseId} with data:`, req.body);
      const updatedPhase = await typeSafeStorage.updateProjectPhase(phaseId, req.body);
      if (!updatedPhase) {
        console.error(`[PROJECT PHASES API] Failed to update phase ${phaseId}`);
        return res.status(500).json({ error: "Failed to update phase" });
      }
      console.log(`[PROJECT PHASES API] Phase ${phaseId} updated successfully`);
      res.json(updatedPhase);
    } catch (error) {
      console.error("[PROJECT PHASES API] Error updating project phase:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/projects/phases/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT PHASES API] Processing request to delete phase with ID: ${req.params.id}`);
      const phaseId = parseInt(req.params.id, 10);
      if (isNaN(phaseId)) {
        console.error("[PROJECT PHASES API] Invalid phase ID:", req.params.id);
        return res.status(400).json({ error: "Invalid phase ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT PHASES API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const phase = await typeSafeStorage.getProjectPhase(phaseId);
      if (!phase) {
        console.error(`[PROJECT PHASES API] Phase not found with ID: ${phaseId}`);
        return res.status(404).json({ error: "Phase not found" });
      }
      const project = await typeSafeStorage.getProject(phase.projectId);
      if (!project) {
        console.error(`[PROJECT PHASES API] Project not found for phase ID: ${phaseId}`);
        return res.status(404).json({ error: "Project not found for this phase" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT PHASES API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT PHASES API] User from organization ${reqUser.organizationId} not authorized to delete phase ${phaseId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to delete this phase" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT PHASES API] Client user ${reqUser.id} not authorized to delete phase ${phaseId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot delete project phases" });
        }
      }
      console.log(`[PROJECT PHASES API] Deleting phase ${phaseId}`);
      const success = await typeSafeStorage.deleteProjectPhase(phaseId);
      if (!success) {
        console.error(`[PROJECT PHASES API] Failed to delete phase ${phaseId}`);
        return res.status(500).json({ error: "Failed to delete phase" });
      }
      console.log(`[PROJECT PHASES API] Phase ${phaseId} deleted successfully`);
      res.status(204).send();
    } catch (error) {
      console.error("[PROJECT PHASES API] Error deleting project phase:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/projects/:id/documents", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT DOCUMENTS API] Processing request to create document for project with ID: ${req.params.id}`);
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid project ID:", req.params.id);
        return res.status(400).json({ error: "Invalid project ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const project = await typeSafeStorage.getProject(projectId);
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found with ID: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to create documents for project ${projectId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to create documents for this project" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to create documents for project ${projectId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot create project documents" });
        }
      }
      const documentData = {
        ...req.body,
        projectId,
        uploadedBy: reqUser.id,
        uploadDate: /* @__PURE__ */ new Date()
      };
      console.log(`[PROJECT DOCUMENTS API] Creating new document for project ${projectId}:`, documentData);
      const newDocument = await typeSafeStorage.createProjectDocument(documentData);
      console.log(`[PROJECT DOCUMENTS API] Document created successfully with ID: ${newDocument.id}`);
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error creating project document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/projects/documents/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT DOCUMENTS API] Processing request to update document with ID: ${req.params.id}`);
      const documentId = parseInt(req.params.id, 10);
      if (isNaN(documentId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid document ID:", req.params.id);
        return res.status(400).json({ error: "Invalid document ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const document = await typeSafeStorage.getProjectDocument(documentId);
      if (!document) {
        console.error(`[PROJECT DOCUMENTS API] Document not found with ID: ${documentId}`);
        return res.status(404).json({ error: "Document not found" });
      }
      const project = await typeSafeStorage.getProject(document.projectId);
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found for document ID: ${documentId}`);
        return res.status(404).json({ error: "Project not found for this document" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to update document ${documentId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to update this document" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to update document ${documentId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot update project documents" });
        }
      }
      const { uploadedBy, uploadDate, projectId, ...updateData } = req.body;
      console.log(`[PROJECT DOCUMENTS API] Updating document ${documentId} with data:`, updateData);
      const updatedDocument = await typeSafeStorage.updateProjectDocument(documentId, updateData);
      if (!updatedDocument) {
        console.error(`[PROJECT DOCUMENTS API] Failed to update document ${documentId}`);
        return res.status(500).json({ error: "Failed to update document" });
      }
      console.log(`[PROJECT DOCUMENTS API] Document ${documentId} updated successfully`);
      res.json(updatedDocument);
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error updating project document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/projects/documents/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`
[PROJECT DOCUMENTS API] Processing request to delete document with ID: ${req.params.id}`);
      const documentId = parseInt(req.params.id, 10);
      if (isNaN(documentId)) {
        console.error("[PROJECT DOCUMENTS API] Invalid document ID:", req.params.id);
        return res.status(400).json({ error: "Invalid document ID" });
      }
      const reqUser = req.user;
      if (!reqUser) {
        console.error("[PROJECT DOCUMENTS API] No user found in request");
        return res.status(401).json({ error: "Unauthorized" });
      }
      const document = await typeSafeStorage.getProjectDocument(documentId);
      if (!document) {
        console.error(`[PROJECT DOCUMENTS API] Document not found with ID: ${documentId}`);
        return res.status(404).json({ error: "Document not found" });
      }
      const project = await typeSafeStorage.getProject(document.projectId);
      if (!project) {
        console.error(`[PROJECT DOCUMENTS API] Project not found for document ID: ${documentId}`);
        return res.status(404).json({ error: "Project not found for this document" });
      }
      if (reqUser.role !== "system_admin") {
        console.log(`[PROJECT DOCUMENTS API] Checking authorization for user with role ${reqUser.role}`);
        if (reqUser.organizationId) {
          const clients2 = await typeSafeStorage.getClientsByOrganizationId(reqUser.organizationId);
          const clientIds = new Set(clients2.map((client) => client.id));
          if (!clientIds.has(project.clientId)) {
            console.error(`[PROJECT DOCUMENTS API] User from organization ${reqUser.organizationId} not authorized to delete document ${documentId}`);
            return res.status(403).json({ error: "Forbidden: You do not have access to delete this document" });
          }
        } else if (reqUser.clientId !== project.clientId) {
          console.error(`[PROJECT DOCUMENTS API] Client user ${reqUser.id} not authorized to delete document ${documentId}`);
          return res.status(403).json({ error: "Forbidden: Client users cannot delete project documents" });
        }
      }
      console.log(`[PROJECT DOCUMENTS API] Deleting document ${documentId}`);
      const success = await typeSafeStorage.deleteProjectDocument(documentId);
      if (!success) {
        console.error(`[PROJECT DOCUMENTS API] Failed to delete document ${documentId}`);
        return res.status(500).json({ error: "Failed to delete document" });
      }
      console.log(`[PROJECT DOCUMENTS API] Document ${documentId} deleted successfully`);
      res.status(204).send();
    } catch (error) {
      console.error("[PROJECT DOCUMENTS API] Error deleting project document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/google-maps-key", (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
      if (!apiKey) {
        console.warn("GoogleMapsContext: API key not found in environment variables");
      } else {
        console.log(`GoogleMapsContext: API key loaded: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
      }
      return res.json({ apiKey });
    } catch (error) {
      console.error("Error serving Google Maps API key:", error);
      return res.status(500).json({ error: "Failed to retrieve Google Maps API key" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express4 from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express4.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/scheduler.ts
var Scheduler = class {
  storage;
  scheduledTasks = [];
  constructor(storage2) {
    this.storage = storage2;
  }
  /**
   * Initialize the scheduler and start all scheduled tasks
   */
  initialize() {
    this.rescheduleIncompleteMaintenances().then(() => {
      log("Scheduler: Completed immediate rescheduling of incomplete maintenances at startup", "scheduler");
    }).catch((error) => {
      log(`Scheduler: Error during startup rescheduling: ${error}`, "scheduler");
    });
    this.startRescheduleIncompleteMaintenancesJob();
    log("Scheduler initialized", "scheduler");
  }
  /**
   * Schedule the job to run at midnight to reschedule incomplete maintenances
   */
  startRescheduleIncompleteMaintenancesJob() {
    const now = /* @__PURE__ */ new Date();
    const midnight = /* @__PURE__ */ new Date();
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    const timeoutId = setTimeout(async () => {
      await this.rescheduleIncompleteMaintenances();
      const dailyInterval = setInterval(async () => {
        await this.rescheduleIncompleteMaintenances();
      }, 24 * 60 * 60 * 1e3);
      this.scheduledTasks.push(dailyInterval);
    }, timeUntilMidnight);
    this.scheduledTasks.push(timeoutId);
    log(`Scheduler: Incomplete maintenance rescheduling job scheduled to run in ${Math.floor(timeUntilMidnight / 6e4)} minutes`, "scheduler");
  }
  /**
   * Reschedule all incomplete maintenances from past days to today
   */
  async rescheduleIncompleteMaintenances() {
    try {
      log("Scheduler: Running incomplete maintenance rescheduling job", "scheduler");
      const rescheduledMaintenances = await this.storage.rescheduleIncompleteMaintenances();
      log(`Scheduler: Successfully rescheduled ${rescheduledMaintenances.length} incomplete maintenances`, "scheduler");
    } catch (error) {
      log(`Scheduler: Error rescheduling incomplete maintenances: ${error}`, "scheduler");
    }
  }
  /**
   * Stop all scheduled tasks
   */
  stop() {
    this.scheduledTasks.forEach((task) => clearTimeout(task));
    this.scheduledTasks = [];
    log("Scheduler stopped", "scheduler");
  }
};

// server/index.ts
import session from "express-session";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";

// server/email-config.ts
function getDefaultEmailCredentials() {
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider) {
    console.log("No email provider configured. Email functionality will be disabled.");
    return null;
  }
  const credentials = {
    provider,
    user: process.env.EMAIL_USER || ""
  };
  switch (provider) {
    case "gmail":
      credentials.clientId = process.env.GMAIL_CLIENT_ID;
      credentials.clientSecret = process.env.GMAIL_CLIENT_SECRET;
      credentials.refreshToken = process.env.GMAIL_REFRESH_TOKEN;
      break;
    case "smtp":
      credentials.host = process.env.SMTP_HOST;
      credentials.port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : void 0;
      credentials.secure = process.env.SMTP_SECURE === "true";
      credentials.password = process.env.SMTP_PASSWORD;
      break;
    default:
      console.warn(`Unsupported email provider: ${provider}`);
      return null;
  }
  return credentials;
}
var emailTemplates = {
  userInvitation: {
    subject: "Invitation to Join Smart Water Pools",
    text: (name, company, inviteLink, role) => `
Hello ${name},

You have been invited to join ${company} on the Smart Water Pools platform.
You have been invited as a ${role}.

Please click the link below to create your account:

${inviteLink}

This invitation link will expire in 7 days.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name, company, inviteLink, role) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invitation to Join Smart Water Pools</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .button { display: inline-block; background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Invited!</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You have been invited to join <strong>${company}</strong> on the Smart Water Pools platform as a <strong>${role}</strong>.</p>
      <p>Please click the button below to create your account:</p>
      <p style="text-align: center;">
        <a href="${inviteLink}" class="button">Accept Invitation</a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${inviteLink}</p>
      <p>This invitation link will expire in 7 days.</p>
    </div>
    <div class="footer">
      <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  passwordReset: {
    subject: "Reset Your Password - Smart Water Pools",
    text: (name, resetLink) => `
Hello ${name},

You recently requested to reset your password for your Smart Water Pools account.
Please click the link below to reset your password:

${resetLink}

If you did not request a password reset, please ignore this email or contact support if you have concerns.

This password reset link will expire in 24 hours.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name, resetLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .button { display: inline-block; background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>You recently requested to reset your password for your Smart Water Pools account.</p>
      <p>Please click the button below to reset your password:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${resetLink}</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>This password reset link will expire in 24 hours.</p>
    </div>
    <div class="footer">
      <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  twoFactorAuth: {
    subject: "Your Verification Code - Smart Water Pools",
    text: (name, code) => `
Hello ${name},

Your verification code for Smart Water Pools is:

${code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email or contact support if you have concerns.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name, code) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Verification Code</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .code { font-size: 24px; letter-spacing: 5px; text-align: center; margin: 20px 0; font-weight: bold; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Verification Code</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Your verification code for Smart Water Pools is:</p>
      <div class="code">${code}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this code, please ignore this email or contact support if you have concerns.</p>
    </div>
    <div class="footer">
      <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  newUser: {
    subject: "Welcome to Smart Water Pools - Your Account Details",
    text: (name, username, password) => `
Hello ${name},

Your Smart Water Pools account has been created. Here are your account details:

Username: ${username}
Temporary Password: ${password}

Please log in at ${process.env.APP_URL || ""} and change your password as soon as possible.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name, username, password) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Smart Water Pools</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .credentials { background-color: #e0f2fe; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .button { display: inline-block; background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Smart Water Pools</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>Your Smart Water Pools account has been created. Here are your account details:</p>
      <div class="credentials">
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
      </div>
      <p style="text-align: center;">
        <a href="${process.env.APP_URL || ""}" class="button">Login to Your Account</a>
      </p>
      <p>Please log in and change your password as soon as possible.</p>
    </div>
    <div class="footer">
      <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },
  serviceReminder: {
    subject: "Your Upcoming Pool Service Appointment",
    text: (name, serviceDate, serviceType) => `
Hello ${name},

This is a reminder about your upcoming pool service appointment:

Date: ${serviceDate}
Service: ${serviceType}

If you need to reschedule, please contact us as soon as possible.

Thank you,
Smart Water Pools Team
    `.trim(),
    html: (name, serviceDate, serviceType) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Upcoming Pool Service Appointment</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0284c7; color: white; padding: 15px; text-align: center; }
    .content { padding: 20px; background-color: #f9fafb; }
    .appointment { background-color: #e0f2fe; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { padding: 15px; text-align: center; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Pool Service Appointment</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>This is a reminder about your upcoming pool service appointment:</p>
      <div class="appointment">
        <p><strong>Date:</strong> ${serviceDate}</p>
        <p><strong>Service:</strong> ${serviceType}</p>
      </div>
      <p>If you need to reschedule, please contact us as soon as possible.</p>
    </div>
    <div class="footer">
      <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Smart Water Pools. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
};

// server/gmail-service.ts
var isDevelopment = process.env.NODE_ENV !== "production";
var googleapisModule = null;
var nodemailerModule = null;
var packagesAvailable = false;
var packagesChecked = false;
async function checkPackages() {
  if (packagesChecked) return packagesAvailable;
  try {
    googleapisModule = await import("googleapis");
    nodemailerModule = await import("nodemailer");
    packagesAvailable = true;
    packagesChecked = true;
    console.log("Gmail service packages (googleapis and nodemailer) are available");
    return true;
  } catch (error) {
    packagesChecked = true;
    console.warn("googleapis or nodemailer packages are not available:", error);
    return false;
  }
}
var GmailService = class {
  credentials;
  oauth2Client = null;
  // Will be googleapis.Auth.OAuth2Client
  gmailTransporter = null;
  // Will be nodemailer.Transporter
  /**
   * Initialize the Gmail service with credentials
   */
  constructor(credentials) {
    this.credentials = credentials;
    console.log("Gmail service initialized with credentials for:", credentials.user);
    checkPackages().then((available) => {
      if (!available) {
        console.warn("Gmail service initialized in limited mode - required packages not available");
        console.warn("To enable full Gmail functionality, please install:");
        console.warn("  npm install googleapis nodemailer");
      }
    });
  }
  /**
   * Set up the OAuth2 client and Gmail transporter
   */
  async setupGmailTransport() {
    try {
      if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
        console.error("Missing required Gmail API credentials (clientId, clientSecret, or refreshToken)");
        console.log("ClientId present:", !!this.credentials.clientId);
        console.log("ClientSecret present:", !!this.credentials.clientSecret);
        console.log("RefreshToken present:", !!this.credentials.refreshToken);
        return isDevelopment;
      }
      console.log("----------------------------------------");
      console.log(`[EMAIL SETUP] Setting up Gmail transport with OAuth2 for: ${this.credentials.user}`);
      const packagesReady = await checkPackages();
      if (packagesReady) {
        try {
          const { google } = googleapisModule;
          const OAuth2 = google.auth.OAuth2;
          this.oauth2Client = new OAuth2(
            this.credentials.clientId,
            this.credentials.clientSecret,
            "https://developers.google.com/oauthplayground"
            // Redirect URL
          );
          this.oauth2Client.setCredentials({
            refresh_token: this.credentials.refreshToken
          });
          const accessToken = await this.oauth2Client.getAccessToken();
          this.gmailTransporter = nodemailerModule.createTransport({
            service: "gmail",
            auth: {
              type: "OAuth2",
              user: this.credentials.user,
              clientId: this.credentials.clientId,
              clientSecret: this.credentials.clientSecret,
              refreshToken: this.credentials.refreshToken,
              accessToken: accessToken?.token || ""
            }
          });
          console.log("Gmail transporter created successfully");
          return true;
        } catch (error) {
          console.error("Error setting up Gmail OAuth2 client and transporter:", error);
          return isDevelopment;
        }
      } else {
        console.log("PACKAGES NOT AVAILABLE: This is a simulated setup. To enable actual setup:");
        console.log('1. Install required packages: "npm install googleapis nodemailer"');
        console.log("2. Restart the server");
        console.log("----------------------------------------");
        return isDevelopment;
      }
    } catch (error) {
      console.error("Error setting up Gmail transport:", error);
      return isDevelopment;
    }
  }
  /**
   * Send an email using Gmail
   */
  async sendEmail(options) {
    try {
      if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
        console.error("Missing required Gmail API credentials (clientId, clientSecret, or refreshToken)");
        return isDevelopment;
      }
      console.log("----------------------------------------");
      console.log(`[EMAIL] Using configured Gmail credentials for: ${this.credentials.user}`);
      console.log(`Email to: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body (truncated): ${options.text.substring(0, 100)}...`);
      const packagesReady = await checkPackages();
      if (packagesReady) {
        if (!this.gmailTransporter) {
          const setupSuccess = await this.setupGmailTransport();
          if (!setupSuccess) {
            console.error("Failed to set up Gmail transport");
            return isDevelopment;
          }
        }
        try {
          const mailOptions = {
            from: this.credentials.user,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html || void 0,
            cc: options.cc?.length ? options.cc.join(",") : void 0,
            bcc: options.bcc?.length ? options.bcc.join(",") : void 0,
            attachments: options.attachments
          };
          const result = await this.gmailTransporter.sendMail(mailOptions);
          console.log(`Email sent successfully: ${result.messageId}`);
          console.log("----------------------------------------");
          return true;
        } catch (error) {
          console.error("Error sending email with nodemailer:", error);
          if (isDevelopment) {
            console.log("DEVELOPMENT MODE: Simulating successful email send despite error");
            return true;
          }
          return false;
        }
      } else {
        console.log("PACKAGES NOT AVAILABLE: This is a simulated success. To enable actual sending:");
        console.log('1. Install required packages: "npm install googleapis nodemailer"');
        console.log("2. Restart the server");
        console.log("----------------------------------------");
        return isDevelopment;
      }
    } catch (error) {
      console.error("Error sending email:", error);
      return isDevelopment;
    }
  }
  /**
   * Check if Gmail API connection is working
   */
  async testConnection() {
    try {
      if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
        console.error("Missing required Gmail API credentials (clientId, clientSecret, or refreshToken)");
        console.log("ClientId present:", !!this.credentials.clientId);
        console.log("ClientSecret present:", !!this.credentials.clientSecret);
        console.log("RefreshToken present:", !!this.credentials.refreshToken);
        return isDevelopment;
      }
      console.log("----------------------------------------");
      console.log(`[EMAIL TEST] Testing Gmail connection with credentials for: ${this.credentials.user}`);
      console.log(`ClientId: ${this.credentials.clientId?.substring(0, 5)}...`);
      console.log(`ClientSecret: ${this.credentials.clientSecret ? "[PROVIDED]" : "[MISSING]"}`);
      console.log(`RefreshToken: ${this.credentials.refreshToken ? "[PROVIDED]" : "[MISSING]"}`);
      const packagesReady = await checkPackages();
      if (packagesReady) {
        try {
          const { google } = googleapisModule;
          const OAuth2 = google.auth.OAuth2;
          const oauth2Client = new OAuth2(
            this.credentials.clientId,
            this.credentials.clientSecret,
            "https://developers.google.com/oauthplayground"
            // Redirect URL
          );
          oauth2Client.setCredentials({
            refresh_token: this.credentials.refreshToken
          });
          const accessToken = await oauth2Client.getAccessToken();
          if (accessToken && accessToken.token) {
            console.log("Successfully obtained access token from refresh token");
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });
            const profile = await gmail.users.getProfile({ userId: "me" });
            if (profile && profile.data) {
              console.log(`Successfully connected to Gmail API for: ${profile.data.emailAddress}`);
              console.log("----------------------------------------");
              return true;
            }
          }
          console.warn("Failed to validate Gmail API connection");
          return false;
        } catch (error) {
          console.error("Error testing Gmail API connection:", error);
          if (isDevelopment) {
            console.log("DEVELOPMENT MODE: Simulating successful connection test despite error");
            return true;
          }
          return false;
        }
      } else {
        console.log("PACKAGES NOT AVAILABLE: This is a simulated success. To enable actual testing:");
        console.log('1. Install required packages: "npm install googleapis nodemailer"');
        console.log("2. Restart the server");
        console.log("----------------------------------------");
        return isDevelopment;
      }
    } catch (error) {
      console.error("Error testing Gmail connection:", error);
      return isDevelopment;
    }
  }
};
function createGmailService(credentials) {
  if (credentials.provider !== "gmail") {
    console.error("Invalid provider for Gmail service:", credentials.provider);
    return null;
  }
  return new GmailService(credentials);
}

// server/email-service.ts
var PASSWORD_RESET_EXPIRY_HOURS = 24;
var tokenStore = [];
var EmailService = class {
  credentials = null;
  gmailService = null;
  /**
   * Initialize the email service with credentials
   */
  constructor(credentials) {
    if (credentials) {
      this.setCredentials(credentials);
    } else {
      const defaultCredentials = getDefaultEmailCredentials();
      if (defaultCredentials) {
        this.setCredentials(defaultCredentials);
      }
    }
  }
  /**
   * Set credentials and initialize the appropriate email service
   */
  setCredentials(credentials) {
    this.credentials = credentials;
    if (credentials.provider === "gmail") {
      this.gmailService = createGmailService(credentials);
      console.log("Gmail API service initialized for:", credentials.user);
    } else {
      console.log(`${credentials.provider} email service initialized for:`, credentials.user);
    }
  }
  /**
   * Check if credentials are configured
   */
  hasCredentials() {
    return !!this.credentials;
  }
  /**
   * Test the email connection
   */
  async testConnection() {
    if (!this.credentials) {
      console.error("Email credentials not configured");
      return false;
    }
    if (this.credentials.provider === "gmail" && this.gmailService) {
      return await this.gmailService.testConnection();
    }
    console.warn("No email service configured for provider:", this.credentials.provider);
    return false;
  }
  /**
   * Generate a random token for password reset or 2FA
   */
  generateToken(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  /**
   * Store a token in the token store
   */
  storeToken(userId, email, type) {
    const token = this.generateToken();
    const expires = /* @__PURE__ */ new Date();
    expires.setHours(expires.getHours() + PASSWORD_RESET_EXPIRY_HOURS);
    const existingIndex = tokenStore.findIndex((t) => t.userId === userId && t.type === type);
    if (existingIndex !== -1) {
      tokenStore.splice(existingIndex, 1);
    }
    tokenStore.push({
      token,
      userId,
      email,
      expires,
      used: false,
      type
    });
    return token;
  }
  /**
   * Verify a token from the token store
   */
  verifyToken(token, type) {
    const now = /* @__PURE__ */ new Date();
    const record = tokenStore.find(
      (t) => t.token === token && t.type === type && !t.used && t.expires > now
    );
    if (record) {
      record.used = true;
      return record.userId;
    }
    return null;
  }
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user) {
    const isDevelopment2 = process.env.NODE_ENV !== "production";
    if (!this.credentials) {
      console.error("Email credentials not configured");
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Continuing without email credentials");
      } else {
        return false;
      }
    }
    if (!user.email) {
      console.error("User email not provided");
      return false;
    }
    try {
      const token = this.storeToken(user.id, user.email, "password-reset");
      let baseUrl = "https://smartwaterpools.replit.app";
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      } else if (process.env.NODE_ENV !== "production") {
        baseUrl = "http://localhost:5000";
        console.log("Using localhost URL for password reset in development");
      }
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const resetLink = `${baseUrl}/reset-password?token=${token}`;
      console.log("Generated password reset link:", resetLink);
      const userName = user.name || user.username;
      const emailOptions = {
        to: user.email,
        subject: emailTemplates.passwordReset.subject,
        text: emailTemplates.passwordReset.text(userName, resetLink),
        html: emailTemplates.passwordReset.html(userName, resetLink)
      };
      if (this.credentials?.provider === "gmail" && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] Password reset email would be sent to ${user.email}`);
        console.log(`Reset link: ${resetLink}`);
        console.log(`----------------------------------------`);
        return isDevelopment2 ? true : false;
      }
    } catch (error) {
      console.error("Error sending password reset email:", error);
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Simulating successful email sending despite error");
        return true;
      }
      return false;
    }
  }
  /**
   * Send 2FA verification code
   */
  async send2FACode(user) {
    const isDevelopment2 = process.env.NODE_ENV !== "production";
    if (!this.credentials) {
      console.error("Email credentials not configured");
      if (!isDevelopment2) {
        return null;
      }
      console.log("DEVELOPMENT MODE: Continuing without email credentials");
    }
    if (!user.email) {
      console.error("User email not provided");
      return null;
    }
    try {
      const code = Math.floor(1e5 + Math.random() * 9e5).toString();
      const userName = user.name || user.username;
      const emailOptions = {
        to: user.email,
        subject: emailTemplates.twoFactorAuth.subject,
        text: emailTemplates.twoFactorAuth.text(userName, code),
        html: emailTemplates.twoFactorAuth.html(userName, code)
      };
      if (this.credentials?.provider === "gmail" && this.gmailService) {
        const sent = await this.gmailService.sendEmail(emailOptions);
        if (!sent) {
          console.error("Failed to send 2FA code email");
          if (!isDevelopment2) {
            return null;
          }
        }
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] 2FA verification code would be sent to ${user.email}`);
        console.log(`Verification code: ${code}`);
        console.log(`----------------------------------------`);
      }
      return code;
    } catch (error) {
      console.error("Error sending 2FA code:", error);
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Simulating successful 2FA email despite error");
        const fallbackCode = "123456";
        return fallbackCode;
      }
      return null;
    }
  }
  /**
   * Send user creation notification
   */
  async sendUserCreationEmail(user, temporaryPassword) {
    const isDevelopment2 = process.env.NODE_ENV !== "production";
    if (!this.credentials) {
      console.error("Email credentials not configured");
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Continuing without email credentials");
      } else {
        return false;
      }
    }
    if (!user.email) {
      console.error("User email not provided");
      return false;
    }
    try {
      const userName = user.name || user.username;
      const emailOptions = {
        to: user.email,
        subject: emailTemplates.newUser.subject,
        text: emailTemplates.newUser.text(userName, user.username, temporaryPassword),
        html: emailTemplates.newUser.html(userName, user.username, temporaryPassword)
      };
      if (this.credentials?.provider === "gmail" && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] New user account email would be sent to ${user.email}`);
        console.log(`Username: ${user.username}`);
        console.log(`Temporary password: ${temporaryPassword}`);
        console.log(`----------------------------------------`);
        return isDevelopment2 ? true : false;
      }
    } catch (error) {
      console.error("Error sending user creation email:", error);
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Simulating successful email sending despite error");
        return true;
      }
      return false;
    }
  }
  /**
   * Send service reminder to client
   */
  async sendServiceReminder(client, serviceDate, serviceType) {
    const isDevelopment2 = process.env.NODE_ENV !== "production";
    if (!this.credentials) {
      console.error("Email credentials not configured");
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Continuing without email credentials");
      } else {
        return false;
      }
    }
    try {
      const user = await db.query.users.findFirst({
        where: (users2, { eq: eq2 }) => eq2(users2.id, client.userId)
      });
      if (!user || !user.email) {
        console.error("Client user email not found");
        return false;
      }
      const formattedDate = serviceDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const userName = user.name || user.username;
      const emailOptions = {
        to: user.email,
        subject: emailTemplates.serviceReminder.subject,
        text: emailTemplates.serviceReminder.text(userName, formattedDate, serviceType),
        html: emailTemplates.serviceReminder.html(userName, formattedDate, serviceType)
      };
      if (this.credentials?.provider === "gmail" && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] Service reminder would be sent to ${user.email}`);
        console.log(`Service: ${serviceType} on ${formattedDate}`);
        console.log(`----------------------------------------`);
        return isDevelopment2 ? true : false;
      }
    } catch (error) {
      console.error("Error sending service reminder:", error);
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Simulating successful email sending despite error");
        return true;
      }
      return false;
    }
  }
  /**
   * Send invitation email to join an organization
   */
  async sendUserInvitation(recipientName, recipientEmail, companyName, role, invitationToken) {
    const isDevelopment2 = process.env.NODE_ENV !== "production";
    if (!this.credentials) {
      console.error("Email credentials not configured");
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Continuing without email credentials");
      } else {
        return false;
      }
    }
    try {
      let baseUrl = "https://smartwaterpools.replit.app";
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      } else if (process.env.NODE_ENV !== "production") {
        baseUrl = "http://localhost:5000";
        console.log("Using localhost URL for email in development");
      }
      console.log("Using base URL for invitation emails:", baseUrl);
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const inviteLink = `${baseUrl}/invite?token=${invitationToken}`;
      console.log("Generated invitation link:", inviteLink);
      const emailOptions = {
        to: recipientEmail,
        subject: emailTemplates.userInvitation.subject,
        text: emailTemplates.userInvitation.text(recipientName, companyName, inviteLink, role),
        html: emailTemplates.userInvitation.html(recipientName, companyName, inviteLink, role)
      };
      if (this.credentials?.provider === "gmail" && this.gmailService) {
        return await this.gmailService.sendEmail(emailOptions);
      } else {
        console.log(`----------------------------------------`);
        console.log(`[EMAIL] Invitation email would be sent to ${recipientEmail}`);
        console.log(`Company: ${companyName}`);
        console.log(`Role: ${role}`);
        console.log(`Invitation link: ${inviteLink}`);
        console.log(`----------------------------------------`);
        return isDevelopment2 ? true : false;
      }
    } catch (error) {
      console.error("Error sending invitation email:", error);
      if (isDevelopment2) {
        console.log("DEVELOPMENT MODE: Simulating successful email sending despite error");
        return true;
      }
      return false;
    }
  }
};
async function loadEmailConfigFromDatabase() {
  try {
    const gmailProvider = await db.query.communicationProviders.findFirst({
      where: (provider, { eq: eq2, and: and2 }) => and2(
        eq2(provider.type, "gmail"),
        eq2(provider.isActive, true)
      )
    });
    if (!gmailProvider) {
      console.log("No active Gmail provider found in database");
      return false;
    }
    const credentials = {
      provider: "gmail",
      user: gmailProvider.email || "",
      clientId: gmailProvider.clientId || void 0,
      clientSecret: gmailProvider.clientSecret || void 0,
      refreshToken: gmailProvider.settings || void 0
      // RefreshToken might be stored in settings
    };
    if (!credentials.user || !credentials.clientId || !credentials.clientSecret) {
      console.log("Gmail provider found but missing essential credentials");
      return false;
    }
    configureEmailService(credentials);
    console.log(`Email service configured with Gmail provider from database: ${credentials.user}`);
    return true;
  } catch (error) {
    console.error("Error loading email configuration from database:", error);
    return false;
  }
}
var emailService = new EmailService();
function configureEmailService(credentials) {
  emailService.setCredentials(credentials);
}

// server/index.ts
var { Pool: Pool2 } = pg;
var isReplitEnv = !!process.env.REPL_ID;
if (isReplitEnv) {
  if (!process.env.APP_URL) {
    process.env.APP_URL = "https://smartwaterpools.replit.app";
    console.log(`Setting APP_URL for Replit environment: ${process.env.APP_URL}`);
  }
}
var app = express5();
app.use(express5.json({ limit: "50mb" }));
app.use(express5.urlencoded({ extended: true, limit: "50mb" }));
var PgSession = connectPgSimple(session);
var isProduction = process.env.NODE_ENV === "production";
var isReplit = !!process.env.REPL_ID;
var getSessionSecret = () => {
  if (process.env.SESSION_SECRET) {
    console.log("Using predefined session secret from environment variables");
    return process.env.SESSION_SECRET;
  }
  const baseSecret = "smart-water-pools-fixed-secret-key";
  const datePart = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  console.log("Using fallback session secret with daily rotation component");
  return `${baseSecret}-${datePart}`;
};
var sessionSecret = getSessionSecret();
console.log("Session middleware initialized");
app.use(
  session({
    store: new PgSession({
      pool: new Pool2({ connectionString: process.env.DATABASE_URL }),
      tableName: "session",
      // Name of the session table
      createTableIfMissing: true,
      // Cleanup expired sessions periodically (every 24 hours)
      pruneSessionInterval: 24 * 60 * 60,
      // Optimize connection pool to prevent database connection exhaustion
      errorLog: console.error
    }),
    secret: sessionSecret,
    resave: false,
    // Only save session when modified
    saveUninitialized: true,
    // Create session for all requests (needed for OAuth)
    rolling: true,
    // Reset cookie maxAge on each response
    proxy: true,
    // Trust the reverse proxy for secure cookies
    unset: "keep",
    // Keep session in store even if unset
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours instead of 30 days, shorter session to prevent timeouts
      httpOnly: true,
      // Prevent JavaScript access to the cookie
      path: "/",
      // Ensure cookie is available for the entire site
      // For Replit environments, we need to properly configure cookie security
      // In production/Replit: secure=true, sameSite=none (for cross-domain OAuth)
      // Secure must be true when sameSite is 'none'
      // Since we're setting sameSite to 'none', we must set secure to true always
      secure: true,
      // SameSite strategy:
      // 'none' - Allows cross-site cookies, needed for OAuth redirects and Replit environment.
      // This is required because Google OAuth redirects across domains.
      // Combined with 'secure: true', this provides the best compatibility
      // For Replit, we always use 'none' to ensure cross-origin requests work properly
      sameSite: "none",
      // Domain should be undefined to use the current domain
      domain: void 0
    },
    name: "swp.sid"
    // Custom name to avoid conflicts with other cookies
  })
);
var passport4 = configurePassport(storage);
app.use(passport4.initialize());
app.use(passport4.session());
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || process.env.NODE_ENV !== "production") {
    res.setHeader("X-Session-ID", req.sessionID || "no-session");
    const authStatus = req.isAuthenticated ? req.isAuthenticated() ? "authenticated" : "not-authenticated" : "unknown";
    res.setHeader("X-Auth-Status", authStatus);
    if (req.session?.oauthPending) {
      res.setHeader("X-OAuth-Pending", "true");
      if (req.session.oauthState) {
        res.setHeader("X-OAuth-State", req.session.oauthState);
      }
      if (req.session.oauthInitiatedAt) {
        res.setHeader("X-OAuth-Initiated", req.session.oauthInitiatedAt);
      }
    }
    if (req.path.includes("/auth/google") || req.path.includes("/auth/session") || req.path.includes("/auth/prepare-oauth")) {
      console.log(`Session debug for ${req.method} ${req.path} - SessionID: ${req.sessionID}`);
      console.log(`Session cookie details:`, {
        exists: !!req.session,
        oauthState: req.session?.oauthState || "none",
        oauthPending: req.session?.oauthPending || false,
        isNew: req.session?.isNew || false,
        cookieMaxAge: req.session?.cookie?.maxAge || "not set",
        cookieExpires: req.session?.cookie?.expires || "not set",
        authenticated: authStatus
      });
    }
  }
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const isProduction2 = process.env.NODE_ENV === "production";
  const isReplit2 = !!process.env.REPL_ID;
  const defaultPort = isReplit2 ? 5e3 : isProduction2 ? 5e3 : 3e3;
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;
  try {
    loadEmailConfigFromDatabase().then((success) => {
      if (success) {
        log("Email configuration successfully loaded from database");
      } else {
        log("No email provider configured. Email functionality will be disabled.");
      }
    }).catch((error) => {
      console.error("Error loading email configuration:", error);
      log("Email functionality will be disabled due to configuration error");
    });
  } catch (error) {
    console.error("Exception during email configuration setup:", error);
    log("Email functionality will be disabled due to setup error");
  }
  console.log("Current environment details:");
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
  console.log(`- REPL_ID: ${process.env.REPL_ID || "not set"}`);
  console.log(`- REPL_SLUG: ${process.env.REPL_SLUG || "not set"}`);
  console.log(`- REPL_OWNER: ${process.env.REPL_OWNER || "not set"}`);
  console.log(`- PORT: ${process.env.PORT || "not set"}`);
  console.log(`- Selected Port: ${port}`);
  console.log(`- Is Replit Environment: ${isReplit2 ? "Yes" : "No"}`);
  const startServer = (port2, attemptCount = 0) => {
    if (attemptCount > 5) {
      log(`Failed to find an available port after ${attemptCount} attempts`);
      process.exit(1);
    }
    const priorityPorts = isReplit2 ? [5e3, 8080, 3e3, 3001, 8e3] : [3e3, 5e3, 8080, 3001, 8e3];
    const getNextPort = () => {
      if (attemptCount < priorityPorts.length - 1) {
        return priorityPorts[attemptCount + 1];
      }
      return port2 + 1e3;
    };
    return server.listen(port2, "0.0.0.0", () => {
      console.log(`\u{1F680} Server is now listening on port ${port2}`);
      console.log(`================================================`);
      console.log(`SERVER CONFIGURATION DETAILS:`);
      console.log(`- Server binding hostname: 0.0.0.0`);
      console.log(`- Server binding port: ${port2}`);
      console.log(`- Direct access URL: http://0.0.0.0:${port2}`);
      console.log(`- Server IP addresses:`);
      try {
        import("os").then((os) => {
          const nets = os.networkInterfaces();
          Object.keys(nets).forEach((netInterface) => {
            nets[netInterface].forEach((net) => {
              if (net.family === "IPv4") {
                console.log(`  - ${netInterface}: ${net.address}`);
              }
            });
          });
        }).catch((err) => {
          console.log(`  - Unable to import os module: ${err.message}`);
        });
      } catch (err) {
        console.log(`  - Unable to retrieve network interfaces: ${err.message}`);
      }
      if (isReplit2) {
        console.log(`- Replit environment detected`);
        console.log(`- Replit URL: https://smartwaterpools.replit.app`);
        console.log(`- Replit ID: ${process.env.REPL_ID || "unknown"}`);
      }
      console.log(`================================================`);
      log(`Server running on port ${port2} - Environment: ${isProduction2 ? "production" : "development"}`);
      log(`Local access URL: http://localhost:${port2}`);
      log(`Network access URL: http://0.0.0.0:${port2}`);
      if (isReplit2) {
        log(`Replit access URL: https://smartwaterpools.replit.app`);
      }
      log(`Using port ${port2} for server compatibility`);
      if (isReplit2) {
        log(`Running in Replit environment - make sure to use relative URLs in frontend`);
        if (port2 !== 5e3) {
          console.log(`\u26A0\uFE0F Note: Server is running on port ${port2}, but Replit workflow may be expecting port 5000`);
          console.log(`Server is redirecting connections from port 5000 to port ${port2}`);
        }
      }
      if (port2 === 5e3 || port2 === 8080 || port2 === 3e3) {
        log(`Server ready and accepting connections on port ${port2}`);
      }
    }).on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        log(`Port ${port2} is already in use, trying alternative port...`);
        const nextPort = getNextPort();
        log(`Attempting to use port ${nextPort} (attempt ${attemptCount + 1})`);
        return startServer(nextPort, attemptCount + 1);
      }
      log(`Error starting server: ${error.message}`);
      process.exit(1);
    });
  };
  const serverInstance = startServer(port);
  const scheduler = new Scheduler(storage);
  scheduler.initialize();
  process.on("SIGTERM", () => {
    log("SIGTERM received, shutting down gracefully");
    scheduler.stop();
    if (serverInstance && typeof serverInstance.close === "function") {
      serverInstance.close(() => {
        log("Server closed");
        process.exit(0);
      });
    } else {
      log("No server instance to close or close method not available");
      process.exit(0);
    }
    setTimeout(() => {
      log("Forcing server shutdown after timeout");
      process.exit(1);
    }, 1e4);
  });
})();
