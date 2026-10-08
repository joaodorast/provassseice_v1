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
  AlertCircle,
  Lightbulb,
  ChevronDown,
  Check,
  Baby,
  School,
  Target,
  Wrench
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { confirmAction } from '../../utils/confirm';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { StageKey, classifySeries, sortSeries, normalizeText as normalize } from '../../utils/series';

// ---------------------------------------------------------------------------
// Etapas de ensino
// Os cursos continuam salvos como uma lista de nomes (usada em turmas, banco de
// questões e simulados). A etapa é deduzida do nome, então cursos antigos como
// "3º Ano" ou "1º Ano EM" já caem no grupo certo.
// ---------------------------------------------------------------------------

const STAGES: { key: StageKey; label: string; short: string; description: string; color: string; icon: React.ElementType }[] = [
  { key: 'fund1', label: 'Ensino Fundamental I', short: 'Fund. I', description: 'Pré I, Pré II e 1º ao 5º ano', color: 'green', icon: Baby },
  { key: 'fund2', label: 'Ensino Fundamental II', short: 'Fund. II', description: '6º ao 9º ano', color: 'sky', icon: School },
  { key: 'emVestibular', label: 'EM Vestibular', short: 'Vestibular', description: '1º ao 3º ano do Ensino Médio', color: 'violet', icon: Target },
  { key: 'emTecnico', label: 'EM Técnico', short: 'Técnico', description: 'Informática, Administração, Enfermagem...', color: 'amber', icon: Wrench },
];

// Classes completas por cor (o Tailwind precisa dos nomes literais)
const COLOR_CLASSES: Record<string, { bg: string; text: string; ring: string; chip: string; soft: string }> = {
  green: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-400 border-green-400', chip: 'bg-green-600 text-white border-green-600', soft: 'bg-green-50' },
  sky: { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-400 border-sky-400', chip: 'bg-sky-600 text-white border-sky-600', soft: 'bg-sky-50' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-400 border-violet-400', chip: 'bg-violet-600 text-white border-violet-600', soft: 'bg-violet-50' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-400 border-amber-400', chip: 'bg-amber-500 text-white border-amber-500', soft: 'bg-amber-50' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-400 border-slate-400', chip: 'bg-slate-700 text-white border-slate-700', soft: 'bg-slate-50' },
};

const DEFAULT_TECH_COURSES = ['Informática', 'Administração', 'Enfermagem'];

// Anos oferecidos em cada etapa (nome salvo = o que aparece nas turmas)
const STAGE_YEARS: Record<Exclude<StageKey, 'emTecnico' | 'outros'>, string[]> = {
  fund1: ['Pré I', 'Pré II', '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano'],
  fund2: ['6º Ano', '7º Ano', '8º Ano', '9º Ano'],
  emVestibular: ['1º Ano EM', '2º Ano EM', '3º Ano EM'],
};

const techCourseName = (year: number, course: string) => `${year}º Ano Técnico em ${course}`;

