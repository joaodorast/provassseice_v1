import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Trash2,
  Eye,
  Download,
  Camera,
  Scan,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../../utils/api';
import { toast } from 'sonner@2.0.3';

export function SendImagesPage() {
  const [selectedExam, setSelectedExam] = useState('');
  const [studentName, setStudentName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [manualAnswers, setManualAnswers] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('=== SendImagesPage: Loading data ===');
      
      const [examsResponse, imagesResponse] = await Promise.all([
        apiService.getExams(),
        apiService.getImages()
      ]);
      
      console.log('SendImagesPage: Raw exams response:', examsResponse);
      console.log('SendImagesPage: Total exams received:', examsResponse.exams?.length || 0);
      
      // Show ALL exams, not just type 'simulado'
      const allExams = (examsResponse.exams || []).filter((exam: any) => exam && exam.id && exam.title);
      console.log(`✓ SendImagesPage: Loaded ${allExams.length} valid exams`);
      
      if (allExams.length === 0 && examsResponse.exams?.length > 0) {
        console.warn('⚠️ SendImagesPage: Some exams were filtered out. Raw exams:', examsResponse.exams);
      }
      
      console.log('SendImagesPage: Final exams list:', allExams);
      setExams(allExams);
      setImages(imagesResponse.images || []);
      
      if (allExams.length === 0) {
        console.log('ℹ️ SendImagesPage: No exams available. User needs to create exams first.');
      }
    } catch (error) {
      console.error('SendImagesPage: Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedExam) {
      toast.error('Selecione um simulado primeiro');
      return;
    }

    if (!studentName.trim()) {
      toast.error('Digite o nome do aluno');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const selectedExamData = exams.find(e => e.id === selectedExam);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress((i / files.length) * 100);

        // Convert file to base64 for storage
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = e.target?.result as string;
            
            const imageData = {
              filename: file.name,
              examId: selectedExam,
              examTitle: selectedExamData?.title || 'Simulado não encontrado',
              studentName: studentName.trim(),
              size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
              mimeType: file.type,
              data: base64Data,
              pages: 1,
              status: 'Aguardando Processamento',
              uploadedAt: new Date().toLocaleString('pt-BR')
            };

            await apiService.uploadImage(imageData);
          } catch (error) {
            console.error('Error uploading file:', error);
            toast.error(`Erro ao enviar ${file.name}`);
          }
        };
        reader.readAsDataURL(file);
      }

      setUploadProgress(100);
      setTimeout(async () => {
        setIsUploading(false);
        setUploadProgress(0);
        setStudentName('');
        await loadData();
        toast.success(`${files.length} arquivo(s) enviado(s) com sucesso!`);
      }, 1000);

    } catch (error) {
      console.error('Error in file upload:', error);
      toast.error('Erro durante o upload');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleProcessImage = async (image: any) => {
    const examData = exams.find(e => e.id === image.examId);
    
    if (!examData || !examData.questions) {
      toast.error('Simulado não encontrado ou sem questões');
      return;
    }

    // Initialize manual answers with -1 (not answered)
    setManualAnswers(new Array(examData.questions.length).fill(-1));
    setSelectedImage(image);
    setShowAnswerSheet(true);
  };

  const handleManualCorrection = async () => {
    if (!selectedImage) return;

    const examData = exams.find(e => e.id === selectedImage.examId);
    if (!examData) {
      toast.error('Simulado não encontrado');
      return;
    }

    setIsProcessing(true);

    try {
      // Calculate score based on manual answers
      let correctCount = 0;
      const results = examData.questions.map((question: any, index: number) => {
        const studentAnswer = manualAnswers[index];
        const isCorrect = studentAnswer === question.correctAnswer;
        if (isCorrect) correctCount++;
        
        return {
          question: question.question,
          subject: question.subject,
          studentAnswer: studentAnswer >= 0 ? String.fromCharCode(65 + studentAnswer) : 'Não respondida',
          correctAnswer: String.fromCharCode(65 + question.correctAnswer),
          isCorrect
        };
      });

      const score = Math.round((correctCount / examData.questions.length) * 100);

      // Create submission
      const submissionData = {
        examId: selectedImage.examId,
        examTitle: examData.title,
        studentName: selectedImage.studentName,
        answers: manualAnswers,
        score: correctCount,
        totalQuestions: examData.questions.length,
        percentage: score,
        results,
        submittedAt: new Date().toISOString(),
        correctionType: 'manual'
      };

      await apiService.createSubmission(submissionData);

      // Update image status
      await apiService.updateImageStatus(selectedImage.id, {
        status: 'Processada',
        score,
        processedAt: new Date().toLocaleString('pt-BR')
      });

      toast.success(`Correção concluída! Nota: ${score}%`);
      setShowAnswerSheet(false);
      setSelectedImage(null);
      await loadData();
    } catch (error) {
      console.error('Error processing correction:', error);
      toast.error('Erro ao processar correção');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteImage(imageId);
      toast.success('Imagem excluída com sucesso!');
      await loadData();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Erro ao excluir imagem');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processada': return 'bg-green-100 text-green-800';
      case 'Processando': return 'bg-yellow-100 text-yellow-800';
      case 'Aguardando Processamento': return 'bg-blue-100 text-blue-800';
      case 'Erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Processada': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Processando': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Aguardando Processamento': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Erro': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Correção com Cartão Resposta</h1>
        <p className="text-slate-600">Envie imagens de cartões resposta para correção automática dos simulados</p>
      </div>

      {/* Upload Section */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload de Cartões Resposta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Selecione o Simulado *
              </label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o simulado..." />
                </SelectTrigger>
                <SelectContent>
                  {exams.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Nenhum simulado disponível. Crie um simulado primeiro.
                    </div>
                  ) : (
                    exams.map(exam => {
                      console.log('Rendering exam option in SendImages:', exam.id, exam.title);
                      return (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.title} ({exam.questions?.length || exam.totalQuestions || 0} questões)
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {exams.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {exams.length} simulado(s) disponível(is)
                </p>
              )}
              {exams.length === 0 && !loading && (
                <Card className="mt-3 border-yellow-200 bg-yellow-50">
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <p className="text-xs text-yellow-800">
                        Você precisa criar um simulado antes de enviar cartões resposta.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome do Aluno *
              </label>
              <Input
                placeholder="Digite o nome completo do aluno"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div>
                <p className="text-lg font-medium text-slate-800 mb-2">
                  Arraste e solte o cartão resposta aqui
                </p>
                <p className="text-slate-500 mb-4">
                  ou clique para selecionar arquivos
                </p>
                <p className="text-xs text-slate-400">
                  Formatos aceitos: JPG, PNG, PDF • Tamanho máximo: 10MB por arquivo
                </p>
              </div>

              <div>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={!selectedExam || !studentName.trim()}
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium cursor-pointer ${
                    selectedExam && studentName.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivos
                </label>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-slate-600">
                    Enviando... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <Scan className="w-4 h-4 mr-2" />
                Dicas para melhor correção:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Certifique-se de que o cartão resposta está completamente visível</li>
                <li>• Use boa iluminação e evite sombras</li>
                <li>• As marcações devem estar bem preenchidas e legíveis</li>
                <li>• Evite dobras, rasgos ou manchas no cartão</li>
                <li>• Após enviar, clique em "Processar" para fazer a correção manual</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total de Imagens</p>
                <p className="text-2xl font-semibold text-slate-800">{images.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Corrigidas</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {images.filter(img => img.status === 'Processada').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Aguardando</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {images.filter(img => img.status === 'Aguardando Processamento').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Com Erro</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {images.filter(img => img.status === 'Erro').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Images List */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Cartões Resposta Enviados ({images.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {images.map(image => (
              <Card key={image.id} className="seice-card border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-6 h-6 text-slate-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-slate-800">{image.studentName}</p>
                          <Badge className={getStatusColor(image.status)}>
                            {image.status}
                          </Badge>
                          {image.score !== undefined && (
                            <Badge className={
                              image.score >= 70 ? 'bg-green-100 text-green-800' :
                              image.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              Nota: {image.score}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{image.examTitle}</p>
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span>Arquivo: {image.filename}</span>
                          <span>•</span>
                          <span>Tamanho: {image.size}</span>
                          <span>•</span>
                          <span>Enviado: {image.uploadedAt}</span>
                          {image.processedAt && (
                            <>
                              <span>•</span>
                              <span>Corrigido: {image.processedAt}</span>
                            </>
                          )}
                        </div>
                        {image.error && (
                          <p className="text-xs text-red-600 mt-1">Erro: {image.error}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {getStatusIcon(image.status)}
                      
                      {image.status === 'Aguardando Processamento' && (
                        <Button 
                          size="sm"
                          onClick={() => handleProcessImage(image)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FileCheck className="w-4 h-4 mr-1" />
                          Processar
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteImage(image.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {images.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-800 mb-2">Nenhum cartão resposta enviado</h3>
              <p className="text-slate-500">
                Comece selecionando um simulado, informando o nome do aluno e enviando as imagens dos cartões
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Answer Sheet Dialog */}
      <Dialog open={showAnswerSheet} onOpenChange={setShowAnswerSheet}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Correção Manual - {selectedImage?.studentName}</span>
              <Badge className="bg-blue-100 text-blue-800">
                {exams.find(e => e.id === selectedImage?.examId)?.title}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Selecione a alternativa marcada pelo aluno em cada questão. As respostas corretas estão destacadas em verde.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-orange-900">Instruções de Correção</p>
                    <p className="text-sm text-orange-800 mt-1">
                      Selecione a alternativa marcada pelo aluno em cada questão.
                      As respostas corretas estão destacadas em verde para referência.
                      Deixe em branco as questões não respondidas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {exams.find(e => e.id === selectedImage?.examId)?.questions.map((question: any, index: number) => (
                  <Card key={index} className="seice-card">
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-800">
                            Questão {index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {question.subject}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700">{question.question}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600 mb-2">
                          Selecione a resposta do aluno:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {question.options.map((option: string, optIdx: number) => {
                            const isCorrect = optIdx === question.correctAnswer;
                            const isSelected = manualAnswers[index] === optIdx;
                            
                            return (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  const newAnswers = [...manualAnswers];
                                  newAnswers[index] = isSelected ? -1 : optIdx;
                                  setManualAnswers(newAnswers);
                                }}
                                className={`text-left p-2 rounded text-sm border transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 font-medium'
                                    : isCorrect
                                      ? 'border-green-300 bg-green-50'
                                      : 'border-slate-200 bg-slate-50'
                                } hover:border-slate-400`}
                              >
                                <span className="font-semibold">{String.fromCharCode(65 + optIdx)}) </span>
                                {option}
                                {isCorrect && (
                                  <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                                    Correta
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Summary */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Progresso da Correção</p>
                    <p className="text-sm text-blue-800 mt-1">
                      {manualAnswers.filter(a => a >= 0).length} de {manualAnswers.length} questões marcadas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      {Math.round((manualAnswers.filter(a => a >= 0).length / manualAnswers.length) * 100)}%
                    </p>
                    <p className="text-xs text-blue-700">Completo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAnswerSheet(false);
                  setSelectedImage(null);
                }}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleManualCorrection}
                disabled={isProcessing || manualAnswers.filter(a => a >= 0).length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalizar Correção
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}