import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  Eye,
  Pencil,
  Trash2,
  BarChart4,
  List,
  Loader2,
  Search,
} from "lucide-react";
import type { Estimate } from "@shared/schema";

type EstimateWithClient = Estimate & {
  clientName?: string;
  clientEmail?: string;
};

type StatusFilter = 'all' | 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'converted';
type SortField = 'issueDate' | 'expiryDate' | 'total' | 'clientName';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { variant: "secondary", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  sent: { variant: "default", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  viewed: { variant: "default", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
  accepted: { variant: "default", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  declined: { variant: "destructive", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  expired: { variant: "default", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  converted: { variant: "default", className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100" },
};

export default function Estimates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("issueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<EstimateWithClient | null>(null);

  const { data: estimates = [], isLoading: estimatesLoading } = useQuery<EstimateWithClient[]>({
    queryKey: ['/api/estimates'],
  });

  const { data: clients = [] } = useQuery<{ id: number; userId: number; user?: { name: string; email: string } }[]>({
    queryKey: ['/api/clients'],
  });

  const clientMap = useMemo(() => {
    const map: Record<number, { name: string; email: string }> = {};
    clients.forEach(client => {
      if (client.user) {
        map[client.id] = { name: client.user.name, email: client.user.email };
      }
    });
    return map;
  }, [clients]);

  const estimatesWithClients: EstimateWithClient[] = useMemo(() => {
    return estimates.map(estimate => ({
      ...estimate,
      clientName: clientMap[estimate.clientId]?.name || `Client #${estimate.clientId}`,
      clientEmail: clientMap[estimate.clientId]?.email,
    }));
  }, [estimates, clientMap]);

  const dashboardMetrics = useMemo(() => {
    let totalValue = 0;
    let pendingCount = 0;
    let acceptedCount = 0;
    const statusCounts: Record<string, number> = {
      draft: 0,
      sent: 0,
      viewed: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      converted: 0,
    };

    estimatesWithClients.forEach(estimate => {
      totalValue += estimate.total || 0;

      if (['draft', 'sent'].includes(estimate.status || '')) {
        pendingCount++;
      }

      if (estimate.status === 'accepted') {
        acceptedCount++;
      }

      const status = estimate.status || 'draft';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    return {
      totalEstimates: estimatesWithClients.length,
      pendingCount,
      acceptedCount,
      totalValue,
      statusCounts,
    };
  }, [estimatesWithClients]);

  const filteredAndSortedEstimates = useMemo(() => {
    let filtered = estimatesWithClients;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(est => est.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(est =>
        est.estimateNumber?.toLowerCase().includes(query) ||
        est.clientName?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'issueDate':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
          break;
        case 'expiryDate':
          comparison = new Date(a.expiryDate || '').getTime() - new Date(b.expiryDate || '').getTime();
          break;
        case 'total':
          comparison = (a.total || 0) - (b.total || 0);
          break;
        case 'clientName':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [estimatesWithClients, statusFilter, searchQuery, sortField, sortDirection]);

  const deleteEstimateMutation = useMutation({
    mutationFn: async (estimateId: number) => {
      return apiRequest("DELETE", `/api/estimates/${estimateId}`);
    },
    onSuccess: () => {
      toast({ title: "Estimate deleted", description: "The estimate has been removed successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/estimates'] });
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to delete estimate: ${error.message}`, variant: "destructive" });
    }
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteClick = (estimate: EstimateWithClient) => {
    setEstimateToDelete(estimate);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (estimateToDelete) {
      deleteEstimateMutation.mutate(estimateToDelete.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusColors[status] || statusColors.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const hasDeposits = estimatesWithClients.some(est => (est.depositAmount || 0) > 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Estimates</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your estimates, track approvals, and convert to invoices.
          </p>
        </div>
        <Button onClick={() => setLocation('/estimates/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Estimate</span>
        </Button>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <BarChart4 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="estimates" className="flex items-center gap-1">
              <List className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Estimates</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Total Estimates
                </CardTitle>
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold">
                  {dashboardMetrics.totalEstimates}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  All estimates
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Pending
                </CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold text-blue-600">
                  {dashboardMetrics.pendingCount}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Draft + Sent
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Accepted
                </CardTitle>
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold text-green-600">
                  {dashboardMetrics.acceptedCount}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Approved estimates
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Total Value
                </CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardMetrics.totalValue)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  All estimates value
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Estimate Status Summary</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                {estimatesLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(dashboardMetrics.statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status)}
                        </div>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex items-center justify-between font-semibold">
                      <span>Total</span>
                      <span>{dashboardMetrics.totalEstimates}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Common estimate tasks</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => setLocation('/estimates/new')}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">New Estimate</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => {
                      setActiveTab('estimates');
                      setStatusFilter('draft');
                    }}
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">View Drafts</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => {
                      setActiveTab('estimates');
                      setStatusFilter('accepted');
                    }}
                  >
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-xs">View Accepted</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => {
                      setActiveTab('estimates');
                      setStatusFilter('sent');
                    }}
                  >
                    <Clock className="h-5 w-5 text-blue-500" />
                    <span className="text-xs">View Sent</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estimates" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search estimates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issueDate">Issue Date</SelectItem>
                  <SelectItem value="expiryDate">Expiry Date</SelectItem>
                  <SelectItem value="total">Amount</SelectItem>
                  <SelectItem value="clientName">Client</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {estimatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading estimates...</span>
                </div>
              ) : filteredAndSortedEstimates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No estimates found</p>
                  {(statusFilter !== 'all' || searchQuery) && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estimate #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {hasDeposits && (
                          <TableHead className="text-right">Deposit</TableHead>
                        )}
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedEstimates.map((estimate) => (
                        <TableRow key={estimate.id}>
                          <TableCell className="font-medium">{estimate.estimateNumber}</TableCell>
                          <TableCell>{estimate.clientName}</TableCell>
                          <TableCell>{formatDate(estimate.issueDate)}</TableCell>
                          <TableCell>{estimate.expiryDate ? formatDate(estimate.expiryDate) : '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(estimate.total || 0)}</TableCell>
                          {hasDeposits && (
                            <TableCell className="text-right">
                              {(estimate.depositAmount || 0) > 0 ? formatCurrency(estimate.depositAmount || 0) : '-'}
                            </TableCell>
                          )}
                          <TableCell>{getStatusBadge(estimate.status || 'draft')}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation(`/estimates/${estimate.id}`)}
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation(`/estimates/${estimate.id}/edit`)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(estimate)}
                                title="Delete"
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Estimate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete estimate {estimateToDelete?.estimateNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteEstimateMutation.isPending}
            >
              {deleteEstimateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
