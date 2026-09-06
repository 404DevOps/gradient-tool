import { hexToHsl } from './color.js';

// Pure classification — no DOM/state. The bundled palette library has no
// mood metadata of its own, so we derive rough mood tags from each
// palette's actual colors: average saturation/lightness for the tonal
// tags, and circular hue statistics for the color-family tags (guarding
// against near-gray colors, whose hue is essentially noise).

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Mean resultant length of a set of hues, treated as angles: 1 = all hues
// identical, 0 = spread evenly around the wheel.
function circularConcentration(hues) {
  let sumCos = 0;
  let sumSin = 0;
  for (const h of hues) {
    const rad = (h * Math.PI) / 180;
    sumCos += Math.cos(rad);
    sumSin += Math.sin(rad);
  }
  return Math.sqrt(sumCos * sumCos + sumSin * sumSin) / hues.length;
}

// Deliberately leave yellow-green (~75-165°) and magenta (~285-345°) as
// neither — those read as color-temperature-neutral, not warm or cool.
function isWarmHue(h) {
  return h < 75 || h >= 345;
}
function isCoolHue(h) {
  return h >= 165 && h < 285;
}

const SATURATION_NOISE_FLOOR = 8; // below this, hue is unreliable for a color

export function classifyPaletteMoods(hexColors) {
  const hsls = hexColors.map(hexToHsl);
  const avgS = average(hsls.map((c) => c.s));
  const avgL = average(hsls.map((c) => c.l));

  const moods = [];

  if (avgS < 40 && avgL > 65) moods.push('Pastel');
  if (avgS > 65) moods.push('Vivid');
  if (avgL < 35) moods.push('Dark');
  if (avgL > 70 && avgS >= 40) moods.push('Bright');
  if (avgS >= 20 && avgS <= 45 && avgL >= 30 && avgL <= 60) moods.push('Earthy');

  const meaningfulHues = hsls.filter((c) => c.s >= SATURATION_NOISE_FLOOR).map((c) => c.h);
  if (meaningfulHues.length === 0) {
    moods.push('Grayscale');
  } else {
    if (circularConcentration(meaningfulHues) > 0.85) moods.push('Monochrome');
    const warmCount = meaningfulHues.filter(isWarmHue).length;
    const coolCount = meaningfulHues.filter(isCoolHue).length;
    if (warmCount > meaningfulHues.length / 2) moods.push('Warm');
    if (coolCount > meaningfulHues.length / 2) moods.push('Cool');
  }

  return moods.length ? moods : ['Balanced'];
}
