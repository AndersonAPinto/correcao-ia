import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAuth, callGeminiAPIWithRetry, isVertexAIConfigured } from '@/lib/api-handlers';

// GET - Listar habilidades da avaliação
export async function GET(request, { params }) {
  try {
    const userId = await requireAuth(request);
    const avaliacaoId = params.id;

    const { db } = await connectToDatabase();

    const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
      id: avaliacaoId,
      userId
    });

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    // Buscar detalhes das habilidades
    const habilidadesIds = (avaliacao.habilidadesPontuacao || []).map(h => h.habilidadeId);
    const habilidades = await db.collection('habilidades').find({
      id: { $in: habilidadesIds },
      userId
    }).toArray();

    // Combinar dados
    const habilidadesCompletas = (avaliacao.habilidadesPontuacao || []).map(habPont => {
      const habilidade = habilidades.find(h => h.id === habPont.habilidadeId);
      return {
        ...habPont,
        nome: habilidade?.nome || 'Habilidade não encontrada',
        descricao: habilidade?.descricao || ''
      };
    });

    return NextResponse.json({
      habilidades: habilidadesCompletas,
      habilidadesAcertadas: avaliacao.habilidadesAcertadas || [],
      habilidadesErradas: avaliacao.habilidadesErradas || []
    });

  } catch (error) {
    console.error('Erro ao listar habilidades:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Adicionar habilidade com avaliação por IA
export async function POST(request, { params }) {
  try {
    const userId = await requireAuth(request);
    const avaliacaoId = params.id;
    const { habilidadeId, usarIA = true, descricaoFoco } = await request.json();

    if (!habilidadeId) {
      return NextResponse.json({ error: 'habilidadeId é obrigatório' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Buscar avaliação
    const avaliacao = await db.collection('avaliacoes_corrigidas').findOne({
      id: avaliacaoId,
      userId
    });

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
    }

    // Buscar habilidade
    const habilidade = await db.collection('habilidades').findOne({
      id: habilidadeId,
      userId
    });

    if (!habilidade) {
      return NextResponse.json({ error: 'Habilidade não encontrada' }, { status: 404 });
    }

    // Verificar se habilidade já existe na avaliação
    const habilidadesPontuacao = avaliacao.habilidadesPontuacao || [];
    const habilidadeExistente = habilidadesPontuacao.find(h => h.habilidadeId === habilidadeId);
    
    if (habilidadeExistente) {
      return NextResponse.json({ 
        error: 'Esta habilidade já foi adicionada nesta avaliação' 
      }, { status: 400 });
    }

    let pontuacao = 0;
    let justificativa = '';

    // Se usar IA, avaliar habilidade na prova corrigida
    if (usarIA && isVertexAIConfigured()) {
      // Buscar gabarito para contexto
      const gabarito = await db.collection('gabaritos').findOne({
        id: avaliacao.gabaritoId,
        userId
      });

      // Buscar perfil de avaliação se existir
      let perfilConteudo = '';
      if (gabarito?.perfilId) {
        const perfil = await db.collection('perfis_avaliacao').findOne({
          id: gabarito.perfilId,
          userId
        });
        if (perfil) {
          perfilConteudo = perfil.conteudo || '';
        }
      }

      // Preparar dados das respostas
      const respostasTexto = avaliacao.exercicios || avaliacao.questoesDetalhes || [];
      const respostasFormatadas = respostasTexto.map((ex, idx) => {
        return `Questão ${ex.numero || idx + 1}: ${ex.feedback || 'Sem feedback'} (Nota: ${ex.nota || 0}/${ex.notaMaxima || ex.nota_maxima || 10})`;
      }).join('\n');

      // Criar prompt específico para avaliar APENAS esta habilidade
      const prompt = `Você é um especialista em avaliação educacional. 

TAREFA: Avaliar APENAS a habilidade "${habilidade.nome}" nesta prova já corrigida.

CONTEXTO DA PROVA:
- Texto transcrito da prova (OCR): ${avaliacao.textoOcr || 'Não disponível'}
- Respostas do aluno: 
${respostasFormatadas || 'Não disponível'}
- Nota atual: ${avaliacao.nota}/10
- Feedback geral: ${avaliacao.feedback || ''}

${gabarito?.conteudo ? `GABARITO/CRITÉRIOS:\n${gabarito.conteudo}\n` : ''}
${perfilConteudo ? `PERFIL DE AVALIAÇÃO:\n${perfilConteudo}\n` : ''}

HABILIDADE A AVALIAR:
- Nome: ${habilidade.nome}
- Descrição geral da habilidade: ${habilidade.descricao || 'Não fornecida'}
${descricaoFoco ? `- FOCO ESPECÍFICO PARA ESTA PROVA:\n${descricaoFoco}\n\nIMPORTANTE: Ao avaliar esta habilidade, foque especialmente nos aspectos descritos acima.` : ''}

INSTRUÇÕES:
1. Analise o texto OCR e as respostas do aluno
2. Avalie se o aluno demonstrou a habilidade "${habilidade.nome}"
3. Atribua uma pontuação de 1 a 10:
   - 1-3: Habilidade não demonstrada ou muito fraca
   - 4-6: Habilidade parcialmente demonstrada, precisa de reforço
   - 7-8: Habilidade demonstrada adequadamente
   - 9-10: Habilidade demonstrada com excelência
4. Forneça uma justificativa detalhada explicando:
   - Onde na prova o aluno demonstrou (ou não) esta habilidade
   - Pontos fortes e fracos específicos relacionados a esta habilidade
   - Sugestões de como melhorar nesta habilidade (se pontuação < 7)

Retorne APENAS um JSON válido no formato:
{
  "pontuacao": 8.5,
  "justificativa": "O aluno demonstrou boa compreensão desta habilidade ao resolver corretamente as questões 2 e 4, mostrando capacidade de aplicar o conceito. No entanto, teve dificuldades na questão 5, indicando necessidade de mais prática."
}

IMPORTANTE: Retorne apenas o JSON, sem texto adicional.`;

      try {
        // Chamar IA para avaliar habilidade
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=dummy`;
        const geminiBody = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024
            }
          })
        };

        const responseText = await callGeminiAPIWithRetry(geminiUrl, geminiBody);
        
        // Extrair JSON da resposta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const avaliacaoHabilidade = JSON.parse(jsonMatch[0]);
          pontuacao = parseFloat(avaliacaoHabilidade.pontuacao) || 0;
          justificativa = avaliacaoHabilidade.justificativa || '';
          
          // Validar pontuação
          if (pontuacao < 1 || pontuacao > 10 || isNaN(pontuacao)) {
            pontuacao = 5; // Valor padrão se inválido
            justificativa = justificativa || 'Pontuação ajustada para valor padrão. Por favor, revise manualmente.';
          }
        } else {
          throw new Error('Resposta da IA não contém JSON válido');
        }
      } catch (error) {
        console.error('Erro ao avaliar habilidade com IA:', error);
        // Se falhar, usar valores padrão
        pontuacao = 5;
        justificativa = 'Avaliação automática não disponível. Por favor, ajuste manualmente.';
      }
    } else {
      // Se não usar IA, valores padrão
      pontuacao = 5;
      justificativa = 'Habilidade adicionada manualmente. Ajuste a pontuação conforme necessário.';
    }

    // Adicionar habilidade ao array
    const novaHabilidade = {
      habilidadeId,
      pontuacao,
      justificativa,
      descricaoFoco: descricaoFoco?.trim() || null // Salvar descrição específica se fornecida
    };
    
    habilidadesPontuacao.push(novaHabilidade);

    // Recalcular habilidadesAcertadas e habilidadesErradas
    const habilidadesAcertadas = [...(avaliacao.habilidadesAcertadas || [])];
    const habilidadesErradas = [...(avaliacao.habilidadesErradas || [])];

    if (pontuacao >= 7) {
      if (!habilidadesAcertadas.includes(habilidadeId)) {
        habilidadesAcertadas.push(habilidadeId);
      }
      // Remover de erradas se estiver lá
      const indexErradas = habilidadesErradas.indexOf(habilidadeId);
      if (indexErradas >= 0) {
        habilidadesErradas.splice(indexErradas, 1);
      }
    } else {
      if (!habilidadesErradas.includes(habilidadeId)) {
        habilidadesErradas.push(habilidadeId);
      }
      // Remover de acertadas se estiver lá
      const indexAcertadas = habilidadesAcertadas.indexOf(habilidadeId);
      if (indexAcertadas >= 0) {
        habilidadesAcertadas.splice(indexAcertadas, 1);
      }
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

    return NextResponse.json({ 
      success: true,
      habilidade: {
        ...novaHabilidade,
        nome: habilidade.nome,
        descricao: habilidade.descricao
      },
      message: usarIA 
        ? 'Habilidade avaliada e adicionada com sucesso usando IA' 
        : 'Habilidade adicionada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao adicionar habilidade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
