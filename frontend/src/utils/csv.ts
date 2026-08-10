// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
/**
 * Tiny CSV builder without third-party dependencies.
 * Handles RFC 4180 escaping (double-quote wrapping when needed).
 */

function escapeCell(input: string): string {
  let safe = input;
  // Spreadsheet formula injection: a leading =, +, -, @, tab, or CR makes
  // Excel/Sheets/LibreOffice evaluate the cell as a formula. Prefix with a
  // single quote (the standard "treat as text" escape) so a secret payload
  // exported to CSV cannot execute.
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes('"') || safe.includes(',') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
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
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
