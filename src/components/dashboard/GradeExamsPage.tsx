import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { 
  CheckCircle, Clock, Search, Eye, Download, FileText, Target, TrendingUp, Award, XCircle, AlertCircle,
  Loader2, RefreshCw, GraduationCap, Star, Save, X, PieChart, Clipboard, Send, Image as ImageIcon, ZoomIn, UserX
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';

type GradingStatus = 'pending' | 'graded' | 'reviewed' | 'not_submitted';
type SubjectPerformance = { subject: string; totalQuestions: number; correctAnswers: number; percentage: number };
type QuestionWeight = { questionIndex: number; weight: number; subject: string };
type DetailedSubmission = {
  id: string; examId: string; examTitle: string; studentId: string; studentName: string; studentEmail: string;
  studentClass: string; studentGrade: string; answers: number[]; correctAnswers: number[]; score: number;
  totalQuestions: number; percentage: number; subjectPerformances: SubjectPerformance[]; timeSpent: number;
  submittedAt: string; gradingStatus: GradingStatus; feedback?: string; reviewNotes?: string;
  questionWeights?: QuestionWeight[]; applicationId?: string; isMock?: boolean;
};
type Exam = {
  id: string; title: string; description: string; questionsPerSubject: number; timeLimit: number;
  subjects: string[]; totalQuestions: number; questions: any[]; userId: string; createdAt: string;
  status: 'Rascunho' | 'Ativo' | 'Arquivado';
};
type Application = {
  id: string; examId: string; examTitle: string; studentIds: string[]; applicationMethod: string;
  status: string; createdAt: string; appliedCount: number; completedCount: number;
};
type Student = { id: string; name: string; email: string; class: string; grade: string };

// Dados mock de 3 alunos de teste
const MOCK_STUDENTS: Student[] = [
  { id: 'mock-student-1', name: 'Ana Silva Santos', email: 'ana.silva@teste.com', class: '3º Ano A', grade: 'Ensino Médio' },
  { id: 'mock-student-2', name: 'Carlos Eduardo Lima', email: 'carlos.lima@teste.com', class: '3º Ano B', grade: 'Ensino Médio' },
  { id: 'mock-student-3', name: 'Maria Fernanda Costa', email: 'maria.costa@teste.com', class: '3º Ano A', grade: 'Ensino Médio' }
];

export function GradeExamsPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<DetailedSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('all');
  const [filterApplication, setFilterApplication] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DetailedSubmission | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [answerSheetImages, setAnswerSheetImages] = useState<any[]>([]);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadDataProgressively();
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const appId = urlParams.get('app');
    const examId = urlParams.get('exam');
    if (appId) setFilterApplication(appId);
    else if (examId) setFilterExam(examId);
  }, []);

  const calculateSubjectPerformances = (studentAnswers: number[], correctAnswers: number[], questionWeights: QuestionWeight[]): SubjectPerformance[] => {
    const performanceBySubject: { [key: string]: { correct: number; total: number } } = {};
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

  const generateMockAnswers = (correctAnswers: number[], targetPercentage: number): number[] => {
    const totalQuestions = correctAnswers.length;
    const correctCount = Math.floor((targetPercentage / 100) * totalQuestions);
    const answers = [...correctAnswers];
    
    // Embaralha e troca algumas respostas para atingir a porcentagem desejada
    const wrongCount = totalQuestions - correctCount;
    const indices = Array.from({ length: totalQuestions }, (_, i) => i);
    
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    for (let i = 0; i < wrongCount; i++) {
      const wrongAnswer = (correctAnswers[indices[i]] + 1 + Math.floor(Math.random() * 3)) % 5;
      answers[indices[i]] = wrongAnswer;
    }
    
    return answers;
  };

  const createMockSubmission = (student: Student, exam: Exam, applicationId: string, targetPercentage: number): DetailedSubmission => {
    const correctAnswers = exam.questions?.map((q: any) => q.correctAnswer) || [];
    const questionWeights = exam.questions?.map((q: any, idx: number) => ({
      questionIndex: idx, weight: q.weight || 1, subject: q.subject || 'Geral'
    })) || [];
    
    const studentAnswers = generateMockAnswers(correctAnswers, targetPercentage);
    const correctCount = studentAnswers.filter((ans, idx) => ans === correctAnswers[idx]).length;
    const percentage = Math.round((correctCount / correctAnswers.length) * 100);
    const subjectPerformances = calculateSubjectPerformances(studentAnswers, correctAnswers, questionWeights);
    
    // Tempo entre 40 e 80 minutos
    const timeSpent = Math.floor(Math.random() * 40) + 40;
    
    // Data de submissão nos últimos 7 dias
    const daysAgo = Math.floor(Math.random() * 7);
    const submittedAt = new Date();
    submittedAt.setDate(submittedAt.getDate() - daysAgo);
    submittedAt.setHours(Math.floor(Math.random() * 12) + 8); // Entre 8h e 20h
    
    return {
      id: `mock-submission-${student.id}-${exam.id}`,
      examId: exam.id,
      examTitle: exam.title,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      studentClass: student.class,
      studentGrade: student.grade,
      answers: studentAnswers,
      correctAnswers,
      score: correctCount,
      totalQuestions: correctAnswers.length,
      percentage,
      subjectPerformances,
      timeSpent,
      submittedAt: submittedAt.toISOString(),
      gradingStatus: 'graded',
      questionWeights,
      applicationId,
      isMock: true
    };
  };

  const transformSubmissions = (rawSubmissions: any[], examsList: Exam[]): DetailedSubmission[] => {
    return rawSubmissions.map(sub => {
      const exam = examsList.find(e => e.id === sub.examId);
      const correctAnswers = exam?.questions?.map((q: any) => q.correctAnswer) || [];
      const questionWeights = exam?.questions?.map((q: any, idx: number) => ({
        questionIndex: idx, weight: q.weight || 1, subject: q.subject || 'Geral'
      })) || [];
      const subjectPerformances = calculateSubjectPerformances(sub.answers || [], correctAnswers, questionWeights);
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
        gradingStatus: sub.gradingStatus || 'graded' as GradingStatus,
        feedback: sub.feedback,
        reviewNotes: sub.reviewNotes,
        questionWeights,
        applicationId: sub.applicationId,
        isMock: false
      };
    });
  };

  const createNotSubmittedEntry = (student: Student, exam: Exam, applicationId: string): DetailedSubmission => {
    const correctAnswers = exam.questions?.map((q: any) => q.correctAnswer) || [];
    const questionWeights = exam.questions?.map((q: any, idx: number) => ({
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
      applicationId,
      isMock: false
    };
  };

  const loadDataProgressively = async () => {
    try {
      setLoading(true);
      let examsList: Exam[] = [];
      
      try {
        console.log('=== GradePage: Loading exams ===');
        const examsRes = await apiService.getExams();
        examsList = (examsRes.exams || []).filter((e: any) => e && e.id && e.title);
        console.log(`✓ Loaded ${examsList.length} exams for grading`);
        setExams(examsList);
      } catch (error) {
        console.error('Error loading exams:', error);
        setExams([]);
        toast.error('Erro ao carregar simulados');
      }

      let studentsList: Student[] = [];
      try {
        console.log('=== GradePage: Loading students ===');
        const studentsRes = await apiService.getStudents();
        const realStudents = (studentsRes.students || []).filter((s: any) => s && s.id);
        
        // Combina alunos reais com alunos mock
        studentsList = [...realStudents, ...MOCK_STUDENTS];
        console.log(`✓ Loaded ${realStudents.length} real students + ${MOCK_STUDENTS.length} mock students = ${studentsList.length} total`);
        setStudents(studentsList);
      } catch (error) {
        console.error('Error loading students:', error);
        // Se falhar, usa apenas os mock
        studentsList = MOCK_STUDENTS;
        setStudents(MOCK_STUDENTS);
        console.log(`✓ Using ${MOCK_STUDENTS.length} mock students only`);
      }
      
      let applicationsList: Application[] = [];
      try {
        console.log('=== GradePage: Loading applications ===');
        const applicationsRes = await apiService.getApplications();
        applicationsList = (applicationsRes.applications || []).filter((a: any) => a && a.id);
        console.log(`✓ Loaded ${applicationsList.length} applications`);
        setApplications(applicationsList);
      } catch (error) {
        console.error('Error loading applications:', error);
        setApplications([]);
      }
      
      try {
        console.log('=== GradePage: Loading submissions ===');
        const submissionsRes = await apiService.getSubmissions();
        const realSubmissionsList = (submissionsRes.submissions || []).filter((s: any) => s && s.id);
        console.log(`✓ Loaded ${realSubmissionsList.length} real submissions`);
        
        const transformedSubmissions = transformSubmissions(realSubmissionsList, examsList);
        const mockSubmissions: DetailedSubmission[] = [];
        const notSubmittedEntries: DetailedSubmission[] = [];
        
        // Cria submissões mock para os 3 alunos de teste
        if (examsList.length > 0) {
          const firstExam = examsList[0];
          const firstAppId = applicationsList.length > 0 ? applicationsList[0].id : 'mock-app-1';
          
          // Percentagens aleatórias entre 70% e 95%
          const percentages = [
            Math.floor(Math.random() * 26) + 70, // 70-95%
            Math.floor(Math.random() * 26) + 70, // 70-95%
            Math.floor(Math.random() * 26) + 70  // 70-95%
          ];
          
          MOCK_STUDENTS.forEach((mockStudent, index) => {
            // Verifica se já existe submissão real para esse aluno
            const hasRealSubmission = realSubmissionsList.some(
              sub => sub.studentId === mockStudent.id && sub.examId === firstExam.id
            );
            
            if (!hasRealSubmission) {
              mockSubmissions.push(
                createMockSubmission(mockStudent, firstExam, firstAppId, percentages[index])
              );
            }
          });
          
          console.log(`✓ Created ${mockSubmissions.length} mock submissions with 70%+ scores`);
        }
        
        // Cria entradas de "não submetido" para alunos reais que não fizeram
        applicationsList.forEach(app => {
          const exam = examsList.find(e => e.id === app.examId);
          if (!exam) return;
          
          app.studentIds.forEach(studentId => {
            const student = studentsList.find(s => s.id === studentId);
            if (!student) return;
            
            // Pula se for aluno mock (eles já têm submissões)
            if (MOCK_STUDENTS.some(m => m.id === studentId)) return;
            
            const hasSubmission = [...realSubmissionsList, ...mockSubmissions].some(
              sub => sub.studentId === studentId && sub.examId === app.examId
            );
            
            if (!hasSubmission) {
              notSubmittedEntries.push(createNotSubmittedEntry(student, exam, app.id));
            }
          });
        });
        
        console.log(`✓ Created ${notSubmittedEntries.length} not-submitted entries`);
        
        const allSubmissions = [...transformedSubmissions, ...mockSubmissions, ...notSubmittedEntries];
        setSubmissions(allSubmissions);
        console.log(`✓ Total submissions: ${allSubmissions.length} (${realSubmissionsList.length} real + ${mockSubmissions.length} mock + ${notSubmittedEntries.length} not submitted)`);
        
        if (mockSubmissions.length > 0) {
          toast.success(`✅ Sistema carregado com ${mockSubmissions.length} alunos de teste (70%+ de acerto)`);
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

  const formatDate = (dateString: string) => {
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
    const avgScore = actualSubmissions.length > 0 
      ? Math.round(actualSubmissions.reduce((sum, sub) => sum + sub.percentage, 0) / actualSubmissions.length) : 0;
    const passRate = actualSubmissions.length > 0
      ? Math.round((actualSubmissions.filter(s => s.percentage >= 60).length / actualSubmissions.length) * 100) : 0;
    return { totalSubmissions, gradedSubmissions, reviewedSubmissions, avgScore, passRate, notSubmitted, actualSubmissions: actualSubmissions.length };
  };

  const stats = getGradingStats();

  const getPerformanceBadge = (percentage: number, status: GradingStatus) => {
    if (status === 'not_submitted') return <Badge className="bg-gray-100 text-gray-800">Não Realizado</Badge>;
    if (percentage >= 80) return <Badge className="bg-emerald-100 text-emerald-800">Excelente</Badge>;
    else if (percentage >= 70) return <Badge className="bg-green-100 text-green-800">Muito Bom</Badge>;
    else if (percentage >= 60) return <Badge className="bg-blue-100 text-blue-800">Bom</Badge>;
    else if (percentage >= 50) return <Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>;
    else return <Badge className="bg-red-100 text-red-800">Insuficiente</Badge>;
  };

  const getGradingStatusBadge = (status: GradingStatus) => {
    switch (status) {
      case 'not_submitted': return <Badge variant="outline" className="text-gray-600 border-gray-300">Não Submetido</Badge>;
      case 'pending': return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
      case 'graded': return <Badge variant="outline" className="text-blue-600 border-blue-300">Corrigida</Badge>;
      case 'reviewed': return <Badge variant="outline" className="text-green-600 border-green-300">Revisada</Badge>;
      default: return <Badge variant="outline">Desconhecido</Badge>;
    }
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

  const handleSelectSubmission = (submissionId: string, checked: boolean) => {
    if (checked) setSelectedSubmissions(prev => [...prev, submissionId]);
    else setSelectedSubmissions(prev => prev.filter(id => id !== submissionId));
  };

  const selectAllSubmissions = () => setSelectedSubmissions(filteredSubmissions.map(s => s.id));
  const clearAllSubmissions = () => setSelectedSubmissions([]);

  const handleReviewSubmission = async (submission: DetailedSubmission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.reviewNotes || '');
    setFeedback(submission.feedback || '');
    
    if (submission.gradingStatus === 'not_submitted') {
      setAnswerSheetImages([]);
      return;
    }
    
    // Para submissões mock, não tenta carregar imagens reais
    if (submission.isMock) {
      setAnswerSheetImages([]);
      return;
    }
    
    try {
      const response = await apiService.getAnswerSheets(submission.id);
      if (response.success && response.images) setAnswerSheetImages(response.images);
      else setAnswerSheetImages([]);
    } catch (error) {
      console.error('Error loading answer sheets:', error);
      setAnswerSheetImages([]);
    }
  };

  const handleUploadAnswerSheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSubmission) return;
    
    if (selectedSubmission.isMock) {
      toast.error('Não é possível fazer upload para submissões de teste');
      return;
    }
    
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
        const base64Data = e.target?.result as string;
        try {
          const response = await apiService.uploadAnswerSheet(selectedSubmission.id, base64Data, file.name, selectedSubmission.studentName, selectedSubmission.examId);
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

  const handleDeleteAnswerSheet = async (imageId: string) => {
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
    
    // Para submissões mock, apenas atualiza localmente
    if (selectedSubmission.isMock) {
      setSubmissions(prev => prev.map(sub => sub.id === selectedSubmission.id ? 
        { ...sub, reviewNotes, feedback, gradingStatus: 'reviewed' as GradingStatus } : sub
      ));
      setSelectedSubmission(null);
      toast.success('✅ Revisão salva localmente (aluno de teste)');
      return;
    }
    
    try {
      setReviewing(true);
      const response = await apiService.updateSubmissionReview(selectedSubmission.id, {
        reviewNotes, feedback, gradingStatus: 'reviewed'
      });
      if (response.success) {
        setSubmissions(prev => prev.map(sub => sub.id === selectedSubmission.id ? 
          { ...sub, reviewNotes, feedback, gradingStatus: 'reviewed' as GradingStatus } : sub
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

  const handleExportIndividual = async (submission: DetailedSubmission) => {
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
    return matchesSearch && matchesExam && matchesApp && matchesStatus;
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
            Analise os resultados e performance dos alunos nos simulados multidisciplinares
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Sistema integrado com dados reais + 3 alunos de teste
            </Badge>
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              {submissions.filter(s => s.isMock).length} submissões de teste (70%+ acerto)
            </Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadDataProgressively}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleBulkExport} disabled={selectedSubmissions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Selecionados
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
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
                Análise da performance dos alunos por faixa de pontuação (excluindo não realizados)
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
                Gerencie e analise todas as submissões de simulados (incluindo alunos de teste e não realizados)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-6">
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
                <Select value={filterApplication} onValueChange={setFilterApplication}>
                  <SelectTrigger className="w-full md:w-56">
                    <SelectValue placeholder="Filtrar por aplicação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as aplicações</SelectItem>
                    {applications.map(app => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.examTitle} ({formatDate(app.createdAt)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterExam} onValueChange={setFilterExam}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filtrar por simulado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os simulados</SelectItem>
                    {exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="not-submitted">Não Realizado</SelectItem>
                    <SelectItem value="excellent">Excelente (≥80%)</SelectItem>
                    <SelectItem value="very-good">Muito Bom (70-79%)</SelectItem>
                    <SelectItem value="good">Bom (60-69%)</SelectItem>
                    <SelectItem value="regular">Regular (50-59%)</SelectItem>
                    <SelectItem value="insufficient">Insuficiente (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
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
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tempo</TableHead>
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
                          <h3 className="text-lg font-medium mb-2">
                            {searchTerm || filterExam !== 'all' || filterApplication !== 'all' || filterStatus !== 'all'
                              ? 'Nenhuma submissão encontrada'
                              : 'Nenhuma submissão para correção'
                            }
                          </h3>
                          <p className="text-muted-foreground">
                            {searchTerm || filterExam !== 'all' || filterApplication !== 'all' || filterStatus !== 'all'
                              ? 'Tente ajustar os filtros de busca'
                              : 'As submissões aparecerão aqui conforme os alunos realizarem os simulados'
                            }
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <TableRow key={submission.id} className={submission.gradingStatus === 'not_submitted' ? 'bg-gray-50' : submission.isMock ? 'bg-blue-50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSubmissions.includes(submission.id)}
                              onCheckedChange={(checked) => 
                                handleSelectSubmission(submission.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {submission.studentName}
                                {submission.isMock && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">TESTE</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {submission.studentClass} • {submission.studentGrade}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{submission.examTitle}</div>
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
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                                <span className="text-sm">{submission.timeSpent}min</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.gradingStatus === 'not_submitted' ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="w-20">
                                  <Progress value={submission.percentage} className="h-2" />
                                </div>
                                <div className="text-sm font-medium">
                                  {submission.score}/{submission.totalQuestions}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ({submission.percentage}%)
                                </div>
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
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleReviewSubmission(submission)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Análise Detalhada - {submission.studentName}
                                      {submission.isMock && <Badge variant="outline" className="ml-2 text-blue-600">ALUNO TESTE</Badge>}
                                    </DialogTitle>
                                    <DialogDescription>
                                      {submission.gradingStatus === 'not_submitted' 
                                        ? `Aluno não realizou o simulado "${submission.examTitle}"`
                                        : `Revisão da submissão do simulado "${submission.examTitle}"`
                                      }
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  {selectedSubmission && selectedSubmission.id === submission.id && (
                                    <div className="space-y-6">
                                      {submission.gradingStatus === 'not_submitted' ? (
                                        <div className="text-center py-12">
                                          <UserX className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                          <h3 className="text-lg font-medium mb-2">Simulado Não Realizado</h3>
                                          <p className="text-muted-foreground mb-4">
                                            O aluno {submission.studentName} não realizou este simulado.
                                          </p>
                                          <div className="bg-gray-50 p-4 rounded-lg max-w-md mx-auto text-left">
                                            <p className="text-sm text-muted-foreground">
                                              <strong>Simulado:</strong> {submission.examTitle}<br />
                                              <strong>Aluno:</strong> {submission.studentName}<br />
                                              <strong>Turma:</strong> {submission.studentClass} - {submission.studentGrade}<br />
                                              <strong>Email:</strong> {submission.studentEmail}
                                            </p>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            <div>
                                              <Label className="text-sm font-medium">Pontuação</Label>
                                              <p className="text-2xl font-bold">{selectedSubmission.score}/{selectedSubmission.totalQuestions}</p>
                                            </div>
                                            <div>
                                              <Label className="text-sm font-medium">Percentual</Label>
                                              <p className="text-2xl font-bold">{selectedSubmission.percentage}%</p>
                                            </div>
                                            <div>
                                              <Label className="text-sm font-medium">Pontos com Peso</Label>
                                              <p className="text-2xl font-bold">
                                                {selectedSubmission.questionWeights?.reduce((total, qw, idx) => {
                                                  const isCorrect = selectedSubmission.answers[idx] === selectedSubmission.correctAnswers[idx];
                                                  return total + (isCorrect ? qw.weight : 0);
                                                }, 0) || 0}
                                              </p>
                                            </div>
                                            <div>
                                              <Label className="text-sm font-medium">Tempo Gasto</Label>
                                              <p className="text-2xl font-bold">{selectedSubmission.timeSpent}min</p>
                                            </div>
                                            <div>
                                              <Label className="text-sm font-medium">Performance</Label>
                                              <div className="mt-1">
                                                {getPerformanceBadge(selectedSubmission.percentage, selectedSubmission.gradingStatus)}
                                              </div>
                                            </div>
                                          </div>

                                          <Separator />

                                          {selectedSubmission.questionWeights && selectedSubmission.questionWeights.length > 0 && (
                                            <>
                                              <div>
                                                <Label className="text-sm font-medium mb-3 block">Respostas do Aluno</Label>
                                                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                                                  <Table>
                                                    <TableHeader>
                                                      <TableRow>
                                                        <TableHead className="w-24">Questão</TableHead>
                                                        <TableHead>Matéria</TableHead>
                                                        <TableHead className="w-24">Peso</TableHead>
                                                        <TableHead className="w-32">Resposta</TableHead>
                                                        <TableHead className="w-32">Gabarito</TableHead>
                                                        <TableHead className="w-32 text-center">Pontos Ganhos</TableHead>
                                                        <TableHead className="w-24 text-center">Status</TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {selectedSubmission.questionWeights.map((qw) => {
                                                        const studentAnswer = selectedSubmission.answers[qw.questionIndex];
                                                        const correctAnswer = selectedSubmission.correctAnswers[qw.questionIndex];
                                                        const isCorrect = studentAnswer === correctAnswer;
                                                        const pointsEarned = isCorrect ? qw.weight : 0;
                                                        return (
                                                          <TableRow key={qw.questionIndex}>
                                                            <TableCell className="font-medium">#{qw.questionIndex + 1}</TableCell>
                                                            <TableCell>{qw.subject}</TableCell>
                                                            <TableCell><Badge variant="outline">{qw.weight}x</Badge></TableCell>
                                                            <TableCell className="text-center">
                                                              {studentAnswer !== undefined ? (
                                                                <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                                  {String.fromCharCode(65 + studentAnswer)}
                                                                </span>
                                                              ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                              )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                              <span className="font-medium">{String.fromCharCode(65 + correctAnswer)}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                              <Badge className={isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                                {pointsEarned} pts
                                                              </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                              {isCorrect ? (
                                                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                                                              ) : (
                                                                <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                                                              )}
                                                            </TableCell>
                                                          </TableRow>
                                                        );
                                                      })}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              </div>
                                              <Separator />
                                            </>
                                          )}

                                          <div>
                                            <Label className="text-sm font-medium mb-3 block">Performance por Matéria</Label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                              {selectedSubmission.subjectPerformances.map((subject) => (
                                                <Card key={subject.subject} className="p-4">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium">{subject.subject}</h4>
                                                    <Badge variant="outline">{subject.correctAnswers}/{subject.totalQuestions}</Badge>
                                                  </div>
                                                  <Progress value={subject.percentage} className="h-2" />
                                                  <p className="text-sm text-muted-foreground mt-1">{subject.percentage}%</p>
                                                </Card>
                                              ))}
                                            </div>
                                          </div>

                                          <Separator />      

                                          <div className="space-y-4">
                                            <div>
                                              <Label className="text-sm font-medium mb-2 block flex items-center">
                                                <ImageIcon className="w-4 h-4 mr-2" />
                                                Cartões Resposta / Imagens
                                                {submission.isMock && (
                                                  <Badge variant="outline" className="ml-2 text-xs text-gray-600">Upload desabilitado para teste</Badge>
                                                )}
                                              </Label>
                                              <p className="text-sm text-muted-foreground mb-4">
                                                Faça upload das imagens dos cartões resposta escaneados ou fotos das provas
                                              </p>
                                              <div className="flex items-center gap-4 mb-4">
                                                <Button 
                                                  variant="outline" 
                                                  onClick={() => document.getElementById('answer-sheet-upload')?.click()}
                                                  disabled={uploadingImage || submission.isMock}
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
                                                  disabled={submission.isMock}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                  Formatos aceitos: JPG, PNG (máx. 10MB)
                                                </span>
                                              </div>

                                              {answerSheetImages.length > 0 && (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                  {answerSheetImages.map((image) => (
                                                    <div key={image.id} className="relative group">
                                                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 cursor-pointer"
                                                           onClick={() => setSelectedImagePreview(image.signedUrl)}>
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
                                                      <p className="text-xs text-muted-foreground">
                                                        {new Date(image.uploadedAt).toLocaleDateString('pt-BR')}
                                                      </p>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              {answerSheetImages.length === 0 && (
                                                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                                  <Clipboard className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                                  <p className="text-sm text-muted-foreground">Nenhuma imagem enviada ainda</p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {submission.isMock ? 'Upload não disponível para alunos de teste' : 'Clique no botão acima para fazer upload'}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <Separator />

                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="feedback">Feedback para o Aluno</Label>
                                              <Textarea
                                                id="feedback"
                                                placeholder="Digite o feedback que será enviado para o aluno..."
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                rows={3}
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor="reviewNotes">Notas de Revisão (interno)</Label>
                                              <Textarea
                                                id="reviewNotes"
                                                placeholder="Anotações internas sobre a performance do aluno..."
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                rows={3}
                                              />
                                            </div>
                                          </div>

                                          <div className="flex justify-end space-x-2">
                                            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>Cancelar</Button>
                                            <Button onClick={handleSaveReview} disabled={reviewing}>
                                              {reviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                              Salvar Revisão
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
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
              <CardTitle>Análise Detalhada por Matéria</CardTitle>
              <CardDescription>Performance dos alunos por disciplina nos simulados multidisciplinares</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Análise em Desenvolvimento</h3>
                <p className="text-muted-foreground">Funcionalidades avançadas de análise serão implementadas em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedImagePreview && (
        <Dialog open={!!selectedImagePreview} onOpenChange={() => setSelectedImagePreview(null)}>
          <DialogContent className="max-w-7xl max-h-[95vh] p-2">
            <DialogHeader>
              <DialogTitle>Visualização da Imagem</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[80vh] bg-black rounded-lg overflow-hidden">
              <img src={selectedImagePreview} alt="Preview" className="w-full h-full object-contain" />
              <Button variant="secondary" size="icon" className="absolute top-4 right-4" onClick={() => setSelectedImagePreview(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}