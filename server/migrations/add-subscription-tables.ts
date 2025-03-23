/**
 * Migration to add subscription-related tables to the database
 * This includes subscription_plans, subscriptions, and payment_records tables
 */

import { db } from '../db';
import { 
  subscriptionPlans, 
  subscriptions, 
  paymentRecords,
  organizations
} from '../../shared/schema';
import { pgTable, serial, text, integer, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export async function runMigration() {
  console.log('Starting migration: Adding subscription tables...');

  try {
    // Check if the organization table has the subscription-related columns
    const organizationTableHasColumns = await checkOrganizationTable();
    if (!organizationTableHasColumns) {
      await addColumnsToOrganizationTable();
    }

    // Create the subscription_plans table if it doesn't exist
    console.log('Creating subscription_plans table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "subscription_plans" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "tier" VARCHAR(50) NOT NULL,
        "price" INTEGER NOT NULL,
        "billing_cycle" VARCHAR(50) NOT NULL,
        "max_technicians" INTEGER NOT NULL,
        "max_clients" INTEGER,
        "max_projects" INTEGER,
        "stripe_product_id" VARCHAR(255),
        "stripe_price_id" VARCHAR(255),
        "features" TEXT[],
        "active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create the subscriptions table if it doesn't exist
    console.log('Creating subscriptions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" SERIAL PRIMARY KEY,
        "organization_id" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "plan_id" INTEGER NOT NULL REFERENCES "subscription_plans"("id") ON DELETE RESTRICT,
        "status" VARCHAR(50) NOT NULL,
        "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "current_period_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
        "trial_ends_at" TIMESTAMP WITH TIME ZONE,
        "canceled_at" TIMESTAMP WITH TIME ZONE,
        "stripe_subscription_id" VARCHAR(255),
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create the payment_records table if it doesn't exist
    console.log('Creating payment_records table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "payment_records" (
        "id" SERIAL PRIMARY KEY,
        "organization_id" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "subscription_id" INTEGER NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
        "amount" INTEGER NOT NULL,
        "currency" VARCHAR(10) NOT NULL,
        "status" VARCHAR(50) NOT NULL,
        "stripe_payment_intent_id" VARCHAR(255),
        "description" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create index on organization_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_subscriptions_organization_id" ON "subscriptions" ("organization_id");
      CREATE INDEX IF NOT EXISTS "idx_payment_records_organization_id" ON "payment_records" ("organization_id");
      CREATE INDEX IF NOT EXISTS "idx_payment_records_subscription_id" ON "payment_records" ("subscription_id");
    `);

    // Create basic default subscription plans
    await createDefaultSubscriptionPlans();

    console.log('Migration completed: Subscription tables added successfully');
    
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Check if the organization table has the subscription-related columns
 */
async function checkOrganizationTable(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name IN ('stripe_customer_id', 'subscription_id');
    `);

    return result.rows.length === 2;
  } catch (error) {
    console.error('Error checking organization table:', error);
    return false;
  }
}

/**
 * Add subscription-related columns to the organization table
 */
async function addColumnsToOrganizationTable(): Promise<void> {
  console.log('Adding subscription-related columns to organizations table...');
  
  try {
    // Add stripe_customer_id column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255);
    `);

    // Add subscription_id column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "subscription_id" INTEGER;
    `);

    console.log('Organization table updated successfully');
  } catch (error) {
    console.error('Error updating organization table:', error);
    throw error;
  }
}

/**
 * Create default subscription plans
 */
async function createDefaultSubscriptionPlans(): Promise<void> {
  try {
    // Check if plans already exist
    const existingPlans = await db.query.subscriptionPlans.findMany();
    if (existingPlans.length > 0) {
      console.log('Default subscription plans already exist, skipping creation');
      return;
    }

    console.log('Creating default subscription plans...');

    // Basic plan
    await db.insert(subscriptionPlans).values({
      name: 'Basic',
      description: 'For small pool service businesses just getting started',
      tier: 'basic',
      price: 4999, // $49.99
      billingCycle: 'monthly',
      maxTechnicians: 3,
      maxClients: 25,
      features: ['Client management', 'Maintenance scheduling', 'Basic reporting'],
      active: true
    });

    // Professional plan
    await db.insert(subscriptionPlans).values({
      name: 'Professional',
      description: 'For growing pool service businesses with advanced needs',
      tier: 'professional',
      price: 9999, // $99.99
      billingCycle: 'monthly',
      maxTechnicians: 10,
      maxClients: 100,
      features: [
        'Client management', 
        'Maintenance scheduling', 
        'Advanced reporting',
        'Chemical inventory tracking',
        'Automated maintenance reminders',
        'Technician GPS tracking'
      ],
      active: true
    });

    // Enterprise plan
    await db.insert(subscriptionPlans).values({
      name: 'Enterprise',
      description: 'For large pool service companies with complex operations',
      tier: 'enterprise',
      price: 19999, // $199.99
      billingCycle: 'monthly',
      maxTechnicians: -1, // Unlimited
      features: [
        'Unlimited clients',
        'Unlimited technicians',
        'All Professional features',
        'Custom reporting',
        'API integration',
        'Priority support',
        'White-label options'
      ],
      active: true
    });

    // Yearly plans
    // Basic yearly
    await db.insert(subscriptionPlans).values({
      name: 'Basic (Yearly)',
      description: 'For small pool service businesses just getting started',
      tier: 'basic',
      price: 49990, // $499.90 (10 months price for 12 months)
      billingCycle: 'yearly',
      maxTechnicians: 3,
      maxClients: 25,
      features: ['Client management', 'Maintenance scheduling', 'Basic reporting'],
      active: true
    });

    // Professional yearly
    await db.insert(subscriptionPlans).values({
      name: 'Professional (Yearly)',
      description: 'For growing pool service businesses with advanced needs',
      tier: 'professional',
      price: 99990, // $999.90 (10 months price for 12 months)
      billingCycle: 'yearly',
      maxTechnicians: 10,
      maxClients: 100,
      features: [
        'Client management', 
        'Maintenance scheduling', 
        'Advanced reporting',
        'Chemical inventory tracking',
        'Automated maintenance reminders',
        'Technician GPS tracking'
      ],
      active: true
    });

    // Enterprise yearly
    await db.insert(subscriptionPlans).values({
      name: 'Enterprise (Yearly)',
      description: 'For large pool service companies with complex operations',
      tier: 'enterprise',
      price: 199990, // $1,999.90 (10 months price for 12 months)
      billingCycle: 'yearly',
      maxTechnicians: -1, // Unlimited
      features: [
        'Unlimited clients',
        'Unlimited technicians',
        'All Professional features',
        'Custom reporting',
        'API integration',
        'Priority support',
        'White-label options'
      ],
      active: true
    });

    console.log('Default subscription plans created successfully');
  } catch (error) {
    console.error('Error creating default subscription plans:', error);
    // Don't throw here - we'll continue the migration even if default plans fail
  }
}