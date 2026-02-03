import * as pdfParseModule from 'pdf-parse';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
import { storage } from '../storage';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

interface VendorTemplate {
  invoiceNumberPattern: string | null;
  invoiceDatePattern: string | null;
  dueDatePattern: string | null;
  subtotalPattern: string | null;
  taxPattern: string | null;
  shippingPattern: string | null;
  totalPattern: string | null;
  lineItemStartMarker: string | null;
  lineItemEndMarker: string | null;
  lineItemPattern: string | null;
  fieldPositions: string | null;
}

const MIN_TEXT_LENGTH_FOR_PARSING = 50;
const MAX_OCR_PAGES = 5;
const OCR_TIMEOUT_MS = 60000;
const MAX_PDF_SIZE_FOR_OCR = 10 * 1024 * 1024;

export interface ParsedLineItem {
  description: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ParsedInvoice {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  shippingAmount: number | null;
  totalAmount: number | null;
  lineItems: ParsedLineItem[];
  rawText: string;
  confidence: number;
}

class PDFParserService {
  /**
   * Shared helper to render PDF pages to images using pdf-to-img.
   * Uses temp file approach for reliable cross-platform support.
   * pdf-to-img v5 accepts Buffer, data URL, or file path - temp file is most reliable.
   */
  private async renderPdfPages(pdfBuffer: Buffer, maxPages: number = 5, scale: number = 2.0): Promise<Buffer[]> {
    console.log(`[PDFParser] renderPdfPages called: buffer=${pdfBuffer.length} bytes, maxPages=${maxPages}, scale=${scale}`);
    
    const pdfToImgModule = await import('pdf-to-img') as any;
    let pdfFn: any;
    
    // Handle multiple possible export shapes
    if (typeof pdfToImgModule.pdf === 'function') {
      pdfFn = pdfToImgModule.pdf;
    } else if (typeof pdfToImgModule.default === 'function') {
      pdfFn = pdfToImgModule.default;
    } else if (pdfToImgModule.default && typeof pdfToImgModule.default.pdf === 'function') {
      pdfFn = pdfToImgModule.default.pdf;
    } else {
      throw new Error('Could not find pdf function in pdf-to-img module');
    }
    
    const pages: Buffer[] = [];
    let document: any;
    
    // Use temp file approach - most reliable for pdf-to-img v5
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `pdf-render-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
    
    try {
      await fs.writeFile(tempFilePath, pdfBuffer);
      console.log(`[PDFParser] Wrote PDF to temp file: ${tempFilePath} (${pdfBuffer.length} bytes)`);
      
      document = await pdfFn(tempFilePath, { scale });
      console.log(`[PDFParser] PDF loaded successfully, ${document.length} pages`);
      
      // Iterate through pages BEFORE cleaning up temp file
      let pageCount = 0;
      for await (const image of document) {
        pages.push(image as Buffer);
        pageCount++;
        console.log(`[PDFParser] Rendered page ${pageCount} (${(image as Buffer).length} bytes)`);
        if (pageCount >= maxPages) {
          console.log(`[PDFParser] Reached max page limit (${maxPages})`);
          break;
        }
      }
    } catch (error: any) {
      console.error(`[PDFParser] PDF rendering failed: ${error.message}`);
      console.error(`[PDFParser] Full error:`, error);
      throw new Error(`PDF rendering failed: ${error.message}`);
    } finally {
      // Clean up temp file AFTER iteration is complete
      try {
        await fs.unlink(tempFilePath);
        console.log(`[PDFParser] Cleaned up temp file: ${tempFilePath}`);
      } catch (cleanupErr) {
        console.warn(`[PDFParser] Failed to clean up temp file: ${tempFilePath}`);
      }
    }
    
    console.log(`[PDFParser] renderPdfPages complete: ${pages.length} pages rendered`);
    return pages;
  }

  private invoiceNumberPatterns = [
    /invoice\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    /invoice\s*no\.?\s*:?\s*([A-Z0-9-]+)/i,
    /inv[#-]?\s*([A-Z0-9-]+)/i,
    /invoice\s*number\s*:?\s*([A-Z0-9-]+)/i,
    /order\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    /po\s*#?\s*:?\s*([A-Z0-9-]+)/i,
  ];

  private datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/,
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4})/,
  ];

  private amountPatterns = [
    /\$\s*([\d,]+\.?\d*)/,
    /([\d,]+\.?\d*)\s*(?:USD|dollars?)/i,
  ];

  async parseInvoice(pdfBuffer: Buffer, vendorId?: number): Promise<ParsedInvoice> {
    console.log(`[PDFParser] Starting parseInvoice, buffer size: ${pdfBuffer.length} bytes, vendorId: ${vendorId}`);
    
    let rawText = '';
    let confidenceScore = 0;
    let fieldsFound = 0;
    const totalFields = 7;
    let usedOcr = false;
    let vendorTemplate: VendorTemplate | null = null;

    if (vendorId) {
      try {
        const template = await storage.getActiveVendorParsingTemplate(vendorId);
        if (template) {
          vendorTemplate = template;
          console.log(`[PDFParser] Using vendor-specific parsing template for vendor ${vendorId}`);
          
          await storage.updateVendorParsingTemplate(template.id, {
            timesUsed: (template.timesUsed || 0) + 1,
            lastUsedAt: new Date()
          });
        } else {
          console.log(`[PDFParser] No active template found for vendor ${vendorId}`);
        }
      } catch (err) {
        console.error('[PDFParser] Error loading vendor template:', err);
      }
    }

    try {
      console.log('[PDFParser] Attempting pdf-parse text extraction...');
      const data = await pdfParse(pdfBuffer);
      rawText = data.text || '';
      console.log(`[PDFParser] Text extraction completed, got ${rawText.length} chars`);
      console.log(`[PDFParser] First 200 chars: ${rawText.substring(0, 200).replace(/\n/g, '\\n')}`);
      
      const cleanedText = rawText.replace(/\s+/g, ' ').trim();
      
      if (cleanedText.length < MIN_TEXT_LENGTH_FOR_PARSING) {
        console.log(`[PDFParser] Minimal content (${cleanedText.length} chars < ${MIN_TEXT_LENGTH_FOR_PARSING}), attempting OCR...`);
        try {
          const ocrText = await this.performOcr(pdfBuffer);
          if (ocrText && ocrText.trim().length > 0) {
            rawText = ocrText;
            usedOcr = true;
            console.log(`[PDFParser] OCR completed, extracted ${rawText.length} characters`);
          } else {
            console.log('[PDFParser] OCR returned no usable text');
          }
        } catch (ocrError) {
          console.error('[PDFParser] OCR failed for minimal-text PDF:', ocrError);
        }
      }
    } catch (error) {
      console.error('[PDFParser] Error parsing PDF with text extraction:', error);
      console.log('[PDFParser] Attempting OCR fallback...');
      try {
        rawText = await this.performOcr(pdfBuffer);
        usedOcr = true;
        console.log(`[PDFParser] OCR fallback completed, extracted ${rawText.length} characters`);
      } catch (ocrError) {
        console.error('[PDFParser] OCR fallback also failed:', ocrError);
        return this.createEmptyResult(rawText, 0);
      }
    }

    const invoiceNumber = vendorTemplate?.invoiceNumberPattern 
      ? this.extractWithCustomPattern(rawText, vendorTemplate.invoiceNumberPattern) 
      : this.extractInvoiceNumber(rawText);
    if (invoiceNumber) fieldsFound++;

    const { invoiceDate, dueDate } = vendorTemplate?.invoiceDatePattern
      ? this.extractDatesWithTemplate(rawText, vendorTemplate)
      : this.extractDates(rawText);
    if (invoiceDate) fieldsFound++;
    if (dueDate) fieldsFound++;

    const { subtotal, taxAmount, shippingAmount, totalAmount } = vendorTemplate?.totalPattern
      ? this.extractAmountsWithTemplate(rawText, vendorTemplate)
      : this.extractAmounts(rawText);
    if (subtotal) fieldsFound++;
    if (taxAmount) fieldsFound++;
    if (shippingAmount) fieldsFound++;
    if (totalAmount) fieldsFound++;

    const lineItems = this.extractLineItems(rawText);
    if (lineItems.length > 0) fieldsFound += 2;

    confidenceScore = Math.round((fieldsFound / (totalFields + 2)) * 100);
    
    if (vendorTemplate) {
      confidenceScore = Math.min(confidenceScore + 15, 100);
    }
    
    if (usedOcr && confidenceScore > 0) {
      confidenceScore = Math.max(confidenceScore - 10, 1);
    }

    return {
      invoiceNumber,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      shippingAmount,
      totalAmount,
      lineItems,
      rawText,
      confidence: confidenceScore,
    };
  }
  
  private async performOcr(pdfBuffer: Buffer): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR timeout exceeded')), OCR_TIMEOUT_MS);
    });
    
    const ocrPromise = this.performOcrInternal(pdfBuffer);
    
    return Promise.race([ocrPromise, timeoutPromise]);
  }
  
  private async performOcrInternal(pdfBuffer: Buffer): Promise<string> {
    console.log('[PDFParser] performOcrInternal called with buffer size:', pdfBuffer.length);
    
    if (pdfBuffer.length > MAX_PDF_SIZE_FOR_OCR) {
      console.log(`[PDFParser] PDF too large for OCR (${Math.round(pdfBuffer.length / 1024 / 1024)}MB > ${MAX_PDF_SIZE_FOR_OCR / 1024 / 1024}MB limit)`);
      return '';
    }
    
    try {
      // Use shared renderPdfPages helper
      const pages = await this.renderPdfPages(pdfBuffer, MAX_OCR_PAGES, 2.0);
      
      if (pages.length === 0) {
        console.log('[PDFParser] No pages extracted from PDF for OCR');
        return '';
      }
      
      console.log(`[PDFParser] Extracted ${pages.length} page(s) from PDF, running OCR...`);
      
      const textParts: string[] = [];
      
      for (let i = 0; i < pages.length; i++) {
        console.log(`[PDFParser] Running OCR on page ${i + 1}/${pages.length}...`);
        try {
          const result = await Tesseract.recognize(pages[i], 'eng');
          if (result.data.text) {
            console.log(`[PDFParser] OCR page ${i + 1} extracted ${result.data.text.length} chars`);
            textParts.push(result.data.text);
          } else {
            console.log(`[PDFParser] OCR page ${i + 1} returned empty text`);
          }
        } catch (pageError) {
          console.error(`[PDFParser] OCR failed on page ${i + 1}:`, pageError);
        }
      }
      
      const totalText = textParts.join('\n\n');
      console.log(`[PDFParser] OCR complete, total text length: ${totalText.length}`);
      return totalText;
    } catch (error) {
      console.error('[PDFParser] OCR processing failed:', error);
      throw error;
    }
  }

  private extractInvoiceNumber(text: string): string | null {
    for (const pattern of this.invoiceNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractDates(text: string): { invoiceDate: string | null; dueDate: string | null } {
    const dates: string[] = [];
    
    for (const pattern of this.datePatterns) {
      const matches = Array.from(text.matchAll(new RegExp(pattern, 'g')));
      for (const match of matches) {
        if (match[1]) {
          dates.push(match[1].trim());
        }
      }
    }

    const invoiceDateMatch = text.match(/(?:invoice\s*date|date\s*of\s*invoice|issued?\s*(?:on)?)\s*:?\s*(\S+(?:\s+\S+){0,2})/i);
    const dueDateMatch = text.match(/(?:due\s*date|payment\s*due|pay\s*by)\s*:?\s*(\S+(?:\s+\S+){0,2})/i);

    let invoiceDate: string | null = null;
    let dueDate: string | null = null;

    if (invoiceDateMatch) {
      for (const pattern of this.datePatterns) {
        const match = invoiceDateMatch[1].match(pattern);
        if (match) {
          invoiceDate = match[1];
          break;
        }
      }
    }

    if (dueDateMatch) {
      for (const pattern of this.datePatterns) {
        const match = dueDateMatch[1].match(pattern);
        if (match) {
          dueDate = match[1];
          break;
        }
      }
    }

    if (!invoiceDate && dates.length > 0) {
      invoiceDate = dates[0];
    }
    if (!dueDate && dates.length > 1) {
      dueDate = dates[1];
    }

    return { invoiceDate, dueDate };
  }

  private extractAmounts(text: string): {
    subtotal: number | null;
    taxAmount: number | null;
    shippingAmount: number | null;
    totalAmount: number | null;
  } {
    const subtotalMatch = text.match(/(?:subtotal|sub-total|sub\s+total)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i);
    const taxMatch = text.match(/(?:tax|sales\s*tax|vat|gst)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i);
    const shippingMatch = text.match(/(?:shipping|freight|delivery)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i);
    const totalMatch = text.match(/(?:total\s*(?:amount|due)?|grand\s*total|amount\s*due|balance\s*due)\s*:?\s*\$?\s*([\d,]+\.?\d*)/i);

    return {
      subtotal: this.parseAmount(subtotalMatch?.[1]),
      taxAmount: this.parseAmount(taxMatch?.[1]),
      shippingAmount: this.parseAmount(shippingMatch?.[1]),
      totalAmount: this.parseAmount(totalMatch?.[1]),
    };
  }

  private parseAmount(value: string | undefined): number | null {
    if (!value) return null;
    const cleaned = value.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;
    return Math.round(parsed * 100);
  }

  private extractLineItems(text: string): ParsedLineItem[] {
    const lineItems: ParsedLineItem[] = [];
    const lines = text.split('\n');

    const lineItemPattern = /^(.+?)\s+(\d+)\s+\$?([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)$/;
    const lineItemWithSkuPattern = /^(.+?)\s+([A-Z0-9-]+)\s+(\d+)\s+\$?([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)$/;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      let match = trimmedLine.match(lineItemWithSkuPattern);
      if (match) {
        const unitPrice = this.parseAmount(match[4]);
        const totalPrice = this.parseAmount(match[5]);
        if (unitPrice !== null && totalPrice !== null) {
          lineItems.push({
            description: match[1].trim(),
            sku: match[2].trim(),
            quantity: parseInt(match[3], 10),
            unitPrice,
            totalPrice,
          });
        }
        continue;
      }

      match = trimmedLine.match(lineItemPattern);
      if (match) {
        const unitPrice = this.parseAmount(match[3]);
        const totalPrice = this.parseAmount(match[4]);
        if (unitPrice !== null && totalPrice !== null) {
          lineItems.push({
            description: match[1].trim(),
            sku: null,
            quantity: parseInt(match[2], 10),
            unitPrice,
            totalPrice,
          });
        }
      }
    }

    return lineItems;
  }

  private createEmptyResult(rawText: string, confidence: number): ParsedInvoice {
    return {
      invoiceNumber: null,
      invoiceDate: null,
      dueDate: null,
      subtotal: null,
      taxAmount: null,
      shippingAmount: null,
      totalAmount: null,
      lineItems: [],
      rawText,
      confidence,
    };
  }

  private extractWithCustomPattern(text: string, patternStr: string): string | null {
    try {
      const pattern = new RegExp(patternStr, 'i');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
      if (match && match[0]) {
        return match[0].trim();
      }
    } catch (err) {
      console.error('Invalid custom pattern:', patternStr, err);
    }
    return null;
  }

  private extractDatesWithTemplate(text: string, template: VendorTemplate): { invoiceDate: string | null; dueDate: string | null } {
    let invoiceDate: string | null = null;
    let dueDate: string | null = null;

    if (template.invoiceDatePattern) {
      invoiceDate = this.extractWithCustomPattern(text, template.invoiceDatePattern);
      if (invoiceDate) {
        invoiceDate = this.normalizeDate(invoiceDate);
      }
    }

    if (template.dueDatePattern) {
      dueDate = this.extractWithCustomPattern(text, template.dueDatePattern);
      if (dueDate) {
        dueDate = this.normalizeDate(dueDate);
      }
    }

    if (!invoiceDate || !dueDate) {
      const fallback = this.extractDates(text);
      invoiceDate = invoiceDate || fallback.invoiceDate;
      dueDate = dueDate || fallback.dueDate;
    }

    return { invoiceDate, dueDate };
  }

  private extractAmountsWithTemplate(text: string, template: VendorTemplate): { 
    subtotal: number | null; 
    taxAmount: number | null; 
    shippingAmount: number | null; 
    totalAmount: number | null 
  } {
    let subtotal: number | null = null;
    let taxAmount: number | null = null;
    let shippingAmount: number | null = null;
    let totalAmount: number | null = null;

    if (template.subtotalPattern) {
      const val = this.extractWithCustomPattern(text, template.subtotalPattern);
      if (val) subtotal = this.parseAmount(val);
    }

    if (template.taxPattern) {
      const val = this.extractWithCustomPattern(text, template.taxPattern);
      if (val) taxAmount = this.parseAmount(val);
    }

    if (template.shippingPattern) {
      const val = this.extractWithCustomPattern(text, template.shippingPattern);
      if (val) shippingAmount = this.parseAmount(val);
    }

    if (template.totalPattern) {
      const val = this.extractWithCustomPattern(text, template.totalPattern);
      if (val) totalAmount = this.parseAmount(val);
    }

    if (!subtotal && !taxAmount && !totalAmount) {
      return this.extractAmounts(text);
    }

    return { subtotal, taxAmount, shippingAmount, totalAmount };
  }

  private normalizeDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    
    const trimmed = dateStr.trim();
    
    const mmddyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      return `${mmddyyyy[1].padStart(2, '0')}/${mmddyyyy[2].padStart(2, '0')}/${mmddyyyy[3]}`;
    }
    
    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      return `${yyyymmdd[2].padStart(2, '0')}/${yyyymmdd[3].padStart(2, '0')}/${yyyymmdd[1]}`;
    }
    
    return trimmed;
  }

  async parseWithAI(pdfBuffer: Buffer): Promise<ParsedInvoice> {
    console.log('[PDFParser] Starting AI-powered parsing...');
    console.log(`[PDFParser] PDF buffer size: ${pdfBuffer.length} bytes`);
    
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. AI extraction is unavailable.');
    }
    
    // STEP 1: Try to extract text from PDF first (fast, cheap, reliable)
    let extractedText = '';
    try {
      console.log('[PDFParser] Extracting text from PDF...');
      const data = await pdfParse(pdfBuffer);
      extractedText = data.text || '';
      console.log(`[PDFParser] Extracted ${extractedText.length} chars of text`);
    } catch (textError) {
      console.log('[PDFParser] Text extraction failed, will try Vision API');
    }
    
    const systemPrompt = `You are an expert invoice/document parser. Extract the following information and return a valid JSON object:

{
  "invoiceNumber": "string or null - the invoice/order number",
  "invoiceDate": "string or null - the invoice date in MM/DD/YYYY format",
  "dueDate": "string or null - the due date in MM/DD/YYYY format",
  "subtotal": "number or null - subtotal amount before tax (in dollars, not cents)",
  "taxAmount": "number or null - tax amount (in dollars, not cents)",
  "shippingAmount": "number or null - shipping amount (in dollars, not cents)",
  "totalAmount": "number or null - total amount including tax (in dollars, not cents)",
  "vendorName": "string or null - the vendor/supplier name",
  "lineItems": [
    {
      "description": "string - item description",
      "sku": "string or null - product SKU/code",
      "quantity": "number - quantity",
      "unitPrice": "number - unit price in dollars",
      "totalPrice": "number - line item total in dollars"
    }
  ]
}

Rules:
- Extract ALL visible line items from the invoice
- Convert all amounts to numbers (remove $ signs, commas)
- If a field is not visible or unclear, use null
- Dates should be in MM/DD/YYYY format
- Return ONLY valid JSON, no markdown or explanation`;

    try {
      let response;
      
      // STEP 2: If we have text, use text-based GPT-4 (faster, cheaper, more reliable)
      if (extractedText.length >= 100) {
        console.log('[PDFParser] Using text-based GPT-4 parsing (fast path)...');
        
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Parse this invoice text and extract all data:\n\n${extractedText.substring(0, 15000)}` }
          ],
          max_tokens: 4096,
          response_format: { type: 'json_object' }
        });
        
        console.log('[PDFParser] Text-based parsing complete');
      } else {
        // STEP 3: Scanned PDF with no text - cannot use AI extraction currently
        // The pdf-to-img library has compatibility issues, so for now we skip Vision API
        console.log('[PDFParser] No text available in PDF - this appears to be a scanned document');
        console.log('[PDFParser] Scanned PDFs without selectable text cannot be processed with AI extraction');
        
        throw new Error('This document appears to be a scanned PDF without selectable text. AI extraction works best with text-based PDFs. Please try using the manual field mapping tool in the Visual tab, or re-scan the document with OCR enabled.');
      }
      
      const content = response.choices[0]?.message?.content || '{}';
      console.log('[PDFParser] AI response:', content.substring(0, 500));
      
      const parsed = JSON.parse(content);
      
      const result: ParsedInvoice = {
        invoiceNumber: parsed.invoiceNumber || null,
        invoiceDate: parsed.invoiceDate || null,
        dueDate: parsed.dueDate || null,
        subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
        taxAmount: typeof parsed.taxAmount === 'number' ? parsed.taxAmount : null,
        shippingAmount: typeof parsed.shippingAmount === 'number' ? parsed.shippingAmount : null,
        totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : null,
        lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems.map((item: any) => ({
          description: item.description || '',
          sku: item.sku || null,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
          totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : 0
        })) : [],
        rawText: extractedText || `AI-extracted. Vendor: ${parsed.vendorName || 'Unknown'}`,
        confidence: 85
      };
      
      console.log(`[PDFParser] AI parsing complete. Found ${result.lineItems.length} line items`);
      return result;
      
    } catch (error: any) {
      console.error('[PDFParser] AI parsing failed:', error.message);
      throw new Error(`AI parsing failed: ${error.message}`);
    }
  }
}

export const pdfParserService = new PDFParserService();
