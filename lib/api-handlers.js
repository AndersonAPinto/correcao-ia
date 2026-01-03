import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  const credentialsEnv = process.env.GOOGLE_CLOUD_CREDENTIALS;

  let credentials = null;

  // Prioridade 1: Variável de ambiente com o JSON das credenciais (Seguro para produção/Vercel)
  if (credentialsEnv) {
    try {
      credentials = JSON.parse(credentialsEnv);
      console.log('✅ Usando credenciais do Google Cloud via variável de ambiente');
    } catch (error) {
      console.error('Erro ao processar GOOGLE_CLOUD_CREDENTIALS:', error);
    }
  }

  // Prioridade 2: Arquivo físico (Apenas para desenvolvimento local)
  if (!credentials) {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const possiblePaths = [];

    if (credentialsPath) {
      possiblePaths.push(credentialsPath.startsWith('/') ? credentialsPath : resolve(process.cwd(), credentialsPath));
    }
    possiblePaths.push(resolve(process.cwd(), 'credentials', 'corregia-6149da8400ee.json'));
    possiblePaths.push(resolve(process.cwd(), 'credencials', 'corregia-6149da8400ee.json'));

    for (const path of possiblePaths) {
      try {
        credentials = JSON.parse(readFileSync(path, 'utf8'));
        console.warn('⚠️ Usando arquivo físico de credenciais. Recomenda-se usar variáveis de ambiente em produção.');
        break;
      } catch (error) {
        continue;
      }
    }
  }

  if (!credentials || !projectId) {
    throw new Error('Google Cloud credentials or Project ID not configured properly.');
  }

  const clientOptions = {
    project: projectId,
    location: location,
    credentials: credentials,
  };

  return new VertexAI(clientOptions);
}

