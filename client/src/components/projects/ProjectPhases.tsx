import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Clock, Edit, Plus, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";

// API request helper - needed to avoid TypeScript errors with the existing apiRequest function
const makeRequest = async <T,>(params: {url: string, method: string, data?: any}): Promise<T> => {
  const { url, method, data } = params;
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  
  return await res.json() as T;
};

// Validation schema for project phase form
const phaseFormSchema = z.object({
  name: z.string().min(1, "Phase name is required"),
  status: z.enum(["planning", "pending", "in_progress", "completed", "delayed"]),
  percentComplete: z.number().min(0).max(100),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  notes: z.string().optional(),
});

type PhaseFormValues = z.infer<typeof phaseFormSchema>;

interface ProjectPhase {
  id: number;
  projectId: number;
  name: string;
  status: string;
  order: number;
  percentComplete: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

interface ProjectPhaseProps {
  projectId: number;
  currentPhase?: string | null;
}

export function ProjectPhases({ projectId, currentPhase }: ProjectPhaseProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [showAddPhaseDialog, setShowAddPhaseDialog] = useState(false);

  // Fetch project phases
  const { data: phases = [], isLoading } = useQuery<ProjectPhase[]>({
    queryKey: ["/api/projects", projectId, "phases"],
    queryFn: async () => {
      return await makeRequest<ProjectPhase[]>({
        url: `/api/projects/${projectId}/phases`,
        method: "GET"
      });
    }
  });

  // Form for editing an existing phase
  const editForm = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: {
      name: "",
      status: "pending",
      percentComplete: 0,
      notes: "",
    },
  });

  // Form for adding a new phase
  const addForm = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseFormSchema),
    defaultValues: {
      name: "",
      status: "pending",
      percentComplete: 0,
      notes: "",
    },
  });

  // Set up the form with existing values when editing
  React.useEffect(() => {
    if (editingPhase) {
      editForm.reset({
        name: editingPhase.name,
        status: editingPhase.status as any,
        percentComplete: editingPhase.percentComplete,
        startDate: editingPhase.startDate ? new Date(editingPhase.startDate) : undefined,
        endDate: editingPhase.endDate ? new Date(editingPhase.endDate) : undefined,
        notes: editingPhase.notes || "",
      });
    }
  }, [editingPhase, editForm]);

  // Mutation for updating a phase
  const updatePhaseMutation = useMutation({
    mutationFn: async (values: PhaseFormValues & { id: number }) => {
      const { id, ...data } = values;
      
      // Format dates for API
      const formattedData = {
        ...data,
        startDate: data.startDate ? data.startDate.toISOString().split('T')[0] : null,
        endDate: data.endDate ? data.endDate.toISOString().split('T')[0] : null,
      };
      
      return await makeRequest<ProjectPhase>({
        url: `/api/project-phases/${id}`,
        method: "PATCH",
        data: formattedData
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project phase updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "phases"] });
      setEditingPhase(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update project phase",
        variant: "destructive",
      });
      console.error("Phase update failed:", error);
    },
  });

  // Mutation for adding a new phase
  const addPhaseMutation = useMutation({
    mutationFn: async (values: PhaseFormValues) => {
      // Format dates for API
      const formattedData = {
        ...values,
        projectId,
        order: phases.length + 1, // Set order to be after existing phases
        startDate: values.startDate ? values.startDate.toISOString().split('T')[0] : null,
        endDate: values.endDate ? values.endDate.toISOString().split('T')[0] : null,
      };
      
      return await makeRequest<ProjectPhase>({
        url: "/api/project-phases",
        method: "POST",
        data: formattedData
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "New project phase added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "phases"] });
      setShowAddPhaseDialog(false);
      addForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add project phase",
        variant: "destructive",
      });
      console.error("Phase creation failed:", error);
    },
  });

  // Handle update form submission
  function onUpdateSubmit(values: PhaseFormValues) {
    if (editingPhase) {
      updatePhaseMutation.mutate({ ...values, id: editingPhase.id });
    }
  }

  // Handle add form submission
  function onAddSubmit(values: PhaseFormValues) {
    addPhaseMutation.mutate(values);
  }

  // Update project to set current phase
  const updateCurrentPhaseMutation = useMutation({
    mutationFn: async (phaseName: string) => {
      return await makeRequest<any>({
        url: `/api/projects/${projectId}`,
        method: "PATCH",
        data: { currentPhase: phaseName }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Current phase updated successfully",
      });
      // May need to invalidate the project data to reflect the change
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update current phase",
        variant: "destructive",
      });
      console.error("Current phase update failed:", error);
    },
  });

  const setAsCurrentPhase = (phaseName: string) => {
    updateCurrentPhaseMutation.mutate(phaseName);
  };

  // Get status indicator based on phase status
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "planning":
        return (
          <div className="flex items-center text-blue-500">
            <Clock className="w-4 h-4 mr-1" />
            Planning
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center text-amber-500">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </div>
        );
      case "in_progress":
        return (
          <div className="flex items-center text-green-500">
            <ChevronRight className="w-4 h-4 mr-1" />
            In Progress
          </div>
        );
      case "completed":
        return (
          <div className="flex items-center text-green-600">
            <Check className="w-4 h-4 mr-1" />
            Completed
          </div>
        );
      case "delayed":
        return (
          <div className="flex items-center text-red-500">
            <X className="w-4 h-4 mr-1" />
            Delayed
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-500">
            {status}
          </div>
        );
    }
  };

  // Get progress bar color based on progress percentage
  const getProgressColor = (percent: number) => {
    if (percent === 100) return "bg-green-500";
    if (percent > 75) return "bg-emerald-500";
    if (percent > 50) return "bg-blue-500";
    if (percent > 25) return "bg-amber-500";
    return "bg-gray-500";
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading project phases...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Phases</h3>
        <Button onClick={() => setShowAddPhaseDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Phase
        </Button>
      </div>

      {phases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No phases have been defined for this project yet.
        </div>
      ) : (
        <div className="space-y-4">
          {phases
            .sort((a, b) => a.order - b.order)
            .map((phase) => (
              <div
                key={phase.id}
                className={`border rounded-lg overflow-hidden ${
                  currentPhase === phase.name
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <h4 className="font-medium">{phase.name}</h4>
                        {currentPhase === phase.name && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getStatusIndicator(phase.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentPhase !== phase.name && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAsCurrentPhase(phase.name)}
                        >
                          Set as Current
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPhase(phase)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{phase.percentComplete}%</span>
                    </div>
                    <Progress
                      value={phase.percentComplete}
                      className={`h-2 ${getProgressColor(phase.percentComplete)}`}
                    />
                  </div>

                  {(phase.startDate || phase.endDate) && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      {phase.startDate && (
                        <span>
                          Start: {format(new Date(phase.startDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {phase.startDate && phase.endDate && (
                        <span className="mx-2">•</span>
                      )}
                      {phase.endDate && (
                        <span>
                          End: {format(new Date(phase.endDate), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  )}

                  {phase.notes && (
                    <div className="mt-3 text-sm">
                      <div className="text-muted-foreground">Notes:</div>
                      <div className="mt-1">{phase.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Edit Phase Dialog */}
      <Dialog open={!!editingPhase} onOpenChange={(open) => !open && setEditingPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project Phase</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phase name"
                        disabled={updatePhaseMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        disabled={updatePhaseMutation.isPending}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="percentComplete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          disabled={updatePhaseMutation.isPending}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any notes for this phase"
                        disabled={updatePhaseMutation.isPending}
                        {...field}
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
                  onClick={() => setEditingPhase(null)}
                  disabled={updatePhaseMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePhaseMutation.isPending}>
                  {updatePhaseMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Phase Dialog */}
      <Dialog open={showAddPhaseDialog} onOpenChange={setShowAddPhaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Phase</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phase name"
                        disabled={addPhaseMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        disabled={addPhaseMutation.isPending}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="percentComplete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          disabled={addPhaseMutation.isPending}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any notes for this phase"
                        disabled={addPhaseMutation.isPending}
                        {...field}
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
                  onClick={() => setShowAddPhaseDialog(false)}
                  disabled={addPhaseMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addPhaseMutation.isPending}>
                  {addPhaseMutation.isPending ? "Adding..." : "Add Phase"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}