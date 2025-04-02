import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  BarChart4, 
  BarChart2,
  FileBarChart2,
  Beaker,
  ChevronDown,
  Droplets,
  DollarSign,
  PieChart,
  ChartBar,
  UserCog,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { MaintenanceWithDetails, formatDate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Import the components we've built
import { ChemicalUsageForm } from "@/components/maintenance/ChemicalUsageForm";
import { ChemicalUsageHistory } from "@/components/maintenance/ChemicalUsageHistory";
import { WaterReadingsForm } from "@/components/maintenance/WaterReadingsForm";
import { WaterReadingsHistory } from "@/components/maintenance/WaterReadingsHistory";
import { RouteProfitAnalysis } from "@/components/maintenance/RouteProfitAnalysis";
import { TechnicianPerformance } from "@/components/maintenance/TechnicianPerformance";

// Define a format helper for chemical names
const formatChemicalType = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function ServiceReportPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch maintenance details
  const { data: maintenance, isLoading, error } = useQuery<MaintenanceWithDetails>({
    queryKey: ["/api/maintenances", id],
    enabled: !!id
  });

  // Fetch chemical usage for this maintenance
  const { data: chemicalUsage, isLoading: isLoadingChemicals } = useQuery({
    queryKey: ["/api/chemical-usage/maintenance", id],
    enabled: !!id
  });

  // Fetch water readings for this maintenance
  const { data: waterReadings, isLoading: isLoadingWaterReadings } = useQuery({
    queryKey: ["/api/water-readings/maintenance", id],
    enabled: !!id
  });

  // If there's an error fetching maintenance data, show a toast and navigate back
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load service details. Please try again.",
        variant: "destructive",
      });
      navigate("/maintenance");
    }
  }, [error, toast, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Service Report Not Found</h3>
        <p className="text-gray-500 mb-6">The requested service report could not be found.</p>
        <Button onClick={() => navigate("/maintenance")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Maintenance
        </Button>
      </div>
    );
  }

  // Calculate stats for quick view
  const totalChemicalUsage = chemicalUsage?.length || 0;
  const totalChemicalCost = chemicalUsage?.reduce((sum, item) => sum + (item.totalCost || 0), 0) || 0;
  const hasWaterReadings = waterReadings && waterReadings.length > 0;

  // Format date and time nicely
  const formattedDate = formatDate(maintenance.scheduleDate);
  const technicianName = maintenance.technician ? maintenance.technician.user.name : "Unassigned";
  const technicianInitials = technicianName.split(' ').map(n => n[0]).join('');

  // Determine status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/maintenance")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Maintenance Report</h1>
            <p className="text-gray-500">{formattedDate} • {maintenance.client.user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(maintenance.status)}>
            {maintenance.status.charAt(0).toUpperCase() + maintenance.status.slice(1).replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="chemical-usage">Chemical Usage</TabsTrigger>
          <TabsTrigger value="water-readings">Water Readings</TabsTrigger>
          <TabsTrigger value="route-profit">Route Profit</TabsTrigger>
          <TabsTrigger value="tech-performance">Tech Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client and Appointment Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {maintenance.client.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{maintenance.client.user.name}</h3>
                    <p className="text-sm text-gray-500">{maintenance.client.email || "No email provided"}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {maintenance.startTime ? new Date(maintenance.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Not started"} 
                      {maintenance.endTime && maintenance.startTime ? ` - ${new Date(maintenance.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{technicianName}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Service Type</p>
                  <Badge variant="outline" className="text-xs">
                    {maintenance.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Badge>
                </div>

                {maintenance.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{maintenance.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Chemical Usage Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-blue-500" />
                  Chemical Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingChemicals ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : chemicalUsage && chemicalUsage.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-2xl font-bold">${totalChemicalCost.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Total chemical cost</p>
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                        {totalChemicalUsage} chemicals used
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      {chemicalUsage.slice(0, 3).map((chemical, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${index * 50}, 70%, 50%)` }}></div>
                            <span className="text-sm">{formatChemicalType(chemical.chemicalType)}</span>
                          </div>
                          <span className="text-sm font-medium">${chemical.totalCost.toFixed(2)}</span>
                        </div>
                      ))}
                      
                      {chemicalUsage.length > 3 && (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs"
                          onClick={() => setActiveTab("chemical-usage")}
                        >
                          View all {chemicalUsage.length} chemicals
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Droplets className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 mb-1">No chemical usage recorded</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs"
                      onClick={() => setActiveTab("chemical-usage")}
                    >
                      Add chemical usage
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Water Readings Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-cyan-500" />
                  Water Readings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingWaterReadings ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : hasWaterReadings ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-medium">Water Quality</p>
                        <p className="text-sm text-gray-500">Latest readings</p>
                      </div>
                      <Badge className="bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
                        {new Date(waterReadings[0].createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      {waterReadings[0].phLevel && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>pH Level</span>
                            <span className="font-medium">{waterReadings[0].phLevel}</span>
                          </div>
                          <Progress value={((waterReadings[0].phLevel - 6.8) / (8.2 - 6.8)) * 100} />
                        </div>
                      )}
                      
                      {waterReadings[0].chlorineLevel && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Chlorine (ppm)</span>
                            <span className="font-medium">{waterReadings[0].chlorineLevel}</span>
                          </div>
                          <Progress value={(waterReadings[0].chlorineLevel / 5) * 100} />
                        </div>
                      )}
                      
                      {waterReadings[0].alkalinity && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Alkalinity</span>
                            <span className="font-medium">{waterReadings[0].alkalinity}</span>
                          </div>
                          <Progress value={(waterReadings[0].alkalinity / 120) * 100} />
                        </div>
                      )}
                      
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-xs"
                        onClick={() => setActiveTab("water-readings")}
                      >
                        View all readings
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Droplets className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 mb-1">No water readings recorded</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs"
                      onClick={() => setActiveTab("water-readings")}
                    >
                      Add water readings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profit and Performance Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profit Analysis Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Profit Analysis
                </CardTitle>
                <CardDescription>
                  Route profitability for this service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Invoice Amount</p>
                    <p className="text-xl font-bold">${maintenance.invoiceAmount || "0.00"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Chemical Cost</p>
                    <p className="text-xl font-bold">${totalChemicalCost.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Labor Cost</p>
                    <p className="text-xl font-bold">${maintenance.laborCost || "0.00"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Profit</p>
                    <p className="text-xl font-bold text-green-600">
                      ${maintenance.profitAmount ? maintenance.profitAmount.toFixed(2) : "0.00"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Profit Margin</p>
                    <Badge className={
                      (maintenance.profitPercentage || 0) > 30 
                        ? "bg-green-100 text-green-800"
                        : (maintenance.profitPercentage || 0) > 15
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }>
                      {maintenance.profitPercentage ? maintenance.profitPercentage.toFixed(1) : "0"}%
                    </Badge>
                  </div>
                  <Progress 
                    value={maintenance.profitPercentage || 0} 
                    className="h-2"
                  />
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab("route-profit")}
                >
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Detailed Profit Analysis
                </Button>
              </CardContent>
            </Card>

            {/* Technician Performance Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-indigo-500" />
                  Technician Performance
                </CardTitle>
                <CardDescription>
                  {technicianName}'s service metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-indigo-100 text-indigo-800">
                      {technicianInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{technicianName}</h3>
                    <p className="text-sm text-gray-500">
                      {maintenance.technician ? maintenance.technician.role || "Pool Technician" : "Unassigned"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Service Efficiency</p>
                    <p className="text-lg font-bold">
                      {maintenance.serviceEfficiency ? maintenance.serviceEfficiency.toFixed(1) : "N/A"}
                      <span className="text-sm font-normal text-gray-500 ml-1">min/service</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Chemical Usage</p>
                    <p className="text-lg font-bold">
                      ${totalChemicalCost.toFixed(2)}
                      <span className="text-sm font-normal text-gray-500 ml-1">today</span>
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Performance Rating</p>
                  <div className="flex items-center gap-1">
                    {Array(5).fill(0).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-2 w-full rounded-full ${i < 4 ? "bg-indigo-500" : "bg-gray-200"}`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Based on service time, chemical usage, and history</p>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab("tech-performance")}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Technician Scorecard
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chemical Usage Tab */}
        <TabsContent value="chemical-usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chemical Usage and Tracking</CardTitle>
              <CardDescription>
                Record and monitor chemical consumption and costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="add-chemicals" className="w-full">
                <TabsList>
                  <TabsTrigger value="add-chemicals">Add Chemicals</TabsTrigger>
                  <TabsTrigger value="history">Usage History</TabsTrigger>
                </TabsList>
                <TabsContent value="add-chemicals" className="pt-4">
                  <ChemicalUsageForm maintenanceId={parseInt(id)} />
                </TabsContent>
                <TabsContent value="history" className="pt-4">
                  <ChemicalUsageHistory maintenanceId={parseInt(id)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Water Readings Tab */}
        <TabsContent value="water-readings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Water Test Readings</CardTitle>
              <CardDescription>
                Record and track water chemistry parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="add-readings" className="w-full">
                <TabsList>
                  <TabsTrigger value="add-readings">Record Readings</TabsTrigger>
                  <TabsTrigger value="history">Reading History</TabsTrigger>
                </TabsList>
                <TabsContent value="add-readings" className="pt-4">
                  <WaterReadingsForm maintenanceId={parseInt(id)} />
                </TabsContent>
                <TabsContent value="history" className="pt-4">
                  <WaterReadingsHistory maintenanceId={parseInt(id)} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Route Profit Tab */}
        <TabsContent value="route-profit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Route Profit Analysis</CardTitle>
              <CardDescription>
                Detailed financial breakdown of service profitability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RouteProfitAnalysis maintenanceId={parseInt(id)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technician Performance Tab */}
        <TabsContent value="tech-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technician Performance Scorecard</CardTitle>
              <CardDescription>
                Metrics and KPIs for technician service quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TechnicianPerformance 
                maintenanceId={parseInt(id)} 
                technicianId={maintenance.technician?.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}