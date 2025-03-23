/**
 * Script to create Stripe products and prices for all subscription plans
 * This ensures all plans are available in Stripe for checkout
 */

require("dotenv").config();
const { getStripeService } = require("./server/stripe-service");
const { DatabaseStorage } = require("./server/storage");
const { pool, db } = require("./server/db");

async function createStripePlans() {
  console.log("Starting Stripe plan creation process...");
  
  try {
    const storage = new DatabaseStorage(db);
    const stripeService = getStripeService(storage);
    
    // Fetch all active subscription plans
    const plans = await storage.getAllSubscriptionPlans();
    console.log(`Found ${plans.length} subscription plans in database`);
    
    // Create Stripe products and prices for each plan
    for (const plan of plans) {
      console.log(`Processing plan: ${plan.name} (${plan.tier} - ${plan.billingCycle})`);
      
      try {
        // Skip if already has Stripe IDs and is active
        if (plan.stripeProductId && plan.stripePriceId && plan.active) {
          console.log(`Plan "${plan.name}" already has Stripe IDs and is active - skipping`);
          continue;
        }
        
        // Create or update the Stripe product and price
        const updatedPlan = await stripeService.createStripePlan(plan);
        console.log(`Successfully created/updated Stripe plan: ${updatedPlan.name}`);
        console.log(`  Product ID: ${updatedPlan.stripeProductId}`);
        console.log(`  Price ID: ${updatedPlan.stripePriceId}`);
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