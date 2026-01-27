import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertVendorInvoiceSchema, insertVendorInvoiceItemSchema, insertEmailAttachmentSchema, insertExpenseSchema, insertVendorParsingTemplateSchema } from "@shared/schema";
import { z } from "zod";
import { pdfParserService, ParsedInvoice } from "../services/pdf-parser-service";
import { downloadGmailAttachment, UserTokens } from "../services/gmail-client";
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

router.get("/:id/pdf", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    console.log(`[PDF] Fetching PDF for invoice ${id}`);
    
    const invoice = await storage.getVendorInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    let pdfBuffer: Buffer | null = null;
    
    if (invoice.pdfUrl) {
      try {
        const pdfPath = path.join(process.cwd(), invoice.pdfUrl);
        console.log(`[PDF] Reading local PDF from: ${pdfPath}`);
        pdfBuffer = await fs.readFile(pdfPath);
        console.log(`[PDF] Local PDF read: ${pdfBuffer.length} bytes`);
      } catch (fileError) {
        console.log('[PDF] Local file not found, checking Gmail attachment...');
      }
    }
    
    if (!pdfBuffer && invoice.attachmentId && invoice.emailId) {
      console.log(`[PDF] Downloading from Gmail attachment ${invoice.attachmentId}`);
      const attachment = await storage.getEmailAttachment(invoice.attachmentId);
      const email = await storage.getEmail(invoice.emailId);
      
      if (attachment?.externalAttachmentId && email?.externalId) {
        const userTokens: UserTokens = {
          userId: user.id,
          gmailAccessToken: user.gmailAccessToken,
          gmailRefreshToken: user.gmailRefreshToken,
          gmailTokenExpiresAt: user.gmailTokenExpiresAt,
          gmailConnectedEmail: user.gmailConnectedEmail,
        };
        
        pdfBuffer = await downloadGmailAttachment(
          email.externalId,
          attachment.externalAttachmentId,
          userTokens
        );
        console.log(`[PDF] Gmail download result: ${pdfBuffer ? pdfBuffer.length + ' bytes' : 'null'}`);
      }
    }
    
    if (!pdfBuffer) {
      console.log('[PDF] No PDF available');
      return res.status(404).json({ error: "PDF not available" });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error fetching PDF:", error);
    res.status(500).json({ error: "Failed to fetch PDF" });
  }
});

