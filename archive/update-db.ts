import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function main() {
  // Create a Postgres client
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log("Starting schema update for Pentair Builder features...");
    
    // Add new columns to projects table
    await db.execute(sql`
      ALTER TABLE IF EXISTS projects
      ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS template_name TEXT,
      ADD COLUMN IF NOT EXISTS template_category TEXT;
    `);
    console.log("✅ Updated projects table");

    // Add new fields to project_phases table
    await db.execute(sql`
      ALTER TABLE IF EXISTS project_phases
      ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,
      ADD COLUMN IF NOT EXISTS actual_duration INTEGER,
      ADD COLUMN IF NOT EXISTS cost INTEGER,
      ADD COLUMN IF NOT EXISTS permit_required BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS inspection_date DATE,
      ADD COLUMN IF NOT EXISTS inspection_passed BOOLEAN,
      ADD COLUMN IF NOT EXISTS inspection_notes TEXT;
    `);
    console.log("✅ Updated project_phases table");

    // Update project_assignments table
    await db.execute(sql`
      ALTER TABLE IF EXISTS project_assignments
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS phase_id INTEGER REFERENCES project_phases(id),
      ADD COLUMN IF NOT EXISTS is_lead BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS start_date DATE,
      ADD COLUMN IF NOT EXISTS end_date DATE,
      ADD COLUMN IF NOT EXISTS hours_allocated INTEGER,
      ADD COLUMN IF NOT EXISTS hours_logged INTEGER DEFAULT 0;
    `);
    console.log("✅ Updated project_assignments table");

    // Create phase_resources table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS phase_resources (
        id SERIAL PRIMARY KEY,
        phase_id INTEGER NOT NULL REFERENCES project_phases(id),
        resource_type TEXT NOT NULL,
        resource_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit TEXT,
        estimated_cost INTEGER,
        actual_cost INTEGER,
        notes TEXT
      );
    `);
    console.log("✅ Created phase_resources table");

    // Create project_documentation table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_documentation (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        phase_id INTEGER REFERENCES project_phases(id),
        document_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        upload_date TIMESTAMP NOT NULL DEFAULT NOW(),
        tags TEXT[],
        is_public BOOLEAN DEFAULT FALSE
      );
    `);
    console.log("✅ Created project_documentation table");

    console.log("Schema update completed successfully!");
  } catch (error) {
    console.error("Error updating schema:", error);
    process.exit(1);
  } finally {
    // Close the client
    await client.end();
    console.log("Database connection closed");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error in migration script:', error);
  process.exit(1);
});