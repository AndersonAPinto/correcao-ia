import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken, generateVerificationToken, setSessionCookie } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import EmailService from '@/lib/services/EmailService';

export async function POST(request) {
    try {
        const { email: rawEmail, password, name } = await request.json();
        const email = rawEmail?.trim();

        if (!email || !password || !name) {
            return NextResponse.json({ error: '⚠️ Preencha todos os campos obrigatórios (nome, email e senha).' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: '⚠️ Formato de e-mail inválido.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: '⚠️ A senha deve ter no mínimo 8 caracteres.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: '📧 Este e-mail já está cadastrado no sistema.' }, { status: 400 });
        }

        const userId = uuidv4();
        const hashedPassword = hashPassword(password);
        const isAdmin = 0;

        await db.collection('users').insertOne({
            id: userId,
            email,
            password: hashedPassword,
            name,
            isAdmin,
            assinatura: 'free',
            trialStartedAt: new Date(), // Início do período de 7 dias
            emailVerified: false,
            createdAt: new Date()
        });

        // O sistema de créditos foi abolido. Mantemos as coleções por enquanto para compatibilidade se necessário, 
        // mas não adicionamos créditos iniciais obrigatórios para o fluxo de correção.

        // Gerar token de verificação de email
        const verificationToken = generateVerificationToken();

        // Salvar token de verificação
        await db.collection('email_verifications').insertOne({
            userId: userId,
            token: verificationToken,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
            used: false
        });

        // Enviar email de verificação (não bloquear se falhar)
        try {
            await EmailService.sendVerificationEmail(email, name, verificationToken);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            // Não falhar o registro se email falhar
        }

        const token = generateToken(userId);
        const res = NextResponse.json({
            user: { id: userId, email, name, isAdmin, emailVerified: false },
            message: 'Conta criada com sucesso! Verifique seu email para ativar sua conta.'
        });
        setSessionCookie(res, token);
        return res;
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
