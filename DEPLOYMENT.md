# SmartWater Pools Management System - Deployment Guide

This document provides comprehensive instructions for deploying the SmartWater Pools Management System to production environments, with a focus on Google Cloud Run.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Process](#build-process)
3. [Cloud Run Deployment](#cloud-run-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Verification and Testing](#verification-and-testing)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the application, ensure you have:

- Access to Replit project with deployments enabled
- PostgreSQL database URL (if using persistent storage)
- Node.js 18+ and npm 9+ (for local deployment verification)

## Build Process

The application needs to be built before deployment. We've provided automated scripts to simplify this process.

### Using the Automated Build Script

1. Run the deployment script:
   ```bash
   node scripts/deploy.js
   ```

2. This script will:
   - Create a .npmrc file to prevent path alias errors
   - Clean and create the `dist/` directory
   - Build the frontend with Vite
   - Build the server with esbuild with proper path alias resolution
   - Verify the build artifacts
   - Create necessary environment configuration files

### Manual Build Process (if needed)

If the automated script fails, you can build manually:

1. Create a .npmrc file to prevent path alias errors:
   ```bash
   echo "save-exact=true" > .npmrc
   echo "save-prefix=\"\"" >> .npmrc
   ```

2. Clean the dist directory:
   ```bash
   rm -rf dist && mkdir dist
   ```

3. Build the frontend:
   ```bash
   npx vite build
   ```

4. Build the server with proper path aliases:
   ```bash
   npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --alias:@/=./client/src/ --alias:@shared/=./shared/
   ```

5. Ensure environment files are in place:
   ```bash
   touch .env.production
   ```

## Cloud Run Deployment

### Deploy from Replit

1. Ensure your code is committed, including the `dist/` directory (make sure dist/ is not in .gitignore)

2. Click the "Deploy" button in the Replit interface

3. Choose "Deploy to Cloud Run"

4. Follow the deployment prompts, which will:
   - Build the application (if needed)
   - Deploy to Cloud Run
   - Configure domain name
   - Set environment variables

### Important Deployment Settings

When deploying to Cloud Run, ensure:

- Container port is set to 8080 (default)
- Environment variable `PORT=8080` is set
- Environment variable `NODE_ENV=production` is set
- Set other required environment variables (see Environment Configuration)

## Environment Configuration

The application requires the following environment variables:

| Variable        | Description                            | Required | Default     |
|-----------------|----------------------------------------|----------|-------------|
| PORT            | Port for the server to listen on       | Yes      | 8080        |
| NODE_ENV        | Environment mode                       | Yes      | production  |
| DATABASE_URL    | PostgreSQL connection string           | Yes      | None        |

## Database Setup

The application requires a PostgreSQL database for persistent storage.

### Replit Database

1. If using a Replit database:
   - The connection URL is automatically available in the `DATABASE_URL` environment variable
   
2. Use the database management tools in Replit to view and manage your database

### External Database

If using an external PostgreSQL database:

1. Create a PostgreSQL database instance (e.g., on Google Cloud SQL, AWS RDS, etc.)

2. Set the `DATABASE_URL` environment variable to your connection string

3. The application will use Drizzle ORM to connect to the database

## Verification and Testing

### Running Verification Scripts

1. Verify deployment readiness:
   ```bash
   node verify-deployment.js
   ```

2. Simulate Cloud Run environment locally:
   ```bash
   node cloudrun-test.js
   ```

### Testing the Production Application

1. Test the health endpoint:
   ```bash
   curl https://your-cloudrun-url.run.app/api/health
   ```

2. Verify the application frontend:
   - Visit `https://your-cloudrun-url.run.app` in a web browser

## Troubleshooting

### Common Issues

#### Application Fails to Start

- Check if `dist/index.js` exists in the deployed files
- Ensure all required environment variables are set
- Check Cloud Run logs for detailed error messages

#### Path Alias Resolution Errors

- If you see errors like `npm ERR! code ENOENT` trying to install `@/components` or similar path aliases:
  - Ensure the `.npmrc` file exists at the root of your project with proper settings
  - Use the automated deployment script (`node scripts/deploy.js`)
  - Check that esbuild is using the correct `--alias:@/=./client/src/` parameters
  - Review imports in your code to ensure they use the correct path aliases

#### Database Connection Issues

- Verify the `DATABASE_URL` is correctly set
- Ensure the database is accessible from Cloud Run
- Check IP allowlisting if using external database

#### Frontend Not Loading

- Check if the frontend build exists in the `dist/public` directory
- Verify that server properly serves static files
- Check browser console for JavaScript errors

### Cloud Run Logs

1. View logs in the Google Cloud Console:
   - Navigate to Cloud Run service
   - Click on your service
   - Go to the "Logs" tab

2. Use gcloud CLI to view logs:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=YOUR_SERVICE_NAME"
   ```

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Node.js on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)
- [Replit Deployments](https://docs.replit.com/hosting/deployments/deployments-quickstart)
- [PostgreSQL on Cloud SQL](https://cloud.google.com/sql/docs/postgres)