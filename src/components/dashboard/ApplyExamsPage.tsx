import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { 
  Play, 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Send, 
  Copy,
  Eye,
  BookOpen,
  Target,
  Link,
  QrCode,
  Mail,
  Printer,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Share2,
  Activity,
  Plus
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiService } from '../../utils/api';

type ApplicationMethod = 'online' | 'print' | 'hybrid';
type ApplicationStatus = 'pending' | 'active' | 'completed' | 'cancelled';

type Student = {
  id: string;
  name: string;
  email: string;
  class: string;
  grade: string;
  registrationNumber?: string;
  status: 'active' | 'inactive';
};

type Exam = {
  id: string;
  title: string;
  description: string;
  questionsPerSubject: number;
  timeLimit: number;
  subjects: string[];
  totalQuestions: number;
  userId: string;
  createdAt: string;
  status: 'Rascunho' | 'Ativo' | 'Arquivado';
};

type Application = {
  id: string;
  examId: string;
  examTitle: string;
  studentIds: string[];
  applicationMethod: ApplicationMethod;
  scheduledDate?: string;
  scheduledTime?: string;
  timeLimit: number;
  instructions?: string;
  settings: {
    allowReview: boolean;
    shuffleQuestions: boolean;
    showAnswers: boolean;
  };
  applicationLink?: string;
  qrCodeData?: string;
  status: ApplicationStatus;
  createdAt: string;
  appliedCount: number;
  completedCount: number;
};

