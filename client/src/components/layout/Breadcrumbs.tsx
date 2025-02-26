import { useRoute, useLocation } from "wouter";
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
  
  // Generate breadcrumb items based on path
  const getBreadcrumbItems = () => {
    const items = [];
    let currentPath = '';
    
    // Always include Home
    items.push({
      name: 'Home',
      path: '/',
      current: location === '/'
    });
    
    // Add intermediate segments
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Special case for client details - use client name instead of ID
      if (segment === 'clients' && index === 0) {
        items.push({
          name: 'Clients',
          path: currentPath,
          current: index === segments.length - 1
        });
      } else if (clientData && clientId && segment === clientId.toString()) {
        // For client detail pages, use the client's name instead of ID
        if (clientData && clientData.user && clientData.user.name) {
          const nameParts = clientData.user.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          
          items.push({
            name: `${firstName} ${lastName}`,
            path: currentPath,
            current: index === segments.length - 1
          });
        } else {
          // Fallback if user data isn't available yet
          items.push({
            name: `Client ${clientId}`,
            path: currentPath,
            current: index === segments.length - 1
          });
        }
      } else if (segment === 'edit' && clientData && segments[index-1] === clientId?.toString()) {
        // Handle edit page for client
        items.push({
          name: 'Edit',
          path: currentPath,
          current: index === segments.length - 1
        });
      } else if (segment === 'add' && segments[index-1] === 'clients') {
        // Handle add new client page
        items.push({
          name: 'Add Client',
          path: currentPath,
          current: index === segments.length - 1
        });
      } else {
        // Default case - just capitalize the segment
        const displayName = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        items.push({
          name: displayName,
          path: currentPath,
          current: index === segments.length - 1
        });
      }
    });
    
    return items;
  };
  
  const breadcrumbItems = getBreadcrumbItems();
  
  // If we're at the root with no segments, don't show breadcrumbs
  if (segments.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <BreadcrumbItem key={item.path}>
              {index === 0 ? (
                <BreadcrumbLink href={item.path} className="flex items-center">
                  <Home className="h-3.5 w-3.5 mr-1" />
                  <span className="sr-only sm:not-sr-only sm:inline">Dashboard</span>
                </BreadcrumbLink>
              ) : index === breadcrumbItems.length - 1 ? (
                <BreadcrumbPage>{item.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.path}>{item.name}</BreadcrumbLink>
              )}
              
              {index < breadcrumbItems.length - 1 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}