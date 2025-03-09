import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Clock, Edit, Plus, X, AlertTriangle, AlertCircle, BarChart2, FileText } from "lucide-react";
import { getTemplateByKey, getTemplateOptions, PhaseTemplate } from "@/lib/phaseTemplates";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ProjectTimeline } from "./ProjectTimeline";
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
  description: z.string().optional(),
  status: z.enum(["planning", "pending", "in_progress", "completed", "delayed"]),
  percentComplete: z.number().min(0).max(100),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  notes: z.string().optional(),
  estimatedDuration: z.number().int().nonnegative().optional(),
  actualDuration: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  permitRequired: z.boolean().default(false),
  inspectionRequired: z.boolean().default(false),
  inspectionDate: z.date().optional(),
  inspectionPassed: z.boolean().optional(),
  inspectionNotes: z.string().optional(),
}).refine(data => {
  // If there's an end date, ensure it's after the start date
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"]
}).refine(data => {
  // If inspection is required, make sure inspection date is set when inspection passed is true
  if (data.inspectionRequired && data.inspectionPassed && !data.inspectionDate) {
    return false;
  }
  return true;
}, {
  message: "Inspection date is required when inspection is passed",
  path: ["inspectionDate"]
});

type PhaseFormValues = z.infer<typeof phaseFormSchema>;

