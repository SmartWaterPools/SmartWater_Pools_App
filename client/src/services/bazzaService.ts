import { apiRequest } from "../lib/queryClient";
import { BazzaRoute, BazzaRouteStop, BazzaMaintenanceAssignment } from "../lib/types";

// Bazza Routes API functions
export const fetchAllBazzaRoutes = async (): Promise<BazzaRoute[]> => {
  return apiRequest('/api/bazza/routes');
};

export const fetchBazzaRoute = async (id: number): Promise<BazzaRoute> => {
  return apiRequest(`/api/bazza/routes/${id}`);
};

export const fetchBazzaRoutesByTechnician = async (technicianId: number): Promise<BazzaRoute[]> => {
  try {
    const routes = await apiRequest(`/api/bazza/routes/technician/${technicianId}`);
    return routes;
  } catch (error) {
    console.error(`Error fetching routes for technician ${technicianId}:`, error);
    // If unauthorized, return empty array to prevent breaking the UI
    if ((error as any)?.status === 401 || (error as any)?.message?.includes('Unauthorized')) {
      console.warn('Unauthorized when fetching routes, returning empty array');
      return [];
    }
    throw error; // Re-throw for other errors
  }
};

export const fetchBazzaRoutesByDay = async (dayOfWeek: string): Promise<BazzaRoute[]> => {
  return apiRequest(`/api/bazza/routes/day/${dayOfWeek}`);
};

export const createBazzaRoute = async (routeData: Omit<BazzaRoute, 'id'>): Promise<BazzaRoute> => {
  // Make sure required fields are included
  const route = {
    ...routeData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return apiRequest('/api/bazza/routes', {
    method: 'POST',
    body: JSON.stringify(route),
  });
};

export const updateBazzaRoute = async (id: number, routeData: Partial<BazzaRoute>): Promise<BazzaRoute> => {
  return apiRequest(`/api/bazza/routes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(routeData),
  });
};

export const deleteBazzaRoute = async (id: number): Promise<void> => {
  return apiRequest(`/api/bazza/routes/${id}`, {
    method: 'DELETE',
  });
};

// Bazza Route Stops API functions
export const fetchRouteStops = async (routeId: number): Promise<BazzaRouteStop[]> => {
  return apiRequest(`/api/bazza/routes/${routeId}/stops`);
};

export const fetchClientStops = async (clientId: number): Promise<BazzaRouteStop[]> => {
  return apiRequest(`/api/bazza/stops/client/${clientId}`);
};

export const createRouteStop = async (stopData: Omit<BazzaRouteStop, 'id'>): Promise<BazzaRouteStop> => {
  return apiRequest('/api/bazza/stops', {
    method: 'POST',
    body: JSON.stringify(stopData),
  });
};

export const updateRouteStop = async (id: number, stopData: Partial<BazzaRouteStop>): Promise<BazzaRouteStop> => {
  return apiRequest(`/api/bazza/stops/${id}`, {
    method: 'PUT',
    body: JSON.stringify(stopData),
  });
};

export const deleteRouteStop = async (id: number): Promise<void> => {
  return apiRequest(`/api/bazza/stops/${id}`, {
    method: 'DELETE',
  });
};

export const reorderRouteStops = async (routeId: number, stopIds: number[]): Promise<BazzaRouteStop[]> => {
  return apiRequest(`/api/bazza/routes/${routeId}/reorder-stops`, {
    method: 'POST',
    body: JSON.stringify({ stopIds }),
  });
};

// Bazza Maintenance Assignments API functions
export const fetchRouteAssignments = async (routeId: number): Promise<BazzaMaintenanceAssignment[]> => {
  return apiRequest(`/api/bazza/routes/${routeId}/assignments`);
};

export const fetchMaintenanceAssignments = async (maintenanceId: number): Promise<BazzaMaintenanceAssignment[]> => {
  return apiRequest(`/api/bazza/assignments/maintenance/${maintenanceId}`);
};

export const fetchAssignmentsByDate = async (date: string): Promise<BazzaMaintenanceAssignment[]> => {
  return apiRequest(`/api/bazza/assignments/date/${date}`);
};

export const fetchAssignmentsByTechnicianAndDateRange = async (
  technicianId: number, 
  startDate: string, 
  endDate: string
): Promise<BazzaMaintenanceAssignment[]> => {
  return apiRequest(
    `/api/bazza/assignments/technician/${technicianId}/date-range?startDate=${startDate}&endDate=${endDate}`
  );
};

export const createAssignment = async (
  assignmentData: Omit<BazzaMaintenanceAssignment, 'id'>
): Promise<BazzaMaintenanceAssignment> => {
  return apiRequest('/api/bazza/assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
};

export const updateAssignment = async (
  id: number, 
  assignmentData: Partial<BazzaMaintenanceAssignment>
): Promise<BazzaMaintenanceAssignment> => {
  return apiRequest(`/api/bazza/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(assignmentData),
  });
};

export const deleteAssignment = async (id: number): Promise<void> => {
  return apiRequest(`/api/bazza/assignments/${id}`, {
    method: 'DELETE',
  });
};