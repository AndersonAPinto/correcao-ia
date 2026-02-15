/**
 * Módulo de Prompts — Exporta todos os builders de prompt.
 * 
 * Arquitetura Anti-Alucinação:
 * - OCR: Apenas transcreve (não corrige)
 * - Correção: Trabalha com texto (não imagem), compara com gabarito
 * - Análise: Gera insights a partir dos resultados (não da prova)
 */

export { buildDissertativaOCRPrompt, buildMultiplaEscolhaOCRPrompt } from './ocrPrompt';
export { buildDissertativaCorrectionPrompt } from './correctionPrompt';
export { buildAnalysisPrompt } from './analysisPrompt';
