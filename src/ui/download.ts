/** Keep the object URL alive while the browser starts consuming the download. */
export function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Download initiation is asynchronous; immediate revocation can race it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
