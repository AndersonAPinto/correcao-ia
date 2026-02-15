# Design Document - CorregIA

## 1. Visão Geral do Projeto

### Problema que o Sistema Resolve

O CorregIA é uma plataforma web que automatiza a correção de provas escolares utilizando Inteligência Artificial. O sistema resolve o problema de tempo excessivo gasto por professores na correção manual de avaliações, oferecendo:

- Correção automática de provas dissertativas e de múltipla escolha
- OCR (Reconhecimento Óptico de Caracteres) para transcrição de respostas manuscritas
- Análise de desempenho por habilidades e questões
- Feedback automático para alunos
- Redução de até 80% do tempo gasto em correções manuais

### Público-Alvo

- Professores de ensino fundamental e médio
- Coordenadores pedagógicos
- Instituições de ensino que buscam otimizar processos de avaliação

### Objetivo Principal

Automatizar o processo de correção de provas escolares através de IA, permitindo que educadores foquem em atividades pedagógicas mais estratégicas, enquanto o sistema processa avaliações de forma rápida, precisa e com análise detalhada de desempenho.

---

## 2. Arquitetura do Sistema

### Visão Geral (Alto Nível)

O sistema segue uma arquitetura full-stack baseada em Next.js 14, utilizando:

- **Frontend**: React com Next.js App Router (Server Components e Client Components)
- **Backend**: API Routes do Next.js (Serverless Functions)
- **Banco de Dados**: MongoDB (NoSQL)
- **IA/ML**: Google Cloud Vertex AI (Gemini 2.0 Flash)
- **Autenticação**: JWT (JSON Web Tokens)
- **Email**: Resend API
- **Armazenamento de Arquivos**: Sistema de arquivos local (`public/uploads/`)

### Frontend

**Tecnologias:**
- Next.js 14.2.3 (App Router)
- React 18
- Tailwind CSS 3.4.1
- Radix UI (componentes acessíveis)
- Framer Motion (animações)
- Recharts (gráficos e analytics)
- React Hook Form + Zod (validação de formulários)
- Sonner (notificações toast)

**Responsabilidades:**
- Interface de usuário responsiva e moderna
- Gerenciamento de estado local (React hooks)
- Comunicação com API via fetch
- Renderização condicional baseada em autenticação
- Landing page para usuários não autenticados
- Dashboard administrativo para usuários autenticados
- Upload de arquivos (imagens de provas)
- Visualização de resultados e analytics

**Estrutura de Componentes:**
- `components/sections/`: Seções principais do dashboard (Painel, Analytics, CorretorIA, Gabaritos, etc.)
- `components/ui/`: Componentes reutilizáveis baseados em Radix UI
- `components/landing/`: Componentes da landing page
- `components/auth/`: Componentes de autenticação

### Backend

**Tecnologias:**
- Next.js API Routes
- MongoDB Driver 6.21.0
- JWT (jsonwebtoken 9.0.2)
- Bcrypt (bcryptjs 3.0.2)
- Multer 2.0.2 (upload de arquivos)
- UUID (uuid 9.0.1)

**Responsabilidades:**
- Autenticação e autorização (JWT)
- Processamento de uploads de provas
- Integração com Vertex AI para OCR e correção
- Gerenciamento de dados (CRUD)
- Geração de relatórios e analytics
- Envio de emails (verificação, recuperação de senha)
- Rate limiting e segurança
- Logs de auditoria

**Padrão Arquitetural:**
- **Repository Pattern**: Camada de abstração para acesso a dados (`lib/repositories/`)
- **Service Layer**: Lógica de negócio (`lib/services/`)
- **API Handlers**: Utilitários compartilhados (`lib/api-handlers.js`)

### Integrações Externas

**Google Cloud Vertex AI:**
- Modelo: Gemini 2.0 Flash (com fallback para Gemini 1.5 Flash/Pro)
- Uso: OCR de imagens manuscritas e correção de questões dissertativas
- Configuração: Via variáveis de ambiente (`GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_CREDENTIALS`)
- Retry Logic: Implementado com até 3 tentativas e fallback de modelos

**Resend API:**
- Uso: Envio de emails transacionais
- Funcionalidades: Verificação de email, recuperação de senha
- Configuração: Via `RESEND_API_KEY`

**MongoDB:**
- Tipo: NoSQL (Document Database)
- Uso: Armazenamento de todos os dados da aplicação
- Conexão: Pool de conexões otimizado para serverless
- Collections principais:
  - `users`: Usuários do sistema
  - `turmas`: Turmas de alunos
  - `alunos`: Alunos cadastrados
  - `gabaritos`: Gabaritos de provas
  - `avaliacoes_corrigidas`: Provas corrigidas
  - `habilidades`: Habilidades avaliadas
  - `perfis_avaliacao`: Perfis de correção personalizados
  - `notificacoes`: Notificações do sistema
  - `logs_auditoria`: Logs de segurança
  - `rate_limits`: Controle de rate limiting

---

## 3. Fluxos Principais

### Fluxo de Uso do Usuário

1. **Autenticação:**
   - Usuário acessa a landing page
   - Clica em "Login" ou "Registrar"
   - Preenche credenciais ou usa OAuth Google
   - Sistema valida e gera JWT
   - Token armazenado em `localStorage`
   - Redirecionamento para dashboard

2. **Configuração Inicial:**
   - Criar turmas
   - Cadastrar alunos nas turmas
   - Criar gabaritos (múltipla escolha ou dissertativa)
   - Definir habilidades a serem avaliadas
   - (Opcional) Criar perfis de avaliação com critérios de rigor

3. **Correção de Provas:**
   - Acessa seção "CorregIA" ou "Painel"
   - Seleciona turma, aluno, período e gabarito
   - Faz upload da imagem da prova (JPG, PNG, WEBP, PDF)
   - Sistema processa automaticamente:
     - **Múltipla Escolha**: OCR identifica respostas marcadas → Compara com gabarito → Calcula nota
     - **Dissertativa**: OCR transcreve texto → IA corrige comparando com gabarito → Avalia habilidades → Gera feedback
   - Resultado disponível imediatamente
   - Notificação criada automaticamente

4. **Validação e Análise:**
   - Professor revisa correção na seção "Resultados"
   - Pode validar ou ajustar notas
   - Acessa analytics por aluno, turma ou habilidade
   - Exporta relatórios (CSV, Excel)

### Fluxo de Dados

**Upload e Processamento:**
```
Cliente (Frontend)
  ↓ [POST /api/correcoes]
API Route (correcoes/route.js)
  ↓ [Validação: arquivo, gabarito, turma, aluno]
  ↓ [Salva arquivo em public/uploads/]
  ↓ [Converte imagem para base64]
  ↓ [Chama Vertex AI]
Vertex AI (Gemini 2.0 Flash)
  ↓ [OCR + Correção]
  ↓ [Retorna JSON estruturado]
API Route
  ↓ [Processa resposta]
  ↓ [Salva em avaliacoes_corrigidas]
  ↓ [Cria notificação]
  ↓ [Retorna resultado]
Cliente (Frontend)
  ↓ [Exibe resultado]
```

**Autenticação:**
```
Cliente
  ↓ [POST /api/auth/login]
API Route
  ↓ [Valida credenciais]
  ↓ [Gera JWT]
  ↓ [Retorna token + dados do usuário]
Cliente
  ↓ [Armazena token em localStorage]
  ↓ [Middleware valida token em requisições]
```

**Analytics:**
```
Cliente
  ↓ [GET /api/analytics/aluno/[id]]
API Route
  ↓ [Consulta avaliacoes_corrigidas]
  ↓ [Agrega dados por habilidade]
  ↓ [Calcula métricas]
  ↓ [Retorna dados]
Cliente
  ↓ [Renderiza gráficos com Recharts]
```

### Pontos de Automação

1. **Correção Automática:**
   - OCR de respostas manuscritas
   - Comparação automática com gabarito
   - Cálculo de notas
   - Avaliação de habilidades
   - Geração de feedback

2. **Notificações:**
   - Criação automática ao concluir correção
   - Contador de pendências atualizado a cada 30 segundos

3. **Validação de Arquivos:**
   - Tipo de arquivo (JPG, PNG, WEBP, PDF)
   - Tamanho máximo (10MB)
   - Verificação de integridade

4. **Rate Limiting:**
   - Bloqueio automático após 5 tentativas de login em 15 minutos
   - Registro de tentativas por IP e email

---

## 4. Estrutura do Projeto

### Organização de Pastas

