import {
  hexToHsl, hslToHex, hexToRgb, rgbToHex, hexToHsv, hsvToHex,
} from './color.js';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

const HEX_PATTERN = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function normalizeHex(raw) {
  const match = HEX_PATTERN.exec(raw.trim());
  if (!match) return null;
  let h = match[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h.toLowerCase()}`;
}

// A single global listener closes any open color popover on an outside
// click, instead of one listener per field (which would leak on every
// gradient-list rebuild).
let globalCloseListenerAttached = false;
function ensureGlobalCloseListener() {
  if (globalCloseListenerAttached) return;
  globalCloseListenerAttached = true;
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.color-popover').forEach((popover) => {
      const wrapper = popover.closest('.color-field');
      if (wrapper && !wrapper.contains(e.target)) {
        popover.hidden = true;
      }
    });
  });
}

// Full hue spectrum bar, clickable/draggable to set hue directly, with a
// marker showing the current position. Shared above both the HSL and RGB
// tabs since hue means the same thing in both.
function makeHueStrip(onPick) {
  const strip = document.createElement('div');
  strip.className = 'hue-strip';

  const indicator = document.createElement('div');
  indicator.className = 'hue-strip-indicator';
  strip.appendChild(indicator);

  function setHue(h) {
    indicator.style.left = `${(clamp(h, 0, 360) / 360) * 100}%`;
  }

  function handlePointer(e) {
    const rect = strip.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    onPick(x * 360);
  }

  let dragging = false;
  strip.addEventListener('pointerdown', (e) => {
    dragging = true;
    strip.setPointerCapture(e.pointerId);
    handlePointer(e);
  });
  strip.addEventListener('pointermove', (e) => {
    if (dragging) handlePointer(e);
  });
  strip.addEventListener('pointerup', () => {
    dragging = false;
  });

  return { element: strip, setHue };
}

// A 2D saturation x value square (HSV model) tinted by the current hue —
// click or drag anywhere to pick a color visually, the way a native OS
// color picker does.
function makeSvSquare(onPick) {
  const square = document.createElement('div');
  square.className = 'sv-square';

  const marker = document.createElement('div');
  marker.className = 'sv-square-marker';
  square.appendChild(marker);

  function setHue(h) {
    square.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
  }

  function setMarker(s, v) {
    marker.style.left = `${clamp(s, 0, 100)}%`;
    marker.style.top = `${100 - clamp(v, 0, 100)}%`;
  }

  function handlePointer(e) {
    const rect = square.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    onPick(x * 100, (1 - y) * 100);
  }

  let dragging = false;
  square.addEventListener('pointerdown', (e) => {
    dragging = true;
    square.setPointerCapture(e.pointerId);
    handlePointer(e);
  });
  square.addEventListener('pointermove', (e) => {
    if (dragging) handlePointer(e);
  });
  square.addEventListener('pointerup', () => {
    dragging = false;
  });

  return { element: square, setHue, setMarker };
}

// One labeled slider + read-only value readout, stacked top-to-bottom so
// each channel gets a full-width slider. Used for both HSL and RGB rows.
function makeSliderRow(labelText, min, max, unit) {
  const row = document.createElement('div');
  row.className = 'hsl-row';

  const label = document.createElement('span');
  label.className = 'hsl-row-label';
  label.textContent = labelText;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);

  const valueEl = document.createElement('span');
  valueEl.className = 'hsl-row-value';

  row.append(label, slider, valueEl);

  function setDisplay(value) {
    valueEl.textContent = `${Math.round(value)}${unit}`;
  }

  return { row, slider, setDisplay };
}

function makeModeTabs(onChange) {
  const tabs = document.createElement('div');
  tabs.className = 'segmented-tabs';

  const hslBtn = document.createElement('button');
  hslBtn.type = 'button';
  hslBtn.textContent = 'HSL';

  const rgbBtn = document.createElement('button');
  rgbBtn.type = 'button';
  rgbBtn.textContent = 'RGB';

  tabs.append(hslBtn, rgbBtn);

  function setActive(mode) {
    hslBtn.classList.toggle('active', mode === 'hsl');
    rgbBtn.classList.toggle('active', mode === 'rgb');
  }

  hslBtn.addEventListener('click', () => onChange('hsl'));
  rgbBtn.addEventListener('click', () => onChange('rgb'));

  return { element: tabs, setActive };
}

// createColorField(initialHex, onChange) -> { element, setValue }
// A single color swatch that opens a popover with a hex field, a shared
// hue strip, and HSL/RGB tabs (RGB includes a clickable 2D saturation x
// value square) — this is the only way to edit a color, no native OS/
// browser color picker involved. All controls stay live-synced through one
// shared syncFromHex().
export function createColorField(initialHex, onChange) {
  ensureGlobalCloseListener();

  const wrapper = document.createElement('div');
  wrapper.className = 'color-field';

  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.className = 'color-swatch';
  swatch.title = 'Edit color';

  const popover = document.createElement('div');
  popover.className = 'color-popover';
  popover.hidden = true;

  const hexRow = document.createElement('div');
  hexRow.className = 'hsl-row hex-row';
  const hexLabel = document.createElement('span');
  hexLabel.className = 'hsl-row-label';
  hexLabel.textContent = '#';
  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.className = 'hex-input';
  hexInput.spellcheck = false;
  hexInput.maxLength = 7;
  hexRow.append(hexLabel, hexInput);

  const hueStrip = makeHueStrip((h) => commitHueOnly(h));

  const hslPanel = document.createElement('div');
  hslPanel.className = 'color-mode-panel';
  const hField = makeSliderRow('H', 0, 360, '°');
  const sField = makeSliderRow('S', 0, 100, '%');
  const lField = makeSliderRow('L', 0, 100, '%');
  hslPanel.append(hField.row, sField.row, lField.row);

  const rgbPanel = document.createElement('div');
  rgbPanel.className = 'color-mode-panel';
  rgbPanel.hidden = true;
  const svSquare = makeSvSquare((s, v) => commitSv(s, v));
  const rField = makeSliderRow('R', 0, 255, '');
  const gField = makeSliderRow('G', 0, 255, '');
  const bField = makeSliderRow('B', 0, 255, '');
  rgbPanel.append(svSquare.element, rField.row, gField.row, bField.row);

  const modeTabs = makeModeTabs((mode) => {
    hslPanel.hidden = mode !== 'hsl';
    rgbPanel.hidden = mode !== 'rgb';
    modeTabs.setActive(mode);
  });
  modeTabs.setActive('hsl');

  popover.append(hexRow, hueStrip.element, modeTabs.element, hslPanel, rgbPanel);
  wrapper.append(swatch, popover);

  let currentHex = initialHex;

  function syncFromHex(hex) {
    currentHex = hex;
    swatch.style.background = hex;
    hexInput.value = hex;

    const { h, s, l } = hexToHsl(hex);
    hField.slider.value = String(h);
    sField.slider.value = String(s);
    lField.slider.value = String(l);
    hField.setDisplay(h);
    sField.setDisplay(s);
    lField.setDisplay(l);
    hueStrip.setHue(h);

    const hsv = hexToHsv(hex);
    svSquare.setHue(h);
    svSquare.setMarker(hsv.s, hsv.v);

    const { r, g, b } = hexToRgb(hex);
    rField.slider.value = String(r);
    gField.slider.value = String(g);
    bField.slider.value = String(b);
    rField.setDisplay(r);
    gField.setDisplay(g);
    bField.setDisplay(b);
  }
  syncFromHex(initialHex);

  function commitHsl() {
    const h = clamp(Number(hField.slider.value) || 0, 0, 360);
    const s = clamp(Number(sField.slider.value) || 0, 0, 100);
    const l = clamp(Number(lField.slider.value) || 0, 0, 100);
    const hex = hslToHex({ h, s, l });
    syncFromHex(hex);
    onChange(hex);
  }
  [hField.slider, sField.slider, lField.slider].forEach((slider) => {
    slider.addEventListener('input', commitHsl);
  });

  function commitHueOnly(h) {
    const s = Number(sField.slider.value);
    const l = Number(lField.slider.value);
    const hex = hslToHex({ h, s, l });
    syncFromHex(hex);
    onChange(hex);
  }

  function commitSv(s, v) {
    const h = hexToHsl(currentHex).h;
    const hex = hsvToHex({ h, s, v });
    syncFromHex(hex);
    onChange(hex);
  }

  function commitRgb() {
    const r = clamp(Number(rField.slider.value) || 0, 0, 255);
    const g = clamp(Number(gField.slider.value) || 0, 0, 255);
    const b = clamp(Number(bField.slider.value) || 0, 0, 255);
    const hex = rgbToHex({ r, g, b });
    syncFromHex(hex);
    onChange(hex);
  }
  [rField.slider, gField.slider, bField.slider].forEach((slider) => {
    slider.addEventListener('input', commitRgb);
  });

  function commitHex() {
    const hex = normalizeHex(hexInput.value);
    if (!hex) {
      hexInput.value = currentHex;
      return;
    }
    syncFromHex(hex);
    onChange(hex);
  }
  hexInput.addEventListener('change', commitHex);
  hexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitHex();
      hexInput.blur();
    }
  });

  swatch.addEventListener('click', () => {
    popover.hidden = !popover.hidden;
  });

  return {
    element: wrapper,
    setValue: syncFromHex,
  };
}
