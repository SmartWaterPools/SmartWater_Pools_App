import { runMigration as addOrganizationId } from './migrations/add-organization-id-to-users';
import { runMigration as addGoogleOAuth } from './migrations/add-google-oauth';

/**
 * Main migration runner that executes all migrations in sequence
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Run migrations in sequence
    await addOrganizationId();
    await addGoogleOAuth();
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();