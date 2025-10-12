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
    // apiRequest expects (method, url, data) not (url, method, data)
    const response = await apiRequest(method, url, data);
    return await response.json();
  };
  
  // Function to create initial project phase for new projects
  // Only creates a single "Design & Planning" phase until more phases are added or a template is used
  const createInitialProjectPhases = async (projectId: number) => {
    try {
      // Create only the initial Design & Planning phase
      const initialPhase = { 
        name: "Design & Planning", 
        order: 1, 
        status: "planning", 
        percentComplete: 0 
      };
      
      // Create the single initial phase
      const phaseResponse = await makeRequest<any>({
        url: "/api/project-phases",
        method: "POST",
        data: {
          ...initialPhase,
          projectId
        },
      });
      
      // Set the current phase to the newly created phase ID
      if (phaseResponse && phaseResponse.id) {
        await makeRequest<any>({
          url: `/api/projects/${projectId}`,
          method: "PATCH",
          data: {
            currentPhase: phaseResponse.id
          },
        });
      }
      
      toast({
        title: "Project Created",
        description: "Project initialized with Design & Planning phase",
      });
    } catch (error) {
      console.error("Failed to create initial project phase:", error);
      toast({
        title: "Error",
        description: "Failed to create initial project phase",
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
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      
      // Create initial "Design & Planning" phase for all new projects
      await createInitialProjectPhases(data.id);
      
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Client</FormLabel>
              <Select
                disabled={clientsLoading || mutation.isPending}
                onValueChange={(value) => {
                  field.onChange(parseInt(value));
                  setSelectedClient(parseInt(value));
                }}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" className="max-h-[200px]">
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
                  <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={4} side="bottom">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      className="rounded-md border"
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
                  <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={4} side="bottom">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      className="rounded-md border"
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
        
        <div className="flex justify-end gap-2 pt-4">
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