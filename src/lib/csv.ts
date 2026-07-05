type CsvCell = string | number | null | undefined;

export type CsvRow = Record<string, CsvCell>;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv(rows: CsvRow[], filename: string): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvField(String(row[header] ?? ""))).join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getVaultExportFilename(type: "expenses" | "income", monthStr: string): string {
  const [year, month] = monthStr.split("-");
  return `vault-${type}-${month}-${year}.csv`;
}
