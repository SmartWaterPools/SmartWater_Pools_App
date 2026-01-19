import { Router } from "express";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import {
  expenses,
  timeEntries,
  poolReports,
  licenses,
  insurancePolicies,
  purchaseOrders,
  inventoryItems,
} from "@shared/schema";

const router = Router();

router.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const timeRange = (req.query.timeRange as string) || 'month';
    
    // Calculate date range based on timeRange parameter
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Fetch expenses within time range
    const allExpenses = await db.select().from(expenses)
      .where(eq(expenses.organizationId, organizationId))
      .orderBy(desc(expenses.date));
    
    const filteredExpenses = allExpenses.filter(e => {
      const expDate = e.date ? new Date(e.date).toISOString().split('T')[0] : '';
      return expDate >= startDateStr;
    });
    
    const recentExpenses = filteredExpenses.slice(0, 5);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    // Fetch time entries within time range
    const allTimeEntries = await db.select().from(timeEntries)
      .where(eq(timeEntries.organizationId, organizationId))
      .orderBy(desc(timeEntries.date));
    
    const filteredTimeEntries = allTimeEntries.filter(te => {
      const teDate = te.date ? new Date(te.date).toISOString().split('T')[0] : '';
      return teDate >= startDateStr;
    });
    
    const recentTimeEntries = filteredTimeEntries.slice(0, 5);
    
    // Fetch inventory for value calculation
    const inventoryList = await db.select().from(inventoryItems);
    
    const lowStockItems = inventoryList.filter(item => 
      item.minimumStock && item.minimumStock > 0
    );
    
    const inventoryValue = inventoryList.reduce((sum, i) => sum + Number(i.unitCost || 0) * Number(i.minimumStock || 1), 0);
    
    // Fetch purchase orders within time range
    const allPurchaseOrders = await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.organizationId, organizationId))
      .orderBy(desc(purchaseOrders.orderDate));
    
    const filteredPurchaseOrders = allPurchaseOrders.filter(po => {
      const poDate = po.orderDate ? new Date(po.orderDate).toISOString().split('T')[0] : '';
      return poDate >= startDateStr;
    });
    
    const recentPurchaseOrders = filteredPurchaseOrders.slice(0, 5);
    const outstandingOrders = filteredPurchaseOrders.filter(po => 
      po.status && ['pending', 'approved', 'ordered'].includes(po.status)
    ).length;
    
    // Calculate revenue (placeholder - would come from invoices/payments in real app)
    // For now, use a simple calculation based on work orders or projects if available
    const totalRevenue = 0; // Would aggregate from completed invoices/payments
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    res.json({
      metrics: {
        totalRevenue,
        expenses: totalExpenses,
        profit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        inventoryValue,
        lowStockItems: lowStockItems.length,
        outstandingInvoices: outstandingOrders
      },
      recentExpenses,
      lowStockItems,
      recentTimeEntries,
      recentPurchaseOrders,
      timeRange
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// ============ EXPENSES ============

router.get("/expenses", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(expenses).where(eq(expenses.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.get("/expenses/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(expenses).where(
      and(eq(expenses.id, id), eq(expenses.organizationId, organizationId))
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

router.post("/expenses", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.insert(expenses).values({
      ...req.body,
      organizationId,
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.patch("/expenses/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(expenses).where(
      and(eq(expenses.id, id), eq(expenses.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    const result = await db.update(expenses)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, organizationId)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/expenses/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(expenses).where(
      and(eq(expenses.id, id), eq(expenses.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    await db.delete(expenses).where(
      and(eq(expenses.id, id), eq(expenses.organizationId, organizationId))
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// ============ TIME ENTRIES ============

router.get("/time-entries", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(timeEntries).where(eq(timeEntries.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching time entries:", error);
    res.status(500).json({ error: "Failed to fetch time entries" });
  }
});

router.get("/time-entries/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(timeEntries).where(
      and(eq(timeEntries.id, id), eq(timeEntries.organizationId, organizationId))
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "Time entry not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching time entry:", error);
    res.status(500).json({ error: "Failed to fetch time entry" });
  }
});

router.post("/time-entries", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.insert(timeEntries).values({
      ...req.body,
      organizationId,
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating time entry:", error);
    res.status(500).json({ error: "Failed to create time entry" });
  }
});

router.patch("/time-entries/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(timeEntries).where(
      and(eq(timeEntries.id, id), eq(timeEntries.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Time entry not found" });
    }
    
    const result = await db.update(timeEntries)
      .set(req.body)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.organizationId, organizationId)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating time entry:", error);
    res.status(500).json({ error: "Failed to update time entry" });
  }
});

router.delete("/time-entries/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(timeEntries).where(
      and(eq(timeEntries.id, id), eq(timeEntries.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Time entry not found" });
    }
    
    await db.delete(timeEntries).where(
      and(eq(timeEntries.id, id), eq(timeEntries.organizationId, organizationId))
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting time entry:", error);
    res.status(500).json({ error: "Failed to delete time entry" });
  }
});

// ============ POOL REPORTS ============

router.get("/reports", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(poolReports).where(eq(poolReports.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/reports/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.post("/reports", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.insert(poolReports).values({
      ...req.body,
      organizationId,
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Failed to create report" });
  }
});

router.patch("/reports/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    const result = await db.update(poolReports)
      .set(req.body)
      .where(and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({ error: "Failed to update report" });
  }
});

router.delete("/reports/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    await db.delete(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// Pool Reports alias endpoints
router.get("/pool-reports", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(poolReports).where(eq(poolReports.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching pool reports:", error);
    res.status(500).json({ error: "Failed to fetch pool reports" });
  }
});

router.get("/pool-reports/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "Pool report not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching pool report:", error);
    res.status(500).json({ error: "Failed to fetch pool report" });
  }
});

router.post("/pool-reports", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.insert(poolReports).values({
      ...req.body,
      organizationId,
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating pool report:", error);
    res.status(500).json({ error: "Failed to create pool report" });
  }
});

router.patch("/pool-reports/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Pool report not found" });
    }
    
    const result = await db.update(poolReports)
      .set(req.body)
      .where(and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating pool report:", error);
    res.status(500).json({ error: "Failed to update pool report" });
  }
});

router.delete("/pool-reports/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Pool report not found" });
    }
    
    await db.delete(poolReports).where(
      and(eq(poolReports.id, id), eq(poolReports.organizationId, organizationId))
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting pool report:", error);
    res.status(500).json({ error: "Failed to delete pool report" });
  }
});

// ============ PURCHASE ORDERS ============

router.get("/purchase-orders", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(purchaseOrders).where(eq(purchaseOrders.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

router.get("/purchase-orders/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(purchaseOrders).where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId))
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
});

router.post("/purchase-orders", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const userId = (req.user as any).id;
    const result = await db.insert(purchaseOrders).values({
      ...req.body,
      organizationId,
      createdBy: userId,
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating purchase order:", error);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

router.patch("/purchase-orders/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(purchaseOrders).where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    
    const result = await db.update(purchaseOrders)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating purchase order:", error);
    res.status(500).json({ error: "Failed to update purchase order" });
  }
});

router.delete("/purchase-orders/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(purchaseOrders).where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Purchase order not found" });
    }
    
    await db.delete(purchaseOrders).where(
      and(eq(purchaseOrders.id, id), eq(purchaseOrders.organizationId, organizationId))
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    res.status(500).json({ error: "Failed to delete purchase order" });
  }
});

// ============ INVENTORY ============

router.get("/inventory", isAuthenticated, async (req, res) => {
  try {
    const result = await db.select().from(inventoryItems);
    res.json(result);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

router.get("/inventory/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (result.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    res.status(500).json({ error: "Failed to fetch inventory item" });
  }
});

router.post("/inventory", isAuthenticated, async (req, res) => {
  try {
    const result = await db.insert(inventoryItems).values(req.body).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(500).json({ error: "Failed to create inventory item" });
  }
});

router.patch("/inventory/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    
    const result = await db.update(inventoryItems)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(500).json({ error: "Failed to update inventory item" });
  }
});

router.delete("/inventory/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ error: "Failed to delete inventory item" });
  }
});

