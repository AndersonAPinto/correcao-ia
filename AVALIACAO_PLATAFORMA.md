# Avaliação Técnica e Pedagógica — Corretor IA
> Data: Abril/2026 | Stack: Next.js 14, MongoDB, Vertex AI (Gemini 2.0 Flash), OpenRouter

---

## 1. Visão Geral da Plataforma

A plataforma é um corretor automático de provas focado em professores. O fluxo central é:

```
Professor cadastra habilidades
→ Professor cria gabarito (dissertativo ou múltipla escolha)
→ Professor faz upload da prova do aluno (imagem ou PDF)
→ Pipeline de IA executa OCR → Correção → Análise pedagógica
→ Professor visualiza resultados, valida e exporta
```

### Stack atual
| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 App Router |
| UI | Radix UI + Tailwind CSS + Shadcn |
| Banco | MongoDB Atlas (GridFS para imagens) |
| IA — OCR (Etapa 1) | Vertex AI / Gemini 2.0 Flash (multimodal) **hardcoded** |
| IA — Correção (Etapa 2) | OpenRouter (se configurado) → Vertex AI como fallback |
| IA — Análise (Etapa 3) | OpenRouter (se configurado) → Vertex AI como fallback |
| Email | Resend |
| Auth | JWT + cookies httpOnly |

---

## 2. Análise do Pipeline de IA

### 2.1 Arquitetura do Pipeline (o que está bom)

O pipeline de 3 etapas para provas dissertativas é a decisão mais acertada da plataforma:

```
Etapa 1 — OCR       : Imagem (base64) → texto transcrito (temp: 0.1)
Etapa 2 — Correção  : Texto OCR + gabarito → notas + feedback (temp: 0.2)
Etapa 3 — Análise   : Resultados → insights pedagógicos (temp: 0.3)
```

**Por que isso é correto:** Quando a IA tenta OCR + correção na mesma chamada, ela "imagina" respostas corretas para lacunas ilegíveis. Separar as etapas força a IA a primeiro descrever o que vê, e só depois avaliar o que foi transcrito. Isso reduz alucinação significativamente.

Para múltipla escolha: a correção é feita em **código determinístico** (não por IA), o que é a abordagem ideal — a IA apenas identifica a letra marcada, o código compara com o gabarito. Excelente decisão de engenharia.

### 2.2 Qualidade dos Prompts

#### OCR (dissertativa)
- Temperatura 0.1 — correta para máxima fidelidade
- Instruções para lidar com [ilegível], [EM BRANCO], rasuras, cálculos — bem pensadas
- Pede apenas JSON — evita texto fora do formato
- **Ponto de atenção:** não pede ao modelo para estimar a qualidade da caligrafia do documento. Um campo `qualidade_imagem: "boa|media|ruim"` ajudaria o professor a saber quando desconfiar do OCR

#### Correção (dissertativa)
- Recebe o texto OCR (não a imagem) — correto, elimina reinterpretação visual
- Instruções por tipo de questão (dissertativa, cálculo, redação, V/F, associação, lacunas) — bem estruturado
- Critérios de rigor configuráveis via perfil de avaliação — diferencial pedagógico
- **Ponto de atenção:** a instrução para questões de redação (5 critérios de 20% cada) não é enviada ao professor de forma estruturada no painel de resultados — o campo `detalhes_redacao` é gerado mas pode não estar sendo renderizado

#### Análise pedagógica
- Baseada em dados já processados (não na imagem) — correto
- Temperatura 0.3 — adequado para geração criativa mas controlada
- Limitada a 4 campos (`causa_raiz_erro`, `ponto_forte`, `ponto_atencao`, `sugestao_intervencao`)
- **Ponto de atenção:** a análise é genérica demais para uso pedagógico real — falta alinhamento com BNCC e sugestão de recursos concretos

---

## 3. Bugs e Problemas Encontrados

### 🔴 BUG CRÍTICO — OCR hardcoded para Vertex AI

**Arquivo:** `lib/services/CorrectionPipelineService.js`, linhas 129 e 242

O OCR sempre chama `callGeminiAPIWithRetry()` diretamente, ignorando se o OpenRouter está configurado. O problema duplo:

1. As linhas 284 e 387 checam `if (!isVertexAIConfigured())` e lançam erro — se o professor configurou apenas OpenRouter (sem Vertex), o pipeline **nunca funciona**.
2. Mesmo que o OpenRouter esteja configurado, o OCR nunca o usa porque `callTextAI()` só é chamado nas Etapas 2 e 3.

