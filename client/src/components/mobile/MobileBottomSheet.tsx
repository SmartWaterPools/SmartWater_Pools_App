import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: ('collapsed' | 'half' | 'full')[];
  defaultSnap?: 'collapsed' | 'half' | 'full';
  className?: string;
}

/**
 * Mobile Bottom Sheet Component
 * 
 * Provides a mobile-optimized bottom sheet with snap points
 * for displaying additional content without losing context.
 */
export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = ['half', 'full'],
  defaultSnap = 'half',
  className
}) => {
  const [currentSnap, setCurrentSnap] = useState<'collapsed' | 'half' | 'full'>(defaultSnap);
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && currentSnap === 'collapsed') {
      setCurrentSnap('half');
    }
  }, [isOpen]);

  const getHeightClass = () => {
    switch (currentSnap) {
      case 'collapsed':
        return 'h-16';
      case 'half':
        return 'h-1/2';
      case 'full':
        return 'h-5/6';
      default:
        return 'h-1/2';
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (startY === null || currentY === null) return;
    
    const diff = currentY - startY;
    const threshold = 50;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiping down
        if (currentSnap === 'full' && snapPoints.includes('half')) {
          setCurrentSnap('half');
        } else if (currentSnap === 'half' && snapPoints.includes('collapsed')) {
          setCurrentSnap('collapsed');
        } else if (currentSnap === 'half') {
          onClose();
        }
      } else {
        // Swiping up
        if (currentSnap === 'collapsed' && snapPoints.includes('half')) {
          setCurrentSnap('half');
        } else if (currentSnap === 'half' && snapPoints.includes('full')) {
          setCurrentSnap('full');
        }
      }
    }
    
    setStartY(null);
    setCurrentY(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-white rounded-t-xl z-50 transition-all duration-300 ease-out md:hidden",
          getHeightClass(),
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center py-2 border-b border-gray-200">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex items-center space-x-2">
              {snapPoints.includes('full') && currentSnap !== 'full' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentSnap('full')}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              {snapPoints.includes('half') && currentSnap !== 'half' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentSnap('half')}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
};

export default MobileBottomSheet;