router.post("/:id/parse", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    console.log(`[Parse] Starting parse for invoice ${id}`);
    
    const invoice = await storage.getVendorInvoice(id);
    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found" });
    }
    if (invoice.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    console.log(`[Parse] Invoice found: attachmentId=${invoice.attachmentId}, emailId=${invoice.emailId}, pdfUrl=${invoice.pdfUrl}`);
    
    let pdfBuffer: Buffer | null = null;
    
    if (invoice.pdfUrl) {
      try {
        const pdfPath = path.join(process.cwd(), invoice.pdfUrl);
        console.log(`[Parse] Trying to read local PDF from: ${pdfPath}`);
        pdfBuffer = await fs.readFile(pdfPath);
        console.log(`[Parse] Local PDF read successfully, ${pdfBuffer.length} bytes`);
      } catch (fileError) {
        console.log('[Parse] PDF file not found locally, checking for email attachment...', fileError);
      }
    }
    
    if (!pdfBuffer && invoice.attachmentId) {
      console.log(`[Parse] Looking up attachment ID ${invoice.attachmentId}`);
      const attachment = await storage.getEmailAttachment(invoice.attachmentId);
      console.log(`[Parse] Attachment found:`, attachment ? { id: attachment.id, externalAttachmentId: attachment.externalAttachmentId } : 'null');
      
      if (attachment && attachment.externalAttachmentId && invoice.emailId) {
        const email = await storage.getEmail(invoice.emailId);
        console.log(`[Parse] Email found:`, email ? { id: email.id, externalId: email.externalId } : 'null');
        
        if (email && email.externalId) {
          const userTokens: UserTokens = {
            userId: user.id,
            gmailAccessToken: user.gmailAccessToken,
            gmailRefreshToken: user.gmailRefreshToken,
            gmailTokenExpiresAt: user.gmailTokenExpiresAt,
            gmailConnectedEmail: user.gmailConnectedEmail,
          };
          
          console.log(`[Parse] Re-downloading attachment from Gmail for invoice ${id}...`);
          console.log(`[Parse] Using messageId=${email.externalId}, attachmentId=${attachment.externalAttachmentId}`);
          pdfBuffer = await downloadGmailAttachment(
            email.externalId,
            attachment.externalAttachmentId,
            userTokens
          );
          console.log(`[Parse] Gmail download result: ${pdfBuffer ? pdfBuffer.length + ' bytes' : 'null'}`);
        }
      }
    }
    
    if (!pdfBuffer) {
      console.log('[Parse] No PDF buffer obtained from any source');
      return res.status(400).json({ error: "No PDF file or email attachment found for this document" });
    }
    
    const parsed = await pdfParserService.parseInvoice(pdfBuffer, invoice.vendorId);
    
    console.log(`[Parse] Parsed result: confidence=${parsed.confidence}%, invoiceNumber=${parsed.invoiceNumber}, rawTextLength=${parsed.rawText?.length || 0}`);
    
    // Check if this is likely a scanned/image-based PDF with failed text extraction
    let parseError: string | null = null;
    if (!parsed.rawText || parsed.rawText.length < 50) {
      console.log('[Parse] WARNING: Very little or no text extracted from PDF - likely a scanned/image-based document');
      parseError = 'Limited text extracted from PDF. This may be a scanned document. Try using a higher quality scan or text-based PDF.';
    }
    
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
    
    // Set status based on parsing confidence
    const parseStatus = parsed.confidence >= 50 ? 'processed' : 'needs_review';
    
    console.log(`[Parse] Saving parsed data: subtotal=${parsed.subtotal}, tax=${parsed.taxAmount}, total=${parsed.totalAmount}`);
    
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
      status: parseStatus,
      parseErrors: parseError,
    });
    
    console.log(`[Parse] Invoice ${id} updated successfully with status: ${parseStatus}`);
    
    const items = await storage.getVendorInvoiceItems(id);
    
    res.json({
      invoice: updatedInvoice,
      items,
      parsed,
    });
  } catch (error) {
    console.error("Error parsing vendor invoice:", error);
    
    const id = parseInt(req.params.id);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await storage.updateVendorInvoice(id, {
      status: "failed",
      parseErrors: errorMessage,
    });
    
    res.status(500).json({ error: `Failed to parse document: ${errorMessage}` });
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
    const { emailId, vendorId, attachmentData, documentType, emailData } = req.body;
    
    if (!vendorId) {
      return res.status(400).json({ error: "vendorId is required" });
    }
    
    const vendor = await storage.getVendor(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (vendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    let savedEmailId: number | undefined = emailId;
    
    if (emailData && !emailId) {
      let existingEmail = await storage.getEmailByExternalId(user.id, emailData.externalId);
      
      if (existingEmail) {
        savedEmailId = existingEmail.id;
      } else {
        const savedEmail = await storage.createEmail({
          providerId: user.id,
          organizationId: user.organizationId,
          externalId: emailData.externalId,
          threadId: emailData.threadId || null,
          subject: emailData.subject || null,
          fromEmail: emailData.fromEmail,
          fromName: emailData.fromName || null,
          toEmails: null,
          ccEmails: null,
          bccEmails: null,
          bodyText: null,
          bodyHtml: null,
          receivedAt: emailData.receivedAt ? new Date(emailData.receivedAt) : null,
          isRead: true,
          isStarred: false,
          hasAttachments: true,
          labels: null,
          isSent: false,
        });
        savedEmailId = savedEmail.id;
      }
    } else if (emailId) {
      const email = await storage.getEmail(emailId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }
    }
    
    let attachmentId: number | undefined;
    if (attachmentData && savedEmailId) {
      const attachment = await storage.createEmailAttachment({
        emailId: savedEmailId,
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
      emailId: savedEmailId || null,
      attachmentId: attachmentId || null,
      status: "pending",
      pdfUrl: attachmentData?.url || null,
      documentType: documentType || "invoice",
    });
    
    const invoice = await storage.createVendorInvoice(invoiceData);
    
    console.log(`[Import] Created invoice ${invoice.id}, checking for auto-parse...`);
    console.log(`[Import] attachmentData: ${JSON.stringify(attachmentData ? { externalId: attachmentData.externalId, mimeType: attachmentData.mimeType, filename: attachmentData.filename } : null)}`);
    console.log(`[Import] emailData: ${JSON.stringify(emailData ? { externalId: emailData.externalId } : null)}`);
    
    const isPdfAttachment = attachmentData?.mimeType === 'application/pdf' || attachmentData?.filename?.toLowerCase().endsWith('.pdf');
    const hasExternalIds = attachmentData?.externalId && emailData?.externalId;
    
    console.log(`[Import] isPdfAttachment: ${isPdfAttachment}, hasExternalIds: ${hasExternalIds}`);
    
    if (hasExternalIds && isPdfAttachment) {
      try {
        console.log(`[Import] Auto-parsing PDF attachment for invoice ${invoice.id}...`);
        
        const userTokens: UserTokens = {
          userId: user.id,
          gmailAccessToken: user.gmailAccessToken,
          gmailRefreshToken: user.gmailRefreshToken,
          gmailTokenExpiresAt: user.gmailTokenExpiresAt,
          gmailConnectedEmail: user.gmailConnectedEmail,
        };
        
        const pdfBuffer = await downloadGmailAttachment(
          emailData.externalId,
          attachmentData.externalId,
          userTokens
        );
        
        if (pdfBuffer) {
          console.log(`[Import] Downloaded PDF attachment (${pdfBuffer.length} bytes), parsing...`);
          
          const parsedData = await pdfParserService.parseInvoice(pdfBuffer, vendorId);
          console.log(`[Import] PDF parsed with confidence: ${parsedData.confidence}%, rawText length: ${parsedData.rawText?.length || 0}`);
          
          // Log if text extraction failed (likely image-based PDF)
          let parseErrorMsg: string | null = null;
          if (!parsedData.rawText || parsedData.rawText.length < 50) {
            console.log('[Import] WARNING: No text extracted from PDF - may be a scanned/image-based document');
            parseErrorMsg = 'Limited text extracted from PDF. This may be a scanned document. Try using a higher quality scan or text-based PDF.';
          }
          
          // Set status based on parsing confidence
          // High confidence (>= 50%): processed
          // Low confidence (< 50%): needs_review so user knows to check manually
          const parseStatus = parsedData.confidence >= 50 ? 'processed' : 'needs_review';
          
          const updateData: any = {
            status: parseStatus,
            parseConfidence: parsedData.confidence,
            rawText: parsedData.rawText,
            parseErrors: parseErrorMsg,
          };
          
          if (parsedData.invoiceNumber) updateData.invoiceNumber = parsedData.invoiceNumber;
          if (parsedData.invoiceDate) updateData.invoiceDate = parsedData.invoiceDate;
          if (parsedData.dueDate) updateData.dueDate = parsedData.dueDate;
          if (parsedData.subtotal !== null) updateData.subtotal = parsedData.subtotal;
          if (parsedData.taxAmount !== null) updateData.taxAmount = parsedData.taxAmount;
          if (parsedData.totalAmount !== null) updateData.totalAmount = parsedData.totalAmount;
          
          await storage.updateVendorInvoice(invoice.id, updateData);
          
          if (parsedData.lineItems && parsedData.lineItems.length > 0) {
            for (let i = 0; i < parsedData.lineItems.length; i++) {
              const item = parsedData.lineItems[i];
              await storage.createVendorInvoiceItem({
                vendorInvoiceId: invoice.id,
                description: item.description,
                sku: item.sku,
                quantity: String(item.quantity),
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                sortOrder: i,
              });
            }
          }
          
          const updatedInvoice = await storage.getVendorInvoice(invoice.id);
          return res.status(201).json(updatedInvoice);
        } else {
          console.log('[Import] Failed to download PDF attachment from Gmail');
          await storage.updateVendorInvoice(invoice.id, {
            status: 'needs_review',
            parseErrors: 'Failed to download PDF from email. Please try re-parsing or contact support if the issue persists.',
          });
        }
      } catch (parseError) {
        console.error('[Import] Auto-parse failed:', parseError);
        await storage.updateVendorInvoice(invoice.id, {
          status: 'needs_review',
          parseErrors: `Parsing error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        });
      }
    } else {
      console.log(`[Import] Skipping auto-parse: isPdfAttachment=${isPdfAttachment}, hasExternalIds=${hasExternalIds}`);
    }
    
    const updatedInvoice = await storage.getVendorInvoice(invoice.id);
    res.status(201).json(updatedInvoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid invoice data", details: error.errors });
    }
    console.error("Error importing invoice from email:", error);
    res.status(500).json({ error: "Failed to import invoice from email" });
  }
});

// Vendor Parsing Template routes
router.get("/parsing-templates/:vendorId", isAuthenticated, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId);
    const templates = await storage.getVendorParsingTemplates(vendorId);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching parsing templates:", error);
    res.status(500).json({ error: "Failed to fetch parsing templates" });
  }
});

router.get("/parsing-template/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.getVendorParsingTemplate(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error fetching parsing template:", error);
    res.status(500).json({ error: "Failed to fetch parsing template" });
  }
});

router.post("/parsing-templates", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const validated = insertVendorParsingTemplateSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
    });
    const template = await storage.createVendorParsingTemplate(validated);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid template data", details: error.errors });
    }
    console.error("Error creating parsing template:", error);
    res.status(500).json({ error: "Failed to create parsing template" });
  }
});

router.patch("/parsing-template/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.updateVendorParsingTemplate(id, req.body);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    console.error("Error updating parsing template:", error);
    res.status(500).json({ error: "Failed to update parsing template" });
  }
});

router.delete("/parsing-template/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteVendorParsingTemplate(id);
    if (!deleted) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting parsing template:", error);
    res.status(500).json({ error: "Failed to delete parsing template" });
  }
});

export default router;
