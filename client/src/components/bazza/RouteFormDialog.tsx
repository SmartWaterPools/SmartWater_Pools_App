import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { createBazzaRoute, updateBazzaRoute } from '../../services/bazzaService';
import { useToast } from '../../hooks/use-toast';
import { BazzaRoute } from '../../lib/types';
import { queryClient } from '../../lib/queryClient';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";

// Schema for the route form
const routeFormSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  technicianId: z.string(), // Allow empty/null for unassigned
  dayOfWeek: z.string().min(1, "Day of week is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  description: z.string().optional(),
  region: z.string().optional(),
  active: z.boolean().optional().default(true),
});

type RouteFormValues = z.infer<typeof routeFormSchema>;

type RouteFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  onSuccess?: () => void;
  route?: BazzaRoute;
  technicians: { 
    id: number; 
    name: string;
    user?: { 
      id: number;
      name: string;
      email?: string | null;
    } | null;
  }[];
};

export function RouteFormDialog({
  isOpen,
  onClose,
  onSubmit: onFormSubmit,
  onSuccess,
  route,
  technicians
}: RouteFormDialogProps) {
  // Debug component initialization
  console.log("RouteFormDialog: Initializing component", {
    isOpen,
    routeId: route?.id,
    technicianCount: technicians?.length || 0,
    technicians: technicians?.map(t => ({ id: t.id, name: t.name }))
  });
  
  const { toast } = useToast();
  const isEditing = !!route;
  
  // Initialize form with default values or the route data if editing
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: route?.name || "",
      technicianId: route?.technicianId ? String(route.technicianId) : "",
      dayOfWeek: route?.dayOfWeek || "",
      startTime: route?.startTime || "08:00",
      endTime: route?.endTime || "17:00",
      description: route?.description || "",
      region: route?.region || "",
      active: route?.active ?? true,
    },
  });
  
  // Create route mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<BazzaRoute, "id">) => createBazzaRoute(data),
    onSuccess: (newRoute) => {
      console.log("Route created successfully:", newRoute);
      toast({
        title: "Route created",
        description: "The route has been successfully created."
      });
      form.reset();
      if (onFormSubmit) onFormSubmit();
      if (onSuccess) onSuccess();
      
      // Invalidate all route queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      
      // Also invalidate technician-specific routes 
      if (newRoute && newRoute.technicianId) {
        console.log(`Invalidating technician routes for ID: ${newRoute.technicianId}`);
        queryClient.invalidateQueries({ 
          queryKey: ['/api/bazza/routes/technician', newRoute.technicianId] 
        });
      } else {
        // If we don't have technician ID from the response, invalidate based on the form data
        const techId = parseInt(form.getValues().technicianId);
        if (techId) {
          console.log(`Invalidating technician routes for form value ID: ${techId}`);
          queryClient.invalidateQueries({ 
            queryKey: ['/api/bazza/routes/technician', techId] 
          });
        }
      }
      
      // Invalidate all technician routes for safety
      queryClient.invalidateQueries({ 
        queryKey: ['/api/bazza/routes/technician'] 
      });
    },
    onError: (error) => {
      console.error("Error creating route:", error);
      toast({
        title: "Error",
        description: "Failed to create the route. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Update route mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<BazzaRoute>) => {
      if (!route) throw new Error("No route to update");
      return updateBazzaRoute(route.id, data);
    },
    onSuccess: (updatedRoute) => {
      console.log("Route updated successfully:", updatedRoute);
      toast({
        title: "Route updated",
        description: "The route has been successfully updated."
      });
      form.reset();
      if (onFormSubmit) onFormSubmit();
      if (onSuccess) onSuccess();
      
      // Invalidate all route queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      
      // Also invalidate technician-specific routes
      const techId = route?.technicianId || (updatedRoute?.technicianId || 
                     (form.getValues().technicianId ? parseInt(form.getValues().technicianId) : null));
                     
      if (techId) {
        console.log(`Invalidating technician routes for ID: ${techId}`);
        queryClient.invalidateQueries({ 
          queryKey: ['/api/bazza/routes/technician', techId] 
        });
      }
      
      // Invalidate all technician routes for safety
      queryClient.invalidateQueries({ 
        queryKey: ['/api/bazza/routes/technician'] 
      });
    },
    onError: (error) => {
      console.error("Error updating route:", error);
      toast({
        title: "Error",
        description: "Failed to update the route. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (values: RouteFormValues) => {
    // Match exactly what's expected by insertBazzaRouteSchema
    const routeData = {
      name: values.name,
      technicianId: values.technicianId ? parseInt(values.technicianId) : null,
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      description: values.description || null,
      region: values.region || null,
      isActive: values.active,
      // Add required fields from the schema with their exact names
      type: "residential", // Default type - REQUIRED
      isRecurring: true, // REQUIRED
      frequency: "weekly", // REQUIRED
      // Optional fields - use null for null values, undefined for fields to omit entirely
      color: null,
      weekNumber: null, // Explicitly send null
    };
    
    console.log("Submitting route data:", JSON.stringify(routeData, null, 2));
    
    // Modify the service call to send exactly the right schema
    if (isEditing && route) {
      updateMutation.mutate(routeData as any);
    } else {
      createMutation.mutate(routeData as any);
    }
  };
  
  const isPending = createMutation.isPending || updateMutation.isPending;
  
  const daysOfWeek = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Route" : "Create New Route"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the route details below." 
              : "Fill in the details below to create a new route."
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter route name" {...field} />
                  </FormControl>
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
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {technicians.length > 0 ? (
                        technicians.map(tech => {
                          // Ensure we always have a display name
                          let displayName = "Unnamed technician";
                          
                          if (tech.name && typeof tech.name === 'string' && tech.name.trim() !== '') {
                            displayName = tech.name;
                          } else if (tech.user?.name && typeof tech.user.name === 'string') {
                            displayName = tech.user.name;
                          } else {
                            displayName = `Technician ${tech.id}`;
                          }
                          
                          return (
                            <SelectItem key={tech.id} value={String(tech.id)}>
                              {displayName}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-techs" disabled>No technicians available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter region (e.g., North, East, etc.)" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional region for this route.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter route description" {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional description of this route.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active Route
                    </FormLabel>
                    <FormDescription>
                      Inactive routes will not be included in scheduling.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditing ? "Update Route" : "Create Route"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}