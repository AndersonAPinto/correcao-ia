import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const turmaId = params.id;

        const { db } = await connectToDatabase();

        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });
        }

        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({ userId, turmaId, validado: true })
            .sort({ createdAt: -1 })
            .toArray();

        if (avaliacoes.length === 0) {
            return NextResponse.json({ intervencao: null, totalAlunos: 0, message: 'Nenhuma avaliação validada ainda.' });
        }

        // Coletar dados por aluno
        const alunoIds = [...new Set(avaliacoes.map(a => a.alunoId))];
        const alunos = await db.collection('alunos').find({ id: { $in: alunoIds } }).toArray();
        const alunosMap = {};
        alunos.forEach(a => alunosMap[a.id] = a.nome);

        const habilidades = await db.collection('habilidades').find({ userId }).toArray();
        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        // Agregar habilidades com dificuldade da turma
        const habScores = {};
        avaliacoes.forEach(av => {
            (av.habilidadesPontuacao || []).forEach(h => {
                if (!habScores[h.habilidadeId]) habScores[h.habilidadeId] = [];
                habScores[h.habilidadeId].push(h.pontuacao);
            });
        });

        const habAgregada = Object.entries(habScores).map(([id, pts]) => ({
            id,
            nome: habilidadesMap[id] || id,
            media: parseFloat((pts.reduce((s, v) => s + v, 0) / pts.length).toFixed(1)),
            totalAvs: pts.length
        })).sort((a, b) => a.media - b.media);

        const habilidadesCriticas = habAgregada.filter(h => h.media < 5);
        const habilidadesFortes = habAgregada.filter(h => h.media >= 7.5);

        // Notas por aluno (identificar quem precisa de mais atenção)
        const notasPorAluno = {};
        avaliacoes.forEach(av => {
            if (!notasPorAluno[av.alunoId]) notasPorAluno[av.alunoId] = [];
            notasPorAluno[av.alunoId].push(av.nota || 0);
        });

        const alunosPorMedia = Object.entries(notasPorAluno).map(([id, notas]) => ({
            nome: alunosMap[id] || id,
            media: parseFloat((notas.reduce((s, v) => s + v, 0) / notas.length).toFixed(1)),
            avs: notas.length
        })).sort((a, b) => a.media - b.media);

        const alunosAtencao = alunosPorMedia.filter(a => a.media < 5);
        const mediaGeral = parseFloat((avaliacoes.reduce((s, a) => s + (a.nota || 0), 0) / avaliacoes.length).toFixed(2));

        // Coletar sugestões individuais das análises pedagógicas
        const sugestoesBruto = avaliacoes
            .map(av => av.analisePedagogica?.sugestao_intervencao)
            .filter(Boolean);

        const pontosAtencaoBruto = avaliacoes
            .map(av => av.analisePedagogica?.ponto_atencao)
            .filter(Boolean);

        return NextResponse.json({
            turma: { id: turmaId, nome: turma.nome },
            totalAvaliacoes: avaliacoes.length,
            totalAlunos: alunoIds.length,
            mediaGeral,
            habilidadesCriticas,
            habilidadesFortes,
            habilidadesCompleto: habAgregada,
            alunosAtencao,
            alunosPorMedia,
            sugestoesIndividuais: sugestoesBruto,
            pontosAtencaoIndividuais: pontosAtencaoBruto
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
