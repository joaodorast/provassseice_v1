import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  Plus, 
  Users, 
  Edit, 
  Trash2, 
  Search,
  Download,
  Upload,
  UserPlus,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Student {
  id: string;
  name: string;
  email: string;
  registration: string;
  classId: string;
  className: string;
  grade: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Class {
  id: string;
  name: string;
  grade: string;
  year: string;
  studentCount: number;
  createdAt: string;
}

export function StudentsManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    registration: '',
    classId: '',
    grade: ''
  });

  const [newClass, setNewClass] = useState({
    name: '',
    grade: '',
    year: new Date().getFullYear().toString()
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/students`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (studentsRes.ok && classesRes.ok) {
        const studentsData = await studentsRes.json();
        const classesData = await classesRes.json();
        
        setStudents(studentsData.students || []);
        setClasses(classesData.classes || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const selectedClassData = classes.find(c => c.id === newStudent.classId);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          students: [{
            ...newStudent,
            className: selectedClassData?.name || '',
            status: 'active'
          }]
        })
      });

      if (response.ok) {
        await fetchData();
        setShowCreateStudent(false);
        setNewStudent({ name: '', email: '', registration: '', classId: '', grade: '' });
      }
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };

  const handleCreateClass = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newClass)
      });

      if (response.ok) {
        await fetchData();
        setShowCreateClass(false);
        setNewClass({ name: '', grade: '', year: new Date().getFullYear().toString() });
      }
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const hasStudents = students.some(s => s.classId === classId);
    if (hasStudents) {
      alert('Não é possível excluir uma turma que possui alunos matriculados.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta turma?')) return;

    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes/${classId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.registration.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || student.classId === selectedClass;
    return matchesSearch && matchesClass;
  });

  const getClassStats = () => {
    return classes.map(cls => ({
      ...cls,
      studentCount: students.filter(s => s.classId === cls.id).length
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Alunos e Turmas</h1>
          <p className="text-slate-600">Gerencie turmas, alunos e matrículas</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowCreateClass(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Nova Turma
          </Button>
          <Button onClick={() => setShowCreateStudent(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Aluno
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total de Alunos</p>
                <p className="text-2xl font-semibold text-slate-800">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total de Turmas</p>
                <p className="text-2xl font-semibold text-slate-800">{classes.length}</p>
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
                <p className="text-sm font-medium text-slate-600">Alunos Ativos</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {students.filter(s => s.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Média por Turma</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {classes.length > 0 ? Math.round(students.length / classes.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Section */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Turmas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getClassStats().map(cls => (
              <div key={cls.id} className="p-4 border rounded-lg bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-slate-800">{cls.name}</h4>
                    <p className="text-sm text-slate-600">{cls.grade} - {cls.year}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingClass(cls)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClass(cls.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{cls.studentCount} alunos</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Students Section */}
      <Card className="seice-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Alunos
            </CardTitle>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Buscar alunos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.registration}</TableCell>
                  <TableCell>{student.className}</TableCell>
                  <TableCell>
                    <Badge className={student.status === 'active' ? 'seice-badge-success' : 'seice-badge-warning'}>
                      {student.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingStudent(student)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStudent(student.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Student Dialog */}
      <Dialog open={showCreateStudent} onOpenChange={setShowCreateStudent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Aluno</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo aluno no sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome completo"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
            />
            <Input
              placeholder="Matrícula"
              value={newStudent.registration}
              onChange={(e) => setNewStudent({ ...newStudent, registration: e.target.value })}
            />
            <Select value={newStudent.classId} onValueChange={(value) => setNewStudent({ ...newStudent, classId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Série/Ano"
              value={newStudent.grade}
              onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateStudent(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateStudent} className="bg-blue-600 hover:bg-blue-700">
                Criar Aluno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Class Dialog */}
      <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Turma</DialogTitle>
            <DialogDescription>
              Crie uma nova turma para organizar seus alunos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da turma (ex: 9º A)"
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
            />
            <Input
              placeholder="Série/Ano (ex: 9º Ano)"
              value={newClass.grade}
              onChange={(e) => setNewClass({ ...newClass, grade: e.target.value })}
            />
            <Input
              placeholder="Ano letivo"
              value={newClass.year}
              onChange={(e) => setNewClass({ ...newClass, year: e.target.value })}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateClass(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateClass} className="bg-blue-600 hover:bg-blue-700">
                Criar Turma
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}