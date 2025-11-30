import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // 'pendente' or 'concluida'

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

        return NextResponse.json({ avaliacoes: enriched });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
