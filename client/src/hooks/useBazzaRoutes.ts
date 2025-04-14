import { useQuery } from '@tanstack/react-query';
import { 
  fetchAllBazzaRoutes, 
  fetchBazzaRoutesByTechnician, 
  fetchAssignmentsByDate,
  fetchAssignmentsByTechnicianAndDateRange
} from '../services/bazzaService';
import { BazzaRoute, BazzaMaintenanceAssignment } from '../lib/types';

export function useBazzaRoutes() {
  const { 
    data: routes, 
    isLoading: isRoutesLoading, 
    error: routesError 
  } = useQuery({
    queryKey: ['/api/bazza/routes'],
    queryFn: fetchAllBazzaRoutes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    routes,
    isRoutesLoading,
    routesError
  };
}

export function useBazzaRoutesByTechnician(technicianId: number | null) {
  const { 
    data: technicianRoutes = [], 
    isLoading: isTechnicianRoutesLoading, 
    error: technicianRoutesError 
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
        // If it's an unauthorized error, just return an empty array instead of throwing
        const errorObj = error as any;
        if (errorObj?.message?.includes('Unauthorized') || 
            errorObj?.status === 401) {
          console.warn('Unauthorized error when fetching routes, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: technicianId !== null && technicianId !== undefined,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (unauthorized)
      const errorObj = error as any;
      if (errorObj?.status === 401 || 
          errorObj?.message?.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3; // Only retry other errors up to 3 times
    }
  });

  return {
    technicianRoutes: technicianRoutes || [],
    isTechnicianRoutesLoading,
    technicianRoutesError
  };
}

export function useBazzaAssignmentsByDate(date: string) {
  const { 
    data: assignments, 
    isLoading: isAssignmentsLoading, 
    error: assignmentsError 
  } = useQuery({
    queryKey: ['/api/bazza/assignments/date', date],
    queryFn: () => fetchAssignmentsByDate(date),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    assignments,
    isAssignmentsLoading,
    assignmentsError
  };
}

export function useBazzaAssignmentsByTechnicianAndDateRange(
  technicianId: number | null, 
  startDate: string, 
  endDate: string
) {
  const { 
    data: assignments, 
    isLoading: isAssignmentsLoading, 
    error: assignmentsError 
  } = useQuery({
    queryKey: ['/api/bazza/assignments/technician/date-range', technicianId, startDate, endDate],
    queryFn: () => technicianId 
      ? fetchAssignmentsByTechnicianAndDateRange(technicianId, startDate, endDate) 
      : Promise.resolve([]),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!technicianId
  });

  return {
    assignments,
    isAssignmentsLoading,
    assignmentsError
  };
}