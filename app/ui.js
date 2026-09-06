import { state, createGradient } from './state.js';
import { composeTexture } from './render.js';
import { downloadCanvasAsPng } from './export.js';
import { createColorField } from './colorField.js';
import { parsePalette } from './palette.js';
import { darkenHex, lightenHex, rgbToHex } from './color.js';
import { extractDominantColors } from './imageAnalysis.js';
import { PALETTE_LIBRARY } from './paletteLibrary.js';
import { classifyPaletteMoods } from './paletteMood.js';
import { harmonizeColors } from './harmonize.js';

const previewPanel = document.getElementById('preview-panel');
const previewContainer = document.getElementById('preview-container');
const previewCanvas = document.getElementById('preview-canvas');
const previewCtx = previewCanvas.getContext('2d');
const fullResCanvas = document.getElementById('full-res-canvas');
const spinner = document.getElementById('spinner');
const panelDivider = document.getElementById('panel-divider');
const panelsEl = document.querySelector('.panels');
const gradientListEl = document.getElementById('gradient-list');
const emptyStateEl = document.getElementById('empty-state');
const imageSizeSelect = document.getElementById('image-size');
const minStripeWidthSelect = document.getElementById('min-stripe-width');
const addGradientBtn = document.getElementById('add-gradient');
const downloadBtn = document.getElementById('download');

const importPaletteBtn = document.getElementById('import-palette');
const importDialog = document.getElementById('import-dialog');
const importForm = document.getElementById('import-form');
const importTextarea = document.getElementById('import-textarea');
const importPreview = document.getElementById('import-preview');
const importLighten = document.getElementById('import-lighten');
const importLightenValue = document.getElementById('import-lighten-value');
const importDarken = document.getElementById('import-darken');
const importDarkenValue = document.getElementById('import-darken-value');
const importCancelBtn = document.getElementById('import-cancel');
const importConfirmBtn = document.getElementById('import-confirm');

const analyzeImageBtn = document.getElementById('analyze-image');
const analyzeDialog = document.getElementById('analyze-dialog');
const analyzeForm = document.getElementById('analyze-form');
const analyzeFileInput = document.getElementById('analyze-file-input');
const analyzeImagePreviewWrap = document.getElementById('analyze-image-preview-wrap');
const analyzeImageCanvas = document.getElementById('analyze-image-canvas');
const analyzeImageCtx = analyzeImageCanvas.getContext('2d', { willReadFrequently: true });
const analyzeModeTabs = document.getElementById('analyze-mode-tabs');
const analyzeManualHint = document.getElementById('analyze-manual-hint');
const analyzeColorCountRow = document.getElementById('analyze-color-count-row');
const analyzeColorCount = document.getElementById('analyze-color-count');
const analyzeColorCountValue = document.getElementById('analyze-color-count-value');
const analyzeRegenerateBtn = document.getElementById('analyze-regenerate');
const analyzeLighten = document.getElementById('analyze-lighten');
const analyzeLightenValue = document.getElementById('analyze-lighten-value');
const analyzeDarken = document.getElementById('analyze-darken');
const analyzeDarkenValue = document.getElementById('analyze-darken-value');
const analyzePreview = document.getElementById('analyze-preview');
const analyzeCancelBtn = document.getElementById('analyze-cancel');
const analyzeConfirmBtn = document.getElementById('analyze-confirm');

const openLibraryBtn = document.getElementById('open-library');
const libraryDialog = document.getElementById('library-dialog');
const libraryForm = document.getElementById('library-form');
const libraryMoodFilters = document.getElementById('library-mood-filters');
const libraryGrid = document.getElementById('library-grid');
const libraryPickerSection = document.getElementById('library-picker-section');
const libraryLighten = document.getElementById('library-lighten');
const libraryLightenValue = document.getElementById('library-lighten-value');
const libraryDarken = document.getElementById('library-darken');
const libraryDarkenValue = document.getElementById('library-darken-value');
const libraryPreview = document.getElementById('library-preview');
const libraryCancelBtn = document.getElementById('library-cancel');
const libraryConfirmBtn = document.getElementById('library-confirm');

