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
  Layers,
  Plus,
  GripVertical,
  History,
  FileText,
  Wrench,
  ExternalLink,
  ClipboardCheck
} from "lucide-react";
import { TechnicianWorkflow } from "@/components/work-orders/TechnicianWorkflow";
import { WorkOrderPhotos } from "@/components/work-orders/WorkOrderPhotos";
import { WorkOrderChemicals } from "@/components/work-orders/WorkOrderChemicals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkOrder, WorkOrderAuditLog } from "@shared/schema";
import { WORK_ORDER_CATEGORIES, WORK_ORDER_STATUSES, WORK_ORDER_PRIORITIES } from "@shared/schema";
import { WorkOrderItemsSection } from "@/components/WorkOrderItemsSection";
import { WorkOrderTimeTracking } from "@/components/WorkOrderTimeTracking";
import { WorkOrderTeamMembers } from "@/components/WorkOrderTeamMembers";
import { FieldServiceReportForm } from "@/components/reports/FieldServiceReportForm";
import { QuickContactActions } from "@/components/communications/QuickContactActions";

interface ClientInfo {
  id: number;
  user: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

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
  workOrderRequest?: {
    id: number;
    title: string;
  } | null;
  maintenanceAssignment?: {
    id: number;
    scheduleDate?: string | null;
    clientName?: string;
  } | null;
  repair?: {
    id: number;
    issueDescription: string;
  } | null;
}

