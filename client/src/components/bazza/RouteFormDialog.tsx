import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../lib/queryClient';
import { createBazzaRoute, updateBazzaRoute } from '../../services/bazzaService';
import { useToast } from '../../hooks/use-toast';
import { BazzaRoute } from '../../lib/types';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Spinner } from "../../components/ui/spinner";
import { Label } from "../../components/ui/label";

// Define the form schema
const routeFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  type: z.string().min(1, 'Type is required'),
  technicianId: z.union([
    z.string().transform(val => val === '' ? null : parseInt(val, 10)),
    z.number().nullable(),
    z.null()
  ]),
  dayOfWeek: z.string().min(1, 'Day of week is required'),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

type RouteFormValues = z.infer<typeof routeFormSchema>;

interface RouteFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  route?: BazzaRoute; // If provided, we're editing an existing route
  technicians: { id: number; name: string }[];
  onSuccess?: (route: BazzaRoute) => void;
}

export function RouteFormDialog({
  isOpen,
  onClose,
  route,
  technicians,
  onSuccess
}: RouteFormDialogProps) {
  const { toast } = useToast();
  const isEditMode = !!route;

  // Initialize the form
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: route?.name || '',
      description: route?.description || '',
      type: route?.type || 'standard',
      technicianId: route?.technicianId === null ? null : 
                  route?.technicianId !== undefined ?
                  route.technicianId : null,
      dayOfWeek: route?.dayOfWeek || '',
      startTime: route?.startTime || '',
      endTime: route?.endTime || '',
      color: route?.color || '',
      isActive: route?.isActive ?? true,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<BazzaRoute, 'id'>) => createBazzaRoute(data),
    onSuccess: (newRoute) => {
      import('../../lib/queryClient').then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      });
      toast({
        title: 'Route created',
        description: 'The route has been created successfully.',
      });
      if (onSuccess) onSuccess(newRoute);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create route: ${(error as Error).message}`,
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BazzaRoute> }) => updateBazzaRoute(id, data),
    onSuccess: (updatedRoute) => {
      import('../../lib/queryClient').then(({ queryClient }) => {
        queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      });
      toast({
        title: 'Route updated',
        description: 'The route has been updated successfully.',
      });
      if (onSuccess) onSuccess(updatedRoute);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update route: ${(error as Error).message}`,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: RouteFormValues) => {
    // Convert form values to route data
    const routeData = {
      name: data.name,
      description: data.description,
      type: data.type,
      technicianId: typeof data.technicianId === 'string' && data.technicianId === '' ? null :
                   typeof data.technicianId === 'string' ? 
                   parseInt(data.technicianId, 10) : data.technicianId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      color: data.color || null,
      isActive: data.isActive,
    };

    if (isEditMode && route) {
      updateMutation.mutate({ id: route.id, data: routeData });
    } else {
      createMutation.mutate(routeData as Omit<BazzaRoute, 'id'>);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Route' : 'Create New Route'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the details of this maintenance route.'
              : 'Create a new maintenance route for technicians.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Name*</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., North Area Monday Route" />
                  </FormControl>
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
                    <Textarea 
                      {...field} 
                      value={field.value || ''}
                      placeholder="Brief description of this route" 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route Type*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="express">Express</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
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
                      value={field.value === null ? '' : 
                            typeof field.value === 'number' ? field.value.toString() : (field.value || '')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select technician" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {technicians.map(tech => (
                          <SelectItem key={tech.id} value={tech.id.toString()}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Monday">Monday</SelectItem>
                        <SelectItem value="Tuesday">Tuesday</SelectItem>
                        <SelectItem value="Wednesday">Wednesday</SelectItem>
                        <SelectItem value="Thursday">Thursday</SelectItem>
                        <SelectItem value="Friday">Friday</SelectItem>
                        <SelectItem value="Saturday">Saturday</SelectItem>
                        <SelectItem value="Sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Route Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input 
                          {...field} 
                          value={field.value || ''} 
                          placeholder="#RRGGBB" 
                          type="text"
                          className="flex-grow"
                        />
                        <Input 
                          type="color" 
                          value={field.value || '#3b82f6'} 
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-10 p-1 h-10"
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Choose a color for this route in the calendar
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        type="time" 
                        placeholder="Start time" 
                      />
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
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        type="time" 
                        placeholder="End time" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Toggle whether this route is currently active
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner className="mr-2 h-4 w-4" />}
                {isEditMode ? 'Update Route' : 'Create Route'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default RouteFormDialog;