# Documento de Erros Encontrados - CorregIA

Este documento lista todos os erros identificados no código do projeto, organizados por área de atuação.

**Data de Criação:** 2024  
**Última Atualização:** 2024

---

## 1. Erros Críticos de Lógica e Execução

### 1.1. Variável Usada Antes de Ser Definida

**Localização:** `app/api/[[...path]]/route.js`, linha 493

**Erro:**
```javascript
const analisePedagogica = correcaoData.analise_pedagogica || {};
```

**Problema:** A variável `correcaoData` está sendo acessada na linha 493, mas só é definida na linha 646, após a chamada à API do Vertex AI. Isso causará um erro de referência (`ReferenceError`) em tempo de execução.

**Impacto:** CRÍTICO - O upload de provas dissertativas falhará com erro de referência.

**Solução:** Mover a linha 493 para após a linha 653, onde `correcaoData` é definido e validado.

---

### 1.2. Variáveis Não Utilizadas

**Localização:** 
- `app/api/[[...path]]/route.js`, linha 875
- `app/api/correcoes/route.js`, linhas 158 e 431

**Erro:**
```javascript
const transactionId = uuidv4();
```

**Problema:** A variável `transactionId` é criada mas nunca utilizada no código. Comentários indicam que o sistema de créditos foi abolido, mas a variável ainda é criada.

**Impacto:** BAIXO - Não causa erro, mas indica código morto.

**Solução:** Remover a criação da variável ou implementar seu uso se necessário.

---

### 1.3. Sistema de Créditos Ainda Sendo Criado

**Localização:** `app/api/[[...path]]/route.js`, linhas 55-69

**Erro:**
```javascript
await db.collection('creditos').insertOne({
  id: uuidv4(),
  userId,
  saldoAtual: 1000,
  createdAt: new Date()
});

await db.collection('transacoes_creditos').insertOne({
  id: uuidv4(),
  userId,
  tipo: 'credito',
  quantidade: 1000,
  descricao: 'Créditos iniciais de boas-vindas',
  createdAt: new Date()
});
```

**Problema:** O sistema de créditos foi abolido (conforme documentado), mas ainda está sendo criado no registro de novos usuários. Esses dados são criados mas nunca utilizados.

**Impacto:** MÉDIO - Cria dados desnecessários no banco de dados e pode causar confusão.

**Solução:** Remover essas inserções do handler de registro.

---

## 2. Erros de Arquitetura e Design

### 2.1. Rotas Duplicadas com Comportamentos Diferentes

**Localização:**
- `app/api/[[...path]]/route.js` (rota catch-all)
- `app/api/correcoes/route.js` (rota específica)
- `app/api/auth/login/route.js` (rota específica)

**Problema:** Existem múltiplas implementações para os mesmos endpoints:

1. **Upload de Provas:**
   - `/api/correcoes/route.js`: Salva arquivos em sistema de arquivos local (`public/uploads/`)
   - `app/api/[[...path]]/route.js`: Salva arquivos em MongoDB GridFS

2. **Autenticação:**
   - `/api/auth/login/route.js`: Implementação simples, sem rate limiting
   - `app/api/[[...path]]/route.js`: Implementação completa com rate limiting e auditoria

**Impacto:** ALTO - Comportamento inconsistente dependendo da rota utilizada. Pode causar confusão e bugs difíceis de rastrear.

**Solução:** Consolidar rotas em uma única implementação ou documentar claramente qual rota deve ser usada.

---

### 2.2. Duas Estratégias de Armazenamento de Arquivos

**Localização:**
- `app/api/correcoes/route.js`: Sistema de arquivos local
- `app/api/[[...path]]/route.js`: MongoDB GridFS

**Problema:** O projeto utiliza duas estratégias diferentes para armazenar arquivos:
- Sistema de arquivos local (`public/uploads/`) - não funciona em serverless
- MongoDB GridFS - adequado para serverless

**Impacto:** ALTO - Arquivos salvos localmente não persistem em deployments serverless (Vercel). Pode causar perda de dados.

**Solução:** Migrar completamente para GridFS e remover código de sistema de arquivos local.

---

### 2.3. Código Morto Não Removido

