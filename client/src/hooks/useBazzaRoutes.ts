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
    data: technicianRoutes, 
    isLoading: isTechnicianRoutesLoading, 
    error: technicianRoutesError 
  } = useQuery({
    queryKey: ['/api/bazza/routes/technician', technicianId],
    queryFn: () => technicianId ? fetchBazzaRoutesByTechnician(technicianId) : Promise.resolve([]),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: technicianId !== null
  });

  return {
    technicianRoutes,
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