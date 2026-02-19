import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, GripVertical, Pencil, Save, X } from "lucide-react";

interface CustomQuestion {
  id: number;
  organizationId: number;
  label: string;
  fieldType: string;
  options: string[] | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Select" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes/No" },
] as const;

const getFieldTypeLabel = (value: string) => {
  const found = FIELD_TYPES.find((t) => t.value === value);
  return found ? found.label : value;
};

export function PoolWizardEditor() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newOptions, setNewOptions] = useState("");
  const [newIsRequired, setNewIsRequired] = useState(false);

  const [editLabel, setEditLabel] = useState("");
  const [editFieldType, setEditFieldType] = useState("text");
  const [editOptions, setEditOptions] = useState("");
  const [editIsRequired, setEditIsRequired] = useState(false);
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);

  const { data: questions = [], isLoading } = useQuery<CustomQuestion[]>({
    queryKey: ["/api/pool-wizard-questions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      label: string;
      fieldType: string;
      options: string[] | null;
      isRequired: boolean;
      displayOrder: number;
    }) => {
      return await apiRequest("POST", "/api/pool-wizard-questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-wizard-questions"] });
      toast({ title: "Question created", description: "Custom question has been added successfully" });
      resetAddForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create question", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CustomQuestion> }) => {
      return await apiRequest("PATCH", `/api/pool-wizard-questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-wizard-questions"] });
      toast({ title: "Question updated", description: "Custom question has been updated successfully" });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update question", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/pool-wizard-questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pool-wizard-questions"] });
      toast({ title: "Question deleted", description: "Custom question has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete question", variant: "destructive" });
    },
  });

  const resetAddForm = () => {
    setNewLabel("");
    setNewFieldType("text");
    setNewOptions("");
    setNewIsRequired(false);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    if (!newLabel.trim()) {
      toast({ title: "Validation error", description: "Label is required", variant: "destructive" });
      return;
    }
    const options = newFieldType === "select" && newOptions.trim()
      ? newOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : null;
    const maxOrder = questions.length > 0
      ? Math.max(...questions.map((q) => q.displayOrder))
      : 0;
    createMutation.mutate({
      label: newLabel.trim(),
      fieldType: newFieldType,
      options,
      isRequired: newIsRequired,
      displayOrder: maxOrder + 1,
    });
  };

  const startEdit = (question: CustomQuestion) => {
    setEditingId(question.id);
    setEditLabel(question.label);
    setEditFieldType(question.fieldType);
    setEditOptions(question.options ? question.options.join(", ") : "");
    setEditIsRequired(question.isRequired);
    setEditDisplayOrder(question.displayOrder);
  };

  const handleSaveEdit = () => {
    if (!editLabel.trim() || editingId === null) return;
    const options = editFieldType === "select" && editOptions.trim()
      ? editOptions.split(",").map((o) => o.trim()).filter(Boolean)
      : null;
    updateMutation.mutate({
      id: editingId,
      data: {
        label: editLabel.trim(),
        fieldType: editFieldType,
        options,
        isRequired: editIsRequired,
        displayOrder: editDisplayOrder,
      },
    });
  };

  const handleToggleActive = (question: CustomQuestion) => {
    updateMutation.mutate({
      id: question.id,
      data: { isActive: !question.isActive },
    });
  };

  const sortedQuestions = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Pool Wizard Custom Questions</CardTitle>
            <CardDescription className="mt-1">
              Manage custom questions that appear in your organization's pool information wizard.
              These questions help collect additional details when setting up new pools.
            </CardDescription>
          </div>
          <Button
            size="default"
            className="w-full sm:w-auto"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
            <h4 className="font-medium">New Custom Question</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-label">Label</Label>
                <Input
                  id="new-label"
                  placeholder="e.g. Pool surface material"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-field-type">Field Type</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newFieldType === "select" && (
              <div className="space-y-2">
                <Label htmlFor="new-options">Options (comma-separated)</Label>
                <Input
                  id="new-options"
                  placeholder="e.g. Plaster, Pebble, Tile, Fiberglass"
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch
                id="new-required"
                checked={newIsRequired}
                onCheckedChange={setNewIsRequired}
              />
              <Label htmlFor="new-required">Required</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={createMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Adding..." : "Add Question"}
              </Button>
              <Button variant="outline" onClick={resetAddForm}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
        ) : sortedQuestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No custom questions yet.</p>
            <p className="text-sm mt-1">Click "Add Question" to create your first custom pool wizard question.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedQuestions.map((question) => (
              <div
                key={question.id}
                className={`flex items-center gap-3 p-3 border rounded-lg ${
                  !question.isActive ? "opacity-50 bg-muted/20" : ""
                }`}
              >
                {editingId === question.id ? (
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label>Label</Label>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Field Type</Label>
                        <Select value={editFieldType} onValueChange={setEditFieldType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Display Order</Label>
                        <Input
                          type="number"
                          value={editDisplayOrder}
                          onChange={(e) => setEditDisplayOrder(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    {editFieldType === "select" && (
                      <div className="space-y-1">
                        <Label>Options (comma-separated)</Label>
                        <Input
                          value={editOptions}
                          onChange={(e) => setEditOptions(e.target.value)}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editIsRequired}
                        onCheckedChange={setEditIsRequired}
                      />
                      <Label>Required</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-mono text-muted-foreground w-6 text-center flex-shrink-0">
                      {question.displayOrder}
                    </span>
                    <span className="font-medium flex-1 min-w-0 truncate">{question.label}</span>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {getFieldTypeLabel(question.fieldType)}
                    </Badge>
                    {question.isRequired && (
                      <Badge variant="default" className="flex-shrink-0">Required</Badge>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch
                        checked={question.isActive}
                        onCheckedChange={() => handleToggleActive(question)}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(question)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Question</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{question.label}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(question.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
