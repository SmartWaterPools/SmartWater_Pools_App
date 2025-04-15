import { apiRequest } from "../lib/queryClient";
import { BazzaRoute, BazzaRouteStop, BazzaMaintenanceAssignment } from "../lib/types";

// Simple error class with status code
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Enhanced Bazza Routes API functions with better error handling
 */

// Enhanced API request function that wraps the standard apiRequest
async function safeApiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    return await apiRequest<T>(url, options);
  } catch (error) {
    // Extract status code from error message (e.g., "401: Unauthorized")
    const errorMsg = (error as Error).message || '';
    const statusMatch = errorMsg.match(/^(\d{3}):/);
    const status = statusMatch ? parseInt(statusMatch[1]) : 0;
    
    // Create a more informative error
    throw new ApiError(errorMsg, status);
  }
}

// Fetch all routes
export const fetchAllBazzaRoutes = async (): Promise<BazzaRoute[]> => {
  try {
    return await safeApiRequest<BazzaRoute[]>('/api/bazza/routes');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn('Unauthorized when fetching all routes, returning empty array');
      return [];
    }
    throw error; 
  }
};

// Fetch a specific route by ID
export const fetchBazzaRoute = async (id: number): Promise<BazzaRoute> => {
  try {
    return await safeApiRequest<BazzaRoute>(`/api/bazza/routes/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching route ${id}, throwing error`);
    }
    throw error;
  }
};

// Fetch routes for a technician
export const fetchBazzaRoutesByTechnician = async (technicianId: number): Promise<BazzaRoute[]> => {
  try {
    console.log(`Fetching routes for technician ${technicianId}`);
    const routes = await safeApiRequest<BazzaRoute[]>(`/api/bazza/routes/technician/${technicianId}`);
    console.log(`Successfully fetched ${routes.length} routes for technician ${technicianId}`);
    return routes;
  } catch (error) {
    console.error(`Error fetching routes for technician ${technicianId}:`, error);
    
    // If unauthorized, return empty array to prevent breaking the UI
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching routes for technician ${technicianId}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Fetch routes for a day of week
export const fetchBazzaRoutesByDay = async (dayOfWeek: string): Promise<BazzaRoute[]> => {
  try {
    return await safeApiRequest<BazzaRoute[]>(`/api/bazza/routes/day/${dayOfWeek}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching routes for day ${dayOfWeek}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Create a new route
export const createBazzaRoute = async (routeData: Omit<BazzaRoute, 'id'>): Promise<BazzaRoute> => {
  // Ensure we have all the required fields from the database schema
  const route = {
    ...routeData,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Ensure we don't send properties that don't exist in the database
    description: routeData.description || null,
    type: routeData.type || 'residential',
    isRecurring: routeData.isRecurring !== undefined ? routeData.isRecurring : true,
    frequency: routeData.frequency || 'weekly',
    isActive: routeData.isActive !== undefined ? routeData.isActive : true,
  };
  
  console.log("Creating route with data:", route);
  
  return safeApiRequest<BazzaRoute>('/api/bazza/routes', {
    method: 'POST',
    body: JSON.stringify(route),
  });
};

// Update an existing route
export const updateBazzaRoute = async (id: number, routeData: Partial<BazzaRoute>): Promise<BazzaRoute> => {
  return safeApiRequest<BazzaRoute>(`/api/bazza/routes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(routeData),
  });
};

// Delete a route
export const deleteBazzaRoute = async (id: number): Promise<void> => {
  return safeApiRequest<void>(`/api/bazza/routes/${id}`, {
    method: 'DELETE',
  });
};

// Fetch route stops
export const fetchRouteStops = async (routeId: number): Promise<BazzaRouteStop[]> => {
  try {
    return await safeApiRequest<BazzaRouteStop[]>(`/api/bazza/routes/${routeId}/stops`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching stops for route ${routeId}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Fetch client stops
export const fetchClientStops = async (clientId: number): Promise<BazzaRouteStop[]> => {
  try {
    return await safeApiRequest<BazzaRouteStop[]>(`/api/bazza/stops/client/${clientId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching stops for client ${clientId}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Create a new route stop
export const createRouteStop = async (stopData: Omit<BazzaRouteStop, 'id'>): Promise<BazzaRouteStop> => {
  return safeApiRequest<BazzaRouteStop>('/api/bazza/stops', {
    method: 'POST',
    body: JSON.stringify(stopData),
  });
};

// Update an existing route stop
export const updateRouteStop = async (id: number, stopData: Partial<BazzaRouteStop>): Promise<BazzaRouteStop> => {
  return safeApiRequest<BazzaRouteStop>(`/api/bazza/stops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(stopData),
  });
};

// Delete a route stop
export const deleteRouteStop = async (id: number): Promise<void> => {
  return safeApiRequest<void>(`/api/bazza/stops/${id}`, {
    method: 'DELETE',
  });
};

// Reorder route stops
export const reorderRouteStops = async (routeId: number, stopIds: number[]): Promise<BazzaRouteStop[]> => {
  return safeApiRequest<BazzaRouteStop[]>(`/api/bazza/routes/${routeId}/reorder-stops`, {
    method: 'POST',
    body: JSON.stringify({ stopIds }),
  });
};

// Fetch route assignments
export const fetchRouteAssignments = async (routeId: number): Promise<BazzaMaintenanceAssignment[]> => {
  try {
    return await safeApiRequest<BazzaMaintenanceAssignment[]>(`/api/bazza/routes/${routeId}/assignments`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching assignments for route ${routeId}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Fetch maintenance assignments
export const fetchMaintenanceAssignments = async (maintenanceId: number): Promise<BazzaMaintenanceAssignment[]> => {
  try {
    return await safeApiRequest<BazzaMaintenanceAssignment[]>(`/api/bazza/assignments/maintenance/${maintenanceId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching assignments for maintenance ${maintenanceId}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Fetch assignments by date
export const fetchAssignmentsByDate = async (date: string): Promise<BazzaMaintenanceAssignment[]> => {
  try {
    return await safeApiRequest<BazzaMaintenanceAssignment[]>(`/api/bazza/assignments/date/${date}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching assignments for date ${date}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Fetch assignments by technician and date range
export const fetchAssignmentsByTechnicianAndDateRange = async (
  technicianId: number, 
  startDate: string, 
  endDate: string
): Promise<BazzaMaintenanceAssignment[]> => {
  try {
    return await safeApiRequest<BazzaMaintenanceAssignment[]>(
      `/api/bazza/assignments/technician/${technicianId}/date-range?startDate=${startDate}&endDate=${endDate}`
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching assignments for technician ${technicianId} and date range, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Create a new assignment
export const createAssignment = async (
  assignmentData: Omit<BazzaMaintenanceAssignment, 'id'>
): Promise<BazzaMaintenanceAssignment> => {
  return safeApiRequest<BazzaMaintenanceAssignment>('/api/bazza/assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
};

// Update an existing assignment
export const updateAssignment = async (
  id: number, 
  assignmentData: Partial<BazzaMaintenanceAssignment>
): Promise<BazzaMaintenanceAssignment> => {
  return safeApiRequest<BazzaMaintenanceAssignment>(`/api/bazza/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assignmentData),
  });
};

// Delete an assignment
export const deleteAssignment = async (id: number): Promise<void> => {
  return safeApiRequest<void>(`/api/bazza/assignments/${id}`, {
    method: 'DELETE',
  });
};