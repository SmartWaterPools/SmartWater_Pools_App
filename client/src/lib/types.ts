import { 
  User, Client, Technician, 
  Project, ProjectAssignment, 
  Maintenance, Repair, Invoice 
} from "@shared/schema";

// Enhanced types with relationships
export interface ClientWithUser extends Client {
  user: User;
}

export interface TechnicianWithUser extends Technician {
  user: User;
}

export interface ProjectWithDetails extends Project {
  client: ClientWithUser;
  assignments: Array<ProjectAssignmentWithTechnician>;
}

export interface ProjectAssignmentWithTechnician extends ProjectAssignment {
  technician: TechnicianWithUser;
}

export interface MaintenanceWithDetails extends Maintenance {
  client: ClientWithUser;
  technician: TechnicianWithUser | null;
}

export interface RepairWithDetails extends Repair {
  client: ClientWithUser;
  technician: TechnicianWithUser | null;
}

export interface InvoiceWithDetails extends Invoice {
  client: ClientWithUser;
}

// Dashboard summary type
export interface DashboardSummary {
  metrics: {
    activeProjects: number;
    maintenanceThisWeek: number;
    pendingRepairs: number;
    totalClients: number;
  };
  recentProjects: Array<ProjectWithDetails>;
  upcomingMaintenances: Array<MaintenanceWithDetails>;
  recentRepairs: Array<RepairWithDetails>;
}

// Status and priority types for display helpers
export type ProjectStatus = "planning" | "in_progress" | "review" | "completed";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type RepairStatus = "pending" | "assigned" | "scheduled" | "in_progress" | "completed";
export type PriorityLevel = "low" | "medium" | "high";
export type InvoiceStatus = "pending" | "paid" | "overdue";

// Helper function to get status classes
export const getStatusClasses = (status: string): { bg: string; text: string } => {
  switch (status) {
    case "planning":
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case "in_progress":
      return { bg: "bg-blue-100", text: "text-primary" };
    case "review":
      return { bg: "bg-green-100", text: "text-green-600" };
    case "completed":
      return { bg: "bg-green-100", text: "text-green-600" };
    case "scheduled":
      return { bg: "bg-blue-100", text: "text-primary" };
    case "cancelled":
      return { bg: "bg-gray-100", text: "text-gray-600" };
    case "pending":
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case "assigned":
      return { bg: "bg-yellow-100", text: "text-yellow-800" };
    case "paid":
      return { bg: "bg-green-100", text: "text-green-600" };
    case "overdue":
      return { bg: "bg-red-100", text: "text-red-800" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800" };
  }
};

// Helper function to get priority classes
export const getPriorityClasses = (priority: PriorityLevel): { bg: string; text: string } => {
  switch (priority) {
    case "low":
      return { bg: "bg-green-100", text: "text-green-800" };
    case "medium":
      return { bg: "bg-yellow-100", text: "text-yellow-800" };
    case "high":
      return { bg: "bg-red-100", text: "text-red-800" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800" };
  }
};

// Format date helper
export const formatDate = (date: Date | string): string => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format time helper
export const formatTime = (time: string): string => {
  if (!time) return "";
  // Convert 24h format (HH:MM:SS) to 12h format with AM/PM
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const m = minutes;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m} ${ampm}`;
};
