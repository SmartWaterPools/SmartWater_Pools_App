import { useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useQuery } from "@tanstack/react-query";
import { ClientWithUser } from "@/lib/types";

export function Breadcrumbs() {
  const [location] = useLocation();
  
  // Get the path segments
  const segments = location.split('/').filter(Boolean);
  
  // Check if this is a client details or edit page
  const clientDetailsMatch = location.match(/^\/clients\/(\d+)$/);
  const clientEditMatch = location.match(/^\/clients\/(\d+)\/edit$/);
  const clientId = clientDetailsMatch ? parseInt(clientDetailsMatch[1]) : 
                   clientEditMatch ? parseInt(clientEditMatch[1]) : null;
  
  // Fetch client data if this is a client-related page
  const { data: clientData } = useQuery<ClientWithUser>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
  });
  
  // Get a formatted client name for display
  const getClientDisplayName = (clientData: ClientWithUser | undefined, clientId: number | null) => {
    if (clientData && clientData.user && clientData.user.name) {
      const nameParts = clientData.user.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      return `${firstName} ${lastName}`;
    }
    return clientId ? `Client ${clientId}` : 'Client';
  };
  
  // If we're at the root with no segments, don't show breadcrumbs
  if (segments.length === 0) {
    return null;
  }
  
  // Special case for client edit page
  if (clientEditMatch && clientId) {
    const clientName = getClientDisplayName(clientData, clientId);
    
    return (
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center">
                <Home className="h-3.5 w-3.5 mr-1" />
                <span className="sr-only sm:not-sr-only sm:inline">Dashboard</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            
            <BreadcrumbItem>
              <BreadcrumbLink href="/clients">Clients</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            
            <BreadcrumbItem>
              <BreadcrumbLink href={`/clients/${clientId}`}>
                {clientName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }
  
  // Special case for client details page
  if (clientDetailsMatch && clientId && clientData) {
    const clientName = getClientDisplayName(clientData, clientId);
    
    return (
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center">
                <Home className="h-3.5 w-3.5 mr-1" />
                <span className="sr-only sm:not-sr-only sm:inline">Dashboard</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            
            <BreadcrumbItem>
              <BreadcrumbLink href="/clients">Clients</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            
            <BreadcrumbItem>
              <BreadcrumbPage>{clientName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }
  
  // Special case for add client page
  if (location === '/clients/add') {
    return (
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center">
                <Home className="h-3.5 w-3.5 mr-1" />
                <span className="sr-only sm:not-sr-only sm:inline">Dashboard</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            
            <BreadcrumbItem>
              <BreadcrumbLink href="/clients">Clients</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            
            <BreadcrumbItem>
              <BreadcrumbPage>Add Client</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }
  
  // Default case - handle all other routes
  return (
    <div className="mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center">
              <Home className="h-3.5 w-3.5 mr-1" />
              <span className="sr-only sm:not-sr-only sm:inline">Dashboard</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {segments.map((segment, index) => {
            const path = `/${segments.slice(0, index + 1).join('/')}`;
            const isLast = index === segments.length - 1;
            
            // Format the segment name
            let name = segment
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
              
            // Special case for 'clients'
            if (segment === 'clients') {
              name = 'Clients';
            }
            
            return (
              <BreadcrumbItem key={path}>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                {isLast ? (
                  <BreadcrumbPage>{name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={path}>{name}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}