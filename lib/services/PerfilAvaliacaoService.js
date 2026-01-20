import { v4 as uuidv4 } from 'uuid';
import PerfilAvaliacaoRepository from '@/lib/repositories/PerfilAvaliacaoRepository';
import SettingsRepository from '@/lib/repositories/SettingsRepository';
import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getVertexAIClient } from '@/lib/api-handlers';

export class PerfilAvaliacaoService {
  async createPerfil(userId, nome, conteudo, arquivoUrl) {
    if (!nome) {
      throw new Error('Profile name is required');
    }

    const perfilData = {
      id: uuidv4(),
      userId,
      nome,
      conteudo: conteudo || '',
      arquivoUrl: arquivoUrl || '',
      createdAt: new Date()
    };

    await PerfilAvaliacaoRepository.createPerfil(perfilData);
    return perfilData;
  }

  async getPerfisByUserId(userId) {
    return await PerfilAvaliacaoRepository.findByUserId(userId);
  }

  async generatePerfilWithAI(conteudo) {
    if (!conteudo) {
      throw new Error('Content is required to generate profile');
    }

    const prompt = `Você é um especialista em avaliação educacional. Com base no seguinte texto, gere um perfil de avaliação estruturado e profissional que possa ser usado para corrigir provas de alunos.

Texto base:
${conteudo}

Crie um perfil de avaliação que inclua:
1. Critérios de avaliação claros
2. Escala de pontuação
3. Diretrizes de correção
4. Aspectos a serem considerados

Formato: Texto estruturado, claro e objetivo.`;

    try {
      const vertexAI = getVertexAIClient();
      const model = vertexAI.preview.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });

      const request = {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      };

      const streamingResp = await model.generateContent(request);
      const response = await streamingResp.response;

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates in Vertex AI response');
      }

      return response.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Vertex AI error:', error);
      throw new Error(`Vertex AI call failed: ${error.message}`);
    }
  }
}

export default new PerfilAvaliacaoService();