```
correcao-ia/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticação (login, register, OAuth, etc.)
│   │   ├── correcoes/            # Upload e processamento de provas
│   │   ├── avaliacoes/           # Gerenciamento de avaliações
│   │   ├── turmas/               # CRUD de turmas
│   │   ├── alunos/               # CRUD de alunos
│   │   ├── gabaritos/            # CRUD de gabaritos
│   │   ├── habilidades/          # CRUD de habilidades
│   │   ├── perfis/               # Perfis de avaliação
│   │   ├── analytics/            # Endpoints de analytics
│   │   ├── reports/               # Relatórios
│   │   ├── export/               # Exportação (CSV, Excel)
│   │   ├── notificacoes/         # Notificações
│   │   └── settings/             # Configurações
│   ├── page.js                   # Página principal (dashboard ou landing)
│   ├── layout.js                 # Layout raiz
│   └── globals.css               # Estilos globais
├── components/                   # Componentes React
│   ├── sections/                 # Seções do dashboard
│   ├── ui/                       # Componentes UI reutilizáveis
│   ├── landing/                  # Componentes da landing page
│   └── auth/                     # Componentes de autenticação
├── lib/                          # Código compartilhado
│   ├── repositories/             # Camada de acesso a dados
│   ├── services/                 # Lógica de negócio
│   ├── mongodb.js                # Conexão com MongoDB
│   ├── auth.js                   # Utilitários de autenticação
│   ├── api-handlers.js           # Handlers compartilhados (Vertex AI, etc.)
│   ├── constants.js              # Constantes do sistema
│   └── utils.js                  # Utilitários gerais
├── hooks/                        # React Hooks customizados
├── public/                       # Arquivos estáticos
│   ├── uploads/                  # Provas enviadas
│   ├── gabaritos/                # Gabaritos salvos
│   └── imagens/                  # Imagens da aplicação
├── scripts/                      # Scripts utilitários
├── middleware.js                 # Middleware do Next.js (autenticação)
├── next.config.js                # Configuração do Next.js
├── tailwind.config.js            # Configuração do Tailwind
└── package.json                  # Dependências
```

### Papéis dos Principais Arquivos

**`app/page.js`:**
- Componente principal da aplicação
- Gerencia estado de autenticação
- Renderiza landing page ou dashboard baseado em autenticação
- Coordena navegação entre seções

**`middleware.js`:**
- Validação de tokens JWT em rotas protegidas
- Redirecionamento para login quando não autenticado
- Proteção de rotas `/dashboard` e `/api/users`, `/api/correcoes`

**`lib/api-handlers.js`:**
- Funções utilitárias para API
- `requireAuth()`: Validação de autenticação
- `getVertexAIClient()`: Configuração do cliente Vertex AI
- `callGeminiAPIWithRetry()`: Chamada à API com retry e fallback
- `isVertexAIConfigured()`: Verificação de configuração
- `logAudit()`: Logs de auditoria
- `checkRateLimit()`: Rate limiting

**`lib/repositories/BaseRepository.js`:**
- Classe base para repositórios
- Abstrai operações CRUD do MongoDB
- Herdada por todos os repositórios específicos

**`lib/services/GradingService.js`:**
- Lógica de negócio para correção
- Enriquecimento de dados de avaliações
- Validação de avaliações

**`app/api/correcoes/route.js`:**
- Endpoint principal de upload e correção
- `handleDissertativaUpload()`: Processa questões dissertativas
- `handleMultiplaEscolhaUpload()`: Processa múltipla escolha
- Integração com Vertex AI
- Persistência de resultados

**`lib/mongodb.js`:**
- Gerenciamento de conexão com MongoDB
- Pool de conexões otimizado para serverless
- Singleton pattern para desenvolvimento

---

## 5. Decisões Técnicas

### Por Que Essas Tecnologias Foram Escolhidas

**Next.js 14:**
- Framework full-stack que unifica frontend e backend
- App Router oferece melhor organização e performance
- Server Components reduzem bundle size
- API Routes simplificam criação de endpoints
- Otimizações automáticas (code splitting, image optimization)
- Suporte nativo a serverless deployment (Vercel)

**MongoDB:**
- Flexibilidade de schema (útil para diferentes tipos de gabaritos)
- Documentos JSON nativos (compatível com JavaScript)
- Escalabilidade horizontal
- Suporte a índices para queries complexas
- Integração simples com Node.js

