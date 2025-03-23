import {
  Organization, InsertOrganization,
  User, InsertUser,
  Client, InsertClient, 
  Technician, InsertTechnician,
  Project, InsertProject,
  ProjectPhase, InsertProjectPhase,
  ProjectAssignment, InsertProjectAssignment,
  Maintenance, InsertMaintenance,
  Repair, InsertRepair,
  Invoice, InsertInvoice,
  PoolEquipment, InsertPoolEquipment,
  PoolImage, InsertPoolImage,
  ServiceTemplate, InsertServiceTemplate,
  ProjectDocumentation, InsertProjectDocumentation,
  CommunicationProvider, InsertCommunicationProvider, CommunicationProviderType,
  ChemicalUsage, InsertChemicalUsage, ChemicalType,
  WaterReading, InsertWaterReading,
  MaintenanceReport, InsertMaintenanceReport,
  Route, InsertRoute,
  RouteAssignment, InsertRouteAssignment,
  InventoryItem, InsertInventoryItem,
  Warehouse, InsertWarehouse,
  TechnicianVehicle, InsertTechnicianVehicle,
  WarehouseInventory, InsertWarehouseInventory,
  VehicleInventory, InsertVehicleInventory,
  InventoryTransfer, InsertInventoryTransfer,
  InventoryTransferItem, InsertInventoryTransferItem,
  Barcode, InsertBarcode,
  BarcodeScanHistory, InsertBarcodeScanHistory,
  InventoryAdjustment, InsertInventoryAdjustment,
  TransferType, TransferStatus, BarcodeType,
  FleetmaticsConfig, InsertFleetmaticsConfig,
  FleetmaticsLocationHistory, InsertFleetmaticsLocationHistory,
  SubscriptionPlan, InsertSubscriptionPlan,
  Subscription, InsertSubscription,
  PaymentRecord, InsertPaymentRecord,
  organizations, users, clients, technicians, projects, projectPhases, projectAssignments, maintenances, 
  repairs, invoices, poolEquipment, poolImages, serviceTemplates, projectDocumentation, 
  communicationProviders, chemicalUsage, waterReadings, maintenanceReports, routes, routeAssignments,
  warehouses, technicianVehicles, warehouseInventory, vehicleInventory, inventoryTransfers,
  inventoryTransferItems, barcodes, barcodeScanHistory, inventoryAdjustments, inventoryItems,
  fleetmaticsConfig, fleetmaticsLocationHistory, subscriptionPlans, subscriptions, paymentRecords
} from "@shared/schema";
import { and, eq, desc, gte, lte, sql, asc, isNotNull, lt, or, inArray } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(organization: Partial<InsertOrganization>): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<Organization>): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  
  // Fleetmatics operations
  getFleetmaticsConfig(id: number): Promise<FleetmaticsConfig | undefined>;
  getFleetmaticsConfigByOrganizationId(organizationId: number): Promise<FleetmaticsConfig | undefined>;
  createFleetmaticsConfig(config: InsertFleetmaticsConfig): Promise<FleetmaticsConfig>;
  updateFleetmaticsConfig(id: number, config: Partial<FleetmaticsConfig>): Promise<FleetmaticsConfig | undefined>;
  getAllFleetmaticsConfigs(): Promise<FleetmaticsConfig[]>;
  createFleetmaticsLocationHistory(history: InsertFleetmaticsLocationHistory): Promise<FleetmaticsLocationHistory>;
  getFleetmaticsLocationHistory(id: number): Promise<FleetmaticsLocationHistory | undefined>;
  getFleetmaticsLocationHistoryByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory[]>;
  getLatestFleetmaticsLocationByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory | undefined>;
  getFleetmaticsLocationHistoryByDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<FleetmaticsLocationHistory[]>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByOrganizationId(organizationId: number): Promise<User[]>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientByUserId(userId: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  getClientsByOrganizationId(organizationId: number): Promise<Client[]>;
  getClientWithUser(id: number): Promise<{ client: Client; user: User } | undefined>;
  
  // Technician operations
  getTechnician(id: number): Promise<Technician | undefined>;
  getTechnicianByUserId(userId: number): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  getAllTechnicians(): Promise<Technician[]>;
  getTechnicianWithUser(id: number): Promise<{ technician: Technician; user: User } | undefined>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  getProjectsByType(projectType: string): Promise<Project[]>;
  getProjectsByStatus(status: string): Promise<Project[]>;
  getArchivedProjects(): Promise<Project[]>;
  
  // Project Phases operations
  getProjectPhase(id: number): Promise<ProjectPhase | undefined>;
  createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase>;
  updateProjectPhase(id: number, phase: Partial<ProjectPhase>): Promise<ProjectPhase | undefined>;
  deleteProjectPhase(id: number): Promise<boolean>;
  getProjectPhasesByProjectId(projectId: number): Promise<ProjectPhase[]>;
  
  // Project assignment operations
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  
  // Maintenance operations
  getMaintenance(id: number): Promise<Maintenance | undefined>;
  createMaintenance(maintenance: InsertMaintenance): Promise<Maintenance>;
  updateMaintenance(id: number, maintenance: Partial<Maintenance>): Promise<Maintenance | undefined>;
  getAllMaintenances(): Promise<Maintenance[]>;
  getMaintenancesByClientId(clientId: number): Promise<Maintenance[]>;
  getMaintenancesByTechnicianId(technicianId: number): Promise<Maintenance[]>;
  getUpcomingMaintenances(days: number): Promise<Maintenance[]>;
  getIncompleteMaintenances(date: Date): Promise<Maintenance[]>;
  rescheduleIncompleteMaintenances(): Promise<Maintenance[]>;
  
  // Route operations
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, route: Partial<Route>): Promise<Route | undefined>;
  deleteRoute(id: number): Promise<boolean>;
  getAllRoutes(): Promise<Route[]>;
  getRoutesByTechnicianId(technicianId: number): Promise<Route[]>;
  getRoutesByDayOfWeek(dayOfWeek: string): Promise<Route[]>;
  getRoutesByType(type: string): Promise<Route[]>;
  
  // Route Assignment operations
  getRouteAssignment(id: number): Promise<RouteAssignment | undefined>;
  createRouteAssignment(assignment: InsertRouteAssignment): Promise<RouteAssignment>;
  updateRouteAssignment(id: number, assignment: Partial<RouteAssignment>): Promise<RouteAssignment | undefined>;
  deleteRouteAssignment(id: number): Promise<boolean>;
  getRouteAssignmentsByRouteId(routeId: number): Promise<RouteAssignment[]>;
  getRouteAssignmentsByMaintenanceId(maintenanceId: number): Promise<RouteAssignment[]>;
  reorderRouteAssignments(routeId: number, assignmentIds: number[]): Promise<RouteAssignment[]>;
  
  // Chemical Usage operations
  getChemicalUsage(id: number): Promise<ChemicalUsage | undefined>;
  createChemicalUsage(usage: InsertChemicalUsage): Promise<ChemicalUsage>;
  getChemicalUsageByMaintenanceId(maintenanceId: number): Promise<ChemicalUsage[]>;
  getChemicalUsageByType(type: ChemicalType): Promise<ChemicalUsage[]>;
  
  // Water Readings operations
  getWaterReading(id: number): Promise<WaterReading | undefined>;
  createWaterReading(reading: InsertWaterReading): Promise<WaterReading>;
  getWaterReadingsByMaintenanceId(maintenanceId: number): Promise<WaterReading[]>;
  getLatestWaterReadingByClientId(clientId: number): Promise<WaterReading | undefined>;

  // Maintenance Report operations
  getMaintenanceReport(id: number): Promise<MaintenanceReport | undefined>;
  getMaintenanceReportsByMaintenanceId(maintenanceId: number): Promise<MaintenanceReport[]>;
  createMaintenanceReport(report: InsertMaintenanceReport): Promise<MaintenanceReport>;
  updateMaintenanceReport(id: number, report: Partial<MaintenanceReport>): Promise<MaintenanceReport | undefined>;
  deleteMaintenanceReport(id: number): Promise<boolean>;
  
  // Repair operations
  getRepair(id: number): Promise<Repair | undefined>;
  createRepair(repair: InsertRepair): Promise<Repair>;
  updateRepair(id: number, repair: Partial<Repair>): Promise<Repair | undefined>;
  getAllRepairs(): Promise<Repair[]>;
  getRepairsByClientId(clientId: number): Promise<Repair[]>;
  getRepairsByTechnicianId(technicianId: number): Promise<Repair[]>;
  getRecentRepairs(count: number): Promise<Repair[]>;
  
  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByClientId(clientId: number): Promise<Invoice[]>;
  
  // Pool Equipment operations
  getPoolEquipment(id: number): Promise<PoolEquipment | undefined>;
  createPoolEquipment(equipment: InsertPoolEquipment): Promise<PoolEquipment>;
  updatePoolEquipment(id: number, equipment: Partial<PoolEquipment>): Promise<PoolEquipment | undefined>;
  getPoolEquipmentByClientId(clientId: number): Promise<PoolEquipment[]>;
  
  // Pool Images operations
  getPoolImage(id: number): Promise<PoolImage | undefined>;
  createPoolImage(image: InsertPoolImage): Promise<PoolImage>;
  getPoolImagesByClientId(clientId: number): Promise<PoolImage[]>;
  
  // Service Template operations
  getServiceTemplate(id: number): Promise<ServiceTemplate | undefined>;
  createServiceTemplate(template: InsertServiceTemplate): Promise<ServiceTemplate>;
  updateServiceTemplate(id: number, template: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined>;
  deleteServiceTemplate(id: number): Promise<boolean>;
  getAllServiceTemplates(): Promise<ServiceTemplate[]>;
  getDefaultServiceTemplate(type: string): Promise<ServiceTemplate | undefined>;
  
  // Project Documentation operations
  getProjectDocument(id: number): Promise<ProjectDocumentation | undefined>;
  createProjectDocument(document: InsertProjectDocumentation): Promise<ProjectDocumentation>;
  updateProjectDocument(id: number, document: Partial<ProjectDocumentation>): Promise<ProjectDocumentation | undefined>;
  deleteProjectDocument(id: number): Promise<boolean>;
  getProjectDocumentsByProjectId(projectId: number): Promise<ProjectDocumentation[]>;
  getProjectDocumentsByPhaseId(phaseId: number): Promise<ProjectDocumentation[]>;
  getProjectDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocumentation[]>;
  
  // Communication Provider operations
  getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined>;
  getCommunicationProviderByType(type: CommunicationProviderType): Promise<CommunicationProvider | undefined>;
  createCommunicationProvider(provider: InsertCommunicationProvider): Promise<CommunicationProvider>;
  updateCommunicationProvider(id: number, provider: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined>;
  deleteCommunicationProvider(id: number): Promise<boolean>;
  getAllCommunicationProviders(): Promise<CommunicationProvider[]>;
  getDefaultCommunicationProvider(type: CommunicationProviderType): Promise<CommunicationProvider | undefined>;
  
  // Business Module Operations
  
  // Expense operations
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  
  // Payroll operations removed
  
  // Time Entry operations
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, entry: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  getAllTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntriesByUserId(userId: number): Promise<TimeEntry[]>;
  getTimeEntriesByDateRange(startDate: Date, endDate: Date): Promise<TimeEntry[]>;
  getTimeEntriesByStatus(status: string): Promise<TimeEntry[]>;
  getTimeEntriesByProjectId(projectId: number): Promise<TimeEntry[]>;
  
  // Financial Report operations
  getFinancialReport(id: number): Promise<FinancialReport | undefined>;
  createFinancialReport(report: InsertFinancialReport): Promise<FinancialReport>;
  updateFinancialReport(id: number, report: Partial<FinancialReport>): Promise<FinancialReport | undefined>;
  deleteFinancialReport(id: number): Promise<boolean>;
  getAllFinancialReports(): Promise<FinancialReport[]>;
  getFinancialReportsByType(type: ReportType): Promise<FinancialReport[]>;
  
  // Vendor operations
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;
  getAllVendors(): Promise<Vendor[]>;
  getVendorsByCategory(category: string): Promise<Vendor[]>;
  
  // Purchase Order operations
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, order: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: number): Promise<boolean>;
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByVendorId(vendorId: number): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByStatus(status: string): Promise<PurchaseOrder[]>;
  getPurchaseOrdersByDateRange(startDate: Date, endDate: Date): Promise<PurchaseOrder[]>;
  
  // Inventory Item operations
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemsByCategory(category: string): Promise<InventoryItem[]>;
  getLowStockItems(): Promise<InventoryItem[]>;
  
  // Warehouse operations
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, warehouse: Partial<Warehouse>): Promise<Warehouse | undefined>;
  deleteWarehouse(id: number): Promise<boolean>;
  getAllWarehouses(): Promise<Warehouse[]>;
  getActiveWarehouses(): Promise<Warehouse[]>;
  
  // Technician Vehicle operations
  getTechnicianVehicle(id: number): Promise<TechnicianVehicle | undefined>;
  getTechnicianVehiclesByTechnicianId(technicianId: number): Promise<TechnicianVehicle[]>;
  createTechnicianVehicle(vehicle: InsertTechnicianVehicle): Promise<TechnicianVehicle>;
  updateTechnicianVehicle(id: number, vehicle: Partial<TechnicianVehicle>): Promise<TechnicianVehicle | undefined>;
  deleteTechnicianVehicle(id: number): Promise<boolean>;
  getAllTechnicianVehicles(): Promise<TechnicianVehicle[]>;
  getActiveTechnicianVehicles(): Promise<TechnicianVehicle[]>;
  getTechnicianVehiclesWithFleetmaticsId(): Promise<TechnicianVehicle[]>;
  
  // Warehouse Inventory operations
  getWarehouseInventory(warehouseId: number, itemId: number): Promise<WarehouseInventory | undefined>;
  createWarehouseInventory(inventory: InsertWarehouseInventory): Promise<WarehouseInventory>;
  updateWarehouseInventory(id: number, inventory: Partial<WarehouseInventory>): Promise<WarehouseInventory | undefined>;
  deleteWarehouseInventory(id: number): Promise<boolean>;
  getWarehouseInventoryByWarehouseId(warehouseId: number): Promise<WarehouseInventory[]>;
  getWarehouseInventoryByItemId(itemId: number): Promise<WarehouseInventory[]>;
  getLowWarehouseInventory(): Promise<WarehouseInventory[]>;
  
  // Vehicle Inventory operations
  getVehicleInventory(vehicleId: number, itemId: number): Promise<VehicleInventory | undefined>;
  createVehicleInventory(inventory: InsertVehicleInventory): Promise<VehicleInventory>;
  updateVehicleInventory(id: number, inventory: Partial<VehicleInventory>): Promise<VehicleInventory | undefined>;
  deleteVehicleInventory(id: number): Promise<boolean>;
  getVehicleInventoryByVehicleId(vehicleId: number): Promise<VehicleInventory[]>;
  getVehicleInventoryByItemId(itemId: number): Promise<VehicleInventory[]>;
  getLowVehicleInventory(): Promise<VehicleInventory[]>;
  
  // Inventory Transfer operations
  getInventoryTransfer(id: number): Promise<InventoryTransfer | undefined>;
  createInventoryTransfer(transfer: InsertInventoryTransfer): Promise<InventoryTransfer>;
  updateInventoryTransfer(id: number, transfer: Partial<InventoryTransfer>): Promise<InventoryTransfer | undefined>;
  getInventoryTransfersByStatus(status: TransferStatus): Promise<InventoryTransfer[]>;
  getInventoryTransfersByType(type: TransferType): Promise<InventoryTransfer[]>;
  getInventoryTransfersByUserId(userId: number): Promise<InventoryTransfer[]>;
  getInventoryTransfersByDate(startDate: Date, endDate: Date): Promise<InventoryTransfer[]>;
  completeInventoryTransfer(id: number, userId: number): Promise<InventoryTransfer | undefined>;
  cancelInventoryTransfer(id: number): Promise<InventoryTransfer | undefined>;
  
  // Inventory Transfer Item operations
  getInventoryTransferItem(id: number): Promise<InventoryTransferItem | undefined>;
  createInventoryTransferItem(item: InsertInventoryTransferItem): Promise<InventoryTransferItem>;
  updateInventoryTransferItem(id: number, item: Partial<InventoryTransferItem>): Promise<InventoryTransferItem | undefined>;
  getInventoryTransferItemsByTransferId(transferId: number): Promise<InventoryTransferItem[]>;
  getInventoryTransferItemsByItemId(itemId: number): Promise<InventoryTransferItem[]>;
  
  // Barcode operations
  getBarcode(id: number): Promise<Barcode | undefined>;
  getBarcodeByValue(barcodeValue: string): Promise<Barcode | undefined>;
  createBarcode(barcode: InsertBarcode): Promise<Barcode>;
  updateBarcode(id: number, barcode: Partial<Barcode>): Promise<Barcode | undefined>;
  deleteBarcode(id: number): Promise<boolean>;
  getActiveBarcodesForItem(itemType: string, itemId: number): Promise<Barcode[]>;
  
  // Barcode Scan History operations
  createBarcodeScan(scan: InsertBarcodeScanHistory): Promise<BarcodeScanHistory>;
  getBarcodeScanHistory(id: number): Promise<BarcodeScanHistory | undefined>;
  getBarcodeScansByBarcodeId(barcodeId: number): Promise<BarcodeScanHistory[]>;
  getBarcodeScansByUserId(userId: number): Promise<BarcodeScanHistory[]>;
  getBarcodeScansByActionType(actionType: string): Promise<BarcodeScanHistory[]>;
  getBarcodeScansByDate(startDate: Date, endDate: Date): Promise<BarcodeScanHistory[]>;
  
  // Inventory Adjustment operations
  getInventoryAdjustment(id: number): Promise<InventoryAdjustment | undefined>;
  createInventoryAdjustment(adjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment>;
  getInventoryAdjustmentsByItemId(itemId: number): Promise<InventoryAdjustment[]>;
  getInventoryAdjustmentsByLocationId(locationType: string, locationId: number): Promise<InventoryAdjustment[]>;
  getInventoryAdjustmentsByUserId(userId: number): Promise<InventoryAdjustment[]>;
  getInventoryAdjustmentsByReason(reason: string): Promise<InventoryAdjustment[]>;
  getInventoryAdjustmentsByDate(startDate: Date, endDate: Date): Promise<InventoryAdjustment[]>;
  
  // Fleetmatics Integration operations
  getFleetmaticsConfig(id: number): Promise<FleetmaticsConfig | undefined>;
  getFleetmaticsConfigByOrganizationId(organizationId: number): Promise<FleetmaticsConfig | undefined>;
  createFleetmaticsConfig(config: InsertFleetmaticsConfig): Promise<FleetmaticsConfig>;
  updateFleetmaticsConfig(id: number, config: Partial<FleetmaticsConfig>): Promise<FleetmaticsConfig | undefined>;
  deleteFleetmaticsConfig(id: number): Promise<boolean>;
  
  // Fleetmatics Location History operations
  getFleetmaticsLocationHistory(id: number): Promise<FleetmaticsLocationHistory | undefined>;
  createFleetmaticsLocationHistory(history: InsertFleetmaticsLocationHistory): Promise<FleetmaticsLocationHistory>;
  getFleetmaticsLocationHistoryByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory[]>;
  getFleetmaticsLocationHistoryByVehicleIdAndTimeRange(vehicleId: number, startTime: Date, endTime: Date): Promise<FleetmaticsLocationHistory[]>;
  getLatestFleetmaticsLocationByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory | undefined>;
  
  // Vehicle GPS Tracking operations
  updateVehicleLocation(vehicleId: number, latitude: number, longitude: number): Promise<TechnicianVehicle | undefined>;
  getVehiclesInArea(latitude: number, longitude: number, radiusMiles: number): Promise<TechnicianVehicle[]>;
  
  // Subscription Plan operations
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: number): Promise<boolean>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlansByTier(tier: string): Promise<SubscriptionPlan[]>;
  getSubscriptionPlansByBillingCycle(billingCycle: string): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  
  // Subscription operations
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByOrganizationId(organizationId: number): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: number): Promise<boolean>;
  getAllSubscriptions(): Promise<Subscription[]>;
  getSubscriptionsByStatus(status: string): Promise<Subscription[]>;
  
  // Payment Record operations
  getPaymentRecord(id: number): Promise<PaymentRecord | undefined>;
  createPaymentRecord(record: InsertPaymentRecord): Promise<PaymentRecord>;
  getPaymentRecordsByOrganizationId(organizationId: number): Promise<PaymentRecord[]>;
  getPaymentRecordsBySubscriptionId(subscriptionId: number): Promise<PaymentRecord[]>;
  getPaymentRecordsByDateRange(startDate: Date, endDate: Date): Promise<PaymentRecord[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private organizations: Map<number, Organization>;
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private technicians: Map<number, Technician>;
  private projects: Map<number, Project>;
  private projectPhases: Map<number, ProjectPhase>;
  private projectAssignments: Map<number, ProjectAssignment>;
  private maintenances: Map<number, Maintenance>;
  private fleetmaticsConfigs: Map<number, FleetmaticsConfig>;
  private fleetmaticsLocationHistories: Map<number, FleetmaticsLocationHistory>;
  private repairs: Map<number, Repair>;
  private invoices: Map<number, Invoice>;
  private poolEquipment: Map<number, PoolEquipment>;
  private poolImages: Map<number, PoolImage>;
  private inventoryItems: Map<number, InventoryItem>;
  private warehouses: Map<number, Warehouse>;
  private technicianVehicles: Map<number, TechnicianVehicle>;
  private warehouseInventory: Map<number, WarehouseInventory>;
  private vehicleInventory: Map<number, VehicleInventory>;
  private inventoryTransfers: Map<number, InventoryTransfer>;
  private inventoryTransferItems: Map<number, InventoryTransferItem>;
  private barcodes: Map<number, Barcode>;
  private barcodeScanHistory: Map<number, BarcodeScanHistory>;
  private inventoryAdjustments: Map<number, InventoryAdjustment>;
  private communicationProviders: Map<number, CommunicationProvider>;
  private chemicalUsage: Map<number, ChemicalUsage>;
  private waterReadings: Map<number, WaterReading>;
  private routes: Map<number, Route>;
  private routeAssignments: Map<number, RouteAssignment>;
  private subscriptionPlans: Map<number, SubscriptionPlan>;
  private subscriptions: Map<number, Subscription>;
  private paymentRecords: Map<number, PaymentRecord>;
  
  private organizationId: number;
  private userId: number;
  private clientId: number;
  private technicianId: number;
  private projectId: number;
  private projectPhaseId: number;
  private projectAssignmentId: number;
  private maintenanceId: number;
  private repairId: number;
  private invoiceId: number;
  private poolEquipmentId: number;
  private poolImageId: number;
  private serviceTemplates: Map<number, ServiceTemplate>;
  private serviceTemplateId: number;
  private projectDocuments: Map<number, ProjectDocumentation>;
  private projectDocumentId: number;
  private maintenanceReports: Map<number, MaintenanceReport>;
  private maintenanceReportId: number;
  private communicationProviderId: number;
  private chemicalUsageId: number;
  private waterReadingId: number;
  private routeId: number;
  private routeAssignmentId: number;
  
  // New inventory management IDs
  private inventoryItemId: number;
  private warehouseId: number;
  private technicianVehicleId: number;
  private warehouseInventoryId: number;
  private vehicleInventoryId: number;
  private inventoryTransferId: number;
  private inventoryTransferItemId: number;
  private barcodeId: number;
  private barcodeScanHistoryId: number;
  private inventoryAdjustmentId: number;
  
  // Fleetmatics IDs
  private fleetmaticsConfigId: number;
  private fleetmaticsLocationHistoryId: number;
  
  // Subscription IDs
  private subscriptionPlanId: number;
  private subscriptionId: number;
  private paymentRecordId: number;
  
  constructor() {
    this.organizations = new Map();
    this.users = new Map();
    this.clients = new Map();
    this.technicians = new Map();
    this.projects = new Map();
    this.projectPhases = new Map();
    this.projectAssignments = new Map();
    this.maintenances = new Map();
    this.repairs = new Map();
    this.invoices = new Map();
    this.poolEquipment = new Map();
    this.poolImages = new Map();
    this.serviceTemplates = new Map();
    this.projectDocuments = new Map();
    this.maintenanceReports = new Map();
    this.communicationProviders = new Map();
    this.chemicalUsage = new Map();
    this.waterReadings = new Map();
    this.routes = new Map();
    this.routeAssignments = new Map();
    
    // Initialize inventory management maps
    this.inventoryItems = new Map();
    this.warehouses = new Map();
    this.technicianVehicles = new Map();
    this.warehouseInventory = new Map();
    this.vehicleInventory = new Map();
    this.inventoryTransfers = new Map();
    this.inventoryTransferItems = new Map();
    this.barcodes = new Map();
    this.barcodeScanHistory = new Map();
    this.inventoryAdjustments = new Map();
    
    // Initialize Fleetmatics maps
    this.fleetmaticsConfigs = new Map();
    this.fleetmaticsLocationHistories = new Map();
    
    // Initialize Subscription maps
    this.subscriptionPlans = new Map();
    this.subscriptions = new Map();
    this.paymentRecords = new Map();
    
    this.organizationId = 1;
    this.userId = 1;
    this.clientId = 1;
    this.technicianId = 1;
    this.projectId = 1;
    this.projectPhaseId = 1;
    this.projectAssignmentId = 1;
    this.maintenanceId = 1;
    this.repairId = 1;
    this.invoiceId = 1;
    this.poolEquipmentId = 1;
    this.poolImageId = 1;
    this.serviceTemplateId = 1;
    this.projectDocumentId = 1;
    this.maintenanceReportId = 1;
    this.communicationProviderId = 1;
    this.chemicalUsageId = 1;
    this.waterReadingId = 1;
    this.routeId = 1;
    this.routeAssignmentId = 1;
    
    // Initialize inventory management IDs
    this.inventoryItemId = 1;
    this.warehouseId = 1;
    this.technicianVehicleId = 1;
    this.warehouseInventoryId = 1;
    this.vehicleInventoryId = 1;
    this.inventoryTransferId = 1;
    this.inventoryTransferItemId = 1;
    this.barcodeId = 1;
    this.barcodeScanHistoryId = 1;
    this.inventoryAdjustmentId = 1;
    
    // Initialize Fleetmatics IDs
    this.fleetmaticsConfigId = 1;
    this.fleetmaticsLocationHistoryId = 1;
    
    // Initialize Subscription IDs
    this.subscriptionPlanId = 1;
    this.subscriptionId = 1;
    this.paymentRecordId = 1;
    
    // Add sample data
    this.initSampleData();
    // Add sample inventory data
    this.initSampleInventoryData();
    // Add Fleetmatics sample data
    this.initSampleFleetmaticsData();
    // Add subscription and payment data
    this.initSampleSubscriptionData();
  }
  
  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }
  
  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find(
      (org) => org.slug === slug
    );
  }
  
  async createOrganization(insertOrg: Partial<InsertOrganization>): Promise<Organization> {
    const id = this.organizationId++;
    const organization: Organization = {
      ...insertOrg as any,
      id,
      name: insertOrg.name || "",
      slug: insertOrg.slug || "",
      address: insertOrg.address || null,
      city: insertOrg.city || null,
      state: insertOrg.state || null,
      zipCode: insertOrg.zipCode || null,
      phone: insertOrg.phone || null,
      email: insertOrg.email || null,
      website: insertOrg.website || null,
      logo: insertOrg.logo || null,
      active: insertOrg.active !== undefined ? insertOrg.active : true,
      isSystemAdmin: insertOrg.isSystemAdmin !== undefined ? insertOrg.isSystemAdmin : false,
      createdAt: new Date()
    };
    this.organizations.set(id, organization);
    return organization;
  }
  
  async updateOrganization(id: number, data: Partial<Organization>): Promise<Organization | undefined> {
    const organization = await this.getOrganization(id);
    if (!organization) return undefined;
    
    const updatedOrg = { ...organization, ...data };
    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }
  
  async getAllOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }
  
  async getUsersByOrganizationId(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.organizationId === organizationId
    );
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    // Ensure all required fields have default values if not provided
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role ?? "client",
      phone: insertUser.phone ?? null,
      address: insertUser.address ?? null,
      active: insertUser.active !== undefined ? insertUser.active : true
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // First check if user exists
    const user = await this.getUser(id);
    if (!user) {
      console.error(`Cannot delete user with ID ${id}: User not found`);
      return false;
    }
    
    // Don't allow deletion of system_admin users
    if (user.role === 'system_admin') {
      console.error(`Cannot delete user with ID ${id}: User is a system administrator`);
      return false;
    }
    
    // Delete the user
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClientByUserId(userId: number): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.userId === userId,
    );
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientId++;
    // Ensure required nullable fields have proper default values
    const client: Client = { 
      ...insertClient, 
      id,
      companyName: insertClient.companyName ?? null,
      contractType: insertClient.contractType ?? null,
      poolType: insertClient.poolType ?? null,
      poolSize: insertClient.poolSize ?? null,
      filterType: insertClient.filterType ?? null,
      heaterType: insertClient.heaterType ?? null,
      chemicalSystem: insertClient.chemicalSystem ?? null,
      specialNotes: insertClient.specialNotes ?? null,
      serviceDay: insertClient.serviceDay ?? null,
      serviceLevel: insertClient.serviceLevel ?? null,
      customServiceInstructions: insertClient.customServiceInstructions ?? null
    };
    this.clients.set(id, client);
    return client;
  }
  
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async getClientsByOrganizationId(organizationId: number): Promise<Client[]> {
    // First get all users from the organization
    const orgUsers = Array.from(this.users.values()).filter(user => user.organizationId === organizationId);
    
    // Then get all clients associated with those users
    const userIds = orgUsers.map(user => user.id);
    
    if (userIds.length === 0) {
      return []; // No users in this organization
    }
    
    return Array.from(this.clients.values()).filter(client => userIds.includes(client.userId));
  }
  
  async updateClient(id: number, data: Partial<Client>): Promise<Client | undefined> {
    console.log(`[MEM STORAGE] Updating client ${id} with data:`, JSON.stringify(data));
    
    const client = await this.getClient(id);
    if (!client) {
      console.log(`[MEM STORAGE] Client with ID ${id} not found`);
      return undefined;
    }
    
    // Make sure contractType is properly handled
    const updatedData: Partial<Client> = { ...data };
    if (updatedData.contractType !== undefined) {
      // Handle null/empty string values and convert to lowercase
      if (updatedData.contractType === null || updatedData.contractType === '') {
        console.log(`[MEM STORAGE] Setting null contract type`);
        updatedData.contractType = null;
      } else {
        updatedData.contractType = String(updatedData.contractType).toLowerCase();
        console.log(`[MEM STORAGE] Normalized contract type: '${updatedData.contractType}'`);
      }
    }
    
    const updatedClient = { ...client, ...updatedData };
    this.clients.set(id, updatedClient);
    console.log(`[MEM STORAGE] Client updated successfully:`, JSON.stringify(updatedClient));
    return updatedClient;
  }
  
  async getClientWithUser(id: number): Promise<{ client: Client; user: User } | undefined> {
    const client = await this.getClient(id);
    if (!client) return undefined;
    
    const user = await this.getUser(client.userId);
    if (!user) return undefined;
    
    return { client, user };
  }
  
  // Technician operations
  async getTechnician(id: number): Promise<Technician | undefined> {
    return this.technicians.get(id);
  }
  
  async getTechnicianByUserId(userId: number): Promise<Technician | undefined> {
    return Array.from(this.technicians.values()).find(
      (technician) => technician.userId === userId,
    );
  }
  
  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const id = this.technicianId++;
    // Ensure required nullable fields have proper default values
    const technician: Technician = { 
      ...insertTechnician, 
      id,
      specialization: insertTechnician.specialization ?? null,
      certifications: insertTechnician.certifications ?? null 
    };
    this.technicians.set(id, technician);
    return technician;
  }
  
  async getAllTechnicians(): Promise<Technician[]> {
    return Array.from(this.technicians.values());
  }
  
  async getTechnicianWithUser(id: number): Promise<{ technician: Technician; user: User } | undefined> {
    const technician = await this.getTechnician(id);
    if (!technician) return undefined;
    
    const user = await this.getUser(technician.userId);
    if (!user) return undefined;
    
    return { technician, user };
  }
  
  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectId++;
    // Ensure required fields have proper default values
    const project: Project = { 
      ...insertProject, 
      id,
      projectType: insertProject.projectType ?? "construction",
      status: insertProject.status ?? "planning",
      description: insertProject.description ?? null,
      notes: insertProject.notes ?? null,
      estimatedCompletionDate: insertProject.estimatedCompletionDate ?? null,
      actualCompletionDate: insertProject.actualCompletionDate ?? null,
      budget: insertProject.budget ?? null,
      currentPhase: insertProject.currentPhase ?? null,
      percentComplete: insertProject.percentComplete ?? 0,
      permitDetails: insertProject.permitDetails ?? null
    };
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...data };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    const project = await this.getProject(id);
    if (!project) return false;
    
    // Delete all phases associated with this project
    const phases = await this.getProjectPhasesByProjectId(id);
    for (const phase of phases) {
      await this.deleteProjectPhase(phase.id);
    }
    
    // Delete all project documents associated with this project
    const documents = await this.getProjectDocumentsByProjectId(id);
    for (const document of documents) {
      await this.deleteProjectDocument(document.id);
    }
    
    // Remove the project
    return this.projects.delete(id);
  }
  
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.clientId === clientId,
    );
  }
  
  async getProjectsByType(projectType: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.projectType === projectType,
    );
  }
  
  // Project Phases operations
  async getProjectPhase(id: number): Promise<ProjectPhase | undefined> {
    return this.projectPhases.get(id);
  }
  
  async createProjectPhase(insertPhase: InsertProjectPhase): Promise<ProjectPhase> {
    const id = this.projectPhaseId++;
    const phase: ProjectPhase = { 
      ...insertPhase, 
      id,
      status: insertPhase.status ?? "pending",
      description: insertPhase.description ?? null,
      notes: insertPhase.notes ?? null,
      startDate: insertPhase.startDate ?? null,
      endDate: insertPhase.endDate ?? null,
      percentComplete: insertPhase.percentComplete ?? null
    };
    this.projectPhases.set(id, phase);
    return phase;
  }
  
  async updateProjectPhase(id: number, data: Partial<ProjectPhase>): Promise<ProjectPhase | undefined> {
    const phase = await this.getProjectPhase(id);
    if (!phase) return undefined;
    
    const updatedPhase = { ...phase, ...data };
    this.projectPhases.set(id, updatedPhase);
    return updatedPhase;
  }
  
  async deleteProjectPhase(id: number): Promise<boolean> {
    const phase = await this.getProjectPhase(id);
    if (!phase) return false;
    
    return this.projectPhases.delete(id);
  }
  
  async getProjectPhasesByProjectId(projectId: number): Promise<ProjectPhase[]> {
    return Array.from(this.projectPhases.values()).filter(
      (phase) => phase.projectId === projectId,
    );
  }
  
  // Project assignment operations
  async createProjectAssignment(insertAssignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const id = this.projectAssignmentId++;
    const assignment: ProjectAssignment = { ...insertAssignment, id };
    this.projectAssignments.set(id, assignment);
    return assignment;
  }
  
  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values()).filter(
      (assignment) => assignment.projectId === projectId,
    );
  }
  
  // Maintenance operations
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    return this.maintenances.get(id);
  }
  
  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    const id = this.maintenanceId++;
    // Ensure required fields have proper default values
    const maintenance: Maintenance = { 
      ...insertMaintenance, 
      id,
      status: insertMaintenance.status ?? "scheduled",
      notes: insertMaintenance.notes ?? null,
      completionDate: insertMaintenance.completionDate ?? null,
      startTime: null,
      endTime: null,
      customerFeedback: null,
      customerNotes: null,
      invoiceAmount: null,
      laborCost: null,
      totalChemicalCost: null,
      profitAmount: null,
      profitPercentage: null
    };
    this.maintenances.set(id, maintenance);
    return maintenance;
  }
  
  async updateMaintenance(id: number, data: Partial<Maintenance>): Promise<Maintenance | undefined> {
    const maintenance = await this.getMaintenance(id);
    if (!maintenance) return undefined;
    
    const updatedMaintenance = { ...maintenance, ...data };
    this.maintenances.set(id, updatedMaintenance);
    return updatedMaintenance;
  }
  
  async getAllMaintenances(): Promise<Maintenance[]> {
    return Array.from(this.maintenances.values());
  }
  
  async getMaintenancesByClientId(clientId: number): Promise<Maintenance[]> {
    return Array.from(this.maintenances.values()).filter(
      (maintenance) => maintenance.clientId === clientId,
    );
  }
  
  async getMaintenancesByTechnicianId(technicianId: number): Promise<Maintenance[]> {
    return Array.from(this.maintenances.values()).filter(
      (maintenance) => maintenance.technicianId === technicianId,
    );
  }
  
  async getUpcomingMaintenances(days: number): Promise<Maintenance[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    return Array.from(this.maintenances.values()).filter((maintenance) => {
      const maintenanceDate = new Date(maintenance.scheduleDate);
      return maintenanceDate >= today && maintenanceDate <= endDate;
    }).sort((a, b) => {
      return new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime();
    });
  }
  
  async getIncompleteMaintenances(date: Date): Promise<Maintenance[]> {
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    return Array.from(this.maintenances.values()).filter((maintenance) => {
      const maintenanceDate = new Date(maintenance.scheduleDate).toISOString().split('T')[0];
      return maintenanceDate === dateStr && 
             (maintenance.status === "scheduled" || maintenance.status === "in_progress") &&
             !maintenance.completionDate;
    });
  }
  
  async rescheduleIncompleteMaintenances(): Promise<Maintenance[]> {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get incomplete maintenances from yesterday
    const incompleteMaintenances = await this.getIncompleteMaintenances(yesterday);
    
    // Reschedule each maintenance to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const rescheduledMaintenances: Maintenance[] = [];
    
    for (const maintenance of incompleteMaintenances) {
      const updatedMaintenance = await this.updateMaintenance(maintenance.id, {
        scheduleDate: todayStr,
        notes: maintenance.notes 
          ? `${maintenance.notes}\nAutomatically rescheduled from ${maintenance.scheduleDate}` 
          : `Automatically rescheduled from ${maintenance.scheduleDate}`
      });
      
      if (updatedMaintenance) {
        rescheduledMaintenances.push(updatedMaintenance);
      }
    }
    
    return rescheduledMaintenances;
  }
  
  // Chemical Usage operations
  async getChemicalUsage(id: number): Promise<ChemicalUsage | undefined> {
    return this.chemicalUsage.get(id);
  }
  
  async createChemicalUsage(insertUsage: InsertChemicalUsage): Promise<ChemicalUsage> {
    const id = this.chemicalUsageId++;
    const usage: ChemicalUsage = {
      ...insertUsage,
      id,
      notes: insertUsage.notes ?? null,
      reason: insertUsage.reason ?? null,
      createdAt: new Date()
    };
    this.chemicalUsage.set(id, usage);
    return usage;
  }
  
  async getChemicalUsageByMaintenanceId(maintenanceId: number): Promise<ChemicalUsage[]> {
    return Array.from(this.chemicalUsage.values()).filter(
      (usage) => usage.maintenanceId === maintenanceId
    );
  }
  
  async getChemicalUsageByType(type: ChemicalType): Promise<ChemicalUsage[]> {
    return Array.from(this.chemicalUsage.values()).filter(
      (usage) => usage.chemicalType === type
    );
  }
  
  // Inventory Item operations
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }
  
  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = this.inventoryItemId++;
    const inventoryItem: InventoryItem = {
      ...item,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventoryItems.set(id, inventoryItem);
    return inventoryItem;
  }
  
  async updateInventoryItem(id: number, item: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const existingItem = await this.getInventoryItem(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, ...item, updatedAt: new Date() };
    this.inventoryItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteInventoryItem(id: number): Promise<boolean> {
    return this.inventoryItems.delete(id);
  }
  
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values());
  }
  
  async getInventoryItemsByCategory(category: string): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (item) => item.category === category
    );
  }
  
  async getLowStockItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (item) => item.currentStock <= item.minStockLevel
    );
  }
  
  // Warehouse operations
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    return this.warehouses.get(id);
  }
  
  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const id = this.warehouseId++;
    const newWarehouse: Warehouse = {
      ...warehouse,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.warehouses.set(id, newWarehouse);
    return newWarehouse;
  }
  
  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse | undefined> {
    const warehouse = await this.getWarehouse(id);
    if (!warehouse) return undefined;
    
    const updatedWarehouse = { ...warehouse, ...data, updatedAt: new Date() };
    this.warehouses.set(id, updatedWarehouse);
    return updatedWarehouse;
  }
  
  async deleteWarehouse(id: number): Promise<boolean> {
    // Check if there is inventory in this warehouse
    const inventory = await this.getWarehouseInventoryByWarehouseId(id);
    if (inventory.length > 0) {
      // Don't delete if there's still inventory - set to inactive instead
      const warehouse = await this.getWarehouse(id);
      if (warehouse) {
        warehouse.isActive = false;
        this.warehouses.set(id, warehouse);
      }
      return false;
    }
    
    return this.warehouses.delete(id);
  }
  
  async getAllWarehouses(): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values());
  }
  
  async getActiveWarehouses(): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values()).filter(
      (warehouse) => warehouse.isActive
    );
  }
  
  // Technician Vehicle operations
  async getTechnicianVehicle(id: number): Promise<TechnicianVehicle | undefined> {
    return this.technicianVehicles.get(id);
  }
  
  async getTechnicianVehiclesByTechnicianId(technicianId: number): Promise<TechnicianVehicle[]> {
    return Array.from(this.technicianVehicles.values()).filter(
      (vehicle) => vehicle.technicianId === technicianId
    );
  }
  
  async createTechnicianVehicle(vehicle: InsertTechnicianVehicle): Promise<TechnicianVehicle> {
    const id = this.technicianVehicleId++;
    const newVehicle: TechnicianVehicle = {
      ...vehicle,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.technicianVehicles.set(id, newVehicle);
    return newVehicle;
  }
  
  async updateTechnicianVehicle(id: number, data: Partial<TechnicianVehicle>): Promise<TechnicianVehicle | undefined> {
    const vehicle = await this.getTechnicianVehicle(id);
    if (!vehicle) return undefined;
    
    const updatedVehicle = { ...vehicle, ...data, updatedAt: new Date() };
    this.technicianVehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }
  
  async deleteTechnicianVehicle(id: number): Promise<boolean> {
    // Check if there is inventory in this vehicle
    const inventory = await this.getVehicleInventoryByVehicleId(id);
    if (inventory.length > 0) {
      // Don't delete if there's still inventory - set to inactive instead
      const vehicle = await this.getTechnicianVehicle(id);
      if (vehicle) {
        vehicle.isActive = false;
        this.technicianVehicles.set(id, vehicle);
      }
      return false;
    }
    
    return this.technicianVehicles.delete(id);
  }
  
  async getAllTechnicianVehicles(): Promise<TechnicianVehicle[]> {
    return Array.from(this.technicianVehicles.values());
  }
  
  async getActiveTechnicianVehicles(): Promise<TechnicianVehicle[]> {
    return Array.from(this.technicianVehicles.values()).filter(
      (vehicle) => vehicle.isActive
    );
  }
  
  // Warehouse Inventory operations
  async getWarehouseInventory(warehouseId: number, itemId: number): Promise<WarehouseInventory | undefined> {
    return Array.from(this.warehouseInventory.values()).find(
      (inventory) => inventory.warehouseId === warehouseId && inventory.itemId === itemId
    );
  }
  
  async createWarehouseInventory(inventory: InsertWarehouseInventory): Promise<WarehouseInventory> {
    const id = this.warehouseInventoryId++;
    const newInventory: WarehouseInventory = {
      ...inventory,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.warehouseInventory.set(id, newInventory);
    return newInventory;
  }
  
  async updateWarehouseInventory(id: number, inventory: Partial<WarehouseInventory>): Promise<WarehouseInventory | undefined> {
    const existingInventory = await this.warehouseInventory.get(id);
    if (!existingInventory) return undefined;
    
    const updatedInventory = { ...existingInventory, ...inventory, updatedAt: new Date() };
    this.warehouseInventory.set(id, updatedInventory);
    return updatedInventory;
  }
  
  async deleteWarehouseInventory(id: number): Promise<boolean> {
    return this.warehouseInventory.delete(id);
  }
  
  async getWarehouseInventoryByWarehouseId(warehouseId: number): Promise<WarehouseInventory[]> {
    return Array.from(this.warehouseInventory.values()).filter(
      (inventory) => inventory.warehouseId === warehouseId
    );
  }
  
  async getWarehouseInventoryByItemId(itemId: number): Promise<WarehouseInventory[]> {
    return Array.from(this.warehouseInventory.values()).filter(
      (inventory) => inventory.itemId === itemId
    );
  }
  
  async getLowWarehouseInventory(): Promise<WarehouseInventory[]> {
    return Array.from(this.warehouseInventory.values()).filter(
      (inventory) => inventory.quantity <= inventory.minQuantity
    );
  }
  
  // Vehicle Inventory operations
  async getVehicleInventory(vehicleId: number, itemId: number): Promise<VehicleInventory | undefined> {
    return Array.from(this.vehicleInventory.values()).find(
      (inventory) => inventory.vehicleId === vehicleId && inventory.itemId === itemId
    );
  }
  
  async createVehicleInventory(inventory: InsertVehicleInventory): Promise<VehicleInventory> {
    const id = this.vehicleInventoryId++;
    const newInventory: VehicleInventory = {
      ...inventory,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vehicleInventory.set(id, newInventory);
    return newInventory;
  }
  
  async updateVehicleInventory(id: number, inventory: Partial<VehicleInventory>): Promise<VehicleInventory | undefined> {
    const existingInventory = await this.vehicleInventory.get(id);
    if (!existingInventory) return undefined;
    
    const updatedInventory = { ...existingInventory, ...inventory, updatedAt: new Date() };
    this.vehicleInventory.set(id, updatedInventory);
    return updatedInventory;
  }
  
  async deleteVehicleInventory(id: number): Promise<boolean> {
    return this.vehicleInventory.delete(id);
  }
  
  async getVehicleInventoryByVehicleId(vehicleId: number): Promise<VehicleInventory[]> {
    return Array.from(this.vehicleInventory.values()).filter(
      (inventory) => inventory.vehicleId === vehicleId
    );
  }
  
  async getVehicleInventoryByItemId(itemId: number): Promise<VehicleInventory[]> {
    return Array.from(this.vehicleInventory.values()).filter(
      (inventory) => inventory.itemId === itemId
    );
  }
  
  async getLowVehicleInventory(): Promise<VehicleInventory[]> {
    return Array.from(this.vehicleInventory.values()).filter(
      (inventory) => inventory.quantity <= inventory.minQuantity
    );
  }
  
  // Inventory Transfer operations
  async getInventoryTransfer(id: number): Promise<InventoryTransfer | undefined> {
    return this.inventoryTransfers.get(id);
  }
  
  async createInventoryTransfer(transfer: InsertInventoryTransfer): Promise<InventoryTransfer> {
    const id = this.inventoryTransferId++;
    const newTransfer: InventoryTransfer = {
      ...transfer,
      id,
      status: transfer.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null
    };
    this.inventoryTransfers.set(id, newTransfer);
    return newTransfer;
  }
  
  async updateInventoryTransfer(id: number, transfer: Partial<InventoryTransfer>): Promise<InventoryTransfer | undefined> {
    const existingTransfer = await this.getInventoryTransfer(id);
    if (!existingTransfer) return undefined;
    
    const updatedTransfer = { ...existingTransfer, ...transfer, updatedAt: new Date() };
    this.inventoryTransfers.set(id, updatedTransfer);
    return updatedTransfer;
  }
  
  async getInventoryTransfersByStatus(status: TransferStatus): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.status === status
    );
  }
  
  async getInventoryTransfersByType(type: TransferType): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.transferType === type
    );
  }
  
  async getInventoryTransfersByUserId(userId: number): Promise<InventoryTransfer[]> {
    try {
      const transfers = await db
        .select()
        .from(inventoryTransfers)
        .where(
          or(
            eq(inventoryTransfers.requestedByUserId, userId),
            eq(inventoryTransfers.completedByUserId, userId)
          )
        );
      return transfers;
    } catch (error) {
      console.error(`Error retrieving inventory transfers for user ${userId}:`, error);
      return [];
    }
  }
  
  async getInventoryTransfersByDate(startDate: Date, endDate: Date): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => {
        const transferDate = new Date(transfer.createdAt);
        return transferDate >= startDate && transferDate <= endDate;
      }
    );
  }
  
  async completeInventoryTransfer(id: number, userId: number): Promise<InventoryTransfer | undefined> {
    try {
      // Get the transfer
      const transfer = await this.getInventoryTransfer(id);
      if (!transfer || transfer.status !== "in_transit") return undefined;
      
      const now = new Date();
      
      // Update the transfer status to completed
      const [updatedTransfer] = await db
        .update(inventoryTransfers)
        .set({
          status: "completed" as TransferStatus,
          completedByUserId: userId,
          completedDate: now
        })
        .where(eq(inventoryTransfers.id, id))
        .returning();
      
      if (!updatedTransfer) return undefined;
      
      // Get all transfer items
      const transferItems = await db
        .select()
        .from(inventoryTransferItems)
        .where(eq(inventoryTransferItems.transferId, id));
      
      // Process the transfer items to update inventory
      for (const item of transferItems) {
        if (!item.actualQuantity) continue; // Skip if no actual quantity
        
        const { sourceLocationType, sourceLocationId, destinationLocationType, destinationLocationId } = transfer;
        const { inventoryItemId, actualQuantity } = item;
        
        // Subtract from source inventory
        if (sourceLocationType === 'warehouse') {
          // Source is a warehouse
          const sourceInventory = await db
            .select()
            .from(warehouseInventory)
            .where(
              and(
                eq(warehouseInventory.warehouseId, sourceLocationId),
                eq(warehouseInventory.inventoryItemId, inventoryItemId)
              )
            )
            .limit(1);
            
          if (sourceInventory.length > 0) {
            const newQuantity = Math.max(0, sourceInventory[0].quantity - actualQuantity);
            await db
              .update(warehouseInventory)
              .set({ 
                quantity: newQuantity,
                lastUpdated: now
              })
              .where(eq(warehouseInventory.id, sourceInventory[0].id));
          }
        } else if (sourceLocationType === 'vehicle') {
          // Source is a vehicle
          const sourceInventory = await db
            .select()
            .from(vehicleInventory)
            .where(
              and(
                eq(vehicleInventory.vehicleId, sourceLocationId),
                eq(vehicleInventory.inventoryItemId, inventoryItemId)
              )
            )
            .limit(1);
            
          if (sourceInventory.length > 0) {
            const newQuantity = Math.max(0, sourceInventory[0].quantity - actualQuantity);
            await db
              .update(vehicleInventory)
              .set({ 
                quantity: newQuantity,
                lastUpdated: now
              })
              .where(eq(vehicleInventory.id, sourceInventory[0].id));
          }
        }
        
        // Add to destination inventory
        if (destinationLocationType === 'warehouse') {
          // Destination is a warehouse
          const destinationInventory = await db
            .select()
            .from(warehouseInventory)
            .where(
              and(
                eq(warehouseInventory.warehouseId, destinationLocationId),
                eq(warehouseInventory.inventoryItemId, inventoryItemId)
              )
            )
            .limit(1);
            
          if (destinationInventory.length > 0) {
            // Update existing inventory
            await db
              .update(warehouseInventory)
              .set({ 
                quantity: destinationInventory[0].quantity + actualQuantity,
                lastUpdated: now
              })
              .where(eq(warehouseInventory.id, destinationInventory[0].id));
          } else {
            // Create new inventory record
            await db
              .insert(warehouseInventory)
              .values({
                warehouseId: destinationLocationId,
                inventoryItemId: inventoryItemId,
                quantity: actualQuantity,
                minimumStockLevel: 0,
                maximumStockLevel: null,
                lastUpdated: now,
                location: null,
                notes: null
              });
          }
        } else if (destinationLocationType === 'vehicle') {
          // Destination is a vehicle
          const destinationInventory = await db
            .select()
            .from(vehicleInventory)
            .where(
              and(
                eq(vehicleInventory.vehicleId, destinationLocationId),
                eq(vehicleInventory.inventoryItemId, inventoryItemId)
              )
            )
            .limit(1);
            
          if (destinationInventory.length > 0) {
            // Update existing inventory
            await db
              .update(vehicleInventory)
              .set({ 
                quantity: destinationInventory[0].quantity + actualQuantity,
                lastUpdated: now
              })
              .where(eq(vehicleInventory.id, destinationInventory[0].id));
          } else {
            // Create new inventory record
            await db
              .insert(vehicleInventory)
              .values({
                vehicleId: destinationLocationId,
                inventoryItemId: inventoryItemId,
                quantity: actualQuantity,
                targetStockLevel: null,
                lastUpdated: now,
                location: null,
                notes: null
              });
          }
        }
        // For client transfers, we don't track inventory after it's been transferred to a client
      }
      
      // Create barcode scan history for this completion
      await db
        .insert(barcodeScanHistory)
        .values({
          barcodeId: null, // Not associated with a specific barcode
          scannedByUserId: userId,
          scanTime: now,
          actionType: 'transfer_complete',
          actionId: id,
          location: null,
          notes: `Completed inventory transfer #${id}`
        });
      
      return updatedTransfer;
    } catch (error) {
      console.error(`Error completing inventory transfer ${id}:`, error);
      return undefined;
    }
  }
  
  private async updateInventoryForTransferItem(transfer: InventoryTransfer, item: InventoryTransferItem): Promise<void> {
    const { transferType, sourceId, destinationId } = transfer;
    const { itemId, quantity } = item;
    
    // Subtract from source inventory
    if (transferType.includes('warehouse_to_')) {
      // Source is a warehouse
      const source = await this.getWarehouseInventory(sourceId, itemId);
      if (source) {
        const newQuantity = Math.max(0, source.quantity - quantity);
        await this.updateWarehouseInventory(source.id, { quantity: newQuantity });
      }
    } else if (transferType.includes('vehicle_to_')) {
      // Source is a vehicle
      const source = await this.getVehicleInventory(sourceId, itemId);
      if (source) {
        const newQuantity = Math.max(0, source.quantity - quantity);
        await this.updateVehicleInventory(source.id, { quantity: newQuantity });
      }
    }
    
    // Add to destination inventory
    if (transferType.includes('_to_warehouse')) {
      // Destination is a warehouse
      const destination = await this.getWarehouseInventory(destinationId, itemId);
      if (destination) {
        // Update existing inventory
        await this.updateWarehouseInventory(destination.id, { 
          quantity: destination.quantity + quantity 
        });
      } else {
        // Create new inventory record
        await this.createWarehouseInventory({
          warehouseId: destinationId,
          itemId,
          quantity,
          minQuantity: 0,
          location: ""
        });
      }
    } else if (transferType.includes('_to_vehicle')) {
      // Destination is a vehicle
      const destination = await this.getVehicleInventory(destinationId, itemId);
      if (destination) {
        // Update existing inventory
        await this.updateVehicleInventory(destination.id, { 
          quantity: destination.quantity + quantity 
        });
      } else {
        // Create new inventory record
        await this.createVehicleInventory({
          vehicleId: destinationId,
          itemId,
          quantity,
          minQuantity: 0,
          location: ""
        });
      }
    }
    // For client transfers, we don't track inventory after it's been transferred to a client
  }
  
  async cancelInventoryTransfer(id: number): Promise<InventoryTransfer | undefined> {
    const transfer = await this.getInventoryTransfer(id);
    if (!transfer) return undefined;
    
    const updatedTransfer = { 
      ...transfer, 
      status: 'cancelled' as TransferStatus,
      updatedAt: new Date()
    };
    this.inventoryTransfers.set(id, updatedTransfer);
    return updatedTransfer;
  }
  
  // Inventory Transfer Item operations
  async getInventoryTransferItem(id: number): Promise<InventoryTransferItem | undefined> {
    return this.inventoryTransferItems.get(id);
  }
  
  async createInventoryTransferItem(item: InsertInventoryTransferItem): Promise<InventoryTransferItem> {
    const id = this.inventoryTransferItemId++;
    const newItem: InventoryTransferItem = {
      ...item,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventoryTransferItems.set(id, newItem);
    return newItem;
  }
  
  async updateInventoryTransferItem(id: number, item: Partial<InventoryTransferItem>): Promise<InventoryTransferItem | undefined> {
    const existingItem = await this.getInventoryTransferItem(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, ...item, updatedAt: new Date() };
    this.inventoryTransferItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async getInventoryTransferItemsByTransferId(transferId: number): Promise<InventoryTransferItem[]> {
    return Array.from(this.inventoryTransferItems.values()).filter(
      (item) => item.transferId === transferId
    );
  }
  
  async getInventoryTransferItemsByItemId(itemId: number): Promise<InventoryTransferItem[]> {
    return Array.from(this.inventoryTransferItems.values()).filter(
      (item) => item.itemId === itemId
    );
  }
  
  // Barcode operations
  async getBarcode(id: number): Promise<Barcode | undefined> {
    return this.barcodes.get(id);
  }
  
  async getBarcodeByValue(barcodeValue: string): Promise<Barcode | undefined> {
    return Array.from(this.barcodes.values()).find(
      (barcode) => barcode.barcodeValue === barcodeValue
    );
  }
  
  async createBarcode(barcode: InsertBarcode): Promise<Barcode> {
    const id = this.barcodeId++;
    const newBarcode: Barcode = {
      ...barcode,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.barcodes.set(id, newBarcode);
    return newBarcode;
  }
  
  async updateBarcode(id: number, barcode: Partial<Barcode>): Promise<Barcode | undefined> {
    const existingBarcode = await this.getBarcode(id);
    if (!existingBarcode) return undefined;
    
    const updatedBarcode = { ...existingBarcode, ...barcode, updatedAt: new Date() };
    this.barcodes.set(id, updatedBarcode);
    return updatedBarcode;
  }
  
  async deleteBarcode(id: number): Promise<boolean> {
    return this.barcodes.delete(id);
  }
  
  async getActiveBarcodesForItem(itemType: string, itemId: number): Promise<Barcode[]> {
    return Array.from(this.barcodes.values()).filter(
      (barcode) => barcode.itemType === itemType && barcode.itemId === itemId && barcode.isActive
    );
  }
  
  // Barcode Scan History operations
  async createBarcodeScan(scan: InsertBarcodeScanHistory): Promise<BarcodeScanHistory> {
    const id = this.barcodeScanHistoryId++;
    const newScan: BarcodeScanHistory = {
      ...scan,
      id,
      scannedAt: new Date()
    };
    this.barcodeScanHistory.set(id, newScan);
    return newScan;
  }
  
  async getBarcodeScanHistory(id: number): Promise<BarcodeScanHistory | undefined> {
    return this.barcodeScanHistory.get(id);
  }
  
  async getBarcodeScansByBarcodeId(barcodeId: number): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.barcodeId === barcodeId
    );
  }
  
  async getBarcodeScansByUserId(userId: number): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.userId === userId
    );
  }
  
  async getBarcodeScansByActionType(actionType: string): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.actionType === actionType
    );
  }
  
  async getBarcodeScansByDate(startDate: Date, endDate: Date): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.scannedAt >= startDate && scan.scannedAt <= endDate
    );
  }
  
  // Inventory Adjustment operations
  async getInventoryAdjustment(id: number): Promise<InventoryAdjustment | undefined> {
    return this.inventoryAdjustments.get(id);
  }
  
  async createInventoryAdjustment(adjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment> {
    const id = this.inventoryAdjustmentId++;
    const newAdjustment: InventoryAdjustment = {
      ...adjustment,
      id,
      createdAt: new Date()
    };
    this.inventoryAdjustments.set(id, newAdjustment);
    
    // Apply the adjustment to the inventory
    if (adjustment.locationType === 'warehouse') {
      const inventory = await this.getWarehouseInventory(adjustment.locationId, adjustment.itemId);
      if (inventory) {
        const newQuantity = inventory.quantity + adjustment.quantityChange;
        await this.updateWarehouseInventory(inventory.id, { quantity: newQuantity });
      }
    } else if (adjustment.locationType === 'vehicle') {
      const inventory = await this.getVehicleInventory(adjustment.locationId, adjustment.itemId);
      if (inventory) {
        const newQuantity = inventory.quantity + adjustment.quantityChange;
        await this.updateVehicleInventory(inventory.id, { quantity: newQuantity });
      }
    }
    
    return newAdjustment;
  }
  
  async getInventoryAdjustmentsByItemId(itemId: number): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.itemId === itemId
    );
  }
  
  async getInventoryAdjustmentsByLocationId(locationType: string, locationId: number): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.locationType === locationType && adjustment.locationId === locationId
    );
  }
  
  async getInventoryAdjustmentsByUserId(userId: number): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.userId === userId
    );
  }
  
  async getInventoryAdjustmentsByReason(reason: string): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.reason === reason
    );
  }
  
  async getInventoryAdjustmentsByDate(startDate: Date, endDate: Date): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.createdAt >= startDate && adjustment.createdAt <= endDate
    );
  }
  
  // Initialize Fleetmatics sample data
  private async initSampleFleetmaticsData() {
    console.log("Initializing sample Fleetmatics data...");
    
    // Create a Fleetmatics configuration for testing
    const fleetmaticsConfig = await this.createFleetmaticsConfig({
      organizationId: 1,
      apiKey: "sample_api_key",
      apiSecret: "sample_api_secret",
      baseUrl: "https://fim.us.fleetmatics.com/api",
      accessToken: "sample_access_token",
      refreshToken: "sample_refresh_token",
      tokenExpiryTime: new Date(Date.now() + 3600000), // 1 hour from now
      syncFrequencyMinutes: 15, // Sync every 15 minutes
      isActive: true
    });
    
    // Find technician vehicles to map with Fleetmatics
    const tech1 = await this.getTechnicianByUserId(2);
    const tech2 = await this.getTechnicianByUserId(3);
    
    if (tech1) {
      const tech1Vehicles = await this.getTechnicianVehiclesByTechnicianId(tech1.id);
      if (tech1Vehicles.length > 0) {
        const vehicle1 = tech1Vehicles[0];
        
        // Update vehicle with Fleetmatics IDs
        await this.updateTechnicianVehicle(vehicle1.id, {
          fleetmaticsVehicleId: "fleet_vehicle_1",
          gpsDeviceId: "gps_device_1",
          lastKnownLatitude: 40.7128,
          lastKnownLongitude: -74.0060, // NYC coordinates
          lastLocationUpdate: new Date()
        } as any);
        
        // Add some location history for vehicle 1
        await this.createFleetmaticsLocationHistory({
          vehicleId: vehicle1.id,
          latitude: 40.7128,
          longitude: -74.0060,
          speed: 0,
          heading: 0,
          ignitionStatus: "off",
          eventType: "location_update",
          eventTime: new Date(Date.now() - 3600000), // 1 hour ago
          address: "New York, NY",
          fleetmaticsEventId: "event_1"
        });
        
        await this.createFleetmaticsLocationHistory({
          vehicleId: vehicle1.id,
          latitude: 40.7138,
          longitude: -74.0070,
          speed: 25,
          heading: 90,
          ignitionStatus: "on",
          eventType: "location_update",
          eventTime: new Date(Date.now() - 1800000), // 30 minutes ago
          address: "New York, NY",
          fleetmaticsEventId: "event_2"
        });
        
        await this.createFleetmaticsLocationHistory({
          vehicleId: vehicle1.id,
          latitude: 40.7148,
          longitude: -74.0080,
          speed: 0,
          heading: 90,
          ignitionStatus: "on",
          eventType: "location_update",
          eventTime: new Date(), // Now
          address: "New York, NY",
          fleetmaticsEventId: "event_3"
        });
      }
    }
    
    if (tech2) {
      const tech2Vehicles = await this.getTechnicianVehiclesByTechnicianId(tech2.id);
      if (tech2Vehicles.length > 0) {
        const vehicle2 = tech2Vehicles[0];
        
        // Update vehicle with Fleetmatics IDs
        await this.updateTechnicianVehicle(vehicle2.id, {
          fleetmaticsVehicleId: "fleet_vehicle_2",
          gpsDeviceId: "gps_device_2",
          lastKnownLatitude: 34.0522,
          lastKnownLongitude: -118.2437, // LA coordinates
          lastLocationUpdate: new Date()
        } as any);
        
        // Add some location history for vehicle 2
        await this.createFleetmaticsLocationHistory({
          vehicleId: vehicle2.id,
          latitude: 34.0522,
          longitude: -118.2437,
          speed: 0,
          heading: 0,
          ignitionStatus: "off",
          eventType: "location_update",
          eventTime: new Date(Date.now() - 3600000), // 1 hour ago
          address: "Los Angeles, CA",
          fleetmaticsEventId: "event_4"
        });
        
        await this.createFleetmaticsLocationHistory({
          vehicleId: vehicle2.id,
          latitude: 34.0532,
          longitude: -118.2447,
          speed: 30,
          heading: 45,
          ignitionStatus: "on",
          eventType: "location_update",
          eventTime: new Date(Date.now() - 1800000), // 30 minutes ago
          address: "Los Angeles, CA",
          fleetmaticsEventId: "event_5"
        });
        
        await this.createFleetmaticsLocationHistory({
          vehicleId: vehicle2.id,
          latitude: 34.0542,
          longitude: -118.2457,
          speed: 0,
          heading: 45,
          ignitionStatus: "on",
          eventType: "location_update",
          eventTime: new Date(), // Now
          address: "Los Angeles, CA",
          fleetmaticsEventId: "event_6"
        });
      }
    }
    
    console.log("Sample Fleetmatics data initialized successfully");
  }
  
  private async initSampleSubscriptionData() {
    console.log("Initializing sample subscription data...");
    
    // Create subscription plans
    const basicMonthlyPlan = await this.createSubscriptionPlan({
      name: "Basic Monthly",
      description: "Basic features with monthly billing",
      tier: "basic",
      price: 1999, // $19.99
      billingCycle: "monthly",
      features: JSON.stringify([
        "Up to 5 users",
        "Basic client management",
        "Basic scheduling",
        "Email support"
      ]),
      active: true,
      stripeProductId: "prod_basic_monthly",
      stripePriceId: "price_basic_monthly"
    });
    
    const basicYearlyPlan = await this.createSubscriptionPlan({
      name: "Basic Yearly",
      description: "Basic features with yearly billing (save 17%)",
      tier: "basic",
      price: 19990, // $199.90 (2 months free)
      billingCycle: "yearly",
      features: JSON.stringify([
        "Up to 5 users",
        "Basic client management",
        "Basic scheduling",
        "Email support"
      ]),
      active: true,
      stripeProductId: "prod_basic_yearly",
      stripePriceId: "price_basic_yearly"
    });
    
    const professionalMonthlyPlan = await this.createSubscriptionPlan({
      name: "Professional Monthly",
      description: "Professional features with monthly billing",
      tier: "professional",
      price: 4999, // $49.99
      billingCycle: "monthly",
      features: JSON.stringify([
        "Up to 15 users",
        "Advanced client management",
        "Advanced scheduling",
        "Chemical tracking",
        "Work order management",
        "Email and phone support"
      ]),
      active: true,
      stripeProductId: "prod_professional_monthly",
      stripePriceId: "price_professional_monthly"
    });
    
    const professionalYearlyPlan = await this.createSubscriptionPlan({
      name: "Professional Yearly",
      description: "Professional features with yearly billing (save 17%)",
      tier: "professional",
      price: 49990, // $499.90 (2 months free)
      billingCycle: "yearly",
      features: JSON.stringify([
        "Up to 15 users",
        "Advanced client management",
        "Advanced scheduling",
        "Chemical tracking",
        "Work order management",
        "Email and phone support"
      ]),
      active: true,
      stripeProductId: "prod_professional_yearly",
      stripePriceId: "price_professional_yearly"
    });
    
    const enterpriseMonthlyPlan = await this.createSubscriptionPlan({
      name: "Enterprise Monthly",
      description: "Enterprise features with monthly billing",
      tier: "enterprise",
      price: 9999, // $99.99
      billingCycle: "monthly",
      features: JSON.stringify([
        "Unlimited users",
        "Full client management",
        "Full scheduling",
        "Chemical tracking and forecasting",
        "Work order management",
        "Inventory management",
        "Advanced reporting",
        "GPS tracking",
        "Priority email and phone support"
      ]),
      active: true,
      stripeProductId: "prod_enterprise_monthly",
      stripePriceId: "price_enterprise_monthly"
    });
    
    const enterpriseYearlyPlan = await this.createSubscriptionPlan({
      name: "Enterprise Yearly",
      description: "Enterprise features with yearly billing (save 17%)",
      tier: "enterprise",
      price: 99990, // $999.90 (2 months free)
      billingCycle: "yearly",
      features: JSON.stringify([
        "Unlimited users",
        "Full client management",
        "Full scheduling",
        "Chemical tracking and forecasting",
        "Work order management",
        "Inventory management",
        "Advanced reporting",
        "GPS tracking",
        "Priority email and phone support"
      ]),
      active: true,
      stripeProductId: "prod_enterprise_yearly",
      stripePriceId: "price_enterprise_yearly"
    });
    
    console.log("Created subscription plans with IDs:", 
      basicMonthlyPlan.id, basicYearlyPlan.id, 
      professionalMonthlyPlan.id, professionalYearlyPlan.id, 
      enterpriseMonthlyPlan.id, enterpriseYearlyPlan.id);
    
    // Create a subscription for the SmartWater Pools organization
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const mainSubscription = await this.createSubscription({
      organizationId: 1,
      planId: enterpriseMonthlyPlan.id,
      status: "active",
      currentPeriodStart: today,
      currentPeriodEnd: nextMonth,
      cancelAtPeriodEnd: false,
      stripeCustomerId: "cus_example123",
      stripeSubscriptionId: "sub_example123",
      stripeProductId: "prod_enterprise_monthly",
      stripePriceId: "price_enterprise_monthly"
    });
    
    console.log(`Created subscription with ID ${mainSubscription.id} for SmartWater Pools`);
    
    // Create a payment record
    const paymentRecord = await this.createPaymentRecord({
      organizationId: 1,
      subscriptionId: mainSubscription.id,
      amount: 9999,
      currency: "usd",
      status: "succeeded",
      paymentMethod: "credit_card",
      paymentMethodDetails: JSON.stringify({
        brand: "visa",
        last4: "4242"
      }),
      stripePaymentIntentId: "pi_example123",
      description: "Enterprise Monthly Plan - Initial payment"
    });
    
    console.log(`Created payment record with ID ${paymentRecord.id}`);
    console.log("Sample subscription data initialized successfully");
  }
  
  // Fleetmatics operations
  async getFleetmaticsConfig(id: number): Promise<FleetmaticsConfig | undefined> {
    return this.fleetmaticsConfigs.get(id);
  }
  
  async getFleetmaticsConfigByOrganizationId(organizationId: number): Promise<FleetmaticsConfig | undefined> {
    return Array.from(this.fleetmaticsConfigs.values()).find(
      (config) => config.organizationId === organizationId
    );
  }
  
  async createFleetmaticsConfig(insertConfig: InsertFleetmaticsConfig): Promise<FleetmaticsConfig> {
    const id = this.fleetmaticsConfigId++;
    const config: FleetmaticsConfig = {
      ...insertConfig,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncTime: insertConfig.lastSyncTime || null,
      syncInterval: insertConfig.syncInterval || 15, // Default to 15 minutes
      isActive: insertConfig.isActive !== undefined ? insertConfig.isActive : true
    };
    this.fleetmaticsConfigs.set(id, config);
    return config;
  }
  
  async updateFleetmaticsConfig(id: number, data: Partial<FleetmaticsConfig>): Promise<FleetmaticsConfig | undefined> {
    const config = await this.getFleetmaticsConfig(id);
    if (!config) return undefined;
    
    const updatedConfig = { 
      ...config, 
      ...data,
      updatedAt: new Date()
    };
    this.fleetmaticsConfigs.set(id, updatedConfig);
    return updatedConfig;
  }
  
  async deleteFleetmaticsConfig(id: number): Promise<boolean> {
    return this.fleetmaticsConfigs.delete(id);
  }
  
  async getAllFleetmaticsConfigs(): Promise<FleetmaticsConfig[]> {
    return Array.from(this.fleetmaticsConfigs.values());
  }
  
  async createFleetmaticsLocationHistory(insertHistory: InsertFleetmaticsLocationHistory): Promise<FleetmaticsLocationHistory> {
    const id = this.fleetmaticsLocationHistoryId++;
    const history: FleetmaticsLocationHistory = {
      ...insertHistory,
      id,
      createdAt: new Date()
    };
    this.fleetmaticsLocationHistories.set(id, history);
    return history;
  }
  
  async getFleetmaticsLocationHistory(id: number): Promise<FleetmaticsLocationHistory | undefined> {
    return this.fleetmaticsLocationHistories.get(id);
  }
  
  async getFleetmaticsLocationHistoryByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory[]> {
    return Array.from(this.fleetmaticsLocationHistories.values()).filter(
      (history) => history.vehicleId === vehicleId
    );
  }
  
  async getLatestFleetmaticsLocationByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory | undefined> {
    const histories = await this.getFleetmaticsLocationHistoryByVehicleId(vehicleId);
    if (histories.length === 0) return undefined;
    
    // Sort by timestamp descending and get the most recent
    return histories.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }
  
  async getFleetmaticsLocationHistoryByDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<FleetmaticsLocationHistory[]> {
    return Array.from(this.fleetmaticsLocationHistories.values()).filter(
      (history) => history.vehicleId === vehicleId && 
                  new Date(history.timestamp) >= startDate && 
                  new Date(history.timestamp) <= endDate
    );
  }
  
  async getFleetmaticsLocationHistoryByVehicleIdAndTimeRange(vehicleId: number, startTime: Date, endTime: Date): Promise<FleetmaticsLocationHistory[]> {
    return this.getFleetmaticsLocationHistoryByDateRange(vehicleId, startTime, endTime);
  }
  
  async updateVehicleLocation(vehicleId: number, latitude: number, longitude: number): Promise<TechnicianVehicle | undefined> {
    const vehicle = await this.getTechnicianVehicle(vehicleId);
    if (!vehicle) return undefined;
    
    const updatedVehicle = {
      ...vehicle,
      lastKnownLatitude: latitude,
      lastKnownLongitude: longitude,
      lastLocationUpdate: new Date()
    };
    
    this.technicianVehicles.set(vehicleId, updatedVehicle);
    return updatedVehicle;
  }
  
  async getVehiclesInArea(latitude: number, longitude: number, radiusMiles: number): Promise<TechnicianVehicle[]> {
    // Get all vehicles with location data
    const vehicles = Array.from(this.technicianVehicles.values()).filter(
      (v) => v.lastKnownLatitude !== null && v.lastKnownLongitude !== null
    );
    
    // Filter vehicles within the specified radius
    return vehicles.filter(vehicle => {
      if (!vehicle.lastKnownLatitude || !vehicle.lastKnownLongitude) return false;
      
      // Use Haversine formula to calculate distance
      const R = 3958.8; // Earth radius in miles
      const dLat = this.toRad(latitude - vehicle.lastKnownLatitude);
      const dLon = this.toRad(longitude - vehicle.lastKnownLongitude);
      
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRad(latitude)) * Math.cos(this.toRad(vehicle.lastKnownLatitude)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance <= radiusMiles;
    });
  }
  
  // Helper function for Haversine formula
  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }
  
  // Subscription Plan operations
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = this.subscriptionPlanId++;
    const subscriptionPlan: SubscriptionPlan = {
      ...plan,
      id,
      active: plan.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.subscriptionPlans.set(id, subscriptionPlan);
    return subscriptionPlan;
  }

  async updateSubscriptionPlan(id: number, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const existingPlan = await this.getSubscriptionPlan(id);
    if (!existingPlan) return undefined;
    
    const updatedPlan = { ...existingPlan, ...plan, updatedAt: new Date() };
    this.subscriptionPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteSubscriptionPlan(id: number): Promise<boolean> {
    return this.subscriptionPlans.delete(id);
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values());
  }

  async getSubscriptionPlansByTier(tier: string): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values())
      .filter(plan => plan.tier === tier);
  }

  async getSubscriptionPlansByBillingCycle(billingCycle: string): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values())
      .filter(plan => plan.billingCycle === billingCycle);
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values())
      .filter(plan => plan.active);
  }

  // Subscription operations
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getSubscriptionByOrganizationId(organizationId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values())
      .find(subscription => subscription.organizationId === organizationId);
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values())
      .find(subscription => subscription.stripeSubscriptionId === stripeSubscriptionId);
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionId++;
    const newSubscription: Subscription = {
      ...subscription,
      id,
      status: subscription.status ?? "active",
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
      canceledAt: subscription.canceledAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.subscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async updateSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription | undefined> {
    const existingSubscription = await this.getSubscription(id);
    if (!existingSubscription) return undefined;
    
    const updatedSubscription = { ...existingSubscription, ...subscription, updatedAt: new Date() };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async deleteSubscription(id: number): Promise<boolean> {
    return this.subscriptions.delete(id);
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async getSubscriptionsByStatus(status: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(subscription => subscription.status === status);
  }

  // Payment Record operations
  async getPaymentRecord(id: number): Promise<PaymentRecord | undefined> {
    return this.paymentRecords.get(id);
  }

  async getPaymentRecordsByOrganizationId(organizationId: number): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values())
      .filter(record => record.organizationId === organizationId);
  }

  async getPaymentRecordsBySubscriptionId(subscriptionId: number): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values())
      .filter(record => record.subscriptionId === subscriptionId);
  }

  async createPaymentRecord(record: InsertPaymentRecord): Promise<PaymentRecord> {
    const id = this.paymentRecordId++;
    const paymentRecord: PaymentRecord = {
      ...record,
      id,
      currency: record.currency ?? "usd",
      createdAt: new Date()
    };
    this.paymentRecords.set(id, paymentRecord);
    return paymentRecord;
  }

  async updatePaymentRecord(id: number, record: Partial<PaymentRecord>): Promise<PaymentRecord | undefined> {
    const existingRecord = await this.getPaymentRecord(id);
    if (!existingRecord) return undefined;
    
    const updatedRecord = { ...existingRecord, ...record };
    this.paymentRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  async deletePaymentRecord(id: number): Promise<boolean> {
    return this.paymentRecords.delete(id);
  }

  async getAllPaymentRecords(): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values());
  }

  async getPaymentRecordsByStatus(status: string): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values())
      .filter(record => record.status === status);
  }

  async getPaymentRecordsByDate(startDate: Date, endDate: Date): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values())
      .filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= startDate && recordDate <= endDate;
      });
  }
  
  // Water Readings operations
  async getWaterReading(id: number): Promise<WaterReading | undefined> {
    return this.waterReadings.get(id);
  }
  
  async createWaterReading(insertReading: InsertWaterReading): Promise<WaterReading> {
    const id = this.waterReadingId++;
    const reading: WaterReading = {
      ...insertReading,
      id,
      phLevel: insertReading.phLevel ?? null,
      chlorineLevel: insertReading.chlorineLevel ?? null,
      alkalinity: insertReading.alkalinity ?? null,
      cyanuricAcid: insertReading.cyanuricAcid ?? null,
      calciumHardness: insertReading.calciumHardness ?? null,
      totalDissolvedSolids: insertReading.totalDissolvedSolids ?? null,
      saltLevel: insertReading.saltLevel ?? null,
      phosphates: insertReading.phosphates ?? null,
      createdAt: new Date()
    };
    this.waterReadings.set(id, reading);
    return reading;
  }
  
  async getWaterReadingsByMaintenanceId(maintenanceId: number): Promise<WaterReading[]> {
    return Array.from(this.waterReadings.values()).filter(
      (reading) => reading.maintenanceId === maintenanceId
    );
  }
  
  async getLatestWaterReadingByClientId(clientId: number): Promise<WaterReading | undefined> {
    // Find all maintenance records for the client
    const clientMaintenances = Array.from(this.maintenances.values()).filter(
      (maintenance) => maintenance.clientId === clientId
    );
    
    // Get all maintenance IDs
    const maintenanceIds = clientMaintenances.map(maintenance => maintenance.id);
    
    // Find all water readings for these maintenances
    const clientWaterReadings = Array.from(this.waterReadings.values()).filter(
      (reading) => maintenanceIds.includes(reading.maintenanceId)
    );
    
    // Sort by creation date (newest first) and return the first one
    return clientWaterReadings.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
  }

  // Maintenance Report operations
  async getMaintenanceReport(id: number): Promise<MaintenanceReport | undefined> {
    return this.maintenanceReports.get(id);
  }

  async getMaintenanceReportsByMaintenanceId(maintenanceId: number): Promise<MaintenanceReport[]> {
    return Array.from(this.maintenanceReports.values()).filter(
      report => report.maintenanceId === maintenanceId
    );
  }

  async createMaintenanceReport(report: InsertMaintenanceReport): Promise<MaintenanceReport> {
    const id = this.maintenanceReportId++;
    const newReport: MaintenanceReport = {
      ...report,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.maintenanceReports.set(id, newReport);
    return newReport;
  }

  async updateMaintenanceReport(id: number, report: Partial<MaintenanceReport>): Promise<MaintenanceReport | undefined> {
    const existingReport = this.maintenanceReports.get(id);
    if (!existingReport) {
      return undefined;
    }

    const updatedReport: MaintenanceReport = {
      ...existingReport,
      ...report,
      updatedAt: new Date()
    };
    this.maintenanceReports.set(id, updatedReport);
    return updatedReport;
  }

  async deleteMaintenanceReport(id: number): Promise<boolean> {
    if (!this.maintenanceReports.has(id)) {
      return false;
    }
    return this.maintenanceReports.delete(id);
  }
  
  // Repair operations
  async getRepair(id: number): Promise<Repair | undefined> {
    return this.repairs.get(id);
  }
  
  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const id = this.repairId++;
    // Ensure required fields have proper default values
    const repair: Repair = { 
      ...insertRepair, 
      id, 
      description: insertRepair.description || null,
      reportedDate: new Date(),
      completionDate: null,
      status: insertRepair.status ?? "pending",
      notes: insertRepair.notes ?? null,
      technicianId: insertRepair.technicianId ?? null,
      priority: insertRepair.priority ?? "medium",
      scheduledDate: insertRepair.scheduledDate ?? null,
      scheduledTime: insertRepair.scheduledTime ?? null
    };
    this.repairs.set(id, repair);
    return repair;
  }
  
  async updateRepair(id: number, data: Partial<Repair>): Promise<Repair | undefined> {
    const repair = await this.getRepair(id);
    if (!repair) return undefined;
    
    const updatedRepair = { ...repair, ...data };
    this.repairs.set(id, updatedRepair);
    return updatedRepair;
  }
  
  async getAllRepairs(): Promise<Repair[]> {
    return Array.from(this.repairs.values());
  }
  
  async getRepairsByClientId(clientId: number): Promise<Repair[]> {
    return Array.from(this.repairs.values()).filter(
      (repair) => repair.clientId === clientId,
    );
  }
  
  async getRepairsByTechnicianId(technicianId: number): Promise<Repair[]> {
    return Array.from(this.repairs.values()).filter(
      (repair) => repair.technicianId === technicianId,
    );
  }
  
  async getRecentRepairs(count: number): Promise<Repair[]> {
    return Array.from(this.repairs.values())
      .sort((a, b) => {
        return new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime();
      })
      .slice(0, count);
  }
  
  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }
  
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceId++;
    // Ensure required fields have proper default values
    const invoice: Invoice = { 
      ...insertInvoice, 
      id, 
      issueDate: new Date(),
      status: insertInvoice.status ?? "pending",
      notes: insertInvoice.notes ?? null
    };
    this.invoices.set(id, invoice);
    return invoice;
  }
  
  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...data };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }
  
  async getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (invoice) => invoice.clientId === clientId,
    );
  }
  
  // Pool Equipment operations
  async getPoolEquipment(id: number): Promise<PoolEquipment | undefined> {
    return this.poolEquipment.get(id);
  }
  
  async createPoolEquipment(insertEquipment: InsertPoolEquipment): Promise<PoolEquipment> {
    const id = this.poolEquipmentId++;
    // Ensure required fields have proper default values
    const equipment: PoolEquipment = { 
      id,
      name: insertEquipment.name,
      type: insertEquipment.type,
      clientId: insertEquipment.clientId,
      status: insertEquipment.status ?? null,
      brand: insertEquipment.brand ?? null,
      model: insertEquipment.model ?? null,
      serialNumber: insertEquipment.serialNumber ?? null,
      installDate: insertEquipment.installDate ?? null,
      lastServiceDate: insertEquipment.lastServiceDate ?? null,
      notes: insertEquipment.notes ?? null
    };
    this.poolEquipment.set(id, equipment);
    return equipment;
  }
  
  async updatePoolEquipment(id: number, data: Partial<PoolEquipment>): Promise<PoolEquipment | undefined> {
    const equipment = await this.getPoolEquipment(id);
    if (!equipment) return undefined;
    
    const updatedEquipment = { ...equipment, ...data };
    this.poolEquipment.set(id, updatedEquipment);
    return updatedEquipment;
  }
  
  async getPoolEquipmentByClientId(clientId: number): Promise<PoolEquipment[]> {
    return Array.from(this.poolEquipment.values()).filter(
      (equipment) => equipment.clientId === clientId,
    );
  }
  
  // Pool Images operations
  async getPoolImage(id: number): Promise<PoolImage | undefined> {
    return this.poolImages.get(id);
  }
  
  async createPoolImage(insertImage: InsertPoolImage): Promise<PoolImage> {
    const id = this.poolImageId++;
    // Ensure all required fields are explicitly set to handle undefined values
    let technicianId: number | null = null;
    if (insertImage.technician_id !== undefined) {
      technicianId = insertImage.technician_id;
    }
    
    const image: PoolImage = { 
      id,
      clientId: insertImage.clientId,
      imageUrl: insertImage.imageUrl,
      technician_id: technicianId,
      caption: insertImage.caption ?? null,
      category: insertImage.category ?? null,
      uploadDate: new Date()
    };
    this.poolImages.set(id, image);
    return image;
  }
  
  async getPoolImagesByClientId(clientId: number): Promise<PoolImage[]> {
    return Array.from(this.poolImages.values()).filter(
      (image) => image.clientId === clientId,
    );
  }
  
  // Route operations
  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.get(id);
  }
  
  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = this.routeId++;
    const route: Route = {
      ...insertRoute,
      id,
      description: insertRoute.description ?? null,
      startTime: insertRoute.startTime ?? null,
      endTime: insertRoute.endTime ?? null,
      technicianId: insertRoute.technicianId ?? null,
      color: insertRoute.color ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.routes.set(id, route);
    return route;
  }
  
  async updateRoute(id: number, data: Partial<Route>): Promise<Route | undefined> {
    const route = await this.getRoute(id);
    if (!route) return undefined;
    
    const updatedRoute = { ...route, ...data, updatedAt: new Date() };
    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }
  
  async deleteRoute(id: number): Promise<boolean> {
    const route = await this.getRoute(id);
    if (!route) return false;
    
    // Remove all assignments for this route first
    const assignments = await this.getRouteAssignmentsByRouteId(id);
    for (const assignment of assignments) {
      await this.deleteRouteAssignment(assignment.id);
    }
    
    return this.routes.delete(id);
  }
  
  async getAllRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }
  
  async getRoutesByTechnicianId(technicianId: number): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.technicianId === technicianId,
    );
  }
  
  async getRoutesByDayOfWeek(dayOfWeek: string): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase(),
    );
  }
  
  async getRoutesByType(type: string): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(
      (route) => route.type.toLowerCase() === type.toLowerCase(),
    );
  }
  
  // Route Assignment operations
  async getRouteAssignment(id: number): Promise<RouteAssignment | undefined> {
    return this.routeAssignments.get(id);
  }
  
  async createRouteAssignment(insertAssignment: InsertRouteAssignment): Promise<RouteAssignment> {
    const id = this.routeAssignmentId++;
    const assignment: RouteAssignment = {
      ...insertAssignment,
      id,
      estimatedDuration: insertAssignment.estimatedDuration ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.routeAssignments.set(id, assignment);
    return assignment;
  }
  
  async updateRouteAssignment(id: number, data: Partial<RouteAssignment>): Promise<RouteAssignment | undefined> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return undefined;
    
    const updatedAssignment = { ...assignment, ...data, updatedAt: new Date() };
    this.routeAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }
  
  async deleteRouteAssignment(id: number): Promise<boolean> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return false;
    
    return this.routeAssignments.delete(id);
  }
  
  async getRouteAssignmentsByRouteId(routeId: number): Promise<RouteAssignment[]> {
    return Array.from(this.routeAssignments.values())
      .filter(assignment => assignment.routeId === routeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }
  
  async getRouteAssignmentsByMaintenanceId(maintenanceId: number): Promise<RouteAssignment[]> {
    return Array.from(this.routeAssignments.values())
      .filter(assignment => assignment.maintenanceId === maintenanceId);
  }
  
  async reorderRouteAssignments(routeId: number, assignmentIds: number[]): Promise<RouteAssignment[]> {
    // Validate all assignments exist and belong to this route
    const assignments = await Promise.all(
      assignmentIds.map(async (id) => {
        const assignment = await this.getRouteAssignment(id);
        if (!assignment) throw new Error(`Assignment with ID ${id} not found`);
        if (assignment.routeId !== routeId) throw new Error(`Assignment with ID ${id} does not belong to route ${routeId}`);
        return assignment;
      })
    );
    
    // Update the order index for each assignment
    const updatedAssignments = await Promise.all(
      assignments.map(async (assignment, index) => {
        return this.updateRouteAssignment(assignment.id, { orderIndex: index });
      })
    );
    
    return updatedAssignments.filter((assignment): assignment is RouteAssignment => assignment !== undefined);
  }
  
  // Service Template operations
  async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
    return this.serviceTemplates.get(id);
  }
  
  async createServiceTemplate(insertTemplate: InsertServiceTemplate): Promise<ServiceTemplate> {
    const id = this.serviceTemplateId++;
    const template: ServiceTemplate = {
      ...insertTemplate,
      id,
      name: insertTemplate.name,
      type: insertTemplate.type,
      description: insertTemplate.description ?? null,
      isDefault: insertTemplate.isDefault ?? false,
      checklistItems: insertTemplate.checklistItems ?? [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.serviceTemplates.set(id, template);
    return template;
  }
  
  async updateServiceTemplate(id: number, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined> {
    const template = await this.getServiceTemplate(id);
    if (!template) return undefined;
    
    const updatedTemplate = { ...template, ...data };
    this.serviceTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteServiceTemplate(id: number): Promise<boolean> {
    const exists = this.serviceTemplates.has(id);
    if (exists) {
      this.serviceTemplates.delete(id);
    }
    return exists;
  }
  
  async getAllServiceTemplates(): Promise<ServiceTemplate[]> {
    return Array.from(this.serviceTemplates.values());
  }
  
  async getDefaultServiceTemplate(type: string): Promise<ServiceTemplate | undefined> {
    return Array.from(this.serviceTemplates.values()).find(
      (template) => template.type === type && template.isDefault
    );
  }

  // Project Documentation operations
  async getProjectDocument(id: number): Promise<ProjectDocumentation | undefined> {
    return this.projectDocuments.get(id);
  }

  async createProjectDocument(document: InsertProjectDocumentation): Promise<ProjectDocumentation> {
    const id = this.projectDocumentId++;
    const projectDocument: ProjectDocumentation = {
      ...document,
      id,
      description: document.description ?? null,
      tags: document.tags ?? [],
      isPublic: document.isPublic ?? false,
      uploadDate: document.uploadDate ?? new Date().toISOString()
    };
    this.projectDocuments.set(id, projectDocument);
    return projectDocument;
  }

  async updateProjectDocument(id: number, data: Partial<ProjectDocumentation>): Promise<ProjectDocumentation | undefined> {
    const document = await this.getProjectDocument(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...data };
    this.projectDocuments.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteProjectDocument(id: number): Promise<boolean> {
    return this.projectDocuments.delete(id);
  }

  async getProjectDocumentsByProjectId(projectId: number): Promise<ProjectDocumentation[]> {
    return Array.from(this.projectDocuments.values())
      .filter(doc => doc.projectId === projectId)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  async getProjectDocumentsByPhaseId(phaseId: number): Promise<ProjectDocumentation[]> {
    return Array.from(this.projectDocuments.values())
      .filter(doc => doc.phaseId === phaseId)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  async getProjectDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocumentation[]> {
    return Array.from(this.projectDocuments.values())
      .filter(doc => doc.projectId === projectId && doc.documentType === documentType)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }
  
  // Communication Provider operations
  async getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined> {
    return this.communicationProviders.get(id);
  }

  async getCommunicationProviderByType(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    return Array.from(this.communicationProviders.values()).find(
      (provider) => provider.type === type
    );
  }

  async createCommunicationProvider(insertProvider: InsertCommunicationProvider): Promise<CommunicationProvider> {
    const id = this.communicationProviderId++;
    
    const provider: CommunicationProvider = {
      ...insertProvider,
      id,
      isDefault: insertProvider.isDefault ?? false,
      isActive: insertProvider.isActive ?? true,
      clientId: insertProvider.clientId ?? null,
      clientSecret: insertProvider.clientSecret ?? null,
      apiKey: insertProvider.apiKey ?? null,
      accountSid: insertProvider.accountSid ?? null,
      authToken: insertProvider.authToken ?? null,
      refreshToken: insertProvider.refreshToken ?? null,
      accessToken: insertProvider.accessToken ?? null,
      tokenExpiresAt: insertProvider.tokenExpiresAt ?? null,
      email: insertProvider.email ?? null,
      phoneNumber: insertProvider.phoneNumber ?? null,
      settings: insertProvider.settings ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsed: null
    };
    
    // If this provider is marked as default, make sure no other provider of the same type is default
    if (provider.isDefault) {
      const providers = Array.from(this.communicationProviders.values());
      
      providers
        .filter(p => p.type === provider.type && p.id !== provider.id)
        .forEach(p => {
          p.isDefault = false;
          this.communicationProviders.set(p.id, p);
        });
    }
    
    this.communicationProviders.set(id, provider);
    return provider;
  }

  async updateCommunicationProvider(id: number, data: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined> {
    const provider = await this.getCommunicationProvider(id);
    if (!provider) return undefined;
    
    const updatedProvider = { ...provider, ...data, updatedAt: new Date() };
    
    // If this provider is being set as default, make sure no other provider of the same type is default
    if (data.isDefault) {
      const providers = Array.from(this.communicationProviders.values());
      
      providers
        .filter(p => p.type === provider.type && p.id !== provider.id)
        .forEach(p => {
          p.isDefault = false;
          this.communicationProviders.set(p.id, p);
        });
    }
    
    this.communicationProviders.set(id, updatedProvider);
    return updatedProvider;
  }

  async deleteCommunicationProvider(id: number): Promise<boolean> {
    const provider = await this.getCommunicationProvider(id);
    if (!provider) return false;
    
    return this.communicationProviders.delete(id);
  }

  async getAllCommunicationProviders(): Promise<CommunicationProvider[]> {
    return Array.from(this.communicationProviders.values());
  }

  async getDefaultCommunicationProvider(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    return Array.from(this.communicationProviders.values()).find(
      (provider) => provider.type === type && provider.isDefault
    );
  }
  
  // Initialize sample data for testing
  private async initSampleInventoryData() {
    console.log("Initializing sample inventory data...");
    
    // Create sample inventory items
    const chlorine = await this.createInventoryItem({
      name: "Liquid Chlorine",
      description: "Sodium hypochlorite solution for pool disinfection",
      notes: "Store in cool, dry place away from direct sunlight",
      category: "chemicals",
      unit: "gallon",
      currentStock: 50,
      minStockLevel: 10,
      costPerUnit: 4.99,
      isActive: true,
      imageUrl: null,
      supplier: "PoolChem Distributors",
      sku: "LC-5000",
      reorderPoint: 15,
      maxStockLevel: 100,
      lastOrderDate: null
    });
    
    // Initialize sample Fleetmatics data
    await this.initSampleFleetmaticsData();
    
    const tablets = await this.createInventoryItem({
      name: "Chlorine Tablets",
      description: "3-inch stabilized chlorine tablets",
      notes: "Keep container tightly closed",
      category: "chemicals",
      unit: "bucket",
      currentStock: 15,
      minStockLevel: 5,
      costPerUnit: 89.99,
      isActive: true,
      imageUrl: null,
      supplier: "PoolChem Distributors",
      sku: "CT-5025",
      reorderPoint: 7,
      maxStockLevel: 25,
      lastOrderDate: null
    });
    
    const filterCartridge = await this.createInventoryItem({
      name: "Filter Cartridge",
      description: "Standard size pool filter cartridge",
      notes: "Compatible with most major brands",
      category: "equipment",
      unit: "piece",
      currentStock: 30,
      minStockLevel: 8,
      costPerUnit: 35.50,
      isActive: true,
      imageUrl: null,
      supplier: "FiltraTech Inc.",
      sku: "FC-1000",
      reorderPoint: 10,
      maxStockLevel: 50,
      lastOrderDate: null
    });
    
    const pumpMotor = await this.createInventoryItem({
      name: "Pump Motor",
      description: "1.5 HP replacement pool pump motor",
      notes: "Universal mounting bracket included",
      category: "equipment",
      unit: "piece",
      currentStock: 5,
      minStockLevel: 2,
      costPerUnit: 245.99,
      isActive: true,
      imageUrl: null,
      supplier: "MotorWorks Supply",
      sku: "PM-1500",
      reorderPoint: 3,
      maxStockLevel: 10,
      lastOrderDate: null
    });
    
    const testStrips = await this.createInventoryItem({
      name: "5-Way Test Strips",
      description: "Test strips for chlorine, pH, alkalinity, hardness, and cyanuric acid",
      notes: "50 strips per bottle",
      category: "supplies",
      unit: "bottle",
      currentStock: 25,
      minStockLevel: 5,
      costPerUnit: 12.99,
      isActive: true,
      imageUrl: null,
      supplier: "AquaTest Labs",
      sku: "TS-5050",
      reorderPoint: 8,
      maxStockLevel: 40,
      lastOrderDate: null
    });
    
    // Create sample warehouses
    const mainWarehouse = await this.createWarehouse({
      name: "Main Distribution Center",
      address: "1500 Industrial Blvd",
      city: "Tampa",
      state: "FL",
      zipCode: "33602",
      phoneNumber: "813-555-7890",
      description: "Primary storage and distribution facility",
      isActive: true,
      latitude: 27.9506,
      longitude: -82.4572
    });
    
    const northWarehouse = await this.createWarehouse({
      name: "North Tampa Warehouse",
      address: "8200 North Dale Mabry Hwy",
      city: "Tampa",
      state: "FL",
      zipCode: "33614",
      phoneNumber: "813-555-2345",
      description: "Secondary warehouse serving North Tampa region",
      isActive: true,
      latitude: 28.0247,
      longitude: -82.5044
    });
    
    // Create technician vehicles
    const tech1 = await this.getTechnicianByUserId(2);
    if (tech1) {
      const truck1 = await this.createTechnicianVehicle({
        name: "Service Truck 1",
        type: "pickup",
        status: "active",
        notes: "Regular maintenance performed on 2023-10-15",
        technicianId: tech1.id,
        model: "F-150",
        make: "Ford",
        year: 2021,
        licensePlate: "ABC-1234",
        vin: "1FTFW1ET5DFA38125"
      });
      
      // Add isActive field to TechnicianVehicle
      await this.updateTechnicianVehicle(truck1.id, {
        isActive: true,
      } as any);
    }
    
    const tech2 = await this.getTechnicianByUserId(3);
    if (tech2) {
      const truck2 = await this.createTechnicianVehicle({
        name: "Service Truck 2",
        type: "van",
        status: "active",
        notes: "New tires installed 2023-09-28",
        technicianId: tech2.id,
        model: "Sprinter",
        make: "Mercedes",
        year: 2022,
        licensePlate: "XYZ-7890",
        vin: "WD3PE7CC8G5123456"
      });
      
      // Add isActive field to TechnicianVehicle
      await this.updateTechnicianVehicle(truck2.id, {
        isActive: true,
      } as any);
    }
    
    // Add inventory to warehouses
    await this.createWarehouseInventory({
      warehouseId: mainWarehouse.id,
      inventoryItemId: chlorine.id,
      quantity: 40,
      minimumStockLevel: 10,
      maximumStockLevel: 80,
      location: "Aisle A, Shelf 1",
      notes: "Restocked on " + new Date().toLocaleDateString()
    });
    
    await this.createWarehouseInventory({
      warehouseId: mainWarehouse.id,
      inventoryItemId: tablets.id,
      quantity: 12,
      minimumStockLevel: 5,
      maximumStockLevel: 20,
      location: "Aisle A, Shelf 2",
      notes: "Restocked on " + new Date().toLocaleDateString()
    });
    
    await this.createWarehouseInventory({
      warehouseId: mainWarehouse.id,
      inventoryItemId: filterCartridge.id,
      quantity: 25,
      minimumStockLevel: 8,
      maximumStockLevel: 40,
      location: "Aisle B, Shelf 1",
      notes: "Restocked on " + new Date().toLocaleDateString()
    });
    
    await this.createWarehouseInventory({
      warehouseId: northWarehouse.id,
      inventoryItemId: chlorine.id,
      quantity: 10,
      minimumStockLevel: 5,
      maximumStockLevel: 20,
      location: "Section 1, Rack 3",
      notes: "Restocked on " + new Date().toLocaleDateString()
    });
    
    await this.createWarehouseInventory({
      warehouseId: northWarehouse.id,
      inventoryItemId: testStrips.id,
      quantity: 15,
      minimumStockLevel: 3,
      maximumStockLevel: 25,
      location: "Section 2, Rack 1",
      notes: "Restocked on " + new Date().toLocaleDateString()
    });
    
    // Add inventory to vehicles
    if (tech1) {
      const vehicles = await this.getTechnicianVehiclesByTechnicianId(tech1.id);
      if (vehicles.length > 0) {
        await this.createVehicleInventory({
          vehicleId: vehicles[0].id,
          inventoryItemId: chlorine.id,
          quantity: 5,
          targetStockLevel: 8,
          location: "Rear Storage, Left Side",
          notes: "Refilled on " + new Date().toLocaleDateString()
        });
        
        await this.createVehicleInventory({
          vehicleId: vehicles[0].id,
          inventoryItemId: testStrips.id,
          quantity: 3,
          targetStockLevel: 5,
          location: "Front Cabinet, Top Drawer",
          notes: "Refilled on " + new Date().toLocaleDateString()
        });
      }
    }
    
    if (tech2) {
      const vehicles = await this.getTechnicianVehiclesByTechnicianId(tech2.id);
      if (vehicles.length > 0) {
        await this.createVehicleInventory({
          vehicleId: vehicles[0].id,
          inventoryItemId: tablets.id,
          quantity: 2,
          targetStockLevel: 3,
          location: "Center Storage, Shelf 1",
          notes: "Refilled on " + new Date().toLocaleDateString()
        });
        
        await this.createVehicleInventory({
          vehicleId: vehicles[0].id,
          inventoryItemId: filterCartridge.id,
          quantity: 3,
          targetStockLevel: 5,
          location: "Rear Cabinet, Bottom Shelf",
          notes: "Refilled on " + new Date().toLocaleDateString()
        });
      }
    }
    
    // Create a sample inventory transfer
    if (tech1) {
      const vehicles = await this.getTechnicianVehiclesByTechnicianId(tech1.id);
      if (vehicles.length > 0) {
        const transfer = await this.createInventoryTransfer({
          sourceLocationType: "warehouse",
          sourceLocationId: mainWarehouse.id,
          destinationLocationType: "vehicle",
          destinationLocationId: vehicles[0].id,
          transferType: "warehouse_to_vehicle",
          initiatedBy: 1, // Admin user ID
          completedBy: null,
          status: "pending",
          scheduledDate: new Date().toISOString().split('T')[0],
          notes: "Restock service truck before weekly route"
        } as any);
        
        // Add transfer items
        await this.createInventoryTransferItem({
          transferId: transfer.id,
          inventoryItemId: chlorine.id,
          requestedQuantity: 3,
          approvedQuantity: 3,
          actualQuantity: null,
          notes: "Regular restocking"
        });
        
        await this.createInventoryTransferItem({
          transferId: transfer.id,
          inventoryItemId: testStrips.id,
          requestedQuantity: 2,
          approvedQuantity: 2,
          actualQuantity: null,
          notes: "Running low on test strips"
        });
      }
    }
    
    // Create some barcodes
    await this.createBarcode({
      barcodeValue: "CL-" + chlorine.id + "-" + Math.floor(Math.random() * 10000),
      barcodeType: "qr",
      itemType: "inventory_item",
      itemId: chlorine.id,
      isActive: true,
      createdAt: new Date()
    } as any);
    
    await this.createBarcode({
      barcodeValue: "TB-" + tablets.id + "-" + Math.floor(Math.random() * 10000),
      barcodeType: "qr",
      itemType: "inventory_item",
      itemId: tablets.id,
      isActive: true,
      createdAt: new Date()
    } as any);
    
    await this.createBarcode({
      barcodeValue: "WH-" + mainWarehouse.id + "-" + Math.floor(Math.random() * 10000),
      barcodeType: "qr",
      itemType: "warehouse",
      itemId: mainWarehouse.id,
      isActive: true,
      createdAt: new Date()
    } as any);
    
    console.log("Sample inventory data initialized successfully");
  }
  
  private async initSampleData() {
    // Create organizations
    const smartwaterOrg = await this.createOrganization({
      name: "SmartWater Pools",
      slug: "smartwater",
      address: "500 Main Street",
      city: "Orlando",
      state: "FL",
      zipCode: "32801",
      phone: "407-555-1000",
      email: "info@smartwaterpools.com",
      website: "https://smartwaterpools.com",
      logo: "/logo-smartwater.png",
      isSystemAdmin: true
    });
    
    const jalopiOrg = await this.createOrganization({
      name: "Jalopi Pool and Spa",
      slug: "jalopi",
      address: "123 Pool Avenue",
      city: "Tampa",
      state: "FL",
      zipCode: "33601",
      phone: "813-555-2000",
      email: "info@jalopipools.com",
      website: "https://jalopipools.com",
      logo: "/logo-jalopi.png"
    });
    
    const vermontOrg = await this.createOrganization({
      name: "Vermont Pool Co",
      slug: "vermont",
      address: "45 Green Mountain Road",
      city: "Burlington",
      state: "VT",
      zipCode: "05401",
      phone: "802-555-3000",
      email: "info@vermontpoolco.com",
      website: "https://vermontpoolco.com",
      logo: "/logo-vermont.png"
    });
    
    // Create system admin user for SmartWater
    const adminUser = await this.createUser({
      username: "admin",
      password: "admin123",
      name: "Alex Johnson",
      email: "alex@smartwaterpools.com",
      role: "system_admin",
      phone: "555-123-4567",
      address: "123 Admin St",
      organizationId: smartwaterOrg.id
    });
    
    // Create special admin account with tenant access capabilities
    const travisUser = await this.createUser({
      username: "travis",
      password: "travis123",
      name: "Travis DeRisi",
      email: "travis@smartwaterpools.com",
      role: "system_admin",
      phone: "555-987-6543",
      address: "789 Developer Lane",
      organizationId: smartwaterOrg.id
    });
    
    // Create Jalopi org admin
    const jalopiAdminUser = await this.createUser({
      username: "jalopi_admin",
      password: "admin123",
      name: "Maria Rodriguez",
      email: "maria@jalopipools.com",
      role: "org_admin",
      phone: "555-222-3333",
      address: "456 Jalopi HQ",
      organizationId: jalopiOrg.id
    });
    
    // Create Vermont org admin
    const vermontAdminUser = await this.createUser({
      username: "vermont_admin",
      password: "admin123",
      name: "Jake Burlington",
      email: "jake@vermontpoolco.com",
      role: "org_admin",
      phone: "555-444-5555",
      address: "789 Vermont Drive",
      organizationId: vermontOrg.id
    });
    
    // Create technicians for Jalopi Pool and Spa
    const tech1User = await this.createUser({
      username: "tech1",
      password: "tech123",
      name: "Michael Torres",
      email: "michael@jalopipools.com",
      role: "technician",
      phone: "555-234-5678",
      address: "456 Tech Ave",
      organizationId: jalopiOrg.id
    });
    
    const tech1 = await this.createTechnician({
      userId: tech1User.id,
      specialization: "Pool Maintenance",
      certifications: "CPO, Water Chemistry Specialist"
    });
    
    const tech2User = await this.createUser({
      username: "tech2",
      password: "tech123",
      name: "Sarah Kim",
      email: "sarah@vermontpoolco.com",
      role: "technician",
      phone: "555-345-6789",
      address: "789 Tech Blvd",
      organizationId: vermontOrg.id
    });
    
    const tech2 = await this.createTechnician({
      userId: tech2User.id,
      specialization: "Pool Construction",
      certifications: "Master Builder, Electrical Systems"
    });
    
    const tech3User = await this.createUser({
      username: "tech3",
      password: "tech123",
      name: "David Chen",
      email: "david@smartwaterpools.com",
      role: "technician",
      phone: "555-456-7890",
      address: "101 Tech Rd",
      organizationId: smartwaterOrg.id
    });
    
    const tech3 = await this.createTechnician({
      userId: tech3User.id,
      specialization: "Pool Equipment Repair",
      certifications: "Equipment Specialist, Pump Systems"
    });
    
    // Create clients
    const client1User = await this.createUser({
      username: "client1",
      password: "client123",
      name: "Morrison Family",
      email: "morrison@email.com",
      role: "client",
      phone: "555-567-8901",
      address: "123 Lake Dr",
      organizationId: jalopiOrg.id
    });
    
    const client1 = await this.createClient({
      userId: client1User.id,
      companyName: null,
      contractType: "residential",
      latitude: 27.9506, 
      longitude: -82.4572  // Tampa, FL coordinates
    });
    
    const client2User = await this.createUser({
      username: "client2",
      password: "client123",
      name: "Sunset Heights Resort",
      email: "info@sunsetheights.com",
      role: "client",
      phone: "555-678-9012",
      address: "456 Hillside Ave",
      organizationId: jalopiOrg.id
    });
    
    const client2 = await this.createClient({
      userId: client2User.id,
      companyName: "Sunset Heights Resort",
      contractType: "commercial",
      latitude: 28.0395, 
      longitude: -82.4946  // Tampa Bay area coordinates
    });
    
    const client3User = await this.createUser({
      username: "client3",
      password: "client123",
      name: "Jensen Family",
      email: "jensen@email.com",
      role: "client",
      phone: "555-789-0123",
      address: "789 River Rd",
      organizationId: vermontOrg.id
    });
    
    const client3 = await this.createClient({
      userId: client3User.id,
      companyName: null,
      contractType: "residential",
      latitude: 44.4759, 
      longitude: -73.2121  // Burlington, VT coordinates
    });
    
    const client4User = await this.createUser({
      username: "client4",
      password: "client123",
      name: "Thompson Residence",
      email: "thompson@email.com",
      role: "client",
      phone: "555-890-1234",
      address: "321 Oak St",
      organizationId: vermontOrg.id
    });
    
    const client4 = await this.createClient({
      userId: client4User.id,
      companyName: null,
      contractType: "residential",
      latitude: 44.4605, 
      longitude: -73.2144  // Burlington, VT area coordinates
    });
    
    const client5User = await this.createUser({
      username: "client5",
      password: "client123",
      name: "Lakeside Community",
      email: "info@lakeside.com",
      role: "client",
      phone: "555-901-2345",
      address: "654 Lake Ave",
      organizationId: jalopiOrg.id
    });
    
    const client5 = await this.createClient({
      userId: client5User.id,
      companyName: "Lakeside Community HOA",
      contractType: "commercial",
      latitude: 27.9742, 
      longitude: -82.5330  // Tampa, FL area coordinates (different location)
    });
    
    // Create projects
    const project1 = await this.createProject({
      name: "Mediterranean Luxury Pool",
      description: "Custom Mediterranean-style pool with spa and waterfall features",
      clientId: client1.id,
      startDate: "2023-09-01",
      estimatedCompletionDate: "2023-11-15",
      status: "in_progress",
      budget: 75000,
      notes: "Client requested blue tile accent and extended patio area"
    });
    
    const project2 = await this.createProject({
      name: "Infinity Edge Resort Pool",
      description: "Commercial infinity edge pool with beach entry and lighting system",
      clientId: client2.id,
      startDate: "2023-08-15",
      estimatedCompletionDate: "2023-10-30",
      status: "review",
      budget: 250000,
      notes: "Final inspection scheduled for next week"
    });
    
    // Project assignments
    await this.createProjectAssignment({
      projectId: project1.id,
      technicianId: tech1.id,
      role: "Lead"
    });
    
    await this.createProjectAssignment({
      projectId: project1.id,
      technicianId: tech2.id,
      role: "Construction"
    });
    
    await this.createProjectAssignment({
      projectId: project2.id,
      technicianId: tech2.id,
      role: "Lead"
    });
    
    await this.createProjectAssignment({
      projectId: project2.id,
      technicianId: tech3.id,
      role: "Equipment"
    });
    
    // Maintenance schedules
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    await this.createMaintenance({
      clientId: client3.id,
      scheduleDate: tomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "weekly_cleaning",
      technicianId: tech1.id,
      notes: ""
    });
    
    await this.createMaintenance({
      clientId: client4.id,
      scheduleDate: tomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "filter_replacement",
      technicianId: tech2.id,
      notes: "Client requested explanation of maintenance process"
    });
    
    await this.createMaintenance({
      clientId: client5.id,
      scheduleDate: dayAfterTomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "chemical_balance",
      technicianId: tech3.id,
      notes: "Check chemical levels and adjust as needed"
    });
    
    await this.createMaintenance({
      clientId: client5.id,
      scheduleDate: dayAfterTomorrow.toISOString().split('T')[0],
      status: "scheduled",
      type: "equipment_inspection",
      technicianId: tech3.id,
      notes: "Inspect all equipment and check for issues"
    });
    
    // Repair requests
    await this.createRepair({
      clientId: client3.id,
      issue: "Pump Failure",
      description: "Pool pump stopped working, making loud noise before shutting off",
      status: "assigned",
      priority: "high",
      technicianId: tech1.id,
      scheduledDate: tomorrow.toISOString().split('T')[0],
      scheduledTime: "13:00:00",
      notes: "Client is concerned about water stagnation"
    });
    
    await this.createRepair({
      clientId: client4.id,
      issue: "Leaking Pipe",
      description: "Water loss in equipment area, visible moisture around pipe connections",
      status: "scheduled",
      priority: "medium",
      technicianId: tech2.id,
      scheduledDate: dayAfterTomorrow.toISOString().split('T')[0],
      scheduledTime: "10:00:00",
      notes: ""
    });
    
    await this.createRepair({
      clientId: client5.id,
      issue: "Heater Issue",
      description: "Pool heater not maintaining temperature, inconsistent heating",
      status: "pending",
      priority: "medium",
      technicianId: null,
      scheduledDate: null,
      scheduledTime: null,
      notes: "Needs diagnostic assessment"
    });
    
    // Invoices
    await this.createInvoice({
      clientId: client1.id,
      amount: 25000,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15).toISOString().split('T')[0],
      status: "pending",
      description: "Progress payment for Mediterranean Luxury Pool (35%)",
      notes: ""
    });
    
    await this.createInvoice({
      clientId: client3.id,
      amount: 150,
      dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).toISOString().split('T')[0],
      status: "pending",
      description: "Monthly maintenance service - October",
      notes: ""
    });
  }
}

export class DatabaseStorage implements IStorage {
  // Initialize ID counters for MemStorage compatibility
  private inventoryItemId = 1;
  
  // Fleetmatics operations
  async getFleetmaticsConfig(id: number): Promise<FleetmaticsConfig | undefined> {
    try {
      const result = await db.query.fleetmaticsConfig.findFirst({
        where: eq(fleetmaticsConfig.id, id)
      });
      return result;
    } catch (error) {
      console.error('Error getting Fleetmatics config:', error);
      return undefined;
    }
  }

  async getFleetmaticsConfigByOrganizationId(organizationId: number): Promise<FleetmaticsConfig | undefined> {
    try {
      const result = await db.query.fleetmaticsConfig.findFirst({
        where: eq(fleetmaticsConfig.organizationId, organizationId)
      });
      return result;
    } catch (error) {
      console.error('Error getting Fleetmatics config by organization ID:', error);
      return undefined;
    }
  }

  async createFleetmaticsConfig(config: InsertFleetmaticsConfig): Promise<FleetmaticsConfig> {
    try {
      const result = await db.insert(fleetmaticsConfig).values(config).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating Fleetmatics config:', error);
      throw error;
    }
  }

  async updateFleetmaticsConfig(id: number, config: Partial<FleetmaticsConfig>): Promise<FleetmaticsConfig | undefined> {
    try {
      const result = await db.update(fleetmaticsConfig)
        .set({
          ...config,
          updatedAt: new Date()
        })
        .where(eq(fleetmaticsConfig.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating Fleetmatics config:', error);
      return undefined;
    }
  }

  async getAllFleetmaticsConfigs(): Promise<FleetmaticsConfig[]> {
    try {
      return await db.query.fleetmaticsConfig.findMany();
    } catch (error) {
      console.error('Error getting all Fleetmatics configs:', error);
      return [];
    }
  }

  async createFleetmaticsLocationHistory(history: InsertFleetmaticsLocationHistory): Promise<FleetmaticsLocationHistory> {
    try {
      const result = await db.insert(fleetmaticsLocationHistory).values(history).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating Fleetmatics location history:', error);
      throw error;
    }
  }

  async getFleetmaticsLocationHistory(id: number): Promise<FleetmaticsLocationHistory | undefined> {
    try {
      const result = await db.query.fleetmaticsLocationHistory.findFirst({
        where: eq(fleetmaticsLocationHistory.id, id)
      });
      return result;
    } catch (error) {
      console.error('Error getting Fleetmatics location history:', error);
      return undefined;
    }
  }

  async getFleetmaticsLocationHistoryByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory[]> {
    try {
      return await db.query.fleetmaticsLocationHistory.findMany({
        where: eq(fleetmaticsLocationHistory.vehicleId, vehicleId),
        orderBy: [desc(fleetmaticsLocationHistory.eventTime)]
      });
    } catch (error) {
      console.error('Error getting Fleetmatics location history by vehicle ID:', error);
      return [];
    }
  }

  async getLatestFleetmaticsLocationByVehicleId(vehicleId: number): Promise<FleetmaticsLocationHistory | undefined> {
    try {
      const result = await db.query.fleetmaticsLocationHistory.findFirst({
        where: eq(fleetmaticsLocationHistory.vehicleId, vehicleId),
        orderBy: [desc(fleetmaticsLocationHistory.eventTime)]
      });
      return result;
    } catch (error) {
      console.error('Error getting latest Fleetmatics location by vehicle ID:', error);
      return undefined;
    }
  }

  async getFleetmaticsLocationHistoryByDateRange(vehicleId: number, startDate: Date, endDate: Date): Promise<FleetmaticsLocationHistory[]> {
    try {
      return await db.query.fleetmaticsLocationHistory.findMany({
        where: and(
          eq(fleetmaticsLocationHistory.vehicleId, vehicleId),
          gte(fleetmaticsLocationHistory.eventTime, startDate),
          lte(fleetmaticsLocationHistory.eventTime, endDate)
        ),
        orderBy: [asc(fleetmaticsLocationHistory.eventTime)]
      });
    } catch (error) {
      console.error('Error getting Fleetmatics location history by date range:', error);
      return [];
    }
  }
  private warehouseId = 1;
  private technicianVehicleId = 1;
  private warehouseInventoryId = 1;
  private vehicleInventoryId = 1;
  private inventoryTransferId = 1;
  private inventoryTransferItemId = 1;
  private barcodeId = 1;
  private barcodeScanHistoryId = 1;
  private inventoryAdjustmentId = 1;

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    try {
      // Use raw SQL with explicit column aliasing to match camelCase property names
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId"
        FROM organizations
        WHERE id = ${id}
      `);
      
      console.log(`[storage] getOrganization(${id}) result:`, 
                  result.rows.length > 0 ? JSON.stringify(result.rows[0]) : 'No organization found');
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0] as Organization;
    } catch (error) {
      console.error("Error getting organization:", error);
      return undefined;
    }
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    try {
      // Use raw SQL with explicit column aliasing to match camelCase property names
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId"
        FROM organizations
        WHERE slug = ${slug}
      `);
      
      console.log(`[storage] getOrganizationBySlug(${slug}) result:`, 
                  result.rows.length > 0 ? JSON.stringify(result.rows[0]) : 'No organization found');
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return result.rows[0] as Organization;
    } catch (error) {
      console.error("Error getting organization by slug:", error);
      return undefined;
    }
  }

  async createOrganization(organization: Partial<InsertOrganization>): Promise<Organization> {
    try {
      console.log("Creating organization with data:", JSON.stringify(organization));
      
      // Use more basic approach with fewer fields to avoid SQL errors
      const result = await db.execute(sql`
        INSERT INTO organizations (
          name,
          slug,
          active,
          is_system_admin,
          created_at
        ) VALUES (
          ${organization.name || ""},
          ${organization.slug || ""},
          ${organization.active !== undefined ? organization.active : true},
          ${organization.isSystemAdmin !== undefined ? organization.isSystemAdmin : false},
          NOW()
        )
        RETURNING 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId"
      `);
      
      if (result.rows.length === 0) {
        throw new Error("Failed to create organization - no rows returned");
      }
      
      return result.rows[0] as Organization;
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  }

  async updateOrganization(id: number, organization: Partial<Organization>): Promise<Organization | undefined> {
    try {
      // Create SQL for updating only the fields that were provided
      let updateSql = 'UPDATE organizations SET ';
      const updateValues: any[] = [];
      const updateFields: string[] = [];
      
      // Add each field that was provided to the update SQL
      if (organization.name !== undefined) {
        updateFields.push('name = $' + (updateValues.length + 1));
        updateValues.push(organization.name);
      }
      if (organization.slug !== undefined) {
        updateFields.push('slug = $' + (updateValues.length + 1));
        updateValues.push(organization.slug);
      }
      if (organization.address !== undefined) {
        updateFields.push('address = $' + (updateValues.length + 1));
        updateValues.push(organization.address);
      }
      if (organization.city !== undefined) {
        updateFields.push('city = $' + (updateValues.length + 1));
        updateValues.push(organization.city);
      }
      if (organization.state !== undefined) {
        updateFields.push('state = $' + (updateValues.length + 1));
        updateValues.push(organization.state);
      }
      if (organization.zipCode !== undefined) {
        updateFields.push('zip_code = $' + (updateValues.length + 1));
        updateValues.push(organization.zipCode);
      }
      if (organization.phone !== undefined) {
        updateFields.push('phone = $' + (updateValues.length + 1));
        updateValues.push(organization.phone);
      }
      if (organization.email !== undefined) {
        updateFields.push('email = $' + (updateValues.length + 1));
        updateValues.push(organization.email);
      }
      if (organization.website !== undefined) {
        updateFields.push('website = $' + (updateValues.length + 1));
        updateValues.push(organization.website);
      }
      if (organization.logo !== undefined) {
        updateFields.push('logo = $' + (updateValues.length + 1));
        updateValues.push(organization.logo);
      }
      if (organization.active !== undefined) {
        updateFields.push('active = $' + (updateValues.length + 1));
        updateValues.push(organization.active);
      }
      if (organization.isSystemAdmin !== undefined) {
        updateFields.push('is_system_admin = $' + (updateValues.length + 1));
        updateValues.push(organization.isSystemAdmin);
      }
      if (organization.subscriptionId !== undefined) {
        updateFields.push('subscription_id = $' + (updateValues.length + 1));
        updateValues.push(organization.subscriptionId);
      }
      if (organization.stripeCustomerId !== undefined) {
        updateFields.push('stripe_customer_id = $' + (updateValues.length + 1));
        updateValues.push(organization.stripeCustomerId);
      }
      
      // Add updated_at timestamp
      updateFields.push('updated_at = $' + (updateValues.length + 1));
      updateValues.push(new Date());
      
      // If no fields were provided to update, return the current organization
      if (updateFields.length === 1) { // Only updated_at is set
        return await this.getOrganization(id);
      }
      
      // Finish building the SQL
      updateSql += updateFields.join(', ');
      updateSql += ' WHERE id = $' + (updateValues.length + 1);
      updateValues.push(id);
      
      // Add RETURNING clause with all fields and the correct column aliases
      updateSql += ` RETURNING 
        id, 
        name,
        slug,
        address,
        city,
        state,
        zip_code as "zipCode",
        phone,
        email,
        website,
        logo,
        active,
        created_at as "createdAt",
        is_system_admin as "isSystemAdmin",
        subscription_id as "subscriptionId",
        stripe_customer_id as "stripeCustomerId"`;
      
      console.log(`[storage] Executing update for organization ${id}:`, updateSql);
      
      // Execute the SQL
      const result = await pool.query(updateSql, updateValues);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      console.log(`[storage] Organization ${id} updated successfully:`, JSON.stringify(result.rows[0]));
      
      return result.rows[0] as Organization;
    } catch (error) {
      console.error("Error updating organization:", error);
      return undefined;
    }
  }

  async getAllOrganizations(): Promise<Organization[]> {
    try {
      // Use raw SQL to avoid schema issues with column naming (snake_case vs camelCase)
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          slug,
          address,
          city,
          state,
          zip_code as "zipCode",
          phone,
          email,
          website,
          logo,
          active,
          created_at as "createdAt",
          is_system_admin as "isSystemAdmin",
          subscription_id as "subscriptionId",
          stripe_customer_id as "stripeCustomerId"
        FROM organizations
        ORDER BY name
      `);
      
      console.log("[storage] getAllOrganizations retrieved", result.rows.length, "organizations");
      
      // Add debugging to check the retrieved organizations
      if (result.rows.length > 0) {
        console.log("[storage] First organization:", JSON.stringify(result.rows[0]));
      }
      
      return result.rows;
    } catch (error) {
      console.error("Error getting all organizations:", error);
      return [];
    }
  }

  async getUsersByOrganizationId(organizationId: number): Promise<User[]> {
    try {
      return await db.select().from(users)
        .where(eq(users.organizationId, organizationId))
        .orderBy(users.name);
    } catch (error) {
      console.error("Error getting users by organization ID:", error);
      return [];
    }
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      // First check if user exists
      const user = await this.getUser(id);
      if (!user) {
        console.error(`Cannot delete user with ID ${id}: User not found`);
        return false;
      }
      
      // Don't allow deletion of system_admin users
      if (user.role === 'system_admin') {
        console.error(`Cannot delete user with ID ${id}: User is a system administrator`);
        return false;
      }
      
      // Perform the deletion
      const result = await db.delete(users)
        .where(eq(users.id, id))
        .returning();
        
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByUserId(userId: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }
  
  async getClientsByOrganizationId(organizationId: number): Promise<Client[]> {
    // First get all users from the organization
    const orgUsers = await db.select().from(users).where(eq(users.organizationId, organizationId));
    
    // Then get all clients associated with those users
    const userIds = orgUsers.map(user => user.id);
    
    if (userIds.length === 0) {
      return []; // No users in this organization
    }
    
    return await db.select().from(clients).where(inArray(clients.userId, userIds));
  }
  
  async updateClient(id: number, data: Partial<Client>): Promise<Client | undefined> {
    console.log(`[DB STORAGE] Updating client ${id} with data:`, JSON.stringify(data));
    
    // Before retrieving current data, log exactly what contractType was sent
    if ('contractType' in data) {
      console.log(`[DB STORAGE] CONTRACT TYPE UPDATE RECEIVED: Value=${
        data.contractType === null ? 'null' : 
        data.contractType === undefined ? 'undefined' : 
        `"${data.contractType}"`}, Type=${typeof data.contractType}`);
    }
    
    // Get the current client to compare before/after
    try {
      const [currentClient] = await db.select().from(clients).where(eq(clients.id, id));
      if (currentClient) {
        console.log(`[DB STORAGE] Current client before update:`, JSON.stringify(currentClient));
      }
    } catch (err) {
      console.log(`[DB STORAGE] Error reading current client:`, err);
    }
    
    // Make sure contractType is properly handled
    const updatedData: Partial<Client> = { ...data };
    if (updatedData.contractType !== undefined) {
      // Handle null/empty string values and convert to lowercase
      if (updatedData.contractType === null || updatedData.contractType === '') {
        console.log(`[DB STORAGE] Setting null contract type`);
        updatedData.contractType = null;
      } else {
        // Normalize and validate the contract type
        const normalizedType = String(updatedData.contractType).toLowerCase();
        
        // Validate against allowed contract types
        if (!['residential', 'commercial', 'service', 'maintenance'].includes(normalizedType)) {
          console.error(`[DB STORAGE] Invalid contract type "${normalizedType}" - must be one of: residential, commercial, service, maintenance`);
          throw new Error(`Invalid contract type: ${normalizedType}`);
        }
        
        updatedData.contractType = normalizedType;
        console.log(`[DB STORAGE] Validated and normalized contract type: '${updatedData.contractType}'`);
      }
    }

    try {
      console.log(`[DB STORAGE] Executing update query with data:`, JSON.stringify(updatedData));
      const [updatedClient] = await db
        .update(clients)
        .set(updatedData)
        .where(eq(clients.id, id))
        .returning();
      
      if (updatedClient) {
        console.log(`[DB STORAGE] Client updated successfully:`, JSON.stringify(updatedClient));
        return updatedClient;
      } else {
        console.error(`[DB STORAGE] Update query returned no client`);
        return undefined;
      }
    } catch (error) {
      console.error(`[DB STORAGE] Error updating client:`, error);
      throw error;
    }
  }

  async getClientWithUser(id: number): Promise<{ client: Client; user: User } | undefined> {
    try {
      const [client] = await db.select().from(clients).where(eq(clients.id, id));
      if (!client) {
        console.log(`Client with ID ${id} not found in database`);
        return undefined;
      }

      const [user] = await db.select().from(users).where(eq(users.id, client.userId));
      if (!user) {
        console.log(`User with ID ${client.userId} not found for client ${id}`);
        return undefined;
      }

      console.log(`Successfully retrieved client ${id} with user ${user.id}`);
      return { client, user };
    } catch (error) {
      console.error(`Error in getClientWithUser(${id}):`, error);
      return undefined;
    }
  }

  // Technician operations
  async getTechnician(id: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    return technician || undefined;
  }

  async getTechnicianByUserId(userId: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.userId, userId));
    return technician || undefined;
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const [technician] = await db.insert(technicians).values(insertTechnician).returning();
    return technician;
  }

  async getAllTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getTechnicianWithUser(id: number): Promise<{ technician: Technician; user: User } | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    if (!technician) return undefined;

    const [user] = await db.select().from(users).where(eq(users.id, technician.userId));
    if (!user) return undefined;

    return { technician, user };
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const result = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE id = ${id}
      `);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const project = result.rows[0];
      
      // Add virtual isArchived field based on status
      return {
        ...project,
        isArchived: project.status === "archived"
      };
    } catch (error) {
      console.error(`Error retrieving project ${id}:`, error);
      throw error;
    }
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    try {
      // Check if isArchived is in the data and remove it (virtual field)
      const { isArchived, ...safeData } = insertProject as any;
      
      // Use explicit column inserts to avoid issues with schema mismatches
      // This also ensures we're only inserting fields that actually exist in the database
      const result = await db.execute(sql`
        INSERT INTO projects (
          name, 
          description, 
          client_id, 
          project_type, 
          start_date, 
          estimated_completion_date,
          status,
          budget,
          current_phase,
          percent_complete,
          permit_details,
          notes
        )
        VALUES (
          ${safeData.name},
          ${safeData.description || null},
          ${safeData.clientId},
          ${safeData.projectType || 'construction'},
          ${safeData.startDate},
          ${safeData.estimatedCompletionDate || null},
          ${safeData.status || 'planning'},
          ${safeData.budget || null},
          ${safeData.currentPhase || null},
          ${safeData.percentComplete || 0},
          ${safeData.permitDetails || null},
          ${safeData.notes || null}
        )
        RETURNING 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes
      `);
      
      // Get the inserted project
      const project = result.rows[0];
      
      // Add virtual isArchived field based on status
      return {
        ...project,
        isArchived: project.status === "archived"
      };
    } catch (error) {
      console.error("[PROJECT CREATION] Error:", error);
      throw error;
    }
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    try {
      // Get the current project to know its current status
      const currentProject = await this.getProject(id);
      if (!currentProject) {
        return undefined;
      }
      
      const finalData: Partial<Project> = {...data};
      
      // Handle virtual isArchived field
      if ('isArchived' in data) {
        // Remove isArchived from the data to be saved (it's a virtual field)
        const { isArchived, ...restData } = finalData as any;
        
        // If isArchived is changing, update the status field accordingly
        if (isArchived !== currentProject.isArchived) {
          // Set status to "archived" if isArchived is true, otherwise keep current status or set to active
          restData.status = isArchived === true ? "archived" : (restData.status || currentProject.status === "archived" ? "active" : currentProject.status);
          console.log(`Project ${id} archive status changing to ${isArchived}. Setting status to: ${restData.status}`);
        }
        
        // Use the object without the virtual field
        Object.assign(finalData, restData);
        delete (finalData as any).isArchived;
      }
      
      // Only proceed if there's something to update
      if (Object.keys(finalData).length === 0) {
        return currentProject;
      }
      
      // Use SQL template literals to avoid parameterization issues
      const updates = Object.entries(finalData).map(([key, value]) => {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        return sql`${sql.identifier([snakeKey])} = ${value}`;
      });
      
      // Build and execute the query
      const result = await db.execute(sql`
        UPDATE projects
        SET ${sql.join(updates, sql`, `)}
        WHERE id = ${id}
        RETURNING 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes
      `);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const updatedProject = result.rows[0];
      
      // Add virtual isArchived field based on status
      return {
        ...updatedProject,
        isArchived: updatedProject.status === "archived"
      };
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteProject(id: number): Promise<boolean> {
    try {
      // Delete all phases associated with this project
      const projectPhases = await this.getProjectPhasesByProjectId(id);
      for (const phase of projectPhases) {
        await this.deleteProjectPhase(phase.id);
      }
      
      // Delete all project documents associated with this project
      const projectDocuments = await this.getProjectDocumentsByProjectId(id);
      for (const document of projectDocuments) {
        await this.deleteProjectDocument(document.id);
      }
      
      // Delete the project itself
      const result = await db.delete(projects).where(eq(projects.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      return false;
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      console.log(`Retrieved ${processedResults.length} projects`);
      
      return processedResults;
    } catch (error) {
      console.error("Error fetching all projects:", error);
      // Return empty array as fallback
      return [];
    }
  }

  async getProjectsByClientId(clientId: number): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE client_id = ${clientId}
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects for client ${clientId}:`, error);
      return [];
    }
  }
  
  async getProjectsByType(projectType: string): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE project_type = ${projectType}
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects for type ${projectType}:`, error);
      return [];
    }
  }
  
  async getProjectsByStatus(status: string): Promise<Project[]> {
    try {
      // Use explicit SQL to select only columns that exist in the database
      const results = await db.execute(sql`
        SELECT 
          id, 
          name,
          description,
          client_id as "clientId",
          project_type as "projectType",
          start_date as "startDate",
          estimated_completion_date as "estimatedCompletionDate",
          actual_completion_date as "actualCompletionDate",
          status,
          budget,
          current_phase as "currentPhase",
          percent_complete as "percentComplete",
          permit_details as "permitDetails",
          notes,
          is_template as "isTemplate",
          template_name as "templateName",
          template_category as "templateCategory"
        FROM projects
        WHERE status = ${status}
      `);
      
      // Manually process results to add virtual isArchived field based on status
      const processedResults = results.rows.map(project => ({
        ...project,
        // Virtual isArchived field - consider "archived" status as archived
        isArchived: project.status === "archived"
      }));
      
      console.log(`Retrieved ${processedResults.length} projects with status: ${status}`);
      
      return processedResults;
    } catch (error) {
      console.error(`Error fetching projects with status ${status}:`, error);
      return [];
    }
  }
  
  async getArchivedProjects(): Promise<Project[]> {
    return this.getProjectsByStatus("archived");
  }
  
  async getProjectPhase(id: number): Promise<ProjectPhase | undefined> {
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
    return phase || undefined;
  }
  
  async createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase> {
    const [result] = await db.insert(projectPhases).values({
      ...phase,
      status: phase.status ?? "pending",
      description: phase.description ?? null,
      notes: phase.notes ?? null,
      startDate: phase.startDate ?? null,
      endDate: phase.endDate ?? null,
      percentComplete: phase.percentComplete ?? null
    }).returning();
    return result;
  }
  
  async updateProjectPhase(id: number, data: Partial<ProjectPhase>): Promise<ProjectPhase | undefined> {
    const [result] = await db.update(projectPhases)
      .set(data)
      .where(eq(projectPhases.id, id))
      .returning();
    return result || undefined;
  }
  
  async deleteProjectPhase(id: number): Promise<boolean> {
    try {
      // First check if the phase exists
      const phase = await this.getProjectPhase(id);
      if (!phase) return false;
      
      // Delete the phase
      const result = await db.delete(projectPhases)
        .where(eq(projectPhases.id, id));
      
      // Return true if deletion was successful
      return true;
    } catch (error) {
      console.error("Error deleting project phase:", error);
      return false;
    }
  }
  
  async getProjectPhasesByProjectId(projectId: number): Promise<ProjectPhase[]> {
    return await db.select()
      .from(projectPhases)
      .where(eq(projectPhases.projectId, projectId))
      .orderBy(projectPhases.order);
  }

  // Project assignment operations
  async createProjectAssignment(insertAssignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [assignment] = await db.insert(projectAssignments).values(insertAssignment).returning();
    return assignment;
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    try {
      // Use SQL with COALESCE for backward compatibility with older database schemas
      const results = await db.execute(sql`
        SELECT 
          id, 
          role, 
          project_id as "projectId", 
          technician_id as "technicianId", 
          COALESCE(start_date, null) as "startDate", 
          COALESCE(end_date, null) as "endDate", 
          COALESCE(notes, null) as "notes", 
          COALESCE(phase_id, null) as "phaseId", 
          COALESCE(is_lead, false) as "isLead", 
          COALESCE(hours_allocated, null) as "hoursAllocated", 
          COALESCE(hours_logged, 0) as "hoursLogged"
        FROM project_assignments
        WHERE project_id = ${projectId}
      `);
      
      return results.rows as ProjectAssignment[];
    } catch (error) {
      console.error("Error fetching project assignments:", error);
      return [];
    }
  }

  // Maintenance operations
  async getMaintenance(id: number): Promise<Maintenance | undefined> {
    const [maintenance] = await db.select().from(maintenances).where(eq(maintenances.id, id));
    return maintenance || undefined;
  }

  async createMaintenance(insertMaintenance: InsertMaintenance): Promise<Maintenance> {
    // Ensure all required fields have proper default values for SmartWater style reporting
    const maintenanceWithDefaults = {
      ...insertMaintenance,
      status: insertMaintenance.status ?? "scheduled",
      notes: insertMaintenance.notes ?? null,
      completionDate: insertMaintenance.completionDate ?? null,
      startTime: insertMaintenance.startTime ?? null,
      endTime: insertMaintenance.endTime ?? null,
      customerFeedback: insertMaintenance.customerFeedback ?? null,
      customerNotes: insertMaintenance.customerNotes ?? null,
      invoiceAmount: insertMaintenance.invoiceAmount ?? null,
      laborCost: insertMaintenance.laborCost ?? null,
      totalChemicalCost: insertMaintenance.totalChemicalCost ?? null,
      profitAmount: insertMaintenance.profitAmount ?? null,
      profitPercentage: insertMaintenance.profitPercentage ?? null
    };
    
    const [maintenance] = await db.insert(maintenances).values(maintenanceWithDefaults).returning();
    return maintenance;
  }

  async updateMaintenance(id: number, data: Partial<Maintenance>): Promise<Maintenance | undefined> {
    const [updatedMaintenance] = await db
      .update(maintenances)
      .set(data)
      .where(eq(maintenances.id, id))
      .returning();
    return updatedMaintenance || undefined;
  }

  async getAllMaintenances(): Promise<Maintenance[]> {
    return await db.select().from(maintenances);
  }

  async getMaintenancesByClientId(clientId: number): Promise<Maintenance[]> {
    return await db.select().from(maintenances).where(eq(maintenances.clientId, clientId));
  }

  async getMaintenancesByTechnicianId(technicianId: number): Promise<Maintenance[]> {
    return await db
      .select()
      .from(maintenances)
      .where(eq(maintenances.technicianId, technicianId));
  }

  async getUpcomingMaintenances(days: number): Promise<Maintenance[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    return await db
      .select()
      .from(maintenances)
      .where(
        and(
          gte(maintenances.scheduleDate, today.toISOString().split('T')[0]),
          lte(maintenances.scheduleDate, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(maintenances.scheduleDate);
  }
  
  async getIncompleteMaintenances(date: Date): Promise<Maintenance[]> {
    const dateStr = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    return await db
      .select()
      .from(maintenances)
      .where(
        and(
          eq(maintenances.scheduleDate, dateStr),
          sql`(${maintenances.status} = 'scheduled' OR ${maintenances.status} = 'in_progress')`,
          sql`${maintenances.completionDate} IS NULL`
        )
      );
  }
  
  async rescheduleIncompleteMaintenances(): Promise<Maintenance[]> {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get incomplete maintenances from yesterday
    const incompleteMaintenances = await this.getIncompleteMaintenances(yesterday);
    
    // Reschedule each maintenance to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const rescheduledMaintenances: Maintenance[] = [];
    
    for (const maintenance of incompleteMaintenances) {
      // Add a note about the rescheduling
      const notes = maintenance.notes 
        ? `${maintenance.notes}\nAutomatically rescheduled from ${maintenance.scheduleDate}` 
        : `Automatically rescheduled from ${maintenance.scheduleDate}`;
      
      const updatedMaintenance = await this.updateMaintenance(maintenance.id, {
        scheduleDate: todayStr,
        notes: notes
      });
      
      if (updatedMaintenance) {
        rescheduledMaintenances.push(updatedMaintenance);
      }
    }
    
    return rescheduledMaintenances;
  }
  
  // Chemical Usage operations
  async getChemicalUsage(id: number): Promise<ChemicalUsage | undefined> {
    const [usage] = await db.select().from(chemicalUsage).where(eq(chemicalUsage.id, id));
    return usage || undefined;
  }
  
  async createChemicalUsage(insertUsage: InsertChemicalUsage): Promise<ChemicalUsage> {
    // Ensure all chemical usage fields have proper default values
    const usageWithDefaults = {
      ...insertUsage,
      notes: insertUsage.notes ?? null,
      reason: insertUsage.reason ?? null
    };
    
    const [usage] = await db.insert(chemicalUsage).values(usageWithDefaults).returning();
    return usage;
  }
  
  async getChemicalUsageByMaintenanceId(maintenanceId: number): Promise<ChemicalUsage[]> {
    return await db
      .select()
      .from(chemicalUsage)
      .where(eq(chemicalUsage.maintenanceId, maintenanceId))
      .orderBy(chemicalUsage.createdAt);
  }
  
  async getChemicalUsageByType(type: ChemicalType): Promise<ChemicalUsage[]> {
    return await db
      .select()
      .from(chemicalUsage)
      .where(eq(chemicalUsage.chemicalType, type))
      .orderBy(chemicalUsage.createdAt);
  }
  
  // Water Readings operations
  async getWaterReading(id: number): Promise<WaterReading | undefined> {
    const [reading] = await db.select().from(waterReadings).where(eq(waterReadings.id, id));
    return reading || undefined;
  }
  
  async createWaterReading(insertReading: InsertWaterReading): Promise<WaterReading> {
    // Ensure all water reading fields have proper default values
    const readingWithDefaults = {
      ...insertReading,
      phLevel: insertReading.phLevel ?? null,
      chlorineLevel: insertReading.chlorineLevel ?? null,
      alkalinity: insertReading.alkalinity ?? null,
      cyanuricAcid: insertReading.cyanuricAcid ?? null,
      calciumHardness: insertReading.calciumHardness ?? null,
      totalDissolvedSolids: insertReading.totalDissolvedSolids ?? null,
      saltLevel: insertReading.saltLevel ?? null,
      phosphates: insertReading.phosphates ?? null
    };
    
    const [reading] = await db.insert(waterReadings).values(readingWithDefaults).returning();
    return reading;
  }
  
  async getWaterReadingsByMaintenanceId(maintenanceId: number): Promise<WaterReading[]> {
    return await db
      .select()
      .from(waterReadings)
      .where(eq(waterReadings.maintenanceId, maintenanceId))
      .orderBy(waterReadings.createdAt);
  }
  
  async getLatestWaterReadingByClientId(clientId: number): Promise<WaterReading | undefined> {
    // Get all maintenance IDs for the client
    const clientMaintenances = await db
      .select()
      .from(maintenances)
      .where(eq(maintenances.clientId, clientId));
    
    if (clientMaintenances.length === 0) {
      return undefined;
    }
    
    const maintenanceIds = clientMaintenances.map(m => m.id);
    
    // Find the latest water reading for any of these maintenances
    const [latestReading] = await db
      .select()
      .from(waterReadings)
      .where(sql`${waterReadings.maintenanceId} IN (${maintenanceIds.join(',')})`)
      .orderBy(desc(waterReadings.createdAt))
      .limit(1);
    
    return latestReading || undefined;
  }

  // Maintenance Report operations
  async getMaintenanceReport(id: number): Promise<MaintenanceReport | undefined> {
    const [report] = await db
      .select()
      .from(maintenanceReports)
      .where(eq(maintenanceReports.id, id))
      .limit(1);
    
    return report;
  }

  async getMaintenanceReportsByMaintenanceId(maintenanceId: number): Promise<MaintenanceReport[]> {
    return db
      .select()
      .from(maintenanceReports)
      .where(eq(maintenanceReports.maintenanceId, maintenanceId))
      .orderBy(desc(maintenanceReports.createdAt));
  }

  async createMaintenanceReport(report: InsertMaintenanceReport): Promise<MaintenanceReport> {
    const [newReport] = await db
      .insert(maintenanceReports)
      .values(report)
      .returning();
    
    return newReport;
  }

  async updateMaintenanceReport(id: number, report: Partial<MaintenanceReport>): Promise<MaintenanceReport | undefined> {
    const [updatedReport] = await db
      .update(maintenanceReports)
      .set({ 
        ...report,
        updatedAt: new Date()
      })
      .where(eq(maintenanceReports.id, id))
      .returning();
    
    return updatedReport;
  }

  async deleteMaintenanceReport(id: number): Promise<boolean> {
    try {
      await db
        .delete(maintenanceReports)
        .where(eq(maintenanceReports.id, id));
      
      return true;
    } catch (error) {
      console.error("Failed to delete maintenance report:", error);
      return false;
    }
  }

  // Repair operations
  async getRepair(id: number): Promise<Repair | undefined> {
    const [repair] = await db.select().from(repairs).where(eq(repairs.id, id));
    return repair || undefined;
  }

  async createRepair(insertRepair: InsertRepair): Promise<Repair> {
    const [repair] = await db
      .insert(repairs)
      .values({
        ...insertRepair,
        description: insertRepair.description || null,
        reportedDate: new Date(),
        completionDate: null
      })
      .returning();
    return repair;
  }

  async updateRepair(id: number, data: Partial<Repair>): Promise<Repair | undefined> {
    const [updatedRepair] = await db
      .update(repairs)
      .set(data)
      .where(eq(repairs.id, id))
      .returning();
    return updatedRepair || undefined;
  }

  async getAllRepairs(): Promise<Repair[]> {
    return await db.select().from(repairs);
  }

  async getRepairsByClientId(clientId: number): Promise<Repair[]> {
    return await db.select().from(repairs).where(eq(repairs.clientId, clientId));
  }

  async getRepairsByTechnicianId(technicianId: number): Promise<Repair[]> {
    return await db
      .select()
      .from(repairs)
      .where(eq(repairs.technicianId, technicianId));
  }

  async getRecentRepairs(count: number): Promise<Repair[]> {
    return await db
      .select()
      .from(repairs)
      .orderBy(desc(repairs.reportedDate))
      .limit(count);
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    // Generate current date
    const now = new Date();
    // Create the invoice with the current date
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    
    // If needed, update the issue date separately
    if (invoice) {
      await db
        .update(invoices)
        .set({ issueDate: now })
        .where(eq(invoices.id, invoice.id));
    }
    
    return invoice;
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoicesByClientId(clientId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.clientId, clientId));
  }

  // Pool Equipment operations
  async getPoolEquipment(id: number): Promise<PoolEquipment | undefined> {
    const [equipment] = await db.select().from(poolEquipment).where(eq(poolEquipment.id, id));
    return equipment || undefined;
  }
  
  async createPoolEquipment(insertEquipment: InsertPoolEquipment): Promise<PoolEquipment> {
    const [equipment] = await db.insert(poolEquipment).values(insertEquipment).returning();
    return equipment;
  }
  
  async updatePoolEquipment(id: number, data: Partial<PoolEquipment>): Promise<PoolEquipment | undefined> {
    const [updatedEquipment] = await db
      .update(poolEquipment)
      .set(data)
      .where(eq(poolEquipment.id, id))
      .returning();
    return updatedEquipment || undefined;
  }
  
  async getPoolEquipmentByClientId(clientId: number): Promise<PoolEquipment[]> {
    return await db.select().from(poolEquipment).where(eq(poolEquipment.clientId, clientId));
  }
  
  // Pool Images operations
  async getPoolImage(id: number): Promise<PoolImage | undefined> {
    const [image] = await db.select().from(poolImages).where(eq(poolImages.id, id));
    return image || undefined;
  }
  
  async createPoolImage(insertImage: InsertPoolImage): Promise<PoolImage> {
    const imageWithDate = {
      ...insertImage,
      uploadDate: new Date()
    };
    const [image] = await db.insert(poolImages).values(imageWithDate).returning();
    return image;
  }
  
  async getPoolImagesByClientId(clientId: number): Promise<PoolImage[]> {
    return await db.select().from(poolImages).where(eq(poolImages.clientId, clientId));
  }
  
  // Service Template operations
  async getServiceTemplate(id: number): Promise<ServiceTemplate | undefined> {
    const [template] = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id));
    return template || undefined;
  }
  
  async createServiceTemplate(insertTemplate: InsertServiceTemplate): Promise<ServiceTemplate> {
    // If this is being set as a default template for a service type, unset any existing defaults
    if (insertTemplate.isDefault) {
      await db
        .update(serviceTemplates)
        .set({ isDefault: false })
        .where(eq(serviceTemplates.type, insertTemplate.type));
    }
    
    const [template] = await db.insert(serviceTemplates).values(insertTemplate).returning();
    return template;
  }
  
  async updateServiceTemplate(id: number, data: Partial<ServiceTemplate>): Promise<ServiceTemplate | undefined> {
    // If this is being set as a default template, unset any existing defaults
    if (data.isDefault && data.type) {
      await db
        .update(serviceTemplates)
        .set({ isDefault: false })
        .where(eq(serviceTemplates.type, data.type));
    } else if (data.isDefault) {
      // Get the existing template to find its service type
      const [existingTemplate] = await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, id));
      if (existingTemplate) {
        await db
          .update(serviceTemplates)
          .set({ isDefault: false })
          .where(and(
            eq(serviceTemplates.type, existingTemplate.type),
            eq(serviceTemplates.isDefault, true)
          ));
      }
    }
    
    const [updatedTemplate] = await db
      .update(serviceTemplates)
      .set(data)
      .where(eq(serviceTemplates.id, id))
      .returning();
      
    return updatedTemplate || undefined;
  }
  
  async deleteServiceTemplate(id: number): Promise<boolean> {
    const [deletedTemplate] = await db
      .delete(serviceTemplates)
      .where(eq(serviceTemplates.id, id))
      .returning();
      
    return !!deletedTemplate;
  }
  
  async getAllServiceTemplates(): Promise<ServiceTemplate[]> {
    return await db.select().from(serviceTemplates);
  }
  
  async getDefaultServiceTemplate(type: string): Promise<ServiceTemplate | undefined> {
    const [template] = await db
      .select()
      .from(serviceTemplates)
      .where(and(
        eq(serviceTemplates.type, type),
        eq(serviceTemplates.isDefault, true)
      ));
      
    return template || undefined;
  }
  
  // Project Documentation operations
  async getProjectDocument(id: number): Promise<ProjectDocumentation | undefined> {
    const [document] = await db.select()
      .from(projectDocumentation)
      .where(eq(projectDocumentation.id, id));
    return document;
  }

  async createProjectDocument(document: InsertProjectDocumentation): Promise<ProjectDocumentation> {
    try {
      // Create a clean object without the uploadDate field - we'll let the DB handle it with defaultNow()
      const { uploadDate, ...cleanDocument } = document;
      
      const [result] = await db.insert(projectDocumentation)
        .values({
          ...cleanDocument,
          description: document.description ?? null,
          tags: document.tags ?? [],
          isPublic: document.isPublic ?? false
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error in createProjectDocument:", error);
      throw error;
    }
  }

  async updateProjectDocument(id: number, data: Partial<ProjectDocumentation>): Promise<ProjectDocumentation | undefined> {
    const [result] = await db.update(projectDocumentation)
      .set(data)
      .where(eq(projectDocumentation.id, id))
      .returning();
    return result;
  }

  async deleteProjectDocument(id: number): Promise<boolean> {
    const result = await db.delete(projectDocumentation)
      .where(eq(projectDocumentation.id, id));
    return !!result.count;
  }

  async getProjectDocumentsByProjectId(projectId: number): Promise<ProjectDocumentation[]> {
    return await db.select()
      .from(projectDocumentation)
      .where(eq(projectDocumentation.projectId, projectId))
      .orderBy(desc(projectDocumentation.uploadDate));
  }

  async getProjectDocumentsByPhaseId(phaseId: number): Promise<ProjectDocumentation[]> {
    return await db.select()
      .from(projectDocumentation)
      .where(eq(projectDocumentation.phaseId, phaseId))
      .orderBy(desc(projectDocumentation.uploadDate));
  }

  async getProjectDocumentsByType(projectId: number, documentType: string): Promise<ProjectDocumentation[]> {
    return await db.select()
      .from(projectDocumentation)
      .where(and(
        eq(projectDocumentation.projectId, projectId),
        eq(projectDocumentation.documentType, documentType)
      ))
      .orderBy(desc(projectDocumentation.uploadDate));
  }

  // Route operations
  async getRoute(id: number): Promise<Route | undefined> {
    const result = await db.query.routes.findFirst({
      where: eq(routes.id, id),
      with: { technician: true },
    });

    return result;
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const [route] = await db
      .insert(routes)
      .values({
        ...insertRoute,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return route;
  }

  async updateRoute(id: number, data: Partial<Route>): Promise<Route | undefined> {
    const route = await this.getRoute(id);
    if (!route) return undefined;

    const [updatedRoute] = await db
      .update(routes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(routes.id, id))
      .returning();

    return updatedRoute;
  }

  async deleteRoute(id: number): Promise<boolean> {
    const route = await this.getRoute(id);
    if (!route) return false;

    // First delete all assignments associated with this route
    const assignments = await this.getRouteAssignmentsByRouteId(id);
    for (const assignment of assignments) {
      await this.deleteRouteAssignment(assignment.id);
    }

    await db.delete(routes).where(eq(routes.id, id));
    return true;
  }

  async getAllRoutes(): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)],
    });

    return result;
  }

  async getRoutesByTechnicianId(technicianId: number): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      where: eq(routes.technicianId, technicianId),
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)],
    });

    return result;
  }

  async getRoutesByDayOfWeek(dayOfWeek: string): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      where: eq(routes.dayOfWeek, dayOfWeek),
      with: { technician: true },
      orderBy: asc(routes.startTime),
    });

    return result;
  }

  async getRoutesByType(type: string): Promise<Route[]> {
    const result = await db.query.routes.findMany({
      where: eq(routes.type, type),
      with: { technician: true },
      orderBy: [asc(routes.dayOfWeek), asc(routes.startTime)],
    });

    return result;
  }

  // Route Assignment operations
  async getRouteAssignment(id: number): Promise<RouteAssignment | undefined> {
    const result = await db.query.routeAssignments.findFirst({
      where: eq(routeAssignments.id, id),
      with: { route: true, maintenance: true },
    });

    return result;
  }

  async createRouteAssignment(insertAssignment: InsertRouteAssignment): Promise<RouteAssignment> {
    const [assignment] = await db
      .insert(routeAssignments)
      .values({
        ...insertAssignment,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return assignment;
  }

  async updateRouteAssignment(id: number, data: Partial<RouteAssignment>): Promise<RouteAssignment | undefined> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return undefined;

    const [updatedAssignment] = await db
      .update(routeAssignments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(routeAssignments.id, id))
      .returning();

    return updatedAssignment;
  }

  async deleteRouteAssignment(id: number): Promise<boolean> {
    const assignment = await this.getRouteAssignment(id);
    if (!assignment) return false;

    await db.delete(routeAssignments).where(eq(routeAssignments.id, id));
    return true;
  }

  async getRouteAssignmentsByRouteId(routeId: number): Promise<RouteAssignment[]> {
    const result = await db.query.routeAssignments.findMany({
      where: eq(routeAssignments.routeId, routeId),
      with: { maintenance: true },
      orderBy: asc(routeAssignments.orderIndex),
    });

    return result;
  }

  async getRouteAssignmentsByMaintenanceId(maintenanceId: number): Promise<RouteAssignment[]> {
    const result = await db.query.routeAssignments.findMany({
      where: eq(routeAssignments.maintenanceId, maintenanceId),
      with: { route: true },
      orderBy: asc(routeAssignments.orderIndex),
    });

    return result;
  }

  async reorderRouteAssignments(routeId: number, assignmentIds: number[]): Promise<RouteAssignment[]> {
    const updatedAssignments: RouteAssignment[] = [];

    // Update each assignment with its new order index
    for (let index = 0; index < assignmentIds.length; index++) {
      const id = assignmentIds[index];
      const assignment = await this.getRouteAssignment(id);
      
      if (assignment && assignment.routeId === routeId) {
        const updatedAssignment = await this.updateRouteAssignment(assignment.id, { orderIndex: index });
        if (updatedAssignment) {
          updatedAssignments.push(updatedAssignment);
        }
      }
    }

    return updatedAssignments;
  }

  // Communication Provider operations
  async getCommunicationProvider(id: number): Promise<CommunicationProvider | undefined> {
    const [provider] = await db.select().from(communicationProviders).where(eq(communicationProviders.id, id));
    return provider || undefined;
  }

  async getCommunicationProviderByType(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    const [provider] = await db.select().from(communicationProviders)
      .where(eq(communicationProviders.type, type))
      .orderBy(desc(communicationProviders.isDefault));
    return provider || undefined;
  }

  async createCommunicationProvider(insertProvider: InsertCommunicationProvider): Promise<CommunicationProvider> {
    // If this provider is marked as default, make sure no other provider of the same type is default
    if (insertProvider.isDefault) {
      await db.update(communicationProviders)
        .set({ isDefault: false })
        .where(and(
          eq(communicationProviders.type, insertProvider.type),
          eq(communicationProviders.isDefault, true)
        ));
    }
    
    const [provider] = await db.insert(communicationProviders)
      .values({
        ...insertProvider,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
      
    return provider;
  }

  async updateCommunicationProvider(id: number, data: Partial<CommunicationProvider>): Promise<CommunicationProvider | undefined> {
    // If this provider is being set as default, make sure no other provider of the same type is default
    if (data.isDefault) {
      const [provider] = await db.select().from(communicationProviders).where(eq(communicationProviders.id, id));
      
      if (provider) {
        await db.update(communicationProviders)
          .set({ isDefault: false })
          .where(and(
            eq(communicationProviders.type, provider.type),
            eq(communicationProviders.isDefault, true),
            sql`${communicationProviders.id} != ${id}`
          ));
      }
    }
    
    const [updatedProvider] = await db.update(communicationProviders)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(communicationProviders.id, id))
      .returning();
      
    return updatedProvider || undefined;
  }

  async deleteCommunicationProvider(id: number): Promise<boolean> {
    const result = await db.delete(communicationProviders)
      .where(eq(communicationProviders.id, id));
      
    return result.rowCount > 0;
  }

  async getAllCommunicationProviders(): Promise<CommunicationProvider[]> {
    return await db.select().from(communicationProviders);
  }

  async getDefaultCommunicationProvider(type: CommunicationProviderType): Promise<CommunicationProvider | undefined> {
    const [provider] = await db.select().from(communicationProviders)
      .where(and(
        eq(communicationProviders.type, type),
        eq(communicationProviders.isDefault, true)
      ));
      
    return provider || undefined;
  }

  // Business Module Operations - Stub implementations
  // Will need to be implemented later as needed
  async getExpense(id: number): Promise<Expense | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    throw new Error("Method not implemented.");
  }
  
  async updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  
  async getAllExpenses(): Promise<Expense[]> {
    throw new Error("Method not implemented.");
  }
  
  async getExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
    throw new Error("Method not implemented.");
  }
  
  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    throw new Error("Method not implemented.");
  }
  
  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    throw new Error("Method not implemented.");
  }
  
  async updateTimeEntry(id: number, entry: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async deleteTimeEntry(id: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  
  async getAllTimeEntries(): Promise<TimeEntry[]> {
    throw new Error("Method not implemented.");
  }
  
  async getTimeEntriesByUserId(userId: number): Promise<TimeEntry[]> {
    throw new Error("Method not implemented.");
  }
  
  async getTimeEntriesByDateRange(startDate: Date, endDate: Date): Promise<TimeEntry[]> {
    throw new Error("Method not implemented.");
  }
  
  async getTimeEntriesByStatus(status: string): Promise<TimeEntry[]> {
    throw new Error("Method not implemented.");
  }
  
  async getTimeEntriesByProjectId(projectId: number): Promise<TimeEntry[]> {
    throw new Error("Method not implemented.");
  }
  
  async getFinancialReport(id: number): Promise<FinancialReport | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async createFinancialReport(report: InsertFinancialReport): Promise<FinancialReport> {
    throw new Error("Method not implemented.");
  }
  
  async updateFinancialReport(id: number, report: Partial<FinancialReport>): Promise<FinancialReport | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async deleteFinancialReport(id: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  
  async getAllFinancialReports(): Promise<FinancialReport[]> {
    throw new Error("Method not implemented.");
  }
  
  async getFinancialReportsByType(type: ReportType): Promise<FinancialReport[]> {
    throw new Error("Method not implemented.");
  }
  
  async getVendor(id: number): Promise<Vendor | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    throw new Error("Method not implemented.");
  }
  
  async updateVendor(id: number, vendor: Partial<Vendor>): Promise<Vendor | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async deleteVendor(id: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  
  async getAllVendors(): Promise<Vendor[]> {
    throw new Error("Method not implemented.");
  }
  
  async getVendorsByCategory(category: string): Promise<Vendor[]> {
    throw new Error("Method not implemented.");
  }
  
  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    throw new Error("Method not implemented.");
  }
  
  async updatePurchaseOrder(id: number, order: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
    throw new Error("Method not implemented.");
  }
  
  async deletePurchaseOrder(id: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  
  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    throw new Error("Method not implemented.");
  }
  
  async getPurchaseOrdersByVendorId(vendorId: number): Promise<PurchaseOrder[]> {
    throw new Error("Method not implemented.");
  }
  
  async getPurchaseOrdersByStatus(status: string): Promise<PurchaseOrder[]> {
    throw new Error("Method not implemented.");
  }
  
  async getPurchaseOrdersByDateRange(startDate: Date, endDate: Date): Promise<PurchaseOrder[]> {
    throw new Error("Method not implemented.");
  }
  
  // Get projects by status
  async getProjectsByStatus(status: string): Promise<Project[]> {
    try {
      const result = await db.select().from(projects).where(eq(projects.status, status));
      return result.map(project => ({
        ...project,
        isArchived: project.status === "archived"
      }));
    } catch (error) {
      console.error(`Error retrieving projects by status '${status}':`, error);
      return [];
    }
  }
  
  // Get archived projects
  async getArchivedProjects(): Promise<Project[]> {
    try {
      const result = await db.select().from(projects).where(eq(projects.status, "archived"));
      return result.map(project => ({
        ...project,
        isArchived: true
      }));
    } catch (error) {
      console.error("Error retrieving archived projects:", error);
      return [];
    }
  }
  
  // Inventory Management System Implementation
  
  // Inventory Item operations
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    try {
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
      return item || undefined;
    } catch (error) {
      console.error(`Error retrieving inventory item ${id}:`, error);
      return undefined;
    }
  }
  
  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
    try {
      const [item] = await db.insert(inventoryItems).values(insertItem).returning();
      return item;
    } catch (error) {
      console.error("Error creating inventory item:", error);
      throw error;
    }
  }
  
  async updateInventoryItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    try {
      const [updatedItem] = await db
        .update(inventoryItems)
        .set({...data, updatedAt: new Date()})
        .where(eq(inventoryItems.id, id))
        .returning();
      return updatedItem || undefined;
    } catch (error) {
      console.error(`Error updating inventory item ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteInventoryItem(id: number): Promise<boolean> {
    try {
      const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting inventory item ${id}:`, error);
      return false;
    }
  }
  
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    try {
      return await db.select().from(inventoryItems);
    } catch (error) {
      console.error("Error retrieving all inventory items:", error);
      return [];
    }
  }
  
  async getInventoryItemsByCategory(category: string): Promise<InventoryItem[]> {
    try {
      return await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.category, category));
    } catch (error) {
      console.error(`Error retrieving inventory items with category ${category}:`, error);
      return [];
    }
  }
  
  async getLowStockItems(): Promise<InventoryItem[]> {
    try {
      // Using raw SQL for more complex query
      const result = await db.execute(sql`
        SELECT i.*
        FROM inventory_items i
        WHERE i.current_stock < i.min_stock_level AND i.is_active = true
      `);
      
      if (!result.rows) {
        return [];
      }
      
      return result.rows as InventoryItem[];
    } catch (error) {
      console.error("Error retrieving low stock items:", error);
      return [];
    }
  }
  
  // Warehouse operations
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    try {
      const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
      return warehouse || undefined;
    } catch (error) {
      console.error(`Error retrieving warehouse ${id}:`, error);
      return undefined;
    }
  }
  
  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    try {
      const [warehouse] = await db.insert(warehouses).values(insertWarehouse).returning();
      return warehouse;
    } catch (error) {
      console.error("Error creating warehouse:", error);
      throw error;
    }
  }
  
  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse | undefined> {
    try {
      const [updatedWarehouse] = await db
        .update(warehouses)
        .set({...data, updatedAt: new Date()})
        .where(eq(warehouses.id, id))
        .returning();
      return updatedWarehouse || undefined;
    } catch (error) {
      console.error(`Error updating warehouse ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteWarehouse(id: number): Promise<boolean> {
    try {
      // First check if there are any inventory items in this warehouse
      const warehouseItems = await db
        .select()
        .from(warehouseInventory)
        .where(eq(warehouseInventory.warehouseId, id));
      
      if (warehouseItems.length > 0) {
        console.error(`Cannot delete warehouse ${id} because it contains inventory items`);
        return false;
      }
      
      const result = await db.delete(warehouses).where(eq(warehouses.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting warehouse ${id}:`, error);
      return false;
    }
  }
  
  async getAllWarehouses(): Promise<Warehouse[]> {
    try {
      return await db.select().from(warehouses);
    } catch (error) {
      console.error("Error retrieving all warehouses:", error);
      return [];
    }
  }
  
  async getActiveWarehouses(): Promise<Warehouse[]> {
    try {
      return await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.isActive, true));
    } catch (error) {
      console.error("Error retrieving active warehouses:", error);
      return [];
    }
  }
  
  // Technician Vehicle operations
  async getTechnicianVehicle(id: number): Promise<TechnicianVehicle | undefined> {
    try {
      const [vehicle] = await db.select().from(technicianVehicles).where(eq(technicianVehicles.id, id));
      return vehicle || undefined;
    } catch (error) {
      console.error(`Error retrieving technician vehicle ${id}:`, error);
      return undefined;
    }
  }
  
  async createTechnicianVehicle(insertVehicle: InsertTechnicianVehicle): Promise<TechnicianVehicle> {
    try {
      const [vehicle] = await db.insert(technicianVehicles).values(insertVehicle).returning();
      return vehicle;
    } catch (error) {
      console.error("Error creating technician vehicle:", error);
      throw error;
    }
  }
  
  async updateTechnicianVehicle(id: number, data: Partial<TechnicianVehicle>): Promise<TechnicianVehicle | undefined> {
    try {
      const [updatedVehicle] = await db
        .update(technicianVehicles)
        .set({...data, updatedAt: new Date()})
        .where(eq(technicianVehicles.id, id))
        .returning();
      return updatedVehicle || undefined;
    } catch (error) {
      console.error(`Error updating technician vehicle ${id}:`, error);
      return undefined;
    }
  }
  
  async deleteTechnicianVehicle(id: number): Promise<boolean> {
    try {
      // First check if there is any inventory in this vehicle
      const vehicleItems = await db
        .select()
        .from(vehicleInventory)
        .where(eq(vehicleInventory.vehicleId, id));
      
      if (vehicleItems.length > 0) {
        console.error(`Cannot delete vehicle ${id} because it contains inventory items`);
        return false;
      }
      
      const result = await db.delete(technicianVehicles).where(eq(technicianVehicles.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting technician vehicle ${id}:`, error);
      return false;
    }
  }
  
  /* Database implementation of getAllTechnicianVehicles is commented out to avoid duplication
  async getAllTechnicianVehicles(): Promise<TechnicianVehicle[]> {
    try {
      return await db.select().from(technicianVehicles);
    } catch (error) {
      console.error("Error retrieving all technician vehicles:", error);
      return [];
    }
  }
  */
  
  async getActiveTechnicianVehicles(): Promise<TechnicianVehicle[]> {
    try {
      return await db
        .select()
        .from(technicianVehicles)
        .where(eq(technicianVehicles.status, "active"));
    } catch (error) {
      console.error("Error retrieving active technician vehicles:", error);
      return [];
    }
  }
  
  async getTechnicianVehiclesWithFleetmaticsId(): Promise<TechnicianVehicle[]> {
    try {
      return await db
        .select()
        .from(technicianVehicles)
        .where(
          and(
            isNotNull(technicianVehicles.fleetmaticsVehicleId),
            ne(technicianVehicles.fleetmaticsVehicleId, "")
          )
        );
    } catch (error) {
      console.error("Error retrieving technician vehicles with Fleetmatics ID:", error);
      return [];
    }
  }
  
  async getTechnicianVehiclesByTechnicianId(technicianId: number): Promise<TechnicianVehicle[]> {
    try {
      return await db
        .select()
        .from(technicianVehicles)
        .where(eq(technicianVehicles.technicianId, technicianId));
    } catch (error) {
      console.error(`Error retrieving vehicles for technician ${technicianId}:`, error);
      return [];
    }
  }
  
  // Warehouse Inventory operations
  async getWarehouseInventory(id: number): Promise<WarehouseInventory | undefined> {
    try {
      const [inventory] = await db.select().from(warehouseInventory).where(eq(warehouseInventory.id, id));
      return inventory || undefined;
    } catch (error) {
      console.error(`Error retrieving warehouse inventory ${id}:`, error);
      return undefined;
    }
  }
  
  async createWarehouseInventory(insertInventory: InsertWarehouseInventory): Promise<WarehouseInventory> {
    try {
      const [inventory] = await db.insert(warehouseInventory).values({
        ...insertInventory,
        lastUpdated: new Date()
      }).returning();
      return inventory;
    } catch (error) {
      console.error("Error creating warehouse inventory:", error);
      throw error;
    }
  }
  
  async updateWarehouseInventory(id: number, data: Partial<WarehouseInventory>): Promise<WarehouseInventory | undefined> {
    try {
      const [updatedInventory] = await db
        .update(warehouseInventory)
        .set({
          ...data,
          lastUpdated: new Date()
        })
        .where(eq(warehouseInventory.id, id))
        .returning();
      return updatedInventory || undefined;
    } catch (error) {
      console.error(`Error updating warehouse inventory ${id}:`, error);
      return undefined;
    }
  }
  
  async getWarehouseInventoryByWarehouseId(warehouseId: number): Promise<WarehouseInventory[]> {
    try {
      return await db
        .select()
        .from(warehouseInventory)
        .where(eq(warehouseInventory.warehouseId, warehouseId));
    } catch (error) {
      console.error(`Error retrieving inventory for warehouse ${warehouseId}:`, error);
      return [];
    }
  }
  
  async getWarehouseInventoryByItemId(itemId: number): Promise<WarehouseInventory[]> {
    try {
      return await db
        .select()
        .from(warehouseInventory)
        .where(eq(warehouseInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error(`Error retrieving warehouse inventory for item ${itemId}:`, error);
      return [];
    }
  }
  
  async getLowStockWarehouseInventory(): Promise<WarehouseInventory[]> {
    try {
      // Using raw SQL for more specific filtering
      const result = await db.execute(sql`
        SELECT wi.*
        FROM warehouse_inventory wi
        WHERE wi.quantity < wi.minimum_stock_level
      `);
      
      if (!result.rows) {
        return [];
      }
      
      return result.rows as WarehouseInventory[];
    } catch (error) {
      console.error("Error retrieving low stock warehouse inventory:", error);
      return [];
    }
  }
  
  // Vehicle Inventory operations
  async getVehicleInventory(id: number): Promise<VehicleInventory | undefined> {
    try {
      const [inventory] = await db.select().from(vehicleInventory).where(eq(vehicleInventory.id, id));
      return inventory || undefined;
    } catch (error) {
      console.error(`Error retrieving vehicle inventory ${id}:`, error);
      return undefined;
    }
  }
  
  async createVehicleInventory(insertInventory: InsertVehicleInventory): Promise<VehicleInventory> {
    try {
      const [inventory] = await db.insert(vehicleInventory).values({
        ...insertInventory,
        lastUpdated: new Date()
      }).returning();
      return inventory;
    } catch (error) {
      console.error("Error creating vehicle inventory:", error);
      throw error;
    }
  }
  
  async updateVehicleInventory(id: number, data: Partial<VehicleInventory>): Promise<VehicleInventory | undefined> {
    try {
      const [updatedInventory] = await db
        .update(vehicleInventory)
        .set({
          ...data,
          lastUpdated: new Date()
        })
        .where(eq(vehicleInventory.id, id))
        .returning();
      return updatedInventory || undefined;
    } catch (error) {
      console.error(`Error updating vehicle inventory ${id}:`, error);
      return undefined;
    }
  }
  
  async getVehicleInventoryByVehicleId(vehicleId: number): Promise<VehicleInventory[]> {
    try {
      return await db
        .select()
        .from(vehicleInventory)
        .where(eq(vehicleInventory.vehicleId, vehicleId));
    } catch (error) {
      console.error(`Error retrieving inventory for vehicle ${vehicleId}:`, error);
      return [];
    }
  }
  
  async getVehicleInventoryByItemId(itemId: number): Promise<VehicleInventory[]> {
    try {
      return await db
        .select()
        .from(vehicleInventory)
        .where(eq(vehicleInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error(`Error retrieving vehicle inventory for item ${itemId}:`, error);
      return [];
    }
  }
  
  async getLowStockVehicleInventory(): Promise<VehicleInventory[]> {
    try {
      // Using raw SQL for more specific filtering
      const result = await db.execute(sql`
        SELECT vi.*
        FROM vehicle_inventory vi
        WHERE vi.quantity < vi.target_stock_level
      `);
      
      if (!result.rows) {
        return [];
      }
      
      return result.rows as VehicleInventory[];
    } catch (error) {
      console.error("Error retrieving low stock vehicle inventory:", error);
      return [];
    }
  }
  
  // Inventory Transfer operations
  async getInventoryTransfer(id: number): Promise<InventoryTransfer | undefined> {
    try {
      const [transfer] = await db.select().from(inventoryTransfers).where(eq(inventoryTransfers.id, id));
      return transfer || undefined;
    } catch (error) {
      console.error(`Error retrieving inventory transfer ${id}:`, error);
      return undefined;
    }
  }
  
  async createInventoryTransfer(insertTransfer: InsertInventoryTransfer): Promise<InventoryTransfer> {
    try {
      // Handle backward compatibility with initiatedByUserId
      const transferData = {
        ...insertTransfer,
        requestedByUserId: insertTransfer.requestedByUserId ?? 
                           (insertTransfer as any).initiatedByUserId ?? 1
      };
      
      // Remove any non-schema fields
      delete (transferData as any).initiatedByUserId;
      
      // Insert the transfer and return the created record
      const [transfer] = await db.insert(inventoryTransfers).values(transferData).returning();
      return transfer;
    } catch (error) {
      console.error("Error creating inventory transfer:", error);
      throw error;
    }
  }
  
  async updateInventoryTransfer(id: number, data: Partial<InventoryTransfer>): Promise<InventoryTransfer | undefined> {
    try {
      // If completing the transfer, set the completion date
      if (data.status === "completed" && !data.completedDate) {
        data.completedDate = new Date();
      }
      
      const [updatedTransfer] = await db
        .update(inventoryTransfers)
        .set(data)
        .where(eq(inventoryTransfers.id, id))
        .returning();
      
      if (updatedTransfer && updatedTransfer.status === "completed") {
        // Get all transfer items
        const transferItems = await this.getInventoryTransferItemsByTransferId(id);
        
        // Update inventory in source and destination locations
        await this.processCompletedTransfer(updatedTransfer, transferItems);
      }
      
      return updatedTransfer || undefined;
    } catch (error) {
      console.error(`Error updating inventory transfer ${id}:`, error);
      return undefined;
    }
  }
  
  private async processCompletedTransfer(
    transfer: InventoryTransfer,
    transferItems: InventoryTransferItem[]
  ): Promise<void> {
    // Process each item in the transfer
    for (const item of transferItems) {
      // Only process items with actual quantities
      if (!item.actualQuantity) continue;
      
      const quantity = item.actualQuantity;
      const itemId = item.inventoryItemId;
      
      // Remove from source
      if (transfer.sourceLocationType === "warehouse") {
        // Find warehouse inventory
        const warehouseInventories = await this.getWarehouseInventoryByWarehouseIdAndItemId(
          transfer.sourceLocationId,
          itemId
        );
        
        if (warehouseInventories.length > 0) {
          const sourceInventory = warehouseInventories[0];
          // Update quantity (never go below 0)
          const newQuantity = Math.max(0, sourceInventory.quantity - quantity);
          await this.updateWarehouseInventory(sourceInventory.id, { quantity: newQuantity });
        }
      } else if (transfer.sourceLocationType === "vehicle") {
        // Find vehicle inventory
        const vehicleInventories = await this.getVehicleInventoryByVehicleIdAndItemId(
          transfer.sourceLocationId,
          itemId
        );
        
        if (vehicleInventories.length > 0) {
          const sourceInventory = vehicleInventories[0];
          // Update quantity (never go below 0)
          const newQuantity = Math.max(0, sourceInventory.quantity - quantity);
          await this.updateVehicleInventory(sourceInventory.id, { quantity: newQuantity });
        }
      }
      
      // Add to destination
      if (transfer.destinationLocationType === "warehouse") {
        // Find or create warehouse inventory
        let warehouseInventories = await this.getWarehouseInventoryByWarehouseIdAndItemId(
          transfer.destinationLocationId,
          itemId
        );
        
        if (warehouseInventories.length > 0) {
          const destInventory = warehouseInventories[0];
          // Update quantity
          const newQuantity = destInventory.quantity + quantity;
          await this.updateWarehouseInventory(destInventory.id, { quantity: newQuantity });
        } else {
          // Create new inventory entry
          await this.createWarehouseInventory({
            warehouseId: transfer.destinationLocationId,
            inventoryItemId: itemId,
            quantity: quantity,
            location: "Transfer receiving area"
          });
        }
      } else if (transfer.destinationLocationType === "vehicle") {
        // Find or create vehicle inventory
        let vehicleInventories = await this.getVehicleInventoryByVehicleIdAndItemId(
          transfer.destinationLocationId,
          itemId
        );
        
        if (vehicleInventories.length > 0) {
          const destInventory = vehicleInventories[0];
          // Update quantity
          const newQuantity = destInventory.quantity + quantity;
          await this.updateVehicleInventory(destInventory.id, { quantity: newQuantity });
        } else {
          // Create new inventory entry
          await this.createVehicleInventory({
            vehicleId: transfer.destinationLocationId,
            inventoryItemId: itemId,
            quantity: quantity,
            location: "Transfer receiving"
          });
        }
      }
      // For client destination, we don't track inventory
    }
  }
  
  async getAllInventoryTransfers(): Promise<InventoryTransfer[]> {
    try {
      const transfers = await db.select().from(inventoryTransfers);
      return transfers;
    } catch (error) {
      console.error("Error retrieving all inventory transfers:", error);
      return [];
    }
  }
  
  async getInventoryTransfersByStatus(status: TransferStatus): Promise<InventoryTransfer[]> {
    try {
      const transfers = await db
        .select()
        .from(inventoryTransfers)
        .where(eq(inventoryTransfers.status, status));
      return transfers;
    } catch (error) {
      console.error(`Error retrieving inventory transfers with status ${status}:`, error);
      return [];
    }
  }
  
  async getInventoryTransfersByType(type: TransferType): Promise<InventoryTransfer[]> {
    try {
      const transfers = await db
        .select()
        .from(inventoryTransfers)
        .where(eq(inventoryTransfers.transferType, type));
      return transfers;
    } catch (error) {
      console.error(`Error retrieving inventory transfers with type ${type}:`, error);
      return [];
    }
  }
  
  async getInventoryTransfersByDate(startDate: Date, endDate: Date): Promise<InventoryTransfer[]> {
    try {
      const transfers = await db
        .select()
        .from(inventoryTransfers)
        .where(
          and(
            gte(inventoryTransfers.requestDate, startDate),
            lte(inventoryTransfers.requestDate, endDate)
          )
        );
      return transfers;
    } catch (error) {
      console.error(`Error retrieving inventory transfers by date range:`, error);
      return [];
    }
  }
  
  // Inventory Transfer Item operations
  async getInventoryTransferItem(id: number): Promise<InventoryTransferItem | undefined> {
    try {
      const [item] = await db.select().from(inventoryTransferItems).where(eq(inventoryTransferItems.id, id));
      return item || undefined;
    } catch (error) {
      console.error(`Error retrieving inventory transfer item ${id}:`, error);
      return undefined;
    }
  }
  
  async createInventoryTransferItem(insertItem: InsertInventoryTransferItem): Promise<InventoryTransferItem> {
    try {
      const [item] = await db.insert(inventoryTransferItems).values(insertItem).returning();
      return item;
    } catch (error) {
      console.error("Error creating inventory transfer item:", error);
      throw error;
    }
  }
  
  async updateInventoryTransferItem(id: number, data: Partial<InventoryTransferItem>): Promise<InventoryTransferItem | undefined> {
    try {
      const [updatedItem] = await db
        .update(inventoryTransferItems)
        .set(data)
        .where(eq(inventoryTransferItems.id, id))
        .returning();
      return updatedItem || undefined;
    } catch (error) {
      console.error(`Error updating inventory transfer item ${id}:`, error);
      return undefined;
    }
  }
  
  async getInventoryTransferItemsByTransferId(transferId: number): Promise<InventoryTransferItem[]> {
    try {
      const items = await db
        .select()
        .from(inventoryTransferItems)
        .where(eq(inventoryTransferItems.transferId, transferId));
      return items;
    } catch (error) {
      console.error(`Error retrieving items for transfer ${transferId}:`, error);
      return [];
    }
  }
  
  // Helper methods for inventory operations
  async getWarehouseInventoryByWarehouseIdAndItemId(warehouseId: number, itemId: number): Promise<WarehouseInventory[]> {
    try {
      const inventory = await db
        .select()
        .from(warehouseInventory)
        .where(
          and(
            eq(warehouseInventory.warehouseId, warehouseId),
            eq(warehouseInventory.inventoryItemId, itemId)
          )
        );
      return inventory;
    } catch (error) {
      console.error(`Error retrieving warehouse inventory for warehouse ${warehouseId} and item ${itemId}:`, error);
      return [];
    }
  }
  
  async getVehicleInventoryByVehicleIdAndItemId(vehicleId: number, itemId: number): Promise<VehicleInventory[]> {
    try {
      const inventory = await db
        .select()
        .from(vehicleInventory)
        .where(
          and(
            eq(vehicleInventory.vehicleId, vehicleId),
            eq(vehicleInventory.inventoryItemId, itemId)
          )
        );
      return inventory;
    } catch (error) {
      console.error(`Error retrieving vehicle inventory for vehicle ${vehicleId} and item ${itemId}:`, error);
      return [];
    }
  }
  
  // Barcode operations
  async getBarcode(id: number): Promise<Barcode | undefined> {
    try {
      const [barcode] = await db.select().from(barcodes).where(eq(barcodes.id, id));
      return barcode || undefined;
    } catch (error) {
      console.error(`Error retrieving barcode ${id}:`, error);
      return undefined;
    }
  }
  
  async getBarcodeByValue(value: string): Promise<Barcode | undefined> {
    try {
      const [barcode] = await db.select().from(barcodes).where(eq(barcodes.barcodeValue, value));
      return barcode || undefined;
    } catch (error) {
      console.error(`Error retrieving barcode with value ${value}:`, error);
      return undefined;
    }
  }
  
  async createBarcode(insertBarcode: InsertBarcode): Promise<Barcode> {
    try {
      const [barcode] = await db.insert(barcodes).values(insertBarcode).returning();
      return barcode;
    } catch (error) {
      console.error("Error creating barcode:", error);
      throw error;
    }
  }
  
  async updateBarcode(id: number, data: Partial<Barcode>): Promise<Barcode | undefined> {
    try {
      const [updatedBarcode] = await db
        .update(barcodes)
        .set(data)
        .where(eq(barcodes.id, id))
        .returning();
      return updatedBarcode || undefined;
    } catch (error) {
      console.error(`Error updating barcode ${id}:`, error);
      return undefined;
    }
  }
  
  async getAllBarcodes(): Promise<Barcode[]> {
    try {
      const allBarcodes = await db.select().from(barcodes);
      return allBarcodes;
    } catch (error) {
      console.error("Error retrieving all barcodes:", error);
      return [];
    }
  }
  
  async getBarcodesByType(type: BarcodeType): Promise<Barcode[]> {
    try {
      const typedBarcodes = await db
        .select()
        .from(barcodes)
        .where(eq(barcodes.barcodeType, type));
      return typedBarcodes;
    } catch (error) {
      console.error(`Error retrieving barcodes with type ${type}:`, error);
      return [];
    }
  }
  
  async getBarcodesByItemType(itemType: string): Promise<Barcode[]> {
    try {
      const itemTypeBarcodes = await db
        .select()
        .from(barcodes)
        .where(eq(barcodes.itemType, itemType));
      return itemTypeBarcodes;
    } catch (error) {
      console.error(`Error retrieving barcodes with item type ${itemType}:`, error);
      return [];
    }
  }
  
  // Barcode Scan History operations
  async getBarcodeScan(id: number): Promise<BarcodeScanHistory | undefined> {
    try {
      const [scan] = await db.select().from(barcodeScanHistory).where(eq(barcodeScanHistory.id, id));
      return scan || undefined;
    } catch (error) {
      console.error(`Error retrieving barcode scan ${id}:`, error);
      return undefined;
    }
  }
  
  async createBarcodeScan(insertScan: InsertBarcodeScanHistory): Promise<BarcodeScanHistory> {
    try {
      const [scan] = await db.insert(barcodeScanHistory).values({
        ...insertScan,
        scanTime: new Date()
      }).returning();
      return scan;
    } catch (error) {
      console.error("Error creating barcode scan:", error);
      throw error;
    }
  }
  
  async getBarcodeScansByBarcodeId(barcodeId: number): Promise<BarcodeScanHistory[]> {
    try {
      const barcodeScans = await db
        .select()
        .from(barcodeScanHistory)
        .where(eq(barcodeScanHistory.barcodeId, barcodeId))
        .orderBy(desc(barcodeScanHistory.scanTime));
      return barcodeScans;
    } catch (error) {
      console.error(`Error retrieving scans for barcode ${barcodeId}:`, error);
      return [];
    }
  }
  
  async getBarcodeScansByUserId(userId: number): Promise<BarcodeScanHistory[]> {
    try {
      const userScans = await db
        .select()
        .from(barcodeScanHistory)
        .where(eq(barcodeScanHistory.scannedByUserId, userId))
        .orderBy(desc(barcodeScanHistory.scanTime));
      return userScans;
    } catch (error) {
      console.error(`Error retrieving scans by user ${userId}:`, error);
      return [];
    }
  }
  
  async getBarcodeScansByDate(startDate: Date, endDate: Date): Promise<BarcodeScanHistory[]> {
    try {
      const dateRangeScans = await db
        .select()
        .from(barcodeScanHistory)
        .where(
          and(
            gte(barcodeScanHistory.scanTime, startDate),
            lte(barcodeScanHistory.scanTime, endDate)
          )
        )
        .orderBy(desc(barcodeScanHistory.scanTime));
      return dateRangeScans;
    } catch (error) {
      console.error(`Error retrieving barcode scans by date range:`, error);
      return [];
    }
  }
  
  // Inventory Adjustment operations
  async getInventoryAdjustment(id: number): Promise<InventoryAdjustment | undefined> {
    try {
      const [adjustment] = await db.select().from(inventoryAdjustments).where(eq(inventoryAdjustments.id, id));
      return adjustment || undefined;
    } catch (error) {
      console.error(`Error retrieving inventory adjustment ${id}:`, error);
      return undefined;
    }
  }
  
  async createInventoryAdjustment(insertAdjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment> {
    try {
      // Ensure the inventory is updated first
      await this.updateInventoryForAdjustment(
        insertAdjustment.inventoryItemId,
        insertAdjustment.locationType,
        insertAdjustment.locationId,
        insertAdjustment.quantityChange
      );
      
      // Then record the adjustment
      const [adjustment] = await db.insert(inventoryAdjustments).values({
        ...insertAdjustment,
        adjustmentDate: new Date()
      }).returning();
      
      return adjustment;
    } catch (error) {
      console.error("Error creating inventory adjustment:", error);
      throw error;
    }
  }
  
  private async updateInventoryForAdjustment(
    itemId: number, 
    locationType: string, 
    locationId: number, 
    quantityChange: number
  ): Promise<boolean> {
    try {
      if (locationType === "warehouse") {
        // Find warehouse inventory
        const warehouseInventories = await this.getWarehouseInventoryByWarehouseIdAndItemId(locationId, itemId);
        
        if (warehouseInventories.length > 0) {
          const inventory = warehouseInventories[0];
          // Update quantity (never go below 0)
          const newQuantity = Math.max(0, inventory.quantity + quantityChange);
          await this.updateWarehouseInventory(inventory.id, { quantity: newQuantity });
          return true;
        } else if (quantityChange > 0) {
          // Create new inventory entry for positive adjustments
          await this.createWarehouseInventory({
            warehouseId: locationId,
            inventoryItemId: itemId,
            quantity: quantityChange,
            location: "Adjustment addition"
          });
          return true;
        }
      } else if (locationType === "vehicle") {
        // Find vehicle inventory
        const vehicleInventories = await this.getVehicleInventoryByVehicleIdAndItemId(locationId, itemId);
        
        if (vehicleInventories.length > 0) {
          const inventory = vehicleInventories[0];
          // Update quantity (never go below 0)
          const newQuantity = Math.max(0, inventory.quantity + quantityChange);
          await this.updateVehicleInventory(inventory.id, { quantity: newQuantity });
          return true;
        } else if (quantityChange > 0) {
          // Create new inventory entry for positive adjustments
          await this.createVehicleInventory({
            vehicleId: locationId,
            inventoryItemId: itemId,
            quantity: quantityChange,
            location: "Adjustment addition"
          });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error updating inventory for adjustment:`, error);
      return false;
    }
  }
  
  async getAllInventoryAdjustments(): Promise<InventoryAdjustment[]> {
    try {
      const allAdjustments = await db
        .select()
        .from(inventoryAdjustments)
        .orderBy(desc(inventoryAdjustments.adjustmentDate));
      return allAdjustments;
    } catch (error) {
      console.error("Error retrieving all inventory adjustments:", error);
      return [];
    }
  }
  
  async getInventoryAdjustmentsByItemId(itemId: number): Promise<InventoryAdjustment[]> {
    try {
      const itemAdjustments = await db
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.inventoryItemId, itemId))
        .orderBy(desc(inventoryAdjustments.adjustmentDate));
      return itemAdjustments;
    } catch (error) {
      console.error(`Error retrieving adjustments for item ${itemId}:`, error);
      return [];
    }
  }
  
  async getInventoryAdjustmentsByLocation(locationType: string, locationId: number): Promise<InventoryAdjustment[]> {
    try {
      const locationAdjustments = await db
        .select()
        .from(inventoryAdjustments)
        .where(
          and(
            eq(inventoryAdjustments.locationType, locationType),
            eq(inventoryAdjustments.locationId, locationId)
          )
        )
        .orderBy(desc(inventoryAdjustments.adjustmentDate));
      return locationAdjustments;
    } catch (error) {
      console.error(`Error retrieving adjustments for location type ${locationType} id ${locationId}:`, error);
      return [];
    }
  }
  
  async getInventoryAdjustmentsByDate(startDate: Date, endDate: Date): Promise<InventoryAdjustment[]> {
    try {
      const dateRangeAdjustments = await db
        .select()
        .from(inventoryAdjustments)
        .where(
          and(
            gte(inventoryAdjustments.adjustmentDate, startDate),
            lte(inventoryAdjustments.adjustmentDate, endDate)
          )
        )
        .orderBy(desc(inventoryAdjustments.adjustmentDate));
      return dateRangeAdjustments;
    } catch (error) {
      console.error(`Error retrieving inventory adjustments by date range:`, error);
      return [];
    }
  }

  // Sample inventory data initialization
  async initSampleInventoryData() {
    // Create sample warehouses
    await this.createWarehouse({
      name: "Main Warehouse",
      address: "123 Storage Blvd",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      latitude: 33.4484,
      longitude: -112.0740,
      description: "Primary storage facility",
      phoneNumber: "602-555-7890"
    });
    
    await this.createWarehouse({
      name: "East Valley Warehouse",
      address: "456 Inventory Lane",
      city: "Scottsdale",
      state: "AZ",
      zipCode: "85251",
      latitude: 33.4942,
      longitude: -111.9261,
      description: "Secondary storage facility",
      phoneNumber: "480-555-1234"
    });
    
    // Create sample vehicles
    await this.createTechnicianVehicle({
      name: "Service Truck #1",
      type: "truck",
      technicianId: 1,
      status: "active",
      make: "Ford",
      model: "F-150",
      year: 2021,
      licensePlate: "ABC123",
      vin: "1FTFW1ET2DFA52087"
    });
    
    await this.createTechnicianVehicle({
      name: "Service Truck #2",
      type: "truck",
      technicianId: 2,
      status: "active",
      make: "Chevrolet",
      model: "Silverado",
      year: 2022,
      licensePlate: "XYZ789",
      vin: "3GCUKREC8JG176439"
    });
    
    // Create sample inventory items
    await this.createInventoryItem({
      name: "Liquid Chlorine",
      category: "chemicals",
      unit: "gallon",
      costPerUnit: 4.99,
      description: "Sodium hypochlorite solution for pool sanitation",
      minStockLevel: 20,
      maxStockLevel: 100,
      reorderPoint: 30,
      reorderQuantity: 50
    });
    
    await this.createInventoryItem({
      name: "Muriatic Acid",
      category: "chemicals",
      unit: "gallon",
      costPerUnit: 6.99,
      description: "pH decreaser for pool water",
      minStockLevel: 15,
      maxStockLevel: 60,
      reorderPoint: 20,
      reorderQuantity: 30
    });
    
    await this.createInventoryItem({
      name: "Cartridge Filter",
      category: "equipment",
      unit: "piece",
      costPerUnit: 69.99,
      description: "Standard size pool filter cartridge",
      minStockLevel: 5,
      maxStockLevel: 20,
      reorderPoint: 8,
      reorderQuantity: 12
    });
    
    await this.createInventoryItem({
      name: "Variable Speed Pump",
      category: "equipment",
      unit: "piece",
      costPerUnit: 799.99,
      description: "Energy efficient variable speed pool pump",
      minStockLevel: 2,
      maxStockLevel: 8,
      reorderPoint: 3,
      reorderQuantity: 5
    });
    
    await this.createInventoryItem({
      name: "Leaf Skimmer Net",
      category: "tools",
      unit: "piece",
      costPerUnit: 24.99,
      description: "Heavy duty leaf skimmer with telescoping pole",
      minStockLevel: 10,
      maxStockLevel: 30,
      reorderPoint: 12,
      reorderQuantity: 20
    });
    
    // Add inventory to warehouses
    await this.createWarehouseInventory({
      warehouseId: 1,
      inventoryItemId: 1,  // Chlorine
      quantity: 45,
      location: "Chemical storage area A1",
      minimumStockLevel: 20,
      maximumStockLevel: 100
    });
    
    await this.createWarehouseInventory({
      warehouseId: 1,
      inventoryItemId: 2,  // Muriatic acid
      quantity: 30,
      location: "Chemical storage area A2",
      minimumStockLevel: 15,
      maximumStockLevel: 60
    });
    
    await this.createWarehouseInventory({
      warehouseId: 1,
      inventoryItemId: 3,  // Filter
      quantity: 12,
      location: "Equipment shelf B3",
      minimumStockLevel: 5,
      maximumStockLevel: 20
    });
    
    await this.createWarehouseInventory({
      warehouseId: 2,
      inventoryItemId: 1,  // Chlorine
      quantity: 25,
      location: "Chemical storage area C1",
      minimumStockLevel: 15,
      maximumStockLevel: 60
    });
    
    await this.createWarehouseInventory({
      warehouseId: 2,
      inventoryItemId: 4,  // Pump
      quantity: 4,
      location: "Equipment area D2",
      minimumStockLevel: 2,
      maximumStockLevel: 8
    });
    
    // Add inventory to vehicles
    await this.createVehicleInventory({
      vehicleId: 1,
      inventoryItemId: 1,  // Chlorine
      quantity: 8,
      location: "Rear storage compartment",
      targetStockLevel: 10
    });
    
    await this.createVehicleInventory({
      vehicleId: 1,
      inventoryItemId: 2,  // Muriatic acid
      quantity: 5,
      location: "Rear storage compartment",
      targetStockLevel: 6
    });
    
    await this.createVehicleInventory({
      vehicleId: 1,
      inventoryItemId: 5,  // Leaf net
      quantity: 3,
      location: "Side compartment",
      targetStockLevel: 4
    });
    
    await this.createVehicleInventory({
      vehicleId: 2,
      inventoryItemId: 1,  // Chlorine
      quantity: 10,
      location: "Rear storage compartment",
      targetStockLevel: 10
    });
    
    await this.createVehicleInventory({
      vehicleId: 2,
      inventoryItemId: 3,  // Filter
      quantity: 2,
      location: "Side compartment",
      targetStockLevel: 3
    });
    
    // Create sample barcodes
    await this.createBarcode({
      barcodeValue: "CHL-12345",
      barcodeType: "qr", 
      itemType: "inventory",
      itemId: 1  // Chlorine
    });
    
    await this.createBarcode({
      barcodeValue: "MUR-54321",
      barcodeType: "qr",
      itemType: "inventory", 
      itemId: 2  // Muriatic acid
    });
    
    await this.createBarcode({
      barcodeValue: "FLT-98765",
      barcodeType: "qr",
      itemType: "inventory",
      itemId: 3  // Filter
    });
    
    // Create a sample inventory transfer
    const transfer = await this.createInventoryTransfer({
      transferType: "warehouse_to_vehicle",
      sourceLocationType: "warehouse",
      sourceLocationId: 1,
      destinationLocationType: "vehicle",
      destinationLocationId: 1,
      initiatedByUserId: 1,
      scheduledDate: new Date().toISOString(),
      status: "pending"
    });
    
    await this.createInventoryTransferItem({
      transferId: 1,
      inventoryItemId: 1,  // Chlorine
      requestedQuantity: 5,
      notes: "Weekly restock"
    });
    
    await this.createInventoryTransferItem({
      transferId: 1,
      inventoryItemId: 2,  // Muriatic acid
      requestedQuantity: 3,
      notes: "Weekly restock"
    });
    
    // Add a completed transfer as example
    const completedTransfer = await this.createInventoryTransfer({
      transferType: "warehouse_to_warehouse",
      sourceLocationType: "warehouse",
      sourceLocationId: 1,
      destinationLocationType: "warehouse",
      destinationLocationId: 2,
      initiatedByUserId: 1,
      status: "completed",
      scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      completionDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
      completedByUserId: 1
    });
    
    await this.createInventoryTransferItem({
      transferId: 2,
      inventoryItemId: 3,  // Filter
      requestedQuantity: 5,
      approvedQuantity: 5,
      actualQuantity: 5
    });
    
    // Create some inventory adjustments
    await this.createInventoryAdjustment({
      reason: "damaged",
      inventoryItemId: 1,  // Chlorine
      locationType: "warehouse",
      locationId: 1,
      quantityChange: -2,
      performedByUserId: 1,
      notes: "Container damaged during handling"
    });
    
    await this.createInventoryAdjustment({
      reason: "count_correction",
      inventoryItemId: 3,  // Filter
      locationType: "warehouse",
      locationId: 1,
      quantityChange: 1,
      performedByUserId: 1,
      notes: "Inventory count correction after audit"
    });
    
    // Create some barcode scans
    await this.createBarcodeScan({
      barcodeId: 1,
      scannedByUserId: 1,
      actionType: "inventory_check",
      location: "Warehouse 1, Bay A"
    });
    
    await this.createBarcodeScan({
      barcodeId: 2,
      scannedByUserId: 2,
      actionType: "check_out",
      location: "Warehouse 1"
    });
  }

  // Inventory Item operations
  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
    const id = this.inventoryItemId++;
    // Ensure required fields have proper default values
    const item: InventoryItem = { 
      ...insertItem, 
      id,
      description: insertItem.description ?? null,
      notes: insertItem.notes ?? null,
      imageUrl: insertItem.imageUrl ?? null,
      isActive: insertItem.isActive !== undefined ? insertItem.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
      minStockLevel: insertItem.minStockLevel ?? null,
      maxStockLevel: insertItem.maxStockLevel ?? null,
      reorderPoint: insertItem.reorderPoint ?? null,
      reorderQuantity: insertItem.reorderQuantity ?? null,
      lastOrderDate: insertItem.lastOrderDate ?? null
    };
    this.inventoryItems.set(id, item);
    return item;
  }

  async updateInventoryItem(id: number, data: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const item = await this.getInventoryItem(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...data, updatedAt: new Date() };
    this.inventoryItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const item = await this.getInventoryItem(id);
    if (!item) return false;
    
    return this.inventoryItems.delete(id);
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    try {
      return await db.select().from(inventoryItems);
    } catch (error) {
      console.error("Error retrieving all inventory items:", error);
      return [];
    }
  }

  async getInventoryItemsByCategory(category: string): Promise<InventoryItem[]> {
    try {
      return await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.category, category));
    } catch (error) {
      console.error(`Error retrieving inventory items for category ${category}:`, error);
      return [];
    }
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    // Get all items with warehouse and vehicle inventory
    const allItems = await this.getAllInventoryItems();
    const results: InventoryItem[] = [];
    
    for (const item of allItems) {
      // Get warehouse inventory for this item
      const warehouseInventories = await this.getWarehouseInventoryByItemId(item.id);
      const vehicleInventories = await this.getVehicleInventoryByItemId(item.id);
      
      // Calculate total quantity across all warehouses and vehicles
      const totalWarehouseQuantity = warehouseInventories.reduce((sum, inv) => sum + inv.quantity, 0);
      const totalVehicleQuantity = vehicleInventories.reduce((sum, inv) => sum + inv.quantity, 0);
      const totalQuantity = totalWarehouseQuantity + totalVehicleQuantity;
      
      // If item has a reorder point and total quantity is below that, add to results
      if (item.reorderPoint !== null && totalQuantity <= item.reorderPoint) {
        results.push(item);
      }
    }
    
    return results;
  }

  // Warehouse operations
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    return this.warehouses.get(id);
  }

  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    const id = this.warehouseId++;
    // Ensure required fields have proper default values
    const warehouse: Warehouse = { 
      ...insertWarehouse, 
      id,
      latitude: insertWarehouse.latitude ?? null,
      longitude: insertWarehouse.longitude ?? null,
      description: insertWarehouse.description ?? null,
      isActive: insertWarehouse.isActive !== undefined ? insertWarehouse.isActive : true,
      phoneNumber: insertWarehouse.phoneNumber ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.warehouses.set(id, warehouse);
    return warehouse;
  }

  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse | undefined> {
    const warehouse = await this.getWarehouse(id);
    if (!warehouse) return undefined;
    
    const updatedWarehouse = { ...warehouse, ...data, updatedAt: new Date() };
    this.warehouses.set(id, updatedWarehouse);
    return updatedWarehouse;
  }

  async deleteWarehouse(id: number): Promise<boolean> {
    const warehouse = await this.getWarehouse(id);
    if (!warehouse) return false;
    
    // Delete all warehouse inventory associated with this warehouse
    const inventories = await this.getWarehouseInventoryByWarehouseId(id);
    for (const inventory of inventories) {
      await this.deleteWarehouseInventory(inventory.id);
    }
    
    return this.warehouses.delete(id);
  }

  async getAllWarehouses(): Promise<Warehouse[]> {
    try {
      return await db.select().from(warehouses);
    } catch (error) {
      console.error("Error retrieving all warehouses:", error);
      return [];
    }
  }

  async getActiveWarehouses(): Promise<Warehouse[]> {
    try {
      return await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.isActive, true));
    } catch (error) {
      console.error("Error retrieving active warehouses:", error);
      return [];
    }
  }

  // Technician Vehicle operations
  async getTechnicianVehicle(id: number): Promise<TechnicianVehicle | undefined> {
    return this.technicianVehicles.get(id);
  }

  async getTechnicianVehiclesByTechnicianId(technicianId: number): Promise<TechnicianVehicle[]> {
    return Array.from(this.technicianVehicles.values()).filter(
      (vehicle) => vehicle.technicianId === technicianId
    );
  }

  async createTechnicianVehicle(insertVehicle: InsertTechnicianVehicle): Promise<TechnicianVehicle> {
    const id = this.technicianVehicleId++;
    // Ensure required fields have proper default values
    const vehicle: TechnicianVehicle = { 
      ...insertVehicle, 
      id,
      status: insertVehicle.status ?? "active",
      notes: insertVehicle.notes ?? null,
      model: insertVehicle.model ?? null,
      make: insertVehicle.make ?? null,
      year: insertVehicle.year ?? null,
      licensePlate: insertVehicle.licensePlate ?? null,
      vin: insertVehicle.vin ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.technicianVehicles.set(id, vehicle);
    return vehicle;
  }

  async updateTechnicianVehicle(id: number, data: Partial<TechnicianVehicle>): Promise<TechnicianVehicle | undefined> {
    const vehicle = await this.getTechnicianVehicle(id);
    if (!vehicle) return undefined;
    
    const updatedVehicle = { ...vehicle, ...data, updatedAt: new Date() };
    this.technicianVehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }

  async deleteTechnicianVehicle(id: number): Promise<boolean> {
    const vehicle = await this.getTechnicianVehicle(id);
    if (!vehicle) return false;
    
    // Delete all vehicle inventory associated with this vehicle
    const inventories = await this.getVehicleInventoryByVehicleId(id);
    for (const inventory of inventories) {
      await this.deleteVehicleInventory(inventory.id);
    }
    
    return this.technicianVehicles.delete(id);
  }

  async getAllTechnicianVehicles(): Promise<TechnicianVehicle[]> {
    try {
      return await db.select().from(technicianVehicles);
    } catch (error) {
      console.error("Error retrieving all technician vehicles:", error);
      return [];
    }
  }

  async getActiveTechnicianVehicles(): Promise<TechnicianVehicle[]> {
    try {
      return await db
        .select()
        .from(technicianVehicles)
        .where(eq(technicianVehicles.status, "active"));
    } catch (error) {
      console.error("Error retrieving active technician vehicles:", error);
      return [];
    }
  }

  // Warehouse Inventory operations
  async getWarehouseInventory(id: number): Promise<WarehouseInventory | undefined> {
    return this.warehouseInventory.get(id);
  }

  async createWarehouseInventory(insertInventory: InsertWarehouseInventory): Promise<WarehouseInventory> {
    const id = this.warehouseInventoryId++;
    // Ensure required fields have proper default values
    const inventory: WarehouseInventory = { 
      ...insertInventory, 
      id,
      notes: insertInventory.notes ?? null,
      location: insertInventory.location ?? null,
      quantity: insertInventory.quantity ?? 0,
      minimumStockLevel: insertInventory.minimumStockLevel ?? null,
      maximumStockLevel: insertInventory.maximumStockLevel ?? null,
      lastUpdated: new Date()
    };
    this.warehouseInventory.set(id, inventory);
    
    // Update the inventory item's last updated date
    const item = await this.getInventoryItem(insertInventory.inventoryItemId);
    if (item) {
      await this.updateInventoryItem(item.id, { updatedAt: new Date() });
    }
    
    return inventory;
  }

  async updateWarehouseInventory(id: number, data: Partial<WarehouseInventory>): Promise<WarehouseInventory | undefined> {
    const inventory = await this.getWarehouseInventory(id);
    if (!inventory) return undefined;
    
    const updatedInventory = { ...inventory, ...data, lastUpdated: new Date() };
    this.warehouseInventory.set(id, updatedInventory);
    
    // Update the inventory item's last updated date
    const item = await this.getInventoryItem(inventory.inventoryItemId);
    if (item) {
      await this.updateInventoryItem(item.id, { updatedAt: new Date() });
    }
    
    return updatedInventory;
  }

  async deleteWarehouseInventory(id: number): Promise<boolean> {
    const inventory = await this.getWarehouseInventory(id);
    if (!inventory) return false;
    
    return this.warehouseInventory.delete(id);
  }

  async getWarehouseInventoryByWarehouseId(warehouseId: number): Promise<WarehouseInventory[]> {
    try {
      return await db
        .select()
        .from(warehouseInventory)
        .where(eq(warehouseInventory.warehouseId, warehouseId));
    } catch (error) {
      console.error("Error retrieving warehouse inventory by warehouse ID:", error);
      return [];
    }
  }

  async getWarehouseInventoryByItemId(itemId: number): Promise<WarehouseInventory[]> {
    try {
      return await db
        .select()
        .from(warehouseInventory)
        .where(eq(warehouseInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error("Error retrieving warehouse inventory by item ID:", error);
      return [];
    }
  }

  async getLowWarehouseInventory(): Promise<WarehouseInventory[]> {
    try {
      return await db
        .select()
        .from(warehouseInventory)
        .where(
          sql`${warehouseInventory.minimumStockLevel} IS NOT NULL AND ${warehouseInventory.quantity} <= ${warehouseInventory.minimumStockLevel}`
        );
    } catch (error) {
      console.error("Error retrieving low warehouse inventory:", error);
      return [];
    }
  }

  // Vehicle Inventory operations
  async getVehicleInventory(id: number): Promise<VehicleInventory | undefined> {
    try {
      const results = await db
        .select()
        .from(vehicleInventory)
        .where(eq(vehicleInventory.id, id));
      return results[0];
    } catch (error) {
      console.error("Error retrieving vehicle inventory:", error);
      return undefined;
    }
  }

  async createVehicleInventory(insertInventory: InsertVehicleInventory): Promise<VehicleInventory> {
    try {
      // Ensure required fields have proper default values
      const preparedInventory = {
        ...insertInventory,
        notes: insertInventory.notes ?? null,
        location: insertInventory.location ?? null,
        quantity: insertInventory.quantity ?? 0,
        targetStockLevel: insertInventory.targetStockLevel ?? null,
        lastUpdated: new Date()
      };
      
      const result = await db
        .insert(vehicleInventory)
        .values(preparedInventory)
        .returning();
      
      const createdInventory = result[0];
      
      // Update the inventory item's last updated date
      await db
        .update(inventoryItems)
        .set({ updatedAt: new Date() })
        .where(eq(inventoryItems.id, insertInventory.inventoryItemId));
      
      return createdInventory;
    } catch (error) {
      console.error("Error creating vehicle inventory:", error);
      throw error;
    }
  }

  async updateVehicleInventory(id: number, data: Partial<VehicleInventory>): Promise<VehicleInventory | undefined> {
    try {
      const inventory = await this.getVehicleInventory(id);
      if (!inventory) return undefined;
      
      // Make sure to include lastUpdated in the update
      const updateData = { ...data, lastUpdated: new Date() };
      
      const result = await db
        .update(vehicleInventory)
        .set(updateData)
        .where(eq(vehicleInventory.id, id))
        .returning();
      
      if (result.length === 0) return undefined;
      
      // Update the inventory item's last updated date
      await db
        .update(inventoryItems)
        .set({ updatedAt: new Date() })
        .where(eq(inventoryItems.id, inventory.inventoryItemId));
      
      return result[0];
    } catch (error) {
      console.error("Error updating vehicle inventory:", error);
      return undefined;
    }
  }

  async deleteVehicleInventory(id: number): Promise<boolean> {
    try {
      const inventory = await this.getVehicleInventory(id);
      if (!inventory) return false;
      
      const result = await db
        .delete(vehicleInventory)
        .where(eq(vehicleInventory.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting vehicle inventory:", error);
      return false;
    }
  }

  async getVehicleInventoryByVehicleId(vehicleId: number): Promise<VehicleInventory[]> {
    try {
      return await db
        .select()
        .from(vehicleInventory)
        .where(eq(vehicleInventory.vehicleId, vehicleId));
    } catch (error) {
      console.error("Error retrieving vehicle inventory by vehicle ID:", error);
      return [];
    }
  }

  async getVehicleInventoryByItemId(itemId: number): Promise<VehicleInventory[]> {
    try {
      return await db
        .select()
        .from(vehicleInventory)
        .where(eq(vehicleInventory.inventoryItemId, itemId));
    } catch (error) {
      console.error("Error retrieving vehicle inventory by item ID:", error);
      return [];
    }
  }

  async getLowVehicleInventory(): Promise<VehicleInventory[]> {
    try {
      return await db
        .select()
        .from(vehicleInventory)
        .where(
          and(
            isNotNull(vehicleInventory.targetStockLevel),
            lt(vehicleInventory.quantity, vehicleInventory.targetStockLevel)
          )
        );
    } catch (error) {
      console.error("Error retrieving low vehicle inventory:", error);
      return [];
    }
  }

  // Inventory Transfer operations
  async getInventoryTransfer(id: number): Promise<InventoryTransfer | undefined> {
    return this.inventoryTransfers.get(id);
  }

  async createInventoryTransfer(insertTransfer: InsertInventoryTransfer): Promise<InventoryTransfer> {
    const id = this.inventoryTransferId++;
    const transfer: InventoryTransfer = { 
      ...insertTransfer, 
      id,
      status: insertTransfer.status ?? "pending",
      notes: insertTransfer.notes ?? null,
      scheduledDate: insertTransfer.scheduledDate ?? null,
      completionDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedByUserId: null
    };
    this.inventoryTransfers.set(id, transfer);
    return transfer;
  }

  async updateInventoryTransfer(id: number, data: Partial<InventoryTransfer>): Promise<InventoryTransfer | undefined> {
    const transfer = await this.getInventoryTransfer(id);
    if (!transfer) return undefined;
    
    const updatedTransfer = { ...transfer, ...data, updatedAt: new Date() };
    this.inventoryTransfers.set(id, updatedTransfer);
    return updatedTransfer;
  }

  async getAllInventoryTransfers(): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values());
  }

  async getInventoryTransfersByStatus(status: TransferStatus): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.status === status
    );
  }

  async getInventoryTransfersByType(type: TransferType): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.transferType === type
    );
  }

  async getInventoryTransfersByUserId(userId: number): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values()).filter(
      (transfer) => transfer.initiatedByUserId === userId || transfer.completedByUserId === userId
    );
  }

  async getInventoryTransfersByDate(startDate: Date, endDate: Date): Promise<InventoryTransfer[]> {
    return Array.from(this.inventoryTransfers.values()).filter((transfer) => {
      const transferDate = transfer.completionDate 
        ? new Date(transfer.completionDate) 
        : transfer.scheduledDate 
          ? new Date(transfer.scheduledDate)
          : new Date(transfer.createdAt);
          
      return transferDate >= startDate && transferDate <= endDate;
    });
  }

  async completeInventoryTransfer(id: number, userId: number): Promise<InventoryTransfer | undefined> {
    const transfer = await this.getInventoryTransfer(id);
    if (!transfer || transfer.status !== "in_transit") return undefined;
    
    // Get all transfer items
    const transferItems = await this.getInventoryTransferItemsByTransferId(id);
    
    // Process the transfer based on the transfer type
    for (const item of transferItems) {
      if (!item.actualQuantity) continue; // Skip if no actual quantity
      
      const transferType = transfer.transferType;
      
      if (transferType === "warehouse_to_warehouse") {
        // Decrease quantity in source warehouse
        const sourceInventories = await this.getWarehouseInventoryByWarehouseId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (sourceInventory) {
          await this.updateWarehouseInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        
        // Increase quantity in destination warehouse
        const destInventories = await this.getWarehouseInventoryByWarehouseId(transfer.destinationLocationId);
        const destInventory = destInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (destInventory) {
          await this.updateWarehouseInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          // Create new inventory entry
          await this.createWarehouseInventory({
            warehouseId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      } else if (transferType === "warehouse_to_vehicle") {
        // Decrease quantity in source warehouse
        const sourceInventories = await this.getWarehouseInventoryByWarehouseId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (sourceInventory) {
          await this.updateWarehouseInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        
        // Increase quantity in destination vehicle
        const destInventories = await this.getVehicleInventoryByVehicleId(transfer.destinationLocationId);
        const destInventory = destInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (destInventory) {
          await this.updateVehicleInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          // Create new inventory entry
          await this.createVehicleInventory({
            vehicleId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      } else if (transferType === "vehicle_to_warehouse") {
        // Decrease quantity in source vehicle
        const sourceInventories = await this.getVehicleInventoryByVehicleId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (sourceInventory) {
          await this.updateVehicleInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        
        // Increase quantity in destination warehouse
        const destInventories = await this.getWarehouseInventoryByWarehouseId(transfer.destinationLocationId);
        const destInventory = destInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (destInventory) {
          await this.updateWarehouseInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          // Create new inventory entry
          await this.createWarehouseInventory({
            warehouseId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      } else if (transferType === "vehicle_to_vehicle") {
        // Decrease quantity in source vehicle
        const sourceInventories = await this.getVehicleInventoryByVehicleId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (sourceInventory) {
          await this.updateVehicleInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
        
        // Increase quantity in destination vehicle
        const destInventories = await this.getVehicleInventoryByVehicleId(transfer.destinationLocationId);
        const destInventory = destInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (destInventory) {
          await this.updateVehicleInventory(destInventory.id, {
            quantity: destInventory.quantity + item.actualQuantity
          });
        } else {
          // Create new inventory entry
          await this.createVehicleInventory({
            vehicleId: transfer.destinationLocationId,
            inventoryItemId: item.inventoryItemId,
            quantity: item.actualQuantity
          });
        }
      }
      // warehouse_to_client and vehicle_to_client don't require increasing destination inventory
      else if (transferType === "warehouse_to_client") {
        // Decrease quantity in source warehouse
        const sourceInventories = await this.getWarehouseInventoryByWarehouseId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (sourceInventory) {
          await this.updateWarehouseInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
      } else if (transferType === "vehicle_to_client") {
        // Decrease quantity in source vehicle
        const sourceInventories = await this.getVehicleInventoryByVehicleId(transfer.sourceLocationId);
        const sourceInventory = sourceInventories.find(inv => inv.inventoryItemId === item.inventoryItemId);
        
        if (sourceInventory) {
          await this.updateVehicleInventory(sourceInventory.id, {
            quantity: Math.max(0, sourceInventory.quantity - item.actualQuantity)
          });
        }
      }
    }
    
    // Update transfer status to completed
    const updatedTransfer = await this.updateInventoryTransfer(id, {
      status: "completed",
      completionDate: new Date().toISOString(),
      completedByUserId: userId
    });
    
    return updatedTransfer;
  }

  async cancelInventoryTransfer(id: number): Promise<InventoryTransfer | undefined> {
    const transfer = await this.getInventoryTransfer(id);
    if (!transfer || transfer.status === "completed") return undefined;
    
    const updatedTransfer = await this.updateInventoryTransfer(id, {
      status: "cancelled"
    });
    
    return updatedTransfer;
  }

  // Inventory Transfer Item operations
  async getInventoryTransferItem(id: number): Promise<InventoryTransferItem | undefined> {
    return this.inventoryTransferItems.get(id);
  }

  async createInventoryTransferItem(insertItem: InsertInventoryTransferItem): Promise<InventoryTransferItem> {
    const id = this.inventoryTransferItemId++;
    const item: InventoryTransferItem = { 
      ...insertItem, 
      id,
      notes: insertItem.notes ?? null,
      approvedQuantity: insertItem.approvedQuantity ?? null,
      actualQuantity: insertItem.actualQuantity ?? null
    };
    this.inventoryTransferItems.set(id, item);
    return item;
  }

  async updateInventoryTransferItem(id: number, data: Partial<InventoryTransferItem>): Promise<InventoryTransferItem | undefined> {
    const item = await this.getInventoryTransferItem(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...data };
    this.inventoryTransferItems.set(id, updatedItem);
    return updatedItem;
  }

  async getInventoryTransferItemsByTransferId(transferId: number): Promise<InventoryTransferItem[]> {
    return Array.from(this.inventoryTransferItems.values()).filter(
      (item) => item.transferId === transferId
    );
  }

  async getInventoryTransferItemsByItemId(itemId: number): Promise<InventoryTransferItem[]> {
    return Array.from(this.inventoryTransferItems.values()).filter(
      (item) => item.inventoryItemId === itemId
    );
  }

  // Barcode operations
  async getBarcode(id: number): Promise<Barcode | undefined> {
    return this.barcodes.get(id);
  }

  async getBarcodeByValue(barcodeValue: string): Promise<Barcode | undefined> {
    return Array.from(this.barcodes.values()).find(
      (barcode) => barcode.barcodeValue === barcodeValue
    );
  }

  async createBarcode(insertBarcode: InsertBarcode): Promise<Barcode> {
    const id = this.barcodeId++;
    const barcode: Barcode = { 
      ...insertBarcode, 
      id,
      isActive: true,
      createdAt: new Date()
    };
    this.barcodes.set(id, barcode);
    return barcode;
  }

  async updateBarcode(id: number, data: Partial<Barcode>): Promise<Barcode | undefined> {
    const barcode = await this.getBarcode(id);
    if (!barcode) return undefined;
    
    const updatedBarcode = { ...barcode, ...data };
    this.barcodes.set(id, updatedBarcode);
    return updatedBarcode;
  }

  async deleteBarcode(id: number): Promise<boolean> {
    const barcode = await this.getBarcode(id);
    if (!barcode) return false;
    
    return this.barcodes.delete(id);
  }

  async getActiveBarcodesForItem(itemType: string, itemId: number): Promise<Barcode[]> {
    return Array.from(this.barcodes.values()).filter(
      (barcode) => barcode.itemType === itemType && barcode.itemId === itemId && barcode.isActive
    );
  }

  // Barcode Scan History operations
  async createBarcodeScan(insertScan: InsertBarcodeScanHistory): Promise<BarcodeScanHistory> {
    const id = this.barcodeScanHistoryId++;
    const scan: BarcodeScanHistory = { 
      ...insertScan, 
      id,
      notes: insertScan.notes ?? null,
      location: insertScan.location ?? null,
      actionId: insertScan.actionId ?? null,
      scanTime: new Date()
    };
    this.barcodeScanHistory.set(id, scan);
    return scan;
  }

  async getBarcodeScanHistory(id: number): Promise<BarcodeScanHistory | undefined> {
    return this.barcodeScanHistory.get(id);
  }

  async getBarcodeScansByBarcodeId(barcodeId: number): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.barcodeId === barcodeId
    );
  }

  async getBarcodeScansByUserId(userId: number): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.scannedByUserId === userId
    );
  }

  async getBarcodeScansByActionType(actionType: string): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter(
      (scan) => scan.actionType === actionType
    );
  }

  async getBarcodeScansByDate(startDate: Date, endDate: Date): Promise<BarcodeScanHistory[]> {
    return Array.from(this.barcodeScanHistory.values()).filter((scan) => {
      const scanTime = new Date(scan.scanTime);
      return scanTime >= startDate && scanTime <= endDate;
    });
  }

  // Inventory Adjustment operations
  async getInventoryAdjustment(id: number): Promise<InventoryAdjustment | undefined> {
    return this.inventoryAdjustments.get(id);
  }

  async createInventoryAdjustment(insertAdjustment: InsertInventoryAdjustment): Promise<InventoryAdjustment> {
    const id = this.inventoryAdjustmentId++;
    const adjustment: InventoryAdjustment = { 
      ...insertAdjustment, 
      id,
      notes: insertAdjustment.notes ?? null,
      maintenanceId: insertAdjustment.maintenanceId ?? null,
      repairId: insertAdjustment.repairId ?? null,
      adjustmentDate: new Date()
    };
    this.inventoryAdjustments.set(id, adjustment);
    
    // Update inventory based on adjustment type
    const itemId = adjustment.inventoryItemId;
    const locationId = adjustment.locationId;
    const locationType = adjustment.locationType;
    const quantityChange = adjustment.quantityChange;
    
    if (locationType === "warehouse") {
      const warehouseInventories = await this.getWarehouseInventoryByWarehouseId(locationId);
      const warehouseInventory = warehouseInventories.find(inv => inv.inventoryItemId === itemId);
      
      if (warehouseInventory) {
        await this.updateWarehouseInventory(warehouseInventory.id, {
          quantity: Math.max(0, warehouseInventory.quantity + quantityChange)
        });
      } else if (quantityChange > 0) {
        // Only create a new inventory if the quantity change is positive
        await this.createWarehouseInventory({
          warehouseId: locationId,
          inventoryItemId: itemId,
          quantity: quantityChange
        });
      }
    } else if (locationType === "vehicle") {
      const vehicleInventories = await this.getVehicleInventoryByVehicleId(locationId);
      const vehicleInventory = vehicleInventories.find(inv => inv.inventoryItemId === itemId);
      
      if (vehicleInventory) {
        await this.updateVehicleInventory(vehicleInventory.id, {
          quantity: Math.max(0, vehicleInventory.quantity + quantityChange)
        });
      } else if (quantityChange > 0) {
        // Only create a new inventory if the quantity change is positive
        await this.createVehicleInventory({
          vehicleId: locationId,
          inventoryItemId: itemId,
          quantity: quantityChange
        });
      }
    }
    
    return adjustment;
  }

  async getInventoryAdjustmentsByItemId(itemId: number): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.inventoryItemId === itemId
    );
  }

  async getInventoryAdjustmentsByLocationId(locationType: string, locationId: number): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.locationType === locationType && adjustment.locationId === locationId
    );
  }

  async getInventoryAdjustmentsByUserId(userId: number): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.performedByUserId === userId
    );
  }

  async getInventoryAdjustmentsByReason(reason: string): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.reason === reason
    );
  }

  async getInventoryAdjustmentsByDate(startDate: Date, endDate: Date): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values()).filter((adjustment) => {
      const adjustmentDate = new Date(adjustment.adjustmentDate);
      return adjustmentDate >= startDate && adjustmentDate <= endDate;
    });
  }

  async getAllInventoryAdjustments(): Promise<InventoryAdjustment[]> {
    return Array.from(this.inventoryAdjustments.values());
  }
}

// Uncomment to use in-memory storage for testing
// export const storage = new MemStorage();

// Use database storage
export const storage = new DatabaseStorage();
