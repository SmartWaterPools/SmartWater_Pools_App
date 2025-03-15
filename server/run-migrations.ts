import { runMigration as addOrganizationId } from './migrations/add-organization-id-to-users';

/**
 * Main migration runner that executes all migrations in sequence
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Run migrations in sequence
    await addOrganizationId();
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();