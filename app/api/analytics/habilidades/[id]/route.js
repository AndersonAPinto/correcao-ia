import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const turmaId = params.id;
        const { db } = await connectToDatabase();

        // Verificar se a turma pertence ao usuário
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma not found' }, { status: 404 });
        }

        // Buscar todas as avaliações validadas da turma
        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({
                userId,
                turmaId,
                validado: true
            })
            .toArray();

        // Agregar dados de habilidades
        const habilidadesData = {};

        avaliacoes.forEach(av => {
            // Processar habilidades acertadas
            if (av.habilidadesAcertadas && Array.isArray(av.habilidadesAcertadas)) {
                av.habilidadesAcertadas.forEach(habId => {
                    if (!habilidadesData[habId]) {
                        habilidadesData[habId] = {
                            id: habId,
                            acertos: 0,
                            erros: 0,
                            total: 0,
                            pontuacoes: []
                        };
                    }
                    habilidadesData[habId].acertos++;
                    habilidadesData[habId].total++;
                });
            }

            // Processar habilidades erradas
            if (av.habilidadesErradas && Array.isArray(av.habilidadesErradas)) {
                av.habilidadesErradas.forEach(habId => {
                    if (!habilidadesData[habId]) {
                        habilidadesData[habId] = {
                            id: habId,
                            acertos: 0,
                            erros: 0,
                            total: 0,
                            pontuacoes: []
                        };
                    }
                    habilidadesData[habId].erros++;
                    habilidadesData[habId].total++;
                });
            }

            // Processar habilidades com pontuação (habilidadesPontuacao)
            if (av.habilidadesPontuacao && typeof av.habilidadesPontuacao === 'object') {
                Object.entries(av.habilidadesPontuacao).forEach(([habId, pontuacao]) => {
                    if (!habilidadesData[habId]) {
                        habilidadesData[habId] = {
                            id: habId,
                            acertos: 0,
                            erros: 0,
                            total: 0,
                            pontuacoes: []
                        };
                    }
                    if (typeof pontuacao === 'number' && pontuacao >= 0) {
                        habilidadesData[habId].pontuacoes.push(pontuacao);
                    }
                });
            }
        });

        // Buscar nomes das habilidades
        const habilidadesIds = Object.keys(habilidadesData);
        if (habilidadesIds.length === 0) {
            return NextResponse.json({ habilidades: [] });
        }

        const habilidades = await db.collection('habilidades')
            .find({ id: { $in: habilidadesIds }, userId })
            .toArray();

        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        // Montar relatório final
        const habilidadesReport = Object.entries(habilidadesData)
            .map(([habId, data]) => {
                const taxaAcerto = data.total > 0
                    ? (data.acertos / data.total) * 100
                    : 0;

                const mediaPontuacao = data.pontuacoes.length > 0
                    ? data.pontuacoes.reduce((sum, p) => sum + p, 0) / data.pontuacoes.length
                    : null;

                return {
                    id: habId,
                    nome: habilidadesMap[habId] || habId,
                    acertos: data.acertos,
                    erros: data.erros,
                    total: data.total,
                    taxaAcerto: parseFloat(taxaAcerto.toFixed(1)),
                    mediaPontuacao: mediaPontuacao !== null ? parseFloat(mediaPontuacao.toFixed(2)) : null
                };
            })
            .sort((a, b) => b.taxaAcerto - a.taxaAcerto); // Ordenar por taxa de acerto (melhor primeiro)

        return NextResponse.json({ habilidades: habilidadesReport });
    } catch (error) {
        console.error('Erro ao buscar relatório de habilidades:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

