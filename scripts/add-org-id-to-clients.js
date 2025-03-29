import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

async function main() {
  console.log('Starting database update script to add organization_id to clients table...');
  
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('Checking if organization_id column exists in clients table...');
    
    // First check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'organization_id';
    `;
    
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rowCount > 0) {
      console.log('organization_id column already exists in clients table.');
    } else {
      console.log('Adding organization_id column to clients table...');
      
      // Add the column if it doesn't exist
      const addColumnQuery = `
        ALTER TABLE clients 
        ADD COLUMN organization_id INTEGER REFERENCES organizations(id);
      `;
      
      await pool.query(addColumnQuery);
      console.log('organization_id column added successfully to clients table.');
    }
    
    // Now populate the column based on user organization relationships
    console.log('Populating organization_id for existing clients...');
    
    const updateQuery = `
      UPDATE clients c
      SET organization_id = u.organization_id
      FROM users u
      WHERE c.user_id = u.id AND c.organization_id IS NULL AND u.organization_id IS NOT NULL;
    `;
    
    const updateResult = await pool.query(updateQuery);
    console.log(`Updated ${updateResult.rowCount} client records with organization_id.`);
    
    console.log('Database update completed successfully.');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error in main function:', err);
  process.exit(1);
});