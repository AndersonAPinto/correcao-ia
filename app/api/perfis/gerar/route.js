import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, callGeminiAPI } from '@/lib/api-handlers';

export async function POST(request) {
    try {
        const userId = await requireAuth(request);
        const { conteudo } = await request.json();

        if (!conteudo) {
            return NextResponse.json({ error: 'Missing content' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Get Gemini API key from admin settings
        const adminSettings = await db.collection('settings').findOne({
            userId: { $exists: true }
        });

        if (!adminSettings || !adminSettings.geminiApiKey) {
            return NextResponse.json({
                error: 'Gemini API key not configured by admin'
            }, { status: 400 });
        }

        const prompt = `Você é um especialista em avaliação educacional. Com base no seguinte texto, gere um perfil de avaliação estruturado e profissional que possa ser usado para corrigir provas de alunos.

Texto base:
${conteudo}

Crie um perfil de avaliação que inclua:
1. Critérios de avaliação claros
2. Escala de pontuação
3. Diretrizes de correção
4. Aspectos a serem considerados

Formato: Texto estruturado, claro e objetivo.`;

        const resultado = await callGeminiAPI(adminSettings.geminiApiKey, prompt);

        return NextResponse.json({ perfilGerado: resultado });
    } catch (error) {
        console.error('Generate perfil error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