const openMatchColorsBtn = document.getElementById('open-match-colors');
const matchColorsDialog = document.getElementById('match-colors-dialog');
const matchColorsForm = document.getElementById('match-colors-form');
const matchHue = document.getElementById('match-hue');
const matchHueValue = document.getElementById('match-hue-value');
const matchSaturation = document.getElementById('match-saturation');
const matchSaturationValue = document.getElementById('match-saturation-value');
const matchContrast = document.getElementById('match-contrast');
const matchContrastValue = document.getElementById('match-contrast-value');
const matchRegenerateEnd = document.getElementById('match-regenerate-end');
const matchDarkenRow = document.getElementById('match-darken-row');
const matchDarken = document.getElementById('match-darken');
const matchDarkenValue = document.getElementById('match-darken-value');
const matchPreviewBefore = document.getElementById('match-preview-before');
const matchPreviewAfter = document.getElementById('match-preview-after');
const matchCancelBtn = document.getElementById('match-cancel');

const clearGradientsBtn = document.getElementById('clear-gradients');
const clearConfirmDialog = document.getElementById('clear-confirm-dialog');
const clearConfirmForm = document.getElementById('clear-confirm-form');
const clearConfirmMessage = document.getElementById('clear-confirm-message');
const clearConfirmCancelBtn = document.getElementById('clear-confirm-cancel');

let renderQueued = false;

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    doRender();
  });
}

function doRender() {
  spinner.hidden = false;
  composeTexture(fullResCanvas, state);
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.drawImage(fullResCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
  spinner.hidden = true;
}

// Keeps the preview canvas's actual pixel resolution matched to its
// displayed size (so it stays crisp when the panel is resized), and
// re-renders whenever that size changes.
new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  const size = Math.round(Math.min(width, height));
  if (size > 0 && (previewCanvas.width !== size || previewCanvas.height !== size)) {
    previewCanvas.width = size;
    previewCanvas.height = size;
    scheduleRender();
  }
}).observe(previewContainer);

const MIN_PREVIEW_PANEL_WIDTH = 280;
const MIN_GRADIENT_PANEL_WIDTH = 340;

function maxPreviewPanelWidth() {
  const panelsRect = panelsEl.getBoundingClientRect();
  return panelsRect.width - MIN_GRADIENT_PANEL_WIDTH - panelDivider.offsetWidth;
}

let dividerDragging = false;
panelDivider.addEventListener('pointerdown', (e) => {
  dividerDragging = true;
  panelDivider.setPointerCapture(e.pointerId);
  panelDivider.classList.add('dragging');
});
panelDivider.addEventListener('pointermove', (e) => {
  if (!dividerDragging) return;
  const panelsRect = panelsEl.getBoundingClientRect();
  const newWidth = Math.min(maxPreviewPanelWidth(), Math.max(MIN_PREVIEW_PANEL_WIDTH, e.clientX - panelsRect.left));
  previewPanel.style.width = `${newWidth}px`;
});
panelDivider.addEventListener('pointerup', () => {
  dividerDragging = false;
  panelDivider.classList.remove('dragging');
});

// Re-clamps the preview panel whenever the window itself resizes, so
// shrinking the OS window can't push the gradient panel into overflow (the
// panel keeps whatever width the user chose as long as it still fits).
window.addEventListener('resize', () => {
  const maxWidth = Math.max(MIN_PREVIEW_PANEL_WIDTH, maxPreviewPanelWidth());
  if (previewPanel.getBoundingClientRect().width > maxWidth) {
    previewPanel.style.width = `${maxWidth}px`;
  }
});

