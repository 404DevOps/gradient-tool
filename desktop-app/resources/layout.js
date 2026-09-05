// layoutStripes(count, imageSize, minStripeWidth) -> Rect[]
// Pure function: no DOM/canvas access, same inputs always produce the same rects.
export function layoutStripes(count, imageSize, minStripeWidth) {
  if (count <= 0) return [];

  const maxCols = Math.max(1, Math.floor(imageSize / minStripeWidth));
  const rows = Math.ceil(count / maxCols);
  const base = Math.floor(count / rows);
  const remainder = count % rows;
  const rowHeight = imageSize / rows;

  const rects = [];
  for (let r = 0; r < rows; r++) {
    const itemsInRow = r < remainder ? base + 1 : base;
    const stripeWidth = imageSize / itemsInRow;
    const y = r * rowHeight;
    for (let c = 0; c < itemsInRow; c++) {
      rects.push({
        x: c * stripeWidth,
        y,
        width: stripeWidth,
        height: rowHeight,
      });
    }
  }
  return rects;
}
