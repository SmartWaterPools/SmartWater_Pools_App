import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Edit, 
  UserMinus,
  Check
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { WorkOrderTeamMember } from "@shared/schema";

interface TeamMemberWithUser extends WorkOrderTeamMember {
  userName: string;
  userEmail?: string;
  userRole?: string;
}

interface TechnicianWithUser {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

interface WorkOrderTeamMembersProps {
  workOrderId: number;
}

const TEAM_ROLES = [
  { value: "lead_tech", label: "Lead Tech" },
  { value: "technician", label: "Technician" },
  { value: "helper", label: "Helper" },
] as const;

const getRoleLabel = (role: string): string => {
  const found = TEAM_ROLES.find(r => r.value === role);
  return found?.label || role.charAt(0).toUpperCase() + role.slice(1);
};

const formatDate = (date: string | Date | null): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export function WorkOrderTeamMembers({ workOrderId }: WorkOrderTeamMembersProps) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberWithUser | null>(null);
  
  const [addForm, setAddForm] = useState({
    userId: "",
    role: "technician",
    notes: "",
  });
  
  const [editForm, setEditForm] = useState({
    role: "",
    notes: "",
  });

  const { data: teamMembers, isLoading } = useQuery<TeamMemberWithUser[]>({
    queryKey: ["/api/work-orders", workOrderId, "team"],
  });

  const { data: technicians } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians-with-users"],
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/work-orders/${workOrderId}/team`, {
        userId: parseInt(addForm.userId),
        role: addForm.role,
        notes: addForm.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team Member Added", description: "The team member has been added to this work order." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "team"] });
      closeAddDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember) return;
      const response = await apiRequest("PATCH", `/api/work-orders/${workOrderId}/team/${selectedMember.id}`, {
        role: editForm.role,
        notes: editForm.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team Member Updated", description: "The team member has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "team"] });
      closeEditDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember) return;
      const response = await apiRequest("PATCH", `/api/work-orders/${workOrderId}/team/${selectedMember.id}`, {
        isActive: false,
        removedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Team Member Removed", description: "The team member has been deactivated from this work order." });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", workOrderId, "team"] });
      closeRemoveDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const closeAddDialog = () => {
    setAddDialogOpen(false);
    setAddForm({ userId: "", role: "technician", notes: "" });
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedMember(null);
    setEditForm({ role: "", notes: "" });
  };

  const closeRemoveDialog = () => {
    setRemoveDialogOpen(false);
    setSelectedMember(null);
  };

  const handleOpenEditDialog = (member: TeamMemberWithUser) => {
    setSelectedMember(member);
    setEditForm({
      role: member.role,
      notes: member.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleOpenRemoveDialog = (member: TeamMemberWithUser) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  };

  const availableTechnicians = technicians?.filter(tech => {
    const activeMembers = teamMembers?.filter(m => m.isActive) || [];
    return !activeMembers.some(m => m.userId === tech.user.id);
  }) || [];

  const activeMembers = teamMembers?.filter(m => m.isActive) || [];
  const inactiveMembers = teamMembers?.filter(m => !m.isActive) || [];

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
            <Users className="h-5 w-5" />
            Team Members
            {activeMembers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeMembers.length} active
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add Team Member
          </Button>
        </CardHeader>
        <CardContent>
          {(!teamMembers || teamMembers.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members assigned yet</p>
              <p className="text-sm">Click "Add Team Member" to assign technicians to this work order</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.userName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.userEmail || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(member.assignedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={() => handleOpenEditDialog(member)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive" 
                          onClick={() => handleOpenRemoveDialog(member)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {inactiveMembers.map((member) => (
                  <TableRow key={member.id} className="opacity-50">
                    <TableCell className="font-medium">{member.userName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.userEmail || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Removed</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(member.assignedAt)}
                      {member.removedAt && (
                        <span className="text-muted-foreground block text-xs">
                          Removed: {formatDate(member.removedAt)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Assign a technician to this work order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Technician *</Label>
              <Select
                value={addForm.userId}
                onValueChange={(value) => setAddForm(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a technician" />
                </SelectTrigger>
                <SelectContent>
                  {availableTechnicians.length === 0 ? (
                    <SelectItem value="none" disabled>No available technicians</SelectItem>
                  ) : (
                    availableTechnicians.map((tech) => (
                      <SelectItem key={tech.user.id} value={tech.user.id.toString()}>
                        {tech.user.name} ({tech.user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) => setAddForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Additional notes about this assignment..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeAddDialog}>Cancel</Button>
              <Button 
                onClick={() => addMemberMutation.mutate()}
                disabled={addMemberMutation.isPending || !addForm.userId}
              >
                {addMemberMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update the role or notes for {selectedMember?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
              <Button 
                onClick={() => updateMemberMutation.mutate()}
                disabled={updateMemberMutation.isPending}
              >
                {updateMemberMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedMember?.userName} from this work order? 
              They will be marked as inactive but the assignment history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeRemoveDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => removeMemberMutation.mutate()}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
