# 🔍 Auditoria Técnica — CorrijaPRO `feature/v0.3.3`

> **Data:** 2026-04-20
> **Branch auditada:** `feature/v0.3.3`
> **Auditor:** Claude Code (Staff Engineer AI)

---

## 📌 1. Resumo do SaaS

**CorrijaPRO** é uma plataforma SaaS B2B para professores corrigirem provas com IA (Vertex AI / Gemini). Fluxo: cadastro → upload de provas → correção automática → analytics por turma. Modelo freemium (7 dias trial → plano Pro R$79/mês ou R$59/mês anual). Stack: Next.js App Router, MongoDB, JWT, Vertex AI, Resend.

---

## ❌ 2. Tasks (Problemas Encontrados)

---

### 🔴 TASK-01 — Promoção a Admin via Email Hardcoded no Cadastro

**Severidade: CRÍTICO**
**Arquivo:** `app/api/auth/register/route.js:25` + `lib/constants.js:13`

**Descrição:**
```js
// lib/constants.js
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@corrijapro.com.br';

// register/route.js
const isAdmin = email === ADMIN_EMAIL ? 1 : 0;
```

Qualquer pessoa que se cadastre com `admin@corrijapro.com.br` (ou o email configurado via env) recebe `isAdmin: 1` **automaticamente**, sem nenhuma confirmação adicional. Se `ADMIN_EMAIL` não estiver configurado em produção, o email padrão `admin@corrijapro.com.br` é admin por default — e qualquer pessoa pode criar essa conta se ainda não existir.

**Impacto:** Escalada de privilégios total. Um atacante pode ganhar acesso de administrador (incluindo Gemini API Key) com um simples cadastro.

**Como Resolver:**
```js
// Remover lógica de isAdmin do cadastro. Sempre criar como usuário comum:
const isAdmin = 0;
```
Fazer seed inicial do admin diretamente no banco, fora do fluxo de cadastro público.

---

### 🔴 TASK-02 — JWT Armazenado em localStorage (XSS Risk)

**Severidade: CRÍTICO**
**Arquivos:** `components/sections/AnalyticsSection.jsx:60`, `components/sections/ConfiguracoesSection.jsx:42` (e demais componentes)

**Descrição:**
```js
const token = localStorage.getItem('token');
```
Esse padrão se repete em todos os componentes que fazem fetch autenticado.

`localStorage` é acessível por qualquer script na página. Um ataque XSS pode roubar o token e se autenticar como o usuário.

**Impacto:** Comprometimento total de contas de usuários e administradores.

**Como Resolver:**
Migrar para `httpOnly` cookies gerenciados pelo servidor:
```js
// No login, retornar cookie httpOnly em vez de token no body:
response.cookies.set('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7
});
```
Remover `localStorage.getItem('token')` de todos os componentes. As requisições `fetch` passariam credenciais via `credentials: 'include'`.

---

### 🔴 TASK-03 — Sem Rate Limiting no Endpoint de Login

**Severidade: ALTO**
**Arquivo:** `app/api/auth/login/route.js`

**Descrição:**
O endpoint `/api/auth/login` não tem nenhuma chamada a `checkRateLimit` ou `registerAttempt`. O sistema tem a infraestrutura pronta em `lib/api-handlers.js:71` (usada no `/api/admin/add`), mas não foi aplicada no login.

**Impacto:** Brute force ilimitado de senhas. Um atacante pode tentar milhares de combinações sem ser bloqueado.

**Como Resolver:**
```js
import { checkRateLimit, registerAttempt } from '@/lib/api-handlers';

export async function POST(request) {
  const { email, password } = await request.json();

  const rateLimit = await checkRateLimit(request, email, 'login', 10, 15);
  if (rateLimit.blocked) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente mais tarde.' },
      { status: 429 }
    );
  }

  await registerAttempt(request, email, 'login');
  // ... resto do login
}
```

---

### 🔴 TASK-04 — BUG: Gemini API Key Nunca Carrega nas Configurações

**Severidade: ALTO**
**Arquivos:** `app/api/settings/route.js:12`, `components/sections/ConfiguracoesSection.jsx:65`

**Descrição:**
```js
// settings/route.js — retorna objeto aninhado:
return NextResponse.json({
  settings: settings || { geminiApiKey: '' }
});

// ConfiguracoesSection.jsx — acessa propriedade errada:
geminiApiKey: data.geminiApiKey || ''  // deveria ser data.settings.geminiApiKey
```

A API key do Gemini nunca é carregada no frontend. O admin não consegue ver nem editar a chave configurada.

**Como Resolver:**
```js
// Opção A — corrigir o frontend (1 linha):
geminiApiKey: data.settings?.geminiApiKey || ''
```

