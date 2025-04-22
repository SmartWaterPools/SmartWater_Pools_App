import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRouteStop } from '../../services/bazzaService';
import { useToast } from '../../hooks/use-toast';
import { BazzaRoute, BazzaRouteStop } from '../../lib/types';

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
import { Textarea } from "../ui/textarea";
import { Search } from 'lucide-react';

// Schema for the stop form
const stopFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  position: z.coerce.number().min(1, "Position must be at least 1"),
  estimatedDuration: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type StopFormValues = z.infer<typeof stopFormSchema>;

type StopFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  route: BazzaRoute;
};

export function StopFormDialog({
  isOpen,
  onClose,
  onSuccess,
  route
}: StopFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch clients for dropdown
  const { data: clients = [], isLoading: isClientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch existing stops to determine next position
  const { data: existingStops = [] } = useQuery<BazzaRouteStop[]>({
    queryKey: [`/api/bazza/routes/${route.id}/stops`], // Updated to match our query invalidation pattern
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  // Calculate next position using either orderIndex or position field
  const nextPosition = Array.isArray(existingStops) && existingStops.length > 0 
    ? Math.max(...existingStops.map((stop) => stop.orderIndex || stop.position || 0)) + 1 
    : 1;
    
  console.log("Calculated next position:", nextPosition, "from stops:", existingStops);
  
  // Initialize form
  const form = useForm<StopFormValues>({
    resolver: zodResolver(stopFormSchema),
    defaultValues: {
      clientId: "",
      position: nextPosition,
      estimatedDuration: 15, // default to 15 minutes
      notes: "",
    },
  });
  
  // Create stop mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("Creating route stop with data:", data);
      return createRouteStop(data);
    },
    onSuccess: () => {
      toast({
        title: "Stop added",
        description: "The stop has been successfully added to the route."
      });
      
      console.log("Successfully added stop to route. Invalidating queries...");
      
      // Comprehensive query invalidation to ensure UI updates
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/routes/${route.id}/stops`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bazza/routes/${route.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bazza/routes'] });
      
      // If we know the technician ID, invalidate their routes too
      if (route.technicianId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/bazza/routes/technician/${route.technicianId}`] 
        });
      }
      
      form.reset();
      
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      console.error("Error creating stop:", error);
      toast({
        title: "Error",
        description: "Failed to add the stop. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Filter clients based on search term
  const filteredClients = Array.isArray(clients) 
    ? clients.filter((client: any) => {
        const clientName = client.user?.name || client.name || '';
        return clientName.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : [];
  
  // Handle form submission
  const handleSubmit = (values: StopFormValues) => {
    // Convert clientId to number and match the expected schema field names
    const stopData = {
      routeId: route.id,
      clientId: parseInt(values.clientId, 10),
      orderIndex: values.position, // Schema expects orderIndex, not position
      estimatedDuration: values.estimatedDuration || null,
      customInstructions: values.notes || null // Schema expects customInstructions, not notes
    };
    
    console.log("Submitting stop data:", stopData);
    createMutation.mutate(stopData);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Stop to Route</DialogTitle>
          <DialogDescription>
            Add a new client stop to the route "{route.name}".
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Client search */}
            <div className="space-y-2">
              <Label>Search Clients</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for clients..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Client selection */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isClientsLoading ? (
                        <div className="flex justify-center py-2">
                          <Spinner size="sm" />
                        </div>
                      ) : filteredClients.length > 0 ? (
                        filteredClients.map((client: any) => {
                          // Ensure we always have a display name and ID
                          const displayName = client.user?.name || client.name || `Client ${client.id}`;
                          const clientId = client.id || client.client?.id;
                          
                          if (!clientId) return null;
                          
                          return (
                            <SelectItem key={clientId} value={String(clientId)}>
                              {displayName}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <div className="py-2 px-2 text-center text-muted-foreground">
                          {searchTerm ? 'No clients found' : 'Start typing to search clients'}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Position field */}
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stop Order</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Order in which this stop appears in the route
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Duration field */}
            <FormField
              control={form.control}
              name="estimatedDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Estimated time needed at this stop
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any notes about this stop" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Adding Stop...
                  </>
                ) : (
                  "Add Stop"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for Label to match form styling
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
      {children}
    </div>
  );
}