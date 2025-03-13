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
  return Array.from(this.inventoryItems.values());
}

async getInventoryItemsByCategory(category: string): Promise<InventoryItem[]> {
  return Array.from(this.inventoryItems.values()).filter(
    (item) => item.category === category
  );
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
  return Array.from(this.technicianVehicles.values());
}

async getActiveTechnicianVehicles(): Promise<TechnicianVehicle[]> {
  return Array.from(this.technicianVehicles.values()).filter(
    (vehicle) => vehicle.status === "active"
  );
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
  return Array.from(this.warehouseInventory.values()).filter(
    (inventory) => inventory.warehouseId === warehouseId
  );
}

async getWarehouseInventoryByItemId(itemId: number): Promise<WarehouseInventory[]> {
  return Array.from(this.warehouseInventory.values()).filter(
    (inventory) => inventory.inventoryItemId === itemId
  );
}

async getLowWarehouseInventory(): Promise<WarehouseInventory[]> {
  return Array.from(this.warehouseInventory.values()).filter(
    (inventory) => {
      if (inventory.minimumStockLevel === null) return false;
      return inventory.quantity <= inventory.minimumStockLevel;
    }
  );
}

// Vehicle Inventory operations
async getVehicleInventory(id: number): Promise<VehicleInventory | undefined> {
  return this.vehicleInventory.get(id);
}

async createVehicleInventory(insertInventory: InsertVehicleInventory): Promise<VehicleInventory> {
  const id = this.vehicleInventoryId++;
  // Ensure required fields have proper default values
  const inventory: VehicleInventory = { 
    ...insertInventory, 
    id,
    notes: insertInventory.notes ?? null,
    location: insertInventory.location ?? null,
    quantity: insertInventory.quantity ?? 0,
    targetStockLevel: insertInventory.targetStockLevel ?? null,
    lastUpdated: new Date()
  };
  this.vehicleInventory.set(id, inventory);
  
  // Update the inventory item's last updated date
  const item = await this.getInventoryItem(insertInventory.inventoryItemId);
  if (item) {
    await this.updateInventoryItem(item.id, { updatedAt: new Date() });
  }
  
  return inventory;
}

async updateVehicleInventory(id: number, data: Partial<VehicleInventory>): Promise<VehicleInventory | undefined> {
  const inventory = await this.getVehicleInventory(id);
  if (!inventory) return undefined;
  
  const updatedInventory = { ...inventory, ...data, lastUpdated: new Date() };
  this.vehicleInventory.set(id, updatedInventory);
  
  // Update the inventory item's last updated date
  const item = await this.getInventoryItem(inventory.inventoryItemId);
  if (item) {
    await this.updateInventoryItem(item.id, { updatedAt: new Date() });
  }
  
  return updatedInventory;
}

async deleteVehicleInventory(id: number): Promise<boolean> {
  const inventory = await this.getVehicleInventory(id);
  if (!inventory) return false;
  
  return this.vehicleInventory.delete(id);
}

async getVehicleInventoryByVehicleId(vehicleId: number): Promise<VehicleInventory[]> {
  return Array.from(this.vehicleInventory.values()).filter(
    (inventory) => inventory.vehicleId === vehicleId
  );
}

async getVehicleInventoryByItemId(itemId: number): Promise<VehicleInventory[]> {
  return Array.from(this.vehicleInventory.values()).filter(
    (inventory) => inventory.inventoryItemId === itemId
  );
}

