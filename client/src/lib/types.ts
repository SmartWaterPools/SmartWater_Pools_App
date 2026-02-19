// Type definitions for subscription-related components

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionTier = 'basic' | 'professional' | 'enterprise';

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  tier: SubscriptionTier;
  price: number;
  billingCycle: BillingCycle;
  features: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  maxTechnicians?: number;
  maxClients?: number;
  maxProjects?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PlansResponse {
  success: boolean;
  plans: SubscriptionPlan[];
}

// Project Types
export interface ProjectWithDetails {
  id: number;
  name: string;
  description: string;
  status: string;
  startDate: string;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  completion: number;
  client: {
    id: number;
    user: {
      id: number;
      name: string;
    };
    companyName?: string;
  };
  // Additional fields that may come from the server
  percentComplete?: number;
  projectType?: string;
  assignments?: any[];
  deadline?: Date;
}

// Maintenance Types
// The complete MaintenanceWithDetails interface is defined below (see line ~176)

// Helper functions for styling based on status
export function getStatusClasses(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case 'planning':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'in_progress':
      return { bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'on_hold':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'cancelled':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    case 'routed':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

// Date formatting utility function
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    // Handle date-only strings (YYYY-MM-DD) without timezone conversion
    // This prevents dates from shifting by a day due to UTC interpretation
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Handle ISO timestamps with timezone - extract date part
    if (typeof dateString === 'string' && dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    // Fallback for other formats
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    return 'Invalid date';
  }
}

// Time formatting utility function
export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return 'N/A';
  
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (e) {
    return 'Invalid time';
  }
}

// Currency formatting utility function
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

// Priority styling utility function
export function getPriorityClasses(priority: string): { bg: string; text: string } {
  switch (priority.toLowerCase()) {
    case 'low':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'medium':
      return { bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'high':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'urgent':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

// Format maintenance type for display
export function formatMaintenanceType(type: string | undefined): string {
  if (!type) return 'Regular Service';
  
  // Replace underscores with spaces and capitalize first letter of each word
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Maintenance types
export interface MaintenanceWithDetails {
  id: number;
  clientId: number;
  technicianId?: number | null;
  scheduleDate: string;
  completionDate?: string | null;
  type: string;  // e.g., 'regular', 'chemical_adjustment', 'equipment_maintenance'
  status: string; // e.g., 'scheduled', 'in_progress', 'completed', 'cancelled'
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  startTime?: string | null;
  endTime?: string | null;
  customerFeedback?: string | null;
  customerNotes?: string | null;
  invoiceAmount?: number | null;
  laborCost?: number | null;
  totalChemicalCost?: number | null;
  profitAmount?: number | null;
  profitPercentage?: number | null;
  isRouted?: boolean;
  
  // Relations
  client: ClientWithUser | { id: number; name: string; email: string; phone?: string; address?: string; latitude?: number | null; longitude?: number | null };
  technician?: {
    id: number;
    userId: number;
    user: {
      id: number;
      name: string;
      email: string;
    }
  } | null;
  serviceReport?: any;
}

// Bazza Maintenance Routes types
export interface BazzaRoute {
  id: number;
  name: string;
  description: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  technicianId: number | null;
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  color: string | null;
  isActive: boolean;
  
  // Additional fields from schema
  weekNumber?: number;
  isRecurring?: boolean;
  frequency?: string;
  
  // Field used in form but not in database schema
  region?: string;
  
  // Compatibility alias for isActive - ensuring routes display properly
  active?: boolean;
}

export interface BazzaRouteStop {
  id: number;
  routeId: number;
  clientId: number;
  position: number;              // Legacy field name
  orderIndex?: number;           // New field name that replaced position
  estimatedDuration: number | null;
  notes: string | null;          // Legacy field name
  customInstructions?: string | null; // New field name that replaced notes
  createdAt: Date;
  updatedAt: Date;
}

export interface BazzaMaintenanceAssignment {
  id: number;
  routeId: number;
  routeStopId: number;
  maintenanceId: number;
  date: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations that might be included
  route?: BazzaRoute;
  maintenance?: MaintenanceWithDetails;
}

// Dashboard Summary types
export interface DashboardMetrics {
  activeProjects: number;
  maintenanceThisWeek: number;
  pendingRepairs: number;
  totalClients: number;
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  recentProjects: any[];
  upcomingMaintenances: any[];
  recentRepairs: any[];
}

// Repair types
export interface RepairWithDetails {
  id: number;
  clientId: number;
  technicianId?: number | null;
  issue: string; // e.g., 'filter', 'pump', 'leak', etc.
  priority: string; // e.g., 'low', 'medium', 'high', 'urgent'
  description?: string | null;
  reportedDate: string;
  scheduledDate?: string | null;
  completionDate?: string | null;
  status: string; // e.g., 'reported', 'scheduled', 'in_progress', 'completed', 'cancelled'
  notes?: string | null;
  scheduledTime?: string | null;
  // Relations
  client: ClientWithUser;
  technician?: {
    id: number;
    userId: number;
    user: {
      id: number;
      name: string;
      email: string;
    }
  } | null;
}

// Pool equipment type definition
export interface PoolEquipment {
  id: number;
  clientId: number;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  lastServiceDate?: string;
  notes?: string;
  status: string;
  imageUrl?: string;
}

// Pool image type definition
export interface PoolImage {
  id: number;
  clientId: number;
  imageUrl: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  category?: string; // 'pool', 'equipment', 'issue', etc.
  takenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Client with User interface (for client data with associated user)
export interface ClientWithUser {
  client: {
    id: number;
    userId: number;
    organizationId: number;
    companyName?: string;
    contactName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    contractType?: string | null;  // residential, commercial, service, etc.
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    poolCount?: number;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    organizationId: number | null;
    phone?: string;
    address?: string;
    photoUrl?: string;
  };
  // Composite properties for display convenience
  id?: number;
  companyName?: string;
  contractType?: string | null;
}

// Technician with User interface
export interface TechnicianWithUser {
  id: number;
  userId: number;
  organizationId: number;
  specialization?: string;
  certifications?: string[];
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    organizationId: number | null;
    phone?: string;
    address?: string;
    photoUrl?: string;
  };
}