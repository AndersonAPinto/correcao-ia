import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyVerificationToken } from '@/lib/auth';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect('/?error=invalid_token');
        }

        // Verificar token
        const decoded = verifyVerificationToken(token);
        if (!decoded) {
            return NextResponse.redirect('/?error=invalid_token');
        }

        const { db } = await connectToDatabase();

        // Buscar verificação pelo token
        const verification = await db.collection('email_verifications').findOne({
            token,
            used: false
        });

        if (!verification) {
            return NextResponse.redirect('/?error=token_not_found');
        }

        // Verificar se não expirou
        if (new Date() > verification.expiresAt) {
            return NextResponse.redirect('/?error=token_expired');
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

        return NextResponse.redirect('/?email_verified=true');
    } catch (error) {
        console.error('Verify email error:', error);
        return NextResponse.redirect('/?error=verification_failed');
    }
}

