const loadClasses = async () => {
    try {
      console.log('🔄 INICIANDO CARREGAMENTO DE TURMAS');
      console.log('Project ID:', projectId);
      
      if (!projectId) {
        console.error('❌ ERRO: Project ID ausente!');
        // Tenta pegar de qualquer lugar
        const fallbackId = localStorage.getItem('supabase_project_id') || 
                          (window as any).SUPABASE_PROJECT_ID ||
                          document.querySelector('meta[name="supabase-project"]')?.getAttribute('content');
        
        if (fallbackId) {
          console.log('✅ Project ID encontrado no fallback:', fallbackId);
          await loadClassesWithId(fallbackId);
          return;
        }
        
        toast.error('Configuração inválida: Project ID não encontrado');
        return;
      }

      await loadClassesWithId(projectId);
    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO ao carregar turmas:', error);
      toast.error('Erro ao carregar turmas: ' + error.message);
    }
  };import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Save, 
  ArrowLeft,
  BookOpen,
  CheckCircle,
  AlertCircle,
  FileText,
  Trash2,
  Edit2,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  subject: string;
  difficulty: string;
  options: string[];
  correctAnswer: number;
  tags: string[];
  tempId?: string;
  isNew?: boolean;
}

interface Section {
  id: string;
  name: string;
  subject: string;
  questions: Question[];
  expanded: boolean;
}

interface SimuladoData {
  title: string;
  description: string;
  grade: string;
  timeLimit: number;
  selectedClass: string;
  sections: Section[];
}

