import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertTaxTemplateSchema } from "@shared/schema";

const router = Router();

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const templates = await storage.getTaxTemplates(user.organizationId);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching tax templates:", error);
    res.status(500).json({ error: "Failed to fetch tax templates" });
  }
});

router.get("/by-state/:state", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const templates = await storage.getTaxTemplatesByState(req.params.state, user.organizationId);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching tax templates by state:", error);
    res.status(500).json({ error: "Failed to fetch tax templates" });
  }
});

router.get("/default", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const template = await storage.getDefaultTaxTemplate(user.organizationId);
    res.json(template || null);
  } catch (error) {
    console.error("Error fetching default tax template:", error);
    res.status(500).json({ error: "Failed to fetch default tax template" });
  }
});

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const template = await storage.getTaxTemplate(parseInt(req.params.id));
    if (!template) return res.status(404).json({ error: "Tax template not found" });
    if (template.organizationId !== user.organizationId) return res.status(403).json({ error: "Access denied" });
    res.json(template);
  } catch (error) {
    console.error("Error fetching tax template:", error);
    res.status(500).json({ error: "Failed to fetch tax template" });
  }
});

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const parsed = insertTaxTemplateSchema.parse({
      ...req.body,
      rate: String(req.body.rate),
      organizationId: user.organizationId,
    });
    const template = await storage.createTaxTemplate(parsed);
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating tax template:", error);
    res.status(500).json({ error: "Failed to create tax template" });
  }
});

router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    const existing = await storage.getTaxTemplate(id);
    if (!existing) return res.status(404).json({ error: "Tax template not found" });
    if (existing.organizationId !== user.organizationId) return res.status(403).json({ error: "Access denied" });
    const updateData = { ...req.body };
    if (updateData.rate !== undefined) updateData.rate = String(updateData.rate);
    const updated = await storage.updateTaxTemplate(id, updateData);
    res.json(updated);
  } catch (error) {
    console.error("Error updating tax template:", error);
    res.status(500).json({ error: "Failed to update tax template" });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    const existing = await storage.getTaxTemplate(id);
    if (!existing) return res.status(404).json({ error: "Tax template not found" });
    if (existing.organizationId !== user.organizationId) return res.status(403).json({ error: "Access denied" });
    await storage.deleteTaxTemplate(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting tax template:", error);
    res.status(500).json({ error: "Failed to delete tax template" });
  }
});

export default router;
