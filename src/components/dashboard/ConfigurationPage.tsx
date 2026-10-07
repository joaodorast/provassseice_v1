import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Settings, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Database, 
  Mail,
  Palette,
  Globe,
  Clock,
  BookOpen,
  Users,
  FileText,
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  Check,
  Loader2,
  Key,
  Plus,
  Trash2,
  Edit,
  GraduationCap,
  Lightbulb
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { confirmAction } from '../../utils/confirm';
import { User, Exam, Submission } from '../../App';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { apiService } from '../../utils/api';
import { ExcelExporter, ExcelColumn } from '../../utils/excel-utils';
import { readStudentsFromFile, isStudentSpreadsheet, ensureClassesExist, stripAccents, saveImportedStudents, describeStudentImport } from '../../utils/student-import';
import { ActionResultDialog, ActionResult } from './ActionResultDialog';

// Funções ainda sem efeito real no sistema (as opções são salvas mas nada as usa):
// abas Sistema/Notificações/Segurança, "Restaurar Padrão", importar/exportar configurações
// e a "Zona de Perigo". Ficam escondidas até serem implementadas; mude para true para exibi-las.
const SHOW_UNFINISHED_SETTINGS = false;

const DEFAULT_SYSTEM_SETTINGS = {
  defaultTimeLimit: 60,
  allowReviewAnswers: true,
  shuffleQuestions: false,
  showCorrectAnswers: true,
  requireRegistration: true,
  enableNotifications: true,
  autoSaveInterval: 30,
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo'
};

const DEFAULT_NOTIFICATIONS = {
  emailOnSubmission: true,
  emailOnNewStudent: false,
  emailWeeklyReport: true,
  pushNotifications: true,
  smsNotifications: false
};

const DEFAULT_SECURITY = {
  twoFactorAuth: false,
  sessionTimeout: 120,
  passwordExpiry: 90,
  loginAttempts: 5
};

// Itens da planilha gerada por "Exportar Configurações" → onde cada um é gravado ao importar
const SETTINGS_IMPORT_MAP: Record<string, { group: 'profile' | 'system' | 'notifications' | 'security'; key: string; kind: 'text' | 'number' | 'bool' }> = {
  'perfil|nome': { group: 'profile', key: 'name', kind: 'text' },
  'perfil|instituicao': { group: 'profile', key: 'institution', kind: 'text' },
  'perfil|cargo': { group: 'profile', key: 'position', kind: 'text' },
  'sistema|tempo limite padrao (min)': { group: 'system', key: 'defaultTimeLimit', kind: 'number' },
  'sistema|permitir revisar respostas': { group: 'system', key: 'allowReviewAnswers', kind: 'bool' },
  'sistema|embaralhar questoes': { group: 'system', key: 'shuffleQuestions', kind: 'bool' },
  'sistema|mostrar respostas corretas': { group: 'system', key: 'showCorrectAnswers', kind: 'bool' },
  'sistema|idioma': { group: 'system', key: 'language', kind: 'text' },
  'sistema|fuso horario': { group: 'system', key: 'timezone', kind: 'text' },
  'notificacoes|email em nova submissao': { group: 'notifications', key: 'emailOnSubmission', kind: 'bool' },
  'notificacoes|email em novo aluno': { group: 'notifications', key: 'emailOnNewStudent', kind: 'bool' },
  'notificacoes|relatorio semanal por email': { group: 'notifications', key: 'emailWeeklyReport', kind: 'bool' },
  'seguranca|autenticacao de dois fatores': { group: 'security', key: 'twoFactorAuth', kind: 'bool' },
  'seguranca|tempo de sessao (min)': { group: 'security', key: 'sessionTimeout', kind: 'number' },
};

const normalizeKey = (text: unknown) => stripAccents(String(text ?? '')).toLowerCase().trim();

