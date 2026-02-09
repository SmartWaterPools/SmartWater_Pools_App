import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  PlusCircle,
  Search,
  Calendar,
  Clock,
  User,
  Repeat,
  Pause,
  Play,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  ClipboardList,
  CalendarCheck,
  Filter,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleAddressAutocomplete } from "../components/maps/GoogleAddressAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  MaintenanceOrder,
  WorkOrder,
  ServiceTemplate,
  MAINTENANCE_ORDER_FREQUENCIES,
  MAINTENANCE_ORDER_STATUSES,
} from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

interface TechnicianWithUser {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface ClientInfo {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
  };
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  bi_weekly: "Bi-Weekly",
  monthly: "Monthly",
  bi_monthly: "Bi-Monthly",
  quarterly: "Quarterly",
  custom: "Custom",
};

const dayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function formatLabel(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

const maintenanceOrderFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  serviceTemplateId: z.number().optional().nullable(),
  clientId: z.number().min(1, "Client is required"),
  technicianId: z.number().optional().nullable(),
  frequency: z.string().min(1, "Frequency is required"),
  dayOfWeek: z.string().optional(),
  preferredTime: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  pricePerVisit: z.string().optional(),
  estimatedDuration: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type MaintenanceOrderFormValues = z.infer<typeof maintenanceOrderFormSchema>;

function MaintenanceOrderFormDialog({
  open,
  onOpenChange,
  editOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editOrder?: MaintenanceOrder | null;
}) {
  const { toast } = useToast();
  const [generateVisits, setGenerateVisits] = useState(true);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [addressMode, setAddressMode] = useState<"client" | "custom">("client");
  const isEditing = !!editOrder;

  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const { data: clients } = useQuery<ClientInfo[]>({
    queryKey: ["/api/clients"],
  });

  const { data: templates } = useQuery<ServiceTemplate[]>({
    queryKey: ["/api/service-templates"],
  });

  const moTemplates = templates?.filter((t) => t.orderType === "maintenance_order") ?? [];

  const form = useForm<MaintenanceOrderFormValues>({
    resolver: zodResolver(maintenanceOrderFormSchema),
    defaultValues: {
      title: editOrder?.title ?? "",
      description: editOrder?.description ?? "",
      serviceTemplateId: editOrder?.serviceTemplateId ?? null,
      clientId: editOrder?.clientId ?? 0,
      technicianId: editOrder?.technicianId ?? null,
      frequency: editOrder?.frequency ?? "weekly",
      dayOfWeek: editOrder?.dayOfWeek ?? "monday",
      preferredTime: editOrder?.preferredTime ?? "",
      startDate: editOrder?.startDate ?? "",
      endDate: editOrder?.endDate ?? "",
      pricePerVisit: editOrder?.pricePerVisit ? (editOrder.pricePerVisit / 100).toFixed(2) : "",
      estimatedDuration: editOrder?.estimatedDuration?.toString() ?? "",
      address: editOrder?.address ?? "",
      notes: editOrder?.notes ?? "",
    },
  });

  useEffect(() => {
    if (editOrder && clients) {
      const matchingClient = clients.find((c) => c.id === editOrder.clientId);
      if (matchingClient) {
        setClientSearch(matchingClient.user?.name ?? "");
      }
      if (editOrder.address) {
        setAddressMode("client");
      }
    }
  }, [editOrder, clients]);

  const watchedClientId = form.watch("clientId");
  const watchedFrequency = form.watch("frequency");
  const selectedClient = clients?.find((c) => c.id === watchedClientId);

  const filteredClients = useMemo(() => {
    if (!clients || !clientSearch.trim()) return clients ?? [];
    const search = clientSearch.toLowerCase();
    return clients.filter((c) =>
      c.user?.name?.toLowerCase().includes(search) ||
      c.user?.email?.toLowerCase().includes(search) ||
      c.user?.phone?.toLowerCase().includes(search) ||
      c.user?.address?.toLowerCase().includes(search)
    );
  }, [clients, clientSearch]);

  const handleClientSelect = (client: ClientInfo) => {
    form.setValue("clientId", client.id);
    setClientSearch(client.user?.name ?? "");
    setShowClientDropdown(false);
    if (client.user?.address) {
      form.setValue("address", client.user.address);
      setAddressMode("client");
    }
  };

  const selectedDays = (form.watch("dayOfWeek") ?? "").split(",").filter(Boolean);

  const toggleDay = (day: string) => {
    const isWeekly = watchedFrequency === "weekly";
    if (isWeekly) {
      const current = selectedDays.includes(day)
        ? selectedDays.filter((d) => d !== day)
        : [...selectedDays, day];
      form.setValue("dayOfWeek", current.join(","));
    } else {
      form.setValue("dayOfWeek", day);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: MaintenanceOrderFormValues) => {
      let title = data.title;
      if (!title) {
        const tmpl = moTemplates.find((t) => t.id === data.serviceTemplateId);
        if (tmpl) {
          title = tmpl.name;
        } else {
          const client = clients?.find((c) => c.id === data.clientId);
          title = client ? `Maintenance - ${client.user?.name}` : "Maintenance Service";
        }
      }

      const payload: Record<string, unknown> = {
        title,
        description: data.description || undefined,
        clientId: data.clientId,
        technicianId: data.technicianId || undefined,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek || undefined,
        preferredTime: data.preferredTime || undefined,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        pricePerVisit: data.pricePerVisit ? Math.round(parseFloat(data.pricePerVisit) * 100) : undefined,
        estimatedDuration: data.estimatedDuration ? parseInt(data.estimatedDuration) : undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
        serviceTemplateId: data.serviceTemplateId || undefined,
        status: "active",
      };

      if (isEditing) {
        const response = await apiRequest("PATCH", `/api/maintenance-orders/${editOrder.id}`, payload);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/maintenance-orders", payload);
        const result = await response.json();
        if (generateVisits && result.id) {
          try {
            await apiRequest("POST", `/api/maintenance-orders/${result.id}/generate-visits`);
          } catch {
            toast({ title: "Note", description: "Order created but visit generation had an issue. You can generate visits later." });
          }
        }
        return result;
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Maintenance Order Updated" : "Maintenance Order Created",
        description: isEditing ? "The maintenance order has been updated." : "The maintenance order has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      form.reset();
      setClientSearch("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to save maintenance order", variant: "destructive" });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || templateId === "none") {
      form.setValue("serviceTemplateId", null);
      form.setValue("title", "");
      return;
    }
    const template = moTemplates.find((t) => t.id === parseInt(templateId));
    if (template) {
      form.setValue("serviceTemplateId", template.id);
      form.setValue("title", template.name);
      if (template.description) form.setValue("description", template.description);
      if (template.estimatedDuration) form.setValue("estimatedDuration", template.estimatedDuration.toString());
      if (template.laborRate) form.setValue("pricePerVisit", (template.laborRate / 100).toFixed(2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Maintenance Order" : "New Maintenance Order"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the maintenance order details." : "Create a new recurring maintenance plan."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Service Template</Label>
              <Select onValueChange={handleTemplateSelect} defaultValue={editOrder?.serviceTemplateId?.toString() ?? undefined}>
                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {moTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the maintenance plan..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="clientId" render={() => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                        if (!e.target.value) form.setValue("clientId", 0);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                    />
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border rounded-md shadow-lg">
                        {filteredClients.map((c) => (
                          <div
                            key={c.id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                            onClick={() => handleClientSelect(c)}
                          >
                            <div className="font-medium">{c.user?.name ?? `Client #${c.id}`}</div>
                            {c.user?.email && <div className="text-xs text-muted-foreground">{c.user.email}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="technicianId" render={({ field }) => (
                <FormItem><FormLabel>Technician</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() ?? "none"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Assign technician" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {technicians?.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="frequency" render={({ field }) => (
                <FormItem><FormLabel>Frequency</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    if (watchedFrequency === "weekly" && value !== "weekly") {
                      const currentDayOfWeek = form.watch("dayOfWeek") ?? "";
                      const firstDay = currentDayOfWeek.split(",")[0];
                      if (firstDay) {
                        form.setValue("dayOfWeek", firstDay);
                      }
                    }
                  }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MAINTENANCE_ORDER_FREQUENCIES.filter(f => f !== "custom").map((f) => (
                        <SelectItem key={f} value={f}>{frequencyLabels[f] ?? formatLabel(f)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dayOfWeek" render={() => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(dayLabels).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => toggleDay(val)}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          selectedDays.includes(val)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted border-input"
                        }`}
                      >
                        {label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="preferredTime" render={({ field }) => (
              <FormItem><FormLabel>Preferred Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>End Date (optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="pricePerVisit" render={({ field }) => (
                <FormItem><FormLabel>Price Per Visit ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="estimatedDuration" render={({ field }) => (
                <FormItem><FormLabel>Est. Duration (min)</FormLabel><FormControl><Input type="number" placeholder="60" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                {selectedClient?.user?.address && (
                  <div className="flex gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => { setAddressMode("client"); field.onChange(selectedClient.user.address ?? ""); }}
                      className={`text-xs px-2 py-0.5 rounded border ${addressMode === "client" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      Client Address
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddressMode("custom"); field.onChange(""); }}
                      className={`text-xs px-2 py-0.5 rounded border ${addressMode === "custom" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      Custom
                    </button>
                  </div>
                )}
                <FormControl><GoogleAddressAutocomplete value={field.value || ""} onChange={(address) => field.onChange(address)} placeholder="Service address" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            {!isEditing && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-visits"
                  checked={generateVisits}
                  onCheckedChange={(checked) => setGenerateVisits(!!checked)}
                />
                <Label htmlFor="generate-visits" className="text-sm">Auto-generate visits after creation</Label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : isEditing ? "Update Order" : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function GenerateVisitsDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: MaintenanceOrder;
}) {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [resultCount, setResultCount] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (fromDate) body.fromDate = fromDate;
      if (toDate) body.toDate = toDate;
      const response = await apiRequest("POST", `/api/maintenance-orders/${order.id}/generate-visits`, body);
      return response.json();
    },
    onSuccess: (data) => {
      const count = Array.isArray(data) ? data.length : data?.count ?? data?.generated ?? 0;
      setResultCount(count);
      toast({ title: "Visits Generated", description: `${count} visit(s) have been generated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-orders", order.id, "work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-orders"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to generate visits", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setResultCount(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Visits</DialogTitle>
          <DialogDescription>Generate work order visits for "{order.title}"</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          {resultCount !== null && (
            <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm">
              Successfully generated {resultCount} visit(s).
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VisitsPanel({ orderId }: { orderId: number }) {
  const { data: visits, isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/maintenance-orders", orderId, "work-orders"],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance-orders/${orderId}/work-orders`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch visits");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!visits || visits.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground dark:text-gray-400">
        No visits generated yet.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Generated Visits ({visits.length})
      </h4>
      {visits.map((visit) => (
        <Link key={visit.id} href={`/work-orders/${visit.id}`}>
          <div className="flex items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {visit.scheduledDate ?? "Unscheduled"}
              </span>
              {visit.scheduledTime && (
                <span className="text-xs text-muted-foreground">{visit.scheduledTime}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[visit.status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}>
                {formatLabel(visit.status)}
              </Badge>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MaintenanceOrderCard({
  order,
  clientName,
  technicianName,
  onEdit,
  onGenerateVisits,
  onToggleStatus,
  onDelete,
}: {
  order: MaintenanceOrder;
  clientName: string;
  technicianName: string;
  onEdit: () => void;
  onGenerateVisits: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left group">
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {order.title}
                    </h3>
                    {order.description && (
                      <p className="text-sm text-muted-foreground dark:text-gray-400 mt-0.5 line-clamp-2">{order.description}</p>
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={statusColors[order.status] ?? "bg-gray-100 text-gray-800"}>
                  {formatLabel(order.status)}
                </Badge>
                <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                  {frequencyLabels[order.frequency] ?? formatLabel(order.frequency)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground dark:text-gray-400">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{clientName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground dark:text-gray-400">
                <Users className="h-3.5 w-3.5" />
                <span className="truncate">{technicianName}</span>
              </div>
              {order.dayOfWeek && (
                <div className="flex items-center gap-1.5 text-muted-foreground dark:text-gray-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{dayLabels[order.dayOfWeek] ?? order.dayOfWeek}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground dark:text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{order.startDate} → {order.endDate ?? "Ongoing"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground dark:text-gray-400">
                {order.pricePerVisit != null && (
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatCents(order.pricePerVisit)}/visit</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onToggleStatus} title={order.status === "paused" ? "Resume" : "Pause"}>
                  {order.status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={onGenerateVisits} title="Generate Visits">
                  <Repeat className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} title="Delete" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CollapsibleContent>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <VisitsPanel orderId={order.id} />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function MaintenanceOrders() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<MaintenanceOrder | null>(null);
  const [generateOrder, setGenerateOrder] = useState<MaintenanceOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showWorkOrders, setShowWorkOrders] = useState(false);

  const { data: orders, isLoading: ordersLoading } = useQuery<MaintenanceOrder[]>({
    queryKey: ["/api/maintenance-orders"],
  });

  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const { data: clients } = useQuery<ClientInfo[]>({
    queryKey: ["/api/clients"],
  });

  const { data: workOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
  });

  const clientMap = useMemo(() => {
    const map: Record<number, string> = {};
    clients?.forEach((c) => {
      map[c.id] = c.user?.name ?? `Client #${c.id}`;
    });
    return map;
  }, [clients]);

  const techMap = useMemo(() => {
    const map: Record<number, string> = {};
    technicians?.forEach((t) => {
      map[t.id] = t.user.name;
    });
    return map;
  }, [technicians]);

  const activePlans = useMemo(() => orders?.filter((o) => o.status === "active").length ?? 0, [orders]);
  const pausedPlans = useMemo(() => orders?.filter((o) => o.status === "paused").length ?? 0, [orders]);
  const totalClients = useMemo(() => {
    const ids = new Set(orders?.map((o) => o.clientId));
    return ids.size;
  }, [orders]);

  const upcomingVisitsThisWeek = useMemo(() => {
    if (!workOrders) return 0;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return workOrders.filter((wo) => {
      if (!wo.maintenanceOrderId || !wo.scheduledDate) return false;
      const d = new Date(wo.scheduledDate);
      return d >= startOfWeek && d < endOfWeek;
    }).length;
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    let result = orders ?? [];
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (techFilter !== "all") {
      result = result.filter((o) => o.technicianId === parseInt(techFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) => {
        const client = clientMap[o.clientId] ?? "";
        return o.title.toLowerCase().includes(q) || client.toLowerCase().includes(q);
      });
    }
    return result;
  }, [orders, statusFilter, techFilter, searchQuery, clientMap]);

  const oneTimeWorkOrders = useMemo(() => {
    if (!showWorkOrders || !workOrders) return [];
    return workOrders.filter((wo) => !wo.maintenanceOrderId);
  }, [showWorkOrders, workOrders]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: number; currentStatus: string }) => {
      const newStatus = currentStatus === "paused" ? "active" : "paused";
      const response = await apiRequest("PATCH", `/api/maintenance-orders/${id}`, { status: newStatus });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-orders"] });
      toast({ title: "Status Updated", description: "Maintenance order status has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/maintenance-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({ title: "Deleted", description: "Maintenance order and all its scheduled visits have been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (order: MaintenanceOrder) => {
    if (window.confirm(`Are you sure you want to delete "${order.title}"? This will also delete all scheduled visits (work orders) generated from this maintenance order. This action cannot be undone.`)) {
      deleteMutation.mutate(order.id);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maintenance Orders</h1>
          <p className="text-muted-foreground dark:text-gray-400">Manage recurring maintenance schedules</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Maintenance Order
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Active Plans</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ordersLoading ? "—" : activePlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Pause className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Paused Plans</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ordersLoading ? "—" : pausedPlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ordersLoading ? "—" : totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CalendarCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Visits This Week</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ordersLoading ? "—" : upcomingVisitsThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] dark:bg-gray-900 dark:border-gray-700">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {MAINTENANCE_ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-[160px] dark:bg-gray-900 dark:border-gray-700">
            <User className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {technicians?.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWorkOrders(!showWorkOrders)}
          className={`gap-2 dark:border-gray-700 ${showWorkOrders ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700" : ""}`}
        >
          {showWorkOrders ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          Show Work Orders
        </Button>
      </div>

      {ordersLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredOrders.length === 0 && !showWorkOrders ? (
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground dark:text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No maintenance orders found</h3>
            <p className="text-muted-foreground dark:text-gray-400 mb-4">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your filters." : "Create your first recurring maintenance plan."}
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Maintenance Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <MaintenanceOrderCard
              key={order.id}
              order={order}
              clientName={clientMap[order.clientId] ?? `Client #${order.clientId}`}
              technicianName={order.technicianId ? (techMap[order.technicianId] ?? "Unknown") : "Unassigned"}
              onEdit={() => setEditOrder(order)}
              onGenerateVisits={() => setGenerateOrder(order)}
              onToggleStatus={() => toggleStatusMutation.mutate({ id: order.id, currentStatus: order.status })}
              onDelete={() => handleDelete(order)}
            />
          ))}

          {showWorkOrders && oneTimeWorkOrders.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">One-Time Work Orders</h2>
                <p className="text-sm text-muted-foreground dark:text-gray-400">Work orders not linked to a maintenance plan</p>
              </div>
              {oneTimeWorkOrders.map((wo) => (
                <Link key={wo.id} href={`/work-orders/${wo.id}`}>
                  <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{wo.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground dark:text-gray-400">
                            {wo.scheduledDate && (
                              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{wo.scheduledDate}</span>
                            )}
                            {wo.clientId && (
                              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{clientMap[wo.clientId] ?? `Client #${wo.clientId}`}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[wo.status] ?? "bg-gray-100 text-gray-800"}>
                            {formatLabel(wo.status)}
                          </Badge>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          )}
        </div>
      )}

      <MaintenanceOrderFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editOrder && (
        <MaintenanceOrderFormDialog
          open={!!editOrder}
          onOpenChange={(open) => { if (!open) setEditOrder(null); }}
          editOrder={editOrder}
        />
      )}

      {generateOrder && (
        <GenerateVisitsDialog
          open={!!generateOrder}
          onOpenChange={(open) => { if (!open) setGenerateOrder(null); }}
          order={generateOrder}
        />
      )}
    </div>
  );
}
