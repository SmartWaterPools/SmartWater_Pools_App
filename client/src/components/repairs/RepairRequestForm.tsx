import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertRepairSchema } from "@shared/schema";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extend the schema with additional validation
const repairFormSchema = insertRepairSchema.extend({
  clientId: z.number().min(1, "Please select a client"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(["low", "medium", "high"]),
});

type RepairFormValues = z.infer<typeof repairFormSchema>;

interface RepairRequestFormProps {
  onClose: () => void;
}

export function RepairRequestForm({ onClose }: RepairRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: {
      clientId: 1, // Default to first client for demo
      issueType: "",
      description: "",
      priority: "medium",
      status: "pending",
      technicianId: null,
      scheduledDate: null,
      scheduledTime: null,
      notes: ""
    }
  });
  
  const createRepairMutation = useMutation({
    mutationFn: async (values: RepairFormValues) => {
      const response = await apiRequest('POST', '/api/repairs', values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Repair request submitted",
        description: "The repair request has been successfully created.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit repair request. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
  function onSubmit(values: RepairFormValues) {
    setIsSubmitting(true);
    createRepairMutation.mutate(values);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Submit a Repair Request</h2>
        <p className="text-sm text-gray-500">
          Please provide details about the issue you're experiencing
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="issueType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue Type</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pump Failure">Pump Failure</SelectItem>
                      <SelectItem value="Leaking Pipe">Leaking Pipe</SelectItem>
                      <SelectItem value="Heater Issue">Heater Issue</SelectItem>
                      <SelectItem value="Electrical Problem">Electrical Problem</SelectItem>
                      <SelectItem value="Water Quality">Water Quality</SelectItem>
                      <SelectItem value="Filter Problem">Filter Problem</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                    placeholder="Please describe the issue in detail"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Include any relevant details that might help our technicians.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  High priority is for urgent issues that affect pool safety or operation.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional information"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
