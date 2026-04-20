import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, registerAttempt } from '@/lib/api-handlers';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: '⚠️ Por favor, informe seu e-mail e senha.' }, { status: 400 });
        }

        const rateLimit = await checkRateLimit(request, email, 'login', 10, 15);
        if (rateLimit.blocked) {
            return NextResponse.json(
                { error: `Muitas tentativas. Tente novamente em ${rateLimit.remainingMinutes} minutos.` },
                { status: 429 }
            );
        }

        await registerAttempt(request, email, 'login');

        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ email });

        if (!user || !verifyPassword(password, user.password)) {
            return NextResponse.json({ error: '❌ E-mail ou senha incorretos.' }, { status: 401 });
        }

        const token = generateToken(user.id);
        return NextResponse.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin || 0 }
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
