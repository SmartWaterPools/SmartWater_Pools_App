import { pool } from '../db';

export async function runMigration() {
  console.log('Running migration: add-display-order-to-routes.ts');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bazza_routes' AND column_name = 'display_order'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding display_order column to bazza_routes table');
      await client.query(`
        ALTER TABLE bazza_routes
        ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0
      `);
    } else {
      console.log('display_order column already exists');
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
