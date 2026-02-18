import { Router } from "express";
import { isAuthenticated, requirePermission } from "../auth";
import { db } from "../db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import {
  serviceReports,
  insertServiceReportSchema,
  users,
} from "@shared/schema";

const router = Router();

router.get("/", isAuthenticated, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;
    const { clientId, technicianId, workOrderId, maintenanceId, status, startDate, endDate } = req.query;

    const conditions: any[] = [eq(serviceReports.organizationId, organizationId)];

    if (clientId) conditions.push(eq(serviceReports.clientId, parseInt(clientId as string)));
    if (technicianId) conditions.push(eq(serviceReports.technicianId, parseInt(technicianId as string)));
    if (workOrderId) conditions.push(eq(serviceReports.workOrderId, parseInt(workOrderId as string)));
    if (maintenanceId) conditions.push(eq(serviceReports.maintenanceId, parseInt(maintenanceId as string)));
    if (status) conditions.push(eq(serviceReports.status, status as string));
    if (startDate) conditions.push(gte(serviceReports.serviceDate, startDate as string));
    if (endDate) conditions.push(lte(serviceReports.serviceDate, endDate as string));

    const clientUser = db.select({ id: users.id, name: users.name }).from(users).as("clientUser");
    const techUser = db.select({ id: users.id, name: users.name }).from(users).as("techUser");

    const result = await db
      .select({
        report: serviceReports,
        clientName: clientUser.name,
        technicianName: techUser.name,
      })
      .from(serviceReports)
      .leftJoin(clientUser, eq(serviceReports.clientId, clientUser.id))
      .leftJoin(techUser, eq(serviceReports.technicianId, techUser.id))
      .where(and(...conditions))
      .orderBy(desc(serviceReports.serviceDate));

    let reports = result.map((r) => ({
      ...r.report,
      clientName: r.clientName,
      technicianName: r.technicianName,
    }));

    const user = req.user as any;
    if (user.role === 'client') {
      reports = reports.filter((r: any) => r.clientId === user.id);
    }

    res.json(reports);
  } catch (error) {
    console.error("Error fetching service reports:", error);
    res.status(500).json({ error: "Failed to fetch service reports" });
  }
});

router.get("/summary", isAuthenticated, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const user = req.user as any;
    const organizationId = user.organizationId;
    const period = (req.query.period as string) || "month";

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const startDateStr = startDate.toISOString().split("T")[0];

    const conditions: any[] = [
      eq(serviceReports.organizationId, organizationId),
      gte(serviceReports.serviceDate, startDateStr),
    ];

    if (user.role === 'client') {
      conditions.push(eq(serviceReports.clientId, user.id));
    }

    const reports = await db
      .select()
      .from(serviceReports)
      .where(and(...conditions));

    const totalReports = reports.length;
    const completedReports = reports.filter((r) => r.status === "completed" || r.status === "sent_to_client" || r.status === "reviewed");

    let totalPh = 0;
    let phCount = 0;
    let totalChlorine = 0;
    let chlorineCount = 0;
    let chemistryCompliantCount = 0;

    const equipmentIssues: Record<string, number> = {};
    let totalChemicalCost = 0;

    for (const r of reports) {
      if (r.phLevel) {
        const ph = parseFloat(r.phLevel);
        totalPh += ph;
        phCount++;
        if (ph >= 7.2 && ph <= 7.8) chemistryCompliantCount++;
      }
      if (r.chlorineLevel) {
        totalChlorine += parseFloat(r.chlorineLevel);
        chlorineCount++;
      }

      if (r.filterCondition && r.filterCondition !== "good") {
        equipmentIssues["filter"] = (equipmentIssues["filter"] || 0) + 1;
      }
      if (r.pumpCondition && r.pumpCondition !== "running") {
        equipmentIssues["pump"] = (equipmentIssues["pump"] || 0) + 1;
      }
      if (r.heaterCondition && r.heaterCondition !== "working" && r.heaterCondition !== "na") {
        equipmentIssues["heater"] = (equipmentIssues["heater"] || 0) + 1;
      }
      if (r.saltCellCondition && r.saltCellCondition !== "good" && r.saltCellCondition !== "na") {
        equipmentIssues["salt_cell"] = (equipmentIssues["salt_cell"] || 0) + 1;
      }
      if (r.cleanerCondition && r.cleanerCondition !== "working" && r.cleanerCondition !== "na") {
        equipmentIssues["cleaner"] = (equipmentIssues["cleaner"] || 0) + 1;
      }

      if (r.totalChemicalCost) {
        totalChemicalCost += r.totalChemicalCost;
      }
    }

    const sortedIssues = Object.entries(equipmentIssues)
      .sort((a, b) => b[1] - a[1])
      .map(([equipment, count]) => ({ equipment, count }));

    const avgPhCompliance = phCount > 0 ? Math.round((chemistryCompliantCount / phCount) * 100) : 0;

    res.json({
      period,
      totalReports,
      completedReports: completedReports.length,
      avgPh: phCount > 0 ? Math.round((totalPh / phCount) * 100) / 100 : null,
      avgChlorine: chlorineCount > 0 ? Math.round((totalChlorine / chlorineCount) * 100) / 100 : null,
      waterChemistryCompliancePercent: avgPhCompliance,
      commonEquipmentIssues: sortedIssues,
      totalChemicalCost,
      avgChemicalCostPerVisit: totalReports > 0 ? Math.round(totalChemicalCost / totalReports) : 0,
      followUpRequired: reports.filter((r) => r.followUpRequired).length,
    });
  } catch (error) {
    console.error("Error fetching service report summary:", error);
    res.status(500).json({ error: "Failed to fetch service report summary" });
  }
});

