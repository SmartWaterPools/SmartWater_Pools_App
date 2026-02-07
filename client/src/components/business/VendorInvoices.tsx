import { useState, useEffect, useRef } from 'react';
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
  Percent,
  FileCode,
  Layers,
  Copy,
  Sparkles,
  MousePointer2,
  Trash2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import PdfFieldSelector from './PdfFieldSelector';

interface VendorInvoice {
  id: number;
  vendorId: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  poNumber: string | null;
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
  rawText: string | null;
  parseErrors: string | null;
  shippingAmount: number | null;
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
  const [detailTab, setDetailTab] = useState<'details' | 'analyze' | 'rawtext'>('details');
  const [showTemplateMapping, setShowTemplateMapping] = useState(false);
  const [textFieldTags, setTextFieldTags] = useState<Array<{
    id: string;
    fieldType: string;
    text: string;
    startOffset: number;
    endOffset: number;
  }>>([]);
  const [stagedLineItem, setStagedLineItem] = useState<{
    description?: string;
    quantity?: string;
    unitPrice?: string;
    totalPrice?: string;
  }>({});
  const [taggedLineItems, setTaggedLineItems] = useState<Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
  }>>([]);
  const [showFieldPopover, setShowFieldPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [currentSelection, setCurrentSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const rawTextRef = useRef<HTMLDivElement>(null);
  const [editValues, setEditValues] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    poNumber: string;
    totalAmount: string;
    subtotal: string;
    taxAmount: string;
    documentType: string;
  } | null>(null);
  const [analyzeEditValues, setAnalyzeEditValues] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    poNumber: string;
    totalAmount: string;
    subtotal: string;
    taxAmount: string;
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
        poNumber: selectedInvoice.poNumber || '',
        totalAmount: selectedInvoice.totalAmount ? (selectedInvoice.totalAmount / 100).toFixed(2) : '',
        subtotal: selectedInvoice.subtotal ? (selectedInvoice.subtotal / 100).toFixed(2) : '',
        taxAmount: selectedInvoice.taxAmount ? (selectedInvoice.taxAmount / 100).toFixed(2) : '',
        documentType: selectedInvoice.documentType || 'invoice',
      });
    }
  }, [selectedInvoice, isEditing]);

  useEffect(() => {
    if (selectedInvoice) {
      setAnalyzeEditValues({
        invoiceNumber: selectedInvoice.invoiceNumber || '',
        invoiceDate: selectedInvoice.invoiceDate || '',
        dueDate: selectedInvoice.dueDate || '',
        poNumber: selectedInvoice.poNumber || '',
        totalAmount: selectedInvoice.totalAmount ? (selectedInvoice.totalAmount / 100).toFixed(2) : '',
        subtotal: selectedInvoice.subtotal ? (selectedInvoice.subtotal / 100).toFixed(2) : '',
        taxAmount: selectedInvoice.taxAmount ? (selectedInvoice.taxAmount / 100).toFixed(2) : '',
      });
      setTextFieldTags([]);
      setShowFieldPopover(false);
      setCurrentSelection(null);
      setStagedLineItem({});
      setTaggedLineItems([]);
    }
  }, [selectedInvoice]);
  
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

  const parseWithAIMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiRequest('POST', `/api/vendor-invoices/${invoiceId}/parse-with-ai`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: 'AI Extraction Complete', description: 'Document fields have been extracted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices', selectedInvoice?.id, 'items'] });
      if (data?.invoice) {
        setSelectedInvoice(data.invoice);
      }
      setDetailTab('analyze');
    },
    onError: (error) => {
      toast({ title: 'AI Extraction Failed', description: `${error.message}`, variant: 'destructive' });
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
        poNumber: data.poNumber || null,
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

  const { data: parsingTemplates } = useQuery({
    queryKey: ['/api/vendor-invoices/parsing-templates', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-invoices/parsing-templates/${vendorId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return apiRequest('DELETE', `/api/vendor-invoices/parsing-template/${templateId}`);
    },
    onSuccess: () => {
      toast({ title: 'Template Deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/parsing-templates', vendorId] });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest('POST', `/api/vendor-invoices/${invoiceId}/parse`);
    },
    onSuccess: () => {
      toast({ title: 'Template Applied', description: 'Document has been re-parsed. Check the extracted data below.' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/by-vendor', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices', selectedInvoice?.id, 'items'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to apply template: ${error.message}`, variant: 'destructive' });
    },
  });

  const addLineItemMutation = useMutation({
    mutationFn: async ({ invoiceId, item }: { invoiceId: number; item: { description: string; quantity: string; unitPrice: string; totalPrice: string } }) => {
      return apiRequest('POST', `/api/vendor-invoices/${invoiceId}/items`, {
        vendorInvoiceId: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice ? Math.round(parseFloat(item.unitPrice.replace(/[$,]/g, '')) * 100) : null,
        totalPrice: item.totalPrice ? Math.round(parseFloat(item.totalPrice.replace(/[$,]/g, '')) * 100) : null,
      });
    },
    onSuccess: () => {
      toast({ title: 'Line Item Added' });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices', selectedInvoice?.id, 'items'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to add line item: ${error.message}`, variant: 'destructive' });
    },
  });

  const FIELD_TAG_TYPES = [
    { value: 'invoice_number', label: 'Invoice #', color: 'bg-blue-200 text-blue-800' },
    { value: 'invoice_date', label: 'Date', color: 'bg-green-200 text-green-800' },
    { value: 'due_date', label: 'Due Date', color: 'bg-yellow-200 text-yellow-800' },
    { value: 'po_number', label: 'PO #', color: 'bg-cyan-200 text-cyan-800' },
    { value: 'subtotal', label: 'Subtotal', color: 'bg-purple-200 text-purple-800' },
    { value: 'tax', label: 'Tax', color: 'bg-orange-200 text-orange-800' },
    { value: 'total', label: 'Total', color: 'bg-red-200 text-red-800' },
    { value: 'line_item_desc', label: 'Item Desc', color: 'bg-teal-200 text-teal-800' },
    { value: 'line_item_qty', label: 'Item Qty', color: 'bg-indigo-200 text-indigo-800' },
    { value: 'line_item_unit_price', label: 'Unit Price', color: 'bg-pink-200 text-pink-800' },
    { value: 'line_item_total', label: 'Item Total', color: 'bg-amber-200 text-amber-800' },
  ];

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !rawTextRef.current) {
      setShowFieldPopover(false);
      return;
    }
    const text = selection.toString().trim();
    if (!text) {
      setShowFieldPopover(false);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = rawTextRef.current.getBoundingClientRect();
    setCurrentSelection({
      text,
      start: range.startOffset,
      end: range.endOffset,
    });
    setPopoverPosition({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 10,
    });
    setShowFieldPopover(true);
  };

  const applyFieldTag = (fieldType: string) => {
    if (!currentSelection) return;
    const newTag = {
      id: `tag-${Date.now()}`,
      fieldType,
      text: currentSelection.text,
      startOffset: currentSelection.start,
      endOffset: currentSelection.end,
    };
    if (fieldType.startsWith('line_item_')) {
      setTextFieldTags(prev => [...prev, newTag]);
      setStagedLineItem(prev => {
        const updated = { ...prev };
        if (fieldType === 'line_item_desc') updated.description = currentSelection.text;
        if (fieldType === 'line_item_qty') updated.quantity = currentSelection.text;
        if (fieldType === 'line_item_unit_price') updated.unitPrice = currentSelection.text;
        if (fieldType === 'line_item_total') updated.totalPrice = currentSelection.text;
        return updated;
      });
    } else {
      setTextFieldTags(prev => [...prev.filter(t => t.fieldType !== fieldType), newTag]);
    }
    setShowFieldPopover(false);
    window.getSelection()?.removeAllRanges();
  };

  const applyTaggedFieldsToInvoice = () => {
    if (!selectedInvoice || textFieldTags.length === 0) return;
    const updates: any = {};
    for (const tag of textFieldTags) {
      switch (tag.fieldType) {
        case 'invoice_number': updates.invoiceNumber = tag.text; break;
        case 'invoice_date': updates.invoiceDate = tag.text; break;
        case 'due_date': updates.dueDate = tag.text; break;
        case 'subtotal': updates.subtotal = tag.text; break;
        case 'tax': updates.taxAmount = tag.text; break;
        case 'po_number': updates.poNumber = tag.text; break;
        case 'total': updates.totalAmount = tag.text; break;
      }
    }
    updateInvoiceMutation.mutate({
      invoiceId: selectedInvoice.id,
      data: {
        invoiceNumber: updates.invoiceNumber || selectedInvoice.invoiceNumber || '',
        invoiceDate: updates.invoiceDate || selectedInvoice.invoiceDate || '',
        dueDate: updates.dueDate || selectedInvoice.dueDate || '',
        poNumber: updates.poNumber || selectedInvoice.poNumber || '',
        totalAmount: updates.totalAmount || (selectedInvoice.totalAmount ? (selectedInvoice.totalAmount / 100).toFixed(2) : ''),
        subtotal: updates.subtotal || (selectedInvoice.subtotal ? (selectedInvoice.subtotal / 100).toFixed(2) : ''),
        taxAmount: updates.taxAmount || (selectedInvoice.taxAmount ? (selectedInvoice.taxAmount / 100).toFixed(2) : ''),
        documentType: selectedInvoice.documentType || 'invoice',
      }
    });
  };

  const renderHighlightedText = (text: string) => {
    if (textFieldTags.length === 0) return text;
    const highlights: Array<{ start: number; end: number; fieldType: string }> = [];
    for (const tag of textFieldTags) {
      const idx = text.indexOf(tag.text);
      if (idx !== -1) {
        highlights.push({ start: idx, end: idx + tag.text.length, fieldType: tag.fieldType });
      }
    }
    if (highlights.length === 0) return text;
    highlights.sort((a, b) => a.start - b.start);
    const segments: JSX.Element[] = [];
    let lastEnd = 0;
    highlights.forEach((h, i) => {
      if (h.start > lastEnd) {
        segments.push(<span key={`text-${i}`}>{text.substring(lastEnd, h.start)}</span>);
      }
      const tagType = FIELD_TAG_TYPES.find(t => t.value === h.fieldType);
      segments.push(
        <mark key={`highlight-${i}`} className={`${tagType?.color || 'bg-yellow-200'} px-0.5 rounded`}>
          {text.substring(h.start, h.end)}
        </mark>
      );
      lastEnd = h.end;
    });
    if (lastEnd < text.length) {
      segments.push(<span key="text-end">{text.substring(lastEnd)}</span>);
    }
    return <>{segments}</>;
  };

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
        <CardHeader className="p-4 sm:p-6">
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
        <CardContent className="p-3 sm:p-6 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="search" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Mail className="h-4 w-4" />
                Search Emails
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
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
                        className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
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
                                  className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/50 rounded-md"
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
                <>
                <div className="sm:hidden space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer p-3"
                      onClick={() => handleViewDetails(invoice)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className={`${getDocumentTypeBadgeColor(invoice.documentType)} text-xs`}>
                            {getDocumentTypeLabel(invoice.documentType)}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {invoice.invoiceNumber || `DOC-${invoice.id}`}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(invoice); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {(invoice.pdfUrl || invoice.attachmentId) && (
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
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {formatCurrency(invoice.totalAmount)}
                        </span>
                        <Badge variant="outline" className={`${getStatusBadgeVariant(invoice.status)} text-xs`}>
                          {invoice.status}
                        </Badge>
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
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                        <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Processed</TableHead>
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
                          <TableCell className="hidden sm:table-cell">{formatDate(invoice.invoiceDate)}</TableCell>
                          <TableCell className="hidden lg:table-cell">{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusBadgeVariant(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
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
                                {(invoice.pdfUrl || invoice.attachmentId) && (
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
                </>
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
          setDetailTab('details');
          setShowTemplateMapping(false);
          setTextFieldTags([]);
          setShowFieldPopover(false);
          setCurrentSelection(null);
          setStagedLineItem({});
          setTaggedLineItems([]);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
            <div className="space-y-4">
              {selectedInvoice.parseConfidence !== null && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {selectedInvoice.parseConfidence >= 70 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : selectedInvoice.parseConfidence >= 40 ? (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      Parsing Confidence
                    </span>
                    <span className="text-sm font-bold">
                      {selectedInvoice.parseConfidence}%
                    </span>
                  </div>
                  <Progress 
                    value={selectedInvoice.parseConfidence} 
                    className="h-2"
                  />
                  {selectedInvoice.parseConfidence < 70 && (
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
                  {(selectedInvoice.pdfUrl || selectedInvoice.attachmentId) && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/vendor-invoices/${selectedInvoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View PDF
                      </a>
                    </Button>
                  )}
                </div>
              )}

              <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as 'details' | 'analyze' | 'rawtext')}>
                <TabsList className="w-full grid grid-cols-3 h-auto">
                  <TabsTrigger value="details" className="flex items-center gap-1 text-xs sm:text-sm py-1.5">
                    <Layers className="h-3 w-3 shrink-0" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="analyze" className="flex items-center gap-1 text-xs sm:text-sm py-1.5">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    Analyze & Map
                  </TabsTrigger>
                  <TabsTrigger value="rawtext" className="flex items-center gap-1 text-xs sm:text-sm py-1.5">
                    <FileCode className="h-3 w-3 shrink-0" />
                    Raw Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">

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
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      PO #
                    </Label>
                    <Input 
                      value={editValues.poNumber} 
                      onChange={(e) => setEditValues({ ...editValues, poNumber: e.target.value })}
                      placeholder="Enter purchase order number"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedInvoice.invoiceNumber && (
                      <div className="flex items-start gap-3">
                        <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Document Number</p>
                          <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                        </div>
                      </div>
                    )}
                    {selectedInvoice.poNumber && (
                      <div className="flex items-start gap-3">
                        <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">PO #</p>
                          <p className="font-medium">{selectedInvoice.poNumber}</p>
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

                  {!selectedInvoice.invoiceNumber && !selectedInvoice.poNumber && !selectedInvoice.invoiceDate && !selectedInvoice.dueDate && 
                   !selectedInvoice.totalAmount && !selectedInvoice.subtotal && !selectedInvoice.taxAmount && (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data has been parsed from this document yet.</p>
                      <p className="text-xs mt-1">Click "Re-parse" to try again or "Edit" to add manually.</p>
                      {selectedInvoice.parseErrors && (
                        <p className="text-xs mt-2 text-amber-600">{selectedInvoice.parseErrors}</p>
                      )}
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
                </TabsContent>

                <TabsContent value="analyze" className="mt-4 space-y-4">
                  {selectedInvoice.parseErrors && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Parsing Issue
                      </p>
                      <p className="text-xs text-amber-700 mt-1">{selectedInvoice.parseErrors}</p>
                    </div>
                  )}

                  <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-purple-800">AI-Powered Extraction</p>
                          <p className="text-xs text-purple-600">Let AI automatically extract all fields from this document</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => parseWithAIMutation.mutate(selectedInvoice.id)}
                        disabled={parseWithAIMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {parseWithAIMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Auto-Extract with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {parsingTemplates && parsingTemplates.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Saved Templates
                      </h4>
                      <div className="space-y-2">
                        {parsingTemplates.map((template: any) => (
                          <div key={template.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <div>
                              <p className="text-sm font-medium">{template.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {template.fieldPositions ? `${JSON.parse(template.fieldPositions).length} fields mapped` : 'No field positions'}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({ title: 'Applying Template', description: `Re-parsing document with template "${template.name}"...` });
                                  applyTemplateMutation.mutate(selectedInvoice.id);
                                }}
                                disabled={applyTemplateMutation.isPending}
                              >
                                {applyTemplateMutation.isPending ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Applying...</>
                                ) : (
                                  'Apply'
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Extracted Data
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="border rounded-lg p-3 bg-purple-50/50">
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-purple-800">
                          <DollarSign className="h-4 w-4" />
                          Expense Fields
                        </h5>
                        {analyzeEditValues && (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Invoice #</Label>
                              <Input
                                value={analyzeEditValues.invoiceNumber}
                                onChange={(e) => setAnalyzeEditValues({ ...analyzeEditValues, invoiceNumber: e.target.value })}
                                placeholder="Invoice number"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">PO #</Label>
                              <Input
                                value={analyzeEditValues.poNumber}
                                onChange={(e) => setAnalyzeEditValues({ ...analyzeEditValues, poNumber: e.target.value })}
                                placeholder="Purchase order number"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Date</Label>
                              <Input
                                type="date"
                                value={analyzeEditValues.invoiceDate}
                                onChange={(e) => setAnalyzeEditValues({ ...analyzeEditValues, invoiceDate: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Due Date</Label>
                              <Input
                                type="date"
                                value={analyzeEditValues.dueDate}
                                onChange={(e) => setAnalyzeEditValues({ ...analyzeEditValues, dueDate: e.target.value })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Subtotal</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={analyzeEditValues.subtotal}
                                onChange={(e) => setAnalyzeEditValues({ ...analyzeEditValues, subtotal: e.target.value })}
                                placeholder="0.00"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tax</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={analyzeEditValues.taxAmount}
                                onChange={(e) => setAnalyzeEditValues({ ...analyzeEditValues, taxAmount: e.target.value })}
                                placeholder="0.00"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Total</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={analyzeEditValues.totalAmount}
                                onChange={(e) => setAnalyzeEditValues({ ...analyzeEditValues, totalAmount: e.target.value })}
                                placeholder="0.00"
                                className="h-8 text-sm"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => updateInvoiceMutation.mutate({
                                invoiceId: selectedInvoice.id,
                                data: {
                                  ...analyzeEditValues,
                                  documentType: selectedInvoice.documentType || 'invoice',
                                },
                              })}
                              disabled={updateInvoiceMutation.isPending}
                            >
                              {updateInvoiceMutation.isPending ? (
                                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...</>
                              ) : (
                                'Save Changes'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-3 bg-teal-50/50">
                        <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-teal-800">
                          <Package className="h-4 w-4" />
                          Line Items
                        </h5>
                        {invoiceItems && invoiceItems.length > 0 ? (
                          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                            {invoiceItems.map((item: any, idx: number) => (
                              <div key={idx} className="border-b pb-2 last:border-b-0">
                                <p className="font-medium truncate">{item.description}</p>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>SKU: {item.sku || '-'}</span>
                                  <span>Qty: {item.quantity}</span>
                                  <span>{formatCurrency(item.totalPrice)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No line items parsed yet</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    {!showTemplateMapping ? (
                      <div className="flex flex-col items-center gap-2 py-3 text-center">
                        <MousePointer2 className="h-5 w-5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Create reusable templates by mapping fields directly on the PDF</p>
                        <Button variant="outline" size="sm" onClick={() => setShowTemplateMapping(true)}>
                          <Layers className="h-4 w-4 mr-2" /> Visual Template Mapping
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium">Visual Template Mapping</h4>
                          <Button variant="ghost" size="sm" onClick={() => setShowTemplateMapping(false)}>
                            <XCircle className="h-4 w-4 mr-1" /> Close
                          </Button>
                        </div>
                        <PdfFieldSelector
                          pdfUrl={selectedInvoice.pdfUrl || (selectedInvoice.attachmentId ? `/api/vendor-invoices/${selectedInvoice.id}/pdf` : null)}
                          rawText={selectedInvoice.rawText}
                          vendorId={selectedInvoice.vendorId}
                          invoiceId={selectedInvoice.id}
                          onFieldsSelected={(fields) => {
                            toast({ title: 'Fields Mapped', description: `${fields.length} field(s) have been mapped and saved as a template.` });
                            setShowTemplateMapping(false);
                            queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices', selectedInvoice.id] });
                            queryClient.invalidateQueries({ queryKey: ['/api/vendor-invoices/parsing-templates', vendorId] });
                          }}
                        />
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="rawtext" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        Interactive Text Extraction
                      </h4>
                      <div className="flex gap-2">
                        {selectedInvoice.rawText && (
                          <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(selectedInvoice.rawText || '');
                            toast({ title: 'Copied', description: 'Raw text copied to clipboard' });
                          }}>
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800">
                      <MousePointer2 className="h-3 w-3 inline mr-1" />
                      Highlight text below and tag it as a field type to extract data from the document.
                    </div>

                    {textFieldTags.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium">Tagged Fields ({textFieldTags.length})</h5>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setTextFieldTags([])}>
                              Clear Tags
                            </Button>
                            <Button size="sm" onClick={applyTaggedFieldsToInvoice} disabled={updateInvoiceMutation.isPending}>
                              {updateInvoiceMutation.isPending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Applying...</> : 'Apply to Document'}
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {textFieldTags.map(tag => {
                            const tagType = FIELD_TAG_TYPES.find(t => t.value === tag.fieldType);
                            return (
                              <Badge key={tag.id} variant="secondary" className={`${tagType?.color} py-1 px-2`}>
                                {tagType?.label}: <span className="font-normal ml-1">"{tag.text.substring(0, 30)}{tag.text.length > 30 ? '...' : ''}"</span>
                                <button onClick={() => setTextFieldTags(prev => prev.filter(t => t.id !== tag.id))} className="ml-2 hover:text-destructive">
                                  <XCircle className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(stagedLineItem.description || stagedLineItem.quantity || stagedLineItem.unitPrice || stagedLineItem.totalPrice) && (
                      <div className="p-3 border rounded-lg bg-teal-50/50 space-y-2">
                        <h5 className="text-sm font-medium flex items-center gap-2 text-teal-800">
                          <ShoppingCart className="h-3 w-3" />
                          Building Line Item
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Description:</span>
                            <p className="font-medium">{stagedLineItem.description || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <p className="font-medium">{stagedLineItem.quantity || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Unit Price:</span>
                            <p className="font-medium">{stagedLineItem.unitPrice || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium">{stagedLineItem.totalPrice || '-'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => setStagedLineItem({})}
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs"
                            disabled={!stagedLineItem.description || addLineItemMutation.isPending}
                            onClick={() => {
                              if (selectedInvoice && stagedLineItem.description) {
                                addLineItemMutation.mutate({
                                  invoiceId: selectedInvoice.id,
                                  item: {
                                    description: stagedLineItem.description,
                                    quantity: stagedLineItem.quantity || '1',
                                    unitPrice: stagedLineItem.unitPrice || '',
                                    totalPrice: stagedLineItem.totalPrice || '',
                                  },
                                });
                                setTaggedLineItems(prev => [...prev, {
                                  description: stagedLineItem.description!,
                                  quantity: stagedLineItem.quantity || '1',
                                  unitPrice: stagedLineItem.unitPrice || '',
                                  totalPrice: stagedLineItem.totalPrice || '',
                                }]);
                                setStagedLineItem({});
                                setTextFieldTags(prev => prev.filter(t => !t.fieldType.startsWith('line_item_')));
                              }
                            }}
                          >
                            {addLineItemMutation.isPending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Adding...</> : 'Add Line Item'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {taggedLineItems.length > 0 && (
                      <div className="p-3 border rounded-lg bg-teal-50/30 space-y-2">
                        <h5 className="text-sm font-medium">Tagged Line Items ({taggedLineItems.length})</h5>
                        {taggedLineItems.map((item, idx) => (
                          <div key={idx} className="text-xs border-b pb-1 last:border-0">
                            <span className="font-medium">{item.description}</span>
                            <span className="text-muted-foreground ml-2">Qty: {item.quantity} | {item.totalPrice}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedInvoice.rawText ? (
                      <div className="relative" ref={rawTextRef}>
                        {showFieldPopover && currentSelection && (
                          <div
                            className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-2 flex flex-wrap gap-1"
                            style={{
                              left: `${Math.max(0, popoverPosition.x - 100)}px`,
                              top: `${Math.max(0, popoverPosition.y - 40)}px`,
                              transform: 'translateY(-100%)',
                            }}
                          >
                            <span className="text-xs text-muted-foreground w-full mb-1">Tag as:</span>
                            {FIELD_TAG_TYPES.map(type => (
                              <Button
                                key={type.value}
                                variant="outline"
                                size="sm"
                                className={`text-xs h-7 ${type.color}`}
                                onClick={() => applyFieldTag(type.value)}
                              >
                                {type.label}
                              </Button>
                            ))}
                          </div>
                        )}
                        <ScrollArea className="h-64 w-full rounded-md border bg-muted/30 p-3">
                          <pre
                            className="text-xs whitespace-pre-wrap font-mono select-text cursor-text"
                            onMouseUp={handleTextSelection}
                          >
                            {renderHighlightedText(selectedInvoice.rawText)}
                          </pre>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                        <FileCode className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No text has been extracted yet.</p>
                        <p className="text-xs mt-1">Use the Analyze & Map tab to extract text from the document.</p>
                      </div>
                    )}

                    {selectedInvoice.parseErrors && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                          <XCircle className="h-4 w-4" /> Parsing Errors
                        </p>
                        <p className="text-xs text-red-700 mt-1">{selectedInvoice.parseErrors}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

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
