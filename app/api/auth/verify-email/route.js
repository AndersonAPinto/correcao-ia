import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyVerificationToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper para construir URL absoluta
function getAbsoluteUrl(path, baseUrl = null) {
    const base = baseUrl || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        // Obter URL base da requisição
        const requestUrl = new URL(request.url);
        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

        if (!token) {
            return NextResponse.redirect(getAbsoluteUrl('/?error=token_ausente', baseUrl));
        }

        // Verificar token
        const decoded = verifyVerificationToken(token);
        if (!decoded) {
            return NextResponse.redirect(getAbsoluteUrl('/?error=token_invalido', baseUrl));
        }

        const { db } = await connectToDatabase();

        // Buscar verificação pelo token
        const verification = await db.collection('email_verifications').findOne({
            token,
            used: false
        });

        if (!verification) {
            return NextResponse.redirect(getAbsoluteUrl('/?error=token_nao_encontrado', baseUrl));
        }

        // Verificar se não expirou
        if (new Date() > verification.expiresAt) {
            return NextResponse.redirect(getAbsoluteUrl('/?error=token_expirado', baseUrl));
        }

        // Marcar email como verificado
        await db.collection('users').updateOne(
            { id: verification.userId },
            { $set: { emailVerified: true, emailVerifiedAt: new Date() } }
        );

        // Marcar token como usado
        await db.collection('email_verifications').updateOne(
            { token },
            { $set: { used: true, usedAt: new Date() } }
        );

        return NextResponse.redirect(getAbsoluteUrl('/?email_verified=true', baseUrl));
    } catch (error) {
        console.error('Verify email error:', error);

        // Obter URL base da requisição para erro
        let baseUrl = 'http://localhost:3000';
        try {
            const requestUrl = new URL(request.url);
            baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
        } catch (e) {
            // Fallback se não conseguir obter URL
        }

        return NextResponse.redirect(getAbsoluteUrl('/?error=verification_failed', baseUrl));
    }
}

