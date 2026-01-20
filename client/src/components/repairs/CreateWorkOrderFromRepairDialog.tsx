import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RepairWithDetails } from "@/lib/types";
import {
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  ServiceTemplate,
} from "@shared/schema";

interface TechnicianWithUser {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

const workOrderFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(WORK_ORDER_CATEGORIES),
  status: z.enum(["pending", "scheduled", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: z.enum(WORK_ORDER_PRIORITIES).default("medium"),
  scheduledDate: z.string().optional(),
  technicianId: z.number().optional().nullable(),
  clientId: z.number().optional().nullable(),
  repairId: z.number().optional().nullable(),
  estimatedDuration: z.number().optional().nullable(),
  serviceTemplateId: z.number().optional().nullable(),
});

type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

const parseTemplateChecklistItems = (items: string | null | undefined): ChecklistItem[] => {
  if (!items) return [];
  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown, index: number) => {
      if (typeof item === 'string') {
        return { id: `item-${index}`, text: item, completed: false };
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          id: typeof obj.id === 'string' ? obj.id : `item-${index}`,
          text: typeof obj.text === 'string' ? obj.text : '',
          completed: false,
        };
      }
      return { id: `item-${index}`, text: '', completed: false };
    });
  } catch {
    return [];
  }
};

interface CreateWorkOrderFromRepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair: RepairWithDetails | null;
  onSuccess?: () => void;
}

export function CreateWorkOrderFromRepairDialog({
  open,
  onOpenChange,
  repair,
  onSuccess,
}: CreateWorkOrderFromRepairDialogProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const { data: templates } = useQuery<ServiceTemplate[]>({
    queryKey: ["/api/service-templates"],
  });

  const clientName = repair?.client?.user?.name || "Unknown Client";

  const mapRepairPriority = (priority: string): typeof WORK_ORDER_PRIORITIES[number] => {
    const normalizedPriority = priority.toLowerCase();
    if (WORK_ORDER_PRIORITIES.includes(normalizedPriority as typeof WORK_ORDER_PRIORITIES[number])) {
      return normalizedPriority as typeof WORK_ORDER_PRIORITIES[number];
    }
    return "medium";
  };

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: `Repair - ${repair?.issue || ""}`,
      description: repair?.description || "",
      category: "repair",
      status: "pending",
      priority: mapRepairPriority(repair?.priority || "medium"),
      scheduledDate: repair?.scheduledDate?.split("T")[0] || "",
      technicianId: repair?.technicianId || null,
      clientId: repair?.clientId || null,
      repairId: repair?.id || null,
      estimatedDuration: null,
      serviceTemplateId: null,
    },
  });

  useEffect(() => {
    if (repair && open) {
      form.reset({
        title: `Repair - ${repair.issue}`,
        description: repair.description || "",
        category: "repair",
        status: "pending",
        priority: mapRepairPriority(repair.priority),
        scheduledDate: repair.scheduledDate?.split("T")[0] || "",
        technicianId: repair.technicianId || null,
        clientId: repair.clientId || null,
        repairId: repair.id,
        estimatedDuration: null,
        serviceTemplateId: null,
      });

      if (templates && templates.length > 0) {
        const repairTemplate = templates.find(t => 
          t.type === "repair" || 
          t.category?.toLowerCase().includes("repair")
        );
        if (repairTemplate) {
          setSelectedTemplateId(repairTemplate.id.toString());
          handleTemplateSelect(repairTemplate.id.toString());
        }
      }

      setChecklistItems([]);
    }
  }, [repair, open, templates]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId || templateId === "none") {
      return;
    }
    const template = templates?.find((t) => t.id === parseInt(templateId));
    if (template) {
      if (template.description) {
        form.setValue("description", template.description);
      }
      if (template.defaultPriority && WORK_ORDER_PRIORITIES.includes(template.defaultPriority as typeof WORK_ORDER_PRIORITIES[number])) {
        form.setValue("priority", template.defaultPriority as typeof WORK_ORDER_PRIORITIES[number]);
      }
      if (template.estimatedDuration) {
        form.setValue("estimatedDuration", template.estimatedDuration);
      }
      form.setValue("serviceTemplateId", template.id);
      const checklistFromTemplate = parseTemplateChecklistItems(template.checklistItems);
      if (checklistFromTemplate.length > 0) {
        setChecklistItems(checklistFromTemplate);
      }
    }
  };

  const addChecklistItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: `item-${Date.now()}`,
        text: newItemText.trim(),
        completed: false,
      };
      setChecklistItems([...checklistItems, newItem]);
      setNewItemText("");
    }
  };

  const removeChecklistItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id));
  };

  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderFormValues) => {
      const payload = {
        ...data,
        checklist: checklistItems.length > 0 ? checklistItems : null,
      };
      const response = await apiRequest("POST", "/api/work-orders", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Order Created",
        description: "The work order has been created and linked to the repair.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/repairs"] });
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create work order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkOrderFormValues) => {
    createMutation.mutate(data);
  };

  if (!repair) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Create Work Order from Repair
          </DialogTitle>
          <DialogDescription>
            Create a work order linked to this repair for {clientName}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {templates && templates.length > 0 && (
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <Label className="text-sm font-medium">Use Work Order Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template to auto-fill fields..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                        {template.category && ` (${template.category.replace(/_/g, " ")})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Work order title" {...field} />
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
                    <Textarea placeholder="Describe the work to be done..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORK_ORDER_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORK_ORDER_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
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
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>Assign Technician</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : parseInt(value))
                    }
                    value={field.value?.toString() || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select technician (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {technicians?.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label className="text-sm font-medium">Checklist Items</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a checklist item..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={addChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {checklistItems.length > 0 && (
                <div className="border rounded-md divide-y">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{item.text}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeChecklistItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {checklistItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No checklist items added. Add items above for technicians to complete on-site.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Work Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWorkOrderFromRepairDialog;
