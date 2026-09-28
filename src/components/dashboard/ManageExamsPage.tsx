import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle,
  Layers,
  CheckCircle2,
  Sparkles,
  Check,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { apiService } from '../../utils/api';
import { ActionResultDialog, ActionResult } from './ActionResultDialog';

type ManageExamsPageProps = {
  onCreateExam?: () => void;
  onEditExam?: (exam: any) => void;
};

export function ManageExamsPage({ onCreateExam, onEditExam }: ManageExamsPageProps) {
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

  // Estado para visualização do simulado
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingExam, setViewingExam] = useState<any>(null);

  // Estado para o modal de matérias
  const [subjectsDialogOpen, setSubjectsDialogOpen] = useState(false);
  const [subjectsExam, setSubjectsExam] = useState<any>(null);

  // Estado para confirmação de exclusão
  const [deletingExam, setDeletingExam] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal central de resultado das ações
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  // Simulados já realizados podem ser ocultados da lista (sem apagar nada) e reativados depois
  const [showHidden, setShowHidden] = useState(false);
  const [hidingExamId, setHidingExamId] = useState<string | null>(null);

  // Destaque temporário do card recém-duplicado
  const [highlightedExamId, setHighlightedExamId] = useState<string | null>(null);

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
      
      const [examsResponse, submissionsResponse, studentsResponse] = await Promise.all([
        apiService.getExams(),
        apiService.getSubmissions(),
        apiService.getStudents()
      ]);
      
      console.log('ManageExamsPage: Exams response:', examsResponse);
      console.log('ManageExamsPage: Submissions response:', submissionsResponse);
      console.log('ManageExamsPage: Students response:', studentsResponse);
      
      let examsList = examsResponse?.exams || [];
      const submissionsList = submissionsResponse?.submissions || [];
      const studentsList = studentsResponse?.students || [];
      
      // Extrair turmas únicas dos alunos
      const uniqueClassNames = Array.from(new Set(
        studentsList
          .map(s => s.class)
          .filter(Boolean)
      )).sort();
      
      const classesList = uniqueClassNames.map(className => ({
        id: className,
        name: className,
        studentsCount: studentsList.filter(s => s.class === className).length
      }));
      
      console.log('ManageExamsPage: Classes extracted from students:', classesList);
      
      // Carregar questões completas para cada exame
      console.log('Carregando questões completas para cada simulado...');
      const examsWithQuestions = await Promise.all(
        examsList.map(async (exam) => {
          try {
            const fullExamResponse = await apiService.getExam(exam.id);
            const fullExam = fullExamResponse?.exam || exam;
            const questionsCount = fullExam.questions?.length || 0;
            
            console.log(`  ${exam.title}: ${questionsCount} questões`);
            
            return {
              ...exam,
              questions: fullExam.questions || [],
              questionCount: questionsCount
            };
          } catch (error) {
            console.error(`  Erro ao carregar questões do exame ${exam.id}:`, error);
            return exam;
          }
        })
      );
      
      console.log(`ManageExamsPage: Loaded ${examsWithQuestions.length} exams, ${submissionsList.length} submissions, ${studentsList.length} students, ${classesList.length} classes`);
      
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

  // Agrupa as questões do simulado por matéria (quantidade e pontos)
  const getExamSubjectBreakdown = (exam: any) => {
    const fallbackSubject = exam.subject || 'Geral';
    const breakdown = new Map<string, { subject: string; questions: number; points: number }>();

    (exam.questions || []).forEach((q: any) => {
      const subject = q.subject || fallbackSubject;
      const entry = breakdown.get(subject) || { subject, questions: 0, points: 0 };
      entry.questions += 1;
      entry.points += Number(q.points ?? q.weight ?? 1) || 0;
      breakdown.set(subject, entry);
    });

    // Simulados sem questões ainda: mostra as matérias declaradas
    if (breakdown.size === 0) {
      const declared = Array.isArray(exam.subjects) && exam.subjects.length > 0 ? exam.subjects : [fallbackSubject];
      declared.forEach((subject: string) => breakdown.set(subject, { subject, questions: 0, points: 0 }));
    }

    return Array.from(breakdown.values());
  };

  // Função para abrir o diálogo de edição de título
  const handleEditClick = (exam: any) => {
    console.log('Abrindo edição do exame:', exam);
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
      
      console.log('Salvando alterações via API:', {
        examId: editingExam.id,
        title: editTitle,
        description: editDescription
      });

      const response = await apiService.updateExam(editingExam.id, {
        title: editTitle,
        description: editDescription
      });

      console.log('Resposta da API:', response);

      if (response.success) {
        showToast('Simulado atualizado com sucesso!', 'success');
        setEditDialogOpen(false);
        await loadData();
      } else {
        throw new Error(response.error || 'Erro ao atualizar simulado');
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      setSaveError(error.message || 'Erro ao salvar alterações. Tente novamente.');
      showToast('Erro ao atualizar simulado', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Função para abrir o diálogo de edição de turma
  const handleEditClassClick = (exam: any) => {
    console.log('Abrindo edição de turma do exame:', exam);
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
      
      console.log('Atualizando turma do simulado via API:', {
        examId: editingClassExam.id,
        selectedClass: selectedClass
      });

      const response = await apiService.updateExam(editingClassExam.id, {
        selectedClass: selectedClass
      });

      console.log('Resposta da API:', response);

      if (response.success) {
        showToast('Turma atualizada com sucesso!', 'success');
        setEditClassDialogOpen(false);
        await loadData();
      } else {
        throw new Error(response.error || 'Erro ao atualizar turma');
      }
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
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
        const newExam = response.exam;
        // A cópia ainda não teve cartões gerados
        if (newExam?.id && (exam.answerSheetsGeneratedAt || exam.hidden)) {
          await apiService.updateExam(newExam.id, { answerSheetsGeneratedAt: null, hidden: false, hiddenAt: null });
        }
        showToast('Simulado duplicado!', 'success', newExam?.title || `${exam.title} (Cópia)`);
        await loadData();
        if (newExam?.id) {
          setHighlightedExamId(newExam.id);
          setTimeout(() => setHighlightedExamId(null), 3000);
        }
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

  // Oculta (hidden = true) ou reativa (hidden = false) um simulado. Os dados, cartões e
  // correções continuam intactos; só some da lista principal.
  const setExamHidden = async (exam: any, hidden: boolean) => {
    const patch = { hidden, hiddenAt: hidden ? new Date().toISOString() : null };
    try {
      setHidingExamId(exam.id);
      const response = await apiService.updateExam(exam.id, patch);
      if (!response?.success) throw new Error(response?.error || 'Failed to update exam');
      setExams(prev => prev.map(e => (e.id === exam.id ? { ...e, ...patch } : e)));

      if (hidden) {
        setActionResult({
          type: 'success',
          title: 'Simulado ocultado',
          message: `"${exam.title}" saiu da lista. Para trazê-lo de volta, use "Mostrar ocultos".`,
          actions: [
            {
              label: 'Desfazer',
              variant: 'outline',
              icon: <RotateCcw className="w-4 h-4 mr-2" />,
              onClick: () => { setActionResult(null); setExamHidden(exam, false); }
            },
            { label: 'OK', onClick: () => setActionResult(null) }
          ]
        });
      } else {
        showToast('Simulado reativado!', 'success', `"${exam.title}" voltou para a lista.`);
        setHighlightedExamId(exam.id);
        setTimeout(() => setHighlightedExamId(null), 3000);
      }
    } catch (error) {
      console.error('Error toggling exam visibility:', error);
      showToast(hidden ? 'Erro ao ocultar simulado' : 'Erro ao reativar simulado', 'error');
    } finally {
      setHidingExamId(null);
    }
  };

  const handleDeleteExam = async () => {
    if (!deletingExam) return;
    try {
      setDeleteLoading(true);
      const response = await apiService.deleteExam(deletingExam.id);
      
      if (response.success) {
        showToast('Simulado excluído!', 'success', deletingExam.title);
        setDeletingExam(null);
        await loadData();
      } else {
        throw new Error(response.error || 'Failed to delete exam');
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      showToast('Erro ao excluir simulado', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadAnswerSheet = async (exam: any) => {
    try {
      const totalQuestions = exam.questions?.length || 0;
      const examTitle = exam.title || 'Simulado';
      const examId = exam.id || '';
      const selectedClass = exam.selectedClass;
      
      console.log('Gerando cartões para simulado:', {
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

      console.log('Gerando cartões resposta automáticos:', {
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
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(studentQRCode)}" alt="QR Code" style="width: 100%; height: 100%;" />
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
                <h3>INSTRUÇÕES DE PREENCHIMENTO</h3>
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
              width: 118px;
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
              width: 86px;
              height: 86px;
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
      
      showToast('Cartões resposta gerados!', 'success', `${classStudents.length} cartões para a turma ${selectedClass}.`);

      // Marca o simulado como aplicado
      const generatedAt = new Date().toISOString();
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, answerSheetsGeneratedAt: generatedAt } : e));
      apiService.updateExam(exam.id, { answerSheetsGeneratedAt: generatedAt })
        .catch(err => console.error('Erro ao marcar simulado como aplicado:', err));
    } catch (error) {
      console.error('Error generating answer sheets:', error);
      showToast('Erro ao gerar cartões resposta', 'error');
    }
  };

  const hiddenCount = exams.filter(exam => exam.hidden).length;

  const filteredExams = exams.filter(exam => {
    if (!!exam.hidden !== showHidden) return false;

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

  const showToast = (title: string, type: 'success' | 'error', message?: string) => {
    setActionResult({ type, title, message });
  };

  if (loading && exams.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-800 border-t-transparent mx-auto mb-4"></div>
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
            <Button onClick={onCreateExam} className="bg-zinc-800 hover:bg-zinc-900">
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
            <BookOpen className="h-5 w-5 text-zinc-800" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{totalQuestions}</div>
            <p className="text-xs text-slate-500 mt-1">Total de questões</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Aplicações</CardTitle>
            <Users className="h-5 w-5 text-teal-600" />
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
            {(hiddenCount > 0 || showHidden) && (
              <Button
                variant="outline"
                onClick={() => setShowHidden(v => !v)}
                className={`w-full md:w-auto flex-shrink-0 ${showHidden ? 'border-zinc-800 text-zinc-900' : ''}`}
              >
                {showHidden ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                {showHidden ? 'Voltar aos simulados ativos' : `Mostrar ocultos (${hiddenCount})`}
              </Button>
            )}
          </div>

          {showHidden && hiddenCount > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <EyeOff className="w-4 h-4 flex-shrink-0" />
              Estes simulados estão ocultos. Clique em <strong className="mx-1">Reativar</strong> para devolvê-los à lista principal.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
            {filteredExams.map((exam) => {
              const stats = getExamStats(exam.id);
              const classStudentsCount = students.filter(s => s.class === exam.selectedClass).length;
              const subjectCount = getExamSubjectBreakdown(exam).length;
              const isApplied = !!exam.answerSheetsGeneratedAt || stats.submissions > 0;
              const actionClass = 'flex-col h-auto py-2 gap-1 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm hover:bg-white';

              return (
                <div
                  key={exam.id}
                  className={`flex flex-col rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-500 ${
                    exam.hidden ? 'opacity-75 hover:opacity-100 border-dashed ' : ''
                  }${
                    highlightedExamId === exam.id
                      ? 'border-green-400 ring-4 ring-green-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Cabeçalho */}
                  <div className="p-4 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800 leading-snug">{exam.title}</h3>
                        {isApplied && (
                          <Badge
                            className="bg-green-100 text-green-700 hover:bg-green-100 gap-1"
                            title={exam.answerSheetsGeneratedAt ? `Cartões gerados em ${formatDate(exam.answerSheetsGeneratedAt)}` : 'Já possui aplicações'}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Aplicado
                          </Badge>
                        )}
                        {exam.hidden && (
                          <Badge variant="outline" className="gap-1 text-slate-500">
                            <EyeOff className="w-3 h-3" />
                            Oculto
                          </Badge>
                        )}
                        {highlightedExamId === exam.id && (
                          <Badge className="bg-green-600 text-white hover:bg-green-600">Novo</Badge>
                        )}
                      </div>
                      {exam.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{exam.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">Criado em {formatDate(exam.createdAt)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSubjectsExam(exam); setSubjectsDialogOpen(true); }}
                      className="flex-shrink-0 gap-1.5"
                      title="Ver matérias, questões e pontos"
                    >
                      <Layers className="w-4 h-4" />
                      <span className="text-xs">{subjectCount} matéria{subjectCount !== 1 ? 's' : ''}</span>
                    </Button>
                  </div>

                  {/* Turma */}
                  <div className="px-4 pb-3">
                    {exam.selectedClass ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-slate-700 truncate" title={exam.selectedClass}>
                              {exam.selectedClass}
                            </p>
                            <p className="text-xs text-slate-500">
                              {classStudentsCount} aluno{classStudentsCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClassClick(exam)}
                          className="h-7 w-7 p-0 flex-shrink-0 text-zinc-800 hover:bg-zinc-100"
                          title="Alterar turma"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClassClick(exam)}
                        className="w-full border-dashed text-slate-600"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Atribuir turma
                      </Button>
                    )}
                  </div>

                  {/* Estatísticas */}
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-100 px-3 py-2">
                      <p className="text-xs text-slate-500">Aplicações</p>
                      <p className="text-xl font-semibold text-slate-800">{stats.submissions}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 px-3 py-2">
                      <p className="text-xs text-slate-500">Média</p>
                      {stats.submissions > 0 ? (
                        <p className={`text-xl font-semibold ${
                          stats.avgScore >= 70 ? 'text-green-600' :
                          stats.avgScore >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {stats.avgScore}%
                        </p>
                      ) : (
                        <p className="text-xl font-semibold text-slate-300">-</p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-auto border-t border-slate-100 bg-slate-50/60 rounded-b-xl p-3 space-y-2">
                    {exam.hidden && (
                      <Button
                        onClick={() => setExamHidden(exam, false)}
                        disabled={hidingExamId === exam.id}
                        className="w-full bg-zinc-800 hover:bg-zinc-900 text-white transition-all duration-150 hover:shadow-md"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {hidingExamId === exam.id ? 'Reativando...' : 'Reativar simulado'}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDownloadAnswerSheet(exam)}
                      disabled={!exam.selectedClass || classStudentsCount === 0}
                      className="w-full bg-green-600 hover:bg-green-700 text-white transition-all duration-150 hover:shadow-md"
                      title={exam.selectedClass ? `Gerar ${classStudentsCount} cartões para ${exam.selectedClass}` : 'Atribua uma turma para gerar os cartões'}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      {isApplied && exam.selectedClass && classStudentsCount > 0
                        ? `Gerar cartões novamente (${classStudentsCount})`
                        : exam.selectedClass && classStudentsCount > 0
                          ? `Gerar cartões resposta (${classStudentsCount})`
                          : 'Gerar cartões resposta'}
                    </Button>
                    <div className={`grid gap-2 ${isApplied && !exam.hidden ? 'grid-cols-5' : 'grid-cols-4'}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditExam ? onEditExam(exam) : handleEditClick(exam)}
                        className={actionClass}
                      >
                        <Edit className="w-4 h-4" />
                        <span className="text-xs">Editar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setViewingExam(exam); setViewDialogOpen(true); }}
                        className={actionClass}
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">Visualizar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateExam(exam)}
                        disabled={loading}
                        className={actionClass}
                      >
                        <Copy className="w-4 h-4" />
                        <span className="text-xs">Duplicar</span>
                      </Button>
                      {isApplied && !exam.hidden && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExamHidden(exam, true)}
                          disabled={hidingExamId === exam.id}
                          className={actionClass}
                          title="Tirar da lista sem apagar. Dá para reativar depois em &quot;Mostrar ocultos&quot;."
                        >
                          <EyeOff className="w-4 h-4" />
                          <span className="text-xs">Ocultar</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingExam(exam)}
                        disabled={loading}
                        className="flex-col h-auto py-2 gap-1 text-red-600 border-red-200 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs">Excluir</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredExams.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="font-semibold text-slate-800 mb-2">
                {showHidden
                  ? 'Nenhum simulado oculto'
                  : hiddenCount > 0 && exams.length === hiddenCount
                  ? 'Todos os simulados estão ocultos'
                  : searchTerm || filterSubject !== 'all' || filterType !== 'all'
                  ? 'Nenhum simulado encontrado'
                  : 'Nenhum simulado criado ainda'
                }
              </h3>
              <p className="text-slate-600 mb-6">
                {showHidden || (hiddenCount > 0 && exams.length === hiddenCount)
                  ? 'Use "Mostrar ocultos" para ver e reativar simulados ocultos'
                  : searchTerm || filterSubject !== 'all' || filterType !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro simulado com questões do banco de questões'
                }
              </p>
              {!showHidden && exams.length === 0 && !searchTerm && filterSubject === 'all' && filterType === 'all' && onCreateExam && (
                <Button onClick={onCreateExam} className="bg-zinc-800 hover:bg-zinc-900">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Simulado
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {exams.length > 0 && (
        <Card className="border-zinc-200 bg-zinc-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <QrCode className="w-5 h-5 text-zinc-800 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-zinc-900"><Sparkles className="w-4 h-4 inline-block align-text-bottom mr-1" />Cartões Resposta Automatizados</p>
                <p className="text-sm text-zinc-900 mt-1">
                  Clique no ícone <strong>QR Code</strong> para gerar automaticamente todos os cartões resposta 
                  da turma selecionada. Os cartões virão pré-preenchidos com <strong>nome do aluno, matrícula e turma</strong>.
                  Cada cartão terá um QR Code único para identificação do estudante na correção automática.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ActionResultDialog result={actionResult} onClose={() => setActionResult(null)} />

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={!!deletingExam} onOpenChange={(open) => { if (!open && !deleteLoading) setDeletingExam(null); }}>
        <DialogContent className="sm:max-w-[420px] text-center">
          {deletingExam && (() => {
            const deleteStats = getExamStats(deletingExam.id);
            const questionsCount = deletingExam.questions?.length || 0;
            return (
              <div className="flex flex-col items-center gap-4 pt-2">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center ring-8 ring-red-50">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>

                <div className="space-y-1">
                  <DialogTitle className="text-xl text-slate-900">Excluir simulado?</DialogTitle>
                  <DialogDescription className="text-slate-500">
                    Esta ação não pode ser desfeita.
                  </DialogDescription>
                </div>

                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                  <p className="font-medium text-slate-800 break-words">{deletingExam.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {questionsCount} quest{questionsCount !== 1 ? 'ões' : 'ão'}
                    {deletingExam.selectedClass ? ` · ${deletingExam.selectedClass}` : ''}
                  </p>
                </div>

                {deleteStats.submissions > 0 && (
                  <div className="w-full flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Este simulado já tem <strong>{deleteStats.submissions}</strong> aplicaç{deleteStats.submissions !== 1 ? 'ões' : 'ão'} registrada{deleteStats.submissions !== 1 ? 's' : ''}.
                    </span>
                  </div>
                )}

                <div className="w-full grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setDeletingExam(null)}
                    disabled={deleteLoading}
                    autoFocus
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDeleteExam}
                    disabled={deleteLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteLoading ? 'Excluindo...' : 'Sim, excluir'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog de Matérias do Simulado */}
      <Dialog open={subjectsDialogOpen} onOpenChange={setSubjectsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-zinc-800" />
              Matérias
            </DialogTitle>
            {subjectsExam && <DialogDescription>{subjectsExam.title}</DialogDescription>}
          </DialogHeader>

          {subjectsExam && (() => {
            const breakdown = getExamSubjectBreakdown(subjectsExam);
            const totalQuestionsCount = breakdown.reduce((sum, s) => sum + s.questions, 0);
            const totalPoints = breakdown.reduce((sum, s) => sum + s.points, 0);
            return (
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
                  <span>Matéria</span>
                  <span className="text-right">Questões</span>
                  <span className="text-right">Pontos</span>
                </div>
                {breakdown.map((s) => (
                  <div key={s.subject} className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-4 py-2.5 text-sm border-t">
                    <span className="text-slate-800">{s.subject}</span>
                    <span className="text-right tabular-nums">{s.questions}</span>
                    <span className="text-right tabular-nums">{Number(s.points.toFixed(2))}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-4 py-2.5 text-sm border-t bg-slate-50 font-semibold">
                  <span>Total</span>
                  <span className="text-right tabular-nums">{totalQuestionsCount}</span>
                  <span className="text-right tabular-nums">{Number(totalPoints.toFixed(2))}</span>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização do Simulado */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[960px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-zinc-800" />
              {viewingExam?.title || 'Simulado'}
            </DialogTitle>
            {viewingExam?.description && (
              <DialogDescription>{viewingExam.description}</DialogDescription>
            )}
          </DialogHeader>

          {viewingExam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs">Status</p>
                  <p className="font-medium">{viewingExam.status || 'Rascunho'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs">Questões</p>
                  <p className="font-medium">{viewingExam.questions?.length || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs">Turma</p>
                  <p className="font-medium">{viewingExam.selectedClass || '-'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-slate-500 text-xs">Criado em</p>
                  <p className="font-medium">{formatDate(viewingExam.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-3">
                {(viewingExam.questions || []).map((q: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Questão {idx + 1}</Badge>
                      {q.subject && <Badge variant="outline">{q.subject}</Badge>}
                      {q.weight && q.weight !== 1 && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Peso {q.weight}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mb-2">{q.question}</p>
                    {Array.isArray(q.options) && (
                      <div className="space-y-1">
                        {q.options.map((opt: string, optIdx: number) => (
                          <div
                            key={optIdx}
                            className={`text-sm px-2 py-1 rounded ${
                              optIdx === q.correctAnswer
                                ? 'bg-green-50 text-green-800 font-medium'
                                : 'text-slate-600'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}) {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(!viewingExam.questions || viewingExam.questions.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Este simulado ainda não tem questões cadastradas.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Título */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-zinc-800" />
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
              className="bg-zinc-800 hover:bg-zinc-900"
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
              <Users className="w-5 h-5 text-teal-600" />
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
                      Nenhuma turma encontrada. Importe alunos primeiro.
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
                <div className="mt-2 p-2 bg-zinc-50 border border-zinc-200 rounded text-xs text-zinc-900">
                  <p className="font-medium">
                    <Check className="w-3.5 h-3.5 inline-block align-text-bottom mr-1" />{students.filter(s => s.class === selectedClass).length} alunos nesta turma
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
                  Nenhuma turma encontrada. Para criar turmas, importe alunos na seção 
                  <strong> Gerenciar Alunos</strong>. As turmas serão criadas automaticamente 
                  com base na coluna "TURMA" do arquivo importado.
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
              className="bg-teal-600 hover:bg-teal-700"
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