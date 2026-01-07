import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Search, 
  Users,
  List,
  AlertCircle,
  Loader2,
  Upload,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientList } from "@/components/clients/ClientList";
import { ClientWithUser } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const response = await apiRequest('POST', '/api/clients/import', { csvData });
      return response.json();
    },
    onSuccess: (data: { success: boolean; message: string; imported: number; failed: number; errors: string[] }) => {
      setImportErrors(data.errors || []);
      
      if (data.imported > 0 && data.failed === 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${data.imported} client${data.imported !== 1 ? 's' : ''}`
        });
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        setImportDialogOpen(false);
        setCsvContent("");
        setImportErrors([]);
      } else if (data.imported > 0 && data.failed > 0) {
        toast({
          title: "Partial Import",
          description: `Imported ${data.imported} client${data.imported !== 1 ? 's' : ''}, ${data.failed} failed. See details below.`
        });
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      } else {
        toast({
          title: "Import Failed",
          description: `All ${data.failed} row${data.failed !== 1 ? 's' : ''} failed. See details below.`,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    if (!csvContent.trim()) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file or paste CSV content",
        variant: "destructive"
      });
      return;
    }
    importMutation.mutate(csvContent);
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/clients/export';
  };
  
  // Fetch clients data
  const { data, isLoading: dataLoading, error } = useQuery<{clients: ClientWithUser[]}>({
    queryKey: ["/api/clients"],
    // Don't attempt to fetch if not authenticated
    enabled: isAuthenticated,
  });
  
  const isLoading = authLoading || dataLoading;
  
  // Extract clients array from response, handling both formats for backward compatibility
  const clients = data && Array.isArray(data) ? data : data?.clients;
  
  // Log for debugging
  console.log("Clients data received:", data);
  if (error) console.error("Error fetching clients:", error);

  // Transform ClientWithUser structure for component use
  const processedClients = clients?.map(clientData => {
    return {
      ...clientData,
      // Add top-level fields for convenience
      id: clientData.client.id,
      companyName: clientData.client.companyName,
      contractType: clientData.client.contractType
    };
  });

  // Now filter with our processed data
  const filteredClients = processedClients?.filter(client => {
    if (
      searchTerm &&
      !client.user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(client.companyName && client.companyName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      !client.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Extract clients by contract type
  const commercialClients = filteredClients?.filter(client => 
    client.contractType?.toLowerCase() === "commercial");
    
  const residentialClients = filteredClients?.filter(client => 
    client.contractType?.toLowerCase() === "residential" || !client.contractType);

  // Handle authentication state
  if (!isAuthenticated && !authLoading) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-7 w-7 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">Authentication Required</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>You need to be logged in to view client information.</p>
              </div>
              <div className="mt-4">
                <Button 
                  onClick={() => setLocation("/")}
                  className="bg-primary hover:bg-primary/90 text-white font-medium"
                >
                  Go to Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-7 w-7 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
          </div>
        </div>
        
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading clients...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Users className="h-7 w-7 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 md:mt-0">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search clients..." 
              className="pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setLocation("/clients/enhanced")}
              className="h-10"
              data-testid="button-table-view"
            >
              <List className="h-4 w-4 mr-1" />
              Table View
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="h-10"
              data-testid="button-bulk-import"
            >
              <Upload className="h-4 w-4 mr-1" />
              Bulk Import
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={() => setLocation("/clients/add")}
              data-testid="button-add-client"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Client
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There was a problem loading the client data. Please try again.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Clients ({filteredClients?.length || 0})</TabsTrigger>
          <TabsTrigger value="residential">Residential ({residentialClients?.length || 0})</TabsTrigger>
          <TabsTrigger value="commercial">Commercial ({commercialClients?.length || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <ClientList 
            clients={filteredClients || []} 
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="residential">
          <ClientList 
            clients={residentialClients || []} 
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="commercial">
          <ClientList 
            clients={commercialClients || []} 
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-bulk-import">
          <DialogHeader>
            <DialogTitle>Bulk Import Clients</DialogTitle>
            <DialogDescription>
              Download your current client list as a CSV template, add new clients, and upload the file to import.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
              <span className="text-sm text-muted-foreground">
                Export current clients as CSV
              </span>
            </div>
            
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Upload CSV File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                data-testid="input-csv-file"
              />
            </div>
            
            {csvContent && (
              <div className="border rounded-md p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Preview (first 5 lines):</p>
                <pre className="text-xs overflow-auto max-h-32">
                  {csvContent.split('\n').slice(0, 5).join('\n')}
                  {csvContent.split('\n').length > 5 && '\n...'}
                </pre>
              </div>
            )}
            
            {importErrors.length > 0 && (
              <div className="border border-red-200 rounded-md p-3 bg-red-50">
                <p className="text-sm font-medium text-red-800 mb-2">Import Errors:</p>
                <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-auto">
                  {importErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">CSV Format:</p>
              <p>name,email,phone,address</p>
              <p className="text-xs mt-1">Each row should contain: Name (required), Email (required), Phone (optional), Address (optional)</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setImportDialogOpen(false);
                setCsvContent("");
                setImportErrors([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!csvContent || importMutation.isPending}
              data-testid="button-import-submit"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Clients
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