**Vertex AI (Gemini):**
- Modelo multimodal (texto + imagem) necessário para OCR
- Alta precisão em reconhecimento de caligrafia
- Capacidade de correção contextual de questões dissertativas
- API robusta com retry automático
- Suporte a múltiplos modelos (fallback)

**Radix UI + Tailwind CSS:**
- Componentes acessíveis por padrão (Radix UI)
- Customização completa via Tailwind
- Consistência visual
- Performance (CSS-in-JS otimizado)
- Bundle size reduzido

**JWT para Autenticação:**
- Stateless (ideal para serverless)
- Não requer sessões no servidor
- Fácil integração com API Routes
- Suporte a expiração de tokens

### Trade-offs Percebidos no Código

**Armazenamento de Arquivos Local (`public/uploads/`):**
- **Prós**: Simplicidade, sem custos adicionais
- **Contras**: Não escala bem, problemas em deployments serverless (Vercel)
- **Solução Futura**: Migrar para S3/Cloud Storage

**Sistema de Créditos Abolido:**
- Código ainda contém referências a `CreditService` e `CreditRepository`
- Comentários indicam que créditos foram removidos
- **Débito Técnico**: Limpeza de código não utilizado

**Validação de Token no Middleware:**
- Middleware apenas verifica existência do token, não valida assinatura
- Validação completa ocorre nas API Routes
- **Trade-off**: Performance vs Segurança (aceitável, validação ocorre em camada crítica)

**Retry Logic no Vertex AI:**
- Implementado manualmente com múltiplos modelos
- **Prós**: Controle total sobre fallback
- **Contras**: Código complexo, difícil manutenção
- **Melhoria Futura**: Usar biblioteca de retry (ex: `p-retry`)

**Uso de `localStorage` para Token:**
- **Prós**: Simplicidade, funciona em SPA
- **Contras**: Vulnerável a XSS, não acessível em SSR
- **Melhoria Futura**: Considerar httpOnly cookies

**MongoDB sem ORM:**
- Uso direto do driver MongoDB
- **Prós**: Performance, controle total
- **Contras**: Mais código boilerplate, sem validação de schema
- **Melhoria Futura**: Considerar Mongoose para validação

---

## 6. Limitações Atuais

### Pontos Frágeis

1. **Armazenamento de Arquivos:**
   - Arquivos salvos localmente não persistem em deployments serverless
   - Sem backup automático
   - Risco de perda de dados em caso de falha do servidor

2. **Processamento Síncrono:**
   - Correção ocorre durante a requisição HTTP
   - Timeout em provas muito grandes ou processamento lento
   - Sem fila de processamento assíncrona

3. **Validação de Dados:**
   - Validação de schema MongoDB feita manualmente
   - Sem validação automática de tipos
   - Risco de dados inconsistentes

4. **Rate Limiting:**
   - Implementado apenas para login
   - Sem proteção global contra abuso de API
   - Possível sobrecarga em uploads simultâneos

5. **Tratamento de Erros:**
   - Alguns erros retornam mensagens genéricas
   - Logs de erro podem expor informações sensíveis em desenvolvimento
   - Sem sistema centralizado de monitoramento de erros

### Débitos Técnicos Visíveis

1. **Código Não Utilizado:**
   - `CreditService` e `CreditRepository` ainda existem mas não são usados
   - Comentários indicam remoção de sistema de créditos
   - Arquivo `route.old.js` em `app/api/[[...path]]/`

2. **Configuração de Vertex AI:**
   - Múltiplas formas de configuração (variável de ambiente, arquivo JSON)
   - Lógica complexa de fallback
   - Dificulta troubleshooting

3. **Estrutura de Dados:**
   - Uso de `id` customizado (UUID) além de `_id` do MongoDB
   - Duplicação de identificadores pode causar confusão
   - Queries precisam usar `id` em vez de `_id`

4. **Segurança:**
   - Headers de segurança configurados, mas CSP pode ser muito restritivo
   - Sem validação de CSRF tokens
   - Tokens JWT sem refresh tokens

5. **Performance:**
   - Queries MongoDB sem índices explícitos (exceto script `create-indexes.js`)
   - Sem cache de dados frequentemente acessados
   - Enriquecimento de dados (turma, aluno, gabarito) feito em loop sequencial

6. **Testes:**
   - Ausência de testes unitários
   - Sem testes de integração
   - Sem testes E2E

