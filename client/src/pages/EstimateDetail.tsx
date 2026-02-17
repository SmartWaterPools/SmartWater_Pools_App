import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Send,
  Pencil,
  Trash2,
  DollarSign,
  Calendar,
  Check,
  X,
  ArrowLeft,
  Loader2,
  ArrowRightLeft,
  CreditCard,
  Receipt,
  BarChart3,
  Mail,
} from "lucide-react";
import type { Estimate, EstimateItem } from "@shared/schema";

type EstimateWithDetails = Estimate & {
  items: EstimateItem[];
};

type Client = {
  id: number;
  userId: number;
  user?: { name: string; email: string; phone?: string };
};

type BillingSummaryItem = {
  id: number;
  description: string;
  totalQuantity: string;
  billedQuantity: string;
  remainingQuantity: string;
  unitPrice: number;
  totalAmount: number;
  billedAmount: number;
  remainingAmount: number;
};

type BillingSummary = {
  items: BillingSummaryItem[];
  totalEstimateAmount: number;
  totalBilledAmount: number;
  totalRemainingAmount: number;
  linkedInvoiceCount: number;
  isFullyBilled: boolean;
};

type LinkedInvoice = {
  id: number;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  items: any[];
};

const statusColors: Record<string, { className: string }> = {
  draft: { className: "bg-gray-100 text-gray-700" },
  sent: { className: "bg-blue-100 text-blue-700" },
  viewed: { className: "bg-purple-100 text-purple-700" },
  accepted: { className: "bg-green-100 text-green-700" },
  declined: { className: "bg-red-100 text-red-700" },
  expired: { className: "bg-orange-100 text-orange-700" },
  converted: { className: "bg-indigo-100 text-indigo-700" },
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  paid: "bg-green-100 text-green-700",
  partial: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "stripe", label: "Stripe" },
  { value: "other", label: "Other" },
];

function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type SelectedItemState = {
  checked: boolean;
  quantity: string;
};

