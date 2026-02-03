import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, createNotification, checkRateLimit, logAudit } from '@/lib/api-handlers';
import { validateNota, isValidUUID, sanitizeString } from '@/lib/utils';

export async function POST(request, { params }) {
    try {
        const userId = await requireAuth(request);
        const avaliacaoId = params.id;

        // Validar formato UUID
        if (!isValidUUID(avaliacaoId)) {
            return NextResponse.json({ error: 'ID de avaliação inválido' }, { status: 400 });
        }

        // Rate limiting
        const rateLimit = await checkRateLimit(request, userId, 'validar_avaliacao', 20, 60);
        if (rateLimit.blocked) {
            return NextResponse.json({
                error: `Muitas tentativas. Tente novamente em ${rateLimit.remainingMinutes} minutos.`
            }, { status: 429 });
        }

        const { nota, feedback } = await request.json();

        // Validar nota com whitelist rigorosa
        const notaValidation = validateNota(nota, { min: 0, max: 10 });
        if (!notaValidation.valid) {
            return NextResponse.json({ error: notaValidation.error }, { status: 400 });
        }

        // Sanitizar feedback
        const sanitizedFeedback = feedback ? sanitizeString(feedback, { maxLength: 5000 }) : '';

        const { db } = await connectToDatabase();

        // Verificar se avaliação pertence ao usuário
        const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
            id: avaliacaoId,
            userId
        });

        if (!avaliacao) {
            return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
        }

        const result = await db.collection('avaliacoes_corrigidas').updateOne(
            { id: avaliacaoId, userId },
            {
                $set: {
                    nota: notaValidation.value,
                    feedback: sanitizedFeedback,
                    validado: true,
                    validadoAt: new Date()
                }
            }
        );

        // Auditoria
        await logAudit(request, userId, 'avaliacao_validada', {
            avaliacaoId,
            nota: notaValidation.value
        });

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

        // Validar formato UUID
        if (!isValidUUID(avaliacaoId)) {
            return NextResponse.json({ error: 'ID de avaliação inválido' }, { status: 400 });
        }

        // Rate limiting
        const rateLimit = await checkRateLimit(request, userId, 'validar_avaliacao', 20, 60);
        if (rateLimit.blocked) {
            return NextResponse.json({
                error: `Muitas tentativas. Tente novamente em ${rateLimit.remainingMinutes} minutos.`
            }, { status: 429 });
        }

        const { notaFinal, notasAjustadas } = await request.json();

        const { db } = await connectToDatabase();

        // Buscar avaliação atual
        const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
            id: avaliacaoId,
            userId
        });

        if (!avaliacao) {
            return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
        }

        // Preparar atualização
        const updateData = {
            validado: true,
            validadoAt: new Date()
        };

        // Se notaFinal foi fornecida, validar e atualizar
        if (notaFinal !== undefined && notaFinal !== null) {
            const notaValidation = validateNota(notaFinal, { min: 0, max: 10 });
            if (!notaValidation.valid) {
                return NextResponse.json({ error: notaValidation.error }, { status: 400 });
            }
            updateData.nota = notaValidation.value;
        }

        // Se há notas ajustadas, validar e atualizar exercícios
        if (notasAjustadas && Array.isArray(notasAjustadas)) {
            if (notasAjustadas.length > 100) {
                return NextResponse.json({ error: 'Muitas notas ajustadas' }, { status: 400 });
            }

            const exercicios = avaliacao.exercicios || [];

            // Validar e atualizar cada exercício
            for (const ajuste of notasAjustadas) {
                if (!ajuste.numero || typeof ajuste.numero !== 'number') {
                    return NextResponse.json({ error: 'Número de exercício inválido' }, { status: 400 });
                }

                if (ajuste.nota !== undefined && ajuste.nota !== null) {
                    const notaValidation = validateNota(ajuste.nota, { min: 0, max: 10 });
                    if (!notaValidation.valid) {
                        return NextResponse.json({ error: `Nota inválida para exercício ${ajuste.numero}` }, { status: 400 });
                    }
                }

                const exercicioIndex = exercicios.findIndex(ex => ex.numero === ajuste.numero);
                if (exercicioIndex !== -1) {
                    if (ajuste.nota !== undefined && ajuste.nota !== null) {
                        const notaValidation = validateNota(ajuste.nota, { min: 0, max: 10 });
                        exercicios[exercicioIndex].nota = notaValidation.value;
                    }
                    if (ajuste.feedback !== undefined) {
                        exercicios[exercicioIndex].feedback = sanitizeString(ajuste.feedback, { maxLength: 1000 });
                    }
                }
            }

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
            `Avaliação validada com sucesso. Nota final: ${updateData.nota || avaliacao.nota || 0}`,
            avaliacaoId
        );

        // Auditoria
        await logAudit(request, userId, 'avaliacao_validada', {
            avaliacaoId,
            notaFinal: updateData.nota || avaliacao.nota
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro ao validar avaliação:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
