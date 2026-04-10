export function escapeCsv(value: unknown): string {
  const raw = String(value ?? '');
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  const headers = ['time', 'user_info', 'answered_questions', 'answers'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}