```js
// ATUAL (problema):
if (!isVertexAIConfigured()) {
  throw new Error('Vertex AI não configurado...');
}

// CORRETO DEVERIA SER:
if (!isVertexAIConfigured() && !isOpenRouterConfigured()) {
  throw new Error('Nenhum provedor de IA configurado...');
}
```

**Impacto:** Um usuário que configurou apenas `OPENROUTER_API_KEY` (sem Vertex) **não consegue corrigir nenhuma prova**.

### 🔴 BUG — PDF multi-página sem conversão

**Arquivo:** `app/api/correcoes/route.js`, linha 386

PDFs são aceitos como tipo de arquivo e enviados diretamente como `base64` com `mime_type: application/pdf`. O Gemini aceita PDFs inline, mas tem limite de 20MB e 1000 páginas. O problema real: provas manuscritas raramente são PDFs "searchable" — são scans, e o Gemini processa a primeira página apenas em muitos casos, silenciosamente ignorando as demais.

**Solução sem mudança estrutural:** Adicionar validação que avisa ao professor: "PDFs com múltiplas páginas serão processados pela primeira página. Para melhores resultados, envie imagens (JPG/PNG)."

### 🟡 AVISO — Modelo OpenRouter padrão inadequado para correção

**Arquivo:** `lib/api-handlers.js`, linha 287

```js
const model = options.model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
```

O `gpt-4o-mini` é um modelo econômico mas limitado para raciocínio pedagógico complexo. Para correção de provas dissertativas (especialmente redações), modelos com maior capacidade de raciocínio produzem feedback mais construtivo.

### 🟡 AVISO — CorretorIA.jsx com 33KB+

O componente principal tem mais de 700 linhas e mistura: formulário de upload single, lógica de batch, estados de UI, chamadas de API, e renderização de resultados. Isso dificulta manutenção e testes.

### 🟡 AVISO — Ausência de cache de dados no cliente

Todos os componentes fazem `fetch()` independente na montagem (`useEffect + loadData`). Não há SWR ou React Query, o que significa:
- Dados são recarregados a cada navegação entre abas
- Sem deduplificação de requests paralelos
- Sem revalidação automática em background

---

## 4. Análise: Transcrição (OCR) — É a melhor abordagem?

### O que está bem
- Gemini 2.0 Flash Vision é um dos melhores modelos para OCR de texto manuscrito (benchmarks de 2025 colocam Gemini 2.0 Flash próximo ao Google Document AI para handwriting)
- Temperatura 0.1 é a configuração correta
- Separar OCR de correção é a decisão técnica mais importante e está certa

### O que pode melhorar (sem mudança estrutural)

#### Opção 1 — Usar OpenRouter para OCR também (Mistral Pixtral)

Hoje o OpenRouter só é usado nas Etapas 2 e 3. Via OpenRouter, é possível usar modelos multimodais para OCR também:

| Modelo via OpenRouter | Custo aprox. | Qualidade OCR manuscrito |
|----------------------|-------------|--------------------------|
| `mistralai/pixtral-12b` | ~$0.15/1M tokens | Boa (manuscrito simples) |
| `mistralai/pixtral-large-2411` | ~$2/1M tokens | Muito boa |
| `openai/gpt-4o` | ~$2.5/1M tokens | Muito boa |
| `anthropic/claude-3.5-sonnet` | ~$3/1M tokens | Excelente para estrutura |
| `google/gemini-2.0-flash-001` (via OR) | ~$0.10/1M tokens | Excelente (mesma base do Vertex) |

**Recomendação:** Adicionar uma variável de ambiente `OPENROUTER_OCR_MODEL` (opcional). Se configurada E for um modelo de visão, usar OpenRouter no OCR também. Isso permite ao usuário escolher Mistral para OCR sem precisar do Vertex.

#### Opção 2 — Pré-processamento de imagem antes do OCR

A qualidade do OCR depende muito da qualidade da imagem. Adicionar um pré-processamento simples melhoraria a taxa de acerto:
- Redimensionar imagens muito grandes (>4MB) antes de enviar
- Converter para grayscale pode reduzir ruído em papéis amarelados
- Isso pode ser feito no servidor com `sharp` (sem impacto na arquitetura)

#### Opção 3 — Retry automático com variação no prompt

Quando o OCR retorna `texto_completo` com menos de 50 caracteres para uma prova esperada, provavelmente falhou silenciosamente. Um retry com temperatura 0.0 e prompt simplificado poderia recuperar mais casos.

---

