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

        // Aggregate habilidades erradas
        const habilidadesErradasCount = {};
        const habilidadesAcertadasCount = {};
        const habilidadesTotalCount = {};

        avaliacoes.forEach(av => {
            // Processar erradas
            if (av.habilidadesErradas && Array.isArray(av.habilidadesErradas)) {
                av.habilidadesErradas.forEach(habId => {
                    habilidadesErradasCount[habId] = (habilidadesErradasCount[habId] || 0) + 1;
                    habilidadesTotalCount[habId] = (habilidadesTotalCount[habId] || 0) + 1;
                });
            }

            // Processar acertadas
            if (av.habilidadesAcertadas && Array.isArray(av.habilidadesAcertadas)) {
                av.habilidadesAcertadas.forEach(habId => {
                    habilidadesAcertadasCount[habId] = (habilidadesAcertadasCount[habId] || 0) + 1;
                    habilidadesTotalCount[habId] = (habilidadesTotalCount[habId] || 0) + 1;
                });
            }
        });

        // Get habilidades names
        const allHabilidadesIds = Object.keys(habilidadesTotalCount);
        const habilidades = await db.collection('habilidades')
            .find({ id: { $in: allHabilidadesIds }, userId })
            .toArray();

        const report = habilidades.map(hab => {
            const total = habilidadesTotalCount[hab.id] || 0;
            const erros = habilidadesErradasCount[hab.id] || 0;
            const acertos = habilidadesAcertadasCount[hab.id] || 0;
            const taxaErro = total > 0 ? (erros / total) * 100 : 0;

            return {
                id: hab.id,
                nome: hab.nome,
                totalAparicoes: total,
                erros,
                acertos,
                taxaErro: parseFloat(taxaErro.toFixed(2))
            };
        }).sort((a, b) => b.taxaErro - a.taxaErro);

        return NextResponse.json({ report });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
