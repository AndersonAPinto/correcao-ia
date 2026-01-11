import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectToDatabase } from '@/lib/mongodb';
import { generateToken } from '@/lib/auth';
import { ADMIN_EMAIL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

// Helper para construir URL absoluta
function getAbsoluteUrl(path, baseUrl = null) {
  const base = baseUrl || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}

// GET /api/auth/google/callback - Processa o callback do Google
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Obter URL base da requisição
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    if (!code) {
      return NextResponse.redirect(getAbsoluteUrl('/?error=oauth_cancelado', baseUrl));
    }

    // Decodificar e validar state (proteção CSRF)
    let redirectUrl = '/';
    try {
      if (state) {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        redirectUrl = decodedState.redirect || '/';
        // Validar timestamp (state não deve ser muito antigo - 10 minutos)
        if (decodedState.timestamp && Date.now() - decodedState.timestamp > 10 * 60 * 1000) {
          return NextResponse.redirect(getAbsoluteUrl('/?error=sessao_expirada', baseUrl));
        }
      }
    } catch (e) {
      console.error('Error decoding state:', e);
      return NextResponse.redirect(getAbsoluteUrl('/?error=estado_invalido', baseUrl));
    }

    // Trocar código por tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // ✅ VALIDAÇÃO CRÍTICA DE SEGURANÇA
    if (!tokens.id_token) {
      return NextResponse.redirect(getAbsoluteUrl('/?error=token_ausente', baseUrl));
    }

    // Verificar token ID do Google
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID, // SEMPRE validar audience
    });

    const payload = ticket.getPayload();

    // ✅ VALIDAÇÕES DE SEGURANÇA
    if (!payload) {
      return NextResponse.redirect(getAbsoluteUrl('/?error=token_invalido', baseUrl));
    }

    // Validar audience
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      console.error('Token audience mismatch:', payload.aud, 'expected:', process.env.GOOGLE_CLIENT_ID);
      return NextResponse.redirect(getAbsoluteUrl('/?error=erro_seguranca', baseUrl));
    }

    // Validar expiração
    if (payload.exp * 1000 < Date.now()) {
      return NextResponse.redirect(getAbsoluteUrl('/?error=token_expirado', baseUrl));
    }

    // ✅ EMAIL DEVE ESTAR VERIFICADO
    if (!payload.email || !payload.email_verified) {
      return NextResponse.redirect(getAbsoluteUrl('/?error=email_nao_verificado', baseUrl));
    }

    const { email, name, picture, sub: googleId } = payload;

    const { db } = await connectToDatabase();

    // ✅ PROTEÇÃO CONTRA ACCOUNT TAKEOVER
    // Verificar se email já existe com outro provider
    const existingUser = await db.collection('users').findOne({ email });

    if (existingUser && existingUser.authProvider === 'email') {
      // Usuário já existe com login por email/senha
      return NextResponse.redirect(getAbsoluteUrl('/?error=account_exists_email', baseUrl));
    }

    // Buscar ou criar usuário
    let user = existingUser;

    if (!user) {
      // Criar novo usuário
      const userId = uuidv4();
      const isAdmin = email === ADMIN_EMAIL ? 1 : 0;

      user = {
        id: userId,
        email,
        name: name || email.split('@')[0],
        picture: picture || null,
        googleId: googleId,
        authProvider: 'google',
        password: null, // Sem senha para usuários OAuth
        isAdmin,
        assinatura: 'free',
        trialStartedAt: new Date(), // Início do período de 7 dias
        emailVerified: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      await db.collection('users').insertOne(user);

      // O sistema de créditos foi abolido.
    } else {
      // Atualizar usuário existente
      await db.collection('users').updateOne(
        { id: user.id },
        {
          $set: {
            lastLogin: new Date(),
            picture: picture || user.picture,
            googleId: googleId,
            authProvider: 'google',
            emailVerified: true
          }
        }
      );
    }

    // ✅ LOG DE SEGURANÇA
    try {
      await db.collection('auth_logs').insertOne({
        userId: user.id,
        email: email,
        provider: 'google',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: true,
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('Failed to log auth success:', logError);
      // Não falhar a autenticação por erro de log
    }

    // Gerar JWT token
    const token = generateToken(user.id);

    // Construir URL absoluta para redirecionamento
    const redirectPath = redirectUrl.startsWith('/') ? redirectUrl : '/' + redirectUrl;
    const redirectWithToken = getAbsoluteUrl(`${redirectPath}?token=${token}&provider=google`, baseUrl);

    return NextResponse.redirect(redirectWithToken);
  } catch (error) {
    console.error('Google OAuth callback error:', error);

    // Obter URL base da requisição para erro
    let baseUrl = 'http://localhost:3000';
    try {
      const requestUrl = new URL(request.url);
      baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    } catch (e) {
      // Fallback se não conseguir obter URL
    }

    // Log de erro
    try {
      const { db } = await connectToDatabase();
      await db.collection('auth_logs').insertOne({
        userId: null,
        email: null,
        provider: 'google',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: false,
        error: error.message,
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('Failed to log auth error:', logError);
    }

    return NextResponse.redirect(getAbsoluteUrl('/?error=oauth_failed', baseUrl));
  }
}