## 5. Análise: Avaliação dos Documentos — É a melhor abordagem?

### O que está bem
- Comparação texto vs gabarito (não imagem vs gabarito) elimina uma fonte enorme de erro
- Instrucoes por tipo de questão são pedagogicamente sólidas
- Critérios de rigor configuráveis (rigoroso/moderado/flexível) são um diferencial real
- A nota de múltipla escolha é calculada deterministicamente — correto

### O que pode melhorar

#### 5.1 Rubrica explícita por critério (sem mudança estrutural)

Atualmente o gabarito aceita um campo `conteudo` (texto livre descrevendo as respostas esperadas). Uma melhoria seria permitir gabaritos com **rubrica estruturada**:

```
Questão 1 (valor: 3.0):
  - Identificou o tema principal: 1.0 ponto
  - Apresentou pelo menos 2 exemplos: 1.0 ponto
  - Concluiu com síntese: 1.0 ponto
```

Quando o professor define assim, o prompt de correção se torna muito mais determinístico porque a IA recebe critérios explícitos em vez de interpretar livremente.

#### 5.2 Alinhamento com BNCC

As habilidades são cadastradas manualmente pelo professor. A plataforma já tem `HABILIDADES_PADRAO` mas são genéricas. Poderia oferecer uma biblioteca de habilidades pré-cadastradas alinhadas à BNCC por disciplina e ano, o que tornaria os analytics muito mais úteis para relatórios pedagógicos exigidos pelas escolas.

Exemplos BNCC:
- `EF09LP01` — Leitura e análise de textos
- `EF09MA01` — Álgebra e funções
- Etc.

#### 5.3 Feedback estruturado não chega ao professor

A análise pedagógica gera 4 campos importantes (`causa_raiz_erro`, `ponto_forte`, `ponto_atencao`, `sugestao_intervencao`). Mas esses dados precisam estar **visíveis e bem formatados** no painel de resultados para que tenham valor real. Verificar se o componente de resultados (`ValidationModal`) renderiza isso de forma clara.

#### 5.4 Sem revisão do OCR antes da correção

Do ponto de vista pedagógico, **o professor deveria poder revisar a transcrição antes de ela ser corrigida**. Atualmente o fluxo é: upload → pipeline completo automático → resultado. Se o OCR errou uma palavra-chave ("não" vs "na"), a correção inteira pode ser comprometida.

**Melhoria sugerida (sem mudança estrutural):** Adicionar um passo opcional de "revisão OCR" entre as Etapas 1 e 2. O professor vê o texto transcrito, pode editar, e então dispara a Etapa 2 manualmente.

---

## 6. Recomendação: Configuração de Provedores de IA

### Configuração atual (padrão)
```
OCR: Vertex AI (Gemini 2.0 Flash) — obrigatório
Correção: OpenRouter → Vertex AI fallback
Análise: OpenRouter → Vertex AI fallback
```

### Configuração recomendada com Mistral
```env
# OCR com visão (Stage 1) — precisa de modelo multimodal
OPENROUTER_OCR_MODEL=mistralai/pixtral-large-2411

# Correção e análise (Stage 2/3) — texto puro
OPENROUTER_MODEL=mistralai/mistral-large-2411
```

**Custo vs qualidade para Mistral:**
- `pixtral-large-2411` para OCR: qualidade comparável ao Gemini Flash em texto impresso, menor em manuscrito complexo
- `mistral-large-2411` para correção: excelente raciocínio pedagógico, custo-benefício melhor que GPT-4o para textos em português

