import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertVendorInvoiceSchema, insertVendorInvoiceItemSchema, insertEmailAttachmentSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { pdfParserService, ParsedInvoice } from "../services/pdf-parser-service";
import path from "path";
import fs from "fs/promises";

const router = Router();

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const invoices = await storage.getVendorInvoices(user.organizationId);
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching vendor invoices:", error);
    res.status(500).json({ error: "Failed to fetch vendor invoices" });
  }
});

router.get("/by-vendor/:vendorId", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const vendorId = parseInt(req.params.vendorId);
    
    const vendor = await storage.getVendor(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (vendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const invoices = await storage.getVendorInvoicesByVendor(vendorId);
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching vendor invoices:", error);
    res.status(500).json({ error: "Failed to fetch vendor invoices" });
  }
});

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    const invoice = await storage.getVendorInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching vendor invoice:", error);
    res.status(500).json({ error: "Failed to fetch vendor invoice" });
  }
});

router.get("/:id/items", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    const invoice = await storage.getVendorInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const items = await storage.getVendorInvoiceItems(id);
    res.json(items);
  } catch (error) {
    console.error("Error fetching vendor invoice items:", error);
    res.status(500).json({ error: "Failed to fetch vendor invoice items" });
  }
});

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    const invoiceData = insertVendorInvoiceSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
    });
    
    const invoice = await storage.createVendorInvoice(invoiceData);
    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid vendor invoice data", details: error.errors });
    }
    console.error("Error creating vendor invoice:", error);
    res.status(500).json({ error: "Failed to create vendor invoice" });
  }
});

router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingInvoice = await storage.getVendorInvoice(id);
    if (!existingInvoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (existingInvoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const invoice = await storage.updateVendorInvoice(id, req.body);
    res.json(invoice);
  } catch (error) {
    console.error("Error updating vendor invoice:", error);
    res.status(500).json({ error: "Failed to update vendor invoice" });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingInvoice = await storage.getVendorInvoice(id);
    if (!existingInvoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (existingInvoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteVendorInvoiceItemsByInvoice(id);
    await storage.deleteVendorInvoice(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor invoice:", error);
    res.status(500).json({ error: "Failed to delete vendor invoice" });
  }
});

router.post("/:id/items", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingInvoice = await storage.getVendorInvoice(id);
    if (!existingInvoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (existingInvoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const itemData = insertVendorInvoiceItemSchema.parse({
      ...req.body,
      vendorInvoiceId: id,
    });
    
    const item = await storage.createVendorInvoiceItem(itemData);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid line item data", details: error.errors });
    }
    console.error("Error creating vendor invoice item:", error);
    res.status(500).json({ error: "Failed to create line item" });
  }
});

router.patch("/items/:itemId", isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const item = await storage.updateVendorInvoiceItem(itemId, req.body);
    if (!item) {
      return res.status(404).json({ error: "Line item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error updating vendor invoice item:", error);
    res.status(500).json({ error: "Failed to update line item" });
  }
});

router.delete("/items/:itemId", isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    await storage.deleteVendorInvoiceItem(itemId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor invoice item:", error);
    res.status(500).json({ error: "Failed to delete line item" });
  }
});

router.post("/:id/parse", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const invoice = await storage.getVendorInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (!invoice.pdfUrl) {
      return res.status(400).json({ error: "No PDF file associated with this invoice" });
    }
    
    const pdfPath = path.join(process.cwd(), invoice.pdfUrl);
    const pdfBuffer = await fs.readFile(pdfPath);
    const parsed = await pdfParserService.parseInvoice(pdfBuffer);
    
    await storage.deleteVendorInvoiceItemsByInvoice(id);
    
    for (let i = 0; i < parsed.lineItems.length; i++) {
      const item = parsed.lineItems[i];
      await storage.createVendorInvoiceItem({
        vendorInvoiceId: id,
        description: item.description,
        sku: item.sku,
        quantity: String(item.quantity),
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        sortOrder: i,
      });
    }
    
    const updatedInvoice = await storage.updateVendorInvoice(id, {
      invoiceNumber: parsed.invoiceNumber,
      invoiceDate: parsed.invoiceDate,
      dueDate: parsed.dueDate,
      subtotal: parsed.subtotal,
      taxAmount: parsed.taxAmount,
      shippingAmount: parsed.shippingAmount,
      totalAmount: parsed.totalAmount,
      rawText: parsed.rawText,
      parseConfidence: parsed.confidence,
      status: "parsed",
    });
    
    const items = await storage.getVendorInvoiceItems(id);
    
    res.json({
      invoice: updatedInvoice,
      items,
      parsed,
    });
  } catch (error) {
    console.error("Error parsing vendor invoice:", error);
    
    const id = parseInt(req.params.id);
    await storage.updateVendorInvoice(id, {
      status: "error",
      parseErrors: error instanceof Error ? error.message : "Unknown error",
    });
    
    res.status(500).json({ error: "Failed to parse invoice" });
  }
});

