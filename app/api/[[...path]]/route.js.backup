import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, verifyPassword, generateToken, getUserFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Helper to get user ID from request
async function requireAuth(request) {
  const userId = getUserFromRequest(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

// POST /api/auth/register
async function handleRegister(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Create user
    const userId = uuidv4();
    const hashedPassword = hashPassword(password);
    
    await db.collection('users').insertOne({
      id: userId,
      email,
      password: hashedPassword,
      name,
      createdAt: new Date()
    });

    // Create initial credits (10 credits for new users)
    await db.collection('creditos').insertOne({
      id: uuidv4(),
      userId,
      saldoAtual: 10,
      createdAt: new Date()
    });

    // Log transaction
    await db.collection('transacoes_creditos').insertOne({
      id: uuidv4(),
      userId,
      tipo: 'credito',
      quantidade: 10,
      descricao: 'Créditos iniciais de boas-vindas',
      createdAt: new Date()
    });

    const token = generateToken(userId);

    return NextResponse.json({ 
      token, 
      user: { id: userId, email, name } 
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/auth/login
async function handleLogin(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken(user.id);

    return NextResponse.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/auth/me
async function handleGetMe(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// GET /api/credits
async function handleGetCredits(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    const credits = await db.collection('creditos').findOne({ userId });
    if (!credits) {
      return NextResponse.json({ saldoAtual: 0 });
    }

    return NextResponse.json({ saldoAtual: credits.saldoAtual });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// GET /api/settings
async function handleGetSettings(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    let settings = await db.collection('settings').findOne({ userId });
    
    if (!settings) {
      // Create default settings
      settings = {
        id: uuidv4(),
        userId,
        geminiApiKey: '',
        n8nWebhookUrl: '',
        createdAt: new Date()
      };
      await db.collection('settings').insertOne(settings);
    }

    return NextResponse.json({
      geminiApiKey: settings.geminiApiKey || '',
      n8nWebhookUrl: settings.n8nWebhookUrl || ''
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// PUT /api/settings
async function handleUpdateSettings(request) {
  try {
    const userId = await requireAuth(request);
    const { geminiApiKey, n8nWebhookUrl } = await request.json();
    
    const { db } = await connectToDatabase();
    
    const result = await db.collection('settings').updateOne(
      { userId },
      { 
        $set: { 
          geminiApiKey: geminiApiKey || '',
          n8nWebhookUrl: n8nWebhookUrl || '',
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// GET /api/gabaritos
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

// POST /api/gabaritos
async function handleCreateGabarito(request) {
  try {
    const userId = await requireAuth(request);
    const { titulo, conteudo } = await request.json();
    
    if (!titulo || !conteudo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    const gabarito = {
      id: uuidv4(),
      userId,
      titulo,
      conteudo,
      createdAt: new Date()
    };

    await db.collection('gabaritos').insertOne(gabarito);

    return NextResponse.json({ gabarito });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// POST /api/upload
async function handleUpload(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();

    // Check credits
    const credits = await db.collection('creditos').findOne({ userId });
    if (!credits || credits.saldoAtual < 3) {
      return NextResponse.json({ error: 'Insufficient credits. Need at least 3 credits.' }, { status: 400 });
    }

    // Get settings
    const settings = await db.collection('settings').findOne({ userId });
    if (!settings || !settings.n8nWebhookUrl) {
      return NextResponse.json({ error: 'N8N webhook URL not configured. Please update settings.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    const gabaritoId = formData.get('gabaritoId');

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!gabaritoId) {
      return NextResponse.json({ error: 'No gabarito selected' }, { status: 400 });
    }

    // Verify gabarito exists
    const gabarito = await db.collection('gabaritos').findOne({ id: gabaritoId, userId });
    if (!gabarito) {
      return NextResponse.json({ error: 'Gabarito not found' }, { status: 404 });
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

    // Log transaction
    await db.collection('transacoes_creditos').insertOne({
      id: uuidv4(),
      userId,
      tipo: 'debito',
      quantidade: -3,
      descricao: 'Correção de prova',
      createdAt: new Date()
    });

    // Create pending assessment
    const assessmentId = uuidv4();
    await db.collection('avaliacoes_corrigidas').insertOne({
      id: assessmentId,
      userId,
      gabaritoId,
      imageUrl: fullImageUrl,
      textoOcr: '',
      nota: null,
      feedback: '',
      status: 'pending',
      createdAt: new Date()
    });

    // Trigger N8N webhook
    try {
      const webhookResponse = await fetch(settings.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          assessment_id: assessmentId,
          image_url: fullImageUrl,
          gabarito_id: gabaritoId,
          gabarito_content: gabarito.conteudo
        })
      });

      if (!webhookResponse.ok) {
        console.error('N8N webhook failed:', await webhookResponse.text());
        return NextResponse.json({ 
          error: 'Failed to trigger correction workflow',
          assessmentId 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        assessmentId,
        imageUrl 
      });
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      return NextResponse.json({ 
        error: 'Failed to connect to N8N. Please check webhook URL.',
        assessmentId 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/avaliacoes
async function handleGetAvaliacoes(request) {
  try {
    const userId = await requireAuth(request);
    const { db } = await connectToDatabase();
    
    const avaliacoes = await db.collection('avaliacoes_corrigidas')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Populate gabarito titles
    const avalicoesWithGabaritos = await Promise.all(
      avaliacoes.map(async (av) => {
        const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });
        return {
          ...av,
          gabaritoTitulo: gabarito?.titulo || 'Unknown'
        };
      })
    );

    return NextResponse.json({ avaliacoes: avalicoesWithGabaritos });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// POST /api/webhook/result - Endpoint for N8N to post results back
async function handleWebhookResult(request) {
  try {
    const { assessment_id, texto_ocr, nota, feedback } = await request.json();

    if (!assessment_id) {
      return NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    await db.collection('avaliacoes_corrigidas').updateOne(
      { id: assessment_id },
      { 
        $set: { 
          textoOcr: texto_ocr || '',
          nota: nota || 0,
          feedback: feedback || '',
          status: 'completed',
          completedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook result error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Main router
export async function POST(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/auth/register') return handleRegister(request);
  if (pathname === '/api/auth/login') return handleLogin(request);
  if (pathname === '/api/settings') return handleUpdateSettings(request);
  if (pathname === '/api/gabaritos') return handleCreateGabarito(request);
  if (pathname === '/api/upload') return handleUpload(request);
  if (pathname === '/api/webhook/result') return handleWebhookResult(request);

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function GET(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/auth/me') return handleGetMe(request);
  if (pathname === '/api/credits') return handleGetCredits(request);
  if (pathname === '/api/settings') return handleGetSettings(request);
  if (pathname === '/api/gabaritos') return handleGetGabaritos(request);
  if (pathname === '/api/avaliacoes') return handleGetAvaliacoes(request);

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/settings') return handleUpdateSettings(request);

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
