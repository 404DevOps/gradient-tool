// Copies the built exe + resources bundle up to the project root, so
// GradientTextureTool.exe always sits next to start-in-browser.bat, ready to run.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist', 'GradientTextureTool');
const projectRoot = path.join(__dirname, '..');

fs.copyFileSync(
  path.join(distDir, 'GradientTextureTool-win_x64.exe'),
  path.join(projectRoot, 'GradientTextureTool.exe'),
);
fs.copyFileSync(
  path.join(distDir, 'resources.neu'),
  path.join(projectRoot, 'resources.neu'),
);

console.log('Copied GradientTextureTool.exe + resources.neu to the project root.');
