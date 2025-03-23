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
      
      // System admin and admin users bypass the subscription check
      if (user.role === 'system_admin' || (user.email && user.email.toLowerCase() === 'travis@smartwaterpools.com')) {
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