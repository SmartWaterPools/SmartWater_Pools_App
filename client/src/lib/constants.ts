/**
 * Application-wide constants
 */

// Maintenance types
export const MAINTENANCE_TYPES = [
  "regular_service",
  "chemical_check",
  "filter_cleaning",
  "equipment_inspection",
  "water_testing",
  "winterization",
  "opening",
  "green_pool_treatment",
] as const;

// Date format strings
export const DATE_FORMATS = {
  SHORT: "MM/dd/yyyy",
  MEDIUM: "MMM d, yyyy",
  LONG: "MMMM d, yyyy",
  WITH_DAY: "EEEE, MMMM d, yyyy",
  WITH_TIME: "MMMM d, yyyy h:mm a"
};

// Status types
export const STATUS_TYPES = {
  MAINTENANCE: ["scheduled", "in_progress", "completed", "cancelled"],
  PROJECT: ["planning", "in_progress", "review", "completed"],
  REPAIR: ["pending", "assigned", "scheduled", "in_progress", "completed"],
  INVOICE: ["pending", "paid", "overdue"]
};

// Priority levels
export const PRIORITY_LEVELS = ["low", "medium", "high"];

// Route types
export const ROUTE_TYPES = ["residential", "commercial", "mixed"];

// Common validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: "This field is required",
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_PHONE: "Please enter a valid phone number",
  INVALID_DATE: "Please enter a valid date",
  PASSWORD_MIN_LENGTH: "Password must be at least 8 characters",
  PASSWORD_MISMATCH: "Passwords do not match"
};

// API endpoints
export const API_ENDPOINTS = {
  // Core resources
  USERS: "/api/users",
  CLIENTS: "/api/clients",
  TECHNICIANS: "/api/technicians",
  PROJECTS: "/api/projects",
  MAINTENANCES: "/api/maintenances",
  REPAIRS: "/api/repairs",
  INVOICES: "/api/invoices",
  DASHBOARD: "/api/dashboard/summary",
  
  // Pool Service Routes (NOT API routes - these manage technician pool service paths)
  // These endpoints manage the physical routes that technicians follow to service pools
  POOL_ROUTES: "/api/routes",
  POOL_ROUTE_DETAILS: (id: number) => `/api/routes/${id}`,
  POOL_ROUTE_BY_TECHNICIAN: (technicianId: number) => `/api/technicians/${technicianId}/routes`,
  POOL_ROUTE_BY_DAY: (dayOfWeek: string) => `/api/routes/day/${dayOfWeek}`,
  POOL_ROUTE_BY_TYPE: (type: string) => `/api/routes/type/${type}`,
  POOL_ROUTE_ASSIGNMENTS: (routeId: number) => `/api/routes/${routeId}/assignments`,
  POOL_ROUTE_ASSIGNMENT: (id: number) => `/api/route-assignments/${id}`,
  MAINTENANCE_ROUTE_ASSIGNMENTS: (maintenanceId: number) => `/api/maintenances/${maintenanceId}/route-assignments`,
  REORDER_POOL_ROUTE: (routeId: number) => `/api/routes/${routeId}/reorder`,
};