---

## 7. Possíveis Evoluções

### Melhorias Naturais Baseadas na Arquitetura Atual

1. **Fila de Processamento Assíncrona:**
   - Implementar fila (Redis/Bull) para processamento de provas
   - Webhooks ou polling para notificar conclusão
   - Melhor experiência para uploads em lote

2. **Armazenamento em Nuvem:**
   - Migrar arquivos para Google Cloud Storage ou AWS S3
   - URLs assinadas para acesso seguro
   - Backup automático

3. **Cache:**
   - Redis para cache de dados frequentes (turmas, alunos, gabaritos)
   - Redução de queries ao MongoDB
   - Melhor performance em analytics

4. **Validação de Schema:**
   - Implementar Mongoose ou Zod schemas
   - Validação automática em runtime
   - Type safety melhorado

5. **Sistema de Versões de Gabaritos:**
   - Histórico de alterações em gabaritos
   - Rastreabilidade de mudanças
   - Rollback de versões

6. **API Pública para Alunos:**
   - Endpoint para alunos visualizarem suas correções
   - Autenticação separada (tokens de acesso limitado)
   - Dashboard simplificado para alunos

7. **Exportação Avançada:**
   - Relatórios em PDF
   - Gráficos personalizados
   - Comparação entre turmas/períodos

8. **Integração com LMS:**
   - Sincronização com Moodle, Google Classroom
   - Importação automática de turmas e alunos
   - Exportação de notas

9. **Multi-tenancy:**
   - Suporte a múltiplas instituições
   - Isolamento de dados por organização
   - Planos por instituição

10. **Monitoramento e Observabilidade:**
    - Integração com Sentry ou similar
    - Métricas de performance (APM)
    - Alertas automáticos para erros críticos

11. **Testes Automatizados:**
    - Testes unitários para serviços e repositórios
    - Testes de integração para API Routes
    - Testes E2E com Playwright ou Cypress

12. **Otimizações de Performance:**
    - Lazy loading de componentes pesados
    - Paginação em listas grandes
    - Virtual scrolling para tabelas
    - Otimização de imagens (Next.js Image)

---

## 8. Revisão e Análise Crítica

### Inconsistências Entre Código e Documentação

1. **Armazenamento de Arquivos:**
   - **Documentado**: Sistema de arquivos local (`public/uploads/`)
   - **Implementado**: MongoDB GridFS (`lib/fileStorage.js`)
   - **Impacto**: A documentação está desatualizada. O sistema já migrou para GridFS, que é mais adequado para serverless, mas não está documentado.

2. **Sistema de Créditos:**
   - **Documentado**: Sistema abolido, código não utilizado
   - **Implementado**: Ainda ativo em `app/api/[[...path]]/route.js` (linhas 55-69)
   - **Impacto**: Créditos são criados no registro de novos usuários, mas não são utilizados no processamento de correções. Há inconsistência entre rotas.

3. **Rotas de Autenticação Duplicadas:**
   - **Documentado**: Endpoint único `/api/auth/login`
   - **Implementado**: Duas implementações:
     - `/api/auth/login/route.js` (simples, sem rate limiting)
     - `app/api/[[...path]]/route.js` (completa, com rate limiting e auditoria)
   - **Impacto**: Comportamento diferente dependendo da rota utilizada. O catch-all route parece ser uma versão mais completa.

4. **Lógica de Upload Duplicada:**
   - **Documentado**: Endpoint único `/api/correcoes`
   - **Implementado**: Duas implementações:
     - `/api/correcoes/route.js` (salva em sistema de arquivos local)
     - `app/api/[[...path]]/route.js` (salva em GridFS)
   - **Impacto**: Duas rotas com comportamentos diferentes. A rota catch-all usa GridFS, a rota específica usa sistema de arquivos.

5. **Sistema de Trial e Assinaturas:**
   - **Documentado**: Não mencionado
   - **Implementado**: Sistema completo de trial de 7 dias e assinaturas (free/premium)
   - **Impacto**: Funcionalidade crítica não documentada. O sistema verifica trial/assinatura antes de processar uploads.

6. **Catch-All Route:**
   - **Documentado**: Não mencionado
   - **Implementado**: `app/api/[[...path]]/route.js` - rota catch-all que centraliza múltiplos endpoints
   - **Impacto**: Arquitetura importante não documentada. Esta rota parece ser uma versão consolidada/legacy de múltiplas rotas.