**Localização:**
- `app/api/[[...path]]/route.old.js` (arquivo antigo)
- `lib/services/FileService.js` (não utilizado)
- `lib/services/CreditService.js` (sistema abolido)

**Problema:** Arquivos e serviços que não são mais utilizados ainda existem no código, causando confusão e aumentando o tamanho do projeto.

**Impacto:** BAIXO - Não causa erros, mas dificulta manutenção.

**Solução:** Remover arquivos não utilizados ou documentá-los como deprecated.

---

## 3. Erros de Segurança

### 3.1. Middleware Não Valida Assinatura do Token

**Localização:** `middleware.js`, linhas 15-31

**Problema:** O middleware apenas verifica a existência do token, mas não valida sua assinatura ou expiração. A validação completa só ocorre nas API Routes.

**Código:**
```javascript
const token = request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

if (!token) {
    // Redireciona ou retorna 401
}
// Não valida assinatura aqui
```

**Impacto:** MÉDIO - Tokens inválidos ou expirados podem passar pelo middleware e só serem rejeitados nas rotas. Pode causar problemas de segurança em rotas protegidas.

**Solução:** Implementar validação básica de token no middleware ou aceitar o trade-off documentado.

---

### 3.2. Ausência de Validação CSRF

**Problema:** O sistema não implementa validação de tokens CSRF para proteger contra ataques Cross-Site Request Forgery.

**Impacto:** MÉDIO - Vulnerável a ataques CSRF em operações críticas (upload, validação de avaliações).

**Solução:** Implementar tokens CSRF para operações que modificam dados.

---

### 3.3. Tokens JWT Sem Refresh Tokens

**Localização:** `lib/auth.js`, linha 29

**Problema:** O sistema gera tokens JWT com expiração de 7 dias, mas não implementa refresh tokens. Usuários precisam fazer login novamente após expiração.

**Impacto:** BAIXO - Mais uma questão de UX do que segurança, mas pode ser melhorado.

**Solução:** Implementar sistema de refresh tokens para melhorar experiência do usuário.

---

## 4. Erros de Performance

### 4.1. Queries MongoDB Sem Índices Explícitos

**Localização:** Múltiplos arquivos de API

**Problema:** Queries frequentes não possuem índices explícitos, exceto quando criados pelo script `scripts/create-indexes.js`. Isso pode causar lentidão em queries complexas.

**Exemplos:**
- `db.collection('users').findOne({ email })` - sem índice em `email`
- `db.collection('avaliacoes_corrigidas').find({ userId, validado: false })` - sem índice composto

**Impacto:** MÉDIO - Performance degradada com crescimento do banco de dados.

**Solução:** Garantir que índices sejam criados automaticamente ou documentar a necessidade de executar o script de índices.

---

### 4.2. Enriquecimento de Dados em Loop Sequencial

**Localização:** `app/api/[[...path]]/route.js`, linhas 1133-1146 e 1165-1178

**Problema:** O enriquecimento de dados (buscar turma, aluno, gabarito) é feito em loop sequencial com `Promise.all`, mas cada item faz queries individuais ao banco.

**Código:**
```javascript
const enriched = await Promise.all(
  avaliacoes.map(async (av) => {
    const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });
    const turma = await db.collection('turmas').findOne({ id: av.turmaId });
    const aluno = await db.collection('alunos').findOne({ id: av.alunoId });
    // ...
  })
);
```

**Impacto:** MÉDIO - Para listas grandes, isso resulta em muitas queries individuais ao banco.

**Solução:** Usar `$lookup` (aggregation pipeline) ou buscar todos os dados necessários de uma vez e fazer join em memória.

---

### 4.3. Ausência de Cache

**Problema:** Dados frequentemente acessados (turmas, alunos, gabaritos) são sempre buscados diretamente do MongoDB, sem cache.

**Impacto:** BAIXO - Performance aceitável para volumes pequenos, mas pode degradar com crescimento.

**Solução:** Implementar cache em memória ou Redis para dados frequentemente acessados.

---

## 5. Erros de Tratamento de Erros

### 5.1. Mensagens de Erro Genéricas

**Localização:** Múltiplos arquivos

**Problema:** Alguns erros retornam mensagens genéricas como "Erro interno no servidor" sem detalhes úteis para debugging.

