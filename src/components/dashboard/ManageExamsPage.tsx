import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  Users,
  Target,
  QrCode,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
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
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  // Estado para edição de título e descrição
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Estado para edição de turma
  const [editClassDialogOpen, setEditClassDialogOpen] = useState(false);
  const [editingClassExam, setEditingClassExam] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [saveClassLoading, setSaveClassLoading] = useState(false);
  const [saveClassError, setSaveClassError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('=== ManageExamsPage: Loading data ===');
      
      const [examsResponse, submissionsResponse, studentsResponse, classesResponse] = await Promise.all([
        apiService.getExams(),
        apiService.getSubmissions(),
        apiService.getStudents(),
        apiService.getClasses()
      ]);
      
      console.log('ManageExamsPage: Exams response:', examsResponse);
      console.log('ManageExamsPage: Submissions response:', submissionsResponse);
      console.log('ManageExamsPage: Students response:', studentsResponse);
      console.log('ManageExamsPage: Classes response:', classesResponse);
      
      let examsList = examsResponse?.exams || [];
      const submissionsList = submissionsResponse?.submissions || [];
      const studentsList = studentsResponse?.students || [];
      const classesList = classesResponse?.classes || [];
      
      // Carregar questões completas para cada exame
      console.log('🔄 Carregando questões completas para cada simulado...');
      const examsWithQuestions = await Promise.all(
        examsList.map(async (exam) => {
          try {
            const fullExamResponse = await apiService.getExam(exam.id);
            const fullExam = fullExamResponse?.exam || exam;
            const questionsCount = fullExam.questions?.length || 0;
            
            console.log(`  📋 ${exam.title}: ${questionsCount} questões`);
            
            return {
              ...exam,
              questions: fullExam.questions || [],
              questionCount: questionsCount
            };
          } catch (error) {
            console.error(`  ❌ Erro ao carregar questões do exame ${exam.id}:`, error);
            return exam;
          }
        })
      );
      
      console.log(`✓ ManageExamsPage: Loaded ${examsWithQuestions.length} exams, ${submissionsList.length} submissions, ${studentsList.length} students, ${classesList.length} classes`);
      
      setExams(examsWithQuestions);
      setSubmissions(submissionsList);
      setStudents(studentsList);
      setClasses(classesList);
    } catch (error) {
      console.error('ManageExamsPage: Error loading data:', error);
      showToast('Erro ao carregar dados', 'error');
      setExams([]);
      setSubmissions([]);
      setStudents([]);
      setClasses([]);
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

  // Função para abrir o diálogo de edição de título
  const handleEditClick = (exam: any) => {
    console.log('📝 Abrindo edição do exame:', exam);
    setEditingExam(exam);
    setEditTitle(exam.title || '');
    setEditDescription(exam.description || '');
    setSaveError('');
    setEditDialogOpen(true);
  };

  // Função para salvar as alterações de título via API
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setSaveError('O título não pode estar vazio');
      return;
    }

    try {
      setSaveLoading(true);
      setSaveError('');
      
      console.log('💾 Salvando alterações via API:', {
        examId: editingExam.id,
        title: editTitle,
        description: editDescription
      });

      const response = await apiService.updateExam(editingExam.id, {
        title: editTitle,
        description: editDescription
      });

      console.log('✓ Resposta da API:', response);

      if (response.success) {
        showToast('Simulado atualizado com sucesso!', 'success');
        setEditDialogOpen(false);
        await loadData();
      } else {
        throw new Error(response.error || 'Erro ao atualizar simulado');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar alterações:', error);
      setSaveError(error.message || 'Erro ao salvar alterações. Tente novamente.');
      showToast('Erro ao atualizar simulado', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Função para abrir o diálogo de edição de turma
  const handleEditClassClick = (exam: any) => {
    console.log('🏫 Abrindo edição de turma do exame:', exam);
    setEditingClassExam(exam);
    setSelectedClass(exam.selectedClass || '');
    setSaveClassError('');
    setEditClassDialogOpen(true);
  };

  // Função para salvar a alteração de turma via API
  const handleSaveClassEdit = async () => {
    if (!selectedClass) {
      setSaveClassError('Por favor, selecione uma turma');
      return;
    }

    try {
      setSaveClassLoading(true);
      setSaveClassError('');
      
      console.log('🏫 Atualizando turma do simulado via API:', {
        examId: editingClassExam.id,
        selectedClass: selectedClass
      });

      const response = await apiService.updateExam(editingClassExam.id, {
        selectedClass: selectedClass
      });

      console.log('✓ Resposta da API:', response);

      if (response.success) {
        showToast('Turma atualizada com sucesso!', 'success');
        setEditClassDialogOpen(false);
        await loadData();
      } else {
        throw new Error(response.error || 'Erro ao atualizar turma');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar turma:', error);
      setSaveClassError(error.message || 'Erro ao salvar turma. Tente novamente.');
      showToast('Erro ao atualizar turma', 'error');
    } finally {
      setSaveClassLoading(false);
    }
  };

  const handleDuplicateExam = async (exam: any) => {
    try {
      setLoading(true);
      const response = await apiService.duplicateExam(exam.id);
      
      if (response.success) {
        showToast('Simulado duplicado com sucesso!', 'success');
        await loadData();
      } else {
        throw new Error(response.error || 'Failed to duplicate exam');
      }
    } catch (error) {
      console.error('Error duplicating exam:', error);
      showToast('Erro ao duplicar simulado', 'error');
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
          showToast('Simulado excluído com sucesso!', 'success');
          await loadData();
        } else {
          throw new Error(response.error || 'Failed to delete exam');
        }
      } catch (error) {
        console.error('Error deleting exam:', error);
        showToast('Erro ao excluir simulado', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownloadAnswerSheet = async (exam: any) => {
    try {
      const totalQuestions = exam.questions?.length || 0;
      const examTitle = exam.title || 'Simulado';
      const examId = exam.id || '';
      const selectedClass = exam.selectedClass;
      
      console.log('📊 Gerando cartões para simulado:', {
        examId,
        examTitle,
        selectedClass,
        totalQuestions,
        hasQuestions: !!exam.questions
      });
      
      if (totalQuestions === 0) {
        showToast('Este simulado não possui questões cadastradas', 'error');
        return;
      }

      if (!selectedClass) {
        showToast('Este simulado não possui turma selecionada', 'error');
        return;
      }

      const classStudents = students.filter(student => student.class === selectedClass);
      
      if (classStudents.length === 0) {
        showToast(`Nenhum aluno encontrado na turma ${selectedClass}`, 'error');
        return;
      }

      console.log('📄 Gerando cartões resposta automáticos:', {
        examId,
        examTitle,
        selectedClass,
        totalQuestions,
        studentsCount: classStudents.length
      });

      const qrCodeUrl = `${window.location.origin}/correcao?exam=${examId}`;
      const questionsPerColumn = Math.ceil(totalQuestions / 2);

      const studentsHTML = classStudents.map((student, index) => {
        const studentName = student.name || 'Nome do Aluno';
        const studentId = student.studentId || student.id || '';
        const studentClass = student.class || selectedClass;
        const studentQRCode = `${qrCodeUrl}&student=${studentId}`;

        return `
          <div class="page-container" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
            <div class="container">
              <div class="header">
                <h1>CARTÃO RESPOSTA</h1>
                <h2>${examTitle}</h2>
                <div class="meta">
                  Total de questões: ${totalQuestions} | Data: ${new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <div class="top-section">
                <div class="info-section">
                  <div class="info-row">
                    <div class="info-item">
                      <div class="info-label">Nome do Aluno</div>
                      <div class="info-value filled">${studentName}</div>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <div class="info-label">Matrícula</div>
                      <div class="info-value filled">${studentId}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Turma</div>
                      <div class="info-value filled">${studentClass}</div>
                    </div>
                  </div>
                </div>
                    
                <div class="qr-section">
                  <div class="qr-title">Código do Aluno</div>
                  <div class="qr-code">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(studentQRCode)}" alt="QR Code" style="width: 100%; height: 100%;" />
                  </div>
                  <div class="qr-label">ID: ${studentId.substring(0, 8)}...</div>
                </div>
              </div>
                  
              <div class="answer-section">
                <div class="answer-column">
                  <div class="grid-header">GABARITO - Coluna 1</div>
                  ${Array.from({ length: questionsPerColumn }, (_, i) => `
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
                
                <div class="answer-column">
                  <div class="grid-header">GABARITO - Coluna 2</div>
                  ${Array.from({ length: totalQuestions - questionsPerColumn }, (_, i) => `
                    <div class="question-row">
                      <div class="question-number">${String(questionsPerColumn + i + 1).padStart(2, '0')}</div>
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
              </div>
              
              <div class="instructions">
                <h3>📋 INSTRUÇÕES DE PREENCHIMENTO</h3>
                <ul>
                  <li>Preencha completamente o círculo da resposta escolhida</li>
                  <li>Use caneta azul ou preta</li>
                  <li>Não rasure ou dobre o cartão</li>
                  <li>Marque apenas UMA alternativa por questão</li>
                  <li>Escaneie o QR Code para correção automática</li>
                  <li>Mantenha o cartão limpo e sem dobras</li>
                </ul>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('Bloqueador de pop-ups impediu a abertura. Por favor, permita pop-ups para este site.', 'error');
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cartões Resposta - ${examTitle} - Turma ${selectedClass}</title>
          <meta charset="UTF-8">
          <style>
            @page { 
              size: A4;
              margin: 8mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background: white;
            }
            .page-container {
              padding: 8px;
            }
            .container {
              max-width: 100%;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 8px;
              padding: 8px;
              border-bottom: 2px solid #1e40af;
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
              border-radius: 4px;
            }
            .header h1 {
              color: #1e40af;
              font-size: 18px;
              margin-bottom: 2px;
              font-weight: 700;
            }
            .header h2 {
              color: #334155;
              font-size: 13px;
              font-weight: 600;
            }
            .header .meta {
              color: #64748b;
              font-size: 9px;
              margin-top: 2px;
            }
            .top-section {
              display: flex;
              gap: 8px;
              margin-bottom: 8px;
            }
            .info-section {
              flex: 1;
              padding: 6px;
              background: #f8fafc;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            .info-row {
              display: flex;
              gap: 8px;
              margin-bottom: 4px;
            }
            .info-row:last-child {
              margin-bottom: 0;
            }
            .info-item {
              flex: 1;
            }
            .info-label {
              font-size: 7px;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 2px;
              font-weight: 600;
            }
            .info-value {
              font-size: 10px;
              color: #1e293b;
              font-weight: 600;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 2px;
              min-height: 16px;
            }
            .info-value.filled {
              color: #1e40af;
              background: #eff6ff;
              padding: 2px 4px;
              border-radius: 2px;
              border: 1px solid #bfdbfe;
              font-weight: 700;
            }
            .qr-section {
              width: 90px;
              text-align: center;
              padding: 6px;
              border: 1.5px solid #1e40af;
              border-radius: 4px;
              background: white;
            }
            .qr-title {
              font-size: 7px;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 4px;
              text-transform: uppercase;
            }
            .qr-code {
              width: 60px;
              height: 60px;
              margin: 4px auto;
              background: white;
              border: 1px solid #cbd5e1;
              padding: 2px;
            }
            .qr-label {
              font-size: 7px;
              color: #64748b;
              margin-top: 2px;
              font-weight: 600;
            }
            .answer-section {
              display: flex;
              gap: 8px;
              margin-bottom: 8px;
            }
            .answer-column {
              flex: 1;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              overflow: hidden;
            }
            .grid-header {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: white;
              padding: 4px 6px;
              font-size: 9px;
              font-weight: 600;
              text-align: center;
            }
            .question-row {
              display: flex;
              align-items: center;
              padding: 3px 6px;
              border-bottom: 1px solid #e2e8f0;
            }
            .question-row:nth-child(even) {
              background: #f8fafc;
            }
            .question-row:last-child {
              border-bottom: none;
            }
            .question-number {
              width: 20px;
              font-weight: 700;
              color: #1e40af;
              font-size: 9px;
              flex-shrink: 0;
            }
            .options {
              display: flex;
              gap: 8px;
              flex: 1;
              align-items: center;
            }
            .option {
              display: flex;
              align-items: center;
              gap: 2px;
            }
            .bubble {
              width: 12px;
              height: 12px;
              border: 1.5px solid #1e40af;
              border-radius: 50%;
              display: inline-block;
              flex-shrink: 0;
            }
            .option-label {
              font-weight: 700;
              color: #334155;
              font-size: 8px;
            }
            .instructions {
              padding: 6px 8px;
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border-left: 3px solid #f59e0b;
              border-radius: 4px;
            }
            .instructions h3 {
              color: #92400e;
              font-size: 9px;
              margin-bottom: 4px;
              font-weight: 700;
            }
            .instructions ul {
              list-style: none;
              padding-left: 0;
              columns: 2;
              column-gap: 12px;
            }
            .instructions li {
              color: #78350f;
              font-size: 7px;
              margin-bottom: 2px;
              padding-left: 10px;
              position: relative;
              line-height: 1.3;
              break-inside: avoid;
            }
            .instructions li:before {
              content: "✓";
              position: absolute;
              left: 0;
              color: #f59e0b;
              font-weight: bold;
              font-size: 8px;
            }
            @media print {
              .no-print { display: none; }
              body { 
                padding: 0;
                background: white;
              }
              .page-container {
                padding: 8px;
              }
            }
          </style>
        </head>  
        <body>
          ${studentsHTML}
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 800);
            };
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      showToast(`✓ ${classStudents.length} cartões resposta gerados para a turma ${selectedClass}!`, 'success');
    } catch (error) {
      console.error('Error generating answer sheets:', error);
      showToast('Erro ao gerar cartões resposta', 'error');
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

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
    <div className="space-y-6 p-6">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Simulados</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{exams.length}</div>
            <p className="text-xs text-slate-500 mt-1">Simulados criados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Questões</CardTitle>
            <Target className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{totalQuestions}</div>
            <p className="text-xs text-slate-500 mt-1">Total de questões</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Aplicações</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{submissions.length}</div>
            <p className="text-xs text-slate-500 mt-1">Total de realizações</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Matérias</CardTitle>
            <Filter className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{uniqueSubjects.length}</div>
            <p className="text-xs text-slate-500 mt-1">Diferentes matérias</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seus Simulados</CardTitle>
          <CardDescription>Gerencie e organize seus simulados criados</CardDescription>
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
                  <TableHead className="font-semibold">Turma</TableHead>
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
                  const classStudentsCount = students.filter(s => s.class === exam.selectedClass).length;
                  
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
                        {exam.selectedClass ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {exam.selectedClass}
                              </Badge>
                              <p className="text-xs text-slate-500 mt-1">
                                {classStudentsCount} aluno{classStudentsCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClassClick(exam)}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Alterar turma"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClassClick(exam)}
                            className="text-xs"
                          >
                            Atribuir turma
                          </Button>
                        )}
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
                            title="Editar Título"
                            onClick={() => handleEditClick(exam)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Visualizar"
                            onClick={() => showToast('Funcionalidade em desenvolvimento', 'info')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title={exam.selectedClass ? `Gerar ${classStudentsCount} cartões para ${exam.selectedClass}` : 'Cartão Resposta'}
                            onClick={() => handleDownloadAnswerSheet(exam)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={!exam.selectedClass || classStudentsCount === 0}
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

      {exams.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <QrCode className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">✨ Cartões Resposta Automatizados</p>
                <p className="text-sm text-blue-800 mt-1">
                  Clique no ícone <strong>QR Code</strong> para gerar automaticamente todos os cartões resposta 
                  da turma selecionada. Os cartões virão pré-preenchidos com <strong>nome do aluno, matrícula e turma</strong>.
                  Cada cartão terá um QR Code único para identificação do estudante na correção automática.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Edição de Título */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Editar Simulado
            </DialogTitle>
            <DialogDescription>
              Altere o título e a descrição do simulado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Título do Simulado <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                placeholder="Ex: Simulado de Matemática - 1º Bimestre"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={saveError && !editTitle.trim() ? 'border-red-500' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">
                Descrição (opcional)
              </Label>
              <Textarea
                id="edit-description"
                placeholder="Ex: Avaliação diagnóstica do primeiro bimestre focada em álgebra e geometria"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            {saveError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saveLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saveLoading || !editTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Turma */}
      <Dialog open={editClassDialogOpen} onOpenChange={setEditClassDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Alterar Turma do Simulado
            </DialogTitle>
            <DialogDescription>
              Selecione a turma que realizará este simulado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editingClassExam && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-700">Simulado:</p>
                <p className="text-base font-semibold text-slate-900 mt-1">{editingClassExam.title}</p>
                {editingClassExam.selectedClass && (
                  <p className="text-xs text-slate-500 mt-1">
                    Turma atual: <span className="font-medium">{editingClassExam.selectedClass}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="select-class">
                Selecione a Turma <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="select-class" className={saveClassError && !selectedClass ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Escolha uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Nenhuma turma cadastrada
                    </div>
                  ) : (
                    classes.map((cls) => {
                      const studentsInClass = students.filter(s => s.class === cls.name).length;
                      return (
                        <SelectItem key={cls.id} value={cls.name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{cls.name}</span>
                            <span className="text-xs text-slate-500 ml-2">
                              ({studentsInClass} aluno{studentsInClass !== 1 ? 's' : ''})
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              
              {selectedClass && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <p className="font-medium">
                    ✓ {students.filter(s => s.class === selectedClass).length} alunos nesta turma
                  </p>
                </div>
              )}
            </div>

            {saveClassError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{saveClassError}</AlertDescription>
              </Alert>
            )}

            {classes.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você precisa cadastrar turmas antes de atribuí-las aos simulados.
                  Vá para a seção de Turmas para criar sua primeira turma.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditClassDialogOpen(false)}
              disabled={saveClassLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveClassEdit}
              disabled={saveClassLoading || !selectedClass || classes.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveClassLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Turma
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}