async getLowVehicleInventory(): Promise<VehicleInventory[]> {
  return Array.from(this.vehicleInventory.values()).filter(
    (inventory) => {
      if (inventory.targetStockLevel === null) return false;
      return inventory.quantity < inventory.targetStockLevel;
    }
  );
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
    initiatedByUserId: insertTransfer.initiatedByUserId,
    completedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date()
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

// Sample inventory data initialization
initSampleInventoryData() {
  // Create sample warehouses
  const warehouse1 = this.createWarehouse({
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
  
  const warehouse2 = this.createWarehouse({
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
  const vehicle1 = this.createTechnicianVehicle({
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
  
  const vehicle2 = this.createTechnicianVehicle({
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
  const chlorine = this.createInventoryItem({
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
  
  const muriatic = this.createInventoryItem({
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
  
  const filter = this.createInventoryItem({
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
  
  const pump = this.createInventoryItem({
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
  
  const leafNet = this.createInventoryItem({
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
  this.createWarehouseInventory({
    warehouseId: 1,
    inventoryItemId: 1,  // Chlorine
    quantity: 45,
    location: "Chemical storage area A1",
    minimumStockLevel: 20,
    maximumStockLevel: 100
  });
  
  this.createWarehouseInventory({
    warehouseId: 1,
    inventoryItemId: 2,  // Muriatic acid
    quantity: 30,
    location: "Chemical storage area A2",
    minimumStockLevel: 15,
    maximumStockLevel: 60
  });
  
  this.createWarehouseInventory({
    warehouseId: 1,
    inventoryItemId: 3,  // Filter
    quantity: 12,
    location: "Equipment shelf B3",
    minimumStockLevel: 5,
    maximumStockLevel: 20
  });
  
  this.createWarehouseInventory({
    warehouseId: 2,
    inventoryItemId: 1,  // Chlorine
    quantity: 25,
    location: "Chemical storage area C1",
    minimumStockLevel: 15,
    maximumStockLevel: 60
  });
  
  this.createWarehouseInventory({
    warehouseId: 2,
    inventoryItemId: 4,  // Pump
    quantity: 4,
    location: "Equipment area D2",
    minimumStockLevel: 2,
    maximumStockLevel: 8
  });
  
  // Add inventory to vehicles
  this.createVehicleInventory({
    vehicleId: 1,
    inventoryItemId: 1,  // Chlorine
    quantity: 8,
    location: "Rear storage compartment",
    targetStockLevel: 10
  });
  
  this.createVehicleInventory({
    vehicleId: 1,
    inventoryItemId: 2,  // Muriatic acid
    quantity: 5,
    location: "Rear storage compartment",
    targetStockLevel: 6
  });
  
  this.createVehicleInventory({
    vehicleId: 1,
    inventoryItemId: 5,  // Leaf net
    quantity: 3,
    location: "Side compartment",
    targetStockLevel: 4
  });
  
  this.createVehicleInventory({
    vehicleId: 2,
    inventoryItemId: 1,  // Chlorine
    quantity: 10,
    location: "Rear storage compartment",
    targetStockLevel: 10
  });
  
  this.createVehicleInventory({
    vehicleId: 2,
    inventoryItemId: 3,  // Filter
    quantity: 2,
    location: "Side compartment",
    targetStockLevel: 3
  });
  
  // Create sample barcodes
  this.createBarcode({
    barcodeValue: "CHL-12345",
    barcodeType: "qr", 
    itemType: "inventory",
    itemId: 1  // Chlorine
  });
  
  this.createBarcode({
    barcodeValue: "MUR-54321",
    barcodeType: "qr",
    itemType: "inventory", 
    itemId: 2  // Muriatic acid
  });
  
  this.createBarcode({
    barcodeValue: "FLT-98765",
    barcodeType: "qr",
    itemType: "inventory",
    itemId: 3  // Filter
  });
  
  // Create a sample inventory transfer
  const transfer = this.createInventoryTransfer({
    transferType: "warehouse_to_vehicle",
    sourceLocationType: "warehouse",
    sourceLocationId: 1,
    destinationLocationType: "vehicle",
    destinationLocationId: 1,
    initiatedByUserId: 1,
    scheduledDate: new Date().toISOString(),
    status: "pending"
  });
  
  this.createInventoryTransferItem({
    transferId: 1,
    inventoryItemId: 1,  // Chlorine
    requestedQuantity: 5,
    notes: "Weekly restock"
  });
  
  this.createInventoryTransferItem({
    transferId: 1,
    inventoryItemId: 2,  // Muriatic acid
    requestedQuantity: 3,
    notes: "Weekly restock"
  });
  
  // Add a completed transfer as example
  const completedTransfer = this.createInventoryTransfer({
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
  
  this.createInventoryTransferItem({
    transferId: 2,
    inventoryItemId: 3,  // Filter
    requestedQuantity: 5,
    approvedQuantity: 5,
    actualQuantity: 5
  });
  
  // Create some inventory adjustments
  this.createInventoryAdjustment({
    reason: "damaged",
    inventoryItemId: 1,  // Chlorine
    locationType: "warehouse",
    locationId: 1,
    quantityChange: -2,
    performedByUserId: 1,
    notes: "Container damaged during handling"
  });
  
  this.createInventoryAdjustment({
    reason: "count_correction",
    inventoryItemId: 3,  // Filter
    locationType: "warehouse",
    locationId: 1,
    quantityChange: 1,
    performedByUserId: 1,
    notes: "Inventory count correction after audit"
  });
  
  // Create some barcode scans
  this.createBarcodeScan({
    barcodeId: 1,
    scannedByUserId: 1,
    actionType: "inventory_check",
    location: "Warehouse 1, Bay A"
  });
  
  this.createBarcodeScan({
    barcodeId: 2,
    scannedByUserId: 2,
    actionType: "check_out",
    location: "Warehouse 1"
  });
}