**Exemplos:**
- `app/api/[[...path]]/route.js`, linha 75: `return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });`
- `app/api/correcoes/route.js`, linha 629: `return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });`

**Impacto:** MÉDIO - Dificulta debugging e não fornece feedback útil ao usuário.

**Solução:** Implementar sistema centralizado de tratamento de erros com mensagens mais específicas (sem expor detalhes sensíveis em produção).

---

### 5.2. Logs Podem Expor Informações Sensíveis

**Localização:** Múltiplos arquivos com `console.error`

**Problema:** Em desenvolvimento, logs podem expor informações sensíveis como tokens, senhas (hasheadas), ou detalhes de erros que não deveriam ser expostos.

**Impacto:** BAIXO - Apenas em desenvolvimento, mas pode ser um problema se logs forem compartilhados.

**Solução:** Implementar sanitização de logs e não logar informações sensíveis.

---

## 6. Erros de Validação e Integridade de Dados

### 6.1. Validação Manual de Schema

**Problema:** Validação de dados é feita manualmente em cada endpoint, sem schemas centralizados. Isso pode levar a inconsistências e validações incompletas.

**Impacto:** MÉDIO - Risco de dados inconsistentes no banco.

**Solução:** Implementar validação com Zod ou Mongoose schemas.

---

### 6.2. Duplicação de Identificadores

**Problema:** O sistema usa tanto `id` (UUID customizado) quanto `_id` (ObjectId do MongoDB), o que pode causar confusão e queries incorretas.

**Impacto:** BAIXO - Funciona, mas pode causar confusão em queries.

**Solução:** Documentar claramente quando usar cada um ou padronizar em um único identificador.

---

## 7. Erros de Configuração

### 7.1. Configuração de Vertex AI Complexa

**Localização:** `lib/api-handlers.js`, função `isVertexAIConfigured()`

**Problema:** A lógica de configuração do Vertex AI é complexa, verificando múltiplas fontes (variável de ambiente, arquivo JSON) com múltiplos pontos de falha.

**Impacto:** BAIXO - Funciona, mas dificulta troubleshooting.

**Solução:** Simplificar ou melhorar documentação da configuração.

---

## 8. Erros de Consistência

### 8.1. Inconsistência Entre Documentação e Código

**Problema:** O `design_doc.md` menciona que o sistema usa sistema de arquivos local, mas o código já migrou para GridFS. A documentação está desatualizada.

**Impacto:** BAIXO - Pode causar confusão para novos desenvolvedores.

**Solução:** Atualizar documentação para refletir o estado atual do código.

---

### 8.2. Sistema de Trial e Assinaturas Não Documentado

**Problema:** O sistema implementa trial de 7 dias e assinaturas (free/premium), mas isso não está documentado no design document.

**Impacto:** BAIXO - Funcionalidade crítica não documentada.

**Solução:** Documentar sistema de trial e assinaturas.

---

## Resumo de Prioridades

### Prioridade ALTA (Corrigir Imediatamente)
1. ✅ Variável `correcaoData` usada antes de ser definida (linha 493)
2. ✅ Consolidar rotas duplicadas
3. ✅ Migrar completamente para GridFS

### Prioridade MÉDIA (Corrigir em Breve)
1. Remover criação de créditos no registro
2. Implementar validação de token no middleware ou documentar trade-off
3. Melhorar tratamento de erros com mensagens mais específicas
4. Adicionar índices MongoDB para queries frequentes
5. Otimizar enriquecimento de dados com aggregation pipeline

### Prioridade BAIXA (Melhorias Futuras)
1. Remover código morto (route.old.js, FileService, CreditService)
2. Implementar refresh tokens
3. Implementar validação CSRF
4. Adicionar cache para dados frequentes
5. Atualizar documentação

---

## Notas Finais

Este documento foi criado através de análise estática do código. Alguns erros podem não ser detectados até execução em runtime. Recomenda-se:

1. Executar testes automatizados para identificar erros adicionais
2. Revisar logs de produção para identificar erros em runtime
3. Realizar code review regular para prevenir novos erros
4. Implementar linter mais rigoroso (ESLint com regras estritas)
5. Considerar migração gradual para TypeScript para melhor type safety
