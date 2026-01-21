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
    throw new Error('🔒 Acesso negado. Por favor, realize o login para continuar.');
  }
  return userId;
}

// Helper to check if user is admin
export async function requireAdmin(request) {
  const userId = await requireAuth(request);
  const { db } = await connectToDatabase();

  const user = await db.collection('users').findOne({ id: userId });
  if (!user || !user.isAdmin) {
    throw new Error('🚫 Acesso restrito. Esta área é exclusiva para administradores.');
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

/**
 * LOGS DE AUDITORIA (Segurança Nível 10)
 * Registra ações críticas para rastreabilidade
 */
export async function logAudit(request, userId, acao, detalhes = {}) {
  try {
    const { db } = await connectToDatabase();
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await db.collection('logs_auditoria').insertOne({
      id: uuidv4(),
      userId,
      acao,
      detalhes,
      ip,
      userAgent,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Falha ao registrar log de auditoria:', error);
  }
}

/**
 * RATE LIMITING PERSISTENTE (Anti-Brute Force)
 * Bloqueia tentativas excessivas de login/ações por IP e e-mail
 */
export async function checkRateLimit(request, identifier, type = 'login', maxAttempts = 5, windowMinutes = 15) {
  const { db } = await connectToDatabase();
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const attempts = await db.collection('rate_limits').countDocuments({
    $or: [{ identifier }, { ip }],
    type,
    createdAt: { $gte: windowStart }
  });

  if (attempts >= maxAttempts) {
    await logAudit(request, 'system', 'rate_limit_blocked', { identifier, ip, type, attempts });
    return {
      blocked: true,
      remainingMinutes: Math.ceil((windowStart.getTime() + windowMinutes * 60 * 1000 - now.getTime()) / 60000)
    };
  }

  return { blocked: false };
}

export async function registerAttempt(request, identifier, type = 'login') {
  const { db } = await connectToDatabase();
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  await db.collection('rate_limits').insertOne({
    id: uuidv4(),
    identifier,
    ip,
    type,
    createdAt: new Date()
  });
}

// Helper para verificar se um project ID é um placeholder
function isProjectIdPlaceholder(projectId) {
  if (!projectId) return true;
  const lower = projectId.toLowerCase();
  return projectId === 'corregia' ||
    projectId === 'seu-project-id-aqui' ||
    lower.includes('corregia') ||
    lower.includes('seu-projeto') ||
    lower.includes('your-project');
}

// Helper to check if Vertex AI is configured (extracts project_id from JSON if needed)
export function isVertexAIConfigured() {
  let projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const credentialsEnv = process.env.GOOGLE_CLOUD_CREDENTIALS;
  let credentials = null;

  // Prioridade 1: Variável de ambiente com o JSON das credenciais (Seguro para produção/Vercel)
  if (credentialsEnv && credentialsEnv !== 'null' && credentialsEnv !== 'undefined') {
    try {
      credentials = JSON.parse(credentialsEnv);
      // Se o Project ID for placeholder, tentar pegar do JSON
      if (isProjectIdPlaceholder(projectId) && credentials.project_id && !isProjectIdPlaceholder(credentials.project_id)) {
        projectId = credentials.project_id;
      }
    } catch (error) {
      console.error('❌ [VERTEX AI] Erro ao processar GOOGLE_CLOUD_CREDENTIALS:', error.message);
    }
  }

  // Prioridade 2: Arquivo físico (apenas se GOOGLE_APPLICATION_CREDENTIALS estiver definido)
  if (!credentials) {
    const envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (envCredentialsPath) {
      try {
        const path = envCredentialsPath.startsWith('/') ? envCredentialsPath : resolve(process.cwd(), envCredentialsPath);
        credentials = JSON.parse(readFileSync(path, 'utf8'));
        // Se o Project ID for placeholder, tentar pegar do arquivo
        if (isProjectIdPlaceholder(projectId) && credentials.project_id && !isProjectIdPlaceholder(credentials.project_id)) {
          projectId = credentials.project_id;
        }
      } catch (error) {
        // Ignorar erro, continuar sem credenciais de arquivo
      }
    }
  }

  return !!(projectId && !isProjectIdPlaceholder(projectId) && credentials);
}

// Helper to get Vertex AI client
export function getVertexAIClient() {
  let projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-east4';
  const credentialsEnv = process.env.GOOGLE_CLOUD_CREDENTIALS;
  let credentials = null;
  let credentialsPathFound = null;

  // Prioridade 1: Variável de ambiente com o JSON das credenciais (Seguro para produção/Vercel)
  if (credentialsEnv && credentialsEnv !== 'null' && credentialsEnv !== 'undefined') {
    try {
      credentials = JSON.parse(credentialsEnv);
      // Corrigir possíveis problemas com quebras de linha na chave privada
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      // Se o Project ID for placeholder, tentar pegar do JSON
      if (isProjectIdPlaceholder(projectId) && credentials.project_id && !isProjectIdPlaceholder(credentials.project_id)) {
        projectId = credentials.project_id;
      }
    } catch (error) {
      console.error('❌ [VERTEX AI] Erro ao processar GOOGLE_CLOUD_CREDENTIALS:', error.message);
    }
  }

  // Prioridade 2: Arquivo físico (apenas se GOOGLE_APPLICATION_CREDENTIALS estiver definido)
  if (!credentials) {
    const envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (envCredentialsPath) {
      try {
        const path = envCredentialsPath.startsWith('/') ? envCredentialsPath : resolve(process.cwd(), envCredentialsPath);
        credentials = JSON.parse(readFileSync(path, 'utf8'));
        credentialsPathFound = path;
        // Se o Project ID for placeholder, tentar pegar do arquivo
        if (isProjectIdPlaceholder(projectId) && credentials.project_id && !isProjectIdPlaceholder(credentials.project_id)) {
          projectId = credentials.project_id;
        }
      } catch (error) {
        // Ignorar erro, continuar sem credenciais de arquivo
      }
    }
  }

  if (!projectId || isProjectIdPlaceholder(projectId) || !credentials) {
    throw new Error(`Google Cloud Project ID is not configured properly. (Value: ${projectId})`);
  }

  const clientOptions = {
    project: projectId,
    location: location,
    googleAuthOptions: { credentials }
  };

  if (credentialsPathFound) {
    // Definir a variável de ambiente para que outras partes do SDK (como Auth) encontrem
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPathFound;
  }

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

  // Padrão: Gemini 2.0 Flash (rápido e eficiente)
  // Fallback automático apenas se não disponível
  const modelosParaTentar = ['gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  let modeloAtualIndex = 0;

  if (url && url.includes('gemini-1.5-pro')) {
    modeloAtualIndex = 3;
  } else if (url && url.includes('gemini-1.5-flash')) {
    modeloAtualIndex = 2;
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

          // Se for erro de autenticação ou permissão, não adianta tentar outros modelos
          if (error.message && (
            error.message.includes('auth') ||
            error.message.includes('authentication') ||
            error.message.includes('permission') ||
            error.message.includes('401') ||
            error.message.includes('403')
          )) {
            console.error('🔐 [VERTEX AI] Erro crítico de autenticação ou permissão detectado.');
            throw error;
          }

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

  // Mensagem de erro mais clara para autenticação
  if (lastError && (lastError.message.includes('auth') || lastError.message.includes('authentication') || lastError.message.includes('credential'))) {
    const authErrorMsg = `
❌ ERRO DE AUTENTICAÇÃO: Não foi possível autenticar com o Google Cloud Vertex AI.

🔧 SOLUÇÕES POSSÍVEIS:
1. Localmente: Execute no terminal: gcloud auth application-default login
2. Produção: Verifique se a variável GOOGLE_CLOUD_CREDENTIALS contém o JSON da sua conta de serviço.
3. Verifique se o arquivo JSON de credenciais existe na pasta 'credentials/' do projeto.
4. Verifique se o Project ID (${process.env.GOOGLE_CLOUD_PROJECT_ID}) está correto no seu .env.

DICA: Se você estiver usando gcloud, certifique-se de que o projeto correto está selecionado: gcloud config set project ${process.env.GOOGLE_CLOUD_PROJECT_ID}

Detalhes do erro: ${lastError.message}
    `.trim();
    throw new Error(authErrorMsg);
  }

  // Mensagem de erro mais clara para APIs não ativadas
  if (lastError && lastError.message && (lastError.message.includes('404') || lastError.message.includes('not found') || lastError.message.includes('not enabled'))) {
    const errorMsg = `
❌ ERRO: Modelo não encontrado ou API não ativada no Google Cloud.

🔧 SOLUÇÃO PASSO A PASSO:
1. Acesse o Console: https://console.cloud.google.com
2. Verifique o Projeto: Certifique-se de que o projeto "${process.env.GOOGLE_CLOUD_PROJECT_ID}" está selecionado no topo.
3. Se não encontrar "Vertex AI" no menu lateral:
   - Clique na barra de pesquisa no topo e digite "Vertex AI API".
   - Clique no resultado "Vertex AI API".
   - Clique no botão azul "ATIVAR" (ou "ENABLE").
4. Habilite também a "Generative Language API" da mesma forma.
5. Verifique a Região: Você está usando a região "${process.env.GOOGLE_CLOUD_LOCATION || 'us-east4'}". Verifique se o Vertex AI está disponível nela.

DICA: Se você estiver no Brasil e quiser menor latência, tente usar "southamerica-east1" no seu .env.

Modelos tentados: ${modelosParaTentar.join(', ')}
    `.trim();
    throw new Error(errorMsg);
  }

  throw lastError || new Error('Failed to call Vertex AI after all retries');
}

