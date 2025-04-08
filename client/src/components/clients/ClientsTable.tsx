import React from "react";
import { useLocation } from "wouter";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Eye, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Building2,
  Wrench,
  Calendar,
  Settings,
  PlusCircle
} from "lucide-react";
import { ClientWithUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableEnhanced } from "@/components/ui/data-table-enhanced";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClientsTableProps {
  clients: ClientWithUser[];
  isLoading: boolean;
}

export function ClientsTable({ clients, isLoading }: ClientsTableProps) {
  const [_, setLocation] = useLocation();

  // Column definitions for the clients table
  const columns: ColumnDef<ClientWithUser>[] = [
    {
      accessorFn: (row) => row.user?.name || "Unknown",
      id: "user.name",
      header: "Client Name",
      cell: ({ row }) => {
        const client = row.original as unknown as ClientWithUser;
        
        if (!client || !client.user) {
          return (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm flex-shrink-0">
                ?
              </div>
              <div>
                <div className="font-medium">Unknown Client</div>
              </div>
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm flex-shrink-0">
              {client.user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{client.user.name}</div>
              {client.client?.companyName && (
                <div className="text-xs text-muted-foreground">{client.client.companyName}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "contractType",
      header: "Type",
      cell: ({ row }) => {
        const contractType = row.getValue("contractType") as string | null;
        const displayType = contractType 
          ? contractType.charAt(0).toUpperCase() + contractType.slice(1).toLowerCase()
          : "Residential";
          
        let badgeClass = "";
        let icon = <User className="h-3 w-3 mr-1" />;
        
        switch(contractType?.toLowerCase()) {
          case "commercial":
            badgeClass = "bg-blue-100 text-primary border-blue-200"; 
            icon = <Building2 className="h-3 w-3 mr-1" />;
            break;
          case "service":
            badgeClass = "bg-purple-100 text-purple-600 border-purple-200";
            icon = <Wrench className="h-3 w-3 mr-1" />;
            break;
          case "maintenance":
            badgeClass = "bg-amber-100 text-amber-600 border-amber-200"; 
            icon = <Calendar className="h-3 w-3 mr-1" />;
            break;
          default:
            badgeClass = "bg-green-100 text-green-600 border-green-200";
            icon = <User className="h-3 w-3 mr-1" />;
        }
        
        return (
          <Badge variant="outline" className={`flex items-center ${badgeClass}`}>
            {icon}
            {displayType}
          </Badge>
        );
      },
    },
    {
      accessorFn: (row) => row.user?.email || "N/A",
      id: "user.email",
      header: "Email",
      cell: ({ row }) => {
        const client = row.original as unknown as ClientWithUser;
        
        if (!client || !client.user) return (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">N/A</span>
          </div>
        );
        
        const email = client.user.email;
        
        // If email is too long, truncate and add tooltip
        const displayEmail = email.length > 25 ? `${email.substring(0, 22)}...` : email;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{displayEmail}</span>
                </div>
              </TooltipTrigger>
              {email.length > 25 && (
                <TooltipContent>
                  <p>{email}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorFn: (row) => {
        // Try user's phone first, then client's phone
        return row?.user?.phone || row?.client?.phone || "N/A";
      },
      id: "user.phone",
      header: "Phone",
      cell: ({ row }) => {
        const client = row.original as unknown as ClientWithUser;
        
        if (!client || !client.user) return (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">N/A</span>
          </div>
        );
        
        // Get phone from user object first, then try client object
        const phone = client.user.phone || client.client?.phone || "N/A";
        
        // Debug log
        console.log("Phone data for client:", client.user.name, {
          userPhone: client.user.phone,
          clientPhone: client.client?.phone,
          finalPhone: phone
        });
        
        return (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm whitespace-nowrap">{phone}</span>
          </div>
        );
      },
    },
    {
      accessorFn: (row) => {
        // Try to get address from user object first, then client object
        const user = row?.user;
        const client = row?.client;
        
        if (!user && !client) return "N/A";
        
        // Use user data first if available
        if (user && user.address) {
          return user.address || "N/A";
        }
        
        // Fallback to client data if user data not available
        if (client && client.address) {
          const address = client.address || "";
          const city = client.city || "";
          const state = client.state || "";
          const zip = client.zip || "";
          
          return address 
            ? `${address}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${zip ? ` ${zip}` : ""}`
            : "N/A";
        }
        
        return "N/A";
      },
      id: "user.address",
      header: "Address",
      cell: ({ row }) => {
        const client = row.original as unknown as ClientWithUser;
        
        if (!client || !client.user) return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">N/A</span>
          </div>
        );
        
        // First try to get address from user object
        let fullAddress = client.user.address || "N/A";
        
        // If user object doesn't have address, check client object
        if (fullAddress === "N/A" && client.client?.address) {
          fullAddress = `${client.client.address}${client.client.city ? `, ${client.client.city}` : ""}${client.client.state ? `, ${client.client.state}` : ""}${client.client.zip ? ` ${client.client.zip}` : ""}`;
        }
        
        // Debug log for address data
        console.log("Address data for client:", client.user.name, {
          userAddress: client.user.address,
          clientAddress: client.client?.address ? `${client.client.address}, ${client.client.city}, ${client.client.state}` : null,
          finalAddress: fullAddress
        });
        
        // Truncate for display
        const displayAddress = fullAddress.length > 30 
          ? `${fullAddress.substring(0, 27)}...` 
          : fullAddress;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[200px]">
                    {displayAddress}
                  </span>
                </div>
              </TooltipTrigger>
              {fullAddress.length > 30 && (
                <TooltipContent>
                  <p>{fullAddress}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original as unknown as ClientWithUser;
        
        if (!client) return null;
        
        const clientId = client.id || client.client?.id;
        
        if (!clientId) return null;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(clientId.toString())}
              >
                Copy client ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation(`/clients/${clientId}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation(`/clients/${clientId}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete client "${client.user?.name || 'Unknown'}"?`)) {
                    // For now just alert - would implement actual deletion with API
                    alert("Delete functionality would be implemented here");
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter configuration for the data table based on Bazza UI design
  const filterableColumns = [
    {
      id: "user.name",
      title: "Client Name",
      type: "text" as const,
      placeholder: "Filter by name...",
      operators: [
        { label: "Contains", value: "contains" },
        { label: "Equals", value: "equals" },
        { label: "Starts with", value: "startsWith" },
      ]
    },
    {
      id: "contractType",
      title: "Client Type",
      type: "select" as const,
      options: [
        { label: "Residential", value: "residential", icon: User },
        { label: "Commercial", value: "commercial", icon: Building2 },
        { label: "Service", value: "service", icon: Wrench },
        { label: "Maintenance", value: "maintenance", icon: Calendar },
      ],
    },
    {
      id: "user.email",
      title: "Email",
      type: "text" as const,
      placeholder: "Filter by email...",
      operators: [
        { label: "Contains", value: "contains" },
        { label: "Equals", value: "equals" },
        { label: "Starts with", value: "startsWith" },
      ]
    },
    {
      id: "client.phone",
      title: "Phone",
      type: "text" as const,
      placeholder: "Filter by phone...",
    },
    {
      id: "client.address",
      title: "Address",
      type: "text" as const,
      placeholder: "Filter by address...",
    },
    {
      id: "client.city",
      title: "City",
      type: "text" as const,
      placeholder: "Filter by city...",
    },
    {
      id: "client.state",
      title: "State",
      type: "text" as const,
      placeholder: "Filter by state...",
    },
  ];

  if (isLoading) {
    return <div className="p-8 flex justify-center">Loading clients...</div>;
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-muted-foreground">
        <Settings className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
        <h3 className="text-lg font-medium mb-1">No clients found</h3>
        <p className="mb-4 text-sm">No clients match your current filters or search criteria.</p>
        <Button
          onClick={() => setLocation("/clients/add")}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Client
        </Button>
      </div>
    );
  }

  // Log client data for debugging purposes
  console.log("Client data sample:", clients.slice(0, 1));

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-full sm:rounded-md">
          <DataTableEnhanced
            columns={columns}
            data={clients}
            filterableColumns={filterableColumns}
            globalSearchPlaceholder="Search all client data..."
            enableGlobalSearch={true}
            enablePagination={true}
            enableColumnVisibility={true}
          />
        </div>
      </div>
    </div>
  );
}