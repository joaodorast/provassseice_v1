import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import {
  Download,
  Plus,
  Play,
  CheckSquare,
  Users,
  BookOpen,
  FileText,
  ArrowRight,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { apiService } from '../../utils/api';
import { toast } from 'sonner@2.0.3';
import { ExcelExporter, ExcelColumn } from '../../utils/excel-utils';
import seiceLogo from '../../assets/seice-logo.png';

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

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const statCards = [
    {
      key: 'gerenciar-alunos',
      label: 'ALUNOS',
      value: stats.totalStudents,
      helper: 'Total de alunos',
      icon: Users,
      accent: 'zinc'
    },
    {
      key: 'avaliacao',
      label: 'AVALIAÇÕES',
      value: stats.totalExams,
      helper: 'Total de avaliações',
      icon: FileText,
      accent: 'zinc'
    },
    {
      key: 'aplicacao',
      label: 'ATIVAS',
      value: stats.activeExams,
      helper: 'Avaliações ativas',
      icon: Play,
      accent: 'zinc'
    },
    {
      key: 'relatorios-gerais',
      label: 'MÉDIA GERAL',
      value: `${stats.averageScore.toFixed(1)}%`,
      helper: 'Média das avaliações',
      icon: CheckSquare,
      accent: 'gold'
    }
  ];

  const mainActions = [
    {
      key: 'importar-alunos',
      title: 'Importar Alunos',
      description: 'Importar lista de alunos',
      icon: Download,
      highlight: true
    },
    {
      key: 'avaliacao',
      title: 'Criar Avaliação',
      description: 'Criar nova avaliação',
      icon: Plus,
      highlight: false
    },
    {
      key: 'aplicacao',
      title: 'Aplicar',
      description: 'Aplicar avaliação',
      icon: Play,
      highlight: false
    },
    {
      key: 'correcao',
      title: 'Corrigir',
      description: 'Corrigir avaliações',
      icon: CheckSquare,
      highlight: false
    }
  ];

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-8">
        <div className="h-32 lg:h-40 rounded-2xl bg-zinc-200/70 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="seice-card">
              <CardContent className="p-4 lg:p-8">
                <div className="animate-pulse">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-200 rounded-2xl mb-4"></div>
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
    <div className="space-y-6 lg:space-y-10">
      {/* Welcome Banner */}
      <div className="seice-sidebar rounded-2xl lg:rounded-3xl px-5 py-7 lg:px-10 lg:py-10 relative overflow-hidden shadow-xl shadow-black/25">
        <div className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 w-52 h-52 rounded-full bg-white/5 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '22px 22px'
          }}
        />
        <img
          src={seiceLogo}
          alt=""
          className="pointer-events-none select-none absolute -right-6 -bottom-10 w-48 lg:w-64 opacity-[0.06] object-contain"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] lg:text-xs font-medium text-amber-400 tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {greeting}
            </div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight leading-tight">
              Bem-vindo ao Sistema SEICE
            </h1>
            <div className="h-1 w-14 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 mt-3 mb-3" />
            <p className="text-sm lg:text-base text-zinc-400 max-w-lg">
              Acompanhe alunos, simulados e correções em um só lugar.
            </p>
          </div>

          <button
            onClick={() => onNavigate('importar-alunos')}
            className="group inline-flex items-center gap-2 self-start rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 font-semibold text-sm px-4 py-2.5 lg:px-5 lg:py-3 shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5"
          >
            Importar Alunos
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat) => {
          const isGold = stat.accent === 'gold';
          return (
            <Card
              key={stat.key}
              onClick={() => onNavigate(stat.key)}
              className={`group relative cursor-pointer overflow-hidden border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                isGold
                  ? 'border-amber-200 shadow-md shadow-amber-900/5'
                  : 'border-slate-200 shadow-sm hover:border-amber-200'
              }`}
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ${
                  isGold ? 'bg-amber-500 scale-y-100' : 'bg-zinc-900'
                }`}
              />
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start justify-between mb-4 lg:mb-6">
                  <div
                    className={`w-11 h-11 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center ${
                      isGold ? 'bg-amber-100' : 'bg-zinc-100'
                    }`}
                  >
                    <stat.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${isGold ? 'text-amber-600' : 'text-zinc-700'}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors duration-200" />
                </div>
                <p className="text-[11px] lg:text-xs font-semibold tracking-widest text-slate-400 uppercase mb-1">
                  {stat.label}
                </p>
                <p className={`text-2xl lg:text-3xl font-bold mb-1 ${isGold ? 'text-amber-600' : 'text-zinc-900'}`}>
                  {stat.value}
                </p>
                <p className="text-xs lg:text-sm text-slate-500">{stat.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 lg:space-y-4">
        <h2 className="text-sm lg:text-base font-semibold text-slate-800 tracking-tight">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
          {mainActions.map((action) => (
            <Card
              key={action.key}
              className={`group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl border ${
                action.highlight
                  ? 'border-amber-300 ring-1 ring-amber-200 shadow-md shadow-amber-900/5'
                  : 'border-slate-200 hover:border-zinc-300'
              }`}
              onClick={() => onNavigate(action.key)}
            >
              <CardContent className="p-3.5 lg:p-6 text-center">
                <div
                  className={`mx-auto flex justify-center mb-2.5 lg:mb-4 w-10 h-10 lg:w-12 lg:h-12 rounded-xl items-center transition-transform duration-200 group-hover:scale-105 ${
                    action.highlight ? 'bg-gradient-to-br from-zinc-900 to-zinc-700' : 'bg-slate-100'
                  }`}
                >
                  <action.icon className={`w-5 h-5 lg:w-6 lg:h-6 mx-auto ${action.highlight ? 'text-amber-400' : 'text-zinc-600'}`} />
                </div>
                <h3 className="font-medium text-slate-800 mb-1 text-xs lg:text-sm">{action.title}</h3>
                <p className="text-xs text-slate-500 hidden lg:block">{action.description}</p>
                <div className="hidden lg:flex items-center justify-center gap-1 mt-3 text-[11px] font-medium text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Acessar <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Students and Exams Data */}
      <div className="space-y-3 lg:space-y-4">
        <h2 className="text-sm lg:text-base font-semibold text-slate-800 tracking-tight">Dados dos Alunos e Simulados</h2>

        <Card className="seice-card overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center space-x-2.5 lg:space-x-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <span className="font-medium text-slate-800 text-sm lg:text-base">Lista de Alunos e Resultados</span>
              </div>
              <button
                onClick={handleExportSubmissions}
                className="inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-xs lg:text-sm font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                Exportar
              </button>
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
                <tbody className="bg-white divide-y divide-slate-100">
                  {recentSubmissions.map((submission, index) => (
                    <tr key={index} className="hover:bg-amber-50/40 transition-colors duration-150">
                      <td className="px-3 lg:px-6 py-4">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                            {submission.examId}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-900 text-amber-400 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                            {(submission.studentName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs lg:text-sm font-medium text-slate-900">{submission.studentName || 'Anônimo'}</div>
                            <div className="text-xs text-slate-500 hidden lg:block">ID: {submission.userId}</div>
                          </div>
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
              <div className="px-4 lg:px-6 py-10 lg:py-14 text-center border-t border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-zinc-400" />
                </div>
                <p className="text-slate-600 text-sm lg:text-base font-medium">Nenhuma submissão encontrada</p>
                <p className="text-slate-400 text-xs lg:text-sm mt-1">Dados aparecerão conforme as avaliações forem aplicadas</p>
                <button
                  onClick={() => onNavigate('importar-alunos')}
                  className="mt-5 inline-flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-medium text-sm"
                >
                  Começar importando alunos
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
