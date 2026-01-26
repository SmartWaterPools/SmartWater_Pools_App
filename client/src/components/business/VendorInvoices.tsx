import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Upload, 
  DollarSign, 
  Package, 
  RefreshCw, 
  Plus, 
  Mail,
  MoreHorizontal,
  Eye,
  Calendar
} from 'lucide-react';
import { ImportFromEmailDialog } from './ImportFromEmailDialog';

interface VendorInvoice {
  id: number;
  vendorId: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  status: string;
  pdfUrl: string | null;
  parseConfidence: number | null;
  inventoryProcessed: boolean;
  expenseProcessed: boolean;
}

interface VendorInvoicesProps {
  vendorId: number;
  vendorEmail?: string;
}

export function VendorInvoices({ vendorId, vendorEmail }: VendorInvoicesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showImportEmailDialog, setShowImportEmailDialog] = useState(false);
  
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    totalAmount: '',
  });

  const { data: invoices, isLoading, error } = useQuery<VendorInvoice[]>({
    queryKey: ['/api/vendor-invoices/by-vendor', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-invoices/by-vendor/${vendorId}`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch invoices');
      }
      return res.json();
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof newInvoice) => {
      return apiRequest('POST', '/api/vendor-invoices', {
        vendorId,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate || null,
        dueDate: data.dueDate || null,
        totalAmount: data.totalAmount ? Math.round(parseFloat(data.totalAmount) * 100) : null,
        status: 'pending',
      });
    },
    onSuccess: () => {
      toast({ title: 'Invoice created', description: 'The invoice has been created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
      setShowCreateDialog(false);
      setNewInvoice({ invoiceNumber: '', invoiceDate: '', dueDate: '', totalAmount: '' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to create invoice: ${error.message}`, variant: 'destructive' });
    },
  });

  const parsePdfMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest('POST', `/api/vendor-invoices/${invoiceId}/parse-pdf`);
    },
    onSuccess: () => {
      toast({ title: 'PDF Parsing Started', description: 'The PDF is being processed.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to parse PDF: ${error.message}`, variant: 'destructive' });
    },
  });

  const processToExpenseMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest('POST', `/api/vendor-invoices/${invoiceId}/process-to-expense`);
    },
    onSuccess: () => {
      toast({ title: 'Expense Created', description: 'The invoice has been processed to an expense.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to process to expense: ${error.message}`, variant: 'destructive' });
    },
  });

  const processToInventoryMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest('POST', `/api/vendor-invoices/${invoiceId}/process-to-inventory`);
    },
    onSuccess: () => {
      toast({ title: 'Inventory Updated', description: 'The invoice has been processed to inventory.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to process to inventory: ${error.message}`, variant: 'destructive' });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amountInCents: number | null) => {
    if (amountInCents === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountInCents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const handleViewDetails = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetailDialog(true);
  };

  const handleImportFromEmail = () => {
    setShowImportEmailDialog(true);
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Error loading invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load invoices. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoices
              </CardTitle>
              <CardDescription>Manage invoices from this vendor</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleImportFromEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Import from Email
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Invoice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found for this vendor.</p>
              <p className="text-sm mt-2">Create a new invoice or import from email to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(invoice)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber || `INV-${invoice.id}`}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {invoice.expenseProcessed && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Expense
                            </Badge>
                          )}
                          {invoice.inventoryProcessed && (
                            <Badge variant="outline" className="bg-teal-100 text-teal-800 text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              Inventory
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(invoice); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {invoice.pdfUrl && (
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); parsePdfMutation.mutate(invoice.id); }}
                                disabled={parsePdfMutation.isPending}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Parse PDF
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); processToExpenseMutation.mutate(invoice.id); }}
                              disabled={invoice.expenseProcessed || processToExpenseMutation.isPending}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Process to Expense
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); processToInventoryMutation.mutate(invoice.id); }}
                              disabled={invoice.inventoryProcessed || processToInventoryMutation.isPending}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Process to Inventory
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Add a new invoice for this vendor manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                placeholder="INV-001"
                value={newInvoice.invoiceNumber}
                onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={newInvoice.invoiceDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newInvoice.totalAmount}
                onChange={(e) => setNewInvoice({ ...newInvoice, totalAmount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createInvoiceMutation.mutate(newInvoice)}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoiceNumber || `Invoice #${selectedInvoice?.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{selectedInvoice.invoiceNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={getStatusBadgeVariant(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax</p>
                  <p className="font-medium">{formatCurrency(selectedInvoice.taxAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedInvoice.totalAmount)}</p>
                </div>
              </div>
              {selectedInvoice.parseConfidence !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Parse Confidence</p>
                  <p className="font-medium">{(selectedInvoice.parseConfidence * 100).toFixed(0)}%</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                {!selectedInvoice.expenseProcessed && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => processToExpenseMutation.mutate(selectedInvoice.id)}
                    disabled={processToExpenseMutation.isPending}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process to Expense
                  </Button>
                )}
                {!selectedInvoice.inventoryProcessed && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => processToInventoryMutation.mutate(selectedInvoice.id)}
                    disabled={processToInventoryMutation.isPending}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Process to Inventory
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportFromEmailDialog
        vendorId={vendorId}
        vendorEmail={vendorEmail}
        open={showImportEmailDialog}
        onOpenChange={setShowImportEmailDialog}
        onImportSuccess={handleImportSuccess}
      />
    </>
  );
}