// Converte uma questão de um JSON externo para o formato do banco de questões.
// Aceita nomes em português ou inglês e alternativas como texto ou objeto { text }.
function toQuestionData(raw: any) {
  const text = String(raw?.question ?? raw?.questao ?? raw?.enunciado ?? raw?.text ?? '').trim();
  const rawOptions = raw?.options ?? raw?.alternativas ?? raw?.alternatives ?? [];
  const options: string[] = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((o: any) => String(typeof o === 'object' && o !== null ? o.text ?? o.texto ?? '' : o ?? '').trim())
    .filter(Boolean);
  const type = raw?.type ?? raw?.tipo ?? (options.length > 0 ? 'Objetiva' : 'Discursiva');

  // Resposta correta como índice (0, 1...) ou letra ("A", "b")
  let correctAnswer = raw?.correctAnswer ?? raw?.correct_answer ?? raw?.resposta ?? raw?.gabarito ?? 0;
  if (typeof correctAnswer === 'string' && /^[a-z]$/i.test(correctAnswer.trim())) {
    correctAnswer = correctAnswer.trim().toUpperCase().charCodeAt(0) - 65;
  }
  correctAnswer = Number(correctAnswer) || 0;

  const tags = raw?.tags;
  return {
    ...raw,
    id: undefined,
    question: text,
    subject: String(raw?.subject ?? raw?.materia ?? raw?.disciplina ?? 'Geral').trim() || 'Geral',
    difficulty: raw?.difficulty ?? raw?.dificuldade ?? 'Médio',
    type,
    options,
    correctAnswer,
    tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    weight: Number(raw?.weight ?? raw?.peso) || 1
  };
}

type ConfigurationPageProps = {
  user: User;
  exams?: Exam[];
  submissions?: Submission[];
  onRefresh?: () => void;
};

