import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Barcode, Zap, X, Package } from "lucide-react";

interface ScanditSparkScanBarcodeScannerProps {
  licenseKey: string; 
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  showClose?: boolean;
  title?: string;
  description?: string;
}

export function ScanditSparkScanBarcodeScanner({
  onScan,
  onError,
  onClose,
  showClose = false,
  title = "Scandit SparkScan",
  description = "Enterprise-grade barcode scanning with enhanced UI"
}: ScanditSparkScanBarcodeScannerProps) {
  const [error] = useState<string>("Scandit SparkScan package is not available. This requires an enterprise license and the @scandit/web-sparkscan package.");

  const handleFallbackScan = () => {
    // Generate a test barcode result
    onScan("SPARKSCANDEMO12345");
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {showClose && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="w-full h-64 bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
            <div className="text-center p-4">
              <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">SparkScan preview would appear here</p>
            </div>
          </div>
          
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <Alert>
            <AlertDescription className="text-sm">
              <p>Scandit SparkScan requires an enterprise license and the following package:</p>
              <code className="bg-muted px-2 py-1 rounded mt-1 inline-block">@scandit/web-sparkscan</code>
              <p className="mt-2">This package is not publicly available and requires a special enterprise subscription.</p>
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground">
            <p>For more information, visit the <a href="https://docs.scandit.com/web-sdk/frameworks/javascript-spa/react-js.html" target="_blank" rel="noopener noreferrer" className="underline text-primary">Scandit Documentation</a>.</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        <Button 
          onClick={handleFallbackScan} 
          className="flex-1 gap-1"
          variant="outline"
        >
          <Zap className="h-4 w-4" />
          Simulate SparkScan
        </Button>
        {onClose && (
          <Button
            onClick={onClose}
            variant="default"
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}