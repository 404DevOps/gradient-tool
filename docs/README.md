# Gradient Texture Tool

## Folder structure

```
/
├── GradientTextureTool.exe   — standalone launcher (double-click)
├── resources.neu             — packaged app data, must stay next to the .exe
├── start-in-browser.bat      — browser launcher (double-click)
├── app/                      — the actual app: index.html, style.css, *.js
├── launcher/                 — server.js, used by start-in-browser.bat
├── desktop-app/              — Neutralino packaging tooling (builds the .exe)
└── docs/                     — this file and the spec
```

## Running it

- **Standalone window:** double-click `GradientTextureTool.exe`. No browser needed.
- **In your browser instead:** double-click `start-in-browser.bat`. It starts a small local
  server and opens the app in your default browser at `http://localhost:4173`.

Both run the exact same files in `app/` — pick whichever is more convenient at the time.

## Making changes

Edit `index.html`, `style.css`, or any of the `*.js` files in `app/`.
Both launchers pick up changes automatically — `start-in-browser.bat` on the next
page reload, since it serves the files live. `GradientTextureTool.exe` does **not**;
it's a packaged snapshot, so rebuild it after making changes (see below).

## Rebuilding the standalone .exe

After editing the app files, refresh the packaged exe:

```bash
cd desktop-app
npm run build
```

This copies the current `app/` files into `desktop-app/resources/`, builds the app with
Neutralino, and copies the resulting `GradientTextureTool.exe` + `resources.neu` back
up to the project root, overwriting the old ones.

`desktop-app/` also has `npm start`, which runs the app live (via `neu run`) without
building an exe — useful for testing changes in the standalone window without a full
rebuild each time.

## First-time setup (already done, for reference)

`desktop-app/` needs its dependencies installed once:

```bash
cd desktop-app
npm install
npm run update   # downloads Neutralino's runtime binaries into desktop-app/bin/
```
