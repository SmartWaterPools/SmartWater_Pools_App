import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { db } from "../db";
import { eq, and, inArray, gte, lte, desc } from "drizzle-orm";
import { bazzaRoutes, bazzaRouteStops, bazzaMaintenanceAssignments, technicians, users, clients, maintenances } from "@shared/schema";

const router = Router();

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.get("/daily-board", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const requestedDate = new Date(dateStr);
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = days[requestedDate.getUTCDay()];

    const allTechnicians = await db
      .select({
        id: technicians.id,
        userId: technicians.userId,
        name: users.name,
      })
      .from(technicians)
      .innerJoin(users, eq(technicians.userId, users.id));

    const dayRoutes = await db
      .select()
      .from(bazzaRoutes)
      .where(eq(bazzaRoutes.dayOfWeek, dayOfWeek));

    const routeIds = dayRoutes.map(r => r.id);

    let allStops: any[] = [];
    if (routeIds.length > 0) {
      allStops = await db
        .select()
        .from(bazzaRouteStops)
        .where(inArray(bazzaRouteStops.routeId, routeIds));
    }

    const clientIds = [...new Set(allStops.map(s => s.clientId))];
    let clientMap: Record<number, any> = {};
    if (clientIds.length > 0) {
      const clientRows = await db
        .select({
          id: clients.id,
          userId: clients.userId,
          latitude: clients.latitude,
          longitude: clients.longitude,
        })
        .from(clients)
        .where(inArray(clients.id, clientIds));

      const userIds = clientRows.map(c => c.userId);
      let userMap: Record<number, any> = {};
      if (userIds.length > 0) {
        const userRows = await db
          .select({ id: users.id, name: users.name, address: users.address })
          .from(users)
          .where(inArray(users.id, userIds));
        for (const u of userRows) {
          userMap[u.id] = u;
        }
      }

      for (const c of clientRows) {
        clientMap[c.id] = {
          id: c.id,
          userId: c.userId,
          name: userMap[c.userId]?.name || "Unknown",
          address: userMap[c.userId]?.address || "",
          latitude: c.latitude,
          longitude: c.longitude,
        };
      }
    }

    const assignments = await db
      .select()
      .from(bazzaMaintenanceAssignments)
      .where(eq(bazzaMaintenanceAssignments.date, dateStr));

    const dayMaintenances = await db
      .select()
      .from(maintenances)
      .where(eq(maintenances.scheduleDate, dateStr));

    const assignedMaintenanceIds = new Set(assignments.map(a => a.maintenanceId));
    const unassignedJobs = dayMaintenances.filter(m => !assignedMaintenanceIds.has(m.id));

    const techData = allTechnicians.map(tech => {
      const techRoutes = dayRoutes.filter(r => r.technicianId === tech.id);
      const routesWithStops = techRoutes.map(route => {
        const stops = allStops
          .filter(s => s.routeId === route.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(s => ({
            ...s,
            client: clientMap[s.clientId] || null,
          }));
        return { ...route, stops };
      });

      const totalStops = routesWithStops.reduce((sum, r) => sum + r.stops.length, 0);
      const totalMinutes = routesWithStops.reduce((sum, r) =>
        sum + r.stops.reduce((s, stop) => s + (stop.estimatedDuration || 0), 0), 0);
      const estimatedHours = Math.round((totalMinutes / 60) * 100) / 100;

      const techAssignments = assignments.filter(a =>
        techRoutes.some(r => r.id === a.routeId)
      );

      let status: string = "available";
      if (techRoutes.length === 0) {
        status = "off";
      } else if (techAssignments.length > 0) {
        const allCompleted = techAssignments.every(a => a.status === "completed");
        const anyInProgress = techAssignments.some(a => a.status === "in_progress");
        if (allCompleted) {
          status = "completed";
        } else if (anyInProgress) {
          status = "on_route";
        }
      }

      return {
        id: tech.id,
        name: tech.name,
        userId: tech.userId,
        routes: routesWithStops,
        totalStops,
        estimatedHours,
        status,
      };
    });

    res.json({
      date: dateStr,
      dayOfWeek,
      technicians: techData,
      unassignedJobs,
    });
  } catch (error) {
    console.error("[DISPATCH] Error fetching daily board:", error);
    res.status(500).json({ error: "Failed to fetch daily dispatch board" });
  }
});

