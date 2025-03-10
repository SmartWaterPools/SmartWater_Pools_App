import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText, AlertCircle } from "lucide-react";
import { formatDate } from '@/lib/types';

interface License {
  id: number;
  name: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: string;
  documentUrl?: string;
  notes?: string;
  reminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface LicensesTableProps {
  data: License[];
  isLoading: boolean;
  onEdit?: (license: License) => void;
  onDelete?: (id: number) => void;
  onView?: (license: License) => void;
}

export default function LicensesTable({ 
  data, 
  isLoading,
  onEdit,
  onDelete,
  onView
}: LicensesTableProps) {
  // Check if data is available
  const hasLicenses = data && data.length > 0;
  
  // Calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status badge
  const getStatusBadge = (status: string, expiryDate: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    
    if (status === 'active' && daysUntilExpiry <= 30) {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expiring Soon
        </Badge>
      );
    } else if (status === 'active') {
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    } else if (status === 'expired') {
      return <Badge className="bg-red-500 hover:bg-red-600">Expired</Badge>;
    } else if (status === 'pending') {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Pending</Badge>;
    } else {
      return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <p>Loading licenses...</p>
          </div>
        ) : !hasLicenses ? (
          <div className="flex justify-center items-center p-8 text-center">
            <div>
              <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No licenses found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a license to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issuing Authority</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell className="font-medium">{license.name}</TableCell>
                    <TableCell>{license.licenseNumber}</TableCell>
                    <TableCell>{license.issuingAuthority}</TableCell>
                    <TableCell>{formatDate(new Date(license.issueDate))}</TableCell>
                    <TableCell>{formatDate(new Date(license.expiryDate))}</TableCell>
                    <TableCell>
                      {getStatusBadge(license.status, license.expiryDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => onView(license)}
                            title="View Details"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => onEdit(license)}
                            title="Edit License"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-red-500"
                            onClick={() => onDelete(license.id)}
                            title="Delete License"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}