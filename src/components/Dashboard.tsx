import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  LogOut, 
  Plus, 
  BookOpen, 
  Clock, 
  Target, 
  TrendingUp,
  FileText,
  Calendar,
  Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { User, Exam, Submission } from '../App';

type DashboardProps = {
  user: User;
  onLogout: () => void;
  onStartExam: (exam: Exam) => void;
  onViewResults: (submission: Submission) => void;
  onCreateExam: () => void;
};

export function Dashboard({ user, onLogout, onStartExam, onViewResults, onCreateExam }: DashboardProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Token de acesso não encontrado');
        return;
      }

      // Load exams
      const examsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        setExams(examsData.exams || []);
      }

      // Load submissions
      const submissionsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setSubmissions(submissionsData.submissions || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getStatistics = () => {
    const totalExams = exams.length;
    const totalSubmissions = submissions.length;
    const averageScore = submissions.length > 0 
      ? Math.round(submissions.reduce((sum, sub) => sum + sub.percentage, 0) / submissions.length)
      : 0;
    const recentSubmissions = submissions.slice(0, 5);

    return { totalExams, totalSubmissions, averageScore, recentSubmissions };
  };

  const { totalExams, totalSubmissions, averageScore, recentSubmissions } = getStatistics();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Provas SEICE
              </h1>
              <Badge variant="outline">Dashboard</Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarFallback>{getUserInitials(user.user_metadata.name)}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm">{user.user_metadata.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Total de Provas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{totalExams}</div>
              <p className="text-xs text-muted-foreground">
                Provas criadas por você
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Simulados Feitos</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                Simulados realizados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Média Geral</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{averageScore}%</div>
              <p className="text-xs text-muted-foreground">
                Pontuação média
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Melhor Nota</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {submissions.length > 0 ? Math.max(...submissions.map(s => s.percentage)) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Sua melhor performance
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Exams Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl">Suas Provas</h2>
              <Button onClick={onCreateExam}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Prova
              </Button>
            </div>
            
            <div className="space-y-4">
              {exams.length > 0 ? (
                exams.map((exam) => (
                  <Card key={exam.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{exam.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {exam.description || 'Sem descrição'}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {exam.subject || 'Geral'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1" />
                            {exam.questions.length} questões
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {exam.timeLimit}min
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(exam.createdAt)}
                        </div>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => onStartExam(exam)}
                      >
                        Fazer Simulado
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Você ainda não criou nenhuma prova
                    </p>
                    <Button onClick={onCreateExam}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar sua primeira prova
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Recent Submissions */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl">Resultados Recentes</h2>
            </div>
            
            <div className="space-y-4">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.map((submission) => (
                  <Card key={submission.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{submission.examTitle}</CardTitle>
                          <CardDescription>
                            {formatDate(submission.submittedAt)}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={submission.percentage >= 70 ? "default" : submission.percentage >= 50 ? "secondary" : "destructive"}
                        >
                          {submission.percentage}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>{submission.score}/{submission.totalQuestions} acertos</span>
                        <span>
                          {submission.percentage >= 70 ? '✅ Aprovado' : 
                           submission.percentage >= 50 ? '⚠️ Regular' : '❌ Reprovado'}
                        </span>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline" 
                        size="sm"
                        onClick={() => onViewResults(submission)}
                      >
                        Ver Detalhes
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum simulado realizado ainda
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}