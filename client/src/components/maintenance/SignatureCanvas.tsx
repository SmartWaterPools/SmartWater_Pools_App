import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Pen, Trash2 } from 'lucide-react';

interface SignatureCanvasProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  height?: number;
}

export default function SignatureCanvas({
  value,
  onChange,
  label = 'Signature',
  height = 200
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  // Initialize canvas and load existing signature if available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load existing signature if available
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, [value]);
  
  // Handle mouse/touch events for drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setHasDrawn(true);
    draw(e);
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      // Save the signature as a data URL
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };
  
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
    
    let clientX, clientY;
    
    // Handle mouse or touch events
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      clientX = touch.clientX - rect.left;
      clientY = touch.clientY - rect.top;
    } else {
      // Mouse event
      const rect = canvas.getBoundingClientRect();
      clientX = e.clientX - rect.left;
      clientY = e.clientY - rect.top;
    }
    
    ctx.lineTo(clientX, clientY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(clientX, clientY);
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setHasDrawn(false);
    onChange(null);
  };
  
  return (
    <div className="space-y-2">
      {label && <Label className="mb-1.5 block">{label}</Label>}
      
      <Card className="p-2 relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={height}
          className="border rounded w-full touch-none cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        <div className="flex justify-end mt-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={!hasDrawn}
            className="flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
        
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
            <div className="flex items-center gap-2">
              <Pen className="h-4 w-4" />
              <span>Sign here</span>
            </div>
          </div>
        )}
      </Card>
      
      <p className="text-xs text-muted-foreground">
        Use your mouse or finger to sign in the box above
      </p>
    </div>
  );
}