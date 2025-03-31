import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ChevronDown,
  Eye,
  Edit,
  MoreHorizontal,
  Calendar,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RepairRequestForm } from "@/components/repairs/RepairRequestForm";
import { 
  RepairWithDetails, 
  getStatusClasses, 
  getPriorityClasses, 
  formatDate 
} from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

export default function Repairs() {
  const [open, setOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: repairs, isLoading } = useQuery<RepairWithDetails[]>({
    queryKey: ["/api/repairs"],
  });

  const updateRepairMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<RepairWithDetails> }) => {
      const response = await apiRequest('PATCH', `/api/repairs/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
    }
  });

  const assignTechnician = async (repairId: number, technicianId: number) => {
    await updateRepairMutation.mutateAsync({
      id: repairId,
      data: {
        technicianId,
        status: "assigned"
      }
    });
  };

  const filteredRepairs = repairs?.filter(repair => {
    if (statusFilter !== "all" && repair.status !== statusFilter) return false;
    if (priorityFilter !== "all" && repair.priority !== priorityFilter) return false;
    if (searchTerm && !repair.client.user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !repair.issue.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const pendingRepairs = filteredRepairs?.filter(repair => repair.status === "pending");
  const assignedRepairs = filteredRepairs?.filter(repair => repair.status === "assigned");
  const scheduledRepairs = filteredRepairs?.filter(repair => repair.status === "scheduled");
  const inProgressRepairs = filteredRepairs?.filter(repair => repair.status === "in_progress");
  const completedRepairs = filteredRepairs?.filter(repair => repair.status === "completed");

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Repair</h1>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 md:mt-0">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search repairs..." 
              className="pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Filter className="h-4 w-4" />
                  Status
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("assigned")}>
                  Assigned
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("scheduled")}>
                  Scheduled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_progress")}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                  Completed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Filter className="h-4 w-4" />
                  Priority
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPriorityFilter("all")}>
                  All Priorities
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("low")}>
                  Low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("medium")}>
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("high")}>
                  High
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  New Repair Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <RepairRequestForm onClose={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Repairs</TabsTrigger>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="overflow-x-auto md:overflow-visible">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="ml-4">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24 mt-1" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24 mt-1" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredRepairs?.map(repair => {
                      const statusClasses = getStatusClasses(repair.status);
                      const priorityClasses = getPriorityClasses(repair.priority as any);
                      
                      return (
                        <tr key={repair.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                  {repair.client.user.name.charAt(0)}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-foreground">{repair.client.user.name}</div>
                                <div className="text-xs text-gray-500">{repair.client.user.address}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{repair.issue}</div>
                            <div className="text-xs text-gray-500">{repair.description ? repair.description.substring(0, 30) + '...' : 'No description'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                              {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses.bg} ${statusClasses.text}`}>
                              {repair.status.charAt(0).toUpperCase() + repair.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {repair.technician ? repair.technician.user.name : 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(repair.reportedDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-primary hover:text-primary/80"
                                onClick={() => setSelectedRepair(repair)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-gray-600 hover:text-gray-900"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-gray-600 hover:text-gray-900"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="kanban">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>Pending</span>
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                    {pendingRepairs?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-md space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : (
                  pendingRepairs?.map(repair => {
                    const priorityClasses = getPriorityClasses(repair.priority as any);
                    return (
                      <div key={repair.id} className="p-3 bg-gray-50 rounded-md hover:shadow-sm cursor-pointer">
                        <h4 className="font-medium text-sm">{repair.client.user.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">{repair.issue}</p>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                            {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-600 hover:text-gray-900"
                            onClick={() => setSelectedRepair(repair)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>Assigned</span>
                  <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                    {assignedRepairs?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-md space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : (
                  assignedRepairs?.map(repair => {
                    const priorityClasses = getPriorityClasses(repair.priority as any);
                    return (
                      <div key={repair.id} className="p-3 bg-gray-50 rounded-md hover:shadow-sm cursor-pointer">
                        <h4 className="font-medium text-sm">{repair.client.user.name}</h4>
                        <p className="text-xs text-gray-500 mb-1">{repair.issue}</p>
                        <div className="flex items-center text-xs text-gray-600 mb-2">
                          <User className="h-3 w-3 mr-1" />
                          {repair.technician?.user.name}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                            {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-600 hover:text-gray-900"
                            onClick={() => setSelectedRepair(repair)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>Scheduled</span>
                  <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                    {scheduledRepairs?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-md space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : (
                  scheduledRepairs?.map(repair => {
                    const priorityClasses = getPriorityClasses(repair.priority as any);
                    return (
                      <div key={repair.id} className="p-3 bg-gray-50 rounded-md hover:shadow-sm cursor-pointer">
                        <h4 className="font-medium text-sm">{repair.client.user.name}</h4>
                        <p className="text-xs text-gray-500 mb-1">{repair.issue}</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <div className="flex items-center text-xs text-gray-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            {repair.scheduledDate && formatDate(repair.scheduledDate)}
                          </div>
                          <div className="flex items-center text-xs text-gray-600">
                            <User className="h-3 w-3 mr-1" />
                            {repair.technician?.user.name}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                            {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-600 hover:text-gray-900"
                            onClick={() => setSelectedRepair(repair)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>In Progress</span>
                  <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                    {inProgressRepairs?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-md space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : (
                  inProgressRepairs?.map(repair => {
                    const priorityClasses = getPriorityClasses(repair.priority as any);
                    return (
                      <div key={repair.id} className="p-3 bg-gray-50 rounded-md hover:shadow-sm cursor-pointer">
                        <h4 className="font-medium text-sm">{repair.client.user.name}</h4>
                        <p className="text-xs text-gray-500 mb-1">{repair.issue}</p>
                        <div className="flex items-center text-xs text-gray-600 mb-2">
                          <User className="h-3 w-3 mr-1" />
                          {repair.technician?.user.name}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                            {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-600 hover:text-gray-900"
                            onClick={() => setSelectedRepair(repair)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>Completed</span>
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                    {completedRepairs?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-md space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : (
                  completedRepairs?.map(repair => {
                    const priorityClasses = getPriorityClasses(repair.priority as any);
                    return (
                      <div key={repair.id} className="p-3 bg-gray-50 rounded-md hover:shadow-sm cursor-pointer">
                        <h4 className="font-medium text-sm">{repair.client.user.name}</h4>
                        <p className="text-xs text-gray-500 mb-1">{repair.issue}</p>
                        <div className="flex items-center text-xs text-gray-600 mb-2">
                          <User className="h-3 w-3 mr-1" />
                          {repair.technician?.user.name}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                            {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-gray-600 hover:text-gray-900"
                            onClick={() => setSelectedRepair(repair)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      {selectedRepair && (
        <Dialog open={!!selectedRepair} onOpenChange={() => setSelectedRepair(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Repair Request Details</DialogTitle>
              <DialogDescription>
                View the details of this repair request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Client</h3>
                <p className="mt-1">{selectedRepair.client.user.name}</p>
                <p className="text-sm text-gray-500">{selectedRepair.client.user.address}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Issue Type</h3>
                <p className="mt-1">{selectedRepair.issue}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-sm">{selectedRepair.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(selectedRepair.status).bg} ${getStatusClasses(selectedRepair.status).text}`}>
                      {selectedRepair.status.charAt(0).toUpperCase() + selectedRepair.status.slice(1)}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                  <p className="mt-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityClasses(selectedRepair.priority as any).bg} ${getPriorityClasses(selectedRepair.priority as any).text}`}>
                      {selectedRepair.priority.charAt(0).toUpperCase() + selectedRepair.priority.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Assigned Technician</h3>
                <p className="mt-1">{selectedRepair.technician ? selectedRepair.technician.user.name : 'Unassigned'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Reported Date</h3>
                  <p className="mt-1 text-sm">{formatDate(selectedRepair.reportedDate)}</p>
                </div>
                {selectedRepair.scheduledDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Scheduled Date</h3>
                    <p className="mt-1 text-sm">{formatDate(selectedRepair.scheduledDate)}</p>
                  </div>
                )}
              </div>
              {selectedRepair.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="mt-1 text-sm">{selectedRepair.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
