import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
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
import { CalendarIcon, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClientWithUser, TechnicianWithUser } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema
const maintenanceFormSchema = z.object({
  clientId: z.coerce.number({
    required_error: "Please select a client",
  }),
  technicianId: z.coerce.number().optional(),
  scheduleDate: z.date({
    required_error: "Please select a date",
  }),
  type: z.string({
    required_error: "Please select a maintenance type",
  }),
  notes: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"], {
    required_error: "Please select a status",
  }).default("scheduled"),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

// Standard maintenance types
const MAINTENANCE_TYPES = [
  "regular_maintenance",
  "chemical_balancing",
  "filter_cleaning",
  "equipment_check",
  "deep_cleaning",
  "seasonal_opening",
  "seasonal_closing",
  "inspection",
];

export default function MaintenanceAdd() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Navigate function
  const navigate = (path: string) => {
    setLocation(path);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get query parameters
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get('date');
  const initialDate = dateParam ? new Date(dateParam) : new Date();

  // Form definition
  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      scheduleDate: initialDate,
      status: "scheduled",
      notes: "",
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery<ClientWithUser[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch technicians
  const { data: technicians = [] } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians"],
  });

  // Create maintenance mutation
  const createMaintenanceMutation = useMutation({
    mutationFn: async (values: MaintenanceFormValues) => {
      return await apiRequest("/api/maintenances", "POST", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenances/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Maintenance scheduled",
        description: "The maintenance has been scheduled successfully.",
      });
      navigate("/maintenance");
    },
    onError: (error) => {
      toast({
        title: "Failed to schedule maintenance",
        description: "There was an error scheduling the maintenance. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });

  // Format maintenance type for display
  const formatMaintenanceType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Form submission handler
  function onSubmit(data: MaintenanceFormValues) {
    setIsSubmitting(true);
    createMaintenanceMutation.mutate(data, {
      onSettled: () => {
        setIsSubmitting(false);
      }
    });
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate("/maintenance")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">Schedule Maintenance</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Details</CardTitle>
          <CardDescription>
            Schedule a new maintenance appointment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client: ClientWithUser) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.user.name} {client.companyName ? `(${client.companyName})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technician</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a technician" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians.map((technician: TechnicianWithUser) => (
                            <SelectItem key={technician.id} value={technician.id.toString()}>
                              {technician.user.name} - {technician.specialization}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduleDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
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

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select maintenance type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MAINTENANCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {formatMaintenanceType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter additional details like time and special instructions"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include time of appointment and any specific instructions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/maintenance")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Maintenance"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}