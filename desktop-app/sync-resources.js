// Copies the app's real source files (../app/index.html, style.css, *.js)
// into resources/ before `neu run`/`neu build`. Those files stay the single
// source of truth — nothing here is hand-maintained, just refreshed on each run.
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'app');
const resourcesDir = path.join(__dirname, 'resources');

fs.mkdirSync(resourcesDir, { recursive: true });

const files = fs.readdirSync(appDir).filter((name) => /\.(html|css|js)$/.test(name));

for (const file of files) {
  fs.copyFileSync(path.join(appDir, file), path.join(resourcesDir, file));
}

console.log(`Synced ${files.length} files into resources/`);
