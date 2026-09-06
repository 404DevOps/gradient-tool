import { layoutStripes } from './layout.js';

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

// renderGradientIntoRect(ctx, rect, gradientDef)
// Pure with respect to app state: only touches the passed-in ctx, within rect bounds.
export function renderGradientIntoRect(ctx, rect, gradientDef) {
  const { x, y, width, height } = rect;
  const w = clamp01(gradientDef.fadeWidth);
  const t0 = clamp01(0.5 - w / 2);
  const t1 = clamp01(0.5 + w / 2);

  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  // Duplicate stops at t0 === t1 (w -> 0) produce a hard step at the midpoint;
  // stops at 0/1 (w -> 1) produce a smooth blend across the full height.
  gradient.addColorStop(0, gradientDef.startColor);
  gradient.addColorStop(t0, gradientDef.startColor);
  gradient.addColorStop(t1, gradientDef.endColor);
  gradient.addColorStop(1, gradientDef.endColor);

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

// composeTexture(canvas, state) — the single full-resolution render used by both
// the preview (drawn scaled down) and the export (drawn 1:1).
export function composeTexture(canvas, state) {
  canvas.width = state.imageSize;
  canvas.height = state.imageSize;
  const ctx = canvas.getContext('2d');

  const rects = layoutStripes(state.gradients.length, state.imageSize, state.gridX, state.gridY);

  state.gradients.forEach((gradientDef, i) => {
    renderGradientIntoRect(ctx, rects[i], gradientDef);
  });
}
