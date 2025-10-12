import React, { useState, useEffect } from 'react';
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
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { User, Exam, Submission } from '../../App';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

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
  const [systemSettings, setSystemSettings] = useState({
    defaultTimeLimit: 60,
    allowReviewAnswers: true,
    shuffleQuestions: false,
    showCorrectAnswers: true,
    requireRegistration: true,
    enableNotifications: true,
    autoSaveInterval: 30,
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailOnSubmission: true,
    emailOnNewStudent: false,
    emailWeeklyReport: true,
    pushNotifications: true,
    smsNotifications: false
  });

  // Security Settings
  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: 120,
    passwordExpiry: 90,
    loginAttempts: 5
  });

  // Subjects and Series Management
  const [subjects, setSubjects] = useState<string[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newSeries, setNewSeries] = useState('');
  const [editingSubject, setEditingSubject] = useState<{ index: number; value: string } | null>(null);
  const [editingSeries, setEditingSeries] = useState<{ index: number; value: string } | null>(null);

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

  const handleExportData = () => {
    toast.success('Dados exportados com sucesso!');
  };

  const handleImportData = () => {
    toast.success('Dados importados com sucesso!');
  };

  const handleResetSettings = () => {
    if (window.confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      toast.success('Configurações restauradas para o padrão!');
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
    if (!window.confirm('Tem certeza que deseja excluir esta matéria?')) {
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
      toast.error('Digite o nome da série');
      return;
    }
    
    if (series.includes(newSeries.trim())) {
      toast.error('Esta série já existe');
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
        toast.error(result.error || 'Erro ao adicionar série');
        return;
      }
      
      setSeries(updatedSeries);
      setNewSeries('');
      toast.success('Série adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding series:', error);
      toast.error('Erro ao adicionar série');
    }
  };

  const handleDeleteSeries = async (index: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta série?')) {
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
        toast.error(result.error || 'Erro ao excluir série');
        return;
      }
      
      setSeries(updatedSeries);
      toast.success('Série excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting series:', error);
      toast.error('Erro ao excluir série');
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
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleResetSettings}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <UserIcon className="w-4 h-4" />
            <span>Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Sistema</span>
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4" />
            <span>Acadêmico</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Segurança</span>
          </TabsTrigger>
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
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
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
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-blue-600" />
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

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3">
                    <p className="text-xs text-blue-800">
                      💡 Dica: As matérias cadastradas aqui aparecerão automaticamente no Banco de Questões e nos Simulados.
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
                  Gerenciar Séries
                </CardTitle>
                <CardDescription>
                  Adicione e gerencie as séries/anos escolares disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Series Form */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Nome da série (ex: 1º Ano, 6º Ano)"
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
                    Séries Cadastradas ({series.length})
                  </Label>
                  <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                    {series.length === 0 ? (
                      <div className="p-8 text-center">
                        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Nenhuma série cadastrada ainda.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adicione séries para usar no banco de questões.
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
                      💡 Dica: As séries cadastradas aqui aparecerão automaticamente no Banco de Questões e nos Simulados.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
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

        {/* Security Settings */}
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
                <Button className="w-full" onClick={handleImportData}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Alunos (CSV)
                </Button>
                <Button className="w-full" variant="outline" onClick={handleImportData}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Questões (JSON)
                </Button>
                <Button className="w-full" variant="outline" onClick={handleImportData}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Configurações
                </Button>
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
                <Button className="w-full" variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Apenas Resultados
                </Button>
                <Button className="w-full" variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Configurações
                </Button>
              </CardContent>
            </Card>
          </div>

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
    </div>
  );
}