router.post("/:id/process-to-expense", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const invoice = await storage.getVendorInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (invoice.expenseProcessed) {
      return res.status(400).json({ error: "Invoice already processed to expense" });
    }
    
    const { category, description } = req.body;
    
    const vendor = await storage.getVendor(invoice.vendorId);
    
    const expenseData = insertExpenseSchema.parse({
      organizationId: user.organizationId,
      date: invoice.invoiceDate || new Date().toISOString().split('T')[0],
      amount: String((invoice.totalAmount || 0) / 100),
      category: category || "Chemicals & Supplies",
      description: description || `Invoice ${invoice.invoiceNumber || 'N/A'} from ${vendor?.name || 'Unknown Vendor'}`,
      vendorId: invoice.vendorId,
      vendorName: vendor?.name,
      status: "pending",
      receiptUrl: invoice.pdfUrl,
    });
    
    const expense = await storage.createExpense(expenseData);
    
    await storage.updateVendorInvoice(id, {
      expenseId: expense.id,
      expenseProcessed: true,
      status: "processed",
      reviewedBy: user.id,
      reviewedAt: new Date(),
    });
    
    res.json({
      success: true,
      expense,
      invoice: await storage.getVendorInvoice(id),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid expense data", details: error.errors });
    }
    console.error("Error processing invoice to expense:", error);
    res.status(500).json({ error: "Failed to process invoice to expense" });
  }
});

router.post("/:id/process-to-inventory", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const invoice = await storage.getVendorInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const items = await storage.getVendorInvoiceItems(id);
    const processedItems: any[] = [];
    
    for (const item of items) {
      if (item.addedToInventory) continue;
      
      let inventoryItem = item.inventoryItemId 
        ? await storage.getInventoryItem?.(item.inventoryItemId)
        : null;
      
      if (!inventoryItem && item.sku) {
        const allItems = await storage.getInventoryItemsByOrganizationId?.(user.organizationId) || [];
        inventoryItem = allItems.find((i: any) => i.sku === item.sku);
      }
      
      if (!inventoryItem) {
        inventoryItem = await storage.createInventoryItem?.({
          organizationId: user.organizationId,
          name: item.description,
          sku: item.sku,
          category: "Chemicals & Supplies",
          unitCost: item.unitPrice,
          vendorId: invoice.vendorId,
        });
      }
      
      if (inventoryItem) {
        await storage.updateVendorInvoiceItem(item.id, {
          inventoryItemId: inventoryItem.id,
          addedToInventory: true,
          inventoryQuantityAdded: item.quantity,
          isNewItem: !item.inventoryItemId,
        });
        
        processedItems.push({
          invoiceItem: item,
          inventoryItem,
          quantityAdded: parseFloat(item.quantity || "1"),
        });
      }
    }
    
    await storage.updateVendorInvoice(id, {
      inventoryProcessed: true,
      status: invoice.expenseProcessed ? "processed" : "reviewed",
      reviewedBy: user.id,
      reviewedAt: new Date(),
    });
    
    res.json({
      success: true,
      processedItems,
      invoice: await storage.getVendorInvoice(id),
    });
  } catch (error) {
    console.error("Error processing invoice to inventory:", error);
    res.status(500).json({ error: "Failed to process invoice to inventory" });
  }
});

router.get("/from-vendor-emails/:vendorId", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const vendorId = parseInt(req.params.vendorId);
    
    const vendor = await storage.getVendor(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (vendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (!vendor.email) {
      return res.json([]);
    }
    
    const allEmails = await storage.getEmails(user.organizationId, 100);
    const vendorEmails = allEmails.filter(email => 
      email.fromEmail.toLowerCase() === vendor.email!.toLowerCase()
    );
    
    const emailsWithAttachmentInfo = vendorEmails.map(email => ({
      ...email,
      hasAttachments: email.hasAttachments || false,
    }));
    
    res.json(emailsWithAttachmentInfo);
  } catch (error) {
    console.error("Error fetching vendor emails:", error);
    res.status(500).json({ error: "Failed to fetch vendor emails" });
  }
});

router.post("/import-from-email", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { emailId, vendorId, attachmentData } = req.body;
    
    if (!emailId || !vendorId) {
      return res.status(400).json({ error: "emailId and vendorId are required" });
    }
    
    const vendor = await storage.getVendor(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (vendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const email = await storage.getEmail(emailId);
    if (!email) {
      return res.status(404).json({ error: "Email not found" });
    }
    
    if (vendor.email && email.fromEmail.toLowerCase() !== vendor.email.toLowerCase()) {
      return res.status(400).json({ 
        error: "Email sender does not match vendor email",
        details: `Email is from ${email.fromEmail}, but vendor email is ${vendor.email}`
      });
    }
    
    let attachmentId: number | undefined;
    if (attachmentData) {
      const attachment = await storage.createEmailAttachment({
        emailId,
        organizationId: user.organizationId,
        filename: attachmentData.filename || `attachment_${Date.now()}`,
        originalName: attachmentData.originalName || attachmentData.filename || 'unknown',
        mimeType: attachmentData.mimeType || 'application/pdf',
        size: attachmentData.size || 0,
        url: attachmentData.url || '',
        externalAttachmentId: attachmentData.externalId,
        isDownloaded: !!attachmentData.url,
      });
      attachmentId = attachment.id;
    }
    
    const invoiceData = insertVendorInvoiceSchema.parse({
      organizationId: user.organizationId,
      vendorId,
      emailId,
      attachmentId,
      status: "pending",
      pdfUrl: attachmentData?.url || null,
    });
    
    const invoice = await storage.createVendorInvoice(invoiceData);
    
    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
    }
    console.error("Error importing invoice from email:", error);
    res.status(500).json({ error: "Failed to import invoice from email" });
  }
});

export default router;
