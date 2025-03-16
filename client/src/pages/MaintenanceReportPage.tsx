import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Beaker,
  FileText,
  Clock,
  DollarSign,
  AlertTriangle,
  Camera,
  Edit,
  Trash2,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceWithDetails } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { MaintenanceReport, WaterReading } from "../../../shared/schema";
import { MaintenanceReportForm } from "@/components/maintenance/MaintenanceReportForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function MaintenanceReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Fetch maintenance data
  const { data: maintenance, isLoading: maintenanceLoading } = useQuery<MaintenanceWithDetails>({
    queryKey: [`/api/maintenances/${id}`],
    enabled: !!id,
  });

  // Fetch maintenance reports for this maintenance
  const { data: reports, isLoading: reportsLoading } = useQuery<MaintenanceReport[]>({
    queryKey: [`/api/maintenance-reports/maintenance/${id}`],
    enabled: !!id,
  });

  // If there's a report, fetch its water reading data
  const activeReport = reports && reports.length > 0 ? reports[0] : null;
  
  const { data: waterReading } = useQuery<WaterReading>({
    queryKey: [`/api/water-readings/${activeReport?.waterReadingId}`],
    enabled: !!activeReport?.waterReadingId,
  });

  const isLoading = maintenanceLoading || reportsLoading;

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async () => {
      if (!activeReport) return null;
      return await apiRequest(`/api/maintenance-reports/${activeReport.id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/maintenance-reports/maintenance/${id}`] });
      toast({
        title: "Report deleted",
        description: "The maintenance report has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      // If no more reports, update maintenance status
      if (reports && reports.length <= 1) {
        apiRequest(`/api/maintenances/${id}`, 'PATCH', { 
          status: "in_progress",
          completionDate: null
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error deleting the report. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle delete confirmation
  const handleDeleteReport = () => {
    deleteReportMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load maintenance data. Please try again or go back to the maintenance page.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate("/maintenance")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Maintenance
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/maintenance")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Maintenance
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Maintenance Report</h1>
            <p className="text-muted-foreground">Service details for maintenance visit</p>
          </div>
          
          {!activeReport && (
            <MaintenanceReportForm
              open={editModalOpen}
              onOpenChange={setEditModalOpen}
              maintenance={maintenance}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: [`/api/maintenance-reports/maintenance/${id}`] });
              }}
            />
          )}
          
          <div className="flex gap-2">
            {activeReport ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Report
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                
                {/* Edit Report Modal */}
                <MaintenanceReportForm
                  open={editModalOpen}
                  onOpenChange={setEditModalOpen}
                  maintenance={maintenance}
                  existingReport={activeReport}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: [`/api/maintenance-reports/maintenance/${id}`] });
                  }}
                />
                
                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Maintenance Report</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete this maintenance report? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteReport}>
                        Delete Report
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Button 
                onClick={() => setEditModalOpen(true)} 
                className="ml-auto"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Report
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeReport ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Service Report</CardTitle>
                  <Badge variant={activeReport ? "default" : "outline"}>
                    {activeReport ? "Completed" : "Pending"}
                  </Badge>
                </div>
                <CardDescription>
                  {activeReport 
                    ? `Completed on ${format(new Date(activeReport.completionDate), "PPP")}`
                    : "This maintenance visit doesn't have a completed report yet"
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="readings">Readings</TabsTrigger>
                    <TabsTrigger value="photos">Photos</TabsTrigger>
                    <TabsTrigger value="signatures">Signatures</TabsTrigger>
                  </TabsList>
                  
                  {/* Details Tab */}
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Completion Date</h3>
                        <p>{format(new Date(activeReport.completionDate), "PPP")}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Pool Condition</h3>
                        <p className="capitalize">{activeReport.condition || "Not specified"}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Labor Time
                        </h3>
                        <p>
                          {activeReport.laborTimeMinutes 
                            ? `${Math.floor(activeReport.laborTimeMinutes / 60)}h ${activeReport.laborTimeMinutes % 60}m` 
                            : "Not specified"}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          <DollarSign className="h-4 w-4 inline mr-1" />
                          Chemical Cost
                        </h3>
                        <p>
                          {activeReport.chemicalCost 
                            ? `$${(activeReport.chemicalCost / 100).toFixed(2)}` 
                            : "Not specified"}
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Tasks Completed</h3>
                      {activeReport.tasksCompleted && activeReport.tasksCompleted.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {activeReport.tasksCompleted.map((task, index) => (
                            <li key={index}>{task}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No tasks recorded</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                      <p className="whitespace-pre-wrap">
                        {activeReport.notes || "No notes recorded"}
                      </p>
                    </div>
                    
                    {activeReport.equipmentIssues && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                            Equipment Issues
                          </h3>
                          <p className="whitespace-pre-wrap">{activeReport.equipmentIssues}</p>
                        </div>
                      </>
                    )}
                    
                    {activeReport.recommendedServices && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                            <FileText className="h-4 w-4 mr-1 text-blue-500" />
                            Recommended Services
                          </h3>
                          <p className="whitespace-pre-wrap">{activeReport.recommendedServices}</p>
                        </div>
                      </>
                    )}
                  </TabsContent>
                  
                  {/* Readings Tab */}
                  <TabsContent value="readings" className="space-y-4">
                    {waterReading ? (
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <Beaker className="h-5 w-5 mr-2 text-blue-500" />
                          <h3 className="text-sm font-medium">Water Chemistry Readings</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="p-3 border rounded-md">
                            <div className="text-xs text-muted-foreground">pH</div>
                            <div className="text-xl font-semibold">
                              {waterReading.phLevel ? (waterReading.phLevel / 10).toFixed(1) : "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Ideal: 7.2-7.8</div>
                          </div>
                          
                          <div className="p-3 border rounded-md">
                            <div className="text-xs text-muted-foreground">Chlorine (ppm)</div>
                            <div className="text-xl font-semibold">
                              {waterReading.chlorineLevel ? (waterReading.chlorineLevel / 10).toFixed(1) : "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Ideal: 1.0-3.0</div>
                          </div>
                          
                          <div className="p-3 border rounded-md">
                            <div className="text-xs text-muted-foreground">Alkalinity (ppm)</div>
                            <div className="text-xl font-semibold">
                              {waterReading.alkalinity || "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Ideal: 80-120</div>
                          </div>
                          
                          {waterReading.cyanuricAcid && (
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Cyanuric Acid (ppm)</div>
                              <div className="text-xl font-semibold">{waterReading.cyanuricAcid}</div>
                              <div className="text-xs text-muted-foreground mt-1">Ideal: 30-50</div>
                            </div>
                          )}
                          
                          {waterReading.calciumHardness && (
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">Calcium Hardness (ppm)</div>
                              <div className="text-xl font-semibold">{waterReading.calciumHardness}</div>
                              <div className="text-xs text-muted-foreground mt-1">Ideal: 200-400</div>
                            </div>
                          )}
                          
                          {waterReading.totalDissolvedSolids && (
                            <div className="p-3 border rounded-md">
                              <div className="text-xs text-muted-foreground">TDS (ppm)</div>
                              <div className="text-xl font-semibold">{waterReading.totalDissolvedSolids}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed rounded-md">
                        <Beaker className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">No water readings recorded for this service</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Photos Tab */}
                  <TabsContent value="photos" className="space-y-4">
                    {activeReport.photos && activeReport.photos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {activeReport.photos.map((photo, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={photo}
                              alt={`Service photo ${index + 1}`}
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed rounded-md">
                        <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">No photos taken for this service</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Signatures Tab */}
                  <TabsContent value="signatures" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Client Signature</h3>
                        {activeReport.clientSignature ? (
                          <div className="border rounded-md p-4">
                            <img
                              src={activeReport.clientSignature}
                              alt="Client signature"
                              className="max-h-40 mx-auto"
                            />
                          </div>
                        ) : (
                          <div className="p-8 text-center border border-dashed rounded-md">
                            <PenTool className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-muted-foreground">No client signature</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Technician Signature</h3>
                        {activeReport.technicianSignature ? (
                          <div className="border rounded-md p-4">
                            <img
                              src={activeReport.technicianSignature}
                              alt="Technician signature"
                              className="max-h-40 mx-auto"
                            />
                          </div>
                        ) : (
                          <div className="p-8 text-center border border-dashed rounded-md">
                            <PenTool className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-muted-foreground">No technician signature</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Service Report</CardTitle>
                  <Badge variant="outline">Pending</Badge>
                </div>
                <CardDescription>
                  This maintenance visit doesn't have a completed report yet
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Report Available</h3>
                  <p className="text-muted-foreground mb-6">
                    There is no maintenance report for this service visit yet.
                    Create a report to record service details, water chemistry readings, and more.
                  </p>
                  <Button onClick={() => setEditModalOpen(true)}>
                    Create Service Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Client</h3>
                <p>{maintenance.client.user.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Address</h3>
                <p>{maintenance.client.address || "No address"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Scheduled Date</h3>
                <p>{format(new Date(maintenance.scheduleDate), "PPP")}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                <Badge
                  variant={
                    maintenance.status === "completed" 
                      ? "default" 
                      : maintenance.status === "in_progress" 
                        ? "secondary" 
                        : "outline"
                  }
                >
                  {maintenance.status.replace("_", " ")}
                </Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Service Type</h3>
                <p className="capitalize">
                  {maintenance.type.replace(/_/g, " ")}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Technician</h3>
                <p>
                  {maintenance.technician 
                    ? maintenance.technician.user.name 
                    : "Unassigned"}
                </p>
              </div>
              
              {maintenance.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Service Notes</h3>
                    <p className="whitespace-pre-wrap">{maintenance.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}