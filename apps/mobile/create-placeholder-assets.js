/**
 * Script to create placeholder assets for development
 * Run with: node create-placeholder-assets.js
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('Creating placeholder assets...\n');

// Create a simple base64 encoded 1x1 blue PNG
const bluePNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// Every placeholder is the same minimal 1x1 PNG, which Expo resizes.
// Replace these with real artwork (see the links printed below) before production.
const createPlaceholderImage = (filename) => {
  const filePath = path.join(assetsDir, filename);
  fs.writeFileSync(filePath, bluePNG);
  console.log(`✓ Created ${filename}`);
};

// Create all required assets
createPlaceholderImage('icon.png');
createPlaceholderImage('adaptive-icon.png');
createPlaceholderImage('splash.png');
createPlaceholderImage('favicon.png');

console.log('\n✓ All placeholder assets created!');
console.log('\nNOTE: These are minimal placeholders for development.');
console.log('Replace with proper assets before production.\n');
console.log('You can generate proper icons at:');
console.log('- https://www.appicon.co/');
console.log('- https://icon.kitchen/\n');
