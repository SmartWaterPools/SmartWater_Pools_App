import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ZoomIn, 
  ZoomOut, 
  MousePointer2, 
  Hash, 
  Calendar, 
  DollarSign, 
  FileText,
  Package,
  Trash2,
  Save,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FieldSelection {
  id: string;
  fieldType: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

interface PdfFieldSelectorProps {
  pdfUrl: string | null;
  rawText: string | null;
  vendorId: number;
  invoiceId: number;
  onFieldsSelected?: (fields: FieldSelection[]) => void;
  existingMappings?: FieldSelection[];
}

const FIELD_TYPES = [
  { value: 'invoice_number', label: 'Invoice Number', icon: Hash, color: 'bg-blue-500' },
  { value: 'invoice_date', label: 'Invoice Date', icon: Calendar, color: 'bg-green-500' },
  { value: 'due_date', label: 'Due Date', icon: Calendar, color: 'bg-yellow-500' },
  { value: 'subtotal', label: 'Subtotal', icon: DollarSign, color: 'bg-purple-500' },
  { value: 'tax', label: 'Tax Amount', icon: DollarSign, color: 'bg-orange-500' },
  { value: 'total', label: 'Total Amount', icon: DollarSign, color: 'bg-red-500' },
  { value: 'line_item', label: 'Line Item', icon: Package, color: 'bg-teal-500' },
  { value: 'vendor_name', label: 'Vendor Name', icon: FileText, color: 'bg-indigo-500' },
];

export default function PdfFieldSelector({ 
  pdfUrl, 
  rawText, 
  vendorId, 
  invoiceId,
  onFieldsSelected,
  existingMappings = []
}: PdfFieldSelectorProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFieldType, setSelectedFieldType] = useState<string>('invoice_number');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [fieldSelections, setFieldSelections] = useState<FieldSelection[]>(existingMappings);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [textContent, setTextContent] = useState<any>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setError('No PDF available');
      setIsLoading(false);
      return;
    }

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        
        const response = await fetch(pdfUrl, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF. The document may be unavailable or corrupted.');
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [pdfUrl]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      const viewport = page.getViewport({ scale: zoom });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const content = await page.getTextContent();
      setTextContent(content);

      drawSelections(context, viewport);
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDoc, currentPage, zoom, fieldSelections]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const drawSelections = (context: CanvasRenderingContext2D, viewport: any) => {
    fieldSelections
      .filter(s => s.pageNumber === currentPage)
      .forEach(selection => {
        const fieldType = FIELD_TYPES.find(f => f.value === selection.fieldType);
        const color = fieldType?.color.replace('bg-', '') || 'blue-500';
        
        context.globalAlpha = 0.3;
        context.fillStyle = getColorFromClass(color);
        context.fillRect(
          selection.x * zoom,
          selection.y * zoom,
          selection.width * zoom,
          selection.height * zoom
        );
        
        context.globalAlpha = 1;
        context.strokeStyle = getColorFromClass(color);
        context.lineWidth = 2;
        context.strokeRect(
          selection.x * zoom,
          selection.y * zoom,
          selection.width * zoom,
          selection.height * zoom
        );

        context.fillStyle = getColorFromClass(color);
        context.font = '10px sans-serif';
        context.fillText(
          fieldType?.label || selection.fieldType,
          selection.x * zoom + 2,
          selection.y * zoom - 4
        );
      });
  };

  const getColorFromClass = (colorClass: string): string => {
    const colors: Record<string, string> = {
      'blue-500': '#3B82F6',
      'green-500': '#22C55E',
      'yellow-500': '#EAB308',
      'purple-500': '#A855F7',
      'orange-500': '#F97316',
      'red-500': '#EF4444',
      'teal-500': '#14B8A6',
      'indigo-500': '#6366F1',
    };
    return colors[colorClass] || '#3B82F6';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setSelectionEnd({ x, y });

    const context = canvasRef.current.getContext('2d');
    if (context && pdfDoc) {
      renderPage().then(() => {
        if (!selectionStart || !context) return;
        
        const minX = Math.min(selectionStart.x, x);
        const minY = Math.min(selectionStart.y, y);
        const width = Math.abs(x - selectionStart.x);
        const height = Math.abs(y - selectionStart.y);
        
        context.globalAlpha = 0.3;
        context.fillStyle = '#3B82F6';
        context.fillRect(minX * zoom, minY * zoom, width * zoom, height * zoom);
        
        context.globalAlpha = 1;
        context.strokeStyle = '#3B82F6';
        context.lineWidth = 2;
        context.setLineDash([5, 5]);
        context.strokeRect(minX * zoom, minY * zoom, width * zoom, height * zoom);
        context.setLineDash([]);
      });
    }
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      setIsSelecting(false);
      return;
    }
    
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    if (width < 10 || height < 10) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const selectedText = extractTextFromRegion(minX, minY, width, height);
    
    const newSelection: FieldSelection = {
      id: `field-${Date.now()}`,
      fieldType: selectedFieldType,
      text: selectedText,
      x: minX,
      y: minY,
      width,
      height,
      pageNumber: currentPage
    };
    
    setFieldSelections(prev => [...prev, newSelection]);
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    
    toast({
      title: 'Field Selected',
      description: `"${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}" mapped to ${FIELD_TYPES.find(f => f.value === selectedFieldType)?.label}`,
    });
  };

  const extractTextFromRegion = (x: number, y: number, width: number, height: number): string => {
    if (!textContent) return '';
    
    const matchingItems = textContent.items.filter((item: any) => {
      const itemX = item.transform[4];
      const itemY = item.transform[5];
      return itemX >= x && itemX <= x + width && itemY >= y && itemY <= y + height;
    });
    
    return matchingItems.map((item: any) => item.str).join(' ').trim() || 'Selected region';
  };

  const removeSelection = (id: string) => {
    setFieldSelections(prev => prev.filter(s => s.id !== id));
  };

  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const createPatternFromText = (text: string, fieldType: string): string => {
    switch (fieldType) {
      case 'invoice_number':
        return `(?:invoice|inv|order|po|ref|confirmation)\\s*[#:.\\-]?\\s*([A-Z0-9][A-Z0-9\\-]{1,20})`;
      case 'invoice_date':
        return `(?:invoice\\s*date|date\\s*of\\s*invoice|issued?\\s*(?:on|date)?)\\s*[:\\-]?\\s*(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|[A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})`;
      case 'due_date':
        return `(?:due\\s*date|payment\\s*due|pay\\s*by|net\\s*\\d+)\\s*[:\\-]?\\s*(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|[A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})`;
      case 'subtotal':
        return `(?:subtotal|sub[\\s\\-]?total)\\s*[:\\-]?\\s*\\$?\\s*([\\d,]+\\.\\d{2})`;
      case 'tax':
        return `(?:tax|sales\\s*tax|vat|gst|hst)\\s*[:\\-]?\\s*\\$?\\s*([\\d,]+\\.\\d{2})`;
      case 'total':
        return `(?:total\\s*(?:amount|due)?|grand\\s*total|amount\\s*due|balance\\s*due|total\\s*charged)\\s*[:\\-]?\\s*\\$?\\s*([\\d,]+\\.\\d{2})`;
      case 'line_item':
        return `(.+?)\\s+(\\d+)\\s+\\$?([\\d,]+\\.\\d{2})\\s+\\$?([\\d,]+\\.\\d{2})`;
      case 'vendor_name':
        return `(.+)`;
      default:
        return `(.+)`;
    }
  };

  const handleSaveTemplate = async () => {
    if (fieldSelections.length === 0) {
      toast({
        title: 'No Fields Selected',
        description: 'Please select at least one field before saving the template.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const invoiceNumSel = fieldSelections.find(f => f.fieldType === 'invoice_number');
      const invoiceDateSel = fieldSelections.find(f => f.fieldType === 'invoice_date');
      const dueDateSel = fieldSelections.find(f => f.fieldType === 'due_date');
      const subtotalSel = fieldSelections.find(f => f.fieldType === 'subtotal');
      const taxSel = fieldSelections.find(f => f.fieldType === 'tax');
      const totalSel = fieldSelections.find(f => f.fieldType === 'total');

      const templateData = {
        vendorId,
        name: `Template for Vendor ${vendorId}`,
        invoiceNumberPattern: invoiceNumSel ? createPatternFromText(invoiceNumSel.text, 'invoice_number') : null,
        invoiceDatePattern: invoiceDateSel ? createPatternFromText(invoiceDateSel.text, 'invoice_date') : null,
        dueDatePattern: dueDateSel ? createPatternFromText(dueDateSel.text, 'due_date') : null,
        subtotalPattern: subtotalSel ? createPatternFromText(subtotalSel.text, 'subtotal') : null,
        taxPattern: taxSel ? createPatternFromText(taxSel.text, 'tax') : null,
        totalPattern: totalSel ? createPatternFromText(totalSel.text, 'total') : null,
        fieldPositions: JSON.stringify(fieldSelections),
        sampleRawText: rawText?.substring(0, 1000),
        isActive: true
      };

      const response = await fetch('/api/vendor-invoices/parsing-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to save template');

      toast({
        title: 'Template Saved',
        description: 'Field mappings saved as a template for future invoices from this vendor.',
      });

      onFieldsSelected?.(fieldSelections);
    } catch (err) {
      console.error('Error saving template:', err);
      toast({
        title: 'Error',
        description: 'Failed to save template. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p>Loading PDF...</p>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground border rounded-lg bg-muted/20">
        <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
        <p className="text-sm font-medium">{error || 'No PDF available'}</p>
        <p className="text-xs mt-2">The original document is not accessible.</p>
        {rawText && (
          <p className="text-xs mt-1">Use the Raw Text tab to view extracted content.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <MousePointer2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Select field type:</span>
        </div>
        <Select value={selectedFieldType} onValueChange={setSelectedFieldType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${type.color}`} />
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm w-20 text-center">Page {currentPage}/{totalPages}</span>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
        <Eye className="h-3 w-3 inline mr-1" />
        Click and drag on the PDF to highlight fields. Select the field type first, then draw a box around the value.
      </div>

      <div ref={containerRef} className="border rounded-lg overflow-hidden bg-gray-100">
        <ScrollArea className="h-[400px]">
          <div className="p-4 flex justify-center">
            <canvas
              ref={canvasRef}
              className="shadow-lg cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </ScrollArea>
      </div>

      {fieldSelections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Fields ({fieldSelections.length})</h4>
          <div className="flex flex-wrap gap-2">
            {fieldSelections.map(selection => {
              const fieldType = FIELD_TYPES.find(f => f.value === selection.fieldType);
              return (
                <Badge 
                  key={selection.id} 
                  variant="secondary"
                  className="flex items-center gap-2 py-1.5 px-3"
                >
                  <div className={`w-2 h-2 rounded ${fieldType?.color}`} />
                  <span>{fieldType?.label}:</span>
                  <span className="font-normal truncate max-w-32">
                    {selection.text.substring(0, 20)}{selection.text.length > 20 ? '...' : ''}
                  </span>
                  <button 
                    onClick={() => removeSelection(selection.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button 
          variant="outline" 
          onClick={() => setFieldSelections([])}
          disabled={fieldSelections.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
        <Button 
          onClick={handleSaveTemplate}
          disabled={fieldSelections.length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Template
        </Button>
      </div>
    </div>
  );
}
