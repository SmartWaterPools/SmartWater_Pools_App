import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { insertRepairSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Extend the insert schema with custom validation
const repairFormSchema = insertRepairSchema.extend({
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters",
  }),
  issue: z.string().min(1, {
    message: "Issue type is required",
  }),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Priority is required",
  }),
  scheduledDate: z.date().optional(),
  scheduledTime: z.string().optional(),
});

type RepairFormValues = z.infer<typeof repairFormSchema>;

interface RepairRequestFormProps {
  onClose: () => void;
}

export function RepairRequestForm({ onClose }: RepairRequestFormProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<number | null>(null);

  // Retrieve the list of clients for the dropdown
  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: {
      description: "",
      issue: "",
      priority: "medium",
      status: "pending",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: RepairFormValues) => {
      // Add reportedDate to the form values before submitting
      const dataToSubmit = {
        ...values,
        reportedDate: new Date(),
        completionDate: null,
      };
      
      return apiRequest({
        url: "/api/repairs",
        method: "POST",
        data: dataToSubmit,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Repair request submitted successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to submit repair request. Please try again.",
        variant: "destructive",
      });
      console.error("Repair request submission failed:", error);
    },
  } as any);

  function onSubmit(values: RepairFormValues) {
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select
                disabled={clientsLoading || mutation.isPending}
                onValueChange={(value) => {
                  field.onChange(parseInt(value));
                  setSelectedClient(parseInt(value));
                }}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.user.name}
                      {client.companyName && ` (${client.companyName})`}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the issue in detail"
                  disabled={mutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="issue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Type</FormLabel>
              <Select
                disabled={mutation.isPending}
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="leak">Leak</SelectItem>
                  <SelectItem value="pump">Pump Problem</SelectItem>
                  <SelectItem value="filter">Filter Issue</SelectItem>
                  <SelectItem value="heater">Heater Problem</SelectItem>
                  <SelectItem value="chemical">Chemical Imbalance</SelectItem>
                  <SelectItem value="electrical">Electrical Issue</SelectItem>
                  <SelectItem value="structural">Structural Damage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
              <Select
                disabled={mutation.isPending}
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Preferred Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${
                          !field.value ? "text-muted-foreground" : ""
                        }`}
                        disabled={mutation.isPending}
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
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="scheduledTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Time (Optional)</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type="time"
                      disabled={mutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
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
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional information or special instructions"
                  disabled={mutation.isPending}
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting..." : "Submit Repair Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}