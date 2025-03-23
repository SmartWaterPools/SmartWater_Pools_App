/**
 * Script to create or update a test admin user with a known password
 */
import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

async function createTestAdminUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Generate a bcrypt hash for the password "testadmin123"
    const saltRounds = 10;
    const password = 'testadmin123';
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log(`Generated hash for password "${password}": ${hashedPassword}`);
    
    // Update the admin user with ID 9 to use this password
    const result = await pool.query(
      `UPDATE users 
       SET password = $1, active = true 
       WHERE id = 9 AND username = 'admin'
       RETURNING id, username, name, email, role`,
      [hashedPassword]
    );
    
    if (result.rows.length > 0) {
      console.log('Successfully updated admin user:');
      console.log(result.rows[0]);
      console.log(`\nYou can now log in with:\nUsername: admin\nPassword: ${password}`);
    } else {
      console.log('Admin user not found or not updated');
      
      // Create a new admin user if not found
      console.log('Creating new admin user...');
      const insertResult = await pool.query(
        `INSERT INTO users (username, password, name, email, role, organization_id, active, auth_provider)
         VALUES ('testadmin', $1, 'Test Administrator', 'testadmin@example.com', 'admin', 1, true, 'local')
         RETURNING id, username, name, email, role`,
        [hashedPassword]
      );
      
      if (insertResult.rows.length > 0) {
        console.log('Successfully created new admin user:');
        console.log(insertResult.rows[0]);
        console.log(`\nYou can now log in with:\nUsername: testadmin\nPassword: ${password}`);
      } else {
        console.error('Failed to create new admin user');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createTestAdminUser().catch(console.error);