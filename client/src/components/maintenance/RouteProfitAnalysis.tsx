import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { maintenances } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MaintenanceWithDetails } from "@/lib/types";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";

// Extend MaintenanceWithDetails to include profit data
interface MaintenanceWithProfit extends MaintenanceWithDetails {
  invoiceAmount?: number;
  laborCost?: number;
  totalChemicalCost?: number;
  profitAmount?: number;
  profitPercentage?: number;
  routeName?: string;
}

interface RouteProfitAnalysisProps {
  maintenanceId: number;
}

export function RouteProfitAnalysis({ maintenanceId }: RouteProfitAnalysisProps) {
  const [profitThreshold, setProfitThreshold] = useState(20);
  const [timeFrame, setTimeFrame] = useState("month");

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

  // Maintenance with profit data
  const [currentMaintenanceWithProfit, setCurrentMaintenanceWithProfit] = useState<MaintenanceWithProfit | null>(null);
  
  // For demo - generate sample route data
  const [routeData, setRouteData] = useState<MaintenanceWithProfit[]>([]);

  // Update current maintenance with profit data when maintenance data is loaded
  useEffect(() => {
    if (maintenance && !isLoadingChemicals) {
      const profitData: MaintenanceWithProfit = {
        ...maintenance,
        invoiceAmount: maintenance.invoiceAmount || 85, // Default if not set
        laborCost: maintenance.laborCost || 35, // Default if not set
        totalChemicalCost: totalChemicalCost,
        profitAmount: (maintenance.invoiceAmount || 85) - ((maintenance.laborCost || 35) + totalChemicalCost),
        routeName: maintenance.routeName || "Main Route"
      };
      
      // Calculate profit percentage
      if (profitData.invoiceAmount && profitData.invoiceAmount > 0) {
        profitData.profitPercentage = (profitData.profitAmount || 0) / profitData.invoiceAmount * 100;
      } else {
        profitData.profitPercentage = 0;
      }
      
      setCurrentMaintenanceWithProfit(profitData);
      
      // Generate sample route data for demonstration
      generateSampleRouteData(profitData);
    }
  }, [maintenance, totalChemicalCost, isLoadingChemicals]);

  // Generate sample route data for demonstration
  const generateSampleRouteData = (currentMaintenance: MaintenanceWithProfit) => {
    if (!currentMaintenance) return;
    
    // Create sample data based on the current maintenance
    const routeStops: MaintenanceWithProfit[] = [
      { ...currentMaintenance },
      // Sample additional stops on the route
      {
        ...currentMaintenance,
        id: currentMaintenance.id + 100,
        client: {
          ...currentMaintenance.client,
          user: {
            ...currentMaintenance.client.user,
            name: "Johnson Family"
          }
        },
        invoiceAmount: 95,
        laborCost: 30,
        totalChemicalCost: 18,
        profitAmount: 47,
        profitPercentage: 49.5
      },
      {
        ...currentMaintenance,
        id: currentMaintenance.id + 200,
        client: {
          ...currentMaintenance.client,
          user: {
            ...currentMaintenance.client.user,
            name: "Community Center"
          }
        },
        invoiceAmount: 150,
        laborCost: 60,
        totalChemicalCost: 35,
        profitAmount: 55,
        profitPercentage: 36.7
      },
      {
        ...currentMaintenance,
        id: currentMaintenance.id + 300,
        client: {
          ...currentMaintenance.client,
          user: {
            ...currentMaintenance.client.user,
            name: "Garcia Residence"
          }
        },
        invoiceAmount: 75,
        laborCost: 35,
        totalChemicalCost: 28,
        profitAmount: 12,
        profitPercentage: 16
      },
      {
        ...currentMaintenance,
        id: currentMaintenance.id + 400,
        client: {
          ...currentMaintenance.client,
          user: {
            ...currentMaintenance.client.user,
            name: "Anderson Pool"
          }
        },
        invoiceAmount: 110,
        laborCost: 45,
        totalChemicalCost: 25,
        profitAmount: 40,
        profitPercentage: 36.4
      }
    ];
    
    setRouteData(routeStops);
  };

  // Calculate route summary
  const routeSummary = routeData.length > 0 ? {
    totalInvoice: routeData.reduce((sum, item) => sum + (item.invoiceAmount || 0), 0),
    totalLabor: routeData.reduce((sum, item) => sum + (item.laborCost || 0), 0),
    totalChemicals: routeData.reduce((sum, item) => sum + (item.totalChemicalCost || 0), 0),
    totalProfit: routeData.reduce((sum, item) => sum + (item.profitAmount || 0), 0),
    averageProfit: routeData.reduce((sum, item) => sum + (item.profitAmount || 0), 0) / routeData.length,
    averageProfitPercentage: routeData.reduce((sum, item) => sum + (item.profitPercentage || 0), 0) / routeData.length,
    profitableAccounts: routeData.filter(item => (item.profitPercentage || 0) >= profitThreshold).length,
    lowProfitAccounts: routeData.filter(item => (item.profitPercentage || 0) < profitThreshold && (item.profitPercentage || 0) > 0).length,
    unprofitableAccounts: routeData.filter(item => (item.profitPercentage || 0) <= 0).length,
  } : null;

  // Prepare data for charts
  const profitByCustomerData = routeData.map(item => ({
    name: item.client.user.name,
    profit: item.profitAmount || 0,
    profitPercentage: item.profitPercentage || 0,
    invoice: item.invoiceAmount || 0,
    labor: item.laborCost || 0,
    chemicals: item.totalChemicalCost || 0,
  }));

  const accountCategoriesData = routeSummary ? [
    { name: "Profitable", value: routeSummary.profitableAccounts, color: "#22c55e" },
    { name: "Low Profit", value: routeSummary.lowProfitAccounts, color: "#eab308" },
    { name: "Unprofitable", value: routeSummary.unprofitableAccounts, color: "#ef4444" },
  ] : [];

  // Colors for pie chart
  const COLORS = ['#22c55e', '#eab308', '#ef4444'];

  const getProfitCategoryColor = (profitPercentage: number) => {
    if (profitPercentage >= profitThreshold) return "bg-green-100 text-green-800";
    if (profitPercentage > 0) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getProfitCategory = (profitPercentage: number) => {
    if (profitPercentage >= profitThreshold) return "Good Profit";
    if (profitPercentage > 0) return "Low Profit";
    return "Losing Money";
  };

  if (isLoadingMaintenance || isLoadingChemicals) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentMaintenanceWithProfit) {
    return <div>No profit data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Route Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              Route Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Route Name</p>
              <Badge variant="outline">
                {currentMaintenanceWithProfit.routeName || "Main Route"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Total Properties</p>
              <p className="font-medium">{routeData.length}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">
                {new Date(currentMaintenanceWithProfit.scheduleDate).toLocaleDateString()}
              </p>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Technician</p>
              <p className="font-medium">
                {currentMaintenanceWithProfit.technician?.user.name || "Unassigned"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Profit Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Profit Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {routeSummary && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Average Profit</p>
                  <div className="flex flex-col items-end">
                    <p className="font-medium">${routeSummary.averageProfit.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">per property</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Average Margin</p>
                  <div className="flex items-center gap-1">
                    <Badge className={getProfitCategoryColor(routeSummary.averageProfitPercentage)}>
                      {routeSummary.averageProfitPercentage.toFixed(1)}%
                    </Badge>
                    {routeSummary.averageProfitPercentage >= profitThreshold ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="font-medium">${routeSummary.totalInvoice.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Total Expenses</p>
                    <p className="font-medium">${(routeSummary.totalLabor + routeSummary.totalChemicals).toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Total Profit</p>
                    <p className="font-bold text-green-600">${routeSummary.totalProfit.toFixed(2)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {routeSummary && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      Good Profit
                    </p>
                    <Badge className="bg-green-100 text-green-800">
                      {routeSummary.profitableAccounts}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                      Low Profit
                    </p>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {routeSummary.lowProfitAccounts}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      Losing Money
                    </p>
                    <Badge className="bg-red-100 text-red-800">
                      {routeSummary.unprofitableAccounts}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Profit Threshold</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={profitThreshold}
                        onChange={(e) => setProfitThreshold(parseInt(e.target.value))}
                        className="w-16 h-7 text-xs"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Accounts with profit margin below this threshold are considered "Low Profit"
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Route Analysis Tab Section */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList>
          <TabsTrigger value="table">Route Table</TabsTrigger>
          <TabsTrigger value="charts">Route Charts</TabsTrigger>
          <TabsTrigger value="customer">Customer Profitability</TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Route Profit Breakdown</CardTitle>
              <CardDescription>
                Showing profit data for all properties on this route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chemicals
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Labor
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Margin
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {routeData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.client.user.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${item.invoiceAmount?.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${item.totalChemicalCost?.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          ${item.laborCost?.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                          ${item.profitAmount?.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          {item.profitPercentage?.toFixed(1)}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          <Badge className={getProfitCategoryColor(item.profitPercentage || 0)}>
                            {getProfitCategory(item.profitPercentage || 0)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {/* Footer row with totals */}
                    {routeSummary && (
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          Totals
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          ${routeSummary.totalInvoice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          ${routeSummary.totalChemicals.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          ${routeSummary.totalLabor.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">
                          ${routeSummary.totalProfit.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {routeSummary.averageProfitPercentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <Badge className={getProfitCategoryColor(routeSummary.averageProfitPercentage)}>
                            Average
                          </Badge>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts View */}
        <TabsContent value="charts" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Account Categories</CardTitle>
                <CardDescription>
                  Distribution of accounts by profitability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {routeSummary && (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={accountCategoriesData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {accountCategoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} accounts`, ""]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Cost Breakdown</CardTitle>
                <CardDescription>
                  Average costs and revenue per account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {routeData.length > 0 && (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Average per Account",
                            invoice: routeSummary?.totalInvoice / routeData.length,
                            labor: routeSummary?.totalLabor / routeData.length,
                            chemicals: routeSummary?.totalChemicals / routeData.length,
                            profit: routeSummary?.totalProfit / routeData.length,
                          }
                        ]}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, ""]} />
                        <Legend />
                        <Bar dataKey="invoice" name="Invoice" fill="#60a5fa" />
                        <Bar dataKey="labor" name="Labor" fill="#f87171" />
                        <Bar dataKey="chemicals" name="Chemicals" fill="#fcd34d" />
                        <Bar dataKey="profit" name="Profit" fill="#4ade80" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Profitability View */}
        <TabsContent value="customer" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Customer Profitability Analysis</CardTitle>
              <CardDescription>
                Comparing profit margins across customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={profitByCustomerData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis yAxisId="left" orientation="left" stroke="#4ade80" />
                    <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" />
                    <Tooltip formatter={(value, name) => [
                      name === "profitPercentage" ? `${value.toFixed(1)}%` : `$${value.toFixed(2)}`,
                      name === "profitPercentage" ? "Profit Margin" : name.charAt(0).toUpperCase() + name.slice(1)
                    ]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="profit" name="Profit ($)" fill="#4ade80" />
                    <Bar yAxisId="right" dataKey="profitPercentage" name="Profit Margin (%)" fill="#60a5fa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Individual Customer Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Service Analysis</CardTitle>
          <CardDescription>
            {currentMaintenanceWithProfit.client.user.name}'s service details and profitability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Invoice Amount</p>
              <p className="text-2xl font-bold">${currentMaintenanceWithProfit.invoiceAmount?.toFixed(2) || "0.00"}</p>
              <p className="text-xs text-gray-500">Revenue for this service</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">Labor Cost</p>
              <p className="text-2xl font-bold">${currentMaintenanceWithProfit.laborCost?.toFixed(2) || "0.00"}</p>
              <p className="text-xs text-gray-500">Technician cost for visit</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">Chemical Cost</p>
              <p className="text-2xl font-bold">${totalChemicalCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{chemicalUsage?.length || 0} chemicals used</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">Profit</p>
              <p className="text-2xl font-bold text-green-600">
                ${currentMaintenanceWithProfit.profitAmount?.toFixed(2) || "0.00"}
              </p>
              <div className="flex items-center gap-1">
                <Badge className={getProfitCategoryColor(currentMaintenanceWithProfit.profitPercentage || 0)}>
                  {currentMaintenanceWithProfit.profitPercentage?.toFixed(1) || "0"}%
                </Badge>
                <span className="text-xs text-gray-500">margin</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Profit Margin Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Profit Margin</p>
              <div className="flex items-center gap-2">
                <Badge className={getProfitCategoryColor(currentMaintenanceWithProfit.profitPercentage || 0)}>
                  {getProfitCategory(currentMaintenanceWithProfit.profitPercentage || 0)}
                </Badge>
                <span className="text-sm font-medium">
                  {currentMaintenanceWithProfit.profitPercentage?.toFixed(1) || "0"}%
                </span>
              </div>
            </div>
            <Progress 
              value={currentMaintenanceWithProfit.profitPercentage || 0} 
              max={100}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span className="text-yellow-500">{profitThreshold}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Recommendations Section */}
          {currentMaintenanceWithProfit.profitPercentage !== undefined && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                Recommendations
              </h3>
              {currentMaintenanceWithProfit.profitPercentage >= profitThreshold ? (
                <p className="text-gray-700">
                  This account is performing well with a healthy profit margin of {currentMaintenanceWithProfit.profitPercentage.toFixed(1)}%. 
                  Continue with the current service plan and consider using this as a benchmark for other similar accounts.
                </p>
              ) : currentMaintenanceWithProfit.profitPercentage > 0 ? (
                <p className="text-gray-700">
                  This account has a low profit margin of {currentMaintenanceWithProfit.profitPercentage.toFixed(1)}%, 
                  below your target threshold of {profitThreshold}%. Consider adjusting the service rate on the next contract renewal 
                  or look for ways to reduce chemical and labor costs while maintaining service quality.
                </p>
              ) : (
                <p className="text-gray-700">
                  This account is currently unprofitable. Immediate action is recommended:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Renegotiate the service rate as soon as possible</li>
                    <li>Review chemical usage for potential inefficiencies</li>
                    <li>Evaluate if there are underlying pool issues causing excessive chemical consumption</li>
                    <li>Consider whether to continue servicing this account</li>
                  </ul>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}