// Call Vertex AI for generating content (substitui callGeminiAPI)
export async function callGeminiAPI(apiKey, prompt) {
  // apiKey não é mais usado, mantido para compatibilidade
  try {
    const vertexAI = getVertexAIClient();
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.0-flash',
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

  console.log('🔄 [VERTEX AI] Iniciando chamada com retry. Max tentativas:', maxRetries);

  // Lista de modelos para tentar em ordem (fallback)
  // Atualizado para usar Gemini 2.0 que estão disponíveis
  const modelosParaTentar = ['gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
  let modeloAtualIndex = 0;

  // Determinar modelo inicial pela URL
  if (url && url.includes('gemini-2.0-flash-exp')) {
    modeloAtualIndex = 1;
  } else if (url && url.includes('gemini-1.5-flash')) {
    modeloAtualIndex = 3;
  } else if (url && url.includes('gemini-pro')) {
    modeloAtualIndex = 4;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 [VERTEX AI] Tentativa ${attempt + 1}/${maxRetries}`);

      // Extrair dados do body
      const bodyData = typeof body === 'object' && body.body
        ? JSON.parse(body.body)
        : typeof body === 'string'
          ? JSON.parse(body)
          : body;

      console.log('📊 [VERTEX AI] Body data extraído:', {
        hasContents: !!bodyData.contents,
        contentsLength: bodyData.contents?.length || 0,
        hasParts: !!bodyData.contents?.[0]?.parts,
        partsLength: bodyData.contents?.[0]?.parts?.length || 0
      });

      // Tentar modelos em ordem até encontrar um disponível
      let modelName = modelosParaTentar[modeloAtualIndex];
      let modeloEncontrado = false;

      while (modeloAtualIndex < modelosParaTentar.length && !modeloEncontrado) {
        modelName = modelosParaTentar[modeloAtualIndex];
        console.log('🤖 [VERTEX AI] Tentando modelo:', modelName);

        try {
          const vertexAI = getVertexAIClient();
          console.log('✅ [VERTEX AI] Cliente Vertex AI criado');

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

          console.log('✅ [VERTEX AI] Modelo configurado');

          // Extrair conteúdo (texto e/ou imagem)
          const contents = bodyData.contents || [];
          if (contents.length === 0 || !contents[0].parts) {
            console.error('❌ [VERTEX AI] Formato de requisição inválido');
            throw new Error('Invalid request format');
          }

          const parts = contents[0].parts;
          const imagePart = parts.find(p => p.inline_data);
          const textPart = parts.find(p => p.text);

          console.log('📊 [VERTEX AI] Parts extraídas:', {
            hasImagePart: !!imagePart,
            hasTextPart: !!textPart,
            imageMimeType: imagePart?.inline_data?.mime_type,
            imageDataLength: imagePart?.inline_data?.data?.length || 0,
            textLength: textPart?.text?.length || 0
          });

          const requestParts = [];
          if (imagePart) {
            const imageDataLength = imagePart.inline_data.data.length;
            console.log('🖼️ [VERTEX AI] Adicionando imagem:', {
              mimeType: imagePart.inline_data.mime_type,
              dataLength: imageDataLength,
              estimatedSizeMB: (imageDataLength * 3 / 4 / 1024 / 1024).toFixed(2)
            });

            requestParts.push({
              inlineData: {
                mimeType: imagePart.inline_data.mime_type,
                data: imagePart.inline_data.data
              }
            });
          }
          if (textPart) {
            console.log('📝 [VERTEX AI] Adicionando texto. Tamanho:', textPart.text.length);
            requestParts.push({ text: textPart.text });
          }

          if (requestParts.length === 0) {
            console.error('❌ [VERTEX AI] Nenhuma parte válida encontrada');
            throw new Error('No valid parts found in request');
          }

          const request = {
            contents: [{
              role: 'user',
              parts: requestParts
            }]
          };

          console.log('📤 [VERTEX AI] Enviando requisição para Vertex AI...');
          const streamingResp = await model.generateContent(request);
          const response = await streamingResp.response;

          console.log('✅ [VERTEX AI] Resposta recebida');

          if (!response.candidates || response.candidates.length === 0) {
            console.error('❌ [VERTEX AI] Nenhum candidato na resposta');
            throw new Error('No candidates in Vertex AI response');
          }

          const candidate = response.candidates[0];
          if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
            console.error('❌ [VERTEX AI] Estrutura de resposta inválida');
            throw new Error('Invalid response structure from Vertex AI');
          }

          const responseText = candidate.content.parts[0].text;
          if (!responseText) {
            console.error('❌ [VERTEX AI] Resposta vazia');
            throw new Error('Empty response from Vertex AI');
          }

          console.log('✅ [VERTEX AI] Resposta processada com sucesso. Tamanho:', responseText.length);
          modeloEncontrado = true;
          return responseText;

        } catch (error) {
          // Se for erro 404 (modelo não encontrado) e ainda houver modelos para tentar
          const isModelNotFound = error.message && (
            error.message.includes('404') ||
            error.message.includes('NOT_FOUND') ||
            error.message.includes('was not found')
          );

          if (isModelNotFound && modeloAtualIndex < modelosParaTentar.length - 1) {
            modeloAtualIndex++;
            console.warn(`⚠️ [VERTEX AI] Modelo ${modelName} não disponível. Tentando próximo modelo...`);
            continue; // Tentar próximo modelo
          }

          // Se não for erro de modelo não encontrado ou já tentou todos, propagar o erro
          lastError = error;
          console.error(`❌ [VERTEX AI] Erro na tentativa ${attempt + 1} com modelo ${modelName}:`, {
            message: error.message,
            code: error.code,
            status: error.status,
            name: error.name
          });

          // Se já tentou todos os modelos, quebrar o loop
          if (modeloAtualIndex >= modelosParaTentar.length - 1) {
            break;
          }

          // Se não for erro de modelo, quebrar o loop também
          if (!isModelNotFound) {
            break;
          }
        }
      }

      // Se chegou aqui e não encontrou modelo, fazer retry na próxima tentativa
      if (!modeloEncontrado && attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1);
        console.warn(`⏳ [VERTEX AI] Aguardando ${waitTime}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        modeloAtualIndex = 0; // Resetar para tentar todos os modelos novamente
        continue;
      }

    } catch (error) {
      lastError = error;
      console.error(`❌ [VERTEX AI] Erro geral na tentativa ${attempt + 1}:`, {
        message: error.message,
        code: error.code,
        status: error.status,
        name: error.name
      });

      // Se for rate limit ou erro temporário, fazer retry
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1);
        console.warn(`⏳ [VERTEX AI] Aguardando ${waitTime}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        modeloAtualIndex = 0; // Resetar para tentar todos os modelos novamente
        continue;
      }
    }
  }

  console.error('❌ [VERTEX AI] Todas as tentativas falharam');

  // Mensagem de erro mais clara
  if (lastError && lastError.message && lastError.message.includes('404')) {
    const errorMsg = `
❌ ERRO: Nenhum modelo Gemini está disponível no seu projeto do Google Cloud.

🔧 SOLUÇÃO NECESSÁRIA:
1. Acesse o Google Cloud Console: https://console.cloud.google.com
2. Selecione o projeto: corregia
3. Vá em "APIs e Serviços" > "Biblioteca"
4. Procure e HABILITE as seguintes APIs:
   - Vertex AI API
   - Generative Language API
5. Verifique se a conta de serviço tem a permissão "Vertex AI User" (roles/aiplatform.user)
6. Aguarde alguns minutos para as APIs serem ativadas

📝 Modelos tentados (todos retornaram 404):
   - gemini-2.0-flash
   - gemini-2.0-flash-exp
   - gemini-1.5-pro
   - gemini-1.5-flash  
   - gemini-pro

⚠️ Isso NÃO é problema de créditos no Vercel, mas sim configuração no Google Cloud.
    `.trim();

    throw new Error(errorMsg);
  }

  throw lastError || new Error('Failed to call Vertex AI after all retries');
}

