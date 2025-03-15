import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration to add the organization_id column to the users table
 * and create default organizations for the multi-tenant system.
 */
export async function runMigration() {
  console.log("Starting migration: Adding organization_id to users table...");

  try {
    // Check if the organizations table exists, if not create it
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        logo TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_system_admin BOOLEAN DEFAULT false
      );
    `);

    console.log("Organizations table verified/created");

    // Create default organizations if they don't exist
    const mainOrg = await db.execute(sql`
      INSERT INTO organizations (name, slug, is_system_admin)
      VALUES ('SmartWater Pools', 'smartwater-pools', true)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id;
    `);

    await db.execute(sql`
      INSERT INTO organizations (name, slug)
      VALUES ('Pacific Pool Services', 'pacific-pool-services')
      ON CONFLICT (slug) DO NOTHING;
    `);

    await db.execute(sql`
      INSERT INTO organizations (name, slug)
      VALUES ('Desert Oasis Pools', 'desert-oasis-pools')
      ON CONFLICT (slug) DO NOTHING;
    `);

    console.log("Default organizations created/verified");

    // Check if organization_id column already exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'organization_id';
    `);

    const columnExists = result.rows.length > 0;

    if (!columnExists) {
      // Adding the organization_id column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN organization_id INTEGER;
      `);

      console.log("Added organization_id column to users table");

      // Get the ID of SmartWater Pools organization
      const orgResult = await db.execute(sql`
        SELECT id FROM organizations WHERE slug = 'smartwater-pools';
      `);

      const orgId = orgResult.rows[0]?.id || 1;

      // Update existing users to have the default organization ID
      await db.execute(sql`
        UPDATE users
        SET organization_id = ${orgId}
        WHERE organization_id IS NULL;
      `);

      console.log(`Set default organization_id (${orgId}) for existing users`);

      // Make the organization_id column not null
      await db.execute(sql`
        ALTER TABLE users
        ALTER COLUMN organization_id SET NOT NULL;
      `);

      console.log("Set organization_id column to NOT NULL");

      // Add foreign key constraint
      await db.execute(sql`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id);
      `);

      console.log("Added foreign key constraint to organization_id");
    } else {
      console.log("organization_id column already exists in users table");
    }

    console.log("Migration completed successfully");
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}