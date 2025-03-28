/**
 * Script to create Stripe products and prices for all subscription plans
 * This ensures all plans are available in Stripe for checkout
 */

import * as dotenv from 'dotenv';
import Stripe from 'stripe';
import pg from 'pg';

// Load environment variables
dotenv.config();

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' // Stripe API version
});

// Create a connection to the database
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createStripePlans() {
  console.log("Starting Stripe plan creation process...");
  
  try {
    // Get all subscription plans from the database
    const { rows: plans } = await pool.query(`
      SELECT * FROM subscription_plans
      WHERE active = TRUE
    `);
    
    console.log(`Found ${plans.length} active subscription plans in database`);
    
    // Create Stripe products and prices for each plan
    for (const plan of plans) {
      console.log(`Processing plan: ${plan.name} (${plan.tier} - ${plan.billing_cycle})`);
      
      try {
        // Skip if already has Stripe IDs and is active
        if (plan.stripe_product_id && plan.stripe_price_id) {
          console.log(`Plan "${plan.name}" already has Stripe IDs - validating...`);
          
          // Verify the product exists in Stripe
          try {
            const product = await stripe.products.retrieve(plan.stripe_product_id);
            console.log(`  Product exists in Stripe: ${product.id}`);
            
            const price = await stripe.prices.retrieve(plan.stripe_price_id);
            console.log(`  Price exists in Stripe: ${price.id}`);
            
            // Skip if product and price are valid
            console.log(`  Plan "${plan.name}" is valid in Stripe - skipping creation`);
            continue;
          } catch (error) {
            console.log(`  Stripe product or price not found - recreating`);
          }
        }
        
        // Create or update the product in Stripe
        let product;
        if (plan.stripe_product_id) {
          try {
            // Try to update existing product
            product = await stripe.products.update(plan.stripe_product_id, {
              name: plan.name,
              description: plan.description,
              active: plan.active,
              metadata: {
                tier: plan.tier,
                maxTechnicians: plan.max_technicians.toString(),
                maxClients: plan.max_clients?.toString() || 'unlimited',
                maxProjects: plan.max_projects?.toString() || 'unlimited',
              }
            });
          } catch (error) {
            // If update fails, create new product
            product = await stripe.products.create({
              name: plan.name,
              description: plan.description,
              active: plan.active,
              metadata: {
                tier: plan.tier,
                maxTechnicians: plan.max_technicians.toString(),
                maxClients: plan.max_clients?.toString() || 'unlimited',
                maxProjects: plan.max_projects?.toString() || 'unlimited',
              }
            });
          }
        } else {
          // Create new product
          product = await stripe.products.create({
            name: plan.name,
            description: plan.description,
            active: plan.active,
            metadata: {
              tier: plan.tier,
              maxTechnicians: plan.max_technicians.toString(),
              maxClients: plan.max_clients?.toString() || 'unlimited',
              maxProjects: plan.max_projects?.toString() || 'unlimited',
            }
          });
        }

        // Create a new price in Stripe
        // Note: Stripe prices cannot be updated once created, so we always create a new one if needed
        let price;
        if (plan.stripe_price_id) {
          try {
            // Try to retrieve existing price
            price = await stripe.prices.retrieve(plan.stripe_price_id);
            
            // If price details don't match, create a new one
            if (price.unit_amount !== plan.price || 
               (plan.billing_cycle === 'monthly' && price.recurring.interval !== 'month') ||
               (plan.billing_cycle === 'yearly' && price.recurring.interval !== 'year')) {
              
              console.log(`  Price details changed - creating new price`);
              price = await stripe.prices.create({
                product: product.id,
                unit_amount: plan.price,
                currency: 'usd',
                recurring: {
                  interval: plan.billing_cycle === 'monthly' ? 'month' : 'year'
                },
                metadata: {
                  tier: plan.tier,
                  billingCycle: plan.billing_cycle
                }
              });
            }
          } catch (error) {
            // If retrieval fails, create new price
            price = await stripe.prices.create({
              product: product.id,
              unit_amount: plan.price,
              currency: 'usd',
              recurring: {
                interval: plan.billing_cycle === 'monthly' ? 'month' : 'year'
              },
              metadata: {
                tier: plan.tier,
                billingCycle: plan.billing_cycle
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
              interval: plan.billing_cycle === 'monthly' ? 'month' : 'year'
            },
            metadata: {
              tier: plan.tier,
              billingCycle: plan.billing_cycle
            }
          });
        }

        // Update the plan in the database with Stripe IDs
        await pool.query(`
          UPDATE subscription_plans
          SET 
            stripe_product_id = $1,
            stripe_price_id = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [product.id, price.id, plan.id]);

        console.log(`Successfully created/updated Stripe plan: ${plan.name}`);
        console.log(`  Product ID: ${product.id}`);
        console.log(`  Price ID: ${price.id}`);
      } catch (error) {
        console.error(`Error processing plan "${plan.name}":`, error);
      }
    }
    
    console.log("Stripe plan creation completed");
  } catch (error) {
    console.error("Script error:", error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the script
createStripePlans().catch(console.error);