function buildGradientRow(gradient) {
  const li = document.createElement('li');
  li.className = 'gradient-row';
  li.dataset.id = gradient.id;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '☰';
  handle.title = 'Drag to reorder';

  const startField = createColorField(gradient.startColor, (hex) => {
    gradient.startColor = hex;
    scheduleRender();
  });
  startField.element.classList.add('start-color-field');

  const endField = createColorField(gradient.endColor, (hex) => {
    gradient.endColor = hex;
    scheduleRender();
  });
  endField.element.classList.add('end-color-field');

  const copyControls = document.createElement('div');
  copyControls.className = 'copy-controls';

  const copyToEndBtn = document.createElement('button');
  copyToEndBtn.type = 'button';
  copyToEndBtn.className = 'copy-btn';
  copyToEndBtn.textContent = '→';
  copyToEndBtn.title = 'Copy start color to end color';
  copyToEndBtn.addEventListener('click', () => {
    gradient.endColor = gradient.startColor;
    endField.setValue(gradient.endColor);
    scheduleRender();
  });

  const copyToStartBtn = document.createElement('button');
  copyToStartBtn.type = 'button';
  copyToStartBtn.className = 'copy-btn';
  copyToStartBtn.textContent = '←';
  copyToStartBtn.title = 'Copy end color to start color';
  copyToStartBtn.addEventListener('click', () => {
    gradient.startColor = gradient.endColor;
    startField.setValue(gradient.startColor);
    scheduleRender();
  });

  copyControls.append(copyToEndBtn, copyToStartBtn);

  const fadeWidth = document.createElement('input');
  fadeWidth.type = 'range';
  fadeWidth.className = 'fade-width';
  fadeWidth.min = '0';
  fadeWidth.max = '1';
  fadeWidth.step = '0.01';
  fadeWidth.value = String(gradient.fadeWidth);
  fadeWidth.title = 'Fade width';

  const fadeValue = document.createElement('span');
  fadeValue.className = 'fade-value';
  fadeValue.textContent = gradient.fadeWidth.toFixed(2);

  fadeWidth.addEventListener('input', () => {
    gradient.fadeWidth = parseFloat(fadeWidth.value);
    fadeValue.textContent = gradient.fadeWidth.toFixed(2);
    scheduleRender();
  });

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '✕';
  removeBtn.title = 'Remove gradient';
  removeBtn.addEventListener('click', () => {
    const idx = state.gradients.findIndex((g) => g.id === gradient.id);
    if (idx !== -1) state.gradients.splice(idx, 1);
    renderGradientList();
    scheduleRender();
  });

  li.append(handle, startField.element, copyControls, endField.element, fadeWidth, fadeValue, removeBtn);
  return li;
}

function renderGradientList() {
  gradientListEl.innerHTML = '';
  emptyStateEl.hidden = state.gradients.length > 0;
  for (const gradient of state.gradients) {
    gradientListEl.appendChild(buildGradientRow(gradient));
  }
  openMatchColorsBtn.disabled = state.gradients.length < 2;
  clearGradientsBtn.disabled = state.gradients.length === 0;
}

addGradientBtn.addEventListener('click', () => {
  state.gradients.push(createGradient());
  renderGradientList();
  scheduleRender();
});

imageSizeSelect.addEventListener('change', () => {
  state.imageSize = parseInt(imageSizeSelect.value, 10);
  scheduleRender();
});

minStripeWidthSelect.addEventListener('change', () => {
  state.minStripeWidth = parseInt(minStripeWidthSelect.value, 10);
  scheduleRender();
});

downloadBtn.addEventListener('click', () => {
  composeTexture(fullResCanvas, state);
  downloadCanvasAsPng(fullResCanvas, `gradient-texture-${state.imageSize}.png`);
});

// eslint-disable-next-line no-undef -- Sortable is loaded globally via CDN script tag in index.html
new Sortable(gradientListEl, {
  handle: '.drag-handle',
  animation: 150,
  onEnd: () => {
    const orderedIds = Array.from(gradientListEl.children).map((li) => li.dataset.id);
    state.gradients.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
    scheduleRender();
  },
});

