import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-handlers';

export async function GET(request) {
    try {
        const userId = await requireAuth(request);
        const { db } = await connectToDatabase();

        const avaliacoes = await db.collection('avaliacoes_corrigidas')
            .find({ userId, validado: true })
            .sort({ createdAt: -1 })
            .toArray();

        // Enriquecer dados
        const enriched = await Promise.all(avaliacoes.map(async (av) => {
            const turma = await db.collection('turmas').findOne({ id: av.turmaId });
            const aluno = await db.collection('alunos').findOne({ id: av.alunoId });
            const gabarito = await db.collection('gabaritos').findOne({ id: av.gabaritoId });

            return {
                ...av,
                turmaNome: turma ? turma.nome : 'N/A',
                alunoNome: aluno ? aluno.nome : 'N/A',
                gabaritoTitulo: gabarito ? gabarito.titulo : 'N/A'
            };
        }));

        // Generate CSV
        const headers = ['Turma', 'Aluno', 'Gabarito', 'Período', 'Nota', 'Data Validação'];
        const rows = enriched.map(av => [
            av.turmaNome,
            av.alunoNome,
            av.gabaritoTitulo,
            av.periodo || 'N/A',
            av.nota || 0,
            av.validadoAt ? new Date(av.validadoAt).toLocaleDateString('pt-BR') : 'N/A'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="avaliacoes_${new Date().toISOString().split('T')[0]}.csv"`
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}
