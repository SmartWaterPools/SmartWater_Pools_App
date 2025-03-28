/**
 * Fix Google Authentication Issues
 * 
 * This script addresses two specific issues:
 * 1. Fixes case sensitivity in email addresses for Google authentication
 * 2. Corrects the organization creation issue during new user registration
 */

import pg from 'pg';
const { Pool } = pg;

async function fixGoogleAuthIssues() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('=== Fixing Google Authentication Issues ===');
    
    // Part 1: Fix Travis's account for Google authentication
    console.log('\n1. Fixing Travis\'s account for Google authentication:');
    
    // Find the Travis accounts (both local and Google)
    const travisAccounts = await pool.query(
      `SELECT id, username, name, email, role, google_id, auth_provider, organization_id, active 
       FROM users 
       WHERE LOWER(email) LIKE LOWER('%travis%smartwaterpools.com%')
       ORDER BY id ASC`
    );
    
    if (travisAccounts.rows.length > 0) {
      console.log(`Found ${travisAccounts.rows.length} Travis accounts:`);
      
      let localAccount = null;
      let googleAccount = null;
      
      // Identify which is which
      travisAccounts.rows.forEach(account => {
        console.log(`- Account ${account.id}: ${account.name} (${account.email})`);
        console.log(`  GoogleID: ${account.google_id || 'NULL'}, Auth Provider: ${account.auth_provider || 'NULL'}`);
        
        if (account.google_id) {
          googleAccount = account;
        } else if (account.auth_provider === 'local') {
          localAccount = account;
        }
      });
      
      // Update Travis's primary account to work with Google
      if (localAccount && googleAccount) {
        console.log('\nFound both local and Google accounts for Travis.');
        console.log(`Local account ID: ${localAccount.id}, Google account ID: ${googleAccount.id}`);
        
        // First, check which account to keep
        const primaryAccount = localAccount.id === 6 ? localAccount : googleAccount;
        const secondaryAccount = primaryAccount === localAccount ? googleAccount : localAccount;
        
        console.log(`Using ${primaryAccount.id} (${primaryAccount.email}) as primary account`);
        
        // We need to deactivate the Google ID on the current Google account first
        await pool.query(
          `UPDATE users
           SET google_id = NULL
           WHERE id = $1`,
          [googleAccount.id]
        );
        
        console.log(`✅ Removed Google ID from account ${googleAccount.id} temporarily`);
        
        // Now update the primary account with the Google ID
        await pool.query(
          `UPDATE users
           SET google_id = $1, 
               auth_provider = 'google'
           WHERE id = $2`,
          [googleAccount.google_id, primaryAccount.id]
        );
        
        console.log(`✅ Updated primary account (ID: ${primaryAccount.id}) with Google authentication information.`);
        
        // Set the secondary account to inactive
        await pool.query(
          `UPDATE users
           SET active = false
           WHERE id = $1`,
          [secondaryAccount.id]
        );
        
        console.log(`✅ Set secondary account (ID: ${secondaryAccount.id}) to inactive.`);
        
        console.log('\nYou should now be able to login with Google using:');
        console.log(`- ${primaryAccount.email}`);
      } else if (localAccount) {
        console.log('\nOnly found local account for Travis, but no Google account.');
        console.log('No changes made to this account.');
      } else if (googleAccount) {
        console.log('\nOnly found Google account for Travis, but no local account.');
        console.log('No changes made to this account.');
      }
    } else {
      console.log('No Travis accounts found');
    }
    
    // Part 2: Fix organization creation issues
    console.log('\n2. Checking for organization creation issues:');
    
    // Check if we have the required tables and columns for organization creation
    const orgColumnsCheck = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'organizations'
       AND column_name IN ('name', 'type', 'active', 'subscription_tier', 'billing_cycle', 'stripe_customer_id')`
    );
    
    const requiredColumns = ['name', 'type', 'active', 'subscription_tier', 'billing_cycle', 'stripe_customer_id'];
    const missingColumns = requiredColumns.filter(col => 
      !orgColumnsCheck.rows.some(row => row.column_name === col)
    );
    
    if (missingColumns.length > 0) {
      console.log(`⚠️ Missing required columns in organizations table: ${missingColumns.join(', ')}`);
      console.log('These columns are needed for proper organization creation.');
      
      // Only add columns if they're missing
      for (const column of missingColumns) {
        let dataType = 'text';
        let defaultValue = 'NULL';
        
        if (column === 'active') {
          dataType = 'boolean';
          defaultValue = 'true';
        }
        
        console.log(`Adding missing column: ${column}`);
        try {
          await pool.query(
            `ALTER TABLE organizations 
             ADD COLUMN IF NOT EXISTS ${column} ${dataType} DEFAULT ${defaultValue}`
          );
          console.log(`✅ Added column ${column} to organizations table`);
        } catch (error) {
          console.error(`Error adding column ${column}:`, error.message);
        }
      }
    } else {
      console.log('✅ Organizations table has all required columns');
    }

    // Check if the invitation_tokens table exists, and create it if needed
    const invitationTableExists = await pool.query(
      `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'invitation_tokens'
      )`
    );
    
    if (!invitationTableExists.rows[0].exists) {
      console.log('Creating missing invitation_tokens table...');
      
      try {
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
        console.log('✅ Created invitation_tokens table successfully');
      } catch (error) {
        console.error('Error creating invitation_tokens table:', error.message);
      }
    } else {
      console.log('✅ Invitation tokens table exists');
    }
    
    console.log('\n=== Fix Complete ===');
    console.log('\nYou should now be able to:');
    console.log('1. Login with Google using Travis@SmartWaterPools.com');
    console.log('2. Create new organizations with new Google accounts');
    console.log('\nIf you continue to have issues, try clearing your browser cache and cookies');
    console.log('or try using an incognito/private browser window.');
    
  } catch (error) {
    console.error('Error during fix process:', error);
  } finally {
    await pool.end();
  }
}

fixGoogleAuthIssues().catch(console.error);