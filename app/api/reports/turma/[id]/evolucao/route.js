import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const turmaId = params.id;
        const { db } = await connectToDatabase();

        // Verify turma belongs to user
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
        }

        // Get all completed evaluations for this turma sorted by date
        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({
                userId,
                turmaId,
                validado: true
            })
            .sort({ validadoAt: 1 })
            .toArray();

        // Group by month/period
        const evolucao = {};

        avaliacoes.forEach(av => {
            const date = new Date(av.validadoAt || av.createdAt);
            const key = `${date.getMonth() + 1}/${date.getFullYear()}`;

            if (!evolucao[key]) {
                evolucao[key] = {
                    somaNotas: 0,
                    count: 0,
                    periodo: key
                };
            }

            evolucao[key].somaNotas += (av.nota || 0);
            evolucao[key].count++;
        });

        const result = Object.values(evolucao).map(item => ({
            periodo: item.periodo,
            media: parseFloat((item.somaNotas / item.count).toFixed(2))
        }));

        return NextResponse.json({ evolucao: result });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
