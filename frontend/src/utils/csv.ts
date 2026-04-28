/**
 * Tiny CSV builder without third-party dependencies.
 * Handles RFC 4180 escaping (double-quote wrapping when needed).
 */

function escapeCell(input: string): string {
  if (input.includes('"') || input.includes(',') || input.includes('\n') || input.includes('\r')) {
    return `"${input.replace(/"/g, '""')}"`;
  }
  return input;
}

export function buildCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map(row => row.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a browser download for an in-memory CSV string. Cleans up the
 * blob URL after the click so it does not leak into the document's life.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel compatibility
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Defer revocation by a tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