7. **FileService Não Utilizado:**
   - **Documentado**: Não mencionado
   - **Implementado**: `lib/services/FileService.js` existe mas não é usado
   - **Impacto**: Código morto que pode causar confusão.

### Decisões Implícitas Não Documentadas

1. **Sistema de Trial de 7 Dias:**
   - Novos usuários recebem 7 dias de acesso gratuito
   - Trial é calculado a partir de `trialStartedAt` ou `createdAt`
   - Após expiração, usuário precisa de assinatura premium
   - Implementado em: `app/api/[[...path]]/route.js` (linhas 1038-1053)

2. **Sistema de Assinaturas:**
   - Dois níveis: `free` (trial) e `premium`
   - Campo `assinatura` no modelo de usuário
   - Verificação de acesso baseada em assinatura antes de processar uploads
   - Implementado em múltiplos endpoints

3. **GridFS para Armazenamento:**
   - Decisão arquitetural de usar GridFS em vez de sistema de arquivos
   - Bucket nomeado `images` no MongoDB
   - Acesso via endpoint `/api/images/[id]` com autenticação
   - Suporte a múltiplos tipos MIME (imagens e PDFs)

4. **Verificação de Email:**
   - Sistema de verificação de email implementado
   - Tokens de verificação com expiração de 24h
   - Endpoint `/api/auth/verify-email`
   - Não é obrigatório para login (não bloqueia acesso)

5. **Rate Limiting para Registro:**
   - Além de login, registro também tem rate limiting
   - Limite: 3 tentativas em 60 minutos
   - Implementado em: `app/api/[[...path]]/route.js` (linhas 23-28)

6. **Auditoria de Ações:**
   - Logs de auditoria para ações críticas (login, registro, etc.)
   - Collection `logs_auditoria` no MongoDB
   - Registra IP, user-agent, timestamp
   - Implementado via `logAudit()` em `lib/api-handlers.js`

7. **OAuth Google com State Validation:**
   - Proteção CSRF via state parameter
   - State codificado em base64 com timestamp
   - Validação de expiração (10 minutos)
   - Implementado em: `app/api/auth/google/callback/route.js`

8. **Duas Estratégias de Armazenamento:**
   - GridFS (usado no catch-all route)
   - Sistema de arquivos local (usado em `/api/correcoes/route.js`)
   - Decisão implícita: manter compatibilidade ou migração gradual?

### Melhorias Arquiteturais (Sem Alterar Comportamento)

1. **Consolidação de Rotas:**
   - **Problema**: Rotas duplicadas com comportamentos diferentes
   - **Solução**: Unificar lógica em um único endpoint, manter outras como wrappers
   - **Benefício**: Reduz confusão, facilita manutenção, garante comportamento consistente
   - **Implementação**: Criar camada de serviço compartilhada, rotas específicas chamam o serviço

2. **Abstração de Armazenamento de Arquivos:**
   - **Problema**: Lógica de GridFS e sistema de arquivos espalhada
   - **Solução**: Criar interface `FileStorage` com implementações `GridFSStorage` e `LocalStorage`
   - **Benefício**: Facilita migração futura, permite testes, reduz acoplamento
   - **Implementação**: Factory pattern para escolher estratégia baseada em configuração

3. **Serviço de Assinaturas:**
   - **Problema**: Lógica de trial/assinatura duplicada em múltiplos lugares
   - **Solução**: Criar `SubscriptionService` centralizado
   - **Benefício**: Single source of truth, fácil adicionar novos planos, testes isolados
   - **Implementação**: 
     ```javascript
     class SubscriptionService {
       isTrialActive(user)
       hasAccess(user)
       getRemainingDays(user)
       checkAccess(user) // throws if no access
     }
     ```

4. **Remoção de Código Morto:**
   - **Problema**: `FileService`, `route.old.js`, referências a créditos não utilizados
   - **Solução**: Remover ou documentar como deprecated
   - **Benefício**: Reduz confusão, facilita onboarding, melhora manutenibilidade
   - **Implementação**: Audit completo de imports não utilizados, remover arquivos obsoletos

