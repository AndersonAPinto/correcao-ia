import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync } from 'fs';

// Helper to get user ID from request
export async function requireAuth(request) {
  const userId = getUserFromRequest(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

// Helper to check if user is admin
export async function requireAdmin(request) {
  const userId = await requireAuth(request);
  const { db } = await connectToDatabase();

  const user = await db.collection('users').findOne({ id: userId });
  if (!user || !user.isAdmin) {
    throw new Error('Forbidden - Admin only');
  }

  return userId;
}

// Helper to create notification
export async function createNotification(db, userId, tipo, mensagem, avaliacaoId = null) {
  await db.collection('notificacoes').insertOne({
    id: uuidv4(),
    userId,
    tipo,
    mensagem,
    lida: false,
    avaliacaoId,
    createdAt: new Date()
  });
}

// Helper to get Vertex AI client
function getVertexAIClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID não configurado no .env');
  }

  const clientOptions = {
    project: projectId,
    location: location,
  };

  if (credentialsPath) {
    try {
      const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
      clientOptions.credentials = credentials;
    } catch (error) {
      console.error('Error loading credentials file:', error);
      throw new Error('Failed to load credentials file');
    }
  }

  return new VertexAI(clientOptions);
}

// Call Vertex AI for generating content (substitui callGeminiAPI)
export async function callGeminiAPI(apiKey, prompt) {
  // apiKey não é mais usado, mantido para compatibilidade
  try {
    const vertexAI = getVertexAIClient();
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
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

// Helper function to call Vertex AI with retry and validation (substitui callGeminiAPIWithRetry)
export async function callGeminiAPIWithRetry(url, body, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Extrair dados do body
      const bodyData = typeof body === 'object' && body.body
        ? JSON.parse(body.body)
        : typeof body === 'string'
          ? JSON.parse(body)
          : body;

      // Determinar modelo pela URL
      let modelName = 'gemini-1.5-pro';
      if (url && url.includes('gemini-1.5-flash')) {
        modelName = 'gemini-1.5-flash';
      }

      const vertexAI = getVertexAIClient();
      const generationConfig = bodyData.generationConfig || {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      };

      const model = vertexAI.preview.getGenerativeModel({
        model: modelName,
        generationConfig: generationConfig,
      });

      // Extrair conteúdo (texto e/ou imagem)
      const contents = bodyData.contents || [];
      if (contents.length === 0 || !contents[0].parts) {
        throw new Error('Invalid request format');
      }

      const parts = contents[0].parts;
      const imagePart = parts.find(p => p.inline_data);
      const textPart = parts.find(p => p.text);

      const requestParts = [];
      if (imagePart) {
        requestParts.push({
          inlineData: {
            mimeType: imagePart.inline_data.mime_type,
            data: imagePart.inline_data.data
          }
        });
      }
      if (textPart) {
        requestParts.push({ text: textPart.text });
      }

      const request = {
        contents: [{
          role: 'user',
          parts: requestParts
        }]
      };

      const streamingResp = await model.generateContent(request);
      const response = await streamingResp.response;

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('No candidates in Vertex AI response');
      }

      const candidate = response.candidates[0];
      if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
        throw new Error('Invalid response structure from Vertex AI');
      }

      const responseText = candidate.content.parts[0].text;
      if (!responseText) {
        throw new Error('Empty response from Vertex AI');
      }

      return responseText;

    } catch (error) {
      lastError = error;

      // Se for rate limit ou erro temporário, fazer retry
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1);
        console.warn(`Vertex AI call failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitTime}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
    }
  }

  throw lastError || new Error('Failed to call Vertex AI after all retries');
}
