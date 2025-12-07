import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPasswordResetToken, hashPassword } from '@/lib/auth';

export async function POST(request) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token e nova senha são obrigatórios' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
        }

        // Verificar token
        const decoded = verifyPasswordResetToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Verificar se token já foi usado
        const resetToken = await db.collection('password_reset_tokens').findOne({
            token,
            userId: decoded.userId,
            used: false
        });

        if (!resetToken) {
            return NextResponse.json({ error: 'Token inválido ou já utilizado' }, { status: 400 });
        }

        // Verificar se não expirou
        if (new Date() > resetToken.expiresAt) {
            return NextResponse.json({ error: 'Token expirado' }, { status: 400 });
        }

        // Atualizar senha
        const hashedPassword = hashPassword(newPassword);
        await db.collection('users').updateOne(
            { id: decoded.userId },
            { $set: { password: hashedPassword } }
        );

        // Marcar token como usado
        await db.collection('password_reset_tokens').updateOne(
            { token },
            { $set: { used: true, usedAt: new Date() } }
        );

        return NextResponse.json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

