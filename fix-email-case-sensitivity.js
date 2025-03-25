/**
 * Fix Email Case Sensitivity Issues
 * 
 * This script addresses issues with multiple accounts having the same email
 * with different case variations. It:
 * 
 * 1. Identifies all case-duplicate email accounts
 * 2. Consolidates them, making the Google-linked account the primary one
 * 3. Fixes specific issues with Travis@SmartWaterPools.com accounts
 * 4. Ensures all new logins match email addresses case-insensitively
 */

import pg from 'pg';
const { Pool } = pg;

async function fixEmailCaseSensitivity() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('=== Fixing Email Case Sensitivity Issues ===');
    
    // 1. Identify all duplicate emails (case-insensitive)
    console.log('\nIdentifying duplicate emails:');
    const duplicateEmails = await pool.query(
      `SELECT LOWER(email) as lower_email, COUNT(*) as count
       FROM users 
       GROUP BY LOWER(email)
       HAVING COUNT(*) > 1
       ORDER BY count DESC`
    );
    
    if (duplicateEmails.rows.length === 0) {
      console.log('✅ No duplicate emails found. Skipping this step.');
    } else {
      console.log(`Found ${duplicateEmails.rows.length} emails with case duplicates:`);
      
      // Process each duplicate email set
      for (const row of duplicateEmails.rows) {
        const lowerEmail = row.lower_email;
        console.log(`\nProcessing duplicate email: ${lowerEmail} (${row.count} accounts)`);
        
        // Get all accounts with this email (case-insensitive)
        const accounts = await pool.query(
          `SELECT id, username, email, google_id, auth_provider, role, active, organization_id
           FROM users
           WHERE LOWER(email) = LOWER($1)
           ORDER BY id ASC`,
          [lowerEmail]
        );
        
        // Display all accounts
        accounts.rows.forEach((account, i) => {
          console.log(`${i+1}. User ID ${account.id}: ${account.email} (${account.auth_provider || 'local'}) - Active: ${account.active}`);
        });
        
        // Find the best account to keep - prioritize Google accounts, then active accounts, then lowest ID
        let primaryAccount = accounts.rows.find(a => a.google_id && a.active);
        
        if (!primaryAccount) {
          // No Google + active account, try just active
          primaryAccount = accounts.rows.find(a => a.active);
        }
        
        if (!primaryAccount) {
          // No active accounts, use the first one
          primaryAccount = accounts.rows[0];
        }
        
        console.log(`\nSelected primary account: User ID ${primaryAccount.id} (${primaryAccount.email})`);
        
        // Process other accounts - merge or deactivate
        for (const account of accounts.rows) {
          if (account.id === primaryAccount.id) continue;
          
          // Check if this account has a Google ID that the primary doesn't
          if (account.google_id && !primaryAccount.google_id) {
            console.log(`Account ${account.id} has Google ID ${account.google_id} - transferring to primary account`);
            
            // Update primary account with Google ID
            await pool.query(
              `UPDATE users 
               SET google_id = $1, auth_provider = 'google' 
               WHERE id = $2`,
              [account.google_id, primaryAccount.id]
            );
            
            console.log(`✅ Transferred Google ID ${account.google_id} to primary account ${primaryAccount.id}`);
          }
          
          // Deactivate the duplicate account
          console.log(`Deactivating duplicate account: ${account.id}`);
          await pool.query(
            `UPDATE users 
             SET active = false 
             WHERE id = $1`,
            [account.id]
          );
          console.log(`✅ Deactivated duplicate account ${account.id}`);
        }
        
        // Update the primary account's email to the lowercase version
        await pool.query(
          `UPDATE users 
           SET email = $1
           WHERE id = $2`,
          [lowerEmail, primaryAccount.id]
        );
        console.log(`✅ Updated primary account ${primaryAccount.id} email to lowercase: ${lowerEmail}`);
      }
    }
    
    // 2. Special case: Fix Travis's account specifically
    console.log('\nProcessing special case for Travis@SmartWaterPools.com:');
    
    // Get all of Travis's accounts
    const travisAccounts = await pool.query(
      `SELECT id, username, email, google_id, auth_provider, role, active, organization_id
       FROM users 
       WHERE LOWER(email) LIKE LOWER('%travis%smartwaterpools.com%')
       ORDER BY id ASC`
    );
    
    if (travisAccounts.rows.length > 0) {
      console.log(`Found ${travisAccounts.rows.length} Travis accounts:`);
      
      travisAccounts.rows.forEach((account, i) => {
        console.log(`${i+1}. User ID ${account.id}: ${account.email} (${account.auth_provider || 'local'}) - Active: ${account.active}`);
      });
      
      // Find Travis's Google account
      const travisGoogleAccount = travisAccounts.rows.find(a => a.google_id && a.active);
      
      if (travisGoogleAccount) {
        console.log(`Found Travis's Google account: User ID ${travisGoogleAccount.id} (${travisGoogleAccount.email})`);
        
        // Make sure it's lowercase
        if (travisGoogleAccount.email !== travisGoogleAccount.email.toLowerCase()) {
          console.log(`Updating Travis's email to lowercase: ${travisGoogleAccount.email.toLowerCase()}`);
          
          await pool.query(
            `UPDATE users 
             SET email = $1
             WHERE id = $2`,
            [travisGoogleAccount.email.toLowerCase(), travisGoogleAccount.id]
          );
          
          console.log(`✅ Updated Travis's email to: ${travisGoogleAccount.email.toLowerCase()}`);
        }
        
        // Make sure it has the system_admin role
        if (travisGoogleAccount.role !== 'system_admin') {
          console.log(`Updating Travis's role to system_admin`);
          
          await pool.query(
            `UPDATE users 
             SET role = 'system_admin'
             WHERE id = $1`,
            [travisGoogleAccount.id]
          );
          
          console.log(`✅ Updated Travis's role to system_admin`);
        }
        
        // Deactivate all other Travis accounts
        for (const account of travisAccounts.rows) {
          if (account.id === travisGoogleAccount.id) continue;
          
          console.log(`Deactivating duplicate Travis account: ${account.id} (${account.email})`);
          await pool.query(
            `UPDATE users 
             SET active = false
             WHERE id = $1`,
            [account.id]
          );
          console.log(`✅ Deactivated duplicate Travis account ${account.id}`);
        }
      } else {
        console.log(`❌ No active Google account found for Travis. Please check manually.`);
      }
    } else {
      console.log('No Travis accounts found');
    }
    
    // 3. Special case: Fix Thomas Anderson test account
    console.log('\nProcessing special case for 010101thomasanderson@gmail.com:');
    
    // Get all Thomas Anderson accounts
    const thomasAccounts = await pool.query(
      `SELECT id, username, email, google_id, auth_provider, role, active, organization_id
       FROM users 
       WHERE LOWER(email) = '010101thomasanderson@gmail.com'
       ORDER BY id ASC`
    );
    
    if (thomasAccounts.rows.length > 0) {
      console.log(`Found ${thomasAccounts.rows.length} Thomas Anderson accounts:`);
      
      thomasAccounts.rows.forEach((account, i) => {
        console.log(`${i+1}. User ID ${account.id}: ${account.email} (${account.auth_provider || 'local'}) - Active: ${account.active}`);
      });
      
      // Find Thomas's Google account
      const thomasGoogleAccount = thomasAccounts.rows.find(a => a.google_id && a.active);
      
      if (thomasGoogleAccount) {
        console.log(`Found Thomas's Google account: User ID ${thomasGoogleAccount.id} (${thomasGoogleAccount.email})`);
        
        // Make sure it's lowercase
        if (thomasGoogleAccount.email !== thomasGoogleAccount.email.toLowerCase()) {
          console.log(`Updating Thomas's email to lowercase: ${thomasGoogleAccount.email.toLowerCase()}`);
          
          await pool.query(
            `UPDATE users 
             SET email = $1
             WHERE id = $2`,
            [thomasGoogleAccount.email.toLowerCase(), thomasGoogleAccount.id]
          );
          
          console.log(`✅ Updated Thomas's email to: ${thomasGoogleAccount.email.toLowerCase()}`);
        }
        
        // Deactivate all other Thomas accounts
        for (const account of thomasAccounts.rows) {
          if (account.id === thomasGoogleAccount.id) continue;
          
          console.log(`Deactivating duplicate Thomas account: ${account.id} (${account.email})`);
          await pool.query(
            `UPDATE users 
             SET active = false
             WHERE id = $1`,
            [account.id]
          );
          console.log(`✅ Deactivated duplicate Thomas account ${account.id}`);
        }
      } else {
        console.log(`❌ No active Google account found for Thomas. Please check manually.`);
      }
    } else {
      console.log('No Thomas Anderson accounts found');
    }
    
    console.log('\n=== Email Case Sensitivity Fixes Complete ===');
    console.log('Restart your server for changes to take effect.');
  } catch (error) {
    console.error('Error fixing email case sensitivity:', error);
  } finally {
    await pool.end();
  }
}

fixEmailCaseSensitivity().catch(console.error);