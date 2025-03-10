// scripts/migrate-add-coordinates.js
// This script adds latitude and longitude columns to the clients table if they don't exist

import { pool } from '../server/db.js';

async function migrateAddCoordinates() {
  try {
    console.log('Adding latitude and longitude columns to clients table if they don\'t exist...');
    
    // First check if the columns already exist
    const checkColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clients'
      AND column_name IN ('latitude', 'longitude');
    `;
    
    const { rows: existingColumns } = await pool.query(checkColumnsQuery);
    const existingColumnNames = existingColumns.map(col => col.column_name);
    
    // Add latitude column if it doesn't exist
    if (!existingColumnNames.includes('latitude')) {
      console.log('Adding latitude column...');
      await pool.query(`
        ALTER TABLE clients
        ADD COLUMN latitude double precision DEFAULT NULL;
      `);
      console.log('Latitude column added.');
    } else {
      console.log('Latitude column already exists.');
    }
    
    // Add longitude column if it doesn't exist
    if (!existingColumnNames.includes('longitude')) {
      console.log('Adding longitude column...');
      await pool.query(`
        ALTER TABLE clients
        ADD COLUMN longitude double precision DEFAULT NULL;
      `);
      console.log('Longitude column added.');
    } else {
      console.log('Longitude column already exists.');
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateAddCoordinates();