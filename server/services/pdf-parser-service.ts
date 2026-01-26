import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

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

  async parseInvoice(pdfBuffer: Buffer): Promise<ParsedInvoice> {
    let rawText = '';
    let confidenceScore = 0;
    let fieldsFound = 0;
    const totalFields = 7;

    try {
      const data = await pdfParse(pdfBuffer);
      rawText = data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return this.createEmptyResult(rawText, 0);
    }

    const invoiceNumber = this.extractInvoiceNumber(rawText);
    if (invoiceNumber) fieldsFound++;

    const { invoiceDate, dueDate } = this.extractDates(rawText);
    if (invoiceDate) fieldsFound++;
    if (dueDate) fieldsFound++;

    const { subtotal, taxAmount, shippingAmount, totalAmount } = this.extractAmounts(rawText);
    if (subtotal) fieldsFound++;
    if (taxAmount) fieldsFound++;
    if (shippingAmount) fieldsFound++;
    if (totalAmount) fieldsFound++;

    const lineItems = this.extractLineItems(rawText);
    if (lineItems.length > 0) fieldsFound += 2;

    confidenceScore = Math.round((fieldsFound / (totalFields + 2)) * 100);

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
}

export const pdfParserService = new PDFParserService();
