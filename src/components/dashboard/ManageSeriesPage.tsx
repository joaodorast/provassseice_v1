import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  GraduationCap, 
  Plus, 
  Trash2,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function ManageSeriesPage() {
  const [series, setSeries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSeries, setNewSeries] = useState('');

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSeries(result.series || []);
        }
      }
    } catch (error) {
      console.error('Error loading series:', error);
      toast.error('Erro ao carregar séries');
    } finally {
      setLoading(false);
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
      setLoading(true);
      const updatedSeries = [...series, newSeries.trim()];
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ series: updatedSeries })
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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeries = async (index: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta série?')) {
      return;
    }

    try {
      setLoading(true);
      const updatedSeries = series.filter((_, i) => i !== index);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ series: updatedSeries })
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Séries/Anos</h1>
          <p className="text-slate-600">
            Configure as séries escolares disponíveis no sistema
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Sobre Séries/Anos Escolares</p>
              <p>As séries cadastradas aqui serão usadas em:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Banco de Questões (para classificar questões por série)</li>
                <li>Criação de Simulados</li>
                <li>Cadastro de Turmas</li>
                <li>Relatórios e Estatísticas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Series Form */}
        <Card className="seice-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Série
            </CardTitle>
            <CardDescription>
              Cadastre uma nova série/ano escolar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newSeries">Nome da Série/Ano</Label>
              <Input
                id="newSeries"
                placeholder="Ex: 1º Ano, 6º Ano EM"
                value={newSeries}
                onChange={(e) => setNewSeries(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSeries()}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Exemplos: 1º Ano, 2º Ano, 6º Ano, 1º Ano EM
              </p>
            </div>
            <Button onClick={handleAddSeries} className="w-full" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Adicionando...' : 'Adicionar Série'}
            </Button>
          </CardContent>
        </Card>

        {/* Series List */}
        <Card className="seice-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="w-5 h-5 mr-2" />
              Séries Cadastradas
            </CardTitle>
            <CardDescription>
              Total: {series.length} {series.length === 1 ? 'série' : 'séries'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg divide-y max-h-[600px] overflow-y-auto">
              {series.length === 0 ? (
                <div className="p-8 text-center">
                  <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma série cadastrada ainda.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione séries usando o formulário ao lado.
                  </p>
                </div>
              ) : (
                series.map((s, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{s}</p>
                        <p className="text-xs text-slate-500">Série Escolar</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSeries(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Séries</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{series.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Ensino Fundamental</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {series.filter(s => !s.includes('EM')).length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Ensino Médio</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {series.filter(s => s.includes('EM')).length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
