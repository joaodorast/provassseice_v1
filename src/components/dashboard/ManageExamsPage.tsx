import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  Calendar,
  Clock,
  Users,
  Target,
  Download,
  Upload,
  FileText,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiService } from '../../utils/api';

type ManageExamsPageProps = {
  onCreateExam?: () => void;
};

export function ManageExamsPage({ onCreateExam }: ManageExamsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('=== ManageExamsPage: Loading data ===');
      
      const [examsResponse, submissionsResponse] = await Promise.all([
        apiService.getExams(),
        apiService.getSubmissions()
      ]);
      
      console.log('ManageExamsPage: Exams response:', examsResponse);
      console.log('ManageExamsPage: Submissions response:', submissionsResponse);
      
      const examsList = examsResponse?.exams || [];
      const submissionsList = submissionsResponse?.submissions || [];
      
      console.log(`✓ ManageExamsPage: Loaded ${examsList.length} exams and ${submissionsList.length} submissions`);
      
      setExams(examsList);
      setSubmissions(submissionsList);
    } catch (error) {
      console.error('ManageExamsPage: Error loading data:', error);
      toast.error('Erro ao carregar dados');
      setExams([]);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExamSubmissions = (examId: string) => {
    return submissions.filter(sub => sub.examId === examId);
  };

  const getExamStats = (examId: string) => {
    const examSubmissions = getExamSubmissions(examId);
    const avgScore = examSubmissions.length > 0 
      ? Math.round(examSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) / examSubmissions.length)
      : 0;
    return {
      submissions: examSubmissions.length,
      avgScore
    };
  };

  const handleDuplicateExam = async (exam: any) => {
    try {
      setLoading(true);
      const response = await apiService.duplicateExam(exam.id);
      
      if (response.success) {
        toast.success('Simulado duplicado com sucesso!');
        await loadData();
      } else {
        throw new Error(response.error || 'Failed to duplicate exam');
      }
    } catch (error) {
      console.error('Error duplicating exam:', error);
      toast.error('Erro ao duplicar simulado');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este simulado? Esta ação não pode ser desfeita.')) {
      try {
        setLoading(true);
        const response = await apiService.deleteExam(examId);
        
        if (response.success) {
          toast.success('Simulado excluído com sucesso!');
          await loadData();
        } else {
          throw new Error(response.error || 'Failed to delete exam');
        }
      } catch (error) {
        console.error('Error deleting exam:', error);
        toast.error('Erro ao excluir simulado');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownloadAnswerSheet = async (exam: any) => {
    try {
      // Gera o cartão resposta em PDF ou abre em nova aba para impressão
      const totalQuestions = exam.questions?.length || 0;
      const examTitle = exam.title || 'Simulado';
      const examId = exam.id || '';
      
      // Validação: não gerar cartão vazio
      if (totalQuestions === 0) {
        toast.error('Este simulado não possui questões cadastradas');
        return;
      }
      
      console.log('📄 Gerando cartão resposta:', {
        examId,
        examTitle,
        totalQuestions,
        questionsArray: exam.questions
      });
      
      // URL do QR Code - pode ser um link para o sistema de correção
      const qrCodeUrl = `${window.location.origin}/correcao?exam=${examId}`;
      
      // Cria uma nova janela com o cartão resposta
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Bloqueador de pop-ups impediu a abertura. Por favor, permita pop-ups para este site.');
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cartão Resposta - ${examTitle}</title>
          <style>
            @page { 
              size: A4;
              margin: 10mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #1e40af;
            }
            .header h1 {
              color: #1e40af;
              font-size: 24px;
              margin-bottom: 5px;
            }
            .header h2 {
              color: #334155;
              font-size: 16px;
              font-weight: normal;
            }
            .info-section {
              margin-bottom: 20px;
              padding: 15px;
              background: #f1f5f9;
              border-radius: 8px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 3px;
            }
            .info-value {
              font-size: 14px;
              color: #1e293b;
              font-weight: 600;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 3px;
              min-width: 200px;
            }
            .qr-section {
              margin: 20px auto;
              text-align: center;
              padding: 15px;
              border: 2px solid #1e40af;
              border-radius: 8px;
              max-width: 180px;
              background: white;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              margin: 10px auto;
              background: white;
              border: 1px solid #cbd5e1;
              padding: 5px;
            }
            .qr-label {
              font-size: 11px;
              color: #64748b;
              margin-top: 8px;
              font-weight: 600;
            }
            .answer-grid {
              margin-top: 20px;
            }
            .question-row {
              display: flex;
              align-items: center;
              padding: 8px 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            .question-row:nth-child(even) {
              background: #f8fafc;
            }
            .question-number {
              width: 40px;
              font-weight: 600;
              color: #1e40af;
              font-size: 14px;
            }
            .options {
              display: flex;
              gap: 15px;
              flex: 1;
            }
            .option {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            .bubble {
              width: 20px;
              height: 20px;
              border: 2px solid #1e40af;
              border-radius: 50%;
              display: inline-block;
            }
            .option-label {
              font-weight: 600;
              color: #334155;
              font-size: 13px;
            }
            .instructions {
              margin-top: 20px;
              padding: 15px;
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              border-radius: 4px;
            }
            .instructions h3 {
              color: #92400e;
              font-size: 14px;
              margin-bottom: 8px;
            }
            .instructions ul {
              list-style: none;
              padding-left: 0;
            }
            .instructions li {
              color: #78350f;
              font-size: 12px;
              margin-bottom: 4px;
              padding-left: 15px;
              position: relative;
            }
            .instructions li:before {
              content: "•";
              position: absolute;
              left: 0;
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CARTÃO RESPOSTA</h1>
            <h2>${examTitle}</h2>
            <div style="color: #64748b; font-size: 13px; margin-top: 5px;">
              Total de questões: ${totalQuestions}
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-item">
              <div class="info-label">Nome do Aluno</div>
              <div class="info-value">&nbsp;</div>
            </div>
            <div class="info-item">
              <div class="info-label">Matrícula</div>
              <div class="info-value">&nbsp;</div>
            </div>
            <div class="info-item">
              <div class="info-label">Turma</div>
              <div class="info-value">&nbsp;</div>
            </div>
          </div>
          
          <div class="qr-section">
            <div style="font-size: 12px; font-weight: 700; color: #1e40af; margin-bottom: 8px;">CÓDIGO DO SIMULADO</div>
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrCodeUrl)}" alt="QR Code" style="width: 100%; height: 100%;" />
            </div>
            <div class="qr-label">ID: ${examId.substring(0, 8)}...</div>
          </div>
          
          <div class="answer-grid">
            ${Array.from({ length: totalQuestions }, (_, i) => `
              <div class="question-row">
                <div class="question-number">${String(i + 1).padStart(2, '0')}</div>
                <div class="options">
                  <div class="option">
                    <span class="bubble"></span>
                    <span class="option-label">A</span>
                  </div>
                  <div class="option">
                    <span class="bubble"></span>
                    <span class="option-label">B</span>
                  </div>
                  <div class="option">
                    <span class="bubble"></span>
                    <span class="option-label">C</span>
                  </div>
                  <div class="option">
                    <span class="bubble"></span>
                    <span class="option-label">D</span>
                  </div>
                  <div class="option">
                    <span class="bubble"></span>
                    <span class="option-label">E</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="instructions">
            <h3>📋 INSTRUÇÕES DE PREENCHIMENTO</h3>
            <ul>
              <li>Preencha completamente o círculo correspondente à resposta escolhida</li>
              <li>Use caneta esferográfica azul ou preta</li>
              <li>Não rasure ou amasse o cartão</li>
              <li>Marque apenas uma alternativa por questão</li>
              <li>Escaneie ou fotografe o QR Code para submeter as respostas digitalmente</li>
            </ul>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      toast.success('Cartão resposta gerado! Uma nova janela foi aberta.');
    } catch (error) {
      console.error('Error generating answer sheet:', error);
      toast.error('Erro ao gerar cartão resposta');
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (exam.description && exam.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubject = filterSubject === 'all' || 
                          (exam.subjects && Array.isArray(exam.subjects) && exam.subjects.includes(filterSubject)) ||
                          exam.subject === filterSubject;
    
    const matchesType = filterType === 'all' || 
                       (filterType === 'simulado' && exam.type === 'simulado') ||
                       (filterType === 'avaliacao' && exam.type !== 'simulado');
    
    return matchesSearch && matchesSubject && matchesType;
  });

  // Get unique subjects from all exams
  const uniqueSubjects = Array.from(new Set(
    exams.flatMap(e => {
      if (e.subjects && Array.isArray(e.subjects)) {
        return e.subjects;
      } else if (e.subject) {
        return [e.subject];
      }
      return [];
    })
  )).filter(Boolean);

  const totalQuestions = exams.reduce((total, exam) => total + (exam.questions?.length || 0), 0);
  const simuladosCount = exams.filter(e => e.type === 'simulado').length;

  if (loading && exams.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600">Carregando simulados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Simulados</h1>
          <p className="text-slate-600">
            Gerencie seus simulados e avaliações criadas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </Button>
          {onCreateExam && (
            <Button onClick={onCreateExam} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Simulado
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="seice-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Simulados</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{exams.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Simulados criados
            </p>
          </CardContent>
        </Card>
        
        <Card className="seice-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Questões</CardTitle>
            <Target className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {totalQuestions}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total de questões
            </p>
          </CardContent>
        </Card>
        
        <Card className="seice-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Aplicações</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {submissions.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total de realizações
            </p>
          </CardContent>
        </Card>
        
        <Card className="seice-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Matérias</CardTitle>
            <Filter className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{uniqueSubjects.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Diferentes matérias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle>Seus Simulados</CardTitle>
          <CardDescription>
            Gerencie e organize seus simulados criados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por matéria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as matérias</SelectItem>
                {uniqueSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="simulado">Simulados</SelectItem>
                <SelectItem value="avaliacao">Avaliações</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Título</TableHead>
                  <TableHead className="font-semibold">Matérias</TableHead>
                  <TableHead className="font-semibold">Questões</TableHead>
                  <TableHead className="font-semibold">Tipo</TableHead>
                  <TableHead className="font-semibold">Aplicações</TableHead>
                  <TableHead className="font-semibold">Média</TableHead>
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam) => {
                  const stats = getExamStats(exam.id);
                  const examSubjects = exam.subjects && Array.isArray(exam.subjects) 
                    ? exam.subjects 
                    : exam.subject 
                      ? [exam.subject] 
                      : ['Geral'];
                  
                  return (
                    <TableRow key={exam.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-800">{exam.title}</div>
                          {exam.description && (
                            <div className="text-sm text-slate-500">
                              {exam.description.substring(0, 60)}
                              {exam.description.length > 60 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {examSubjects.slice(0, 2).map((subject, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {examSubjects.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{examSubjects.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{exam.questions?.length || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          exam.type === 'simulado' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }>
                          {exam.type === 'simulado' ? 'Simulado' : 'Avaliação'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{stats.submissions}</span>
                      </TableCell>
                      <TableCell>
                        {stats.submissions > 0 ? (
                          <span className={`font-medium ${
                            stats.avgScore >= 70 ? 'text-green-600' :
                            stats.avgScore >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {stats.avgScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(exam.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Visualizar"
                            onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Cartão Resposta (QR Code)"
                            onClick={() => handleDownloadAnswerSheet(exam)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Duplicar"
                            onClick={() => handleDuplicateExam(exam)}
                            disabled={loading}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Excluir"
                            onClick={() => handleDeleteExam(exam.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredExams.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="font-semibold text-slate-800 mb-2">
                {searchTerm || filterSubject !== 'all' || filterType !== 'all'
                  ? 'Nenhum simulado encontrado'
                  : 'Nenhum simulado criado ainda'
                }
              </h3>
              <p className="text-slate-600 mb-6">
                {searchTerm || filterSubject !== 'all' || filterType !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro simulado com questões do banco de questões'
                }
              </p>
              {!searchTerm && filterSubject === 'all' && filterType === 'all' && onCreateExam && (
                <Button onClick={onCreateExam} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Simulado
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Info Card */}
      {exams.length > 0 && (
        <Card className="seice-card border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">Dica de Uso</p>
                <p className="text-sm text-blue-800 mt-1">
                  Use a função "Duplicar" para criar variações de simulados existentes.
                  Você pode visualizar qualquer simulado clicando no ícone de olho,
                  e aplicar correções automáticas através do menu "Enviar Imagens".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}