export type CsvRow = Record<string, string>;

const csvEscape = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[";,\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(rows: CsvRow[], headers: string[]) {
  return [
    headers.join(";"),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(";")),
  ].join("\n");
}

export function downloadCsv(filename: string, rows: CsvRow[], headers: string[]) {
  const blob = new Blob(["\ufeff" + toCsv(rows, headers)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ";" || char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell.trim());
  rows.push(row);

  const [headers = [], ...data] = rows.filter((r) => r.some(Boolean));
  return data.map((values) =>
    headers.reduce<CsvRow>((acc, header, index) => {
      acc[header.replace(/^\ufeff/, "").trim()] = values[index] ?? "";
      return acc;
    }, {}),
  );
}

export function pick(row: CsvRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value) return value.trim();
  }
  return "";
}

export function importCsvFile(onRows: (rows: CsvRow[]) => unknown | Promise<unknown>) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    await onRows(parseCsv(await file.text()));
  };
  input.click();
}