export function ConfigurationPage({ user }: ConfigurationPageProps) {
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // User Profile Settings
  const [profileData, setProfileData] = useState({
    name: user.user_metadata.name || '',
    email: user.email || '',
    institution: '',
    position: '',
    bio: '',
    phone: '',
    address: ''
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);

  // Notification Settings
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  // Security Settings
  const [security, setSecurity] = useState(DEFAULT_SECURITY);

  // Subjects and Series Management
  const [subjects, setSubjects] = useState<string[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [editingSubject, setEditingSubject] = useState<{ index: number; value: string } | null>(null);
  const [editingSeries, setEditingSeries] = useState<{ index: number; value: string } | null>(null);

  // Importação de dados (aba Dados) e resultado mostrado no modal
  const [importing, setImporting] = useState<'students' | 'questions' | 'settings' | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const studentsFileRef = useRef<HTMLInputElement>(null);
  const questionsFileRef = useRef<HTMLInputElement>(null);
  const settingsFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserData();
    loadSubjectsAndSeries();
  }, []);

  const loadUserData = async () => {
    try {
      setLoadingProfile(true);
      const token = localStorage.getItem('access_token');
      
      // Load profile
      const profileResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.success && profileResult.profile) {
          setProfileData({
            name: profileResult.profile.name || '',
            email: profileResult.profile.email || '',
            institution: profileResult.profile.institution || '',
            position: profileResult.profile.position || '',
            bio: profileResult.profile.bio || '',
            phone: profileResult.profile.phone || '',
            address: profileResult.profile.address || ''
          });
        }
      }
      
      // Load settings
      const settingsResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (settingsResponse.ok) {
        const settingsResult = await settingsResponse.json();
        if (settingsResult.success && settingsResult.settings) {
          if (settingsResult.settings.system) {
            setSystemSettings(settingsResult.settings.system);
          }
          if (settingsResult.settings.notifications) {
            setNotifications(settingsResult.settings.notifications);
          }
          if (settingsResult.settings.security) {
            setSecurity(settingsResult.settings.security);
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao atualizar perfil');
        return;
      }
      
      toast.success('Perfil atualizado com sucesso!');
      
      // Reload to update user metadata in UI
      setTimeout(() => window.location.reload(), 1500);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'system',
          settings: systemSettings
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao salvar configurações');
        return;
      }
      
      toast.success('Configurações do sistema salvas!');
      
    } catch (error) {
      console.error('Error saving system settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'notifications',
          settings: notifications
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao salvar notificações');
        return;
      }
      
      toast.success('Configurações de notificação atualizadas!');
      
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error('Erro ao salvar notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'security',
          settings: security
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao salvar segurança');
        return;
      }
      
      toast.success('Configurações de segurança atualizadas!');
      
    } catch (error) {
      console.error('Error saving security:', error);
      toast.error('Erro ao salvar configurações de segurança');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao alterar senha');
        return;
      }
      
      toast.success('Senha alterada com sucesso!');
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const EXAM_EXPORT_COLUMNS: ExcelColumn[] = [
    { header: 'ID', key: 'id', width: 12, type: 'text' },
    { header: 'Título', key: 'title', width: 35, type: 'text' },
    { header: 'Total de Questões', key: 'totalQuestions', width: 16, type: 'number' },
    { header: 'Status', key: 'status', width: 14, type: 'text' },
    { header: 'Data de Criação', key: 'createdAt', width: 18, type: 'date' },
  ];

  const RESULT_EXPORT_COLUMNS: ExcelColumn[] = [
    { header: 'Aluno', key: 'studentName', width: 28, type: 'text' },
    { header: 'Email', key: 'studentEmail', width: 30, type: 'text' },
    { header: 'Simulado', key: 'examTitle', width: 30, type: 'text' },
    { header: 'Data', key: 'submittedAt', width: 18, type: 'date' },
    { header: 'Acertos', key: 'score', width: 12, type: 'number' },
    { header: 'Total', key: 'totalQuestions', width: 12, type: 'number' },
    { header: 'Percentual', key: 'percentage', width: 14, type: 'percentage' },
  ];

  const handleExportData = async () => {
    setLoading(true);
    try {
      const [examsResult, submissionsResult] = await Promise.all([
        apiService.getExams().catch(() => ({ exams: [] })),
        apiService.getSubmissions().catch(() => ({ submissions: [] })),
      ]);

      const exams = examsResult?.exams || [];
      const submissions = submissionsResult?.submissions || [];

      const exporter = new ExcelExporter();
      const timestamp = new Date().toISOString().split('T')[0];

      await exporter.exportMultiSheet(
        [
          {
            title: 'Simulados Cadastrados',
            sheetName: 'Simulados',
            includeStats: false,
            columns: EXAM_EXPORT_COLUMNS,
            data: exams.map((exam: any) => ({
              id: exam.id,
              title: exam.title,
              totalQuestions: exam.questions?.length || 0,
              status: exam.status || 'ativo',
              createdAt: exam.createdAt,
            })),
          },
          {
            title: 'Resultados de Simulados',
            sheetName: 'Resultados',
            includeStats: true,
            columns: RESULT_EXPORT_COLUMNS,
            data: submissions,
          },
        ],
        `Dados_Sistema_SEICE_${timestamp}`
      );

      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportResults = async () => {
    setLoading(true);
    try {
      const submissionsResult = await apiService.getSubmissions().catch(() => ({ submissions: [] }));
      const submissions = submissionsResult?.submissions || [];

      const exporter = new ExcelExporter();
      const timestamp = new Date().toISOString().split('T')[0];

      await exporter.export({
        title: 'Resultados de Simulados',
        subtitle: 'Exportação completa de resultados do sistema',
        includeStats: true,
        columns: RESULT_EXPORT_COLUMNS,
        data: submissions,
        filename: `Resultados_${timestamp}`,
      });

      toast.success('Resultados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar resultados:', error);
      toast.error('Erro ao exportar resultados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSettings = async () => {
    try {
      const exporter = new ExcelExporter();
      const timestamp = new Date().toISOString().split('T')[0];

      const settingsRows = [
        { categoria: 'Perfil', chave: 'Nome', valor: profileData.name },
        { categoria: 'Perfil', chave: 'Email', valor: profileData.email },
        { categoria: 'Perfil', chave: 'Instituição', valor: profileData.institution },
        { categoria: 'Perfil', chave: 'Cargo', valor: profileData.position },
        { categoria: 'Sistema', chave: 'Tempo Limite Padrão (min)', valor: String(systemSettings.defaultTimeLimit) },
        { categoria: 'Sistema', chave: 'Permitir Revisar Respostas', valor: systemSettings.allowReviewAnswers ? 'Sim' : 'Não' },
        { categoria: 'Sistema', chave: 'Embaralhar Questões', valor: systemSettings.shuffleQuestions ? 'Sim' : 'Não' },
        { categoria: 'Sistema', chave: 'Mostrar Respostas Corretas', valor: systemSettings.showCorrectAnswers ? 'Sim' : 'Não' },
        { categoria: 'Sistema', chave: 'Idioma', valor: systemSettings.language },
        { categoria: 'Sistema', chave: 'Fuso Horário', valor: systemSettings.timezone },
        { categoria: 'Notificações', chave: 'Email em Nova Submissão', valor: notifications.emailOnSubmission ? 'Sim' : 'Não' },
        { categoria: 'Notificações', chave: 'Email em Novo Aluno', valor: notifications.emailOnNewStudent ? 'Sim' : 'Não' },
        { categoria: 'Notificações', chave: 'Relatório Semanal por Email', valor: notifications.emailWeeklyReport ? 'Sim' : 'Não' },
        { categoria: 'Segurança', chave: 'Autenticação de Dois Fatores', valor: security.twoFactorAuth ? 'Sim' : 'Não' },
        { categoria: 'Segurança', chave: 'Tempo de Sessão (min)', valor: String(security.sessionTimeout) },
        { categoria: 'Cursos Cadastrados', chave: '—', valor: series.join(', ') || 'Nenhuma' },
        { categoria: 'Matérias Cadastradas', chave: '—', valor: subjects.join(', ') || 'Nenhuma' },
      ];

      await exporter.export({
        title: 'Configurações do Sistema',
        subtitle: `Usuário: ${profileData.name || user.email}`,
        includeStats: false,
        columns: [
          { header: 'Categoria', key: 'categoria', width: 22, type: 'text' },
          { header: 'Item', key: 'chave', width: 32, type: 'text' },
          { header: 'Valor', key: 'valor', width: 40, type: 'text' },
        ],
        data: settingsRows,
        filename: `Configuracoes_${timestamp}`,
      });

      toast.success('Configurações exportadas com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar configurações:', error);
      toast.error('Erro ao exportar configurações. Tente novamente.');
    }
  };

  // Grava um grupo de configurações (system / notifications / security) no servidor
  const saveSettingsGroup = async (type: 'system' | 'notifications' | 'security', settings: any) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ type, settings })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Erro ao salvar configurações');
    }
  };

  const handleImportStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!isStudentSpreadsheet(file)) {
      setActionResult({ type: 'error', title: 'Arquivo não suportado', message: 'Selecione um arquivo CSV ou Excel (.xlsx, .xls).' });
      return;
    }

    setImporting('students');
    try {
      const students = await readStudentsFromFile(file);
      if (students.length === 0) {
        setActionResult({
          type: 'error',
          title: 'Nenhum aluno importado',
          message: 'Nenhum aluno válido encontrado no arquivo. Confira se há uma coluna com o nome do aluno.'
        });
        return;
      }

      const summary = await saveImportedStudents(students);
      setActionResult(describeStudentImport(summary));
    } catch (error: any) {
      console.error('Error importing students:', error);
      setActionResult({ type: 'error', title: 'Falha na importação', message: 'Erro ao processar arquivo: ' + (error?.message || 'Erro desconhecido') });
    } finally {
      setImporting(null);
    }
  };

  const handleImportQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting('questions');
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        setActionResult({ type: 'error', title: 'Arquivo inválido', message: 'O arquivo não é um JSON válido.' });
        return;
      }

      // Aceita uma lista de questões, { questions: [...] } ou simulados com as questões dentro
      const list: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.questions)
          ? parsed.questions
          : Array.isArray(parsed?.exams)
            ? parsed.exams.flatMap((e: any) => e?.questions || [])
            : [];

      const questions = list.map(toQuestionData);
      const valid = questions.filter(q => q.question && (q.type !== 'Objetiva' || q.options.length >= 2));
      const invalidCount = questions.length - valid.length;

      if (valid.length === 0) {
        setActionResult({
          type: 'error',
          title: 'Nenhuma questão importada',
          message: 'Nenhuma questão válida encontrada. Cada questão precisa de enunciado ("question") e, se for objetiva, de pelo menos 2 alternativas ("options").'
        });
        return;
      }

      let successCount = 0;
      for (const q of valid) {
        try {
          const response = await apiService.createQuestion(q);
          if (response?.success === false) throw new Error(response.error);
          successCount++;
        } catch (error) {
          console.error('Error importing question:', error);
        }
      }
      const failedCount = invalidCount + (valid.length - successCount);

      setActionResult({
        type: successCount > 0 ? 'success' : 'error',
        title: successCount > 0 ? 'Importação concluída' : 'Falha na importação',
        message: successCount > 0
          ? `${successCount} ${successCount === 1 ? 'questão importada' : 'questões importadas'} para o Banco de Questões.`
          : 'Nenhuma questão pôde ser salva. Tente novamente.',
        details: failedCount > 0 ? [`${failedCount} ${failedCount === 1 ? 'questão ignorada' : 'questões ignoradas'} por erro ou formato inválido`] : undefined
      });
    } finally {
      setImporting(null);
    }
  };

  // Importa a planilha gerada por "Exportar Configurações" (ou um JSON com os mesmos grupos)
  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting('settings');
    try {
      const imported = {
        profile: {} as Record<string, any>,
        system: {} as Record<string, any>,
        notifications: {} as Record<string, any>,
        security: {} as Record<string, any>
      };
      let importedCourses: string[] = [];
      let importedSubjects: string[] = [];

      if (/\.json$/i.test(file.name)) {
        const parsed = JSON.parse(await file.text());
        Object.assign(imported.profile, parsed?.profile || {});
        Object.assign(imported.system, parsed?.system || {});
        Object.assign(imported.notifications, parsed?.notifications || {});
        Object.assign(imported.security, parsed?.security || {});
        importedCourses = Array.isArray(parsed?.series) ? parsed.series : [];
        importedSubjects = Array.isArray(parsed?.subjects) ? parsed.subjects : [];
      } else {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' }) as any[][];
        const splitList = (v: string) => (normalizeKey(v) === 'nenhuma' ? [] : v.split(',').map(x => x.trim()).filter(Boolean));

        for (const row of rows) {
          // A planilha tem título e cabeçalho antes dos dados: só as linhas "Categoria | Item | Valor" contam
          const cells = row.map(c => String(c ?? '').trim()).filter(Boolean);
          if (cells.length < 2) continue;
          const [category, item, value = ''] = cells.length === 2 ? [cells[0], '', cells[1]] : cells;
          const cat = normalizeKey(category);

          if (cat === 'cursos cadastrados') { importedCourses = splitList(value); continue; }
          if (cat === 'materias cadastradas') { importedSubjects = splitList(value); continue; }

          const target = SETTINGS_IMPORT_MAP[`${cat}|${normalizeKey(item)}`];
          if (!target) continue;
          imported[target.group][target.key] =
            target.kind === 'bool' ? normalizeKey(value) === 'sim'
              : target.kind === 'number' ? Number(value) || 0
                : value;
        }
      }

      const applied: string[] = [];
      const token = localStorage.getItem('access_token');

      if (Object.keys(imported.profile).length > 0) {
        // O email é o login: nunca é trocado pela importação
        const newProfile = { ...profileData, ...imported.profile, email: profileData.email };
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/user/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newProfile)
        });
        if (!response.ok) throw new Error('Erro ao salvar o perfil');
        setProfileData(newProfile);
        applied.push('Perfil (nome, instituição e cargo)');
      }

      const groups = [
        { type: 'system' as const, current: systemSettings, set: setSystemSettings, label: 'Preferências do sistema' },
        { type: 'notifications' as const, current: notifications, set: setNotifications, label: 'Notificações' },
        { type: 'security' as const, current: security, set: setSecurity, label: 'Segurança' }
      ];
      for (const g of groups) {
        if (Object.keys(imported[g.type]).length === 0) continue;
        const merged = { ...g.current, ...imported[g.type] };
        await saveSettingsGroup(g.type, merged);
        g.set(merged as any);
        applied.push(g.label);
      }

      // Cursos e matérias: só acrescenta os que ainda não existem (não apaga nada)
      const newCourses = importedCourses.filter(c => !series.includes(c));
      const newSubjects = importedSubjects.filter(m => !subjects.includes(m));
      if (newCourses.length > 0 || newSubjects.length > 0) {
        const updatedSeries = [...series, ...newCourses];
        const updatedSubjects = [...subjects, ...newSubjects];
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ subjects: updatedSubjects, series: updatedSeries })
        });
        if (!response.ok) throw new Error('Erro ao salvar cursos e matérias');
        setSeries(updatedSeries);
        setSubjects(updatedSubjects);
        if (newCourses.length > 0) applied.push(`${newCourses.length} curso(s) novo(s)`);
        if (newSubjects.length > 0) applied.push(`${newSubjects.length} matéria(s) nova(s)`);
      }

      if (applied.length === 0) {
        setActionResult({
          type: 'error',
          title: 'Nada para importar',
          message: 'O arquivo não tem configurações reconhecidas. Use a planilha gerada por "Exportar Configurações".'
        });
        return;
      }

      setActionResult({ type: 'success', title: 'Configurações importadas', message: 'Itens atualizados:', details: applied });
    } catch (error: any) {
      console.error('Error importing settings:', error);
      setActionResult({ type: 'error', title: 'Falha na importação', message: error?.message || 'Não foi possível ler o arquivo de configurações.' });
    } finally {
      setImporting(null);
    }
  };

  // Volta sistema, notificações e segurança ao padrão (perfil, cursos e matérias não mudam)
  const handleResetSettings = async () => {
    setShowResetDialog(false);
    setLoading(true);
    try {
      await saveSettingsGroup('system', DEFAULT_SYSTEM_SETTINGS);
      await saveSettingsGroup('notifications', DEFAULT_NOTIFICATIONS);
      await saveSettingsGroup('security', DEFAULT_SECURITY);
      setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      setNotifications(DEFAULT_NOTIFICATIONS);
      setSecurity(DEFAULT_SECURITY);
      setActionResult({
        type: 'success',
        title: 'Configurações restauradas',
        message: 'As preferências voltaram ao padrão. Seu perfil, cursos e matérias não foram alterados.'
      });
    } catch (error: any) {
      console.error('Error resetting settings:', error);
      setActionResult({ type: 'error', title: 'Falha ao restaurar', message: error?.message || 'Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  // Subjects and Series Management Functions
  const loadSubjectsAndSeries = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
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
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim()) {
      toast.error('Digite o nome da matéria');
      return;
    }
    
    if (subjects.includes(newSubject.trim())) {
      toast.error('Esta matéria já existe');
      return;
    }

    try {
      const updatedSubjects = [...subjects, newSubject.trim()];
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ subjects: updatedSubjects, series })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao adicionar matéria');
        return;
      }
      
      setSubjects(updatedSubjects);
      setNewSubject('');
      toast.success('Matéria adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Erro ao adicionar matéria');
    }
  };

  const handleDeleteSubject = async (index: number) => {
    if (!(await confirmAction({ title: 'Excluir matéria?', itemName: subjects[index] }))) {
      return;
    }

    try {
      const updatedSubjects = subjects.filter((_, i) => i !== index);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ subjects: updatedSubjects, series })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao excluir matéria');
        return;
      }
      
      setSubjects(updatedSubjects);
      toast.success('Matéria excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Erro ao excluir matéria');
    }
  };

  const handleAddSeries = async () => {
    if (!newSeries.trim()) {
      toast.error('Digite o nome do curso');
      return;
    }
    
    if (series.includes(newSeries.trim())) {
      toast.error('Este curso já existe');
      return;
    }

    try {
      const updatedSeries = [...series, newSeries.trim()];
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ subjects, series: updatedSeries })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao adicionar curso');
        return;
      }
      
      setSeries(updatedSeries);
      setNewSeries('');
      toast.success('Curso adicionado com sucesso!');
    } catch (error) {
      console.error('Error adding series:', error);
      toast.error('Erro ao adicionar curso');
    }
  };

  const handleDeleteSeries = async (index: number) => {
    if (!(await confirmAction({ title: 'Excluir curso?', itemName: series[index] }))) {
      return;
    }

    try {
      const updatedSeries = series.filter((_, i) => i !== index);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ subjects, series: updatedSeries })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao excluir curso');
        return;
      }
      
      setSeries(updatedSeries);
      toast.success('Curso excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting series:', error);
      toast.error('Erro ao excluir curso');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e configurações do sistema
          </p>
        </div>
        {SHOW_UNFINISHED_SETTINGS && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowResetDialog(true)} disabled={loading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Padrão
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${SHOW_UNFINISHED_SETTINGS ? 'grid-cols-6' : 'grid-cols-3'}`}>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <UserIcon className="w-4 h-4" />
            <span>Perfil</span>
          </TabsTrigger>
          {SHOW_UNFINISHED_SETTINGS && (
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Sistema</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="academic" className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4" />
            <span>Acadêmico</span>
          </TabsTrigger>
          {SHOW_UNFINISHED_SETTINGS && (
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notificações</span>
            </TabsTrigger>
          )}
          {SHOW_UNFINISHED_SETTINGS && (
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Segurança</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="data" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Dados</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e profissionais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="h-20 w-full bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-slate-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        O email não pode ser alterado
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institution">Instituição</Label>
                      <Input
                        id="institution"
                        value={profileData.institution}
                        onChange={(e) => setProfileData(prev => ({ ...prev, institution: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Cargo</Label>
                      <Input
                        id="position"
                        value={profileData.position}
                        onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        value={profileData.address}
                        onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografia</Label>
                    <Textarea
                      id="bio"
                      rows={3}
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Conte um pouco sobre você..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSaveProfile} disabled={loading || loadingProfile}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Perfil
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                      <Key className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        {SHOW_UNFINISHED_SETTINGS && (
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Configurações de Prova
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTimeLimit">Tempo Limite Padrão (minutos)</Label>
                    <Input
                      id="defaultTimeLimit"
                      type="number"
                      value={systemSettings.defaultTimeLimit}
                      onChange={(e) => setSystemSettings(prev => ({ 
                        ...prev, defaultTimeLimit: parseInt(e.target.value) || 60 
                      }))}
                    />
                  </div>
  
                  <div className="space-y-2">
                    <Label htmlFor="autoSaveInterval">Intervalo de Auto-salvamento (segundos)</Label>
                    <Input
                      id="autoSaveInterval"
                      type="number"
                      value={systemSettings.autoSaveInterval}
                      onChange={(e) => setSystemSettings(prev => ({ 
                        ...prev, autoSaveInterval: parseInt(e.target.value) || 30 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Permitir revisão de respostas</Label>
                      <p className="text-sm text-muted-foreground">
                        Alunos podem revisar suas respostas antes de finalizar
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.allowReviewAnswers}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ 
                        ...prev, allowReviewAnswers: checked 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Embaralhar questões</Label>
                      <p className="text-sm text-muted-foreground">
                        Ordem das questões será aleatória para cada aluno
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.shuffleQuestions}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ 
                        ...prev, shuffleQuestions: checked 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mostrar respostas corretas</Label>
                      <p className="text-sm text-muted-foreground">
                        Exibir gabarito após finalizar a prova
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.showCorrectAnswers}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ 
                        ...prev, showCorrectAnswers: checked 
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="w-5 h-5 mr-2" />
                    Configurações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select value={systemSettings.language} onValueChange={(value) => 
                      setSystemSettings(prev => ({ ...prev, language: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select value={systemSettings.timezone} onValueChange={(value) => 
                      setSystemSettings(prev => ({ ...prev, timezone: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Exigir cadastro</Label>
                      <p className="text-sm text-muted-foreground">
                        Alunos devem se cadastrar para fazer provas
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.requireRegistration}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ 
                        ...prev, requireRegistration: checked 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Habilitar notificações</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações do sistema
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.enableNotifications}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ 
                        ...prev, enableNotifications: checked 
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
  
            <div className="flex justify-end">
              <Button onClick={handleSaveSystemSettings} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        )}

        {/* Academic Settings - Subjects and Series */}
        <TabsContent value="academic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subjects Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Gerenciar Matérias
                </CardTitle>
                <CardDescription>
                  Adicione e gerencie as matérias disponíveis para o banco de questões
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Subject Form */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Nome da matéria (ex: Matemática)"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                  />
                  <Button onClick={handleAddSubject} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Subjects List */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Matérias Cadastradas ({subjects.length})
                  </Label>
                  <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                    {subjects.length === 0 ? (
                      <div className="p-8 text-center">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nenhuma matéria cadastrada ainda.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adicione matérias para usar no banco de questões.
                        </p>
                      </div>
                    ) : (
                      subjects.map((subject, index) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-zinc-800" />
                            </div>
                            <span className="font-medium">{subject}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubject(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Card className="border-zinc-200 bg-zinc-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-zinc-900">
                      <Lightbulb className="w-3.5 h-3.5 inline-block align-text-bottom mr-1" />Dica: As matérias cadastradas aqui aparecerão automaticamente no Banco de Questões e nos Simulados.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Series Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Gerenciar Cursos
                </CardTitle>
                <CardDescription>
                  Adicione e gerencie os cursos disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Series Form */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Nome do curso (ex: 1º Ano, 6º Ano)"
                    value={newSeries}
                    onChange={(e) => setNewSeries(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSeries()}
                  />
                  <Button onClick={handleAddSeries} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Series List */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Cursos Cadastrados ({series.length})
                  </Label>
                  <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                    {series.length === 0 ? (
                      <div className="p-8 text-center">
                        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nenhum curso cadastrado ainda.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adicione cursos para usar no banco de questões.
                        </p>
                      </div>
                    ) : (
                      series.map((s, index) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <GraduationCap className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="font-medium">{s}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSeries(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-green-800">
                      <Lightbulb className="w-3.5 h-3.5 inline-block align-text-bottom mr-1" />Dica: Os cursos cadastrados aqui aparecerão automaticamente no Banco de Questões e nos Simulados.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        {SHOW_UNFINISHED_SETTINGS && (
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Preferências de Notificação
                </CardTitle>
                <CardDescription>
                  Configure como e quando você deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email ao receber submissão</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber email quando um aluno finalizar uma prova
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailOnSubmission}
                      onCheckedChange={(checked) => setNotifications(prev => ({ 
                        ...prev, emailOnSubmission: checked 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email para novos alunos</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber email quando um novo aluno se cadastrar
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailOnNewStudent}
                      onCheckedChange={(checked) => setNotifications(prev => ({ 
                        ...prev, emailOnNewStudent: checked 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Relatório semanal por email</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber resumo semanal de atividades por email
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailWeeklyReport}
                      onCheckedChange={(checked) => setNotifications(prev => ({ 
                        ...prev, emailWeeklyReport: checked 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações push</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações push no navegador
                      </p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications(prev => ({ 
                        ...prev, pushNotifications: checked 
                      }))}
                    />
                  </div>
  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações importantes via SMS
                      </p>
                    </div>
                    <Switch
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) => setNotifications(prev => ({ 
                        ...prev, smsNotifications: checked 
                      }))}
                    />
                  </div>
                </div>
  
                <Button onClick={handleSaveNotifications} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Notificações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Security Settings */}
        {SHOW_UNFINISHED_SETTINGS && (
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>
                  Configure as opções de segurança da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticação de dois fatores</Label>
                      <p className="text-sm text-muted-foreground">
                        Adicionar camada extra de segurança com 2FA
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={security.twoFactorAuth}
                        onCheckedChange={(checked) => setSecurity(prev => ({ 
                          ...prev, twoFactorAuth: checked 
                        }))}
                      />
                      {security.twoFactorAuth && <Badge variant="default">Ativo</Badge>}
                    </div>
                  </div>
  
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Timeout da sessão (minutos)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={security.sessionTimeout}
                      onChange={(e) => setSecurity(prev => ({ 
                        ...prev, sessionTimeout: parseInt(e.target.value) || 120 
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Tempo antes da sessão expirar automaticamente
                    </p>
                  </div>
  
                  <div className="space-y-2">
                    <Label htmlFor="passwordExpiry">Expiração da senha (dias)</Label>
                    <Input
                      id="passwordExpiry"
                      type="number"
                      value={security.passwordExpiry}
                      onChange={(e) => setSecurity(prev => ({ 
                        ...prev, passwordExpiry: parseInt(e.target.value) || 90 
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Quantos dias até ser necessário trocar a senha
                    </p>
                  </div>
  
                  <div className="space-y-2">
                    <Label htmlFor="loginAttempts">Tentativas de login</Label>
                    <Input
                      id="loginAttempts"
                      type="number"
                      value={security.loginAttempts}
                      onChange={(e) => setSecurity(prev => ({ 
                        ...prev, loginAttempts: parseInt(e.target.value) || 5 
                      }))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Número máximo de tentativas antes de bloquear
                    </p>
                  </div>
                </div>
  
                <div className="flex space-x-2">
                  <Button onClick={handleSaveSecurity} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Segurança
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                    <Key className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Importar Dados
                </CardTitle>
                <CardDescription>
                  Importe dados de outros sistemas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={() => studentsFileRef.current?.click()} disabled={!!importing}>
                  {importing === 'students' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importing === 'students' ? 'Importando alunos...' : 'Importar Alunos (CSV ou Excel)'}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => questionsFileRef.current?.click()} disabled={!!importing}>
                  {importing === 'questions' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importing === 'questions' ? 'Importando questões...' : 'Importar Questões (JSON)'}
                </Button>
                {SHOW_UNFINISHED_SETTINGS && (
                  <>
                    <Button className="w-full" variant="outline" onClick={() => settingsFileRef.current?.click()} disabled={!!importing}>
                      {importing === 'settings' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      {importing === 'settings' ? 'Importando configurações...' : 'Importar Configurações'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Configurações: use a planilha gerada em "Exportar Configurações". Cursos e matérias do arquivo são
                      acrescentados, nunca apagados.
                    </p>
                  </>
                )}
                <input ref={studentsFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportStudents} />
                <input ref={questionsFileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportQuestions} />
                <input ref={settingsFileRef} type="file" accept=".xlsx,.xls,.json" className="hidden" onChange={handleImportSettings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Exportar Dados
                </CardTitle>
                <CardDescription>
                  Exporte seus dados para backup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Todos os Dados
                </Button>
                <Button className="w-full" variant="outline" onClick={handleExportResults}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Apenas Resultados
                </Button>
                {SHOW_UNFINISHED_SETTINGS && (
                  <Button className="w-full" variant="outline" onClick={handleExportSettings}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Configurações
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Botão ainda sem ação: escondido até a exclusão ser implementada */}
          {SHOW_UNFINISHED_SETTINGS && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Zona de Perigo
                </CardTitle>
                <CardDescription>
                  Ações irreversíveis - use com cuidado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Excluir Todos os Dados</h4>
                  <p className="text-sm text-red-600 mb-4">
                    Esta ação excluirá permanentemente todas as provas, submissões e dados do usuário.
                    Esta ação não pode ser desfeita.
                  </p>
                  <Button variant="destructive" size="sm">
                    Excluir Todos os Dados
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Alterar Senha
            </DialogTitle>
            <DialogDescription>
              Digite sua senha atual e a nova senha que deseja usar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Digite sua senha atual"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Digite novamente a nova senha"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar configurações padrão?</DialogTitle>
            <DialogDescription>
              As preferências do sistema, de notificações e de segurança voltam ao padrão.
              Seu perfil, cursos, matérias, alunos e simulados não são alterados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancelar</Button>
            <Button onClick={handleResetSettings}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Padrão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionResultDialog result={actionResult} onClose={() => setActionResult(null)} />
    </div>
  );
}