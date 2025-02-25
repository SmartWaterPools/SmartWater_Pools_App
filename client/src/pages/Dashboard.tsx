import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  MoreHorizontal 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { MaintenanceItem } from "@/components/dashboard/MaintenanceItem";
import { 
  DashboardSummary, 
  getStatusClasses, 
  getPriorityClasses, 
  formatDate 
} from "@/lib/types";

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/summary"],
  });
  
  const summary = dashboardData as DashboardSummary;
  
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
            <Link href="/projects">
              <a className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </a>
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
            ) : (
              summary?.recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))
            )}
          </div>
        </div>
        
        {/* Upcoming Maintenance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-foreground font-heading">Upcoming Maintenance</h2>
            <Link href="/maintenance">
              <a className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </a>
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
            ) : (
              summary?.upcomingMaintenances.map((maintenance) => (
                <MaintenanceItem key={maintenance.id} maintenance={maintenance} />
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Repair Requests */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-foreground font-heading">Recent Repair Requests</h2>
          <Link href="/repairs">
            <a className="text-sm text-primary hover:text-primary/80 font-medium flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Link>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
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
                              {repair.client.user.name.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">{repair.client.user.name}</div>
                            <div className="text-xs text-gray-500">{repair.client.user.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{repair.issueType}</div>
                        <div className="text-xs text-gray-500">{repair.description.substring(0, 30)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClasses.bg} ${priorityClasses.text}`}>
                          {repair.priority.charAt(0).toUpperCase() + repair.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses.bg} ${statusClasses.text}`}>
                          {repair.status.charAt(0).toUpperCase() + repair.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {repair.technician ? repair.technician.user.name : 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(repair.reportedDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:text-primary/80">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-600 hover:text-gray-900">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-600 hover:text-gray-900">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
