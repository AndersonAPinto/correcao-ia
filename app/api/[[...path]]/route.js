import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, verifyPassword, generateToken, getUserFromRequest } from '@/lib/auth';
import { requireAuth, requireAdmin, createNotification, callGeminiAPI } from '@/lib/api-handlers';
import { ADMIN_EMAIL, PLANO_LIMITES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// ==================== AUTH HANDLERS ====================

async function handleRegister(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
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
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });
    
    console.log('[LOGIN] Email:', email);
    console.log('[LOGIN] User found:', !!user);
    if (user) {
      console.log('[LOGIN] Has password:', !!user.password);
      const passwordMatch = verifyPassword(password, user.password);
      console.log('[LOGIN] Password match:', passwordMatch);
    }
    
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
      return NextResponse.json({ error: 'Missing turma name' }, { status: 400 });
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
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Verify turma belongs to user
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
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
    const criteriosRigorJson = formData.get('criteriosRigor');

    if (!nome) {
      return NextResponse.json({ error: 'Missing perfil name' }, { status: 400 });
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

    // Parse criteriosRigor if provided
    let criteriosRigor = [];
    if (criteriosRigorJson) {
      try {
        criteriosRigor = JSON.parse(criteriosRigorJson);
        // Validar estrutura
        if (Array.isArray(criteriosRigor)) {
          criteriosRigor = criteriosRigor.filter(c => 
            c.criterio && 
            ['rigoroso', 'moderado', 'flexivel'].includes(c.nivelRigor)
          );
        } else {
          criteriosRigor = [];
        }
      } catch (e) {
        console.error('Error parsing criteriosRigor:', e);
        criteriosRigor = [];
      }
    }

    const perfil = {
      id: uuidv4(),
      userId,
      nome,
      conteudo: conteudo || '',
      criteriosRigor: criteriosRigor || [],
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
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get Gemini API key from admin settings
    const adminSettings = await db.collection('settings').findOne({ 
      userId: { $exists: true }
    });
    
    if (!adminSettings || !adminSettings.geminiApiKey) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured by admin' 
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

    const resultado = await callGeminiAPI(adminSettings.geminiApiKey, prompt);
    
    return NextResponse.json({ perfilGerado: resultado });
  } catch (error) {
    console.error('Generate perfil error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==================== HABILIDADES HANDLERS ====================

async function handleCreateHabilidade(request) {
  try {
    const userId = await requireAuth(request);
    const { nome, descricao } = await request.json();
    
    if (!nome) {
      return NextResponse.json({ error: 'Missing habilidade name' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Verificar se já existe habilidade com mesmo nome para o usuário
    const existing = await db.collection('habilidades').findOne({ 
      userId, 
      nome: nome.trim() 
    });
    
    if (existing) {
      return NextResponse.json({ error: 'Habilidade já existe' }, { status: 400 });
    }

    const habilidade = {
      id: uuidv4(),
      userId,
      nome: nome.trim(),
      descricao: descricao || '',
      createdAt: new Date()
    };

    await db.collection('habilidades').insertOne(habilidade);
    return NextResponse.json({ habilidade });
  } catch (error) {
    console.error('Create habilidade error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleGetHabilidades(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    const habilidades = await db.collection('habilidades')
      .find({ userId })
      .sort({ nome: 1 })
      .toArray();

    return NextResponse.json({ habilidades });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleDeleteHabilidade(request, habilidadeId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    const result = await db.collection('habilidades').deleteOne({ 
      id: habilidadeId, 
      userId 
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Habilidade not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
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
    const tipo = formData.get('tipo') || 'dissertativa'; // 'multipla_escolha' ou 'dissertativa'
    const questoesJson = formData.get('questoes'); // JSON string para questões de múltipla escolha

    if (!titulo) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
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

    // Parse questões se for múltipla escolha
    let questoes = [];
    if (tipo === 'multipla_escolha' && questoesJson) {
      try {
        questoes = JSON.parse(questoesJson);
        // Validar estrutura das questões
        if (!Array.isArray(questoes)) {
          return NextResponse.json({ error: 'Questões must be an array' }, { status: 400 });
        }
        // Validar cada questão
        for (const q of questoes) {
          if (!q.numero || !q.respostaCorreta || !q.habilidadeId) {
            return NextResponse.json({ 
              error: 'Each question must have numero, respostaCorreta, and habilidadeId' 
            }, { status: 400 });
          }
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid questões JSON format' }, { status: 400 });
      }
    }

    const gabarito = {
      id: uuidv4(),
      userId,
      titulo,
      conteudo: conteudo || '',
      perfilAvaliacaoId: perfilAvaliacaoId || '',
      arquivoUrl,
      tipo, // 'multipla_escolha' ou 'dissertativa'
      questoes: questoes, // Array de questões para múltipla escolha
      totalQuestoes: tipo === 'multipla_escolha' ? questoes.length : 0,
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

// Helper function para chamar Gemini API com retry e validação
async function callGeminiAPIWithRetry(url, body, maxRetries = 3) {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, body);
      
      if (response.ok) {
        const data = await response.json();
        
        // Validar estrutura da resposta
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No candidates in Gemini API response');
        }
        
        const candidate = data.candidates[0];
        if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
          throw new Error('Invalid response structure from Gemini API');
        }
        
        const responseText = candidate.content.parts[0].text;
        if (!responseText) {
          throw new Error('Empty response from Gemini API');
        }
        
        return responseText;
      }
      
      // Se for erro 429 (rate limit), aguardar mais tempo
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Para outros erros, tentar novamente com backoff
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1);
        const errorText = await response.text();
        console.warn(`Gemini API error (attempt ${attempt + 1}/${maxRetries}):`, errorText);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Última tentativa falhou
      const errorText = await response.text();
      throw new Error(`Gemini API failed: ${errorText}`);
      
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * (attempt + 1);
        console.warn(`Gemini API call failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitTime}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('Failed to call Gemini API after all retries');
}

// Handler para questões dissertativas - OCR + correção com Gemini
async function handleDissertativaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db) {
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
    
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `${uuidv4()}-${file.name}`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;
    const fullImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${imageUrl}`;

    // Obter API key do Gemini
    const user = await db.collection('users').findOne({ id: userId });
    let settings = await db.collection('settings').findOne({ 
      userId: user.isAdmin ? userId : { $exists: true }
    });
    
    if (!settings || !settings.geminiApiKey) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured.' 
      }, { status: 400 });
    }

    // Converter imagem para base64
    const base64Image = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

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
      // Chamar Gemini para OCR + Correção (usando Pro para melhor qualidade)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${settings.geminiApiKey}`;
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
    } catch (error) {
      // Rollback: restaurar créditos em caso de erro
      await db.collection('creditos').updateOne(
        { userId },
        { $inc: { saldoAtual: 3 } }
      );
      await db.collection('transacoes_creditos').updateOne(
        { id: transactionId },
        { $set: { descricao: 'Correção de prova (dissertativa) - ERRO: créditos restaurados' } }
      );
      
      console.error('Gemini API error:', error);
      return NextResponse.json({ 
        error: 'Failed to process image with Gemini API. Credits have been restored. Please try again.' 
      }, { status: 500 });
    }
    
    // Extrair e validar JSON da resposta
    let correcaoData = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      
      correcaoData = JSON.parse(jsonMatch[0]);
      
      // Validar estrutura esperada
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
      
      console.error('Failed to parse Gemini response:', e, responseText);
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
        // Validar pontuação entre 1-10
        if (!isNaN(pontuacao) && pontuacao >= 1 && pontuacao <= 10) {
          // Validar que a habilidade existe
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

    // Processar habilidades acertadas/erradas (compatibilidade + baseado em pontuação)
    let habilidadesAcertadas = [];
    let habilidadesErradas = [];
    let questoesDetalhes = [];

    // Primeiro, processar habilidades baseado em pontuação (>= 7 = acertada)
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
      // Adicionar habilidades acertadas (compatibilidade com formato antigo)
      if (ex.habilidades_acertadas && Array.isArray(ex.habilidades_acertadas)) {
        ex.habilidades_acertadas.forEach(habId => {
          if (!habilidadesAcertadas.includes(habId)) {
            habilidadesAcertadas.push(habId);
          }
        });
      }

      // Adicionar habilidades erradas (compatibilidade com formato antigo)
      if (ex.habilidades_erradas && Array.isArray(ex.habilidades_erradas)) {
        ex.habilidades_erradas.forEach(habId => {
          if (!habilidadesErradas.includes(habId)) {
            habilidadesErradas.push(habId);
          }
        });
      }

      // Criar detalhes da questão
      questoesDetalhes.push({
        numero: ex.numero || 0,
        nota: parseFloat(ex.nota) || 0,
        notaMaxima: parseFloat(ex.nota_maxima) || 10,
        feedback: ex.feedback || '',
        habilidadesAcertadas: ex.habilidades_acertadas || [],
        habilidadesErradas: ex.habilidades_erradas || []
      });
    });

    // Créditos já foram debitados anteriormente (com rollback em caso de erro)

    // Criar avaliação já corrigida
    const assessmentId = uuidv4();
    await db.collection('avaliacoes_corrigidas').insertOne({
      id: assessmentId,
      userId,
      gabaritoId: gabarito.id,
      turmaId,
      alunoId,
      periodo,
      imageUrl: fullImageUrl,
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
      habilidadesPontuacao: habilidadesPontuacao, // Nova estrutura com pontuação 1-10
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
    console.error('Dissertativa upload error:', error);
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
    
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `${uuidv4()}-${file.name}`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;
    const fullImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${imageUrl}`;

    // Obter API key do Gemini
    const user = await db.collection('users').findOne({ id: userId });
    let settings = await db.collection('settings').findOne({ 
      userId: user.isAdmin ? userId : { $exists: true }
    });
    
    if (!settings || !settings.geminiApiKey) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured.' 
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
    const mimeType = file.type || 'image/jpeg';

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
      // Chamar Gemini para OCR (usando flash para ser mais rápido e econômico)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.geminiApiKey}`;
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
      
      console.error('Gemini API error:', error);
      return NextResponse.json({ 
        error: 'Failed to process image with Gemini API. Credits have been restored. Please try again.' 
      }, { status: 500 });
    }
    
    // Extrair e validar JSON da resposta
    let respostasAluno = [];
    try {
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar estrutura esperada
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
      
      console.error('Failed to parse Gemini response:', e, ocrText);
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

    // Créditos já foram debitados anteriormente (com rollback em caso de erro)

    // Criar avaliação já corrigida
    const assessmentId = uuidv4();
    await db.collection('avaliacoes_corrigidas').insertOne({
      id: assessmentId,
      userId,
      gabaritoId: gabarito.id,
      turmaId,
      alunoId,
      periodo,
      imageUrl: fullImageUrl,
      textoOcr: ocrText,
      nota: notaFinal,
      feedback: feedbackGeral,
      exercicios: questoesDetalhes.map(q => ({
        numero: q.numero,
        nota: q.nota,
        nota_maxima: q.notaMaxima,
        feedback: q.feedback
      })),
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
      `Avaliação de múltipla escolha corrigida automaticamente. Nota: ${notaFinal.toFixed(2)}/10`,
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
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    // Check credits
    const credits = await db.collection('creditos').findOne({ userId });
    if (!credits || credits.saldoAtual < 3) {
      return NextResponse.json({ 
        error: 'Insufficient credits. Need at least 3 credits.' 
      }, { status: 400 });
    }

    // Check plano limits
    const planoStatus = await checkPlanoLimits(userId, db);
    if (!planoStatus.allowed) {
      return NextResponse.json({ 
        error: `Limite mensal atingido. Você já usou ${planoStatus.usado} de ${planoStatus.limites.provasPorMes} provas este mês. Faça upgrade para Premium para correção ilimitada.`,
        planoStatus
      }, { status: 403 });
    }

    // Get settings (admin or user) - apenas para verificar Gemini API key
    const user = await db.collection('users').findOne({ id: userId });
    let settings = await db.collection('settings').findOne({ 
      userId: user.isAdmin ? userId : { $exists: true }
    });
    
    if (!settings || !settings.geminiApiKey) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured.' 
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    const gabaritoId = formData.get('gabaritoId');
    const turmaId = formData.get('turmaId');
    const alunoId = formData.get('alunoId');
    const periodo = formData.get('periodo');

    if (!file || !gabaritoId || !turmaId || !alunoId || !periodo) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Verify gabarito
    const gabarito = await db.collection('gabaritos').findOne({ id: gabaritoId, userId });
    if (!gabarito) {
      return NextResponse.json({ error: 'Gabarito not found' }, { status: 404 });
    }

    // Processar baseado no tipo de gabarito
    if (gabarito.tipo === 'multipla_escolha') {
      return await handleMultiplaEscolhaUpload(
        file, gabarito, turmaId, alunoId, periodo, userId, db
      );
    } else {
      // Dissertativa ou mista - usar OCR direto
      return await handleDissertativaUpload(
        file, gabarito, turmaId, alunoId, periodo, userId, db
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
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

    // Obter dados do body (notas ajustadas) - pode estar vazio
    let body = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Body vazio ou inválido - validação simples sem ajustes
    }
    
    const notasAjustadas = body.notasAjustadas || []; // Array de { numero, nota, feedback }
    const notaFinalAjustada = body.notaFinal !== undefined ? body.notaFinal : avaliacao.nota;

    // Atualizar notas das questões se fornecidas
    let exerciciosAtualizados = avaliacao.exercicios || [];
    if (notasAjustadas.length > 0) {
      exerciciosAtualizados = exerciciosAtualizados.map(ex => {
        const ajuste = notasAjustadas.find(na => na.numero === ex.numero);
        if (ajuste) {
          return {
            ...ex,
            nota: ajuste.nota,
            feedback: ajuste.feedback || ex.feedback
          };
        }
        return ex;
      });
    }

    // Recalcular nota final se notas foram ajustadas
    let notaFinal = notaFinalAjustada;
    if (notasAjustadas.length > 0) {
      const totalPontos = exerciciosAtualizados.reduce((sum, ex) => sum + (ex.nota_maxima || 1), 0);
      const pontosObtidos = exerciciosAtualizados.reduce((sum, ex) => sum + (ex.nota || 0), 0);
      notaFinal = totalPontos > 0 ? (pontosObtidos / totalPontos) * 10 : 0;
    }

    // Guardar nota original da IA se ainda não foi guardada
    const notaOriginal = avaliacao.notaOriginal || avaliacao.nota;

    await db.collection('avaliacoes_corrigidas').updateOne(
      { id: avaliacaoId },
      { 
        $set: { 
          validado: true,
          validadoAt: new Date(),
          nota: notaFinal,
          notaOriginal: notaOriginal, // Guardar nota original da IA (primeira vez)
          exercicios: exerciciosAtualizados,
          notasAjustadas: notasAjustadas.length > 0, // Flag indicando que houve ajuste
          ajustadoEm: notasAjustadas.length > 0 ? new Date() : null
        } 
      }
    );

    return NextResponse.json({ success: true, notaFinal });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// Webhook handler removido - não é mais necessário com OCR direto

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
        geminiApiKey: settings.geminiApiKey || '',
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
    }

    return NextResponse.json({ success: true });
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
  if (pathname === '/api/habilidades') return handleCreateHabilidade(request);
  if (pathname === '/api/gabaritos') return handleCreateGabarito(request);
  if (pathname === '/api/upload') return handleUpload(request);
  if (pathname === '/api/admin/add-admin') return handleAddAdmin(request);

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/auth/me') return handleGetMe(request);
  if (pathname === '/api/credits') return handleGetCredits(request);
  if (pathname === '/api/settings') return handleGetSettings(request);
  if (pathname === '/api/turmas') return handleGetTurmas(request);
  if (pathname === '/api/perfis') return handleGetPerfis(request);
  if (pathname === '/api/habilidades') return handleGetHabilidades(request);
  if (pathname === '/api/gabaritos') return handleGetGabaritos(request);
  if (pathname === '/api/avaliacoes/pendentes') return handleGetAvaliacoesPendentes(request);
  if (pathname === '/api/avaliacoes/concluidas') return handleGetAvaliacoesConcluidas(request);
  if (pathname === '/api/notificacoes') return handleGetNotificacoes(request);
  
  // Handle dynamic routes with IDs
  if (pathname.startsWith('/api/alunos/')) {
    const turmaId = pathname.split('/').pop();
    return handleGetAlunos(request, turmaId);
  }

  // Analytics routes
  if (pathname.match(/^\/api\/analytics\/turma\/(.+)$/)) {
    const turmaId = pathname.split('/')[3];
    return handleGetTurmaMetrics(request, turmaId);
  }
  
  if (pathname.match(/^\/api\/analytics\/habilidades\/(.+)\/evolucao$/)) {
    const turmaId = pathname.split('/')[3];
    return handleGetHabilidadesEvolucao(request, turmaId);
  }
  
  if (pathname.match(/^\/api\/analytics\/habilidades\/(.+)\/correlacao$/)) {
    const turmaId = pathname.split('/')[3];
    return handleGetHabilidadesCorrelacao(request, turmaId);
  }
  
  if (pathname.match(/^\/api\/analytics\/habilidades\/(.+)$/)) {
    const turmaId = pathname.split('/')[3];
    return handleGetHabilidadesReport(request, turmaId);
  }
  
  if (pathname.match(/^\/api\/analytics\/aluno\/(.+)$/)) {
    const alunoId = pathname.split('/')[3];
    return handleGetAlunoDetail(request, alunoId);
  }

  // Export routes
  if (pathname === '/api/export/csv') return handleExportCSV(request);
  if (pathname === '/api/export/excel') return handleExportExcel(request);

  // Plano status
  if (pathname === '/api/plano/status') return handleGetPlanoStatus(request);

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

// ==================== ANALYTICS HANDLERS ====================

async function handleGetTurmaMetrics(request, turmaId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    // Verificar se turma pertence ao usuário
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    // Buscar todas as avaliações validadas da turma
    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ 
        userId, 
        turmaId, 
        validado: true 
      })
      .toArray();

    if (avaliacoes.length === 0) {
      return NextResponse.json({
        mediaTurma: 0,
        totalAvaliacoes: 0,
        taxaAprovacao: 0,
        distribuicaoNotas: [],
        alunos: []
      });
    }

    // Calcular métricas
    const notas = avaliacoes.map(a => a.nota || 0).filter(n => n > 0);
    const mediaTurma = notas.length > 0 
      ? notas.reduce((sum, n) => sum + n, 0) / notas.length 
      : 0;
    
    const aprovados = notas.filter(n => n >= 6).length;
    const taxaAprovacao = notas.length > 0 ? (aprovados / notas.length) * 100 : 0;

    // Distribuição de notas (0-2, 2-4, 4-6, 6-8, 8-10)
    const distribuicaoNotas = [
      { range: '0-2', count: notas.filter(n => n >= 0 && n < 2).length },
      { range: '2-4', count: notas.filter(n => n >= 2 && n < 4).length },
      { range: '4-6', count: notas.filter(n => n >= 4 && n < 6).length },
      { range: '6-8', count: notas.filter(n => n >= 6 && n < 8).length },
      { range: '8-10', count: notas.filter(n => n >= 8 && n <= 10).length }
    ];

    // Buscar alunos da turma com suas médias
    const alunosTurma = await db.collection('alunos')
      .find({ turmaId })
      .toArray();

    const alunosComMedias = await Promise.all(
      alunosTurma.map(async (aluno) => {
        const avaliacoesAluno = avaliacoes.filter(a => a.alunoId === aluno.id);
        const notasAluno = avaliacoesAluno.map(a => a.nota || 0).filter(n => n > 0);
        const mediaAluno = notasAluno.length > 0
          ? notasAluno.reduce((sum, n) => sum + n, 0) / notasAluno.length
          : 0;

        return {
          id: aluno.id,
          nome: aluno.nome,
          media: mediaAluno,
          totalAvaliacoes: avaliacoesAluno.length
        };
      })
    );

    return NextResponse.json({
      mediaTurma: parseFloat(mediaTurma.toFixed(2)),
      totalAvaliacoes: avaliacoes.length,
      taxaAprovacao: parseFloat(taxaAprovacao.toFixed(1)),
      distribuicaoNotas,
      alunos: alunosComMedias.sort((a, b) => b.media - a.media)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGetHabilidadesReport(request, turmaId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    // Verificar se turma pertence ao usuário
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    // Buscar todas as avaliações validadas da turma
    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ 
        userId, 
        turmaId, 
        validado: true 
      })
      .toArray();

    // Agregar dados por habilidade
    const habilidadesStats = {};
    const habilidadesPontuacoes = {}; // Para calcular média de pontuação
    
    avaliacoes.forEach(av => {
      // Processar habilidades com pontuação (nova estrutura)
      if (av.habilidadesPontuacao && Array.isArray(av.habilidadesPontuacao)) {
        av.habilidadesPontuacao.forEach(hab => {
          const habId = hab.habilidadeId;
          if (!habilidadesPontuacoes[habId]) {
            habilidadesPontuacoes[habId] = [];
          }
          habilidadesPontuacoes[habId].push(hab.pontuacao);
          
          // Atualizar stats baseado em pontuação >= 7
          if (!habilidadesStats[habId]) {
            habilidadesStats[habId] = { acertos: 0, erros: 0, total: 0 };
          }
          if (hab.pontuacao >= 7) {
            habilidadesStats[habId].acertos++;
          } else {
            habilidadesStats[habId].erros++;
          }
          habilidadesStats[habId].total++;
        });
      } else {
        // Fallback: processar habilidades acertadas/erradas (compatibilidade)
        if (av.habilidadesAcertadas && Array.isArray(av.habilidadesAcertadas)) {
          av.habilidadesAcertadas.forEach(habId => {
            if (!habilidadesStats[habId]) {
              habilidadesStats[habId] = { acertos: 0, erros: 0, total: 0 };
            }
            habilidadesStats[habId].acertos++;
            habilidadesStats[habId].total++;
          });
        }

        if (av.habilidadesErradas && Array.isArray(av.habilidadesErradas)) {
          av.habilidadesErradas.forEach(habId => {
            if (!habilidadesStats[habId]) {
              habilidadesStats[habId] = { acertos: 0, erros: 0, total: 0 };
            }
            habilidadesStats[habId].erros++;
            habilidadesStats[habId].total++;
          });
        }
      }
    });

    // Buscar nomes das habilidades
    const habilidadesIds = Object.keys(habilidadesStats);
    const habilidades = await db.collection('habilidades')
      .find({ id: { $in: habilidadesIds }, userId })
      .toArray();

    // Formatar resultado
    const report = habilidades.map(hab => {
      const stats = habilidadesStats[hab.id] || { acertos: 0, erros: 0, total: 0 };
      const taxaAcerto = stats.total > 0 ? (stats.acertos / stats.total) * 100 : 0;
      
      // Calcular média de pontuação se disponível
      let mediaPontuacao = null;
      if (habilidadesPontuacoes[hab.id] && habilidadesPontuacoes[hab.id].length > 0) {
        const soma = habilidadesPontuacoes[hab.id].reduce((sum, p) => sum + p, 0);
        mediaPontuacao = parseFloat((soma / habilidadesPontuacoes[hab.id].length).toFixed(2));
      }
      
      return {
        id: hab.id,
        nome: hab.nome,
        acertos: stats.acertos,
        erros: stats.erros,
        total: stats.total,
        taxaAcerto: parseFloat(taxaAcerto.toFixed(1)),
        mediaPontuacao: mediaPontuacao
      };
    });

    // Ordenar por taxa de erro (mais erradas primeiro)
    report.sort((a, b) => {
      const taxaErroA = a.total > 0 ? (a.erros / a.total) * 100 : 0;
      const taxaErroB = b.total > 0 ? (b.erros / b.total) * 100 : 0;
      return taxaErroB - taxaErroA;
    });

    return NextResponse.json({ habilidades: report });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGetHabilidadesEvolucao(request, turmaId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    // Verificar se turma pertence ao usuário
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    // Buscar todas as avaliações validadas da turma, ordenadas por data
    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ 
        userId, 
        turmaId, 
        validado: true 
      })
      .sort({ validadoAt: 1 }) // Ordenar por data crescente
      .toArray();

    // Agrupar avaliações por período
    const avaliacoesPorPeriodo = {};
    avaliacoes.forEach(av => {
      const periodo = av.periodo || 'Sem período';
      if (!avaliacoesPorPeriodo[periodo]) {
        avaliacoesPorPeriodo[periodo] = [];
      }
      avaliacoesPorPeriodo[periodo].push(av);
    });

    // Calcular média de pontuação por habilidade em cada período
    const habilidadesEvolucao = {};
    
    Object.keys(avaliacoesPorPeriodo).forEach(periodo => {
      const avaliacoesPeriodo = avaliacoesPorPeriodo[periodo];
      const habilidadesPontuacoesPeriodo = {};
      
      avaliacoesPeriodo.forEach(av => {
        if (av.habilidadesPontuacao && Array.isArray(av.habilidadesPontuacao)) {
          av.habilidadesPontuacao.forEach(hab => {
            const habId = hab.habilidadeId;
            if (!habilidadesPontuacoesPeriodo[habId]) {
              habilidadesPontuacoesPeriodo[habId] = [];
            }
            habilidadesPontuacoesPeriodo[habId].push(hab.pontuacao);
          });
        }
      });
      
      // Calcular média por habilidade neste período
      Object.keys(habilidadesPontuacoesPeriodo).forEach(habId => {
        if (!habilidadesEvolucao[habId]) {
          habilidadesEvolucao[habId] = [];
        }
        
        const pontuacoes = habilidadesPontuacoesPeriodo[habId];
        const soma = pontuacoes.reduce((sum, p) => sum + p, 0);
        const media = soma / pontuacoes.length;
        
        habilidadesEvolucao[habId].push({
          periodo: periodo,
          mediaPontuacao: parseFloat(media.toFixed(2)),
          avaliacoes: pontuacoes.length
        });
      });
    });

    // Buscar nomes das habilidades
    const habilidadesIds = Object.keys(habilidadesEvolucao);
    const habilidades = await db.collection('habilidades')
      .find({ id: { $in: habilidadesIds }, userId })
      .toArray();

    // Formatar resultado
    const evolucao = habilidades.map(hab => ({
      id: hab.id,
      nome: hab.nome,
      evolucao: habilidadesEvolucao[hab.id] || []
    }));

    return NextResponse.json({ habilidades: evolucao });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleGetHabilidadesCorrelacao(request, turmaId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    // Verificar se turma pertence ao usuário
    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    // Buscar todas as avaliações validadas da turma
    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ 
        userId, 
        turmaId, 
        validado: true 
      })
      .toArray();

    // Coletar pontuações por aluno e habilidade
    const pontuacoesPorAluno = {}; // { alunoId: { habilidadeId: [pontuacoes] } }
    
    avaliacoes.forEach(av => {
      const alunoId = av.alunoId;
      if (!pontuacoesPorAluno[alunoId]) {
        pontuacoesPorAluno[alunoId] = {};
      }
      
      if (av.habilidadesPontuacao && Array.isArray(av.habilidadesPontuacao)) {
        av.habilidadesPontuacao.forEach(hab => {
          const habId = hab.habilidadeId;
          if (!pontuacoesPorAluno[alunoId][habId]) {
            pontuacoesPorAluno[alunoId][habId] = [];
          }
          pontuacoesPorAluno[alunoId][habId].push(hab.pontuacao);
        });
      }
    });

    // Calcular média de pontuação por habilidade para cada aluno
    const mediasPorAluno = {};
    Object.keys(pontuacoesPorAluno).forEach(alunoId => {
      mediasPorAluno[alunoId] = {};
      Object.keys(pontuacoesPorAluno[alunoId]).forEach(habId => {
        const pontuacoes = pontuacoesPorAluno[alunoId][habId];
        const soma = pontuacoes.reduce((sum, p) => sum + p, 0);
        mediasPorAluno[alunoId][habId] = soma / pontuacoes.length;
      });
    });

    // Calcular correlação entre pares de habilidades
    const todasHabilidades = new Set();
    Object.values(mediasPorAluno).forEach(medias => {
      Object.keys(medias).forEach(habId => todasHabilidades.add(habId));
    });
    
    const habilidadesArray = Array.from(todasHabilidades);
    const correlacoes = [];
    
    for (let i = 0; i < habilidadesArray.length; i++) {
      for (let j = i + 1; j < habilidadesArray.length; j++) {
        const hab1Id = habilidadesArray[i];
        const hab2Id = habilidadesArray[j];
        
        // Coletar valores de ambas habilidades para alunos que têm ambas
        const valoresHab1 = [];
        const valoresHab2 = [];
        
        Object.keys(mediasPorAluno).forEach(alunoId => {
          if (mediasPorAluno[alunoId][hab1Id] !== undefined && 
              mediasPorAluno[alunoId][hab2Id] !== undefined) {
            valoresHab1.push(mediasPorAluno[alunoId][hab1Id]);
            valoresHab2.push(mediasPorAluno[alunoId][hab2Id]);
          }
        });
        
        // Calcular correlação de Pearson simplificada
        if (valoresHab1.length >= 3) { // Mínimo 3 alunos para calcular correlação
          const media1 = valoresHab1.reduce((sum, v) => sum + v, 0) / valoresHab1.length;
          const media2 = valoresHab2.reduce((sum, v) => sum + v, 0) / valoresHab2.length;
          
          let numerador = 0;
          let denom1 = 0;
          let denom2 = 0;
          
          for (let k = 0; k < valoresHab1.length; k++) {
            const diff1 = valoresHab1[k] - media1;
            const diff2 = valoresHab2[k] - media2;
            numerador += diff1 * diff2;
            denom1 += diff1 * diff1;
            denom2 += diff2 * diff2;
          }
          
          const denominador = Math.sqrt(denom1 * denom2);
          const correlacao = denominador > 0 ? numerador / denominador : 0;
          
          // Só incluir correlações significativas (|r| > 0.3)
          if (Math.abs(correlacao) > 0.3) {
            correlacoes.push({
              habilidade1: { id: hab1Id },
              habilidade2: { id: hab2Id },
              correlacao: parseFloat(correlacao.toFixed(3)),
              tipo: correlacao > 0 ? 'positiva' : 'negativa',
              amostras: valoresHab1.length
            });
          }
        }
      }
    }

    // Buscar nomes das habilidades
    const todasHabilidadesIds = new Set();
    correlacoes.forEach(c => {
      todasHabilidadesIds.add(c.habilidade1.id);
      todasHabilidadesIds.add(c.habilidade2.id);
    });
    
    const habilidades = await db.collection('habilidades')
      .find({ id: { $in: Array.from(todasHabilidadesIds) }, userId })
      .toArray();
    
    const habilidadesMap = {};
    habilidades.forEach(h => habilidadesMap[h.id] = h.nome);
    
    // Adicionar nomes às correlações
    const correlacoesComNomes = correlacoes.map(c => ({
      habilidade1: {
        id: c.habilidade1.id,
        nome: habilidadesMap[c.habilidade1.id] || 'Desconhecida'
      },
      habilidade2: {
        id: c.habilidade2.id,
        nome: habilidadesMap[c.habilidade2.id] || 'Desconhecida'
      },
      correlacao: c.correlacao,
      tipo: c.tipo,
      amostras: c.amostras
    }));

    // Ordenar por valor absoluto de correlação (mais forte primeiro)
    correlacoesComNomes.sort((a, b) => Math.abs(b.correlacao) - Math.abs(a.correlacao));

    return NextResponse.json({ correlacoes: correlacoesComNomes });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== PLANO E LIMITES HANDLERS ====================

async function checkPlanoLimits(userId, db) {
  const user = await db.collection('users').findOne({ id: userId });
  const plano = user?.assinatura || 'free';
  const limites = PLANO_LIMITES[plano] || PLANO_LIMITES.free;

  // Se for premium, não há limites
  if (plano === 'premium') {
    return { allowed: true, plano, limites, usado: 0, restante: -1 };
  }

  // Calcular uso mensal (provas validadas no mês atual)
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const avaliacoesMes = await db.collection('avaliacoes_corrigidas')
    .countDocuments({
      userId,
      validado: true,
      validadoAt: { $gte: inicioMes }
    });

  const usado = avaliacoesMes;
  const limite = limites.provasPorMes;
  const restante = limite - usado;
  const allowed = restante > 0;

  return { allowed, plano, limites, usado, restante };
}

async function handleGetPlanoStatus(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    const status = await checkPlanoLimits(userId, db);
    const user = await db.collection('users').findOne({ id: userId });
    
    return NextResponse.json({
      plano: user?.assinatura || 'free',
      ...status
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== EXPORT HANDLERS ====================

async function handleExportCSV(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const turmaId = searchParams.get('turmaId');
    const periodo = searchParams.get('periodo');

    // Buscar avaliações validadas
    let query = { userId, validado: true };
    if (turmaId) query.turmaId = turmaId;
    if (periodo) query.periodo = periodo;

    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find(query)
      .sort({ validadoAt: -1 })
      .toArray();

    // Enriquecer com dados relacionados
    const enriched = await Promise.all(
      avaliacoes.map(async (av) => {
        const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });
        const turma = await db.collection('turmas').findOne({ id: av.turmaId });
        const aluno = await db.collection('alunos').findOne({ id: av.alunoId });
        
        return {
          ...av,
          gabaritoTitulo: gabarito?.titulo || 'N/A',
          turmaNome: turma?.nome || 'N/A',
          alunoNome: aluno?.nome || 'N/A'
        };
      })
    );

    // Gerar CSV
    const headers = ['Turma', 'Aluno', 'Gabarito', 'Período', 'Nota', 'Data Validação'];
    const rows = enriched.map(av => [
      av.turmaNome,
      av.alunoNome,
      av.gabaritoTitulo,
      av.periodo || 'N/A',
      (av.nota || 0).toFixed(2),
      av.validadoAt ? new Date(av.validadoAt).toLocaleString('pt-BR') : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Adicionar BOM para Excel reconhecer UTF-8
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="avaliacoes_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

async function handleExportExcel(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const turmaId = searchParams.get('turmaId');
    const periodo = searchParams.get('periodo');

    // Buscar avaliações validadas
    let query = { userId, validado: true };
    if (turmaId) query.turmaId = turmaId;
    if (periodo) query.periodo = periodo;

    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find(query)
      .sort({ validadoAt: -1 })
      .toArray();

    // Enriquecer com dados relacionados
    const enriched = await Promise.all(
      avaliacoes.map(async (av) => {
        const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });
        const turma = await db.collection('turmas').findOne({ id: av.turmaId });
        const aluno = await db.collection('alunos').findOne({ id: av.alunoId });
        
        return {
          ...av,
          gabaritoTitulo: gabarito?.titulo || 'N/A',
          turmaNome: turma?.nome || 'N/A',
          alunoNome: aluno?.nome || 'N/A'
        };
      })
    );

    // Gerar Excel (formato XML simples compatível com Excel)
    const excelContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Avaliações">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Turma</Data></Cell>
    <Cell><Data ss:Type="String">Aluno</Data></Cell>
    <Cell><Data ss:Type="String">Gabarito</Data></Cell>
    <Cell><Data ss:Type="String">Período</Data></Cell>
    <Cell><Data ss:Type="String">Nota</Data></Cell>
    <Cell><Data ss:Type="String">Data Validação</Data></Cell>
   </Row>
${enriched.map(av => `   <Row>
    <Cell><Data ss:Type="String">${escapeXml(av.turmaNome)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(av.alunoNome)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(av.gabaritoTitulo)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(av.periodo || 'N/A')}</Data></Cell>
    <Cell><Data ss:Type="Number">${av.nota || 0}</Data></Cell>
    <Cell><Data ss:Type="String">${av.validadoAt ? new Date(av.validadoAt).toLocaleString('pt-BR') : 'N/A'}</Data></Cell>
   </Row>`).join('\n')}
  </Table>
 </Worksheet>
</Workbook>`;

    return new NextResponse(excelContent, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="avaliacoes_${new Date().toISOString().split('T')[0]}.xls"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function handleGetAlunoDetail(request, alunoId) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    // Buscar aluno
    const aluno = await db.collection('alunos').findOne({ id: alunoId });
    if (!aluno) {
      return NextResponse.json({ error: 'Aluno not found' }, { status: 404 });
    }

    // Verificar se turma pertence ao usuário
    const turma = await db.collection('turmas').findOne({ id: aluno.turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Buscar todas as avaliações validadas do aluno
    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ 
        userId, 
        alunoId, 
        validado: true 
      })
      .sort({ validadoAt: -1 })
      .toArray();

    // Calcular métricas
    const notas = avaliacoes.map(a => a.nota || 0).filter(n => n > 0);
    const mediaAluno = notas.length > 0
      ? notas.reduce((sum, n) => sum + n, 0) / notas.length
      : 0;

    // Agregar habilidades erradas
    const habilidadesErradasCount = {};
    avaliacoes.forEach(av => {
      if (av.habilidadesErradas && Array.isArray(av.habilidadesErradas)) {
        av.habilidadesErradas.forEach(habId => {
          habilidadesErradasCount[habId] = (habilidadesErradasCount[habId] || 0) + 1;
        });
      }
    });

    // Buscar nomes das habilidades
    const habilidadesIds = Object.keys(habilidadesErradasCount);
    const habilidades = await db.collection('habilidades')
      .find({ id: { $in: habilidadesIds }, userId })
      .toArray();

    const areasReforco = habilidades.map(hab => ({
      id: hab.id,
      nome: hab.nome,
      vezesErrou: habilidadesErradasCount[hab.id] || 0
    })).sort((a, b) => b.vezesErrou - a.vezesErrou);

    // Evolução das notas (últimas 10 avaliações)
    const evolucao = avaliacoes.slice(0, 10).reverse().map(av => ({
      data: av.validadoAt || av.createdAt,
      nota: av.nota || 0,
      gabaritoId: av.gabaritoId
    }));

    // Buscar média da turma para comparação
    const avaliacoesTurma = await db.collection('avaliacoes_corrigidas')
      .find({ 
        userId, 
        turmaId: aluno.turmaId, 
        validado: true 
      })
      .toArray();
    
    const notasTurma = avaliacoesTurma.map(a => a.nota || 0).filter(n => n > 0);
    const mediaTurma = notasTurma.length > 0
      ? notasTurma.reduce((sum, n) => sum + n, 0) / notasTurma.length
      : 0;

    return NextResponse.json({
      aluno: {
        id: aluno.id,
        nome: aluno.nome,
        turmaId: aluno.turmaId,
        turmaNome: turma.nome
      },
      mediaAluno: parseFloat(mediaAluno.toFixed(2)),
      mediaTurma: parseFloat(mediaTurma.toFixed(2)),
      totalAvaliacoes: avaliacoes.length,
      areasReforco,
      evolucao,
      avaliacoes: avaliacoes.map(av => ({
        id: av.id,
        nota: av.nota,
        periodo: av.periodo,
        validadoAt: av.validadoAt,
        gabaritoId: av.gabaritoId
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function DELETE(request) {
  const pathname = new URL(request.url).pathname;
  
  // Handle delete habilidade
  if (pathname.match(/\/api\/habilidades\/(.+)/)) {
    const habilidadeId = pathname.split('/')[3];
    return handleDeleteHabilidade(request, habilidadeId);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
