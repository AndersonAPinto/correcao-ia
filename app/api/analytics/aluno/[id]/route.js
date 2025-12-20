import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const alunoId = params.id;
        const { db } = await connectToDatabase();

        // Buscar aluno
        const aluno = await db.collection('alunos').findOne({ id: alunoId });
        if (!aluno) {
            return NextResponse.json({ error: 'Aluno not found' }, { status: 404 });
        }

        // Verificar se a turma do aluno pertence ao usuário
        const turma = await db.collection('turmas').findOne({ id: aluno.turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Buscar todas as avaliações validadas do aluno
        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({
                userId,
                alunoId,
                validado: true
            })
            .sort({ validadoAt: -1, createdAt: -1 })
            .toArray();

        // Calcular média do aluno
        const notas = avaliacoes.map(a => a.nota || 0).filter(n => n > 0);
        const mediaAluno = notas.length > 0
            ? notas.reduce((sum, n) => sum + n, 0) / notas.length
            : 0;

        // Buscar média da turma para comparação
        const avaliacoesTurma = await db.collection('avaliacoes_corrigidas')
            .find({
                userId,
                turmaId: aluno.turmaId,
                validado: true
            })
            .toArray();

        const notasTurma = avaliacoesTurma.map(a => a.nota || 0).filter(n => n > 0);
        const mediaTurma = notasTurma.length > 0
            ? notasTurma.reduce((sum, n) => sum + n, 0) / notasTurma.length
            : 0;

        // Áreas de reforço (habilidades mais erradas)
        const habilidadesErradasCount = {};

        avaliacoes.forEach(av => {
            if (av.habilidadesErradas && Array.isArray(av.habilidadesErradas)) {
                av.habilidadesErradas.forEach(habId => {
                    habilidadesErradasCount[habId] = (habilidadesErradasCount[habId] || 0) + 1;
                });
            }
        });

        // Buscar nomes das habilidades
        const habilidadesIds = Object.keys(habilidadesErradasCount);
        const habilidades = await db.collection('habilidades')
            .find({ id: { $in: habilidadesIds }, userId })
            .toArray();

        const areasReforco = habilidades.map(hab => ({
            id: hab.id,
            nome: hab.nome,
            vezesErrou: habilidadesErradasCount[hab.id] || 0
        })).sort((a, b) => b.vezesErrou - a.vezesErrou);

        // Evolução das notas (últimas avaliações)
        const evolucao = avaliacoes.slice(0, 10).reverse().map(av => ({
            data: av.validadoAt || av.createdAt,
            nota: av.nota || 0,
            gabaritoId: av.gabaritoId,
            periodo: av.periodo || 'N/A'
        }));

        return NextResponse.json({
            aluno: {
                id: aluno.id,
                nome: aluno.nome,
                turmaId: aluno.turmaId,
                turmaNome: turma.nome
            },
            mediaAluno: parseFloat(mediaAluno.toFixed(2)),
            mediaTurma: parseFloat(mediaTurma.toFixed(2)),
            totalAvaliacoes: avaliacoes.length,
            areasReforco,
            evolucao,
            avaliacoes: avaliacoes.map(av => ({
                id: av.id,
                nota: av.nota,
                periodo: av.periodo,
                validadoAt: av.validadoAt,
                gabaritoId: av.gabaritoId
            }))
        });
    } catch (error) {
        console.error('Erro ao buscar dados do aluno:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

