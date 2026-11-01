export type ExportColumn<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function cellValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

function csvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${normalized}"`;
}

export function buildCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => csvCell(column.label)).join(';');
  const lines = rows.map((row) => columns.map((column) => csvCell(cellValue(column.value(row)))).join(';'));
  return `\uFEFF${[header, ...lines].join('\r\n')}`;
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Feuille compatible Excel (SpreadsheetML/HTML) sans dépendance externe. */
export function buildExcelHtml<T>(columns: ExportColumn<T>[], rows: T[], title: string): string {
  const head = columns.map((column) => `<th>${htmlEscape(column.label)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${htmlEscape(cellValue(column.value(row)))}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="utf-8" />
<style>
  table { border-collapse: collapse; }
  th, td { border: 1px solid #cfcfcf; padding: 4px 8px; font-family: Arial, sans-serif; font-size: 11px; }
  th { background: #e8efe8; font-weight: bold; }
  h1 { font-family: Arial, sans-serif; font-size: 16px; }
</style>
</head>
<body>
<h1>${htmlEscape(title)}</h1>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body>
</html>`;
}

export function csvResponse<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): Response {
  return new Response(buildCsv(columns, rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export function excelResponse<T>(
  filename: string,
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
): Response {
  return new Response(buildExcelHtml(columns, rows, title), {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export function dateStamp(date = new Date()): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
