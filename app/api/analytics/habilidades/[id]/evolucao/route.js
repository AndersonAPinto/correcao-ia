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

        // Buscar todas as avaliações validadas da turma, ordenadas por data
        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({
                userId,
                turmaId,
                validado: true
            })
            .sort({ validadoAt: 1, createdAt: 1 })
            .toArray();

        // Agregar dados por habilidade e período
        const habilidadesEvolucao = {};

        avaliacoes.forEach(av => {
            // Usar período da avaliação ou extrair da data
            const periodo = av.periodo || (() => {
                const date = new Date(av.validadoAt || av.createdAt);
                return `${date.getMonth() + 1}/${date.getFullYear()}`;
            })();

            // Processar habilidades com pontuação por período (habilidadesPontuacao é um ARRAY)
            if (av.habilidadesPontuacao && Array.isArray(av.habilidadesPontuacao)) {
                av.habilidadesPontuacao.forEach(habPont => {
                    const habId = habPont.habilidadeId || habPont.habilidade_id;
                    const pontuacao = habPont.pontuacao;
                    
                    if (!habId || typeof pontuacao !== 'number' || pontuacao < 0 || pontuacao > 10) {
                        return; // Pular entradas inválidas
                    }

                    if (!habilidadesEvolucao[habId]) {
                        habilidadesEvolucao[habId] = {};
                    }

                    if (!habilidadesEvolucao[habId][periodo]) {
                        habilidadesEvolucao[habId][periodo] = {
                            periodo,
                            pontuacoes: []
                        };
                    }

                    habilidadesEvolucao[habId][periodo].pontuacoes.push(pontuacao);
                });
            }
        });

        // Buscar nomes das habilidades
        const habilidadesIds = Object.keys(habilidadesEvolucao);
        if (habilidadesIds.length === 0) {
            return NextResponse.json({ habilidades: [] });
        }

        const habilidades = await db.collection('habilidades')
            .find({ id: { $in: habilidadesIds }, userId })
            .toArray();

        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        // Montar resposta final
        const habilidadesComEvolucao = Object.entries(habilidadesEvolucao)
            .map(([habId, periodosData]) => {
                const evolucao = Object.values(periodosData)
                    .map(p => ({
                        periodo: p.periodo,
                        mediaPontuacao: p.pontuacoes.length > 0
                            ? parseFloat((p.pontuacoes.reduce((sum, pt) => sum + pt, 0) / p.pontuacoes.length).toFixed(2))
                            : 0
                    }))
                    .sort((a, b) => {
                        // Ordenar por período (assumindo formato "M/YYYY")
                        const [ma, ya] = a.periodo.split('/').map(Number);
                        const [mb, yb] = b.periodo.split('/').map(Number);
                        if (ya !== yb) return ya - yb;
                        return ma - mb;
                    });

                return {
                    id: habId,
                    nome: habilidadesMap[habId] || habId,
                    evolucao
                };
            })
            .filter(h => h.evolucao.length > 0); // Apenas habilidades com dados de evolução

        return NextResponse.json({ habilidades: habilidadesComEvolucao });
    } catch (error) {
        console.error('Erro ao buscar evolução de habilidades:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

