import { Router } from "express";
import { isAuthenticated, requirePermission } from "../auth";
import { db } from "../db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import {
  serviceReports,
  insertServiceReportSchema,
  users,
  clients,
} from "@shared/schema";
import { sendGmailMessage, UserTokens } from "../services/gmail-client";

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

router.post("/:id/send", isAuthenticated, requirePermission('reports', 'create'), async (req, res) => {
  try {
    const user = req.user as any;
    const reportId = parseInt(req.params.id);

    const result = await db
      .select()
      .from(serviceReports)
      .where(and(eq(serviceReports.id, reportId), eq(serviceReports.organizationId, user.organizationId)));

    if (result.length === 0) {
      return res.status(404).json({ error: "Service report not found" });
    }

    const report = result[0];

    const clientRecord = await db.select().from(clients).where(eq(clients.id, report.clientId)).limit(1);
    const clientUser = clientRecord.length > 0
      ? await db.select().from(users).where(eq(users.id, clientRecord[0].userId)).limit(1)
      : [];
    const recipientEmail = clientUser.length > 0 ? clientUser[0].email : null;
    const recipientName = clientUser.length > 0 ? clientUser[0].name : "Valued Customer";

    let emailSent = false;
    let emailWarning: string | undefined;

    if (!user.gmailAccessToken) {
      emailWarning = "Gmail is not connected. Report status updated but email was not sent.";
    } else if (!recipientEmail) {
      emailWarning = "Client does not have an email address on file. Report status updated but email was not sent.";
    } else {
      try {
        const userTokens: UserTokens = {
          userId: user.id,
          gmailAccessToken: user.gmailAccessToken,
          gmailRefreshToken: user.gmailRefreshToken,
          gmailTokenExpiresAt: user.gmailTokenExpiresAt,
          gmailConnectedEmail: user.gmailConnectedEmail,
        };

        const waterRows = [];
        if (report.phLevel) waterRows.push({ label: "pH Level", value: report.phLevel });
        if (report.freeChlorine) waterRows.push({ label: "Free Chlorine", value: `${report.freeChlorine} ppm` });
        if (report.combinedChlorine) waterRows.push({ label: "Combined Chlorine", value: `${report.combinedChlorine} ppm` });
        if (report.alkalinity) waterRows.push({ label: "Alkalinity", value: `${report.alkalinity} ppm` });
        if (report.calciumHardness) waterRows.push({ label: "Calcium Hardness", value: `${report.calciumHardness} ppm` });
        if (report.cyanuricAcid) waterRows.push({ label: "Cyanuric Acid", value: `${report.cyanuricAcid} ppm` });
        if (report.saltLevel) waterRows.push({ label: "Salt Level", value: `${report.saltLevel} ppm` });
        if (report.waterTemperature) waterRows.push({ label: "Water Temperature", value: `${report.waterTemperature}°F` });
        if (report.waterClarity) waterRows.push({ label: "Water Clarity", value: report.waterClarity.replace(/_/g, " ") });

        const equipmentRows = [];
        if (report.filterCondition) equipmentRows.push({ label: "Filter", value: report.filterCondition.replace(/_/g, " ") });
        if (report.filterPressurePsi) equipmentRows.push({ label: "Filter Pressure", value: `${report.filterPressurePsi} PSI` });
        if (report.pumpCondition) equipmentRows.push({ label: "Pump", value: report.pumpCondition.replace(/_/g, " ") });
        if (report.heaterCondition && report.heaterCondition !== "na") equipmentRows.push({ label: "Heater", value: report.heaterCondition.replace(/_/g, " ") });
        if (report.saltCellCondition && report.saltCellCondition !== "na") equipmentRows.push({ label: "Salt Cell", value: report.saltCellCondition.replace(/_/g, " ") });
        if (report.cleanerCondition && report.cleanerCondition !== "na") equipmentRows.push({ label: "Cleaner", value: report.cleanerCondition.replace(/_/g, " ") });
        if (report.waterLevel) equipmentRows.push({ label: "Water Level", value: report.waterLevel });

        const renderRows = (rows: {label: string, value: string}[]) =>
          rows.map(r => `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 40%;">${r.label}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; text-transform: capitalize;">${r.value}</td></tr>`).join("");

        const chemicalsApplied = report.chemicalsApplied ? JSON.parse(report.chemicalsApplied) : [];
        const chemicalRows = chemicalsApplied.map((c: any) =>
          `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${c.name}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${c.amount} ${c.unit}</td></tr>`
        ).join("");

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937;">
          <div style="background-color: #0891b2; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Pool Service Report</h1>
            <p style="color: #cffafe; margin: 4px 0 0 0; font-size: 14px;">Service Date: ${report.serviceDate} | Technician: ${user.name || "Your Pool Tech"}</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
            <p style="margin: 0 0 4px 0; font-size: 15px;">Hello ${recipientName},</p>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">Here is a summary of the service performed on your pool.</p>
            ${report.overallCondition ? `<div style="margin-bottom: 24px; padding: 12px 16px; background-color: #f0fdf4; border-radius: 6px; border-left: 4px solid #22c55e;"><strong>Overall Condition:</strong> <span style="text-transform: capitalize;">${report.overallCondition}</span></div>` : ""}
            ${waterRows.length > 0 ? `
            <h3 style="margin: 24px 0 12px; font-size: 16px; color: #0891b2;">Water Chemistry</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">${renderRows(waterRows)}</table>` : ""}
            ${equipmentRows.length > 0 ? `
            <h3 style="margin: 24px 0 12px; font-size: 16px; color: #ea580c;">Equipment Status</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">${renderRows(equipmentRows)}</table>` : ""}
            ${chemicalsApplied.length > 0 ? `
            <h3 style="margin: 24px 0 12px; font-size: 16px; color: #7c3aed;">Chemicals Applied</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead><tr style="background-color: #f3f4f6;"><th style="padding: 8px 12px; text-align: left;">Chemical</th><th style="padding: 8px 12px; text-align: left;">Amount</th></tr></thead>
              <tbody>${chemicalRows}</tbody>
            </table>` : ""}
            ${report.recommendations ? `<div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 6px; font-size: 14px;"><strong>Recommendations:</strong><br/>${report.recommendations}</div>` : ""}
            ${report.customerNotes ? `<div style="margin-top: 16px; padding: 16px; background-color: #eff6ff; border-radius: 6px; font-size: 14px;"><strong>Notes for You:</strong><br/>${report.customerNotes}</div>` : ""}
            <p style="margin-top: 32px; font-size: 13px; color: #9ca3af;">If you have any questions about this service report, please don't hesitate to reach out.</p>
          </div>
        </div>`;

        const subject = `Pool Service Report - ${report.serviceDate}`;
        const emailResult = await sendGmailMessage(recipientEmail, subject, htmlBody, true, userTokens);
        emailSent = emailResult !== null;
        if (!emailSent) {
          emailWarning = "Failed to send email via Gmail. Report status updated but email delivery failed.";
        }
      } catch (emailError) {
        console.error("Error sending service report email:", emailError);
        emailWarning = "Failed to send email via Gmail. Report status updated but email delivery failed.";
      }
    }

    await db
      .update(serviceReports)
      .set({ status: "sent_to_client", updatedAt: new Date() })
      .where(eq(serviceReports.id, reportId));

    res.json({ success: true, emailSent, emailWarning });
  } catch (error) {
    console.error("Error sending service report:", error);
    res.status(500).json({ error: "Failed to send service report" });
  }
});

router.post("/:id/send-issues", isAuthenticated, requirePermission('reports', 'create'), async (req, res) => {
  try {
    const user = req.user as any;
    const reportId = parseInt(req.params.id);

    const result = await db
      .select()
      .from(serviceReports)
      .where(and(eq(serviceReports.id, reportId), eq(serviceReports.organizationId, user.organizationId)));

    if (result.length === 0) {
      return res.status(404).json({ error: "Service report not found" });
    }

    const report = result[0];
    const issues = report.issues ? JSON.parse(report.issues) : [];

    if (issues.length === 0) {
      return res.status(400).json({ error: "No issues to send" });
    }

    const clientRecord = await db.select().from(clients).where(eq(clients.id, report.clientId)).limit(1);
    const clientUser = clientRecord.length > 0
      ? await db.select().from(users).where(eq(users.id, clientRecord[0].userId)).limit(1)
      : [];
    const recipientEmail = clientUser.length > 0 ? clientUser[0].email : null;
    const recipientName = clientUser.length > 0 ? clientUser[0].name : "Valued Customer";

    let emailSent = false;
    let emailWarning: string | undefined;

    if (!user.gmailAccessToken) {
      emailWarning = "Gmail is not connected. Email was not sent.";
    } else if (!recipientEmail) {
      emailWarning = "Client does not have an email address on file. Email was not sent.";
    } else {
      try {
        const userTokens: UserTokens = {
          userId: user.id,
          gmailAccessToken: user.gmailAccessToken,
          gmailRefreshToken: user.gmailRefreshToken,
          gmailTokenExpiresAt: user.gmailTokenExpiresAt,
          gmailConnectedEmail: user.gmailConnectedEmail,
        };

        const severityColors: Record<string, { bg: string; text: string; label: string }> = {
          low: { bg: "#dbeafe", text: "#1e40af", label: "Low" },
          medium: { bg: "#fef3c7", text: "#92400e", label: "Medium" },
          high: { bg: "#fed7aa", text: "#9a3412", label: "High" },
          critical: { bg: "#fecaca", text: "#991b1b", label: "Critical" },
        };

        const issuesByCategory: Record<string, any[]> = {};
        for (const issue of issues) {
          if (!issuesByCategory[issue.category]) issuesByCategory[issue.category] = [];
          issuesByCategory[issue.category].push(issue);
        }

        const criticalCount = issues.filter((i: any) => i.severity === "critical").length;
        const highCount = issues.filter((i: any) => i.severity === "high").length;

        let categoryHtml = "";
        for (const [category, catIssues] of Object.entries(issuesByCategory)) {
          const issueItems = (catIssues as any[]).map((issue: any) => {
            const sev = severityColors[issue.severity] || severityColors.medium;
            return `<tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${issue.description || issue.issue}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: ${sev.bg}; color: ${sev.text};">${sev.label}</span>
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${issue.notes || "—"}</td>
            </tr>`;
          }).join("");

          categoryHtml += `
          <h3 style="margin: 20px 0 8px; font-size: 15px; color: #374151;">${category}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead><tr style="background-color: #f3f4f6;">
              <th style="padding: 8px 12px; text-align: left; font-weight: 600;">Issue</th>
              <th style="padding: 8px 12px; text-align: center; font-weight: 600;">Severity</th>
              <th style="padding: 8px 12px; text-align: left; font-weight: 600;">Notes</th>
            </tr></thead>
            <tbody>${issueItems}</tbody>
          </table>`;
        }

        const urgencyBanner = criticalCount > 0
          ? `<div style="margin-bottom: 24px; padding: 12px 16px; background-color: #fef2f2; border-radius: 6px; border-left: 4px solid #dc2626; font-size: 14px; color: #991b1b;"><strong>⚠ ${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} found</strong> — immediate attention recommended.</div>`
          : highCount > 0
          ? `<div style="margin-bottom: 24px; padding: 12px 16px; background-color: #fff7ed; border-radius: 6px; border-left: 4px solid #ea580c; font-size: 14px; color: #9a3412;"><strong>${highCount} high-priority issue${highCount > 1 ? "s" : ""} found</strong> — attention recommended.</div>`
          : "";

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937;">
          <div style="background-color: #dc2626; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠ Pool Issue Report</h1>
            <p style="color: #fecaca; margin: 4px 0 0 0; font-size: 14px;">Service Date: ${report.serviceDate} | ${issues.length} issue${issues.length > 1 ? "s" : ""} found</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
            <p style="margin: 0 0 4px 0; font-size: 15px;">Hello ${recipientName},</p>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">During our recent service visit, we identified the following issues with your pool that we wanted to bring to your attention.</p>
            ${urgencyBanner}
            ${categoryHtml}
            ${report.recommendations ? `<div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 6px; font-size: 14px;"><strong>Recommendations:</strong><br/>${report.recommendations}</div>` : ""}
            <p style="margin-top: 32px; font-size: 14px;">Please don't hesitate to contact us to discuss these issues or schedule any necessary repairs.</p>
            <p style="margin-top: 16px; font-size: 13px; color: #9ca3af;">This is an automated notification from your pool service provider.</p>
          </div>
        </div>`;

        const subject = `⚠ Pool Issues Found - ${report.serviceDate} (${issues.length} issue${issues.length > 1 ? "s" : ""})`;
        const emailResult = await sendGmailMessage(recipientEmail, subject, htmlBody, true, userTokens);
        emailSent = emailResult !== null;
        if (!emailSent) {
          emailWarning = "Failed to send email via Gmail. Email delivery failed.";
        }
      } catch (emailError) {
        console.error("Error sending issue report email:", emailError);
        emailWarning = "Failed to send email via Gmail. Email delivery failed.";
      }
    }

    res.json({ success: true, emailSent, emailWarning });
  } catch (error) {
    console.error("Error sending issue report:", error);
    res.status(500).json({ error: "Failed to send issue report" });
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
