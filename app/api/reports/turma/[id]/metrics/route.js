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

        // Get all completed evaluations for this turma
        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({
                userId,
                turmaId,
                validado: true
            })
            .toArray();

        const totalAvaliacoes = avaliacoes.length;
        const notas = avaliacoes.map(a => a.nota || 0).filter(n => n > 0);
        const mediaGeral = notas.length > 0
            ? notas.reduce((sum, n) => sum + n, 0) / notas.length
            : 0;

        // Calculate distribution
        const distribuicao = {
            '0-3': 0,
            '3-5': 0,
            '5-7': 0,
            '7-9': 0,
            '9-10': 0
        };

        notas.forEach(nota => {
            if (nota < 3) distribuicao['0-3']++;
            else if (nota < 5) distribuicao['3-5']++;
            else if (nota < 7) distribuicao['5-7']++;
            else if (nota < 9) distribuicao['7-9']++;
            else distribuicao['9-10']++;
        });

        return NextResponse.json({
            totalAvaliacoes,
            mediaGeral: parseFloat(mediaGeral.toFixed(2)),
            distribuicao
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
