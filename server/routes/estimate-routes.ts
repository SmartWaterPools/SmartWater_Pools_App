import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertEstimateSchema, insertEstimateItemSchema, insertInvoiceSchema, insertInvoiceItemSchema, clients } from "@shared/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
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

function calculateEstimateTotals(items: { quantity: string; unitPrice: number }[], taxRate: string = "0", discountPercent: string | null = null, discountAmount: number = 0) {
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
    const nextNumber = await storage.getNextEstimateNumber(user.organizationId);
    res.json({ estimateNumber: nextNumber });
  } catch (error) {
    console.error("Error getting next estimate number:", error);
    res.status(500).json({ error: "Failed to get next estimate number" });
  }
});

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { status, clientId } = req.query;
    
    let estimates;
    if (status) {
      estimates = await storage.getEstimatesByStatus(status as string, user.organizationId);
    } else if (clientId) {
      estimates = await storage.getEstimatesByClient(parseInt(clientId as string));
      estimates = estimates.filter(est => est.organizationId === user.organizationId);
    } else {
      estimates = await storage.getEstimates(user.organizationId);
    }
    
    res.json(estimates);
  } catch (error) {
    console.error("Error fetching estimates:", error);
    res.status(500).json({ error: "Failed to fetch estimates" });
  }
});

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const items = await storage.getEstimateItems(id);
    
    res.json({ ...estimate, items });
  } catch (error) {
    console.error("Error fetching estimate:", error);
    res.status(500).json({ error: "Failed to fetch estimate" });
  }
});

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { items: itemsData, ...estimateData } = req.body;
    
    const totals = calculateEstimateTotals(
      itemsData || [],
      estimateData.taxRate || "0",
      estimateData.discountPercent,
      estimateData.discountAmount || 0
    );
    
    const estimateNumber = estimateData.estimateNumber || await storage.getNextEstimateNumber(user.organizationId);
    
    const parsedEstimate = insertEstimateSchema.parse({
      ...estimateData,
      organizationId: user.organizationId,
      estimateNumber,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      createdBy: user.id,
    });
    
    const estimate = await storage.createEstimate(parsedEstimate);
    
    if (itemsData && Array.isArray(itemsData)) {
      for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i];
        const qty = parseFloat(item.quantity) || 1;
        const amount = qty * item.unitPrice;
        
        const parsedItem = insertEstimateItemSchema.parse({
          ...item,
          estimateId: estimate.id,
          amount,
          sortOrder: i,
        });
        await storage.createEstimateItem(parsedItem);
      }
    }
    
    const items = await storage.getEstimateItems(estimate.id);
    res.status(201).json({ ...estimate, items });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid estimate data", details: error.errors });
    }
    console.error("Error creating estimate:", error);
    res.status(500).json({ error: "Failed to create estimate" });
  }
});

router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingEstimate = await storage.getEstimate(id);
    if (!existingEstimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (existingEstimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { items: itemsData, ...updateData } = req.body;
    
    if (itemsData && Array.isArray(itemsData)) {
      await storage.deleteEstimateItemsByEstimate(id);
      
      for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i];
        const qty = parseFloat(item.quantity) || 1;
        const amount = qty * item.unitPrice;
        
        const parsedItem = insertEstimateItemSchema.parse({
          ...item,
          estimateId: id,
          amount,
          sortOrder: i,
        });
        await storage.createEstimateItem(parsedItem);
      }
      
      const totals = calculateEstimateTotals(
        itemsData,
        updateData.taxRate || existingEstimate.taxRate || "0",
        updateData.discountPercent || existingEstimate.discountPercent,
        updateData.discountAmount || existingEstimate.discountAmount || 0
      );
      
      updateData.subtotal = totals.subtotal;
      updateData.taxAmount = totals.taxAmount;
      updateData.discountAmount = totals.discountAmount;
      updateData.total = totals.total;
    }
    
    const estimate = await storage.updateEstimate(id, updateData);
    const items = await storage.getEstimateItems(id);
    
    res.json({ ...estimate, items });
  } catch (error) {
    console.error("Error updating estimate:", error);
    res.status(500).json({ error: "Failed to update estimate" });
  }
});

