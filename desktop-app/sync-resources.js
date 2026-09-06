// Copies the app's real source files (../app/index.html, style.css, *.js)
// into resources/ before `neu run`/`neu build`. Those files stay the single
// source of truth — nothing here is hand-maintained, just refreshed on each
// run. Also removes any .html/.css/.js file left behind in resources/ by a
// file since renamed or deleted in app/, so stale copies (e.g. from a
// removed module) can't silently keep shipping. Only touches those three
// extensions — the Neutralino client library under resources/js/ and
// generate-icon.js's icon.png are untouched.
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');
const resourcesDir = path.join(__dirname, 'resources');

fs.mkdirSync(resourcesDir, { recursive: true });

const isSyncedFile = (name) => /\.(html|css|js)$/.test(name);
const currentFiles = fs.readdirSync(appDir).filter(isSyncedFile);
const currentFileSet = new Set(currentFiles);

const staleFiles = fs.readdirSync(resourcesDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && isSyncedFile(entry.name) && !currentFileSet.has(entry.name))
  .map((entry) => entry.name);

for (const name of staleFiles) {
  fs.unlinkSync(path.join(resourcesDir, name));
}

for (const file of currentFiles) {
  fs.copyFileSync(path.join(appDir, file), path.join(resourcesDir, file));
}

const staleNote = staleFiles.length
  ? ` (removed ${staleFiles.length} stale file${staleFiles.length === 1 ? '' : 's'}: ${staleFiles.join(', ')})`
  : '';
console.log(`Synced ${currentFiles.length} files into resources/${staleNote}`);
