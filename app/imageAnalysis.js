import { rgbToHex } from './color.js';

// Pure color-clustering logic — takes plain pixel data in, returns hex
// strings out. No DOM/canvas access here; ui.js handles reading the image.

function dist2(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

// k-means++ initialization: spreads initial centroids out instead of
// clumping them, which converges to better clusters in far fewer iterations.
function initCentroids(pixels, k) {
  const centroids = [pixels[Math.floor(Math.random() * pixels.length)]];
  while (centroids.length < k) {
    const distances = pixels.map((p) => Math.min(...centroids.map((c) => dist2(p, c))));
    const total = distances.reduce((sum, d) => sum + d, 0);
    if (total === 0) {
      centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
      continue;
    }
    let r = Math.random() * total;
    let idx = 0;
    while (idx < distances.length - 1 && r > distances[idx]) {
      r -= distances[idx];
      idx += 1;
    }
    centroids.push(pixels[idx]);
  }
  return centroids;
}

// kmeans(pixels, k) -> [{ color: [r,g,b], count }, ...] sorted by cluster
// size (most dominant color first). pixels is an array of [r,g,b] triples.
export function kmeans(pixels, k, iterations = 12) {
  const kUsed = Math.min(k, pixels.length);
  let centroids = initCentroids(pixels, kUsed);
  let assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < kUsed; c++) {
        const d = dist2(pixels[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      assignments[i] = best;
    }

    const sums = Array.from({ length: kUsed }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      sums[c][3] += 1;
    }
    centroids = centroids.map((prev, c) => (
      sums[c][3] > 0
        ? [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]]
        : prev
    ));
  }

  const counts = new Array(kUsed).fill(0);
  for (const a of assignments) counts[a] += 1;

  return centroids
    .map((color, i) => ({ color, count: counts[i] }))
    .sort((a, b) => b.count - a.count);
}

// minSeparation(k) -> the minimum RGB distance two extracted colors must
// have to both be kept, given that `k` colors were requested. Requesting
// more colors relaxes this (asking for 32 shades implies you want fine
// gradations that will naturally sit close together); requesting just a
// couple tightens it (you want colors that read as clearly distinct).
const MIN_REQUESTABLE = 2;
const MAX_REQUESTABLE = 32;
const SEPARATION_AT_MIN_K = 45;
const SEPARATION_AT_MAX_K = 10;

function minSeparation(k) {
  const t = Math.min(1, Math.max(0, (k - MIN_REQUESTABLE) / (MAX_REQUESTABLE - MIN_REQUESTABLE)));
  return SEPARATION_AT_MIN_K + (SEPARATION_AT_MAX_K - SEPARATION_AT_MIN_K) * t;
}

// extractDominantColors(imageData, k) -> string[] of "#rrggbb" hex colors,
// most dominant first. imageData is a canvas ImageData (RGBA). May return
// fewer than k colors: clusters that fall within minSeparation(k) of an
// already-kept, more-dominant color are dropped rather than exported as a
// near-indistinguishable duplicate shade.
export function extractDominantColors(imageData, k) {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const maxSamples = 5000;
  const stride = Math.max(1, Math.floor(totalPixels / maxSamples));

  const pixels = [];
  for (let i = 0; i < totalPixels; i += stride) {
    const idx = i * 4;
    if (data[idx + 3] < 16) continue; // skip mostly-transparent pixels
    pixels.push([data[idx], data[idx + 1], data[idx + 2]]);
  }
  if (pixels.length === 0) return [];

  const threshold2 = minSeparation(k) ** 2;
  const kept = [];
  for (const { color } of kmeans(pixels, k)) {
    if (kept.every((c) => dist2(color, c) >= threshold2)) {
      kept.push(color);
    }
  }

  return kept.map((color) => rgbToHex({ r: color[0], g: color[1], b: color[2] }));
}
