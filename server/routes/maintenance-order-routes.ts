import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { type User, insertMaintenanceOrderSchema } from "@shared/schema";

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const { status, clientId, technicianId } = req.query;

    let orders = await storage.getMaintenanceOrders(user.organizationId);

    if (status && typeof status === 'string') {
      orders = orders.filter(o => o.status === status);
    }
    if (clientId) {
      orders = orders.filter(o => o.clientId === parseInt(clientId as string));
    }
    if (technicianId) {
      orders = orders.filter(o => o.technicianId === parseInt(technicianId as string));
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching maintenance orders:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance orders' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    const user = req.user as User;
    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching maintenance order:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance order' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const data = insertMaintenanceOrderSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
      createdBy: user.id,
    });

    const order = await storage.createMaintenanceOrder(data);
    res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating maintenance order:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create maintenance order' });
  }
});

router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const id = parseInt(req.params.id);
    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updatedOrder = await storage.updateMaintenanceOrder(id, req.body);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating maintenance order:', error);
    res.status(500).json({ error: 'Failed to update maintenance order' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const id = parseInt(req.params.id);
    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const deleted = await storage.deleteMaintenanceOrder(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting maintenance order:', error);
    res.status(500).json({ error: 'Failed to delete maintenance order' });
  }
});

router.get('/:id/work-orders', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const visits = await storage.getMaintenancesByMaintenanceOrder(id);
    res.json(visits);
  } catch (error) {
    console.error('Error fetching maintenance visits for maintenance order:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance visits' });
  }
});

router.post('/:id/generate-visits', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const id = parseInt(req.params.id);
    const { fromDate, toDate } = req.body;

    const order = await storage.getMaintenanceOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Maintenance order not found' });
    }

    if (order.organizationId && order.organizationId !== user.organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ error: 'Can only generate visits for active maintenance orders' });
    }

    const startDate = new Date(fromDate || order.startDate);
    const endDate = new Date(toDate || order.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const existingVisits = await storage.getMaintenancesByMaintenanceOrder(id);
    const existingDates = new Set(existingVisits.map(v => v.scheduleDate));

    const visitDates = generateRecurringDates(
      startDate,
      endDate,
      order.frequency || 'weekly',
      order.dayOfWeek || undefined
    );

    const newVisits = [];
    for (const date of visitDates) {
      const dateStr = date.toISOString().split('T')[0];
      if (existingDates.has(dateStr)) continue;

      try {
        console.log(`[Generate Visits] Creating maintenance visit for date ${dateStr}, clientId=${order.clientId}, techId=${order.technicianId}`);
        const maintenance = await storage.createMaintenance({
          clientId: order.clientId,
          technicianId: order.technicianId || null,
          maintenanceOrderId: order.id,
          scheduleDate: dateStr,
          type: order.title || 'maintenance',
          status: 'scheduled',
          notes: order.description || null,
          routeName: null,
          routeOrder: null,
        });
        newVisits.push(maintenance);
      } catch (visitError) {
        console.error(`[Generate Visits] Failed to create visit for date ${dateStr}:`, visitError);
      }
    }

    res.status(201).json({ generated: newVisits.length, visits: newVisits });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating visits:', errorMessage, error);
    res.status(500).json({ error: 'Failed to generate visits', details: errorMessage });
  }
});

function generateRecurringDates(
  startDate: Date,
  endDate: Date,
  frequency: string,
  dayOfWeek?: string
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  if (dayOfWeek && dayMap[dayOfWeek.toLowerCase()] !== undefined) {
    const targetDay = dayMap[dayOfWeek.toLowerCase()];
    while (current.getDay() !== targetDay) {
      current.setDate(current.getDate() + 1);
    }
  }

  const intervalDays: Record<string, number> = {
    weekly: 7,
    bi_weekly: 14,
    monthly: 30,
    bi_monthly: 60,
    quarterly: 90,
  };

  const interval = intervalDays[frequency] || 7;

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + interval);
  }

  return dates;
}

export default router;
