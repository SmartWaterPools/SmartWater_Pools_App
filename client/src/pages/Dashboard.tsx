import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  Building, 
  CalendarCheck, 
  Wrench, 
  Users, 
  Search, 
  PlusCircle, 
  ArrowRight, 
  Eye, 
  Edit, 
  MoreHorizontal,
  ServerOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { MaintenanceItem } from "@/components/dashboard/MaintenanceItem";
import { UserManagementCard } from "@/components/dashboard/UserManagementCard";
import LoginCard from "@/components/dashboard/LoginCard";
import { useAuth } from "../contexts/AuthContext";
import { 
  DashboardSummary, 
  getStatusClasses, 
  getPriorityClasses, 
  formatDate 
} from "@/lib/types";

// Helper for API URL construction using relative URLs
const getApiUrl = (endpoint: string) => {
  // In all environments, simply use relative URLs
  // This lets the browser handle the proper URL construction regardless of environment
  
  // Ensure the endpoint starts with a slash
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  
  return endpoint;
};

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, checkSession } = useAuth();
  // Set to true right away - we'll always render content regardless of auth state
  const [shouldRenderContent, setShouldRenderContent] = useState(true);
  
  // Re-check the session when the dashboard loads, but no longer wait on it
  useEffect(() => {
    console.log("Dashboard: Checking authentication status");
    
    try {
      // Catch potential errors in checkSession
      checkSession().then(success => {
        console.log("Dashboard: Authentication check result:", success ? "Authenticated" : "Not authenticated");
      }).catch(error => {
        console.error("Dashboard: Error checking session:", error);
      });
    } catch (error) {
      console.error("Dashboard: Critical error in session check:", error);
    }
    
    // No longer need a timeout since we're always showing content
  }, []);

  // Only fetch dashboard data if authenticated
  const { data: apiData, isLoading: dashboardLoading, error } = useQuery<any>({
    queryKey: ["/api/dashboard/summary"],
    queryFn: async () => {
      console.log("Fetching data from:", "/api/dashboard/summary");
      const url = getApiUrl('/api/dashboard/summary');
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: isAuthenticated // Only run this query if the user is authenticated
  });
  
  // Combine loading states
  const isLoading = authLoading || dashboardLoading;
  
  // Create a more safely typed summary with defaults for missing values
  const summary: DashboardSummary = {
    metrics: {
      activeProjects: apiData?.metrics?.activeProjects || 0,
      maintenanceThisWeek: apiData?.metrics?.maintenanceThisWeek || 0,
      pendingRepairs: apiData?.metrics?.pendingRepairs || 0,
      totalClients: apiData?.metrics?.totalClients || 0
    },
    recentProjects: Array.isArray(apiData?.recentProjects) 
      ? apiData.recentProjects.map((project: any) => ({
          ...project,
          // Default values for potentially missing fields
          completion: project.percentComplete || 0,
          deadline: project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : new Date(),
          startDate: project.startDate ? new Date(project.startDate) : new Date(),
          estimatedCompletionDate: project.estimatedCompletionDate || project.startDate,
          projectType: project.projectType || "construction",
          assignments: project.assignments || [],
        }))
      : [],
    upcomingMaintenances: Array.isArray(apiData?.upcomingMaintenances) 
      ? apiData.upcomingMaintenances 
      : [],
    recentRepairs: Array.isArray(apiData?.recentRepairs) 
      ? apiData.recentRepairs 
      : []
  };
  
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Dashboard</h1>
        <div className="flex space-x-2 mt-3 md:mt-0">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-10 pr-4"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white font-medium">
            <PlusCircle className="h-4 w-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>
      
      {/* Login Card - shown when not authenticated, even if still loading */}
      {!isAuthenticated && (
        <LoginCard />
      )}
      
      {/* Dashboard content - only shown when authenticated */}
      {isAuthenticated && (
        <>
      {/* Metrics/KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border border-gray-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Active Projects"
              value={summary?.metrics.activeProjects || 0}
              changeText="12% from last month"
              changeType="increase"
              icon={<Building className="text-primary text-xl" />}
              iconBgColor="bg-blue-50"
            />
            <MetricCard
              title="Maintenance This Week"
              value={summary?.metrics.maintenanceThisWeek || 0}
              changeText="5% from last week"
              changeType="increase"
              icon={<CalendarCheck className="text-green-500 text-xl" />}
              iconBgColor="bg-green-50"
            />
            <MetricCard
              title="Pending Repairs"
              value={summary?.metrics.pendingRepairs || 0}
              changeText="3 new today"
              changeType="increase"
              icon={<Wrench className="text-yellow-500 text-xl" />}
              iconBgColor="bg-yellow-50"
            />
            <MetricCard
              title="Total Clients"
              value={summary?.metrics.totalClients || 0}
              changeText="2 new this month"
              changeType="increase"
              icon={<Users className="text-purple-500 text-xl" />}
              iconBgColor="bg-purple-50"
            />
          </>
        )}
      </div>
      
      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Construction Projects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-foreground font-heading">Construction Projects</h2>
            <Link href="/projects" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              Array(2).fill(0).map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-lg mb-4 overflow-hidden">
                  <div className="p-4 bg-blue-50">
                    <div className="flex items-start">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="ml-3 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex justify-between">
                      <div className="flex space-x-1">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="p-6 text-center">
                <ServerOff className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900">Connection Error</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Unable to fetch project data. Please check your connection.
                </p>
              </div>
            ) : summary?.recentProjects.length > 0 ? (
              summary.recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            ) : (
              <div className="p-6 text-center">
                <Building className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900">No Projects</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no active projects to display.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Upcoming Maintenance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-foreground font-heading">Upcoming Maintenance</h2>
            <Link href="/maintenance" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="border border-gray-100 rounded-lg mb-3 p-3">
                  <div className="flex items-start">
                    <Skeleton className="w-12 h-12 rounded-lg mr-3" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="h-4 w-24 ml-2" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="p-6 text-center">
                <ServerOff className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900">Connection Error</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Unable to fetch maintenance data. Please check your connection.
                </p>
              </div>
            ) : summary?.upcomingMaintenances.length > 0 ? (
              summary.upcomingMaintenances.map((maintenance) => (
                <MaintenanceItem key={maintenance.id} maintenance={maintenance} />
              ))
            ) : (
              <div className="p-6 text-center">
                <CalendarCheck className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900">No Upcoming Maintenance</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no scheduled maintenance visits.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* User Management and Authentication */}
      <div className="mt-6 mb-6">
        <UserManagementCard />
      </div>

      {/* Recent Repair Requests */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-foreground font-heading">Recent Repair Requests</h2>
          <Link href="/repairs" className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto md:overflow-visible">
          {isLoading ? (
            <div className="p-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <ServerOff className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-base font-semibold text-gray-900">Connection Error</h3>
              <p className="mt-1 text-sm text-gray-500">
                Unable to fetch repair data. Please check your connection.
              </p>
            </div>
          ) : summary?.recentRepairs.length === 0 ? (
            <div className="p-10 text-center">
              <Wrench className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-base font-semibold text-gray-900">No Repair Requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no recent repair requests to display.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summary?.recentRepairs.map((repair) => {
                  const statusClasses = getStatusClasses(repair.status);
                  const priorityClasses = getPriorityClasses(repair.priority as any);
                  
                  return (
                    <tr key={repair.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                              {repair.client?.user?.name ? repair.client.user.name.charAt(0) : '?'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">{repair.client?.user?.name || 'Unknown Client'}</div>
                            <div className="text-xs text-gray-500">{repair.client?.user?.address || 'No address'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{repair.issue}</div>
                        <div className="text-xs text-gray-500">{repair.description ? repair.description.substring(0, 30) + '...' : 'No description'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                          {repair.priority ? repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1) : 'Medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses.bg} ${statusClasses.text}`}>
                          {repair.status ? repair.status.charAt(0).toUpperCase() + repair.status.slice(1) : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{repair.technician?.user?.name || 'Unassigned'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(repair.scheduledDate || new Date())}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}