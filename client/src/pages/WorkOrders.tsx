import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ChevronDown, 
  Calendar,
  User,
  ClipboardList,
  Plus,
  Trash2,
  GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  WorkOrder, 
  WORK_ORDER_CATEGORIES, 
  WORK_ORDER_STATUSES, 
  WORK_ORDER_PRIORITIES,
  insertWorkOrderSchema
} from "@shared/schema";

interface TechnicianWithUser {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface WorkOrderWithDetails extends WorkOrder {
  technician?: TechnicianWithUser | null;
  client?: {
    id: number;
    user: {
      id: number;
      name: string;
    };
  } | null;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

const workOrderFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(WORK_ORDER_CATEGORIES),
  status: z.enum(WORK_ORDER_STATUSES).default("pending"),
  priority: z.enum(WORK_ORDER_PRIORITIES).default("medium"),
  scheduledDate: z.string().optional(),
  technicianId: z.number().optional().nullable(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean(),
  })).optional(),
});

type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

function WorkOrderForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  
  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "maintenance",
      status: "pending",
      priority: "medium",
      scheduledDate: "",
      technicianId: null,
      checklist: [],
    },
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

  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderFormValues) => {
      const payload = {
        ...data,
        checklist: checklistItems.length > 0 ? checklistItems : null,
      };
      const response = await apiRequest('POST', '/api/work-orders', payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Order Created",
        description: "The work order has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create work order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkOrderFormValues) => {
    createMutation.mutate(data);
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
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                defaultValue={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
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
        
        {/* Checklist Section */}
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
              {checklistItems.map((item, index) => (
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
          
          {checklistItems.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No checklist items added. Add items above for technicians to complete on-site.
            </p>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Work Order"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function WorkOrders() {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: workOrders, isLoading } = useQuery<WorkOrderWithDetails[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const filteredWorkOrders = workOrders?.filter(workOrder => {
    if (categoryFilter !== "all" && workOrder.category !== categoryFilter) return false;
    if (statusFilter !== "all" && workOrder.status !== statusFilter) return false;
    if (technicianFilter !== "all") {
      if (technicianFilter === "unassigned" && workOrder.technicianId) return false;
      if (technicianFilter !== "unassigned" && workOrder.technicianId?.toString() !== technicianFilter) return false;
    }
    if (searchTerm && !workOrder.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "construction":
        return "bg-orange-100 text-orange-800";
      case "cleaning":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-green-100 text-green-800";
      case "repair":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-slate-100 text-slate-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-3 md:mb-0">
          <ClipboardList className="h-7 w-7 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground font-heading">Work Orders</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search work orders..." 
              className="pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
                <PlusCircle className="h-4 w-4 mr-1" />
                Create Work Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Work Order</DialogTitle>
                <DialogDescription>
                  Fill in the details below to create a new work order.
                </DialogDescription>
              </DialogHeader>
              <WorkOrderForm onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">Category:</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {WORK_ORDER_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {WORK_ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">Technician:</Label>
          <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {technicians?.map((tech) => (
                <SelectItem key={tech.id} value={tech.id.toString()}>
                  {tech.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : filteredWorkOrders?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No work orders found</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all" || technicianFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first work order to get started"}
            </p>
          </div>
        ) : (
          filteredWorkOrders?.map(workOrder => (
            <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold line-clamp-1">
                  {workOrder.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getCategoryBadgeClass(workOrder.category)}>
                    {workOrder.category.charAt(0).toUpperCase() + workOrder.category.slice(1)}
                  </Badge>
                  <Badge className={getStatusBadgeClass(workOrder.status)}>
                    {workOrder.status.replace('_', ' ').charAt(0).toUpperCase() + workOrder.status.replace('_', ' ').slice(1)}
                  </Badge>
                  <Badge className={getPriorityBadgeClass(workOrder.priority)}>
                    {workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1)}
                  </Badge>
                </div>
                
                {workOrder.scheduledDate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(workOrder.scheduledDate)}
                  </div>
                )}
                
                {workOrder.client && (
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    {workOrder.client.user.name}
                  </div>
                )}
                
                {workOrder.technician && (
                  <div className="text-sm text-gray-500">
                    Assigned to: {workOrder.technician.user.name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
