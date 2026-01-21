import React, { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Check,
  Clock,
  FileText,
  MapPin,
  MoreHorizontal,
  PlayCircle,
  User,
  XCircle,
  ChevronDown,
  AlertTriangle,
  MessageSquare,
  Navigation,
  ClipboardList,
  ExternalLink
} from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { MaintenanceWithDetails, TechnicianWithUser, formatDate, getStatusClasses } from "../../lib/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { CreateWorkOrderFromMaintenanceDialog } from "./CreateWorkOrderFromMaintenanceDialog";

type MaintenanceListViewProps = {
  maintenances: MaintenanceWithDetails[];
  isLoading: boolean;
  onStatusUpdate?: (maintenance: MaintenanceWithDetails, newStatus: string) => void;
  isUpdatingStatus?: boolean;
  selectedMaintenance?: MaintenanceWithDetails | null;
};

export function MaintenanceListView({
  maintenances,
  isLoading,
  onStatusUpdate,
  isUpdatingStatus,
  selectedMaintenance,
}: MaintenanceListViewProps) {
  const [, navigate] = useLocation();
  
  // State for grouping and pagination
  const [groupBy, setGroupBy] = useState<'date' | 'status' | 'client' | 'technician' | null>(null);
  
  // Work Order Dialog State
  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);
  const [selectedMaintenanceForWorkOrder, setSelectedMaintenanceForWorkOrder] = useState<MaintenanceWithDetails | null>(null);
  
  
  // Get technicians for the dropdown
  const { data: technicians = [], isLoading: isTechniciansLoading } = useQuery<TechnicianWithUser[]>({
    queryKey: ['/api/technicians'],
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  const { toast } = useToast();
  
  // Check RingCentral SMS connection status
  const { data: smsStatus } = useQuery<{ connected: boolean; phoneNumber?: string }>({
    queryKey: ['/api/sms/connection-status'],
    staleTime: 60 * 1000
  });
  
  // SMS mutations
  const sendOnTheWaySms = useMutation({
    mutationFn: async (maintenanceId: number) => {
      const res = await apiRequest('POST', '/api/sms/send-on-the-way', { maintenanceId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "On The Way notification sent to client.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SMS Failed",
        description: error.message || "Could not send SMS notification.",
        variant: "destructive",
      });
    },
  });
  
  const sendJobCompleteSms = useMutation({
    mutationFn: async (maintenanceId: number) => {
      const res = await apiRequest('POST', '/api/sms/send-job-complete', { maintenanceId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Job Complete notification sent to client.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SMS Failed",
        description: error.message || "Could not send SMS notification.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating technician assignment via work order team
  const updateTechnicianMutation = useMutation({
    mutationFn: async ({ workOrderId, technicianId }: { workOrderId: number, technicianId: number | null }) => {
      if (technicianId === null) {
        return { success: true };
      }
      const response = await apiRequest('POST', `/api/work-orders/${workOrderId}/team`, {
        userId: technicianId,
        role: 'technician'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update technician');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Technician updated',
        description: 'Work order team has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update technician: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Find assigned but not routed maintenance items
  // (checking for technician assignment but no start time)
  const unroutedMaintenances = React.useMemo(() => {
    return maintenances.filter(m => 
      m.technicianId && !m.startTime && m.status === 'scheduled'
    );
  }, [maintenances]);

  // Group maintenances based on the selected grouping option
  const groupedMaintenances = React.useMemo(() => {
    // Filter out unrouted maintenance items if we're showing them separately
    const filteredMaintenances = groupBy === null 
      ? maintenances.filter(m => !(m.technicianId && !m.startTime && m.status === 'scheduled'))
      : maintenances;
      
    if (!groupBy) return { 'All Maintenance': filteredMaintenances };

    return filteredMaintenances.reduce((acc, maintenance) => {
      let groupKey: string;

      switch (groupBy) {
        case 'date':
          groupKey = formatDate(maintenance.scheduleDate);
          break;
        case 'status':
          groupKey = maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ');
          break;
        case 'client':
          groupKey = maintenance.client?.user?.name || 'Unknown Client';
          break;
        case 'technician':
          groupKey = maintenance.technician?.user?.name || 'Unassigned';
          break;
        default:
          groupKey = 'All Maintenance';
      }

      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      
      acc[groupKey].push(maintenance);
      return acc;
    }, {} as Record<string, MaintenanceWithDetails[]>);
  }, [maintenances, groupBy, unroutedMaintenances]);

  // Format a maintenance type for display
  const formatMaintenanceType = (type: string | undefined | null) => {
    if (!type) return 'General Maintenance';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  if (!maintenances.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center space-y-3">
          <h3 className="text-lg font-medium">No maintenance records found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or adding new maintenance records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {groupBy ? `Group by: ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}` : 'Group by'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setGroupBy(null)}>
              No Grouping
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setGroupBy('date')}>
              Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy('status')}>
              Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy('client')}>
              Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy('technician')}>
              Technician
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Display unrouted maintenance tasks at the top when not grouped */}
      {unroutedMaintenances.length > 0 && groupBy === null && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-medium text-amber-700">
              Assigned But Not Routed ({unroutedMaintenances.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {unroutedMaintenances.map((maintenance) => {
              return (
              <Card key={maintenance.id} className="overflow-hidden border-amber-200">
                <CardHeader className="pb-2 bg-amber-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{maintenance.client?.user?.name}</CardTitle>
                      <CardDescription className="text-xs flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {maintenance.client?.user?.address || maintenance.client?.client?.address || 'No address'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {maintenance.status && (
                        <Badge 
                          className={getStatusClasses(maintenance.status).bg}
                        >
                          {maintenance.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(maintenance.scheduleDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {!isTechniciansLoading ? (
                        <Select
                          value={maintenance.technicianId?.toString() || 'unassigned'}
                          onValueChange={(value) => {
                            const techId = value === 'unassigned' ? null : parseInt(value, 10);
                            updateTechnicianMutation.mutate({ 
                              workOrderId: maintenance.id, 
                              technicianId: techId 
                            });
                          }}
                          disabled={updateTechnicianMutation.isPending}
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs">
                            <SelectValue placeholder="Select technician" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {technicians.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id.toString()}>
                                {tech.user?.name || `Technician #${tech.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{maintenance.technician?.user?.name || 'Unassigned'}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-medium">Type: </span>
                    <span className="text-sm">{formatMaintenanceType(maintenance.type)}</span>
                  </div>
                  {maintenance.notes && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Notes: </span>
                      <span className="text-muted-foreground">{maintenance.notes.length > 100 
                        ? `${maintenance.notes.substring(0, 100)}...` 
                        : maintenance.notes}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/work-orders/${maintenance.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => navigate(`/work-orders/${maintenance.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Work Order Details
                      </DropdownMenuItem>
                      {onStatusUpdate && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'scheduled')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Mark as Scheduled
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'in_progress')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Mark as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'completed')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'cancelled')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Mark as Cancelled
                          </DropdownMenuItem>
                        </>
                      )}
                      {smsStatus?.connected && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>SMS Notifications</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => sendOnTheWaySms.mutate(maintenance.id)}
                            disabled={sendOnTheWaySms.isPending}
                            data-testid="button-send-on-the-way-sms"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            {sendOnTheWaySms.isPending ? 'Sending...' : 'Send "On The Way" SMS'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => sendJobCompleteSms.mutate(maintenance.id)}
                            disabled={sendJobCompleteSms.isPending}
                            data-testid="button-send-job-complete-sms"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {sendJobCompleteSms.isPending ? 'Sending...' : 'Send "Job Complete" SMS'}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            );})}
          </div>
        </div>
      )}

      {Object.entries(groupedMaintenances).map(([groupName, groupMaintenance]) => (
        <div key={groupName} className="space-y-2">
          <h3 className="text-lg font-medium">{groupName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupMaintenance.map((maintenance) => {
              return (
              <Card key={maintenance.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{maintenance.client?.user?.name}</CardTitle>
                      <CardDescription className="text-xs flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {maintenance.client?.user?.address || maintenance.client?.client?.address || 'No address'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {maintenance.status && (
                        <Badge 
                          className={getStatusClasses(maintenance.status).bg}
                        >
                          {maintenance.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(maintenance.scheduleDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {!isTechniciansLoading ? (
                        <Select
                          value={maintenance.technicianId?.toString() || 'unassigned'}
                          onValueChange={(value) => {
                            const techId = value === 'unassigned' ? null : parseInt(value, 10);
                            updateTechnicianMutation.mutate({ 
                              workOrderId: maintenance.id, 
                              technicianId: techId 
                            });
                          }}
                          disabled={updateTechnicianMutation.isPending}
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs">
                            <SelectValue placeholder="Select technician" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {technicians.map((tech) => (
                              <SelectItem key={tech.id} value={tech.id.toString()}>
                                {tech.user?.name || `Technician #${tech.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span>{maintenance.technician?.user?.name || 'Unassigned'}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-medium">Type: </span>
                    <span className="text-sm">{formatMaintenanceType(maintenance.type)}</span>
                  </div>
                  {maintenance.notes && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Notes: </span>
                      <span className="text-muted-foreground">{maintenance.notes.length > 100 
                        ? `${maintenance.notes.substring(0, 100)}...` 
                        : maintenance.notes}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/work-orders/${maintenance.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => navigate(`/work-orders/${maintenance.id}`)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Work Order Details
                      </DropdownMenuItem>
                      {onStatusUpdate && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'scheduled')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Mark as Scheduled
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'in_progress')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Mark as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'completed')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onStatusUpdate(maintenance, 'cancelled')}
                            disabled={isUpdatingStatus && selectedMaintenance?.id === maintenance.id}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Mark as Cancelled
                          </DropdownMenuItem>
                        </>
                      )}
                      {smsStatus?.connected && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>SMS Notifications</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => sendOnTheWaySms.mutate(maintenance.id)}
                            disabled={sendOnTheWaySms.isPending}
                            data-testid="button-send-on-the-way-sms-grouped"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            {sendOnTheWaySms.isPending ? 'Sending...' : 'Send "On The Way" SMS'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => sendJobCompleteSms.mutate(maintenance.id)}
                            disabled={sendJobCompleteSms.isPending}
                            data-testid="button-send-job-complete-sms-grouped"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {sendJobCompleteSms.isPending ? 'Sending...' : 'Send "Job Complete" SMS'}
                          </DropdownMenuItem>
                        </>
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
      
      <CreateWorkOrderFromMaintenanceDialog
        open={workOrderDialogOpen}
        onOpenChange={setWorkOrderDialogOpen}
        maintenance={selectedMaintenanceForWorkOrder}
      />
    </div>
  );
}

export default MaintenanceListView;