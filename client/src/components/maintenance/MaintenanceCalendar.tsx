import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, parseISO } from "date-fns";
import { useLocation } from "wouter";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { normalizeDateString, parseDateSafe } from "@/lib/date-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../components/ui/dropdown-menu";
import { 
  Clock, 
  User, 
  MoreHorizontal,
  Check,
  XCircle,
  Loader2,
  FileText,
  ClipboardList,
  BarChart2,
  ExternalLink
} from "lucide-react";
import { MaintenanceWithDetails } from "../../lib/types";
import { getStatusClasses } from "../../lib/types";
import { MaintenanceReportForm } from "../../components/maintenance/MaintenanceReportForm";

interface MaintenanceCalendarProps {
  maintenances: MaintenanceWithDetails[];
  month: Date;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function MaintenanceCalendar({ 
  maintenances: originalMaintenances, 
  month, 
  onStatusUpdate,
  isUpdatingStatus = false,
  selectedMaintenance = null
}: MaintenanceCalendarProps) {
  // Use the maintenances directly from props - no sample data
  const maintenances = originalMaintenances;
  const [, navigate] = useLocation();
  // Initialize state variables
  // Use a consistent approach to generate today's date without timezone issues
  const today = new Date(); 
  const todayStr = format(today, "yyyy-MM-dd"); // Format as YYYY-MM-DD string
  // Use parseISO to create a date at midnight for consistent date handling
  const [selectedDay, setSelectedDay] = useState<Date | null>(parseISO(todayStr));
  const [serviceReportOpen, setServiceReportOpen] = useState(false);
  const [selectedServiceMaintenance, setSelectedServiceMaintenance] = useState<MaintenanceWithDetails | null>(null);
  // Ensure selectedDay remains in sync with month changes
  useEffect(() => {
    // When month changes, if selected day is not in that month, reset to the 1st of new month
    if (selectedDay && !isSameMonth(selectedDay, month)) {
      // Format and parse for consistent timezone handling
      const firstOfMonthStr = format(new Date(month.getFullYear(), month.getMonth(), 1), "yyyy-MM-dd");
      const firstOfMonth = parseISO(firstOfMonthStr);
      setSelectedDay(firstOfMonth);
    }
  }, [month, selectedDay]);
  
  // Get days in month
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get weekday names
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const selectedDayMaintenances = selectedDay
    ? maintenances.filter((m) => {
        return normalizeDateString(m.scheduleDate) === format(selectedDay, "yyyy-MM-dd");
      })
    : [];
  
  const maintenanceDays = maintenances.map((m) => parseDateSafe(m.scheduleDate));
  
  const maintenanceCountByDay = maintenances.reduce((acc, m) => {
    const dayStr = normalizeDateString(m.scheduleDate);
    if (!dayStr) return acc;
    
    if (!acc[dayStr]) {
      acc[dayStr] = { total: 0, statusCounts: {} };
    }
    
    acc[dayStr].total += 1;
    
    if (!acc[dayStr].statusCounts[m.status]) {
      acc[dayStr].statusCounts[m.status] = 0;
    }
    acc[dayStr].statusCounts[m.status] += 1;
    
    return acc;
  }, {} as Record<string, { total: number, statusCounts: Record<string, number> }>);
  
  
  // Format the maintenance type for display
  const formatMaintenanceType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Get day class based on maintenance status counts
  const getDayClass = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const counts = maintenanceCountByDay[dateStr];
    
    if (!counts) return "";
    
    if (counts.statusCounts["completed"] === counts.total) {
      return "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800";
    }
    
    if (counts.statusCounts["in_progress"] > 0) {
      return "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";
    }
    
    if (counts.statusCounts["scheduled"] > 0) {
      return "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
    }
    
    if (counts.statusCounts["cancelled"] === counts.total) {
      return "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700";
    }
    
    return "";
  };

  // Handle opening work order details - now redirects to work order page
  const handleServiceReportOpen = (maintenance: MaintenanceWithDetails, usePage = false) => {
    // Navigate to work order detail page
    navigate(`/work-orders/${maintenance.id}`);
  };
  
