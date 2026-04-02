import * as XLSX from "xlsx";

export type RawSheet = {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * Parse an Excel (.xlsx, .xls) or CSV file buffer into raw sheet data.
 * Returns all sheets found with their headers and row data.
 */
export function parseSpreadsheet(buffer: ArrayBuffer, fileName: string): RawSheet[] {
  const workbook = XLSX.read(buffer, { type: "array" });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    // Convert to array of objects; defval keeps empty cells as ""
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false, // always return strings
    });

    if (jsonRows.length === 0) {
      return { name: sheetName, headers: [], rows: [] };
    }

    // Extract headers from the first row's keys
    const headers = Object.keys(jsonRows[0]);

    // Normalise every cell value to a trimmed string
    const rows = jsonRows.map((row) => {
      const out: Record<string, string> = {};
      for (const h of headers) {
        out[h] = String(row[h] ?? "").trim();
      }
      return out;
    });

    return { name: sheetName, headers, rows };
  }).filter((s) => s.rows.length > 0); // skip empty sheets
}

/**
 * Preview: return the first N rows of a parsed sheet for the UI.
 */
export function previewRows(sheet: RawSheet, count = 5): Record<string, string>[] {
  return sheet.rows.slice(0, count);
}