// Manages one "list of extracted colors -> gradients" picker: renders a
// lighten(start)/darken(end) swatch pair per hex. In the default mode,
// clicking a pair excludes/re-includes it (dimmed, still in the list). In
// removable mode, a small X permanently removes it instead — used by the
// image-analyze dialog, which offers a Regenerate button to bring auto-
// detected colors back rather than a toggle. Disables confirmBtn when
// nothing would be imported.
function createSwatchPicker({
  container, confirmBtn, lightenInput, darkenInput, removable = false,
}) {
  let hexes = [];
  let excluded = new Set();

  function lightenAmount() {
    return Number(lightenInput.value) / 100;
  }
  function darkenAmount() {
    return Number(darkenInput.value) / 100;
  }

  function render() {
    container.innerHTML = '';
    hexes.forEach((hex, i) => {
      const isExcluded = !removable && excluded.has(i);
      const pair = document.createElement('div');
      pair.className = isExcluded ? 'import-swatch-pair excluded' : 'import-swatch-pair';
      if (removable) pair.classList.add('removable');
      pair.title = removable
        ? hex
        : (isExcluded ? `${hex} — excluded, click to include` : `${hex} — click to exclude`);

      const start = document.createElement('span');
      start.className = 'import-swatch';
      start.style.background = lightenHex(hex, lightenAmount());

      const end = document.createElement('span');
      end.className = 'import-swatch';
      end.style.background = darkenHex(hex, darkenAmount());

      pair.append(start, end);

      if (removable) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'swatch-remove-btn';
        removeBtn.title = 'Remove this color';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => {
          hexes = hexes.filter((_, idx) => idx !== i);
          render();
        });
        pair.appendChild(removeBtn);
      } else {
        pair.addEventListener('click', () => {
          if (isExcluded) excluded.delete(i); else excluded.add(i);
          render();
        });
      }

      container.appendChild(pair);
    });
    const includedCount = removable ? hexes.length : hexes.length - excluded.size;
    confirmBtn.disabled = includedCount === 0;
  }

  return {
    setHexes(newHexes) {
      hexes = newHexes;
      excluded = new Set();
      render();
    },
    addHex(hex) {
      hexes = [...hexes, hex];
      render();
    },
    getCount() {
      return hexes.length;
    },
    rerender: render,
    reset() {
      hexes = [];
      excluded = new Set();
      container.innerHTML = '';
      confirmBtn.disabled = true;
    },
    getIncludedColors() {
      const included = removable
        ? hexes
        : hexes.map((hex, i) => (excluded.has(i) ? null : hex)).filter((hex) => hex !== null);
      return included.map((hex) => ({
        startColor: lightenHex(hex, lightenAmount()),
        endColor: darkenHex(hex, darkenAmount()),
      }));
    },
  };
}

const importPicker = createSwatchPicker({
  container: importPreview,
  confirmBtn: importConfirmBtn,
  lightenInput: importLighten,
  darkenInput: importDarken,
});

importPaletteBtn.addEventListener('click', () => {
  importTextarea.value = '';
  importPicker.reset();
  importDialog.showModal();
  importTextarea.focus();
});

importTextarea.addEventListener('input', () => {
  importPicker.setHexes(parsePalette(importTextarea.value));
});
importLighten.addEventListener('input', () => {
  importLightenValue.textContent = `${importLighten.value}%`;
  importPicker.rerender();
});
importDarken.addEventListener('input', () => {
  importDarkenValue.textContent = `${importDarken.value}%`;
  importPicker.rerender();
});

importCancelBtn.addEventListener('click', () => {
  importDialog.close();
});

importForm.addEventListener('submit', (e) => {
  e.preventDefault();
  for (const { startColor, endColor } of importPicker.getIncludedColors()) {
    state.gradients.push(createGradient({ startColor, endColor }));
  }
  renderGradientList();
  scheduleRender();
  importDialog.close();
});

let loadedImageData = null;
let analyzeMode = 'auto';

// Draws the file into analyze-image-canvas (both the visible preview and the
// source for pixel sampling / extraction) and returns its ImageData.
function loadImageIntoCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 360;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      analyzeImageCanvas.width = w;
      analyzeImageCanvas.height = h;
      analyzeImageCtx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      resolve(analyzeImageCtx.getImageData(0, 0, w, h));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const analyzePicker = createSwatchPicker({
  container: analyzePreview,
  confirmBtn: analyzeConfirmBtn,
  lightenInput: analyzeLighten,
  darkenInput: analyzeDarken,
  removable: true,
});

function runExtraction() {
  if (!loadedImageData) return;
  analyzePicker.setHexes(extractDominantColors(loadedImageData, Number(analyzeColorCount.value)));
}

analyzeRegenerateBtn.addEventListener('click', () => {
  runExtraction();
});

function setAnalyzeMode(mode) {
  analyzeMode = mode;
  Array.from(analyzeModeTabs.children).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  analyzeColorCountRow.hidden = mode !== 'auto';
  analyzeManualHint.hidden = mode !== 'manual';
  analyzeImageCanvas.classList.toggle('pick-mode', mode === 'manual');
  // Switching to auto only fills the list if it's empty, so it never
  // clobbers colors the user already picked manually.
  if (mode === 'auto' && loadedImageData && analyzePicker.getCount() === 0) {
    runExtraction();
  }
}

Array.from(analyzeModeTabs.children).forEach((btn) => {
  btn.addEventListener('click', () => setAnalyzeMode(btn.dataset.mode));
});