  return (
    <div className="space-y-4">
      {/* Header with Submit buttons */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">Calendar View</h2>
      </div>
      
      <div className="flex flex-col space-y-6">
        {/* Calendar grid */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm overflow-x-auto">
          {/* Calendar header */}
          <div className="p-2 sm:p-4 border-b">
            <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm font-medium min-w-[490px]">
              {weekDays.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>
          </div>
          
          {/* Calendar body */}
          <div className="p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-1 text-center min-w-[490px]">
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-start-${i}`} className="h-10 w-10 rounded-full mx-auto" />
              ))}
              
              {days.map((day) => {
                // Check if this day has maintenance
                const dateStr = format(day, "yyyy-MM-dd");
                const dayMaintenances = maintenanceCountByDay[dateStr];
                const hasMaintenances = !!dayMaintenances;
                // Format dates for comparison to avoid timezone issues
                const isSelected = selectedDay ? format(day, "yyyy-MM-dd") === format(selectedDay, "yyyy-MM-dd") : false;
                const isCurrentMonth = isSameMonth(day, month);
                const dayClass = getDayClass(day);
                
                return (
                  <Button
                    key={day.toISOString()}
                    variant="ghost"
                    className={`h-10 w-10 rounded-full p-0 mx-auto relative ${
                      isSelected
                        ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                        : isToday(day)
                        ? "bg-muted border border-primary"
                        : dayClass
                    } ${!isCurrentMonth ? "text-muted-foreground" : ""}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                    {hasMaintenances && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[10px] font-medium">
                        {dayMaintenances.total}
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Scheduled maintenances for selected day */}
        <div>
          <h3 className="text-lg font-medium mb-2">
            {selectedDay
              ? `Scheduled Maintenance for ${format(selectedDay, "MMMM d, yyyy")}`
              : "Select a day to view scheduled maintenance"}
          </h3>
          
          {selectedDayMaintenances.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No maintenance scheduled for this day.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedDayMaintenances.map((maintenance) => {
                const statusClasses = getStatusClasses(maintenance.status);
                const isUpdating = isUpdatingStatus && selectedMaintenance?.id === maintenance.id;
                const hasServiceReport = maintenance.notes && (maintenance.notes.includes("Service Report:") || maintenance.notes.includes("Maintenance Report:"));
                
                return (
                  <Card 
                    key={maintenance.id} 
                    className={`${maintenance.status === 'completed' ? 'border-green-200 bg-green-50/30' : ''} overflow-hidden`}
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
                        {hasServiceReport ? 
                          "Maintenance report submitted" : 
                          (maintenance.notes || "No details available")
                        }
                      </CardDescription>
                      {hasServiceReport && (
                        <div className="flex items-center text-xs text-blue-600 px-6 pb-2">
                          <FileText className="h-3 w-3 mr-1" />
                          <span>Maintenance report details available</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center text-sm">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{maintenance.notes && !hasServiceReport ? maintenance.notes.split(' ')[0] : "Time not specified"}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{maintenance.client?.user?.name || 'Client'}</span>
                        </div>
                      </div>
                      
                      {/* If this is a completed maintenance with a report, show a summary */}
                      {hasServiceReport && maintenance.notes && (
                        <div className="mt-3 text-sm p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800">
                          <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">Maintenance Report Summary</div>
                          <div className="space-y-1 text-xs">
                            {maintenance.notes.split('\n').slice(0, 3).map((line, i) => (
                              <div key={i} className="text-gray-600 dark:text-gray-400">
                                {line.length > 60 ? line.substring(0, 60) + '...' : line}
                              </div>
                            ))}
                            {maintenance.notes.split('\n').length > 3 && (
                              <div className="text-blue-600 dark:text-blue-400 cursor-pointer" onClick={() => navigate(`/work-orders/${maintenance.id}`)}>
                                View full report...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="border-t pt-3 flex justify-between">
                      <div className="text-sm text-muted-foreground flex flex-col">
                        {maintenance.technician?.user?.name ? (
                          <span>Technician: {maintenance.technician.user.name}</span>
                        ) : (
                          <span className="text-amber-500 font-medium">No technician assigned</span>
                        )}
                        {(maintenance as any).routeId ? (
                          <span className="mt-1">Route: {(maintenance as any).routeName || `Route #${(maintenance as any).routeId}`}</span>
                        ) : (
                          <span className="text-amber-500 font-medium mt-1">No route assigned</span>
                        )}
                      </div>
                      
                      {onStatusUpdate ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={isUpdating}
                              className="gap-1"
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  Actions
                                  <MoreHorizontal className="h-3 w-3 ml-1" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => navigate(`/work-orders/${maintenance.id}`)}
                            >
                              <ClipboardList className="h-4 w-4 mr-2" />
                              {hasServiceReport ? "View/Edit Maintenance Report" : "Submit Maintenance Report"}
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => navigate(`/work-orders/${maintenance.id}`)}
                            >
                              <BarChart2 className="h-4 w-4 mr-2" />
                              Maintenance Report
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => navigate(`/work-orders/${maintenance.id}`)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Work Order
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              disabled={maintenance.status === "in_progress"}
                              onClick={() => onStatusUpdate(maintenance, "in_progress")}
                            >
                              Mark In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              disabled={maintenance.status === "completed"}
                              onClick={() => onStatusUpdate(maintenance, "completed")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              disabled={maintenance.status === "cancelled"}
                              onClick={() => onStatusUpdate(maintenance, "cancelled")}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel Maintenance
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button variant="outline" size="sm">View Details</Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Report Form */}
      <MaintenanceReportForm 
        open={serviceReportOpen} 
        onOpenChange={setServiceReportOpen}
        maintenance={selectedServiceMaintenance}
      />
    </div>
  );
}

export default MaintenanceCalendar;