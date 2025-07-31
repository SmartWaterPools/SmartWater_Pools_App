import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Navigation,
  Camera,
  Package,
  Users,
  MessageSquare
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../../contexts/AuthContext";
import { useIsMobile } from "../../hooks/use-mobile";
import { MobileQuickActions } from "../mobile/MobileQuickActions";
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { SwipeableCard } from "../mobile/SwipeableCard";

/**
 * Technician Dashboard Component
 * 
 * Field-focused dashboard for technicians with today's route,
 * task progress, and quick action tools.
 */
export const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [showRouteDetails, setShowRouteDetails] = useState(false);

  // Fetch technician-specific dashboard data
  const { data: technicianData, isLoading } = useQuery({
    queryKey: ['/api/technician/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/technician/dashboard');
      if (!response.ok) throw new Error('Failed to fetch technician dashboard');
      return response.json();
    }
  });

  const { data: todaysRoute } = useQuery({
    queryKey: ['/api/technician/todays-route'],
    queryFn: async () => {
      const response = await fetch('/api/technician/todays-route');
      if (!response.ok) throw new Error('Failed to fetch today\'s route');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const data = technicianData || {
    todaysTasks: 0,
    completedTasks: 0,
    urgentTasks: 0,
    routeProgress: 0,
    nextClient: null,
    estimatedCompletion: null
  };

  const route = todaysRoute || { stops: [], totalDistance: 0, estimatedTime: 0 };
  const progressPercent = data.todaysTasks > 0 ? (data.completedTasks / data.todaysTasks) * 100 : 0;

  // Mobile-specific quick actions
  const mobileQuickActions = [
    {
      label: 'Start Route',
      icon: Navigation,
      href: '/technician/routes/start',
      variant: 'default' as const
    },
    {
      label: 'Take Photo',
      icon: Camera,
      href: '/technician/documentation',
      variant: 'outline' as const
    },
    {
      label: 'Report Issue',
      icon: AlertTriangle,
      href: '/repairs/new',
      variant: 'destructive' as const
    },
    {
      label: 'Messages',
      icon: MessageSquare,
      href: '/communications',
      variant: 'outline' as const,
      badge: 3
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with greeting - Mobile Optimized */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Good Morning, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3">
          <Link href="/technician/routes/start">
            <Button className="w-full sm:w-auto">
              <Navigation className="h-4 w-4 mr-2" />
              Start Route
            </Button>
          </Link>
          <Link href="/repairs/new">
            <Button variant="outline" className="w-full sm:w-auto">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Quick Actions - Only show on mobile */}
      {isMobile && (
        <MobileQuickActions 
          actions={mobileQuickActions}
          className="mb-4"
        />
      )}

      {/* Today's Progress - Mobile First Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.completedTasks} / {data.todaysTasks}
            </div>
            <Progress value={progressPercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(progressPercent)}% complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{data.urgentTasks}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Completion</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.estimatedCompletion || '4:30 PM'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on current progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Client Info - Mobile Optimized */}
      {data.nextClient && (
        <SwipeableCard 
          className="border-blue-200 bg-blue-50"
          title="Next Stop"
          subtitle={`${data.nextClient.estimatedTime} min drive`}
          actions={
            <Badge variant="outline" className="bg-white">
              {data.nextClient.estimatedTime} min
            </Badge>
          }
          onSwipeLeft={() => {
            // Quick action: Skip/Reschedule
            console.log('Swipe left: Reschedule');
          }}
          onSwipeRight={() => {
            // Quick action: Navigate
            window.open(`https://maps.google.com/?q=${encodeURIComponent(data.nextClient.address)}`, '_blank');
          }}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-blue-900 text-lg">{data.nextClient.name}</h3>
                <p className="text-blue-700 text-sm">{data.nextClient.address}</p>
                <p className="text-sm text-blue-600 mt-1">
                  Service: {data.nextClient.serviceType}
                </p>
                {data.nextClient.notes && (
                  <p className="text-sm text-blue-600 mt-1 bg-blue-100 p-2 rounded">
                    📝 {data.nextClient.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={`/clients/${data.nextClient.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  View Details
                </Button>
              </Link>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(data.nextClient.address)}`, '_blank')}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigate
              </Button>
            </div>
            {isMobile && (
              <p className="text-xs text-blue-600 text-center mt-2">
                💡 Swipe left to reschedule, right to navigate
              </p>
            )}
          </div>
        </SwipeableCard>
      )}

      {/* Today's Route Overview - Mobile Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Today's Schedule
              </CardTitle>
              {isMobile && route.stops?.length > 3 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowRouteDetails(true)}
                >
                  View All ({route.stops.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {route.stops?.length > 0 ? (
                (isMobile ? route.stops.slice(0, 3) : route.stops).map((stop: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        stop.completed 
                          ? 'bg-green-100 text-green-800' 
                          : stop.current 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stop.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{stop.clientName}</p>
                        <p className="text-sm text-gray-600 truncate">{stop.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{stop.scheduledTime}</p>
                      <Badge variant={stop.serviceType === 'maintenance' ? 'default' : 'secondary'}>
                        {stop.serviceType}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No scheduled stops today</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Field Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/maintenance/new">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Wrench className="h-6 w-6 mb-2" />
                  <span className="text-sm">Log Maintenance</span>
                </Button>
              </Link>
              <Link href="/technician/photos">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Camera className="h-6 w-6 mb-2" />
                  <span className="text-sm">Take Photos</span>
                </Button>
              </Link>
              <Link href="/inventory/update">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Package className="h-6 w-6 mb-2" />
                  <span className="text-sm">Update Inventory</span>
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="outline" className="w-full h-20 flex flex-col">
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">Client Info</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Bottom Sheet for Full Route Details */}
      {isMobile && (
        <MobileBottomSheet
          isOpen={showRouteDetails}
          onClose={() => setShowRouteDetails(false)}
          title="Today's Full Schedule"
          snapPoints={['half', 'full']}
          defaultSnap="half"
        >
          <div className="space-y-3">
            {route.stops?.length > 0 ? (
              route.stops.map((stop: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      stop.completed 
                        ? 'bg-green-100 text-green-800' 
                        : stop.current 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {stop.completed ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{stop.clientName}</p>
                      <p className="text-sm text-gray-600">{stop.address}</p>
                      {stop.notes && (
                        <p className="text-xs text-gray-500 mt-1">{stop.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{stop.scheduledTime}</p>
                    <Badge variant={stop.serviceType === 'maintenance' ? 'default' : 'secondary'}>
                      {stop.serviceType}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No scheduled stops today</p>
            )}
          </div>
        </MobileBottomSheet>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Completed maintenance at Johnson Pool</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Uploaded before/after photos</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium">Reported equipment issue at Smith Pool</p>
                <p className="text-sm text-gray-600">Yesterday</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianDashboard;