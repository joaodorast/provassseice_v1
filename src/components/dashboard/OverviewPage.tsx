import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { 
  Download, 
  Plus, 
  Play, 
  CheckSquare,
  Users,
  BookOpen,
  FileText
} from 'lucide-react';
import { apiService } from '../../utils/api';
import { toast } from 'sonner@2.0.3';

type OverviewPageProps = {
  onNavigate: (page: string) => void;
};

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExams: 0,
    totalSubmissions: 0,
    activeExams: 0,
    averageScore: 0
  });
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, submissionsResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getSubmissions()
      ]);
      
      setStats(statsResponse.stats);
      setRecentSubmissions(submissionsResponse.submissions.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const mainActions = [
    {
      key: 'importar-alunos',
      title: 'IMPORTAR ALUNOS',
      description: 'Importar lista de alunos',
      icon: Download,
      color: 'text-blue-600'
    },
    {
      key: 'avaliacao',
      title: 'CRIAR AVALIAÇÃO',
      description: 'Criar nova avaliação',
      icon: Plus,
      color: 'text-slate-600'
    },
    {
      key: 'aplicacao',
      title: 'APLICAR',
      description: 'Aplicar avaliação',
      icon: Play,
      color: 'text-slate-600'
    },
    {
      key: 'correcao',
      title: 'CORRIGIR',
      description: 'Corrigir avaliações',
      icon: CheckSquare,
      color: 'text-slate-600'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="seice-card">
              <CardContent className="p-4 lg:p-8">
                <div className="animate-pulse">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-200 rounded-2xl mx-auto mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="seice-card cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => onNavigate('importar-alunos')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">ALUNOS</h3>
            <p className="text-xl lg:text-2xl font-bold text-blue-600 mb-1 lg:mb-2">{stats.totalStudents}</p>
            <p className="text-xs lg:text-sm text-slate-600">Total de alunos</p>
          </CardContent>
        </Card>

        <Card className="seice-card cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => onNavigate('avaliacao')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">AVALIAÇÕES</h3>
            <p className="text-xl lg:text-2xl font-bold text-green-600 mb-1 lg:mb-2">{stats.totalExams}</p>
            <p className="text-xs lg:text-sm text-slate-600">Total de avaliações</p>
          </CardContent>
        </Card>

        <Card className="seice-card cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => onNavigate('aplicacao')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-yellow-100 rounded-2xl flex items-center justify-center">
                <Play className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-600" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">ATIVAS</h3>
            <p className="text-xl lg:text-2xl font-bold text-yellow-600 mb-1 lg:mb-2">{stats.activeExams}</p>
            <p className="text-xs lg:text-sm text-slate-600">Avaliações ativas</p>
          </CardContent>
        </Card>

        <Card className="seice-card cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => onNavigate('relatorios-gerais')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                <CheckSquare className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">MÉDIA GERAL</h3>
            <p className="text-xl lg:text-2xl font-bold text-purple-600 mb-1 lg:mb-2">{stats.averageScore.toFixed(1)}%</p>
            <p className="text-xs lg:text-sm text-slate-600">Média das avaliações</p>
          </CardContent>
        </Card>
      </div>

      {/* Test System Banner */}
      <Card className="seice-card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 cursor-pointer hover:shadow-xl transition-all duration-300" onClick={() => onNavigate('testes-sistema')}>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🧪</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base lg:text-lg">Testes Automatizados do Sistema</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Execute testes para verificar se todas as funcionalidades estão funcionando corretamente
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
              <CheckSquare className="w-5 h-5" />
              <span className="font-medium">Executar Testes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
        {mainActions.map((action) => (
          <Card 
            key={action.key} 
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
              action.key === 'importar-alunos' ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-blue-200'
            }`}
            onClick={() => onNavigate(action.key)}
          >
            <CardContent className="p-3 lg:p-6 text-center">
              <div className="flex justify-center mb-2 lg:mb-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <action.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${action.color}`} />
                </div>
              </div>
              <h3 className="font-medium text-slate-800 mb-1 text-xs lg:text-sm">{action.title}</h3>
              <p className="text-xs text-slate-600 hidden lg:block">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Students and Exams Data */}
      <div className="space-y-4">
        <h2 className="text-base lg:text-lg font-semibold text-slate-800">Dados dos Alunos e Simulados</h2>
        
        <Card className="seice-card">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-200">
              <div className="flex items-center space-x-2 lg:space-x-4">
                <Users className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
                <span className="font-medium text-slate-800 text-sm lg:text-base">Lista de Alunos e Resultados</span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-700 text-xs lg:text-sm font-medium">
                  Exportar
                </button>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Turma
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Nome do Aluno
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Avaliação
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Data/Hora
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {recentSubmissions.map((submission, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-3 lg:px-6 py-4">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {submission.examId}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <div>
                          <div className="text-xs lg:text-sm font-medium text-slate-900">{submission.studentName || 'Anônimo'}</div>
                          <div className="text-xs text-slate-500 hidden lg:block">ID: {submission.userId}</div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 hidden md:table-cell">
                        <div className="text-xs lg:text-sm text-slate-900 max-w-xs truncate">
                          {submission.examTitle}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          submission.percentage >= 70 ? 'bg-green-100 text-green-800' :
                          submission.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {submission.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm text-slate-500 hidden lg:table-cell">
                        {new Date(submission.submittedAt).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State for more data */}
            {recentSubmissions.length === 0 && (
              <div className="px-4 lg:px-6 py-6 lg:py-8 text-center border-t border-slate-200">
                <BookOpen className="w-10 h-10 lg:w-12 lg:h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-sm lg:text-base">Nenhuma submissão encontrada</p>
                <p className="text-slate-400 text-xs lg:text-sm">Dados aparecerão conforme as avaliações forem aplicadas</p>
                <button 
                  onClick={() => onNavigate('importar-alunos')}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Começar importando alunos
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}