### Configuração com máxima qualidade (Claude + Vertex)
```env
# Vertex AI para OCR (mantém o que funciona bem)
GOOGLE_CLOUD_PROJECT_ID=...

# Claude para correção (melhor feedback pedagógico em português)
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Configuração 100% OpenRouter (sem Vertex)
Requer o bug fix descrito na Seção 3. Após corrigir:
```env
OPENROUTER_API_KEY=...
OPENROUTER_OCR_MODEL=openai/gpt-4o          # multimodal para OCR
OPENROUTER_MODEL=openai/gpt-4o-mini         # texto para correção/análise
```

---

## 7. Perspectiva Pedagógica — O que o professor sente falta

### 7.1 Falta: Visualização lado a lado (imagem original + feedback)
Quando o professor valida uma correção, seria ideal ver a imagem da prova ao lado do feedback da IA. Atualmente há a imagem salva no MongoDB, mas a interface de validação não mostra imagem + resultado simultaneamente de forma confortável.

### 7.2 Falta: Feedback individualizado exportável por aluno
O export atual (CSV/Excel) exporta dados tabulares. Um professor frequentemente precisa de um **relatório por aluno** que pode ser enviado para os pais: "João teve nota 7.5. Ponto forte: interpretação de texto. Ponto de atenção: cálculos algébricos."

### 7.3 Falta: Histórico de versões de gabarito
Se o professor edita um gabarito após já ter corrigido provas com ele, as correções anteriores ficam vinculadas ao gabarito editado, perdendo o contexto original.

### 7.4 Falta: Sugestão de intervenção para a turma
Os analytics mostram quais habilidades a turma tem dificuldade. Mas não há sugestão de "o que trabalhar na próxima aula para a turma toda". A análise pedagógica existe por aluno mas não há uma versão agregada para a turma.

### 7.5 Falta: Correção de prova com gabarito como arquivo
O professor pode anexar um arquivo ao gabarito (ex: PDF ou imagem do gabarito oficial). Mas o pipeline usa o campo `conteudo` (texto) para a correção, não o arquivo anexado. Se o professor só enviou o arquivo e não preencheu o texto, a correção acontece sem gabarito real.

---

## 8. Melhorias Prioritizadas

### P0 — Crítico (bugs que impedem funcionalidade)

| # | Problema | Arquivo | Esforço |
|---|---------|---------|---------|
| 1 | OCR hardcoded para Vertex mesmo quando não configurado | `CorrectionPipelineService.js` linhas 284 e 387 | 1h |
| 2 | Check errado impede uso com OpenRouter-only | `CorrectionPipelineService.js` | 30min |

### P1 — Alto impacto (melhora a experiência do professor)

| # | Melhoria | Esforço estimado |
|---|---------|-----------------|
| 3 | Campo `qualidade_imagem` no retorno do OCR com alerta visual na UI | 2h |
| 4 | Aviso quando PDF tem múltiplas páginas sobre limitação | 1h |
| 5 | Revisão opcional do OCR antes de disparar Etapa 2 | 4h |
| 6 | Exibir `detalhes_redacao` na tela de resultados quando presente | 2h |

### P2 — Médio impacto (melhora qualidade da IA)

| # | Melhoria | Esforço estimado |
|---|---------|-----------------|
| 7 | Suporte a `OPENROUTER_OCR_MODEL` para OCR via OpenRouter multimodal | 3h |
| 8 | Modelo de texto padrão mudar para `mistralai/mistral-large-2411` ou `anthropic/claude-3.5-sonnet` | 15min (config) |
| 9 | Retry no OCR quando `texto_completo` está muito curto | 2h |
| 10 | Gabarito: alertar professor quando `conteudo` está vazio mas `arquivo` existe | 1h |

### P3 — Baixo impacto (qualidade técnica)

| # | Melhoria | Esforço estimado |
|---|---------|-----------------|
| 11 | Dividir `CorretorIA.jsx` em subcomponentes | 4h |
| 12 | Adicionar React Query ou SWR para cache de dados | 8h |
| 13 | Adicionar Error Boundaries nos componentes principais | 2h |
| 14 | Biblioteca de habilidades BNCC pré-cadastradas | 4h |

---

## 9. Resumo Executivo

### O que está funcionando bem
- Pipeline 3 etapas para dissertativas é tecnicamente sólido
- Separação OCR/Correção/Análise é a decisão arquitetural mais correta
- Múltipla escolha com correção determinística em código é ideal
- Critérios de rigor configuráveis são um diferencial competitivo
- A estrutura de repositórios e serviços no backend está bem organizada

### O que precisa de atenção imediata
1. O bug do OCR hardcoded ao Vertex AI impede usuários que usam apenas OpenRouter de corrigir qualquer prova
2. PDF multi-página pode estar sendo processado incorretamente sem aviso ao usuário
3. O modelo padrão do OpenRouter (`gpt-4o-mini`) pode comprometer a qualidade da correção pedagógica

### Decisão sobre provedores
- **Manter Vertex AI (Gemini 2.0 Flash) para OCR:** é o melhor custo-benefício para handwriting em português
- **Usar OpenRouter com Mistral Large para correção/análise:** qualidade superior em português, custo menor que GPT-4o
- **Opcionalmente:** Pixtral para OCR via OpenRouter se o professor não tiver Vertex configurado
- **Não é necessária mudança estrutural** — apenas correção do bug + variáveis de ambiente

---

*Documento gerado em 26/04/2026 | Avaliação completa do branch `feature/v0.3.9`*
