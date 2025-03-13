import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCw, Smartphone, Barcode } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  title?: string;
  description?: string;
  cameraId?: string;
  fps?: number;
  showClose?: boolean;
}

export function BarcodeScanner({
  onScan,
  onError,
  onClose,
  title = "Scan Inventory Barcode",
  description = "Position the barcode within the scanning area",
  cameraId,
  fps = 10,
  showClose = true
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(cameraId);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "barcode-scanner";

  // Supported barcode formats - focusing on common inventory barcodes
  // html5-qrcode supports all these formats internally but doesn't expose them as constants
  // so we need to define them manually
  const barcodeFormats = [
    "code_128",
    "code_39", 
    "ean_13",
    "ean_8",
    "upc_a", 
    "upc_e", 
    "codabar"
  ];

  useEffect(() => {
    // Initialize the scanner
    scannerRef.current = new Html5Qrcode(scannerDivId);

    // Get available cameras
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Select the first camera if none is provided
          if (!selectedCamera) {
            setSelectedCamera(devices[0].id);
          }
        }
      })
      .catch(err => {
        setError("Camera access error: " + err.message);
        if (onError) onError(err.message);
      });

    // Cleanup on unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, []);

  const startScanning = () => {
    if (!selectedCamera || !scannerRef.current) return;
    
    setError(null);
    setIsScanning(true);
    
    const config = {
      fps,
      formatsToSupport: barcodeFormats,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };
    
    scannerRef.current.start(
      { deviceId: selectedCamera },
      config,
      (decodedText) => {
        // Successfully scanned barcode
        setLastScanned(decodedText);
        onScan(decodedText);
        
        // We don't stop scanning automatically to allow multiple scans
        // unless the consumer handles this by closing the component
      },
      (errorMessage) => {
        // Ignoring errors during scanning as they can be frequent
        // and often just mean no barcode is in frame
        console.debug("Barcode scan error:", errorMessage);
      }
    )
    .catch(err => {
      setIsScanning(false);
      setError("Failed to start scanner: " + err.message);
      if (onError) onError(err.message);
    });
  };

  const stopScanning = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop()
        .then(() => {
          setIsScanning(false);
        })
        .catch(err => {
          console.error("Error stopping scanner:", err);
          setIsScanning(false);
        });
    }
  };

  const switchCamera = () => {
    if (isScanning) {
      stopScanning();
    }
    
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(camera => camera.id === selectedCamera);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCamera(cameras[nextIndex].id);
    }
  };

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
          <div id={scannerDivId} className="w-full h-64 bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
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
          
          {cameras.length > 0 && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>Using camera: {cameras.find(c => c.id === selectedCamera)?.label || 'Unknown'}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        {!isScanning ? (
          <Button 
            onClick={startScanning} 
            className="flex-1 gap-1"
            disabled={!selectedCamera}
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
        
        {cameras.length > 1 && (
          <Button 
            onClick={switchCamera}
            variant="outline"
            className="gap-1"
            title="Switch camera"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}