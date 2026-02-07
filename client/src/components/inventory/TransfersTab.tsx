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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeftRight,
  ArrowRight,
  MoreHorizontal,
  Truck,
  Warehouse,
  Search,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface Transfer {
  id: number;
  sourceType: string;
  sourceId: number;
  destinationType: string;
  destinationId: number;
  status: string;
  requestedByUserId: number;
  requestedAt: string;
  approvedByUserId: number | null;
  approvedAt: string | null;
  completedByUserId: number | null;
  completedAt: string | null;
  notes: string | null;
  itemCount?: number;
}

interface TransferItem {
  id: number;
  transferId: number;
  inventoryItemId: number;
  quantity: number;
  notes: string | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_transit", label: "In Transit" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const transferFormSchema = z.object({
  sourceType: z.string().min(1, "Source type is required"),
  sourceId: z.coerce.number().min(1, "Source ID is required"),
  destinationType: z.string().min(1, "Destination type is required"),
  destinationId: z.coerce.number().min(1, "Destination ID is required"),
  notes: z.string().optional().default(""),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case "in_transit":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Truck className="mr-1 h-3 w-3" />
          In Transit
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getLocationIcon(type: string) {
  if (type === "vehicle") return <Truck className="h-4 w-4 text-muted-foreground" />;
  return <Warehouse className="h-4 w-4 text-muted-foreground" />;
}

function formatLocation(type: string, id: number) {
  const label = type === "vehicle" ? "Vehicle" : "Warehouse";
  return `${label} #${id}`;
}

interface TransfersTabProps {
  showAddDialog?: boolean;
  onAddDialogClose?: () => void;
}

export default function TransfersTab({ showAddDialog, onAddDialogClose }: TransfersTabProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsTransfer, setDetailsTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    if (showAddDialog) {
      setCreateOpen(true);
      onAddDialogClose?.();
    }
  }, [showAddDialog]);

  const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
    queryKey: ["/api/inventory/transfers"],
  });

  const { data: transferItems = [], isLoading: isLoadingItems } = useQuery<TransferItem[]>({
    queryKey: ["/api/inventory/transfer-items", detailsTransfer?.id],
    enabled: !!detailsTransfer,
  });

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      sourceType: "warehouse",
      sourceId: 0,
      destinationType: "warehouse",
      destinationId: 0,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      return apiRequest("POST", "/api/inventory/transfers", values);
    },
    onSuccess: () => {
      toast({ title: "Transfer created", description: "The inventory transfer has been created." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
      setCreateOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to create transfer. ${error.message}`, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/inventory/transfers/${id}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status updated", description: "Transfer status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/summary"] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to update status. ${error.message}`, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        String(t.id).includes(search) ||
        formatLocation(t.sourceType, t.sourceId).toLowerCase().includes(searchLower) ||
        formatLocation(t.destinationType, t.destinationId).toLowerCase().includes(searchLower) ||
        (t.notes && t.notes.toLowerCase().includes(searchLower));
      return matchesStatus && matchesSearch;
    });
  }, [transfers, statusFilter, search]);

  function onSubmitCreate(values: TransferFormValues) {
    createMutation.mutate(values);
  }

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
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              New Transfer
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ArrowLeftRight className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No transfers found</p>
              <p className="text-sm">
                {transfers.length === 0
                  ? "Create your first inventory transfer to get started."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead></TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">#{transfer.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getLocationIcon(transfer.sourceType)}
                            <span>{formatLocation(transfer.sourceType, transfer.sourceId)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getLocationIcon(transfer.destinationType)}
                            <span>{formatLocation(transfer.destinationType, transfer.destinationId)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell>{formatDate(transfer.requestedAt)}</TableCell>
                        <TableCell>{transfer.itemCount ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailsTransfer(transfer)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {transfer.status === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => statusMutation.mutate({ id: transfer.id, status: "in_transit" })}
                                    disabled={statusMutation.isPending}
                                  >
                                    <Truck className="mr-2 h-4 w-4" />
                                    Mark In Transit
                                  </DropdownMenuItem>
                                </>
                              )}
                              {transfer.status === "in_transit" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => statusMutation.mutate({ id: transfer.id, status: "completed" })}
                                    disabled={statusMutation.isPending}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Complete
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(transfer.status === "pending" || transfer.status === "in_transit") && (
                                <DropdownMenuItem
                                  onClick={() => statusMutation.mutate({ id: transfer.id, status: "cancelled" })}
                                  disabled={statusMutation.isPending}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {filtered.map((transfer) => (
                  <Card key={transfer.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">Transfer #{transfer.id}</span>
                            {getStatusBadge(transfer.status)}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailsTransfer(transfer)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {transfer.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: transfer.id, status: "in_transit" })}
                                disabled={statusMutation.isPending}
                              >
                                <Truck className="mr-2 h-4 w-4" />
                                Mark In Transit
                              </DropdownMenuItem>
                            )}
                            {transfer.status === "in_transit" && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: transfer.id, status: "completed" })}
                                disabled={statusMutation.isPending}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Complete
                              </DropdownMenuItem>
                            )}
                            {(transfer.status === "pending" || transfer.status === "in_transit") && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: transfer.id, status: "cancelled" })}
                                disabled={statusMutation.isPending}
                                className="text-destructive focus:text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          {getLocationIcon(transfer.sourceType)}
                          <span className="text-muted-foreground">From:</span>
                          <span>{formatLocation(transfer.sourceType, transfer.sourceId)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getLocationIcon(transfer.destinationType)}
                          <span className="text-muted-foreground">To:</span>
                          <span>{formatLocation(transfer.destinationType, transfer.destinationId)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Date:</span>{" "}
                            {formatDate(transfer.requestedAt)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items:</span>{" "}
                            {transfer.itemCount ?? "-"}
                          </div>
                        </div>
                        {transfer.notes && (
                          <div className="text-muted-foreground text-xs line-clamp-2">
                            {transfer.notes}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); form.reset(); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Transfer</DialogTitle>
            <DialogDescription>
              Set up a new inventory transfer between locations.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="vehicle">Vehicle</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sourceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source ID</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter ID" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="destinationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="vehicle">Vehicle</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination ID</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter ID" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes about this transfer..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); form.reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Transfer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsTransfer !== null} onOpenChange={(open) => { if (!open) setDetailsTransfer(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer #{detailsTransfer?.id} Details</DialogTitle>
            <DialogDescription>
              View transfer information and items.
            </DialogDescription>
          </DialogHeader>
          {detailsTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  {getStatusBadge(detailsTransfer.status)}
                </div>
                <div>
                  <span className="text-muted-foreground block">Requested</span>
                  {formatDate(detailsTransfer.requestedAt)}
                </div>
                <div>
                  <span className="text-muted-foreground block">Source</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {getLocationIcon(detailsTransfer.sourceType)}
                    {formatLocation(detailsTransfer.sourceType, detailsTransfer.sourceId)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block">Destination</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {getLocationIcon(detailsTransfer.destinationType)}
                    {formatLocation(detailsTransfer.destinationType, detailsTransfer.destinationId)}
                  </div>
                </div>
                {detailsTransfer.approvedAt && (
                  <div>
                    <span className="text-muted-foreground block">Approved</span>
                    {formatDate(detailsTransfer.approvedAt)}
                  </div>
                )}
                {detailsTransfer.completedAt && (
                  <div>
                    <span className="text-muted-foreground block">Completed</span>
                    {formatDate(detailsTransfer.completedAt)}
                  </div>
                )}
              </div>
              {detailsTransfer.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground block mb-1">Notes</span>
                  <p className="bg-muted/50 p-2 rounded text-sm">{detailsTransfer.notes}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium mb-2">Transfer Items</h4>
                {isLoadingItems ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : transferItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items in this transfer.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item ID</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transferItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>#{item.inventoryItemId}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.notes || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsTransfer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
