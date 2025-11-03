import { v4 as uuidv4 } from 'uuid';
import PerfilAvaliacaoRepository from '@/lib/repositories/PerfilAvaliacaoRepository';
import SettingsRepository from '@/lib/repositories/SettingsRepository';

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

  async getPerfis ByUserId(userId) {
    return await PerfilAvaliacaoRepository.findByUserId(userId);
  }

  async generatePerfilWithAI(conteudo) {
    if (!conteudo) {
      throw new Error('Content is required to generate profile');
    }

    // Get admin Gemini API key
    const adminSettings = await SettingsRepository.findOne({ userId: { $exists: true } });
    
    if (!adminSettings || !adminSettings.geminiApiKey) {
      throw new Error('Gemini API key not configured by admin');
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${adminSettings.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API call failed');
    }

    const data = await response.json();
    const resultado = data.candidates[0].content.parts[0].text;

    return resultado;
  }
}

export default new PerfilAvaliacaoService();
