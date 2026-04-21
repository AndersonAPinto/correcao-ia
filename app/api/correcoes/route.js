import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, createNotification, isVertexAIConfigured } from '@/lib/api-handlers';
import { validateFileUpload } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { saveImageToMongoDB } from '@/lib/fileStorage';
import { runDissertativaPipeline, runMultiplaEscolhaPipeline } from '@/lib/services/CorrectionPipelineService';

// Handler para questões dissertativas - Pipeline: OCR → Correção → Análise
async function handleDissertativaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db) {
    try {
        console.log('📝 [CORRECOES/DISSERTATIVA] Iniciando pipeline...');

        // Verificar turma e aluno
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });
        }

        const aluno = await db.collection('alunos').findOne({ id: alunoId, turmaId });
        if (!aluno) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        // Ler e salvar arquivo
        const bytes = await file.arrayBuffer();
        if (!bytes || bytes.byteLength === 0) {
            throw new Error('Arquivo vazio ou inválido');
        }
        const buffer = Buffer.from(bytes);

        // Salvar imagem no MongoDB GridFS
        const filename = `${uuidv4()}-${file.name}`;
        const mimeType = file.type || 'image/jpeg';

        let imageId;
        try {
            imageId = await saveImageToMongoDB(buffer, filename, mimeType);
        } catch (error) {
            throw new Error(`Erro ao salvar imagem: ${error.message}`);
        }

        const imageUrl = `/api/images/${imageId}`;

        // Converter imagem para base64
        const base64Image = buffer.toString('base64');
        if (!base64Image || base64Image.length === 0) {
            throw new Error('Erro ao converter imagem para base64');
        }

        // Buscar perfil de avaliação se existir
        let perfilConteudo = '';
        let criteriosRigor = [];
        if (gabarito.perfilAvaliacaoId) {
            const perfil = await db.collection('perfis_avaliacao').findOne({
                id: gabarito.perfilAvaliacaoId
            });
            if (perfil) {
                perfilConteudo = perfil.conteudo;
                criteriosRigor = perfil.criteriosRigor || [];
            }
        }

        // Buscar habilidades do usuário
        const habilidades = await db.collection('habilidades')
            .find({ userId })
            .toArray();
        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        // Construir critérios de rigor
        let criteriosRigorTexto = '';
        if (criteriosRigor.length > 0) {
            criteriosRigorTexto = '\nCRITÉRIOS DE RIGOR DO PERFIL DE AVALIAÇÃO:\n';
            criteriosRigor.forEach(c => {
                const nivelTexto = c.nivelRigor === 'rigoroso' ? 'RIGOROSO' :
                    c.nivelRigor === 'moderado' ? 'MODERADO' : 'FLEXÍVEL';
                criteriosRigorTexto += `- ${c.criterio}: ${nivelTexto}`;
                if (c.descricao) criteriosRigorTexto += ` - ${c.descricao}`;
                criteriosRigorTexto += '\n';
            });
            criteriosRigorTexto += '\nAo corrigir, APLIQUE esses níveis de rigor:\n';
            criteriosRigorTexto += '- RIGOROSO: Seja severo. Erros devem ser penalizados significativamente.\n';
            criteriosRigorTexto += '- MODERADO: Equilibre forma e conteúdo.\n';
            criteriosRigorTexto += '- FLEXÍVEL: Valorize esforço e criatividade.\n';
        }

        // ── EXECUTAR PIPELINE (OCR → Correção → Análise) ──
        console.log('🚀 [CORRECOES/DISSERTATIVA] Executando pipeline de 3 etapas...');

        const { ocrData, correctionData, analysisData } = await runDissertativaPipeline({
            base64Image,
            mimeType,
            gabarito,
            habilidades,
            perfilConteudo,
            criteriosRigorTexto
        });

        // Processar resultados do pipeline
        const textoOcr = ocrData.texto_completo || '';
        const notaFinal = parseFloat(correctionData.nota_final) || 0;
        const feedbackGeral = correctionData.feedback_geral || '';
        const exercicios = correctionData.exercicios || [];
        const analisePedagogica = analysisData || {};

        // Processar habilidades com pontuação
        let habilidadesPontuacao = [];
        if (correctionData.habilidades_avaliacao && Array.isArray(correctionData.habilidades_avaliacao)) {
            correctionData.habilidades_avaliacao.forEach(hab => {
                const pontuacao = parseFloat(hab.pontuacao);
                if (!isNaN(pontuacao) && pontuacao >= 1 && pontuacao <= 10) {
                    if (habilidadesMap[hab.habilidade_id]) {
                        habilidadesPontuacao.push({
                            habilidadeId: hab.habilidade_id,
                            pontuacao: pontuacao,
                            justificativa: hab.justificativa || ''
                        });
                    }
                }
            });
        }

        // Processar habilidades acertadas/erradas
        let habilidadesAcertadas = [];
        let habilidadesErradas = [];
        let questoesDetalhes = [];

        habilidadesPontuacao.forEach(hab => {
            if (hab.pontuacao >= 7) {
                if (!habilidadesAcertadas.includes(hab.habilidadeId)) {
                    habilidadesAcertadas.push(hab.habilidadeId);
                }
            } else {
                if (!habilidadesErradas.includes(hab.habilidadeId)) {
                    habilidadesErradas.push(hab.habilidadeId);
                }
            }
        });

        exercicios.forEach((ex) => {
            if (ex.habilidades_acertadas && Array.isArray(ex.habilidades_acertadas)) {
                ex.habilidades_acertadas.forEach(habId => {
                    if (!habilidadesAcertadas.includes(habId)) habilidadesAcertadas.push(habId);
                });
            }
            if (ex.habilidades_erradas && Array.isArray(ex.habilidades_erradas)) {
                ex.habilidades_erradas.forEach(habId => {
                    if (!habilidadesErradas.includes(habId)) habilidadesErradas.push(habId);
                });
            }

            questoesDetalhes.push({
                numero: ex.numero || 0,
                nota: parseFloat(ex.nota) || 0,
                notaMaxima: parseFloat(ex.nota_maxima) || 10,
                feedback: ex.feedback || '',
                habilidadesAcertadas: ex.habilidades_acertadas || [],
                habilidadesErradas: ex.habilidades_erradas || []
            });
        });

        // Criar avaliação corrigida
        const assessmentId = uuidv4();
        await db.collection('avaliacoes_corrigidas').insertOne({
            id: assessmentId,
            userId,
            gabaritoId: gabarito.id,
            turmaId,
            alunoId,
            periodo,
            imageUrl,
            imageId,
            textoOcr,
            nota: notaFinal,
            feedback: feedbackGeral,
            analisePedagogica,
            exercicios: exercicios.map(ex => ({
                numero: ex.numero,
                nota: ex.nota,
                nota_maxima: ex.nota_maxima,
                feedback: ex.feedback
            })),
            questoesDetalhes,
            habilidadesAcertadas,
            habilidadesErradas,
            habilidadesPontuacao,
            pipelineVersion: 'v2',
            status: 'completed',
            validado: false,
            createdAt: new Date(),
            completedAt: new Date()
        });

        // Criar notificação
        await createNotification(
            db,
            userId,
            'avaliacao_concluida',
            `Avaliação corrigida automaticamente. Nota: ${notaFinal.toFixed(2)}/10`,
            assessmentId
        );

        return NextResponse.json({
            success: true,
            assessmentId,
            imageUrl,
            nota: notaFinal,
            correcaoAutomatica: true
        });

    } catch (error) {
        console.error('❌ [CORRECOES/DISSERTATIVA] Erro no pipeline:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Handler para múltipla escolha - Pipeline: OCR (IA) → Correção (código)
async function handleMultiplaEscolhaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db) {
    try {
        console.log('🔢 [CORRECOES/MULTIPLA] Iniciando pipeline...');

        // Verificar turma e aluno
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });
        }

        const aluno = await db.collection('alunos').findOne({ id: alunoId, turmaId });
        if (!aluno) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        // Ler e salvar arquivo
        const bytes = await file.arrayBuffer();
        if (!bytes || bytes.byteLength === 0) {
            throw new Error('Arquivo vazio ou inválido');
        }
        const buffer = Buffer.from(bytes);

        // Salvar imagem no MongoDB GridFS
        const filename = `${uuidv4()}-${file.name}`;
        const mimeType = file.type || 'image/jpeg';

        let imageId;
        try {
            imageId = await saveImageToMongoDB(buffer, filename, mimeType);
        } catch (error) {
            throw new Error(`Erro ao salvar imagem: ${error.message}`);
        }

        const imageUrl = `/api/images/${imageId}`;

        // Validar questões do gabarito
        if (!gabarito.questoes || !Array.isArray(gabarito.questoes) || gabarito.questoes.length === 0) {
            return NextResponse.json({
                error: 'Gabarito de múltipla escolha deve ter pelo menos uma questão definida'
            }, { status: 400 });
        }

        // Converter imagem para base64
        const base64Image = buffer.toString('base64');

        // ── EXECUTAR PIPELINE (OCR → Correção em código) ──
        console.log('🚀 [CORRECOES/MULTIPLA] Executando pipeline...');

        const result = await runMultiplaEscolhaPipeline({
            base64Image,
            mimeType,
            gabarito
        });

        // Criar avaliação corrigida
        const assessmentId = uuidv4();
        await db.collection('avaliacoes_corrigidas').insertOne({
            id: assessmentId,
            userId,
            gabaritoId: gabarito.id,
            turmaId,
            alunoId,
            periodo,
            imageUrl,
            imageId,
            textoOcr: JSON.stringify(result.ocrData),
            nota: result.notaFinal,
            feedback: result.feedbackGeral,
            exercicios: result.questoesDetalhes,
            questoesDetalhes: result.questoesDetalhes,
            habilidadesAcertadas: result.habilidadesAcertadas,
            habilidadesErradas: result.habilidadesErradas,
            pipelineVersion: 'v2',
            status: 'completed',
            validado: false,
            createdAt: new Date(),
            completedAt: new Date()
        });

        // Criar notificação
        await createNotification(
            db,
            userId,
            'avaliacao_concluida',
            `Avaliação corrigida automaticamente. Nota: ${result.notaFinal.toFixed(2)}/10`,
            assessmentId
        );

        return NextResponse.json({
            success: true,
            assessmentId,
            imageUrl,
            nota: result.notaFinal,
            correcaoAutomatica: true
        });

    } catch (error) {
        console.error('❌ [CORRECOES/MULTIPLA] Erro no pipeline:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const userId = await requireAuth(request);
        const formData = await request.formData();

        const { db } = await connectToDatabase();

        // Extract common fields
        const file = formData.get('arquivo');
        const gabaritoId = formData.get('gabaritoId');
        const turmaId = formData.get('turmaId');
        const alunoId = formData.get('alunoId');
        const periodo = formData.get('periodo');

        if (!file || !gabaritoId || !turmaId || !alunoId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validar arquivo antes de processar
        const validation = validateFileUpload(file, {
            maxSizeMB: 10,
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
        });

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Verificar Vertex AI configurado
        if (!isVertexAIConfigured()) {
            return NextResponse.json({
                error: '⚙️ O sistema de IA não está configurado corretamente. Por favor, contate o suporte.'
            }, { status: 400 });
        }

        // Verificar se o gabarito pertence ao usuário
        const gabarito = await db.collection('gabaritos').findOne({ id: gabaritoId, userId });
        if (!gabarito) {
            return NextResponse.json({ error: 'Gabarito não encontrado ou acesso negado' }, { status: 404 });
        }

        if (gabarito.tipo === 'multipla_escolha') {
            return handleMultiplaEscolhaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db);
        } else {
            return handleDissertativaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db);
        }

    } catch (error) {
        console.error('❌ [CORRECOES] Erro geral:', error.message);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
