import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Truck,
  Edit,
  MoreHorizontal,
  Trash2,
  Plus,
  Search,
  Loader2,
  User,
} from "lucide-react";

interface VehicleData {
  id: number;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  licensePlate: string | null;
  vin: string | null;
  technicianId: number;
  organizationId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface TechnicianData {
  id: number;
  userId: number;
  specialty?: string | null;
  name?: string | null;
  user?: { firstName?: string; lastName?: string; name?: string } | null;
}

const vehicleFormSchema = z.object({
  name: z.string().min(1, "Vehicle name is required"),
  make: z.string().optional().default(""),
  model: z.string().optional().default(""),
  year: z.string().optional().default(""),
  licensePlate: z.string().optional().default(""),
  vin: z.string().optional().default(""),
  technicianId: z.string().min(1, "Technician is required"),
  isActive: z.boolean().default(true),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

function getTechnicianName(tech: TechnicianData): string {
  if (tech.name) return tech.name;
  if (tech.user) {
    if (tech.user.name) return tech.user.name;
    const parts = [tech.user.firstName, tech.user.lastName].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  return `Technician #${tech.id}`;
}

interface VehiclesTabProps {
  showAddDialog?: boolean;
  onAddDialogClose?: () => void;
}

export default function VehiclesTab({ showAddDialog, onAddDialogClose }: VehiclesTabProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleData | null>(null);

  useEffect(() => {
    if (showAddDialog) {
      setEditingVehicle(null);
      setDialogOpen(true);
      onAddDialogClose?.();
    }
  }, [showAddDialog]);

  const { data: vehicles = [], isLoading } = useQuery<VehicleData[]>({
    queryKey: ["/api/inventory/technician-vehicles"],
  });

  const { data: technicians = [] } = useQuery<TechnicianData[]>({
    queryKey: ["/api/technicians"],
  });

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: "",
      make: "",
      model: "",
      year: "",
      licensePlate: "",
      vin: "",
      technicianId: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      return apiRequest("POST", "/api/inventory/technician-vehicles", {
        name: data.name,
        make: data.make || null,
        model: data.model || null,
        year: data.year ? parseInt(data.year, 10) : null,
        licensePlate: data.licensePlate || null,
        vin: data.vin || null,
        technicianId: parseInt(data.technicianId, 10),
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      toast({ title: "Vehicle created", description: "New vehicle has been added." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/technician-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      closeDialog();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create vehicle. ${error.message}`, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VehicleFormValues }) => {
      return apiRequest("PATCH", `/api/inventory/technician-vehicles/${id}`, {
        name: data.name,
        make: data.make || null,
        model: data.model || null,
        year: data.year ? parseInt(data.year, 10) : null,
        licensePlate: data.licensePlate || null,
        vin: data.vin || null,
        technicianId: parseInt(data.technicianId, 10),
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      toast({ title: "Vehicle updated", description: "Vehicle has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/technician-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      closeDialog();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update vehicle. ${error.message}`, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/inventory/technician-vehicles/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Vehicle deleted", description: "Vehicle has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/technician-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      setDeleteId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete vehicle. ${error.message}`, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    const searchLower = search.toLowerCase();
    return vehicles.filter((v) =>
      v.name.toLowerCase().includes(searchLower) ||
      (v.make && v.make.toLowerCase().includes(searchLower)) ||
      (v.model && v.model.toLowerCase().includes(searchLower)) ||
      (v.licensePlate && v.licensePlate.toLowerCase().includes(searchLower))
    );
  }, [vehicles, search]);

  const technicianMap = useMemo(() => {
    const map = new Map<number, string>();
    technicians.forEach((t) => map.set(t.id, getTechnicianName(t)));
    return map;
  }, [technicians]);

  function openAddDialog() {
    setEditingVehicle(null);
    form.reset({
      name: "",
      make: "",
      model: "",
      year: "",
      licensePlate: "",
      vin: "",
      technicianId: "",
      isActive: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(vehicle: VehicleData) {
    setEditingVehicle(vehicle);
    form.reset({
      name: vehicle.name,
      make: vehicle.make || "",
      model: vehicle.model || "",
      year: vehicle.year ? String(vehicle.year) : "",
      licensePlate: vehicle.licensePlate || "",
      vin: vehicle.vin || "",
      technicianId: String(vehicle.technicianId),
      isActive: vehicle.isActive,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingVehicle(null);
    form.reset();
  }

  function onSubmit(values: VehicleFormValues) {
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  function formatMakeModelYear(v: VehicleData) {
    const parts = [v.make, v.model].filter(Boolean);
    let result = parts.join(" ");
    if (v.year) result = result ? `${v.year} ${result}` : String(v.year);
    return result || "-";
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, make, model, or plate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No vehicles found</p>
              <p className="text-sm">Try adjusting your search or add a new vehicle.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Name</TableHead>
                      <TableHead>Make/Model/Year</TableHead>
                      <TableHead>License Plate</TableHead>
                      <TableHead>VIN</TableHead>
                      <TableHead>Assigned Technician</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <div className="font-medium">{vehicle.name}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatMakeModelYear(vehicle)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {vehicle.licensePlate || "-"}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-xs">
                          {vehicle.vin || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {technicianMap.get(vehicle.technicianId) || `Technician #${vehicle.technicianId}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                            {vehicle.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(vehicle)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(vehicle.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {filtered.map((vehicle) => (
                  <Card key={vehicle.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{vehicle.name}</h4>
                            <Badge variant={vehicle.isActive ? "default" : "secondary"} className="text-xs">
                              {vehicle.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatMakeModelYear(vehicle)}
                          </div>
                          {vehicle.licensePlate && (
                            <div className="text-sm text-muted-foreground">
                              Plate: {vehicle.licensePlate}
                            </div>
                          )}
                          {vehicle.vin && (
                            <div className="text-sm text-muted-foreground font-mono text-xs">
                              VIN: {vehicle.vin}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {technicianMap.get(vehicle.technicianId) || `Technician #${vehicle.technicianId}`}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(vehicle)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(vehicle.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? "Update the vehicle details below."
                : "Fill in the details to add a new technician vehicle."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Service Van #1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ford" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Transit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 2024" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Plate</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ABC-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="Vehicle Identification Number" {...field} />
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
                    <FormLabel>Assigned Technician *</FormLabel>
                    {technicians.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No technicians available. Please add technicians first.</p>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a technician" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians.map((tech) => (
                            <SelectItem key={tech.id} value={String(tech.id)}>
                              {getTechnicianName(tech)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark this vehicle as active or inactive.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isMutating}>
                  {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingVehicle ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
