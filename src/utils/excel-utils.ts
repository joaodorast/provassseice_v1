import * as XLSX from 'xlsx';

// Cores do sistema SEICE para os estilos Excel
const SEICE_COLORS = {
  primary: 'FF1E40AF',
  secondary: 'FF3B82F6',
  light: 'FFF1F5F9',
  dark: 'FF1E293B',
  success: 'FF10B981',
  warning: 'FFFBBF24',
  danger: 'FFEF4444',
  white: 'FFFFFFFF',
  gray: 'FF64748B'
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
}

export class ExcelExporter {
  private workbook: XLSX.WorkBook;
  private worksheet: XLSX.WorkSheet;
  private currentRow: number = 1;

  constructor() {
    this.workbook = XLSX.utils.book_new();
    this.worksheet = {};
  }

  // Cria cabeçalho profissional com logo e título
  private createHeader(options: ExcelExportOptions): void {
    const { title, subtitle, logoText = 'SEICE' } = options;

    // Logo e título principal
    this.worksheet['A1'] = { 
      v: logoText, 
      s: {
        font: { name: 'Segoe UI', sz: 24, bold: true, color: { rgb: SEICE_COLORS.primary } },
        alignment: { horizontal: 'left', vertical: 'center' }
      }
    };

    this.worksheet['B1'] = { 
      v: title, 
      s: {
        font: { name: 'Segoe UI', sz: 20, bold: true, color: { rgb: SEICE_COLORS.dark } },
        alignment: { horizontal: 'left', vertical: 'center' }
      }
    };

    this.currentRow = 2;

    // Subtítulo se fornecido
    if (subtitle) {
      this.worksheet[`A${this.currentRow}`] = { 
        v: subtitle, 
        s: {
          font: { name: 'Segoe UI', sz: 12, italic: true, color: { rgb: SEICE_COLORS.gray } },
          alignment: { horizontal: 'left' }
        }
      };
      this.currentRow++;
    }

    // Data de geração
    if (options.includeTimestamp !== false) {
      const timestamp = new Date().toLocaleString('pt-BR');
      this.worksheet[`A${this.currentRow}`] = { 
        v: `Gerado em: ${timestamp}`, 
        s: {
          font: { name: 'Segoe UI', sz: 10, color: { rgb: SEICE_COLORS.gray } },
          alignment: { horizontal: 'left' }
        }
      };
      this.currentRow++;
    }

    this.currentRow++; // Linha em branco
  }