analyzeImageCanvas.addEventListener('click', (e) => {
  if (analyzeMode !== 'manual' || !loadedImageData) return;
  const rect = analyzeImageCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) * (analyzeImageCanvas.width / rect.width));
  const y = Math.floor((e.clientY - rect.top) * (analyzeImageCanvas.height / rect.height));
  const [r, g, b] = analyzeImageCtx.getImageData(x, y, 1, 1).data;
  analyzePicker.addHex(rgbToHex({ r, g, b }));
});

analyzeImageBtn.addEventListener('click', () => {
  analyzeFileInput.value = '';
  loadedImageData = null;
  analyzeImagePreviewWrap.hidden = true;
  analyzeModeTabs.hidden = true;
  analyzePicker.reset();
  setAnalyzeMode('auto');
  analyzeDialog.showModal();
});

analyzeFileInput.addEventListener('change', async () => {
  const file = analyzeFileInput.files[0];
  if (!file) return;
  analyzePicker.reset();
  loadedImageData = await loadImageIntoCanvas(file);
  analyzeImagePreviewWrap.hidden = false;
  analyzeModeTabs.hidden = false;
  if (analyzeMode === 'auto') runExtraction();
});

analyzeColorCount.addEventListener('input', () => {
  analyzeColorCountValue.textContent = analyzeColorCount.value;
  runExtraction();
});
analyzeLighten.addEventListener('input', () => {
  analyzeLightenValue.textContent = `${analyzeLighten.value}%`;
  analyzePicker.rerender();
});
analyzeDarken.addEventListener('input', () => {
  analyzeDarkenValue.textContent = `${analyzeDarken.value}%`;
  analyzePicker.rerender();
});

analyzeCancelBtn.addEventListener('click', () => {
  analyzeDialog.close();
});

analyzeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  for (const { startColor, endColor } of analyzePicker.getIncludedColors()) {
    state.gradients.push(createGradient({ startColor, endColor }));
  }
  renderGradientList();
  scheduleRender();
  analyzeDialog.close();
});

// Moods are computed once at load — the bundled dataset has no tags of its
// own, so these are derived from each palette's actual colors (see
// paletteMood.js).
const paletteMoods = PALETTE_LIBRARY.map(classifyPaletteMoods);
const allMoods = Array.from(new Set(paletteMoods.flat())).sort();

let activeMoods = new Set();
let selectedPaletteIndex = -1;

const libraryPicker = createSwatchPicker({
  container: libraryPreview,
  confirmBtn: libraryConfirmBtn,
  lightenInput: libraryLighten,
  darkenInput: libraryDarken,
});

function renderMoodFilters() {
  libraryMoodFilters.innerHTML = '';
  for (const mood of allMoods) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = mood;
    btn.classList.toggle('active', activeMoods.has(mood));
    btn.addEventListener('click', () => {
      if (activeMoods.has(mood)) activeMoods.delete(mood); else activeMoods.add(mood);
      renderMoodFilters();
      renderLibraryGrid();
    });
    libraryMoodFilters.appendChild(btn);
  }
}

function selectPalette(index) {
  selectedPaletteIndex = index;
  renderLibraryGrid();
  libraryPickerSection.hidden = false;
  libraryPicker.setHexes(PALETTE_LIBRARY[index]);
}

function renderLibraryGrid() {
  libraryGrid.innerHTML = '';
  let shownCount = 0;
  PALETTE_LIBRARY.forEach((palette, i) => {
    if (activeMoods.size > 0 && !paletteMoods[i].some((m) => activeMoods.has(m))) return;
    shownCount += 1;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = i === selectedPaletteIndex ? 'library-palette-card selected' : 'library-palette-card';
    card.title = paletteMoods[i].join(', ');
    for (const hex of palette) {
      const swatch = document.createElement('span');
      swatch.style.background = hex;
      card.appendChild(swatch);
    }
    card.addEventListener('click', () => selectPalette(i));
    libraryGrid.appendChild(card);
  });

  if (shownCount === 0) {
    const empty = document.createElement('p');
    empty.className = 'library-empty';
    empty.textContent = 'No palettes match the selected moods.';
    libraryGrid.appendChild(empty);
  }
}

openLibraryBtn.addEventListener('click', () => {
  activeMoods = new Set();
  selectedPaletteIndex = -1;
  libraryPickerSection.hidden = true;
  libraryPicker.reset();
  renderMoodFilters();
  renderLibraryGrid();
  libraryDialog.showModal();
});

