import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertInvoiceSchema, insertInvoiceItemSchema, insertInvoicePaymentSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

function calculateInvoiceTotals(items: { quantity: string; unitPrice: number }[], taxRate: string = "0", discountPercent: string | null = null, discountAmount: number = 0) {
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 1;
    return sum + (qty * item.unitPrice);
  }, 0);
  
  let discount = discountAmount;
  if (discountPercent) {
    discount = Math.round(subtotal * (parseFloat(discountPercent) / 100));
  }
  
  const afterDiscount = subtotal - discount;
  const taxAmount = Math.round(afterDiscount * (parseFloat(taxRate) / 100));
  const total = afterDiscount + taxAmount;
  
  return { subtotal, taxAmount, total, discountAmount: discount };
}

router.get("/next-number", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const nextNumber = await storage.getNextInvoiceNumber(user.organizationId);
    res.json({ invoiceNumber: nextNumber });
  } catch (error) {
    console.error("Error getting next invoice number:", error);
    res.status(500).json({ error: "Failed to get next invoice number" });
  }
});

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { status, clientId } = req.query;
    
    let invoices;
    if (status) {
      invoices = await storage.getInvoicesByStatus(status as string, user.organizationId);
    } else if (clientId) {
      invoices = await storage.getInvoicesByClient(parseInt(clientId as string));
      invoices = invoices.filter(inv => inv.organizationId === user.organizationId);
    } else {
      invoices = await storage.getInvoices(user.organizationId);
    }
    
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const invoice = await storage.getInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const items = await storage.getInvoiceItems(id);
    const payments = await storage.getInvoicePayments(id);
    
    res.json({ ...invoice, items, payments });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { items: itemsData, ...invoiceData } = req.body;
    
    const totals = calculateInvoiceTotals(
      itemsData || [],
      invoiceData.taxRate || "0",
      invoiceData.discountPercent,
      invoiceData.discountAmount || 0
    );
    
    const invoiceNumber = invoiceData.invoiceNumber || await storage.getNextInvoiceNumber(user.organizationId);
    
    const parsedInvoice = insertInvoiceSchema.parse({
      ...invoiceData,
      organizationId: user.organizationId,
      invoiceNumber,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      amountDue: totals.total,
      amountPaid: 0,
      createdBy: user.id,
    });
    
    const invoice = await storage.createInvoice(parsedInvoice);
    
    if (itemsData && Array.isArray(itemsData)) {
      for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i];
        const qty = parseFloat(item.quantity) || 1;
        const amount = qty * item.unitPrice;
        
        const parsedItem = insertInvoiceItemSchema.parse({
          ...item,
          invoiceId: invoice.id,
          amount,
          sortOrder: i,
        });
        await storage.createInvoiceItem(parsedItem);
      }
    }
    
    const items = await storage.getInvoiceItems(invoice.id);
    res.status(201).json({ ...invoice, items, payments: [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
    }
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingInvoice = await storage.getInvoice(id);
    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (existingInvoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { items: itemsData, ...updateData } = req.body;
    
    if (itemsData && Array.isArray(itemsData)) {
      await storage.deleteInvoiceItemsByInvoice(id);
      
      for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i];
        const qty = parseFloat(item.quantity) || 1;
        const amount = qty * item.unitPrice;
        
        const parsedItem = insertInvoiceItemSchema.parse({
          ...item,
          invoiceId: id,
          amount,
          sortOrder: i,
        });
        await storage.createInvoiceItem(parsedItem);
      }
      
      const totals = calculateInvoiceTotals(
        itemsData,
        updateData.taxRate || existingInvoice.taxRate || "0",
        updateData.discountPercent || existingInvoice.discountPercent,
        updateData.discountAmount || existingInvoice.discountAmount || 0
      );
      
      updateData.subtotal = totals.subtotal;
      updateData.taxAmount = totals.taxAmount;
      updateData.discountAmount = totals.discountAmount;
      updateData.total = totals.total;
      updateData.amountDue = totals.total - (existingInvoice.amountPaid || 0);
    }
    
    const invoice = await storage.updateInvoice(id, updateData);
    const items = await storage.getInvoiceItems(id);
    const payments = await storage.getInvoicePayments(id);
    
    res.json({ ...invoice, items, payments });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingInvoice = await storage.getInvoice(id);
    if (!existingInvoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (existingInvoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteInvoiceItemsByInvoice(id);
    const payments = await storage.getInvoicePayments(id);
    for (const payment of payments) {
      await storage.deleteInvoicePayment(payment.id);
    }
    
    await storage.deleteInvoice(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

router.post("/:id/items", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const invoiceId = parseInt(req.params.id);
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const existingItems = await storage.getInvoiceItems(invoiceId);
    const qty = parseFloat(req.body.quantity) || 1;
    const amount = qty * req.body.unitPrice;
    
    const parsedItem = insertInvoiceItemSchema.parse({
      ...req.body,
      invoiceId,
      amount,
      sortOrder: existingItems.length,
    });
    
    const item = await storage.createInvoiceItem(parsedItem);
    
    const allItems = await storage.getInvoiceItems(invoiceId);
    const totals = calculateInvoiceTotals(
      allItems.map(i => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      invoice.taxRate || "0",
      invoice.discountPercent,
      invoice.discountAmount || 0
    );
    
    await storage.updateInvoice(invoiceId, {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      amountDue: totals.total - (invoice.amountPaid || 0),
    });
    
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid item data", details: error.errors });
    }
    console.error("Error adding invoice item:", error);
    res.status(500).json({ error: "Failed to add invoice item" });
  }
});

router.delete("/:id/items/:itemId", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const invoiceId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteInvoiceItem(itemId);
    
    const allItems = await storage.getInvoiceItems(invoiceId);
    const totals = calculateInvoiceTotals(
      allItems.map(i => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
      invoice.taxRate || "0",
      invoice.discountPercent,
      invoice.discountAmount || 0
    );
    
    await storage.updateInvoice(invoiceId, {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      amountDue: totals.total - (invoice.amountPaid || 0),
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing invoice item:", error);
    res.status(500).json({ error: "Failed to remove invoice item" });
  }
});

router.post("/:id/payments", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const invoiceId = parseInt(req.params.id);
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const parsedPayment = insertInvoicePaymentSchema.parse({
      ...req.body,
      invoiceId,
      organizationId: user.organizationId,
      recordedBy: user.id,
    });
    
    const payment = await storage.createInvoicePayment(parsedPayment);
    
    const newAmountPaid = (invoice.amountPaid || 0) + payment.amount;
    const newAmountDue = (invoice.total || 0) - newAmountPaid;
    
    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }
    
    await storage.updateInvoice(invoiceId, {
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      status: newStatus,
      paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : invoice.paidDate,
    });
    
    res.status(201).json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid payment data", details: error.errors });
    }
    console.error("Error recording payment:", error);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

router.delete("/:id/payments/:paymentId", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const invoiceId = parseInt(req.params.id);
    const paymentId = parseInt(req.params.paymentId);
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const payments = await storage.getInvoicePayments(invoiceId);
    const paymentToDelete = payments.find(p => p.id === paymentId);
    if (!paymentToDelete) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    await storage.deleteInvoicePayment(paymentId);
    
    const newAmountPaid = (invoice.amountPaid || 0) - paymentToDelete.amount;
    const newAmountDue = (invoice.total || 0) - newAmountPaid;
    
    let newStatus = invoice.status;
    if (newAmountPaid <= 0) {
      newStatus = invoice.sentAt ? 'sent' : 'draft';
    } else if (newAmountDue > 0) {
      newStatus = 'partial';
    }
    
    await storage.updateInvoice(invoiceId, {
      amountPaid: Math.max(0, newAmountPaid),
      amountDue: newAmountDue,
      status: newStatus,
      paidDate: null,
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ error: "Failed to delete payment" });
  }
});

router.post("/:id/send", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const invoiceId = parseInt(req.params.id);
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const updatedInvoice = await storage.updateInvoice(invoiceId, {
      status: 'sent',
      sentAt: new Date(),
    });
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error("Error sending invoice:", error);
    res.status(500).json({ error: "Failed to send invoice" });
  }
});

export default router;
