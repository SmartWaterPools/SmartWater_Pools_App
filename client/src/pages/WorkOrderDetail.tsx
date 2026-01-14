import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  ClipboardList,
  Building2,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkOrder } from "@shared/schema";

interface WorkOrderWithDetails extends WorkOrder {
  technician?: {
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  } | null;
  project?: {
    id: number;
    name: string;
  } | null;
  projectPhase?: {
    id: number;
    name: string;
  } | null;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
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
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const categoryColors: Record<string, string> = {
  construction: "bg-orange-100 text-orange-800",
  cleaning: "bg-cyan-100 text-cyan-800",
  maintenance: "bg-green-100 text-green-800",
  repair: "bg-red-100 text-red-800",
};

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const workOrderId = parseInt(id || "0");

  const { data: workOrder, isLoading, error } = useQuery<WorkOrderWithDetails>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: !!workOrderId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/work-orders/${workOrderId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Work Order Deleted",
        description: "The work order has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setLocation("/work-orders");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete work order",
        variant: "destructive",
      });
    },
  });

  const toggleChecklistItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!workOrder?.checklist) return;
      
      const checklist = parseChecklist(workOrder.checklist);
      const updatedChecklist = checklist.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      
      const response = await apiRequest("PATCH", `/api/work-orders/${workOrderId}`, {
        checklist: updatedChecklist,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update checklist",
        variant: "destructive",
      });
    },
  });

  const parseChecklist = (checklist: string | ChecklistItem[] | null): ChecklistItem[] => {
    if (!checklist) return [];
    if (Array.isArray(checklist)) return checklist;
    try {
      return JSON.parse(checklist);
    } catch {
      return [];
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Work Order Not Found</h3>
        <p className="text-gray-500 mt-1">
          The work order you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/work-orders">
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Orders
          </Button>
        </Link>
      </div>
    );
  }

  const checklistItems = parseChecklist(workOrder.checklist);
  const completedCount = checklistItems.filter(item => item.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/work-orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{workOrder.title}</h1>
            <div className="flex gap-2 mt-1">
              <Badge className={categoryColors[workOrder.category]}>
                {workOrder.category}
              </Badge>
              <Badge className={statusColors[workOrder.status]}>
                {workOrder.status.replace('_', ' ')}
              </Badge>
              <Badge className={priorityColors[workOrder.priority]}>
                {workOrder.priority}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this work order? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workOrder.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p>{workOrder.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Scheduled Date</h4>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(workOrder.scheduledDate)}</span>
                  </div>
                </div>
                
                {workOrder.estimatedDuration && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Duration</h4>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{workOrder.estimatedDuration} minutes</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {checklistItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Checklist</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {completedCount} / {checklistItems.length} completed
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {checklistItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleChecklistItem.mutate(item.id)}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Technician</h4>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{workOrder.technician?.user?.name || "Unassigned"}</span>
                </div>
              </div>
              
              {workOrder.project && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Project</h4>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/projects/${workOrder.project.id}`}>
                      <span className="text-primary hover:underline cursor-pointer">
                        {workOrder.project.name}
                      </span>
                    </Link>
                  </div>
                </div>
              )}
              
              {workOrder.projectPhase && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Phase</h4>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>{workOrder.projectPhase.name}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(workOrder.createdAt)}</span>
              </div>
              {workOrder.startedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span>{formatDate(workOrder.startedAt)}</span>
                </div>
              )}
              {workOrder.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{formatDate(workOrder.completedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
