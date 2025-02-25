import { ClientWithUser } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Mail, Phone, MapPin } from "lucide-react";

interface ClientListProps {
  clients: ClientWithUser[];
  isLoading: boolean;
  onClientSelect: (client: ClientWithUser) => void;
}

export function ClientList({ clients, isLoading, onClientSelect }: ClientListProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client) => (
        <div 
          key={client.id} 
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition"
        >
          <div className="flex items-start">
            <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl flex-shrink-0">
              {client.user.name.charAt(0)}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{client.user.name}</h3>
              {client.companyName && (
                <p className="text-sm text-gray-500">{client.companyName}</p>
              )}
              <Badge 
                variant="secondary" 
                className={client.contractType === "Commercial" ? "bg-blue-100 text-primary" : "bg-green-100 text-green-600"}
              >
                {client.contractType}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <span>{client.user.email}</span>
              </div>
              {client.user.phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{client.user.phone}</span>
                </div>
              )}
              {client.user.address && (
                <div className="flex items-start text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <span>{client.user.address}</span>
                </div>
              )}
            </div>
            
            <Button
              onClick={() => onClientSelect(client)}
              variant="outline"
              className="w-full"
            >
              View Details
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}