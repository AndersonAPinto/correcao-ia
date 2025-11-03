import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

// Services
import AuthService from '@/lib/services/AuthService';
import CreditService from '@/lib/services/CreditService';
import GabaritoService from '@/lib/services/GabaritoService';
import PerfilAvaliacaoService from '@/lib/services/PerfilAvaliacaoService';
import TurmaService from '@/lib/services/TurmaService';
import AlunoService from '@/lib/services/AlunoService';
import GradingService from '@/lib/services/GradingService';
import SettingsService from '@/lib/services/SettingsService';
import NotificationService from '@/lib/services/NotificationService';
import FileService from '@/lib/services/FileService';

// ==================== MIDDLEWARE ====================

function requireAuth(request) {
  const userId = getUserFromRequest(request);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

function handleError(error) {
  console.error('API Error:', error);
  const status = error.message === 'Unauthorized' ? 401 : 
                 error.message.includes('not found') ? 404 : 
                 error.message.includes('required') || error.message.includes('Insufficient') ? 400 : 500;
  
  return NextResponse.json({ error: error.message }, { status });
}

// ==================== AUTH CONTROLLERS ====================

async function handleRegister(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await AuthService.registerUser(email, password, name);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

async function handleLogin(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await AuthService.loginUser(email, password);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetMe(request) {
  try {
    const userId = requireAuth(request);
    const user = await AuthService.getUserById(userId);
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== CREDIT CONTROLLERS ====================

async function handleGetCredits(request) {
  try {
    const userId = requireAuth(request);
    const saldoAtual = await CreditService.getBalance(userId);
    return NextResponse.json({ saldoAtual });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== TURMA CONTROLLERS ====================

async function handleCreateTurma(request) {
  try {
    const userId = requireAuth(request);
    const { nome } = await request.json();
    
    const turma = await TurmaService.createTurma(userId, nome);
    return NextResponse.json({ turma });
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetTurmas(request) {
  try {
    const userId = requireAuth(request);
    const turmas = await TurmaService.getTurmasByUserId(userId);
    return NextResponse.json({ turmas });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== ALUNO CONTROLLERS ====================

async function handleCreateAluno(request) {
  try {
    const userId = requireAuth(request);
    const { turmaId, nome } = await request.json();
    
    const aluno = await AlunoService.createAluno(userId, turmaId, nome);
    return NextResponse.json({ aluno });
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetAlunos(request, turmaId) {
  try {
    const userId = requireAuth(request);
    const alunos = await AlunoService.getAlunosByTurmaId(turmaId, userId);
    return NextResponse.json({ alunos });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== PERFIL AVALIAÇÃO CONTROLLERS ====================

async function handleCreatePerfil(request) {
  try {
    const userId = requireAuth(request);
    const formData = await request.formData();
    
    const nome = formData.get('nome');
    const conteudo = formData.get('conteudo');
    const arquivo = formData.get('arquivo');

    let arquivoUrl = '';
    if (arquivo && arquivo.size > 0) {
      const fileData = await FileService.savePerfilFile(arquivo);
      arquivoUrl = fileData.relativeUrl;
    }

    const perfil = await PerfilAvaliacaoService.createPerfil(userId, nome, conteudo, arquivoUrl);
    return NextResponse.json({ perfil });
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetPerfis(request) {
  try {
    const userId = requireAuth(request);
    const perfis = await PerfilAvaliacaoService.getPerfisByUserId(userId);
    return NextResponse.json({ perfis });
  } catch (error) {
    return handleError(error);
  }
}

async function handleGerarPerfil(request) {
  try {
    requireAuth(request);
    const { conteudo } = await request.json();
    
    const perfilGerado = await PerfilAvaliacaoService.generatePerfilWithAI(conteudo);
    return NextResponse.json({ perfilGerado });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== GABARITO CONTROLLERS ====================

async function handleCreateGabarito(request) {
  try {
    const userId = requireAuth(request);
    const formData = await request.formData();
    
    const titulo = formData.get('titulo');
    const conteudo = formData.get('conteudo');
    const perfilAvaliacaoId = formData.get('perfilAvaliacaoId');
    const arquivo = formData.get('arquivo');

    let arquivoUrl = '';
    if (arquivo && arquivo.size > 0) {
      const fileData = await FileService.saveGabaritoFile(arquivo);
      arquivoUrl = fileData.relativeUrl;
    }

    const gabarito = await GabaritoService.createGabarito(
      userId, 
      titulo, 
      conteudo, 
      perfilAvaliacaoId, 
      arquivoUrl
    );
    
    return NextResponse.json({ gabarito });
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetGabaritos(request) {
  try {
    const userId = requireAuth(request);
    const gabaritos = await GabaritoService.getGabaritosByUserId(userId);
    return NextResponse.json({ gabaritos });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== GRADING CONTROLLERS ====================

async function handleUpload(request) {
  try {
    const userId = requireAuth(request);
    const formData = await request.formData();
    
    const file = formData.get('image');
    const gabaritoId = formData.get('gabaritoId');
    const turmaId = formData.get('turmaId');
    const alunoId = formData.get('alunoId');
    const periodo = formData.get('periodo');

    if (!file || !gabaritoId || !turmaId || !alunoId || !periodo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save file
    const fileData = await FileService.saveUploadedImage(file);

    // Submit for grading
    const result = await GradingService.submitForGrading(userId, {
      gabaritoId,
      turmaId,
      alunoId,
      periodo,
      imageUrl: fileData.relativeUrl,
      fullImageUrl: fileData.fullUrl
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetAvaliacoesPendentes(request) {
  try {
    const userId = requireAuth(request);
    const avaliacoes = await GradingService.getPendingAvaliacoes(userId);
    return NextResponse.json({ avaliacoes });
  } catch (error) {
    return handleError(error);
  }
}

async function handleGetAvaliacoesConcluidas(request) {
  try {
    const userId = requireAuth(request);
    const avaliacoes = await GradingService.getCompletedAvaliacoes(userId);
    return NextResponse.json({ avaliacoes });
  } catch (error) {
    return handleError(error);
  }
}

async function handleValidarAvaliacao(request, avaliacaoId) {
  try {
    const userId = requireAuth(request);
    await GradingService.validateAvaliacao(avaliacaoId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== WEBHOOK CONTROLLER ====================

async function handleWebhookResult(request) {
  try {
    const { assessment_id, texto_ocr, nota_final, feedback_geral, exercicios } = await request.json();

    if (!assessment_id) {
      return NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 });
    }

    await GradingService.processN8NResult(assessment_id, {
      texto_ocr,
      nota_final,
      feedback_geral,
      exercicios
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== SETTINGS CONTROLLERS ====================

async function handleGetSettings(request) {
  try {
    const userId = requireAuth(request);
    const settings = await SettingsService.getSettings(userId);
    return NextResponse.json(settings);
  } catch (error) {
    return handleError(error);
  }
}

async function handleUpdateSettings(request) {
  try {
    const userId = requireAuth(request);
    const data = await request.json();
    
    await SettingsService.updateSettings(userId, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== NOTIFICATION CONTROLLERS ====================

async function handleGetNotificacoes(request) {
  try {
    const userId = requireAuth(request);
    const notificacoes = await NotificationService.getNotifications(userId);
    return NextResponse.json({ notificacoes });
  } catch (error) {
    return handleError(error);
  }
}

async function handleMarcarComoLida(request, notificacaoId) {
  try {
    const userId = requireAuth(request);
    await NotificationService.markAsRead(notificacaoId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

// ==================== ROUTER ====================

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
  
  // Dynamic routes
  if (pathname.startsWith('/api/alunos/')) {
    const turmaId = pathname.split('/').pop();
    return handleGetAlunos(request, turmaId);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(request) {
  const pathname = new URL(request.url).pathname;

  if (pathname === '/api/settings') return handleUpdateSettings(request);
  
  // Dynamic routes
  if (pathname.match(/\/api\/avaliacoes\/(.+)\/validar/)) {
    const avaliacaoId = pathname.split('/')[3];
    return handleValidarAvaliacao(request, avaliacaoId);
  }
  
  if (pathname.match(/\/api\/notificacoes\/(.+)\/ler/)) {
    const notificacaoId = pathname.split('/')[3];
    return handleMarcarComoLida(request, notificacaoId);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
