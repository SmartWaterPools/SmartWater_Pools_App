import express, { Router, Request, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated, isAdmin } from "../auth";
import { createInsertSchema } from "drizzle-zod";
import { 
  bazzaRoutes, 
  bazzaRouteStops, 
  bazzaMaintenanceAssignments,
  InsertBazzaRoute,
  InsertBazzaRouteStop,
  InsertBazzaMaintenanceAssignment
} from "@shared/schema";
import { z } from "zod";

const router = Router();

// Validation schemas using drizzle-zod
const insertBazzaRouteSchema = createInsertSchema(bazzaRoutes).omit({ id: true });
const insertBazzaRouteStopSchema = createInsertSchema(bazzaRouteStops).omit({ id: true });
const insertBazzaMaintenanceAssignmentSchema = createInsertSchema(bazzaMaintenanceAssignments).omit({ id: true });

// Bazza Route endpoints

// IMPORTANT NOTE: In Express.js, route order matters!
// More specific routes must be registered before generic routes with path parameters.
// For example, "/routes/technician/:technicianId" must be registered before "/routes/:id"
// Otherwise, Express will treat "technician" as an :id parameter value.

// Get bazza routes by technician ID - specific route MUST come before generic routes
router.get("/routes/technician/:technicianId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    console.log(`[BAZZA ROUTES API] Processing request for bazza routes for technician ID: ${technicianId}`);
    
    const routes = await storage.getBazzaRoutesByTechnicianId(technicianId);
    res.json(routes);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching bazza routes for technician ${req.params.technicianId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza routes for technician" });
  }
});

// Get bazza routes by day of week - specific route MUST come before generic routes
router.get("/routes/day/:dayOfWeek", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const dayOfWeek = req.params.dayOfWeek;
    console.log(`[BAZZA ROUTES API] Processing request for bazza routes for day: ${dayOfWeek}`);
    
    const routes = await storage.getBazzaRoutesByDayOfWeek(dayOfWeek);
    res.json(routes);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching bazza routes for day ${req.params.dayOfWeek}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza routes for day" });
  }
});

// Get route stops for a specific route - specific route MUST come before generic routes
router.get("/routes/:routeId/stops", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const routeId = parseInt(req.params.routeId);
    console.log(`[BAZZA ROUTES API] Processing request for stops for bazza route ID: ${routeId}`);
    
    const stops = await storage.getBazzaRouteStopsByRouteId(routeId);
    res.json(stops);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching stops for bazza route ${req.params.routeId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza route stops" });
  }
});

// Get maintenance assignments for a specific route - specific route MUST come before generic routes
router.get("/routes/:routeId/assignments", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const routeId = parseInt(req.params.routeId);
    console.log(`[BAZZA ROUTES API] Processing request for assignments for bazza route ID: ${routeId}`);
    
    const assignments = await storage.getBazzaMaintenanceAssignmentsByRouteId(routeId);
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for bazza route ${req.params.routeId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments" });
  }
});

// Get all bazza routes - generic endpoint should come after specific routes
router.get("/routes", isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request for all bazza routes");
    const routes = await storage.getAllBazzaRoutes();
    res.json(routes);
  } catch (error) {
    console.error("[BAZZA ROUTES API] Error fetching all bazza routes:", error);
    res.status(500).json({ error: "Failed to fetch bazza routes" });
  }
});

// Create a new bazza route
router.post("/routes", isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request to create new bazza route");
    console.log("[BAZZA ROUTES API] Request body:", JSON.stringify(req.body));
    
    // Validate request body
    const validationResult = insertBazzaRouteSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error("[BAZZA ROUTES API] Validation error:", JSON.stringify(validationResult.error.errors));
      return res.status(400).json({ 
        error: "Invalid route data", 
        details: validationResult.error.errors 
      });
    }
    
    console.log("[BAZZA ROUTES API] Validated data:", JSON.stringify(validationResult.data));
    
    try {
      const newRoute = await storage.createBazzaRoute(validationResult.data as InsertBazzaRoute);
      console.log("[BAZZA ROUTES API] Successfully created route:", JSON.stringify(newRoute));
      res.status(201).json(newRoute);
    } catch (dbError) {
      console.error("[BAZZA ROUTES API] Database error creating route:", dbError);
      res.status(500).json({ error: "Failed to create bazza route in database", message: String(dbError) });
    }
  } catch (error) {
    console.error("[BAZZA ROUTES API] Unexpected error creating bazza route:", error);
    res.status(500).json({ error: "Failed to create bazza route" });
  }
});

// Update a bazza route
router.put("/routes/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to update bazza route ID: ${id}`);
    
    // Check if route exists
    const existingRoute = await storage.getBazzaRoute(id);
    if (!existingRoute) {
      return res.status(404).json({ error: "Bazza route not found" });
    }
    
    const updatedRoute = await storage.updateBazzaRoute(id, req.body);
    res.json(updatedRoute);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error updating bazza route ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update bazza route" });
  }
});

