import React from "react";
import { useLocation } from "wouter";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin } from "lucide-react";
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

interface ClientsTableProps {
  clients: ClientWithUser[];
  isLoading: boolean;
}

export function ClientsTable({ clients, isLoading }: ClientsTableProps) {
  const [_, setLocation] = useLocation();

  // Column definitions for the clients table
  const columns: ColumnDef<ClientWithUser>[] = [
    {
      accessorFn: (row) => row.user.name,
      header: "Client Name",
      cell: ({ row }) => {
        const client = row.getValue("user.name") 
          ? row.original as unknown as ClientWithUser 
          : null;
          
        if (!client) return null;
        
        return (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm flex-shrink-0">
              {client.user.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium">{client.user.name}</div>
              {client.companyName && (
                <div className="text-xs text-muted-foreground">{client.companyName}</div>
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
          
        const badgeClass = contractType?.toLowerCase() === "commercial" 
          ? "bg-blue-100 text-primary border-blue-200" 
          : contractType?.toLowerCase() === "service" 
            ? "bg-purple-100 text-purple-600 border-purple-200"
            : contractType?.toLowerCase() === "maintenance" 
              ? "bg-amber-100 text-amber-600 border-amber-200"
              : "bg-green-100 text-green-600 border-green-200";
        
        return (
          <Badge variant="outline" className={badgeClass}>
            {displayType}
          </Badge>
        );
      },
    },
    {
      accessorFn: (row) => row.user.email,
      header: "Email",
      cell: ({ row }) => {
        const client = row.getValue("user.name") 
          ? row.original as unknown as ClientWithUser 
          : null;
          
        if (!client) return null;
        
        const email = client.user.email;
        return (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{email}</span>
          </div>
        );
      },
    },
    {
      accessorFn: (row) => row.client.phone || "N/A",
      header: "Phone",
      cell: ({ row }) => {
        const client = row.getValue("user.name") 
          ? row.original as unknown as ClientWithUser 
          : null;
          
        if (!client) return null;
        
        const phone = client.client.phone;
        return (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{phone || "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorFn: (row) => {
        if (!row.client) return "N/A";
        
        const address = row.client.address || "";
        const city = row.client.city || "";
        const state = row.client.state || "";
        const zip = row.client.zip || "";
        
        return address 
          ? `${address}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${zip ? ` ${zip}` : ""}`
          : "N/A";
      },
      header: "Address",
      cell: ({ row }) => {
        const client = row.getValue("user.name") 
          ? row.original as unknown as ClientWithUser 
          : null;
          
        if (!client) return null;
        
        const hasAddress = !!client.client.address;
        
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate max-w-[200px]">
              {hasAddress ? (
                <>
                  {client.client.address}
                  {client.client.city && `, ${client.client.city}`}
                  {client.client.state && `, ${client.client.state}`}
                  {client.client.zip && ` ${client.client.zip}`}
                </>
              ) : (
                "N/A"
              )}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.getValue("user.name") 
          ? row.original as unknown as ClientWithUser 
          : null;
          
        if (!client) return null;
        
        const clientId = client.id || client.client.id;
        
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
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter configuration for the data table
  const filterableColumns = [
    {
      id: "user.name",
      title: "Client Name",
      type: "text" as const,
    },
    {
      id: "contractType",
      title: "Type",
      type: "select" as const,
      options: [
        { label: "Residential", value: "residential" },
        { label: "Commercial", value: "commercial" },
        { label: "Service", value: "service" },
        { label: "Maintenance", value: "maintenance" },
      ],
    },
    {
      id: "user.email",
      title: "Email",
      type: "text" as const,
    },
    {
      id: "client.phone",
      title: "Phone",
      type: "text" as const,
    },
    {
      id: "client.address",
      title: "Address",
      type: "text" as const,
    },
  ];

  if (isLoading) {
    return <div className="p-8 flex justify-center">Loading clients...</div>;
  }

  if (!clients || clients.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No clients found.</div>;
  }

  return (
    <div className="space-y-4">
      <DataTableEnhanced
        columns={columns}
        data={clients}
        filterableColumns={filterableColumns}
        globalSearchPlaceholder="Search clients..."
        enableGlobalSearch={true}
        enablePagination={true}
        enableColumnVisibility={true}
      />
    </div>
  );
}