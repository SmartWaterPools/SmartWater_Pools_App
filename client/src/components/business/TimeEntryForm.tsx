import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const timeEntryFormSchema = z.object({
  userId: z.coerce.number({
    required_error: "Employee is required",
  }),
  date: z.date({
    required_error: "Date is required",
  }),
  startTime: z.string({
    required_error: "Start time is required",
  }),
  endTime: z.string().optional(),
  breakDuration: z.coerce
    .number()
    .min(0, "Break duration cannot be negative")
    .default(0),
  projectId: z.coerce.number().optional(),
  maintenanceId: z.coerce.number().optional(),
  repairId: z.coerce.number().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"], {
    required_error: "Status is required",
  }).default("pending"),
});

type TimeEntryFormValues = z.infer<typeof timeEntryFormSchema>;

interface TimeEntryFormProps {
  entryToEdit?: TimeEntryFormValues & { id?: number };
  onClose: () => void;
}

export function TimeEntryForm({ entryToEdit, onClose }: TimeEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [taskType, setTaskType] = useState<"project" | "maintenance" | "repair" | "other">(
    entryToEdit?.projectId ? "project" : 
    entryToEdit?.maintenanceId ? "maintenance" : 
    entryToEdit?.repairId ? "repair" : "other"
  );

  // Query to get all technicians
  const { data: technicians, isLoading: technicianLoading } = useQuery({
    queryKey: ['/api/technicians'],
  });

  // Query to get projects for select
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: taskType === "project"
  });

  // Query to get maintenances for select
  const { data: maintenances, isLoading: maintenancesLoading } = useQuery({
    queryKey: ['/api/maintenances'],
    enabled: taskType === "maintenance"
  });

  // Query to get repairs for select
  const { data: repairs, isLoading: repairsLoading } = useQuery({
    queryKey: ['/api/repairs'],
    enabled: taskType === "repair"
  });

  // Get default values for form
  const defaultValues: Partial<TimeEntryFormValues> = {
    userId: entryToEdit?.userId || undefined,
    date: entryToEdit?.date ? new Date(entryToEdit.date) : new Date(),
    startTime: entryToEdit?.startTime || "09:00",
    endTime: entryToEdit?.endTime || undefined,
    breakDuration: entryToEdit?.breakDuration || 0,
    projectId: entryToEdit?.projectId || undefined,
    maintenanceId: entryToEdit?.maintenanceId || undefined,
    repairId: entryToEdit?.repairId || undefined,
    notes: entryToEdit?.notes || "",
    status: entryToEdit?.status || "pending",
  };

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues,
  });

  // Mutation for creating/updating time entry
  const mutation = useMutation({
    mutationFn: async (values: TimeEntryFormValues) => {
      if (entryToEdit?.id) {
        // Update existing time entry
        return apiRequest(`/api/business/time-entries/${entryToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        // Create new time entry
        return apiRequest("/api/business/time-entries", {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
    },
    onSuccess: () => {
      toast({
        title: entryToEdit?.id ? "Time entry updated" : "Time entry created",
        description: entryToEdit?.id
          ? "The time entry has been updated successfully."
          : "A new time entry has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/business/dashboard'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${entryToEdit?.id ? "update" : "create"} time entry. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: TimeEntryFormValues) {
    // Clear irrelevant task IDs based on selected task type
    const data = { ...values };
    if (taskType !== "project") data.projectId = undefined;
    if (taskType !== "maintenance") data.maintenanceId = undefined;
    if (taskType !== "repair") data.repairId = undefined;
    
    mutation.mutate(data);
  }

  function handleClose() {
    setIsOpen(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {entryToEdit?.id ? "Edit Time Entry" : "Add New Time Entry"}
          </DialogTitle>
          <DialogDescription>
            {entryToEdit?.id
              ? "Update the details of this time entry."
              : "Enter the details of the new time entry."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Employee Field */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* This would be populated from the API in a real implementation */}
                      <SelectItem value="4">Jane Technician</SelectItem>
                      <SelectItem value="5">Bob Technician</SelectItem>
                      <SelectItem value="6">Alex Technician</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
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

              {/* Task Type Field (not part of form schema, used to control which ID to use) */}
              <div className="flex flex-col space-y-1.5">
                <FormLabel>Task Type</FormLabel>
                <Select
                  onValueChange={(val) => setTaskType(val as any)}
                  value={taskType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="maintenance">Maintenance Service</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Task-specific select field based on taskType */}
            {taskType === "project" && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* This would be populated from projects data */}
                        <SelectItem value="1">Thompson Pool Construction</SelectItem>
                        <SelectItem value="2">Johnson Pool Renovation</SelectItem>
                        <SelectItem value="3">Community Center Pool</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {taskType === "maintenance" && (
              <FormField
                control={form.control}
                name="maintenanceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Service</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a maintenance service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* This would be populated from maintenance data */}
                        <SelectItem value="1">Smith Residence - Regular Service</SelectItem>
                        <SelectItem value="2">Johnson Pool - Weekly Cleaning</SelectItem>
                        <SelectItem value="3">Downtown Apartments - Pool Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {taskType === "repair" && (
              <FormField
                control={form.control}
                name="repairId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repair</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a repair" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* This would be populated from repair data */}
                        <SelectItem value="1">Johnson Pool - Filter Repair</SelectItem>
                        <SelectItem value="2">Smith Residence - Pump Replacement</SelectItem>
                        <SelectItem value="3">Community Center - Heater Fix</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Start Time Field */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Time Field */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Break Duration Field */}
              <FormField
                control={form.control}
                name="breakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any notes about this time entry"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
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
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="gap-1"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-1">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {entryToEdit?.id ? "Update Entry" : "Create Entry"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}