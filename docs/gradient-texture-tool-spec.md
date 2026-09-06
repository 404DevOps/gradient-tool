# Gradient texture tool — implementation spec

A static, client-side-only web app for generating multi-gradient stripe textures for Blender texturing. No backend, no build step, no data persistence.

## Tech stack

- Plain HTML + CSS + vanilla JS (ES modules). No framework, no bundler.
- Single external dependency: [SortableJS](https://sortablejs.github.io/Sortable/) via CDN, for drag-and-drop reordering of the gradient list.
- Runs by opening `index.html` directly or via any static file server (`python -m http.server`, `npx serve`, etc.) — must work both ways.

## Data model

```js
// One gradient definition
{
  id: string,          // uuid or incrementing counter
  startColor: string,  // hex, e.g. "#ff0000"
  endColor: string,    // hex
  fadeWidth: number,   // 0–1, see "Fade math" below
}

// App state (single object, no framework store needed)
{
  imageSize: number,       // 512 | 1024 | 2048 | 4096
  gridX: number,           // number of columns
  gridY: number,           // number of rows
  gradients: GradientDef[] // order matters — this is the display/render order
}
```

## Layout algorithm (pure function, no side effects)

`layoutStripes(count, imageSize, gridX, gridY) -> Rect[]`

The grid is fixed by `imageSize`, `gridX`, and `gridY` alone — it does **not**
depend on `count`. This is intentional: swapping colors on an existing
gradient list (same count, same gridX/gridY) must always reproduce the exact
same rects, so a recolored export drops in without any UV/material changes
in Blender.

1. `cols = max(1, gridX)`, `rows = max(1, gridY)`.
2. `cellWidth = imageSize / cols`, `cellHeight = imageSize / rows`.
3. Fill cells row-major (row 0 left-to-right, then row 1, etc.) with the
   first `min(count, cols × rows)` gradients — one rect per gradient, in
   list order. Any gradients beyond `cols × rows` are not rendered; any
   unfilled cells (when `count < cols × rows`) are left blank.
4. Return an ordered array of `{x, y, width, height}` rects.

This must be a pure function: same inputs always produce the same rects. No canvas/DOM access inside it — makes it trivially unit-testable.

**Example:** `imageSize = 1024`, `gridX = 4`, `gridY = 8` → 32 cells, each `256 × 128`. With 5 gradients defined, the first 4 fill row 0 and the 5th starts row 1 — regardless of how many gradients exist, cell 0 is always `{x:0, y:0, width:256, height:128}`.

## Gradient rendering (pure function)

`renderGradientIntoRect(ctx, rect, gradientDef)`

- Fade direction: **top-to-bottom** within the stripe (along `rect.height`), regardless of stripe orientation.
- Fade math: for a stripe of height `H`, given `fadeWidth` slider value `w` (0–1, clamped), the transition is centered at the stripe's vertical midpoint and spans `w × H` pixels:
  - Normalized position `t = y / H` (0 at top, 1 at bottom)
  - Transition start: `t0 = 0.5 - w/2`, transition end: `t1 = 0.5 + w/2`
  - `blend = clamp01((t - t0) / (t1 - t0))`
  - `color = lerp(startColor, endColor, blend)`
  - `w → 0`: hard step exactly at the midpoint. `w → 1`: smooth blend across the full stripe height.
- Implementation: use `ctx.createLinearGradient(x, y, x, y + height)` and add color stops computed from the formula above (a handful of stops, e.g. 0%, t0, t1, 100%, is enough — this is a 2-color gradient, not a per-pixel loop). Then `ctx.fillRect(rect.x, rect.y, rect.width, rect.height)`.

## Texture composer

`composeTexture(canvas, state)`:
1. Set `canvas.width = canvas.height = state.imageSize`.
2. Call `layoutStripes(state.gradients.length, state.imageSize, state.gridX, state.gridY)`.
3. For each `(gradientDef, rect)` pair, call `renderGradientIntoRect`.
4. This is the single full-resolution render — both the preview and the export draw from the *same* composer, just at different display scales.

## Live updates (revised — everything is live now)

All edits update the preview immediately: color changes, fade slider drag, adding/removing a gradient, changing image size or grid dimensions, **and drag-reorder** (previously reorder was going to be gated behind an "Apply" button — dropped that; canvas gradients are cheap even at 4096px, so there's no need to batch).

- Debounce/throttle re-renders with `requestAnimationFrame` so a fast slider drag doesn't queue up redundant full-res renders — only render the latest state on each animation frame.
- While a render is in flight (should be near-instant, but cover it anyway), show a small spinner overlay on the preview canvas. Simplest approach: a CSS spinner absolutely positioned over the preview container, toggled visible/hidden around the render call. Given renders are synchronous and fast, this will likely just flash briefly or not appear at all — that's fine, it's a safety net for slower machines/larger sizes, not a real async operation.
- No "Apply" button needed anymore. Keep the download button separate — it triggers export from current state, not a special render path.

## UI layout

- **Left panel:** preview `<canvas>`. Actual render happens on an offscreen/hidden full-resolution canvas; the visible preview canvas is a fixed display size (e.g. 512×512 CSS pixels) that the full-res result is drawn into scaled down (`ctx.drawImage` with scaling), so the preview always looks correct regardless of the selected export resolution.
- **Right panel:** vertical list of gradient rows, each showing:
  - Start color swatch/picker (`<input type="color">`)
  - End color swatch/picker (`<input type="color">`)
  - Fade-width slider (`<input type="range">`, 0–1)
  - Remove button
  - Drag handle (SortableJS handles the reordering on drop; re-run `composeTexture` on `onEnd`)
- **Top controls:**
  - Image size dropdown: 512 / 1024 / 2048 / 4096
  - Min stripe width dropdown: 32 / 64 / 128 / 256 / 512 px
  - "Add gradient" button — appends a new gradient with sensible default colors (e.g. black → white) and default fade width (e.g. 0.5), opens it for editing
- **Download button:** triggers `canvas.toBlob(blob => ..., 'image/png')` on the full-resolution canvas, creates an object URL, and triggers a download via a temporary `<a download>` element. Right-click → "Save image as" on the preview also works if the preview itself is drawn at full detail, but since the visible preview is scaled down, prefer the explicit download button as the primary path — mention in the UI that the preview is a scaled proxy, not the exact export.

## Explicitly out of scope (don't build these)

- No backend, no accounts, no cloud storage, no cross-session persistence (state resets on page reload — acceptable for this tool).
- No non-square image sizes (square presets only: 512/1024/2048/4096).
- No HDR/float/EXR export. Output is always standard 8-bit PNG. "Glow" is not baked into pixel values — that's handled later in Blender via the Emission node's Strength value.
- No gaps/borders between stripes.
- No alternate layout modes (radial, diagonal, etc.) — don't introduce a `LayoutStrategy` interface preemptively. If a second layout mode is ever actually requested, refactor `layoutStripes` behind an interface at that point, not before.

## File structure suggestion

```
/index.html         — markup + CDN script tags (SortableJS)
/style.css          — layout, panel styling
/state.js           — app state object + subscribe/render trigger
/layout.js          — layoutStripes() — pure function, unit-testable
/render.js          — renderGradientIntoRect(), composeTexture()
/export.js          — download handling
/ui.js              — DOM wiring: controls, gradient list, drag handles, event listeners
```

Keep `layout.js` and `render.js` free of DOM/state imports — they should only take plain arguments and return plain data/draw to a passed-in canvas context. This keeps the math independently testable and keeps `ui.js` as the only place that touches the DOM.
