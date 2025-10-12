# 🏗️ Arquitetura do Sistema SEICE

## Visão Geral

Sistema web fullstack para gerenciamento de simulados impressos, com frontend React, backend Deno/Hono e banco de dados Supabase.

---

## Stack Tecnológica

### Frontend
```
React 18+ (TypeScript)
├── Tailwind CSS v4.0 (estilização)
├── shadcn/ui (componentes)
├── Lucide React (ícones)
├── Sonner (notificações)
└── React Hook Form (formulários)
```

### Backend
```
Supabase
├── PostgreSQL (banco de dados)
├── Supabase Auth (autenticação)
├── Supabase Storage (imagens)
└── Edge Functions (Deno/Hono)
```

### Arquitetura
```
Frontend (React/TS)
    ↕️ HTTPS/REST
Backend (Hono/Deno)
    ↕️ Supabase Client
Database (PostgreSQL KV Store)
Storage (Supabase Storage)
```

---

## Estrutura de Pastas

```
/
├── App.tsx                      # Entry point principal
├── components/
│   ├── LoginPage.tsx           # Autenticação
│   ├── MainDashboard.tsx       # Dashboard principal
│   ├── ErrorBoundary.tsx       # Tratamento de erros
│   ├── LoadingProvider.tsx     # Loading states
│   │
│   ├── dashboard/              # Páginas do sistema
│   │   ├── OverviewPage.tsx           # Visão geral
│   │   ├── QuestionBankPage.tsx      # Banco de questões
│   │   ├── CreateSimuladoPage.tsx    # Criar simulados
│   │   ├── ManageExamsPage.tsx       # Gerenciar simulados
│   │   ├── StudentsManagementPage.tsx # Gestão de alunos
│   │   ├── GradeExamsPage.tsx        # Correção
│   │   ├── ReportsPage.tsx           # Relatórios
│   │   ├── ConfigurationPage.tsx     # Configurações
│   │   └── SeriesPage.tsx            # Séries/Turmas
│   │
│   ├── ui/                     # Componentes shadcn
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   └── figma/
│       └── ImageWithFallback.tsx
│
├── utils/
│   ├── api.ts                  # Cliente API
│   ├── excel-utils.ts          # Exportação Excel
│   ├── supabase-client.ts      # Cliente Supabase
│   └── supabase/
│       └── info.tsx            # Config Supabase
│
├── supabase/
│   └── functions/
│       └── server/
│           ├── index.tsx       # Rotas backend
│           └── kv_store.tsx    # Utilitários KV (protegido)
│
├── styles/
│   └── globals.css             # Estilos globais + Tailwind
│
└── guidelines/
    └── Guidelines.md           # Diretrizes de código
```

---

## Fluxo de Dados

### 1. Autenticação

```
LoginPage
    ↓ (email/senha)
Supabase Auth
    ↓ (access_token)
localStorage + React State
    ↓
MainDashboard (autenticado)
```

**Código:**
```typescript
// Login
const { data: { session } } = await supabase.auth.signInWithPassword({
  email, password
});
localStorage.setItem('access_token', session.access_token);

// Requisições autenticadas
headers: {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
}
```

### 2. CRUD de Questões

```
QuestionBankPage (UI)
    ↓ (apiService.createQuestion)
API Client (/utils/api.ts)
    ↓ (POST /questions)
Backend (Hono Router)
    ↓ (kv.set)
KV Store (PostgreSQL)
```

**Estrutura de Dados:**
```typescript
type Question = {
  id: string;
  question: string;
  subject: string; // Matemática, Português, etc.
  difficulty: string; // Fácil, Médio, Difícil
  options: string[]; // [A, B, C, D]
  correctAnswer: number; // 0, 1, 2, ou 3
  explanation?: string;
  tags?: string[];
  weight?: number; // Padrão: 1.0
  userId: string;
  createdAt: string;
}
```

**Storage:**
```
KV Key: questions:{userId}:{questionId}
KV Value: Question object
```

### 3. Criação de Simulados

```
CreateSimuladoPage
    ↓ (seleciona 10q x 5 matérias)
    ↓ (apiService.createExam)
Backend
    ↓ (valida 50 questões)
    ↓ (kv.set)
KV Store
```

