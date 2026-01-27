import * as pdfParseModule from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { storage } from '../storage';

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
          console.log(`Using vendor-specific parsing template for vendor ${vendorId}`);
          
          await storage.updateVendorParsingTemplate(template.id, {
            timesUsed: (template.timesUsed || 0) + 1,
            lastUsedAt: new Date()
          });
        }
      } catch (err) {
        console.error('Error loading vendor template:', err);
      }
    }

    try {
      const data = await pdfParse(pdfBuffer);
      rawText = data.text;
      
      const cleanedText = rawText.replace(/\s+/g, ' ').trim();
      
      if (cleanedText.length < MIN_TEXT_LENGTH_FOR_PARSING) {
        console.log(`PDF text extraction returned minimal content (${cleanedText.length} chars), attempting OCR...`);
        try {
          const ocrText = await this.performOcr(pdfBuffer);
          if (ocrText && ocrText.trim().length > 0) {
            rawText = ocrText;
            usedOcr = true;
            console.log(`OCR completed, extracted ${rawText.length} characters`);
          } else {
            console.log('OCR returned no usable text');
          }
        } catch (ocrError) {
          console.error('OCR failed for minimal-text PDF:', ocrError);
        }
      }
    } catch (error) {
      console.error('Error parsing PDF with text extraction:', error);
      console.log('Attempting OCR fallback...');
      try {
        rawText = await this.performOcr(pdfBuffer);
        usedOcr = true;
        console.log(`OCR fallback completed, extracted ${rawText.length} characters`);
      } catch (ocrError) {
        console.error('OCR fallback also failed:', ocrError);
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
    if (pdfBuffer.length > MAX_PDF_SIZE_FOR_OCR) {
      console.log(`PDF too large for OCR (${Math.round(pdfBuffer.length / 1024 / 1024)}MB > ${MAX_PDF_SIZE_FOR_OCR / 1024 / 1024}MB limit)`);
      return ''; // Return empty string instead of throwing - graceful degradation
    }
    
    let pdfToImg: any;
    
    try {
      pdfToImg = await import('pdf-to-img');
    } catch (importError) {
      console.error('Failed to load pdf-to-img library:', importError);
      return ''; // Return empty string instead of throwing - OCR not available, graceful degradation
    }
    
    try {
      const pages: Buffer[] = [];
      
      const document = await pdfToImg.pdf(pdfBuffer, { scale: 2.0 });
      
      let pageCount = 0;
      for await (const image of document) {
        pages.push(image);
        pageCount++;
        if (pageCount >= MAX_OCR_PAGES) {
          console.log(`Reached max OCR page limit (${MAX_OCR_PAGES}), stopping extraction`);
          break;
        }
      }
      
      if (pages.length === 0) {
        console.log('No pages extracted from PDF for OCR');
        return '';
      }
      
      console.log(`Extracted ${pages.length} page(s) from PDF, running OCR...`);
      
      const textParts: string[] = [];
      
      for (let i = 0; i < pages.length; i++) {
        console.log(`Running OCR on page ${i + 1}/${pages.length}...`);
        try {
          const result = await Tesseract.recognize(pages[i], 'eng');
          if (result.data.text) {
            textParts.push(result.data.text);
          }
        } catch (pageError) {
          console.error(`OCR failed on page ${i + 1}:`, pageError);
        }
      }
      
      return textParts.join('\n\n');
    } catch (error) {
      console.error('OCR processing failed:', error);
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
      const matches = text.matchAll(new RegExp(pattern, 'g'));
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
}

export const pdfParserService = new PDFParserService();
