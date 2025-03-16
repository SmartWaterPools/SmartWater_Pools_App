import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Loader2, Beaker, DollarSign, Clock, Plus, AlertTriangle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceWithDetails } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { MaintenanceReport, WaterReading, insertMaintenanceReportSchema } from "../../../shared/schema";
import { SignatureCanvas } from "./SignatureCanvas";

// Standard maintenance tasks
const STANDARD_TASKS = [
  "Pool cleaning",
  "Equipment inspection",
  "Chemical balance adjustment",
  "Filter cleaning",
  "Skimmer and pump basket cleaning",
  "Water testing",
  "Debris removal",
  "Surface cleaning"
];

const POOL_CONDITIONS = [
  "excellent",
  "good",
  "fair",
  "poor"
];

// Form validation schema based on our database schema
const maintenanceReportSchema = z.object({
  maintenanceId: z.number(),
  completionDate: z.date({
    required_error: "Please select the completion date",
  }),
  tasksCompleted: z.array(z.string()),
  condition: z.string().optional(),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
  technicianId: z.number(),
  clientSignature: z.string().optional(),
  technicianSignature: z.string().optional(),
  laborTimeMinutes: z.number().optional(),
  chemicalCost: z.number().optional(),
  equipmentIssues: z.string().optional(),
  recommendedServices: z.string().optional(),
  waterReadings: z.object({
    phLevel: z.number().min(0).max(14).optional(),
    chlorineLevel: z.number().min(0).max(10).optional(),
    alkalinity: z.number().min(0).max(300).optional(),
    cyanuricAcid: z.number().min(0).max(150).optional(),
    calciumHardness: z.number().min(0).max(1000).optional(),
    totalDissolvedSolids: z.number().min(0).max(5000).optional(),
  }).optional(),
});

type MaintenanceReportFormValues = z.infer<typeof maintenanceReportSchema>;

interface MaintenanceReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: MaintenanceWithDetails | null;
  maintenanceId?: number;
  onSuccess?: () => void;
  existingReport?: MaintenanceReport | null;
}

