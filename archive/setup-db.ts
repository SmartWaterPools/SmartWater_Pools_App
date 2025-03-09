import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Neon serverless driver
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  console.log('Creating database connection...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Creating tables directly from schema...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'client',
        phone TEXT,
        address TEXT
      );
    `);
    console.log('Created users table');

    // Create clients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        company_name TEXT,
        contract_type TEXT
      );
    `);
    console.log('Created clients table');

    // Create technicians table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        specialization TEXT,
        certifications TEXT
      );
    `);
    console.log('Created technicians table');

    // Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        name TEXT NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        estimated_completion_date DATE,
        actual_completion_date DATE,
        status TEXT NOT NULL DEFAULT 'pending',
        budget INTEGER,
        notes TEXT
      );
    `);
    console.log('Created projects table');

    // Create project_assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_assignments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        technician_id INTEGER NOT NULL REFERENCES technicians(id),
        role TEXT NOT NULL,
        assigned_date TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created project_assignments table');

    // Create maintenances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenances (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        technician_id INTEGER NOT NULL REFERENCES technicians(id),
        schedule_date DATE NOT NULL,
        completion_date DATE,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        notes TEXT
      );
    `);
    console.log('Created maintenances table');

    // Create repairs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS repairs (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        technician_id INTEGER REFERENCES technicians(id),
        issue TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        reported_date TIMESTAMP NOT NULL DEFAULT NOW(),
        scheduled_date DATE,
        completion_date DATE,
        notes TEXT
      );
    `);
    console.log('Created repairs table');

    // Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id),
        amount INTEGER NOT NULL,
        issue_date TIMESTAMP NOT NULL DEFAULT NOW(),
        due_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        description TEXT NOT NULL,
        notes TEXT
      );
    `);
    console.log('Created invoices table');

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});