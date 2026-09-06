// layoutStripes(count, imageSize, gridX, gridY) -> Rect[]
// Pure function: same inputs always produce the same rects, regardless of
// how many gradients actually exist — this is what makes swapping colors in
// an existing palette and re-exporting produce a pixel-identical layout,
// with no UV adjustments needed on the Blender side.
export function layoutStripes(count, imageSize, gridX, gridY) {
  if (count <= 0) return [];

  const cols = Math.max(1, gridX);
  const rows = Math.max(1, gridY);
  const cellWidth = imageSize / cols;
  const cellHeight = imageSize / rows;
  const n = Math.min(count, cols * rows);

  const rects = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    rects.push({
      x: col * cellWidth,
      y: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    });
  }
  return rects;
}
