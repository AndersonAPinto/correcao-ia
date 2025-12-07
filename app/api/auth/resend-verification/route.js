import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { generateVerificationToken } from '@/lib/auth';
import EmailService from '@/lib/services/EmailService';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
    try {
        const userId = getUserFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ id: userId });

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        if (user.emailVerified) {
            return NextResponse.json({ error: 'Email já verificado' }, { status: 400 });
        }

        // Gerar novo token
        const verificationToken = generateVerificationToken();

        // Salvar token
        await db.collection('email_verifications').insertOne({
            userId: user.id,
            token: verificationToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            used: false
        });

        // Enviar email
        try {
            await EmailService.sendVerificationEmail(user.email, user.name, verificationToken);
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Email de verificação reenviado' });
    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

