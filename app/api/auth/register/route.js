import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken, generateVerificationToken, setSessionCookie } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import EmailService from '@/lib/services/EmailService';
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';

const registerSchema = z.object({
    email: z.string().email('⚠️ Formato de e-mail inválido.'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `⚠️ A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`),
    name: z.string().min(1, '⚠️ Nome é obrigatório.').max(200, '⚠️ Nome muito longo.'),
});

export async function POST(request) {
    try {
        const body = await request.json();
        const parsed = registerSchema.safeParse({
            email: body.email?.trim(),
            password: body.password,
            name: body.name,
        });

        if (!parsed.success) {
            const message = parsed.error.errors[0]?.message || '⚠️ Dados inválidos.';
            return NextResponse.json({ error: message }, { status: 400 });
        }

        const { email, password, name } = parsed.data;

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
        const verificationToken = generateVerificationToken(userId);

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
