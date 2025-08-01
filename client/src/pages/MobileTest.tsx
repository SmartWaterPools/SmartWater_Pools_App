import React from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Monitor, Tablet } from "lucide-react";

export default function MobileTest() {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              {isMobile ? (
                <Smartphone className="h-8 w-8 text-blue-600" />
              ) : (
                <Monitor className="h-8 w-8 text-gray-600" />
              )}
            </div>
            <CardTitle className="text-xl">Mobile Detection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className={`text-lg font-semibold ${isMobile ? 'text-green-600' : 'text-orange-600'}`}>
                Device Type: {isMobile ? 'Mobile/Tablet' : 'Desktop'}
              </p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>Screen Width: {window.innerWidth}px</div>
              <div>Screen Height: {window.innerHeight}px</div>
              <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
              <div>Touch Support: {window.navigator.maxTouchPoints > 0 ? 'Yes' : 'No'}</div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-input">Test Input (Mobile Optimized)</Label>
                <Input 
                  id="test-input"
                  placeholder="Test typing here"
                  className="h-12 text-base"
                />
              </div>
              
              <Button 
                className="w-full h-12 text-base tap-target"
                onClick={() => alert('Mobile button test successful!')}
              >
                Test Mobile Button
              </Button>
              
              <Button 
                variant="outline"
                className="w-full h-12 text-base tap-target"
                onClick={() => window.location.href = '/'}
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Touch Test Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center"
              onTouchStart={(e) => {
                e.currentTarget.style.backgroundColor = '#bfdbfe';
                e.currentTarget.innerHTML = 'Touch detected!';
              }}
              onTouchEnd={(e) => {
                setTimeout(() => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.innerHTML = 'Touch this area to test';
                }, 1000);
              }}
              onClick={(e) => {
                e.currentTarget.style.backgroundColor = '#fecaca';
                e.currentTarget.innerHTML = 'Click detected!';
                setTimeout(() => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.innerHTML = 'Touch this area to test';
                }, 1000);
              }}
            >
              Touch this area to test
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}