router.post("/reassign-route", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { routeId, fromTechnicianId, toTechnicianId, date } = req.body;

    if (!routeId || !fromTechnicianId || !toTechnicianId || !date) {
      return res.status(400).json({ error: "Missing required fields: routeId, fromTechnicianId, toTechnicianId, date" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    if (route.technicianId !== fromTechnicianId) {
      return res.status(400).json({ error: "Route is not currently assigned to the specified technician" });
    }

    const updated = await storage.updateBazzaRoute(routeId, { technicianId: toTechnicianId });
    res.json({ success: true, route: updated });
  } catch (error) {
    console.error("[DISPATCH] Error reassigning route:", error);
    res.status(500).json({ error: "Failed to reassign route" });
  }
});

router.post("/add-emergency-stop", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { routeId, clientId, notes, position } = req.body;

    if (!routeId || !clientId) {
      return res.status(400).json({ error: "Missing required fields: routeId, clientId" });
    }

    const existingStops = await storage.getBazzaRouteStopsByRouteId(routeId);
    existingStops.sort((a, b) => a.orderIndex - b.orderIndex);

    let orderIndex: number;

    if (position !== undefined && position !== null) {
      orderIndex = position;
      const stopsToShift = existingStops.filter(s => s.orderIndex >= position);
      for (const stop of stopsToShift) {
        await storage.updateBazzaRouteStop(stop.id, { orderIndex: stop.orderIndex + 1 });
      }
    } else {
      orderIndex = existingStops.length > 0
        ? Math.max(...existingStops.map(s => s.orderIndex)) + 1
        : 0;
    }

    const newStop = await storage.createBazzaRouteStop({
      routeId,
      clientId,
      orderIndex,
      customInstructions: notes || null,
      estimatedDuration: 30,
      addressLat: null,
      addressLng: null,
    });

    res.json({ success: true, stop: newStop });
  } catch (error) {
    console.error("[DISPATCH] Error adding emergency stop:", error);
    res.status(500).json({ error: "Failed to add emergency stop" });
  }
});

router.get("/technician-workload", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const weekStart = req.query.weekStart as string;
    if (!weekStart) {
      return res.status(400).json({ error: "Missing required query param: weekStart" });
    }

    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const allTechnicians = await db
      .select({
        id: technicians.id,
        userId: technicians.userId,
        name: users.name,
      })
      .from(technicians)
      .innerJoin(users, eq(technicians.userId, users.id));

    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const weekDayNames = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      weekDayNames.push(daysOfWeek[d.getUTCDay()]);
    }

    const allRoutes = await db.select().from(bazzaRoutes);
    const allRouteIds = allRoutes.map(r => r.id);

    let allStops: any[] = [];
    if (allRouteIds.length > 0) {
      allStops = await db
        .select()
        .from(bazzaRouteStops)
        .where(inArray(bazzaRouteStops.routeId, allRouteIds));
    }

    const workload = allTechnicians.map(tech => {
      const techRoutes = allRoutes.filter(r => r.technicianId === tech.id);

      const dayCounts: Record<string, number> = {};
      let totalStops = 0;
      let totalMinutes = 0;

      for (const dayName of weekDayNames) {
        const dayRoutes = techRoutes.filter(r => r.dayOfWeek === dayName);
        const dayRouteIds = dayRoutes.map(r => r.id);
        const dayStops = allStops.filter(s => dayRouteIds.includes(s.routeId));
        dayCounts[dayName] = dayStops.length;
        totalStops += dayStops.length;
        totalMinutes += dayStops.reduce((sum: number, s: any) => sum + (s.estimatedDuration || 0), 0);
      }

      return {
        technicianId: tech.id,
        name: tech.name,
        ...dayCounts,
        totalStops,
        estimatedHours: Math.round((totalMinutes / 60) * 100) / 100,
      };
    });

    res.json(workload);
  } catch (error) {
    console.error("[DISPATCH] Error fetching technician workload:", error);
    res.status(500).json({ error: "Failed to fetch technician workload" });
  }
});

