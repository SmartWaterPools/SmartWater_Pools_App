import { useState } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectSchema } from "@shared/schema";
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
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Extend the insert schema with custom validation
const projectFormSchema = insertProjectSchema.extend({
  clientId: z.coerce.number({
    required_error: "Client is required",
  }),
  name: z.string().min(3, {
    message: "Project name must be at least 3 characters",
  }),
  description: z.string().min(10, {
    message: "Project description must be at least 10 characters",
  }),
  budget: z.coerce.number({
    required_error: "Budget is required",
  }).min(0, {
    message: "Budget must be a positive number",
  }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  // Use the expected schema field name but keep our UI field name
  estimatedCompletionDate: z.date({
    required_error: "Estimated end date is required",
  }),
  status: z.enum(["planning", "in_progress", "review", "completed"], {
    required_error: "Status is required",
  }),
  projectType: z.enum(["construction", "renovation", "repair", "maintenance"], {
    required_error: "Project type is required",
  }),
  permitDetails: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  onClose: () => void;
}

export function ProjectForm({ onClose }: ProjectFormProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [showPhases, setShowPhases] = useState(false);

  // Retrieve the list of clients for the dropdown
  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });
  
  // Custom wrapper function that extracts params from an object
  // This is needed because the apiRequest function signature doesn't match how it's called in the project
  const makeRequest = async <T,>(params: {url: string, method: string, data?: any}): Promise<T> => {
    const { url, method, data } = params;
    // We're actually calling the existing apiRequest function passing positional arguments
    return await apiRequest<T>(url, method, data);
  };
  
  // Function to create initial project phases for construction projects
  const createInitialProjectPhases = async (projectId: number) => {
    try {
      // Define standard construction project phases
      const constructionPhases = [
        { name: "Design & Planning", order: 1, status: "planning", percentComplete: 0 },
        { name: "Permits & Approvals", order: 2, status: "pending", percentComplete: 0 },
        { name: "Excavation & Site Prep", order: 3, status: "pending", percentComplete: 0 },
        { name: "Foundation", order: 4, status: "pending", percentComplete: 0 },
        { name: "Pool Shell Construction", order: 5, status: "pending", percentComplete: 0 },
        { name: "Plumbing & Electrical", order: 6, status: "pending", percentComplete: 0 },
        { name: "Decking & Finishes", order: 7, status: "pending", percentComplete: 0 },
        { name: "Equipment Installation", order: 8, status: "pending", percentComplete: 0 },
        { name: "Final Inspection", order: 9, status: "pending", percentComplete: 0 },
      ];
      
      // Create each phase in sequence
      for (const phase of constructionPhases) {
        await makeRequest<any>({
          url: "/api/project-phases",
          method: "POST",
          data: {
            ...phase,
            projectId
          },
        });
      }
      
      // Update the project with the first phase as current phase
      await makeRequest<any>({
        url: `/api/projects/${projectId}`,
        method: "PATCH",
        data: {
          currentPhase: "Design & Planning"
        },
      });
      
      toast({
        title: "Project Phases Created",
        description: "Initial project phases have been created",
      });
    } catch (error) {
      console.error("Failed to create project phases:", error);
      toast({
        title: "Error",
        description: "Failed to create project phases",
        variant: "destructive",
      });
    }
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      budget: 0,
      status: "planning",
      projectType: "construction",
      permitDetails: "",
      startDate: new Date(),
      estimatedCompletionDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      // Convert dates to ISO strings for the API
      const dataToSubmit = {
        ...values,
        estimatedCompletionDate: values.estimatedCompletionDate.toISOString().split('T')[0],
        startDate: values.startDate.toISOString().split('T')[0],
      };
      
      const result = await makeRequest<any>({
        url: "/api/projects",
        method: "POST",
        data: dataToSubmit,
      });
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      
      // Create initial project phases for construction projects
      if (form.getValues("projectType") === "construction" || form.getValues("projectType") === "renovation") {
        createInitialProjectPhases(data.id);
      }
      
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
      console.error("Project creation failed:", error);
    },
  });

  function onSubmit(values: ProjectFormValues) {
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
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.user?.name || 'Unknown Client'}
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter project name"
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter project description"
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
          name="budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter project budget"
                  disabled={mutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
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
            name="estimatedCompletionDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Estimated End Date</FormLabel>
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
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={(date) => {
                        // Disable dates before start date
                        const startDate = form.getValues("startDate");
                        return startDate ? date < startDate : false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  disabled={mutation.isPending}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Type</FormLabel>
                <Select
                  disabled={mutation.isPending}
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="construction">New Construction</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="repair">Major Repair</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="permitDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permit Details (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter permit details or requirements"
                  disabled={mutation.isPending}
                  {...field}
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
            {mutation.isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </Form>
  );
}