5. **Validação de Schema com Zod:**
   - **Problema**: Validação manual espalhada, sem type safety
   - **Solução**: Schemas Zod para requests/responses
   - **Benefício**: Validação automática, type safety, documentação implícita
   - **Implementação**: 
     ```javascript
     const UploadSchema = z.object({
       gabaritoId: z.string().uuid(),
       turmaId: z.string().uuid(),
       // ...
     });
     ```

6. **Cache de Dados Frequentes:**
   - **Problema**: Queries repetidas para turmas, alunos, gabaritos
   - **Solução**: Cache em memória (ou Redis) com TTL
   - **Benefício**: Reduz carga no MongoDB, melhora performance
   - **Implementação**: Wrapper em repositórios com cache layer

7. **Índices MongoDB:**
   - **Problema**: Queries sem índices explícitos (exceto script)
   - **Solução**: Garantir índices em campos frequentemente consultados
   - **Benefício**: Performance significativamente melhor
   - **Implementação**: 
     - `users`: índice em `email`, `id`
     - `avaliacoes_corrigidas`: índice em `userId`, `validado`, `createdAt`
     - `turmas`: índice em `userId`
     - `alunos`: índice em `turmaId`

8. **Error Handling Centralizado:**
   - **Problema**: Tratamento de erro inconsistente, mensagens genéricas
   - **Solução**: Classe `AppError` customizada, handler global
   - **Benefício**: Erros consistentes, melhor debugging, melhor UX
   - **Implementação**: 
     ```javascript
     class AppError extends Error {
       constructor(message, statusCode, code) {
         super(message);
         this.statusCode = statusCode;
         this.code = code;
       }
     }
     ```

9. **Separação de Concerns em Upload:**
   - **Problema**: Lógica de upload, validação, processamento e persistência misturadas
   - **Solução**: Separar em handlers específicos
   - **Benefício**: Código mais testável, reutilizável, fácil de entender
   - **Implementação**: 
     - `UploadValidator`: valida arquivo
     - `FileStorage`: salva arquivo
     - `GradingProcessor`: processa correção
     - `AssessmentRepository`: persiste resultado

10. **Configuração Centralizada:**
    - **Problema**: Constantes e configurações espalhadas
    - **Solução**: Arquivo `config.js` centralizado
    - **Benefício**: Fácil alterar limites, adicionar novos planos
    - **Implementação**: 
      ```javascript
      export const config = {
        trial: { days: 7 },
        fileUpload: { maxSizeMB: 10, allowedTypes: [...] },
        rateLimit: { login: { max: 5, window: 15 }, ... }
      };
      ```

11. **Type Safety com TypeScript:**
    - **Problema**: JavaScript puro, erros em runtime
    - **Solução**: Migração gradual para TypeScript
    - **Benefício**: Catch errors em compile time, melhor autocomplete, documentação implícita
    - **Implementação**: Começar com tipos para modelos de dados, depois services, depois API routes

12. **Testes de Integração:**
    - **Problema**: Sem testes, mudanças podem quebrar funcionalidades
    - **Solução**: Testes para fluxos críticos (upload, correção, autenticação)
    - **Benefício**: Confiança em refatorações, documentação viva
    - **Implementação**: Jest + Supertest para API routes, mocks para Vertex AI

---

## Conclusão

O CorregIA é uma plataforma bem estruturada que utiliza tecnologias modernas para resolver um problema real na educação. A arquitetura baseada em Next.js permite desenvolvimento rápido e deployment simplificado, enquanto a integração com Vertex AI oferece capacidades avançadas de OCR e correção.

**Principais Descobertas da Revisão:**

1. O sistema já utiliza GridFS para armazenamento (não sistema de arquivos local como documentado)
2. Existe sistema de trial e assinaturas não documentado
3. Há rotas duplicadas com comportamentos diferentes que precisam ser consolidadas
4. Código morto (FileService, route.old.js) precisa ser removido
5. Lógica de negócio (trial, assinaturas) está duplicada e deveria estar em serviços

**Prioridades de Melhoria:**

1. **Alta**: Consolidar rotas duplicadas e remover código morto
2. **Alta**: Documentar sistema de trial e assinaturas
3. **Média**: Criar serviços centralizados (SubscriptionService, abstração de FileStorage)
4. **Média**: Adicionar índices MongoDB e cache
5. **Baixa**: Migração gradual para TypeScript e testes

A base arquitetural é sólida e permite evoluções naturais, mas precisa de consolidação e limpeza para facilitar manutenção futura.
