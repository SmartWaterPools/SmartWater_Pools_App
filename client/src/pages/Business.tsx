import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Define types for the business data
interface BusinessData {
  expenses: any[];
  timeEntries: any[];
  reports: any[];
  vendors: any[];
  purchaseOrders: any[];
  inventory: any[];
  licenses: any[];
  insurance: any[];
  poolReports: any[];
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  DollarSign,
  ClipboardList,
  Clock,
  Plus,
  Package,
  ShoppingCart,
  Users,
  FileText,
  BarChart4,
  FileCheck,
  Shield,
  Droplet,
  Map,
  Truck,
  Settings as SettingsIcon,
  Link as LinkIcon,
  Loader2,
  Barcode,
  MapPin
} from "lucide-react";
import ExpensesTable from "@/components/business/ExpensesTable";
// Payroll table component removed
import TimeEntryTable from "@/components/business/TimeEntryTable";
import FinancialReportsTable from "@/components/business/FinancialReportsTable";
import PoolReportsTable from "@/components/business/PoolReportsTable";
import VendorsTable from "@/components/business/VendorsTable";
import PurchaseOrdersTable from "@/components/business/PurchaseOrdersTable";
import InventoryTable from "@/components/business/InventoryTable";
import LicensesTable from "@/components/business/LicensesTable";
import InsuranceTable from "@/components/business/InsuranceTable";
import { ExpenseForm } from "@/components/business/ExpenseForm";
// PayrollForm component removed
import { TimeEntryForm } from "@/components/business/TimeEntryForm";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { FinancialReportForm } from "@/components/business/FinancialReportForm";
import { PoolReportForm } from "@/components/business/PoolReportForm";
import { VendorForm } from "@/components/business/VendorForm";
import { PurchaseOrderForm } from "@/components/business/PurchaseOrderForm";
import { InventoryItemForm } from "@/components/business/InventoryItemForm";
import { LicenseForm } from "@/components/business/LicenseForm";
import { InsuranceForm } from "@/components/business/InsuranceForm";
import { EXPENSE_CATEGORIES } from "@shared/schema";

type TimeRange = 'day' | 'week' | 'month' | 'year';

