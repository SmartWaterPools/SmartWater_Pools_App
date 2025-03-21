/**
 * Script to run the inventory organization ID migration
 * This adds organization_id column to inventory-related tables for proper tenant isolation
 */

const { execSync } = require('child_process');

console.log('🚀 Running inventory organization ID migration...');

try {
  // Import the migration module and run it
  execSync('npx tsx server/migrations/add-organization-id-to-inventory.ts', {
    stdio: 'inherit',
  });
  
  console.log('✅ Inventory migration completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}