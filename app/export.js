export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function downloadViaAnchor(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isFilePickerSupported() {
  return typeof window.showSaveFilePicker === 'function';
}

// saveBlob(blob, filename, opts) — opens a native single-file "Save As"
// dialog via the File System Access API, falling back to a plain browser
// download when that API isn't available. Unlike directory access, a single
// showSaveFilePicker() save implicitly grants write access to just that one
// file as part of the same user action — no separate readwrite-permission
// step needed, which is what makes this reliable where folder-based saving
// wasn't.
// Returns false if the user cancelled the picker, true otherwise.
export async function saveBlob(blob, filename, { description, accept } = {}) {
  if (isFilePickerSupported()) {
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: description ? [{ description, accept }] : undefined,
      });
    } catch (err) {
      if (err.name === 'AbortError') return false; // user cancelled the picker
      handle = null;
    }
    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }
  }

  downloadViaAnchor(blob, filename);
  return true;
}
