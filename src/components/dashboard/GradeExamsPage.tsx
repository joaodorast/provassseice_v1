import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { 
  CheckCircle, Clock, Search, Eye, Download, FileText, Target, TrendingUp, Award, XCircle, AlertCircle,
  Loader2, RefreshCw, GraduationCap, Star, Save, X, PieChart, Clipboard, Send, Image as ImageIcon, ZoomIn, UserX,
  Camera, Scan, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';

export function GradeExamsPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [applications, setApplications] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('all');
  const [filterApplication, setFilterApplication] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCorrectionType, setFilterCorrectionType] = useState('all');
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [answerSheetImages, setAnswerSheetImages] = useState([]);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    loadDataProgressively();
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const appId = urlParams.get('app');
    const examId = urlParams.get('exam');
    if (appId) setFilterApplication(appId);
    else if (examId) setFilterExam(examId);
  }, []);

  const calculateSubjectPerformances = (studentAnswers, correctAnswers, questionWeights) => {
    const performanceBySubject = {};
    questionWeights.forEach((qw, idx) => {
      const subject = qw.subject;
      if (!performanceBySubject[subject]) performanceBySubject[subject] = { correct: 0, total: 0 };
      performanceBySubject[subject].total += 1;
      if (studentAnswers[idx] === correctAnswers[idx]) performanceBySubject[subject].correct += 1;
    });
    return Object.entries(performanceBySubject).map(([subject, data]) => ({
      subject, totalQuestions: data.total, correctAnswers: data.correct,
      percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
    }));
  };

  const transformSubmissions = (rawSubmissions, examsList) => {
    return rawSubmissions.map(sub => {
      const exam = examsList.find(e => e.id === sub.examId);
      const correctAnswers = exam?.questions?.map((q) => q.correctAnswer) || sub.correctAnswers || [];
      const questionWeights = exam?.questions?.map((q, idx) => ({
        questionIndex: idx, weight: q.weight || 1, subject: q.subject || 'Geral'
      })) || sub.questionWeights || [];
      
      const subjectPerformances = sub.subjectPerformances && sub.subjectPerformances.length > 0
        ? sub.subjectPerformances
        : calculateSubjectPerformances(sub.answers || [], correctAnswers, questionWeights);
      
      return {
        id: sub.id,
        examId: sub.examId,
        examTitle: sub.examTitle || exam?.title || 'Simulado',
        studentId: sub.studentId,
        studentName: sub.studentName,
        studentEmail: sub.studentEmail,
        studentClass: sub.studentClass,
        studentGrade: sub.studentGrade,
        answers: sub.answers || [],
        correctAnswers,
        score: sub.score || 0,
        totalQuestions: sub.totalQuestions || correctAnswers.length,
        percentage: sub.percentage || 0,
        subjectPerformances,
        timeSpent: sub.timeSpent || 0,
        submittedAt: sub.submittedAt || new Date().toISOString(),
        gradingStatus: sub.gradingStatus || 'graded',
        feedback: sub.feedback,
        reviewNotes: sub.reviewNotes,
        questionWeights,
        applicationId: sub.applicationId,
        correctionType: sub.correctionType
      };
    });
  };

  const createNotSubmittedEntry = (student, exam, applicationId) => {
    const correctAnswers = exam.questions?.map((q) => q.correctAnswer) || [];
    const questionWeights = exam.questions?.map((q, idx) => ({
      questionIndex: idx, weight: q.weight || 1, subject: q.subject || 'Geral'
    })) || [];
    return {
      id: `not-submitted-${applicationId}-${student.id}`,
      examId: exam.id,
      examTitle: exam.title,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      studentClass: student.class,
      studentGrade: student.grade,
      answers: [],
      correctAnswers,
      score: 0,
      totalQuestions: correctAnswers.length,
      percentage: 0,
      subjectPerformances: [],
      timeSpent: 0,
      submittedAt: new Date().toISOString(),
      gradingStatus: 'not_submitted',
      questionWeights,
      applicationId
    };
  };

  const loadDataProgressively = async () => {
    try {
      setLoading(true);
      let examsList = [];
      
      try {
        console.log('=== GradePage: Loading exams ===');
        const examsRes = await apiService.getExams();
        examsList = (examsRes.exams || []).filter((e) => e && e.id && e.title);
        console.log(`✓ Loaded ${examsList.length} exams for grading`);
        setExams(examsList);
      } catch (error) {
        console.error('Error loading exams:', error);
        setExams([]);
        toast.error('Erro ao carregar simulados');
      }

      let studentsList = [];
      try {
        console.log('=== GradePage: Loading students ===');
        const studentsRes = await apiService.getStudents();
        studentsList = (studentsRes.students || []).filter((s) => s && s.id);
        console.log(`✓ Loaded ${studentsList.length} students`);
        setStudents(studentsList);
      } catch (error) {
        console.error('Error loading students:', error);
        setStudents([]);
      }
      
      let applicationsList = [];
      try {
        console.log('=== GradePage: Loading applications ===');
        const applicationsRes = await apiService.getApplications();
        applicationsList = (applicationsRes.applications || []).filter((a) => a && a.id);
        console.log(`✓ Loaded ${applicationsList.length} applications`);
        setApplications(applicationsList);
      } catch (error) {
        console.error('Error loading applications:', error);
        setApplications([]);
      }
      
      try {
        console.log('=== GradePage: Loading submissions ===');
        const submissionsRes = await apiService.getSubmissions();
        const realSubmissionsList = (submissionsRes.submissions || []).filter((s) => s && s.id);
        console.log(`✓ Loaded ${realSubmissionsList.length} submissions from API`);
        
        const imageSubmissions = realSubmissionsList.filter(
          (s) => s.correctionType === 'manual-image' || s.correctionType === 'manual-image-batch'
        );
        console.log(`✓ Found ${imageSubmissions.length} answer sheet submissions`);
        
        const transformedSubmissions = transformSubmissions(realSubmissionsList, examsList);
        const notSubmittedEntries = [];
        
        applicationsList.forEach(app => {
          const exam = examsList.find(e => e.id === app.examId);
          if (!exam) return;
          
          app.studentIds.forEach(studentId => {
            const student = studentsList.find(s => s.id === studentId);
            if (!student) return;
            
            const hasSubmission = realSubmissionsList.some(
              (sub) => sub.studentId === studentId && sub.examId === app.examId
            );
            
            if (!hasSubmission) {
              notSubmittedEntries.push(createNotSubmittedEntry(student, exam, app.id));
            }
          });
        });
        
        const allSubmissions = [...transformedSubmissions, ...notSubmittedEntries];
        setSubmissions(allSubmissions);
        console.log(`✓ Total submissions: ${allSubmissions.length}`);
        
        if (imageSubmissions.length > 0) {
          toast.success(`✅ ${imageSubmissions.length} correção(ões) de cartão resposta carregadas!`);
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
        setSubmissions([]);
        toast.error('Erro ao carregar submissões');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getGradingStats = () => {
    const totalSubmissions = submissions.length;
    const actualSubmissions = submissions.filter(s => s.gradingStatus !== 'not_submitted');
    const notSubmitted = submissions.filter(s => s.gradingStatus === 'not_submitted').length;
    const gradedSubmissions = submissions.filter(s => s.gradingStatus === 'graded').length;
    const reviewedSubmissions = submissions.filter(s => s.gradingStatus === 'reviewed').length;
    const imageCorrections = submissions.filter(s => 
      s.correctionType === 'manual-image' || s.correctionType === 'manual-image-batch'
    ).length;
    const avgScore = actualSubmissions.length > 0 
      ? Math.round(actualSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) / actualSubmissions.length) : 0;
    const passRate = actualSubmissions.length > 0
      ? Math.round((actualSubmissions.filter(s => s.percentage >= 60).length / actualSubmissions.length) * 100) : 0;
    return { 
      totalSubmissions, gradedSubmissions, reviewedSubmissions, avgScore, passRate, 
      notSubmitted, actualSubmissions: actualSubmissions.length, imageCorrections 
    };
  };

  const stats = getGradingStats();

  const generateExcelExport = (submissionsList, type = 'all', subject = null) => {
    // Filtrar apenas submissões reais (não "não realizados")
    const validSubmissions = submissionsList.filter(s => s.gradingStatus !== 'not_submitted');
    
    if (validSubmissions.length === 0) {
      toast.error('Nenhuma submissão válida para exportar');
      return null;
    }

    // Organizar por matéria
    const bySubject = {};
    
    validSubmissions.forEach(submission => {
      submission.subjectPerformances.forEach(subj => {
        if (!bySubject[subj.subject]) {
          bySubject[subj.subject] = [];
        }
        bySubject[subj.subject].push({
          aluno: submission.studentName,
          turma: submission.studentClass,
          acertos: subj.correctAnswers,
          total: subj.totalQuestions,
          percentual: subj.percentage,
          notaGeral: submission.percentage
        });
      });
    });

    const generateCSV = (data, subjectName) => {
      let csv = `Matéria: ${subjectName}\n`;
      csv += `Total de Alunos: ${data.length}\n`;
      csv += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
      csv += 'Aluno,Turma,Acertos,Total,Percentual\n';
      
      data.forEach(row => {
        csv += `"${row.aluno}","${row.turma}",${row.acertos},${row.total},${row.percentual}%\n`;
      });
      
      // Adicionar estatísticas
      const avgPercentage = Math.round(data.reduce((sum, row) => sum + row.percentual, 0) / data.length);
      csv += `\nMédia da Turma,,,${avgPercentage}%\n`;
      
      return csv;
    };

    if (type === 'all') {
      // Planilha geral
      let csv = `RELATÓRIO GERAL DE CORREÇÕES\n`;
      csv += `Total de Alunos: ${validSubmissions.length}\n`;
      csv += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
      csv += 'Aluno,Turma,Simulado,Nota,Percentual,Tipo de Correção\n';
      
      validSubmissions.forEach(sub => {
        const correctionType = sub.correctionType === 'manual-image' ? 'Cartão Individual' :
                              sub.correctionType === 'manual-image-batch' ? 'Cartão Lote' : 'Online';
        csv += `"${sub.studentName}","${sub.studentClass}","${sub.examTitle}",${sub.score}/${sub.totalQuestions},${sub.percentage}%,"${correctionType}"\n`;
      });
      
      csv += `\n\nDETALHAMENTO POR MATÉRIA\n\n`;
      
      Object.entries(bySubject).forEach(([subjectName, data]) => {
        csv += `\n${subjectName}\n`;
        csv += 'Aluno,Turma,Acertos,Total,Percentual,Nota Geral\n';
        data.forEach(row => {
          csv += `"${row.aluno}","${row.turma}",${row.acertos},${row.total},${row.percentual}%,${row.notaGeral}%\n`;
        });
        const avgPercentage = Math.round(data.reduce((sum, row) => sum + row.percentual, 0) / data.length);
        csv += `Média da Matéria,,,,${avgPercentage}%\n`;
      });
      
      return csv;
    } else if (type === 'subject' && subject) {
      // Planilha específica de matéria
      if (!bySubject[subject]) {
        toast.error(`Matéria "${subject}" não encontrada`);
        return null;
      }
      return generateCSV(bySubject[subject] || [], subject);
    }
    
    return null;
  };

  const downloadExcel = (content, filename, format = 'csv') => {
    if (!content) return;
    
    let blob, extension;
    
    if (format === 'xlsx') {
      // Converter CSV para formato Excel-friendly
      const rows = content.split('\n').map(row => row.split(','));
      
      // Criar HTML table para Excel
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
      html += '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
      html += '<x:Name>Relatório</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
      html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>';
      
      rows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td>${cell.replace(/"/g, '')}</td>`;
        });
        html += '</tr>';
      });
      
      html += '</table></body></html>';
      
      blob = new Blob(['\ufeff', html], { 
        type: 'application/vnd.ms-excel;charset=utf-8;' 
      });
      extension = '.xls';
    } else {
      blob = new Blob(['\ufeff', content], { 
        type: 'text/csv;charset=utf-8;' 
      });
      extension = '.csv';
    }
    
    const filenameWithExt = filename.replace(/\.(csv|xls|xlsx)$/i, '') + extension;
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filenameWithExt);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`✅ Planilha exportada: ${filenameWithExt}`);
  };

  const getUniqueSubjects = (submissionsList) => {
    const subjects = new Set();
    submissionsList.forEach(sub => {
      if (sub.gradingStatus !== 'not_submitted') {
        sub.subjectPerformances.forEach(perf => {
          subjects.add(perf.subject);
        });
      }
    });
    return Array.from(subjects).sort();
  };

  const handleExportExcel = (type, subject = null) => {
    const validSubmissions = filteredSubmissions.filter(s => s.gradingStatus !== 'not_submitted');
    
    if (validSubmissions.length === 0) {
      toast.error('Nenhuma correção disponível para exportar');
      return;
    }

    const content = generateExcelExport(validSubmissions, type, subject);
    if (!content) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    let filename;
    if (type === 'all') {
      filename = `Relatorio_Geral_${timestamp}.csv`;
    } else if (type === 'subject' && subject) {
      filename = `${subject.replace(/\s/g, '_')}_${timestamp}.csv`;
    }
    
    downloadExcel(content, filename);
  };

  const getPerformanceBadge = (percentage, status) => {
    if (status === 'not_submitted') return <Badge className="bg-gray-100 text-gray-800">Não Realizado</Badge>;
    if (percentage >= 80) return <Badge className="bg-emerald-100 text-emerald-800">Excelente</Badge>;
    else if (percentage >= 70) return <Badge className="bg-green-100 text-green-800">Muito Bom</Badge>;
    else if (percentage >= 60) return <Badge className="bg-blue-100 text-blue-800">Bom</Badge>;
    else if (percentage >= 50) return <Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>;
    else return <Badge className="bg-red-100 text-red-800">Insuficiente</Badge>;
  };

  const getGradingStatusBadge = (status) => {
    switch (status) {
      case 'not_submitted': return <Badge variant="outline" className="text-gray-600 border-gray-300">Não Submetido</Badge>;
      case 'pending': return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
      case 'graded': return <Badge variant="outline" className="text-blue-600 border-blue-300">Corrigida</Badge>;
      case 'reviewed': return <Badge variant="outline" className="text-green-600 border-green-300">Revisada</Badge>;
      default: return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getCorrectionTypeBadge = (correctionType) => {
    if (!correctionType || correctionType === 'online') {
      return <Badge variant="outline" className="text-blue-600 border-blue-300">Online</Badge>;
    }
    if (correctionType === 'manual-image') {
      return (
        <Badge variant="outline" className="text-purple-600 border-purple-300">
          <Camera className="w-3 h-3 mr-1" />
          Cartão Individual
        </Badge>
      );
    }
    if (correctionType === 'manual-image-batch') {
      return (
        <Badge variant="outline" className="text-purple-600 border-purple-300">
          <Scan className="w-3 h-3 mr-1" />
          Cartão Lote
        </Badge>
      );
    }
    return <Badge variant="outline">{correctionType}</Badge>;
  };

  const handleBulkExport = async () => {
    if (selectedSubmissions.length === 0) {
      toast.error('Selecione pelo menos uma submissão para exportar');
      return;
    }
    try {
      const selectedData = submissions.filter(s => selectedSubmissions.includes(s.id));
      const dataStr = JSON.stringify(selectedData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `resultados-${Date.now()}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success(`${selectedSubmissions.length} resultado(s) exportado(s) com sucesso!`);
      setSelectedSubmissions([]);
    } catch (error) {
      console.error('Error exporting bulk results:', error);
      toast.error('Erro ao exportar resultados');
    }
  };

  const handleSelectSubmission = (submissionId, checked) => {
    if (checked) setSelectedSubmissions(prev => [...prev, submissionId]);
    else setSelectedSubmissions(prev => prev.filter(id => id !== submissionId));
  };

  const selectAllSubmissions = () => setSelectedSubmissions(filteredSubmissions.map(s => s.id));
  const clearAllSubmissions = () => setSelectedSubmissions([]);

  const handleReviewSubmission = async (submission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.reviewNotes || '');
    setFeedback(submission.feedback || '');
    
    if (submission.gradingStatus === 'not_submitted') {
      setAnswerSheetImages([]);
      return;
    }
    
    try {
      const response = await apiService.getAnswerSheets(submission.id);
      if (response.success && response.images) {
        setAnswerSheetImages(response.images);
      } else {
        setAnswerSheetImages([]);
      }
    } catch (error) {
      console.error('Error loading answer sheets:', error);
      setAnswerSheetImages([]);
    }
  };

  const handleUploadAnswerSheet = async (event) => {
    if (!selectedSubmission) return;
    
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }
    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result;
        try {
          const response = await apiService.uploadAnswerSheet(
            selectedSubmission.id, 
            base64Data, 
            file.name, 
            selectedSubmission.studentName, 
            selectedSubmission.examId
          );
          if (response.success && response.image) {
            setAnswerSheetImages(prev => [...prev, response.image]);
            toast.success('✅ Imagem do cartão resposta enviada com sucesso!');
          } else throw new Error(response.error || 'Failed to upload image');
        } catch (error) {
          console.error('Error uploading answer sheet:', error);
          toast.error('Erro ao enviar imagem');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar arquivo');
      setUploadingImage(false);
    }
  };

  const handleDeleteAnswerSheet = async (imageId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta imagem?')) return;
    try {
      const response = await apiService.deleteAnswerSheet(imageId);
      if (response.success) {
        setAnswerSheetImages(prev => prev.filter(img => img.id !== imageId));
        toast.success('Imagem excluída com sucesso!');
      } else throw new Error(response.error || 'Failed to delete image');
    } catch (error) {
      console.error('Error deleting answer sheet:', error);
      toast.error('Erro ao excluir imagem');
    }
  };

  const handleSaveReview = async () => {
    if (!selectedSubmission) return;
    
    if (selectedSubmission.gradingStatus === 'not_submitted') {
      toast.error('Não é possível revisar uma submissão não realizada');
      return;
    }
    
    try {
      setReviewing(true);
      const response = await apiService.updateSubmissionReview(selectedSubmission.id, {
        reviewNotes, feedback, gradingStatus: 'reviewed'
      });
      if (response.success) {
        setSubmissions(prev => prev.map(sub => sub.id === selectedSubmission.id ? 
          { ...sub, reviewNotes, feedback, gradingStatus: 'reviewed' } : sub
        ));
        setSelectedSubmission(null);
        toast.success('✅ Revisão salva com sucesso!');
      } else throw new Error('Failed to save review');
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Erro ao salvar revisão');
    } finally {
      setReviewing(false);
    }
  };

  const handleExportIndividual = async (submission) => {
    try {
      const dataStr = JSON.stringify(submission, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `resultado-${submission.studentName.replace(/\s/g, '-')}-${Date.now()}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success('Resultado individual exportado!');
    } catch (error) {
      console.error('Error exporting individual result:', error);
      toast.error('Erro ao exportar resultado');
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.examTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = filterExam === 'all' || submission.examId === filterExam;
    const matchesApp = filterApplication === 'all' || submission.applicationId === filterApplication;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'not-submitted' && submission.gradingStatus === 'not_submitted') ||
                         (filterStatus === 'excellent' && submission.percentage >= 80 && submission.gradingStatus !== 'not_submitted') ||
                         (filterStatus === 'very-good' && submission.percentage >= 70 && submission.percentage < 80) ||
                         (filterStatus === 'good' && submission.percentage >= 60 && submission.percentage < 70) ||
                         (filterStatus === 'regular' && submission.percentage >= 50 && submission.percentage < 60) ||
                         (filterStatus === 'insufficient' && submission.percentage < 50 && submission.gradingStatus !== 'not_submitted');
    const matchesCorrectionType = filterCorrectionType === 'all' ||
                                 (filterCorrectionType === 'online' && (!submission.correctionType || submission.correctionType === 'online')) ||
                                 (filterCorrectionType === 'manual-image' && submission.correctionType === 'manual-image') ||
                                 (filterCorrectionType === 'manual-image-batch' && submission.correctionType === 'manual-image-batch');
    return matchesSearch && matchesExam && matchesApp && matchesStatus && matchesCorrectionType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm text-muted-foreground">Carregando dados de correção...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Correção de Simulados</h1>
          <p className="text-muted-foreground">
            Analise os resultados e performance dos alunos nos simulados
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ {submissions.length} submissões totais
            </Badge>
            {stats.imageCorrections > 0 && (
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                <Camera className="w-3 h-3 mr-1" />
                {stats.imageCorrections} correção(ões) de cartão resposta
              </Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadDataProgressively}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowExportDialog(true)}
            disabled={filteredSubmissions.filter(s => s.gradingStatus !== 'not_submitted').length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissões
            {submissions.length > 0 && <Badge variant="secondary" className="ml-2">{submissions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analysis">Análise Detalhada</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                <p className="text-xs text-muted-foreground">Registros totais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Realizados</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.actualSubmissions}</div>
                <p className="text-xs text-muted-foreground">Simulados feitos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cartão Resposta</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.imageCorrections}</div>
                <p className="text-xs text-muted-foreground">Correções manuais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Não Realizados</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.notSubmitted}</div>
                <p className="text-xs text-muted-foreground">Faltantes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revisadas</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reviewedSubmissions}</div>
                <p className="text-xs text-muted-foreground">Análise manual</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgScore}%</div>
                <p className="text-xs text-muted-foreground">Dos realizados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.passRate}%</div>
                <p className="text-xs text-muted-foreground">≥ 60%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Performance</CardTitle>
              <CardDescription>
                Análise da performance dos alunos por faixa de pontuação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3">
                    <UserX className="w-8 h-8 text-gray-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-600">
                    {submissions.filter(s => s.gradingStatus === 'not_submitted').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Não Realizado</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-3">
                    <Star className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {submissions.filter(s => s.percentage >= 80 && s.gradingStatus !== 'not_submitted').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Excelente (≥80%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.percentage >= 70 && s.percentage < 80 && s.gradingStatus !== 'not_submitted').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Muito Bom (70-79%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3">
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {submissions.filter(s => s.percentage >= 60 && s.percentage < 70 && s.gradingStatus !== 'not_submitted').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Bom (60-69%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-3">
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {submissions.filter(s => s.percentage >= 50 && s.percentage < 60 && s.gradingStatus !== 'not_submitted').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Regular (50-59%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-3">   
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {submissions.filter(s => s.percentage < 50 && s.gradingStatus !== 'not_submitted').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Insuficiente (&lt;50%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submissões dos Alunos</CardTitle>
              <CardDescription>
                Todas as submissões incluindo correções de cartão resposta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 mb-6">
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por aluno ou simulado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterCorrectionType} onValueChange={setFilterCorrectionType}>
                    <SelectTrigger className="w-full md:w-52">
                      <SelectValue placeholder="Tipo de correção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="manual-image">Cartão Individual</SelectItem>
                      <SelectItem value="manual-image-batch">Cartão Lote</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Performance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="not-submitted">Não Realizado</SelectItem>
                      <SelectItem value="excellent">Excelente (≥80%)</SelectItem>
                      <SelectItem value="very-good">Muito Bom (70-79%)</SelectItem>
                      <SelectItem value="good">Bom (60-69%)</SelectItem>
                      <SelectItem value="regular">Regular (50-59%)</SelectItem>
                      <SelectItem value="insufficient">Insuficiente (&lt;50%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSubmissions.length > 0 && (
                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg mb-6">
                  <span className="text-sm text-blue-800 font-medium">
                    {selectedSubmissions.length} submissão(ões) selecionada(s)
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleBulkExport}>
                      <Download className="w-4 h-4 mr-1" />
                      Exportar
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllSubmissions}>
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSubmissions.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                          onCheckedChange={(checked) => 
                            checked ? selectAllSubmissions() : clearAllSubmissions()
                          }
                        />
                      </TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Simulado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Pontuação</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">Nenhuma submissão encontrada</h3>
                          <p className="text-muted-foreground">Ajuste os filtros ou aguarde submissões</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <TableRow 
                          key={submission.id} 
                          className={
                            submission.gradingStatus === 'not_submitted' ? 'bg-gray-50' : 
                            (submission.correctionType === 'manual-image' || submission.correctionType === 'manual-image-batch') ? 'bg-purple-50' : 
                            ''
                          }
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedSubmissions.includes(submission.id)}
                              onCheckedChange={(checked) => 
                                handleSelectSubmission(submission.id, checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{submission.studentName}</div>
                              <div className="text-sm text-muted-foreground">
                                {submission.studentClass}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{submission.examTitle}</div>
                          </TableCell>
                          <TableCell>
                            {getCorrectionTypeBadge(submission.correctionType)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {submission.gradingStatus === 'not_submitted' ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              formatDate(submission.submittedAt)
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.gradingStatus === 'not_submitted' ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Progress value={submission.percentage} className="h-2 w-20" />
                                <span className="text-sm font-medium">{submission.percentage}%</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getPerformanceBadge(submission.percentage, submission.gradingStatus)}
                          </TableCell>
                          <TableCell>
                            {getGradingStatusBadge(submission.gradingStatus)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReviewSubmission(submission)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleExportIndividual(submission)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada</CardTitle>
              <CardDescription>Funcionalidades avançadas em desenvolvimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Em Breve</h3>
                <p className="text-muted-foreground">Análises detalhadas por matéria e turma</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Exportação Excel */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Exportar Planilhas Excel
            </DialogTitle>
            <DialogDescription>
              Escolha o tipo de relatório que deseja exportar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">Relatório Geral</h4>
                    <p className="text-sm text-green-800 mt-1">
                      Inclui todas as matérias com detalhamento completo
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      handleExportExcel('all');
                      setShowExportDialog(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Separator />

            <div>
              <h4 className="font-medium text-slate-900 mb-3">Exportar por Matéria</h4>
              <div className="grid grid-cols-2 gap-3">
                {getUniqueSubjects(filteredSubmissions).map(subject => (
                  <Card key={subject} className="border-2 hover:border-blue-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{subject}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleExportExcel('subject', subject);
                            setShowExportDialog(false);
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {getUniqueSubjects(filteredSubmissions).length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma matéria disponível para exportação
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Revisão de Submissão */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  {selectedSubmission.studentName}
                  {getCorrectionTypeBadge(selectedSubmission.correctionType)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const content = generateExcelExport([selectedSubmission], 'all');
                    if (content) {
                      const timestamp = new Date().toISOString().split('T')[0];
                      const filename = `${selectedSubmission.studentName.replace(/\s/g, '_')}_${timestamp}.csv`;
                      downloadExcel(content, filename);
                    }
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </DialogTitle>
              <DialogDescription>{selectedSubmission.examTitle}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedSubmission.gradingStatus === 'not_submitted' ? (
                <div className="text-center py-12">
                  <UserX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">Não Realizado</h3>
                  <p className="text-muted-foreground">Este aluno não realizou o simulado</p>
                </div>
              ) : (
                <>
                  {(selectedSubmission.correctionType === 'manual-image' || selectedSubmission.correctionType === 'manual-image-batch') && (
                    <Card className="border-purple-200 bg-purple-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Camera className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-purple-900">Correção de Cartão Resposta</p>
                            <p className="text-sm text-purple-800">
                              Corrigido manualmente através de imagem
                              {selectedSubmission.correctionType === 'manual-image-batch' && ' (lote)'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-4 gap-4">
                    <Card className="p-4">
                      <Label className="text-sm">Pontuação</Label>
                      <p className="text-2xl font-bold">{selectedSubmission.score}/{selectedSubmission.totalQuestions}</p>
                    </Card>
                    <Card className="p-4">
                      <Label className="text-sm">Percentual</Label>
                      <p className="text-2xl font-bold">{selectedSubmission.percentage}%</p>
                    </Card>
                    <Card className="p-4">
                      <Label className="text-sm">Tempo</Label>
                      <p className="text-2xl font-bold">{selectedSubmission.timeSpent}min</p>
                    </Card>
                    <Card className="p-4">
                      <Label className="text-sm">Performance</Label>
                      <div className="mt-1">{getPerformanceBadge(selectedSubmission.percentage, selectedSubmission.gradingStatus)}</div>
                    </Card>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Performance por Matéria</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const content = generateExcelExport([selectedSubmission], 'all');
                            if (content) {
                              const timestamp = new Date().toISOString().split('T')[0];
                              const filename = `${selectedSubmission.studentName.replace(/\s/g, '_')}_Todas_Materias_${timestamp}.csv`;
                              downloadExcel(content, filename);
                            }
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Exportar Todas
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedSubmission.subjectPerformances.map((subject) => (
                        <Card key={subject.subject} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{subject.subject}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const content = generateExcelExport([selectedSubmission], 'subject', subject.subject);
                                if (content) {
                                  const timestamp = new Date().toISOString().split('T')[0];
                                  const filename = `${selectedSubmission.studentName.replace(/\s/g, '_')}_${subject.subject.replace(/\s/g, '_')}_${timestamp}.csv`;
                                  downloadExcel(content, filename);
                                }
                              }}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="mb-2">{subject.correctAnswers}/{subject.totalQuestions}</Badge>
                          <Progress value={subject.percentage} className="h-2" />
                          <p className="text-sm text-muted-foreground mt-1">{subject.percentage}%</p>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="mb-2 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Imagens do Cartão Resposta
                    </Label>
                    <div className="flex items-center gap-4 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => document.getElementById('answer-sheet-upload')?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Imagem
                          </>
                        )}
                      </Button>
                      <input
                        id="answer-sheet-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadAnswerSheet}
                      />
                      <span className="text-sm text-muted-foreground">JPG, PNG (máx. 10MB)</span>
                    </div>

                    {answerSheetImages.length > 0 ? (
                      <div className="grid grid-cols-4 gap-4">
                        {answerSheetImages.map((image) => (
                          <div key={image.id} className="relative group">
                            <div 
                              className="aspect-square rounded-lg overflow-hidden border-2 cursor-pointer"
                              onClick={() => setSelectedImagePreview(image.signedUrl)}
                            >
                              <img 
                                src={image.signedUrl} 
                                alt={image.fileName}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              <Button variant="secondary" size="sm" onClick={() => setSelectedImagePreview(image.signedUrl)}>
                                <ZoomIn className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAnswerSheet(image.id);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{image.fileName}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Clipboard className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma imagem enviada</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="feedback">Feedback</Label>
                      <Textarea
                        id="feedback"
                        placeholder="Feedback para o aluno..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reviewNotes">Notas de Revisão</Label>
                      <Textarea
                        id="reviewNotes"
                        placeholder="Anotações internas..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setSelectedSubmission(null)}>Fechar</Button>
                    <Button onClick={handleSaveReview} disabled={reviewing}>
                      {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar Revisão
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Preview de Imagem */}
      {selectedImagePreview && (
        <Dialog open={!!selectedImagePreview} onOpenChange={() => setSelectedImagePreview(null)}>
          <DialogContent className="max-w-7xl max-h-[95vh] p-2">
            <DialogHeader>
              <DialogTitle>Preview da Imagem</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[80vh] bg-black rounded-lg overflow-hidden">
              <img src={selectedImagePreview} alt="Preview" className="w-full h-full object-contain" />
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-4 right-4" 
                onClick={() => setSelectedImagePreview(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}