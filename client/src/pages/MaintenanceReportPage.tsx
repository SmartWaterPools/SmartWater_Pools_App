import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import MaintenanceReportForm from '@/components/maintenance/MaintenanceReportForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Home, User, Calendar, MapPin, Phone, SquareUser, Clock, Mail, Wrench, Route } from 'lucide-react';
import { format } from 'date-fns';

export default function MaintenanceReportPage() {
  const { id } = useParams<{ id: string }>();
  const maintenanceId = parseInt(id || '0', 10);
  const navigate = useNavigate();
  
  // Fetch maintenance details with client and technician info
  const { data: maintenance, isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ['/api/maintenances', maintenanceId],
    queryFn: () => apiRequest(`/api/maintenances/${maintenanceId}`),
    enabled: !!maintenanceId,
  });
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not scheduled';
    
    try {
      return format(new Date(dateString), 'PPP');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Format time for display
  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    
    try {
      return format(new Date(dateString), 'p');
    } catch (e) {
      return '';
    }
  };
  
  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex flex-col gap-6">
        {/* Header with breadcrumb nav */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Maintenance Report</h1>
              {isLoadingMaintenance ? (
                <Skeleton className="h-5 w-60 mt-1" />
              ) : (
                <p className="text-muted-foreground">
                  {maintenance ? (
                    <>
                      Maintenance ID: {maintenance.id} • 
                      {maintenance.status === 'completed' ? (
                        <span className="text-green-600 font-medium ml-1">Completed</span>
                      ) : maintenance.status === 'in_progress' ? (
                        <span className="text-amber-600 font-medium ml-1">In Progress</span>
                      ) : (
                        <span className="text-gray-600 font-medium ml-1">Scheduled</span>
                      )}
                    </>
                  ) : (
                    'Maintenance not found'
                  )}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/maintenance')}>
                <Calendar className="h-4 w-4 mr-1" />
                Maintenance Calendar
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
        
        {/* Info Panel */}
        {isLoadingMaintenance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <Skeleton className="h-5 w-32 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <Skeleton className="h-5 w-32 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        ) : maintenance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Info */}
            <div className="rounded-lg border p-4">
              <h2 className="font-semibold text-sm text-muted-foreground mb-3">CLIENT INFORMATION</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {maintenance.client?.user?.name || 'Unknown Client'}
                    </div>
                    {maintenance.client?.companyName && (
                      <div className="text-sm text-muted-foreground">
                        {maintenance.client.companyName}
                      </div>
                    )}
                  </div>
                </div>
                
                {maintenance.client?.user?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${maintenance.client.user.email}`} className="text-sm hover:underline">
                      {maintenance.client.user.email}
                    </a>
                  </div>
                )}
                
                {maintenance.client?.user?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${maintenance.client.user.phone}`} className="text-sm hover:underline">
                      {maintenance.client.user.phone}
                    </a>
                  </div>
                )}
                
                {maintenance.client && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      {maintenance.client.address && (
                        <div>{maintenance.client.address}</div>
                      )}
                      {maintenance.client.city && (
                        <div>
                          {maintenance.client.city}
                          {maintenance.client.state ? `, ${maintenance.client.state}` : ''}
                          {maintenance.client.zipCode ? ` ${maintenance.client.zipCode}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {maintenance.client && (
                  <div className="flex flex-col gap-1 mt-2 pt-2 border-t">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Pool Type</span>
                      <span className="text-xs font-medium">{maintenance.client.poolType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Pool Size</span>
                      <span className="text-xs font-medium">{maintenance.client.poolSize || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Filter Type</span>
                      <span className="text-xs font-medium">{maintenance.client.filterType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Contract Type</span>
                      <span className="text-xs font-medium capitalize">{maintenance.client.contractType || 'Not specified'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Maintenance Info */}
            <div className="rounded-lg border p-4">
              <h2 className="font-semibold text-sm text-muted-foreground mb-3">SERVICE INFORMATION</h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{formatDate(maintenance.scheduleDate)}</span>
                    {maintenance.scheduleDate && (
                      <span className="text-sm text-muted-foreground ml-1">
                        {formatTime(maintenance.scheduleDate)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <SquareUser className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {maintenance.technician?.user?.name || 'Not Assigned'}
                    </div>
                    {maintenance.technician?.user?.phone && (
                      <a href={`tel:${maintenance.technician.user.phone}`} className="text-sm text-muted-foreground hover:underline">
                        {maintenance.technician.user.phone}
                      </a>
                    )}
                  </div>
                </div>
                
                {maintenance.type && (
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <div className="font-medium capitalize">{maintenance.type} Service</div>
                  </div>
                )}
                
                {maintenance.routeName && (
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">Route: {maintenance.routeName}</div>
                  </div>
                )}
                
                {maintenance.notes && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm">{maintenance.notes}</div>
                  </div>
                )}
                
                {maintenance.completionDate && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                      <div className="text-sm font-medium">{formatDate(maintenance.completionDate)} {formatTime(maintenance.completionDate)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border p-6 text-center">
            <h2 className="font-semibold text-lg mb-2">Maintenance Not Found</h2>
            <p className="text-muted-foreground mb-4">The maintenance record you're looking for doesn't exist or you may not have permission to view it.</p>
            <Button onClick={() => navigate('/maintenance')}>
              Return to Maintenance List
            </Button>
          </div>
        )}
        
        {/* Report Form */}
        {maintenance && <MaintenanceReportForm />}
      </div>
    </div>
  );
}