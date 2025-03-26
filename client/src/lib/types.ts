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
}

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
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

// Date formatting utility function
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
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