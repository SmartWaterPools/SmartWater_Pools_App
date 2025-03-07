import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './shared/schema';

async function main() {
  console.log('Updating database schema...');
  
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  console.log('Pushing schema changes to database...');
  
  try {
    // Clients table updates
    await sql`
      ALTER TABLE IF EXISTS clients
      ADD COLUMN IF NOT EXISTS service_level TEXT,
      ADD COLUMN IF NOT EXISTS custom_service_instructions TEXT[]
    `;
    
    // Projects table updates for construction module
    await sql`
      ALTER TABLE IF EXISTS projects
      ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'construction',
      ADD COLUMN IF NOT EXISTS current_phase TEXT,
      ADD COLUMN IF NOT EXISTS percent_complete INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS permit_details TEXT
    `;
    
    // Create project_phases table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS project_phases (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        description TEXT,
        start_date TEXT,
        end_date TEXT,
        percent_complete INTEGER,
        notes TEXT,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        "order" INTEGER NOT NULL
      )
    `;
    
    // Create service_templates table if it doesn't exist
    await sql`
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
    `;
    
    console.log('Schema updated successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await sql.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});