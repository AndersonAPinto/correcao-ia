/**
 * CorrectionPipelineService
 * 
 * Pipeline de correção em 3 etapas para reduzir alucinação:
 * 
 * ETAPA 1 — OCR: Transcreve a imagem (IA + imagem → texto)
 * ETAPA 2 — CORREÇÃO: Compara texto com gabarito (IA + texto → notas)
 * ETAPA 3 — ANÁLISE: Gera insights pedagógicos (IA + resultados → insights)
 * 
 * Cada etapa é independente, focada e validável.
 */

import { callGeminiAPIWithRetry, isVertexAIConfigured, callOpenRouterAPI, isOpenRouterConfigured } from '@/lib/api-handlers';
import {
  buildDissertativaOCRPrompt,
  buildMultiplaEscolhaOCRPrompt,
  buildDissertativaCorrectionPrompt,
  buildAnalysisPrompt
} from '@/lib/prompts';

// ==================== HELPERS ====================

/**
 * Monta o body para chamada com imagem + texto (OCR)
 */
function buildImageRequestBody(base64Image, mimeType, prompt, maxOutputTokens = 4096) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.1, // Muito baixo para OCR — máxima fidelidade
        topK: 20,
        topP: 0.9,
        maxOutputTokens
      }
    })
  };
}

/**
 * Monta o body para chamada somente com texto (correção e análise) — Vertex AI
 */
function buildTextRequestBody(prompt, maxOutputTokens = 8192, temperature = 0.2) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens
      }
    })
  };
}

/**
 * Chama o provedor de IA para texto (sem imagem).
 * Usa OpenRouter se configurado; caso contrário, Vertex AI.
 */
async function callTextAI(prompt, maxOutputTokens = 8192, temperature = 0.2) {
  if (isOpenRouterConfigured()) {
    return callOpenRouterAPI(prompt, { temperature, maxTokens: maxOutputTokens });
  }
  const body = buildTextRequestBody(prompt, maxOutputTokens, temperature);
  return callGeminiAPIWithRetry('gemini-2.0-flash', body);
}

/**
 * Extrai JSON de uma resposta do Gemini (pode vir com texto antes/depois)
 */
function extractJSON(responseText) {
  if (!responseText) {
    throw new Error('Resposta vazia do Vertex AI');
  }

  // Tenta fazer parse direto primeiro
  try {
    return JSON.parse(responseText.trim());
  } catch (e) {
    // Se não for JSON direto, extrair com regex
  }

  // Extrair JSON de markdown code blocks (```json ... ```)
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Continuar tentando
    }
  }

  // Extrair primeiro objeto JSON
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Nenhum JSON encontrado na resposta do Vertex AI');
  }

  return JSON.parse(jsonMatch[0]);
}

// ==================== PIPELINE DISSERTATIVA ====================

/**
 * ETAPA 1: OCR de prova dissertativa
 * Input: imagem (base64) → Output: texto transcrito + questões identificadas
 */
async function runDissertativaOCR(base64Image, mimeType) {
  console.log('📝 [PIPELINE] Etapa 1 — OCR dissertativa...');

  const prompt = buildDissertativaOCRPrompt();
  const body = buildImageRequestBody(base64Image, mimeType, prompt, 4096);
  const dummyUrl = 'gemini-2.0-flash';

  const responseText = await callGeminiAPIWithRetry(dummyUrl, body);
  const ocrData = extractJSON(responseText);

  // Validar resultado
  if (!ocrData.texto_completo && !ocrData.questoes_identificadas) {
    throw new Error('OCR não retornou texto nem questões identificadas');
  }

  console.log('✅ [PIPELINE] OCR concluído:', {
    textoLength: ocrData.texto_completo?.length || 0,
    questoesIdentificadas: ocrData.questoes_identificadas?.length || 0
  });

  return ocrData;
}

/**
 * ETAPA 2: Correção de prova dissertativa
 * Input: texto OCR + gabarito → Output: notas + feedback
 */
