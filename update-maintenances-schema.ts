import { PgDatabase } from "drizzle-orm/pg-core";
import { db } from "./server/db";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";

// This script adds the new columns needed for SmartWater style reports to the maintenances table
async function main() {
  console.log("Starting maintenance table schema update...");
  
  try {
    // Create a pool and connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Execute raw SQL to add columns if they don't exist
    // We use ALTER TABLE IF NOT EXISTS syntax to avoid errors if columns already exist
    await pool.query(`
      ALTER TABLE IF EXISTS maintenances 
      ADD COLUMN IF NOT EXISTS route_name TEXT,
      ADD COLUMN IF NOT EXISTS invoice_amount INTEGER,
      ADD COLUMN IF NOT EXISTS labor_cost INTEGER,
      ADD COLUMN IF NOT EXISTS total_chemical_cost INTEGER,
      ADD COLUMN IF NOT EXISTS profit_amount INTEGER,
      ADD COLUMN IF NOT EXISTS profit_percentage INTEGER,
      ADD COLUMN IF NOT EXISTS route_order INTEGER,
      ADD COLUMN IF NOT EXISTS service_time_minutes INTEGER,
      ADD COLUMN IF NOT EXISTS mileage INTEGER,
      ADD COLUMN IF NOT EXISTS fuel_cost INTEGER,
      ADD COLUMN IF NOT EXISTS is_on_time BOOLEAN,
      ADD COLUMN IF NOT EXISTS issues TEXT,
      ADD COLUMN IF NOT EXISTS service_efficiency INTEGER;
    `);
    
    console.log("Successfully updated maintenances table schema");
    
    // Close the connection
    await pool.end();
    
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error updating maintenances table schema:", error);
    process.exit(1);
  }
}

// Run the migration
main().then(() => {
  console.log("Migration completed successfully");
  process.exit(0);
}).catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});