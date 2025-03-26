import { Router, Request, Response } from "express";
import { IStorage } from "../storage";
import { StripeService } from "../stripe-service";
import { isAuthenticated, isAdmin } from "../auth";
import { requireActiveSubscription } from "../subscription-middleware";
import Stripe from "stripe";

export default function registerStripeRoutes(router: Router, storage: IStorage, stripeService: StripeService) {
  /**
   * Create a checkout session for subscription
   * POST /api/stripe/checkout-session
   */
  router.post("/checkout-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Checkout session request received:", req.body);
      const { planId, successUrl, cancelUrl } = req.body;
      
      if (!planId || !successUrl || !cancelUrl) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters: planId, successUrl, cancelUrl" 
        });
      }
      
      const user = req.user as any;
      if (!user || !user.organizationId) {
        console.log("User authentication issue:", { user });
        return res.status(401).json({ 
          success: false, 
          message: "User must be logged in and associated with an organization" 
        });
      }
      
      // Get the subscription plan
      const plan = await storage.getSubscriptionPlan(Number(planId));
      if (!plan) {
        console.log(`Subscription plan not found for ID: ${planId}`);
        return res.status(404).json({ 
          success: false, 
          message: "Subscription plan not found" 
        });
      }
      
      // Make sure the plan has a valid stripePriceId
      if (!plan.stripePriceId) {
        console.error(`Missing stripePriceId for plan ID: ${planId}`);
        return res.status(400).json({
          success: false,
          message: "This subscription plan is not properly configured for checkout."
        });
      }
      
      console.log(`Creating checkout session for plan: ${plan.name}, organizationId: ${user.organizationId}`);
      
      // Create checkout session
      const checkoutUrl = await stripeService.createCheckoutSession(
        Number(planId),
        user.organizationId,
        successUrl,
        cancelUrl
      );
      
      if (!checkoutUrl) {
        return res.status(500).json({
          success: false,
          message: "Failed to create checkout URL"
        });
      }
      
      console.log("Checkout session created successfully, URL:", checkoutUrl);
      
      res.status(200).json({ 
        success: true, 
        url: checkoutUrl 
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create checkout session",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  /**
   * Legacy endpoint - same functionality as checkout-session
   * POST /api/stripe/checkout
   */
  router.post("/checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Legacy checkout endpoint called. Request body:", req.body);
      const { planId, successUrl, cancelUrl } = req.body;
      
      if (!planId || !successUrl || !cancelUrl) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameters: planId, successUrl, cancelUrl" 
        });
      }
      
      const user = req.user as any;
      if (!user || !user.organizationId) {
        console.log("Legacy checkout: User authentication issue");
        return res.status(401).json({ 
          success: false, 
          message: "User must be logged in and associated with an organization" 
        });
      }
      
      const plan = await storage.getSubscriptionPlan(Number(planId));
      if (!plan) {
        console.log(`Legacy checkout: Plan not found for ID: ${planId}`);
        return res.status(404).json({ 
          success: false, 
          message: "Subscription plan not found" 
        });
      }
      
      // Create checkout session
      const checkoutUrl = await stripeService.createCheckoutSession(
        Number(planId),
        user.organizationId,
        successUrl,
        cancelUrl
      );
      
      res.status(200).json({ 
        success: true, 
        url: checkoutUrl 
      });
    } catch (error) {
      console.error("Error in legacy checkout endpoint:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create checkout session",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  /**
   * Webhook handler for Stripe events
   * POST /api/stripe/webhook
   */
  router.post("/webhook", async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    
    if (!signature) {
      console.warn("Stripe webhook called without signature");
      return res.status(400).json({ 
        success: false, 
        message: "Stripe signature is missing" 
      });
    }
    
    try {
      // Get stripe webhook secret from environment variable
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error("Stripe webhook secret is not configured");
        return res.status(500).json({ 
          success: false, 
          message: "Webhook secret is not configured" 
        });
      }
      
      // Create the stripe instance for webhook verification
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2023-10-16" // Use the latest API version
      });
      
      // Verify the webhook signature
      let event;
      
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      // Handle the event
      console.log("Received Stripe webhook event:", event.type);
      
      const success = await stripeService.handleWebhookEvent(event);
      
      if (success) {
        res.status(200).json({ received: true });
      } else {
        res.status(500).json({ received: false, error: "Failed to process webhook event" });
      }
    } catch (error) {
      console.error("Error processing Stripe webhook:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process webhook",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  /**
   * Get all subscription plans
   * GET /api/stripe/plans
   */
  router.get("/plans", async (_req: Request, res: Response) => {
    try {
      console.log("Fetching subscription plans...");
      const plans = await storage.getAllSubscriptionPlans();
      console.log("Subscription plans fetched:", plans);
      
      // Filter out inactive plans
      const activePlans = plans.filter(plan => plan.active);
      console.log("Active plans:", activePlans);
      
      res.status(200).json({ 
        success: true, 
        plans: activePlans 
      });
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch subscription plans" 
      });
    }
  });
  
  /**
   * Get current subscription for current user's organization
   * GET /api/stripe/subscription
   */
  router.get("/subscription", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.organizationId) {
        return res.status(401).json({ 
          success: false, 
          message: "User must be logged in and associated with an organization" 
        });
      }
      
      // Get the organization
      const organization = await storage.getOrganization(user.organizationId);
      
      if (!organization) {
        return res.status(404).json({ 
          success: false, 
          message: "Organization not found" 
        });
      }
      
      // If organization has no subscription, return empty result
      if (!organization.subscriptionId) {
        return res.status(200).json({ 
          success: true, 
          hasSubscription: false,
          subscription: null
        });
      }
      
      // Get the subscription
      const subscription = await storage.getSubscription(organization.subscriptionId);
      
      if (!subscription) {
        return res.status(200).json({ 
          success: true, 
          hasSubscription: false,
          subscription: null
        });
      }
      
      // Get the subscription plan
      const plan = await storage.getSubscriptionPlan(subscription.planId);
      
      res.status(200).json({ 
        success: true, 
        hasSubscription: true,
        subscription: {
          ...subscription,
          plan
        }
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch subscription" 
      });
    }
  });
  
  /**
   * Cancel a subscription
   * POST /api/stripe/cancel-subscription
   */
  router.post("/cancel-subscription", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { subscriptionId, cancelImmediately = false } = req.body;
      
      if (!subscriptionId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required parameter: subscriptionId" 
        });
      }
      
      const updatedSubscription = await stripeService.cancelSubscription(
        Number(subscriptionId), 
        Boolean(cancelImmediately)
      );
      
      if (!updatedSubscription) {
        return res.status(404).json({ 
          success: false, 
          message: "Subscription not found or could not be canceled" 
        });
      }
      
      res.status(200).json({ 
        success: true, 
        subscription: updatedSubscription 
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to cancel subscription" 
      });
    }
  });
  
  /**
   * Get payment history for current user's organization
   * GET /api/stripe/payment-history
   */
  router.get("/payment-history", isAuthenticated, requireActiveSubscription(storage), async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user || !user.organizationId) {
        return res.status(401).json({ 
          success: false, 
          message: "User must be logged in and associated with an organization" 
        });
      }
      
      // Get the payment records for the organization
      const paymentRecords = await storage.getPaymentRecordsByOrganizationId(user.organizationId);
      
      res.status(200).json({ 
        success: true, 
        payments: paymentRecords 
      });
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch payment history" 
      });
    }
  });
  
  return router;
}