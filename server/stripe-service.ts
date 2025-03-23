/**
 * Stripe Payment Service
 * 
 * This service handles interactions with the Stripe API for subscription management 
 * and payment processing. It provides functions for:
 * - Creating and managing subscription plans in Stripe
 * - Creating checkout sessions for new subscriptions
 * - Processing webhook events from Stripe
 * - Managing customer subscriptions
 */

import Stripe from 'stripe';
import { IStorage } from './storage';
import { Subscription, SubscriptionPlan, InsertSubscription, PaymentRecord, InsertPaymentRecord } from '../shared/schema';

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-03-08' // Use the latest API version
});

export class StripeService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Create a checkout session for a new subscription
   * 
   * @param planId The ID of the subscription plan
   * @param organizationId The ID of the organization subscribing
   * @param successUrl URL to redirect to after successful payment
   * @param cancelUrl URL to redirect to if payment is canceled
   * @returns The checkout session URL
   */
  async createCheckoutSession(
    planId: number,
    organizationId: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      // Get the subscription plan from the database
      const plan = await this.storage.getSubscriptionPlan(planId);
      if (!plan) {
        throw new Error(`Subscription plan with ID ${planId} not found`);
      }

      // Get the organization
      const organization = await this.storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error(`Organization with ID ${organizationId} not found`);
      }

      // Create or retrieve the Stripe customer
      let customerId = organization.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: organization.name,
          email: organization.email,
          metadata: {
            organizationId: organizationId.toString()
          }
        });
        customerId = customer.id;

        // Update the organization with the Stripe customer ID
        await this.storage.updateOrganization(organizationId, {
          stripeCustomerId: customerId
        });
      }

      // Create the checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organizationId: organizationId.toString(),
          planId: planId.toString()
        }
      });

      return session.url || '';
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events from Stripe
   * 
   * @param event The Stripe event object
   * @returns Success status
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
    try {
      console.log(`Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return true;
    } catch (error) {
      console.error('Error handling webhook event:', error);
      return false;
    }
  }

  /**
   * Provision the subscription after successful checkout
   * 
   * @param session The completed checkout session
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      if (session.mode !== 'subscription') return;
      
      const organizationId = parseInt(session.metadata?.organizationId || '0');
      const planId = parseInt(session.metadata?.planId || '0');
      
      if (!organizationId || !planId) {
        console.error('Missing organization ID or plan ID in session metadata');
        return;
      }

      // Get the subscription from Stripe
      if (!session.subscription) {
        console.error('No subscription in checkout session');
        return;
      }

      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // Create the subscription record in our database
      const newSubscription: InsertSubscription = {
        organizationId,
        planId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        stripeSubscriptionId: subscription.id,
        quantity: subscription.items.data[0]?.quantity || 1,
      };

      if (subscription.trial_end) {
        newSubscription.trialEndsAt = new Date(subscription.trial_end * 1000);
      }

      if (subscription.canceled_at) {
        newSubscription.canceledAt = new Date(subscription.canceled_at * 1000);
      }

      const createdSubscription = await this.storage.createSubscription(newSubscription);

      // Update the organization with the subscription ID
      await this.storage.updateOrganization(organizationId, {
        subscriptionId: createdSubscription.id
      });

      console.log(`Subscription created for organization ${organizationId}`);
    } catch (error) {
      console.error('Error handling checkout session completed:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated event
   * 
   * @param stripeSubscription The Stripe subscription object
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      // Find the subscription in our database
      const subscription = await this.storage.getSubscriptionByStripeId(stripeSubscription.id);
      if (!subscription) {
        console.error(`Subscription with Stripe ID ${stripeSubscription.id} not found`);
        return;
      }

      // Update the subscription
      await this.storage.updateSubscription(subscription.id, {
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        quantity: stripeSubscription.items.data[0]?.quantity || 1,
      });

      if (stripeSubscription.trial_end) {
        await this.storage.updateSubscription(subscription.id, {
          trialEndsAt: new Date(stripeSubscription.trial_end * 1000)
        });
      }

      if (stripeSubscription.canceled_at) {
        await this.storage.updateSubscription(subscription.id, {
          canceledAt: new Date(stripeSubscription.canceled_at * 1000)
        });
      }

      console.log(`Subscription ${subscription.id} updated`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted event
   * 
   * @param stripeSubscription The Stripe subscription object
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      // Find the subscription in our database
      const subscription = await this.storage.getSubscriptionByStripeId(stripeSubscription.id);
      if (!subscription) {
        console.error(`Subscription with Stripe ID ${stripeSubscription.id} not found`);
        return;
      }

      // Update the subscription
      await this.storage.updateSubscription(subscription.id, {
        status: 'canceled',
        canceledAt: new Date(),
      });

      console.log(`Subscription ${subscription.id} marked as canceled`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Handle successful invoice payment
   * 
   * @param invoice The Stripe invoice object
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (!invoice.subscription) return;

      // Find the subscription in our database
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription.id;
      
      const subscription = await this.storage.getSubscriptionByStripeId(subscriptionId);
      if (!subscription) {
        console.error(`Subscription with Stripe ID ${subscriptionId} not found`);
        return;
      }

      // Create a payment record
      const paymentRecord: InsertPaymentRecord = {
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        stripePaymentIntentId: invoice.payment_intent as string,
        description: `Payment for invoice ${invoice.number}`,
      };

      await this.storage.createPaymentRecord(paymentRecord);
      console.log(`Payment record created for subscription ${subscription.id}`);
    } catch (error) {
      console.error('Error handling invoice payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle failed invoice payment
   * 
   * @param invoice The Stripe invoice object
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (!invoice.subscription) return;

      // Find the subscription in our database
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription.id;
      
      const subscription = await this.storage.getSubscriptionByStripeId(subscriptionId);
      if (!subscription) {
        console.error(`Subscription with Stripe ID ${subscriptionId} not found`);
        return;
      }

      // Create a payment record
      const paymentRecord: InsertPaymentRecord = {
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        description: `Failed payment for invoice ${invoice.number}`,
      };

      await this.storage.createPaymentRecord(paymentRecord);

      // Update the subscription status
      await this.storage.updateSubscription(subscription.id, {
        status: 'past_due'
      });

      console.log(`Failed payment record created for subscription ${subscription.id}`);
    } catch (error) {
      console.error('Error handling invoice payment failed:', error);
      throw error;
    }
  }

  /**
   * Create a subscription plan in Stripe
   * 
   * @param plan The subscription plan from our database
   * @returns The updated plan with Stripe IDs
   */
  async createStripePlan(plan: SubscriptionPlan): Promise<SubscriptionPlan> {
    try {
      // Create or update the product in Stripe
      let product;
      if (plan.stripeProductId) {
        // Update existing product
        product = await stripe.products.update(plan.stripeProductId, {
          name: plan.name,
          description: plan.description,
          active: plan.active,
          metadata: {
            tier: plan.tier,
            maxTechnicians: plan.maxTechnicians.toString(),
            maxClients: plan.maxClients?.toString() || 'unlimited',
            maxProjects: plan.maxProjects?.toString() || 'unlimited',
          }
        });
      } else {
        // Create new product
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          active: plan.active,
          metadata: {
            tier: plan.tier,
            maxTechnicians: plan.maxTechnicians.toString(),
            maxClients: plan.maxClients?.toString() || 'unlimited',
            maxProjects: plan.maxProjects?.toString() || 'unlimited',
          }
        });
      }

      // Create or update the price in Stripe
      let price;
      if (plan.stripePriceId) {
        // Get existing price (can't update prices in Stripe)
        price = await stripe.prices.retrieve(plan.stripePriceId);
        
        // If price doesn't match or is inactive, create a new one
        if (price.unit_amount !== plan.price || !price.active) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: plan.price,
            currency: 'usd',
            recurring: {
              interval: plan.billingCycle === 'monthly' ? 'month' : 'year'
            },
            metadata: {
              tier: plan.tier,
              billingCycle: plan.billingCycle
            }
          });
        }
      } else {
        // Create new price
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price,
          currency: 'usd',
          recurring: {
            interval: plan.billingCycle === 'monthly' ? 'month' : 'year'
          },
          metadata: {
            tier: plan.tier,
            billingCycle: plan.billingCycle
          }
        });
      }

      // Update the plan with Stripe IDs
      const updatedPlan = await this.storage.updateSubscriptionPlan(plan.id, {
        stripeProductId: product.id,
        stripePriceId: price.id
      });

      return updatedPlan || plan;
    } catch (error) {
      console.error('Error creating Stripe plan:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   * 
   * @param subscriptionId The ID of the subscription in our database
   * @param cancelImmediately Whether to cancel immediately or at period end
   * @returns The updated subscription
   */
  async cancelSubscription(subscriptionId: number, cancelImmediately: boolean = false): Promise<Subscription | undefined> {
    try {
      // Get the subscription from our database
      const subscription = await this.storage.getSubscription(subscriptionId);
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error(`Subscription with ID ${subscriptionId} not found or has no Stripe ID`);
      }

      // Cancel the subscription in Stripe
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: !cancelImmediately
      });

      if (cancelImmediately) {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      }

      // Update the subscription in our database
      const updatedSubscription = await this.storage.updateSubscription(subscriptionId, {
        cancelAtPeriodEnd: !cancelImmediately,
        status: cancelImmediately ? 'canceled' : subscription.status,
        canceledAt: cancelImmediately ? new Date() : undefined
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Generate webhook secret in development environment
   * This is used to test webhook events locally
   */
  generateWebhookSigningSecret(): string {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 32;
    let result = 'whsec_';
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }
}

// Singleton instance
let stripeService: StripeService | null = null;

// Factory function to get or create the Stripe service
export function getStripeService(storage: IStorage): StripeService {
  if (!stripeService) {
    stripeService = new StripeService(storage);
  }
  return stripeService;
}