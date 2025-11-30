import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';
import { PLANO_LIMITES } from '@/lib/constants';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const user = await db.collection('users').findOne({ id: userId });
        const plano = user.assinatura || 'free';
        const limites = PLANO_LIMITES[plano] || PLANO_LIMITES['free'];

        // Count usage
        const turmasCount = await db.collection('turmas').countDocuments({ userId });
        const alunosCount = await db.collection('alunos').aggregate([
            {
                $lookup: {
                    from: 'turmas',
                    localField: 'turmaId',
                    foreignField: 'id',
                    as: 'turma'
                }
            },
            { $match: { 'turma.userId': userId } },
            { $count: 'count' }
        ]).toArray();

        const totalAlunos = alunosCount.length > 0 ? alunosCount[0].count : 0;

        // Get current month corrections
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const correcoesCount = await db.collection('avaliacoes_corrigidas').countDocuments({
            userId,
            createdAt: { $gte: startOfMonth }
        });

        return NextResponse.json({
            plano,
            limites,
            uso: {
                turmas: turmasCount,
                alunos: totalAlunos,
                correcoesMes: correcoesCount
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
