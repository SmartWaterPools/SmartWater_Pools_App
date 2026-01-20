import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  PlusCircle, 
  Search, 
  Filter,
  Eye,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  type WorkOrderRequest,
  WORK_ORDER_REQUEST_STATUSES,
  REQUESTER_TYPES,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES
} from "@shared/schema";
import { format } from "date-fns";

interface ClientWithUser {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    address?: string;
  };
}

interface Project {
  id: number;
  name: string;
  status: string;
}

interface WorkOrderRequestWithDetails extends WorkOrderRequest {
  client?: ClientWithUser | null;
  requester?: { id: number; name: string; role: string } | null;
  workOrders?: unknown[];
  workOrderCount?: number;
}

const workOrderRequestFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().default("medium"),
  requesterType: z.string(),
  clientId: z.number().optional().nullable(),
  projectId: z.number().optional().nullable(),
  address: z.string().optional(),
  addressLat: z.string().optional(),
  addressLng: z.string().optional(),
  notes: z.string().optional(),
});

type WorkOrderRequestFormValues = z.infer<typeof workOrderRequestFormSchema>;

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "destructive";
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "secondary";
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "open":
      return "default";
    case "in_progress":
      return "secondary";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

const formatRequesterType = (type: string) => {
  switch (type) {
    case "tech":
      return "Technician";
    case "office":
      return "Office Staff";
    case "client":
      return "Client";
    default:
      return type;
  }
};

const formatCategory = (category: string | null | undefined) => {
  if (!category) return "-";
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const formatStatus = (status: string) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

function CreateRequestDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  
  const { data: clients } = useQuery<ClientWithUser[]>({
    queryKey: ["/api/clients-with-users"],
  });
  
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<WorkOrderRequestFormValues>({
    resolver: zodResolver(workOrderRequestFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "medium",
      requesterType: "office",
      clientId: null,
      projectId: null,
      address: "",
      addressLat: "",
      addressLng: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderRequestFormValues) => {
      const payload = {
        ...data,
        clientId: data.clientId || undefined,
        projectId: data.projectId || undefined,
        category: data.category || undefined,
      };
      const response = await apiRequest('POST', '/api/work-order-requests', payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Created",
        description: "The work order request has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-order-requests"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkOrderRequestFormValues) => {
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
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Request title" {...field} />
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
                  placeholder="Describe the request..." 
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_ORDER_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatCategory(category)}
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
          name="requesterType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requester Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select requester type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {REQUESTER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatRequesterType(type)}
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
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.user.name}
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
              <FormLabel>Project</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((project) => (
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
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="addressLat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input placeholder="Latitude" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="addressLng"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input placeholder="Longitude" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Request"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function RequestDetailDialog({ 
  requestId, 
  onClose 
}: { 
  requestId: number; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  
  const { data: request, isLoading } = useQuery<WorkOrderRequestWithDetails>({
    queryKey: ["/api/work-order-requests", requestId],
    enabled: !!requestId,
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      const workOrderData = {
        title: request?.title,
        description: request?.description,
        category: request?.category || "maintenance",
        priority: request?.priority || "medium",
        status: "pending",
        workOrderRequestId: requestId,
      };
      const response = await apiRequest('POST', '/api/work-orders', workOrderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Order Created",
        description: "The request has been converted to a work order.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-order-requests"] });
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!request) {
    return <div>Request not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{request.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {request.description || "No description provided"}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <Badge variant={getStatusBadgeVariant(request.status)}>
            {formatStatus(request.status)}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Priority</p>
          <Badge variant={getPriorityBadgeVariant(request.priority)}>
            {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Category</p>
          <p className="text-sm">{formatCategory(request.category)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Requester Type</p>
          <p className="text-sm">{formatRequesterType(request.requesterType)}</p>
        </div>
      </div>
      
      {request.client && (
        <div>
          <p className="text-sm font-medium text-muted-foreground">Client</p>
          <p className="text-sm">{request.client.user?.name || "Unknown"}</p>
        </div>
      )}
      
      {request.requester && (
        <div>
          <p className="text-sm font-medium text-muted-foreground">Requested By</p>
          <p className="text-sm">{request.requester.name} ({request.requester.role})</p>
        </div>
      )}
      
      {request.address && (
        <div>
          <p className="text-sm font-medium text-muted-foreground">Address</p>
          <p className="text-sm">{request.address}</p>
        </div>
      )}
      
      {request.notes && (
        <div>
          <p className="text-sm font-medium text-muted-foreground">Notes</p>
          <p className="text-sm">{request.notes}</p>
        </div>
      )}
      
      <div>
        <p className="text-sm font-medium text-muted-foreground">Created At</p>
        <p className="text-sm">
          {request.createdAt ? format(new Date(request.createdAt), "PPp") : "-"}
        </p>
      </div>
      
      {(request.workOrderCount ?? 0) > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground">Linked Work Orders</p>
          <p className="text-sm">{request.workOrderCount} work order(s)</p>
        </div>
      )}
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button 
          onClick={() => convertMutation.mutate()}
          disabled={convertMutation.isPending}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          {convertMutation.isPending ? "Converting..." : "Convert to Work Order"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function WorkOrderRequests() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: requests, isLoading } = useQuery<WorkOrderRequest[]>({
    queryKey: ["/api/work-order-requests"],
  });

  const filteredRequests = requests?.filter((request) => {
    if (statusFilter !== "all" && request.status !== statusFilter) return false;
    if (priorityFilter !== "all" && request.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && request.category !== categoryFilter) return false;
    if (searchQuery && !request.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Order Requests</h1>
          <p className="text-muted-foreground">
            Manage and track work order requests
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Work Order Request</DialogTitle>
              <DialogDescription>
                Submit a new work order request
              </DialogDescription>
            </DialogHeader>
            <CreateRequestDialog onClose={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {WORK_ORDER_REQUEST_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {WORK_ORDER_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {WORK_ORDER_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {formatCategory(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requester Type</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow 
                    key={request.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRequestId(request.id)}
                  >
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{formatCategory(request.category)}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(request.priority)}>
                        {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {formatStatus(request.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatRequesterType(request.requesterType)}</TableCell>
                    <TableCell>
                      {request.createdAt ? format(new Date(request.createdAt), "PP") : "-"}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No work order requests found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create your first request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog 
        open={selectedRequestId !== null} 
        onOpenChange={(open) => !open && setSelectedRequestId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              View and manage this work order request
            </DialogDescription>
          </DialogHeader>
          {selectedRequestId && (
            <RequestDetailDialog 
              requestId={selectedRequestId} 
              onClose={() => setSelectedRequestId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
