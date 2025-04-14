import { enhancedApiRequest, ApiError } from "../lib/enhancedApiClient";
import { BazzaRoute, BazzaRouteStop, BazzaMaintenanceAssignment } from "../lib/types";

/**
 * Enhanced Bazza Routes API functions with better error handling
 */

// Fetch all routes
export const fetchAllBazzaRoutes = async (): Promise<BazzaRoute[]> => {
  try {
    return await enhancedApiRequest('/api/bazza/routes');
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
    return await enhancedApiRequest(`/api/bazza/routes/${id}`);
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
    const routes = await enhancedApiRequest(`/api/bazza/routes/technician/${technicianId}`);
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
    return await enhancedApiRequest(`/api/bazza/routes/day/${dayOfWeek}`);
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
  const route = {
    ...routeData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return enhancedApiRequest('/api/bazza/routes', {
    method: 'POST',
    body: JSON.stringify(route),
  });
};

// Update an existing route
export const updateBazzaRoute = async (id: number, routeData: Partial<BazzaRoute>): Promise<BazzaRoute> => {
  return enhancedApiRequest(`/api/bazza/routes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(routeData),
  });
};

// Delete a route
export const deleteBazzaRoute = async (id: number): Promise<void> => {
  return enhancedApiRequest(`/api/bazza/routes/${id}`, {
    method: 'DELETE',
  });
};

// Fetch route stops
export const fetchRouteStops = async (routeId: number): Promise<BazzaRouteStop[]> => {
  try {
    return await enhancedApiRequest(`/api/bazza/routes/${routeId}/stops`);
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
    return await enhancedApiRequest(`/api/bazza/stops/client/${clientId}`);
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
  return enhancedApiRequest('/api/bazza/stops', {
    method: 'POST',
    body: JSON.stringify(stopData),
  });
};

// Update an existing route stop
export const updateRouteStop = async (id: number, stopData: Partial<BazzaRouteStop>): Promise<BazzaRouteStop> => {
  return enhancedApiRequest(`/api/bazza/stops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(stopData),
  });
};

// Delete a route stop
export const deleteRouteStop = async (id: number): Promise<void> => {
  return enhancedApiRequest(`/api/bazza/stops/${id}`, {
    method: 'DELETE',
  });
};

// Reorder route stops
export const reorderRouteStops = async (routeId: number, stopIds: number[]): Promise<BazzaRouteStop[]> => {
  return enhancedApiRequest(`/api/bazza/routes/${routeId}/reorder-stops`, {
    method: 'POST',
    body: JSON.stringify({ stopIds }),
  });
};

// Fetch route assignments
export const fetchRouteAssignments = async (routeId: number): Promise<BazzaMaintenanceAssignment[]> => {
  try {
    return await enhancedApiRequest(`/api/bazza/routes/${routeId}/assignments`);
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
    return await enhancedApiRequest(`/api/bazza/assignments/maintenance/${maintenanceId}`);
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
    return await enhancedApiRequest(`/api/bazza/assignments/date/${date}`);
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
    return await enhancedApiRequest(
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
  return enhancedApiRequest('/api/bazza/assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
};

// Update an existing assignment
export const updateAssignment = async (
  id: number, 
  assignmentData: Partial<BazzaMaintenanceAssignment>
): Promise<BazzaMaintenanceAssignment> => {
  return enhancedApiRequest(`/api/bazza/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assignmentData),
  });
};

// Delete an assignment
export const deleteAssignment = async (id: number): Promise<void> => {
  return enhancedApiRequest(`/api/bazza/assignments/${id}`, {
    method: 'DELETE',
  });
};