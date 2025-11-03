# 🏗️ Arquitetura em Camadas - Corretor 80/20

## 📋 Visão Geral

O backend foi completamente refatorado para seguir o padrão **Layered Architecture (Arquitetura em Camadas)**, separando responsabilidades em 3 camadas distintas:

```
┌─────────────────────────────────────────┐
│         Controller Layer                │
│   (API Routes - HTTP Handling)          │
│   • Validação de entrada                │
│   • Autenticação/Autorização            │
│   • Resposta HTTP                       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Service Layer                    │
│   (Business Logic)                       │
│   • Orquestração de operações           │
│   • Regras de negócio                   │
│   • Chamadas a APIs externas            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Repository Layer                 │
│   (Data Access)                          │
│   • CRUD operations                      │
│   • Queries ao MongoDB                   │
│   • Abstração do banco                   │
└─────────────────────────────────────────┘
```

---

## 1️⃣ Repository Layer (`lib/repositories/`)

**Responsabilidade:** Acesso exclusivo aos dados (MongoDB)

### Estrutura:

```
lib/repositories/
├── BaseRepository.js           # Classe base com operações CRUD
├── UserRepository.js           # Operações de usuários
├── CreditRepository.js         # Operações de créditos
├── TransactionRepository.js    # Histórico de transações
├── GabaritoRepository.js       # Gabaritos
├── AvaliacaoRepository.js      # Avaliações
├── SettingsRepository.js       # Configurações
├── TurmaRepository.js          # Turmas
├── AlunoRepository.js          # Alunos
├── PerfilAvaliacaoRepository.js # Perfis de avaliação
└── NotificacaoRepository.js    # Notificações
```

### Exemplo de Uso:

```javascript
// ❌ ANTES (Controller com acesso direto ao DB)
const { db } = await connectToDatabase();
const user = await db.collection('users').findOne({ email });

// ✅ DEPOIS (Controller usa Repository)
const user = await UserRepository.findByEmail(email);
```

### Benefícios:
- ✅ **Single Responsibility**: Repositório só cuida de dados
- ✅ **Reusabilidade**: Métodos podem ser usados em múltiplos serviços
- ✅ **Testabilidade**: Fácil de mockar em testes
- ✅ **Manutenção**: Mudanças no schema afetam só o repositório

---

## 2️⃣ Service Layer (`lib/services/`)

**Responsabilidade:** Lógica de negócio e orquestração

### Estrutura:

```
lib/services/
├── AuthService.js              # Autenticação e registro
├── CreditService.js            # Gestão de créditos
├── GabaritoService.js          # Lógica de gabaritos
├── PerfilAvaliacaoService.js   # Perfis de avaliação + IA
├── TurmaService.js             # Gestão de turmas
├── AlunoService.js             # Gestão de alunos
├── GradingService.js           # Processo completo de correção
├── SettingsService.js          # Configurações
├── NotificationService.js      # Sistema de notificações
└── FileService.js              # Upload e gerenciamento de arquivos
```

### Exemplo - AuthService:

```javascript
// Lógica complexa encapsulada
async registerUser(email, password, name) {
  // 1. Validar se usuário existe
  const existingUser = await UserRepository.findByEmail(email);
  if (existingUser) throw new Error('Email already registered');

  // 2. Criar usuário
  const userId = uuidv4();
  const hashedPassword = hashPassword(password);
  await UserRepository.createUser({...});

  // 3. Criar créditos iniciais (chama outro serviço)
  await CreditService.createInitialCredits(userId);

  // 4. Gerar token
  return { token: generateToken(userId), user: {...} };
}
```

### Exemplo - GradingService:

```javascript
// Orquestração complexa de múltiplos repositórios
async submitForGrading(userId, uploadData) {
  // 1. Validar entidades
  const gabarito = await GabaritoRepository.findByIdAndUserId(...);
  const turma = await TurmaRepository.findByIdAndUserId(...);
  const aluno = await AlunoRepository.findByIdAndTurmaId(...);

  // 2. Debitar créditos (chama outro serviço)
  await CreditService.debitCredits(userId, 3, 'Correção de prova');

  // 3. Criar registro de avaliação
  await AvaliacaoRepository.createAvaliacao({...});

  // 4. Chamar webhook N8N
  await fetch(webhookUrl, {...});

  return { success: true, assessmentId };
}
```

### Benefícios:
- ✅ **Coesão Alta**: Cada serviço tem uma responsabilidade clara
- ✅ **Baixo Acoplamento**: Serviços são independentes
- ✅ **Reusabilidade**: Métodos podem ser chamados de múltiplos controllers
- ✅ **Testabilidade**: Lógica de negócio isolada e testável