export default function Business() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [location, setLocation] = useLocation();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showPoolReportForm, setShowPoolReportForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<any>(null);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      return apiRequest("DELETE", `/api/vendors/${vendorId}`);
    },
    onSuccess: () => {
      toast({ title: "Vendor deleted", description: "The vendor has been removed successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete vendor: ${error.message}`, variant: "destructive" });
    }
  });

  // Vendor handlers
  const handleEditVendor = (vendor: any) => {
    setVendorToEdit(vendor);
    setShowVendorForm(true);
  };

  const handleDeleteVendor = (vendorId: number) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteVendorMutation.mutate(vendorId);
    }
  };

  const handleCloseVendorForm = () => {
    setShowVendorForm(false);
    setVendorToEdit(null);
  };

  // Query for business dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<{
    metrics: {
      totalRevenue: number;
      expenses: number;
      profit: number;
      profitMargin: number;
      inventoryValue: number;
      lowStockItems: number;
      outstandingInvoices: number;
    };
    recentExpenses: any[];
    lowStockItems: any[];
    recentTimeEntries: any[];
    recentPurchaseOrders: any[];
    timeRange: string;
  }>({
    queryKey: ['/api/business/dashboard', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/business/dashboard?timeRange=${timeRange}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    enabled: activeTab === "dashboard"
  });

  // Query for expenses data
  const { data: expenses, isLoading: expensesLoading } = useQuery<any[]>({
    queryKey: ['/api/business/expenses'],
    enabled: activeTab === "expenses"
  });

  // Payroll query removed

  // Query for time entries data
  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<any[]>({
    queryKey: ['/api/business/time-entries'],
    enabled: activeTab === "time-tracking"
  });

  // Query for financial reports data
  const { data: reports, isLoading: reportsLoading } = useQuery<any[]>({
    queryKey: ['/api/business/reports'],
    enabled: activeTab === "reports"
  });

  // Query for vendors data
  const { data: vendors, isLoading: vendorsLoading } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
    enabled: activeTab === "vendors"
  });

  // Query for purchase orders data
  const { data: purchaseOrders, isLoading: purchaseOrdersLoading } = useQuery<any[]>({
    queryKey: ['/api/business/purchase-orders'],
    enabled: activeTab === "purchase-orders"
  });

  // Query for inventory items data
  const { data: inventory, isLoading: inventoryLoading } = useQuery<any[]>({
    queryKey: ['/api/business/inventory'],
    enabled: activeTab === "inventory"
  });
  
  // Query for licenses data
  const { data: licenses, isLoading: licensesLoading } = useQuery<any[]>({
    queryKey: ['/api/business/licenses'],
    enabled: activeTab === "licenses"
  });
  
  // Query for insurance data
  const { data: insurance, isLoading: insuranceLoading } = useQuery<any[]>({
    queryKey: ['/api/business/insurance'],
    enabled: activeTab === "insurance"
  });
  
  // Query for pool reports data
  const { data: poolReports, isLoading: poolReportsLoading } = useQuery<any[]>({
    queryKey: ['/api/business/pool-reports'],
    enabled: activeTab === "pool-reports"
  });

  // Dashboard metrics from API or defaults
  const metrics = dashboardData?.metrics || {
    totalRevenue: 0,
    expenses: 0,
    profit: 0,
    profitMargin: 0,
    inventoryValue: 0,
    lowStockItems: 0,
    outstandingInvoices: 0
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const timeRangeLabels: Record<TimeRange, string> = {
    day: '1D',
    week: '1W',
    month: '1M',
    year: '1Y'
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Business Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your business finances, inventory, and operations.
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <BarChart4 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Expenses</span>
            </TabsTrigger>
            {/* Payroll tab removed */}
            <TabsTrigger value="time-tracking" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Time</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="pool-reports" className="flex items-center gap-1">
              <Droplet className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Pool Reports</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="flex items-center gap-1">
              <ClipboardList className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="licenses" className="flex items-center gap-1">
              <FileCheck className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Licenses</span>
            </TabsTrigger>
            <TabsTrigger value="insurance" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Insurance</span>
            </TabsTrigger>
            <TabsTrigger value="vehicle-tracking" className="flex items-center gap-1">
              <Map className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Vehicle Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="vehicle-mapping" className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Vehicle Mapping</span>
            </TabsTrigger>
            <TabsTrigger value="fleetmatics-settings" className="flex items-center gap-1">
              <SettingsIcon className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Fleet Settings</span>
            </TabsTrigger>
            <TabsTrigger value="barcode-scanner" className="flex items-center gap-1">
              <Barcode className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Barcode Scanner</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Time Range Filter Buttons */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Time Range:</span>
            <div className="flex gap-1">
              {(['day', 'week', 'month', 'year'] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="px-3 py-1 h-8"
                >
                  {timeRangeLabels[range]}
                </Button>
              ))}
            </div>
            {dashboardLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  This {timeRange}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Expenses
                </CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold">{formatCurrency(metrics.expenses)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  This {timeRange}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Net Profit
                </CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold">{formatCurrency(metrics.profit)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Margin: {metrics.profitMargin}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Inventory Value
                </CardTitle>
                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-1 sm:p-6 sm:pt-2">
                <div className="text-base sm:text-2xl font-bold">{formatCurrency(metrics.inventoryValue)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {metrics.lowStockItems} items low in stock
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <Card className="col-span-1">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Recent Expenses</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your most recent business expenses</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                {dashboardLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading expenses...</span>
                  </div>
                ) : dashboardData?.recentExpenses && dashboardData.recentExpenses.length > 0 ? (
                  <div className="space-y-2">
                    {dashboardData.recentExpenses.map((expense: any) => (
                      <div key={expense.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{expense.description || expense.category || 'Expense'}</p>
                          <p className="text-xs text-muted-foreground">{expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}</p>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency((Number(expense.amount) || 0) / 100)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">No recent expenses to display.</p>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Recent Time Entries</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest logged work hours</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                {dashboardLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading time entries...</span>
                  </div>
                ) : dashboardData?.recentTimeEntries && dashboardData.recentTimeEntries.length > 0 ? (
                  <div className="space-y-2">
                    {dashboardData.recentTimeEntries.map((entry: any) => (
                      <div key={entry.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{entry.description || 'Time entry'}</p>
                          <p className="text-xs text-muted-foreground">{entry.date ? new Date(entry.date).toLocaleDateString() : 'No date'}</p>
                        </div>
                        <span className="text-sm font-semibold">{entry.hoursWorked || 0} hrs</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">No recent time entries to display.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
            <Card className="col-span-1">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Vendor Orders</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Recent purchase orders</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                {dashboardLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading purchase orders...</span>
                  </div>
                ) : dashboardData?.recentPurchaseOrders && dashboardData.recentPurchaseOrders.length > 0 ? (
                  <div className="space-y-2">
                    {dashboardData.recentPurchaseOrders.map((order: any) => (
                      <div key={order.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{order.vendorName || 'Order #' + order.id}</p>
                          <p className="text-xs text-muted-foreground">{order.status || 'Pending'}</p>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency((Number(order.totalAmount) || 0) / 100)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">No recent purchase orders to display.</p>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Low Stock</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Items below minimum stock level</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                {dashboardLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading inventory data...</span>
                  </div>
                ) : dashboardData?.lowStockItems && dashboardData.lowStockItems.length > 0 ? (
                  <div className="space-y-2">
                    {dashboardData.lowStockItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{item.name || 'Item'}</p>
                          <p className="text-xs text-muted-foreground">Min: {item.minimumStock || 0}</p>
                        </div>
                        <span className="text-sm font-semibold text-orange-500">Low</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">No low stock items to display.</p>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Outstanding Orders</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Pending purchase orders</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 sm:p-6 sm:pt-4">
                {dashboardLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading order data...</span>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold">{metrics.outstandingInvoices}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">orders awaiting fulfillment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Expenses</h2>
            <Button onClick={() => setShowExpenseForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Add</span> Expense
            </Button>
          </div>
          {showExpenseForm && (
            <ExpenseForm
              categories={EXPENSE_CATEGORIES as unknown as string[]}
              onClose={() => setShowExpenseForm(false)}
            />
          )}
          <ExpensesTable
            data={expenses || []}
            isLoading={expensesLoading}
          />
        </TabsContent>

        {/* Payroll Tab removed */}

        {/* Time Tracking Tab */}
        <TabsContent value="time-tracking" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Time Tracking</h2>
            <Button onClick={() => setShowTimeEntryForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Add</span> Time
            </Button>
          </div>
          {showTimeEntryForm && (
            <TimeEntryForm
              onClose={() => setShowTimeEntryForm(false)}
            />
          )}
          <TimeEntryTable
            data={timeEntries || []}
            isLoading={timeEntriesLoading}
          />
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Financial Reports</h2>
            <Button onClick={() => setShowReportForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Create</span> Report
            </Button>
          </div>
          {showReportForm && (
            <FinancialReportForm
              onClose={() => setShowReportForm(false)}
            />
          )}
          <FinancialReportsTable
            data={reports || []}
            isLoading={reportsLoading}
          />
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Vendors</h2>
            <Button onClick={() => setShowVendorForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Add</span> Vendor
            </Button>
          </div>
          {showVendorForm && (
            <VendorForm
              vendorToEdit={vendorToEdit}
              onClose={handleCloseVendorForm}
            />
          )}
          <VendorsTable
            data={vendors || []}
            isLoading={vendorsLoading}
            onEdit={handleEditVendor}
            onDelete={handleDeleteVendor}
          />
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Purchase Orders</h2>
            <Button onClick={() => setShowPurchaseOrderForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Create</span> Order
            </Button>
          </div>
          {showPurchaseOrderForm && (
            <PurchaseOrderForm
              onClose={() => setShowPurchaseOrderForm(false)}
            />
          )}
          <PurchaseOrdersTable
            data={purchaseOrders || []}
            isLoading={purchaseOrdersLoading}
          />
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Inventory</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
                onClick={() => {
                  // Use the TabManager API to add a new tab without replacing existing ones
                  const event = new CustomEvent('addTab', {
                    detail: {
                      path: '/inventory/transfers',
                      title: 'Inventory Transfers',
                      icon: 'transfer'
                    }
                  });
                  window.dispatchEvent(event);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 sm:h-4 sm:w-4">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                <span className="hidden xs:inline">Inventory</span> Transfers
              </Button>
              <Button onClick={() => setShowInventoryForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Add</span> Item
              </Button>
            </div>
          </div>
          {showInventoryForm && (
            <InventoryItemForm
              onClose={() => setShowInventoryForm(false)}
            />
          )}
          <InventoryTable
            data={inventory || []}
            isLoading={inventoryLoading}
          />
        </TabsContent>
        
        {/* Licenses Tab */}
        <TabsContent value="licenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Licenses & Certifications</h2>
            <Button onClick={() => setShowLicenseForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Add</span> License
            </Button>
          </div>
          {showLicenseForm && (
            <LicenseForm
              onClose={() => setShowLicenseForm(false)}
            />
          )}
          <LicensesTable
            data={licenses || []}
            isLoading={licensesLoading}
          />
        </TabsContent>
        
        {/* Insurance Tab */}
        <TabsContent value="insurance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Insurance Policies</h2>
            <Button onClick={() => setShowInsuranceForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Add</span> Policy
            </Button>
          </div>
          {showInsuranceForm && (
            <InsuranceForm
              onClose={() => setShowInsuranceForm(false)}
            />
          )}
          <InsuranceTable
            data={insurance || []}
            isLoading={insuranceLoading}
          />
        </TabsContent>
        
        {/* Pool Reports Tab */}
        <TabsContent value="pool-reports" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Pool Reports</h2>
            <Button onClick={() => setShowPoolReportForm(true)} className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Create</span> Report
            </Button>
          </div>
          {showPoolReportForm && (
            <PoolReportForm
              open={showPoolReportForm}
              onOpenChange={setShowPoolReportForm}
            />
          )}
          <PoolReportsTable
            reports={poolReports || []}
            isLoading={poolReportsLoading}
            onCreateReport={() => setShowPoolReportForm(true)}
          />
        </TabsContent>

        {/* Vehicle Tracking Tab */}
        <TabsContent value="vehicle-tracking" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Vehicle Tracking</h2>
            <Button 
              variant="outline" 
              className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              onClick={() => {
                // Open in a full page
                const event = new CustomEvent('addTab', {
                  detail: {
                    path: '/fleetmatics/vehicle-tracking',
                    title: 'Vehicle Tracking Map',
                    icon: 'map'
                  }
                });
                window.dispatchEvent(event);
              }}
            >
              <Map className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Open</span> Full Map
            </Button>
          </div>
          <Card className="col-span-1">
            <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
              <CardTitle className="text-base sm:text-lg">GPS Vehicle Tracking</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Track your technician vehicles in real-time with Fleetmatics GPS
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-2">
              <div className="text-center py-8">
                <Map className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-sm mb-4">View your technician vehicles on a real-time tracking map</p>
                <Button 
                  onClick={() => {
                    setLocation("/fleetmatics/vehicle-tracking");
                  }}
                >
                  Open Vehicle Tracking
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle Mapping Tab */}
        <TabsContent value="vehicle-mapping" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Vehicle Mapping</h2>
            <Button 
              variant="outline" 
              className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              onClick={() => {
                // Open in a full page
                const event = new CustomEvent('addTab', {
                  detail: {
                    path: '/fleetmatics/vehicle-mapping',
                    title: 'Vehicle Mapping',
                    icon: 'truck'
                  }
                });
                window.dispatchEvent(event);
              }}
            >
              <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Open</span> Vehicle Mapping
            </Button>
          </div>
          <Card className="col-span-1">
            <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
              <CardTitle className="text-base sm:text-lg">Vehicle Mapping</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Map your technician vehicles to Fleetmatics GPS devices
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-2">
              <div className="text-center py-8">
                <Truck className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-sm mb-4">Connect your technician vehicles to Fleetmatics for GPS tracking</p>
                <Button 
                  onClick={() => {
                    setLocation("/fleetmatics/vehicle-mapping");
                  }}
                >
                  Configure Vehicle Mapping
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fleetmatics Settings Tab */}
        <TabsContent value="fleetmatics-settings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Fleetmatics Settings</h2>
            <Button 
              variant="outline" 
              className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              onClick={() => {
                // Open in a full page
                const event = new CustomEvent('addTab', {
                  detail: {
                    path: '/fleetmatics/settings',
                    title: 'Fleetmatics Settings',
                    icon: 'settings'
                  }
                });
                window.dispatchEvent(event);
              }}
            >
              <SettingsIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Open</span> Settings
            </Button>
          </div>
          <Card className="col-span-1">
            <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
              <CardTitle className="text-base sm:text-lg">Fleetmatics Integration</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure your Fleetmatics GPS integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-2">
              <div className="text-center py-8">
                <SettingsIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-sm mb-4">Set up your API keys and synchronization settings for Fleetmatics</p>
                <Button 
                  onClick={() => {
                    setLocation("/fleetmatics/settings");
                  }}
                >
                  Configure Fleetmatics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barcode Scanner Tab */}
        <TabsContent value="barcode-scanner" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">Barcode Scanner</h2>
            <Button 
              variant="outline" 
              className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              onClick={() => {
                // Open in a full page
                const event = new CustomEvent('addTab', {
                  detail: {
                    path: '/inventory/barcode-scanner',
                    title: 'Barcode Scanner',
                    icon: 'barcode'
                  }
                });
                window.dispatchEvent(event);
              }}
            >
              <Barcode className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Open</span> Scanner
            </Button>
          </div>
          <Card>
            <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
              <CardTitle className="text-base sm:text-lg">Scan Equipment and Inventory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Use the barcode scanner to quickly identify and track inventory items
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-2">
              <BarcodeScanner onScan={(barcode: string) => {
                console.log("Barcode scanned:", barcode);
                // Here we would typically dispatch an action or call a function
                // to handle the scanned barcode (e.g. lookup item, update inventory)
              }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}