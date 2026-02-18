import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Play, Flag, Clock, AlertCircle, ClipboardCheck } from "lucide-react";
import { WorkOrderPhotos } from "./WorkOrderPhotos";

interface TechnicianWorkflowProps {
  workOrderId: number;
  workOrder: any;
  onComplete?: () => void;
}

interface ChecklistItemWithNotes {
  id: string;
  text: string;
  completed: boolean;
  required?: boolean;
  notes?: string;
}

function parseChecklist(checklist: string | ChecklistItemWithNotes[] | null | undefined): ChecklistItemWithNotes[] {
  if (!checklist) return [];
  if (Array.isArray(checklist)) return checklist;
  try {
    return JSON.parse(checklist);
  } catch {
    return [];
  }
}

export function TechnicianWorkflow({ workOrderId, workOrder, onComplete }: TechnicianWorkflowProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [items, setItems] = useState<ChecklistItemWithNotes[]>([]);

  useEffect(() => {
    setItems(parseChecklist(workOrder?.checklist));
  }, [workOrder?.checklist]);

  useEffect(() => {
    if (workOrder?.status === 'completed') {
      onComplete?.();
    }
  }, [workOrder?.status, onComplete]);

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allRequiredDone = items.filter((i) => i.required !== false).every((i) => i.completed);
  const allDone = completedCount === totalCount && totalCount > 0;
  const currentItem = items[currentStep];

  const status = workOrder?.status as string;
  const isPreStart = status === "pending" || status === "scheduled";
  const isActive = status === "in_progress";
  const isCompleted = status === "completed";

  const startedAt = workOrder?.startedAt ? new Date(workOrder.startedAt) : null;
  const durationMinutes = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 60000) : 0;

  const startService = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/work-orders/${workOrderId}`, {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({ title: "Service started", description: "Work order is now in progress." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateChecklist = useMutation({
    mutationFn: async (updatedItems: ChecklistItemWithNotes[]) => {
      return apiRequest("PATCH", `/api/work-orders/${workOrderId}`, {
        checklist: updatedItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeService = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/work-orders/${workOrderId}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({ title: "Service completed!", description: "Great job! The work order has been marked as complete." });
      onComplete?.();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleToggleItem = (index: number) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );
    setItems(updated);
    updateChecklist.mutate(updated);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, notes } : item
    );
    setItems(updated);
  };

  const handleNotesSave = () => {
    updateChecklist.mutate(items);
  };

  const saveCurrentNotes = () => {
    const currentItem = items[currentStep];
    if (currentItem && currentItem.notes !== undefined) {
      updateChecklist.mutate(items);
    }
  };

  if (isPreStart) {
    return (
      <Card className="border-2 border-dashed dark:border-gray-700">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <ClipboardCheck className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl">{workOrder?.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {workOrder?.clientId && (
            <p className="text-muted-foreground">
              Client: <span className="font-medium text-foreground">{workOrder?.client?.user?.name || workOrder?.client?.name || `Client #${workOrder.clientId}`}</span>
            </p>
          )}

          {workOrder?.estimatedDuration && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated: {workOrder.estimatedDuration} min</span>
            </div>
          )}

          {totalCount > 0 && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <ClipboardCheck className="h-4 w-4" />
              <span>{totalCount} checklist items</span>
            </div>
          )}

          <Button
            size="lg"
            className="mt-4 px-8 py-6 text-lg"
            onClick={() => startService.mutate()}
            disabled={startService.isPending}
          >
            <Play className="h-5 w-5 mr-2" />
            {startService.isPending ? "Starting..." : "Start Service"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isCompleted || (isActive && allDone)) {
    return (
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardContent className="text-center py-10 space-y-4">
          <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">
            {isCompleted ? "Service Complete" : "All Steps Complete!"}
          </h3>
          <p className="text-muted-foreground">
            {completedCount}/{totalCount} items completed
          </p>
          {durationMinutes > 0 && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duration: {durationMinutes} minutes</span>
            </div>
          )}
          {isActive && !isCompleted && (
            <Button
              size="lg"
              className="mt-4 px-8 py-6 text-lg bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
              onClick={() => completeService.mutate()}
              disabled={completeService.isPending}
            >
              <Flag className="h-5 w-5 mr-2" />
              {completeService.isPending ? "Completing..." : "Complete Service"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!isActive || totalCount === 0) {
    return null;
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-sm">
            Step {currentStep + 1} of {totalCount}
          </Badge>
          <span className="text-sm text-muted-foreground font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`flex items-start gap-4 p-5 rounded-xl border-2 transition-colors cursor-pointer ${
            currentItem?.completed
              ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
              : "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
          }`}
          onClick={() => handleToggleItem(currentStep)}
        >
          <div className="mt-1 shrink-0">
            {currentItem?.completed ? (
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            ) : (
              <Circle className="h-8 w-8 text-blue-400 dark:text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-medium ${
              currentItem?.completed
                ? "text-green-800 dark:text-green-300 line-through"
                : "text-foreground"
            }`}>
              {currentItem?.text}
            </p>
            {currentItem?.required !== false && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Required</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <Textarea
            placeholder="Notes (optional)..."
            value={currentItem?.notes || ""}
            onChange={(e) => handleNotesChange(currentStep, e.target.value)}
            onBlur={handleNotesSave}
            className="min-h-[80px] text-base"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="lg"
            className="px-5 py-5"
            onClick={() => {
              saveCurrentNotes();
              setCurrentStep((s) => Math.max(0, s - 1));
            }}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Prev
          </Button>

          <Button
            size="lg"
            className={`px-6 py-5 flex-1 max-w-[220px] text-base ${
              currentItem?.completed
                ? "bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500"
                : "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            }`}
            onClick={() => handleToggleItem(currentStep)}
            disabled={updateChecklist.isPending}
          >
            {currentItem?.completed ? (
              <>Mark Incomplete</>
            ) : (
              <>
                Mark Complete
                <CheckCircle2 className="h-5 w-5 ml-1" />
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="px-5 py-5"
            onClick={() => {
              saveCurrentNotes();
              setCurrentStep((s) => Math.min(totalCount - 1, s + 1));
            }}
            disabled={currentStep === totalCount - 1}
          >
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setCurrentStep(index)}
              className={`h-3 w-3 rounded-full transition-all ${
                index === currentStep
                  ? "bg-blue-600 dark:bg-blue-400 scale-125 ring-2 ring-blue-300 dark:ring-blue-600"
                  : item.completed
                    ? "bg-green-500 dark:bg-green-400"
                    : "bg-gray-300 dark:bg-gray-600"
              }`}
              aria-label={`Go to step ${index + 1}: ${item.text}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>

    <div className="mt-4">
      <WorkOrderPhotos workOrderId={workOrderId} photos={workOrder.photos} compact />
    </div>
    </>
  );
}
