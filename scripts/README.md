# Scripts Directory Organization

This directory contains utility scripts for various aspects of the Smart Water Pools application.

## Directory Structure

- **admin/**: Scripts for creating and managing admin users
  - `create-admin.cjs` - Creates an admin user
  - `create-admin-final.cjs` - Finalized version of admin creation script
  - `create-system-admin.js` - Creates a system admin user
  - `create-test-user.js` - Creates a test user account
  - `fix-admin-password.js` - Fixes issues with admin passwords
  - `fix-system-admin.js` - Repairs system admin permissions

- **auth-fixes/**: Authentication and authorization fix scripts
  - `debug-oauth.js` - Debugging tool for OAuth issues
  - `fix-cross-browser-auth.js` - Addresses cross-browser authentication problems
  - `fix-email-case-sensitivity.js` - Corrects email case sensitivity issues
  - `fix-google-auth.js` - Repairs Google authentication
  - `fix-google-callback-urls.js` - Updates Google callback URLs
  - `fix-organization-creation.js` - Fixes organization creation errors
  - `fix-organization-updated-at.js` - Resolves issues with organization update timestamps
  - `oauth-test.js` - Tests OAuth functionality

- **deployment/**: Deployment and build-related scripts
  - `build.js` - Creates a production build
  - `cloudrun-test.js` - Tests Cloud Run deployment
  - `deploy.js` - Handles deployment process
  - `deploy-helper.js` - Helper functions for deployment
  - `install-dependencies.js` - Installs required dependencies
  - `install-scandit.js` - Sets up Scandit barcode scanning
  - `verify-deployment.js` - Verifies deployment status

- **maintenance/**: Database migrations and maintenance tasks
  - `migrate-add-coordinates.js` - Adds coordinate fields to database
  - `run-inventory-migration.js` - Migrates inventory data
  - `run-subscription-migration.js` - JavaScript version of subscription migration
  - `run-subscription-migration.ts` - TypeScript version of subscription migration

- **stripe/**: Stripe integration scripts
  - `create-stripe-plans.cjs` - CommonJS module for creating Stripe plans
  - `create-stripe-plans.js` - Standard version for creating Stripe plans

- **testing/**: Test scripts
  - (Currently empty, ready for future test scripts)

- **utils/**: General utility scripts
  - `print_env.js` - Prints environment variables for debugging

## Usage

These scripts are intended for development, deployment, and maintenance tasks. They should be run from the project root directory using Node.js.

Example:
```bash
node scripts/utils/print_env.js
```

For scripts that require database access, ensure you have the proper environment variables set up and database permissions.