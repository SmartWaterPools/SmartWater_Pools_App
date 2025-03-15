import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCw, Smartphone, Barcode } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SCANDIT_LICENSE_KEY, SUPPORTED_SYMBOLOGIES } from "@/config/scandit";

// Import the Scandit packages - these are now installed
// If you see TypeScript errors, it's likely because the types are not available
// but the functionality should still work at runtime
import {
  DataCaptureContext,
  DataCaptureView,
  Camera as ScanditCamera,
  CameraSettings,
  VideoResolution,
  FrameSourceState
} from '@scandit/web-datacapture-core';

import {
  BarcodeCaptureSettings,
  BarcodeCapture,
  BarcodeCaptureOverlay,
  BarcodeCaptureSession,
  Symbology,
  SymbologySettings
} from '@scandit/web-datacapture-barcode';

interface ScanditBarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
  licenseKey?: string;
  showClose?: boolean;
}

export function ScanditBarcodeScanner({
  onScan,
  onError,
  onClose,
  title = "Scan Inventory Barcode",
  description = "Position the barcode within the scanning area",
  licenseKey = SCANDIT_LICENSE_KEY,
  showClose = true
}: ScanditBarcodeScannerProps) {
  const viewRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraInfo, setCameraInfo] = useState<string>("No camera selected");
  
  // These will be initialized once the Scandit packages are available
  const dataCaptureContextRef = useRef<any>(null);
  const barcodeCaptureRef = useRef<any>(null);
  const dataCaptureViewRef = useRef<any>(null);

  // Start and control scanner functionality
  const initializeScanner = async () => {
    if (!licenseKey) {
      setError("Missing Scandit license key");
      if (onError) onError("Missing Scandit license key");
      return;
    }

    // Scandit packages are now installed, so we can use them
    try {
      // Create data capture context with the license key
      // Using any type casting to handle API differences between TypeScript definitions
      dataCaptureContextRef.current = (DataCaptureContext as any).forLicenseKey(licenseKey);

      // Create settings for barcode capture
      const settings = new BarcodeCaptureSettings();
      
      // Enable barcode symbologies based on our configuration
      // Map our config strings to Scandit Symbology enum values
      const symbologyMap: {[key: string]: any} = {
        'code128': Symbology.Code128,
        'code39': Symbology.Code39,
        'code93': Symbology.Code93,
        'ean13': Symbology.EAN13UPCA,
        'ean8': Symbology.EAN8,
        'upca': Symbology.EAN13UPCA,
        'upce': Symbology.UPCE,
        'datamatrix': Symbology.DataMatrix,
        'qr': Symbology.QR,
        'pdf417': Symbology.PDF417,
        'interleaved2of5': Symbology.Interleaved2of5,
        'itf': Symbology.Interleaved2of5
      };
      
      // Convert our string config values to Scandit Symbology enum values
      const symbologies = SUPPORTED_SYMBOLOGIES
        .map(sym => symbologyMap[sym])
        .filter(sym => sym !== undefined);
      
      symbologies.forEach(symbology => {
        settings.enableSymbology(symbology, true);
        // Use any type to handle API differences
        const symbologySettings = settings.settingsForSymbology(symbology);
        // TypeScript definitions might be outdated, use any casting
        (symbologySettings as any).setActive?.(true);
      });

      // Create barcode capture and set settings
      barcodeCaptureRef.current = BarcodeCapture.forContext(dataCaptureContextRef.current, settings);
      
      // Register listener to get barcode scanning results
      barcodeCaptureRef.current.addListener({
        didScan: (barcodeCapture: any, session: any) => {
          // Handle API differences between TypeScript definitions and runtime
          // In some versions it's newlyRecognizedBarcodes, in others it's newlyRecognizedBarcode
          const barcode = (session.newlyRecognizedBarcodes?.[0] || session.newlyRecognizedBarcode);
          if (barcode) {
            const data = barcode.data || "";
            setLastScanned(data);
            onScan(data);
          }
        }
      });

      // Setup camera
      const cameraSettings = new CameraSettings();
      cameraSettings.preferredResolution = VideoResolution.FullHD;
      
      // Use back camera by default
      const camera = ScanditCamera.default;
      if (camera) {
        camera.applySettings(cameraSettings);
        dataCaptureContextRef.current.setFrameSource(camera);
        
        // Get camera info - using Promise.resolve to handle API differences
        Promise.resolve(camera.getCurrentState()).then((state: any) => {
          if (state === FrameSourceState.On) {
            setCameraInfo(camera.position || "Default camera");
          }
        });

        // Create data capture view
        dataCaptureViewRef.current = DataCaptureView.forContext(dataCaptureContextRef.current);
        dataCaptureViewRef.current.connectToElement(viewRef.current as HTMLElement);
        
        // Add overlay to highlight barcodes
        const overlay = BarcodeCaptureOverlay.withBarcodeCaptureForView(barcodeCaptureRef.current, dataCaptureViewRef.current);
        // Handle API differences with type assertion
        Promise.resolve(overlay).then(resolvedOverlay => {
          // Using any to handle potential API differences
          (resolvedOverlay as any).viewfinder = null; // Remove default viewfinder
        }).catch(err => console.error("Error setting viewfinder:", err));

        setIsScanning(false);
        setError(null);
      } else {
        setError("No camera available");
        if (onError) onError("No camera available");
      }
    } catch (err: any) {
      console.error("Error initializing Scandit scanner:", err);
      setError(`Scandit initialization failed: ${err.message || "Unknown error"}`);
      if (onError) onError(err.message || "Unknown error");
    }
  };

  const startScanning = () => {
    if (barcodeCaptureRef.current && dataCaptureContextRef.current) {
      barcodeCaptureRef.current.setEnabled(true);
      const camera = dataCaptureContextRef.current.getFrameSource();
      if (camera) {
        camera.switchToDesiredState(FrameSourceState.On)
          .then(() => {
            setIsScanning(true);
            setError(null);
          })
          .catch((err: any) => {
            setError(`Failed to start camera: ${err.message || "Unknown error"}`);
            if (onError) onError(err.message || "Unknown error");
          });
      }
    } else {
      setError("Scanner not properly initialized");
    }
  };

  const stopScanning = () => {
    if (barcodeCaptureRef.current && dataCaptureContextRef.current) {
      barcodeCaptureRef.current.setEnabled(false);
      const camera = dataCaptureContextRef.current.getFrameSource();
      if (camera) {
        camera.switchToDesiredState(FrameSourceState.Off)
          .then(() => {
            setIsScanning(false);
          })
          .catch((err: any) => {
            console.error("Error stopping camera:", err);
            setIsScanning(false);
          });
      }
    }
    setIsScanning(false);
  };

  // Initialize the scanner on component mount
  useEffect(() => {
    initializeScanner();

    return () => {
      // Clean up resources when component unmounts
      if (barcodeCaptureRef.current) {
        barcodeCaptureRef.current.setEnabled(false);
      }
      
      if (dataCaptureContextRef.current) {
        const camera = dataCaptureContextRef.current.getFrameSource();
        if (camera) {
          // Using Promise.resolve to handle potential API differences
          Promise.resolve(camera.switchToDesiredState(FrameSourceState.Off))
            .catch(err => console.error("Error stopping camera during cleanup:", err));
        }
        // Some versions might not have dispose method
        if (typeof dataCaptureContextRef.current.dispose === 'function') {
          dataCaptureContextRef.current.dispose();
        }
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Barcode className="h-5 w-5 mr-2 text-primary" />
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
          <div 
            ref={viewRef} 
            className="w-full h-64 bg-muted rounded-md overflow-hidden relative flex items-center justify-center"
          >
            {!isScanning && (
              <div className="text-center p-4">
                <Barcode className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Camera preview will appear here</p>
              </div>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {lastScanned && (
            <Alert>
              <AlertDescription className="flex flex-col">
                <span className="font-medium">Last scanned:</span>
                <span className="font-mono text-sm">{lastScanned}</span>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>{cameraInfo}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        {!isScanning ? (
          <Button 
            onClick={startScanning} 
            className="flex-1 gap-1"
            disabled={!!error}
          >
            <Camera className="h-4 w-4" />
            Start Scanning
          </Button>
        ) : (
          <Button 
            onClick={stopScanning} 
            variant="outline" 
            className="flex-1 gap-1"
          >
            <X className="h-4 w-4" />
            Stop Scanning
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}