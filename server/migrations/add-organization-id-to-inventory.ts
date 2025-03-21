/**
 * Migration to add organization_id column to inventory-related tables
 * for proper tenant isolation
 */

import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function runMigration() {
  console.log('Starting migration: add-organization-id-to-inventory');

  // Check if columns already exist to avoid errors
  const tables = [
    { name: 'inventory_items', column: 'organization_id' },
    { name: 'warehouses', column: 'organization_id' },
    { name: 'inventory_transfers', column: 'organization_id' },
    { name: 'inventory_adjustments', column: 'organization_id' }
  ];

  for (const table of tables) {
    try {
      // Check if column exists
      const checkResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table.name} 
        AND column_name = ${table.column}
      `);

      // If column doesn't exist, add it
      if (checkResult.rows.length === 0) {
        console.log(`Adding ${table.column} to ${table.name} table...`);
        
        // Add the column
        await db.execute(sql`
          ALTER TABLE ${sql.identifier(table.name)}
          ADD COLUMN ${sql.identifier(table.column)} INTEGER REFERENCES organizations(id)
        `);
        
        // Set default organization_id = 1 for existing records
        await db.execute(sql`
          UPDATE ${sql.identifier(table.name)}
          SET ${sql.identifier(table.column)} = 1
          WHERE ${sql.identifier(table.column)} IS NULL
        `);
        
        // Make the column NOT NULL after populating it
        await db.execute(sql`
          ALTER TABLE ${sql.identifier(table.name)}
          ALTER COLUMN ${sql.identifier(table.column)} SET NOT NULL
        `);
        
        console.log(`${table.column} added to ${table.name} table and populated successfully`);
      } else {
        console.log(`Column ${table.column} already exists in ${table.name} table`);
      }
    } catch (error) {
      console.error(`Error adding ${table.column} to ${table.name}:`, error);
      throw error;
    }
  }

  console.log('Migration completed: add-organization-id-to-inventory');
}

// Export a function to run the migration independently
export default async function() {
  try {
    await runMigration();
    console.log('Inventory organization ID migration completed successfully');
  } catch (error) {
    console.error('Inventory organization ID migration failed:', error);
    process.exit(1);
  }
}