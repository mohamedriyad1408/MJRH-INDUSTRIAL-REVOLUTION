/**
 * Export data to CSV format.
 * Pure implementation — no external dependencies.
 */

/**
 * Export an array of objects to CSV and trigger download.
 * Includes BOM for proper Arabic/UTF-8 support in Excel.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (!data.length) return;

  const cols = columns || Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: k }));
  const headers = cols.map((c) => `"${c.label}"`).join(",");

  const rows = data.map((row) =>
    cols
      .map((c) => {
        const v = row[c.key];
        if (v === null || v === undefined) return '""';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      })
      .join(",")
  );

  // BOM for Arabic support in Excel
  const csv = "\uFEFF" + headers + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Alias for backward compatibility.
 */
export const exportData = exportToCsv;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
