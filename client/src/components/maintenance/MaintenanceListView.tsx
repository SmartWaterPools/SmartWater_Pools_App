import { useState } from "react";
import { useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  User,
  MoreHorizontal,
  Check,
  XCircle,
  Loader2,
  FileText,
  ClipboardList,
  CalendarIcon,
  MapPin
} from "lucide-react";
import { MaintenanceWithDetails, getStatusClasses } from "@/lib/types";

interface MaintenanceListViewProps {
  maintenances: MaintenanceWithDetails[];
  isLoading: boolean;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function MaintenanceListView({
  maintenances,
  isLoading,
  onStatusUpdate,
  isUpdatingStatus = false,
  selectedMaintenance = null
}: MaintenanceListViewProps) {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<string>("grouped");

  // Format the maintenance type for display
  const formatMaintenanceType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Group maintenances by date for list view
  const groupedByDate = maintenances?.reduce((acc, maintenance) => {
    const date = maintenance.scheduleDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(maintenance);
    return acc;
  }, {} as Record<string, MaintenanceWithDetails[]>);

  // Handle opening service report form
  const handleServiceReportOpen = (maintenance: MaintenanceWithDetails, usePage = false, useNewPage = false) => {
    if (useNewPage) {
      // Navigate to the SmartWater style report page
      navigate(`/service-report-page/${maintenance.id}`);
    } else if (usePage) {
      // Navigate to standard service report page
      navigate(`/service-report/${maintenance.id}`);
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  if (viewMode === "grouped") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">List View</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={viewMode === "grouped" ? "bg-primary/10" : ""}
              onClick={() => setViewMode("grouped")}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Grouped by Date
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={viewMode === "detailed" ? "bg-primary/10" : ""}
              onClick={() => setViewMode("detailed")}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Detailed View
            </Button>
          </div>
        </div>

        {groupedByDate && Object.keys(groupedByDate).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedByDate)
              .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
              .map(([date, maintenances]) => (
                <div key={date} className="space-y-2">
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                    <Badge variant="outline" className="ml-2">
                      {maintenances.length} {maintenances.length === 1 ? "service" : "services"}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {maintenances.map((maintenance) => {
                      const statusClasses = getStatusClasses(maintenance.status);
                      const isUpdating = isUpdatingStatus && selectedMaintenance?.id === maintenance.id;
                      const hasServiceReport = maintenance.notes && maintenance.notes.includes("Service Report:");
                      
                      return (
                        <Card 
                          key={maintenance.id} 
                          className={`${maintenance.status === 'completed' ? 'border-green-200 bg-green-50/30' : ''} overflow-hidden hover:shadow-md transition-shadow`}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex justify-between items-center">
                              <span className="capitalize">{formatMaintenanceType(maintenance.type)}</span>
                              <Badge 
                                className={`${statusClasses.bg} ${statusClasses.text}`}
                              >
                                {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ')}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              {hasServiceReport ? (
                                <div className="flex items-center text-xs text-blue-600">
                                  <FileText className="h-3 w-3 mr-1" />
                                  <span>Service report submitted</span>
                                </div>
                              ) : (maintenance.notes || "No details available")}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center text-sm">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{maintenance.notes && !hasServiceReport ? maintenance.notes.split(' ')[0] : "Time not specified"}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{maintenance.client.user.name}</span>
                              </div>
                              {maintenance.client?.address && (
                                <div className="flex items-center text-sm">
                                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="truncate max-w-[200px]">{maintenance.client.address}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* If this is a completed service with a report, show a summary */}
                            {hasServiceReport && maintenance.notes && (
                              <div className="mt-3 text-sm p-2 bg-blue-50 rounded border border-blue-100">
                                <div className="font-medium text-blue-700 mb-1">Service Report Summary</div>
                                <div className="space-y-1 text-xs">
                                  {maintenance.notes.split('\n').slice(0, 3).map((line, i) => (
                                    <div key={i} className="text-gray-600">
                                      {line.length > 60 ? line.substring(0, 60) + '...' : line}
                                    </div>
                                  ))}
                                  {maintenance.notes.split('\n').length > 3 && (
                                    <div className="text-blue-600 cursor-pointer" onClick={() => handleServiceReportOpen(maintenance, false, true)}>
                                      View full report...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="flex justify-between pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleServiceReportOpen(maintenance, false, true)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Service Report
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {maintenance.status !== "completed" && (
                                  <DropdownMenuItem
                                    onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "completed")}
                                    disabled={isUpdating}
                                  >
                                    {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Mark as Completed
                                  </DropdownMenuItem>
                                )}
                                
                                {maintenance.status !== "in_progress" && (
                                  <DropdownMenuItem
                                    onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "in_progress")}
                                    disabled={isUpdating}
                                  >
                                    {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Clock className="h-4 w-4 mr-2" />
                                    )}
                                    Mark as In Progress
                                  </DropdownMenuItem>
                                )}
                                
                                {maintenance.status !== "cancelled" && (
                                  <DropdownMenuItem
                                    onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "cancelled")}
                                    disabled={isUpdating}
                                  >
                                    {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Cancel Maintenance
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-muted-foreground">
                No maintenance records found matching your filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">List View</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={viewMode === "grouped" ? "bg-primary/10" : ""}
            onClick={() => setViewMode("grouped")}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Grouped by Date
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={viewMode === "detailed" ? "bg-primary/10" : ""}
            onClick={() => setViewMode("detailed")}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Detailed View
          </Button>
        </div>
      </div>

      {maintenances && maintenances.length > 0 ? (
        <div className="space-y-4">
          {maintenances
            .sort((a, b) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime())
            .map((maintenance) => {
              const statusClasses = getStatusClasses(maintenance.status);
              const isUpdating = isUpdatingStatus && selectedMaintenance?.id === maintenance.id;
              const hasServiceReport = maintenance.notes && maintenance.notes.includes("Service Report:");
              
              return (
                <Card 
                  key={maintenance.id} 
                  className={`${maintenance.status === 'completed' ? 'border-green-200 bg-green-50/30' : ''} overflow-hidden hover:shadow-md transition-shadow`}
                >
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          {maintenance.client.user.name}
                        </CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {format(parseISO(maintenance.scheduleDate), "EEEE, MMMM d, yyyy")}
                          {maintenance.notes && !hasServiceReport && (
                            <span className="ml-2">
                              <Clock className="h-3.5 w-3.5 mr-1 inline text-muted-foreground" />
                              {maintenance.notes.split(' ')[0]}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`${statusClasses.bg} ${statusClasses.text}`}
                        >
                          {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {formatMaintenanceType(maintenance.type)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Client Details</h4>
                        <div className="space-y-2 text-sm">
                          {maintenance.client?.address && (
                            <div className="flex items-start">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              <span className="flex-1">{maintenance.client.address}</span>
                            </div>
                          )}
                          {maintenance.client?.phone && (
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{maintenance.client.phone}</span>
                            </div>
                          )}
                          {maintenance.client?.poolType && (
                            <div className="flex items-center">
                              <svg className="h-4 w-4 mr-2 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>
                                {maintenance.client.poolType} Pool
                                {maintenance.client.poolSize && ` (${maintenance.client.poolSize})`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Service Details</h4>
                        {hasServiceReport && maintenance.notes ? (
                          <div className="p-2 bg-blue-50 rounded border border-blue-100">
                            <div className="font-medium text-blue-700 text-xs mb-1">Service Report Summary</div>
                            <div className="space-y-1 text-xs">
                              {maintenance.notes.split('\n').slice(0, 3).map((line, i) => (
                                <div key={i} className="text-gray-600">
                                  {line.length > 60 ? line.substring(0, 60) + '...' : line}
                                </div>
                              ))}
                              {maintenance.notes.split('\n').length > 3 && (
                                <div className="text-blue-600 cursor-pointer" onClick={() => handleServiceReportOpen(maintenance, false, true)}>
                                  View full report...
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {maintenance.notes || "No service details available."}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleServiceReportOpen(maintenance, false, true)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Service Report
                    </Button>
                    <div className="flex gap-2">
                      {maintenance.status !== "completed" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "completed")}
                          disabled={isUpdating}
                        >
                          {isUpdating && selectedMaintenance?.id === maintenance.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Complete
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {maintenance.status !== "in_progress" && (
                            <DropdownMenuItem
                              onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "in_progress")}
                              disabled={isUpdating}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Mark as In Progress
                            </DropdownMenuItem>
                          )}
                          
                          {maintenance.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => onStatusUpdate && onStatusUpdate(maintenance, "cancelled")}
                              disabled={isUpdating}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Maintenance
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-muted-foreground">
              No maintenance records found matching your filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}