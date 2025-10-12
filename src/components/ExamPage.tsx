import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { ArrowLeft, Clock, Send, AlertTriangle, Printer, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Exam } from '../App';

type ExamPageProps = {
  exam: Exam;
  onBack: () => void;
  onComplete: () => void;
};

export function ExamPage({ exam, onBack, onComplete }: ExamPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [essayAnswers, setEssayAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(exam.timeLimit * 60); // Convert to seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    // Initialize answers arrays
    setAnswers(new Array(exam.questions.length).fill(-1));
    setEssayAnswers(new Array(exam.questions.length).fill(''));
  }, [exam.questions.length]);

  useEffect(() => {
    // Timer countdown
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-submit when time is up
      handleSubmit();
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };
  
  const handleEssayAnswerChange = (questionIndex: number, text: string) => {
    const newEssayAnswers = [...essayAnswers];
    newEssayAnswers[questionIndex] = text;
    setEssayAnswers(newEssayAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleQuestionJump = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
  };

  const getAnsweredCount = () => {
    let count = 0;
    exam.questions.forEach((q, index) => {
      if (q.questionType === 'essay') {
        if (essayAnswers[index] && essayAnswers[index].trim() !== '') count++;
      } else {
        if (answers[index] !== -1) count++;
      }
    });
    return count;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Token de acesso não encontrado');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: answers,
          essayAnswers: essayAnswers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Erro ao enviar prova: ' + data.error);
        return;
      }

      toast.success(`Prova enviada! Você acertou ${data.submission.score}/${data.submission.totalQuestions} questões (${data.submission.percentage}%)`);
      onComplete();

    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Erro interno ao enviar prova');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = ((currentQuestion + 1) / exam.questions.length) * 100;
  const answeredCount = getAnsweredCount();
  const isTimeRunningOut = timeLeft <= 300; // Last 5 minutes

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div>
                <h1 className="text-base lg:text-lg font-semibold truncate">{exam.title}</h1>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Questão {currentQuestion + 1} de {exam.questions.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between lg:justify-end space-x-2 lg:space-x-4">
              <div className={`flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm ${
                isTimeRunningOut ? 'bg-destructive/10 text-destructive' : 'bg-muted'
              }`}>
                <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="font-mono">
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <Badge variant="outline" className="text-xs">
                <span className="hidden sm:inline">{answeredCount}/{exam.questions.length} respondidas</span>
                <span className="sm:hidden">{answeredCount}/{exam.questions.length}</span>
              </Badge>
              
              <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden lg:flex">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              
              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogTrigger asChild>
                  <Button size="sm">
                    <Send className="w-4 h-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Enviar Prova</span>
                    <span className="sm:hidden">Enviar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="mx-4">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base lg:text-lg">Confirmar envio da prova</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      Você respondeu {answeredCount} de {exam.questions.length} questões.
                      {answeredCount < exam.questions.length && (
                        <span className="block mt-2 text-destructive">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Ainda há {exam.questions.length - answeredCount} questões sem resposta.
                        </span>
                      )}
                      <br />
                      Tem certeza que deseja enviar a prova? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? 'Enviando...' : 'Confirmar envio'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div className="mt-3">
            <Progress value={progressPercentage} className="w-full" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
          {/* Question Navigation */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="lg:sticky lg:top-24">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="text-sm lg:text-base">Navegação</CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                  Clique em uma questão para navegar
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 lg:p-6">
                <div className="grid grid-cols-8 lg:grid-cols-5 gap-1 lg:gap-2">
                  {exam.questions.map((question, index) => {
                    const isAnswered = question.questionType === 'essay' 
                      ? essayAnswers[index]?.trim() !== ''
                      : answers[index] !== -1;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuestionJump(index)}
                        className={`w-6 h-6 lg:w-8 lg:h-8 rounded text-xs border transition-colors ${
                          index === currentQuestion
                            ? 'bg-primary text-primary-foreground border-primary'
                            : isAnswered
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100'
                            : 'bg-muted hover:bg-muted/80 border-border'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-3 lg:mt-4 text-xs space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary rounded"></div>
                    <span>Atual</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded border border-green-200"></div>
                    <span>Respondida</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-muted rounded border"></div>
                    <span>Não respondida</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card>
              <CardHeader className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Questão {currentQuestion + 1}
                  </Badge>
                  {exam.subject && (
                    <Badge variant="secondary" className="text-xs">
                      {exam.subject}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 lg:p-6 space-y-4 lg:space-y-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h3 className="text-base lg:text-lg leading-relaxed">{exam.questions[currentQuestion].question}</h3>
                </div>
                
                {exam.questions[currentQuestion].questionType === 'essay' ? (
                  <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs lg:text-sm text-blue-800">
                        <strong>Questão Dissertativa:</strong> Digite sua resposta completa no campo abaixo. Esta questão será corrigida manualmente pelo professor.
                      </p>
                    </div>
                    <Textarea 
                      placeholder="Digite sua resposta aqui..."
                      value={essayAnswers[currentQuestion] || ''}
                      onChange={(e) => handleEssayAnswerChange(currentQuestion, e.target.value)}
                      rows={8}
                      className="w-full text-sm lg:text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      {essayAnswers[currentQuestion]?.length || 0} caracteres
                    </p>
                  </div>
                ) : (
                  <RadioGroup
                    value={answers[currentQuestion]?.toString() || ""}
                    onValueChange={(value) => handleAnswerChange(currentQuestion, parseInt(value))}
                    className="space-y-2 lg:space-y-3"
                  >
                    {(exam.questions[currentQuestion].options || []).map((option, index) => (
                      <div key={index} className="flex items-start space-x-2 lg:space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} className="mt-1" />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer leading-relaxed text-sm lg:text-base">
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + index)})
                          </span>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t space-y-3 sm:space-y-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    className="sm:order-1"
                  >
                    Anterior
                  </Button>
                  
                  <div className="text-center text-xs lg:text-sm text-muted-foreground sm:order-2">
                    {exam.questions[currentQuestion].questionType === 'essay' 
                      ? (essayAnswers[currentQuestion]?.trim() ? '✅ Respondida' : '⚪ Não respondida')
                      : (answers[currentQuestion] !== -1 ? '✅ Respondida' : '⚪ Não respondida')
                    }
                  </div>
                  
                  <Button 
                    size="sm"
                    onClick={handleNext}
                    disabled={currentQuestion === exam.questions.length - 1}
                    className="sm:order-3"
                  >
                    Próxima
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}