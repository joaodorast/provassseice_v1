import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Play,
  Database,
  Users,
  FileText,
  ClipboardCheck,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../../utils/api';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type TestResult = {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
};

export function SystemTestsPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Conectividade Backend', status: 'pending' },
    { name: 'Criar Questão de Teste', status: 'pending' },
    { name: 'Listar Questões', status: 'pending' },
    { name: 'Criar Aluno de Teste', status: 'pending' },
    { name: 'Criar Série/Turma', status: 'pending' },
    { name: 'Criar Simulado', status: 'pending' },
    { name: 'Duplicar Simulado', status: 'pending' },
    { name: 'Upload de Imagem', status: 'pending' },
    { name: 'Gerar Relatório', status: 'pending' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [testData, setTestData] = useState<any>({});

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runTest = async (index: number, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    const testName = tests[index].name;
    
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`%c▶ Teste ${index + 1}: ${testName}`, 'color: #3b82f6; font-weight: bold;');
    updateTest(index, { status: 'running' });
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`%c✓ PASSOU - ${duration}ms`, 'color: #10b981; font-weight: bold;');
      updateTest(index, { 
        status: 'success', 
        message: `✓ Passou (${duration}ms)`,
        duration 
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`%c✗ FALHOU - ${duration}ms`, 'color: #ef4444; font-weight: bold;');
      console.error('Erro:', error.message);
      console.error('Stack:', error.stack);
      updateTest(index, { 
        status: 'error', 
        message: `✗ Falhou: ${error.message}`,
        duration 
      });
      throw error;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    console.clear();
    console.log('%c🧪 INICIANDO TESTES DO SISTEMA SEICE', 'color: #3b82f6; font-size: 16px; font-weight: bold; padding: 10px;');
    console.log('═'.repeat(50));
    
    // Verificar autenticação
    const token = localStorage.getItem('access_token');
    console.log('Token de autenticação:', token ? '✓ Presente' : '✗ Ausente');
    
    if (!token) {
      console.warn('⚠️ AVISO: Alguns testes podem falhar sem autenticação');
    }
    
    toast.info('Iniciando testes do sistema...');
    
    // Variáveis locais para compartilhar dados entre testes
    let createdQuestionId: string | undefined;
    let createdStudentId: string | undefined;
    let createdSerieId: string | undefined;
    let createdExamId: string | undefined;
    
    try {
      // Test 1: Backend Connectivity
      await runTest(0, async () => {
        console.log('Testando conectividade com backend...');
        console.log(`URL: https://${projectId}.supabase.co/functions/v1/make-server-83358821/health`);
        
        const result = await apiService.checkHealth();
        console.log('Resposta do health check:', result);
        
        if (!result) {
          throw new Error('Backend não retornou resposta (null/undefined)');
        }
        
        // Verificar se retornou erro
        if (result.error) {
          throw new Error(`Backend retornou erro: ${result.error}`);
        }
        
        // Aceita tanto result.success quanto result.status === 'ok'
        const isHealthy = result.success === true || result.status === 'ok';
        
        if (!isHealthy) {
          throw new Error(
            `Backend não está saudável. Resposta: ${JSON.stringify(result)}`
          );
        }
        
        console.log('✓ Backend está respondendo corretamente');
      });

      // Test 2: Create Question
      await runTest(1, async () => {
        const question = {
          question: `[TESTE] Quanto é 2 + 2? (${Date.now()})`,
          subject: 'Matemática',
          difficulty: 'Fácil',
          options: ['2', '3', '4', '5'],
          correctAnswer: 2,
          explanation: 'Questão de teste automático',
          tags: ['teste', 'automatico'],
          weight: 1.0
        };
        
        const result = await apiService.createQuestion(question);
        if (!result.success) {
          throw new Error('Falha ao criar questão: ' + (result.error || 'Erro desconhecido'));
        }
        createdQuestionId = result.question.id;
        setTestData(prev => ({ ...prev, questionId: result.question.id }));
      });

      // Test 3: List Questions
      await runTest(2, async () => {
        const result = await apiService.getQuestions();
        if (!result.success) {
          throw new Error('Falha ao listar quest��es: ' + (result.error || 'Erro desconhecido'));
        }
        if (!result.questions || result.questions.length === 0) {
          throw new Error('Nenhuma questão encontrada no banco');
        }
      });

      // Test 4: Create Student
      await runTest(3, async () => {
        const student = {
          name: `Aluno Teste ${Date.now()}`,
          email: `teste${Date.now()}@escola.com`,
          registration: `TEST${Date.now()}`,
          grade: '1° ANO',
          class: 'Turma A',
          birthDate: '2008-01-01'
        };
        
        const result = await apiService.createStudents([student]);
        if (!result.success) {
          throw new Error('Falha ao criar aluno: ' + (result.error || 'Erro desconhecido'));
        }
        if (!result.students || result.students.length === 0) {
          throw new Error('Aluno não foi criado');
        }
        createdStudentId = result.students[0].id;
        setTestData(prev => ({ ...prev, studentId: result.students[0].id }));
      });

      // Test 5: Create Series/Class
      await runTest(4, async () => {
        const timestamp = Date.now();
        const serie = {
          name: `Série Teste ${timestamp}`,
          code: `TEST-${timestamp}`, // IMPORTANTE: código é obrigatório
          description: 'Série criada automaticamente para testes'
        };
        
        const result = await apiService.createSerie(serie);
        if (!result.success) {
          throw new Error('Falha ao criar série: ' + (result.error || 'Erro desconhecido'));
        }
        
        // A API retorna { success: true, data: serie }, não { success: true, serie: ... }
        const serieId = result.data?.id;
        if (!serieId) {
          throw new Error('ID da série não retornado pela API');
        }
        
        const turma = {
          name: `Turma Teste ${timestamp}`,
          serieId: serieId,
          year: new Date().getFullYear()
        };
        
        const turmaResult = await apiService.createClass(turma);
        if (!turmaResult.success) {
          throw new Error('Falha ao criar turma: ' + (turmaResult.error || 'Erro desconhecido'));
        }
        
        console.log('✓ Série e turma criadas com sucesso');
      });

      // Test 6: Create Exam
      await runTest(5, async () => {
        // First, get some questions
        const questionsResult = await apiService.getQuestions();
        if (!questionsResult.success) {
          throw new Error('Falha ao listar questões: ' + (questionsResult.error || 'Erro desconhecido'));
        }
        
        if (!questionsResult.questions || questionsResult.questions.length < 5) {
          throw new Error(`Não há questões suficientes (apenas ${questionsResult.questions?.length || 0} encontradas, mínimo 5 necessárias)`);
        }

        const exam = {
          title: `Simulado Teste ${Date.now()}`,
          description: 'Simulado criado automaticamente para testes',
          questionsPerSubject: 2,
          timeLimit: 90,
          subjects: ['Matemática'],
          totalQuestions: Math.min(5, questionsResult.questions.length),
          questions: questionsResult.questions.slice(0, Math.min(5, questionsResult.questions.length)),
          status: 'Ativo'
        };
        
        const result = await apiService.createExam(exam);
        if (!result.success) throw new Error('Falha ao criar simulado: ' + (result.error || 'Erro desconhecido'));
        createdExamId = result.exam.id;
        setTestData(prev => ({ ...prev, examId: result.exam.id }));
        console.log('✓ Simulado criado com ID:', createdExamId);
      });

      // Test 7: Duplicate Exam
      await runTest(6, async () => {
        if (!createdExamId) {
          throw new Error('Nenhum simulado criado no teste anterior para duplicar');
        }
        
        console.log('Tentando duplicar simulado com ID:', createdExamId);
        const result = await apiService.duplicateExam(createdExamId);
        if (!result.success) {
          throw new Error('Falha ao duplicar simulado: ' + (result.error || 'Erro desconhecido'));
        }
        console.log('✓ Simulado duplicado com sucesso');
      });

      // Test 8: Upload Image (simulate)
      await runTest(7, async () => {
        // Create a small test image in base64
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(0, 0, 100, 100);
          ctx.fillStyle = '#ffffff';
          ctx.font = '20px Arial';
          ctx.fillText('TEST', 25, 55);
        }
        
        const base64Image = canvas.toDataURL('image/png').split(',')[1];
        
        // We need a submission ID, so let's create a test submission first
        const submission = {
          examId: createdExamId || 'test-exam-' + Date.now(),
          userId: 'test-user-' + Date.now(),
          studentName: 'Aluno Teste Upload',
          answers: Array(5).fill(0),
          score: 0,
          totalQuestions: 5,
          percentage: 0,
          submittedAt: new Date().toISOString()
        };
        
        console.log('Criando submissão de teste para upload de imagem...');
        
        const submissionResult = await apiService.createSubmission(submission);
        if (!submissionResult.success) {
          throw new Error('Falha ao criar submissão: ' + (submissionResult.error || 'Erro desconhecido'));
        }
        
        const result = await apiService.uploadAnswerSheet(
          submissionResult.submission.id,
          base64Image,
          'test-image.png'
        );
        if (!result.success) {
          throw new Error('Falha ao fazer upload de imagem: ' + (result.error || 'Erro desconhecido'));
        }
      });

      // Test 9: Generate Report
      await runTest(8, async () => {
        const result = await apiService.getDashboardStats();
        if (!result.success) {
          throw new Error('Falha ao gerar estatísticas: ' + (result.error || 'Erro desconhecido'));
        }
        if (!result.stats) {
          throw new Error('Estatísticas não foram retornadas');
        }
      });

      console.log('\n' + '═'.repeat(50));
      console.log('%c✓ TODOS OS TESTES PASSARAM!', 'color: #10b981; font-size: 16px; font-weight: bold; padding: 10px;');
      console.log(`Total: ${tests.length} testes | Tempo: ${totalDuration}ms`);
      console.log('═'.repeat(50));
      
      toast.success('✓ Todos os testes passaram!', {
        description: 'Sistema funcionando corretamente'
      });
      
    } catch (error: any) {
      const passedCount = tests.filter(t => t.status === 'success').length;
      const failedCount = tests.filter(t => t.status === 'error').length;
      
      console.log('\n' + '═'.repeat(50));
      console.log('%c✗ ALGUNS TESTES FALHARAM', 'color: #ef4444; font-size: 16px; font-weight: bold; padding: 10px;');
      console.log(`Passaram: ${passedCount} | Falharam: ${failedCount} | Total: ${tests.length}`);
      console.log('═'.repeat(50));
      console.log('\n📋 Para mais detalhes, veja os erros acima em vermelho.');
      console.log('💡 Dica: Verifique os pré-requisitos na página de testes.');
      
      toast.error('✗ Alguns testes falharam', {
        description: `${passedCount}/${tests.length} testes passaram. Veja detalhes abaixo.`
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleTest = async (index: number) => {
    toast.info(`Executando teste ${index + 1}...`);
    // Implement individual test logic here if needed
  };

  const resetTests = () => {
    setTests(prev => prev.map(test => ({ 
      ...test, 
      status: 'pending', 
      message: undefined,
      duration: undefined 
    })));
    setTestData({});
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Passou</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Falhou</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Executando...</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600">Pendente</Badge>;
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const runningCount = tests.filter(t => t.status === 'running').length;
  const completedCount = successCount + errorCount;
  const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0);
  const progress = (completedCount / tests.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Testes do Sistema</h1>
        <p className="text-slate-600 mt-2">
          Execute testes automatizados para verificar se todas as funcionalidades estão funcionando corretamente.
        </p>
      </div>

      {/* Connection Info */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Database className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 mb-2">🔗 Informações de Conexão</h3>
              <div className="text-sm text-purple-800 space-y-1 bg-purple-100 p-3 rounded font-mono">
                <p><strong>Project ID:</strong> {projectId}</p>
                <p><strong>Backend URL:</strong> https://{projectId}.supabase.co/functions/v1/make-server-83358821</p>
                <p><strong>Health Check:</strong> /health</p>
                <p><strong>Token:</strong> {localStorage.getItem('access_token') ? '✓ Presente' : '✗ Ausente'}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    const startTime = Date.now();
                    try {
                      const url = `https://${projectId}.supabase.co/functions/v1/make-server-83358821/health`;
                      console.log('%c[TESTE DIRETO] Iniciando...', 'color: purple; font-weight: bold;');
                      console.log('URL:', url);
                      console.log('Tempo:', new Date().toISOString());
                      
                      const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      const duration = Date.now() - startTime;
                      console.log('Status HTTP:', response.status, response.statusText);
                      console.log('Tempo de resposta:', duration + 'ms');
                      
                      const data = await response.json();
                      console.log('Resposta completa:', data);
                      
                      const isOk = data.success === true || data.status === 'ok';
                      
                      if (isOk) {
                        console.log('%c✓ SUCESSO!', 'color: green; font-weight: bold;');
                        toast.success('✓ Backend Online!', {
                          description: `Respondeu em ${duration}ms`
                        });
                      } else {
                        console.error('%c✗ RESPOSTA INVÁLIDA', 'color: red; font-weight: bold;');
                        toast.error('Resposta inválida do backend', {
                          description: JSON.stringify(data)
                        });
                      }
                    } catch (error) {
                      const duration = Date.now() - startTime;
                      console.error('%c✗ ERRO NA CONEXÃO', 'color: red; font-weight: bold;');
                      console.error('Tipo:', error.name);
                      console.error('Mensagem:', error.message);
                      console.error('Tempo até erro:', duration + 'ms');
                      
                      let errorMessage = error.message;
                      let suggestion = '';
                      
                      if (error.message.includes('Failed to fetch')) {
                        suggestion = 'Verifique sua internet ou aguarde (servidor pode estar iniciando)';
                      } else if (error.message.includes('NetworkError')) {
                        suggestion = 'Problema de rede ou CORS';
                      } else if (error.name === 'AbortError') {
                        suggestion = 'Timeout - servidor muito lento';
                      }
                      
                      toast.error('✗ Falha na Conexão', {
                        description: suggestion || errorMessage
                      });
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Testar Conexão Direta
                </button>
                
                <button
                  onClick={() => {
                    const url = `https://${projectId}.supabase.co/functions/v1/make-server-83358821/health`;
                    navigator.clipboard.writeText(url);
                    toast.success('URL copiada!', {
                      description: 'Cole no navegador ou Postman para testar'
                    });
                  }}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                >
                  Copiar URL
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites Alert */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">✅ Pré-requisitos para Testes Completos</h3>
              <ul className="text-sm text-green-800 space-y-1 ml-4">
                <li>• <strong>Backend ativo:</strong> Servidor Supabase deve estar online</li>
                <li>• <strong>Autenticado:</strong> Você deve estar logado no sistema</li>
                <li>• <strong>5+ questões:</strong> Recomendado ter pelo menos 5 questões cadastradas</li>
                <li>• <strong>Conexão estável:</strong> Internet funcionando corretamente</li>
              </ul>
              <p className="text-sm text-green-700 mt-3 bg-green-100 p-2 rounded">
                <strong>Dica:</strong> Se não tiver questões cadastradas, o Teste #6 (Criar Simulado) falhará. 
                Crie algumas questões primeiro em "Banco de Questões".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Testes</p>
                <p className="text-2xl font-bold text-slate-900">{tests.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Passaram</p>
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Falharam</p>
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Tempo Total</p>
                <p className="text-2xl font-bold text-slate-900">{totalDuration}ms</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controles</CardTitle>
          <CardDescription>
            Execute todos os testes ou redefina os resultados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Progresso dos Testes</span>
                <span className="font-semibold text-blue-600">
                  {completedCount}/{tests.length} ({Math.round(progress)}%)
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Executar Todos os Testes
                </>
              )}
            </Button>
            
            <Button 
              onClick={resetTests}
              disabled={isRunning}
              variant="outline"
            >
              Resetar
            </Button>

            <Button 
              onClick={() => {
                console.clear();
                console.log('%c🧪 CONSOLE DE TESTES LIMPO', 'color: #3b82f6; font-size: 14px; font-weight: bold;');
                console.log('Execute os testes e veja os logs detalhados aqui.');
                toast.info('Console limpo! (Pressione F12 para ver)');
              }}
              variant="outline"
              className="ml-auto"
            >
              Limpar Console (F12)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados dos Testes</CardTitle>
          <CardDescription>
            Status de cada teste individual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tests.map((test, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{test.name}</p>
                    {test.message && (
                      <p className="text-sm text-slate-600 mt-1">{test.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(test.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Data (Debug) */}
      {Object.keys(testData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados de Teste (Debug)</CardTitle>
            <CardDescription>
              IDs criados durante os testes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 space-y-2">
          <p>1. <strong>Executar Todos os Testes:</strong> Clique no botão "Executar Todos os Testes" para testar todas as funcionalidades.</p>
          <p>2. <strong>Verificar Resultados:</strong> Veja o status de cada teste (verde = passou, vermelho = falhou).</p>
          <p>3. <strong>Resetar:</strong> Clique em "Resetar" para limpar os resultados e executar novamente.</p>
          <p className="mt-4 pt-4 border-t border-blue-200">
            <strong>⚠️ Atenção:</strong> Os testes criarão dados reais no sistema (questões, alunos, simulados de teste). 
            Você pode deletá-los depois se desejar.
          </p>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">🔧 Resolução de Problemas</CardTitle>
        </CardHeader>
        <CardContent className="text-amber-800 space-y-3">
          <div>
            <p className="font-semibold">❌ "Backend não está respondendo"</p>
            <p className="text-sm ml-4">1. Clique em <strong>"Testar Conexão Direta"</strong> acima</p>
            <p className="text-sm ml-4">2. Abra o Console (F12) e veja o erro exato</p>
            <p className="text-sm ml-4">3. Verifique se a URL está correta no card roxo</p>
            <p className="text-sm ml-4">4. Aguarde 30s e tente novamente</p>
            <p className="text-sm ml-4 mt-2 text-amber-700">
              <strong>Possíveis causas:</strong> Internet lenta, servidor Supabase reiniciando, CORS bloqueado
            </p>
          </div>
          <div>
            <p className="font-semibold">❌ "Não há questões suficientes"</p>
            <p className="text-sm ml-4">→ Crie pelo menos 5 questões manualmente primeiro</p>
            <p className="text-sm ml-4">→ Vá em: Banco de Questões → Nova Questão</p>
          </div>
          <div>
            <p className="font-semibold">❌ "Timeout" ou "Falha na conexão"</p>
            <p className="text-sm ml-4">→ O servidor pode estar lento, tente novamente</p>
            <p className="text-sm ml-4">→ Verifique se você está logado corretamente</p>
          </div>
          <div className="pt-3 border-t border-amber-300">
            <p className="font-semibold">💡 Dicas:</p>
            <p className="text-sm ml-4">→ Abra o Console do navegador (F12) para ver logs detalhados</p>
            <p className="text-sm ml-4">→ Veja <strong>DEBUGGING.md</strong> para guia completo de troubleshooting</p>
            <p className="text-sm ml-4">→ Execute testes individuais via console (veja DEBUGGING.md)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}