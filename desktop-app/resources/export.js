function canvasToBlob(canvas) {
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

// downloadCanvasAsPng(canvas, filename) — opens a native "Save As" dialog
// (via the File System Access API) so the user can pick a folder, falling
// back to a plain browser download when that API isn't available.
export async function downloadCanvasAsPng(canvas, filename) {
  if (window.showSaveFilePicker) {
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
      });
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled the picker
      handle = null;
    }
    if (handle) {
      const blob = await canvasToBlob(canvas);
      if (!blob) return;
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }
  }

  const blob = await canvasToBlob(canvas);
  if (!blob) return;
  downloadViaAnchor(blob, filename);
}
