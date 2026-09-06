# Developer Notes

For what this app is and how to use it, see the [README](../README.md) at the project root.
This file covers the project layout and build/launch mechanics.

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

## How it works

- **Layout is a fixed grid.** `layoutStripes(count, imageSize, gridX, gridY)` in `app/layout.js`
  computes cell positions from `imageSize`/`gridX`/`gridY` alone — never from `count`. That's
  deliberate: the same dimensions always produce the same stripe geometry regardless of how many
  gradients are actually defined, so swapping colors and re-exporting needs no UV/material changes
  in Blender. See `docs/gradient-texture-tool-spec.md` for the exact algorithm.
- **The recipe lives inside the PNG.** "Save as..." embeds a JSON payload (`{version, name,
  imageSize, gridX, gridY, gradients}`) into a standard PNG `tEXt` chunk (keyword
  `gradient-recipe`, see `app/pngMetadata.js`) — no sidecar file. Any other PNG viewer just
  ignores that chunk. Importing a texture reads it back out to recreate the gradient list exactly.
- **Palette-from-image de-duplicates by color distance.** `extractDominantColors` in
  `app/imageAnalysis.js` runs k-means, then drops clusters that fall within a minimum RGB distance
  of an already-kept, more dominant color. That minimum shrinks as you ask for more colors, so a
  high color count doesn't just export a wall of near-identical shades.

## First-time setup (already done, for reference)

`desktop-app/` needs its dependencies installed once:

```bash
cd desktop-app
npm install
npm run update   # downloads Neutralino's runtime binaries into desktop-app/bin/
```
