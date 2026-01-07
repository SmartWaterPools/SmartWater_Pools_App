import { Router } from "express";
import { storage } from "../storage";
import { insertVendorSchema, insertCommunicationLinkSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const vendors = await storage.getVendors(user.organizationId);
    res.json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vendor = await storage.getVendor(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

router.post("/", async (req, res) => {
  try {
    const user = req.user as any;
    if (!user?.organizationId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const vendorData = insertVendorSchema.parse({
      ...req.body,
      organizationId: user.organizationId,
    });
    
    const vendor = await storage.createVendor(vendorData);
    res.status(201).json(vendor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid vendor data", details: error.errors });
    }
    console.error("Error creating vendor:", error);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vendor = await storage.updateVendor(id, req.body);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json(vendor);
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteVendor(id);
    if (!deleted) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

router.get("/:id/communications", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const links = await storage.getCommunicationLinksByEntity("vendor", id);
    res.json(links);
  } catch (error) {
    console.error("Error fetching vendor communications:", error);
    res.status(500).json({ error: "Failed to fetch communications" });
  }
});

export default router;
