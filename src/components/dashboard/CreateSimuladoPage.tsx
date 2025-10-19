import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Plus, 
  Save, 
  Eye, 
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  subject: string;
  difficulty: string;
  options: string[];
  correctAnswer: number;
  tags: string[];
  selected?: boolean;
}

interface Subject {
  name: string;
  questionsCount: number;
  selectedQuestionsCount: number;
  color: string;
}

export function CreateSimuladoPage({ onBack }: { onBack: () => void }) {
  const [simuladoData, setSimuladoData] = useState({
    title: '',
    description: '',
    grade: '',
    timeLimit: 120,
    selectedClass: ''
  });

  const [subjects, setSubjects] = useState<Subject[]>([
    { name: 'Matemática', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-blue-100 text-blue-800' },
    { name: 'Português', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-green-100 text-green-800' },
    { name: 'História', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-purple-100 text-purple-800' },
    { name: 'Geografia', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-yellow-100 text-yellow-800' },
    { name: 'Ciências', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-red-100 text-red-800' },
    { name: 'Literatura', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-indigo-100 text-indigo-800' },
    { name: 'Filosofia', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-pink-100 text-pink-800' },
    { name: 'Sociologia', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-orange-100 text-orange-800' },
    { name: 'Produção Textual', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-teal-100 text-teal-800' },
    { name: 'Artes', questionsCount: 0, selectedQuestionsCount: 0, color: 'bg-rose-100 text-rose-800' }
  ]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [currentSubject, setCurrentSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  useEffect(() => {
    loadQuestions();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/students`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const students = data.students || [];
        const classes = Array.from(new Set(students.map((s: any) => s.class).filter(Boolean)));
        setAvailableClasses(classes as string[]);
        console.log('✓ Loaded classes:', classes);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      console.log('=== Loading questions for simulado creation ===');
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/questions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load questions:', response.status, errorText);
        toast.error('Erro ao carregar questões');
        setQuestions([]);
        return;
      }

      const data = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid response format - questions is not an array');
        toast.error('Erro no formato dos dados recebidos');
        setQuestions([]);
        return;
      }
      
      const questionsList = data.questions.filter((q: any) => q && q.subject && q.question);
      console.log(`✓ Loaded ${questionsList.length} valid questions`);
      setQuestions(questionsList.map(q => ({ ...q, selected: false })));
      
      // Update subject counts
      const questionsBySubject = questionsList.reduce((acc: any, q: Question) => {
        if (q && q.subject) {
          acc[q.subject] = (acc[q.subject] || 0) + 1;
        }
        return acc;
      }, {});

      setSubjects(prev => prev.map(subject => ({
        ...subject,
        questionsCount: questionsBySubject[subject.name] || 0
      })));
      
      if (questionsList.length === 0) {
        toast.info('Crie questões no Banco de Questões para montar um simulado', {
          duration: 5000
        });
      }
      
    } catch (error: any) {
      console.error('Exception loading questions:', error);
      toast.error('Erro ao carregar questões: ' + (error.message || 'Erro desconhecido'));
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const openQuestionSelector = (subjectName: string) => {
    setCurrentSubject(subjectName);
    setShowQuestionSelector(true);
    setSearchTerm('');
    setFilterDifficulty('all');
  };

  const toggleQuestionSelection = (questionId: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, selected: !q.selected } : q
    ));
  };

  const getSubjectQuestions = (subjectName: string) => {
    let filtered = questions.filter(q => q.subject === subjectName);
    
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.tags && q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }
    
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === filterDifficulty);
    }
    
    return filtered;
  };

  const getSelectedQuestions = () => {
    return questions.filter(q => q.selected);
  };

  const getSubjectSelectedCount = (subjectName: string) => {
    return questions.filter(q => q.subject === subjectName && q.selected).length;
  };

  const canCreateSimulado = () => {
    const selectedQuestions = getSelectedQuestions();
    return selectedQuestions.length > 0 && simuladoData.title && simuladoData.grade && simuladoData.selectedClass;
  };

  const handleCreateSimulado = async () => {
    if (!canCreateSimulado()) {
      toast.error('Verifique os dados do simulado antes de prosseguir');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const selectedQuestions = getSelectedQuestions();
      
      // Group by subject for metadata
      const subjectGroups = selectedQuestions.reduce((acc: any, q) => {
        if (!acc[q.subject]) acc[q.subject] = [];
        acc[q.subject].push(q);
        return acc;
      }, {});

      const examData = {
        title: simuladoData.title,
        description: simuladoData.description,
        grade: simuladoData.grade,
        selectedClass: simuladoData.selectedClass,
        subjects: Object.keys(subjectGroups),
        questions: selectedQuestions.map(q => ({
          id: q.id,
          question: q.question,
          subject: q.subject,
          difficulty: q.difficulty,
          options: q.options,
          correctAnswer: q.correctAnswer,
          tags: q.tags
        })),
        timeLimit: simuladoData.timeLimit,
        type: 'simulado',
        settings: {
          totalQuestions: selectedQuestions.length,
          questionsBySubject: Object.keys(subjectGroups).reduce((acc: any, subject) => {
            acc[subject] = subjectGroups[subject].length;
            return acc;
          }, {})
        }
      };

      console.log('Creating simulado with data:', {
        title: examData.title,
        subjects: examData.subjects,
        totalQuestions: examData.questions.length,
        selectedClass: examData.selectedClass
      });
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(examData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create simulado:', response.status, errorText);
        throw new Error('Falha ao criar simulado');
      }

      const result = await response.json();
      console.log('Simulado created successfully:', result.exam?.id);
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
      {questions.length === 0 && (
        <Card className="seice-card border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-900">Atenção: Nenhuma questão encontrada</p>
                <p className="text-sm text-orange-800 mt-1">
                  Você precisa criar questões no <strong>Banco de Questões</strong> antes de criar um simulado.
                  Acesse o menu lateral e crie questões em diferentes matérias.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="seice-card">
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
            {simuladoData.selectedClass && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Os cartões resposta serão gerados automaticamente para todos os alunos desta turma
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {questions.length === 0 ? (
        <Card className="seice-card">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-800 mb-2">Nenhuma Questão Disponível</h3>
            <p className="text-slate-600 mb-6">
              Você precisa criar questões no Banco de Questões antes de criar um simulado.
            </p>
            <Button 
              onClick={onBack}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="seice-card border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Seleção Manual de Questões</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Clique em cada matéria para escolher as questões específicas que deseja incluir no simulado.
                    Você pode escolher quantas questões quiser de cada matéria.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="seice-card">
            <CardHeader>
              <CardTitle>Selecione as Questões por Matéria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.filter(s => s.questionsCount > 0).map(subject => {
                  const selectedCount = getSubjectSelectedCount(subject.name);
                  return (
                    <Card 
                      key={subject.name}
                      className="seice-card hover:shadow-md transition-all cursor-pointer border-2"
                      onClick={() => openQuestionSelector(subject.name)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg ${subject.color} flex items-center justify-center`}>
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800">{subject.name}</h3>
                              <p className="text-sm text-slate-600">
                                {subject.questionsCount} questões disponíveis
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center space-x-2">
                            {selectedCount > 0 ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-700">
                              {selectedCount} selecionada{selectedCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Escolher Questões
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {subjects.every(s => s.questionsCount === 0) && (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhuma questão disponível em nenhuma matéria</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="seice-card bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-blue-600">{getSelectedQuestions().length}</p>
                  <p className="text-sm text-slate-600 mt-1">Questões Selecionadas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-600">
                    {Object.keys(
                      getSelectedQuestions().reduce((acc: any, q) => {
                        acc[q.subject] = true;
                        return acc;
                      }, {})
                    ).length}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Matérias Incluídas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {Math.round(getSelectedQuestions().length * 1.5)}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Tempo Estimado (min)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Criar Simulado</h1>
            <p className="text-slate-600">Configure um simulado com questões selecionadas</p>
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
              {step === 2 && 'Selecionar Questões'}
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
                toast.error('Preencha o título, série e turma antes de prosseguir');
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

      {/* Question Selector Dialog */}
      <Dialog open={showQuestionSelector} onOpenChange={setShowQuestionSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Selecionar Questões - {currentSubject}</span>
              <Badge className="bg-blue-100 text-blue-800">
                {getSubjectSelectedCount(currentSubject)} selecionada(s)
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Selecione as questões que deseja incluir no simulado. Use os filtros para facilitar a busca.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Buscar questões..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as dificuldades</SelectItem>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Questions List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {getSubjectQuestions(currentSubject).map(question => (
                  <Card 
                    key={question.id}
                    className={`seice-card cursor-pointer transition-all ${
                      question.selected 
                        ? 'border-2 border-blue-500 bg-blue-50' 
                        : 'hover:border-slate-300'
                    }`}
                    onClick={() => toggleQuestionSelection(question.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox 
                          checked={question.selected || false}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
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
                          <p className="text-sm text-slate-800 mb-2">{question.question}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {question.options.map((option, idx) => (
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {getSubjectQuestions(currentSubject).length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma questão encontrada</p>
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowQuestionSelector(false)}>
                Fechar
              </Button>
              <Button 
                onClick={() => setShowQuestionSelector(false)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirmar Seleção
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}