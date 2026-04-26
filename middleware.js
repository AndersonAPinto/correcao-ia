import { NextResponse } from 'next/server';

const PROTECTED_PATHS = [
  '/dashboard',
  '/api/users',
  '/api/correcoes',
  '/api/upload',
  '/api/turmas',
  '/api/alunos',
  '/api/gabaritos',
  '/api/perfis',
  '/api/avaliacoes',
  '/api/images',
  '/api/notificacoes',
  '/api/habilidades',
  '/api/settings',
  '/api/admin',
  '/api/analytics',
  '/api/reports',
  '/api/export',
  '/api/plano',
  '/api/credits',
];

// Decode JWT payload without verification (Edge Runtime compatible).
// Signature verification still happens inside each API route via verifyToken().
function decodeJWTPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

export function middleware(request) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));
    if (!isProtected) return NextResponse.next();

    console.log(`[MIDDLEWARE] Rota protegida acessada: ${pathname}`);

    // Cookie name must match setSessionCookie() in lib/auth.js
    const token = request.cookies.get('session')?.value ||
        request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
        console.log(`[MIDDLEWARE] ❌ Sem token/cookie 'session' para: ${pathname}`);
        console.log(`[MIDDLEWARE] Cookies presentes: ${[...request.cookies.getAll().map(c => c.name)].join(', ') || 'nenhum'}`);
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/', request.url));
    }

    console.log(`[MIDDLEWARE] ✅ Cookie 'session' encontrado para: ${pathname}`);

    // Reject tokens that are structurally invalid or already expired
    const payload = decodeJWTPayload(token);
    if (!payload) {
        console.log(`[MIDDLEWARE] ❌ Token com formato inválido (não é JWT) para: ${pathname}`);
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Token expirado' }, { status: 401 });
        }
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.delete('session');
        return response;
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
        const expDate = new Date(payload.exp * 1000).toISOString();
        console.log(`[MIDDLEWARE] ❌ Token expirado em ${expDate} para: ${pathname}`);
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Token expirado' }, { status: 401 });
        }
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.delete('session');
        return response;
    }

    console.log(`[MIDDLEWARE] ✅ Token válido (userId: ${payload.userId}) — liberando: ${pathname}`);
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth routes)
         * - api/health (health check)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico).*)',
    ],
};
