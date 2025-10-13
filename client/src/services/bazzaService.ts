import { apiRequest } from "../lib/queryClient";
import { BazzaRoute, BazzaRouteStop, BazzaMaintenanceAssignment, MaintenanceWithDetails } from "../lib/types";

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
    const method = options?.method || 'GET';
    const body = options?.body;
    const data = body ? JSON.parse(body as string) : undefined;
    
    const response = await apiRequest(method, url, data);
    const json = await response.json();
    return json as T;
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
    console.log('Fetching all routes');
    const routes = await safeApiRequest<BazzaRoute[]>('/api/bazza/routes');
    
    // Process each route to ensure both isActive and active properties exist
    const processedRoutes = routes.map(route => {
      if (route.isActive !== undefined && route.active === undefined) {
        return { ...route, active: route.isActive };
      } else if (route.active !== undefined && route.isActive === undefined) {
        return { ...route, isActive: route.active };
      }
      return route;
    });
    
    console.log(`Successfully fetched ${processedRoutes.length} routes`);
    
    // Enhance routes with stop counts
    const enhancedRoutes = await enhanceRoutesWithStopCounts(processedRoutes);
    return enhancedRoutes;
  } catch (error) {
    console.error('Error fetching all routes:', error);
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

// Enhance routes with stop counts
export const enhanceRoutesWithStopCounts = async (routes: BazzaRoute[]): Promise<BazzaRoute[]> => {
  try {
    console.log(`Enhancing ${routes.length} routes with stop counts`);
    
    // Process routes sequentially to avoid overwhelming the server with requests
    const enhancedRoutes = [];
    
    for (const route of routes) {
      try {
        // Fetch stops for this route
        const stops = await fetchRouteStops(route.id);
        console.log(`Route ${route.id} (${route.name}) has ${stops.length} stops`);
        
        // Enhance the route with stop count
        enhancedRoutes.push({
          ...route,
          stopCount: stops.length
        });
      } catch (error) {
        console.error(`Error fetching stops for route ${route.id}:`, error);
        // Include the route anyway, but with 0 stops
        enhancedRoutes.push({
          ...route,
          stopCount: 0
        });
      }
    }
    
    console.log(`Successfully enhanced ${enhancedRoutes.length} routes with stop counts`);
    return enhancedRoutes;
  } catch (error) {
    console.error(`Error enhancing routes with stop counts:`, error);
    // Return the original routes if enhancement fails
    return routes;
  }
};

// Fetch routes for a technician with enhanced error handling and universal fallback mechanism
export const fetchBazzaRoutesByTechnician = async (technicianId: number): Promise<BazzaRoute[]> => {
  try {
    // Special case logging for certain technicians (like Travis Donald) for tracking specific issues
    const isKnownProblemTechnician = technicianId === 10; // ID 10 is Travis Donald, but we handle all technicians properly
    
    if (isKnownProblemTechnician) {
      console.log(`Fetching routes for known problem technician ID: ${technicianId} - using enhanced processing`);
    } else {
      console.log(`Fetching routes for technician ${technicianId}`);
    }
    
    // Make primary API request
    const routes = await safeApiRequest<BazzaRoute[]>(`/api/bazza/routes/technician/${technicianId}`);
    
    // Enhanced debugging for empty results or known problem technicians
    if (routes.length === 0 || isKnownProblemTechnician) {
      console.log(`Results for technician ${technicianId}: ${routes.length} routes found in direct query`);
    }
    
    // Process each route to ensure both isActive and active properties exist
    const processedRoutes = routes.map(route => {
      if (route.isActive !== undefined && route.active === undefined) {
        return { ...route, active: route.isActive };
      } else if (route.active !== undefined && route.isActive === undefined) {
        return { ...route, isActive: route.active };
      }
      return route;
    });
    
    console.log(`Successfully processed ${processedRoutes.length} routes for technician ${technicianId}`);
    
    // Enhance routes with stop counts
    const enhancedRoutes = await enhanceRoutesWithStopCounts(processedRoutes);
    
    // Universal fallback mechanism - if no routes found for any technician, try the alternative approach
    if (enhancedRoutes.length === 0) {
      console.log(`No routes found for technician ${technicianId} - attempting universal fallback`);
      try {
        // Fetch all routes and manually filter for this technician
        const allRoutes = await fetchAllBazzaRoutes();
        console.log(`Fetched ${allRoutes.length} total routes for fallback search`);
        
        // Filter for routes assigned to this technician
        const technicianRoutes = allRoutes.filter(route => {
          const matched = route.technicianId === technicianId;
          if (matched) {
            console.log(`Found route for technician ${technicianId} through fallback:`, route.name);
          }
          return matched;
        });
        
        if (technicianRoutes.length > 0) {
          console.log(`Found ${technicianRoutes.length} routes for technician ${technicianId} through fallback`);
          
          // Process and enhance these routes
          const processedTechnicianRoutes = technicianRoutes.map(route => {
            if (route.isActive !== undefined && route.active === undefined) {
              return { ...route, active: route.isActive };
            } else if (route.active !== undefined && route.isActive === undefined) {
              return { ...route, isActive: route.active };
            }
            return route;
          });
          
          const enhancedTechnicianRoutes = await enhanceRoutesWithStopCounts(processedTechnicianRoutes);
          return enhancedTechnicianRoutes;
        } else {
          console.log(`No routes found for technician ${technicianId} through fallback either`);
        }
      } catch (fallbackError) {
        console.error(`Error in fallback route fetching for technician ${technicianId}:`, fallbackError);
      }
    }
    
    return enhancedRoutes;
  } catch (error) {
    console.error(`Error fetching routes for technician ${technicianId}:`, error);
    
    // If unauthorized, return empty array to prevent breaking the UI
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching routes for technician ${technicianId}, returning empty array`);
      return [];
    }
    
    // Try fallback approach on error
    try {
      console.log(`Error in primary route fetching for technician ${technicianId} - trying fallback approach`);
      const allRoutes = await fetchAllBazzaRoutes();
      const technicianRoutes = allRoutes.filter(route => route.technicianId === technicianId);
      
      if (technicianRoutes.length > 0) {
        console.log(`Fallback successful - found ${technicianRoutes.length} routes`);
        const processedRoutes = technicianRoutes.map(route => {
          if (route.isActive !== undefined && route.active === undefined) {
            return { ...route, active: route.isActive };
          } else if (route.active !== undefined && route.isActive === undefined) {
            return { ...route, isActive: route.active };
          }
          return route;
        });
        
        return await enhanceRoutesWithStopCounts(processedRoutes);
      }
    } catch (fallbackError) {
      console.error(`Fallback approach also failed:`, fallbackError);
    }
    
    // If we still have errors, throw the original one
    throw error;
  }
};

// Fetch routes for a day of week
export const fetchBazzaRoutesByDay = async (dayOfWeek: string): Promise<BazzaRoute[]> => {
  try {
    console.log(`Fetching routes for day: ${dayOfWeek}`);
    const routes = await safeApiRequest<BazzaRoute[]>(`/api/bazza/routes/day/${dayOfWeek}`);
    
    // Process each route to ensure both isActive and active properties exist
    const processedRoutes = routes.map(route => {
      if (route.isActive !== undefined && route.active === undefined) {
        return { ...route, active: route.isActive };
      } else if (route.active !== undefined && route.isActive === undefined) {
        return { ...route, isActive: route.active };
      }
      return route;
    });
    
    console.log(`Successfully fetched ${processedRoutes.length} routes for day ${dayOfWeek}`);
    
    // Enhance routes with stop counts
    const enhancedRoutes = await enhanceRoutesWithStopCounts(processedRoutes);
    return enhancedRoutes;
  } catch (error) {
    console.error(`Error fetching routes for day ${dayOfWeek}:`, error);
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`Unauthorized when fetching routes for day ${dayOfWeek}, returning empty array`);
      return [];
    }
    throw error;
  }
};

// Create a new route
export const createBazzaRoute = async (routeData: any): Promise<BazzaRoute> => {
  try {
    // Validate required fields on client-side before sending to server
    const requiredFields = ['name', 'technicianId', 'dayOfWeek'];
    const missingFields = requiredFields.filter(field => !routeData[field]);
    
    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Convert technicianId to a number and validate
    let technicianId: number;
    try {
      technicianId = Number(routeData.technicianId);
      if (isNaN(technicianId) || technicianId <= 0) {
        throw new Error(`Invalid technician ID: ${routeData.technicianId}`);
      }
    } catch (e) {
      console.error(`Error parsing technicianId`, e);
      throw new Error(`Invalid technician ID. Please select a valid technician.`);
    }
    
    // Sanitize the data for the server - exactly match what the schema expects
    const routeToSend = {
      // Required fields
      name: routeData.name.trim(),
      technicianId: technicianId,
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
  try {
    console.log(`Deleting route with ID: ${id}`);
    
    const response = await safeApiRequest<void>(`/api/bazza/routes/${id}`, {
      method: 'DELETE',
    });
    
    console.log(`Successfully deleted route ID: ${id}`);
    return response;
  } catch (error) {
    console.error(`Error deleting route ID: ${id}:`, error);
    
    // Enhance error information for better debugging
    if (error instanceof ApiError) {
      console.error(`API error status: ${error.status}`);
      
      if (error.status === 404) {
        throw new Error(`Route with ID ${id} not found. It may have been deleted already.`);
      } else if (error.status === 403) {
        throw new Error('You do not have permission to delete this route.');
      }
    }
    
    // Rethrow the error with additional context
    throw new Error(`Failed to delete route ID: ${id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
export const createRouteStop = async (
  stopData: {
    routeId: number;
    clientId: number;
    position?: number; // Renamed from position but kept for backward compatibility
    orderIndex?: number;
    estimatedDuration?: number | null;
    notes?: string | null; // Kept for backward compatibility 
    customInstructions?: string | null;
  }
): Promise<BazzaRouteStop> => {
  console.log("Creating route stop with raw data:", stopData);
  
  // Create a properly formatted object matching the schema expected by the server
  const formattedStopData = {
    routeId: stopData.routeId,
    clientId: stopData.clientId,
    orderIndex: stopData.orderIndex || stopData.position || 1, // Use either orderIndex or position, defaulting to 1
    estimatedDuration: stopData.estimatedDuration || null,
    customInstructions: stopData.customInstructions || stopData.notes || null, // Use either customInstructions or notes
  };
  
  console.log("Formatted stop data for API:", formattedStopData);
  
  try {
    const result = await safeApiRequest<BazzaRouteStop>('/api/bazza/stops', {
      method: 'POST',
      body: JSON.stringify(formattedStopData),
    });
    
    console.log("Successfully created route stop:", result);
    return result;
  } catch (error) {
    console.error("Error creating route stop:", error);
    throw error;
  }
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
  try {
    console.log(`Deleting route stop with ID: ${id}`);
    
    const response = await safeApiRequest<void>(`/api/bazza/stops/${id}`, {
      method: 'DELETE',
    });
    
    console.log(`Successfully deleted route stop ID: ${id}`);
    return response;
  } catch (error) {
    console.error(`Error deleting route stop ID: ${id}:`, error);
    
    // Enhance error information for better debugging
    if (error instanceof ApiError) {
      console.error(`API error status: ${error.status}`);
      
      if (error.status === 404) {
        throw new Error(`Route stop with ID ${id} not found. It may have been deleted already.`);
      } else if (error.status === 403) {
        throw new Error('You do not have permission to delete this route stop.');
      }
    }
    
    // Rethrow the error with additional context
    throw new Error(`Failed to delete route stop ID: ${id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

// Get or create a route stop for a maintenance
export const getOrCreateRouteStop = async (
  routeId: number, 
  maintenance: MaintenanceWithDetails
): Promise<number> => {
  try {
    console.log(`Attempting to get or create route stop for route ${routeId}`);
    
    // First validate that we have all the client information we need
    if (!maintenance.client) {
      console.error("Maintenance has no client object");
      throw new Error("Cannot create route stop: maintenance has no client data");
    }
    
    if (!maintenance.client.client) {
      console.error("Maintenance client has no client object");
      throw new Error("Cannot create route stop: client data is incomplete");
    }
    
    if (!maintenance.client.client.id) {
      console.error("Maintenance client has no ID");
      throw new Error("Cannot create route stop: client has no ID");
    }
    
    const clientId = maintenance.client.client.id;
    
    // Try to get existing stops for this route
    const stops = await fetchRouteStops(routeId);
    console.log(`Found ${stops.length} existing stops for route ${routeId}`);
    
    // First check if this client already has a stop on this route
    const existingClientStop = stops.find(stop => stop.clientId === clientId);
    if (existingClientStop) {
      console.log(`Found existing stop for this client: ID ${existingClientStop.id}`);
      return existingClientStop.id;
    }
    
    // We used to reuse the first stop, but we want each client to have their own stop
    // Create a new stop for this client instead of reusing the first one
    console.log(`Not reusing existing stops - each client should have their own stop`);
    
    // Just for debugging, log how many stops already exist
    if (stops && stops.length > 0) {
      console.log(`Route already has ${stops.length} stops, creating a new one for this client`);
    }
    
    // If we get here, we need to create a new stop
    console.log(`Creating new stop for client ID ${clientId} on route ${routeId}`);
    
    // First verify the route exists by checking its details
    try {
      await safeApiRequest<BazzaRoute>(`/api/bazza/routes/${routeId}`);
    } catch (error) {
      console.error(`Error verifying route ${routeId}:`, error);
      throw new Error(`Unable to verify route ${routeId}. Route may not exist.`);
    }
    
    try {
      // Calculate the next order index (max + 1)
      let nextOrderIndex = 1;
      if (stops && stops.length > 0) {
        const maxOrderIndex = Math.max(...stops.map(stop => stop.orderIndex || 0));
        nextOrderIndex = maxOrderIndex + 1;
        console.log(`Calculated next order index: ${nextOrderIndex} (max was ${maxOrderIndex})`);
      }
      
      // Create a new stop for this client
      const newStop = await createRouteStop({
        routeId: routeId,
        clientId: clientId,
        orderIndex: nextOrderIndex, // Use the calculated next order index
        estimatedDuration: 60, // Default 60 minutes
        customInstructions: null
      });
      
      console.log(`Successfully created new stop with ID ${newStop.id}`);
      return newStop.id;
    } catch (stopError) {
      console.error("Error creating route stop:", stopError);
      
      // In some cases, the API might return a 400 error but the stop is actually created
      // Let's double check once more if stops exist now
      try {
        const doubleCheckStops = await fetchRouteStops(routeId);
        if (doubleCheckStops && doubleCheckStops.length > 0) {
          const freshClientStop = doubleCheckStops.find(stop => stop.clientId === clientId);
          if (freshClientStop) {
            console.log(`Found client stop after error: ID ${freshClientStop.id}`);
            return freshClientStop.id;
          }
          
          // Instead of using the first stop, we'll need to create a new one
          console.log("No appropriate stop found after error, will create new one in fallback path");
        }
      } catch (checkError) {
        console.error("Error double-checking stops:", checkError);
      }
      
      // If we get here, we couldn't create or find a stop - try creating with minimal data as last resort
      try {
        console.log("Trying simplified route stop creation as fallback");
        
        // Fetch the latest stops to calculate the next order index
        const latestStops = await fetchRouteStops(routeId);
        let nextOrderIndex = 1;
        if (latestStops && latestStops.length > 0) {
          const maxOrderIndex = Math.max(...latestStops.map(stop => stop.orderIndex || 0));
          nextOrderIndex = maxOrderIndex + 1;
          console.log(`Fallback: Calculated next order index: ${nextOrderIndex} (max was ${maxOrderIndex})`);
        }
        
        const fallbackStop = await safeApiRequest<BazzaRouteStop>('/api/bazza/stops', {
          method: 'POST',
          body: JSON.stringify({
            routeId: routeId,
            clientId: clientId,
            orderIndex: nextOrderIndex // Use proper ordering
          }),
        });
        
        console.log(`Created fallback stop with ID ${fallbackStop.id}`);
        return fallbackStop.id;
      } catch (fallbackError) {
        console.error("Fallback stop creation failed:", fallbackError);
        
        // Provide a very specific error based on what we received
        if (stopError instanceof ApiError) {
          if (stopError.status === 400) {
            throw new Error(`Bad request creating route stop: ${stopError.message}`);
          } else if (stopError.status === 404) {
            throw new Error(`Route or client not found: ${stopError.message}`);
          } else if (stopError.status === 500) {
            throw new Error(`Server error creating route stop: ${stopError.message}`);
          }
        }
        
        throw new Error(`Failed to create route stop: ${stopError instanceof Error ? stopError.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error("Error getting or creating route stop:", error);
    throw error;
  }
};

// Create a new assignment with automatic route stop handling
export const createAssignment = async (
  assignmentData: {
    routeId: number;
    maintenanceId: number;
    date: string;
    status?: string;
    notes?: string | null;
    maintenance?: MaintenanceWithDetails; // Add this to pass the maintenance data
  }
): Promise<BazzaMaintenanceAssignment> => {
  // If routeStopId is not provided, try to get or create one
  if (!('routeStopId' in assignmentData) && assignmentData.maintenance) {
    try {
      console.log("Creating assignment with auto stop creation for maintenance:", assignmentData.maintenanceId);
      console.log("Maintenance client data:", 
        assignmentData.maintenance.client?.client?.id ? 
        `Client ID: ${assignmentData.maintenance.client.client.id}` : 
        "No client ID found");
      
      // First check if route exists
      let routeResponse = await safeApiRequest<BazzaRoute>(`/api/bazza/routes/${assignmentData.routeId}`);
      console.log("Route found:", routeResponse.id, routeResponse.name);
      
      const routeStopId = await getOrCreateRouteStop(assignmentData.routeId, assignmentData.maintenance);
      console.log("Using route stop ID:", routeStopId);
      
      // Create a cleaned up version of the assignment data without the maintenance field
      const cleanedData = {
        routeId: assignmentData.routeId,
        routeStopId: routeStopId,
        maintenanceId: assignmentData.maintenanceId,
        date: assignmentData.date,
        status: assignmentData.status || 'scheduled',
        notes: assignmentData.notes
      };
      
      console.log("Sending assignment data to API:", JSON.stringify(cleanedData, null, 2));
      
      try {
        const result = await safeApiRequest<BazzaMaintenanceAssignment>('/api/bazza/assignments', {
          method: 'POST',
          body: JSON.stringify(cleanedData),
        });
        console.log("Assignment created successfully:", result.id);
        return result;
      } catch (apiError) {
        console.error("API error creating assignment:", apiError);
        // Try with a different approach if we get a specific error
        if (apiError instanceof ApiError && apiError.message.includes("Foreign key constraint")) {
          console.log("Foreign key error detected, trying alternative approach...");
          
          // Try to create a new stop just for this client instead of reusing existing stops
          console.log("Creating a dedicated stop for this client as fallback");
          
          if (!assignmentData.maintenance || !assignmentData.maintenance.client || 
              !assignmentData.maintenance.client.client || !assignmentData.maintenance.client.client.id) {
            console.error("Cannot create a client-specific stop: missing client information");
            throw new Error("Cannot assign maintenance: missing client information");
          }
          
          // Create a new stop specifically for this client
          const clientId = assignmentData.maintenance.client.client.id;
          
          // Calculate proper order index for this emergency stop
          const latestStops = await fetchRouteStops(assignmentData.routeId);
          let nextOrderIndex = 1;
          if (latestStops && latestStops.length > 0) {
            const maxOrderIndex = Math.max(...latestStops.map(stop => stop.orderIndex || 0));
            nextOrderIndex = maxOrderIndex + 1;
            console.log(`Emergency: Calculated next order index: ${nextOrderIndex} (max was ${maxOrderIndex})`);
          }
          
          const emergencyStop = await createRouteStop({
            routeId: assignmentData.routeId,
            clientId: clientId,
            orderIndex: nextOrderIndex, // Use proper order index
            estimatedDuration: 60,
            customInstructions: "Created as fallback after assignment error"
          });
          
          console.log("Created emergency fallback stop:", emergencyStop.id);
          
          const fallbackData = {
            ...cleanedData,
            routeStopId: emergencyStop.id
          };
          
          return safeApiRequest<BazzaMaintenanceAssignment>('/api/bazza/assignments', {
            method: 'POST',
            body: JSON.stringify(fallbackData),
          });
        }
        throw apiError;
      }
    } catch (error) {
      console.error("Error in creating assignment with auto stop:", error);
      throw error;
    }
  } else {
    // If routeStopId is provided, use it directly
    console.log("Creating assignment with provided routeStopId:", 
      'routeStopId' in assignmentData ? assignmentData.routeStopId : 'None');
    
    return safeApiRequest<BazzaMaintenanceAssignment>('/api/bazza/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }
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
  try {
    console.log(`Deleting maintenance assignment with ID: ${id}`);
    
    const response = await safeApiRequest<void>(`/api/bazza/assignments/${id}`, {
      method: 'DELETE',
    });
    
    console.log(`Successfully deleted maintenance assignment ID: ${id}`);
    return response;
  } catch (error) {
    console.error(`Error deleting maintenance assignment ID: ${id}:`, error);
    
    // Enhance error information for better debugging
    if (error instanceof ApiError) {
      console.error(`API error status: ${error.status}`);
      
      if (error.status === 404) {
        throw new Error(`Assignment with ID ${id} not found. It may have been deleted already.`);
      } else if (error.status === 403) {
        throw new Error('You do not have permission to delete this assignment.');
      }
    }
    
    // Rethrow the error with additional context
    throw new Error(`Failed to delete assignment ID: ${id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};