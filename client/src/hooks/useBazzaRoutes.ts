import { useQuery } from '@tanstack/react-query';
import { 
  fetchAllBazzaRoutes, 
  fetchBazzaRoutesByTechnician, 
  fetchAssignmentsByDate,
  fetchAssignmentsByTechnicianAndDateRange
} from '../services/bazzaService.new';
import { BazzaRoute, BazzaMaintenanceAssignment } from '../lib/types';
import { ApiError } from '../lib/enhancedApiClient';

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
        return await fetchAllBazzaRoutes();
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
        if (!technicianId) return [];
        const result = await fetchBazzaRoutesByTechnician(technicianId);
        console.log(`Successfully fetched ${result.length} routes for technician ID: ${technicianId}`);
        return result;
      } catch (error) {
        console.error(`Error fetching routes for technician ID: ${technicianId}`, error);
        
        // Return empty array for 401 errors instead of throwing
        if (error instanceof ApiError && error.status === 401) {
          console.warn('Unauthorized when fetching routes by technician, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: technicianId !== null && technicianId !== undefined,
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