import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { ArrowLeft, CheckCircle, XCircle, Award, Target, Clock, Printer } from 'lucide-react';
import { Submission } from '../App';

type ResultsPageProps = {
  submission: Submission;
  onBack: () => void;
};

export function ResultsPage({ submission, onBack }: ResultsPageProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 80) return { label: 'Excelente', emoji: '🎉' };
    if (percentage >= 70) return { label: 'Bom', emoji: '👍' };
    if (percentage >= 50) return { label: 'Regular', emoji: '⚠️' };
    return { label: 'Precisa melhorar', emoji: '📚' };
  };

  const performance = getPerformanceLabel(submission.percentage);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="no-print">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl">Resultado do Simulado</h1>
                <p className="text-sm text-muted-foreground">
                  {submission.examTitle}
                </p>
              </div>
            </div>
            
            <Button variant="outline" onClick={handlePrint} className="no-print">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="md:col-span-4">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Award className={`w-8 h-8 ${getPerformanceColor(submission.percentage)}`} />
                <span className="text-3xl">{performance.emoji}</span>
              </div>
              <CardTitle className="text-2xl">
                Performance: {performance.label}
              </CardTitle>
              <CardDescription>
                Simulado realizado em {formatDate(submission.submittedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className={`text-6xl mb-2 ${getPerformanceColor(submission.percentage)}`}>
                  {submission.percentage}%
                </div>
                <p className="text-muted-foreground">
                  {submission.totalWeight ? 
                    `${submission.score.toFixed(1)} de ${submission.totalWeight.toFixed(1)} pontos (${submission.totalQuestions} questões)` :
                    `${submission.score} de ${submission.totalQuestions} questões corretas`
                  }
                </p>
              </div>
              
              <Progress value={submission.percentage} className="w-full h-3 mb-6" />
              
              <div className={`grid ${submission.totalWeight ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-center`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-2xl text-green-600">
                      {submission.totalWeight ? submission.score.toFixed(1) : submission.score}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {submission.totalWeight ? 'Pontos' : 'Acertos'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-2xl text-red-600">
                      {submission.totalWeight ? 
                        (submission.totalWeight - submission.score).toFixed(1) : 
                        (submission.totalQuestions - submission.score)
                      }
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {submission.totalWeight ? 'Perdidos' : 'Erros'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-2xl text-blue-600">
                      {submission.totalWeight ? submission.totalWeight.toFixed(1) : submission.totalQuestions}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {submission.totalWeight ? 'Total Pts' : 'Total'}
                  </p>
                </div>
                
                {submission.totalWeight && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <Target className="w-5 h-5 text-purple-600 mr-2" />
                      <span className="text-2xl text-purple-600">{submission.totalQuestions}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Questões</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Revisão Detalhada</CardTitle>
            <CardDescription>
              Confira suas respostas e as correções de cada questão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {submission.results.map((result, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center flex-wrap gap-2">
                      <Badge variant="outline">
                        Questão {index + 1}
                      </Badge>
                      <Badge variant={result.isCorrect ? "default" : "destructive"}>
                        {result.isCorrect ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Correta
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Incorreta
                          </>
                        )}
                      </Badge>
                      {result.weight && result.weight !== 1.0 && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          Peso: {result.weight}
                        </Badge>
                      )}
                      {result.pointsEarned !== undefined && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {result.pointsEarned.toFixed(1)} / {result.weight?.toFixed(1) || '1.0'} pts
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <h4>{result.question}</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="text-sm">Sua resposta:</h5>
                      <div className={`p-3 rounded-lg border ${
                        result.isCorrect 
                          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                          : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                      }`}>
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + result.userAnswer)})
                        </span>
                        {/* Note: We would need the options from the original exam to show the text */}
                        Opção {String.fromCharCode(65 + result.userAnswer)}
                      </div>
                    </div>
                    
                    {!result.isCorrect && (
                      <div className="space-y-2">
                        <h5 className="text-sm">Resposta correta:</h5>
                        <div className="p-3 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + result.correctAnswer)})
                          </span>
                          Opção {String.fromCharCode(65 + result.correctAnswer)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {result.explanation && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h5 className="text-sm mb-2 text-blue-800 dark:text-blue-200">Explicação:</h5>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {result.explanation}
                      </p>
                    </div>
                  )}
                  
                  {index < submission.results.length - 1 && (
                    <Separator className="my-6" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4 no-print">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Resultado
          </Button>
        </div>
      </div>


    </div>
  );
}