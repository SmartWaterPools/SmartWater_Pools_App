import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

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
    console.log("Creating communication_providers table...");
    
    // Create communication_providers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS communication_providers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        client_id TEXT,
        client_secret TEXT,
        api_key TEXT,
        account_sid TEXT,
        auth_token TEXT,
        refresh_token TEXT,
        access_token TEXT,
        token_expires_at TIMESTAMP,
        email TEXT,
        phone_number TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_used TIMESTAMP,
        settings TEXT
      );
    `);
    console.log("✅ Created communication_providers table");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error creating table:", error);
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