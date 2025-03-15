import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RefreshCw, Smartphone, Barcode } from "lucide-react";
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
    // Log the environment - useful for debugging
    console.log("Environment check:", {
      hasScanditKey: !!licenseKey,
      keyLength: licenseKey?.length || 0,
      envKeyExists: !!import.meta.env.VITE_SCANDIT_LICENSE_KEY,
      isBrowser: typeof window !== 'undefined',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });

    if (!licenseKey) {
      const errorMsg = "Missing Scandit license key. Please check environment variables.";
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Scandit packages are now installed, so we can use them
    try {
      console.log("Initializing Scandit with license key:", licenseKey.substring(0, 10) + "...");
      
      // Create data capture context with the license key
      // The TypeScript definitions may not match the actual API
      // We'll try various methods to instantiate the DataCaptureContext
      try {
        // First try using the constructor directly
        dataCaptureContextRef.current = new (DataCaptureContext as any)(licenseKey);
        console.log("Successfully initialized DataCaptureContext with constructor");
      } catch (err) {
        console.log("Direct constructor failed, trying alternative methods:", err);
        
        // Try with a static create method if available
        if (typeof (DataCaptureContext as any).create === 'function') {
          dataCaptureContextRef.current = (DataCaptureContext as any).create(licenseKey);
          console.log("Successfully initialized DataCaptureContext with create() method");
        }
        // Try with forLicenseKey static method if available
        else if (typeof (DataCaptureContext as any).forLicenseKey === 'function') {
          dataCaptureContextRef.current = (DataCaptureContext as any).forLicenseKey(licenseKey);
          console.log("Successfully initialized DataCaptureContext with forLicenseKey() method");
        }
        // As a last resort, create a wrapper around the context
        else {
          throw new Error("Unable to initialize Scandit DataCaptureContext with any known method");
        }
      }

      // Create settings for barcode capture
      const settings = new BarcodeCaptureSettings();
      
      // Instead of trying to map symbologies, enable a fixed set of common ones
      // This approach is more resistant to API differences between versions
      try {
        // Enable the most common 1D/2D symbologies directly
        // The specific enum values might differ between versions, so we use try/catch
        try { settings.enableSymbology(Symbology.EAN13UPCA, true); } catch (e) { console.log("EAN13UPCA not available"); }
        try { settings.enableSymbology(Symbology.EAN8, true); } catch (e) { console.log("EAN8 not available"); }
        try { settings.enableSymbology(Symbology.UPCE, true); } catch (e) { console.log("UPCE not available"); }
        try { settings.enableSymbology(Symbology.Code128, true); } catch (e) { console.log("Code128 not available"); }
        try { settings.enableSymbology(Symbology.Code39, true); } catch (e) { console.log("Code39 not available"); }
        try { settings.enableSymbology(Symbology.DataMatrix, true); } catch (e) { console.log("DataMatrix not available"); }
        try { settings.enableSymbology(Symbology.QR, true); } catch (e) { console.log("QR not available"); }
        
        // Additional symbologies - may not be available in all Scandit versions
        if (Symbology.hasOwnProperty('PDF417') || typeof Symbology.PDF417 !== 'undefined') {
          try { settings.enableSymbology(Symbology.PDF417, true); } catch (e) { console.log("PDF417 not available"); }
        }
        
        // Try both possible names for Interleaved 2 of 5
        if (Symbology.hasOwnProperty('Interleaved2of5') || typeof (Symbology as any).Interleaved2of5 !== 'undefined') {
          try { settings.enableSymbology((Symbology as any).Interleaved2of5, true); } catch (e) { console.log("Interleaved2of5 not available"); }
        } else if (Symbology.hasOwnProperty('ITF') || typeof (Symbology as any).ITF !== 'undefined') {
          try { settings.enableSymbology((Symbology as any).ITF, true); } catch (e) { console.log("ITF not available"); }
        }
        
        // Enable Code93 if available
        if (Symbology.hasOwnProperty('Code93') || typeof Symbology.Code93 !== 'undefined') {
          try { settings.enableSymbology(Symbology.Code93, true); } catch (e) { console.log("Code93 not available"); }
        }
      } catch (err) {
        console.error("Error while enabling symbologies:", err);
        // If enabling individual symbologies fails, try enabling all symbologies
        try {
          settings.enableSymbologies(Object.values(Symbology).filter(s => typeof s === 'number'));
        } catch (fallbackErr) {
          console.error("Failed to enable all symbologies:", fallbackErr);
        }
      }

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
      
      // Determine what kind of error occurred for better user feedback
      let errorMessage: string;
      
      if (!err) {
        errorMessage = "Scandit initialization failed. Please try again later.";
      } else if (err.message && (
          err.message.includes("undefined is not an object") || 
          err.message.includes("symbology")
        )) {
        // The specific error we're seeing in the screenshots
        errorMessage = "Scandit barcode configuration issue. Using HTML5 scanner as fallback.";
        
        // If there's an onClose handler, call it to allow switching to HTML5 scanner
        if (onClose) {
          setTimeout(onClose, 3000);
        }
      } else if (err.message && err.message.includes("license")) {
        errorMessage = "Scandit license key issue. Please verify your license key.";
      } else if (err.message && err.message.includes("camera")) {
        errorMessage = "Camera access failed. Please check your camera permissions.";
      } else {
        errorMessage = `Scandit initialization failed: ${err.message || "Unknown error"}`;
      }
      
      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  };

  const startScanning = async () => {
    try {
      console.log("Starting Scandit scanner...");
      
      // First, check if we have camera permission
      const permissionStatus = await checkCameraPermission();
      
      if (!permissionStatus) {
        const errorMsg = "Camera permission denied. Please grant access in your browser settings.";
        console.error(errorMsg);
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }
      
      // Check scanner initialization
      if (!barcodeCaptureRef.current || !dataCaptureContextRef.current) {
        console.error("Scanner not properly initialized, attempting re-initialization");
        
        // Try to re-initialize the scanner
        await initializeScanner();
        
        // Check again after re-initialization
        if (!barcodeCaptureRef.current || !dataCaptureContextRef.current) {
          const errorMsg = "Scanner failed to initialize. Please try switching to HTML5 scanner.";
          setError(errorMsg);
          if (onError) onError(errorMsg);
          return;
        }
      }
      
      // Enable barcode capture
      console.log("Enabling barcode capture...");
      barcodeCaptureRef.current.setEnabled(true);
      
      // Get camera
      const camera = dataCaptureContextRef.current.getFrameSource();
      
      if (!camera) {
        const errorMsg = "No camera available from Scandit";
        console.error(errorMsg);
        setError(errorMsg);
        if (onError) onError(errorMsg);
        return;
      }
      
      try {
        console.log("Starting camera...");
        
        // Set a timeout to prevent hanging on camera initialization
        const cameraPromise = camera.switchToDesiredState(FrameSourceState.On);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Camera initialization timed out after 6 seconds")), 6000)
        );
        
        // Also add a log for successful camera activation
        const loggingPromise = cameraPromise.then(() => {
          console.log("Camera activated successfully!");
          return cameraPromise;
        });
        
        // Race with timeout
        await Promise.race([loggingPromise, timeoutPromise]);
        
        console.log("Camera started successfully");
        setIsScanning(true);
        setError(null);
        
        // Get camera position information
        try {
          setCameraInfo(camera.position || "Active camera");
        } catch (infoErr) {
          console.log("Unable to get camera position info:", infoErr);
          setCameraInfo("Camera active");
        }
      } catch (err: any) {
        console.error("Camera activation error:", err);
        
        // More descriptive error based on the error message
        let errorMsg = "Failed to start camera";
        if (err.message) {
          if (err.message.includes("timed out")) {
            errorMsg = "Camera initialization timed out. Please try the HTML5 scanner instead.";
          } else if (err.message.includes("permission")) {
            errorMsg = "Camera permission denied. Please check your browser settings.";
          } else if (err.message.includes("not found") || err.message.includes("not available")) {
            errorMsg = "Camera not found or not available on this device.";
          } else {
            errorMsg = `Failed to start camera: ${err.message}`;
          }
        }
        
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    } catch (err: any) {
      console.error("Critical error in startScanning:", err);
      const errorMsg = `Camera error: ${err.message || "Unknown error"}`;
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
  };
  
  // Helper function to check camera permission
  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      // Check if navigator.permissions is available (modern browsers)
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'granted') {
          return true;
        } else if (result.state === 'prompt') {
          // We need to request permission
          try {
            // Request camera access to trigger the permission prompt
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // If we get here, permission was granted
            // Clean up the stream we just created
            stream.getTracks().forEach(track => track.stop());
            return true;
          } catch (e) {
            return false;
          }
        } else {
          // Permission denied
          return false;
        }
      } else {
        // Fallback for browsers without permissions API
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Clean up the stream we just created
          stream.getTracks().forEach(track => track.stop());
          return true;
        } catch (e) {
          return false;
        }
      }
    } catch (e) {
      console.error("Error checking camera permission:", e);
      return false;
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
    console.log("ScanditBarcodeScanner component mounted");
    initializeScanner();

    return () => {
      console.log("ScanditBarcodeScanner component unmounting - cleaning up resources");
      
      try {
        // Clean up resources when component unmounts
        if (barcodeCaptureRef.current) {
          console.log("Disabling barcode capture");
          barcodeCaptureRef.current.setEnabled(false);
          
          // Try to remove listeners
          try {
            if (typeof barcodeCaptureRef.current.removeAllListeners === 'function') {
              barcodeCaptureRef.current.removeAllListeners();
            }
          } catch (listenerErr) {
            console.log("Error removing barcode listeners:", listenerErr);
          }
        }
        
        if (dataCaptureContextRef.current) {
          const camera = dataCaptureContextRef.current.getFrameSource();
          if (camera) {
            console.log("Stopping camera during cleanup");
            // Using Promise.resolve to handle potential API differences
            Promise.resolve(camera.switchToDesiredState(FrameSourceState.Off))
              .catch(err => console.error("Error stopping camera during cleanup:", err));
          }
          
          // If there's a view, disconnect it
          if (dataCaptureViewRef.current) {
            try {
              console.log("Disconnecting data capture view");
              if (typeof dataCaptureViewRef.current.disconnectFromElement === 'function') {
                dataCaptureViewRef.current.disconnectFromElement();
              }
            } catch (viewErr) {
              console.log("Error disconnecting view:", viewErr);
            }
          }
          
          // Some versions might not have dispose method
          if (typeof dataCaptureContextRef.current.dispose === 'function') {
            console.log("Disposing data capture context");
            dataCaptureContextRef.current.dispose();
          }
        }
      } catch (cleanupErr) {
        console.error("Error during Scandit scanner cleanup:", cleanupErr);
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
            <Alert variant="destructive" className="relative">
              <AlertDescription>{error}</AlertDescription>
              <Button 
                onClick={() => {
                  setError(null);
                  setTimeout(() => initializeScanner(), 500);
                }}
                size="sm" 
                className="mt-2"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Scanner Initialization
              </Button>
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