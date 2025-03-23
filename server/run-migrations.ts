import { runMigration as addOrganizationId } from './migrations/add-organization-id-to-users';
import { runMigration as addGoogleOAuth } from './migrations/add-google-oauth';
import { runMigration as addInventoryOrganizationId } from './migrations/add-organization-id-to-inventory';
import { runMigration as addSubscriptionTables } from './migrations/add-subscription-tables';

/**
 * Main migration runner that executes all migrations in sequence
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Run migrations in sequence
    await addOrganizationId();
    await addGoogleOAuth();
    await addInventoryOrganizationId();
    await addSubscriptionTables();
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();