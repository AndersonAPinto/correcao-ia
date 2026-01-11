import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken, generateVerificationToken } from '@/lib/auth';
import { ADMIN_EMAIL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import EmailService from '@/lib/services/EmailService';

export async function POST(request) {
    try {
        const { email, password, name } = await request.json();

        if (!email || !password || !name) {
            return NextResponse.json({ error: '⚠️ Preencha todos os campos obrigatórios (nome, email e senha).' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: '📧 Este e-mail já está cadastrado no sistema.' }, { status: 400 });
        }

        const userId = uuidv4();
        const hashedPassword = hashPassword(password);
        const isAdmin = email === ADMIN_EMAIL ? 1 : 0;

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
        return NextResponse.json({
            token,
            user: { id: userId, email, name, isAdmin, emailVerified: false },
            message: 'Conta criada com sucesso! Verifique seu email para ativar sua conta.'
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