async function runDissertativaCorrection({
  textoOCR,
  questoesOCR,
  gabaritoConteudo,
  disciplina,
  nivel,
  habilidades,
  perfilConteudo,
  criteriosRigorTexto,
  tiposQuestao
}) {
  console.log('📊 [PIPELINE] Etapa 2 — Correção dissertativa...');

  const prompt = buildDissertativaCorrectionPrompt({
    textoOCR,
    questoesOCR,
    gabaritoConteudo,
    disciplina,
    nivel,
    habilidades,
    perfilConteudo,
    criteriosRigorTexto,
    tiposQuestao
  });

  const responseText = await callTextAI(prompt, 8192, 0.2);
  const correctionData = extractJSON(responseText);

  // Validar campos obrigatórios
  if (correctionData.nota_final === undefined || typeof correctionData.nota_final !== 'number') {
    // Tentar converter
    correctionData.nota_final = parseFloat(correctionData.nota_final) || 0;
  }

  if (!Array.isArray(correctionData.exercicios)) {
    correctionData.exercicios = [];
  }

  console.log('✅ [PIPELINE] Correção concluída:', {
    notaFinal: correctionData.nota_final,
    exercicios: correctionData.exercicios.length,
    habilidades: correctionData.habilidades_avaliacao?.length || 0
  });

  return correctionData;
}

/**
 * ETAPA 3: Análise pedagógica
 * Input: resultados da correção → Output: insights pedagógicos
 */
async function runAnalysis({
  notaFinal,
  notaMaxima,
  disciplina,
  nivel,
  exercicios,
  habilidadesPontuacao,
  habilidadesMap
}) {
  console.log('🧠 [PIPELINE] Etapa 3 — Análise pedagógica...');

  const prompt = buildAnalysisPrompt({
    notaFinal,
    notaMaxima,
    disciplina,
    nivel,
    exercicios,
    habilidadesPontuacao,
    habilidadesMap
  });

  const responseText = await callTextAI(prompt, 2048, 0.3);
  const analysisData = extractJSON(responseText);

  console.log('✅ [PIPELINE] Análise pedagógica concluída');

  return analysisData;
}

// ==================== PIPELINE MÚLTIPLA ESCOLHA ====================

/**
 * ETAPA 1: OCR de prova de múltipla escolha
 * Input: imagem (base64) → Output: respostas marcadas
 */
async function runMultiplaEscolhaOCR(base64Image, mimeType, questoesInfo) {
  console.log('📝 [PIPELINE] Etapa 1 — OCR múltipla escolha...');

  const prompt = buildMultiplaEscolhaOCRPrompt(questoesInfo);
  const body = buildImageRequestBody(base64Image, mimeType, prompt, 2048);
  const dummyUrl = 'gemini-2.0-flash';

  const responseText = await callGeminiAPIWithRetry(dummyUrl, body);
  const ocrData = extractJSON(responseText);

  // Validar
  if (!ocrData.respostas || !Array.isArray(ocrData.respostas)) {
    throw new Error('OCR de múltipla escolha não retornou array de respostas');
  }

  console.log('✅ [PIPELINE] OCR múltipla escolha concluído:', {
    respostasIdentificadas: ocrData.respostas.length
  });

  return ocrData;
}

// ==================== PIPELINES COMPLETOS ====================

/**
 * Pipeline completo para correção de prova DISSERTATIVA.
 * 3 etapas: OCR → Correção → Análise
 * 
 * @param {Object} params
 * @param {string} params.base64Image - Imagem em base64
 * @param {string} params.mimeType - Tipo MIME da imagem
 * @param {Object} params.gabarito - Gabarito da prova
 * @param {Array} params.habilidades - Habilidades cadastradas [{id, nome}]
 * @param {string} params.perfilConteudo - Perfil de avaliação
 * @param {string} params.criteriosRigorTexto - Critérios de rigor
 * @returns {Object} Resultado completo {ocrData, correctionData, analysisData}
 */