**Estrutura:**
```typescript
type Exam = {
  id: string;
  title: string;
  description: string;
  questionsPerSubject: number; // 10
  timeLimit: number; // minutos
  subjects: string[]; // [Matemática, Português, ...]
  totalQuestions: number; // 50
  questions: Question[];
  userId: string;
  createdAt: string;
  status: 'Rascunho' | 'Ativo' | 'Arquivado';
}
```

**Storage:**
```
KV Key: exams:{userId}:{examId}
KV Value: Exam object (com 50 questões)
```

### 4. Submissões e Correção

```
GradeExamsPage
    ↓ (visualiza submissão)
    ↓ (upload imagem)
Backend
    ↓ (Supabase Storage)
    ↓ (atualiza metadata)
KV Store + Storage
```

**Estrutura:**
```typescript
type Submission = {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  studentGrade: string;
  answers: number[]; // [1, 2, 0, 3, ...]
  score: number; // acertos
  totalQuestions: number; // 50
  percentage: number; // 0-100
  timeSpent: number; // minutos
  submittedAt: string;
  feedback?: string;
  reviewNotes?: string;
  answerSheetImages?: string[]; // IDs de imagens
}
```

**Storage:**
```
KV Key: submissions:{userId}:{submissionId}
KV Value: Submission object

Storage Path: {userId}/{examId}/{submissionId}_{timestamp}.jpg
Storage Metadata: answer-sheets:{userId}:{imageId}
```

---

## Backend Routes

### Autenticação
```
POST   /make-server-83358821/signup
       Body: { name, email, password }
       Response: { success, user }

GET    /make-server-83358821/user/profile
       Headers: Authorization Bearer {token}
       Response: { success, profile }

PUT    /make-server-83358821/user/profile
       Body: { name, institution, position, ... }
       Response: { success, profile }
```

### Questões
```
GET    /make-server-83358821/questions
       Response: { success, questions: Question[] }

POST   /make-server-83358821/questions
       Body: Question
       Response: { success, question }

PUT    /make-server-83358821/questions/:id
       Body: Partial<Question>
       Response: { success, question }

DELETE /make-server-83358821/questions/:id
       Response: { success }
```

### Simulados (Exams)
```
GET    /make-server-83358821/exams
       Response: { success, exams: Exam[] }

POST   /make-server-83358821/exams
       Body: Exam
       Response: { success, exam }

PUT    /make-server-83358821/exams/:id
       Body: Partial<Exam>
       Response: { success, exam }

DELETE /make-server-83358821/exams/:id
       Response: { success }

POST   /make-server-83358821/exams/:id/duplicate
       Response: { success, exam }

PUT    /make-server-83358821/exams/:id/status
       Body: { status: 'Ativo' | 'Arquivado' }
       Response: { success, exam }

POST   /make-server-83358821/exams/export
       Body: { examIds: string[], format: 'json' }
       Response: { success, data }

POST   /make-server-83358821/exams/import
       Body: { data, overwrite: boolean }
       Response: { success, imported: number }
```

### Alunos (Students)
```
GET    /make-server-83358821/students
       Response: { success, students: Student[] }

POST   /make-server-83358821/students
       Body: { students: Student[] }
       Response: { success, students }

PUT    /make-server-83358821/students/:id
       Body: Partial<Student>
       Response: { success, student }

DELETE /make-server-83358821/students/:id
       Response: { success }
```

### Séries e Turmas
```
GET    /make-server-83358821/series
       Response: { success, series: Serie[] }

POST   /make-server-83358821/series
       Body: Serie
       Response: { success, serie }

GET    /make-server-83358821/classes
       Response: { success, classes: Class[] }

POST   /make-server-83358821/classes
       Body: Class
       Response: { success, class }
```

### Submissões
```
GET    /make-server-83358821/submissions
       Response: { success, submissions: Submission[] }

POST   /make-server-83358821/submissions
       Body: Submission
       Response: { success, submission }

PUT    /make-server-83358821/submissions/:id/review
       Body: { feedback, reviewNotes }
       Response: { success, submission }
```

### Upload de Imagens (Cartões Resposta)
```
POST   /make-server-83358821/submissions/:id/upload-answer-sheet
       Body: { imageData: base64, fileName, studentName, examId }
       Response: { success, image }

GET    /make-server-83358821/submissions/:id/answer-sheets
       Response: { success, images: Image[] }

DELETE /make-server-83358821/answer-sheets/:imageId
       Response: { success }
```

