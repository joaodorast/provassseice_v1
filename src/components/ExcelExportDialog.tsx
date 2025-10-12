import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileSpreadsheet, Download, Settings, BarChart3, Calendar } from 'lucide-react';
import { ExcelExporter, ExcelColumn, ExcelExportOptions } from '../utils/excel-utils';

interface ExcelExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: any[];
  columns: ExcelColumn[];
  defaultFilename?: string;
  templateType?: 'questions' | 'series' | 'examResults' | 'subjectPerformance' | 'custom';
}

export function ExcelExportDialog({ 
  open, 
  onOpenChange, 
  title, 
  data, 
  columns, 
  defaultFilename,
  templateType = 'custom'
}: ExcelExportDialogProps) {
  const [filename, setFilename] = useState(defaultFilename || `export_${new Date().toISOString().split('T')[0]}`);
  const [includeStats, setIncludeStats] = useState(true);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(col => col.key));
  const [subtitle, setSubtitle] = useState('');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert('Selecione pelo menos uma coluna para exportar.');
      return;
    }

    setIsExporting(true);

    try {
      const filteredColumns = columns.filter(col => selectedColumns.includes(col.key));
      
      const exportOptions: ExcelExportOptions = {
        title,
        subtitle: subtitle || `Relatório gerado automaticamente pelo Sistema SEICE`,
        columns: filteredColumns,
        data,
        filename: filename.replace(/\s+/g, '_').toLowerCase(),
        includeStats,
        includeTimestamp,
        logoText: 'SEICE'
      };

      const exporter = new ExcelExporter();
      
      if (exportFormat === 'xlsx') {
        exporter.export(exportOptions);
      } else {
        // Para CSV, usar uma implementação mais simples
        exportAsCSV(exportOptions);
      }

      onOpenChange(false);
      
      // Reset form
      setFilename(defaultFilename || `export_${new Date().toISOString().split('T')[0]}`);
      setSubtitle('');
      setSelectedColumns(columns.map(col => col.key));
      
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar arquivo. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsCSV = (options: ExcelExportOptions) => {
    const headers = options.columns.map(col => col.header);
    const rows = options.data.map(row => 
      options.columns.map(col => {
        let value = row[col.key];
        if (col.type === 'date' && value) {
          value = new Date(value).toLocaleDateString('pt-BR');
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${options.filename}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTemplateDescription = () => {
    switch (templateType) {
      case 'questions':
        return 'Exportação completa do banco de questões com formatação otimizada para análise e revisão.';
      case 'series':
        return 'Relatório detalhado das séries cadastradas no sistema com informações organizadas.';
      case 'examResults':
        return 'Análise completa dos resultados dos simulados com métricas de desempenho dos alunos.';
      case 'subjectPerformance':
        return 'Relatório de desempenho por matéria com estatísticas detalhadas e comparativas.';
      default:
        return 'Exportação personalizada dos dados selecionados com formatação profissional.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Exportar para Excel
          </DialogTitle>
          <DialogDescription>
            {getTemplateDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configurações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Settings className="h-4 w-4" />
              Configurações Básicas
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filename">Nome do Arquivo</Label>
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="meu_relatorio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Formato</Label>
                <Select value={exportFormat} onValueChange={(value: 'xlsx' | 'csv') => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtítulo (opcional)</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Descrição adicional do relatório"
              />
            </div>
          </div>

          {/* Opções de Conteúdo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <BarChart3 className="h-4 w-4" />
              Opções de Conteúdo
            </div>

            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeStats"
                  checked={includeStats}
                  onCheckedChange={setIncludeStats}
                />
                <Label htmlFor="includeStats" className="text-sm">
                  Incluir estatísticas (totais, médias, etc.)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTimestamp"
                  checked={includeTimestamp}
                  onCheckedChange={setIncludeTimestamp}
                />
                <Label htmlFor="includeTimestamp" className="text-sm flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Incluir data e hora de geração
                </Label>
              </div>
            </div>
          </div>

          {/* Seleção de Colunas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileSpreadsheet className="h-4 w-4" />
                Colunas a Exportar ({selectedColumns.length}/{columns.length})
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns(columns.map(col => col.key))}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns([])}
                >
                  Nenhuma
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {columns.map(column => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${column.key}`}
                    checked={selectedColumns.includes(column.key)}
                    onCheckedChange={() => handleColumnToggle(column.key)}
                  />
                  <Label 
                    htmlFor={`col-${column.key}`} 
                    className="text-sm cursor-pointer flex-1 truncate"
                    title={column.header}
                  >
                    {column.header}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Informações do Export */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Resumo da Exportação
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• {data.length} registros para exportar</li>
                  <li>• {selectedColumns.length} colunas selecionadas</li>
                  <li>• Formato: {exportFormat.toUpperCase()}</li>
                  {includeStats && <li>• Estatísticas incluídas</li>}
                  {includeTimestamp && <li>• Timestamp incluído</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
            className="min-w-[120px]"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}