router.get("/by-work-order/:workOrderId", isAuthenticated, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const user = req.user as any;
    const organizationId = user.organizationId;
    const workOrderId = parseInt(req.params.workOrderId);

    const result = await db
      .select()
      .from(serviceReports)
      .where(
        and(
          eq(serviceReports.organizationId, organizationId),
          eq(serviceReports.workOrderId, workOrderId)
        )
      );

    if (result.length === 0) {
      return res.status(404).json({ error: "Service report not found for this work order" });
    }

    if (user.role === 'client' && result[0].clientId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching service report by work order:", error);
    res.status(500).json({ error: "Failed to fetch service report" });
  }
});

router.get("/by-client/:clientId", isAuthenticated, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const user = req.user as any;
    const organizationId = user.organizationId;
    const clientId = parseInt(req.params.clientId);

    if (user.role === 'client' && clientId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await db
      .select()
      .from(serviceReports)
      .where(
        and(
          eq(serviceReports.organizationId, organizationId),
          eq(serviceReports.clientId, clientId)
        )
      )
      .orderBy(desc(serviceReports.serviceDate));

    res.json(result);
  } catch (error) {
    console.error("Error fetching service reports by client:", error);
    res.status(500).json({ error: "Failed to fetch service reports" });
  }
});

router.get("/:id", isAuthenticated, requirePermission('reports', 'view'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;

    const clientUser = db.select({ id: users.id, name: users.name }).from(users).as("clientUser");
    const techUser = db.select({ id: users.id, name: users.name }).from(users).as("techUser");

    const result = await db
      .select({
        report: serviceReports,
        clientName: clientUser.name,
        technicianName: techUser.name,
      })
      .from(serviceReports)
      .leftJoin(clientUser, eq(serviceReports.clientId, clientUser.id))
      .leftJoin(techUser, eq(serviceReports.technicianId, techUser.id))
      .where(
        and(eq(serviceReports.id, id), eq(serviceReports.organizationId, organizationId))
      );

    if (result.length === 0) {
      return res.status(404).json({ error: "Service report not found" });
    }

    const user = req.user as any;
    if (user.role === 'client' && result[0].report.clientId !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const report = {
      ...result[0].report,
      clientName: result[0].clientName,
      technicianName: result[0].technicianName,
    };

    res.json(report);
  } catch (error) {
    console.error("Error fetching service report:", error);
    res.status(500).json({ error: "Failed to fetch service report" });
  }
});

router.post("/", isAuthenticated, requirePermission('reports', 'create'), async (req, res) => {
  try {
    const organizationId = (req.user as any).organizationId;

    const parsed = insertServiceReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid service report data", details: parsed.error.errors });
    }

    const result = await db
      .insert(serviceReports)
      .values({
        ...parsed.data,
        organizationId,
      })
      .returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating service report:", error);
    res.status(500).json({ error: "Failed to create service report" });
  }
});

router.patch("/:id", isAuthenticated, requirePermission('reports', 'edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;

    const existing = await db
      .select()
      .from(serviceReports)
      .where(and(eq(serviceReports.id, id), eq(serviceReports.organizationId, organizationId)));

    if (existing.length === 0) {
      return res.status(404).json({ error: "Service report not found" });
    }

    const { organizationId: _, ...updateData } = req.body;

    const result = await db
      .update(serviceReports)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(serviceReports.id, id), eq(serviceReports.organizationId, organizationId)))
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating service report:", error);
    res.status(500).json({ error: "Failed to update service report" });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const organizationId = (req.user as any).organizationId;

    const existing = await db
      .select()
      .from(serviceReports)
      .where(and(eq(serviceReports.id, id), eq(serviceReports.organizationId, organizationId)));

    if (existing.length === 0) {
      return res.status(404).json({ error: "Service report not found" });
    }

    await db
      .delete(serviceReports)
      .where(and(eq(serviceReports.id, id), eq(serviceReports.organizationId, organizationId)));

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting service report:", error);
    res.status(500).json({ error: "Failed to delete service report" });
  }
});

export default router;
