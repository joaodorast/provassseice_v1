import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// Paleta oficial SEICE (preto, cinza, branco, dourado) em ARGB para o ExcelJS
const SEICE_XLSX_COLORS = {
  black: 'FF0A0A0A',
  charcoal: 'FF18181B',
  slateDark: 'FF27272A',
  slateMedium: 'FF52525B',
  border: 'FFD4D4D8',
  zebra: 'FFF4F4F5',
  white: 'FFFFFFFF',
  gold: 'FFF59E0B',
  goldBright: 'FFFACC15',
  goldSoft: 'FFFEF3C7',
  success: 'FF16A34A',
  warning: 'FFCA8A04',
  danger: 'FFDC2626',
  textDark: 'FF18181B',
  textMuted: 'FF71717A',
};

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  type?: 'text' | 'number' | 'date' | 'percentage';
  format?: string;
}

export interface ExcelExportOptions {
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  data: any[];
  filename: string;
  includeFilters?: boolean;
  includeStats?: boolean;
  includeTimestamp?: boolean;
  logoText?: string;
  sheetName?: string;
}

function estimateColumnWidth(column: ExcelColumn, data: any[]): number {
  if (column.width) return column.width;

  let maxLen = column.header.length;
  data.forEach((row) => {
    const value = row[column.key];
    const str = value === null || value === undefined ? '' : String(value);
    if (str.length > maxLen) maxLen = str.length;
  });

  // Colunas de texto livre (perguntas, descrições) recebem um teto maior
  // com quebra de linha em vez de crescer indefinidamente.
  const ceiling = column.type === 'text' ? 45 : 30;
  return Math.min(ceiling, Math.max(10, maxLen + 3));
}

