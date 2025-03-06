import { drizzle } from 'drizzle-orm/pg-core';
import { migrate } from 'drizzle-orm/pg-core/migrator';
import { Pool } from 'pg';
import * as schema from './shared/schema.js';

async function main() {
  console.log('Updating database schema...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  console.log('Pushing schema changes to database...');
  
  try {
    // Clients table updates
    await pool.query(`
      ALTER TABLE IF EXISTS clients
      ADD COLUMN IF NOT EXISTS service_level TEXT,
      ADD COLUMN IF NOT EXISTS custom_service_instructions TEXT[]
    `);
    
    // Create service_templates table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        checklist_items TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log('Schema updated successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});