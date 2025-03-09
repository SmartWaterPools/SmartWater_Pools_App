import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MaintenanceWithDetails } from "@/lib/types";
import {
  Star,
  Users,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity
} from "lucide-react";

interface TechnicianPerformanceProps {
  maintenanceId: number;
  technicianId?: number;
}

export function TechnicianPerformance({ maintenanceId, technicianId }: TechnicianPerformanceProps) {
  // Fetch the current maintenance
  const { data: maintenance, isLoading: isLoadingMaintenance } = useQuery<MaintenanceWithDetails>({
    queryKey: ["/api/maintenances", maintenanceId],
    enabled: !!maintenanceId
  });

  // Fetch chemical usage
  const { data: chemicalUsage, isLoading: isLoadingChemicals } = useQuery({
    queryKey: ["/api/chemical-usage/maintenance", maintenanceId],
    enabled: !!maintenanceId
  });

  // Calculate total chemical cost
  const totalChemicalCost = chemicalUsage?.reduce((sum, item) => sum + (item.totalCost || 0), 0) || 0;

  // Sample performance data (in a real app, this would come from an API)
  const [performanceData, setPerformanceData] = useState({
    customerSatisfaction: 4.7,
    onTimeRate: 95,
    completionRate: 98,
    avgServiceTime: 42, // in minutes
    avgChemicalCost: 28.5,
    alertsLastMonth: [
      { type: "Chemical reading out of range", count: 3 },
      { type: "Insufficient service time", count: 1 },
      { type: "Late arrival", count: 2 },
      { type: "Customer complaint", count: 0 },
    ],
    serviceTimeHistory: [
      { week: "Week 1", time: 45 },
      { week: "Week 2", time: 43 },
      { week: "Week 3", time: 41 },
      { week: "Week 4", time: 39 },
      { week: "Week 5", time: 42 },
    ],
    chemicalCostHistory: [
      { week: "Week 1", cost: 32 },
      { week: "Week 2", cost: 27 },
      { week: "Week 3", cost: 25 },
      { week: "Week 4", cost: 29 },
      { week: "Week 5", cost: 30 },
    ],
    feedbackScores: [
      { category: "Timeliness", score: 4.8 },
      { category: "Quality", score: 4.6 },
      { category: "Communication", score: 4.5 },
      { category: "Problem Solving", score: 4.9 },
    ],
    weeklyStats: {
      poolsServiced: 24,
      routesCompleted: 5,
      totalServiceHours: 16.8,
      avgTimePerPool: 41, // minutes
    }
  });

  // We'll populate with some sample alert data
  const [alertTrends, setAlertTrends] = useState([
    { name: "Chemical Issues", value: 35, color: "#3b82f6" },
    { name: "Time Management", value: 25, color: "#f97316" },
    { name: "Customer Feedback", value: 5, color: "#ef4444" },
    { name: "Equipment Problems", value: 15, color: "#84cc16" },
    { name: "Other", value: 20, color: "#a855f7" },
  ]);

  // Colors for charts
  const COLORS = ['#3b82f6', '#f97316', '#ef4444', '#84cc16', '#a855f7'];

  useEffect(() => {
    // In a real app, we would fetch technician performance data here
    // For now we'll just use sample data, possibly adjusted by the technician ID
    if (maintenance?.technician) {
      // Just slightly randomize the data based on technician ID to simulate different techs
      const techId = maintenance.technician.id || 1;
      setPerformanceData(prev => ({
        ...prev,
        customerSatisfaction: 4.5 + (techId % 5) * 0.1,
        onTimeRate: 90 + (techId % 10),
        avgServiceTime: 40 + (techId % 5),
        avgChemicalCost: 25 + (techId % 10),
      }));
    }
  }, [maintenance]);

  if (isLoadingMaintenance || isLoadingChemicals) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!maintenance?.technician) {
    return <div>No technician assigned to this service</div>;
  }

  // Extract technician data
  const technician = maintenance.technician;
  const technicianName = technician.user.name;
  
  // For display in UI, split the name
  const nameParts = technicianName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  
  // Create technician initials for avatar
  const technicianInitials = technicianName.split(' ').map(n => n[0]).join('');

  // Get rating color
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-500";
    if (rating >= 3.5) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Technician Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {technicianInitials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{firstName} {lastName}</h2>
              <p className="text-gray-500">{technician.role || "Pool Technician"}</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(performanceData.customerSatisfaction)
                          ? "text-yellow-400 fill-yellow-400"
                          : i < performanceData.customerSatisfaction
                          ? "text-yellow-400 fill-yellow-400 opacity-50"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className={`font-medium ${getRatingColor(performanceData.customerSatisfaction)}`}>
                  {performanceData.customerSatisfaction.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">Customer Rating</span>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 ml-auto flex flex-col items-end">
              <Badge className="mb-2" variant="outline">
                {performanceData.weeklyStats.poolsServiced} Pools This Week
              </Badge>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  <Clock className="h-3 w-3 mr-1" />
                  {performanceData.avgServiceTime} min avg
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  <Users className="h-3 w-3 mr-1" />
                  {performanceData.weeklyStats.routesCompleted} routes
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Customer Satisfaction Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Customer Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className={`text-2xl font-bold ${getRatingColor(performanceData.customerSatisfaction)}`}>
                  {performanceData.customerSatisfaction.toFixed(1)}
                </span>
                <span className="text-gray-500">/ 5</span>
              </div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(performanceData.customerSatisfaction)
                        ? "text-yellow-400 fill-yellow-400"
                        : i < performanceData.customerSatisfaction
                        ? "text-yellow-400 fill-yellow-400 opacity-50"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2">
              <Progress value={performanceData.customerSatisfaction * 20} className="h-1.5" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Based on customer feedback from the last 30 services</p>
          </CardContent>
        </Card>

        {/* On-Time Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-2xl font-bold ${performanceData.onTimeRate >= 90 ? "text-green-500" : performanceData.onTimeRate >= 75 ? "text-yellow-500" : "text-red-500"}`}>
                  {performanceData.onTimeRate}%
                </span>
              </div>
              <div>
                <Clock className={`h-6 w-6 ${performanceData.onTimeRate >= 90 ? "text-green-500" : performanceData.onTimeRate >= 75 ? "text-yellow-500" : "text-red-500"}`} />
              </div>
            </div>
            <div className="mt-2">
              <Progress value={performanceData.onTimeRate} className="h-1.5" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Percentage of services started within the scheduled time window</p>
          </CardContent>
        </Card>

        {/* Average Service Time Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Avg. Service Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-blue-500">
                  {performanceData.avgServiceTime}
                </span>
                <span className="text-gray-500 ml-1">min</span>
              </div>
              <div>
                <CalendarDays className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-2">
              <Progress value={(performanceData.avgServiceTime / 60) * 100} className="h-1.5" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Average time spent on each service location</p>
          </CardContent>
        </Card>

        {/* Chemical Cost Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Avg. Chemical Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-indigo-500">
                  ${performanceData.avgChemicalCost.toFixed(2)}
                </span>
              </div>
              <div>
                <Activity className="h-6 w-6 text-indigo-500" />
              </div>
            </div>
            <div className="mt-2">
              <Progress 
                value={(performanceData.avgChemicalCost / 50) * 100} 
                className="h-1.5"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Average chemical cost per service</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="feedback">Customer Feedback</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Summary</CardTitle>
                <CardDescription>
                  Key metrics for {firstName}'s service quality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Weekly Services</p>
                    <p className="text-2xl font-bold">{performanceData.weeklyStats.poolsServiced}</p>
                    <p className="text-xs text-gray-500">pools serviced</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Weekly Routes</p>
                    <p className="text-2xl font-bold">{performanceData.weeklyStats.routesCompleted}</p>
                    <p className="text-xs text-gray-500">routes completed</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Service Hours</p>
                    <p className="text-2xl font-bold">{performanceData.weeklyStats.totalServiceHours}</p>
                    <p className="text-xs text-gray-500">hours this week</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-600">{performanceData.completionRate}%</p>
                    <p className="text-xs text-gray-500">services completed</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="font-medium">Performance Highlights</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Excellent Customer Ratings</p>
                        <p className="text-sm text-gray-500">Consistently receives high marks for service quality</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Efficient Chemical Usage</p>
                        <p className="text-sm text-gray-500">Maintains proper water chemistry with optimized chemical costs</p>
                      </div>
                    </div>
                    {performanceData.onTimeRate < 95 && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Timeliness</p>
                          <p className="text-sm text-gray-500">On-time rate is below target of 95%, currently at {performanceData.onTimeRate}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Trends</CardTitle>
                <CardDescription>
                  Distribution of service issues by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={alertTrends}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {alertTrends.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, ""]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent Alerts</p>
                  <div className="space-y-1.5">
                    {performanceData.alertsLastMonth.map((alert, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <p className="text-sm flex items-center gap-1.5">
                          {alert.count > 0 ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          )}
                          {alert.type}
                        </p>
                        <Badge variant={alert.count > 0 ? "outline" : "secondary"}>
                          {alert.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="pt-4">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Time Trend</CardTitle>
                <CardDescription>
                  Average service time per week (in minutes)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={performanceData.serviceTimeHistory}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} min`, "Service Time"]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="time"
                        name="Service Time"
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chemical Cost Trend</CardTitle>
                <CardDescription>
                  Average chemical cost per service by week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={performanceData.chemicalCostHistory}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, "Chemical Cost"]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        name="Chemical Cost"
                        stroke="#a855f7"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Feedback Scores</CardTitle>
              <CardDescription>
                Average ratings by category from customer evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={performanceData.feedbackScores}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => [`${value}/5`, "Rating"]} />
                    <Legend />
                    <Bar dataKey="score" name="Rating" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Separator className="my-6" />

              <div className="space-y-6">
                <p className="font-medium">Customer Comments</p>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">John D. - 2 days ago</p>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < 5 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      "{firstName} is always thorough and takes the time to explain what treatments were done and why. Our pool has never looked better!"
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">Sandra M. - 1 week ago</p>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      "Very professional service. Fixed our algae problem quickly. Would recommend to others in the neighborhood."
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Alerts & Issues</CardTitle>
              <CardDescription>
                Recent alerts and recurring issues for {firstName}'s services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Active Alerts</p>
                  <Badge variant="outline">
                    {performanceData.alertsLastMonth.reduce((sum, alert) => sum + alert.count, 0)} Total
                  </Badge>
                </div>
                
                {performanceData.alertsLastMonth.filter(a => a.count > 0).map((alert, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.type}</p>
                          <Badge variant="outline">
                            {alert.count} instance{alert.count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {alert.type === "Chemical reading out of range" && "Pool water chemistry readings were outside acceptable parameters. This could indicate inconsistent treatment."}
                          {alert.type === "Insufficient service time" && "Service was completed in less than the minimum recommended time for thorough pool maintenance."}
                          {alert.type === "Late arrival" && "Technician arrived after the scheduled service window, potentially impacting customer satisfaction."}
                          {alert.type === "Customer complaint" && "Customer has submitted a formal complaint about service quality or technician behavior."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {performanceData.alertsLastMonth.filter(a => a.count > 0).length === 0 && (
                  <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-800">No Active Alerts</p>
                    <p className="text-sm text-green-700">All service parameters within normal ranges</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="font-medium">Recommended Actions</p>
                
                {performanceData.alertsLastMonth.some(a => a.count > 0) ? (
                  <div className="space-y-3">
                    {performanceData.alertsLastMonth.find(a => a.type === "Chemical reading out of range")?.count > 0 && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Chemical Management Training</p>
                          <p className="text-sm text-gray-500">Schedule refresher training on proper chemical testing and dosing procedures</p>
                        </div>
                      </div>
                    )}
                    
                    {performanceData.alertsLastMonth.find(a => a.type === "Insufficient service time" || a.type === "Late arrival")?.count > 0 && (
                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Route Optimization Review</p>
                          <p className="text-sm text-gray-500">Analyze and potentially adjust route schedule to allow adequate service time at each stop</p>
                        </div>
                      </div>
                    )}
                    
                    {performanceData.alertsLastMonth.find(a => a.type === "Customer complaint")?.count > 0 && (
                      <div className="flex items-start gap-2">
                        <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Customer Service Discussion</p>
                          <p className="text-sm text-gray-500">Schedule 1-on-1 meeting to review customer feedback and address concerns</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Maintain Performance</p>
                      <p className="text-sm text-gray-500">Continue current best practices and monitor service quality</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Current Service Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Service Analysis</CardTitle>
          <CardDescription>
            Performance metrics for today's service at {maintenance.client.user.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Service Duration</p>
              <div className="flex items-end gap-1">
                <p className="text-2xl font-bold">
                  {maintenance.startTime && maintenance.endTime
                    ? Math.round((new Date(maintenance.endTime).getTime() - new Date(maintenance.startTime).getTime()) / 60000)
                    : performanceData.avgServiceTime}
                </p>
                <p className="text-gray-500 mb-0.5">minutes</p>
              </div>
              <div className="flex items-center gap-1">
                {(maintenance.serviceEfficiency || 0) <= performanceData.avgServiceTime ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                )}
                <p className="text-xs text-gray-500">
                  {(maintenance.serviceEfficiency || 0) <= performanceData.avgServiceTime
                    ? `${Math.abs(Math.round((maintenance.serviceEfficiency || 0) - performanceData.avgServiceTime))} min faster than average`
                    : `${Math.abs(Math.round((maintenance.serviceEfficiency || 0) - performanceData.avgServiceTime))} min slower than average`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">Chemical Usage</p>
              <div className="flex items-end gap-1">
                <p className="text-2xl font-bold">${totalChemicalCost.toFixed(2)}</p>
                <p className="text-gray-500 mb-0.5">total cost</p>
              </div>
              <div className="flex items-center gap-1">
                {totalChemicalCost <= performanceData.avgChemicalCost ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                )}
                <p className="text-xs text-gray-500">
                  {totalChemicalCost <= performanceData.avgChemicalCost
                    ? `$${(performanceData.avgChemicalCost - totalChemicalCost).toFixed(2)} below average`
                    : `$${(totalChemicalCost - performanceData.avgChemicalCost).toFixed(2)} above average`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">On-Time Performance</p>
              <div className="flex items-end gap-1">
                <p className="text-2xl font-bold">
                  {maintenance.startTime
                    ? new Date(maintenance.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    : "N/A"}
                </p>
                <p className="text-gray-500 mb-0.5">start time</p>
              </div>
              {maintenance.startTime && (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-gray-500">
                    On time service start
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Chemical Usage Breakdown */}
          {chemicalUsage && chemicalUsage.length > 0 ? (
            <div className="space-y-4">
              <p className="font-medium">Chemical Usage Breakdown</p>
              <div className="rounded-md border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chemical
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {chemicalUsage.map((chemical, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {chemical.chemicalType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                          {chemical.amount} {chemical.unit}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                          ${chemical.totalCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                          {((chemical.totalCost / totalChemicalCost) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No chemical usage recorded for this service
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}