interface TechnicianWithUser {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface Project {
  id: number;
  name: string;
  status: string;
}

interface ProjectPhase {
  id: number;
  name: string;
  projectId: number;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface AuditLogWithUser extends WorkOrderAuditLog {
  userName: string;
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

const workOrderEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(WORK_ORDER_CATEGORIES),
  status: z.enum(WORK_ORDER_STATUSES),
  priority: z.enum(WORK_ORDER_PRIORITIES),
  scheduledDate: z.string().optional(),
  technicianId: z.number().optional().nullable(),
  projectId: z.number().optional().nullable(),
  projectPhaseId: z.number().optional().nullable(),
});

type WorkOrderEditValues = z.infer<typeof workOrderEditSchema>;

interface EditWorkOrderFormProps {
  workOrder: WorkOrderWithDetails;
  onClose: () => void;
}

function EditWorkOrderForm({ workOrder, onClose }: EditWorkOrderFormProps) {
  const { toast } = useToast();
  const workOrderId = workOrder.id;
  
  const parseChecklist = (checklist: string | ChecklistItem[] | null): ChecklistItem[] => {
    if (!checklist) return [];
    if (Array.isArray(checklist)) return checklist;
    try {
      return JSON.parse(checklist);
    } catch {
      return [];
    }
  };
  
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(parseChecklist(workOrder.checklist));
  const [newItemText, setNewItemText] = useState("");
  
  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });
  
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  const form = useForm<WorkOrderEditValues>({
    resolver: zodResolver(workOrderEditSchema),
    defaultValues: {
      title: workOrder.title,
      description: workOrder.description || "",
      category: workOrder.category as typeof WORK_ORDER_CATEGORIES[number],
      status: workOrder.status as typeof WORK_ORDER_STATUSES[number],
      priority: workOrder.priority as typeof WORK_ORDER_PRIORITIES[number],
      scheduledDate: workOrder.scheduledDate || "",
      technicianId: workOrder.technicianId || null,
      projectId: workOrder.projectId || null,
      projectPhaseId: workOrder.projectPhaseId || null,
    },
  });

  const selectedProjectId = form.watch("projectId");
  
  const { data: phases } = useQuery<ProjectPhase[]>({
    queryKey: ['/api/projects', selectedProjectId, 'phases'],
    enabled: !!selectedProjectId,
  });
  
  const addChecklistItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: `item-${Date.now()}`,
        text: newItemText.trim(),
        completed: false,
      };
      setChecklistItems([...checklistItems, newItem]);
      setNewItemText("");
    }
  };
  
  const removeChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== id));
  };

  const updateMutation = useMutation({
    mutationFn: async (data: WorkOrderEditValues) => {
      const payload = {
        ...data,
        checklist: checklistItems.length > 0 ? checklistItems : null,
      };
      const response = await apiRequest('PATCH', `/api/work-orders/${workOrderId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Order Updated",
        description: "The work order has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}/audit-logs`] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update work order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkOrderEditValues) => {
    updateMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Work order title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the work to be done..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_ORDER_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_ORDER_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="scheduledDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="technicianId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Technician</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {technicians?.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id.toString()}>
                      {tech.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Project (Optional)</FormLabel>
              <Select 
                onValueChange={(value) => {
                  const newProjectId = value === "none" ? null : parseInt(value);
                  field.onChange(newProjectId);
                  form.setValue("projectPhaseId", null);
                }} 
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.filter(p => p.status !== 'completed').map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedProjectId && phases && phases.length > 0 && (
          <FormField
            control={form.control}
            name="projectPhaseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Phase (Optional)</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                  value={field.value?.toString() || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No specific phase</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id.toString()}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="space-y-3">
          <Label className="text-sm font-medium">Checklist Items</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a checklist item..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChecklistItem();
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addChecklistItem}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {checklistItems.length > 0 && (
            <div className="border rounded-md divide-y">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 bg-muted/30"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{item.text}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeChecklistItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [showGuidedWorkflow, setShowGuidedWorkflow] = useState(false);
  const workOrderId = parseInt(id || "0");

  const { data: workOrder, isLoading, error } = useQuery<WorkOrderWithDetails>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: !!workOrderId,
  });
  
  const { data: existingReport } = useQuery<any>({
    queryKey: ['/api/service-reports/by-work-order', workOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/service-reports/by-work-order/${workOrderId}`, { credentials: 'include' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch report');
      return res.json();
    },
    enabled: !!workOrderId,
  });

  const { data: auditLogs } = useQuery<AuditLogWithUser[]>({
    queryKey: [`/api/work-orders/${workOrderId}/audit-logs`],
    enabled: !!workOrderId,
  });

  const { data: clientInfo } = useQuery<ClientInfo>({
    queryKey: [`/api/clients/${workOrder?.clientId}`],
    enabled: !!workOrder?.clientId,
    queryFn: async () => {
      if (!workOrder?.clientId) return null as any;
      const response = await fetch(`/api/clients/${workOrder.clientId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch client');
      return response.json();
    },
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
      queryClient.invalidateQueries({ queryKey: [`/api/work-orders/${workOrderId}/audit-logs`] });
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
  
  const formatDateTime = (date: string | Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleString();
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
  const hasChecklist = checklistItems.length > 0;
  const isActiveOrPending = ['pending', 'scheduled', 'in_progress'].includes(workOrder.status);

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
          {hasChecklist && isActiveOrPending && (
            <Button
              variant={showGuidedWorkflow ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGuidedWorkflow(!showGuidedWorkflow)}
              className={showGuidedWorkflow ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              {showGuidedWorkflow ? "Standard View" : "Guided Workflow"}
            </Button>
          )}
          {existingReport ? (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setLocation(`/reports/${existingReport.id}`)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Report
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setReportDialogOpen(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Complete Report
            </Button>
          )}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Work Order</DialogTitle>
                <DialogDescription>
                  Update the work order details below.
                </DialogDescription>
              </DialogHeader>
              <EditWorkOrderForm 
                workOrder={workOrder} 
                onClose={() => setEditDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
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

      {showGuidedWorkflow && hasChecklist ? (
        <TechnicianWorkflow
          workOrderId={workOrderId}
          workOrder={workOrder}
          onComplete={() => {
            setShowGuidedWorkflow(false);
            queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId] });
          }}
        />
      ) : (
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

          <WorkOrderPhotos workOrderId={workOrderId} photos={workOrder.photos} />

          <WorkOrderChemicals workOrderId={workOrderId} workOrder={workOrder} />

          <WorkOrderItemsSection workOrderId={workOrderId} />

          <WorkOrderTimeTracking workOrderId={workOrderId} />

          <WorkOrderTeamMembers workOrderId={workOrderId} />
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

          {workOrder.clientId && clientInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Name</h4>
                  <p className="text-sm">{clientInfo.user?.name || "Unknown"}</p>
                </div>
                
                {clientInfo.user?.email && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Email</h4>
                    <p className="text-sm">{clientInfo.user.email}</p>
                  </div>
                )}
                
                {clientInfo.user?.phone && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone</h4>
                    <p className="text-sm">{clientInfo.user.phone}</p>
                  </div>
                )}
                
                {clientInfo.user?.address && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Address</h4>
                    <p className="text-sm">{clientInfo.user.address}</p>
                  </div>
                )}
                
                {(clientInfo.user?.email || clientInfo.user?.phone) && (
                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Contact</h4>
                    <QuickContactActions
                      phone={clientInfo.user?.phone}
                      email={clientInfo.user?.email}
                      clientId={workOrder.clientId}
                      entityName={clientInfo.user?.name}
                      compact={true}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(workOrder.workOrderRequestId || workOrder.maintenanceAssignmentId || workOrder.repairId) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Related Entities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {workOrder.workOrderRequestId && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Work Order Request</h4>
                    <Link href={`/work-order-requests?id=${workOrder.workOrderRequestId}`}>
                      <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                        <FileText className="h-4 w-4" />
                        <span>
                          {workOrder.workOrderRequest?.title || `Request #${workOrder.workOrderRequestId}`}
                        </span>
                      </div>
                    </Link>
                  </div>
                )}
                
                {workOrder.maintenanceAssignmentId && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Maintenance Assignment</h4>
                    <Link href={`/maintenance?assignment=${workOrder.maintenanceAssignmentId}`}>
                      <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {workOrder.maintenanceAssignment?.clientName 
                            ? `${workOrder.maintenanceAssignment.clientName} - ${new Date(workOrder.maintenanceAssignment.scheduleDate || '').toLocaleDateString()}`
                            : `Assignment #${workOrder.maintenanceAssignmentId}`
                          }
                        </span>
                      </div>
                    </Link>
                  </div>
                )}
                
                {workOrder.repairId && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Repair</h4>
                    <Link href={`/repairs?id=${workOrder.repairId}`}>
                      <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                        <Wrench className="h-4 w-4" />
                        <span>
                          {workOrder.repair?.issueDescription || `Repair #${workOrder.repairId}`}
                        </span>
                      </div>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
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
              </div>
              
              {auditLogs && auditLogs.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Audit Log</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex flex-col text-xs border-l-2 border-muted pl-3 py-1">
                        <span className="font-medium">{log.description}</span>
                        <span className="text-muted-foreground">
                          by {log.userName} • {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {workOrder && (
        <FieldServiceReportForm
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          workOrderId={workOrderId}
          clientId={workOrder.clientId || 0}
          technicianId={workOrder.technician?.id}
          serviceTemplateId={workOrder.serviceTemplateId || undefined}
          checklistItems={workOrder.checklist || undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/service-reports/by-work-order', workOrderId] });
          }}
        />
      )}
    </div>
  );
}
