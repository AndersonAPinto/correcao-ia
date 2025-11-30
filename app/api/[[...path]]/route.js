import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, verifyPassword, generateToken, getUserFromRequest } from '@/lib/auth';
import { requireAuth, requireAdmin, createNotification, callGeminiAPI } from '@/lib/api-handlers';
import { ADMIN_EMAIL } from '@/lib/constants';
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

    // Get settings (admin or user)
    const user = await db.collection('users').findOne({ id: userId });
    let settings = await db.collection('settings').findOne({ 
      userId: user.isAdmin ? userId : { $exists: true }
    });
    
    if (!settings || !settings.n8nWebhookUrl) {
      return NextResponse.json({ 
        error: 'N8N webhook URL not configured.' 
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

    // Verify gabarito, turma, aluno
    const gabarito = await db.collection('gabaritos').findOne({ id: gabaritoId, userId });
    if (!gabarito) {
      return NextResponse.json({ error: 'Gabarito not found' }, { status: 404 });
    }

    const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
    if (!turma) {
      return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
    }

    const aluno = await db.collection('alunos').findOne({ id: alunoId, turmaId });
    if (!aluno) {
      return NextResponse.json({ error: 'Aluno not found' }, { status: 404 });
    }

    // Save file
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

    // Deduct credits
    await db.collection('creditos').updateOne(
      { userId },
      { $inc: { saldoAtual: -3 } }
    );

    await db.collection('transacoes_creditos').insertOne({
      id: uuidv4(),
      userId,
      tipo: 'debito',
      quantidade: -3,
      descricao: 'Correção de prova',
      createdAt: new Date()
    });

    // Get perfil if exists
    let perfilConteudo = '';
    if (gabarito.perfilAvaliacaoId) {
      const perfil = await db.collection('perfis_avaliacao').findOne({ 
        id: gabarito.perfilAvaliacaoId 
      });
      if (perfil) {
        perfilConteudo = perfil.conteudo;
      }
    }

    // Create assessment
    const assessmentId = uuidv4();
    await db.collection('avaliacoes_corrigidas').insertOne({
      id: assessmentId,
      userId,
      gabaritoId,
      turmaId,
      alunoId,
      periodo,
      imageUrl: fullImageUrl,
      textoOcr: '',
      nota: null,
      feedback: '',
      exercicios: [],
      status: 'pending',
      validado: false,
      createdAt: new Date()
    });

    // Trigger N8N webhook
    try {
      const webhookResponse = await fetch(settings.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          assessment_id: assessmentId,
          image_url: fullImageUrl,
          gabarito_id: gabaritoId,
          gabarito_content: gabarito.conteudo,
          perfil_avaliacao: perfilConteudo,
          turma_nome: turma.nome,
          aluno_nome: aluno.nome,
          periodo: periodo
        })
      });

      if (!webhookResponse.ok) {
        console.error('N8N webhook failed:', await webhookResponse.text());
      }

      return NextResponse.json({ 
        success: true, 
        assessmentId,
        imageUrl 
      });
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      return NextResponse.json({ 
        error: 'Failed to connect to N8N.',
        assessmentId 
      }, { status: 500 });
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

    await db.collection('avaliacoes_corrigidas').updateOne(
      { id: avaliacaoId },
      { 
        $set: { 
          validado: true,
          validadoAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// ==================== WEBHOOK RESULT HANDLER ====================

async function handleWebhookResult(request) {
  try {
    const { assessment_id, texto_ocr, nota_final, feedback_geral, exercicios } = await request.json();

    if (!assessment_id) {
      return NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({ 
      id: assessment_id 
    });

    if (!avaliacao) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    await db.collection('avaliacoes_corrigidas').updateOne(
      { id: assessment_id },
      { 
        $set: { 
          textoOcr: texto_ocr || '',
          nota: nota_final || 0,
          feedback: feedback_geral || '',
          exercicios: exercicios || [],
          status: 'completed',
          completedAt: new Date()
        } 
      }
    );

    // Create notification
    await createNotification(
      db,
      avaliacao.userId,
      'avaliacao_concluida',
      `Avaliação processada e aguardando validação`,
      assessment_id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook result error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
        n8nWebhookUrl: '',
        createdAt: new Date()
      };
      await db.collection('settings').insertOne(settings);
    }

    // Return different fields based on admin status
    if (user.isAdmin) {
      return NextResponse.json({
        geminiApiKey: settings.geminiApiKey || '',
        n8nWebhookUrl: settings.n8nWebhookUrl || ''
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
      if (data.n8nWebhookUrl !== undefined) updateData.n8nWebhookUrl = data.n8nWebhookUrl;
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
  if (pathname === '/api/gabaritos') return handleCreateGabarito(request);
  if (pathname === '/api/upload') return handleUpload(request);
  if (pathname === '/api/webhook/result') return handleWebhookResult(request);
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
  if (pathname === '/api/gabaritos') return handleGetGabaritos(request);
  if (pathname === '/api/avaliacoes/pendentes') return handleGetAvaliacoesPendentes(request);
  if (pathname === '/api/avaliacoes/concluidas') return handleGetAvaliacoesConcluidas(request);
  if (pathname === '/api/notificacoes') return handleGetNotificacoes(request);
  
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
