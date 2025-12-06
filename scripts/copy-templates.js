const fs = require('fs');
const path = require('path');

// Create the destination directory
const destDir = path.join(__dirname, '../dist/views/emails');
fs.mkdirSync(destDir, { recursive: true });

// Copy template files
const templates = ['signup.ejs', 'otp.ejs', 'forgot-password.ejs'];
const srcDir = path.join(__dirname, '../src/views/emails');

templates.forEach(template => {
  const srcPath = path.join(srcDir, template);
  const destPath = path.join(destDir, template);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copied ${template} to dist/views/emails/`);
  } else {
    console.warn(`⚠ Warning: ${template} not found at ${srcPath}`);
  }
});

console.log('Template copying completed!');