---

## 3️⃣ Controller Layer (`app/api/[[...path]]/route.js`)

**Responsabilidade:** Lidar com HTTP (request/response)

### Estrutura Refatorada:

```javascript
// ❌ ANTES: 900+ linhas com lógica misturada

// ✅ DEPOIS: Controllers limpos e focados
async function handleLogin(request) {
  try {
    // 1. Extrair dados da requisição
    const { email, password } = await request.json();

    // 2. Validação básica
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 3. Chamar serviço
    const result = await AuthService.loginUser(email, password);

    // 4. Retornar resposta
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
```

### Redução de Linhas:

| Controller | ANTES | DEPOIS | Redução |
|------------|-------|--------|---------|
| handleRegister | ~40 linhas | ~12 linhas | **70%** |
| handleUpload | ~80 linhas | ~25 linhas | **69%** |
| handleGetAvaliacoes | ~25 linhas | ~8 linhas | **68%** |

### Benefícios:
- ✅ **Simples e Legível**: Código fácil de entender
- ✅ **Focado**: Apenas HTTP handling
- ✅ **Manutenível**: Mudanças na lógica não afetam o controller
- ✅ **Testável**: Pode testar endpoints separadamente

---

## 📊 Comparação: Antes vs Depois

### ❌ **ANTES** (Código Monolítico)

```javascript
// route.js - 900+ linhas
async function handleUpload(request) {
  const { db } = await connectToDatabase();
  
  // Verificar créditos (lógica de negócio)
  const credits = await db.collection('creditos').findOne({ userId });
  if (!credits || credits.saldoAtual < 3) {
    return NextResponse.json({ error: 'Insufficient credits' });
  }

  // Buscar settings (acesso ao DB)
  const settings = await db.collection('settings').findOne({ userId });
  
  // Debitar créditos (lógica de negócio)
  await db.collection('creditos').updateOne(
    { userId },
    { $inc: { saldoAtual: -3 } }
  );

  // Log de transação (acesso ao DB)
  await db.collection('transacoes_creditos').insertOne({...});

  // Verificar gabarito (acesso ao DB)
  const gabarito = await db.collection('gabaritos').findOne({...});

  // ... mais 50 linhas de lógica misturada
}
```

**Problemas:**
- ❌ Múltiplas responsabilidades em um só lugar
- ❌ Difícil de testar (precisa mockar banco inteiro)
- ❌ Difícil de manter (mudanças afetam tudo)
- ❌ Código duplicado em vários handlers

---

### ✅ **DEPOIS** (Arquitetura em Camadas)

```javascript
// Controller - route.js (~20 linhas)
async function handleUpload(request) {
  try {
    const userId = requireAuth(request);
    const formData = await request.formData();
    
    // Validação
    if (!file || !gabaritoId || !turmaId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Salvar arquivo
    const fileData = await FileService.saveUploadedImage(file);

    // Submeter para correção (lógica no serviço)
    const result = await GradingService.submitForGrading(userId, {
      gabaritoId, turmaId, alunoId, periodo,
      imageUrl: fileData.relativeUrl,
      fullImageUrl: fileData.fullUrl
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

// Service - GradingService.js
async submitForGrading(userId, uploadData) {
  // Validações
  const gabarito = await GabaritoRepository.findByIdAndUserId(...);
  const turma = await TurmaRepository.findByIdAndUserId(...);
  
  // Débito de créditos
  await CreditService.debitCredits(userId, 3, 'Correção');
  
  // Criar avaliação
  await AvaliacaoRepository.createAvaliacao({...});
  
  // Chamar N8N
  await fetch(webhookUrl, {...});
  
  return { success: true, assessmentId };
}

// Repository - CreditRepository.js
async updateBalance(userId, amount) {
  return await this.updateOne(
    { userId },
    { $inc: { saldoAtual: amount } }
  );
}
```

**Vantagens:**
- ✅ Cada camada tem uma responsabilidade clara
- ✅ Código reutilizável entre diferentes endpoints
- ✅ Fácil de testar (mocka apenas a camada necessária)
- ✅ Fácil de manter (mudanças isoladas)
- ✅ Código mais limpo e legível

---

## 🎯 Princípios Aplicados

### 1. **Single Responsibility Principle (SRP)**
Cada classe/módulo tem uma única responsabilidade:
- **Repository**: Apenas acesso a dados
- **Service**: Apenas lógica de negócio
- **Controller**: Apenas handling HTTP

