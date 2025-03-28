/**
 * Debug OAuth Issues Script
 * This script will:
 * 1. Check the configuration of Google OAuth in the database
 * 2. Validate existing Google-linked accounts
 * 3. Fix any issues with Travis@SmartWaterPools.com Google OAuth binding
 */

import pg from 'pg';
const { Pool } = pg;

async function debugOAuthIssues() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('=== Debugging Google OAuth Configuration ===');
    
    // 1. Check environment variables for Google OAuth
    console.log('\nChecking environment variables:');
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (googleClientId && googleClientSecret) {
      console.log('✅ Google OAuth environment variables are set:');
      console.log(`- GOOGLE_CLIENT_ID: ${googleClientId.substring(0, 10)}...`);
      console.log(`- GOOGLE_CLIENT_SECRET: ${googleClientSecret.substring(0, 5)}...`);
    } else {
      console.log('❌ Missing Google OAuth environment variables:');
      console.log(`- GOOGLE_CLIENT_ID: ${googleClientId ? 'Set' : 'MISSING'}`);
      console.log(`- GOOGLE_CLIENT_SECRET: ${googleClientSecret ? 'Set' : 'MISSING'}`);
    }
    
    // 2. Check Google-linked accounts in the database
    console.log('\nChecking Google-linked accounts:');
    const googleAccounts = await pool.query(
      `SELECT id, username, email, name, google_id, auth_provider, active, organization_id
       FROM users
       WHERE google_id IS NOT NULL OR auth_provider = 'google'
       ORDER BY id ASC`
    );
    
    if (googleAccounts.rows.length > 0) {
      console.log(`Found ${googleAccounts.rows.length} Google-linked accounts:`);
      googleAccounts.rows.forEach((account, index) => {
        console.log(`\n${index + 1}. Account ID: ${account.id} - ${account.name} (${account.email})`);
        console.log(`   Username: ${account.username || 'None'}`);
        console.log(`   Google ID: ${account.google_id || 'NULL'}`);
        console.log(`   Auth Provider: ${account.auth_provider || 'NULL'}`);
        console.log(`   Active: ${account.active}`);
        console.log(`   Organization ID: ${account.organization_id}`);
        
        // Check for inconsistencies
        if (account.google_id && account.auth_provider !== 'google') {
          console.log(`   ⚠️ Warning: Has Google ID but auth_provider is not 'google'`);
        }
        if (!account.google_id && account.auth_provider === 'google') {
          console.log(`   ⚠️ Warning: Auth provider is 'google' but no Google ID is set`);
        }
      });
    } else {
      console.log('No Google-linked accounts found in the database');
    }
    
    // 3. Check for Travis's accounts specifically
    console.log('\nChecking Travis\'s accounts:');
    const travisAccounts = await pool.query(
      `SELECT id, username, name, email, role, google_id, auth_provider, organization_id, active 
       FROM users 
       WHERE LOWER(email) LIKE LOWER('%travis%smartwaterpools.com%')
       ORDER BY id ASC`
    );
    
    if (travisAccounts.rows.length > 0) {
      console.log(`Found ${travisAccounts.rows.length} Travis accounts:`);
      
      // Additional checks for Travis's accounts
      const allEmails = travisAccounts.rows.map(a => a.email.toLowerCase());
      const uniqueEmails = new Set(allEmails);
      
      if (uniqueEmails.size < allEmails.length) {
        console.log('⚠️ Warning: Multiple accounts with the same email (ignoring case)');
      }
      
      travisAccounts.rows.forEach(account => {
        console.log(`- Account ${account.id}: ${account.name} (${account.email})`);
        console.log(`  Username: ${account.username || 'None'}`);
        console.log(`  GoogleID: ${account.google_id || 'NULL'}, Auth Provider: ${account.auth_provider || 'NULL'}`);
        console.log(`  Role: ${account.role}, Active: ${account.active}`);
      });
    } else {
      console.log('No Travis accounts found');
    }
    
    // 4. Check if email addresses are being stored case-sensitively
    console.log('\nChecking email case sensitivity issues:');
    const emailCaseCheck = await pool.query(
      `SELECT LOWER(email) as lower_email, COUNT(*) as count
       FROM users 
       GROUP BY LOWER(email)
       HAVING COUNT(*) > 1
       ORDER BY count DESC`
    );
    
    if (emailCaseCheck.rows.length > 0) {
      console.log('Found email addresses with multiple case variations:');
      for (const row of emailCaseCheck.rows) {
        console.log(`- ${row.lower_email}: ${row.count} accounts`);
        
        // Get the specific accounts
        const caseAccounts = await pool.query(
          `SELECT id, username, email, name, role, google_id, auth_provider, active
           FROM users
           WHERE LOWER(email) = LOWER($1)
           ORDER BY id ASC`,
          [row.lower_email]
        );
        
        caseAccounts.rows.forEach(account => {
          console.log(`  → ID ${account.id}: ${account.email} (${account.auth_provider || 'no provider'})`);
        });
      }
    } else {
      console.log('No duplicate email addresses with different case variations found');
    }
    
    // 5. Check Google OAuth callback URL configuration
    console.log('\nChecking server configuration:');
    
    const isReplit = process.env.REPL_ID && process.env.REPL_SLUG && process.env.REPL_OWNER;
    console.log(`- Running in Replit environment: ${isReplit ? 'Yes' : 'No'}`);
    
    if (isReplit) {
      const replitDomain = process.env.REPLIT_APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      console.log(`- Replit domain: ${replitDomain}`);
      
      const expectedCallback = `${replitDomain}/api/auth/google/callback`;
      console.log(`- Expected Google callback URL: ${expectedCallback}`);
    }
    
    console.log('\n=== Debug Complete ===');
    console.log('If you\'re still having issues logging in with Google:');
    console.log('1. Check that the application is using the correct OAuth configuration');
    console.log('2. Verify that the callback URL is correctly configured in the Google Developer Console');
    console.log('3. Try clearing your browser cache and cookies');
    console.log('4. Use an incognito/private browser window to test');
    
  } catch (error) {
    console.error('Error during debug process:', error);
  } finally {
    await pool.end();
  }
}

debugOAuthIssues().catch(console.error);