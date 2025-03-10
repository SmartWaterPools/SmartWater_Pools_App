import React, { lazy, Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { MaintenanceWithDetails } from "@/lib/types";

// Lazy load the MaintenanceListView component
const MaintenanceListView = lazy(() => import('./MaintenanceListView').then(module => ({ default: module.MaintenanceListView })));

interface LazyMaintenanceListViewProps {
  maintenances: MaintenanceWithDetails[];
  isLoading: boolean;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function LazyMaintenanceListView(props: LazyMaintenanceListViewProps) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    }>
      <MaintenanceListView {...props} />
    </Suspense>
  );
}

export default LazyMaintenanceListView;