### 2. **Dependency Inversion Principle (DIP)**
Controllers dependem de abstrações (Services), não de implementações (DB):
```javascript
// Controller não sabe que existe MongoDB
const user = await AuthService.loginUser(email, password);
```

### 3. **Don't Repeat Yourself (DRY)**
Lógica reutilizada através de serviços:
```javascript
// CreditService usado em múltiplos lugares
await CreditService.debitCredits(userId, 3, 'Correção');
await CreditService.creditCredits(userId, 100, 'Compra');
```

### 4. **Separation of Concerns**
Cada camada cuida de sua preocupação específica:
- **Controller**: HTTP
- **Service**: Negócio
- **Repository**: Dados

---

## 📈 Métricas de Melhoria

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Linhas no Controller | 900+ | 400 | **56% redução** |
| Responsabilidades por arquivo | 5-7 | 1-2 | **Coesão alta** |
| Acoplamento | Alto | Baixo | **Independência** |
| Testabilidade | Difícil | Fácil | **Unit tests** |
| Manutenibilidade | Baixa | Alta | **Isolamento** |
| Reusabilidade | Baixa | Alta | **DRY** |

---

## 🧪 Testes Realizados

### Endpoints Testados:
- ✅ POST `/api/auth/login` → AuthService
- ✅ GET `/api/credits` → CreditService
- ✅ GET `/api/turmas` → TurmaService
- ✅ GET `/api/gabaritos` → GabaritoService
- ✅ GET `/api/avaliacoes/pendentes` → GradingService
- ✅ POST `/api/upload` → GradingService + FileService

### Resultado:
```
✅ Todos os endpoints funcionando
✅ Frontend 100% operacional
✅ Lógica de negócio isolada
✅ Acesso a dados abstraído
```

---

## 🔄 Fluxo de Exemplo: Upload de Prova

```
1. Controller (route.js)
   ↓ Extrai dados do FormData
   ↓ Valida campos obrigatórios
   ↓ Chama FileService.saveUploadedImage()
   ↓ Chama GradingService.submitForGrading()

2. GradingService
   ↓ Valida gabarito (GabaritoRepository)
   ↓ Valida turma (TurmaRepository)
   ↓ Valida aluno (AlunoRepository)
   ↓ Debita créditos (CreditService)
   ↓ Cria avaliação (AvaliacaoRepository)
   ↓ Chama webhook N8N

3. CreditService
   ↓ Verifica saldo (CreditRepository)
   ↓ Atualiza saldo (CreditRepository)
   ↓ Loga transação (TransactionRepository)

4. Repositories
   ↓ Executam queries no MongoDB
   ↓ Retornam dados para Services
```

---

## 🚀 Benefícios para o Projeto

### 1. **Manutenibilidade**
- Mudanças no MongoDB? Afeta apenas Repositories
- Mudanças na lógica de créditos? Afeta apenas CreditService
- Novo endpoint? Adiciona handler no Controller

### 2. **Escalabilidade**
- Fácil adicionar novos serviços
- Fácil adicionar novos repositories
- Fácil trocar banco de dados (só muda repositories)

### 3. **Testabilidade**
```javascript
// Testar Service sem DB real
const mockRepository = {
  findByEmail: jest.fn().mockResolvedValue(null)
};
await AuthService.registerUser('test@test.com', 'pass', 'Test');
```

### 4. **Colaboração**
- Time pode trabalhar em camadas diferentes simultaneamente
- Responsabilidades claras facilitam code review
- Menos conflitos em git (arquivos menores e focados)

---

## 📝 Próximos Passos

### Possíveis Melhorias:
1. **DTOs (Data Transfer Objects)**: Validação de entrada com Zod
2. **Error Handling**: Classes de erro customizadas
3. **Logging**: Winston ou Pino para logs estruturados
4. **Caching**: Redis para dados frequentes
5. **Unit Tests**: Jest para testar cada camada
6. **Documentation**: Swagger/OpenAPI para API docs

---

## ✅ Conclusão

A refatoração para Arquitetura em Camadas trouxe:
- ✅ **Código mais limpo e organizado**
- ✅ **Alta coesão e baixo acoplamento**
- ✅ **Fácil manutenção e evolução**
- ✅ **Melhor testabilidade**
- ✅ **Reutilização de código**
- ✅ **Separação clara de responsabilidades**

**O sistema está pronto para escalar e evoluir de forma sustentável! 🎉**
