import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  QrCode,
  Users,
  Clock,
  BookOpen,
  Printer,
  Share
} from 'lucide-react';

// QR Code generator component
const QRCodeGenerator = ({ examId, examTitle }: { examId: string, examTitle: string }) => {
  const examUrl = `${window.location.origin}/exam/${examId}`;
  
  // Simple QR code using qr-server.com API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(examUrl)}`;
  
  return (
    <div className="text-center space-y-4">
      <div className="bg-white p-4 rounded-lg inline-block border">
        <img 
          src={qrCodeUrl} 
          alt={`QR Code para ${examTitle}`}
          className="w-48 h-48"
        />
      </div>
      <div className="space-y-2">
        <p className="font-medium text-slate-800">{examTitle}</p>
        <p className="text-sm text-slate-600">ID: {examId}</p>
        <p className="text-xs text-slate-500 font-mono break-all max-w-64 mx-auto">
          {examUrl}
        </p>
      </div>
    </div>
  );
};

export function EvaluationPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);

  const exams = [
    {
      id: 'EVAL001',
      title: 'Simulado Multidisciplinar - 9º Ano',
      description: 'Simulado com questões de todas as matérias (10 questões por matéria)',
      subjects: ['Matemática', 'Português', 'Ciências', 'História', 'Geografia', 'Literatura'],
      grade: '9º Ano',
      questions: 60,
      timeLimit: 90,
      status: 'Ativo',
      createdAt: '2024-01-15',
      appliedCount: 3,
      studentsCount: 45,
      averageScore: 7.5
    },
    {
      id: 'EVAL002',
      title: 'Simulado Preparatório - 8º Ano',
      description: 'Simulado completo com questões interdisciplinares',
      subjects: ['Matemática', 'Português', 'Ciências', 'História', 'Geografia'],
      grade: '8º Ano',
      questions: 50,
      timeLimit: 60,
      status: 'Rascunho',
      createdAt: '2024-01-14',
      appliedCount: 0,
      studentsCount: 0,
      averageScore: 0
    },
    {
      id: 'EVAL003',
      title: 'Simulado ENEM Completo',
      description: 'Simulado modelo ENEM com todas as áreas do conhecimento',
      subjects: ['Matemática', 'Português', 'Literatura', 'História', 'Geografia', 'Ciências', 'Filosofia', 'Sociologia'],
      grade: '3º Ano',
      questions: 80,
      timeLimit: 180,
      status: 'Ativo',
      createdAt: '2024-01-13',
      appliedCount: 1,
      studentsCount: 32,
      averageScore: 6.8
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-100 text-green-800';
      case 'Rascunho': return 'bg-yellow-100 text-yellow-800';
      case 'Arquivado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleGenerateQR = (exam: any) => {
    setSelectedExam(exam);
    setShowQRDialog(true);
  };

  const handlePrintExam = (exam: any) => {
    // Lógica para imprimir a prova com QR code
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/exam/${exam.id}`)}`;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${exam.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .exam-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
              .qr-section { text-align: center; }
              .qr-code { border: 1px solid #ccc; padding: 10px; display: inline-block; }
              .instructions { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #2563eb; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Sistema SEICE</h1>
              <h2>${exam.title}</h2>
            </div>
            
            <div class="exam-info">
              <div>
                <p><strong>Disciplinas:</strong> ${exam.subjects ? exam.subjects.join(', ') : 'Multidisciplinar'}</p>
                <p><strong>Série:</strong> ${exam.grade}</p>
                <p><strong>Questões:</strong> ${exam.questions}</p>
                <p><strong>Tempo:</strong> ${exam.timeLimit} minutos</p>
                <p><strong>ID da Avaliação:</strong> ${exam.id}</p>
              </div>
              <div class="qr-section">
                <div class="qr-code">
                  <img src="${qrCodeUrl}" alt="QR Code do Cartão Resposta" />
                </div>
                <p><small>Cartão Resposta Digital</small></p>
              </div>
            </div>
            
            <div class="instructions">
              <h3>Instruções:</h3>
              <ul>
                <li>Preencha o cabeçalho com seus dados pessoais</li>
                <li>Leia cada questão com atenção</li>
                <li>Marque apenas uma alternativa por questão</li>
                <li>Use caneta azul ou preta</li>
                <li>Não rasure o cartão-resposta</li>
                <li>Use o QR Code acima para acessar o cartão resposta digital</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px;">
              <p><strong>Nome:</strong> _________________________________________________</p>
              <p><strong>Turma:</strong> _____________ <strong>Data:</strong> _______________</p>
            </div>
            
            <!-- Aqui viriam as questões da prova -->
            <div style="margin-top: 40px;">
              <h3>Questões da Avaliação</h3>
              <p><em>As questões seriam inseridas aqui dinamicamente...</em></p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Avaliações</h1>
          <p className="text-slate-600">Gerencie suas avaliações e provas</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Avaliação
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total de Avaliações</p>
                <p className="text-2xl font-semibold text-slate-800">{exams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Alunos Avaliados</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {exams.reduce((total, exam) => total + exam.studentsCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Ativas</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {exams.filter(exam => exam.status === 'Ativo').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Cartões com QR Code</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {exams.filter(exam => exam.status === 'Ativo').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exams List */}
      <div className="space-y-4">
        {exams.map(exam => (
          <Card key={exam.id} className="seice-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge className={getStatusColor(exam.status)}>
                      {exam.status}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {exam.subject}
                    </Badge>
                    <Badge variant="outline">
                      {exam.grade}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-slate-800 mb-2">
                    {exam.title}
                  </h3>
                  <p className="text-slate-600 mb-3">{exam.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-500">
                    <div className="flex items-center space-x-1">
                      <FileText className="w-4 h-4" />
                      <span>{exam.questions} questões</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{exam.timeLimit} min</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{exam.studentsCount} alunos</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>Média: {exam.averageScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleGenerateQR(exam)}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handlePrintExam(exam)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              QR Code do Cartão Resposta
            </DialogTitle>
            <DialogDescription>
              Gere e compartilhe o QR Code para impressão no cartão resposta
            </DialogDescription>
          </DialogHeader>
          
          {selectedExam && (
            <div className="space-y-4">
              <QRCodeGenerator 
                examId={selectedExam.id} 
                examTitle={selectedExam.title} 
              />
              
              <div className="space-y-2">
                <Button 
                  onClick={() => handlePrintExam(selectedExam)}
                  className="w-full"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Cartão Resposta com QR Code
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/exam/${selectedExam.id}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="w-full"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/exam/${selectedExam.id}`)}`;
                    const link = document.createElement('a');
                    link.href = qrUrl;
                    link.download = `qr-code-${selectedExam.id}.png`;
                    link.click();
                  }}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar QR Code do Cartão
                </Button>
              </div>
              
              <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg">
                <p><strong>Como usar:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>• Imprima o QR code no cartão resposta</li>
                  <li>• Alunos escaneiam para acessar o cartão digital</li>
                  <li>• Facilita a correção e digitalização das respostas</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty state */}
      {exams.length === 0 && (
        <Card className="seice-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-800 mb-2">Nenhuma avaliação criada</h3>
            <p className="text-slate-500 mb-4">
              Comece criando sua primeira avaliação
            </p>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Avaliação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}