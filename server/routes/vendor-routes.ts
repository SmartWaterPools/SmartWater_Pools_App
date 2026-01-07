import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { insertVendorSchema, insertCommunicationLinkSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const vendors = await storage.getVendors(user.organizationId);
    res.json(vendors);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    const vendor = await storage.getVendor(id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (vendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json(vendor);
  } catch (error) {
    console.error("Error fetching vendor:", error);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

router.post("/", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
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

router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingVendor = await storage.getVendor(id);
    if (!existingVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (existingVendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const vendor = await storage.updateVendor(id, req.body);
    res.json(vendor);
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingVendor = await storage.getVendor(id);
    if (!existingVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (existingVendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const deleted = await storage.deleteVendor(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

router.get("/:id/communications", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const id = parseInt(req.params.id);
    
    const existingVendor = await storage.getVendor(id);
    if (!existingVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    if (existingVendor.organizationId !== user.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const links = await storage.getCommunicationLinksByEntity("vendor", id);
    res.json(links);
  } catch (error) {
    console.error("Error fetching vendor communications:", error);
    res.status(500).json({ error: "Failed to fetch communications" });
  }
});

export default router;
