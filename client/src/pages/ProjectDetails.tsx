import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProjectPhases } from "@/components/projects/ProjectPhases";
import { DocumentGallery } from "@/components/documents";
import { getStatusClasses, ProjectWithDetails } from "@/lib/types";
import { Calendar, Users, FileText, Settings, Clock, DollarSign, Edit, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/types";
import { Link } from "wouter";

export default function ProjectDetails() {
  const { id } = useParams();
  const projectId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Parse query parameters
  const [_location, setLocation] = useLocation();
  const initialTab = new URLSearchParams(window.location.search).get("tab");
  
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
  
  // Project phases query
  const { data: phases } = useQuery({
    queryKey: ['/api/projects', projectId, 'phases'],
    enabled: !!projectId
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
      <div className="flex items-center mb-6">
        <Link href="/projects">
          <Button variant="outline" size="icon" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{projectData.name}</h1>
          <div className="flex items-center mt-1 text-muted-foreground">
            <span className="flex items-center mr-4">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(projectData.startDate)}
            </span>
            <Badge className={`${statusClasses.bg} ${statusClasses.text}`}>
              {status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <Button className="ml-auto">
          <Edit className="h-4 w-4 mr-2" />
          Edit Project
        </Button>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="phases">Project Phases</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
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
          <DocumentGallery 
            projectId={projectId} 
            projectPhases={phases as unknown as Array<{ id: number; name: string; order: number; }>} 
          />
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
                    <div key={assignment.id} className="flex items-center p-4 border rounded-lg">
                      <div className="mr-4 bg-muted rounded-full p-2">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">{assignment.technician.user.name}</h3>
                        <p className="text-sm text-muted-foreground">{assignment.role || "Team Member"}</p>
                      </div>
                      <div className="ml-auto">
                        <Button variant="outline" size="sm">Contact</Button>
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
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Project settings functionality will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}