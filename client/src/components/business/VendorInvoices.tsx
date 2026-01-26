import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  DollarSign, 
  Package, 
  RefreshCw, 
  Plus, 
  Mail,
  MoreHorizontal,
  Eye,
  Calendar,
  Paperclip,
  Search,
  Download,
  Image,
  File as FileIcon,
  Hash,
  Clock,
  Receipt,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit2,
  ExternalLink,
  Loader2,
  ShoppingCart,
  Percent
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

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
  documentType: string | null;
  attachmentId: number | null;
  emailId: number | null;
}

interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

interface TransientEmail {
  externalId: string;
  threadId: string | null;
  subject: string | null;
  fromEmail: string;
  fromName: string | null;
  snippet: string | null;
  receivedAt: string | null;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
}

interface EmailToAnalyze {
  id: number;
  externalId: string;
  threadId: string | null;
  subject: string | null;
  fromEmail: string;
  fromName: string | null;
  receivedAt: string | null;
  hasAttachments: boolean;
}

interface VendorInvoiceItem {
  id: number;
  vendorInvoiceId: number;
  description: string;
  sku: string | null;
  quantity: string;
  unitPrice: number | null;
  totalPrice: number | null;
  inventoryItemId: number | null;
  matchConfidence: number | null;
  isNewItem: boolean;
  addedToInventory: boolean;
  inventoryQuantityAdded: string | null;
  expenseCategory: string | null;
  sortOrder: number;
}

interface VendorInvoicesProps {
  vendorId: number;
  vendorEmail?: string;
  emailToAnalyze?: EmailToAnalyze | null;
  onEmailAnalyzed?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'plan_drawing', label: 'Plan/Drawing' },
  { value: 'quote_estimate', label: 'Quote/Estimate' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'other', label: 'Other' },
];

