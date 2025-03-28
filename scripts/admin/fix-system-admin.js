/**
 * This script updates the role of the system admin user based on email
 * to ensure the user with email Travis@SmartWaterPools.com has system_admin role
 */
import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

async function updateSystemAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Looking for user with email Travis@SmartWaterPools.com...');
    
    // First, check if the Travis@SmartWaterPools.com user exists
    let result = await pool.query(
      `SELECT id, username, name, email, role, organization_id, active
       FROM users
       WHERE LOWER(email) = LOWER('Travis@SmartWaterPools.com')`
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Found Travis@SmartWaterPools.com user:', user);
      
      // Set a new password for this user
      const saltRounds = 10;
      const password = 'sysadmin123';
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Update the user to make sure they have system_admin role
      const updateResult = await pool.query(
        `UPDATE users
         SET role = 'system_admin', active = true, password = $1
         WHERE id = $2
         RETURNING id, username, name, email, role`,
        [hashedPassword, user.id]
      );
      
      if (updateResult.rows.length > 0) {
        console.log('Successfully updated system admin user:');
        console.log(updateResult.rows[0]);
        console.log(`\nYou can now log in with:\nUsername: ${updateResult.rows[0].username}\nPassword: ${password}`);
      } else {
        console.error('Failed to update system admin user');
      }
    } else {
      console.log('No user found with email Travis@SmartWaterPools.com');
      
      // Find the SmartWater Pools organization ID (should be 1, but let's verify)
      const orgResult = await pool.query(
        `SELECT id, name FROM organizations WHERE LOWER(name) LIKE LOWER('%SmartWater%') OR id = 1`
      );
      
      let organizationId = 1;
      if (orgResult.rows.length > 0) {
        organizationId = orgResult.rows[0].id;
        console.log(`Found SmartWater Pools organization with ID: ${organizationId}`);
      } else {
        console.log('SmartWater Pools organization not found. Using default ID: 1');
      }
      
      // Create the system admin user
      const saltRounds = 10;
      const password = 'sysadmin123';
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const insertResult = await pool.query(
        `INSERT INTO users (username, password, name, email, role, organization_id, active, auth_provider)
         VALUES ('travis', $1, 'Travis DeRisi', 'Travis@SmartWaterPools.com', 'system_admin', $2, true, 'local')
         RETURNING id, username, name, email, role`,
        [hashedPassword, organizationId]
      );
      
      if (insertResult.rows.length > 0) {
        console.log('Successfully created system admin user:');
        console.log(insertResult.rows[0]);
        console.log(`\nYou can now log in with:\nUsername: travis\nPassword: ${password}`);
      } else {
        console.error('Failed to create system admin user');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

updateSystemAdminUser().catch(console.error);