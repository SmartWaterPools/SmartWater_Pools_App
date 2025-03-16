import { exec } from 'child_process';

console.log('Installing nodemailer and googleapis packages...');

// Execute npm install command
exec('npm install nodemailer googleapis --save', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  
  console.log(`stdout: ${stdout}`);
  console.log('Packages installed successfully!');
});