---

### 🟠 TASK-05 — Validação de Senha Apenas no Frontend

**Severidade: ALTO**
**Arquivo:** `app/api/auth/register/route.js`

**Descrição:**
A validação de 6 caracteres mínimos existe apenas em `components/auth/AuthModal.js:36`. O backend não valida comprimento, força ou formato de senha. Uma requisição direta à API pode criar contas com senha `"a"` ou vazia.

**Como Resolver:**
```js
// No backend, antes de hashPassword:
if (!password || password.length < 8) {
  return NextResponse.json(
    { error: 'Senha deve ter no mínimo 8 caracteres.' },
    { status: 400 }
  );
}
```

---

### 🟠 TASK-06 — Token de Verificação de Email sem `userId`

**Severidade: MÉDIO**
**Arquivo:** `lib/auth.js:54`

**Descrição:**
```js
export function generateVerificationToken() {
  return jwt.sign(
    { type: 'email_verification', timestamp: Date.now() }, // ← sem userId
    SECRET_KEY,
    { expiresIn: '24h' }
  );
}
```
O token não identifica qual usuário deve ser verificado. A verificação depende completamente do lookup no banco. Possível edge case de reuso entre usuários.

**Como Resolver:**
```js
export function generateVerificationToken(userId) {
  return jwt.sign(
    { userId, type: 'email_verification' },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
}
```
Atualizar chamada em `register/route.js`:
```js
const verificationToken = generateVerificationToken(userId);
```

---

### 🟠 TASK-07 — Rota `/api/plano/status` Sem Arquivo Explícito

**Severidade: MÉDIO**
**Arquivo:** `components/sections/ConfiguracoesSection.jsx:41`

**Descrição:**
```js
const response = await fetch('/api/plano/status', { ... });
```
Não existe `app/api/plano/status/route.js`. A rota pode estar no catch-all `app/api/[[...path]]/route.js`, mas não confirmado. Se retornar 404, o card de plano e o `PaywallModal` nunca aparecem — o usuário não consegue assinar o plano Premium.

**Como Resolver:** Criar `app/api/plano/status/route.js` explicitamente ou confirmar e documentar que o catch-all trata esse endpoint.

---

### 🟠 TASK-08 — Sem Validação de Formato de Email no Backend

**Severidade: MÉDIO**
**Arquivo:** `app/api/auth/register/route.js`

**Descrição:**
O backend não valida o formato do email antes de inserir no banco. Emails inválidos (`teste@`, `abc`, `@dominio.com`) são aceitos, nunca receberão verificação e geram lixo no banco.

**Como Resolver:**
```js
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email.trim())) {
  return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 });
}
```

---

### 🟡 TASK-09 — Email Não Verificado Não Bloqueia Uso da Plataforma

**Severidade: MÉDIO**
**Arquivo:** `app/api/auth/register/route.js:62`

**Descrição:**
O token JWT é retornado imediatamente após o cadastro, independente da verificação de email. O campo `emailVerified: false` existe no banco mas não é verificado em nenhum endpoint protegido. Permite criação de contas spam que consomem recursos (correções, analytics).

**Como Resolver:**
Adicionar verificação `emailVerified` em `requireAuth` ou criar middleware `requireVerifiedEmail` aplicado nos endpoints de uso (`/api/correcoes`, `/api/avaliacoes`, etc.).

---

### 🟡 TASK-10 — Testimonials com Imagens Inexistentes (404)

**Severidade: BAIXO**
**Arquivo:** `components/landing/TestimonialsSection.js:8`

**Descrição:**
```js
image: "/imagens/placeholder-1.jpg" // arquivo não existe no projeto
```
As imagens não estão no projeto. Resultam em requisições 404 (o componente não renderiza as imagens, então sem impacto visual visível, mas gera ruído nos logs).

---

### 🟡 TASK-11 — Links Mortos no Footer

**Severidade: BAIXO**
**Arquivo:** `components/landing/Footer.js:43`

**Descrição:**
```js
<a href="#">Instagram</a>
<a href="#">LinkedIn</a>
```
Links de redes sociais apontam para `#`. Além disso, as rotas `/termos` e `/privacidade` podem não existir, o que é um problema de compliance LGPD em produção.

---

### 🟡 TASK-12 — Comparação `isAdmin === 1` Frágil

**Severidade: BAIXO**
**Arquivo:** `components/sections/ConfiguracoesSection.jsx:102`

**Descrição:**
```js
const isAdmin = user?.isAdmin === 1; // falha se isAdmin for true (boolean)
```
Se `isAdmin` for salvo como boolean em alguma migration futura, a comparação estrita com `1` falharia silenciosamente, ocultando o painel de admin.

