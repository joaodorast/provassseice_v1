import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// Paleta oficial SEICE (preto, cinza, branco, dourado) em ARGB para o ExcelJS
const SEICE_XLSX_COLORS = {
  black: 'FF0A0A0A',
  charcoal: 'FF18181B',
  slateDark: 'FF27272A',
  slateMedium: 'FF52525B',
  border: 'FFE4E4E7',
  borderStrong: 'FFD4D4D8',
  zebra: 'FFFAFAFA',
  panel: 'FFF4F4F5',
  white: 'FFFFFFFF',
  gold: 'FFF59E0B',
  goldBright: 'FFFACC15',
  goldSoft: 'FFFEF3C7',
  goldPale: 'FFFFFBEB',
  success: 'FF16A34A',
  warning: 'FFCA8A04',
  danger: 'FFDC2626',
  textDark: 'FF18181B',
  textMuted: 'FF71717A',
  textOnDark: 'FFD4D4D8',
};

// Faixas de desempenho usadas para colorir notas e percentuais
const SCORE_TONES = {
  good: { font: 'FF15803D', fill: 'FFF0FDF4' },
  mid: { font: 'FFB45309', fill: 'FFFFFBEB' },
  low: { font: 'FFB91C1C', fill: 'FFFEF2F2' },
};

export interface ExcelColumn {
  // Use "\n" para quebrar o título em duas linhas (ex: "Nota Geral\n(de 40,0)")
  header: string;
  key: string;
  width?: number;
  type?: 'text' | 'number' | 'date' | 'percentage';
  format?: string;
  // Colunas vizinhas com o mesmo grupo ganham uma faixa em cima (ex: "NOTAS POR MATÉRIA")
  group?: string;
  // Colore a célula pelo desempenho: percentual (0–100) ou valor / row[maxKey]
  scoreTone?: boolean;
  maxKey?: string;
  // Texto em negrito (colunas principais, como a nota)
  bold?: boolean;
  // Não calcula Média/Maior/Menor no rodapé (ex: total de questões, igual para todos)
  noStats?: boolean;
}

export interface ExcelHighlight {
  label: string;
  value: string;
  hint?: string;
}

export interface ExcelExportOptions {
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  data: any[];
  filename: string;
  includeFilters?: boolean;
  // Linhas de Média / Maior / Menor no rodapé da tabela (com 2 ou mais linhas de dados)
  includeStats?: boolean;
  includeTimestamp?: boolean;
  logoText?: string;
  sheetName?: string;
  // Cartões de resumo entre o título e a tabela
  highlights?: ExcelHighlight[];
  // Quadro explicativo abaixo da tabela (ex: "Como a nota é calculada")
  notes?: { title: string; lines: { label: string; value: string; strong?: boolean }[] };
}

const headerLines = (header: string) => String(header || '').split('\n');

function estimateColumnWidth(column: ExcelColumn, data: any[]): number {
  // Título: a maior linha + espaço do botão de filtro
  const headerWidth = Math.max(...headerLines(column.header).map(l => l.length)) + 4;
  let dataWidth = 0;
  data.forEach((row) => {
    const value = row[column.key];
    const str = value === null || value === undefined ? '' : String(value);
    if (str.length > dataWidth) dataWidth = str.length;
  });
  dataWidth += 3;
  // Colunas de texto livre (perguntas, descrições) recebem um teto maior
  // com quebra de linha em vez de crescer indefinidamente.
  const ceiling = column.type === 'text' ? 45 : 24;
  const auto = Math.min(ceiling, Math.max(9, headerWidth, dataWidth));
  return column.width ? Math.max(column.width, Math.min(headerWidth, 28)) : auto;
}

