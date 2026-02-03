import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, createNotification, callGeminiAPIWithRetry, isVertexAIConfigured } from '@/lib/api-handlers';
import { validateFileUpload } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Handler para questões dissertativas - OCR + correção com Gemini
async function handleDissertativaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db) {
    try {
        // Verificar turma e aluno
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });
        }

        const aluno = await db.collection('alunos').findOne({ id: alunoId, turmaId });
        if (!aluno) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        // Salvar arquivo
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filename = `${uuidv4()}-${file.name}`;
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);

        const imageUrl = `/uploads/${filename}`;
        const fullImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${imageUrl}`;

        // Verificar configuração do Vertex AI (verifica variável de ambiente e arquivo JSON)
        if (!isVertexAIConfigured()) {
            return NextResponse.json({
                error: 'Vertex AI não configurado. Defina GOOGLE_CLOUD_PROJECT_ID no ambiente ou configure o arquivo de credenciais.'
            }, { status: 400 });
        }

        // Converter imagem para base64
        const base64Image = buffer.toString('base64');
        const mimeType = file.type || 'image/jpeg';

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

        // Buscar habilidades para incluir no prompt
        const habilidades = await db.collection('habilidades')
            .find({ userId })
            .toArray();
        const habilidadesMap = {};
        habilidades.forEach(h => habilidadesMap[h.id] = h.nome);

        // Construir seção de critérios de rigor
        let criteriosRigorTexto = '';
        if (criteriosRigor.length > 0) {
            criteriosRigorTexto = '\nCRITÉRIOS DE RIGOR DO PERFIL DE AVALIAÇÃO:\n';
            criteriosRigor.forEach(c => {
                const nivelTexto = c.nivelRigor === 'rigoroso' ? 'RIGOROSO' :
                    c.nivelRigor === 'moderado' ? 'MODERADO' : 'FLEXÍVEL';
                criteriosRigorTexto += `- ${c.criterio}: ${nivelTexto}`;
                if (c.descricao) {
                    criteriosRigorTexto += ` - ${c.descricao}`;
                }
                criteriosRigorTexto += '\n';
            });
            criteriosRigorTexto += '\nAo corrigir, APLIQUE esses níveis de rigor:\n';
            criteriosRigorTexto += '- RIGOROSO: Seja severo na avaliação deste critério. Erros devem ser penalizados significativamente.\n';
            criteriosRigorTexto += '- MODERADO: Seja equilibrado, considerando tanto o processo quanto o resultado.\n';
            criteriosRigorTexto += '- FLEXÍVEL: Seja compreensivo, valorizando esforço e criatividade mesmo com pequenos erros.\n';
        }

        // Criar prompt para OCR + Correção de questões dissertativas
        const prompt = `Você é um sistema especializado em OCR e correção de provas dissertativas.

TAREFA 1 - OCR:
Transcreva TODO o texto escrito pelo aluno na prova, mantendo a estrutura e formatação original.

TAREFA 2 - CORREÇÃO:
Analise as respostas do aluno comparando com o gabarito fornecido e avalie cada questão.

GABARITO/CRITÉRIOS DE CORREÇÃO:
${gabarito.conteudo || 'Não fornecido'}

${perfilConteudo ? `PERFIL DE AVALIAÇÃO:\n${perfilConteudo}\n` : ''}${criteriosRigorTexto}

INSTRUÇÕES DE CORREÇÃO:
1. Para cada questão identificada, avalie a resposta do aluno
2. Atribua uma nota de 0 a 10 para cada questão (ou use a pontuação máxima especificada)
3. Forneça feedback construtivo para cada questão
4. AVALIE CADA HABILIDADE INDIVIDUALMENTE com uma pontuação de 1 a 10, onde:
   - 1-3: Habilidade não demonstrada ou muito fraca
   - 4-6: Habilidade parcialmente demonstrada, precisa de reforço
   - 7-8: Habilidade demonstrada adequadamente
   - 9-10: Habilidade demonstrada com excelência
5. Identifique quais habilidades foram demonstradas (acertadas) e quais precisam de reforço (erradas)
6. Calcule a nota final (0-10) considerando todas as questões

HABILIDADES DISPONÍVEIS:
${habilidades.map(h => `- ${h.nome} (ID: ${h.id})`).join('\n') || 'Nenhuma habilidade cadastrada'}

