import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Play, 
  Download, 
  Filter, 
  FileText, 
  Users, 
  Target,
  Calendar,
  Printer,
  BarChart3,
  CheckSquare,
  Eye,
  Clock,
  School,
  UserCheck,
  ClipboardList,
  Activity,
  Loader2,
  FileSpreadsheet,
  FileType,
  FileImage,
  Database,
  Search
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner@2.0.3';
import { apiService } from '../../utils/api';

type Report = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'auditoria' | 'banco' | 'aplicacao' | 'correcao' | 'gestao';
  format: 'pdf' | 'excel' | 'csv' | 'online';
  dataRequired: string[];
};

const AVAILABLE_REPORTS: Report[] = [
  {
    id: 'audit-facial',
    name: 'Auditoria Reconhecimento Facial',
    description: 'Relatório de verificação de identidade e reconhecimento facial durante as avaliações',
    icon: UserCheck,
    category: 'auditoria',
    format: 'pdf',
    dataRequired: ['submissions', 'students', 'applications']
  },
  {
    id: 'question-bank',
    name: 'Banco de Questões',
    description: 'Inventário completo das questões cadastradas por matéria e dificuldade',
    icon: Database,
    category: 'banco',
    format: 'excel',
    dataRequired: ['questions']
  },
  {
    id: 'application-notes',
    name: 'Dados da Aplicação e Notas',
    description: 'Relatório consolidado com dados de aplicação e notas dos alunos',
    icon: FileSpreadsheet,
    category: 'aplicacao',
    format: 'excel',
    dataRequired: ['submissions', 'exams', 'students']
  },
  {
    id: 'application-notes-by-question',
    name: 'Dados da Aplicação e Notas por Questão',
    description: 'Análise detalhada das respostas e performance por questão específica',
    icon: Target,
    category: 'aplicacao',
    format: 'excel',
    dataRequired: ['submissions', 'exams', 'questions']
  },
  {
    id: 'classes-students',
    name: 'Turmas e Alunos',
    description: 'Listagem de turmas cadastradas e alunos matriculados por classe',
    icon: School,
    category: 'gestao',
    format: 'excel',
    dataRequired: ['students', 'classes']
  },
  {
    id: 'correction-report',
    name: 'Relatório - Correção de Avaliação',
    description: 'Relatório do processo de correção automática e manual das avaliações',
    icon: CheckSquare,
    category: 'correcao',
    format: 'pdf',
    dataRequired: ['submissions', 'exams']
  },
  {
    id: 'online-marking',
    name: 'Relatório de Marcação (Prova Online)',
    description: 'Relatório das marcações e respostas de provas realizadas online',
    icon: Activity,
    category: 'aplicacao',
    format: 'excel',
    dataRequired: ['submissions', 'exams']
  },
  {
    id: 'printed-marking',
    name: 'Relatório de Marcações (Prova Impressa)',
    description: 'Relatório das marcações de provas impressas digitalizadas',
    icon: FileImage,
    category: 'aplicacao',
    format: 'excel',
    dataRequired: ['images', 'submissions']
  },
  {
    id: 'teacher-report',
    name: 'Relatório do Professor',
    description: 'Relatório consolidado para professores com estatísticas e análise da turma',
    icon: Users,
    category: 'gestao',
    format: 'pdf',
    dataRequired: ['submissions', 'exams', 'students', 'classes']
  }
];

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Todas as Categorias' },
  { value: 'auditoria', label: 'Auditoria' },
  { value: 'banco', label: 'Banco de Questões' },
  { value: 'aplicacao', label: 'Aplicação' },
  { value: 'correcao', label: 'Correção' },
  { value: 'gestao', label: 'Gestão' }
];

