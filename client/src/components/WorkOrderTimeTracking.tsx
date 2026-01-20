import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Clock, 
  Play, 
  Square, 
  Edit, 
  Trash2, 
  Plus,
  Timer 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import type { WorkOrderTimeEntry } from "@shared/schema";

interface TimeEntryWithUser extends WorkOrderTimeEntry {
  userName: string;
}

interface WorkOrderTimeTrackingProps {
  workOrderId: number;
}

const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const formatDateTime = (date: string | Date | null): string => {
  if (!date) return "-";
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const calculateElapsedTime = (clockIn: string | Date): string => {
  const startTime = new Date(clockIn).getTime();
  const now = Date.now();
  const elapsedMs = now - startTime;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export function WorkOrderTimeTracking({ workOrderId }: WorkOrderTimeTrackingProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clockInNotes, setClockInNotes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithUser | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<number | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    clockIn: "",
    clockOut: "",
    breakMinutes: "",
    notes: "",
  });
  
  const [manualForm, setManualForm] = useState({
    clockIn: "",
    clockOut: "",
    breakMinutes: "",
    notes: "",
  });

  const { data: timeEntries, isLoading } = useQuery<TimeEntryWithUser[]>({
    queryKey: ["/api/work-orders", workOrderId, "time-entries"],
  });

  const activeEntry = timeEntries?.find(
    entry => entry.userId === user?.id && !entry.clockOut
  );

  useEffect(() => {
    if (!activeEntry) {
      setElapsedTime("");
      return;
    }

    const updateTimer = () => {
      setElapsedTime(calculateElapsedTime(activeEntry.clockIn));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeEntry]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/work-orders/${workOrderId}/clock-in`, {
        notes: clockInNotes || null
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Clocked In", description: "Timer started." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "time-entries"] });
      setClockInNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/work-orders/${workOrderId}/clock-out`, {
        breakMinutes: breakMinutes ? parseInt(breakMinutes) : 0,
        notes: clockOutNotes || undefined
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Clocked Out", description: "Time entry recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "time-entries"] });
      setBreakMinutes("");
      setClockOutNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const response = await apiRequest("PATCH", `/api/work-orders/${workOrderId}/time-entries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Entry Updated", description: "Time entry has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "time-entries"] });
      closeEditDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiRequest("POST", `/api/work-orders/${workOrderId}/time-entries`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Entry Added", description: "Manual time entry created." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "time-entries"] });
      closeManualEntryDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await apiRequest("DELETE", `/api/work-orders/${workOrderId}/time-entries/${entryId}`);
    },
    onSuccess: () => {
      toast({ title: "Entry Deleted", description: "Time entry has been deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "time-entries"] });
      setDeleteEntryId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingEntry(null);
    setEditForm({ clockIn: "", clockOut: "", breakMinutes: "", notes: "" });
  };

  const closeManualEntryDialog = () => {
    setManualEntryOpen(false);
    setManualForm({ clockIn: "", clockOut: "", breakMinutes: "", notes: "" });
  };

  const handleEditEntry = (entry: TimeEntryWithUser) => {
    setEditingEntry(entry);
    const clockInDate = new Date(entry.clockIn);
    const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
    
    setEditForm({
      clockIn: clockInDate.toISOString().slice(0, 16),
      clockOut: clockOutDate ? clockOutDate.toISOString().slice(0, 16) : "",
      breakMinutes: entry.breakMinutes?.toString() || "",
      notes: entry.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const data: Record<string, unknown> = {
      notes: editForm.notes || null,
    };

    if (editForm.clockIn) {
      data.clockIn = new Date(editForm.clockIn).toISOString();
    }
    if (editForm.clockOut) {
      data.clockOut = new Date(editForm.clockOut).toISOString();
      data.breakMinutes = editForm.breakMinutes ? parseInt(editForm.breakMinutes) : 0;
    }

    updateMutation.mutate({ id: editingEntry.id, data });
  };

  const handleOpenManualEntry = () => {
    const now = new Date();
    setManualForm({
      clockIn: now.toISOString().slice(0, 16),
      clockOut: "",
      breakMinutes: "0",
      notes: "",
    });
    setManualEntryOpen(true);
  };

  const handleSaveManualEntry = () => {
    if (!manualForm.clockIn) {
      toast({ title: "Error", description: "Clock in time is required", variant: "destructive" });
      return;
    }

    const data: Record<string, unknown> = {
      clockIn: new Date(manualForm.clockIn).toISOString(),
      notes: manualForm.notes || null,
    };

    if (manualForm.clockOut) {
      data.clockOut = new Date(manualForm.clockOut).toISOString();
      data.breakMinutes = manualForm.breakMinutes ? parseInt(manualForm.breakMinutes) : 0;
      
      const clockIn = new Date(manualForm.clockIn).getTime();
      const clockOut = new Date(manualForm.clockOut).getTime();
      const breakMins = data.breakMinutes as number;
      data.duration = Math.round((clockOut - clockIn) / 60000) - breakMins;
    }

    createMutation.mutate(data);
  };

  const totalMinutes = timeEntries?.reduce((sum, entry) => {
    return sum + (entry.duration || 0);
  }, 0) || 0;

  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'manager';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          {isSupervisor && (
            <Button size="sm" variant="outline" onClick={handleOpenManualEntry}>
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {activeEntry ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    <Clock className="h-3 w-3 mr-1" />
                    Clocked In
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    since {formatDateTime(activeEntry.clockIn)}
                  </span>
                </div>
              </div>
              
              <div className="text-4xl font-mono font-bold text-center py-4 text-green-600 dark:text-green-400">
                {elapsedTime}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Break Minutes (optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() => clockOutMutation.mutate()}
                      disabled={clockOutMutation.isPending}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Textarea
                    placeholder="Add notes about this time entry..."
                    value={clockOutNotes}
                    onChange={(e) => setClockOutNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Not currently clocked in to this work order
              </p>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  placeholder="Add notes when clocking in..."
                  value={clockInNotes}
                  onChange={(e) => setClockInNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                {clockInMutation.isPending ? "Starting..." : "Clock In"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Time Entries</span>
            <Badge variant="outline" className="text-base font-mono">
              Total: {formatDuration(totalMinutes)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!timeEntries || timeEntries.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">No time entries yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technician</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-center">Break</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Notes</TableHead>
                  {isSupervisor && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.userName}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(entry.clockIn)}</TableCell>
                    <TableCell className="text-sm">
                      {entry.clockOut ? (
                        formatDateTime(entry.clockOut)
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{entry.breakMinutes || 0}m</TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.duration ? formatDuration(entry.duration) : "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {entry.notes || "-"}
                    </TableCell>
                    {isSupervisor && (
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive" 
                            onClick={() => setDeleteEntryId(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Update the time entry details for {editingEntry?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clock In</Label>
              <Input
                type="datetime-local"
                value={editForm.clockIn}
                onChange={(e) => setEditForm(prev => ({ ...prev, clockIn: e.target.value }))}
              />
            </div>
            <div>
              <Label>Clock Out</Label>
              <Input
                type="datetime-local"
                value={editForm.clockOut}
                onChange={(e) => setEditForm(prev => ({ ...prev, clockOut: e.target.value }))}
              />
            </div>
            <div>
              <Label>Break Minutes</Label>
              <Input
                type="number"
                min="0"
                value={editForm.breakMinutes}
                onChange={(e) => setEditForm(prev => ({ ...prev, breakMinutes: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Time Entry</DialogTitle>
            <DialogDescription>
              Create a time entry for yourself
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Clock In *</Label>
              <Input
                type="datetime-local"
                value={manualForm.clockIn}
                onChange={(e) => setManualForm(prev => ({ ...prev, clockIn: e.target.value }))}
              />
            </div>
            <div>
              <Label>Clock Out (optional)</Label>
              <Input
                type="datetime-local"
                value={manualForm.clockOut}
                onChange={(e) => setManualForm(prev => ({ ...prev, clockOut: e.target.value }))}
              />
            </div>
            {manualForm.clockOut && (
              <div>
                <Label>Break Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  value={manualForm.breakMinutes}
                  onChange={(e) => setManualForm(prev => ({ ...prev, breakMinutes: e.target.value }))}
                  placeholder="0"
                />
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={manualForm.notes}
                onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeManualEntryDialog}>Cancel</Button>
              <Button 
                onClick={handleSaveManualEntry}
                disabled={createMutation.isPending || !manualForm.clockIn}
              >
                {createMutation.isPending ? "Adding..." : "Add Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteEntryId !== null} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEntryId && deleteMutation.mutate(deleteEntryId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
