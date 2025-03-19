// Script to create a system admin account with specified credentials
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Create database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function createSystemAdmin() {
  try {
    // Check if the user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      ['Travis@smartwaterpools.com', 'Travis@smartwaterpools.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('User already exists, updating password and role...');
      
      // Hash the password
      const hashedPassword = await hashPassword('@SmartWaterPools239');
      
      // Update the existing user to be a system_admin
      await pool.query(
        'UPDATE users SET password = $1, role = $2 WHERE id = $3',
        [hashedPassword, 'system_admin', existingUser.rows[0].id]
      );
      
      console.log(`User ID ${existingUser.rows[0].id} updated successfully to system_admin with the new password`);
      return;
    }
    
    // Get the organization ID (assuming first org is the default)
    const orgResult = await pool.query('SELECT id FROM organizations LIMIT 1');
    const organizationId = orgResult.rows.length > 0 ? orgResult.rows[0].id : 1;
    
    // Hash the password
    const hashedPassword = await hashPassword('@SmartWaterPools239');
    
    // Insert the new system admin user with only the fields that exist in the table
    const result = await pool.query(
      `INSERT INTO users (
        username, 
        password, 
        name, 
        email, 
        role, 
        organization_id,
        active,
        auth_provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username`,
      [
        'Travis@smartwaterpools.com',
        hashedPassword,
        'Travis',
        'Travis@smartwaterpools.com',
        'system_admin',
        organizationId,
        true,
        'local'
      ]
    );
    
    console.log(`System admin user created successfully: ${result.rows[0].username} (ID: ${result.rows[0].id})`);
    
  } catch (error) {
    console.error('Error creating system admin user:', error);
  } finally {
    await pool.end();
  }
}

// Run the create function
createSystemAdmin();