export type Entry = {
  name: string;
  contents: string;
};

export type ParsedSheetUrl = {
  sheetId: string;
  gid: string;
};

export function parseSheetUrl(input: string): ParsedSheetUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const sheetId = idMatch[1];

  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  return { sheetId, gid };
}

export function buildCsvUrl({ sheetId, gid }: ParsedSheetUrl): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // skip
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function rowsToEntries(rows: string[][]): Entry[] {
  if (rows.length === 0) return [];
  const [first, ...rest] = rows;
  const looksLikeHeader = first
    .map((c) => c.trim().toLowerCase())
    .some((c) => c === "name" || c === "contents" || c === "content");

  const body = looksLikeHeader ? rest : rows;

  return body
    .map((r): Entry => ({
      name: (r[0] ?? "").trim(),
      contents: (r[1] ?? "").trim(),
    }))
    .filter((e) => e.name.length > 0);
}

export async function fetchEntries(url: string): Promise<Entry[]> {
  const parsed = parseSheetUrl(url);
  if (!parsed) throw new Error("Could not parse Google Sheet URL.");
  const csvUrl = buildCsvUrl(parsed);
  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Failed to load sheet (HTTP ${res.status}). Make sure the sheet is shared as "Anyone with the link → Viewer".`
    );
  }
  const text = await res.text();
  return rowsToEntries(parseCsv(text));
}
