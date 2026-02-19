import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCw, Smartphone, Barcode, ImagePlus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  onPhotoCapture?: (imageUrl: string) => void;
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
  onPhotoCapture,
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scannerDivId = "barcode-scanner";

  const handleTakePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch('/api/inventory/upload-photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      setCapturedPhotoUrl(data.imageUrl);
      if (onPhotoCapture) {
        onPhotoCapture(data.imageUrl);
      }
    } catch (err: any) {
      setError('Failed to upload photo: ' + (err.message || 'Unknown error'));
      if (onError) onError(err.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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

  // Function to start scanning with the currently selected camera
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

  // Auto-start camera on component mount
  useEffect(() => {
    // Initialize the scanner
    scannerRef.current = new Html5Qrcode(scannerDivId);

    // Get available cameras
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Select the first camera if none is provided
          const cameraToUse = cameraId || devices[0].id;
          setSelectedCamera(cameraToUse);
          
          // Start scanning automatically with the selected camera
          if (scannerRef.current) {
            const config = {
              fps,
              formatsToSupport: barcodeFormats,
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
              }
            };
            
            scannerRef.current.start(
              { deviceId: cameraToUse },
              config,
              (decodedText) => {
                setLastScanned(decodedText);
                onScan(decodedText);
              },
              (errorMessage) => {
                console.debug("Barcode scan error:", errorMessage);
              }
            )
            .then(() => {
              setIsScanning(true);
            })
            .catch(err => {
              console.error("Failed to start scanner:", err.message);
              setError("Camera error: " + err.message);
              if (onError) onError(err.message);
            });
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

  // If selected camera changes, restart scanning with the new camera
  useEffect(() => {
    if (!selectedCamera || !scannerRef.current) return;
    
    // If already scanning, stop first
    if (isScanning) {
      scannerRef.current.stop()
        .then(() => {
          startScanning();
        })
        .catch(err => {
          console.error("Error stopping scanner:", err);
          setIsScanning(false);
        });
    }
  }, [selectedCamera]);

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

          {capturedPhotoUrl && (
            <Alert>
              <AlertDescription className="flex flex-col gap-2">
                <span className="font-medium">Photo captured:</span>
                <img src={capturedPhotoUrl} alt="Captured item" className="w-full h-32 object-cover rounded-md" />
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
      <CardFooter className="flex flex-col gap-2 pt-0">
        <div className="flex gap-2 w-full">
          {!isScanning ? (
            <Button 
              onClick={() => startScanning()} 
              className="flex-1 gap-1"
              disabled={!selectedCamera}
            >
              <Camera className="h-4 w-4" />
              Start Scanning
            </Button>
          ) : (
            <Button 
              onClick={() => stopScanning()} 
              variant="outline" 
              className="flex-1 gap-1"
            >
              <X className="h-4 w-4" />
              Stop Scanning
            </Button>
          )}
          
          {cameras.length > 1 && (
            <Button 
              onClick={() => switchCamera()}
              variant="outline"
              className="gap-1"
              title="Switch camera"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="w-full border-t pt-2 mt-1">
          <p className="text-xs text-muted-foreground mb-2 text-center">Can't scan? Take a photo of the item instead</p>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleTakePhoto}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-1"
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploadingPhoto}
          >
            {isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Take Photo of Item
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}