import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  PlusCircle, 
  Search, 
  Filter, 
  ChevronDown, 
  Calendar, 
  Users,
  MoreHorizontal,
  ClipboardList,
  Layers,
  Edit,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectPhases } from "@/components/projects/ProjectPhases";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectWithDetails, formatDate, formatCurrency } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Projects() {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawProjects, isLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });
  
  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<void>(
        `/api/projects/${id}`,
        'DELETE'
      );
    },
    onSuccess: () => {
      toast({
        title: "Project Deleted",
        description: "The project has been successfully deleted.",
        variant: "default",
      });
      
      // Close dialog and clear selection
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      
      // Invalidate the projects query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Process projects to ensure they have all required fields
  const projects: ProjectWithDetails[] | undefined = rawProjects?.map(project => ({
    ...project,
    // Default values for potentially missing fields
    completion: project.percentComplete || 0,
    deadline: project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : new Date(),
    startDate: project.startDate ? new Date(project.startDate) : new Date(),
    estimatedCompletionDate: project.estimatedCompletionDate || project.startDate,
    projectType: project.projectType || "construction",
    assignments: project.assignments || [],
  }));

  const filteredProjects = projects?.filter(project => {
    if (!project) return false;
    if (statusFilter !== "all" && project.status !== statusFilter) return false;
    if (searchTerm && project.name && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-blue-100 text-primary";
      case "review":
        return "bg-green-100 text-green-600";
      case "completed":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getBgColorClass = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-blue-50";
      case "in_progress":
        return "bg-blue-50";
      case "review":
        return "bg-green-50";
      case "completed":
        return "bg-green-50";
      default:
        return "bg-blue-50";
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Build</h1>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 md:mt-0">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search projects..." 
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
                  Filter
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  All Projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("planning")}>
                  Planning
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_progress")}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("review")}>
                  Review
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                  Completed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <ProjectForm onClose={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="grid" className="mb-6">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-lg overflow-hidden bg-white">
                  <div className="p-4 bg-blue-50">
                    <div className="flex items-start">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="ml-3 space-y-2">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex justify-between">
                      <div className="flex space-x-1">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              filteredProjects?.map(project => (
                <div key={project.id} className="border border-gray-100 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow transition">
                  <div className={`p-4 ${getBgColorClass(project.status)}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground font-heading">{project.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClass(project.status)}`}>
                        {project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Client: {project.client?.user?.name || 'Unknown'}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{project.completion || 0}%</span>
                    </div>
                    <Progress value={project.completion || 0} className="h-2 mb-4" />
                    <div className="flex flex-wrap gap-y-2 gap-x-4 mb-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-gray-600">Due: {formatDate(project.deadline || new Date())}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-gray-600">{project.assignments?.length || 0} Technicians</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {project.assignments?.slice(0, 3).map((assignment) => (
                          <div 
                            key={assignment.id}
                            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs border-2 border-white"
                            title={assignment.technician?.user?.name || 'Unknown'}
                          >
                            {assignment.technician?.user?.name ? assignment.technician.user.name.charAt(0) : '?'}
                          </div>
                        ))}
                        {project.assignments && project.assignments.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 border-2 border-white">
                            +{project.assignments.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/projects/${project.id}`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                          >
                            <Layers className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedProject(project);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="list">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-36" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-2.5 w-24 rounded-full" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-5 w-24" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex -space-x-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Skeleton className="h-8 w-16 ml-auto rounded-md" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredProjects?.map(project => (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">{project.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{project.client?.user?.name || 'Unknown Client'}</div>
                          <div className="text-xs text-gray-500">{project.client?.companyName || 'Residential'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(project.status)}`}>
                            {project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-24">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{project.completion || 0}%</span>
                            </div>
                            <Progress value={project.completion || 0} className="h-2" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(project.deadline || new Date())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex -space-x-2">
                            {project.assignments?.slice(0, 3).map((assignment) => (
                              <div 
                                key={assignment.id}
                                className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs border-2 border-white"
                                title={assignment.technician?.user?.name || 'Unknown'}
                              >
                                {assignment.technician?.user?.name ? assignment.technician.user.name.charAt(0) : '?'}
                              </div>
                            ))}
                            {project.assignments && project.assignments.length > 3 && (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 border-2 border-white">
                                +{project.assignments.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/projects/${project.id}`}>
                              <Button 
                                variant="outline" 
                                size="sm"
                              >
                                <Layers className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                setSelectedProject(project);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onOpenChange={setDeleteDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete Project</DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Are you sure you want to delete this project? This action cannot be undone, and all related data including phases, assignments, and documentation will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-md mt-2 text-sm">
            <strong>Warning:</strong> Deleting "{selectedProject?.name}" will remove:
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>All project phases and tasks</li>
              <li>All team assignments</li>
              <li>All documentation and files</li>
              <li>All progress tracking</li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedProject) {
                  deleteProjectMutation.mutate(selectedProject.id);
                }
              }}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Details Dialog */}
      <Dialog 
        open={!!selectedProject && !deleteDialogOpen} 
        onOpenChange={(open) => !open && setSelectedProject(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl font-bold">{selectedProject.name}</DialogTitle>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClass(selectedProject.status)}`}>
                    {selectedProject.status.replace('_', ' ').charAt(0).toUpperCase() + selectedProject.status.replace('_', ' ').slice(1)}
                  </span>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left column - Project details */}
                <div className="space-y-4 col-span-2">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase">Project Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Client</div>
                        <div className="font-medium">{selectedProject.client?.user?.name || 'Unknown Client'}</div>
                        {selectedProject.client?.companyName && (
                          <div className="text-sm text-gray-500">{selectedProject.client.companyName}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Type</div>
                        <div className="font-medium capitalize">{selectedProject.projectType || "Construction"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Start Date</div>
                        <div className="font-medium">{formatDate(selectedProject.startDate)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Estimated Completion</div>
                        <div className="font-medium">{formatDate(selectedProject.estimatedCompletionDate)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Budget</div>
                        <div className="font-medium">{formatCurrency(selectedProject.budget || 0)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Current Phase</div>
                        <div className="font-medium">{selectedProject.currentPhase || "Not Set"}</div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedProject.description && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Description</h3>
                      <p className="text-gray-700">{selectedProject.description}</p>
                    </div>
                  )}
                  
                  {/* Project Phases Component */}
                  <ProjectPhases 
                    projectId={selectedProject.id}
                    currentPhase={selectedProject.currentPhase}
                  />
                </div>
                
                {/* Right column - Project team */}
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Project Team</h3>
                    {selectedProject.assignments && selectedProject.assignments.length > 0 ? (
                      <div className="space-y-3">
                        {selectedProject.assignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                              {assignment.technician?.user?.name ? assignment.technician.user.name.charAt(0) : '?'}
                            </div>
                            <div>
                              <div className="font-medium">{assignment.technician?.user?.name || 'Unknown Technician'}</div>
                              <div className="text-xs text-gray-500">{assignment.role || "Technician"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No team members assigned</div>
                    )}
                  </div>
                  
                  {selectedProject.permitDetails && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Permit Details</h3>
                      <p className="text-gray-700 text-sm">{selectedProject.permitDetails}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Progress Overview</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Completion</span>
                        <span>{selectedProject.completion || 0}%</span>
                      </div>
                      <Progress value={selectedProject.completion || 0} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
