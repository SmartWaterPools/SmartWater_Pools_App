import { useState, useCallback, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addDays, subDays } from "date-fns";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { MultiBackend } from "react-dnd-multi-backend";
import { HTML5toTouch } from "rdndmb-html5-to-touch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { startOfWeek } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  CalendarIcon,
  Users,
  MapPin,
  Clock,
  Truck,
  Route,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Navigation,
  UserPlus,
  Phone,
  BarChart3,
  Car,
  GripVertical,
  Zap,
  Undo2,
  CheckCircle2,
  Scale,
  Settings2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DispatchStop {
  id: number;
  routeId: number;
  clientId: number;
  orderIndex: number;
  estimatedDuration: number | null;
  customInstructions: string | null;
  clientName: string;
  clientAddress: string;
  addressLat: string | null;
  addressLng: string | null;
}

interface DispatchRoute {
  id: number;
  name: string;
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  stops: DispatchStop[];
}

interface DispatchTechnician {
  id: number;
  name: string;
  userId: number;
  routes: DispatchRoute[];
  totalStops: number;
  estimatedHours: number;
  status: "available" | "on_route" | "completed" | "off";
}

interface UnassignedJob {
  id: number;
  clientId: number;
  technicianId: number;
  scheduleDate: string;
  scheduledDate: string;
  type: string;
  category: string;
  title: string;
  status: string;
  notes: string | null;
  description: string | null;
  clientName: string;
  clientAddress: string;
}

interface DispatchData {
  date: string;
  dayOfWeek: string;
  technicians: DispatchTechnician[];
  unassignedJobs: UnassignedJob[];
}

