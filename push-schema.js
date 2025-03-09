import { execSync } from 'child_process';

try {
  console.log('Pushing schema changes to database...');
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
  console.log('Schema changes pushed successfully!');
} catch (error) {
  console.error('Error pushing schema changes:', error);
  process.exit(1);
}