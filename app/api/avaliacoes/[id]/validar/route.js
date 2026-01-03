import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, createNotification } from '@/lib/api-handlers';

export async function POST(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const avaliacaoId = params.id;
        const { nota, feedback } = await request.json();

        const { db } = await connectToDatabase();

        const result = await db.collection('avaliacoes_corrigidas').updateOne(
            { id: avaliacaoId, userId },
            {
                $set: {
                    nota: parseFloat(nota),
                    feedback,
                    validado: true,
                    validadoAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Avaliação not found' }, { status: 404 });
        }

        // Criar notificação de validação
        await createNotification(
            db,
            userId,
            'avaliacao_validada',
            `Avaliação validada com sucesso. Nota final: ${nota}`,
            avaliacaoId
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function PUT(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const avaliacaoId = params.id;
        const { notaFinal, notasAjustadas } = await request.json();

        const { db } = await connectToDatabase();

        // Buscar avaliação atual
        const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
            id: avaliacaoId,
            userId
        });

        if (!avaliacao) {
            return NextResponse.json({ error: 'Avaliação not found' }, { status: 404 });
        }

        // Preparar atualização
        const updateData = {
            validado: true,
            validadoAt: new Date()
        };

        // Se notaFinal foi fornecida, atualizar
        if (notaFinal !== undefined && notaFinal !== null) {
            updateData.nota = parseFloat(notaFinal);
        }

        // Se há notas ajustadas, atualizar exercícios
        if (notasAjustadas && Array.isArray(notasAjustadas) && notasAjustadas.length > 0) {
            const exercicios = avaliacao.exercicios || [];

            // Atualizar cada exercício com as notas ajustadas
            notasAjustadas.forEach(ajuste => {
                const exercicioIndex = exercicios.findIndex(ex => ex.numero === ajuste.numero);
                if (exercicioIndex !== -1) {
                    exercicios[exercicioIndex].nota = ajuste.nota;
                    if (ajuste.feedback !== undefined) {
                        exercicios[exercicioIndex].feedback = ajuste.feedback;
                    }
                }
            });

            updateData.exercicios = exercicios;
        }

        const result = await db.collection('avaliacoes_corrigidas').updateOne(
            { id: avaliacaoId, userId },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: 'Avaliação not found' }, { status: 404 });
        }

        // Criar notificação de validação
        await createNotification(
            db,
            userId,
            'avaliacao_validada',
            `Avaliação validada com sucesso. Nota final: ${notaFinal || avaliacao.nota || 0}`,
            avaliacaoId
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao validar avaliação:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
