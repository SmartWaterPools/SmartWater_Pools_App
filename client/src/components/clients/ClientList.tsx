import { ClientWithUser } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Mail, Phone, MapPin } from "lucide-react";
import { useLocation } from "wouter";

interface ClientListProps {
  clients: ClientWithUser[];
  isLoading: boolean;
  onClientSelect?: (client: ClientWithUser) => void;
}

export function ClientList({ clients, isLoading, onClientSelect }: ClientListProps) {
  const [, setLocation] = useLocation();
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="ml-4 space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center mb-2">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center mb-2">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center mb-4">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <p className="text-gray-500">No clients found.</p>
      </div>
    );
  }

  // Add debugging
  console.log("ClientList rendering with", clients.length, "clients");
  if (clients.length > 0) {
    console.log("First client structure:", clients[0]);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client) => {
        // Ensure client has the correct structure
        const clientId = client.id || client.client?.id;
        const userName = client.user?.name || "Unknown";
        const userEmail = client.user?.email || "No email";
        const companyName = client.companyName || client.client?.companyName;
        const contractType = client.contractType || client.client?.contractType;
        
        // Log each client when rendering for debugging
        console.log(`Rendering client: ID=${clientId}, Name=${userName}, Company=${companyName || 'None'}`);
        
        return (
          <div 
            key={clientId} 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition"
          >
            <div className="flex items-start">
              <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl flex-shrink-0">
                {userName.charAt(0)}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">{userName}</h3>
                {companyName && (
                  <p className="text-sm text-gray-500">{companyName}</p>
                )}
                <Badge 
                  variant="secondary" 
                  className={contractType?.toLowerCase() === "commercial" 
                    ? "bg-blue-100 text-primary" 
                    : contractType?.toLowerCase() === "service" 
                      ? "bg-purple-100 text-purple-600"
                      : contractType?.toLowerCase() === "maintenance" 
                        ? "bg-amber-100 text-amber-600"
                        : "bg-green-100 text-green-600"
                  }
                >
                  {contractType 
                    ? contractType.charAt(0).toUpperCase() + contractType.slice(1).toLowerCase()
                    : "Residential"}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{userEmail}</span>
                </div>
                {(client.user?.phone || client.client?.phone) && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{client.user?.phone || client.client?.phone}</span>
                  </div>
                )}
                {(client.user?.address || client.client?.address) && (
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <span>
                      {client.user?.address || client.client?.address}
                      {client.client?.city && `, ${client.client.city}`}
                      {client.client?.state && `, ${client.client.state}`}
                      {client.client?.zip && ` ${client.client.zip}`}
                    </span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={() => {
                  if (onClientSelect) {
                    onClientSelect(client);
                  } else {
                    // Log client ID before navigation
                    console.log("Navigating to client details for ID:", clientId);
                    setLocation(`/clients/${clientId}`);
                  }
                }}
                variant="outline"
                className="w-full"
              >
                View Details
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}