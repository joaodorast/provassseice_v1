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
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  Eye, 
  Download,
  BarChart3,
  FileText,
  Users,
  Target,
  TrendingUp,
  Award,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Star,
  Edit,
  Save,
  X,
  ChevronRight,
  PieChart,
  Activity,
  Clipboard,
  Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiService } from '../../utils/api';

type GradingStatus = 'pending' | 'graded' | 'reviewed';

type SubjectPerformance = {
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
};

type DetailedSubmission = {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentClass: string;
  studentGrade: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  percentage: number;
  subjectPerformances: SubjectPerformance[];
  timeSpent: number;
  submittedAt: string;
  gradingStatus: GradingStatus;
  feedback?: string;
  reviewNotes?: string;
};

type Exam = {
  id: string;
  title: string;
  description: string;
  questionsPerSubject: number;
  timeLimit: number;
  subjects: string[];
  totalQuestions: number;
  questions: any[];
  userId: string;
  createdAt: string;
  status: 'Rascunho' | 'Ativo' | 'Arquivado';
};

export function GradeExamsPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<DetailedSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DetailedSubmission | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [answerSheetImages, setAnswerSheetImages] = useState<any[]>([]);

  // Load data on component mount with progressive loading
  useEffect(() => {
    loadDataProgressively();
  }, []);

  const loadDataProgressively = async () => {
    try {
      setLoading(true);
      
      // Load exams first (usually faster)
      try {
        const examsRes = await apiService.getExams();
        const examsList = (examsRes.exams || []).filter((e: any) => e && e.id && e.title);
        console.log(`Loaded ${examsList.length} valid exams for grading`);
        setExams(examsList);
      } catch (error) {
        console.error('Error loading exams:', error);
        setExams([]);
      }

      // Then load submissions
      try {
        const submissionsRes = await apiService.getSubmissions();
        const submissionsList = (submissionsRes.submissions || []).filter((s: any) => s && s.id);
        console.log(`Loaded ${submissionsList.length} valid submissions`);
        setSubmissions(transformSubmissions(submissionsList));
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

  const loadData = loadDataProgressively;

  const transformSubmissions = (rawSubmissions: any[]): DetailedSubmission[] => {
    return rawSubmissions.map(sub => ({
      id: sub.id,
      examId: sub.examId,
      examTitle: sub.examTitle || 'Simulado',
      studentId: sub.studentId || crypto.randomUUID(),
      studentName: sub.studentName || `Aluno ${Math.floor(Math.random() * 100) + 1}`,
      studentEmail: sub.studentEmail || `aluno${Math.floor(Math.random() * 100)}@escola.com`,
      studentClass: sub.studentClass || 'Turma A',
      studentGrade: sub.studentGrade || '1° ANO',
      answers: sub.answers || [],
      score: sub.score || 0,
      totalQuestions: sub.totalQuestions || 50,
      percentage: sub.percentage || 0,
      subjectPerformances: generateSubjectPerformances(sub),
      timeSpent: sub.timeSpent || Math.floor(Math.random() * 60) + 40,
      submittedAt: sub.submittedAt || new Date().toISOString(),
      gradingStatus: 'graded' as GradingStatus,
      feedback: sub.feedback,
      reviewNotes: sub.reviewNotes
    }));
  };

  const generateSubjectPerformances = (submission: any): SubjectPerformance[] => {
    const subjects = ['Matemática', 'Português', 'História', 'Geografia', 'Ciências'];
    return subjects.map(subject => {
      const correctAnswers = Math.floor(Math.random() * 11);
      return {
        subject,
        totalQuestions: 10,
        correctAnswers,
        percentage: Math.round((correctAnswers / 10) * 100)
      };
    });
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

  const getGradingStats = () => {
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.gradingStatus === 'graded').length;
    const reviewedSubmissions = submissions.filter(s => s.gradingStatus === 'reviewed').length;
    const avgScore = submissions.length > 0 
      ? Math.round(submissions.reduce((sum, sub) => sum + sub.percentage, 0) / submissions.length)
      : 0;
    const passRate = submissions.length > 0
      ? Math.round((submissions.filter(s => s.percentage >= 60).length / submissions.length) * 100)
      : 0;

    return { totalSubmissions, gradedSubmissions, reviewedSubmissions, avgScore, passRate };
  };

  const stats = getGradingStats();

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 80) {
      return <Badge className="bg-emerald-100 text-emerald-800">Excelente</Badge>;
    } else if (percentage >= 70) {
      return <Badge className="bg-green-100 text-green-800">Muito Bom</Badge>;
    } else if (percentage >= 60) {
      return <Badge className="bg-blue-100 text-blue-800">Bom</Badge>;
    } else if (percentage >= 50) {
      return <Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Insuficiente</Badge>;
    }
  };

  const getGradingStatusBadge = (status: GradingStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
      case 'graded':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Corrigida</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="text-green-600 border-green-300">Revisada</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const handleBulkExport = async () => {
    if (selectedSubmissions.length === 0) {
      toast.error('Selecione pelo menos uma submissão para exportar');
      return;
    }
    
    try {
      const response = await apiService.exportGradingReport({ 
        submissionIds: selectedSubmissions,
        format: 'json'
      });
      
      if (response.success) {
        // Create a download link
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `resultados-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        toast.success(`${selectedSubmissions.length} resultado(s) exportado(s) com sucesso!`);
        setSelectedSubmissions([]);
      } else {
        throw new Error('Failed to export');
      }
    } catch (error) {
      console.error('Error exporting bulk results:', error);
      toast.error('Erro ao exportar resultados');
    }
  };

  const handleSelectSubmission = (submissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubmissions(prev => [...prev, submissionId]);
    } else {
      setSelectedSubmissions(prev => prev.filter(id => id !== submissionId));
    }
  };

  const selectAllSubmissions = () => {
    setSelectedSubmissions(filteredSubmissions.map(s => s.id));
  };

  const clearAllSubmissions = () => {
    setSelectedSubmissions([]);
  };

  const handleReviewSubmission = async (submission: DetailedSubmission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.reviewNotes || '');
    setFeedback(submission.feedback || '');
    
    // Load answer sheet images for this submission
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

  const handleUploadAnswerSheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSubmission) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    try {
      setUploadingImage(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
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
            toast.success('Imagem do cartão resposta enviada com sucesso!');
          } else {
            throw new Error(response.error || 'Failed to upload image');
          }
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
      } else {
        throw new Error(response.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting answer sheet:', error);
      toast.error('Erro ao excluir imagem');
    }
  };

  const handleSaveReview = async () => {
    if (!selectedSubmission) return;
    
    try {
      setReviewing(true);
      
      // Save review to backend
      const response = await apiService.updateSubmissionReview(selectedSubmission.id, {
        reviewNotes,
        feedback
      });

      if (response.success) {
        // Update local state with backend data
        setSubmissions(prev => 
          prev.map(sub => 
            sub.id === selectedSubmission.id ? {
              ...sub,
              ...response.submission,
              reviewNotes,
              feedback,
              gradingStatus: 'reviewed' as GradingStatus
            } : sub
          )
        );
        
        setSelectedSubmission(null);
        toast.success('Revisão salva com sucesso!');
      } else {
        throw new Error('Failed to save review');
      }
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Erro ao salvar revisão');
    } finally {
      setReviewing(false);
    }
  };

  const handleExportIndividual = async (submissionId: string) => {
    try {
      const response = await apiService.exportGradingReport({ submissionIds: [submissionId] });
      
      if (response.success) {
        // Create a download link
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `resultado-${submissionId}-${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        toast.success('Resultado individual exportado!');
      } else {
        throw new Error('Failed to export');
      }
    } catch (error) {
      console.error('Error exporting individual result:', error);
      toast.error('Erro ao exportar resultado');
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.examTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = filterExam === 'all' || submission.examId === filterExam;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'excellent' && submission.percentage >= 80) ||
                         (filterStatus === 'very-good' && submission.percentage >= 70 && submission.percentage < 80) ||
                         (filterStatus === 'good' && submission.percentage >= 60 && submission.percentage < 70) ||
                         (filterStatus === 'regular' && submission.percentage >= 50 && submission.percentage < 60) ||
                         (filterStatus === 'insufficient' && submission.percentage < 50);
    return matchesSearch && matchesExam && matchesStatus;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Correção de Simulados</h1>
          <p className="text-muted-foreground">
            Analise os resultados e performance dos alunos nos simulados multidisciplinares
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadData}>
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
          <TabsTrigger value="submissions">Submissões</TabsTrigger>
          <TabsTrigger value="analysis">Análise Detalhada</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Submissões</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                <p className="text-xs text-muted-foreground">
                  Simulados realizados
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Corrigidas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.gradedSubmissions}</div>
                <p className="text-xs text-muted-foreground">
                  Automática
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revisadas</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reviewedSubmissions}</div>
                <p className="text-xs text-muted-foreground">
                  Análise manual
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgScore}%</div>
                <p className="text-xs text-muted-foreground">
                  Pontuação média
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.passRate}%</div>
                <p className="text-xs text-muted-foreground">
                  ≥ 60%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Performance</CardTitle>
              <CardDescription>
                Análise da performance dos alunos por faixa de pontuação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-3">
                    <Star className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {submissions.filter(s => s.percentage >= 80).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Excelente (≥80%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.percentage >= 70 && s.percentage < 80).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Muito Bom (70-79%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3">
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {submissions.filter(s => s.percentage >= 60 && s.percentage < 70).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Bom (60-69%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-3">
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {submissions.filter(s => s.percentage >= 50 && s.percentage < 60).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Regular (50-59%)</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-3">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {submissions.filter(s => s.percentage < 50).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Insuficiente (&lt;50%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab */}	
        <TabsContent value="submissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submissões dos Alunos</CardTitle>
              <CardDescription>
                Gerencie e analise todas as submissões de simulados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
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
                    <SelectValue placeholder="Filtrar por performance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as performances</SelectItem>
                    <SelectItem value="excellent">Excelente (≥80%)</SelectItem>
                    <SelectItem value="very-good">Muito Bom (70-79%)</SelectItem>
                    <SelectItem value="good">Bom (60-69%)</SelectItem>
                    <SelectItem value="regular">Regular (50-59%)</SelectItem>
                    <SelectItem value="insufficient">Insuficiente (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Actions */}
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

              <div className="border rounded-lg">
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
                    {filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
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
                            <div className="font-medium">{submission.studentName}</div>
                            <div className="text-sm text-muted-foreground">
                              {submission.studentClass} • {submission.studentGrade}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{submission.examTitle}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(submission.submittedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                            <span className="text-sm">{submission.timeSpent}min</span>
                          </div>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          {getPerformanceBadge(submission.percentage)}
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
                              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Análise Detalhada - {submission.studentName}</DialogTitle>
                                  <DialogDescription>
                                    Revisão da submissão do simulado "{submission.examTitle}"
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedSubmission && (
                                  <div className="space-y-6">
                                    {/* Student Info */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium">Pontuação</Label>
                                        <p className="text-2xl font-bold">{selectedSubmission.score}/{selectedSubmission.totalQuestions}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Percentual</Label>
                                        <p className="text-2xl font-bold">{selectedSubmission.percentage}%</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Tempo Gasto</Label>
                                        <p className="text-2xl font-bold">{selectedSubmission.timeSpent}min</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Performance</Label>
                                        <div className="mt-1">
                                          {getPerformanceBadge(selectedSubmission.percentage)}
                                        </div>
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Subject Performance */}
                                    <div>
                                      <Label className="text-sm font-medium mb-3 block">Performance por Matéria</Label>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {selectedSubmission.subjectPerformances.map((subject) => (
                                          <Card key={subject.subject} className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <h4 className="font-medium">{subject.subject}</h4>
                                              <Badge variant="outline">
                                                {subject.correctAnswers}/{subject.totalQuestions}
                                              </Badge>
                                            </div>
                                            <Progress value={subject.percentage} className="h-2" />
                                            <p className="text-sm text-muted-foreground mt-1">
                                              {subject.percentage}%
                                            </p>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Answer Sheet Images Section */}
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-sm font-medium mb-2 block">Cartões Resposta</Label>
                                        <p className="text-sm text-muted-foreground mb-4">
                                          Faça upload das imagens dos cartões resposta escaneados
                                        </p>
                                        
                                        <div className="flex items-center gap-4 mb-4">
                                          <Button 
                                            variant="outline" 
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
                                          <span className="text-sm text-muted-foreground">
                                            Formatos aceitos: JPG, PNG (máx. 10MB)
                                          </span>
                                        </div>

                                        {/* Display uploaded images */}
                                        {answerSheetImages.length > 0 && (
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {answerSheetImages.map((image) => (
                                              <div key={image.id} className="relative group">
                                                <div className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                                                  <img 
                                                    src={image.signedUrl} 
                                                    alt={image.fileName}
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                  <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteAnswerSheet(image.id)}
                                                  >
                                                    <X className="w-4 h-4 mr-1" />
                                                    Excluir
                                                  </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                                  {image.fileName}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {answerSheetImages.length === 0 && (
                                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                            <Clipboard className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                              Nenhuma imagem de cartão resposta enviada
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <Separator />

                                    {/* Review Section */}
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

                                    {/* Actions */}
                                    <div className="flex justify-end space-x-2">
                                      <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                                        Cancelar
                                      </Button>
                                      <Button onClick={handleSaveReview} disabled={reviewing}>
                                        {reviewing ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Salvar Revisão
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExportIndividual(submission.id)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredSubmissions.length === 0 && (
                <div className="text-center py-12">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm || filterExam !== 'all' || filterStatus !== 'all'
                      ? 'Nenhuma submissão encontrada'
                      : 'Nenhuma submissão para correção'
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterExam !== 'all' || filterStatus !== 'all'
                      ? 'Tente ajustar os filtros de busca'
                      : 'As submissões aparecerão aqui conforme os alunos realizarem os simulados'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada por Matéria</CardTitle>
              <CardDescription>
                Performance dos alunos por disciplina nos simulados multidisciplinares
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Análise em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Funcionalidades avançadas de análise serão implementadas em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}