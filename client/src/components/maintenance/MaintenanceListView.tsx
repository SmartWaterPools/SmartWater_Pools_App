import React, { useState } from 'react';
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
} from "lucide-react";
import { MaintenanceWithDetails, formatDate, getStatusClasses } from "../../lib/types";

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
  // State for grouping and pagination
  const [groupBy, setGroupBy] = useState<'date' | 'status' | 'client' | 'technician' | null>(null);

  // Group maintenances based on the selected grouping option
  const groupedMaintenances = React.useMemo(() => {
    if (!groupBy) return { 'All Maintenance': maintenances };

    return maintenances.reduce((acc, maintenance) => {
      let groupKey: string;

      switch (groupBy) {
        case 'date':
          groupKey = formatDate(new Date(maintenance.scheduleDate));
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
  }, [maintenances, groupBy]);

  // Format a maintenance type for display
  const formatMaintenanceType = (type: string) => {
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

      {Object.entries(groupedMaintenances).map(([groupName, groupMaintenance]) => (
        <div key={groupName} className="space-y-2">
          <h3 className="text-lg font-medium">{groupName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupMaintenance.map((maintenance) => (
              <Card key={maintenance.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{maintenance.client?.user?.name}</CardTitle>
                      <CardDescription className="text-xs flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {maintenance.client?.address || 'No address'}
                      </CardDescription>
                    </div>
                    <div>
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
                      <span>{formatDate(new Date(maintenance.scheduleDate))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{maintenance.technician?.user?.name || 'Unassigned'}</span>
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
                  <Button variant="outline" size="sm">
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MaintenanceListView;