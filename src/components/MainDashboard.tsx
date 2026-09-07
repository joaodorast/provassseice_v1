import React, { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { ErrorBoundary } from './ErrorBoundary';
import seiceLogo from '../assets/seice-logo.png';
import {
  LogOut,
  Home,
  BookOpen,
  ClipboardList,
  Play,
  CheckSquare,
  Send,
  BarChart3,
  Settings,
  Users,
  Plus,
  Menu
} from 'lucide-react';

// Import all pages
import { OverviewPage } from './dashboard/OverviewPage';
import { ManageStudentsPage } from './dashboard/ImportStudentsPage';
import { ManageExamsPage } from './dashboard/ManageExamsPage';
import { ApplyExamsPage } from './dashboard/ApplyExamsPage';
import { GradeExamsPage } from './dashboard/GradeExamsPage';
import { ReportsPage } from './dashboard/ReportsPage';
import { ConfigurationPage } from './dashboard/ConfigurationPage';
import { QuestionBankPage } from './dashboard/QuestionBankPage';
import { EvaluationPage } from './dashboard/EvaluationPage';
import { SendImagesPage } from './dashboard/SendImagesPage';
import { StudentsManagementPage } from './dashboard/StudentsManagementPage';
import { CreateSimuladoPage } from './dashboard/CreateSimuladoPage';
import { SeriesPage } from './dashboard/SeriesPage';
import { ManageClassesPage } from './dashboard/ManageClassesPage';
import { ManageSeriesPage } from './dashboard/ManageSeriesPage';

type MainDashboardProps = {
  user: User;
  onLogout: () => void;
};

export function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const [currentPage, setCurrentPage] = useState('inicio');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<any>(null);

  const menuItems = [
    {
      section: 'PRINCIPAL',
      items: [
        { key: 'inicio', label: 'Início', icon: Home }
      ]
    },
    {
      section: 'AVALIAÇÕES',
      items: [
        { key: 'banco-questoes', label: 'Banco de Questões', icon: ClipboardList },
        { key: 'criar-simulado', label: 'Criar Simulado', icon: Plus },
        { key: 'avaliacao', label: 'Gerenciar Simulados', icon: BookOpen },
        { key: 'aplicacao', label: 'Aplicação', icon: Play },
        { key: 'correcao', label: 'Correção', icon: CheckSquare },
        { key: 'enviar-imagens', label: 'Enviar Imagens', icon: Send }
      ]
    },
    {
      section: 'RESULTADOS',
      items: [
        { key: 'relatorios-gerais', label: 'Relatórios Gerais', icon: BarChart3 }
      ]
    },
    {
      section: 'CONFIGURAÇÕES',
      items: [
        { key: 'gerenciar-series', label: 'Gerenciar Séries', icon: BookOpen },
        { key: 'gerenciar-turmas', label: 'Gerenciar Turmas', icon: Users },
        { key: 'gerenciar-alunos', label: 'Gerenciar Alunos', icon: Users },
        { key: 'usuarios', label: 'Configurações', icon: Settings }
      ]
    }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'inicio':
        return <OverviewPage onNavigate={setCurrentPage} />;
      case 'gerenciar-alunos':
        return <ManageStudentsPage />;
      case 'gerenciar-turmas':
        return <ManageClassesPage />;
      case 'gerenciar-series':
        return <ManageSeriesPage />;
      case 'banco-questoes':
        return <QuestionBankPage />;
      case 'criar-simulado':
        return (
          <CreateSimuladoPage
            examToEdit={examToEdit}
            onBack={() => {
              const cameFromEdit = !!examToEdit;
              setExamToEdit(null);
              setCurrentPage(cameFromEdit ? 'avaliacao' : 'inicio');
            }}
          />
        );
      case 'avaliacao':
        return (
          <ManageExamsPage
            onCreateExam={() => { setExamToEdit(null); setCurrentPage('criar-simulado'); }}
            onEditExam={(exam) => { setExamToEdit(exam); setCurrentPage('criar-simulado'); }}
          />
        );
      case 'aplicacao':
        return <ApplyExamsPage />;
      case 'correcao':
        return <GradeExamsPage />;
      case 'enviar-imagens':
        return <SendImagesPage />;
      case 'relatorios-gerais':
        return <ReportsPage />;
      case 'series':
        return <SeriesPage />;
      case 'turma':
      case 'alunos':
        return <StudentsManagementPage />;
      case 'usuarios':
        return (
          <ConfigurationPage 
            user={user}
            exams={[]}
            submissions={[]}
            onRefresh={() => {}}
          />
        );
      default:
        return <OverviewPage onNavigate={setCurrentPage} />;
    }
  };

  const getCurrentPageIcon = () => {
    for (const section of menuItems) {
      const item = section.items.find((i) => i.key === currentPage);
      if (item) return item.icon;
    }
    return Home;
  };

  const getCurrentPageTitle = () => {
    const pageMap: { [key: string]: string } = {
      'inicio': 'Início',
      'gerenciar-alunos': 'Gerenciar Alunos',
      'gerenciar-turmas': 'Gerenciar Turmas',
      'gerenciar-series': 'Gerenciar Séries',
      'banco-questoes': 'Banco de Questões',
      'criar-simulado': 'Criar Simulado',
      'avaliacao': 'Gerenciar Simulados',
      'aplicacao': 'Aplicação',
      'correcao': 'Correção',
      'enviar-imagens': 'Enviar Imagens',
      'relatorios-gerais': 'Relatórios Gerais',
      'series': 'Séries',
      'turma': 'Turma',
      'alunos': 'Alunos',
      'usuarios': 'Configurações'
    };
    return pageMap[currentPage] || 'Início';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full min-h-full bg-zinc-950">
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-white/10 bg-zinc-950 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-black/40 ring-1 ring-white/10 overflow-hidden flex-shrink-0">
            <img src={seiceLogo} alt="Logo SEICE" className="w-full h-full object-contain p-0.5" />
          </div>
          <div className="text-white min-w-0">
            <div className="font-semibold text-base lg:text-lg tracking-tight leading-tight">SEICE</div>
            <div className="text-[11px] lg:text-xs text-zinc-400 leading-tight truncate">Sistema de Ensino Integrado</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar py-4 lg:py-6 bg-zinc-950">
        {menuItems.map((section) => (
          <div key={section.section} className="mb-4 lg:mb-6 px-2 lg:px-3">
            <div className="px-2 lg:px-3 mb-2">
              <h3 className="text-zinc-500 text-[10px] lg:text-xs font-semibold tracking-widest uppercase">
                {section.section}
              </h3>
            </div>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = currentPage === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setCurrentPage(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`relative w-full flex items-center space-x-3 px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-amber-500 text-zinc-900 font-semibold shadow-md shadow-black/30'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                    <span className="font-medium text-sm lg:text-base truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Info & Logout */}
      <div className="p-3 lg:p-4 border-t border-white/10 bg-zinc-950 flex-shrink-0">
        <div className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-white/5 transition-colors duration-150">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
              <span className="text-zinc-900 text-sm font-semibold">
                {user.user_metadata?.name?.[0] || user.email[0].toUpperCase()}
              </span>
            </div>
            <div className="text-white text-sm min-w-0">
              <div className="font-medium truncate max-w-32">
                {user.user_metadata?.name || 'Usuário'}
              </div>
              <div className="text-xs text-slate-400 truncate max-w-32">{user.email}</div>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-white/10 flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const PageIcon = getCurrentPageIcon();

  return (
    <div className="flex h-screen bg-zinc-200 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 h-screen flex-shrink-0 flex-col seice-sidebar bg-zinc-950">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 seice-sidebar bg-zinc-950">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-zinc-200 min-w-0">
        <div className="h-0.5 bg-gradient-to-r from-zinc-900 via-zinc-700 to-amber-500 flex-shrink-0" />
        {/* Header */}
        <div className="seice-header flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Mobile Menu Button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden -ml-2 flex-shrink-0">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
            </Sheet>

            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <PageIcon className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-800" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400 leading-tight hidden sm:block truncate">SEICE</div>
              <span className="block text-slate-800 font-medium text-sm lg:text-base leading-tight truncate">{getCurrentPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Sistema Online</span>
            </div>
            <div className="text-right text-xs lg:text-sm text-slate-600 max-w-[40vw] sm:max-w-none">
              <div className="hidden sm:block font-medium text-slate-700 truncate">{user.email}</div>
              <div className="hidden md:block text-slate-400">Campos Elíseos</div>
              <div className="block md:hidden font-medium truncate">SEICE</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8 pb-10 lg:pb-14 seice-content-bg">
          <ErrorBoundary key={currentPage} variant="inline">
            {renderPage()}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}