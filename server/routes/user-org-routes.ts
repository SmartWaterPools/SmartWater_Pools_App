import express, { Router, Request, Response } from "express";
import { IStorage } from "../storage";
import { isAuthenticated, isAdmin, isSystemAdmin } from "../auth";

/**
 * Creates a router for user management endpoints.
 * 
 * @param router Express router instance
 * @param storage Storage interface for data operations
 * @param isUserRouter Boolean to determine if this is a user router (true) or organization router (false)
 * @returns Configured Express router
 */
export default function registerUserOrgRoutes(router: Router, storage: IStorage, isUserRouter = true): Router {
  if (isUserRouter) {
    // USER ROUTES
    
    // GET all users
    router.get("/", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        console.log("GET /api/users - Retrieving users");
        let usersList;
        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        if (currentUser.role === 'system_admin' || isSmartWaterAdmin) {
          usersList = await storage.getAllUsers();
        } else {
          usersList = await storage.getUsersByOrganizationId(currentUser.organizationId);
        }
        console.log(`Retrieved ${usersList.length} users`);
        res.json(usersList);
      } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ error: "Failed to retrieve users" });
      }
    });

    // GET user by ID
    router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        
        const fetchedUser = await storage.getUser(userId);
        if (!fetchedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        
        if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin && fetchedUser.organizationId !== currentUser.organizationId) {
          return res.status(403).json({ error: "Access denied: user belongs to a different organization" });
        }
        
        res.json(fetchedUser);
      } catch (error) {
        console.error(`Error retrieving user ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to retrieve user" });
      }
    });

    // POST create new user
    router.post("/", isAdmin, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        console.log("POST /api/users - Creating new user");
        console.log("Request body:", req.body);
        
        // Basic validation
        if (!req.body.username || !req.body.email || !req.body.name) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        
        if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin) {
          req.body.organizationId = currentUser.organizationId;
        }
        
        // Check if username or email already exists
        const existingUserByName = await storage.getUserByUsername(req.body.username);
        if (existingUserByName) {
          return res.status(409).json({ error: "Username already exists" });
        }
        
        const existingUserByEmail = await storage.getUserByEmail(req.body.email);
        if (existingUserByEmail) {
          return res.status(409).json({ error: "Email already exists" });
        }
        
        // Create user
        const newUser = await storage.createUser({
          ...req.body,
          active: req.body.active !== undefined ? req.body.active : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log("User created successfully:", newUser.id);
        res.status(201).json(newUser);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
      }
    });

    // PATCH update user
    router.patch("/:id", isAdmin, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        
        console.log(`PATCH /api/users/${userId} - Updating user`);
        
        // Check if user exists
        const existingUser = await storage.getUser(userId);
        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        
        if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin) {
          if (existingUser.organizationId !== currentUser.organizationId) {
            return res.status(403).json({ error: "Access denied: user belongs to a different organization" });
          }
          delete req.body.organizationId;
        }
        
        // Update user
        const updatedUser = await storage.updateUser(userId, {
          ...req.body,
          updatedAt: new Date(),
        });
        
        console.log(`User ${userId} updated successfully`);
        res.json(updatedUser);
      } catch (error) {
        console.error(`Error updating user ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to update user" });
      }
    });

    // DELETE user (deactivate or permanently delete)
    router.delete("/:id", isAdmin, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        
        // Check if permanent deletion is requested
        const permanent = req.query.permanent === 'true';
        console.log(`DELETE /api/users/${userId} - ${permanent ? 'Permanently deleting' : 'Deactivating'} user`);
        
        // Check if user exists
        const existingUser = await storage.getUser(userId);
        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        
        if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin && existingUser.organizationId !== currentUser.organizationId) {
          return res.status(403).json({ error: "Access denied: user belongs to a different organization" });
        }
        
        // Prevent self-deletion
        if (req.user && (req.user as any).id === userId) {
          return res.status(403).json({ error: "Cannot delete yourself" });
        }
        
        if (permanent) {
          // Permanently delete user
          await storage.deleteUser(userId);
          console.log(`User ${userId} permanently deleted`);
          return res.json({ 
            success: true, 
            message: "User permanently deleted", 
            permanent: true 
          });
        } else {
          // Deactivate user
          await storage.updateUser(userId, { 
            active: false,
            updatedAt: new Date(),
          });
          console.log(`User ${userId} deactivated`);
          return res.json({ 
            success: true, 
            message: "User deactivated", 
            permanent: false 
          });
        }
      } catch (error) {
        console.error(`Error deleting user ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to delete user" });
      }
    });

    // GET users by organization
    router.get("/organization/:organizationId", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        const organizationId = parseInt(req.params.organizationId);
        if (isNaN(organizationId)) {
          return res.status(400).json({ error: "Invalid organization ID" });
        }

        if (currentUser.role !== 'system_admin' && currentUser.organizationId !== organizationId) {
          return res.status(403).json({ error: "Access denied: cannot access users from a different organization" });
        }
        
        console.log(`GET /api/users/organization/${organizationId} - Retrieving users for organization`);
        const usersList = await storage.getUsersByOrganizationId(organizationId);
        console.log(`Retrieved ${usersList.length} users for organization ${organizationId}`);
        res.json(usersList);
      } catch (error) {
        console.error(`Error retrieving users for organization ${req.params.organizationId}:`, error);
        res.status(500).json({ error: "Failed to retrieve users" });
      }
    });
  
  } else {
    // ORGANIZATION ROUTES
    
    // GET all organizations
    router.get("/", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        console.log("GET /api/organizations - Retrieving organizations");
        let organizationsList;
        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        if (currentUser.role === 'system_admin' || isSmartWaterAdmin) {
          organizationsList = await storage.getAllOrganizations();
        } else {
          const userOrg = await storage.getOrganization(currentUser.organizationId);
          organizationsList = userOrg ? [userOrg] : [];
        }
        console.log(`Retrieved ${organizationsList.length} organizations`);
        res.json(organizationsList);
      } catch (error) {
        console.error("Error retrieving organizations:", error);
        res.status(500).json({ error: "Failed to retrieve organizations" });
      }
    });

    // GET organization by ID
    router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        const organizationId = parseInt(req.params.id);
        if (isNaN(organizationId)) {
          return res.status(400).json({ error: "Invalid organization ID" });
        }

        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin && currentUser.organizationId !== organizationId) {
          return res.status(403).json({ error: "Access denied: cannot access a different organization" });
        }
        
        const organization = await storage.getOrganization(organizationId);
        if (!organization) {
          return res.status(404).json({ error: "Organization not found" });
        }
        
        res.json(organization);
      } catch (error) {
        console.error(`Error retrieving organization ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to retrieve organization" });
      }
    });

    // POST create new organization
    router.post("/", isAdmin, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin) {
          return res.status(403).json({ error: "Forbidden: Only SmartWater Pools administrators can create organizations" });
        }
        console.log("POST /api/organizations - Creating new organization");
        console.log("Request body:", req.body);
        
        // Basic validation
        if (!req.body.name || !req.body.slug) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Check if slug already exists
        const existingOrg = await storage.getOrganizationBySlug(req.body.slug);
        if (existingOrg) {
          return res.status(409).json({ error: "Organization slug already exists" });
        }
        
        // Create organization
        const newOrganization = await storage.createOrganization({
          ...req.body,
          active: req.body.active !== undefined ? req.body.active : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log("Organization created successfully:", newOrganization.id);
        res.status(201).json(newOrganization);
      } catch (error) {
        console.error("Error creating organization:", error);
        res.status(500).json({ error: "Failed to create organization" });
      }
    });

    // PATCH update organization
    router.patch("/:id", isAdmin, async (req: Request, res: Response) => {
      try {
        const currentUser = req.user as any;
        const isSmartWaterAdmin = ['admin', 'system_admin', 'org_admin'].includes(currentUser.role) && 
          currentUser.email?.toLowerCase().endsWith('@smartwaterpools.com');
        if (currentUser.role !== 'system_admin' && !isSmartWaterAdmin) {
          return res.status(403).json({ error: "Forbidden: Only SmartWater Pools administrators can update organizations" });
        }
        const organizationId = parseInt(req.params.id);
        if (isNaN(organizationId)) {
          return res.status(400).json({ error: "Invalid organization ID" });
        }
        
        console.log(`PATCH /api/organizations/${organizationId} - Updating organization`);
        
        // Check if organization exists
        const existingOrg = await storage.getOrganization(organizationId);
        if (!existingOrg) {
          return res.status(404).json({ error: "Organization not found" });
        }
        
        // Update organization
        const updatedOrganization = await storage.updateOrganization(organizationId, {
          ...req.body,
          updatedAt: new Date(),
        });
        
        console.log(`Organization ${organizationId} updated successfully`);
        res.json(updatedOrganization);
      } catch (error) {
        console.error(`Error updating organization ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to update organization" });
      }
    });
  }

  return router;
}
