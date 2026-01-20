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
  AlertTriangle,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Send,
  BarChart4,
  List,
  Loader2,
  Search,
} from "lucide-react";
import type { Invoice } from "@shared/schema";

type InvoiceWithClient = Invoice & {
  clientName?: string;
  clientEmail?: string;
};

type StatusFilter = 'all' | 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled';
type SortField = 'issueDate' | 'dueDate' | 'total' | 'clientName';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  draft: { variant: "secondary", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  sent: { variant: "default", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  viewed: { variant: "default", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
  partial: { variant: "default", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  paid: { variant: "default", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  overdue: { variant: "destructive", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  cancelled: { variant: "secondary", className: "bg-gray-100 text-gray-500 line-through hover:bg-gray-100" },
};

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("issueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceWithClient | null>(null);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<InvoiceWithClient[]>({
    queryKey: ['/api/invoices'],
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

  const invoicesWithClients: InvoiceWithClient[] = useMemo(() => {
    return invoices.map(invoice => ({
      ...invoice,
      clientName: clientMap[invoice.clientId]?.name || `Client #${invoice.clientId}`,
      clientEmail: clientMap[invoice.clientId]?.email,
    }));
  }, [invoices, clientMap]);

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalRevenue = 0;
    let outstandingAmount = 0;
    let overdueAmount = 0;
    let invoicesThisMonth = 0;
    const statusCounts: Record<string, number> = {
      draft: 0,
      sent: 0,
      viewed: 0,
      partial: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    invoicesWithClients.forEach(invoice => {
      if (invoice.status === 'paid') {
        totalRevenue += invoice.total || 0;
      }
      
      if (['sent', 'viewed', 'partial', 'overdue'].includes(invoice.status || '')) {
        outstandingAmount += invoice.amountDue || 0;
      }
      
      if (invoice.status === 'overdue') {
        overdueAmount += invoice.amountDue || 0;
      }
      
      const issueDate = new Date(invoice.issueDate);
      if (issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear) {
        invoicesThisMonth++;
      }
      
      const status = invoice.status || 'draft';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    return {
      totalRevenue,
      outstandingAmount,
      overdueAmount,
      invoicesThisMonth,
      statusCounts,
      totalInvoices: invoicesWithClients.length,
    };
  }, [invoicesWithClients]);

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoicesWithClients;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(query) ||
        inv.clientName?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'issueDate':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
          break;
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
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
  }, [invoicesWithClients, statusFilter, searchQuery, sortField, sortDirection]);

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("DELETE", `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      toast({ title: "Invoice deleted", description: "The invoice has been removed successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to delete invoice: ${error.message}`, variant: "destructive" });
    }
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/send`);
    },
    onSuccess: () => {
      toast({ title: "Invoice sent", description: "The invoice status has been updated to sent." });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to send invoice: ${error.message}`, variant: "destructive" });
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

  const handleDeleteClick = (invoice: InvoiceWithClient) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoiceMutation.mutate(invoiceToDelete.id);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your invoices, track payments, and monitor revenue.
          </p>
        </div>
        <Button onClick={() => setLocation('/invoices/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Invoice</span>
        </Button>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <BarChart4 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-1">
              <List className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Invoices</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardMetrics.totalRevenue)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  From paid invoices
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Outstanding
                </CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardMetrics.outstandingAmount)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Overdue
                </CardTitle>
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold text-red-600">
                  {formatCurrency(dashboardMetrics.overdueAmount)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Past due date
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  This Month
                </CardTitle>
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold">
                  {dashboardMetrics.invoicesThisMonth}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Invoices created
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Invoice Status Summary</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                {invoicesLoading ? (
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
                      <span>{dashboardMetrics.totalInvoices}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Common invoice tasks</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => setLocation('/invoices/new')}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">New Invoice</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => {
                      setActiveTab('invoices');
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
                      setActiveTab('invoices');
                      setStatusFilter('overdue');
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-xs">View Overdue</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col h-auto py-4 gap-2"
                    onClick={() => {
                      setActiveTab('invoices');
                      setStatusFilter('paid');
                    }}
                  >
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-xs">View Paid</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
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
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <SelectItem value="dueDate">Due Date</SelectItem>
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
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading invoices...</span>
                </div>
              ) : filteredAndSortedInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found</p>
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
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Amount Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.clientName}</TableCell>
                          <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.total || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.amountDue || 0)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status || 'draft')}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation(`/invoices/${invoice.id}`)}
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation(`/invoices/${invoice.id}/edit`)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {invoice.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                                  disabled={sendInvoiceMutation.isPending}
                                  title="Send"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(invoice)}
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
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoiceNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? (
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
