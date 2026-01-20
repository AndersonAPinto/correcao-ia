import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, callGeminiAPIWithRetry, isVertexAIConfigured } from '@/lib/api-handlers';

// PUT - Atualizar pontuação (manual ou reavaliar com IA)
export async function PUT(request, { params }) {
  try {
    const userId = await requireAuth(request);
    const { id: avaliacaoId, habilidadeId } = params;
    const { pontuacao, justificativa, reavaliarComIA = false } = await request.json();

    const { db } = await connectToDatabase();

    const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
      id: avaliacaoId,
      userId
    });

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    const habilidadesPontuacao = avaliacao.habilidadesPontuacao || [];
    const indexHabilidade = habilidadesPontuacao.findIndex(h => h.habilidadeId === habilidadeId);

    if (indexHabilidade === -1) {
      return NextResponse.json({ error: 'Habilidade não encontrada nesta avaliação' }, { status: 404 });
    }

    let novaPontuacao = pontuacao !== undefined ? parseFloat(pontuacao) : habilidadesPontuacao[indexHabilidade].pontuacao;
    let novaJustificativa = justificativa !== undefined ? justificativa : habilidadesPontuacao[indexHabilidade].justificativa;

    // Se solicitar reavaliação com IA
    if (reavaliarComIA && isVertexAIConfigured()) {
      const habilidade = await db.collection('habilidades').findOne({
        id: habilidadeId,
        userId
      });

      if (habilidade) {
        const gabarito = await db.collection('gabaritos').findOne({
          id: avaliacao.gabaritoId,
          userId
        });

        let perfilConteudo = '';
        if (gabarito?.perfilId) {
          const perfil = await db.collection('perfis_avaliacao').findOne({
            id: gabarito.perfilId,
            userId
          });
          if (perfil) perfilConteudo = perfil.conteudo || '';
        }

        // Preparar dados das respostas
        const respostasTexto = avaliacao.exercicios || avaliacao.questoesDetalhes || [];
        const respostasFormatadas = respostasTexto.map((ex, idx) => {
          return `Questão ${ex.numero || idx + 1}: ${ex.feedback || 'Sem feedback'} (Nota: ${ex.nota || 0}/${ex.notaMaxima || ex.nota_maxima || 10})`;
        }).join('\n');

        // Buscar descrição específica da habilidade nesta avaliação
        const habilidadeAvaliacao = habilidadesPontuacao.find(h => h.habilidadeId === habilidadeId);
        const descricaoFocoEspecifica = habilidadeAvaliacao?.descricaoFoco || '';

        const prompt = `Reavalie a habilidade "${habilidade.nome}" nesta prova já corrigida.

CONTEXTO:
- OCR: ${avaliacao.textoOcr || 'N/A'}
- Respostas do aluno: 
${respostasFormatadas || 'N/A'}
- Nota atual: ${avaliacao.nota}/10
- Feedback geral: ${avaliacao.feedback || ''}

${gabarito?.conteudo ? `GABARITO:\n${gabarito.conteudo}\n` : ''}
${perfilConteudo ? `PERFIL:\n${perfilConteudo}\n` : ''}

HABILIDADE A REAVALIAR:
- Nome: ${habilidade.nome}
- Descrição geral: ${habilidade.descricao || 'Não fornecida'}
${descricaoFocoEspecifica ? `- FOCO ESPECÍFICO PARA ESTA PROVA:\n${descricaoFocoEspecifica}\n\nIMPORTANTE: Ao reavaliar esta habilidade, foque especialmente nos aspectos descritos acima.` : ''}

Avalie novamente esta habilidade específica e retorne JSON:
{
  "pontuacao": 8.5,
  "justificativa": "Justificativa detalhada..."
}`;

        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=dummy`;
          const geminiBody = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                temperature: 0.3, 
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024 
              }
            })
          };

          const responseText = await callGeminiAPIWithRetry(geminiUrl, geminiBody);
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const avaliacaoHabilidade = JSON.parse(jsonMatch[0]);
            const pontuacaoIA = parseFloat(avaliacaoHabilidade.pontuacao);
            if (!isNaN(pontuacaoIA) && pontuacaoIA >= 1 && pontuacaoIA <= 10) {
              novaPontuacao = pontuacaoIA;
            }
            if (avaliacaoHabilidade.justificativa) {
              novaJustificativa = avaliacaoHabilidade.justificativa;
            }
          }
        } catch (error) {
          console.error('Erro na reavaliação:', error);
          // Manter valores atuais se reavaliação falhar
        }
      }
    }

    // Validar pontuação
    if (novaPontuacao === undefined || novaPontuacao === null || isNaN(novaPontuacao)) {
      return NextResponse.json({ error: 'Pontuação inválida' }, { status: 400 });
    }

    if (novaPontuacao < 1 || novaPontuacao > 10) {
      return NextResponse.json({ error: 'Pontuação deve estar entre 1 e 10' }, { status: 400 });
    }

    // Atualizar habilidade
    habilidadesPontuacao[indexHabilidade] = {
      habilidadeId,
      pontuacao: novaPontuacao,
      justificativa: novaJustificativa || habilidadesPontuacao[indexHabilidade].justificativa || ''
    };

    // Recalcular acertadas/erradas
    const habilidadesAcertadas = [...(avaliacao.habilidadesAcertadas || [])];
    const habilidadesErradas = [...(avaliacao.habilidadesErradas || [])];

    if (novaPontuacao >= 7) {
      if (!habilidadesAcertadas.includes(habilidadeId)) {
        habilidadesAcertadas.push(habilidadeId);
      }
      const indexErradas = habilidadesErradas.indexOf(habilidadeId);
      if (indexErradas >= 0) habilidadesErradas.splice(indexErradas, 1);
    } else {
      if (!habilidadesErradas.includes(habilidadeId)) {
        habilidadesErradas.push(habilidadeId);
      }
      const indexAcertadas = habilidadesAcertadas.indexOf(habilidadeId);
      if (indexAcertadas >= 0) habilidadesAcertadas.splice(indexAcertadas, 1);
    }

    // Atualizar avaliação
    await db.collection('avaliacoes_corrigidas').updateOne(
      { id: avaliacaoId, userId },
      {
        $set: {
          habilidadesPontuacao,
          habilidadesAcertadas,
          habilidadesErradas,
          atualizadoEm: new Date()
        }
      }
    );

    // Buscar nome da habilidade para resposta
    const habilidade = await db.collection('habilidades').findOne({
      id: habilidadeId,
      userId
    });

    return NextResponse.json({ 
      success: true,
      habilidade: {
        ...habilidadesPontuacao[indexHabilidade],
        nome: habilidade?.nome || 'Habilidade não encontrada',
        descricao: habilidade?.descricao || ''
      },
      message: reavaliarComIA 
        ? 'Habilidade reavaliada com IA com sucesso' 
        : 'Habilidade atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar habilidade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remover habilidade
export async function DELETE(request, { params }) {
  try {
    const userId = await requireAuth(request);
    const { id: avaliacaoId, habilidadeId } = params;

    const { db } = await connectToDatabase();

    const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
      id: avaliacaoId,
      userId
    });

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    // Remover de todos os arrays
    const habilidadesPontuacao = (avaliacao.habilidadesPontuacao || []).filter(
      h => h.habilidadeId !== habilidadeId
    );
    const habilidadesAcertadas = (avaliacao.habilidadesAcertadas || []).filter(
      id => id !== habilidadeId
    );
    const habilidadesErradas = (avaliacao.habilidadesErradas || []).filter(
      id => id !== habilidadeId
    );

    await db.collection('avaliacoes_corrigidas').updateOne(
      { id: avaliacaoId, userId },
      {
        $set: {
          habilidadesPontuacao,
          habilidadesAcertadas,
          habilidadesErradas,
          atualizadoEm: new Date()
        }
      }
    );

    return NextResponse.json({ 
      success: true,
      message: 'Habilidade removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover habilidade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