export function MaintenanceReportForm({ 
  open, 
  onOpenChange, 
  maintenance, 
  maintenanceId, 
  onSuccess,
  existingReport
}: MaintenanceReportFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaterReadings, setShowWaterReadings] = useState(!!existingReport?.waterReadingId);
  const [activeTab, setActiveTab] = useState("details");
  const [clientSignature, setClientSignature] = useState<string | null>(existingReport?.clientSignature || null);
  const [techSignature, setTechSignature] = useState<string | null>(existingReport?.technicianSignature || null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(existingReport?.photos || []);
  
  // Fetch maintenance if we have an ID but no maintenance object
  const { data: fetchedMaintenance, isLoading: isMaintenanceLoading } = useQuery<MaintenanceWithDetails>({
    queryKey: [`/api/maintenances/${maintenanceId}`],
    enabled: !!maintenanceId && !maintenance,
  });
  
  // Fetch water readings if we have an existing report with a water reading ID
  const { data: waterReading } = useQuery<WaterReading>({
    queryKey: [`/api/water-readings/${existingReport?.waterReadingId}`],
    enabled: !!existingReport?.waterReadingId,
  });
  
  // Use either the passed maintenance or the fetched one
  const activeMaintenance = maintenance || fetchedMaintenance;

  // Form definition
  const form = useForm<MaintenanceReportFormValues>({
    resolver: zodResolver(maintenanceReportSchema),
    defaultValues: {
      maintenanceId: activeMaintenance?.id || existingReport?.maintenanceId || 0,
      completionDate: existingReport?.completionDate ? new Date(existingReport.completionDate) : new Date(),
      tasksCompleted: existingReport?.tasksCompleted || [],
      condition: existingReport?.condition || "good",
      notes: existingReport?.notes || "",
      photos: existingReport?.photos || [],
      technicianId: activeMaintenance?.technicianId || existingReport?.technicianId || 0,
      clientSignature: existingReport?.clientSignature || "",
      technicianSignature: existingReport?.technicianSignature || "",
      laborTimeMinutes: existingReport?.laborTimeMinutes || 0,
      chemicalCost: existingReport?.chemicalCost || 0,
      equipmentIssues: existingReport?.equipmentIssues || "",
      recommendedServices: existingReport?.recommendedServices || "",
      waterReadings: {
        phLevel: waterReading?.phLevel ? waterReading.phLevel / 10 : undefined,
        chlorineLevel: waterReading?.chlorineLevel ? waterReading.chlorineLevel / 10 : undefined,
        alkalinity: waterReading?.alkalinity,
        cyanuricAcid: waterReading?.cyanuricAcid,
        calciumHardness: waterReading?.calciumHardness,
        totalDissolvedSolids: waterReading?.totalDissolvedSolids,
      },
    },
    mode: "onChange",
  });

  // Update form values when maintenance data or existing report changes
  useEffect(() => {
    if (activeMaintenance) {
      form.setValue("maintenanceId", activeMaintenance.id);
      if (activeMaintenance.technicianId) {
        form.setValue("technicianId", activeMaintenance.technicianId);
      }
    }
    
    if (existingReport) {
      form.setValue("completionDate", new Date(existingReport.completionDate));
      form.setValue("tasksCompleted", existingReport.tasksCompleted || []);
      form.setValue("condition", existingReport.condition || "good");
      form.setValue("notes", existingReport.notes || "");
      form.setValue("photos", existingReport.photos || []);
      form.setValue("clientSignature", existingReport.clientSignature || "");
      form.setValue("technicianSignature", existingReport.technicianSignature || "");
      form.setValue("laborTimeMinutes", existingReport.laborTimeMinutes || 0);
      form.setValue("chemicalCost", existingReport.chemicalCost || 0);
      form.setValue("equipmentIssues", existingReport.equipmentIssues || "");
      form.setValue("recommendedServices", existingReport.recommendedServices || "");
      
      if (existingReport.clientSignature) {
        setClientSignature(existingReport.clientSignature);
      }
      
      if (existingReport.technicianSignature) {
        setTechSignature(existingReport.technicianSignature);
      }
      
      if (existingReport.photos) {
        setUploadedPhotos(existingReport.photos);
      }
    }
    
    if (waterReading) {
      form.setValue("waterReadings", {
        phLevel: waterReading.phLevel ? waterReading.phLevel / 10 : undefined,
        chlorineLevel: waterReading.chlorineLevel ? waterReading.chlorineLevel / 10 : undefined,
        alkalinity: waterReading.alkalinity,
        cyanuricAcid: waterReading.cyanuricAcid,
        calciumHardness: waterReading.calciumHardness,
        totalDissolvedSolids: waterReading.totalDissolvedSolids,
      });
      setShowWaterReadings(true);
    }
  }, [activeMaintenance, existingReport, waterReading, form]);

  // Create water reading if needed
  const createWaterReadingMutation = useMutation({
    mutationFn: async (waterReadingsData: Partial<WaterReading>) => {
      const data = {
        maintenanceId: activeMaintenance?.id,
        phLevel: waterReadingsData.phLevel ? Math.round(waterReadingsData.phLevel * 10) : undefined,
        chlorineLevel: waterReadingsData.chlorineLevel ? Math.round(waterReadingsData.chlorineLevel * 10) : undefined,
        alkalinity: waterReadingsData.alkalinity,
        cyanuricAcid: waterReadingsData.cyanuricAcid,
        calciumHardness: waterReadingsData.calciumHardness,
        totalDissolvedSolids: waterReadingsData.totalDissolvedSolids,
      };
      return await apiRequest('/api/water-readings', 'POST', data);
    }
  });

  // Create or update maintenance report
  const submitReportMutation = useMutation({
    mutationFn: async (formData: MaintenanceReportFormValues & { waterReadingId?: number }) => {
      if (existingReport) {
        return await apiRequest(`/api/maintenance-reports/${existingReport.id}`, 'PATCH', formData);
      } else {
        return await apiRequest('/api/maintenance-reports', 'POST', formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-reports"] });
      queryClient.invalidateQueries({ queryKey: [`/api/maintenance-reports/maintenance/${activeMaintenance?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      
      toast({
        title: existingReport ? "Report updated" : "Report submitted",
        description: existingReport 
          ? "The maintenance report has been updated successfully." 
          : "The maintenance report has been submitted successfully.",
      });
      
      // Also update the maintenance status to completed
      if (activeMaintenance && !existingReport) {
        apiRequest(`/api/maintenances/${activeMaintenance.id}`, 'PATCH', { 
          status: "completed", 
          completionDate: new Date().toISOString() 
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error submitting the report. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  // Handle file upload for photos
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const updatedPhotos = [...uploadedPhotos, base64String];
      setUploadedPhotos(updatedPhotos);
      form.setValue("photos", updatedPhotos);
    };
    
    reader.readAsDataURL(file);
  };

  // Handle removing a photo
  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = [...uploadedPhotos];
    updatedPhotos.splice(index, 1);
    setUploadedPhotos(updatedPhotos);
    form.setValue("photos", updatedPhotos);
  };

  // Form submission handler
  async function onSubmit(data: MaintenanceReportFormValues) {
    setIsSubmitting(true);
    
    try {
      let waterReadingId = existingReport?.waterReadingId;
      
      // Create a water reading if needed
      if (showWaterReadings && data.waterReadings && (
        data.waterReadings.phLevel || 
        data.waterReadings.chlorineLevel || 
        data.waterReadings.alkalinity ||
        data.waterReadings.cyanuricAcid ||
        data.waterReadings.calciumHardness ||
        data.waterReadings.totalDissolvedSolids
      )) {
        const waterReadingResult = await createWaterReadingMutation.mutateAsync(data.waterReadings);
        waterReadingId = waterReadingResult.id;
      }
      
      // Update with client and technician signatures
      if (clientSignature) {
        data.clientSignature = clientSignature;
      }
      
      if (techSignature) {
        data.technicianSignature = techSignature;
      }
      
      // Submit the report
      await submitReportMutation.mutateAsync({
        ...data,
        waterReadingId,
        photos: uploadedPhotos,
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      setIsSubmitting(false);
    }
  }

  // Show loading state while fetching maintenance data
  if (isMaintenanceLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading service details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If we have neither a maintenance object nor could fetch one by ID
  if (!activeMaintenance && !existingReport) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-red-500 mb-2">Unable to load maintenance data</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingReport ? "Edit Maintenance Report" : "New Maintenance Report"}</DialogTitle>
        </DialogHeader>
        
        {activeMaintenance && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground">
              <p><span className="font-medium">Client:</span> {activeMaintenance.client.user.name}</p>
              <p><span className="font-medium">Service Type:</span> {activeMaintenance.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
              <p><span className="font-medium">Scheduled Date:</span> {format(new Date(activeMaintenance.scheduleDate), "PPP")}</p>
              {activeMaintenance.technician && (
                <p><span className="font-medium">Technician:</span> {activeMaintenance.technician.user.name}</p>
              )}
            </div>
          </div>
        )}
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="readings">Readings</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                {/* Completion Date Field */}
                <FormField
                  control={form.control}
                  name="completionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Completion Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Select date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tasks Completed Field */}
                <FormItem>
                  <FormLabel>Tasks Completed</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {STANDARD_TASKS.map((task) => (
                      <FormField
                        key={task}
                        control={form.control}
                        name="tasksCompleted"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={task}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(task)}
                                  onCheckedChange={(checked) => {
                                    const currentTasks = field.value || [];
                                    const updatedTasks = checked
                                      ? [...currentTasks, task]
                                      : currentTasks.filter((value) => value !== task);
                                    field.onChange(updatedTasks);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {task}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>

                {/* Pool Condition Field */}
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pool Condition</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POOL_CONDITIONS.map((condition) => (
                            <SelectItem key={condition} value={condition}>
                              {condition.charAt(0).toUpperCase() + condition.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes Field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any notes about the service..."
                          className="resize-y min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Labor Time Field */}
                <FormField
                  control={form.control}
                  name="laborTimeMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labor Time (minutes)</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Input
                            type="number"
                            min={0}
                            max={480}
                            {...field}
                            value={field.value || ""}
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                          />
                          <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormDescription>Time spent on service (up to 8 hours)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Chemical Cost Field */}
                <FormField
                  control={form.control}
                  name="chemicalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chemical Cost (cents)</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            value={field.value || ""}
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                          />
                          <DollarSign className="ml-2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormDescription>Cost of chemicals used in cents</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Readings Tab */}
              <TabsContent value="readings" className="space-y-4">
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="waterReadings" 
                      checked={showWaterReadings} 
                      onCheckedChange={() => setShowWaterReadings(!showWaterReadings)} 
                    />
                    <label
                      htmlFor="waterReadings"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include Water Test Readings
                    </label>
                  </div>
                </FormItem>

                {showWaterReadings && (
                  <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                    <h3 className="text-sm font-medium flex items-center">
                      <Beaker className="h-4 w-4 mr-2" />
                      Water Test Readings
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="waterReadings.phLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>pH Level</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="14"
                                placeholder="7.2-7.8"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterReadings.chlorineLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chlorine (ppm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder="1.0-3.0"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterReadings.alkalinity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alkalinity (ppm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="300"
                                placeholder="80-120"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterReadings.cyanuricAcid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cyanuric Acid (ppm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="150"
                                placeholder="30-50"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterReadings.calciumHardness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Calcium Hardness (ppm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="1000"
                                placeholder="200-400"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterReadings.totalDissolvedSolids"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>TDS (ppm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="5000"
                                placeholder="0-5000"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Equipment Issues Field */}
                <FormField
                  control={form.control}
                  name="equipmentIssues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                        Equipment Issues
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe any equipment issues identified..."
                          className="resize-y min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recommended Services Field */}
                <FormField
                  control={form.control}
                  name="recommendedServices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-500" />
                        Recommended Services
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List any recommended follow-up services..."
                          className="resize-y min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-3">Service Photos</h3>
                  
                  <div className="mb-4">
                    <FormItem>
                      <FormLabel htmlFor="photo-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-md p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col items-center gap-1">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm font-medium">Add Photo</span>
                            <span className="text-xs text-muted-foreground">Click to upload</span>
                          </div>
                        </div>
                      </FormLabel>
                      <input 
                        id="photo-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePhotoUpload}
                      />
                      <FormMessage />
                    </FormItem>
                  </div>
                  
                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={photo} 
                            alt={`Service photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove photo"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {uploadedPhotos.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No photos added yet
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Signatures Tab */}
              <TabsContent value="signatures" className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-3">Client Signature</h3>
                  
                  <SignatureCanvas
                    value={clientSignature}
                    onChange={setClientSignature}
                    placeholder="Client signature"
                  />
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-3">Technician Signature</h3>
                  
                  <SignatureCanvas
                    value={techSignature}
                    onChange={setTechSignature}
                    placeholder="Technician signature"
                  />
                </div>
              </TabsContent>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {existingReport ? "Update Report" : "Submit Report"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}