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

        const totalAvaliacoes = avaliacoes.length;
        const notas = avaliacoes.map(a => a.nota || 0).filter(n => n > 0);

        // Calcular média da turma
        const mediaTurma = notas.length > 0
            ? notas.reduce((sum, n) => sum + n, 0) / notas.length
            : 0;

        // Calcular taxa de aprovação (>= 6.0)
        const aprovados = notas.filter(n => n >= 6.0).length;
        const taxaAprovacao = totalAvaliacoes > 0
            ? (aprovados / totalAvaliacoes) * 100
            : 0;

        // Distribuição de notas (formato para gráfico)
        const distribuicaoNotas = [
            { range: '0-3', count: 0 },
            { range: '3-5', count: 0 },
            { range: '5-7', count: 0 },
            { range: '7-9', count: 0 },
            { range: '9-10', count: 0 }
        ];

        notas.forEach(nota => {
            if (nota < 3) distribuicaoNotas[0].count++;
            else if (nota < 5) distribuicaoNotas[1].count++;
            else if (nota < 7) distribuicaoNotas[2].count++;
            else if (nota < 9) distribuicaoNotas[3].count++;
            else distribuicaoNotas[4].count++;
        });

        // Calcular média por aluno
        const alunosMap = {};

        avaliacoes.forEach(av => {
            if (!av.alunoId) return;

            if (!alunosMap[av.alunoId]) {
                alunosMap[av.alunoId] = {
                    id: av.alunoId,
                    notas: [],
                    totalAvaliacoes: 0
                };
            }

            if (av.nota && av.nota > 0) {
                alunosMap[av.alunoId].notas.push(av.nota);
            }
            alunosMap[av.alunoId].totalAvaliacoes++;
        });

        // Buscar nomes dos alunos e calcular médias
        const alunosIds = Object.keys(alunosMap);
        const alunos = await db.collection('alunos')
            .find({ id: { $in: alunosIds } })
            .toArray();

        const alunosComMedias = alunos.map(aluno => {
            const dados = alunosMap[aluno.id];
            const media = dados.notas.length > 0
                ? dados.notas.reduce((sum, n) => sum + n, 0) / dados.notas.length
                : 0;

            return {
                id: aluno.id,
                nome: aluno.nome,
                media: parseFloat(media.toFixed(2)),
                totalAvaliacoes: dados.totalAvaliacoes
            };
        }).sort((a, b) => b.media - a.media); // Ordenar por melhor média

        return NextResponse.json({
            mediaTurma: parseFloat(mediaTurma.toFixed(2)),
            taxaAprovacao: parseFloat(taxaAprovacao.toFixed(1)),
            totalAvaliacoes,
            distribuicaoNotas,
            alunos: alunosComMedias
        });
    } catch (error) {
        console.error('Erro ao buscar métricas da turma:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

