import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireVerifiedEmail } from '@/lib/api-handlers';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    console.log(`[AVALIACOES] GET /api/avaliacoes?status=${status} — iniciando`);

    try {
        const userId = await requireVerifiedEmail(request);
        console.log(`[AVALIACOES] ✅ Autenticado — userId: ${userId}, filtro: ${status}`);

        const { db } = await connectToDatabase();

        let query = { userId };

        if (status === 'pendente') {
            query.validado = false;
        } else if (status === 'concluida') {
            query.validado = true;
        }

        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        console.log(`[AVALIACOES] Encontradas ${avaliacoes.length} avaliações para userId: ${userId}`);

        // Enriquecer com nomes
        const enriched = await Promise.all(avaliacoes.map(async (av) => {
            const turma = await db.collection('turmas').findOne({ id: av.turmaId });
            const aluno = await db.collection('alunos').findOne({ id: av.alunoId });
            const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });

            return {
                ...av,
                turmaNome: turma ? turma.nome : 'N/A',
                alunoNome: aluno ? aluno.nome : 'N/A',
                gabaritoTitulo: gabarito ? gabarito.titulo : 'N/A'
            };
        }));

        console.log(`[AVALIACOES] ✅ Retornando ${enriched.length} avaliações`);
        return NextResponse.json({ avaliacoes: enriched });
    } catch (error) {
        const isAuthError = error.message?.includes('Acesso negado') || error.message?.includes('login');
        const isVerifyError = error.message?.includes('Verifique seu e-mail');
        const httpStatus = isAuthError ? 401 : isVerifyError ? 403 : 500;
        console.log(`[AVALIACOES] ❌ Erro (status ${httpStatus}): ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: httpStatus });
    }
}