// ============ LICENSES ============

router.get("/licenses", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(licenses).where(eq(licenses.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching licenses:", error);
    res.status(500).json({ error: "Failed to fetch licenses" });
  }
});

router.get("/licenses/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(licenses).where(
      and(eq(licenses.id, id), eq(licenses.organizationId, organizationId))
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "License not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching license:", error);
    res.status(500).json({ error: "Failed to fetch license" });
  }
});

router.post("/licenses", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.insert(licenses).values({
      ...req.body,
      organizationId,
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating license:", error);
    res.status(500).json({ error: "Failed to create license" });
  }
});

router.patch("/licenses/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(licenses).where(
      and(eq(licenses.id, id), eq(licenses.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "License not found" });
    }
    
    const result = await db.update(licenses)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(licenses.id, id), eq(licenses.organizationId, organizationId)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating license:", error);
    res.status(500).json({ error: "Failed to update license" });
  }
});

router.delete("/licenses/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(licenses).where(
      and(eq(licenses.id, id), eq(licenses.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "License not found" });
    }
    
    await db.delete(licenses).where(
      and(eq(licenses.id, id), eq(licenses.organizationId, organizationId))
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting license:", error);
    res.status(500).json({ error: "Failed to delete license" });
  }
});

// ============ INSURANCE ============

router.get("/insurance", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(insurancePolicies).where(eq(insurancePolicies.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching insurance policies:", error);
    res.status(500).json({ error: "Failed to fetch insurance policies" });
  }
});

router.get("/insurance/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    const result = await db.select().from(insurancePolicies).where(
      and(eq(insurancePolicies.id, id), eq(insurancePolicies.organizationId, organizationId))
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "Insurance policy not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching insurance policy:", error);
    res.status(500).json({ error: "Failed to fetch insurance policy" });
  }
});

router.post("/insurance", isAuthenticated, async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const result = await db.insert(insurancePolicies).values({
      ...req.body,
      organizationId,
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating insurance policy:", error);
    res.status(500).json({ error: "Failed to create insurance policy" });
  }
});

router.patch("/insurance/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(insurancePolicies).where(
      and(eq(insurancePolicies.id, id), eq(insurancePolicies.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Insurance policy not found" });
    }
    
    const result = await db.update(insurancePolicies)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(insurancePolicies.id, id), eq(insurancePolicies.organizationId, organizationId)))
      .returning();
    res.json(result[0]);
  } catch (error) {
    console.error("Error updating insurance policy:", error);
    res.status(500).json({ error: "Failed to update insurance policy" });
  }
});

router.delete("/insurance/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;
    
    const existing = await db.select().from(insurancePolicies).where(
      and(eq(insurancePolicies.id, id), eq(insurancePolicies.organizationId, organizationId))
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Insurance policy not found" });
    }
    
    await db.delete(insurancePolicies).where(
      and(eq(insurancePolicies.id, id), eq(insurancePolicies.organizationId, organizationId))
    );
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting insurance policy:", error);
    res.status(500).json({ error: "Failed to delete insurance policy" });
  }
});

export default router;
