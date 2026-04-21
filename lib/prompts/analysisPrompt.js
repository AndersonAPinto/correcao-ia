/**
 * Prompt de Análise Pedagógica — Etapa final do pipeline.
 * Recebe os RESULTADOS já processados e gera insights pedagógicos.
 * Prompt leve e focado para evitar alucinação.
 */

/**
 * Constrói o prompt de análise pedagógica.
 * Baseado em DADOS CONCRETOS da correção, não na imagem.
 *
 * @param {Object} params
 * @param {number} params.notaFinal - Nota final do aluno
 * @param {number} params.notaMaxima - Nota máxima possível
 * @param {string} params.disciplina - Disciplina da prova
 * @param {string} params.nivel - Nível educacional
 * @param {Array} params.exercicios - Detalhes das questões corrigidas
 * @param {Array} params.habilidadesPontuacao - Pontuações das habilidades
 * @param {Object} params.habilidadesMap - Mapa id→nome das habilidades
 */
export function buildAnalysisPrompt({
  notaFinal,
  notaMaxima = 10,
  disciplina = 'Geral',
  nivel = '',
  exercicios = [],
  habilidadesPontuacao = [],
  habilidadesMap = {}
}) {
  // Resumir as questões para o prompt (não enviar tudo)
  const questoesResumo = exercicios.map(ex => {
    const status = ex.nota >= (ex.nota_maxima || ex.notaMaxima || 10) * 0.7 ? 'ACERTOU' :
      ex.nota > 0 ? 'PARCIAL' : 'ERROU';
    return `Q${ex.numero}: ${status} (${ex.nota}/${ex.nota_maxima || ex.notaMaxima || 10})`;
  }).join(', ');

  // Resumir habilidades
  const habResumo = habilidadesPontuacao.map(h => {
    const nome = habilidadesMap[h.habilidadeId] || h.habilidadeId;
    const nivel_hab = h.pontuacao >= 8 ? 'FORTE' :
      h.pontuacao >= 5 ? 'PARCIAL' : 'FRACA';
    return `- ${nome}: ${h.pontuacao}/10 (${nivel_hab})`;
  }).join('\n');

  // Identificar questões erradas para contexto
  const questoesErradas = exercicios
    .filter(ex => ex.nota < (ex.nota_maxima || ex.notaMaxima || 10) * 0.5)
    .map(ex => `Q${ex.numero}: "${ex.feedback || 'sem feedback'}"`)
    .join('\n');

  const percentual = notaMaxima > 0 ? ((notaFinal / notaMaxima) * 100).toFixed(1) : 0;

  return `Você é um psicopedagogo especialista em ${disciplina}${nivel ? ` para o ${nivel}` : ''}.

Com base EXCLUSIVAMENTE nos dados abaixo, gere uma análise pedagógica BREVE e PRÁTICA.

RESULTADO DA PROVA:
- Nota: ${notaFinal}/${notaMaxima} (${percentual}%)
- Questões: ${questoesResumo}

HABILIDADES AVALIADAS:
${habResumo || 'Nenhuma habilidade foi avaliada.'}

QUESTÕES COM BAIXO DESEMPENHO:
${questoesErradas || 'Nenhuma — aluno foi bem em todas.'}

REGRAS:
- Baseie-se APENAS nos dados acima
- NÃO invente informações que não estão nos dados
- Seja BREVE e OBJETIVO (máximo 2-3 frases por campo)
- A sugestão de intervenção deve ser PRÁTICA e executável na próxima aula

Retorne APENAS um JSON válido:
{
  "causa_raiz_erro": "Motivo conceitual principal dos erros (baseado nas questões erradas). Se não houve erros significativos, diga isso.",
  "ponto_forte": "O que o aluno demonstrou dominar bem nesta prova.",
  "ponto_atencao": "O que precisa de atenção imediata.",
  "sugestao_intervencao": "O que o professor deve trabalhar com este aluno na próxima aula. Seja específico e prático."
}

IMPORTANTE: Retorne APENAS o JSON. Nenhum texto antes ou depois.`;
}