export default function EstimateDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const estimateId = parseInt(params.id);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState("bank_transfer");
  const [selectedItems, setSelectedItems] = useState<Record<number, SelectedItemState>>({});

  const { data: estimate, isLoading: estimateLoading } = useQuery<EstimateWithDetails>({
    queryKey: ["/api/estimates", estimateId],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: billingSummary } = useQuery<BillingSummary>({
    queryKey: ["/api/estimates", estimateId, "billing-summary"],
    enabled: !!estimate,
  });

  const { data: linkedInvoices = [] } = useQuery<LinkedInvoice[]>({
    queryKey: ["/api/estimates", estimateId, "linked-invoices"],
    enabled: !!estimate,
  });

  const client = clients.find((c) => c.id === estimate?.clientId);

  const initializeSelectedItems = () => {
    if (!billingSummary || !estimate) return;
    const items: Record<number, SelectedItemState> = {};
    billingSummary.items.forEach((item) => {
      const remaining = parseFloat(item.remainingQuantity);
      items[item.id] = {
        checked: remaining > 0,
        quantity: remaining > 0 ? item.remainingQuantity : "0",
      };
    });
    setSelectedItems(items);
  };

  const handleOpenConvertDialog = () => {
    initializeSelectedItems();
    setConvertDialogOpen(true);
  };

  const handleToggleItem = (itemId: number, checked: boolean) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checked,
        quantity: checked ? (prev[itemId]?.quantity || "0") : "0",
      },
    }));
  };

  const handleQuantityChange = (itemId: number, quantity: string) => {
    if (!billingSummary) return;
    const item = billingSummary.items.find((i) => i.id === itemId);
    if (!item) return;
    
    const remaining = parseFloat(item.remainingQuantity);
    const qtyNum = parseFloat(quantity) || 0;
    
    let clampedQuantity = quantity;
    if (qtyNum > remaining) {
      clampedQuantity = item.remainingQuantity;
    } else if (qtyNum < 0) {
      clampedQuantity = "0";
    }
    
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: clampedQuantity,
      },
    }));
  };

  const conversionTotal = useMemo(() => {
    if (!billingSummary) return 0;
    let total = 0;
    billingSummary.items.forEach((item) => {
      const sel = selectedItems[item.id];
      if (sel?.checked) {
        const qty = parseFloat(sel.quantity) || 0;
        total += qty * item.unitPrice;
      }
    });
    return total;
  }, [selectedItems, billingSummary]);

  const hasSelectedItems = useMemo(() => {
    return Object.values(selectedItems).some(
      (s) => s.checked && parseFloat(s.quantity) > 0
    );
  }, [selectedItems]);

  const sendEstimateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/estimates/${estimateId}/send`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/estimates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/estimates', estimateId] });
      if (data.emailSent) {
        toast({ title: "Estimate sent", description: "Estimate was emailed to the client successfully." });
      } else if (data.emailWarning) {
        toast({ title: "Estimate saved as sent", description: data.emailWarning, variant: "destructive" });
      } else {
        toast({ title: "Estimate marked as sent", description: "Status updated but email may not have been delivered." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acceptEstimateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/estimates/${estimateId}/accept`);
    },
    onSuccess: () => {
      toast({ title: "Estimate accepted", description: "The estimate has been accepted." });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const declineEstimateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/estimates/${estimateId}/decline`);
    },
    onSuccess: () => {
      toast({ title: "Estimate declined", description: "The estimate has been declined." });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async (items: { estimateItemId: number; quantity: number }[]) => {
      return apiRequest("POST", `/api/estimates/${estimateId}/convert-to-invoice`, {
        selectedItems: items,
      });
    },
    onSuccess: () => {
      toast({ title: "Invoice created", description: "A new invoice has been created from the selected items." });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "linked-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId, "billing-summary"] });
      setConvertDialogOpen(false);
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Failed to convert estimate to invoice";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const recordDepositMutation = useMutation({
    mutationFn: async (paymentMethod: string) => {
      return apiRequest("POST", `/api/estimates/${estimateId}/deposit`, { paymentMethod });
    },
    onSuccess: () => {
      toast({ title: "Deposit recorded", description: "The deposit has been recorded successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", estimateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      setDepositDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteEstimateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/estimates/${estimateId}`);
    },
    onSuccess: () => {
      toast({ title: "Estimate deleted", description: "The estimate has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      setLocation("/estimates");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleConvert = () => {
    const items = Object.entries(selectedItems)
      .filter(([, s]) => s.checked && parseFloat(s.quantity) > 0)
      .map(([id, s]) => ({
        estimateItemId: parseInt(id),
        quantity: parseFloat(s.quantity),
      }));
    if (items.length === 0) return;
    convertToInvoiceMutation.mutate(items);
  };

  if (estimateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Estimate not found</h3>
            <p className="text-muted-foreground mt-2">The estimate you're looking for doesn't exist.</p>
            <Button className="mt-4" onClick={() => setLocation("/estimates")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Estimates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusStyle = statusColors[estimate.status || "draft"];
  const isFullyBilled = billingSummary?.isFullyBilled ?? false;
  const canConvert = ["accepted", "sent", "viewed"].includes(estimate.status || "");
  const billedPercentage = billingSummary && billingSummary.totalEstimateAmount > 0
    ? Math.round((billingSummary.totalBilledAmount / billingSummary.totalEstimateAmount) * 100)
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/estimates")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{estimate.estimateNumber}</h1>
            <Badge className={statusStyle.className}>{estimate.status?.toUpperCase()}</Badge>
            {estimate.emailSent && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Mail className="h-3.5 w-3.5 mr-1" />
                Emailed
              </Badge>
            )}
            {isFullyBilled && (
              <Badge className="bg-emerald-100 text-emerald-700">FULLY BILLED</Badge>
            )}
          </div>
          {client && (
            <div className="mt-2 text-muted-foreground">
              <p className="font-medium text-foreground">{client.user?.name}</p>
              {client.user?.email && <p>{client.user.email}</p>}
              {client.user?.phone && <p>{client.user.phone}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation(`/estimates/${estimateId}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {estimate.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendEstimateMutation.mutate()}
              disabled={sendEstimateMutation.isPending}
            >
              {sendEstimateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          )}
          {['sent', 'viewed'].includes(estimate.status || '') && (
            <>
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => acceptEstimateMutation.mutate()}
                disabled={acceptEstimateMutation.isPending}
              >
                {acceptEstimateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => declineEstimateMutation.mutate()}
                disabled={declineEstimateMutation.isPending}
              >
                {declineEstimateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Decline
              </Button>
            </>
          )}
          {canConvert && !isFullyBilled && (
            <Button
              size="sm"
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleOpenConvertDialog}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Convert to Invoice
            </Button>
          )}
          {estimate.status === "accepted" && (estimate.depositAmount || 0) > 0 && !estimate.depositPaid && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDepositDialogOpen(true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Record Deposit
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Issue Date</span>
            </div>
            <p className="font-medium">{format(new Date(estimate.issueDate), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Expiry Date</span>
            </div>
            <p className="font-medium">
              {estimate.expiryDate ? format(new Date(estimate.expiryDate), "MMM d, yyyy") : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="font-medium text-lg">{formatCurrency(estimate.total)}</p>
          </CardContent>
        </Card>
        {(estimate.depositAmount || 0) > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Deposit</span>
              </div>
              <p className="font-medium">{formatCurrency(estimate.depositAmount)}</p>
              {estimate.depositPaid && (
                <Badge className="mt-1 bg-green-100 text-green-700">Paid</Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {(estimate.depositAmount || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deposit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Deposit Type</p>
                <p className="font-medium capitalize">{estimate.depositType || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deposit Amount</p>
                <p className="font-medium">{formatCurrency(estimate.depositAmount)}</p>
              </div>
              {estimate.depositPercent && (
                <div>
                  <p className="text-sm text-muted-foreground">Deposit Percentage</p>
                  <p className="font-medium">{estimate.depositPercent}%</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{estimate.depositPaid ? "Paid" : "Unpaid"}</p>
              </div>
              {estimate.depositPaid && estimate.depositPaidDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{format(new Date(estimate.depositPaidDate), "MMM d, yyyy")}</p>
                </div>
              )}
              {estimate.depositPaid && estimate.depositPaymentMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{estimate.depositPaymentMethod.replace("_", " ")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {billingSummary && (billingSummary.linkedInvoiceCount > 0 || billingSummary.totalBilledAmount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Billing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Estimate</p>
                <p className="text-lg font-semibold">{formatCurrency(billingSummary.totalEstimateAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Billed</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(billingSummary.totalBilledAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(billingSummary.totalRemainingAmount)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{billedPercentage}% billed</span>
                <span className="text-muted-foreground">{billingSummary.linkedInvoiceCount} invoice(s)</span>
              </div>
              <Progress value={billedPercentage} className="h-2" />
            </div>
            {billingSummary.items.length > 0 && (
              <>
                <Separator />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Billed Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingSummary.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.totalQuantity}</TableCell>
                        <TableCell className="text-right">{item.billedQuantity}</TableCell>
                        <TableCell className="text-right">{item.remainingQuantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.billedAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(estimate.subtotal)}</span>
            </div>
            {estimate.discountAmount && estimate.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount{estimate.discountPercent ? ` (${estimate.discountPercent}%)` : ""}
                </span>
                <span className="text-red-600">-{formatCurrency(estimate.discountAmount)}</span>
              </div>
            )}
            {estimate.taxAmount && estimate.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax{estimate.taxRate ? ` (${estimate.taxRate}%)` : ""}
                </span>
                <span>{formatCurrency(estimate.taxAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {linkedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Linked Invoices ({linkedInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline font-medium">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={invoiceStatusColors[invoice.status] || "bg-gray-100 text-gray-700"}>
                        {invoice.status?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.issueDate ? format(new Date(invoice.issueDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="flex justify-between font-medium">
              <span>Total Billed</span>
              <span>{formatCurrency(linkedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0))}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {(estimate.notes || estimate.terms) && (
        <Card>
          <CardHeader>
            <CardTitle>Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {estimate.notes && (
              <div>
                <h4 className="font-medium mb-1">Notes</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p>
              </div>
            )}
            {estimate.terms && (
              <div>
                <h4 className="font-medium mb-1">Terms</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{estimate.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete estimate {estimate.estimateNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEstimateMutation.mutate()}
            >
              {deleteEstimateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
            <DialogDescription>
              Select which line items and quantities to include in the new invoice for estimate {estimate.estimateNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {billingSummary?.items.map((item) => {
              const remaining = parseFloat(item.remainingQuantity);
              const sel = selectedItems[item.id];
              const isChecked = sel?.checked ?? false;
              const qty = sel?.quantity ?? "0";
              const qtyNum = parseFloat(qty) || 0;
              const lineTotal = qtyNum * item.unitPrice;
              const exceedsRemaining = qtyNum > remaining;

              return (
                <div key={item.id} className={`border rounded-lg p-4 space-y-2 ${remaining <= 0 ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => handleToggleItem(item.id, checked === true)}
                      disabled={remaining <= 0}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.description}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Total: {item.totalQuantity}</span>
                        <span>Billed: {item.billedQuantity}</span>
                        <span>Remaining: {item.remainingQuantity}</span>
                        <span>@ {formatCurrency(item.unitPrice)}/unit</span>
                      </div>
                    </div>
                  </div>
                  {isChecked && remaining > 0 && (
                    <div className="flex items-center gap-3 ml-7">
                      <label className="text-sm text-muted-foreground whitespace-nowrap">Qty to bill:</label>
                      <Input
                        type="number"
                        min="0.01"
                        max={remaining}
                        step="0.01"
                        value={qty}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className={`w-24 ${exceedsRemaining ? 'border-red-500' : ''}`}
                      />
                      <span className="text-sm text-muted-foreground">= {formatCurrency(lineTotal)}</span>
                      {exceedsRemaining && (
                        <span className="text-xs text-red-600 font-medium">Exceeds remaining</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Selected Items Subtotal</span>
                <span>{formatCurrency(conversionTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground italic">(Tax and discounts will be applied on the invoice)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConvert}
              disabled={convertToInvoiceMutation.isPending || !hasSelectedItems}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {convertToInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="h-4 w-4 mr-2" />
              )}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Deposit Payment</DialogTitle>
            <DialogDescription>
              Record the deposit payment of {formatCurrency(estimate.depositAmount)} for estimate {estimate.estimateNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={depositPaymentMethod}
                onValueChange={setDepositPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => recordDepositMutation.mutate(depositPaymentMethod)}
              disabled={recordDepositMutation.isPending}
            >
              {recordDepositMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Record Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
