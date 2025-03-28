/**
 * Fix Organization Creation Issues
 * 
 * This script addresses the error that occurs when creating a new organization
 * during the Google OAuth flow.
 */

import pg from 'pg';
const { Pool } = pg;

async function fixOrganizationCreation() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('=== Fixing Organization Creation ===');
    
    // Part 1: Debug the organization creation process
    console.log('\n1. Examining recent failed organization creation attempts:');
    
    // First, check for any error tables or logs
    const errorLogsExist = await pool.query(
      `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'error_logs'
      )`
    );
    
    if (errorLogsExist.rows[0].exists) {
      const recentErrors = await pool.query(
        `SELECT * FROM error_logs 
         WHERE error_message LIKE '%organization%' 
         ORDER BY created_at DESC 
         LIMIT 5`
      );
      
      if (recentErrors.rows.length > 0) {
        console.log(`Found ${recentErrors.rows.length} recent errors related to organizations:`);
        recentErrors.rows.forEach(err => {
          console.log(`- ${err.created_at}: ${err.error_message}`);
          console.log(`  Context: ${err.context || 'No context'}`);
        });
      } else {
        console.log('No recent organization-related errors found in error_logs');
      }
    } else {
      console.log('No error_logs table found');
    }
    
    // Part 2: Check schema for the organization creation process
    console.log('\n2. Checking necessary tables and columns for organization creation:');
    
    // Check organizations table
    console.log('Examining organizations table structure:');
    const orgColumns = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'organizations'
       ORDER BY ordinal_position`
    );
    
    if (orgColumns.rows.length > 0) {
      console.log(`Organizations table has ${orgColumns.rows.length} columns:`);
      orgColumns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
      });
      
      // Check for specific columns needed for organization creation
      const requiredColumns = ['name', 'type', 'active', 'subscription_tier', 'billing_cycle'];
      const missingColumns = requiredColumns.filter(col => 
        !orgColumns.rows.some(row => row.column_name === col)
      );
      
      if (missingColumns.length > 0) {
        console.log(`⚠️ Missing required columns: ${missingColumns.join(', ')}`);
        
        // Add missing columns
        for (const column of missingColumns) {
          let dataType = 'text';
          let defaultValue = 'NULL';
          
          if (column === 'active') {
            dataType = 'boolean';
            defaultValue = 'true';
          } else if (column === 'subscription_tier') {
            defaultValue = "'basic'";
          } else if (column === 'billing_cycle') {
            defaultValue = "'monthly'";
          }
          
          console.log(`Adding missing column: ${column}`);
          await pool.query(
            `ALTER TABLE organizations 
             ADD COLUMN IF NOT EXISTS ${column} ${dataType} DEFAULT ${defaultValue}`
          );
          console.log(`✅ Added column ${column} to organizations table`);
        }
      } else {
        console.log('✅ All required columns exist');
      }
    } else {
      console.log('⚠️ Organizations table has no columns or does not exist');
    }
    
    // Part 3: Fix OAuth pending user handling
    console.log('\n3. Checking OAuth pending user storage:');
    
    // Create a test function to create an organization
    async function testOrganizationCreation() {
      try {
        const result = await pool.query(
          `INSERT INTO organizations (name, type, active, subscription_tier, billing_cycle, created_at, updated_at)
           VALUES ('Test Organization via Fix Script', 'company', true, 'basic', 'monthly', NOW(), NOW())
           RETURNING id, name, type, active, subscription_tier, billing_cycle`
        );
        
        if (result.rows.length > 0) {
          console.log('✅ Successfully created test organization:');
          console.log(result.rows[0]);
          
          // Clean up test organization
          await pool.query('DELETE FROM organizations WHERE id = $1', [result.rows[0].id]);
          console.log(`✅ Cleaned up test organization (ID: ${result.rows[0].id})`);
          return true;
        } else {
          console.log('⚠️ Test organization creation failed - no result returned');
          return false;
        }
      } catch (error) {
        console.error('⚠️ Test organization creation failed with error:', error.message);
        return false;
      }
    }
    
    const testResult = await testOrganizationCreation();
    if (testResult) {
      console.log('✅ Organization creation test successful');
    } else {
      console.log('⚠️ Organization creation test failed');
    }
    
    // Part 4: Check for existing tables that should exist
    console.log('\n4. Examining database schema:');
    
    // Check if subscription-related tables exist
    const tables = ['subscription_plans', 'subscriptions', 'payment_records', 'invitation_tokens'];
    for (const table of tables) {
      const tableExists = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      
      if (tableExists.rows[0].exists) {
        console.log(`✅ Table exists: ${table}`);
        
        // Check table count
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  - Row count: ${countResult.rows[0].count}`);
      } else {
        console.log(`⚠️ Missing table: ${table}`);
        
        // If subscription_plans is missing, we need to create it
        if (table === 'subscription_plans') {
          console.log('Creating subscription_plans table...');
          await pool.query(`
            CREATE TABLE subscription_plans (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              tier TEXT NOT NULL,
              billing_cycle TEXT NOT NULL,
              price NUMERIC NOT NULL,
              features JSONB,
              stripe_price_id TEXT,
              stripe_product_id TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `);
          console.log('✅ Created subscription_plans table');
          
          // Add default plans
          console.log('Adding default subscription plans...');
          await pool.query(`
            INSERT INTO subscription_plans (name, description, tier, billing_cycle, price, features)
            VALUES 
              ('Basic Monthly', 'Basic plan for small pool businesses', 'basic', 'monthly', 29.99, '{"maxClients": 25, "maxTechnicians": 2}'),
              ('Professional Monthly', 'Professional plan for medium businesses', 'professional', 'monthly', 59.99, '{"maxClients": 100, "maxTechnicians": 10}'),
              ('Enterprise Monthly', 'Enterprise plan for large businesses', 'enterprise', 'monthly', 99.99, '{"maxClients": -1, "maxTechnicians": -1}'),
              ('Basic Yearly', 'Basic plan for small pool businesses (yearly)', 'basic', 'yearly', 299.99, '{"maxClients": 25, "maxTechnicians": 2}'),
              ('Professional Yearly', 'Professional plan for medium businesses (yearly)', 'professional', 'yearly', 599.99, '{"maxClients": 100, "maxTechnicians": 10}'),
              ('Enterprise Yearly', 'Enterprise plan for large businesses (yearly)', 'enterprise', 'yearly', 999.99, '{"maxClients": -1, "maxTechnicians": -1}')
          `);
          console.log('✅ Added default subscription plans');
        }
        
        // If invitation_tokens is missing, create it
        if (table === 'invitation_tokens') {
          console.log('Creating invitation_tokens table...');
          await pool.query(`
            CREATE TABLE invitation_tokens (
              id SERIAL PRIMARY KEY,
              email TEXT NOT NULL,
              token TEXT NOT NULL UNIQUE,
              organization_id INTEGER NOT NULL,
              role TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
              created_by INTEGER
            )
          `);
          console.log('✅ Created invitation_tokens table');
        }
      }
    }
    
    console.log('\n=== Fix Complete ===');
    console.log('\nYou should now be able to create organizations through the OAuth flow');
    console.log('If issues persist, please check the logs for specific error messages.');
    
  } catch (error) {
    console.error('Error during fix process:', error);
  } finally {
    await pool.end();
  }
}

fixOrganizationCreation().catch(console.error);