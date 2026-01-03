import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, verifyPassword, generateToken, getUserFromRequest } from '@/lib/auth';
import { requireAuth, requireAdmin, createNotification, callGeminiAPI, callGeminiAPIWithRetry, logAudit, checkRateLimit, registerAttempt } from '@/lib/api-handlers';
import { ADMIN_EMAIL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { saveImageToMongoDB, getImageFromMongoDB } from '@/lib/fileStorage';

// ==================== AUTH HANDLERS ====================

async function handleRegister(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: '⚠️ Preencha todos os campos obrigatórios (nome, email e senha).' }, { status: 400 });
    }

    // Rate limiting para registros (prevenir bots)
    const rateLimit = await checkRateLimit(request, email, 'register', 3, 60);
    if (rateLimit.blocked) {
      return NextResponse.json({
        error: `🛑 Muitas tentativas de registro. Por segurança, tente novamente em ${rateLimit.remainingMinutes} minutos.`
      }, { status: 429 });
    }

    const { db } = await connectToDatabase();

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      await registerAttempt(request, email, 'register');
      return NextResponse.json({ error: '📧 Este e-mail já está cadastrado no sistema.' }, { status: 400 });
    }

    const userId = uuidv4();
    const hashedPassword = hashPassword(password);
    const isAdmin = email === ADMIN_EMAIL ? 1 : 0;

    await db.collection('users').insertOne({
      id: userId,
      email,
      password: hashedPassword,
      name,
      isAdmin,
      assinatura: 'free',
      createdAt: new Date()
    });

    // Auditoria de Registro
    await logAudit(request, userId, 'user_registered', { email, name });

    await db.collection('creditos').insertOne({
      id: uuidv4(),
      userId,
      saldoAtual: 1000,
      createdAt: new Date()
    });

    await db.collection('transacoes_creditos').insertOne({
      id: uuidv4(),
      userId,
      tipo: 'credito',
      quantidade: 1000,
      descricao: 'Créditos iniciais de boas-vindas',
      createdAt: new Date()
    });

    const token = generateToken(userId);
    return NextResponse.json({ token, user: { id: userId, email, name, isAdmin } });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleLogin(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '⚠️ Por favor, informe seu e-mail e senha.' }, { status: 400 });
    }

    // Rate limiting Anti-Brute Force
    const rateLimit = await checkRateLimit(request, email, 'login', 5, 15);
    if (rateLimit.blocked) {
      return NextResponse.json({
        error: `🛑 Conta bloqueada temporariamente por excesso de tentativas. Tente novamente em ${rateLimit.remainingMinutes} minutos.`
      }, { status: 429 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user || !verifyPassword(password, user.password)) {
      // Registrar tentativa falha
      await registerAttempt(request, email, 'login');
      await logAudit(request, 'anonymous', 'login_failed', { email });

      return NextResponse.json({ error: '❌ E-mail ou senha incorretos.' }, { status: 401 });
    }

    // Auditoria de Login Sucesso
    await logAudit(request, user.id, 'login_success', { email });

    const token = generateToken(user.id);
    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin || 0 }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGetMe(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ id: userId });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin || 0,
        assinatura: user.assinatura || 'free'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== TURMAS HANDLERS ====================

