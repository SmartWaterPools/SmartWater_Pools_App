import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  ShieldCheck,
  Users,
  Wrench,
  ClipboardList,
  Calendar,
  Package,
  Receipt,
  FileText,
  MessageSquare,
  Truck,
  Settings,
  Eye,
  Edit,
  RotateCcw,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RoleKey = "system_admin" | "org_admin" | "manager" | "office_staff" | "technician" | "client" | "vendor";

interface RoleDefinition {
  key: RoleKey;
  label: string;
  description: string;
  icon: typeof Shield;
}

interface PermissionFeature {
  key: string;
  label: string;
}

interface PermissionCategory {
  key: string;
  label: string;
  icon: typeof Shield;
  features: PermissionFeature[];
}

type PermissionsState = Record<RoleKey, Record<string, boolean>>;

const ROLES: RoleDefinition[] = [
  { key: "system_admin", label: "System Admin", description: "Full platform access, cross-org management", icon: ShieldCheck },
  { key: "org_admin", label: "Organization Admin", description: "Full access within their organization", icon: Shield },
  { key: "manager", label: "Manager", description: "Manages day-to-day operations, staff, scheduling", icon: Users },
  { key: "office_staff", label: "Office Staff", description: "Handles billing, client communication, scheduling", icon: ClipboardList },
  { key: "technician", label: "Technician", description: "Field work, service reports, assigned work orders", icon: Wrench },
  { key: "client", label: "Client", description: "Client portal: view projects, invoices, service reports, communicate", icon: Eye },
  { key: "vendor", label: "Vendor", description: "View assigned work, submit invoices, manage their profile", icon: Truck },
];

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: "dashboard",
    label: "Dashboard & Analytics",
    icon: Eye,
    features: [
      { key: "view_dashboard", label: "View Dashboard" },
      { key: "view_reports", label: "View Reports" },
      { key: "view_financial_reports", label: "View Financial Reports" },
    ],
  },
  {
    key: "clients",
    label: "Client Management",
    icon: Users,
    features: [
      { key: "view_clients", label: "View Clients" },
      { key: "add_edit_clients", label: "Add/Edit Clients" },
      { key: "delete_clients", label: "Delete Clients" },
      { key: "view_client_portal", label: "View Client Portal" },
    ],
  },
  {
    key: "projects",
    label: "Project Management",
    icon: ClipboardList,
    features: [
      { key: "view_projects", label: "View Projects" },
      { key: "create_edit_projects", label: "Create/Edit Projects" },
      { key: "delete_projects", label: "Delete Projects" },
      { key: "manage_milestones", label: "Manage Milestones" },
    ],
  },
  {
    key: "work_orders",
    label: "Work Orders",
    icon: Wrench,
    features: [
      { key: "view_work_orders", label: "View Work Orders" },
      { key: "create_edit_work_orders", label: "Create/Edit Work Orders" },
      { key: "assign_work_orders", label: "Assign Work Orders" },
      { key: "complete_work_orders", label: "Complete Work Orders" },
    ],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: Settings,
    features: [
      { key: "view_maintenance_orders", label: "View Maintenance Orders" },
      { key: "create_edit_maintenance_orders", label: "Create/Edit Maintenance Orders" },
      { key: "view_routes", label: "View Routes" },
      { key: "manage_routes", label: "Manage Routes" },
    ],
  },
  {
    key: "scheduling",
    label: "Scheduling",
    icon: Calendar,
    features: [
      { key: "view_schedule", label: "View Schedule" },
      { key: "create_edit_schedule", label: "Create/Edit Schedule" },
      { key: "manage_calendar", label: "Manage Calendar" },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: Package,
    features: [
      { key: "view_inventory", label: "View Inventory" },
      { key: "add_edit_items", label: "Add/Edit Items" },
      { key: "manage_stock", label: "Manage Stock" },
      { key: "view_warehouses_vehicles", label: "View Warehouses/Vehicles" },
    ],
  },
  {
    key: "billing",
    label: "Billing & Invoicing",
    icon: Receipt,
    features: [
      { key: "view_invoices", label: "View Invoices" },
      { key: "create_edit_invoices", label: "Create/Edit Invoices" },
      { key: "send_invoices", label: "Send Invoices" },
      { key: "process_payments", label: "Process Payments" },
      { key: "view_estimates", label: "View Estimates" },
      { key: "create_edit_estimates", label: "Create/Edit Estimates" },
    ],
  },
  {
    key: "service_reports",
    label: "Service Reports",
    icon: FileText,
    features: [
      { key: "view_service_reports", label: "View Service Reports" },
      { key: "create_edit_reports", label: "Create/Edit Reports" },
      { key: "submit_reports", label: "Submit Reports" },
    ],
  },
  {
    key: "communications",
    label: "Communications",
    icon: MessageSquare,
    features: [
      { key: "view_messages", label: "View Messages" },
      { key: "send_messages", label: "Send Messages" },
      { key: "send_sms", label: "Send SMS" },
      { key: "make_calls", label: "Make Calls" },
    ],
  },
  {
    key: "vendors",
    label: "Vendor Management",
    icon: Truck,
    features: [
      { key: "view_vendors", label: "View Vendors" },
      { key: "add_edit_vendors", label: "Add/Edit Vendors" },
      { key: "view_vendor_invoices", label: "View Vendor Invoices" },
      { key: "process_vendor_invoices", label: "Process Vendor Invoices" },
    ],
  },
  {
    key: "settings",
    label: "Settings & Admin",
    icon: Settings,
    features: [
      { key: "view_settings", label: "View Settings" },
      { key: "edit_organization_settings", label: "Edit Organization Settings" },
      { key: "manage_users", label: "Manage Users" },
      { key: "manage_roles", label: "Manage Roles" },
    ],
  },
];