function estimateWrappedLines(text: string, columnWidthChars: number): number {
  if (!text) return 1;
  const charsPerLine = Math.max(8, columnWidthChars * 1.1);
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function defaultNumFmt(column: ExcelColumn, num: number) {
  return column.format || (Number.isInteger(num) ? '#,##0' : '#,##0.0#');
}

function formatCellValue(column: ExcelColumn, rawValue: any): { value: any; numFmt?: string } {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { value: '' };
  }

  switch (column.type) {
    case 'date': {
      const date = rawValue instanceof Date ? rawValue : new Date(rawValue);
      if (isNaN(date.getTime())) return { value: String(rawValue) };
      return { value: date, numFmt: 'dd/mm/yyyy hh:mm' };
    }
    case 'number': {
      const num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
      if (isNaN(num)) return { value: String(rawValue) };
      return { value: num, numFmt: defaultNumFmt(column, num) };
    }
    case 'percentage': {
      const num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);
      if (isNaN(num)) return { value: String(rawValue) };
      return { value: num, numFmt: '0.0"%"' };
    }
    default:
      return { value: String(rawValue) };
  }
}

// Desempenho (0–1) da célula, para colorir: percentual direto ou valor / máximo da linha
function scoreRatio(column: ExcelColumn, row: any): number | null {
  if (!column.scoreTone) return null;
  const value = parseFloat(row[column.key]);
  if (isNaN(value)) return null;
  if (column.type === 'percentage') return value / 100;
  const max = parseFloat(column.maxKey ? row[column.maxKey] : NaN);
  return max > 0 ? value / max : null;
}

const toneFor = (ratio: number) => (ratio >= 0.7 ? SCORE_TONES.good : ratio >= 0.5 ? SCORE_TONES.mid : SCORE_TONES.low);

const isNumeric = (column: ExcelColumn) => column.type === 'number' || column.type === 'percentage';

/**
 * Exportador de Excel (.xlsx) com a identidade visual do SEICE: faixa de marca,
 * cartões de resumo, cabeçalho em duas linhas, notas coloridas por desempenho,
 * rodapé com média/maior/menor, sem linhas de grade, autofiltro e painéis congelados.
 */