export async function runDissertativaPipeline({
  base64Image,
  mimeType,
  gabarito,
  habilidades = [],
  perfilConteudo = '',
  criteriosRigorTexto = ''
}) {
  console.log('🚀 [PIPELINE] Iniciando pipeline dissertativa...');
  const startTime = Date.now();

  // Verificar configuração
  if (!isVertexAIConfigured()) {
    throw new Error('Vertex AI não configurado. Defina GOOGLE_CLOUD_PROJECT_ID no ambiente ou configure o arquivo de credenciais.');
  }

  // Extrair dados do gabarito
  const disciplina = gabarito.disciplina || 'Geral';
  const nivel = gabarito.nivel || '';
  const tiposQuestao = gabarito.tiposQuestao || ['dissertativa'];

  // ────────────── ETAPA 1: OCR ──────────────
  let ocrData;
  try {
    ocrData = await runDissertativaOCR(base64Image, mimeType);
  } catch (error) {
    console.error('❌ [PIPELINE] Falha no OCR:', error.message);
    throw new Error(`Falha na transcrição da prova (OCR): ${error.message}`);
  }

  // ────────────── ETAPA 2: CORREÇÃO ──────────────
  let correctionData;
  try {
    correctionData = await runDissertativaCorrection({
      textoOCR: ocrData.texto_completo || '',
      questoesOCR: ocrData.questoes_identificadas || [],
      gabaritoConteudo: gabarito.conteudo || '',
      disciplina,
      nivel,
      habilidades,
      perfilConteudo,
      criteriosRigorTexto,
      tiposQuestao
    });
  } catch (error) {
    console.error('❌ [PIPELINE] Falha na correção:', error.message);
    throw new Error(`Falha na correção da prova: ${error.message}`);
  }

  // ────────────── ETAPA 3: ANÁLISE PEDAGÓGICA ──────────────
  let analysisData = {};
  try {
    // Montar mapa de habilidades para a análise
    const habilidadesMap = {};
    habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

    // Processar habilidades com pontuação
    const habilidadesPontuacao = (correctionData.habilidades_avaliacao || [])
      .filter(h => h.habilidade_id && h.pontuacao)
      .map(h => ({
        habilidadeId: h.habilidade_id,
        pontuacao: parseFloat(h.pontuacao) || 0,
        justificativa: h.justificativa || ''
      }));

    analysisData = await runAnalysis({
      notaFinal: correctionData.nota_final || 0,
      notaMaxima: 10,
      disciplina,
      nivel,
      exercicios: correctionData.exercicios || [],
      habilidadesPontuacao,
      habilidadesMap
    });
  } catch (error) {
    // Análise é opcional — não falha o pipeline inteiro
    console.warn('⚠️ [PIPELINE] Análise pedagógica falhou (não-crítico):', error.message);
    analysisData = {
      causa_raiz_erro: 'Não foi possível gerar análise automática.',
      ponto_forte: '',
      ponto_atencao: '',
      sugestao_intervencao: ''
    };
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ [PIPELINE] Pipeline dissertativa concluído em ${elapsed}s`);

  return {
    ocrData,
    correctionData,
    analysisData
  };
}

/**
 * Pipeline completo para correção de prova de MÚLTIPLA ESCOLHA.
 * 2 etapas: OCR (IA) → Correção (código)
 * A correção é feita em código, não por IA, para máxima precisão.
 * 
 * @param {Object} params
 * @param {string} params.base64Image - Imagem em base64
 * @param {string} params.mimeType - Tipo MIME da imagem
 * @param {Object} params.gabarito - Gabarito com questões [{numero, respostaCorreta, habilidadeId, pontuacao}]
 * @returns {Object} Resultado completo {ocrData, questoesDetalhes, habilidades, notaFinal, feedbackGeral}
 */
export async function runMultiplaEscolhaPipeline({
  base64Image,
  mimeType,
  gabarito
}) {
  console.log('🚀 [PIPELINE] Iniciando pipeline múltipla escolha...');
  const startTime = Date.now();

  // Verificar configuração
  if (!isVertexAIConfigured()) {
    throw new Error('Vertex AI não configurado. Defina GOOGLE_CLOUD_PROJECT_ID no ambiente ou configure o arquivo de credenciais.');
  }

  // Validar questões do gabarito
  if (!gabarito.questoes || !Array.isArray(gabarito.questoes) || gabarito.questoes.length === 0) {
    throw new Error('Gabarito de múltipla escolha deve ter pelo menos uma questão definida');
  }

  // ────────────── ETAPA 1: OCR ──────────────
  const questoesInfo = gabarito.questoes.map(q =>
    `Questão ${q.numero}: alternativas A, B, C, D${q.respostaCorreta === 'E' ? ', E' : ''}`
  ).join('\n');

  let ocrData;
  try {
    ocrData = await runMultiplaEscolhaOCR(base64Image, mimeType, questoesInfo);
  } catch (error) {
    console.error('❌ [PIPELINE] Falha no OCR múltipla escolha:', error.message);
    throw new Error(`Falha na leitura das respostas (OCR): ${error.message}`);
  }

  // ────────────── ETAPA 2: CORREÇÃO EM CÓDIGO ──────────────
  console.log('📊 [PIPELINE] Etapa 2 — Correção em código (determinístico)...');

  let questoesDetalhes = [];
  let habilidadesAcertadas = [];
  let habilidadesErradas = [];
  let totalPontos = 0;
  let pontosObtidos = 0;

  gabarito.questoes.forEach((questaoGabarito) => {
    const respostaAluno = ocrData.respostas.find(r => r.numero === questaoGabarito.numero);
    const respostaMarcada = respostaAluno?.resposta_aluno?.toUpperCase().trim();
    const respostaCorreta = questaoGabarito.respostaCorreta.toUpperCase().trim();
    const confianca = respostaAluno?.confianca || 'desconhecida';

    // Verificar se acertou (exclui ilegível, em branco, dupla)
    const respostasInvalidas = ['N/A', 'ILEGIVEL', 'EM_BRANCO', 'DUPLA'];
    const acertou = respostaMarcada === respostaCorreta && !respostasInvalidas.includes(respostaMarcada);

    const pontuacao = questaoGabarito.pontuacao || 1;
    const notaQuestao = acertou ? pontuacao : 0;

    totalPontos += pontuacao;
    pontosObtidos += notaQuestao;

    // Gerar feedback específico
    let feedback;
    if (acertou) {
      feedback = 'Resposta correta!';
    } else if (respostaMarcada === 'EM_BRANCO' || !respostaMarcada) {
      feedback = `Questão não respondida. A resposta correta era: ${respostaCorreta}`;
    } else if (respostaMarcada === 'ILEGIVEL') {
      feedback = `Resposta não identificada (ilegível). A resposta correta era: ${respostaCorreta}`;
    } else if (respostaMarcada === 'DUPLA') {
      feedback = `Mais de uma alternativa marcada (anulada). A resposta correta era: ${respostaCorreta}`;
    } else {
      feedback = `Resposta incorreta. Você marcou ${respostaMarcada}, a correta é ${respostaCorreta}`;
    }

    questoesDetalhes.push({
      numero: questaoGabarito.numero,
      respostaAluno: respostaMarcada || 'N/A',
      respostaCorreta: respostaCorreta,
      acertou,
      nota: notaQuestao,
      notaMaxima: pontuacao,
      habilidadeId: questaoGabarito.habilidadeId,
      confiancaOCR: confianca,
      feedback
    });

    // Mapear habilidades
    if (questaoGabarito.habilidadeId) {
      if (acertou) {
        if (!habilidadesAcertadas.includes(questaoGabarito.habilidadeId)) {
          habilidadesAcertadas.push(questaoGabarito.habilidadeId);
        }
      } else {
        if (!habilidadesErradas.includes(questaoGabarito.habilidadeId)) {
          habilidadesErradas.push(questaoGabarito.habilidadeId);
        }
      }
    }
  });

  // Calcular nota final (0-10)
  const notaFinal = totalPontos > 0 ? (pontosObtidos / totalPontos) * 10 : 0;
  const percentualAcerto = totalPontos > 0 ? (pontosObtidos / totalPontos) * 100 : 0;

  const feedbackGeral = `Resultado: ${pontosObtidos} de ${totalPontos} pontos (${percentualAcerto.toFixed(1)}%). Nota: ${notaFinal.toFixed(2)}/10.`;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ [PIPELINE] Pipeline múltipla escolha concluído em ${elapsed}s`);

  return {
    ocrData,
    questoesDetalhes,
    habilidadesAcertadas,
    habilidadesErradas,
    notaFinal,
    percentualAcerto,
    feedbackGeral
  };
}

export default {
  runDissertativaPipeline,
  runMultiplaEscolhaPipeline
};
