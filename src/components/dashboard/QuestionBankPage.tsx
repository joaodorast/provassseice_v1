import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  Edit, 
  Trash2, 
  Eye,
  FileText,
  Tag,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { apiService } from '../../utils/api';
import { toast } from 'sonner@2.0.3';
import { ExcelExportDialog } from '../ExcelExportDialog';
import { ExcelTemplates, quickExport, importFromExcel } from '../../utils/excel-utils';

export function QuestionBankPage() {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    subject: '',
    grade: '',
    difficulty: '',
    questionType: 'multiple-choice' as 'multiple-choice' | 'essay',
    type: 'Múltipla Escolha',
    options: ['', '', '', ''],
    correctAnswer: 0,
    tags: '',
    weight: 1.0
  });

  useEffect(() => {
    loadQuestions();
    loadSubjectsAndSeries();
  }, []);

  const loadSubjectsAndSeries = async () => {
    try {
      const response = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'your-project-id'}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSubjects(result.subjects || []);
          setSeries(result.series || []);
        }
      }
    } catch (error) {
      console.error('Error loading subjects and series:', error);
      // Use valores padrão se falhar
      setSubjects(['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Literatura']);
     setSeries(['5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano']);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      console.log('=== Loading questions from backend ===');
      const response = await apiService.getQuestions();
      
      console.log('Response received:', { 
        success: response.success, 
        hasQuestions: !!response.questions,
        count: response.count,
        questionsLength: response.questions?.length
      });
      
      if (response.success === false) {
        console.error('Backend returned error:', response.error);
        toast.error(response.error || 'Erro ao carregar questões');
        setQuestions([]);
        return;
      }
      
      if (!response.questions || !Array.isArray(response.questions)) {
        console.error('Invalid response format - questions is not an array:', response);
        toast.error('Erro no formato dos dados recebidos');
        setQuestions([]);
        return;
      }
      
      const questionsList = response.questions.filter((q: any) => {
        // Filter out null, undefined, or invalid questions
        if (!q) {
          console.warn('Found null/undefined question, skipping');
          return false;
        }
        if (!q.question || !q.subject) {
          console.warn('Found question with missing required fields:', { 
            id: q.id,
            hasQuestion: !!q.question,
            hasSubject: !!q.subject
          });
          return false;
        }
        return true;
      });
      
      console.log(`✓ Loaded ${questionsList.length} valid questions successfully (filtered from ${response.questions.length} total)`);
      
      if (questionsList.length > 0) {
        console.log('Sample questions loaded:', questionsList.slice(0, 2).map(q => ({
          id: q.id,
          subject: q.subject,
          question: q.question.substring(0, 50) + '...'
        })));
      } else {
        console.log('No valid questions found in database');
      }
      
      setQuestions(questionsList);
      
    } catch (error) {
      console.error('Exception while loading questions:', error);
      toast.error('Erro ao carregar banco de questões');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const difficulties = ['Fácil', 'Médio', 'Difícil'];

  const filteredQuestions = questions.filter(q => {
    // Additional safety check
    if (!q || !q.question || !q.subject) {
      console.warn('Invalid question object found during filtering:', q);
      return false;
    }
    
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (q.tags && Array.isArray(q.tags) && q.tags.some((tag: string) => tag && tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesSubject = selectedSubject === 'all' || q.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  }).map(q => ({
    ...q,
    // Preparar dados para exportação
    option_a: q.options?.[0] || '',
    option_b: q.options?.[1] || '',
    option_c: q.options?.[2] || '',
    option_d: q.options?.[3] || '',
    correctAnswerLetter: q.options?.[q.correctAnswer] ? String.fromCharCode(65 + q.correctAnswer) : 'A',
    tagsString: Array.isArray(q.tags) ? q.tags.join(', ') : '',
    status: q.isActive !== false ? 'Ativo' : 'Inativo',
    usageCount: q.usageCount || 0
  }));

  const handleCreateQuestion = async () => {
    if (!newQuestion.question || !newQuestion.subject || !newQuestion.difficulty || !newQuestion.grade) {
      toast.error('Preencha todos os campos obrigatórios (questão, matéria, série e dificuldade)');
      return;
    }

    // Validar alternativas apenas para questões de múltipla escolha
    if (newQuestion.questionType === 'multiple-choice' && newQuestion.options.some(opt => !opt.trim())) {
      toast.error('Preencha todas as alternativas');
      return;
    }

    try {
      setLoading(true);
      console.log('Creating new question...');
      
      const questionData: any = {
        question: newQuestion.question.trim(),
        subject: newQuestion.subject,
        grade: newQuestion.grade,
        difficulty: newQuestion.difficulty,
        questionType: newQuestion.questionType,
        type: newQuestion.questionType === 'essay' ? 'Dissertativa' : 'Múltipla Escolha',
        tags: newQuestion.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        explanation: '',
        weight: newQuestion.weight || 1.0
      };
      
      // Adicionar opções e resposta correta apenas para questões de múltipla escolha
      if (newQuestion.questionType === 'multiple-choice') {
        questionData.options = newQuestion.options.filter(opt => opt.trim()).map(opt => opt.trim());
        questionData.correctAnswer = newQuestion.correctAnswer;
      }
      
      console.log('Question data to be sent:', questionData);
      const response = await apiService.createQuestion(questionData);
      
      console.log('Create question response:', response);
      
      if (response.success === false) {
        console.error('Backend error:', response.error);
        toast.error(response.error || 'Erro ao criar questão');
        return;
      }
      
      if (!response.question || !response.question.id) {
        console.error('Invalid response - no question returned:', response);
        toast.error('Erro: questão não foi criada corretamente');
        return;
      }
      
      console.log('Question created successfully with ID:', response.question.id);
      
      // Add the new question to the local state immediately for instant feedback
      const createdQuestion = response.question;
      setQuestions(prev => [...prev, createdQuestion]);
      
      toast.success('Questão criada com sucesso!');
      
      // Clear form
      setNewQuestion({
        question: '',
        subject: '',
        grade: '',
        difficulty: '',
        questionType: 'multiple-choice',
        type: 'Múltipla Escolha',
        options: ['', '', '', ''],
        correctAnswer: 0,
        tags: '',
        weight: 1.0
      });
      setShowAddForm(false);
      
      // Wait a moment to ensure data is persisted, then reload
      console.log('Waiting for data persistence...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Reloading questions from backend...');
      await loadQuestions();
      
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Erro ao criar questão: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) {
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Deleting question: ${id}`);
      const response = await apiService.deleteQuestion(id);
      
      if (response.success === false && response.error) {
        console.error('Backend error:', response.error);
        toast.error(response.error);
        return;
      }
      
      console.log('Question deleted successfully');
      toast.success('Questão removida com sucesso!');
      await loadQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Erro ao remover questão');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil': return 'bg-green-100 text-green-800';
      case 'Médio': return 'bg-yellow-100 text-yellow-800';
      case 'Difícil': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportQuestions = () => {
    setShowExportDialog(true);
  };

  const handleQuickExport = () => {
    quickExport('questions', filteredQuestions);
  };

  const handleImportQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const importedData = await importFromExcel(file);
      
      if (importedData.length === 0) {
        toast.error('Arquivo vazio ou formato inválido');
        return;
      }

      // Validar e processar dados importados
      let successCount = 0;
      let errorCount = 0;

      for (const row of importedData) {
        try {
          // Mapear colunas do Excel para o formato esperado
          const questionData = {
            question: row['Questão'] || row['question'] || '',
            subject: row['Matéria'] || row['subject'] || '',
            difficulty: row['Dificuldade'] || row['difficulty'] || 'Médio',
            type: 'Múltipla Escolha',
            options: [
              row['Alternativa A'] || row['option_a'] || '',
              row['Alternativa B'] || row['option_b'] || '',
              row['Alternativa C'] || row['option_c'] || '',
              row['Alternativa D'] || row['option_d'] || ''
            ].filter(Boolean),
            correctAnswer: parseInt(row['Resposta Correta'] || row['correct_answer'] || '0'),
            tags: typeof row['Tags'] === 'string' ? row['Tags'].split(',').map(t => t.trim()) : [],
            weight: parseFloat(row['Peso'] || row['weight'] || '1.0')
          };

          // Validar dados obrigatórios
          if (!questionData.question || !questionData.subject || questionData.options.length < 2) {
            errorCount++;
            continue;
          }

          await apiService.createQuestion(questionData);
          successCount++;
        } catch (error) {
          console.error('Error importing question:', error);
          errorCount++;
        }
      }

      await loadQuestions();
      
      if (successCount > 0) {
        toast.success(`${successCount} questões importadas com sucesso!`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} questões não puderam ser importadas devido a erros de formato`);
      }

    } catch (error) {
      console.error('Error importing questions:', error);
      toast.error('Erro ao importar arquivo. Verifique o formato.');
    } finally {
      setLoading(false);
      // Limpar input file
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-slate-800">Banco de Questões</h1>
          <p className="text-sm lg:text-base text-slate-600">Gerencie suas questões para criar avaliações</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:space-x-3">
          {/* Botão de Importar */}
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportQuestions}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            <Button 
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50 text-xs lg:text-sm"
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-1 lg:mr-2" />
              <span className="hidden sm:inline">Importar Excel</span>
              <span className="sm:hidden">Importar</span>
            </Button>
          </div>

          {/* Botão de Exportar */}
          <div className="flex items-center space-x-1">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleQuickExport}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 text-xs lg:text-sm"
              disabled={filteredQuestions.length === 0}
            >
              <Download className="w-4 h-4 mr-1 lg:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Exp</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleExportQuestions}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
              disabled={filteredQuestions.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-xs lg:text-sm"
          >
            <Plus className="w-4 h-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Nova Questão</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="seice-card">
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar questões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todas as matérias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as matérias</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Todas as dificuldades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" className="flex items-center text-sm">
              <Filter className="w-4 h-4 mr-1 lg:mr-2" />
              <span className="hidden lg:inline">Filtros Avançados</span>
              <span className="lg:hidden">Filtros</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Question Form */}
      {showAddForm && (
        <Card className="seice-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Nova Questão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Questão</label>
                <Select value={newQuestion.questionType} onValueChange={(value: 'multiple-choice' | 'essay') => setNewQuestion(prev => ({ ...prev, questionType: value }))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple-choice">Múltipla Escolha</SelectItem>
                    <SelectItem value="essay">Dissertativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Matéria</label>
                <Select value={newQuestion.subject} onValueChange={(value) => setNewQuestion(prev => ({ ...prev, subject: value }))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione a matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        Nenhuma matéria cadastrada. Configure em Configurações → Acadêmico.
                      </div>
                    ) : (
                      subjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Série/Ano</label>
                <Select value={newQuestion.grade} onValueChange={(value) => setNewQuestion(prev => ({ ...prev, grade: value }))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        Nenhuma série cadastrada. Configure em Configurações → Acadêmico.
                      </div>
                    ) : (
                      series.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Dificuldade</label>
                <Select value={newQuestion.difficulty} onValueChange={(value) => setNewQuestion(prev => ({ ...prev, difficulty: value }))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione a dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Peso da Nota</label>
                <Input 
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  placeholder="1.0"
                  value={newQuestion.weight}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, weight: parseFloat(e.target.value) || 1.0 }))}
                  className="text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Valor padrão: 1.0</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Pergunta</label>
              <Textarea 
                placeholder="Digite a pergunta..." 
                rows={3}
                value={newQuestion.question}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
              />
            </div>
            
            {newQuestion.questionType === 'multiple-choice' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Alternativas</label>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((letter, index) => (
                    <div key={letter} className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        name="correctAnswer" 
                        checked={newQuestion.correctAnswer === index}
                        onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: index }))}
                        className="w-4 h-4 text-blue-600"
                        title="Marcar como resposta correta"
                      />
                      <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {letter}
                      </span>
                      <Input 
                        placeholder={`Alternativa ${letter}`}
                        value={newQuestion.options[index]}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = e.target.value;
                          setNewQuestion(prev => ({ ...prev, options: newOptions }));
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Selecione o botão de rádio para marcar a resposta correta
                </p>
              </div>
            )}
            
            {newQuestion.questionType === 'essay' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Questão Dissertativa:</strong> As respostas dos alunos precisarão ser corrigidas manualmente pelo professor.
                  Esta questão não contará para a pontuação automática.
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tags (separadas por vírgula)</label>
              <Input 
                placeholder="geografia, brasil, capital..."
                value={newQuestion.tags}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateQuestion}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Questão'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            Questões ({filteredQuestions.length})
          </h2>
          {filteredQuestions.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <span>Total: {questions.length} questões</span>
              <span>•</span>
              <span>Filtradas: {filteredQuestions.length}</span>
            </div>
          )}
        </div>
        
        {filteredQuestions.map(question => (
          <Card key={question.id} className="seice-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      {question.subject}
                    </Badge>
                    {question.grade && (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 text-xs">
                        {question.grade}
                      </Badge>
                    )}
                    <Badge className={`${getDifficultyColor(question.difficulty)} text-xs`}>
                      {question.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {question.type}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                      Peso: {question.weight || 1.0}
                    </Badge>
                  </div>
                  
                  <h3 className="font-medium text-slate-800 mb-3 text-sm lg:text-base">
                    {question.question}
                  </h3>
                  
                  {question.questionType === 'essay' ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                      <p className="text-xs lg:text-sm text-amber-800">
                        <strong>Questão Dissertativa:</strong> Requer correção manual do professor
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
                      {(question.options || []).map((option, index) => (
                        <div 
                          key={index} 
                          className={`p-2 rounded text-xs lg:text-sm ${
                            index === question.correctAnswer 
                              ? 'bg-green-50 text-green-800 border border-green-200' 
                              : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="font-medium">{String.fromCharCode(65 + index)}) </span>
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0 text-xs lg:text-sm text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Tag className="w-4 h-4" />
                      <span className="truncate">{Array.isArray(question.tags) ? question.tags.join(', ') : ''}</span>
                    </div>
                    <div className="hidden lg:block">Criada em: {question.createdAt || 'N/A'}</div>
                    <div>Usada {question.usageCount || 0} vezes</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 lg:space-x-2 lg:ml-4">
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteQuestion(question.id)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredQuestions.length === 0 && (
          <Card className="seice-card">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-800 mb-2">Nenhuma questão encontrada</h3>
              <p className="text-slate-500 mb-4">
                {searchTerm || (selectedSubject !== 'all') || (selectedDifficulty !== 'all')
                  ? 'Tente ajustar os filtros ou criar uma nova questão'
                  : 'Comece criando sua primeira questão'
                }
              </p>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Questão
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Excel Export Dialog */}
      <ExcelExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title="Banco de Questões - Sistema SEICE"
        data={filteredQuestions}
        columns={[
          { header: 'ID', key: 'id', width: 10, type: 'text' },
          { header: 'Matéria', key: 'subject', width: 15, type: 'text' },
          { header: 'Série', key: 'grade', width: 12, type: 'text' },
          { header: 'Dificuldade', key: 'difficulty', width: 12, type: 'text' },
          { header: 'Questão', key: 'question', width: 50, type: 'text' },
          { header: 'Tipo', key: 'type', width: 15, type: 'text' },
          { header: 'Alternativa A', key: 'option_a', width: 30, type: 'text' },
          { header: 'Alternativa B', key: 'option_b', width: 30, type: 'text' },
          { header: 'Alternativa C', key: 'option_c', width: 30, type: 'text' },
          { header: 'Alternativa D', key: 'option_d', width: 30, type: 'text' },
          { header: 'Resposta Correta', key: 'correctAnswerLetter', width: 15, type: 'text' },
          { header: 'Tags', key: 'tagsString', width: 25, type: 'text' },
          { header: 'Peso', key: 'weight', width: 10, type: 'number' },
          { header: 'Data Criação', key: 'createdAt', width: 15, type: 'date' },
          { header: 'Vezes Usada', key: 'usageCount', width: 12, type: 'number' },
          { header: 'Status', key: 'status', width: 10, type: 'text' }
        ]}
        defaultFilename={`questoes_${new Date().toISOString().split('T')[0]}`}
        templateType="questions"
      />
    </div>
  );
}