export function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [executingReports, setExecutingReports] = useState<Set<string>>(new Set());

  const filteredReports = AVAILABLE_REPORTS.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const executeReport = async (report: Report) => {
    if (executingReports.has(report.id)) return;

    setExecutingReports(prev => new Set(prev).add(report.id));
    
    try {
      toast.info(`Gerando relatório: ${report.name}...`);
      
      // Call backend to generate report
      const response = await apiService.generateReport(report.id, {
        format: report.format,
        filters: {
          dateRange: 'last-30-days'
        }
      });

      if (response.success) {
        // Create a downloadable blob with the report data
        const reportContent = JSON.stringify(response.data, null, 2);
        const blob = new Blob([reportContent], { 
          type: report.format === 'pdf' ? 'application/json' : 
                report.format === 'excel' ? 'application/json' :
                'application/json' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename || `${report.id}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Relatório "${report.name}" gerado e baixado com sucesso!`);
      } else {
        throw new Error(response.error || 'Erro ao gerar relatório');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    } finally {
      setExecutingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(report.id);
        return newSet;
      });
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileType className="w-4 h-4 text-red-600" />;
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case 'csv':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <Eye className="w-4 h-4 text-purple-600" />;
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'auditoria':
        return 'bg-red-100 text-red-800';
      case 'banco':
        return 'bg-blue-100 text-blue-800';
      case 'aplicacao':
        return 'bg-green-100 text-green-800';
      case 'correcao':
        return 'bg-yellow-100 text-yellow-800';
      case 'gestao':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl">Relatórios Gerais</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gere e baixe relatórios detalhados do sistema SEICE
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} className="self-start sm:self-auto">
          <Activity className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-base md:text-lg">
            <Filter className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Filtros e Busca
          </CardTitle>
          <CardDescription className="text-sm">
            Encontre rapidamente os relatórios que você precisa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar Relatório</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome do relatório..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_FILTERS.map(filter => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table - Desktop View */}
      <Card className="hidden md:block">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-base md:text-lg">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Relatórios Disponíveis
          </CardTitle>
          <CardDescription className="text-sm">
            Clique em "Executar" para gerar e baixar cada relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[200px]">Nome do Relatório</TableHead>
                    <TableHead className="min-w-[120px]">Categoria</TableHead>
                    <TableHead className="min-w-[100px]">Formato</TableHead>
                    <TableHead className="min-w-[250px] hidden lg:table-cell">Descrição</TableHead>
                    <TableHead className="w-32">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report, index) => (
                    <TableRow key={report.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <report.icon className="w-5 h-5 text-blue-600" />
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium text-sm md:text-base">{report.name}</div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${getCategoryBadgeColor(report.category)} text-xs`}
                        >
                          {CATEGORY_FILTERS.find(f => f.value === report.category)?.label || report.category}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getFormatIcon(report.format)}
                          <span className="text-xs font-medium uppercase">
                            {report.format}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-xs text-muted-foreground max-w-md">
                          {report.description}
                        </p>
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          onClick={() => executeReport(report)}
                          disabled={executingReports.has(report.id)}
                          className="w-full"
                          size="sm"
                        >
                          {executingReports.has(report.id) ? (
                            <>
                              <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                              <span className="hidden sm:inline">Gerando...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                              <span className="hidden sm:inline">Executar</span>
                              <span className="sm:hidden">▶</span>
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {filteredReports.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <FileText className="w-8 h-8 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3 md:mb-4" />
              <h3 className="font-medium text-base md:text-lg mb-2">Nenhum relatório encontrado</h3>
              <p className="text-sm md:text-base text-muted-foreground px-4">
                Tente ajustar os filtros de busca para encontrar o relatório desejado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports Cards - Mobile View */}
      <div className="md:hidden space-y-3">
        {filteredReports.map((report) => (
          <Card key={report.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <report.icon className="w-8 h-8 text-blue-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm leading-tight pr-2">{report.name}</h3>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {getFormatIcon(report.format)}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {report.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className={`${getCategoryBadgeColor(report.category)} text-xs`}
                    >
                      {CATEGORY_FILTERS.find(f => f.value === report.category)?.label || report.category}
                    </Badge>
                    
                    <Button
                      onClick={() => executeReport(report)}
                      disabled={executingReports.has(report.id)}
                      size="sm"
                      className="h-8 px-3"
                    >
                      {executingReports.has(report.id) ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Executar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-base mb-2">Nenhum relatório encontrado</h3>
              <p className="text-sm text-muted-foreground px-4">
                Tente ajustar os filtros de busca para encontrar o relatório desejado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Categories Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        {CATEGORY_FILTERS.slice(1).map(category => {
          const categoryReports = AVAILABLE_REPORTS.filter(r => r.category === category.value);
          const Icon = category.value === 'auditoria' ? UserCheck :
                      category.value === 'banco' ? Database :
                      category.value === 'aplicacao' ? Activity :
                      category.value === 'correcao' ? CheckSquare : Users;
          
          return (
            <Card key={category.value} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setCategoryFilter(category.value)}>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="flex items-center text-sm md:text-base">
                  <Icon className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-600 flex-shrink-0" />
                  <span className="truncate">{category.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 md:space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Relatórios:</span>
                    <span className="font-medium">{categoryReports.length}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Formatos:</span>
                    <div className="flex space-x-1">
                      {[...new Set(categoryReports.map(r => r.format))].slice(0, 2).map(format => (
                        <span key={format} className="text-xs bg-muted px-1 py-0.5 rounded">
                          {format.toUpperCase()}
                        </span>
                      ))}
                      {[...new Set(categoryReports.map(r => r.format))].length > 2 && (
                        <span className="text-xs text-muted-foreground">+{[...new Set(categoryReports.map(r => r.format))].length - 2}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 md:pt-6">
          <div className="flex items-start space-x-3">
            <div className="seice-gradient w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1 text-sm md:text-base">Como usar os relatórios</h4>
              <p className="text-xs md:text-sm text-blue-800 mb-2 md:mb-3">
                Clique em "Executar" ao lado de cada relatório para gerar e baixar automaticamente. 
                Os relatórios são gerados com os dados mais recentes do sistema.
              </p>
              <ul className="text-xs md:text-sm text-blue-700 space-y-1">
                <li>• <strong>PDF:</strong> Ideal para visualização e impressão</li>
                <li>• <strong>Excel:</strong> Para análise avançada e manipulação de dados</li>
                <li className="hidden sm:list-item">• <strong>CSV:</strong> Para importação em outros sistemas</li>
                <li className="hidden sm:list-item">• <strong>Online:</strong> Visualização direta no navegador</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}