export function ApplyExamsPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  
  // Form states
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [applicationMethod, setApplicationMethod] = useState<ApplicationMethod>('online');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [instructions, setInstructions] = useState('');
  const [allowReview, setAllowReview] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [applying, setApplying] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load exams first (usually faster and more critical)
      try {
        console.log('=== ApplyExamsPage: Loading exams ===');
        const examsRes = await apiService.getExams();
        console.log('ApplyExamsPage: Raw exams response:', examsRes);
        
        if (!examsRes) {
          console.error('ApplyExamsPage: No response from API');
          setExams([]);
          toast.error('Erro: Nenhuma resposta da API');
          return;
        }
        
        const examsList = (examsRes.exams || []).filter((e: any) => e && e.id && e.title);
        console.log(`✓ ApplyExamsPage: Loaded ${examsList.length} valid exams out of ${examsRes.exams?.length || 0} total`);
        
        if (examsList.length === 0 && examsRes.exams?.length > 0) {
          console.warn('⚠️ ApplyExamsPage: Some exams were filtered out. Raw exams:', examsRes.exams);
        }
        
        console.log('ApplyExamsPage: Final exams list:', examsList);
        setExams(examsList);
        
        if (examsList.length === 0) {
          console.log('ℹ️ ApplyExamsPage: No exams available. User needs to create exams first.');
        }
      } catch (error) {
        console.error('ApplyExamsPage: Error loading exams:', error);
        setExams([]);
        toast.error('Erro ao carregar simulados');
      }

      // Load students after exams
      try {
        const studentsRes = await apiService.getStudents();
        setStudents(studentsRes.students || []);
      } catch (error) {
        console.error('Error loading students:', error);
        setStudents([]);
        toast.error('Erro ao carregar alunos');
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const clearAllStudents = () => {
    setSelectedStudents([]);
  };

  const selectStudentsByClass = (className: string) => {
    const classStudents = students.filter(s => s.class === className);
    setSelectedStudents(classStudents.map(s => s.id));
  };

  const generateApplicationLink = (examId: string) => {
    const sessionId = crypto.randomUUID();
    return `${window.location.origin}/apply/${examId}?session=${sessionId}`;
  };

  const handleApplyExam = async () => {
    if (!selectedExam) {
      toast.error('Selecione um simulado para aplicar');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Selecione pelo menos um aluno');
      return;
    }

    try {
      setApplying(true);
      
      const applicationData = {
        examId: selectedExam,
        studentIds: selectedStudents,
        applicationMethod,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        timeLimit: timeLimit ? parseInt(timeLimit) : getSelectedExam()?.timeLimit || 120,
        instructions,
        settings: {
          allowReview,
          shuffleQuestions,
          showAnswers
        },
        applicationLink: applicationMethod !== 'print' ? generateApplicationLink(selectedExam) : undefined,
        status: 'active' as ApplicationStatus
      };

      // Save to backend
      console.log('Creating application with data:', applicationData);
      const response = await apiService.createApplication(applicationData);
      
      if (response.success === false && response.error) {
        console.error('Backend error:', response.error);
        toast.error(response.error);
        return;
      }
      
      console.log('Application created successfully:', response.application?.id);
      
      if (applicationMethod === 'online') {
        const link = applicationData.applicationLink!;
        await navigator.clipboard.writeText(link);
        toast.success('Link de aplicação copiado para a área de transferência!');
      } else if (applicationMethod === 'print') {
        toast.success('Simulado preparado para impressão!');
      } else {
        toast.success('Aplicação híbrida configurada com sucesso!');
      }

      // Reset form
      setSelectedExam('');
      setSelectedStudents([]);
      setScheduledDate('');
      setScheduledTime('');
      setTimeLimit('');
      setInstructions('');
      
      // Reload data to show new application
      await loadData();
      
    } catch (error) {
      console.error('Error applying exam:', error);
      toast.error('Erro ao aplicar simulado');
    } finally {
      setApplying(false);
    }
  };

  const generateQRCode = async () => {
    if (!selectedExam) {
      toast.error('Selecione um simulado primeiro');
      return;
    }
    
    try {
      const link = generateApplicationLink(selectedExam);
      // Here you would generate actual QR code
      await navigator.clipboard.writeText(link);
      toast.success('Link QR Code copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao gerar QR Code');
    }
  };

  const sendEmailInvitations = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Selecione os alunos para enviar convites');
      return;
    }
    
    try {
      // Here you would send actual emails
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Convites enviados para ${selectedStudents.length} alunos!`);
    } catch (error) {
      toast.error('Erro ao enviar convites');
    }
  };

  const getSelectedExam = () => {
    return exams.find(exam => exam.id === selectedExam);
  };

  const getUniqueClasses = () => {
    const classes = students.map(s => s.class);
    return [...new Set(classes)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm text-muted-foreground">Carregando simulados e alunos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Aplicar Simulados</h1>
          <p className="text-muted-foreground">
            Configure e aplique simulados multidisciplinares para os alunos
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <Activity className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="apply" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apply">Nova Aplicação</TabsTrigger>
          <TabsTrigger value="manage">Gerenciar Aplicações</TabsTrigger>
        </TabsList>

        {/* Nova Aplicação */}
        <TabsContent value="apply" className="space-y-6">
          {exams.length === 0 && !loading && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">
                      Nenhum simulado disponível
                    </h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      Você precisa criar um simulado antes de aplicá-lo aos alunos.
                    </p>
                    <Button 
                      size="sm" 
                      className="bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => window.location.href = '#criar-simulado'}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Simulado
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Exam Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Selecionar Simulado
                  </CardTitle>
                  <CardDescription>
                    Escolha um simulado multidisciplinar para aplicar aos alunos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Simulado disponível</Label>
                    <Select value={selectedExam} onValueChange={setSelectedExam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um simulado" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Nenhum simulado disponível. Crie um simulado primeiro.
                          </div>
                        ) : (
                          exams.map(exam => {
                            console.log('Rendering exam option:', exam.id, exam.title, exam.status);
                            return (
                              <SelectItem key={exam.id} value={exam.id}>
                                {exam.title} ({exam.totalQuestions || 0} questões, {exam.timeLimit}min)
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {exams.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {exams.length} simulado(s) disponível(is)
                      </p>
                    )}
                  </div>

                  {selectedExam && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{getSelectedExam()?.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getSelectedExam()?.description}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {getSelectedExam()?.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <Target className="w-4 h-4 mr-2 text-blue-600" />
                          <span>{getSelectedExam()?.totalQuestions} questões</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-green-600" />
                          <span>{getSelectedExam()?.timeLimit} min</span>
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-2 text-purple-600" />
                          <span>{getSelectedExam()?.subjects?.length || 0} matérias</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
                          <span>{getSelectedExam()?.questionsPerSubject}/matéria</span>
                        </div>
                      </div>

                      {getSelectedExam()?.subjects && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Matérias incluídas:</p>
                          <div className="flex flex-wrap gap-1">
                            {getSelectedExam()?.subjects.map((subject, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Application Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Método de Aplicação
                  </CardTitle>
                  <CardDescription>
                    Escolha como o simulado será disponibilizado para os alunos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                        applicationMethod === 'online' 
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                          : 'border-border hover:border-blue-300'
                      }`}
                      onClick={() => setApplicationMethod('online')}
                    >
                      <div className="text-center">
                        <Link className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <h3 className="font-medium">Online</h3>
                        <p className="text-sm text-muted-foreground">Link direto para os alunos</p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          • Acesso imediato<br/>
                          • Correção automática<br/>
                          • Resultados em tempo real
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                        applicationMethod === 'print' 
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200' 
                          : 'border-border hover:border-green-300'
                      }`}
                      onClick={() => setApplicationMethod('print')}
                    >
                      <div className="text-center">
                        <Printer className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <h3 className="font-medium">Impresso</h3>
                        <p className="text-sm text-muted-foreground">Versão para impressão</p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          • Formato tradicional<br/>
                          • Sem necessidade de internet<br/>
                          • Correção manual
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                        applicationMethod === 'hybrid' 
                          ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                          : 'border-border hover:border-purple-300'
                      }`}
                      onClick={() => setApplicationMethod('hybrid')}
                    >
                      <div className="text-center">
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <h3 className="font-medium">Híbrido</h3>
                        <p className="text-sm text-muted-foreground">Online + QR Code</p>
                        <div className="mt-2 text-xs text-muted-foreground">
                          • QR Code para acesso<br/>
                          • Flexibilidade total<br/>
                          • Fácil distribuição
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Application Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Configurações da Aplicação</CardTitle>
                  <CardDescription>
                    Configure data, hora e outras opções para o simulado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Data da Aplicação (opcional)</Label>
                      <Input
                        id="date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Deixe em branco para aplicação imediata
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="time">Horário (opcional)</Label>
                      <Input
                        id="time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timeLimit">Tempo Limite (minutos)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      placeholder={getSelectedExam()?.timeLimit?.toString() || "120"}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      min="30"
                      max="300"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Padrão: {getSelectedExam()?.timeLimit || 120} minutos
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="instructions">Instruções Especiais</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Digite instruções específicas para esta aplicação (ex: material permitido, critérios de avaliação, etc.)..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Opções do Simulado</Label>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allowReview"
                          checked={allowReview}
                          onCheckedChange={setAllowReview}
                        />
                        <Label htmlFor="allowReview" className="text-sm">
                          Permitir revisão das respostas antes de finalizar
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="shuffleQuestions"
                          checked={shuffleQuestions}
                          onCheckedChange={setShuffleQuestions}
                        />
                        <Label htmlFor="shuffleQuestions" className="text-sm">
                          Embaralhar ordem das questões
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showAnswers"
                          checked={showAnswers}
                          onCheckedChange={setShowAnswers}
                        />
                        <Label htmlFor="showAnswers" className="text-sm">
                          Mostrar gabarito e explicações após finalizar
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Selecionar Alunos ({selectedStudents.length} selecionados)
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={selectAllStudents}>
                        Todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearAllStudents}>
                        Limpar
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Escolha quais alunos irão realizar o simulado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick class selection */}
                  {getUniqueClasses().length > 1 && (
                    <div>
                      <Label className="text-sm font-medium">Seleção rápida por turma:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getUniqueClasses().map(className => (
                          <Button
                            key={className}
                            variant="outline"
                            size="sm"
                            onClick={() => selectStudentsByClass(className)}
                            className="text-xs"
                          >
                            {className}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Students list */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {students.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum aluno cadastrado</p>
                        <p className="text-sm">Cadastre alunos na seção Configurações</p>
                      </div>
                    ) : (
                      students.map(student => (
                        <div key={student.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded transition-colors">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleStudentSelection(student.id, checked as boolean)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{student.name}</p>
                              <Badge 
                                variant={student.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {student.status === 'active' ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {student.class} • {student.grade}
                              {student.registrationNumber && ` • ${student.registrationNumber}`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Panel */}
            <div className="space-y-6">
              {/* Apply Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações de Aplicação</CardTitle>
                  <CardDescription>
                    Execute a aplicação do simulado com as configurações definidas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full"
                    onClick={handleApplyExam}
                    disabled={!selectedExam || selectedStudents.length === 0 || applying}
                  >
                    {applying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {applying ? 'Aplicando...' : 'Aplicar Simulado'}
                  </Button>

                  {applicationMethod === 'online' && (
                    <>
                      <Button variant="outline" className="w-full" onClick={generateQRCode}>
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar QR Code
                      </Button>
                      
                      <Button variant="outline" className="w-full" onClick={sendEmailInvitations}>
                        <Mail className="w-4 h-4 mr-2" />
                        Enviar Convites por Email
                      </Button>
                    </>
                  )}

                  {applicationMethod === 'print' && (
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF para Impressão
                    </Button>
                  )}

                  {applicationMethod === 'hybrid' && (
                    <Button variant="outline" className="w-full" onClick={generateQRCode}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Gerar Link e QR Code
                    </Button>
                  )}

                  <Separator />

                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar Simulado
                  </Button>
                </CardContent>
              </Card>

              {/* Application Summary */}
              {selectedExam && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo da Aplicação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Simulado:</span>
                        <span className="font-medium text-right max-w-40 truncate">
                          {getSelectedExam()?.title}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total de questões:</span>
                        <span className="font-medium">{getSelectedExam()?.totalQuestions}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Por matéria:</span>
                        <span className="font-medium">{getSelectedExam()?.questionsPerSubject}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo limite:</span>
                        <span className="font-medium">{timeLimit || getSelectedExam()?.timeLimit} min</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alunos selecionados:</span>
                        <span className="font-medium">{selectedStudents.length}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Método:</span>
                        <Badge variant="outline">
                          {applicationMethod === 'online' ? 'Online' : 
                           applicationMethod === 'print' ? 'Impresso' : 'Híbrido'}
                        </Badge>
                      </div>
                      
                      {scheduledDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data agendada:</span>
                          <span className="font-medium">
                            {new Date(scheduledDate).toLocaleDateString('pt-BR')}
                            {scheduledTime && ` às ${scheduledTime}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedStudents.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Configurações:</p>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center">
                              {allowReview ? <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> : <AlertCircle className="w-3 h-3 mr-1 text-red-600" />}
                              Revisão de respostas
                            </div>
                            <div className="flex items-center">
                              {shuffleQuestions ? <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> : <AlertCircle className="w-3 h-3 mr-1 text-red-600" />}
                              Embaralhar questões
                            </div>
                            <div className="flex items-center">
                              {showAnswers ? <CheckCircle className="w-3 h-3 mr-1 text-green-600" /> : <AlertCircle className="w-3 h-3 mr-1 text-red-600" />}
                              Mostrar gabarito
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recent Applications */}
              <Card>
                <CardHeader>
                  <CardTitle>Simulados Recentes</CardTitle>
                  <CardDescription>
                    Simulados disponíveis para aplicação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {exams.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum simulado disponível</p>
                      </div>
                    ) : (
                      exams.slice(0, 3).map(exam => (
                        <div key={exam.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{exam.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(exam.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs ml-2">
                              {exam.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              <span>{exam.totalQuestions} questões</span>
                              <span>{exam.timeLimit}min</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Gerenciar Aplicações */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aplicações Ativas</CardTitle>
              <CardDescription>
                Gerencie as aplicações de simulados em andamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma aplicação ativa no momento</p>
                <p className="text-sm">As aplicações aparecerão aqui após serem iniciadas</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}