async function handleCreateTurma(request) {
  try {
    const userId = await requireAuth(request);
    const { nome } = await request.json();

    if (!nome) {
      return NextResponse.json({ error: '⚠️ O nome da turma é obrigatório.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const turma = {
      id: uuidv4(),
      userId,
      nome,
      createdAt: new Date()
    };

    await db.collection('turmas').insertOne(turma);
    return NextResponse.json({ turma });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGetTurmas(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const turmas = await db.collection('turmas')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ turmas });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== ALUNOS HANDLERS ====================

async function handleCreateAluno(request) {
  try {
    const userId = await requireAuth(request);
    const { turmaId, nome } = await request.json();

    if (!turmaId || !nome) {
      return NextResponse.json({ error: '⚠️ Nome do aluno e ID da turma são obrigatórios.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Verify turma belongs to user
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: '❌ Turma não encontrada ou você não tem permissão.' }, { status: 404 });
    }

    const aluno = {
      id: uuidv4(),
      turmaId,
      nome,
      createdAt: new Date()
    };

    await db.collection('alunos').insertOne(aluno);
    return NextResponse.json({ aluno });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGetAlunos(request, turmaId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    // Verify turma belongs to user
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    const alunos = await db.collection('alunos')
      .find({ turmaId })
      .sort({ nome: 1 })
      .toArray();

    return NextResponse.json({ alunos });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== PERFIS DE AVALIAÇÃO HANDLERS ====================

async function handleCreatePerfil(request) {
  try {
    const userId = await requireAuth(request);
    const formData = await request.formData();

    const nome = formData.get('nome');
    const conteudo = formData.get('conteudo');
    const arquivo = formData.get('arquivo');

    if (!nome) {
      return NextResponse.json({ error: '⚠️ O nome do perfil é obrigatório.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    let arquivoUrl = '';

    // Handle file upload if provided
    if (arquivo && arquivo.size > 0) {
      const bytes = await arquivo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), 'public', 'perfis');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filename = `${uuidv4()}-${arquivo.name}`;
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      arquivoUrl = `/perfis/${filename}`;
    }

    const perfil = {
      id: uuidv4(),
      userId,
      nome,
      conteudo: conteudo || '',
      arquivoUrl,
      createdAt: new Date()
    };

    await db.collection('perfis_avaliacao').insertOne(perfil);
    return NextResponse.json({ perfil });
  } catch (error) {
    console.error('Create perfil error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleGetPerfis(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const perfis = await db.collection('perfis_avaliacao')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ perfis });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGerarPerfil(request) {
  try {
    const userId = await requireAuth(request);
    const { conteudo } = await request.json();

    if (!conteudo) {
      return NextResponse.json({ error: '⚠️ Por favor, forneça o conteúdo base para gerar o perfil.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Verificar configuração do Vertex AI
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({
        error: 'Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT_ID in .env'
      }, { status: 400 });
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

    const resultado = await callGeminiAPI(null, prompt); // apiKey não é mais usado, mantido para compatibilidade

    return NextResponse.json({ perfilGerado: resultado });
  } catch (error) {
    console.error('Generate perfil error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==================== GABARITOS HANDLERS ====================

async function handleCreateGabarito(request) {
  try {
    const userId = await requireAuth(request);
    const formData = await request.formData();

    const titulo = formData.get('titulo');
    const conteudo = formData.get('conteudo');
    const perfilAvaliacaoId = formData.get('perfilAvaliacaoId');
    const arquivo = formData.get('arquivo');

    if (!titulo) {
      return NextResponse.json({ error: '⚠️ O título do gabarito é obrigatório.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    let arquivoUrl = '';

    // Handle file upload if provided
    if (arquivo && arquivo.size > 0) {
      const bytes = await arquivo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), 'public', 'gabaritos');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filename = `${uuidv4()}-${arquivo.name}`;
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      arquivoUrl = `/gabaritos/${filename}`;
    }

    const gabarito = {
      id: uuidv4(),
      userId,
      titulo,
      conteudo: conteudo || '',
      perfilAvaliacaoId: perfilAvaliacaoId || '',
      arquivoUrl,
      createdAt: new Date()
    };

    await db.collection('gabaritos').insertOne(gabarito);
    return NextResponse.json({ gabarito });
  } catch (error) {
    console.error('Create gabarito error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleGetGabaritos(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const gabaritos = await db.collection('gabaritos')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ gabaritos });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== UPLOAD & ASSESSMENT HANDLERS ====================

// Handler para questões dissertativas - OCR + correção com Vertex AI
async function handleDissertativaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db) {
  try {
    console.log('📝 [DISSERTATIVA] Iniciando processamento...');

    // Verificar turma e aluno
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      console.error('❌ [DISSERTATIVA] Turma não encontrada:', turmaId);
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    const aluno = await db.collection('alunos').findOne({ id: alunoId, turmaId });
    if (!aluno) {
      console.error('❌ [DISSERTATIVA] Aluno não encontrado:', alunoId);
      return NextResponse.json({ error: 'Aluno not found' }, { status: 404 });
    }

    console.log('✅ [DISSERTATIVA] Turma e aluno verificados');

    // Salvar arquivo
    console.log('💾 [DISSERTATIVA] Lendo arquivo...');
    console.log('📄 [DISSERTATIVA] File info:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    let bytes;
    try {
      bytes = await file.arrayBuffer();
      console.log('✅ [DISSERTATIVA] Arquivo lido. Tamanho do buffer:', bytes.byteLength, 'bytes');
    } catch (error) {
      console.error('❌ [DISSERTATIVA] Erro ao ler arrayBuffer:', error);
      throw new Error(`Erro ao ler arquivo: ${error.message}`);
    }

    if (!bytes || bytes.byteLength === 0) {
      console.error('❌ [DISSERTATIVA] Buffer vazio ou inválido');
      throw new Error('Arquivo vazio ou inválido');
    }

    const buffer = Buffer.from(bytes);
    console.log('✅ [DISSERTATIVA] Buffer criado. Tamanho:', buffer.length, 'bytes');

    // Salvar imagem no MongoDB GridFS
    const filename = `${uuidv4()}-${file.name}`;
    const mimeType = file.type || 'image/jpeg';

    let imageId;
    try {
      imageId = await saveImageToMongoDB(buffer, filename, mimeType);
      console.log('✅ [DISSERTATIVA] Imagem salva no MongoDB. ID:', imageId);
    } catch (error) {
      console.error('❌ [DISSERTATIVA] Erro ao salvar imagem no MongoDB:', error);
      throw new Error(`Erro ao salvar imagem: ${error.message}`);
    }

    // URL para acessar a imagem via API
    const imageUrl = `/api/images/${imageId}`;

    // Verificar configuração do Vertex AI
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      console.error('❌ [DISSERTATIVA] Project ID não configurado');
      return NextResponse.json({
        error: 'Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT_ID in .env'
      }, { status: 400 });
    }

    // Converter imagem para base64
    console.log('🔄 [DISSERTATIVA] Convertendo imagem para base64...');
    const base64Image = buffer.toString('base64');

    console.log('✅ [DISSERTATIVA] Base64 criado:', {
      base64Length: base64Image.length,
      mimeType: mimeType,
      estimatedSizeMB: (base64Image.length * 3 / 4 / 1024 / 1024).toFixed(2)
    });

    if (!base64Image || base64Image.length === 0) {
      console.error('❌ [DISSERTATIVA] Base64 vazio ou inválido');
      throw new Error('Erro ao converter imagem para base64');
    }

    // Buscar perfil de avaliação se existir
    let perfilConteudo = '';
    let criteriosRigor = [];
    if (gabarito.perfilAvaliacaoId) {
      const perfil = await db.collection('perfis_avaliacao').findOne({
        id: gabarito.perfilAvaliacaoId
      });
      if (perfil) {
        perfilConteudo = perfil.conteudo;
        criteriosRigor = perfil.criteriosRigor || [];
      }
    }

    // Buscar habilidades para incluir no prompt
    const habilidades = await db.collection('habilidades')
      .find({ userId })
      .toArray();
    const habilidadesMap = {};
    habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

    // Construir seção de critérios de rigor
    let criteriosRigorTexto = '';
    if (criteriosRigor.length > 0) {
      criteriosRigorTexto = '\nCRITÉRIOS DE RIGOR DO PERFIL DE AVALIAÇÃO:\n';
      criteriosRigor.forEach(c => {
        const nivelTexto = c.nivelRigor === 'rigoroso' ? 'RIGOROSO' :
          c.nivelRigor === 'moderado' ? 'MODERADO' : 'FLEXÍVEL';
        criteriosRigorTexto += `- ${c.criterio}: ${nivelTexto}`;
        if (c.descricao) {
          criteriosRigorTexto += ` - ${c.descricao}`;
        }
        criteriosRigorTexto += '\n';
      });
      criteriosRigorTexto += '\nAo corrigir, APLIQUE esses níveis de rigor:\n';
      criteriosRigorTexto += '- RIGOROSO: Seja severo na avaliação deste critério. Erros devem ser penalizados significativamente.\n';
      criteriosRigorTexto += '- MODERADO: Seja equilibrado, considerando tanto o processo quanto o resultado.\n';
      criteriosRigorTexto += '- FLEXÍVEL: Seja compreensivo, valorizando esforço e criatividade mesmo com pequenos erros.\n';
    }

    // Criar prompt para OCR + Correção de questões dissertativas
    const prompt = `Você é um sistema especializado em OCR e correção de provas dissertativas.

TAREFA 1 - OCR:
Transcreva TODO o texto escrito pelo aluno na prova, mantendo a estrutura e formatação original.

TAREFA 2 - CORREÇÃO:
Analise as respostas do aluno comparando com o gabarito fornecido e avalie cada questão.

GABARITO/CRITÉRIOS DE CORREÇÃO:
${gabarito.conteudo || 'Não fornecido'}

${perfilConteudo ? `PERFIL DE AVALIAÇÃO:\n${perfilConteudo}\n` : ''}${criteriosRigorTexto}

INSTRUÇÕES DE CORREÇÃO:
1. Para cada questão identificada, avalie a resposta do aluno
2. Atribua uma nota de 0 a 10 para cada questão (ou use a pontuação máxima especificada)
3. Forneça feedback construtivo para cada questão
4. AVALIE CADA HABILIDADE INDIVIDUALMENTE com uma pontuação de 1 a 10, onde:
   - 1-3: Habilidade não demonstrada ou muito fraca
   - 4-6: Habilidade parcialmente demonstrada, precisa de reforço
   - 7-8: Habilidade demonstrada adequadamente
   - 9-10: Habilidade demonstrada com excelência
5. Identifique quais habilidades foram demonstradas (acertadas) e quais precisam de reforço (erradas)
6. Calcule a nota final (0-10) considerando todas as questões

HABILIDADES DISPONÍVEIS:
${habilidades.map(h => `- ${h.nome} (ID: ${h.id})`).join('\n') || 'Nenhuma habilidade cadastrada'}

Retorne APENAS um JSON válido no formato:
{
  "texto_ocr": "Texto completo transcrito da prova...",
  "nota_final": 8.5,
  "feedback_geral": "Resumo geral do desempenho. Mencione as habilidades com melhor e pior desempenho.",
  "exercicios": [
    {
      "numero": 1,
      "nota": 9.0,
      "nota_maxima": 10.0,
      "feedback": "Excelente resposta, demonstrou compreensão do conceito.",
      "habilidades_acertadas": ["id_habilidade_1", "id_habilidade_2"],
      "habilidades_erradas": []
    }
  ],
  "habilidades_avaliacao": [
    {
      "habilidade_id": "id_habilidade_1",
      "pontuacao": 8.5,
      "justificativa": "Demonstrou boa compreensão do conceito, mas com pequenos erros de cálculo"
    },
    {
      "habilidade_id": "id_habilidade_2",
      "pontuacao": 9.0,
      "justificativa": "Excelente domínio da habilidade, respostas precisas e bem fundamentadas"
    }
  ]
}

IMPORTANTE: 
- Retorne apenas o JSON válido, sem texto adicional
- Use IDs de habilidades que existem na lista fornecida
- Avalie TODAS as habilidades relevantes demonstradas na prova (mínimo 2-3 habilidades)
- Pontuações de habilidades devem estar entre 1 e 10
- Seja rigoroso mas justo na correção, aplicando os critérios de rigor quando especificados
- O feedback deve ser construtivo e educativo
- No feedback_geral, mencione explicitamente as habilidades com melhor e pior desempenho`;

    // Debitar créditos ANTES de processar (será revertido em caso de erro)
    await db.collection('creditos').updateOne(
      { userId },
      { $inc: { saldoAtual: -3 } }
    );

    const transactionId = uuidv4();
    await db.collection('transacoes_creditos').insertOne({
      id: transactionId,
      userId,
      tipo: 'debito',
      quantidade: -3,
      descricao: 'Correção de prova (dissertativa)',
      createdAt: new Date()
    });

    let responseText;
    try {
      // Chamar Vertex AI para OCR + Correção (priorizando Gemini 2.0 Flash)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=dummy`;
      const geminiBody = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096
          }
        })
      };

      responseText = await callGeminiAPIWithRetry(geminiUrl, geminiBody);
      console.log('✅ [DISSERTATIVA] Resposta recebida do Vertex AI. Tamanho:', responseText?.length || 0);
    } catch (error) {
      console.error('❌ [DISSERTATIVA] Erro ao chamar Vertex AI:', error);
      console.error('❌ [DISSERTATIVA] Erro detalhado:', {
        message: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack
      });

      // Rollback: restaurar créditos em caso de erro
      console.log('🔄 [DISSERTATIVA] Restaurando créditos...');
      await db.collection('creditos').updateOne(
        { userId },
        { $inc: { saldoAtual: 3 } }
      );
      await db.collection('transacoes_creditos').updateOne(
        { id: transactionId },
        { $set: { descricao: 'Correção de prova (dissertativa) - ERRO: créditos restaurados' } }
      );

      return NextResponse.json({
        error: `Failed to process image with Vertex AI. Credits have been restored. ${error.message}`
      }, { status: 500 });
    }

    // Extrair e validar JSON da resposta
    let correcaoData = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Vertex AI response');
      }

      correcaoData = JSON.parse(jsonMatch[0]);

      if (!correcaoData.texto_ocr || typeof correcaoData.texto_ocr !== 'string') {
        throw new Error('Missing or invalid texto_ocr in response');
      }

      if (correcaoData.nota_final === undefined || typeof correcaoData.nota_final !== 'number') {
        throw new Error('Missing or invalid nota_final in response');
      }

      if (!Array.isArray(correcaoData.exercicios)) {
        throw new Error('Missing or invalid exercicios array in response');
      }
    } catch (e) {
      // Rollback: restaurar créditos em caso de erro de parsing
      await db.collection('creditos').updateOne(
        { userId },
        { $inc: { saldoAtual: 3 } }
      );
      await db.collection('transacoes_creditos').updateOne(
        { id: transactionId },
        { $set: { descricao: 'Correção de prova (dissertativa) - ERRO DE PARSING: créditos restaurados' } }
      );

      console.error('Failed to parse Vertex AI response:', e, responseText);
      return NextResponse.json({
        error: 'Failed to parse correction response. Credits have been restored. Please try again.'
      }, { status: 500 });
    }

    // Processar dados da correção
    const textoOcr = correcaoData.texto_ocr || '';
    const notaFinal = parseFloat(correcaoData.nota_final) || 0;
    const feedbackGeral = correcaoData.feedback_geral || '';
    const exercicios = correcaoData.exercicios || [];

    // Processar habilidades com pontuação (1-10)
    let habilidadesPontuacao = [];
    if (correcaoData.habilidades_avaliacao && Array.isArray(correcaoData.habilidades_avaliacao)) {
      correcaoData.habilidades_avaliacao.forEach(hab => {
        const pontuacao = parseFloat(hab.pontuacao);
        if (!isNaN(pontuacao) && pontuacao >= 1 && pontuacao <= 10) {
          if (habilidadesMap[hab.habilidade_id]) {
            habilidadesPontuacao.push({
              habilidadeId: hab.habilidade_id,
              pontuacao: pontuacao,
              justificativa: hab.justificativa || ''
            });
          }
        }
      });
    }

    // Processar habilidades acertadas/erradas
    let habilidadesAcertadas = [];
    let habilidadesErradas = [];
    let questoesDetalhes = [];

    habilidadesPontuacao.forEach(hab => {
      if (hab.pontuacao >= 7) {
        if (!habilidadesAcertadas.includes(hab.habilidadeId)) {
          habilidadesAcertadas.push(hab.habilidadeId);
        }
      } else {
        if (!habilidadesErradas.includes(hab.habilidadeId)) {
          habilidadesErradas.push(hab.habilidadeId);
        }
      }
    });

    exercicios.forEach((ex) => {
      if (ex.habilidades_acertadas && Array.isArray(ex.habilidades_acertadas)) {
        ex.habilidades_acertadas.forEach(habId => {
          if (!habilidadesAcertadas.includes(habId)) {
            habilidadesAcertadas.push(habId);
          }
        });
      }

      if (ex.habilidades_erradas && Array.isArray(ex.habilidades_erradas)) {
        ex.habilidades_erradas.forEach(habId => {
          if (!habilidadesErradas.includes(habId)) {
            habilidadesErradas.push(habId);
          }
        });
      }

      questoesDetalhes.push({
        numero: ex.numero || 0,
        nota: parseFloat(ex.nota) || 0,
        notaMaxima: parseFloat(ex.nota_maxima) || 10,
        feedback: ex.feedback || '',
        habilidadesAcertadas: ex.habilidades_acertadas || [],
        habilidadesErradas: ex.habilidades_erradas || []
      });
    });

    // Criar avaliação já corrigida
    const assessmentId = uuidv4();
    await db.collection('avaliacoes_corrigidas').insertOne({
      id: assessmentId,
      userId,
      gabaritoId: gabarito.id,
      turmaId,
      alunoId,
      periodo,
      imageUrl: imageUrl,
      imageId: imageId, // Salvar ID para poder deletar depois
      textoOcr: textoOcr,
      nota: notaFinal,
      feedback: feedbackGeral,
      exercicios: exercicios.map(ex => ({
        numero: ex.numero,
        nota: ex.nota,
        nota_maxima: ex.nota_maxima,
        feedback: ex.feedback
      })),
      questoesDetalhes: questoesDetalhes,
      habilidadesAcertadas: habilidadesAcertadas,
      habilidadesErradas: habilidadesErradas,
      habilidadesPontuacao: habilidadesPontuacao,
      status: 'completed',
      validado: false,
      createdAt: new Date(),
      completedAt: new Date()
    });

    // Criar notificação
    await createNotification(
      db,
      userId,
      'avaliacao_concluida',
      `Avaliação corrigida automaticamente. Nota: ${notaFinal.toFixed(2)}/10`,
      assessmentId
    );

    return NextResponse.json({
      success: true,
      assessmentId,
      imageUrl,
      nota: notaFinal,
      correcaoAutomatica: true
    });

  } catch (error) {
    console.error('❌ [DISSERTATIVA] Erro geral:', error);
    console.error('❌ [DISSERTATIVA] Stack trace:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handler para múltipla escolha - correção automática instantânea
async function handleMultiplaEscolhaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db) {
  try {
    // Verificar turma e aluno
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    const aluno = await db.collection('alunos').findOne({ id: alunoId, turmaId });
    if (!aluno) {
      return NextResponse.json({ error: 'Aluno not found' }, { status: 404 });
    }

    // Salvar arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Salvar imagem no MongoDB GridFS
    const filename = `${uuidv4()}-${file.name}`;
    const mimeType = file.type || 'image/jpeg';

    let imageId;
    try {
      imageId = await saveImageToMongoDB(buffer, filename, mimeType);
      console.log('✅ [MULTIPLA ESCOLHA] Imagem salva no MongoDB. ID:', imageId);
    } catch (error) {
      console.error('❌ [MULTIPLA ESCOLHA] Erro ao salvar imagem no MongoDB:', error);
      throw new Error(`Erro ao salvar imagem: ${error.message}`);
    }

    // URL para acessar a imagem via API
    const imageUrl = `/api/images/${imageId}`;

    // Verificar configuração do Vertex AI
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({
        error: 'Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT_ID in .env'
      }, { status: 400 });
    }

    // Validar questões do gabarito
    if (!gabarito.questoes || !Array.isArray(gabarito.questoes) || gabarito.questoes.length === 0) {
      return NextResponse.json({
        error: 'Gabarito de múltipla escolha deve ter pelo menos uma questão definida'
      }, { status: 400 });
    }

    // Converter imagem para base64
    const base64Image = buffer.toString('base64');

    // Criar prompt para OCR de múltipla escolha
    const questoesInfo = gabarito.questoes.map(q =>
      `Questão ${q.numero}: Resposta correta é ${q.respostaCorreta}`
    ).join('\n');

    const prompt = `Você é um sistema de OCR especializado em identificar respostas de múltipla escolha em provas.

Analise a imagem da prova e identifique QUAL alternativa foi marcada para cada questão.

GABARITO ESPERADO:
${questoesInfo}

Tarefas:
1. Identifique cada questão numerada na prova
2. Para cada questão, identifique qual alternativa (A, B, C, D ou E) foi marcada pelo aluno
3. Se não conseguir identificar, retorne "N/A" para aquela questão

Retorne APENAS um JSON válido no formato:
{
  "respostas": [
    {"numero": 1, "resposta_aluno": "A"},
    {"numero": 2, "resposta_aluno": "B"},
    {"numero": 3, "resposta_aluno": "N/A"}
  ]
}

IMPORTANTE: Retorne apenas o JSON, sem texto adicional.`;

    // Debitar créditos ANTES de processar (será revertido em caso de erro)
    await db.collection('creditos').updateOne(
      { userId },
      { $inc: { saldoAtual: -3 } }
    );

    const transactionId = uuidv4();
    await db.collection('transacoes_creditos').insertOne({
      id: transactionId,
      userId,
      tipo: 'debito',
      quantidade: -3,
      descricao: 'Correção de prova (múltipla escolha)',
      createdAt: new Date()
    });

    let ocrText;
    try {
      // Chamar Vertex AI para OCR (priorizando Gemini 2.0 Flash)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=dummy`;
      const geminiBody = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              },
              { text: prompt }
            ]
          }]
        })
      };

      ocrText = await callGeminiAPIWithRetry(geminiUrl, geminiBody);
    } catch (error) {
      // Rollback: restaurar créditos em caso de erro
      await db.collection('creditos').updateOne(
        { userId },
        { $inc: { saldoAtual: 3 } }
      );
      await db.collection('transacoes_creditos').updateOne(
        { id: transactionId },
        { $set: { descricao: 'Correção de prova (múltipla escolha) - ERRO: créditos restaurados' } }
      );

      console.error('Vertex AI error:', error);
      return NextResponse.json({
        error: `Failed to process image with Vertex AI. Credits have been restored. ${error.message}`
      }, { status: 500 });
    }

    // Extrair e validar JSON da resposta
    let respostasAluno = [];
    try {
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Vertex AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.respostas || !Array.isArray(parsed.respostas)) {
        throw new Error('Missing or invalid respostas array in response');
      }

      respostasAluno = parsed.respostas;
    } catch (e) {
      // Rollback: restaurar créditos em caso de erro de parsing
      await db.collection('creditos').updateOne(
        { userId },
        { $inc: { saldoAtual: 3 } }
      );
      await db.collection('transacoes_creditos').updateOne(
        { id: transactionId },
        { $set: { descricao: 'Correção de prova (múltipla escolha) - ERRO DE PARSING: créditos restaurados' } }
      );

      console.error('Failed to parse Vertex AI response:', e, ocrText);
      return NextResponse.json({
        error: 'Failed to parse OCR response. Credits have been restored. Please try again.'
      }, { status: 500 });
    }

    // Processar correção
    let questoesDetalhes = [];
    let habilidadesAcertadas = [];
    let habilidadesErradas = [];
    let totalPontos = 0;
    let pontosObtidos = 0;

    gabarito.questoes.forEach((questaoGabarito) => {
      const respostaAluno = respostasAluno.find(r => r.numero === questaoGabarito.numero);
      const respostaMarcada = respostaAluno?.resposta_aluno?.toUpperCase().trim();
      const respostaCorreta = questaoGabarito.respostaCorreta.toUpperCase().trim();
      const acertou = respostaMarcada === respostaCorreta && respostaMarcada !== 'N/A';

      const pontuacao = questaoGabarito.pontuacao || 1;
      const notaQuestao = acertou ? pontuacao : 0;

      totalPontos += pontuacao;
      pontosObtidos += notaQuestao;

      questoesDetalhes.push({
        numero: questaoGabarito.numero,
        respostaAluno: respostaMarcada || 'N/A',
        respostaCorreta: respostaCorreta,
        acertou: acertou,
        nota: notaQuestao,
        notaMaxima: pontuacao,
        habilidadeId: questaoGabarito.habilidadeId,
        feedback: acertou
          ? `Resposta correta!`
          : respostaMarcada === 'N/A'
            ? `Resposta não identificada. Resposta correta: ${respostaCorreta}`
            : `Resposta incorreta. Você marcou ${respostaMarcada}, mas a correta é ${respostaCorreta}`
      });

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

    // Criar feedback geral
    const feedbackGeral = `Você acertou ${pontosObtidos} de ${totalPontos} questões (${percentualAcerto.toFixed(1)}%). Nota: ${notaFinal.toFixed(2)}/10.`;

    // Criar avaliação já corrigida
    const assessmentId = uuidv4();
    await db.collection('avaliacoes_corrigidas').insertOne({
      id: assessmentId,
      userId,
      gabaritoId: gabarito.id,
      turmaId,
      alunoId,
      periodo,
      imageUrl: imageUrl,
      imageId: imageId, // Salvar ID para poder deletar depois
      textoOcr: ocrText,
      nota: notaFinal,
      feedback: feedbackGeral,
      exercicios: questoesDetalhes,
      questoesDetalhes: questoesDetalhes,
      habilidadesAcertadas: habilidadesAcertadas,
      habilidadesErradas: habilidadesErradas,
      status: 'completed',
      validado: false,
      createdAt: new Date(),
      completedAt: new Date()
    });

    // Criar notificação
    await createNotification(
      db,
      userId,
      'avaliacao_concluida',
      `Avaliação corrigida automaticamente. Nota: ${notaFinal.toFixed(2)}/10`,
      assessmentId
    );

    return NextResponse.json({
      success: true,
      assessmentId,
      imageUrl,
      nota: notaFinal,
      correcaoAutomatica: true
    });

  } catch (error) {
    console.error('Multipla escolha upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleUpload(request) {
  try {
    console.log('📤 [UPLOAD] Iniciando processo de upload...');
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    // Check credits
    const credits = await db.collection('creditos').findOne({ userId });
    console.log('💰 [UPLOAD] Créditos do usuário:', credits?.saldoAtual || 0);
    if (!credits || credits.saldoAtual < 3) {
      return NextResponse.json({
        error: '⚠️ Saldo de créditos insuficiente. Você precisa de pelo menos 3 créditos para realizar uma correção.'
      }, { status: 400 });
    }

    // Verificar Vertex AI configurado
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    console.log('🔧 [UPLOAD] Project ID configurado:', projectId ? 'Sim' : 'Não');
    if (!projectId) {
      return NextResponse.json({
        error: '⚙️ O sistema de IA não está configurado corretamente (Project ID ausente). Por favor, contate o suporte.'
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    const gabaritoId = formData.get('gabaritoId');
    const turmaId = formData.get('turmaId');
    const alunoId = formData.get('alunoId');
    const periodo = formData.get('periodo');

    console.log('📋 [UPLOAD] Dados recebidos:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      gabaritoId,
      turmaId,
      alunoId,
      periodo
    });

    if (!file || !gabaritoId || !turmaId || !alunoId || !periodo) {
      console.error('❌ [UPLOAD] Campos obrigatórios faltando:', {
        file: !!file,
        gabaritoId: !!gabaritoId,
        turmaId: !!turmaId,
        alunoId: !!alunoId,
        periodo: !!periodo
      });
      return NextResponse.json({
        error: '⚠️ Por favor, certifique-se de que todos os campos (arquivo, gabarito, turma, aluno e período) foram preenchidos.'
      }, { status: 400 });
    }

    // Verify gabarito, turma, aluno
    const gabarito = await db.collection('gabaritos').findOne({ id: gabaritoId, userId });
    if (!gabarito) {
      console.error('❌ [UPLOAD] Gabarito não encontrado:', gabaritoId);
      return NextResponse.json({ error: '❌ Gabarito não encontrado ou acesso negado.' }, { status: 404 });
    }

    console.log('✅ [UPLOAD] Gabarito encontrado. Tipo:', gabarito.tipo);

    // Processar diretamente com Vertex AI baseado no tipo de gabarito
    // Reutilizar a lógica de app/api/correcoes/route.js
    if (gabarito.tipo === 'multipla_escolha') {
      console.log('🔄 [UPLOAD] Processando como múltipla escolha...');
      return await handleMultiplaEscolhaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db);
    } else {
      console.log('🔄 [UPLOAD] Processando como dissertativa...');
      return await handleDissertativaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db);
    }
  } catch (error) {
    console.error('❌ [UPLOAD] Erro geral:', error);
    console.error('❌ [UPLOAD] Stack trace:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==================== AVALIACOES HANDLERS ====================

async function handleGetAvaliacoesPendentes(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ userId, status: 'completed', validado: false })
      .sort({ completedAt: -1 })
      .toArray();

    // Populate related data
    const enriched = await Promise.all(
      avaliacoes.map(async (av) => {
        const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });
        const turma = await db.collection('turmas').findOne({ id: av.turmaId });
        const aluno = await db.collection('alunos').findOne({ id: av.alunoId });

        return {
          ...av,
          gabaritoTitulo: gabarito?.titulo || 'Unknown',
          turmaNome: turma?.nome || 'Unknown',
          alunoNome: aluno?.nome || 'Unknown'
        };
      })
    );

    return NextResponse.json({ avaliacoes: enriched });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGetAvaliacoesConcluidas(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ userId, validado: true })
      .sort({ validadoAt: -1 })
      .limit(100)
      .toArray();

    const enriched = await Promise.all(
      avaliacoes.map(async (av) => {
        const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });
        const turma = await db.collection('turmas').findOne({ id: av.turmaId });
        const aluno = await db.collection('alunos').findOne({ id: av.alunoId });

        return {
          ...av,
          gabaritoTitulo: gabarito?.titulo || 'Unknown',
          turmaNome: turma?.nome || 'Unknown',
          alunoNome: aluno?.nome || 'Unknown'
        };
      })
    );

    return NextResponse.json({ avaliacoes: enriched });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleValidarAvaliacao(request, avaliacaoId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
      id: avaliacaoId,
      userId
    });

    if (!avaliacao) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    await db.collection('avaliacoes_corrigidas').updateOne(
      { id: avaliacaoId },
      {
        $set: {
          validado: true,
          validadoAt: new Date()
        }
      }
    );

    // Auditoria de Validação
    await logAudit(request, userId, 'assessment_validated', { assessmentId: avaliacaoId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}


// ==================== NOTIFICACOES HANDLERS ====================

async function handleGetNotificacoes(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const notificacoes = await db.collection('notificacoes')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ notificacoes });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleMarcarComoLida(request, notificacaoId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    await db.collection('notificacoes').updateOne(
      { id: notificacaoId, userId },
      { $set: { lida: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== CREDITS & SETTINGS ====================

async function handleGetCredits(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const credits = await db.collection('creditos').findOne({ userId });
    return NextResponse.json({ saldoAtual: credits?.saldoAtual || 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGetSettings(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const user = await db.collection('users').findOne({ id: userId });
    let settings = await db.collection('settings').findOne({ userId });

    if (!settings) {
      settings = {
        id: uuidv4(),
        userId,
        geminiApiKey: '',
        createdAt: new Date()
      };
      await db.collection('settings').insertOne(settings);
    }

    // Return different fields based on admin status
    if (user.isAdmin) {
      return NextResponse.json({
        geminiApiKey: settings.geminiApiKey || ''
      });
    } else {
      return NextResponse.json({
        // Regular users don't see API keys
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleUpdateSettings(request) {
  try {
    const userId = await requireAuth(request);
    const data = await request.json();

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ id: userId });

    let updateData = {};

    // Only admin can update API keys
    if (user.isAdmin) {
      if (data.geminiApiKey !== undefined) updateData.geminiApiKey = data.geminiApiKey;
    }

    // All users can update their profile
    if (data.name) {
      await db.collection('users').updateOne(
        { id: userId },
        { $set: { name: data.name } }
      );
    }

    if (Object.keys(updateData).length > 0) {
      await db.collection('settings').updateOne(
        { userId },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          },
          $setOnInsert: {
            id: uuidv4(),
            userId,
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      // Auditoria de Alteração de Configurações
      await logAudit(request, userId, 'settings_updated', { fields: Object.keys(updateData) });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== PLANO STATUS HANDLER ====================

async function handleGetPlanoStatus(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    const user = await db.collection('users').findOne({ id: userId });
    const plano = user?.assinatura || 'free';
    const limites = {
      free: {
        nome: 'Gratuito',
        provasPorMes: 20,
        correcaoIlimitada: false,
        analyticsAvancado: false,
        assistenteDiscursivo: false
      },
      premium: {
        nome: 'Premium',
        provasPorMes: -1,
        correcaoIlimitada: true,
        analyticsAvancado: true,
        assistenteDiscursivo: true
      }
    };

    const limitesPlano = limites[plano] || limites['free'];

    // Count usage
    const turmasCount = await db.collection('turmas').countDocuments({ userId });
    const alunosCount = await db.collection('alunos').aggregate([
      {
        $lookup: {
          from: 'turmas',
          localField: 'turmaId',
          foreignField: 'id',
          as: 'turma'
        }
      },
      { $match: { 'turma.userId': userId } },
      { $count: 'count' }
    ]).toArray();

    const totalAlunos = alunosCount.length > 0 ? alunosCount[0].count : 0;

    // Get current month corrections
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const correcoesCount = await db.collection('avaliacoes_corrigidas').countDocuments({
      userId,
      createdAt: { $gte: startOfMonth }
    });

    return NextResponse.json({
      plano,
      limites: limitesPlano,
      uso: {
        turmas: turmasCount,
        alunos: totalAlunos,
        correcoesMes: correcoesCount
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== ADMIN HANDLERS ====================

async function handleAddAdmin(request) {
  try {
    await requireAdmin(request);
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.collection('users').updateOne(
      { email },
      { $set: { isAdmin: 1 } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

// ==================== MAIN ROUTER ====================

export async function POST(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/auth/register') return handleRegister(request);
  if (pathname === '/api/auth/login') return handleLogin(request);
  if (pathname === '/api/turmas') return handleCreateTurma(request);
  if (pathname === '/api/alunos') return handleCreateAluno(request);
  if (pathname === '/api/perfis') return handleCreatePerfil(request);
  if (pathname === '/api/perfis/gerar') return handleGerarPerfil(request);
  if (pathname === '/api/gabaritos') return handleCreateGabarito(request);
  if (pathname === '/api/upload') return handleUpload(request);
  if (pathname === '/api/admin/add-admin') return handleAddAdmin(request);

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

async function handleGetImage(request, id) {
  try {
    console.log(`🖼️ [IMAGE HANDLER] Buscando imagem ID: ${id}`);
    const imageData = await getImageFromMongoDB(id);

    return new NextResponse(imageData.buffer, {
      headers: {
        'Content-Type': imageData.contentType,
        'Content-Length': imageData.buffer.length.toString(),
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error(`❌ [IMAGE HANDLER] Erro:`, error.message);
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}

export async function GET(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname.startsWith('/api/images/')) {
    const id = pathname.split('/').pop();
    return handleGetImage(request, id);
  }

  if (pathname === '/api/auth/me') return handleGetMe(request);
  if (pathname === '/api/credits') return handleGetCredits(request);
  if (pathname === '/api/settings') return handleGetSettings(request);
  if (pathname === '/api/turmas') return handleGetTurmas(request);
  if (pathname === '/api/perfis') return handleGetPerfis(request);
  if (pathname === '/api/gabaritos') return handleGetGabaritos(request);
  if (pathname === '/api/avaliacoes/pendentes') return handleGetAvaliacoesPendentes(request);
  if (pathname === '/api/avaliacoes/concluidas') return handleGetAvaliacoesConcluidas(request);
  if (pathname === '/api/notificacoes') return handleGetNotificacoes(request);
  if (pathname === '/api/plano/status') return handleGetPlanoStatus(request);

  // Handle dynamic routes with IDs
  if (pathname.startsWith('/api/alunos/')) {
    const turmaId = pathname.split('/').pop();
    return handleGetAlunos(request, turmaId);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/settings') return handleUpdateSettings(request);

  // Handle validar avaliacao
  if (pathname.match(/\/api\/avaliacoes\/(.+)\/validar/)) {
    const avaliacaoId = pathname.split('/')[3];
    return handleValidarAvaliacao(request, avaliacaoId);
  }

  // Handle marcar notificacao como lida
  if (pathname.match(/\/api\/notificacoes\/(.+)\/ler/)) {
    const notificacaoId = pathname.split('/')[3];
    return handleMarcarComoLida(request, notificacaoId);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