  // Cria cabeçalhos das colunas com estilo
  private createColumnHeaders(columns: ExcelColumn[]): void {
    columns.forEach((column, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: this.currentRow, c: index });
      this.worksheet[cellAddress] = {
        v: column.header,
        s: {
          font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: SEICE_COLORS.white } },
          fill: { fgColor: { rgb: SEICE_COLORS.primary } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: SEICE_COLORS.dark } },
            bottom: { style: 'thin', color: { rgb: SEICE_COLORS.dark } },
            left: { style: 'thin', color: { rgb: SEICE_COLORS.dark } },
            right: { style: 'thin', color: { rgb: SEICE_COLORS.dark } }
          }
        }
      };
    });

    this.currentRow++;
  }

  // Adiciona dados com formatação alternada
  private addDataRows(columns: ExcelColumn[], data: any[]): void {
    data.forEach((row, rowIndex) => {
      const isEvenRow = rowIndex % 2 === 0;
      const bgColor = isEvenRow ? SEICE_COLORS.white : SEICE_COLORS.light;

      columns.forEach((column, colIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ r: this.currentRow, c: colIndex });
        let cellValue = row[column.key];
        
        // Formatação baseada no tipo
        if (column.type === 'date' && cellValue) {
          cellValue = new Date(cellValue).toLocaleDateString('pt-BR');
        } else if (column.type === 'percentage' && typeof cellValue === 'number') {
          cellValue = (cellValue * 100).toFixed(1) + '%';
        } else if (column.type === 'number' && typeof cellValue === 'number') {
          cellValue = column.format ? cellValue.toFixed(2) : cellValue;
        }

        this.worksheet[cellAddress] = {
          v: cellValue || '',
          s: {
            font: { name: 'Segoe UI', sz: 10, color: { rgb: SEICE_COLORS.dark } },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { 
              horizontal: column.type === 'number' || column.type === 'percentage' ? 'right' : 'left',
              vertical: 'center' 
            },
            border: {
              top: { style: 'thin', color: { rgb: SEICE_COLORS.gray } },
              bottom: { style: 'thin', color: { rgb: SEICE_COLORS.gray } },
              left: { style: 'thin', color: { rgb: SEICE_COLORS.gray } },
              right: { style: 'thin', color: { rgb: SEICE_COLORS.gray } }
            }
          }
        };
      });

      this.currentRow++;
    });
  }

  // Adiciona estatísticas no final
  private addStatistics(columns: ExcelColumn[], data: any[]): void {
    if (data.length === 0) return;

    this.currentRow++; // Linha em branco

    // Título das estatísticas
    this.worksheet[`A${this.currentRow}`] = {
      v: 'Estatísticas',
      s: {
        font: { name: 'Segoe UI', sz: 14, bold: true, color: { rgb: SEICE_COLORS.primary } },
        alignment: { horizontal: 'left' }
      }
    };
    this.currentRow++;

    // Total de registros
    this.worksheet[`A${this.currentRow}`] = {
      v: `Total de registros: ${data.length}`,
      s: {
        font: { name: 'Segoe UI', sz: 11, color: { rgb: SEICE_COLORS.dark } },
        alignment: { horizontal: 'left' }
      }
    };
    this.currentRow++;

    // Estatísticas para colunas numéricas
    columns.forEach(column => {
      if (column.type === 'number' || column.type === 'percentage') {
        const values = data.map(row => parseFloat(row[column.key]) || 0).filter(val => !isNaN(val));
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const max = Math.max(...values);
          const min = Math.min(...values);

          this.worksheet[`A${this.currentRow}`] = {
            v: `${column.header} - Média: ${avg.toFixed(2)} | Máximo: ${max} | Mínimo: ${min}`,
            s: {
              font: { name: 'Segoe UI', sz: 10, color: { rgb: SEICE_COLORS.gray } },
              alignment: { horizontal: 'left' }
            }
          };
          this.currentRow++;
        }
      }
    });
  }

  // Configura larguras das colunas
  private setColumnWidths(columns: ExcelColumn[]): void {
    const columnWidths = columns.map(column => ({
      wch: column.width || Math.max(column.header.length, 15)
    }));

    this.worksheet['!cols'] = columnWidths;
  }

  // Método principal de exportação
  export(options: ExcelExportOptions): void {
    // Criar nova planilha
    this.worksheet = {};
    this.currentRow = 1;

    // Criar cabeçalho
    this.createHeader(options);

    // Criar cabeçalhos das colunas
    this.createColumnHeaders(options.columns);

    // Adicionar dados
    this.addDataRows(options.columns, options.data);

    // Adicionar estatísticas se solicitado
    if (options.includeStats) {
      this.addStatistics(options.columns, options.data);
    }

    // Configurar larguras das colunas
    this.setColumnWidths(options.columns);

    // Definir área de impressão
    const lastColumn = XLSX.utils.encode_col(options.columns.length - 1);
    this.worksheet['!ref'] = `A1:${lastColumn}${this.currentRow - 1}`;

    // Configurações de impressão
    this.worksheet['!margins'] = {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };

    this.worksheet['!printSetup'] = {
      orientation: 'landscape',
      scale: 100,
      fitToWidth: 1,
      fitToHeight: 0
    };

    // Adicionar à workbook
    XLSX.utils.book_append_sheet(this.workbook, this.worksheet, 'Dados');

    // Fazer download
    const filename = options.filename.endsWith('.xlsx') ? options.filename : `${options.filename}.xlsx`;
    XLSX.writeFile(this.workbook, filename);
  }
}

