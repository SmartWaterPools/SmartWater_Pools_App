import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useTabs } from "@/components/layout/EnhancedTabManager";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ArrowLeft, FileText, User, Home, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceWithDetails, ClientWithUser } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Form validation schema
const serviceReportSchema = z.object({
  completionDate: z.date({
    required_error: "Please select the completion date",
  }),
  waterReadings: z.object({
    phLevel: z.coerce.number().min(0).max(14).optional(),
    chlorineLevel: z.coerce.number().min(0).max(10).optional(),
    alkalinity: z.coerce.number().min(0).max(300).optional(),
  }).optional(),
  tasksCompleted: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z.enum(["in_progress", "completed", "cancelled"], {
    required_error: "Please select a status",
  }),
});

type ServiceReportValues = z.infer<typeof serviceReportSchema>;

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

// Format a maintenance type for display
const formatMaintenanceType = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function ServiceReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const maintenanceId = id ? parseInt(id) : 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaterReadings, setShowWaterReadings] = useState(false);
  const [existingReport, setExistingReport] = useState<string | null>(null);

  // Fetch maintenance details
  const { data: maintenance, isLoading } = useQuery<MaintenanceWithDetails>({
    queryKey: ["/api/maintenances", maintenanceId],
    enabled: maintenanceId > 0,
  });

  // Initialize form
  const form = useForm<ServiceReportValues>({
    resolver: zodResolver(serviceReportSchema),
    defaultValues: {
      completionDate: new Date(),
      waterReadings: {
        phLevel: undefined,
        chlorineLevel: undefined,
        alkalinity: undefined,
      },
      tasksCompleted: [],
      notes: "",
      status: "in_progress",
    },
  });

  useEffect(() => {
    if (maintenance) {
      // Check if there's already a service report
      if (maintenance.notes && maintenance.notes.includes('Service Report:')) {
        setExistingReport(maintenance.notes);
        setShowWaterReadings(maintenance.notes.includes('Water Readings:'));
        
        // Extract tasks from existing report if any
        const tasksMatch = maintenance.notes.match(/Tasks Completed: (.*?)(?:\n|$)/);
        if (tasksMatch && tasksMatch[1]) {
          const tasks = tasksMatch[1].split(', ');
          form.setValue('tasksCompleted', tasks);
        }
        
        // Extract notes from existing report if any
        const notesMatch = maintenance.notes.match(/Notes: (.*?)(?:\n|$)/);
        if (notesMatch && notesMatch[1]) {
          form.setValue('notes', notesMatch[1]);
        }
        
        // Extract water readings if any
        if (showWaterReadings) {
          const phMatch = maintenance.notes.match(/pH: (\d+\.?\d*)/);
          if (phMatch && phMatch[1]) {
            form.setValue('waterReadings.phLevel', parseFloat(phMatch[1]));
          }
          
          const chlorineMatch = maintenance.notes.match(/Chlorine: (\d+\.?\d*) ppm/);
          if (chlorineMatch && chlorineMatch[1]) {
            form.setValue('waterReadings.chlorineLevel', parseFloat(chlorineMatch[1]));
          }
          
          const alkalinityMatch = maintenance.notes.match(/Alkalinity: (\d+\.?\d*) ppm/);
          if (alkalinityMatch && alkalinityMatch[1]) {
            form.setValue('waterReadings.alkalinity', parseFloat(alkalinityMatch[1]));
          }
        }
      } else {
        // If no existing report, set default notes from maintenance
        form.setValue('notes', maintenance.notes || "");
      }
      
      // Set status based on current maintenance status
      form.setValue('status', maintenance.status === "completed" ? "completed" : 
                            maintenance.status === "cancelled" ? "cancelled" : "in_progress");
      
      // Set completion date if available
      if (maintenance.completionDate) {
        form.setValue('completionDate', new Date(maintenance.completionDate));
      }
    }
  }, [maintenance, form]);

  // For tab navigation using wouter
  const [, setLocation] = useLocation();
  const { tabs, getTabByPath, navigateToTab, addTab } = useTabs();
  
  // Update maintenance mutation
  const updateMaintenanceMutation = useMutation({
    mutationFn: async (values: ServiceReportValues) => {
      if (!maintenance) return null;

      const updateData = {
        ...values,
        completionDate: values.status === "completed" ? values.completionDate.toISOString() : null,
        notes: formatServiceReport(values)
      };

      return await apiRequest(`/api/maintenances/${maintenanceId}`, 'PATCH', updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances", maintenanceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Service report submitted",
        description: "The service report has been submitted successfully.",
      });
      
      // Use tab manager to navigate back to maintenance page
      const maintenanceTab = getTabByPath('/maintenance');
      if (maintenanceTab) {
        navigateToTab(maintenanceTab.id);
      } else {
        // If no maintenance tab exists, create one
        addTab('/maintenance', 'Schedule');
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to submit report",
        description: "There was an error submitting the service report. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  // Format the service report for storage in the notes field
  const formatServiceReport = (data: ServiceReportValues): string => {
    const sections = [];
    
    // Add date and time
    sections.push(`Service Report: ${format(new Date(), "PPP h:mm a")}`);
    
    // Add tasks completed
    if (data.tasksCompleted && data.tasksCompleted.length > 0) {
      sections.push(`Tasks Completed: ${data.tasksCompleted.join(", ")}`);
    }
    
    // Add water readings if provided
    if (showWaterReadings && data.waterReadings) {
      const readings = [];
      if (data.waterReadings.phLevel !== undefined) {
        readings.push(`pH: ${data.waterReadings.phLevel}`);
      }
      if (data.waterReadings.chlorineLevel !== undefined) {
        readings.push(`Chlorine: ${data.waterReadings.chlorineLevel} ppm`);
      }
      if (data.waterReadings.alkalinity !== undefined) {
        readings.push(`Alkalinity: ${data.waterReadings.alkalinity} ppm`);
      }
      
      if (readings.length > 0) {
        sections.push(`Water Readings: ${readings.join(", ")}`);
      }
    }
    
    // Add notes if provided
    if (data.notes) {
      sections.push(`Notes: ${data.notes}`);
    }
    
    return sections.join("\n");
  };

  // Form submission handler
  function onSubmit(data: ServiceReportValues) {
    setIsSubmitting(true);
    updateMaintenanceMutation.mutate(data, {
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  }

  // Handle user cancelling the form
  const handleCancel = () => {
    // Use tab manager to navigate back to maintenance page
    const maintenanceTab = getTabByPath('/maintenance');
    if (maintenanceTab) {
      navigateToTab(maintenanceTab.id);
    } else {
      // If no maintenance tab exists, create one
      addTab('/maintenance', 'Schedule');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-semibold mb-4">Maintenance Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested maintenance record could not be found.</p>
        <Button onClick={handleCancel}>Return to Maintenance</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Service Report</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maintenance details sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Maintenance Details</CardTitle>
            <CardDescription>Information about the scheduled maintenance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{maintenance.client.user.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span>{"Address information unavailable"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(maintenance.scheduleDate), "PPP")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{maintenance.notes && !maintenance.notes.includes("Service Report:") 
                  ? maintenance.notes.split(' ')[0] 
                  : "Time not specified"}</span>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-1">Service Type</h3>
              <Badge variant="outline" className="bg-primary/5">
                {formatMaintenanceType(maintenance.type)}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">Current Status</h3>
              <Badge className="capitalize">
                {maintenance.status}
              </Badge>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-1">Assigned Technician</h3>
              <div className="flex items-center gap-2">
                {maintenance.technician ? (
                  <span>{maintenance.technician.user.name}</span>
                ) : (
                  <span className="text-amber-500">Not assigned</span>
                )}
              </div>
            </div>

            {existingReport && (
              <div className="mt-4">
                <div className="flex items-center gap-1 text-sm font-medium text-blue-600 mb-1">
                  <FileText className="h-4 w-4" />
                  <span>Previous Report Exists</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  There's an existing service report that will be updated when you submit this form.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service report form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Service Report</CardTitle>
            <CardDescription>Record details about the maintenance service performed</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                {/* Status Field */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tasks Completed Field */}
                <div className="border rounded-md p-4 space-y-4">
                  <FormLabel className="block mb-2">Tasks Completed</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                </div>

                {/* Water Readings Section */}
                <div className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="waterReadings" 
                      checked={showWaterReadings} 
                      onCheckedChange={() => setShowWaterReadings(!showWaterReadings)} 
                    />
                    <label
                      htmlFor="waterReadings"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Include Water Test Readings
                    </label>
                  </div>

                  {showWaterReadings && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
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
                            <FormDescription className="text-xs">Ideal: 7.2-7.8</FormDescription>
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
                            <FormDescription className="text-xs">Ideal: 1.0-3.0 ppm</FormDescription>
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
                                step="1"
                                min="0"
                                max="300"
                                placeholder="80-120"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">Ideal: 80-120 ppm</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Notes Field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional information about the service visit"
                          className="resize-none h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Include any issues found, recommendations, or follow-up needed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}