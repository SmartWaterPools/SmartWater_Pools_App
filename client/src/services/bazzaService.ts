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
    const routes = await safeApiRequest<BazzaRoute[]>('/api/bazza/routes');
    
    // Process each route to ensure both isActive and active properties exist
    return routes.map(route => {
      if (route.isActive !== undefined && route.active === undefined) {
        return { ...route, active: route.isActive };
      } else if (route.active !== undefined && route.isActive === undefined) {
        return { ...route, isActive: route.active };
      }
      return route;
    });
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
    const route = await safeApiRequest<BazzaRoute>(`/api/bazza/routes/${id}`);
    
    // Ensure response has both isActive and active properties for UI consistency
    if (route.isActive !== undefined && route.active === undefined) {
      (route as any).active = route.isActive;
    } else if (route.active !== undefined && route.isActive === undefined) {
      (route as any).isActive = route.active;
    }
    
    return route;
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
    
    // Process each route to ensure both isActive and active properties exist
    const processedRoutes = routes.map(route => {
      if (route.isActive !== undefined && route.active === undefined) {
        return { ...route, active: route.isActive };
      } else if (route.active !== undefined && route.isActive === undefined) {
        return { ...route, isActive: route.active };
      }
      return route;
    });
    
    console.log(`Successfully fetched ${processedRoutes.length} routes for technician ${technicianId}`);
    return processedRoutes;
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
    const routes = await safeApiRequest<BazzaRoute[]>(`/api/bazza/routes/day/${dayOfWeek}`);
    
    // Process each route to ensure both isActive and active properties exist
    return routes.map(route => {
      if (route.isActive !== undefined && route.active === undefined) {
        return { ...route, active: route.isActive };
      } else if (route.active !== undefined && route.isActive === undefined) {
        return { ...route, isActive: route.active };
      }
      return route;
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching routes for day ${dayOfWeek}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Create a new route
export const createBazzaRoute = async (routeData: any): Promise<BazzaRoute> => {
  // Sanitize the data for the server - exactly match what the schema expects
  const routeToSend = {
    // Required fields
    name: routeData.name,
    technicianId: Number(routeData.technicianId), // Ensure it's a number
    dayOfWeek: routeData.dayOfWeek,
    type: routeData.type || 'residential',
    isRecurring: routeData.isRecurring !== undefined ? routeData.isRecurring : true,
    frequency: routeData.frequency || 'weekly',
    isActive: routeData.isActive !== undefined ? routeData.isActive : true,
    
    // Optional fields
    startTime: routeData.startTime || null,
    endTime: routeData.endTime || null,
    description: routeData.description || null,
    color: routeData.color || null,
    weekNumber: routeData.weekNumber || null,
    
    // Do NOT include these fields - they're set by the server
    // id, createdAt, updatedAt
  };
  
  console.log("Creating route with data:", JSON.stringify(routeToSend, null, 2));
  
  try {
    const response = await safeApiRequest<BazzaRoute>('/api/bazza/routes', {
      method: 'POST',
      body: JSON.stringify(routeToSend),
    });
    
    // Ensure response has both isActive and active properties for UI consistency
    if (response.isActive !== undefined && response.active === undefined) {
      (response as any).active = response.isActive;
    } else if (response.active !== undefined && response.isActive === undefined) {
      (response as any).isActive = response.active;
    }
    
    return response;
  } catch (error) {
    console.error("Error in createBazzaRoute:", error);
    if (error instanceof ApiError) {
      console.error("API Error details:", error.message, error.status);
    }
    throw error;
  }
};

// Update an existing route
export const updateBazzaRoute = async (id: number, routeData: Partial<BazzaRoute>): Promise<BazzaRoute> => {
  // If only one of isActive/active is provided, make sure both are sent to the server
  const dataToSend = { ...routeData };
  if (dataToSend.isActive !== undefined && dataToSend.active === undefined) {
    (dataToSend as any).active = dataToSend.isActive;
  } else if (dataToSend.active !== undefined && dataToSend.isActive === undefined) {
    (dataToSend as any).isActive = dataToSend.active;
  }
  
  const response = await safeApiRequest<BazzaRoute>(`/api/bazza/routes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dataToSend),
  });
  
  // Ensure response has both isActive and active properties
  if (response.isActive !== undefined && response.active === undefined) {
    (response as any).active = response.isActive;
  } else if (response.active !== undefined && response.isActive === undefined) {
    (response as any).isActive = response.active;
  }
  
  return response;
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