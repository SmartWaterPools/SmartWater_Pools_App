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
import { Pencil, Trash2, FileText, Shield, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from '@/lib/types';

interface Insurance {
  id: number;
  name: string; // The API returns "name" not "policyName"
  policyNumber: string;
  provider: string;
  startDate: string;
  endDate: string;
  coverageAmount: number; // The API returns "coverageAmount" not "coverage"
  premium: number;
  paymentFrequency?: string;
  status: string;
  documentUrl?: string;
  notes?: string;
  reminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface InsuranceTableProps {
  data: Insurance[];
  isLoading: boolean;
  onEdit?: (insurance: Insurance) => void;
  onDelete?: (id: number) => void;
  onView?: (insurance: Insurance) => void;
}

export default function InsuranceTable({ 
  data, 
  isLoading,
  onEdit,
  onDelete,
  onView
}: InsuranceTableProps) {
  // Check if data is available
  const hasInsurance = data && data.length > 0;
  
  // Calculate days until expiry
  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status badge
  const getStatusBadge = (status: string, endDate: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(endDate);
    
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
      return <Badge className="bg-blue-500 hover:bg-blue-600">Pending Renewal</Badge>;
    } else {
      return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <p>Loading insurance policies...</p>
          </div>
        ) : !hasInsurance ? (
          <div className="flex justify-center items-center p-8 text-center">
            <div>
              <Shield className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No insurance policies found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add an insurance policy to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Policy Number</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((insurance) => (
                  <TableRow key={insurance.id}>
                    <TableCell className="font-medium">{insurance.name}</TableCell>
                    <TableCell>{insurance.provider}</TableCell>
                    <TableCell>{insurance.policyNumber}</TableCell>
                    <TableCell>{formatCurrency(insurance.coverageAmount)}</TableCell>
                    <TableCell>{formatCurrency(insurance.premium)}</TableCell>
                    <TableCell>{formatDate(new Date(insurance.endDate))}</TableCell>
                    <TableCell>
                      {getStatusBadge(insurance.status, insurance.endDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {onView && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => onView(insurance)}
                            title="View Details"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => onEdit(insurance)}
                            title="Edit Insurance"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-red-500"
                            onClick={() => onDelete(insurance.id)}
                            title="Delete Insurance"
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