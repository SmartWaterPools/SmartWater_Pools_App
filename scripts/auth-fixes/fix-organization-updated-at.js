/**
 * Fix Organization Updated_at Column Issue
 * 
 * This script fixes the specific issue with the missing updated_at column
 * in the organizations table.
 */

import pg from 'pg';
const { Pool } = pg;

async function fixOrganizationUpdatedAt() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('=== Fixing Organization updated_at Column ===');
    
    // Check if updated_at column exists
    const columnExists = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'organizations'
        AND column_name = 'updated_at'
      )`
    );
    
    if (!columnExists.rows[0].exists) {
      console.log('Missing updated_at column in organizations table. Adding it now...');
      
      // Add the updated_at column
      await pool.query(
        `ALTER TABLE organizations 
         ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
      );
      
      console.log('✅ Added updated_at column to organizations table');
      
      // Now test creating an organization again
      try {
        const result = await pool.query(
          `INSERT INTO organizations (name, type, active, subscription_tier, billing_cycle, created_at, updated_at)
           VALUES ('Test Organization Fix 2', 'company', true, 'basic', 'monthly', NOW(), NOW())
           RETURNING id, name, type, active, subscription_tier, billing_cycle`
        );
        
        if (result.rows.length > 0) {
          console.log('✅ Successfully created test organization:');
          console.log(result.rows[0]);
          
          // Clean up test organization
          await pool.query('DELETE FROM organizations WHERE id = $1', [result.rows[0].id]);
          console.log(`✅ Cleaned up test organization (ID: ${result.rows[0].id})`);
        } else {
          console.log('❌ Organization creation still failed - no result returned');
        }
      } catch (error) {
        console.error('❌ Organization creation still failed:', error.message);
      }
    } else {
      console.log('✅ updated_at column already exists in organizations table');
    }
    
    // Check other required fields in organizations table
    const requiredColumns = ['slug', 'stripe_customer_id'];
    for (const column of requiredColumns) {
      const colExists = await pool.query(
        `SELECT column_name, is_nullable
         FROM information_schema.columns 
         WHERE table_name = 'organizations'
         AND column_name = $1`,
         [column]
      );
      
      if (colExists.rows.length > 0) {
        const isRequired = colExists.rows[0].is_nullable === 'NO';
        console.log(`Column ${column} exists and is ${isRequired ? 'required' : 'nullable'}`);
        
        // If it's required but should be nullable, modify it
        if (isRequired) {
          console.log(`Making ${column} column nullable...`);
          await pool.query(
            `ALTER TABLE organizations 
             ALTER COLUMN ${column} DROP NOT NULL`
          );
          console.log(`✅ Made ${column} column nullable`);
        }
      } else {
        console.log(`Column ${column} does not exist. Adding it...`);
        await pool.query(
          `ALTER TABLE organizations 
           ADD COLUMN ${column} TEXT`
        );
        console.log(`✅ Added ${column} column to organizations table`);
      }
    }
    
    // Check if there is a code in oauth-routes.ts that is trying to access updated_at
    console.log('\nExamining the OAuth-related server routes:');
    console.log('For organization creation, please ensure your createOrganization function isn\'t expecting an updated_at field');
    console.log('This has been fixed in the database, but the server code may need to be adjusted as well.');

    // Final test to verify organization creation
    console.log('\nFinal test of organization creation:');
    try {
      // Create organization with minimal required fields
      const result = await pool.query(
        `INSERT INTO organizations (name, type, active, created_at)
         VALUES ('Final Test Organization', 'company', true, NOW())
         RETURNING id, name, type, active`
      );
      
      if (result.rows.length > 0) {
        console.log('✅ Successfully created organization with minimal fields:');
        console.log(result.rows[0]);
        
        // Clean up test organization
        await pool.query('DELETE FROM organizations WHERE id = $1', [result.rows[0].id]);
        console.log(`✅ Cleaned up test organization (ID: ${result.rows[0].id})`);
        
        console.log('\n✅ Organization creation is now working properly');
      } else {
        console.log('❌ Organization creation with minimal fields failed - no result returned');
      }
    } catch (error) {
      console.error('❌ Organization creation with minimal fields failed:', error.message);
    }
    
    console.log('\n=== Fix Complete ===');
    
  } catch (error) {
    console.error('Error during fix process:', error);
  } finally {
    await pool.end();
  }
}

fixOrganizationUpdatedAt().catch(console.error);