export function CreateSimuladoPage({ onBack, projectId }: { onBack: () => void; projectId?: string }) {
  const [simuladoData, setSimuladoData] = useState<SimuladoData>({
    title: '',
    description: '',
    grade: '',
    timeLimit: 120,
    selectedClass: '',
    sections: []
  });

  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Detecta o projectId automaticamente se não for passado
  const detectedProjectId = projectId || 
    localStorage.getItem('supabase_project_id') ||
    (window as any).SUPABASE_PROJECT_ID ||
    (() => {
      const scriptTag = document.querySelector('script[src*="supabase.co"]');
      if (scriptTag) {
        const src = scriptTag.getAttribute('src') || '';
        const match = src.match(/https:\/\/([^.]+)\.supabase\.co/);
        if (match) return match[1];
      }
      return null;
    })();
  
  // Dialog states
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showBankQuestions, setShowBankQuestions] = useState(false);
  
  // Current editing states
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionSubject, setSectionSubject] = useState('');
  
  // Question editing
  const [questionData, setQuestionData] = useState({
    question: '',
    difficulty: 'Médio',
    options: ['', '', '', ''],
    correctAnswer: 0,
    tags: [] as string[]
  });
  
  // Bank questions
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());

  const subjects = [
    'Matemática', 'Português', 'História', 'Geografia', 'Ciências',
    'Literatura', 'Filosofia', 'Sociologia', 'Produção Textual', 'Artes'
  ];

  useEffect(() => {
    if (!detectedProjectId) {
      console.error('❌ Project ID não foi passado como prop e não foi detectado!');
      toast.error('Erro de configuração: Project ID ausente');
      return;
    }
    console.log('✅ Project ID detectado:', detectedProjectId);
    loadClasses();
    loadBankQuestions();
  }, [detectedProjectId]);

  const getProjectId = () => {
    // Sempre usar o projectId passado como prop
    return projectId;
  };

  const loadClasses = async () => {
    try {
      console.log('🔄 INICIANDO CARREGAMENTO DE TURMAS');
      console.log('Project ID:', projectId);
      
      if (!projectId) {
        console.error('❌ ERRO: Project ID ausente!');
        // Tenta pegar de qualquer lugar
        const fallbackId = localStorage.getItem('supabase_project_id') || 
                          (window as any).SUPABASE_PROJECT_ID ||
                          document.querySelector('meta[name="supabase-project"]')?.getAttribute('content');
        
        if (fallbackId) {
          console.log('✅ Project ID encontrado no fallback:', fallbackId);
          // Usa o fallback
          await loadClassesWithId(fallbackId);
          return;
        }
        
        toast.error('Configuração inválida: Project ID não encontrado');
        return;
      }

      await loadClassesWithId(projectId);
    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO ao carregar turmas:', error);
      toast.error('Erro ao carregar turmas: ' + error.message);
    }
  };

  const loadClassesWithId = async (pid: string) => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('📝 Token existe:', !!token);
      console.log('📝 Token (primeiros 20 chars):', token?.substring(0, 20));
      
      if (!token) {
        toast.error('Você precisa estar logado');
        return;
      }

      const url = `https://${pid}.supabase.co/functions/v1/make-server-83358821/students`;
      console.log('🌐 URL da requisição:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📄 Response raw:', responseText);

      if (!response.ok) {
        console.error('❌ Resposta com erro:', response.status, responseText);
        toast.error(`Erro ${response.status}: ${responseText.substring(0, 100)}`);
        return;
      }

      const data = JSON.parse(responseText);
      console.log('✅ Dados parseados:', data);
      
      const students = data.students || [];
      console.log('👥 Total de estudantes:', students.length);
      
      if (students.length === 0) {
        console.warn('⚠️ Nenhum estudante encontrado no banco');
        toast.warning('Nenhum estudante cadastrado');
        setAvailableClasses([]);
        return;
      }

      // Log cada estudante para debug
      students.forEach((s: any, idx: number) => {
        console.log(`Estudante ${idx + 1}:`, {
          name: s.name,
          class: s.class,
          email: s.email
        });
      });
      
      const allClasses = students.map((s: any) => s.class).filter((c: any) => c && c.trim());
      console.log('📚 Todas as turmas encontradas:', allClasses);
      
      const uniqueClasses = Array.from(new Set(allClasses));
      console.log('✨ Turmas únicas:', uniqueClasses);
      
      setAvailableClasses(uniqueClasses as string[]);
      
      if (uniqueClasses.length > 0) {
        console.log('✅ SUCESSO! Turmas carregadas:', uniqueClasses);
        toast.success(`${uniqueClasses.length} turma(s) carregada(s): ${uniqueClasses.join(', ')}`);
      } else {
        console.warn('⚠️ Estudantes existem mas sem turmas definidas');
        toast.warning('Estudantes encontrados mas sem turmas associadas');
        setAvailableClasses([]);
      }
    } catch (error: any) {
      console.error('❌ EXCEÇÃO ao processar turmas:', error);
      console.error('Stack trace:', error.stack);
      toast.error('Erro ao processar dados: ' + error.message);
    }
  };

  const loadBankQuestions = async () => {
    try {
      if (!detectedProjectId) return;

      const token = localStorage.getItem('access_token');
      const response = await fetch(`https://${detectedProjectId}.supabase.co/functions/v1/make-server-83358821/questions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBankQuestions(data.questions || []);
        console.log('✅ Questões do banco carregadas:', data.questions?.length || 0);
      }
    } catch (error) {
      console.error('Error loading bank questions:', error);
    }
  };

  const generateId = () => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const openAddSectionDialog = () => {
    setEditingSectionId(null);
    setSectionName('');
    setSectionSubject('');
    setShowSectionDialog(true);
  };

  const openEditSectionDialog = (section: Section) => {
    setEditingSectionId(section.id);
    setSectionName(section.name);
    setSectionSubject(section.subject);
    setShowSectionDialog(true);
  };

  const handleSaveSection = () => {
    if (!sectionName.trim() || !sectionSubject) {
      toast.error('Preencha o nome e a matéria da seção');
      return;
    }

    setSimuladoData(prev => {
      const sections = [...prev.sections];
      
      if (editingSectionId) {
        const index = sections.findIndex(s => s.id === editingSectionId);
        if (index !== -1) {
          sections[index] = {
            ...sections[index],
            name: sectionName,
            subject: sectionSubject
          };
        }
      } else {
        sections.push({
          id: generateId(),
          name: sectionName,
          subject: sectionSubject,
          questions: [],
          expanded: true
        });
      }
      
      return { ...prev, sections };
    });

    setShowSectionDialog(false);
    toast.success(editingSectionId ? 'Seção atualizada!' : 'Seção criada!');
  };

  const deleteSection = (sectionId: string) => {
    setSimuladoData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
    toast.success('Seção removida');
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setSimuladoData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, expanded: !s.expanded } : s
      )
    }));
  };

  const openAddQuestionDialog = (section: Section) => {
    setCurrentSection(section);
    setQuestionData({
      question: '',
      difficulty: 'Médio',
      options: ['', '', '', ''],
      correctAnswer: 0,
      tags: []
    });
    setShowQuestionDialog(true);
  };

  const handleSaveQuestion = async (saveToBank: boolean = false) => {
    if (!questionData.question.trim()) {
      toast.error('Digite a pergunta');
      return;
    }

    if (questionData.options.some(opt => !opt.trim())) {
      toast.error('Preencha todas as alternativas');
      return;
    }

    if (!currentSection) return;

    const newQuestion: Question = {
      id: generateId(),
      tempId: generateId(),
      isNew: true,
      question: questionData.question,
      subject: currentSection.subject,
      difficulty: questionData.difficulty,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      tags: questionData.tags
    };

    // Add to section
    setSimuladoData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === currentSection.id 
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      )
    }));

    // Save to bank if requested
    if (saveToBank) {
      try {
        const projectId = getProjectId();
        if (!projectId) throw new Error('Project ID not found');

        const token = localStorage.getItem('access_token');
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            question: questionData.question,
            subject: currentSection.subject,
            difficulty: questionData.difficulty,
            options: questionData.options,
            correctAnswer: questionData.correctAnswer,
            tags: questionData.tags
          })
        });

        if (response.ok) {
          toast.success('Questão salva no banco e adicionada à seção!');
          loadBankQuestions();
        } else {
          toast.warning('Questão adicionada à seção, mas não foi salva no banco');
        }
      } catch (error) {
        console.error('Error saving to bank:', error);
        toast.warning('Questão adicionada à seção, mas não foi salva no banco');
      }
    } else {
      toast.success('Questão adicionada à seção!');
    }

    setShowQuestionDialog(false);
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    setSimuladoData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
          : s
      )
    }));
    toast.success('Questão removida');
  };

  const openBankQuestionsDialog = (section: Section) => {
    setCurrentSection(section);
    setSelectedBankQuestions(new Set());
    setShowBankQuestions(true);
  };

  const addBankQuestionsToSection = () => {
    if (!currentSection || selectedBankQuestions.size === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }

    const questionsToAdd = bankQuestions.filter(q => 
      selectedBankQuestions.has(q.id) && q.subject === currentSection.subject
    );

    setSimuladoData(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === currentSection.id 
          ? { ...s, questions: [...s.questions, ...questionsToAdd] }
          : s
      )
    }));

    toast.success(`${questionsToAdd.length} questões adicionadas!`);
    setShowBankQuestions(false);
  };

  const getTotalQuestions = () => {
    return simuladoData.sections.reduce((acc, s) => acc + s.questions.length, 0);
  };

  const canCreateSimulado = () => {
    return (
      simuladoData.title.trim() &&
      simuladoData.grade.trim() &&
      simuladoData.selectedClass &&
      simuladoData.sections.length > 0 &&
      getTotalQuestions() > 0
    );
  };

  const handleCreateSimulado = async () => {
    if (!canCreateSimulado()) {
      toast.error('Preencha todos os campos e adicione pelo menos uma questão');
      return;
    }

    try {
      setLoading(true);
      if (!detectedProjectId) throw new Error('Project ID not found');

      const token = localStorage.getItem('access_token');

      // Prepare exam data
      const allQuestions = simuladoData.sections.flatMap(section => 
        section.questions.map(q => ({
          id: q.id,
          question: q.question,
          subject: q.subject,
          difficulty: q.difficulty,
          options: q.options,
          correctAnswer: q.correctAnswer,
          tags: q.tags,
          section: section.name
        }))
      );

      const examData = {
        title: simuladoData.title,
        description: simuladoData.description,
        grade: simuladoData.grade,
        selectedClass: simuladoData.selectedClass,
        subjects: Array.from(new Set(simuladoData.sections.map(s => s.subject))),
        questions: allQuestions,
        timeLimit: simuladoData.timeLimit,
        type: 'simulado',
        sections: simuladoData.sections.map(s => ({
          name: s.name,
          subject: s.subject,
          questionCount: s.questions.length
        })),
        settings: {
          totalQuestions: allQuestions.length,
          sectionsCount: simuladoData.sections.length
        }
      };

      const response = await fetch(`https://${detectedProjectId}.supabase.co/functions/v1/make-server-83358821/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(examData)
      });

      if (!response.ok) {
        throw new Error('Falha ao criar simulado');
      }

      toast.success('Simulado criado com sucesso!');
      onBack();
    } catch (error: any) {
      console.error('Error creating simulado:', error);
      toast.error('Erro ao criar simulado: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Título do Simulado *
            </label>
            <Input
              placeholder="Ex: Simulado Preparatório - 9º Ano"
              value={simuladoData.title}
              onChange={(e) => setSimuladoData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Descrição
            </label>
            <Textarea
              placeholder="Descreva o simulado e seus objetivos..."
              value={simuladoData.description}
              onChange={(e) => setSimuladoData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Série/Ano *
              </label>
              <Input
                placeholder="Ex: 9º Ano"
                value={simuladoData.grade}
                onChange={(e) => setSimuladoData(prev => ({ ...prev, grade: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Tempo Limite (minutos)
              </label>
              <Input
                type="number"
                value={simuladoData.timeLimit}
                onChange={(e) => setSimuladoData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 120 }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Turma * (para quem será aplicada a prova)
            </label>
            <Select 
              value={simuladoData.selectedClass} 
              onValueChange={(value) => setSimuladoData(prev => ({ ...prev, selectedClass: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhuma turma cadastrada</SelectItem>
                ) : (
                  availableClasses.map(className => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {availableClasses.length === 0 && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Cadastre turmas na seção "Gerenciar Alunos" primeiro
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50 border-2">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Organize por Seções</p>
              <p className="text-sm text-blue-800 mt-1">
                Crie seções (ex: Português, Matemática) e adicione questões a cada uma. 
                Você pode criar novas questões ou importar do banco de questões.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Seções do Simulado</h3>
        <Button onClick={openAddSectionDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Seção
        </Button>
      </div>

      {simuladoData.sections.length === 0 ? (
        <Card className="border-2">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-800 mb-2">Nenhuma Seção Criada</h3>
            <p className="text-slate-600 mb-6">
              Comece criando uma seção para organizar as questões do simulado.
            </p>
            <Button onClick={openAddSectionDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Seção
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {simuladoData.sections.map(section => (
            <Card key={section.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSectionExpanded(section.id)}
                    >
                      {section.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      <p className="text-sm text-slate-600">
                        {section.subject} • {section.questions.length} questões
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditSectionDialog(section)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSection(section.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {section.expanded && (
                <CardContent className="pt-0">
                  <div className="flex space-x-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddQuestionDialog(section)}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Questão
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBankQuestionsDialog(section)}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Do Banco
                    </Button>
                  </div>

                  {section.questions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Nenhuma questão nesta seção</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {section.questions.map((question, idx) => (
                        <Card key={question.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-slate-100 text-slate-800">
                                  Questão {idx + 1}
                                </Badge>
                                <Badge className={
                                  question.difficulty === 'Fácil' ? 'bg-green-100 text-green-800' :
                                  question.difficulty === 'Médio' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }>
                                  {question.difficulty}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteQuestion(section.id, question.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm mb-2">{question.question}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {question.options.map((option, optIdx) => (
                                <div 
                                  key={optIdx}
                                  className={`text-xs p-2 rounded ${
                                    optIdx === question.correctAnswer 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-slate-50'
                                  }`}
                                >
                                  <span className="font-semibold">{String.fromCharCode(65 + optIdx)}) </span>
                                  {option}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {simuladoData.sections.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 border-2">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-600">{getTotalQuestions()}</p>
                <p className="text-sm text-slate-600 mt-1">Questões Totais</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{simuladoData.sections.length}</p>
                <p className="text-sm text-slate-600 mt-1">Seções</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(getTotalQuestions() * 1.5)}
                </p>
                <p className="text-sm text-slate-600 mt-1">Tempo Estimado (min)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Criar Simulado</h1>
            <p className="text-slate-600">Configure e monte seu simulado por seções</p>
          </div>
        </div>
        <Button 
          onClick={handleCreateSimulado}
          disabled={!canCreateSimulado() || loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Criando...' : 'Criar Simulado'}
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-6">
        {[1, 2].map(step => (
          <div key={step} className="flex items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step}
            </div>
            <span className={`ml-3 font-medium ${
              step <= currentStep ? 'text-slate-800' : 'text-slate-500'
            }`}>
              {step === 1 && 'Informações Básicas'}
              {step === 2 && 'Montar Seções e Questões'}
            </span>
            {step < 2 && <div className="w-24 h-1 bg-slate-200 mx-4" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Anterior
        </Button>
        <Button 
          onClick={() => {
            if (currentStep === 1) {
              if (!simuladoData.title || !simuladoData.grade || !simuladoData.selectedClass) {
                toast.error('Preencha título, série e turma antes de prosseguir');
                return;
              }
            }
            setCurrentStep(Math.min(2, currentStep + 1));
          }}
          disabled={currentStep === 2}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Próximo
        </Button>
      </div>

      {/* Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSectionId ? 'Editar Seção' : 'Nova Seção'}
            </DialogTitle>
            <DialogDescription>
              Defina o nome e a matéria desta seção do simulado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome da Seção *</label>
              <Input
                placeholder="Ex: Interpretação de Texto"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Matéria *</label>
              <Select value={sectionSubject} onValueChange={setSectionSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSection} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Seção
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Nova Questão - {currentSection?.name}</DialogTitle>
            <DialogDescription>
              Crie uma questão para esta seção. Você pode opcionalmente salvá-la no banco de questões.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pergunta *</label>
                <Textarea
                  placeholder="Digite a pergunta..."
                  value={questionData.question}
                  onChange={(e) => setQuestionData(prev => ({ ...prev, question: e.target.value }))}
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Dificuldade</label>
                <Select 
                  value={questionData.difficulty} 
                  onValueChange={(value) => setQuestionData(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fácil">Fácil</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Difícil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Alternativas *</label>
                <div className="space-y-3">
                  {questionData.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Checkbox
                        checked={questionData.correctAnswer === idx}
                        onCheckedChange={() => setQuestionData(prev => ({ ...prev, correctAnswer: idx }))}
                      />
                      <span className="font-semibold text-sm w-6">
                        {String.fromCharCode(65 + idx)})
                      </span>
                      <Input
                        placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...questionData.options];
                          newOptions[idx] = e.target.value;
                          setQuestionData(prev => ({ ...prev, options: newOptions }));
                        }}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Marque a checkbox da alternativa correta
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags (opcional)</label>
                <Input
                  placeholder="Ex: gramática, verbos (separar por vírgula)"
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                    setQuestionData(prev => ({ ...prev, tags }));
                  }}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancelar
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={() => handleSaveQuestion(false)}
                className="border-blue-200"
              >
                Adicionar à Seção
              </Button>
              <Button 
                onClick={() => handleSaveQuestion(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar no Banco + Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Questions Dialog */}
      <Dialog open={showBankQuestions} onOpenChange={setShowBankQuestions}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Importar do Banco de Questões</DialogTitle>
            <DialogDescription>
              Selecione questões de {currentSection?.subject} para adicionar à seção
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-3">
              {bankQuestions.filter(q => q.subject === currentSection?.subject).length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma questão de {currentSection?.subject} no banco</p>
                </div>
              ) : (
                bankQuestions
                  .filter(q => q.subject === currentSection?.subject)
                  .map(question => (
                    <Card 
                      key={question.id}
                      className={`cursor-pointer transition-all ${
                        selectedBankQuestions.has(question.id)
                          ? 'border-2 border-blue-500 bg-blue-50' 
                          : 'hover:border-slate-300'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedBankQuestions);
                        if (newSelected.has(question.id)) {
                          newSelected.delete(question.id);
                        } else {
                          newSelected.add(question.id);
                        }
                        setSelectedBankQuestions(newSelected);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            checked={selectedBankQuestions.has(question.id)}
                            onCheckedChange={() => {
                              const newSelected = new Set(selectedBankQuestions);
                              if (newSelected.has(question.id)) {
                                newSelected.delete(question.id);
                              } else {
                                newSelected.add(question.id);
                              }
                              setSelectedBankQuestions(newSelected);
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge className={
                                question.difficulty === 'Fácil' ? 'bg-green-100 text-green-800' :
                                question.difficulty === 'Médio' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {question.difficulty}
                              </Badge>
                              {question.tags && question.tags.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {question.tags[0]}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mb-2">{question.question}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {question.options.map((option, idx) => (
                                <div 
                                  key={idx}
                                  className={`text-xs p-2 rounded ${
                                    idx === question.correctAnswer 
                                      ? 'bg-green-50 border border-green-200' 
                                      : 'bg-slate-50'
                                  }`}
                                >
                                  <span className="font-semibold">{String.fromCharCode(65 + idx)}) </span>
                                  {option}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between pt-4 border-t">
            <div className="text-sm text-slate-600">
              {selectedBankQuestions.size} questões selecionadas
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowBankQuestions(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={addBankQuestionsToSection}
                disabled={selectedBankQuestions.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Adicionar Selecionadas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}