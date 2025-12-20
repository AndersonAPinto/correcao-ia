import { v4 as uuidv4 } from 'uuid';
import PerfilAvaliacaoRepository from '@/lib/repositories/PerfilAvaliacaoRepository';
import SettingsRepository from '@/lib/repositories/SettingsRepository';
import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

    let projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Se não houver projectId ou for um placeholder, vamos usar o do arquivo de credenciais
    const isPlaceholder = !projectId ||
      projectId === 'seu-project-id-aqui' ||
      projectId.toLowerCase().includes('seu') ||
      projectId.toLowerCase().includes('your') ||
      projectId.toLowerCase().includes('placeholder');

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
      // Se não houver caminho definido, tentar caminhos padrão
      const possiblePaths = [];

      if (credentialsPath) {
        if (!credentialsPath.startsWith('/')) {
          possiblePaths.push(resolve(process.cwd(), credentialsPath));
        } else {
          possiblePaths.push(credentialsPath);
        }
      }

      // Tentar ambos os caminhos possíveis (credentials e credencials)
      possiblePaths.push(resolve(process.cwd(), 'credentials', 'corregia-6149da8400ee.json'));
      possiblePaths.push(resolve(process.cwd(), 'credencials', 'corregia-6149da8400ee.json'));

      // Tentar carregar as credenciais de qualquer caminho disponível
      let credentials = null;
      let credentialsPathFound = null;

      for (const path of possiblePaths) {
        try {
          credentials = JSON.parse(readFileSync(path, 'utf8'));
          credentialsPathFound = path;
          break;
        } catch (error) {
          // Continuar tentando outros caminhos
          continue;
        }
      }

      if (!credentials) {
        console.error('Error loading credentials file:');
        console.error('Tried paths:', possiblePaths);
        throw new Error(`Failed to load credentials file. Tried: ${possiblePaths.map(p => p.split('/').slice(-2).join('/')).join(', ')}`);
      }

      // Se o projectId for um placeholder, usar o do arquivo de credenciais
      if (isPlaceholder && credentials.project_id) {
        projectId = credentials.project_id;
        console.log(`⚠️  Usando Project ID do arquivo de credenciais: ${projectId}`);
      }

      // Definir variável de ambiente para o SDK do Google Cloud
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPathFound;

      const clientOptions = {
        project: projectId,
        location: location,
        credentials: credentials,
      };

      const vertexAI = new VertexAI(clientOptions);
      const model = vertexAI.preview.getGenerativeModel({
        model: 'gemini-2.0-flash',
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

