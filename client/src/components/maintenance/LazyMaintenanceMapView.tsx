import React, { lazy, Suspense, Component, ReactNode } from 'react';
import { Skeleton } from "../../components/ui/skeleton";
import { MaintenanceWithDetails } from "../../lib/types";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";

// Lazy load the MaintenanceMapView component
const MaintenanceMapView = lazy(() => import('./MaintenanceMapView').then(module => ({ default: module.MaintenanceMapView })));

// Error boundary to catch map-related crashes
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Map Error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col justify-center items-center h-[600px] bg-gray-50 border rounded-lg">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <p className="text-gray-700 font-medium mb-2">Unable to load map</p>
          <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
            There was an issue loading the map view. This could be due to network issues or missing configuration.
          </p>
          <Button onClick={this.handleRetry} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface LazyMaintenanceMapViewProps {
  maintenances: MaintenanceWithDetails[];
  isLoading?: boolean;
  selectedView?: string;
  selectedTechnician?: number | null;
  selectedDay?: string | null;
  workOrders?: any[];
  routes?: any[];
  technicians?: any[];
  onViewChange?: (view: string) => void;
  onTechnicianChange?: (techId: number | null) => void;
  selectedRouteId?: number | null;
  onRouteChange?: (routeId: number | null) => void;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function LazyMaintenanceMapView(props: LazyMaintenanceMapViewProps) {
  return (
    <MapErrorBoundary>
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
    </MapErrorBoundary>
  );
}

export default LazyMaintenanceMapView;