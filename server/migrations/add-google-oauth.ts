import { pool } from '../db';

/**
 * Migration to add Google OAuth fields to the users table
 */
export async function runMigration() {
  console.log('Running migration: add-google-oauth.ts');

  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if googleId column exists
    const checkGoogleIdColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'google_id'
    `);
    
    // Add the googleId column if it doesn't exist
    if (checkGoogleIdColumn.rows.length === 0) {
      console.log('Adding google_id column to users table');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN google_id TEXT UNIQUE
      `);
    } else {
      console.log('google_id column already exists');
    }
    
    // Check if photoUrl column exists
    const checkPhotoUrlColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'photo_url'
    `);
    
    // Add the photoUrl column if it doesn't exist
    if (checkPhotoUrlColumn.rows.length === 0) {
      console.log('Adding photo_url column to users table');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN photo_url TEXT
      `);
    } else {
      console.log('photo_url column already exists');
    }
    
    // Check if authProvider column exists
    const checkAuthProviderColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'auth_provider'
    `);
    
    // Add the authProvider column if it doesn't exist
    if (checkAuthProviderColumn.rows.length === 0) {
      console.log('Adding auth_provider column to users table');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN auth_provider TEXT DEFAULT 'local'
      `);
    } else {
      console.log('auth_provider column already exists');
    }
    
    // Check if password column allows NULL values
    const checkPasswordColumn = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    `);
    
    // Modify the password column to allow NULL values if it doesn't already
    if (checkPasswordColumn.rows.length > 0 && checkPasswordColumn.rows[0].is_nullable === 'NO') {
      console.log('Modifying password column to allow NULL values');
      await client.query(`
        ALTER TABLE users 
        ALTER COLUMN password DROP NOT NULL
      `);
    } else {
      console.log('password column already allows NULL values or does not exist');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully');
    
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the migration if this file is executed directly
// Using ES modules approach
if (import.meta.url === import.meta.resolve('./add-google-oauth.ts')) {
  runMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration script error:', error);
      process.exit(1);
    });
}