import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  ArrowLeft,
  CalendarIcon,
  Loader2,
  Check,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceWithDetails } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { EnhancedBreadcrumbs } from "@/components/layout/EnhancedBreadcrumbs";

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

export default function ServiceReport() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaterReadings, setShowWaterReadings] = useState(false);

  // Fetch maintenance data
  const { data: maintenance, isLoading, error } = useQuery<MaintenanceWithDetails>({
    queryKey: ["/api/maintenances", parseInt(id)],
    enabled: !!id,
  });

  // Form definition
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

  // Update form default values when maintenance data is loaded
  useEffect(() => {
    if (maintenance) {
      const hasServiceReport = maintenance.notes && maintenance.notes.includes("Service Report:");
      
      // If there's a service report, try to parse the data
      if (hasServiceReport && maintenance.notes) {
        // Set show water readings if there are water readings in the notes
        setShowWaterReadings(maintenance.notes.includes("Water Readings:"));
        
        // Extract tasks if available
        const tasksMatch = maintenance.notes.match(/Tasks Completed: (.*?)(?:\n|$)/);
        const tasks = tasksMatch ? 
          tasksMatch[1].split(", ").filter(task => STANDARD_TASKS.includes(task)) 
          : [];
        
        form.reset({
          completionDate: new Date(),
          waterReadings: {
            phLevel: undefined,
            chlorineLevel: undefined,
            alkalinity: undefined,
          },
          tasksCompleted: tasks,
          notes: maintenance.notes.includes("Notes: ") 
            ? maintenance.notes.split("Notes: ")[1].trim() 
            : "",
          status: maintenance.status
        });
      } else {
        // No existing service report, just use the maintenance data
        form.reset({
          completionDate: new Date(),
          waterReadings: {
            phLevel: undefined,
            chlorineLevel: undefined,
            alkalinity: undefined,
          },
          tasksCompleted: [],
          notes: maintenance.notes || "",
          status: maintenance.status
        });
      }
    }
  }, [maintenance, form]);

  // Update maintenance mutation
  const updateMaintenanceMutation = useMutation({
    mutationFn: async (values: ServiceReportValues) => {
      if (!maintenance) return null;

      const updateData = {
        ...values,
        completionDate: values.status === "completed" ? values.completionDate.toISOString() : null,
        notes: formatServiceReport(values)
      };

      return await apiRequest(`/api/maintenances/${maintenance.id}`, 'PATCH', updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Service report submitted",
        description: "The service report has been submitted successfully.",
      });
      navigate("/maintenance");
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

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !maintenance) {
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
      <EnhancedBreadcrumbs />
      
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
        
        <h1 className="text-2xl font-bold tracking-tight">Service Report</h1>
        <p className="text-muted-foreground">Complete service details for this maintenance visit</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Details</CardTitle>
              <CardDescription>
                Fill in the details of the service performed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form id="service-report-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Client and Service Info Summary */}
                  <div className="mb-6 p-4 bg-muted/30 border rounded-md">
                    <h3 className="font-medium mb-2">Service Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Client</p>
                        <p className="font-medium">{maintenance.client.user.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Service Type</p>
                        <p className="font-medium">{maintenance.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">{format(new Date(maintenance.scheduleDate), "PPP")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Technician</p>
                        <p className="font-medium">{maintenance.technician ? maintenance.technician.user.name : "Unassigned"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  </div>

                  <Separator />

                  {/* Tasks Completed Field */}
                  <FormItem>
                    <FormLabel>Tasks Completed</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-2">
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

                  <Separator />

                  {/* Water Readings Section */}
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
                      <h3 className="text-sm font-medium">Water Test Readings</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                  step="1"
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
                      </div>
                    </div>
                  )}

                  <Separator />

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
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => navigate("/maintenance")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="service-report-form" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Tips for Service Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Water Chemistry Guidelines</h3>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>pH: 7.2-7.8 is the ideal range</li>
                  <li>Chlorine: 1.0-3.0 ppm is recommended</li>
                  <li>Alkalinity: 80-120 ppm for most pools</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Common Issues</h3>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Green water - Check chlorine levels</li>
                  <li>Cloudy water - Filter issues or chemistry imbalance</li>
                  <li>Equipment noise - Check for obstructions</li>
                  <li>Strong chemical smell - Check sanitizer levels</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Helpful Reminders</h3>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Take photos of any issues</li>
                  <li>Include equipment conditions in notes</li>
                  <li>Mark completed tasks accurately</li>
                  <li>Note any customer concerns</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}