Retorne APENAS um JSON válido no formato:
{
  "texto_ocr": "Texto completo transcrito da prova...",
  "nota_final": 8.5,
  "feedback_geral": "Resumo geral do desempenho. Mencione as habilidades com melhor e pior desempenho.",
  "exercicios": [
    {
      "numero": 1,
      "nota": 9.0,
      "nota_maxima": 10.0,
      "feedback": "Excelente resposta, demonstrou compreensão do conceito.",
      "habilidades_acertadas": ["id_habilidade_1", "id_habilidade_2"],
      "habilidades_erradas": []
    }
  ],
  "habilidades_avaliacao": [
    {
      "habilidade_id": "id_habilidade_1",
      "pontuacao": 8.5,
      "justificativa": "Demonstrou boa compreensão do conceito, mas com pequenos erros de cálculo"
    },
    {
      "habilidade_id": "id_habilidade_2",
      "pontuacao": 9.0,
      "justificativa": "Excelente domínio da habilidade, respostas precisas e bem fundamentadas"
    }
  ]
}

IMPORTANTE: 
- Retorne apenas o JSON válido, sem texto adicional
- Use IDs de habilidades que existem na lista fornecida
- Avalie TODAS as habilidades relevantes demonstradas na prova (mínimo 2-3 habilidades)
- Pontuações de habilidades devem estar entre 1 e 10
- Seja rigoroso mas justo na correção, aplicando os critérios de rigor quando especificados
- O feedback deve ser construtivo e educativo
- No feedback_geral, mencione explicitamente as habilidades com melhor e pior desempenho`;

        // O sistema de créditos foi abolido.
        const transactionId = uuidv4();

        let responseText;
        try {
            // Chamar Vertex AI para OCR + Correção (priorizando Gemini 2.0 Flash)
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=dummy`;
            const geminiBody = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image
                                }
                            },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 4096
                    }
                })
            };

            responseText = await callGeminiAPIWithRetry(geminiUrl, geminiBody);
        } catch (error) {
            console.error('Gemini API error:', error);

            // Retornar a mensagem de erro detalhada da API handler se disponível
            return NextResponse.json({
                error: `Erro ao processar imagem com Vertex AI: ${error.message}`
            }, { status: 500 });
        }

        // Extrair e validar JSON da resposta
        let correcaoData = null;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in Gemini response');
            }

            correcaoData = JSON.parse(jsonMatch[0]);

            // Validar estrutura esperada
            if (!correcaoData.texto_ocr || typeof correcaoData.texto_ocr !== 'string') {
                throw new Error('Missing or invalid texto_ocr in response');
            }

            if (correcaoData.nota_final === undefined || typeof correcaoData.nota_final !== 'number') {
                throw new Error('Missing or invalid nota_final in response');
            }

            if (!Array.isArray(correcaoData.exercicios)) {
                throw new Error('Missing or invalid exercicios array in response');
            }
        } catch (e) {
            console.error('Failed to parse Gemini response:', e, responseText);
            return NextResponse.json({
                error: 'Falha ao processar a resposta da correção. Por favor, tente novamente.'
            }, { status: 500 });
        }

        // Processar dados da correção
        const textoOcr = correcaoData.texto_ocr || '';
        const notaFinal = parseFloat(correcaoData.nota_final) || 0;
        const feedbackGeral = correcaoData.feedback_geral || '';
        const exercicios = correcaoData.exercicios || [];

        // Processar habilidades com pontuação (1-10)
        let habilidadesPontuacao = [];
        if (correcaoData.habilidades_avaliacao && Array.isArray(correcaoData.habilidades_avaliacao)) {
            correcaoData.habilidades_avaliacao.forEach(hab => {
                const pontuacao = parseFloat(hab.pontuacao);
                // Validar pontuação entre 1-10
                if (!isNaN(pontuacao) && pontuacao >= 1 && pontuacao <= 10) {
                    // Validar que a habilidade existe
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

        // Processar habilidades acertadas/erradas (compatibilidade + baseado em pontuação)
        let habilidadesAcertadas = [];
        let habilidadesErradas = [];
        let questoesDetalhes = [];

        // Primeiro, processar habilidades baseado em pontuação (>= 7 = acertada)
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
            // Adicionar habilidades acertadas (compatibilidade com formato antigo)
            if (ex.habilidades_acertadas && Array.isArray(ex.habilidades_acertadas)) {
                ex.habilidades_acertadas.forEach(habId => {
                    if (!habilidadesAcertadas.includes(habId)) {
                        habilidadesAcertadas.push(habId);
                    }
                });
            }

            // Adicionar habilidades erradas (compatibilidade com formato antigo)
            if (ex.habilidades_erradas && Array.isArray(ex.habilidades_erradas)) {
                ex.habilidades_erradas.forEach(habId => {
                    if (!habilidadesErradas.includes(habId)) {
                        habilidadesErradas.push(habId);
                    }
                });
            }

            // Criar detalhes da questão
            questoesDetalhes.push({
                numero: ex.numero || 0,
                nota: parseFloat(ex.nota) || 0,
                notaMaxima: parseFloat(ex.nota_maxima) || 10,
                feedback: ex.feedback || '',
                habilidadesAcertadas: ex.habilidades_acertadas || [],
                habilidadesErradas: ex.habilidades_erradas || []
            });
        });

        // Créditos já foram debitados anteriormente (com rollback em caso de erro)

        // Criar avaliação já corrigida
        const assessmentId = uuidv4();
        await db.collection('avaliacoes_corrigidas').insertOne({
            id: assessmentId,
            userId,
            gabaritoId: gabarito.id,
            turmaId,
            alunoId,
            periodo,
            imageUrl: fullImageUrl,
            textoOcr: textoOcr,
            nota: notaFinal,
            feedback: feedbackGeral,
            exercicios: exercicios.map(ex => ({
                numero: ex.numero,
                nota: ex.nota,
                nota_maxima: ex.nota_maxima,
                feedback: ex.feedback
            })),
            questoesDetalhes: questoesDetalhes,
            habilidadesAcertadas: habilidadesAcertadas,
            habilidadesErradas: habilidadesErradas,
            habilidadesPontuacao: habilidadesPontuacao, // Nova estrutura com pontuação 1-10
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
        console.error('Dissertativa upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Handler para múltipla escolha - correção automática instantânea
async function handleMultiplaEscolhaUpload(file, gabarito, turmaId, alunoId, periodo, userId, db) {
    try {
        // Verificar turma e aluno
        const turma = await db.collection('turmas').findOne({ id: turmaId, userId });
        if (!turma) {
            return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });
        }

        const aluno = await db.collection('alunos').findOne({ id: alunoId, turmaId });
        if (!aluno) {
            return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });
        }

        // Salvar arquivo
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filename = `${uuidv4()}-${file.name}`;
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);

        const imageUrl = `/uploads/${filename}`;
        const fullImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${imageUrl}`;

        // Verificar configuração do Vertex AI (verifica variável de ambiente e arquivo JSON)
        if (!isVertexAIConfigured()) {
            return NextResponse.json({
                error: 'Vertex AI não configurado. Defina GOOGLE_CLOUD_PROJECT_ID no ambiente ou configure o arquivo de credenciais.'
            }, { status: 400 });
        }

        // Validar questões do gabarito
        if (!gabarito.questoes || !Array.isArray(gabarito.questoes) || gabarito.questoes.length === 0) {
            return NextResponse.json({
                error: 'Gabarito de múltipla escolha deve ter pelo menos uma questão definida'
            }, { status: 400 });
        }

        // Converter imagem para base64
        const base64Image = buffer.toString('base64');
        const mimeType = file.type || 'image/jpeg';

        // Criar prompt para OCR de múltipla escolha
        const questoesInfo = gabarito.questoes.map(q =>
            `Questão ${q.numero}: Resposta correta é ${q.respostaCorreta}`
        ).join('\n');

        const prompt = `Você é um sistema de OCR especializado em identificar respostas de múltipla escolha em provas.

Analise a imagem da prova e identifique QUAL alternativa foi marcada para cada questão.

GABARITO ESPERADO:
${questoesInfo}

Tarefas:
1. Identifique cada questão numerada na prova
2. Para cada questão, identifique qual alternativa (A, B, C, D ou E) foi marcada pelo aluno
3. Se não conseguir identificar, retorne "N/A" para aquela questão

Retorne APENAS um JSON válido no formato:
{
  "respostas": [
    {"numero": 1, "resposta_aluno": "A"},
    {"numero": 2, "resposta_aluno": "B"},
    {"numero": 3, "resposta_aluno": "N/A"}
  ]
}

IMPORTANTE: Retorne apenas o JSON, sem texto adicional.`;

        // O sistema de créditos foi abolido.
        const transactionId = uuidv4();

        let ocrText;
        try {
            // Chamar Vertex AI para OCR (priorizando Gemini 2.0 Flash)
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=dummy`;
            const geminiBody = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image
                                }
                            },
                            { text: prompt }
                        ]
                    }]
                })
            };

            ocrText = await callGeminiAPIWithRetry(geminiUrl, geminiBody);
        } catch (error) {
            console.error('Gemini API error:', error);
            return NextResponse.json({
                error: `Erro ao processar imagem com Vertex AI: ${error.message}`
            }, { status: 500 });
        }

        // Extrair e validar JSON da resposta
        let respostasAluno = [];
        try {
            const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in Gemini response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validar estrutura esperada
            if (!parsed.respostas || !Array.isArray(parsed.respostas)) {
                throw new Error('Missing or invalid respostas array in response');
            }

            respostasAluno = parsed.respostas;
        } catch (e) {
            console.error('Failed to parse Gemini response:', e, ocrText);
            return NextResponse.json({
                error: 'Falha ao processar OCR. Por favor, tente novamente.'
            }, { status: 500 });
        }

        // Processar correção
        let questoesDetalhes = [];
        let habilidadesAcertadas = [];
        let habilidadesErradas = [];
        let totalPontos = 0;
        let pontosObtidos = 0;

        gabarito.questoes.forEach((questaoGabarito) => {
            const respostaAluno = respostasAluno.find(r => r.numero === questaoGabarito.numero);
            const respostaMarcada = respostaAluno?.resposta_aluno?.toUpperCase().trim();
            const respostaCorreta = questaoGabarito.respostaCorreta.toUpperCase().trim();
            const acertou = respostaMarcada === respostaCorreta && respostaMarcada !== 'N/A';

            const pontuacao = questaoGabarito.pontuacao || 1;
            const notaQuestao = acertou ? pontuacao : 0;

            totalPontos += pontuacao;
            pontosObtidos += notaQuestao;

            questoesDetalhes.push({
                numero: questaoGabarito.numero,
                respostaAluno: respostaMarcada || 'N/A',
                respostaCorreta: respostaCorreta,
                acertou: acertou,
                nota: notaQuestao,
                notaMaxima: pontuacao,
                habilidadeId: questaoGabarito.habilidadeId,
                feedback: acertou
                    ? `Resposta correta!`
                    : respostaMarcada === 'N/A'
                        ? `Resposta não identificada. Resposta correta: ${respostaCorreta}`
                        : `Resposta incorreta. Você marcou ${respostaMarcada}, mas a correta é ${respostaCorreta}`
            });

            if (questaoGabarito.habilidadeId) {
                if (acertou) {
                    if (!habilidadesAcertadas.includes(questaoGabarito.habilidadeId)) {
                        habilidadesAcertadas.push(questaoGabarito.habilidadeId);
                    }
                } else {
                    if (!habilidadesErradas.includes(questaoGabarito.habilidadeId)) {
                        habilidadesErradas.push(questaoGabarito.habilidadeId);
                    }
                }
            }
        });

        // Calcular nota final (0-10)
        const notaFinal = totalPontos > 0 ? (pontosObtidos / totalPontos) * 10 : 0;
        const percentualAcerto = totalPontos > 0 ? (pontosObtidos / totalPontos) * 100 : 0;

        // Criar feedback geral
        const feedbackGeral = `Você acertou ${pontosObtidos} de ${totalPontos} questões (${percentualAcerto.toFixed(1)}%). Nota: ${notaFinal.toFixed(2)}/10.`;

        // Créditos já foram debitados anteriormente (com rollback em caso de erro)

        // Criar avaliação já corrigida
        const assessmentId = uuidv4();
        await db.collection('avaliacoes_corrigidas').insertOne({
            id: assessmentId,
            userId,
            gabaritoId: gabarito.id,
            turmaId,
            alunoId,
            periodo,
            imageUrl: fullImageUrl,
            textoOcr: ocrText, // Salvar JSON completo do OCR
            nota: notaFinal,
            feedback: feedbackGeral,
            exercicios: questoesDetalhes, // Detalhes das questões
            questoesDetalhes: questoesDetalhes,
            habilidadesAcertadas: habilidadesAcertadas,
            habilidadesErradas: habilidadesErradas,
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
        console.error('Multipla escolha upload error:', error);
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
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
