import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  PlusCircle, 
  Search, 
  Users,
  List,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientList } from "@/components/clients/ClientList";
import { ClientWithUser } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
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
            >
              <List className="h-4 w-4 mr-1" />
              Table View
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
    </div>
  );
}
