import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Users,
  ArrowLeft,
  AlertCircle,
  Loader2,
  LogIn,
  RefreshCw,
  FileCog,
  GanttChartSquare
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ClientWithUser } from "@/lib/types";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ClientsEnhanced() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, checkSession } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sessionRefreshing, setSessionRefreshing] = useState(false);

  // Fetch clients data with better debugging - only when authenticated
  const { 
    data, 
    isLoading: dataLoading, 
    error, 
    refetch, 
    isError 
  } = useQuery({
    queryKey: ["/api/clients"],
    // Only fetch data when authenticated to prevent unnecessary 401 errors
    enabled: isAuthenticated,
    retry: 1, // Limit retries on failure
    staleTime: 30000, // Cache data for 30 seconds
    gcTime: 60000, // Garbage collection time
  });
  
  const isLoading = authLoading || dataLoading;
  
  // Extract clients array from response, handling both formats for backward compatibility
  const clients = data && (Array.isArray(data) ? data : 
    // @ts-ignore - Safely handle potential data format differences
    data && 'clients' in data ? data.clients : []);
  
  // Enhanced debugging
  console.log("Authentication state:", { isAuthenticated, authLoading });
  console.log("Clients data received:", data);
  console.log("Clients data error:", error);
  
  // Handle session refresh
  const handleSessionRefresh = async () => {
    setSessionRefreshing(true);
    try {
      const authenticated = await checkSession();
      console.log("Session refresh result:", authenticated);
      
      if (authenticated) {
        toast({
          title: "Session Refreshed",
          description: "Your session has been successfully refreshed.",
        });
        
        // Refetch client data
        await refetch();
      } else {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please login again.",
          variant: "destructive",
        });
        
        // Redirect to login page
        setLocation("/");
      }
    } catch (err) {
      console.error("Error refreshing session:", err);
      toast({
        title: "Refresh Failed",
        description: "There was a problem refreshing your session.",
        variant: "destructive",
      });
    } finally {
      setSessionRefreshing(false);
    }
  };

  // Transform ClientWithUser structure for component use
  const processedClients = (clients || []).map((clientData: ClientWithUser) => {
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
  const hasAuthMismatch = isAuthenticated && isError && (error as any)?.response?.status === 401;
  const hasNoDataWhileAuthenticated = isAuthenticated && !isLoading && !isError && (!processedClients || processedClients.length === 0);
  
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

      {/* Authentication mismatch error */}
      {hasAuthMismatch && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Your session appears to be invalid or expired. Please refresh your session or login again.</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSessionRefresh}
                disabled={sessionRefreshing}
              >
                {sessionRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh Session
                  </>
                )}
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
      
      {/* General error (not authentication related) */}
      {isError && !hasAuthMismatch && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Clients</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>There was a problem loading the client data. Please try again.</p>
            <div className="flex items-center gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={dataLoading}
              >
                {dataLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Try Again
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* No clients found while authenticated */}
      {hasNoDataWhileAuthenticated && (
        <Alert className="mb-6">
          <FileCog className="h-4 w-4" />
          <AlertTitle>No Client Data</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>You are authenticated but no client data was found.</p>
            <div className="flex items-center gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={dataLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setLocation("/clients/add")}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Add New Client
              </Button>
            </div>
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
          <TabsList className="w-full sm:w-auto overflow-x-auto">
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