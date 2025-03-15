import { useState } from "react";
import { HTML5QRCodeScanner } from "@/components/inventory/HTML5QRCodeScanner";
import { ScanditBarcodeScanner } from "@/components/inventory/ScanditBarcodeScanner";
import { ScanditSparkScanBarcodeScanner } from "@/components/inventory/ScanditSparkScanBarcodeScanner";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Barcode, Info, Cpu, Zap } from "lucide-react";
import { SCANDIT_LICENSE_KEY } from "@/config/scandit";

export default function BarcodeDemo() {
  const [scannedValue, setScannedValue] = useState<string>("");
  const [scanHistory, setScanHistory] = useState<{ value: string; timestamp: Date; source: string }[]>([]);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannerType, setScannerType] = useState<'html5' | 'scandit' | 'sparkscan'>('html5');

  const handleScan = (result: string, source: string = scannerType) => {
    console.log("Barcode scanned:", result, "from", source);
    setScannedValue(result);
    setScanHistory(prev => [{ value: result, timestamp: new Date(), source }, ...prev].slice(0, 10));
    setErrorMessage(null);
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
  };

  const toggleScanner = () => {
    setShowScanner(prev => !prev);
    setErrorMessage(null);
  };

  return (
    <>
      <Helmet>
        <title>Barcode Scanner Demo | Pool Service Management</title>
      </Helmet>

      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Barcode Scanner Demo</h1>
          <p className="text-muted-foreground">Compare different barcode scanning implementations</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-blue-700 font-medium mb-1">Information</h3>
              <div className="text-blue-600 text-sm">
                This page demonstrates three barcode scanning implementations:
                <ul className="list-disc list-inside mt-2 ml-2">
                  <li>HTML5-QR-Code: A lightweight JavaScript library for QR and barcode scanning</li>
                  <li>Scandit Classic: The standard enterprise-grade scanning SDK</li>
                  <li>Scandit SparkScan: Enhanced scanning with a modern UI and better performance</li>
                </ul>
                <p className="mt-2">Note: Both Scandit implementations require a license key and package installation.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-primary" />
                Barcode Scanner Controls
              </CardTitle>
              <CardDescription>
                Test different scanner implementations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="html5" onValueChange={(v) => setScannerType(v as 'html5' | 'scandit' | 'sparkscan')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="html5">HTML5-QR-Code</TabsTrigger>
                  <TabsTrigger value="scandit">Scandit Classic</TabsTrigger>
                  <TabsTrigger value="sparkscan">Scandit SparkScan</TabsTrigger>
                </TabsList>

                <TabsContent value="html5" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    The HTML5-QR-Code scanner is an open-source library that uses the WebRTC API to access 
                    the device camera and decode barcodes in real-time.
                  </p>
                  
                  {!showScanner ? (
                    <Button onClick={toggleScanner} className="w-full">
                      <Barcode className="mr-2 h-4 w-4" />
                      Open HTML5 Scanner
                    </Button>
                  ) : null}
                </TabsContent>

                <TabsContent value="scandit" className="space-y-4 pt-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="text-amber-700 text-sm">
                        <p className="mb-2">Scandit offers an enterprise-grade barcode scanning experience with advanced features.</p>
                        <p className="mb-2">This implementation uses the following Scandit packages:</p>
                        <ul className="list-disc list-inside ml-2 mb-2">
                          <li><code className="bg-amber-100 px-1 rounded">@scandit/web-datacapture-core</code></li>
                          <li><code className="bg-amber-100 px-1 rounded">@scandit/web-datacapture-barcode</code></li>
                        </ul>
                        <p>The valid Scandit license key has been configured.</p>
                      </div>
                    </div>
                  </div>
                  
                  {!showScanner ? (
                    <Button onClick={toggleScanner} className="w-full">
                      <Cpu className="mr-2 h-4 w-4" />
                      Open Scandit Scanner
                    </Button>
                  ) : null}
                </TabsContent>
                
                <TabsContent value="sparkscan" className="space-y-4 pt-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="text-purple-700 text-sm">
                        <p className="mb-2">Scandit SparkScan is a high-performance barcode scanning experience with a modern UI.</p>
                        <p className="mb-2"><strong>Note:</strong> This is an enterprise feature. The package <code className="bg-purple-100 px-1 rounded">@scandit/web-sparkscan</code> is not available in the public npm registry and requires a special Scandit enterprise license.</p>
                        <p>This demo will show error messages indicating the missing package.</p>
                      </div>
                    </div>
                  </div>
                  
                  {!showScanner ? (
                    <Button onClick={toggleScanner} className="w-full">
                      <Zap className="mr-2 h-4 w-4" />
                      Open SparkScan Scanner
                    </Button>
                  ) : null}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-primary" />
                Scan Results
              </CardTitle>
              <CardDescription>
                View your most recent scan results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scannedValue ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-green-700 font-medium mb-1">Last Scanned Value</h4>
                  <div className="text-green-600 font-mono">{scannedValue}</div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No barcode scanned yet</p>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h4 className="text-red-700 font-medium mb-1">Error</h4>
                  <div className="text-red-600">{errorMessage}</div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <h3 className="font-semibold mb-2">Scan History</h3>
              {scanHistory.length > 0 ? (
                <div className="w-full">
                  {scanHistory.map((scan, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="font-mono text-sm truncate max-w-[60%]">{scan.value}</span>
                      <div className="flex flex-col items-end text-xs text-muted-foreground">
                        <span>{scan.timestamp.toLocaleTimeString()}</span>
                        <span className="uppercase text-xs">{scan.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No scan history yet</p>
              )}
            </CardFooter>
          </Card>
        </div>

        {showScanner && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              {scannerType === 'html5' ? (
                <HTML5QRCodeScanner
                  onScan={(result) => handleScan(result, 'html5')}
                  onError={handleError}
                  onClose={toggleScanner}
                  showClose={true}
                  title="HTML5 Barcode Scanner"
                />
              ) : scannerType === 'scandit' ? (
                <ScanditBarcodeScanner
                  onScan={(result) => handleScan(result, 'scandit')}
                  onError={handleError}
                  onClose={toggleScanner}
                  title="Scandit Barcode Scanner"
                  licenseKey={SCANDIT_LICENSE_KEY}
                />
              ) : (
                <ScanditSparkScanBarcodeScanner
                  onScan={(result) => handleScan(result, 'sparkscan')}
                  onError={handleError}
                  onClose={toggleScanner}
                  title="Scandit SparkScan"
                  licenseKey={SCANDIT_LICENSE_KEY}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}