import { useState, useMemo, Fragment } from "react";
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
} from "lucide-react";

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

interface UnassignedJobDragItem {
  jobId: number;
  clientName: string;
}

interface DragItem {
  stopId: number;
  routeId: number;
  clientName: string;
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
              direction: "up",
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
              direction: "down",
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
    queryKey: [`/api/dispatch/daily-board?date=${dateStr}`],
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

  const [reassignFromTechId, setReassignFromTechId] = useState<number | null>(null);

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
    mutationFn: (data: { routeId: number; stopId: number; direction: "up" | "down" }) =>
      apiRequest("POST", `/api/dispatch/reorder-stop`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/driving-times"] });
    },
  });

  const addToRouteMutation = useMutation({
    mutationFn: (data: { maintenanceId: number; routeId: number }) =>
      apiRequest("POST", "/api/dispatch/assign-job", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/daily-board"] });
      toast({ title: "Job Assigned", description: "Job has been added to the route." });
    },
    onError: () => {
      toast({ title: "Assignment Failed", description: "Could not assign job to route.", variant: "destructive" });
    },
  });

  const moveStopMutation = useMutation({
    mutationFn: (data: { stopId: number; fromRouteId: number; toRouteId: number }) =>
      apiRequest("POST", "/api/dispatch/move-stop", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dispatch/daily-board?date=${dateStr}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch/driving-times"] });
      toast({ title: "Stop Moved", description: "Stop has been moved to the new route." });
    },
    onError: () => {
      toast({ title: "Move Failed", description: "Could not move stop to the new route.", variant: "destructive" });
    },
  });

  const assignToTechMutation = useMutation({
    mutationFn: (data: { maintenanceId: number; technicianId: number; date: string }) =>
      apiRequest("POST", "/api/dispatch/assign-job-to-tech", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dispatch/daily-board?date=${dateStr}`] });
      toast({ title: "Job Assigned", description: "Job has been assigned to the technician." });
    },
    onError: () => {
      toast({ title: "Assignment Failed", description: "Could not assign job to technician.", variant: "destructive" });
    },
  });

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
                  tech.routes.map((route) => (
                    <DroppableRouteArea
                      key={route.id}
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
                      {tech.routes.length > 1 && <Separator className="mt-4" />}
                    </div>
                    </DroppableRouteArea>
                  ))
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
            {unassignedJobs.length > 0 && (
              <Badge className="bg-red-500 text-white hover:bg-red-500">{unassignedJobs.length}</Badge>
            )}
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
