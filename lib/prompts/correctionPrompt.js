/**
 * Prompts de Correção — Recebe TEXTO (não imagem), compara com gabarito.
 * Trabalha com a transcrição OCR já feita, eliminando reinterpretação visual.
 */

/**
 * Monta instruções específicas por tipo de questão.
 * Só inclui instruções para os tipos PRESENTES na prova.
 * @param {string[]} tiposPresentes - Tipos de questão encontrados na prova
 */
function buildInstrucoesPorTipo(tiposPresentes) {
  const instrucoes = {};

  instrucoes.dissertativa = `QUESTÕES DISSERTATIVAS:
- Compare a resposta do aluno com o gabarito fornecido
- Respostas com palavras diferentes mas mesmo significado são CORRETAS
- Se parcialmente correta, atribua nota parcial proporcional ao que acertou
- Identifique o que está correto e o que falta/está errado
- O feedback deve explicar o erro e indicar a resposta correta`;

  instrucoes.calculo = `QUESTÕES COM CÁLCULOS/FÓRMULAS:
- AVALIE O RACIOCÍNIO/PROCESSO, não apenas o resultado final
- Se o raciocínio está correto mas houve erro de cálculo → 50-70% da nota
- Se o resultado está correto sem mostrar desenvolvimento → 30-50% da nota
- Se usou fórmula correta + desenvolvimento correto + resultado correto → nota máxima
- Identifique EXATAMENTE onde o erro ocorreu no desenvolvimento
- Erros de sinal, erros aritméticos e erros conceituais devem ser diferenciados`;

  instrucoes.redacao = `QUESTÕES DE REDAÇÃO/PRODUÇÃO TEXTUAL:
Avalie nos seguintes critérios (cada um vale 20% da nota da questão):
  1. TESE E ARGUMENTAÇÃO: Apresentou tese clara? Argumentos sustentam a tese?
  2. COERÊNCIA E COESÃO: O texto faz sentido? Usa conectivos adequados?
  3. ESTRUTURA: Tem introdução, desenvolvimento e conclusão?
  4. REPERTÓRIO: Usa exemplos, dados ou referências relevantes?
  5. ADEQUAÇÃO LINGUÍSTICA: Gramática, ortografia e adequação ao gênero
Forneça nota e comentário para CADA critério no campo "detalhes_redacao".`;

  instrucoes.verdadeiro_falso = `QUESTÕES VERDADEIRO OU FALSO:
- Compare o que o aluno marcou (V ou F) com o gabarito para cada item
- Cada item vale uma fração igual do peso total da questão
- Se um item está em branco, considere como erro`;

  instrucoes.associacao = `QUESTÕES DE ASSOCIAÇÃO DE COLUNAS:
- Compare as ligações feitas pelo aluno com o gabarito
- Cada par correto vale uma fração igual do peso total da questão
- Pares invertidos contam como erro`;

  instrucoes.completar = `QUESTÕES DE COMPLETAR LACUNAS:
- Compare o que foi preenchido com as respostas esperadas
- Aceite sinônimos e variações gramaticais válidas (plural/singular, etc.)
- Cada lacuna correta vale uma fração igual do peso total da questão`;

  // Retorna apenas as instruções dos tipos presentes
  let texto = '';
  for (const tipo of tiposPresentes) {
    const tipoNormalizado = tipo.toLowerCase().replace(/[_\s]/g, '_');
    // Mapeamento flexível
    const mapa = {
      'dissertativa': 'dissertativa',
      'calculo': 'calculo',
      'cálculo': 'calculo',
      'matematica': 'calculo',
      'redacao': 'redacao',
      'redação': 'redacao',
      'producao_textual': 'redacao',
      'verdadeiro_falso': 'verdadeiro_falso',
      'v_f': 'verdadeiro_falso',
      'associacao': 'associacao',
      'associação': 'associacao',
      'associacao_colunas': 'associacao',
      'completar': 'completar',
      'completar_lacunas': 'completar',
      'lacunas': 'completar',
    };

    const chave = mapa[tipoNormalizado] || 'dissertativa';
    if (instrucoes[chave] && !texto.includes(instrucoes[chave])) {
      texto += instrucoes[chave] + '\n\n';
    }
  }

  // Se nenhum tipo específico, usar dissertativa como padrão
  if (!texto) {
    texto = instrucoes.dissertativa + '\n\n';
  }

  return texto.trim();
}

