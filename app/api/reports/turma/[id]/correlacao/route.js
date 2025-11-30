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

        // Calculate correlation between habilidades
        // For each pair of habilidades, calculate how often they are both wrong together
        const habilidadesErradasCount = {};
        const pairCooccurrence = {};

        avaliacoes.forEach(av => {
            if (av.habilidadesErradas && Array.isArray(av.habilidadesErradas)) {
                const erradas = av.habilidadesErradas;

                // Count individual occurrences
                erradas.forEach(h => {
                    habilidadesErradasCount[h] = (habilidadesErradasCount[h] || 0) + 1;
                });

                // Count pairs
                for (let i = 0; i < erradas.length; i++) {
                    for (let j = i + 1; j < erradas.length; j++) {
                        const h1 = erradas[i];
                        const h2 = erradas[j];
                        const pairKey = [h1, h2].sort().join('|');
                        pairCooccurrence[pairKey] = (pairCooccurrence[pairKey] || 0) + 1;
                    }
                }
            }
        });

        // Get habilidades names
        const allHabilidadesIds = Object.keys(habilidadesErradasCount);
        const habilidades = await db.collection('habilidades')
            .find({ id: { $in: allHabilidadesIds }, userId })
            .toArray();

        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        const correlacoes = Object.entries(pairCooccurrence)
            .map(([key, count]) => {
                const [h1, h2] = key.split('|');
                return {
                    habilidade1: habilidadesMap[h1] || h1,
                    habilidade2: habilidadesMap[h2] || h2,
                    coocorrencia: count,
                    forca: count / avaliacoes.length // Normalized strength
                };
            })
            .sort((a, b) => b.coocorrencia - a.coocorrencia)
            .slice(0, 10); // Top 10 correlations

        return NextResponse.json({ correlacoes });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
