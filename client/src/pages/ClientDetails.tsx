import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ClientWithUser } from "@/lib/types";
import { 
  Building, 
  Calendar, 
  ChevronLeft, 
  Mail, 
  MapPin, 
  Phone, 
  Receipt, 
  User,
  Pencil as PencilIcon,
  Edit as EditIcon
} from "lucide-react";

export default function ClientDetails() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/clients/:id");
  const clientId = params?.id ? parseInt(params.id) : null;
  
  // Fetch client details
  const { data: client, isLoading, error, refetch } = useQuery<ClientWithUser>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  // Fetch all projects and filter for this client
  const { data: allProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: !!clientId,
  });
  // Filter projects for this client
  const projects = allProjects.filter(project => project.clientId === clientId);
  
  // Fetch all maintenances and filter for this client
  const { data: allMaintenances = [] } = useQuery<any[]>({
    queryKey: ["/api/maintenances"],
    enabled: !!clientId,
  });
  // Filter maintenances for this client
  const maintenances = allMaintenances.filter(maintenance => maintenance.clientId === clientId);
  
  // Fetch all repairs and filter for this client
  const { data: allRepairs = [] } = useQuery<any[]>({
    queryKey: ["/api/repairs"],
    enabled: !!clientId,
  });
  // Filter repairs for this client
  const repairs = allRepairs.filter(repair => repair.clientId === clientId);
  
  // Fetch all invoices and filter for this client
  const { data: allInvoices = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    enabled: !!clientId,
  });
  // Filter invoices for this client
  const invoices = allInvoices.filter(invoice => invoice.clientId === clientId);
  
  // Go back to clients page
  const handleBack = () => {
    setLocation("/clients");
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading client details...</p>
      </div>
    );
  }
  
  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <p className="text-red-500 text-lg font-medium mb-2">Error loading client details.</p>
        <p className="text-gray-600 mb-6">The client information could not be retrieved at this time.</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Clients
          </Button>
          <Button variant="default" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  const clientType = client.companyName ? "Commercial" : "Residential";
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button 
          variant="secondary" 
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => client && setLocation(`/clients/${client.id}/edit`)}
        >
          <PencilIcon className="mr-2 h-4 w-4" /> Edit Client
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client Info Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-bold">
                  {client.companyName || (client.user && client.user.name) || `Client ${clientId}`}
                </CardTitle>
                <CardDescription>
                  {client.companyName && client.user && (
                    <div className="mt-1 text-sm font-medium">
                      Contact: {client.user.name}
                    </div>
                  )}
                </CardDescription>
              </div>
              <Badge className={clientType === "Commercial" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                {clientType}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              <div className="flex items-start">
                <Mail className="h-4 w-4 text-gray-500 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{client.user?.email || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-4 w-4 text-gray-500 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{client.user?.phone || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-500 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{client.user?.address || "Not provided"}</p>
                </div>
              </div>
              {client.contractType && (
                <div className="flex items-start">
                  <Building className="h-4 w-4 text-gray-500 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Contract Type</p>
                    <p className="font-medium">{client.contractType}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Client Data Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="repairs">Repairs</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>
            
            <TabsContent value="projects" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Projects</h3>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <PencilIcon className="h-3.5 w-3.5" />
                  Add Project
                </Button>
              </div>
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {projects.map((project: any) => (
                    <Card key={project.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
                        <Badge 
                          className={
                            project.status === "completed" ? "bg-green-100 text-green-800" :
                            project.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                            project.status === "planning" ? "bg-purple-100 text-purple-800" :
                            "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {project.status.replace("_", " ").split(" ").map((word: string) => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(" ")}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-2">{project.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Start Date:</p>
                            <p>{new Date(project.startDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Target Completion:</p>
                            <p>{new Date(project.deadline).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Budget:</p>
                            <p>${project.budget?.toLocaleString() || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Completion:</p>
                            <p>{project.completion || 0}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                  No active projects found for this client.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="maintenance" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Maintenance Schedules</h3>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <PencilIcon className="h-3.5 w-3.5" />
                  Schedule Maintenance
                </Button>
              </div>
              {maintenances.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {maintenances.map((maintenance: any) => (
                    <Card key={maintenance.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-lg font-semibold">{maintenance.type}</CardTitle>
                          <Badge 
                            className={
                              maintenance.status === "completed" ? "bg-green-100 text-green-800" :
                              maintenance.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                              maintenance.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }
                          >
                            {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {maintenance.description && (
                          <p className="text-sm text-gray-500 mb-3">{maintenance.description}</p>
                        )}
                        <div className="flex items-center mb-2">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm">
                            {new Date(maintenance.scheduledDate).toLocaleDateString()} at {maintenance.scheduledTime}
                          </span>
                        </div>
                        {maintenance.technicianId && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm">
                              Assigned to: {maintenance.technician?.user?.name || `Technician #${maintenance.technicianId}`}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                  No maintenance schedules found for this client.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="repairs" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Repair Requests</h3>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <PencilIcon className="h-3.5 w-3.5" />
                  Request Repair
                </Button>
              </div>
              {repairs.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {repairs.map((repair: any) => (
                    <Card key={repair.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-lg font-semibold">{repair.issue}</CardTitle>
                          <div className="flex gap-2">
                            <Badge 
                              className={
                                repair.status === "completed" ? "bg-green-100 text-green-800" :
                                repair.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                                repair.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                                repair.status === "assigned" ? "bg-purple-100 text-purple-800" :
                                "bg-red-100 text-red-800"
                              }
                            >
                              {repair.status.replace("_", " ").split(" ").map((word: string) => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(" ")}
                            </Badge>
                            <Badge 
                              className={
                                repair.priority === "high" ? "bg-red-100 text-red-800" :
                                repair.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                                "bg-green-100 text-green-800"
                              }
                            >
                              {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)} Priority
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-3">{repair.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Reported:</p>
                            <p>{new Date(repair.reportedDate).toLocaleDateString()}</p>
                          </div>
                          {repair.scheduledDate && (
                            <div>
                              <p className="text-gray-500">Scheduled:</p>
                              <p>{new Date(repair.scheduledDate).toLocaleDateString()} {repair.scheduledTime}</p>
                            </div>
                          )}
                          {repair.technicianId && (
                            <div>
                              <p className="text-gray-500">Assigned To:</p>
                              <p>{repair.technician?.user?.name || `Technician #${repair.technicianId}`}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                  No repair requests found for this client.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="invoices" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Invoices</h3>
                <Button size="sm" variant="outline" className="flex items-center gap-1">
                  <PencilIcon className="h-3.5 w-3.5" />
                  Create Invoice
                </Button>
              </div>
              {invoices.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {invoices.map((invoice: any) => (
                    <Card key={invoice.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-lg font-semibold">Invoice #{invoice.id}</CardTitle>
                          <Badge 
                            className={
                              invoice.status === "paid" ? "bg-green-100 text-green-800" :
                              invoice.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-3">{invoice.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Issue Date:</p>
                            <p>{new Date(invoice.issueDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Due Date:</p>
                            <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Amount:</p>
                            <p className="font-semibold">${invoice.amount.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                  No invoices found for this client.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}