router.patch("/:id/items", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const itemsData = req.body.items || req.body;
    
    await storage.deleteEstimateItemsByEstimate(id);
    
    if (Array.isArray(itemsData)) {
      for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i];
        const qty = parseFloat(item.quantity) || 1;
        const amount = qty * item.unitPrice;
        
        const parsedItem = insertEstimateItemSchema.parse({
          ...item,
          estimateId: id,
          amount,
          sortOrder: i,
        });
        await storage.createEstimateItem(parsedItem);
      }
      
      const totals = calculateEstimateTotals(
        itemsData,
        estimate.taxRate || "0",
        estimate.discountPercent,
        estimate.discountAmount || 0
      );
      
      await storage.updateEstimate(id, {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        total: totals.total,
      });
    }
    
    const updatedEstimate = await storage.getEstimate(id);
    const items = await storage.getEstimateItems(id);
    
    res.json({ ...updatedEstimate, items });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid item data", details: error.errors });
    }
    console.error("Error updating estimate items:", error);
    res.status(500).json({ error: "Failed to update estimate items" });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingEstimate = await storage.getEstimate(id);
    if (!existingEstimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (existingEstimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteEstimateItemsByEstimate(id);
    await storage.deleteEstimate(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting estimate:", error);
    res.status(500).json({ error: "Failed to delete estimate" });
  }
});

router.post("/:id/accept", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (estimate.status === 'accepted') {
      return res.status(400).json({ error: "Estimate is already accepted" });
    }

    const updatedEstimate = await storage.updateEstimate(id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });

    const items = await storage.getEstimateItems(id);
    await deductInventoryForItems(items, 'estimate', id, user.id);
    
    res.json(updatedEstimate);
  } catch (error) {
    console.error("Error accepting estimate:", error);
    res.status(500).json({ error: "Failed to accept estimate" });
  }
});

router.post("/:id/decline", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const updatedEstimate = await storage.updateEstimate(id, {
      status: 'declined',
      declinedAt: new Date(),
    });
    
    res.json(updatedEstimate);
  } catch (error) {
    console.error("Error declining estimate:", error);
    res.status(500).json({ error: "Failed to decline estimate" });
  }
});

router.post("/:id/convert-to-invoice", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const estimateItems = await storage.getEstimateItems(id);
    const { selectedItems, notes, terms } = req.body || {};

    let itemsToBill: Array<{ estimateItem: any; quantity: string; description: string }> = [];

    if (selectedItems && Array.isArray(selectedItems) && selectedItems.length > 0) {
      for (const sel of selectedItems) {
        const estItem = estimateItems.find((ei: any) => ei.id === sel.estimateItemId);
        if (!estItem) {
          return res.status(400).json({ error: `Estimate item ${sel.estimateItemId} not found` });
        }
        const totalQty = parseFloat(estItem.quantity) || 0;
        const alreadyBilled = parseFloat(estItem.billedQuantity || "0");
        const remaining = totalQty - alreadyBilled;
        const requestedQty = parseFloat(sel.quantity) || 0;

        if (requestedQty <= 0) {
          return res.status(400).json({ error: `Quantity must be greater than 0 for item "${estItem.description}"` });
        }
        if (requestedQty > remaining + 0.0001) {
          return res.status(400).json({ error: `Requested quantity (${requestedQty}) exceeds remaining quantity (${remaining}) for item "${estItem.description}"` });
        }

        itemsToBill.push({
          estimateItem: estItem,
          quantity: sel.quantity,
          description: sel.description || estItem.description,
        });
      }
    } else {
      for (const estItem of estimateItems) {
        const totalQty = parseFloat(estItem.quantity) || 0;
        const alreadyBilled = parseFloat(estItem.billedQuantity || "0");
        const remaining = totalQty - alreadyBilled;
        if (remaining > 0.0001) {
          itemsToBill.push({
            estimateItem: estItem,
            quantity: remaining.toString(),
            description: estItem.description,
          });
        }
      }
      if (itemsToBill.length === 0) {
        return res.status(400).json({ error: "All items have already been fully billed" });
      }
    }

    const invoiceLineItems = itemsToBill.map(item => ({
      quantity: item.quantity,
      unitPrice: item.estimateItem.unitPrice,
    }));
    const totals = calculateEstimateTotals(
      invoiceLineItems,
      estimate.taxRate || "0",
      estimate.discountPercent,
      estimate.discountAmount || 0
    );

    const invoiceNumber = await storage.getNextInvoiceNumber(user.organizationId);
    
    const invoice = await storage.createInvoice({
      organizationId: estimate.organizationId,
      clientId: estimate.clientId,
      invoiceNumber,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: totals.subtotal,
      taxRate: estimate.taxRate,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      discountPercent: estimate.discountPercent,
      total: totals.total,
      amountPaid: 0,
      amountDue: totals.total,
      notes: notes !== undefined ? notes : estimate.notes,
      terms: terms !== undefined ? terms : estimate.terms,
      footer: estimate.footer,
      projectId: estimate.projectId,
      repairId: estimate.repairId,
      workOrderId: estimate.workOrderId,
      estimateId: id,
      createdBy: user.id,
    });
    
    for (let i = 0; i < itemsToBill.length; i++) {
      const item = itemsToBill[i];
      const qty = parseFloat(item.quantity) || 1;
      const amount = qty * item.estimateItem.unitPrice;
      await storage.createInvoiceItem({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.estimateItem.unitPrice,
        amount,
        sortOrder: i,
      });
    }

    for (const item of itemsToBill) {
      const currentBilled = parseFloat(item.estimateItem.billedQuantity || "0");
      const addedQty = parseFloat(item.quantity) || 0;
      const newBilledQty = currentBilled + addedQty;
      await storage.updateEstimateItem(item.estimateItem.id, {
        billedQuantity: newBilledQty.toString(),
      });
    }

    const updatedEstimateItems = await storage.getEstimateItems(id);
    const allFullyBilled = updatedEstimateItems.every((ei: any) => {
      const totalQty = parseFloat(ei.quantity) || 0;
      const billedQty = parseFloat(ei.billedQuantity || "0");
      return billedQty >= totalQty - 0.0001;
    });

    if (allFullyBilled) {
      await storage.updateEstimate(id, { status: 'converted' });
    }
    
    const invoiceItems = await storage.getInvoiceItems(invoice.id);
    res.status(201).json({ ...invoice, items: invoiceItems });
  } catch (error) {
    console.error("Error converting estimate to invoice:", error);
    res.status(500).json({ error: "Failed to convert estimate to invoice" });
  }
});

