import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button";
import { Calendar } from "../../components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { CalendarIcon, Loader2, Beaker, DollarSign } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { MaintenanceWithDetails } from "../../lib/types";
import { apiRequest } from "../../lib/queryClient";
import { Checkbox } from "../../components/ui/checkbox";
import { ChemicalUsageForm } from "./ChemicalUsageForm";
import { ChemicalUsageHistory } from "./ChemicalUsageHistory";

// Form validation schema
const maintenanceReportSchema = z.object({
  completionDate: z.date({
    required_error: "Please select the completion date",
  }),
  waterReadings: z.object({
    phLevel: z.coerce.number().min(0).max(14).optional(),
    chlorineLevel: z.coerce.number().min(0).max(10).optional(),
    alkalinity: z.coerce.number().min(0).max(300).optional(),
    cyanuricAcid: z.coerce.number().min(0).max(150).optional(),
    calciumHardness: z.coerce.number().min(0).max(1000).optional(),
    totalDissolvedSolids: z.coerce.number().min(0).max(5000).optional(),
  }).optional(),
  tasksCompleted: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z.enum(["in_progress", "completed", "cancelled"], {
    required_error: "Please select a status",
  }),
  laborTimeMinutes: z.coerce.number().min(0).max(480).optional(), // Max 8 hours (480 minutes)
  serviceRate: z.coerce.number().min(0).optional(), // $ per hour service rate
});

type MaintenanceReportValues = z.infer<typeof maintenanceReportSchema>;

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

interface MaintenanceReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: MaintenanceWithDetails | null;
  maintenanceId?: number;
  clientId?: number;
  onSuccess?: () => void;
}

export function MaintenanceReportForm({ 
  open, 
  onOpenChange, 
  maintenance, 
  maintenanceId, 
  clientId,
  onSuccess
}: MaintenanceReportFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaterReadings, setShowWaterReadings] = useState(false);
  
  // Fetch maintenance if we have an ID but no maintenance object
  const { data: fetchedMaintenance, isLoading: isMaintenanceLoading } = useQuery<MaintenanceWithDetails>({
    queryKey: [`/api/maintenances/${maintenanceId}`],
    enabled: !!maintenanceId && !maintenance,
  });
  
  // Use either the passed maintenance or the fetched one
  const activeMaintenance = maintenance || fetchedMaintenance;

  // Form definition
  const form = useForm<MaintenanceReportValues>({
    resolver: zodResolver(maintenanceReportSchema),
    defaultValues: {
      completionDate: new Date(),
      waterReadings: {
        phLevel: undefined,
        chlorineLevel: undefined,
        alkalinity: undefined,
      },
      tasksCompleted: [],
      notes: activeMaintenance?.notes || "",
      status: activeMaintenance?.status === "completed" ? "completed" : "in_progress",
    },
    mode: "onChange",
  });

  // Update form values when maintenance data changes
  useEffect(() => {
    if (activeMaintenance) {
      form.setValue("notes", activeMaintenance.notes || "");
      form.setValue("status", activeMaintenance.status === "completed" ? "completed" : "in_progress");
    }
  }, [activeMaintenance, form]);

  // Update maintenance mutation
  const updateMaintenanceMutation = useMutation({
    mutationFn: async (values: MaintenanceReportValues) => {
      const id = activeMaintenance?.id || maintenanceId;
      if (!id) return null;

      const updateData = {
        ...values,
        completionDate: values.status === "completed" ? values.completionDate.toISOString() : null,
        notes: formatMaintenanceReport(values)
      };

      return await apiRequest(`/api/maintenances/${id}`, 'PATCH', updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Maintenance report submitted",
        description: "The maintenance report has been submitted successfully.",
      });
      if (onSuccess) {
        onSuccess();
      }
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit report",
        description: "There was an error submitting the maintenance report. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  // Format the maintenance report for storage in the notes field
  const formatMaintenanceReport = (data: MaintenanceReportValues): string => {
    const sections = [];
    
    // Add date and time
    sections.push(`Maintenance Report: ${format(new Date(), "PPP h:mm a")}`);
    
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
  function onSubmit(data: MaintenanceReportValues) {
    setIsSubmitting(true);
    updateMaintenanceMutation.mutate(data, {
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  }

  // Show loading state while fetching maintenance data
  if (isMaintenanceLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading maintenance details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If we have neither a maintenance object nor could fetch one by ID
  if (!activeMaintenance) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Maintenance Report</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            <p><span className="font-medium">Client:</span> {activeMaintenance.client.user.name}</p>
            <p><span className="font-medium">Maintenance Type:</span> {activeMaintenance.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
            <p><span className="font-medium">Scheduled Date:</span> {format(new Date(activeMaintenance.scheduleDate), "PPP")}</p>
            {activeMaintenance.technician && (
              <p><span className="font-medium">Technician:</span> {activeMaintenance.technician.user.name}</p>
            )}
          </div>
        </div>
        
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

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional information about the maintenance visit"
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}