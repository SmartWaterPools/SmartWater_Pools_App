import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Swipeable Card Component for Mobile
 * 
 * Provides touch-friendly interactions on mobile devices
 * with swipe gestures for quick actions.
 */
export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  className,
  title,
  subtitle,
  actions
}) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return;
    
    const currentTouch = e.touches[0].clientX;
    setCurrentX(currentTouch);
    
    const diff = currentTouch - startX;
    // Limit the translation to prevent excessive movement
    const limitedDiff = Math.max(-100, Math.min(100, diff));
    setTranslateX(limitedDiff);
  };

  const handleTouchEnd = () => {
    if (startX === null || currentX === null) return;
    
    const diff = currentX - startX;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    // Reset values
    setStartX(null);
    setCurrentX(null);
    setTranslateX(0);
  };

  return (
    <Card
      className={cn(
        "transition-transform duration-200 touch-pan-y",
        className
      )}
      style={{
        transform: `translateX(${translateX}px)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(title || subtitle || actions) && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex space-x-2">{actions}</div>}
          </div>
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export default SwipeableCard;