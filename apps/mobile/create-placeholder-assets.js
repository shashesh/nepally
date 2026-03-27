/**
 * Script to create placeholder assets for development
 * Run with: node create-placeholder-assets.js
 */

const fs = require('fs');
const https = require('https');
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

// For now, we'll create simple 1024x1024 colored squares using a data URL approach
// In a real scenario, you'd use proper image generation or download from a CDN

const createPlaceholderImage = (filename, color = '1565C0') => {
  const filePath = path.join(assetsDir, filename);

  // Create a simple SVG and save as .png (this is a workaround)
  // In production, you'd use actual PNG files
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#${color}"/>
  <text x="512" y="512" font-size="200" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold">Nepally</text>
</svg>`;

  // For development, we'll just create a minimal PNG
  // This creates a 1x1 pixel that Expo will resize
  fs.writeFileSync(filePath, bluePNG);
  console.log(`✓ Created ${filename}`);
};

// Create all required assets
createPlaceholderImage('icon.png', '1565C0');
createPlaceholderImage('adaptive-icon.png', '1565C0');
createPlaceholderImage('splash.png', '1565C0');
createPlaceholderImage('favicon.png', '1565C0');

console.log('\n✓ All placeholder assets created!');
console.log('\nNOTE: These are minimal placeholders for development.');
console.log('Replace with proper assets before production.\n');
console.log('You can generate proper icons at:');
console.log('- https://www.appicon.co/');
console.log('- https://icon.kitchen/\n');
