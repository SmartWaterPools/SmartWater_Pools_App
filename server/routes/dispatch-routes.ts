import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated, requirePermission } from "../auth";
import { db } from "../db";
import { eq, and, inArray, gte, lte, desc } from "drizzle-orm";
import { bazzaRoutes, bazzaRouteStops, bazzaMaintenanceAssignments, technicians, users, clients, workOrders } from "@shared/schema";

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

router.get("/daily-board", isAuthenticated, requirePermission('maintenance', 'view'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

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
      .innerJoin(users, eq(technicians.userId, users.id))
      .where(eq(users.organizationId, organizationId));

    const dayRoutes = await db
      .select()
      .from(bazzaRoutes)
      .where(and(eq(bazzaRoutes.dayOfWeek, dayOfWeek), eq(bazzaRoutes.organizationId, organizationId)));

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
      .from(workOrders)
      .where(and(eq(workOrders.scheduledDate, dateStr), eq(workOrders.category, 'maintenance'), eq(workOrders.organizationId, organizationId)));

    const assignedMaintenanceIds = new Set(assignments.map(a => a.maintenanceId));
    const rawUnassigned = dayMaintenances.filter(m => !assignedMaintenanceIds.has(m.id));

    const unassignedClientIds = [...new Set(rawUnassigned.map(j => j.clientId).filter(Boolean))];
    let unassignedClientMap: Record<number, { name: string; address: string }> = {};
    if (unassignedClientIds.length > 0) {
      const uclientRows = await db
        .select({ id: clients.id, userId: clients.userId })
        .from(clients)
        .where(inArray(clients.id, unassignedClientIds));
      const uuserIds = uclientRows.map(c => c.userId);
      if (uuserIds.length > 0) {
        const uuserRows = await db
          .select({ id: users.id, name: users.name, address: users.address })
          .from(users)
          .where(inArray(users.id, uuserIds));
        const uuserMap: Record<number, any> = {};
        for (const u of uuserRows) uuserMap[u.id] = u;
        for (const c of uclientRows) {
          unassignedClientMap[c.id] = {
            name: uuserMap[c.userId]?.name || "Unknown",
            address: uuserMap[c.userId]?.address || "",
          };
        }
      }
    }

    const unassignedJobs = rawUnassigned.map(job => ({
      ...job,
      clientName: job.clientId ? unassignedClientMap[job.clientId]?.name || "Unknown" : "Unknown",
      clientAddress: job.clientId ? unassignedClientMap[job.clientId]?.address || "" : "",
    }));

    const techData = allTechnicians.map(tech => {
      const techRoutes = dayRoutes.filter(r => r.technicianId === tech.id);
      const routesWithStops = techRoutes.map(route => {
        const stops = allStops
          .filter(s => s.routeId === route.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(s => {
            const client = clientMap[s.clientId] || null;
            return {
              ...s,
              clientName: client?.name || "Unknown",
              clientAddress: client?.address || "",
              addressLat: client?.latitude || null,
              addressLng: client?.longitude || null,
            };
          });
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

router.post("/reassign-route", isAuthenticated, requirePermission('maintenance', 'edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const { routeId, fromTechnicianId, toTechnicianId, date } = req.body;

    if (!routeId || !fromTechnicianId || !toTechnicianId || !date) {
      return res.status(400).json({ error: "Missing required fields: routeId, fromTechnicianId, toTechnicianId, date" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route || (route as any).organizationId !== organizationId) {
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

router.post("/add-emergency-stop", isAuthenticated, requirePermission('maintenance', 'edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const { routeId, clientId, notes, position } = req.body;

    if (!routeId || !clientId) {
      return res.status(400).json({ error: "Missing required fields: routeId, clientId" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route || (route as any).organizationId !== organizationId) {
      return res.status(404).json({ error: "Route not found" });
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

router.get("/technician-workload", isAuthenticated, requirePermission('maintenance', 'view'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

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
      .innerJoin(users, eq(technicians.userId, users.id))
      .where(eq(users.organizationId, organizationId));

    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const weekDayNames = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      weekDayNames.push(daysOfWeek[d.getUTCDay()]);
    }

    const allRoutes = await db.select().from(bazzaRoutes).where(eq(bazzaRoutes.organizationId, organizationId));
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

router.post("/optimize-route/:routeId", isAuthenticated, requirePermission('maintenance', 'edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const routeId = parseInt(req.params.routeId);
    if (isNaN(routeId)) {
      return res.status(400).json({ error: "Invalid route ID" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route || (route as any).organizationId !== organizationId) {
      return res.status(404).json({ error: "Route not found" });
    }

    const stops = await storage.getBazzaRouteStopsByRouteId(routeId);
    if (stops.length < 2) {
      return res.json({ success: true, message: "Route has fewer than 2 stops, no optimization needed", stops, drivingTimes: [] });
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
      return res.json({ success: true, message: "Not enough stops with geo data to optimize", stops, drivingTimes: [] });
    }

    let optimizedStops: typeof stopsWithGeo = [];
    let drivingTimes: Array<{ fromStopIndex: number; toStopIndex: number; durationSeconds: number; durationText: string; distanceText: string }> = [];
    let usedGoogleApi = false;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (apiKey && stopsWithGeo.length <= 27) {
      try {
        const origin = clientGeoMap[stopsWithGeo[0].clientId];
        const destination = clientGeoMap[stopsWithGeo[stopsWithGeo.length - 1].clientId];
        const middleStops = stopsWithGeo.slice(1, -1);

        let waypointsParam = '';
        if (middleStops.length > 0) {
          const waypointCoords = middleStops.map(s => {
            const geo = clientGeoMap[s.clientId];
            return `${geo.lat},${geo.lng}`;
          }).join('|');
          waypointsParam = `&waypoints=optimize:true|${waypointCoords}`;
        }

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${waypointsParam}&key=${apiKey}`;
        const apiResponse = await fetch(url);
        const data = await apiResponse.json() as any;

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const routeData = data.routes[0];
          usedGoogleApi = true;

          if (middleStops.length > 0 && routeData.waypoint_order) {
            const waypointOrder: number[] = routeData.waypoint_order;
            const reorderedMiddle = waypointOrder.map((idx: number) => middleStops[idx]);
            optimizedStops = [stopsWithGeo[0], ...reorderedMiddle, stopsWithGeo[stopsWithGeo.length - 1]];
          } else {
            optimizedStops = [...stopsWithGeo];
          }

          if (routeData.legs && routeData.legs.length > 0) {
            for (let i = 0; i < routeData.legs.length; i++) {
              const leg = routeData.legs[i];
              drivingTimes.push({
                fromStopIndex: i,
                toStopIndex: i + 1,
                durationSeconds: leg.duration?.value || 0,
                durationText: leg.duration?.text || 'N/A',
                distanceText: leg.distance?.text || 'N/A',
              });
            }
          }
        }
      } catch (apiError) {
        console.error("[DISPATCH] Google Maps API error, falling back to nearest-neighbor:", apiError);
      }
    }

    if (!usedGoogleApi) {
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

      optimizedStops = ordered;
    }

    const finalOrder = [...optimizedStops, ...stopsWithoutGeo];

    for (let i = 0; i < finalOrder.length; i++) {
      await storage.updateBazzaRouteStop(finalOrder[i].id, { orderIndex: i });
    }

    const updatedStops = await storage.getBazzaRouteStopsByRouteId(routeId);
    res.json({
      success: true,
      stops: updatedStops.sort((a, b) => a.orderIndex - b.orderIndex),
      drivingTimes,
    });
  } catch (error) {
    console.error("[DISPATCH] Error optimizing route:", error);
    res.status(500).json({ error: "Failed to optimize route" });
  }
});

router.post("/reorder-stop", isAuthenticated, requirePermission('maintenance', 'edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const { routeId, stopId, direction } = req.body;

    if (!routeId || !stopId || !direction) {
      return res.status(400).json({ error: "Missing required fields: routeId, stopId, direction" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route || (route as any).organizationId !== organizationId) {
      return res.status(404).json({ error: "Route not found" });
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

router.post("/assign-job", isAuthenticated, requirePermission('maintenance', 'edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const { maintenanceId, routeId } = req.body;

    if (!maintenanceId || !routeId) {
      return res.status(400).json({ error: "Missing required fields: maintenanceId, routeId" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route || (route as any).organizationId !== organizationId) {
      return res.status(404).json({ error: "Route not found" });
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

router.post("/move-stop", isAuthenticated, requirePermission('maintenance', 'edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const { stopId, fromRouteId, toRouteId } = req.body;

    if (!stopId || !fromRouteId || !toRouteId) {
      return res.status(400).json({ error: "Missing required fields: stopId, fromRouteId, toRouteId" });
    }

    if (fromRouteId === toRouteId) {
      return res.status(400).json({ error: "Cannot move stop to the same route" });
    }

    const fromRoute = await storage.getBazzaRoute(fromRouteId);
    if (!fromRoute || (!req.isCrossOrgAdmin && (fromRoute as any).organizationId !== organizationId)) {
      return res.status(404).json({ error: "Source route not found" });
    }

    const toRoute = await storage.getBazzaRoute(toRouteId);
    if (!toRoute || (!req.isCrossOrgAdmin && (toRoute as any).organizationId !== organizationId)) {
      return res.status(404).json({ error: "Target route not found" });
    }

    const fromStops = await storage.getBazzaRouteStopsByRouteId(fromRouteId);
    const stop = fromStops.find(s => s.id === stopId);
    if (!stop) {
      return res.status(404).json({ error: "Stop not found in source route" });
    }

    const toStops = await storage.getBazzaRouteStopsByRouteId(toRouteId);
    const newOrderIndex = toStops.length > 0 ? Math.max(...toStops.map(s => s.orderIndex)) + 1 : 0;

    await db
      .update(bazzaRouteStops)
      .set({ routeId: toRouteId, orderIndex: newOrderIndex })
      .where(eq(bazzaRouteStops.id, stopId));

    res.json({ success: true });
  } catch (error) {
    console.error("[DISPATCH] Error moving stop:", error);
    res.status(500).json({ error: "Failed to move stop" });
  }
});

router.post("/bulk-assign-client-stops", isAuthenticated, requirePermission('maintenance', 'edit'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const { clientId, routeId } = req.body;
    if (!clientId || !routeId) {
      return res.status(400).json({ error: "Missing required fields: clientId, routeId" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route || (route as any).organizationId !== organizationId) {
      return res.status(404).json({ error: "Route not found" });
    }

    const allMaintenances = await db.select().from(workOrders)
      .where(and(
        eq(workOrders.clientId, clientId),
        eq(workOrders.status, "pending"),
        eq(workOrders.category, "maintenance")
      ));

    if (allMaintenances.length === 0) {
      return res.json({ success: true, stopsCreated: 0, message: "No scheduled maintenances found for this client" });
    }

    const existingStops = await storage.getBazzaRouteStopsByRouteId(routeId);
    let nextOrder = existingStops.length > 0 ? Math.max(...existingStops.map(s => s.orderIndex)) + 1 : 0;

    const existingMaintenanceIds = new Set<number>();
    const assignments = await db.select().from(bazzaMaintenanceAssignments)
      .where(eq(bazzaMaintenanceAssignments.routeId, routeId));
    for (const a of assignments) {
      existingMaintenanceIds.add(a.maintenanceId);
    }

    let stopsCreated = 0;

    for (const m of allMaintenances) {
      if (existingMaintenanceIds.has(m.id)) continue;

      await storage.createBazzaRouteStop({
        routeId,
        clientId,
        orderIndex: nextOrder++,
        estimatedDuration: 30,
        customInstructions: m.description || null,
      });

      await storage.createBazzaMaintenanceAssignment({
        routeId,
        maintenanceId: m.id,
        date: m.scheduledDate ? new Date(m.scheduledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: "scheduled",
        notes: m.description || null,
      });

      stopsCreated++;
    }

    res.json({ success: true, stopsCreated, message: `Added ${stopsCreated} stops to route` });
  } catch (error) {
    console.error("[DISPATCH] Error bulk assigning client stops:", error);
    res.status(500).json({ error: "Failed to bulk assign client stops" });
  }
});

router.get("/driving-times/:routeId", isAuthenticated, requirePermission('maintenance', 'view'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizationId = user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: "No organization context" });
    }

    const routeId = parseInt(req.params.routeId);
    if (isNaN(routeId)) {
      return res.status(400).json({ error: "Invalid route ID" });
    }

    const route = await storage.getBazzaRoute(routeId);
    if (!route || (route as any).organizationId !== organizationId) {
      return res.status(404).json({ error: "Route not found" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Google Maps API key is not configured" });
    }

    const stops = await storage.getBazzaRouteStopsByRouteId(routeId);
    stops.sort((a, b) => a.orderIndex - b.orderIndex);

    if (stops.length < 2) {
      return res.json([]);
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

    if (stopsWithGeo.length < 2) {
      return res.json([]);
    }

    const drivingTimes: Array<{ fromStopId: number; toStopId: number; durationSeconds: number; durationText: string; distanceText: string }> = [];

    const batchSize = 27;
    for (let batchStart = 0; batchStart < stopsWithGeo.length - 1; batchStart += batchSize - 1) {
      const batchEnd = Math.min(batchStart + batchSize, stopsWithGeo.length);
      const batchStops = stopsWithGeo.slice(batchStart, batchEnd);

      if (batchStops.length < 2) break;

      const originGeo = clientGeoMap[batchStops[0].clientId];
      const destGeo = clientGeoMap[batchStops[batchStops.length - 1].clientId];

      let waypointsParam = '';
      if (batchStops.length > 2) {
        const middleStops = batchStops.slice(1, -1);
        const waypointCoords = middleStops.map(s => {
          const geo = clientGeoMap[s.clientId];
          return `${geo.lat},${geo.lng}`;
        }).join('|');
        waypointsParam = `&waypoints=${waypointCoords}`;
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originGeo.lat},${originGeo.lng}&destination=${destGeo.lat},${destGeo.lng}${waypointsParam}&key=${apiKey}`;

      try {
        const apiResponse = await fetch(url);
        const data = await apiResponse.json() as any;

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const legs = data.routes[0].legs;
          for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            drivingTimes.push({
              fromStopId: batchStops[i].id,
              toStopId: batchStops[i + 1].id,
              durationSeconds: leg.duration?.value || 0,
              durationText: leg.duration?.text || 'N/A',
              distanceText: leg.distance?.text || 'N/A',
            });
          }
        }
      } catch (apiError) {
        console.error("[DISPATCH] Google Maps API error for driving times batch:", apiError);
      }
    }

    res.json(drivingTimes);
  } catch (error) {
    console.error("[DISPATCH] Error fetching driving times:", error);
    res.status(500).json({ error: "Failed to fetch driving times" });
  }
});

export default router;
