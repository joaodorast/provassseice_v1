import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, Image as ImageIcon, FileText, CheckCircle, XCircle, Clock, Trash2, Camera,
  Scan, FileCheck, AlertCircle, User, Loader2, Users, AlertTriangle, Download, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';

export function SendImagesPage() {
  const [selectedExam, setSelectedExam] = useState('');
  const [uploadMode, setUploadMode] = useState('batch');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [manualAnswers, setManualAnswers] = useState([]);
  const [batchImages, setBatchImages] = useState([]);
  const [showBatchProcessing, setShowBatchProcessing] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [completedCorrections, setCompletedCorrections] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      const exam = exams.find(e => e.id === selectedExam);
      if (exam && exam.selectedClass) {
        const filteredStudents = students.filter(s => s.class === exam.selectedClass);
        setAvailableStudents(filteredStudents);
        console.log(`✓ Filtered ${filteredStudents.length} students from class: ${exam.selectedClass}`);
      } else {
        setAvailableStudents(students);
      }
      setSelectedStudent('');
    }
  }, [selectedExam, students, exams]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('=== SendImagesPage: Loading data ===');
      
      const [examsResponse, studentsResponse, imagesResponse] = await Promise.all([
        apiService.getExams(),
        apiService.getStudents(),
        apiService.getImages()
      ]);
      
      const allExams = (examsResponse.exams || []).filter((exam) => {
        if (!exam || !exam.id || !exam.title) return false;
        
        const hasQuestions = exam.questions && Array.isArray(exam.questions) && exam.questions.length > 0;
        const hasSections = exam.sections && Array.isArray(exam.sections) && exam.sections.length > 0;
        
        if (!hasQuestions && !hasSections) {
          console.warn(`⚠️ Simulado "${exam.title}" sem questões ou seções - será ignorado`);
          return false;
        }
        
        if (hasSections && !hasQuestions) {
          exam.questions = exam.sections.flatMap(section => 
            (section.questions || []).map(q => ({
              ...q,
              sectionId: section.id,
              sectionName: section.name
            }))
          );
          console.log(`✓ Criado array flat de ${exam.questions.length} questões para "${exam.title}"`);
        }
        
        return true;
      });
      
      const allStudents = (studentsResponse.students || []).filter((s) => s && s.id && s.name);
      
      console.log(`✓ SendImagesPage: Loaded ${allExams.length} exams válidos`);
      console.log(`✓ SendImagesPage: Loaded ${allStudents.length} students`);
      
      setExams(allExams);
      setStudents(allStudents);
      setImages(imagesResponse.images || []);
      
      if (allExams.length === 0) {
        console.log('ℹ️ SendImagesPage: No valid exams available');
        toast.error('Nenhum simulado válido encontrado. Crie um simulado com questões primeiro.');
      }
      
    } catch (error) {
      console.error('SendImagesPage: Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const reloadOnlyImages = async () => {
    try {
      console.log('🔄 Recarregando apenas imagens...');
      const imagesResponse = await apiService.getImages();
      const newImages = imagesResponse.images || [];
      console.log(`✓ ${newImages.length} imagens carregadas da API:`, newImages);
      setImages(newImages);
      
      if (newImages.length > 0) {
        console.log('✅ Imagens atualizadas no estado:', newImages.map(img => ({
          id: img.id,
          filename: img.filename,
          status: img.status
        })));
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar imagens:', error);
      toast.error('Erro ao carregar imagens');
    }
  };

  const validateExamStructure = (exam) => {
    if (!exam) {
      return { valid: false, error: 'Simulado não encontrado' };
    }
    
    if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
      return { 
        valid: false, 
        error: `Simulado "${exam.title}" não possui questões. Verifique a estrutura do simulado.` 
      };
    }
    
    const invalidQuestions = exam.questions.filter(q => 
      !q.question || !q.options || !Array.isArray(q.options) || typeof q.correctAnswer !== 'number'
    );
    
    if (invalidQuestions.length > 0) {
      return { 
        valid: false, 
        error: `${invalidQuestions.length} questão(ões) do simulado estão incompletas` 
      };
    }
    
    return { valid: true };
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedExam) {
      toast.error('Selecione um simulado primeiro');
      return;
    }

    if (uploadMode === 'individual' && !selectedStudent) {
      toast.error('Selecione um aluno');
      return;
    }

    const maxSize = 30 * 1024 * 1024;
    const invalidFiles = Array.from(files).filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} arquivo(s) excede(m) o tamanho máximo de 30MB:\n${invalidFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`);
      return;
    }

    const selectedExamData = exams.find(e => e.id === selectedExam);
    
    const validation = validateExamStructure(selectedExamData);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (uploadMode === 'batch') {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(((i + 1) / files.length) * 100);

          const reader = new FileReader();
          
          await new Promise((resolve, reject) => {
            reader.onload = async (e) => {
              try {
                const base64Data = e.target?.result;
                
                const imageData = {
                  filename: file.name,
                  examId: selectedExam,
                  examTitle: selectedExamData.title,
                  studentId: 'batch',
                  studentName: 'Lote - Todos os Alunos',
                  studentEmail: '',
                  studentClass: selectedExamData.selectedClass || '',
                  studentGrade: selectedExamData.grade || '',
                  size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
                  mimeType: file.type,
                  data: base64Data,
                  pages: 1,
                  status: 'Aguardando Processamento',
                  uploadedAt: new Date().toLocaleString('pt-BR'),
                  isBatch: true,
                  totalQuestions: selectedExamData.questions.length
                };

                console.log('📤 Uploading batch image:', imageData.filename);
                const response = await apiService.uploadImage(imageData);
                
                if (response && !response.error) {
                  console.log('✅ Batch image uploaded successfully:', response);
                  
                  const newImage = {
                    id: response.image?.id || `temp-${Date.now()}-${i}`,
                    ...imageData,
                    uploadedAt: imageData.uploadedAt
                  };
                  
                  setImages(prev => [...prev, newImage]);
                  console.log('📷 Imagem adicionada ao estado local:', newImage.filename);
                  
                  resolve();
                } else {
                  throw new Error(response.error || 'Upload failed');
                }
              } catch (error) {
                console.error('Error uploading file:', error);
                toast.error(`Erro ao enviar ${file.name}`);
                reject(error);
              }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        }

        toast.success(`✅ ${files.length} arquivo(s) enviado(s) em modo lote!`);
        console.log('🔄 Carregando imagens atualizadas após upload em lote...');
        await reloadOnlyImages();

      } else {
        const selectedStudentData = students.find(s => s.id === selectedStudent);
        
        if (!selectedStudentData) {
          toast.error('Aluno não encontrado');
          setIsUploading(false);
          return;
        }

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(((i + 1) / files.length) * 100);

          const reader = new FileReader();
          
          await new Promise((resolve, reject) => {
            reader.onload = async (e) => {
              try {
                const base64Data = e.target?.result;
                
                const imageData = {
                  filename: file.name,
                  examId: selectedExam,
                  examTitle: selectedExamData.title,
                  studentId: selectedStudent,
                  studentName: selectedStudentData.name,
                  studentEmail: selectedStudentData.email || '',
                  studentClass: selectedStudentData.class || '',
                  studentGrade: selectedStudentData.grade || '',
                  size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
                  mimeType: file.type,
                  data: base64Data,
                  pages: 1,
                  status: 'Aguardando Processamento',
                  uploadedAt: new Date().toLocaleString('pt-BR'),
                  isBatch: false,
                  totalQuestions: selectedExamData.questions.length
                };

                console.log('📤 Uploading image:', imageData.filename);
                const response = await apiService.uploadImage(imageData);
                
                if (response && !response.error) {
                  console.log('✅ Image uploaded successfully:', response);
                  
                  const newImage = {
                    id: response.image?.id || `temp-${Date.now()}-${i}`,
                    ...imageData,
                    uploadedAt: imageData.uploadedAt
                  };
                  
                  setImages(prev => [...prev, newImage]);
                  console.log('📷 Imagem adicionada ao estado local:', newImage.filename);
                  
                  resolve();
                } else {
                  throw new Error(response.error || 'Upload failed');
                }
              } catch (error) {
                console.error('Error uploading file:', error);
                toast.error(`Erro ao enviar ${file.name}`);
                reject(error);
              }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        }

        toast.success(`✅ ${files.length} arquivo(s) enviado(s) com sucesso!`);
        setSelectedStudent('');
        console.log('🔄 Carregando imagens atualizadas após upload individual...');
        await reloadOnlyImages();
      }

    } catch (error) {
      console.error('Error in file upload:', error);
      toast.error('Erro durante o upload');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleProcessImage = async (image) => {
    const examData = exams.find(e => e.id === image.examId);
    
    const validation = validateExamStructure(examData);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    console.log('📋 Processing image for exam:', examData.title);
    console.log('📝 Total questions:', examData.questions.length);

    if (image.isBatch) {
      // TODOS os alunos disponíveis, independente da ordem
      const batchStudentsList = availableStudents.map(student => ({
        ...image,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        studentClass: student.class,
        studentGrade: student.grade
      }));
      
      setBatchImages(batchStudentsList);
      setManualAnswers(new Array(examData.questions.length).fill(-1));
      setSelectedImage(image);
      setCurrentBatchIndex(0);
      setCompletedCorrections([]);
      setShowBatchProcessing(true);
      
      toast.success(`🎯 ${batchStudentsList.length} alunos carregados para correção em lote!`);
    } else {
      setManualAnswers(new Array(examData.questions.length).fill(-1));
      setSelectedImage(image);
      setShowAnswerSheet(true);
    }
  };

  const generateExcelExport = (corrections, examData, type = 'all') => {
    // Organizar por matéria
    const bySubject = {};
    
    corrections.forEach(correction => {
      correction.subjectPerformances.forEach(subj => {
        if (!bySubject[subj.subject]) {
          bySubject[subj.subject] = [];
        }
        bySubject[subj.subject].push({
          aluno: correction.studentName,
          turma: correction.studentClass,
          acertos: subj.correctAnswers,
          total: subj.totalQuestions,
          percentual: subj.percentage
        });
      });
    });

    // Gerar CSV para cada matéria ou geral
    const generateCSV = (data, subject) => {
      let csv = `Matéria: ${subject}\n`;
      csv += `Simulado: ${examData.title}\n`;
      csv += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
      csv += 'Aluno,Turma,Acertos,Total,Percentual\n';
      
      data.forEach(row => {
        csv += `${row.aluno},${row.turma},${row.acertos},${row.total},${row.percentual}%\n`;
      });
      
      return csv;
    };

    if (type === 'all') {
      // Planilha geral
      let csv = `RELATÓRIO GERAL - ${examData.title}\n`;
      csv += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
      csv += 'Aluno,Turma,Nota,Percentual\n';
      
      corrections.forEach(corr => {
        csv += `${corr.studentName},${corr.studentClass},${corr.score}/${corr.totalQuestions},${corr.percentage}%\n`;
      });
      
      csv += '\n\nDETALHAMENTO POR MATÉRIA\n\n';
      
      Object.entries(bySubject).forEach(([subject, data]) => {
        csv += `\n${subject}\n`;
        csv += 'Aluno,Turma,Acertos,Total,Percentual\n';
        data.forEach(row => {
          csv += `${row.aluno},${row.turma},${row.acertos},${row.total},${row.percentual}%\n`;
        });
      });
      
      return csv;
    } else {
      // Planilha específica de matéria
      return generateCSV(bySubject[type] || [], type);
    }
  };

  const downloadExcel = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchCorrection = async () => {
    if (!selectedImage || currentBatchIndex >= batchImages.length) return;

    const currentStudent = batchImages[currentBatchIndex];
    const examData = exams.find(e => e.id === selectedImage.examId);
    
    if (!examData) {
      toast.error('Simulado não encontrado');
      return;
    }

    const answeredCount = manualAnswers.filter(a => a >= 0).length;
    if (answeredCount === 0) {
      toast.error('Marque pelo menos uma resposta antes de continuar');
      return;
    }

    setIsProcessing(true);

    try {
      console.log(`🔄 Processing correction for student: ${currentStudent.studentName}`);
      
      let correctCount = 0;
      const results = examData.questions.map((question, index) => {
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

      const subjectPerformances = {};
      examData.questions.forEach((question, index) => {
        const subject = question.subject || 'Geral';
        if (!subjectPerformances[subject]) {
          subjectPerformances[subject] = { total: 0, correct: 0 };
        }
        subjectPerformances[subject].total++;
        if (manualAnswers[index] === question.correctAnswer) {
          subjectPerformances[subject].correct++;
        }
      });

      const subjectPerformanceArray = Object.entries(subjectPerformances).map(([subject, data]) => ({
        subject,
        totalQuestions: data.total,
        correctAnswers: data.correct,
        percentage: Math.round((data.correct / data.total) * 100)
      }));

      const submissionData = {
        examId: selectedImage.examId,
        examTitle: examData.title,
        studentId: currentStudent.studentId,
        studentName: currentStudent.studentName,
        studentEmail: currentStudent.studentEmail,
        studentClass: currentStudent.studentClass,
        studentGrade: currentStudent.studentGrade || examData.grade || 'Ensino Médio',
        answers: manualAnswers,
        correctAnswers: examData.questions.map((q) => q.correctAnswer),
        score: correctCount,
        totalQuestions: examData.questions.length,
        percentage: score,
        subjectPerformances: subjectPerformanceArray,
        timeSpent: 0,
        results,
        submittedAt: new Date().toISOString(),
        gradingStatus: 'graded',
        correctionType: 'manual-image-batch',
        questionWeights: examData.questions.map((q, idx) => ({
          questionIndex: idx,
          weight: q.weight || 1,
          subject: q.subject || 'Geral'
        }))
      };

      console.log('📤 Creating submission via API:', submissionData);
      const submissionResponse = await apiService.createSubmission(submissionData);
      
      if (submissionResponse && !submissionResponse.error) {
        console.log(`✅ Submission created for ${currentStudent.studentName}`);
        
        // Adicionar às correções completas
        setCompletedCorrections(prev => [...prev, submissionData]);
        
        toast.success(
          `✅ ${currentStudent.studentName}: ${score}% (${correctCount}/${examData.questions.length})`,
          { duration: 3000 }
        );

        if (currentBatchIndex === batchImages.length - 1) {
          // Último aluno
          console.log('✅ Lote finalizado - todas as correções completas');

          toast.success(
            `🎉 Correção em lote finalizada! ${batchImages.length} alunos corrigidos.\n\nAgora você pode exportar os resultados!`,
            { duration: 5000 }
          );
          
          // NÃO fechar o dialog - mostrar opções de exportação
          // setShowBatchProcessing(false) - REMOVIDO
        } else {
          // Próximo aluno
          setCurrentBatchIndex(prev => prev + 1);
          setManualAnswers(new Array(examData.questions.length).fill(-1));
        }
      } else {
        throw new Error(submissionResponse.error || 'Falha ao criar submissão');
      }
    } catch (error) {
      console.error('❌ Error processing correction:', error);
      toast.error('Erro ao processar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCorrection = async () => {
    if (!selectedImage) return;

    const examData = exams.find(e => e.id === selectedImage.examId);
    if (!examData) {
      toast.error('Simulado não encontrado');
      return;
    }

    const answeredCount = manualAnswers.filter(a => a >= 0).length;
    if (answeredCount === 0) {
      toast.error('Marque pelo menos uma resposta antes de finalizar');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔄 Starting manual correction process...');
      
      let correctCount = 0;
      const results = examData.questions.map((question, index) => {
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

      console.log(`📊 Score calculated: ${correctCount}/${examData.questions.length} (${score}%)`);

      const subjectPerformances = {};
      examData.questions.forEach((question, index) => {
        const subject = question.subject || 'Geral';
        if (!subjectPerformances[subject]) {
          subjectPerformances[subject] = { total: 0, correct: 0 };
        }
        subjectPerformances[subject].total++;
        if (manualAnswers[index] === question.correctAnswer) {
          subjectPerformances[subject].correct++;
        }
      });

      const subjectPerformanceArray = Object.entries(subjectPerformances).map(([subject, data]) => ({
        subject,
        totalQuestions: data.total,
        correctAnswers: data.correct,
        percentage: Math.round((data.correct / data.total) * 100)
      }));

      const submissionData = {
        examId: selectedImage.examId,
        examTitle: examData.title,
        studentId: selectedImage.studentId,
        studentName: selectedImage.studentName,
        studentEmail: selectedImage.studentEmail,
        studentClass: selectedImage.studentClass,
        studentGrade: selectedImage.studentGrade || examData.grade || 'Ensino Médio',
        answers: manualAnswers,
        correctAnswers: examData.questions.map((q) => q.correctAnswer),
        score: correctCount,
        totalQuestions: examData.questions.length,
        percentage: score,
        subjectPerformances: subjectPerformanceArray,
        timeSpent: 0,
        results,
        submittedAt: new Date().toISOString(),
        gradingStatus: 'graded',
        correctionType: 'manual-image',
        questionWeights: examData.questions.map((q, idx) => ({
          questionIndex: idx,
          weight: q.weight || 1,
          subject: q.subject || 'Geral'
        }))
      };

      console.log('📤 Creating submission via API:', submissionData);
      const submissionResponse = await apiService.createSubmission(submissionData);
      
      if (submissionResponse && !submissionResponse.error) {
        console.log('✅ Submission created successfully');

        toast.success(
          `✅ Correção concluída!\n\nNota: ${score}% (${correctCount}/${examData.questions.length} acertos)\n\nResultado salvo em "Correção de Simulados"\n\nVocê pode reprocessar esta imagem a qualquer momento.`,
          { duration: 6000 }
        );
        
        setShowAnswerSheet(false);
        setSelectedImage(null);
        await reloadOnlyImages();
      } else {
        throw new Error(submissionResponse.error || 'Falha ao criar submissão');
      }
    } catch (error) {
      console.error('❌ Error processing correction:', error);
      toast.error('Erro ao processar correção: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteImage(imageId);
      toast.success('Imagem excluída com sucesso!');
      await reloadOnlyImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Erro ao excluir imagem');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Processada': return 'bg-green-100 text-green-800';
      case 'Processando': return 'bg-yellow-100 text-yellow-800';
      case 'Aguardando Processamento': return 'bg-blue-100 text-blue-800';
      case 'Erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Processada': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Processando': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Aguardando Processamento': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Erro': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleExportExcel = (type, subject = null) => {
    const examData = exams.find(e => e.id === selectedImage.examId);
    if (!examData) return;

    const content = generateExcelExport(completedCorrections, examData, subject || 'all');
    const timestamp = new Date().toISOString().split('T')[0];
    
    let filename;
    if (type === 'general') {
      filename = `Relatorio_Geral_${examData.title}_${timestamp}.csv`;
    } else {
      filename = `${subject}_${examData.title}_${timestamp}.csv`;
    }
    
    downloadExcel(content, filename);
    toast.success(`✅ Planilha exportada: ${filename}`);
  };

  const getUniqueSubjects = () => {
    const examData = exams.find(e => e.id === selectedImage?.examId);
    if (!examData) return [];
    
    const subjects = new Set();
    examData.questions.forEach(q => {
      subjects.add(q.subject || 'Geral');
    });
    
    return Array.from(subjects);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Correção com Cartão Resposta</h1>
        <p className="text-slate-600">Envie imagens de cartões resposta e selecione as respostas marcadas pelo aluno</p>
      </div>

      {exams.length === 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-900 mb-2">Nenhum simulado válido disponível</p>
                <p className="text-sm text-orange-800">
                  Para usar esta funcionalidade, você precisa primeiro criar um simulado com questões.
                  Vá para "Criar Simulado" e configure pelo menos uma seção com questões.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2">
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
                Modo de Upload *
              </label>
              <Select value={uploadMode} onValueChange={(value) => setUploadMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="batch">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Lote - Todos os Alunos da Turma
                    </div>
                  </SelectItem>
                  <SelectItem value="individual">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Individual - Um Aluno Específico
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {uploadMode === 'batch' 
                  ? 'Um arquivo com cartões de todos os alunos' 
                  : 'Um arquivo por aluno específico'}
              </p>
            </div>

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
                    exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title} ({exam.questions?.length || 0} questões)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {exams.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {exams.length} simulado(s) disponível(is)
                </p>
              )}
            </div>
          </div>

          {uploadMode === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Selecione o Aluno *
              </label>
              <Select 
                value={selectedStudent} 
                onValueChange={setSelectedStudent}
                disabled={!selectedExam}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedExam 
                      ? "Selecione um simulado primeiro" 
                      : "Escolha o aluno..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      {selectedExam 
                        ? "Nenhum aluno encontrado para esta turma"
                        : "Selecione um simulado primeiro"
                      }
                    </div>
                  ) : (
                    availableStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {student.name} - {student.class}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedExam && availableStudents.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {availableStudents.length} aluno(s) da turma
                </p>
              )}
            </div>
          )}

          {uploadMode === 'batch' && selectedExam && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Modo de Lote Ativado</p>
                    <p className="text-sm text-blue-800 mt-1">
                      O arquivo será processado para todos os {availableStudents.length} alunos da turma.
                      Você preencherá as respostas de cada aluno sequencialmente após o upload.
                      Todos os alunos serão carregados, independente da ordem alfabética.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                  Formatos aceitos: JPG, PNG, PDF • Tamanho máximo: 30MB por arquivo
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
                  disabled={!selectedExam || (uploadMode === 'individual' && !selectedStudent)}
                />
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium cursor-pointer ${
                    selectedExam && (uploadMode === 'batch' || selectedStudent)
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
                    Enviando... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <Scan className="w-4 h-4 mr-2" />
                Como funciona a correção:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Modo Lote:</strong> Envie um arquivo com cartões de todos os alunos e corrija sequencialmente</li>
                <li>• <strong>Modo Individual:</strong> Envie um arquivo para cada aluno específico</li>
                <li>• Clique em "Processar" e marque as respostas que o aluno preencheu</li>
                <li>• O sistema calculará automaticamente a nota comparando com o gabarito</li>
                <li>• Após finalizar o lote, você poderá exportar planilhas Excel por matéria ou geral</li>
                <li>• <strong>Tamanho máximo:</strong> 30MB por arquivo (JPG, PNG, PDF)</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-2">
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

        <Card className="border-2">
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

        <Card className="border-2">
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

        <Card className="border-2">
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

      <Card className="border-2">
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
              <Card key={image.id} className="border-2 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {image.isBatch ? (
                          <Users className="w-6 h-6 text-slate-600" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-slate-800">{image.studentName}</p>
                          {image.isBatch && (
                            <Badge className="bg-purple-100 text-purple-800">
                              <Users className="w-3 h-3 mr-1" />
                              Lote
                            </Badge>
                          )}
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
                      
                      <Button 
                        size="sm"
                        onClick={() => handleProcessImage(image)}
                        className={
                          image.status === 'Processada' 
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }
                      >
                        <FileCheck className="w-4 h-4 mr-1" />
                        {image.status === 'Processada' ? 'Reprocessar' : 'Processar'}
                      </Button>
                      
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
                Comece selecionando um simulado e o modo de upload (lote ou individual)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para correção individual */}
      <Dialog open={showAnswerSheet} onOpenChange={setShowAnswerSheet}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Correção Manual - {selectedImage?.studentName}</span>
              <Badge className="bg-blue-100 text-blue-800">
                {exams.find(e => e.id === selectedImage?.examId)?.title}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Marque as alternativas que o aluno preencheu no cartão resposta. As respostas corretas estão destacadas em verde.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-900">Instruções de Correção</p>
                      <p className="text-sm text-orange-800 mt-1">
                        Olhe a imagem do cartão resposta e selecione a alternativa que o aluno marcou em cada questão.
                        As respostas corretas estão destacadas em verde para referência.
                        Deixe em branco as questões não respondidas pelo aluno.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4 pb-4">
                {exams.find(e => e.id === selectedImage?.examId)?.questions.map((question, index) => (
                  <Card key={index} className="border-2">
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
                          {question.options.map((option, optIdx) => {
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
                                    ? 'border-blue-500 bg-blue-50 font-medium ring-2 ring-blue-200'
                                    : isCorrect
                                      ? 'border-green-300 bg-green-50'
                                      : 'border-slate-200 bg-slate-50'
                                } hover:border-slate-400`}
                              >
                                <span className="font-semibold">{String.fromCharCode(65 + optIdx)}) </span>
                                {option}
                                {isCorrect && (
                                  <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                                    ✓ Gabarito
                                  </Badge>
                                )}
                                {isSelected && (
                                  <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                                    Marcada
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
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t mt-4">
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
        </DialogContent>
      </Dialog>

      {/* Dialog para correção em lote */}
      <Dialog open={showBatchProcessing} onOpenChange={(open) => {
        if (!open && completedCorrections.length < batchImages.length) {
          if (confirm('Você tem correções não finalizadas. Deseja realmente sair?')) {
            setShowBatchProcessing(false);
            setBatchImages([]);
            setSelectedImage(null);
            setCurrentBatchIndex(0);
            setCompletedCorrections([]);
          }
        } else {
          setShowBatchProcessing(open);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>
                {currentBatchIndex >= batchImages.length ? 
                  'Correção em Lote Finalizada!' : 
                  `Correção em Lote - Aluno ${currentBatchIndex + 1} de ${batchImages.length}`
                }
              </span>
              <Badge className="bg-purple-100 text-purple-800">
                {exams.find(e => e.id === selectedImage?.examId)?.title}
              </Badge>
            </DialogTitle>
            {currentBatchIndex < batchImages.length && (
              <DialogDescription>
                Corrigindo: <strong>{batchImages[currentBatchIndex]?.studentName}</strong>
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-900">Progresso do Lote</p>
                        <p className="text-sm text-purple-800">
                          {completedCorrections.length} de {batchImages.length} alunos corrigidos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-900">
                        {Math.round((completedCorrections.length / batchImages.length) * 100)}%
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={(completedCorrections.length / batchImages.length) * 100} 
                    className="mt-3"
                  />
                </CardContent>
              </Card>

              {currentBatchIndex >= batchImages.length ? (
                // Tela de finalização com exportação
                <div className="space-y-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-green-900 mb-2">
                          Todas as Correções Concluídas!
                        </h3>
                        <p className="text-green-800">
                          {completedCorrections.length} alunos corrigidos com sucesso
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileSpreadsheet className="w-5 h-5 mr-2" />
                        Exportar Planilhas Excel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Button 
                          onClick={() => handleExportExcel('general')}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exportar Planilha Geral (Todas as Matérias)
                        </Button>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-slate-700 mb-3">
                          Exportar por Matéria:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {getUniqueSubjects().map(subject => (
                            <Button
                              key={subject}
                              onClick={() => handleExportExcel('subject', subject)}
                              variant="outline"
                              className="w-full"
                            >
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              {subject}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-3">
                          Resumo das Correções:
                        </h4>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {completedCorrections.map((corr, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <span className="text-sm">{corr.studentName}</span>
                              <Badge className={
                                corr.percentage >= 70 ? 'bg-green-100 text-green-800' :
                                corr.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {corr.percentage}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Tela de correção do aluno atual
                <>
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-orange-900">Instruções</p>
                          <p className="text-sm text-orange-800 mt-1">
                            Marque as respostas do aluno <strong>{batchImages[currentBatchIndex]?.studentName}</strong> no cartão resposta.
                            Após finalizar, você será direcionado para o próximo aluno automaticamente.
                            Nenhum aluno será pulado - todos serão corrigidos.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4 pb-4">
                    {exams.find(e => e.id === selectedImage?.examId)?.questions.map((question, index) => (
                      <Card key={index} className="border-2">
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
                              {question.options.map((option, optIdx) => {
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
                                        ? 'border-blue-500 bg-blue-50 font-medium ring-2 ring-blue-200'
                                        : isCorrect
                                          ? 'border-green-300 bg-green-50'
                                          : 'border-slate-200 bg-slate-50'
                                    } hover:border-slate-400`}
                                  >
                                    <span className="font-semibold">{String.fromCharCode(65 + optIdx)}) </span>
                                    {option}
                                    {isCorrect && (
                                      <Badge className="ml-2 bg-green-100 text-green-800 text-xs">
                                        ✓ Gabarito
                                      </Badge>
                                    )}
                                    {isSelected && (
                                      <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                                        Marcada
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

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">Progresso desta Correção</p>
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
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t mt-4">
            {currentBatchIndex >= batchImages.length ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    setShowBatchProcessing(false);
                    setBatchImages([]);
                    setSelectedImage(null);
                    setCurrentBatchIndex(0);
                    setCompletedCorrections([]);
                    await reloadOnlyImages();
                  }}
                >
                  Fechar
                </Button>
                <Button 
                  onClick={() => handleExportExcel('general')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Relatório Geral
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (confirm('Você tem correções não finalizadas. Deseja realmente sair?')) {
                      setShowBatchProcessing(false);
                      setBatchImages([]);
                      setSelectedImage(null);
                      setCurrentBatchIndex(0);
                      setCompletedCorrections([]);
                    }
                  }}
                  disabled={isProcessing}
                >
                  Cancelar Lote
                </Button>
                <Button 
                  onClick={handleBatchCorrection}
                  disabled={isProcessing || manualAnswers.filter(a => a >= 0).length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : currentBatchIndex === batchImages.length - 1 ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finalizar Último Aluno
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Próximo Aluno ({currentBatchIndex + 2}/{batchImages.length})
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}