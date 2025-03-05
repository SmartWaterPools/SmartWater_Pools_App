import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CalendarIcon, 
  PlusCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  User,
  MoreHorizontal,
  Check,
  XCircle,
  Loader2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MaintenanceCalendar } from "@/components/maintenance/MaintenanceCalendar";
import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";
import { 
  MaintenanceWithDetails, 
  formatDate, 
  getStatusClasses 
} from "@/lib/types";
import { format, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Format a maintenance type for display
const formatMaintenanceType = (type: string) => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function Maintenance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch maintenances
  const { data: maintenances, isLoading } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ["/api/maintenances"],
  });

  // Filter maintenances based on search and status
  const filteredMaintenances = maintenances?.filter(maintenance => {
    // If date filter is applied, only show maintenances for that date
    if (date && !isSameDay(new Date(maintenance.scheduleDate), date)) return false;
    
    // Apply status filter if not set to "all"
    if (statusFilter !== "all" && maintenance.status !== statusFilter) return false;
    
    // Apply search filter to client name
    if (searchTerm && !maintenance.client.user.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  // Group maintenances by date for list view
  const groupedByDate = filteredMaintenances?.reduce((acc, maintenance) => {
    const date = maintenance.scheduleDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(maintenance);
    return acc;
  }, {} as Record<string, MaintenanceWithDetails[]>);

  // Mutation to update maintenance status
  const updateMaintenanceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/maintenances/${id}`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Maintenance updated",
        description: "The maintenance status has been updated successfully.",
      });
      setIsUpdatingStatus(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update maintenance",
        description: "There was an error updating the maintenance status. Please try again.",
        variant: "destructive",
      });
      setIsUpdatingStatus(false);
    }
  });

  // Update status handler
  const handleStatusUpdate = (maintenance: MaintenanceWithDetails, newStatus: string) => {
    setSelectedMaintenance(maintenance);
    setIsUpdatingStatus(true);
    updateMaintenanceMutation.mutate({ id: maintenance.id, status: newStatus });
  };

  // Month navigation handlers
  const handlePreviousMonth = () => {
    setMonth(subMonths(month, 1));
  };

  const handleNextMonth = () => {
    setMonth(addMonths(month, 1));
  };

  // Clear date filter
  const clearDateFilter = () => {
    setDate(undefined);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Maintenance</h1>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 md:mt-0">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search clients..." 
              className="pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 flex justify-between items-center border-b">
                  <span className="text-sm font-medium">Filter by date</span>
                  {date && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearDateFilter}
                      className="h-8 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter !== "all" ? (
                    <span className="capitalize">{statusFilter}</span>
                  ) : (
                    "Status"
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("scheduled")}>
                  Scheduled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_progress")}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={() => setOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Schedule Maintenance
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="mb-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">{format(month, 'MMMM yyyy')}</h2>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {date && (
                  <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                    <CalendarIcon className="h-3 w-3" />
                    {format(date, "PPP")}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-2 p-0"
                      onClick={clearDateFilter}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-96 w-full" />
                </div>
              ) : (
                <MaintenanceCalendar 
                  maintenances={filteredMaintenances || []} 
                  month={month}
                  onStatusUpdate={handleStatusUpdate}
                  isUpdatingStatus={isUpdatingStatus}
                  selectedMaintenance={selectedMaintenance}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="list">
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-28 w-full rounded-lg" />
                        <Skeleton className="h-28 w-full rounded-lg" />
                        <Skeleton className="h-28 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : groupedByDate && Object.keys(groupedByDate).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedByDate)
                    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                    .map(([date, maintenances]) => (
                      <div key={date} className="space-y-2">
                        <h3 className="text-md font-semibold flex items-center gap-2">
                          {formatDate(date)}
                          {isToday(new Date(date)) && (
                            <Badge variant="outline" className="bg-primary/10 text-primary">Today</Badge>
                          )}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {maintenances.map(maintenance => {
                            const statusClasses = getStatusClasses(maintenance.status);
                            return (
                              <div 
                                key={maintenance.id} 
                                className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm transition"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-medium text-foreground">
                                      {maintenance.client.user.name}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                      {formatMaintenanceType(maintenance.type)}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses.bg} ${statusClasses.text}`}>
                                    {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 mb-2">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {maintenance.notes ? maintenance.notes.split(' ')[0] : "Time not specified"}
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center text-sm text-gray-600">
                                    <User className="h-4 w-4 mr-1" />
                                    {maintenance.technician ? maintenance.technician.user.name : 'Unassigned'}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-gray-600"
                                        disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                                      >
                                        {isUpdatingStatus && selectedMaintenance?.id === maintenance.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <MoreHorizontal className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        className="cursor-pointer"
                                        disabled={maintenance.status === "in_progress"}
                                        onClick={() => handleStatusUpdate(maintenance, "in_progress")}
                                      >
                                        Mark In Progress
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="cursor-pointer"
                                        disabled={maintenance.status === "completed"}
                                        onClick={() => handleStatusUpdate(maintenance, "completed")}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Mark Completed
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="cursor-pointer"
                                        disabled={maintenance.status === "cancelled"}
                                        onClick={() => handleStatusUpdate(maintenance, "cancelled")}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Cancel Maintenance
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No maintenance appointments found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Maintenance form dialog */}
      <MaintenanceForm 
        open={open} 
        onOpenChange={setOpen} 
        initialDate={date}
      />
    </div>
  );
}
