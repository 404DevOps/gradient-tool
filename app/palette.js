// parsePalette(text) -> string[] of normalized "#rrggbb" hex colors.
// Auto-detects coolors.co export formats: CSV, "With #", Array, Object,
// Extended Array, XML. Pure function — no DOM/state, only DOMParser for XML.
function normalizeHex(raw) {
  if (typeof raw !== 'string') return null;
  let h = raw.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$/.test(h) && !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  return `#${h.toLowerCase()}`;
}

export function parsePalette(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item : item && item.hex))
        .map(normalizeHex)
        .filter(Boolean);
    }
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).map(normalizeHex).filter(Boolean);
    }
  } catch {
    // Not JSON — fall through to XML/CSV handling.
  }

  if (trimmed.startsWith('<')) {
    const doc = new DOMParser().parseFromString(trimmed, 'application/xml');
    if (!doc.querySelector('parsererror')) {
      const hexes = Array.from(doc.querySelectorAll('color'))
        .map((node) => node.getAttribute('hex'))
        .map(normalizeHex)
        .filter(Boolean);
      if (hexes.length) return hexes;
    }
  }

  return trimmed
    .split(/[,\n]/)
    .map(normalizeHex)
    .filter(Boolean);
}