// Templates pré-definidos para diferentes tipos de dados
export const ExcelTemplates = {
  // Template para questões
  questions: (questions: any[]): ExcelExportOptions => ({
    title: 'Banco de Questões - Sistema SEICE',
    subtitle: 'Relatório completo de questões cadastradas',
    columns: [
      { header: 'ID', key: 'id', width: 10, type: 'text' },
      { header: 'Matéria', key: 'subject', width: 15, type: 'text' },
      { header: 'Série', key: 'series', width: 12, type: 'text' },
      { header: 'Questão', key: 'question', width: 50, type: 'text' },
      { header: 'Alternativa Correta', key: 'correctAnswer', width: 15, type: 'text' },
      { header: 'Dificuldade', key: 'difficulty', width: 12, type: 'text' },
      { header: 'Peso', key: 'weight', width: 10, type: 'number' },
      { header: 'Data Criação', key: 'createdAt', width: 15, type: 'date' },
      { header: 'Status', key: 'isActive', width: 10, type: 'text' }
    ],
    data: questions.map(q => ({
      ...q,
      correctAnswer: q.options?.[q.correctAnswer] || 'N/A',
      weight: q.weight || 1.0,
      isActive: q.isActive ? 'Ativo' : 'Inativo'
    })),
    filename: `questoes_${new Date().toISOString().split('T')[0]}`,
    includeStats: true
  }),

  // Template para séries
  series: (series: any[]): ExcelExportOptions => ({
    title: 'Séries Cadastradas - Sistema SEICE',
    subtitle: 'Relatório de todas as séries do sistema',
    columns: [
      { header: 'ID', key: 'id', width: 10, type: 'text' },
      { header: 'Nome', key: 'name', width: 25, type: 'text' },
      { header: 'Descrição', key: 'description', width: 40, type: 'text' },
      { header: 'Nível', key: 'level', width: 15, type: 'text' },
      { header: 'Data Criação', key: 'createdAt', width: 15, type: 'date' },
      { header: 'Status', key: 'isActive', width: 10, type: 'text' }
    ],
    data: series.map(s => ({
      ...s,
      isActive: s.isActive ? 'Ativo' : 'Inativo'
    })),
    filename: `series_${new Date().toISOString().split('T')[0]}`,
    includeStats: true
  }),

  // Template para resultados de simulados
  examResults: (results: any[]): ExcelExportOptions => ({
    title: 'Resultados de Simulados - Sistema SEICE',
    subtitle: 'Relatório detalhado de desempenho dos alunos',
    columns: [
      { header: 'Aluno', key: 'studentName', width: 25, type: 'text' },
      { header: 'Email', key: 'studentEmail', width: 30, type: 'text' },
      { header: 'Simulado', key: 'examTitle', width: 30, type: 'text' },
      { header: 'Data Realização', key: 'submittedAt', width: 15, type: 'date' },
      { header: 'Questões Corretas', key: 'score', width: 15, type: 'number' },
      { header: 'Total Questões', key: 'totalQuestions', width: 15, type: 'number' },
      { header: 'Percentual', key: 'percentage', width: 12, type: 'percentage' },
      { header: 'Tempo Gasto', key: 'timeSpent', width: 12, type: 'text' },
      { header: 'Status', key: 'status', width: 12, type: 'text' }
    ],
    data: results,
    filename: `resultados_simulados_${new Date().toISOString().split('T')[0]}`,
    includeStats: true
  }),

  // Template para relatório de desempenho por matéria
  subjectPerformance: (data: any[]): ExcelExportOptions => ({
    title: 'Desempenho por Matéria - Sistema SEICE',
    subtitle: 'Análise detalhada do desempenho dos alunos por disciplina',
    columns: [
      { header: 'Matéria', key: 'subject', width: 20, type: 'text' },
      { header: 'Total Questões', key: 'totalQuestions', width: 15, type: 'number' },
      { header: 'Acertos', key: 'correctAnswers', width: 12, type: 'number' },
      { header: 'Erros', key: 'wrongAnswers', width: 12, type: 'number' },
      { header: 'Taxa Acerto', key: 'successRate', width: 15, type: 'percentage' },
      { header: 'Média Geral', key: 'averageScore', width: 15, type: 'number' },
      { header: 'Melhor Nota', key: 'bestScore', width: 15, type: 'number' },
      { header: 'Pior Nota', key: 'worstScore', width: 15, type: 'number' }
    ],
    data: data,
    filename: `desempenho_materias_${new Date().toISOString().split('T')[0]}`,
    includeStats: true
  })
};

// Função auxiliar para export rápido
export const quickExport = (template: keyof typeof ExcelTemplates, data: any[]) => {
  const exporter = new ExcelExporter();
  const options = ExcelTemplates[template](data);
  exporter.export(options);
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