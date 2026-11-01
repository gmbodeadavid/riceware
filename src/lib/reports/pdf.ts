export type PdfTableColumn = {
  label: string;
  width?: number;
};

export type PdfTable = {
  title?: string;
  columns: PdfTableColumn[];
  rows: Array<Array<string | number | null | undefined>>;
};

export type PdfSection = {
  title?: string;
  lines: string[];
};

export type SimplePdfInput = {
  title: string;
  subtitle?: string;
  meta?: string[];
  sections?: PdfSection[];
  tables?: PdfTable[];
  footer?: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 48;

function sanitize(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '?');
}

function escapePdfText(value: string): string {
  return sanitize(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(value: string, maxWidth: number, fontSize: number): string[] {
  const text = sanitize(value).replace(/\r?\n/g, ' ').trim();
  if (!text) return [''];

  const maxChars = Math.max(6, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (word.length > maxChars) {
        let rest = word;
        while (rest.length > maxChars) {
          lines.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        current = rest;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

type Page = {
  commands: string[];
  y: number;
};

class PdfBuilder {
  private pages: Page[] = [];
  private page: Page;

  constructor(private readonly title: string) {
    this.page = this.newPage();
  }

  private newPage(): Page {
    const page: Page = { commands: [], y: PAGE_HEIGHT - MARGIN };
    this.pages.push(page);

    // Bandeau supérieur discret sur chaque page.
    page.commands.push('0.18 0.42 0.26 rg');
    page.commands.push(`${MARGIN} ${PAGE_HEIGHT - 30} ${CONTENT_WIDTH} 1.2 re f`);
    page.commands.push('0.35 0.39 0.34 rg');
    page.commands.push(`BT /F2 7.5 Tf ${MARGIN} ${PAGE_HEIGHT - 24} Td (${escapePdfText('RICEWARE CI - DOCUMENT INTERNE')}) Tj ET`);
    return page;
  }

  private ensureSpace(height: number): void {
    if (this.page.y - height < BOTTOM) {
      this.page = this.newPage();
    }
  }

  private write(text: string, options: { size?: number; bold?: boolean; color?: string; x?: number; leading?: number } = {}) {
    const size = options.size ?? 9.5;
    const leading = options.leading ?? size * 1.35;
    this.page.commands.push(`${options.color ?? '0.11 0.16 0.13'} rg`);
    this.page.commands.push(
      `BT /${options.bold ? 'F2' : 'F1'} ${size} Tf ${options.x ?? MARGIN} ${this.page.y} Td (${escapePdfText(text)}) Tj ET`,
    );
    this.page.y -= leading;
  }

  heading(text: string, size = 16) {
    this.ensureSpace(size * 2.4);
    this.page.y -= 6;
    this.write(text, { size, bold: true, color: '0.12 0.30 0.19', leading: size * 1.2 });
    this.page.y -= 4;
  }

  subheading(text: string) {
    this.ensureSpace(24);
    this.page.y -= 4;
    this.write(text, { size: 11, bold: true, color: '0.18 0.42 0.26' });
  }

  paragraph(text: string, size = 9.5) {
    const lines = wrapText(text, CONTENT_WIDTH, size);
    for (const line of lines) {
      this.ensureSpace(size * 1.4);
      this.write(line, { size });
    }
  }

  metaLine(text: string) {
    this.ensureSpace(15);
    this.write(text, { size: 8.5, color: '0.35 0.39 0.34' });
  }

  spacer(height = 8) {
    this.page.y -= height;
  }

  table(table: PdfTable) {
    const columnCount = table.columns.length;
    const widths =
      table.columns[0]?.width && table.columns.every((column) => column.width)
        ? table.columns.map((column) => column.width!)
        : table.columns.map(() => CONTENT_WIDTH / columnCount);

    if (table.title) {
      this.subheading(table.title);
    }

    const drawHeader = () => {
      const headerHeight = 18;
      this.ensureSpace(headerHeight + 14);
      this.page.commands.push('0.90 0.93 0.89 rg');
      this.page.commands.push(`${MARGIN} ${this.page.y - headerHeight} ${CONTENT_WIDTH} ${headerHeight} re f`);
      this.page.commands.push('0.75 0.78 0.72 RG');
      this.page.commands.push(`${MARGIN} ${this.page.y - headerHeight} ${CONTENT_WIDTH} ${headerHeight} re S`);

      let x = MARGIN;
      table.columns.forEach((column, index) => {
        const width = widths[index];
        this.page.commands.push('0.11 0.16 0.13 rg');
        this.page.commands.push(
          `BT /F2 7.8 Tf ${x + 3} ${this.page.y - 11.5} Td (${escapePdfText(column.label)}) Tj ET`,
        );
        if (index > 0) {
          this.page.commands.push('0.80 0.82 0.77 RG');
          this.page.commands.push(`${x} ${this.page.y - headerHeight} 0.5 ${headerHeight} re S`);
        }
        x += width;
      });
      this.page.y -= headerHeight;
    };

    drawHeader();

    table.rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) =>
        wrapText(cell === null || cell === undefined ? '' : String(cell), widths[index] - 6, 7.8),
      );
      const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
      const rowHeight = lineCount * 9.6 + 5;

      if (this.page.y - rowHeight < BOTTOM) {
        this.page = this.newPage();
        drawHeader();
      }

      if (rowIndex % 2 === 1) {
        this.page.commands.push('0.975 0.975 0.96 rg');
        this.page.commands.push(`${MARGIN} ${this.page.y - rowHeight} ${CONTENT_WIDTH} ${rowHeight} re f`);
      }

      const top = this.page.y;
      let x = MARGIN;
      wrapped.forEach((lines, index) => {
        const width = widths[index];
        this.page.commands.push('0.83 0.84 0.79 RG');
        this.page.commands.push(`${x} ${top - rowHeight} ${width} 0.5 re S`);
        this.page.commands.push('0.15 0.18 0.15 rg');
        lines.forEach((line, lineIndex) => {
          const y = top - 10 - lineIndex * 9.6;
          this.page.commands.push(
            `BT /F1 7.8 Tf ${x + 3} ${y} Td (${escapePdfText(line)}) Tj ET`,
          );
        });
        x += width;
      });

      this.page.y -= rowHeight;
    });
    this.spacer(4);
  }

  build(): Buffer {
    const footer = `RiceWare CI - rapport généré le ${new Date().toLocaleString('fr-FR')}`;
    this.pages.forEach((page, index) => {
      page.commands.push('0.55 0.57 0.52 rg');
      page.commands.push(`BT /F1 7 Tf ${MARGIN} 26 Td (${escapePdfText(footer)}) Tj ET`);
      page.commands.push(
        `BT /F1 7 Tf ${PAGE_WIDTH - MARGIN - 40} 26 Td (${escapePdfText(`Page ${index + 1}/${this.pages.length}`)}) Tj ET`,
      );
    });

    const objects: Buffer[] = [];
    const pageObjectNumbers: number[] = [];
    objects[1] = Buffer.from('<< /Type /Catalog /Pages 2 0 R >>');
    objects[3] = Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objects[4] = Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    let nextObjectNumber = 5;
    this.pages.forEach((page) => {
      const pageObjectNumber = nextObjectNumber;
      const contentObjectNumber = nextObjectNumber + 1;
      nextObjectNumber += 2;
      pageObjectNumbers.push(pageObjectNumber);

      const content = Buffer.from(page.commands.join('\n'), 'latin1');
      objects[pageObjectNumber] = Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
      );
      objects[contentObjectNumber] = Buffer.concat([
        Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'latin1'),
        content,
        Buffer.from('\nendstream', 'latin1'),
      ]);
    });

    objects[2] = Buffer.from(
      `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${this.pages.length} >>`,
    );

    const totalObjects = nextObjectNumber;
    const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
    const parts: Buffer[] = [header];
    let byteLength = header.length;
    const offsets: number[] = new Array(totalObjects).fill(0);

    for (let index = 1; index < totalObjects; index += 1) {
      const object = objects[index];
      if (!object) continue;
      offsets[index] = byteLength;
      const chunk = Buffer.concat([
        Buffer.from(`${index} 0 obj\n`, 'latin1'),
        object,
        Buffer.from('\nendobj\n', 'latin1'),
      ]);
      parts.push(chunk);
      byteLength += chunk.length;
    }

    const xrefOffset = byteLength;
    let xref = `xref\n0 ${totalObjects}\n0000000000 65535 f \n`;
    for (let index = 1; index < totalObjects; index += 1) {
      xref += `${String(offsets[index] ?? 0).padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    parts.push(Buffer.from(xref + trailer, 'latin1'));

    return Buffer.concat(parts);
  }
}

export function buildSimplePdf(input: SimplePdfInput): Buffer {
  const pdf = new PdfBuilder(input.title);

  pdf.heading(input.title, 18);
  if (input.subtitle) {
    pdf.paragraph(input.subtitle, 10);
    pdf.spacer(4);
  }
  for (const line of input.meta ?? []) {
    pdf.metaLine(line);
  }
  pdf.spacer(6);

  for (const section of input.sections ?? []) {
    if (section.title) pdf.subheading(section.title);
    for (const line of section.lines) pdf.paragraph(line);
    pdf.spacer(6);
  }

  for (const table of input.tables ?? []) {
    pdf.table(table);
  }

  if (input.footer) {
    pdf.spacer(10);
    pdf.metaLine(input.footer);
  }

  return pdf.build();
}

export function pdfResponse(filename: string, input: SimplePdfInput): Response {
  const bytes = buildSimplePdf(input);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
