import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { generatePasswordResetToken } from '@/lib/auth';
import EmailService from '@/lib/services/EmailService';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ email });

        // Sempre retornar sucesso (security best practice - não revelar se email existe)
        if (!user) {
            return NextResponse.json({
                message: 'Se o email existir, você receberá um link de recuperação'
            });
        }

        // Gerar token de reset
        const resetToken = generatePasswordResetToken(user.id);

        // Salvar token no banco
        await db.collection('password_reset_tokens').insertOne({
            userId: user.id,
            token: resetToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
            used: false
        });

        // Enviar email
        try {
            const result = await EmailService.sendPasswordResetEmail(user.email, user.name, resetToken);
            if (!result.success) {
                console.error('Email service returned error:', result.error);
                // Log mas não falha a requisição (security best practice)
            } else {
                console.log('✅ Email de recuperação enviado com sucesso para:', user.email);
            }
        } catch (emailError) {
            console.error('❌ Erro ao enviar email de recuperação:', emailError);
            console.error('Detalhes do erro:', {
                message: emailError.message,
                stack: emailError.stack,
                resendConfigured: !!process.env.RESEND_API_KEY
            });
            // Não falhar a requisição se email falhar (security best practice)
        }

        return NextResponse.json({
            message: 'Se o email existir, você receberá um link de recuperação'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