function estimateWrappedLines(text: string, columnWidthChars: number): number {
  if (!text) return 1;
  const charsPerLine = Math.max(8, columnWidthChars * 1.8);
  return Math.max(1, Math.ceil(text.length / charsPerLine));
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
      return { value: num, numFmt: column.format || (Number.isInteger(num) ? '#,##0' : '#,##0.00') };
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

/**
 * Exportador de Excel (.xlsx) com a identidade visual do SEICE:
 * cabeçalho de marca, colunas com destaque preto/dourado, zebra striping,
 * largura automática, autofiltro e cabeçalho congelado.
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

  private buildSheet(options: ExcelExportOptions): void {
    const {
      title,
      subtitle,
      columns,
      data,
      logoText = 'SEICE',
      includeTimestamp = true,
      includeStats = false,
    } = options;

    const sheet = this.workbook.addWorksheet(this.uniqueSheetName(options.sheetName || options.title), {
      views: [{ state: 'frozen', ySplit: 0 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const columnCount = columns.length;
    const lastColLetter = sheet.getColumn(columnCount).letter;

    // Faixa de marca (linha 1): "SEICE" em dourado sobre preto
    sheet.mergeCells(`A1:${lastColLetter}1`);
    const brandCell = sheet.getCell('A1');
    brandCell.value = `${logoText}  •  ${title}`;
    brandCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: SEICE_XLSX_COLORS.gold } };
    brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEICE_XLSX_COLORS.black } };
    brandCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    sheet.getRow(1).height = 30;

    let currentRow = 2;

    if (subtitle || includeTimestamp) {
      sheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
      const infoCell = sheet.getCell(`A${currentRow}`);
      const timestamp = new Date().toLocaleString('pt-BR');
      const parts = [subtitle, includeTimestamp ? `Gerado em: ${timestamp}` : null].filter(Boolean);
      infoCell.value = parts.join('   |   ');
      infoCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: SEICE_XLSX_COLORS.white } };
      infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEICE_XLSX_COLORS.charcoal } };
      infoCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      sheet.getRow(currentRow).height = 20;
      currentRow++;
    }

    currentRow++; // linha em branco separando a marca dos dados

    const headerRowNumber = currentRow;
    const headerRow = sheet.getRow(headerRowNumber);
    columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.header;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: SEICE_XLSX_COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEICE_XLSX_COLORS.charcoal } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: SEICE_XLSX_COLORS.gold } },
        bottom: { style: 'medium', color: { argb: SEICE_XLSX_COLORS.gold } },
        left: { style: 'thin', color: { argb: SEICE_XLSX_COLORS.slateDark } },
        right: { style: 'thin', color: { argb: SEICE_XLSX_COLORS.slateDark } },
      };
    });
    headerRow.height = 24;

    // Larguras de coluna calculadas a partir do conteúdo
    columns.forEach((column, index) => {
      sheet.getColumn(index + 1).width = estimateColumnWidth(column, data);
    });

    // Linhas de dados com zebra striping e formatação por tipo
    data.forEach((row, rowIndex) => {
      const excelRowNumber = headerRowNumber + 1 + rowIndex;
      const excelRow = sheet.getRow(excelRowNumber);
      const isEvenRow = rowIndex % 2 === 0;
      const bgColor = isEvenRow ? SEICE_XLSX_COLORS.white : SEICE_XLSX_COLORS.zebra;

      let maxLines = 1;

      columns.forEach((column, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        const { value, numFmt } = formatCellValue(column, row[column.key]);
        cell.value = value;
        if (numFmt) cell.numFmt = numFmt;

        const isTextColumn = column.type === 'text' || column.type === undefined;
        const shouldWrap = isTextColumn && sheet.getColumn(colIndex + 1).width! >= 25;

        cell.font = { name: 'Calibri', size: 10, color: { argb: SEICE_XLSX_COLORS.textDark } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = {
          horizontal: column.type === 'number' || column.type === 'percentage' ? 'right' : column.type === 'date' ? 'center' : 'left',
          vertical: 'top',
          wrapText: shouldWrap,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: SEICE_XLSX_COLORS.border } },
          bottom: { style: 'thin', color: { argb: SEICE_XLSX_COLORS.border } },
          left: { style: 'thin', color: { argb: SEICE_XLSX_COLORS.border } },
          right: { style: 'thin', color: { argb: SEICE_XLSX_COLORS.border } },
        };

        if (shouldWrap && typeof value === 'string') {
          const lines = estimateWrappedLines(value, sheet.getColumn(colIndex + 1).width!);
          if (lines > maxLines) maxLines = lines;
        }
      });

      if (maxLines > 1) {
        excelRow.height = Math.min(120, 15 * maxLines);
      }
    });

    const lastDataRow = headerRowNumber + data.length;

    if (includeStats && data.length > 0) {
      let statsRow = lastDataRow + 2;

      const statsTitleCell = sheet.getCell(`A${statsRow}`);
      statsTitleCell.value = 'Estatísticas';
      statsTitleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: SEICE_XLSX_COLORS.black } };
      statsTitleCell.border = { top: { style: 'medium', color: { argb: SEICE_XLSX_COLORS.gold } } };
      statsRow++;

      const totalCell = sheet.getCell(`A${statsRow}`);
      totalCell.value = `Total de registros: ${data.length}`;
      totalCell.font = { name: 'Calibri', size: 10, color: { argb: SEICE_XLSX_COLORS.textMuted } };
      statsRow++;

      columns.forEach((column) => {
        if (column.type === 'number' || column.type === 'percentage') {
          const values = data
            .map((row) => parseFloat(row[column.key]))
            .filter((val) => !isNaN(val));
          if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);
            const cell = sheet.getCell(`A${statsRow}`);
            cell.value = `${column.header} — Média: ${avg.toFixed(2)} | Máximo: ${max} | Mínimo: ${min}`;
            cell.font = { name: 'Calibri', size: 10, color: { argb: SEICE_XLSX_COLORS.textMuted } };
            statsRow++;
          }
        }
      });
    }

    // Autofiltro e cabeçalho congelado a partir da linha de cabeçalhos
    sheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: columnCount },
    };
    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
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
      { header: 'Série', key: 'series', width: 12, type: 'text' },
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
    title: 'Séries Cadastradas',
    subtitle: 'Relatório de todas as séries do sistema',
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
      { header: 'Série', key: 'grade', width: 15, type: 'text' },
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
