import React, { useState, useEffect, useRef } from 'react';
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
  GraduationCap,
  Activity
} from 'lucide-react';
import { apiService } from '../../utils/api';
import { toast } from 'sonner@2.0.3';
import { ExcelExporter, ExcelColumn } from '../../utils/excel-utils';

type OverviewPageProps = {
  onNavigate: (page: string) => void;
};

// Anima um número inteiro subindo de 0 até o valor final quando ele muda.
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = 0;
    startRef.current = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min(1, (timestamp - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

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

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  const animatedStudents = useCountUp(stats.totalStudents);
  const animatedExams = useCountUp(stats.totalExams);
  const animatedActive = useCountUp(stats.activeExams);
  const animatedAvgTenths = useCountUp(Math.round(stats.averageScore * 10));

  const statCards = [
    {
      key: 'gerenciar-alunos',
      label: 'ALUNOS',
      value: animatedStudents,
      helper: 'Total de alunos',
      icon: Users,
      accent: 'zinc'
    },
    {
      key: 'avaliacao',
      label: 'AVALIAÇÕES',
      value: animatedExams,
      helper: 'Total de avaliações',
      icon: FileText,
      accent: 'zinc'
    },
    {
      key: 'aplicacao',
      label: 'ATIVAS',
      value: animatedActive,
      helper: 'Avaliações ativas',
      icon: Play,
      accent: 'zinc'
    },
    {
      key: 'relatorios-gerais',
      label: 'MÉDIA GERAL',
      value: `${(animatedAvgTenths / 10).toFixed(1)}%`,
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
      <div className="rounded-2xl lg:rounded-[28px] relative overflow-hidden shadow-2xl shadow-black/50 bg-[#0a0a0a]">
        {/* Aurora glow field */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 90% at 8% 0%, rgba(245,158,11,0.30) 0%, transparent 60%), radial-gradient(50% 70% at 100% 100%, rgba(245,158,11,0.16) 0%, transparent 60%), radial-gradient(80% 60% at 60% -10%, rgba(63,63,70,0.6) 0%, transparent 70%)'
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06] rounded-2xl lg:rounded-[28px]" />

        <div className="relative px-6 py-10 lg:px-14 lg:py-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-8">
            <div className="max-w-2xl">
              <p className="text-[11px] lg:text-xs font-semibold tracking-[0.3em] text-amber-400/90 uppercase mb-4">
                {greeting} · <span className="text-zinc-500 tracking-normal font-normal normal-case">{today}</span>
              </p>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[0.95]">
                Sistema
                <span className="relative inline-block ml-3 lg:ml-4">
                  <span className="absolute inset-0 blur-2xl bg-amber-400/50 -z-10" />
                  <span className="bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                    SEICE
                  </span>
                </span>
              </h1>

              <p className="text-sm lg:text-lg text-zinc-400 mt-5 max-w-md leading-relaxed">
                Alunos, simulados e correções acompanhados em tempo real, em um único painel.
              </p>

              <button
                onClick={() => onNavigate('importar-alunos')}
                className="group inline-flex items-center gap-2 mt-8 rounded-full border border-amber-400/40 bg-white/[0.04] backdrop-blur-sm hover:bg-amber-400 text-amber-300 hover:text-zinc-900 font-semibold text-sm px-5 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-900/30"
              >
                Importar Alunos
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Live stat strip */}
            <div className="flex lg:flex-col divide-x lg:divide-x-0 lg:divide-y divide-white/10 lg:border-l lg:border-white/10 lg:pl-10">
              {[
                { icon: GraduationCap, value: stats.totalStudents, label: 'Alunos' },
                { icon: Activity, value: stats.activeExams, label: 'Avaliações ativas' },
                { icon: CheckSquare, value: `${stats.averageScore.toFixed(1)}%`, label: 'Média geral' }
              ].map((item, i) => (
                <div key={i} className="flex-1 lg:flex-none px-5 lg:px-0 lg:py-3 first:pl-0 first:lg:pt-0">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1.5">
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] lg:text-xs uppercase tracking-wider">{item.label}</span>
                  </div>
                  <p className="font-display text-2xl lg:text-3xl font-bold text-white tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
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
              className={`seice-glow-card group relative cursor-pointer overflow-hidden border transition-all duration-300 hover:-translate-y-1.5 ${
                isGold
                  ? 'border-amber-200'
                  : 'border-slate-200 hover:border-amber-200'
              }`}
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-300 ${
                  isGold ? 'bg-amber-500 scale-y-100' : 'bg-zinc-900'
                }`}
              />
              <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-400/0 group-hover:bg-amber-400/10 blur-2xl transition-colors duration-300" />
              <CardContent className="p-4 lg:p-6 relative">
                <div className="flex items-start justify-between mb-4 lg:mb-6">
                  <div
                    className={`w-11 h-11 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
                      isGold ? 'bg-amber-100' : 'bg-zinc-100'
                    }`}
                  >
                    <stat.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${isGold ? 'text-amber-600' : 'text-zinc-700'}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                </div>
                <p className="text-[11px] lg:text-xs font-semibold tracking-widest text-slate-400 uppercase mb-1">
                  {stat.label}
                </p>
                <p className={`font-display text-2xl lg:text-4xl font-extrabold mb-1 tabular-nums ${isGold ? 'text-amber-600' : 'text-zinc-900'}`}>
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
              className={`seice-glow-card group cursor-pointer transition-all duration-300 hover:-translate-y-1.5 border ${
                action.highlight
                  ? 'border-amber-300 ring-1 ring-amber-200'
                  : 'border-slate-200 hover:border-zinc-300'
              }`}
              onClick={() => onNavigate(action.key)}
            >
              <CardContent className="p-3.5 lg:p-6 text-center">
                <div
                  className={`mx-auto flex justify-center mb-2.5 lg:mb-4 w-10 h-10 lg:w-12 lg:h-12 rounded-xl items-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                    action.highlight ? 'bg-gradient-to-br from-zinc-900 to-zinc-700 shadow-lg shadow-zinc-900/20' : 'bg-slate-100'
                  }`}
                >
                  <action.icon className={`w-5 h-5 lg:w-6 lg:h-6 mx-auto ${action.highlight ? 'text-amber-400' : 'text-zinc-600'}`} />
                </div>
                <h3 className="font-medium text-slate-800 mb-1 text-xs lg:text-sm">{action.title}</h3>
                <p className="text-xs text-slate-500 hidden lg:block">{action.description}</p>
                <div className="hidden lg:flex items-center justify-center gap-1 mt-3 text-[11px] font-medium text-amber-600 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
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
