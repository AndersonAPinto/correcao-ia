import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireVerifiedEmail, checkRateLimit, isVertexAIConfigured, isOpenRouterConfigured } from '@/lib/api-handlers';
import { isValidUUID, sanitizeString } from '@/lib/utils';
import { runDissertativaCorrectionAndAnalysis } from '@/lib/services/CorrectionPipelineService';

export async function POST(request, { params }) {
    try {
        const userId = await requireVerifiedEmail(request);
        const avaliacaoId = params.id;

        if (!isValidUUID(avaliacaoId)) {
            return NextResponse.json({ error: 'ID de avaliação inválido' }, { status: 400 });
        }

        const rateLimit = await checkRateLimit(request, userId, 'recorrigir', 5, 60);
        if (rateLimit.blocked) {
            return NextResponse.json(
                { error: `Limite atingido. Tente novamente em ${rateLimit.remainingMinutes} minutos.` },
                { status: 429 }
            );
        }

        if (!isVertexAIConfigured() && !isOpenRouterConfigured()) {
            return NextResponse.json({ error: 'Nenhum provedor de IA configurado.' }, { status: 400 });
        }

        const { textoOcr } = await request.json();

        if (!textoOcr || typeof textoOcr !== 'string' || textoOcr.trim().length < 10) {
            return NextResponse.json({ error: 'Texto OCR inválido ou muito curto.' }, { status: 400 });
        }

        const textoSanitizado = sanitizeString(textoOcr, { maxLength: 20000 });

        const { db } = await connectToDatabase();

        const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({ id: avaliacaoId, userId });
        if (!avaliacao) {
            return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
        }

        if (avaliacao.validado) {
            return NextResponse.json({ error: 'Avaliação já validada. Não é possível recorrigir.' }, { status: 400 });
        }

        // Buscar gabarito
        const gabarito = await db.collection('gabaritos').findOne({ id: avaliacao.gabaritoId, userId });
        if (!gabarito) {
            return NextResponse.json({ error: 'Gabarito não encontrado' }, { status: 404 });
        }

        // Buscar perfil de avaliação se existir
        let perfilConteudo = '';
        let criteriosRigorTexto = '';
        if (gabarito.perfilAvaliacaoId) {
            const perfil = await db.collection('perfis_avaliacao').findOne({ id: gabarito.perfilAvaliacaoId, userId });
            if (perfil) {
                perfilConteudo = perfil.conteudo;
                const criteriosRigor = perfil.criteriosRigor || [];
                if (criteriosRigor.length > 0) {
                    criteriosRigorTexto = '\nCRITÉRIOS DE RIGOR DO PERFIL DE AVALIAÇÃO:\n';
                    criteriosRigor.forEach(c => {
                        const nivelTexto = c.nivelRigor === 'rigoroso' ? 'RIGOROSO' : c.nivelRigor === 'moderado' ? 'MODERADO' : 'FLEXÍVEL';
                        criteriosRigorTexto += `- ${c.criterio}: ${nivelTexto}${c.descricao ? ` - ${c.descricao}` : ''}\n`;
                    });
                }
            }
        }

        const habilidades = await db.collection('habilidades').find({ userId }).toArray();
        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        // Re-executar apenas Etapas 2 e 3
        const { correctionData, analysisData } = await runDissertativaCorrectionAndAnalysis({
            textoOCR: textoSanitizado,
            questoesOCR: [],
            gabarito,
            habilidades,
            perfilConteudo,
            criteriosRigorTexto
        });

        const notaFinal = parseFloat(correctionData.nota_final) || 0;
        const exercicios = correctionData.exercicios || [];

        // Processar habilidades
        const habilidadesPontuacao = [];
        const habilidadesAcertadas = [];
        const habilidadesErradas = [];

        (correctionData.habilidades_avaliacao || []).forEach(hab => {
            const pontuacao = parseFloat(hab.pontuacao);
            if (!isNaN(pontuacao) && pontuacao >= 1 && pontuacao <= 10 && habilidadesMap[hab.habilidade_id]) {
                habilidadesPontuacao.push({ habilidadeId: hab.habilidade_id, pontuacao, justificativa: hab.justificativa || '' });
                if (pontuacao >= 7) {
                    if (!habilidadesAcertadas.includes(hab.habilidade_id)) habilidadesAcertadas.push(hab.habilidade_id);
                } else {
                    if (!habilidadesErradas.includes(hab.habilidade_id)) habilidadesErradas.push(hab.habilidade_id);
                }
            }
        });

        await db.collection('avaliacoes_corrigidas').updateOne(
            { id: avaliacaoId, userId },
            {
                $set: {
                    textoOcr: textoSanitizado,
                    textoOcrEditado: true,
                    nota: notaFinal,
                    feedback: correctionData.feedback_geral || '',
                    analisePedagogica: analysisData,
                    exercicios: exercicios.map(ex => ({
                        numero: ex.numero,
                        nota: ex.nota,
                        nota_maxima: ex.nota_maxima,
                        feedback: ex.feedback,
                        ...(ex.detalhes_redacao ? { detalhes_redacao: ex.detalhes_redacao } : {})
                    })),
                    habilidadesPontuacao,
                    habilidadesAcertadas,
                    habilidadesErradas,
                    recorrigidoAt: new Date()
                }
            }
        );

        return NextResponse.json({
            success: true,
            nota: notaFinal,
            feedback: correctionData.feedback_geral || '',
            exercicios: exercicios.map(ex => ({
                numero: ex.numero,
                nota: ex.nota,
                nota_maxima: ex.nota_maxima,
                feedback: ex.feedback,
                detalhes_redacao: ex.detalhes_redacao
            })),
            analisePedagogica: analysisData
        });

    } catch (error) {
        console.error('❌ [RECORRIGIR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