/**
 * Constrói o prompt de correção para provas dissertativas.
 * Recebe a transcrição OCR (não a imagem), tornando a correção determinística.
 *
 * @param {Object} params
 * @param {string} params.textoOCR - Texto transcrito pela etapa de OCR
 * @param {Array} params.questoesOCR - Questões identificadas pelo OCR [{numero, resposta_transcrita}]
 * @param {string} params.gabaritoConteudo - Conteúdo do gabarito (respostas esperadas)
 * @param {string} params.disciplina - Disciplina da prova (Matemática, Português, etc.)
 * @param {string} params.nivel - Nível educacional (6º Ano, Ensino Médio, etc.)
 * @param {Array} params.habilidades - Habilidades cadastradas [{id, nome}]
 * @param {string} params.perfilConteudo - Perfil de avaliação (opcional)
 * @param {string} params.criteriosRigorTexto - Critérios de rigor (opcional)
 * @param {string[]} params.tiposQuestao - Tipos de questão presentes na prova
 */
export function buildDissertativaCorrectionPrompt({
  textoOCR,
  questoesOCR = [],
  gabaritoConteudo,
  disciplina = 'Geral',
  nivel = '',
  habilidades = [],
  perfilConteudo = '',
  criteriosRigorTexto = '',
  tiposQuestao = ['dissertativa']
}) {
  // Formatar questões OCR para o prompt
  const questoesTexto = questoesOCR.length > 0
    ? questoesOCR.map(q => `Questão ${q.numero}: ${q.resposta_transcrita}`).join('\n')
    : textoOCR;

  // Montar instruções apenas dos tipos presentes
  const instrucoesTipo = buildInstrucoesPorTipo(tiposQuestao);

  // Montar seção de habilidades (só as que têm)
  const habilidadesTexto = habilidades.length > 0
    ? habilidades.map(h => `- ${h.nome} (ID: ${h.id})`).join('\n')
    : 'Nenhuma habilidade cadastrada — avalie de forma geral.';

  // Contexto de disciplina
  const contextoDisciplina = disciplina !== 'Geral'
    ? `Você é um professor especialista em ${disciplina}${nivel ? ` para alunos do ${nivel}` : ''}.`
    : 'Você é um professor especialista em avaliação educacional.';

  return `${contextoDisciplina}
Sua tarefa é corrigir as respostas de um aluno comparando com o gabarito fornecido.

RESPOSTA DO ALUNO (transcrição OCR — é exatamente o que o aluno escreveu):
---
${questoesTexto}
---

GABARITO / RESPOSTAS ESPERADAS:
---
${gabaritoConteudo || 'Não fornecido — avalie baseado no conhecimento da disciplina.'}
---

${perfilConteudo ? `PERFIL DE AVALIAÇÃO:\n${perfilConteudo}\n` : ''}${criteriosRigorTexto ? `\n${criteriosRigorTexto}\n` : ''}
INSTRUÇÕES DE CORREÇÃO:
${instrucoesTipo}

REGRAS GERAIS:
- Questão em branco = nota 0 + feedback com dica breve do que era esperado
- Nota de cada questão NUNCA pode exceder o peso/nota máxima
- O feedback deve ser CONSTRUTIVO e EDUCATIVO
- NÃO invente conteúdo que o aluno não escreveu
- Baseie-se APENAS no texto transcrito acima

HABILIDADES A MAPEAR:
${habilidadesTexto}

Para cada habilidade demonstrada nas respostas, avalie com pontuação de 1 a 10:
- 1-3: Não demonstrada ou muito fraca
- 4-6: Parcialmente demonstrada
- 7-8: Demonstrada adequadamente
- 9-10: Demonstrada com excelência

Retorne APENAS um JSON válido neste formato:
{
  "nota_final": 0.0,
  "feedback_geral": "Resumo objetivo do desempenho, mencionando pontos fortes e fracos.",
  "exercicios": [
    {
      "numero": 1,
      "nota": 0.0,
      "nota_maxima": 10.0,
      "feedback": "Feedback construtivo e educativo para esta questão.",
      "habilidades_acertadas": ["id_habilidade"],
      "habilidades_erradas": ["id_habilidade"]${tiposQuestao.includes('redacao') || tiposQuestao.includes('redação') ? `,
      "detalhes_redacao": {
        "tese_argumentacao": {"nota": 0, "comentario": "..."},
        "coerencia_coesao": {"nota": 0, "comentario": "..."},
        "estrutura": {"nota": 0, "comentario": "..."},
        "repertorio": {"nota": 0, "comentario": "..."},
        "adequacao_linguistica": {"nota": 0, "comentario": "..."}
      }` : ''}
    }
  ],
  "habilidades_avaliacao": [
    {
      "habilidade_id": "id",
      "pontuacao": 0.0,
      "justificativa": "Justificativa baseada nas questões avaliadas."
    }
  ]
}

IMPORTANTE:
- Retorne APENAS o JSON válido, sem texto antes ou depois
- Use SOMENTE IDs de habilidades da lista fornecida
- Pontuações de habilidades devem estar entre 1 e 10
- Nota final deve ser a soma das notas das questões (escala 0-10)
- Seja justo: aplique os critérios de rigor quando especificados`;
}
