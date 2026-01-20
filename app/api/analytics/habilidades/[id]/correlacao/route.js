import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

// Função para calcular correlação de Pearson
function calcularCorrelacao(x, y) {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
}

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

        // Coletar pontuações por habilidade por aluno
        const dadosPorAluno = {};

        avaliacoes.forEach(av => {
            if (!av.alunoId) return;

            if (!dadosPorAluno[av.alunoId]) {
                dadosPorAluno[av.alunoId] = {};
            }

            // Processar habilidadesPontuacao (é um ARRAY)
            if (av.habilidadesPontuacao && Array.isArray(av.habilidadesPontuacao)) {
                av.habilidadesPontuacao.forEach(habPont => {
                    const habId = habPont.habilidadeId || habPont.habilidade_id;
                    const pontuacao = habPont.pontuacao;
                    
                    if (!habId || typeof pontuacao !== 'number' || pontuacao < 0 || pontuacao > 10) {
                        return; // Pular entradas inválidas
                    }

                    if (!dadosPorAluno[av.alunoId][habId]) {
                        dadosPorAluno[av.alunoId][habId] = [];
                    }
                    dadosPorAluno[av.alunoId][habId].push(pontuacao);
                });
            }
        });

        // Calcular média de pontuação por habilidade por aluno
        const mediasPorAluno = {};
        Object.entries(dadosPorAluno).forEach(([alunoId, habilidades]) => {
            mediasPorAluno[alunoId] = {};
            Object.entries(habilidades).forEach(([habId, pontuacoes]) => {
                const media = pontuacoes.reduce((sum, p) => sum + p, 0) / pontuacoes.length;
                mediasPorAluno[alunoId][habId] = media;
            });
        });

        // Identificar todas as habilidades
        const todasHabilidades = new Set();
        Object.values(mediasPorAluno).forEach(aluno => {
            Object.keys(aluno).forEach(habId => todasHabilidades.add(habId));
        });

        const habilidadesArray = Array.from(todasHabilidades);

        // Buscar nomes das habilidades
        const habilidades = await db.collection('habilidades')
            .find({ id: { $in: habilidadesArray }, userId })
            .toArray();

        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = { id: h.id, nome: h.nome });

        // Calcular correlações entre pares de habilidades
        const correlacoes = [];

        for (let i = 0; i < habilidadesArray.length; i++) {
            for (let j = i + 1; j < habilidadesArray.length; j++) {
                const hab1Id = habilidadesArray[i];
                const hab2Id = habilidadesArray[j];

                // Coletar pontuações de alunos que têm ambas as habilidades
                const pontuacoesHab1 = [];
                const pontuacoesHab2 = [];

                Object.values(mediasPorAluno).forEach(aluno => {
                    if (aluno[hab1Id] !== undefined && aluno[hab2Id] !== undefined) {
                        pontuacoesHab1.push(aluno[hab1Id]);
                        pontuacoesHab2.push(aluno[hab2Id]);
                    }
                });

                // Calcular correlação se houver dados suficientes
                if (pontuacoesHab1.length >= 3) {
                    const correlacao = calcularCorrelacao(pontuacoesHab1, pontuacoesHab2);

                    // Apenas incluir correlações significativas (|r| > 0.3)
                    if (Math.abs(correlacao) > 0.3) {
                        correlacoes.push({
                            habilidade1: habilidadesMap[hab1Id] || { id: hab1Id, nome: hab1Id },
                            habilidade2: habilidadesMap[hab2Id] || { id: hab2Id, nome: hab2Id },
                            correlacao: parseFloat(correlacao.toFixed(3)),
                            tipo: correlacao > 0 ? 'positiva' : 'negativa',
                            amostras: pontuacoesHab1.length
                        });
                    }
                }
            }
        }

        // Ordenar por força da correlação (absoluto)
        correlacoes.sort((a, b) => Math.abs(b.correlacao) - Math.abs(a.correlacao));

        return NextResponse.json({ correlacoes });
    } catch (error) {
        console.error('Erro ao calcular correlações:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

