import React, { useState } from 'react';
import { User } from '../App';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
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
  Download,
  ChevronDown,
  ChevronRight,
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
import { SystemTestsPage } from './dashboard/SystemTestsPage';
import { ManageClassesPage } from './dashboard/ManageClassesPage';
import { ManageSeriesPage } from './dashboard/ManageSeriesPage';

type MainDashboardProps = {
  user: User;
  onLogout: () => void;
};

export function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const [currentPage, setCurrentPage] = useState('inicio');
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({
    avaliacoes: false,
    resultados: false,
    configuracao: false
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

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
        {
          key: 'avaliacoes',
          label: 'AVALIAÇÕES',
          icon: BookOpen,
          expandable: true,
          submenu: [
            { key: 'banco-questoes', label: 'Banco de Questões', icon: ClipboardList },
            { key: 'criar-simulado', label: 'Criar Simulado', icon: Plus },
            { key: 'avaliacao', label: 'Gerenciar Simulados', icon: BookOpen },
            { key: 'aplicacao', label: 'Aplicação', icon: Play },
            { key: 'correcao', label: 'Correção', icon: CheckSquare },
            { key: 'enviar-imagens', label: 'Enviar Imagens', icon: Send }
          ]
        }
      ]
    },
    {
      section: 'RELATÓRIOS',
      items: [
        {
          key: 'resultados',
          label: 'RESULTADOS',
          icon: BarChart3,
          expandable: true,
          submenu: [
            { key: 'relatorios-gerais', label: 'Relatórios Gerais', icon: BarChart3 }
          ]
        }
      ]
    },
    {
      section: 'CONFIGURAÇÕES',
      items: [
        {
          key: 'configuracao',
          label: 'CONFIGURAÇÃO',
          icon: Settings,
          expandable: true,
          submenu: [
            { key: 'gerenciar-series', label: 'Gerenciar Séries', icon: BookOpen },
            { key: 'gerenciar-turmas', label: 'Gerenciar Turmas', icon: Users },
            { key: 'gerenciar-alunos', label: 'Gerenciar Alunos', icon: Users },
            { key: 'usuarios', label: 'Configurações', icon: Settings },
            { key: 'testes-sistema', label: '🧪 Testes do Sistema', icon: CheckSquare }
          ]
        }
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
        return <CreateSimuladoPage onBack={() => setCurrentPage('inicio')} />;
      case 'avaliacao':
        return <ManageExamsPage onCreateExam={() => setCurrentPage('criar-simulado')} />;
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
      case 'testes-sistema':
        return <SystemTestsPage />;
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
      'usuarios': 'Configurações',
      'testes-sistema': 'Testes do Sistema'
    };
    return pageMap[currentPage] || 'Início';
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-base lg:text-lg">S</span>
          </div>
          <div className="text-white">
            <div className="text-xs lg:text-sm opacity-90">Imagem da</div>
            <div className="font-semibold text-sm lg:text-base">logo do SEICE</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 lg:py-6 overflow-y-auto">
        {menuItems.map((section) => (
          <div key={section.section} className="mb-4 lg:mb-6">
            <div className="px-4 lg:px-6 mb-2">
              <h3 className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
                {section.section}
              </h3>
            </div>
            
            {section.items.map((item) => (
              <div key={item.key}>
                {item.expandable ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className="w-full flex items-center justify-between px-4 lg:px-6 py-2 lg:py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="font-medium text-sm lg:text-base">{item.label}</span>
                      </div>
                      {expandedMenus[item.key] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    
                    {expandedMenus[item.key] && item.submenu && (
                      <div className="bg-slate-800">
                        {item.submenu.map((subItem) => (
                          <button
                            key={subItem.key}
                            onClick={() => {
                              setCurrentPage(subItem.key);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-8 lg:px-12 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors ${
                              currentPage === subItem.key ? 'bg-slate-700 text-white' : ''
                            }`}
                          >
                            <subItem.icon className="w-4 h-4" />
                            <span className="text-xs lg:text-sm">{subItem.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setCurrentPage(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 lg:px-6 py-2 lg:py-3 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors ${
                      currentPage === item.key ? 'bg-slate-700 text-white' : ''
                    }`}
                  >
                    <item.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span className="font-medium text-sm lg:text-base">{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* User Info & Logout */}
      <div className="p-4 lg:p-6 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user.user_metadata?.name?.[0] || user.email[0].toUpperCase()}
              </span>
            </div>
            <div className="text-white text-sm">
              <div className="font-medium truncate max-w-24">
                {user.user_metadata?.name || 'Usuário'}
              </div>
            </div>
          </div>
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 seice-sidebar flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 seice-sidebar">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="seice-header flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <Home className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600 text-sm lg:text-base">{getCurrentPageTitle()}</span>
          </div>
          
          <div className="text-right text-xs lg:text-sm text-slate-600">
            <div className="hidden sm:block">{user.email}</div>
            <div className="hidden md:block">Sistema de Ensino Integrado de Campus Eliseos</div>
            <div className="block md:hidden">SEICE</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}