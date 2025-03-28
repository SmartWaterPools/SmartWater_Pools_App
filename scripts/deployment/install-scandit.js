// Script to install Scandit packages without path aliases
import { execSync } from 'child_process';

try {
  console.log('Installing Scandit packages...');
  
  // Install core Scandit packages
  console.log('Installing @scandit/web-datacapture-core and @scandit/web-datacapture-barcode...');
  execSync('npm install @scandit/web-datacapture-core @scandit/web-datacapture-barcode', { 
    stdio: 'inherit',
    env: process.env
  });
  
  // Note: The SparkScan package is not available in the public npm registry
  // It requires special access or is distributed through different channels
  console.log('Note: SparkScan was not installed as it requires special access');
  console.log('We will focus on implementing the standard Scandit barcode scanning functionality');
  
  console.log('Scandit core packages installed successfully');
} catch (error) {
  console.error('Failed to install Scandit packages:', error.message);
  console.log('Error details:', error);
  process.exit(1);
}