libraryLighten.addEventListener('input', () => {
  libraryLightenValue.textContent = `${libraryLighten.value}%`;
  libraryPicker.rerender();
});
libraryDarken.addEventListener('input', () => {
  libraryDarkenValue.textContent = `${libraryDarken.value}%`;
  libraryPicker.rerender();
});

libraryCancelBtn.addEventListener('click', () => {
  libraryDialog.close();
});

libraryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  for (const { startColor, endColor } of libraryPicker.getIncludedColors()) {
    state.gradients.push(createGradient({ startColor, endColor }));
  }
  renderGradientList();
  scheduleRender();
  libraryDialog.close();
});

function renderPairRow(container, pairs) {
  container.innerHTML = '';
  for (const { start, end } of pairs) {
    const pair = document.createElement('div');
    pair.className = 'match-pair';
    const startSwatch = document.createElement('span');
    startSwatch.style.background = start;
    const endSwatch = document.createElement('span');
    endSwatch.style.background = end;
    pair.append(startSwatch, endSwatch);
    container.appendChild(pair);
  }
}

function currentMatchAmounts() {
  return {
    hueAmount: Number(matchHue.value) / 100,
    saturationAmount: Number(matchSaturation.value) / 100,
    contrastAmount: Number(matchContrast.value) / 100,
  };
}

let matchPreviewResult = null;

function updateMatchPreview() {
  const startColors = state.gradients.map((g) => g.startColor);
  const endColors = state.gradients.map((g) => g.endColor);
  matchPreviewResult = harmonizeColors(startColors, currentMatchAmounts());

  const regenerateEnd = matchRegenerateEnd.checked;
  const darkenAmount = Number(matchDarken.value) / 100;

  const currentPairs = startColors.map((start, i) => ({ start, end: endColors[i] }));
  const previewPairs = matchPreviewResult.hexes.map((start, i) => ({
    start,
    end: regenerateEnd ? darkenHex(start, darkenAmount) : endColors[i],
  }));

  renderPairRow(matchPreviewBefore, currentPairs);
  renderPairRow(matchPreviewAfter, previewPairs);
}

openMatchColorsBtn.addEventListener('click', () => {
  matchHue.value = '50';
  matchSaturation.value = '50';
  matchContrast.value = '50';
  matchHueValue.textContent = '50%';
  matchSaturationValue.textContent = '50%';
  matchContrastValue.textContent = '50%';
  matchRegenerateEnd.checked = false;
  matchDarkenRow.hidden = true;
  matchDarken.value = '40';
  matchDarkenValue.textContent = '40%';
  updateMatchPreview();
  matchColorsDialog.showModal();
});

[
  [matchHue, matchHueValue],
  [matchSaturation, matchSaturationValue],
  [matchContrast, matchContrastValue],
].forEach(([input, valueEl]) => {
  input.addEventListener('input', () => {
    valueEl.textContent = `${input.value}%`;
    updateMatchPreview();
  });
});

matchRegenerateEnd.addEventListener('change', () => {
  matchDarkenRow.hidden = !matchRegenerateEnd.checked;
  updateMatchPreview();
});
matchDarken.addEventListener('input', () => {
  matchDarkenValue.textContent = `${matchDarken.value}%`;
  updateMatchPreview();
});

matchCancelBtn.addEventListener('click', () => {
  matchColorsDialog.close();
});

matchColorsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!matchPreviewResult) return;
  const regenerateEnd = matchRegenerateEnd.checked;
  const darkenAmount = Number(matchDarken.value) / 100;
  state.gradients.forEach((gradient, i) => {
    const newStart = matchPreviewResult.hexes[i];
    gradient.startColor = newStart;
    if (regenerateEnd) {
      gradient.endColor = darkenHex(newStart, darkenAmount);
    }
  });
  renderGradientList();
  scheduleRender();
  matchColorsDialog.close();
});

clearGradientsBtn.addEventListener('click', () => {
  const count = state.gradients.length;
  clearConfirmMessage.textContent = `This removes all ${count} gradient${count === 1 ? '' : 's'} from your list. This can't be undone.`;
  clearConfirmDialog.showModal();
});

clearConfirmCancelBtn.addEventListener('click', () => {
  clearConfirmDialog.close();
});

clearConfirmForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.gradients.length = 0;
  renderGradientList();
  scheduleRender();
  clearConfirmDialog.close();
});

imageSizeSelect.value = String(state.imageSize);
minStripeWidthSelect.value = String(state.minStripeWidth);

renderGradientList();
scheduleRender();