export function ManageSeriesPage() {
  const [series, setSeries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulário guiado
  const [stage, setStage] = useState<StageKey>('fund1');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [techCourse, setTechCourse] = useState(DEFAULT_TECH_COURSES[0]);
  const [customTechCourse, setCustomTechCourse] = useState('');
  const [customName, setCustomName] = useState('');

  // Grupos abertos na lista
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    fund1: true, fund2: true, em: true, emVestibular: true, emTecnico: true, outros: true
  });

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
      toast.error('Erro ao carregar cursos');
    } finally {
      setLoading(false);
    }
  };

  const saveSeries = async (updatedSeries: string[]) => {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ series: updatedSeries })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Erro ao salvar cursos');
  };

  const existsSeries = (name: string) =>
    series.some(s => normalize(s) === normalize(name));

  // Cursos técnicos já cadastrados + os padrões
  const techCourses = Array.from(new Set([
    ...DEFAULT_TECH_COURSES,
    ...series
      .map(s => classifySeries(s))
      .filter(c => c.stage === 'emTecnico' && c.techCourse && c.techCourse !== 'Outros')
      .map(c => c.techCourse as string)
  ]));

  const activeTechCourse = techCourse === '__novo__' ? customTechCourse.trim() : techCourse;

  // Opções de ano da etapa escolhida
  const yearOptions: string[] = stage === 'emTecnico'
    ? (activeTechCourse ? [1, 2, 3].map(y => techCourseName(y, activeTechCourse)) : [])
    : stage === 'outros' ? [] : STAGE_YEARS[stage];

  const yearLabel = (name: string) =>
    stage === 'emTecnico' ? name.replace(/\s+T[ée]cnico.*$/i, '') : name.replace(/\s+EM$/, '');

  const toggleYear = (name: string) => {
    setSelectedYears(prev => prev.includes(name) ? prev.filter(y => y !== name) : [...prev, name]);
  };

  const selectStage = (key: StageKey) => {
    setStage(key);
    setSelectedYears([]);
  };

  const addSeries = async (names: string[]) => {
    const toAdd = names.map(n => n.trim()).filter(n => n && !existsSeries(n));
    if (toAdd.length === 0) {
      toast.error('Esses cursos já estão cadastrados');
      return;
    }

    try {
      setLoading(true);
      const updatedSeries = [...series, ...toAdd];
      await saveSeries(updatedSeries);
      setSeries(updatedSeries);
      setSelectedYears([]);
      setCustomName('');
      toast.success(
        toAdd.length === 1 ? 'Curso adicionado!' : `${toAdd.length} cursos adicionados!`,
        { description: toAdd.join(', ') }
      );
    } catch (error: any) {
      console.error('Error adding series:', error);
      toast.error(error.message || 'Erro ao adicionar curso');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeries = async (name: string) => {
    if (!(await confirmAction({ title: 'Excluir curso?', itemName: name }))) {
      return;
    }

    try {
      setLoading(true);
      const updatedSeries = series.filter(s => s !== name);
      await saveSeries(updatedSeries);
      setSeries(updatedSeries);
      toast.success('Curso excluído!', { description: name });
    } catch (error: any) {
      console.error('Error deleting series:', error);
      toast.error(error.message || 'Erro ao excluir curso');
    } finally {
      setLoading(false);
    }
  };

  // Agrupamento para a lista
  const grouped: Record<StageKey, string[]> = { fund1: [], fund2: [], emVestibular: [], emTecnico: [], outros: [] };
  const techByCourse: Record<string, string[]> = {};
  series.forEach(s => {
    const c = classifySeries(s);
    grouped[c.stage].push(s);
    if (c.stage === 'emTecnico') {
      const course = c.techCourse || 'Outros';
      (techByCourse[course] ||= []).push(s);
    }
  });
  const emCount = grouped.emVestibular.length + grouped.emTecnico.length;

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const renderSeriesChip = (name: string, label: string, color: string) => {
    const c = COLOR_CLASSES[color];
    return (
      <div
        key={name}
        className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white pl-3 pr-1 py-1.5 shadow-sm hover:shadow hover:border-slate-300 transition-all"
        title={name}
      >
        <span className={`w-2 h-2 rounded-full ${c.chip.split(' ')[0]}`} />
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <button
          type="button"
          onClick={() => handleDeleteSeries(name)}
          disabled={loading}
          className="ml-1 rounded-md p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label={`Excluir ${name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderGroupHeader = (key: string, label: string, count: number, color: string, Icon: React.ElementType, level = 0, preview: string[] = []) => {
    const c = COLOR_CLASSES[color];
    const isOpen = !!openGroups[key];
    const previewText = preview.length > 4 ? `${preview.slice(0, 4).join(', ')} e mais ${preview.length - 4}` : preview.join(', ');
    return (
      <button
        type="button"
        onClick={() => toggleGroup(key)}
        aria-expanded={isOpen}
        className={`group/header w-full flex items-center justify-between gap-3 rounded-lg px-3 text-left transition-colors ${level > 0 ? 'py-2' : 'py-2.5'} ${isOpen ? c.soft : 'hover:bg-slate-50'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`${level > 0 ? 'w-8 h-8' : 'w-10 h-10'} shrink-0 rounded-full ${isOpen ? 'bg-white' : c.bg} flex items-center justify-center`}>
            <Icon className={`${level > 0 ? 'w-4 h-4' : 'w-5 h-5'} ${c.text}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`${level > 0 ? 'text-sm' : ''} font-semibold text-slate-800`}>{label}</span>
              <Badge variant="outline" className="text-xs bg-white">{count}</Badge>
            </div>
            {!isOpen && (
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {previewText || 'Nenhum curso nesta etapa'}
              </p>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            isOpen
              ? `bg-white ${c.text} border-current`
              : 'bg-white text-slate-600 border-slate-200 group-hover/header:border-slate-300 group-hover/header:text-slate-800'
          }`}
        >
          {isOpen ? 'Ocultar' : 'Ver cursos'}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>
    );
  };

  const stageInfo = (key: StageKey) => STAGES.find(s => s.key === key)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Cursos</h1>
          <p className="text-slate-600">
            Configure os cursos disponíveis no sistema, organizados por etapa de ensino
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-zinc-200 bg-zinc-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-zinc-800 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-zinc-900">
              <p className="font-medium mb-1"><Lightbulb className="w-4 h-4 inline-block align-text-bottom mr-1" />Sobre os Cursos</p>
              <p>Os cursos cadastrados aqui serão usados em:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Banco de Questões (para classificar questões por curso)</li>
                <li>Criação de Simulados</li>
                <li>Cadastro de Turmas</li>
                <li>Relatórios e Estatísticas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo por etapa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map(s => {
          const c = COLOR_CLASSES[s.color];
          const Icon = s.icon;
          return (
            <Card key={s.key} className="seice-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{s.label}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{grouped[s.key].length}</h3>
                  </div>
                  <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulário guiado */}
        <Card className="seice-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Adicionar Curso
            </CardTitle>
            <CardDescription>
              Escolha a etapa e marque os anos que deseja cadastrar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 1. Etapa */}
            <div className="space-y-2">
              <Label>1. Etapa de ensino</Label>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map(s => {
                  const c = COLOR_CLASSES[s.color];
                  const Icon = s.icon;
                  const active = stage === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => selectStage(s.key)}
                      className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-all ${
                        active ? `${c.soft} ${c.ring} ring-2` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${c.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{s.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Curso técnico */}
            {stage === 'emTecnico' && (
              <div className="space-y-2">
                <Label>2. Curso técnico</Label>
                <div className="flex flex-wrap gap-2">
                  {[...techCourses, '__novo__'].map(course => {
                    const active = techCourse === course;
                    return (
                      <button
                        key={course}
                        type="button"
                        onClick={() => { setTechCourse(course); setSelectedYears([]); }}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                          active ? COLOR_CLASSES.amber.chip : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {course === '__novo__' ? '+ Outro curso' : course}
                      </button>
                    );
                  })}
                </div>
                {techCourse === '__novo__' && (
                  <Input
                    placeholder="Nome do curso técnico (ex: Mecânica)"
                    value={customTechCourse}
                    onChange={(e) => { setCustomTechCourse(e.target.value); setSelectedYears([]); }}
                  />
                )}
              </div>
            )}

            {/* 3. Anos */}
            {yearOptions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{stage === 'emTecnico' ? '3.' : '2.'} Anos</Label>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                    onClick={() => setSelectedYears(yearOptions.filter(y => !existsSeries(y)))}
                  >
                    Marcar todos
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {yearOptions.map(name => {
                    const exists = existsSeries(name);
                    const selected = selectedYears.includes(name);
                    const color = stageInfo(stage).color;
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={exists}
                        onClick={() => toggleYear(name)}
                        title={exists ? 'Já cadastrado' : name}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          exists
                            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                            : selected
                              ? `${COLOR_CLASSES[color].chip} shadow-sm`
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:shadow-sm'
                        }`}
                      >
                        {(exists || selected) && <Check className="w-3.5 h-3.5" />}
                        {yearLabel(name)}
                      </button>
                    );
                  })}
                </div>
                {selectedYears.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Será cadastrado: {selectedYears.join(', ')}
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={() => addSeries(selectedYears)}
              className="w-full"
              disabled={loading || selectedYears.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading
                ? 'Salvando...'
                : selectedYears.length > 1
                  ? `Adicionar ${selectedYears.length} cursos`
                  : 'Adicionar Curso'}
            </Button>

            {/* Nome livre */}
            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="customSeries" className="text-slate-600">Ou digite um nome personalizado</Label>
              <div className="flex gap-2">
                <Input
                  id="customSeries"
                  placeholder="Ex: Pré III, 1º Ano Técnico em Mecânica"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && customName.trim() && addSeries([customName])}
                />
                <Button
                  variant="outline"
                  onClick={() => addSeries([customName])}
                  disabled={loading || !customName.trim()}
                >
                  Adicionar
                </Button>
              </div>
              {customName.trim() && (
                <p className="text-xs text-slate-500">
                  Vai para: <strong>{(() => {
                    const c = classifySeries(customName);
                    if (c.stage === 'outros') return 'Outros';
                    const label = stageInfo(c.stage).label;
                    return c.stage === 'emTecnico' ? `${label} › ${c.techCourse}` : label;
                  })()}</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista agrupada */}
        <Card className="seice-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="w-5 h-5 mr-2" />
              Cursos Cadastrados
            </CardTitle>
            <CardDescription>
              Total: {series.length} {series.length === 1 ? 'curso' : 'cursos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {series.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum curso cadastrado ainda.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione cursos usando o formulário ao lado.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y">
                {/* Fundamental I e II */}
                {(['fund1', 'fund2'] as const).map(key => {
                  const s = stageInfo(key);
                  const items = sortSeries(grouped[key]);
                  return (
                    <div key={key} className="p-2">
                      {renderGroupHeader(key, s.label, items.length, s.color, s.icon, 0, items)}
                      {openGroups[key] && (
                        <div className={`flex flex-wrap gap-2 mx-3 mt-2 mb-2 pl-4 border-l-2 ${COLOR_CLASSES[s.color].ring.split(' ')[1]}`}>
                          {items.length > 0
                            ? items.map(name => renderSeriesChip(name, name, s.color))
                            : <p className="text-sm text-slate-400">Nenhum curso nesta etapa.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ensino Médio */}
                <div className="p-2">
                  {renderGroupHeader('em', 'Ensino Médio', emCount, 'violet', GraduationCap, 0, [
                    ...(grouped.emVestibular.length ? [`Vestibular (${grouped.emVestibular.length})`] : []),
                    ...Object.keys(techByCourse).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(course => `Técnico em ${course} (${techByCourse[course].length})`)
                  ])}
                  {openGroups.em && (
                    <div className="ml-5 mt-2 pl-4 border-l-2 border-violet-200 space-y-1 pb-2">
                      {/* Vestibular */}
                      <div>
                        {renderGroupHeader('emVestibular', 'EM Vestibular', grouped.emVestibular.length, 'violet', Target, 1, sortSeries(grouped.emVestibular))}
                        {openGroups.emVestibular && (
                          <div className="flex flex-wrap gap-2 px-3 pb-2 pt-1">
                            {grouped.emVestibular.length > 0
                              ? sortSeries(grouped.emVestibular).map(name => renderSeriesChip(name, name, 'violet'))
                              : <p className="text-sm text-slate-400">Nenhum curso nesta etapa.</p>}
                          </div>
                        )}
                      </div>

                      {/* Técnico */}
                      <div>
                        {renderGroupHeader('emTecnico', 'EM Técnico', grouped.emTecnico.length, 'amber', Wrench, 1, Object.keys(techByCourse).sort((a, b) => a.localeCompare(b, 'pt-BR')))}
                        {openGroups.emTecnico && (
                          <div className="px-3 pb-2 pt-1 space-y-3">
                            {Object.keys(techByCourse).length === 0 && (
                              <p className="text-sm text-slate-400">Nenhum curso técnico cadastrado.</p>
                            )}
                            {Object.keys(techByCourse).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(course => (
                              <div key={course} className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">
                                  {course}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {sortSeries(techByCourse[course]).map(name =>
                                    renderSeriesChip(name, name.replace(/\s+T[ée]cnico.*$/i, '') || name, 'amber')
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Não identificados */}
                {grouped.outros.length > 0 && (
                  <div className="p-2">
                    {renderGroupHeader('outros', 'Outros', grouped.outros.length, 'slate', BookOpen, 0, sortSeries(grouped.outros))}
                    {openGroups.outros && (
                      <div className="flex flex-wrap gap-2 px-3 pb-3 pt-1">
                        {sortSeries(grouped.outros).map(name => renderSeriesChip(name, name, 'slate'))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
