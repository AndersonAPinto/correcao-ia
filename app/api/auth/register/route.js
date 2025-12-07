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
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
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
            emailVerified: false,
            createdAt: new Date()
        });

        await db.collection('creditos').insertOne({
            id: uuidv4(),
            userId,
            saldoAtual: 1000,
            createdAt: new Date()
        });

        await db.collection('transacoes_creditos').insertOne({
            id: uuidv4(),
            userId,
            tipo: 'credito',
            quantidade: 1000,
            descricao: 'Créditos iniciais de boas-vindas',
            createdAt: new Date()
        });

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
