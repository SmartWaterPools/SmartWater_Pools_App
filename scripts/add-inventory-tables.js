// Script to add inventory-related tables to the database
import pg from 'pg';
const { Pool } = pg;

// Create a direct database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log("Starting database update to add inventory tables...");
  
  try {
    // Add inventory_items table
    console.log("Creating inventory_items table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        unit_cost INTEGER,
        unit_price INTEGER,
        minimum_stock INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        vendor_id INTEGER,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // Add warehouses table
    console.log("Creating warehouses table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        phone TEXT,
        manager_id INTEGER,
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // Add technician_vehicles table
    console.log("Creating technician_vehicles table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS technician_vehicles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        make TEXT,
        model TEXT,
        year INTEGER,
        license_plate TEXT,
        vin TEXT,
        technician_id INTEGER NOT NULL REFERENCES technicians(id),
        organization_id INTEGER NOT NULL REFERENCES organizations(id),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // Add warehouse_inventory table
    console.log("Creating warehouse_inventory table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_inventory (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        inventory_item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        location TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // Add vehicle_inventory table
    console.log("Creating vehicle_inventory table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_inventory (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES technician_vehicles(id),
        inventory_item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    
    // Add inventory_transfers table
    console.log("Creating inventory_transfers table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id SERIAL PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        destination_type TEXT NOT NULL,
        destination_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_by_user_id INTEGER NOT NULL REFERENCES users(id),
        requested_at TIMESTAMP DEFAULT now() NOT NULL,
        approved_by_user_id INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        completed_by_user_id INTEGER REFERENCES users(id),
        completed_at TIMESTAMP,
        notes TEXT
      );
    `);
    
    // Add inventory_transfer_items table
    console.log("Creating inventory_transfer_items table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_transfer_items (
        id SERIAL PRIMARY KEY,
        transfer_id INTEGER NOT NULL REFERENCES inventory_transfers(id),
        inventory_item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT
      );
    `);
    
    // Add barcodes table
    console.log("Creating barcodes table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barcodes (
        id SERIAL PRIMARY KEY,
        barcode TEXT NOT NULL UNIQUE,
        item_id INTEGER NOT NULL,
        item_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        created_by INTEGER REFERENCES users(id),
        is_active BOOLEAN DEFAULT true NOT NULL
      );
    `);
    
    // Add barcode_scan_history table
    console.log("Creating barcode_scan_history table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barcode_scan_history (
        id SERIAL PRIMARY KEY,
        barcode_id INTEGER NOT NULL REFERENCES barcodes(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        scanned_at TIMESTAMP DEFAULT now() NOT NULL,
        location TEXT,
        action_type TEXT NOT NULL,
        notes TEXT,
        device_info TEXT
      );
    `);
    
    // Add inventory_adjustments table
    console.log("Creating inventory_adjustments table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id SERIAL PRIMARY KEY,
        adjustment_date TIMESTAMP DEFAULT now() NOT NULL,
        location_type TEXT NOT NULL,
        location_id INTEGER NOT NULL,
        inventory_item_id INTEGER NOT NULL,
        previous_quantity INTEGER NOT NULL,
        new_quantity INTEGER NOT NULL,
        reason TEXT NOT NULL,
        performed_by_user_id INTEGER NOT NULL REFERENCES users(id),
        maintenance_id INTEGER REFERENCES maintenances(id),
        repair_id INTEGER REFERENCES repairs(id),
        notes TEXT
      );
    `);
    
    console.log("Successfully created all inventory-related tables!");
    
  } catch (error) {
    console.error("Error creating inventory tables:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("Database update completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error updating database:", error);
    process.exit(1);
  });