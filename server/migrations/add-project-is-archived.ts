import { pool } from '../db';

/**
 * Migration to add is_archived field to projects table
 */
export async function runMigration() {
  console.log('Running migration: add-project-is-archived.ts');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const checkIsArchivedColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'is_archived'
    `);
    
    if (checkIsArchivedColumn.rows.length === 0) {
      console.log('Adding is_archived column to projects table');
      await client.query(`
        ALTER TABLE projects 
        ADD COLUMN is_archived BOOLEAN DEFAULT false
      `);
    } else {
      console.log('is_archived column already exists');
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully');
    
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}