export class ExcelExporter {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'Sistema SEICE';
    this.workbook.created = new Date();
  }

  async export(options: ExcelExportOptions): Promise<void> {
    this.buildSheet(options);
    await this.downloadWorkbook(options.filename);
  }

  /** Gera um único arquivo .xlsx com uma aba para cada conjunto de dados informado. */
  async exportMultiSheet(sheets: ExcelExportOptions[], filename: string): Promise<void> {
    sheets.forEach((sheetOptions) => this.buildSheet(sheetOptions));
    await this.downloadWorkbook(filename);
  }

  /** Monta as abas e devolve o arquivo em memória (sem baixar). */
  async buildBuffer(sheets: ExcelExportOptions[]): Promise<ArrayBuffer> {
    sheets.forEach((sheetOptions) => this.buildSheet(sheetOptions));
    return this.workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
  }

  private buildSheet(options: ExcelExportOptions): void {
    const {
      title,
      subtitle,
      columns,
      data,
      logoText = 'SEICE',
      includeTimestamp = true,
      includeStats = false,
      highlights = [],
    } = options;
    const C = SEICE_XLSX_COLORS;

    const sheet = this.workbook.addWorksheet(this.uniqueSheetName(options.sheetName || options.title), {
      views: [{ showGridLines: false }],
      pageSetup: {
        orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      },
    });
    sheet.properties.defaultRowHeight = 20;

    const columnCount = Math.max(columns.length, 1);
    const colLetter = (n: number) => sheet.getColumn(n).letter;
    const lastColLetter = colLetter(columnCount);

    columns.forEach((column, index) => {
      sheet.getColumn(index + 1).width = estimateColumnWidth(column, data);
    });

    // Linha 1: faixa de marca — "SEICE" em dourado e o título em branco
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const brandCell = sheet.getCell('A1');
    brandCell.value = {
      richText: [
        { text: `${logoText}   `, font: { name: 'Calibri', size: 18, bold: true, color: { argb: C.gold } } },
        { text: title, font: { name: 'Calibri', size: 16, bold: true, color: { argb: C.white } } },
      ],
    };
    brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.black } };
    brandCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    sheet.getRow(1).height = 38;

    // Linha 2: informações (total, data de geração)
    sheet.mergeCells(`A2:${lastColLetter}2`);
    const infoCell = sheet.getCell('A2');
    const parts = [subtitle, includeTimestamp ? `Gerado em ${new Date().toLocaleString('pt-BR')}` : null].filter(Boolean);
    infoCell.value = parts.join('    •    ');
    infoCell.font = { name: 'Calibri', size: 10, color: { argb: C.textOnDark } };
    infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.charcoal } };
    infoCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    infoCell.border = { bottom: { style: 'medium', color: { argb: C.gold } } };
    sheet.getRow(2).height = 22;

    let currentRow = 3;
    sheet.getRow(currentRow).height = 10;
    currentRow++;

    // Cartões de resumo: cada um ocupa um bloco de colunas
    if (highlights.length > 0) {
      // Divide as colunas entre os cartões: os primeiros ganham as que sobrarem
      const cards = highlights.slice(0, columnCount);
      const base = Math.floor(columnCount / cards.length);
      const extra = columnCount % cards.length;
      const spans = cards.map((_, i) => base + (i < extra ? 1 : 0));
      const labelRow = currentRow;
      const valueRow = currentRow + 1;
      cards.forEach((h, i) => {
        const startCol = 1 + spans.slice(0, i).reduce((a, b) => a + b, 0);
        const endCol = startCol + spans[i] - 1;
        const from = colLetter(startCol);
        const to = colLetter(endCol);
        if (endCol > startCol) {
          sheet.mergeCells(`${from}${labelRow}:${to}${labelRow}`);
          sheet.mergeCells(`${from}${valueRow}:${to}${valueRow}`);
        }
        const label = sheet.getCell(`${from}${labelRow}`);
        label.value = h.label.toUpperCase();
        label.font = { name: 'Calibri', size: 9, bold: true, color: { argb: C.textMuted } };
        const value = sheet.getCell(`${from}${valueRow}`);
        value.value = h.hint
          ? { richText: [
              { text: h.value, font: { name: 'Calibri', size: 16, bold: true, color: { argb: C.textDark } } },
              { text: `  ${h.hint}`, font: { name: 'Calibri', size: 10, color: { argb: C.textMuted } } },
            ] }
          : h.value;
        if (!h.hint) value.font = { name: 'Calibri', size: 16, bold: true, color: { argb: C.textDark } };
        [label, value].forEach((cell, k) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.panel } };
          cell.alignment = { horizontal: 'left', vertical: k === 0 ? 'bottom' : 'middle', indent: 1 };
          cell.border = {
            left: { style: 'medium', color: { argb: C.gold } },
            right: { style: 'thin', color: { argb: C.white } },
          };
        });
      });
      sheet.getRow(labelRow).height = 18;
      sheet.getRow(valueRow).height = 28;
      currentRow += 2;
      sheet.getRow(currentRow).height = 12;
      currentRow++;
    }

    // Faixa de grupos acima do cabeçalho (ex: "NOTAS POR MATÉRIA")
    const hasGroups = columns.some(c => c.group);
    if (hasGroups) {
      let i = 0;
      while (i < columns.length) {
        const group = columns[i].group;
        let j = i;
        while (j + 1 < columns.length && columns[j + 1].group === group) j++;
        if (group) {
          if (j > i) sheet.mergeCells(`${colLetter(i + 1)}${currentRow}:${colLetter(j + 1)}${currentRow}`);
          const cell = sheet.getCell(`${colLetter(i + 1)}${currentRow}`);
          cell.value = group;
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: C.black } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gold } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        i = j + 1;
      }
      sheet.getRow(currentRow).height = 18;
      currentRow++;
    }

    // Cabeçalho das colunas (até duas linhas)
    const headerRowNumber = currentRow;
    const headerRow = sheet.getRow(headerRowNumber);
    const twoLines = columns.some(c => headerLines(c.header).length > 1);
    columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      const [main, ...rest] = headerLines(column.header);
      cell.value = rest.length
        ? { richText: [
            { text: main, font: { name: 'Calibri', size: 10, bold: true, color: { argb: C.white } } },
            { text: `\n${rest.join(' ')}`, font: { name: 'Calibri', size: 9, color: { argb: C.goldBright } } },
          ] }
        : main;
      if (!rest.length) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.charcoal } };
      cell.alignment = {
        horizontal: isNumeric(column) ? 'center' : 'left',
        vertical: 'middle',
        wrapText: true,
        indent: isNumeric(column) ? 0 : 1,
      };
      cell.border = {
        bottom: { style: 'medium', color: { argb: C.gold } },
        right: { style: 'thin', color: { argb: C.slateDark } },
      };
    });
    headerRow.height = twoLines ? 36 : 26;

    // Linhas de dados: zebra suave, só divisórias horizontais, números centralizados
    data.forEach((row, rowIndex) => {
      const excelRow = sheet.getRow(headerRowNumber + 1 + rowIndex);
      const bgColor = rowIndex % 2 === 0 ? C.white : C.zebra;
      let maxLines = 1;

      columns.forEach((column, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        const { value, numFmt } = formatCellValue(column, row[column.key]);
        cell.value = value;
        if (numFmt) cell.numFmt = numFmt;

        const width = sheet.getColumn(colIndex + 1).width || 10;
        const shouldWrap = !isNumeric(column) && column.type !== 'date' && width >= 30;
        const ratio = scoreRatio(column, row);
        const tone = ratio === null ? null : toneFor(ratio);

        cell.font = {
          name: 'Calibri',
          size: 10.5,
          bold: !!column.bold || !!tone,
          color: { argb: tone ? tone.font : C.textDark },
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tone ? tone.fill : bgColor } };
        cell.alignment = {
          horizontal: isNumeric(column) || column.type === 'date' ? 'center' : 'left',
          vertical: 'middle',
          wrapText: shouldWrap,
          indent: isNumeric(column) ? 0 : 1,
        };
        cell.border = { bottom: { style: 'thin', color: { argb: C.border } } };

        if (shouldWrap && typeof value === 'string') {
          maxLines = Math.max(maxLines, estimateWrappedLines(value, width));
        }
      });

      excelRow.height = maxLines > 1 ? Math.min(120, 15 * maxLines + 6) : 22;
    });

    const lastDataRow = headerRowNumber + data.length;

    // Rodapé com Média / Maior / Menor alinhados embaixo de cada coluna numérica
    if (includeStats && data.length >= 2) {
      const footer: { label: string; calc: (v: number[]) => number }[] = [
        { label: 'Média', calc: (v) => v.reduce((a, b) => a + b, 0) / v.length },
        { label: 'Maior', calc: (v) => Math.max(...v) },
        { label: 'Menor', calc: (v) => Math.min(...v) },
      ];
      footer.forEach((f, k) => {
        const excelRow = sheet.getRow(lastDataRow + 1 + k);
        excelRow.height = 22;
        columns.forEach((column, colIndex) => {
          const cell = excelRow.getCell(colIndex + 1);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k === 0 ? C.goldSoft : C.goldPale } };
          cell.border = {
            top: k === 0 ? { style: 'medium', color: { argb: C.gold } } : undefined,
            bottom: { style: 'thin', color: { argb: C.border } },
          };
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: C.textDark } };
          if (colIndex === 0) {
            cell.value = f.label;
            cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
            return;
          }
          if (!isNumeric(column) || column.noStats) return;
          const values = data.map((r) => parseFloat(r[column.key])).filter((v) => !isNaN(v));
          if (values.length === 0) return;
          const result = Math.round(f.calc(values) * 100) / 100;
          cell.value = result;
          cell.numFmt = column.type === 'percentage'
            ? '0.0"%"'
            : column.format || (Number.isInteger(result) && k > 0 ? '#,##0' : '#,##0.0#');
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });
    }

    // Quadro explicativo abaixo da tabela: título dourado e uma linha por item (rótulo | valor)
    if (options.notes && options.notes.lines.length > 0) {
      const statsRows = includeStats && data.length >= 2 ? 3 : 0;
      let r = lastDataRow + statsRows + 2;
      const labelEnd = Math.max(1, Math.min(columnCount - 1, 2));
      const valueStart = labelEnd + 1;
      const valueEnd = Math.min(columnCount, valueStart + 2);
      const titleEnd = Math.max(valueEnd, labelEnd);
      if (titleEnd > 1) sheet.mergeCells(`A${r}:${colLetter(titleEnd)}${r}`);
      const t = sheet.getCell(`A${r}`);
      t.value = options.notes.title;
      t.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.black } };
      t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gold } };
      t.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      sheet.getRow(r).height = 22;
      r++;
      options.notes.lines.forEach((line, i) => {
        if (labelEnd > 1) sheet.mergeCells(`A${r}:${colLetter(labelEnd)}${r}`);
        if (valueEnd > valueStart) sheet.mergeCells(`${colLetter(valueStart)}${r}:${colLetter(valueEnd)}${r}`);
        const a = sheet.getCell(`A${r}`);
        const b = sheet.getCell(`${colLetter(valueStart)}${r}`);
        a.value = line.label;
        b.value = line.value;
        [a, b].forEach((cell) => {
          cell.font = { name: 'Calibri', size: 10.5, bold: !!line.strong, color: { argb: C.textDark } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: line.strong ? C.goldSoft : (i % 2 === 0 ? C.white : C.zebra) } };
          cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
          cell.border = {
            bottom: { style: 'thin', color: { argb: C.border } },
            top: line.strong ? { style: 'medium', color: { argb: C.gold } } : undefined,
          };
        });
        sheet.getRow(r).height = 20;
        r++;
      });
    }

    // Autofiltro, cabeçalho e primeira coluna congelados, título repetido na impressão
    if (options.includeFilters !== false && data.length > 0) {
      sheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber, column: columnCount },
      };
    }
    sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: headerRowNumber, showGridLines: false }];
    sheet.pageSetup.printTitlesRow = `${headerRowNumber}:${headerRowNumber}`;
  }

  private uniqueSheetName(rawName: string): string {
    const sanitized = (rawName || 'Dados').replace(/[\\/*?:\[\]]/g, ' ').trim().slice(0, 28) || 'Dados';
    let candidate = sanitized;
    let suffix = 2;
    while (this.workbook.getWorksheet(candidate)) {
      candidate = `${sanitized} ${suffix}`.slice(0, 31);
      suffix++;
    }
    return candidate;
  }

  private async downloadWorkbook(filename: string): Promise<void> {
    const buffer = await this.workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Templates pré-definidos para diferentes tipos de dados
export const ExcelTemplates = {
  questions: (questions: any[]): ExcelExportOptions => ({
    title: 'Banco de Questões',
    subtitle: 'Relatório completo de questões cadastradas',
    columns: [
      { header: 'ID', key: 'id', width: 10, type: 'text' },
      { header: 'Matéria', key: 'subject', width: 15, type: 'text' },
      { header: 'Curso', key: 'series', width: 12, type: 'text' },
      { header: 'Questão', key: 'question', width: 45, type: 'text' },
      { header: 'Alternativa Correta', key: 'correctAnswer', width: 18, type: 'text' },
      { header: 'Dificuldade', key: 'difficulty', width: 12, type: 'text' },
      { header: 'Peso', key: 'weight', width: 10, type: 'number' },
      { header: 'Data Criação', key: 'createdAt', width: 16, type: 'date' },
      { header: 'Status', key: 'isActive', width: 10, type: 'text' },
    ],
    data: questions.map((q) => ({
      ...q,
      correctAnswer: q.options?.[q.correctAnswer] || 'N/A',
      weight: q.weight || 1.0,
      isActive: q.isActive ? 'Ativo' : 'Inativo',
    })),
    filename: `questoes_${new Date().toISOString().split('T')[0]}`,
    includeStats: true,
  }),

  series: (series: any[]): ExcelExportOptions => ({
    title: 'Cursos Cadastrados',
    subtitle: 'Relatório de todos os cursos do sistema',
    columns: [
      { header: 'ID', key: 'id', width: 10, type: 'text' },
      { header: 'Nome', key: 'name', width: 25, type: 'text' },
      { header: 'Descrição', key: 'description', width: 40, type: 'text' },
      { header: 'Nível', key: 'level', width: 15, type: 'text' },
      { header: 'Data Criação', key: 'createdAt', width: 16, type: 'date' },
      { header: 'Status', key: 'isActive', width: 10, type: 'text' },
    ],
    data: series.map((s) => ({
      ...s,
      isActive: s.isActive ? 'Ativo' : 'Inativo',
    })),
    filename: `series_${new Date().toISOString().split('T')[0]}`,
    includeStats: true,
  }),

  examResults: (results: any[]): ExcelExportOptions => ({
    title: 'Resultados de Simulados',
    subtitle: 'Relatório detalhado de desempenho dos alunos',
    columns: [
      { header: 'Aluno', key: 'studentName', width: 25, type: 'text' },
      { header: 'Email', key: 'studentEmail', width: 30, type: 'text' },
      { header: 'Simulado', key: 'examTitle', width: 30, type: 'text' },
      { header: 'Data Realização', key: 'submittedAt', width: 18, type: 'date' },
      { header: 'Questões Corretas', key: 'score', width: 15, type: 'number' },
      { header: 'Total Questões', key: 'totalQuestions', width: 15, type: 'number' },
      { header: 'Percentual', key: 'percentage', width: 12, type: 'percentage' },
      { header: 'Tempo Gasto', key: 'timeSpent', width: 12, type: 'text' },
      { header: 'Status', key: 'status', width: 12, type: 'text' },
    ],
    data: results,
    filename: `resultados_simulados_${new Date().toISOString().split('T')[0]}`,
    includeStats: true,
  }),

  subjectPerformance: (data: any[]): ExcelExportOptions => ({
    title: 'Desempenho por Matéria',
    subtitle: 'Análise detalhada do desempenho dos alunos por disciplina',
    columns: [
      { header: 'Matéria', key: 'subject', width: 20, type: 'text' },
      { header: 'Total Questões', key: 'totalQuestions', width: 15, type: 'number' },
      { header: 'Acertos', key: 'correctAnswers', width: 12, type: 'number' },
      { header: 'Erros', key: 'wrongAnswers', width: 12, type: 'number' },
      { header: 'Taxa Acerto', key: 'successRate', width: 15, type: 'percentage' },
      { header: 'Média Geral', key: 'averageScore', width: 15, type: 'number' },
      { header: 'Melhor Nota', key: 'bestScore', width: 15, type: 'number' },
      { header: 'Pior Nota', key: 'worstScore', width: 15, type: 'number' },
    ],
    data,
    filename: `desempenho_materias_${new Date().toISOString().split('T')[0]}`,
    includeStats: true,
  }),

  students: (students: any[]): ExcelExportOptions => ({
    title: 'Alunos Cadastrados',
    subtitle: 'Relatório completo de alunos do sistema',
    columns: [
      { header: 'Nome', key: 'name', width: 28, type: 'text' },
      { header: 'Email', key: 'email', width: 30, type: 'text' },
      { header: 'Turma', key: 'class', width: 15, type: 'text' },
      { header: 'Curso', key: 'grade', width: 15, type: 'text' },
      { header: 'Matrícula', key: 'registration', width: 16, type: 'text' },
      { header: 'Status', key: 'status', width: 12, type: 'text' },
    ],
    data: students.map((s) => ({
      ...s,
      status: s.status === 'active' ? 'Ativo' : 'Inativo',
    })),
    filename: `alunos_${new Date().toISOString().split('T')[0]}`,
    includeStats: false,
  }),
};

// Função auxiliar para export rápido
export const quickExport = async (template: keyof typeof ExcelTemplates, data: any[]): Promise<void> => {
  const exporter = new ExcelExporter();
  const options = ExcelTemplates[template](data);
  await exporter.export(options);
};

// Função para importar dados de Excel
export const importFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
};
