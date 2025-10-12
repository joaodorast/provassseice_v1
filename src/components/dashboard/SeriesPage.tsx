import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useLoadingState } from '../LoadingProvider';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  GraduationCap,
  Users,
  Calendar,
  BookOpen,
  Search,
  Filter,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  School,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiService } from '../../utils/api';
import { ExcelExportDialog } from '../ExcelExportDialog';
import { ExcelTemplates, quickExport, importFromExcel } from '../../utils/excel-utils';

type Serie = {
  id: string;
  name: string;
  code: string;
  description: string;
  level: 'fundamental1' | 'fundamental2' | 'medio' | 'tecnico' | 'superior';
  grade: number;
  isActive: boolean;
  studentCount: number;
  maxStudents?: number;
  academicYear: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const EDUCATION_LEVELS = [
  { value: 'fundamental1', label: 'Ensino Fundamental I (1º ao 5º ano)', grades: [1, 2, 3, 4, 5] },
  { value: 'fundamental2', label: 'Ensino Fundamental II (6º ao 9º ano)', grades: [6, 7, 8, 9] },
  { value: 'medio', label: 'Ensino Médio (1º ao 3º ano)', grades: [1, 2, 3] },
  { value: 'tecnico', label: 'Ensino Técnico', grades: [1, 2, 3, 4] },
  { value: 'superior', label: 'Ensino Superior', grades: [1, 2, 3, 4, 5, 6] }
];

const ACADEMIC_YEARS = [
  new Date().getFullYear().toString(),
  (new Date().getFullYear() + 1).toString(),
  (new Date().getFullYear() - 1).toString()
];

export function SeriesPage() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSerie, setEditingSerie] = useState<Serie | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const { loading, withLoading } = useLoadingState('series-page');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: 'fundamental1' as Serie['level'],
    grade: 1,
    maxStudents: '',
    academicYear: new Date().getFullYear().toString(),
    isActive: true
  });

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    await withLoading(async () => {
      try {
        const response = await apiService.getSeries();
        if (response.success) {
          setSeries(response.data || []);
        } else {
          toast.error(response.error || 'Erro ao carregar séries');
        }
      } catch (error) {
        console.error('Error loading series:', error);
        toast.error('Erro ao carregar séries');
      }
    });
  };

  const filteredSeries = series.filter(serie => {
    const matchesSearch = serie.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serie.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         serie.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || serie.level === levelFilter;
    
    return matchesSearch && matchesLevel;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Nome e código são obrigatórios');
      return;
    }

    try {
      setSavingId(editingSerie?.id || 'new');
      
      const serieData = {
        ...formData,
        maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : undefined,
        grade: parseInt(formData.grade.toString())
      };

      let response;
      if (editingSerie) {
        response = await apiService.updateSerie(editingSerie.id, serieData);
      } else {
        response = await apiService.createSerie(serieData);
      }

      if (response.success) {
        toast.success(editingSerie ? 'Série atualizada com sucesso!' : 'Série criada com sucesso!');
        setIsDialogOpen(false);
        resetForm();
        loadSeries();
      } else {
        toast.error(response.error || 'Erro ao salvar série');
      }
    } catch (error) {
      console.error('Error saving serie:', error);
      toast.error('Erro ao salvar série');
    } finally {
      setSavingId(null);
    }
  };

  const handleEdit = (serie: Serie) => {
    setEditingSerie(serie);
    setFormData({
      name: serie.name,
      code: serie.code,
      description: serie.description,
      level: serie.level,
      grade: serie.grade,
      maxStudents: serie.maxStudents?.toString() || '',
      academicYear: serie.academicYear,
      isActive: serie.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (serie: Serie) => {
    if (!confirm(`Tem certeza que deseja excluir a série "${serie.name}"?`)) {
      return;
    }

    try {
      setSavingId(serie.id);
      const response = await apiService.deleteSerie(serie.id);
      
      if (response.success) {
        toast.success('Série excluída com sucesso!');
        loadSeries();
      } else {
        toast.error(response.error || 'Erro ao excluir série');
      }
    } catch (error) {
      console.error('Error deleting serie:', error);
      toast.error('Erro ao excluir série');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleStatus = async (serie: Serie) => {
    try {
      setSavingId(serie.id);
      const response = await apiService.updateSerie(serie.id, { 
        isActive: !serie.isActive 
      });
      
      if (response.success) {
        toast.success(`Série ${!serie.isActive ? 'ativada' : 'desativada'} com sucesso!`);
        loadSeries();
      } else {
        toast.error(response.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Error toggling serie status:', error);
      toast.error('Erro ao alterar status');
    } finally {
      setSavingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      level: 'fundamental1',
      grade: 1,
      maxStudents: '',
      academicYear: new Date().getFullYear().toString(),
      isActive: true
    });
    setEditingSerie(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const getLevelLabel = (level: Serie['level']) => {
    return EDUCATION_LEVELS.find(l => l.value === level)?.label || level;
  };

  const getGradeOptions = (level: Serie['level']) => {
    return EDUCATION_LEVELS.find(l => l.value === level)?.grades || [1];
  };

  const handleExportSeries = () => {
    setShowExportDialog(true);
  };

  const handleQuickExport = () => {
    quickExport('series', processedSeries);
  };

  const handleImportSeries = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const importedData = await importFromExcel(file);
      
      if (importedData.length === 0) {
        toast.error('Arquivo vazio ou formato inválido');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const row of importedData) {
        try {
          const serieData = {
            name: row['Nome'] || row['name'] || '',
            code: row['Código'] || row['code'] || '',
            description: row['Descrição'] || row['description'] || '',
            level: row['Nível'] || row['level'] || 'fundamental1',
            grade: parseInt(row['Ano/Série'] || row['grade'] || '1'),
            academicYear: row['Ano Letivo'] || row['academicYear'] || new Date().getFullYear().toString(),
            maxStudents: row['Máximo Alunos'] || row['maxStudents'] ? parseInt(row['Máximo Alunos'] || row['maxStudents']) : undefined,
            isActive: (row['Status'] || row['isActive']) !== 'Inativo'
          };

          if (!serieData.name || !serieData.code) {
            errorCount++;
            continue;
          }

          const response = await apiService.createSerie(serieData);
          if (response.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error importing serie:', error);
          errorCount++;
        }
      }

      await loadSeries();
      
      if (successCount > 0) {
        toast.success(`${successCount} séries importadas com sucesso!`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} séries não puderam ser importadas devido a erros`);
      }

    } catch (error) {
      console.error('Error importing series:', error);
      toast.error('Erro ao importar arquivo. Verifique o formato.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  // Dados processados para exportação
  const processedSeries = filteredSeries.map(serie => ({
    ...serie,
    levelLabel: getLevelLabel(serie.level),
    gradeLabel: `${serie.grade}º ${serie.level === 'medio' ? 'Ano' : serie.level.includes('fundamental') ? 'Ano' : 'Período'}`,
    statusLabel: serie.isActive ? 'Ativo' : 'Inativo',
    studentsInfo: serie.maxStudents ? `${serie.studentCount}/${serie.maxStudents}` : serie.studentCount.toString()
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl">Gerenciar Séries</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure e gerencie as séries e anos letivos do sistema
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          {/* Botão de Importar */}
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportSeries}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            <Button 
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50 h-10"
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
          </div>

          {/* Botões de Exportar */}
          <div className="flex items-center space-x-1">
            <Button 
              variant="outline" 
              onClick={handleQuickExport} 
              className="border-blue-200 text-blue-700 hover:bg-blue-50 h-10"
              disabled={filteredSeries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button 
              variant="outline"
              onClick={handleExportSeries}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 h-10"
              disabled={filteredSeries.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Button>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()} className="h-10">
                <Plus className="w-4 h-4 mr-2" />
                Nova Série
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <GraduationCap className="w-5 h-5 mr-2" />
                    {editingSerie ? 'Editar Série' : 'Nova Série'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSerie ? 'Edite as informações da série' : 'Crie uma nova série para o sistema'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nome da Série *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: 1ª Série A"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Código *</label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                        placeholder="Ex: 1SA"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nível de Ensino</label>
                    <Select value={formData.level} onValueChange={(value: Serie['level']) => {
                      setFormData({...formData, level: value, grade: getGradeOptions(value)[0]});
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Ano/Série</label>
                      <Select value={formData.grade.toString()} onValueChange={(value) => setFormData({...formData, grade: parseInt(value)})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getGradeOptions(formData.level).map(grade => (
                            <SelectItem key={grade} value={grade.toString()}>
                              {grade}º {formData.level === 'medio' ? 'Ano' : 
                                      formData.level.includes('fundamental') ? 'Ano' : 'Período'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Ano Letivo</label>
                      <Select value={formData.academicYear} onValueChange={(value) => setFormData({...formData, academicYear: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACADEMIC_YEARS.map(year => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Máximo de Alunos</label>
                    <Input
                      type="number"
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({...formData, maxStudents: e.target.value})}
                      placeholder="Ex: 30"
                      min="1"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Descrição</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descrição opcional da série..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={savingId === (editingSerie?.id || 'new')}>
                    {savingId === (editingSerie?.id || 'new') ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {editingSerie ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-base md:text-lg">
            <Filter className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar Série</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Nível de Ensino</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Níveis</SelectItem>
                  {EDUCATION_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="seice-gradient w-10 h-10 rounded-lg flex items-center justify-center">
                <School className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Séries</p>
                <p className="font-semibold">{series.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Séries Ativas</p>
                <p className="font-semibold">{series.filter(s => s.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
                <p className="font-semibold">{series.reduce((sum, s) => sum + s.studentCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ano Letivo</p>
                <p className="font-semibold">{new Date().getFullYear()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Series Table/Cards */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>Séries Cadastradas</CardTitle>
              <CardDescription>
                {filteredSeries.length} série{filteredSeries.length !== 1 ? 's' : ''} encontrada{filteredSeries.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome/Código</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Ano Letivo</TableHead>
                      <TableHead className="text-center">Alunos</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSeries.map(serie => (
                      <TableRow key={serie.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{serie.name}</div>
                            <div className="text-sm text-muted-foreground">{serie.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{getLevelLabel(serie.level)}</div>
                            <div className="text-xs text-muted-foreground">
                              {serie.grade}º {serie.level === 'medio' ? 'Ano' : 
                                             serie.level.includes('fundamental') ? 'Ano' : 'Período'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{serie.academicYear}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                            {serie.studentCount}
                            {serie.maxStudents && `/${serie.maxStudents}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(serie)}
                            disabled={savingId === serie.id}
                          >
                            <Badge variant={serie.isActive ? 'default' : 'secondary'}>
                              {serie.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(serie)}
                              disabled={savingId === serie.id}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(serie)}
                              disabled={savingId === serie.id || serie.studentCount > 0}
                            >
                              {savingId === serie.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredSeries.length === 0 && (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma série encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || levelFilter !== 'all' 
                      ? 'Tente alterar os filtros de busca'
                      : 'Comece criando sua primeira série'
                    }
                  </p>
                  {!searchTerm && levelFilter === 'all' && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Série
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredSeries.map(serie => (
              <Card key={serie.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="seice-gradient w-10 h-10 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium">{serie.name}</h3>
                        <p className="text-sm text-muted-foreground">{serie.code}</p>
                      </div>
                    </div>
                    <Badge variant={serie.isActive ? 'default' : 'secondary'}>
                      {serie.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Nível:</span>
                      <p className="font-medium">{getLevelLabel(serie.level)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ano Letivo:</span>
                      <p className="font-medium">{serie.academicYear}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Série:</span>
                      <p className="font-medium">
                        {serie.grade}º {serie.level === 'medio' ? 'Ano' : 
                                       serie.level.includes('fundamental') ? 'Ano' : 'Período'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Alunos:</span>
                      <p className="font-medium">
                        {serie.studentCount}{serie.maxStudents && `/${serie.maxStudents}`}
                      </p>
                    </div>
                  </div>
                  
                  {serie.description && (
                    <p className="text-sm text-muted-foreground mb-3">{serie.description}</p>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(serie)}
                      disabled={savingId === serie.id}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(serie)}
                      disabled={savingId === serie.id || serie.studentCount > 0}
                    >
                      {savingId === serie.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-1" />
                      )}
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredSeries.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma série encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || levelFilter !== 'all' 
                      ? 'Tente alterar os filtros de busca'
                      : 'Comece criando sua primeira série'
                    }
                  </p>
                  {!searchTerm && levelFilter === 'all' && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Série
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}