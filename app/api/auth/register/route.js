import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken } from '@/lib/auth';
import { ADMIN_EMAIL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

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

        const token = generateToken(userId);
        return NextResponse.json({ token, user: { id: userId, email, name, isAdmin } });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
