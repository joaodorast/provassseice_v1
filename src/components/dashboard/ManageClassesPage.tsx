import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  GraduationCap, 
  Plus, 
  Trash2,
  Edit,
  Search,
  Users,
  BookOpen,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type Class = {
  id: string;
  name: string;
  grade: string;
  shift: string;
  year: string;
  studentCount: number;
  createdAt: string;
};

export function ManageClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClass, setNewClass] = useState({
    name: '',
    grade: '',
    shift: '',
    year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setClasses(result.classes || []);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClass.name || !newClass.grade || !newClass.shift) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(newClass)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao criar turma');
        return;
      }
      
      toast.success('Turma criada com sucesso!');
      setNewClass({ name: '', grade: '', shift: '', year: new Date().getFullYear().toString() });
      setShowAddForm(false);
      await loadClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Erro ao criar turma');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          name: editingClass.name,
          grade: editingClass.grade,
          shift: editingClass.shift,
          year: editingClass.year
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao atualizar turma');
        return;
      }
      
      toast.success('Turma atualizada com sucesso!');
      setEditingClass(null);
      await loadClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      toast.error('Erro ao atualizar turma');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta turma?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao excluir turma');
        return;
      }
      
      toast.success('Turma excluída com sucesso!');
      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Erro ao excluir turma');
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.shift.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Turmas</h1>
          <p className="text-slate-600">
            Cadastre e organize as turmas da instituição
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Turmas</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{classes.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Alunos</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Séries Diferentes</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {new Set(classes.map(c => c.grade)).size}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingClass) && (
        <Card className="seice-card">
          <CardHeader>
            <CardTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</CardTitle>
            <CardDescription>
              {editingClass ? 'Altere os dados da turma' : 'Preencha os dados da nova turma'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome da Turma</Label>
                <Input
                  id="name"
                  value={editingClass ? editingClass.name : newClass.name}
                  onChange={(e) => editingClass 
                    ? setEditingClass({ ...editingClass, name: e.target.value })
                    : setNewClass(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Turma A, 301, etc"
                />
              </div>
              <div>
                <Label htmlFor="grade">Série/Ano</Label>
                <Input
                  id="grade"
                  value={editingClass ? editingClass.grade : newClass.grade}
                  onChange={(e) => editingClass 
                    ? setEditingClass({ ...editingClass, grade: e.target.value })
                    : setNewClass(prev => ({ ...prev, grade: e.target.value }))
                  }
                  placeholder="Ex: 1º Ano, 6º Ano, etc"
                />
              </div>
              <div>
                <Label htmlFor="shift">Turno</Label>
                <Input
                  id="shift"
                  value={editingClass ? editingClass.shift : newClass.shift}
                  onChange={(e) => editingClass 
                    ? setEditingClass({ ...editingClass, shift: e.target.value })
                    : setNewClass(prev => ({ ...prev, shift: e.target.value }))
                  }
                  placeholder="Ex: Matutino, Vespertino, Noturno"
                />
              </div>
              <div>
                <Label htmlFor="year">Ano Letivo</Label>
                <Input
                  id="year"
                  value={editingClass ? editingClass.year : newClass.year}
                  onChange={(e) => editingClass 
                    ? setEditingClass({ ...editingClass, year: e.target.value })
                    : setNewClass(prev => ({ ...prev, year: e.target.value }))
                  }
                  placeholder="Ex: 2025"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              {editingClass ? (
                <>
                  <Button onClick={handleUpdateClass} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingClass(null)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleAddClass} disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    {loading ? 'Criando...' : 'Criar Turma'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classes List */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle>Lista de Turmas</CardTitle>
          <CardDescription>
            <div className="flex items-center space-x-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar turma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Série/Ano</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Ano Letivo</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-600">
                        {searchTerm ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada ainda'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {!searchTerm && 'Clique em "Nova Turma" para começar'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="font-medium">{classItem.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{classItem.grade}</Badge>
                      </TableCell>
                      <TableCell>{classItem.shift}</TableCell>
                      <TableCell>{classItem.year}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {classItem.studentCount || 0} alunos
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingClass(classItem)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteClass(classItem.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
