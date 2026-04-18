export function escapeCsv(value: unknown): string {
  const raw = String(value ?? '');
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return `${lines.join('\n')}\n`;
}
