import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, Save, BookOpen, Clock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Question } from '../App';

type CreateExamPageProps = {
  onBack: () => void;
  onComplete: () => void;
};

export function CreateExamPage({ onBack, onComplete }: CreateExamPageProps) {
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    subject: '',
    timeLimit: 60,
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const subjects = [
    'Matemática',
    'Português',
    'História',
    'Geografia',
    'Ciências',
    'Física',
    'Química',
    'Biologia',
    'Inglês',
    'Filosofia',
    'Sociologia',
    'Literatura',
    'Redação',
    'Informática',
    'Produção Textual',
    'Artes',
    'Geral'
  ];

  const timeLimits = [
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' },
    { value: 150, label: '2h 30min' },
    { value: 180, label: '3 horas' },
  ];

  const addQuestion = () => {
    setQuestions([...questions, {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const validateExam = () => {
    const errors = [];

    if (!examData.title.trim()) {
      errors.push('Título da prova é obrigatório');
    }

    if (questions.length === 0) {
      errors.push('A prova deve ter pelo menos uma questão');
    }

    questions.forEach((question, index) => {
      if (!question.question.trim()) {
        errors.push(`Questão ${index + 1}: O enunciado é obrigatório`);
      }

      const emptyOptions = question.options.filter(option => !option.trim()).length;
      if (emptyOptions > 0) {
        errors.push(`Questão ${index + 1}: Todas as opções devem ser preenchidas`);
      }

      if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
        errors.push(`Questão ${index + 1}: Resposta correta inválida`);
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateExam();
    
    if (errors.length > 0) {
      toast.error(`Erros encontrados:\n${errors.join('\n')}`);
      return;
    }

    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Token de acesso não encontrado');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: examData.title,
          description: examData.description,
          subject: examData.subject,
          timeLimit: examData.timeLimit,
          questions: questions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Erro ao criar prova: ' + data.error);
        return;
      }

      toast.success('Prova criada com sucesso!');
      onComplete();

    } catch (error) {
      console.error('Create exam error:', error);
      toast.error('Erro interno ao criar prova');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl">Criar Nova Prova</h1>
                <p className="text-sm text-muted-foreground">
                  Configure sua prova e adicione questões
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {questions.length} questões
              </Badge>
              
              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogTrigger asChild>
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Prova
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar criação da prova</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está criando uma prova com {questions.length} questões.
                      Deseja salvar e disponibilizar para uso?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? 'Salvando...' : 'Confirmar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Exam Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Prova</CardTitle>
              <CardDescription>
                Defina as informações básicas da prova
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Prova *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Simulado ENEM - Matemática"
                    value={examData.title}
                    onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Matéria</Label>
                  <Select
                    value={examData.subject}
                    onValueChange={(value) => setExamData({ ...examData, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o conteúdo e objetivo da prova..."
                  value={examData.description}
                  onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Tempo Limite</Label>
                <Select
                  value={examData.timeLimit.toString()}
                  onValueChange={(value) => setExamData({ ...examData, timeLimit: parseInt(value) })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeLimits.map((time) => (
                      <SelectItem key={time.value} value={time.value.toString()}>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {time.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Questões</h2>
              <Button onClick={addQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Questão
              </Button>
            </div>

            {questions.map((question, questionIndex) => (
              <Card key={questionIndex}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Questão {questionIndex + 1}
                    </CardTitle>
                    {questions.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestion(questionIndex)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`question-${questionIndex}`}>Enunciado *</Label>
                    <Textarea
                      id={`question-${questionIndex}`}
                      placeholder="Digite o enunciado da questão..."
                      value={question.question}
                      onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Alternativas *</Label>
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name={`correct-${questionIndex}`}
                          checked={question.correctAnswer === optionIndex}
                          onChange={() => updateQuestion(questionIndex, 'correctAnswer', optionIndex)}
                          className="w-4 h-4 text-primary border-border"
                        />
                        <Label className="text-sm font-medium min-w-[20px]">
                          {String.fromCharCode(65 + optionIndex)})
                        </Label>
                        <Input
                          placeholder={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                          value={option}
                          onChange={(e) => updateQuestionOption(questionIndex, optionIndex, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Selecione o círculo da alternativa correta
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`explanation-${questionIndex}`}>Explicação (opcional)</Label>
                    <Textarea
                      id={`explanation-${questionIndex}`}
                      placeholder="Explique por que esta é a resposta correta..."
                      value={question.explanation}
                      onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-8 border-t">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>{questions.length} questões configuradas</span>
            </div>
            
            <div className="flex space-x-4">
              <Button variant="outline" onClick={onBack}>
                Cancelar
              </Button>
              <Button onClick={() => setShowConfirmDialog(true)}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Prova
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}