**Como Resolver:**
```js
const isAdmin = !!user?.isAdmin;
```

---

## 🧪 3. Cenários de Teste

### 🧪 Teste 1 — Escalada de Privilégios via Cadastro
- **Usuário:** Atacante externo
- **Entrada:** `email: "admin@corrijapro.com.br"`, senha qualquer
- **Ação:** `POST /api/auth/register`
- **Resultado esperado:** Conta criada como usuário comum
- **Falha atual:** ❌ Conta criada com `isAdmin: 1`. Atacante tem acesso total ao painel admin.

### 🧪 Teste 2 — Brute Force de Senha
- **Usuário:** Atacante externo
- **Entrada:** Email de professor real, lista de senhas comuns
- **Ação:** `POST /api/auth/login` em loop automatizado
- **Resultado esperado:** Bloqueio após 10 tentativas
- **Falha atual:** ❌ Sem rate limiting. Brute force ilimitado.

### 🧪 Teste 3 — Roubo de Token via XSS
- **Usuário:** Atacante com script injetado
- **Ação:** `localStorage.getItem('token')` via script malicioso
- **Resultado esperado:** Token inacessível (httpOnly cookie)
- **Falha atual:** ❌ Token exposto em localStorage.

### 🧪 Teste 4 — Acesso Cross-Tenant a Analytics
- **Usuário:** Professor A logado
- **Entrada:** `turmaId` de turma do Professor B
- **Ação:** `GET /api/analytics/turma/{turmaIdDoB}`
- **Resultado esperado:** 404 (turma não pertence ao Professor A)
- **Status atual:** ✅ Protegido. Queries corretamente escopadas por `userId`.

### 🧪 Teste 5 — Uso da Plataforma sem Verificar Email
- **Usuário:** Usuário recém-cadastrado (email não verificado)
- **Ação:** `POST /api/correcoes` usando token JWT do registro
- **Resultado esperado:** 403 — email não verificado
- **Falha atual:** ❌ Acesso liberado.

### 🧪 Teste 6 — API Key Gemini Nunca Exibida para Admin
- **Usuário:** Admin logado
- **Ação:** Acessar Configurações → seção Admin
- **Resultado esperado:** Campo "Gemini API Key" preenchido com a chave salva
- **Falha atual:** ❌ Campo sempre vazio (bug TASK-04).

### 🧪 Teste 7 — Registro com Senha Fraca via API Direta
- **Usuário:** Atacante
- **Ação:** `curl -X POST /api/auth/register` com `password: "a"`
- **Resultado esperado:** 400 — senha muito fraca
- **Falha atual:** ❌ Conta criada normalmente.

### 🧪 Teste 8 — Visualização de Status do Plano
- **Usuário:** Usuário free em trial
- **Ação:** Acessar Configurações, visualizar status do plano
- **Resultado esperado:** Card com dias restantes e botão de assinar
- **Falha atual:** ⚠️ Provável 404 em `/api/plano/status` — card não aparece.

---

## 📊 4. Validação Final

### ❌ Alto Risco — Não Pronto para Produção

| Área | Status | Observação |
|------|--------|------------|
| Autenticação | ❌ | localStorage JWT + sem rate limit no login |
| Autorização / Roles | ❌ | Admin determinado por email no cadastro |
| Validação Backend | ❌ | Senha e email sem validação no servidor |
| Multi-Tenant (dados) | ✅ | Queries corretamente escopadas por `userId` |
| Billing / Plano | ⚠️ | Rota de status possivelmente inexistente |
| Bugs Funcionais | ❌ | Gemini API Key nunca carrega |
| SEO / Landing | ✅ | Metadata completa, OpenGraph OK |
| Performance | ✅ | Debounce, AbortController, Promise.all |

---

### Prioridade de Correção

| Prioridade | Task | Esforço Estimado |
|---|---|---|
| 🔴 P0 | TASK-01 — Admin via email hardcoded | Pequeno |
| 🔴 P0 | TASK-03 — Rate limit no login | Pequeno |
| 🔴 P0 | TASK-04 — BUG geminiApiKey (1 linha) | Trivial |
| 🔴 P1 | TASK-02 — localStorage JWT → httpOnly cookie | Médio/Grande |
| 🟠 P1 | TASK-05 — Validação de senha no backend | Pequeno |
| 🟠 P2 | TASK-06 — userId no token de verificação | Pequeno |
| 🟠 P2 | TASK-07 — Rota plano/status | Pequeno |
| 🟠 P2 | TASK-08 — Validação de email no backend | Pequeno |
| 🟡 P3 | TASK-09 — Gate de email verificado | Médio |
| 🟡 P3 | TASK-12 — isAdmin comparison | Trivial |
