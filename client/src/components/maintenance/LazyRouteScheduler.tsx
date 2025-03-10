import React, { lazy, Suspense } from 'react';
import { Skeleton } from "../../components/ui/skeleton";
import { Card, CardContent } from "../../components/ui/card";

// Lazy load the RouteScheduler component
const RouteScheduler = lazy(() => import('./RouteScheduler').then(module => ({ default: module.RouteScheduler })));

export function LazyRouteScheduler() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-8 w-40" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <RouteScheduler />
    </Suspense>
  );
}

export default LazyRouteScheduler;