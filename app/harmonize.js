import { hexToHsl, hslToHex } from './color.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Shortest signed distance from one hue to another, in the range (-180, 180].
function shortestHueDelta(from, to) {
  return (((to - from + 540) % 360) + 360) % 360 - 180;
}

// harmonizeColors(hexes, { hueAmount, saturationAmount, contrastAmount }) ->
// { hexes, hueDeltas }. Pure function, operates on a flat list of colors
// (typically each gradient's start color) in their given order:
//
// - hue: spreads hues evenly around the wheel, anchored on the first color
//   and preserving list order, blended toward the originals by hueAmount.
// - saturation: pulls every color toward the set's average saturation.
// - contrast: stretches the existing lightness spread outward (by rank, not
//   raw value) so tones that were close together separate out visually.
//
// Each amount is 0..1. hueDeltas is returned alongside so a caller can spin
// a paired color (e.g. a gradient's end color) by the same amount, keeping
// it in the same new hue family without touching its saturation/lightness.
export function harmonizeColors(hexes, { hueAmount = 0, saturationAmount = 0, contrastAmount = 0 } = {}) {
  const n = hexes.length;
  if (n === 0) return { hexes: [], hueDeltas: [] };
  const hsls = hexes.map(hexToHsl);

  const anchorHue = hsls[0].h;
  const targetHues = hsls.map((_, i) => (anchorHue + (i * 360) / n) % 360);
  const hueDeltas = hsls.map((c, i) => shortestHueDelta(c.h, targetHues[i]) * hueAmount);
  const newHues = hsls.map((c, i) => (c.h + hueDeltas[i] + 360) % 360);

  const avgS = hsls.reduce((sum, c) => sum + c.s, 0) / n;
  const newSats = hsls.map((c) => lerp(c.s, avgS, saturationAmount));

  const lightnesses = hsls.map((c) => c.l);
  const avgL = lightnesses.reduce((sum, l) => sum + l, 0) / n;
  const currentSpread = Math.max(...lightnesses) - Math.min(...lightnesses);
  const halfRange = Math.min(45, Math.max(15, currentSpread / 2 + 15));
  const order = hsls.map((_, i) => i).sort((a, b) => hsls[a].l - hsls[b].l);

  const newLights = new Array(n);
  order.forEach((originalIndex, rank) => {
    const target = n === 1 ? avgL : lerp(avgL - halfRange, avgL + halfRange, rank / (n - 1));
    const clamped = Math.min(95, Math.max(5, target));
    newLights[originalIndex] = lerp(hsls[originalIndex].l, clamped, contrastAmount);
  });

  const newHexes = hsls.map((_, i) => hslToHex({ h: newHues[i], s: newSats[i], l: newLights[i] }));
  return { hexes: newHexes, hueDeltas };
}
