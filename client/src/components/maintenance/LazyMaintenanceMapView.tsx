import React, { lazy, Suspense } from 'react';
import { Skeleton } from "../../components/ui/skeleton";
import { Card } from "../../components/ui/card";
import { MaintenanceWithDetails } from "../../lib/types";

// Lazy load the MaintenanceMapView component
const MaintenanceMapView = lazy(() => import('./MaintenanceMapView').then(module => ({ default: module.MaintenanceMapView })));

interface LazyMaintenanceMapViewProps {
  maintenances: MaintenanceWithDetails[];
  selectedView: string;
  selectedTechnician: string | null;
  selectedDay: string | null;
  onStatusUpdate: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus: boolean;
  selectedMaintenance: MaintenanceWithDetails | null;
}

export function LazyMaintenanceMapView(props: LazyMaintenanceMapViewProps) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="w-full sm:w-auto flex items-center gap-2">
            <Skeleton className="h-10 w-[200px]" />
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2">
            <Skeleton className="h-10 w-[200px]" />
          </div>
        </div>
        <Card className="p-4 mt-4">
          <Skeleton className="h-[400px] w-full" />
        </Card>
      </div>
    }>
      <MaintenanceMapView {...props} />
    </Suspense>
  );
}

export default LazyMaintenanceMapView;