const DEFAULT_PERMISSIONS: PermissionsState = {
  system_admin: {
    view_dashboard: true, view_reports: true, view_financial_reports: true,
    view_clients: true, add_edit_clients: true, delete_clients: true, view_client_portal: true,
    view_projects: true, create_edit_projects: true, delete_projects: true, manage_milestones: true,
    view_work_orders: true, create_edit_work_orders: true, assign_work_orders: true, complete_work_orders: true,
    view_maintenance_orders: true, create_edit_maintenance_orders: true, view_routes: true, manage_routes: true,
    view_schedule: true, create_edit_schedule: true, manage_calendar: true,
    view_inventory: true, add_edit_items: true, manage_stock: true, view_warehouses_vehicles: true,
    view_invoices: true, create_edit_invoices: true, send_invoices: true, process_payments: true, view_estimates: true, create_edit_estimates: true,
    view_service_reports: true, create_edit_reports: true, submit_reports: true,
    view_messages: true, send_messages: true, send_sms: true, make_calls: true,
    view_vendors: true, add_edit_vendors: true, view_vendor_invoices: true, process_vendor_invoices: true,
    view_settings: true, edit_organization_settings: true, manage_users: true, manage_roles: true,
  },
  org_admin: {
    view_dashboard: true, view_reports: true, view_financial_reports: true,
    view_clients: true, add_edit_clients: true, delete_clients: true, view_client_portal: true,
    view_projects: true, create_edit_projects: true, delete_projects: true, manage_milestones: true,
    view_work_orders: true, create_edit_work_orders: true, assign_work_orders: true, complete_work_orders: true,
    view_maintenance_orders: true, create_edit_maintenance_orders: true, view_routes: true, manage_routes: true,
    view_schedule: true, create_edit_schedule: true, manage_calendar: true,
    view_inventory: true, add_edit_items: true, manage_stock: true, view_warehouses_vehicles: true,
    view_invoices: true, create_edit_invoices: true, send_invoices: true, process_payments: true, view_estimates: true, create_edit_estimates: true,
    view_service_reports: true, create_edit_reports: true, submit_reports: true,
    view_messages: true, send_messages: true, send_sms: true, make_calls: true,
    view_vendors: true, add_edit_vendors: true, view_vendor_invoices: true, process_vendor_invoices: true,
    view_settings: true, edit_organization_settings: true, manage_users: true, manage_roles: true,
  },
  manager: {
    view_dashboard: true, view_reports: true, view_financial_reports: true,
    view_clients: true, add_edit_clients: true, delete_clients: false, view_client_portal: true,
    view_projects: true, create_edit_projects: true, delete_projects: false, manage_milestones: true,
    view_work_orders: true, create_edit_work_orders: true, assign_work_orders: true, complete_work_orders: true,
    view_maintenance_orders: true, create_edit_maintenance_orders: true, view_routes: true, manage_routes: true,
    view_schedule: true, create_edit_schedule: true, manage_calendar: true,
    view_inventory: true, add_edit_items: true, manage_stock: true, view_warehouses_vehicles: true,
    view_invoices: true, create_edit_invoices: true, send_invoices: true, process_payments: true, view_estimates: true, create_edit_estimates: true,
    view_service_reports: true, create_edit_reports: true, submit_reports: true,
    view_messages: true, send_messages: true, send_sms: true, make_calls: true,
    view_vendors: true, add_edit_vendors: true, view_vendor_invoices: true, process_vendor_invoices: true,
    view_settings: true, edit_organization_settings: false, manage_users: false, manage_roles: false,
  },
  office_staff: {
    view_dashboard: true, view_reports: true, view_financial_reports: false,
    view_clients: true, add_edit_clients: true, delete_clients: false, view_client_portal: true,
    view_projects: true, create_edit_projects: false, delete_projects: false, manage_milestones: false,
    view_work_orders: true, create_edit_work_orders: true, assign_work_orders: false, complete_work_orders: true,
    view_maintenance_orders: true, create_edit_maintenance_orders: true, view_routes: true, manage_routes: false,
    view_schedule: true, create_edit_schedule: true, manage_calendar: true,
    view_inventory: true, add_edit_items: true, manage_stock: true, view_warehouses_vehicles: true,
    view_invoices: true, create_edit_invoices: true, send_invoices: true, process_payments: false, view_estimates: true, create_edit_estimates: true,
    view_service_reports: true, create_edit_reports: true, submit_reports: true,
    view_messages: true, send_messages: true, send_sms: true, make_calls: true,
    view_vendors: true, add_edit_vendors: false, view_vendor_invoices: true, process_vendor_invoices: false,
    view_settings: false, edit_organization_settings: false, manage_users: false, manage_roles: false,
  },
  technician: {
    view_dashboard: true, view_reports: false, view_financial_reports: false,
    view_clients: true, add_edit_clients: false, delete_clients: false, view_client_portal: true,
    view_projects: true, create_edit_projects: false, delete_projects: false, manage_milestones: false,
    view_work_orders: true, create_edit_work_orders: false, assign_work_orders: false, complete_work_orders: true,
    view_maintenance_orders: true, create_edit_maintenance_orders: false, view_routes: true, manage_routes: false,
    view_schedule: true, create_edit_schedule: false, manage_calendar: false,
    view_inventory: true, add_edit_items: false, manage_stock: false, view_warehouses_vehicles: true,
    view_invoices: false, create_edit_invoices: false, send_invoices: false, process_payments: false, view_estimates: false, create_edit_estimates: false,
    view_service_reports: true, create_edit_reports: true, submit_reports: true,
    view_messages: true, send_messages: true, send_sms: false, make_calls: false,
    view_vendors: false, add_edit_vendors: false, view_vendor_invoices: false, process_vendor_invoices: false,
    view_settings: false, edit_organization_settings: false, manage_users: false, manage_roles: false,
  },
  client: {
    view_dashboard: false, view_reports: false, view_financial_reports: false,
    view_clients: false, add_edit_clients: false, delete_clients: false, view_client_portal: true,
    view_projects: true, create_edit_projects: false, delete_projects: false, manage_milestones: false,
    view_work_orders: true, create_edit_work_orders: false, assign_work_orders: false, complete_work_orders: false,
    view_maintenance_orders: false, create_edit_maintenance_orders: false, view_routes: false, manage_routes: false,
    view_schedule: true, create_edit_schedule: false, manage_calendar: false,
    view_inventory: false, add_edit_items: false, manage_stock: false, view_warehouses_vehicles: false,
    view_invoices: true, create_edit_invoices: false, send_invoices: false, process_payments: false, view_estimates: true, create_edit_estimates: false,
    view_service_reports: true, create_edit_reports: false, submit_reports: false,
    view_messages: true, send_messages: true, send_sms: false, make_calls: false,
    view_vendors: false, add_edit_vendors: false, view_vendor_invoices: false, process_vendor_invoices: false,
    view_settings: false, edit_organization_settings: false, manage_users: false, manage_roles: false,
  },
  vendor: {
    view_dashboard: false, view_reports: false, view_financial_reports: false,
    view_clients: false, add_edit_clients: false, delete_clients: false, view_client_portal: false,
    view_projects: false, create_edit_projects: false, delete_projects: false, manage_milestones: false,
    view_work_orders: true, create_edit_work_orders: false, assign_work_orders: false, complete_work_orders: true,
    view_maintenance_orders: false, create_edit_maintenance_orders: false, view_routes: false, manage_routes: false,
    view_schedule: true, create_edit_schedule: false, manage_calendar: false,
    view_inventory: false, add_edit_items: false, manage_stock: false, view_warehouses_vehicles: false,
    view_invoices: true, create_edit_invoices: false, send_invoices: false, process_payments: false, view_estimates: true, create_edit_estimates: false,
    view_service_reports: false, create_edit_reports: false, submit_reports: false,
    view_messages: true, send_messages: true, send_sms: false, make_calls: false,
    view_vendors: true, add_edit_vendors: false, view_vendor_invoices: true, process_vendor_invoices: false,
    view_settings: false, edit_organization_settings: false, manage_users: false, manage_roles: false,
  },
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function PermissionsManagement() {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<PermissionsState>(() => deepClone(DEFAULT_PERMISSIONS));
  const [activeRole, setActiveRole] = useState<RoleKey>("system_admin");
  const [hasChanges, setHasChanges] = useState(false);

  const allFeatureKeys = useMemo(() => {
    return PERMISSION_CATEGORIES.flatMap(cat => cat.features.map(f => f.key));
  }, []);

  const totalFeatures = allFeatureKeys.length;

  const getEnabledCount = useCallback((role: RoleKey) => {
    const rolePerms = permissions[role];
    return allFeatureKeys.filter(key => rolePerms[key]).length;
  }, [permissions, allFeatureKeys]);

  const togglePermission = useCallback((role: RoleKey, featureKey: string) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [featureKey]: !prev[role][featureKey],
      },
    }));
    setHasChanges(true);
  }, []);

  const resetRoleToDefaults = useCallback((role: RoleKey) => {
    setPermissions(prev => ({
      ...prev,
      [role]: deepClone(DEFAULT_PERMISSIONS[role]),
    }));
    setHasChanges(true);
    toast({
      title: "Permissions Reset",
      description: `${ROLES.find(r => r.key === role)?.label} permissions have been reset to defaults.`,
    });
  }, [toast]);

  const handleSave = useCallback(() => {
    setHasChanges(false);
    toast({
      title: "Permissions Saved",
      description: "Role permissions have been saved successfully.",
    });
  }, [toast]);

  const getCategoryEnabledCount = useCallback((role: RoleKey, category: PermissionCategory) => {
    const rolePerms = permissions[role];
    return category.features.filter(f => rolePerms[f.key]).length;
  }, [permissions]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
            <CardDescription className="mt-1">
              Configure what each role can access across the platform. Changes apply to all users with the selected role.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as RoleKey)}>
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="mb-6 flex w-max gap-1">
              {ROLES.map(role => {
                const enabled = getEnabledCount(role.key);
                const RoleIcon = role.icon;
                return (
                  <TabsTrigger key={role.key} value={role.key} className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                    <RoleIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{role.label}</span>
                    <span className="sm:hidden">{role.label.split(" ")[0]}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {enabled}/{totalFeatures}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {ROLES.map(role => {
            const RoleIcon = role.icon;
            const enabled = getEnabledCount(role.key);
            return (
              <TabsContent key={role.key} value={role.key}>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2.5">
                      <RoleIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{role.label}</h3>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {enabled} of {totalFeatures} permissions enabled
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => resetRoleToDefaults(role.key)}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                    Reset to Defaults
                  </Button>
                </div>

                <Accordion type="multiple" defaultValue={PERMISSION_CATEGORIES.map(c => c.key)} className="space-y-2">
                  {PERMISSION_CATEGORIES.map(category => {
                    const CategoryIcon = category.icon;
                    const catEnabled = getCategoryEnabledCount(role.key, category);
                    const catTotal = category.features.length;
                    return (
                      <AccordionItem key={category.key} value={category.key} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{category.label}</span>
                            <Badge variant={catEnabled === catTotal ? "default" : catEnabled === 0 ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                              {catEnabled}/{catTotal}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Separator className="mb-3" />
                          <div className="space-y-1">
                            {category.features.map((feature, idx) => {
                              const isEnabled = permissions[role.key][feature.key];
                              return (
                                <div
                                  key={feature.key}
                                  className={`flex items-center justify-between py-2.5 px-3 rounded-md transition-colors ${
                                    isEnabled ? "bg-primary/5" : "hover:bg-muted/50"
                                  } ${idx < category.features.length - 1 ? "border-b border-border/50" : ""}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {feature.label.startsWith("View") ? (
                                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : feature.label.startsWith("Add") || feature.label.startsWith("Create") ? (
                                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">{feature.label}</span>
                                  </div>
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={() => togglePermission(role.key, feature.key)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