interface ProjectPhase {
  id: number;
  projectId: number;
  name: string;
  description?: string | null;
  status: string;
  order: number;
  percentComplete: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  estimatedDuration?: number | null;
  actualDuration?: number | null;
  cost?: number | null;
  permitRequired?: boolean;
  inspectionRequired?: boolean;
  inspectionDate?: string | null;
  inspectionPassed?: boolean | null;
  inspectionNotes?: string | null;
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
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

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
      description: "",
      status: "pending",
      percentComplete: 0,
      notes: "",
      estimatedDuration: undefined,
      actualDuration: undefined,
      cost: undefined,
      permitRequired: false,
      inspectionRequired: false,
      inspectionDate: undefined,
      inspectionPassed: undefined,
      inspectionNotes: "",
    },
  });

  // Set up the form with existing values when editing
  React.useEffect(() => {
    if (editingPhase) {
      editForm.reset({
        name: editingPhase.name,
        description: editingPhase.description || "",
        status: editingPhase.status as any,
        percentComplete: editingPhase.percentComplete,
        startDate: editingPhase.startDate ? new Date(editingPhase.startDate) : undefined,
        endDate: editingPhase.endDate ? new Date(editingPhase.endDate) : undefined,
        notes: editingPhase.notes || "",
        estimatedDuration: editingPhase.estimatedDuration || undefined,
        actualDuration: editingPhase.actualDuration || undefined,
        cost: editingPhase.cost || undefined,
        permitRequired: editingPhase.permitRequired || false,
        inspectionRequired: editingPhase.inspectionRequired || false,
        inspectionDate: editingPhase.inspectionDate ? new Date(editingPhase.inspectionDate) : undefined,
        inspectionPassed: editingPhase.inspectionPassed || undefined,
        inspectionNotes: editingPhase.inspectionNotes || "",
      });
    }
  }, [editingPhase, editForm]);

  // Mutation for updating a phase
  const updatePhaseMutation = useMutation({
    mutationFn: async (values: PhaseFormValues & { id: number }) => {
      const { id, ...data } = values;
      
      // Start with required data
      const baseData = {
        name: data.name,
        status: data.status,
        percentComplete: data.percentComplete
      };
      
      // Build data object carefully
      const formattedData: Record<string, any> = { ...baseData };
      
      // Add optional string fields if they have content
      if (data.description) formattedData.description = data.description;
      if (data.notes) formattedData.notes = data.notes;
      if (data.inspectionNotes) formattedData.inspectionNotes = data.inspectionNotes;
      
      // Add optional date fields with proper formatting or omit them
      if (data.startDate) {
        formattedData.startDate = data.startDate.toISOString().split('T')[0];
      }
      if (data.endDate) {
        formattedData.endDate = data.endDate.toISOString().split('T')[0];
      }
      if (data.inspectionDate) {
        formattedData.inspectionDate = data.inspectionDate.toISOString().split('T')[0];
      }
      
      // Add optional numeric fields only if they have values
      if (typeof data.estimatedDuration === 'number') {
        formattedData.estimatedDuration = data.estimatedDuration;
      }
      if (typeof data.actualDuration === 'number') {
        formattedData.actualDuration = data.actualDuration;
      }
      if (typeof data.cost === 'number') {
        formattedData.cost = data.cost;
      }
      
      // Add boolean fields explicitly
      formattedData.permitRequired = data.permitRequired === true;
      formattedData.inspectionRequired = data.inspectionRequired === true;
      if (data.inspectionPassed !== undefined) {
        formattedData.inspectionPassed = data.inspectionPassed;
      }
      
      console.log(`Updating phase ${id} with data:`, JSON.stringify(formattedData));
      
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
      // Start with base data that definitely needs to be included
      const baseData = {
        name: values.name,
        status: values.status,
        projectId,
        order: phases.length + 1, // Set order to be after existing phases - critical field
        percentComplete: values.percentComplete
      };
      
      // Build data object carefully to avoid sending null/undefined for optional values
      const formattedData: Record<string, any> = { ...baseData };
      
      // Add optional string fields if they have content
      if (values.description) formattedData.description = values.description;
      if (values.notes) formattedData.notes = values.notes;
      if (values.inspectionNotes) formattedData.inspectionNotes = values.inspectionNotes;
      
      // Add optional date fields with proper formatting or omit them
      if (values.startDate) {
        formattedData.startDate = values.startDate.toISOString().split('T')[0];
      }
      if (values.endDate) {
        formattedData.endDate = values.endDate.toISOString().split('T')[0];
      }
      if (values.inspectionDate) {
        formattedData.inspectionDate = values.inspectionDate.toISOString().split('T')[0];
      }
      
      // Add optional numeric fields only if they have values
      if (typeof values.estimatedDuration === 'number') {
        formattedData.estimatedDuration = values.estimatedDuration;
      }
      if (typeof values.actualDuration === 'number') {
        formattedData.actualDuration = values.actualDuration;
      }
      if (typeof values.cost === 'number') {
        formattedData.cost = values.cost;
      }
      
      // Add boolean fields explicitly to avoid null/undefined
      formattedData.permitRequired = values.permitRequired === true;
      formattedData.inspectionRequired = values.inspectionRequired === true;
      if (values.inspectionPassed !== undefined) {
        formattedData.inspectionPassed = values.inspectionPassed;
      }
      
      console.log("Adding new phase with data:", JSON.stringify(formattedData));
      
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
  
  // Mutation for applying a template (creating multiple phases from a template)
  const applyTemplateMutation = useMutation({
    mutationFn: async (templateKey: string) => {
      const template = getTemplateByKey(templateKey);
      
      if (!template) {
        throw new Error("Template not found");
      }
      
      const currentPhasesCount = Array.isArray(phases) ? phases.length : 0;
      
      // Create a promise for each phase in the template
      const promises = template.phases.map(async (phaseTemplate, index) => {
        // Ensure proper handling of properties, especially numeric fields
        // Include only what's needed and be explicit about types
        const phaseData = {
          name: phaseTemplate.name,
          description: phaseTemplate.description || "",
          status: "pending" as const,
          percentComplete: 0,
          projectId,
          // Critical: order must be a number, not null or undefined
          order: index + 1 + currentPhasesCount, 
          permitRequired: phaseTemplate.permitRequired === true,
          inspectionRequired: phaseTemplate.inspectionRequired === true
        };
        
        // Only add estimatedDuration if it's a positive number
        if (typeof phaseTemplate.estimatedDuration === 'number' && phaseTemplate.estimatedDuration > 0) {
          Object.assign(phaseData, { estimatedDuration: phaseTemplate.estimatedDuration });
        }
        
        console.log(`Creating phase from template: ${phaseTemplate.name}`, JSON.stringify(phaseData));
        
        return await makeRequest<ProjectPhase>({
          url: "/api/project-phases",
          method: "POST",
          data: phaseData
        });
      });
      
      // Wait for all phases to be created
      return await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template phases added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "phases"] });
      setShowTemplateDialog(false);
      setSelectedTemplate("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
      console.error("Template application failed:", error);
    },
  });
  
  // Handle template selection and application
  function applyTemplate() {
    if (selectedTemplate) {
      applyTemplateMutation.mutate(selectedTemplate);
    }
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
        <div className="flex gap-2">
          <Button onClick={() => setShowTemplateDialog(true)} size="sm" variant="outline">
            <FileText className="w-4 h-4 mr-1" />
            Use Template
          </Button>
          <Button onClick={() => setShowAddPhaseDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Phase
          </Button>
        </div>
      </div>

      {!phases || phases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No phases have been defined for this project yet.
        </div>
      ) : (
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="list">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Phase List
              </div>
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <div className="flex items-center">
                <BarChart2 className="w-4 h-4 mr-2" />
                Timeline View
              </div>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-0">
            <div className="space-y-4">
              {Array.isArray(phases) && phases
                .slice() // Create a copy of the array to safely sort
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
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium">{phase.name}</h4>
                            {currentPhase === phase.name && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getStatusIndicator(phase.status)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                          {currentPhase !== phase.name && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAsCurrentPhase(phase.name)}
                              className="w-full xs:w-auto"
                            >
                              Set as Current
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPhase(phase)}
                            className="w-full xs:w-auto"
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

                      {/* Show construction-specific details */}
                      <div className="mt-3 grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
                        {phase.estimatedDuration && (
                          <div className="text-sm border rounded p-2 bg-muted/20">
                            <div className="text-muted-foreground text-xs font-medium">Est. Duration:</div>
                            <div className="truncate">{phase.estimatedDuration} days</div>
                          </div>
                        )}
                        
                        {phase.cost && (
                          <div className="text-sm border rounded p-2 bg-muted/20">
                            <div className="text-muted-foreground text-xs font-medium">Budget:</div>
                            <div className="truncate">${phase.cost.toLocaleString()}</div>
                          </div>
                        )}
                        
                        {phase.permitRequired && (
                          <div className="text-sm border rounded p-2 bg-muted/20">
                            <div className="text-muted-foreground text-xs font-medium">Permits:</div>
                            <div className="flex items-center truncate">
                              <span className="text-amber-500">
                                <AlertTriangle className="h-3 w-3 mr-1 inline" />
                                Required
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {phase.inspectionRequired && (
                          <div className="text-sm border rounded p-2 bg-muted/20">
                            <div className="text-muted-foreground text-xs font-medium">Inspection:</div>
                            <div className="flex items-center text-xs sm:text-sm truncate">
                              {phase.inspectionPassed ? (
                                <span className="text-green-500">
                                  <Check className="h-3 w-3 mr-1 inline" />
                                  Passed
                                </span>
                              ) : phase.inspectionDate ? (
                                <span className="text-amber-500">
                                  <Clock className="h-3 w-3 mr-1 inline" />
                                  <span className="hidden sm:inline">Scheduled: </span>
                                  {format(new Date(phase.inspectionDate), "MMM d, yyyy")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  <AlertCircle className="h-3 w-3 mr-1 inline" />
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Description if available */}
                      {phase.description && (
                        <div className="mt-3 text-sm">
                          <div className="text-muted-foreground">Description:</div>
                          <div className="mt-1">{phase.description}</div>
                        </div>
                      )}
                      
                      {/* Notes if available */}
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
          </TabsContent>
          
          <TabsContent value="timeline" className="mt-0">
            {Array.isArray(phases) && phases.length > 0 ? (
              // Create a safe copy of phases with guaranteed array methods
              (() => {
                // Ensure we have a proper array with all required methods
                const safePhases = [...phases].map(phase => ({
                  ...phase, 
                  // Default values for essential properties
                  order: phase.order || 0,
                  percentComplete: phase.percentComplete || 0,
                  status: phase.status || "pending"
                }));
                console.log("Safe phases for timeline:", safePhases);
                return <ProjectTimeline phases={safePhases} currentPhase={currentPhase} />;
              })()
            ) : (
              <div className="p-8 text-center border rounded-lg bg-muted/10">
                <p className="text-muted-foreground">
                  No phases have been defined yet. Please add phases to view the timeline.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
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
                          className="w-full"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={updatePhaseMutation.isPending}
                          value={field.value ? field.value.toISOString().split('T')[0] : ""}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            field.onChange(date);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={updatePhaseMutation.isPending}
                          value={field.value ? field.value.toISOString().split('T')[0] : ""}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            field.onChange(date);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Duration (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-full"
                          disabled={updatePhaseMutation.isPending}
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="actualDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Duration (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-full"
                          disabled={updatePhaseMutation.isPending}
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-full"
                          disabled={updatePhaseMutation.isPending}
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col space-y-4">
                  <FormField
                    control={editForm.control}
                    name="permitRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 mt-1"
                            checked={field.value}
                            disabled={updatePhaseMutation.isPending}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Permit Required</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={editForm.control}
                  name="inspectionRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-1"
                          checked={field.value}
                          disabled={updatePhaseMutation.isPending}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Inspection Required</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {editForm.watch("inspectionRequired") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="inspectionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspection Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            disabled={updatePhaseMutation.isPending}
                            value={field.value ? field.value.toISOString().split('T')[0] : ""}
                            onChange={(e) => {
                              const date = e.target.value ? new Date(e.target.value) : undefined;
                              field.onChange(date);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="inspectionPassed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 mt-1"
                            checked={field.value || false}
                            disabled={updatePhaseMutation.isPending}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Inspection Passed</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter phase description"
                        disabled={updatePhaseMutation.isPending}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter additional notes"
                        disabled={updatePhaseMutation.isPending}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editForm.watch("inspectionRequired") && (
                <FormField
                  control={editForm.control}
                  name="inspectionNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspection Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter inspection notes"
                          disabled={updatePhaseMutation.isPending}
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
            <DialogTitle>Add New Project Phase</DialogTitle>
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
                          className="w-full"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={addPhaseMutation.isPending}
                          value={field.value ? field.value.toISOString().split('T')[0] : ""}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            field.onChange(date);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={addPhaseMutation.isPending}
                          value={field.value ? field.value.toISOString().split('T')[0] : ""}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            field.onChange(date);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Duration (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-full"
                          disabled={addPhaseMutation.isPending}
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="w-full"
                          disabled={addPhaseMutation.isPending}
                          {...field}
                          value={field.value === undefined ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="permitRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-1"
                          checked={field.value}
                          disabled={addPhaseMutation.isPending}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Permit Required</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="inspectionRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-1"
                          checked={field.value}
                          disabled={addPhaseMutation.isPending}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Inspection Required</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter phase description"
                        disabled={addPhaseMutation.isPending}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter additional notes"
                        disabled={addPhaseMutation.isPending}
                        {...field}
                        value={field.value || ""}
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
                  {addPhaseMutation.isPending ? "Creating..." : "Create Phase"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Project Phase Template</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Choose a template to add standardized phases to your project
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                disabled={applyTemplateMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {getTemplateOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTemplate && (
              <div className="bg-muted/20 rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">Template Preview</h4>
                <div className="text-sm text-muted-foreground mb-3">
                  {getTemplateByKey(selectedTemplate)?.description}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {getTemplateByKey(selectedTemplate)?.phases.map((phase, index) => (
                    <div key={index} className="border rounded p-2 bg-background">
                      <div className="font-medium">{phase.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{phase.description}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {phase.estimatedDuration && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {phase.estimatedDuration} days
                          </span>
                        )}
                        {phase.permitRequired && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Permit
                          </span>
                        )}
                        {phase.inspectionRequired && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Inspection
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTemplateDialog(false)}
              disabled={applyTemplateMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={applyTemplate} 
              disabled={!selectedTemplate || applyTemplateMutation.isPending}
            >
              {applyTemplateMutation.isPending ? "Adding Phases..." : "Apply Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}