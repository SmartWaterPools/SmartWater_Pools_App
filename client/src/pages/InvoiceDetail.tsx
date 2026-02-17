import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  DollarSign,
  Calendar,
  CreditCard,
  Check,
  ArrowLeft,
  Loader2,
  Mail,
} from "lucide-react";
import type { Invoice, InvoiceItem, InvoicePayment } from "@shared/schema";

type InvoiceWithDetails = Invoice & {
  items: InvoiceItem[];
  payments: InvoicePayment[];
};

type Client = {
  id: number;
  userId: number;
  user?: { name: string; email: string; phone?: string };
};

const statusColors: Record<string, { className: string }> = {
  draft: { className: "bg-gray-100 text-gray-700" },
  sent: { className: "bg-blue-100 text-blue-700" },
  viewed: { className: "bg-purple-100 text-purple-700" },
  partial: { className: "bg-yellow-100 text-yellow-700" },
  paid: { className: "bg-green-100 text-green-700" },
  overdue: { className: "bg-red-100 text-red-700" },
  cancelled: { className: "bg-gray-100 text-gray-500 line-through" },
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

export default function InvoiceDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const invoiceId = parseInt(params.id);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    referenceNumber: "",
    notes: "",
  });

  const { data: invoice, isLoading: invoiceLoading } = useQuery<InvoiceWithDetails>({
    queryKey: ["/api/invoices", invoiceId],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const client = clients.find((c) => c.id === invoice?.clientId);

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      paymentMethod: string;
      paymentDate: string;
      referenceNumber?: string;
      notes?: string;
    }) => {
      return apiRequest("POST", `/api/invoices/${invoiceId}/payments`, data);
    },
    onSuccess: () => {
      toast({ title: "Payment recorded", description: "The payment has been recorded successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setPaymentDialogOpen(false);
      resetPaymentForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest("DELETE", `/api/invoices/${invoiceId}/payments/${paymentId}`);
    },
    onSuccess: () => {
      toast({ title: "Payment deleted", description: "The payment has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDeletePaymentId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      toast({ title: "Invoice deleted", description: "The invoice has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setLocation("/invoices");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/send`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId] });
      if (data.emailSent) {
        toast({ title: "Invoice sent", description: "Invoice was emailed to the client successfully." });
      } else if (data.emailWarning) {
        toast({ title: "Invoice saved as sent", description: data.emailWarning, variant: "destructive" });
      } else {
        toast({ title: "Invoice marked as sent", description: "Status updated but email may not have been delivered." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/create-payment-link`);
      return response.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const searchString = useSearch();
  
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const payment = params.get('payment');
    if (payment === 'success') {
      toast({ title: "Payment Successful", description: "Thank you! Your payment has been processed." });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      setLocation(`/invoices/${invoiceId}`, { replace: true });
    } else if (payment === 'cancelled') {
      toast({ title: "Payment Cancelled", description: "The payment was cancelled." });
      setLocation(`/invoices/${invoiceId}`, { replace: true });
    }
  }, [searchString, invoiceId, toast, queryClient, setLocation]);

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: invoice ? ((invoice.amountDue || 0) / 100).toFixed(2) : "",
      paymentMethod: "bank_transfer",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      referenceNumber: "",
      notes: "",
    });
  };

  const handleOpenPaymentDialog = () => {
    if (invoice) {
      setPaymentForm((prev) => ({
        ...prev,
        amount: ((invoice.amountDue || 0) / 100).toFixed(2),
      }));
    }
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = () => {
    const amountInCents = Math.round(parseFloat(paymentForm.amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid payment amount.", variant: "destructive" });
      return;
    }
    recordPaymentMutation.mutate({
      amount: amountInCents,
      paymentMethod: paymentForm.paymentMethod,
      paymentDate: paymentForm.paymentDate,
      referenceNumber: paymentForm.referenceNumber || undefined,
      notes: paymentForm.notes || undefined,
    });
  };

  if (invoiceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Invoice not found</h3>
            <p className="text-muted-foreground mt-2">The invoice you're looking for doesn't exist.</p>
            <Button className="mt-4" onClick={() => setLocation("/invoices")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusStyle = statusColors[invoice.status || "draft"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <Badge className={statusStyle.className}>{invoice.status?.toUpperCase()}</Badge>
            {invoice.emailSent && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Mail className="h-3.5 w-3.5 mr-1" />
                Emailed
              </Badge>
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
          <Button variant="outline" size="sm" onClick={() => setLocation(`/invoices/${invoiceId}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {invoice.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendInvoiceMutation.mutate()}
              disabled={sendInvoiceMutation.isPending}
            >
              {sendInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          )}
          {(invoice.amountDue || 0) > 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button
              size="sm"
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => createPaymentLinkMutation.mutate()}
              disabled={createPaymentLinkMutation.isPending}
            >
              {createPaymentLinkMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pay Online
            </Button>
          )}
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleOpenPaymentDialog}>
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-9"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, paymentMethod: value }))}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Date</label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference Number (optional)</label>
                  <Input
                    placeholder="Check number, transaction ID, etc."
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input
                    placeholder="Additional notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isPending}>
                  {recordPaymentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Record Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            <p className="font-medium">{format(new Date(invoice.issueDate), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Due Date</span>
            </div>
            <p className="font-medium">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">Payment Terms</span>
            </div>
            <p className="font-medium">{invoice.paymentTerms || "Net 30"}</p>
          </CardContent>
        </Card>
        {invoice.status === "paid" && invoice.paidDate && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Check className="h-4 w-4" />
                <span className="text-sm">Paid Date</span>
              </div>
              <p className="font-medium">{format(new Date(invoice.paidDate), "MMM d, yyyy")}</p>
            </CardContent>
          </Card>
        )}
      </div>

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
              {(invoice.items || []).map((item) => (
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
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount && invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount{invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ""}
                </span>
                <span className="text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            {invoice.taxAmount && invoice.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax{invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}
                </span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.amountPaid && invoice.amountPaid > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Amount Paid</span>
                <span>{formatCurrency(invoice.amountPaid)}</span>
              </div>
            )}
            {(invoice.amountDue || 0) > 0 && (
              <div className="flex justify-between font-bold">
                <span>Amount Due</span>
                <span>{formatCurrency(invoice.amountDue)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payments</CardTitle>
          <Button size="sm" variant="outline" onClick={handleOpenPaymentDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </CardHeader>
        <CardContent>
          {(!invoice.payments || invoice.payments.length === 0) ? (
            <p className="text-muted-foreground text-center py-4">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.payments || []).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.paymentDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="capitalize">{payment.paymentMethod.replace("_", " ")}</TableCell>
                    <TableCell>{payment.referenceNumber || payment.checkNumber || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletePaymentId(payment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(invoice.notes || invoice.terms) && (
        <Card>
          <CardHeader>
            <CardTitle>Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.notes && (
              <div>
                <h4 className="font-medium mb-1">Notes</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h4 className="font-medium mb-1">Terms</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteInvoiceMutation.mutate()}
            >
              {deleteInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletePaymentId !== null} onOpenChange={(open) => !open && setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePaymentId && deletePaymentMutation.mutate(deletePaymentId)}
            >
              {deletePaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
