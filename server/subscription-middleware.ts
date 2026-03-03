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
      req.path === '/api/google-maps-key' ||
      req.path.startsWith('/api/places')
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
      
      const userEmailLower = user.email ? user.email.toLowerCase() : '';
      const isSmartWaterDomain = userEmailLower.endsWith('@smartwaterpools.com');
      const isTravisEmail = userEmailLower === 'travis@smartwaterpools.com';
      const specialEmails = ['010101thomasanderson@gmail.com'];
      
      // System admin, admin users, org_admin, @smartwaterpools.com domain, and special users bypass the subscription check
      const isExemptUser = 
        user.role === 'system_admin' || 
        user.role === 'admin' || 
        user.role === 'org_admin' || 
        isSmartWaterDomain ||
        specialEmails.includes(userEmailLower);
      
      if (isExemptUser) {
        console.log(`Subscription check bypassed for exempt user: ${user.email} (role: ${user.role})`);
        
        // For @smartwaterpools.com staff: correct role AND ensure they belong to the smartwater-pools org
        if (isSmartWaterDomain) {
          const correctRole = isTravisEmail ? 'system_admin' : 'org_admin';
          let needsSessionUpdate = false;

          // Fix role if wrong
          if (user.role !== correctRole && user.role !== 'system_admin') {
            console.log(`Correcting role for ${user.email}: ${user.role} -> ${correctRole}`);
            try {
              await storage.updateUser(user.id, { role: correctRole });
              user.role = correctRole;
              needsSessionUpdate = true;
            } catch (err) {
              console.error(`Failed to correct role for ${user.email}:`, err);
            }
          }

          // Fix organization: ensure they're in the smartwater-pools org, not a personal one
          try {
            let swOrg = await storage.getOrganizationBySlug('smartwater-pools');
            if (!swOrg) {
              console.log(`Creating smartwater-pools org for ${user.email}`);
              swOrg = await storage.createOrganization({
                name: 'SmartWater Pools',
                slug: 'smartwater-pools',
                active: true,
                email: 'travis@smartwaterpools.com',
                phone: null,
                address: null,
                city: null,
                state: null,
                zipCode: null,
                logo: null
              });
            }
            if (swOrg && user.organizationId !== swOrg.id) {
              console.log(`Moving ${user.email} from org ${user.organizationId} to smartwater-pools org ${swOrg.id}`);
              await storage.updateUser(user.id, { organizationId: swOrg.id });
              user.organizationId = swOrg.id;
              needsSessionUpdate = true;
            }
          } catch (err) {
            console.error(`Failed to fix organization for ${user.email}:`, err);
          }

          // Re-serialize session if anything changed so the fix takes effect immediately
          if (needsSessionUpdate) {
            await new Promise<void>((resolve) => req.login(user, () => resolve()));
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