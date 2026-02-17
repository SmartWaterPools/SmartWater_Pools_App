import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertEstimateSchema, insertEstimateItemSchema } from "@shared/schema";
import { z } from "zod";

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
    
    const invoiceNumber = await storage.getNextInvoiceNumber(user.organizationId);
    
    const invoice = await storage.createInvoice({
      organizationId: estimate.organizationId,
      clientId: estimate.clientId,
      invoiceNumber,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: estimate.subtotal,
      taxRate: estimate.taxRate,
      taxAmount: estimate.taxAmount,
      discountAmount: estimate.discountAmount,
      discountPercent: estimate.discountPercent,
      total: estimate.total,
      amountPaid: 0,
      amountDue: estimate.total,
      notes: estimate.notes,
      terms: estimate.terms,
      footer: estimate.footer,
      projectId: estimate.projectId,
      repairId: estimate.repairId,
      workOrderId: estimate.workOrderId,
      createdBy: user.id,
    });
    
    for (let i = 0; i < estimateItems.length; i++) {
      const item = estimateItems[i];
      await storage.createInvoiceItem({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        sortOrder: item.sortOrder || i,
      });
    }
    
    if (estimate.status !== 'accepted') {
      const estItems = await storage.getEstimateItems(id);
      await deductInventoryForItems(estItems, 'estimate', id, user.id);
    }

    await storage.updateEstimate(id, {
      convertedInvoiceId: invoice.id,
      status: 'converted',
    });
    
    const invoiceItems = await storage.getInvoiceItems(invoice.id);
    res.status(201).json({ ...invoice, items: invoiceItems });
  } catch (error) {
    console.error("Error converting estimate to invoice:", error);
    res.status(500).json({ error: "Failed to convert estimate to invoice" });
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

export default router;
