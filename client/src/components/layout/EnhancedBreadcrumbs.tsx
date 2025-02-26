import React, { useMemo } from 'react';
import { useLocation } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useQuery } from '@tanstack/react-query';
import { ClientWithUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTabs } from './EnhancedTabManager';

// Define a breadcrumb type
interface BreadcrumbSegment {
  title: string;
  path: string;
  icon?: React.ReactNode;
}

export function EnhancedBreadcrumbs() {
  const [location] = useLocation();
  const { addTab } = useTabs();
  
  // Parse the current location path
  const segments = useMemo(() => {
    return location.split('/').filter(Boolean);
  }, [location]);
  
  // Check if this is a client details or edit page
  const clientDetailsMatch = location.match(/^\/clients\/(\d+)$/);
  const clientEditMatch = location.match(/^\/clients\/(\d+)\/edit$/);
  const clientId = clientDetailsMatch ? parseInt(clientDetailsMatch[1]) : 
                   clientEditMatch ? parseInt(clientEditMatch[1]) : null;
  
  // Fetch client data if this is a client-related page
  const { data: clientData, isLoading: isLoadingClient } = useQuery<ClientWithUser>({
    queryKey: ['/api/clients', clientId],
    enabled: !!clientId,
    retry: 3,
    staleTime: 5000,
  });
  
  // Get a formatted client name for display
  const getClientDisplayName = (clientData: ClientWithUser | undefined, clientId: number | null, isLoading: boolean) => {
    if (isLoading) {
      return 'Loading...';
    }
    
    if (clientData && clientData.user && clientData.user.name) {
      const nameParts = clientData.user.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      return `${firstName} ${lastName}`;
    }
    
    // If there's a client ID but no data, use the ID
    return clientId ? `Client ${clientId}` : 'Client';
  };
  
  // Generate breadcrumb segments based on the current path
  const breadcrumbSegments = useMemo(() => {
    const result: BreadcrumbSegment[] = [];
    
    // Always start with home/dashboard
    result.push({
      title: 'Dashboard',
      path: '/',
      icon: <Home className="h-3.5 w-3.5" />
    });
    
    // Special case for client edit page
    if (clientEditMatch && clientId) {
      const clientName = getClientDisplayName(clientData, clientId, isLoadingClient);
      
      result.push(
        {
          title: 'Clients',
          path: '/clients'
        },
        {
          title: clientName,
          path: `/clients/${clientId}`
        },
        {
          title: 'Edit',
          path: `/clients/${clientId}/edit`
        }
      );
      
      return result;
    }
    
    // Special case for client details page
    if (clientDetailsMatch && clientId) {
      const clientName = getClientDisplayName(clientData, clientId, isLoadingClient);
      
      result.push(
        {
          title: 'Clients',
          path: '/clients'
        },
        {
          title: clientName,
          path: `/clients/${clientId}`
        }
      );
      
      return result;
    }
    
    // Handle standard paths
    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      
      // Format the segment name
      let title = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
      // Special cases for specific paths
      if (segment === 'clients') {
        title = 'Clients';
      } else if (segment === 'projects') {
        title = 'Projects';
      } else if (segment === 'maintenance') {
        title = 'Maintenance';
      } else if (segment === 'repairs') {
        title = 'Repairs';
      } else if (segment === 'technicians') {
        title = 'Technicians';
      }
      
      result.push({
        title,
        path: currentPath
      });
    }
    
    return result;
  }, [segments, clientDetailsMatch, clientEditMatch, clientId, clientData, isLoadingClient]);
  
  // Handle navigation with tabs
  const handleBreadcrumbClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    // Get the title for the tab based on the path parts
    const pathParts = path.split('/').filter(Boolean);
    const title = pathParts.length > 0 ? 
      pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1) : 
      'Dashboard';
    
    // Add or navigate to the tab
    addTab(path, title, false);
  };
  
  // If we're at the root with no segments, don't show breadcrumbs
  if (segments.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbSegments.map((segment, index) => {
            const isFirst = index === 0;
            const isLast = index === breadcrumbSegments.length - 1;
            
            return (
              <React.Fragment key={segment.path}>
                {!isFirst && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                )}
                
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>
                      {segment.icon && (
                        <span className="mr-1 inline-flex items-center">
                          {segment.icon}
                        </span>
                      )}
                      <span>{segment.title}</span>
                    </BreadcrumbPage>
                  ) : (
                    <div
                      className={cn(
                        "cursor-pointer hover:text-primary transition-colors",
                        isFirst && "flex items-center"
                      )}
                      onClick={(e) => handleBreadcrumbClick(e, segment.path)}
                    >
                      {segment.icon && (
                        <span className="mr-1 inline-flex items-center">
                          {segment.icon}
                        </span>
                      )}
                      <span className={isFirst ? "sr-only sm:not-sr-only sm:inline" : ""}>
                        {segment.title}
                      </span>
                    </div>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}