import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated, requirePermission } from "../auth";
import { insertInvoiceSchema, insertInvoiceItemSchema, insertInvoicePaymentSchema, clients } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import Stripe from 'stripe';
import { sendGmailMessage, UserTokens } from "../services/gmail-client";
import { db } from "../db";

const router = Router();

async function deductInventoryForItems(items: any[], sourceType: 'invoice' | 'estimate', sourceId: number, userId: number) {
  for (const item of items) {
    if (item.inventoryItemId) {
      const inventoryItem = await storage.getInventoryItem(item.inventoryItemId);
      if (inventoryItem) {
        const currentQty = parseFloat(inventoryItem.quantity || "0");
        const deductQty = parseFloat(item.quantity) || 1;
        const newQty = Math.max(0, currentQty - deductQty);
        
        await storage.updateInventoryItem(item.inventoryItemId, {
          quantity: newQty.toString(),
          updatedAt: new Date(),
        });
        
        const adjustmentData: any = {
          adjustmentDate: new Date(),
          locationType: 'global',
          locationId: 0,
          inventoryItemId: item.inventoryItemId,
          previousQuantity: Math.round(currentQty),
          newQuantity: Math.round(newQty),
          reason: `${sourceType === 'invoice' ? 'Invoice' : 'Estimate'} #${sourceId} - ${item.description || 'Line item'}`,
          performedByUserId: userId,
        };
        
        if (sourceType === 'invoice') {
          adjustmentData.invoiceId = sourceId;
        } else {
          adjustmentData.estimateId = sourceId;
        }
        
        await storage.createInventoryAdjustment(adjustmentData);
      }
    }
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

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

router.get("/next-number", isAuthenticated, requirePermission('invoices', 'view'), async (req, res) => {
  try {
    const user = req.user as any;
    const nextNumber = await storage.getNextInvoiceNumber(user.organizationId);
    res.json({ invoiceNumber: nextNumber });
  } catch (error) {
    console.error("Error getting next invoice number:", error);
    res.status(500).json({ error: "Failed to get next invoice number" });
  }
});

router.get("/", isAuthenticated, requirePermission('invoices', 'view'), async (req, res) => {
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
    
    if (user.role === 'client') {
      invoices = invoices.filter((inv: any) => inv.clientId === user.id);
    }
    
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.post("/webhook", async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event: Stripe.Event;
  
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      console.log('No invoice ID in session metadata');
      return res.json({ received: true });
    }
    
    const invoice = await storage.getInvoice(parseInt(invoiceId));
    if (!invoice) {
      console.error(`Invoice ${invoiceId} not found`);
      return res.json({ received: true });
    }
    
    const paymentData = {
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      amount: session.amount_total || invoice.amountDue,
      paymentMethod: 'stripe',
      paymentDate: new Date().toISOString().split('T')[0],
      stripePaymentId: session.payment_intent as string || session.id,
      stripeChargeId: session.id,
      notes: 'Paid via Stripe Checkout',
      recordedBy: null,
    };
    
    await storage.createInvoicePayment(paymentData);
    
    const newAmountPaid = (invoice.amountPaid || 0) + (session.amount_total || invoice.amountDue);
    const newAmountDue = invoice.total - newAmountPaid;
    const newStatus = newAmountDue <= 0 ? 'paid' : 'partial';
    
    await storage.updateInvoice(invoice.id, {
      amountPaid: newAmountPaid,
      amountDue: Math.max(0, newAmountDue),
      status: newStatus,
      paidDate: newAmountDue <= 0 ? new Date().toISOString().split('T')[0] : undefined,
    });
    
    console.log(`Invoice ${invoiceId} payment recorded via Stripe webhook`);
  }
  
  res.json({ received: true });
});

router.get("/:id", isAuthenticated, requirePermission('invoices', 'view'), async (req, res) => {
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
    if (user.role === 'client' && invoice.clientId !== user.id) {
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

router.post("/", isAuthenticated, requirePermission('invoices', 'create'), async (req, res) => {
  try {
    const user = req.user as any;
    const { items: itemsData, ...invoiceData } = req.body;
    
    if (!invoiceData.clientId || invoiceData.clientId === 0) {
      return res.status(400).json({ error: "Client is required" });
    }
    if (!invoiceData.issueDate) {
      return res.status(400).json({ error: "Issue date is required" });
    }
    if (!invoiceData.dueDate) {
      return res.status(400).json({ error: "Due date is required" });
    }

    const safeInvoiceData = {
      ...invoiceData,
      issueDate: typeof invoiceData.issueDate === 'string' ? invoiceData.issueDate : new Date(invoiceData.issueDate).toISOString().split('T')[0],
      dueDate: typeof invoiceData.dueDate === 'string' ? invoiceData.dueDate : new Date(invoiceData.dueDate).toISOString().split('T')[0],
    };

    const totals = calculateInvoiceTotals(
      itemsData || [],
      safeInvoiceData.taxRate || "0",
      safeInvoiceData.discountPercent,
      safeInvoiceData.discountAmount || 0
    );
    
    const invoiceNumber = safeInvoiceData.invoiceNumber || await storage.getNextInvoiceNumber(user.organizationId);
    
    let parsedInvoice;
    try {
      parsedInvoice = insertInvoiceSchema.parse({
        ...safeInvoiceData,
        organizationId: user.organizationId,
        invoiceNumber,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        total: totals.total,
        amountDue: totals.total,
        amountPaid: 0,
        amount: totals.total,
        description: safeInvoiceData.description || `Invoice ${invoiceNumber}`,
        createdBy: user.id,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error("Invoice schema validation error:", JSON.stringify(validationError.errors));
        return res.status(400).json({ error: "Invalid invoice data", details: validationError.errors });
      }
      throw validationError;
    }
    
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
      console.error("Invoice validation error:", JSON.stringify(error.errors));
      return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
    }
    console.error("Error creating invoice:", error instanceof Error ? error.message : error);
    console.error("Error stack:", error instanceof Error ? error.stack : '');
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.patch("/:id", isAuthenticated, requirePermission('invoices', 'edit'), async (req, res) => {
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

    if (existingInvoice.status === 'draft' && req.body.status && req.body.status !== 'draft') {
      const items = await storage.getInvoiceItems(id);
      await deductInventoryForItems(items, 'invoice', id, user.id);
    }

    const items = await storage.getInvoiceItems(id);
    const payments = await storage.getInvoicePayments(id);
    
    res.json({ ...invoice, items, payments });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.delete("/:id", isAuthenticated, requirePermission('invoices', 'delete'), async (req, res) => {
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

router.post("/:id/items", isAuthenticated, requirePermission('invoices', 'create'), async (req, res) => {
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

router.delete("/:id/items/:itemId", isAuthenticated, requirePermission('invoices', 'delete'), async (req, res) => {
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

router.post("/:id/payments", isAuthenticated, requirePermission('invoices', 'create'), async (req, res) => {
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

router.delete("/:id/payments/:paymentId", isAuthenticated, requirePermission('invoices', 'delete'), async (req, res) => {
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
      newStatus = invoice.sentDate ? 'sent' : 'draft';
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

router.post("/:id/send", isAuthenticated, requirePermission('invoices', 'create'), async (req, res) => {
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

    const items = await storage.getInvoiceItems(invoiceId);
    const clientRecord = await db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1);
    const client = clientRecord.length > 0 ? await storage.getUser(clientRecord[0].userId) : null;
    const overrideEmail = req.body?.clientEmail;
    const overrideName = req.body?.clientName;
    const recipientEmail = overrideEmail || client?.email;
    const recipientName = overrideName || client?.name || 'Valued Customer';
    console.log(`[Invoice Send] Client lookup: clientId=${invoice.clientId}, clientRecord userId=${clientRecord[0]?.userId}, user email=${client?.email}, override email=${overrideEmail}`);

    let emailSent = false;
    let emailWarning: string | undefined;

    if (!user.gmailAccessToken) {
      emailWarning = "Gmail is not connected. Invoice status updated but email was not sent.";
    } else if (!recipientEmail) {
      emailWarning = "Client does not have an email address on file. Invoice status updated but email was not sent.";
    } else {
      try {
        const userTokens: UserTokens = {
          userId: user.id,
          gmailAccessToken: user.gmailAccessToken,
          gmailRefreshToken: user.gmailRefreshToken,
          gmailTokenExpiresAt: user.gmailTokenExpiresAt,
          gmailConnectedEmail: user.gmailConnectedEmail,
        };

        const formatCents = (cents: number | null | undefined) => {
          const val = (cents || 0) / 100;
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        };

        const itemRows = items.map(item => {
          const qty = parseFloat(item.quantity) || 1;
          return `<tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCents(item.unitPrice)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCents(item.amount)}</td>
          </tr>`;
        }).join('');

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937;">
          <div style="background-color: #2563eb; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Invoice ${invoice.invoiceNumber}</h1>
            <p style="color: #dbeafe; margin: 4px 0 0 0; font-size: 14px;">From ${user.name || 'Your Service Provider'}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
            <p style="margin: 0 0 4px 0; font-size: 15px;">Hello ${recipientName},</p>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">Please find your invoice details below.</p>
            <table style="width: 100%; margin-bottom: 16px; font-size: 14px;">
              <tr><td style="color: #6b7280; padding: 2px 0;">Invoice Number:</td><td style="font-weight: 600;">${invoice.invoiceNumber}</td></tr>
              <tr><td style="color: #6b7280; padding: 2px 0;">Issue Date:</td><td>${invoice.issueDate}</td></tr>
              <tr><td style="color: #6b7280; padding: 2px 0;">Due Date:</td><td style="font-weight: 600; color: #dc2626;">${invoice.dueDate}</td></tr>
            </table>
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 10px 12px; text-align: left; font-weight: 600;">Description</th>
                  <th style="padding: 10px 12px; text-align: center; font-weight: 600;">Qty</th>
                  <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Unit Price</th>
                  <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e5e7eb;">
              <table style="width: 100%; font-size: 14px;">
                <tr><td style="padding: 4px 0; color: #6b7280;">Subtotal</td><td style="text-align: right; padding: 4px 0;">${formatCents(invoice.subtotal)}</td></tr>
                ${(invoice.discountAmount && invoice.discountAmount > 0) ? `<tr><td style="padding: 4px 0; color: #6b7280;">Discount${invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ''}</td><td style="text-align: right; padding: 4px 0; color: #dc2626;">-${formatCents(invoice.discountAmount)}</td></tr>` : ''}
                ${(invoice.taxAmount && invoice.taxAmount > 0) ? `<tr><td style="padding: 4px 0; color: #6b7280;">Tax${invoice.taxRate ? ` (${invoice.taxRate}%)` : ''}</td><td style="text-align: right; padding: 4px 0;">${formatCents(invoice.taxAmount)}</td></tr>` : ''}
                <tr style="font-size: 18px; font-weight: 700;"><td style="padding: 12px 0; border-top: 2px solid #1f2937;">Total Due</td><td style="text-align: right; padding: 12px 0; border-top: 2px solid #1f2937;">${formatCents(invoice.total)}</td></tr>
              </table>
            </div>
            ${invoice.notes ? `<div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 6px; font-size: 14px;"><strong>Notes:</strong><br/>${invoice.notes}</div>` : ''}
            <p style="margin-top: 32px; font-size: 13px; color: #9ca3af;">If you have any questions about this invoice, please don't hesitate to reach out.</p>
          </div>
        </div>`;

        const subject = `Invoice ${invoice.invoiceNumber} - ${formatCents(invoice.total)} due ${invoice.dueDate}`;
        console.log(`[Invoice Send] Attempting to send invoice ${invoice.invoiceNumber} to ${recipientEmail} via Gmail`);
        console.log(`[Invoice Send] User tokens present: access=${!!userTokens.gmailAccessToken}, refresh=${!!userTokens.gmailRefreshToken}, email=${userTokens.gmailConnectedEmail}`);
        const result = await sendGmailMessage(recipientEmail, subject, htmlBody, true, userTokens);
        emailSent = result !== null;
        console.log(`[Invoice Send] Email result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
        if (!emailSent) {
          emailWarning = "Failed to send email via Gmail. Invoice status updated but email delivery failed.";
        }
      } catch (emailError) {
        console.error("Error sending invoice email:", emailError);
        emailWarning = "Failed to send email via Gmail. Invoice status updated but email delivery failed.";
      }
    }

    const updatedInvoice = await storage.updateInvoice(invoiceId, {
      status: 'sent',
      sentDate: new Date().toISOString().split('T')[0],
      emailSent: emailSent,
    });
    
    res.json({ ...updatedInvoice, emailSent, emailWarning });
  } catch (error) {
    console.error("Error sending invoice:", error);
    res.status(500).json({ error: "Failed to send invoice" });
  }
});

router.post("/:id/create-payment-link", isAuthenticated, requirePermission('invoices', 'create'), async (req, res) => {
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
    if (invoice.amountDue <= 0) {
      return res.status(400).json({ error: "Invoice has no balance due" });
    }
    
    const items = await storage.getInvoiceItems(id);
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice ${invoice.invoiceNumber}`,
            description: items.map((i: any) => i.description).join(', ').substring(0, 500),
          },
          unit_amount: invoice.amountDue,
        },
        quantity: 1,
      }],
      success_url: `${req.protocol}://${req.get('host')}/invoices/${id}?payment=success`,
      cancel_url: `${req.protocol}://${req.get('host')}/invoices/${id}?payment=cancelled`,
      metadata: {
        invoiceId: id.toString(),
        organizationId: user.organizationId.toString(),
      },
    });
    
    await storage.updateInvoice(id, {
      stripePaymentIntentId: session.payment_intent as string || session.id,
      stripeCheckoutUrl: session.url,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating payment link:", error);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

export default router;
