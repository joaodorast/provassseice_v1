import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  Users, 
  Download, 
  Plus, 
  Trash2,
  Edit,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiService } from '../../utils/api';

type Student = {
  id: string;
  name: string;
  email: string;
  class: string;
  grade: string;
  registration: string;
  status: 'active' | 'inactive';
  createdAt: string;
};

export function ManageStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    class: '',
    grade: '',
    registration: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getStudents();
      setStudents(response.students || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Erro ao carregar lista de alunos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    file.type === 'application/vnd.ms-excel' || 
                    file.name.endsWith('.xlsx') || 
                    file.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      toast.error('Por favor, selecione um arquivo CSV ou Excel (.xlsx, .xls)');
      return;
    }

    try {
      setLoading(true);
      let newStudents: Omit<Student, 'id' | 'status' | 'createdAt'>[] = [];

      if (isCSV) {
        // Process CSV
        const csvData = await file.text();
        const lines = csvData.split('\n');
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split by comma or tab
          const data = line.includes('\t') ? line.split('\t') : line.split(',');
          
          if (data.length >= 3 && data[0].trim()) {
            newStudents.push({
              name: data[0].trim(),
              email: data[1].trim(),
              class: data[2]?.trim() || '',
              grade: data[3]?.trim() || '',
              registration: data[4]?.trim() || ''
            });
          }
        }
      } else if (isExcel) {
        // Process Excel
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        
        // Skip header row
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row.length >= 3 && row[0]) {
            newStudents.push({
              name: String(row[0]).trim(),
              email: String(row[1] || '').trim(),
              class: String(row[2] || '').trim(),
              grade: String(row[3] || '').trim(),
              registration: String(row[4] || '').trim()
            });
          }
        }
      }

      if (newStudents.length === 0) {
        toast.error('Nenhum aluno válido encontrado no arquivo');
        return;
      }

      console.log(`Importing ${newStudents.length} students:`, newStudents.slice(0, 3));

      await apiService.createStudents(newStudents);
      await loadStudents();
      toast.success(`${newStudents.length} alunos importados com sucesso!`);
      
      // Clear file input
      event.target.value = '';
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar arquivo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      await apiService.createStudents([newStudent]);
      await loadStudents();
      setNewStudent({ name: '', email: '', class: '', grade: '', registration: '' });
      setShowAddForm(false);
      toast.success('Aluno adicionado com sucesso!');
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Erro ao adicionar aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      setLoading(true);
      await apiService.deleteStudent(id);
      await loadStudents();
      toast.success('Aluno removido com sucesso!');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Erro ao remover aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({
      name: student.name,
      email: student.email,
      class: student.class,
      grade: student.grade,
      registration: student.registration
    });
    setShowAddForm(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    
    if (!newStudent.name || !newStudent.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateStudent(editingStudent.id, newStudent);
      await loadStudents();
      setNewStudent({ name: '', email: '', class: '', grade: '', registration: '' });
      setEditingStudent(null);
      setShowAddForm(false);
      toast.success('Aluno atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Erro ao atualizar aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setNewStudent({ name: '', email: '', class: '', grade: '', registration: '' });
    setShowAddForm(false);
  };

  const exportToCSV = () => {
    const csvContent = [
      'Nome,Email,Turma,Turno,Matrícula,Status',
      ...students.map(s => `${s.name},${s.email},${s.class},${s.grade},${s.registration},${s.status}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alunos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csvContent = 'NOME,EMAIL,TURMA,TURNO,MATRICULA\nJoão Silva,joao@email.com,Turma A,Matutino,001\nMaria Santos,maria@email.com,Turma B,Vespertino,002';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_alunos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Modelo baixado com sucesso!');
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'all' || student.class === filterClass;
    return matchesSearch && matchesClass;
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Alunos</h1>
          <p className="text-slate-600">
            Importe, cadastre e gerencie a lista de alunos do sistema
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Aluno
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="seice-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Importar Arquivo
            </CardTitle>
            <CardDescription>
              Importe uma lista de alunos usando arquivo CSV ou Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Arquivo CSV ou Excel</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="mt-1"
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Formatos aceitos: CSV (.csv), Excel (.xlsx, .xls)
                </p>
              </div>
              
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Formato do arquivo:</p>
                      <p>O arquivo deve conter as colunas na seguinte ordem:</p>
                      <p className="font-mono text-xs mt-1 bg-blue-100 p-2 rounded">
                        NOME | EMAIL | TURMA | TURNO | MATRICULA
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Baixar Modelo CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Total de Alunos:</span>
                <Badge variant="secondary">{students.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Alunos Ativos:</span>
                <Badge variant="default">
                  {students.filter(s => s.status === 'active').length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Turmas:</span>
                <Badge variant="outline">{uniqueClasses.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Student Form */}
      {showAddForm && (
        <Card className="seice-card">
          <CardHeader>
            <CardTitle>
              {editingStudent ? 'Editar Aluno' : 'Adicionar Novo Aluno'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do aluno"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="class">Turma</Label>
                <Input
                  id="class"
                  value={newStudent.class}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, class: e.target.value }))}
                  placeholder="Turma A"
                />
              </div>
              <div>
                <Label htmlFor="grade">Turno</Label>
                <Select value={newStudent.grade} onValueChange={(value) => setNewStudent(prev => ({ ...prev, grade: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Matutino">Matutino</SelectItem>
                    <SelectItem value="Vespertino">Vespertino</SelectItem>
                    <SelectItem value="Noturno">Noturno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="registration">Matrícula</Label>
                <Input
                  id="registration"
                  value={newStudent.registration}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, registration: e.target.value }))}
                  placeholder="Número da matrícula"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <Button 
                onClick={editingStudent ? handleUpdateStudent : handleAddStudent} 
                disabled={loading}
              >
                {loading 
                  ? (editingStudent ? 'Atualizando...' : 'Adicionando...') 
                  : (editingStudent ? 'Atualizar Aluno' : 'Adicionar Aluno')
                }
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {uniqueClasses.map(className => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.grade}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.registration}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditStudent(student)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteStudent(student.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterClass !== 'all' 
                  ? 'Nenhum aluno encontrado com os filtros aplicados'
                  : 'Nenhum aluno cadastrado ainda'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}