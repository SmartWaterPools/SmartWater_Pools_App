import pg from 'pg';
const { Pool } = pg;

async function cleanupDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('Cleaning up database...');

  try {
    // Delete all data from the tables in reverse order of dependencies
    await pool.query('DELETE FROM pool_images');
    await pool.query('DELETE FROM pool_equipment');
    await pool.query('DELETE FROM invoices');
    await pool.query('DELETE FROM repairs');
    await pool.query('DELETE FROM maintenances');
    await pool.query('DELETE FROM project_assignments');
    await pool.query('DELETE FROM projects');
    await pool.query('DELETE FROM technicians');
    await pool.query('DELETE FROM clients');
    await pool.query('DELETE FROM users');

    // Reset sequences
    await pool.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE clients_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE technicians_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE projects_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE project_assignments_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE maintenances_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE repairs_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE invoices_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE pool_equipment_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE pool_images_id_seq RESTART WITH 1');

    console.log('Database cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up database:', error);
  } finally {
    await pool.end();
  }
}

cleanupDatabase();