function getStatusBadge(status: DispatchTechnician["status"]) {
  switch (status) {
    case "available":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Available</Badge>;
    case "on_route":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">On Route</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
    case "off":
      return <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100">Off</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

const DISPATCH_STOP_TYPE = "DISPATCH_STOP";
const UNASSIGNED_JOB_TYPE = "UNASSIGNED_JOB";
const ROUTE_CARD_TYPE = "ROUTE_CARD";

interface UnassignedJobDragItem {
  jobId: number;
  clientName: string;
}

interface DragItem {
  stopId: number;
  routeId: number;
  clientName: string;
}

interface RouteCardDragItem {
  routeId: number;
  technicianId: number;
  routeName: string;
  currentIndex: number;
}

function DraggableStop({
  stop,
  route,
  idx,
  totalStops,
  reorderMutation,
}: {
  stop: DispatchStop;
  route: DispatchRoute;
  idx: number;
  totalStops: number;
  reorderMutation: any;
}) {
  const [{ isDragging }, dragRef] = useDrag({
    type: DISPATCH_STOP_TYPE,
    item: { stopId: stop.id, routeId: route.id, clientName: stop.clientName } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef}
      className={`flex items-start gap-3 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors group cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={idx === 0}
          onClick={() =>
            reorderMutation.mutate({
              routeId: route.id,
              stopId: stop.id,
              newIndex: idx - 1,
            })
          }
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <span className="text-xs font-bold text-blue-600 w-5 text-center">
          {idx + 1}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={idx === totalStops - 1}
          onClick={() =>
            reorderMutation.mutate({
              routeId: route.id,
              stopId: stop.id,
              newIndex: idx + 1,
            })
          }
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{stop.clientName}</p>
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
          <span className="break-words">{stop.clientAddress}</span>
        </p>
        {stop.customInstructions && (
          <p className="text-xs text-amber-600 mt-1 truncate">
            ⚠ {stop.customInstructions}
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {stop.estimatedDuration && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {stop.estimatedDuration}m
          </Badge>
        )}
      </div>
    </div>
  );
}

function RouteStopsWithDrivingTimes({ route, reorderMutation }: { route: DispatchRoute; reorderMutation: any }) {
  const sortedStops = [...route.stops].sort((a, b) => a.orderIndex - b.orderIndex);

  const { data: drivingTimes } = useQuery<Array<{ fromStopId: number; toStopId: number; durationSeconds: number; durationText: string; distanceText: string }>>({
    queryKey: ["/api/dispatch/driving-times", route.id],
    queryFn: async () => {
      const res = await fetch(`/api/dispatch/driving-times/${route.id}`, { credentials: "include" });
      if (!res.ok) {
        console.error(`[DrivingTimes] Failed to fetch for route ${route.id}: ${res.status}`);
        return [];
      }
      const data = await res.json();
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: sortedStops.length >= 2,
  });

  const timeMap = new Map<number, { durationText: string; distanceText: string }>();
  if (drivingTimes) {
    for (const dt of drivingTimes) {
      timeMap.set(dt.fromStopId, { durationText: dt.durationText, distanceText: dt.distanceText });
    }
  }

  return (
    <>
      {sortedStops.map((stop, idx) => (
        <Fragment key={stop.id}>
          <DraggableStop
            stop={stop}
            route={route}
            idx={idx}
            totalStops={sortedStops.length}
            reorderMutation={reorderMutation}
          />
          {idx < sortedStops.length - 1 && (
            timeMap.has(stop.id) ? (
              <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground">
                <Car className="h-3 w-3 text-blue-500" />
                <span>{timeMap.get(stop.id)!.durationText}</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/60">{timeMap.get(stop.id)!.distanceText}</span>
              </div>
            ) : drivingTimes === undefined ? (
              <div className="flex items-center justify-center gap-1.5 py-0.5 text-xs text-muted-foreground/40">
                <Car className="h-3 w-3" />
                <span>...</span>
              </div>
            ) : null
          )}
        </Fragment>
      ))}
    </>
  );
}

function DroppableRouteArea({
  route,
  children,
  onDrop,
}: {
  route: DispatchRoute;
  children: React.ReactNode;
  onDrop: (item: DragItem) => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: DISPATCH_STOP_TYPE,
    canDrop: (item: DragItem) => item.routeId !== route.id,
    drop: (item: DragItem) => {
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={dropRef}
      className={`transition-all rounded-lg p-1 ${
        isOver && canDrop
          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : ""
      }`}
    >
      {children}
      {isOver && canDrop && (
        <div className="mt-2 p-3 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Drop stop here</span>
        </div>
      )}
    </div>
  );
}

function DraggableUnassignedJob({
  job,
  children,
}: {
  job: UnassignedJob;
  children: React.ReactNode;
}) {
  const [{ isDragging }, dragRef] = useDrag({
    type: UNASSIGNED_JOB_TYPE,
    item: { jobId: job.id, clientName: job.clientName } as UnassignedJobDragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div ref={dragRef} className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}>
      {children}
    </div>
  );
}

function DroppableTechnicianCard({
  techId,
  onDrop,
  children,
}: {
  techId: number;
  onDrop: (item: UnassignedJobDragItem) => void;
  children: React.ReactNode;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: UNASSIGNED_JOB_TYPE,
    drop: (item: UnassignedJobDragItem) => {
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={dropRef}
      className={`transition-all rounded-lg ${
        isOver && canDrop
          ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-950/30"
          : ""
      }`}
    >
      {children}
      {isOver && canDrop && (
        <div className="mx-4 mb-4 p-3 border-2 border-dashed border-green-400 rounded-lg bg-green-50/50 dark:bg-green-950/20 flex items-center justify-center gap-2">
          <UserPlus className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">Assign job to this technician</span>
        </div>
      )}
    </div>
  );
}

function DraggableRouteCard({
  route,
  technicianId,
  index,
  onReorder,
  onDropEnd,
  children,
}: {
  route: DispatchRoute;
  technicianId: number;
  index: number;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onDropEnd: () => void;
  children: React.ReactNode;
}) {
  const [{ isDragging }, dragRef, previewRef] = useDrag({
    type: ROUTE_CARD_TYPE,
    item: { routeId: route.id, technicianId, routeName: route.name, currentIndex: index } as RouteCardDragItem,
    end: () => {
      onDropEnd();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: ROUTE_CARD_TYPE,
    canDrop: (item: RouteCardDragItem) => item.technicianId === technicianId && item.routeId !== route.id,
    hover: (item: RouteCardDragItem) => {
      if (item.currentIndex !== index) {
        onReorder(item.currentIndex, index);
        item.currentIndex = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const ref = (node: HTMLDivElement | null) => {
    previewRef(dropRef(node));
  };

  return (
    <div
      ref={ref}
      className={`relative transition-all ${isDragging ? "opacity-30" : ""} ${isOver ? "border-t-2 border-blue-400" : ""}`}
    >
      <div ref={dragRef} className="absolute left-0 top-3 z-10 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/80">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="pl-6">
        {children}
      </div>
    </div>
  );
}

export default function DispatchBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignRouteId, setReassignRouteId] = useState<number | null>(null);
  const [reassignTechName, setReassignTechName] = useState("");
  const [workloadOpen, setWorkloadOpen] = useState(false);


  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const weekStartStr = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: dispatchData, isLoading, refetch } = useQuery<DispatchData>({
    queryKey: ["/api/dispatch/daily-board", { date: dateStr }],
    queryFn: async () => {
      const res = await fetch(`/api/dispatch/daily-board?date=${dateStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dispatch board");
      return res.json();
    },
  });

  const { data: clients } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/clients"],
  });

  interface WorkloadEntry {
    technicianId: number;
    name: string;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
    totalStops: number;
    estimatedHours: number;
    [key: string]: string | number;
  }

  const { data: workloadData } = useQuery<WorkloadEntry[]>({
    queryKey: ["/api/dispatch/technician-workload", weekStartStr],
    queryFn: () => fetch(`/api/dispatch/technician-workload?weekStart=${weekStartStr}`, { credentials: "include" }).then(r => r.json()),
    enabled: workloadOpen,
  });

  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState<boolean>(() =>
    localStorage.getItem("dispatch_auto_optimize") === "true"
  );
  const [smartAssignSnapshot, setSmartAssignSnapshot] = useState<{ stopIds: number[]; assignmentIds: number[] } | null>(null);
  const [reassignFromTechId, setReassignFromTechId] = useState<number | null>(null);

  const optimizeMutation = useMutation({
    mutationFn: (routeId: number) =>
      apiRequest("POST", `/api/dispatch/optimize-route/${routeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/driving-times"] });
      toast({ title: "Route Optimized", description: "Route has been optimized for efficiency." });
    },
    onError: () => {
      toast({ title: "Optimization Failed", description: "Could not optimize route.", variant: "destructive" });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: (data: { routeId: number; fromTechnicianId: number; toTechnicianId: number; date: string }) =>
      apiRequest("POST", "/api/dispatch/reassign-route", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      toast({ title: "Route Reassigned", description: "Route has been reassigned successfully." });
      setReassignDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Reassignment Failed", description: "Could not reassign route.", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (data: { routeId: number; stopId: number; newIndex: number }) =>
      apiRequest("POST", `/api/dispatch/reorder-stop`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/driving-times"] });
    },
  });

  const addToRouteMutation = useMutation({
    mutationFn: (data: { maintenanceId: number; routeId: number }) =>
      apiRequest("POST", "/api/dispatch/assign-job", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/rebalance-suggestions"] });
      toast({ title: "Job Assigned", description: "Job has been added to the route." });
      if (autoOptimizeEnabled && data?.stop?.routeId) {
        setTimeout(() => optimizeMutation.mutate(data.stop.routeId), 300);
      }
    },
    onError: () => {
      toast({ title: "Assignment Failed", description: "Could not assign job to route.", variant: "destructive" });
    },
  });

  const moveStopMutation = useMutation({
    mutationFn: (data: { stopId: number; fromRouteId: number; toRouteId: number }) =>
      apiRequest("POST", "/api/dispatch/move-stop", data),
    onSuccess: (_data: any, variables: { stopId: number; fromRouteId: number; toRouteId: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/driving-times"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/rebalance-suggestions"] });
      toast({ title: "Stop Moved", description: "Stop has been moved to the new route." });
      if (autoOptimizeEnabled) {
        setTimeout(() => {
          optimizeMutation.mutate(variables.toRouteId);
        }, 300);
      }
    },
    onError: () => {
      toast({ title: "Move Failed", description: "Could not move stop to the new route.", variant: "destructive" });
    },
  });

  const assignToTechMutation = useMutation({
    mutationFn: (data: { maintenanceId: number; technicianId: number; date: string }) =>
      apiRequest("POST", "/api/dispatch/assign-job-to-tech", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/rebalance-suggestions"] });
      toast({ title: "Job Assigned", description: "Job has been assigned to the technician." });
      if (autoOptimizeEnabled && data?.route?.id) {
        setTimeout(() => optimizeMutation.mutate(data.route.id), 300);
      }
    },
    onError: () => {
      toast({ title: "Assignment Failed", description: "Could not assign job to technician.", variant: "destructive" });
    },
  });

  const reorderRoutesMutation = useMutation({
    mutationFn: (data: { technicianId: number; routeIds: number[] }) =>
      apiRequest("POST", "/api/dispatch/reorder-routes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
    },
    onError: () => {
      toast({ title: "Reorder Failed", description: "Could not reorder routes.", variant: "destructive" });
    },
  });

  interface RebalanceSuggestion {
    stopId: number;
    fromTechId: number;
    fromTechName: string;
    toTechId: number;
    toTechName: string;
    fromRouteId: number;
    toRouteId: number;
  }
  interface RebalanceData {
    imbalanced: boolean;
    maxStops: number;
    minStops: number;
    avgStops: number;
    suggestions: RebalanceSuggestion[];
  }

  const { data: rebalanceData } = useQuery<RebalanceData>({
    queryKey: ["/api/dispatch/rebalance-suggestions", { date: dateStr }],
    queryFn: async () => {
      const res = await fetch(`/api/dispatch/rebalance-suggestions?date=${dateStr}`, { credentials: "include" });
      if (!res.ok) return { imbalanced: false, suggestions: [], maxStops: 0, minStops: 0, avgStops: 0 };
      return res.json();
    },
    enabled: !isLoading,
    staleTime: 30000,
  });

  const autoRebalanceMutation = useMutation({
    mutationFn: (suggestions: RebalanceSuggestion[]) =>
      apiRequest("POST", "/api/dispatch/auto-rebalance", { suggestions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/rebalance-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/driving-times"] });
      toast({ title: "Routes Rebalanced", description: "Stops have been redistributed across technicians." });
    },
    onError: () => {
      toast({ title: "Rebalance Failed", description: "Could not rebalance routes.", variant: "destructive" });
    },
  });

  const smartAssignMutation = useMutation({
    mutationFn: (data: { jobIds: number[]; date: string }) =>
      apiRequest("POST", "/api/dispatch/smart-assign", data),
    onSuccess: (data: any) => {
      setSmartAssignSnapshot({ stopIds: data.createdStops, assignmentIds: data.createdAssignments });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/rebalance-suggestions"] });
      toast({ title: "Jobs Assigned", description: `${data.createdStops?.length ?? 0} jobs have been distributed by location.` });
    },
    onError: () => {
      toast({ title: "Smart Assign Failed", description: "Could not distribute jobs.", variant: "destructive" });
    },
  });

  const undoSmartAssignMutation = useMutation({
    mutationFn: (data: { stopIds: number[]; assignmentIds: number[] }) =>
      apiRequest("POST", "/api/dispatch/undo-smart-assign", data),
    onSuccess: () => {
      setSmartAssignSnapshot(null);
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/rebalance-suggestions"] });
      toast({ title: "Assignments Undone", description: "All smart-assigned jobs have been returned to unassigned." });
    },
    onError: () => {
      toast({ title: "Undo Failed", description: "Could not undo smart assignments.", variant: "destructive" });
    },
  });

  const [localRouteOrder, setLocalRouteOrder] = useState<Record<number, number[]>>({});

  const handleRouteReorder = useCallback((techId: number, routes: DispatchRoute[], dragIndex: number, hoverIndex: number) => {
    const currentOrder = localRouteOrder[techId] || routes.map(r => r.id);
    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, moved);
    setLocalRouteOrder(prev => ({ ...prev, [techId]: newOrder }));
  }, [localRouteOrder]);

  const handleRouteDropEnd = useCallback((techId: number, routes: DispatchRoute[]) => {
    const order = localRouteOrder[techId];
    if (order) {
      const originalOrder = routes.map(r => r.id);
      const changed = order.some((id, i) => id !== originalOrder[i]);
      if (changed) {
        reorderRoutesMutation.mutate({ technicianId: techId, routeIds: order });
      }
      setLocalRouteOrder(prev => {
        const next = { ...prev };
        delete next[techId];
        return next;
      });
    }
  }, [localRouteOrder, reorderRoutesMutation]);

  const technicians = dispatchData?.technicians || [];
  const unassignedJobs = dispatchData?.unassignedJobs || [];
  const activeTechs = technicians.filter((t) => t.status !== "off").length;
  const totalStops = technicians.reduce((sum, t) => sum + t.totalStops, 0);
  const totalHours = technicians.reduce((sum, t) => sum + t.estimatedHours, 0);

  const allRoutes = technicians.flatMap((t) =>
    t.routes.map((r) => ({ ...r, techName: t.name, techId: t.id }))
  );

  const handleReassignOpen = (routeId: number, techName: string, techId: number) => {
    setReassignRouteId(routeId);
    setReassignTechName(techName);
    setReassignFromTechId(techId);
    setReassignDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Truck className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-foreground">Dispatch Board</h1>
          {dispatchData?.dayOfWeek && (
            <Badge variant="outline" className="text-sm font-normal">
              {dispatchData.dayOfWeek}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 min-w-[160px]">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh board</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/maintenance/routes')}
          >
            <Route className="h-4 w-4" />
            Manage Routes
          </Button>
          <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-background">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="auto-optimize" className="text-xs text-muted-foreground cursor-pointer select-none">
              Auto-optimize
            </Label>
            <Switch
              id="auto-optimize"
              checked={autoOptimizeEnabled}
              onCheckedChange={(val) => {
                setAutoOptimizeEnabled(val);
                localStorage.setItem("dispatch_auto_optimize", String(val));
                toast({
                  title: val ? "Auto-optimize On" : "Auto-optimize Off",
                  description: val
                    ? "Routes will optimize automatically when stops change."
                    : "Routes will only optimize when manually triggered.",
                });
              }}
              className="scale-90"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Technicians</p>
                <p className="text-2xl font-bold text-blue-700">{activeTechs}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stops</p>
                <p className="text-2xl font-bold text-blue-700">{totalStops}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Hours</p>
                <p className="text-2xl font-bold text-blue-700">{totalHours.toFixed(1)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-${unassignedJobs.length > 0 ? "red-300 bg-red-50/50" : "blue-200 bg-blue-50/50"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unassigned Jobs</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${unassignedJobs.length > 0 ? "text-red-600" : "text-blue-700"}`}>
                    {unassignedJobs.length}
                  </p>
                  {unassignedJobs.length > 0 && (
                    <Badge className="bg-red-500 text-white hover:bg-red-500 text-xs">
                      Needs Attention
                    </Badge>
                  )}
                </div>
              </div>
              <div className={`h-10 w-10 rounded-full ${unassignedJobs.length > 0 ? "bg-red-100" : "bg-blue-100"} flex items-center justify-center`}>
                <AlertTriangle className={`h-5 w-5 ${unassignedJobs.length > 0 ? "text-red-500" : "text-blue-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {rebalanceData?.imbalanced && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <Scale className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-amber-800 dark:text-amber-200 text-sm">
              <strong>Workload imbalance detected:</strong> Technicians have between {rebalanceData.minStops} and {rebalanceData.maxStops} stops today (avg {rebalanceData.avgStops}). Rebalancing will move {rebalanceData.suggestions.length} stop{rebalanceData.suggestions.length !== 1 ? "s" : ""} to even out the load.
            </span>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shrink-0"
              onClick={() => autoRebalanceMutation.mutate(rebalanceData.suggestions)}
              disabled={autoRebalanceMutation.isPending}
            >
              <Scale className="h-4 w-4" />
              {autoRebalanceMutation.isPending ? "Rebalancing..." : "Auto-Rebalance"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Technician Routes
            </h2>
            <Badge variant="outline">{technicians.length} technicians</Badge>
          </div>

          {technicians.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No technicians scheduled for {format(selectedDate, "MMMM dd, yyyy")}.
              </AlertDescription>
            </Alert>
          )}

          {technicians.map((tech) => (
            <DroppableTechnicianCard
              key={tech.id}
              techId={tech.id}
              onDrop={(item) => {
                assignToTechMutation.mutate({
                  maintenanceId: item.jobId,
                  technicianId: tech.id,
                  date: dateStr,
                });
              }}
            >
            <Card
              className={`overflow-hidden ${
                tech.status === "off"
                  ? "opacity-60 border-gray-200"
                  : tech.status === "completed"
                  ? "border-green-200"
                  : tech.status === "on_route"
                  ? "border-yellow-200"
                  : "border-blue-200"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                        tech.status === "off"
                          ? "bg-gray-400"
                          : tech.status === "completed"
                          ? "bg-green-500"
                          : tech.status === "on_route"
                          ? "bg-yellow-500"
                          : "bg-blue-600"
                      }`}
                    >
                      {tech.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{tech.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(tech.status)}
                        <span className="text-xs text-muted-foreground">
                          {tech.totalStops} stops · {tech.estimatedHours.toFixed(1)}h
                        </span>
                        {(() => {
                          const activeTechList = technicians.filter(t => t.status !== "off" && t.totalStops > 0);
                          if (activeTechList.length < 2 || tech.status === "off") return null;
                          const avg = activeTechList.reduce((s, t) => s + t.totalStops, 0) / activeTechList.length;
                          if (tech.totalStops > avg * 1.3 && tech.totalStops > avg + 1) {
                            return (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
                                Heavy
                              </span>
                            );
                          }
                          if (tech.totalStops < avg * 0.7 && avg > 2 && tech.totalStops < avg - 1) {
                            return (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                                Light
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                              Balanced
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Call {tech.name}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {tech.routes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No routes assigned</p>
                ) : (
                  (() => {
                    const order = localRouteOrder[tech.id];
                    const sortedRoutes = order
                      ? order.map(id => tech.routes.find(r => r.id === id)).filter(Boolean) as DispatchRoute[]
                      : tech.routes;
                    return sortedRoutes.map((route, routeIdx) => (
                      <DraggableRouteCard
                        key={route.id}
                        route={route}
                        technicianId={tech.id}
                        index={routeIdx}
                        onReorder={(dragIdx, hoverIdx) => handleRouteReorder(tech.id, tech.routes, dragIdx, hoverIdx)}
                        onDropEnd={() => handleRouteDropEnd(tech.id, tech.routes)}
                      >
                      <DroppableRouteArea
                        route={route}
                        onDrop={(item) => {
                          moveStopMutation.mutate({
                            stopId: item.stopId,
                            fromRouteId: item.routeId,
                            toRouteId: route.id,
                          });
                        }}
                      >
                      <div className="mb-4 last:mb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">{route.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {route.stops.length} stops
                            </Badge>
                            {route.startTime && (
                              <span className="text-xs text-muted-foreground">
                                {route.startTime}
                                {route.endTime ? ` - ${route.endTime}` : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => optimizeMutation.mutate(route.id)}
                              disabled={optimizeMutation.isPending}
                            >
                              <Navigation className="h-3 w-3" />
                              Optimize
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleReassignOpen(route.id, tech.name, tech.id)}
                            >
                              <UserPlus className="h-3 w-3" />
                              Reassign
                            </Button>
                          </div>
                        </div>

                        <ScrollArea className={route.stops.length > 5 ? "h-[280px]" : ""}>
                          <div className="space-y-0">
                            <RouteStopsWithDrivingTimes route={route} reorderMutation={reorderMutation} />
                          </div>
                        </ScrollArea>
                        {sortedRoutes.length > 1 && <Separator className="mt-4" />}
                      </div>
                      </DroppableRouteArea>
                      </DraggableRouteCard>
                    ));
                  })()
                )}
              </CardContent>
            </Card>
            </DroppableTechnicianCard>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${unassignedJobs.length > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              Unassigned Jobs
            </h2>
            <div className="flex items-center gap-2">
              {unassignedJobs.length > 0 && (
                <Badge className="bg-red-500 text-white hover:bg-red-500">{unassignedJobs.length}</Badge>
              )}
              {smartAssignSnapshot ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => undoSmartAssignMutation.mutate(smartAssignSnapshot)}
                  disabled={undoSmartAssignMutation.isPending}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {undoSmartAssignMutation.isPending ? "Undoing..." : "Undo Assign"}
                </Button>
              ) : unassignedJobs.length > 1 ? (
                <Button
                  size="sm"
                  className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => smartAssignMutation.mutate({ jobIds: unassignedJobs.map(j => j.id), date: dateStr })}
                  disabled={smartAssignMutation.isPending || technicians.filter(t => t.status !== "off").length === 0}
                >
                  <Zap className="h-3.5 w-3.5" />
                  {smartAssignMutation.isPending ? "Assigning..." : "Smart Assign"}
                </Button>
              ) : null}
            </div>
          </div>

          {unassignedJobs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Truck className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-700">All Jobs Assigned</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Every job for today has been routed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className={unassignedJobs.length > 4 ? "h-[600px]" : ""}>
              <div className="space-y-3">
                {unassignedJobs.map((job) => (
                  <DraggableUnassignedJob key={job.id} job={job}>
                    <Card className="border-amber-200 bg-amber-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{job.clientName}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {job.clientAddress}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-xs flex-shrink-0 capitalize ${
                            job.category === 'maintenance' ? 'border-blue-300 text-blue-700' :
                            job.category === 'repair' ? 'border-orange-300 text-orange-700' :
                            job.category === 'construction' ? 'border-green-300 text-green-700' :
                            ''
                          }`}>
                            {job.category || job.type}
                          </Badge>
                        </div>
                        {job.title && (
                          <p className="text-xs font-medium text-gray-600 mb-1 truncate">{job.title}</p>
                        )}
                        {(job.notes || job.description) && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{job.description || job.notes}</p>
                        )}
                        <Select
                          onValueChange={(techId) => {
                            assignToTechMutation.mutate({
                              maintenanceId: job.id,
                              technicianId: Number(techId),
                              date: dateStr,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Assign to technician..." />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>
                                {t.name} ({t.totalStops} stops · {t.estimatedHours.toFixed(1)}h)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </DraggableUnassignedJob>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
      </DndProvider>

      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Route</DialogTitle>
            <DialogDescription>
              Reassign {reassignTechName}'s route to another technician.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {technicians
              .filter((t) => t.status !== "off" && !t.routes.some((r) => r.id === reassignRouteId))
              .map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => {
                    if (reassignRouteId && reassignFromTechId) {
                      reassignMutation.mutate({ 
                        routeId: reassignRouteId, 
                        fromTechnicianId: reassignFromTechId,
                        toTechnicianId: t.id,
                        date: dateStr
                      });
                    }
                  }}
                  disabled={reassignMutation.isPending}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs ${
                      t.status === "completed" ? "bg-green-500" : t.status === "on_route" ? "bg-yellow-500" : "bg-blue-600"
                    }`}
                  >
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.totalStops} stops · {t.estimatedHours.toFixed(1)}h · {t.routes.length} routes
                    </p>
                  </div>
                  {getStatusBadge(t.status)}
                </Button>
              ))}
            {technicians.filter((t) => t.status !== "off" && !t.routes.some((r) => r.id === reassignRouteId)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No available technicians for reassignment.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Collapsible open={workloadOpen} onOpenChange={setWorkloadOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Weekly Workload Balance
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM dd")}
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${workloadOpen ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {!workloadData ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : workloadData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No technician data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Technician</th>
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                          <th key={day} className="text-center py-2 px-2 font-medium text-muted-foreground w-14">{day}</th>
                        ))}
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16">Total</th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground w-16">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workloadData.map(tech => {
                        const maxStops = Math.max(...workloadData.flatMap(t => 
                          ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(d => Number(t[d]) || 0)
                        ), 1);
                        return (
                          <tr key={tech.technicianId} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2.5 pr-4 font-medium">{tech.name}</td>
                            {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(day => {
                              const count = Number(tech[day]) || 0;
                              const intensity = count / maxStops;
                              const bg = count === 0 
                                ? "bg-gray-50 text-gray-400" 
                                : intensity > 0.75 
                                  ? "bg-red-100 text-red-700 font-semibold" 
                                  : intensity > 0.5 
                                    ? "bg-amber-100 text-amber-700" 
                                    : "bg-blue-50 text-blue-700";
                              return (
                                <td key={day} className="text-center py-2.5 px-1">
                                  <span className={`inline-flex items-center justify-center rounded-md w-10 h-7 text-xs ${bg}`}>
                                    {count}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="text-center py-2.5 px-2">
                              <span className="font-semibold text-foreground">{tech.totalStops}</span>
                            </td>
                            <td className="text-center py-2.5 px-2">
                              <span className="text-muted-foreground">{tech.estimatedHours}h</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2">
                        <td className="py-2.5 pr-4 font-semibold text-muted-foreground">Totals</td>
                        {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(day => (
                          <td key={day} className="text-center py-2.5 px-1">
                            <span className="font-semibold text-sm">
                              {workloadData.reduce((sum, t) => sum + (Number(t[day]) || 0), 0)}
                            </span>
                          </td>
                        ))}
                        <td className="text-center py-2.5 px-2 font-bold">
                          {workloadData.reduce((sum, t) => sum + t.totalStops, 0)}
                        </td>
                        <td className="text-center py-2.5 px-2 font-bold text-muted-foreground">
                          {workloadData.reduce((sum, t) => sum + t.estimatedHours, 0).toFixed(1)}h
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

    </div>
  );
}
