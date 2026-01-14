import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { ProjectPhases } from "@/components/projects/ProjectPhases";
import { ProjectDocuments } from "@/components/projects/ProjectDocuments";
import { ProjectWorkOrders } from "@/components/projects/ProjectWorkOrders";
import { getStatusClasses, ProjectWithDetails } from "@/lib/types";
import { Calendar, Users, FileText, Settings, Clock, DollarSign, Edit, ArrowLeft, MessageSquare, Mail, Phone, Search, Plus, Trash2, Archive, ClipboardList } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/types";
import { Link } from "wouter";
import { ProjectEditForm } from "@/components/projects/ProjectEditForm";
import { EntityEmailList } from "@/components/communications/EntityEmailList";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeletionPreview {
  phases: number;
  documents: number;
  workOrders: number;
  emailLinks: number;
  scheduledEmails: number;
  communicationLinks: number;
  smsMessages: number;
  teamAssignments: number;
}

export default function ProjectDetails() {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_location, setLocation] = useLocation();
  const initialTab = new URLSearchParams(window.location.search).get("tab");
  
  // Fetch deletion preview when delete dialog opens
  const { data: deletionPreview, isLoading: previewLoading } = useQuery<DeletionPreview>({
    queryKey: ['/api/projects', projectId, 'deletion-preview'],
    enabled: deleteDialogOpen && !!projectId,
  });
  
  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      return apiRequest<void>(
        `/api/projects/${projectId}`,
        'DELETE'
      );
    },
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "The project has been permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Navigate back to projects list
      setLocation('/projects');
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Archive/Unarchive project mutation
  const archiveMutation = useMutation({
    mutationFn: () => {
      // Toggle the isArchived status
      return apiRequest<any>(
        `/api/projects/${projectId}`,
        'PATCH',
        { isArchived: !projectData.isArchived }
      );
    },
    onSuccess: () => {
      toast({
        title: projectData.isArchived ? "Project unarchived" : "Project archived",
        description: projectData.isArchived 
          ? "The project has been removed from the archive" 
          : "The project has been moved to the archive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Refresh the current page to show updated archive status
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      setArchiveDialogOpen(false);
    },
    onError: (error) => {
      console.error(`Error ${projectData.isArchived ? 'unarchiving' : 'archiving'} project:`, error);
      toast({
        title: "Error",
        description: `Failed to ${projectData.isArchived ? 'unarchive' : 'archive'} project. Please try again.`,
        variant: "destructive",
      });
    }
  });
  
  // Use initial tab if provided
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Project data query
  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId
  });
  
  // Project phases query with better error handling and logging
  const { 
    data: phases, 
    isLoading: phasesLoading, 
    isError: phasesError,
    error: phasesErrorData
  } = useQuery({
    queryKey: ['/api/projects', projectId, 'phases'],
    enabled: !!projectId,
    // Add a query function to log what's happening
    queryFn: async () => {
      console.log(`Fetching phases for project ID: ${projectId}`);
      try {
        // Use the fetch API directly for more detailed error handling
        const response = await fetch(`/api/projects/${projectId}/phases`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch phases: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`Successfully fetched ${data?.length || 0} phases for project ${projectId}:`, data);
        return data;
      } catch (error) {
        console.error(`Error fetching phases for project ${projectId}:`, error);
        throw error;
      }
    },
    // Make sure the data is always fresh
    refetchOnWindowFocus: true
  });
  
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-8 w-64 rounded animate-pulse bg-muted"></div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-48 rounded animate-pulse bg-muted"></div>
          <div className="h-48 rounded animate-pulse bg-muted"></div>
          <div className="h-48 rounded animate-pulse bg-muted"></div>
        </div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <p className="mt-2">The project you are looking for does not exist or has been removed.</p>
        <Link href="/projects">
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }
  
  // Ensure project has the necessary properties even if they're undefined
  const projectData: ProjectWithDetails = {
    ...project,
    completion: project.completion || 0,
    deadline: project.deadline || new Date().toISOString(),
    startDate: project.startDate || new Date().toISOString(),
    estimatedCompletionDate: project.estimatedCompletionDate || new Date().toISOString(),
    currentPhase: project.currentPhase || null,
    projectType: project.projectType || "construction",
    permitDetails: project.permitDetails || null,
    assignments: project.assignments || [],
    client: project.client || { id: 0, user: { id: 0, name: "Unknown", email: "", username: "", role: "" } }
  };
  
  const { status } = projectData;
  const statusClasses = getStatusClasses(status);
  
  return (
    <div className="container py-6">
      <div className="flex flex-col sm:flex-row sm:items-center mb-6 gap-4">
        <Link href="/projects">
          <Button variant="outline" size="icon" className="w-10 h-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">{projectData.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-muted-foreground">
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(projectData.startDate)}
            </span>
            <Badge className={`${statusClasses.bg} ${statusClasses.text}`}>
              {status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto flex items-center" 
            onClick={() => setIsEditingProject(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <TabsList className="mb-6 w-max min-w-full sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phases">Project Phases</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="work-orders" className="flex items-center">
              <ClipboardList className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Work Orders</span>
              <span className="xs:hidden">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Communications</span>
              <span className="xs:hidden">Comms</span>
            </TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Name:</span>
                    <p>{projectData.client.user.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <p>{projectData.client.user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Phone:</span>
                    <p>{projectData.client.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Address:</span>
                    <p>{projectData.client.address || "Not provided"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Type:</span>
                    <p className="capitalize">{projectData.projectType.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Status:</span>
                    <p className="capitalize">{status.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Start Date:</span>
                    <p>{formatDate(projectData.startDate)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Estimated Completion:</span>
                    <p>{formatDate(projectData.estimatedCompletionDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Budget & Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Budget:</span>
                    <p>{projectData.budget ? formatCurrency(projectData.budget) : "Not set"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Current Phase:</span>
                    <p>{projectData.currentPhase || "Not started"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Completion:</span>
                    <div className="flex items-center">
                      <div className="w-full bg-muted rounded-full h-2.5 mr-2">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${projectData.completion}%` }}
                        ></div>
                      </div>
                      <span>{projectData.completion}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Permit Status:</span>
                    <p>{projectData.permitDetails || "Not required"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Project Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{projectData.description || "No description provided."}</p>
                
                {projectData.notes && (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-medium mb-2">Additional Notes</h3>
                    <p>{projectData.notes}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="phases">
          <ProjectPhases 
            projectId={projectId} 
            currentPhase={projectData.currentPhase} 
          />
        </TabsContent>
        
        <TabsContent value="documents">
          {phasesLoading ? (
            <div className="p-4 text-center">
              <div className="h-8 w-64 rounded animate-pulse bg-muted mx-auto mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="h-32 rounded animate-pulse bg-muted"></div>
                ))}
              </div>
            </div>
          ) : phasesError ? (
            <div className="p-4 text-center text-red-500 border rounded-lg">
              <p>Error loading project phases. Documents view requires phases to be loaded.</p>
              <p className="text-sm text-muted-foreground mt-2">
                {phasesErrorData instanceof Error ? phasesErrorData.message : 'Unknown error'}
              </p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          ) : !phases || (Array.isArray(phases) && phases.length === 0) ? (
            <div className="p-4 text-center border rounded-lg">
              <p>No phases have been defined for this project.</p>
              <p className="text-sm text-muted-foreground mt-2">Please add phases before uploading documents.</p>
              <Button
                className="mt-4"
                onClick={() => setActiveTab("phases")}
              >
                Go to Phases
              </Button>
            </div>
          ) : (
            <ProjectDocuments 
              projectId={projectId} 
              projectPhases={Array.isArray(phases) ? phases.map(phase => ({
                id: phase.id,
                name: phase.name,
                order: phase.order || 0
              })) : []} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Project Team</CardTitle>
            </CardHeader>
            <CardContent>
              {projectData.assignments && projectData.assignments.length > 0 ? (
                <div className="space-y-4">
                  {projectData.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex flex-col xs:flex-row xs:items-center gap-3 p-4 border rounded-lg">
                      <div className="mr-0 xs:mr-4 bg-muted rounded-full p-2 w-fit">
                        <Users className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{assignment.technician.user.name}</h3>
                        <p className="text-sm text-muted-foreground">{assignment.role || "Team Member"}</p>
                      </div>
                      <div className="mt-2 xs:mt-0 xs:ml-auto w-full xs:w-auto">
                        <Button variant="outline" size="sm" className="w-full xs:w-auto">Contact</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No team members assigned to this project.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="communications">
          <div className="mb-6">
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
                <TabsTrigger value="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS
                </TabsTrigger>
                <TabsTrigger value="calls" className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Log
                </TabsTrigger>
              </TabsList>
              
              {/* Email Tab Content */}
              <TabsContent value="email" className="space-y-4">
                <EntityEmailList
                  entityType="project"
                  entityId={projectId}
                  entityName={projectData.name}
                />
              </TabsContent>
              
              {/* SMS Tab Content */}
              <TabsContent value="sms" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-full xs:w-[180px]">
                        <SelectValue placeholder="Filter by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Messages</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Search messages..." className="w-full xs:w-auto" />
                  </div>
                  <Button className="w-full sm:w-auto">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Project SMS</CardTitle>
                    <CardDescription>
                      Text message communication related to {projectData.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-muted-foreground">No project messages to display yet. This feature will be implemented soon.</p>
                      <div className="bg-muted rounded-md p-6 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Project SMS Integration Coming Soon</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                          Send automated updates and notifications to clients about project milestones, schedule changes, and important updates.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Call Log Tab Content */}
              <TabsContent value="calls" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                  <div className="flex flex-col xs:flex-row gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-full xs:w-[180px]">
                        <SelectValue placeholder="Filter by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Calls</SelectItem>
                        <SelectItem value="incoming">Incoming</SelectItem>
                        <SelectItem value="outgoing">Outgoing</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Search call logs..." className="w-full xs:w-auto" />
                  </div>
                  <Button className="w-full sm:w-auto">
                    <Phone className="h-4 w-4 mr-2" />
                    Log New Call
                  </Button>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Call History</CardTitle>
                    <CardDescription>
                      Phone conversation logs related to {projectData.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-muted-foreground">No call logs to display yet. This feature will be implemented soon.</p>
                      <div className="bg-muted rounded-md p-6 text-center">
                        <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Call Tracking Coming Soon</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                          Log project-related calls, track conversation details, and set follow-up reminders all in one place.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
        
        <TabsContent value="work-orders">
          <ProjectWorkOrders projectId={projectId} projectName={projectData.name} />
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>
                Manage project settings, archive, or delete this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* General Settings Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">General Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border p-3 rounded-md">
                    <div>
                      <p className="font-medium">Project Status</p>
                      <p className="text-sm text-muted-foreground">Change project status</p>
                    </div>
                    <Select defaultValue={projectData.status}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Archive Project Section */}
              <div>
                <h3 className="text-lg font-medium mb-3">{projectData.isArchived ? 'Unarchive Project' : 'Archive Project'}</h3>
                <div className={`border p-4 rounded-md ${projectData.isArchived ? 'bg-amber-50 border-amber-200' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      {projectData.isArchived ? (
                        <>
                          <p className="font-medium">Unarchive this project</p>
                          <p className="text-sm text-muted-foreground">
                            Unarchived projects will be visible in the main projects list again.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">Archive this project</p>
                          <p className="text-sm text-muted-foreground">
                            Archived projects are hidden from the main projects list but can still be accessed. This action can be reversed.
                          </p>
                        </>
                      )}
                    </div>
                    <Button 
                      variant={projectData.isArchived ? "default" : "outline"} 
                      className="flex items-center gap-2"
                      onClick={() => setArchiveDialogOpen(true)}
                    >
                      {projectData.isArchived ? (
                        <>
                          <Archive className="h-4 w-4" />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4" />
                          Archive
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Delete Project Section */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-destructive">Danger Zone</h3>
                <div className="border border-destructive p-4 rounded-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">Delete this project</p>
                      <p className="text-sm text-muted-foreground">
                        Once deleted, this project and all associated data will be permanently removed. This action cannot be undone.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="flex items-center gap-2"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Project Edit Form */}
      {project && (
        <ProjectEditForm
          open={isEditingProject}
          onOpenChange={setIsEditingProject}
          project={projectData}
        />
      )}
      
      {/* Archive/Unarchive Project Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{projectData.isArchived ? 'Unarchive project' : 'Archive project'}</DialogTitle>
            <DialogDescription>
              {projectData.isArchived ? (
                'Are you sure you want to unarchive this project? It will be visible again in the main project list.'
              ) : (
                'Are you sure you want to archive this project? Archived projects will be hidden from the main project list but can still be accessed.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <h4 className="font-medium">{projectData.name}</h4>
            <p className="text-sm text-muted-foreground">{projectData.description || "No description"}</p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setArchiveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex items-center gap-2"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  {projectData.isArchived ? 'Unarchiving...' : 'Archiving...'}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  {projectData.isArchived ? 'Unarchive Project' : 'Archive Project'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Project Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this project? 
              This action cannot be undone and all project data will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 border border-destructive bg-destructive/5 px-4 rounded-md">
            <h4 className="font-medium">{projectData.name}</h4>
            <p className="text-sm text-muted-foreground">{projectData.description || "No description"}</p>
            
            <div className="mt-4 text-sm text-destructive">
              <strong>Warning:</strong> This will also delete:
              {previewLoading ? (
                <div className="mt-2 text-muted-foreground">Loading related items...</div>
              ) : deletionPreview ? (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {deletionPreview.phases > 0 && (
                    <li>{deletionPreview.phases} project phase{deletionPreview.phases !== 1 ? 's' : ''}</li>
                  )}
                  {deletionPreview.documents > 0 && (
                    <li>{deletionPreview.documents} document{deletionPreview.documents !== 1 ? 's' : ''} and file{deletionPreview.documents !== 1 ? 's' : ''}</li>
                  )}
                  {deletionPreview.workOrders > 0 && (
                    <li>{deletionPreview.workOrders} work order{deletionPreview.workOrders !== 1 ? 's' : ''}</li>
                  )}
                  {deletionPreview.emailLinks > 0 && (
                    <li>{deletionPreview.emailLinks} email link{deletionPreview.emailLinks !== 1 ? 's' : ''}</li>
                  )}
                  {deletionPreview.scheduledEmails > 0 && (
                    <li>{deletionPreview.scheduledEmails} scheduled email{deletionPreview.scheduledEmails !== 1 ? 's' : ''}</li>
                  )}
                  {deletionPreview.communicationLinks > 0 && (
                    <li>{deletionPreview.communicationLinks} communication record{deletionPreview.communicationLinks !== 1 ? 's' : ''}</li>
                  )}
                  {deletionPreview.smsMessages > 0 && (
                    <li>{deletionPreview.smsMessages} SMS message{deletionPreview.smsMessages !== 1 ? 's' : ''}</li>
                  )}
                  {deletionPreview.teamAssignments > 0 && (
                    <li>{deletionPreview.teamAssignments} team assignment{deletionPreview.teamAssignments !== 1 ? 's' : ''}</li>
                  )}
                  {Object.values(deletionPreview).every(v => v === 0) && (
                    <li className="text-muted-foreground">No additional related records found</li>
                  )}
                </ul>
              ) : (
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All project phases and associated tasks</li>
                  <li>All project documents and files</li>
                  <li>All work orders</li>
                  <li>All communication records</li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="flex items-center gap-2"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || previewLoading}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}