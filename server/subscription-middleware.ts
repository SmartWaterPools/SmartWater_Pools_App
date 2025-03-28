import { Request, Response, NextFunction } from "express";
import { IStorage } from "./storage";

/**
 * Middleware to check if a user's organization has an active subscription
 * If not, redirect them to the pricing page
 */
export function requireActiveSubscription(storage: IStorage) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip check for API routes that are used in the subscription process itself
    if (
      req.path.startsWith('/api/stripe') || 
      req.path.startsWith('/api/subscription') || 
      req.path === '/api/auth/session' ||
      req.path === '/api/google-maps-key'
    ) {
      return next();
    }
    
    // Skip for public static assets and pages
    if (
      req.path.includes('.') || // Static files
      req.path === '/' ||
      req.path === '/login' ||
      req.path === '/pricing' ||
      req.path === '/subscription/success' ||
      req.path === '/subscription/cancel' ||
      req.path === '/register'
    ) {
      return next();
    }
    
    // If user is not authenticated, let the auth middleware handle it
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return next();
    }
    
    try {
      const user = req.user as any;
      
      // Create an array of special exempt emails (lowercase for case-insensitive comparison)
      const specialEmails = ['travis@smartwaterpools.com', '010101thomasanderson@gmail.com'];
      const userEmailLower = user.email ? user.email.toLowerCase() : '';
      
      // System admin, admin users, org_admin, and special users bypass the subscription check
      const isExemptUser = 
        user.role === 'system_admin' || 
        user.role === 'admin' || 
        user.role === 'org_admin' || 
        specialEmails.includes(userEmailLower);
      
      if (isExemptUser) {
        console.log(`Subscription check bypassed for exempt user: ${user.email} (role: ${user.role})`);
        
        // Special handling for Travis - force the system_admin role
        if (userEmailLower === 'travis@smartwaterpools.com' && user.role !== 'system_admin') {
          console.log(`Ensuring ${user.email} has system_admin role`);
          try {
            await storage.updateUser(user.id, { role: 'system_admin' });
            // Note: we don't update the user object in the request because this middleware
            // only checks auth, it doesn't modify the session
          } catch (err) {
            console.error(`Failed to update role for exempt user ${user.email}:`, err);
          }
        }
        
        // If the exempt user somehow doesn't have an organizationId, we'll try to assign one
        if (!user.organizationId) {
          try {
            // Try both possible slugs
            let defaultOrg = await storage.getOrganizationBySlug('smartwater-pools');
            if (!defaultOrg) {
              defaultOrg = await storage.getOrganizationBySlug('smartwaterpools');
            }
            
            if (defaultOrg) {
              console.log(`Assigning exempt user ${user.email} to default organization ${defaultOrg.id}`);
              await storage.updateUser(user.id, { organizationId: defaultOrg.id });
            } else {
              console.warn(`Could not find default organization for exempt user ${user.email}`);
              
              // For admin users, create a default organization if needed
              if (user.role === 'system_admin' || user.role === 'admin') {
                console.log(`Creating default organization for admin user ${user.email}`);
                const newOrg = await storage.createOrganization({
                  name: 'SmartWater Pools',
                  slug: 'smartwater-pools',
                  active: true,
                  email: user.email,
                  phone: null,
                  address: null,
                  city: null,
                  state: null,
                  zipCode: null,
                  logo: null
                });
                
                if (newOrg) {
                  await storage.updateUser(user.id, { organizationId: newOrg.id });
                  console.log(`Created organization ${newOrg.id} and assigned to user ${user.id}`);
                }
              }
            }
          } catch (err) {
            console.error(`Failed to assign organization to exempt user ${user.email}:`, err);
          }
        }
        
        return next();
      }
      
      // Get the user's organization
      const organization = await storage.getOrganization(user.organizationId);
      
      if (!organization) {
        console.error(`Organization not found for user ${user.id} (org ID: ${user.organizationId})`);
        return res.redirect('/pricing?error=no-organization');
      }
      
      // Check if organization has a subscription
      if (!organization.subscriptionId) {
        console.log(`No subscription found for organization ${organization.id} - redirecting to pricing`);
        return res.redirect('/pricing?error=no-subscription');
      }
      
      // Get subscription details
      const subscription = await storage.getSubscription(organization.subscriptionId);
      
      if (!subscription) {
        console.error(`Subscription ${organization.subscriptionId} not found for organization ${organization.id}`);
        return res.redirect('/pricing?error=invalid-subscription');
      }
      
      // Check subscription status
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        console.log(`Subscription ${subscription.id} for organization ${organization.id} has status ${subscription.status} - redirecting to pricing`);
        return res.redirect('/pricing?error=inactive-subscription');
      }
      
      // Check if trial has ended
      if (subscription.status === 'trialing' && subscription.trialEndsAt) {
        const trialEndDate = new Date(subscription.trialEndsAt);
        if (trialEndDate < new Date()) {
          console.log(`Trial period has ended for subscription ${subscription.id} - redirecting to pricing`);
          return res.redirect('/pricing?error=trial-ended');
        }
      }
      
      // If we get here, subscription is valid
      next();
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // Let the user proceed - we don't want to block access due to an error
      next();
    }
  };
}