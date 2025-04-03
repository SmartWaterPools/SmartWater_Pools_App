import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Users,
  ArrowLeft,
  AlertCircle,
  Loader2,
  LogIn,
  RefreshCw
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ClientWithUser } from "@/lib/types";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { useAuth } from "@/contexts/AuthContext";

export default function ClientsEnhanced() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch clients data with better debugging - only when authenticated
  const { data, isLoading: dataLoading, error } = useQuery<{clients: ClientWithUser[]} | ClientWithUser[]>({
    queryKey: ["/api/clients"],
    // Only fetch data when authenticated to prevent unnecessary 401 errors
    enabled: isAuthenticated,
    retry: 1, // Limit retries on failure
    staleTime: 30000 // Cache data for 30 seconds
  });
  
  const isLoading = authLoading || dataLoading;
  
  // Extract clients array from response, handling both formats for backward compatibility
  const clients = data && Array.isArray(data) ? data : data?.clients;
  
  // Enhanced debugging
  console.log("Authentication state:", { isAuthenticated, authLoading });
  console.log("Clients data received:", data);
  console.log("Processed clients:", clients);
  if (error) console.error("Error fetching clients:", error);

  // Transform ClientWithUser structure for component use
  const processedClients = clients?.map((clientData: ClientWithUser) => {
    // Safety check for required properties
    if (!clientData || !clientData.client) {
      console.error("Invalid client data detected:", clientData);
      return null;
    }
    
    return {
      ...clientData,
      // Add top-level fields for convenience
      id: clientData.client.id,
      companyName: clientData.client.companyName,
      contractType: clientData.client.contractType
    };
  }).filter(Boolean) as ClientWithUser[]; // Type assertion after filtering out null values

  // Extract clients by contract type
  const commercialClients = processedClients?.filter((client: ClientWithUser) => 
    client.contractType?.toLowerCase() === "commercial");
    
  const residentialClients = processedClients?.filter((client: ClientWithUser) => 
    client.contractType?.toLowerCase() === "residential" || !client.contractType);
  
  const serviceClients = processedClients?.filter((client: ClientWithUser) =>
    client.contractType?.toLowerCase() === "service");

  // Handle authentication state
  const showAuthError = !isAuthenticated && !authLoading;
  const hasAuthMismatch = isAuthenticated && error && (error as any)?.response?.status === 401;
  
  // If not authenticated at all, show the login card
  if (showAuthError) {
    return (
      <div>
        <Helmet>
          <title>Clients | Pool Management</title>
        </Helmet>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center">
            <Users className="h-7 w-7 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
              <h3 className="text-lg font-medium">Authentication Required</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You need to be logged in to view client information.</p>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white font-medium"
              onClick={() => setLocation("/")}
            >
              <LogIn className="h-4 w-4 mr-1" />
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>Clients | Pool Management</title>
      </Helmet>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Users className="h-7 w-7 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-foreground font-heading">Clients</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/clients")}
            className="h-9"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Card View
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-white font-medium"
            onClick={() => setLocation("/clients/add")}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Add Client
          </Button>
        </div>
      </div>

      {hasAuthMismatch && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Your session appears to be invalid or expired. Please refresh the page or try logging in again.</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Page
              </Button>
              <Button 
                size="sm" 
                onClick={() => setLocation("/")}
              >
                <LogIn className="h-4 w-4 mr-1" />
                Go to Login
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {error && !hasAuthMismatch && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was a problem loading the client data. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Loading clients...</span>
        </div>
      ) : (
        <Tabs defaultValue="all" className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Clients ({processedClients?.length || 0})</TabsTrigger>
            <TabsTrigger value="residential">Residential ({residentialClients?.length || 0})</TabsTrigger>
            <TabsTrigger value="commercial">Commercial ({commercialClients?.length || 0})</TabsTrigger>
            <TabsTrigger value="service">Service ({serviceClients?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <ClientsTable 
              clients={processedClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="residential">
            <ClientsTable 
              clients={residentialClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="commercial">
            <ClientsTable 
              clients={commercialClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
          
          <TabsContent value="service">
            <ClientsTable 
              clients={serviceClients || []} 
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}