router.get("/:id/linked-invoices", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const linkedInvoices = await storage.getInvoicesByEstimate(id);
    const invoicesWithItems = await Promise.all(
      linkedInvoices.map(async (inv: any) => {
        const items = await storage.getInvoiceItems(inv.id);
        return { ...inv, items };
      })
    );
    
    res.json(invoicesWithItems);
  } catch (error) {
    console.error("Error fetching linked invoices:", error);
    res.status(500).json({ error: "Failed to fetch linked invoices" });
  }
});

router.get("/:id/billing-summary", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const estimateItems = await storage.getEstimateItems(id);
    const linkedInvoices = await storage.getInvoicesByEstimate(id);

    let totalBilledAmount = 0;
    let totalRemainingAmount = 0;
    let allFullyBilled = true;

    const items = estimateItems.map((ei: any) => {
      const totalQty = parseFloat(ei.quantity) || 0;
      const billedQty = parseFloat(ei.billedQuantity || "0");
      const remainingQty = Math.max(0, totalQty - billedQty);
      const totalAmount = Math.round(totalQty * ei.unitPrice);
      const billedAmount = Math.round(billedQty * ei.unitPrice);
      const remainingAmount = Math.round(remainingQty * ei.unitPrice);

      totalBilledAmount += billedAmount;
      totalRemainingAmount += remainingAmount;

      if (remainingQty > 0.0001) {
        allFullyBilled = false;
      }

      return {
        id: ei.id,
        description: ei.description,
        totalQuantity: ei.quantity,
        billedQuantity: ei.billedQuantity || "0",
        remainingQuantity: remainingQty.toString(),
        unitPrice: ei.unitPrice,
        totalAmount,
        billedAmount,
        remainingAmount,
      };
    });

    const totalEstimateAmount = items.reduce((sum: number, i: any) => sum + i.totalAmount, 0);

    res.json({
      items,
      totalEstimateAmount,
      totalBilledAmount,
      totalRemainingAmount,
      linkedInvoiceCount: linkedInvoices.length,
      isFullyBilled: allFullyBilled,
    });
  } catch (error) {
    console.error("Error fetching billing summary:", error);
    res.status(500).json({ error: "Failed to fetch billing summary" });
  }
});

router.post("/:id/deposit", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(id);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const { depositPaymentMethod } = req.body;
    
    const updatedEstimate = await storage.updateEstimate(id, {
      depositPaid: true,
      depositPaidDate: new Date().toISOString().split('T')[0],
      depositPaymentMethod: depositPaymentMethod || 'other',
    });
    
    res.json(updatedEstimate);
  } catch (error) {
    console.error("Error recording deposit:", error);
    res.status(500).json({ error: "Failed to record deposit" });
  }
});

