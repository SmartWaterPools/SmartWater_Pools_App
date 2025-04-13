import React, { lazy, Suspense } from 'react';
import { Skeleton } from "../../components/ui/skeleton";
import { MaintenanceWithDetails } from "../../lib/types";

// Lazy load the MaintenanceMapView component
const MaintenanceMapView = lazy(() => import('./MaintenanceMapView').then(module => ({ default: module.MaintenanceMapView })));

interface LazyMaintenanceMapViewProps {
  maintenances: MaintenanceWithDetails[];
  isLoading?: boolean;
  selectedView?: string;
  selectedTechnician?: number | null;
  selectedDay?: string | null;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function LazyMaintenanceMapView(props: LazyMaintenanceMapViewProps) {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[600px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <Skeleton className="h-[600px] w-full rounded-lg" />
          <div className="mt-4 text-sm text-gray-500">Loading map view...</div>
        </div>
      </div>
    }>
      <MaintenanceMapView {...props} />
    </Suspense>
  );
}

export default LazyMaintenanceMapView;