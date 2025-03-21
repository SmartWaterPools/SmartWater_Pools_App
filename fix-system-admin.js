/**
 * This script updates the role of the system admin user based on email
 * to ensure the user with email Travis@SmartWaterPools.com has system_admin role
 */
import { pool } from './server/db.js';

async function updateSystemAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('Starting system admin user role update...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Find user by email (case-insensitive)
    const userResult = await client.query(
      `SELECT * FROM "users" WHERE LOWER(email) = LOWER($1)`,
      ['Travis@SmartWaterPools.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('System admin user not found. No updates needed.');
      await client.query('COMMIT');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`Found user: ID=${user.id}, Username=${user.username}, Current Role=${user.role}`);
    
    // Only update if the role is not already system_admin
    if (user.role !== 'system_admin') {
      console.log(`Updating user ${user.id} (${user.email}) role to system_admin`);
      
      await client.query(
        `UPDATE "users" SET role = $1 WHERE id = $2`,
        ['system_admin', user.id]
      );
      
      console.log(`Successfully updated role to system_admin for user: ${user.email}`);
    } else {
      console.log(`User ${user.id} (${user.email}) already has system_admin role. No update needed.`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('System admin user role update completed successfully.');
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error updating system admin user:', error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}

// Run the function
updateSystemAdminUser()
  .then(() => {
    console.log('Update completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Update failed:', err);
    process.exit(1);
  });