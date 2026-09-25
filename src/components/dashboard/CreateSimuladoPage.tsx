import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Save,
  ArrowLeft,
  BookOpen,
  FileText,
  Search,
  Trash2,
  Edit2,
  GripVertical,
  List,
  Database,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';

interface Question {
  id: string;
  question: string;
  subject: string;
  difficulty: string;
  type: 'multiple-choice' | 'essay';
  options: string[];
  correctAnswer: number;
  tags: string[];
  points: number;
  fromBank?: boolean;
}

interface Section {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

interface SimuladoData {
  title: string;
  description: string;
  grade: string;
  timeLimit: number;
  selectedClass: string;
  sections: Section[];
}

// Normaliza uma questão vinda do backend (que pode ter sido criada fora deste
// editor, ex. via IA/API direta) para o formato que o editor de simulado espera.
function normalizeQuestionForEditing(q: any, idx: number): Question {
  return {
    id: q.id || `q-${idx}-${Date.now()}`,
    question: q.question || '',
    subject: q.subject || '',
    difficulty: q.difficulty || 'medium',
    type: q.questionType === 'essay' || q.type === 'essay' ? 'essay' : 'multiple-choice',
    options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', '', '', ''],
    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
    tags: Array.isArray(q.tags) ? q.tags : [],
    points: q.points || q.weight || 1,
    fromBank: q.fromBank || false
  };
}

// Reconstrói o estado do editor a partir de um simulado já existente, para permitir edição completa.
function buildSimuladoDataFromExam(exam: any): SimuladoData {
  let sections: Section[];

  if (Array.isArray(exam.sections) && exam.sections.length > 0) {
    sections = exam.sections.map((s: any, si: number) => ({
      id: s.id || `section-${si}`,
      name: s.name || `Seção ${si + 1}`,
      description: s.description || '',
      questions: (s.questions || []).map(normalizeQuestionForEditing)
    }));
  } else {
    sections = [{
      id: 'section-1',
      name: 'Questões',
      description: '',
      questions: (exam.questions || []).map(normalizeQuestionForEditing)
    }];
  }

  return {
    title: exam.title || '',
    description: exam.description || '',
    grade: exam.grade || '',
    timeLimit: exam.timeLimit || 120,
    selectedClass: exam.selectedClass || '',
    sections
  };
}

export function CreateSimuladoPage({ onBack, examToEdit }: { onBack: () => void; examToEdit?: any }) {
  const [simuladoData, setSimuladoData] = useState<SimuladoData>(() =>
    examToEdit
      ? buildSimuladoDataFromExam(examToEdit)
      : {
          title: '',
          description: '',
          grade: '',
          timeLimit: 120,
          selectedClass: '',
          sections: []
        }
  );

  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Section management
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  
  // Question management
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    subject: '',
    difficulty: 'Médio',
    type: 'multiple-choice' as 'multiple-choice' | 'essay',
    options: ['', '', '', '', ''],
    correctAnswer: 0,
    tags: [] as string[],
    points: 1
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  // Banco de questões: por padrão, toda questão nova criada aqui também vai para o banco
  const [alsoSaveToBank, setAlsoSaveToBank] = useState(true);
  const [savedToBankIds, setSavedToBankIds] = useState<Set<string>>(new Set());
  const [savingToBankIds, setSavingToBankIds] = useState<Set<string>>(new Set());
  const [isSavingAllToBank, setIsSavingAllToBank] = useState(false);

  useEffect(() => {
    loadBankQuestions();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await apiService.getStudents();
      if (response && response.students) {
        const students = response.students || [];
        const classes = Array.from(new Set(students.map((s: any) => s.class).filter(Boolean)));
        setAvailableClasses(classes as string[]);
      } else {
        setAvailableClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setAvailableClasses([]);
      toast.error('Erro ao carregar turmas');
    }
  };

  const loadBankQuestions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getQuestions();
      if (response && response.questions && Array.isArray(response.questions)) {
        const questionsList = response.questions.filter((q: any) => q && q.subject && q.question);
        setBankQuestions(questionsList);
      } else {
        setBankQuestions([]);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Erro ao carregar banco de questões');
      setBankQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  const isQuestionInBank = (question: Question) =>
    !!question.fromBank ||
    savedToBankIds.has(question.id) ||
    bankQuestions.some(b => normalizeText(b.question) === normalizeText(question.question));

  const newQuestionAlreadyInBank =
    !!newQuestion.question.trim() &&
    bankQuestions.some(b => normalizeText(b.question) === normalizeText(newQuestion.question));

  // Salva uma questão no Banco de Questões. A matéria é obrigatória no banco: se o professor
  // deixou em branco, usa o nome da seção (ex: "Matemática") em vez de falhar.
  const saveQuestionToBank = async (
    question: Question,
    sectionName?: string,
    skipInBankCheck = false
  ): Promise<boolean> => {
    if (!skipInBankCheck && isQuestionInBank(question)) return true;

    setSavingToBankIds(prev => new Set(prev).add(question.id));
    try {
      const response = await apiService.createQuestion({
        question: question.question,
        subject: question.subject?.trim() || sectionName || 'Geral',
        difficulty: question.difficulty || 'Médio',
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        tags: question.tags,
        points: question.points,
        weight: question.points
      });

      if (response && !response.error) {
        setSavedToBankIds(prev => new Set(prev).add(question.id));
        return true;
      }
      throw new Error(response?.error || 'Erro ao salvar');
    } catch (error) {
      console.error('Error saving to bank:', error);
      return false;
    } finally {
      setSavingToBankIds(prev => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
    }
  };

  const handleAddSection = () => {
    setSectionName('');
    setSectionDescription('');
    setEditingSection(null);
    setShowSectionDialog(true);
  };

  const handleEditSection = (section: Section) => {
    setSectionName(section.name);
    setSectionDescription(section.description);
    setEditingSection(section);
    setShowSectionDialog(true);
  };

  const handleSaveSection = () => {
    if (!sectionName.trim()) {
      toast.error('Digite um nome para a seção');
      return;
    }

    if (editingSection) {
      setSimuladoData(prev => ({
        ...prev,
        sections: prev.sections.map(s => 
          s.id === editingSection.id 
            ? { ...s, name: sectionName, description: sectionDescription }
            : s
        )
      }));
      toast.success('Seção atualizada!');
    } else {
      const newSection: Section = {
        id: `section_${Date.now()}`,
        name: sectionName,
        description: sectionDescription,
        questions: []
      };
      setSimuladoData(prev => ({
        ...prev,
        sections: [...prev.sections, newSection]
      }));
      toast.success('Seção criada!');
    }
    
    setShowSectionDialog(false);
    setSectionName('');
    setSectionDescription('');
    setEditingSection(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (confirm('Deseja realmente excluir esta seção e todas as suas questões?')) {
      setSimuladoData(prev => ({
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId)
      }));
      toast.success('Seção excluída');
    }
  };

  const handleAddQuestion = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setNewQuestion({
      question: '',
      subject: '',
      difficulty: 'Médio',
      type: 'multiple-choice',
      options: ['', '', '', '', ''],
      correctAnswer: 0,
      tags: [],
      points: 1
    });
    setEditingQuestionId(null);
    setAlsoSaveToBank(true);
    setShowQuestionDialog(true);
  };

  const handleEditQuestion = (sectionId: string, question: Question) => {
    setCurrentSectionId(sectionId);
    setAlsoSaveToBank(true);
    setNewQuestion({
      question: question.question,
      subject: question.subject,
      difficulty: question.difficulty,
      type: question.type,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      tags: [...question.tags],
      points: question.points
    });
    setEditingQuestionId(question.id);
    setShowQuestionDialog(true);
  };

  const handleSaveQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast.error('Digite o enunciado da questão');
      return;
    }
    
    if (newQuestion.type === 'multiple-choice') {
      const filledOptions = newQuestion.options.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        toast.error('Preencha pelo menos 2 alternativas');
        return;
      }
    }

    const questionData: Question = {
      id: editingQuestionId || `question_${Date.now()}`,
      question: newQuestion.question,
      subject: newQuestion.subject,
      difficulty: newQuestion.difficulty,
      type: newQuestion.type,
      options: newQuestion.options,
      correctAnswer: newQuestion.correctAnswer,
      tags: newQuestion.tags,
      points: newQuestion.points,
      fromBank: false
    };

    setSimuladoData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === currentSectionId) {
          if (editingQuestionId) {
            return {
              ...section,
              questions: section.questions.map(q => 
                q.id === editingQuestionId ? questionData : q
              )
            };
          } else {
            return {
              ...section,
              questions: [...section.questions, questionData]
            };
          }
        }
        return section;
      })
    }));

    toast.success(editingQuestionId ? 'Questão atualizada!' : 'Questão adicionada!');

    // Se a questão foi editada, o vínculo antigo com o banco não vale mais (o texto pode ter mudado)
    if (editingQuestionId) {
      setSavedToBankIds(prev => {
        const next = new Set(prev);
        next.delete(editingQuestionId);
        return next;
      });
    }

    if (alsoSaveToBank && !newQuestionAlreadyInBank) {
      const sectionName = simuladoData.sections.find(s => s.id === currentSectionId)?.name;
      saveQuestionToBank({ ...questionData, fromBank: false }, sectionName, true).then(ok => {
        if (ok) {
          toast.success('Questão também salva no Banco de Questões!');
          loadBankQuestions();
        } else {
          toast.error('A questão foi adicionada ao simulado, mas não foi salva no Banco de Questões. Use o botão "Salvar no Banco" na questão.');
        }
      });
    }

    setShowQuestionDialog(false);
    setCurrentSectionId(null);
    setEditingQuestionId(null);
  };

  const handleAddFromBank = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setSearchTerm('');
    setFilterDifficulty('all');
    setFilterSubject('all');
    setShowBankDialog(true);
  };

  const handleAddQuestionFromBank = (question: Question) => {
    const newQuestion: Question = {
      ...question,
      id: `bank_${question.id}_${Date.now()}`,
      fromBank: true
    };

    setSimuladoData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === currentSectionId) {
          return {
            ...section,
            questions: [...section.questions, newQuestion]
          };
        }
        return section;
      })
    }));

    toast.success('Questão adicionada do banco!');
  };

  const handleDeleteQuestion = (sectionId: string, questionId: string) => {
    if (confirm('Deseja realmente excluir esta questão?')) {
      setSimuladoData(prev => ({
        ...prev,
        sections: prev.sections.map(section => {
          if (section.id === sectionId) {
            return {
              ...section,
              questions: section.questions.filter(q => q.id !== questionId)
            };
          }
          return section;
        })
      }));
      toast.success('Questão excluída');
    }
  };

  const handleSaveQuestionToBank = async (question: Question, sectionName?: string) => {
    const ok = await saveQuestionToBank(question, sectionName);
    if (ok) {
      toast.success('Questão salva no Banco de Questões!');
      loadBankQuestions();
    } else {
      toast.error('Erro ao salvar no Banco de Questões');
    }
  };

  const getQuestionsNotInBank = () => {
    const seen = new Set<string>();
    const pending: { question: Question; sectionName: string }[] = [];

    simuladoData.sections.forEach(section => {
      section.questions.forEach(q => {
        const key = normalizeText(q.question);
        if (!key || seen.has(key) || isQuestionInBank(q)) return;
        seen.add(key);
        pending.push({ question: q, sectionName: section.name });
      });
    });

    return pending;
  };

  const handleSaveAllToBank = async () => {
    const pending = getQuestionsNotInBank();

    if (pending.length === 0) {
      toast.info('Todas as questões deste simulado já estão no Banco de Questões');
      return;
    }

    setIsSavingAllToBank(true);
    let saved = 0;
    let failed = 0;

    for (const { question, sectionName } of pending) {
      const ok = await saveQuestionToBank(question, sectionName);
      if (ok) saved++;
      else failed++;
    }

    setIsSavingAllToBank(false);
    await loadBankQuestions();

    if (failed === 0) {
      toast.success(`${saved} questão(ões) salva(s) no Banco de Questões!`);
    } else {
      toast.error(`${saved} salva(s) e ${failed} com erro. Clique novamente para tentar as que faltam.`);
    }
  };

  const getFilteredBankQuestions = () => {
    let filtered = [...bankQuestions];
    
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === filterDifficulty);
    }
    
    if (filterSubject !== 'all') {
      filtered = filtered.filter(q => q.subject === filterSubject);
    }
    
    return filtered;
  };

  const getTotalQuestions = () => {
    return simuladoData.sections.reduce((sum, section) => sum + section.questions.length, 0);
  };

  const getTotalPoints = () => {
    return simuladoData.sections.reduce((sum, section) => 
      sum + section.questions.reduce((qSum, q) => qSum + q.points, 0), 0
    );
  };

  const canCreateSimulado = () => {
    return (
      simuladoData.title &&
      simuladoData.grade &&
      simuladoData.selectedClass &&
      simuladoData.sections.length > 0 &&
      getTotalQuestions() > 0
    );
  };

  const handleCreateSimulado = async () => {
    if (!canCreateSimulado()) {
      toast.error('Verifique os dados do simulado antes de salvar');
      return;
    }

    try {
      setLoading(true);
      
      // 🔥 CORREÇÃO CRÍTICA: Criar array flat de questões E manter seções
      const allQuestions = simuladoData.sections.flatMap(section => 
        section.questions.map(q => ({
          ...q,
          sectionId: section.id,
          sectionName: section.name
        }))
      );

      // Coletar todas as matérias únicas
      const allSubjects = Array.from(new Set(
        simuladoData.sections.flatMap(section => 
          section.questions.map(q => q.subject).filter(Boolean)
        )
      ));

      console.log('🚀 Criando simulado com estrutura corrigida:', {
        totalQuestions: allQuestions.length,
        sections: simuladoData.sections.length,
        subjects: allSubjects
      });

      const examData = {
        title: simuladoData.title,
        description: simuladoData.description,
        grade: simuladoData.grade,
        selectedClass: simuladoData.selectedClass,
        timeLimit: simuladoData.timeLimit,
        type: 'simulado',
        // ✅ Array flat de questões para compatibilidade
        questions: allQuestions,
        // ✅ Seções preservadas para estrutura
        sections: simuladoData.sections.map(section => ({
          id: section.id,
          name: section.name,
          description: section.description,
          questions: section.questions
        })),
        // ✅ Metadados consolidados
        subjects: allSubjects,
        settings: {
          totalQuestions: allQuestions.length,
          totalSections: simuladoData.sections.length,
          totalPoints: getTotalPoints()
        }
      };

      console.log('📤 Enviando dados do simulado:', examData);

      const response = examToEdit
        ? await apiService.updateExam(examToEdit.id, examData)
        : await apiService.createExam(examData);

      if (response && !response.error) {
        toast.success(examToEdit ? 'Simulado atualizado com sucesso!' : 'Simulado criado com sucesso!');
        onBack();
      } else {
        throw new Error(response.error || (examToEdit ? 'Falha ao atualizar simulado' : 'Falha ao criar simulado'));
      }
    } catch (error: any) {
      console.error('❌ Error saving simulado:', error);
      toast.error((examToEdit ? 'Erro ao atualizar simulado: ' : 'Erro ao criar simulado: ') + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const uniqueSubjects = Array.from(new Set(bankQuestions.map(q => q.subject)));
  const pendingBankCount = getQuestionsNotInBank().length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{examToEdit ? 'Editar Simulado' : 'Criar Simulado'}</h1>
            <p className="text-slate-600">
              {examToEdit ? 'Altere as questões, seções e configurações deste simulado' : 'Configure um simulado organizado em seções'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleCreateSimulado}
          disabled={!canCreateSimulado() || loading}
          className="bg-zinc-800 hover:bg-zinc-900"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : examToEdit ? 'Salvar Alterações' : 'Salvar Simulado'}
        </Button>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        {[1, 2].map(step => (
          <div key={step} className="flex items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step <= currentStep 
                  ? 'bg-zinc-800 text-white shadow-md' 
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step}
            </div>
            <span className={`ml-3 font-medium ${
              step <= currentStep ? 'text-slate-800' : 'text-slate-500'
            }`}>
              {step === 1 && 'Informações Básicas'}
              {step === 2 && 'Criar Seções e Questões'}
            </span>
            {step < 2 && <div className="w-24 h-1 bg-slate-200 mx-4" />}
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título do Simulado *
                </label>
                <Input
                  placeholder="Ex: Simulado Preparatório - 9º Ano"
                  value={simuladoData.title}
                  onChange={(e) => setSimuladoData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Série/Ano *
                  </label>
                  <Input
                    placeholder="Ex: 9º Ano"
                    value={simuladoData.grade}
                    onChange={(e) => setSimuladoData(prev => ({ ...prev, grade: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Turma *
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          <Card className="border-zinc-200 bg-zinc-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-zinc-800 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-zinc-900">Organize seu simulado em seções</p>
                  <p className="text-sm text-zinc-900 mt-1">
                    Crie seções como "Português", "Matemática", etc. Em cada seção você pode adicionar questões novas ou do banco.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-400 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white overflow-hidden">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-zinc-900" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold">Banco de Questões</p>
                  <p className="text-sm text-zinc-300">
                    {getTotalQuestions() === 0
                      ? 'As questões que você criar aqui podem ser salvas no banco para reutilizar em outros simulados.'
                      : pendingBankCount > 0
                        ? `${pendingBankCount} questão(ões) deste simulado ainda não estão no banco. Salve para reutilizar em outros simulados.`
                        : 'Todas as questões deste simulado já estão no Banco de Questões.'}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleSaveAllToBank}
                disabled={isSavingAllToBank || pendingBankCount === 0}
                className="bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold h-12 px-6 flex-shrink-0 disabled:bg-zinc-700 disabled:text-zinc-300 disabled:opacity-100"
              >
                {isSavingAllToBank ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Salvando no banco...
                  </>
                ) : pendingBankCount > 0 ? (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    Salvar todas no Banco ({pendingBankCount})
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {getTotalQuestions() === 0 ? 'Nenhuma questão ainda' : 'Tudo salvo no Banco'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800">Seções do Simulado</h3>
            <Button onClick={handleAddSection} className="bg-zinc-800 hover:bg-zinc-900">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Seção
            </Button>
          </div>

          {simuladoData.sections.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <List className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-800 mb-2">Nenhuma Seção Criada</h3>
                <p className="text-slate-600 mb-6">
                  Comece criando seções para organizar as questões do seu simulado.
                </p>
                <Button onClick={handleAddSection} className="bg-zinc-800 hover:bg-zinc-900">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Seção
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {simuladoData.sections.map((section) => (
                <Card key={section.id} className="border-2">
                  <CardHeader className="bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                        <div>
                          <CardTitle className="text-lg">{section.name}</CardTitle>
                          {section.description && (
                            <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-zinc-100 text-zinc-900">
                          {section.questions.length} questões
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          {section.questions.reduce((sum, q) => sum + q.points, 0)} pts
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditSection(section)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {section.questions.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 mb-4">Nenhuma questão nesta seção</p>
                        <div className="flex justify-center space-x-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddQuestion(section.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Questão
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFromBank(section.id)}
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Adicionar do Banco
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {section.questions.map((question, qIndex) => (
                          <Card key={question.id} className="border">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center space-x-2 flex-wrap gap-1 min-w-0">
                                  <Badge variant="outline">
                                    Q{qIndex + 1}
                                  </Badge>
                                  <Badge className="bg-teal-100 text-teal-800">
                                    {question.points}pt{question.points !== 1 && 's'}
                                  </Badge>
                                  <Badge className={
                                    question.type === 'essay' 
                                      ? 'bg-zinc-100 text-zinc-900'
                                      : 'bg-cyan-100 text-cyan-800'
                                  }>
                                    {question.type === 'essay' ? 'Dissertativa' : 'Múltipla Escolha'}
                                  </Badge>
                                  <Badge className={
                                    question.difficulty === 'Fácil' ? 'bg-green-100 text-green-800' :
                                    question.difficulty === 'Médio' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }>
                                    {question.difficulty}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-end flex-wrap gap-2 flex-shrink-0">
                                  {isQuestionInBank(question) ? (
                                    <Badge className="bg-green-100 text-green-800 border border-green-200 gap-1.5 py-1.5 px-2.5 whitespace-nowrap">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      No Banco de Questões
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveQuestionToBank(question, section.name)}
                                      disabled={savingToBankIds.has(question.id) || isSavingAllToBank}
                                      className="bg-amber-400 hover:bg-amber-500 text-zinc-900 font-semibold whitespace-nowrap"
                                    >
                                      {savingToBankIds.has(question.id) ? (
                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                      ) : (
                                        <Database className="w-4 h-4 mr-1.5" />
                                      )}
                                      Salvar no Banco
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditQuestion(section.id, question)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteQuestion(section.id, question.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-slate-800 mb-3">{question.question}</p>
                              {question.type === 'multiple-choice' && (
                                <div className="grid grid-cols-2 gap-2">
                                  {question.options.filter(opt => opt.trim()).map((option, idx) => (
                                    <div
                                      key={idx}
                                      className={`text-xs p-2 rounded ${
                                        idx === question.correctAnswer
                                          ? 'bg-green-50 text-green-800 border border-green-200'
                                          : 'bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      <span className="font-semibold">{String.fromCharCode(65 + idx)}) </span>
                                      {option}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {question.type === 'essay' && (
                                <div className="bg-zinc-50 text-zinc-900 p-2 rounded text-xs">
                                  Questão dissertativa - Resposta em texto livre
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        <div className="flex justify-center space-x-3 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddQuestion(section.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Questão
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFromBank(section.id)}
                          >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Adicionar do Banco
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="bg-gradient-to-r from-zinc-50 to-teal-50 border-zinc-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-zinc-800">{getTotalQuestions()}</p>
                  <p className="text-sm text-slate-600 mt-1">Questões</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-600">{getTotalPoints()}</p>
                  <p className="text-sm text-slate-600 mt-1">Pontos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{simuladoData.timeLimit}</p>
                  <p className="text-sm text-slate-600 mt-1">Minutos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
          className="bg-zinc-800 hover:bg-zinc-900"
        >
          Próximo
        </Button>
      </div>

      {/* Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Editar Seção' : 'Nova Seção'}
            </DialogTitle>
            <DialogDescription>
              Dê um nome para a seção (ex: Português, Matemática)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome da Seção *
              </label>
              <Input
                placeholder="Ex: Matemática"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descrição (opcional)
              </label>
              <Textarea
                placeholder="Descreva o conteúdo desta seção..."
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowSectionDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveSection}
                className="bg-zinc-800 hover:bg-zinc-900"
              >
                {editingSection ? 'Salvar' : 'Criar Seção'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingQuestionId ? 'Editar Questão' : 'Nova Questão'}
            </DialogTitle>
            <DialogDescription>
              Crie uma questão personalizada para esta seção
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-310px)] min-h-[160px] pr-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Questão *
                </label>
                <Select 
                  value={newQuestion.type} 
                  onValueChange={(value: 'multiple-choice' | 'essay') => setNewQuestion(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                    <SelectItem value="essay">Dissertativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enunciado da Questão *
                </label>
                <Textarea
                  placeholder="Digite o enunciado completo da questão..."
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Matéria
                  </label>
                  <Input
                    placeholder="Ex: Matemática"
                    value={newQuestion.subject}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dificuldade
                  </label>
                  <Select 
                    value={newQuestion.difficulty} 
                    onValueChange={(value) => setNewQuestion(prev => ({ ...prev, difficulty: value }))}
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Pontos *
                  </label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={newQuestion.points}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, points: parseFloat(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              {newQuestion.type === 'multiple-choice' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alternativas * (mínimo 2, máximo 5)
                  </label>
                  <div className="space-y-3">
                    {newQuestion.options.map((option, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="correct-answer"
                          checked={newQuestion.correctAnswer === idx}
                          onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: idx }))}
                          className="w-4 h-4 text-green-600"
                        />
                        <div className="flex-1">
                          <Input
                            placeholder={`Alternativa ${String.fromCharCode(65 + idx)} ${idx >= 4 ? '(opcional)' : ''}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newQuestion.options];
                              newOptions[idx] = e.target.value;
                              setNewQuestion(prev => ({ ...prev, options: newOptions }));
                            }}
                          />
                        </div>
                        {newQuestion.correctAnswer === idx && (
                          <Badge className="bg-green-100 text-green-800">Correta</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Selecione o círculo à esquerda para marcar a resposta correta. A alternativa E é opcional.
                  </p>
                </div>
              )}

              {newQuestion.type === 'essay' && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <p className="text-sm text-zinc-900">
                    <strong>Questão Dissertativa:</strong> O aluno responderá em texto livre. Você poderá corrigir manualmente após a aplicação do simulado.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {newQuestionAlreadyInBank ? (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-green-900">Esta questão já está no Banco de Questões</p>
                <p className="text-sm text-green-800">Ela não será duplicada no banco.</p>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-xl border-2 p-4 flex items-center justify-between gap-4 transition-colors ${
                alsoSaveToBank ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900">Salvar também no Banco de Questões</p>
                  <p className="text-sm text-slate-600">
                    {alsoSaveToBank
                      ? 'Esta questão ficará guardada no banco para reutilizar em outros simulados.'
                      : 'Esta questão ficará apenas neste simulado (você ainda pode salvá-la no banco depois).'}
                  </p>
                </div>
              </div>
              <Switch
                checked={alsoSaveToBank}
                onCheckedChange={setAlsoSaveToBank}
                aria-label="Salvar também no Banco de Questões"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveQuestion}
              className="bg-zinc-800 hover:bg-zinc-900"
            >
              {editingQuestionId ? 'Salvar Alterações' : 'Adicionar Questão'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Questions Dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">Banco de Questões</DialogTitle>
            <DialogDescription>
              Selecione questões do banco para adicionar a esta seção
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col px-6 py-4 overflow-hidden">
            <div className="flex space-x-3 mb-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Buscar questões por texto, matéria ou tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as matérias</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas dificuldades</SelectItem>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-slate-600 mb-3 px-1">
              {getFilteredBankQuestions().length} questão(ões) encontrada(s)
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <div className="space-y-3">
                {getFilteredBankQuestions().length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 mb-2">Nenhuma questão encontrada</p>
                    <p className="text-sm text-slate-400">
                      Tente ajustar os filtros ou crie novas questões
                    </p>
                  </div>
                ) : (
                  getFilteredBankQuestions().map(question => (
                    <Card 
                      key={question.id}
                      className="hover:border-zinc-300 transition-all"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex items-center space-x-2 flex-wrap gap-1 flex-1">
                            <Badge variant="outline" className="whitespace-nowrap">{question.subject}</Badge>
                            <Badge className={
                              question.type === 'essay' 
                                ? 'bg-zinc-100 text-zinc-900'
                                : 'bg-cyan-100 text-cyan-800'
                            }>
                              {question.type === 'essay' ? 'Dissertativa' : 'Múltipla Escolha'}
                            </Badge>
                            <Badge className={
                              question.difficulty === 'Fácil' ? 'bg-green-100 text-green-800' :
                              question.difficulty === 'Médio' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {question.difficulty}
                            </Badge>
                            <Badge className="bg-teal-100 text-teal-800">
                              {question.points} pt{question.points !== 1 && 's'}
                            </Badge>
                            {question.tags && question.tags.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {question.tags[0]}
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddQuestionFromBank(question)}
                            className="bg-amber-500 hover:bg-amber-600 text-zinc-900 whitespace-nowrap flex-shrink-0"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
                          </Button>
                        </div>
                        
                        <p className="text-sm text-slate-800 mb-3 leading-relaxed">{question.question}</p>
                        
                        {question.type === 'multiple-choice' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {question.options.filter(opt => opt.trim()).map((option, idx) => (
                              <div 
                                key={idx}
                                className={`text-xs p-2 rounded ${
                                  idx === question.correctAnswer 
                                    ? 'bg-green-50 text-green-800 border border-green-200' 
                                    : 'bg-slate-50 text-slate-600'
                                }`}
                              >
                                <span className="font-semibold">{String.fromCharCode(65 + idx)}) </span>
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.type === 'essay' && (
                          <div className="bg-zinc-50 text-zinc-900 p-2 rounded text-xs">
                            Questão dissertativa - Resposta em texto livre
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
            <Button variant="outline" onClick={() => setShowBankDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}