router.post("/:id/send", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const estimateId = parseInt(req.params.id);
    
    const estimate = await storage.getEstimate(estimateId);
    if (!estimate) {
      return res.status(404).json({ error: "Estimate not found" });
    }
    if (estimate.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const items = await storage.getEstimateItems(estimateId);
    const clientRecord = await db.select().from(clients).where(eq(clients.id, estimate.clientId)).limit(1);
    const client = clientRecord.length > 0 ? await storage.getUser(clientRecord[0].userId) : null;
    const overrideEmail = req.body?.clientEmail;
    const overrideName = req.body?.clientName;
    const recipientEmail = overrideEmail || client?.email;
    const recipientName = overrideName || client?.name || 'Valued Customer';
    console.log(`[Estimate Send] Client lookup: clientId=${estimate.clientId}, clientRecord userId=${clientRecord[0]?.userId}, user email=${client?.email}, override email=${overrideEmail}`);

    let emailSent = false;
    let emailWarning: string | undefined;

    if (!user.gmailAccessToken || !user.gmailRefreshToken) {
      emailWarning = "Gmail is not connected. Estimate status updated but email was not sent.";
    } else if (!recipientEmail) {
      emailWarning = "Client does not have an email address on file. Estimate status updated but email was not sent.";
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
          <div style="background-color: #059669; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Estimate ${estimate.estimateNumber}</h1>
            <p style="color: #d1fae5; margin: 4px 0 0 0; font-size: 14px;">From ${user.name || 'Your Service Provider'}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
            <p style="margin: 0 0 4px 0; font-size: 15px;">Hello ${recipientName},</p>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">Please find your estimate details below.</p>
            <table style="width: 100%; margin-bottom: 16px; font-size: 14px;">
              <tr><td style="color: #6b7280; padding: 2px 0;">Estimate Number:</td><td style="font-weight: 600;">${estimate.estimateNumber}</td></tr>
              <tr><td style="color: #6b7280; padding: 2px 0;">Issue Date:</td><td>${estimate.issueDate}</td></tr>
              ${estimate.expiryDate ? `<tr><td style="color: #6b7280; padding: 2px 0;">Valid Until:</td><td style="font-weight: 600;">${estimate.expiryDate}</td></tr>` : ''}
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
                <tr><td style="padding: 4px 0; color: #6b7280;">Subtotal</td><td style="text-align: right; padding: 4px 0;">${formatCents(estimate.subtotal)}</td></tr>
                ${(estimate.discountAmount && estimate.discountAmount > 0) ? `<tr><td style="padding: 4px 0; color: #6b7280;">Discount${estimate.discountPercent ? ` (${estimate.discountPercent}%)` : ''}</td><td style="text-align: right; padding: 4px 0; color: #dc2626;">-${formatCents(estimate.discountAmount)}</td></tr>` : ''}
                ${(estimate.taxAmount && estimate.taxAmount > 0) ? `<tr><td style="padding: 4px 0; color: #6b7280;">Tax${estimate.taxRate ? ` (${estimate.taxRate}%)` : ''}</td><td style="text-align: right; padding: 4px 0;">${formatCents(estimate.taxAmount)}</td></tr>` : ''}
                <tr style="font-size: 18px; font-weight: 700;"><td style="padding: 12px 0; border-top: 2px solid #1f2937;">Total</td><td style="text-align: right; padding: 12px 0; border-top: 2px solid #1f2937;">${formatCents(estimate.total)}</td></tr>
              </table>
            </div>
            ${estimate.notes ? `<div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 6px; font-size: 14px;"><strong>Notes:</strong><br/>${estimate.notes}</div>` : ''}
            <p style="margin-top: 32px; font-size: 13px; color: #9ca3af;">If you have any questions about this estimate, please don't hesitate to reach out.</p>
          </div>
        </div>`;

        const subject = `Estimate ${estimate.estimateNumber} - ${formatCents(estimate.total)}`;
        console.log(`[Estimate Send] Attempting to send estimate ${estimate.estimateNumber} to ${recipientEmail} via Gmail`);
        console.log(`[Estimate Send] User tokens present: access=${!!userTokens.gmailAccessToken}, refresh=${!!userTokens.gmailRefreshToken}, email=${userTokens.gmailConnectedEmail}`);
        const result = await sendGmailMessage(recipientEmail, subject, htmlBody, true, userTokens);
        emailSent = result !== null;
        console.log(`[Estimate Send] Email result: ${emailSent ? 'SUCCESS' : 'FAILED'}`);
        if (!emailSent) {
          emailWarning = "Failed to send email via Gmail. Estimate status updated but email delivery failed.";
        }
      } catch (emailError) {
        console.error("Error sending estimate email:", emailError);
        emailWarning = "Failed to send email via Gmail. Estimate status updated but email delivery failed.";
      }
    }

    const updatedEstimate = await storage.updateEstimate(estimateId, {
      status: 'sent',
      sentAt: new Date(),
      emailSent: emailSent,
    });
    
    const updatedItems = await storage.getEstimateItems(estimateId);
    res.json({ ...updatedEstimate, items: updatedItems, emailSent, emailWarning });
  } catch (error) {
    console.error("Error sending estimate:", error);
    res.status(500).json({ error: "Failed to send estimate" });
  }
});

export default router;