// IMPORTANT: We had duplicate routes that were already defined above.
// The code below is removed to avoid conflicts with the routes defined at the top of the file.

// IMPORTANT: We had duplicate routes that were already defined above.
// The code below is removed to avoid conflicts with the routes defined at the top of the file.

// Bazza Route Stop endpoints

// Get a specific bazza route by ID - MUST come after more specific routes
router.get("/routes/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request for bazza route ID: ${id}`);
    
    const route = await storage.getBazzaRoute(id);
    if (!route) {
      return res.status(404).json({ error: "Bazza route not found" });
    }
    
    res.json(route);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching bazza route ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza route" });
  }
});

// Delete a bazza route
router.delete("/routes/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to delete bazza route ID: ${id}`);
    
    // Check if route exists
    const existingRoute = await storage.getBazzaRoute(id);
    if (!existingRoute) {
      console.log(`[BAZZA ROUTES API] Route ID ${id} not found for deletion`);
      return res.status(404).json({ error: "Bazza route not found" });
    }
    
    console.log(`[BAZZA ROUTES API] Found route "${existingRoute.name}" (ID: ${id}), proceeding with deletion`);
    
    try {
      const result = await storage.deleteBazzaRoute(id);
      if (result) {
        console.log(`[BAZZA ROUTES API] Successfully deleted route ID: ${id}`);
        res.status(204).end();
      } else {
        console.error(`[BAZZA ROUTES API] Storage returned false for route deletion ID: ${id}`);
        res.status(500).json({ error: "Failed to delete bazza route" });
      }
    } catch (storageError) {
      console.error(`[BAZZA ROUTES API] Storage error while deleting route ID ${id}:`, storageError);
      // More detailed error response with specific error message if available
      const errorMessage = storageError instanceof Error ? storageError.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to delete bazza route due to a database error",
        details: errorMessage
      });
    }
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error in route deletion handler for ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: "Failed to process bazza route deletion request",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Create a new route stop
router.post("/stops", isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request to create new bazza route stop");
    
    // Validate request body
    const validationResult = insertBazzaRouteStopSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid route stop data", 
        details: validationResult.error.errors 
      });
    }
    
    const newStop = await storage.createBazzaRouteStop(validationResult.data as InsertBazzaRouteStop);
    res.status(201).json(newStop);
  } catch (error) {
    console.error("[BAZZA ROUTES API] Error creating bazza route stop:", error);
    res.status(500).json({ error: "Failed to create bazza route stop" });
  }
});

// Update a route stop
router.put("/stops/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to update bazza route stop ID: ${id}`);
    
    // Check if stop exists
    const existingStop = await storage.getBazzaRouteStop(id);
    if (!existingStop) {
      return res.status(404).json({ error: "Bazza route stop not found" });
    }
    
    const updatedStop = await storage.updateBazzaRouteStop(id, req.body);
    res.json(updatedStop);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error updating bazza route stop ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update bazza route stop" });
  }
});

// Delete a route stop
router.delete("/stops/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to delete bazza route stop ID: ${id}`);
    
    // Check if stop exists
    const existingStop = await storage.getBazzaRouteStop(id);
    if (!existingStop) {
      console.log(`[BAZZA ROUTES API] Route stop ID ${id} not found for deletion`);
      return res.status(404).json({ error: "Bazza route stop not found" });
    }
    
    console.log(`[BAZZA ROUTES API] Found route stop ID: ${id} for route ID: ${existingStop.routeId}, proceeding with deletion`);
    
    try {
      const result = await storage.deleteBazzaRouteStop(id);
      if (result) {
        console.log(`[BAZZA ROUTES API] Successfully deleted route stop ID: ${id}`);
        res.status(204).end();
      } else {
        console.error(`[BAZZA ROUTES API] Storage returned false for route stop deletion ID: ${id}`);
        res.status(500).json({ error: "Failed to delete bazza route stop" });
      }
    } catch (storageError) {
      console.error(`[BAZZA ROUTES API] Storage error while deleting route stop ID ${id}:`, storageError);
      const errorMessage = storageError instanceof Error ? storageError.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to delete bazza route stop due to a database error",
        details: errorMessage
      });
    }
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error in route stop deletion handler for ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: "Failed to process bazza route stop deletion request",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get route stops for a specific client
router.get("/stops/client/:clientId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    console.log(`[BAZZA ROUTES API] Processing request for stops for client ID: ${clientId}`);
    
    const stops = await storage.getBazzaRouteStopsByClientId(clientId);
    res.json(stops);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching stops for client ${req.params.clientId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza route stops for client" });
  }
});

