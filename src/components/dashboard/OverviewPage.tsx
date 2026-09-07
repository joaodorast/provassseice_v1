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
import { ExcelExporter, ExcelColumn } from '../../utils/excel-utils';

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

  const handleExportSubmissions = async () => {
    try {
      const submissionsResponse = await apiService.getSubmissions();
      const allSubmissions = submissionsResponse.submissions || [];

      if (allSubmissions.length === 0) {
        toast.error('Nenhum resultado disponível para exportar');
        return;
      }

      const columns: ExcelColumn[] = [
        { header: 'Turma', key: 'examId', width: 16, type: 'text' },
        { header: 'Aluno', key: 'studentName', width: 28, type: 'text' },
        { header: 'Simulado', key: 'examTitle', width: 30, type: 'text' },
        { header: 'Status/Percentual', key: 'percentage', width: 16, type: 'percentage' },
        { header: 'Data/Hora', key: 'submittedAt', width: 18, type: 'date' },
      ];

      const exporter = new ExcelExporter();
      const timestamp = new Date().toISOString().split('T')[0];

      await exporter.export({
        title: 'Lista de Alunos e Resultados',
        subtitle: 'Dados dos alunos e simulados do sistema',
        includeStats: true,
        columns,
        data: allSubmissions.map((sub: any) => ({
          examId: sub.examId,
          studentName: sub.studentName || 'Anônimo',
          examTitle: sub.examTitle,
          percentage: sub.percentage,
          submittedAt: sub.submittedAt,
        })),
        filename: `Alunos_Resultados_${timestamp}`,
      });

      toast.success('Planilha exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar resultados:', error);
      toast.error('Erro ao exportar resultados. Tente novamente.');
    }
  };

  const mainActions = [
    {
      key: 'importar-alunos',
      title: 'IMPORTAR ALUNOS',
      description: 'Importar lista de alunos',
      icon: Download,
      color: 'text-amber-600'
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
      {/* Welcome Banner */}
      <div className="seice-sidebar rounded-2xl px-5 py-6 lg:px-8 lg:py-8 relative overflow-hidden shadow-lg shadow-black/20">
        <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <h1 className="text-xl lg:text-2xl font-semibold text-white tracking-tight">Bem-vindo ao Sistema SEICE</h1>
          <p className="text-sm lg:text-base text-zinc-400 mt-1">Acompanhe alunos, simulados e correções em um só lugar.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="seice-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" onClick={() => onNavigate('importar-alunos')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-zinc-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-zinc-700" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">ALUNOS</h3>
            <p className="text-xl lg:text-2xl font-bold text-zinc-900 mb-1 lg:mb-2">{stats.totalStudents}</p>
            <p className="text-xs lg:text-sm text-slate-600">Total de alunos</p>
          </CardContent>
        </Card>

        <Card className="seice-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" onClick={() => onNavigate('avaliacao')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-zinc-100 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 lg:w-8 lg:h-8 text-zinc-700" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">AVALIAÇÕES</h3>
            <p className="text-xl lg:text-2xl font-bold text-zinc-900 mb-1 lg:mb-2">{stats.totalExams}</p>
            <p className="text-xs lg:text-sm text-slate-600">Total de avaliações</p>
          </CardContent>
        </Card>

        <Card className="seice-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" onClick={() => onNavigate('aplicacao')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-zinc-100 rounded-2xl flex items-center justify-center">
                <Play className="w-6 h-6 lg:w-8 lg:h-8 text-zinc-700" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">ATIVAS</h3>
            <p className="text-xl lg:text-2xl font-bold text-zinc-900 mb-1 lg:mb-2">{stats.activeExams}</p>
            <p className="text-xs lg:text-sm text-slate-600">Avaliações ativas</p>
          </CardContent>
        </Card>

        <Card className="seice-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ring-1 ring-amber-200" onClick={() => onNavigate('relatorios-gerais')}>
          <CardContent className="p-4 lg:p-8 text-center">
            <div className="flex justify-center mb-3 lg:mb-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                <CheckSquare className="w-6 h-6 lg:w-8 lg:h-8 text-amber-600" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1 lg:mb-2 text-sm lg:text-base">MÉDIA GERAL</h3>
            <p className="text-xl lg:text-2xl font-bold text-amber-600 mb-1 lg:mb-2">{stats.averageScore.toFixed(1)}%</p>
            <p className="text-xs lg:text-sm text-slate-600">Média das avaliações</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
        {mainActions.map((action) => (
          <Card
            key={action.key}
            className={`cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
              action.key === 'importar-alunos' ? 'ring-2 ring-amber-500 shadow-lg' : 'hover:ring-1 hover:ring-zinc-300'
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
                <button
                  onClick={handleExportSubmissions}
                  className="text-amber-600 hover:text-amber-700 text-xs lg:text-sm font-medium"
                >
                  Exportar
                </button>
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 sticky top-0 z-10">
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
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
                  className="mt-4 text-amber-600 hover:text-amber-700 font-medium text-sm"
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