export function VendorInvoices({ vendorId, vendorEmail, emailToAnalyze, onEmailAnalyzed }: VendorInvoicesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState(vendorEmail ? `from:${vendorEmail}` : '');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [importingAttachment, setImportingAttachment] = useState<{
    email: TransientEmail;
    attachment: EmailAttachment;
  } | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState('invoice');
  const [showEmailToAnalyzeDialog, setShowEmailToAnalyzeDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: string;
    subtotal: string;
    taxAmount: string;
    documentType: string;
  } | null>(null);
  
  useEffect(() => {
    if (emailToAnalyze) {
      setShowEmailToAnalyzeDialog(true);
    }
  }, [emailToAnalyze]);

  useEffect(() => {
    if (selectedInvoice && isEditing) {
      setEditValues({
        invoiceNumber: selectedInvoice.invoiceNumber || '',
        invoiceDate: selectedInvoice.invoiceDate || '',
        dueDate: selectedInvoice.dueDate || '',
        totalAmount: selectedInvoice.totalAmount ? (selectedInvoice.totalAmount / 100).toFixed(2) : '',
        subtotal: selectedInvoice.subtotal ? (selectedInvoice.subtotal / 100).toFixed(2) : '',
        taxAmount: selectedInvoice.taxAmount ? (selectedInvoice.taxAmount / 100).toFixed(2) : '',
        documentType: selectedInvoice.documentType || 'invoice',
      });
    }
  }, [selectedInvoice, isEditing]);
  
  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    totalAmount: '',
    documentType: 'invoice',
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<VendorInvoice[]>({
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

  const { data: emailResults, isLoading: emailsLoading, refetch: refetchEmails } = useQuery<{
    emails: TransientEmail[];
    nextPageToken?: string;
  }>({
    queryKey: ['gmail-search', searchQuery],
    queryFn: async () => {
      const res = await fetch('/api/emails/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          maxResults: 20,
          searchQuery: searchQuery || undefined,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search emails');
      }
      return res.json();
    },
    enabled: activeTab === 'search' && searchQuery.length > 0,
    staleTime: 30000,
  });

  const { data: invoiceItems, isLoading: itemsLoading } = useQuery<VendorInvoiceItem[]>({
    queryKey: ['/api/vendor-invoices', selectedInvoice?.id, 'items'],
    queryFn: async () => {
      if (!selectedInvoice?.id) return [];
      const res = await fetch(`/api/vendor-invoices/${selectedInvoice.id}/items`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedInvoice?.id && showDetailDialog,
  });

  useEffect(() => {
    if (vendorEmail && !searchQuery) {
      setSearchQuery(`from:${vendorEmail}`);
    }
  }, [vendorEmail]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof newInvoice) => {
      return apiRequest('POST', '/api/vendor-invoices', {
        vendorId,
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate || null,
        dueDate: data.dueDate || null,
        totalAmount: data.totalAmount ? Math.round(parseFloat(data.totalAmount) * 100) : null,
        status: 'pending',
        documentType: data.documentType,
      });
    },
    onSuccess: () => {
      toast({ title: 'Document created', description: 'The document has been created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
      setShowCreateDialog(false);
      setNewInvoice({ invoiceNumber: '', invoiceDate: '', dueDate: '', totalAmount: '', documentType: 'invoice' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to create document: ${error.message}`, variant: 'destructive' });
    },
  });

  const importAttachmentMutation = useMutation({
    mutationFn: async ({ email, attachment, documentType }: {
      email: TransientEmail;
      attachment: EmailAttachment;
      documentType: string;
    }) => {
      return apiRequest('POST', '/api/vendor-invoices/import-from-email', {
        vendorId,
        emailData: {
          externalId: email.externalId,
          threadId: email.threadId,
          subject: email.subject,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          receivedAt: email.receivedAt,
        },
        attachmentData: {
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          externalId: attachment.attachmentId,
        },
        documentType,
      });
    },
    onSuccess: () => {
      toast({ title: 'Document Imported', description: 'The attachment has been imported successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
      setImportingAttachment(null);
      setSelectedDocumentType('invoice');
      setActiveTab('documents');
    },
    onError: (error) => {
      toast({ title: 'Import Failed', description: `Failed to import attachment: ${error.message}`, variant: 'destructive' });
    },
  });

  const parsePdfMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest('POST', `/api/vendor-invoices/${invoiceId}/parse`);
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
      toast({ title: 'Expense Created', description: 'The document has been processed to an expense.' });
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
      toast({ title: 'Inventory Updated', description: 'The document has been processed to inventory.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to process to inventory: ${error.message}`, variant: 'destructive' });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: number; data: typeof editValues }) => {
      if (!data) throw new Error('No data to update');
      return apiRequest('PATCH', `/api/vendor-invoices/${invoiceId}`, {
        invoiceNumber: data.invoiceNumber || null,
        invoiceDate: data.invoiceDate || null,
        dueDate: data.dueDate || null,
        totalAmount: data.totalAmount ? Math.round(parseFloat(data.totalAmount) * 100) : null,
        subtotal: data.subtotal ? Math.round(parseFloat(data.subtotal) * 100) : null,
        taxAmount: data.taxAmount ? Math.round(parseFloat(data.taxAmount) * 100) : null,
        documentType: data.documentType,
      });
    },
    onSuccess: () => {
      toast({ title: 'Document Updated', description: 'The document has been updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
      setIsEditing(false);
      setEditValues(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to update document: ${error.message}`, variant: 'destructive' });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'processed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'needs_review':
        return 'bg-orange-100 text-orange-800';
      case 'overdue':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeLabel = (type: string | null) => {
    const found = DOCUMENT_TYPES.find(t => t.value === type);
    return found?.label || 'Invoice';
  };

  const getDocumentTypeBadgeColor = (type: string | null) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800';
      case 'plan_drawing':
        return 'bg-purple-100 text-purple-800';
      case 'quote_estimate':
        return 'bg-orange-100 text-orange-800';
      case 'receipt':
        return 'bg-green-100 text-green-800';
      case 'other':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
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

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const handleViewDetails = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetailDialog(true);
  };

  const handleImportAttachment = (email: TransientEmail, attachment: EmailAttachment) => {
    setImportingAttachment({ email, attachment });
    setSelectedDocumentType('invoice');
  };

  const confirmImport = () => {
    if (importingAttachment) {
      importAttachmentMutation.mutate({
        email: importingAttachment.email,
        attachment: importingAttachment.attachment,
        documentType: selectedDocumentType,
      });
    }
  };

  const handleSearch = () => {
    refetchEmails();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Search vendor emails and manage imported documents</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Manually
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Search Emails
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Imported Documents
                {invoices && invoices.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {invoices.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search emails (e.g., from:${vendorEmail || 'vendor@example.com'})`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={emailsLoading}>
                  {emailsLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {!vendorEmail && (
                <div className="text-center py-4 text-muted-foreground bg-muted/50 rounded-lg">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No vendor email configured.</p>
                  <p className="text-xs mt-1">Add an email address to the vendor to auto-search.</p>
                </div>
              )}

              {emailsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : emailResults?.emails && emailResults.emails.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {emailResults.emails.map((email) => (
                      <div
                        key={email.externalId}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {email.subject || '(No subject)'}
                            </h4>
                            <p className="text-sm text-muted-foreground truncate">
                              From: {email.fromName || email.fromEmail}
                            </p>
                            {email.snippet && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {email.snippet}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(email.receivedAt)}
                          </div>
                        </div>

                        {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              Attachments
                            </p>
                            <div className="space-y-2">
                              {email.attachments.map((attachment, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {getAttachmentIcon(attachment.mimeType)}
                                    <span className="text-sm truncate">{attachment.filename}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({formatFileSize(attachment.size)})
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleImportAttachment(email, attachment)}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Import
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {email.hasAttachments && (!email.attachments || email.attachments.length === 0) && (
                          <div className="mt-3 pt-3 border-t">
                            <Badge variant="secondary" className="text-xs">
                              <Paperclip className="h-3 w-3 mr-1" />
                              Has Attachments
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : searchQuery && !emailsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No emails found matching your search.</p>
                  <p className="text-sm mt-2">Try adjusting your search query.</p>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="documents">
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !invoices || invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents imported yet.</p>
                  <p className="text-sm mt-2">Search for vendor emails to import documents.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
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
                          <TableCell>
                            <Badge variant="outline" className={getDocumentTypeBadgeColor(invoice.documentType)}>
                              {getDocumentTypeLabel(invoice.documentType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber || `DOC-${invoice.id}`}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Manually</DialogTitle>
            <DialogDescription>
              Add a new document for this vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select
                value={newInvoice.documentType}
                onValueChange={(value) => setNewInvoice({ ...newInvoice, documentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Document Number</Label>
              <Input
                id="invoiceNumber"
                placeholder="INV-001"
                value={newInvoice.invoiceNumber}
                onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Document Date</Label>
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
              {createInvoiceMutation.isPending ? 'Creating...' : 'Create Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={(open) => {
        setShowDetailDialog(open);
        if (!open) {
          setIsEditing(false);
          setEditValues(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedInvoice?.invoiceNumber || `Document #${selectedInvoice?.id}`}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  {selectedInvoice && (
                    <>
                      <Badge className={getDocumentTypeBadgeColor(selectedInvoice.documentType)}>
                        {getDocumentTypeLabel(selectedInvoice.documentType)}
                      </Badge>
                      <Badge className={getStatusBadgeVariant(selectedInvoice.status)}>
                        {selectedInvoice.status === 'processed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {selectedInvoice.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {selectedInvoice.status === 'needs_review' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {selectedInvoice.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                        {selectedInvoice.status === 'needs_review' ? 'Needs Review' : selectedInvoice.status}
                      </Badge>
                    </>
                  )}
                </DialogDescription>
              </div>
              {selectedInvoice && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {selectedInvoice.parseConfidence !== null && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {selectedInvoice.parseConfidence >= 0.7 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : selectedInvoice.parseConfidence >= 0.4 ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      Parsing Confidence
                    </span>
                    <span className="text-sm font-bold">
                      {(selectedInvoice.parseConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={selectedInvoice.parseConfidence * 100} 
                    className="h-2"
                  />
                  {selectedInvoice.parseConfidence < 0.7 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Low confidence parsing. Review fields for accuracy.
                    </p>
                  )}
                </div>
              )}

              {(selectedInvoice.pdfUrl || selectedInvoice.attachmentId) && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5 text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Original Document</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedInvoice.pdfUrl ? 'PDF file available' : 'Email attachment available'}
                    </p>
                  </div>
                  {selectedInvoice.pdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedInvoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View PDF
                      </a>
                    </Button>
                  )}
                </div>
              )}

              <Separator />

              {isEditing && editValues ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select value={editValues.documentType} onValueChange={(v) => setEditValues({ ...editValues, documentType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Document Number
                    </Label>
                    <Input 
                      value={editValues.invoiceNumber} 
                      onChange={(e) => setEditValues({ ...editValues, invoiceNumber: e.target.value })}
                      placeholder="Enter document number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Document Date
                      </Label>
                      <Input 
                        type="date"
                        value={editValues.invoiceDate} 
                        onChange={(e) => setEditValues({ ...editValues, invoiceDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Due Date
                      </Label>
                      <Input 
                        type="date"
                        value={editValues.dueDate} 
                        onChange={(e) => setEditValues({ ...editValues, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Subtotal
                      </Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editValues.subtotal} 
                        onChange={(e) => setEditValues({ ...editValues, subtotal: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Tax
                      </Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editValues.taxAmount} 
                        onChange={(e) => setEditValues({ ...editValues, taxAmount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Total
                      </Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editValues.totalAmount} 
                        onChange={(e) => setEditValues({ ...editValues, totalAmount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setEditValues(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => updateInvoiceMutation.mutate({ invoiceId: selectedInvoice.id, data: editValues })}
                      disabled={updateInvoiceMutation.isPending}
                    >
                      {updateInvoiceMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedInvoice.invoiceNumber && (
                      <div className="flex items-start gap-3">
                        <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Document Number</p>
                          <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                        </div>
                      </div>
                    )}
                    {selectedInvoice.invoiceDate && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Document Date</p>
                          <p className="font-medium">{formatDate(selectedInvoice.invoiceDate)}</p>
                        </div>
                      </div>
                    )}
                    {selectedInvoice.dueDate && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Due Date</p>
                          <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {(selectedInvoice.totalAmount || selectedInvoice.subtotal || selectedInvoice.taxAmount) && (
                    <>
                      <Separator />
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="space-y-2">
                          {selectedInvoice.subtotal && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                            </div>
                          )}
                          {selectedInvoice.taxAmount && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tax</span>
                              <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                            </div>
                          )}
                          {selectedInvoice.totalAmount && (
                            <>
                              <Separator />
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span className="text-primary">{formatCurrency(selectedInvoice.totalAmount)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {!selectedInvoice.invoiceNumber && !selectedInvoice.invoiceDate && !selectedInvoice.dueDate && 
                   !selectedInvoice.totalAmount && !selectedInvoice.subtotal && !selectedInvoice.taxAmount && (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data has been parsed from this document yet.</p>
                      <p className="text-xs mt-1">Click "Re-parse" to try again or "Edit" to add manually.</p>
                    </div>
                  )}
                </div>
              )}

              {invoiceItems && invoiceItems.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Line Items ({invoiceItems.length})
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-20 text-right">Qty</TableHead>
                            <TableHead className="w-24 text-right">Unit Price</TableHead>
                            <TableHead className="w-24 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.description}</p>
                                  {item.sku && (
                                    <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}

              {itemsLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading items...</span>
                </div>
              )}

              <Separator />

              <div className="flex flex-wrap gap-2">
                {(selectedInvoice.pdfUrl || selectedInvoice.attachmentId) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => parsePdfMutation.mutate(selectedInvoice.id)}
                    disabled={parsePdfMutation.isPending}
                  >
                    {parsePdfMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Re-parse Document
                  </Button>
                )}
                
                {!selectedInvoice.expenseProcessed && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => processToExpenseMutation.mutate(selectedInvoice.id)}
                    disabled={processToExpenseMutation.isPending}
                  >
                    {processToExpenseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-2" />
                    )}
                    Process to Expense
                  </Button>
                )}
                {selectedInvoice.expenseProcessed && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Expense Created
                  </Badge>
                )}
                
                {!selectedInvoice.inventoryProcessed && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => processToInventoryMutation.mutate(selectedInvoice.id)}
                    disabled={processToInventoryMutation.isPending}
                  >
                    {processToInventoryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4 mr-2" />
                    )}
                    Process to Inventory
                  </Button>
                )}
                {selectedInvoice.inventoryProcessed && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Inventory Updated
                  </Badge>
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

      <Dialog open={!!importingAttachment} onOpenChange={(open) => !open && setImportingAttachment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Document</DialogTitle>
            <DialogDescription>
              Select a document type for this attachment.
            </DialogDescription>
          </DialogHeader>
          {importingAttachment && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getAttachmentIcon(importingAttachment.attachment.mimeType)}
                  <span className="font-medium">{importingAttachment.attachment.filename}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  From: {importingAttachment.email.subject || '(No subject)'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(importingAttachment.attachment.size)} • {importingAttachment.attachment.mimeType}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportingAttachment(null)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmImport}
              disabled={importAttachmentMutation.isPending}
            >
              {importAttachmentMutation.isPending ? 'Importing...' : 'Import Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showEmailToAnalyzeDialog && !!emailToAnalyze} 
        onOpenChange={(open) => {
          if (!open) {
            setShowEmailToAnalyzeDialog(false);
            onEmailAnalyzed?.();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Analyze Email Attachments</DialogTitle>
            <DialogDescription>
              This email has attachments that can be analyzed. Search for this email to view and import its attachments.
            </DialogDescription>
          </DialogHeader>
          {emailToAnalyze && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="font-medium">{emailToAnalyze.subject || '(No subject)'}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  From: {emailToAnalyze.fromName || emailToAnalyze.fromEmail}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {emailToAnalyze.receivedAt ? new Date(emailToAnalyze.receivedAt).toLocaleDateString() : 'Unknown date'}
                </p>
                {emailToAnalyze.hasAttachments && (
                  <Badge variant="secondary" className="mt-2">
                    <Paperclip className="h-3 w-3 mr-1" />
                    Has Attachments
                  </Badge>
                )}
              </div>
              
              <p className="text-sm">
                Click "Search for Email" to find this email and its attachments. You can then select which attachments to import as documents.
              </p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEmailToAnalyzeDialog(false);
                onEmailAnalyzed?.();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (emailToAnalyze) {
                  setSearchQuery(`from:${emailToAnalyze.fromEmail} subject:${emailToAnalyze.subject || ''}`);
                  setActiveTab('search');
                  setShowEmailToAnalyzeDialog(false);
                  onEmailAnalyzed?.();
                }
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              Search for Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
