import { useQuery } from '@tanstack/react-query';
import { 
  fetchAllBazzaRoutes, 
  fetchBazzaRoutesByTechnician, 
  fetchAssignmentsByDate,
  fetchAssignmentsByTechnicianAndDateRange,
  fetchRouteStops,
  ApiError
} from '../services/bazzaService';
import { BazzaRoute, BazzaMaintenanceAssignment, BazzaRouteStop } from '../lib/types';

/**
 * Hook to fetch all bazza routes
 */
export function useBazzaRoutes() {
  const { 
    data = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/bazza/routes'],
    queryFn: async () => {
      try {
        const result = await fetchAllBazzaRoutes();
        
        // Ensure all routes have both isActive and active properties
        const processedRoutes = result.map(route => {
          if (route.isActive !== undefined && route.active === undefined) {
            return { ...route, active: route.isActive };
          } else if (route.active !== undefined && route.isActive === undefined) {
            return { ...route, isActive: route.active };
          }
          return route;
        });
        
        return processedRoutes;
      } catch (error) {
        console.error('Error in useBazzaRoutes hook:', error);
        
        // Return empty array for 401 errors instead of throwing
        if (error instanceof ApiError && error.status === 401) {
          console.warn('Unauthorized when fetching routes, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });

  return {
    routes: data,
    isRoutesLoading: isLoading,
    routesError: error
  };
}

/**
 * Hook to fetch routes for a specific technician
 * With universal fallback mechanism for all technicians including special handling for problem cases
 */
export function useBazzaRoutesByTechnician(technicianId: number | null) {
  const { 
    data = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/bazza/routes/technician', technicianId],
    queryFn: async () => {
      console.log(`Fetching routes for technician ID: ${technicianId}`);
      try {
        // Handle null/undefined technician ID
        if (technicianId === null || technicianId === undefined) {
          console.log('No technician ID provided, returning empty routes array');
          return [];
        }
        
        // Track known problem technicians for enhanced debugging
        const isKnownProblemTechnician = technicianId === 10; // ID 10 is Travis Donald
        
        if (isKnownProblemTechnician) {
          console.log(`Enhanced logging enabled for known problem technician ID: ${technicianId}`);
        }
        
        // Make the API call with universal fallback mechanism
        let result;
        try {
          // The service-level fetchBazzaRoutesByTechnician now includes multiple fallback mechanisms
          result = await fetchBazzaRoutesByTechnician(technicianId);
          
          // Enhanced logging for debugging specific technicians or empty results
          if (isKnownProblemTechnician || (Array.isArray(result) && result.length === 0)) {
            console.log(`Primary fetch result for technician ${technicianId}: ${Array.isArray(result) ? result.length : 'not array'} routes`);
          }
        } catch (apiError) {
          console.error(`API error when fetching routes for technician ${technicianId}:`, apiError);
          
          // Handle unauthorized errors gracefully
          if (apiError instanceof ApiError && (apiError.status === 401 || apiError.status === 403)) {
            console.warn('Authorization error when fetching routes, returning empty array');
            return [];
          }
          
          // For API errors, try a universal hook-level fallback
          console.log(`API error occurred - attempting hook-level fallback for technician ${technicianId}`);
          
          try {
            const allRoutes = await fetchAllBazzaRoutes();
            const technicianRoutes = allRoutes.filter(route => route.technicianId === technicianId);
            console.log(`Hook-level fallback found ${technicianRoutes.length} routes for technician ${technicianId}`);
            
            if (technicianRoutes.length > 0) {
              result = technicianRoutes;
            } else {
              console.warn('Universal fallback found no routes, returning empty array');
              return [];
            }
          } catch (fallbackError) {
            console.error('Hook-level fallback also failed:', fallbackError);
            return [];
          }
        }
        
        // Verify result is an array to prevent crashes
        if (!Array.isArray(result)) {
          console.error('Expected array but received:', typeof result);
          return [];
        }
        
        // Ensure all routes have both isActive and active properties
        const processedRoutes = result.map(route => {
          try {
            // First ensure route is a valid object
            if (!route || typeof route !== 'object') {
              console.warn('Invalid route found in results, skipping:', route);
              return null;
            }
            
            // Clone with both active properties for consistency
            if (route.isActive !== undefined && route.active === undefined) {
              return { ...route, active: route.isActive };
            } else if (route.active !== undefined && route.isActive === undefined) {
              return { ...route, isActive: route.active };
            }
            
            return route;
          } catch (processingError) {
            console.error('Error processing route:', processingError);
            return null;
          }
        }).filter(route => route !== null) as BazzaRoute[]; // Filter out nulls
        
        console.log(`Successfully processed ${processedRoutes.length} routes for technician ID: ${technicianId}`);
        
        return processedRoutes;
      } catch (error) {
        console.error(`Unhandled error in useBazzaRoutesByTechnician for ID: ${technicianId}`, error);
        // Return empty array for all errors rather than crashing the component
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always enable the query, but handle empty technician ID inside queryFn
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });

  return {
    technicianRoutes: data,
    isTechnicianRoutesLoading: isLoading,
    technicianRoutesError: error
  };
}

/**
 * Hook to fetch assignments for a specific date
 */
export function useBazzaAssignmentsByDate(date: string) {
  const { 
    data = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/bazza/assignments/date', date],
    queryFn: async () => {
      try {
        return await fetchAssignmentsByDate(date);
      } catch (error) {
        // Return empty array for 401 errors instead of throwing
        if (error instanceof ApiError && error.status === 401) {
          console.warn('Unauthorized when fetching assignments by date, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });

  return {
    assignments: data,
    isAssignmentsLoading: isLoading,
    assignmentsError: error
  };
}

/**
 * Hook to fetch assignments for a technician within a date range
 */
export function useBazzaAssignmentsByTechnicianAndDateRange(
  technicianId: number | null, 
  startDate: string, 
  endDate: string
) {
  const { 
    data = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/bazza/assignments/technician/date-range', technicianId, startDate, endDate],
    queryFn: async () => {
      try {
        if (!technicianId) return [];
        return await fetchAssignmentsByTechnicianAndDateRange(technicianId, startDate, endDate);
      } catch (error) {
        // Return empty array for 401 errors instead of throwing
        if (error instanceof ApiError && error.status === 401) {
          console.warn('Unauthorized when fetching assignments by technician and date range, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!technicianId,
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });

  return {
    assignments: data,
    isAssignmentsLoading: isLoading,
    assignmentsError: error
  };
}

/**
 * Hook to fetch stops for a specific route
 */
export function useRouteStops(routeId: number | null) {
  const { 
    data = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/bazza/routes/stops', routeId],
    queryFn: async () => {
      try {
        if (!routeId) return [];
        return await fetchRouteStops(routeId);
      } catch (error) {
        // Return empty array for 401 errors instead of throwing
        if (error instanceof ApiError && error.status === 401) {
          console.warn('Unauthorized when fetching route stops, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!routeId,
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });

  return {
    stops: data,
    isStopsLoading: isLoading,
    stopsError: error
  };
}