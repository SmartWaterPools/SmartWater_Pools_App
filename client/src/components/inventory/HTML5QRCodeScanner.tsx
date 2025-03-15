import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Barcode, Camera, X, Smartphone } from "lucide-react";

interface HTML5QRCodeScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  showClose?: boolean;
  title?: string;
  description?: string;
}

export function HTML5QRCodeScanner({
  onScan,
  onError,
  onClose,
  showClose = false,
  title = "HTML5 QR Code Scanner",
  description = "Scan barcodes and QR codes using the built-in camera"
}: HTML5QRCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraInfo, setCameraInfo] = useState("No camera detected");
  const scannerId = useRef<string>(`html5-qrcode-scanner-${Math.random().toString(36).substring(2, 9)}`);

  const initializeScanner = async () => {
    if (!viewRef.current) return;
    
    try {
      // Clean up existing scanner if it exists
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      
      // Create container element for scanner
      if (!document.getElementById(scannerId.current)) {
        const containerDiv = document.createElement("div");
        containerDiv.id = scannerId.current;
        containerDiv.style.width = "100%";
        containerDiv.style.height = "100%";
        viewRef.current.innerHTML = "";
        viewRef.current.appendChild(containerDiv);
      }
      
      // Create scanner instance
      scannerRef.current = new Html5Qrcode(scannerId.current);
      
      // Get camera devices
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const device = devices[0]; // Default to first camera (usually back camera)
        setCameraInfo(device.label || "Default camera");
        setError(null);
      } else {
        setError("No camera found");
        if (onError) onError("No camera found");
      }
    } catch (err: any) {
      console.error("Error initializing HTML5 QR scanner:", err);
      setError(`Scanner initialization failed: ${err.message || "Unknown error"}`);
      if (onError) onError(err.message || "Unknown error");
    }
  };

  const startScanning = async () => {
    if (!scannerRef.current) {
      setError("Scanner not initialized");
      return;
    }
    
    try {
      const qrCodeSuccessCallback = (decodedText: string) => {
        setLastScanned(decodedText);
        onScan(decodedText);
      };
      
      const qrCodeErrorCallback = (errorMessage: string) => {
        // Don't report transient errors while scanning
        console.debug("QR scan error:", errorMessage);
      };
      
      // Config for scanner
      const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await scannerRef.current.start(
        { facingMode: "environment" }, // Use back camera
        config, 
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );
      
      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError(`Failed to start scanner: ${err.message || "Unknown error"}`);
      if (onError) onError(err.message || "Unknown error");
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err: any) {
        console.error("Error stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  // Initialize the scanner on component mount
  useEffect(() => {
    initializeScanner();

    return () => {
      // Clean up resources
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(e => 
          console.error("Error stopping scanner during cleanup:", e)
        );
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