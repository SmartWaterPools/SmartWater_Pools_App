import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChemicalType, ChemicalUsage } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Beaker, DollarSign, Droplets, LineChart } from "lucide-react";

interface ChemicalUsageHistoryProps {
  maintenanceId: number;
}

// Color mapping for chemical types
const chemicalColors: Record<ChemicalType, string> = {
  liquid_chlorine: "#4299e1", // blue
  tablets: "#38b2ac", // teal
  muriatic_acid: "#ed8936", // orange
  soda_ash: "#ecc94b", // yellow
  sodium_bicarbonate: "#9ae6b4", // green
  calcium_chloride: "#a0aec0", // gray
  stabilizer: "#9f7aea", // purple
  algaecide: "#48bb78", // emerald
  salt: "#e2e8f0", // light gray
  phosphate_remover: "#fc8181", // light red
  other: "#cbd5e0", // silver
};

export function ChemicalUsageHistory({ maintenanceId }: ChemicalUsageHistoryProps) {
  const [activeTab, setActiveTab] = useState("table");
  
  // Fetch chemical usage data for this maintenance record
  const { data: chemicalUsages, isLoading, error } = useQuery({
    queryKey: [`/api/chemical-usage/maintenance/${maintenanceId}`],
    queryFn: async () => {
      return apiRequest<ChemicalUsage[]>(`/api/chemical-usage/maintenance/${maintenanceId}`);
    },
    enabled: !!maintenanceId,
  });
  
  // Function to format chemical type for display
  const formatChemicalType = (type: string): string => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  // Calculate total chemical cost
  const totalChemicalCost = chemicalUsages?.reduce((sum, item) => sum + item.totalCost, 0) || 0;
  
  // Prepare data for cost by chemical type chart
  const costByChemicalType = chemicalUsages?.reduce((acc, item) => {
    const existingItem = acc.find(i => i.name === item.chemicalType);
    if (existingItem) {
      existingItem.value += item.totalCost;
    } else {
      acc.push({
        name: formatChemicalType(item.chemicalType),
        value: item.totalCost,
        color: chemicalColors[item.chemicalType as ChemicalType] || "#CBD5E0" 
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number; color: string }>) || [];
  
  // Calculate cost percentage for each chemical
  chemicalUsages?.forEach(usage => {
    usage.costPercentage = totalChemicalCost > 0 
      ? (usage.totalCost / totalChemicalCost * 100) 
      : 0;
  });
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chemical Usage</CardTitle>
          <CardDescription>Loading chemical usage data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chemical Usage</CardTitle>
          <CardDescription className="text-red-500">
            Error loading chemical data: {error instanceof Error ? error.message : String(error)}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Empty state
  if (!chemicalUsages || chemicalUsages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chemical Usage</CardTitle>
          <CardDescription>No chemical usage recorded for this maintenance visit.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chemical Usage & Costs</CardTitle>
            <CardDescription>
              {chemicalUsages.length} chemicals recorded • Total Cost: {formatCurrency(totalChemicalCost / 100)}
            </CardDescription>
          </div>
          <Tabs defaultValue="table" value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="table">
                <Beaker className="h-4 w-4 mr-1" />
                List View
              </TabsTrigger>
              <TabsTrigger value="cost">
                <DollarSign className="h-4 w-4 mr-1" />
                Cost Analysis
              </TabsTrigger>
              <TabsTrigger value="charts">
                <LineChart className="h-4 w-4 mr-1" />
                Charts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "table" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chemical</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chemicalUsages.map((usage) => (
                  <TableRow key={usage.id}>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: chemicalColors[usage.chemicalType as ChemicalType] }}
                        className="text-white"
                      >
                        {formatChemicalType(usage.chemicalType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usage.amount} {usage.unit}
                    </TableCell>
                    <TableCell>{formatCurrency(usage.unitCost / 100)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(usage.totalCost / 100)}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {usage.reason || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === "cost" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Cost Breakdown</h3>
                <Badge variant="outline">
                  Total: {formatCurrency(totalChemicalCost / 100)}
                </Badge>
              </div>
              
              {/* Cost distribution bars */}
              <div className="space-y-3">
                {chemicalUsages.map((usage) => (
                  <div key={usage.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: chemicalColors[usage.chemicalType as ChemicalType] }} 
                        />
                        <span className="text-sm">{formatChemicalType(usage.chemicalType)}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(usage.totalCost / 100)} ({usage.costPercentage?.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress 
                      value={usage.costPercentage} 
                      className="h-2" 
                      style={{ backgroundColor: `${chemicalColors[usage.chemicalType as ChemicalType]}20` }}
                      indicatorColor={chemicalColors[usage.chemicalType as ChemicalType]}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Cost optimization suggestions */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cost Optimization Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <Droplets className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span>
                      Liquid chlorine represents {chemicalUsages.find(u => u.chemicalType === 'liquid_chlorine')?.costPercentage?.toFixed(1) || 0}% 
                      of your chemical costs.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>
                      Consider bulk purchases of frequently used chemicals to reduce unit costs.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeTab === "charts" && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-2 block">Chemical Cost Distribution</Label>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costByChemicalType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: $${(entry.value / 100).toFixed(2)}`}
                    >
                      {costByChemicalType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value / 100)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <Label className="text-base font-medium mb-2 block">Chemical Amounts by Type</Label>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chemicalUsages.map(usage => ({
                      name: formatChemicalType(usage.chemicalType),
                      amount: usage.amount,
                      color: chemicalColors[usage.chemicalType as ChemicalType]
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} units`, "Amount"]} />
                    <Bar dataKey="amount" name="Amount">
                      {chemicalUsages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chemicalColors[entry.chemicalType as ChemicalType]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}