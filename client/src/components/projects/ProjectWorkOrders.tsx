import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardList, Calendar, Clock, User, Search, Layers } from "lucide-react";
import { Link } from "wouter";
import type { WorkOrder } from "@shared/schema";

interface ProjectPhase {
  id: number;
  name: string;
}

interface ProjectWorkOrdersProps {
  projectId: number;
  projectName: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
  on_hold: "bg-orange-100 text-orange-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800",
  normal: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export function ProjectWorkOrders({ projectId, projectName }: ProjectWorkOrdersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['/api/projects', projectId, 'work-orders'],
  });

  const { data: phases = [] } = useQuery<ProjectPhase[]>({
    queryKey: ['/api/projects', projectId, 'phases'],
  });

  const getPhaseName = (phaseId: number | null | undefined): string | null => {
    if (!phaseId) return null;
    const phase = phases.find(p => p.id === phaseId);
    return phase?.name || null;
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch = wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.description && wo.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-col xs:flex-row gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full xs:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search work orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full xs:w-auto"
            />
          </div>
        </div>
        <Link href={`/work-orders?projectId=${projectId}`}>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        </Link>
      </div>

      {filteredWorkOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Work Orders</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                {searchQuery || statusFilter !== "all" 
                  ? "No work orders match your filters. Try adjusting your search criteria."
                  : `No work orders have been created for ${projectName} yet. Create one to track site visits and job completion.`
                }
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href={`/work-orders?projectId=${projectId}`}>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Work Order
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredWorkOrders.map((workOrder) => (
            <Link key={workOrder.id} href={`/work-orders/${workOrder.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <h4 className="font-medium">{workOrder.title}</h4>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={statusColors[workOrder.status] || "bg-gray-100"}>
                            {workOrder.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={priorityColors[workOrder.priority] || "bg-gray-100"}>
                            {workOrder.priority}
                          </Badge>
                        </div>
                      </div>
                      {workOrder.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {workOrder.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(workOrder.scheduledDate)}
                        </span>
                        {workOrder.estimatedDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {workOrder.estimatedDuration} min
                          </span>
                        )}
                        {getPhaseName(workOrder.projectPhaseId) && (
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {getPhaseName(workOrder.projectPhaseId)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
