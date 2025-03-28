// Script to update admin password with proper bcrypt hashing
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function updateAdminPassword() {
  try {
    // Get the admin user(s)
    const adminUsers = await pool.query('SELECT id, username FROM users WHERE role = $1', ['admin']);
    
    if (adminUsers.rows.length === 0) {
      console.log('No admin users found');
      return;
    }
    
    // Hash the password "cookie" with bcrypt
    const hashedPassword = await hashPassword('cookie');
    
    // Update each admin user's password
    for (const user of adminUsers.rows) {
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      console.log(`Updated password for admin user: ${user.username} (ID: ${user.id})`);
    }
    
    console.log('Admin password(s) updated successfully');
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await pool.end();
  }
}

// Run the update function
updateAdminPassword();