import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from "date-fns";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MoreHorizontal,
  Check,
  XCircle,
  Loader2,
  FileText,
  ClipboardList
} from "lucide-react";
import { MaintenanceWithDetails } from "@/lib/types";
import { getStatusClasses } from "@/lib/types";
import { ServiceReportForm } from "@/components/maintenance/ServiceReportForm";

interface MaintenanceCalendarProps {
  maintenances: MaintenanceWithDetails[];
  month: Date;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
}

export function MaintenanceCalendar({ 
  maintenances, 
  month, 
  onStatusUpdate,
  isUpdatingStatus = false,
  selectedMaintenance = null
}: MaintenanceCalendarProps) {
  const [, navigate] = useLocation();
  // Initialize state variables
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date(todayStr + "T00:00:00"));
  const [serviceReportOpen, setServiceReportOpen] = useState(false);
  const [selectedServiceMaintenance, setSelectedServiceMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(true); // Set to true for debugging
  
  // Ensure selectedDay remains in sync with month changes
  useEffect(() => {
    // When month changes, if selected day is not in that month, reset to the 1st of new month
    if (selectedDay && !isSameMonth(selectedDay, month)) {
      const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      setSelectedDay(firstOfMonth);
      if (debugMode) console.log("Month changed, resetting selected day to:", format(firstOfMonth, "yyyy-MM-dd"));
    }
  }, [month, selectedDay, debugMode]);
  
  // Get days in month
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get weekday names
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Filter maintenances for selected day
  const selectedDayMaintenances = selectedDay
    ? maintenances.filter((m) => {
        if (debugMode) console.log("Checking maintenance date:", m.scheduleDate, "against selected day:", selectedDay);
        const maintenanceDate = new Date(m.scheduleDate);
        // Format both dates to yyyy-MM-dd for comparison to avoid timezone issues
        const maintenanceDateStr = format(maintenanceDate, "yyyy-MM-dd");
        const selectedDayStr = format(selectedDay, "yyyy-MM-dd");
        if (debugMode) console.log("Comparing:", maintenanceDateStr, "with", selectedDayStr);
        return maintenanceDateStr === selectedDayStr;
      })
    : [];
  
  // Calculate which days have maintenance scheduled
  const maintenanceDays = maintenances.map((m) => new Date(m.scheduleDate));
  
  // Count maintenances by day for badge display
  const maintenanceCountByDay = maintenances.reduce((acc, m) => {
    try {
      if (debugMode) console.log("Processing maintenance for count display:", m.id, m.scheduleDate);
      const dateStr = m.scheduleDate;
      
      // When scheduleDate is just a date string like "2025-03-09" without time
      let dayStr;
      
      if (dateStr.length <= 10) {
        // It's just a date string, use it directly
        dayStr = dateStr;
        if (debugMode) console.log("Using date string directly:", dayStr);
      } else {
        // It's a date+time string, parse and format
        const date = new Date(dateStr);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.error("Invalid date:", dateStr);
          return acc;
        }
        
        dayStr = format(date, "yyyy-MM-dd");
        if (debugMode) console.log("Formatted date:", dayStr);
      }
      
      if (!acc[dayStr]) {
        acc[dayStr] = { total: 0, statusCounts: {} };
      }
      
      acc[dayStr].total += 1;
      
      if (!acc[dayStr].statusCounts[m.status]) {
        acc[dayStr].statusCounts[m.status] = 0;
      }
      
      acc[dayStr].statusCounts[m.status] += 1;
    } catch (e) {
      console.error("Error processing maintenance date:", m.scheduleDate, e);
    }
    
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
      return "bg-green-50 border-green-200";
    }
    
    if (counts.statusCounts["in_progress"] > 0) {
      return "bg-blue-50 border-blue-200";
    }
    
    if (counts.statusCounts["scheduled"] > 0) {
      return "bg-yellow-50 border-yellow-200";
    }
    
    if (counts.statusCounts["cancelled"] === counts.total) {
      return "bg-gray-50 border-gray-200";
    }
    
    return "";
  };

  // Handle opening service report form
  const handleServiceReportOpen = (maintenance: MaintenanceWithDetails) => {
    setSelectedServiceMaintenance(maintenance);
    setServiceReportOpen(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-6">
        {/* Calendar grid */}
        <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
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
              {Array.from({ length: new Date(monthStart).getDay() }).map((_, i) => (
                <div key={`empty-start-${i}`} className="h-10 w-10 rounded-full mx-auto" />
              ))}
              
              {days.map((day) => {
                // Check if this day has maintenance
                const dateStr = format(day, "yyyy-MM-dd");
                if (debugMode) console.log("Calendar day:", dateStr, "Maintenance days:", Object.keys(maintenanceCountByDay));
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
                const hasServiceReport = maintenance.notes && maintenance.notes.includes("Service Report:");
                
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
                      </div>
                      
                      {/* If this is a completed service with a report, show a summary */}
                      {hasServiceReport && maintenance.notes && (
                        <div className="mt-3 text-sm p-2 bg-blue-50 rounded border border-blue-100">
                          <p className="font-medium text-blue-700 mb-1">Service Report Summary</p>
                          <div className="space-y-1 text-xs">
                            {maintenance.notes.split('\n').slice(0, 3).map((line, i) => (
                              <p key={i} className="text-gray-600">
                                {line.length > 60 ? line.substring(0, 60) + '...' : line}
                              </p>
                            ))}
                            {maintenance.notes.split('\n').length > 3 && (
                              <p className="text-blue-600 cursor-pointer" onClick={() => navigate(`/service-report/${maintenance.id}`)}>
                                View full report...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="border-t pt-3 flex justify-between">
                      <div className="text-sm text-muted-foreground">
                        {maintenance.technician ? (
                          <span>Assigned to: {maintenance.technician.user.name}</span>
                        ) : (
                          <span className="text-amber-500 font-medium">Not assigned</span>
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
                              onClick={() => navigate(`/service-report/${maintenance.id}`)}
                            >
                              <ClipboardList className="h-4 w-4 mr-2" />
                              {hasServiceReport ? "View/Edit Service Report" : "Submit Service Report"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => handleServiceReportOpen(maintenance)}
                            >
                              <ClipboardList className="h-4 w-4 mr-2" />
                              {hasServiceReport ? "Quick Edit (Dialog)" : "Quick Submit (Dialog)"}
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

      {/* Service Report Form */}
      <ServiceReportForm 
        open={serviceReportOpen} 
        onOpenChange={setServiceReportOpen}
        maintenance={selectedServiceMaintenance}
      />
    </div>
  );
}