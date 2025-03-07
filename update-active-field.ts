import * as schema from './shared/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    // Create a PostgreSQL client
    const connectionString = process.env.DATABASE_URL || '';
    console.log('Connecting to database...');
    const client = postgres(connectionString, { max: 1 });
    
    // Create a drizzle instance
    const db = drizzle(client);
    
    // Try to add the active column if it doesn't exist
    try {
      console.log('Adding active column to users table...');
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;`
      );
      console.log('Column added successfully or already exists.');
    } catch (error) {
      console.error('Error adding active column:', error);
      throw error;
    }
    
    console.log('Database update completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

main();