router.post("/optimize-route/:routeId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const routeId = parseInt(req.params.routeId);
    if (isNaN(routeId)) {
      return res.status(400).json({ error: "Invalid route ID" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    const stops = await storage.getBazzaRouteStopsByRouteId(routeId);
    if (stops.length < 2) {
      return res.json({ success: true, message: "Route has fewer than 2 stops, no optimization needed", stops });
    }

    const clientIds = stops.map(s => s.clientId);
    const clientRows = await db
      .select()
      .from(clients)
      .where(inArray(clients.id, clientIds));

    const clientGeoMap: Record<number, { lat: number; lng: number }> = {};
    for (const c of clientRows) {
      if (c.latitude != null && c.longitude != null) {
        clientGeoMap[c.id] = { lat: c.latitude, lng: c.longitude };
      }
    }

    const stopsWithGeo = stops.filter(s => clientGeoMap[s.clientId]);
    const stopsWithoutGeo = stops.filter(s => !clientGeoMap[s.clientId]);

    if (stopsWithGeo.length < 2) {
      return res.json({ success: true, message: "Not enough stops with geo data to optimize", stops });
    }

    const ordered: typeof stopsWithGeo = [];
    const remaining = [...stopsWithGeo];

    ordered.push(remaining.shift()!);

    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1];
      const lastGeo = clientGeoMap[last.clientId];
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const geo = clientGeoMap[remaining[i].clientId];
        const dist = haversineDistance(lastGeo.lat, lastGeo.lng, geo.lat, geo.lng);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      ordered.push(remaining.splice(nearestIdx, 1)[0]);
    }

    const finalOrder = [...ordered, ...stopsWithoutGeo];

    for (let i = 0; i < finalOrder.length; i++) {
      await storage.updateBazzaRouteStop(finalOrder[i].id, { orderIndex: i });
    }

    const updatedStops = await storage.getBazzaRouteStopsByRouteId(routeId);
    res.json({ success: true, stops: updatedStops.sort((a, b) => a.orderIndex - b.orderIndex) });
  } catch (error) {
    console.error("[DISPATCH] Error optimizing route:", error);
    res.status(500).json({ error: "Failed to optimize route" });
  }
});

router.post("/reorder-stop", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { routeId, stopId, direction } = req.body;

    if (!routeId || !stopId || !direction) {
      return res.status(400).json({ error: "Missing required fields: routeId, stopId, direction" });
    }

    const stops = await storage.getBazzaRouteStopsByRouteId(routeId);
    stops.sort((a, b) => a.orderIndex - b.orderIndex);

    const currentIndex = stops.findIndex(s => s.id === stopId);
    if (currentIndex === -1) {
      return res.status(404).json({ error: "Stop not found in route" });
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= stops.length) {
      return res.json({ success: true, message: "Already at boundary" });
    }

    await storage.updateBazzaRouteStop(stops[currentIndex].id, { orderIndex: stops[swapIndex].orderIndex });
    await storage.updateBazzaRouteStop(stops[swapIndex].id, { orderIndex: stops[currentIndex].orderIndex });

    const updated = await storage.getBazzaRouteStopsByRouteId(routeId);
    res.json({ success: true, stops: updated.sort((a, b) => a.orderIndex - b.orderIndex) });
  } catch (error) {
    console.error("[DISPATCH] Error reordering stop:", error);
    res.status(500).json({ error: "Failed to reorder stop" });
  }
});

router.post("/assign-job", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { maintenanceId, routeId } = req.body;

    if (!maintenanceId || !routeId) {
      return res.status(400).json({ error: "Missing required fields: maintenanceId, routeId" });
    }

    const maintenance = await storage.getMaintenance(maintenanceId);
    if (!maintenance) {
      return res.status(404).json({ error: "Maintenance job not found" });
    }

    const existingStops = await storage.getBazzaRouteStopsByRouteId(routeId);
    const maxOrder = existingStops.length > 0 ? Math.max(...existingStops.map(s => s.orderIndex)) + 1 : 0;

    const newStop = await storage.createBazzaRouteStop({
      routeId,
      clientId: maintenance.clientId,
      orderIndex: maxOrder,
      estimatedDuration: 30,
      customInstructions: maintenance.notes || null,
      addressLat: null,
      addressLng: null,
    });

    const assignment = await storage.createBazzaMaintenanceAssignment({
      routeId,
      routeStopId: newStop.id,
      maintenanceId,
      date: maintenance.scheduleDate,
      status: "scheduled",
      notes: null,
    });

    res.json({ success: true, stop: newStop, assignment });
  } catch (error) {
    console.error("[DISPATCH] Error assigning job:", error);
    res.status(500).json({ error: "Failed to assign job to route" });
  }
});

export default router;
