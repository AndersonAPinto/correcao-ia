import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

// GET /api/auth/google - Inicia o fluxo OAuth
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUrl = searchParams.get('redirect') || '/';
    
    // Gerar state aleatório para proteção CSRF
    const state = Buffer.from(JSON.stringify({ 
      redirect: redirectUrl,
      nonce: randomBytes(16).toString('hex'),
      timestamp: Date.now()
    })).toString('base64');
    
    // Gerar URL de autorização
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ],
      prompt: 'consent',
      state: state
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }
}

