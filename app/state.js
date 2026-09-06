// App state — single object, no framework store needed.
// Resets on page reload by design (no persistence).
export const state = {
  imageSize: 1024,
  gridX: 8,
  gridY: 4,
  gradients: [],
};

let nextId = 1;

export function createGradient(overrides = {}) {
  return {
    id: String(nextId++),
    startColor: '#000000',
    endColor: '#ffffff',
    fadeWidth: 0.5,
    ...overrides,
  };
}