### Relatórios
```
POST   /make-server-83358821/grading/export-report
       Body: { submissionIds?, examId?, format? }
       Response: { success, data }

GET    /make-server-83358821/dashboard/stats
       Response: { success, stats }
```

---

## Banco de Dados (KV Store)

### Estrutura de Chaves

```
Padrão: {tipo}:{userId}:{id}

Questões:
  questions:{userId}:{questionId}

Simulados:
  exams:{userId}:{examId}

Alunos:
  students:{userId}:{studentId}

Submissões:
  submissions:{userId}:{submissionId}

Séries:
  series:{userId}:{serieId}

Turmas:
  classes:{userId}:{classId}

Configurações:
  user-settings:{userId}
  system-settings:{userId}

Imagens (metadata):
  answer-sheets:{userId}:{imageId}
```

### Operações KV

```typescript
// Salvar
await kv.set(key, value);

// Buscar
const value = await kv.get(key);

// Buscar múltiplos
const values = await kv.mget([key1, key2]);

// Buscar por prefixo
const allQuestions = await kv.getByPrefix(`questions:${userId}:`);

// Deletar
await kv.del(key);

// Deletar múltiplos
await kv.mdel([key1, key2]);
```

---

## Supabase Storage

### Buckets

```
make-83358821-answer-sheets (privado)
├── {userId}/
│   ├── {examId}/
│   │   ├── {submissionId}_123456.jpg
│   │   └── {submissionId}_123457.jpg
│   └── unknown/
│       └── ...
```

### Configuração

```typescript
// Criar bucket (na inicialização)
await supabase.storage.createBucket('make-83358821-answer-sheets', {
  public: false,
  fileSizeLimit: 10485760 // 10MB
});

// Upload
await supabase.storage
  .from('make-83358821-answer-sheets')
  .upload(filePath, imageBuffer, {
    contentType: 'image/jpeg',
    cacheControl: '3600'
  });

// Signed URL (válida por 1 ano)
const { data } = await supabase.storage
  .from('make-83358821-answer-sheets')
  .createSignedUrl(filePath, 31536000);

// Delete
await supabase.storage
  .from('make-83358821-answer-sheets')
  .remove([filePath]);
```

---

## API Client

### Estrutura

```typescript
// /utils/api.ts

class ApiService {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    };
  }

  private async request(endpoint, options) {
    // Timeout de 10 segundos
    // Tratamento de erros
    // Logging automático
  }

  // Métodos públicos
  async getQuestions() { ... }
  async createQuestion(question) { ... }
  async getExams() { ... }
  // ...
}

export const apiService = new ApiService();
```

### Uso

```typescript
import { apiService } from '../utils/api';

// Buscar questões
const { success, questions } = await apiService.getQuestions();

// Criar questão
const { success, question } = await apiService.createQuestion({
  question: "Quanto é 2+2?",
  subject: "Matemática",
  // ...
});

// Upload de imagem
const { success, image } = await apiService.uploadAnswerSheet(
  submissionId,
  base64Data,
  fileName
);
```

---

## Frontend Components

### Páginas Principais

**OverviewPage.tsx**
- Dashboard com estatísticas gerais
- Gráficos de desempenho
- Atalhos rápidos

**QuestionBankPage.tsx**
- CRUD de questões
- Filtros (matéria, dificuldade, tags)
- Busca avançada
- Exportação em lote

**CreateSimuladoPage.tsx**
- Formulário de criação
- Seleção de questões (manual/automática)
- Preview do simulado
- Validação (50 questões obrigatórias)

**ManageExamsPage.tsx**
- Lista de simulados
- Duplicar, ativar/desativar
- Exportar para Excel
- Imprimir

**GradeExamsPage.tsx**
- Lista de submissões
- Upload de imagens de gabaritos
- Análise por matéria
- Feedback personalizado

**ReportsPage.tsx**
- Estatísticas gerais
- Análise por matéria
- Exportação em Excel profissional

**StudentsManagementPage.tsx**
- CRUD de alunos
- Importação em lote (Excel/CSV)
- Organização por séries/turmas

---

## Estilização

### Tailwind CSS v4

```css
/* /styles/globals.css */

/* Variáveis CSS customizadas */
:root {
  --seice-blue-primary: #1e40af;
  --seice-blue-secondary: #3b82f6;
  /* ... */
}

/* Classes utilitárias customizadas */
.seice-gradient { /* ... */ }
.seice-card { /* ... */ }
.seice-button-primary { /* ... */ }
```

