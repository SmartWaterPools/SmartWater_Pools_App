// Run the subscription tables migration directly
import { runMigration } from './server/migrations/add-subscription-tables.js';

async function run() {
  try {
    console.log('Starting subscription tables migration...');
    await runMigration();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

run();