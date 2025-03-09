import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Updating maintenances table to add missing columns...");
  
  try {
    // Add route_name column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'route_name'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN route_name text; 
        END IF;
      END $$;
    `);
    console.log("Added route_name column");
    
    // Add route_order column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'route_order'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN route_order integer; 
        END IF;
      END $$;
    `);
    console.log("Added route_order column");
    
    // Add service_time_minutes column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'service_time_minutes'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN service_time_minutes integer; 
        END IF;
      END $$;
    `);
    console.log("Added service_time_minutes column");
    
    // Add mileage column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'mileage'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN mileage integer; 
        END IF;
      END $$;
    `);
    console.log("Added mileage column");
    
    // Add fuel_cost column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'fuel_cost'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN fuel_cost integer; 
        END IF;
      END $$;
    `);
    console.log("Added fuel_cost column");
    
    // Add is_on_time column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'is_on_time'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN is_on_time boolean; 
        END IF;
      END $$;
    `);
    console.log("Added is_on_time column");
    
    // Add issues column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'issues'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN issues text; 
        END IF;
      END $$;
    `);
    console.log("Added issues column");
    
    // Add service_efficiency column if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'maintenances' AND column_name = 'service_efficiency'
        ) THEN 
          ALTER TABLE maintenances ADD COLUMN service_efficiency integer; 
        END IF;
      END $$;
    `);
    console.log("Added service_efficiency column");
    
    console.log("Successfully updated maintenances table");
  } catch (error) {
    console.error("Error updating maintenances table:", error);
    process.exit(1);
  }
}

main().then(() => {
  console.log("Migration completed");
  process.exit(0);
});