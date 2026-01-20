import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, callGeminiAPI, isVertexAIConfigured } from '@/lib/api-handlers';

export async function POST(request) {
    try {
        const userId = await requireAuth(request);
        const { conteudo } = await request.json();

        if (!conteudo) {
            return NextResponse.json({ error: 'Missing content' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Verificar configuração do Vertex AI (verifica variável de ambiente e arquivo JSON)
        if (!isVertexAIConfigured()) {
            return NextResponse.json({
                error: 'Vertex AI not configured. Set GOOGLE_CLOUD_PROJECT_ID in .env or configure credentials file'
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

        const resultado = await callGeminiAPI(null, prompt); // apiKey não é mais usado, mantido para compatibilidade

        return NextResponse.json({ perfilGerado: resultado });
    } catch (error) {
        console.error('Generate perfil error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
