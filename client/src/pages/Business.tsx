import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Shield
} from "lucide-react";
import ExpensesTable from "@/components/business/ExpensesTable";
// Payroll table component removed
import TimeEntryTable from "@/components/business/TimeEntryTable";
import FinancialReportsTable from "@/components/business/FinancialReportsTable";
import VendorsTable from "@/components/business/VendorsTable";
import PurchaseOrdersTable from "@/components/business/PurchaseOrdersTable";
import InventoryTable from "@/components/business/InventoryTable";
import LicensesTable from "@/components/business/LicensesTable";
import InsuranceTable from "@/components/business/InsuranceTable";
import { ExpenseForm } from "@/components/business/ExpenseForm";
// PayrollForm component removed
import { TimeEntryForm } from "@/components/business/TimeEntryForm";
import { FinancialReportForm } from "@/components/business/FinancialReportForm";
import { VendorForm } from "@/components/business/VendorForm";
import { PurchaseOrderForm } from "@/components/business/PurchaseOrderForm";
import { InventoryItemForm } from "@/components/business/InventoryItemForm";
import { LicenseForm } from "@/components/business/LicenseForm";
import { InsuranceForm } from "@/components/business/InsuranceForm";
import { EXPENSE_CATEGORIES } from "@shared/schema";

export default function Business() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  // Payroll state removed
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);

  // Query for business dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/business/dashboard'],
    enabled: activeTab === "dashboard"
  });

  // Query for expenses data
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['/api/business/expenses'],
    enabled: activeTab === "expenses"
  });

  // Payroll query removed

  // Query for time entries data
  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['/api/business/time-entries'],
    enabled: activeTab === "time-tracking"
  });

  // Query for financial reports data
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/business/reports'],
    enabled: activeTab === "reports"
  });

  // Query for vendors data
  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['/api/business/vendors'],
    enabled: activeTab === "vendors"
  });

  // Query for purchase orders data
  const { data: purchaseOrders, isLoading: purchaseOrdersLoading } = useQuery({
    queryKey: ['/api/business/purchase-orders'],
    enabled: activeTab === "purchase-orders"
  });

  // Query for inventory items data
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/business/inventory'],
    enabled: activeTab === "inventory"
  });
  
  // Query for licenses data
  const { data: licenses, isLoading: licensesLoading } = useQuery({
    queryKey: ['/api/business/licenses'],
    enabled: activeTab === "licenses"
  });
  
  // Query for insurance data
  const { data: insurance, isLoading: insuranceLoading } = useQuery({
    queryKey: ['/api/business/insurance'],
    enabled: activeTab === "insurance"
  });

  // Dashboard metrics (placeholder data until API is implemented)
  const metrics = {
    totalRevenue: "$45,231.89",
    expenses: "$12,756.42",
    profit: "$32,475.47",
    profitMargin: "71.8%",
    // Payroll metrics removed
    inventoryValue: "$32,156.90",
    lowStockItems: 7,
    outstandingInvoices: 12
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Management</h1>
          <p className="text-muted-foreground">
            Manage your business finances, inventory, and operations.
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:grid-cols-10 gap-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-1">
            <BarChart4 className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="hidden md:inline">Expenses</span>
          </TabsTrigger>
          {/* Payroll tab removed */}
          <TabsTrigger value="time-tracking" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className="hidden md:inline">Time</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-1">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden md:inline">Vendors</span>
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="flex items-center gap-1">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden md:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span className="hidden md:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="licenses" className="flex items-center gap-1">
            <FileCheck className="h-4 w-4" />
            <span className="hidden md:inline">Licenses</span>
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">Insurance</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalRevenue}</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Expenses
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.expenses}</div>
                <p className="text-xs text-muted-foreground">
                  -4.5% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Net Profit
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.profit}</div>
                <p className="text-xs text-muted-foreground">
                  Profit Margin: {metrics.profitMargin}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Inventory Value
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.inventoryValue}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.lowStockItems} items low in stock
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Your most recent business expenses</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <p>Loading expenses...</p>
                ) : (
                  <div className="space-y-4">
                    {/* Placeholder for expense data */}
                    <p className="text-sm text-muted-foreground">No recent expenses to display.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Payroll card removed */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Vendor Orders</CardTitle>
                <CardDescription>Recent purchase orders</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <p>Loading purchase orders...</p>
                ) : (
                  <div className="space-y-4">
                    {/* Placeholder for purchase order data */}
                    <p className="text-sm text-muted-foreground">No recent purchase orders to display.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Low Stock</CardTitle>
                <CardDescription>Items below minimum stock level</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <p>Loading inventory data...</p>
                ) : (
                  <div className="space-y-4">
                    {/* Placeholder for inventory data */}
                    <p className="text-sm text-muted-foreground">No low stock items to display.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Outstanding Invoices</CardTitle>
                <CardDescription>Unpaid client invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <p>Loading invoice data...</p>
                ) : (
                  <div className="space-y-4">
                    {/* Placeholder for invoice data */}
                    <p className="text-sm text-muted-foreground">No outstanding invoices to display.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Expenses</h2>
            <Button onClick={() => setShowExpenseForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Expense
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
            <h2 className="text-2xl font-bold">Time Tracking</h2>
            <Button onClick={() => setShowTimeEntryForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Time Entry
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
            <h2 className="text-2xl font-bold">Financial Reports</h2>
            <Button onClick={() => setShowReportForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Create Report
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
            <h2 className="text-2xl font-bold">Vendors</h2>
            <Button onClick={() => setShowVendorForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
          </div>
          {showVendorForm && (
            <VendorForm
              onClose={() => setShowVendorForm(false)}
            />
          )}
          <VendorsTable
            data={vendors || []}
            isLoading={vendorsLoading}
          />
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Purchase Orders</h2>
            <Button onClick={() => setShowPurchaseOrderForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Create Purchase Order
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
            <h2 className="text-2xl font-bold">Inventory</h2>
            <Button onClick={() => setShowInventoryForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Inventory Item
            </Button>
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
            <h2 className="text-2xl font-bold">Licenses & Certifications</h2>
            <Button onClick={() => setShowLicenseForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add License
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
            <h2 className="text-2xl font-bold">Insurance Policies</h2>
            <Button onClick={() => setShowInsuranceForm(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Insurance Policy
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
      </Tabs>
    </div>
  );
}