// Reorder route stops
router.post("/routes/:routeId/reorder-stops", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const routeId = parseInt(req.params.routeId);
    console.log(`[BAZZA ROUTES API] Processing request to reorder stops for bazza route ID: ${routeId}`);
    
    // Validate request body
    if (!req.body.stopIds || !Array.isArray(req.body.stopIds)) {
      return res.status(400).json({ error: "Invalid request, stopIds array required" });
    }
    
    const updatedStops = await storage.reorderBazzaRouteStops(routeId, req.body.stopIds);
    res.json(updatedStops);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error reordering stops for bazza route ${req.params.routeId}:`, error);
    res.status(500).json({ error: "Failed to reorder bazza route stops" });
  }
});

// Bazza Maintenance Assignment endpoints

// Get maintenance assignments for a specific maintenance
router.get("/assignments/maintenance/:maintenanceId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const maintenanceId = parseInt(req.params.maintenanceId);
    console.log(`[BAZZA ROUTES API] Processing request for assignments for maintenance ID: ${maintenanceId}`);
    
    const assignments = await storage.getBazzaMaintenanceAssignmentsByMaintenanceId(maintenanceId);
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for maintenance ${req.params.maintenanceId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments for maintenance" });
  }
});

// Get maintenance assignments for a specific date
router.get("/assignments/date/:date", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const dateStr = req.params.date;
    console.log(`[BAZZA ROUTES API] Processing request for assignments for date: ${dateStr}`);
    
    // Convert string date to Date object
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Please use YYYY-MM-DD format." });
    }
    
    const assignments = await storage.getBazzaMaintenanceAssignmentsByDate(date);
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for date ${req.params.date}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments for date" });
  }
});

// Get maintenance assignments for a technician within a date range
router.get("/assignments/technician/:technicianId/date-range", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      return res.status(400).json({ 
        error: "Both startDate and endDate query parameters are required (format: YYYY-MM-DD)" 
      });
    }
    
    console.log(`[BAZZA ROUTES API] Processing request for assignments for technician ID: ${technicianId} from ${startDate} to ${endDate}`);
    
    // Convert string dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        error: "Invalid date format. Please use YYYY-MM-DD format." 
      });
    }
    
    const assignments = await storage.getBazzaMaintenanceAssignmentsByTechnicianIdAndDateRange(
      technicianId, 
      start, 
      end
    );
    res.json(assignments);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error fetching assignments for technician ${req.params.technicianId}:`, error);
    res.status(500).json({ error: "Failed to fetch bazza maintenance assignments for technician and date range" });
  }
});

// Create a new maintenance assignment
router.post("/assignments", isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log("[BAZZA ROUTES API] Processing request to create new bazza maintenance assignment");
    
    // Validate request body
    const validationResult = insertBazzaMaintenanceAssignmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid maintenance assignment data", 
        details: validationResult.error.errors 
      });
    }
    
    const newAssignment = await storage.createBazzaMaintenanceAssignment(
      validationResult.data as InsertBazzaMaintenanceAssignment
    );
    res.status(201).json(newAssignment);
  } catch (error) {
    console.error("[BAZZA ROUTES API] Error creating bazza maintenance assignment:", error);
    res.status(500).json({ error: "Failed to create bazza maintenance assignment" });
  }
});

// Update a maintenance assignment
router.put("/assignments/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to update bazza maintenance assignment ID: ${id}`);
    
    // Check if assignment exists
    const existingAssignment = await storage.getBazzaMaintenanceAssignment(id);
    if (!existingAssignment) {
      return res.status(404).json({ error: "Bazza maintenance assignment not found" });
    }
    
    const updatedAssignment = await storage.updateBazzaMaintenanceAssignment(id, req.body);
    res.json(updatedAssignment);
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error updating bazza maintenance assignment ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update bazza maintenance assignment" });
  }
});

// Delete a maintenance assignment
router.delete("/assignments/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`[BAZZA ROUTES API] Processing request to delete bazza maintenance assignment ID: ${id}`);
    
    // Check if assignment exists
    const existingAssignment = await storage.getBazzaMaintenanceAssignment(id);
    if (!existingAssignment) {
      console.log(`[BAZZA ROUTES API] Maintenance assignment ID ${id} not found for deletion`);
      return res.status(404).json({ error: "Bazza maintenance assignment not found" });
    }
    
    console.log(`[BAZZA ROUTES API] Found assignment for route ID: ${existingAssignment.routeId}, maintenance ID: ${existingAssignment.maintenanceId}, proceeding with deletion`);
    
    try {
      const result = await storage.deleteBazzaMaintenanceAssignment(id);
      if (result) {
        console.log(`[BAZZA ROUTES API] Successfully deleted maintenance assignment ID: ${id}`);
        res.status(204).end();
      } else {
        console.error(`[BAZZA ROUTES API] Storage returned false for maintenance assignment deletion ID: ${id}`);
        res.status(500).json({ error: "Failed to delete bazza maintenance assignment" });
      }
    } catch (storageError) {
      console.error(`[BAZZA ROUTES API] Storage error while deleting maintenance assignment ID ${id}:`, storageError);
      const errorMessage = storageError instanceof Error ? storageError.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to delete bazza maintenance assignment due to a database error",
        details: errorMessage
      });
    }
  } catch (error) {
    console.error(`[BAZZA ROUTES API] Error in maintenance assignment deletion handler for ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: "Failed to process bazza maintenance assignment deletion request",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;