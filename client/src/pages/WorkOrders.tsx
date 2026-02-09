import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  PlusCircle,
  Search,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  MapPin,
  User,
  ArrowUpDown,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  WorkOrder,
  ServiceTemplate,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_PRIORITIES,
  MaintenanceOrder,
  MAINTENANCE_ORDER_FREQUENCIES,
  MAINTENANCE_ORDER_STATUSES,
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

interface ClientInfo {
  id: number;
  name: string;
  email: string;
  address?: string;
}

interface WorkOrderWithDetails extends WorkOrder {
  technician?: TechnicianWithUser | null;
  client?: {
    id: number;
    user: {
      id: number;
      name: string;
    };
  } | null;
}

type ScheduleItem = {
  id: number;
  title: string;
  type: "work_order" | "maintenance_order";
  category?: string | null;
  status: string;
  priority?: string | null;
  technicianName?: string;
  clientName?: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  address?: string | null;
  estimatedDuration?: number | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300",
};

function formatLabel(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const workOrderFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(WORK_ORDER_CATEGORIES),
  priority: z.enum(WORK_ORDER_PRIORITIES).default("medium"),
  serviceTemplateId: z.number().optional().nullable(),
  technicianId: z.number().optional().nullable(),
  clientId: z.number().optional().nullable(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;

const maintenanceOrderFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
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
  address: z.string().optional(),
  notes: z.string().optional(),
});

type MaintenanceOrderFormValues = z.infer<typeof maintenanceOrderFormSchema>;

function CreateWorkOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const { data: clients } = useQuery<ClientInfo[]>({
    queryKey: ["/api/clients"],
  });

  const { data: templates } = useQuery<ServiceTemplate[]>({
    queryKey: ["/api/service-templates"],
  });

  const woTemplates = templates?.filter((t) => !t.orderType || t.orderType === "work_order") ?? [];

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "maintenance",
      priority: "medium",
      serviceTemplateId: null,
      technicianId: null,
      clientId: null,
      scheduledDate: "",
      scheduledTime: "",
      address: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkOrderFormValues) => {
      const payload: Record<string, unknown> = { ...data, status: "pending" };
      if (!payload.scheduledDate) delete payload.scheduledDate;
      if (!payload.scheduledTime) delete payload.scheduledTime;
      if (!payload.address) delete payload.address;
      if (!payload.notes) delete payload.notes;
      if (!payload.serviceTemplateId) delete payload.serviceTemplateId;
      if (!payload.technicianId) delete payload.technicianId;
      if (!payload.clientId) delete payload.clientId;
      const response = await apiRequest("POST", "/api/work-orders", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Work Order Created", description: "The work order has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create work order", variant: "destructive" });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || templateId === "none") {
      form.setValue("serviceTemplateId", null);
      return;
    }
    const template = woTemplates.find((t) => t.id === parseInt(templateId));
    if (template) {
      form.setValue("serviceTemplateId", template.id);
      form.setValue("title", template.name);
      if (template.description) form.setValue("description", template.description);
      if (template.type && WORK_ORDER_CATEGORIES.includes(template.type as (typeof WORK_ORDER_CATEGORIES)[number])) {
        form.setValue("category", template.type as (typeof WORK_ORDER_CATEGORIES)[number]);
      }
      if (template.defaultPriority && WORK_ORDER_PRIORITIES.includes(template.defaultPriority as (typeof WORK_ORDER_PRIORITIES)[number])) {
        form.setValue("priority", template.defaultPriority as (typeof WORK_ORDER_PRIORITIES)[number]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Work Order</DialogTitle>
          <DialogDescription>Create a new work order for your team.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            {woTemplates.length > 0 && (
              <div className="space-y-1">
                <Label className="text-sm">Service Template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {woTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Work order title" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the work..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {WORK_ORDER_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{formatLabel(c)}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem><FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {WORK_ORDER_PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{formatLabel(p)}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="technicianId" render={({ field }) => (
              <FormItem><FormLabel>Technician</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() ?? "none"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Assign technician" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {technicians?.map((t) => (<SelectItem key={t.id} value={t.id.toString()}>{t.user.name}</SelectItem>))}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="clientId" render={({ field }) => (
              <FormItem><FormLabel>Client</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() ?? "none"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients?.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                <FormItem><FormLabel>Scheduled Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                <FormItem><FormLabel>Scheduled Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="Service address" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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

function CreateMaintenanceOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [generateVisits, setGenerateVisits] = useState(true);

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
      title: "",
      description: "",
      serviceTemplateId: null,
      clientId: 0,
      technicianId: null,
      frequency: "weekly",
      dayOfWeek: "monday",
      preferredTime: "",
      startDate: "",
      endDate: "",
      pricePerVisit: "",
      address: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaintenanceOrderFormValues) => {
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description || undefined,
        clientId: data.clientId,
        technicianId: data.technicianId || undefined,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek || undefined,
        preferredTime: data.preferredTime || undefined,
        startDate: data.startDate,
        endDate: data.endDate || undefined,
        pricePerVisit: data.pricePerVisit ? Math.round(parseFloat(data.pricePerVisit) * 100) : undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
        serviceTemplateId: data.serviceTemplateId || undefined,
        status: "active",
      };
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
    },
    onSuccess: () => {
      toast({ title: "Maintenance Order Created", description: "The maintenance order has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create maintenance order", variant: "destructive" });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || templateId === "none") {
      form.setValue("serviceTemplateId", null);
      return;
    }
    const template = moTemplates.find((t) => t.id === parseInt(templateId));
    if (template) {
      form.setValue("serviceTemplateId", template.id);
      form.setValue("title", template.name);
      if (template.description) form.setValue("description", template.description);
    }
  };

  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Maintenance Order</DialogTitle>
          <DialogDescription>Create a recurring maintenance schedule.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            {moTemplates.length > 0 && (
              <div className="space-y-1">
                <Label className="text-sm">Service Template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {moTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Maintenance order title" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the maintenance..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="clientId" render={({ field }) => (
              <FormItem><FormLabel>Client *</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {clients?.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="technicianId" render={({ field }) => (
              <FormItem><FormLabel>Technician</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))} value={field.value?.toString() ?? "none"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Assign technician" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {technicians?.map((t) => (<SelectItem key={t.id} value={t.id.toString()}>{t.user.name}</SelectItem>))}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="frequency" render={({ field }) => (
                <FormItem><FormLabel>Frequency *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MAINTENANCE_ORDER_FREQUENCIES.filter(f => f !== "custom").map((f) => (
                        <SelectItem key={f} value={f}>{formatLabel(f)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dayOfWeek" render={({ field }) => (
                <FormItem><FormLabel>Day of Week</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {daysOfWeek.map((d) => (<SelectItem key={d} value={d}>{formatLabel(d)}</SelectItem>))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="preferredTime" render={({ field }) => (
              <FormItem><FormLabel>Preferred Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="pricePerVisit" render={({ field }) => (
              <FormItem><FormLabel>Price per Visit ($)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="Service address" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="generateVisits"
                checked={generateVisits}
                onChange={(e) => setGenerateVisits(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="generateVisits" className="text-sm cursor-pointer">Generate scheduled visits after creation</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Maintenance Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CalendarView({ items }: { items: ScheduleItem[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const itemsByDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    items.forEach((item) => {
      if (item.scheduledDate) {
        const dateKey = item.scheduledDate.split("T")[0];
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(item);
      }
    });
    return map;
  }, [items]);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDateKey = selectedDay;
  const selectedItems = selectedDateKey ? itemsByDate[selectedDateKey] ?? [] : [];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="text-lg font-semibold">{monthName}</h3>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="bg-background p-2 min-h-[60px]" />;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = itemsByDate[dateKey]?.length ?? 0;
            const isSelected = selectedDay === dateKey;
            const isToday = new Date().toISOString().split("T")[0] === dateKey;
            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                className={`bg-background p-2 min-h-[60px] cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "ring-2 ring-primary" : ""} ${isToday ? "bg-primary/5" : ""}`}
              >
                <span className={`text-sm ${isToday ? "font-bold text-primary" : ""}`}>{day}</span>
                {count > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {count <= 3 ? (
                      Array.from({ length: count }).map((_, j) => (
                        <div key={j} className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ))
                    ) : (
                      <span className="text-xs text-primary font-medium">{count}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {selectedDay && (
        <div className="lg:w-80 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">{new Date(selectedDay + "T12:00:00").toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}</h4>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}><X className="h-4 w-4" /></Button>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <Link key={`${item.type}-${item.id}`} href={`/work-orders/${item.id}`}>
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.type === "work_order" ? "WO" : "MO"}
                        </Badge>
                        <span className="text-sm font-medium truncate">{item.title}</span>
                      </div>
                      {item.technicianName && <p className="text-xs text-muted-foreground">{item.technicianName}</p>}
                      {item.scheduledTime && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{item.scheduledTime}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BoardView({ items }: { items: ScheduleItem[] }) {
  const columns = ["pending", "scheduled", "in_progress", "completed"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((status) => {
        const columnItems = items.filter((item) => item.status === status);
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{formatLabel(status)}</h3>
              <Badge variant="secondary" className="text-xs">{columnItems.length}</Badge>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 min-h-[200px] space-y-2">
              {columnItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No items</p>
              ) : (
                columnItems.map((item) => (
                  <Link key={`${item.type}-${item.id}`} href={`/work-orders/${item.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {item.type === "work_order" ? "WO" : "MO"}
                          </Badge>
                          <span className="text-sm font-medium truncate">{item.title}</span>
                        </div>
                        {item.technicianName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                            <User className="h-3 w-3" />{item.technicianName}
                          </p>
                        )}
                        {item.clientName && (
                          <p className="text-xs text-muted-foreground truncate">{item.clientName}</p>
                        )}
                        {item.scheduledDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <CalendarIcon className="h-3 w-3" />{new Date(item.scheduledDate).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SchedulingHub() {
  const [showCreateWO, setShowCreateWO] = useState(false);
  const [showCreateMO, setShowCreateMO] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "work_orders" | "maintenance">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0]);
  const [routeTechId, setRouteTechId] = useState<string>('');
  const [routeItems, setRouteItems] = useState<ScheduleItem[]>([]);

  const { data: workOrders, isLoading: woLoading } = useQuery<WorkOrderWithDetails[]>({
    queryKey: ["/api/work-orders"],
  });

  const { data: maintenanceOrders, isLoading: moLoading } = useQuery<MaintenanceOrder[]>({
    queryKey: ["/api/maintenance-orders"],
  });

  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const isLoading = woLoading || moLoading;

  const allItems = useMemo<ScheduleItem[]>(() => {
    const items: ScheduleItem[] = [];

    if (workOrders) {
      workOrders.forEach((wo) => {
        items.push({
          id: wo.id,
          title: wo.title,
          type: "work_order",
          category: wo.category,
          status: wo.status,
          priority: wo.priority,
          technicianName: wo.technician?.user?.name,
          clientName: wo.client?.user?.name,
          scheduledDate: wo.scheduledDate,
          scheduledTime: wo.scheduledTime,
          address: wo.address,
          estimatedDuration: wo.estimatedDuration,
        });
      });
    }

    if (maintenanceOrders) {
      maintenanceOrders.forEach((mo) => {
        const tech = technicians?.find((t) => t.id === mo.technicianId);
        items.push({
          id: mo.id,
          title: mo.title,
          type: "maintenance_order",
          category: "maintenance",
          status: mo.status,
          priority: null,
          technicianName: tech?.user?.name,
          clientName: undefined,
          scheduledDate: mo.startDate,
          scheduledTime: mo.preferredTime,
          address: mo.address,
          estimatedDuration: mo.estimatedDuration,
        });
      });
    }

    return items;
  }, [workOrders, maintenanceOrders, technicians]);

  useEffect(() => {
    if (!routeTechId || !allItems) {
      setRouteItems([]);
      return;
    }
    const selectedTech = technicians?.find((t) => t.id === parseInt(routeTechId));
    const techName = selectedTech?.user?.name;
    const filtered = allItems.filter(item => {
      const matchesTech = techName ? item.technicianName === techName : false;
      const itemDate = item.scheduledDate ? item.scheduledDate.split("T")[0] : null;
      const matchesDate = itemDate === routeDate;
      return matchesTech && matchesDate;
    });
    setRouteItems(filtered);
  }, [routeTechId, routeDate, allItems, technicians]);

  const filteredItems = useMemo(() => {
    let items = allItems;

    if (typeFilter === "work_orders") items = items.filter((i) => i.type === "work_order");
    if (typeFilter === "maintenance") items = items.filter((i) => i.type === "maintenance_order");

    if (categoryFilter !== "all") items = items.filter((i) => i.category === categoryFilter);

    if (statusFilter !== "all") items = items.filter((i) => i.status === statusFilter);

    if (techFilter !== "all") items = items.filter((i) => i.technicianName === techFilter);

    if (dateRange !== "all" && dateRange !== "custom") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      items = items.filter((i) => {
        if (!i.scheduledDate) return false;
        const d = new Date(i.scheduledDate);
        if (dateRange === "today") return d.toDateString() === today.toDateString();
        if (dateRange === "week") {
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return d >= today && d < weekEnd;
        }
        if (dateRange === "month") {
          return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.technicianName?.toLowerCase().includes(q) ||
          i.clientName?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [allItems, typeFilter, categoryFilter, statusFilter, techFilter, dateRange, searchQuery]);

  const uniqueTechNames = useMemo(() => {
    const names = new Set<string>();
    allItems.forEach((i) => { if (i.technicianName) names.add(i.technicianName); });
    return Array.from(names).sort();
  }, [allItems]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-24 rounded-lg" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Scheduling Hub</h1>
          <p className="text-muted-foreground mt-1">Manage all work orders and maintenance visits</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateWO(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />New Work Order
          </Button>
          <Button variant="outline" onClick={() => setShowCreateMO(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />New Maintenance Order
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border overflow-hidden">
              {([["all", "All"], ["work_orders", "Work Orders"], ["maintenance", "Maintenance Visits"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTypeFilter(val)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${typeFilter === val ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {WORK_ORDER_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{formatLabel(c)}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {WORK_ORDER_STATUSES.map((s) => (<SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Technician" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {uniqueTechNames.map((name) => (<SelectItem key={name} value={name}>{name}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Date Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5"><List className="h-4 w-4" />List</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarIcon className="h-4 w-4" />Calendar</TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5"><Columns className="h-4 w-4" />Board</TabsTrigger>
          <TabsTrigger value="routes" className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            Routes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No scheduled items found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your filters or create a new order.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden md:block">
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 text-sm font-medium">Title</th>
                        <th className="text-left p-3 text-sm font-medium">Type</th>
                        <th className="text-left p-3 text-sm font-medium">Category</th>
                        <th className="text-left p-3 text-sm font-medium">Status</th>
                        <th className="text-left p-3 text-sm font-medium">Priority</th>
                        <th className="text-left p-3 text-sm font-medium">Technician</th>
                        <th className="text-left p-3 text-sm font-medium">Client</th>
                        <th className="text-left p-3 text-sm font-medium">Scheduled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={`${item.type}-${item.id}`} className="border-t hover:bg-accent/30 transition-colors">
                          <td className="p-3">
                            <Link href={`/work-orders/${item.id}`} className="text-sm font-medium text-primary hover:underline">
                              {item.title}
                            </Link>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {item.type === "work_order" ? "WO" : "MO"}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{item.category ? formatLabel(item.category) : "-"}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] ?? "bg-gray-100 text-gray-800"}`}>
                              {formatLabel(item.status)}
                            </span>
                          </td>
                          <td className="p-3">
                            {item.priority ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[item.priority] ?? ""}`}>
                                {formatLabel(item.priority)}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">-</span>}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{item.technicianName ?? "-"}</td>
                          <td className="p-3 text-sm text-muted-foreground">{item.clientName ?? "-"}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:hidden space-y-3">
                {filteredItems.map((item) => (
                  <Link key={`${item.type}-${item.id}`} href={`/work-orders/${item.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.type === "work_order" ? "WO" : "MO"}
                            </Badge>
                            <span className="font-medium text-sm">{item.title}</span>
                          </div>
                          {item.priority && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityColors[item.priority] ?? ""}`}>
                              {formatLabel(item.priority)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[item.status] ?? ""}`}>
                            {formatLabel(item.status)}
                          </span>
                          {item.category && <span>{formatLabel(item.category)}</span>}
                          {item.technicianName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.technicianName}</span>}
                          {item.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />{new Date(item.scheduledDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="text-sm text-muted-foreground mt-2">
            Showing {filteredItems.length} of {allItems.length} items
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView items={filteredItems} />
        </TabsContent>

        <TabsContent value="board">
          <BoardView items={filteredItems} />
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Date:</Label>
              <Input
                type="date"
                value={routeDate}
                onChange={(e) => setRouteDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Technician:</Label>
              <Select value={routeTechId} onValueChange={setRouteTechId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians?.map((tech: any) => (
                    <SelectItem key={tech.id} value={String(tech.id)}>
                      {tech.user?.name || `Tech ${tech.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setRouteItems(prev => [...prev].sort((a, b) => (a.address || '').localeCompare(b.address || '')));
              }}
              disabled={routeItems.length === 0}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Optimize Route
            </Button>
          </div>

          {routeItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-6 text-sm">
                  <span><strong>{routeItems.length}</strong> stops</span>
                  <span><strong>{routeItems.reduce((sum, item) => sum + (item.estimatedDuration || 30), 0)}</strong> min estimated</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {routeItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Select a technician and date to see their scheduled stops
                </CardContent>
              </Card>
            ) : (
              routeItems.map((item, index) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() => {
                            setRouteItems(prev => {
                              const arr = [...prev];
                              [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                              return arr;
                            });
                          }}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={index === routeItems.length - 1}
                          onClick={() => {
                            setRouteItems(prev => {
                              const arr = [...prev];
                              [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
                              return arr;
                            });
                          }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{item.title}</h4>
                          <Badge variant={item.type === "maintenance_order" ? "secondary" : "default"} className="text-xs">
                            {item.type === "maintenance_order" ? "MO" : "WO"}
                          </Badge>
                          {item.priority && (
                            <Badge variant={item.priority === "urgent" || item.priority === "high" ? "destructive" : "outline"} className="text-xs">
                              {item.priority}
                            </Badge>
                          )}
                        </div>
                        {item.address && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.address}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.estimatedDuration || 30} min
                          </span>
                          {item.scheduledTime && <span>{item.scheduledTime}</span>}
                          {item.clientName && <span>Client: {item.clientName}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Link href={`/work-orders/${item.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CreateWorkOrderDialog open={showCreateWO} onOpenChange={setShowCreateWO} />
      <CreateMaintenanceOrderDialog open={showCreateMO} onOpenChange={setShowCreateMO} />
    </div>
  );
}