### Componentes UI (shadcn)

```typescript
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Dialog } from './components/ui/dialog';
import { Table } from './components/ui/table';
// ...

// Uso
<Button variant="default" size="lg">
  Criar Simulado
</Button>

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>
```

---

## Performance

### Otimizações Implementadas

1. **Loading Progressivo**
   - Carrega dados essenciais primeiro
   - Loading states para UX
   - Timeouts configuráveis (10s)

2. **Caching**
   - localStorage para token
   - React state para dados em memória
   - Signed URLs válidas por 1 ano

3. **Lazy Loading**
   - Componentes carregados sob demanda
   - Imagens com loading="lazy"

4. **Debouncing**
   - Busca com delay
   - Filtros otimizados

### Métricas Alvo

- **First Load**: < 3s
- **Page Navigation**: < 500ms
- **API Request**: < 2s
- **File Upload**: < 5s (10MB)
- **Excel Export**: < 3s (100 registros)

---

## Segurança

### Autenticação

```typescript
// Middleware no backend
const requireAuth = async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  c.set('user', user);
  await next();
};
```

### Autorização

- Usuários só acessam seus próprios dados
- Todas as queries filtradas por `userId`
- Storage com buckets privados

### Validação

```typescript
// Backend
if (!question || !subject || !difficulty) {
  return c.json({ error: 'Missing required fields' }, 400);
}

// Frontend
const schema = z.object({
  title: z.string().min(3),
  questionsPerSubject: z.number().min(1).max(20)
});
```

---

## Tratamento de Erros

### Frontend

```typescript
try {
  const response = await apiService.getQuestions();
  if (!response.success) {
    throw new Error(response.error);
  }
  // ...
} catch (error) {
  console.error('Error:', error);
  toast.error('Erro ao carregar questões');
}
```

### Backend

```typescript
try {
  // lógica
  return c.json({ success: true, data });
} catch (error) {
  console.error('Error:', error);
  return c.json({ 
    error: 'Error message: ' + error.message 
  }, 500);
}
```

### ErrorBoundary

```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## Exportação Excel

### Utilitário

```typescript
// /utils/excel-utils.ts

export const exportToExcel = (data, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Formatação
  ws['!cols'] = [{ width: 30 }, { width: 20 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
```

### Uso

```typescript
import { exportToExcel } from '../utils/excel-utils';

const exportQuestions = () => {
  const data = questions.map(q => ({
    'Enunciado': q.question,
    'Matéria': q.subject,
    'Dificuldade': q.difficulty,
    'Resposta Correta': q.options[q.correctAnswer]
  }));
  
  exportToExcel(data, 'questoes');
};
```

---

## Testing

### Testes Manuais

Ver [README.md](README.md) para roteiro completo de testes.

### Testes Automatizados (futuro)

```typescript
// Exemplo com Vitest
describe('QuestionBank', () => {
  it('should create question', async () => {
    const question = { /* ... */ };
    const response = await apiService.createQuestion(question);
    expect(response.success).toBe(true);
  });
});
```

---

## Deployment

### Ambiente de Produção

1. **Frontend**: Figma Make (automático)
2. **Backend**: Supabase Edge Functions
3. **Database**: Supabase PostgreSQL
4. **Storage**: Supabase Storage

### Variáveis de Ambiente

```
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-key]
SUPABASE_DB_URL=postgresql://[connection-string]
```

### Build

```bash
# Frontend build automático via Figma Make
# Backend deploy automático via Supabase
```

---

## Próximas Melhorias

### Features
- [ ] OCR para reconhecimento automático de gabaritos
- [ ] Geração de PDF direto no sistema
- [ ] Envio de feedback por email
- [ ] Dashboard de analytics avançado
- [ ] Histórico de versões de simulados
- [ ] Comparação entre turmas

### Performance
- [ ] Server-side pagination
- [ ] GraphQL para queries otimizadas
- [ ] Service Worker para cache offline
- [ ] Compressão de imagens automática

### UX
- [ ] Dark mode
- [ ] Temas customizáveis
- [ ] Atalhos de teclado
- [ ] Tour guiado para novos usuários
- [ ] Mobile app (React Native)

---

**Documento mantido por: Equipe de Desenvolvimento**
**Última atualização: Outubro 2025**
